import { createElement } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { MdAssessment, MdEvent, MdPeople, MdQrCode2 } from 'react-icons/md';
import Members from './Members';
import Reports from './Reports';
import Scanner from './Scanner';
import Services from './Services';
import '../styles/church-management.css';

const sections = [
  { path: 'services', label: 'Services', icon: MdEvent, component: Services },
  { path: 'attendance', label: 'Attendance', icon: MdQrCode2, component: Scanner },
  { path: 'members', label: 'Members', icon: MdPeople, component: Members },
  { path: 'reports', label: 'Reports', icon: MdAssessment, component: Reports },
];

const ChurchManagement = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = sections.find(({ path }) => location.pathname === `/management/${path}`);

  return (
    <div className="church-management">
      <nav className="church-management-tabs" aria-label="Church management sections">
        {sections.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            type="button"
            className={`church-management-tab ${activeSection?.path === path ? 'active' : ''}`}
            aria-current={activeSection?.path === path ? 'page' : undefined}
            onClick={() => navigate(`/management/${path}`)}
          >
            {createElement(Icon, { size: 20, 'aria-hidden': true })}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <div className="church-management-content">
        <Routes>
          <Route index element={<Navigate to="services" replace />} />
          {sections.map(({ path, component: Page }) => (
            <Route key={path} path={path} element={createElement(Page)} />
          ))}
          <Route path="*" element={<Navigate to="/management/services" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default ChurchManagement;
