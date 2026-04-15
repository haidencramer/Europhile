import { useEffect, useState } from 'react'
import { listGear } from '../api/client'

const CATEGORY_COLORS = {
  oscillator:    { bg: '#1a2e1a', border: '#3a6a3a', text: '#7ec87e' },
  filter:        { bg: '#1a1a2e', border: '#3a3a6a', text: '#7e9ec8' },
  envelope:      { bg: '#2e2a1a', border: '#6a5a3a', text: '#c8b47e' },
  amplifier:     { bg: '#2a1a2e', border: '#5a3a6a', text: '#b47ec8' },
  LFO:           { bg: '#1a2a2e', border: '#3a5a6a', text: '#7eb4c8' },
  sequencer:     { bg: '#2e1a1a', border: '#6a3a3a', text: '#c87e7e' },
  effects:       { bg: '#1e2e1e', border: '#3e5e3e', text: '#8ec88e' },
  utility:       { bg: '#222222', border: '#444444', text: '#aaaaaa' },
  mixer:         { bg: '#2e2e1a', border: '#6a6a3a', text: '#c8c87e' },
  sampler:       { bg: '#2e1a2a', border: '#6a3a5a', text: '#c87eb4' },
  'semi-modular': { bg: '#1a2e2e', border: '#3a6a6a', text: '#7ec8c8' },
  other:         { bg: '#1e1e1e', border: '#3e3e3e', text: '#888888' },
}

const DEFAULT_COLOR = { bg: '#1a1a1a', border: '#333333', text: '#888888' }
const HP_WIDTH = 12 // pixels per HP unit
const ROW_HEIGHT = 128
const RACK_HP = 84 // standard 84HP rack width — adjust to match yours

export default function RackPage() {
  const [gear,    setGear]    = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [rackHp,  setRackHp]  = useState(RACK_HP)

  useEffect(() => {
    listGear()
      .then(setGear)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p style={s.muted}>Loading rack…</p>
  if (error)   return <p style={{ color: '#e57' }}>Error: {error}</p>

  // Split into placed and unplaced
  const placed   = gear.filter(g => g.rack_row != null && g.rack_position != null)
  const unplaced = gear.filter(g => g.rack_row == null || g.rack_position == null)

  // Group placed modules by row
  const rows = {}
  placed.forEach(g => {
    if (!rows[g.rack_row]) rows[g.rack_row] = []
    rows[g.rack_row].push(g)
  })
  const rowNumbers = Object.keys(rows).map(Number).sort((a, b) => a - b)

  // Stats
  const totalHP    = gear.reduce((s, g) => s + (g.hp_width || 0), 0)
  const totalPos12 = gear.reduce((s, g) => s + (g.power_positive || 0), 0)
  const totalNeg12 = gear.reduce((s, g) => s + (g.power_negative || 0), 0)
  const usedHP     = placed.reduce((s, g) => s + (g.hp_width || 0), 0)
  const freeHP     = (rackHp * Math.max(1, rowNumbers.length)) - usedHP

  function color(g) {
    return CATEGORY_COLORS[g.category] || DEFAULT_COLOR
  }

  function ModuleBlock({ g, showTooltip = true }) {
    const c   = color(g)
    const w   = (g.hp_width || 4) * HP_WIDTH
    const dim = tooltip?.id === g.id

    return (
      <div
        onMouseEnter={() => showTooltip && setTooltip(g)}
        onMouseLeave={() => showTooltip && setTooltip(null)}
        style={{
          width:           w,
          height:          ROW_HEIGHT - 12,
          background:      c.bg,
          border:          `1px solid ${dim ? c.border : c.border}`,
          borderRadius:    4,
          display:         'flex',
          flexDirection:   'column',
          alignItems:      'center',
          justifyContent:  'center',
          padding:         '4px 2px',
          cursor:          'default',
          boxSizing:       'border-box',
          flexShrink:      0,
          opacity:         tooltip && tooltip.id !== g.id ? 0.6 : 1,
          transition:      'opacity 0.15s',
          overflow:        'hidden',
          position:        'relative',
        }}
      >
        {/* Module name — rotated if narrow */}
        {w >= 48 ? (
          <>
            <div style={{ color: c.text, fontSize: Math.min(11, w / 8), fontWeight: 600, textAlign: 'center', lineHeight: 1.2, padding: '0 2px', wordBreak: 'break-word' }}>
              {g.name}
            </div>
            {w >= 60 && g.manufacturer && (
              <div style={{ color: c.text, fontSize: 9, opacity: 0.6, textAlign: 'center', marginTop: 2 }}>
                {g.manufacturer.slice(0, 12)}
              </div>
            )}
            {w >= 48 && g.hp_width && (
              <div style={{ color: c.text, fontSize: 9, opacity: 0.4, marginTop: 4 }}>
                {g.hp_width}hp
              </div>
            )}
          </>
        ) : (
          <div style={{
            color:      c.text,
            fontSize:   9,
            fontWeight: 600,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform:  'rotate(180deg)',
            lineHeight: 1.2,
            maxHeight:  ROW_HEIGHT - 24,
            overflow:   'hidden',
          }}>
            {g.name}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={s.pageHeader}>
        <h1 style={s.h1}>Rack Visualizer</h1>
        <div style={s.rackHpControl}>
          <label style={s.label}>Rack width (HP)</label>
          <input
            type="number"
            value={rackHp}
            onChange={e => setRackHp(parseInt(e.target.value) || RACK_HP)}
            style={{ ...s.input, width: 70 }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={s.statsBar}>
        <div style={s.stat}><span style={s.statVal}>{gear.length}</span><span style={s.statLabel}>modules</span></div>
        <div style={s.stat}><span style={s.statVal}>{usedHP}</span><span style={s.statLabel}>HP used</span></div>
        <div style={s.stat}><span style={s.statVal}>{freeHP}</span><span style={s.statLabel}>HP free</span></div>
        <div style={s.stat}><span style={{ ...s.statVal, color: '#7ec87e' }}>{totalPos12}mA</span><span style={s.statLabel}>+12V draw</span></div>
        <div style={s.stat}><span style={{ ...s.statVal, color: '#e87e7e' }}>{totalNeg12}mA</span><span style={s.statLabel}>-12V draw</span></div>
        <div style={s.stat}><span style={s.statVal}>{placed.length}</span><span style={s.statLabel}>placed</span></div>
        <div style={s.stat}><span style={s.statVal}>{unplaced.length}</span><span style={s.statLabel}>unplaced</span></div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div style={s.tooltip}>
          <div style={s.tooltipName}>{tooltip.name}</div>
          <div style={s.tooltipMfr}>{tooltip.manufacturer}</div>
          <div style={s.tooltipPills}>
            {tooltip.hp_width       && <span style={s.tpill}>{tooltip.hp_width}hp</span>}
            {tooltip.category       && <span style={s.tpill}>{tooltip.category}</span>}
            {tooltip.power_positive && <span style={{ ...s.tpill, color: '#7ec87e' }}>+{tooltip.power_positive}mA</span>}
            {tooltip.power_negative && <span style={{ ...s.tpill, color: '#e87e7e' }}>-{tooltip.power_negative}mA</span>}
            {tooltip.cv_inputs      && <span style={s.tpill}>{tooltip.cv_inputs} CV in</span>}
            {tooltip.cv_outputs     && <span style={s.tpill}>{tooltip.cv_outputs} CV out</span>}
            {tooltip.condition      && <span style={s.tpill}>{tooltip.condition}</span>}
          </div>
          {tooltip.notes && <div style={s.tooltipNotes}>{tooltip.notes}</div>}
        </div>
      )}

      {/* Rack rows */}
      {rowNumbers.length === 0 && placed.length === 0 && (
        <div style={s.emptyRack}>
          <p style={s.muted}>No modules placed yet.</p>
          <p style={s.muted}>Add rack row and rack position to your modules on the Gear page to see them here.</p>
        </div>
      )}

      {rowNumbers.map(rowNum => {
        const rowModules = rows[rowNum].sort((a, b) => (a.rack_position || 0) - (b.rack_position || 0))
        const rowUsedHP  = rowModules.reduce((sum, g) => sum + (g.hp_width || 0), 0)
        const rowFreeHP  = rackHp - rowUsedHP

        return (
          <div key={rowNum} style={s.rowWrap}>
            <div style={s.rowLabel}>Row {rowNum}</div>
            <div style={s.rack}>
              {/* Rail top */}
              <div style={s.rail} />

              {/* Module slots */}
              <div style={s.rowInner}>
                {rowModules.map(g => (
                  <ModuleBlock key={g.id} g={g} />
                ))}
                {/* Empty space */}
                {rowFreeHP > 0 && (
                  <div style={{
                    width:       rowFreeHP * HP_WIDTH,
                    height:      ROW_HEIGHT - 12,
                    background:  '#0d0d0d',
                    border:      '1px dashed #1c1c1c',
                    borderRadius: 4,
                    display:     'flex',
                    alignItems:  'center',
                    justifyContent: 'center',
                    flexShrink:  0,
                  }}>
                    <span style={{ color: '#2a2a2a', fontSize: 11 }}>{rowFreeHP}hp free</span>
                  </div>
                )}
              </div>

              {/* Rail bottom */}
              <div style={s.rail} />
            </div>
          </div>
        )
      })}

      {/* Category legend */}
      <div style={s.section}>
        <h2 style={s.h2}>Category legend</h2>
        <div style={s.legend}>
          {Object.entries(CATEGORY_COLORS).map(([cat, c]) => {
            const count = gear.filter(g => g.category === cat).length
            if (count === 0) return null
            return (
              <div key={cat} style={s.legendItem}>
                <div style={{ width: 12, height: 12, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 2, flexShrink: 0 }} />
                <span style={{ color: c.text, fontSize: 12 }}>{cat}</span>
                <span style={s.legendCount}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Unplaced modules */}
      {unplaced.length > 0 && (
        <div style={s.section}>
          <h2 style={s.h2}>Unplaced modules ({unplaced.length})</h2>
          <p style={{ ...s.muted, marginBottom: 12 }}>Set rack row and rack position on the Gear page to place these in the visualizer.</p>
          <div style={s.unplacedGrid}>
            {unplaced.map(g => {
              const c = color(g)
              return (
                <div key={g.id} style={{ ...s.unplacedCard, background: c.bg, borderColor: c.border }}>
                  <div style={{ color: c.text, fontWeight: 600, fontSize: 13 }}>{g.name}</div>
                  <div style={{ color: c.text, fontSize: 11, opacity: 0.6 }}>{g.manufacturer}</div>
                  <div style={s.modulePills}>
                    {g.hp_width  && <span style={s.pill}>{g.hp_width}hp</span>}
                    {g.category  && <span style={s.pill}>{g.category}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  h1:           { color: '#e8c97a', fontSize: 22, margin: 0 },
  h2:           { color: '#666', fontSize: 12, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  muted:        { color: '#555', fontSize: 13 },
  rackHpControl:{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  label:        { color: '#666', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:        { background: '#1a1a1a', border: '1px solid #333', color: '#eee', padding: '6px 10px', borderRadius: 4, fontSize: 13, textAlign: 'center' },
  statsBar:     { display: 'flex', gap: 24, marginBottom: 28, padding: '12px 20px', background: '#111', borderRadius: 8, border: '1px solid #222', flexWrap: 'wrap' },
  stat:         { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statVal:      { color: '#e8c97a', fontSize: 20, fontWeight: 700 },
  statLabel:    { color: '#555', fontSize: 11, marginTop: 2 },
  tooltip:      { background: '#111', border: '1px solid #333', borderRadius: 8, padding: '12px 16px', marginBottom: 16, maxWidth: 400 },
  tooltipName:  { color: '#e8c97a', fontWeight: 600, fontSize: 15, marginBottom: 2 },
  tooltipMfr:   { color: '#666', fontSize: 12, marginBottom: 8 },
  tooltipPills: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  tpill:        { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#777', padding: '2px 8px', borderRadius: 10, fontSize: 11 },
  tooltipNotes: { color: '#666', fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  rowWrap:      { marginBottom: 20 },
  rowLabel:     { color: '#444', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  rack: {
    background:   '#0a0a0a',
    border:       '1px solid #222',
    borderRadius: 6,
    padding:      '6px 8px',
    overflowX:    'auto',
  },
  rail:         { height: 6, background: '#1a1a1a', borderRadius: 2, margin: '2px 0' },
  rowInner:     { display: 'flex', gap: 2, alignItems: 'center', padding: '2px 0', minWidth: 'max-content' },
  emptyRack:    { background: '#0d0d0d', border: '1px dashed #222', borderRadius: 8, padding: 32, textAlign: 'center', marginBottom: 24 },
  section:      { marginTop: 28, borderTop: '1px solid #1c1c1c', paddingTop: 20 },
  legend:       { display: 'flex', flexWrap: 'wrap', gap: 10 },
  legendItem:   { display: 'flex', alignItems: 'center', gap: 6 },
  legendCount:  { color: '#444', fontSize: 11 },
  unplacedGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 },
  unplacedCard: { border: '1px solid', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  modulePills:  { display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 },
  pill:         { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#666', padding: '2px 6px', borderRadius: 8, fontSize: 10 },
}