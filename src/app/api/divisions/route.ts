import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const divisionSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  headquarters: z.string().optional(),
  description: z.string().optional(),
});

// GET - List all divisions
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const divisions = await db.division.findMany({
      include: {
        _count: {
          select: { unions: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    // Get church count for each division
    const divisionsWithCounts = await Promise.all(
      divisions.map(async (division) => {
        const churchCount = await db.church.count({
          where: {
            conference: {
              union: {
                divisionId: division.id,
              },
            },
          },
        });
        
        return {
          ...division,
          unionCount: division._count.unions,
          churchCount,
        };
      })
    );
    
    return NextResponse.json({
      success: true,
      data: divisionsWithCounts,
    });
  } catch (error) {
    console.error('Get divisions error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new division
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== Role.GENERAL_CONFERENCE_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only General Conference Admins can create divisions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = divisionSchema.parse(body);
    
    // Check if code already exists
    const existingDivision = await db.division.findUnique({
      where: { code: validatedData.code },
    });
    
    if (existingDivision) {
      return NextResponse.json(
        { success: false, error: 'Division code already exists' },
        { status: 400 }
      );
    }
    
    const division = await db.division.create({
      data: validatedData,
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'Division',
      entityId: division.id,
      details: { code: division.code, name: division.name },
    });
    
    return NextResponse.json({
      success: true,
      data: division,
    });
  } catch (error) {
    console.error('Create division error:', error);
    
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
