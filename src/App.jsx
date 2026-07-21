import { GameProvider } from './context/GameContext';
import { AdminProvider, useAdmin } from './admin/AdminContext';
import AppContent from './AppContent';
import AdminLogin from './admin/AdminLogin';
import AdminDashboard from './admin/AdminDashboard';
import InstallPWA from './components/InstallPWA';

function AdminRoot() {
  const { state } = useAdmin();
  return state.isAuthenticated ? <AdminDashboard /> : <AdminLogin />;
}

function App() {
  const isAdmin = window.location.pathname.startsWith('/admin');
  const isView = window.location.pathname.startsWith('/view');

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
      {/* Install-app prompt for players only (skip on admin + big-screen /view) */}
      {!isView && <InstallPWA />}
    </GameProvider>
  );
}

export default App;
