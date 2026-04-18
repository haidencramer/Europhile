import { useEffect, useState } from 'react'
import { listGear, listPatches } from '../api/client'

const CATEGORY_COLORS = {
  oscillator:    '#7ec87e',
  filter:        '#7e9ec8',
  envelope:      '#c8b47e',
  amplifier:     '#b47ec8',
  LFO:           '#7eb4c8',
  sequencer:     '#c87e7e',
  effects:       '#8ec88e',
  utility:       '#aaaaaa',
  mixer:         '#c8c87e',
  sampler:       '#c87eb4',
  'semi-modular': '#7ec8c8',
  other:         '#888888',
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

export default function ChartsPage() {
  const [gear,    setGear]    = useState([])
  const [patches, setPatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [psuPos,  setPsuPos]  = useState(1000)
  const [psuNeg,  setPsuNeg]  = useState(500)

  useEffect(() => {
    Promise.all([listGear(), listPatches()])
      .then(([g, p]) => { setGear(g); setPatches(p) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={s.muted}>Loading…</p>
  if (error)   return <p style={{ color: '#e57' }}>Error: {error}</p>

  // Power budget
  const totalPos   = gear.reduce((sum, g) => sum + (g.power_positive || 0), 0)
  const totalNeg   = gear.reduce((sum, g) => sum + (g.power_negative || 0), 0)
  const posPercent = Math.min(100, Math.round((totalPos / psuPos) * 100))
  const negPercent = Math.min(100, Math.round((totalNeg / psuNeg) * 100))
  const posColor   = posPercent > 90 ? '#c87e7e' : posPercent > 70 ? '#c8b47e' : '#7ec87e'
  const negColor   = negPercent > 90 ? '#c87e7e' : negPercent > 70 ? '#c8b47e' : '#e87e7e'

  // HP by category
  const hpByCategory = {}
  gear.forEach(g => {
    if (!g.hp_width) return
    const cat = g.category || 'other'
    hpByCategory[cat] = (hpByCategory[cat] || 0) + g.hp_width
  })
  const totalHP  = Object.values(hpByCategory).reduce((s, v) => s + v, 0)
  const hpEntries = Object.entries(hpByCategory).sort((a, b) => b[1] - a[1])

  // Modules by manufacturer
  const byMfr = {}
  gear.forEach(g => {
    const m = g.manufacturer || 'Unknown'
    byMfr[m] = (byMfr[m] || 0) + 1
  })
  const mfrEntries  = Object.entries(byMfr).sort((a, b) => b[1] - a[1])
  const maxMfrCount = Math.max(...mfrEntries.map(([, v]) => v), 1)

  // Total value
  const totalValue = gear.reduce((s, g) => s + (g.purchase_price || 0), 0)

  // Recordings
  const recordings = patches.flatMap(p =>
    (p.audio_files || []).map(af => ({
      ...af,
      patchTitle: p.title,
      date: af.uploaded_at ? new Date(af.uploaded_at) : null,
    }))
  ).filter(r => r.date).sort((a, b) => a.date - b.date)

  const totalDuration = recordings.reduce((s, r) => s + (r.duration_seconds || 0), 0)

  return (
    <div>
      <h1 style={s.h1}>Analytics</h1>

      {/* Top stats */}
      <div style={s.statsBar}>
        <div style={s.stat}><span style={s.statVal}>{gear.length}</span><span style={s.statLabel}>modules</span></div>
        <div style={s.stat}><span style={s.statVal}>{totalHP}hp</span><span style={s.statLabel}>total HP</span></div>
        <div style={s.stat}><span style={{ ...s.statVal, color: '#7ec87e' }}>{totalPos}mA</span><span style={s.statLabel}>+12V draw</span></div>
        <div style={s.stat}><span style={{ ...s.statVal, color: '#e87e7e' }}>{totalNeg}mA</span><span style={s.statLabel}>-12V draw</span></div>
        <div style={s.stat}><span style={s.statVal}>{patches.length}</span><span style={s.statLabel}>patches</span></div>
        <div style={s.stat}><span style={s.statVal}>{recordings.length}</span><span style={s.statLabel}>recordings</span></div>
        <div style={s.stat}><span style={s.statVal}>{formatDuration(totalDuration)}</span><span style={s.statLabel}>total audio</span></div>
        {totalValue > 0 && <TotalValue value={totalValue} />}
      </div>

      <div style={s.grid}>

        {/* Power budget */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h2 style={s.h2}>Power budget</h2>
            <div style={s.psuInputs}>
              <label style={s.label}>PSU +12V (mA)</label>
              <input type="number" value={psuPos} onChange={e => setPsuPos(parseInt(e.target.value) || 1000)} style={s.smallInput} />
              <label style={s.label}>PSU -12V (mA)</label>
              <input type="number" value={psuNeg} onChange={e => setPsuNeg(parseInt(e.target.value) || 500)} style={s.smallInput} />
            </div>
          </div>
          <div style={s.powerRow}>
            <span style={s.powerLabel}>+12V</span>
            <div style={s.barTrack}>
              <div style={{ ...s.barFill, width: `${posPercent}%`, background: posColor }} />
            </div>
            <span style={{ ...s.powerValue, color: posColor }}>{totalPos} / {psuPos}mA ({posPercent}%)</span>
          </div>
          <div style={s.powerRow}>
            <span style={s.powerLabel}>-12V</span>
            <div style={s.barTrack}>
              <div style={{ ...s.barFill, width: `${negPercent}%`, background: negColor }} />
            </div>
            <span style={{ ...s.powerValue, color: negColor }}>{totalNeg} / {psuNeg}mA ({negPercent}%)</span>
          </div>
          {gear.filter(g => g.power_positive || g.power_negative).length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={s.subLabel}>Per module (+12V)</div>
              {gear
                .filter(g => g.power_positive)
                .sort((a, b) => (b.power_positive || 0) - (a.power_positive || 0))
                .map(g => (
                  <div key={g.id} style={s.miniBarRow}>
                    <span style={s.miniLabel}>{g.name}</span>
                    <div style={s.miniTrack}>
                      <div style={{
                        ...s.miniFill,
                        width: `${Math.round((g.power_positive / psuPos) * 100)}%`,
                        background: CATEGORY_COLORS[g.category] || '#888',
                      }} />
                    </div>
                    <span style={s.miniVal}>{g.power_positive}mA</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* HP by category */}
        <div style={s.card}>
          <h2 style={s.h2}>HP by category</h2>
          {hpEntries.length === 0 && <p style={s.muted}>No HP data yet — add hp_width to your modules.</p>}
          {hpEntries.map(([cat, hp]) => (
            <div key={cat} style={s.miniBarRow}>
              <span style={{ ...s.miniLabel, color: CATEGORY_COLORS[cat] || '#888' }}>{cat}</span>
              <div style={s.miniTrack}>
                <div style={{
                  ...s.miniFill,
                  width: `${Math.round((hp / totalHP) * 100)}%`,
                  background: CATEGORY_COLORS[cat] || '#888',
                }} />
              </div>
              <span style={s.miniVal}>{hp}hp ({Math.round((hp / totalHP) * 100)}%)</span>
            </div>
          ))}
          {hpEntries.length > 0 && (
            <div style={s.donutWrap}>
              <svg viewBox="0 0 120 120" width="120" height="120">
                {buildDonut(hpEntries, totalHP)}
              </svg>
              <div style={s.donutLegend}>
                {hpEntries.map(([cat, hp]) => (
                  <div key={cat} style={s.donutLegendItem}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_COLORS[cat] || '#888', flexShrink: 0 }} />
                    <span style={{ color: '#888', fontSize: 11 }}>{cat} — {hp}hp</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modules by manufacturer */}
        <div style={s.card}>
          <h2 style={s.h2}>Modules by manufacturer</h2>
          {mfrEntries.length === 0 && <p style={s.muted}>No modules yet.</p>}
          {mfrEntries.map(([mfr, count]) => (
            <div key={mfr} style={s.miniBarRow}>
              <span style={s.miniLabel}>{mfr}</span>
              <div style={s.miniTrack}>
                <div style={{
                  ...s.miniFill,
                  width: `${Math.round((count / maxMfrCount) * 100)}%`,
                  background: '#e8c97a',
                }} />
              </div>
              <span style={s.miniVal}>{count} module{count !== 1 ? 's' : ''}</span>
            </div>
          ))}
        </div>

        {/* Recordings timeline */}
        <div style={s.card}>
          <h2 style={s.h2}>Recordings</h2>
          {recordings.length === 0 && <p style={s.muted}>No recordings yet — upload WAV files to your patches.</p>}
          {recordings.length > 0 && (
            <>
              <div style={s.timelineWrap}>
                {recordings.map((r, i) => (
                  <div key={i} style={s.timelineItem}>
                    <div style={s.timelineDot} />
                    <div style={s.timelineContent}>
                      <div style={s.timelineFile}>{r.filename}</div>
                      <div style={s.timelineMeta}>
                        <span style={s.tpill}>{r.patchTitle}</span>
                        {r.duration_seconds && <span style={s.tpill}>{r.duration_seconds.toFixed(1)}s</span>}
                        {r.sample_rate_hz   && <span style={s.tpill}>{(r.sample_rate_hz / 1000).toFixed(1)}kHz</span>}
                      </div>
                      <div style={s.timelineDate}>{r.date.toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, color: '#555', fontSize: 12 }}>
                Total: {recordings.length} recordings · {formatDuration(totalDuration)} of audio
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

function formatDuration(seconds) {
  if (seconds < 60)   return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
}

function buildDonut(entries, total) {
  const cx = 60, cy = 60, r = 45, strokeWidth = 18
  const circumference = 2 * Math.PI * r
  let offset = 0
  return entries.map(([cat, val]) => {
    const pct  = val / total
    const dash = pct * circumference
    const gap  = circumference - dash
    const el   = (
      <circle
        key={cat}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={CATEGORY_COLORS[cat] || '#888'}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
      />
    )
    offset += dash
    return el
  })
}

const s = {
  h1:            { color: '#e8c97a', fontSize: 22, margin: '0 0 20px' },
  h2:            { color: '#666', fontSize: 12, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
  muted:         { color: '#555', fontSize: 13 },
  statsBar:      { display: 'flex', gap: 24, marginBottom: 28, padding: '12px 20px', background: '#111', borderRadius: 8, border: '1px solid #222', flexWrap: 'wrap' },
  stat:          { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statVal:       { color: '#e8c97a', fontSize: 20, fontWeight: 700 },
  statLabel:     { color: '#555', fontSize: 11, marginTop: 2 },
  grid:          { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 20 },
  card:          { background: '#111', border: '1px solid #222', borderRadius: 8, padding: 20 },
  cardHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  label:         { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  psuInputs:     { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  smallInput:    { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '4px 8px', borderRadius: 4, fontSize: 12, width: 80, textAlign: 'right' },
  powerRow:      { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  powerLabel:    { color: '#555', fontSize: 12, width: 32, flexShrink: 0 },
  barTrack:      { flex: 1, height: 12, background: '#1a1a1a', borderRadius: 6, overflow: 'hidden' },
  barFill:       { height: '100%', borderRadius: 6, transition: 'width 0.4s ease' },
  powerValue:    { fontSize: 12, width: 160, textAlign: 'right', flexShrink: 0 },
  subLabel:      { color: '#444', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  miniBarRow:    { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  miniLabel:     { color: '#888', fontSize: 12, width: 110, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  miniTrack:     { flex: 1, height: 8, background: '#1a1a1a', borderRadius: 4, overflow: 'hidden' },
  miniFill:      { height: '100%', borderRadius: 4, transition: 'width 0.4s ease' },
  miniVal:       { color: '#555', fontSize: 11, width: 90, textAlign: 'right', flexShrink: 0 },
  donutWrap:     { display: 'flex', alignItems: 'center', gap: 20, marginTop: 20, padding: '16px 0' },
  donutLegend:   { display: 'flex', flexDirection: 'column', gap: 6 },
  donutLegendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  timelineWrap:  { display: 'flex', flexDirection: 'column', gap: 0 },
  timelineItem:  { display: 'flex', gap: 12, paddingBottom: 14 },
  timelineDot:   { width: 8, height: 8, borderRadius: '50%', background: '#e8c97a', flexShrink: 0, marginTop: 4 },
  timelineContent: { flex: 1, borderBottom: '1px solid #1c1c1c', paddingBottom: 10 },
  timelineFile:  { color: '#ccc', fontSize: 13, fontWeight: 500, marginBottom: 4 },
  timelineMeta:  { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 },
  tpill:         { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#666', padding: '2px 6px', borderRadius: 8, fontSize: 11 },
  timelineDate:  { color: '#444', fontSize: 11 },
}