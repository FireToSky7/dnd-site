import { useState, useEffect } from 'react';
import { getCharacters, getSessions, getUpcomingSessions } from '../api';
import CharacterCard from '../components/CharacterCard';
import CharacterCardModal from '../components/CharacterCardModal';
import ParticipantsCardsModal from '../components/ParticipantsCardsModal';
import SessionBlock from '../components/SessionBlock';
import './Dashboard.css';

export default function Dashboard({ user }) {
  const [characters, setCharacters] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewModalCharacter, setViewModalCharacter] = useState(null);
  const [viewParticipantsModal, setViewParticipantsModal] = useState(null);

  const load = () => {
    setLoading(true);
    setErr('');
    Promise.all([getCharacters(), getSessions(), getUpcomingSessions()])
      .then(([ch, s, u]) => { setCharacters(ch); setSessions(s); setUpcomingSessions(u); })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const myCharacterIds = new Set(characters.map(c => c.id));
  const myUpcomingSessions = upcomingSessions.filter(s => (s.characterIds || []).some(cid => myCharacterIds.has(cid)));

  if (loading) return <div className="dashboard-loading">Загрузка…</div>;
  if (err) return <div className="dashboard-error">Ошибка: {err}</div>;

  return (
    <div className="dashboard">
      <section className="dashboard-section">
        <h2>Мои персонажи</h2>
        {characters.length === 0 ? (
          <p className="empty">Пока нет персонажей. Администратор может добавить карточку для вас.</p>
        ) : (
          <div className="cards-grid">
            {characters.map(c => (
              <div key={c.id} className="card-click-wrap" onClick={() => setViewModalCharacter(c)}>
                <CharacterCard character={c} />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <h2>Следующие партии</h2>
        {myUpcomingSessions.length === 0 ? (
          <p className="empty">Пока нет запланированных партий с участием ваших персонажей.</p>
        ) : (
          <div className="sessions-list">
            {myUpcomingSessions.map(s => (
              <SessionBlock key={s.id} session={s} onParticipantsClick={sess => setViewParticipantsModal(sess.participants || [])} />
            ))}
          </div>
        )}
      </section>
      <section className="dashboard-section">
        <h2>Сюжеты прошедших игр</h2>
        {sessions.length === 0 ? (
          <p className="empty">Пока нет записей о прошедших сессиях.</p>
        ) : (
          <div className="sessions-list">
            {sessions.map(s => (
              <SessionBlock key={s.id} session={s} onParticipantsClick={sess => setViewParticipantsModal(sess.participants || [])} />
            ))}
          </div>
        )}
      </section>

      {viewModalCharacter && <CharacterCardModal character={viewModalCharacter} onClose={() => setViewModalCharacter(null)} />}
      {viewParticipantsModal && viewParticipantsModal.length > 0 && (
        <ParticipantsCardsModal participants={viewParticipantsModal} onClose={() => setViewParticipantsModal(null)} />
      )}
    </div>
  );
}
