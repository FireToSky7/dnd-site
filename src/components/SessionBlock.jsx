import './SessionBlock.css';

export default function SessionBlock({ session }) {
  const participants = session.participants || [];
  return (
    <article className="session-block">
      <h3>{session.title}</h3>
      {session.date && <p className="session-date">{session.date}</p>}
      {participants.length > 0 && (
        <div className="session-participants">
          <span className="session-participants__label">Участники:</span>
          <div className="session-participants__list">
            {participants.map(p => (
              <div key={p.id} className="session-participant">
                <div className="session-participant__thumb">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="session-participant__img" />
                  ) : (
                    <div className="session-participant__placeholder">{p.name ? p.name[0] : '?'}</div>
                  )}
                </div>
                <span className="session-participant__name">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {session.description && <div className="session-desc">{session.description}</div>}
    </article>
  );
}
