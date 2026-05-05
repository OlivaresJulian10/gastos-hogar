import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

/* ── Persistencia local ─────────────────────────── */
const LS = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  del: k => localStorage.removeItem(k),
}
const MAX_HIST = 40

/* ── Construcción del system prompt ─────────────── */
function buildSystem(nombre, memoria) {
  const memStr = memoria.length
    ? memoria.map(m => `• ${m.clave}: ${m.valor}`).join('\n')
    : '(aún sin datos)'
  return `Eres Lumi, una asistente de IA cálida, inteligente y versátil${nombre ? ` — la asistente personal de ${nombre}` : ''}.

## Lo que recuerdo del usuario:
${memStr}

## Cómo soy:
- Hablo en español de Colombia, de forma natural, cercana y directa — como una amiga muy lista
- Puedo ayudar con CUALQUIER tema: finanzas del hogar, recetas, salud, tecnología, historia, deportes, código, consejos de vida y mucho más
- Cuando no tengo datos en tiempo real (resultados deportivos, noticias del día, precios actuales), lo digo brevemente con una sola frase y **de inmediato** ofrezco lo que sí puedo dar: contexto, historia, análisis, predicciones o la mejor fuente para consultar — sin largas explicaciones ni listas de advertencias
- Nunca soy fría ni corporativa; si hay algo que no sé, lo reconozco con naturalidad y redirezco a algo útil o entretenido
- Uso **negritas** y listas con - cuando hace el texto más claro, no para rellenar
- Cuando el usuario mencione su nombre, ciudad, trabajo, gustos o familia, guárdalos así al final (invisible para el usuario): [MEMO:clave=valor] — ejemplo: [MEMO:nombre=Julián] [MEMO:equipo_favorito=Real Madrid]${nombre ? `\n- El nombre del usuario es **${nombre}** — úsalo con cariño pero sin exagerar` : ''}

Sé concisa, útil y cálida. Una respuesta corta y acertada vale más que tres párrafos genéricos.`
}

/* ── Extracción de memorias ──────────────────────── */
function parseMemos(text) {
  const memos = []
  const cleaned = text.replace(/\[MEMO:([^\]]+)\]/g, (_, c) => {
    const eq = c.indexOf('=')
    if (eq > 0) memos.push({ clave: c.slice(0, eq).trim(), valor: c.slice(eq + 1).trim() })
    return ''
  }).trim()
  return { cleaned, memos }
}

/* ── Saludo inicial ──────────────────────────────── */
function saludar(nombre) {
  const h = new Date().getHours()
  const s = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
  if (nombre) return `${s}, **${nombre}** ✦\n\nSoy **Lumi**, tu asistente personal. Cuéntame, ¿en qué te puedo ayudar hoy?`
  return `¡Hola! Soy **Lumi** ✦\n\nTu asistente personal — lista para ayudarte con lo que necesites: finanzas, recetas, consejos, deportes, tecnología, ideas... lo que sea.\n\n¿Cómo te llamas?`
}

/* ── Renderizado de texto con markdown básico ────── */
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/).map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4)
      return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2)
      return <em key={i}>{p.slice(1, -1)}</em>
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2)
      return <code key={i} style={{ background: 'rgba(168,85,247,0.10)', padding: '1px 5px', borderRadius: 4, fontSize: '0.88em', fontFamily: 'monospace', color: '#7C3AED' }}>{p.slice(1, -1)}</code>
    return p
  })
}

function TextRender({ text }) {
  if (!text) return null
  return (
    <>
      {text.split('\n').map((line, li) => {
        const isList = line.startsWith('- ') || line.startsWith('• ')
        const content = isList ? line.slice(2) : line
        return (
          <div key={li} style={{ minHeight: line === '' ? '0.6em' : 'auto', lineHeight: 1.65 }}>
            {isList && <span style={{ color: '#A855F7', marginRight: 5, fontWeight: 700 }}>·</span>}
            {renderInline(content)}
          </div>
        )
      })}
    </>
  )
}

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '2px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
          animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  )
}

/* ── Panel de memoria ────────────────────────────── */
function MemoriaPanel({ memoria, nombre, onBorrarFact, onBorrarTodo, isMobile, onClose }) {
  return (
    <div style={isMobile ? {
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      overflowY: 'auto', padding: '16px',
      animation: 'fadeUp 0.25s ease both',
    } : {
      width: 270, flexShrink: 0,
      background: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      borderLeft: '1px solid rgba(255,255,255,0.55)',
      overflowY: 'auto', padding: '20px 16px',
      animation: 'slideIn 0.25s ease both',
      boxShadow: '-8px 0 36px rgba(0,0,0,0.10)',
    }}>
      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', fontFamily: "'Playfair Display', serif" }}>Memoria de Lumi</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text2)', padding: '2px 6px', lineHeight: 1 }}>✕</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg,#A855F7,#6366F1)', boxShadow: '0 0 8px rgba(168,85,247,0.6)' }} />
        <p style={{ fontSize: 10.5, fontWeight: 800, color: 'var(--text3)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Lo que sé de ti
        </p>
        {memoria.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 800, background: 'linear-gradient(135deg,#FF6B9D,#A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {memoria.length}
          </span>
        )}
      </div>

      {memoria.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🧠</div>
          <p style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            Aún no he aprendido nada sobre ti. ¡Cuéntame cosas sobre ti!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {memoria.map(m => (
            <div key={m.clave} style={{
              padding: '9px 12px', borderRadius: 12,
              background: m.clave === 'nombre'
                ? 'linear-gradient(135deg,rgba(255,107,157,0.08),rgba(192,38,211,0.06))'
                : 'rgba(168,85,247,0.05)',
              border: `1px solid ${m.clave === 'nombre' ? 'rgba(255,107,157,0.20)' : 'rgba(168,85,247,0.12)'}`,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text3)', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 2 }}>{m.clave}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, wordBreak: 'break-word' }}>{m.valor}</p>
              </div>
              <button onClick={() => onBorrarFact(m.clave)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text3)', fontSize: 13, padding: '0 2px', lineHeight: 1, flexShrink: 0, transition: 'color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
              >✕</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(168,85,247,0.10)' }}>
        <p style={{ fontSize: 10.5, color: 'var(--text3)', marginBottom: 10, textAlign: 'center', lineHeight: 1.5 }}>
          Lumi aprende automáticamente a medida que conversas
        </p>
        <button onClick={onBorrarTodo} style={{
          width: '100%', padding: '9px', borderRadius: 11, cursor: 'pointer',
          border: '1px solid rgba(244,63,94,0.22)', background: 'rgba(244,63,94,0.05)',
          color: 'var(--red)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font)', transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(244,63,94,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(244,63,94,0.05)'}
        >
          Borrar memoria y conversación
        </button>
      </div>
    </div>
  )
}

/* ── Componente principal ────────────────────────── */
export default function Asistente() {
  const { perfil } = useAuth()
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const uid = perfil?.id ?? 'anon'
  const K = {
    nombre: `lumi_n_${uid}`,
    memoria: `lumi_m_${uid}`,
    hist:    `lumi_h_${uid}`,
  }

  const [nombre, setNombre]   = useState(() => LS.get(K.nombre) || null)
  const [memoria, setMemoria] = useState(() => LS.get(K.memoria) || [])
  const [mensajes, setMensajes] = useState(() => {
    const hist = LS.get(K.hist) || []
    const nom  = LS.get(K.nombre) || null
    return hist.length > 0 ? hist : [{ id: 0, rol: 'assistant', texto: saludar(nom) }]
  })
  const [input, setInput]         = useState('')
  const [enviando, setEnviando]   = useState(false)
  const [showMem, setShowMem]     = useState(false)
  const [error, setError]         = useState(null)
  const [isMobile, setIsMobile]   = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const bottomRef  = useRef(null)
  const textareaRef = useRef(null)
  const idRef      = useRef(Date.now())
  const nextId     = () => ++idRef.current

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  useEffect(() => {
    if (!input && textareaRef.current) textareaRef.current.style.height = '44px'
  }, [input])

  /* ── Actualizar memoria aprendida ── */
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
    if (!apiKey) {
      setError('Agrega VITE_ANTHROPIC_API_KEY=sk-ant-... en tu archivo .env.local y reinicia el servidor')
      return
    }
    setError(null)

    const userMsg = { id: nextId(), rol: 'user', texto }
    const asstId  = nextId()
    const cadena  = [...mensajes, userMsg]

    setMensajes([...cadena, { id: asstId, rol: 'assistant', texto: '' }])
    setInput('')
    setEnviando(true)

    // Solo pasar mensajes reales a la API (excluir saludo inicial id=0)
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
          max_tokens: 2048,
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
                if (u[u.length - 1].id === asstId) u[u.length - 1] = { ...u[u.length - 1], texto: full }
                return u
              })
            }
          } catch {}
        }
      }

      // Extraer y procesar memos del texto final
      const { cleaned, memos } = parseMemos(full)
      if (memos.length) {
        aprendeMemos(memos)
        full = cleaned
        setMensajes(prev => {
          const u = [...prev]
          if (u[u.length - 1].id === asstId) u[u.length - 1] = { ...u[u.length - 1], texto: cleaned }
          return u
        })
      }

      // Persistir historial
      LS.set(K.hist, [...cadena, { id: asstId, rol: 'assistant', texto: full }].slice(-MAX_HIST))

    } catch (e) {
      setError(e.message)
      setMensajes(prev => prev.filter(m => m.id !== asstId))
    } finally {
      setEnviando(false)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }

  /* ── Borrar todo ── */
  const borrarTodo = () => {
    if (!confirm('¿Borrar toda la memoria y el historial de Lumi?')) return
    LS.del(K.nombre); LS.del(K.memoria); LS.del(K.hist)
    setNombre(null); setMemoria([])
    setMensajes([{ id: nextId(), rol: 'assistant', texto: saludar(null) }])
    setShowMem(false)
  }

  const borrarFact = (clave) => {
    setMemoria(prev => {
      const upd = prev.filter(m => m.clave !== clave)
      LS.set(K.memoria, upd)
      if (clave === 'nombre') { setNombre(null); LS.del(K.nombre) }
      return upd
    })
  }

  const lastId = mensajes[mensajes.length - 1]?.id

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* ── Cabecera ── */}
      <div style={{
        flexShrink: 0, padding: isMobile ? '10px 14px' : '14px 24px',
        background: 'rgba(22,6,58,0.55)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
        display: 'flex', alignItems: 'center', gap: 14,
        boxShadow: '0 1px 24px rgba(0,0,0,0.22)',
      }}>
        {/* Avatar Lumi */}
        <div style={{
          width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg,#FF6B9D 0%,#C026D3 50%,#6366F1 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, color: 'white',
          boxShadow: '0 4px 22px rgba(255,107,157,0.50), 0 0 0 2.5px rgba(255,255,255,0.22)',
          animation: 'sidebarGlow 3s ease-in-out infinite',
        }}>✦</div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: 'white', letterSpacing: '-0.3px', fontFamily: "'Playfair Display', serif" }}>Lumi</span>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 9px rgba(74,222,128,0.75)', animation: 'sidebarGlow 2s ease-in-out infinite' }} />
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', fontWeight: 500, marginTop: 1 }}>
            Tu asistente personal · siempre lista para ayudarte
          </p>
        </div>

        {/* Botón de memoria */}
        <button onClick={() => setShowMem(v => !v)} style={{
          padding: '7px 16px', borderRadius: 20, fontSize: 11.5, fontWeight: 700,
          border: '1.5px solid rgba(255,255,255,0.20)',
          background: showMem ? 'rgba(255,107,157,0.22)' : 'rgba(255,255,255,0.09)',
          color: showMem ? '#FF6B9D' : 'rgba(255,255,255,0.85)',
          cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: showMem ? '0 0 14px rgba(255,107,157,0.25)' : 'none',
        }}
          onMouseEnter={e => { if (!showMem) e.currentTarget.style.background = 'rgba(255,255,255,0.16)' }}
          onMouseLeave={e => { if (!showMem) e.currentTarget.style.background = 'rgba(255,255,255,0.09)' }}
        >
          <span>🧠</span>
          Memoria{memoria.length > 0 ? ` · ${memoria.length}` : ''}
        </button>
      </div>

      {/* ── Cuerpo: mensajes + panel de memoria ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>

        {/* Área de mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '14px 10px 10px' : '22px 28px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>

          {mensajes.map(msg => {
            const isUser     = msg.rol === 'user'
            const isStreaming = !isUser && msg.id === lastId && enviando
            const isEmpty    = !msg.texto

            return (
              <div key={msg.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-end',
                flexDirection: isUser ? 'row-reverse' : 'row',
                marginBottom: 10,
                animation: 'fadeUp 0.22s cubic-bezier(0.22,1,0.36,1) both',
              }}>
                {/* Avatar del hablante */}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: isUser
                    ? 'linear-gradient(135deg,#14B8A6,#6366F1)'
                    : 'linear-gradient(135deg,#FF6B9D,#C026D3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: 'white', fontWeight: 800,
                  boxShadow: isUser
                    ? '0 2px 10px rgba(20,184,166,0.42)'
                    : '0 2px 10px rgba(255,107,157,0.42)',
                  marginBottom: 2,
                }}>
                  {isUser ? (nombre || perfil?.nombre || 'Tú').slice(0, 1).toUpperCase() : '✦'}
                </div>

                {/* Burbuja de mensaje */}
                <div style={{
                  maxWidth: isMobile ? '84%' : 'min(68%, 640px)',
                  padding: '11px 16px',
                  borderRadius: isUser ? '20px 20px 5px 20px' : '5px 20px 20px 20px',
                  background: isUser
                    ? 'linear-gradient(135deg,#FF6B9D,#C026D3)'
                    : 'rgba(255,255,255,0.93)',
                  backdropFilter: !isUser ? 'blur(24px)' : 'none',
                  WebkitBackdropFilter: !isUser ? 'blur(24px)' : 'none',
                  border: !isUser ? '1px solid rgba(255,255,255,0.65)' : 'none',
                  color: isUser ? 'white' : 'var(--text)',
                  fontSize: 13.5,
                  boxShadow: isUser
                    ? '0 4px 22px rgba(255,107,157,0.38)'
                    : '0 4px 22px rgba(0,0,0,0.11), 0 1px 0 rgba(255,255,255,0.7) inset',
                }}>
                  {isStreaming && isEmpty
                    ? <TypingDots />
                    : <TextRender text={msg.texto} />
                  }
                </div>
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>

        {/* Panel de memoria deslizable */}
        {showMem && (
          <MemoriaPanel
            memoria={memoria}
            nombre={nombre}
            onBorrarFact={borrarFact}
            onBorrarTodo={borrarTodo}
            isMobile={isMobile}
            onClose={() => setShowMem(false)}
          />
        )}
      </div>

      {/* ── Barra de error ── */}
      {error && (
        <div style={{
          flexShrink: 0, padding: '10px 24px',
          background: 'rgba(244,63,94,0.14)', backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(244,63,94,0.25)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 13, color: '#F43F5E', fontWeight: 600, flex: 1, lineHeight: 1.5 }}>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F43F5E', fontSize: 16, padding: '2px 6px', flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* ── Input ── */}
      <div style={{
        flexShrink: 0,
        padding: isMobile ? '10px 12px' : '14px 20px',
        paddingBottom: isMobile ? 'max(10px, env(safe-area-inset-bottom))' : '14px',
        background: 'rgba(22,6,58,0.45)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.10)',
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          onFocus={e => { e.target.style.borderColor = 'rgba(255,107,157,0.60)'; e.target.style.boxShadow = '0 0 0 3px rgba(255,107,157,0.12)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.20)'; e.target.style.boxShadow = 'none' }}
          placeholder={isMobile ? "Escríbele a Lumi…" : "Escríbele a Lumi… (Enter para enviar · Shift+Enter = nueva línea)"}
          disabled={enviando}
          rows={1}
          style={{
            flex: 1, padding: '11px 16px', fontSize: 13.5, fontWeight: 500,
            border: '1.5px solid rgba(255,255,255,0.20)', borderRadius: 20,
            background: 'rgba(255,255,255,0.13)', color: 'white',
            outline: 'none', fontFamily: 'var(--font)', resize: 'none',
            backdropFilter: 'blur(12px)', lineHeight: 1.5,
            transition: 'border-color 0.2s, box-shadow 0.2s',
            minHeight: 44, maxHeight: 120,
            scrollbarWidth: 'none',
            WebkitScrollbar: 'none',
          }}
        />
        <button
          onClick={enviar}
          disabled={!input.trim() || enviando}
          style={{
            width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
            background: !input.trim() || enviando
              ? 'rgba(255,255,255,0.10)'
              : 'linear-gradient(135deg,#FF6B9D 0%,#C026D3 55%,#7C3AED 100%)',
            border: !input.trim() || enviando ? '1.5px solid rgba(255,255,255,0.12)' : '1.5px solid rgba(255,255,255,0.25)',
            cursor: !input.trim() || enviando ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
            boxShadow: !input.trim() || enviando
              ? 'none'
              : '0 4px 22px rgba(255,107,157,0.55), 0 0 0 0 rgba(255,107,157,0)',
            transition: 'all 0.22s cubic-bezier(0.22,1,0.36,1)',
            position: 'relative', overflow: 'hidden',
          }}
          onMouseEnter={e => {
            if (input.trim() && !enviando) {
              e.currentTarget.style.transform = 'scale(1.12) rotate(-8deg)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,107,157,0.70), 0 0 0 4px rgba(255,107,157,0.18)'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1) rotate(0deg)'
            e.currentTarget.style.boxShadow = !input.trim() || enviando ? 'none' : '0 4px 22px rgba(255,107,157,0.55)'
          }}
        >
          {enviando ? (
            <div style={{ width: 18, height: 18, border: '2.5px solid rgba(255,255,255,0.28)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : (
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2, marginBottom: 1 }}>
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
