import CharacterCard from './CharacterCard';
import './ParticipantsCardsModal.css';

export default function ParticipantsCardsModal({ participants = [], onClose }) {
  if (!participants.length) return null;

  return (
    <div className="participants-cards-modal-overlay" onClick={onClose}>
      <div className="participants-cards-modal" onClick={e => e.stopPropagation()}>
        <div className="participants-cards-modal__header">
          <h3 className="participants-cards-modal__title">Участники</h3>
          <button type="button" className="participants-cards-modal__close" onClick={onClose}>Закрыть</button>
        </div>
        <div className="participants-cards-modal__body">
          <div className="participants-cards-modal__grid">
            {participants.map(c => (
              <div key={c.id} className="participants-cards-modal__card-wrap">
                <CharacterCard character={c} hideBio />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
