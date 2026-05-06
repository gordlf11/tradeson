import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';
import { publish } from '../services/pubsub';
import { messaging } from '../services/firebase';

const router = Router();

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

    // Send FCM notification to job owner
    const jobResult = await pool.query(
      `SELECT j.homeowner_user_id, u.full_name as tradesperson_name
       FROM jobs j, users u WHERE j.id = $1 AND u.id = $2`,
      [jobId, id]
    );
    if (jobResult.rows.length > 0) {
      const { homeowner_user_id, tradesperson_name } = jobResult.rows[0];

      // Pub/Sub fan-out: Cloud Function `fcm-fanout` consumes this and sends the push.
      void publish({
        event: 'quote.submitted',
        targetUserId: homeowner_user_id,
        title: 'New Quote Received',
        body: `${tradesperson_name} submitted a quote for $${price}`,
        data: { job_id: jobId, quote_id: String(quote.id), type: 'quote_received' },
      });

      // TODO(K-D): remove this inline FCM block once the fan-out function is verified
      // live in production. The Pub/Sub event above will deliver the same push.
      const tokenResult = await pool.query(
        'SELECT token FROM device_tokens WHERE user_id = $1 AND is_active = true',
        [homeowner_user_id]
      );
      for (const { token } of tokenResult.rows) {
        try {
          await messaging.send({
            token,
            notification: {
              title: 'New Quote Received',
              body: `${tradesperson_name} submitted a quote for $${price}`,
            },
            data: { job_id: jobId, quote_id: quote.id, type: 'quote_received' },
          });
        } catch (fcmErr) {
          console.error('FCM send error:', fcmErr);
        }
      }

      // Save notification record
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, data, channel)
         VALUES ($1, 'quote_received', 'New Quote Received', $2, $3, 'push')`,
        [homeowner_user_id, `${tradesperson_name} submitted a quote for $${price}`,
         JSON.stringify({ job_id: jobId, quote_id: quote.id })]
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

    // Pub/Sub fan-out: Cloud Function `fcm-fanout` consumes this and sends the push.
    void publish({
      event: 'quote.accepted',
      targetUserId: quote.tradesperson_user_id,
      title: 'Bid Accepted!',
      body: `${customerName} accepted your quote for $${quote.price}`,
      data: { job_id: String(quote.job_id), quote_id: String(quoteId), type: 'quote_accepted' },
    });

    // TODO(K-D): remove this inline FCM block once the fan-out function is verified
    // live in production. The Pub/Sub event above will deliver the same push.
    const tokenResult = await pool.query(
      'SELECT token FROM device_tokens WHERE user_id = $1 AND is_active = true',
      [quote.tradesperson_user_id]
    );
    for (const { token } of tokenResult.rows) {
      try {
        await messaging.send({
          token,
          notification: {
            title: 'Bid Accepted!',
            body: `${customerName} accepted your quote for $${quote.price}`,
          },
          data: { job_id: quote.job_id, quote_id: quoteId, type: 'quote_accepted' },
        });
      } catch (fcmErr) {
        console.error('FCM send error:', fcmErr);
      }
    }

    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, data, channel)
       VALUES ($1, 'quote_accepted', 'Bid Accepted!', $2, $3, 'push')`,
      [quote.tradesperson_user_id, `${customerName} accepted your quote for $${quote.price}`,
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
