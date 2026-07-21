import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

/**
 * "Add to Home Screen" prompt for Quiz Arena.
 *
 * How it renders:
 *   - Android / Chrome / Edge: shows a small "Install app" button once the
 *     browser fires `beforeinstallprompt`. One tap opens the native install
 *     sheet. Nothing appears if the app is already installed or the browser
 *     doesn't support install prompts.
 *   - iOS Safari: shows a short "Add to Home Screen" hint (Apple doesn't
 *     expose an install prompt API — users must tap Share → Add to Home
 *     Screen manually).
 */
export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && window.localStorage.getItem('qa_install_dismissed') === '1'
  );

  useEffect(() => {
    // Already installed?
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }
    if (window.navigator.standalone === true) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    // Show the iOS-specific hint on iPhone/iPad Safari where no install event fires.
    const ua = window.navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS/.test(ua);
    if (isIOS && isSafari) setShowIOSHint(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);
    if (choice?.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    try { window.localStorage.setItem('qa_install_dismissed', '1'); } catch (_) {}
  };

  if (installed || dismissed) return null;

  // Android / Chrome / Edge — real install prompt available
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl shadow-2xl px-4 py-3 max-w-sm w-full"
          style={{
            background: 'linear-gradient(135deg, rgba(217,119,6,0.95), rgba(236,72,153,0.9))',
            border: '1px solid rgba(251,191,36,0.4)',
            backdropFilter: 'blur(20px)',
          }}>
          <Download className="w-5 h-5 text-white shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">Add Quiz Arena to your phone</p>
            <p className="text-amber-100 text-xs">Install for quick access next tournament.</p>
          </div>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-xl bg-white text-amber-700 font-black text-xs shrink-0"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="text-white/70 hover:text-white text-lg leading-none px-1 shrink-0"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // iOS Safari — no install API, show manual hint
  if (showIOSHint) {
    return (
      <div className="fixed bottom-4 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
        <div className="pointer-events-auto flex items-start gap-3 rounded-2xl shadow-2xl px-4 py-3 max-w-sm w-full"
          style={{
            background: 'linear-gradient(135deg, rgba(217,119,6,0.95), rgba(236,72,153,0.9))',
            border: '1px solid rgba(251,191,36,0.4)',
            backdropFilter: 'blur(20px)',
          }}>
          <Download className="w-5 h-5 text-white shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm">Add Quiz Arena to your home screen</p>
            <p className="text-amber-100 text-xs mt-0.5">
              Tap <span className="inline-block px-1 rounded bg-white/25 font-mono">Share</span> in Safari, then
              <span className="inline-block px-1 rounded bg-white/25 font-mono ml-1">Add to Home Screen</span>.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install hint"
            className="text-white/70 hover:text-white text-lg leading-none px-1 shrink-0"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  return null;
}
