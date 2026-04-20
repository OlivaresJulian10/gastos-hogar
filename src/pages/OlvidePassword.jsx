import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const inp = {
  width: '100%', padding: '11px 14px', fontSize: 14, fontWeight: 500,
  border: '1px solid rgba(180,60,130,0.28)', borderRadius: 11,
  background: 'rgba(255,255,255,0.85)', color: '#2A1040',
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

export default function OlvidePassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [enviado, setEnviado] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (!email) { setMsg({ tipo: 'error', texto: 'Ingresa tu correo electrónico.' }); return }
    setLoading(true); setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setMsg({ tipo: 'error', texto: error.message }); return }
    setEnviado(true)
  }

  if (enviado) return (
    <div className="page-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 52, marginBottom: 16, filter: 'drop-shadow(0 4px 16px rgba(217,70,168,0.3))' }}>✦</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: '#2A1040', marginBottom: 12 }}>¡Revisa tu correo!</h2>
        <p style={{ color: '#7A5070', fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
          Enviamos un enlace a <strong style={{ color: '#2A1040' }}>{email}</strong>.<br />
          Haz clic en él para crear una nueva contraseña.
        </p>
        <Link to="/login" style={{
          display: 'inline-block', padding: '11px 28px',
          background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
          color: 'white', borderRadius: 12, fontSize: 14, fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 6px 24px rgba(168,85,247,0.35)',
        }}>
          Volver al inicio
        </Link>
      </div>
    </div>
  )

  return (
    <div className="page-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: 38, fontWeight: 700, fontFamily: "'Playfair Display',serif", background: 'linear-gradient(135deg,#1E0845,#A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', marginBottom: 6 }}>
            Casa ✦
          </div>
          <p style={{ fontSize: 13, color: '#7A5070', fontWeight: 500 }}>Control de gastos del hogar</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', borderRadius: 24, padding: '2rem', boxShadow: '0 20px 60px rgba(168,85,247,0.18)', border: '1px solid rgba(210,100,160,0.15)' }}>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: '#2A1040', marginBottom: 6 }}>¿Olvidaste tu contraseña?</h2>
            <p style={{ fontSize: 13, color: '#7A5070', lineHeight: 1.6 }}>Ingresa tu correo y te enviamos un enlace para restablecerla.</p>
          </div>

          {msg && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: '1rem', fontSize: 13, fontWeight: 600, border: '1px solid rgba(244,63,94,0.2)', background: '#FFF1F3', color: '#F43F5E' }}>
              {msg.texto}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={lbl}>Correo electrónico</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="hola@ejemplo.com" required style={inp}
                  onFocus={focusIn} onBlur={focusOut}
                />
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
                {loading ? 'Enviando...' : '✦ Enviar enlace'}
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
  )
}
