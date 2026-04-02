import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const conferenceSchema = z.object({
  code: z.string().min(2, 'Code must be at least 2 characters').max(10).toUpperCase(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  unionId: z.string().min(1, 'Union is required'),
  headquarters: z.string().optional(),
  description: z.string().optional(),
});

// GET - List conferences
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
    const unionId = searchParams.get('unionId');
    const divisionId = searchParams.get('divisionId');
    
    // Build filter based on user scope
    const where: {
      unionId?: string;
      union?: { divisionId?: string };
    } = {};
    
    if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      // Conference admin sees only their conference
      return NextResponse.json({
        success: true,
        data: await db.conference.findMany({
          where: { id: session.conferenceId },
          include: {
            union: {
              select: {
                id: true,
                code: true,
                name: true,
                division: { select: { id: true, code: true, name: true } },
              },
            },
            _count: { select: { churches: true } },
          },
        }),
      });
    } else if (session.role === Role.UNION_ADMIN && session.unionId) {
      where.unionId = session.unionId;
    } else if (session.role === Role.DIVISION_ADMIN && session.divisionId) {
      where.union = { divisionId: session.divisionId };
    } else if (unionId) {
      where.unionId = unionId;
    } else if (divisionId) {
      where.union = { divisionId };
    }
    
    const conferences = await db.conference.findMany({
      where,
      include: {
        union: {
          select: {
            id: true,
            code: true,
            name: true,
            division: { select: { id: true, code: true, name: true } },
          },
        },
        _count: {
          select: { churches: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    return NextResponse.json({
      success: true,
      data: conferences.map(conf => ({
        ...conf,
        churchCount: conf._count.churches,
      })),
    });
  } catch (error) {
    console.error('Get conferences error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new conference
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check permissions - Union Admin or higher
    if (session.role !== Role.GENERAL_CONFERENCE_ADMIN && 
        session.role !== Role.DIVISION_ADMIN &&
        session.role !== Role.UNION_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only Union Admins or higher can create conferences' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = conferenceSchema.parse(body);
    
    // Union admin can only create conferences in their union
    if (session.role === Role.UNION_ADMIN && validatedData.unionId !== session.unionId) {
      return NextResponse.json(
        { success: false, error: 'You can only create conferences in your union' },
        { status: 403 }
      );
    }
    
    // Division admin check
    if (session.role === Role.DIVISION_ADMIN) {
      const union = await db.union.findUnique({
        where: { id: validatedData.unionId },
      });
      if (!union || union.divisionId !== session.divisionId) {
        return NextResponse.json(
          { success: false, error: 'You can only create conferences in unions within your division' },
          { status: 403 }
        );
      }
    }
    
    // Check if code already exists
    const existingConference = await db.conference.findUnique({
      where: { code: validatedData.code },
    });
    
    if (existingConference) {
      return NextResponse.json(
        { success: false, error: 'Conference code already exists' },
        { status: 400 }
      );
    }
    
    // Verify union exists
    const union = await db.union.findUnique({
      where: { id: validatedData.unionId },
    });
    
    if (!union) {
      return NextResponse.json(
        { success: false, error: 'Union not found' },
        { status: 404 }
      );
    }
    
    const conference = await db.conference.create({
      data: validatedData,
      include: {
        union: {
          select: { id: true, code: true, name: true },
        },
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'Conference',
      entityId: conference.id,
      details: { code: conference.code, name: conference.name, unionId: conference.unionId },
    });
    
    return NextResponse.json({
      success: true,
      data: conference,
    });
  } catch (error) {
    console.error('Create conference error:', error);
    
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
