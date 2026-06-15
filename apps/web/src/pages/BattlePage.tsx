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
  const [selectedHeroIdx, setSelectedHeroIdx] = useState(0)
  const [allHeroes, setAllHeroes] = useState<any[]>([])

  const { phase, result, startBattle } = useBattleStore()

  const userId = localStorage.getItem('hero-legend-userId') || ''

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    Promise.all([
      fetch(`${API}/stage`).then(r => r.json()),
      fetch(`${API}/save/${userId}`).then(r => r.json()),
      fetch(`${API}/hero`).then(r => r.json()),
    ]).then(([stageData, saveData, heroData]) => {
      const s = stageData.stages?.find((st: any) => st.id === stageId)
      setStage(s)
      setSave(saveData)
      setAllHeroes(heroData.heroes ?? [])
    })
  }, [stageId, userId])

  if (!stage || !save) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>

  const currentBattle = stage.battles[battleIdx]

  const handleStartBattle = async () => {
    // Use selected hero
    const heroInstance = save.heroes?.[selectedHeroIdx]
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
          playerHeroId: heroInstance.heroId,
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
      // 完整重置所有状态, 防止上一场战斗残留导致新战斗回合卡住
      useBattleStore.setState({
        game: null,
        gameState: null,
        phase: 'idle',
        playerHand: [],
        actionLog: [],
        result: null,
        pendingCardId: null,
        pendingCardType: null,
        aoJianActive: false,
        responsePrompt: null,
        equippedCards: {},
        multiTargetCandidates: [],
        selectedTargets: [],
        selectedDualCards: [],
        longLinTargetInfo: null,
        longLinSelectedCards: [],
        jieDaoHolders: [],
        jieDaoCandidates: [],
        tanNangTargetInfo: null,
        wuguCandidates: null,
        fudiTargetInfo: null,
        faJiaTargetInfo: null,
        treasureSkill: null,
        treasurePrompt: '',
        treasureCardIds: [],
        treasureTargetIds: [],
        resolveAction: null,
        resolveResponse: null,
        resolveJudge: null,
        resolveLongLin: null,
        resolveMultiTarget: null,
        resolveDualCard: null,
        resolveJieDaoHolder: null,
        resolveJieDaoTarget: null,
        resolveTanNangTarget: null,
        resolveTanNangPick: null,
        resolveWuguPick: null,
        resolveFudiTarget: null,
        resolveFudiPick: null,
        resolveFaJiaPick: null,
        judgeCard: null,
      })
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
            <div style={{ marginTop: '8px' }}>
              <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '6px' }}>选择出战英雄:</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {save.heroes.map((hero: any, idx: number) => {
                  const heroDef = allHeroes.find((h: any) => h.id === hero.heroId)
                  const selected = idx === selectedHeroIdx
                  return (
                    <div
                      key={hero.heroId}
                      onClick={() => setSelectedHeroIdx(idx)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        border: selected ? '2px solid var(--text-gold)' : '2px solid var(--bg-dark)',
                        background: selected ? 'var(--bg-dark)' : 'var(--bg-medium)',
                        color: selected ? 'var(--text-gold)' : 'var(--text-light)',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{heroDef?.name ?? hero.heroId}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {'★'.repeat(hero.starLevel)} Lv.{hero.level}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
