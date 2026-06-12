import { Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import StorePage from './pages/StorePage'
import AdminLogin from './pages/AdminLogin'
import AdminPage from './pages/AdminPage'

export default function App() {
  const [isAdmin, setIsAdmin] = useState(() => {
    return localStorage.getItem('bujji_admin_logged_in') === 'true';
  });

  const handleLogin = () => {
    setIsAdmin(true);
    localStorage.setItem('bujji_admin_logged_in', 'true');
  };

  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('bujji_admin_logged_in');
  };

  return (
    <Routes>
      <Route path="/" element={<StorePage />} />
      <Route 
        path="/admin/login" 
        element={
          isAdmin ? <Navigate to="/admin" replace /> : <AdminLogin onLogin={handleLogin} />
        } 
      />
      <Route 
        path="/admin" 
        element={
          isAdmin ? <AdminPage onLogout={handleLogout} /> : <Navigate to="/admin/login" replace />
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}