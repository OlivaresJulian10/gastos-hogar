import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

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

export default function Login() {
  const [modo, setModo] = useState('login')
  const [form, setForm] = useState({ nombre: '', email: '', password: '', confirmar: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [confirmar, setConfirmar] = useState(false)
  const navigate = useNavigate()

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleLogin = async e => {
    e.preventDefault()
    setLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    setLoading(false)
    if (error) { setError(traducirError(error.message)); return }
    navigate('/')
  }

  const handleRegistro = async e => {
    e.preventDefault()
    if (form.password !== form.confirmar) { setError('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true); setError(null)
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { nombre: form.nombre.trim() || form.email.split('@')[0] } },
    })
    setLoading(false)
    if (error) { setError(traducirError(error.message)); return }
    if (data.session) { navigate('/') } else { setConfirmar(true) }
  }

  function traducirError(msg) {
    if (msg.includes('Invalid login')) return 'Correo o contraseña incorrectos'
    if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de ingresar'
    if (msg.includes('User already registered')) return 'Este correo ya tiene una cuenta'
    if (msg.includes('Password should')) return 'La contraseña debe tener al menos 6 caracteres'
    return msg
  }

  if (confirmar) return (
    <div className="page-root" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'Nunito, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 48, marginBottom: 16, filter: 'drop-shadow(0 4px 16px rgba(217,70,168,0.3))' }}>✦</div>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: '#2A1040', marginBottom: 10 }}>¡Revisa tu correo!</h2>
        <p style={{ color: '#7A5070', fontSize: 14, lineHeight: 1.6 }}>
          Te enviamos un enlace de confirmación a <strong>{form.email}</strong>. Una vez confirmado, podrás ingresar.
        </p>
        <button onClick={() => { setConfirmar(false); setModo('login') }} style={{ marginTop: 24, padding: '10px 24px', background: 'linear-gradient(135deg,#FF6B9D,#A855F7)', color: 'white', border: 'none', borderRadius: 11, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'Nunito, sans-serif' }}>
          Ir al login
        </button>
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

        <div style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', borderRadius: 24, padding: '2rem', boxShadow: '0 20px 60px rgba(168,85,247,0.18)', border: '1px solid rgba(210,100,160,0.15)' }}>

          <div style={{ display: 'flex', background: '#FDF5FA', borderRadius: 12, padding: 4, marginBottom: '1.5rem' }}>
            {['login', 'registro'].map(m => (
              <button key={m} onClick={() => { setModo(m); setError(null) }} style={{
                flex: 1, padding: '8px', fontSize: 13, fontWeight: 700,
                border: 'none', borderRadius: 9, cursor: 'pointer',
                fontFamily: 'Nunito, sans-serif',
                background: modo === m ? 'linear-gradient(135deg,#FF6B9D,#A855F7)' : 'transparent',
                color: modo === m ? 'white' : '#7A5070',
                boxShadow: modo === m ? '0 2px 10px rgba(168,85,247,0.25)' : 'none',
                transition: 'all 0.2s',
              }}>
                {m === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, marginBottom: '1rem', background: '#FFF1F3', color: '#F43F5E', fontSize: 13, fontWeight: 600, border: '1px solid rgba(244,63,94,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {modo === 'registro' && (
                <div>
                  <label style={lbl}>Nombre</label>
                  <input name="nombre" type="text" value={form.nombre} onChange={set} placeholder="Tu nombre" style={inp} onFocus={focusIn} onBlur={focusOut} />
                </div>
              )}

              <div>
                <label style={lbl}>Correo electrónico</label>
                <input name="email" type="email" value={form.email} onChange={set} placeholder="hola@ejemplo.com" required style={inp} onFocus={focusIn} onBlur={focusOut} />
              </div>

              <div>
                <label style={lbl}>Contraseña</label>
                <input name="password" type="password" value={form.password} onChange={set} placeholder="Mínimo 6 caracteres" required style={inp} onFocus={focusIn} onBlur={focusOut} />
              </div>

              {modo === 'registro' && (
                <div>
                  <label style={lbl}>Confirmar contraseña</label>
                  <input name="confirmar" type="password" value={form.confirmar} onChange={set} placeholder="Repite la contraseña" required style={inp} onFocus={focusIn} onBlur={focusOut} />
                </div>
              )}

              {modo === 'login' && (
                <div style={{ textAlign: 'right', marginTop: -8 }}>
                  <Link to="/olvide-password" style={{ fontSize: 12, color: '#A855F7', fontWeight: 600, textDecoration: 'none' }}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Nunito, sans-serif', letterSpacing: '0.2px', transition: 'opacity 0.2s, transform 0.18s',
                  background: loading ? '#E2D9F3' : 'linear-gradient(135deg,#FF6B9D 0%,#A855F7 100%)',
                  color: loading ? '#9B82C8' : 'white',
                  boxShadow: loading ? 'none' : '0 6px 24px rgba(168,85,247,0.35)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              >
                {loading ? 'Cargando...' : modo === 'login' ? '✦ Ingresar' : '✦ Crear cuenta'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
