import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';

// Levenshtein distance calculation (inline implementation)
function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  const matrix: number[][] = Array.from({ length: an + 1 }, () =>
    new Array(bn + 1).fill(0)
  );

  for (let i = 0; i <= an; i++) matrix[i][0] = i;
  for (let j = 0; j <= bn; j++) matrix[0][j] = j;

  for (let i = 1; i <= an; i++) {
    for (let j = 1; j <= bn; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[an][bn];
}

function normalizeString(str: string): string {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

// POST - Check for potential duplicate persons
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(Role.CHURCH_CLERK);
    const body = await request.json();
    const { fullName, email, phone, dateOfBirth, churchId } = body;

    if (!fullName || typeof fullName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'fullName is required' },
        { status: 400 }
      );
    }

    // Build query - search for potential matches
    const where: Record<string, unknown> = {};

    // Scope filter based on user role
    if (session.role === Role.GENERAL_CONFERENCE_ADMIN) {
      // Access to all
    } else if (session.role === Role.DIVISION_ADMIN) {
      where.church = {
        conference: {
          union: {
            divisionId: session.divisionId,
          },
        },
      };
    } else if (session.role === Role.UNION_ADMIN) {
      where.church = {
        conference: {
          unionId: session.unionId,
        },
      };
    } else if (session.role === Role.CONFERENCE_ADMIN) {
      where.church = {
        conferenceId: session.conferenceId,
      };
    } else {
      // CHURCH_CLERK or CHURCH_PASTOR
      where.churchId = session.churchId;
    }

    // Fetch persons within scope
    const persons = await db.person.findMany({
      where,
      select: {
        id: true,
        pid: true,
        fullName: true,
        email: true,
        phone: true,
        dateOfBirth: true,
        churchId: true,
      },
      take: 500, // Limit for performance
    });

    const normalizedName = normalizeString(fullName);
    const potentialMatches: Array<{
      id: string;
      pid: string;
      fullName: string;
      matchScore: number;
      matchReasons: string[];
    }> = [];

    for (const person of persons) {
      let score = 0;
      const reasons: string[] = [];

      // Name matching using Levenshtein distance
      const normalizedPersonName = normalizeString(person.fullName);
      const nameDistance = levenshteinDistance(normalizedName, normalizedPersonName);

      // Calculate name similarity score (0-100)
      const maxLen = Math.max(normalizedName.length, normalizedPersonName.length);
      const nameSimilarity = maxLen > 0 ? ((maxLen - nameDistance) / maxLen) * 100 : 0;

      if (nameDistance <= 2) {
        score += 50;
        reasons.push(`Similar name (Levenshtein distance: ${nameDistance})`);
      } else if (nameSimilarity >= 80) {
        score += 30;
        reasons.push(`Similar name (${nameSimilarity.toFixed(0)}% match)`);
      }

      // Exact email match
      if (email && person.email && normalizeString(email) === normalizeString(person.email)) {
        score += 30;
        reasons.push('Same email address');
      }

      // Exact phone match
      if (phone && person.phone) {
        const normalizedPhone1 = phone.replace(/[\s\-\(\)\+]/g, '');
        const normalizedPhone2 = person.phone.replace(/[\s\-\(\)\+]/g, '');
        if (normalizedPhone1 === normalizedPhone2 && normalizedPhone1.length > 0) {
          score += 30;
          reasons.push('Same phone number');
        }
      }

      // Similar date of birth (within 1 day)
      if (dateOfBirth && person.dateOfBirth) {
        const dob1 = new Date(dateOfBirth);
        const dob2 = new Date(person.dateOfBirth);
        const diffDays = Math.abs(Math.round((dob1.getTime() - dob2.getTime()) / (1000 * 60 * 60 * 24)));

        if (diffDays === 0) {
          score += 25;
          reasons.push('Same date of birth');
        } else if (diffDays <= 1) {
          score += 15;
          reasons.push(`Similar date of birth (${diffDays} day difference)`);
        }
      }

      // Same church
      if (churchId && person.churchId === churchId) {
        score += 10;
        reasons.push('Same church');
      }

      // Only include if there's a meaningful match (score >= 30)
      if (score >= 30) {
        potentialMatches.push({
          id: person.id,
          pid: person.pid,
          fullName: person.fullName,
          matchScore: Math.min(score, 100),
          matchReasons: reasons,
        });
      }
    }

    // Sort by match score descending
    potentialMatches.sort((a, b) => b.matchScore - a.matchScore);

    // Limit to top 10 matches
    const topMatches = potentialMatches.slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        isDuplicate: topMatches.length > 0,
        potentialMatches: topMatches,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Duplicate detection error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check for duplicates' },
      { status: 500 }
    );
  }
}
