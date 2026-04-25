import { useEffect, useState } from 'react'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, MetricCard, PageTitle, Avatar, Badge, fmt, CATEGORIAS, CAT_CHART_COLORS } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const mesActual = format(new Date(), 'yyyy-MM')
const PERSONA_COLORS = ['#FF6B9D','#A855F7','#FB923C','#14B8A6','#6366F1','#F43F5E']

function Greeting({ nombre }) {
  const h = new Date().getHours()
  const saludo = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  const dia = format(new Date(), "EEEE d 'de' MMMM", { locale: es })
  return (
    <span>
      <span style={{ color: 'var(--text3)' }}>{saludo},</span>{' '}
      <strong style={{ color: 'var(--text)' }}>{nombre?.split(' ')[0] || 'bienvenido'}</strong>
      <br />
      <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, textTransform: 'capitalize' }}>{dia}</span>
    </span>
  )
}

export default function Dashboard() {
  const { user, perfil } = useAuth()
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [presupuestoHogar, setPresupuestoHogar] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function cargar() {
      const [g, p, ph] = await Promise.all([
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('personas').select('*'),
        supabase.from('presupuestos_hogar').select('monto').eq('mes', mesActual).maybeSingle(),
      ])
      setGastos(g.data || [])
      setPersonas(p.data || [])
      setPresupuestoHogar(ph.data?.monto ? parseFloat(ph.data.monto) : 0)
      setLoading(false)
    }
    cargar()
  }, [user])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '3rem 0', color: 'var(--text3)' }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid rgba(168,85,247,0.3)', borderTopColor: '#A855F7', animation: 'spin 0.8s linear infinite' }} />
      Cargando dashboard...
    </div>
  )

  const gastosMes   = gastos.filter(g => g.mes === mesActual)
  const gastosMesAnt = gastos.filter(g => g.mes === format(subMonths(new Date(), 1), 'yyyy-MM'))
  const totalMes    = gastosMes.reduce((s, g) => s + Number(g.monto), 0)
  const totalAnt    = gastosMesAnt.reduce((s, g) => s + Number(g.monto), 0)
  const totalTotal  = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const variacion   = totalAnt > 0 ? Math.round(((totalMes - totalAnt) / totalAnt) * 100) : null

  const presupuesto  = presupuestoHogar
  const pctUsado     = presupuesto > 0 ? Math.min((totalMes / presupuesto) * 100, 100) : 0
  const pctRestante  = presupuesto > 0 ? Math.max(((presupuesto - totalMes) / presupuesto) * 100, 0) : 0
  const excedido     = presupuesto > 0 && totalMes > presupuesto
  const barColor     = excedido ? '#F43F5E' : pctRestante > 50 ? '#14B8A6' : pctRestante > 25 ? '#F59E0B' : '#F43F5E'
  const barLabel     = excedido ? `¡Excedido ${fmt(totalMes - presupuesto)}!`
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
  const totalesPorMes   = ultimos6.map(m => gastos.filter(g => g.mes === m).reduce((s, g) => s + Number(g.monto), 0))
  const etiquetasMeses  = ultimos6.map(m => format(new Date(m + '-02'), 'MMM', { locale: es }))
  const pagosPorPersona = personas.map(p =>
    gastosMes.filter(g => g.pagado_por === p.id).reduce((s, g) => s + Number(g.monto), 0)
  )

  const tickStyle = { color: '#A88AB8', font: { family: 'Nunito', size: 11 } }
  const gridColor = 'rgba(168,85,247,0.06)'
  const chartBase = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) } } },
    scales: {
      x: { grid: { display: false }, ticks: tickStyle, border: { display: false } },
      y: { grid: { color: gridColor }, ticks: tickStyle, border: { display: false } }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Banner de bienvenida ── */}
      <div style={{
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderRadius: 24, padding: '1.5rem 2rem',
        boxShadow: '0 4px 24px rgba(168,85,247,0.08)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow decoration */}
        <div style={{ position: 'absolute', top: -40, right: 80, width: 180, height: 180, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(255,107,157,0.12),rgba(168,85,247,0.08))', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'linear-gradient(135deg,rgba(168,85,247,0.1),rgba(99,102,241,0.07))', filter: 'blur(24px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.6, marginBottom: 6 }}>
            <Greeting nombre={perfil?.nombre} />
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, background: 'rgba(168,85,247,0.08)', color: 'var(--purple)', border: '1px solid rgba(168,85,247,0.15)' }}>
              {gastosMes.length} gastos este mes
            </span>
            {variacion !== null && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20,
                background: variacion > 0 ? 'rgba(244,63,94,0.08)' : 'rgba(20,184,166,0.08)',
                color: variacion > 0 ? 'var(--red)' : 'var(--teal)',
                border: `1px solid ${variacion > 0 ? 'rgba(244,63,94,0.15)' : 'rgba(20,184,166,0.15)'}`,
              }}>
                {variacion > 0 ? '↑' : '↓'} {Math.abs(variacion)}% vs mes anterior
              </span>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'right', position: 'relative', flexShrink: 0 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1.4px', textTransform: 'uppercase', marginBottom: 4 }}>
            Total este mes
          </p>
          <p style={{
            fontSize: 36, fontWeight: 700, lineHeight: 1,
            fontFamily: "'Playfair Display', serif", letterSpacing: '-1px',
            background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {fmt(totalMes)}
          </p>
          {presupuesto > 0 && (
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontWeight: 500 }}>
              de {fmt(presupuesto)} presupuestados
            </p>
          )}
        </div>
      </div>

      {/* ── Barra de presupuesto ── */}
      {presupuesto > 0 ? (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Presupuesto del mes</p>
              <p style={{ fontSize: 13, color: barColor, fontWeight: 700 }}>{barLabel}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: barColor }}>{fmt(totalMes)}</span>
              <span style={{ fontSize: 13, color: 'var(--text3)', marginLeft: 6 }}>/ {fmt(presupuesto)}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(168,85,247,0.07)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              width: `${pctUsado}%`, height: '100%', borderRadius: 99,
              background: excedido ? '#F43F5E'
                : pctRestante > 50 ? 'linear-gradient(90deg,#14B8A6,#6366F1)'
                : pctRestante > 25 ? 'linear-gradient(90deg,#F59E0B,#FB923C)'
                : 'linear-gradient(90deg,#F43F5E,#EC4899)',
              transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
              boxShadow: `0 0 12px ${barColor}55`,
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7 }}>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{Math.round(pctUsado)}% usado</span>
            <span style={{ fontSize: 11, color: excedido ? '#F43F5E' : 'var(--text3)', fontWeight: 600 }}>
              {excedido ? `+${fmt(totalMes - presupuesto)} excedido` : `${fmt(presupuesto - totalMes)} disponible`}
            </span>
          </div>
        </Card>
      ) : (
        <a href="/presupuesto" style={{
          display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
          background: 'rgba(192,38,211,0.05)', border: '1.5px dashed rgba(192,38,211,0.3)',
          borderRadius: 20, padding: '1rem 1.5rem',
          color: 'var(--accent-text)', fontSize: 13.5, fontWeight: 600,
          transition: 'background 0.18s',
        }}>
          <span style={{ fontSize: 22 }}>◐</span>
          <div>
            <p style={{ fontWeight: 700 }}>Sin presupuesto definido</p>
            <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, fontWeight: 500 }}>Toca aquí para configurar el presupuesto del mes →</p>
          </div>
        </a>
      )}

      {/* ── KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 14 }}>
        <MetricCard index={0} label="Total este mes"       value={fmt(totalMes)}   color="var(--accent)" />
        <MetricCard index={1} label="Gastos registrados"   value={gastosMes.length} />
        <MetricCard index={2} label="Total histórico"      value={fmt(totalTotal)} />
        <MetricCard index={3} label="Promedio / persona"   value={fmt(totalMes / Math.max(personas.length, 1))} />
      </div>

      {/* ── Gráficas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <Card>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Por categoría — mes actual
          </p>
          <div style={{ height: 220 }}>
            <Doughnut
              data={{
                labels: CATEGORIAS,
                datasets: [{
                  data: porCategoria, backgroundColor: CAT_CHART_COLORS,
                  borderWidth: 2, borderColor: 'rgba(255,255,255,0.8)', hoverOffset: 8,
                }]
              }}
              options={{
                responsive: true, maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                  legend: { position: 'right', labels: { font: { size: 10.5, family: 'Nunito' }, boxWidth: 9, padding: 9, color: '#6B4A80' } },
                  tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` } }
                }
              }}
            />
          </div>
        </Card>

        <Card>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Tendencia — últimos 6 meses
          </p>
          <div style={{ height: 220 }}>
            <Line
              data={{
                labels: etiquetasMeses,
                datasets: [{
                  data: totalesPorMes,
                  borderColor: '#C026D3', borderWidth: 2.5,
                  backgroundColor: 'rgba(192,38,211,0.07)',
                  fill: true, tension: 0.45,
                  pointRadius: 5,
                  pointBackgroundColor: '#FF6B9D',
                  pointBorderColor: 'white', pointBorderWidth: 2,
                  pointHoverRadius: 7,
                }]
              }}
              options={chartBase}
            />
          </div>
        </Card>
      </div>

      {/* ── ¿Quién pagó? ── */}
      <Card>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '1rem' }}>
          ¿Quién pagó este mes?
        </p>
        <div style={{ height: 180 }}>
          <Bar
            data={{
              labels: personas.map(p => p.nombre.split(' ')[0]),
              datasets: [{
                data: pagosPorPersona,
                backgroundColor: PERSONA_COLORS.map(c => c + 'CC'),
                borderColor: PERSONA_COLORS,
                borderWidth: 1.5,
                borderRadius: 10,
                borderSkipped: false,
              }]
            }}
            options={chartBase}
          />
        </div>
      </Card>

      {/* ── Últimos gastos ── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Últimos gastos
          </p>
          <a href="/historial" style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 700, textDecoration: 'none', opacity: 0.85 }}>
            Ver historial →
          </a>
        </div>
        {gastos.length === 0 ? (
          <p style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
            Aún no hay gastos registrados ✦
          </p>
        ) : gastos.slice(0, 6).map((g, idx) => {
          const persona = personas.find(p => p.id === g.pagado_por)
          const pIdx    = personas.findIndex(p => p.id === g.pagado_por)
          return (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'center', gap: 13,
              padding: '11px 0',
              borderBottom: idx < Math.min(gastos.length, 6) - 1 ? '1px solid rgba(168,85,247,0.07)' : 'none',
              transition: 'background 0.15s',
            }}>
              <Avatar nombre={persona?.nombre} index={pIdx >= 0 ? pIdx : 0} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {g.descripcion}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11.5, color: 'var(--text3)', fontWeight: 500 }}>{g.fecha}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', opacity: 0.6 }}>·</span>
                  <span style={{ fontSize: 11.5, color: 'var(--text2)', fontWeight: 600 }}>{persona?.nombre?.split(' ')[0] || '—'}</span>
                  <Badge label={g.categoria} cat={g.categoria} />
                </div>
              </div>
              <span style={{
                fontWeight: 700, fontSize: 15, flexShrink: 0,
                background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {fmt(g.monto)}
              </span>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
