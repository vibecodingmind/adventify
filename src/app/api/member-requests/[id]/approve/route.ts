import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRequestAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import {
  notifyOnRequestApproved,
  notifyOnDocumentGenerated,
} from '@/lib/request-notifications';
import { RequestStatus } from '@prisma/client';

// POST - Pastor approves request and triggers document generation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRequestAction('APPROVE_REQUEST');
    const { id } = await params;

    // Verify request exists
    const existingRequest = await db.memberRequest.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, fullName: true, email: true } },
        person: { select: { id: true, pid: true, fullName: true, email: true } },
        church: { select: { id: true, name: true, city: true, country: true } },
      },
    });

    if (!existingRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    if (existingRequest.status !== RequestStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: 'Only pending requests can be approved' },
        { status: 400 }
      );
    }

    if (existingRequest.churchId !== session.churchId) {
      return NextResponse.json(
        { success: false, error: 'You can only approve requests for your church' },
        { status: 403 }
      );
    }

    // Set status to APPROVED with reviewedBy/reviewedAt
    await db.memberRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        reviewedBy: session.userId,
        reviewedAt: new Date(),
      },
    });

    // Try to generate PDF document
    let pdfBase64: string | null = null;
    let documentGenerated = false;

    try {
      const { generateDocumentPDF } = await import('@/lib/document-generation');
      const result = await generateDocumentPDF({
        requestId: existingRequest.requestId,
        personName: existingRequest.person?.fullName || 'Unknown',
        churchName: existingRequest.church.name,
        churchCity: existingRequest.church.city || undefined,
        churchCountry: existingRequest.church.country || undefined,
        documentType: existingRequest.documentType,
        reason: existingRequest.reason || undefined,
        clerkNotes: existingRequest.clerkNotes || undefined,
      });
      pdfBase64 = result.pdfData;
      documentGenerated = true;
    } catch (err) {
      console.error('Document generation failed:', err);
      pdfBase64 = 'pending-generation';
      documentGenerated = false;
    }

    // Calculate expiry (1 year from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Update with generated document data and set status to GENERATED
    const updatedRequest = await db.memberRequest.update({
      where: { id },
      data: {
        pdfData: pdfBase64,
        documentUrl: `/api/member-requests/${id}/download`,
        documentExpiry: expiryDate,
        generatedAt: new Date(),
        generatedBy: session.userId,
        status: 'GENERATED' as RequestStatus,
      },
      include: {
        member: { select: { id: true, fullName: true, email: true } },
        person: { select: { id: true, pid: true, fullName: true, email: true } },
        church: { select: { id: true, name: true, city: true, country: true } },
        editor: { select: { id: true, fullName: true } },
        reviewer: { select: { id: true, fullName: true } },
        generator: { select: { id: true, fullName: true } },
      },
    });

    const personName = existingRequest.person?.fullName || 'Unknown';

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'APPROVE',
      entity: 'MemberRequest',
      entityId: id,
      details: {
        requestId: existingRequest.requestId,
        personName,
        documentType: existingRequest.documentType,
        documentGenerated,
      },
    });

    // Non-blocking: notify member of approval
    notifyOnRequestApproved(id, personName, existingRequest.memberId).catch(
      () => {}
    );

    // Non-blocking: notify member document is ready
    if (documentGenerated) {
      notifyOnDocumentGenerated(id, personName, existingRequest.memberId).catch(
        () => {}
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      warning: documentGenerated
        ? undefined
        : 'Document PDF generation is pending. The placeholder will be replaced once the generation module is available.',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An error occurred';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (message === 'Forbidden' || message.includes('Only pastors')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    console.error('Approve member request error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
