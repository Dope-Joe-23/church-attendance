import React, { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import '../styles/components.css';

const AbsenceAlertBadge = ({ onBadgeClick }) => {
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔔 AbsenceAlertBadge mounted - fetching initial data');
    fetchConsecutiveAbsences();
    // Do NOT auto-refresh - removed per user request to reduce unnecessary API calls
    // Users can navigate away and back or manually refresh to get latest data
  }, []);

  const fetchConsecutiveAbsences = async () => {
    try {
      console.log('🔔 [DEBUG] Fetching members with 10+ absences...');
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/members/with_ten_absences/');
      console.log('🔔 [DEBUG] API Response:', response);
      console.log('🔔 [DEBUG] Response data:', response.data);
      console.log('🔔 [DEBUG] Count from response:', response.data.count);
      
      const count = response.data.count || 0;
      console.log('🔔 [DEBUG] Setting alertCount to:', count);
      
      setAlertCount(count);
      
      console.log('🔔 [DEBUG] Alert count set. Badge should render: ', count > 0);
    } catch (err) {
      // Don't log 401 errors - they're expected during initial load and handled by apiClient
      if (err.response?.status !== 401) {
        console.error('🔔 [ERROR] Error fetching absence alerts:', err);
        setError('Failed to load alerts');
      } else {
        console.log('🔔 [DEBUG] Got 401, apiClient will retry');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBadgeClick = () => {
    console.log('🔔 [DEBUG] Badge clicked - refreshing data');
    // Refresh data when clicked to ensure latest alerts
    fetchConsecutiveAbsences().then(() => {
      if (onBadgeClick) {
        onBadgeClick();
      }
    });
  };

  console.log('🔔 [DEBUG] Rendering - alertCount:', alertCount, 'Should show badge:', alertCount > 0);

  if (alertCount === 0) {
    console.log('🔔 [DEBUG] Alert count is 0, returning null (badge hidden)');
    return null; // Don't show badge if no alerts
  }

  console.log('🔔 [DEBUG] Rendering badge with count:', alertCount);

  return (
    <div className="absence-alert-badge-container">
      <button
        className="absence-alert-badge"
        onClick={handleBadgeClick}
        title="View members with 10+ consecutive absences"
        aria-label={`${alertCount} members with consecutive absences alert`}
      >
        <span className="badge-icon">⚠️</span>
        <span className="badge-count">{alertCount}</span>
        <span className="badge-label">Absent</span>
      </button>
    </div>
  );
};

export default AbsenceAlertBadge;
