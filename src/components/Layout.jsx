import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/',           icon: '▦',  label: 'Dashboard' },
  { to: '/registrar',  icon: '+',  label: 'Registrar gasto' },
  { to: '/historial',  icon: '≡',  label: 'Historial' },
  { to: '/comparativo',icon: '↕',  label: 'Comparativos' },
  { to: '/balance',    icon: '⇌',  label: 'Balance' },
  { to: '/personas',   icon: '◎',  label: 'Personas' },
]

const s = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: {
    width: 220, flexShrink: 0, background: 'var(--surface)',
    borderRight: '1px solid var(--border)', display: 'flex',
    flexDirection: 'column', padding: '1.5rem 0',
    position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
  },
  logo: {
    padding: '0 1.25rem 1.5rem', fontSize: 17, fontWeight: 600,
    letterSpacing: '-0.3px', color: 'var(--text)',
    borderBottom: '1px solid var(--border)', marginBottom: '0.75rem',
  },
  logoSub: { fontSize: 12, color: 'var(--text3)', fontWeight: 400 },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, padding: '0 0.75rem' },
  link: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 'var(--radius)',
    fontSize: 14, color: 'var(--text2)', textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
  },
  activeLink: { background: 'var(--accent-bg)', color: 'var(--accent-text)', fontWeight: 500 },
  icon: { fontSize: 16, width: 20, textAlign: 'center', flexShrink: 0 },
  main: { flex: 1, padding: '2rem', maxWidth: 960, width: '100%' },
  header: { marginBottom: '2rem' },
}

export default function Layout({ children }) {
  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.logo}>
          Casa 🏠<br />
          <span style={s.logoSub}>Control de gastos</span>
        </div>
        <nav style={s.nav}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({ ...s.link, ...(isActive ? s.activeLink : {}) })}
            >
              <span style={s.icon}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main style={s.main}>{children}</main>
    </div>
  )
}
