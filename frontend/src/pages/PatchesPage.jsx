import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPatches, createPatch, deletePatch } from '../api/client'
import { listGear } from '../api/client'

const EMPTY = { title: '', description: '', wiring_notes: '', gear_ids: [] }

export default function PatchesPage() {
  const [patches, setPatches] = useState([])
  const [gear,    setGear]    = useState([])
  const [form,    setForm]    = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  async function load() {
    try {
      const [p, g] = await Promise.all([listPatches(), listGear()])
      setPatches(p)
      setGear(g)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function toggleGear(id) {
    setForm(f => ({
      ...f,
      gear_ids: f.gear_ids.includes(id)
        ? f.gear_ids.filter(x => x !== id)
        : [...f.gear_ids, id],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    await createPatch(form)
    setForm(EMPTY)
    load()
  }

  async function handleDelete(e, id) {
    e.preventDefault()
    e.stopPropagation()
    await deletePatch(id)
    setPatches(p => p.filter(x => x.id !== id))
  }

  if (loading) return <p style={s.muted}>Loading patches…</p>
  if (error)   return <p style={{ color: '#e57' }}>Error: {error}</p>

  return (
    <div>
      <h1 style={s.h1}>Patches</h1>

      <form onSubmit={handleSubmit} style={s.form}>
        <div style={s.row}>
          <input
            required placeholder="Patch title"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={s.input}
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={{ ...s.input, flex: 2 }}
          />
        </div>
        <textarea
          placeholder="Wiring notes — describe how your rack is patched…"
          value={form.wiring_notes}
          onChange={e => setForm(f => ({ ...f, wiring_notes: e.target.value }))}
          style={s.textarea}
          rows={3}
        />
        {gear.length > 0 && (
          <div style={s.gearPicker}>
            <span style={s.label}>Modules used:</span>
            {gear.map(g => (
              <button
                type="button"
                key={g.id}
                onClick={() => toggleGear(g.id)}
                style={{
                  ...s.chip,
                  ...(form.gear_ids.includes(g.id) ? s.chipActive : {}),
                }}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}
        <button type="submit" style={s.btn}>Create Patch</button>
      </form>

      <div style={s.grid}>
        {patches.length === 0 && <p style={s.muted}>No patches yet.</p>}
        {patches.map(p => (
          <Link to={`/patches/${p.id}`} key={p.id} style={s.card}>
            <div style={s.cardTop}>
              <span style={s.cardTitle}>{p.title}</span>
              <span style={s.audioCount}>
                {p.audio_files?.length ?? 0} recording{p.audio_files?.length !== 1 ? 's' : ''}
              </span>
            </div>
            {p.description && <p style={s.cardDesc}>{p.description}</p>}
            {p.gear_ids?.length > 0 && (
              <p style={s.cardMeta}>
                {p.gear_ids.length} module{p.gear_ids.length !== 1 ? 's' : ''}
              </p>
            )}
            <button onClick={e => handleDelete(e, p.id)} style={s.del}>Delete</button>
          </Link>
        ))}
      </div>
    </div>
  )
}

const s = {
  h1:        { color: '#e8c97a', marginBottom: 20, fontSize: 22 },
  muted:     { color: '#666' },
  form:      { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32, background: '#111', padding: 16, borderRadius: 8, border: '1px solid #222' },
  row:       { display: 'flex', gap: 10 },
  input:     { flex: 1, background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '6px 10px', borderRadius: 4, fontSize: 13 },
  textarea:  { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '8px 10px', borderRadius: 4, fontSize: 13, resize: 'vertical' },
  gearPicker:{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  label:     { color: '#666', fontSize: 12, marginRight: 4 },
  chip:      { background: '#1a1a1a', border: '1px solid #333', color: '#888', padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer' },
  chipActive:{ background: '#1e2a1e', border: '1px solid #4a7a4a', color: '#7ec87e' },
  btn:       { alignSelf: 'flex-start', background: '#e8c97a', color: '#111', border: 'none', padding: '7px 16px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  grid:      { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card:      { display: 'block', background: '#111', border: '1px solid #222', borderRadius: 8, padding: 16, textDecoration: 'none', position: 'relative' },
  cardTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { color: '#e8c97a', fontWeight: 600, fontSize: 15 },
  audioCount:{ color: '#666', fontSize: 12 },
  cardDesc:  { color: '#aaa', fontSize: 13, margin: '4px 0' },
  cardMeta:  { color: '#555', fontSize: 12, margin: '4px 0' },
  del:       { marginTop: 10, background: 'transparent', border: '1px solid #2a2a2a', color: '#555', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 },
}
