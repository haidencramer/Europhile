import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPatches, createPatch, deletePatch, listGear } from '../api/client'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const EMPTY = { title: '', description: '', wiring_notes: '', gear_ids: [], bpm: '', key: '', tags: '' }

export default function PatchesPage() {
  const [patches,  setPatches]  = useState([])
  const [gear,     setGear]     = useState([])
  const [form,     setForm]     = useState(EMPTY)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [showForm, setShowForm] = useState(false)

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
    await createPatch({
      ...form,
      bpm: form.bpm ? parseInt(form.bpm) : null,
      key: form.key || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    setForm(EMPTY)
    setShowForm(false)
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
      <div style={s.pageHeader}>
        <h1 style={s.h1}>Patches</h1>
        <button onClick={() => setShowForm(v => !v)} style={s.btn}>
          {showForm ? 'Cancel' : '+ New Patch'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.row}>
            <div style={s.fg}>
              <label style={s.label}>Title *</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={s.input} placeholder="Limerence drone" />
            </div>
            <div style={s.fg}>
              <label style={s.label}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={s.input} placeholder="A generative ambient patch…" />
            </div>
            <div style={{ ...s.fg, flex: '0 0 80px' }}>
              <label style={s.label}>BPM</label>
              <input type="number" value={form.bpm} onChange={e => setForm(f => ({ ...f, bpm: e.target.value }))} style={s.input} placeholder="120" />
            </div>
            <div style={{ ...s.fg, flex: '0 0 90px' }}>
              <label style={s.label}>Key</label>
              <select value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} style={s.input}>
                <option value="">—</option>
                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div style={s.fg}>
            <label style={s.label}>Wiring notes</label>
            <textarea
              value={form.wiring_notes}
              onChange={e => setForm(f => ({ ...f, wiring_notes: e.target.value }))}
              style={s.textarea} rows={3}
              placeholder="Brains out 1 → Proton VCF in, Chaos CV out → Brains timbre…"
            />
          </div>
          <div style={s.fg}>
            <label style={s.label}>Tags (comma separated)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={s.input} placeholder="ambient, generative, drone" />
          </div>
          {gear.length > 0 && (
            <div style={s.gearPicker}>
              <span style={s.label}>Modules used:</span>
              <div style={s.chipRow}>
                {gear.map(g => (
                  <button type="button" key={g.id} onClick={() => toggleGear(g.id)}
                    style={{ ...s.chip, ...(form.gear_ids.includes(g.id) ? s.chipActive : {}) }}>
                    {g.name}
                    {g.hp_width ? <span style={s.chipHp}>{g.hp_width}hp</span> : null}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="submit" style={s.btn}>Create Patch</button>
        </form>
      )}

      <div style={s.grid}>
        {patches.length === 0 && <p style={s.muted}>No patches yet.</p>}
        {patches.map(p => (
          <Link to={`/patches/${p.id}`} key={p.id} style={s.card}>
            <div style={s.cardTop}>
              <span style={s.cardTitle}>{p.title}</span>
              <span style={s.audioCount}>
                {p.audio_files?.length ?? 0} rec{p.audio_files?.length !== 1 ? 's' : ''}
              </span>
            </div>
            {p.description && <p style={s.cardDesc}>{p.description}</p>}
            <div style={s.cardMeta}>
              {p.bpm            && <span style={s.pill}>{p.bpm} BPM</span>}
              {p.key            && <span style={s.pill}>Key of {p.key}</span>}
              {p.gear_ids?.length > 0 && <span style={s.pill}>{p.gear_ids.length} modules</span>}
            </div>
            {p.tags?.length > 0 && (
              <div style={s.tags}>
                {p.tags.map(t => <span key={t} style={s.tag}>#{t}</span>)}
              </div>
            )}
            <button onClick={e => handleDelete(e, p.id)} style={s.del}>Delete</button>
          </Link>
        ))}
      </div>
    </div>
  )
}

const s = {
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  h1:          { color: '#e8c97a', fontSize: 22, margin: 0 },
  muted:       { color: '#555', fontSize: 13 },
  btn:         { background: '#e8c97a', color: '#111', border: 'none', padding: '7px 16px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  form:        { display: 'flex', flexDirection: 'column', gap: 12, background: '#111', padding: 20, borderRadius: 8, border: '1px solid #222', marginBottom: 28 },
  row:         { display: 'flex', gap: 12, flexWrap: 'wrap' },
  fg:          { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 140 },
  label:       { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '6px 10px', borderRadius: 4, fontSize: 13 },
  textarea:    { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '8px 10px', borderRadius: 4, fontSize: 13, resize: 'vertical' },
  gearPicker:  { display: 'flex', flexDirection: 'column', gap: 8 },
  chipRow:     { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip:        { background: '#1a1a1a', border: '1px solid #333', color: '#888', padding: '4px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  chipActive:  { background: '#1e2a1e', border: '1px solid #4a7a4a', color: '#7ec87e' },
  chipHp:      { color: '#444', fontSize: 10 },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card:        { display: 'block', background: '#111', border: '1px solid #222', borderRadius: 8, padding: 16, textDecoration: 'none' },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle:   { color: '#e8c97a', fontWeight: 600, fontSize: 15 },
  audioCount:  { color: '#555', fontSize: 12 },
  cardDesc:    { color: '#aaa', fontSize: 13, margin: '4px 0 8px' },
  cardMeta:    { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  pill:        { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777', padding: '2px 8px', borderRadius: 10, fontSize: 11 },
  tags:        { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 },
  tag:         { color: '#5a7a9a', fontSize: 11 },
  del:         { marginTop: 10, background: 'transparent', border: '1px solid #2a2a2a', color: '#444', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
}