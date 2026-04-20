import { useEffect, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, MetricCard, PageTitle, fmt, CATEGORIAS, CAT_CHART_COLORS } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const mesActual = format(new Date(), 'yyyy-MM')
const PERSONA_COLORS = ['#FF6B9D', '#A855F7', '#FB923C', '#EC4899']

export default function Dashboard() {
  const { user } = useAuth()
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [presupuestoHogar, setPresupuestoHogar] = useState(0)
  const [presupuestosPersonales, setPresupuestosPersonales] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const queries = [
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('personas').select('*'),
        supabase.from('presupuestos_hogar').select('monto').eq('mes', mesActual).maybeSingle(),
      ]
      if (user) {
        queries.push(
          supabase.from('presupuestos_personales').select('*').eq('mes', mesActual).eq('usuario_id', user.id)
        )
      }
      const results = await Promise.all(queries)
      setGastos(results[0].data || [])
      setPersonas(results[1].data || [])
      setPresupuestoHogar(results[2].data?.monto ? parseFloat(results[2].data.monto) : 0)
      if (user) setPresupuestosPersonales(results[3].data || [])
      setLoading(false)
    }
    cargar()
  }, [user])

  if (loading) return (
    <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18 }}>✦</span> Cargando...
    </p>
  )

  const gastosMes = gastos.filter(g => g.mes === mesActual)
  const totalMes = gastosMes.reduce((s, g) => s + Number(g.monto), 0)
  const totalTotal = gastos.reduce((s, g) => s + Number(g.monto), 0)

  const presupuesto = presupuestoHogar
  const pctUsado = presupuesto > 0 ? Math.min((totalMes / presupuesto) * 100, 100) : 0
  const pctRestante = presupuesto > 0 ? Math.max(((presupuesto - totalMes) / presupuesto) * 100, 0) : 0
  const excedido = presupuesto > 0 && totalMes > presupuesto
  const barColor = excedido ? '#F43F5E' : pctRestante > 50 ? '#14B8A6' : pctRestante > 25 ? '#F59E0B' : '#F43F5E'
  const barLabel = excedido
    ? `¡Excedido por ${fmt(totalMes - presupuesto)}!`
    : pctRestante > 50 ? 'En buen camino ✦'
    : pctRestante > 25 ? 'Ojo con el presupuesto'
    : 'Presupuesto casi agotado'

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

      {presupuesto > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
          marginBottom: '1.25rem', boxShadow: 'var(--shadow)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                Presupuesto del mes
              </span>
              <div style={{ fontSize: 13, color: barColor, fontWeight: 700, marginTop: 3 }}>{barLabel}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: barColor }}>
                {fmt(totalMes)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 6 }}>/ {fmt(presupuesto)}</span>
            </div>
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${pctUsado}%`,
              height: '100%',
              borderRadius: 99,
              background: excedido
                ? '#F43F5E'
                : pctRestante > 50
                ? 'linear-gradient(90deg,#14B8A6,#6366F1)'
                : pctRestante > 25
                ? 'linear-gradient(90deg,#F59E0B,#FB923C)'
                : 'linear-gradient(90deg,#F43F5E,#EC4899)',
              transition: 'width 0.6s cubic-bezier(0.34,1.56,0.64,1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>{Math.round(pctUsado)}% usado</span>
            <span style={{ fontSize: 11, color: excedido ? '#F43F5E' : 'var(--text3)' }}>
              {excedido ? `Excedido ${fmt(totalMes - presupuesto)}` : `Disponible ${fmt(presupuesto - totalMes)}`}
            </span>
          </div>
        </div>
      )}
      {presupuesto === 0 && (
        <a href="/presupuesto" style={{
          display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
          background: 'var(--accent-bg)', border: '1px dashed var(--accent)',
          borderRadius: 'var(--radius-lg)', padding: '0.875rem 1.25rem',
          marginBottom: '1.25rem', color: 'var(--accent-text)', fontSize: 13, fontWeight: 600,
        }}>
          <span style={{ fontSize: 18 }}>◐</span>
          Define un presupuesto para este mes y controla tus gastos →
        </a>
      )}

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

      {presupuestosPersonales.length > 0 && (
        <Card style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: '1rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
            Mi presupuesto personal — {format(new Date(), 'MMMM yyyy', { locale: es })}
          </p>
          {presupuestosPersonales.map((pp, idx) => {
            const totalPP = presupuestosPersonales.reduce((s, x) => s + Number(x.monto), 0)
            if (idx > 0) return null
            return (
              <div key="pp-summary">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>
                    {presupuestosPersonales.length} {presupuestosPersonales.length === 1 ? 'partida' : 'partidas'}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: 700, fontFamily: "'Playfair Display', serif", background: 'var(--grad-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    {fmt(totalPP)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {presupuestosPersonales.map(p => (
                    <div key={p.id} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: 'var(--accent-bg)', color: 'var(--accent-text)',
                      border: '1px solid rgba(168,85,247,0.2)',
                    }}>
                      {p.descripcion} · {fmt(p.monto)}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </Card>
      )}

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
