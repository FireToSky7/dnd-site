import { useRef } from 'react';
import { toPng } from 'html-to-image';
import CharacterCard from './CharacterCard';
import './CharacterCardModal.css';

export default function CharacterCardModal({ character, onClose }) {
  const cardRef = useRef(null);

  const handleExport = async () => {
    if (!cardRef.current) return;
    try {
      const body = cardRef.current.closest('.character-card-modal__body');
      if (body) body.scrollTop = 0;
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: '#1f1512',
        pixelRatio: 2
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = (character?.name || 'персонаж').replace(/[^a-zа-яё0-9]/gi, '_') + '.png';
      a.click();
    } catch (e) {
      console.error(e);
      alert('Не удалось выгрузить картинку');
    }
  };

  if (!character) return null;

  return (
    <div className="character-card-modal-overlay" onClick={onClose}>
      <div className="character-card-modal" onClick={e => e.stopPropagation()}>
        <div className="character-card-modal__body">
          <div className="character-card-modal__card-wrap" ref={cardRef}>
            <CharacterCard character={character} />
          </div>
        </div>
        <div className="character-card-modal__actions">
          <button type="button" className="character-card-modal__btn character-card-modal__btn--export" onClick={handleExport}>
            Скачать как картинку
          </button>
          <button type="button" className="character-card-modal__btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
}
