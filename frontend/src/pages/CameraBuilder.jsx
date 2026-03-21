import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import api from '../api/client'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'

const PARTS = [
  { id: 'sensor', name: 'Image Sensor', spec: '12MP CMOS' },
  { id: 'lens', name: 'Lens Module', spec: '28mm f/2.0' },
  { id: 'processor', name: 'Image Processor', spec: 'Digic X' },
  { id: 'battery', name: 'Battery', spec: '1800mAh Li-ion' },
  { id: 'screen', name: 'LCD Screen', spec: '3 inch IPS' },
]

const DEFAULT_CODE = `# Camera Settings API
# Control your virtual camera with code

# Set camera settings
camera.set_iso(400)
camera.set_aperture(2.8)
camera.set_shutter(1/60)
camera.set_zoom(1.0)

# Apply a filter
camera.set_filter("none")  # none, grayscale, sepia, vivid, cool

# Print current settings
print("ISO:", camera.iso)
print("Aperture: f/" + str(camera.aperture))
print("Ready to shoot!")
`

const FILTERS = {
  none: null,
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(100%)',
  vivid: 'saturate(200%) contrast(110%)',
  cool: 'hue-rotate(30deg) saturate(120%)',
}

const SCENES = [
  { name: 'City', emoji: '🌆', bg: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%)', elements: ['🏢','🏙️','🌃'] },
  { name: 'Nature', emoji: '🌿', bg: 'linear-gradient(180deg, #87CEEB 0%, #98FB98 60%, #228B22 100%)', elements: ['🌳','🌸','🦋'] },
  { name: 'Beach', emoji: '🏖️', bg: 'linear-gradient(180deg, #87CEEB 0%, #87CEEB 50%, #F4A460 100%)', elements: ['🌊','⛱️','🐚'] },
  { name: 'Space', emoji: '🚀', bg: 'linear-gradient(180deg, #000000 0%, #0d0d2b 50%, #1a0533 100%)', elements: ['⭐','🌙','🪐'] },
]

function CameraBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const viewfinderRef = useRef(null)
  const { toast, showToast, hideToast } = useToast()

  const [installed, setInstalled] = useState([])
  const [code, setCode] = useState(DEFAULT_CODE)
  const [buildName, setBuildName] = useState('My Camera')
  const [buildId, setBuildId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [tab, setTab] = useState('viewfinder')
  const [selected, setSelected] = useState(null)
  const [filmRoll, setFilmRoll] = useState([])
  const [shutter, setShutter] = useState(false)
  const [scene, setScene] = useState(SCENES[0])
  const [settings, setSettings] = useState({
    iso: 100, aperture: 2.0, shutter_speed: '1/60', zoom: 1.0, filter: 'none'
  })
  const [log, setLog] = useState([])

  const hasSensor = installed.find(p => p.id === 'sensor')
  const hasLens = installed.find(p => p.id === 'lens')
  const hasScreen = installed.find(p => p.id === 'screen')
  const hasProcessor = installed.find(p => p.id === 'processor')
  const isReady = hasSensor && hasLens && hasProcessor
  const progress = Math.round((installed.length / PARTS.length) * 100)

  useEffect(() => {
    const existingBuildId = searchParams.get('buildId')
    if (existingBuildId) {
      api.get(`/builds/${existingBuildId}`).then(r => {
        setBuildId(r.data.id)
        setBuildName(r.data.name)
        if (r.data.user_code) setCode(r.data.user_code)
        const installedParts = PARTS.filter(p => r.data.parts_installed.includes(p.id))
        setInstalled(installedParts)
      })
    }
  }, [])

  const installPart = (part) => {
    if (installed.find(p => p.id === part.id)) return
    setInstalled(prev => [...prev, part])
    setSelected(part)
  }

  const uninstallPart = (partId) => {
    setInstalled(prev => prev.filter(p => p.id !== partId))
  }

  const takePhoto = () => {
    if (!isReady) { showToast('Install sensor, lens and processor first!', 'error'); return }
    setShutter(true)
    setTimeout(() => setShutter(false), 150)
    const photo = {
      id: Date.now(),
      scene: scene.name,
      sceneEmoji: scene.emoji,
      filter: settings.filter,
      iso: settings.iso,
      aperture: settings.aperture,
      shutter_speed: settings.shutter_speed,
      zoom: settings.zoom,
      time: new Date().toLocaleTimeString(),
      bg: scene.bg,
    }
    setFilmRoll(prev => [photo, ...prev].slice(0, 20))
    setLog(prev => [...prev, `📸 Photo captured — ${scene.name}, ISO ${settings.iso}, f/${settings.aperture}`])
    showToast('Photo captured!')
  }

  const runCode = () => {
    const newSettings = { ...settings }
    const newLog = []
    try {
      const cameraAPI = {
        set_iso: (v) => { newSettings.iso = v },
        set_aperture: (v) => { newSettings.aperture = v },
        set_shutter: (v) => { newSettings.shutter_speed = typeof v === 'number' ? (v < 1 ? '1/' + Math.round(1/v) : String(v)) : v },
        set_zoom: (v) => { newSettings.zoom = Math.max(1, Math.min(5, v)) },
        set_filter: (v) => { if (FILTERS[v] !== undefined) newSettings.filter = v },
        get iso() { return newSettings.iso },
        get aperture() { return newSettings.aperture },
        get zoom() { return newSettings.zoom },
        get filter() { return newSettings.filter },
      }
      const fn = new Function('camera', 'print',
        code
          .replace(/True/g, 'true').replace(/False/g, 'false')
          .replace(/print\(/g, '__print(')
      )
      fn(cameraAPI, (...args) => newLog.push(args.join(' ')))
      setSettings(newSettings)
      setLog(prev => [...prev, ...newLog])
      showToast('Settings applied!')
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error')
    }
  }

  const saveBuild = async () => {
    if (!buildName.trim()) { showToast('Name your build!', 'error'); return }
    setSaving(true)
    try {
      if (!buildId) {
        const res = await api.post('/builds/', { name: buildName, device_type: 'camera' })
        setBuildId(res.data.id)
        await api.patch(`/builds/${res.data.id}`, { name: buildName, parts_installed: installed.map(p => p.id), user_code: code })
      } else {
        await api.patch(`/builds/${buildId}`, { name: buildName, parts_installed: installed.map(p => p.id), user_code: code })
      }
      setSaveSuccess(true)
      showToast('Build saved!')
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e) {
      showToast('Save failed', 'error')
    }
    setSaving(false)
  }

  const bokehAmount = Math.max(0, (settings.aperture - 1.4) * 2)
  const exposureFilter = `brightness(${0.5 + (settings.iso / 400)}) ${FILTERS[settings.filter] || ''}`

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
        <span style={styles.headerTitle}>// Camera Builder</span>
        <input style={styles.nameInput} value={buildName} onChange={e => setBuildName(e.target.value)} placeholder="Name your camera..." />
        <div style={styles.headerRight}>
          <span style={styles.progressLabel}>{progress}% assembled</span>
          <button style={{...styles.saveBtn, background: saveSuccess ? '#059669' : '#00e5a0'}} onClick={saveBuild} disabled={saving}>
            {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {/* LEFT - parts */}
        <div style={styles.leftPanel}>
          <div style={styles.panelHead}>Components ({installed.length}/{PARTS.length})</div>
          <div style={styles.partsList}>
            {PARTS.map(part => {
              const isInstalled = installed.find(p => p.id === part.id)
              return (
                <div key={part.id} style={{...styles.partRow, ...(isInstalled ? styles.partInstalled : {}), ...(selected?.id === part.id ? styles.partSelected : {})}}
                  onClick={() => !isInstalled && installPart(part)}>
                  <div style={styles.partIconBox}>
                    {part.id==='sensor'?'📷':part.id==='lens'?'🔭':part.id==='processor'?'🧠':part.id==='battery'?'🔋':'🖥️'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={styles.partName}>{part.name}</div>
                    <div style={styles.partSpec}>{part.spec}</div>
                  </div>
                  {isInstalled && <button style={styles.uninstallBtn} onClick={e=>{e.stopPropagation();uninstallPart(part.id)}}>✕</button>}
                </div>
              )
            })}
          </div>
          {progress === 100 && <div style={styles.assembledBanner}>🎉 Camera ready!</div>}
        </div>

        {/* CENTER - camera */}
        <div style={styles.centerPanel}>
          <div style={styles.cameraBody}>
            {/* Top bar */}
            <div style={styles.camTopBar}>
              <div style={styles.camMode}>
                {isReady ? <span style={{color:'#00e5a0'}}>● REC READY</span> : <span style={{color:'#444'}}>● NO SIGNAL</span>}
              </div>
              <div style={styles.camExif}>
                <span>ISO {settings.iso}</span>
                <span>f/{settings.aperture}</span>
                <span>{settings.shutter_speed}s</span>
                <span>{settings.zoom}x</span>
              </div>
            </div>

            {/* Viewfinder */}
            <div style={{
              ...styles.viewfinder,
              opacity: shutter ? 1 : 1,
              outline: shutter ? '4px solid white' : 'none',
            }}>
              {!hasSensor || !hasLens ? (
                <div style={styles.noSignal}>
                  <p style={{color:'#333', fontSize:12}}>NO SIGNAL</p>
                  <p style={{color:'#222', fontSize:10}}>Install sensor + lens</p>
                </div>
              ) : (
                <div style={{
                  width:'100%', height:'100%', position:'relative', overflow:'hidden',
                  background: scene.bg,
                  filter: exposureFilter,
                  transform: `scale(${settings.zoom})`,
                  transition: 'transform 0.3s',
                }}>
                  {/* Scene elements */}
                  <div style={{position:'absolute', bottom:20, width:'100%', display:'flex', justifyContent:'space-around', fontSize:32}}>
                    {scene.elements.map((el, i) => <span key={i}>{el}</span>)}
                  </div>
                  {/* Grid overlay */}
                  <div style={styles.gridOverlay} />
                  {/* Bokeh overlay */}
                  {bokehAmount > 0 && (
                    <div style={{position:'absolute', inset:0, backdropFilter:`blur(${bokehAmount}px)`, WebkitBackdropFilter:`blur(${bokehAmount}px)`, pointerEvents:'none'}} />
                  )}
                  {/* Shutter flash */}
                  {shutter && <div style={styles.shutterFlash} />}
                  {/* Focus box */}
                  <div style={styles.focusBox} />
                  {/* Filter label */}
                  {settings.filter !== 'none' && (
                    <div style={styles.filterLabel}>{settings.filter.toUpperCase()}</div>
                  )}
                </div>
              )}
            </div>

            {/* Scene selector */}
            <div style={styles.sceneRow}>
              {SCENES.map(s => (
                <button key={s.name} style={{...styles.sceneBtn, ...(scene.name === s.name ? styles.sceneBtnActive : {})}}
                  onClick={() => setScene(s)}>
                  {s.emoji}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div style={styles.camControls}>
              <div style={styles.settingsRow}>
                <div style={styles.settingItem}>
                  <span style={styles.settingLabel}>ISO</span>
                  <input type="range" min="100" max="3200" step="100" value={settings.iso}
                    onChange={e => setSettings(s => ({...s, iso: Number(e.target.value)}))}
                    style={styles.slider} />
                  <span style={styles.settingVal}>{settings.iso}</span>
                </div>
                <div style={styles.settingItem}>
                  <span style={styles.settingLabel}>f/</span>
                  <input type="range" min="1.4" max="16" step="0.1" value={settings.aperture}
                    onChange={e => setSettings(s => ({...s, aperture: Number(e.target.value).toFixed(1)}))}
                    style={styles.slider} />
                  <span style={styles.settingVal}>{settings.aperture}</span>
                </div>
                <div style={styles.settingItem}>
                  <span style={styles.settingLabel}>Zoom</span>
                  <input type="range" min="1" max="5" step="0.1" value={settings.zoom}
                    onChange={e => setSettings(s => ({...s, zoom: Number(e.target.value).toFixed(1)}))}
                    style={styles.slider} />
                  <span style={styles.settingVal}>{settings.zoom}x</span>
                </div>
              </div>

              <div style={styles.filterRow}>
                {Object.keys(FILTERS).map(f => (
                  <button key={f} style={{...styles.filterBtn, ...(settings.filter===f ? styles.filterBtnActive : {})}}
                    onClick={() => setSettings(s => ({...s, filter: f}))}>
                    {f}
                  </button>
                ))}
              </div>

              <button style={{
                ...styles.shutterBtn,
                opacity: isReady ? 1 : 0.3,
                cursor: isReady ? 'pointer' : 'not-allowed',
                transform: shutter ? 'scale(0.95)' : 'scale(1)',
              }} onClick={takePhoto}>
                {shutter ? '●' : '◉'} SHUTTER
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT - tabs */}
        <div style={styles.rightPanel}>
          <div style={styles.tabs}>
            <button style={{...styles.tab, ...(tab==='viewfinder'?styles.tabActive:{})}} onClick={()=>setTab('viewfinder')}>Film Roll</button>
            <button style={{...styles.tab, ...(tab==='code'?styles.tabActive:{})}} onClick={()=>setTab('code')}>Code</button>
            <button style={{...styles.tab, ...(tab==='log'?styles.tabActive:{})}} onClick={()=>setTab('log')}>Log</button>
          </div>

          {tab === 'viewfinder' && (
            <div style={styles.filmRoll}>
              {filmRoll.length === 0 ? (
                <div style={styles.noPhotos}>
                  <p style={{fontSize:32}}>📷</p>
                  <p style={{color:'#6b7280', fontSize:13}}>No photos yet</p>
                  <p style={{color:'#444', fontSize:11}}>Assemble camera and press shutter</p>
                </div>
              ) : filmRoll.map(photo => (
                <div key={photo.id} style={styles.photoCard}>
                  <div style={{
                    ...styles.photoPreview,
                    background: photo.bg,
                    filter: FILTERS[photo.filter] || 'none',
                  }}>
                    <span style={{fontSize:24, position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)'}}>
                      {SCENES.find(s=>s.name===photo.scene)?.elements[0]}
                    </span>
                    {photo.filter !== 'none' && <div style={styles.photoFilterBadge}>{photo.filter}</div>}
                  </div>
                  <div style={styles.photoMeta}>
                    <span style={styles.photoScene}>{photo.sceneEmoji} {photo.scene}</span>
                    <span style={styles.photoExif}>ISO {photo.iso} · f/{photo.aperture} · {photo.zoom}x</span>
                    <span style={styles.photoTime}>{photo.time}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'code' && (
            <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
              <div style={{flex:1}}>
                <Editor
                  height="100%"
                  defaultLanguage="python"
                  theme="vs-dark"
                  value={code}
                  onChange={val => setCode(val || '')}
                  options={{ fontSize:12, minimap:{enabled:false}, scrollBeyondLastLine:false, lineNumbers:'on', automaticLayout:true, tabSize:4, wordWrap:'on', padding:{top:12} }}
                />
              </div>
              <div style={styles.codeActions}>
                <button style={styles.runBtn} onClick={runCode}>▶ Apply Settings</button>
              </div>
            </div>
          )}

          {tab === 'log' && (
            <div style={styles.logPanel}>
              {log.length === 0
                ? <p style={styles.logEmpty}>No output yet</p>
                : log.map((l, i) => <div key={i} style={styles.logLine}>{l}</div>)
              }
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}

const styles = {
  page: { minHeight:'100vh', background:'#0a0c0f', color:'#e8eaf0', fontFamily:'monospace', display:'flex', flexDirection:'column' },
  header: { display:'flex', alignItems:'center', gap:16, padding:'14px 24px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', flexWrap:'wrap' },
  back: { background:'none', border:'0.5px solid rgba(255,255,255,0.15)', color:'#e8eaf0', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12 },
  headerTitle: { color:'#f59e0b', fontSize:13 },
  nameInput: { background:'none', border:'none', borderBottom:'0.5px solid rgba(255,255,255,0.2)', color:'#e8eaf0', fontSize:13, padding:'4px 8px', fontFamily:'monospace', outline:'none', width:200 },
  headerRight: { marginLeft:'auto', display:'flex', alignItems:'center', gap:12 },
  progressLabel: { fontSize:12, color:'#6b7280' },
  saveBtn: { color:'#000', border:'none', padding:'7px 18px', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', transition:'background 0.3s' },
  body: { display:'grid', gridTemplateColumns:'200px 1fr 300px', flex:1, minHeight:0, height:'calc(100vh - 57px)' },
  leftPanel: { borderRight:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', display:'flex', flexDirection:'column', overflow:'hidden' },
  panelHead: { padding:'14px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' },
  partsList: { padding:12, overflowY:'auto', flex:1 },
  partRow: { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, border:'0.5px solid rgba(255,255,255,0.07)', marginBottom:8, cursor:'pointer', background:'#0a0c0f', transition:'all 0.2s' },
  partInstalled: { borderColor:'rgba(245,158,11,0.3)', background:'rgba(245,158,11,0.04)', cursor:'default' },
  partSelected: { borderColor:'#f59e0b' },
  partIconBox: { fontSize:16, flexShrink:0 },
  partName: { fontSize:13, fontWeight:500 },
  partSpec: { fontSize:10, color:'#6b7280' },
  uninstallBtn: { background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:11, padding:'0 2px', opacity:0.6 },
  assembledBanner: { margin:12, padding:'10px', background:'rgba(245,158,11,0.08)', border:'0.5px solid rgba(245,158,11,0.3)', borderRadius:8, fontSize:12, color:'#f59e0b', textAlign:'center' },
  centerPanel: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16, background:'#0a0c0f', overflowY:'auto' },
  cameraBody: { width:360, background:'#1a1a1a', border:'2px solid #2a2a2a', borderRadius:16, overflow:'hidden' },
  camTopBar: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'#111', borderBottom:'1px solid #222' },
  camMode: { fontSize:10, fontWeight:600 },
  camExif: { display:'flex', gap:8, fontSize:9, color:'#6b7280' },
  viewfinder: { width:'100%', height:200, background:'#000', position:'relative', overflow:'hidden', transition:'outline 0.1s' },
  noSignal: { width:'100%', height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 },
  gridOverlay: { position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize:'33.3% 33.3%', pointerEvents:'none' },
  shutterFlash: { position:'absolute', inset:0, background:'white', opacity:0.8, animation:'flash 0.15s ease-out' },
  focusBox: { position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:60, height:60, border:'1px solid rgba(255,255,255,0.4)', pointerEvents:'none' },
  filterLabel: { position:'absolute', bottom:4, right:4, fontSize:8, background:'rgba(0,0,0,0.5)', padding:'1px 4px', borderRadius:2, color:'#fff' },
  sceneRow: { display:'flex', gap:8, padding:'8px 12px', background:'#111', borderTop:'1px solid #222' },
  sceneBtn: { background:'none', border:'0.5px solid rgba(255,255,255,0.1)', borderRadius:6, padding:'4px 8px', cursor:'pointer', fontSize:16, transition:'all 0.15s' },
  sceneBtnActive: { border:'0.5px solid #f59e0b', background:'rgba(245,158,11,0.1)' },
  camControls: { padding:12, display:'flex', flexDirection:'column', gap:10, background:'#111' },
  settingsRow: { display:'flex', flexDirection:'column', gap:6 },
  settingItem: { display:'flex', alignItems:'center', gap:8 },
  settingLabel: { fontSize:10, color:'#6b7280', width:30, flexShrink:0 },
  slider: { flex:1, height:2, accentColor:'#f59e0b' },
  settingVal: { fontSize:10, color:'#f59e0b', width:36, textAlign:'right', flexShrink:0 },
  filterRow: { display:'flex', gap:4, flexWrap:'wrap' },
  filterBtn: { background:'none', border:'0.5px solid rgba(255,255,255,0.1)', color:'#6b7280', padding:'3px 8px', borderRadius:4, cursor:'pointer', fontSize:10 },
  filterBtnActive: { border:'0.5px solid #f59e0b', color:'#f59e0b', background:'rgba(245,158,11,0.1)' },
  shutterBtn: { background:'#f59e0b', color:'#000', border:'none', padding:'10px', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer', transition:'all 0.1s', width:'100%' },
  rightPanel: { borderLeft:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', display:'flex', flexDirection:'column', overflow:'hidden' },
  tabs: { display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.07)', flexShrink:0 },
  tab: { flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:'2px solid transparent', color:'#6b7280', cursor:'pointer', fontSize:12 },
  tabActive: { color:'#f59e0b', borderBottomColor:'#f59e0b' },
  filmRoll: { flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:10 },
  noPhotos: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', flex:1, gap:8, padding:40 },
  photoCard: { border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:10, overflow:'hidden' },
  photoPreview: { height:100, position:'relative', display:'flex', alignItems:'center', justifyContent:'center' },
  photoFilterBadge: { position:'absolute', top:4, right:4, fontSize:8, background:'rgba(0,0,0,0.6)', color:'#fff', padding:'1px 4px', borderRadius:2 },
  photoMeta: { padding:'8px 10px', display:'flex', flexDirection:'column', gap:2 },
  photoScene: { fontSize:12, fontWeight:500 },
  photoExif: { fontSize:10, color:'#6b7280' },
  photoTime: { fontSize:10, color:'#444' },
  codeActions: { padding:12, borderTop:'0.5px solid rgba(255,255,255,0.07)' },
  runBtn: { background:'none', border:'0.5px solid #f59e0b', color:'#f59e0b', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, width:'100%' },
  logPanel: { flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:4 },
  logEmpty: { fontSize:13, color:'#6b7280', textAlign:'center', marginTop:40 },
  logLine: { fontSize:11, color:'#00e5a0', lineHeight:1.6 },
}

export default CameraBuilder