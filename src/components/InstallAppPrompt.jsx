import { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaMobileAlt, FaShareSquare, FaPlusSquare, FaDownload } from 'react-icons/fa';

const DISMISS_KEY = 'install_prompt_dismissed_at';
const DISMISS_DAYS = 3;

const isDismissedRecently = () => {
  const savedAt = Number(localStorage.getItem(DISMISS_KEY));
  if (!savedAt) return false;
  const maxAgeMs = DISMISS_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - savedAt < maxAgeMs;
};

const isStandalone = () => {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.navigator.standalone) return true;
  return false;
};

const InstallAppPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  const isMobile = useMemo(
    () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
    []
  );
  const isIos = useMemo(
    () => /iPhone|iPad|iPod/i.test(navigator.userAgent),
    []
  );

  useEffect(() => {
    if (!isMobile || isStandalone() || isDismissedRecently()) return;

    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    // iOS does not emit beforeinstallprompt, so show manual steps.
    if (isIos) {
      setVisible(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, [isIos, isMobile]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result?.outcome === 'accepted') {
      setVisible(false);
    } else {
      dismiss();
    }
    setDeferredPrompt(null);
  };

  if (!visible || !isMobile || isStandalone()) return null;

  return (
    <div className="install-app-banner" role="dialog" aria-live="polite" aria-label="Install app prompt">
      <button
        type="button"
        className="install-app-close"
        onClick={dismiss}
        aria-label="Close install prompt"
        title="Close"
      >
        <FaTimes />
      </button>

      <div className="install-app-content">
        <div className="install-app-icon-wrap">
          <FaMobileAlt className="install-app-icon" />
        </div>
        <div className="install-app-text">
          <h4>Install Chat System</h4>
          {isIos && !deferredPrompt ? (
            <p>
              Tap <FaShareSquare className="inline-icon" /> then <FaPlusSquare className="inline-icon" /> Add to Home Screen.
            </p>
          ) : (
            <p>Install this app for faster access like a mini app on your phone.</p>
          )}
        </div>
      </div>

      {!isIos && deferredPrompt && (
        <button type="button" className="install-app-action" onClick={handleInstall}>
          <FaDownload /> Install
        </button>
      )}
    </div>
  );
};

export default InstallAppPrompt;
