import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, MetricCard, PageTitle, Badge, fmt, CATEGORIAS, CalendarWidget, useLiveDate } from '../components/UI'
import { uploadFactura, deleteFactura, validateFactura, isImage, FACTURA_ACCEPT } from '../lib/uploadFactura'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const GRAD = 'linear-gradient(135deg,#FF6B9D,#A855F7)'

function quincenaDeDay(day) {
  return day <= 15 ? 'q1' : 'q2'
}

function QProgressBar({ label, gastado, presupuesto, colorFrom, colorTo }) {
  const pct = presupuesto > 0 ? Math.min((gastado / presupuesto) * 100, 100) : 0
  const over = presupuesto > 0 && gastado > presupuesto
  const barGrad = over
    ? 'linear-gradient(90deg,#F43F5E,#EC4899)'
    : `linear-gradient(90deg,${colorFrom},${colorTo})`
  const glowColor = over ? '#F43F5E' : colorFrom
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: over ? 'var(--red)' : colorFrom }}>
            {fmt(gastado)}
          </span>
          {presupuesto > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>/ {fmt(presupuesto)}</span>
          )}
        </div>
      </div>
      <div style={{ height: 11, background: 'rgba(168,85,247,0.09)', borderRadius: 99, overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.07)' }}>
        <div style={{
          height: '100%', borderRadius: 99, width: `${Math.min(100, pct || 0)}%`,
          background: barGrad,
          transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: `0 0 14px ${glowColor}55`,
        }} />
      </div>
      {presupuesto > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>{Math.round(pct)}% usado</span>
          <span style={{ fontSize: 10, color: over ? 'var(--red)' : 'var(--text3)', fontWeight: 600 }}>
            {over ? `+${fmt(gastado - presupuesto)} excedido` : `${fmt(presupuesto - gastado)} libre`}
          </span>
        </div>
      )}
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
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      background: 'rgba(10,4,30,0.88)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem', animation: 'fadeUp 0.18s ease both',
    }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '92vw' }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: -14, right: -14, zIndex: 1,
          width: 34, height: 34, borderRadius: '50%',
          background: GRAD, border: 'none', cursor: 'pointer',
          color: 'white', fontSize: 14, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(168,85,247,0.5)',
        }}>✕</button>
        {esImg
          ? <img src={url} alt="Factura" style={{ maxWidth: '88vw', maxHeight: '82vh', borderRadius: 16, display: 'block', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.12)' }} />
          : <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
              <iframe src={url} title="Factura PDF" style={{ width: '80vw', height: '78vh', border: 'none', display: 'block' }} />
            </div>
        }
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Esc para cerrar ·{' '}
          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#FF6B9D', fontWeight: 700 }}>
            Abrir en nueva pestaña ↗
          </a>
        </p>
      </div>
    </div>
  )
}

export default function PresupuestoPersonal() {
  const { user, perfil } = useAuth()
  const today = useLiveDate()
  const mesActual = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  const [mes, setMes] = useState(mesActual)
  const [selectedDay, setSelectedDay] = useState(null)

  // Budget
  const [presupuesto, setPresupuesto] = useState(null)
  const [presupuestoInput, setPresupuestoInput] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)
  const [msgBudget, setMsgBudget] = useState(null)

  // Expense form state
  const [quincena, setQuincena] = useState(() => quincenaDeDay(today.getDate()))
  const [fechaD, setFechaD] = useState(() => String(today.getDate()).padStart(2, '0'))
  const [form, setForm] = useState({ descripcion: '', monto: '', categoria: 'otros', notas: '' })
  const [facturaFile, setFacturaFile] = useState(null)
  const [facturaPreview, setFacturaPreview] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [msgGasto, setMsgGasto] = useState(null)
  const [facturaModal, setFacturaModal] = useState(null)
  const facturaRef = useRef(null)

  // Historial tab
  const [activeTab, setActiveTab] = useState('all')

  // Gastos list
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)

  // Derived
  const [mesY, mesM] = mes.split('-').map(Number)
  const lastDayOfMonth = new Date(mesY, mesM, 0).getDate()
  const mesDate = new Date(mes + '-15')
  const mesLabel = format(mesDate, 'MMMM yyyy', { locale: es })
  const mesLabelCap = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)
  const canGoNext = mes < mesActual

  const diasQ1 = Array.from({ length: 15 }, (_, i) => i + 1)
  const diasQ2 = Array.from({ length: lastDayOfMonth - 15 }, (_, i) => i + 16)
  const diasDisponibles = quincena === 'q1' ? diasQ1 : diasQ2

  const fechaStr = `${mes}-${fechaD}`

  // Month navigation
  const prevMes = () => {
    const d = new Date(mes + '-15')
    d.setMonth(d.getMonth() - 1)
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMes = () => {
    if (!canGoNext) return
    const d = new Date(mes + '-15')
    d.setMonth(d.getMonth() + 1)
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  // Reset date when month changes
  useEffect(() => {
    if (mes === mesActual) {
      const q = quincenaDeDay(today.getDate())
      setQuincena(q)
      setFechaD(String(today.getDate()).padStart(2, '0'))
    } else {
      setQuincena('q1')
      setFechaD('01')
    }
  }, [mes])

  useEffect(() => {
    cargarPresupuesto()
    cargarGastos()
  }, [mes])

  async function cargarPresupuesto() {
    const { data } = await supabase
      .from('presupuestos_personales')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('mes', mes)
      .maybeSingle()
    setPresupuesto(data || null)
    setPresupuestoInput(data ? String(data.monto) : '')
  }

  async function cargarGastos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('gastos_personales')
      .select('*')
      .eq('usuario_id', user.id)
      .eq('mes', mes)
      .order('fecha', { ascending: false })
    if (error) {
      setMsgGasto({ tipo: 'error', texto: 'La tabla gastos_personales no existe aún. Ejecuta el SQL en Supabase.' })
    } else {
      setGastos(data || [])
    }
    setLoading(false)
  }

  const guardarPresupuesto = async () => {
    const val = parseFloat(presupuestoInput)
    if (!val || val <= 0) { setMsgBudget({ tipo: 'error', texto: 'Ingresa un monto válido.' }); return }
    setSavingBudget(true); setMsgBudget(null)
    const { error } = await supabase.from('presupuestos_personales').upsert(
      { usuario_id: user.id, mes, descripcion: 'presupuesto', monto: val },
      { onConflict: 'usuario_id,mes' }
    )
    if (error) { setMsgBudget({ tipo: 'error', texto: 'Error: ' + error.message }); setSavingBudget(false); return }
    await cargarPresupuesto()
    setSavingBudget(false)
    setMsgBudget({ tipo: 'ok', texto: 'Presupuesto guardado ✦' })
    setTimeout(() => setMsgBudget(null), 2200)
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
      fecha: fechaStr,
      notas: form.notas || null,
    }]).select().single()
    if (error) { setMsgGasto({ tipo: 'error', texto: 'Error: ' + error.message }); setGuardando(false); return }
    if (facturaFile) {
      try {
        setUploadProgress(0)
        const { url } = await uploadFactura(data.id, facturaFile, setUploadProgress)
        await supabase.from('gastos_personales').update({ factura_url: url }).eq('id', data.id)
      } catch (err) { console.warn('Factura no subida:', err.message) }
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

  const handleQuincenaChange = (q) => {
    setQuincena(q)
    setFechaD(String(q === 'q1' ? 1 : 16).padStart(2, '0'))
  }

  // Computed totals
  const gastosQ1 = gastos.filter(g => parseInt(g.fecha.split('-')[2]) <= 15)
  const gastosQ2 = gastos.filter(g => parseInt(g.fecha.split('-')[2]) > 15)
  const gastosMostrar = (activeTab === 'q1' ? gastosQ1 : activeTab === 'q2' ? gastosQ2 : gastos)
    .filter(g => selectedDay === null || parseInt(g.fecha.split('-')[2]) === selectedDay)
  const totalGastado = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const totalQ1 = gastosQ1.reduce((s, g) => s + Number(g.monto), 0)
  const totalQ2 = gastosQ2.reduce((s, g) => s + Number(g.monto), 0)
  const disponible = presupuesto?.monto ? presupuesto.monto - totalGastado : null
  const presupuestoMitad = presupuesto?.monto ? presupuesto.monto / 2 : 0

  const inp = {
    width: '100%', padding: '10px 14px', fontSize: 14, fontWeight: 500,
    border: '1.5px solid var(--border-strong)', borderRadius: 11,
    background: 'rgba(255,255,255,0.92)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)',
    transition: 'border-color 0.2s, box-shadow 0.2s', boxSizing: 'border-box',
  }
  const lbl = {
    fontSize: 11, color: 'var(--text2)', fontWeight: 700,
    letterSpacing: '0.8px', textTransform: 'uppercase', display: 'block', marginBottom: 7,
  }

  return (
    <div>
      <PageTitle
        title="Mi presupuesto personal"
        sub={`Solo tú puedes ver estos datos · ${perfil?.nombre || ''}`}
      />

      {/* ── Navegador de mes ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '2rem', gap: 24,
      }}>
        <button
          onClick={prevMes}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)', border: '1.5px solid rgba(255,255,255,0.28)',
            color: 'white', fontSize: 20, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(14px)', transition: 'all 0.2s',
            boxShadow: '0 4px 18px rgba(0,0,0,0.18)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.26)'; e.currentTarget.style.transform = 'scale(1.08)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'scale(1)' }}
        >‹</button>

        <div style={{ textAlign: 'center', minWidth: 200 }}>
          <p style={{
            fontSize: 30, fontWeight: 700, color: 'white',
            fontFamily: "'Playfair Display', serif",
            textTransform: 'capitalize', lineHeight: 1.15,
            textShadow: '0 2px 20px rgba(255,107,157,0.3)',
          }}>
            {format(mesDate, 'MMMM', { locale: es })}
          </p>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: 600, marginTop: 3 }}>
            {format(mesDate, 'yyyy')}
          </p>
          {mes === mesActual && (
            <div style={{
              display: 'inline-block', marginTop: 6,
              fontSize: 9, fontWeight: 800, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(255,107,157,0.25)', color: '#FF6B9D',
              border: '1px solid rgba(255,107,157,0.4)', letterSpacing: '1px', textTransform: 'uppercase',
            }}>
              Mes actual
            </div>
          )}
        </div>

        <button
          onClick={nextMes}
          disabled={!canGoNext}
          style={{
            width: 46, height: 46, borderRadius: '50%',
            background: canGoNext ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
            border: `1.5px solid rgba(255,255,255,${canGoNext ? '0.28' : '0.08'})`,
            color: canGoNext ? 'white' : 'rgba(255,255,255,0.22)',
            fontSize: 20, cursor: canGoNext ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(14px)', transition: 'all 0.2s',
            boxShadow: canGoNext ? '0 4px 18px rgba(0,0,0,0.18)' : 'none',
          }}
          onMouseEnter={e => { if (canGoNext) { e.currentTarget.style.background = 'rgba(255,255,255,0.26)'; e.currentTarget.style.transform = 'scale(1.08)' }}}
          onMouseLeave={e => { if (canGoNext) { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; e.currentTarget.style.transform = 'scale(1)' }}}
        >›</button>
      </div>

      {/* ── MetricCards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: '1.75rem' }}>
        <MetricCard index={0}
          label="Presupuesto del mes"
          value={presupuesto?.monto ? fmt(presupuesto.monto) : 'Sin fijar'}
          sub={presupuesto?.monto ? `≈ ${fmt(presupuesto.monto / 2)} / quincena` : undefined}
        />
        <MetricCard index={1}
          label="Q1 · Días 1–15"
          value={fmt(totalQ1)}
          sub={gastosQ1.length > 0 ? `${gastosQ1.length} gasto${gastosQ1.length > 1 ? 's' : ''}` : 'Sin gastos'}
        />
        <MetricCard index={2}
          label={`Q2 · Días 16–${lastDayOfMonth}`}
          value={fmt(totalQ2)}
          sub={gastosQ2.length > 0 ? `${gastosQ2.length} gasto${gastosQ2.length > 1 ? 's' : ''}` : 'Sin gastos'}
        />
        <MetricCard index={3}
          label="Disponible"
          value={disponible !== null ? fmt(Math.max(0, disponible)) : '—'}
          sub={disponible !== null && disponible < 0 ? `⚠ +${fmt(Math.abs(disponible))} excedido` : (disponible !== null ? `de ${fmt(presupuesto.monto)}` : 'Sin presupuesto')}
        />
      </div>

      {/* ── Calendario del mes ── */}
      <Card style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#A855F7)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            Calendario — {mesLabelCap}
          </p>
          {selectedDay && (
            <button
              onClick={() => setSelectedDay(null)}
              style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20,
                background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.28)',
                color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.18)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.10)' }}
            >
              Día {selectedDay} · ✕ limpiar
            </button>
          )}
        </div>
        <CalendarWidget mes={mes} gastos={gastos} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      </Card>

      {/* ── Barras de progreso por quincena ── */}
      {presupuesto?.monto > 0 && (
        <Card style={{ marginBottom: '1.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.4rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRAD, boxShadow: '0 0 8px rgba(255,107,157,0.6)' }} />
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Progreso — {mesLabelCap}
            </p>
            <span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 800, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {fmt(totalGastado)} / {fmt(presupuesto.monto)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <QProgressBar
              label="Primera quincena · Q1 (días 1–15)"
              gastado={totalQ1}
              presupuesto={presupuestoMitad}
              colorFrom="#FF6B9D" colorTo="#C026D3"
            />
            <QProgressBar
              label={`Segunda quincena · Q2 (días 16–${lastDayOfMonth})`}
              gastado={totalQ2}
              presupuesto={presupuestoMitad}
              colorFrom="#6366F1" colorTo="#A855F7"
            />
            <div style={{ height: 1, background: 'rgba(168,85,247,0.10)', margin: '0.2rem 0' }} />
            <QProgressBar
              label="Total del mes"
              gastado={totalGastado}
              presupuesto={presupuesto.monto}
              colorFrom="#FB923C" colorTo="#F43F5E"
            />
          </div>
        </Card>
      )}

      {/* ── Formulario + Historial ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.55fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Columna izquierda: presupuesto + formulario ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Presupuesto del mes */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#F59E0B,#FB923C)', boxShadow: '0 0 8px rgba(245,158,11,0.55)' }} />
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Presupuesto del mes
              </p>
            </div>
            {msgBudget && (
              <div style={{
                padding: '8px 12px', borderRadius: 10, marginBottom: '0.9rem', fontSize: 13, fontWeight: 600,
                background: msgBudget.tipo === 'ok' ? 'rgba(20,184,166,0.10)' : 'rgba(244,63,94,0.08)',
                color: msgBudget.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
                border: `1px solid ${msgBudget.tipo === 'ok' ? 'rgba(20,184,166,0.22)' : 'rgba(244,63,94,0.2)'}`,
              }}>{msgBudget.texto}</div>
            )}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={lbl}>Total del mes (COP)</label>
                <input
                  type="number" value={presupuestoInput}
                  onChange={e => setPresupuestoInput(e.target.value)}
                  placeholder="Ej: 600000"
                  min="0" step="10000" style={inp}
                  onKeyDown={e => e.key === 'Enter' && guardarPresupuesto()}
                />
              </div>
              <button onClick={guardarPresupuesto} disabled={savingBudget} className="btn-gradient"
                style={{ padding: '10px 18px', fontSize: 13, flexShrink: 0, opacity: savingBudget ? 0.7 : 1 }}>
                {savingBudget ? '...' : presupuesto ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
            {presupuesto?.monto > 0 && (
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
                Se distribuye ≈ {fmt(presupuesto.monto / 2)} para Q1 y ≈ {fmt(presupuesto.monto / 2)} para Q2
              </p>
            )}
          </Card>

          {/* Formulario de gasto */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.1rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: GRAD, boxShadow: '0 0 8px rgba(255,107,157,0.6)' }} />
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Registrar gasto personal
              </p>
            </div>

            {msgGasto && (
              <div style={{
                padding: '8px 12px', borderRadius: 10, marginBottom: '0.9rem', fontSize: 13, fontWeight: 600,
                background: msgGasto.tipo === 'ok' ? 'rgba(20,184,166,0.10)' : 'rgba(244,63,94,0.08)',
                color: msgGasto.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
                border: `1px solid ${msgGasto.tipo === 'ok' ? 'rgba(20,184,166,0.22)' : 'rgba(244,63,94,0.2)'}`,
              }}>{msgGasto.texto}</div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>

              {/* Quincena selector */}
              <div>
                <label style={lbl}>Quincena</label>
                <div style={{ display: 'flex', gap: 9 }}>
                  {[
                    { key: 'q1', title: 'Q1', sub: 'Días 1–15' },
                    { key: 'q2', title: 'Q2', sub: `Días 16–${lastDayOfMonth}` },
                  ].map(q => {
                    const active = quincena === q.key
                    return (
                      <button key={q.key} onClick={() => handleQuincenaChange(q.key)} style={{
                        flex: 1, padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                        border: '1.5px solid',
                        background: active ? 'linear-gradient(135deg,#FF6B9D,#C026D3)' : 'rgba(168,85,247,0.06)',
                        borderColor: active ? 'transparent' : 'rgba(168,85,247,0.22)',
                        fontFamily: 'var(--font)', transition: 'all 0.2s',
                        boxShadow: active ? '0 6px 22px rgba(255,107,157,0.38)' : 'none',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: active ? 'white' : 'var(--text)', lineHeight: 1 }}>{q.title}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'rgba(255,255,255,0.75)' : 'var(--text3)' }}>{q.sub}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Día selector */}
              <div>
                <label style={lbl}>Día del mes</label>
                <select
                  value={fechaD}
                  onChange={e => setFechaD(e.target.value)}
                  style={{ ...inp, cursor: 'pointer' }}
                >
                  {diasDisponibles.map(d => (
                    <option key={d} value={String(d).padStart(2, '0')}>
                      Día {d} de {format(mesDate, 'MMMM', { locale: es })}
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label style={lbl}>Descripción *</label>
                <input
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Ej: Café, ropa, transporte..."
                  style={inp}
                />
              </div>

              {/* Monto + Categoría */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={lbl}>Monto (COP) *</label>
                  <input
                    type="number" value={form.monto}
                    onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                    placeholder="0" min="0" step="1000" style={inp}
                  />
                </div>
                <div>
                  <label style={lbl}>Categoría</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    style={{ ...inp, cursor: 'pointer' }}
                  >
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas */}
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
                <input ref={facturaRef} type="file" accept={FACTURA_ACCEPT} onChange={handleFacturaChange} style={{ display: 'none' }} />
                {!facturaFile ? (
                  <button type="button" onClick={() => facturaRef.current?.click()} style={{
                    width: '100%', padding: '9px 14px', borderRadius: 11, cursor: 'pointer',
                    border: '1.5px dashed rgba(168,85,247,0.35)',
                    background: 'rgba(168,85,247,0.04)',
                    color: 'var(--text2)', fontSize: 13, fontWeight: 600,
                    fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.18s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.6)'; e.currentTarget.style.background = 'rgba(168,85,247,0.08)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.35)'; e.currentTarget.style.background = 'rgba(168,85,247,0.04)' }}
                  >
                    📎 Adjuntar factura
                  </button>
                ) : (
                  <div style={{
                    padding: '9px 12px', borderRadius: 11,
                    background: 'rgba(168,85,247,0.06)',
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
                    <button onClick={quitarFactura} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 15, padding: '2px 4px' }}>✕</button>
                  </div>
                )}
                {uploadProgress !== null && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text2)', fontWeight: 600, marginBottom: 4 }}>
                      <span>Subiendo...</span><span style={{ color: 'var(--accent)' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ height: 5, background: 'rgba(168,85,247,0.12)', borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: GRAD, width: `${uploadProgress}%`, transition: 'width 0.2s', borderRadius: 99 }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Resumen de fecha */}
              <div style={{
                padding: '9px 14px', borderRadius: 12,
                background: quincena === 'q1'
                  ? 'linear-gradient(135deg,rgba(255,107,157,0.10),rgba(192,38,211,0.07))'
                  : 'linear-gradient(135deg,rgba(99,102,241,0.10),rgba(168,85,247,0.07))',
                border: `1px solid ${quincena === 'q1' ? 'rgba(255,107,157,0.22)' : 'rgba(99,102,241,0.22)'}`,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 14 }}>📅</span>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>
                    {parseInt(fechaD)} de {format(mesDate, 'MMMM yyyy', { locale: es })}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, marginTop: 2 }}>
                    {quincena === 'q1' ? 'Primera quincena (Q1 · días 1–15)' : `Segunda quincena (Q2 · días 16–${lastDayOfMonth})`}
                  </p>
                </div>
              </div>

              <button onClick={guardarGasto} disabled={guardando} className="btn-gradient"
                style={{ padding: '12px', fontSize: 14, opacity: guardando ? 0.7 : 1 }}>
                {guardando
                  ? (uploadProgress !== null ? `Subiendo ${uploadProgress}%...` : 'Guardando...')
                  : '✦ Registrar gasto'}
              </button>
            </div>
          </Card>
        </div>

        {/* ── Columna derecha: historial ── */}
        <Card>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#14B8A6,#6366F1)', boxShadow: '0 0 8px rgba(20,184,166,0.6)' }} />
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Mis gastos · {mesLabelCap}
              </p>
            </div>
            {totalGastado > 0 && (
              <span style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 17, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 1px 4px rgba(255,107,157,0.35))' }}>
                {fmt(totalGastado)}
              </span>
            )}
          </div>

          {/* Tabs Q1 / Q2 / Todos */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1.1rem', flexWrap: 'wrap' }}>
            {[
              { key: 'all', label: `Todos · ${gastos.length}` },
              { key: 'q1', label: `Q1 · ${gastosQ1.length}` },
              { key: 'q2', label: `Q2 · ${gastosQ2.length}` },
            ].map(t => {
              const active = activeTab === t.key
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                  padding: '5px 15px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: '1.5px solid',
                  background: active ? 'linear-gradient(135deg,#FF6B9D,#C026D3)' : 'transparent',
                  borderColor: active ? 'transparent' : 'rgba(168,85,247,0.22)',
                  color: active ? 'white' : 'var(--text2)',
                  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s',
                  boxShadow: active ? '0 4px 16px rgba(255,107,157,0.35)' : 'none',
                }}>
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Sub-total chips cuando se filtra por quincena */}
          {activeTab !== 'all' && (
            <div style={{ display: 'flex', gap: 10, marginBottom: '1.1rem' }}>
              <div style={{
                flex: 1, padding: '10px 14px', borderRadius: 13, textAlign: 'center',
                background: activeTab === 'q1'
                  ? 'linear-gradient(135deg,rgba(255,107,157,0.09),rgba(192,38,211,0.07))'
                  : 'linear-gradient(135deg,rgba(99,102,241,0.09),rgba(168,85,247,0.07))',
                border: `1px solid ${activeTab === 'q1' ? 'rgba(255,107,157,0.22)' : 'rgba(99,102,241,0.22)'}`,
              }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>Gastado {activeTab.toUpperCase()}</p>
                <p style={{ fontSize: 19, fontWeight: 700, color: activeTab === 'q1' ? '#FF6B9D' : '#6366F1' }}>
                  {fmt(activeTab === 'q1' ? totalQ1 : totalQ2)}
                </p>
              </div>
              {presupuesto?.monto > 0 && (
                <div style={{
                  flex: 1, padding: '10px 14px', borderRadius: 13, textAlign: 'center',
                  background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)',
                }}>
                  <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 5 }}>Presupuesto {activeTab.toUpperCase()}</p>
                  <p style={{ fontSize: 19, fontWeight: 700, color: 'var(--text2)' }}>{fmt(presupuestoMitad)}</p>
                </div>
              )}
            </div>
          )}

          {/* Lista de gastos */}
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2rem', color: 'var(--text3)', justifyContent: 'center' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(168,85,247,0.2)', borderTopColor: '#A855F7', animation: 'spin 0.8s linear infinite' }} />
              Cargando...
            </div>
          ) : gastosMostrar.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div style={{ fontSize: 36, marginBottom: 12, filter: 'drop-shadow(0 2px 8px rgba(168,85,247,0.4))' }}>✦</div>
              <p style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>
                No hay gastos {activeTab !== 'all' ? `en ${activeTab.toUpperCase()}` : ''} de {mesLabelCap}
              </p>
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, opacity: 0.7 }}>
                Registra tu primer gasto personal →
              </p>
            </div>
          ) : gastosMostrar.map((g, i) => {
            const dayNum = parseInt(g.fecha.split('-')[2])
            const isQ1 = dayNum <= 15
            const qColor = isQ1 ? '#FF6B9D' : '#6366F1'
            const qLabel = isQ1 ? 'Q1' : 'Q2'
            return (
              <div key={g.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0',
                borderBottom: i < gastosMostrar.length - 1 ? '1px solid rgba(168,85,247,0.07)' : 'none',
              }}>
                {/* Indicador Q */}
                <div style={{
                  flexShrink: 0, width: 32, height: 32, borderRadius: 9,
                  background: `${qColor}18`, border: `1.5px solid ${qColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, color: qColor, letterSpacing: '0.5px',
                }}>
                  {qLabel}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{g.descripcion}</span>
                    <Badge label={g.categoria} cat={g.categoria} />
                    {g.factura_url && (
                      <button
                        onClick={() => setFacturaModal(g.factura_url)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '0 2px', lineHeight: 1, opacity: 0.85, transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.2)' }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1)' }}
                      >🧾</button>
                    )}
                  </div>
                  <p style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 3, fontWeight: 500 }}>
                    Día {dayNum} · {format(new Date(`${g.fecha}T12:00:00`), "d 'de' MMMM", { locale: es })}
                  </p>
                  {g.notas && (
                    <p style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic', marginTop: 1 }}>"{g.notas}"</p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontWeight: 800, fontSize: 14, background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', filter: 'drop-shadow(0 1px 3px rgba(255,107,157,0.3))' }}>
                    {fmt(Number(g.monto))}
                  </span>
                  <button
                    onClick={() => eliminarGasto(g)}
                    style={{ fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font)', padding: '2px 6px', borderRadius: 6, transition: 'all 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.10)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                  >✕</button>
                </div>
              </div>
            )
          })}
        </Card>

      </div>

      {facturaModal && <FacturaModal url={facturaModal} onClose={() => setFacturaModal(null)} />}
    </div>
  )
}
