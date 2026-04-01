import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { canManageRole } from '@/types';
import { Role } from '@prisma/client';
import { z } from 'zod';

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.nativeEnum(Role).optional(),
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  divisionId: z.string().nullable().optional(),
  unionId: z.string().nullable().optional(),
  conferenceId: z.string().nullable().optional(),
  churchId: z.string().nullable().optional(),
});

// GET - Get a single user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(Role.CONFERENCE_ADMIN);
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        phone: true,
        divisionId: true,
        unionId: true,
        conferenceId: true,
        churchId: true,
        personId: true,
        division: { select: { id: true, code: true, name: true } },
        union: { select: { id: true, code: true, name: true } },
        conference: { select: { id: true, code: true, name: true } },
        church: { select: { id: true, code: true, name: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Get user error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update user (toggle active/inactive, change role, update scope assignments)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(Role.CONFERENCE_ADMIN);
    const { id } = await params;

    // Fetch target user
    const targetUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Cannot modify users with higher or equal role
    if (!canManageRole(session.role, targetUser.role)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to modify this user' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // If changing role, verify the new role is also manageable
    if (validatedData.role && validatedData.role !== targetUser.role) {
      if (!canManageRole(session.role, validatedData.role)) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to assign this role' },
          { status: 403 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
    if (validatedData.role !== undefined) updateData.role = validatedData.role;
    if (validatedData.fullName !== undefined) updateData.fullName = validatedData.fullName;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone;
    if (validatedData.divisionId !== undefined) updateData.divisionId = validatedData.divisionId;
    if (validatedData.unionId !== undefined) updateData.unionId = validatedData.unionId;
    if (validatedData.conferenceId !== undefined) updateData.conferenceId = validatedData.conferenceId;
    if (validatedData.churchId !== undefined) updateData.churchId = validatedData.churchId;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        division: { select: { id: true, code: true, name: true } },
        union: { select: { id: true, code: true, name: true } },
        conference: { select: { id: true, code: true, name: true } },
        church: { select: { id: true, code: true, name: true } },
      },
    });

    // Audit log the change
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      details: {
        targetEmail: targetUser.email,
        targetFullName: targetUser.fullName,
        changes: validatedData,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Soft-delete (deactivate) user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(Role.CONFERENCE_ADMIN);
    const { id } = await params;

    // Cannot deactivate yourself
    if (session.userId === id) {
      return NextResponse.json(
        { success: false, error: 'You cannot deactivate your own account' },
        { status: 400 }
      );
    }

    // Fetch target user
    const targetUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Cannot modify users with higher or equal role
    if (!canManageRole(session.role, targetUser.role)) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to deactivate this user' },
        { status: 403 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'User',
      entityId: id,
      details: {
        targetEmail: targetUser.email,
        targetFullName: targetUser.fullName,
        previousRole: targetUser.role,
        note: 'Soft-deleted (deactivated)',
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedUser,
      message: 'User deactivated successfully',
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
