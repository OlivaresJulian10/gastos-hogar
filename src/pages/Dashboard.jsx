import { useEffect, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { Card, MetricCard, PageTitle, fmt, CATEGORIAS, CAT_CHART_COLORS } from '../components/UI'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const mesActual = format(new Date(), 'yyyy-MM')

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

  if (loading) return <p style={{ color: 'var(--text2)' }}>Cargando...</p>

  const gastosMes = gastos.filter(g => g.mes === mesActual)
  const totalMes = gastosMes.reduce((s, g) => s + Number(g.monto), 0)
  const totalTotal = gastos.reduce((s, g) => s + Number(g.monto), 0)

  // Gastos por categoría (mes actual)
  const porCategoria = CATEGORIAS.map(cat =>
    gastosMes.filter(g => g.categoria === cat).reduce((s, g) => s + Number(g.monto), 0)
  )

  // Últimos 6 meses
  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i)
    return format(d, 'yyyy-MM')
  })
  const totalesPorMes = ultimos6.map(m =>
    gastos.filter(g => g.mes === m).reduce((s, g) => s + Number(g.monto), 0)
  )
  const etiquetasMeses = ultimos6.map(m => format(new Date(m + '-01'), 'MMM', { locale: es }))

  // Por persona este mes
  const pagosPorPersona = personas.map(p =>
    gastosMes.filter(g => g.pagado_por === p.id).reduce((s, g) => s + Number(g.monto), 0)
  )

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } }
  }

  return (
    <div>
      <PageTitle title="Dashboard" sub={`Mes actual: ${format(new Date(), 'MMMM yyyy', { locale: es })}`} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 12, marginBottom: '1.5rem' }}>
        <MetricCard label="Total este mes" value={fmt(totalMes)} color="var(--accent)" />
        <MetricCard label="Gastos registrados" value={gastosMes.length} />
        <MetricCard label="Total histórico" value={fmt(totalTotal)} />
        <MetricCard label="Promedio por persona" value={fmt(totalMes / Math.max(personas.length, 1))} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <Card>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Gastos por categoría (mes actual)</p>
          <div style={{ height: 220 }}>
            <Doughnut
              data={{
                labels: CATEGORIAS,
                datasets: [{
                  data: porCategoria,
                  backgroundColor: CAT_CHART_COLORS,
                  borderWidth: 0,
                  hoverOffset: 4,
                }]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'right', labels: { font: { size: 11 }, boxWidth: 12, padding: 10 } }
                }
              }}
            />
          </div>
        </Card>

        <Card>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Tendencia últimos 6 meses</p>
          <div style={{ height: 220 }}>
            <Line
              data={{
                labels: etiquetasMeses,
                datasets: [{
                  data: totalesPorMes,
                  borderColor: '#1D9E75',
                  backgroundColor: 'rgba(29,158,117,0.08)',
                  borderWidth: 2,
                  fill: true,
                  tension: 0.4,
                  pointRadius: 4,
                  pointBackgroundColor: '#1D9E75',
                }]
              }}
              options={chartOpts}
            />
          </div>
        </Card>
      </div>

      <Card>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>¿Quién pagó este mes?</p>
        <div style={{ height: 180 }}>
          <Bar
            data={{
              labels: personas.map(p => p.nombre),
              datasets: [{
                data: pagosPorPersona,
                backgroundColor: ['#7C6FE0', '#1D9E75', '#D85A30', '#D4537E'],
                borderRadius: 6,
                borderSkipped: false,
              }]
            }}
            options={{
              ...chartOpts,
              plugins: { legend: { display: false }, tooltip: {
                callbacks: { label: ctx => fmt(ctx.raw) }
              }}
            }}
          />
        </div>
      </Card>

      <Card style={{ marginTop: '1rem' }}>
        <p style={{ fontSize: 13, fontWeight: 500, marginBottom: '1rem', color: 'var(--text2)' }}>Últimos 5 gastos</p>
        {gastos.slice(0, 5).map(g => {
          const persona = personas.find(p => p.id === g.pagado_por)
          return (
            <div key={g.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: '1px solid var(--border)'
            }}>
              <div>
                <p style={{ fontSize: 14 }}>{g.descripcion}</p>
                <p style={{ fontSize: 12, color: 'var(--text2)' }}>{g.fecha} · {persona?.nombre || '—'} · {g.categoria}</p>
              </div>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{fmt(g.monto)}</span>
            </div>
          )
        })}
        {gastos.length === 0 && <p style={{ color: 'var(--text3)', fontSize: 14 }}>Aún no hay gastos registrados.</p>}
      </Card>
    </div>
  )
}
