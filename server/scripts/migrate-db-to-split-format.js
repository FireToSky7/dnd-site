/**
 * Один раз перевести существующий data/db.json в новый формат (4 файла).
 * Данные не меняются — только раскладываются по файлам.
 *
 * Запуск из корня проекта dnd-site:
 *   node server/scripts/migrate-db-to-split-format.js
 *
 * Или из папки server:
 *   node scripts/migrate-db-to-split-format.js
 *
 * Читает data/db.json. Если в нём есть characters/sessions/map (старый формат),
 * создаёт/перезаписывает: data/db.json (только users), data/characters.json,
 * data/sessions.json, data/map.json. Портреты в data/portraits/ не трогает.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(projectRoot, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');
const CHAR_PATH = path.join(DATA_DIR, 'characters.json');
const SESSIONS_PATH = path.join(DATA_DIR, 'sessions.json');
const MAP_PATH = path.join(DATA_DIR, 'map.json');

const DEFAULT_MAP = () => ({
  landscapes: [],
  zones: [],
  places: [],
  characterPaths: {},
  placeSessions: {}
});

function main() {
  if (!fs.existsSync(DB_PATH)) {
    console.error('Файл не найден:', DB_PATH);
    console.error('Запускайте скрипт из корня проекта (dnd-site).');
    process.exit(1);
  }

  const raw = fs.readFileSync(DB_PATH, 'utf8');
  let db;
  try {
    db = JSON.parse(raw);
  } catch (e) {
    console.error('Ошибка разбора db.json:', e.message);
    process.exit(1);
  }

  const hasLegacy =
    Array.isArray(db.characters) ||
    Array.isArray(db.sessions) ||
    (db.map != null && typeof db.map === 'object');

  if (!hasLegacy) {
    console.log('В db.json уже новый формат (только users) или нет данных для переноса. Ничего не делаем.');
    process.exit(0);
  }

  const users = Array.isArray(db.users) ? db.users : [];
  const characters = Array.isArray(db.characters) ? db.characters : [];
  const sessions = Array.isArray(db.sessions) ? db.sessions : [];
  const upcomingSessions = Array.isArray(db.upcomingSessions) ? db.upcomingSessions : [];
  const map =
    db.map != null && typeof db.map === 'object' ? db.map : DEFAULT_MAP();

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  fs.writeFileSync(DB_PATH, JSON.stringify({ users }, null, 2), 'utf8');
  fs.writeFileSync(CHAR_PATH, JSON.stringify(characters, null, 2), 'utf8');
  fs.writeFileSync(
    SESSIONS_PATH,
    JSON.stringify({ sessions, upcomingSessions }, null, 2),
    'utf8'
  );
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2), 'utf8');

  console.log('Готово. Данные разнесены по файлам (без изменения содержимого):');
  console.log('  data/db.json       — пользователи');
  console.log('  data/characters.json — персонажи');
  console.log('  data/sessions.json  — сессии и предстоящие');
  console.log('  data/map.json        — карта');
}

main();
