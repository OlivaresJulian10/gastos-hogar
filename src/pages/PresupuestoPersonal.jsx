import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, PageTitle, Badge, fmt, CATEGORIAS } from '../components/UI'
import { uploadFactura, deleteFactura, validateFactura, isImage, FACTURA_ACCEPT } from '../lib/uploadFactura'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

const GRAD = 'linear-gradient(135deg,#FF6B9D,#A855F7)'

function ProgressBar({ pct }) {
  const over = pct >= 100
  const warn = pct >= 80
  const gradColors = over ? '#F43F5E,#FF6B9D' : warn ? '#F59E0B,#FB923C' : '#14B8A6,#6366F1'
  const labelColor = over ? 'var(--red)' : warn ? 'var(--amber)' : 'var(--teal)'
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text2)' }}>
        <span>Progreso del mes</span>
        <span style={{ color: labelColor }}>{Math.round(pct)}%</span>
      </div>
      <div style={{ height: 11, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{
          height: '100%', borderRadius: 99,
          background: `linear-gradient(90deg,${gradColors})`,
          width: `${Math.min(100, pct)}%`,
          transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: `0 0 10px ${labelColor}66`,
        }} />
      </div>
    </div>
  )
}

function FacturaModal({ url, onClose }) {
  const esImg = isImage(url)
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
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
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: -14, right: -14, zIndex: 1,
            width: 34, height: 34, borderRadius: '50%',
            background: GRAD, border: 'none', cursor: 'pointer',
            color: 'white', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(168,85,247,0.5)',
          }}
        >✕</button>
        {esImg
          ? <img src={url} alt="Factura" style={{ maxWidth: '88vw', maxHeight: '82vh', borderRadius: 16, display: 'block', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)' }} />
          : <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
              <iframe src={url} title="Factura PDF" style={{ width: '80vw', height: '78vh', border: 'none', display: 'block' }} />
            </div>
        }
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

export default function PresupuestoPersonal() {
  const { user, perfil } = useAuth()
  const mesActual = format(new Date(), 'yyyy-MM')
  const [mes, setMes] = useState(mesActual)

  // Budget
  const [presupuesto, setPresupuesto] = useState(null)
  const [presupuestoInput, setPresupuestoInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [msgBudget, setMsgBudget] = useState(null)

  // Personal expenses
  const [gastos, setGastos] = useState([])
  const [form, setForm] = useState({
    descripcion: '', monto: '', categoria: 'otros',
    fecha: mesActual + '-01', notas: '',
  })
  const [facturaFile, setFacturaFile] = useState(null)
  const [facturaPreview, setFacturaPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [msgGasto, setMsgGasto] = useState(null)
  const [facturaModal, setFacturaModal] = useState(null)
  const facturaRef = useRef(null)

  const mesesOpts = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  useEffect(() => {
    cargarPresupuesto()
    cargarGastos()
    setForm(f => ({ ...f, fecha: mes + '-01' }))
  }, [mes])

  async function cargarPresupuesto() {
    const { data } = await supabase
      .from('presupuestos_personales')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('mes', mes)
      .eq('descripcion', '__budget__')
      .maybeSingle()
    setPresupuesto(data || null)
    setPresupuestoInput(data ? String(data.monto) : '')
  }

  async function cargarGastos() {
    const { data } = await supabase
      .from('gastos_personales')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('mes', mes)
      .order('fecha', { ascending: false })
    setGastos(data || [])
  }

  const guardarPresupuesto = async () => {
    const val = parseFloat(presupuestoInput)
    if (!val || val <= 0) {
      setMsgBudget({ tipo: 'error', texto: 'Ingresa un monto válido mayor a cero.' }); return
    }
    setSavingBudget(true); setMsgBudget(null)
    if (presupuesto?.id) {
      await supabase.from('presupuestos_personales').update({ monto: val }).eq('id', presupuesto.id)
    } else {
      const { data } = await supabase.from('presupuestos_personales').insert([{
        usuario_id: user.id, mes, descripcion: '__budget__', monto: val,
      }]).select().single()
      if (data) setPresupuesto(data)
    }
    setSavingBudget(false)
    setMsgBudget({ tipo: 'ok', texto: 'Presupuesto guardado ✦' })
    setTimeout(() => setMsgBudget(null), 2200)
    cargarPresupuesto()
  }

  const quitarFactura = () => {
    setFacturaFile(null); setFacturaPreview(null); setUploadProgress(null)
    if (facturaRef.current) facturaRef.current.value = ''
  }

  const handleFacturaChange = e => {
    const file = e.target.files[0]
    if (!file) return
    const err = validateFactura(file)
    if (err) { setMsgGasto({ tipo: 'error', texto: err }); return }
    setFacturaFile(file)
    setFacturaPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
    setMsgGasto(null)
  }

  const guardarGasto = async () => {
    if (!form.descripcion || !form.monto) {
      setMsgGasto({ tipo: 'error', texto: 'Completa descripción y monto.' }); return
    }
    setGuardando(true); setMsgGasto(null)

    const { data, error } = await supabase.from('gastos_personales').insert([{
      usuario_id: user.id,
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      categoria: form.categoria,
      fecha: form.fecha,
      notas: form.notas || null,
    }]).select().single()

    if (error) {
      setMsgGasto({ tipo: 'error', texto: 'Error: ' + error.message })
      setGuardando(false); return
    }

    if (facturaFile) {
      try {
        setUploadProgress(0)
        const { url } = await uploadFactura(data.id, facturaFile, setUploadProgress)
        await supabase.from('gastos_personales').update({ factura_url: url }).eq('id', data.id)
        data.factura_url = url
      } catch (err) {
        console.warn('Factura no subida:', err.message)
      }
    }

    setGuardando(false)
    setMsgGasto({ tipo: 'ok', texto: '¡Gasto registrado! ✦' })
    setForm(f => ({ ...f, descripcion: '', monto: '', notas: '' }))
    quitarFactura()
    setTimeout(() => setMsgGasto(null), 2500)
    cargarGastos()
  }

  const eliminarGasto = async (g) => {
    if (!confirm('¿Eliminar este gasto?')) return
    if (g.factura_url) await deleteFactura(g.factura_url)
    await supabase.from('gastos_personales').delete().eq('id', g.id)
    setGastos(gs => gs.filter(x => x.id !== g.id))
  }

  const totalGastado = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const pct = presupuesto?.monto ? (totalGastado / presupuesto.monto) * 100 : 0
  const disponible = presupuesto?.monto ? presupuesto.monto - totalGastado : null
  const mesLabel = mesesOpts.find(m => m.value === mes)?.label || mes

  const inp = {
    width: '100%', padding: '10px 14px', fontSize: 14, fontWeight: 500,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
  const lbl = {
    fontSize: 12, color: 'var(--text2)', fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  return (
    <div>
      <PageTitle
        title="Mi presupuesto personal"
        sub={`Solo tú puedes ver estos datos · ${perfil?.nombre || ''}`}
      />

      {/* Month selector */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <label style={{ ...lbl, margin: 0 }}>Mes:</label>
        <select
          value={mes}
          onChange={e => setMes(e.target.value)}
          style={{ ...inp, width: 'auto', cursor: 'pointer' }}
        >
          {mesesOpts.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* ── SECCIÓN 1: Presupuesto del mes ── */}
      <Card style={{ marginBottom: '1.75rem' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
          Presupuesto del mes
        </p>

        {msgBudget && (
          <div style={{
            padding: '9px 14px', borderRadius: 10, marginBottom: '1rem', fontSize: 13, fontWeight: 600,
            background: msgBudget.tipo === 'ok'
              ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))'
              : 'var(--red-bg)',
            color: msgBudget.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
            border: `1px solid ${msgBudget.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
          }}>
            {msgBudget.texto}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={lbl}>Presupuesto para {mesLabel} (COP)</label>
            <input
              type="number"
              value={presupuestoInput}
              onChange={e => setPresupuestoInput(e.target.value)}
              placeholder="0"
              min="0" step="10000"
              style={inp}
              onKeyDown={e => e.key === 'Enter' && guardarPresupuesto()}
            />
          </div>
          <button
            onClick={guardarPresupuesto}
            disabled={savingBudget}
            className="btn-gradient"
            style={{ padding: '10px 22px', fontSize: 13.5, flexShrink: 0, opacity: savingBudget ? 0.7 : 1, boxShadow: '0 6px 20px rgba(168,85,247,0.28)' }}
          >
            {savingBudget ? 'Guardando...' : presupuesto ? 'Actualizar' : 'Guardar'}
          </button>
        </div>

        {presupuesto ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
              {[
                { label: 'Presupuesto', value: fmt(presupuesto.monto), color: 'var(--blue)' },
                {
                  label: 'Gastado',
                  value: fmt(totalGastado),
                  color: pct >= 100 ? 'var(--red)' : pct >= 80 ? 'var(--amber)' : 'var(--teal)',
                },
                {
                  label: 'Disponible',
                  value: disponible !== null ? fmt(Math.max(0, disponible)) : '—',
                  color: disponible < 0 ? 'var(--red)' : 'var(--accent)',
                },
              ].map(s => (
                <div key={s.label} style={{
                  textAlign: 'center', padding: '14px 10px', borderRadius: 14,
                  background: 'linear-gradient(135deg,rgba(255,107,157,0.05),rgba(168,85,247,0.05))',
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 7 }}>
                    {s.label}
                  </p>
                  <p style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            <ProgressBar pct={pct} />

            {pct >= 100 && (
              <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 700, marginTop: 10, textAlign: 'center' }}>
                ⚠ Has superado tu presupuesto de {mesLabel}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text3)', fontStyle: 'italic', textAlign: 'center', padding: '0.75rem 0' }}>
            Ingresa un presupuesto para ver el seguimiento ✦
          </p>
        )}
      </Card>

      {/* ── SECCIÓN 2: Formulario + Historial ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* Formulario */}
        <Card>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Registrar gasto personal
          </p>

          {msgGasto && (
            <div style={{
              padding: '9px 14px', borderRadius: 10, marginBottom: '1rem', fontSize: 13, fontWeight: 600,
              background: msgGasto.tipo === 'ok'
                ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))'
                : 'var(--red-bg)',
              color: msgGasto.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
              border: `1px solid ${msgGasto.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
            }}>
              {msgGasto.texto}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label style={lbl}>Descripción *</label>
              <input
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Café, ropa, salidas..."
                style={inp}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={lbl}>Monto (COP) *</label>
                <input
                  type="number" value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  placeholder="0" min="0" step="1000"
                  style={inp}
                />
              </div>
              <div>
                <label style={lbl}>Fecha</label>
                <input
                  type="date" value={form.fecha}
                  onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                  style={inp}
                />
              </div>
            </div>

            <div>
              <label style={lbl}>Categoría</label>
              <select
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                style={{ ...inp, cursor: 'pointer' }}
              >
                {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label style={lbl}>Notas</label>
              <input
                value={form.notas}
                onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                placeholder="Opcional..."
                style={inp}
              />
            </div>

            {/* Factura */}
            <div>
              <label style={lbl}>Factura (opcional)</label>
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
                    width: '100%', padding: '9px 14px', borderRadius: 11, cursor: 'pointer',
                    border: '1.5px dashed rgba(168,85,247,0.35)',
                    background: 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))',
                    color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'border-color 0.18s, background 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.65)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.08),rgba(168,85,247,0.08))' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)'; e.currentTarget.style.background = 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))' }}
                >
                  📎 Adjuntar factura
                </button>
              ) : (
                <div style={{
                  padding: '9px 12px', borderRadius: 11,
                  background: 'linear-gradient(135deg,rgba(255,107,157,0.06),rgba(168,85,247,0.06))',
                  border: '1.5px dashed rgba(168,85,247,0.3)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  {facturaPreview
                    ? <img src={facturaPreview} alt="" style={{ width: 38, height: 38, borderRadius: 7, objectFit: 'cover', flexShrink: 0 }} />
                    : <span style={{ fontSize: 20 }}>📄</span>
                  }
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--text2)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {facturaFile.name}
                  </span>
                  <button
                    onClick={quitarFactura}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 15, padding: '2px 4px' }}
                  >✕</button>
                </div>
              )}
              {uploadProgress !== null && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>
                    <span>Subiendo...</span>
                    <span style={{ color: 'var(--accent)' }}>{uploadProgress}%</span>
                  </div>
                  <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: GRAD, width: `${uploadProgress}%`, transition: 'width 0.2s', borderRadius: 99 }} />
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={guardarGasto}
              disabled={guardando}
              className="btn-gradient"
              style={{ padding: '11px', fontSize: 14, opacity: guardando ? 0.7 : 1, boxShadow: '0 6px 20px rgba(168,85,247,0.28)' }}
            >
              {guardando
                ? (uploadProgress !== null ? `Subiendo ${uploadProgress}%...` : 'Guardando...')
                : '✦ Registrar gasto'}
            </button>
          </div>
        </Card>

        {/* Historial */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Mis gastos · {mesLabel}
            </p>
            {totalGastado > 0 && (
              <span style={{ fontWeight: 700, fontSize: 15, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                {fmt(totalGastado)}
              </span>
            )}
          </div>

          {gastos.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)', textAlign: 'center', padding: '2.5rem', fontStyle: 'italic' }}>
              No tienes gastos en {mesLabel} ✦
            </p>
          ) : gastos.map((g, i) => (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0',
              borderBottom: i < gastos.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700 }}>{g.descripcion}</span>
                  <Badge label={g.categoria} cat={g.categoria} />
                  {g.factura_url && (
                    <button
                      onClick={() => setFacturaModal(g.factura_url)}
                      title="Ver factura"
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 15, padding: '0 2px', lineHeight: 1, opacity: 0.85,
                        transition: 'opacity 0.15s, transform 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)' }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1)' }}
                    >🧾</button>
                  )}
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--text2)', marginTop: 3, fontWeight: 500 }}>{g.fecha}</p>
                {g.notas && (
                  <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginTop: 1 }}>"{g.notas}"</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {fmt(Number(g.monto))}
                </span>
                <button
                  onClick={() => eliminarGasto(g)}
                  style={{ fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font)', padding: '2px 4px' }}
                >✕</button>
              </div>
            </div>
          ))}
        </Card>

      </div>

      {facturaModal && <FacturaModal url={facturaModal} onClose={() => setFacturaModal(null)} />}
    </div>
  )
}
