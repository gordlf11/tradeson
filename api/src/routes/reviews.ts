import { Router } from 'express';
import pool from '../config/db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

// POST /api/v1/reviews
// Creates a review for a completed job. One review per (job, reviewer) pair.
// Also updates tradesperson_profiles.rating with a rolling average.
// Frontend previously wrote to Firestore reviews collection — this replaces that call.
router.post('/', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id: reviewerId } = req.user!;
  if (!reviewerId) { res.status(401).json({ error: 'User not found' }); return; }

  const { job_id, reviewee_id, rating, comment } = req.body;

  if (!job_id || !reviewee_id || !rating) {
    res.status(400).json({ error: 'job_id, reviewee_id, and rating are required' });
    return;
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
    return;
  }

  try {
    const jobResult = await pool.query(
      `SELECT status FROM jobs WHERE id = $1 AND deleted_at IS NULL`,
      [job_id]
    );
    if (jobResult.rows.length === 0) { res.status(404).json({ error: 'Job not found' }); return; }
    if (jobResult.rows[0].status !== 'completed') {
      res.status(400).json({ error: 'Reviews can only be submitted for completed jobs' });
      return;
    }

    const review = await pool.query(
      `INSERT INTO reviews (job_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [job_id, reviewerId, reviewee_id, rating, comment || null]
    );

    // Update tradesperson rolling average rating
    await pool.query(
      `UPDATE tradesperson_profiles SET
         rating = (
           SELECT ROUND(AVG(r.rating)::numeric, 2)
           FROM reviews r WHERE r.reviewee_id = $1
         ),
         updated_at = now()
       WHERE user_id = $1`,
      [reviewee_id]
    );

    await logAuditEvent(reviewerId, 'review.submitted', 'reviews', review.rows[0].id, { job_id, rating }, req.ip);

    res.status(201).json(review.rows[0]);
  } catch (err: any) {
    if (err.code === '23505') {
      res.status(409).json({ error: 'You have already reviewed this job' });
      return;
    }
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/v1/reviews/:tradespersonId
// Returns all reviews for a tradesperson, newest first.
router.get('/:tradespersonId', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { tradespersonId } = req.params;

  try {
    const result = await pool.query(
      `SELECT r.*, u.full_name AS reviewer_name
       FROM reviews r
       JOIN users u ON u.id = r.reviewer_id
       WHERE r.reviewee_id = $1
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [tradespersonId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('List reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

export default router;
