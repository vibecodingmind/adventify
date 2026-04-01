import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role, BaptismStatus } from '@prisma/client';
import { z } from 'zod';

const updateBaptismRecordSchema = z.object({
  baptismDate: z.string().min(1, 'Baptism date is required').optional(),
  baptismLocation: z.string().nullable().optional(),
  pastorName: z.string().min(2, 'Pastor name is required').optional(),
  pastorTitle: z.string().nullable().optional(),
  witnessName: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET - Get single baptism record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const record = await db.baptismRecord.findUnique({
      where: { id },
      include: {
        person: {
          select: {
            id: true,
            pid: true,
            fullName: true,
            dateOfBirth: true,
            gender: true,
          },
        },
        church: {
          select: {
            id: true,
            name: true,
            city: true,
            country: true,
            conference: {
              select: { id: true, code: true, name: true },
            },
          },
        },
        certificate: {
          select: { id: true, bcn: true, verificationUrl: true },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Baptism record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error('Get baptism record error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update baptism record (only PENDING records, CHURCH_CLERK+ in scope)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // CHURCH_CLERK+ can edit (from PERMISSIONS)
    if (!canPerformAction(session, 'UPDATE_BAPTISM_RECORD')) {
      return NextResponse.json(
        { success: false, error: 'Only Church Clerks or higher can update baptism records' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch existing record
    const existingRecord = await db.baptismRecord.findUnique({
      where: { id },
      include: {
        church: { select: { id: true, conferenceId: true } },
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Baptism record not found' },
        { status: 404 }
      );
    }

    // Only PENDING records can be edited
    if (existingRecord.status !== BaptismStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: 'Only pending baptism records can be edited' },
        { status: 400 }
      );
    }

    // Scope check: church-level users can only edit records in their church
    const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR];
    if (churchLevelRoles.includes(session.role)) {
      if (existingRecord.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only edit baptism records for your church' },
          { status: 403 }
        );
      }
    }

    // Conference admin scope check
    if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      if (existingRecord.church && existingRecord.church.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only edit baptism records in your conference' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validatedData = updateBaptismRecordSchema.parse(body);

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validatedData.baptismDate !== undefined) {
      updateData.baptismDate = new Date(validatedData.baptismDate);
    }
    if (validatedData.baptismLocation !== undefined) updateData.baptismLocation = validatedData.baptismLocation;
    if (validatedData.pastorName !== undefined) updateData.pastorName = validatedData.pastorName;
    if (validatedData.pastorTitle !== undefined) updateData.pastorTitle = validatedData.pastorTitle;
    if (validatedData.witnessName !== undefined) updateData.witnessName = validatedData.witnessName;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    const updatedRecord = await db.baptismRecord.update({
      where: { id },
      data: updateData,
      include: {
        person: {
          select: { id: true, pid: true, fullName: true },
        },
        church: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'BaptismRecord',
      entityId: id,
      details: {
        personId: updatedRecord.personId,
        personName: updatedRecord.person.fullName,
        changes: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedRecord,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update baptism record error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete baptism record (CONFERENCE_ADMIN+, only if no certificate)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // CONFERENCE_ADMIN+ can delete
    if (!canPerformAction(session, 'DELETE_BAPTISM_RECORD')) {
      return NextResponse.json(
        { success: false, error: 'Only Conference Admins or higher can delete baptism records' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch existing record
    const existingRecord = await db.baptismRecord.findUnique({
      where: { id },
      include: {
        person: { select: { id: true, pid: true, fullName: true } },
        church: { select: { id: true, conferenceId: true } },
        certificate: { select: { id: true } },
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Baptism record not found' },
        { status: 404 }
      );
    }

    // Cannot delete if certificate exists
    if (existingRecord.certificate) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete baptism record with an existing certificate' },
        { status: 400 }
      );
    }

    // Scope check for conference admin
    if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      if (existingRecord.church && existingRecord.church.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only delete baptism records in your conference' },
          { status: 403 }
        );
      }
    }

    await db.baptismRecord.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'BaptismRecord',
      entityId: id,
      details: {
        personId: existingRecord.personId,
        personName: existingRecord.person.fullName,
        status: existingRecord.status,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Baptism record deleted successfully',
    });
  } catch (error) {
    console.error('Delete baptism record error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
