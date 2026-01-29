import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'data', 'db.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"
const GITHUB_DB_PATH = 'data/db.json';
const GITHUB_PORTRAITS_DIR = 'data/portraits';

const DEFAULT_DB = () => ({ users: [], characters: [], sessions: [], upcomingSessions: [] });

export const useGitHub = () => !!(GITHUB_TOKEN && GITHUB_REPO && GITHUB_REPO.includes('/'));

function ghUrl(filePath) {
  const [owner, repo] = GITHUB_REPO.split('/', 2);
  return `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
}

const ghHeaders = () => ({
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json'
});

async function githubReadDb() {
  const res = await fetch(ghUrl(GITHUB_DB_PATH), { headers: ghHeaders() });
  if (res.status === 404) return DEFAULT_DB();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const b64 = (json.content || '').replace(/\n/g, '');
  const str = Buffer.from(b64, 'base64').toString('utf8').trim();
  if (!str) throw new Error('GitHub db.json is empty or invalid (possible truncation). Refusing to overwrite.');
  let parsed;
  try {
    parsed = JSON.parse(str);
  } catch (_) {
    throw new Error('GitHub db.json parse error (file may be corrupted or response truncated). Refusing to overwrite.');
  }
  if (!Array.isArray(parsed.upcomingSessions)) parsed.upcomingSessions = [];
  return parsed;
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
  const stripped = {
    users: data.users,
    characters: characters.map(ch => {
      if (!ch) return ch;
      const { imageBase64, imageMime, ...rest } = ch;
      if (imageBase64) rest.hasPortrait = true;
      return rest;
    }),
    sessions: data.sessions || [],
    upcomingSessions: data.upcomingSessions || []
  };
  const url = ghUrl(GITHUB_DB_PATH);
  let sha = null;
  try {
    const getRes = await fetch(url, { headers: ghHeaders() });
    if (getRes.ok) {
      const j = await getRes.json();
      sha = j.sha;
    }
  } catch (_) {}
  const body = {
    message: 'Update db.json',
    content: Buffer.from(JSON.stringify(stripped), 'utf8').toString('base64')
  };
  if (sha) body.sha = sha;
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!putRes.ok) throw new Error(`GitHub API PUT ${putRes.status}: ${await putRes.text()}`);
}

function fileReadDb() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
    return db;
  } catch (e) {
    return DEFAULT_DB();
  }
}

function fileWriteDb(data) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
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
