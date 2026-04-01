import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createCertificate } from '@/lib/certificate';
import { Role } from '@prisma/client';
import { z } from 'zod';

const createCertificateSchema = z.object({
  baptismRecordId: z.string().min(1, 'Baptism record ID is required'),
});

// GET - List certificates
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
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;
    
    // Build filter based on user scope
    const where: {
      baptismRecord: {
        churchId?: string | { in: string[] };
        OR?: Array<{ person: { fullName?: { contains: string } } }>;
      };
    } = { baptismRecord: {} };
    
    // Apply scope filter
    if ((session.role === Role.CHURCH_CLERK || session.role === Role.CHURCH_PASTOR) && session.churchId) {
      where.baptismRecord.churchId = session.churchId;
    } else if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      const churches = await db.church.findMany({
        where: { conferenceId: session.conferenceId },
        select: { id: true },
      });
      where.baptismRecord.churchId = { in: churches.map(c => c.id) };
    } else if (session.role === Role.UNION_ADMIN && session.unionId) {
      const churches = await db.church.findMany({
        where: { conference: { unionId: session.unionId } },
        select: { id: true },
      });
      where.baptismRecord.churchId = { in: churches.map(c => c.id) };
    } else if (session.role === Role.DIVISION_ADMIN && session.divisionId) {
      const churches = await db.church.findMany({
        where: { conference: { union: { divisionId: session.divisionId } } },
        select: { id: true },
      });
      where.baptismRecord.churchId = { in: churches.map(c => c.id) };
    } else if (session.role === Role.MEMBER && session.personId) {
      // Member can only see their own certificate
      const baptismRecord = await db.baptismRecord.findUnique({
        where: { personId: session.personId },
      });
      if (baptismRecord) {
        where.baptismRecord.churchId = baptismRecord.churchId;
      }
    }
    
    // Apply search
    if (search) {
      where.baptismRecord.OR = [
        { person: { fullName: { contains: search } } },
      ];
    }
    
    const [certificates, total] = await Promise.all([
      db.certificate.findMany({
        where,
        include: {
          baptismRecord: {
            include: {
              person: {
                select: { id: true, pid: true, fullName: true, dateOfBirth: true },
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.certificate.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: certificates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Generate new certificate
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
        { success: false, error: 'Only Church Clerks or higher can generate certificates' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validatedData = createCertificateSchema.parse(body);
    
    // Get the baptism record
    const baptismRecord = await db.baptismRecord.findUnique({
      where: { id: validatedData.baptismRecordId },
      include: {
        church: {
          include: {
            conference: {
              include: {
                union: {
                  include: { division: true },
                },
              },
            },
          },
        },
      },
    });
    
    if (!baptismRecord) {
      return NextResponse.json(
        { success: false, error: 'Baptism record not found' },
        { status: 404 }
      );
    }
    
    // Verify user has access
    const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR];
    if (churchLevelRoles.includes(session.role)) {
      if (baptismRecord.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only generate certificates for your church' },
          { status: 403 }
        );
      }
    }
    
    // Check if certificate already exists
    const existingCertificate = await db.certificate.findUnique({
      where: { baptismRecordId: validatedData.baptismRecordId },
    });
    
    if (existingCertificate) {
      return NextResponse.json({
        success: true,
        data: existingCertificate,
        message: 'Certificate already exists',
      });
    }
    
    // Get base URL for verification
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    // Generate certificate
    const certificate = await createCertificate(validatedData.baptismRecordId, baseUrl);
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'GENERATE',
      entity: 'Certificate',
      entityId: certificate.id,
      details: {
        bcn: certificate.bcn,
        baptismRecordId: validatedData.baptismRecordId,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    console.error('Generate certificate error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    );
  }
}
