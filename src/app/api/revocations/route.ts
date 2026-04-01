import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';

// GET - List all revoked certificates
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(Role.CHURCH_CLERK);
    const searchParams = request.nextUrl.searchParams;

    const churchId = searchParams.get('churchId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build where clause
    const where: Record<string, unknown> = {
      isRevoked: true,
    };

    if (dateFrom || dateTo) {
      where.revokedAt = {};
      if (dateFrom) {
        (where.revokedAt as Record<string, unknown>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.revokedAt as Record<string, unknown>).lte = new Date(dateTo);
      }
    }

    // Apply scope filter based on role
    if (session.role === Role.GENERAL_CONFERENCE_ADMIN) {
      // Access to all
    } else if (session.role === Role.DIVISION_ADMIN) {
      where.baptismRecord = {
        church: {
          conference: {
            union: {
              divisionId: session.divisionId,
            },
          },
        },
      };
    } else if (session.role === Role.UNION_ADMIN) {
      where.baptismRecord = {
        church: {
          conference: {
            unionId: session.unionId,
          },
        },
      };
    } else if (session.role === Role.CONFERENCE_ADMIN) {
      where.baptismRecord = {
        church: {
          conferenceId: session.conferenceId,
        },
      };
    } else {
      // CHURCH_PASTOR or CHURCH_CLERK
      where.baptismRecord = {
        churchId: session.churchId,
      };
    }

    // Additional church filter (for admins who have broader access)
    if (churchId && session.role !== Role.CHURCH_CLERK && session.role !== Role.CHURCH_PASTOR) {
      if (where.baptismRecord && typeof where.baptismRecord === 'object') {
        (where.baptismRecord as Record<string, unknown>).churchId = churchId;
      }
    }

    const [revokedCerts, total] = await Promise.all([
      db.certificate.findMany({
        where,
        include: {
          baptismRecord: {
            include: {
              person: true,
              church: {
                include: {
                  conference: {
                    include: {
                      union: {
                        include: {
                          division: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { revokedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.certificate.count({ where }),
    ]);

    // Get revoker names
    const revokerIds = [...new Set(revokedCerts.map(c => c.revokedBy).filter(Boolean) as string[])];
    const revokers = revokerIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: revokerIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const revokerMap = new Map(revokers.map(r => [r.id, r.fullName]));

    const data = revokedCerts.map(cert => ({
      id: cert.id,
      bcn: cert.bcn,
      isRevoked: cert.isRevoked,
      revokedAt: cert.revokedAt,
      revocationReason: cert.revocationReason,
      revokedByName: cert.revokedBy ? revokerMap.get(cert.revokedBy) || 'Unknown' : null,
      personName: cert.baptismRecord.person.fullName,
      personPid: cert.baptismRecord.person.pid,
      churchName: cert.baptismRecord.church.name,
      churchId: cert.baptismRecord.church.id,
      baptismDate: cert.baptismRecord.baptismDate,
      certificateDate: cert.certificateDate,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Revocations list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch revocations' },
      { status: 500 }
    );
  }
}
