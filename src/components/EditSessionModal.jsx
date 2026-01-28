import { useState, useEffect } from 'react';
import './EditSessionModal.css';

export default function EditSessionModal({ session, characters, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [characterIds, setCharacterIds] = useState([]);

  useEffect(() => {
    if (!session) return;
    setTitle(session.title || '');
    setDate(session.date ?? '');
    setDescription(session.description || '');
    setCharacterIds(Array.isArray(session.characterIds) ? [...session.characterIds] : []);
  }, [session]);

  const toggleChar = (id) => {
    setCharacterIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(session.id, {
      title: title.trim(),
      date: date || undefined,
      description: description.trim(),
      characterIds
    });
  };

  if (!session) return null;

  return (
    <div className="edit-session-modal-overlay" onClick={onClose}>
      <div className="edit-session-modal" onClick={e => e.stopPropagation()}>
        <h3 className="edit-session-modal__title">Редактировать сессию</h3>
        <form className="edit-session-form" onSubmit={handleSubmit}>
          <div className="edit-session-form__row">
            <label>Заголовок *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок" required />
          </div>
          <div className="edit-session-form__row">
            <label>Дата</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="edit-session-form__row">
            <label>Участники (персонажи)</label>
            <div className="edit-session-form__participants">
              {characters.map(c => (
                <label key={c.id}>
                  <input type="checkbox" checked={characterIds.includes(c.id)} onChange={() => toggleChar(c.id)} />
                  {c.name}
                </label>
              ))}
              {characters.length === 0 && <span className="muted">Нет персонажей</span>}
            </div>
          </div>
          <div className="edit-session-form__row">
            <label>Описание сюжета</label>
            <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание" />
          </div>
          <div className="edit-session-modal__actions">
            <button type="submit">Сохранить</button>
            <button type="button" className="btn-ghost" onClick={onClose}>Отмена</button>
          </div>
        </form>
      </div>
    </div>
  );
}
