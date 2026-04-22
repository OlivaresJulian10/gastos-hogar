import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, Avatar } from '../components/UI'

export default function Personas() {
  const [personas, setPersonas] = useState([])
  const [editando, setEditando] = useState({})
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
      nombre: cambios.nombre ?? p.nombre,
      nequi: cambios.nequi !== undefined ? (cambios.nequi.trim() || null) : (p.nequi ?? null),
      cuenta_bancaria: cambios.cuenta_bancaria !== undefined ? (cambios.cuenta_bancaria.trim() || null) : (p.cuenta_bancaria ?? null),
    }
    const { error } = await supabase.from('personas').update(updates).eq('id', p.id)
    if (error) { setMsg({ tipo: 'error', texto: 'Error al guardar' }); return }
    setPersonas(ps => ps.map(x => x.id === p.id ? { ...x, ...updates } : x))
    setEditando(e => { const n = { ...e }; delete n[p.id]; return n })
    setMsg({ tipo: 'ok', texto: '✦ Datos actualizados' })
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
      <PageTitle title="Personas del hogar" sub="Edita nombres y datos de pago · Se muestran en el Balance" />

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

      <Card style={{ maxWidth: 620 }}>
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

            {/* Datos de pago */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginLeft: 50 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17 }}>📱</span>
                <input
                  style={{ ...inpStyle, width: 165 }}
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
                  style={{ ...inpStyle, width: 210 }}
                  value={editando[p.id]?.cuenta_bancaria ?? (p.cuenta_bancaria || '')}
                  onChange={e => setField(p.id, 'cuenta_bancaria', e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && guardar(p)}
                  onFocus={focus} onBlur={blur}
                  placeholder="Banco + nro. de cuenta"
                />
              </div>
            </div>
          </div>
        ))}

        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: '1rem', fontStyle: 'italic' }}>
          Presiona Enter o Guardar para actualizar · Los datos de pago se muestran en el Balance al hacer clic en 💳 Pagar
        </p>
      </Card>
    </div>
  )
}
