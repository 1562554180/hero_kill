import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useBattleStore } from '../stores/battleStore'

interface Props {
  logs: string[]
}

// 把日志字符串拆成 text + hero + skill 三种 token
type Token = { kind: 'text' | 'hero' | 'skill' | 'card'; value: string }

// 模块作用域编译一次, 避免每次调用都重建正则
const LOG_TOKEN_RE = /(\*\*([^*]+)\*\*)|(≪([^≪≫]+)≫)|(【([^【】]+)】)/g

function parseLog(log: string): Token[] {
  const tokens: Token[] = []
  // 顺序: hero(**...**) / skill(≪...≫) / card(【...】)
  LOG_TOKEN_RE.lastIndex = 0
  let lastIdx = 0
  let m: RegExpExecArray | null
  while ((m = LOG_TOKEN_RE.exec(log)) !== null) {
    if (m.index > lastIdx) tokens.push({ kind: 'text', value: log.slice(lastIdx, m.index) })
    if (m[2] !== undefined) tokens.push({ kind: 'hero', value: m[2] })
    else if (m[4] !== undefined) tokens.push({ kind: 'skill', value: m[4] })
    else if (m[6] !== undefined) tokens.push({ kind: 'card', value: m[6] })
    lastIdx = LOG_TOKEN_RE.lastIndex
  }
  if (lastIdx < log.length) tokens.push({ kind: 'text', value: log.slice(lastIdx) })
  return tokens
}

const ROW_HEIGHT = 22  // 13px font * 1.6 line-height ≈ 21px, 取 22 留一点余量
const BUFFER = 8       // 视口上下额外渲染的行数, 减少快速滚动时的空白闪烁

export function BattleLog({ logs }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const [viewport, setViewport] = useState({ top: 0, height: 0 })
  const gameState = useBattleStore(s => s.gameState)

  // hero id → role 映射 (用 name 查 role, 因为 log 里只有名字)
  const heroRoleByName = useMemo(() => {
    const map: Record<string, string> = {}
    for (const h of gameState?.heroes ?? []) {
      map[h.hero.name] = h.role
    }
    return map
  }, [gameState])

  // 一次性解析所有日志 token, 避免每次重渲染对每行重新跑正则
  const parsedLogs = useMemo(() => logs.map(log => ({
    isSection: log.startsWith('──'),
    tokens: parseLog(log),
  })), [logs])

  // 视口变化时记录 (用于计算可见范围)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setViewport({ top: el.scrollTop, height: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 仅在用户已停在底部时自动滚动 (允许向上翻看历史, 不被新日志强行拉回)
  useEffect(() => {
    if (ref.current && stickToBottomRef.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [logs.length])

  const onScroll = () => {
    const el = ref.current
    if (!el) return
    setViewport({ top: el.scrollTop, height: el.clientHeight })
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distFromBottom < 40
  }

  // 计算可见窗口 (含 buffer)
  const startIdx = Math.max(0, Math.floor(viewport.top / ROW_HEIGHT) - BUFFER)
  const visibleCount = Math.ceil(viewport.height / ROW_HEIGHT) + BUFFER * 2
  const endIdx = Math.min(parsedLogs.length, startIdx + visibleCount)
  const visible = parsedLogs.slice(startIdx, endIdx)
  const totalHeight = parsedLogs.length * ROW_HEIGHT
  const offsetY = startIdx * ROW_HEIGHT

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      style={{
        background: 'var(--bg-dark)',
        border: '1px solid var(--border-wood)',
        borderRadius: '8px',
        padding: '10px',
        height: '100%',
        boxSizing: 'border-box',
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
      {logs.length > 0 && (
        <div style={{ height: totalHeight, position: 'relative' }}>
          <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
            {visible.map((entry, i) => (
              <div key={startIdx + i} style={{
                height: ROW_HEIGHT,
                color: entry.isSection ? 'var(--text-gold)' : 'var(--text-light)',
                fontWeight: entry.isSection ? 'bold' : 'normal',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {entry.tokens.map((t, j) => {
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
