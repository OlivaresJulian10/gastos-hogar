import { useEffect, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { Card, MetricCard, PageTitle, fmt, CATEGORIAS, CAT_CHART_COLORS } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const mesActual = format(new Date(), 'yyyy-MM')
const PERSONA_COLORS = ['#FF6B9D', '#A855F7', '#FB923C', '#EC4899']

export default function Dashboard() {
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [{ data: g }, { data: p }] = await Promise.all([
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('personas').select('*')
      ])
      setGastos(g || [])
      setPersonas(p || [])
      setLoading(false)
    }
    cargar()
  }, [])

  if (loading) return (
    <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18 }}>✦</span> Cargando...
    </p>
  )

  const gastosMes = gastos.filter(g => g.mes === mesActual)
  const totalMes = gastosMes.reduce((s, g) => s + Number(g.monto), 0)
  const totalTotal = gastos.reduce((s, g) => s + Number(g.monto), 0)

  const porCategoria = CATEGORIAS.map(cat =>
    gastosMes.filter(g => g.categoria === cat).reduce((s, g) => s + Number(g.monto), 0)
  )

  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return format(d, 'yyyy-MM')
  })
  const totalesPorMes = ultimos6.map(m =>
    gastos.filter(g => g.mes === m).reduce((s, g) => s + Number(g.monto), 0)
  )
  const etiquetasMeses = ultimos6.map(m => format(new Date(m + '-01'), 'MMM', { locale: es }))

  const pagosPorPersona = personas.map(p =>
    gastosMes.filter(g => g.pagado_por === p.id).reduce((s, g) => s + Number(g.monto), 0)
  )

  const tickStyle = { color: '#B898B0', font: { family: 'Nunito', size: 11 } }
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle },
      y: { grid: { color: 'rgba(168,85,247,0.06)' }, ticks: tickStyle }
    }
  }

  return (
    <div>
      <PageTitle
        title="Dashboard"
        sub={`Mes actual: ${format(new Date(), 'MMMM yyyy', { locale: es })}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px,1fr))', gap: 14, marginBottom: '1.75rem' }}>
        <MetricCard label="Total este mes" value={fmt(totalMes)} color="var(--accent)" accent="var(--grad-primary)" />
        <MetricCard label="Gastos registrados" value={gastosMes.length} accent="linear-gradient(135deg,#6366F1,#A855F7)" />
        <MetricCard label="Total histórico" value={fmt(totalTotal)} accent="linear-gradient(135deg,#FB923C,#F43F5E)" />
        <MetricCard label="Promedio / persona" value={fmt(totalMes / Math.max(personas.length, 1))} accent="linear-gradient(135deg,#14B8A6,#6366F1)" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <Card>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
            Gastos por categoría — mes actual
          </p>
          <div style={{ height: 220 }}>
            <Doughnut
              data={{
                labels: CATEGORIAS,
                datasets: [{
                  data: porCategoria,
                  backgroundColor: CAT_CHART_COLORS,
                  borderWidth: 0,
                  hoverOffset: 6,
                }]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                    labels: { font: { size: 11, family: 'Nunito' }, boxWidth: 10, padding: 10, color: '#7A5070' }
                  }
                }
              }}
            />
          </div>
        </Card>

        <Card>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
            Tendencia — últimos 6 meses
          </p>
          <div style={{ height: 220 }}>
            <Line
              data={{
                labels: etiquetasMeses,
                datasets: [{
                  data: totalesPorMes,
                  borderColor: '#A855F7',
                  backgroundColor: 'rgba(168,85,247,0.08)',
                  borderWidth: 2.5,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 5,
                  pointBackgroundColor: '#FF6B9D',
                  pointBorderColor: 'white',
                  pointBorderWidth: 2,
                }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
          ¿Quién pagó este mes?
        </p>
        <div style={{ height: 180 }}>
          <Bar
            data={{
              labels: personas.map(p => p.nombre),
              datasets: [{
                data: pagosPorPersona,
                backgroundColor: PERSONA_COLORS,
                borderRadius: 8,
                borderSkipped: false,
              }]
            }}
            options={{
              ...chartOpts,
              plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } }
              }
            }}
          />
        </div>
      </Card>

      <Card>
        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
          Últimos 5 gastos
        </p>
        {gastos.slice(0, 5).map((g, idx) => {
          const persona = personas.find(p => p.id === g.pagado_por)
          return (
            <div key={g.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0',
              borderBottom: idx < Math.min(gastos.length, 5) - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 600 }}>{g.descripcion}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {g.fecha} · {persona?.nombre || '—'} · {g.categoria}
                </p>
              </div>
              <span style={{
                fontWeight: 700, fontSize: 15,
                background: 'var(--grad-primary)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                {fmt(g.monto)}
              </span>
            </div>
          )
        })}
        {gastos.length === 0 && (
          <p style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: '1.5rem', fontStyle: 'italic' }}>
            Aún no hay gastos registrados ✦
          </p>
        )}
      </Card>
    </div>
  )
}
