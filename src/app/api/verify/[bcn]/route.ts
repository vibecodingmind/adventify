import { NextRequest, NextResponse } from 'next/server';
import { verifyCertificate } from '@/lib/certificate';

// GET - Public verification endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bcn: string }> }
) {
  try {
    const { bcn } = await params;
    
    if (!bcn) {
      return NextResponse.json(
        { verified: false, error: 'Certificate number is required' },
        { status: 400 }
      );
    }
    
    const result = await verifyCertificate(bcn.toUpperCase());
    
    if (!result.verified) {
      return NextResponse.json({
        verified: false,
        error: 'Certificate not found or invalid',
      });
    }
    
    return NextResponse.json({
      verified: true,
      data: result.data,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { verified: false, error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}
