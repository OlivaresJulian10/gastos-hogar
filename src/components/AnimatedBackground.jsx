const BUBBLES = [
  {
    w: 300, h: 300, pos: { top: -90, left: -70 },
    bg: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 70%)',
    anim: 'floatBubble1 15s ease-in-out 0s infinite',
  },
  {
    w: 240, h: 240, pos: { top: -50, right: -60 },
    bg: 'radial-gradient(circle, rgba(255,107,157,0.18) 0%, transparent 70%)',
    anim: 'floatBubble2 12s ease-in-out 0s infinite',
  },
  {
    w: 200, h: 200, pos: { top: '40%', left: -50 },
    bg: 'radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)',
    anim: 'floatBubble3 17s ease-in-out 0s infinite',
  },
  {
    w: 350, h: 350, pos: { bottom: -100, right: -80 },
    bg: 'radial-gradient(circle, rgba(217,70,168,0.17) 0%, transparent 70%)',
    anim: 'floatBubble4 14s ease-in-out 0s infinite',
  },
  {
    w: 160, h: 160, pos: { top: '58%', left: '52%' },
    bg: 'radial-gradient(circle, rgba(236,72,153,0.13) 0%, transparent 70%)',
    anim: 'floatBubble5 10s ease-in-out 1s infinite',
  },
  {
    w: 210, h: 210, pos: { bottom: '18%', left: '22%' },
    bg: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
    anim: 'floatBubble1 19s ease-in-out 3s infinite',
  },
  {
    w: 140, h: 140, pos: { top: '22%', right: '20%' },
    bg: 'radial-gradient(circle, rgba(251,113,133,0.15) 0%, transparent 70%)',
    anim: 'floatBubble2 11s ease-in-out 2s infinite',
  },
]

export default function AnimatedBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
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
