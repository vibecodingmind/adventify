import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Role } from '@prisma/client';

// GET - List batch jobs
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      type?: string;
      status?: string;
      createdBy?: string;
    } = {};

    if (type) where.type = type;
    if (status) where.status = status;

    // Church-level users can only see their own batch jobs
    if (session.role === Role.CHURCH_CLERK || session.role === Role.CHURCH_PASTOR) {
      where.createdBy = session.userId;
    }

    const [jobs, total] = await Promise.all([
      db.batchJob.findMany({
        where,
        include: {
          creator: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.batchJob.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get batch jobs error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
