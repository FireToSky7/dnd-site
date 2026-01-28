import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'characters');
const JWT_SECRET = process.env.JWT_SECRET || 'dnd-secret-key-change-in-production';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function readDb() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
    return db;
  } catch (e) {
    return { users: [], characters: [], sessions: [], upcomingSessions: [] };
  }
}

function writeDb(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function ensureAdmin() {
  const db = readDb();
  const admin = db.users.find(u => u.role === 'admin');
  const hash = bcrypt.hashSync('6852', 10);
  if (!admin) {
    db.users.push({ id: '1', login: 'admin', passwordHash: hash, role: 'admin' });
    writeDb(db);
  } else if (!bcrypt.compareSync('6852', admin.passwordHash)) {
    admin.passwordHash = hash;
    writeDb(db);
  }
}

ensureAdmin();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Нет токена' });
  try {
    req.user = jwt.verify(h.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Неверный токен' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Только для администратора' });
  next();
}

// POST /api/login
app.post('/api/login', (req, res) => {
  const { login, password } = req.body || {};
  const db = readDb();
  const u = db.users.find(x => x.login === login);
  if (!u || !bcrypt.compareSync(password || '', u.passwordHash))
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  const token = jwt.sign({ id: u.id, login: u.login, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: u.id, login: u.login, role: u.role } });
});

// GET /api/me
app.get('/api/me', auth, (req, res) => {
  const db = readDb();
  const u = db.users.find(x => x.id === req.user.id);
  if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json({ id: u.id, login: u.login, role: u.role });
});

// --- Users (admin)
app.get('/api/users', auth, adminOnly, (req, res) => {
  const db = readDb();
  const list = db.users.filter(u => u.role !== 'admin').map(({ id, login, role }) => ({ id, login, role }));
  res.json(list);
});

app.post('/api/users', auth, adminOnly, (req, res) => {
  const { login, password } = req.body || {};
  if (!login || !password) return res.status(400).json({ error: 'Нужны логин и пароль' });
  const db = readDb();
  if (db.users.some(u => u.login === login)) return res.status(400).json({ error: 'Логин занят' });
  const id = String(Date.now());
  const passwordHash = bcrypt.hashSync(password, 10);
  db.users.push({ id, login, passwordHash, role: 'user' });
  writeDb(db);
  res.status(201).json({ id, login, role: 'user' });
});

app.delete('/api/users/:id', auth, adminOnly, (req, res) => {
  const db = readDb();
  const u = db.users.find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
  if (u.role === 'admin') return res.status(403).json({ error: 'Нельзя удалить админа' });
  db.users = db.users.filter(x => x.id !== req.params.id);
  db.characters = db.characters.filter(c => c.userId !== req.params.id);
  writeDb(db);
  res.json({ ok: true });
});

// --- Characters
app.get('/api/characters', auth, (req, res) => {
  const db = readDb();
  let list = db.characters;
  if (req.user.role !== 'admin') list = list.filter(c => c.userId === req.user.id);
  res.json(list);
});

app.get('/api/characters/by-user/:userId', auth, adminOnly, (req, res) => {
  const db = readDb();
  const list = db.characters.filter(c => c.userId === req.params.userId);
  res.json(list);
});

app.post('/api/characters', auth, adminOnly, upload.single('image'), (req, res) => {
  const body = req.body || {};
  const userId = body.userId;
  const name = (body.name || '').trim();
  if (!userId || !name) return res.status(400).json({ error: 'Нужны userId и name' });
  const db = readDb();
  if (!db.users.some(u => u.id === userId)) return res.status(400).json({ error: 'Пользователь не найден' });
  const id = String(Date.now());

  let passiveAbilities = Array.isArray(body.passiveAbilities) ? body.passiveAbilities : [];
  if (!Array.isArray(body.passiveAbilities)) try { passiveAbilities = JSON.parse(body.passiveAbilities || '[]'); } catch { }
  if (!Array.isArray(passiveAbilities)) passiveAbilities = [];
  let activeAbilities = Array.isArray(body.activeAbilities) ? body.activeAbilities : [];
  if (!Array.isArray(body.activeAbilities)) try { activeAbilities = JSON.parse(body.activeAbilities || '[]'); } catch { }
  if (!Array.isArray(activeAbilities)) activeAbilities = [];
  let items = Array.isArray(body.items) ? body.items : [];
  if (!Array.isArray(body.items)) try { items = JSON.parse(body.items || '[]'); } catch { }
  if (!Array.isArray(items)) items = [];

  const ch = {
    id, userId, name,
    imageUrl: null,
    bio: (body.bio || '').trim(),
    weapon: (body.weapon || '').trim(),
    hp: parseInt(body.hp, 10) || 0,
    maxHp: parseInt(body.maxHp, 10) || 0,
    armorClass: parseInt(body.armorClass, 10) || 10,
    initiative: parseInt(body.initiative, 10) || 0,
    strength: parseInt(body.strength, 10) ?? 0,
    dexterity: parseInt(body.dexterity, 10) ?? 0,
    constitution: parseInt(body.constitution, 10) ?? 0,
    intelligence: parseInt(body.intelligence, 10) ?? 0,
    wisdom: parseInt(body.wisdom, 10) ?? 0,
    charisma: parseInt(body.charisma, 10) ?? 0,
    emeralds: parseInt(body.emeralds, 10) || 0,
    rerollTokens: parseInt(body.rerollTokens, 10) || 0,
    passiveAbilities: passiveAbilities.filter(a => a && (a.name || a.description)),
    activeAbilities: activeAbilities.filter(a => a && (a.name || a.description)),
    items: items.filter(a => a && (a.name || a.description))
  };

  if (req.file && req.file.buffer) {
    const ext = (req.file.originalname || '').toLowerCase().match(/\.(jpe?g|png|gif|webp)$/);
    const safeExt = ext ? ext[1].replace('jpeg', 'jpg') : 'jpg';
    const filename = id + '.' + safeExt;
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
    ch.imageUrl = '/uploads/characters/' + filename;
  }

  db.characters.push(ch);
  writeDb(db);
  res.status(201).json(ch);
});

app.put('/api/characters/:id', auth, adminOnly, upload.single('image'), (req, res) => {
  const body = req.body || {};
  const id = req.params.id;
  const db = readDb();
  const i = db.characters.findIndex(c => c.id === id);
  if (i < 0) return res.status(404).json({ error: 'Персонаж не найден' });
  const prev = db.characters[i];

  const userId = (body.userId || prev.userId || '').trim();
  const name = (body.name || prev.name || '').trim();
  if (!userId || !name) return res.status(400).json({ error: 'Нужны userId и name' });
  if (!db.users.some(u => u.id === userId)) return res.status(400).json({ error: 'Пользователь не найден' });

  let passiveAbilities = Array.isArray(body.passiveAbilities) ? body.passiveAbilities : prev.passiveAbilities;
  if (!Array.isArray(body.passiveAbilities)) try { passiveAbilities = JSON.parse(body.passiveAbilities || '[]'); } catch { }
  if (!Array.isArray(passiveAbilities)) passiveAbilities = [];
  let activeAbilities = Array.isArray(body.activeAbilities) ? body.activeAbilities : prev.activeAbilities;
  if (!Array.isArray(body.activeAbilities)) try { activeAbilities = JSON.parse(body.activeAbilities || '[]'); } catch { }
  if (!Array.isArray(activeAbilities)) activeAbilities = [];
  let items = Array.isArray(body.items) ? body.items : (prev.items || []);
  if (!Array.isArray(body.items)) try { items = body.items != null ? JSON.parse(body.items || '[]') : (prev.items || []); } catch { }
  if (!Array.isArray(items)) items = [];

  const ch = {
    ...prev,
    userId,
    name,
    bio: (body.bio != null ? body.bio : prev.bio || '').trim(),
    weapon: (body.weapon != null ? body.weapon : prev.weapon || '').trim(),
    hp: parseInt(body.hp, 10) >= 0 ? parseInt(body.hp, 10) : (prev.hp ?? 0),
    maxHp: parseInt(body.maxHp, 10) >= 0 ? parseInt(body.maxHp, 10) : (prev.maxHp ?? 0),
    armorClass: parseInt(body.armorClass, 10) >= 0 ? parseInt(body.armorClass, 10) : (prev.armorClass ?? 10),
    initiative: parseInt(body.initiative, 10) || 0,
    strength: parseInt(body.strength, 10) ?? (prev.strength ?? 0),
    dexterity: parseInt(body.dexterity, 10) ?? (prev.dexterity ?? 0),
    constitution: parseInt(body.constitution, 10) ?? (prev.constitution ?? 0),
    intelligence: parseInt(body.intelligence, 10) ?? (prev.intelligence ?? 0),
    wisdom: parseInt(body.wisdom, 10) ?? (prev.wisdom ?? 0),
    charisma: parseInt(body.charisma, 10) ?? (prev.charisma ?? 0),
    emeralds: parseInt(body.emeralds, 10) >= 0 ? parseInt(body.emeralds, 10) : (prev.emeralds ?? 0),
    rerollTokens: parseInt(body.rerollTokens, 10) >= 0 ? parseInt(body.rerollTokens, 10) : (prev.rerollTokens ?? 0),
    passiveAbilities: passiveAbilities.filter(a => a && (a.name || a.description)),
    activeAbilities: activeAbilities.filter(a => a && (a.name || a.description)),
    items: items.filter(a => a && (a.name || a.description))
  };

  if (req.file && req.file.buffer) {
    if (prev.imageUrl) {
      const oldPath = path.join(__dirname, prev.imageUrl);
      try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
    }
    const ext = (req.file.originalname || '').toLowerCase().match(/\.(jpe?g|png|gif|webp)$/);
    const safeExt = ext ? ext[1].replace('jpeg', 'jpg') : 'jpg';
    const filename = id + '.' + safeExt;
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
    ch.imageUrl = '/uploads/characters/' + filename;
  } else {
    ch.imageUrl = prev.imageUrl;
  }

  db.characters[i] = ch;
  writeDb(db);
  res.json(ch);
});

app.delete('/api/characters/:id', auth, adminOnly, (req, res) => {
  const db = readDb();
  const i = db.characters.findIndex(c => c.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Персонаж не найден' });
  const ch = db.characters[i];
  db.characters.splice(i, 1);
  db.sessions.forEach(s => { if (s.characterIds) s.characterIds = s.characterIds.filter(id => id !== ch.id); });
  (db.upcomingSessions || []).forEach(s => { if (s.characterIds) s.characterIds = s.characterIds.filter(id => id !== ch.id); });
  if (ch.imageUrl) {
    const fp = path.join(__dirname, ch.imageUrl);
    try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
  }
  writeDb(db);
  res.json({ ok: true });
});

// --- Sessions
app.get('/api/sessions', auth, (req, res) => {
  const db = readDb();
  const list = db.sessions.map(s => {
    const participants = (s.characterIds || [])
      .map(id => db.characters.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({ id: c.id, name: c.name, imageUrl: c.imageUrl || null }));
    return { ...s, participants };
  });
  res.json(list);
});

app.post('/api/sessions', auth, adminOnly, (req, res) => {
  const { title, date, description, characterIds } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Нужен заголовок' });
  const db = readDb();
  const id = String(Date.now());
  const ids = Array.isArray(characterIds) ? characterIds : [];
  const s = { id, title: (title || '').trim(), date: date || new Date().toISOString().slice(0, 10), description: (description || '').trim(), characterIds: ids };
  db.sessions.push(s);
  writeDb(db);
  const participants = ids.map(id => db.characters.find(c => c.id === id)).filter(Boolean).map(c => ({ id: c.id, name: c.name, imageUrl: c.imageUrl || null }));
  res.status(201).json({ ...s, participants });
});

app.put('/api/sessions/:id', auth, adminOnly, (req, res) => {
  const { title, date, description, characterIds } = req.body || {};
  const id = req.params.id;
  const db = readDb();
  const i = db.sessions.findIndex(s => s.id === id);
  if (i < 0) return res.status(404).json({ error: 'Сессия не найдена' });
  const prev = db.sessions[i];
  const s = {
    ...prev,
    title: (title != null ? title : prev.title || '').trim(),
    date: date != null ? (date || '') : (prev.date || ''),
    description: (description != null ? description : prev.description || '').trim(),
    characterIds: Array.isArray(characterIds) ? characterIds : (prev.characterIds || [])
  };
  if (!s.title) return res.status(400).json({ error: 'Нужен заголовок' });
  db.sessions[i] = s;
  writeDb(db);
  const participants = (s.characterIds || []).map(cid => db.characters.find(c => c.id === cid)).filter(Boolean).map(c => ({ id: c.id, name: c.name, imageUrl: c.imageUrl || null }));
  res.json({ ...s, participants });
});

app.delete('/api/sessions/:id', auth, adminOnly, (req, res) => {
  const db = readDb();
  const i = db.sessions.findIndex(s => s.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Сессия не найдена' });
  db.sessions.splice(i, 1);
  writeDb(db);
  res.json({ ok: true });
});

// --- Upcoming sessions (следующие партии)
app.get('/api/upcoming-sessions', auth, (req, res) => {
  const db = readDb();
  const list = (db.upcomingSessions || []).map(s => {
    const participants = (s.characterIds || [])
      .map(id => db.characters.find(c => c.id === id))
      .filter(Boolean)
      .map(c => ({ id: c.id, name: c.name, imageUrl: c.imageUrl || null }));
    return { ...s, participants };
  });
  res.json(list);
});

app.post('/api/upcoming-sessions', auth, adminOnly, (req, res) => {
  const { title, date, description, characterIds } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Нужен заголовок' });
  const db = readDb();
  if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
  const id = String(Date.now());
  const ids = Array.isArray(characterIds) ? characterIds : [];
  const s = { id, title: (title || '').trim(), date: date || '', description: (description || '').trim(), characterIds: ids };
  db.upcomingSessions.push(s);
  writeDb(db);
  const participants = ids.map(cid => db.characters.find(c => c.id === cid)).filter(Boolean).map(c => ({ id: c.id, name: c.name, imageUrl: c.imageUrl || null }));
  res.status(201).json({ ...s, participants });
});

app.put('/api/upcoming-sessions/:id', auth, adminOnly, (req, res) => {
  const { title, date, description, characterIds } = req.body || {};
  const id = req.params.id;
  const db = readDb();
  if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
  const i = db.upcomingSessions.findIndex(s => s.id === id);
  if (i < 0) return res.status(404).json({ error: 'Запись не найдена' });
  const prev = db.upcomingSessions[i];
  const s = {
    ...prev,
    title: (title != null ? title : prev.title || '').trim(),
    date: date != null ? (date || '') : (prev.date || ''),
    description: (description != null ? description : prev.description || '').trim(),
    characterIds: Array.isArray(characterIds) ? characterIds : (prev.characterIds || [])
  };
  if (!s.title) return res.status(400).json({ error: 'Нужен заголовок' });
  db.upcomingSessions[i] = s;
  writeDb(db);
  const participants = (s.characterIds || []).map(cid => db.characters.find(c => c.id === cid)).filter(Boolean).map(c => ({ id: c.id, name: c.name, imageUrl: c.imageUrl || null }));
  res.json({ ...s, participants });
});

app.delete('/api/upcoming-sessions/:id', auth, adminOnly, (req, res) => {
  const db = readDb();
  if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
  const i = db.upcomingSessions.findIndex(s => s.id === req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Запись не найдена' });
  db.upcomingSessions.splice(i, 1);
  writeDb(db);
  res.json({ ok: true });
});

// В production: раздаём собранный React (все в одном — один URL для друзей)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Сервер на http://localhost:' + PORT));
