import { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, Badge, Avatar, fmt, CATEGORIAS } from '../components/UI'
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

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)

  const inp = {
    padding: '8px 14px', fontSize: 13, fontWeight: 500,
    border: '1px solid var(--border-strong)', borderRadius: 10,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', cursor: 'pointer',
  }

  return (
    <div>
      <PageTitle title="Historial de gastos" sub="Consulta, filtra y exporta todos los gastos del hogar" />

      {/* Modals */}
      {facturaModal && <FacturaModal url={facturaModal} onClose={() => setFacturaModal(null)} />}
      {editando && (
        <EditModal
          gasto={editando}
          personas={personas}
          onClose={() => setEditando(null)}
          onSave={updated => {
            setGastos(gs => gs.map(g => g.id === updated.id ? updated : g))
            setEditando(null)
          }}
        />
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select value={filtros.mes} onChange={e => setFiltros(f => ({ ...f, mes: e.target.value }))} style={inp}>
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
          <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
            {gastos.length} gastos ·{' '}
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(total)}</span>
          </span>
          <button
            onClick={exportarExcel}
            disabled={gastos.length === 0}
            style={{
              padding: '9px 18px',
              background: gastos.length === 0 ? 'var(--gray-bg)' : 'linear-gradient(135deg, #FF6B9D 0%, #A855F7 100%)',
              color: gastos.length === 0 ? 'var(--gray)' : 'white',
              border: 'none', borderRadius: 11, fontSize: 13, fontWeight: 700,
              cursor: gastos.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: gastos.length > 0 ? '0 4px 16px rgba(168,85,247,0.3)' : 'none',
            }}
            onMouseEnter={e => { if (gastos.length > 0) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <span style={{ fontSize: 15 }}>↓</span> Exportar Excel
          </button>
        </div>
      </div>

      {/* List */}
      <Card>
        {loading && (
          <p style={{ color: 'var(--text3)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✦</span> Cargando...
          </p>
        )}
        {!loading && gastos.length === 0 && (
          <p style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: '2.5rem', fontStyle: 'italic' }}>
            No hay gastos con estos filtros ✦
          </p>
        )}
        {!loading && gastos.map((g, idx) => {
          const persona = personas.find(p => p.id === g.pagado_por)
          const pIdx = personas.findIndex(p => p.id === g.pagado_por)
          const splitNombres = (g.split_entre || []).map(id => personas.find(p => p.id === id)?.nombre).filter(Boolean).join(', ')
          return (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 13, padding: '12px 0',
              borderBottom: idx < gastos.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <Avatar nombre={persona?.nombre} index={pIdx >= 0 ? pIdx : 0} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{g.descripcion}</span>
                  <Badge label={g.categoria} cat={g.categoria} />
                  {g.factura_url && (
                    <button
                      onClick={() => setFacturaModal(g.factura_url)}
                      title="Ver factura"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 16, padding: '0 2px', lineHeight: 1,
                        opacity: 0.85, transition: 'opacity 0.15s, transform 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1)' }}
                    >
                      🧾
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, fontWeight: 500 }}>
                  {g.fecha} · Pagó: {persona?.nombre || '—'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>Dividido: {splitNombres || '—'}</p>
                {g.notas && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginTop: 2 }}>"{g.notas}"</p>
                )}
              </div>

              {/* Right: amount + actions */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontWeight: 700, fontSize: 15,
                  background: 'var(--grad-primary)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {fmt(g.monto)}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setEditando(g)}
                    style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontWeight: 700, fontFamily: 'var(--font)' }}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => eliminar(g)}
                    style={{ fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', fontWeight: 600, fontFamily: 'var(--font)' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
