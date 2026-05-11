import React from 'react';
import InvitationCodeManager from '../components/InvitationCodeManager';
import '../styles/pages.css';

const InvitationCodesPage = () => {
  return (
    <div className="page-wrapper">
      <div className="page-header invitation-page-header">
        <div className="header-content">
          <span className="page-kicker">Access control</span>
          <h1>Invitations</h1>
          <p>Create time-limited registration codes for approved users and track which codes are active or already used.</p>
        </div>
      </div>
      <InvitationCodeManager />
    </div>
  );
};

export default InvitationCodesPage;
