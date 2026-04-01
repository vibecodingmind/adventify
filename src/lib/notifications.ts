import { db } from './db';
import { NotificationType, NotificationStatus } from '@prisma/client';

interface SendSMSParams {
  phone: string;
  message: string;
  userId: string;
  sentById?: string;
}

interface SendWhatsAppParams {
  phone: string;
  message: string;
  userId: string;
  sentById?: string;
}

interface SendEmailParams {
  email: string;
  subject: string;
  body: string;
  userId: string;
  sentById?: string;
}

interface SendInAppParams {
  userId: string;
  title: string;
  message: string;
  sentById?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Send a simulated SMS notification.
 * Creates a Notification record in the database.
 */
export async function sendSMS(params: SendSMSParams) {
  const { phone, message, userId, sentById } = params;

  // Simulate SMS sending (in production, integrate with Twilio, Africa's Talking, etc.)
  console.log(`[SMS] To: ${phone}, Message: ${message}`);

  const notification = await db.notification.create({
    data: {
      userId,
      sentById: sentById || null,
      type: NotificationType.SMS,
      channel: 'sms',
      title: 'SMS Notification',
      message,
      recipient: phone,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      metadata: JSON.stringify({ phone, method: 'sms' }),
    },
  });

  return notification;
}

/**
 * Send a simulated WhatsApp notification.
 * Creates a Notification record in the database.
 */
export async function sendWhatsApp(params: SendWhatsAppParams) {
  const { phone, message, userId, sentById } = params;

  // Simulate WhatsApp sending (in production, integrate with WhatsApp Business API)
  console.log(`[WhatsApp] To: ${phone}, Message: ${message}`);

  const notification = await db.notification.create({
    data: {
      userId,
      sentById: sentById || null,
      type: NotificationType.WHATSAPP,
      channel: 'whatsapp',
      title: 'WhatsApp Notification',
      message,
      recipient: phone,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      metadata: JSON.stringify({ phone, method: 'whatsapp' }),
    },
  });

  return notification;
}

/**
 * Send a simulated email notification.
 * Creates a Notification record in the database.
 */
export async function sendEmailNotification(params: SendEmailParams) {
  const { email, subject, body, userId, sentById } = params;

  // Simulate email sending (in production, integrate with SendGrid, Mailgun, etc.)
  console.log(`[Email] To: ${email}, Subject: ${subject}, Body: ${body}`);

  const notification = await db.notification.create({
    data: {
      userId,
      sentById: sentById || null,
      type: NotificationType.EMAIL,
      channel: 'email',
      title: subject,
      message: body,
      recipient: email,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      metadata: JSON.stringify({ email, subject, method: 'email' }),
    },
  });

  return notification;
}

/**
 * Send an in-app notification.
 * Creates a Notification record in the database.
 */
export async function sendInAppNotification(params: SendInAppParams) {
  const { userId, title, message, sentById, metadata } = params;

  const notification = await db.notification.create({
    data: {
      userId,
      sentById: sentById || null,
      type: NotificationType.IN_APP,
      channel: 'in_app',
      title,
      message,
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  return notification;
}

/**
 * Orchestrate notifications when a baptism record status changes.
 * Sends in-app notification and optionally SMS/WhatsApp/Email to the person.
 */
export async function notifyOnBaptismStatusChange(
  recordId: string,
  status: string,
  personName: string,
  churchName: string
) {
  try {
    // Get the baptism record with person and church details
    const record = await db.baptismRecord.findUnique({
      where: { id: recordId },
      include: {
        person: true,
        church: true,
      },
    });

    if (!record) {
      console.error(`[Notification] Baptism record ${recordId} not found`);
      return null;
    }

    // Find user(s) associated with this person
    const user = record.personId
      ? await db.user.findFirst({
          where: { personId: record.personId },
        })
      : null;

    const isApproved = status === 'APPROVED';
    const statusLabel = isApproved ? 'approved' : 'rejected';

    const title = isApproved
      ? 'Baptism Record Approved'
      : 'Baptism Record Rejected';

    const message = isApproved
      ? `Your baptism record for ${personName} at ${churchName} has been approved. A certificate will be generated shortly.`
      : `Your baptism record for ${personName} at ${churchName} has been rejected.`;

    const notifications = [];

    // Always send an in-app notification if user exists
    if (user) {
      const inAppNotification = await sendInAppNotification({
        userId: user.id,
        title,
        message,
        metadata: {
          baptismRecordId: recordId,
          status,
          personName,
          churchName,
        },
      });
      notifications.push(inAppNotification);

      // Send email if user has email
      if (user.email) {
        try {
          const emailNotification = await sendEmailNotification({
            email: user.email,
            subject: `Adventify: Baptism Record ${statusLabel}`,
            body: `Dear ${personName},\n\n${message}\n\nBaptism Date: ${new Date(record.baptismDate).toLocaleDateString()}\nChurch: ${churchName}\n\nGod bless,\nAdventify Team`,
            userId: user.id,
          });
          notifications.push(emailNotification);
        } catch (error) {
          console.error(`[Notification] Failed to send email to ${user.email}:`, error);
        }
      }

      // Send SMS if person/user has phone
      const phone = user.phone || record.person.phone;
      if (phone) {
        try {
          const smsNotification = await sendSMS({
            phone,
            message: `Adventify: Your baptism record has been ${statusLabel}. ${isApproved ? 'Congratulations!' : 'Please contact your church for details.'}`,
            userId: user.id,
          });
          notifications.push(smsNotification);
        } catch (error) {
          console.error(`[Notification] Failed to send SMS to ${phone}:`, error);
        }
      }
    }

    // Also notify church clerk(s) and pastor(s) of the same church
    const churchUsers = await db.user.findMany({
      where: {
        churchId: record.churchId,
        role: { in: ['CHURCH_PASTOR', 'CHURCH_CLERK'] },
        isActive: true,
      },
    });

    for (const churchUser of churchUsers) {
      // Skip if this is the same user who owns the record
      if (user && churchUser.id === user.id) continue;

      try {
        const clerkNotification = await sendInAppNotification({
          userId: churchUser.id,
          title: `Baptism Record ${statusLabel}: ${personName}`,
          message: `A baptism record for ${personName} at ${churchName} has been ${statusLabel}.`,
          metadata: {
            baptismRecordId: recordId,
            status,
            personName,
            churchName,
          },
        });
        notifications.push(clerkNotification);
      } catch (error) {
        console.error(`[Notification] Failed to notify church user ${churchUser.id}:`, error);
      }
    }

    console.log(
      `[Notification] Sent ${notifications.length} notification(s) for baptism record ${recordId} status change to ${status}`
    );

    return {
      success: true,
      notificationsCount: notifications.length,
      notifications,
    };
  } catch (error) {
    console.error('[Notification] Error in notifyOnBaptismStatusChange:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
