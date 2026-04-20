import { useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Card, PageTitle } from '../components/UI'

const inp = {
  width: '100%', padding: '10px 14px', fontSize: 15,
  border: '1px solid var(--border-strong)', borderRadius: 11,
  background: 'var(--surface)', color: 'var(--text)',
  outline: 'none', fontFamily: 'var(--font)', fontWeight: 500,
  transition: 'border-color 0.2s, box-shadow 0.2s',
}
const lbl = {
  fontSize: 12, color: 'var(--text2)', fontWeight: 700,
  letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6,
}

function Msg({ msg }) {
  if (!msg) return null
  return (
    <div style={{
      padding: '10px 16px', borderRadius: 10, marginBottom: '1.25rem', fontSize: 14, fontWeight: 600,
      background: msg.tipo === 'ok'
        ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))'
        : 'var(--red-bg)',
      color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
      border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
    }}>
      {msg.texto}
    </div>
  )
}

export default function Perfil() {
  const { user, perfil, cerrarSesion, recargarPerfil } = useAuth()
  const [nombre, setNombre] = useState(perfil?.nombre || '')
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [msgFoto, setMsgFoto] = useState(null)
  const [msgNombre, setMsgNombre] = useState(null)
  const [confirmarLogout, setConfirmarLogout] = useState(false)
  const inputFoto = useRef(null)

  const handleFoto = async e => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMsgFoto({ tipo: 'error', texto: 'Solo se permiten archivos de imagen.' }); return
    }
    if (file.size > 3 * 1024 * 1024) {
      setMsgFoto({ tipo: 'error', texto: 'La imagen no puede superar 3 MB.' }); return
    }
    setSubiendo(true); setMsgFoto(null)

    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${user.id}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('avatares')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (upErr) { setMsgFoto({ tipo: 'error', texto: upErr.message }); setSubiendo(false); return }

    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`

    await supabase.from('perfiles').update({ avatar_url: url }).eq('id', user.id)
    await recargarPerfil()
    setSubiendo(false)
    setMsgFoto({ tipo: 'ok', texto: '¡Foto de perfil actualizada! ✦' })
    setTimeout(() => setMsgFoto(null), 3500)
  }

  const handleGuardar = async () => {
    if (!nombre.trim()) { setMsgNombre({ tipo: 'error', texto: 'El nombre no puede estar vacío.' }); return }
    setGuardando(true); setMsgNombre(null)
    const { error } = await supabase.from('perfiles').update({ nombre: nombre.trim() }).eq('id', user.id)
    if (error) { setMsgNombre({ tipo: 'error', texto: error.message }); setGuardando(false); return }
    await recargarPerfil()
    setGuardando(false)
    setMsgNombre({ tipo: 'ok', texto: '¡Nombre actualizado! ✦' })
    setTimeout(() => setMsgNombre(null), 3500)
  }

  const avatarSrc = perfil?.avatar_url

  return (
    <div>
      <PageTitle title="Mi perfil" sub="Gestiona tu información personal" />

      {/* Foto de perfil */}
      <Card style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.3px', marginBottom: '1.25rem' }}>
          Foto de perfil
        </p>
        <Msg msg={msgFoto} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Avatar preview */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Avatar"
                style={{
                  width: 90, height: 90, borderRadius: '50%', objectFit: 'cover',
                  border: '3px solid transparent',
                  background: 'linear-gradient(white,white) padding-box, linear-gradient(135deg,#FF6B9D,#A855F7) border-box',
                  boxShadow: '0 6px 24px rgba(168,85,247,0.25)',
                }}
              />
            ) : (
              <div style={{
                width: 90, height: 90, borderRadius: '50%',
                background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, fontWeight: 700, color: 'white',
                boxShadow: '0 6px 24px rgba(168,85,247,0.3)',
                fontFamily: "'Playfair Display', serif",
              }}>
                {(perfil?.nombre || '?').slice(0, 2).toUpperCase()}
              </div>
            )}
            {subiendo && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(168,85,247,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 18,
              }}>
                ✦
              </div>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
              JPG, PNG o WebP · Máximo 3 MB
            </p>
            <input
              ref={inputFoto}
              type="file"
              accept="image/*"
              onChange={handleFoto}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => inputFoto.current?.click()}
              disabled={subiendo}
              className="btn-gradient"
              style={{ padding: '9px 20px', fontSize: 13, opacity: subiendo ? 0.7 : 1 }}
            >
              {subiendo ? 'Subiendo...' : avatarSrc ? '✦ Cambiar foto' : '✦ Subir foto'}
            </button>
          </div>
        </div>
      </Card>

      {/* Información personal */}
      <Card style={{ maxWidth: 520, marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.3px', marginBottom: '1.25rem' }}>
          Información personal
        </p>
        <Msg msg={msgNombre} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={lbl}>Nombre</label>
            <input
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuardar()}
              style={inp}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            />
          </div>
          <div>
            <label style={lbl}>Correo electrónico</label>
            <input
              value={user?.email || ''}
              readOnly
              style={{ ...inp, background: 'var(--surface2)', color: 'var(--text3)', cursor: 'not-allowed' }}
            />
            <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 5 }}>El correo no se puede modificar.</p>
          </div>
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="btn-gradient"
            style={{ padding: '11px', fontSize: 14, opacity: guardando ? 0.7 : 1, boxShadow: '0 6px 24px rgba(168,85,247,0.3)' }}
          >
            {guardando ? 'Guardando...' : '✦ Guardar cambios'}
          </button>
        </div>
      </Card>

      {/* Cerrar sesión */}
      <Card style={{ maxWidth: 520 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.3px', marginBottom: '0.75rem' }}>
          Sesión
        </p>
        <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          Al cerrar sesión deberás ingresar nuevamente con tu correo y contraseña.
        </p>
        <button
          onClick={() => setConfirmarLogout(true)}
          style={{
            padding: '10px 22px', fontSize: 14, fontWeight: 700, border: '1.5px solid rgba(244,63,94,0.4)',
            borderRadius: 11, cursor: 'pointer', fontFamily: 'var(--font)',
            background: 'var(--red-bg)', color: 'var(--red)',
            transition: 'background 0.2s, border-color 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F43F5E'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#F43F5E' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--red-bg)'; e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.4)' }}
        >
          Cerrar sesión
        </button>
      </Card>

      {/* Modal de confirmación */}
      {confirmarLogout && (
        <div
          onClick={() => setConfirmarLogout(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(30,8,69,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 24, padding: '2rem',
              maxWidth: 380, width: '90%', textAlign: 'center',
              boxShadow: '0 30px 80px rgba(30,8,69,0.3)',
              border: '1px solid rgba(210,100,160,0.15)',
            }}
          >
            <div style={{ fontSize: 44, marginBottom: 12 }}>👋</div>
            <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: '#2A1040', marginBottom: 10 }}>
              ¿Cerrar sesión?
            </h3>
            <p style={{ color: '#7A5070', fontSize: 14, lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Tendrás que volver a ingresar con tu correo y contraseña.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setConfirmarLogout(false)}
                style={{
                  flex: 1, padding: '11px', fontSize: 14, fontWeight: 700, borderRadius: 12,
                  border: '1.5px solid var(--border-strong)', background: 'var(--surface2)',
                  color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)',
                  transition: 'background 0.2s',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={cerrarSesion}
                style={{
                  flex: 1, padding: '11px', fontSize: 14, fontWeight: 700, borderRadius: 12,
                  border: 'none', background: 'linear-gradient(135deg,#F43F5E,#EC4899)',
                  color: 'white', cursor: 'pointer', fontFamily: 'var(--font)',
                  boxShadow: '0 6px 20px rgba(244,63,94,0.35)',
                }}
              >
                Sí, salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
