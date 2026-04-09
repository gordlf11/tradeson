import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

// POST /api/v1/users — Create user on first Firebase login
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { firebase_uid, email } = req.user!;
  const { full_name, phone_number, role } = req.body;

  if (!full_name || !role) {
    res.status(400).json({ error: 'full_name and role are required' });
    return;
  }

  const validRoles = ['homeowner', 'property_manager', 'realtor', 'licensed_tradesperson', 'unlicensed_tradesperson'];
  if (!validRoles.includes(role)) {
    res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    return;
  }

  try {
    const existing = await pool.query('SELECT id FROM users WHERE firebase_uid = $1', [firebase_uid]);
    if (existing.rows.length > 0) {
      res.status(409).json({ error: 'User already exists', id: existing.rows[0].id });
      return;
    }

    const result = await pool.query(
      `INSERT INTO users (firebase_uid, email, full_name, phone_number, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, firebase_uid, email, full_name, role, created_at`,
      [firebase_uid, email || req.body.email, full_name, phone_number, role]
    );

    const user = result.rows[0];

    // Create default notification preferences
    await pool.query(
      `INSERT INTO user_notification_preferences (user_id) VALUES ($1)`,
      [user.id]
    );

    await logAuditEvent(user.id, 'user.created', 'users', user.id, { role }, req.ip);

    res.status(201).json(user);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/v1/users/me — Get current user profile with role-specific data
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, role } = req.user!;
  if (!id) {
    res.status(404).json({ error: 'User not found in database. Call POST /api/v1/users first.' });
    return;
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = userResult.rows[0];

    const addressResult = await pool.query('SELECT * FROM user_addresses WHERE user_id = $1', [id]);
    const prefsResult = await pool.query('SELECT * FROM user_notification_preferences WHERE user_id = $1', [id]);

    let profile = null;
    if (role === 'homeowner') {
      const r = await pool.query('SELECT * FROM homeowner_profiles WHERE user_id = $1', [id]);
      profile = r.rows[0] || null;
    } else if (role === 'property_manager') {
      const r = await pool.query('SELECT * FROM property_manager_profiles WHERE user_id = $1', [id]);
      profile = r.rows[0] || null;
      if (profile) {
        const props = await pool.query(
          'SELECT * FROM managed_properties WHERE property_manager_profile_id = $1 AND deleted_at IS NULL',
          [profile.id]
        );
        profile.managed_properties = props.rows;
      }
    } else if (role === 'realtor') {
      const r = await pool.query('SELECT * FROM realtor_profiles WHERE user_id = $1', [id]);
      profile = r.rows[0] || null;
    } else if (role === 'licensed_tradesperson' || role === 'unlicensed_tradesperson') {
      const r = await pool.query('SELECT * FROM tradesperson_profiles WHERE user_id = $1', [id]);
      profile = r.rows[0] || null;
      if (profile) {
        const areas = await pool.query('SELECT zip_code FROM service_areas WHERE tradesperson_profile_id = $1', [profile.id]);
        profile.service_areas = areas.rows.map((a: any) => a.zip_code);
        const docs = await pool.query('SELECT * FROM compliance_documents WHERE tradesperson_profile_id = $1', [profile.id]);
        profile.compliance_documents = docs.rows;
      }
    }

    res.json({
      ...user,
      address: addressResult.rows[0] || null,
      notification_preferences: prefsResult.rows[0] || null,
      profile,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/v1/users/me — Update basic user fields
router.put('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.user!;
  if (!id) { res.status(404).json({ error: 'User not found' }); return; }

  const { full_name, phone_number, profile_photo_url } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users SET
        full_name = COALESCE($1, full_name),
        phone_number = COALESCE($2, phone_number),
        profile_photo_url = COALESCE($3, profile_photo_url),
        updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [full_name, phone_number, profile_photo_url, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

export default router;
