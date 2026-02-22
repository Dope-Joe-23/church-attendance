import React, { useState, useEffect } from 'react';
import { MemberDetailsModal } from '../components';
import store from '../context/store';
import apiClient from '../services/apiClient';
import '../styles/care-dashboard-new.css';

const CareDashboard = () => {
  // Main data
  const [members, setMembers] = useState([]);
  const [metricsMap, setMetricsMap] = useState({});  // member.id -> metric data
  const [alertsMap, setAlertsMap] = useState({});    // member.id -> alert data
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('absenteeism_desc');  // absenteeism_desc, absenteeism_asc, name_asc, name_desc
  const [filterAbsenteeism, setFilterAbsenteeism] = useState('all');  // all, critical, at_risk, early_warning, active
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [selectedMember, setSelectedMember] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  // Fetch all members with their metrics and alerts
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all members (required)
      const membersResponse = await apiClient.get('/members/');
      const membersList = membersResponse.data.results || membersResponse.data;
      const allMembers = membersList.filter(m => !m.is_visitor);
      
      // Fetch metrics (optional - use empty map if fails)
      let metricsMap = {};
      try {
        const metricsResponse = await apiClient.get('/members/absenteeism-metrics/');
        const metricsList = metricsResponse.data.results || metricsResponse.data || [];
        metricsList.forEach(metric => {
          metricsMap[metric.member] = metric;
        });
      } catch (err) {
        console.warn('Metrics unavailable, using empty map');
      }
      
      // Fetch alerts (optional - use empty map if fails)
      let alertsMap = {};
      try {
        const alertsResponse = await apiClient.get('/members/absenteeism-alerts/unresolved/');
        const alertsList = alertsResponse.data.results || alertsResponse.data || [];
        alertsList.forEach(alert => {
          if (!alertsMap[alert.member]) {
            alertsMap[alert.member] = alert;
          }
        });
      } catch (err) {
        console.warn('Alerts unavailable, using empty map');
      }
      
      setMembers(allMembers);
      setMetricsMap(metricsMap);
      setAlertsMap(alertsMap);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      store.showNotification('Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get metric for a member
  const getMetric = (memberId) => {
    return metricsMap[memberId] || null;
  };

  // Get alert for a member
  const getAlert = (memberId) => {
    return alertsMap[memberId] || null;
  };

  // Filter and sort members
  const getFilteredAndSortedMembers = () => {
    let filtered = members.filter(member => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!member.full_name.toLowerCase().includes(query) &&
            !member.member_id.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Absenteeism filter
      const metric = getMetric(member.id);
      if (filterAbsenteeism !== 'all') {
        if (!metric) return filterAbsenteeism === 'active';  // No metric = active
        
        const ratio = metric.absenteeism_ratio;
        switch(filterAbsenteeism) {
          case 'critical':
            return ratio >= 0.60;
          case 'at_risk':
            return ratio >= 0.40 && ratio < 0.60;
          case 'early_warning':
            return ratio >= 0.25 && ratio < 0.40;
          case 'active':
            return ratio < 0.25;
          default:
            return true;
        }
      }
      
      return true;
    });
    
    // Sort
    filtered.sort((a, b) => {
      const metricA = getMetric(a.id);
      const metricB = getMetric(b.id);
      const ratioA = metricA?.absenteeism_ratio || 0;
      const ratioB = metricB?.absenteeism_ratio || 0;
      
      switch(sortBy) {
        case 'absenteeism_desc':
          return ratioB - ratioA;
        case 'absenteeism_asc':
          return ratioA - ratioB;
        case 'name_asc':
          return a.full_name.localeCompare(b.full_name);
        case 'name_desc':
          return b.full_name.localeCompare(a.full_name);
        default:
          return 0;
      }
    });
    
    return filtered;
  };

  // Fetch member details and open modal
  const handleViewMember = async (memberId) => {
    try {
      const response = await apiClient.get(`/members/${memberId}/`);
      setSelectedMember(response.data);
      setShowMemberModal(true);
    } catch (error) {
      console.error('Error fetching member details:', error);
      store.showNotification('Error loading member details', 'error');
    }
  };

  // Handle log contact
  const handleOpenLogContact = (member) => {
    console.log('Log contact for:', member);
    store.showNotification('Contact logging feature coming soon', 'info');
    // TODO: Implement contact logging modal
  };

  // Handle resolve alert
  const handleResolveAlert = async (alertId) => {
    try {
      await apiClient.post(`/members/absenteeism-alerts/${alertId}/resolve/`, {
        resolution_notes: 'Alert resolved through pastoral care'
      });
      
      // Refresh data
      fetchAllData();
      store.showNotification('Alert marked as resolved', 'success');
    } catch (error) {
      console.error('Error resolving alert:', error);
      store.showNotification('Error resolving alert', 'error');
    }
  };

  // Get alert color and label
  const getAlertBadge = (alert) => {
    if (!alert) return null;
    
    const levelConfig = {
      critical: { color: '#d32f2f', label: 'CRITICAL', icon: '🔴' },
      at_risk: { color: '#f57c00', label: 'AT RISK', icon: '🟠' },
      early_warning: { color: '#fbc02d', label: 'WARNING', icon: '🟡' }
    };
    
    const config = levelConfig[alert.alert_level] || {};
    return (
      <span
        className="alert-badge"
        style={{ 
          backgroundColor: config.color,
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}
        title={alert.reason}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="care-dashboard-new">
        <div className="loading">Loading dashboard...</div>
      </div>
    );
  }

  const filteredMembers = getFilteredAndSortedMembers();
  const stats = {
    total: members.length,
    critical: members.filter(m => {
      const metric = getMetric(m.id);
      return metric && metric.absenteeism_ratio >= 0.60;
    }).length,
    at_risk: members.filter(m => {
      const metric = getMetric(m.id);
      return metric && metric.absenteeism_ratio >= 0.40 && metric.absenteeism_ratio < 0.60;
    }).length,
    early_warning: members.filter(m => {
      const metric = getMetric(m.id);
      return metric && metric.absenteeism_ratio >= 0.25 && metric.absenteeism_ratio < 0.40;
    }).length,
    active: members.filter(m => {
      const metric = getMetric(m.id);
      return !metric || metric.absenteeism_ratio < 0.25;
    }).length,
  };

  return (
    <div className="care-dashboard-new">
      {/* Header */}
      <div className="dashboard-header-new">
        <h1>Member Care & Attendance Dashboard</h1>
        <p>Comprehensive member attendance tracking with absenteeism metrics</p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card critical">
          <div className="stat-number">{stats.critical}</div>
          <div className="stat-label">🔴 Critical (60%+ absent)</div>
        </div>
        <div className="stat-card at-risk">
          <div className="stat-number">{stats.at_risk}</div>
          <div className="stat-label">🟠 At Risk (40-59% absent)</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-number">{stats.early_warning}</div>
          <div className="stat-label">🟡 Early Warning (25-39% absent)</div>
        </div>
        <div className="stat-card active">
          <div className="stat-number">{stats.active}</div>
          <div className="stat-label">🟢 Active (0-24% absent)</div>
        </div>
        <div className="stat-card total">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">👥 Total Members</div>
        </div>
      </div>

      {/* Controls */}
      <div className="dashboard-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="Search by name or member ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-section">
          <label>Filter by Status:</label>
          <select 
            value={filterAbsenteeism}
            onChange={(e) => setFilterAbsenteeism(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Members ({stats.total})</option>
            <option value="critical">🔴 Critical ({stats.critical})</option>
            <option value="at_risk">🟠 At Risk ({stats.at_risk})</option>
            <option value="early_warning">🟡 Warning ({stats.early_warning})</option>
            <option value="active">🟢 Active ({stats.active})</option>
          </select>
        </div>

        <div className="sort-section">
          <label>Sort by:</label>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="absenteeism_desc">Absenteeism (High to Low)</option>
            <option value="absenteeism_asc">Absenteeism (Low to High)</option>
            <option value="name_asc">Name (A to Z)</option>
            <option value="name_desc">Name (Z to A)</option>
          </select>
        </div>

        <button 
          className="refresh-button"
          onClick={fetchAllData}
          title="Refresh all data"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Members Table */}
      <div className="members-table-container">
        {filteredMembers.length === 0 ? (
          <div className="empty-state">
            <p>No members match your filters.</p>
          </div>
        ) : (
          <table className="members-table">
            <thead>
              <tr>
                <th>Member Name</th>
                <th>ID</th>
                <th>Department</th>
                <th>Group</th>
                <th>Absenteeism</th>
                <th>Services</th>
                <th>Alert Status</th>
                <th>Last Attendance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map(member => {
                const metric = getMetric(member.id);
                const alert = getAlert(member.id);
                
                return (
                  <tr key={member.id} className="member-row">
                    <td className="member-name">
                      <strong>{member.full_name}</strong>
                    </td>
                    <td className="member-id">{member.member_id}</td>
                    <td>{member.department || '—'}</td>
                    <td>{member.group || '—'}</td>
                    
                    <td className="absenteeism-cell">
                      {metric ? (
                        <div>
                          <div className="absenteeism-ratio">
                            {metric.absenteeism_percentage.toFixed(1)}%
                          </div>
                          <div className="absenteeism-breakdown">
                            {metric.absent_count}/{metric.total_services} services
                          </div>
                        </div>
                      ) : (
                        <span className="no-data">No data</span>
                      )}
                    </td>
                    
                    <td className="services-cell">
                      {metric ? (
                        <div>
                          <span className="present">✓ {metric.present_count}</span>
                          <span className="absent">✗ {metric.absent_count}</span>
                        </div>
                      ) : (
                        <span className="no-data">—</span>
                      )}
                    </td>
                    
                    <td className="alert-cell">
                      {getAlertBadge(alert) || <span style={{ color: '#4caf50' }}>🟢 Active</span>}
                    </td>
                    
                    <td className="last-attendance">
                      {member.last_attendance_date 
                        ? new Date(member.last_attendance_date).toLocaleDateString()
                        : '—'
                      }
                    </td>
                    
                    <td className="actions-cell">
                      <button
                        className="btn-view"
                        onClick={() => handleViewMember(member.id)}
                        title="View details"
                      >
                        👁️ View
                      </button>
                      {alert && (
                        <button
                          className="btn-resolve"
                          onClick={() => handleResolveAlert(alert.id)}
                          title="Resolve alert"
                        >
                          ✓ Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={showMemberModal}
        member={selectedMember}
        onClose={() => setShowMemberModal(false)}
        onOpenLogContact={handleOpenLogContact}
      />
    </div>
  );
};

export default CareDashboard;
