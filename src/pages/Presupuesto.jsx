import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, fmt } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

const storageKey = (mes) => `presupuesto_${mes}`

function ProgressBar({ gastado, presupuesto }) {
  if (presupuesto <= 0) return <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Sin presupuesto</span>
  const pct = Math.min((gastado / presupuesto) * 100, 100)
  const excedido = gastado > presupuesto
  const pctRestante = ((presupuesto - gastado) / presupuesto) * 100
  const bg = excedido ? '#F43F5E'
    : pctRestante > 50 ? 'linear-gradient(90deg,#14B8A6,#6366F1)'
    : pctRestante > 25 ? 'linear-gradient(90deg,#F59E0B,#FB923C)'
    : 'linear-gradient(90deg,#F43F5E,#EC4899)'
  return (
    <div style={{ width: '100%' }}>
      <div style={{ background: 'var(--surface2)', borderRadius: 99, height: 8, overflow: 'hidden', marginBottom: 4 }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: bg, transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
        <span>{Math.round(pct)}% usado</span>
        <span style={{ color: excedido ? '#F43F5E' : 'var(--text3)', fontWeight: excedido ? 700 : 400 }}>
          {excedido ? `+${fmt(gastado - presupuesto)} excedido` : `${fmt(presupuesto - gastado)} disponible`}
        </span>
      </div>
    </div>
  )
}

export default function Presupuesto() {
  const mesActual = format(new Date(), 'yyyy-MM')
  const [mes, setMes] = useState(mesActual)
  const [monto, setMonto] = useState('')
  const [msg, setMsg] = useState(null)
  const [gastosPorMes, setGastosPorMes] = useState({})

  const mesesOpts = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  const ultimos6keys = Array.from({ length: 6 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM')
  )

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(mes))
    setMonto(saved || '')
  }, [mes])

  useEffect(() => {
    supabase.from('gastos').select('mes, monto')
      .in('mes', ultimos6keys)
      .then(({ data }) => {
        const agrupado = {}
        ;(data || []).forEach(g => {
          agrupado[g.mes] = (agrupado[g.mes] || 0) + Number(g.monto)
        })
        setGastosPorMes(agrupado)
      })
  }, [])

  const guardar = () => {
    const val = parseFloat(monto)
    if (!val || val <= 0) {
      setMsg({ tipo: 'error', texto: 'Ingresa un monto válido mayor a cero.' }); return
    }
    localStorage.setItem(storageKey(mes), val.toString())
    setMsg({ tipo: 'ok', texto: '¡Presupuesto guardado exitosamente! ✦' })
    setTimeout(() => setMsg(null), 3000)
  }

  const inp = {
    padding: '10px 14px', fontSize: 15, fontWeight: 600,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)', width: '100%',
  }
  const selectStyle = {
    padding: '10px 14px', fontSize: 14, fontWeight: 600,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)', width: '100%', cursor: 'pointer',
  }
  const labelStyle = {
    fontSize: 12, color: 'var(--text2)', fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }

  return (
    <div>
      <PageTitle title="Presupuesto mensual" sub="Define cuánto quieres gastar cada mes y monitorea tu avance" />

      <Card style={{ maxWidth: 520, marginBottom: '1.75rem' }}>
        {msg && (
          <div style={{
            padding: '10px 16px', borderRadius: 10, marginBottom: '1.25rem',
            fontSize: 14, fontWeight: 600,
            background: msg.tipo === 'ok'
              ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))'
              : 'var(--red-bg)',
            color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
            border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
          }}>
            {msg.texto}
          </div>
        )}

        <div style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label style={labelStyle}>Mes</label>
            <select value={mes} onChange={e => setMes(e.target.value)} style={selectStyle}>
              {mesesOpts.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Presupuesto (COP)</label>
            <input
              type="number"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && guardar()}
              placeholder="Ej: 3000000"
              min="0"
              step="50000"
              style={inp}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }}
              onBlur={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }}
            />
            {monto && parseFloat(monto) > 0 && (
              <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 5 }}>
                {fmt(parseFloat(monto))} · presupuesto diario aprox. {fmt(parseFloat(monto) / 30)}
              </p>
            )}
          </div>
          <button
            onClick={guardar}
            className="btn-gradient"
            style={{ padding: '12px', fontSize: 14, boxShadow: '0 6px 24px rgba(168,85,247,0.3)' }}
          >
            ✦ Guardar presupuesto
          </button>
        </div>
      </Card>

      <Card>
        <p style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
          Últimos 6 meses
        </p>
        {ultimos6keys.map((key, i) => {
          const label = format(new Date(key + '-01'), 'MMMM yyyy', { locale: es })
          const presupuestoMes = parseFloat(localStorage.getItem(storageKey(key)) || '0')
          const gastado = gastosPorMes[key] || 0
          return (
            <div key={key} style={{
              padding: '14px 0',
              borderBottom: i < 5 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <p style={{
                    fontSize: 14, fontWeight: 700,
                    color: key === mesActual ? 'var(--accent)' : 'var(--text)',
                    textTransform: 'capitalize',
                  }}>
                    {label} {key === mesActual && <span style={{ fontSize: 11, background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 20, padding: '2px 8px', marginLeft: 4 }}>actual</span>}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3 }}>
                    Gastado: <strong>{fmt(gastado)}</strong>
                    {presupuestoMes > 0 && <> · Presupuesto: <strong>{fmt(presupuestoMes)}</strong></>}
                  </p>
                </div>
                {presupuestoMes > 0 && (
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: gastado > presupuestoMes ? '#F43F5E'
                      : ((presupuestoMes - gastado) / presupuestoMes) > 0.5 ? '#14B8A6'
                      : '#F59E0B',
                  }}>
                    {gastado > presupuestoMes ? '⚠ Excedido' : '✦ OK'}
                  </span>
                )}
              </div>
              <ProgressBar gastado={gastado} presupuesto={presupuestoMes} />
            </div>
          )
        })}
      </Card>
    </div>
  )
}
