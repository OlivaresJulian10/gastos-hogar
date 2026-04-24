import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, Avatar, fmt } from '../components/UI'
import { format, subMonths, getDaysInMonth, getDate } from 'date-fns'
import { es } from 'date-fns/locale'

/* ── Helpers ────────────────────────────────────────────────── */
function ProgressBar({ gastado, presupuesto }) {
  if (!presupuesto) return null
  const pct = Math.min((gastado / presupuesto) * 100, 100)
  const exc = gastado > presupuesto
  const rest = ((presupuesto - gastado) / presupuesto) * 100
  const bg = exc ? '#F43F5E'
    : rest > 50 ? 'linear-gradient(90deg,#14B8A6,#6366F1)'
    : rest > 25 ? 'linear-gradient(90deg,#F59E0B,#FB923C)'
    : 'linear-gradient(90deg,#F43F5E,#EC4899)'
  return (
    <div>
      <div style={{ background: 'var(--surface2)', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: bg, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
        <span style={{ fontWeight: 600 }}>{Math.round(pct)}% usado</span>
        <span style={{ color: exc ? '#F43F5E' : 'var(--text2)', fontWeight: exc ? 700 : 500 }}>
          {exc ? `+${fmt(gastado - presupuesto)} excedido` : `${fmt(presupuesto - gastado)} disponible`}
        </span>
      </div>
    </div>
  )
}

function StatBox({ label, value, color, sub }) {
  return (
    <div style={{
      textAlign: 'center', padding: '12px 6px', borderRadius: 14,
      background: 'linear-gradient(135deg,rgba(255,107,157,0.05),rgba(168,85,247,0.05))',
      border: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

function SinPresupuesto({ periodo }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 12, textAlign: 'center',
      background: 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))',
      border: '1.5px dashed rgba(168,85,247,0.2)',
    }}>
      <p style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>
        No hay presupuesto definido para {periodo}.
      </p>
      <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
        Ingresa los aportes de cada persona abajo ↓
      </p>
    </div>
  )
}

/* ── Componente principal ──────────────────────────────────── */
export default function Presupuesto() {
  const mesActual  = format(new Date(), 'yyyy-MM')
  const todayDay   = getDate(new Date())
  const currentQ   = todayDay <= 15 ? 'q1' : 'q2'

  const [mes, setMes]         = useState(mesActual)
  const [vista, setVista]     = useState(currentQ)
  const [personas, setPersonas] = useState([])
  const [aportes, setAportes]   = useState([])
  const [gastos, setGastos]     = useState([])
  const [inputs, setInputs]     = useState({})
  const [loading, setLoading]   = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg]           = useState(null)

  /* ── Carga de datos ──── */
  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('personas').select('*').order('nombre'),
      supabase.from('aportes_presupuesto').select('*').eq('mes', mes),
      supabase.from('gastos').select('fecha,monto,pagado_por,descripcion,split_entre').eq('mes', mes),
    ]).then(([{ data: p }, { data: a }, { data: g }]) => {
      const pers = p || []
      const ap   = a || []
      setPersonas(pers)
      setAportes(ap)
      setGastos(g || [])

      // Inicializar inputs desde DB
      const inp = {}
      pers.forEach(p => {
        const a1 = ap.find(x => x.persona_id === p.id && x.quincena === 1)
        const a2 = ap.find(x => x.persona_id === p.id && x.quincena === 2)
        inp[`${p.id}-1`] = a1 ? String(a1.monto) : ''
        inp[`${p.id}-2`] = a2 ? String(a2.monto) : ''
      })
      setInputs(inp)
      setLoading(false)
    })
  }, [mes])

  /* ── Cálculos ──── */
  const lastDay = getDaysInMonth(new Date(mes + '-02'))

  const gastosQ1 = useMemo(() => gastos.filter(g => {
    const d = parseInt((g.fecha || '').split('-')[2] || '0')
    return d >= 1 && d <= 15
  }), [gastos])

  const gastosQ2 = useMemo(() => gastos.filter(g => {
    const d = parseInt((g.fecha || '').split('-')[2] || '0')
    return d >= 16
  }), [gastos])

  const totalQ1 = gastosQ1.reduce((s, g) => s + Number(g.monto), 0)
  const totalQ2 = gastosQ2.reduce((s, g) => s + Number(g.monto), 0)
  const totalMes = totalQ1 + totalQ2

  const getAporte = (personaId, q) => {
    const a = aportes.find(x => x.persona_id === personaId && x.quincena === q)
    return a ? Number(a.monto) : 0
  }

  const presQ1  = personas.reduce((s, p) => s + getAporte(p.id, 1), 0)
  const presQ2  = personas.reduce((s, p) => s + getAporte(p.id, 2), 0)
  const presMes = presQ1 + presQ2

  // Días restantes en la quincena actual
  const isCurrentMes = mes === mesActual
  const diasRestQ1 = isCurrentMes && todayDay <= 15 ? 15 - todayDay : null
  const diasRestQ2 = isCurrentMes && todayDay > 15  ? lastDay - todayDay : null

  /* ── Guardar aportes ──── */
  const guardarAportes = async (q) => {
    setGuardando(true)
    const rows = personas.map(p => ({
      mes,
      quincena: q,
      persona_id: p.id,
      monto: parseFloat(inputs[`${p.id}-${q}`] || '0') || 0,
      updated_at: new Date().toISOString(),
    }))
    const { data, error } = await supabase
      .from('aportes_presupuesto')
      .upsert(rows, { onConflict: 'mes,quincena,persona_id' })
      .select()
    setGuardando(false)
    if (error) { setMsg({ tipo: 'error', texto: 'Error: ' + error.message }); return }
    setAportes(prev => {
      const rest = prev.filter(x => !(x.mes === mes && x.quincena === q))
      return [...rest, ...(data || rows)]
    })
    setMsg({ tipo: 'ok', texto: `✦ Aportes Q${q} guardados` })
    setTimeout(() => setMsg(null), 3000)
  }

  /* ── Estilos comunes ──── */
  const tabBtn = (active, color = 'var(--accent)') => ({
    flex: 1, padding: '9px 8px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'var(--font)', border: 'none',
    background: active ? color : 'var(--surface2)',
    color: active ? 'white' : 'var(--text2)',
    transition: 'all 0.18s', boxShadow: active ? '0 4px 14px rgba(168,85,247,0.3)' : 'none',
  })
  const inpAporte = {
    padding: '9px 12px', fontSize: 14, fontWeight: 600, borderRadius: 10,
    border: '1px solid var(--border-strong)', background: 'var(--surface)',
    color: 'var(--text)', outline: 'none', fontFamily: 'var(--font)',
    width: '100%', textAlign: 'right',
  }
  const mesLabel = format(new Date(mes + '-02'), 'MMMM yyyy', { locale: es })

  /* ── Vista Q1 o Q2 ──── */
  const renderQuincena = (q) => {
    const gastado     = q === 1 ? totalQ1 : totalQ2
    const presupuesto = q === 1 ? presQ1 : presQ2
    const rangoLabel  = q === 1 ? `1 – 15 de ${mesLabel}` : `16 – ${lastDay} de ${mesLabel}`
    const diasRest    = q === 1 ? diasRestQ1 : diasRestQ2
    const totalInput  = personas.reduce((s, p) => s + (parseFloat(inputs[`${p.id}-${q}`]) || 0), 0)
    const exc         = presupuesto > 0 && gastado > presupuesto

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Estado del período */}
        <Card>
          <div style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 3 }}>
              {q === 1 ? 'Primera quincena' : 'Segunda quincena'}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, textTransform: 'capitalize', color: 'var(--text)' }}>
              {rangoLabel}
              {diasRest !== null && (
                <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, marginLeft: 10 }}>
                  {diasRest === 0 ? 'Último día' : `${diasRest} día${diasRest !== 1 ? 's' : ''} restante${diasRest !== 1 ? 's' : ''}`}
                </span>
              )}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1rem' }}>
            <StatBox label="Presupuesto" value={presupuesto > 0 ? fmt(presupuesto) : '—'} color="var(--blue)"
              sub={presupuesto > 0 && diasRest ? `${fmt(presupuesto / 15)}/día` : undefined} />
            <StatBox label="Gastado" value={fmt(gastado)} color={exc ? 'var(--red)' : gastado > 0 ? 'var(--teal)' : 'var(--text2)'} />
            <StatBox label="Disponible" value={presupuesto > 0 ? fmt(Math.max(0, presupuesto - gastado)) : '—'}
              color={exc ? 'var(--red)' : 'var(--accent)'}
              sub={exc ? `¡${fmt(gastado - presupuesto)} excedido!` : undefined} />
          </div>

          {presupuesto > 0
            ? <ProgressBar gastado={gastado} presupuesto={presupuesto} />
            : <SinPresupuesto periodo={`Q${q} · ${rangoLabel}`} />}

          {exc && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(244,63,94,0.2)' }}>
              ⚠ Excediste el presupuesto en {fmt(gastado - presupuesto)}
            </div>
          )}
        </Card>

        {/* Aportes al presupuesto */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.3px' }}>
              Aportes al presupuesto
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)' }}>
              Total: <strong style={{ color: presupuesto > 0 ? 'var(--accent)' : 'var(--text3)' }}>{fmt(presupuesto)}</strong>
            </p>
          </div>

          {/* Aportes guardados en DB */}
          {presupuesto > 0 && (
            <div style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
                Quiénes han aportado
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {personas.map((p, i) => {
                  const aporte = getAporte(p.id, q)
                  if (!aporte) return null
                  const pct = presupuesto > 0 ? Math.round((aporte / presupuesto) * 100) : 0
                  const colors = ['#FF6B9D', '#A855F7', '#6366F1', '#14B8A6', '#FB923C', '#F43F5E']
                  return (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '9px 12px', borderRadius: 11,
                      background: 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))',
                      border: `1.5px solid ${colors[i % colors.length]}30`,
                    }}>
                      <Avatar nombre={p.nombre} index={i} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.nombre}</span>
                      <span style={{ fontSize: 11, color: colors[i % colors.length], fontWeight: 700, marginRight: 6 }}>
                        {pct}%
                      </span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: colors[i % colors.length] }}>
                        {fmt(aporte)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Barra de distribución */}
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', borderRadius: 99, height: 7, overflow: 'hidden', marginBottom: 4 }}>
                  {personas.map((p, i) => {
                    const aporte = getAporte(p.id, q)
                    const pct = presupuesto > 0 ? (aporte / presupuesto) * 100 : 0
                    const colors = ['#FF6B9D', '#A855F7', '#6366F1', '#14B8A6', '#FB923C', '#F43F5E']
                    return pct > 0 ? (
                      <div key={p.id} style={{ width: `${pct}%`, background: colors[i % colors.length], transition: 'width 0.4s' }} />
                    ) : null
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Separador */}
          <div style={{ borderTop: '1px dashed var(--border)', marginBottom: '1rem' }} />

          {/* Formulario de edición */}
          <p style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            {presupuesto > 0 ? 'Actualizar aportes' : 'Registrar aportes'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '1.1rem' }}>
            {personas.map((p, i) => {
              const key = `${p.id}-${q}`
              const val = inputs[key] || ''
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar nombre={p.nombre} index={i} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{p.nombre}</span>
                  <div style={{ position: 'relative', width: 160 }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>$</span>
                    <input
                      type="number"
                      value={val}
                      min="0"
                      step="10000"
                      placeholder="0"
                      onChange={e => setInputs(prev => ({ ...prev, [key]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && guardarAportes(q)}
                      style={{ ...inpAporte, paddingLeft: 22 }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Barra visual del total a guardar */}
          {totalInput > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                {personas.map((p, i) => {
                  const val = parseFloat(inputs[`${p.id}-${q}`]) || 0
                  const pct = totalInput > 0 ? (val / totalInput) * 100 : 0
                  const colors = ['#FF6B9D', '#A855F7', '#6366F1', '#14B8A6', '#FB923C', '#F43F5E']
                  return pct > 0 ? (
                    <div key={p.id} style={{ width: `${pct}%`, background: colors[i % colors.length], transition: 'width 0.4s' }} />
                  ) : null
                })}
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {personas.map((p, i) => {
                  const val = parseFloat(inputs[`${p.id}-${q}`]) || 0
                  if (!val) return null
                  const pct = totalInput > 0 ? Math.round((val / totalInput) * 100) : 0
                  const colors = ['#FF6B9D', '#A855F7', '#6366F1', '#14B8A6', '#FB923C', '#F43F5E']
                  return (
                    <span key={p.id} style={{ fontSize: 11, fontWeight: 600, color: colors[i % colors.length] }}>
                      {p.nombre.split(' ')[0]} {pct}%
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => guardarAportes(q)}
            disabled={guardando}
            className="btn-gradient"
            style={{ width: '100%', padding: '11px', fontSize: 14, boxShadow: '0 6px 20px rgba(168,85,247,0.28)', opacity: guardando ? 0.7 : 1 }}
          >
            {guardando ? 'Guardando...' : `✦ Guardar aportes Q${q}`}
          </button>
        </Card>

        {/* Gastos del período con detalle */}
        {(q === 1 ? gastosQ1 : gastosQ2).length > 0 && (
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>
                Gastos del período ({(q === 1 ? gastosQ1 : gastosQ2).length})
              </p>
              <span style={{ fontSize: 15, fontWeight: 700, color: (q === 1 ? totalQ1 : totalQ2) > presupuesto && presupuesto > 0 ? 'var(--red)' : 'var(--teal)' }}>
                {fmt(q === 1 ? totalQ1 : totalQ2)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(q === 1 ? gastosQ1 : gastosQ2).map((g, idx) => {
                const pagador = personas.find(p => p.id === g.pagado_por)
                const pIdx = personas.findIndex(p => p.id === g.pagado_por)
                const splitNombres = (g.split_entre || [])
                  .map(id => personas.find(p => p.id === id)?.nombre?.split(' ')[0])
                  .filter(Boolean).join(', ')
                const gastosPer = q === 1 ? gastosQ1 : gastosQ2
                return (
                  <div key={g.id || idx} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 11,
                    background: 'linear-gradient(135deg,rgba(255,107,157,0.03),rgba(168,85,247,0.03))',
                    border: '1px solid var(--border)',
                    borderBottom: idx < gastosPer.length - 1 ? undefined : undefined,
                  }}>
                    <Avatar nombre={pagador?.nombre} index={pIdx >= 0 ? pIdx : 0} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {g.descripcion || '—'}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                        Pagó: <strong style={{ color: 'var(--text2)' }}>{pagador?.nombre || '—'}</strong>
                        {splitNombres && (
                          <> · Entre: <span style={{ color: 'var(--text3)' }}>{splitNombres}</span></>
                        )}
                        <span style={{ marginLeft: 6, color: 'var(--text3)' }}>· {g.fecha}</span>
                      </p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                      {fmt(g.monto)}
                    </span>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    )
  }

  /* ── Vista mensual ──── */
  const renderMensual = () => {
    const exc = presMes > 0 && totalMes > presMes
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Resumen mensual */}
        <Card>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Resumen mensual · {mesLabel}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1rem' }}>
            <StatBox label="Presupuesto total" value={presMes > 0 ? fmt(presMes) : '—'} color="var(--blue)" />
            <StatBox label="Total gastado" value={fmt(totalMes)} color={exc ? 'var(--red)' : 'var(--teal)'} />
            <StatBox label="Disponible" value={presMes > 0 ? fmt(Math.max(0, presMes - totalMes)) : '—'}
              color={exc ? 'var(--red)' : 'var(--accent)'}
              sub={exc ? `¡${fmt(totalMes - presMes)} excedido!` : undefined} />
          </div>
          {presMes > 0
            ? <ProgressBar gastado={totalMes} presupuesto={presMes} />
            : <SinPresupuesto periodo={`el mes de ${mesLabel}`} />}
        </Card>

        {/* Desglose por quincenas */}
        <Card>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: '1rem' }}>
            Desglose por quincena
          </p>
          {[
            { label: `Q1 · 1 – 15 de ${mesLabel}`, presupuesto: presQ1, gastado: totalQ1, q: 1 },
            { label: `Q2 · 16 – ${lastDay} de ${mesLabel}`, presupuesto: presQ2, gastado: totalQ2, q: 2 },
          ].map(({ label, presupuesto, gastado, q }) => (
            <div
              key={q}
              onClick={() => setVista(`q${q}`)}
              style={{
                padding: '14px', borderRadius: 12, marginBottom: q === 1 ? 10 : 0,
                background: 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))',
                border: '1px solid var(--border)', cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: presupuesto > 0 ? 10 : 0 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    Gastado: <strong>{fmt(gastado)}</strong>
                    {presupuesto > 0 && <> · Presupuesto: <strong>{fmt(presupuesto)}</strong></>}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: !presupuesto ? 'var(--text3)' : gastado > presupuesto ? 'var(--red)' : ((presupuesto - gastado) / presupuesto) > 0.5 ? 'var(--teal)' : '#F59E0B',
                }}>
                  {!presupuesto ? 'Sin presup.' : gastado > presupuesto ? '⚠ Excedido' : '✦ OK'}
                </span>
              </div>
              {presupuesto > 0 && <ProgressBar gastado={gastado} presupuesto={presupuesto} />}
            </div>
          ))}
        </Card>

        {/* Aportes por persona (totales del mes) */}
        {(presQ1 > 0 || presQ2 > 0) && (
          <Card>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: '1rem' }}>
              Aportes por persona
            </p>
            {personas.map((p, i) => {
              const a1 = getAporte(p.id, 1)
              const a2 = getAporte(p.id, 2)
              const total = a1 + a2
              if (!total) return null
              const pct = presMes > 0 ? Math.round((total / presMes) * 100) : 0
              const colors = ['#FF6B9D', '#A855F7', '#6366F1', '#14B8A6', '#FB923C', '#F43F5E']
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                  borderBottom: i < personas.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <Avatar nombre={p.nombre} index={i} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{p.nombre}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {a1 > 0 && `Q1: ${fmt(a1)}`}
                      {a1 > 0 && a2 > 0 && ' · '}
                      {a2 > 0 && `Q2: ${fmt(a2)}`}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: colors[i % colors.length] }}>{fmt(total)}</p>
                    <p style={{ fontSize: 11, color: 'var(--text3)' }}>{pct}% del total</p>
                  </div>
                </div>
              )
            })}

            {/* Barra de distribución */}
            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 6 }}>
                {personas.map((p, i) => {
                  const total = getAporte(p.id, 1) + getAporte(p.id, 2)
                  const pct = presMes > 0 ? (total / presMes) * 100 : 0
                  const colors = ['#FF6B9D', '#A855F7', '#6366F1', '#14B8A6', '#FB923C', '#F43F5E']
                  return pct > 0 ? (
                    <div key={p.id} style={{ width: `${pct}%`, background: colors[i % colors.length], transition: 'width 0.4s' }} />
                  ) : null
                })}
              </div>
            </div>
          </Card>
        )}
      </div>
    )
  }

  /* ── Render ──── */
  return (
    <div>
      <PageTitle title="Presupuesto del hogar" sub="Quincenal por persona · Compartido entre todos" />

      {/* Mensaje de estado */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 11, marginBottom: '1.25rem', fontSize: 14, fontWeight: 600,
          background: msg.tipo === 'ok' ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))' : 'var(--red-bg)',
          color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
          border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
        }}>
          {msg.texto}
        </div>
      )}

      {/* Selector de mes + tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 5 }}>Mes</p>
          <input
            type="month"
            value={mes}
            max={mesActual}
            onChange={e => e.target.value && setMes(e.target.value)}
            style={{
              padding: '9px 12px', fontSize: 13, fontWeight: 600,
              border: '1px solid var(--border-strong)', borderRadius: 10,
              background: 'var(--surface)', color: 'var(--text)',
              outline: 'none', fontFamily: 'var(--font)', cursor: 'pointer',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }}
            onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6, flex: 1, minWidth: 260 }}>
          <button style={tabBtn(vista === 'q1', 'linear-gradient(135deg,#FF6B9D,#A855F7)')} onClick={() => setVista('q1')}>
            Q1 · 1–15
          </button>
          <button style={tabBtn(vista === 'q2', 'linear-gradient(135deg,#6366F1,#A855F7)')} onClick={() => setVista('q2')}>
            Q2 · 16–{lastDay}
          </button>
          <button style={tabBtn(vista === 'mensual', 'linear-gradient(135deg,#14B8A6,#6366F1)')} onClick={() => setVista('mensual')}>
            Mensual
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <span style={{ fontSize: 18 }}>✦</span> Cargando...
        </p>
      ) : (
        <>
          {vista === 'q1'      && renderQuincena(1)}
          {vista === 'q2'      && renderQuincena(2)}
          {vista === 'mensual' && renderMensual()}
        </>
      )}
    </div>
  )
}
