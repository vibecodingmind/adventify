import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { Role, NotificationType } from '@prisma/client';
import { hasHigherOrEqualRole } from '@/types';
import {
  sendSMS,
  sendWhatsApp,
  sendEmailNotification,
  sendInAppNotification,
} from '@/lib/notifications';
import { z } from 'zod';

const sendSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'IN_APP']),
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  recipient: z.string().optional(),
  subject: z.string().optional(),
});

// POST /api/notifications/send - Send a manual notification
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only CHURCH_CLERK and above can send notifications
    if (!hasHigherOrEqualRole(session.role, Role.CHURCH_CLERK)) {
      return NextResponse.json(
        { success: false, error: 'Only Church Clerks and above can send notifications' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = sendSchema.parse(body);

    const { userId, type, title, message, recipient, subject } = validatedData;

    let notification;

    switch (type) {
      case 'SMS':
        if (!recipient) {
          return NextResponse.json(
            { success: false, error: 'Phone number (recipient) is required for SMS' },
            { status: 400 }
          );
        }
        notification = await sendSMS({
          phone: recipient,
          message,
          userId,
          sentById: session.userId,
        });
        break;

      case 'WHATSAPP':
        if (!recipient) {
          return NextResponse.json(
            { success: false, error: 'Phone number (recipient) is required for WhatsApp' },
            { status: 400 }
          );
        }
        notification = await sendWhatsApp({
          phone: recipient,
          message,
          userId,
          sentById: session.userId,
        });
        break;

      case 'EMAIL':
        if (!recipient) {
          return NextResponse.json(
            { success: false, error: 'Email address (recipient) is required for Email' },
            { status: 400 }
          );
        }
        notification = await sendEmailNotification({
          email: recipient,
          subject: subject || title,
          body: message,
          userId,
          sentById: session.userId,
        });
        break;

      case 'IN_APP':
        notification = await sendInAppNotification({
          userId,
          title,
          message,
          sentById: session.userId,
        });
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: notification,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Send notification error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
