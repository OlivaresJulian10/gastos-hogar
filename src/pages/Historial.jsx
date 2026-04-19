import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Card, PageTitle, Badge, Avatar, fmt, CATEGORIAS } from '../components/UI'
import { format, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

export default function Historial() {
  const [gastos, setGastos] = useState([])
  const [personas, setPersonas] = useState([])
  const [filtros, setFiltros] = useState({ mes: format(new Date(), 'yyyy-MM'), cat: '', quien: '' })
  const [loading, setLoading] = useState(true)

  const mesesDisponibles = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(new Date(), i)
    return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy', { locale: es }) }
  })

  useEffect(() => {
    supabase.from('personas').select('*').then(({ data }) => setPersonas(data || []))
  }, [])

  useEffect(() => {
    setLoading(true)
    let q = supabase.from('gastos').select('*').order('fecha', { ascending: false })
    if (filtros.mes) q = q.eq('mes', filtros.mes)
    if (filtros.cat) q = q.eq('categoria', filtros.cat)
    if (filtros.quien) q = q.eq('pagado_por', filtros.quien)
    q.then(({ data }) => { setGastos(data || []); setLoading(false) })
  }, [filtros])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    setGastos(g => g.filter(x => x.id !== id))
  }

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)
  const inp = { padding: '8px 12px', fontSize: 13, border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)' }

  return (
    <div>
      <PageTitle title="Historial de gastos" sub="Consulta y filtra todos los gastos del hogar" />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        <select value={filtros.mes} onChange={e => setFiltros(f => ({ ...f, mes: e.target.value }))} style={inp}>
          <option value="">Todos los meses</option>
          {mesesDisponibles.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={filtros.cat} onChange={e => setFiltros(f => ({ ...f, cat: e.target.value }))} style={inp}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtros.quien} onChange={e => setFiltros(f => ({ ...f, quien: e.target.value }))} style={inp}>
          <option value="">Todas las personas</option>
          {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{gastos.length} gastos ·</span>
          <span style={{ fontWeight: 600 }}>{fmt(total)}</span>
        </div>
      </div>

      <Card>
        {loading && <p style={{ color: 'var(--text3)', fontSize: 14 }}>Cargando...</p>}
        {!loading && gastos.length === 0 && (
          <p style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: '2rem' }}>
            No hay gastos con estos filtros.
          </p>
        )}
        {!loading && gastos.map((g, idx) => {
          const persona = personas.find(p => p.id === g.pagado_por)
          const pIdx = personas.findIndex(p => p.id === g.pagado_por)
          const splitNombres = (g.split_entre || [])
            .map(id => personas.find(p => p.id === id)?.nombre).filter(Boolean).join(', ')
          return (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0',
              borderBottom: idx < gastos.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <Avatar nombre={persona?.nombre} index={pIdx} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{g.descripcion}</span>
                  <Badge label={g.categoria} cat={g.categoria} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {g.fecha} · Pagó: {persona?.nombre || '—'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>Dividido: {splitNombres || '—'}</p>
                {g.notas && <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>{g.notas}</p>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{fmt(g.monto)}</span>
                <button onClick={() => eliminar(g.id)} style={{
                  fontSize: 11, color: 'var(--red)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 6px',
                }}>Eliminar</button>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
