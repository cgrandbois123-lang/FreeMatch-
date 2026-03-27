const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

router.get('/my-matches', verifyToken, async (req, res) => {
    const userId = req.userId;
    try {
        const result = await pool.query(
            'SELECT m.id, m.matched_at, CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END as matched_user_id, CASE WHEN m.user_a_id = $1 THEN (SELECT username FROM users WHERE id = m.user_b_id) ELSE (SELECT username FROM users WHERE id = m.user_a_id) END as matched_username, CASE WHEN m.user_a_id = $1 THEN (SELECT first_name FROM users WHERE id = m.user_b_id) ELSE (SELECT first_name FROM users WHERE id = m.user_a_id) END as matched_first_name, CASE WHEN m.user_a_id = $1 THEN (SELECT profile_photo_url FROM users WHERE id = m.user_b_id) ELSE (SELECT profile_photo_url FROM users WHERE id = m.user_a_id) END as matched_photo, CASE WHEN m.user_a_id = $1 THEN (SELECT bio FROM users WHERE id = m.user_b_id) ELSE (SELECT bio FROM users WHERE id = m.user_a_id) END as matched_bio FROM matches m WHERE (m.user_a_id = $1 OR m.user_b_id = $1) AND m.is_active = TRUE ORDER BY m.matched_at DESC',
            [userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/match/:match_id', verifyToken, async (req, res) => {
    const { match_id } = req.params;
    const userId = req.userId;
    try {
        const result = await pool.query(
            'SELECT * FROM matches WHERE id = $1 AND (user_a_id = $2 OR user_b_id = $2)',
            [match_id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/unmatch/:match_id', verifyToken, async (req, res) => {
    const { match_id } = req.params;
    const userId = req.userId;
    try {
        const match = await pool.query('SELECT * FROM matches WHERE id = $1', [match_id]);
        if (match.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }
        if (match.rows[0].user_a_id !== userId && match.rows[0].user_b_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const result = await pool.query('UPDATE matches SET is_active = FALSE WHERE id = $1 RETURNING *', [match_id]);
        res.json({ message: 'Match removed', match: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;