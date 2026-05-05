import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

/* ── Persistencia ─────────────────────────────── */
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k),
}
const MAX_HIST = 40

/* ── System prompt ───────────────────────────── */
function buildSystem(nombre, memoria) {
  const memStr = memoria.length
    ? memoria.map(m => `• ${m.clave}: ${m.valor}`).join('\n')
    : '(sin datos aún)'
  return `Eres Lumi, una asistente de IA cálida, inteligente y versátil${nombre ? ` — la asistente personal de ${nombre}` : ''}.

## Lo que recuerdo del usuario:
${memStr}

## Cómo soy:
- Hablo en español de Colombia, de forma natural y cercana — como una amiga muy lista
- Puedo ayudar con CUALQUIER tema: finanzas del hogar, recetas, salud, tecnología, historia, deportes, código, consejos y más
- Cuando no tengo datos en tiempo real (resultados deportivos, noticias del día), lo digo en una sola frase y ofrezco lo que sí puedo dar: contexto, análisis o la mejor fuente
- Soy concisa en el widget — respuestas directas y útiles, sin relleno
- Si aprendes datos del usuario (nombre, ciudad, trabajo, gustos, familia), guárdalos así al final: [MEMO:clave=valor]${nombre ? `\n- El nombre del usuario es **${nombre}** — úsalo con cariño pero sin exagerar` : ''}

Una respuesta corta y acertada vale más que tres párrafos genéricos.`
}

function parseMemos(text) {
  const memos = []
  const cleaned = text.replace(/\[MEMO:([^\]]+)\]/g, (_, c) => {
    const eq = c.indexOf('=')
    if (eq > 0) memos.push({ clave: c.slice(0, eq).trim(), valor: c.slice(eq + 1).trim() })
    return ''
  }).trim()
  return { cleaned, memos }
}

function saludar(nombre) {
  const h = new Date().getHours()
  const s = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  if (nombre) return `${s}, **${nombre}** ✦ ¿En qué te puedo ayudar hoy?`
  return `¡Hola! Soy **Lumi**, tu asistente personal ✦\n\nPuedo ayudarte con cualquier pregunta. ¿Cómo te llamas?`
}

function saludarBurbuja(nombre) {
  const h = new Date().getHours()
  const s = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  return nombre ? `${s}, ${nombre} ✦ ¿En qué te puedo ayudar?` : `¡Hola! Soy Lumi ✦ ¿En qué te puedo ayudar?`
}

/* ── Markdown básico ─────────────────────────── */
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={i}>{p.slice(2,-2)}</strong>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={i}>{p.slice(1,-1)}</em>
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
      return <code key={i} style={{ background: 'rgba(168,85,247,0.18)', padding: '1px 4px', borderRadius: 4, fontSize: '0.87em', fontFamily: 'monospace', color: '#C084FC' }}>{p.slice(1,-1)}</code>
    return p
  })
}

function TextRender({ text }) {
  if (!text) return null
  return (
    <>
      {text.split('\n').map((line, li) => {
        const isList = line.startsWith('- ') || line.startsWith('• ')
        return (
          <div key={li} style={{ minHeight: line === '' ? '0.45em' : 'auto', lineHeight: 1.6 }}>
            {isList && <span style={{ color: '#C084FC', marginRight: 5, fontWeight: 700 }}>·</span>}
            {renderInline(isList ? line.slice(2) : line)}
          </div>
        )
      })}
    </>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '2px 0' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
          animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}

/* ── Widget principal ────────────────────────── */
export default function ChatWidget() {
  const { perfil, user } = useAuth()
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const uid = perfil?.id ?? 'anon'
  const K = {
    nombre: `lumi_n_${uid}`,
    memoria: `lumi_m_${uid}`,
    hist:    `lumi_h_${uid}`,
  }

  const [open, setOpen]         = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const [showMem, setShowMem]   = useState(false)
  const [unread, setUnread]     = useState(false)
  const [nombre, setNombre]     = useState(() => LS.get(K.nombre) || null)
  const [memoria, setMemoria]   = useState(() => LS.get(K.memoria) || [])
  const [mensajes, setMensajes] = useState(() => {
    const hist = LS.get(K.hist) || []
    const nom  = LS.get(K.nombre) || null
    return hist.length > 0 ? hist : [{ id: 0, rol: 'assistant', texto: saludar(nom) }]
  })
  const [input, setInput]       = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError]       = useState(null)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const textareaRef = useRef(null)
  const idRef       = useRef(Date.now())
  const nextId      = () => ++idRef.current

  /* ── Auto-saludo al iniciar sesión (una vez por sesión) ── */
  useEffect(() => {
    if (!user) return
    if (sessionStorage.getItem('lumi_greeted')) return
    const t = setTimeout(() => {
      setShowBubble(true)
      setUnread(true)
      sessionStorage.setItem('lumi_greeted', '1')
      setTimeout(() => setShowBubble(false), 7000)
    }, 1800)
    return () => clearTimeout(t)
  }, [user])

  useEffect(() => {
    if (open) {
      setUnread(false)
      setShowBubble(false)
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        inputRef.current?.focus()
      }, 100)
    }
  }, [open])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, open])

  useEffect(() => {
    if (!input && textareaRef.current) textareaRef.current.style.height = '38px'
  }, [input])

  /* ── Aprender datos ── */
  const aprendeMemos = useCallback((memos) => {
    if (!memos.length) return
    setMemoria(prev => {
      const upd = [...prev]
      for (const { clave, valor } of memos) {
        const idx = upd.findIndex(m => m.clave === clave)
        if (idx >= 0) upd[idx] = { clave, valor }
        else upd.push({ clave, valor })
        if (clave === 'nombre') { setNombre(valor); LS.set(K.nombre, valor) }
      }
      LS.set(K.memoria, upd)
      return upd
    })
  }, [])

  /* ── Enviar mensaje ── */
  const enviar = async () => {
    const texto = input.trim()
    if (!texto || enviando) return
    if (!apiKey) { setError('Falta VITE_ANTHROPIC_API_KEY en .env.local'); return }
    setError(null)

    const userMsg = { id: nextId(), rol: 'user', texto }
    const asstId  = nextId()
    const cadena  = [...mensajes, userMsg]

    setMensajes([...cadena, { id: asstId, rol: 'assistant', texto: '' }])
    setInput('')
    setEnviando(true)

    const apiMsgs = cadena
      .filter(m => m.id !== 0 && m.texto)
      .map(m => ({ role: m.rol === 'user' ? 'user' : 'assistant', content: m.texto }))

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          stream: true,
          system: buildSystem(nombre, memoria),
          messages: apiMsgs,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || `Error HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      let full     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          try {
            const ev = JSON.parse(line.slice(6))
            if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
              full += ev.delta.text
              setMensajes(prev => {
                const u = [...prev]
                if (u[u.length-1].id === asstId) u[u.length-1] = { ...u[u.length-1], texto: full }
                return u
              })
            }
          } catch {}
        }
      }

      const { cleaned, memos } = parseMemos(full)
      if (memos.length) {
        aprendeMemos(memos)
        full = cleaned
        setMensajes(prev => {
          const u = [...prev]
          if (u[u.length-1].id === asstId) u[u.length-1] = { ...u[u.length-1], texto: cleaned }
          return u
        })
      }

      LS.set(K.hist, [...cadena, { id: asstId, rol: 'assistant', texto: full }].slice(-MAX_HIST))

    } catch (e) {
      setError(e.message)
      setMensajes(prev => prev.filter(m => m.id !== asstId))
    } finally {
      setEnviando(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const borrarFact = (clave) => {
    setMemoria(prev => {
      const upd = prev.filter(m => m.clave !== clave)
      LS.set(K.memoria, upd)
      if (clave === 'nombre') { setNombre(null); LS.del(K.nombre) }
      return upd
    })
  }

  const borrarTodo = () => {
    if (!confirm('¿Borrar memoria y conversación?')) return
    LS.del(K.nombre); LS.del(K.memoria); LS.del(K.hist)
    setNombre(null); setMemoria([])
    setMensajes([{ id: nextId(), rol: 'assistant', texto: saludar(null) }])
    setShowMem(false)
  }

  const lastId = mensajes[mensajes.length-1]?.id

  return (
    <>
      {/* ── Burbuja de saludo ── */}
      {showBubble && !open && (
        <div
          onClick={() => { setOpen(true); setShowBubble(false) }}
          style={{
            position: 'fixed', bottom: 96, right: 24, zIndex: 9998,
            maxWidth: 272,
            background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderRadius: '18px 18px 4px 18px',
            padding: '14px 16px 12px',
            boxShadow: '0 12px 44px rgba(0,0,0,0.20), 0 1px 0 rgba(255,255,255,0.9) inset',
            border: '1px solid rgba(255,255,255,0.75)',
            cursor: 'pointer',
            animation: 'fadeUp 0.38s cubic-bezier(0.22,1,0.36,1) both',
          }}
        >
          <button
            onClick={e => { e.stopPropagation(); setShowBubble(false); setUnread(false) }}
            style={{
              position: 'absolute', top: 8, right: 10,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', fontSize: 13, lineHeight: 1, padding: '2px 4px',
            }}
          >✕</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: 'linear-gradient(135deg,#FF6B9D,#C026D3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: 'white', fontWeight: 800, flexShrink: 0,
              boxShadow: '0 2px 10px rgba(255,107,157,0.4)',
            }}>✦</div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)' }}>Lumi</span>
              <div style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', marginLeft: 5, boxShadow: '0 0 6px rgba(74,222,128,0.7)', verticalAlign: 'middle' }} />
            </div>
          </div>

          <p style={{ fontSize: 13.5, color: 'var(--text)', lineHeight: 1.55, fontWeight: 500, paddingRight: 14 }}>
            {saludarBurbuja(nombre)}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
            Toca para chatear <span style={{ fontSize: 13 }}>→</span>
          </p>
        </div>
      )}

      {/* ── Panel de chat ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 90, right: 24, zIndex: 9998,
          width: 380, height: 540,
          borderRadius: 24,
          background: 'rgba(10,3,28,0.97)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,107,157,0.06), 0 1px 0 rgba(255,255,255,0.06) inset',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'widgetOpen 0.32s cubic-bezier(0.22,1,0.36,1) both',
        }}>

          {/* Header */}
          <div style={{
            flexShrink: 0, padding: '13px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.03)',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#FF6B9D,#C026D3,#6366F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: 'white',
              boxShadow: '0 3px 18px rgba(255,107,157,0.50)',
              animation: 'sidebarGlow 3s ease-in-out infinite',
            }}>✦</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: 'white', fontFamily: "'Playfair Display', serif", letterSpacing: '-0.2px' }}>Lumi</span>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px rgba(74,222,128,0.75)' }} />
              </div>
              <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.38)', marginTop: 1, fontWeight: 500 }}>Asistente IA · aprende contigo</p>
            </div>
            <button onClick={() => setShowMem(v => !v)} title="Memoria" style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: showMem ? 'rgba(168,85,247,0.28)' : 'rgba(255,255,255,0.07)',
              color: showMem ? '#C084FC' : 'rgba(255,255,255,0.48)',
              fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}>🧠</button>
            <button onClick={() => setOpen(false)} style={{
              width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.48)', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.22)'; e.currentTarget.style.color = '#F43F5E' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.48)' }}
            >✕</button>
          </div>

          {/* Panel de memoria (overlay) */}
          {showMem && (
            <div style={{
              position: 'absolute', inset: 0, top: 66, zIndex: 10,
              background: 'rgba(10,3,28,0.99)', padding: '16px', overflowY: 'auto',
              animation: 'fadeDown 0.18s ease both',
            }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(168,85,247,0.6)', letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 14 }}>
                Lo que sé de ti · {memoria.length} datos
              </p>
              {memoria.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <div style={{ fontSize: 30, marginBottom: 10 }}>🧠</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.32)', lineHeight: 1.6 }}>
                    Aún no he aprendido nada sobre ti. ¡Cuéntame!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {memoria.map(m => (
                    <div key={m.clave} style={{
                      padding: '9px 12px', borderRadius: 11,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(168,85,247,0.65)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 2 }}>{m.clave}</p>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', fontWeight: 500, wordBreak: 'break-word' }}>{m.valor}</p>
                      </div>
                      <button onClick={() => borrarFact(m.clave)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.24)', fontSize: 13, padding: '0 2px', transition: 'color 0.15s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F43F5E'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.24)'}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: 8 }}>
                <button onClick={() => setShowMem(false)} style={{
                  flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all 0.15s',
                }}>← Volver</button>
                <button onClick={borrarTodo} style={{
                  flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid rgba(244,63,94,0.22)', background: 'rgba(244,63,94,0.06)',
                  color: '#F43F5E', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.14)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.06)'}
                >Borrar todo</button>
              </div>
            </div>
          )}

          {/* Mensajes */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '14px 13px 8px',
            display: 'flex', flexDirection: 'column', gap: 1,
            scrollbarWidth: 'thin', scrollbarColor: 'rgba(168,85,247,0.18) transparent',
          }}>
            {mensajes.map(msg => {
              const isUser     = msg.rol === 'user'
              const isStreaming = !isUser && msg.id === lastId && enviando

              return (
                <div key={msg.id} style={{
                  display: 'flex', gap: 7, alignItems: 'flex-end',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  marginBottom: 7,
                  animation: 'fadeUp 0.2s ease both',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: isUser
                      ? 'linear-gradient(135deg,#14B8A6,#6366F1)'
                      : 'linear-gradient(135deg,#FF6B9D,#C026D3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'white', fontWeight: 800, marginBottom: 1,
                    boxShadow: isUser ? '0 2px 8px rgba(20,184,166,0.38)' : '0 2px 8px rgba(255,107,157,0.38)',
                  }}>
                    {isUser ? (nombre || perfil?.nombre || 'Tú').slice(0,1).toUpperCase() : '✦'}
                  </div>
                  <div style={{
                    maxWidth: '80%', padding: '9px 12px',
                    borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
                    background: isUser
                      ? 'linear-gradient(135deg,#FF6B9D,#C026D3)'
                      : 'rgba(255,255,255,0.07)',
                    border: !isUser ? '1px solid rgba(255,255,255,0.08)' : 'none',
                    color: isUser ? 'white' : 'rgba(255,255,255,0.87)',
                    fontSize: 13, lineHeight: 1.6,
                    boxShadow: isUser ? '0 3px 14px rgba(255,107,157,0.38)' : 'none',
                  }}>
                    {isStreaming && !msg.texto ? <TypingDots /> : <TextRender text={msg.texto} />}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              flexShrink: 0, padding: '8px 14px',
              background: 'rgba(244,63,94,0.10)', borderTop: '1px solid rgba(244,63,94,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ flex: 1, fontSize: 11.5, color: '#F43F5E', fontWeight: 600, lineHeight: 1.4 }}>⚠ {error}</span>
              <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F43F5E', fontSize: 14 }}>✕</button>
            </div>
          )}

          {/* Input */}
          <div style={{
            flexShrink: 0, padding: '10px 12px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)',
            display: 'flex', gap: 8, alignItems: 'flex-end',
          }}>
            <textarea
              ref={el => { inputRef.current = el; textareaRef.current = el }}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(255,107,157,0.55)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,157,0.08)' }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; e.target.style.boxShadow = 'none' }}
              placeholder="Escríbele a Lumi..."
              disabled={enviando}
              rows={1}
              style={{
                flex: 1, padding: '9px 13px', fontSize: 13, fontWeight: 500,
                border: '1.5px solid rgba(255,255,255,0.10)', borderRadius: 16,
                background: 'rgba(255,255,255,0.07)', color: 'white',
                outline: 'none', fontFamily: 'var(--font)', resize: 'none',
                lineHeight: 1.5, minHeight: 38, maxHeight: 96,
                scrollbarWidth: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
            />
            <button onClick={enviar} disabled={!input.trim() || enviando} style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0, border: 'none',
              background: !input.trim() || enviando
                ? 'rgba(255,255,255,0.07)'
                : 'linear-gradient(135deg,#FF6B9D,#C026D3,#7C3AED)',
              cursor: !input.trim() || enviando ? 'not-allowed' : 'pointer',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: !input.trim() || enviando ? 'none' : '0 4px 16px rgba(255,107,157,0.52)',
              transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
            }}
              onMouseEnter={e => { if (input.trim() && !enviando) { e.currentTarget.style.transform = 'scale(1.12) rotate(-8deg)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(255,107,157,0.70)' } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.boxShadow = !input.trim() || enviando ? 'none' : '0 4px 16px rgba(255,107,157,0.52)' }}
            >
              {enviando
                ? <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2, marginBottom: 1 }}><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Botón flotante ── */}
      <button
        onClick={() => { setOpen(v => !v); setShowBubble(false); setUnread(false) }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 58, height: 58, borderRadius: '50%', border: 'none',
          background: open
            ? 'linear-gradient(135deg,#6366F1,#A855F7)'
            : 'linear-gradient(135deg,#FF6B9D 0%,#C026D3 50%,#A855F7 100%)',
          cursor: 'pointer', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(255,107,157,0.55), 0 2px 8px rgba(0,0,0,0.28)',
          transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.transform = 'scale(1.13)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = open ? 'scale(0.92)' : 'scale(1)' }}
      >
        <span style={{ fontSize: open ? 20 : 22, transition: 'all 0.2s' }}>
          {open ? '✕' : '✦'}
        </span>

        {/* Badge de no leído */}
        {unread && !open && (
          <div style={{
            position: 'absolute', top: 5, right: 5,
            width: 11, height: 11, borderRadius: '50%',
            background: '#4ADE80', border: '2px solid rgba(10,3,28,0.9)',
            boxShadow: '0 0 8px rgba(74,222,128,0.8)',
          }} />
        )}
      </button>

      {/* Ring pulsante cuando hay no leído */}
      {unread && !open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
          width: 58, height: 58, borderRadius: '50%',
          border: '2px solid rgba(255,107,157,0.45)',
          animation: 'pulseRing 1.8s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}
    </>
  )
}
