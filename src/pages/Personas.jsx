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
    if (error) { setMsg('Error al guardar'); return }
    setPersonas(ps => ps.map(x => x.id === p.id ? { ...x, nombre } : x))
    setEditando(e => { const n = { ...e }; delete n[p.id]; return n })
    setMsg('Nombre actualizado')
    setTimeout(() => setMsg(null), 2000)
  }

  const inp = {
    padding: '8px 12px', fontSize: 14, borderRadius: 8, width: 220,
    border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)',
  }

  return (
    <div>
      <PageTitle title="Personas del hogar" sub="Edita los nombres de las personas que comparten gastos" />
      {msg && <div style={{ padding: '8px 14px', background: 'var(--teal-bg)', color: 'var(--teal)', borderRadius: 8, marginBottom: '1rem', fontSize: 14 }}>{msg}</div>}
      <Card style={{ maxWidth: 480 }}>
        {personas.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
            borderBottom: i < personas.length - 1 ? '1px solid var(--border)' : 'none'
          }}>
            <Avatar nombre={editando[p.id] ?? p.nombre} index={i} />
            <input
              style={inp}
              value={editando[p.id] ?? p.nombre}
              onChange={e => setEditando(ed => ({ ...ed, [p.id]: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && guardar(p)}
            />
            {editando[p.id] !== undefined && (
              <button onClick={() => guardar(p)} style={{
                padding: '7px 14px', fontSize: 13, fontWeight: 500,
                background: 'var(--text)', color: 'var(--bg)', border: 'none',
                borderRadius: 8, cursor: 'pointer',
              }}>Guardar</button>
            )}
          </div>
        ))}
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: '1rem' }}>
          Presiona Enter o el botón Guardar para actualizar el nombre.
        </p>
      </Card>
    </div>
  )
}
