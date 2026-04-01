import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role, BaptismStatus } from '@prisma/client';
import { z } from 'zod';

const baptismRecordSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  churchId: z.string().min(1, 'Church is required'),
  baptismDate: z.string().min(1, 'Baptism date is required'),
  baptismLocation: z.string().optional(),
  pastorName: z.string().min(2, 'Pastor name is required'),
  pastorTitle: z.string().optional(),
  witnessName: z.string().optional(),
  notes: z.string().optional(),
});

// GET - List baptism records
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
    const status = searchParams.get('status') as BaptismStatus | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Build filter based on user scope
    const where: {
      churchId?: string | { in: string[] };
      status?: BaptismStatus;
      OR?: Array<{ person: { fullName?: { contains: string }; pid?: { contains: string } } }>;
    } = {};
    
    // Apply status filter
    if (status && Object.values(BaptismStatus).includes(status)) {
      where.status = status;
    }
    
    // Apply scope filter
    if ((session.role === Role.CHURCH_CLERK || session.role === Role.CHURCH_PASTOR) && session.churchId) {
      where.churchId = session.churchId;
    } else if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      const churches = await db.church.findMany({
        where: { conferenceId: session.conferenceId },
        select: { id: true },
      });
      where.churchId = { in: churches.map(c => c.id) };
    } else if (session.role === Role.UNION_ADMIN && session.unionId) {
      const churches = await db.church.findMany({
        where: { conference: { unionId: session.unionId } },
        select: { id: true },
      });
      where.churchId = { in: churches.map(c => c.id) };
    } else if (session.role === Role.DIVISION_ADMIN && session.divisionId) {
      const churches = await db.church.findMany({
        where: { conference: { union: { divisionId: session.divisionId } } },
        select: { id: true },
      });
      where.churchId = { in: churches.map(c => c.id) };
    } else if (churchId) {
      where.churchId = churchId;
    }
    
    // Apply search
    if (search) {
      where.OR = [
        { person: { fullName: { contains: search } } },
        { person: { pid: { contains: search.toUpperCase() } } },
      ];
    }
    
    const [records, total] = await Promise.all([
      db.baptismRecord.findMany({
        where,
        include: {
          person: {
            select: { id: true, pid: true, fullName: true, dateOfBirth: true, gender: true },
          },
          church: {
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
              conference: {
                select: { id: true, code: true, name: true },
              },
            },
          },
          certificate: {
            select: { id: true, bcn: true, verificationUrl: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.baptismRecord.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get baptism records error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create new baptism record
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
        { success: false, error: 'Only Church Clerks or higher can create baptism records' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = baptismRecordSchema.parse(body);
    
    // Validate: baptism date must not be in the future
    const baptismDate = new Date(validatedData.baptismDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (baptismDate > today) {
      return NextResponse.json(
        { success: false, error: 'Baptism date cannot be in the future' },
        { status: 400 }
      );
    }
    
    // Church-level users can only create records for their church
    const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR];
    if (churchLevelRoles.includes(session.role)) {
      if (validatedData.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only create baptism records for your church' },
          { status: 403 }
        );
      }
    }
    
    // Verify person exists and doesn't already have a baptism record
    const person = await db.person.findUnique({
      where: { id: validatedData.personId },
      include: { baptismRecord: true },
    });
    
    if (!person) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      );
    }
    
    if (person.baptismRecord) {
      return NextResponse.json(
        { success: false, error: 'This person already has a baptism record' },
        { status: 400 }
      );
    }
    
    // Validate: person must be old enough for baptism (minimum 12 years old)
    if (person.dateOfBirth) {
      const ageMs = baptismDate.getTime() - person.dateOfBirth.getTime();
      const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
      if (ageYears < 12) {
        return NextResponse.json(
          { success: false, error: 'Person must be at least 12 years old to be baptized. Children cannot be baptized in this church.' },
          { status: 400 }
        );
      }
    }
    
    // Verify church exists
    const church = await db.church.findUnique({
      where: { id: validatedData.churchId },
    });
    
    if (!church) {
      return NextResponse.json(
        { success: false, error: 'Church not found' },
        { status: 404 }
      );
    }
    
    // Create baptism record
    const baptismRecord = await db.baptismRecord.create({
      data: {
        personId: validatedData.personId,
        churchId: validatedData.churchId,
        baptismDate: new Date(validatedData.baptismDate),
        baptismLocation: validatedData.baptismLocation || null,
        pastorName: validatedData.pastorName,
        pastorTitle: validatedData.pastorTitle || null,
        witnessName: validatedData.witnessName || null,
        notes: validatedData.notes || null,
        status: BaptismStatus.PENDING,
      },
      include: {
        person: {
          select: { id: true, pid: true, fullName: true },
        },
        church: {
          select: { id: true, name: true, city: true, country: true },
        },
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'BaptismRecord',
      entityId: baptismRecord.id,
      details: {
        personId: baptismRecord.personId,
        personName: baptismRecord.person.fullName,
        churchId: baptismRecord.churchId,
        baptismDate: baptismRecord.baptismDate,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: baptismRecord,
    });
  } catch (error) {
    console.error('Create baptism record error:', error);
    
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
