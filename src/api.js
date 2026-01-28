const API = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function getHeaders(useAuth = true) {
  const h = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (useAuth && t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

export async function login(login, password) {
  const r = await fetch(API + '/login', { method: 'POST', headers: getHeaders(false), body: JSON.stringify({ login, password }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка входа');
  return j;
}

export async function me() {
  const r = await fetch(API + '/me', { headers: getHeaders() });
  if (r.status === 401) return null;
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function getUsers() {
  const r = await fetch(API + '/users', { headers: getHeaders() });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function createUser(login, password) {
  const r = await fetch(API + '/users', { method: 'POST', headers: getHeaders(), body: JSON.stringify({ login, password }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function deleteUser(id) {
  const r = await fetch(API + '/users/' + id, { method: 'DELETE', headers: getHeaders() });
  const j = r.status === 204 ? {} : await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
}

export async function getCharacters() {
  const r = await fetch(API + '/characters', { headers: getHeaders() });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function createCharacter(data, imageFile = null) {
  const t = getToken();
  const auth = t ? { 'Authorization': 'Bearer ' + t } : {};
  let r;
  if (imageFile) {
    const fd = new FormData();
    fd.append('userId', data.userId);
    fd.append('name', data.name);
    fd.append('bio', data.bio || '');
    fd.append('weapon', data.weapon || '');
    fd.append('hp', String(data.hp ?? 0));
    fd.append('maxHp', String(data.maxHp ?? 0));
    fd.append('armorClass', String(data.armorClass ?? 10));
    fd.append('initiative', String(data.initiative ?? 0));
    fd.append('strength', String(data.strength ?? 0));
    fd.append('dexterity', String(data.dexterity ?? 0));
    fd.append('constitution', String(data.constitution ?? 0));
    fd.append('intelligence', String(data.intelligence ?? 0));
    fd.append('wisdom', String(data.wisdom ?? 0));
    fd.append('charisma', String(data.charisma ?? 0));
    fd.append('passiveAbilities', JSON.stringify(data.passiveAbilities || []));
    fd.append('activeAbilities', JSON.stringify(data.activeAbilities || []));
    fd.append('items', JSON.stringify(data.items || []));
    fd.append('emeralds', String(data.emeralds ?? 0));
    fd.append('rerollTokens', String(data.rerollTokens ?? 0));
    fd.append('image', imageFile);
    r = await fetch(API + '/characters', { method: 'POST', headers: auth, body: fd });
  } else {
    r = await fetch(API + '/characters', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function updateCharacter(id, data, imageFile = null) {
  const t = getToken();
  const auth = t ? { 'Authorization': 'Bearer ' + t } : {};
  let r;
  if (imageFile) {
    const fd = new FormData();
    fd.append('userId', data.userId);
    fd.append('name', data.name);
    fd.append('bio', data.bio || '');
    fd.append('weapon', data.weapon || '');
    fd.append('hp', String(data.hp ?? 0));
    fd.append('maxHp', String(data.maxHp ?? 0));
    fd.append('armorClass', String(data.armorClass ?? 10));
    fd.append('initiative', String(data.initiative ?? 0));
    fd.append('strength', String(data.strength ?? 0));
    fd.append('dexterity', String(data.dexterity ?? 0));
    fd.append('constitution', String(data.constitution ?? 0));
    fd.append('intelligence', String(data.intelligence ?? 0));
    fd.append('wisdom', String(data.wisdom ?? 0));
    fd.append('charisma', String(data.charisma ?? 0));
    fd.append('emeralds', String(data.emeralds ?? 0));
    fd.append('rerollTokens', String(data.rerollTokens ?? 0));
    fd.append('passiveAbilities', JSON.stringify(data.passiveAbilities || []));
    fd.append('activeAbilities', JSON.stringify(data.activeAbilities || []));
    fd.append('items', JSON.stringify(data.items || []));
    fd.append('image', imageFile);
    r = await fetch(API + '/characters/' + id, { method: 'PUT', headers: auth, body: fd });
  } else {
    r = await fetch(API + '/characters/' + id, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
  }
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function deleteCharacter(id) {
  const r = await fetch(API + '/characters/' + id, { method: 'DELETE', headers: getHeaders() });
  const j = r.status === 204 ? {} : await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
}

export async function getSessions() {
  const r = await fetch(API + '/sessions', { headers: getHeaders() });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function createSession(data) {
  const r = await fetch(API + '/sessions', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function updateSession(id, data) {
  const r = await fetch(API + '/sessions/' + id, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function deleteSession(id) {
  const r = await fetch(API + '/sessions/' + id, { method: 'DELETE', headers: getHeaders() });
  const j = r.status === 204 ? {} : await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
}

export async function getUpcomingSessions() {
  const r = await fetch(API + '/upcoming-sessions', { headers: getHeaders() });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function createUpcomingSession(data) {
  const r = await fetch(API + '/upcoming-sessions', { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function updateUpcomingSession(id, data) {
  const r = await fetch(API + '/upcoming-sessions/' + id, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
  return j;
}

export async function deleteUpcomingSession(id) {
  const r = await fetch(API + '/upcoming-sessions/' + id, { method: 'DELETE', headers: getHeaders() });
  const j = r.status === 204 ? {} : await r.json();
  if (!r.ok) throw new Error(j.error || 'Ошибка');
}
