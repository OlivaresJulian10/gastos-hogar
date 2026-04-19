// Reusable UI components

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '1.25rem',
      boxShadow: 'var(--shadow)', ...style
    }}>
      {children}
    </div>
  )
}

export function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: 'var(--radius)',
      padding: '1rem 1.25rem',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || 'var(--text)' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function PageTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.3px' }}>{title}</h1>
      {sub && <p style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

export function Badge({ label, cat }) {
  const catColors = {
    mercado:    { bg: 'var(--teal-bg)',   color: 'var(--teal)' },
    servicios:  { bg: 'var(--blue-bg)',   color: 'var(--blue)' },
    internet:   { bg: 'var(--purple-bg)', color: 'var(--purple)' },
    arriendo:   { bg: 'var(--amber-bg)',  color: 'var(--amber)' },
    aseo:       { bg: 'var(--teal-bg)',   color: 'var(--teal)' },
    transporte: { bg: 'var(--pink-bg)',   color: 'var(--pink)' },
    otros:      { bg: 'var(--gray-bg)',   color: 'var(--gray)' },
  }
  const c = catColors[cat] || catColors.otros
  return (
    <span style={{
      fontSize: 11, padding: '3px 9px', borderRadius: 20,
      background: c.bg, color: c.color, fontWeight: 500, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export function Avatar({ nombre, index }) {
  const colors = [
    { bg: 'var(--purple-bg)', color: 'var(--purple)' },
    { bg: 'var(--teal-bg)',   color: 'var(--teal)' },
    { bg: 'var(--amber-bg)',  color: 'var(--amber)' },
    { bg: 'var(--coral-bg)',  color: 'var(--coral)' },
  ]
  const c = colors[index % 4]
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: c.bg, color: c.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 600, flexShrink: 0,
    }}>
      {(nombre || '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

export const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CO')

export const CATEGORIAS = [
  'mercado', 'servicios', 'internet', 'arriendo', 'aseo', 'transporte', 'otros'
]

export const CAT_CHART_COLORS = [
  '#1D9E75', '#185FA5', '#534AB7', '#D85A30', '#0F6E56', '#993556', '#888780'
]
