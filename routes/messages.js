const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { verifyToken } = require('../middleware/auth');

router.post('/send', verifyToken, async (req, res) => {
    const { match_id, content } = req.body;
    const sender_id = req.userId;

    if (!match_id || !content) {
        return res.status(400).json({ error: 'match_id and content are required' });
    }

    try {
        const match = await pool.query('SELECT * FROM matches WHERE id = $1', [match_id]);
        if (match.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }

        if (match.rows[0].user_a_id !== sender_id && match.rows[0].user_b_id !== sender_id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await pool.query('INSERT INTO messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *', [match_id, sender_id, content]);
        res.status(201).json({ message: 'Message sent', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/conversation/:match_id', verifyToken, async (req, res) => {
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

        const result = await pool.query('SELECT * FROM messages WHERE match_id = $1 ORDER BY created_at ASC', [match_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/delete/:message_id', verifyToken, async (req, res) => {
    const { message_id } = req.params;
    const userId = req.userId;

    try {
        const message = await pool.query('SELECT * FROM messages WHERE id = $1', [message_id]);
        if (message.rows.length === 0) {
            return res.status(404).json({ error: 'Message not found' });
        }

        if (message.rows[0].sender_id !== userId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const result = await pool.query('DELETE FROM messages WHERE id = $1 RETURNING *', [message_id]);
        res.json({ message: 'Message deleted', data: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;