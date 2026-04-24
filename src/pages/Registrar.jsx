import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, PageTitle, CATEGORIAS, Avatar } from '../components/UI'
import { uploadFactura, validateFactura, FACTURA_ACCEPT } from '../lib/uploadFactura'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CAT_ICONS = {
  mercado: '🛒', servicios: '💡', arriendo: '🏠', salud: '🏥',
  transporte: '🚌', entretenimiento: '🎬', restaurante: '🍽️',
  ropa: '👕', mascotas: '🐾', educacion: '📚', otros: '📦',
}

function quincenaDeFecha(fechaStr) {
  const day = parseInt((fechaStr || '').split('-')[2] || '1')
  return day <= 15 ? 'q1' : 'q2'
}

function fechaLegible(fechaStr) {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-')
  return `${parseInt(d)} de ${MESES[parseInt(m) - 1]} de ${y}`
}

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
          width: `${progress}%`, transition: 'width 0.2s ease',
          boxShadow: '0 0 8px rgba(168,85,247,0.5)',
        }} />
      </div>
    </div>
  )
}

export default function Registrar() {
  const { user, perfil, recargarPerfil } = useAuth()
  const [personas, setPersonas] = useState([])
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
  const [form, setForm] = useState({
    descripcion: '', monto: '', categoria: 'mercado',
    pagado_por: '', fecha: todayStr, split_entre: [], notas: '',
  })
  const [quincena, setQuincena] = useState(() => quincenaDeFecha(todayStr))
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)
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

  const [fechaY, fechaM, fechaD] = form.fecha.split('-')

  // Constraints: can't go past current month
  const nowRef = new Date()
  const currentYear  = nowRef.getFullYear()
  const currentMonth = nowRef.getMonth() + 1
  const AÑOS_DISP    = [currentYear, currentYear - 1]
  const maxMesForYear = parseInt(fechaY) >= currentYear ? currentMonth : 12
  const lastDayOfMonth = new Date(parseInt(fechaY), parseInt(fechaM), 0).getDate()

  // Days available within the selected quincena
  const diasDisponibles = quincena === 'q1'
    ? Array.from({ length: 15 }, (_, i) => i + 1)
    : Array.from({ length: lastDayOfMonth - 15 }, (_, i) => i + 16)

  const setFechaParte = (y, m, d) => {
    const newFecha = `${y}-${m}-${d}`
    setForm(f => ({ ...f, fecha: newFecha }))
    setQuincena(quincenaDeFecha(newFecha))
  }

  const handleAnoChange = e => {
    const ny = String(e.target.value)
    // Clamp month if it would be in the future for the new year
    let nm = fechaM
    if (parseInt(ny) >= currentYear && parseInt(nm) > currentMonth) {
      nm = String(currentMonth).padStart(2, '0')
    }
    // Clamp day to valid range for new month/year
    const lastDay = new Date(parseInt(ny), parseInt(nm), 0).getDate()
    const nd = String(Math.min(parseInt(fechaD), lastDay)).padStart(2, '0')
    setFechaParte(ny, nm, nd)
  }

  const handleMesChange = e => {
    const nm = String(e.target.value).padStart(2, '0')
    const lastDay = new Date(parseInt(fechaY), parseInt(e.target.value), 0).getDate()
    const nd = String(Math.min(parseInt(fechaD), lastDay)).padStart(2, '0')
    setFechaParte(fechaY, nm, nd)
  }

  const handleDiaChange = e => {
    const d = String(parseInt(e.target.value)).padStart(2, '0')
    setFechaParte(fechaY, fechaM, d)
  }

  const cambiarQuincena = (q) => {
    const day = parseInt(fechaD || '1')
    setQuincena(q)
    if (q === 'q1' && day > 15) setFechaParte(fechaY, fechaM, '01')
    else if (q === 'q2' && day <= 15) setFechaParte(fechaY, fechaM, '16')
  }

  const toggleSplit = id => setForm(f => ({
    ...f,
    split_entre: f.split_entre.includes(id)
      ? f.split_entre.filter(x => x !== id)
      : [...f.split_entre, id]
  }))

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
    setFacturaFile(null); setFacturaPreview(null); setUploadProgress(null)
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
    if (!perfil && user) {
      const nombre = user.user_metadata?.nombre || user.email.split('@')[0]
      await supabase.from('perfiles').upsert({ id: user.id, nombre, email: user.email }, { onConflict: 'id' })
      await recargarPerfil()
    }
    const { data, error } = await supabase.from('gastos').insert([{
      descripcion: form.descripcion, monto: parseFloat(form.monto),
      categoria: form.categoria, pagado_por: form.pagado_por,
      fecha: form.fecha, split_entre: form.split_entre,
      notas: form.notas || null, creado_por: user?.id || null,
    }]).select().single()
    if (error) { setMsg({ tipo: 'error', texto: 'Error al guardar: ' + error.message }); setGuardando(false); return }
    if (facturaFile) {
      try {
        setUploadProgress(0)
        const { url } = await uploadFactura(data.id, facturaFile, setUploadProgress)
        await supabase.from('gastos').update({ factura_url: url }).eq('id', data.id)
      } catch (upErr) { console.warn('Factura no subida:', upErr.message) }
    }
    setGuardando(false)
    setMsg({ tipo: 'ok', texto: '¡Gasto registrado exitosamente! ✦' })
    setForm(f => ({ ...f, descripcion: '', monto: '', notas: '' }))
    quitarFactura()
    setTimeout(() => setMsg(null), 3500)
  }

  const sel = {
    padding: '10px 14px', fontSize: 14, fontWeight: 600,
    border: '1.5px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)', cursor: 'pointer', width: '100%',
    transition: 'border-color 0.2s',
  }
  const inp = { ...sel, cursor: 'text', fontWeight: 500 }
  const lbl = {
    fontSize: 11, color: 'var(--text3)', marginBottom: 7,
    display: 'block', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase',
  }

  const pagadorActual = personas.find(p => p.id === form.pagado_por)
  const pagadorIdx = personas.findIndex(p => p.id === form.pagado_por)

  return (
    <div>
      <PageTitle title="Registrar gasto" sub="Añade un nuevo gasto del hogar" />
      <Card style={{ maxWidth: 640 }}>

        {msg && (
          <div style={{
            padding: '12px 16px', borderRadius: 12, marginBottom: '1.5rem', fontSize: 14, fontWeight: 600,
            background: msg.tipo === 'ok'
              ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))'
              : 'var(--red-bg)',
            color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 18 }}>{msg.tipo === 'ok' ? '✦' : '⚠'}</span>
            {msg.texto}
          </div>
        )}

        {/* ── Descripción ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={lbl}>Descripción *</label>
          <input
            name="descripcion" value={form.descripcion}
            onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            placeholder="Ej: Mercado del sábado"
            style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* ── Monto + Categoría ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <label style={lbl}>Monto (COP) *</label>
            <input
              name="monto" type="number" value={form.monto}
              onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
              placeholder="0" min="0" step="1000"
              style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={lbl}>Categoría</label>
            <select
              name="categoria" value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              style={{ ...sel, boxSizing: 'border-box' }}
            >
              {CATEGORIAS.map(c => (
                <option key={c} value={c}>
                  {(CAT_ICONS[c] || '📦') + ' ' + c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Fecha ── */}
        <div style={{
          marginBottom: '1.25rem', padding: '1rem 1.1rem', borderRadius: 14,
          background: 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))',
          border: '1.5px solid rgba(168,85,247,0.15)',
        }}>
          <p style={{ ...lbl, marginBottom: 12, color: 'var(--accent)', fontSize: 10.5 }}>Fecha del gasto</p>

          {/* Día / Mes / Año — tres selects en una fila */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.2fr', gap: 10, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Día</label>
              <select
                value={parseInt(fechaD)}
                onChange={handleDiaChange}
                style={{ ...sel, boxSizing: 'border-box', textAlign: 'center', fontWeight: 700, fontSize: 15 }}
              >
                {diasDisponibles.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Mes</label>
              <select
                value={parseInt(fechaM)}
                onChange={handleMesChange}
                style={{ ...sel, boxSizing: 'border-box' }}
              >
                {MESES.slice(0, maxMesForYear).map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Año</label>
              <select
                value={fechaY}
                onChange={handleAnoChange}
                style={{ ...sel, boxSizing: 'border-box' }}
              >
                {AÑOS_DISP.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          {/* Q1 / Q2 */}
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Quincena</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { q: 'q1', label: '1ª Quincena', sub: 'Días 1 al 15', grad: 'linear-gradient(135deg,#FF6B9D,#A855F7)' },
                { q: 'q2', label: '2ª Quincena', sub: `Días 16 al ${lastDayOfMonth}`, grad: 'linear-gradient(135deg,#6366F1,#A855F7)' },
              ].map(({ q, label, sub, grad }) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => cambiarQuincena(q)}
                  style={{
                    padding: '13px 10px', borderRadius: 12,
                    cursor: 'pointer', fontFamily: 'var(--font)',
                    background: quincena === q ? grad : 'var(--surface)',
                    color: quincena === q ? 'white' : 'var(--text2)',
                    boxShadow: quincena === q ? '0 4px 18px rgba(168,85,247,0.3)' : 'none',
                    border: quincena === q ? '2px solid transparent' : '1.5px solid var(--border-strong)',
                    transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 500 }}>{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resumen de fecha */}
          <div style={{
            padding: '10px 14px', borderRadius: 11,
            background: quincena === 'q1'
              ? 'linear-gradient(135deg,rgba(255,107,157,0.1),rgba(168,85,247,0.06))'
              : 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(168,85,247,0.06))',
            border: `1.5px solid ${quincena === 'q1' ? 'rgba(255,107,157,0.3)' : 'rgba(99,102,241,0.3)'}`,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                {fechaLegible(form.fecha)}
              </p>
              <p style={{ fontSize: 11, fontWeight: 600, marginTop: 2,
                color: quincena === 'q1' ? '#FF6B9D' : '#6366F1' }}>
                {quincena === 'q1' ? '1ª Quincena' : '2ª Quincena'} · {MESES[parseInt(fechaM) - 1]} {fechaY}
              </p>
            </div>
          </div>
        </div>

        {/* ── Quién pagó ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={lbl}>¿Quién pagó? *</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {personas.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setForm(f => ({ ...f, pagado_por: p.id }))}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 16px', borderRadius: 40, cursor: 'pointer',
                  border: form.pagado_por === p.id
                    ? '2px solid transparent'
                    : '1.5px solid var(--border-strong)',
                  background: form.pagado_por === p.id
                    ? 'linear-gradient(135deg,#FF6B9D22,#A855F722), var(--surface)'
                    : 'var(--surface)',
                  boxShadow: form.pagado_por === p.id ? '0 0 0 2px #A855F7' : 'none',
                  fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13,
                  color: form.pagado_por === p.id ? 'var(--accent)' : 'var(--text2)',
                  transition: 'all 0.18s',
                }}
              >
                <Avatar nombre={p.nombre} index={i} />
                {p.nombre}
              </button>
            ))}
          </div>
        </div>

        {/* ── Dividido entre ── */}
        <div style={{
          marginBottom: '1.25rem', padding: '1rem 1.1rem', borderRadius: 14,
          background: 'var(--surface2)', border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ ...lbl, marginBottom: 0 }}>Dividido entre</p>
            <button
              type="button"
              onClick={() => {
                const todos = form.split_entre.length === personas.length
                setForm(f => ({ ...f, split_entre: todos ? [] : personas.map(p => p.id) }))
              }}
              style={{
                fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                background: form.split_entre.length === personas.length ? 'var(--accent-bg)' : 'var(--surface)',
                color: form.split_entre.length === personas.length ? 'var(--accent)' : 'var(--text3)',
                border: '1px solid var(--border-strong)',
              }}
            >
              {form.split_entre.length === personas.length ? '✓ Todos' : 'Seleccionar todos'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {personas.map((p, i) => {
              const sel = form.split_entre.includes(p.id)
              const colors = ['#FF6B9D','#A855F7','#6366F1','#14B8A6','#FB923C','#F43F5E']
              const c = colors[i % colors.length]
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleSplit(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 14px', borderRadius: 40, cursor: 'pointer',
                    fontFamily: 'var(--font)', fontWeight: 600, fontSize: 13,
                    border: sel ? `2px solid ${c}` : '1.5px solid var(--border-strong)',
                    background: sel ? `${c}15` : 'var(--surface)',
                    color: sel ? c : 'var(--text2)',
                    transition: 'all 0.18s',
                  }}
                >
                  <Avatar nombre={p.nombre} index={i} />
                  {p.nombre}
                  {sel && <span style={{ fontSize: 10, opacity: 0.7 }}>✓</span>}
                </button>
              )
            })}
          </div>
          {form.split_entre.length > 0 && form.monto && (
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10, fontWeight: 500 }}>
              Cada uno paga:{' '}
              <strong style={{ color: 'var(--accent)' }}>
                ${Math.round(parseFloat(form.monto) / form.split_entre.length).toLocaleString('es-CO')}
              </strong>
            </p>
          )}
        </div>

        {/* ── Notas ── */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={lbl}>Notas (opcional)</label>
          <input
            name="notas" value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Detalles adicionales..."
            style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* ── Factura ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={lbl}>Factura (opcional)</label>
          <input ref={facturaRef} type="file" accept={FACTURA_ACCEPT} onChange={handleFacturaChange} style={{ display: 'none' }} />
          {!facturaFile ? (
            <button
              type="button"
              onClick={() => facturaRef.current?.click()}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 11, cursor: 'pointer',
                border: '1.5px dashed rgba(168,85,247,0.35)',
                background: 'linear-gradient(135deg,rgba(255,107,157,0.03),rgba(168,85,247,0.03))',
                color: 'var(--text2)', fontSize: 13.5, fontWeight: 600,
                fontFamily: 'var(--font)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8, boxSizing: 'border-box',
                transition: 'border-color 0.18s, background 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.6)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.07),rgba(168,85,247,0.07))' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.03),rgba(168,85,247,0.03))' }}
            >
              📎 Adjuntar factura o foto
            </button>
          ) : (
            <div style={{
              padding: '10px 12px', borderRadius: 11,
              background: 'linear-gradient(135deg,rgba(255,107,157,0.06),rgba(168,85,247,0.06))',
              border: '1.5px dashed rgba(168,85,247,0.3)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {facturaPreview
                ? <img src={facturaPreview} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                : <span style={{ fontSize: 28 }}>📄</span>}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{facturaFile.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{(facturaFile.size / 1024).toFixed(0)} KB</p>
              </div>
              <button onClick={quitarFactura} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)', padding: '2px 6px' }}>✕</button>
            </div>
          )}
          <UploadProgress progress={uploadProgress} />
        </div>

        {/* ── Botón guardar ── */}
        <button
          onClick={guardar} disabled={guardando}
          className="btn-gradient"
          style={{
            width: '100%', padding: '14px', fontSize: 15, fontWeight: 700,
            opacity: guardando ? 0.7 : 1,
            cursor: guardando ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 24px rgba(168,85,247,0.35)',
            borderRadius: 14,
          }}
        >
          {guardando
            ? (facturaFile && uploadProgress !== null ? `Subiendo ${uploadProgress}%...` : 'Guardando...')
            : '✦ Registrar gasto'}
        </button>
      </Card>
    </div>
  )
}
