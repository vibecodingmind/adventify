import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRequestAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { notifyOnRequestEdited } from '@/lib/request-notifications';
import { RequestStatus } from '@prisma/client';
import { z } from 'zod';

const editSchema = z.object({
  clerkNotes: z.string().max(1000).optional(),
});

// PATCH - Clerk edits pending request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRequestAction('EDIT_REQUEST');
    const { id } = await params;

    const body = await request.json();
    const validatedData = editSchema.parse(body);

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
        { success: false, error: 'Only pending requests can be edited' },
        { status: 400 }
      );
    }

    if (existingRequest.churchId !== session.churchId) {
      return NextResponse.json(
        { success: false, error: 'You can only edit requests for your church' },
        { status: 403 }
      );
    }

    // Update request
    const updatedRequest = await db.memberRequest.update({
      where: { id },
      data: {
        clerkNotes: validatedData.clerkNotes ?? existingRequest.clerkNotes,
        editedBy: session.userId,
        editedAt: new Date(),
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

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'MemberRequest',
      entityId: id,
      details: {
        requestId: existingRequest.requestId,
        personName: existingRequest.person?.fullName || 'Unknown',
        updatedFields: Object.keys(validatedData),
      },
    });

    // Non-blocking: notify pastor(s)
    notifyOnRequestEdited(
      id,
      existingRequest.person?.fullName || 'Unknown',
      session.churchId,
      session.userId
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
    if (message === 'Forbidden' || message.includes('Only church clerks')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    console.error('Edit member request error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
