const BUBBLES = [
  {
    w: 1000, h: 1000, pos: { top: -300, left: -300 },
    bg: 'radial-gradient(circle, rgba(255,107,157,0.58) 0%, rgba(255,107,157,0.18) 45%, transparent 68%)',
    anim: 'floatBubble1 22s ease-in-out 0s infinite',
  },
  {
    w: 850, h: 850, pos: { top: -200, right: -280 },
    bg: 'radial-gradient(circle, rgba(251,146,60,0.50) 0%, rgba(251,146,60,0.14) 45%, transparent 68%)',
    anim: 'floatBubble2 18s ease-in-out 1.5s infinite',
  },
  {
    w: 760, h: 760, pos: { bottom: -220, right: -200 },
    bg: 'radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0.16) 45%, transparent 68%)',
    anim: 'floatBubble3 26s ease-in-out 3s infinite',
  },
  {
    w: 680, h: 680, pos: { bottom: -180, left: -180 },
    bg: 'radial-gradient(circle, rgba(20,184,166,0.48) 0%, rgba(20,184,166,0.13) 45%, transparent 68%)',
    anim: 'floatBubble4 20s ease-in-out 5s infinite',
  },
  {
    w: 480, h: 480, pos: { top: '38%', left: '42%' },
    bg: 'radial-gradient(circle, rgba(192,38,211,0.42) 0%, rgba(192,38,211,0.10) 45%, transparent 68%)',
    anim: 'floatBubble5 14s ease-in-out 7s infinite',
  },
  {
    w: 360, h: 360, pos: { top: '18%', left: '28%' },
    bg: 'radial-gradient(circle, rgba(244,114,182,0.38) 0%, transparent 65%)',
    anim: 'floatBubble2 11s ease-in-out 2s infinite',
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
            filter: 'blur(38px)',
          }}
        />
      ))}
    </div>
  )
}
