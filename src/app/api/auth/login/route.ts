import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { generateToken } from '@/lib/jwt';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = loginSchema.parse(body);
    
    // Find user with full relations
    const user = await db.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
      include: {
        division: { select: { id: true, code: true, name: true } },
        union: { select: { id: true, code: true, name: true } },
        conference: { select: { id: true, code: true, name: true } },
        church: { select: { id: true, code: true, name: true, city: true, country: true } },
      },
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated. Please contact administrator.' },
        { status: 401 }
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    
    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      divisionId: user.divisionId || undefined,
      unionId: user.unionId || undefined,
      conferenceId: user.conferenceId || undefined,
      churchId: user.churchId || undefined,
      personId: user.personId || undefined,
    });
    
    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: { email: user.email },
    });
    
    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          divisionId: user.divisionId,
          unionId: user.unionId,
          conferenceId: user.conferenceId,
          churchId: user.churchId,
          division: user.division,
          union: user.union,
          conference: user.conference,
          church: user.church,
        },
        token,
      },
    });
    
    // Set HTTP-only cookie
    response.cookies.set('adventify_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
