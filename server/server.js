const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyD0ROg3IYjltX4WwwV7yzvr-3TcOjwmDz0");
const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("Anfrage:", req.method, req.url);
  next();
});

//-------------UI-----------------------
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/login.html"));
});
//---------------------------------------
app.get("/mainmenu", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/mainmenu.html"));

//--------------------------------------------

app.get("/register", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/register.html"));

//-------------------------------

app.get("/quest", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/quest/quest.html"));

const db = new sqlite3.Database("./users.db");
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  password TEXT,
  xp INTEGER DEFAULT 0,
  profile TEXT DEFAULT '{}'
);
`);

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



app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (username, password) VALUES (?, ?)`,
    [username, hashed],
    (err) => {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          res.status(409).json({ error: "Benutzername bereits vergeben" });
        } else {
          res.status(500).json({ error: "Fehler beim Registrieren" });
        }
      } else {
        res.json({ success: true });
      }
    }
  );
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err) return res.status(500).json({ error: "Serverfehler beim Login" });
    if (!user) return res.status(404).json({ error: "Benutzer nicht gefunden" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(403).json({ error: "Falsches Passwort" });

    const token = jwt.sign({ id: user.id, username: user.username }, "secret", { expiresIn: "7d" });

    res.json({
      token,
      xp: user.xp || 0
    });
  });
});

app.post("/load-xp", (req, res) => {
  const { token } = req.body;

  try {
    const decoded = jwt.verify(token, "secret");

    db.get(`SELECT xp FROM users WHERE id = ?`, [decoded.id], (err, row) => {
      if (err || !row) {
        console.error("Fehler beim Laden der XP:", err?.message || "Kein Benutzer gefunden");
        return res.status(500).json({ error: "XP konnte nicht geladen werden" });
      }

      res.json({ xp: row.xp || 0 });
    });
  } catch (err) {
    console.error("Ungültiger Token:", err.message);
    res.status(403).json({ error: "Token ungültig" });
  }
});

app.post("/save-xp", (req, res) => {
  const { token, xp } = req.body;

  try {
    const decoded = jwt.verify(token, "secret");

    db.run(`UPDATE users SET xp = ? WHERE id = ?`, [xp, decoded.id], (err) => {
      if (err) {
        console.error("Fehler beim Speichern der XP:", err.message);
        return res.status(500).json({ error: "XP konnte nicht gespeichert werden" });
      }

      res.json({ success: true });
    });
  } catch (err) {
    console.error("Token ungültig:", err.message);
    res.status(403).json({ error: "Token ungültig" });
  }
});

app.use((req, res, next) => {
  console.log("Anfrage:", req.method, req.url);
  console.log("Body:", req.body);
  next();
});
