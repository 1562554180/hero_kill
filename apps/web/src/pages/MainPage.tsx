import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/gameStore'

const API = '/api'

export function MainPage() {
  const navigate = useNavigate()
  const setAccount = useGameStore((s) => s.setAccount)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' })
        if (cancelled) return
        if (res.ok) {
          const me = await res.json()
          setAccount({ userId: me.userId, username: me.username })
          navigate('/city', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch {
        if (!cancelled) navigate('/login', { replace: true })
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [setAccount, navigate])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', color: 'var(--text-muted)',
    }}>
      {checking ? '载入中…' : ''}
    </div>
  )
}
