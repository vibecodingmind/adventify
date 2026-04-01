import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendCertificateEmail } from '@/lib/email';
import { Role, NotificationType } from '@prisma/client';
import { z } from 'zod';

const sendEmailSchema = z.object({
  certificateId: z.string().min(1, 'Certificate ID is required'),
  recipientEmail: z.string().email().optional(),
});

// POST - Send certificate email
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions - Church Clerk or higher
    if (session.role === Role.MEMBER) {
      return NextResponse.json(
        { success: false, error: 'Only Church Clerks or higher can send emails' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = sendEmailSchema.parse(body);

    // Get the certificate with baptism record and person
    const certificate = await db.certificate.findUnique({
      where: { id: validatedData.certificateId },
      include: {
        baptismRecord: {
          include: {
            person: true,
            church: true,
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

    // Determine recipient email
    const recipientEmail = validatedData.recipientEmail || certificate.baptismRecord.person.email;

    if (!recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'No email address available for this person' },
        { status: 400 }
      );
    }

    // Send the email
    const result = await sendCertificateEmail(
      recipientEmail,
      {
        personName: certificate.baptismRecord.person.fullName,
        bcn: certificate.bcn,
        churchName: certificate.baptismRecord.church.name,
        verificationUrl: certificate.verificationUrl,
        pdfBase64: certificate.pdfData || undefined,
      },
      session.userId
    );

    if (result.success) {
      // Update certificate emailedAt
      await db.certificate.update({
        where: { id: certificate.id },
        data: { emailedAt: new Date() },
      });
    }

    return NextResponse.json({
      success: result.success,
      data: { messageId: result.messageId },
      error: result.error,
    });
  } catch (error) {
    console.error('Send email error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// GET - Get email logs/notifications of type EMAIL
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: {
      type: NotificationType;
      status?: string;
    } = { type: NotificationType.EMAIL };

    if (status && ['PENDING', 'SENT', 'DELIVERED', 'FAILED'].includes(status)) {
      where.status = status;
    }

    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true },
          },
          sentBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      db.notification.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get email logs error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
