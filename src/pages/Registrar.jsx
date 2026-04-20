import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, PageTitle, CATEGORIAS, Avatar } from '../components/UI'

export default function Registrar() {
  const { user } = useAuth()
  const [personas, setPersonas] = useState([])
  const [form, setForm] = useState({
    descripcion: '', monto: '', categoria: 'mercado',
    pagado_por: '', fecha: new Date().toISOString().slice(0, 10),
    split_entre: [], notas: '',
  })
  const [dividirTodos, setDividirTodos] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    supabase.from('personas').select('*').then(({ data }) => {
      setPersonas(data || [])
      if (data?.length) {
        setForm(f => ({ ...f, pagado_por: data[0].id, split_entre: data.map(p => p.id) }))
      }
    })
  }, [])

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const toggleSplit = id => {
    setForm(f => ({
      ...f,
      split_entre: f.split_entre.includes(id)
        ? f.split_entre.filter(x => x !== id)
        : [...f.split_entre, id]
    }))
  }

  const handleDividirTodos = checked => {
    setDividirTodos(checked)
    if (checked) setForm(f => ({ ...f, split_entre: personas.map(p => p.id) }))
  }

  const guardar = async () => {
    if (!form.descripcion || !form.monto || !form.pagado_por) {
      setMsg({ tipo: 'error', texto: 'Completa descripción, monto y quién pagó.' }); return
    }
    if (form.split_entre.length === 0) {
      setMsg({ tipo: 'error', texto: 'Selecciona al menos una persona para dividir.' }); return
    }
    setGuardando(true)
    const { error } = await supabase.from('gastos').insert([{
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      categoria: form.categoria,
      pagado_por: form.pagado_por,
      fecha: form.fecha,
      split_entre: form.split_entre,
      notas: form.notas || null,
      creado_por: user?.id || null,
    }])
    setGuardando(false)
    if (error) { setMsg({ tipo: 'error', texto: 'Error al guardar: ' + error.message }); return }
    setMsg({ tipo: 'ok', texto: '¡Gasto registrado exitosamente! ✦' })
    setForm(f => ({ ...f, descripcion: '', monto: '', notas: '' }))
    setTimeout(() => setMsg(null), 3500)
  }

  const inp = {
    width: '100%', padding: '10px 14px', fontSize: 14,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)', fontWeight: 500,
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
  const label = {
    fontSize: 12, color: 'var(--text2)', marginBottom: 6,
    display: 'block', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
  }

  return (
    <div>
      <PageTitle title="Registrar gasto" sub="Añade un nuevo gasto del hogar" />
      <Card style={{ maxWidth: 620 }}>
        {msg && (
          <div style={{
            padding: '11px 16px', borderRadius: 11, marginBottom: '1.25rem', fontSize: 14, fontWeight: 600,
            background: msg.tipo === 'ok'
              ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))'
              : 'var(--red-bg)',
            color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
          }}>
            {msg.texto}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={label}>Descripción *</label>
            <input name="descripcion" value={form.descripcion} onChange={handleChange}
              placeholder="Ej: Mercado del sábado" style={inp} />
          </div>
          <div>
            <label style={label}>Monto (COP) *</label>
            <input name="monto" type="number" value={form.monto} onChange={handleChange}
              placeholder="0" min="0" step="100" style={inp} />
          </div>
          <div>
            <label style={label}>Fecha</label>
            <input name="fecha" type="date" value={form.fecha} onChange={handleChange} style={inp} />
          </div>
          <div>
            <label style={label}>Categoría</label>
            <select name="categoria" value={form.categoria} onChange={handleChange} style={inp}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>¿Quién pagó? *</label>
            <select name="pagado_por" value={form.pagado_por} onChange={handleChange} style={inp}>
              {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label style={label}>Notas (opcional)</label>
            <input name="notas" value={form.notas} onChange={handleChange}
              placeholder="Detalles adicionales..." style={inp} />
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginBottom: '1.25rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text2)' }}>
            <input type="checkbox" checked={dividirTodos}
              onChange={e => handleDividirTodos(e.target.checked)}
              style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
            Dividir entre todos
          </label>
          {!dividirTodos && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: '1rem' }}>
              {personas.map((p, i) => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '7px 14px', borderRadius: 22, fontSize: 13, fontWeight: 600,
                  border: `1.5px solid ${form.split_entre.includes(p.id) ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: form.split_entre.includes(p.id) ? 'var(--accent-bg)' : 'var(--surface)',
                  color: form.split_entre.includes(p.id) ? 'var(--accent-text)' : 'var(--text2)',
                  transition: 'all 0.18s',
                }}>
                  <input type="checkbox" checked={form.split_entre.includes(p.id)}
                    onChange={() => toggleSplit(p.id)} style={{ display: 'none' }} />
                  <Avatar nombre={p.nombre} index={i} />
                  {p.nombre}
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={guardar} disabled={guardando}
          className="btn-gradient"
          style={{
            width: '100%', padding: '12px', fontSize: 15,
            opacity: guardando ? 0.7 : 1,
            cursor: guardando ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 24px rgba(168,85,247,0.35)',
          }}
        >
          {guardando ? 'Guardando...' : '✦ Registrar gasto'}
        </button>
      </Card>
    </div>
  )
}
