import nodemailer from 'nodemailer';
import { db } from './db';
import { NotificationType, NotificationStatus } from '@prisma/client';

// Email configuration - reads from SystemSetting table or uses defaults
export async function emailConfig() {
  const settings = await db.systemSetting.findMany({
    where: {
      key: {
        in: ['email_host', 'email_port', 'email_user', 'email_pass', 'email_from', 'email_enabled'],
      },
    },
  });

  const getSetting = (key: string, defaultValue: string) => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value || defaultValue;
  };

  return {
    host: getSetting('email_host', 'smtp.ethereal.email'),
    port: parseInt(getSetting('email_port', '587'), 10),
    user: getSetting('email_user', ''),
    pass: getSetting('email_pass', ''),
    from: getSetting('email_from', 'noreply@adventify.org'),
    enabled: getSetting('email_enabled', 'false') === 'true',
  };
}

// Log email to Notification table (simulate sending)
async function logNotification(data: {
  recipient: string;
  title: string;
  message: string;
  channel: string;
  sentById?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const notification = await db.notification.create({
    data: {
      userId: data.userId || '',
      sentById: data.sentById,
      type: NotificationType.EMAIL,
      channel: data.channel,
      title: data.title,
      message: data.message,
      status: NotificationStatus.PENDING,
      recipient: data.recipient,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    },
  });

  // Simulate sending by marking as sent after a short delay
  await db.notification.update({
    where: { id: notification.id },
    data: {
      status: NotificationStatus.SENT,
      sentAt: new Date(),
    },
  });

  return notification.id;
}

// Send certificate email
export async function sendCertificateEmail(
  to: string,
  data: {
    personName: string;
    bcn: string;
    churchName: string;
    verificationUrl: string;
    pdfBase64?: string;
  },
  sentById?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const config = await emailConfig();
    const title = `Your Baptism Certificate - ${data.bcn}`;
    const message = `Dear ${data.personName},

Congratulations on your baptism! Your certificate has been generated.

Certificate Number: ${data.bcn}
Church: ${data.churchName}

You can verify your certificate online at:
${data.verificationUrl}

If you have any questions, please contact your church office.

God bless,
${data.churchName}
Adventify Platform`;

    const messageId = await logNotification({
      recipient: to,
      title,
      message,
      channel: 'email',
      sentById,
      metadata: {
        type: 'certificate_email',
        bcn: data.bcn,
        personName: data.personName,
        churchName: data.churchName,
        verificationUrl: data.verificationUrl,
        hasPdfAttachment: !!data.pdfBase64,
      },
    });

    // If real email is configured, also try to send via nodemailer
    if (config.enabled && config.user && config.pass) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.host,
          port: config.port,
          secure: config.port === 465,
          auth: {
            user: config.user,
            pass: config.pass,
          },
        });

        const mailOptions: nodemailer.SendMailOptions = {
          from: config.from,
          to,
          subject: title,
          text: message,
        };

        // Add PDF attachment if provided
        if (data.pdfBase64) {
          mailOptions.attachments = [
            {
              filename: `baptism-certificate-${data.bcn}.pdf`,
              content: data.pdfBase64,
              encoding: 'base64',
            },
          ];
        }

        await transporter.sendMail(mailOptions);

        await db.notification.update({
          where: { id: messageId },
          data: { status: NotificationStatus.DELIVERED, deliveredAt: new Date() },
        });
      } catch (smtpError) {
        console.error('SMTP send error (email logged):', smtpError);
        // Don't fail - we've logged the notification
      }
    }

    return { success: true, messageId };
  } catch (error) {
    console.error('sendCertificateEmail error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// Send baptism status email
export async function sendBaptismStatusEmail(
  to: string,
  data: {
    personName: string;
    status: string;
    churchName: string;
    rejectionReason?: string;
  },
  sentById?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const statusMessages: Record<string, { title: string; body: string }> = {
      APPROVED: {
        title: `Baptism Record Approved - ${data.personName}`,
        body: `Dear ${data.personName},

Great news! Your baptism record has been approved by ${data.churchName}.

Your certificate will be generated and sent to you shortly.

If you have any questions, please contact your church office.

God bless,
${data.churchName}
Adventify Platform`,
      },
      REJECTED: {
        title: `Baptism Record Update - ${data.personName}`,
        body: `Dear ${data.personName},

Your baptism record has been reviewed by ${data.churchName}.

Status: Rejected
${data.rejectionReason ? `Reason: ${data.rejectionReason}` : 'Please contact your church office for more information.'}

If you have any questions, please contact your church office.

God bless,
${data.churchName}
Adventify Platform`,
      },
      PENDING: {
        title: `Baptism Record Submitted - ${data.personName}`,
        body: `Dear ${data.personName},

Your baptism record has been submitted to ${data.churchName} and is pending review.

You will be notified once it has been reviewed.

If you have any questions, please contact your church office.

God bless,
${data.churchName}
Adventify Platform`,
      },
    };

    const statusInfo = statusMessages[data.status] || statusMessages.PENDING;

    const messageId = await logNotification({
      recipient: to,
      title: statusInfo.title,
      message: statusInfo.body,
      channel: 'email',
      sentById,
      metadata: {
        type: 'status_email',
        personName: data.personName,
        status: data.status,
        churchName: data.churchName,
        rejectionReason: data.rejectionReason,
      },
    });

    return { success: true, messageId };
  } catch (error) {
    console.error('sendBaptismStatusEmail error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}

// Send batch completion email
export async function sendBatchCompletionEmail(
  to: string,
  data: {
    totalProcessed: number;
    successful: number;
    failed: number;
    reportUrl?: string;
  },
  sentById?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const title = 'Batch Operation Completed - Adventify';
    const message = `Hello,

A batch operation has been completed on the Adventify platform.

Results:
- Total Items: ${data.totalProcessed}
- Successful: ${data.successful}
- Failed: ${data.failed}
${data.reportUrl ? `\nYou can view the full report at:\n${data.reportUrl}` : ''}

If you have any questions, please contact the system administrator.

Adventify Platform`;

    const messageId = await logNotification({
      recipient: to,
      title,
      message,
      channel: 'email',
      sentById,
      metadata: {
        type: 'batch_completion_email',
        totalProcessed: data.totalProcessed,
        successful: data.successful,
        failed: data.failed,
        reportUrl: data.reportUrl,
      },
    });

    return { success: true, messageId };
  } catch (error) {
    console.error('sendBatchCompletionEmail error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
