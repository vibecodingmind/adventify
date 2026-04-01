import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { Role } from '@prisma/client';

// POST - Revoke a certificate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(Role.CHURCH_PASTOR);
    const { id } = await params;
    const body = await request.json();
    const { reason } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Revocation reason is required (at least 5 characters)' },
        { status: 400 }
      );
    }

    // Fetch certificate with full hierarchy
    const certificate = await db.certificate.findUnique({
      where: { id },
      include: {
        baptismRecord: {
          include: {
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
            person: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { success: false, error: 'Certificate not found' },
        { status: 404 }
      );
    }

    if (certificate.isRevoked) {
      return NextResponse.json(
        { success: false, error: 'Certificate has already been revoked' },
        { status: 400 }
      );
    }

    // Check scope: user can only revoke certificates within their hierarchy
    const church = certificate.baptismRecord.church;
    const hasAccess =
      session.role === Role.GENERAL_CONFERENCE_ADMIN ||
      (session.role === Role.DIVISION_ADMIN && church.conference.union.divisionId === session.divisionId) ||
      (session.role === Role.UNION_ADMIN && church.conference.unionId === session.unionId) ||
      (session.role === Role.CONFERENCE_ADMIN && church.conferenceId === session.conferenceId) ||
      ((session.role === Role.CHURCH_PASTOR || session.role === Role.CHURCH_CLERK) && church.id === session.churchId);

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to revoke this certificate' },
        { status: 403 }
      );
    }

    // Revoke the certificate
    const revokedCertificate = await db.certificate.update({
      where: { id },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: session.userId,
        revocationReason: reason.trim(),
      },
      include: {
        baptismRecord: {
          include: {
            person: true,
            church: true,
          },
        },
      },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.userId,
        action: 'REVOKE_CERTIFICATE',
        entity: 'Certificate',
        entityId: id,
        details: JSON.stringify({
          bcn: certificate.bcn,
          reason: reason.trim(),
          personName: certificate.baptismRecord.person.fullName,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: revokedCertificate.id,
        bcn: revokedCertificate.bcn,
        isRevoked: revokedCertificate.isRevoked,
        revokedAt: revokedCertificate.revokedAt,
        revocationReason: revokedCertificate.revocationReason,
        revokedBy: session.userId,
        personName: revokedCertificate.baptismRecord.person.fullName,
        churchName: revokedCertificate.baptismRecord.church.name,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === 'Unauthorized' || error.message === 'Forbidden')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.message === 'Unauthorized' ? 401 : 403 }
      );
    }
    console.error('Revocation error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while revoking the certificate' },
      { status: 500 }
    );
  }
}
