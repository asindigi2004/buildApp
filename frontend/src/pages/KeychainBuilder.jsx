import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import api from '../api/client'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'

const PARTS = [
  { id: 'mcu', name: 'Microcontroller', spec: 'RP2040 dual-core' },
  { id: 'display', name: 'OLED Display', spec: '128x64px SSD1306' },
  { id: 'battery', name: 'Battery', spec: '110mAh LiPo' },
  { id: 'button', name: 'Buttons', spec: 'x3 tactile' },
  { id: 'case', name: 'Case', spec: '3D printed' },
]

const SCREEN_W = 128
const SCREEN_H = 64
const SCALE = 2

const DEFAULT_CODE = `# BuildLab Keychain Simulator
# MicroPython-style API

import time

# Button events fire automatically
def on_button_a():
    display.fill(0)
    display.text("Button A!", 10, 25)
    display.show()

def on_button_b():
    display.fill(0)
    display.text("Button B!", 10, 25)
    display.show()

def on_button_c():
    display.fill(0)
    display.text("Button C!", 10, 25)
    display.show()

# Main loop - runs continuously
counter = 0
while True:
    display.fill(0)
    display.text("BuildLab", 28, 5)
    display.text("Keychain v1", 18, 20)
    display.text("Count: " + str(counter), 20, 40)
    display.show()
    counter += 1
    time.sleep(0.5)
`

function KeychainBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const canvasRef = useRef(null)
  const loopRef = useRef(null)
  const stateRef = useRef({})
  const buttonPressedRef = useRef({ a: false, b: false, c: false })

  const [installed, setInstalled] = useState([])
  const [code, setCode] = useState(DEFAULT_CODE)
  const [buildName, setBuildName] = useState('My Keychain')
  const [buildId, setBuildId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([])
  const [tab, setTab] = useState('code')
  const [selected, setSelected] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const { toast, showToast, hideToast } = useToast()

  const isAssembled = PARTS.every(p => installed.find(i => i.id === p.id))
  const hasDisplay = installed.find(p => p.id === 'display')
  const hasButtons = installed.find(p => p.id === 'button')
  const hasMCU = installed.find(p => p.id === 'mcu')
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

  useEffect(() => {
    drawIdle()
  }, [installed])

  const drawIdle = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, SCREEN_W * SCALE, SCREEN_H * SCALE)
    if (!hasDisplay) {
      ctx.fillStyle = '#1a1a1a'
      ctx.font = '8px monospace'
      ctx.fillText('NO DISPLAY', 30, 35)
      return
    }
    if (!hasMCU) {
      ctx.fillStyle = '#1a1a1a'
      ctx.font = '8px monospace'
      ctx.fillText('NO MCU', 42, 35)
      return
    }
    ctx.fillStyle = '#00e5a0'
    ctx.font = 'bold 9px monospace'
    ctx.fillText('READY', 47, 20)
    ctx.font = '7px monospace'
    ctx.fillStyle = '#007a50'
    ctx.fillText('Press RUN to start', 18, 38)
    ctx.fillText('BuildLab Keychain', 20, 52)
  }

  const addLog = (msg, type = 'info') => {
    setLog(prev => [...prev.slice(-50), { msg: String(msg), type, time: new Date().toLocaleTimeString() }])
  }

  const stopLoop = () => {
    if (loopRef.current) {
      clearTimeout(loopRef.current)
      loopRef.current = null
    }
    setRunning(false)
  }

  const runCode = useCallback(() => {
    if (!hasMCU) { showToast('Install MCU first!', 'error'); return }
    if (!hasDisplay) { showToast('Install display first!', 'error'); return }
    stopLoop()
    setLog([])
    addLog('Starting...', 'system')

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // pixel buffer
    const pixelBuffer = new Uint8Array(SCREEN_W * SCREEN_H)

    const displayAPI = {
      fill: (col) => pixelBuffer.fill(col ? 1 : 0),
      pixel: (x, y, col = 1) => {
        if (x >= 0 && x < SCREEN_W && y >= 0 && y < SCREEN_H)
          pixelBuffer[y * SCREEN_W + x] = col
      },
      text: (str, x, y, col = 1) => {
        const chars = String(str).split('')
        chars.forEach((ch, i) => drawChar(pixelBuffer, ch, x + i * 6, y, col))
      },
      show: () => {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, SCREEN_W * SCALE, SCREEN_H * SCALE)
        for (let py = 0; py < SCREEN_H; py++) {
          for (let px = 0; px < SCREEN_W; px++) {
            if (pixelBuffer[py * SCREEN_W + px]) {
              ctx.fillStyle = '#00e5a0'
              ctx.fillRect(px * SCALE, py * SCALE, SCALE, SCALE)
            }
          }
        }
      },
      rect: (x, y, w, h, col = 1) => {
        for (let i = x; i < x + w; i++) {
          displayAPI.pixel(i, y, col)
          displayAPI.pixel(i, y + h - 1, col)
        }
        for (let j = y; j < y + h; j++) {
          displayAPI.pixel(x, j, col)
          displayAPI.pixel(x + w - 1, j, col)
        }
      },
      fill_rect: (x, y, w, h, col = 1) => {
        for (let py = y; py < y + h; py++)
          for (let px = x; px < x + w; px++)
            displayAPI.pixel(px, py, col)
      },
    }

    const buttonAPI = {
      a: { get is_pressed() { return buttonPressedRef.current.a } },
      b: { get is_pressed() { return buttonPressedRef.current.b } },
      c: { get is_pressed() { return buttonPressedRef.current.c } },
    }

    const timeAPI = {
      sleep: (s) => new Promise(r => setTimeout(r, s * 1000)),
      sleep_ms: (ms) => new Promise(r => setTimeout(r, ms)),
      ticks_ms: () => Date.now(),
    }

    stateRef.current = {}

    const userState = {}
    let shouldRun = true
    loopRef.current = true
    setRunning(true)

    const buttonHandlers = {}

    const runUserCode = async () => {
      try {
        const wrappedCode = transformCode(code)
        const fn = new Function(
          'display', 'button_a', 'button_b', 'button_c', 'time',
          'print', '__state', '__handlers',
          wrappedCode
        )
        await fn(
          displayAPI,
          buttonAPI.a, buttonAPI.b, buttonAPI.c,
          timeAPI,
          (...args) => addLog(args.join(' '), 'print'),
          userState,
          buttonHandlers
        )
      } catch (err) {
        if (err.message !== 'STOP') {
          addLog(`Error: ${err.message}`, 'error')
        }
        stopLoop()
      }
    }

    stateRef.current.stop = () => { shouldRun = false }
    runUserCode()
  }, [code, installed])

  const pressButton = (btn) => {
    if (!running || !hasButtons) return
    buttonPressedRef.current[btn] = true
    setTimeout(() => { buttonPressedRef.current[btn] = false }, 200)
    addLog(`Button ${btn.toUpperCase()} pressed`, 'system')
  }

  const installPart = (part) => {
    if (installed.find(p => p.id === part.id)) return
    setInstalled(prev => [...prev, part])
    setSelected(part)
    addLog(`${part.name} installed`, 'system')
  }

  const uninstallPart = (partId) => {
    stopLoop()
    setInstalled(prev => prev.filter(p => p.id !== partId))
  }

  const saveBuild = async () => {
    if (!buildName.trim()) { showToast('Name your build first!', 'error'); return }
    setSaving(true)
    try {
      if (!buildId) {
        const res = await api.post('/builds/', { name: buildName, device_type: 'keychain' })
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
      showToast('Build saved!')
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (e) {
      showToast('Save failed', 'error')
    }
    setSaving(false)
  }

  return (
    <div style={styles.page}>
      <style>{`@media(max-width:768px){.kc-body{grid-template-columns:1fr!important}}`}</style>

      <div style={styles.header}>
        <button style={styles.back} onClick={() => { stopLoop(); navigate('/') }}>← Back</button>
        <span style={styles.headerTitle}>// Keychain Builder</span>
        <input style={styles.nameInput} value={buildName} onChange={e => setBuildName(e.target.value)} placeholder="Name your build..." />
        <div style={styles.headerRight}>
          <span style={styles.progressLabel}>{progress}% assembled</span>
          <button style={{...styles.saveBtn, background: saveSuccess ? '#059669' : '#00e5a0'}}
            onClick={saveBuild} disabled={saving}>
            {saving ? 'Saving...' : saveSuccess ? '✓ Saved!' : 'Save'}
          </button>
        </div>
      </div>

      <div style={styles.body} className="kc-body">

        {/* LEFT - parts */}
        <div style={styles.leftPanel}>
          <div style={styles.panelHead}>Components ({installed.length}/{PARTS.length})</div>
          <div style={styles.partsList}>
            {PARTS.map(part => {
              const isInstalled = installed.find(p => p.id === part.id)
              return (
                <div key={part.id} style={{
                  ...styles.partRow,
                  ...(isInstalled ? styles.partInstalled : {}),
                  ...(selected?.id === part.id ? styles.partSelected : {})
                }} onClick={() => !isInstalled && installPart(part)}>
                  <div style={styles.partIconBox}>
                    {part.id === 'mcu' ? '🧠' : part.id === 'display' ? '📺' : part.id === 'battery' ? '🔋' : part.id === 'button' ? '🔘' : '📦'}
                  </div>
                  <div style={{flex:1}}>
                    <div style={styles.partName}>{part.name}</div>
                    <div style={styles.partSpec}>{part.spec}</div>
                  </div>
                  {isInstalled && (
                    <button style={styles.uninstallBtn} onClick={e => { e.stopPropagation(); uninstallPart(part.id) }}>✕</button>
                  )}
                </div>
              )
            })}
          </div>
          {isAssembled && (
            <div style={styles.assembledBanner}>🎉 Fully assembled!</div>
          )}
        </div>

        {/* CENTER - device */}
        <div style={styles.centerPanel}>
          <div style={styles.deviceOuter}>
            <div style={styles.deviceBody}>
              <div style={styles.deviceHole} />

              {/* OLED Screen */}
              <div style={{
                ...styles.screenWrap,
                borderColor: hasDisplay ? (running ? '#00e5a0' : '#007a50') : '#222',
                boxShadow: running ? '0 0 20px rgba(0,229,160,0.3)' : 'none'
              }}>
                <canvas
                  ref={canvasRef}
                  width={SCREEN_W * SCALE}
                  height={SCREEN_H * SCALE}
                  style={styles.canvas}
                />
              </div>

              {/* Status LEDs */}
              <div style={styles.ledRow}>
                <div style={{...styles.led, background: hasMCU ? '#00e5a0' : '#1a1a2e'}} title="MCU" />
                <div style={{...styles.led, background: hasDisplay ? '#0066ff' : '#1a1a2e'}} title="Display" />
                <div style={{...styles.led, background: installed.find(p=>p.id==='battery') ? '#f59e0b' : '#1a1a2e'}} title="Battery" />
              </div>

              {/* Buttons */}
              <div style={styles.btnRow}>
                {['a','b','c'].map(btn => (
                  <button key={btn} style={{
                    ...styles.hwBtn,
                    background: hasButtons && running ? 'rgba(0,229,160,0.15)' : '#0a0a1a',
                    borderColor: hasButtons && running ? '#00e5a0' : '#2a2a4e',
                    cursor: hasButtons && running ? 'pointer' : 'not-allowed',
                    opacity: hasButtons ? 1 : 0.4,
                  }}
                  onMouseDown={() => pressButton(btn)}
                  onTouchStart={() => pressButton(btn)}>
                    {btn.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Chip */}
              <div style={{...styles.chip, borderColor: hasMCU ? '#00e5a0' : '#222'}}>
                <span style={{fontSize:7, color: hasMCU ? '#00e5a0' : '#333'}}>RP2040</span>
              </div>

              {/* Battery indicator */}
              <div style={styles.batteryBar}>
                <div style={{
                  ...styles.batteryFill,
                  width: `${progress}%`,
                  background: progress === 100 ? '#00e5a0' : '#f59e0b'
                }} />
              </div>
            </div>
          </div>

          {/* Run / Stop */}
          <div style={styles.runRow}>
            {!running ? (
              <button style={{
                ...styles.runBtn,
                opacity: (hasMCU && hasDisplay) ? 1 : 0.4,
                cursor: (hasMCU && hasDisplay) ? 'pointer' : 'not-allowed'
              }} onClick={runCode}>
                ▶ Run
              </button>
            ) : (
              <button style={styles.stopBtn} onClick={stopLoop}>
                ■ Stop
              </button>
            )}
            <span style={styles.runHint}>
              {!hasMCU ? 'Install MCU to run code' : !hasDisplay ? 'Install display to run code' : running ? 'Running...' : 'Ready to run'}
            </span>
          </div>
        </div>

        {/* RIGHT - editor + log */}
        <div style={styles.rightPanel}>
          <div style={styles.tabs}>
            <button style={{...styles.tab, ...(tab==='code' ? styles.tabActive : {})}} onClick={() => setTab('code')}>Code</button>
            <button style={{...styles.tab, ...(tab==='log' ? styles.tabActive : {})}} onClick={() => setTab('log')}>
              Log {log.length > 0 && <span style={styles.logBadge}>{log.length}</span>}
            </button>
            <button style={{...styles.tab, ...(tab==='api' ? styles.tabActive : {})}} onClick={() => setTab('api')}>API</button>
          </div>

          {tab === 'code' && (
            <div style={{flex:1, display:'flex', flexDirection:'column', gap:0, overflow:'hidden'}}>
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={val => { setCode(val || ''); if(running) stopLoop() }}
                options={{
                  fontSize: 12,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: 'on',
                  padding: { top: 12 }
                }}
              />
            </div>
          )}

          {tab === 'log' && (
            <div style={styles.logPanel}>
              {log.length === 0
                ? <p style={styles.logEmpty}>No output yet — run your code</p>
                : log.map((l, i) => (
                  <div key={i} style={{
                    ...styles.logLine,
                    color: l.type === 'error' ? '#ef4444' : l.type === 'system' ? '#6b7280' : '#00e5a0'
                  }}>
                    <span style={styles.logTime}>{l.time}</span> {l.msg}
                  </div>
                ))
              }
            </div>
          )}

          {tab === 'api' && (
            <div style={styles.apiPanel}>
              <p style={styles.apiTitle}>Display API</p>
              {[
                ['display.fill(0)', 'Clear screen (0=black, 1=white)'],
                ['display.text("hi", x, y)', 'Draw text at position'],
                ['display.pixel(x, y)', 'Draw single pixel'],
                ['display.rect(x, y, w, h)', 'Draw rectangle outline'],
                ['display.fill_rect(x, y, w, h)', 'Draw filled rectangle'],
                ['display.show()', 'Flush buffer to screen'],
              ].map(([fn, desc]) => (
                <div key={fn} style={styles.apiRow}>
                  <code style={styles.apiCode}>{fn}</code>
                  <span style={styles.apiDesc}>{desc}</span>
                </div>
              ))}
              <p style={{...styles.apiTitle, marginTop:16}}>Button API</p>
              {[
                ['button_a.is_pressed', 'True while A is held'],
                ['button_b.is_pressed', 'True while B is held'],
                ['button_c.is_pressed', 'True while C is held'],
              ].map(([fn, desc]) => (
                <div key={fn} style={styles.apiRow}>
                  <code style={styles.apiCode}>{fn}</code>
                  <span style={styles.apiDesc}>{desc}</span>
                </div>
              ))}
              <p style={{...styles.apiTitle, marginTop:16}}>Time API</p>
              {[
                ['time.sleep(s)', 'Sleep for s seconds'],
                ['time.sleep_ms(ms)', 'Sleep for ms milliseconds'],
                ['time.ticks_ms()', 'Current time in ms'],
              ].map(([fn, desc]) => (
                <div key={fn} style={styles.apiRow}>
                  <code style={styles.apiCode}>{fn}</code>
                  <span style={styles.apiDesc}>{desc}</span>
                </div>
              ))}
              <p style={{...styles.apiTitle, marginTop:16}}>Other</p>
              {[
                ['print("msg")', 'Print to log panel'],
              ].map(([fn, desc]) => (
                <div key={fn} style={styles.apiRow}>
                  <code style={styles.apiCode}>{fn}</code>
                  <span style={styles.apiDesc}>{desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}

// Simple 5x7 font renderer
function drawChar(buf, ch, x, y, col) {
  const font = {
    'A':[[0,1,1,0,0],[1,0,0,1,0],[1,1,1,1,0],[1,0,0,1,0],[1,0,0,1,0]],
    'B':[[1,1,1,0,0],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,1,0],[1,1,1,0,0]],
    'C':[[0,1,1,0,0],[1,0,0,1,0],[1,0,0,0,0],[1,0,0,1,0],[0,1,1,0,0]],
    'D':[[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0]],
    'E':[[1,1,1,1,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,1,1,1,0]],
    'F':[[1,1,1,1,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0]],
    'G':[[0,1,1,0,0],[1,0,0,0,0],[1,0,1,1,0],[1,0,0,1,0],[0,1,1,0,0]],
    'H':[[1,0,0,1,0],[1,0,0,1,0],[1,1,1,1,0],[1,0,0,1,0],[1,0,0,1,0]],
    'I':[[1,1,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,1,1,0,0]],
    'J':[[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,0,1,0,0],[0,1,0,0,0]],
    'K':[[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0]],
    'L':[[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0]],
    'M':[[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    'N':[[1,0,0,1,0],[1,1,0,1,0],[1,0,1,1,0],[1,0,0,1,0],[1,0,0,1,0]],
    'O':[[0,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
    'P':[[1,1,1,0,0],[1,0,0,1,0],[1,1,1,0,0],[1,0,0,0,0],[1,0,0,0,0]],
    'Q':[[0,1,1,0,0],[1,0,0,1,0],[1,0,1,1,0],[1,0,0,1,0],[0,1,1,1,0]],
    'R':[[1,1,1,0,0],[1,0,0,1,0],[1,1,1,0,0],[1,0,1,0,0],[1,0,0,1,0]],
    'S':[[0,1,1,1,0],[1,0,0,0,0],[0,1,1,0,0],[0,0,0,1,0],[1,1,1,0,0]],
    'T':[[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'U':[[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
    'V':[[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,1,0,1,0],[0,0,1,0,0]],
    'W':[[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
    'X':[[1,0,0,1,0],[0,1,1,0,0],[0,0,0,0,0],[0,1,1,0,0],[1,0,0,1,0]],
    'Y':[[1,0,0,1,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
    'Z':[[1,1,1,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,0]],
    '0':[[0,1,1,0,0],[1,0,0,1,0],[1,0,0,1,0],[1,0,0,1,0],[0,1,1,0,0]],
    '1':[[0,1,0,0,0],[1,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[1,1,1,0,0]],
    '2':[[1,1,1,0,0],[0,0,0,1,0],[0,1,1,0,0],[1,0,0,0,0],[1,1,1,1,0]],
    '3':[[1,1,1,0,0],[0,0,0,1,0],[0,1,1,0,0],[0,0,0,1,0],[1,1,1,0,0]],
    '4':[[1,0,1,0,0],[1,0,1,0,0],[1,1,1,1,0],[0,0,1,0,0],[0,0,1,0,0]],
    '5':[[1,1,1,1,0],[1,0,0,0,0],[1,1,1,0,0],[0,0,0,1,0],[1,1,1,0,0]],
    '6':[[0,1,1,0,0],[1,0,0,0,0],[1,1,1,0,0],[1,0,0,1,0],[0,1,1,0,0]],
    '7':[[1,1,1,1,0],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0]],
    '8':[[0,1,1,0,0],[1,0,0,1,0],[0,1,1,0,0],[1,0,0,1,0],[0,1,1,0,0]],
    '9':[[0,1,1,0,0],[1,0,0,1,0],[0,1,1,1,0],[0,0,0,1,0],[0,1,1,0,0]],
    ' ':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
    '.':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,1,0,0,0]],
    ':':[[0,0,0,0,0],[0,1,0,0,0],[0,0,0,0,0],[0,1,0,0,0],[0,0,0,0,0]],
    '!':[[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,0,0,0,0],[0,1,0,0,0]],
    '?':[[0,1,1,0,0],[1,0,0,1,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
    '-':[[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,0],[0,0,0,0,0],[0,0,0,0,0]],
    '_':[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[1,1,1,1,0]],
    '/':[[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[0,0,0,0,0]],
  }
  const glyph = font[ch.toUpperCase()] || font[' ']
  glyph.forEach((row, dy) => {
    row.forEach((px, dx) => {
      if (px && x+dx >= 0 && x+dx < SCREEN_W && y+dy >= 0 && y+dy < SCREEN_H) {
        buf[(y+dy)*SCREEN_W + (x+dx)] = col
      }
    })
  })
}

// Transform Python-like code to JS
function transformCode(code) {
  let js = code
  js = js.replace(/#.*$/gm, '')
  js = js.replace(/^import\s+.+$/gm, '')
  js = js.replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null')
  js = js.replace(/elif\s+(.+?):/g, '} else if ($1) {')
  js = js.replace(/else:/g, '} else {')
  js = js.replace(/if\s+(.+?):/g, 'if ($1) {')
  js = js.replace(/while\s+(.+?):/g, 'while ($1) {')
  js = js.replace(/def\s+(\w+)\s*\(([^)]*)\)\s*:/g, 'async function $1($2) {')
  js = js.replace(/for\s+(\w+)\s+in\s+range\((\d+)\)\s*:/g, 'for (let $1=0; $1<$2; $1++) {')
  js = js.replace(/str\(([^)]+)\)/g, 'String($1)')
  js = js.replace(/int\(([^)]+)\)/g, 'parseInt($1)')
  js = js.replace(/print\(/g, 'print(')
  js = js.replace(/time\.sleep\(/g, 'await time.sleep(')
  js = js.replace(/time\.sleep_ms\(/g, 'await time.sleep_ms(')
  js = js.replace(/display\.show\(\)/g, 'display.show()')

  // indent-based block closing
  const lines = js.split('\n')
  const result = []
  const indentStack = [0]
  lines.forEach(line => {
    const trimmed = line.trimStart()
    if (!trimmed) { result.push(''); return }
    const indent = line.length - trimmed.length
    while (indent < indentStack[indentStack.length - 1]) {
      indentStack.pop()
      result.push(' '.repeat(indentStack[indentStack.length-1]) + '}')
    }
    if (indent > indentStack[indentStack.length - 1]) {
      indentStack.push(indent)
    }
    result.push(line)
  })
  while (indentStack.length > 1) {
    indentStack.pop()
    result.push('}')
  }
  return `(async () => { ${result.join('\n')} })()`
}

const styles = {
  page: { minHeight:'100vh', background:'#0a0c0f', color:'#e8eaf0', fontFamily:'monospace', display:'flex', flexDirection:'column' },
  header: { display:'flex', alignItems:'center', gap:16, padding:'14px 24px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', flexWrap:'wrap' },
  back: { background:'none', border:'0.5px solid rgba(255,255,255,0.15)', color:'#e8eaf0', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontSize:12 },
  headerTitle: { color:'#00e5a0', fontSize:13 },
  nameInput: { background:'none', border:'none', borderBottom:'0.5px solid rgba(255,255,255,0.2)', color:'#e8eaf0', fontSize:13, padding:'4px 8px', fontFamily:'monospace', outline:'none', width:200 },
  headerRight: { marginLeft:'auto', display:'flex', alignItems:'center', gap:12 },
  progressLabel: { fontSize:12, color:'#6b7280' },
  saveBtn: { color:'#000', border:'none', padding:'7px 18px', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', transition:'background 0.3s' },
  body: { display:'grid', gridTemplateColumns:'200px 1fr 320px', flex:1, minHeight:0, height:'calc(100vh - 57px)' },
  leftPanel: { borderRight:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', display:'flex', flexDirection:'column', overflow:'hidden' },
  panelHead: { padding:'14px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' },
  partsList: { padding:12, overflowY:'auto', flex:1 },
  partRow: { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, border:'0.5px solid rgba(255,255,255,0.07)', marginBottom:8, cursor:'pointer', background:'#0a0c0f', transition:'all 0.2s' },
  partInstalled: { borderColor:'rgba(0,229,160,0.3)', background:'rgba(0,229,160,0.04)', cursor:'default' },
  partSelected: { borderColor:'#00e5a0' },
  partIconBox: { fontSize:16, flexShrink:0 },
  partName: { fontSize:13, fontWeight:500 },
  partSpec: { fontSize:10, color:'#6b7280' },
  uninstallBtn: { background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:11, padding:'0 2px', opacity:0.6 },
  assembledBanner: { margin:12, padding:'10px', background:'rgba(0,229,160,0.08)', border:'0.5px solid rgba(0,229,160,0.3)', borderRadius:8, fontSize:12, color:'#00e5a0', textAlign:'center' },
  centerPanel: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:20, background:'#0a0c0f' },
  deviceOuter: { background:'#111', border:'2px solid #1a1a2e', borderRadius:24, padding:20, display:'flex', alignItems:'center', justifyContent:'center' },
  deviceBody: { width:160, background:'#1a1a2e', border:'2px solid #2a2a4e', borderRadius:20, padding:'16px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:10 },
  deviceHole: { width:12, height:12, borderRadius:'50%', border:'2px solid #3a3a6e' },
  screenWrap: { border:'2px solid #222', borderRadius:4, overflow:'hidden', transition:'all 0.3s' },
  canvas: { display:'block' },
  ledRow: { display:'flex', gap:8 },
  led: { width:6, height:6, borderRadius:'50%', transition:'background 0.3s' },
  btnRow: { display:'flex', gap:10 },
  hwBtn: { width:36, height:20, borderRadius:4, border:'1.5px solid', fontSize:9, fontWeight:700, color:'#e8eaf0', transition:'all 0.15s', fontFamily:'monospace' },
  chip: { width:44, height:44, background:'#111', border:'1px solid', borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.3s' },
  batteryBar: { width:'80%', height:3, background:'#1a1a3a', borderRadius:2, overflow:'hidden' },
  batteryFill: { height:'100%', borderRadius:2, transition:'width 0.5s ease' },
  runRow: { display:'flex', alignItems:'center', gap:12 },
  runBtn: { background:'#00e5a0', color:'#000', border:'none', padding:'8px 24px', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' },
  stopBtn: { background:'#ef4444', color:'#fff', border:'none', padding:'8px 24px', borderRadius:8, fontWeight:700, fontSize:13, cursor:'pointer' },
  runHint: { fontSize:12, color:'#6b7280' },
  rightPanel: { borderLeft:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', display:'flex', flexDirection:'column', overflow:'hidden' },
  tabs: { display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.07)', flexShrink:0 },
  tab: { flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:'2px solid transparent', color:'#6b7280', cursor:'pointer', fontSize:12 },
  tabActive: { color:'#00e5a0', borderBottomColor:'#00e5a0' },
  logPanel: { flex:1, overflowY:'auto', padding:12, display:'flex', flexDirection:'column', gap:4 },
  logEmpty: { fontSize:13, color:'#6b7280', textAlign:'center', marginTop:40 },
  logLine: { fontSize:11, lineHeight:1.6 },
  logTime: { color:'#444', marginRight:6 },
  logBadge: { background:'rgba(0,229,160,0.2)', color:'#00e5a0', fontSize:9, padding:'1px 5px', borderRadius:8, marginLeft:4 },
  apiPanel: { flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:6 },
  apiTitle: { fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 },
  apiRow: { display:'flex', flexDirection:'column', gap:2, marginBottom:8 },
  apiCode: { fontSize:11, color:'#00e5a0', background:'rgba(0,229,160,0.08)', padding:'2px 6px', borderRadius:4 },
  apiDesc: { fontSize:11, color:'#6b7280', paddingLeft:4 },
}

export default KeychainBuilder