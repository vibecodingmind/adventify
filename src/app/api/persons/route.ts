import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const personSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['Male', 'Female', '']).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  churchId: z.string().optional(),
  notes: z.string().optional(),
});

// Generate unique Person ID
function generatePID(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = nanoid(6).toUpperCase();
  return `PID-${timestamp}-${random}`;
}

// GET - List persons
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
    const churchId = searchParams.get('churchId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Build filter based on user scope
    const where: {
      churchId?: string;
      OR?: Array<{ fullName?: { contains: string }; pid?: { contains: string } }>;
    } = {};
    
    // Apply scope filter
    if ((session.role === Role.CHURCH_CLERK || session.role === Role.CHURCH_PASTOR) && session.churchId) {
      where.churchId = session.churchId;
    } else if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      // Get all churches in conference
      const churches = await db.church.findMany({
        where: { conferenceId: session.conferenceId },
        select: { id: true },
      });
      where.churchId = { in: churches.map(c => c.id) } as unknown as string;
    } else if (session.role === Role.UNION_ADMIN && session.unionId) {
      const churches = await db.church.findMany({
        where: { conference: { unionId: session.unionId } },
        select: { id: true },
      });
      where.churchId = { in: churches.map(c => c.id) } as unknown as string;
    } else if (session.role === Role.DIVISION_ADMIN && session.divisionId) {
      const churches = await db.church.findMany({
        where: { conference: { union: { divisionId: session.divisionId } } },
        select: { id: true },
      });
      where.churchId = { in: churches.map(c => c.id) } as unknown as string;
    } else if (churchId) {
      where.churchId = churchId;
    }
    
    // Apply search
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { pid: { contains: search.toUpperCase() } },
      ];
    }
    
    const [persons, total] = await Promise.all([
      db.person.findMany({
        where,
        include: {
          church: {
            select: { id: true, name: true, city: true, country: true },
          },
          baptismRecord: {
            select: { id: true, baptismDate: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.person.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: persons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get persons error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new person
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check permissions - Church Clerk or higher
    if (session.role === Role.MEMBER) {
      return NextResponse.json(
        { success: false, error: 'Only Church Clerks or higher can create persons' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = personSchema.parse(body);
    
    // Church-level users (clerk, pastor) - auto-assign their church
    const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR];
    if (churchLevelRoles.includes(session.role)) {
      if (validatedData.churchId && validatedData.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only create persons for your church' },
          { status: 403 }
        );
      }
      validatedData.churchId = session.churchId;
    }
    
    // Verify church exists if provided
    if (validatedData.churchId) {
      const church = await db.church.findUnique({
        where: { id: validatedData.churchId },
      });
      if (!church) {
        return NextResponse.json(
          { success: false, error: 'Church not found' },
          { status: 404 }
        );
      }
    }
    
    // Validate: date of birth must not be in the future
    if (validatedData.dateOfBirth) {
      const dob = new Date(validatedData.dateOfBirth);
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      if (dob > now) {
        return NextResponse.json(
          { success: false, error: 'Date of birth cannot be in the future' },
          { status: 400 }
        );
      }
    }
    
    // Generate unique PID
    const pid = generatePID();
    
    // Prepare data
    const dataToCreate = {
      pid,
      fullName: validatedData.fullName,
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
      gender: validatedData.gender || null,
      email: validatedData.email || null,
      phone: validatedData.phone || null,
      address: validatedData.address || null,
      city: validatedData.city || null,
      country: validatedData.country || null,
      churchId: validatedData.churchId || null,
      notes: validatedData.notes || null,
    };
    
    const person = await db.person.create({
      data: dataToCreate,
      include: {
        church: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'Person',
      entityId: person.id,
      details: { pid: person.pid, fullName: person.fullName },
    });
    
    return NextResponse.json({
      success: true,
      data: person,
    });
  } catch (error) {
    console.error('Create person error:', error);
    
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
