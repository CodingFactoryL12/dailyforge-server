const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("DEIN_GEMINI_API_KEY");
const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./users.db");
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  xp INTEGER DEFAULT 0,
  profile TEXT DEFAULT '{}'
)`);

// Prompt-Builder
function buildPrompt(profile) {
  const username = profile.username || "Spieler";
  const xp = profile.xp || 0;
  const prefs = profile.preferences?.join(", ") || "keine Angaben";
  const avoid = profile.avoids?.join(", ") || "keine";

  return `
Nutzer: ${username}
XP: ${xp}
Vorlieben: ${prefs}
Vermeide: ${avoid}
Erstelle 3 DailyForge-Quests, die zu seinem Stil passen.
Gib die Ausgabe im JSON-Format zurück mit Feldern: title, description, xp, duration.
`;
}

// Route zum Speichern des Nutzerprofils
app.post("/save-profile", (req, res) => {
  const { token, profile } = req.body;
  try {
    const decoded = jwt.verify(token, "secret");
    const data = JSON.stringify(profile);
    db.run(`UPDATE users SET profile = ? WHERE id = ?`, [data, decoded.id], (err) => {
      if (err) return res.status(500).json({ error: "Fehler beim Speichern" });
      res.json({ success: true });
    });
  } catch {
    res.status(403).json({ error: "Ungültiger Token" });
  }
});

// Route zum Generieren von Quests mit KI
app.post("/generate-quests", async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, "secret");
    db.get(`SELECT xp, profile FROM users WHERE id = ?`, [decoded.id], async (err, row) => {
      if (err || !row) return res.status(404).json({ error: "Nutzer nicht gefunden" });
      const profileData = JSON.parse(row.profile || "{}");
      profileData.username = decoded.username;
      profileData.xp = row.xp || 0;

      const prompt = buildPrompt(profileData);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      const result = await model.generateContent(prompt);
      const text = await result.response.text();

      try {
        const quests = JSON.parse(text);
        res.json(quests);
      } catch {
        res.status(500).json({ error: "Fehler beim Parsen der KI-Antwort", raw: text });
      }
    });
  } catch {
    res.status(403).json({ error: "Ungültiger Token" });
  }
});

app.listen(3000, () => console.log("🚀 Forge-Server aktiv unter Port 3000"));
