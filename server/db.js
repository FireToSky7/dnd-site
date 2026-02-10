import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DATA_PATH = path.join(DATA_DIR, 'db.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"
const GITHUB_DATA_DIR = 'data';
const GITHUB_DB_PATH = `${GITHUB_DATA_DIR}/db.json`;
const GITHUB_CHARACTERS_PATH = `${GITHUB_DATA_DIR}/characters.json`;
const GITHUB_SESSIONS_PATH = `${GITHUB_DATA_DIR}/sessions.json`;
const GITHUB_MAP_PATH = `${GITHUB_DATA_DIR}/map.json`;
const GITHUB_PORTRAITS_DIR = 'data/portraits';

const DEFAULT_DB = () => ({ users: [], characters: [], sessions: [], upcomingSessions: [] });
const DEFAULT_MAP = () => ({ landscapes: [], zones: [], places: [], characterPaths: {}, placeSessions: {} });

export const useGitHub = () => !!(GITHUB_TOKEN && GITHUB_REPO && GITHUB_REPO.includes('/'));

function ghUrl(filePath) {
  const [owner, repo] = GITHUB_REPO.split('/', 2);
  return `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
}

const ghHeaders = () => ({
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json'
});

async function ghFetchJson(filePath) {
  const res = await fetch(ghUrl(filePath), { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const b64 = (json.content || '').replace(/\n/g, '');
  const str = Buffer.from(b64, 'base64').toString('utf8').trim();
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (_) {
    throw new Error(`GitHub ${filePath} parse error.`);
  }
}

async function githubReadDb() {
  const dbRes = await fetch(ghUrl(GITHUB_DB_PATH), { headers: ghHeaders() });
  if (dbRes.status === 404) return { ...DEFAULT_DB(), map: DEFAULT_MAP() };
  if (!dbRes.ok) throw new Error(`GitHub API ${dbRes.status}: ${await dbRes.text()}`);
  const dbJson = await dbRes.json();
  const dbB64 = (dbJson.content || '').replace(/\n/g, '');
  const dbStr = Buffer.from(dbB64, 'base64').toString('utf8').trim();
  if (!dbStr) throw new Error('GitHub db.json is empty or invalid. Refusing to overwrite.');
  let dbParsed;
  try {
    dbParsed = JSON.parse(dbStr);
  } catch (_) {
    throw new Error('GitHub db.json parse error. Refusing to overwrite.');
  }
  if (!Array.isArray(dbParsed.users)) dbParsed.users = [];

  const hasLegacyFormat = Array.isArray(dbParsed.characters) || Array.isArray(dbParsed.sessions) || dbParsed.map != null;
  if (hasLegacyFormat) {
    if (!Array.isArray(dbParsed.upcomingSessions)) dbParsed.upcomingSessions = [];
    if (dbParsed.map == null) dbParsed.map = DEFAULT_MAP();
    return dbParsed;
  }

  const [characters, sessionsData, mapData] = await Promise.all([
    ghFetchJson(GITHUB_CHARACTERS_PATH),
    ghFetchJson(GITHUB_SESSIONS_PATH),
    ghFetchJson(GITHUB_MAP_PATH)
  ]);

  return {
    users: dbParsed.users,
    characters: Array.isArray(characters) ? characters : [],
    sessions: Array.isArray(sessionsData?.sessions) ? sessionsData.sessions : [],
    upcomingSessions: Array.isArray(sessionsData?.upcomingSessions) ? sessionsData.upcomingSessions : [],
    map: mapData && typeof mapData === 'object' ? mapData : DEFAULT_MAP()
  };
}

/** Сохранить портрет в data/portraits/{id}.json */
async function githubPutPortrait(characterId, base64, mime) {
  const filePath = `${GITHUB_PORTRAITS_DIR}/${characterId}.json`;
  const url = ghUrl(filePath);
  let sha = null;
  try {
    const getRes = await fetch(url, { headers: ghHeaders() });
    if (getRes.ok) {
      const j = await getRes.json();
      sha = j.sha;
    }
  } catch (_) {}
  const body = {
    message: `Update portrait ${characterId}`,
    content: Buffer.from(JSON.stringify({ base64, mime }), 'utf8').toString('base64')
  };
  if (sha) body.sha = sha;
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!putRes.ok) throw new Error(`GitHub portrait PUT ${putRes.status}: ${await putRes.text()}`);
}

/** Удалить портрет из репо */
export async function deleteCharacterPortraitInGitHub(characterId) {
  const filePath = `${GITHUB_PORTRAITS_DIR}/${characterId}.json`;
  const url = ghUrl(filePath);
  let sha = null;
  try {
    const getRes = await fetch(url, { headers: ghHeaders() });
    if (getRes.ok) {
      const j = await getRes.json();
      sha = j.sha;
    }
  } catch (_) {}
  if (!sha) return;
  const delRes = await fetch(url, {
    method: 'DELETE',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Remove portrait ${characterId}`, sha })
  });
  if (!delRes.ok && delRes.status !== 404) throw new Error(`GitHub portrait DELETE ${delRes.status}: ${await delRes.text()}`);
}

/** Прочитать портрет из data/portraits/{id}.json (только для GitHub) */
export async function getCharacterPortraitFromGitHub(characterId) {
  const filePath = `${GITHUB_PORTRAITS_DIR}/${characterId}.json`;
  const res = await fetch(ghUrl(filePath), { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub portrait GET ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const b64 = (json.content || '').replace(/\n/g, '');
  const str = Buffer.from(b64, 'base64').toString('utf8');
  try {
    const { base64, mime } = JSON.parse(str);
    return base64 ? { base64, mime: mime || 'image/jpeg' } : null;
  } catch (_) {
    return null;
  }
}

async function ghGetSha(filePath) {
  const getRes = await fetch(ghUrl(filePath), { headers: ghHeaders() });
  if (!getRes.ok) return null;
  const j = await getRes.json();
  return j.sha || null;
}

async function ghPutFile(filePath, content, message) {
  const url = ghUrl(filePath);
  let sha = await ghGetSha(filePath);
  const body = {
    message,
    content: Buffer.from(JSON.stringify(content), 'utf8').toString('base64')
  };
  if (sha) body.sha = sha;
  let putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (putRes.status === 409) {
    sha = await ghGetSha(filePath);
    if (sha) {
      body.sha = sha;
      putRes = await fetch(url, {
        method: 'PUT',
        headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    }
  }
  if (!putRes.ok) throw new Error(`GitHub PUT ${filePath} ${putRes.status}: ${await putRes.text()}`);
}

async function githubWriteDb(data) {
  if (!Array.isArray(data.users) || data.users.length === 0) {
    throw new Error('Refusing to write: no users (possible read error). Data not saved.');
  }
  const characters = data.characters || [];
  for (const ch of characters) {
    if (ch && ch.imageBase64) {
      await githubPutPortrait(ch.id, ch.imageBase64, ch.imageMime || 'image/jpeg');
    }
  }
  const strippedCharacters = characters.map(ch => {
    if (!ch) return ch;
    const { imageBase64, imageMime, ...rest } = ch;
    if (imageBase64) rest.hasPortrait = true;
    return rest;
  });

  await Promise.all([
    ghPutFile(GITHUB_DB_PATH, { users: data.users }, 'Update users (db.json)'),
    ghPutFile(GITHUB_CHARACTERS_PATH, strippedCharacters, 'Update characters'),
    ghPutFile(
      GITHUB_SESSIONS_PATH,
      { sessions: data.sessions || [], upcomingSessions: data.upcomingSessions || [] },
      'Update sessions'
    ),
    ghPutFile(
      GITHUB_MAP_PATH,
      data.map && typeof data.map === 'object' ? data.map : DEFAULT_MAP(),
      'Update map'
    )
  ]);
}

const CHAR_PATH = path.join(DATA_DIR, 'characters.json');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
const MAP_PATH = path.join(DATA_DIR, 'map.json');

function fileReadJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function fileReadDb() {
  try {
    if (!fs.existsSync(DATA_PATH)) return { ...DEFAULT_DB(), map: DEFAULT_MAP() };
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.users)) db.users = [];
    const hasLegacy = Array.isArray(db.characters) || Array.isArray(db.sessions) || db.map != null;
    if (hasLegacy) {
      if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
      if (db.map == null) db.map = DEFAULT_MAP();
      return db;
    }
    const characters = fileReadJson(CHAR_PATH, []);
    const sessionsData = fileReadJson(SESSIONS_PATH, {});
    const mapData = fileReadJson(MAP_PATH, null);
    return {
      users: db.users,
      characters: Array.isArray(characters) ? characters : [],
      sessions: Array.isArray(sessionsData.sessions) ? sessionsData.sessions : [],
      upcomingSessions: Array.isArray(sessionsData.upcomingSessions) ? sessionsData.upcomingSessions : [],
      map: mapData && typeof mapData === 'object' ? mapData : DEFAULT_MAP()
    };
  } catch (_) {
    return { ...DEFAULT_DB(), map: DEFAULT_MAP() };
  }
}

function fileWriteDb(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const users = data.users || [];
  const characters = data.characters || [];
  const sessions = data.sessions || [];
  const upcomingSessions = data.upcomingSessions || [];
  const map = data.map && typeof data.map === 'object' ? data.map : DEFAULT_MAP();
  fs.writeFileSync(DATA_PATH, JSON.stringify({ users }, null, 2), 'utf8');
  fs.writeFileSync(CHAR_PATH, JSON.stringify(characters, null, 2), 'utf8');
  fs.writeFileSync(SESSIONS_PATH, JSON.stringify({ sessions, upcomingSessions }, null, 2), 'utf8');
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2), 'utf8');
}

export async function readDb() {
  if (useGitHub()) return githubReadDb();
  return Promise.resolve(fileReadDb());
}

export async function writeDb(data) {
  if (useGitHub()) return githubWriteDb(data);
  return Promise.resolve(fileWriteDb(data));
}

/** URL для портрета: /api/characters/:id/portrait при imageBase64 или hasPortrait, иначе imageUrl */
export function getCharacterImageUrl(c) {
  if (c && (c.imageBase64 || c.hasPortrait)) return '/api/characters/' + c.id + '/portrait';
  return (c && c.imageUrl) || null;
}

/** Убрать imageBase64/imageMime из ответа и выставить imageUrl для портрета */
export function stripCharacter(ch) {
  if (!ch) return ch;
  const { imageBase64, imageMime, hasPortrait, ...rest } = ch;
  if (imageBase64 || hasPortrait) rest.imageUrl = '/api/characters/' + ch.id + '/portrait';
  return rest;
}
