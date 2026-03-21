import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import Toast from '../components/Toast'
import { useToast } from '../components/useToast'

const PARTS = [
  { id: 'cpu', name: 'CPU', spec: 'Intel i7-13700K' },
  { id: 'motherboard', name: 'Motherboard', spec: 'ATX Z790' },
  { id: 'ram', name: 'RAM', spec: '16GB DDR5' },
  { id: 'gpu', name: 'GPU', spec: 'RTX 4070' },
  { id: 'storage', name: 'SSD', spec: '1TB NVMe' },
  { id: 'psu', name: 'PSU', spec: '750W 80+ Gold' },
]

const INITIAL_FS = {
  '/': { type: 'dir', children: ['home', 'usr', 'etc', 'var'] },
  '/home': { type: 'dir', children: ['user'] },
  '/home/user': { type: 'dir', children: ['readme.txt', 'projects'] },
  '/home/user/readme.txt': { type: 'file', content: 'Welcome to BuildLab PC Simulator!\nBuilt with love.' },
  '/home/user/projects': { type: 'dir', children: [] },
  '/usr': { type: 'dir', children: ['bin', 'lib'] },
  '/usr/bin': { type: 'dir', children: [] },
  '/usr/lib': { type: 'dir', children: [] },
  '/etc': { type: 'dir', children: ['config.txt'] },
  '/etc/config.txt': { type: 'file', content: 'BuildLab OS v1.0\nKernel: 6.1.0-buildlab' },
  '/var': { type: 'dir', children: ['log'] },
  '/var/log': { type: 'dir', children: [] },
}

const POST_SEQUENCE = [
  { text: 'BuildLab BIOS v2.1', delay: 0 },
  { text: 'Checking CPU... OK', delay: 400 },
  { text: 'Checking RAM... 16384MB OK', delay: 800 },
  { text: 'Checking Storage... 1TB NVMe OK', delay: 1200 },
  { text: 'Checking GPU... RTX 4070 OK', delay: 1600 },
  { text: 'Loading BuildLab OS...', delay: 2200 },
  { text: '██████████████████ 100%', delay: 3000 },
  { text: 'Welcome to BuildLab OS v1.0', delay: 3600 },
  { text: 'Type "help" for available commands', delay: 3800 },
]

function PCBuilder() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const terminalRef = useRef(null)
  const inputRef = useRef(null)
  const { toast, showToast, hideToast } = useToast()

  const [installed, setInstalled] = useState([])
  const [buildName, setBuildName] = useState('My PC')
  const [buildId, setBuildId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('terminal')
  const [booted, setBooted] = useState(false)
  const [booting, setBooting] = useState(false)
  const [termLines, setTermLines] = useState([])
  const [input, setInput] = useState('')
  const [cwd, setCwd] = useState('/home/user')
  const [fs, setFs] = useState(INITIAL_FS)
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [userProgram, setUserProgram] = useState('// Write a program\nconsole.log("Hello from BuildLab PC!")\n\nfor (let i = 0; i < 5; i++) {\n  console.log("Line " + i)\n}')
  const [programOutput, setProgramOutput] = useState([])

  const hasCPU = installed.find(p => p.id === 'cpu')
  const hasRAM = installed.find(p => p.id === 'ram')
  const hasStorage = installed.find(p => p.id === 'storage')
  const hasMB = installed.find(p => p.id === 'motherboard')
  const hasGPU = installed.find(p => p.id === 'gpu')
  const hasPSU = installed.find(p => p.id === 'psu')
  const canBoot = hasCPU && hasRAM && hasStorage && hasMB && hasPSU
  const progress = Math.round((installed.length / PARTS.length) * 100)

  const cpuSpeed = hasCPU ? 5.3 : 0
  const ramTotal = hasRAM ? 16384 : 0
  const ramUsed = booted ? Math.floor(ramTotal * 0.35) : 0
  const cpuUsage = booted ? Math.floor(Math.random() * 20 + 10) : 0
  const gpuUsage = booted && hasGPU ? Math.floor(Math.random() * 15 + 5) : 0

  useEffect(() => {
    const existingBuildId = searchParams.get('buildId')
    if (existingBuildId) {
      api.get(`/builds/${existingBuildId}`).then(r => {
        setBuildId(r.data.id)
        setBuildName(r.data.name)
        if (r.data.user_code) setUserProgram(r.data.user_code)
        const installedParts = PARTS.filter(p => r.data.parts_installed.includes(p.id))
        setInstalled(installedParts)
      })
    }
  }, [])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [termLines])

  const addLine = (text, type = 'output') => {
    setTermLines(prev => [...prev, { text, type, id: Date.now() + Math.random() }])
  }

  const boot = () => {
    if (!canBoot) { showToast('Install CPU, Motherboard, RAM, Storage and PSU first!', 'error'); return }
    setBooting(true)
    setTermLines([])
    POST_SEQUENCE.forEach(({ text, delay }) => {
      setTimeout(() => {
        addLine(text, 'post')
        if (delay === 3800) {
          setBooted(true)
          setBooting(false)
          addLine('', 'output')
        }
      }, delay)
    })
  }

  const resolvePath = (path) => {
    if (path.startsWith('/')) return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
    const parts = (cwd + '/' + path).split('/').filter(Boolean)
    const resolved = []
    for (const p of parts) {
      if (p === '..') resolved.pop()
      else if (p !== '.') resolved.push(p)
    }
    return '/' + resolved.join('/')
  }

  const runCommand = (cmd) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    addLine(`${cwd} $ ${trimmed}`, 'input')
    setHistory(prev => [trimmed, ...prev])
    setHistoryIdx(-1)

    const [command, ...args] = trimmed.split(' ')
    const arg = args.join(' ')

    switch (command) {
      case 'help':
        addLine('Available commands:')
        addLine('  ls              - list directory contents')
        addLine('  cd <dir>        - change directory')
        addLine('  pwd             - print working directory')
        addLine('  cat <file>      - read file contents')
        addLine('  mkdir <dir>     - create directory')
        addLine('  touch <file>    - create empty file')
        addLine('  echo <text>     - print text')
        addLine('  rm <file>       - remove file')
        addLine('  clear           - clear terminal')
        addLine('  neofetch        - system info')
        addLine('  top             - process list')
        addLine('  run             - run your program (see Code tab)')
        break

      case 'ls': {
        const path = arg ? resolvePath(arg) : cwd
        const node = fs[path]
        if (!node) { addLine(`ls: ${path}: No such file or directory`, 'error'); break }
        if (node.type === 'file') { addLine(path.split('/').pop()); break }
        if (node.children.length === 0) { addLine('(empty)'); break }
        addLine(node.children.join('  '))
        break
      }

      case 'cd': {
        if (!arg || arg === '~') { setCwd('/home/user'); break }
        const path = resolvePath(arg)
        if (!fs[path]) { addLine(`cd: ${arg}: No such file or directory`, 'error'); break }
        if (fs[path].type === 'file') { addLine(`cd: ${arg}: Not a directory`, 'error'); break }
        setCwd(path)
        break
      }

      case 'pwd':
        addLine(cwd)
        break

      case 'cat': {
        if (!arg) { addLine('cat: missing operand', 'error'); break }
        const path = resolvePath(arg)
        const node = fs[path]
        if (!node) { addLine(`cat: ${arg}: No such file or directory`, 'error'); break }
        if (node.type === 'dir') { addLine(`cat: ${arg}: Is a directory`, 'error'); break }
        node.content.split('\n').forEach(l => addLine(l))
        break
      }

      case 'mkdir': {
        if (!arg) { addLine('mkdir: missing operand', 'error'); break }
        const path = resolvePath(arg)
        if (fs[path]) { addLine(`mkdir: ${arg}: File exists`, 'error'); break }
        const parent = path.substring(0, path.lastIndexOf('/')) || '/'
        const name = path.split('/').pop()
        setFs(prev => ({
          ...prev,
          [path]: { type: 'dir', children: [] },
          [parent]: { ...prev[parent], children: [...(prev[parent]?.children || []), name] }
        }))
        break
      }

      case 'touch': {
        if (!arg) { addLine('touch: missing operand', 'error'); break }
        const path = resolvePath(arg)
        if (fs[path]) break
        const parent = path.substring(0, path.lastIndexOf('/')) || '/'
        const name = path.split('/').pop()
        setFs(prev => ({
          ...prev,
          [path]: { type: 'file', content: '' },
          [parent]: { ...prev[parent], children: [...(prev[parent]?.children || []), name] }
        }))
        break
      }

      case 'echo':
        addLine(arg || '')
        break

      case 'rm': {
        if (!arg) { addLine('rm: missing operand', 'error'); break }
        const path = resolvePath(arg)
        if (!fs[path]) { addLine(`rm: ${arg}: No such file or directory`, 'error'); break }
        const parent = path.substring(0, path.lastIndexOf('/')) || '/'
        const name = path.split('/').pop()
        setFs(prev => {
          const next = { ...prev }
          delete next[path]
          next[parent] = { ...next[parent], children: next[parent].children.filter(c => c !== name) }
          return next
        })
        break
      }

      case 'clear':
        setTermLines([])
        break

      case 'neofetch':
        addLine('         ████████         user@buildlab-pc')
        addLine('       ████████████       ─────────────────')
        addLine('      ██████████████      OS: BuildLab OS v1.0')
        addLine('      ████  ██  ████      CPU: Intel i7-13700K @ ' + cpuSpeed + 'GHz')
        addLine('      ████  ██  ████      RAM: ' + ramUsed + 'MB / ' + ramTotal + 'MB')
        addLine('      ██████████████      GPU: ' + (hasGPU ? 'NVIDIA RTX 4070' : 'None'))
        addLine('       ████████████       Storage: ' + (hasStorage ? '1TB NVMe' : 'None'))
        addLine('         ████████         Shell: buildsh 1.0')
        break

      case 'top':
        addLine('PID   NAME              CPU%   MEM%')
        addLine('────  ────────────────  ─────  ─────')
        addLine('1     buildlab-os       ' + cpuUsage + '%     ' + Math.floor(ramUsed/ramTotal*100) + '%')
        addLine('2     window-manager    3%     2%')
        addLine('3     terminal          1%     1%')
        if (hasGPU) addLine('4     gpu-driver        ' + gpuUsage + '%    1%')
        break

      case 'run':
        addLine('Running your program...', 'system')
        setTab('program')
        runUserProgram()
        break

      default:
        addLine(`${command}: command not found. Type "help" for available commands.`, 'error')
    }
  }

  const runUserProgram = () => {
    const output = []
    try {
      const fn = new Function('console',
        userProgram.replace(/console\.log\(/g, '__log(')
      )
      fn({ log: (...args) => output.push(args.join(' ')) })
      setProgramOutput(output)
      addLine(`Program finished with ${output.length} line(s) of output`, 'system')
    } catch (err) {
      setProgramOutput([`Error: ${err.message}`])
      addLine(`Program error: ${err.message}`, 'error')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      runCommand(input)
      setInput('')
    } else if (e.key === 'ArrowUp') {
      const idx = Math.min(historyIdx + 1, history.length - 1)
      setHistoryIdx(idx)
      setInput(history[idx] || '')
    } else if (e.key === 'ArrowDown') {
      const idx = Math.max(historyIdx - 1, -1)
      setHistoryIdx(idx)
      setInput(idx === -1 ? '' : history[idx])
    }
  }

  const installPart = (part) => {
    if (installed.find(p => p.id === part.id)) return
    setInstalled(prev => [...prev, part])
    setSelected(part)
  }

  const uninstallPart = (partId) => {
    if (booted) { showToast('Shut down PC before removing parts!', 'error'); return }
    setInstalled(prev => prev.filter(p => p.id !== partId))
  }

  const saveBuild = async () => {
    if (!buildName.trim()) { showToast('Name your build!', 'error'); return }
    setSaving(true)
    try {
      if (!buildId) {
        const res = await api.post('/builds/', { name: buildName, device_type: 'pc' })
        setBuildId(res.data.id)
        await api.patch(`/builds/${res.data.id}`, { name: buildName, parts_installed: installed.map(p => p.id), user_code: userProgram })
      } else {
        await api.patch(`/builds/${buildId}`, { name: buildName, parts_installed: installed.map(p => p.id), user_code: userProgram })
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
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate('/')}>← Back</button>
        <span style={styles.headerTitle}>// PC Builder</span>
        <input style={styles.nameInput} value={buildName} onChange={e => setBuildName(e.target.value)} placeholder="Name your PC..." />
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
                    {part.id==='cpu'?'🔲':part.id==='motherboard'?'🖥️':part.id==='ram'?'📊':part.id==='gpu'?'🎮':part.id==='storage'?'💾':'⚡'}
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
          {progress === 100 && !booted && (
            <div style={styles.assembledBanner}>
              <p>🖥️ Ready to boot!</p>
              <button style={styles.bootBtn} onClick={boot}>Power On</button>
            </div>
          )}
          {booted && (
            <div style={{...styles.assembledBanner, borderColor:'rgba(0,229,160,0.3)'}}>
              <p style={{color:'#00e5a0'}}>● System Running</p>
              <button style={{...styles.bootBtn, background:'#ef4444'}} onClick={() => {setBooted(false);setTermLines([]);addLine('System shut down.','post')}}>Shut Down</button>
            </div>
          )}
          {!booted && !booting && progress < 100 && canBoot && (
            <div style={styles.assembledBanner}>
              <button style={styles.bootBtn} onClick={boot}>Power On</button>
            </div>
          )}
        </div>

        {/* CENTER - PC monitor */}
        <div style={styles.centerPanel}>
          <div style={styles.monitor}>
            <div style={styles.monitorScreen}>
              {/* Terminal */}
              <div style={styles.terminal} ref={terminalRef} onClick={() => inputRef.current?.focus()}>
                {!booted && !booting && termLines.length === 0 && (
                  <div style={styles.offScreen}>
                    <p style={{color:'#1a1a1a', fontSize:14}}>■ SYSTEM OFF</p>
                    <p style={{color:'#111', fontSize:11}}>{canBoot ? 'Click Power On to boot' : 'Install required components first'}</p>
                  </div>
                )}
                {termLines.map(line => (
                  <div key={line.id} style={{
                    ...styles.termLine,
                    color: line.type==='error' ? '#ef4444' : line.type==='input' ? '#00e5a0' : line.type==='system' ? '#f59e0b' : line.type==='post' ? '#0066ff' : '#e8eaf0'
                  }}>{line.text}</div>
                ))}
                {booted && (
                  <div style={styles.inputRow}>
                    <span style={{color:'#00e5a0'}}>{cwd} $ </span>
                    <input
                      ref={inputRef}
                      style={styles.termInput}
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                      spellCheck={false}
                    />
                  </div>
                )}
              </div>
            </div>
            <div style={styles.monitorBase} />
            <div style={styles.monitorStand} />
          </div>

          {/* Task manager */}
          {booted && (
            <div style={styles.taskManager}>
              <div style={styles.tmRow}>
                <span style={styles.tmLabel}>CPU</span>
                <div style={styles.tmBar}><div style={{...styles.tmFill, width:`${cpuUsage}%`, background:'#0066ff'}} /></div>
                <span style={styles.tmVal}>{cpuUsage}%</span>
              </div>
              <div style={styles.tmRow}>
                <span style={styles.tmLabel}>RAM</span>
                <div style={styles.tmBar}><div style={{...styles.tmFill, width:`${Math.floor(ramUsed/ramTotal*100)}%`, background:'#00e5a0'}} /></div>
                <span style={styles.tmVal}>{ramUsed}MB</span>
              </div>
              {hasGPU && (
                <div style={styles.tmRow}>
                  <span style={styles.tmLabel}>GPU</span>
                  <div style={styles.tmBar}><div style={{...styles.tmFill, width:`${gpuUsage}%`, background:'#f59e0b'}} /></div>
                  <span style={styles.tmVal}>{gpuUsage}%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT - tabs */}
        <div style={styles.rightPanel}>
          <div style={styles.tabs}>
            <button style={{...styles.tab, ...(tab==='terminal'?styles.tabActive:{})}} onClick={()=>setTab('terminal')}>Terminal</button>
            <button style={{...styles.tab, ...(tab==='program'?styles.tabActive:{})}} onClick={()=>setTab('program')}>Program</button>
          </div>

          {tab === 'terminal' && (
            <div style={styles.tabContent}>
              <p style={styles.hint}>Type commands in the terminal. Use <code style={styles.code}>help</code> to see all commands. Press <code style={styles.code}>run</code> to execute your program.</p>
              <div style={styles.quickCmds}>
                {['ls', 'neofetch', 'top', 'help', 'run'].map(cmd => (
                  <button key={cmd} style={styles.quickBtn} onClick={() => { if(booted) { runCommand(cmd) } else showToast('Boot the PC first!', 'error') }}>
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === 'program' && (
            <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
              <div style={{flex:1, minHeight:0}}>
                <textarea
                  style={styles.codeArea}
                  value={userProgram}
                  onChange={e => setUserProgram(e.target.value)}
                  spellCheck={false}
                />
              </div>
              <div style={styles.programActions}>
                <button style={styles.runBtn} onClick={() => { if(booted) runUserProgram(); else showToast('Boot the PC first!', 'error') }}>▶ Run Program</button>
              </div>
              {programOutput.length > 0 && (
                <div style={styles.programOutput}>
                  <p style={styles.outputLabel}>Output:</p>
                  {programOutput.map((l, i) => <div key={i} style={styles.outputLine}>{l}</div>)}
                </div>
              )}
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
  headerTitle: { color:'#0066ff', fontSize:13 },
  nameInput: { background:'none', border:'none', borderBottom:'0.5px solid rgba(255,255,255,0.2)', color:'#e8eaf0', fontSize:13, padding:'4px 8px', fontFamily:'monospace', outline:'none', width:200 },
  headerRight: { marginLeft:'auto', display:'flex', alignItems:'center', gap:12 },
  progressLabel: { fontSize:12, color:'#6b7280' },
  saveBtn: { color:'#000', border:'none', padding:'7px 18px', borderRadius:8, fontWeight:700, fontSize:12, cursor:'pointer', transition:'background 0.3s' },
  body: { display:'grid', gridTemplateColumns:'200px 1fr 280px', flex:1, minHeight:0, height:'calc(100vh - 57px)' },
  leftPanel: { borderRight:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', display:'flex', flexDirection:'column', overflow:'hidden' },
  panelHead: { padding:'14px 16px', borderBottom:'0.5px solid rgba(255,255,255,0.07)', fontSize:11, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' },
  partsList: { padding:12, overflowY:'auto', flex:1 },
  partRow: { display:'flex', alignItems:'center', gap:8, padding:'10px 12px', borderRadius:10, border:'0.5px solid rgba(255,255,255,0.07)', marginBottom:8, cursor:'pointer', background:'#0a0c0f', transition:'all 0.2s' },
  partInstalled: { borderColor:'rgba(0,102,255,0.3)', background:'rgba(0,102,255,0.04)', cursor:'default' },
  partSelected: { borderColor:'#0066ff' },
  partIconBox: { fontSize:16, flexShrink:0 },
  partName: { fontSize:13, fontWeight:500 },
  partSpec: { fontSize:10, color:'#6b7280' },
  uninstallBtn: { background:'none', border:'none', color:'#ef4444', cursor:'pointer', fontSize:11, padding:'0 2px', opacity:0.6 },
  assembledBanner: { margin:12, padding:'10px', background:'rgba(0,102,255,0.08)', border:'0.5px solid rgba(0,102,255,0.3)', borderRadius:8, fontSize:12, color:'#0066ff', textAlign:'center', display:'flex', flexDirection:'column', gap:8 },
  bootBtn: { background:'#0066ff', color:'#fff', border:'none', padding:'6px 16px', borderRadius:6, fontWeight:700, cursor:'pointer', fontSize:12 },
  centerPanel: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24, gap:16, background:'#0a0c0f', overflow:'hidden' },
  monitor: { display:'flex', flexDirection:'column', alignItems:'center', width:'100%', maxWidth:500 },
  monitorScreen: { width:'100%', background:'#000', border:'3px solid #222', borderRadius:'8px 8px 0 0', overflow:'hidden' },
  terminal: { height:320, overflowY:'auto', padding:12, cursor:'text', fontFamily:'monospace', fontSize:11, lineHeight:1.6 },
  offScreen: { height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8 },
  termLine: { whiteSpace:'pre-wrap', wordBreak:'break-all' },
  inputRow: { display:'flex', alignItems:'center', gap:4 },
  termInput: { background:'none', border:'none', color:'#e8eaf0', fontFamily:'monospace', fontSize:11, outline:'none', flex:1 },
  monitorBase: { width:'100%', height:8, background:'#1a1a1a', border:'3px solid #222', borderTop:'none' },
  monitorStand: { width:60, height:20, background:'#1a1a1a', borderRadius:'0 0 8px 8px' },
  taskManager: { width:'100%', maxWidth:500, background:'#111318', border:'0.5px solid rgba(255,255,255,0.07)', borderRadius:8, padding:12, display:'flex', flexDirection:'column', gap:8 },
  tmRow: { display:'flex', alignItems:'center', gap:8 },
  tmLabel: { fontSize:10, color:'#6b7280', width:28, flexShrink:0 },
  tmBar: { flex:1, height:4, background:'rgba(255,255,255,0.07)', borderRadius:2, overflow:'hidden' },
  tmFill: { height:'100%', borderRadius:2, transition:'width 0.5s ease' },
  tmVal: { fontSize:10, color:'#e8eaf0', width:40, textAlign:'right', flexShrink:0 },
  rightPanel: { borderLeft:'0.5px solid rgba(255,255,255,0.07)', background:'#111318', display:'flex', flexDirection:'column', overflow:'hidden' },
  tabs: { display:'flex', borderBottom:'0.5px solid rgba(255,255,255,0.07)', flexShrink:0 },
  tab: { flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:'2px solid transparent', color:'#6b7280', cursor:'pointer', fontSize:12 },
  tabActive: { color:'#0066ff', borderBottomColor:'#0066ff' },
  tabContent: { padding:16, display:'flex', flexDirection:'column', gap:12 },
  hint: { fontSize:12, color:'#6b7280', lineHeight:1.6 },
  code: { background:'rgba(0,102,255,0.1)', color:'#0066ff', padding:'1px 4px', borderRadius:3, fontSize:11 },
  quickCmds: { display:'flex', flexWrap:'wrap', gap:6 },
  quickBtn: { background:'none', border:'0.5px solid rgba(0,102,255,0.3)', color:'#0066ff', padding:'4px 10px', borderRadius:6, cursor:'pointer', fontSize:11 },
  codeArea: { width:'100%', height:'100%', background:'#0a0c0f', border:'none', color:'#e8eaf0', fontFamily:'monospace', fontSize:12, padding:12, resize:'none', outline:'none', lineHeight:1.6, boxSizing:'border-box' },
  programActions: { padding:12, borderTop:'0.5px solid rgba(255,255,255,0.07)' },
  runBtn: { background:'none', border:'0.5px solid #0066ff', color:'#0066ff', padding:'8px 16px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600, width:'100%' },
  programOutput: { padding:12, borderTop:'0.5px solid rgba(255,255,255,0.07)', maxHeight:160, overflowY:'auto' },
  outputLabel: { fontSize:10, color:'#6b7280', marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' },
  outputLine: { fontSize:11, color:'#00e5a0', lineHeight:1.6 },
}

export default PCBuilder