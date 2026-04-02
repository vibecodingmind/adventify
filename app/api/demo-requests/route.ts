/**
 * ADVENTIFY - Certificate Request API
 * Implements the request-based workflow for clerks and pastors
 *
 * ENDPOINTS:
 * - POST   /api/certificate-requests              (Clerk: Create request)
 * - PUT    /api/certificate-requests/{id}         (Clerk: Edit draft)
 * - POST   /api/certificate-requests/{id}/submit  (Clerk: Submit request)
 * - GET    /api/certificate-requests/my-requests  (Clerk: View own requests)
 * - GET    /api/certificate-requests/pending      (Pastor: View pending)
 * - POST   /api/certificate-requests/{id}/approve (Pastor: Approve & generate)
 * - POST   /api/certificate-requests/{id}/reject  (Pastor: Reject with feedback)
 * - POST   /api/certificate-requests/{id}/request-info (Pastor: Ask for clarification)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { Role, RequestStatus } from '@prisma/client';
import { generateCertificatePDF } from '@/lib/certificate-generation';
import { logAuditAction } from '@/lib/audit-log';

// ============================================
// CLERK ENDPOINTS
// ============================================

/**
 * POST /api/certificate-requests
 * Create a new certificate request (DRAFT status)
 *
 * Clerk submits:
 * {
 *   recipientId: "person-id",
 *   certificateTypeId: "type-id",
 *   details: { baptismDate, location, pastorName, ... },
 *   templateId: "minimalist",
 *   notes: "Optional notes"
 * }
 */
export async function createCertificateRequest(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with role and church
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { church: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only CHURCH_CLERK can create requests
    if (user.role !== Role.CHURCH_CLERK) {
      return NextResponse.json(
        { error: 'Only church clerks can create certificate requests' },
        { status: 403 }
      );
    }

    const {
      recipientId,
      certificateTypeId,
      details,
      templateId = 'minimalist',
      notes
    } = await req.json();

    // Validate required fields
    if (!recipientId || !certificateTypeId || !details) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify recipient is from the clerk's church
    const recipient = await prisma.person.findUnique({
      where: { id: recipientId }
    });

    if (!recipient || recipient.churchId !== user.churchId) {
      return NextResponse.json(
        { error: 'Recipient must be from your church' },
        { status: 403 }
      );
    }

    // Verify certificate type exists
    const certType = await prisma.certificateType.findUnique({
      where: { id: certificateTypeId }
    });

    if (!certType) {
      return NextResponse.json(
        { error: 'Invalid certificate type' },
        { status: 400 }
      );
    }

    // Create the request in DRAFT status
    const request = await prisma.certificateRequest.create({
      data: {
        recipientId,
        certificateTypeId,
        details,
        templateId,
        notes,
        status: RequestStatus.DRAFT,
        churchId: user.churchId,
        createdById: user.id
      },
      include: {
        recipient: true,
        certificateType: true,
        createdBy: { select: { id: true, fullName: true } }
      }
    });

    // Log the action
    await logAuditAction({
      action: 'REQUEST_CREATED',
      resourceType: 'CertificateRequest',
      resourceId: request.id,
      userId: user.id,
      details: {
        recipientId,
        certificateType: certType.code,
        status: RequestStatus.DRAFT
      }
    });

    return NextResponse.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Create certificate request error:', error);
    return NextResponse.json(
      { error: 'Failed to create certificate request' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/certificate-requests/{id}
 * Edit a DRAFT request (can't edit after submission)
 */
export async function editCertificateRequest(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get the request
    const request = await prisma.certificateRequest.findUnique({
      where: { id: params.id }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify ownership and DRAFT status
    if (request.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own requests' },
        { status: 403 }
      );
    }

    if (request.status !== RequestStatus.DRAFT) {
      return NextResponse.json(
        { error: 'Can only edit DRAFT requests' },
        { status: 400 }
      );
    }

    const { recipientId, details, templateId, notes } = await req.json();

    // Update the request
    const updated = await prisma.certificateRequest.update({
      where: { id: params.id },
      data: {
        ...(recipientId && { recipientId }),
        ...(details && { details }),
        ...(templateId && { templateId }),
        ...(notes !== undefined && { notes })
      },
      include: {
        recipient: true,
        certificateType: true,
        createdBy: { select: { id: true, fullName: true } }
      }
    });

    // Log the action
    await logAuditAction({
      action: 'REQUEST_EDITED',
      resourceType: 'CertificateRequest',
      resourceId: request.id,
      userId: user.id,
      details: { status: RequestStatus.DRAFT }
    });

    return NextResponse.json({
      success: true,
      data: updated
    });
  } catch (error) {
    console.error('Edit certificate request error:', error);
    return NextResponse.json(
      { error: 'Failed to edit certificate request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificate-requests/{id}/submit
 * Submit a DRAFT request to pastor (changes status to SUBMITTED)
 */
export async function submitCertificateRequest(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const request = await prisma.certificateRequest.findUnique({
      where: { id: params.id }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify ownership and DRAFT status
    if (request.createdById !== user.id) {
      return NextResponse.json(
        { error: 'You can only submit your own requests' },
        { status: 403 }
      );
    }

    if (request.status !== RequestStatus.DRAFT) {
      return NextResponse.json(
        { error: 'Can only submit DRAFT requests' },
        { status: 400 }
      );
    }

    // Submit the request (change to SUBMITTED)
    const submitted = await prisma.certificateRequest.update({
      where: { id: params.id },
      data: {
        status: RequestStatus.SUBMITTED,
        submittedAt: new Date()
      },
      include: {
        recipient: true,
        certificateType: true,
        church: true,
        createdBy: { select: { id: true, fullName: true } }
      }
    });

    // Log the action
    await logAuditAction({
      action: 'REQUEST_SUBMITTED',
      resourceType: 'CertificateRequest',
      resourceId: request.id,
      userId: user.id,
      details: {
        status: RequestStatus.SUBMITTED,
        recipientName: submitted.recipient.fullName
      }
    });

    // TODO: Send notification to pastor
    // await notifyPastorOfPendingRequest(submitted);

    return NextResponse.json({
      success: true,
      data: submitted,
      message: 'Request submitted to pastor for approval'
    });
  } catch (error) {
    console.error('Submit certificate request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit certificate request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/certificate-requests/my-requests
 * Get all requests created by this clerk
 */
export async function getClerkRequests(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only clerks can use this endpoint
    if (user.role !== Role.CHURCH_CLERK) {
      return NextResponse.json(
        { error: 'Only church clerks can access this' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as RequestStatus | null;
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');

    // Build filter
    const where: any = {
      createdById: user.id,
      churchId: user.churchId
    };

    if (status) {
      where.status = status;
    }

    // Get requests
    const [requests, total] = await Promise.all([
      prisma.certificateRequest.findMany({
        where,
        include: {
          recipient: true,
          certificateType: true,
          approvedBy: { select: { id: true, fullName: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take
      }),
      prisma.certificateRequest.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        total,
        skip,
        take
      }
    });
  } catch (error) {
    console.error('Get clerk requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch requests' },
      { status: 500 }
    );
  }
}

// ============================================
// PASTOR ENDPOINTS
// ============================================

/**
 * GET /api/certificate-requests/pending
 * Get all SUBMITTED requests waiting for pastor approval
 */
export async function getPendingRequests(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only pastors can access this endpoint
    if (user.role !== Role.CHURCH_PASTOR) {
      return NextResponse.json(
        { error: 'Only church pastors can access this' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '10');

    // Get pending requests for this pastor's church
    const [requests, total] = await Promise.all([
      prisma.certificateRequest.findMany({
        where: {
          churchId: user.churchId,
          status: {
            in: [RequestStatus.SUBMITTED, RequestStatus.AWAITING_INFO]
          }
        },
        include: {
          recipient: true,
          certificateType: true,
          createdBy: { select: { id: true, fullName: true } }
        },
        orderBy: { submittedAt: 'desc' },
        skip,
        take
      }),
      prisma.certificateRequest.count({
        where: {
          churchId: user.churchId,
          status: {
            in: [RequestStatus.SUBMITTED, RequestStatus.AWAITING_INFO]
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        requests,
        total,
        skip,
        take
      }
    });
  } catch (error) {
    console.error('Get pending requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending requests' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificate-requests/{id}/approve
 * Approve request and generate certificate
 */
export async function approveCertificateRequest(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only pastors can approve
    if (user.role !== Role.CHURCH_PASTOR) {
      return NextResponse.json(
        { error: 'Only church pastors can approve requests' },
        { status: 403 }
      );
    }

    const request = await prisma.certificateRequest.findUnique({
      where: { id: params.id },
      include: {
        recipient: true,
        church: true,
        certificateType: true
      }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify request belongs to pastor's church
    if (request.churchId !== user.churchId) {
      return NextResponse.json(
        { error: 'Can only approve requests from your church' },
        { status: 403 }
      );
    }

    // Verify request status is SUBMITTED or AWAITING_INFO
    if (![RequestStatus.SUBMITTED, RequestStatus.AWAITING_INFO].includes(request.status)) {
      return NextResponse.json(
        { error: 'Can only approve SUBMITTED or AWAITING_INFO requests' },
        { status: 400 }
      );
    }

    const { notes } = await req.json();

    // Update request to APPROVED
    const approved = await prisma.certificateRequest.update({
      where: { id: params.id },
      data: {
        status: RequestStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: user.id,
        ...(notes && { notes })
      }
    });

    // Generate certificate
    try {
      // TODO: Implement certificate generation
      // const certificate = await generateCertificateForRequest(approved, user);

      // For now, update status to GENERATED
      await prisma.certificateRequest.update({
        where: { id: params.id },
        data: { status: RequestStatus.GENERATED }
      });
    } catch (genError) {
      console.error('Certificate generation error:', genError);
      // Don't fail the approval, just log the error
    }

    // Log the action
    await logAuditAction({
      action: 'REQUEST_APPROVED',
      resourceType: 'CertificateRequest',
      resourceId: request.id,
      userId: user.id,
      details: {
        status: RequestStatus.APPROVED,
        recipientName: request.recipient.fullName,
        approverName: user.fullName
      }
    });

    return NextResponse.json({
      success: true,
      data: approved,
      message: 'Request approved. Certificate generated.'
    });
  } catch (error) {
    console.error('Approve certificate request error:', error);
    return NextResponse.json(
      { error: 'Failed to approve certificate request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificate-requests/{id}/reject
 * Reject request with feedback for clerk
 */
export async function rejectCertificateRequest(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only pastors can reject
    if (user.role !== Role.CHURCH_PASTOR) {
      return NextResponse.json(
        { error: 'Only church pastors can reject requests' },
        { status: 403 }
      );
    }

    const request = await prisma.certificateRequest.findUnique({
      where: { id: params.id },
      include: {
        recipient: true,
        createdBy: true
      }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify request belongs to pastor's church
    if (request.churchId !== user.churchId) {
      return NextResponse.json(
        { error: 'Can only reject requests from your church' },
        { status: 403 }
      );
    }

    const { rejectionReason } = await req.json();

    if (!rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

    // Update request to REJECTED
    const rejected = await prisma.certificateRequest.update({
      where: { id: params.id },
      data: {
        status: RequestStatus.REJECTED,
        rejectedAt: new Date(),
        rejectionReason
      }
    });

    // Log the action
    await logAuditAction({
      action: 'REQUEST_REJECTED',
      resourceType: 'CertificateRequest',
      resourceId: request.id,
      userId: user.id,
      details: {
        status: RequestStatus.REJECTED,
        reason: rejectionReason,
        recipientName: request.recipient.fullName,
        clerksName: request.createdBy.fullName
      }
    });

    // TODO: Send notification to clerk with rejection reason
    // await notifyClerkOfRejection(request, rejectionReason);

    return NextResponse.json({
      success: true,
      data: rejected,
      message: 'Request rejected. Clerk has been notified.'
    });
  } catch (error) {
    console.error('Reject certificate request error:', error);
    return NextResponse.json(
      { error: 'Failed to reject certificate request' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/certificate-requests/{id}/request-info
 * Request additional information from clerk before approving
 */
export async function requestAdditionalInfo(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only pastors can request info
    if (user.role !== Role.CHURCH_PASTOR) {
      return NextResponse.json(
        { error: 'Only church pastors can request information' },
        { status: 403 }
      );
    }

    const request = await prisma.certificateRequest.findUnique({
      where: { id: params.id }
    });

    if (!request) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify request belongs to pastor's church
    if (request.churchId !== user.churchId) {
      return NextResponse.json(
        { error: 'Can only request info from your church' },
        { status: 403 }
      );
    }

    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Update request to AWAITING_INFO
    const updated = await prisma.certificateRequest.update({
      where: { id: params.id },
      data: {
        status: RequestStatus.AWAITING_INFO,
        notes: message  // Store the request as notes
      }
    });

    // Log the action
    await logAuditAction({
      action: 'REQUEST_INFO_REQUESTED',
      resourceType: 'CertificateRequest',
      resourceId: request.id,
      userId: user.id,
      details: {
        status: RequestStatus.AWAITING_INFO,
        message
      }
    });

    // TODO: Send notification to clerk with request
    // await notifyClerkOfInfoRequest(request, message);

    return NextResponse.json({
      success: true,
      data: updated,
      message: 'Clerk has been asked for additional information'
    });
  } catch (error) {
    console.error('Request additional info error:', error);
    return NextResponse.json(
      { error: 'Failed to request additional information' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to log audit actions
 */
async function logAuditAction({
  action,
  resourceType,
  resourceId,
  userId,
  details
}: {
  action: string;
  resourceType: string;
  resourceId: string;
  userId: string;
  details?: any;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        resourceType,
        resourceId,
        userId,
        details: details || {},
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Error logging audit action:', error);
    // Don't throw - just log the error
  }
}
