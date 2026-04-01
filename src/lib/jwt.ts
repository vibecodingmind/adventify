import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'adventify-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: Role;
  divisionId?: string;
  unionId?: string;
  conferenceId?: string;
  churchId?: string;
  personId?: string;
}

export interface DecodedToken extends JwtPayload {
  iat: number;
  exp: number;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch {
    return null;
  }
}

export function decodeToken(token: string): DecodedToken | null {
  try {
    return jwt.decode(token) as DecodedToken;
  } catch {
    return null;
  }
}

export function getTokenExpiration(token: string): Date | null {
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return new Date(decoded.exp * 1000);
}
