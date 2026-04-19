import { useState } from 'react'

export function Card({ children, style = {} }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: hovered ? 'var(--shadow-hover)' : 'var(--shadow)',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.28s ease',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function MetricCard({ label, value, sub, color, accent }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem 1.25rem 1.1rem',
        boxShadow: hovered ? 'var(--shadow-hover)' : 'var(--shadow)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: accent || 'var(--grad-primary)',
        borderRadius: '18px 18px 0 0',
      }} />
      <div style={{
        fontSize: 10,
        color: 'var(--text3)',
        marginBottom: 8,
        fontWeight: 700,
        letterSpacing: '1px',
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 26,
        fontWeight: 700,
        color: color || 'var(--text)',
        fontFamily: "'Playfair Display', serif",
        letterSpacing: '-0.5px',
        lineHeight: 1.1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 5, fontWeight: 500 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

export function PageTitle({ title, sub }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h1 style={{
        fontSize: 30,
        fontWeight: 700,
        fontFamily: "'Playfair Display', serif",
        letterSpacing: '-0.5px',
        background: 'linear-gradient(135deg, #2A1040 30%, #A855F7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        lineHeight: 1.2,
      }}>
        {title}
      </h1>
      {sub && (
        <p style={{
          fontSize: 14,
          color: 'var(--text2)',
          marginTop: 7,
          fontWeight: 500,
        }}>
          {sub}
        </p>
      )}
    </div>
  )
}

export function Badge({ label, cat }) {
  const catColors = {
    mercado:    { bg: '#FFF0F7', color: '#D946A8' },
    servicios:  { bg: '#EEF2FF', color: '#6366F1' },
    internet:   { bg: '#FAF5FF', color: '#A855F7' },
    arriendo:   { bg: '#FFFBEB', color: '#D97706' },
    aseo:       { bg: '#F0FDFA', color: '#14B8A6' },
    transporte: { bg: '#FDF2F8', color: '#EC4899' },
    paseo:      { bg: '#FFF3EB', color: '#F97316' },
    otros:      { bg: '#F8FAFC', color: '#64748B' },
  }
  const c = catColors[cat] || catColors.otros
  return (
    <span style={{
      fontSize: 11,
      padding: '3px 10px',
      borderRadius: 20,
      background: c.bg,
      color: c.color,
      fontWeight: 700,
      whiteSpace: 'nowrap',
      letterSpacing: '0.2px',
    }}>
      {label}
    </span>
  )
}

export function Avatar({ nombre, index }) {
  const gradients = [
    'linear-gradient(135deg, #FF6B9D, #A855F7)',
    'linear-gradient(135deg, #14B8A6, #6366F1)',
    'linear-gradient(135deg, #FB923C, #F43F5E)',
    'linear-gradient(135deg, #EC4899, #8B5CF6)',
  ]
  return (
    <div style={{
      width: 38,
      height: 38,
      borderRadius: '50%',
      background: gradients[index % 4],
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 700,
      color: 'white',
      flexShrink: 0,
      boxShadow: '0 2px 10px rgba(168, 85, 247, 0.3)',
      letterSpacing: '0.5px',
    }}>
      {(nombre || '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

export const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CO')

export const CATEGORIAS = [
  'mercado', 'servicios', 'internet', 'arriendo', 'aseo', 'transporte', 'paseo', 'otros'
]

export const CAT_CHART_COLORS = [
  '#FF6B9D',
  '#6366F1',
  '#A855F7',
  '#F59E0B',
  '#14B8A6',
  '#EC4899',
  '#FB923C',
  '#94A3B8',
]
