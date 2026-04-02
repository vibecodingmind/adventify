import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateUnionSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  divisionId: z.string().min(1, 'Division is required').optional(),
  headquarters: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// PATCH - Update union (Division Admin+)
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

    if (!canPerformAction(session, 'UPDATE_UNION')) {
      return NextResponse.json(
        { success: false, error: 'Only Division Admins or higher can update unions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateUnionSchema.parse(body);

    // Check union exists
    const existingUnion = await db.union.findUnique({
      where: { id },
    });

    if (!existingUnion) {
      return NextResponse.json(
        { success: false, error: 'Union not found' },
        { status: 404 }
      );
    }

    // Division admin can only update unions in their division
    if (session.role === Role.DIVISION_ADMIN) {
      if (existingUnion.divisionId !== session.divisionId) {
        return NextResponse.json(
          { success: false, error: 'You can only update unions in your division' },
          { status: 403 }
        );
      }
      // Cannot reassign to a different division
      if (validatedData.divisionId && validatedData.divisionId !== session.divisionId) {
        return NextResponse.json(
          { success: false, error: 'You can only assign unions to your division' },
          { status: 403 }
        );
      }
    }

    // Check if code change conflicts
    if (validatedData.code && validatedData.code !== existingUnion.code) {
      const codeExists = await db.union.findUnique({
        where: { code: validatedData.code },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Union code already exists' },
          { status: 400 }
        );
      }
    }

    // Verify division exists if changing
    if (validatedData.divisionId && validatedData.divisionId !== existingUnion.divisionId) {
      const division = await db.division.findUnique({
        where: { id: validatedData.divisionId },
      });
      if (!division) {
        return NextResponse.json(
          { success: false, error: 'Division not found' },
          { status: 404 }
        );
      }
    }

    const updatedUnion = await db.union.update({
      where: { id },
      data: validatedData,
      include: {
        division: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Union',
      entityId: id,
      details: {
        previousCode: existingUnion.code,
        previousName: existingUnion.name,
        changes: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUnion,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update union error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete union (Division Admin+, cascade check)
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

    if (!canPerformAction(session, 'DELETE_UNION')) {
      return NextResponse.json(
        { success: false, error: 'Only General Conference Admins can delete unions' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingUnion = await db.union.findUnique({
      where: { id },
      include: {
        _count: {
          select: { conferences: true },
        },
      },
    });

    if (!existingUnion) {
      return NextResponse.json(
        { success: false, error: 'Union not found' },
        { status: 404 }
      );
    }

    // Check for cascading data
    if (existingUnion._count.conferences > 0) {
      const churchCount = await db.church.count({
        where: {
          conference: { unionId: id },
        },
      });
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete union with ${existingUnion._count.conferences} conference(s) and ${churchCount} church(es). Delete child entities first.`,
        },
        { status: 400 }
      );
    }

    await db.union.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'Union',
      entityId: id,
      details: {
        code: existingUnion.code,
        name: existingUnion.name,
        divisionId: existingUnion.divisionId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Union deleted successfully',
    });
  } catch (error) {
    console.error('Delete union error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
