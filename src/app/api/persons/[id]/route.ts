import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updatePersonSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  dateOfBirth: z.string().nullable().optional(),
  gender: z.enum(['Male', 'Female', '']).nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  churchId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET - Get single person by ID
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

    const person = await db.person.findUnique({
      where: { id },
      include: {
        church: {
          select: { id: true, name: true, city: true, country: true },
        },
        baptismRecord: {
          select: { id: true, baptismDate: true, status: true },
        },
      },
    });

    if (!person) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: person,
    });
  } catch (error) {
    console.error('Get person error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update person
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

    // CHURCH_ADMIN+ can update persons in their scope
    if (!canPerformAction(session, 'UPDATE_PERSON')) {
      return NextResponse.json(
        { success: false, error: 'Only Church Admins or higher can update persons' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updatePersonSchema.parse(body);

    // Fetch existing person
    const existingPerson = await db.person.findUnique({
      where: { id },
      include: {
        church: { select: { id: true } },
      },
    });

    if (!existingPerson) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      );
    }

    // Church-level users can only update persons in their church
    const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR, Role.CHURCH_ADMIN];
    if (churchLevelRoles.includes(session.role)) {
      if (!existingPerson.churchId || existingPerson.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only update persons in your church' },
          { status: 403 }
        );
      }
    }

    // Conference admin scope check
    if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      if (existingPerson.churchId) {
        const church = await db.church.findUnique({
          where: { id: existingPerson.churchId },
        });
        if (church && church.conferenceId !== session.conferenceId) {
          return NextResponse.json(
            { success: false, error: 'You can only update persons in your conference' },
            { status: 403 }
          );
        }
      }
    }

    // Verify church exists if changing churchId
    if (validatedData.churchId) {
      const church = await db.church.findUnique({
        where: { id: validatedData.churchId },
      });
      if (!church) {
        return NextResponse.json(
          { success: false, error: 'Church not found' },
          { status: 404 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validatedData.fullName !== undefined) updateData.fullName = validatedData.fullName;
    if (validatedData.dateOfBirth !== undefined) {
      updateData.dateOfBirth = validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null;
    }
    if (validatedData.gender !== undefined) updateData.gender = validatedData.gender || null;
    if (validatedData.email !== undefined) updateData.email = validatedData.email;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.address !== undefined) updateData.address = validatedData.address;
    if (validatedData.city !== undefined) updateData.city = validatedData.city;
    if (validatedData.country !== undefined) updateData.country = validatedData.country;
    if (validatedData.churchId !== undefined) updateData.churchId = validatedData.churchId;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;

    const updatedPerson = await db.person.update({
      where: { id },
      data: updateData,
      include: {
        church: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Person',
      entityId: id,
      details: {
        pid: updatedPerson.pid,
        fullName: updatedPerson.fullName,
        changes: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedPerson,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update person error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete person
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

    // CONFERENCE_ADMIN+ can delete (from PERMISSIONS)
    if (!canPerformAction(session, 'DELETE_PERSON')) {
      return NextResponse.json(
        { success: false, error: 'Only Conference Admins or higher can delete persons' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch person with baptism record
    const person = await db.person.findUnique({
      where: { id },
      include: {
        baptismRecord: true,
        church: { select: { id: true, conferenceId: true } },
      },
    });

    if (!person) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      );
    }

    // Cannot delete person with a baptism record (unless CONFERENCE_ADMIN+)
    if (person.baptismRecord && session.role !== Role.GENERAL_CONFERENCE_ADMIN && session.role !== Role.DIVISION_ADMIN && session.role !== Role.CONFERENCE_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete person with a linked baptism record' },
        { status: 400 }
      );
    }

    // Scope check
    if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      if (person.church && person.church.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only delete persons in your conference' },
          { status: 403 }
        );
      }
    }

    // Check if person is linked to a user account
    const linkedUser = await db.user.findFirst({
      where: { personId: id },
    });

    if (linkedUser) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete person linked to a user account' },
        { status: 400 }
      );
    }

    await db.person.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'Person',
      entityId: id,
      details: {
        pid: person.pid,
        fullName: person.fullName,
        hadBaptismRecord: !!person.baptismRecord,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Person deleted successfully',
    });
  } catch (error) {
    console.error('Delete person error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
