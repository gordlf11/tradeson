import { Request, Response, NextFunction } from 'express';
import { auth } from '../services/firebase';
import pool from '../config/db';

// Re-decoding the token in requireAdmin is intentional: requireAuth doesn't
// stash the decoded token on the request, and we need the custom claims to
// honor `admin: true` set via scripts/setAdminClaim.mjs.

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    firebase_uid: string;
    email: string;
    role: string;
    full_name: string;
  };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];

  // Step 1: Verify Firebase token
  let decoded;
  try {
    decoded = await auth.verifyIdToken(token);
  } catch (err) {
    console.error('Firebase token verification failed:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Step 2: Look up user in PostgreSQL (separate try/catch so DB errors don't mask as auth errors)
  try {
    const result = await pool.query(
      'SELECT id, firebase_uid, email, role, full_name FROM users WHERE firebase_uid = $1 AND deleted_at IS NULL',
      [decoded.uid]
    );

    if (result.rows.length === 0) {
      // User exists in Firebase but not in PG — they need to call POST /api/v1/users first
      req.user = {
        id: '',
        firebase_uid: decoded.uid,
        email: decoded.email || '',
        role: '',
        full_name: '',
      };
    } else {
      req.user = result.rows[0];
    }

    next();
  } catch (dbErr) {
    console.error('Database error during auth lookup:', dbErr);
    res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
  }
}

export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // requireAuth must run first — this just adds the admin check on top.
  if (!req.user) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  // Admin if either: PG role = 'admin' OR Firebase custom claim admin = true.
  // The custom claim path lets bootstrap admins exist before their PG row
  // is updated to role='admin'.
  if (req.user.role === 'admin') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = authHeader.split('Bearer ')[1];

  try {
    const decoded = await auth.verifyIdToken(token);
    if (decoded.admin === true) {
      next();
      return;
    }
    res.status(403).json({ error: 'Admin access required' });
  } catch {
    res.status(401).json({ error: 'Token verification failed' });
  }
}
