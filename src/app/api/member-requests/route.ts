import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRequestAction, requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import {
  notifyOnRequestCreated,
} from '@/lib/request-notifications';
import { DocumentType, RequestStatus, Role } from '@prisma/client';
import { z } from 'zod';

const createRequestSchema = z.object({
  personId: z.string().min(1, 'Person is required'),
  documentType: z.nativeEnum(DocumentType),
  reason: z.string().max(500).optional(),
});

function generateRequestId(): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${year}-${random}`;
}

// POST - Create member request (CHURCH_CLERK only)
export async function POST(request: NextRequest) {
  try {
    const session = await requireRequestAction('CREATE_REQUEST');

    const body = await request.json();
    const validatedData = createRequestSchema.parse(body);

    // Look up the Person and verify they belong to the clerk's church
    const person = await db.person.findUnique({
      where: { id: validatedData.personId },
      include: { user: { select: { id: true } } },
    });

    if (!person) {
      return NextResponse.json(
        { success: false, error: 'Person not found' },
        { status: 404 }
      );
    }

    if (person.churchId !== session.churchId) {
      return NextResponse.json(
        { success: false, error: 'This person does not belong to your church' },
        { status: 403 }
      );
    }

    // Determine memberId: person's linked user ID or fallback to clerk's userId
    const memberId = person.user?.id || session.userId;
    const requestId = generateRequestId();

    const memberRequest = await db.memberRequest.create({
      data: {
        requestId,
        memberId,
        personId: person.id,
        churchId: session.churchId,
        documentType: validatedData.documentType,
        reason: validatedData.reason || null,
        status: RequestStatus.PENDING,
      },
      include: {
        member: { select: { id: true, fullName: true, email: true } },
        person: { select: { id: true, pid: true, fullName: true, email: true } },
        church: { select: { id: true, name: true, city: true, country: true } },
      },
    });

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'MemberRequest',
      entityId: memberRequest.id,
      details: {
        requestId,
        personId: person.id,
        personName: person.fullName,
        documentType: validatedData.documentType,
      },
    });

    // Non-blocking: notify pastor(s)
    notifyOnRequestCreated(
      memberRequest.id,
      person.fullName,
      session.churchId,
      session.userId
    ).catch(() => {});

    return NextResponse.json(
      { success: true, data: memberRequest },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'An error occurred';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (message === 'Forbidden' || message.includes('Only church clerks')) {
      return NextResponse.json(
        { success: false, error: message },
        { status: 403 }
      );
    }

    console.error('Create member request error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// GET - List member requests (role-scoped)
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();

    // Conference+ roles cannot access member requests
    if (
      session.role === Role.GENERAL_CONFERENCE_ADMIN ||
      session.role === Role.DIVISION_ADMIN ||
      session.role === Role.UNION_ADMIN ||
      session.role === Role.CONFERENCE_ADMIN
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied at conference level and above' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RequestStatus | null;
    const documentType = searchParams.get('documentType') as DocumentType | null;
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause based on role
    const where: {
      memberId?: string;
      churchId?: string;
      status?: RequestStatus;
      documentType?: DocumentType;
      OR?: Array<Record<string, unknown>>;
    } = {};

    if (session.role === Role.MEMBER) {
      where.memberId = session.userId;
    } else {
      // CHURCH_CLERK and CHURCH_PASTOR see all church requests
      where.churchId = session.churchId;
    }

    // Apply status filter
    if (status && Object.values(RequestStatus).includes(status)) {
      where.status = status;
    }

    // Apply documentType filter
    if (documentType && Object.values(DocumentType).includes(documentType)) {
      where.documentType = documentType;
    }

    // Apply search (requestId or member fullName)
    if (search) {
      where.OR = [
        { requestId: { contains: search } },
        { member: { fullName: { contains: search } } },
        { person: { fullName: { contains: search } } },
      ];
    }

    const [requests, total] = await Promise.all([
      db.memberRequest.findMany({
        where,
        include: {
          member: { select: { id: true, fullName: true, email: true } },
          person: { select: { id: true, pid: true, fullName: true, email: true } },
          church: { select: { id: true, name: true, city: true, country: true } },
          editor: { select: { id: true, fullName: true } },
          reviewer: { select: { id: true, fullName: true } },
          generator: { select: { id: true, fullName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.memberRequest.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An error occurred';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('List member requests error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
