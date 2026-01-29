import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, 'data', 'db.json');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // "owner/repo"
const GITHUB_DB_PATH = 'data/db.json';

const DEFAULT_DB = () => ({ users: [], characters: [], sessions: [], upcomingSessions: [] });

export const useGitHub = () => !!(GITHUB_TOKEN && GITHUB_REPO && GITHUB_REPO.includes('/'));

async function githubReadDb() {
  const [owner, repo] = GITHUB_REPO.split('/', 2);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_DB_PATH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
  });
  if (res.status === 404) return DEFAULT_DB();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const b64 = (json.content || '').replace(/\n/g, '');
  const str = Buffer.from(b64, 'base64').toString('utf8').trim();
  if (!str) return DEFAULT_DB();
  let db;
  try {
    db = JSON.parse(str);
  } catch (_) {
    return DEFAULT_DB();
  }
  if (!Array.isArray(db.upcomingSessions)) db.upcomingSessions = [];
  return db;
}

async function githubWriteDb(data) {
  const [owner, repo] = GITHUB_REPO.split('/', 2);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_DB_PATH}`;
  let sha = null;
  try {
    const getRes = await fetch(url, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (getRes.ok) {
      const j = await getRes.json();
      sha = j.sha;
    }
  } catch (_) {}
  const body = {
    message: 'Update db.json',
    content: Buffer.from(JSON.stringify(data), 'utf8').toString('base64')
  };
  if (sha) body.sha = sha;
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
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

/** URL для портрета: /api/characters/:id/portrait при imageBase64, иначе imageUrl */
export function getCharacterImageUrl(c) {
  if (c && c.imageBase64) return '/api/characters/' + c.id + '/portrait';
  return (c && c.imageUrl) || null;
}

/** Убрать imageBase64/imageMime из ответа и выставить imageUrl для портрета */
export function stripCharacter(ch) {
  if (!ch) return ch;
  const { imageBase64, imageMime, ...rest } = ch;
  if (imageBase64) rest.imageUrl = '/api/characters/' + ch.id + '/portrait';
  return rest;
}
