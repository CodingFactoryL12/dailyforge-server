const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

// 🧱 Datenbank vorbereiten
const db = new sqlite3.Database("./users.db");
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  xp INTEGER DEFAULT 0
)`);

// 🧙 Dummy-Quest-Generator lokal ohne API
function generateQuests(username, xpLevel) {
  const base = [
    {
      title: "🧘 Zen-Modus aktivieren",
      description: "Verbringe 5 Minuten im Zen-Modus ohne Ablenkung.",
      xp: 25,
      duration: "5 min"
    },
    {
      title: "💡 Ideen notieren",
      description: "Schreibe 3 Stichworte zu neuen Projekten.",
      xp: 15,
      duration: "10 min"
    },
    {
      title: "🛍️ Schmiede-Shop betreten",
      description: "Besuche den Shop und sieh dir 2 Items an.",
      xp: 10,
      duration: "3 min"
    },
    {
      title: "📜 Rhythmus notieren",
      description: "Halte deinen Flow für heute schriftlich fest.",
      xp: 20,
      duration: "7 min"
    }
  ];

  // Auswahl abhängig von XP
  if (xpLevel > 50) {
    base.push({
      title: "🧠 Expertenmodus",
      description: "Nutze alle Forge-Features für 15 Minuten.",
      xp: 50,
      duration: "15 min"
    });
  }

  return base.sort(() => 0.5 - Math.random()).slice(0, 3);
}

// 🔐 Registrierung
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hash = await bcrypt.hash(password, 10);
  db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], function (err) {
    if (err) return res.status(400).json({ error: "Benutzername existiert bereits" });
    res.json({ success: true });
  });
});

// 🔑 Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(403).json({ error: "Ungültige Zugangsdaten" });
    }
    const token = jwt.sign({ id: user.id, username }, "secret", { expiresIn: "1d" });
    res.json({ token, xp: user.xp });
  });
});

// 🧪 XP speichern
app.post("/save-xp", (req, res) => {
  const { token, xp } = req.body;
  try {
    const decoded = jwt.verify(token, "secret");
    db.run(`UPDATE users SET xp = ? WHERE id = ?`, [xp, decoded.id], (err) => {
      if (err) return res.status(500).json({ error: "Fehler beim Speichern" });
      res.json({ success: true });
    });
  } catch (err) {
    res.status(403).json({ error: "Ungültiger Token" });
  }
});

// 🧠 Quests generieren
app.post("/generate-quests", (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, "secret");
    db.get(`SELECT xp FROM users WHERE id = ?`, [decoded.id], (err, row) => {
      if (err || !row) return res.status(404).json({ error: "Benutzer nicht gefunden" });
      const quests = generateQuests(decoded.username, row.xp || 0);
      res.json(quests);
    });
  } catch (err) {
    res.status(403).json({ error: "Ungültiger Token" });
  }
});

// 🔍 Test-Endpunkt zur Bestätigung
app.get("/save-xp", (req, res) => {
  res.send("✅ XP-Endpoint erreichbar und bereit für POST");
});

// 🚀 Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Forge-Server läuft unter http://localhost:${PORT}`));
