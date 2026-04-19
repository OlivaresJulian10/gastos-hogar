import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
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
    if (filtros.mes)   q = q.eq('mes', filtros.mes)
    if (filtros.cat)   q = q.eq('categoria', filtros.cat)
    if (filtros.quien) q = q.eq('pagado_por', filtros.quien)
    q.then(({ data }) => { setGastos(data || []); setLoading(false) })
  }, [filtros])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('gastos').delete().eq('id', id)
    setGastos(g => g.filter(x => x.id !== id))
  }

  const exportarExcel = () => {
    const datos = gastos.map(g => {
      const persona = personas.find(p => p.id === g.pagado_por)
      const split = (g.split_entre || [])
        .map(id => personas.find(p => p.id === id)?.nombre)
        .filter(Boolean).join(', ')
      return {
        'Fecha': g.fecha,
        'Descripción': g.descripcion,
        'Monto (COP)': Number(g.monto),
        'Categoría': g.categoria,
        'Pagado por': persona?.nombre || '—',
        'Dividido entre': split || '—',
        'Notas': g.notas || '',
      }
    })
    const ws = XLSX.utils.json_to_sheet(datos)
    ws['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 24 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, `gastos-${filtros.mes || 'todos'}.xlsx`)
  }

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0)

  const inp = {
    padding: '8px 14px', fontSize: 13, fontWeight: 500,
    border: '1px solid var(--border-strong)', borderRadius: 10,
    background: 'var(--surface)', color: 'var(--text)',
    outline: 'none', cursor: 'pointer',
  }

  return (
    <div>
      <PageTitle title="Historial de gastos" sub="Consulta, filtra y exporta todos los gastos del hogar" />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'center' }}>
        <select value={filtros.mes} onChange={e => setFiltros(f => ({ ...f, mes: e.target.value }))} style={inp}>
          <option value="">Todos los meses</option>
          {mesesDisponibles.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={filtros.cat} onChange={e => setFiltros(f => ({ ...f, cat: e.target.value }))} style={inp}>
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select>
        <select value={filtros.quien} onChange={e => setFiltros(f => ({ ...f, quien: e.target.value }))} style={inp}>
          <option value="">Todas las personas</option>
          {personas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 500 }}>
            {gastos.length} gastos ·{' '}
            <span style={{ fontWeight: 700, color: 'var(--accent)' }}>{fmt(total)}</span>
          </span>

          <button
            onClick={exportarExcel}
            disabled={gastos.length === 0}
            style={{
              padding: '9px 18px',
              background: gastos.length === 0
                ? 'var(--gray-bg)'
                : 'linear-gradient(135deg, #FF6B9D 0%, #A855F7 100%)',
              color: gastos.length === 0 ? 'var(--gray)' : 'white',
              border: 'none',
              borderRadius: 11,
              fontSize: 13,
              fontWeight: 700,
              cursor: gastos.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              transition: 'opacity 0.2s, transform 0.18s',
              boxShadow: gastos.length > 0 ? '0 4px 16px rgba(168,85,247,0.3)' : 'none',
              letterSpacing: '0.2px',
            }}
            onMouseEnter={e => { if (gastos.length > 0) { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-2px)' } }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <span style={{ fontSize: 15 }}>↓</span> Exportar Excel
          </button>
        </div>
      </div>

      <Card>
        {loading && (
          <p style={{ color: 'var(--text3)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✦</span> Cargando...
          </p>
        )}
        {!loading && gastos.length === 0 && (
          <p style={{ color: 'var(--text3)', fontSize: 14, textAlign: 'center', padding: '2.5rem', fontStyle: 'italic' }}>
            No hay gastos con estos filtros ✦
          </p>
        )}
        {!loading && gastos.map((g, idx) => {
          const persona = personas.find(p => p.id === g.pagado_por)
          const pIdx = personas.findIndex(p => p.id === g.pagado_por)
          const splitNombres = (g.split_entre || [])
            .map(id => personas.find(p => p.id === id)?.nombre).filter(Boolean).join(', ')
          return (
            <div key={g.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 13, padding: '12px 0',
              borderBottom: idx < gastos.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <Avatar nombre={persona?.nombre} index={pIdx >= 0 ? pIdx : 0} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{g.descripcion}</span>
                  <Badge label={g.categoria} cat={g.categoria} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 3, fontWeight: 500 }}>
                  {g.fecha} · Pagó: {persona?.nombre || '—'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text3)' }}>Dividido: {splitNombres || '—'}</p>
                {g.notas && (
                  <p style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginTop: 2 }}>
                    "{g.notas}"
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                <span style={{
                  fontWeight: 700, fontSize: 15,
                  background: 'var(--grad-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {fmt(g.monto)}
                </span>
                <button onClick={() => eliminar(g.id)} style={{
                  fontSize: 11, color: 'var(--coral)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '2px 6px', fontWeight: 600, fontFamily: 'var(--font)',
                }}>
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
