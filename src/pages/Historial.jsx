import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, Badge, Avatar, fmt, CATEGORIAS, CalendarWidget } from '../components/UI'
import { uploadFactura, deleteFactura, validateFactura, isImage, FACTURA_ACCEPT } from '../lib/uploadFactura'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

/* ── Modal: ver factura ──────────────────────────────────────── */
function FacturaModal({ url, onClose }) {
  const esImagen = isImage(url)
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(20,8,45,0.82)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', animation: 'fadeUp 0.18s ease both',
      }}
    >
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '92vw' }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -14, right: -14, zIndex: 1,
            width: 34, height: 34, borderRadius: '50%',
            background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
            border: 'none', cursor: 'pointer',
            color: 'white', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(168,85,247,0.5)',
          }}
        >
          ✕
        </button>

        {esImagen ? (
          <img
            src={url}
            alt="Factura"
            style={{
              maxWidth: '88vw', maxHeight: '82vh',
              borderRadius: 16, display: 'block',
              boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          />
        ) : (
          <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
            <iframe
              src={url}
              title="Factura PDF"
              style={{ width: '80vw', height: '78vh', border: 'none', display: 'block' }}
            />
          </div>
        )}

        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          Clic fuera o Esc para cerrar ·{' '}
          <a href={url} target="_blank" rel="noreferrer" style={{ color: 'rgba(255,107,157,0.9)', fontWeight: 700 }}>
            Abrir en nueva pestaña ↗
          </a>
        </p>
      </div>
    </div>
  )
}

/* ── Modal: editar gasto ─────────────────────────────────────── */
function EditModal({ gasto, personas, onClose, onSave }) {
  const [form, setForm] = useState({
    descripcion: gasto.descripcion,
    monto: gasto.monto.toString(),
    fecha: gasto.fecha,
    categoria: gasto.categoria,
    pagado_por: gasto.pagado_por,
    notas: gasto.notas || '',
    split_entre: gasto.split_entre || [],
  })
  const [facturaFile, setFacturaFile] = useState(null)
  const [facturaPreview, setFacturaPreview] = useState(null)
  const [eliminarFoto, setEliminarFoto] = useState(false)
  const [progress, setProgress] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg] = useState(null)
  const [verFactura, setVerFactura] = useState(false)
  const facturaRef = useRef(null)

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
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
    if (err) { setMsg(err); return }
    setFacturaFile(file)
    setFacturaPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    setEliminarFoto(false)
    setMsg(null)
  }

  const handleSave = async () => {
    if (!form.descripcion || !form.monto || !form.pagado_por) {
      setMsg('Completa descripción, monto y quién pagó.'); return
    }
    if (form.split_entre.length === 0) { setMsg('Selecciona al menos una persona.'); return }
    setGuardando(true); setMsg(null)

    let facturaUrl = gasto.factura_url || null

    if (eliminarFoto && gasto.factura_url) {
      await deleteFactura(gasto.factura_url)
      facturaUrl = null
    }

    if (facturaFile && !eliminarFoto) {
      try {
        setProgress(0)
        // delete old file if extension changes
        if (gasto.factura_url) await deleteFactura(gasto.factura_url)
        const { url } = await uploadFactura(gasto.id, facturaFile, setProgress)
        facturaUrl = url
      } catch (err) {
        setMsg('Error al subir la factura: ' + err.message)
        setGuardando(false); return
      }
    }

    const { data, error } = await supabase.from('gastos').update({
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      categoria: form.categoria,
      pagado_por: form.pagado_por,
      notas: form.notas || null,
      split_entre: form.split_entre,
      factura_url: facturaUrl,
    }).eq('id', gasto.id).select().single()

    setGuardando(false)
    if (error) { setMsg(error.message); return }
    onSave(data)
  }

  const inp = {
    width: '100%', padding: '9px 12px', fontSize: 13.5, fontWeight: 500,
    border: '1px solid var(--border-strong)', borderRadius: 10,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)',
    transition: 'border-color 0.18s',
  }
  const lbl = { fontSize: 11, color: 'var(--text2)', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase', display: 'block', marginBottom: 5 }

  const facturaActual = !eliminarFoto && !facturaFile ? gasto.factura_url : null

  return (
    <>
      {verFactura && gasto.factura_url && (
        <FacturaModal url={gasto.factura_url} onClose={() => setVerFactura(false)} />
      )}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 8000,
          background: 'rgba(20,8,45,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem', animation: 'fadeUp 0.18s ease both',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: 'white', borderRadius: 22,
            width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto',
            padding: '1.75rem', boxShadow: '0 30px 80px rgba(30,8,69,0.28)',
            border: '1px solid rgba(210,100,160,0.15)',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: 'var(--text)' }}>Editar gasto</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)', padding: '2px 6px' }}>✕</button>
          </div>

          {msg && (
            <div style={{ padding: '9px 14px', borderRadius: 9, marginBottom: '1rem', fontSize: 13, fontWeight: 600, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(244,63,94,0.2)' }}>
              {msg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Descripción</label>
              <input name="descripcion" value={form.descripcion} onChange={set} style={inp} />
            </div>
            <div>
              <label style={lbl}>Monto (COP)</label>
              <input name="monto" type="number" value={form.monto} onChange={set} style={inp} />
            </div>
            <div>
              <label style={lbl}>Fecha</label>
              <input name="fecha" type="date" value={form.fecha} onChange={set} style={inp} />
            </div>
            <div>
              <label style={lbl}>Categoría</label>
              <select name="categoria" value={form.categoria} onChange={set} style={inp}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>¿Quién pagó?</label>
              <select name="pagado_por" value={form.pagado_por} onChange={set} style={inp}>
                {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={lbl}>Notas</label>
              <input name="notas" value={form.notas} onChange={set} placeholder="Opcional" style={inp} />
            </div>
          </div>

          {/* Split */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={lbl}>Dividido entre</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {personas.map((p, i) => (
                <label key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                  padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                  border: `1.5px solid ${form.split_entre.includes(p.id) ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: form.split_entre.includes(p.id) ? 'var(--accent-bg)' : 'var(--surface)',
                  color: form.split_entre.includes(p.id) ? 'var(--accent-text)' : 'var(--text2)',
                  transition: 'all 0.15s',
                }}>
                  <input type="checkbox" checked={form.split_entre.includes(p.id)} onChange={() => toggleSplit(p.id)} style={{ display: 'none' }} />
                  <Avatar nombre={p.nombre} index={i} />
                  {p.nombre}
                </label>
              ))}
            </div>
          </div>

          {/* Factura section */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1.5rem' }}>
            <label style={{ ...lbl, marginBottom: 10 }}>Factura</label>

            {facturaActual && (
              <div style={{
                padding: '10px 12px', borderRadius: 11, marginBottom: 10,
                background: 'linear-gradient(135deg,rgba(255,107,157,0.06),rgba(168,85,247,0.06))',
                border: '1.5px solid rgba(168,85,247,0.2)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 22 }}>{isImage(facturaActual) ? '🖼️' : '📄'}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
                  Factura adjunta
                </span>
                <button
                  onClick={() => setVerFactura(true)}
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px' }}
                >
                  Ver 🔍
                </button>
                <button
                  onClick={() => facturaRef.current?.click()}
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px' }}
                >
                  Cambiar
                </button>
                <button
                  onClick={() => setEliminarFoto(true)}
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 8px' }}
                >
                  Eliminar
                </button>
              </div>
            )}

            {eliminarFoto && (
              <div style={{ padding: '10px 12px', borderRadius: 10, marginBottom: 10, background: 'var(--red-bg)', color: 'var(--red)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span>Se eliminará la factura al guardar.</span>
                <button onClick={() => setEliminarFoto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 12, fontWeight: 700 }}>Deshacer</button>
              </div>
            )}

            {facturaFile && (
              <div style={{
                padding: '10px 12px', borderRadius: 11, marginBottom: 10,
                background: 'linear-gradient(135deg,rgba(255,107,157,0.06),rgba(168,85,247,0.06))',
                border: '1.5px dashed rgba(168,85,247,0.3)',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {facturaPreview
                  ? <img src={facturaPreview} alt="" style={{ width: 40, height: 40, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                  : <span style={{ fontSize: 22 }}>📄</span>
                }
                <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{facturaFile.name}</span>
                <button onClick={() => { setFacturaFile(null); setFacturaPreview(null); if (facturaRef.current) facturaRef.current.value = '' }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 15, padding: '2px 6px' }}>✕</button>
              </div>
            )}

            {progress !== null && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>
                  <span>Subiendo...</span><span style={{ color: 'var(--accent)' }}>{progress}%</span>
                </div>
                <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'linear-gradient(90deg,#FF6B9D,#A855F7)', width: `${progress}%`, transition: 'width 0.2s', borderRadius: 99 }} />
                </div>
              </div>
            )}

            <input ref={facturaRef} type="file" accept={FACTURA_ACCEPT} onChange={handleFacturaChange} style={{ display: 'none' }} />

            {!facturaActual && !facturaFile && !eliminarFoto && (
              <button
                type="button"
                onClick={() => facturaRef.current?.click()}
                style={{
                  width: '100%', padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
                  border: '1.5px dashed rgba(168,85,247,0.35)',
                  background: 'rgba(168,85,247,0.04)',
                  color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                  fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  transition: 'border-color 0.18s',
                }}
              >
                📎 Adjuntar factura
              </button>
            )}
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '11px', fontSize: 14, fontWeight: 700, borderRadius: 11,
                border: '1.5px solid var(--border-strong)', background: 'var(--surface2)',
                color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave} disabled={guardando}
              className="btn-gradient"
              style={{ flex: 2, padding: '11px', fontSize: 14, opacity: guardando ? 0.7 : 1, boxShadow: '0 6px 20px rgba(168,85,247,0.3)' }}
            >
              {guardando ? (progress !== null ? `Subiendo ${progress}%...` : 'Guardando...') : '✦ Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Historial principal ─────────────────────────────────────── */
export default function Historial() {
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [filtros, setFiltros] = useState({ mes: format(new Date(), 'yyyy-MM'), cat: '', quien: '' })
  const [loading, setLoading] = useState(true)
  const [facturaModal, setFacturaModal] = useState(null)
  const [editando, setEditando] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)

  const mesesDisponibles = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  useEffect(() => {
    supabase.from('personas').select('*').then(({ data }) => setPersonas(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('gastos').select('*').order('fecha', { ascending: false })
    if (filtros.mes)   q = q.eq('mes', filtros.mes)
    if (filtros.cat)   q = q.eq('categoria', filtros.cat)
    if (filtros.quien) q = q.eq('pagado_por', filtros.quien)
    q.then(({ data }) => { setGastos(data || []); setLoading(false) })
  }, [filtros])

  const eliminar = async (g) => {
    if (!confirm('¿Eliminar este gasto?')) return
    if (g.factura_url) await deleteFactura(g.factura_url)
    await supabase.from('gastos').delete().eq('id', g.id)
    setGastos(gs => gs.filter(x => x.id !== g.id))
  }

  const exportarExcel = () => {
    const datos = gastos.map(g => {
      const persona = personas.find(p => p.id === g.pagado_por)
      const split = (g.split_entre || []).map(id => personas.find(p => p.id === id)?.nombre).filter(Boolean).join(', ')
      return {
        'Fecha': g.fecha,
        'Descripción': g.descripcion,
        'Monto (COP)': Number(g.monto),
        'Categoría': g.categoria,
        'Pagado por': persona?.nombre || '—',
        'Dividido entre': split || '—',
        'Notas': g.notas || '',
        'Factura': g.factura_url ? 'Sí' : 'No',
      }
    })
    const ws = XLSX.utils.json_to_sheet(datos)
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 24 }, { wch: 8 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, `gastos-${filtros.mes || 'todos'}.xlsx`)
  }

  const inp = {
    padding: '8px 14px', fontSize: 13, fontWeight: 500,
    border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 11,
    background: 'rgba(255,255,255,0.12)', color: 'white',
    outline: 'none', cursor: 'pointer', backdropFilter: 'blur(12px)',
    fontFamily: 'var(--font)',
  }

  const gastosFiltrados = selectedDay
    ? gastos.filter(g => parseInt(g.fecha.split('-')[2]) === selectedDay)
    : gastos

  const byDate = gastosFiltrados.reduce((acc, g) => {
    if (!acc[g.fecha]) acc[g.fecha] = []
    acc[g.fecha].push(g)
    return acc
  }, {})
  const fechasOrdenadas = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  const GastoRow = ({ g, isLast }) => {
    const persona = personas.find(p => p.id === g.pagado_por)
    const pIdx = personas.findIndex(p => p.id === g.pagado_por)
    const splitNombres = (g.split_entre || []).map(id => personas.find(p => p.id === id)?.nombre).filter(Boolean).join(', ')
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 13, padding: '11px 0',
        borderBottom: !isLast ? '1px solid rgba(168,85,247,0.07)' : 'none',
      }}>
        <Avatar nombre={persona?.nombre} index={pIdx >= 0 ? pIdx : 0} size={34} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{g.descripcion}</span>
            <Badge label={g.categoria} cat={g.categoria} />
            {g.factura_url && (
              <button onClick={() => setFacturaModal(g.factura_url)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '0 2px', lineHeight: 1, opacity: 0.85, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1)' }}>🧾</button>
            )}
          </div>
          <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>
            Pagó: {persona?.nombre || '—'}{splitNombres ? ` · Dividido: ${splitNombres}` : ''}
          </p>
          {g.notas && <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginTop: 1 }}>"{g.notas}"</p>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 14, background: 'linear-gradient(135deg,#FF6B9D,#A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {fmt(Number(g.monto))}
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setEditando(g)} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontWeight: 700, fontFamily: 'var(--font)' }}>Editar</button>
            <button onClick={() => eliminar(g)} style={{ fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontWeight: 600, fontFamily: 'var(--font)' }}>✕</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageTitle title="Historial de gastos" sub="Consulta, filtra y exporta todos los gastos del hogar" />

      {facturaModal && <FacturaModal url={facturaModal} onClose={() => setFacturaModal(null)} />}
      {editando && (
        <EditModal gasto={editando} personas={personas} onClose={() => setEditando(null)}
          onSave={updated => { setGastos(gs => gs.map(g => g.id === updated.id ? updated : g)); setEditando(null) }} />
      )}

      {/* ── Glass filter bar ── */}
      <div style={{
        display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center',
        padding: '14px 18px', borderRadius: 18,
        background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
      }}>
        <select value={filtros.mes} onChange={e => { setFiltros(f => ({ ...f, mes: e.target.value })); setSelectedDay(null) }} style={inp}>
          <option value="">Todos los meses</option>
          {mesesDisponibles.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={filtros.cat} onChange={e => setFiltros(f => ({ ...f, cat: e.target.value }))} style={inp}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filtros.quien} onChange={e => setFiltros(f => ({ ...f, quien: e.target.value }))} style={inp}>
          <option value="">Todas las personas</option>
          {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
            {gastosFiltrados.length} gastos ·{' '}
            <span style={{ fontWeight: 800, color: 'white' }}>{fmt(gastosFiltrados.reduce((s, g) => s + Number(g.monto), 0))}</span>
          </span>
          <button onClick={exportarExcel} disabled={gastos.length === 0} style={{
            padding: '9px 18px',
            background: gastos.length === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg,#FF6B9D,#A855F7)',
            color: gastos.length === 0 ? 'rgba(255,255,255,0.28)' : 'white',
            border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700,
            cursor: gastos.length === 0 ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
            boxShadow: gastos.length > 0 ? '0 4px 16px rgba(168,85,247,0.35)' : 'none',
            fontFamily: 'var(--font)', transition: 'all 0.18s',
          }}
            onMouseEnter={e => { if (gastos.length > 0) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >↓ Exportar Excel</button>
        </div>
      </div>

      {/* ── 2-col: calendario + timeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Calendario sticky */}
        <div style={{ position: 'sticky', top: 20 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.1rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#A855F7)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                {filtros.mes
                  ? format(new Date(filtros.mes + '-15'), 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())
                  : 'Calendario'}
              </p>
            </div>
            {filtros.mes ? (
              <CalendarWidget mes={filtros.mes} gastos={gastos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
            ) : (
              <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '1.5rem 0', fontStyle: 'italic' }}>
                Selecciona un mes para ver el calendario
              </p>
            )}
            {selectedDay && (
              <button onClick={() => setSelectedDay(null)} style={{
                marginTop: 14, width: '100%', padding: '7px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid rgba(168,85,247,0.28)', background: 'rgba(168,85,247,0.07)',
                color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,0.14)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,0.07)'}
              >
                Día {selectedDay} · ✕ limpiar filtro
              </button>
            )}
          </Card>
        </div>

        {/* Timeline agrupado por fecha */}
        <Card>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2.5rem', color: 'var(--text3)', justifyContent: 'center' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(168,85,247,0.2)', borderTopColor: '#A855F7', animation: 'spin 0.8s linear infinite' }} />
              Cargando...
            </div>
          )}
          {!loading && gastosFiltrados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3.5rem 1rem' }}>
              <div style={{ fontSize: 40, marginBottom: 14, filter: 'drop-shadow(0 2px 10px rgba(168,85,247,0.4))' }}>✦</div>
              <p style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>
                {selectedDay ? `Sin gastos el día ${selectedDay}` : 'No hay gastos con estos filtros'}
              </p>
            </div>
          )}
          {!loading && fechasOrdenadas.map((fecha, fIdx) => {
            const items = byDate[fecha]
            const dayNum = parseInt(fecha.split('-')[2])
            const isQ1 = dayNum <= 15
            const qColor = isQ1 ? '#FF6B9D' : '#6366F1'
            const qLabel = isQ1 ? 'Q1' : 'Q2'
            const dayTotal = items.reduce((s, g) => s + Number(g.monto), 0)
            const fechaDate = new Date(fecha + 'T12:00:00')
            return (
              <div key={fecha} style={{ marginBottom: fIdx < fechasOrdenadas.length - 1 ? '1.5rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, paddingBottom: 8, borderBottom: `1.5px solid ${qColor}1A` }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg,${qColor}22,${qColor}10)`,
                    border: `1.5px solid ${qColor}30`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: qColor, lineHeight: 1 }}>{dayNum}</span>
                    <span style={{ fontSize: 7.5, fontWeight: 700, color: qColor, opacity: 0.7, letterSpacing: '0.3px' }}>{qLabel}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                      {format(fechaDate, "EEEE d 'de' MMMM", { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1, fontWeight: 500 }}>
                      {items.length} gasto{items.length > 1 ? 's' : ''} · {fmt(dayTotal)}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 13.5, fontWeight: 800, flexShrink: 0,
                    background: isQ1 ? 'linear-gradient(135deg,#FF6B9D,#C026D3)' : 'linear-gradient(135deg,#6366F1,#8B5CF6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  }}>{fmt(dayTotal)}</span>
                </div>
                {items.map((g, i) => <GastoRow key={g.id} g={g} isLast={i === items.length - 1} />)}
              </div>
            )
          })}
        </Card>
      </div>
    </div>
  )
}
