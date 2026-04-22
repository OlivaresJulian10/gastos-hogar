import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, Avatar } from '../components/UI'

export default function Personas() {
  const [personas, setPersonas] = useState([])
  const [editando, setEditando] = useState({})
  const [subiendo, setSubiendo] = useState({})
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('personas').select('*').then(({ data }) => setPersonas(data || []))
  }, [])

  const setField = (id, field, value) =>
    setEditando(e => ({ ...e, [id]: { ...e[id], [field]: value } }))

  const tieneCambios = (p) => editando[p.id] !== undefined

  const guardar = async (p) => {
    const cambios = editando[p.id] || {}
    const updates = {
      nombre:          cambios.nombre          !== undefined ? cambios.nombre.trim()                    : p.nombre,
      nequi:           cambios.nequi           !== undefined ? (cambios.nequi.trim() || null)           : (p.nequi ?? null),
      cuenta_bancaria: cambios.cuenta_bancaria !== undefined ? (cambios.cuenta_bancaria.trim() || null) : (p.cuenta_bancaria ?? null),
    }
    const { error } = await supabase.from('personas').update(updates).eq('id', p.id)
    if (error) { setMsg({ tipo: 'error', texto: 'Error al guardar: ' + error.message }); return }
    setPersonas(ps => ps.map(x => x.id === p.id ? { ...x, ...updates } : x))
    setEditando(e => { const n = { ...e }; delete n[p.id]; return n })
    setMsg({ tipo: 'ok', texto: '✦ Datos actualizados' })
    setTimeout(() => setMsg(null), 2500)
  }

  const subirQR = async (persona, tipo, file) => {
    if (!file) return
    const key = `${persona.id}-${tipo}`
    setSubiendo(s => ({ ...s, [key]: true }))

    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${persona.id}-qr-${tipo}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatares')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setMsg({ tipo: 'error', texto: 'Error al subir QR: ' + uploadError.message })
      setSubiendo(s => ({ ...s, [key]: false }))
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(path)
    const url = `${publicUrl}?t=${Date.now()}`
    const campo = tipo === 'nequi' ? 'qr_nequi_url' : 'qr_bancolombia_url'

    await supabase.from('personas').update({ [campo]: url }).eq('id', persona.id)
    setPersonas(ps => ps.map(p => p.id === persona.id ? { ...p, [campo]: url } : p))
    setSubiendo(s => ({ ...s, [key]: false }))
    setMsg({ tipo: 'ok', texto: `QR de ${tipo === 'nequi' ? 'Nequi' : 'Bancolombia'} guardado ✦` })
    setTimeout(() => setMsg(null), 2500)
  }

  const inpStyle = {
    padding: '9px 12px', fontSize: 14, borderRadius: 10,
    border: '1px solid var(--border-strong)',
    background: 'var(--surface)', color: 'var(--text)',
    fontFamily: 'var(--font)', fontWeight: 500, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
  const focus = e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }
  const blur  = e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }

  return (
    <div>
      <PageTitle title="Personas del hogar" sub="Edita nombres, datos de pago y QR · Se muestran en el Balance" />

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 11, marginBottom: '1.25rem', fontSize: 14, fontWeight: 700,
          background: msg.tipo === 'ok'
            ? 'linear-gradient(135deg,rgba(20,184,166,0.1),rgba(99,102,241,0.07))'
            : 'var(--red-bg)',
          color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
          border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
        }}>
          {msg.texto}
        </div>
      )}

      <Card style={{ maxWidth: 680 }}>
        {personas.map((p, i) => (
          <div key={p.id} style={{
            padding: '1.1rem 0',
            borderBottom: i < personas.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            {/* Nombre */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '0.75rem' }}>
              <Avatar nombre={editando[p.id]?.nombre ?? p.nombre} index={i} />
              <input
                style={{ ...inpStyle, width: 220 }}
                value={editando[p.id]?.nombre ?? p.nombre}
                onChange={e => setField(p.id, 'nombre', e.target.value)}
                onKeyDown={e => e.key === 'Enter' && guardar(p)}
                onFocus={focus} onBlur={blur}
                placeholder="Nombre"
              />
              {tieneCambios(p) && (
                <button
                  onClick={() => guardar(p)}
                  className="btn-gradient"
                  style={{ padding: '8px 16px', fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  Guardar
                </button>
              )}
            </div>

            {/* Cuentas (texto) */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 50, marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17 }}>📱</span>
                <input
                  style={{ ...inpStyle, width: 160 }}
                  value={editando[p.id]?.nequi ?? (p.nequi || '')}
                  onChange={e => setField(p.id, 'nequi', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardar(p)}
                  onFocus={focus} onBlur={blur}
                  placeholder="Nequi / Daviplata"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17 }}>🏦</span>
                <input
                  style={{ ...inpStyle, width: 205 }}
                  value={editando[p.id]?.cuenta_bancaria ?? (p.cuenta_bancaria || '')}
                  onChange={e => setField(p.id, 'cuenta_bancaria', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardar(p)}
                  onFocus={focus} onBlur={blur}
                  placeholder="Banco + nro. cuenta"
                />
              </div>
            </div>

            {/* QR uploads */}
            <div style={{ display: 'flex', gap: 20, marginLeft: 50, flexWrap: 'wrap' }}>
              {/* QR Nequi */}
              <div>
                <input
                  id={`qr-${p.id}-nequi`}
                  type="file" accept="image/*"
                  onChange={e => subirQR(p, 'nequi', e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.qr_nequi_url ? (
                    <img
                      src={p.qr_nequi_url}
                      alt="QR Nequi"
                      onClick={() => document.getElementById(`qr-${p.id}-nequi`)?.click()}
                      title="Clic para cambiar"
                      style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,107,157,0.5)', cursor: 'pointer' }}
                    />
                  ) : (
                    <button
                      onClick={() => document.getElementById(`qr-${p.id}-nequi`)?.click()}
                      style={{
                        width: 52, height: 52, borderRadius: 10, cursor: 'pointer',
                        border: '1.5px dashed rgba(255,107,157,0.45)',
                        background: 'rgba(255,107,157,0.04)',
                        color: 'var(--text3)', fontSize: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >+</button>
                  )}
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>QR Nequi</p>
                    <button
                      onClick={() => document.getElementById(`qr-${p.id}-nequi`)?.click()}
                      style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, fontFamily: 'var(--font)' }}
                    >
                      {subiendo[`${p.id}-nequi`] ? 'Subiendo...' : p.qr_nequi_url ? 'Cambiar QR' : 'Subir QR'}
                    </button>
                  </div>
                </div>
              </div>

              {/* QR Bancolombia */}
              <div>
                <input
                  id={`qr-${p.id}-bancolombia`}
                  type="file" accept="image/*"
                  onChange={e => subirQR(p, 'bancolombia', e.target.files[0])}
                  style={{ display: 'none' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {p.qr_bancolombia_url ? (
                    <img
                      src={p.qr_bancolombia_url}
                      alt="QR Bancolombia"
                      onClick={() => document.getElementById(`qr-${p.id}-bancolombia`)?.click()}
                      title="Clic para cambiar"
                      style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(99,102,241,0.5)', cursor: 'pointer' }}
                    />
                  ) : (
                    <button
                      onClick={() => document.getElementById(`qr-${p.id}-bancolombia`)?.click()}
                      style={{
                        width: 52, height: 52, borderRadius: 10, cursor: 'pointer',
                        border: '1.5px dashed rgba(99,102,241,0.45)',
                        background: 'rgba(99,102,241,0.04)',
                        color: 'var(--text3)', fontSize: 22,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >+</button>
                  )}
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>QR Bancolombia</p>
                    <button
                      onClick={() => document.getElementById(`qr-${p.id}-bancolombia`)?.click()}
                      style={{ fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, fontFamily: 'var(--font)' }}
                    >
                      {subiendo[`${p.id}-bancolombia`] ? 'Subiendo...' : p.qr_bancolombia_url ? 'Cambiar QR' : 'Subir QR'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: '1rem', fontStyle: 'italic' }}>
          Presiona Enter o Guardar para actualizar · Los QR se muestran en el modal de pago del Balance
        </p>
      </Card>
    </div>
  )
}
