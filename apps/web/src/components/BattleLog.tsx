import { useEffect, useRef } from 'react'

interface Props {
  logs: string[]
}

export function BattleLog({ logs }: Props) {
  const ref = useRef<HTMLDivElement>(null)

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
        height: '180px',
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
      {logs.map((log, i) => (
        <div key={i} style={{
          color: log.startsWith('──') ? 'var(--text-gold)' : 'var(--text-light)',
          fontWeight: log.startsWith('──') ? 'bold' : 'normal',
        }}>
          {log}
        </div>
      ))}
    </div>
  )
}
