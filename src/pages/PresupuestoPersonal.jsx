import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Card, PageTitle, fmt } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

export default function PresupuestoPersonal() {
  const { user, perfil } = useAuth()
  const mesActual = format(new Date(), 'yyyy-MM')
  const [mes, setMes] = useState(mesActual)
  const [form, setForm] = useState({ descripcion: '', monto: '' })
  const [presupuestos, setPresupuestos] = useState([])
  const [msg, setMsg] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const mesesOpts = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  useEffect(() => { cargar() }, [mes])

  async function cargar() {
    const { data } = await supabase
      .from('presupuestos_personales')
      .select('*')
      .eq('mes', mes)
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
    setPresupuestos(data || [])
  }

  const guardar = async () => {
    if (!form.descripcion.trim() || !form.monto) {
      setMsg({ tipo: 'error', texto: 'Completa la descripción y el monto.' }); return
    }
    const val = parseFloat(form.monto)
    if (!val || val <= 0) {
      setMsg({ tipo: 'error', texto: 'El monto debe ser mayor a cero.' }); return
    }
    setGuardando(true)
    const { error } = await supabase.from('presupuestos_personales').insert([{
      usuario_id: user.id, mes,
      descripcion: form.descripcion.trim(),
      monto: val,
    }])
    setGuardando(false)
    if (error) { setMsg({ tipo: 'error', texto: 'Error: ' + error.message }); return }
    setForm({ descripcion: '', monto: '' })
    setMsg({ tipo: 'ok', texto: '¡Añadido! ✦' })
    setTimeout(() => setMsg(null), 2500)
    cargar()
  }

  const eliminar = async (id) => {
    await supabase.from('presupuestos_personales').delete().eq('id', id).eq('usuario_id', user.id)
    setPresupuestos(p => p.filter(x => x.id !== id))
  }

  const total = presupuestos.reduce((s, p) => s + Number(p.monto), 0)

  const inp = {
    padding: '10px 14px', fontSize: 14, fontWeight: 500,
    border: '1px solid var(--border-strong)', borderRadius: 11,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', fontFamily: 'var(--font)', width: '100%',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  }
  const lbl = {
    fontSize: 12, color: 'var(--text2)', fontWeight: 700,
    letterSpacing: '0.5px', textTransform: 'uppercase', display: 'block', marginBottom: 6,
  }
  const focusIn  = e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(217,70,168,0.12)' }
  const focusOut = e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = '' }

  return (
    <div>
      <PageTitle
        title="Mi presupuesto personal"
        sub={`Solo tú puedes ver estos datos · ${perfil?.nombre || ''}`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '1.5rem', alignItems: 'start' }}>

        <Card>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: '1.25rem', letterSpacing: '0.3px' }}>
            Añadir partida
          </p>

          {msg && (
            <div style={{
              padding: '9px 14px', borderRadius: 10, marginBottom: '1rem', fontSize: 13, fontWeight: 600,
              background: msg.tipo === 'ok' ? 'linear-gradient(135deg,rgba(20,184,166,0.12),rgba(99,102,241,0.08))' : 'var(--red-bg)',
              color: msg.tipo === 'ok' ? 'var(--teal)' : 'var(--red)',
              border: `1px solid ${msg.tipo === 'ok' ? 'rgba(20,184,166,0.25)' : 'rgba(244,63,94,0.2)'}`,
            }}>
              {msg.texto}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={lbl}>Mes</label>
              <select value={mes} onChange={e => setMes(e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {mesesOpts.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Descripción *</label>
              <input
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Ropa, ahorro, salidas..."
                style={inp} onFocus={focusIn} onBlur={focusOut}
              />
            </div>
            <div>
              <label style={lbl}>Monto (COP) *</label>
              <input
                type="number" value={form.monto}
                onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                placeholder="0" min="0" step="10000"
                style={inp} onFocus={focusIn} onBlur={focusOut}
                onKeyDown={e => e.key === 'Enter' && guardar()}
              />
            </div>
            <button
              onClick={guardar} disabled={guardando}
              className="btn-gradient"
              style={{ padding: '11px', fontSize: 14, opacity: guardando ? 0.7 : 1, boxShadow: '0 6px 24px rgba(168,85,247,0.28)' }}
            >
              {guardando ? 'Guardando...' : '✦ Añadir partida'}
            </button>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', letterSpacing: '0.3px' }}>
              {format(new Date(mes + '-01'), 'MMMM yyyy', { locale: es })}
            </p>
            {total > 0 && (
              <span style={{
                fontWeight: 700, fontSize: 16,
                background: 'var(--grad-primary)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {fmt(total)} total
              </span>
            )}
          </div>

          {presupuestos.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13, textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
              No tienes partidas para este mes ✦
            </p>
          ) : presupuestos.map((p, i) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 0',
              borderBottom: i < presupuestos.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700 }}>{p.descripcion}</p>
                <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {format(new Date(p.created_at), "dd/MM/yyyy · HH:mm")}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <span style={{
                  fontWeight: 700, fontSize: 15,
                  background: 'var(--grad-primary)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {fmt(Number(p.monto))}
                </span>
                <button onClick={() => eliminar(p.id)} style={{
                  fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none',
                  cursor: 'pointer', fontWeight: 700, fontFamily: 'var(--font)',
                }}>
                  ✕
                </button>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
