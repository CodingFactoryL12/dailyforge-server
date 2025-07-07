const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const app = express();
app.use(cors());
app.use(express.json());

// 🧱 Datenbank vorbereiten
const db = new sqlite3.Database('./users.db');
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  xp INTEGER DEFAULT 0
)`);

// 🔐 Registrierung
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function (err) {
    if (err) return res.status(400).json({ error: 'Benutzername existiert bereits' });
    res.json({ success: true });
  });
});

// 🔑 Login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(403).json({ error: 'Ungültige Zugangsdaten' });
    }
    const token = jwt.sign({ id: user.id, username }, 'secret', { expiresIn: '1d' });
    res.json({ token, xp: user.xp });
  });
});

// 🧠 XP speichern
app.post('/save-xp', (req, res) => {
  const { token, xp } = req.body;
  try {
    const decoded = jwt.verify(token, 'secret');
    db.run(`UPDATE users SET xp = ? WHERE id = ?`, [xp, decoded.id]);
    res.json({ success: true });
  } catch {
    res.status(403).json({ error: 'Ungültiger Token' });
  }
});

app.listen(3000, () => console.log('🚀 Forge-Server läuft unter http://localhost:3000'));
