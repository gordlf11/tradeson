import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { publish } from '../services/pubsub';
import { firestore } from '../services/firebase';
import { FieldValue } from 'firebase-admin/firestore';

const router = Router();

// GET /api/v1/quotes/mine — Tradesperson's own submitted quotes with job context
router.get('/mine', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, role } = req.user!;
  if (role !== 'licensed_tradesperson' && role !== 'unlicensed_tradesperson') {
    res.status(403).json({ error: 'Only tradespeople can access this endpoint' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT q.id, q.job_id, q.price, q.estimated_hours, q.message, q.status,
              q.created_at, q.expires_at,
              j.title AS job_title, j.category,
              u.full_name AS client_name,
              (SELECT COUNT(*) FROM quotes q2 WHERE q2.job_id = q.job_id) AS bids_total
       FROM quotes q
       JOIN jobs j ON j.id = q.job_id
       JOIN users u ON u.id = j.homeowner_user_id
       WHERE q.tradesperson_user_id = $1
       ORDER BY q.created_at DESC`,
      [id]
    );
    res.json({ quotes: result.rows });
  } catch (err) {
    console.error('List my quotes error:', err);
    res.status(500).json({ error: 'Failed to load quotes' });
  }
});

// GET /api/v1/quotes/:jobId/quotes — Homeowner fetches all quotes on their job
router.get('/:jobId/quotes', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, role } = req.user!;
  const jobId = req.params.jobId;

  try {
    const jobResult = await pool.query(
      'SELECT homeowner_user_id FROM jobs WHERE id = $1',
      [jobId]
    );
    if (jobResult.rows.length === 0) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    if (role !== 'admin' && jobResult.rows[0].homeowner_user_id !== id) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const result = await pool.query(
      `SELECT q.id, q.tradesperson_user_id, u.full_name AS tradesperson_name,
              q.price, q.estimated_hours, q.hourly_overage_rate, q.message, q.status,
              COALESCE(q.tradesperson_rating_at_submission, 0) AS rating,
              q.created_at,
              tp.trusted_badge_earned_at IS NOT NULL AS trusted
       FROM quotes q
       JOIN users u ON u.id = q.tradesperson_user_id
       LEFT JOIN tradesperson_profiles tp ON tp.user_id = q.tradesperson_user_id
       WHERE q.job_id = $1
       ORDER BY (tp.trusted_badge_earned_at IS NOT NULL) DESC,
                q.tradesperson_rating_at_submission DESC NULLS LAST,
                q.price ASC`,
      [jobId]
    );

    res.json({ quotes: result.rows });
  } catch (err) {
    console.error('Get job quotes error:', err);
    res.status(500).json({ error: 'Failed to load quotes' });
  }
});

// POST /api/v1/jobs/:jobId/quotes — Submit a quote
router.post('/:jobId/quotes', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id, role } = req.user!;
  if (role !== 'licensed_tradesperson' && role !== 'unlicensed_tradesperson') {
    res.status(403).json({ error: 'Only tradespeople can submit quotes' });
    return;
  }

  const { price, estimated_hours, hourly_overage_rate, message } = req.body;
  const jobId = req.params.jobId as string;

  try {
    // Get tradesperson rating for snapshot
    const tpResult = await pool.query('SELECT rating FROM tradesperson_profiles WHERE user_id = $1', [id]);
    const rating = tpResult.rows[0]?.rating || null;

    const result = await pool.query(
      `INSERT INTO quotes (job_id, tradesperson_user_id, price, estimated_hours, hourly_overage_rate, message,
         tradesperson_rating_at_submission, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now() + interval '48 hours')
       RETURNING *`,
      [jobId, id, price, estimated_hours, hourly_overage_rate, message, rating]
    );

    const quote = result.rows[0];

    // Update job status to 'quoted' if this is the first quote
    await pool.query(
      `UPDATE jobs SET status = 'quoted', updated_at = now() WHERE id = $1 AND status = 'open'`,
      [jobId]
    );

    // Notify the job owner. targetUserId MUST be the recipient's Firebase UID —
    // the fan-out function looks up users/{uid}.fcmToken in Firestore (keyed by
    // Firebase UID, not the Postgres user id).
    const jobResult = await pool.query(
      `SELECT j.homeowner_user_id,
              ho.firebase_uid AS homeowner_firebase_uid,
              u.full_name     AS tradesperson_name
       FROM jobs j
       JOIN users ho ON ho.id = j.homeowner_user_id
       JOIN users u  ON u.id  = $2
       WHERE j.id = $1`,
      [jobId, id]
    );
    if (jobResult.rows.length > 0) {
      const { homeowner_user_id, homeowner_firebase_uid, tradesperson_name } = jobResult.rows[0];
      const body = `${tradesperson_name} submitted a quote for $${price}`;

      // Pub/Sub fan-out → `fcm-fanout` sends the push.
      if (homeowner_firebase_uid) {
        void publish({
          event: 'quote.submitted',
          targetUserId: homeowner_firebase_uid,
          title: 'New Quote Received',
          body,
          data: { job_id: jobId, quote_id: String(quote.id), type: 'quote_received' },
        });
      }

      // In-app notification history (keyed by Postgres user id).
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, data, channel)
         VALUES ($1, 'quote_received', 'New Quote Received', $2, $3, 'push')`,
        [homeowner_user_id, body, JSON.stringify({ job_id: jobId, quote_id: quote.id })]
      );
    }

    await logAuditEvent(id, 'quote.submitted', 'quotes', quote.id, { job_id: jobId, price }, req.ip);

    res.status(201).json(quote);
  } catch (err: any) {
    if (err.constraint === 'quotes_job_id_tradesperson_user_id_key') {
      res.status(409).json({ error: 'You have already submitted a quote for this job' });
      return;
    }
    console.error('Submit quote error:', err);
    res.status(500).json({ error: 'Failed to submit quote' });
  }
});

// POST /api/v1/quotes/:id/accept — Accept a quote
router.post('/:id/accept', requireAuth, async (req: AuthenticatedRequest, res) => {
  const quoteId = req.params.id as string;

  try {
    const quoteResult = await pool.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
    if (quoteResult.rows.length === 0) { res.status(404).json({ error: 'Quote not found' }); return; }

    const quote = quoteResult.rows[0];

    // Verify the requester owns the job
    const jobResult = await pool.query('SELECT * FROM jobs WHERE id = $1', [quote.job_id]);
    if (jobResult.rows[0].homeowner_user_id !== req.user!.id) {
      res.status(403).json({ error: 'Only the job owner can accept quotes' });
      return;
    }

    // Accept this quote, reject all others
    await pool.query(
      `UPDATE quotes SET status = 'accepted', accepted_at = now(), updated_at = now() WHERE id = $1`,
      [quoteId]
    );
    await pool.query(
      `UPDATE quotes SET status = 'rejected', updated_at = now() WHERE job_id = $1 AND id != $2 AND status = 'pending'`,
      [quote.job_id, quoteId]
    );

    // Update job with assigned tradesperson
    await pool.query(
      `UPDATE jobs SET status = 'scheduled', assigned_tradesperson_id = $1, updated_at = now() WHERE id = $2`,
      [quote.tradesperson_user_id, quote.job_id]
    );

    const customerName = req.user!.full_name;
    // Resolved from the same JOIN that seeds the tracking doc, then reused as
    // the FCM target (Firebase UID, not the Postgres user id).
    let tradespersonFirebaseUid: string | null = null;

    // Create the tracking/{jobId} Firestore doc server-side (Admin SDK
    // bypasses security rules) so the poster's onSnapshot has a doc to
    // subscribe to immediately, and so the participants array can't be
    // forged by a malicious client. Kevin will tighten the client rule
    // to `allow create: if false` once this is live.
    try {
      const uidResult = await pool.query(
        `SELECT
           homeowner.firebase_uid AS homeowner_firebase_uid,
           trade.firebase_uid     AS tradesperson_firebase_uid
         FROM jobs j
         JOIN users homeowner ON homeowner.id = j.homeowner_user_id
         JOIN users trade     ON trade.id     = $1
         WHERE j.id = $2`,
        [quote.tradesperson_user_id, quote.job_id]
      );
      if (uidResult.rows.length > 0) {
        const { homeowner_firebase_uid, tradesperson_firebase_uid } = uidResult.rows[0];
        tradespersonFirebaseUid = tradesperson_firebase_uid;
        await firestore.collection('tracking').doc(String(quote.job_id)).set({
          jobId: String(quote.job_id),
          tradespersonUID: tradesperson_firebase_uid,
          posterUID:       homeowner_firebase_uid,
          participants:    [homeowner_firebase_uid, tradesperson_firebase_uid],
          lat:             null,
          lng:             null,
          status:          'accepted',
          enRouteAt:       null,
          arrivedAt:       null,
          updatedAt:       FieldValue.serverTimestamp(),
        }, { merge: true });
      } else {
        console.warn(`tracking doc skipped: could not resolve Firebase UIDs for job ${quote.job_id}`);
      }
    } catch (err) {
      // Non-fatal: quote acceptance still succeeds; tradesperson can
      // re-create the doc client-side via OnMyWayControls if needed.
      console.error('Failed to seed tracking doc:', err);
    }

    const acceptBody = `${customerName} accepted your quote for $${quote.price}`;

    // Pub/Sub fan-out → `fcm-fanout` sends the push to the tradesperson.
    // targetUserId is their Firebase UID (resolved above with the tracking JOIN).
    if (tradespersonFirebaseUid) {
      void publish({
        event: 'quote.accepted',
        targetUserId: tradespersonFirebaseUid,
        title: 'Bid Accepted!',
        body: acceptBody,
        data: { job_id: String(quote.job_id), quote_id: String(quoteId), type: 'quote_accepted' },
      });
    }

    // In-app notification history (keyed by Postgres user id).
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data, channel)
       VALUES ($1, 'quote_accepted', 'Bid Accepted!', $2, $3, 'push')`,
      [quote.tradesperson_user_id, acceptBody,
       JSON.stringify({ job_id: quote.job_id, quote_id: quoteId })]
    );

    await logAuditEvent(req.user!.id, 'quote.accepted', 'quotes', quoteId,
      { job_id: quote.job_id, tradesperson_id: quote.tradesperson_user_id }, req.ip);

    res.json({ success: true, message: 'Quote accepted', quote_id: quoteId });
  } catch (err) {
    console.error('Accept quote error:', err);
    res.status(500).json({ error: 'Failed to accept quote' });
  }
});

export default router;
