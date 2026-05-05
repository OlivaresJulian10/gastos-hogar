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
  return `Eres Lumi, la asistente personal de IA de${nombre ? ` **${nombre}**` : 'l usuario'} — inteligente, cálida y siempre actualizada.

## Lo que recuerdo:
${memStr}

## Reglas de oro:
1. **SIEMPRE usa web_search** para: partidos, marcadores, noticias, precios, clima, estrenos, resultados, eventos — cualquier cosa que pueda cambiar día a día. No especules, busca primero.
2. Habla en español de Colombia, natural y cercano — como una amiga muy inteligente.
3. Da la respuesta **completa y útil**: si alguien pregunta por partidos, muestra fecha, hora, equipos y canal. Si pregunta por marcador, da el resultado. No digas "no tengo esa información" si puedes buscarla.
4. Después de buscar, presenta los datos de forma clara con negritas y listas cuando ayude.
5. Si aprendes datos del usuario (ciudad, trabajo, gustos, familia), guárdalos: [MEMO:clave=valor]${nombre ? `\n6. Siempre llama al usuario **${nombre}** — con cariño, no en cada frase.` : ''}

Sé directa, precisa y útil. El usuario espera respuestas reales, no evasivas.`
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
  }

  const [open, setOpen]             = useState(false)
  const [showBubble, setShowBubble] = useState(false)
  const [showMem, setShowMem]       = useState(false)
  const [unread, setUnread]         = useState(false)
  const [nombre, setNombre]         = useState(null)
  const [memoria, setMemoria]       = useState([])
  const [mensajes, setMensajes]     = useState([{ id: 0, rol: 'assistant', texto: saludar(null) }])
  const [input, setInput]           = useState('')
  const [enviando, setEnviando]     = useState(false)
  const [buscando, setBuscando]     = useState(false)
  const [error, setError]           = useState(null)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const textareaRef = useRef(null)
  const idRef       = useRef(Date.now())
  const nextId      = () => ++idRef.current
  const prevUidRef  = useRef('anon')

  /* ── Reaccionar a login / logout (uid cambia cuando perfil carga) ── */
  useEffect(() => {
    if (prevUidRef.current === uid) return
    prevUidRef.current = uid

    if (uid === 'anon') {
      // Logout: estado limpio
      setNombre(null); setMemoria([])
      setMensajes([{ id: nextId(), rol: 'assistant', texto: saludar(null) }])
      setOpen(false); setShowBubble(false); setUnread(false)
      return
    }

    // Login: cargar memoria persistente + nombre del perfil
    const storedNombre = LS.get(K.nombre)
    const profileName  = perfil?.nombre ? perfil.nombre.split(' ')[0] : null
    const effectiveName = storedNombre || profileName

    if (!storedNombre && profileName) LS.set(K.nombre, profileName)

    const storedMem = LS.get(K.memoria) || []
    const updatedMem = profileName && !storedMem.find(m => m.clave === 'nombre')
      ? [{ clave: 'nombre', valor: profileName }, ...storedMem]
      : storedMem
    if (updatedMem !== storedMem) LS.set(K.memoria, updatedMem)

    setNombre(effectiveName)
    setMemoria(updatedMem)
    setMensajes([{ id: nextId(), rol: 'assistant', texto: saludar(effectiveName) }])

    // Mostrar burbuja de saludo
    const t = setTimeout(() => {
      setShowBubble(true); setUnread(true)
      setTimeout(() => setShowBubble(false), 8000)
    }, 1600)
    return () => clearTimeout(t)
  }, [uid])

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
          model: 'claude-sonnet-4-6',
          max_tokens: 3000,
          stream: true,
          system: buildSystem(nombre, memoria),
          messages: apiMsgs,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
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
            if (ev.type === 'content_block_start') {
              if (ev.content_block?.type === 'tool_use') setBuscando(true)
              else if (ev.content_block?.type === 'text' && full === '') setBuscando(false)
            }
            if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') {
              setBuscando(false)
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

      // No persiste historial — conversación siempre fresca al iniciar sesión

    } catch (e) {
      setError(e.message)
      setMensajes(prev => prev.filter(m => m.id !== asstId))
    } finally {
      setEnviando(false)
      setBuscando(false)
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
    LS.del(K.nombre); LS.del(K.memoria)
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
              width: 30, height: 30, borderRadius: '50%',
              background: 'linear-gradient(135deg,#FF6B9D,#C026D3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, boxShadow: '0 2px 10px rgba(255,107,157,0.4)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L13.2 8.8H19.5L14.2 12.5L16.4 19L12 15.5L7.6 19L9.8 12.5L4.5 8.8H10.8Z"/>
                <circle cx="20" cy="4.5" r="1.5" opacity="0.80"/>
                <circle cx="21" cy="17" r="1.1" opacity="0.65"/>
              </svg>
            </div>
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
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#FF6B9D,#C026D3,#6366F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 20px rgba(255,107,157,0.55)',
              animation: 'sidebarGlow 3s ease-in-out infinite',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 2L13.2 8.8H19.5L14.2 12.5L16.4 19L12 15.5L7.6 19L9.8 12.5L4.5 8.8H10.8Z"/>
                <circle cx="20" cy="4.5" r="1.3" opacity="0.80"/>
                <circle cx="3.5" cy="18" r="0.9" opacity="0.60"/>
                <circle cx="21" cy="17" r="1.0" opacity="0.70"/>
              </svg>
            </div>
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
                    {isUser ? (nombre || perfil?.nombre || 'Tú').slice(0,1).toUpperCase() : (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="white">
                        <path d="M12 2L13.2 8.8H19.5L14.2 12.5L16.4 19L12 15.5L7.6 19L9.8 12.5L4.5 8.8H10.8Z"/>
                      </svg>
                    )}
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
                    {isStreaming && buscando ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)', fontSize: 11.5, fontWeight: 500 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Buscando en internet…
                      </div>
                    ) : isStreaming && !msg.texto ? <TypingDots /> : <TextRender text={msg.texto} />}
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

      {/* ── Halo de brillo detrás del botón ── */}
      {!open && (
        <div style={{
          position: 'fixed', bottom: 13, right: 13, zIndex: 9995,
          width: 92, height: 92, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,107,157,0.50) 0%, rgba(168,85,247,0.28) 45%, transparent 72%)',
          animation: 'sidebarGlow 2.8s ease-in-out infinite',
          pointerEvents: 'none', filter: 'blur(10px)',
        }} />
      )}

      {/* Anillo giratorio decorativo */}
      {!open && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 9996,
          width: 68, height: 68, borderRadius: '50%',
          border: '1.5px solid transparent',
          backgroundImage: 'conic-gradient(from 0deg, rgba(255,107,157,0.7), rgba(192,38,211,0.5), rgba(99,102,241,0.7), rgba(255,107,157,0.1), rgba(255,107,157,0.7))',
          backgroundOrigin: 'border-box',
          WebkitMask: 'linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'destination-out',
          maskComposite: 'exclude',
          animation: 'spin 4s linear infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Botón flotante ── */}
      <button
        onClick={() => { setOpen(v => !v); setShowBubble(false); setUnread(false) }}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 60, height: 60, borderRadius: '50%',
          border: '1.5px solid rgba(255,255,255,0.30)',
          background: open
            ? 'linear-gradient(135deg,#6366F1,#A855F7)'
            : 'linear-gradient(135deg,#FF6B9D 0%,#C026D3 55%,#7C3AED 100%)',
          cursor: 'pointer', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: open
            ? '0 4px 24px rgba(99,102,241,0.50)'
            : '0 10px 44px rgba(255,107,157,0.70), 0 4px 16px rgba(124,58,237,0.40), 0 2px 6px rgba(0,0,0,0.22)',
          transition: 'all 0.32s cubic-bezier(0.34,1.56,0.64,1)',
          transform: open ? 'scale(0.90) rotate(135deg)' : 'scale(1)',
          animation: !open ? 'floatBtn 3.5s ease-in-out infinite' : 'none',
        }}
        onMouseEnter={e => { if (!open) { e.currentTarget.style.transform = 'scale(1.14)'; e.currentTarget.style.boxShadow = '0 14px 52px rgba(255,107,157,0.85), 0 6px 20px rgba(124,58,237,0.55)' } }}
        onMouseLeave={e => { e.currentTarget.style.transform = open ? 'scale(0.90) rotate(135deg)' : 'scale(1)'; e.currentTarget.style.boxShadow = open ? '0 4px 24px rgba(99,102,241,0.50)' : '0 10px 44px rgba(255,107,157,0.70), 0 4px 16px rgba(124,58,237,0.40)' }}
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L13.2 8.8H19.5L14.2 12.5L16.4 19L12 15.5L7.6 19L9.8 12.5L4.5 8.8H10.8Z"/>
            <circle cx="19.5" cy="4.5" r="1.4" opacity="0.80"/>
            <circle cx="4" cy="18.5" r="1.0" opacity="0.55"/>
            <circle cx="20.5" cy="17" r="1.1" opacity="0.65"/>
          </svg>
        )}

        {/* Badge no leído */}
        {unread && !open && (
          <div style={{
            position: 'absolute', top: 4, right: 4,
            width: 12, height: 12, borderRadius: '50%',
            background: '#4ADE80', border: '2px solid #1a0a3a',
            boxShadow: '0 0 10px rgba(74,222,128,0.85)',
          }} />
        )}
      </button>

      {/* Rings pulsantes cuando hay no leído */}
      {unread && !open && (
        <>
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9997,
            width: 60, height: 60, borderRadius: '50%',
            border: '2px solid rgba(255,107,157,0.55)',
            animation: 'pulseRing 1.8s ease-out infinite',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9996,
            width: 60, height: 60, borderRadius: '50%',
            border: '2px solid rgba(168,85,247,0.40)',
            animation: 'pulseRing 1.8s ease-out 0.5s infinite',
            pointerEvents: 'none',
          }} />
        </>
      )}
    </>
  )
}
