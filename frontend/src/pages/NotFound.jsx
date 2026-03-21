import { useNavigate } from 'react-router-dom'

function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c0f', color: '#e8eaf0',
      fontFamily: 'monospace', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16
    }}>
      <p style={{fontSize: 80, fontWeight: 300, color: '#1a1a1a', margin: 0}}>404</p>
      <p style={{fontSize: 18, color: '#00e5a0'}}>// page not found</p>
      <p style={{fontSize: 14, color: '#6b7280'}}>This page doesn't exist or was moved.</p>
      <button style={{
        background: 'none', border: '0.5px solid rgba(255,255,255,0.15)',
        color: '#e8eaf0', padding: '8px 20px', borderRadius: 8,
        cursor: 'pointer', fontSize: 13, marginTop: 8
      }} onClick={() => navigate('/')}>← Back to BuildLab</button>
    </div>
  )
}

export default NotFound