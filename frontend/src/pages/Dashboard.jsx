import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const icons = { pc: '🖥️', camera: '📷', keychain: '🔑' }

function Dashboard() {
  const [builds, setBuilds] = useState([])
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/auth/me').then(r => setUser(r.data))
    api.get('/builds/me').then(r => setBuilds(r.data))
  }, [])

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.navLogo} onClick={() => navigate('/')}>BuildLab</span>
        <span style={styles.navUser}>{user?.username}</span>
      </nav>
      <div style={styles.inner}>
        <h1 style={styles.h1}>My Builds</h1>
        {builds.length === 0 ? (
          <div style={styles.empty}>
            <p style={{color: '#6b7280', marginBottom: 16}}>No builds yet.</p>
            <button style={styles.btn} onClick={() => navigate('/')}>Start Building</button>
          </div>
        ) : (
          <div style={styles.grid}>
            {builds.map(build => (
              <div key={build.id} style={styles.card} onClick={() => navigate(`/builder/${build.device_type}`)}>
                <span style={{fontSize: 28}}>{icons[build.device_type]}</span>
                <div>
                  <p style={styles.buildName}>{build.name}</p>
                  <p style={styles.buildMeta}>{build.device_type} · {build.parts_installed?.length || 0} parts installed</p>
                </div>
                <span style={styles.arrow}>→</span>
              </div>
            ))}
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
  navUser: { fontSize: 13, color: '#6b7280' },
  inner: { maxWidth: 800, margin: '0 auto', padding: '48px 24px' },
  h1: { fontSize: 28, fontWeight: 300, marginBottom: 32 },
  empty: { textAlign: 'center', padding: '60px 0' },
  btn: { background: '#00e5a0', color: '#000', border: 'none', padding: '10px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
  grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { display: 'flex', alignItems: 'center', gap: 16, background: '#111318', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '20px 24px', cursor: 'pointer' },
  buildName: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  buildMeta: { fontSize: 12, color: '#6b7280' },
  arrow: { marginLeft: 'auto', color: '#00e5a0', fontSize: 18 }
}

export default Dashboard