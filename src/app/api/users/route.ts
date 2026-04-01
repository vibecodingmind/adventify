import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';

// GET - List users with role-based scope filtering
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(Role.CONFERENCE_ADMIN);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Build scope filter based on current user's role
    const scopeFilter = buildScopeFilter(session);

    // Build search filter
    const searchFilter: { OR?: Array<{ fullName?: object; email?: object }> } = {};
    if (search) {
      searchFilter.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // Build role filter
    const roleFilter: { role?: Role } = {};
    if (role && Object.values(Role).includes(role as Role)) {
      roleFilter.role = role as Role;
    }

    // Build status filter
    const statusFilter: { isActive?: boolean } = {};
    if (status === 'active') {
      statusFilter.isActive = true;
    } else if (status === 'inactive') {
      statusFilter.isActive = false;
    }

    const where = {
      ...scopeFilter,
      ...searchFilter,
      ...roleFilter,
      ...statusFilter,
    };

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          division: { select: { id: true, code: true, name: true } },
          union: { select: { id: true, code: true, name: true } },
          conference: { select: { id: true, code: true, name: true } },
          church: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.user.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        users,
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

    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

/**
 * Build Prisma WHERE clause based on the authenticated user's role and scope.
 * Each admin level can see users at their level and below within their hierarchy.
 */
function buildScopeFilter(user: {
  role: Role;
  divisionId?: string | null;
  unionId?: string | null;
  conferenceId?: string | null;
  churchId?: string | null;
}) {
  // GC Admin sees everything
  if (user.role === Role.GENERAL_CONFERENCE_ADMIN) {
    return {};
  }

  // Division Admin sees users in their division (directly, or via union/conference/church)
  if (user.role === Role.DIVISION_ADMIN && user.divisionId) {
    return {
      OR: [
        { divisionId: user.divisionId },
        { union: { divisionId: user.divisionId } },
        { conference: { union: { divisionId: user.divisionId } } },
        { church: { conference: { union: { divisionId: user.divisionId } } } },
      ],
    };
  }

  // Union Admin sees users in their union
  if (user.role === Role.UNION_ADMIN && user.unionId) {
    return {
      OR: [
        { unionId: user.unionId },
        { conference: { unionId: user.unionId } },
        { church: { conference: { unionId: user.unionId } } },
      ],
    };
  }

  // Conference Admin sees users in their conference
  if (user.role === Role.CONFERENCE_ADMIN && user.conferenceId) {
    return {
      OR: [
        { conferenceId: user.conferenceId },
        { church: { conferenceId: user.conferenceId } },
      ],
    };
  }

  // Default: only see users within the same scope fields
  const filter: Record<string, string | null> = {};
  if (user.divisionId) filter.divisionId = user.divisionId;
  if (user.unionId) filter.unionId = user.unionId;
  if (user.conferenceId) filter.conferenceId = user.conferenceId;
  if (user.churchId) filter.churchId = user.churchId;

  return filter;
}
