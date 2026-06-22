import { useEffect, useRef } from 'react'
import { useBattleStore } from '../stores/battleStore'

interface Props {
  logs: string[]
}

// 把日志字符串拆成 text + hero + skill 三种 token
type Token = { kind: 'text' | 'hero' | 'skill' | 'card'; value: string }

function parseLog(log: string): Token[] {
  const tokens: Token[] = []
  // 顺序: hero(**...**) / skill(≪...≫) / card(【...】)
  const re = /(\*\*([^*]+)\*\*)|(≪([^≪≫]+)≫)|(【([^【】]+)】)/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(log)) !== null) {
    if (m.index > lastIdx) tokens.push({ kind: 'text', value: log.slice(lastIdx, m.index) })
    if (m[2] !== undefined) tokens.push({ kind: 'hero', value: m[2] })
    else if (m[4] !== undefined) tokens.push({ kind: 'skill', value: m[4] })
    else if (m[6] !== undefined) tokens.push({ kind: 'card', value: m[6] })
    lastIdx = re.lastIndex
  }
  if (lastIdx < log.length) tokens.push({ kind: 'text', value: log.slice(lastIdx) })
  return tokens
}

export function BattleLog({ logs }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const gameState = useBattleStore(s => s.gameState)

  // 构建 hero id → role 映射 (用 name 查 role, 因为 log 里只有名字)
  const heroRoleByName = (() => {
    const map: Record<string, string> = {}
    for (const h of gameState?.heroes ?? []) {
      map[h.hero.name] = h.role
    }
    return map
  })()

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [logs.length])

  return (
    <div
      ref={ref}
      style={{
        background: 'var(--bg-dark)',
        border: '1px solid var(--border-wood)',
        borderRadius: '8px',
        padding: '10px',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        fontSize: '13px',
        lineHeight: '1.6',
      }}
    >
      {logs.length === 0 && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '60px' }}>
          等待战斗开始...
        </div>
      )}
      {logs.map((log, i) => {
        const isSection = log.startsWith('──')
        const tokens = parseLog(log)
        return (
          <div key={i} style={{
            color: isSection ? 'var(--text-gold)' : 'var(--text-light)',
            fontWeight: isSection ? 'bold' : 'normal',
          }}>
            {tokens.map((t, j) => {
              if (t.kind === 'text') return <span key={j}>{t.value}</span>
              if (t.kind === 'hero') {
                const role = heroRoleByName[t.value]
                const color = role === 'enemy' ? '#ef5350' : role === 'ally' ? '#81c784' : 'var(--text-gold)'
                return <span key={j} style={{ color, fontWeight: 'bold' }}>{t.value}</span>
              }
              if (t.kind === 'skill') {
                return <span key={j} style={{ color: '#64b5f6', fontWeight: 'bold' }}>【{t.value}】</span>
              }
              // card
              return <span key={j} style={{ color: '#ffb74d', fontWeight: 'bold' }}>【{t.value}】</span>
            })}
          </div>
        )
      })}
    </div>
  )
}