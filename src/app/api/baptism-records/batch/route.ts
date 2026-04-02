import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role, BaptismStatus, BatchJobStatus } from '@prisma/client';
import { z } from 'zod';

const batchRecordSchema = z.object({
  personId: z.string().min(1, 'Person ID is required'),
  churchId: z.string().min(1, 'Church ID is required'),
  baptismDate: z.string().min(1, 'Baptism date is required'),
  pastorName: z.string().min(2, 'Pastor name is required'),
  pastorTitle: z.string().optional(),
  witnessName: z.string().optional(),
  notes: z.string().optional(),
});

const batchRequestSchema = z.object({
  records: z.array(batchRecordSchema).min(1, 'At least one record is required').max(100, 'Maximum 100 records per batch'),
});

// POST - Create multiple baptism records at once
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
        { success: false, error: 'Only Church Clerks or higher can create baptism records' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = batchRequestSchema.parse(body);

    // Validate: baptism dates must not be in the future
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    for (const record of validatedData.records) {
      const recordDate = new Date(record.baptismDate);
      if (recordDate > today) {
        return NextResponse.json(
          { success: false, error: `Baptism date cannot be in the future` },
          { status: 400 }
        );
      }
    }

    // Create batch job
    const batchJob = await db.batchJob.create({
      data: {
        type: 'baptism',
        status: BatchJobStatus.PROCESSING,
        totalItems: validatedData.records.length,
        processedItems: 0,
        failedItems: 0,
        config: JSON.stringify({ records: validatedData.records }),
        createdBy: session.userId,
        startedAt: new Date(),
      },
    });

    // Process each record
    const results: Array<{
      index: number;
      personId: string;
      success: boolean;
      baptismRecordId?: string;
      error?: string;
    }> = [];

    let processedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < validatedData.records.length; i++) {
      const record = validatedData.records[i];

      try {
        // Church-level users can only create records for their church
        const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR];
        if (churchLevelRoles.includes(session.role)) {
          if (record.churchId !== session.churchId) {
            throw new Error('You can only create baptism records for your church');
          }
        }

        // Verify person exists and doesn't already have a baptism record
        const person = await db.person.findUnique({
          where: { id: record.personId },
          include: { baptismRecord: true },
        });

        if (!person) {
          throw new Error('Person not found');
        }

        if (person.baptismRecord) {
          throw new Error('This person already has a baptism record');
        }

        // Validate: person must be old enough for baptism (minimum 12 years old)
        if (person.dateOfBirth) {
          const batchBaptismDate = new Date(record.baptismDate);
          const ageMs = batchBaptismDate.getTime() - person.dateOfBirth.getTime();
          const ageYears = ageMs / (365.25 * 24 * 60 * 60 * 1000);
          if (ageYears < 12) {
            throw new Error('Person must be at least 12 years old to be baptized');
          }
        }

        // Verify church exists
        const church = await db.church.findUnique({
          where: { id: record.churchId },
        });

        if (!church) {
          throw new Error('Church not found');
        }

        // Create baptism record
        const baptismRecord = await db.baptismRecord.create({
          data: {
            personId: record.personId,
            churchId: record.churchId,
            baptismDate: new Date(record.baptismDate),
            pastorName: record.pastorName,
            pastorTitle: record.pastorTitle || null,
            witnessName: record.witnessName || null,
            notes: record.notes || null,
            status: BaptismStatus.PENDING,
          },
        });

        processedCount++;
        results.push({
          index: i,
          personId: record.personId,
          success: true,
          baptismRecordId: baptismRecord.id,
        });
      } catch (error) {
        failedCount++;
        results.push({
          index: i,
          personId: record.personId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Update batch job progress
      await db.batchJob.update({
        where: { id: batchJob.id },
        data: {
          processedItems: processedCount + failedCount,
          failedItems: failedCount,
        },
      });
    }

    // Finalize batch job
    const finalStatus = failedCount === 0
      ? BatchJobStatus.COMPLETED
      : processedCount === 0
        ? BatchJobStatus.FAILED
        : BatchJobStatus.PARTIALLY_COMPLETED;

    await db.batchJob.update({
      where: { id: batchJob.id },
      data: {
        status: finalStatus,
        processedItems: processedCount,
        failedItems: failedCount,
        completedAt: new Date(),
        result: JSON.stringify(results),
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'BaptismRecord',
      entityId: batchJob.id,
      details: {
        batch: true,
        totalRecords: validatedData.records.length,
        successful: processedCount,
        failed: failedCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        batchJobId: batchJob.id,
        status: finalStatus,
        totalProcessed: validatedData.records.length,
        successful: processedCount,
        failed: failedCount,
        results,
      },
    });
  } catch (error) {
    console.error('Batch baptism records error:', error);

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
