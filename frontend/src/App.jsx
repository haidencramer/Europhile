import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import GearPage      from './pages/GearPage'
import PatchesPage   from './pages/PatchesPage'
import PatchDetail   from './pages/PatchDetail'
import RackPage      from './pages/RackPage'

export default function App() {
  return (
    <BrowserRouter>
      <nav style={styles.nav}>
        <span style={styles.logo}>⬡ Europhile</span>
        <NavLink to="/"      style={navStyle} end>Gear</NavLink>
        <NavLink to="/rack"  style={navStyle}>Rack</NavLink>
        <NavLink to="/patches" style={navStyle}>Patches</NavLink>
      </nav>
      <main style={styles.main}>
        <Routes>
          <Route path="/"              element={<GearPage />} />
          <Route path="/rack"          element={<RackPage />} />
          <Route path="/patches"       element={<PatchesPage />} />
          <Route path="/patches/:id"   element={<PatchDetail />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

const navStyle = ({ isActive }) => ({
  color: isActive ? '#e8c97a' : '#aaa',
  textDecoration: 'none',
  fontWeight: isActive ? 600 : 400,
  fontSize: 14,
})

const styles = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '12px 24px',
    background: '#111',
    borderBottom: '1px solid #222',
  },
  logo: {
    color: '#e8c97a',
    fontWeight: 700,
    fontSize: 18,
    marginRight: 'auto',
    letterSpacing: 1,
  },
  main: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '24px 16px',
  },
}