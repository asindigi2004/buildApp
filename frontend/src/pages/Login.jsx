import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api/client'

function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      if (isRegister) {
        await api.post('/auth/register', form)
      }
      const params = new URLSearchParams()
      params.append('username', form.username)
      params.append('password', form.password)
      const res = await api.post('/auth/login', params)
      localStorage.setItem('token', res.data.access_token)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>BuildLab</div>
        <p style={styles.sub}>Virtual Hardware Studio</p>
        <div style={styles.toggleRow}>
          <button style={{...styles.toggle, ...(isRegister ? {} : styles.toggleActive)}} onClick={() => setIsRegister(false)}>Login</button>
          <button style={{...styles.toggle, ...(!isRegister ? {} : styles.toggleActive)}} onClick={() => setIsRegister(true)}>Register</button>
        </div>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} placeholder="Username" value={form.username}
            onChange={e => setForm({...form, username: e.target.value})} required />
          {isRegister && <input style={styles.input} placeholder="Email" type="email" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} required />}
          <input style={styles.input} placeholder="Password" type="password" value={form.password}
            onChange={e => setForm({...form, password: e.target.value})} required />
          <button style={styles.btn} type="submit">{isRegister ? 'Create Account' : 'Login'}</button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', background: '#0a0c0f', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' },
  card: { background: '#111318', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '40px 36px', width: 360 },
  logo: { fontSize: 28, fontWeight: 700, color: '#00e5a0', marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 28 },
  toggleRow: { display: 'flex', marginBottom: 24, border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden' },
  toggle: { flex: 1, padding: '8px 0', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 },
  toggleActive: { background: 'rgba(0,229,160,0.1)', color: '#00e5a0' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: { padding: '10px 14px', background: '#0a0c0f', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#e8eaf0', fontSize: 14, outline: 'none' },
  btn: { padding: '11px', background: '#00e5a0', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 4 },
  error: { color: '#ef4444', fontSize: 13, marginBottom: 8 }
}

export default Login