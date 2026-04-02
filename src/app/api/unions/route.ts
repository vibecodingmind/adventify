import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const unionSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  divisionId: z.string().min(1, 'Division is required'),
  headquarters: z.string().optional(),
  description: z.string().optional(),
});

// GET - List unions
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const divisionId = searchParams.get('divisionId');
    
    const where: { divisionId?: string } = {};
    
    // Filter based on user scope
    if (session.role === Role.DIVISION_ADMIN && session.divisionId) {
      where.divisionId = session.divisionId;
    } else if (divisionId) {
      where.divisionId = divisionId;
    }
    
    const unions = await db.union.findMany({
      where,
      include: {
        division: {
          select: { id: true, code: true, name: true },
        },
        _count: {
          select: { conferences: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    // Get church count for each union
    const unionsWithCounts = await Promise.all(
      unions.map(async (union) => {
        const churchCount = await db.church.count({
          where: {
            conference: {
              unionId: union.id,
            },
          },
        });
        
        return {
          ...union,
          conferenceCount: union._count.conferences,
          churchCount,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: unionsWithCounts,
    });
  } catch (error) {
    console.error('Get unions error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new union
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check permissions - Division Admin or higher
    if (session.role !== Role.GENERAL_CONFERENCE_ADMIN && 
        session.role !== Role.DIVISION_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only Division Admins or higher can create unions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = unionSchema.parse(body);
    
    // Division admin can only create unions in their division
    if (session.role === Role.DIVISION_ADMIN && validatedData.divisionId !== session.divisionId) {
      return NextResponse.json(
        { success: false, error: 'You can only create unions in your division' },
        { status: 403 }
      );
    }
    
    // Check if code already exists
    const existingUnion = await db.union.findUnique({
      where: { code: validatedData.code },
    });
    
    if (existingUnion) {
      return NextResponse.json(
        { success: false, error: 'Union code already exists' },
        { status: 400 }
      );
    }
    
    // Verify division exists
    const division = await db.division.findUnique({
      where: { id: validatedData.divisionId },
    });
    
    if (!division) {
      return NextResponse.json(
        { success: false, error: 'Division not found' },
        { status: 404 }
      );
    }
    
    const union = await db.union.create({
      data: validatedData,
      include: {
        division: {
          select: { id: true, code: true, name: true },
        },
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'Union',
      entityId: union.id,
      details: { code: union.code, name: union.name, divisionId: union.divisionId },
    });
    
    return NextResponse.json({
      success: true,
      data: union,
    });
  } catch (error) {
    console.error('Create union error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
