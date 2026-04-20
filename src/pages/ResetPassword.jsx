import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AnimatedBackground from '../components/AnimatedBackground'

const inp = {
  width: '100%', padding: '11px 14px', fontSize: 14, fontWeight: 500,
  border: '1px solid rgba(180,60,130,0.28)', borderRadius: 11,
  background: '#FDF5FA', color: '#2A1040',
  outline: 'none', fontFamily: 'Nunito, sans-serif',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  boxSizing: 'border-box',
}
const lbl = {
  fontSize: 11, color: '#7A5070', fontWeight: 700,
  letterSpacing: '0.5px', textTransform: 'uppercase',
  display: 'block', marginBottom: 6,
}
const focusIn  = e => { e.currentTarget.style.borderColor = '#D946A8'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }
const focusOut = e => { e.currentTarget.style.borderColor = 'rgba(180,60,130,0.28)'; e.currentTarget.style.boxShadow = 'none' }

export default function ResetPassword() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Check existing session (recovery token in URL hash is auto-processed by Supabase client)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async e => {
    e.preventDefault()
    if (password !== confirmar) { setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden.' }); return }
    if (password.length < 6) { setMsg({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' }); return }
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setMsg({ tipo: 'error', texto: error.message }); return }
    setDone(true)
    setTimeout(() => navigate('/'), 3500)
  }

  const wrapStyle = {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '2rem',
    fontFamily: 'Nunito, sans-serif', position: 'relative', zIndex: 1,
  }
  const cardStyle = {
    background: 'white', borderRadius: 24, padding: '2rem',
    boxShadow: '0 20px 60px rgba(168,85,247,0.15)',
    border: '1px solid rgba(210,100,160,0.13)',
  }

  if (done) return (
    <>
      <AnimatedBackground />
      <div style={wrapStyle}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 52, marginBottom: 16, filter: 'drop-shadow(0 4px 16px rgba(20,184,166,0.35))' }}>✦</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: '#2A1040', marginBottom: 12 }}>¡Contraseña actualizada!</h2>
          <p style={{ color: '#7A5070', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
            Tu nueva contraseña fue guardada exitosamente.<br />
            <span style={{ color: '#14B8A6', fontWeight: 600 }}>Redirigiendo al inicio...</span>
          </p>
          <Link to="/" style={{
            display: 'inline-block', padding: '11px 28px',
            background: 'linear-gradient(135deg,#14B8A6,#6366F1)',
            color: 'white', borderRadius: 12, fontSize: 14, fontWeight: 700,
            textDecoration: 'none', boxShadow: '0 6px 24px rgba(99,102,241,0.3)',
          }}>
            Ir al dashboard
          </Link>
        </div>
      </div>
    </>
  )

  if (!ready) return (
    <>
      <AnimatedBackground />
      <div style={wrapStyle}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12, color: '#A855F7' }}>✦</div>
          <p style={{ color: '#7A5070', fontSize: 14 }}>Verificando enlace...</p>
        </div>
      </div>
    </>
  )

  return (
    <>
      <AnimatedBackground />
      <div style={wrapStyle}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: 38, fontWeight: 700, fontFamily: "'Playfair Display',serif", background: 'linear-gradient(135deg,#1E0845,#A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 6 }}>
              Casa ✦
            </div>
            <p style={{ fontSize: 13, color: '#7A5070', fontWeight: 500 }}>Control de gastos del hogar</p>
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: '#2A1040', marginBottom: 6 }}>Crear nueva contraseña</h2>
              <p style={{ fontSize: 13, color: '#7A5070', lineHeight: 1.6 }}>Elige una contraseña segura para tu cuenta.</p>
            </div>

            {msg && (
              <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: '1rem', fontSize: 13, fontWeight: 600, border: '1px solid rgba(244,63,94,0.2)', background: '#FFF1F3', color: '#F43F5E' }}>
                {msg.texto}
              </div>
            )}

            <form onSubmit={handleReset}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={lbl}>Nueva contraseña</label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres" required style={inp}
                    onFocus={focusIn} onBlur={focusOut}
                  />
                </div>
                <div>
                  <label style={lbl}>Confirmar contraseña</label>
                  <input
                    type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)}
                    placeholder="Repite la contraseña" required style={inp}
                    onFocus={focusIn} onBlur={focusOut}
                  />
                  {password && confirmar && password !== confirmar && (
                    <p style={{ fontSize: 11, color: '#F43F5E', marginTop: 5, fontWeight: 600 }}>Las contraseñas no coinciden</p>
                  )}
                  {password && confirmar && password === confirmar && (
                    <p style={{ fontSize: 11, color: '#14B8A6', marginTop: 5, fontWeight: 600 }}>✓ Las contraseñas coinciden</p>
                  )}
                </div>
                <button
                  type="submit" disabled={loading}
                  style={{
                    padding: '12px', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 12,
                    cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Nunito, sans-serif',
                    background: loading ? '#E2D9F3' : 'linear-gradient(135deg,#FF6B9D 0%,#A855F7 100%)',
                    color: loading ? '#9B82C8' : 'white',
                    boxShadow: loading ? 'none' : '0 6px 24px rgba(168,85,247,0.35)',
                    transition: 'opacity 0.2s, transform 0.18s',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {loading ? 'Guardando...' : '✦ Guardar contraseña'}
                </button>
              </div>
            </form>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <Link to="/login" style={{ fontSize: 13, color: '#A855F7', fontWeight: 600, textDecoration: 'none' }}>
                ← Volver al inicio de sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
