import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { getAuditLogs, type AuditAction, type AuditEntity } from '@/lib/audit';
import { Role } from '@prisma/client';

// GET - Retrieve audit logs with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    // Only CONFERENCE_ADMIN and above can access audit logs
    const session = await requireRole(Role.CONFERENCE_ADMIN);

    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('userId') || undefined;
    const entity = searchParams.get('entity') as AuditEntity | undefined;
    const action = searchParams.get('action') as AuditAction | undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Validate entity if provided
    const validEntities: AuditEntity[] = [
      'User', 'Division', 'Union', 'Conference', 'Church',
      'Person', 'BaptismRecord', 'Certificate',
    ];

    const validActions: AuditAction[] = [
      'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT',
      'LOGIN', 'LOGOUT', 'REGISTER', 'VIEW', 'DOWNLOAD', 'GENERATE',
    ];

    if (entity && !validEntities.includes(entity)) {
      return NextResponse.json(
        { success: false, error: 'Invalid entity filter' },
        { status: 400 }
      );
    }

    if (action && !validActions.includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action filter' },
        { status: 400 }
      );
    }

    const { logs, total } = await getAuditLogs({
      userId,
      entity,
      action,
      limit: Math.min(limit, 100), // Cap at 100
      offset,
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        totalPages,
      },
    });
  } catch (error) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }

    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
