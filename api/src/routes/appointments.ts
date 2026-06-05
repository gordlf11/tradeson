import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { publish } from '../services/pubsub';

const router = Router();

/**
 * Scheduling persistence. Source of truth for confirmed appointment slots
 * lives in Postgres (`appointments`). Creating or rescheduling an appointment
 * emits a Pub/Sub event → `fcm-fanout` pushes to the *other* participant.
 *
 * Contract for the frontend (Scheduling.tsx wiring):
 *   scheduled_date  — 'YYYY-MM-DD'
 *   time_slot_start — 'HH:MM' (24h) or '8:00 AM' (Postgres TIME parses both)
 *   time_slot_end   — same
 *
 * The actor (caller) may be either the job's customer or its assigned
 * tradesperson; the server derives both party ids + the accepted quote from
 * the job, so the client can't forge participants.
 */

// Resolve the job + both parties' ids/UIDs. Returns null if the job doesn't
// exist or the caller isn't a participant (customer or assigned tradesperson).
async function resolveJobParties(jobId: string, callerId: string) {
  const result = await pool.query(
    `SELECT j.id              AS job_id,
            j.homeowner_user_id        AS customer_id,
            j.assigned_tradesperson_id AS tradesperson_id,
            ho.firebase_uid    AS customer_firebase_uid,
            ho.full_name       AS customer_name,
            tp.firebase_uid    AS tradesperson_firebase_uid,
            tp.full_name       AS tradesperson_name,
            (SELECT q.id FROM quotes q
              WHERE q.job_id = j.id AND q.status = 'accepted'
              ORDER BY q.accepted_at DESC NULLS LAST LIMIT 1) AS quote_id
       FROM jobs j
       JOIN users ho ON ho.id = j.homeowner_user_id
       LEFT JOIN users tp ON tp.id = j.assigned_tradesperson_id
      WHERE j.id = $1`,
    [jobId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  if (row.customer_id !== callerId && row.tradesperson_id !== callerId) return null;
  return row;
}

// POST /api/v1/appointments — persist a confirmed slot for a job.
// Body: { job_id, scheduled_date, time_slot_start, time_slot_end, notes? }
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const callerId = req.user!.id;
  const { job_id, scheduled_date, time_slot_start, time_slot_end, notes } = req.body;

  if (!job_id || !scheduled_date || !time_slot_start || !time_slot_end) {
    res.status(400).json({ error: 'job_id, scheduled_date, time_slot_start, time_slot_end are required' });
    return;
  }

  try {
    const parties = await resolveJobParties(job_id, callerId);
    if (!parties) {
      res.status(403).json({ error: 'Job not found or you are not a participant' });
      return;
    }
    if (!parties.tradesperson_id) {
      res.status(409).json({ error: 'Job has no assigned tradesperson yet — accept a quote first' });
      return;
    }

    const insert = await pool.query(
      `INSERT INTO appointments
         (job_id, quote_id, tradesperson_id, customer_id, scheduled_date, time_slot_start, time_slot_end, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [job_id, parties.quote_id, parties.tradesperson_id, parties.customer_id,
       scheduled_date, time_slot_start, time_slot_end, notes ?? null]
    );
    const appt = insert.rows[0];

    // Mirror the date onto the job so dashboards/lists can show "scheduled for…"
    // without a join. status moves to 'scheduled' if it was still open/quoted.
    await pool.query(
      `UPDATE jobs
          SET scheduled_at = $2::date + $3::time,
              status = CASE WHEN status IN ('open','quoted') THEN 'scheduled' ELSE status END,
              updated_at = now()
        WHERE id = $1`,
      [job_id, scheduled_date, time_slot_start]
    );

    // Push to the *other* participant. targetUserId MUST be the recipient's
    // Firebase UID — fan-out looks up users/{uid}.fcmToken in Firestore.
    const callerIsCustomer = parties.customer_id === callerId;
    const recipientUid = callerIsCustomer ? parties.tradesperson_firebase_uid : parties.customer_firebase_uid;
    const recipientPgId = callerIsCustomer ? parties.tradesperson_id : parties.customer_id;
    const actorName = callerIsCustomer ? parties.customer_name : parties.tradesperson_name;
    const body = `${actorName} confirmed a time: ${scheduled_date} at ${time_slot_start}`;

    if (recipientUid) {
      void publish({
        event: 'schedule.confirmed',
        targetUserId: recipientUid,
        title: 'Appointment Confirmed',
        body,
        data: { job_id: String(job_id), appointment_id: String(appt.id), type: 'schedule_confirmed' },
      });
    }
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data, channel)
       VALUES ($1, 'schedule_confirmed', 'Appointment Confirmed', $2, $3, 'push')`,
      [recipientPgId, body, JSON.stringify({ job_id, appointment_id: appt.id })]
    );

    await logAuditEvent(callerId, 'appointment.created', 'appointments', appt.id,
      { job_id, scheduled_date, time_slot_start }, req.ip);

    res.status(201).json(appt);
  } catch (err: any) {
    console.error('Create appointment error:', err);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PATCH /api/v1/appointments/:id — reschedule or update status.
// Body: { scheduled_date?, time_slot_start?, time_slot_end?, status?, notes? }
router.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
  const callerId = req.user!.id;
  const apptId = req.params.id as string;
  const { scheduled_date, time_slot_start, time_slot_end, status, notes } = req.body;

  if (status && !['confirmed','en_route','in_progress','completed','cancelled','no_show'].includes(status)) {
    res.status(400).json({ error: 'invalid status' });
    return;
  }

  try {
    const existing = await pool.query('SELECT * FROM appointments WHERE id = $1', [apptId]);
    if (existing.rows.length === 0) { res.status(404).json({ error: 'Appointment not found' }); return; }
    const appt = existing.rows[0];

    const parties = await resolveJobParties(appt.job_id, callerId);
    if (!parties) { res.status(403).json({ error: 'You are not a participant on this job' }); return; }

    const updated = await pool.query(
      `UPDATE appointments
          SET scheduled_date  = COALESCE($2, scheduled_date),
              time_slot_start = COALESCE($3, time_slot_start),
              time_slot_end   = COALESCE($4, time_slot_end),
              status          = COALESCE($5, status),
              notes           = COALESCE($6, notes),
              updated_at      = now()
        WHERE id = $1
        RETURNING *`,
      [apptId, scheduled_date ?? null, time_slot_start ?? null, time_slot_end ?? null, status ?? null, notes ?? null]
    );
    const next = updated.rows[0];

    const timeChanged =
      (scheduled_date && scheduled_date !== String(appt.scheduled_date)) ||
      (time_slot_start && time_slot_start !== String(appt.time_slot_start));

    if (timeChanged) {
      await pool.query(
        `UPDATE jobs SET scheduled_at = $2::date + $3::time, updated_at = now() WHERE id = $1`,
        [appt.job_id, next.scheduled_date, next.time_slot_start]
      );

      // Notify the other participant of the change.
      const callerIsCustomer = parties.customer_id === callerId;
      const recipientUid = callerIsCustomer ? parties.tradesperson_firebase_uid : parties.customer_firebase_uid;
      const recipientPgId = callerIsCustomer ? parties.tradesperson_id : parties.customer_id;
      const actorName = callerIsCustomer ? parties.customer_name : parties.tradesperson_name;
      const body = `${actorName} changed the time to ${next.scheduled_date} at ${next.time_slot_start}`;

      if (recipientUid) {
        void publish({
          event: 'schedule.changed',
          targetUserId: recipientUid,
          title: 'Appointment Updated',
          body,
          data: { job_id: String(appt.job_id), appointment_id: String(apptId), type: 'schedule_changed' },
        });
      }
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, data, channel)
         VALUES ($1, 'schedule_changed', 'Appointment Updated', $2, $3, 'push')`,
        [recipientPgId, body, JSON.stringify({ job_id: appt.job_id, appointment_id: apptId })]
      );
    }

    await logAuditEvent(callerId, 'appointment.updated', 'appointments', apptId,
      { time_changed: timeChanged, status: status ?? null }, req.ip);

    res.json(next);
  } catch (err: any) {
    console.error('Update appointment error:', err);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// GET /api/v1/appointments/mine — caller's appointments (as customer or tradesperson).
router.get('/mine', requireAuth, async (req: AuthenticatedRequest, res) => {
  const callerId = req.user!.id;
  try {
    const result = await pool.query(
      `SELECT a.*, j.title AS job_title, j.category, j.status AS job_status
         FROM appointments a
         JOIN jobs j ON j.id = a.job_id
        WHERE a.customer_id = $1 OR a.tradesperson_id = $1
        ORDER BY a.scheduled_date ASC, a.time_slot_start ASC`,
      [callerId]
    );
    res.json({ appointments: result.rows });
  } catch (err: any) {
    console.error('List my appointments error:', err);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// GET /api/v1/appointments/:jobId — appointment(s) for a job (participants only).
router.get('/:jobId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const callerId = req.user!.id;
  const jobId = req.params.jobId as string;
  try {
    const parties = await resolveJobParties(jobId, callerId);
    if (!parties && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Job not found or you are not a participant' });
      return;
    }
    const result = await pool.query(
      `SELECT * FROM appointments WHERE job_id = $1 ORDER BY scheduled_date ASC, time_slot_start ASC`,
      [jobId]
    );
    res.json({ appointments: result.rows });
  } catch (err: any) {
    console.error('Get job appointments error:', err);
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

export default router;
