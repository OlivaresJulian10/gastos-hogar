import { useEffect, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, Tooltip, Legend
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, MetricCard, fmt, CATEGORIAS, CAT_CHART_COLORS } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

export default function Comparativo() {
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [nMeses, setNMeses] = useState(6)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('gastos').select('*'),
      supabase.from('personas').select('*')
    ]).then(([{ data: g }, { data: p }]) => {
      setGastos(g || [])
      setPersonas(p || [])
      setLoading(false)
    })
  }, [])

  const meses = Array.from({ length: nMeses }, (_, i) => {
    const d = subMonths(new Date(), nMeses - 1 - i)
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yy', { locale: es }) }
  })

  const totalesMes = meses.map(m =>
    gastos.filter(g => g.mes === m.key).reduce((s, g) => s + Number(g.monto), 0)
  )

  // Por categoría por mes (stacked bar)
  const datasetsPorCat = CATEGORIAS.map((cat, i) => ({
    label: cat,
    data: meses.map(m =>
      gastos.filter(g => g.mes === m.key && g.categoria === cat).reduce((s, g) => s + Number(g.monto), 0)
    ),
    backgroundColor: CAT_CHART_COLORS[i],
    borderRadius: 4,
  }))

  // Por persona por mes
  const datasetsPorPersona = personas.map((p, i) => ({
    label: p.nombre,
    data: meses.map(m =>
      gastos.filter(g => g.mes === m.key && g.pagado_por === p.id).reduce((s, g) => s + Number(g.monto), 0)
    ),
    borderColor: ['#7C6FE0', '#1D9E75', '#D85A30', '#D4537E'][i % 4],
    backgroundColor: ['rgba(124,111,224,0.1)', 'rgba(29,158,117,0.1)', 'rgba(216,90,48,0.1)', 'rgba(212,83,126,0.1)'][i % 4],
    borderWidth: 2, tension: 0.4, fill: false, pointRadius: 4,
  }))

  // Mes actual vs anterior
  const mesActual = meses[meses.length - 1]
  const mesAnterior = meses[meses.length - 2]
  const totalActual = mesActual ? totalesMes[totalesMes.length - 1] : 0
  const totalAnterior = mesAnterior ? totalesMes[totalesMes.length - 2] : 0
  const diff = totalActual - totalAnterior
  const diffPct = totalAnterior > 0 ? ((diff / totalAnterior) * 100).toFixed(1) : 0

  const chartBase = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.04)' } } }
  }

  if (loading) return <p style={{ color: 'var(--text2)' }}>Cargando...</p>

  return (
    <div>
      <PageTitle title="Comparativo mensual" sub="Analiza la evolución de los gastos del hogar" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Mostrar últimos</span>
        {[3, 6, 12].map(n => (
          <button key={n} onClick={() => setNMeses(n)} style={{
            padding: '5px 14px', fontSize: 13, borderRadius: 20, cursor: 'pointer',
            border: '1px solid var(--border-strong)',
            background: nMeses === n ? 'var(--text)' : 'var(--surface)',
            color: nMeses === n ? 'var(--bg)' : 'var(--text2)',
          }}>{n} meses</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <MetricCard label={`Total ${mesActual?.label || ''}`} value={fmt(totalActual)} color="var(--accent)" />
        <MetricCard label={`Total ${mesAnterior?.label || ''}`} value={fmt(totalAnterior)} />
        <MetricCard
          label="Variación"
          value={(diff >= 0 ? '+' : '') + fmt(diff)}
          sub={`${diff >= 0 ? '↑' : '↓'} ${Math.abs(diffPct)}% vs mes anterior`}
          color={diff <= 0 ? 'var(--teal)' : 'var(--red)'}
        />
        <MetricCard label="Promedio mensual" value={fmt(totalesMes.reduce((s,v)=>s+v,0)/Math.max(nMeses,1))} />
      </div>

      <Card style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Total por mes</p>
        <div style={{ height: 220 }}>
          <Bar
            data={{
              labels: meses.map(m => m.label),
              datasets: [{
                label: 'Total gastos',
                data: totalesMes,
                backgroundColor: '#1D9E75',
                borderRadius: 6,
                borderSkipped: false,
              }]
            }}
            options={{
              ...chartBase,
              plugins: {
                ...chartBase.plugins,
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } }
              }
            }}
          />
        </div>
      </Card>

      <Card style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Por categoría (apilado)</p>
        <div style={{ height: 260 }}>
          <Bar
            data={{ labels: meses.map(m => m.label), datasets: datasetsPorCat }}
            options={{
              ...chartBase,
              plugins: { ...chartBase.plugins, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
              scales: {
                x: { stacked: true, grid: { display: false } },
                y: { stacked: true, grid: { color: 'rgba(0,0,0,0.04)' } }
              }
            }}
          />
        </div>
      </Card>

      <Card>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Aporte por persona en el tiempo</p>
        <div style={{ height: 240 }}>
          <Line
            data={{ labels: meses.map(m => m.label), datasets: datasetsPorPersona }}
            options={{
              ...chartBase,
              plugins: { ...chartBase.plugins, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } }
            }}
          />
        </div>
      </Card>
    </div>
  )
}
