const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

router.post('/like', verifyToken, async (req, res) => {
    const { liked_id } = req.body;
    const liker_id = req.userId;
    if (!liked_id) {
        return res.status(400).json({ error: 'liked_id is required' });
    }
    if (liker_id === liked_id) {
        return res.status(400).json({ error: 'Cannot like yourself' });
    }
    try {
        const existingLike = await pool.query('SELECT * FROM likes WHERE liker_id = $1 AND liked_id = $2', [liker_id, liked_id]);
        if (existingLike.rows.length > 0) {
            return res.status(400).json({ error: 'You already liked this user' });
        }
        const likeResult = await pool.query('INSERT INTO likes (liker_id, liked_id) VALUES ($1, $2) RETURNING *', [liker_id, liked_id]);
        const mutualLike = await pool.query('SELECT * FROM likes WHERE liker_id = $1 AND liked_id = $2', [liked_id, liker_id]);
        let matched = false;
        if (mutualLike.rows.length > 0) {
            const user_a_id = Math.min(liker_id, liked_id);
            const user_b_id = Math.max(liker_id, liked_id);
            await pool.query('INSERT INTO matches (user_a_id, user_b_id) VALUES ($1, $2)', [user_a_id, user_b_id]);
            matched = true;
        }
        res.status(201).json({ message: matched ? 'Match created!' : 'Like created', like: likeResult.rows[0], matched });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/unlike/:liked_id', verifyToken, async (req, res) => {
    const { liked_id } = req.params;
    const liker_id = req.userId;
    try {
        const result = await pool.query('DELETE FROM likes WHERE liker_id = $1 AND liked_id = $2 RETURNING *', [liker_id, liked_id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Like not found' });
        }
        res.json({ message: 'Like removed', like: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/my-likes', verifyToken, async (req, res) => {
    const liker_id = req.userId;
    try {
        const result = await pool.query('SELECT u.* FROM users u INNER JOIN likes l ON u.id = l.liked_id WHERE l.liker_id = $1 ORDER BY l.created_at DESC', [liker_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/likes-received', verifyToken, async (req, res) => {
    const liked_id = req.userId;
    try {
        const result = await pool.query('SELECT u.* FROM users u INNER JOIN likes l ON u.id = l.liker_id WHERE l.liked_id = $1 AND NOT EXISTS (SELECT 1 FROM matches WHERE (user_a_id = $1 AND user_b_id = u.id) OR (user_b_id = $1 AND user_a_id = u.id)) ORDER BY l.created_at DESC', [liked_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;