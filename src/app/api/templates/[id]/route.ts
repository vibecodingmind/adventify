import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

// GET - Get single template
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = await db.certificateTemplate.findUnique({
      where: { id },
      include: {
        church: {
          select: { id: true, name: true },
        },
      },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Parse config from JSON string
    const parsedConfig = JSON.parse(template.config);

    return NextResponse.json({
      success: true,
      data: {
        ...template,
        config: parsedConfig,
      },
    });
  } catch (error) {
    console.error('Get template error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// PATCH - Update template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const template = await db.certificateTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { isDefault } = body;

    // Church Pastors cannot update templates at all
    if (session.role === Role.CHURCH_PASTOR) {
      return NextResponse.json(
        { success: false, error: 'Pastors cannot modify templates' },
        { status: 403 }
      );
    }

    // Church Clerks can ONLY set isDefault for their church's templates
    if (session.role === Role.CHURCH_CLERK) {
      // Clerk can only set/unset default on church-level templates
      if (!template.churchId || template.churchId !== session.churchId) {
        return NextResponse.json(
          { success: false, error: 'You can only select the default template for your church' },
          { status: 403 }
        );
      }
      // Clerk can only change isDefault, nothing else
      if (isDefault === undefined) {
        return NextResponse.json(
          { success: false, error: 'Church clerks can only select which template is active' },
          { status: 403 }
        );
      }
      // Clerk cannot unset the default (must select another instead)
      if (!isDefault) {
        return NextResponse.json(
          { success: false, error: 'Select another template as default instead of unsetting' },
          { status: 400 }
        );
      }
    }

    // System templates can only be updated by Conference Admin+
    if (template.isSystem && session.role !== Role.CHURCH_CLERK) {
      if (
        session.role !== Role.GENERAL_CONFERENCE_ADMIN &&
        session.role !== Role.DIVISION_ADMIN &&
        session.role !== Role.UNION_ADMIN &&
        session.role !== Role.CONFERENCE_ADMIN
      ) {
        return NextResponse.json(
          { success: false, error: 'Only system administrators can update templates' },
          { status: 403 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    if (session.role === Role.CHURCH_CLERK) {
      // Clerk can only set isDefault
      updateData.isDefault = true;
    } else {
      // System admins can update all fields
      const { name, description, config, previewData } = body;
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (config !== undefined) updateData.config = typeof config === 'string' ? config : JSON.stringify(config);
      if (previewData !== undefined) updateData.previewData = previewData;
      if (isDefault !== undefined) {
        updateData.isDefault = isDefault;
      }
    }

    if (isDefault) {
      if (template.isSystem) {
        await db.certificateTemplate.updateMany({
          where: { isSystem: true, churchId: null, id: { not: id } },
          data: { isDefault: false },
        });
      } else if (template.churchId) {
        await db.certificateTemplate.updateMany({
          where: { churchId: template.churchId, id: { not: id } },
          data: { isDefault: false },
        });
      }
    }

    const updatedTemplate = await db.certificateTemplate.update({
      where: { id },
      data: updateData,
      include: {
        church: {
          select: { id: true, name: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'UPDATE',
      entity: 'CertificateTemplate',
      entityId: id,
      details: { name: updatedTemplate.name },
    });

    // Parse config for response
    const parsedConfig = JSON.parse(updatedTemplate.config);

    return NextResponse.json({
      success: true,
      data: {
        ...updatedTemplate,
        config: parsedConfig,
      },
    });
  } catch (error) {
    console.error('Update template error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// DELETE - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions - Division Admin or higher can delete
    if (
      session.role !== Role.GENERAL_CONFERENCE_ADMIN &&
      session.role !== Role.DIVISION_ADMIN
    ) {
      return NextResponse.json(
        { success: false, error: 'Only Division Admins or higher can delete templates' },
        { status: 403 }
      );
    }

    const template = await db.certificateTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Don't delete system templates
    if (template.isSystem) {
      return NextResponse.json(
        { success: false, error: 'System templates cannot be deleted' },
        { status: 400 }
      );
    }

    await db.certificateTemplate.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'DELETE',
      entity: 'CertificateTemplate',
      entityId: id,
      details: { name: template.name },
    });

    return NextResponse.json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error) {
    console.error('Delete template error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
