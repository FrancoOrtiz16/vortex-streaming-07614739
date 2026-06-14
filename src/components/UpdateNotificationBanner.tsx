import { useEffect, useState } from 'react';
import { IconRefresh } from '@tabler/icons-react';

interface UpdateNotificationBannerProps {
  pollInterval?: number; // milliseconds
}

export const UpdateNotificationBanner = ({ pollInterval = 300000 }: UpdateNotificationBannerProps) => {
  const [showBanner, setShowBanner] = useState(false);
  const [, setCurrentVersion] = useState<string | null>(null);

  const checkForUpdates = async () => {
    try {
      // Check if already snoozed in this session
      const snoozed = sessionStorage.getItem('update_notification_snoozed');
      if (snoozed === 'true') {
        return;
      }

      // Fetch version.json with cache buster
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        console.warn('[UpdateNotificationBanner] Failed to fetch version.json:', response.status);
        return;
      }

      const versionData = await response.json();
      const remoteVersion = versionData.version as string;

      if (!remoteVersion) {
        console.warn('[UpdateNotificationBanner] Invalid version.json format');
        return;
      }

      // Get stored version from localStorage
      const storedVersion = localStorage.getItem('app_version');

      // If versions differ, show banner and update stored version
      if (storedVersion !== remoteVersion) {
        setCurrentVersion(remoteVersion);
        setShowBanner(true);
        // Update localStorage to track this version
        localStorage.setItem('app_version', remoteVersion);
      }
    } catch (error) {
      console.warn('[UpdateNotificationBanner] Error checking for updates:', error);
    }
  };

  useEffect(() => {
    // Check on mount
    void checkForUpdates();

    // Set up polling
    const intervalId = setInterval(() => {
      void checkForUpdates();
    }, pollInterval);

    return () => clearInterval(intervalId);
  }, [pollInterval]);

  const handleReload = () => {
    // Clear snooze flag to allow notifications again
    sessionStorage.removeItem('update_notification_snoozed');
    // Reload the page
    window.location.reload();
  };

  const handleSnooze = () => {
    // Set snooze flag for this session
    sessionStorage.setItem('update_notification_snoozed', 'true');
    // Hide the banner
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#07070f',
        borderTop: '1px solid rgba(26, 111, 255, 0.4)',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 9998,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Left side: Icon and text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <IconRefresh size={16} color="#1a6fff" strokeWidth={2} />
        <div>
          <div
            style={{
              fontSize: '13px',
              color: '#fff',
              fontWeight: 500,
            }}
          >
            Hay una nueva versión disponible
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: '2px',
            }}
          >
            Recarga para ver los últimos cambios
          </div>
        </div>
      </div>

      {/* Right side: Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleReload}
          style={{
            backgroundColor: '#1a6fff',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 16px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1557d8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1a6fff';
          }}
        >
          Recargar ahora
        </button>
        <button
          onClick={handleSnooze}
          style={{
            backgroundColor: 'transparent',
            color: 'rgba(255, 255, 255, 0.5)',
            border: '0.5px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '7px 16px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = 'rgba(255, 255, 255, 0.8)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = 'rgba(255, 255, 255, 0.5)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
};

export default UpdateNotificationBanner;
