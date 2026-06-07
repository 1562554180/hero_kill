import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/gameStore'

const API = '/api'

export function MainPage() {
  const navigate = useNavigate()
  const { setUserId, setSave } = useGameStore()

  const handleStart = async () => {
    let userId = useGameStore.getState().userId
    if (!userId) {
      userId = `user-${Date.now()}`
      useGameStore.getState().setUserId(userId)
    }

    try {
      const res = await fetch(`${API}/save/${userId}`)
      const save = await res.json()
      setSave(save)
      navigate('/stages')
    } catch {
      navigate('/stages')
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: '20px',
    }}>
      <h1 style={{ fontSize: '48px', color: 'var(--text-gold)', letterSpacing: '8px' }}>
        英雄传奇
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
        挑战关卡，收集英雄，搭配宝具
      </p>
      <button className="primary" style={{ fontSize: '18px', padding: '12px 40px', marginTop: '20px' }}
        onClick={handleStart}>
        开始冒险
      </button>
    </div>
  )
}
