import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const churchSchema = z.object({
  code: z.string().min(1, 'Code is required').max(10),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  conferenceId: z.string().min(1, 'Conference is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
});

// GET - List churches
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
    const conferenceId = searchParams.get('conferenceId');
    const unionId = searchParams.get('unionId');
    const divisionId = searchParams.get('divisionId');
    
    // Build filter based on user scope
    const where: {
      conferenceId?: string;
      conference?: { unionId?: string; union?: { divisionId?: string } };
    } = {};
    
    if (session.role === Role.CHURCH_ADMIN && session.churchId) {
      // Church admin sees only their church
      return NextResponse.json({
        success: true,
        data: await db.church.findMany({
          where: { id: session.churchId },
          include: {
            conference: {
              select: {
                id: true,
                code: true,
                name: true,
                union: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    division: { select: { id: true, code: true, name: true } },
                  },
                },
              },
            },
          },
        }),
      });
    } else if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      where.conferenceId = session.conferenceId;
    } else if (session.role === Role.UNION_ADMIN && session.unionId) {
      where.conference = { unionId: session.unionId };
    } else if (session.role === Role.DIVISION_ADMIN && session.divisionId) {
      where.conference = { union: { divisionId: session.divisionId } };
    } else if (conferenceId) {
      where.conferenceId = conferenceId;
    } else if (unionId) {
      where.conference = { unionId };
    } else if (divisionId) {
      where.conference = { union: { divisionId } };
    }
    
    const churches = await db.church.findMany({
      where,
      include: {
        conference: {
          select: {
            id: true,
            code: true,
            name: true,
            union: {
              select: {
                id: true,
                code: true,
                name: true,
                division: { select: { id: true, code: true, name: true } },
              },
            },
          },
        },
        _count: {
          select: { persons: true, baptismRecords: true },
        },
      },
      orderBy: [{ conference: { name: 'asc' } }, { name: 'asc' }],
    });
    
    return NextResponse.json({
      success: true,
      data: churches.map(church => ({
        ...church,
        personCount: church._count.persons,
        baptismRecordCount: church._count.baptismRecords,
      })),
    });
  } catch (error) {
    console.error('Get churches error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new church
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check permissions - Conference Admin or higher
    if (session.role !== Role.GENERAL_CONFERENCE_ADMIN && 
        session.role !== Role.DIVISION_ADMIN &&
        session.role !== Role.UNION_ADMIN &&
        session.role !== Role.CONFERENCE_ADMIN) {
      return NextResponse.json(
        { success: false, error: 'Only Conference Admins or higher can create churches' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = churchSchema.parse(body);
    
    // Conference admin can only create churches in their conference
    if (session.role === Role.CONFERENCE_ADMIN && validatedData.conferenceId !== session.conferenceId) {
      return NextResponse.json(
        { success: false, error: 'You can only create churches in your conference' },
        { status: 403 }
      );
    }
    
    // Union admin check
    if (session.role === Role.UNION_ADMIN) {
      const conference = await db.conference.findUnique({
        where: { id: validatedData.conferenceId },
      });
      if (!conference || conference.unionId !== session.unionId) {
        return NextResponse.json(
          { success: false, error: 'You can only create churches in conferences within your union' },
          { status: 403 }
        );
      }
    }
    
    // Division admin check
    if (session.role === Role.DIVISION_ADMIN) {
      const conference = await db.conference.findUnique({
        where: { id: validatedData.conferenceId },
        include: { union: true },
      });
      if (!conference || conference.union.divisionId !== session.divisionId) {
        return NextResponse.json(
          { success: false, error: 'You can only create churches in conferences within your division' },
          { status: 403 }
        );
      }
    }
    
    // Check if code+conference combination already exists
    const existingChurch = await db.church.findFirst({
      where: {
        code: validatedData.code,
        conferenceId: validatedData.conferenceId,
      },
    });
    
    if (existingChurch) {
      return NextResponse.json(
        { success: false, error: 'Church code already exists in this conference' },
        { status: 400 }
      );
    }
    
    // Verify conference exists
    const conference = await db.conference.findUnique({
      where: { id: validatedData.conferenceId },
    });
    
    if (!conference) {
      return NextResponse.json(
        { success: false, error: 'Conference not found' },
        { status: 404 }
      );
    }
    
    // Clean email if empty string
    const dataToCreate = { ...validatedData };
    if (dataToCreate.email === '') {
      delete dataToCreate.email;
    }
    
    const church = await db.church.create({
      data: dataToCreate,
      include: {
        conference: {
          select: { id: true, code: true, name: true },
        },
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'Church',
      entityId: church.id,
      details: { code: church.code, name: church.name, conferenceId: church.conferenceId },
    });
    
    return NextResponse.json({
      success: true,
      data: church,
    });
  } catch (error) {
    console.error('Create church error:', error);
    
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
