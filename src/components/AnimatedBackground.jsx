const BUBBLES = [
  {
    w: 320, h: 320, pos: { top: -100, left: -80 },
    bg: 'radial-gradient(circle, rgba(168,85,247,0.30) 0%, rgba(168,85,247,0.08) 50%, transparent 70%)',
    anim: 'floatBubble1 15s ease-in-out 0s infinite',
  },
  {
    w: 260, h: 260, pos: { top: -60, right: -70 },
    bg: 'radial-gradient(circle, rgba(255,107,157,0.26) 0%, rgba(255,107,157,0.07) 50%, transparent 70%)',
    anim: 'floatBubble2 12s ease-in-out 0s infinite',
  },
  {
    w: 220, h: 220, pos: { top: '38%', left: -60 },
    bg: 'radial-gradient(circle, rgba(251,146,60,0.22) 0%, rgba(251,146,60,0.06) 50%, transparent 70%)',
    anim: 'floatBubble3 17s ease-in-out 0s infinite',
  },
  {
    w: 380, h: 380, pos: { bottom: -110, right: -90 },
    bg: 'radial-gradient(circle, rgba(217,70,168,0.25) 0%, rgba(217,70,168,0.07) 50%, transparent 70%)',
    anim: 'floatBubble4 14s ease-in-out 0s infinite',
  },
  {
    w: 180, h: 180, pos: { top: '55%', left: '50%' },
    bg: 'radial-gradient(circle, rgba(236,72,153,0.20) 0%, rgba(236,72,153,0.05) 50%, transparent 70%)',
    anim: 'floatBubble5 10s ease-in-out 1s infinite',
  },
  {
    w: 230, h: 230, pos: { bottom: '20%', left: '18%' },
    bg: 'radial-gradient(circle, rgba(139,92,246,0.22) 0%, rgba(139,92,246,0.06) 50%, transparent 70%)',
    anim: 'floatBubble1 19s ease-in-out 3s infinite',
  },
  {
    w: 150, h: 150, pos: { top: '20%', right: '18%' },
    bg: 'radial-gradient(circle, rgba(251,113,133,0.22) 0%, rgba(251,113,133,0.06) 50%, transparent 70%)',
    anim: 'floatBubble2 11s ease-in-out 2s infinite',
  },
  {
    w: 120, h: 120, pos: { top: '70%', right: '35%' },
    bg: 'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)',
    anim: 'floatBubble3 9s ease-in-out 4s infinite',
  },
]

export default function AnimatedBackground() {
  return (
    <div className="bubble-layer" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <div
          key={i}
          className="bubble"
          style={{
            width: b.w,
            height: b.h,
            ...b.pos,
            background: b.bg,
            animation: b.anim,
          }}
        />
      ))}
    </div>
  )
}
