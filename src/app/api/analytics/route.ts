import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { Role, BaptismStatus } from '@prisma/client';

// GET - Dashboard analytics
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
    
    // Date range for the year
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    
    // Get stats
    const [totalBaptisms, pendingApprovals, approvedBaptisms, recentBaptisms, monthlyStats] = await Promise.all([
      // Total baptisms in scope
      db.baptismRecord.count({
        where: { churchId: { in: churchIds } },
      }),
      
      // Pending approvals
      db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          status: BaptismStatus.PENDING,
        },
      }),
      
      // Approved baptisms this year
      db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          status: BaptismStatus.APPROVED,
          baptismDate: { gte: yearStart, lt: yearEnd },
        },
      }),
      
      // Recent baptisms (last 30 days)
      db.baptismRecord.count({
        where: {
          churchId: { in: churchIds },
          baptismDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      
      // Monthly stats for the year
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
      : 0;
    
    // Get church breakdown if not church admin
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
