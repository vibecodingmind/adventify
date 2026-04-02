import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRequestAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { notifyOnRequestRejected } from '@/lib/request-notifications';
import { RequestStatus } from '@prisma/client';
import { z } from 'zod';

const rejectSchema = z.object({
  rejectionReason: z
    .string()
    .min(5, 'Rejection reason must be at least 5 characters')
    .max(500, 'Rejection reason must not exceed 500 characters'),
});

// POST - Pastor rejects request
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRequestAction('REJECT_REQUEST');
    const { id } = await params;

    const body = await request.json();
    const validatedData = rejectSchema.parse(body);

    // Verify request exists
    const existingRequest = await db.memberRequest.findUnique({
      where: { id },
      include: {
        person: { select: { id: true, fullName: true } },
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
        { success: false, error: 'Only pending requests can be rejected' },
        { status: 400 }
      );
    }

    if (existingRequest.churchId !== session.churchId) {
      return NextResponse.json(
        { success: false, error: 'You can only reject requests for your church' },
        { status: 403 }
      );
    }

    // Reject the request
    const updatedRequest = await db.memberRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        reviewedBy: session.userId,
        reviewedAt: new Date(),
        rejectionReason: validatedData.rejectionReason,
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
      action: 'REJECT',
      entity: 'MemberRequest',
      entityId: id,
      details: {
        requestId: existingRequest.requestId,
        personName,
        rejectionReason: validatedData.rejectionReason,
      },
    });

    // Non-blocking: notify member of rejection
    notifyOnRequestRejected(
      id,
      personName,
      existingRequest.memberId,
      validatedData.rejectionReason
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      data: updatedRequest,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

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

    console.error('Reject member request error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
