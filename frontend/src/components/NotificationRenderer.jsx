import React from 'react';
import { useNotificationStore } from '../context/store';
import '../styles/notifications.css';

/**
 * NotificationRenderer component displays all notifications from the store
 * Handles displaying success, error, info, and warning messages
 */
const NotificationRenderer = () => {
  const notifications = useNotificationStore((state) => state.notifications);

  return (
    <div className="notifications-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`notification notification-${notification.type}`}
          role="alert"
          aria-live="polite"
        >
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationRenderer;
