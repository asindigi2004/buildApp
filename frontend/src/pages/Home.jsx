import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'

const icons = { pc: '🖥️', camera: '📷', keychain: '🔑' }
const colors = { pc: '#0066ff', camera: '#f59e0b', keychain: '#00e5a0' }

function Home() {
  const [devices, setDevices] = useState([])
  const [user, setUser] = useState(null)
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    api.get('/devices/').then(r => setDevices(r.data))
    if (token) api.get('/auth/me').then(r => setUser(r.data))
  }, [])

  const logout = () => { localStorage.removeItem('token'); navigate('/login') }

  return (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <span style={styles.navLogo}>BuildLab</span>
        <div style={styles.navRight}>
          {user ? (
            <>
              <button style={styles.navBtn} onClick={() => navigate('/dashboard')}>My Builds</button>
              <span style={styles.navUser}>{user.username}</span>
              <button style={styles.navBtn} onClick={logout}>Logout</button>
            </>
          ) : (
            <button style={styles.navBtn} onClick={() => navigate('/login')}>Login</button>
          )}
        </div>
      </nav>

      <div style={styles.hero}>
        <div style={styles.badge}>// virtual hardware studio</div>
        <h1 style={styles.h1}>Build real hardware.<br /><span style={styles.accent}>Without the cost.</span></h1>
        <p style={styles.heroSub}>Pick a device, assemble it part by part, write real code, and watch it come to life — all in your browser.</p>
      </div>

      <div style={styles.grid}>
        {devices.map(device => (
          <div key={device.id} style={{...styles.card, '--accent': colors[device.id] || '#00e5a0'}}
            onClick={() => token ? navigate(`/builder/${device.id}`) : navigate('/login')}>
            <div style={{...styles.cardIcon, background: `${colors[device.id]}18`}}>
              <span style={{fontSize: 28}}>{icons[device.id]}</span>
            </div>
            <h2 style={styles.cardTitle}>{device.name}</h2>
            <p style={styles.cardDesc}>{device.description}</p>
            <div style={styles.cardTags}>
              {device.parts.slice(0, 3).map(p => (
                <span key={p.id} style={styles.tag}>{p.name}</span>
              ))}
              <span style={styles.tag}>+{device.parts.length - 3} more</span>
            </div>
            <div style={{...styles.cardArrow, color: colors[device.id]}}>Start Building →</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0a0c0f', color: '#e8eaf0', fontFamily: 'monospace' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' },
  navLogo: { fontSize: 18, fontWeight: 700, color: '#00e5a0' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  navBtn: { background: 'none', border: '0.5px solid rgba(255,255,255,0.15)', color: '#e8eaf0', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13 },
  navUser: { fontSize: 13, color: '#6b7280' },
  hero: { textAlign: 'center', padding: '80px 24px 60px' },
  badge: { display: 'inline-block', border: '0.5px solid #00e5a0', color: '#00e5a0', fontSize: 11, padding: '4px 14px', borderRadius: 20, marginBottom: 24, letterSpacing: '0.05em' },
  h1: { fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 300, lineHeight: 1.15, marginBottom: 20, letterSpacing: '-0.02em' },
  accent: { color: '#00e5a0', fontWeight: 600 },
  heroSub: { fontSize: 16, color: '#6b7280', maxWidth: 500, margin: '0 auto 48px', lineHeight: 1.7 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20, maxWidth: 900, margin: '0 auto', padding: '0 24px 80px' },
  card: { background: '#111318', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '28px 24px', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s' },
  cardIcon: { width: 52, height: 52, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  cardDesc: { fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 16 },
  cardTags: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 },
  tag: { fontSize: 11, padding: '3px 8px', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 4, color: '#6b7280' },
  cardArrow: { fontSize: 13, fontWeight: 600 }
}

export default Home