import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const icons = { pc: '🖥️', camera: '📷', keychain: '🔑' }
const colors = { pc: '#0066ff', camera: '#f59e0b', keychain: '#00e5a0' }

function Gallery() {
  const [builds, setBuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/builds/gallery')
      .then(r => setBuilds(r.data))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? builds : builds.filter(b => b.device_type === filter)

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.logo} onClick={() => navigate('/')}>BuildLab</span>
        <div style={styles.navRight}>
          <button style={styles.navBtn} onClick={() => navigate('/')}>Home</button>
          <button style={styles.navBtnAccent} onClick={() => navigate('/login')}>Start Building →</button>
        </div>
      </nav>

      <div style={styles.inner}>
        <div style={styles.hero}>
          <div style={styles.badge}>// community builds</div>
          <h1 style={styles.h1}>What people are building</h1>
          <p style={styles.sub}>Real builds from the BuildLab community</p>
        </div>

        <div style={styles.filters}>
          {['all', 'pc', 'camera', 'keychain'].map(f => (
            <button key={f} style={{
              ...styles.filterBtn,
              ...(filter === f ? styles.filterActive : {})
            }} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : `${icons[f]} ${f}`}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={styles.loading}>Loading builds...</div>
        ) : filtered.length === 0 ? (
          <div style={styles.empty}>
            <p style={styles.emptyText}>No builds yet</p>
            <p style={styles.emptyMuted}>Be the first to build something!</p>
            <button style={styles.btn} onClick={() => navigate('/')}>Start Building</button>
          </div>
        ) : (
          <div style={styles.grid}>
            {filtered.map(build => {
              const maxParts = build.device_type === 'pc' ? 6 : 5
              const pct = Math.round((build.parts_installed?.length || 0) / maxParts * 100)
              const color = colors[build.device_type] || '#00e5a0'

              return (
                <div key={build.id} style={styles.card}>
                  <div style={{...styles.cardTop, borderColor: `${color}22`}}>
                    <div style={{...styles.deviceBadge, background: `${color}18`, color}}>
                      {icons[build.device_type]} {build.device_type}
                    </div>
                    <div style={{...styles.pctBadge, color}}>
                      {pct}%
                    </div>
                  </div>

                  <div style={styles.cardBody}>
                    <p style={styles.buildName}>{build.name}</p>
                    <div style={styles.partsList}>
                      {build.parts_installed?.slice(0, 4).map(p => (
                        <span key={p} style={{...styles.partChip, borderColor: `${color}33`, color}}>
                          {p}
                        </span>
                      ))}
                      {build.parts_installed?.length > 4 && (
                        <span style={styles.moreChip}>+{build.parts_installed.length - 4} more</span>
                      )}
                    </div>
                  </div>

                  <div style={styles.progressTrack}>
                    <div style={{...styles.progressFill, width: `${pct}%`, background: color}} />
                  </div>

                  <div style={styles.cardFooter}>
                    <span style={styles.date}>
                      {new Date(build.created_at).toLocaleDateString()}
                    </span>
                    <button style={{...styles.viewBtn, borderColor: `${color}44`, color}}
                      onClick={() => navigate(`/builds/${build.share_token}`)}>
                      View Build →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0a0c0f', color: '#e8eaf0', fontFamily: 'monospace' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
  logo: { fontSize: 18, fontWeight: 700, color: '#00e5a0', cursor: 'pointer' },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  navBtn: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', color: '#e8eaf0', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  navBtnAccent: { background: '#00e5a0', color: '#000', border: 'none', padding: '7px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  inner: { maxWidth: 1000, margin: '0 auto', padding: '48px 24px' },
  hero: { textAlign: 'center', marginBottom: 40 },
  badge: { display: 'inline-block', border: '0.5px solid rgba(255,255,255,0.15)', color: '#6b7280', fontSize: 11, padding: '4px 12px', borderRadius: 20, marginBottom: 16, letterSpacing: '0.06em' },
  h1: { fontSize: 36, fontWeight: 300, marginBottom: 10, letterSpacing: '-0.02em' },
  sub: { fontSize: 14, color: '#6b7280' },
  filters: { display: 'flex', gap: 8, marginBottom: 32, justifyContent: 'center' },
  filterBtn: { background: 'none', border: '0.5px solid rgba(255,255,255,0.1)', color: '#6b7280', padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, transition: 'all 0.15s' },
  filterActive: { border: '0.5px solid #00e5a0', color: '#00e5a0', background: 'rgba(0,229,160,0.08)' },
  loading: { textAlign: 'center', padding: '80px 0', color: '#6b7280', fontSize: 14 },
  empty: { textAlign: 'center', padding: '80px 0' },
  emptyText: { fontSize: 18, fontWeight: 500, marginBottom: 8 },
  emptyMuted: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  btn: { background: '#00e5a0', color: '#000', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: { background: '#111318', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '0.5px solid' },
  deviceBadge: { fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500 },
  pctBadge: { fontSize: 12, fontWeight: 600 },
  cardBody: { padding: '16px', flex: 1 },
  buildName: { fontSize: 15, fontWeight: 600, marginBottom: 10 },
  partsList: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  partChip: { fontSize: 10, padding: '3px 8px', border: '0.5px solid', borderRadius: 4 },
  moreChip: { fontSize: 10, padding: '3px 8px', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#6b7280' },
  progressTrack: { height: 2, background: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', transition: 'width 0.4s ease' },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.05)' },
  date: { fontSize: 11, color: '#444' },
  viewBtn: { background: 'none', border: '0.5px solid', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 },
}

export default Gallery