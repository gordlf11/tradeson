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
