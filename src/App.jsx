import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { me } from './api';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminPage from './pages/AdminPage';
import Layout from './components/Layout';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    me().then(u => { setUser(u); setLoading(false); }).catch(() => { setUser(null); setLoading(false); });
  }, []);

  const onLogin = (u) => setUser(u);
  const onLogout = () => { localStorage.removeItem('token'); setUser(null); };

  if (loading) return <div className="loading">Загрузка…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage onLogin={onLogin} />} />
      <Route path="/" element={user ? <Layout user={user} onLogout={onLogout}><Dashboard user={user} /></Layout> : <Navigate to="/login" />} />
      <Route path="/admin" element={user?.role === 'admin' ? <Layout user={user} onLogout={onLogout}><AdminPage /></Layout> : user ? <Navigate to="/" /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} />} />
    </Routes>
  );
}
