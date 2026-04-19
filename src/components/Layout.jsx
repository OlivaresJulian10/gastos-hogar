import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/',             icon: '✦',  label: 'Dashboard' },
  { to: '/registrar',    icon: '✎',  label: 'Registrar gasto' },
  { to: '/historial',    icon: '≋',  label: 'Historial' },
  { to: '/comparativo',  icon: '◈',  label: 'Comparativos' },
  { to: '/balance',      icon: '⇆',  label: 'Balance' },
  { to: '/presupuesto',  icon: '◐',  label: 'Presupuesto' },
  { to: '/personas',     icon: '◉',  label: 'Personas' },
]

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: 'linear-gradient(170deg, #1E0845 0%, #4C1580 55%, #8B35C8 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 0 1.5rem',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        boxShadow: '4px 0 32px rgba(30, 8, 69, 0.35)',
      }}>
        <div style={{
          padding: '0 1.5rem 1.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '0.875rem',
        }}>
          <div style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'white',
            fontFamily: "'Playfair Display', serif",
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}>
            Casa ✦
          </div>
          <div style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.5)',
            fontWeight: 600,
            marginTop: 5,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}>
            Control de gastos
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 0.875rem', flex: 1 }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '10px 14px',
                borderRadius: 13,
                fontSize: 14,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                transition: 'background 0.18s, color 0.18s',
                background: isActive
                  ? 'linear-gradient(90deg, rgba(255,107,157,0.38) 0%, rgba(168,85,247,0.22) 100%)'
                  : 'transparent',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,107,157,0.3)' : 'none',
              })}
            >
              <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{
          padding: '1.25rem 1.5rem 0',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          marginTop: '1rem',
        }}>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            letterSpacing: '0.5px',
          }}>
            ✦ hecho con amor ✦
          </div>
        </div>
      </aside>

      <main style={{
        flex: 1,
        padding: '2.5rem 2.25rem',
        maxWidth: 1000,
        width: '100%',
        minHeight: '100vh',
      }}>
        <div className="page-enter">
          {children}
        </div>
      </main>
    </div>
  )
}
