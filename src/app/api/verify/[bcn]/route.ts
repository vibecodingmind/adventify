import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Public verification endpoint with revocation status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bcn: string }> }
) {
  try {
    const { bcn } = await params;
    
    if (!bcn) {
      return NextResponse.json(
        { verified: false, error: 'Certificate number is required' },
        { status: 400 }
      );
    }
    
    const certificate = await db.certificate.findUnique({
      where: { bcn: bcn.toUpperCase() },
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
        template: true,
      },
    });
    
    if (!certificate) {
      return NextResponse.json({
        verified: false,
        error: 'Certificate not found or invalid',
      });
    }
    
    const baptism = certificate.baptismRecord;
    const church = baptism.church;
    
    let location = church.city || '';
    if (church.country) {
      location += location ? `, ${church.country}` : church.country;
    }

    // Get revoker name if revoked
    let revokedByName: string | null = null;
    if (certificate.revokedBy) {
      const revoker = await db.user.findUnique({
        where: { id: certificate.revokedBy },
        select: { fullName: true },
      });
      revokedByName = revoker?.fullName || null;
    }
    
    return NextResponse.json({
      verified: true,
      data: {
        bcn: certificate.bcn,
        personName: baptism.person.fullName,
        baptismDate: baptism.baptismDate.toISOString(),
        churchName: church.name,
        churchLocation: location,
        pastorName: baptism.pastorName,
        status: baptism.status,
        certificateDate: certificate.certificateDate.toISOString(),
        issueDate: certificate.createdAt.toISOString(),
        // Revocation status (backward compatible additions)
        isRevoked: certificate.isRevoked,
        revokedAt: certificate.revokedAt?.toISOString() || null,
        revocationReason: certificate.revocationReason || null,
        revokedByName,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { verified: false, error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
