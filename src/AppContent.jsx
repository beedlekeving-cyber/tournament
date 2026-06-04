import { ShieldCheck, LogIn } from 'lucide-react';
import TournamentScreen from './screens/TournamentScreen';
import ViewScreen from './screens/ViewScreen';
import SecurityGuard from './components/SecurityGuard';
import ConnectionStatus from './components/ConnectionStatus';
import { getAdminToken } from './utils/api';

function isViewRoute() {
  return window.location.pathname.includes('/view') || window.location.hash.includes('view');
}

function AdminOnlyView() {
  if (getAdminToken()) {
    return <ViewScreen />;
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
      style={{ background: 'linear-gradient(160deg, #0a0518 0%, #1e0a3a 100%)' }}>
      <ShieldCheck className="w-16 h-16 text-amber-400 mb-4" style={{ filter: 'drop-shadow(0 0 14px rgba(251,191,36,0.6))' }} />
      <h1 className="text-3xl font-black text-white mb-2">Admin Access Required</h1>
      <p className="text-gray-400 mb-6 max-w-sm">
        The View Screen is reserved for tournament admins. Sign in to continue.
      </p>
      <a href="/admin"
        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-black transition-all hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 0 20px rgba(251,191,36,0.4)' }}>
        <LogIn className="w-5 h-5" /> Go to Admin Login
      </a>
    </div>
  );
}

function AppContent() {
  // /view → admin-only
  if (isViewRoute()) return <AdminOnlyView />;

  // Everything else → the knockout tournament. There is no casual mode.
  return (
    <SecurityGuard matchId={null} isInMatch={false}>
      <ConnectionStatus />
      <TournamentScreen />
    </SecurityGuard>
  );
}

export default AppContent;
