import { useState, useEffect, useRef } from 'react';
import './EditCharacterModal.css';

export default function EditCharacterModal({ character, users, onSave, onClose }) {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [weapon, setWeapon] = useState('');
  const [hp, setHp] = useState('');
  const [maxHp, setMaxHp] = useState('');
  const [armorClass, setArmorClass] = useState(10);
  const [initiative, setInitiative] = useState(0);
  const [emeralds, setEmeralds] = useState(0);
  const [rerollTokens, setRerollTokens] = useState(0);
  const [str, setStr] = useState(0);
  const [dex, setDex] = useState(0);
  const [con, setCon] = useState(0);
  const [int, setInt] = useState(0);
  const [wis, setWis] = useState(0);
  const [cha, setCha] = useState(0);
  const [passive, setPassive] = useState([{ name: '', description: '' }]);
  const [active, setActive] = useState([{ name: '', uses: '', description: '' }]);
  const [items, setItems] = useState([{ name: '', description: '' }]);
  const [imageFile, setImageFile] = useState(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (!character) return;
    setUserId(character.userId || '');
    setName(character.name || '');
    setBio(character.bio || '');
    setWeapon(character.weapon || '');
    setHp(String(character.hp ?? ''));
    setMaxHp(String(character.maxHp ?? ''));
    setArmorClass(character.armorClass ?? 10);
    setInitiative(character.initiative ?? 0);
    setEmeralds(character.emeralds ?? 0);
    setRerollTokens(character.rerollTokens ?? 0);
    setStr(character.strength ?? 0);
    setDex(character.dexterity ?? 0);
    setCon(character.constitution ?? 0);
    setInt(character.intelligence ?? 0);
    setWis(character.wisdom ?? 0);
    setCha(character.charisma ?? 0);
    const p = (character.passiveAbilities || []).length ? character.passiveAbilities : [{ name: '', description: '' }];
    setPassive(p.map(a => ({ name: a.name || '', description: a.description || '' })));
    const a = (character.activeAbilities || []).length ? character.activeAbilities : [{ name: '', uses: '', description: '' }];
    setActive(a.map(x => ({ name: x.name || '', uses: x.uses || '', description: x.description || '' })));
    const i = (character.items || []).length ? character.items : [{ name: '', description: '' }];
    setItems(i.map(a => ({ name: a.name || '', description: a.description || '' })));
    setImageFile(null);
    if (imageRef.current) imageRef.current.value = '';
  }, [character]);

  const addPassive = () => setPassive(p => [...p, { name: '', description: '' }]);
  const updPassive = (idx, f, v) => setPassive(p => p.map((a, i) => i === idx ? { ...a, [f]: v } : a));
  const addActive = () => setActive(a => [...a, { name: '', uses: '', description: '' }]);
  const updActive = (idx, f, v) => setActive(a => a.map((x, i) => i === idx ? { ...x, [f]: v } : x));
  const addItem = () => setItems(i => [...i, { name: '', description: '' }]);
  const updItem = (idx, f, v) => setItems(i => i.map((a, j) => j === idx ? { ...a, [f]: v } : a));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userId || !name.trim()) return;
    const p = passive.filter(a => (a.name || a.description).trim()).map(a => ({ name: (a.name || '').trim(), description: (a.description || '').trim() }));
    const act = active.filter(a => (a.name || a.description).trim()).map(a => ({ name: (a.name || '').trim(), uses: (a.uses || '').trim(), description: (a.description || '').trim() }));
    const it = items.filter(a => (a.name || a.description).trim()).map(a => ({ name: (a.name || '').trim(), description: (a.description || '').trim() }));
    const data = {
      userId,
      name: name.trim(),
      bio: bio.trim(),
      weapon: weapon.trim(),
      hp: parseInt(hp, 10) || 0,
      maxHp: parseInt(maxHp, 10) || 0,
      armorClass: parseInt(armorClass, 10) || 10,
      initiative: parseInt(initiative, 10) || 0,
      emeralds: parseInt(emeralds, 10) || 0,
      rerollTokens: parseInt(rerollTokens, 10) || 0,
      strength: parseInt(str, 10) ?? 0,
      dexterity: parseInt(dex, 10) ?? 0,
      constitution: parseInt(con, 10) ?? 0,
      intelligence: parseInt(int, 10) ?? 0,
      wisdom: parseInt(wis, 10) ?? 0,
      charisma: parseInt(cha, 10) ?? 0,
      passiveAbilities: p,
      activeAbilities: act,
      items: it
    };
    onSave(character.id, data, imageFile || undefined);
  };

  if (!character) return null;

  return (
    <div className="edit-char-modal-overlay" onClick={onClose}>
      <div className="edit-char-modal" onClick={e => e.stopPropagation()}>
        <h3 className="edit-char-modal__title">Редактировать: {character.name}</h3>
        <form className="admin-form character-form edit-char-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>Пользователь *</label>
            <select value={userId} onChange={e => setUserId(e.target.value)} required>
              <option value="">— выберите —</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.login}</option>)}
            </select>
          </div>
          <div className="form-row">
            <input placeholder="Имя персонажа *" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Портрет</label>
            {character.imageUrl && <p className="edit-char-modal__current-img">Текущее: <img src={character.imageUrl} alt="" style={{ maxHeight: 48, verticalAlign: 'middle' }} /></p>}
            <input ref={imageRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          </div>
          <div className="form-row">
            <label>Биография</label>
            <textarea rows={3} value={bio} onChange={e => setBio(e.target.value)} />
          </div>
          <div className="form-row">
            <input placeholder="Оружие" value={weapon} onChange={e => setWeapon(e.target.value)} />
          </div>
          <div className="form-row three">
            <div><label>ХП</label><input type="number" min={0} value={hp} onChange={e => setHp(e.target.value)} /></div>
            <div><label>Макс ХП</label><input type="number" min={0} value={maxHp} onChange={e => setMaxHp(e.target.value)} /></div>
            <div><label>Класс брони</label><input type="number" min={0} value={armorClass} onChange={e => setArmorClass(parseInt(e.target.value, 10) || 10)} /></div>
          </div>
          <div className="form-row three">
            <div><label>Инициатива</label><input type="number" value={initiative} onChange={e => setInitiative(parseInt(e.target.value, 10) || 0)} /></div>
            <div><label>Изумруды</label><input type="number" min={0} value={emeralds} onChange={e => setEmeralds(parseInt(e.target.value, 10) || 0)} /></div>
            <div><label>Жетоны переброса</label><input type="number" min={0} value={rerollTokens} onChange={e => setRerollTokens(parseInt(e.target.value, 10) || 0)} /></div>
          </div>
          <div className="form-row">
            <label>Характеристики (модификаторы)</label>
            <div className="stats-inp">
              {['str','dex','con','int','wis','cha'].map((k, idx) => {
                const labels = ['Сила','Ловкость','Вынос.','Инт.','Мдр.','Хар.'];
                const vals = [str,dex,con,int,wis,cha];
                const setters = [setStr,setDex,setCon,setInt,setWis,setCha];
                return <input key={k} type="number" title={labels[idx]} value={vals[idx]} onChange={e => setters[idx](parseInt(e.target.value, 10) || 0)} />;
              })}
            </div>
          </div>
          <div className="form-row">
            <label>Пассивные умения</label>
            {passive.map((a, i) => (
              <div key={i} className="ability-row">
                <input placeholder="Название" value={a.name} onChange={e => updPassive(i, 'name', e.target.value)} />
                <input placeholder="Описание" value={a.description} onChange={e => updPassive(i, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addPassive}>+</button>
          </div>
          <div className="form-row">
            <label>Активные способности</label>
            {active.map((a, i) => (
              <div key={i} className="ability-row ability-row--3">
                <input placeholder="Название" value={a.name} onChange={e => updActive(i, 'name', e.target.value)} />
                <input placeholder="Использований" value={a.uses} onChange={e => updActive(i, 'uses', e.target.value)} />
                <input placeholder="Описание" value={a.description} onChange={e => updActive(i, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addActive}>+</button>
          </div>
          <div className="form-row">
            <label>Предметы</label>
            {items.map((a, i) => (
              <div key={i} className="ability-row">
                <input placeholder="Название" value={a.name} onChange={e => updItem(i, 'name', e.target.value)} />
                <input placeholder="Описание" value={a.description} onChange={e => updItem(i, 'description', e.target.value)} />
              </div>
            ))}
            <button type="button" className="btn-sm" onClick={addItem}>+</button>
          </div>
          <div className="edit-char-modal__actions">
            <button type="submit">Сохранить</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
