import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/client'

const icons = { pc: '🖥️', camera: '📷', keychain: '🔑' }
const colors = { pc: '#0066ff', camera: '#f59e0b', keychain: '#00e5a0' }

function SharedBuild() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [build, setBuild] = useState(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    api.get(`/builds/share/${token}`)
      .then(r => setBuild(r.data))
      .catch(() => setNotFound(true))
  }, [token])

  if (notFound) return (
    <div style={styles.page}>
      <div style={styles.center}>
        <p style={styles.big}>404</p>
        <p style={styles.muted}>Build not found</p>
        <button style={styles.btn} onClick={() => navigate('/')}>Go to BuildLab</button>
      </div>
    </div>
  )

  if (!build) return (
    <div style={styles.page}>
      <div style={styles.center}>
        <p style={styles.muted}>Loading build...</p>
      </div>
    </div>
  )

  const color = colors[build.device_type] || '#00e5a0'
  const maxParts = build.device_type === 'pc' ? 6 : 5
  const pct = Math.round((build.parts_installed?.length || 0) / maxParts * 100)

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo} onClick={() => navigate('/')}>BuildLab</span>
        <button style={styles.btn} onClick={() => navigate('/')}>Try it yourself →</button>
      </nav>

      <div style={styles.inner}>
        <div style={styles.badge}>shared build</div>

        <div style={styles.card}>
          <div style={{...styles.cardTop, background: `${color}18`, borderColor: `${color}33`}}>
            <span style={styles.deviceIcon}>{icons[build.device_type]}</span>
            <div>
              <h1 style={styles.buildName}>{build.name}</h1>
              <p style={styles.buildMeta}>{build.device_type} · {pct}% complete</p>
            </div>
          </div>

          <div style={styles.cardBody}>
            <div style={styles.section}>
              <p style={styles.sectionLabel}>Installed parts</p>
              <div style={styles.partsList}>
                {build.parts_installed?.length === 0
                  ? <p style={styles.muted}>No parts installed</p>
                  : build.parts_installed?.map(p => (
                    <div key={p} style={{...styles.partChip, borderColor: `${color}44`, color}}>
                      ✓ {p}
                    </div>
                  ))
                }
              </div>
            </div>

            <div style={styles.section}>
              <p style={styles.sectionLabel}>Code</p>
              <pre style={styles.codeBox}>{build.user_code || '// No code written yet'}</pre>
            </div>

            <div style={styles.progressWrap}>
              <div style={styles.progressTrack}>
                <div style={{...styles.progressFill, width: `${pct}%`, background: color}} />
              </div>
              <span style={styles.pctLabel}>{pct}%</span>
            </div>
          </div>
        </div>

        <div style={styles.cta}>
          <p style={styles.ctaText}>Want to build your own?</p>
          <button style={{...styles.ctaBtn, background: color}} onClick={() => navigate('/')}>
            Start Building Free →
          </button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0a0c0f', color: '#e8eaf0', fontFamily: 'monospace' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
  logo: { fontSize: 18, fontWeight: 700, color: '#00e5a0', cursor: 'pointer' },
  btn: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', color: '#e8eaf0', padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  inner: { maxWidth: 700, margin: '0 auto', padding: '48px 24px' },
  badge: { display: 'inline-block', border: '0.5px solid rgba(255,255,255,0.15)', color: '#6b7280', fontSize: 11, padding: '4px 12px', borderRadius: 20, marginBottom: 24, letterSpacing: '0.06em' },
  card: { background: '#111318', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', marginBottom: 32 },
  cardTop: { display: 'flex', alignItems: 'center', gap: 16, padding: '24px', border: '0.5px solid' },
  deviceIcon: { fontSize: 36 },
  buildName: { fontSize: 22, fontWeight: 600, marginBottom: 4 },
  buildMeta: { fontSize: 13, color: '#6b7280' },
  cardBody: { padding: 24, display: 'flex', flexDirection: 'column', gap: 24 },
  section: { display: 'flex', flexDirection: 'column', gap: 10 },
  sectionLabel: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' },
  partsList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  partChip: { fontSize: 12, padding: '4px 10px', border: '0.5px solid', borderRadius: 6 },
  codeBox: { background: '#0a0c0f', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: 16, fontSize: 12, color: '#00e5a0', lineHeight: 1.8, whiteSpace: 'pre-wrap', overflowX: 'auto' },
  progressWrap: { display: 'flex', alignItems: 'center', gap: 12 },
  progressTrack: { flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, transition: 'width 0.4s ease' },
  pctLabel: { fontSize: 12, color: '#6b7280' },
  cta: { textAlign: 'center', padding: '32px 0' },
  ctaText: { fontSize: 16, color: '#6b7280', marginBottom: 16 },
  ctaBtn: { color: '#000', border: 'none', padding: '12px 28px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: 12 },
  big: { fontSize: 64, fontWeight: 300, color: '#333' },
  muted: { fontSize: 14, color: '#6b7280' },
}

export default SharedBuild