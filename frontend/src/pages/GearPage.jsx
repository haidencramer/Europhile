import { useEffect, useState } from 'react'
import { listGear, createGear, deleteGear } from '../api/client'

const EMPTY = { name: '', manufacturer: '', module_type: '', hp_width: '', notes: '' }

export default function GearPage() {
  const [gear,    setGear]    = useState([])
  const [form,    setForm]    = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  async function load() {
    try {
      setGear(await listGear())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { ...form, hp_width: form.hp_width ? parseInt(form.hp_width) : null }
    await createGear(payload)
    setForm(EMPTY)
    load()
  }

  async function handleDelete(id) {
    await deleteGear(id)
    setGear(g => g.filter(x => x.id !== id))
  }

  if (loading) return <p style={s.muted}>Loading gear…</p>
  if (error)   return <p style={{ color: '#e57' }}>Error: {error}</p>

  return (
    <div>
      <h1 style={s.h1}>Gear Catalogue</h1>

      <form onSubmit={handleSubmit} style={s.form}>
        <input required placeholder="Name"         value={form.name}         onChange={e => setForm(f => ({ ...f, name: e.target.value }))}         style={s.input} />
        <input required placeholder="Manufacturer" value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} style={s.input} />
        <input required placeholder="Type (VCO, VCF…)" value={form.module_type} onChange={e => setForm(f => ({ ...f, module_type: e.target.value }))} style={s.input} />
        <input          placeholder="HP width"     value={form.hp_width}     onChange={e => setForm(f => ({ ...f, hp_width: e.target.value }))}     style={{ ...s.input, width: 80 }} type="number" />
        <input          placeholder="Notes"        value={form.notes}        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}        style={s.input} />
        <button type="submit" style={s.btn}>Add Module</button>
      </form>

      <table style={s.table}>
        <thead>
          <tr>{['Name','Manufacturer','Type','HP','Notes',''].map(h =>
            <th key={h} style={s.th}>{h}</th>
          )}</tr>
        </thead>
        <tbody>
          {gear.map(g => (
            <tr key={g.id} style={s.tr}>
              <td style={s.td}>{g.name}</td>
              <td style={s.td}>{g.manufacturer}</td>
              <td style={s.td}><span style={s.badge}>{g.module_type}</span></td>
              <td style={s.td}>{g.hp_width ?? '—'}</td>
              <td style={s.td}>{g.notes || '—'}</td>
              <td style={s.td}>
                <button onClick={() => handleDelete(g.id)} style={s.del}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const s = {
  h1:    { color: '#e8c97a', marginBottom: 20, fontSize: 22 },
  muted: { color: '#666' },
  form:  { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 28 },
  input: { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '6px 10px', borderRadius: 4, fontSize: 13 },
  btn:   { background: '#e8c97a', color: '#111', border: 'none', padding: '6px 14px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th:    { textAlign: 'left', color: '#666', fontSize: 12, padding: '6px 10px', borderBottom: '1px solid #222' },
  tr:    { borderBottom: '1px solid #1c1c1c' },
  td:    { padding: '10px 10px', color: '#ccc', fontSize: 13 },
  badge: { background: '#1e2a1e', color: '#7ec87e', padding: '2px 8px', borderRadius: 10, fontSize: 12 },
  del:   { background: 'transparent', border: '1px solid #333', color: '#888', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
}
