import React from 'react';
import InvitationCodeManager from '../components/InvitationCodeManager';
import { PageHeading } from '../components';
import { MdVpnKey } from 'react-icons/md';
import '../styles/pages.css';

const InvitationCodesPage = () => {
  return (
    <div className="page-wrapper">
      <PageHeading
        eyebrow="Access control"
        title="Invitations"
        description="Create time-limited registration codes for approved users and track their status."
        icon={MdVpnKey}
      />
      <InvitationCodeManager />
    </div>
  );
};

export default InvitationCodesPage;
