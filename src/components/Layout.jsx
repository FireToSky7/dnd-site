import { Link } from 'react-router-dom';
import './Layout.css';

export default function Layout({ user, onLogout, children }) {
  return (
    <div className="layout">
      <header className="layout-header">
        <Link to="/" className="logo">DnD — Персонажи и сессии</Link>
        <nav>
          {user?.role === 'admin' && <Link to="/admin">Админ-панель</Link>}
          <Link to="/">Главная</Link>
          <span className="user">{user?.login}</span>
          <button type="button" className="btn-logout" onClick={onLogout}>Выйти</button>
        </nav>
      </header>
      <main className="layout-main">{children}</main>
    </div>
  );
}
