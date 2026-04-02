import { cookies } from 'next/headers';
import { db } from './db';
import { verifyToken, type JwtPayload } from './jwt';
import { Role, type User } from '@prisma/client';
import { hasHigherOrEqualRole, REQUEST_DENIED_ROLES, type RequestAction } from '@/types';

export const SESSION_COOKIE_NAME = 'adventify_session';

export interface AuthUser extends JwtPayload {
  isAuthenticated: boolean;
}

export async function getSession(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }
  
  return {
    ...decoded,
    isAuthenticated: true,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireRole(role: Role): Promise<AuthUser> {
  const session = await requireAuth();
  if (!hasHigherOrEqualRole(session.role, role)) {
    throw new Error('Forbidden');
  }
  return session;
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  
  return db.user.findUnique({
    where: { id: session.userId },
  });
}

// Check if user has access to a specific entity based on hierarchy
export function hasAccessToEntity(
  user: AuthUser,
  entityType: 'division' | 'union' | 'conference' | 'church',
  entityId: string
): boolean {
  // General Conference Admin has access to everything
  if (user.role === Role.GENERAL_CONFERENCE_ADMIN) {
    return true;
  }
  
  // Check based on entity type and user scope
  switch (entityType) {
    case 'division':
      return user.divisionId === entityId || user.role === Role.GENERAL_CONFERENCE_ADMIN;
    case 'union':
      if (user.role === Role.DIVISION_ADMIN) {
        // Division admin can access unions in their division
        return true; // Need to verify union belongs to division
      }
      return user.unionId === entityId;
    case 'conference':
      if (user.role === Role.DIVISION_ADMIN || user.role === Role.UNION_ADMIN) {
        return true; // Need to verify conference belongs to union
      }
      return user.conferenceId === entityId;
    case 'church':
      if (user.role === Role.DIVISION_ADMIN || user.role === Role.UNION_ADMIN || user.role === Role.CONFERENCE_ADMIN || user.role === Role.CHURCH_PASTOR || user.role === Role.CHURCH_CLERK) {
        return true; // Need to verify church belongs to conference
      }
      return user.churchId === entityId;
    default:
      return false;
  }
}

// Get the scope filter for database queries based on user role
export function getScopeFilter(user: AuthUser): {
  divisionId?: string;
  unionId?: string;
  conferenceId?: string;
  churchId?: string;
} {
  const filter: {
    divisionId?: string;
    unionId?: string;
    conferenceId?: string;
    churchId?: string;
  } = {};
  
  if (user.divisionId) filter.divisionId = user.divisionId;
  if (user.unionId) filter.unionId = user.unionId;
  if (user.conferenceId) filter.conferenceId = user.conferenceId;
  if (user.churchId) filter.churchId = user.churchId;
  
  return filter;
}

// Permission matrix for actions
export const PERMISSIONS = {
  // Hierarchy management
  CREATE_DIVISION: Role.GENERAL_CONFERENCE_ADMIN,
  UPDATE_DIVISION: Role.GENERAL_CONFERENCE_ADMIN,
  DELETE_DIVISION: Role.GENERAL_CONFERENCE_ADMIN,
  
  CREATE_UNION: Role.DIVISION_ADMIN,
  UPDATE_UNION: Role.DIVISION_ADMIN,
  DELETE_UNION: Role.GENERAL_CONFERENCE_ADMIN,
  
  CREATE_CONFERENCE: Role.UNION_ADMIN,
  UPDATE_CONFERENCE: Role.UNION_ADMIN,
  DELETE_CONFERENCE: Role.DIVISION_ADMIN,
  
  CREATE_CHURCH: Role.CONFERENCE_ADMIN,
  UPDATE_CHURCH: Role.CONFERENCE_ADMIN,
  DELETE_CHURCH: Role.UNION_ADMIN,
  
  // Person management
  CREATE_PERSON: Role.CHURCH_CLERK,
  UPDATE_PERSON: Role.CHURCH_CLERK,
  DELETE_PERSON: Role.CONFERENCE_ADMIN,
  
  // Baptism records
  CREATE_BAPTISM_RECORD: Role.CHURCH_CLERK,
  UPDATE_BAPTISM_RECORD: Role.CHURCH_CLERK,
  APPROVE_BAPTISM_RECORD: Role.CHURCH_PASTOR,
  REJECT_BAPTISM_RECORD: Role.CHURCH_PASTOR,
  DELETE_BAPTISM_RECORD: Role.CONFERENCE_ADMIN,
  
  // Certificates
  GENERATE_CERTIFICATE: Role.CHURCH_PASTOR,
  VIEW_CERTIFICATE: Role.MEMBER,
  DOWNLOAD_CERTIFICATE: Role.MEMBER,
  
  // User management
  CREATE_USER: Role.CONFERENCE_ADMIN,
  UPDATE_USER: Role.CONFERENCE_ADMIN,
  DELETE_USER: Role.DIVISION_ADMIN,
} as const;

export function canPerformAction(user: AuthUser, action: keyof typeof PERMISSIONS): boolean {
  const requiredRole = PERMISSIONS[action];
  return hasHigherOrEqualRole(user.role, requiredRole);
}

// Member Request RBAC - strict permission checks
export function canPerformRequestAction(
  user: AuthUser,
  action: RequestAction
): { allowed: boolean; churchId?: string; error?: string } {
  // Conference Admin and above are always denied
  if (REQUEST_DENIED_ROLES.includes(user.role)) {
    return { allowed: false, error: 'Conference-level and above roles cannot access member requests' };
  }

  // All request actions require a church assignment
  if (!user.churchId) {
    return { allowed: false, error: 'User must be assigned to a church' };
  }

  switch (action) {
    case 'CREATE_REQUEST':
      if (user.role !== Role.CHURCH_CLERK) {
        return { allowed: false, error: 'Only church clerks can create member requests' };
      }
      return { allowed: true, churchId: user.churchId };

    case 'VIEW_OWN_REQUESTS':
      return { allowed: true, churchId: user.churchId };

    case 'VIEW_CHURCH_REQUESTS':
      if (user.role !== Role.CHURCH_CLERK && user.role !== Role.CHURCH_PASTOR) {
        return { allowed: false, error: 'Only clerks and pastors can view church requests' };
      }
      return { allowed: true, churchId: user.churchId };

    case 'EDIT_REQUEST':
      if (user.role !== Role.CHURCH_CLERK) {
        return { allowed: false, error: 'Only church clerks can edit requests' };
      }
      return { allowed: true, churchId: user.churchId };

    case 'APPROVE_REQUEST':
    case 'REJECT_REQUEST':
      if (user.role !== Role.CHURCH_PASTOR) {
        return { allowed: false, error: 'Only pastors can approve or reject requests' };
      }
      return { allowed: true, churchId: user.churchId };

    case 'GENERATE_DOCUMENT':
      if (user.role !== Role.CHURCH_PASTOR) {
        return { allowed: false, error: 'Only pastors can generate documents' };
      }
      return { allowed: true, churchId: user.churchId };

    case 'DOWNLOAD_OWN_DOCUMENT':
      return { allowed: true, churchId: user.churchId };

    case 'DOWNLOAD_CHURCH_DOCUMENT':
      if (user.role !== Role.CHURCH_CLERK && user.role !== Role.CHURCH_PASTOR) {
        return { allowed: false, error: 'Only clerks and pastors can download church documents' };
      }
      return { allowed: true, churchId: user.churchId };

    default:
      return { allowed: false, error: 'Unknown request action' };
  }
}

export async function requireRequestAction(action: RequestAction): Promise<AuthUser> {
  const session = await requireAuth();
  const result = canPerformRequestAction(session, action);
  if (!result.allowed) {
    throw new Error(result.error || 'Forbidden');
  }
  return session;
}
