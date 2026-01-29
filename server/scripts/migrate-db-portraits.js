/**
 * Один раз мигрировать db.json: вынести портреты в data/portraits/{id}.json,
 * загрузить облегчённый db.json в репо. Запуск:
 *   cd server && node scripts/migrate-db-portraits.js "путь/к/db (2).json"
 * Нужны GITHUB_TOKEN и GITHUB_REPO в окружении.
 */
import fs from 'fs';

const backupPath = process.argv[2];
if (!backupPath) {
  console.error('Укажите путь к файлу: node scripts/migrate-db-portraits.js "путь/к/db.json"');
  process.exit(1);
}

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO;
if (!GITHUB_TOKEN || !GITHUB_REPO) {
  console.error('Задайте GITHUB_TOKEN и GITHUB_REPO в окружении.');
  process.exit(1);
}

const ghUrl = (path) => {
  const [owner, repo] = GITHUB_REPO.split('/', 2);
  return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
};
const ghHeaders = () => ({
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github.v3+json'
});

async function putFile(filePath, content, message) {
  const url = ghUrl(filePath);
  let sha = null;
  try {
    const r = await fetch(url, { headers: ghHeaders() });
    if (r.ok) {
      const j = await r.json();
      sha = j.sha;
    }
  } catch (_) {}
  const body = {
    message: message || `Update ${filePath}`,
    content: Buffer.from(typeof content === 'string' ? content : JSON.stringify(content), 'utf8').toString('base64')
  };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${filePath} PUT ${res.status}: ${await res.text()}`);
}

const raw = fs.readFileSync(backupPath, 'utf8');
const db = JSON.parse(raw);
const characters = db.characters || [];

console.log('Персонажей с портретами:', characters.filter(c => c && c.imageBase64).length);

for (const ch of characters) {
  if (!ch || !ch.imageBase64) continue;
  await putFile(`data/portraits/${ch.id}.json`, { base64: ch.imageBase64, mime: ch.imageMime || 'image/jpeg' }, `Portrait ${ch.id}`);
  console.log('  Портрет записан:', ch.id);
}

const stripped = {
  users: db.users || [],
  characters: characters.map(ch => {
    if (!ch) return ch;
    const { imageBase64, imageMime, ...rest } = ch;
    if (imageBase64) rest.hasPortrait = true;
    return rest;
  }),
  sessions: db.sessions || [],
  upcomingSessions: db.upcomingSessions || []
};

await putFile('data/db.json', JSON.stringify(stripped, null, 2), 'Migrate db: portraits moved to data/portraits/');
console.log('db.json загружен (без base64 в персонажах). Готово.');
