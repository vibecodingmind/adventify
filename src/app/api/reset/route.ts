import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { execSync } from 'child_process';

// POST - Reset database (delete all data, re-push schema, re-seed)
export async function POST() {
  try {
    // Delete all data in correct order (respect foreign keys)
    await db.notification.deleteMany();
    await db.memberRequest.deleteMany();
    await db.auditLog.deleteMany();
    await db.certificate.deleteMany();
    await db.baptismRecord.deleteMany();
    await db.person.deleteMany();
    await db.user.deleteMany();
    await db.church.deleteMany();
    await db.conference.deleteMany();
    await db.union.deleteMany();
    await db.division.deleteMany();
    await db.batchJob.deleteMany();
    await db.certificateTemplate.deleteMany();
    await db.systemSetting.deleteMany();

    // Re-push schema to recreate enums with new values
    try {
      execSync('npx prisma db push --skip-generate --accept-data-loss 2>&1', { timeout: 30000 });
    } catch (pushError) {
      console.error('prisma db push warning:', pushError);
    }

    return NextResponse.json({
      success: true,
      message: 'Database reset successfully. You can now run /api/seed to populate with sample data.',
    });
  } catch (error) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}
