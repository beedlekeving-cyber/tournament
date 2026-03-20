import { useGame } from '../context/GameContext';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export default function ConnectionStatus() {
  const { state } = useGame();
  const { isConnected } = state;

  // Don't show anything when connected (less visual clutter)
  if (isConnected) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-100 animate-fade-in">
      <div className="flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-sm rounded-full shadow-lg border border-red-400/30">
        <WifiOff className="w-4 h-4 text-white animate-pulse" />
        <span className="text-white text-sm font-medium">Reconnecting...</span>
        <RefreshCw className="w-4 h-4 text-white animate-spin" />
      </div>
    </div>
  );
}
