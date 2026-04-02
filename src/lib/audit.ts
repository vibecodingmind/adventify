import { db } from './db';
import { headers } from 'next/headers';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'APPROVE' 
  | 'REJECT' 
  | 'LOGIN' 
  | 'LOGOUT'
  | 'REGISTER'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'GENERATE';

export type AuditEntity = 
  | 'User' 
  | 'Division' 
  | 'Union' 
  | 'Conference' 
  | 'Church' 
  | 'Person' 
  | 'BaptismRecord' 
  | 'Certificate'
  | 'MemberRequest';

interface CreateAuditLogParams {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  details?: Record<string, unknown>;
}

export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 
                      headersList.get('x-real-ip') || 
                      'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';
    
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: ipAddress as string,
        userAgent: userAgent as string,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

export async function getAuditLogs(options: {
  userId?: string;
  entity?: AuditEntity;
  entityId?: string;
  action?: AuditAction;
  limit?: number;
  offset?: number;
}) {
  const { userId, entity, entityId, action, limit = 50, offset = 0 } = options;
  
  const where: {
    userId?: string;
    entity?: string;
    entityId?: string;
    action?: string;
  } = {};
  
  if (userId) where.userId = userId;
  if (entity) where.entity = entity;
  if (entityId) where.entityId = entityId;
  if (action) where.action = action;
  
  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);
  
  return { logs, total };
}
