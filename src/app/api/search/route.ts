import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { Prisma } from '@prisma/client';

// GET - Unified smart search
export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (!query || query.trim().length < 1) {
      return NextResponse.json({
        success: true,
        data: { persons: [], baptismRecords: [], certificates: [] },
      });
    }

    const search = query.trim();
    const persons: unknown[] = [];
    const baptismRecords: unknown[] = [];
    const certificates: unknown[] = [];

    // Build role-based scope filter
    const role = session.role;
    const personWhere: Record<string, unknown> = {};
    const baptismWhere: Record<string, unknown> = {};
    const certWhere: Record<string, unknown> = {};

    if (role === 'CHURCH_CLERK' || role === 'CHURCH_PASTOR') {
      personWhere.churchId = session.churchId;
      baptismWhere.churchId = session.churchId;
      certWhere.baptismRecord = { churchId: session.churchId };
    } else if (role === 'CONFERENCE_ADMIN') {
      personWhere.church = { conferenceId: session.conferenceId };
      baptismWhere.churchId = session.conferenceId;
      certWhere.baptismRecord = { church: { conferenceId: session.conferenceId } };
    } else if (role === 'UNION_ADMIN') {
      personWhere.church = { conference: { unionId: session.unionId } };
      baptismWhere.church = { conference: { unionId: session.unionId } };
      certWhere.baptismRecord = { church: { conference: { unionId: session.unionId } } };
    } else if (role === 'DIVISION_ADMIN') {
      personWhere.church = { conference: { union: { divisionId: session.divisionId } } };
      baptismWhere.church = { conference: { union: { divisionId: session.divisionId } } };
      certWhere.baptismRecord = { church: { conference: { union: { divisionId: session.divisionId } } } };
    }

    const searchCondition = {
      OR: [
        { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { pid: { contains: search, mode: Prisma.QueryMode.insensitive } },
        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
      ],
    };

    // Search persons
    if (type === 'all' || type === 'person') {
      const personResults = await db.person.findMany({
        where: {
          ...personWhere,
          ...searchCondition,
        },
        select: {
          id: true,
          pid: true,
          fullName: true,
          email: true,
          gender: true,
          city: true,
          country: true,
          church: { select: { id: true, name: true } },
          baptismRecord: {
            select: {
              id: true,
              baptismDate: true,
              status: true,
            },
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { fullName: 'asc' },
      });

      personResults.forEach((p) => {
        persons.push({
          ...p,
          _type: 'person',
          _relevance: calculateRelevance(search, [p.fullName, p.pid, p.email || '']),
        });
      });
    }

    // Search baptism records
    if (type === 'all' || type === 'baptism') {
      const baptismResults = await db.baptismRecord.findMany({
        where: {
          ...baptismWhere,
          OR: [
            { pastorName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { baptismLocation: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { person: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ],
        },
        select: {
          id: true,
          baptismDate: true,
          pastorName: true,
          status: true,
          church: { select: { id: true, name: true } },
          person: { select: { id: true, pid: true, fullName: true } },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { baptismDate: 'desc' },
      });

      baptismResults.forEach((b) => {
        baptismRecords.push({
          ...b,
          _type: 'baptism',
          _relevance: calculateRelevance(search, [
            b.pastorName,
            b.person.fullName,
            b.baptismLocation || '',
          ]),
        });
      });
    }

    // Search certificates
    if (type === 'all' || type === 'certificate') {
      const certResults = await db.certificate.findMany({
        where: {
          ...certWhere,
          OR: [
            { bcn: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { baptismRecord: { person: { fullName: { contains: search, mode: Prisma.QueryMode.insensitive } } } },
          ],
        },
        select: {
          id: true,
          bcn: true,
          certificateDate: true,
          isRevoked: true,
          baptismRecord: {
            select: {
              id: true,
              baptismDate: true,
              person: { select: { id: true, pid: true, fullName: true } },
              church: { select: { id: true, name: true } },
            },
          },
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { certificateDate: 'desc' },
      });

      certResults.forEach((c) => {
        certificates.push({
          ...c,
          _type: 'certificate',
          _relevance: calculateRelevance(search, [
            c.bcn,
            c.baptismRecord.person.fullName,
          ]),
        });
      });
    }

    // Sort each group by relevance
    persons.sort((a: { _relevance: number }, b: { _relevance: number }) => b._relevance - a._relevance);
    baptismRecords.sort((a: { _relevance: number }, b: { _relevance: number }) => b._relevance - a._relevance);
    certificates.sort((a: { _relevance: number }, b: { _relevance: number }) => b._relevance - a._relevance);

    return NextResponse.json({
      success: true,
      data: {
        persons,
        baptismRecords,
        certificates,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Smart search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}

// Simple relevance scoring
function calculateRelevance(query: string, fields: string[]): number {
  const lowerQuery = query.toLowerCase();
  let score = 0;

  for (const field of fields) {
    if (!field) continue;
    const lowerField = field.toLowerCase();

    // Exact match
    if (lowerField === lowerQuery) {
      score += 100;
    }
    // Starts with query
    else if (lowerField.startsWith(lowerQuery)) {
      score += 75;
    }
    // Contains query
    else if (lowerField.includes(lowerQuery)) {
      score += 50;
    }
    // Each word match
    else {
      const words = lowerQuery.split(/\s+/);
      for (const word of words) {
        if (word.length > 0 && lowerField.includes(word)) {
          score += 25;
        }
      }
    }
  }

  return Math.min(score, 100);
}
