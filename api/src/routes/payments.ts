import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';

const router = Router();

// GET /api/v1/payments/me
// Returns payments where the current user is payer OR payee, with invoice PDF url.
// Frontend field mapping:
//   jobTitle      ← job_title     | gross    ← amount (tradesperson view)
//   amount        ← amount        | net      ← net_payout
//   platformFee   ← platform_fee  | status   ← status
//   date          ← date (ISO)    | invoiceUrl ← invoice_url (null until PDF generated)
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.user!;
  if (!id) { res.status(401).json({ error: 'User not found' }); return; }

  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.amount,
        p.platform_fee,
        p.net_payout,
        p.status,
        p.created_at                                              AS date,
        j.title                                                   AS job_title,
        j.category,
        i.pdf_url                                                 AS invoice_url,
        CASE WHEN p.payer_user_id = $1 THEN 'payment' ELSE 'earning' END AS tx_type
      FROM payments p
      JOIN jobs j ON j.id = p.job_id
      LEFT JOIN invoices i ON i.payment_id = p.id
      WHERE p.payer_user_id = $1 OR p.payee_user_id = $1
      ORDER BY p.created_at DESC
      LIMIT 100
    `, [id]);

    res.json(result.rows);
  } catch (err) {
    console.error('payments/me error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export default router;
