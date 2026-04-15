import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getPatch, updatePatch, listGear, uploadAudio } from '../api/client'

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
      setForm({ title: p.title, description: p.description || '', wiring_notes: p.wiring_notes || '', gear_ids: p.gear_ids || [] })
      setGear(g)
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleSave(e) {
    e.preventDefault()
    await updatePatch(id, form)
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
      setUploadMsg('Uploaded! Metadata will appear shortly once processing completes.')
      // Reload after a brief delay to pick up any fast metadata writes
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
          <input
            required value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            style={s.input}
            placeholder="Title"
          />
          <input
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            style={s.input}
            placeholder="Description"
          />
          <textarea
            value={form.wiring_notes}
            onChange={e => setForm(f => ({ ...f, wiring_notes: e.target.value }))}
            style={s.textarea}
            rows={5}
            placeholder="Wiring notes…"
          />
          <div style={s.gearPicker}>
            <span style={s.label}>Modules:</span>
            {gear.map(g => (
              <button
                type="button" key={g.id}
                onClick={() => toggleGear(g.id)}
                style={{ ...s.chip, ...(form.gear_ids.includes(g.id) ? s.chipActive : {}) }}
              >
                {g.name}
              </button>
            ))}
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

          {patch.gear_ids?.length > 0 && (
            <div style={s.section}>
              <h2 style={s.h2}>Modules</h2>
              <div style={s.chips}>
                {patch.gear_ids.map(gid => (
                  <span key={gid} style={s.chipActive}>
                    {gearMap[gid]?.name ?? gid}
                  </span>
                ))}
              </div>
            </div>
          )}

          {patch.wiring_notes && (
            <div style={s.section}>
              <h2 style={s.h2}>Wiring Notes</h2>
              <pre style={s.pre}>{patch.wiring_notes}</pre>
            </div>
          )}
        </div>
      )}

      {/* ── Audio recordings ─────────────────────────────────────────── */}
      <div style={s.section}>
        <h2 style={s.h2}>Recordings</h2>

        <div style={s.uploadRow}>
          <input
            ref={fileRef}
            type="file"
            accept=".wav,audio/wav"
            onChange={handleUpload}
            style={{ display: 'none' }}
            id="wav-upload"
          />
          <label htmlFor="wav-upload" style={{ ...s.btn, opacity: uploading ? 0.6 : 1, cursor: uploading ? 'default' : 'pointer' }}>
            {uploading ? 'Uploading…' : '+ Upload WAV'}
          </label>
          {uploadMsg && <span style={s.uploadMsg}>{uploadMsg}</span>}
        </div>

        {patch.audio_files?.length === 0 && (
          <p style={s.muted}>No recordings yet. Upload a WAV to get started.</p>
        )}

        <div style={s.audioList}>
          {patch.audio_files?.map((af, i) => (
            <div key={i} style={s.audioCard}>
              <div style={s.audioName}>{af.filename}</div>
              <div style={s.audioMeta}>
                {af.duration_seconds != null
                  ? `${af.duration_seconds.toFixed(1)}s`
                  : <span style={s.pending}>processing…</span>}
                {af.sample_rate_hz != null && (
                  <span style={s.hz}>{(af.sample_rate_hz / 1000).toFixed(1)} kHz</span>
                )}
              </div>
              {af.uploaded_at && (
                <div style={s.uploadedAt}>
                  {new Date(af.uploaded_at).toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const s = {
  back:       { color: '#666', fontSize: 13, textDecoration: 'none', display: 'inline-block', marginBottom: 20 },
  header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 },
  h1:         { color: '#e8c97a', fontSize: 22, margin: 0 },
  h2:         { color: '#aaa', fontSize: 14, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  desc:       { color: '#aaa', fontSize: 14, marginBottom: 20 },
  section:    { marginTop: 28, borderTop: '1px solid #1c1c1c', paddingTop: 20 },
  pre:        { background: '#111', border: '1px solid #222', borderRadius: 6, padding: 14, color: '#ccc', fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.6 },
  muted:      { color: '#555', fontSize: 13 },
  chips:      { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip:       { background: '#1a1a1a', border: '1px solid #333', color: '#888', padding: '3px 10px', borderRadius: 12, fontSize: 12, cursor: 'pointer' },
  chipActive: { background: '#1e2a1e', border: '1px solid #4a7a4a', color: '#7ec87e', padding: '3px 10px', borderRadius: 12, fontSize: 12 },
  form:       { display: 'flex', flexDirection: 'column', gap: 10, background: '#111', padding: 16, borderRadius: 8, border: '1px solid #222', marginBottom: 24 },
  input:      { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '6px 10px', borderRadius: 4, fontSize: 13 },
  textarea:   { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '8px 10px', borderRadius: 4, fontSize: 13, resize: 'vertical' },
  gearPicker: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  label:      { color: '#666', fontSize: 12 },
  btn:        { display: 'inline-block', background: '#e8c97a', color: '#111', border: 'none', padding: '7px 16px', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 13, textAlign: 'center' },
  btnGhost:   { background: 'transparent', border: '1px solid #333', color: '#888', padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
  uploadRow:  { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  uploadMsg:  { color: '#7ec87e', fontSize: 13 },
  audioList:  { display: 'flex', flexDirection: 'column', gap: 8 },
  audioCard:  { background: '#111', border: '1px solid #222', borderRadius: 6, padding: '12px 16px' },
  audioName:  { color: '#ddd', fontSize: 14, fontWeight: 500, marginBottom: 4 },
  audioMeta:  { display: 'flex', gap: 12, alignItems: 'center' },
  pending:    { color: '#666', fontSize: 12, fontStyle: 'italic' },
  hz:         { color: '#666', fontSize: 12 },
  uploadedAt: { color: '#444', fontSize: 11, marginTop: 4 },
}
