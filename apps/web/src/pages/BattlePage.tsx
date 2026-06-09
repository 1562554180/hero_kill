import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBattleStore } from '../stores/battleStore'
import { BattleBoard } from '../components/BattleBoard'
import type { GameConfig } from '@hero-legend/game-engine'

const API = '/api'

export function BattlePage() {
  const { stageId } = useParams()
  const navigate = useNavigate()
  const [stage, setStage] = useState<any>(null)
  const [battleIdx, setBattleIdx] = useState(0)
  const [save, setSave] = useState<any>(null)
  const [starting, setStarting] = useState(false)

  const { phase, result, startBattle } = useBattleStore()

  const userId = localStorage.getItem('hero-legend-userId') || ''

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    Promise.all([
      fetch(`${API}/stage`).then(r => r.json()),
      fetch(`${API}/save/${userId}`).then(r => r.json()),
    ]).then(([stageData, saveData]) => {
      const s = stageData.stages?.find((st: any) => st.id === stageId)
      setStage(s)
      setSave(saveData)
    })
  }, [stageId, userId])

  if (!stage || !save) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>

  const currentBattle = stage.battles[battleIdx]

  const handleStartBattle = async () => {
    // Use player's first hero, or fallback to yu-ji
    const heroInstance = save.heroes?.[0]
    if (!heroInstance) {
      alert('请先招募一个英雄!')
      navigate('/heroes')
      return
    }

    setStarting(true)

    const config: GameConfig = {
      playerHeroId: heroInstance.heroId,
      playerInstance: heroInstance,
      allyHeroIds: currentBattle.allies ?? [],
      enemyHeroIds: currentBattle.enemies,
    }

    try {
      const battleResult = await startBattle(config)

      // Save result to server
      await fetch(`${API}/battle/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          stageId: stage.id,
          battleIdx,
          result: battleResult,
        }),
      })

      // Refresh save data
      const freshSave = await fetch(`${API}/save/${userId}`).then(r => r.json())
      setSave(freshSave)
    } catch (e) {
      console.error('Battle error:', e)
    }
    setStarting(false)
  }

  const handleNext = () => {
    if (battleIdx < stage.battles.length - 1) {
      setBattleIdx(battleIdx + 1)
      useBattleStore.setState({ phase: 'idle', result: null, actionLog: [], gameState: null })
    }
  }

  const isBattleActive = phase !== 'idle'

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: 'var(--text-gold)', marginBottom: '12px' }}>
        {stage.name} - 第 {battleIdx + 1} 战
        {currentBattle.isBoss && ' (BOSS)'}
      </h2>

      {!isBattleActive && (
        <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-medium)', borderRadius: '4px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            敌方: {currentBattle.enemies.join(', ')}
            {currentBattle.allies?.length > 0 && ` | 友军: ${currentBattle.allies.join(', ')}`}
          </p>
          {save.heroes?.length > 0 && (
            <p style={{ color: 'var(--text-light)', fontSize: '13px', marginTop: '4px' }}>
              出战英雄: {save.heroes[0].heroId} ({'★'.repeat(save.heroes[0].starLevel)})
            </p>
          )}
        </div>
      )}

      {isBattleActive ? (
        <BattleBoard />
      ) : (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button className="primary" onClick={handleStartBattle} disabled={starting} style={{ fontSize: '18px', padding: '12px 40px' }}>
            {starting ? '战斗中...' : '开始战斗'}
          </button>
        </div>
      )}

      {phase === 'ended' && result && (
        <div style={{
          display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px',
          position: 'fixed', bottom: '40px', left: 0, right: 0,
          zIndex: 200,
        }}>
          {result.won && battleIdx < stage.battles.length - 1 && (
            <button className="primary" onClick={handleNext} style={{ fontSize: '16px', padding: '10px 30px' }}>
              下一战
            </button>
          )}
          <button onClick={() => navigate('/stages')} style={{ fontSize: '16px', padding: '10px 30px' }}>
            返回关卡
          </button>
        </div>
      )}
    </div>
  )
}
