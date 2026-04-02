import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createCertificate } from '@/lib/certificate';
import { Role, BaptismStatus, BatchJobStatus } from '@prisma/client';
import { z } from 'zod';

const batchCertificateSchema = z.object({
  baptismRecordIds: z.array(z.string().min(1)).optional(),
  churchId: z.string().min(1).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
}).refine(
  (data) => {
    // Either provide specific IDs or a range with churchId
    if (data.baptismRecordIds && data.baptismRecordIds.length > 0) return true;
    if (data.churchId && data.dateFrom && data.dateTo) return true;
    return false;
  },
  { message: 'Provide either baptismRecordIds or churchId with dateFrom and dateTo' }
);

// POST - Generate certificates for multiple approved baptism records
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions - Church Pastor or higher
    if (session.role === Role.MEMBER || session.role === Role.CHURCH_CLERK) {
      return NextResponse.json(
        { success: false, error: 'Only Church Pastors or higher can generate certificates' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = batchCertificateSchema.parse(body);

    // Determine which baptism records to process
    let targetRecordIds: string[] = [];

    if (validatedData.baptismRecordIds && validatedData.baptismRecordIds.length > 0) {
      targetRecordIds = validatedData.baptismRecordIds;
    } else if (validatedData.churchId && validatedData.dateFrom && validatedData.dateTo) {
      // Find approved records in date range for the church
      const records = await db.baptismRecord.findMany({
        where: {
          churchId: validatedData.churchId,
          status: BaptismStatus.APPROVED,
          baptismDate: {
            gte: new Date(validatedData.dateFrom),
            lte: new Date(validatedData.dateTo),
          },
          certificate: null, // No certificate yet
        },
        select: { id: true },
      });
      targetRecordIds = records.map((r) => r.id);
    }

    if (targetRecordIds.length === 0) {
      return NextResponse.json(
        { success: true, data: { message: 'No eligible records found for certificate generation' } }
      );
    }

    // Create batch job
    const batchJob = await db.batchJob.create({
      data: {
        type: 'certificate',
        status: BatchJobStatus.PROCESSING,
        totalItems: targetRecordIds.length,
        processedItems: 0,
        failedItems: 0,
        config: JSON.stringify({
          baptismRecordIds: targetRecordIds,
          churchId: validatedData.churchId,
          dateFrom: validatedData.dateFrom,
          dateTo: validatedData.dateTo,
        }),
        createdBy: session.userId,
        startedAt: new Date(),
      },
    });

    // Get base URL for verification
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Process each record
    const results: Array<{
      baptismRecordId: string;
      success: boolean;
      certificateId?: string;
      bcn?: string;
      error?: string;
    }> = [];

    let processedCount = 0;
    let failedCount = 0;

    for (const recordId of targetRecordIds) {
      try {
        const certificate = await createCertificate(recordId, baseUrl);
        processedCount++;
        results.push({
          baptismRecordId: recordId,
          success: true,
          certificateId: certificate.id,
          bcn: certificate.bcn,
        });
      } catch (error) {
        failedCount++;
        results.push({
          baptismRecordId: recordId,
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
      action: 'GENERATE',
      entity: 'Certificate',
      entityId: batchJob.id,
      details: {
        batch: true,
        totalRecords: targetRecordIds.length,
        successful: processedCount,
        failed: failedCount,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        batchJobId: batchJob.id,
        status: finalStatus,
        totalProcessed: targetRecordIds.length,
        successful: processedCount,
        failed: failedCount,
        results,
      },
    });
  } catch (error) {
    console.error('Batch certificates error:', error);

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
