import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components';
import {
  Home,
  Members,
  Services,
  Scanner,
  Reports,
} from './pages';
import './styles/index.css';
import './styles/components.css';
import './styles/pages.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main style={{ minHeight: 'calc(100vh - 70px)' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/members" element={<Members />} />
            <Route path="/services" element={<Services />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
