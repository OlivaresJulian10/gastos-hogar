import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/',               icon: '✦',  label: 'Dashboard' },
  { to: '/registrar',      icon: '✎',  label: 'Registrar gasto' },
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

const navStyle = ({ isActive }) => ({
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
})

function AvatarCircle({ perfil, size = 36, fontSize = 13 }) {
  if (perfil?.avatar_url) {
    return (
      <img
        src={perfil.avatar_url}
        alt={perfil.nombre}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          flexShrink: 0, border: '2px solid rgba(255,107,157,0.55)',
          boxShadow: '0 2px 10px rgba(168,85,247,0.35)',
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: 'white',
      boxShadow: '0 2px 10px rgba(168,85,247,0.4)',
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
      background: 'rgba(255,255,255,0.78)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(210,100,160,0.12)',
      height: 60,
      display: 'flex', alignItems: 'center',
      padding: '0 2.25rem',
      boxShadow: '0 2px 20px rgba(168,85,247,0.07)',
      gap: 12,
    }}>
      {/* Page title */}
      <span style={{
        flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--text3)',
        letterSpacing: '0.3px', textTransform: 'uppercase',
      }}>
        {pageTitle}
      </span>

      {/* Profile button + dropdown */}
      {perfil && (
        <div ref={ref} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '5px 8px 5px 14px',
              borderRadius: 50,
              background: open
                ? 'linear-gradient(135deg,rgba(255,107,157,0.12),rgba(168,85,247,0.1))'
                : 'rgba(217,70,168,0.06)',
              border: `1.5px solid ${open ? 'rgba(217,70,168,0.35)' : 'rgba(217,70,168,0.18)'}`,
              cursor: 'pointer',
              transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
              boxShadow: open ? '0 0 0 3px rgba(217,70,168,0.1)' : 'none',
            }}
            onMouseEnter={e => { if (!open) { e.currentTarget.style.background = 'rgba(217,70,168,0.1)'; e.currentTarget.style.borderColor = 'rgba(217,70,168,0.3)' }}}
            onMouseLeave={e => { if (!open) { e.currentTarget.style.background = 'rgba(217,70,168,0.06)'; e.currentTarget.style.borderColor = 'rgba(217,70,168,0.18)' }}}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil.nombre?.split(' ')[0]}
            </span>
            <AvatarCircle perfil={perfil} size={32} fontSize={11} />
          </button>

          {open && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 10px)',
              background: 'white',
              borderRadius: 18,
              boxShadow: '0 24px 64px rgba(168,85,247,0.22), 0 4px 16px rgba(168,85,247,0.1)',
              border: '1px solid rgba(210,100,160,0.15)',
              padding: '1.25rem',
              minWidth: 248,
              animation: 'fadeDown 0.2s cubic-bezier(0.22,1,0.36,1) both',
              zIndex: 100,
            }}>
              {/* User info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                {perfil.avatar_url ? (
                  <img
                    src={perfil.avatar_url}
                    alt={perfil.nombre}
                    style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid transparent', background: 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#FF6B9D,#A855F7) border-box', boxShadow: '0 4px 14px rgba(168,85,247,0.25)' }}
                  />
                ) : (
                  <div style={{ width: 46, height: 46, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg,#FF6B9D,#A855F7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', boxShadow: '0 4px 14px rgba(168,85,247,0.3)', fontFamily: "'Playfair Display',serif" }}>
                    {(perfil.nombre || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {perfil.nombre}
                  </p>
                  <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {perfil.email}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  onClick={() => { setOpen(false); navigate('/perfil') }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 11,
                    border: '1.5px solid rgba(217,70,168,0.2)',
                    background: 'linear-gradient(135deg,rgba(255,107,157,0.07),rgba(168,85,247,0.06))',
                    color: 'var(--accent-text)', fontSize: 13.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    display: 'flex', alignItems: 'center', gap: 9,
                    transition: 'background 0.18s, border-color 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.15),rgba(168,85,247,0.13))'; e.currentTarget.style.borderColor = 'rgba(217,70,168,0.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.07),rgba(168,85,247,0.06))'; e.currentTarget.style.borderColor = 'rgba(217,70,168,0.2)' }}
                >
                  <span style={{ fontSize: 15 }}>⊙</span> Mi perfil
                </button>

                <button
                  onClick={() => { setOpen(false); cerrarSesion() }}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 11,
                    border: '1.5px solid rgba(244,63,94,0.18)',
                    background: 'rgba(244,63,94,0.05)',
                    color: 'var(--red)', fontSize: 13.5, fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    display: 'flex', alignItems: 'center', gap: 9,
                    transition: 'background 0.18s, border-color 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.12)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.35)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.05)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.18)' }}
                >
                  <span style={{ fontSize: 15 }}>↪</span> Cerrar sesión
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

  return (
    <div className="page-root" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: 'linear-gradient(170deg, #1E0845 0%, #4C1580 55%, #8B35C8 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '2rem 0 0',
        position: 'sticky', top: 0, height: '100vh',
        overflowY: 'auto',
        boxShadow: '4px 0 32px rgba(30, 8, 69, 0.35)',
        zIndex: 2,
      }}>
        {/* Logo */}
        <div style={{
          padding: '0 1.5rem 1.75rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '0.875rem', flexShrink: 0,
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', fontFamily: "'Playfair Display', serif", letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            Casa ✦
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 5, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Control de gastos
          </div>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 0.875rem', flex: 1, overflowY: 'auto' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} style={navStyle}>
              <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        {perfil && (
          <div style={{
            flexShrink: 0,
            borderTop: '1px solid rgba(255,255,255,0.12)',
            padding: '1rem 1.25rem 1.25rem',
            marginTop: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.75rem' }}>
              <AvatarCircle perfil={perfil} size={38} fontSize={13} />
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {perfil.nombre}
                </p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>
                  {perfil.email}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => navigate('/perfil')}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 11.5, fontWeight: 700,
                  background: 'linear-gradient(135deg,rgba(255,107,157,0.25),rgba(168,85,247,0.2))',
                  border: '1px solid rgba(255,107,157,0.35)', borderRadius: 9, cursor: 'pointer',
                  color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--font)', letterSpacing: '0.2px',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.4),rgba(168,85,247,0.35))'; e.currentTarget.style.borderColor = 'rgba(255,107,157,0.6)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.25),rgba(168,85,247,0.2))'; e.currentTarget.style.borderColor = 'rgba(255,107,157,0.35)' }}
              >
                Mi perfil
              </button>
              <button
                onClick={cerrarSesion}
                style={{
                  flex: 1, padding: '7px 0', fontSize: 11.5, fontWeight: 700,
                  background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.14)',
                  borderRadius: 9, cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
                  fontFamily: 'var(--font)', letterSpacing: '0.2px',
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.3)'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.5)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)' }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Right column: topbar + content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <TopBar perfil={perfil} cerrarSesion={cerrarSesion} navigate={navigate} />
        <main style={{ flex: 1, padding: '2.5rem 2.25rem', maxWidth: 1000, width: '100%' }}>
          <div className="page-enter">{children}</div>
        </main>
      </div>
    </div>
  )
}
