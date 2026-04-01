import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { NotificationStatus } from '@prisma/client';
import { z } from 'zod';

const updateSchema = z.object({
  status: z.enum(['READ', 'DELIVERED']).optional(),
});

// PATCH /api/notifications/[id] - Mark notification as read/delivered
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validatedData = updateSchema.parse(body);

    // Check that the notification belongs to the current user
    const notification = await db.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return NextResponse.json(
        { success: false, error: 'Notification not found' },
        { status: 404 }
      );
    }

    if (notification.userId !== session.userId) {
      return NextResponse.json(
        { success: false, error: 'You do not have access to this notification' },
        { status: 403 }
      );
    }

    const updateData: {
      status: NotificationStatus;
      deliveredAt?: Date;
    } = {
      status: NotificationStatus.DELIVERED,
      deliveredAt: new Date(),
    };

    const updatedNotification = await db.notification.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedNotification,
    });
  } catch (error) {
    console.error('Update notification error:', error);

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
