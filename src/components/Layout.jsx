import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',               icon: '⬡',  label: 'Dashboard' },
  { to: '/registrar',      icon: '+',   label: 'Registrar gasto' },
  { to: '/historial',      icon: '≋',  label: 'Historial' },
  { to: '/comparativo',    icon: '◈',  label: 'Comparativos' },
  { to: '/balance',        icon: '⇆',  label: 'Balance' },
  { to: '/presupuesto',    icon: '◐',  label: 'Presupuesto hogar' },
  { to: '/mi-presupuesto', icon: '◆',  label: 'Mi presupuesto' },
  { to: '/personas',       icon: '◉',  label: 'Personas' },
  { to: '/perfil',         icon: '⊙',  label: 'Perfil' },
]

const PAGE_TITLES = {
  '/':               'Dashboard',
  '/registrar':      'Registrar gasto',
  '/historial':      'Historial',
  '/comparativo':    'Comparativos',
  '/balance':        'Balance',
  '/presupuesto':    'Presupuesto del hogar',
  '/mi-presupuesto': 'Mi presupuesto',
  '/personas':       'Personas',
  '/perfil':         'Mi perfil',
}

function AvatarCircle({ perfil, size = 36, fontSize = 13 }) {
  if (perfil?.avatar_url) {
    return (
      <img
        src={perfil.avatar_url}
        alt={perfil.nombre}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0, border: '2px solid rgba(255,107,157,0.5)',
          boxShadow: '0 2px 12px rgba(168,85,247,0.4)',
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#FF6B9D,#C026D3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: 'white',
      boxShadow: '0 2px 12px rgba(168,85,247,0.45)',
      border: '2px solid rgba(255,255,255,0.15)',
    }}>
      {(perfil?.nombre || '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

function TopBar({ perfil, cerrarSesion, navigate }) {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const pageTitle = PAGE_TITLES[location.pathname] || ''

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
      borderBottom: '1px solid rgba(220,160,240,0.14)',
      height: 62,
      display: 'flex', alignItems: 'center',
      padding: '0 2.25rem', gap: 12,
      boxShadow: '0 1px 24px rgba(168,85,247,0.07)',
    }}>
      <span style={{
        flex: 1, fontSize: 11, fontWeight: 800, color: 'var(--text3)',
        letterSpacing: '1.5px', textTransform: 'uppercase',
      }}>
        {pageTitle}
      </span>

      {perfil && (
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '5px 8px 5px 14px', borderRadius: 50,
              background: open
                ? 'linear-gradient(135deg,rgba(255,107,157,0.14),rgba(168,85,247,0.12))'
                : 'rgba(192,38,211,0.05)',
              border: `1.5px solid ${open ? 'rgba(192,38,211,0.4)' : 'rgba(192,38,211,0.15)'}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: open ? '0 0 0 4px rgba(192,38,211,0.08)' : 'none',
            }}
            onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'rgba(192,38,211,0.09)'; e.currentTarget.style.borderColor = 'rgba(192,38,211,0.3)' }}}
            onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'rgba(192,38,211,0.05)'; e.currentTarget.style.borderColor = 'rgba(192,38,211,0.15)' }}}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil.nombre?.split(' ')[0]}
            </span>
            <AvatarCircle perfil={perfil} size={32} fontSize={11} />
          </button>

          {open && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 12px)',
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
              borderRadius: 20,
              boxShadow: '0 24px 64px rgba(168,85,247,0.2), 0 4px 16px rgba(168,85,247,0.1)',
              border: '1px solid rgba(220,160,240,0.2)',
              padding: '1.25rem', minWidth: 252,
              animation: 'fadeDown 0.22s cubic-bezier(0.22,1,0.36,1) both',
              zIndex: 100,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(192,38,211,0.1)' }}>
                {perfil.avatar_url ? (
                  <img src={perfil.avatar_url} alt={perfil.nombre} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, boxShadow: '0 4px 16px rgba(168,85,247,0.28)' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#FF6B9D,#C026D3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', boxShadow: '0 4px 16px rgba(192,38,211,0.35)' }}>
                    {(perfil.nombre || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perfil.nombre}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{perfil.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => { setOpen(false); navigate('/perfil') }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: '1.5px solid rgba(192,38,211,0.18)',
                    background: 'linear-gradient(135deg,rgba(255,107,157,0.07),rgba(168,85,247,0.05))',
                    color: 'var(--accent-text)', fontSize: 13.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    display: 'flex', alignItems: 'center', gap: 9, transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.14),rgba(168,85,247,0.1))'}
                  onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.07),rgba(168,85,247,0.05))'}
                >
                  <span>⊙</span> Mi perfil
                </button>
                <button
                  onClick={() => { setOpen(false); cerrarSesion() }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 12,
                    border: '1.5px solid rgba(244,63,94,0.15)',
                    background: 'rgba(244,63,94,0.04)',
                    color: 'var(--red)', fontSize: 13.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    display: 'flex', alignItems: 'center', gap: 9, transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.04)'}
                >
                  <span>↪</span> Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </header>
  )
}

export default function Layout({ children }) {
  const { perfil, cerrarSesion } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="page-root" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 248, flexShrink: 0,
        background: 'linear-gradient(160deg, #13022E 0%, #3B0E72 48%, #7C28C0 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '0',
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
        boxShadow: '6px 0 40px rgba(19,2,46,0.4)',
        zIndex: 2,
      }}>
        {/* Subtle noise overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
          opacity: 0.5,
        }} />

        {/* Logo */}
        <div style={{
          padding: '1.75rem 1.5rem 1.5rem', position: 'relative', zIndex: 1,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <div style={{
            fontSize: 24, fontWeight: 700, color: 'white',
            fontFamily: "'Playfair Display', serif", letterSpacing: '-0.3px', lineHeight: 1.2,
          }}>
            Casa{' '}
            <span style={{
              background: 'linear-gradient(135deg,#FF6B9D,#C026D3)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>✦</span>
          </div>
          <div style={{
            fontSize: 9.5, color: 'rgba(255,255,255,0.38)', fontWeight: 700,
            marginTop: 5, letterSpacing: '2px', textTransform: 'uppercase',
          }}>
            Control de gastos
          </div>
        </div>

        {/* Nav */}
        <nav style={{
          display: 'flex', flexDirection: 'column', gap: 1,
          padding: '1rem 0.75rem', flex: 1, overflowY: 'auto',
          position: 'relative', zIndex: 1,
        }}>
          {navItems.map(item => {
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to)
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 14px 10px 12px',
                  borderRadius: 13,
                  borderLeft: isActive ? '3px solid #FF6B9D' : '3px solid transparent',
                  fontSize: 13.5,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                  transition: 'all 0.18s ease',
                  background: isActive
                    ? 'linear-gradient(90deg,rgba(255,107,157,0.28),rgba(168,85,247,0.14))'
                    : 'transparent',
                  boxShadow: isActive ? '0 2px 16px rgba(255,107,157,0.15)' : 'none',
                }}
                onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}}
                onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.background = 'transparent' }}}
              >
                <span style={{ fontSize: 15, width: 22, textAlign: 'center', flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {/* User section */}
        {perfil && (
          <div style={{
            flexShrink: 0, position: 'relative', zIndex: 1,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '1rem 1.1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
              <AvatarCircle perfil={perfil} size={40} fontSize={14} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {perfil.nombre}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1, letterSpacing: '0.2px' }}>
                  {perfil.email}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button
                onClick={() => navigate('/perfil')}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,107,157,0.18)',
                  border: '1px solid rgba(255,107,157,0.3)', borderRadius: 10,
                  cursor: 'pointer', color: 'rgba(255,255,255,0.88)',
                  fontFamily: 'var(--font)', letterSpacing: '0.2px',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,157,0.32)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,107,157,0.18)'}
              >
                Mi perfil
              </button>
              <button
                onClick={cerrarSesion}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
                  cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'var(--font)', letterSpacing: '0.2px',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.25)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              >
                Salir
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar perfil={perfil} cerrarSesion={cerrarSesion} navigate={navigate} />
        <main style={{ flex: 1, padding: '2.5rem 2.25rem', maxWidth: 1040, width: '100%' }}>
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  )
}
