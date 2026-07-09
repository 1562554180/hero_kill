import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../stores/gameStore'
import { BindLegacySaveModal } from '../../components/BindLegacySaveModal'

const API = '/api'
const LEGACY_KEY = 'hero-legend-userId'
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/

export function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bind, setBind] = useState<{ open: boolean; oldUserId: string }>({ open: false, oldUserId: '' })

  const submit = async () => {
    setError('')
    if (!USERNAME_RE.test(username)) {
      setError('用户名需 3-20 字符,允许字母/数字/下划线/横线')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    setBusy(true)
    try {
      const path = tab === 'login' ? '/auth/login' : '/auth/register'
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? '请求失败')
        return
      }
      // 拉 /me 拿账户(其实响应里也有 userId/username,但 /me 是统一入口)
      const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' })
      const me = await meRes.json()
      useGameStore.getState().setAccount({ userId: me.userId, username: me.username })
      // 旧 localStorage 兜底
      const localId = localStorage.getItem(LEGACY_KEY)
      if (localId && localId !== me.userId) {
        setBind({ open: true, oldUserId: localId })
      } else {
        navigate('/city')
      }
    } catch (e: any) {
      setError(`网络错误: ${e?.message ?? ''}`)
    } finally {
      setBusy(false)
    }
  }

  const handleBindSuccess = () => {
    localStorage.removeItem(LEGACY_KEY)
    setBind({ open: false, oldUserId: '' })
    navigate('/city')
  }
  const handleBindSkip = () => {
    localStorage.removeItem(LEGACY_KEY)
    setBind({ open: false, oldUserId: '' })
    navigate('/city')
  }
  const handleBindCancel = () => {
    setBind({ open: false, oldUserId: '' })
    navigate('/city')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', gap: '20px', background: 'var(--bg-dark)',
    }}>
      <h1 style={{ fontSize: '40px', color: 'var(--text-gold)', letterSpacing: '8px' }}>英雄传奇</h1>
      <div style={{ display: 'flex', gap: '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-wood)' }}>
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            style={{
              padding: '8px 24px',
              background: tab === t ? 'var(--bg-light)' : 'var(--bg-medium)',
              color: tab === t ? 'var(--text-gold)' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 'bold' : 'normal',
            }}
          >{t === 'login' ? '登录' : '注册'}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '320px' }}>
        <input
          placeholder="用户名 (3-20 字符,字母/数字/_/-)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-wood)', background: 'var(--bg-medium)', color: 'var(--text-light)' }}
        />
        <input
          type="password"
          placeholder="密码 (≥6 位)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          onKeyDown={(e) => e.key === 'Enter' && !busy && submit()}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-wood)', background: 'var(--bg-medium)', color: 'var(--text-light)' }}
        />
        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: '12px', borderRadius: '4px',
            background: busy ? '#555' : 'var(--text-gold)',
            color: busy ? '#aaa' : '#000',
            border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >{busy ? '处理中...' : (tab === 'login' ? '登录' : '注册')}</button>
        {error && (
          <div style={{ padding: '8px', background: 'rgba(255,68,68,0.15)', color: '#ff6b6b', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
      <BindLegacySaveModal
        open={bind.open}
        oldUserId={bind.oldUserId}
        onSuccess={handleBindSuccess}
        onSkip={handleBindSkip}
        onCancel={handleBindCancel}
      />
    </div>
  )
}
