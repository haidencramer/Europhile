import { useEffect, useState } from 'react'
import { listGear, createGear, updateGear, deleteGear } from '../api/client'

const CATEGORIES = ['oscillator','filter','envelope','amplifier','LFO','sequencer','effects','utility','mixer','sampler','semi-modular','other']
const CONDITIONS = ['Mint','Good','Fair']
const EMPTY = {
  name: '', manufacturer: '', module_type: '', category: '',
  hp_width: '', rack_row: '', rack_position: '',
  power_positive: '', power_negative: '',
  cv_inputs: '', cv_outputs: '', audio_inputs: '', audio_outputs: '',
  purchase_price: '', condition: 'Good', notes: ''
}

function PriceTag({ price }) {
  const [show, setShow] = useState(false)
  return (
    <div onClick={() => setShow(v => !v)} style={{ color: show ? '#888' : '#333', fontSize: 12, marginBottom: 4, cursor: 'pointer', userSelect: 'none' }}>
      {show ? `$${price.toFixed(2)}` : '$ ••••'}
    </div>
  )
}

function TotalValue({ value }) {
  const [show, setShow] = useState(false)
  return (
    <div style={s.stat} onClick={() => setShow(v => !v)} title="Click to reveal">
      <span style={{ ...s.statVal, cursor: 'pointer', userSelect: 'none' }}>
        {show ? `$${value.toFixed(0)}` : '$••••'}
      </span>
      <span style={s.statLabel}>rack value</span>
    </div>
  )
}

function GearForm({ initial, onSubmit, onCancel, submitLabel }) {
  const [form, setForm] = useState(initial)
  function f(key) { return e => setForm(p => ({ ...p, [key]: e.target.value })) }
  function num(val) { return val === '' ? null : Number(val) }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      name: form.name, manufacturer: form.manufacturer,
      module_type: form.module_type, category: form.category || null,
      hp_width: num(form.hp_width), rack_row: num(form.rack_row),
      rack_position: num(form.rack_position),
      power_positive: num(form.power_positive), power_negative: num(form.power_negative),
      cv_inputs: num(form.cv_inputs), cv_outputs: num(form.cv_outputs),
      audio_inputs: num(form.audio_inputs), audio_outputs: num(form.audio_outputs),
      purchase_price: num(form.purchase_price),
      condition: form.condition || null, notes: form.notes || null
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={s.formGrid}>
        <div style={s.formGroup}>
          <label style={s.label}>Name *</label>
          <input required value={form.name} onChange={f('name')} style={s.input} placeholder="Plaits" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Manufacturer *</label>
          <input required value={form.manufacturer} onChange={f('manufacturer')} style={s.input} placeholder="Mutable Instruments" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Module type *</label>
          <input required value={form.module_type} onChange={f('module_type')} style={s.input} placeholder="VCO" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Category</label>
          <select value={form.category} onChange={f('category')} style={s.input}>
            <option value="">— select —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>HP width</label>
          <input type="number" value={form.hp_width} onChange={f('hp_width')} style={s.input} placeholder="16" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Rack row</label>
          <input type="number" value={form.rack_row} onChange={f('rack_row')} style={s.input} placeholder="1" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Rack position (HP)</label>
          <input type="number" value={form.rack_position} onChange={f('rack_position')} style={s.input} placeholder="1" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>+12V draw (mA)</label>
          <input type="number" value={form.power_positive} onChange={f('power_positive')} style={s.input} placeholder="120" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>-12V draw (mA)</label>
          <input type="number" value={form.power_negative} onChange={f('power_negative')} style={s.input} placeholder="30" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>CV inputs</label>
          <input type="number" value={form.cv_inputs} onChange={f('cv_inputs')} style={s.input} placeholder="3" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>CV outputs</label>
          <input type="number" value={form.cv_outputs} onChange={f('cv_outputs')} style={s.input} placeholder="1" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Audio inputs</label>
          <input type="number" value={form.audio_inputs} onChange={f('audio_inputs')} style={s.input} placeholder="1" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Audio outputs</label>
          <input type="number" value={form.audio_outputs} onChange={f('audio_outputs')} style={s.input} placeholder="2" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Purchase price ($)</label>
          <input type="number" value={form.purchase_price} onChange={f('purchase_price')} style={s.input} placeholder="299" />
        </div>
        <div style={s.formGroup}>
          <label style={s.label}>Condition</label>
          <select value={form.condition} onChange={f('condition')} style={s.input}>
            {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ ...s.formGroup, gridColumn: '1 / -1' }}>
          <label style={s.label}>Notes</label>
          <textarea value={form.notes} onChange={f('notes')} style={{ ...s.input, height: 72, resize: 'vertical' }} placeholder="Any notes about this module…" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" style={s.btn}>{submitLabel}</button>
        <button type="button" onClick={onCancel} style={s.btnGhost}>Cancel</button>
      </div>
    </form>
  )
}

function EditModal({ gear, onSave, onClose }) {
  const initial = {
    name:           gear.name || '',
    manufacturer:   gear.manufacturer || '',
    module_type:    gear.module_type || '',
    category:       gear.category || '',
    hp_width:       gear.hp_width ?? '',
    rack_row:       gear.rack_row ?? '',
    rack_position:  gear.rack_position ?? '',
    power_positive: gear.power_positive ?? '',
    power_negative: gear.power_negative ?? '',
    cv_inputs:      gear.cv_inputs ?? '',
    cv_outputs:     gear.cv_outputs ?? '',
    audio_inputs:   gear.audio_inputs ?? '',
    audio_outputs:  gear.audio_outputs ?? '',
    purchase_price: gear.purchase_price ?? '',
    condition:      gear.condition || 'Good',
    notes:          gear.notes || '',
  }

  return (
    <div style={s.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={s.modal}>
        <div style={s.modalHeader}>
          <h2 style={s.modalTitle}>Edit — {gear.name}</h2>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>
        <div style={s.modalBody}>
          <GearForm
            initial={initial}
            onSubmit={onSave}
            onCancel={onClose}
            submitLabel="Save changes"
          />
        </div>
      </div>
    </div>
  )
}

export default function GearPage() {
  const [gear,        setGear]        = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [showForm,    setShowForm]    = useState(false)
  const [editTarget,  setEditTarget]  = useState(null)
  const [filterCat,   setFilterCat]   = useState('all')
  const [filterMfr,   setFilterMfr]   = useState('all')
  const [sortBy,      setSortBy]      = useState('name')

  async function load() {
    try { setGear(await listGear()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(payload) {
    await createGear(payload)
    setShowForm(false)
    load()
  }

  async function handleEdit(payload) {
    await updateGear(editTarget.id, payload)
    setEditTarget(null)
    load()
  }

  async function handleDelete(id) {
    await deleteGear(id)
    setGear(g => g.filter(x => x.id !== id))
  }

  const manufacturers = ['all', ...new Set(gear.map(g => g.manufacturer).filter(Boolean).sort())]

  const filtered = gear
    .filter(g => filterCat === 'all' || g.category === filterCat)
    .filter(g => filterMfr === 'all' || g.manufacturer === filterMfr)
    .sort((a, b) => {
      if (sortBy === 'name')         return a.name.localeCompare(b.name)
      if (sortBy === 'hp')           return (b.hp_width || 0) - (a.hp_width || 0)
      if (sortBy === 'power')        return ((b.power_positive || 0) + (b.power_negative || 0)) - ((a.power_positive || 0) + (a.power_negative || 0))
      if (sortBy === 'manufacturer') return a.manufacturer.localeCompare(b.manufacturer)
      return 0
    })

  const totalHP    = gear.reduce((s, g) => s + (g.hp_width || 0), 0)
  const totalPos12 = gear.reduce((s, g) => s + (g.power_positive || 0), 0)
  const totalNeg12 = gear.reduce((s, g) => s + (g.power_negative || 0), 0)
  const totalValue = gear.reduce((s, g) => s + (g.purchase_price || 0), 0)

  if (loading) return <p style={s.muted}>Loading gear…</p>
  if (error)   return <p style={{ color: '#e57' }}>Error: {error}</p>

  return (
    <div>
      {editTarget && (
        <EditModal
          gear={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      <div style={s.pageHeader}>
        <h1 style={s.h1}>Gear Catalogue</h1>
        <button onClick={() => setShowForm(v => !v)} style={s.btn}>
          {showForm ? 'Cancel' : '+ Add Module'}
        </button>
      </div>

      {/* Stats bar */}
      <div style={s.statsBar}>
        <div style={s.stat}><span style={s.statVal}>{gear.length}</span><span style={s.statLabel}>modules</span></div>
        <div style={s.stat}><span style={s.statVal}>{totalHP}</span><span style={s.statLabel}>total HP</span></div>
        <div style={s.stat}><span style={s.statVal}>{totalPos12}mA</span><span style={s.statLabel}>+12V draw</span></div>
        <div style={s.stat}><span style={s.statVal}>{totalNeg12}mA</span><span style={s.statLabel}>-12V draw</span></div>
        {totalValue > 0 && <TotalValue value={totalValue} />}
      </div>

      {/* Add module form */}
      {showForm && (
        <div style={s.form}>
          <GearForm
            initial={EMPTY}
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            submitLabel="Add Module"
          />
        </div>
      )}

      {/* Filters */}
      <div style={s.filters}>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={s.filterSelect}>
          <option value="all">All categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterMfr} onChange={e => setFilterMfr(e.target.value)} style={s.filterSelect}>
          {manufacturers.map(m => <option key={m} value={m}>{m === 'all' ? 'All manufacturers' : m}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={s.filterSelect}>
          <option value="name">Sort: name</option>
          <option value="manufacturer">Sort: manufacturer</option>
          <option value="hp">Sort: HP largest</option>
          <option value="power">Sort: power draw</option>
        </select>
        <span style={s.muted}>{filtered.length} module{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Gear cards */}
      <div style={s.grid}>
        {filtered.length === 0 && <p style={s.muted}>No modules match your filters.</p>}
        {filtered.map(g => (
          <div key={g.id} style={s.card}>
            <div style={s.cardHeader}>
              <div>
                <div style={s.cardName}>{g.name}</div>
                <div style={s.cardMfr}>{g.manufacturer}</div>
              </div>
              <div style={s.cardBadges}>
                {g.category  && <span style={s.badge}>{g.category}</span>}
                {g.condition && <span style={{ ...s.badge, ...conditionColor(g.condition) }}>{g.condition}</span>}
              </div>
            </div>
            <div style={s.cardStats}>
              {g.hp_width       && <span style={s.pill}>{g.hp_width}hp</span>}
              {g.power_positive && <span style={{ ...s.pill, color: '#7ec87e' }}>+{g.power_positive}mA</span>}
              {g.power_negative && <span style={{ ...s.pill, color: '#e87e7e' }}>-{g.power_negative}mA</span>}
              {g.cv_inputs      && <span style={s.pill}>{g.cv_inputs} CV in</span>}
              {g.cv_outputs     && <span style={s.pill}>{g.cv_outputs} CV out</span>}
              {g.audio_outputs  && <span style={s.pill}>{g.audio_outputs} audio out</span>}
            </div>
            {g.rack_row && g.rack_position && (
              <div style={s.cardRow}>Row {g.rack_row}, slot {g.rack_position}</div>
            )}
            {g.purchase_price && <PriceTag price={g.purchase_price} />}
            {g.notes && <div style={s.cardNotes}>{g.notes}</div>}
            <div style={s.cardActions}>
              <button onClick={() => setEditTarget(g)} style={s.editBtn}>Edit</button>
              <button onClick={() => handleDelete(g.id)} style={s.del}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function conditionColor(c) {
  if (c === 'Mint') return { background: '#1a2e1a', color: '#7ec87e', borderColor: '#3a6a3a' }
  if (c === 'Good') return { background: '#1a1a2e', color: '#7e9ec8', borderColor: '#3a3a6a' }
  return { background: '#2e1a1a', color: '#c87e7e', borderColor: '#6a3a3a' }
}

const s = {
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  h1:           { color: '#e8c97a', fontSize: 22, margin: 0 },
  muted:        { color: '#555', fontSize: 13 },
  btn:          { background: '#e8c97a', color: '#111', border: 'none', padding: '7px 16px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  btnGhost:     { background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  statsBar:     { display: 'flex', gap: 24, marginBottom: 24, padding: '12px 20px', background: '#111', borderRadius: 8, border: '1px solid #222', flexWrap: 'wrap' },
  stat:         { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statVal:      { color: '#e8c97a', fontSize: 20, fontWeight: 700 },
  statLabel:    { color: '#555', fontSize: 11, marginTop: 2 },
  form:         { background: '#111', border: '1px solid #222', borderRadius: 8, padding: 20, marginBottom: 24 },
  formGrid:     { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 16 },
  formGroup:    { display: 'flex', flexDirection: 'column', gap: 4 },
  label:        { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '6px 10px', borderRadius: 4, fontSize: 13 },
  filters:      { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
  filterSelect: { background: '#1a1a1a', border: '1px solid #333', color: '#aaa', padding: '5px 10px', borderRadius: 4, fontSize: 13 },
  grid:         { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 },
  card:         { background: '#111', border: '1px solid #222', borderRadius: 8, padding: 16 },
  cardHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  cardName:     { color: '#e8c97a', fontWeight: 600, fontSize: 15 },
  cardMfr:      { color: '#666', fontSize: 12, marginTop: 2 },
  cardBadges:   { display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' },
  badge:        { background: '#1e2a1e', color: '#7ec87e', border: '1px solid #3a5a3a', padding: '2px 8px', borderRadius: 10, fontSize: 11 },
  cardStats:    { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill:         { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#888', padding: '2px 8px', borderRadius: 10, fontSize: 11 },
  cardRow:      { color: '#555', fontSize: 12, marginBottom: 4 },
  cardNotes:    { color: '#777', fontSize: 12, marginTop: 6, fontStyle: 'italic', borderTop: '1px solid #1c1c1c', paddingTop: 8 },
  cardActions:  { display: 'flex', gap: 8, marginTop: 10 },
  editBtn:      { background: 'transparent', border: '1px solid #333', color: '#888', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
  del:          { background: 'transparent', border: '1px solid #2a2a2a', color: '#444', padding: '3px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 11 },
  overlay:      { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal:        { background: '#111', border: '1px solid #333', borderRadius: 10, width: '100%', maxWidth: 800, maxHeight: '90vh', display: 'flex', flexDirection: 'column' },
  modalHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #222' },
  modalTitle:   { color: '#e8c97a', fontSize: 16, fontWeight: 600, margin: 0 },
  closeBtn:     { background: 'transparent', border: 'none', color: '#555', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  modalBody:    { padding: 20, overflowY: 'auto' },
}