import { useEffect } from 'react'

function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [])

  const colors = {
    success: { bg: 'rgba(0,229,160,0.1)', border: 'rgba(0,229,160,0.3)', color: '#00e5a0' },
    error: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', color: '#ef4444' },
    info: { bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.15)', color: '#e8eaf0' },
  }
  const c = colors[type]

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: c.bg, border: `0.5px solid ${c.border}`,
      color: c.color, padding: '12px 20px', borderRadius: 10,
      fontFamily: 'monospace', fontSize: 13,
      animation: 'slideIn 0.2s ease',
    }}>
      {message}
      <style>{`@keyframes slideIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  )
}

export default Toast