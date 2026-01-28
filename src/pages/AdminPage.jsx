import { useState, useEffect, useRef } from 'react';
import {
  getUsers, createUser, deleteUser,
  getCharacters, createCharacter, updateCharacter, deleteCharacter,
  getSessions, createSession, updateSession, deleteSession,
  getUpcomingSessions, createUpcomingSession, updateUpcomingSession, deleteUpcomingSession
} from '../api';
import CharacterCard from '../components/CharacterCard';
import CharacterCardModal from '../components/CharacterCardModal';
import EditCharacterModal from '../components/EditCharacterModal';
import EditSessionModal from '../components/EditSessionModal';
import SessionBlock from '../components/SessionBlock';
import './AdminPage.css';

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const [newLogin, setNewLogin] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [chUserId, setChUserId] = useState('');
  const [chName, setChName] = useState('');
  const [chBio, setChBio] = useState('');
  const [chWeapon, setChWeapon] = useState('');
  const [chHp, setChHp] = useState('');
  const [chMaxHp, setChMaxHp] = useState('');
  const [chAc, setChAc] = useState(10);
  const [chInitiative, setChInitiative] = useState(0);
  const [chStr, setChStr] = useState(0);
  const [chDex, setChDex] = useState(0);
  const [chCon, setChCon] = useState(0);
  const [chInt, setChInt] = useState(0);
  const [chWis, setChWis] = useState(0);
  const [chCha, setChCha] = useState(0);
  const [chPassive, setChPassive] = useState([{ name: '', description: '' }]);
  const [chActive, setChActive] = useState([{ name: '', uses: '', description: '' }]);
  const [chItems, setChItems] = useState([{ name: '', description: '' }]);
  const [chEmeralds, setChEmeralds] = useState(0);
  const [chRerollTokens, setChRerollTokens] = useState(0);
  const [chImageFile, setChImageFile] = useState(null);
  const chImageRef = useRef(null);

  const [viewModalCharacter, setViewModalCharacter] = useState(null);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [editingUpcomingSession, setEditingUpcomingSession] = useState(null);

  const [sessTitle, setSessTitle] = useState('');
  const [sessDate, setSessDate] = useState(new Date().toISOString().slice(0, 10));
  const [sessDesc, setSessDesc] = useState('');
  const [sessCharacterIds, setSessCharacterIds] = useState([]);

  const [upTitle, setUpTitle] = useState('');
  const [upDate, setUpDate] = useState('');
  const [upDesc, setUpDesc] = useState('');
  const [upCharacterIds, setUpCharacterIds] = useState([]);

  const load = () => {
    setLoading(true);
    setErr('');
    Promise.all([getUsers(), getCharacters(), getSessions(), getUpcomingSessions()])
      .then(([u, c, s, up]) => { setUsers(u); setCharacters(c); setSessions(s); setUpcomingSessions(up); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const addUser = async (e) => {
    e.preventDefault();
    if (!newLogin.trim() || !newPassword) return;
    setErr('');
    try {
      await createUser(newLogin.trim(), newPassword);
      setNewLogin(''); setNewPassword('');
      load();
    } catch (e) { setErr(e.message); }
  };

  const removeUser = async (id) => { if (confirm('Удалить пользователя?')) { setErr(''); try { await deleteUser(id); load(); } catch (e) { setErr(e.message); } } };

  const addCharacter = async (e) => {
    e.preventDefault();
    if (!chUserId || !chName.trim()) { setErr('Укажите пользователя и имя персонажа'); return; }
    setErr('');
    const passive = chPassive.filter(a => (a.name || a.description).trim()).map(a => ({ name: (a.name || '').trim(), description: (a.description || '').trim() }));
    const active = chActive.filter(a => (a.name || a.description).trim()).map(a => ({ name: (a.name || '').trim(), uses: (a.uses || '').trim(), description: (a.description || '').trim() }));
    const items = chItems.filter(a => (a.name || a.description).trim()).map(a => ({ name: (a.name || '').trim(), description: (a.description || '').trim() }));
    const data = {
      userId: chUserId,
      name: chName.trim(),
      bio: chBio.trim(),
      weapon: chWeapon.trim(),
      hp: parseInt(chHp, 10) || 0,
      maxHp: parseInt(chMaxHp, 10) || 0,
      armorClass: parseInt(chAc, 10) || 10,
      initiative: parseInt(chInitiative, 10) || 0,
      strength: parseInt(chStr, 10) ?? 0,
      dexterity: parseInt(chDex, 10) ?? 0,
      constitution: parseInt(chCon, 10) ?? 0,
      intelligence: parseInt(chInt, 10) ?? 0,
      wisdom: parseInt(chWis, 10) ?? 0,
      charisma: parseInt(chCha, 10) ?? 0,
      emeralds: parseInt(chEmeralds, 10) || 0,
      rerollTokens: parseInt(chRerollTokens, 10) || 0,
      passiveAbilities: passive,
      activeAbilities: active,
      items
    };
    try {
      await createCharacter(data, chImageFile || undefined);
      setChName(''); setChBio(''); setChWeapon(''); setChHp(''); setChMaxHp(''); setChAc(10); setChInitiative(0);
      setChStr(0); setChDex(0); setChCon(0); setChInt(0); setChWis(0); setChCha(0);
      setChEmeralds(0); setChRerollTokens(0);
      setChPassive([{ name: '', description: '' }]); setChActive([{ name: '', uses: '', description: '' }]); setChItems([{ name: '', description: '' }]);
      setChImageFile(null); if (chImageRef.current) chImageRef.current.value = '';
      load();
    } catch (e) { setErr(e.message); }
  };

  const handleSaveEdit = async (id, data, imageFile) => {
    setErr('');
    try {
      await updateCharacter(id, data, imageFile);
      setEditingCharacter(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const removeCharacter = async (id) => { if (confirm('Удалить персонажа?')) { setErr(''); try { await deleteCharacter(id); load(); } catch (e) { setErr(e.message); } } };

  const addSession = async (e) => {
    e.preventDefault();
    if (!sessTitle.trim()) { setErr('Укажите заголовок'); return; }
    setErr('');
    try {
      await createSession({ title: sessTitle.trim(), date: sessDate || undefined, description: sessDesc.trim(), characterIds: sessCharacterIds });
      setSessTitle(''); setSessDate(new Date().toISOString().slice(0, 10)); setSessDesc(''); setSessCharacterIds([]);
      load();
    } catch (e) { setErr(e.message); }
  };

  const handleSaveSession = async (id, data) => {
    setErr('');
    try {
      await updateSession(id, data);
      setEditingSession(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const removeSession = async (id) => { if (confirm('Удалить запись о сессии?')) { setErr(''); try { await deleteSession(id); load(); } catch (e) { setErr(e.message); } } };

  const addUpcomingSession = async (e) => {
    e.preventDefault();
    if (!upTitle.trim()) { setErr('Укажите заголовок'); return; }
    setErr('');
    try {
      await createUpcomingSession({ title: upTitle.trim(), date: upDate || undefined, description: upDesc.trim(), characterIds: upCharacterIds });
      setUpTitle(''); setUpDate(''); setUpDesc(''); setUpCharacterIds([]);
      load();
    } catch (e) { setErr(e.message); }
  };

  const handleSaveUpcomingSession = async (id, data) => {
    setErr('');
    try {
      await updateUpcomingSession(id, data);
      setEditingUpcomingSession(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const removeUpcomingSession = async (id) => { if (confirm('Удалить запись о следующей партии?')) { setErr(''); try { await deleteUpcomingSession(id); load(); } catch (e) { setErr(e.message); } } };

  const toggleUpcomingChar = (id) => setUpCharacterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const addPassiveRow = () => setChPassive(p => [...p, { name: '', description: '' }]);
  const updPassive = (i, f, v) => setChPassive(p => p.map((a, j) => j === i ? { ...a, [f]: v } : a));
  const addActiveRow = () => setChActive(a => [...a, { name: '', uses: '', description: '' }]);
  const updActive = (i, f, v) => setChActive(a => a.map((x, j) => j === i ? { ...x, [f]: v } : x));
  const addItemRow = () => setChItems(p => [...p, { name: '', description: '' }]);
  const updItem = (i, f, v) => setChItems(p => p.map((a, j) => j === i ? { ...a, [f]: v } : a));

  const toggleSessChar = (id) => setSessCharacterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  if (loading) return <div className="admin-loading">Загрузка…</div>;
  return (
    <div className="admin-page">
      <h1>Админ-панель</h1>
      {err && <div className="admin-err">{err}</div>}

      <section className="admin-section">
        <h2>Пользователи</h2>
        <form className="admin-form" onSubmit={addUser}>
          <input placeholder="Логин" value={newLogin} onChange={e => setNewLogin(e.target.value)} />
          <input type="password" placeholder="Пароль" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <button type="submit">Добавить</button>
        </form>
        <ul className="admin-list">
          {users.map(u => (
            <li key={u.id}>
              <span>{u.login}</span>
              <button type="button" className="btn-del" onClick={() => removeUser(u.id)}>Удалить</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="admin-section">
        <h2>Создать карточку персонажа</h2>
        <form className="admin-form character-form" onSubmit={addCharacter}>
          <div className="form-row">
            <label>Пользователь *</label>
            <select value={chUserId} onChange={e => setChUserId(e.target.value)} required>
              <option value="">— выберите —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.login}</option>)}
            </select>
          </div>
          <div className="form-row">
            <input placeholder="Имя персонажа *" value={chName} onChange={e => setChName(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Портрет (картинка)</label>
            <input ref={chImageRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => setChImageFile(e.target.files?.[0] || null)} />
          </div>
          <div className="form-row">
            <label>Биография / описание</label>
            <textarea placeholder="История персонажа…" rows={4} value={chBio} onChange={e => setChBio(e.target.value)} />
          </div>
          <div className="form-row">
            <input placeholder="Оружие (напр. Алебарда (1к8) (+5 к атаке))" value={chWeapon} onChange={e => setChWeapon(e.target.value)} />
          </div>
          <div className="form-row three">
            <div><label>ХП</label><input type="number" min={0} value={chHp} onChange={e => setChHp(e.target.value)} /></div>
            <div><label>Макс ХП</label><input type="number" min={0} value={chMaxHp} onChange={e => setChMaxHp(e.target.value)} /></div>
            <div><label>Класс брони</label><input type="number" min={0} value={chAc} onChange={e => setChAc(parseInt(e.target.value, 10) || 10)} /></div>
          </div>
          <div className="form-row">
            <label>Инициатива (модификатор, можно отрицательный)</label>
            <input type="number" value={chInitiative} onChange={e => setChInitiative(parseInt(e.target.value, 10) || 0)} />
          </div>
          <div className="form-row">
            <label>Основные характеристики (модификаторы: +2, -1, 0…)</label>
            <div className="stats-inp">
              <input type="number" title="Сила" value={chStr} onChange={e => setChStr(parseInt(e.target.value, 10) || 0)} />
              <input type="number" title="Ловкость" value={chDex} onChange={e => setChDex(parseInt(e.target.value, 10) || 0)} />
              <input type="number" title="Выносливость" value={chCon} onChange={e => setChCon(parseInt(e.target.value, 10) || 0)} />
              <input type="number" title="Интеллект" value={chInt} onChange={e => setChInt(parseInt(e.target.value, 10) || 0)} />
              <input type="number" title="Мудрость" value={chWis} onChange={e => setChWis(parseInt(e.target.value, 10) || 0)} />
              <input type="number" title="Харизма" value={chCha} onChange={e => setChCha(parseInt(e.target.value, 10) || 0)} />
            </div>
          </div>
          <div className="form-row">
            <label>Пассивные умения (название + описание)</label>
            {chPassive.map((a, i) => (
              <div key={i} className="ability-row">
                <input placeholder="Название" value={a.name} onChange={e => updPassive(i, 'name', e.target.value)} />
                <input placeholder="Описание" value={a.description} onChange={e => updPassive(i, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addPassiveRow}>+ пассивное умение</button>
          </div>
          <div className="form-row">
            <label>Активные способности (название, кол-во использований, описание)</label>
            {chActive.map((a, i) => (
              <div key={i} className="ability-row ability-row--3">
                <input placeholder="Название" value={a.name} onChange={e => updActive(i, 'name', e.target.value)} />
                <input placeholder="Напр. 1 раз, 2 раза" value={a.uses} onChange={e => updActive(i, 'uses', e.target.value)} />
                <input placeholder="Описание" value={a.description} onChange={e => updActive(i, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addActiveRow}>+ активная способность</button>
          </div>
          <div className="form-row">
            <label>Предметы (название + описание)</label>
            {chItems.map((a, i) => (
              <div key={i} className="ability-row">
                <input placeholder="Название" value={a.name} onChange={e => updItem(i, 'name', e.target.value)} />
                <input placeholder="Описание" value={a.description} onChange={e => updItem(i, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addItemRow}>+ предмет</button>
          </div>
          <div className="form-row two">
            <div><label>Изумруды</label><input type="number" min={0} value={chEmeralds} onChange={e => setChEmeralds(e.target.value)} /></div>
            <div><label>Жетоны переброса</label><input type="number" min={0} value={chRerollTokens} onChange={e => setChRerollTokens(e.target.value)} /></div>
          </div>
          <button type="submit">Создать персонажа</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Все персонажи (удаление)</h2>
        <div className="cards-grid">
          {characters.map(c => (
            <div key={c.id} className="card-with-del">
              <div className="card-click-wrap" onClick={() => setViewModalCharacter(c)}>
                <CharacterCard character={c} />
              </div>
              <div className="card-meta">Пользователь: {users.find(u => u.id === c.userId)?.login || c.userId}</div>
              <div className="card-actions">
                <button type="button" className="btn-edit" onClick={(e) => { e.stopPropagation(); setEditingCharacter(c); }}>Редактировать</button>
                <button type="button" className="btn-del" onClick={() => removeCharacter(c.id)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h2>Новый блок — сюжет прошедшей игры</h2>
        <form className="admin-form session-form" onSubmit={addSession}>
          <div className="form-row">
            <input placeholder="Заголовок *" value={sessTitle} onChange={e => setSessTitle(e.target.value)} />
          </div>
          <div className="form-row">
            <input type="date" value={sessDate} onChange={e => setSessDate(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Участники (персонажи)</label>
            <div className="participants-chk">
              {characters.map(c => (
                <label key={c.id}>
                  <input type="checkbox" checked={sessCharacterIds.includes(c.id)} onChange={() => toggleSessChar(c.id)} />
                  {c.name}
                </label>
              ))}
              {characters.length === 0 && <span className="muted">Нет персонажей</span>}
            </div>
          </div>
          <div className="form-row">
            <textarea placeholder="Описание сюжета" rows={4} value={sessDesc} onChange={e => setSessDesc(e.target.value)} />
          </div>
          <button type="submit">Добавить сессию</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Добавить следующую партию</h2>
        <form className="admin-form session-form" onSubmit={addUpcomingSession}>
          <div className="form-row">
            <input placeholder="Заголовок *" value={upTitle} onChange={e => setUpTitle(e.target.value)} />
          </div>
          <div className="form-row">
            <input type="date" value={upDate} onChange={e => setUpDate(e.target.value)} title="Планируемая дата" />
          </div>
          <div className="form-row">
            <label>Участники (персонажи)</label>
            <div className="participants-chk">
              {characters.map(c => (
                <label key={c.id}>
                  <input type="checkbox" checked={upCharacterIds.includes(c.id)} onChange={() => toggleUpcomingChar(c.id)} />
                  {c.name}
                </label>
              ))}
              {characters.length === 0 && <span className="muted">Нет персонажей</span>}
            </div>
          </div>
          <div className="form-row">
            <textarea placeholder="Краткое описание" rows={3} value={upDesc} onChange={e => setUpDesc(e.target.value)} />
          </div>
          <button type="submit">Добавить</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Следующие партии</h2>
        <div className="sessions-list">
          {upcomingSessions.map(s => (
            <div key={s.id} className="session-with-del">
              <SessionBlock session={s} />
              <div className="session-actions">
                <button type="button" className="btn-edit" onClick={() => setEditingUpcomingSession(s)}>Редактировать</button>
                <button type="button" className="btn-del" onClick={() => removeUpcomingSession(s.id)}>Удалить</button>
              </div>
            </div>
          ))}
          {upcomingSessions.length === 0 && <p className="empty">Нет запланированных партий</p>}
        </div>
      </section>

      <section className="admin-section">
        <h2>Блоки сюжетов</h2>
        <div className="sessions-list">
          {sessions.map(s => (
            <div key={s.id} className="session-with-del">
              <SessionBlock session={s} />
              <div className="session-actions">
                <button type="button" className="btn-edit" onClick={() => setEditingSession(s)}>Редактировать</button>
                <button type="button" className="btn-del" onClick={() => removeSession(s.id)}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {viewModalCharacter && <CharacterCardModal character={viewModalCharacter} onClose={() => setViewModalCharacter(null)} />}
      {editingCharacter && <EditCharacterModal character={editingCharacter} users={users} onSave={handleSaveEdit} onClose={() => setEditingCharacter(null)} />}
      {editingSession && <EditSessionModal session={editingSession} characters={characters} onSave={handleSaveSession} onClose={() => setEditingSession(null)} />}
      {editingUpcomingSession && <EditSessionModal session={editingUpcomingSession} characters={characters} onSave={handleSaveUpcomingSession} onClose={() => setEditingUpcomingSession(null)} />}
    </div>
  );
}
