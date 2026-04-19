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
      split.forEach(i => { if (i !== payIdx) debe[i][payIdx] += parte })
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

  const inp = {
    padding: '9px 14px', fontSize: 13, fontWeight: 600,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
    fontFamily: 'var(--font)',
  }

  return (
    <div>
      <PageTitle title="Balance del hogar" sub="¿Quién debe qué a quién este mes?" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Mes:</span>
        <select value={mes} onChange={e => setMes(e.target.value)} style={inp}>
          {mesesOpts.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>✦</span> Cargando...
        </p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 14, marginBottom: '1.75rem' }}>
            <MetricCard label="Total del mes" value={fmt(total)} color="var(--accent)" accent="var(--grad-primary)" />
            <MetricCard label="Parte ideal / persona" value={fmt(total / Math.max(personas.length, 1))} accent="linear-gradient(135deg,#6366F1,#A855F7)" />
            <MetricCard label="Transferencias" value={transferencias.length} accent="linear-gradient(135deg,#FB923C,#F43F5E)" />
            <MetricCard label="Gastos registrados" value={gastos.length} accent="linear-gradient(135deg,#14B8A6,#6366F1)" />
          </div>

          <Card style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
              Transferencias para saldar deudas
            </p>
            {transferencias.length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', padding: '1.5rem', fontStyle: 'italic' }}>
                ¡Todo está en paz! Nadie debe nada este mes ✦
              </p>
            ) : transferencias.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0',
                borderBottom: i < transferencias.length - 1 ? '1px solid var(--border)' : 'none',
                flexWrap: 'wrap',
              }}>
                <Avatar nombre={personas[t.de]?.nombre} index={t.de} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  <strong style={{ color: 'var(--text)' }}>{personas[t.de]?.nombre}</strong> le debe pagar
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 700,
                  background: 'var(--grad-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  padding: '4px 14px',
                  border: '1.5px solid var(--border-strong)',
                  borderRadius: 22,
                  WebkitTextFillColor: 'unset',
                  color: 'var(--accent)',
                }}>
                  {fmt(t.monto)}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text2)' }}>a</span>
                <Avatar nombre={personas[t.a]?.nombre} index={t.a} />
                <strong style={{ fontSize: 14 }}>{personas[t.a]?.nombre}</strong>
              </div>
            ))}
          </Card>

          <Card>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
              Detalle por persona
            </p>
            {personas.map((p, i) => {
              const diff = net[i] || 0
              const badge = Math.abs(diff) < 1
                ? { bg: 'var(--gray-bg)', color: 'var(--gray)', text: 'Equilibrada ✦' }
                : diff > 0
                ? { bg: 'var(--teal-bg)', color: 'var(--teal)', text: `Te deben ${fmt(diff)}` }
                : { bg: 'var(--red-bg)', color: 'var(--red)', text: `Debes ${fmt(-diff)}` }
              return (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: i < personas.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar nombre={p.nombre} index={i} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{p.nombre}</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, fontWeight: 500 }}>
                        Pagó {fmt(pagado[i] || 0)} este mes
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 22,
                    background: badge.bg, color: badge.color,
                  }}>
                    {badge.text}
                  </span>
                </div>
              )
            })}
          </Card>
        </>
      )}
    </div>
  )
}
