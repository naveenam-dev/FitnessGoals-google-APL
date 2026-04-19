const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';

// Middleware
const auth = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (e) {
        res.status(400).json({ error: 'Token is not valid' });
    }
};

// Get all workouts for user
router.get('/', auth, async (req, res) => {
    try {
        const db = getDb();
        const workouts = await db.all('SELECT * FROM workouts WHERE user_id = ? ORDER BY date DESC', [req.userId]);
        // Rename id to _id for frontend compatibility if needed, or update frontend.
        // Let's map id to _id to avoid changing app.js
        const mappedWorkouts = workouts.map(w => ({ ...w, _id: w.id.toString() }));
        res.json(mappedWorkouts);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Create new workout
router.post('/', auth, async (req, res) => {
    try {
        const db = getDb();
        const { type, duration, intensity, date } = req.body;
        const result = await db.run(
            'INSERT INTO workouts (user_id, type, duration, intensity, date) VALUES (?, ?, ?, ?, ?)',
            [req.userId, type, duration, intensity, date || new Date().toISOString()]
        );
        const newWorkout = await db.get('SELECT * FROM workouts WHERE id = ?', [result.lastID]);
        res.status(201).json({ ...newWorkout, _id: newWorkout.id.toString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Update workout
router.put('/:id', auth, async (req, res) => {
    try {
        const db = getDb();
        const { type, duration, intensity, date } = req.body;
        const result = await db.run(
            'UPDATE workouts SET type = ?, duration = ?, intensity = ?, date = ? WHERE id = ? AND user_id = ?',
            [type, duration, intensity, date, req.params.id, req.userId]
        );
        if (result.changes === 0) return res.status(404).json({ error: 'Workout not found' });
        const updatedWorkout = await db.get('SELECT * FROM workouts WHERE id = ?', [req.params.id]);
        res.json({ ...updatedWorkout, _id: updatedWorkout.id.toString() });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Delete workout
router.delete('/:id', auth, async (req, res) => {
    try {
        const db = getDb();
        const result = await db.run('DELETE FROM workouts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
        if (result.changes === 0) return res.status(404).json({ error: 'Workout not found' });
        res.json({ message: 'Workout deleted' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
