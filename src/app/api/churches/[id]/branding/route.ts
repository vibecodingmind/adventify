import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const brandingSchema = z.object({
  logo: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  website: z.string().optional(),
});

// GET - Get church branding settings
export async function GET(
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

    const church = await db.church.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        website: true,
      },
    });

    if (!church) {
      return NextResponse.json(
        { success: false, error: 'Church not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: church,
    });
  } catch (error) {
    console.error('Get church branding error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update church branding
export async function PATCH(
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
    if (
      session.role !== Role.GENERAL_CONFERENCE_ADMIN &&
      session.role !== Role.DIVISION_ADMIN &&
      session.role !== Role.UNION_ADMIN &&
      session.role !== Role.CONFERENCE_ADMIN
    ) {
      return NextResponse.json(
        { success: false, error: 'Only Conference Admins or higher can update church branding' },
        { status: 403 }
      );
    }

    const church = await db.church.findUnique({
      where: { id },
    });

    if (!church) {
      return NextResponse.json(
        { success: false, error: 'Church not found' },
        { status: 404 }
      );
    }

    // Verify access
    if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      if (church.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only update branding for churches in your conference' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validatedData = brandingSchema.parse(body);

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (validatedData.logo !== undefined) updateData.logo = validatedData.logo;
    if (validatedData.primaryColor !== undefined) updateData.primaryColor = validatedData.primaryColor;
    if (validatedData.secondaryColor !== undefined) updateData.secondaryColor = validatedData.secondaryColor;
    if (validatedData.website !== undefined) updateData.website = validatedData.website;

    const updatedChurch = await db.church.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        logo: true,
        primaryColor: true,
        secondaryColor: true,
        website: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Church',
      entityId: id,
      details: {
        branding: true,
        fields: Object.keys(updateData),
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedChurch,
    });
  } catch (error) {
    console.error('Update church branding error:', error);

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
