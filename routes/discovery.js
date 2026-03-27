const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

router.get('/discover', verifyToken, async (req, res) => {
    const userId = req.userId;
    const { limit = 10 } = req.query;

    try {
        const userResult = await pool.query('SELECT latitude, longitude FROM users WHERE id = $1', [userId]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const { latitude, longitude } = userResult.rows[0];

        const result = await pool.query('SELECT u.* FROM users u WHERE u.id != $1 AND u.id NOT IN (SELECT liked_id FROM likes WHERE liker_id = $1) AND u.id NOT IN (SELECT CASE WHEN user_a_id = $1 THEN user_b_id ELSE user_a_id END FROM matches WHERE (user_a_id = $1 OR user_b_id = $1) AND is_active = TRUE) AND ABS(u.latitude - $2) < 0.5 AND ABS(u.longitude - $3) < 0.5 ORDER BY (POWER(u.latitude - $2, 2) + POWER(u.longitude - $3, 2)) LIMIT $4', [userId, latitude, longitude, limit]);

        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;