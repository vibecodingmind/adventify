import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Role, BaptismStatus } from '@prisma/client';

// GET - Enhanced Dashboard analytics
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
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const period = (searchParams.get('period') as string) || 'all_time';

    // Build filter based on user scope
    let churchIds: string[] = [];

    if ((session.role === Role.CHURCH_CLERK || session.role === Role.CHURCH_PASTOR) && session.churchId) {
      churchIds = [session.churchId];
    } else if (session.role === Role.CONFERENCE_ADMIN && session.conferenceId) {
      const churches = await db.church.findMany({
        where: { conferenceId: session.conferenceId },
        select: { id: true },
      });
      churchIds = churches.map(c => c.id);
    } else if (session.role === Role.UNION_ADMIN && session.unionId) {
      const churches = await db.church.findMany({
        where: { conference: { unionId: session.unionId } },
        select: { id: true },
      });
      churchIds = churches.map(c => c.id);
    } else if (session.role === Role.DIVISION_ADMIN && session.divisionId) {
      const churches = await db.church.findMany({
        where: { conference: { union: { divisionId: session.divisionId } } },
        select: { id: true },
      });
      churchIds = churches.map(c => c.id);
    } else if (session.role === Role.GENERAL_CONFERENCE_ADMIN) {
      const churches = await db.church.findMany({ select: { id: true } });
      churchIds = churches.map(c => c.id);
    }

    // Compute date range based on period
    const now = new Date();
    let periodStart: Date | null = null;
    let periodEnd: Date | null = null;

    switch (period) {
      case 'this_month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        break;
      case 'this_quarter': {
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
        break;
      }
      case 'this_year':
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear() + 1, 0, 1);
        break;
      case 'all_time':
      default:
        periodStart = null;
        periodEnd = null;
        break;
    }

    // Year date range for the selected year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    // Build where clauses based on period
    const periodWhere = periodStart && periodEnd
      ? { baptismDate: { gte: periodStart, lt: periodEnd } }
      : {};
    const yearWhere = { baptismDate: { gte: yearStart, lt: yearEnd } };

    // Get core stats
    const [totalBaptisms, pendingApprovals, approvedBaptisms, recentBaptisms, monthlyStats] = await Promise.all([
      db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          ...periodWhere,
        },
      }),
      db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          status: BaptismStatus.PENDING,
        },
      }),
      db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          status: BaptismStatus.APPROVED,
          ...yearWhere,
        },
      }),
      db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          baptismDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      getMonthlyBaptismStats(churchIds, year),
    ]);

    // Get previous year stats for growth calculation
    const prevYearStart = new Date(year - 1, 0, 1);
    const prevYearEnd = new Date(year, 0, 1);

    const prevYearBaptisms = await db.baptismRecord.count({
      where: {
        churchId: { in: churchIds },
        status: BaptismStatus.APPROVED,
        baptismDate: { gte: prevYearStart, lt: prevYearEnd },
      },
    });

    const growthPercentage = prevYearBaptisms > 0
      ? ((approvedBaptisms - prevYearBaptisms) / prevYearBaptisms) * 100
      : approvedBaptisms > 0 ? 100 : 0;

    // Status breakdown
    const statusBreakdown = await getStatusBreakdown(churchIds, periodWhere);

    // Conference breakdown (for DIVISION_ADMIN+)
    let conferenceBreakdown: Array<{ conferenceId: string; conferenceName: string; totalBaptisms: number; approvedBaptisms: number }> = [];
    const roleHierarchy: Record<Role, number> = {
      GENERAL_CONFERENCE_ADMIN: 6,
      DIVISION_ADMIN: 5,
      UNION_ADMIN: 4,
      CONFERENCE_ADMIN: 3,
      CHURCH_PASTOR: 2,
      CHURCH_CLERK: 1,
      MEMBER: 0,
    };
    if (roleHierarchy[session.role] >= roleHierarchy[Role.DIVISION_ADMIN]) {
      conferenceBreakdown = await getConferenceBreakdown(churchIds, yearWhere);
    }

    // Yearly comparison (last 5 years)
    const yearlyComparison = await getYearlyComparison(churchIds);

    // Top churches
    const topChurches = await getTopChurches(churchIds, periodWhere);

    // Recent activity from audit logs
    const recentActivity = await getRecentActivity(churchIds);

    // Gender breakdown
    const genderBreakdown = await getGenderBreakdown(churchIds, periodWhere);

    // Age breakdown
    const ageBreakdown = await getAgeBreakdown(churchIds, periodWhere);

    // Church breakdown if not church admin
    let churchBreakdown: Array<{ churchId: string; churchName: string; total: number; pending: number; approved: number }> = [];

    if (session.role !== Role.CHURCH_PASTOR && session.role !== Role.CHURCH_CLERK && session.role !== Role.MEMBER) {
      churchBreakdown = await getChurchBreakdown(churchIds, yearStart, yearEnd);
    }

    return NextResponse.json({
      success: true,
      data: {
        totalBaptisms,
        pendingApprovals,
        approvedBaptisms,
        recentBaptisms,
        growthPercentage: Math.round(growthPercentage * 10) / 10,
        monthlyStats,
        churchBreakdown,
        year,
        period,
        statusBreakdown,
        conferenceBreakdown,
        yearlyComparison,
        topChurches,
        recentActivity,
        genderBreakdown,
        ageBreakdown,
        scope: {
          role: session.role,
          churchId: session.churchId,
          conferenceId: session.conferenceId,
          unionId: session.unionId,
          divisionId: session.divisionId,
        },
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

async function getMonthlyBaptismStats(churchIds: string[], year: number) {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);

  const records = await db.baptismRecord.findMany({
    where: {
      churchId: { in: churchIds },
      status: BaptismStatus.APPROVED,
      baptismDate: { gte: yearStart, lt: yearEnd },
    },
    select: { baptismDate: true },
  });

  const monthlyStats = [];
  for (let month = 0; month < 12; month++) {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 1);

    const count = records.filter(r =>
      r.baptismDate >= monthStart && r.baptismDate < monthEnd
    ).length;

    monthlyStats.push({
      month: new Date(year, month).toLocaleString('en-US', { month: 'short' }),
      monthNum: month + 1,
      year,
      count,
    });
  }

  return monthlyStats;
}

async function getChurchBreakdown(churchIds: string[], yearStart: Date, yearEnd: Date) {
  const churches = await db.church.findMany({
    where: { id: { in: churchIds } },
    select: { id: true, name: true },
  });

  const breakdown = await Promise.all(
    churches.map(async (church) => {
      const [total, pending, approved] = await Promise.all([
        db.baptismRecord.count({
          where: { churchId: church.id },
        }),
        db.baptismRecord.count({
          where: {
            churchId: church.id,
            status: BaptismStatus.PENDING,
          },
        }),
        db.baptismRecord.count({
          where: {
            churchId: church.id,
            status: BaptismStatus.APPROVED,
            baptismDate: { gte: yearStart, lt: yearEnd },
          },
        }),
      ]);

      return {
        churchId: church.id,
        churchName: church.name,
        total,
        pending,
        approved,
      };
    })
  );

  return breakdown.sort((a, b) => b.total - a.total).slice(0, 10);
}

async function getStatusBreakdown(
  churchIds: string[],
  periodWhere: Record<string, unknown>
) {
  const statuses = [BaptismStatus.PENDING, BaptismStatus.APPROVED, BaptismStatus.REJECTED];

  const breakdown = await Promise.all(
    statuses.map(async (status) => {
      const count = await db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          status,
          ...periodWhere,
        },
      });
      return { status, count };
    })
  );

  return breakdown;
}

async function getConferenceBreakdown(
  churchIds: string[],
  yearWhere: Record<string, unknown>
) {
  const conferences = await db.conference.findMany({
    include: { churches: { select: { id: true } } },
  });

  const breakdown = await Promise.all(
    conferences
      .filter((conf) => conf.churches.some((c) => churchIds.includes(c.id)))
      .map(async (conf) => {
        const confChurchIds = conf.churches.map((c) => c.id);
        const [totalBaptisms, approvedBaptisms] = await Promise.all([
          db.baptismRecord.count({
            where: { churchId: { in: confChurchIds } },
          }),
          db.baptismRecord.count({
            where: {
              churchId: { in: confChurchIds },
              status: BaptismStatus.APPROVED,
              ...yearWhere,
            },
          }),
        ]);
        return {
          conferenceId: conf.id,
          conferenceName: conf.name,
          totalBaptisms,
          approvedBaptisms,
        };
      })
  );

  return breakdown.sort((a, b) => b.totalBaptisms - a.totalBaptisms);
}

async function getYearlyComparison(churchIds: string[]) {
  const currentYear = new Date().getFullYear();
  const years: Array<{ year: number; count: number }> = [];

  for (let y = currentYear - 4; y <= currentYear; y++) {
    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1);

    const count = await db.baptismRecord.count({
      where: {
        churchId: { in: churchIds },
        status: BaptismStatus.APPROVED,
        baptismDate: { gte: start, lt: end },
      },
    });

    years.push({ year: y, count });
  }

  return years;
}

async function getTopChurches(
  churchIds: string[],
  periodWhere: Record<string, unknown>
) {
  const churches = await db.church.findMany({
    where: { id: { in: churchIds } },
    select: { id: true, name: true, city: true, country: true },
  });

  const counts = await Promise.all(
    churches.map(async (church) => {
      const baptismCount = await db.baptismRecord.count({
        where: {
          churchId: church.id,
          status: BaptismStatus.APPROVED,
          ...periodWhere,
        },
      });
      return {
        churchId: church.id,
        churchName: church.name,
        city: church.city || '',
        country: church.country || '',
        baptismCount,
      };
    })
  );

  return counts.sort((a, b) => b.baptismCount - a.baptismCount).slice(0, 10);
}

async function getRecentActivity(churchIds: string[]) {
  const logs = await db.auditLog.findMany({
    where: {
      OR: [
        { entity: 'BaptismRecord' },
        { entity: 'Certificate' },
        { entity: 'User' },
        { action: 'LOGIN' },
      ],
    },
    include: {
      user: {
        select: { id: true, fullName: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    details: log.details || '',
    createdAt: log.createdAt.toISOString(),
    userName: log.user.fullName,
  }));
}

async function getGenderBreakdown(
  churchIds: string[],
  periodWhere: Record<string, unknown>
) {
  // Get person IDs from baptism records matching period
  const baptismRecords = await db.baptismRecord.findMany({
    where: {
      churchId: { in: churchIds },
      status: BaptismStatus.APPROVED,
      ...periodWhere,
    },
    select: { personId: true },
  });

  const personIds = baptismRecords.map((r) => r.personId);

  const persons = await db.person.findMany({
    where: {
      id: { in: personIds },
      gender: { not: null },
    },
    select: { gender: true },
  });

  const genderMap: Record<string, number> = {};
  for (const p of persons) {
    const g = p.gender?.toUpperCase() || 'UNKNOWN';
    genderMap[g] = (genderMap[g] || 0) + 1;
  }

  return Object.entries(genderMap).map(([gender, count]) => ({ gender, count }));
}

async function getAgeBreakdown(
  churchIds: string[],
  periodWhere: Record<string, unknown>
) {
  // Get person IDs from baptism records matching period
  const baptismRecords = await db.baptismRecord.findMany({
    where: {
      churchId: { in: churchIds },
      status: BaptismStatus.APPROVED,
      ...periodWhere,
    },
    select: { personId: true, baptismDate: true },
  });

  const personIds = baptismRecords.map((r) => r.personId);

  const persons = await db.person.findMany({
    where: {
      id: { in: personIds },
      dateOfBirth: { not: null },
    },
    select: { dateOfBirth: true, id: true },
  });

  // Map person to their baptism date to calculate age at baptism
  const baptismDateMap: Record<string, Date> = {};
  for (const r of baptismRecords) {
    baptismDateMap[r.personId] = r.baptismDate;
  }

  const ranges = [
    { range: '0-17', min: 0, max: 17 },
    { range: '18-25', min: 18, max: 25 },
    { range: '26-35', min: 26, max: 35 },
    { range: '36-50', min: 36, max: 50 },
    { range: '51+', min: 51, max: 999 },
  ];

  return ranges.map(({ range, min, max }) => {
    const count = persons.filter((p) => {
      const baptismDate = baptismDateMap[p.id];
      if (!p.dateOfBirth || !baptismDate) return false;
      const age = Math.floor(
        (baptismDate.getTime() - p.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
      );
      return age >= min && age <= max;
    }).length;
    return { range, count };
  });
}
