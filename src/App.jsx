import { GameProvider } from './context/GameContext';
import { AdminProvider, useAdmin } from './admin/AdminContext';
import AppContent from './AppContent';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';

function AdminRoot() {
  const { state } = useAdmin();
  return state.isAuthenticated ? <AdminDashboard /> : <AdminLogin />;
}

function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');

  if (isAdmin) {
    return (
      <AdminProvider>
        <AdminRoot />
      </AdminProvider>
    );
  }

  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}

export default App;
