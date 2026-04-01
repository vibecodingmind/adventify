import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST() {
  try {
    const session = await getSession();
    
    if (session) {
      // Create audit log
      await createAuditLog({
        userId: session.userId,
        action: 'LOGOUT',
        entity: 'User',
        entityId: session.userId,
      });
    }
    
    // Create response and clear cookie
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    response.cookies.set('adventify_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
