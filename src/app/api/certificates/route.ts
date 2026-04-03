import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// GET /api/certificates — List certificates
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    // Filter by church if user has a church assignment
    if (session.churchId) {
      where.baptismRecord = {
        churchId: session.churchId,
      };
    }

    if (status === 'revoked') {
      where.isRevoked = true;
    } else if (status === 'active') {
      where.isRevoked = false;
    }

    const [certificates, total] = await Promise.all([
      db.certificate.findMany({
        where,
        include: {
          baptismRecord: {
            include: {
              person: true,
              church: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.certificate.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: certificates.map((cert) => ({
        id: cert.id,
        bcn: cert.bcn,
        recipientName: cert.baptismRecord?.person?.fullName || 'Unknown',
        baptismDate: cert.baptismRecord?.baptismDate,
        churchName: cert.baptismRecord?.church?.name || 'Unknown',
        status: cert.isRevoked ? 'revoked' : 'active',
        createdAt: cert.createdAt,
        verificationUrl: cert.verificationUrl,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Certificate list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch certificates' },
      { status: 500 }
    );
  }
}
