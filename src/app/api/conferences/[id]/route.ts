import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateConferenceSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  unionId: z.string().min(1, 'Union is required').optional(),
  headquarters: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// PATCH - Update conference (Union Admin+)
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

    if (!canPerformAction(session, 'UPDATE_CONFERENCE')) {
      return NextResponse.json(
        { success: false, error: 'Only Union Admins or higher can update conferences' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateConferenceSchema.parse(body);

    // Check conference exists
    const existingConference = await db.conference.findUnique({
      where: { id },
    });

    if (!existingConference) {
      return NextResponse.json(
        { success: false, error: 'Conference not found' },
        { status: 404 }
      );
    }

    // Union admin can only update conferences in their union
    if (session.role === Role.UNION_ADMIN) {
      if (existingConference.unionId !== session.unionId) {
        return NextResponse.json(
          { success: false, error: 'You can only update conferences in your union' },
          { status: 403 }
        );
      }
      if (validatedData.unionId && validatedData.unionId !== session.unionId) {
        return NextResponse.json(
          { success: false, error: 'You can only assign conferences to your union' },
          { status: 403 }
        );
      }
    }

    // Division admin scope check
    if (session.role === Role.DIVISION_ADMIN && validatedData.unionId) {
      const union = await db.union.findUnique({
        where: { id: validatedData.unionId },
      });
      if (!union || union.divisionId !== session.divisionId) {
        return NextResponse.json(
          { success: false, error: 'You can only assign conferences to unions in your division' },
          { status: 403 }
        );
      }
    }

    // Check if code change conflicts
    if (validatedData.code && validatedData.code !== existingConference.code) {
      const codeExists = await db.conference.findUnique({
        where: { code: validatedData.code },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Conference code already exists' },
          { status: 400 }
        );
      }
    }

    // Verify union exists if changing
    if (validatedData.unionId && validatedData.unionId !== existingConference.unionId) {
      const union = await db.union.findUnique({
        where: { id: validatedData.unionId },
      });
      if (!union) {
        return NextResponse.json(
          { success: false, error: 'Union not found' },
          { status: 404 }
        );
      }
    }

    const updatedConference = await db.conference.update({
      where: { id },
      data: validatedData,
      include: {
        union: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Conference',
      entityId: id,
      details: {
        previousCode: existingConference.code,
        previousName: existingConference.name,
        changes: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedConference,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update conference error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete conference (Division Admin+, cascade check)
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

    if (!canPerformAction(session, 'DELETE_CONFERENCE')) {
      return NextResponse.json(
        { success: false, error: 'Only Division Admins or higher can delete conferences' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingConference = await db.conference.findUnique({
      where: { id },
      include: {
        _count: {
          select: { churches: true },
        },
      },
    });

    if (!existingConference) {
      return NextResponse.json(
        { success: false, error: 'Conference not found' },
        { status: 404 }
      );
    }

    // Check for cascading data
    if (existingConference._count.churches > 0) {
      const personCount = await db.person.count({
        where: { church: { conferenceId: id } },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete conference with ${existingConference._count.churches} church(es) and ${personCount} person(s). Delete child entities first.`,
        },
        { status: 400 }
      );
    }

    await db.conference.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'Conference',
      entityId: id,
      details: {
        code: existingConference.code,
        name: existingConference.name,
        unionId: existingConference.unionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Conference deleted successfully',
    });
  } catch (error) {
    console.error('Delete conference error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
