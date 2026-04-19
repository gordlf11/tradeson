import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

// Helper: ensure user exists in PG (auto-create if only in Firebase)
async function ensureUser(req: AuthenticatedRequest): Promise<string> {
  if (req.user!.id) return req.user!.id;

  // User exists in Firebase but not PG — create them now
  const { firebase_uid, email } = req.user!;

  // Check if user already exists (avoid ON CONFLICT issues)
  const existing = await pool.query('SELECT id FROM users WHERE firebase_uid = $1', [firebase_uid]);
  if (existing.rows.length > 0) {
    req.user!.id = existing.rows[0].id;
    return existing.rows[0].id;
  }

  const result = await pool.query(
    `INSERT INTO users (firebase_uid, email, full_name, role)
     VALUES ($1, $2, $3, 'homeowner')
     RETURNING id`,
    [firebase_uid, email, email.split('@')[0]]
  );
  const userId = result.rows[0].id;

  try {
    await pool.query('INSERT INTO user_notification_preferences (user_id) VALUES ($1)', [userId]);
  } catch {
    // Already exists — fine
  }

  req.user!.id = userId;
  return userId;
}

// Helper: save address + notification prefs
async function saveAddressAndPrefs(userId: string, body: any) {
  if (body.address_line_1) {
    const existing = await pool.query('SELECT id FROM user_addresses WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE user_addresses SET address_line_1 = $2, city = $3, state = $4, zip_code = $5,
         service_radius_miles = $6, updated_at = now() WHERE user_id = $1`,
        [userId, body.address_line_1, body.city, body.state, body.zip_code, body.service_radius_miles]
      );
    } else {
      await pool.query(
        `INSERT INTO user_addresses (user_id, address_line_1, city, state, zip_code, service_radius_miles)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, body.address_line_1, body.city, body.state, body.zip_code, body.service_radius_miles]
      );
    }
  }

  await pool.query(
    `UPDATE user_notification_preferences SET
       notify_sms = COALESCE($2, notify_sms),
       notify_email = COALESCE($3, notify_email),
       notify_push = COALESCE($4, notify_push),
       updated_at = now()
     WHERE user_id = $1`,
    [userId, body.notify_sms, body.notify_email, body.notify_push]
  );

  if (body.marketing_opt_in !== undefined) {
    await pool.query('UPDATE users SET marketing_opt_in = $1 WHERE id = $2', [body.marketing_opt_in, userId]);
  }
}

// POST /api/v1/onboarding/homeowner
router.post('/homeowner', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = await ensureUser(req);

  try {
    const { property_address, property_city, property_state, property_zip,
            property_type, service_interests } = req.body;

    await pool.query(
      `INSERT INTO homeowner_profiles (user_id, property_address, property_city, property_state, property_zip, property_type, service_interests)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id) DO UPDATE SET
         property_address = EXCLUDED.property_address, property_city = EXCLUDED.property_city,
         property_state = EXCLUDED.property_state, property_zip = EXCLUDED.property_zip,
         property_type = EXCLUDED.property_type, service_interests = EXCLUDED.service_interests,
         updated_at = now()`,
      [id, property_address, property_city, property_state, property_zip,
       property_type ? property_type.toLowerCase() : null, service_interests || []]
    );

    await saveAddressAndPrefs(id, req.body);
    await logAuditEvent(id, 'onboarding.homeowner.completed', 'users', id, {}, req.ip);

    res.json({ success: true, message: 'Homeowner onboarding complete' });
  } catch (err) {
    console.error('Homeowner onboarding error:', err);
    res.status(500).json({ error: 'Failed to save homeowner profile' });
  }
});

// POST /api/v1/onboarding/property-manager
router.post('/property-manager', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = await ensureUser(req);

  try {
    const { company_name, job_title, business_email, property_count_range,
            property_types, preferred_service_types, urgency_types, managed_properties } = req.body;

    const result = await pool.query(
      `INSERT INTO property_manager_profiles
       (user_id, company_name, job_title, business_email, property_count_range, property_types, preferred_service_types, urgency_types)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id) DO UPDATE SET
         company_name = EXCLUDED.company_name, job_title = EXCLUDED.job_title,
         business_email = EXCLUDED.business_email, property_count_range = EXCLUDED.property_count_range,
         property_types = EXCLUDED.property_types, preferred_service_types = EXCLUDED.preferred_service_types,
         urgency_types = EXCLUDED.urgency_types, updated_at = now()
       RETURNING id`,
      [id, company_name || '', job_title || '', business_email || '', property_count_range,
       property_types || [], preferred_service_types || [], urgency_types || []]
    );

    const pmProfileId = result.rows[0].id;

    if (managed_properties?.length) {
      for (const prop of managed_properties) {
        await pool.query(
          `INSERT INTO managed_properties (property_manager_profile_id, address_line_1, city, state, zip_code, property_type)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [pmProfileId, prop.address, prop.city, prop.state, prop.zip_code, prop.property_type]
        );
      }
    }

    await saveAddressAndPrefs(id, req.body);
    await logAuditEvent(id, 'onboarding.property_manager.completed', 'users', id, {}, req.ip);

    res.json({ success: true, message: 'Property manager onboarding complete' });
  } catch (err) {
    console.error('PM onboarding error:', err);
    res.status(500).json({ error: 'Failed to save property manager profile' });
  }
});

// POST /api/v1/onboarding/realtor
router.post('/realtor', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = await ensureUser(req);

  try {
    const { brokerage_name, license_number, service_radius_miles, client_emails } = req.body;

    const result = await pool.query(
      `INSERT INTO realtor_profiles (user_id, brokerage_name, license_number, service_radius_miles)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         brokerage_name = EXCLUDED.brokerage_name, license_number = EXCLUDED.license_number,
         service_radius_miles = EXCLUDED.service_radius_miles, updated_at = now()
       RETURNING id`,
      [id, brokerage_name || '', license_number || '', service_radius_miles]
    );

    if (client_emails?.length) {
      for (const email of client_emails) {
        const exists = await pool.query(
          'SELECT id FROM realtor_clients WHERE realtor_profile_id = $1 AND client_email = $2',
          [result.rows[0].id, email]
        );
        if (exists.rows.length === 0) {
          await pool.query(
            'INSERT INTO realtor_clients (realtor_profile_id, client_email) VALUES ($1, $2)',
            [result.rows[0].id, email]
          );
        }
      }
    }

    await saveAddressAndPrefs(id, req.body);
    await logAuditEvent(id, 'onboarding.realtor.completed', 'users', id, {}, req.ip);

    res.json({ success: true, message: 'Realtor onboarding complete' });
  } catch (err) {
    console.error('Realtor onboarding error:', err);
    res.status(500).json({ error: 'Failed to save realtor profile' });
  }
});

// POST /api/v1/onboarding/licensed-trade
router.post('/licensed-trade', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = await ensureUser(req);

  try {
    const { business_name, service_address, service_city, service_state, service_zip,
            service_radius_miles, primary_trades, subcategories, additional_services,
            business_entity_type, areas_served, licenses } = req.body;

    const result = await pool.query(
      `INSERT INTO tradesperson_profiles
       (user_id, business_name, is_licensed, service_address, service_city, service_state, service_zip,
        service_radius_miles, primary_trades, subcategories, additional_services, business_entity_type)
       VALUES ($1, $2, TRUE, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = EXCLUDED.business_name, service_address = EXCLUDED.service_address,
         service_city = EXCLUDED.service_city, service_state = EXCLUDED.service_state,
         service_zip = EXCLUDED.service_zip, service_radius_miles = EXCLUDED.service_radius_miles,
         primary_trades = EXCLUDED.primary_trades, subcategories = EXCLUDED.subcategories,
         additional_services = EXCLUDED.additional_services, business_entity_type = EXCLUDED.business_entity_type,
         updated_at = now()
       RETURNING id`,
      [id, business_name, service_address, service_city, service_state, service_zip,
       service_radius_miles, primary_trades || [], subcategories || [], additional_services, business_entity_type]
    );

    const profileId = result.rows[0].id;

    if (areas_served?.length) {
      await pool.query('DELETE FROM service_areas WHERE tradesperson_profile_id = $1', [profileId]);
      for (const zip of areas_served) {
        await pool.query('INSERT INTO service_areas (tradesperson_profile_id, zip_code) VALUES ($1, $2)', [profileId, zip]);
      }
    }

    if (licenses?.length) {
      for (const lic of licenses) {
        await pool.query(
          `INSERT INTO compliance_documents (tradesperson_profile_id, license_type, license_number, expiration_date, document_url)
           VALUES ($1, $2, $3, $4, $5)`,
          [profileId, lic.license_type, lic.license_number, lic.expiration_date, lic.document_url]
        );
      }
    }

    await saveAddressAndPrefs(id, req.body);
    await logAuditEvent(id, 'onboarding.licensed_trade.completed', 'users', id, {}, req.ip);

    res.json({ success: true, message: 'Licensed tradesperson onboarding complete' });
  } catch (err) {
    console.error('Licensed trade onboarding error:', err);
    res.status(500).json({ error: 'Failed to save tradesperson profile' });
  }
});

// POST /api/v1/onboarding/non-licensed-trade
router.post('/non-licensed-trade', requireAuth, async (req: AuthenticatedRequest, res) => {
  const id = await ensureUser(req);

  try {
    const { business_name, service_address, service_city, service_state, service_zip,
            service_radius_miles, primary_trades, subcategories, additional_services,
            business_entity_type, areas_served } = req.body;

    const result = await pool.query(
      `INSERT INTO tradesperson_profiles
       (user_id, business_name, is_licensed, service_address, service_city, service_state, service_zip,
        service_radius_miles, primary_trades, subcategories, additional_services, business_entity_type)
       VALUES ($1, $2, FALSE, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (user_id) DO UPDATE SET
         business_name = EXCLUDED.business_name, service_address = EXCLUDED.service_address,
         service_city = EXCLUDED.service_city, service_state = EXCLUDED.service_state,
         service_zip = EXCLUDED.service_zip, service_radius_miles = EXCLUDED.service_radius_miles,
         primary_trades = EXCLUDED.primary_trades, subcategories = EXCLUDED.subcategories,
         additional_services = EXCLUDED.additional_services, business_entity_type = EXCLUDED.business_entity_type,
         updated_at = now()
       RETURNING id`,
      [id, business_name, service_address, service_city, service_state, service_zip,
       service_radius_miles, primary_trades || [], subcategories || [], additional_services, business_entity_type]
    );

    const profileId = result.rows[0].id;

    if (areas_served?.length) {
      await pool.query('DELETE FROM service_areas WHERE tradesperson_profile_id = $1', [profileId]);
      for (const zip of areas_served) {
        await pool.query('INSERT INTO service_areas (tradesperson_profile_id, zip_code) VALUES ($1, $2)', [profileId, zip]);
      }
    }

    await saveAddressAndPrefs(id, req.body);
    await logAuditEvent(id, 'onboarding.unlicensed_trade.completed', 'users', id, {}, req.ip);

    res.json({ success: true, message: 'Unlicensed tradesperson onboarding complete' });
  } catch (err) {
    console.error('Unlicensed trade onboarding error:', err);
    res.status(500).json({ error: 'Failed to save tradesperson profile' });
  }
});

export default router;
