import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, MetricCard, Avatar, fmt } from '../components/UI'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const mesActual = format(new Date(), 'yyyy-MM')

export default function Balance() {
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [mes, setMes] = useState(mesActual)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('gastos').select('*').eq('mes', mes),
      supabase.from('personas').select('*')
    ]).then(([{ data: g }, { data: p }]) => {
      setGastos(g || [])
      setPersonas(p || [])
      setLoading(false)
    })
  }, [mes])

  const calcBalance = () => {
    const n = personas.length
    const pagado = new Array(n).fill(0)
    const debe = personas.map(() => new Array(n).fill(0))

    gastos.forEach(g => {
      const payIdx = personas.findIndex(p => p.id === g.pagado_por)
      if (payIdx < 0) return
      pagado[payIdx] += Number(g.monto)
      const split = (g.split_entre || []).map(id => personas.findIndex(p => p.id === id)).filter(i => i >= 0)
      const parte = Number(g.monto) / split.length
      split.forEach(i => {
        if (i !== payIdx) debe[i][payIdx] += parte
      })
    })

    const net = personas.map((_, i) => {
      const aRecibir = debe.reduce((s, row) => s + row[i], 0)
      const aPagar = debe[i].reduce((s, v) => s + v, 0)
      return aRecibir - aPagar
    })

    const transferencias = []
    const nc = [...net]
    for (let iter = 0; iter < 20; iter++) {
      const minI = nc.indexOf(Math.min(...nc))
      const maxI = nc.indexOf(Math.max(...nc))
      if (Math.abs(nc[minI]) < 1) break
      const amt = Math.min(-nc[minI], nc[maxI])
      if (amt < 1) break
      transferencias.push({ de: minI, a: maxI, monto: amt })
      nc[minI] += amt; nc[maxI] -= amt
    }

    return { pagado, net, transferencias }
  }

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const { pagado, net, transferencias } = personas.length ? calcBalance() : { pagado: [], net: [], transferencias: [] }

  const mesesOpts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = format(d, 'yyyy-MM')
    return { key, label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  const personaColors = [
    { deuda: '#FCEBEB', text: '#A32D2D', ok: '#EAF3DE', okText: '#3B6D11' },
    { deuda: '#FCEBEB', text: '#A32D2D', ok: '#EAF3DE', okText: '#3B6D11' },
    { deuda: '#FCEBEB', text: '#A32D2D', ok: '#EAF3DE', okText: '#3B6D11' },
    { deuda: '#FCEBEB', text: '#A32D2D', ok: '#EAF3DE', okText: '#3B6D11' },
  ]

  const inp = { padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }

  return (
    <div>
      <PageTitle title="Balance del hogar" sub="¿Quién debe qué a quién este mes?" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Mes:</span>
        <select value={mes} onChange={e => setMes(e.target.value)} style={inp}>
          {mesesOpts.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: 'var(--text2)' }}>Cargando...</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
            <MetricCard label="Total del mes" value={fmt(total)} color="var(--accent)" />
            <MetricCard label="Parte ideal por persona" value={fmt(total / Math.max(personas.length, 1))} />
            <MetricCard label="Transferencias necesarias" value={transferencias.length} />
            <MetricCard label="Gastos registrados" value={gastos.length} />
          </div>

          <Card style={{ marginBottom: '1rem' }}>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Transferencias para saldar deudas</p>
            {transferencias.length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', padding: '1rem' }}>
                ¡Todo está en paz! Nadie debe nada este mes. 🎉
              </p>
            ) : transferencias.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                borderBottom: i < transferencias.length - 1 ? '1px solid var(--border)' : 'none', flexWrap: 'wrap'
              }}>
                <Avatar nombre={personas[t.de]?.nombre} index={t.de} />
                <span style={{ fontSize: 14 }}><strong>{personas[t.de]?.nombre}</strong> le debe pagar</span>
                <span style={{
                  fontSize: 16, fontWeight: 700,
                  background: 'var(--teal-bg)', color: 'var(--teal)',
                  padding: '3px 12px', borderRadius: 20,
                }}>{fmt(t.monto)}</span>
                <span style={{ fontSize: 14 }}>a</span>
                <Avatar nombre={personas[t.a]?.nombre} index={t.a} />
                <strong>{personas[t.a]?.nombre}</strong>
              </div>
            ))}
          </Card>

          <Card>
            <p style={{ fontSize: 14, fontWeight: 500, marginBottom: '1rem' }}>Detalle por persona</p>
            {personas.map((p, i) => {
              const diff = net[i] || 0
              const badge = Math.abs(diff) < 1
                ? { bg: 'var(--gray-bg)', color: 'var(--gray)', text: 'Equilibrado' }
                : diff > 0
                ? { bg: 'var(--teal-bg)', color: 'var(--teal)', text: `Te deben ${fmt(diff)}` }
                : { bg: 'var(--red-bg)', color: 'var(--red)', text: `Debes ${fmt(-diff)}` }
              return (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: i < personas.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar nombre={p.nombre} index={i} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{p.nombre}</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)' }}>Pagó {fmt(pagado[i] || 0)} este mes</p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20,
                    background: badge.bg, color: badge.color,
                  }}>{badge.text}</span>
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}
