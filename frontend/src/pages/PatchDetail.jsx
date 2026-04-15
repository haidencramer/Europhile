import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPatch, updatePatch, listGear, uploadAudio, getStreamUrl } from '../api/client'

const KEYS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']

function formatDuration(seconds) {
  if (!seconds) return null
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function AudioPlayer({ objectPath, filename }) {
  const [url,     setUrl]     = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [open,    setOpen]    = useState(false)

  async function handlePlay() {
    if (url) { setOpen(true); return }
    setLoading(true)
    setError(null)
    try {
      const { stream_url } = await getStreamUrl(objectPath)
      setUrl(stream_url)
      setOpen(true)
    } catch (e) {
      setError('Failed to load audio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {!open && (
        <button onClick={handlePlay} style={ap.playBtn} disabled={loading}>
          {loading ? 'Loading…' : '▶ Play'}
        </button>
      )}
      {error && <span style={{ color: '#e57', fontSize: 12 }}>{error}</span>}
      {open && url && (
        <div style={ap.playerWrap}>
          <audio
            controls
            autoPlay
            src={url}
            style={ap.audio}
            onError={() => setError('Playback failed — try again')}
          />
          <button onClick={() => setOpen(false)} style={ap.closeBtn}>✕</button>
        </div>
      )}
    </div>
  )
}

const ap = {
  playBtn:    { background: '#1a2e1a', border: '1px solid #3a6a3a', color: '#7ec87e', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  playerWrap: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 },
  audio:      { flex: 1, height: 36, accentColor: '#e8c97a' },
  closeBtn:   { background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: 14, padding: '0 4px' },
}

export default function PatchDetail() {
  const { id } = useParams()
  const [patch,     setPatch]     = useState(null)
  const [gear,      setGear]      = useState([])
  const [editing,   setEditing]   = useState(false)
  const [form,      setForm]      = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const [error,     setError]     = useState(null)
  const fileRef = useRef()

  async function load() {
    try {
      const [p, g] = await Promise.all([getPatch(id), listGear()])
      setPatch(p)
      setForm({
        title:        p.title,
        description:  p.description || '',
        wiring_notes: p.wiring_notes || '',
        gear_ids:     p.gear_ids || [],
        bpm:          p.bpm || '',
        key:          p.key || '',
        tags:         (p.tags || []).join(', '),
      })
      setGear(g)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleSave(e) {
    e.preventDefault()
    await updatePatch(id, {
      ...form,
      bpm:  form.bpm ? parseInt(form.bpm) : null,
      key:  form.key || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })
    setEditing(false)
    load()
  }

  function toggleGear(gid) {
    setForm(f => ({
      ...f,
      gear_ids: f.gear_ids.includes(gid)
        ? f.gear_ids.filter(x => x !== gid)
        : [...f.gear_ids, gid],
    }))
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadMsg(null)
    try {
      await uploadAudio(id, file)
      setUploadMsg('Uploaded! Metadata will appear shortly.')
      setTimeout(load, 3000)
    } catch (err) {
      setUploadMsg(`Upload failed: ${err.message}`)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const gearMap = Object.fromEntries(gear.map(g => [g.id, g]))

  if (error)  return <p style={{ color: '#e57' }}>Error: {error}</p>
  if (!patch) return <p style={s.muted}>Loading…</p>

  return (
    <div>
      <Link to="/patches" style={s.back}>← All Patches</Link>

      {editing ? (
        <form onSubmit={handleSave} style={s.form}>
          <div style={s.row}>
            <div style={s.fg}>
              <label style={s.label}>Title</label>
              <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={s.input} />
            </div>
            <div style={s.fg}>
              <label style={s.label}>Description</label>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={s.input} />
            </div>
            <div style={{ ...s.fg, flex: '0 0 80px' }}>
              <label style={s.label}>BPM</label>
              <input type="number" value={form.bpm} onChange={e => setForm(f => ({ ...f, bpm: e.target.value }))} style={s.input} />
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
            <textarea value={form.wiring_notes} onChange={e => setForm(f => ({ ...f, wiring_notes: e.target.value }))} style={s.textarea} rows={5} />
          </div>
          <div style={s.fg}>
            <label style={s.label}>Tags (comma separated)</label>
            <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} style={s.input} placeholder="ambient, generative, drone" />
          </div>
          <div style={s.gearPicker}>
            <span style={s.label}>Modules:</span>
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" style={s.btn}>Save</button>
            <button type="button" onClick={() => setEditing(false)} style={s.btnGhost}>Cancel</button>
          </div>
        </form>
      ) : (
        <div>
          <div style={s.header}>
            <h1 style={s.h1}>{patch.title}</h1>
            <button onClick={() => setEditing(true)} style={s.btnGhost}>Edit</button>
          </div>
          {patch.description && <p style={s.desc}>{patch.description}</p>}

          <div style={s.metaRow}>
            {patch.bpm              && <span style={s.pill}>{patch.bpm} BPM</span>}
            {patch.key              && <span style={s.pill}>Key of {patch.key}</span>}
            {patch.gear_ids?.length > 0   && <span style={s.pill}>{patch.gear_ids.length} modules</span>}
            {patch.audio_files?.length > 0 && <span style={s.pill}>{patch.audio_files.length} recordings</span>}
          </div>

          {patch.tags?.length > 0 && (
            <div style={s.tags}>
              {patch.tags.map(t => <span key={t} style={s.tag}>#{t}</span>)}
            </div>
          )}

          {patch.gear_ids?.length > 0 && (
            <div style={s.section}>
              <h2 style={s.h2}>Modules in this patch</h2>
              <div style={s.moduleGrid}>
                {patch.gear_ids.map(gid => {
                  const g = gearMap[gid]
                  return (
                    <div key={gid} style={s.moduleCard}>
                      <div style={s.moduleName}>{g?.name ?? gid}</div>
                      {g?.manufacturer && <div style={s.moduleMfr}>{g.manufacturer}</div>}
                      <div style={s.modulePills}>
                        {g?.hp_width   && <span style={s.pill}>{g.hp_width}hp</span>}
                        {g?.category   && <span style={s.pill}>{g.category}</span>}
                        {g?.cv_inputs  && <span style={s.pill}>{g.cv_inputs} CV in</span>}
                        {g?.cv_outputs && <span style={s.pill}>{g.cv_outputs} CV out</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {patch.wiring_notes && (
            <div style={s.section}>
              <h2 style={s.h2}>Wiring notes</h2>
              <pre style={s.pre}>{patch.wiring_notes}</pre>
            </div>
          )}
        </div>
      )}

      {/* Recordings */}
      <div style={s.section}>
        <h2 style={s.h2}>Recordings</h2>
        <div style={s.uploadRow}>
          <input ref={fileRef} type="file" accept=".wav,audio/wav" onChange={handleUpload} style={{ display: 'none' }} id="wav-upload" />
          <label htmlFor="wav-upload" style={{ ...s.btn, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'default' : 'pointer' }}>
            {uploading ? 'Uploading…' : '+ Upload WAV'}
          </label>
          {uploadMsg && <span style={s.uploadMsg}>{uploadMsg}</span>}
        </div>

        {patch.audio_files?.length === 0 && <p style={s.muted}>No recordings yet.</p>}

        <div style={s.audioList}>
          {patch.audio_files?.map((af, i) => (
            <div key={i} style={s.audioCard}>
              <div style={s.audioName}>{af.filename}</div>
              <div style={s.audioMeta}>
                {af.duration_seconds != null
                  ? <span style={s.pill}>{formatDuration(af.duration_seconds)}</span>
                  : <span style={s.pending}>processing…</span>}
                {af.sample_rate_hz != null && (
                  <span style={s.pill}>{(af.sample_rate_hz / 1000).toFixed(1)} kHz</span>
                )}
                {af.uploaded_at && (
                  <span style={s.uploadedAt}>{new Date(af.uploaded_at).toLocaleString()}</span>
                )}
              </div>
              <div style={{ marginTop: 8 }}>
                <AudioPlayer objectPath={af.object_path} filename={af.filename} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  back:        { color: '#555', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 20 },
  header:      { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 },
  h1:          { color: '#e8c97a', fontSize: 22, margin: 0 },
  h2:          { color: '#666', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  desc:        { color: '#aaa', fontSize: 14, marginBottom: 12 },
  metaRow:     { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  pill:        { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777', padding: '2px 8px', borderRadius: 10, fontSize: 11 },
  tags:        { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  tag:         { color: '#5a7a9a', fontSize: 12 },
  section:     { marginTop: 28, borderTop: '1px solid #1c1c1c', paddingTop: 20 },
  moduleGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 },
  moduleCard:  { background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 6, padding: 12 },
  moduleName:  { color: '#e8c97a', fontWeight: 600, fontSize: 13, marginBottom: 2 },
  moduleMfr:   { color: '#555', fontSize: 11, marginBottom: 6 },
  modulePills: { display: 'flex', gap: 4, flexWrap: 'wrap' },
  pre:         { background: '#0d0d0d', border: '1px solid #1c1c1c', borderRadius: 6, padding: 14, color: '#ccc', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.7 },
  muted:       { color: '#555', fontSize: 13 },
  form:        { display: 'flex', flexDirection: 'column', gap: 12, background: '#111', padding: 20, borderRadius: 8, border: '1px solid #222', marginBottom: 24 },
  row:         { display: 'flex', gap: 12, flexWrap: 'wrap' },
  fg:          { display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 120 },
  label:       { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '6px 10px', borderRadius: 4, fontSize: 13 },
  textarea:    { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '8px 10px', borderRadius: 4, fontSize: 13, resize: 'vertical' },
  gearPicker:  { display: 'flex', flexDirection: 'column', gap: 8 },
  chipRow:     { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip:        { background: '#1a1a1a', border: '1px solid #333', color: '#888', padding: '4px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  chipActive:  { background: '#1e2a1e', border: '1px solid #4a7a4a', color: '#7ec87e' },
  chipHp:      { color: '#444', fontSize: 10 },
  btn:         { display: 'inline-block', background: '#e8c97a', color: '#111', border: 'none', padding: '7px 16px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 13, textAlign: 'center' },
  btnGhost:    { background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  uploadRow:   { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  uploadMsg:   { color: '#7ec87e', fontSize: 13 },
  audioList:   { display: 'flex', flexDirection: 'column', gap: 12 },
  audioCard:   { background: '#111', border: '1px solid #222', borderRadius: 6, padding: '12px 16px' },
  audioName:   { color: '#ddd', fontSize: 14, fontWeight: 500, marginBottom: 6 },
  audioMeta:   { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  pending:     { color: '#555', fontSize: 12, fontStyle: 'italic' },
  uploadedAt:  { color: '#444', fontSize: 11 },
}