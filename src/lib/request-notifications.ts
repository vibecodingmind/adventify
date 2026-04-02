import { sendInAppNotification } from './notifications';
import { db } from './db';

async function notifyOnRequestCreated(requestId: string, personName: string, churchId: string, clerkId: string) {
  try {
    // Notify pastor(s) of the church
    const pastors = await db.user.findMany({
      where: { churchId, role: 'CHURCH_PASTOR', isActive: true },
    });
    for (const pastor of pastors) {
      await sendInAppNotification({
        userId: pastor.id,
        title: 'New Document Request',
        message: `A new document request has been submitted for ${personName}. Please review and approve.`,
        sentById: clerkId,
        metadata: { requestId, personName },
      });
    }
    console.log(`[RequestNotification] Notified ${pastors.length} pastor(s) of new request ${requestId}`);
  } catch (error) {
    console.error('[RequestNotification] Error notifying on request created:', error);
  }
}

async function notifyOnRequestEdited(requestId: string, personName: string, churchId: string, clerkId: string) {
  try {
    const pastors = await db.user.findMany({
      where: { churchId, role: 'CHURCH_PASTOR', isActive: true },
    });
    for (const pastor of pastors) {
      await sendInAppNotification({
        userId: pastor.id,
        title: 'Document Request Updated',
        message: `The document request for ${personName} has been updated by the clerk. Please review.`,
        sentById: clerkId,
        metadata: { requestId, personName },
      });
    }
  } catch (error) {
    console.error('[RequestNotification] Error notifying on request edited:', error);
  }
}

async function notifyOnRequestApproved(requestId: string, personName: string, memberId: string) {
  try {
    await sendInAppNotification({
      userId: memberId,
      title: 'Document Request Approved',
      message: `Your document request for ${personName} has been approved and is being generated.`,
      metadata: { requestId, personName },
    });
  } catch (error) {
    console.error('[RequestNotification] Error notifying on request approved:', error);
  }
}

async function notifyOnRequestRejected(requestId: string, personName: string, memberId: string, reason: string) {
  try {
    await sendInAppNotification({
      userId: memberId,
      title: 'Document Request Rejected',
      message: `Your document request for ${personName} has been rejected. Reason: ${reason}`,
      metadata: { requestId, personName, reason },
    });
  } catch (error) {
    console.error('[RequestNotification] Error notifying on request rejected:', error);
  }
}

async function notifyOnDocumentGenerated(requestId: string, personName: string, memberId: string) {
  try {
    await sendInAppNotification({
      userId: memberId,
      title: 'Document Ready for Download',
      message: `Your document for ${personName} has been generated and is ready for download.`,
      metadata: { requestId, personName },
    });
  } catch (error) {
    console.error('[RequestNotification] Error notifying on document generated:', error);
  }
}

export {
  notifyOnRequestCreated,
  notifyOnRequestEdited,
  notifyOnRequestApproved,
  notifyOnRequestRejected,
  notifyOnDocumentGenerated,
};
