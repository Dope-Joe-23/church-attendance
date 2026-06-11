import React from 'react';
import { createPortal } from 'react-dom';
import { useNotificationStore } from '../context/store';
import '../styles/notifications.css';

/**
 * NotificationRenderer component displays all notifications from the store.
 * Uses createPortal to render directly into document.body so notifications
 * always sit above all other content regardless of parent stacking contexts.
 */
const NotificationRenderer = () => {
  const notifications = useNotificationStore((state) => state.notifications);

  return createPortal(
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
    </div>,
    document.body
  );
};

export default NotificationRenderer;
