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

const PERSONA_COLORS = ['#FF6B9D', '#A855F7', '#FB923C', '#EC4899']
const PERSONA_BG = [
  'rgba(255,107,157,0.12)',
  'rgba(168,85,247,0.12)',
  'rgba(251,146,60,0.12)',
  'rgba(236,72,153,0.12)',
]

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

  const datasetsPorCat = CATEGORIAS.map((cat, i) => ({
    label: cat,
    data: meses.map(m =>
      gastos.filter(g => g.mes === m.key && g.categoria === cat).reduce((s, g) => s + Number(g.monto), 0)
    ),
    backgroundColor: CAT_CHART_COLORS[i],
    borderRadius: 5,
  }))

  const datasetsPorPersona = personas.map((p, i) => ({
    label: p.nombre,
    data: meses.map(m =>
      gastos.filter(g => g.mes === m.key && g.pagado_por === p.id).reduce((s, g) => s + Number(g.monto), 0)
    ),
    borderColor: PERSONA_COLORS[i % 4],
    backgroundColor: PERSONA_BG[i % 4],
    borderWidth: 2.5,
    tension: 0.4,
    fill: false,
    pointRadius: 5,
    pointBackgroundColor: PERSONA_COLORS[i % 4],
    pointBorderColor: 'white',
    pointBorderWidth: 2,
  }))

  const mesActual = meses[meses.length - 1]
  const mesAnterior = meses[meses.length - 2]
  const totalActual = mesActual ? totalesMes[totalesMes.length - 1] : 0
  const totalAnterior = mesAnterior ? totalesMes[totalesMes.length - 2] : 0
  const diff = totalActual - totalAnterior
  const diffPct = totalAnterior > 0 ? ((diff / totalAnterior) * 100).toFixed(1) : 0

  const tickStyle = { color: '#B898B0', font: { family: 'Nunito', size: 11 } }
  const chartBase = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { font: { size: 11, family: 'Nunito' }, boxWidth: 10, padding: 12, color: '#7A5070' }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle },
      y: { grid: { color: 'rgba(168,85,247,0.06)' }, ticks: tickStyle }
    }
  }

  if (loading) return (
    <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18 }}>✦</span> Cargando...
    </p>
  )

  return (
    <div>
      <PageTitle title="Comparativo mensual" sub="Analiza la evolución de los gastos del hogar" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Últimos</span>
        {[3, 6, 12].map(n => (
          <button key={n} onClick={() => setNMeses(n)} style={{
            padding: '7px 18px', fontSize: 13, borderRadius: 22, cursor: 'pointer',
            border: nMeses === n ? 'none' : '1.5px solid var(--border-strong)',
            background: nMeses === n
              ? 'linear-gradient(135deg, #FF6B9D 0%, #A855F7 100%)'
              : 'var(--surface)',
            color: nMeses === n ? 'white' : 'var(--text2)',
            fontWeight: 700,
            boxShadow: nMeses === n ? '0 4px 16px rgba(168,85,247,0.3)' : 'none',
            transition: 'all 0.2s',
            fontFamily: 'var(--font)',
          }}>
            {n} meses
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 14, marginBottom: '1.75rem' }}>
        <MetricCard label={`Total ${mesActual?.label || ''}`} value={fmt(totalActual)} color="var(--accent)" accent="var(--grad-primary)" />
        <MetricCard label={`Total ${mesAnterior?.label || ''}`} value={fmt(totalAnterior)} accent="linear-gradient(135deg,#6366F1,#A855F7)" />
        <MetricCard
          label="Variación"
          value={(diff >= 0 ? '+' : '') + fmt(diff)}
          sub={`${diff >= 0 ? '↑' : '↓'} ${Math.abs(diffPct)}% vs mes anterior`}
          color={diff <= 0 ? 'var(--teal)' : 'var(--red)'}
          accent={diff <= 0 ? 'linear-gradient(135deg,#14B8A6,#6366F1)' : 'linear-gradient(135deg,#F43F5E,#FB923C)'}
        />
        <MetricCard
          label="Promedio mensual"
          value={fmt(totalesMes.reduce((s, v) => s + v, 0) / Math.max(nMeses, 1))}
          accent="linear-gradient(135deg,#FB923C,#F43F5E)"
        />
      </div>

      <Card style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
          Total por mes
        </p>
        <div style={{ height: 220 }}>
          <Bar
            data={{
              labels: meses.map(m => m.label),
              datasets: [{
                label: 'Total gastos',
                data: totalesMes,
                backgroundColor: CAT_CHART_COLORS[0],
                borderRadius: 8,
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

      <Card style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
          Por categoría (apilado)
        </p>
        <div style={{ height: 260 }}>
          <Bar
            data={{ labels: meses.map(m => m.label), datasets: datasetsPorCat }}
            options={{
              ...chartBase,
              plugins: { ...chartBase.plugins, tooltip: { callbacks: { label: ctx => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
              scales: {
                x: { stacked: true, grid: { display: false }, ticks: tickStyle },
                y: { stacked: true, grid: { color: 'rgba(168,85,247,0.06)' }, ticks: tickStyle }
              }
            }}
          />
        </div>
      </Card>

      <Card>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
          Aporte por persona en el tiempo
        </p>
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
