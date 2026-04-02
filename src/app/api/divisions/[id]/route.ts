import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateDivisionSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  headquarters: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// PATCH - Update division (GC Admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== Role.GENERAL_CONFERENCE_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only General Conference Admins can update divisions' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateDivisionSchema.parse(body);

    // Check division exists
    const existingDivision = await db.division.findUnique({
      where: { id },
    });

    if (!existingDivision) {
      return NextResponse.json(
        { success: false, error: 'Division not found' },
        { status: 404 }
      );
    }

    // Check if code change conflicts
    if (validatedData.code && validatedData.code !== existingDivision.code) {
      const codeExists = await db.division.findUnique({
        where: { code: validatedData.code },
      });
      if (codeExists) {
        return NextResponse.json(
          { success: false, error: 'Division code already exists' },
          { status: 400 }
        );
      }
    }

    const updatedDivision = await db.division.update({
      where: { id },
      data: validatedData,
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Division',
      entityId: id,
      details: {
        previousCode: existingDivision.code,
        previousName: existingDivision.name,
        changes: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedDivision,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error('Update division error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete division (GC Admin only, cascade check)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== Role.GENERAL_CONFERENCE_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only General Conference Admins can delete divisions' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingDivision = await db.division.findUnique({
      where: { id },
      include: {
        _count: {
          select: { unions: true },
        },
      },
    });

    if (!existingDivision) {
      return NextResponse.json(
        { success: false, error: 'Division not found' },
        { status: 404 }
      );
    }

    // Check for cascading data
    const unions = await db.union.findMany({
      where: { divisionId: id },
      include: {
        _count: { select: { conferences: true } },
      },
    });

    const conferenceCount = unions.reduce((sum, u) => sum + u._count.conferences, 0);

    if (existingDivision._count.unions > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete division with ${existingDivision._count.unions} union(s), ${conferenceCount} conference(s), and associated churches/persons/records. Delete child entities first.`,
        },
        { status: 400 }
      );
    }

    await db.division.delete({
      where: { id },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'Division',
      entityId: id,
      details: {
        code: existingDivision.code,
        name: existingDivision.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Division deleted successfully',
    });
  } catch (error) {
    console.error('Delete division error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
