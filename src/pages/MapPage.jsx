import { useState, useEffect, useCallback } from 'react';
import { getMap, saveMap, getCharacters, getSessions, getUpcomingSessions } from '../api';
import CharacterCardModal from '../components/CharacterCardModal';
import './MapPage.css';

const MAP_SIZE = 1000;
const DEFAULT_PATH_COLOR = '#3cb44b';

const PLACE_TYPES = [
  { key: 'city', label: 'Город' },
  { key: 'village', label: 'Деревня' },
  { key: 'cave', label: 'Пещера' },
  { key: 'church', label: 'Церковь' },
  { key: 'tower', label: 'Башня' },
  { key: 'dungeon', label: 'Подземелье' },
  { key: 'fortress', label: 'Крепость' },
  { key: 'other', label: 'Другое' }
];

const LANDSCAPE_TYPES = [
  { key: 'forest', label: 'Лес', fill: '#2d5a27', stroke: '#1e3d1a' },
  { key: 'river', label: 'Река', fill: '#4363d8', stroke: '#2a4080' },
  { key: 'mountain', label: 'Горы', fill: '#6b6b6b', stroke: '#4a4a4a' },
  { key: 'desert', label: 'Пустыня', fill: '#c4a35a', stroke: '#8b7355' }
];

/** Нормализует точки полигона (поддержка [x,y] и {x,y}) */
function polygonPoints(points) {
  if (!Array.isArray(points) || points.length < 2) return '';
  return points
    .map(p => `${Number(p[0] ?? p.x ?? 0)},${Number(p[1] ?? p.y ?? 0)}`)
    .join(' ');
}

/** Иконки мест с svg4.ru (лицензии указаны в комментариях). Масштаб под 24×24, цвет currentColor. */
function PlaceIcon({ type, x, y, size = 24 }) {
  const s = size / 24;
  const c = '#c9a959';
  return (
    <g transform={`translate(${x}, ${y}) scale(${s}) translate(-12, -12)`} fill={c} color={c} stroke="#1a1210" strokeWidth={0.5}>
      {/* Город: svg4.ru/icons/castle-9 (Dazzle UI, CC Attribution) — контур */}
      {type === 'city' && (
        <path d="M21 8V16.2C21 17.8802 21 18.7202 20.673 19.362C20.3854 19.9265 19.9265 20.3854 19.362 20.673C18.7202 21 17.8802 21 16.2 21H7.8C6.11984 21 5.27976 21 4.63803 20.673C4.07354 20.3854 3.6146 19.9265 3.32698 19.362C3 18.7202 3 17.8802 3 16.2V8M3 11H21M6 11V3M18 11V3M6 6H18M10 6V3M14 6V3M14 21V17C14 15.8954 13.1046 15 12 15C10.8954 15 10 15.8954 10 17V21H14Z" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {/* Деревня: svg4.ru/icons/town-house (Fabric Design System, MIT) — контур */}
      {type === 'village' && (
        <g fill="currentColor" stroke="currentColor" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 7L5.94 2.23C6.01 2.16 6.1 2.1 6.2 2.06C6.29 2.02 6.4 2 6.5 2C6.6 2 6.71 2.02 6.8 2.06C6.9 2.1 6.99 2.16 7.06 2.23L12 7" fill="none" />
          <path d="M12 9L16.94 4.23C17.01 4.16 17.1 4.1 17.2 4.06C17.29 4.02 17.4 4 17.5 4C17.6 4 17.71 4.02 17.8 4.06C17.9 4.1 17.99 4.16 18.06 4.23L23 9" fill="none" />
          <path d="M1 7V23H12V7" fill="none" />
          <path d="M12 23H23V9" fill="none" />
          <path d="M4.25 23C4.25 23.41 4.59 23.75 5 23.75C5.41 23.75 5.75 23.41 5.75 23H4.25ZM7.25 23C7.25 23.41 7.59 23.75 8 23.75C8.41 23.75 8.75 23.41 8.75 23H7.25ZM5.5 19.75H7.5V18.25H5.5V19.75ZM4.25 19.5V23H5.75V19.5H4.25ZM8.75 23V19.5H7.25V23H8.75ZM7.5 19.75C7.36 19.75 7.25 19.64 7.25 19.5H8.75C8.75 18.81 8.19 18.25 7.5 18.25V19.75ZM5.5 18.25C4.81 18.25 4.25 18.81 4.25 19.5H5.75C5.75 19.64 5.64 19.75 5.5 19.75V18.25Z" />
          <path d="M15.25 23C15.25 23.41 15.59 23.75 16 23.75C16.41 23.75 16.75 23.41 16.75 23H15.25ZM18.25 23C18.25 23.41 18.59 23.75 19 23.75C19.41 23.75 19.75 23.41 19.75 23H18.25ZM16.5 19.75H18.5V18.25H16.5V19.75ZM15.25 19.5V23H16.75V19.5H15.25ZM19.75 23V19.5H18.25V23H19.75ZM18.5 19.75C18.36 19.75 18.25 19.64 18.25 19.5H19.75C19.75 18.81 19.19 18.25 18.5 18.25V19.75ZM16.5 18.25C15.81 18.25 15.25 18.81 15.25 19.5H16.75C16.75 19.64 16.64 19.75 16.5 19.75V18.25Z" />
          <path d="M15.5 11.25C15.09 11.25 14.75 11.59 14.75 12C14.75 12.41 15.09 12.75 15.5 12.75V11.25ZM19.5 12.75C19.91 12.75 20.25 12.41 20.25 12C20.25 11.59 19.91 11.25 19.5 11.25V12.75ZM15.5 12.75H19.5V11.25H15.5V12.75Z" />
          <path d="M4.5 9.25C4.09 9.25 3.75 9.59 3.75 10C3.75 10.41 4.09 10.75 4.5 10.75V9.25ZM8.5 10.75C8.91 10.75 9.25 10.41 9.25 10C9.25 9.59 8.91 9.25 8.5 9.25V10.75ZM4.5 10.75H8.5V9.25H4.5V10.75Z" />
          <path d="M16.5 8.25C16.09 8.25 15.75 8.59 15.75 9C15.75 9.41 16.09 9.75 16.5 9.75V8.25ZM18.5 9.75C18.91 9.75 19.25 9.41 19.25 9C19.25 8.59 18.91 8.25 18.5 8.25V9.75ZM16.5 9.75H18.5V8.25H16.5V9.75Z" />
          <path d="M5.5 6.25C5.09 6.25 4.75 6.59 4.75 7C4.75 7.41 5.09 7.75 5.5 7.75V6.25ZM7.5 7.75C7.91 7.75 8.25 7.41 8.25 7C8.25 6.59 7.91 6.25 7.5 6.25V7.75ZM5.5 7.75H7.5V6.25H5.5V7.75Z" />
          <path d="M11.25 7C11.25 7.41 11.59 7.75 12 7.75C12.41 7.75 12.75 7.41 12.75 7H11.25ZM12.75 4C12.75 3.59 12.41 3.25 12 3.25C11.59 3.25 11.25 3.59 11.25 4H12.75ZM12.75 7V4H11.25V7H12.75Z" />
          <path d="M22.25 9C22.25 9.41 22.59 9.75 23 9.75C23.41 9.75 23.75 9.41 23.75 9H22.25ZM23.75 6C23.75 5.59 23.41 5.25 23 5.25C22.59 5.25 22.25 5.59 22.25 6H23.75ZM23.75 9V6H22.25V9H23.75Z" />
        </g>
      )}
      {/* Пещера: svg4.ru/icons/mountain-cave (game-icons.net, CC Attribution) — 512→24 */}
      {type === 'cave' && (
        <g transform="translate(12,12) scale(0.046875) translate(-256,-256)">
          <path d="M195.344 71.438c-3.83.12-7.66 1.205-10.938 3.062-9.987 5.66-16.774 16.198-25.062 31.72-8.288 15.52-17.55 36.4-29.03 63.218C107.35 223.07 75.606 300.42 26.843 403.875a9.5 9.5 0 1 0 17.187 8.094c48.966-103.882 80.897-181.682 103.75-235.064 11.428-26.69 20.6-47.274 28.314-61.72 7.713-14.443 14.5-22.366 17.656-24.155 1.578-.893 1.773-.822 2.78-.56 1.01.26 3.136 1.348 6 4.155 5.732 5.614 13.667 17.43 23.314 34.438 19.077 33.636 45.742 87.6 87.28 159.03-4.364 10.616-9.077 21.89-14.25 33.876a9.5 9.5 0 1 0 17.438 7.53c20.076-46.524 33.676-83.107 44.188-106.47 5.256-11.68 9.878-20.06 13.22-24.093 1.445-1.745 2.452-2.466 2.874-2.718.654.36 4.928 3.886 9.937 12.468 5.162 8.84 11.398 22.197 18.845 40 14.893 35.605 34.786 89.108 63.313 162.656a9.503 9.503 0 1 0 17.718-6.875c-28.48-73.43-48.32-126.835-63.5-163.126-7.59-18.146-13.993-31.983-19.97-42.22-5.974-10.235-11.09-17.537-19.78-20.843-2.172-.825-4.596-1.186-7-1.124-2.403.062-4.778.553-6.875 1.47-4.192 1.83-7.355 4.77-10.186 8.186-5.664 6.836-10.42 16.147-15.938 28.407-6.044 13.432-12.834 30.485-20.97 50.624-37.043-64.58-61.375-113.65-79.81-146.156-9.925-17.5-17.96-30.198-26.564-38.626-4.3-4.213-8.923-7.548-14.53-9-1.403-.362-2.857-.563-4.313-.624-.547-.024-1.08-.018-1.626 0zm5.03 258.78c-39.944 0-72.31 39.03-72.31 87.188h144.624c0-48.16-32.368-87.187-72.313-87.187z" fill="currentColor" />
        </g>
      )}
      {/* Церковь: svg4.ru/icons/church-2 (boxicons, CC Attribution) */}
      {type === 'church' && (
        <path d="M21.447 14.105L18 12.382V12a1 1 0 0 0-.485-.857L13 8.434V6h2V4h-2V2h-2v2H9v2h2v2.434l-4.515 2.709A1 1 0 0 0 6 12v.382l-3.447 1.724A.998.998 0 0 0 2 15v6a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-6c0-.379-.214-.725-.553-.895zM4 15.618l2-1V20H4v-4.382zM12 15a2 2 0 0 0-2 2v3H8v-7.434l4-2.4 4 2.4V20h-2v-3a2 2 0 0 0-2-2zm8 5h-2v-5.382l2 1V20z" fill="currentColor" />
      )}
      {/* Башня: svg4.ru/icons/tower-1 (IconPark, MIT) — 48→24 */}
      {type === 'tower' && (
        <g transform="translate(12,12) scale(0.5) translate(-24,-24)" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
          <rect x="17" y="31" width="14" height="13" />
          <rect x="19" y="17" width="10" height="14" />
          <rect x="21" y="4" width="6" height="13" />
          <path d="M4 44H44" strokeLinecap="round" />
        </g>
      )}
      {/* Подземелье: svg4.ru/icons/dungeon (FortAwesome, CC Attribution) — 512→24 */}
      {type === 'dungeon' && (
        <g transform="translate(12,12) scale(0.046875) translate(-256,-256)">
          <path d="M128.73 195.32l-82.81-51.76c-8.04-5.02-18.99-2.17-22.93 6.45A254.19 254.19 0 0 0 .54 239.28C-.05 248.37 7.59 256 16.69 256h97.13c7.96 0 14.08-6.25 15.01-14.16 1.09-9.33 3.24-18.33 6.24-26.94 2.56-7.34.25-15.46-6.34-19.58zM319.03 8C298.86 2.82 277.77 0 256 0s-42.86 2.82-63.03 8c-9.17 2.35-13.91 12.6-10.39 21.39l37.47 104.03A16.003 16.003 0 0 0 235.1 144h41.8c6.75 0 12.77-4.23 15.05-10.58l37.47-104.03c3.52-8.79-1.22-19.03-10.39-21.39zM112 288H16c-8.84 0-16 7.16-16 16v64c0 8.84 7.16 16 16 16h96c8.84 0 16-7.16 16-16v-64c0-8.84-7.16-16-16-16zm0 128H16c-8.84 0-16 7.16-16 16v64c0 8.84 7.16 16 16 16h96c8.84 0 16-7.16 16-16v-64c0-8.84-7.16-16-16-16zm77.31-283.67l-36.32-90.8c-3.53-8.83-14.13-12.99-22.42-8.31a257.308 257.308 0 0 0-71.61 59.89c-6.06 7.32-3.85 18.48 4.22 23.52l82.93 51.83c6.51 4.07 14.66 2.62 20.11-2.79 5.18-5.15 10.79-9.85 16.79-14.05 6.28-4.41 9.15-12.17 6.3-19.29zM398.18 256h97.13c9.1 0 16.74-7.63 16.15-16.72a254.135 254.135 0 0 0-22.45-89.27c-3.94-8.62-14.89-11.47-22.93-6.45l-82.81 51.76c-6.59 4.12-8.9 12.24-6.34 19.58 3.01 8.61 5.15 17.62 6.24 26.94.93 7.91 7.05 14.16 15.01 14.16zm54.85-162.89a257.308 257.308 0 0 0-71.61-59.89c-8.28-4.68-18.88-.52-22.42 8.31l-36.32 90.8c-2.85 7.12.02 14.88 6.3 19.28 6 4.2 11.61 8.9 16.79 14.05 5.44 5.41 13.6 6.86 20.11 2.79l82.93-51.83c8.07-5.03 10.29-16.19 4.22-23.51zM496 288h-96c-8.84 0-16 7.16-16 16v64c0 8.84 7.16 16 16 16h96c8.84 0 16-7.16 16-16v-64c0-8.84-7.16-16-16-16zm0 128h-96c-8.84 0-16 7.16-16 16v64c0 8.84 7.16 16 16 16h96c8.84 0 16-7.16 16-16v-64c0-8.84-7.16-16-16-16zM240 177.62V472c0 4.42 3.58 8 8 8h16c4.42 0 8-3.58 8-8V177.62c-5.23-.89-10.52-1.62-16-1.62s-10.77.73-16 1.62zm-64 41.51V472c0 4.42 3.58 8 8 8h16c4.42 0 8-3.58 8-8V189.36c-12.78 7.45-23.84 17.47-32 29.77zm128-29.77V472c0 4.42 3.58 8 8 8h16c4.42 0 8-3.58 8-8V219.13c-8.16-12.3-19.22-22.32-32-29.77z" fill="currentColor" />
        </g>
      )}
      {/* Крепость: svg4.ru/icons/tower-18 (Shannon E. Thomas, CC Attribution) — 32→24 */}
      {type === 'fortress' && (
        <g transform="translate(12,12) scale(0.75) translate(-16,-16)">
          <path d="M27 6.757V3c0-0.552-0.448-1-1-1h-2c-0.552 0-1 0.448-1 1v1h-2V3c0-0.552-0.448-1-1-1h-2c-0.552 0-1 0.448-1 1v1h-2V3c0-0.552-0.448-1-1-1h-2c-0.552 0-1 0.448-1 1v1H9V3c0-0.552-0.448-1-1-1H6C5.448 2 5 2.448 5 3v3.757c0 0.796 0.316 1.559 0.879 2.121l1.034 1.034l-1.6 16.803C5.145 28.477 6.53 30 8.299 30h15.401c1.769 0 3.154-1.523 2.986-3.284l-1.6-16.803l1.034-1.034C26.684 8.316 27 7.553 27 6.757z M25.18 28.345C24.797 28.768 24.271 29 23.701 29H8.299c-0.57 0-1.096-0.232-1.48-0.655c-0.384-0.422-0.565-0.967-0.511-1.535L7.909 10h16.181l1.601 16.81C25.746 27.378 25.564 27.923 25.18 28.345z M26 6.757c0 0.534-0.208 1.036-0.586 1.414L24.586 9H7.414L6.586 8.172C6.208 7.794 6 7.292 6 6.757V3h2v2h4V3h2v2h4V3h2v2h4V3h2V6.757z M16 13c-1.105 0-2 0.895-2 2v4c0 0.552 0.448 1 1 1h2c0.552 0 1-0.448 1-1v-4C18 13.895 17.105 13 16 13z M17 19h-2v-4c0-0.551 0.449-1 1-1s1 0.449 1 1V19z" fill="currentColor" />
        </g>
      )}
      {/* Другое: svg4.ru/icons/flag-16 (Shannon E. Thomas, CC Attribution) — 32→24 */}
      {(!type || type === 'other') && (
        <g transform="translate(12,12) scale(0.75) translate(-16,-16)">
          <path d="M30.745 20.386L25 13l3.375-7.594C28.669 4.745 28.185 4 27.461 4H17.5l-0.361-2.164C17.059 1.353 16.642 1 16.153 1H2.014L1.986 0.835c-0.09-0.544-0.604-0.914-1.15-0.822C0.347 0.095 0.02 0.521 0.019 1H0l0.016 0.096C0.018 1.119 0.01 1.141 0.014 1.165l5 30C5.095 31.653 5.519 32 5.999 32c0.055 0 0.109-0.004 0.165-0.014c0.545-0.091 0.913-0.606 0.822-1.151L5.014 19H14.5l0.361 2.164C14.941 21.647 15.358 22 15.847 22h14.108C30.788 22 31.256 21.043 30.745 20.386z M15.306 3l2.342 14H4.694L2.361 3H15.306z M16.633 19.384L16.361 18h1.253L16.633 19.384z M17.436 20l1.391-1.983L16.827 6h9.095l-3.237 7.282L27.911 20C27.911 20 17.472 20.004 17.436 20z" fill="currentColor" />
        </g>
      )}
    </g>
  );
}

function id() {
  return String(Date.now()) + Math.random().toString(36).slice(2, 6);
}

export default function MapPage({ user }) {
  const [map, setMap] = useState({ landscapes: [], zones: [], places: [], characterPaths: {}, placeSessions: {} });
  const [characters, setCharacters] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [upcomingSessions, setUpcomingSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [tool, setTool] = useState(null);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [landscapeType, setLandscapeType] = useState('forest');
  const [landscapeFill, setLandscapeFill] = useState(LANDSCAPE_TYPES[0].fill);
  const [landscapeStroke, setLandscapeStroke] = useState(LANDSCAPE_TYPES[0].stroke);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [characterPathColor, setCharacterPathColor] = useState(DEFAULT_PATH_COLOR);
  const [characterPathPlaces, setCharacterPathPlaces] = useState([]);
  const [placeModal, setPlaceModal] = useState(null);
  const [sessionsModalPlaceId, setSessionsModalPlaceId] = useState(null);
  const [placeInfoPlaceId, setPlaceInfoPlaceId] = useState(null);
  const [zoneNameModal, setZoneNameModal] = useState(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [characterCardCharacter, setCharacterCardCharacter] = useState(null);
  const [svgRef, setSvgRef] = useState(null);

  const isAdmin = user?.role === 'admin';

  const load = useCallback(() => {
    setLoading(true);
    setErr('');
    Promise.all([
      getMap(),
      isAdmin ? getCharacters() : Promise.resolve([]),
      getSessions(),
      getUpcomingSessions()
    ])
      .then(([m, ch, s, u]) => {
        setMap(m);
        setCharacters(Array.isArray(ch) ? ch : []);
        setSessions(Array.isArray(s) ? s : []);
        setUpcomingSessions(Array.isArray(u) ? u : []);
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  useEffect(() => load(), [load]);

  const handleSave = () => {
    setSaving(true);
    saveMap(map)
      .then(m => { setMap(m); setErr(''); })
      .catch(e => setErr(e.message))
      .finally(() => setSaving(false));
  };

  const getCoords = (e) => {
    if (!svgRef) return null;
    const rect = svgRef.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * MAP_SIZE;
    const y = ((e.clientY - rect.top) / rect.height) * MAP_SIZE;
    return [Math.max(0, Math.min(MAP_SIZE, x)), Math.max(0, Math.min(MAP_SIZE, y))];
  };

  const handleMapClick = (e) => {
    if (!editMode || !svgRef) return;
    const coords = getCoords(e);
    if (!coords) return;

    if (tool === 'zone' || tool === 'landscape') {
      setDrawingPoints(prev => [...prev, coords]);
      return;
    }

    if (tool === 'place') {
      setPlaceModal({ x: coords[0], y: coords[1] });
      return;
    }

    if (tool === 'character' && selectedCharacter) {
      const placeId = map.places.find(p => Math.hypot(p.x - coords[0], p.y - coords[1]) < 28)?.id;
      if (placeId) {
        setCharacterPathPlaces(prev => {
          const next = [...prev, placeId];
          setMap(m => ({
            ...m,
            characterPaths: {
              ...m.characterPaths,
              [selectedCharacter.id]: { placeIds: next, color: characterPathColor }
            }
          }));
          return next;
        });
      }
      return;
    }

    if (tool === 'sessions') {
      const place = map.places.find(p => Math.hypot(p.x - coords[0], p.y - coords[1]) < 28);
      if (place) setSessionsModalPlaceId(place.id);
    }
  };

  const finishPolygon = (asZone) => {
    if (drawingPoints.length < 3) { setDrawingPoints([]); setTool(null); return; }
    const points = drawingPoints.map(([x, y]) => [x, y]);
    if (asZone) {
      const zoneId = id();
      setMap(m => ({ ...m, zones: [...(m.zones || []), { id: zoneId, name: '', points }] }));
      setNewZoneName('Новая зона');
      setZoneNameModal(zoneId);
    } else {
      const newLandscape = { id: id(), type: landscapeType, points: points.map(([a, b]) => [a, b]), fill: landscapeFill, stroke: landscapeStroke };
      setMap(m => ({ ...m, landscapes: [...(m.landscapes || []), newLandscape] }));
    }
    setDrawingPoints([]);
    setTool(null);
  };

  const addPlace = (name, type) => {
    if (!placeModal) return;
    setMap(m => ({ ...m, places: [...(m.places || []), { id: id(), name: name || 'Место', type: type || 'other', x: placeModal.x, y: placeModal.y }] }));
    setPlaceModal(null);
    setTool(null);
  };

  const updatePlaceSessions = (placeId, upcoming, past) => {
    setMap(m => ({
      ...m,
      placeSessions: {
        ...m.placeSessions,
        [placeId]: { upcoming: upcoming || [], past: past || [] }
      }
    }));
    setSessionsModalPlaceId(null);
    setTool(null);
  };

  const deleteZone = (zoneId) => {
    setMap(m => ({ ...m, zones: (m.zones || []).filter(z => z.id !== zoneId) }));
  };
  const setZoneName = (zoneId, name) => {
    const finalName = (name || newZoneName || '').trim() || 'Зона';
    setMap(m => ({ ...m, zones: (m.zones || []).map(z => z.id === zoneId ? { ...z, name: finalName } : z) }));
    setZoneNameModal(null);
    setNewZoneName('');
  };
  const deleteLandscape = (landId) => {
    setMap(m => ({ ...m, landscapes: (m.landscapes || []).filter(l => l.id !== landId) }));
  };
  const deletePlace = (placeId) => {
    setMap(m => ({
      ...m,
      places: (m.places || []).filter(p => p.id !== placeId),
      placeSessions: { ...m.placeSessions, [placeId]: undefined }
    }));
  };
  const clearCharacterPath = (characterId) => {
    setMap(m => {
      const cp = { ...m.characterPaths };
      delete cp[characterId];
      return { ...m, characterPaths: cp };
    });
    if (selectedCharacter?.id === characterId) setCharacterPathPlaces([]);
  };

  if (loading) return <div className="map-page-loading">Загрузка карты…</div>;
  if (err) return <div className="map-page-error">Ошибка: {err}</div>;

  const placeById = (id) => map.places?.find(p => p.id === id) || null;
  const charactersForDisplay = characters.length > 0 ? characters : (map.characters || []);

  return (
    <div className="map-page">
      <h1 className="map-page__title">Карта мира</h1>

      {isAdmin && (
        <div className="map-page__toolbar">
          <label className="map-page__edit-toggle">
            <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} />
            Режим редактирования
          </label>
          {editMode && (
            <>
              <div className="map-page__tools">
                <button type="button" className={tool === 'zone' ? 'active' : ''} onClick={() => { setTool('zone'); setDrawingPoints([]); }}>+ Зона</button>
                <button type="button" className={tool === 'landscape' ? 'active' : ''} onClick={() => { setTool('landscape'); setDrawingPoints([]); }}>+ Ландшафт</button>
                {tool === 'landscape' && (
                  <>
                    <select value={landscapeType} onChange={e => {
                      const lt = LANDSCAPE_TYPES.find(l => l.key === e.target.value) || LANDSCAPE_TYPES[0];
                      setLandscapeType(lt.key);
                      setLandscapeFill(lt.fill);
                      setLandscapeStroke(lt.stroke);
                    }}>
                      {LANDSCAPE_TYPES.map(l => <option key={l.key} value={l.key}>{l.label}</option>)}
                    </select>
                    <label className="map-page__color-label">
                      Заливка: <input type="color" value={landscapeFill} onChange={e => setLandscapeFill(e.target.value)} title="Цвет заливки" />
                    </label>
                    <label className="map-page__color-label">
                      Контур: <input type="color" value={landscapeStroke} onChange={e => setLandscapeStroke(e.target.value)} title="Цвет контура" />
                    </label>
                  </>
                )}
                <button type="button" className={tool === 'place' ? 'active' : ''} onClick={() => setTool('place')}>+ Место</button>
                <button type="button" className={tool === 'character' ? 'active' : ''} onClick={() => { setTool('character'); setCharacterPathPlaces([]); }}>Путь персонажа</button>
                {tool === 'character' && (
                  <>
                    <select value={selectedCharacter?.id || ''} onChange={e => setSelectedCharacter(characters.find(c => c.id === e.target.value) || null)}>
                      <option value="">— персонаж —</option>
                      {characters.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <label className="map-page__color-label">
                      Цвет пути: <input type="color" value={characterPathColor} onChange={e => setCharacterPathColor(e.target.value)} title="Цвет линии пути" />
                    </label>
                  </>
                )}
                <button type="button" className={tool === 'sessions' ? 'active' : ''} onClick={() => setTool('sessions')}>Сессии к месту</button>
              </div>
              {(tool === 'zone' || tool === 'landscape') && drawingPoints.length > 0 && (
                <button type="button" className="map-page__finish-poly" onClick={() => finishPolygon(tool === 'zone')}>Завершить</button>
              )}
              <button type="button" className="map-page__save" onClick={handleSave} disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить карту'}</button>
            </>
          )}
        </div>
      )}

      <div className="map-page__canvas-wrap">
        <svg
          ref={setSvgRef}
          className="map-page__svg"
          viewBox={`0 0 ${MAP_SIZE} ${MAP_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={handleMapClick}
        >
          <defs>
            <pattern id="grid" width={50} height={50} patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(201,169,89,0.15)" strokeWidth="0.5" />
            </pattern>
            <clipPath id="clip-portrait-circle"><circle r="12" cx="0" cy="0" /></clipPath>
            <clipPath id="clip-portrait-circle-big"><circle r="16" cx="0" cy="0" /></clipPath>
          </defs>
          <rect width={MAP_SIZE} height={MAP_SIZE} fill="#1a1210" />
          <rect width={MAP_SIZE} height={MAP_SIZE} fill="url(#grid)" />

          {/* 1. Ландшафты (снизу, перекрываются зоной) */}
          {(map.landscapes || []).map(l => {
            const pts = polygonPoints(l.points);
            if (!pts) return null;
            return (
              <g key={l.id}>
                <polygon points={pts} fill={l.fill || '#2d5a27'} stroke={l.stroke || '#1e3d1a'} strokeWidth={3} />
                {editMode && tool !== 'zone' && tool !== 'landscape' && tool !== 'character' && tool !== 'sessions' && (
                  <polygon points={pts} fill="transparent" stroke="transparent" strokeWidth={20} className="map-page__hit" onClick={(ev) => { ev.stopPropagation(); if (confirm('Удалить ландшафт?')) deleteLandscape(l.id); }} />
                )}
              </g>
            );
          })}

          {/* 2. Зоны (поверх ландшафтов); название по центру */}
          {(map.zones || []).map(z => (
            <g key={z.id}>
              <polygon points={polygonPoints(z.points)} fill="rgba(201,169,89,0.15)" stroke="rgba(201,169,89,0.5)" strokeWidth={2} />
              {z.name && (
                <text
                  x={(z.points.reduce((s, p) => s + (Number(p[0] ?? p.x) || 0), 0) / (z.points.length || 1))}
                  y={(z.points.reduce((s, p) => s + (Number(p[1] ?? p.y) || 0), 0) / (z.points.length || 1))}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#e8e0d5"
                  fontSize={14}
                  fontWeight="600"
                  style={{ paintOrder: 'stroke', stroke: '#1a1210', strokeWidth: 1.5 }}
                >{z.name}</text>
              )}
              {editMode && tool !== 'zone' && tool !== 'landscape' && tool !== 'character' && tool !== 'sessions' && (
                <polygon points={polygonPoints(z.points)} fill="transparent" stroke="transparent" strokeWidth={20} className="map-page__hit" onClick={(ev) => { ev.stopPropagation(); if (confirm('Удалить зону?')) deleteZone(z.id); }} />
              )}
            </g>
          ))}

          {/* 3. Пути персонажей: по отрезку и направлению — канонические с одной стороны, обратные с другой */}
          {(() => {
            const pathEntries = Object.entries(map.characterPaths || {}).filter(([, data]) => (data.placeIds || []).length >= 2);
            const pathSpacing = 6;
            const segmentGroups = {};
            pathEntries.forEach(([charId, data], pathIndex) => {
              const pts = (data.placeIds || []).map(pid => placeById(pid)).filter(Boolean);
              if (pts.length < 2) return;
              const first = pts[0];
              const last = pts[pts.length - 1];
              const key = [first.id, last.id].sort().join('-');
              const reversed = first.x > last.x || (first.x === last.x && first.y > last.y);
              if (!segmentGroups[key]) segmentGroups[key] = { canonical: [], reversed: [] };
              segmentGroups[key][reversed ? 'reversed' : 'canonical'].push(pathIndex);
            });
            const offsetByPathIndex = {};
            Object.values(segmentGroups).forEach(({ canonical, reversed }) => {
              const n1 = canonical.length;
              const n2 = reversed.length;
              canonical.forEach((pathIdx, i) => {
                offsetByPathIndex[pathIdx] = (i - (n1 - 1) / 2) * pathSpacing;
              });
              const shift = (n1 > 0 ? (n1 - 1) / 2 * pathSpacing + pathSpacing : 0);
              reversed.forEach((pathIdx, i) => {
                offsetByPathIndex[pathIdx] = shift + (i - (n2 - 1) / 2) * pathSpacing;
              });
            });
            return pathEntries.map(([charId, data], pathIndex) => {
              const pts = (data.placeIds || []).map(pid => placeById(pid)).filter(Boolean);
              if (pts.length < 2) return null;
              const first = pts[0];
              const last = pts[pts.length - 1];
              const canonicalFirst = (first.x < last.x || (first.x === last.x && first.y < last.y)) ? first : last;
              const canonicalLast = (first.x < last.x || (first.x === last.x && first.y < last.y)) ? last : first;
              let perpX = canonicalLast.y - canonicalFirst.y;
              let perpY = canonicalFirst.x - canonicalLast.x;
              const len = Math.hypot(perpX, perpY);
              if (len > 0.001) {
                perpX /= len;
                perpY /= len;
              } else {
                perpX = 1;
                perpY = 0;
              }
              const offsetAmount = offsetByPathIndex[pathIndex] ?? 0;
              const offsetPts = pts.map(p => ({
                x: p.x + offsetAmount * perpX,
                y: p.y + offsetAmount * perpY
              }));
              const linePoints = offsetPts.map(p => `${p.x},${p.y}`).join(' ');
              const color = data.color || DEFAULT_PATH_COLOR;
              return (
                <g key={charId}>
                  <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                  {editMode && (
                    <polyline points={linePoints} fill="none" stroke="transparent" strokeWidth={10} className="map-page__hit" onClick={(ev) => { ev.stopPropagation(); if (confirm('Удалить путь?')) clearCharacterPath(charId); }} />
                  )}
                </g>
              );
            });
          })()}

          {/* Текущий рисуемый полигон */}
          {drawingPoints.length > 0 && (
            <polygon points={polygonPoints(drawingPoints)} fill="rgba(201,169,89,0.2)" stroke="#c9a959" strokeWidth={3} strokeDasharray="4,2" />
          )}

          {/* 4. Места (иконка и подпись уменьшены пропорционально) */}
          {(map.places || []).map(p => (
            <g key={p.id} className="map-page__place">
              <PlaceIcon type={p.type} x={p.x} y={p.y - 12} size={28} />
              <text x={p.x} y={p.y + 11} textAnchor="middle" fill="#e8e0d5" fontSize={9} fontWeight="600" style={{ paintOrder: 'stroke', stroke: '#1a1210', strokeWidth: 1.2 }}>{p.name}</text>
              {tool !== 'character' && tool !== 'sessions' && (
                <circle cx={p.x} cy={p.y} r={17} fill="transparent" className="map-page__hit" onClick={(ev) => {
                  ev.stopPropagation();
                  if (editMode && confirm('Удалить место?')) deletePlace(p.id);
                  else setPlaceInfoPlaceId(p.id);
                }} />
              )}
            </g>
          ))}

          {/* 5. Портреты персонажей под названием места (не закрывают иконку места; в ряд при нескольких) */}
          {(() => {
            const portraitR = 16;
            const portraitStep = 36;
            const portraitCenterY = 38;
            const byPlace = {};
            Object.entries(map.characterPaths || {}).forEach(([charId, data]) => {
              const placeIds = data.placeIds || [];
              const lastPlaceId = placeIds[placeIds.length - 1];
              const place = placeById(lastPlaceId);
              const character = charactersForDisplay.find(c => String(c.id) === String(charId));
              if (!place || !character) return;
              const key = place.id;
              if (!byPlace[key]) byPlace[key] = { place, list: [] };
              byPlace[key].list.push({ charId, data, character });
            });
            return Object.entries(byPlace).flatMap(([placeKey, { place, list }]) =>
              list.map(({ charId, data, character }, index) => {
                const n = list.length;
                const offsetX = (index - (n - 1) / 2) * portraitStep;
                const x = place.x + offsetX;
                const y = place.y + portraitCenterY;
                return (
                  <g
                    key={`portrait-${charId}`}
                    transform={`translate(${x}, ${y})`}
                    className="map-page__portrait"
                    onClick={(ev) => { ev.stopPropagation(); setCharacterCardCharacter(character); }}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle r={portraitR} fill="#1a1210" stroke={data.color || DEFAULT_PATH_COLOR} strokeWidth={1.5} />
                    {character.imageUrl ? (
                      <g clipPath="url(#clip-portrait-circle-big)">
                        <image href={character.imageUrl} x={-portraitR} y={-portraitR} width={portraitR * 2} height={portraitR * 2} preserveAspectRatio="xMidYMid slice" />
                      </g>
                    ) : (
                      <text textAnchor="middle" dominantBaseline="middle" fill="#c9a959" fontSize={13} y={3}>{character.name ? character.name[0] : '?'}</text>
                    )}
                  </g>
                );
              })
            );
          })()}
        </svg>
      </div>

      {/* Модалка: название зоны */}
      {zoneNameModal && (
        <div className="map-page__modal-overlay" onClick={() => setZoneName(zoneNameModal, newZoneName)}>
          <div className="map-page__modal" onClick={e => e.stopPropagation()}>
            <h3>Название зоны</h3>
            <label className="map-page__modal-label">Введите название и нажмите «Готово»</label>
            <input
              type="text"
              value={newZoneName}
              onChange={e => setNewZoneName(e.target.value)}
              placeholder="Новая зона"
              autoFocus
            />
            <div className="map-page__modal-actions">
              <button type="button" onClick={() => setZoneName(zoneNameModal, newZoneName)}>Готово</button>
              <button type="button" onClick={() => setZoneName(zoneNameModal, 'Зона')}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: новое место */}
      {placeModal && (
        <div className="map-page__modal-overlay" onClick={() => setPlaceModal(null)}>
          <div className="map-page__modal" onClick={e => e.stopPropagation()}>
            <h3>Новое место</h3>
            <input type="text" placeholder="Название" id="map-place-name" defaultValue="" />
            <select id="map-place-type">
              {PLACE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <div className="map-page__modal-actions">
              <button type="button" onClick={() => addPlace(document.getElementById('map-place-name')?.value?.trim(), document.getElementById('map-place-type')?.value)}>Добавить</button>
              <button type="button" onClick={() => setPlaceModal(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: сессии к месту */}
      {sessionsModalPlaceId && (
        <div className="map-page__modal-overlay" onClick={() => setSessionsModalPlaceId(null)}>
          <div className="map-page__modal map-page__modal--wide map-page__sessions-modal" onClick={e => e.stopPropagation()}>
            <h3>Сессии в этом месте</h3>
            <p>Предстоящие:</p>
            <div className="map-page__sessions-list">
              {upcomingSessions.map(s => (
                <label key={s.id}>
                  <input type="checkbox" data-session-id={s.id} data-type="upcoming" defaultChecked={(map.placeSessions?.[sessionsModalPlaceId]?.upcoming || []).includes(s.id)} />
                  {s.title} {s.date && `(${s.date})`}
                </label>
              ))}
            </div>
            <p>Прошедшие:</p>
            <div className="map-page__sessions-list">
              {sessions.map(s => (
                <label key={s.id}>
                  <input type="checkbox" data-session-id={s.id} data-type="past" defaultChecked={(map.placeSessions?.[sessionsModalPlaceId]?.past || []).includes(s.id)} />
                  {s.title} {s.date && `(${s.date})`}
                </label>
              ))}
            </div>
            <div className="map-page__modal-actions">
              <button type="button" onClick={() => {
                const upcoming = [...document.querySelectorAll('.map-page__sessions-modal input[data-type="upcoming"]:checked')].map(inp => inp.dataset.sessionId);
                const past = [...document.querySelectorAll('.map-page__sessions-modal input[data-type="past"]:checked')].map(inp => inp.dataset.sessionId);
                updatePlaceSessions(sessionsModalPlaceId, upcoming, past);
              }}>Сохранить</button>
              <button type="button" onClick={() => setSessionsModalPlaceId(null)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: информация о месте — привязанные сессии и персонажи */}
      {placeInfoPlaceId && (() => {
        const place = map.places?.find(p => p.id === placeInfoPlaceId);
        if (!place) return null;
        const bound = map.placeSessions?.[placeInfoPlaceId] || {};
        const upcomingIds = bound.upcoming || [];
        const pastIds = bound.past || [];
        const upcomingList = upcomingIds.map(id => upcomingSessions.find(s => s.id === id)).filter(Boolean);
        const pastList = pastIds.map(id => sessions.find(s => s.id === id)).filter(Boolean);
        return (
          <div className="map-page__modal-overlay" onClick={() => setPlaceInfoPlaceId(null)}>
            <div className="map-page__modal map-page__modal--wide map-page__place-info-modal" onClick={e => e.stopPropagation()}>
              <h3>{place.name}</h3>
              {upcomingList.length > 0 && (
                <>
                  <p className="map-page__place-info-label">Предстоящие партии:</p>
                  <ul className="map-page__place-info-sessions">
                    {upcomingList.map(s => (
                      <li key={s.id}>
                        <strong>{s.title}</strong> {s.date && `(${s.date})`}
                        {(s.participants || []).length > 0 && (
                          <span className="map-page__place-info-participants"> — {s.participants.map(c => c.name).filter(Boolean).join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {pastList.length > 0 && (
                <>
                  <p className="map-page__place-info-label">Прошедшие партии:</p>
                  <ul className="map-page__place-info-sessions">
                    {pastList.map(s => (
                      <li key={s.id}>
                        <strong>{s.title}</strong> {s.date && `(${s.date})`}
                        {(s.participants || []).length > 0 && (
                          <span className="map-page__place-info-participants"> — {s.participants.map(c => c.name).filter(Boolean).join(', ')}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {upcomingList.length === 0 && pastList.length === 0 && (
                <p className="map-page__place-info-empty">К этому месту пока не привязаны партии. Используйте «Сессии к месту» в режиме редактирования.</p>
              )}
              <div className="map-page__modal-actions">
                <button type="button" onClick={() => setPlaceInfoPlaceId(null)}>Закрыть</button>
              </div>
            </div>
          </div>
        );
      })()}

      {characterCardCharacter && (
        <CharacterCardModal
          character={characterCardCharacter}
          onClose={() => setCharacterCardCharacter(null)}
          hideBio
        />
      )}
    </div>
  );
}
