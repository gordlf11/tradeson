import { Response, NextFunction } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest } from './auth';

export async function logAuditEvent(
  actorId: string | null,
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO audit_log (actor_user_id, action, resource_type, resource_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [actorId, action, resourceType, resourceId, metadata ? JSON.stringify(metadata) : null, ipAddress]
    );
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

export function auditMiddleware(action: string, resourceType: string) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    const originalJson = _res.json.bind(_res);
    _res.json = (body: any) => {
      if (_res.statusCode >= 200 && _res.statusCode < 300 && body?.id) {
        logAuditEvent(
          req.user?.id || null,
          action,
          resourceType,
          body.id,
          { method: req.method, path: req.path },
          req.ip
        );
      }
      return originalJson(body);
    };
    next();
  };
}
