import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

// Template config interface
interface TemplateConfig {
  layout: 'classic' | 'modern' | 'elegant' | 'minimal';
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: {
    title: number;
    subtitle: number;
    body: number;
    small: number;
  };
  borderWidth: number;
  borderRadius: number;
  showLogo: boolean;
  showQRCode: boolean;
  backgroundPattern?: string;
}

const DEFAULT_CONFIGS: Record<string, TemplateConfig> = {
  classic: {
    layout: 'classic',
    primaryColor: '#1a365d',
    secondaryColor: '#2d5a87',
    accentColor: '#b8860b',
    fontFamily: 'helvetica',
    fontSize: { title: 28, subtitle: 12, body: 14, small: 10 },
    borderWidth: 3,
    borderRadius: 0,
    showLogo: true,
    showQRCode: true,
  },
  modern: {
    layout: 'modern',
    primaryColor: '#1a1a2e',
    secondaryColor: '#16213e',
    accentColor: '#0f3460',
    fontFamily: 'helvetica',
    fontSize: { title: 32, subtitle: 14, body: 13, small: 10 },
    borderWidth: 1,
    borderRadius: 8,
    showLogo: true,
    showQRCode: true,
  },
  elegant: {
    layout: 'elegant',
    primaryColor: '#2c3e50',
    secondaryColor: '#4a6274',
    accentColor: '#c9a961',
    fontFamily: 'times',
    fontSize: { title: 30, subtitle: 13, body: 14, small: 10 },
    borderWidth: 2,
    borderRadius: 0,
    showLogo: true,
    showQRCode: true,
    backgroundPattern: 'ornate',
  },
};

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  churchId: z.string().optional(),
  config: z.object({
    layout: z.enum(['classic', 'modern', 'elegant', 'minimal']),
    primaryColor: z.string(),
    secondaryColor: z.string(),
    accentColor: z.string(),
    fontFamily: z.string(),
    fontSize: z.object({
      title: z.number(),
      subtitle: z.number(),
      body: z.number(),
      small: z.number(),
    }),
    borderWidth: z.number(),
    borderRadius: z.number(),
    showLogo: z.boolean(),
    showQRCode: z.boolean(),
    backgroundPattern: z.string().optional(),
  }),
  previewData: z.string().optional(),
});

// GET - List templates
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const churchId = searchParams.get('churchId');

    // Build where clause
    const where: {
      churchId?: string | null;
      OR?: Array<{ isSystem: boolean; churchId?: string | null }>;
    } = {};

    if (churchId) {
      where.OR = [
        { isSystem: true, churchId: null },
        { churchId },
      ];
    } else {
      // Show system templates + church-specific templates
      if (session.churchId) {
        where.OR = [
          { isSystem: true, churchId: null },
          { churchId: session.churchId },
        ];
      } else {
        // Admin users see all
        where.OR = [
          { isSystem: true, churchId: null },
        ];
      }
    }

    const templates = await db.certificateTemplate.findMany({
      where,
      include: {
        church: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Get templates error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}

// POST - Create custom template
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = templateSchema.parse(body);

    // Check permissions for system templates
    if (!validatedData.churchId) {
      // System template - requires Conference Admin or higher
      if (
        session.role !== Role.GENERAL_CONFERENCE_ADMIN &&
        session.role !== Role.DIVISION_ADMIN &&
        session.role !== Role.UNION_ADMIN &&
        session.role !== Role.CONFERENCE_ADMIN
      ) {
        return NextResponse.json(
          { success: false, error: 'Only Conference Admins or higher can create system templates' },
          { status: 403 }
        );
      }
    } else {
      // Church template - verify user has access
      const churchLevelRoles: Role[] = [Role.CHURCH_CLERK, Role.CHURCH_PASTOR];
      if (churchLevelRoles.includes(session.role)) {
        if (validatedData.churchId !== session.churchId) {
          return NextResponse.json(
            { success: false, error: 'You can only create templates for your church' },
            { status: 403 }
          );
        }
      }
    }

    // Verify church exists if churchId provided
    if (validatedData.churchId) {
      const church = await db.church.findUnique({
        where: { id: validatedData.churchId },
      });
      if (!church) {
        return NextResponse.json(
          { success: false, error: 'Church not found' },
          { status: 404 }
        );
      }
    }

    const template = await db.certificateTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description || null,
        churchId: validatedData.churchId || null,
        config: JSON.stringify(validatedData.config),
        previewData: validatedData.previewData || null,
        isSystem: !validatedData.churchId,
        isDefault: false,
      },
      include: {
        church: {
          select: { id: true, name: true },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'CertificateTemplate',
      entityId: template.id,
      details: {
        name: template.name,
        churchId: template.churchId,
        isSystem: template.isSystem,
      },
    });

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Create template error:', error);

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

export { DEFAULT_CONFIGS };
export type { TemplateConfig };
