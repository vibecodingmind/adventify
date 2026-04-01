import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Role, BaptismStatus } from '@prisma/client';

// GET - Generate annual report data
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
    const churchId = searchParams.get('churchId');
    const conferenceId = searchParams.get('conferenceId');
    const unionId = searchParams.get('unionId');
    const divisionId = searchParams.get('divisionId');

    // Build filter based on user scope + optional filters
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

    // Apply optional scope filters
    if (churchId) {
      churchIds = churchIds.filter(id => id === churchId);
    } else if (conferenceId) {
      const confChurches = await db.church.findMany({
        where: { conferenceId },
        select: { id: true },
      });
      const confChurchIds = confChurches.map(c => c.id);
      churchIds = churchIds.filter(id => confChurchIds.includes(id));
    } else if (unionId) {
      const unionChurches = await db.church.findMany({
        where: { conference: { unionId } },
        select: { id: true },
      });
      const unionChurchIds = unionChurches.map(c => c.id);
      churchIds = churchIds.filter(id => unionChurchIds.includes(id));
    } else if (divisionId) {
      const divChurches = await db.church.findMany({
        where: { conference: { union: { divisionId } } },
        select: { id: true },
      });
      const divChurchIds = divChurches.map(c => c.id);
      churchIds = churchIds.filter(id => divChurchIds.includes(id));
    }

    if (churchIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          summary: { totalBaptisms: 0, approved: 0, rejected: 0, pending: 0, growthRate: 0, topMonth: '', topChurch: '' },
          monthlyData: [],
          churchData: [],
          conferenceData: [],
          yearOverYear: { currentYear: year, previousYear: year - 1, change: 0, changePercentage: 0 },
        },
      });
    }

    // Date range for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const yearWhere = { baptismDate: { gte: yearStart, lt: yearEnd } };

    // Get all baptism records for the year in scope
    const yearRecords = await db.baptismRecord.findMany({
      where: {
        churchId: { in: churchIds },
        ...yearWhere,
      },
      select: { baptismDate: true, status: true, churchId: true },
    });

    const totalBaptisms = yearRecords.length;
    const approved = yearRecords.filter(r => r.status === BaptismStatus.APPROVED).length;
    const rejected = yearRecords.filter(r => r.status === BaptismStatus.REJECTED).length;
    const pending = yearRecords.filter(r => r.status === BaptismStatus.PENDING).length;

    // Monthly data with cumulative
    const monthlyData = [];
    let cumulative = 0;
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 1);
      const monthCount = yearRecords.filter(r =>
        r.baptismDate >= monthStart && r.baptismDate < monthEnd && r.status === BaptismStatus.APPROVED
      ).length;
      cumulative += monthCount;
      monthlyData.push({
        month: new Date(year, month).toLocaleString('en-US', { month: 'short' }),
        monthNum: month + 1,
        count: monthCount,
        cumulative,
      });
    }

    // Top month
    const monthCounts = monthlyData.map((m, i) => ({ index: i, count: m.count }));
    monthCounts.sort((a, b) => b.count - a.count);
    const topMonth = monthCounts[0]?.count > 0 ? monthlyData[monthCounts[0].index].month : 'N/A';

    // Church performance data
    const churches = await db.church.findMany({
      where: { id: { in: churchIds } },
      select: { id: true, name: true, city: true },
    });

    const churchData = await Promise.all(
      churches.map(async (church) => {
        const count = await db.baptismRecord.count({
          where: {
            churchId: church.id,
            status: BaptismStatus.APPROVED,
            ...yearWhere,
          },
        });
        return {
          churchName: church.name,
          city: church.city || '',
          count,
          percentage: 0, // Will be calculated below
        };
      })
    );

    churchData.sort((a, b) => b.count - a.count);
    const totalApproved = churchData.reduce((sum, c) => sum + c.count, 0) || 1;
    churchData.forEach(c => {
      c.percentage = Math.round((c.count / totalApproved) * 1000) / 10;
    });

    // Top church
    const topChurch = churchData[0]?.count > 0 ? churchData[0].churchName : 'N/A';

    // Conference data (for higher-level roles)
    const roleHierarchy: Record<Role, number> = {
      GENERAL_CONFERENCE_ADMIN: 6,
      DIVISION_ADMIN: 5,
      UNION_ADMIN: 4,
      CONFERENCE_ADMIN: 3,
      CHURCH_PASTOR: 2,
      CHURCH_CLERK: 1,
      MEMBER: 0,
    };

    let conferenceData: Array<{ conferenceName: string; count: number; percentage: number }> = [];
    if (roleHierarchy[session.role] >= roleHierarchy[Role.UNION_ADMIN]) {
      const conferences = await db.conference.findMany({
        include: { churches: { select: { id: true } } },
      });

      const relevantConferences = conferences.filter((conf) =>
        conf.churches.some((c) => churchIds.includes(c.id))
      );

      const conferenceCounts = await Promise.all(
        relevantConferences.map(async (conf) => {
          const confChurchIds = conf.churches.map((c) => c.id);
          const count = await db.baptismRecord.count({
            where: {
              churchId: { in: confChurchIds },
              status: BaptismStatus.APPROVED,
              ...yearWhere,
            },
          });
          return { conferenceName: conf.name, count };
        })
      );

      conferenceCounts.sort((a, b) => b.count - a.count);
      const totalConf = conferenceCounts.reduce((sum, c) => sum + c.count, 0) || 1;
      conferenceData = conferenceCounts.map(c => ({
        ...c,
        percentage: Math.round((c.count / totalConf) * 1000) / 10,
      }));
    }

    // Year-over-year
    const prevYearStart = new Date(year - 1, 0, 1);
    const prevYearEnd = new Date(year, 0, 1);
    const prevYearApproved = await db.baptismRecord.count({
      where: {
        churchId: { in: churchIds },
        status: BaptismStatus.APPROVED,
        baptismDate: { gte: prevYearStart, lt: prevYearEnd },
      },
    });

    const change = approved - prevYearApproved;
    const changePercentage = prevYearApproved > 0
      ? Math.round((change / prevYearApproved) * 1000) / 10
      : approved > 0 ? 100 : 0;

    // Growth rate
    const growthRate = prevYearApproved > 0
      ? Math.round(((approved - prevYearApproved) / prevYearApproved) * 1000) / 10
      : approved > 0 ? 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalBaptisms,
          approved,
          rejected,
          pending,
          growthRate,
          topMonth,
          topChurch,
        },
        monthlyData,
        churchData,
        conferenceData,
        yearOverYear: {
          currentYear: year,
          previousYear: year - 1,
          change,
          changePercentage,
        },
      },
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
