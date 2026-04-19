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

  const guardar = async (p) => {
    const nombre = editando[p.id] ?? p.nombre
    const { error } = await supabase.from('personas').update({ nombre }).eq('id', p.id)
    if (error) { setMsg({ tipo: 'error', texto: 'Error al guardar' }); return }
    setPersonas(ps => ps.map(x => x.id === p.id ? { ...x, nombre } : x))
    setEditando(e => { const n = { ...e }; delete n[p.id]; return n })
    setMsg({ tipo: 'ok', texto: '✦ Nombre actualizado' })
    setTimeout(() => setMsg(null), 2500)
  }

  const inp = {
    padding: '9px 14px', fontSize: 14, borderRadius: 11, width: 230,
    border: '1px solid var(--border-strong)',
    background: 'var(--surface)', color: 'var(--text)',
    fontFamily: 'var(--font)', fontWeight: 500, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }

  return (
    <div>
      <PageTitle title="Personas del hogar" sub="Edita los nombres de quienes comparten gastos" />

      {msg && (
        <div style={{
          padding: '10px 16px',
          background: msg.tipo === 'ok'
            ? 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(99,102,241,0.07))'
            : 'var(--red-bg)',
          color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
          borderRadius: 11, marginBottom: '1.25rem', fontSize: 14, fontWeight: 700,
          border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
        }}>
          {msg.texto}
        </div>
      )}

      <Card style={{ maxWidth: 500 }}>
        {personas.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
            borderBottom: i < personas.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <Avatar nombre={editando[p.id] ?? p.nombre} index={i} />
            <input
              style={inp}
              value={editando[p.id] ?? p.nombre}
              onChange={e => setEditando(ed => ({ ...ed, [p.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && guardar(p)}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            />
            {editando[p.id] !== undefined && (
              <button
                onClick={() => guardar(p)}
                className="btn-gradient"
                style={{ padding: '8px 16px', fontSize: 13, whiteSpace: 'nowrap' }}
              >
                Guardar
              </button>
            )}
          </div>
        ))}
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: '1rem', fontStyle: 'italic' }}>
          Presiona Enter o el botón Guardar para actualizar el nombre.
        </p>
      </Card>
    </div>
  )
}
