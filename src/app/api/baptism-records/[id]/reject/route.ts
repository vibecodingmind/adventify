import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role, BaptismStatus } from '@prisma/client';
import { z } from 'zod';

const rejectSchema = z.object({
  reason: z.string().min(5, 'Rejection reason must be at least 5 characters'),
});

// POST - Reject baptism record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check permissions - Conference Admin or higher
    if (session.role !== Role.GENERAL_CONFERENCE_ADMIN && 
        session.role !== Role.DIVISION_ADMIN &&
        session.role !== Role.UNION_ADMIN &&
        session.role !== Role.CONFERENCE_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only Conference Admins or higher can reject baptism records' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = rejectSchema.parse(body);
    
    // Get the baptism record
    const baptismRecord = await db.baptismRecord.findUnique({
      where: { id },
      include: {
        church: {
          include: {
            conference: {
              include: {
                union: {
                  include: { division: true },
                },
              },
            },
          },
        },
      },
    });
    
    if (!baptismRecord) {
      return NextResponse.json(
        { success: false, error: 'Baptism record not found' },
        { status: 404 }
      );
    }
    
    if (baptismRecord.status !== BaptismStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: 'Only pending records can be rejected' },
        { status: 400 }
      );
    }
    
    // Verify user has access to this record
    if (session.role === Role.CONFERENCE_ADMIN) {
      if (baptismRecord.church.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only reject records in your conference' },
          { status: 403 }
        );
      }
    } else if (session.role === Role.UNION_ADMIN) {
      if (baptismRecord.church.conference.unionId !== session.unionId) {
        return NextResponse.json(
          { success: false, error: 'You can only reject records in your union' },
          { status: 403 }
        );
      }
    } else if (session.role === Role.DIVISION_ADMIN) {
      if (baptismRecord.church.conference.union.divisionId !== session.divisionId) {
        return NextResponse.json(
          { success: false, error: 'You can only reject records in your division' },
          { status: 403 }
        );
      }
    }
    
    // Reject the record
    const updatedRecord = await db.baptismRecord.update({
      where: { id },
      data: {
        status: BaptismStatus.REJECTED,
        rejectionReason: validatedData.reason,
      },
      include: {
        person: { select: { id: true, pid: true, fullName: true } },
        church: { select: { id: true, name: true } },
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'REJECT',
      entity: 'BaptismRecord',
      entityId: id,
      details: {
        personName: updatedRecord.person.fullName,
        churchName: updatedRecord.church.name,
        reason: validatedData.reason,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: updatedRecord,
    });
  } catch (error) {
    console.error('Reject baptism record error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
