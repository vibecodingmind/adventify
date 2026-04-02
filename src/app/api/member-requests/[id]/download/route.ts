import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/types';
import { Role } from '@prisma/client';

// GET - Download generated PDF
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    // Conference+ roles cannot access member requests
    if (
      session.role === Role.GENERAL_CONFERENCE_ADMIN ||
      session.role === Role.DIVISION_ADMIN ||
      session.role === Role.UNION_ADMIN ||
      session.role === Role.CONFERENCE_ADMIN
    ) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Find request with pdfData
    const memberRequest = await db.memberRequest.findUnique({
      where: { id },
      include: {
        member: { select: { id: true, fullName: true } },
        person: { select: { id: true, fullName: true } },
        church: { select: { id: true, name: true } },
      },
    });

    if (!memberRequest) {
      return NextResponse.json(
        { success: false, error: 'Request not found' },
        { status: 404 }
      );
    }

    if (!memberRequest.pdfData) {
      return NextResponse.json(
        { success: false, error: 'Document has not been generated yet' },
        { status: 400 }
      );
    }

    // Role-based access check
    if (session.role === Role.MEMBER) {
      // Members can only download their own documents
      if (memberRequest.memberId !== session.userId) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }
    } else {
      // CLERK/PASTOR: any from their church
      if (memberRequest.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only download documents from your church' },
          { status: 403 }
        );
      }
    }

    // Parse pdfData: data URI or raw base64
    let base64Data = memberRequest.pdfData;
    if (base64Data.startsWith('data:application/pdf')) {
      // Extract base64 after the comma
      const commaIndex = base64Data.indexOf(',');
      base64Data = base64Data.substring(commaIndex + 1);
    }

    // Convert base64 to Buffer
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // Build filename
    const docTypeLabel = DOCUMENT_TYPE_LABELS[memberRequest.documentType as DocumentType] || 'Document';
    const personName = memberRequest.person?.fullName || memberRequest.member?.fullName || 'Unknown';
    const safeName = personName.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${docTypeLabel.replace(/\s+/g, '_')}_${safeName}_${memberRequest.requestId}.pdf`;

    // Audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DOWNLOAD',
      entity: 'MemberRequest',
      entityId: id,
      details: {
        requestId: memberRequest.requestId,
        documentType: memberRequest.documentType,
        personName,
      },
    });

    // Return PDF
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'An error occurred';

    if (message === 'Unauthorized') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.error('Download member request PDF error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
