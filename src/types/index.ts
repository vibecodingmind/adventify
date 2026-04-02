import { Role, BaptismStatus, DocumentType, RequestStatus } from '@prisma/client';

// Re-export Prisma types
export { Role, BaptismStatus, DocumentType, RequestStatus };

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// User types
export interface UserWithScope {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  divisionId?: string | null;
  unionId?: string | null;
  conferenceId?: string | null;
  churchId?: string | null;
  personId?: string | null;
}

// Hierarchy types
export interface DivisionWithRelations {
  id: string;
  code: string;
  name: string;
  headquarters?: string | null;
  description?: string | null;
  unionCount?: number;
  churchCount?: number;
}

export interface UnionWithRelations {
  id: string;
  code: string;
  name: string;
  divisionId: string;
  division?: { id: string; code: string; name: string };
  headquarters?: string | null;
  conferenceCount?: number;
}

export interface ConferenceWithRelations {
  id: string;
  code: string;
  name: string;
  unionId: string;
  union?: { id: string; code: string; name: string; division?: { id: string; code: string; name: string } };
  headquarters?: string | null;
  churchCount?: number;
}

export interface ChurchWithRelations {
  id: string;
  code: string;
  name: string;
  conferenceId: string;
  conference?: { id: string; code: string; name: string; union?: { id: string; code: string; name: string } };
  address?: string | null;
  city?: string | null;
  country?: string | null;
}

// Person types
export interface PersonWithBaptism {
  id: string;
  pid: string;
  fullName: string;
  dateOfBirth?: Date | null;
  gender?: string | null;
  email?: string | null;
  phone?: string | null;
  churchId?: string | null;
  church?: ChurchWithRelations | null;
  baptismRecord?: {
    id: string;
    baptismDate: Date;
    status: BaptismStatus;
    church?: ChurchWithRelations;
  } | null;
}

// Baptism Record types
export interface BaptismRecordWithDetails {
  id: string;
  personId: string;
  churchId: string;
  baptismDate: Date;
  baptismLocation?: string | null;
  pastorName: string;
  pastorTitle?: string | null;
  witnessName?: string | null;
  status: BaptismStatus;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectionReason?: string | null;
  notes?: string | null;
  person: {
    id: string;
    pid: string;
    fullName: string;
    dateOfBirth?: Date | null;
  };
  church: ChurchWithRelations;
  certificate?: {
    id: string;
    bcn: string;
    verificationUrl: string;
  } | null;
}

// Certificate types
export interface CertificateWithDetails {
  id: string;
  bcn: string;
  baptismRecordId: string;
  certificateDate: Date;
  verificationUrl: string;
  baptismRecord: BaptismRecordWithDetails;
}

// Analytics types
export interface DashboardStats {
  totalBaptisms: number;
  pendingApprovals: number;
  approvedBaptisms: number;
  recentBaptisms: number;
  growthPercentage?: number;
}

export interface ChurchStats {
  churchId: string;
  churchName: string;
  totalBaptisms: number;
  pendingBaptisms: number;
  approvedBaptisms: number;
}

export interface MonthlyStats {
  month: string;
  year: number;
  count: number;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  role: Role;
  divisionId?: string;
  unionId?: string;
  conferenceId?: string;
  churchId?: string;
}

export interface PersonFormData {
  fullName: string;
  dateOfBirth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  churchId?: string;
  notes?: string;
}

export interface BaptismRecordFormData {
  personId: string;
  churchId: string;
  baptismDate: string;
  baptismLocation?: string;
  pastorName: string;
  pastorTitle?: string;
  witnessName?: string;
  notes?: string;
}

// Hierarchy form types
export interface DivisionFormData {
  code: string;
  name: string;
  headquarters?: string;
  description?: string;
}

export interface UnionFormData {
  code: string;
  name: string;
  divisionId: string;
  headquarters?: string;
  description?: string;
}

export interface ConferenceFormData {
  code: string;
  name: string;
  unionId: string;
  headquarters?: string;
  description?: string;
}

export interface ChurchFormData {
  code: string;
  name: string;
  conferenceId: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
}

// Role hierarchy for permission checks
export const ROLE_HIERARCHY: Record<Role, number> = {
  GENERAL_CONFERENCE_ADMIN: 6,
  DIVISION_ADMIN: 5,
  UNION_ADMIN: 4,
  CONFERENCE_ADMIN: 3,
  CHURCH_PASTOR: 2,
  CHURCH_CLERK: 1,
  MEMBER: 0,
};

export function hasHigherOrEqualRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export function canManageRole(actorRole: Role, targetRole: Role): boolean {
  // Cannot manage users with equal or higher role
  return ROLE_HIERARCHY[actorRole] > ROLE_HIERARCHY[targetRole];
}

// Member Request types
export interface MemberRequestWithDetails {
  id: string;
  requestId: string;
  memberId: string;
  personId?: string | null;
  churchId: string;
  documentType: DocumentType;
  reason?: string | null;
  clerkNotes?: string | null;
  status: RequestStatus;
  editedBy?: string | null;
  editedAt?: Date | null;
  reviewedBy?: string | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
  pdfData?: string | null;
  documentUrl?: string | null;
  documentExpiry?: Date | null;
  generatedAt?: Date | null;
  generatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  member?: { id: string; fullName: string; email: string; } | null;
  person?: { id: string; pid: string; fullName: string; email?: string | null; } | null;
  church?: { id: string; name: string; city?: string | null; country?: string | null; } | null;
  editor?: { id: string; fullName: string; } | null;
  reviewer?: { id: string; fullName: string; } | null;
  generator?: { id: string; fullName: string; } | null;
}

export interface MemberRequestFormData {
  personId: string;
  documentType: DocumentType;
  reason?: string;
}

export interface ClerkEditFormData {
  clerkNotes?: string;
}

export interface RejectRequestFormData {
  rejectionReason: string;
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  BAPTISM_CERTIFICATE: 'Baptism Certificate',
  INTRODUCTION_LETTER: 'Introduction Letter',
  MEMBERSHIP_VERIFICATION: 'Membership Verification',
  CHARACTER_REFERENCE: 'Character Reference',
  SERVICE_CERTIFICATE: 'Service Certificate',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  GENERATED: 'Generated',
};

export type RequestAction = 
  | 'CREATE_REQUEST'
  | 'VIEW_OWN_REQUESTS'
  | 'VIEW_CHURCH_REQUESTS'
  | 'EDIT_REQUEST'
  | 'APPROVE_REQUEST'
  | 'REJECT_REQUEST'
  | 'GENERATE_DOCUMENT'
  | 'DOWNLOAD_OWN_DOCUMENT'
  | 'DOWNLOAD_CHURCH_DOCUMENT';

export const REQUEST_DENIED_ROLES: Role[] = [
  Role.GENERAL_CONFERENCE_ADMIN,
  Role.DIVISION_ADMIN,
  Role.UNION_ADMIN,
  Role.CONFERENCE_ADMIN,
];
