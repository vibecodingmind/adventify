import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateChurchSchema = z.object({
  code: z.string().min(1, 'Code is required').max(10).optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  conferenceId: z.string().min(1, 'Conference is required').optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email('Invalid email').nullable().optional(),
});

// PATCH - Update church (Conference Admin+)
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

    if (!canPerformAction(session, 'UPDATE_CHURCH')) {
      return NextResponse.json(
        { success: false, error: 'Only Conference Admins or higher can update churches' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateChurchSchema.parse(body);

    // Check church exists
    const existingChurch = await db.church.findUnique({
      where: { id },
    });

    if (!existingChurch) {
      return NextResponse.json(
        { success: false, error: 'Church not found' },
        { status: 404 }
      );
    }

    // Conference admin can only update churches in their conference
    if (session.role === Role.CONFERENCE_ADMIN) {
      if (existingChurch.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only update churches in your conference' },
          { status: 403 }
        );
      }
      if (validatedData.conferenceId && validatedData.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only assign churches to your conference' },
          { status: 403 }
        );
      }
    }

    // Union admin scope check
    if (session.role === Role.UNION_ADMIN && validatedData.conferenceId) {
      const conference = await db.conference.findUnique({
        where: { id: validatedData.conferenceId },
      });
      if (!conference || conference.unionId !== session.unionId) {
        return NextResponse.json(
          { success: false, error: 'You can only assign churches to conferences in your union' },
          { status: 403 }
        );
      }
    }

    // Check code+conference uniqueness if code is being changed
    if (validatedData.code && validatedData.code !== existingChurch.code) {
      const conferenceId = validatedData.conferenceId || existingChurch.conferenceId;
      const codeExists = await db.church.findFirst({
        where: {
          code: validatedData.code,
          conferenceId,
        },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Church code already exists in this conference' },
          { status: 400 }
        );
      }
    }

    // Also check if both code and conferenceId change
    if (validatedData.code && validatedData.conferenceId) {
      const codeExists = await db.church.findFirst({
        where: {
          code: validatedData.code,
          conferenceId: validatedData.conferenceId,
          id: { not: id },
        },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Church code already exists in this conference' },
          { status: 400 }
        );
      }
    }

    // Verify conference exists if changing
    if (validatedData.conferenceId && validatedData.conferenceId !== existingChurch.conferenceId) {
      const conference = await db.conference.findUnique({
        where: { id: validatedData.conferenceId },
      });
      if (!conference) {
        return NextResponse.json(
          { success: false, error: 'Conference not found' },
          { status: 404 }
        );
      }
    }

    const updatedChurch = await db.church.update({
      where: { id },
      data: validatedData,
      include: {
        conference: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Church',
      entityId: id,
      details: {
        previousCode: existingChurch.code,
        previousName: existingChurch.name,
        changes: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedChurch,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update church error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete church (Union Admin+, cascade check)
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

    if (!canPerformAction(session, 'DELETE_CHURCH')) {
      return NextResponse.json(
        { success: false, error: 'Only Union Admins or higher can delete churches' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingChurch = await db.church.findUnique({
      where: { id },
      include: {
        _count: {
          select: { persons: true, baptismRecords: true, users: true },
        },
      },
    });

    if (!existingChurch) {
      return NextResponse.json(
        { success: false, error: 'Church not found' },
        { status: 404 }
      );
    }

    // Check for cascading data
    if (existingChurch._count.persons > 0 || existingChurch._count.baptismRecords > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete church with ${existingChurch._count.persons} person(s) and ${existingChurch._count.baptismRecords} baptism record(s). Delete or reassign them first.`,
        },
        { status: 400 }
      );
    }

    if (existingChurch._count.users > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete church with ${existingChurch._count.users} linked user account(s). Reassign users first.`,
        },
        { status: 400 }
      );
    }

    await db.church.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'Church',
      entityId: id,
      details: {
        code: existingChurch.code,
        name: existingChurch.name,
        conferenceId: existingChurch.conferenceId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Church deleted successfully',
    });
  } catch (error) {
    console.error('Delete church error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
