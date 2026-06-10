const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite database
const db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create table if it doesn't exist
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            title TEXT NOT NULL,
            time TEXT,
            color_code TEXT NOT NULL,
            is_done INTEGER DEFAULT 0
        )`);
    }
});

// RESTful APIs

// 1. GET all tasks for a specific month (or all)
app.get('/api/tasks', (req, res) => {
    const { month } = req.query; // format YYYY-MM
    let sql = `SELECT * FROM tasks`;
    let params = [];
    
    if (month) {
        sql += ` WHERE date LIKE ?`;
        params.push(`${month}-%`);
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// GET tasks for a specific date
app.get('/api/tasks/:date', (req, res) => {
    const date = req.params.date;
    db.all(`SELECT * FROM tasks WHERE date = ? ORDER BY time ASC`, [date], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: rows
        });
    });
});

// 2. POST create a new task
app.post('/api/tasks', (req, res) => {
    const { date, title, time, color_code } = req.body;
    
    if (!date || !title || !color_code) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
    }

    const sql = `INSERT INTO tasks (date, title, time, color_code, is_done) VALUES (?, ?, ?, ?, 0)`;
    const params = [date, title, time, color_code];

    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            data: {
                id: this.lastID,
                date,
                title,
                time,
                color_code,
                is_done: 0
            }
        });
    });
});

// 3. PUT/PATCH update a task (including is_done)
app.patch('/api/tasks/:id', (req, res) => {
    const id = req.params.id;
    const { is_done, title, time, color_code } = req.body;
    
    // Build dynamic query
    let fields = [];
    let params = [];
    
    if (is_done !== undefined) {
        fields.push('is_done = ?');
        params.push(is_done ? 1 : 0);
    }
    if (title !== undefined) {
        fields.push('title = ?');
        params.push(title);
    }
    if (time !== undefined) {
        fields.push('time = ?');
        params.push(time);
    }
    if (color_code !== undefined) {
        fields.push('color_code = ?');
        params.push(color_code);
    }

    if (fields.length === 0) {
        res.status(400).json({ error: 'No fields to update' });
        return;
    }

    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    params.push(id);

    db.run(sql, params, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            changes: this.changes
        });
    });
});

// 4. DELETE a task
app.delete('/api/tasks/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM tasks WHERE id = ?`, id, function(err) {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json({
            message: 'success',
            changes: this.changes
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
