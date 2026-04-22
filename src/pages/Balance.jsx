import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, MetricCard, Avatar, fmt } from '../components/UI'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const mesActual = format(new Date(), 'yyyy-MM')

/* ── Modal de pago ───────────────────────────────────────────── */
function PagoModal({ transfer, personas, mes, onPagado, onClose }) {
  const pagador  = personas[transfer.de]
  const receptor = personas[transfer.a]
  const [registrando, setRegistrando] = useState(false)
  const [copiado, setCopiado]         = useState(null)
  const [pagado, setPagado]           = useState(false)
  const [tab, setTab]                 = useState(
    receptor?.qr_nequi_url || receptor?.nequi ? 'nequi' : 'bancolombia'
  )

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const copiar = async (texto, tipo) => {
    try { await navigator.clipboard.writeText(texto) } catch {}
    setCopiado(tipo)
    setTimeout(() => setCopiado(null), 2200)
  }

  const registrar = async () => {
    setRegistrando(true)
    const { data } = await supabase.from('pagos').insert([{
      de_persona_id: pagador.id,
      a_persona_id:  receptor.id,
      monto: transfer.monto,
      mes,
      fecha: format(new Date(), 'yyyy-MM-dd'),
    }]).select().single()
    setRegistrando(false)
    setPagado(true)
    onPagado(data)
    setTimeout(onClose, 1800)
  }

  const hasNequi       = !!(receptor?.qr_nequi_url || receptor?.nequi)
  const hasBancolombia = !!(receptor?.qr_bancolombia_url || receptor?.cuenta_bancaria)
  const nequiDeepLink  = receptor?.nequi
    ? `nequi://transferencia?celular=${receptor.nequi.replace(/\D/g, '')}&valor=${Math.round(transfer.monto)}`
    : null

  const btnTab = (active, accent) => ({
    flex: 1, padding: '8px 10px', borderRadius: 10, fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.18s',
    border: active ? `2px solid ${accent}55` : '1.5px solid var(--border)',
    background: active ? `${accent}12` : 'transparent',
    color: active ? accent : 'var(--text2)',
  })

  if (pagado) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(20,8,45,0.72)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}>
        <div style={{
          background: 'white', borderRadius: 22, width: '100%', maxWidth: 380,
          padding: '2.5rem 1.75rem', textAlign: 'center',
          boxShadow: '0 30px 80px rgba(30,8,69,0.28)',
        }}>
          <div style={{ fontSize: 52, marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: 'var(--teal)', marginBottom: 8 }}>
            ¡Pago registrado!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', fontWeight: 500 }}>
            La deuda de <strong>{pagador?.nombre}</strong> ha sido saldada.<br />
            El balance se actualiza automáticamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(20,8,45,0.72)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', animation: 'fadeUp 0.18s ease both',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white', borderRadius: 22, width: '100%', maxWidth: 440,
          maxHeight: '92vh', overflowY: 'auto',
          padding: '1.75rem', boxShadow: '0 30px 80px rgba(30,8,69,0.28)',
          border: '1px solid rgba(210,100,160,0.15)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: 'var(--text)' }}>Realizar pago</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text3)', padding: '2px 6px' }}>✕</button>
        </div>

        {/* Resumen de monto */}
        <div style={{
          textAlign: 'center', padding: '1rem', marginBottom: '1.25rem',
          borderRadius: 16,
          background: 'linear-gradient(135deg,rgba(255,107,157,0.06),rgba(168,85,247,0.06))',
          border: '1px solid var(--border)',
        }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>
            <strong style={{ color: 'var(--text)' }}>{pagador?.nombre}</strong>
            {' '}→{' '}
            <strong style={{ color: 'var(--text)' }}>{receptor?.nombre}</strong>
          </p>
          <p style={{
            fontSize: 34, fontWeight: 700,
            background: 'linear-gradient(135deg,#FF6B9D,#A855F7)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            {fmt(transfer.monto)}
          </p>
        </div>

        {/* Tabs Nequi / Bancolombia */}
        {(hasNequi || hasBancolombia) && (
          <>
            {hasNequi && hasBancolombia && (
              <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
                <button style={btnTab(tab === 'nequi', '#FF6B9D')} onClick={() => setTab('nequi')}>
                  📱 Nequi
                </button>
                <button style={btnTab(tab === 'bancolombia', '#6366F1')} onClick={() => setTab('bancolombia')}>
                  🏦 Bancolombia
                </button>
              </div>
            )}

            {/* ── Tab Nequi ── */}
            {(tab === 'nequi' || !hasBancolombia) && hasNequi && (
              <div style={{ marginBottom: '1.25rem' }}>
                {receptor?.qr_nequi_url ? (
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <img
                      src={receptor.qr_nequi_url}
                      alt="QR Nequi"
                      style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 16, border: '2px solid rgba(255,107,157,0.3)', background: 'white' }}
                    />
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>QR Nequi · {receptor.nombre}</p>
                  </div>
                ) : nequiDeepLink ? (
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <div style={{ display: 'inline-block', padding: 14, borderRadius: 16, background: 'white', border: '2px solid var(--border)', boxShadow: '0 4px 20px rgba(255,107,157,0.15)' }}>
                      <QRCodeSVG value={nequiDeepLink} size={160} level="M" fgColor="#2A1040" bgColor="white" />
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>Escanea con Nequi → apunta la cámara</p>
                  </div>
                ) : null}

                {receptor?.nequi && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 12, background: 'rgba(255,107,157,0.05)', border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>📱</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px' }}>NEQUI / DAVIPLATA</p>
                      <p style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{receptor.nequi}</p>
                    </div>
                    <button
                      onClick={() => copiar(receptor.nequi, 'nequi')}
                      style={{
                        fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
                        border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
                        background: copiado === 'nequi' ? 'var(--teal)' : 'var(--accent-bg)',
                        color: copiado === 'nequi' ? 'white' : 'var(--accent)',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                    >
                      {copiado === 'nequi' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab Bancolombia ── */}
            {(tab === 'bancolombia' || !hasNequi) && hasBancolombia && (
              <div style={{ marginBottom: '1.25rem' }}>
                {receptor?.qr_bancolombia_url ? (
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <img
                      src={receptor.qr_bancolombia_url}
                      alt="QR Bancolombia"
                      style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: 16, border: '2px solid rgba(99,102,241,0.3)', background: 'white' }}
                    />
                    <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>QR Bancolombia · {receptor.nombre}</p>
                  </div>
                ) : null}

                {receptor?.cuenta_bancaria && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                    borderRadius: 12, background: 'rgba(99,102,241,0.05)', border: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 20, flexShrink: 0 }}>🏦</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, letterSpacing: '0.5px' }}>CUENTA BANCARIA</p>
                      <p style={{ fontSize: 15, fontWeight: 700, marginTop: 1 }}>{receptor.cuenta_bancaria}</p>
                    </div>
                    <button
                      onClick={() => copiar(receptor.cuenta_bancaria, 'banco')}
                      style={{
                        fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8,
                        border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap',
                        background: copiado === 'banco' ? 'var(--teal)' : 'var(--blue-bg)',
                        color: copiado === 'banco' ? 'white' : 'var(--blue)',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                    >
                      {copiado === 'banco' ? '✓ Copiado' : 'Copiar'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Sin datos de pago */}
        {!hasNequi && !hasBancolombia && (
          <div style={{
            marginBottom: '1.25rem', padding: '12px 14px', borderRadius: 12,
            background: 'var(--gray-bg)', fontSize: 13, color: 'var(--gray)',
            fontWeight: 500, textAlign: 'center',
          }}>
            {receptor?.nombre} no tiene datos de pago aún.
            <br /><span style={{ fontSize: 12 }}>Agrégalos en Personas ⊙</span>
          </div>
        )}

        <button
          onClick={registrar}
          disabled={registrando}
          className="btn-gradient"
          style={{ width: '100%', padding: '12px', fontSize: 14, boxShadow: '0 6px 20px rgba(168,85,247,0.3)', opacity: registrando ? 0.7 : 1 }}
        >
          {registrando ? 'Registrando...' : '✓ Ya pagué — Marcar como pagado'}
        </button>
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', marginTop: 10 }}>
          Al marcar como pagado, la deuda se descuenta del balance automáticamente
        </p>
      </div>
    </div>
  )
}

/* ── Balance principal ───────────────────────────────────────── */
export default function Balance() {
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [pagos, setPagos] = useState([])
  const [mes, setMes] = useState(mesActual)
  const [loading, setLoading] = useState(true)
  const [pagoModal, setPagoModal] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      supabase.from('gastos').select('*').eq('mes', mes),
      supabase.from('personas').select('*'),
      supabase.from('pagos').select('*').eq('mes', mes),
    ]).then(([{ data: g }, { data: p }, { data: pg }]) => {
      setGastos(g || [])
      setPersonas(p || [])
      setPagos(pg || [])
      setLoading(false)
    })
  }, [mes])

  const calcBalance = () => {
    const n = personas.length
    const pagado = new Array(n).fill(0)
    const debe = personas.map(() => new Array(n).fill(0))

    gastos.forEach(g => {
      const payIdx = personas.findIndex(p => p.id === g.pagado_por)
      if (payIdx < 0) return
      pagado[payIdx] += Number(g.monto)
      const split = (g.split_entre || []).map(id => personas.findIndex(p => p.id === id)).filter(i => i >= 0)
      const parte = Number(g.monto) / split.length
      split.forEach(i => { if (i !== payIdx) debe[i][payIdx] += parte })
    })

    // Descontar pagos ya realizados
    pagos.forEach(pg => {
      const deIdx = personas.findIndex(p => p.id === pg.de_persona_id)
      const aIdx  = personas.findIndex(p => p.id === pg.a_persona_id)
      if (deIdx >= 0 && aIdx >= 0) {
        debe[deIdx][aIdx] = Math.max(0, debe[deIdx][aIdx] - Number(pg.monto))
      }
    })

    const net = personas.map((_, i) => {
      const aRecibir = debe.reduce((s, row) => s + row[i], 0)
      const aPagar   = debe[i].reduce((s, v) => s + v, 0)
      return aRecibir - aPagar
    })

    const transferencias = []
    const nc = [...net]
    for (let iter = 0; iter < 20; iter++) {
      const minI = nc.indexOf(Math.min(...nc))
      const maxI = nc.indexOf(Math.max(...nc))
      if (Math.abs(nc[minI]) < 1) break
      const amt = Math.min(-nc[minI], nc[maxI])
      if (amt < 1) break
      transferencias.push({ de: minI, a: maxI, monto: amt })
      nc[minI] += amt; nc[maxI] -= amt
    }

    return { pagado, net, transferencias }
  }

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const { pagado, net, transferencias } = personas.length
    ? calcBalance()
    : { pagado: [], net: [], transferencias: [] }

  const transferenciasPorPersona = personas.map(p =>
    pagos.filter(pg => pg.de_persona_id === p.id).reduce((s, pg) => s + Number(pg.monto), 0)
  )

  const eliminarPago = async (id) => {
    await supabase.from('pagos').delete().eq('id', id)
    setPagos(p => p.filter(x => x.id !== id))
  }

  const mesesOpts = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const key = format(d, 'yyyy-MM')
    return { key, label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  const inp = {
    padding: '9px 14px', fontSize: 13, fontWeight: 600,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
    fontFamily: 'var(--font)',
  }

  return (
    <div>
      <PageTitle title="Balance del hogar" sub="¿Quién debe qué a quién este mes?" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>Mes:</span>
        <select value={mes} onChange={e => setMes(e.target.value)} style={inp}>
          {mesesOpts.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>✦</span> Cargando...
        </p>
      ) : (
        <>
          {/* Métricas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(155px,1fr))', gap: 14, marginBottom: '1.75rem' }}>
            <MetricCard label="Total del mes"         value={fmt(total)}                                    color="var(--accent)"  accent="var(--grad-primary)" />
            <MetricCard label="Parte ideal / persona" value={fmt(total / Math.max(personas.length, 1))}    accent="linear-gradient(135deg,#6366F1,#A855F7)" />
            <MetricCard label="Pendientes"            value={transferencias.length}                         accent="linear-gradient(135deg,#FB923C,#F43F5E)" />
            <MetricCard label="Pagos realizados"      value={pagos.length}                                  accent="linear-gradient(135deg,#14B8A6,#6366F1)" />
          </div>

          {/* Transferencias pendientes */}
          <Card style={{ marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
              Transferencias pendientes
            </p>
            {transferencias.length === 0 ? (
              <p style={{ color: 'var(--text2)', fontSize: 14, textAlign: 'center', padding: '1.5rem', fontStyle: 'italic' }}>
                ¡Todo está en paz! Nadie debe nada este mes ✦
              </p>
            ) : transferencias.map((t, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0',
                borderBottom: i < transferencias.length - 1 ? '1px solid var(--border)' : 'none',
                flexWrap: 'wrap',
              }}>
                <Avatar nombre={personas[t.de]?.nombre} index={t.de} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>
                  <strong style={{ color: 'var(--text)' }}>{personas[t.de]?.nombre}</strong> debe pagar
                </span>
                <span style={{
                  fontSize: 15, fontWeight: 700, padding: '4px 14px',
                  border: '1.5px solid var(--border-strong)', borderRadius: 22,
                  color: 'var(--accent)',
                }}>
                  {fmt(t.monto)}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text2)' }}>a</span>
                <Avatar nombre={personas[t.a]?.nombre} index={t.a} />
                <strong style={{ fontSize: 14 }}>{personas[t.a]?.nombre}</strong>
                <button
                  onClick={() => setPagoModal(t)}
                  className="btn-gradient"
                  style={{ marginLeft: 'auto', padding: '7px 18px', fontSize: 13, boxShadow: '0 4px 14px rgba(168,85,247,0.3)' }}
                >
                  💳 Pagar
                </button>
              </div>
            ))}
          </Card>

          {/* Pagos registrados */}
          {pagos.length > 0 && (
            <Card style={{ marginBottom: '1.25rem' }}>
              <p style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
                Pagos registrados este mes
              </p>
              {pagos.map((pg, i) => {
                const de = personas.find(p => p.id === pg.de_persona_id)
                const a  = personas.find(p => p.id === pg.a_persona_id)
                return (
                  <div key={pg.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0',
                    borderBottom: i < pagos.length - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    <span style={{ fontSize: 16, color: 'var(--teal)', flexShrink: 0 }}>✓</span>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>
                      <strong>{de?.nombre}</strong> pagó{' '}
                      <strong style={{ color: 'var(--teal)' }}>{fmt(Number(pg.monto))}</strong>{' '}
                      a <strong>{a?.nombre}</strong>
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 500, flexShrink: 0 }}>
                      {pg.fecha}
                    </span>
                    <button
                      onClick={() => eliminarPago(pg.id)}
                      style={{ fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font)', padding: '2px 4px' }}
                    >✕</button>
                  </div>
                )
              })}
            </Card>
          )}

          {/* Detalle por persona */}
          <Card>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text2)', letterSpacing: '0.3px' }}>
              Detalle por persona
            </p>
            {personas.map((p, i) => {
              const diff = net[i] || 0
              const badge = Math.abs(diff) < 1
                ? { bg: 'var(--gray-bg)',  color: 'var(--gray)', text: 'Equilibrada ✦' }
                : diff > 0
                ? { bg: 'var(--teal-bg)',  color: 'var(--teal)', text: `Te deben ${fmt(diff)}` }
                : { bg: 'var(--red-bg)',   color: 'var(--red)',  text: `Debes ${fmt(-diff)}` }
              return (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: i < personas.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Avatar nombre={p.nombre} index={i} />
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{p.nombre}</p>
                      <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, fontWeight: 500 }}>
                        {pagado[i] > 0
                          ? <>Pagó <strong>{fmt(pagado[i])}</strong> en gastos</>
                          : 'No pagó gastos directos'}
                        {transferenciasPorPersona[i] > 0 && (
                          <span style={{ color: 'var(--teal)' }}> · Transfirió {fmt(transferenciasPorPersona[i])}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 22, background: badge.bg, color: badge.color }}>
                    {badge.text}
                  </span>
                </div>
              )
            })}
          </Card>
        </>
      )}

      {pagoModal && (
        <PagoModal
          transfer={pagoModal}
          personas={personas}
          mes={mes}
          onPagado={data => { if (data) setPagos(p => [...p, data]) }}
          onClose={() => setPagoModal(null)}
        />
      )}
    </div>
  )
}
