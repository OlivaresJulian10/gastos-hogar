import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, PageTitle, CATEGORIAS, Avatar } from '../components/UI'
import { uploadFactura, validateFactura, isImage, FACTURA_ACCEPT } from '../lib/uploadFactura'

function UploadProgress({ progress }) {
  if (progress === null) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
        <span>Subiendo factura...</span>
        <span style={{ color: 'var(--accent)' }}>{progress}%</span>
      </div>
      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: 'linear-gradient(90deg,#FF6B9D,#A855F7)',
          width: `${progress}%`,
          transition: 'width 0.2s ease',
          boxShadow: '0 0 8px rgba(168,85,247,0.5)',
        }} />
      </div>
    </div>
  )
}

function FacturaPreview({ file, previewUrl, onRemove }) {
  if (!file) return null
  const esPDF = file.type === 'application/pdf'
  return (
    <div style={{
      marginTop: 10, padding: '10px 12px', borderRadius: 11,
      background: 'linear-gradient(135deg,rgba(255,107,157,0.06),rgba(168,85,247,0.06))',
      border: '1.5px dashed rgba(168,85,247,0.3)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {esPDF ? (
        <div style={{ width: 44, height: 44, borderRadius: 8, background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
          📄
        </div>
      ) : (
        <img src={previewUrl} alt="Preview" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {file.name}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
          {(file.size / 1024).toFixed(0)} KB · {esPDF ? 'PDF' : 'Imagen'}
        </p>
      </div>
      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text3)', flexShrink: 0, padding: '4px 6px', borderRadius: 6, transition: 'color 0.18s' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
        title="Quitar archivo"
      >
        ✕
      </button>
    </div>
  )
}

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

  // Factura state
  const [facturaFile, setFacturaFile] = useState(null)
  const [facturaPreview, setFacturaPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)
  const facturaRef = useRef(null)

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

  const handleFacturaChange = e => {
    const file = e.target.files[0]
    if (!file) return
    const err = validateFactura(file)
    if (err) { setMsg({ tipo: 'error', texto: err }); return }
    setFacturaFile(file)
    setFacturaPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    setMsg(null)
  }

  const quitarFactura = () => {
    setFacturaFile(null)
    setFacturaPreview(null)
    setUploadProgress(null)
    if (facturaRef.current) facturaRef.current.value = ''
  }

  const guardar = async () => {
    if (!form.descripcion || !form.monto || !form.pagado_por) {
      setMsg({ tipo: 'error', texto: 'Completa descripción, monto y quién pagó.' }); return
    }
    if (form.split_entre.length === 0) {
      setMsg({ tipo: 'error', texto: 'Selecciona al menos una persona para dividir.' }); return
    }
    setGuardando(true); setMsg(null)

    // 1. Insert gasto
    const { data, error } = await supabase.from('gastos').insert([{
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      categoria: form.categoria,
      pagado_por: form.pagado_por,
      fecha: form.fecha,
      split_entre: form.split_entre,
      notas: form.notas || null,
      creado_por: user?.id || null,
    }]).select().single()

    if (error) { setMsg({ tipo: 'error', texto: 'Error al guardar: ' + error.message }); setGuardando(false); return }

    // 2. Upload factura if selected
    if (facturaFile) {
      try {
        setUploadProgress(0)
        const { url } = await uploadFactura(data.id, facturaFile, setUploadProgress)
        await supabase.from('gastos').update({ factura_url: url }).eq('id', data.id)
      } catch (upErr) {
        console.warn('Factura no subida:', upErr.message)
      }
    }

    setGuardando(false)
    setMsg({ tipo: 'ok', texto: '¡Gasto registrado exitosamente! ✦' })
    setForm(f => ({ ...f, descripcion: '', monto: '', notas: '' }))
    quitarFactura()
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

          {/* Factura */}
          <div style={{ gridColumn: '1/-1' }}>
            <label style={label}>Factura (opcional)</label>
            <input
              ref={facturaRef}
              type="file"
              accept={FACTURA_ACCEPT}
              onChange={handleFacturaChange}
              style={{ display: 'none' }}
            />
            {!facturaFile ? (
              <button
                type="button"
                onClick={() => facturaRef.current?.click()}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 11, cursor: 'pointer',
                  border: '1.5px dashed rgba(168,85,247,0.35)',
                  background: 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))',
                  color: 'var(--text2)', fontSize: 13.5, fontWeight: 600,
                  fontFamily: 'var(--font)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 8,
                  transition: 'border-color 0.18s, background 0.18s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.65)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.08),rgba(168,85,247,0.08))' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))' }}
              >
                📎 Adjuntar factura
              </button>
            ) : (
              <>
                <FacturaPreview file={facturaFile} previewUrl={facturaPreview} onRemove={quitarFactura} />
                <UploadProgress progress={uploadProgress} />
              </>
            )}
          </div>
        </div>

        {/* Split */}
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
          {guardando ? (facturaFile && uploadProgress !== null ? `Subiendo ${uploadProgress}%...` : 'Guardando...') : '✦ Registrar gasto'}
        </button>
      </Card>
    </div>
  )
}
