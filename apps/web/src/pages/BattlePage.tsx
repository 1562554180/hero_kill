import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

interface BattleState {
  turnNumber: number; currentHeroId: string; isOver: boolean; winner: string | null
  heroes: any[]; logs: string[]
}

export function BattlePage() {
  const { stageId } = useParams()
  const navigate = useNavigate()
  const [stage, setStage] = useState<any>(null)
  const [battleIdx, setBattleIdx] = useState(0)
  const [battleState, setBattleState] = useState<BattleState | null>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    fetch('/api/stage').then(r => r.json()).then(data => {
      const s = data.stages?.find((st: any) => st.id === stageId)
      setStage(s)
    })
  }, [stageId])

  const startBattle = async (battle: any) => {
    const res = await fetch('/api/battle/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerHeroId: 'yu-ji',
        playerInstance: { heroId: 'yu-ji', level: 1, growthValue: 0, starLevel: 3, treasures: { main: [], sub: [] } },
        allyHeroIds: battle.allies ?? [],
        enemyHeroIds: battle.enemies,
      }),
    })
    const data = await res.json()
    setResult(data)
    setBattleState({
      turnNumber: data.turnCount,
      currentHeroId: '',
      isOver: true,
      winner: data.won ? 'player' : 'enemy',
      heroes: [],
      logs: [],
    })
  }

  if (!stage) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>

  const currentBattle = stage.battles[battleIdx]

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: 'var(--text-gold)', marginBottom: '20px' }}>
        {stage.name} - 第 {battleIdx + 1} 战
      </h2>

      <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-medium)', borderRadius: '4px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          敌方: {currentBattle.enemies.join(', ')}
          {currentBattle.allies?.length > 0 && ` | 友军: ${currentBattle.allies.join(', ')}`}
          {currentBattle.isBoss && ' | ⚔ BOSS 战'}
        </p>
      </div>

      {!battleState && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="primary" onClick={() => startBattle(currentBattle)}>
            开始战斗
          </button>
        </div>
      )}

      {result && (
        <div style={{
          textAlign: 'center', padding: '30px', marginTop: '20px',
          background: 'var(--bg-medium)', borderRadius: '8px', border: '1px solid var(--border-wood)',
        }}>
          <h3 style={{ color: result.won ? 'var(--text-gold)' : 'var(--color-red)', fontSize: '24px', marginBottom: '12px' }}>
            {result.won ? '胜利!' : '失败!'}
          </h3>
          <p style={{ color: 'var(--text-muted)' }}>回合数: {result.turnCount}</p>
          <p style={{ color: 'var(--text-muted)' }}>奖励: {result.rewards?.gold} 金币, {result.rewards?.growthValue} 成长值</p>

          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {result.won && battleIdx < stage.battles.length - 1 && (
              <button className="primary" onClick={() => {
                setBattleIdx(battleIdx + 1)
                setBattleState(null)
                setResult(null)
              }}>
                下一战
              </button>
            )}
            <button onClick={() => navigate('/stages')}>返回关卡</button>
          </div>
        </div>
      )}
    </div>
  )
}
