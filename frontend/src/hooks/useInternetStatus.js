import { useEffect, useRef } from 'react';
import { useNotificationStore } from '../context/store';

/**
 * Custom hook to detect and monitor internet connectivity status
 * Shows persistent notification when connection is lost
 * Shows temporary notification when connection is restored
 */
export const useInternetStatus = () => {
  const offlineNotificationIdRef = useRef(null);
  const showNotification = useNotificationStore((state) => state.showNotification);
  const removeNotification = useNotificationStore((state) => state.removeNotification);

  useEffect(() => {
    // Check initial online status
    if (!navigator.onLine) {
      // Start with offline notification if initially offline
      offlineNotificationIdRef.current = showNotification(
        '⚠️ No internet connection',
        'error',
        false // Don't auto-dismiss
      );
    }

    // Handler for when connection is established
    const handleOnline = () => {
      // Remove the persistent offline notification
      if (offlineNotificationIdRef.current) {
        removeNotification(offlineNotificationIdRef.current);
        offlineNotificationIdRef.current = null;
      }
      // Show temporary success notification
      showNotification('🌐 Internet connection restored', 'success', true);
    };

    // Handler for when connection is lost
    const handleOffline = () => {
      // Show persistent offline notification
      offlineNotificationIdRef.current = showNotification(
        '⚠️ No internet connection',
        'error',
        false // Don't auto-dismiss
      );
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      // Clean up notification on unmount if still showing
      if (offlineNotificationIdRef.current) {
        removeNotification(offlineNotificationIdRef.current);
      }
    };
  }, [showNotification, removeNotification]);

  return navigator.onLine;
};
