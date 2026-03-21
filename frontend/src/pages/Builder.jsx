import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

function Builder() {
  const { deviceId } = useParams()
  const navigate = useNavigate()
  const [device, setDevice] = useState(null)
  const [installed, setInstalled] = useState([])
  const [selected, setSelected] = useState(null)
  const [code, setCode] = useState('// Write your code here\n// Use setDisplay("text") to show on screen\n\nfunction setup() {\n  setDisplay("Hello!");\n}\n\nsetup();')
  const [output, setOutput] = useState('// output will appear here')
  const [buildId, setBuildId] = useState(null)
  const [buildName, setBuildName] = useState('')
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('parts')

  useEffect(() => {
    api.get(`/devices/${deviceId}`).then(r => {
      setDevice(r.data)
      setBuildName(`My ${r.data.name}`)
    })
  }, [deviceId])

  const installPart = (part) => {
    if (installed.find(p => p.id === part.id)) return
    setInstalled(prev => [...prev, part])
    setSelected(part)
  }

  const runCode = () => {
    let displayValue = ''
    const logs = []
    try {
      const sandbox = {
        setDisplay: (val) => { displayValue = String(val) },
        console: { log: (...args) => logs.push(args.join(' ')) },
        installed: installed.map(p => p.id)
      }
      const fn = new Function(...Object.keys(sandbox), code)
      fn(...Object.values(sandbox))
      setOutput(displayValue
        ? `> Display: "${displayValue}"\n${logs.map(l => `> ${l}`).join('\n')}`
        : logs.length ? logs.map(l => `> ${l}`).join('\n') : '> Code ran successfully')
    } catch (err) {
      setOutput(`> Error: ${err.message}`)
    }
  }

  const saveBuild = async () => {
    setSaving(true)
    try {
      if (!buildId) {
        const res = await api.post('/builds/', { name: buildName, device_type: deviceId })
        setBuildId(res.data.id)
        await api.patch(`/builds/${res.data.id}`, { parts_installed: installed.map(p => p.id), user_code: code })
      } else {
        await api.patch(`/builds/${buildId}`, { parts_installed: installed.map(p => p.id), user_code: code })
      }
      alert('Build saved!')
    } catch (e) {
      alert('Save failed')
    }
    setSaving(false)
  }

  const progress = device ? Math.round((installed.length / device.parts.length) * 100) : 0

  if (!device) return <div style={{color:'#e8eaf0',padding:40,fontFamily:'monospace'}}>Loading...</div>

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
        <span style={styles.headerTitle}>// {device.name}</span>
        <div style={styles.headerRight}>
          <span style={styles.progressLabel}>{progress}% complete</span>
          <button style={styles.saveBtn} onClick={saveBuild} disabled={saving}>
            {saving ? 'Saving...' : 'Save Build'}
          </button>
        </div>
      </div>

      <div style={styles.body}>
        {/* LEFT - parts */}
        <div style={styles.leftPanel}>
          <div style={styles.panelHead}>Components ({installed.length}/{device.parts.length})</div>
          <div style={styles.partsList}>
            {device.parts.map(part => {
              const isInstalled = installed.find(p => p.id === part.id)
              return (
                <div key={part.id}
                  style={{...styles.partRow, ...(isInstalled ? styles.partInstalled : {}), ...(selected?.id === part.id ? styles.partSelected : {})}}
                  onClick={() => !isInstalled && installPart(part)}>
                  <div style={styles.partIcon}>⚙️</div>
                  <div>
                    <div style={styles.partName}>{part.name}</div>
                    <div style={styles.partSpec}>{part.spec}</div>
                  </div>
                  {isInstalled && <span style={styles.check}>✓</span>}
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER - assembly */}
        <div style={styles.centerPanel}>
          <div style={styles.assemblyView}>
            <div style={styles.deviceVisual}>
              <div style={styles.deviceScreen}>
                {installed.length === 0
                  ? <span style={{color:'#333', fontSize:12}}>Add components to begin</span>
                  : output.includes('Display:')
                    ? <span style={{color:'#00e5a0', fontSize:14}}>{output.match(/"(.+)"/)?.[1] || ''}</span>
                    : <span style={{color:'#333', fontSize:12}}>{installed.length} parts installed</span>
                }
              </div>
              <div style={styles.deviceBody}>
                {installed.map((part, i) => (
                  <div key={part.id} style={{...styles.chipSlot, animationDelay: `${i * 0.1}s`}}>
                    <span style={{fontSize:10}}>{part.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progress}%`}} />
          </div>
        </div>

        {/* RIGHT - code + info */}
        <div style={styles.rightPanel}>
          <div style={styles.tabs}>
            <button style={{...styles.tab, ...(tab==='parts' ? styles.tabActive : {})}} onClick={() => setTab('parts')}>Info</button>
            <button style={{...styles.tab, ...(tab==='code' ? styles.tabActive : {})}} onClick={() => setTab('code')}>Code</button>
            <button style={{...styles.tab, ...(tab==='output' ? styles.tabActive : {})}} onClick={() => setTab('output')}>Output</button>
          </div>

          {tab === 'parts' && (
            <div style={styles.tabContent}>
              <p style={styles.infoTitle}>{selected ? selected.name : 'Select a part'}</p>
              {selected && <p style={styles.infoSpec}>{selected.spec}</p>}
              <div style={styles.divider} />
              <p style={styles.infoLabel}>Installed parts</p>
              {installed.length === 0
                ? <p style={styles.infoMuted}>None yet — click a component to install it</p>
                : installed.map(p => <div key={p.id} style={styles.installedRow}><span style={{color:'#00e5a0'}}>✓</span> {p.name}</div>)
              }
            </div>
          )}

          {tab === 'code' && (
            <div style={styles.tabContent}>
              <p style={styles.infoMuted}>Write code to control your device. Use setDisplay() to show text on screen.</p>
              <textarea
                style={styles.codeEditor}
                value={code}
                onChange={e => setCode(e.target.value)}
                spellCheck={false}
              />
              <button style={styles.runBtn} onClick={runCode}>▶ Run Code</button>
            </div>
          )}

          {tab === 'output' && (
            <div style={styles.tabContent}>
              <pre style={styles.outputBox}>{output}</pre>
              <button style={styles.runBtn} onClick={runCode}>▶ Run Again</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0a0c0f', color: '#e8eaf0', fontFamily: 'monospace', display: 'flex', flexDirection: 'column' },
  header: { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#111318' },
  back: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', color: '#e8eaf0', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 },
  headerTitle: { color: '#00e5a0', fontSize: 13 },
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 },
  progressLabel: { fontSize: 12, color: '#6b7280' },
  saveBtn: { background: '#00e5a0', color: '#000', border: 'none', padding: '7px 18px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer' },
  body: { display: 'grid', gridTemplateColumns: '220px 1fr 280px', flex: 1, minHeight: 0 },
  leftPanel: { borderRight: '0.5px solid rgba(255,255,255,0.07)', background: '#111318', display: 'flex', flexDirection: 'column' },
  panelHead: { padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' },
  partsList: { padding: 12, overflowY: 'auto', flex: 1 },
  partRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.07)', marginBottom: 8, cursor: 'pointer', background: '#0a0c0f', transition: 'border-color 0.15s' },
  partInstalled: { borderColor: 'rgba(0,229,160,0.3)', background: 'rgba(0,229,160,0.05)', cursor: 'default' },
  partSelected: { borderColor: '#00e5a0' },
  partIcon: { fontSize: 18, flexShrink: 0 },
  partName: { fontSize: 13, fontWeight: 500 },
  partSpec: { fontSize: 11, color: '#6b7280' },
  check: { marginLeft: 'auto', color: '#00e5a0' },
  centerPanel: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  assemblyView: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  deviceVisual: { width: 240, background: '#111318', border: '1.5px solid rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' },
  deviceScreen: { height: 80, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #1a1a1a' },
  deviceBody: { padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 100 },
  chipSlot: { padding: '4px 8px', background: 'rgba(0,229,160,0.08)', border: '0.5px solid rgba(0,229,160,0.3)', borderRadius: 4, fontSize: 10, color: '#00e5a0' },
  progressBar: { width: '100%', height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: '#00e5a0', borderRadius: 2, transition: 'width 0.4s ease' },
  rightPanel: { borderLeft: '0.5px solid rgba(255,255,255,0.07)', background: '#111318', display: 'flex', flexDirection: 'column' },
  tabs: { display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
  tab: { flex: 1, padding: '12px 8px', background: 'none', border: 'none', borderBottom: '2px solid transparent', color: '#6b7280', cursor: 'pointer', fontSize: 12 },
  tabActive: { color: '#00e5a0', borderBottomColor: '#00e5a0' },
  tabContent: { padding: 16, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 },
  infoTitle: { fontSize: 15, fontWeight: 600 },
  infoSpec: { fontSize: 12, color: '#00e5a0' },
  infoLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' },
  infoMuted: { fontSize: 13, color: '#6b7280', lineHeight: 1.6 },
  divider: { height: '0.5px', background: 'rgba(255,255,255,0.07)' },
  installedRow: { fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, color: '#e8eaf0' },
  codeEditor: { flex: 1, minHeight: 240, background: '#0a0c0f', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8eaf0', fontSize: 12, padding: 12, resize: 'none', fontFamily: 'monospace', lineHeight: 1.6, outline: 'none' },
  runBtn: { background: 'none', border: '0.5px solid #00e5a0', color: '#00e5a0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  outputBox: { flex: 1, background: '#0a0c0f', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 12, color: '#00e5a0', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: 200 }
}

export default Builder