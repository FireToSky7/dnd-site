import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDb, writeDb, useGitHub, getCharacterImageUrl, stripCharacter, getCharacterPortraitFromGitHub, deleteCharacterPortraitInGitHub } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'characters');
const JWT_SECRET = process.env.JWT_SECRET || 'dnd-secret-key-change-in-production';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function ensureAdmin() {
  const db = await readDb();
  const admin = db.users.find(u => u.role === 'admin');
  const hash = bcrypt.hashSync('6852', 10);
  if (!admin) {
    db.users.push({ id: '1', login: 'admin', passwordHash: hash, role: 'admin' });
    await writeDb(db);
  } else if (!bcrypt.compareSync('6852', admin.passwordHash)) {
    admin.passwordHash = hash;
    await writeDb(db);
  }
}

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
app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body || {};
    const db = await readDb();
    const u = db.users.find(x => x.login === login);
    if (!u || !bcrypt.compareSync(password || '', u.passwordHash))
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    const token = jwt.sign({ id: u.id, login: u.login, role: u.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: u.id, login: u.login, role: u.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/me
app.get('/api/me', auth, async (req, res) => {
  try {
    const db = await readDb();
    const u = db.users.find(x => x.id === req.user.id);
    if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json({ id: u.id, login: u.login, role: u.role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Users (admin)
app.get('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const db = await readDb();
    const list = db.users.filter(u => u.role !== 'admin').map(({ id, login, role }) => ({ id, login, role }));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const { login, password } = req.body || {};
    if (!login || !password) return res.status(400).json({ error: 'Нужны логин и пароль' });
    const db = await readDb();
    if (db.users.some(u => u.login === login)) return res.status(400).json({ error: 'Логин занят' });
    const id = String(Date.now());
    const passwordHash = bcrypt.hashSync(password, 10);
    db.users.push({ id, login, passwordHash, role: 'user' });
    await writeDb(db);
    res.status(201).json({ id, login, role: 'user' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const db = await readDb();
    const u = db.users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: 'Пользователь не найден' });
    if (u.role === 'admin') return res.status(403).json({ error: 'Нельзя удалить админа' });
    db.users = db.users.filter(x => x.id !== req.params.id);
    db.characters = db.characters.filter(c => c.userId !== req.params.id);
    await writeDb(db);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Characters
app.get('/api/characters', auth, async (req, res) => {
  try {
    const db = await readDb();
    let list = db.characters;
    if (req.user.role !== 'admin') list = list.filter(c => c.userId === req.user.id);
    res.json(list.map(stripCharacter));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/characters/by-user/:userId', auth, adminOnly, async (req, res) => {
  try {
    const db = await readDb();
    const list = db.characters.filter(c => c.userId === req.params.userId).map(stripCharacter);
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Портрет без auth: <img src> не шлёт Authorization. ID малопредсказуем; для дружеского DnD-сайта допускаем.
app.get('/api/characters/:id/portrait', async (req, res) => {
  try {
    const db = await readDb();
    const ch = db.characters.find(c => c.id === req.params.id);
    if (!ch) return res.status(404).json({ error: 'Нет портрета' });
    let base64, mime;
    if (ch.imageBase64) {
      base64 = ch.imageBase64;
      mime = ch.imageMime || 'image/jpeg';
    } else if (useGitHub() && ch.hasPortrait) {
      const portrait = await getCharacterPortraitFromGitHub(ch.id);
      if (!portrait) return res.status(404).json({ error: 'Нет портрета' });
      base64 = portrait.base64;
      mime = portrait.mime || 'image/jpeg';
    } else {
      return res.status(404).json({ error: 'Нет портрета' });
    }
    const buf = Buffer.from(base64, 'base64');
    res.set('Content-Type', mime);
    res.send(buf);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/characters', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body.userId;
    const name = (body.name || '').trim();
    if (!userId || !name) return res.status(400).json({ error: 'Нужны userId и name' });
    const db = await readDb();
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
      if (useGitHub()) {
        ch.imageBase64 = req.file.buffer.toString('base64');
        ch.imageMime = req.file.mimetype || 'image/jpeg';
      } else {
        const ext = (req.file.originalname || '').toLowerCase().match(/\.(jpe?g|png|gif|webp)$/);
        const safeExt = ext ? ext[1].replace('jpeg', 'jpg') : 'jpg';
        const filename = id + '.' + safeExt;
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
        ch.imageUrl = '/uploads/characters/' + filename;
      }
    }

    db.characters.push(ch);
    await writeDb(db);
    res.status(201).json(stripCharacter(ch));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/characters/:id', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const body = req.body || {};
    const id = req.params.id;
    const db = await readDb();
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
      if (useGitHub()) {
        ch.imageBase64 = req.file.buffer.toString('base64');
        ch.imageMime = req.file.mimetype || 'image/jpeg';
        delete ch.imageUrl;
      } else {
        if (prev.imageUrl) {
          const oldPath = path.join(UPLOADS_DIR, path.basename(prev.imageUrl));
          try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
        }
        const ext = (req.file.originalname || '').toLowerCase().match(/\.(jpe?g|png|gif|webp)$/);
        const safeExt = ext ? ext[1].replace('jpeg', 'jpg') : 'jpg';
        const filename = id + '.' + safeExt;
        if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), req.file.buffer);
        ch.imageUrl = '/uploads/characters/' + filename;
      }
    } else {
      if (!useGitHub()) ch.imageUrl = prev.imageUrl;
    }

    db.characters[i] = ch;
    await writeDb(db);
    res.json(stripCharacter(ch));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/characters/:id', auth, adminOnly, async (req, res) => {
  try {
    const db = await readDb();
    const i = db.characters.findIndex(c => c.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Персонаж не найден' });
    const ch = db.characters[i];
    db.characters.splice(i, 1);
    db.sessions.forEach(s => { if (s.characterIds) s.characterIds = s.characterIds.filter(id => id !== ch.id); });
    (db.upcomingSessions || []).forEach(s => { if (s.characterIds) s.characterIds = s.characterIds.filter(id => id !== ch.id); });
    if (useGitHub() && (ch.hasPortrait || ch.imageBase64)) {
      try { await deleteCharacterPortraitInGitHub(ch.id); } catch (_) {}
    } else if (!useGitHub() && ch.imageUrl) {
      const fp = path.join(UPLOADS_DIR, path.basename(ch.imageUrl));
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch (_) {}
    }
    await writeDb(db);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Sessions
function mapParticipants(db, characterIds) {
  return (characterIds || [])
    .map(id => db.characters.find(c => c.id === id))
    .filter(Boolean)
    .map(c => ({ id: c.id, name: c.name, imageUrl: getCharacterImageUrl(c) }));
}

app.get('/api/sessions', auth, async (req, res) => {
  try {
    const db = await readDb();
    const list = db.sessions.map(s => ({ ...s, participants: mapParticipants(db, s.characterIds) }));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/sessions', auth, adminOnly, async (req, res) => {
  try {
    const { title, date, description, characterIds } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Нужен заголовок' });
    const db = await readDb();
    const id = String(Date.now());
    const ids = Array.isArray(characterIds) ? characterIds : [];
    const s = { id, title: (title || '').trim(), date: date || new Date().toISOString().slice(0, 10), description: (description || '').trim(), characterIds: ids };
    db.sessions.push(s);
    await writeDb(db);
    res.status(201).json({ ...s, participants: mapParticipants(db, ids) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/sessions/:id', auth, adminOnly, async (req, res) => {
  try {
    const { title, date, description, characterIds } = req.body || {};
    const id = req.params.id;
    const db = await readDb();
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
    await writeDb(db);
    res.json({ ...s, participants: mapParticipants(db, s.characterIds) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/sessions/:id', auth, adminOnly, async (req, res) => {
  try {
    const db = await readDb();
    const i = db.sessions.findIndex(s => s.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Сессия не найдена' });
    db.sessions.splice(i, 1);
    await writeDb(db);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Upcoming sessions (следующие партии)
app.get('/api/upcoming-sessions', auth, async (req, res) => {
  try {
    const db = await readDb();
    const arr = db.upcomingSessions || [];
    const list = arr.map(s => ({ ...s, participants: mapParticipants(db, s.characterIds) }));
    res.json(list);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/upcoming-sessions', auth, adminOnly, async (req, res) => {
  try {
    const { title, date, description, characterIds } = req.body || {};
    if (!title) return res.status(400).json({ error: 'Нужен заголовок' });
    const db = await readDb();
    if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
    const id = String(Date.now());
    const ids = Array.isArray(characterIds) ? characterIds : [];
    const s = { id, title: (title || '').trim(), date: date || '', description: (description || '').trim(), characterIds: ids };
    db.upcomingSessions.push(s);
    await writeDb(db);
    res.status(201).json({ ...s, participants: mapParticipants(db, ids) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/upcoming-sessions/:id', auth, adminOnly, async (req, res) => {
  try {
    const { title, date, description, characterIds } = req.body || {};
    const id = req.params.id;
    const db = await readDb();
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
    await writeDb(db);
    res.json({ ...s, participants: mapParticipants(db, s.characterIds) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/upcoming-sessions/:id', auth, adminOnly, async (req, res) => {
  try {
    const db = await readDb();
    if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
    const i = db.upcomingSessions.findIndex(s => s.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: 'Запись не найдена' });
    db.upcomingSessions.splice(i, 1);
    await writeDb(db);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// В production: раздаём собранный React (все в одном — один URL для друзей)
const distPath = path.join(__dirname, '../dist');
if (fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
(async () => {
  await ensureAdmin();
  const storageLabel = useGitHub() ? ' (GitHub)' : ' (файлы)';
app.listen(PORT, () => console.log('Сервер на http://localhost:' + PORT + storageLabel));
})();
