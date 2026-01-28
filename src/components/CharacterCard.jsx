import { useState } from 'react';
import './CharacterCard.css';

const ABILITY_NAMES = {
  strength: 'Сила',
  dexterity: 'Ловкость',
  constitution: 'Выносливость',
  intelligence: 'Интеллект',
  wisdom: 'Мудрость',
  charisma: 'Харизма'
};

function modStr(n) {
  const v = parseInt(n, 10);
  if (isNaN(v)) return '0';
  if (v > 0) return '+' + v;
  return String(v);
}

export default function CharacterCard({ character }) {
  const [bioOpen, setBioOpen] = useState(false);
  const abils = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  const passive = character.passiveAbilities || (character.abilities ? character.abilities.filter(a => !a.uses) : []);
  const active = character.activeAbilities || (character.abilities ? character.abilities.filter(a => a.uses) : []) || [];

  return (
    <article className="character-card">
      <h3 className="character-card__name">{character.name}</h3>

      {character.imageUrl && (
        <div className="character-card__img-wrap">
          <img src={character.imageUrl} alt={character.name} className="character-card__img" />
        </div>
      )}

      {character.bio && (
        <div className="character-card__bio-wrap">
          <button type="button" className="character-card__bio-toggle" onClick={() => setBioOpen(v => !v)} aria-expanded={bioOpen}>
            Биография <span className="character-card__bio-chevron">{bioOpen ? '▼' : '▶'}</span>
          </button>
          {bioOpen && <div className="character-card__bio">{character.bio}</div>}
        </div>
      )}

      <div className="character-card__stats-inline">
        {character.weapon && <p><strong>Оружие</strong> {character.weapon}</p>}
        <p><strong>Класс брони</strong> {character.armorClass ?? 10}</p>
        <p><strong>ХП</strong> {character.hp ?? 0}{character.maxHp != null && character.maxHp !== '' ? ` / ${character.maxHp}` : ''}</p>
        <p><strong>Инициатива</strong> {modStr(character.initiative)}</p>
        <p><strong>Изумруды</strong> {character.emeralds ?? 0}</p>
        <p><strong>Жетоны переброса</strong> {character.rerollTokens ?? 0}</p>
      </div>

      <h4 className="character-card__block-title">Основные характеристики:</h4>
      <ul className="character-card__mods">
        {abils.map(k => (
          <li key={k}>{ABILITY_NAMES[k]} {modStr(character[k])}</li>
        ))}
      </ul>

      {passive.length > 0 && (
        <>
          <h4 className="character-card__block-title">Пассивные умения:</h4>
          {passive.map((a, i) => (
            <div key={i} className="character-card__ability">
              <strong>{typeof a === 'string' ? a : (a.name || '')}</strong>
              {typeof a === 'object' && a.description && ` – ${a.description}`}
            </div>
          ))}
        </>
      )}

      {active.length > 0 && (
        <>
          <h4 className="character-card__block-title">Активные способности:</h4>
          {active.map((a, i) => (
            <div key={i} className="character-card__ability">
              <strong>{typeof a === 'string' ? a : (a.name || '')}</strong>
              {typeof a === 'object' && a.uses && ` (${a.uses})`}
              {typeof a === 'object' && a.description && ` – ${a.description}`}
            </div>
          ))}
        </>
      )}

      {Array.isArray(character.items) && character.items.length > 0 && (
        <>
          <h4 className="character-card__block-title">Предметы:</h4>
          {character.items.map((a, i) => (
            <div key={i} className="character-card__ability">
              <strong>{typeof a === 'string' ? a : (a.name || '')}</strong>
              {typeof a === 'object' && a.description && ` – ${a.description}`}
            </div>
          ))}
        </>
      )}
    </article>
  );
}
