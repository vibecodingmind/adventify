import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, validatePasswordStrength } from '@/lib/password';
import { generateToken } from '@/lib/jwt';
import { getSession, canPerformAction } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { Role } from '@prisma/client';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  role: z.nativeEnum(Role),
  phone: z.string().optional(),
  divisionId: z.string().optional(),
  unionId: z.string().optional(),
  conferenceId: z.string().optional(),
  churchId: z.string().optional(),
  personId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    // Only authenticated admins can create new users
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check permission based on role being created
    const body = await request.json();
    const validatedData = registerSchema.parse(body);
    
    // Validate password strength
    const passwordValidation = validatePasswordStrength(validatedData.password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.errors.join('. ') },
        { status: 400 }
      );
    }
    
    // Check if email already exists
    const existingUser = await db.user.findUnique({
      where: { email: validatedData.email.toLowerCase() },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }
    
    // Validate role-specific assignments
    if (validatedData.role === Role.DIVISION_ADMIN && !validatedData.divisionId) {
      return NextResponse.json(
        { success: false, error: 'Division admin requires division assignment' },
        { status: 400 }
      );
    }
    if (validatedData.role === Role.UNION_ADMIN && !validatedData.unionId) {
      return NextResponse.json(
        { success: false, error: 'Union admin requires union assignment' },
        { status: 400 }
      );
    }
    if (validatedData.role === Role.CONFERENCE_ADMIN && !validatedData.conferenceId) {
      return NextResponse.json(
        { success: false, error: 'Conference admin requires conference assignment' },
        { status: 400 }
      );
    }
    if (validatedData.role === Role.CHURCH_ADMIN && !validatedData.churchId) {
      return NextResponse.json(
        { success: false, error: 'Church admin requires church assignment' },
        { status: 400 }
      );
    }
    
    // Hash password
    const passwordHash = await hashPassword(validatedData.password);
    
    // Create user
    const user = await db.user.create({
      data: {
        email: validatedData.email.toLowerCase(),
        passwordHash,
        fullName: validatedData.fullName,
        role: validatedData.role,
        phone: validatedData.phone,
        divisionId: validatedData.divisionId,
        unionId: validatedData.unionId,
        conferenceId: validatedData.conferenceId,
        churchId: validatedData.churchId,
        personId: validatedData.personId,
      },
    });
    
    // Create audit log
    await createAuditLog({
      userId: session.userId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      details: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors[0].message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
