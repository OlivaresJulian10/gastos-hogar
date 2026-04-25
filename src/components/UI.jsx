import { useState } from 'react'

export function Card({ children, style = {}, noPad = false }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(255,255,255,0.93)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: `1px solid rgba(255,255,255,${hovered ? '0.82' : '0.58'})`,
        borderRadius: 'var(--radius-lg)',
        padding: noPad ? 0 : '1.5rem',
        boxShadow: hovered
          ? '0 32px 80px rgba(0,0,0,0.30), 0 2px 0 rgba(255,255,255,0.75) inset'
          : '0 8px 40px rgba(0,0,0,0.20), 0 1px 0 rgba(255,255,255,0.68) inset',
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, border-color 0.25s ease',
        position: 'relative', overflow: 'hidden',
        ...style,
      }}
    >
      {hovered && (
        <div aria-hidden="true" style={{
          position: 'absolute', top: 0, left: '-80%', bottom: 0, width: '55%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)',
          animation: 'cardShimmer 0.65s ease-out forwards',
          pointerEvents: 'none', zIndex: 0,
        }} />
      )}
      {children}
    </div>
  )
}

const ACCENT_COLORS = [
  'linear-gradient(135deg, #FF6B9D 0%, #C026D3 100%)',
  'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
  'linear-gradient(135deg, #FB923C 0%, #F43F5E 100%)',
  'linear-gradient(135deg, #0EA5E9 0%, #14B8A6 100%)',
]

export function MetricCard({ label, value, sub, color, accent, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const grad = accent || ACCENT_COLORS[index % ACCENT_COLORS.length]
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: grad,
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 1.6rem',
        boxShadow: hovered
          ? '0 32px 72px rgba(0,0,0,0.40), 0 4px 0 rgba(255,255,255,0.20) inset'
          : '0 10px 44px rgba(0,0,0,0.32), 0 1px 0 rgba(255,255,255,0.14) inset',
        transform: hovered ? 'translateY(-8px) scale(1.025)' : 'translateY(0) scale(1)',
        transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.28s ease',
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.25)',
        cursor: 'default',
      }}
    >
      {/* Diagonal shimmer overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: 'inherit',
        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 45%, transparent 100%)',
      }} />
      {/* Corner glow */}
      <div style={{
        position: 'absolute', top: -50, right: -50, width: 140, height: 140,
        borderRadius: '50%', background: 'rgba(255,255,255,0.26)', filter: 'blur(26px)',
        pointerEvents: 'none',
      }} />
      {/* Bottom decorative circle */}
      <div style={{
        position: 'absolute', bottom: -30, left: -20, width: 90, height: 90,
        borderRadius: '50%', background: 'rgba(0,0,0,0.08)', filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />
      <p style={{
        fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.70)',
        letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 14,
        position: 'relative',
      }}>
        {label}
      </p>
      <p style={{
        fontSize: 30, fontWeight: 700, color: 'white',
        fontFamily: "'Playfair Display', serif",
        letterSpacing: '-1px', lineHeight: 1.0,
        position: 'relative',
        textShadow: '0 2px 18px rgba(0,0,0,0.20)',
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.62)', marginTop: 9, fontWeight: 500, position: 'relative' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

export function PageTitle({ title, sub, action }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 style={{
            fontSize: 34, fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            letterSpacing: '-0.8px', lineHeight: 1.15,
            background: 'linear-gradient(135deg, #FFFFFF 0%, #EDE9FE 55%, #F5D0FE 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {title}
          </h1>
          {sub && (
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', marginTop: 6, fontWeight: 500, letterSpacing: '0.1px' }}>
              {sub}
            </p>
          )}
          {/* Accent line */}
          <div style={{
            marginTop: 14, height: 3, width: 52,
            background: 'linear-gradient(90deg,#FF6B9D,#F0ABFC)',
            borderRadius: 99,
            boxShadow: '0 0 12px rgba(255,107,157,0.6)',
          }} />
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
    </div>
  )
}

export function Badge({ label, cat }) {
  const catColors = {
    mercado:        { bg: 'rgba(217,70,168,0.08)',  color: '#B02A8A', icon: '🛒' },
    servicios:      { bg: 'rgba(99,102,241,0.08)',  color: '#4F46E5', icon: '💡' },
    internet:       { bg: 'rgba(168,85,247,0.08)',  color: '#7C3AED', icon: '📶' },
    arriendo:       { bg: 'rgba(245,158,11,0.1)',   color: '#B45309', icon: '🏠' },
    aseo:           { bg: 'rgba(20,184,166,0.08)',  color: '#0F766E', icon: '🧹' },
    transporte:     { bg: 'rgba(236,72,153,0.08)',  color: '#9D174D', icon: '🚌' },
    paseo:          { bg: 'rgba(249,115,22,0.08)',  color: '#C2410C', icon: '🎯' },
    restaurante:    { bg: 'rgba(244,63,94,0.08)',   color: '#BE123C', icon: '🍽️' },
    salud:          { bg: 'rgba(20,184,166,0.08)',  color: '#0F766E', icon: '🏥' },
    ropa:           { bg: 'rgba(168,85,247,0.08)',  color: '#7C3AED', icon: '👕' },
    educacion:      { bg: 'rgba(99,102,241,0.08)',  color: '#4338CA', icon: '📚' },
    entretenimiento:{ bg: 'rgba(251,146,60,0.08)',  color: '#C2410C', icon: '🎬' },
    mascotas:       { bg: 'rgba(236,72,153,0.08)',  color: '#9D174D', icon: '🐾' },
    otros:          { bg: 'rgba(148,163,184,0.1)',  color: '#475569', icon: '📦' },
  }
  const c = catColors[cat] || catColors.otros
  return (
    <span style={{
      fontSize: 11, padding: '3px 10px', borderRadius: 20,
      background: c.bg, color: c.color,
      fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.2px',
      border: `1px solid ${c.color}22`,
    }}>
      {c.icon} {label}
    </span>
  )
}

const AVATAR_GRADS = [
  'linear-gradient(135deg,#FF6B9D,#C026D3)',
  'linear-gradient(135deg,#14B8A6,#6366F1)',
  'linear-gradient(135deg,#FB923C,#F43F5E)',
  'linear-gradient(135deg,#EC4899,#8B5CF6)',
  'linear-gradient(135deg,#A855F7,#6366F1)',
  'linear-gradient(135deg,#F59E0B,#FB923C)',
]

export function Avatar({ nombre, index, size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: AVATAR_GRADS[index % AVATAR_GRADS.length],
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color: 'white',
      flexShrink: 0, letterSpacing: '0.5px',
      boxShadow: `0 4px 18px rgba(168,85,247,0.40), 0 0 0 2.5px rgba(255,255,255,0.90)`,
      textShadow: '0 1px 4px rgba(0,0,0,0.25)',
    }}>
      {(nombre || '?').slice(0, 2).toUpperCase()}
    </div>
  )
}

export const fmt = (n) => '$' + Math.round(n).toLocaleString('es-CO')

export const CATEGORIAS = [
  'mercado','servicios','internet','arriendo','aseo',
  'transporte','paseo','restaurante','salud','ropa',
  'educacion','entretenimiento','mascotas','otros',
]

export const CAT_CHART_COLORS = [
  '#FF6B9D','#6366F1','#A855F7','#F59E0B',
  '#14B8A6','#EC4899','#FB923C','#94A3B8',
  '#F43F5E','#C026D3','#0EA5E9','#10B981',
  '#8B5CF6','#64748B',
]
