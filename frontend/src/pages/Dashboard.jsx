import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const icons = { pc: '🖥️', camera: '📷', keychain: '🔑' }
const colors = { pc: '#0066ff', camera: '#f59e0b', keychain: '#00e5a0' }

function Dashboard() {
  const [builds, setBuilds] = useState([])
  const [user, setUser] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/auth/me').then(r => setUser(r.data))
    api.get('/builds/me').then(r => setBuilds(r.data))
  }, [])

  const deleteBuild = async (id) => {
    if (!confirm('Delete this build? This cannot be undone.')) return
    setDeleting(id)
    try {
      await api.delete(`/builds/${id}`)
      setBuilds(prev => prev.filter(b => b.id !== id))
    } catch (e) {
      alert('Delete failed')
    }
    setDeleting(null)
  }

  const startRename = (build) => {
    setEditingId(build.id)
    setEditingName(build.name)
  }

  const saveRename = async (id) => {
    try {
      await api.patch(`/builds/${id}`, { name: editingName })
      setBuilds(prev => prev.map(b => b.id === id ? { ...b, name: editingName } : b))
    } catch (e) {
      alert('Rename failed')
    }
    setEditingId(null)
  }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.navLogo} onClick={() => navigate('/')}>BuildLab</span>
        <div style={styles.navRight}>
          <span style={styles.navUser}>{user?.username}</span>
          <button style={styles.newBtn} onClick={() => navigate('/')}>+ New Build</button>
        </div>
      </nav>

      <div style={styles.inner}>
        <div style={styles.topRow}>
          <h1 style={styles.h1}>My Builds</h1>
          <span style={styles.count}>{builds.length} build{builds.length !== 1 ? 's' : ''}</span>
        </div>

        {builds.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🔧</div>
            <p style={styles.emptyText}>No builds yet</p>
            <p style={styles.emptyMuted}>Pick a device from the home page to get started</p>
            <button style={styles.btn} onClick={() => navigate('/')}>Start Building</button>
          </div>
        ) : (
          <div style={styles.grid}>
            {builds.map(build => {
              const partCount = build.parts_installed?.length || 0
              const maxParts = build.device_type === 'pc' ? 6 : build.device_type === 'camera' ? 5 : 5
              const pct = Math.round((partCount / maxParts) * 100)

              return (
                <div key={build.id} style={styles.card}>
                  <div style={{...styles.cardAccent, background: colors[build.device_type] || '#00e5a0'}} />
                  <div style={styles.cardMain}>
                    <div style={styles.cardIcon}>{icons[build.device_type] || '🔧'}</div>

                    <div style={styles.cardInfo}>
                      {editingId === build.id ? (
                        <div style={styles.renameRow}>
                          <input
                            style={styles.renameInput}
                            value={editingName}
                            onChange={e => setEditingName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveRename(build.id)}
                            autoFocus
                          />
                          <button style={styles.saveNameBtn} onClick={() => saveRename(build.id)}>Save</button>
                          <button style={styles.cancelBtn} onClick={() => setEditingId(null)}>✕</button>
                        </div>
                      ) : (
                        <div style={styles.nameRow}>
                          <p style={styles.buildName}>{build.name}</p>
                          <button style={styles.renameBtn} onClick={() => startRename(build)}>✏️</button>
                        </div>
                      )}
                      <p style={styles.buildMeta}>
                        {build.device_type} · {partCount} parts · {pct}% complete
                      </p>
                      <p style={styles.buildDate}>
                        Created {new Date(build.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div style={styles.cardActions}>
                      <button style={styles.continueBtn}
                        onClick={() => navigate(`/builder/${build.device_type}`)}>
                        Continue →
                      </button>
                      <button style={styles.deleteBtn}
                        onClick={() => deleteBuild(build.id)}
                        disabled={deleting === build.id}>
                        {deleting === build.id ? '...' : '🗑'}
                      </button>
                    </div>
                  </div>

                  <div style={styles.progressWrap}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${pct}%`,
                      background: colors[build.device_type] || '#00e5a0'
                    }} />
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
  navLogo: { fontSize: 18, fontWeight: 700, color: '#00e5a0', cursor: 'pointer' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  navUser: { fontSize: 13, color: '#6b7280' },
  newBtn: { background: '#00e5a0', color: '#000', border: 'none', padding: '7px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  inner: { maxWidth: 860, margin: '0 auto', padding: '48px 24px' },
  topRow: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 32 },
  h1: { fontSize: 28, fontWeight: 300 },
  count: { fontSize: 13, color: '#6b7280' },
  empty: { textAlign: 'center', padding: '80px 0' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: 500, marginBottom: 8 },
  emptyMuted: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  btn: { background: '#00e5a0', color: '#000', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13 },
  grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#111318', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' },
  cardAccent: { height: 3 },
  cardMain: { display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px' },
  cardIcon: { fontSize: 28, flexShrink: 0 },
  cardInfo: { flex: 1 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  buildName: { fontSize: 15, fontWeight: 600 },
  renameBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4, padding: 0 },
  renameRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  renameInput: { background: '#0a0c0f', border: '0.5px solid #00e5a0', borderRadius: 6, color: '#e8eaf0', padding: '4px 8px', fontSize: 14, fontFamily: 'monospace', outline: 'none', width: 180 },
  saveNameBtn: { background: '#00e5a0', color: '#000', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', color: '#6b7280', borderRadius: 6, padding: '4px 8px', fontSize: 12, cursor: 'pointer' },
  buildMeta: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  buildDate: { fontSize: 11, color: '#444' },
  cardActions: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  continueBtn: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', color: '#e8eaf0', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12 },
  deleteBtn: { background: 'none', border: '0.5px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 14 },
  progressWrap: { height: 3, background: 'rgba(255,255,255,0.05)' },
  progressFill: { height: '100%', transition: 'width 0.4s ease' },
}

export default Dashboard