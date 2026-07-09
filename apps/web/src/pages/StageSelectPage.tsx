import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface Stage {
  id: string; name: string; description: string; order: number
  battles: any[]; rewards: any
}

export function StageSelectPage() {
  const navigate = useNavigate()
  const [stages, setStages] = useState<Stage[]>([])
  const [progress, setProgress] = useState<Record<string, any>>({})

  useEffect(() => {
    Promise.all([
      fetch('/api/stage', { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/save`, { credentials: 'include' }).then(r => r.json()).catch(() => null),
    ]).then(([stageData, saveData]) => {
      setStages(stageData.stages ?? [])
      if (saveData?.stageProgress) {
        const map: Record<string, any> = {}
        for (const sp of saveData.stageProgress) map[sp.stageId] = sp
        setProgress(map)
      }
    })
  }, [])

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: 'var(--text-gold)', marginBottom: '30px' }}>
        选择关卡
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {stages.map(stage => {
          const prog = progress[stage.id]
          const unlocked = prog?.unlocked ?? stage.order === 1
          return (
            <div key={stage.id} style={{
              background: unlocked ? 'var(--bg-light)' : 'var(--bg-medium)',
              border: `1px solid ${unlocked ? 'var(--border-wood)' : '#3a2a1a'}`,
              borderRadius: '8px', padding: '20px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              opacity: unlocked ? 1 : 0.5,
            }}>
              <div>
                <h3 style={{ color: unlocked ? 'var(--text-gold)' : 'var(--text-muted)', marginBottom: '4px' }}>
                  {unlocked ? '' : '🔒 '}{stage.name}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{stage.description}</p>
                {prog && <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                  进度: {prog.battlesCompleted}/{stage.battles.length} | 星级: {'★'.repeat(prog.stars)}
                </p>}
              </div>
              {unlocked && (
                <button className="primary" onClick={() => navigate(`/battle/${stage.id}`)}>
                  挑战
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '30px' }}>
        <button onClick={() => navigate('/city')}>主城</button>
        <button onClick={() => navigate('/heroes')}>英雄</button>
      </div>
    </div>
  )
}
