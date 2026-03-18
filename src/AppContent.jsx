import { useGame } from './context/GameContext';
import JoinScreen from './screens/JoinScreen';
import SpecialScreen from './screens/SpecialScreen';
import LobbyScreen from './screens/LobbyScreen';
import WaitingScreen from './screens/WaitingScreen';
import CountdownScreen from './screens/CountdownScreen';
import MatchScreen from './screens/MatchScreen';
import ResultScreen from './screens/ResultScreen';
import ChampionScreen from './screens/ChampionScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import SpecialViewScreen from './screens/SpecialViewScreen';
import SecurityGuard from './components/SecurityGuard';

// Detect /special or /bible path for Bible quiz
function isSpecialRoute() {
  return window.location.pathname.includes('/special') || 
         window.location.pathname.includes('/bible') ||
         window.location.hash.includes('special') ||
         window.location.hash.includes('bible');
}

// Detect /view path — works in SPA hash and pathname routing
function isViewRoute() {
  return window.location.pathname.includes('/view') || window.location.hash.includes('view');
}

function AppContent() {
  const { state } = useGame();
  const { stage, matchId } = state;
  const isInMatch = stage === 'match';

  // ── Spectator / admin big-screen view ────────────────────────────────────
  if (isViewRoute()) {
    return <SpecialViewScreen />;
  }

  // ── Bible Quiz (Special Session) - Always available at /special or /bible ──
  if (isSpecialRoute()) {
    return <SecurityGuard matchId={null} isInMatch={false}><SpecialScreen /></SecurityGuard>;
  }

  // ── Normal game flow ────────────────────────────────────────────────────

  const screen = (() => {
    switch (stage) {
      case 'join':        return <JoinScreen />;
      case 'waiting':     return <WaitingScreen />;
      case 'lobby':       return <LobbyScreen />;
      case 'countdown':   return <CountdownScreen />;
      case 'match':       return <MatchScreen />;
      case 'result':      return <ResultScreen />;
      case 'champion':    return <ChampionScreen />;
      case 'leaderboard': return <LeaderboardScreen />;
      default:            return <JoinScreen />;
    }
  })();

  return (
    <SecurityGuard matchId={matchId} isInMatch={isInMatch}>
      {screen}
    </SecurityGuard>
  );
}

export default AppContent;
