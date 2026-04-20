import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AnimatedBackground from './AnimatedBackground'

const navItems = [
  { to: '/',             icon: '✦',  label: 'Dashboard' },
  { to: '/registrar',    icon: '✎',  label: 'Registrar gasto' },
  { to: '/historial',    icon: '≋',  label: 'Historial' },
  { to: '/comparativo',  icon: '◈',  label: 'Comparativos' },
  { to: '/balance',      icon: '⇆',  label: 'Balance' },
  { to: '/presupuesto',  icon: '◐',  label: 'Presupuesto hogar' },
  { to: '/mi-presupuesto', icon: '◆', label: 'Mi presupuesto' },
  { to: '/personas',     icon: '◉',  label: 'Personas' },
]

export default function Layout({ children }) {
  const { perfil, cerrarSesion } = useAuth()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <AnimatedBackground />
      <aside style={{
        width: 240,
        flexShrink: 0,
        background: 'linear-gradient(170deg, #1E0845 0%, #4C1580 55%, #8B35C8 100%)',
        display: 'flex',
        flexDirection: 'column',
        padding: '2rem 0 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        boxShadow: '4px 0 32px rgba(30, 8, 69, 0.35)',
        zIndex: 2,
      }}>
        <div style={{
          padding: '0 1.5rem 1.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '0.875rem',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 22, fontWeight: 700, color: 'white',
            fontFamily: "'Playfair Display', serif",
            letterSpacing: '-0.3px', lineHeight: 1.2,
          }}>
            Casa ✦
          </div>
          <div style={{
            fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600,
            marginTop: 5, letterSpacing: '1.5px', textTransform: 'uppercase',
          }}>
            Control de gastos
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 0.875rem', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 11,
                padding: '9px 14px', borderRadius: 13, fontSize: 13.5,
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'white' : 'rgba(255,255,255,0.65)',
                textDecoration: 'none',
                transition: 'background 0.18s, color 0.18s',
                background: isActive
                  ? 'linear-gradient(90deg,rgba(255,107,157,0.38) 0%,rgba(168,85,247,0.22) 100%)'
                  : 'transparent',
                boxShadow: isActive ? 'inset 0 0 0 1px rgba(255,107,157,0.3)' : 'none',
              })}
            >
              <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>
                {item.icon}
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div style={{
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '1rem 1.25rem',
          marginTop: '0.5rem',
        }}>
          {perfil ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: 'white',
                  boxShadow: '0 2px 10px rgba(168,85,247,0.4)',
                }}>
                  {(perfil.nombre || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {perfil.nombre}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {perfil.email}
                  </p>
                </div>
              </div>
              <button
                onClick={cerrarSesion}
                style={{
                  width: '100%', padding: '7px', fontSize: 12, fontWeight: 700,
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 10, cursor: 'pointer',
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'var(--font)', letterSpacing: '0.3px',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.28)'; e.currentTarget.style.color = 'white' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', letterSpacing: '0.5px' }}>
              ✦ hecho con amor ✦
            </div>
          )}
        </div>
      </aside>

      <main style={{
        flex: 1, padding: '2.5rem 2.25rem',
        maxWidth: 1000, width: '100%', minHeight: '100vh',
      }}>
        <div className="page-enter">{children}</div>
      </main>
    </div>
  )
}
