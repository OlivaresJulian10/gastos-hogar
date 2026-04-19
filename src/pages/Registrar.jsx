import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, CATEGORIAS, Avatar } from '../components/UI'

export default function Registrar() {
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
    }])
    setGuardando(false)
    if (error) { setMsg({ tipo: 'error', texto: 'Error al guardar: ' + error.message }); return }
    setMsg({ tipo: 'ok', texto: '¡Gasto registrado exitosamente!' })
    setForm(f => ({ ...f, descripcion: '', monto: '', notas: '' }))
    setTimeout(() => setMsg(null), 3000)
  }

  const inp = {
    width: '100%', padding: '9px 12px', fontSize: 14,
    border: '1px solid var(--border-strong)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
  }
  const label = { fontSize: 13, color: 'var(--text2)', marginBottom: 5, display: 'block' }

  return (
    <div>
      <PageTitle title="Registrar gasto" sub="Añade un nuevo gasto del hogar" />
      <Card style={{ maxWidth: 600 }}>
        {msg && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: '1rem', fontSize: 14,
            background: msg.tipo === 'ok' ? 'var(--teal-bg)' : 'var(--red-bg)',
            color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
          }}>{msg.texto}</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={dividirTodos}
              onChange={e => handleDividirTodos(e.target.checked)} />
            Dividir entre todos
          </label>
          {!dividirTodos && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {personas.map((p, i) => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  padding: '6px 12px', borderRadius: 20, fontSize: 13,
                  border: `1px solid ${form.split_entre.includes(p.id) ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.split_entre.includes(p.id) ? 'var(--accent-bg)' : 'var(--surface)',
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

        <button onClick={guardar} disabled={guardando} style={{
          width: '100%', padding: '10px', fontSize: 15, fontWeight: 500,
          background: 'var(--text)', color: 'var(--bg)', border: 'none',
          borderRadius: 8, cursor: guardando ? 'not-allowed' : 'pointer',
          opacity: guardando ? 0.7 : 1,
        }}>
          {guardando ? 'Guardando...' : 'Registrar gasto'}
        </button>
      </Card>
    </div>
  )
}
