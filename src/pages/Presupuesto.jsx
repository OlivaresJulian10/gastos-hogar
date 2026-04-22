import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, fmt } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

function ProgressBar({ gastado, presupuesto }) {
  if (presupuesto <= 0) return null
  const pct = Math.min((gastado / presupuesto) * 100, 100)
  const excedido = gastado > presupuesto
  const pctRestante = ((presupuesto - gastado) / presupuesto) * 100
  const bg = excedido ? '#F43F5E'
    : pctRestante > 50 ? 'linear-gradient(90deg,#14B8A6,#6366F1)'
    : pctRestante > 25 ? 'linear-gradient(90deg,#F59E0B,#FB923C)'
    : 'linear-gradient(90deg,#F43F5E,#EC4899)'
  return (
    <div style={{ width: '100%' }}>
      <div style={{ background: 'var(--surface2)', borderRadius: 99, height: 10, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: bg, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
        <span style={{ fontWeight: 600 }}>{Math.round(pct)}% usado</span>
        <span style={{ color: excedido ? '#F43F5E' : 'var(--text2)', fontWeight: excedido ? 700 : 500 }}>
          {excedido ? `+${fmt(gastado - presupuesto)} excedido` : `${fmt(presupuesto - gastado)} disponible`}
        </span>
      </div>
    </div>
  )
}

function StatBox({ label, value, color, sub }) {
  return (
    <div style={{
      textAlign: 'center', padding: '12px 8px', borderRadius: 14,
      background: 'linear-gradient(135deg,rgba(255,107,157,0.05),rgba(168,85,247,0.05))',
      border: '1px solid var(--border)',
    }}>
      <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 15, fontWeight: 700, color }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>{sub}</p>}
    </div>
  )
}

export default function Presupuesto() {
  const mesActual = format(new Date(), 'yyyy-MM')
  const [mes, setMes]     = useState(mesActual)
  const [monto, setMonto] = useState('')
  const [msg, setMsg]     = useState(null)
  const [gastosPorMes, setGastosPorMes]           = useState({})
  const [presupuestosPorMes, setPresupuestosPorMes] = useState({})
  const [loadingMes, setLoadingMes] = useState(false)
  const [guardando, setGuardando]   = useState(false)

  const ultimos6keys = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM')
  )

  // Presupuesto del mes seleccionado
  useEffect(() => {
    setLoadingMes(true)
    supabase.from('presupuestos_hogar').select('monto').eq('mes', mes).maybeSingle()
      .then(({ data }) => {
        setMonto(data?.monto?.toString() || '')
        setLoadingMes(false)
      })
  }, [mes])

  // Gastos + presupuestos de los últimos 6 meses (+ mes seleccionado si es diferente)
  useEffect(() => {
    const keys = [...new Set([...ultimos6keys, mes])]
    Promise.all([
      supabase.from('gastos').select('mes,monto').in('mes', keys),
      supabase.from('presupuestos_hogar').select('mes,monto').in('mes', keys),
    ]).then(([{ data: g }, { data: p }]) => {
      const ag = {}
      ;(g || []).forEach(x => { ag[x.mes] = (ag[x.mes] || 0) + Number(x.monto) })
      setGastosPorMes(ag)
      const ap = {}
      ;(p || []).forEach(x => { ap[x.mes] = Number(x.monto) })
      setPresupuestosPorMes(ap)
    })
  }, [mes])

  const guardar = async () => {
    const val = parseFloat(monto)
    if (!val || val <= 0) {
      setMsg({ tipo: 'error', texto: 'Ingresa un monto válido mayor a cero.' }); return
    }
    setGuardando(true)
    const { error } = await supabase.from('presupuestos_hogar')
      .upsert({ mes, monto: val, updated_at: new Date().toISOString() }, { onConflict: 'mes' })
    setGuardando(false)
    if (error) { setMsg({ tipo: 'error', texto: 'Error: ' + error.message }); return }
    setPresupuestosPorMes(p => ({ ...p, [mes]: val }))
    supabase.from('gastos').select('mes,monto').eq('mes', mes).then(({ data: g }) => {
      if (g) setGastosPorMes(prev => ({ ...prev, [mes]: g.reduce((s, x) => s + Number(x.monto), 0) }))
    })
    setMsg({ tipo: 'ok', texto: '¡Presupuesto guardado! ✦' })
    setTimeout(() => setMsg(null), 3000)
  }

  const gastadoMes     = gastosPorMes[mes] || 0
  const presupuestoMes = presupuestosPorMes[mes] || 0
  const disponible     = Math.max(0, presupuestoMes - gastadoMes)
  const excedido       = presupuestoMes > 0 && gastadoMes > presupuestoMes
  const mesLabel       = format(new Date(mes + '-02'), 'MMMM yyyy', { locale: es })

  const inpStyle = {
    padding: '10px 14px', fontSize: 15, fontWeight: 600,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)', width: '100%',
    cursor: 'pointer',
  }
  const lbl = {
    fontSize: 12, color: 'var(--text2)', fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  return (
    <div>
      <PageTitle title="Presupuesto del hogar" sub="Compartido entre todos los miembros del hogar" />

      {/* ── Estado del mes seleccionado ─────────────────── */}
      <Card style={{ marginBottom: '1.5rem' }}>
        {/* Cabecera: mes + picker */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 4 }}>
              Estado del mes
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, textTransform: 'capitalize', color: mes === mesActual ? 'var(--accent)' : 'var(--text)' }}>
              {mesLabel}
              {mes === mesActual && (
                <span style={{ fontSize: 11, background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 20, padding: '2px 8px', marginLeft: 8, verticalAlign: 'middle' }}>
                  actual
                </span>
              )}
            </p>
          </div>

          {/* Calendario mes/año */}
          <div>
            <p style={{ ...lbl, marginBottom: 4 }}>Cambiar mes</p>
            <input
              type="month"
              value={mes}
              max={mesActual}
              onChange={e => e.target.value && setMes(e.target.value)}
              style={{
                padding: '8px 12px', fontSize: 13, fontWeight: 600,
                border: '1px solid var(--border-strong)', borderRadius: 10,
                background: 'var(--surface)', color: 'var(--text)',
                outline: 'none', fontFamily: 'var(--font)', cursor: 'pointer',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: '1.1rem' }}>
          <StatBox
            label="Presupuesto"
            value={presupuestoMes > 0 ? fmt(presupuestoMes) : '—'}
            color="var(--blue)"
            sub={presupuestoMes > 0 ? `${fmt(presupuestoMes / 30)}/día` : 'Sin definir'}
          />
          <StatBox
            label="Gastado"
            value={fmt(gastadoMes)}
            color={excedido ? 'var(--red)' : gastadoMes > 0 ? 'var(--teal)' : 'var(--text2)'}
          />
          <StatBox
            label="Disponible"
            value={presupuestoMes > 0 ? fmt(disponible) : '—'}
            color={excedido ? 'var(--red)' : 'var(--accent)'}
            sub={excedido ? `¡${fmt(gastadoMes - presupuestoMes)} excedido!` : undefined}
          />
        </div>

        {/* Barra de progreso */}
        {presupuestoMes > 0 ? (
          <ProgressBar gastado={gastadoMes} presupuesto={presupuestoMes} />
        ) : (
          <div style={{
            padding: '12px 16px', borderRadius: 12, textAlign: 'center',
            background: 'linear-gradient(135deg,rgba(255,107,157,0.04),rgba(168,85,247,0.04))',
            border: '1.5px dashed rgba(168,85,247,0.2)',
          }}>
            <p style={{ fontSize: 13, color: 'var(--text3)', fontWeight: 500 }}>
              No hay presupuesto definido para {mesLabel}.
            </p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>
              Establécelo abajo para ver el control de gasto ↓
            </p>
          </div>
        )}

        {excedido && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(244,63,94,0.2)',
          }}>
            ⚠ Superaste el presupuesto de {mesLabel} en {fmt(gastadoMes - presupuestoMes)}
          </div>
        )}
      </Card>

      {/* ── Formulario editar presupuesto ───────────────── */}
      <Card style={{ maxWidth: 480, marginBottom: '1.75rem' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.3px', marginBottom: '1rem' }}>
          {presupuestoMes > 0 ? `Editar presupuesto · ${mesLabel}` : `Establecer presupuesto · ${mesLabel}`}
        </p>

        {msg && (
          <div style={{
            padding: '10px 16px', borderRadius: 10, marginBottom: '1rem', fontSize: 14, fontWeight: 600,
            background: msg.tipo === 'ok' ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))' : 'var(--red-bg)',
            color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
          }}>
            {msg.texto}
          </div>
        )}

        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={lbl}>Monto (COP)</label>
            <input
              type="number"
              value={loadingMes ? '' : monto}
              onChange={e => setMonto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guardar()}
              placeholder={loadingMes ? 'Cargando...' : 'Ej: 3000000'}
              min="0" step="50000"
              disabled={loadingMes || guardando}
              style={inpStyle}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            />
            {monto && parseFloat(monto) > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 5 }}>
                {fmt(parseFloat(monto))} · aprox. {fmt(parseFloat(monto) / 30)} por día
              </p>
            )}
          </div>

          <button
            onClick={guardar}
            disabled={guardando || loadingMes}
            className="btn-gradient"
            style={{ padding: '12px', fontSize: 14, boxShadow: '0 6px 24px rgba(168,85,247,0.3)', opacity: guardando ? 0.7 : 1 }}
          >
            {guardando ? 'Guardando...' : '✦ Guardar presupuesto'}
          </button>
        </div>
      </Card>

      {/* ── Últimos 6 meses ─────────────────────────────── */}
      <Card>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
          Últimos 6 meses
        </p>
        {ultimos6keys.map((key, i) => {
          const label      = format(new Date(key + '-02'), 'MMMM yyyy', { locale: es })
          const pMes       = presupuestosPorMes[key] || 0
          const gMes       = gastosPorMes[key] || 0
          const esActual   = key === mesActual
          const exc        = pMes > 0 && gMes > pMes
          return (
            <div
              key={key}
              onClick={() => setMes(key)}
              style={{
                padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                marginBottom: i < 5 ? 8 : 0,
                background: mes === key ? 'linear-gradient(135deg,rgba(255,107,157,0.06),rgba(168,85,247,0.06))' : 'transparent',
                border: mes === key ? '1.5px solid rgba(168,85,247,0.2)' : '1.5px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: pMes > 0 ? 10 : 0 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, textTransform: 'capitalize', color: esActual ? 'var(--accent)' : 'var(--text)' }}>
                    {label}
                    {esActual && <span style={{ fontSize: 10, background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 20, padding: '2px 8px', marginLeft: 6 }}>actual</span>}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                    Gastado: <strong>{fmt(gMes)}</strong>
                    {pMes > 0 && <> · Presupuesto: <strong>{fmt(pMes)}</strong></>}
                  </p>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700,
                  color: !pMes ? 'var(--text3)' : exc ? '#F43F5E' : ((pMes - gMes) / pMes) > 0.5 ? '#14B8A6' : '#F59E0B',
                }}>
                  {!pMes ? 'Sin presupuesto' : exc ? '⚠ Excedido' : '✦ OK'}
                </span>
              </div>
              {pMes > 0 && <ProgressBar gastado={gMes} presupuesto={pMes} />}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
