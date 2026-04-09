import { Request, Response, NextFunction } from 'express';
import { auth } from '../services/firebase';
import pool from '../config/db';

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

  try {
    const decoded = await auth.verifyIdToken(token);

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
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
