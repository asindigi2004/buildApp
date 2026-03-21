import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'
import Editor from '@monaco-editor/react'

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
  const [saveSuccess, setSaveSuccess] = useState(false)

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
      setTab('output')
    } catch (err) {
      setOutput(`> Error: ${err.message}`)
      setTab('output')
    }
  }

  const saveBuild = async () => {
    if (!buildName.trim()) {
      alert('Please give your build a name first!')
      return
    }
    setSaving(true)
    try {
      if (!buildId) {
        const res = await api.post('/builds/', { name: buildName, device_type: deviceId })
        setBuildId(res.data.id)
        await api.patch(`/builds/${res.data.id}`, {
          name: buildName,
          parts_installed: installed.map(p => p.id),
          user_code: code
        })
      } else {
        await api.patch(`/builds/${buildId}`, {
          name: buildName,
          parts_installed: installed.map(p => p.id),
          user_code: code
        })
      }
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e) {
      alert('Save failed')
    }
    setSaving(false)
  }

  const progress = device ? Math.round((installed.length / device.parts.length) * 100) : 0

  if (!device) return (
    <div style={{color:'#e8eaf0', padding:40, fontFamily:'monospace', background:'#0a0c0f', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
      Loading device...
    </div>
  )

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
        <span style={styles.headerTitle}>// {device.name}</span>
        <input
          style={styles.nameInput}
          value={buildName}
          onChange={e => setBuildName(e.target.value)}
          placeholder="Name your build..."
        />
        <div style={styles.headerRight}>
          <span style={styles.progressLabel}>{progress}% complete</span>
          <button style={{
            ...styles.saveBtn,
            background: saveSuccess ? '#059669' : '#00e5a0'
          }} onClick={saveBuild} disabled={saving}>
            {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save Build'}
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
            <div style={styles.deviceWrapper}>

              {/* PC Visual */}
              {deviceId === 'pc' && (
                <div style={styles.pcCase}>
                  <div style={styles.pcTop}>
                    <div style={styles.pcPowerBtn} />
                    <div style={{...styles.pcLed, background: installed.length > 0 ? '#00e5a0' : '#1a1a1a'}} />
                  </div>
                  <div style={styles.pcMotherboard}>
                    {device.parts.map((part) => {
                      const isInstalled = installed.find(p => p.id === part.id)
                      return (
                        <div key={part.id} style={{...styles.pcSlot, ...(isInstalled ? styles.pcSlotFilled : {})}}>
                          {isInstalled
                            ? <span style={styles.slotLabel}>{part.name}</span>
                            : <span style={styles.slotEmpty}>{part.name}</span>
                          }
                        </div>
                      )
                    })}
                  </div>
                  <div style={styles.pcBottom}>
                    {[...Array(4)].map((_, i) => (
                      <div key={i} style={{
                        ...styles.pcFan,
                        background: installed.length > i ? 'rgba(0,229,160,0.15)' : '#0a0a0a',
                        borderColor: installed.length > i ? 'rgba(0,229,160,0.4)' : '#222',
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* CAMERA Visual */}
              {deviceId === 'camera' && (
                <div style={styles.camBody}>
                  <div style={styles.camTop}>
                    <div style={{...styles.camFlash, background: installed.find(p=>p.id==='sensor') ? '#f59e0b' : '#1a1a1a'}} />
                    <div style={styles.camShoe} />
                  </div>
                  <div style={styles.camFront}>
                    <div style={{
                      ...styles.camLens,
                      boxShadow: installed.find(p=>p.id==='lens') ? '0 0 24px rgba(0,102,255,0.5)' : 'none',
                      borderColor: installed.find(p=>p.id==='lens') ? '#0066ff' : '#222',
                    }}>
                      <div style={styles.camIris}>
                        <div style={{
                          ...styles.camPupil,
                          background: installed.find(p=>p.id==='sensor') ? '#0066ff' : '#050505',
                          boxShadow: installed.find(p=>p.id==='sensor') ? '0 0 12px #0066ff' : 'none',
                        }} />
                      </div>
                    </div>
                    <div style={styles.camSide}>
                      {device.parts.map((part) => {
                        const isInstalled = installed.find(p => p.id === part.id)
                        return (
                          <div key={part.id} style={{
                            ...styles.camIndicator,
                            background: isInstalled ? '#f59e0b' : '#1a1a1a',
                            boxShadow: isInstalled ? '0 0 6px #f59e0b' : 'none',
                          }} />
                        )
                      })}
                    </div>
                  </div>
                  <div style={styles.camScreen}>
                    {installed.find(p=>p.id==='screen')
                      ? <span style={{color:'#f59e0b', fontSize:10}}>LIVE</span>
                      : <span style={{color:'#333', fontSize:10}}>NO SIGNAL</span>
                    }
                  </div>
                </div>
              )}

              {/* KEYCHAIN Visual */}
              {deviceId === 'keychain' && (
                <div style={styles.kcBody}>
                  <div style={styles.kcHole} />
                  <div style={{
                    ...styles.kcScreen,
                    borderColor: installed.find(p=>p.id==='display') ? '#00e5a0' : '#222',
                    boxShadow: installed.find(p=>p.id==='display') ? '0 0 16px rgba(0,229,160,0.3)' : 'none',
                  }}>
                    {installed.find(p=>p.id==='display')
                      ? output.includes('Display:')
                        ? <span style={{color:'#00e5a0', fontSize:11}}>{output.match(/"(.+)"/)?.[1] || 'ON'}</span>
                        : <span style={{color:'#00e5a0', fontSize:11}}>READY</span>
                      : <span style={{color:'#333', fontSize:10}}>NO DISPLAY</span>
                    }
                  </div>
                  <div style={styles.kcChip}>
                    {installed.find(p=>p.id==='mcu')
                      ? <span style={{color:'#00e5a0', fontSize:8}}>RP2040</span>
                      : <span style={{color:'#333', fontSize:8}}>EMPTY</span>
                    }
                  </div>
                  <div style={styles.kcButtons}>
                    {[...Array(3)].map((_, i) => (
                      <div key={i} style={{
                        ...styles.kcBtn,
                        background: installed.find(p=>p.id==='button') ? 'rgba(0,229,160,0.3)' : '#1a1a2e',
                        borderColor: installed.find(p=>p.id==='button') ? '#00e5a0' : '#3a3a6e',
                      }} />
                    ))}
                  </div>
                  <div style={styles.kcBattery}>
                    <div style={{
                      ...styles.kcBatteryFill,
                      width: `${(installed.length / (device?.parts.length || 1)) * 100}%`
                    }} />
                  </div>
                </div>
              )}

            </div>
          </div>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progress}%`}} />
          </div>
          <p style={{fontSize:12, color:'#6b7280'}}>{progress}% assembled</p>
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
                : installed.map(p => (
                    <div key={p.id} style={styles.installedRow}>
                      <span style={{color:'#00e5a0'}}>✓</span> {p.name}
                      <span style={{marginLeft:'auto', fontSize:11, color:'#6b7280'}}>{p.spec}</span>
                    </div>
                  ))
              }
              {progress === 100 && (
                <div style={styles.completeBanner}>
                  🎉 Build complete! Go to Code tab to program it.
                </div>
              )}
            </div>
          )}

          {tab === 'code' && (
            <div style={{display:'flex', flexDirection:'column', gap:10, flex:1, padding:16}}>
              <p style={styles.infoMuted}>Use <span style={{color:'#00e5a0'}}>setDisplay()</span> to show text on screen. Use <span style={{color:'#00e5a0'}}>console.log()</span> to print output.</p>
              <div style={{flex:1, minHeight:280, borderRadius:8, overflow:'hidden', border:'0.5px solid rgba(255,255,255,0.1)'}}>
                <Editor
                  height="280px"
                  defaultLanguage="javascript"
                  theme="vs-dark"
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    cursorStyle: 'line',
                    automaticLayout: true,
                    tabSize: 2,
                    wordWrap: 'on',
                    padding: { top: 12 }
                  }}
                />
              </div>
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
  header: { display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', background: '#111318', flexWrap: 'wrap' },
  back: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', color: '#e8eaf0', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12 },
  headerTitle: { color: '#00e5a0', fontSize: 13 },
  nameInput: { background: 'none', border: 'none', borderBottom: '0.5px solid rgba(255,255,255,0.2)', color: '#e8eaf0', fontSize: 13, padding: '4px 8px', fontFamily: 'monospace', outline: 'none', width: 200 },
  headerRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 },
  progressLabel: { fontSize: 12, color: '#6b7280' },
  saveBtn: { color: '#000', border: 'none', padding: '7px 18px', borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: 'pointer', transition: 'background 0.3s' },
  body: { display: 'grid', gridTemplateColumns: '220px 1fr 280px', flex: 1, minHeight: 0 },
  leftPanel: { borderRight: '0.5px solid rgba(255,255,255,0.07)', background: '#111318', display: 'flex', flexDirection: 'column' },
  panelHead: { padding: '14px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' },
  partsList: { padding: 12, overflowY: 'auto', flex: 1 },
  partRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: '0.5px solid rgba(255,255,255,0.07)', marginBottom: 8, cursor: 'pointer', background: '#0a0c0f', transition: 'all 0.2s' },
  partInstalled: { borderColor: 'rgba(0,229,160,0.3)', background: 'rgba(0,229,160,0.05)', cursor: 'default' },
  partSelected: { borderColor: '#00e5a0' },
  partIcon: { fontSize: 18, flexShrink: 0 },
  partName: { fontSize: 13, fontWeight: 500 },
  partSpec: { fontSize: 11, color: '#6b7280' },
  check: { marginLeft: 'auto', color: '#00e5a0' },
  centerPanel: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  assemblyView: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  deviceWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '20px 0' },
  pcCase: { width: 280, background: '#111', border: '1.5px solid #222', borderRadius: 12, overflow: 'hidden' },
  pcTop: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderBottom: '1px solid #1a1a1a', background: '#0d0d0d' },
  pcPowerBtn: { width: 14, height: 14, borderRadius: '50%', background: '#1a1a1a', border: '1.5px solid #333' },
  pcLed: { width: 6, height: 6, borderRadius: '50%', transition: 'background 0.3s' },
  pcMotherboard: { padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#0a120a' },
  pcSlot: { padding: '8px 10px', borderRadius: 6, border: '1px dashed #1a3a1e', background: '#0a0a0a', transition: 'all 0.3s', minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pcSlotFilled: { border: '1px solid rgba(0,229,160,0.5)', background: 'rgba(0,229,160,0.07)', boxShadow: '0 0 8px rgba(0,229,160,0.1)' },
  pcBottom: { display: 'flex', gap: 8, padding: '10px 16px', borderTop: '1px solid #1a1a1a', background: '#0d0d0d' },
  pcFan: { width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #222', transition: 'all 0.3s' },
  slotLabel: { fontSize: 9, color: '#00e5a0', textAlign: 'center' },
  slotEmpty: { fontSize: 9, color: '#2a3a2a', textAlign: 'center' },
  camBody: { width: 220, background: '#111', border: '1.5px solid #222', borderRadius: 10, overflow: 'hidden' },
  camTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a' },
  camFlash: { width: 16, height: 8, borderRadius: 3, transition: 'background 0.3s' },
  camShoe: { width: 30, height: 6, background: '#1a1a1a', borderRadius: 2 },
  camFront: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 16px' },
  camLens: { width: 90, height: 90, borderRadius: '50%', background: '#050505', border: '3px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' },
  camIris: { width: 58, height: 58, borderRadius: '50%', background: '#0a0a0a', border: '2px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  camPupil: { width: 24, height: 24, borderRadius: '50%', transition: 'all 0.4s' },
  camSide: { display: 'flex', flexDirection: 'column', gap: 6 },
  camIndicator: { width: 8, height: 8, borderRadius: '50%', transition: 'all 0.3s' },
  camScreen: { height: 36, background: '#000', borderTop: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kcBody: { width: 140, background: '#1a1a2e', border: '2px solid #2a2a4e', borderRadius: 20, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  kcHole: { width: 12, height: 12, borderRadius: '50%', border: '2px solid #3a3a6e' },
  kcScreen: { width: 110, height: 70, background: '#000', border: '1.5px solid #333', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.4s' },
  kcChip: { width: 40, height: 40, background: '#111', border: '1px solid #333', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  kcButtons: { display: 'flex', gap: 10 },
  kcBtn: { width: 20, height: 20, borderRadius: '50%', border: '1.5px solid #3a3a6e', transition: 'all 0.3s' },
  kcBattery: { width: '80%', height: 4, background: '#1a1a3a', borderRadius: 2, overflow: 'hidden' },
  kcBatteryFill: { height: '100%', background: '#00e5a0', borderRadius: 2, transition: 'width 0.5s ease' },
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
  completeBanner: { background: 'rgba(0,229,160,0.1)', border: '0.5px solid rgba(0,229,160,0.3)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#00e5a0', textAlign: 'center' },
  runBtn: { background: 'none', border: '0.5px solid #00e5a0', color: '#00e5a0', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  outputBox: { flex: 1, background: '#0a0c0f', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 12, color: '#00e5a0', lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: 200 }
}

export default Builder