import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createCertificate } from '@/lib/certificate';
import { sendCertificateEmail } from '@/lib/email';
import { notifyOnBaptismStatusChange } from '@/lib/notifications';
import { Role, BaptismStatus } from '@prisma/client';

// POST - Approve baptism record
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check permissions - Church Pastor, Conference Admin, or higher
    if (session.role === Role.MEMBER || session.role === Role.CHURCH_CLERK) {
      return NextResponse.json(
        { success: false, error: 'Only Church Pastors or higher can approve baptism records' },
        { status: 403 }
      );
    }
    
    // Get the baptism record with person email
    const baptismRecord = await db.baptismRecord.findUnique({
      where: { id },
      include: {
        person: { select: { id: true, pid: true, fullName: true, email: true } },
        church: {
          include: {
            conference: {
              include: {
                union: {
                  include: { division: true },
                },
              },
            },
          },
        },
      },
    });
    
    if (!baptismRecord) {
      return NextResponse.json(
        { success: false, error: 'Baptism record not found' },
        { status: 404 }
      );
    }
    
    if (baptismRecord.status !== BaptismStatus.PENDING) {
      return NextResponse.json(
        { success: false, error: 'Only pending records can be approved' },
        { status: 400 }
      );
    }
    
    // Verify user has access to this record
    if (session.role === Role.CHURCH_PASTOR) {
      if (baptismRecord.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only approve records for your church' },
          { status: 403 }
        );
      }
    } else if (session.role === Role.CONFERENCE_ADMIN) {
      if (baptismRecord.church.conferenceId !== session.conferenceId) {
        return NextResponse.json(
          { success: false, error: 'You can only approve records in your conference' },
          { status: 403 }
        );
      }
    } else if (session.role === Role.UNION_ADMIN) {
      if (baptismRecord.church.conference.unionId !== session.unionId) {
        return NextResponse.json(
          { success: false, error: 'You can only approve records in your union' },
          { status: 403 }
        );
      }
    } else if (session.role === Role.DIVISION_ADMIN) {
      if (baptismRecord.church.conference.union.divisionId !== session.divisionId) {
        return NextResponse.json(
          { success: false, error: 'You can only approve records in your division' },
          { status: 403 }
        );
      }
    }
    
    // Approve the record
    const updatedRecord = await db.baptismRecord.update({
      where: { id },
      data: {
        status: BaptismStatus.APPROVED,
        approvedBy: session.userId,
        approvedAt: new Date(),
      },
      include: {
        person: { select: { id: true, pid: true, fullName: true } },
        church: { select: { id: true, name: true } },
      },
    });

    // Auto-generate certificate on approval
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    let certificate = null;
    try {
      certificate = await createCertificate(id, baseUrl);
    } catch (certError) {
      console.error('Auto-generate certificate error:', certError);
    }

    // Send email notification after certificate generation (non-blocking)
    try {
      if (certificate && baptismRecord.person.email) {
        await sendCertificateEmail(
          baptismRecord.person.email,
          {
            personName: baptismRecord.person.fullName,
            bcn: certificate.bcn,
            churchName: baptismRecord.church.name,
            verificationUrl: certificate.verificationUrl,
            pdfBase64: certificate.pdfData || undefined,
          },
          session.userId
        );
      }
    } catch (emailError) {
      // Email failure should not break the approval flow
      console.error('Email notification error (non-blocking):', emailError);
    }

    // Send notification on status change (non-blocking)
    try {
      await notifyOnBaptismStatusChange(
        id,
        'APPROVED',
        updatedRecord.person.fullName,
        updatedRecord.church.name
      );
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError);
    }

    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'APPROVE',
      entity: 'BaptismRecord',
      entityId: id,
      details: {
        personName: updatedRecord.person.fullName,
        churchName: updatedRecord.church.name,
        certificateGenerated: !!certificate,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedRecord,
        certificate,
      },
    });
  } catch (error) {
    console.error('Approve baptism record error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
