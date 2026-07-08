import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useBattleStore } from '../stores/battleStore'
import { BattleBoard } from '../components/BattleBoard'
import type { GameConfig } from '@hero-legend/game-engine'
import { generateEnemyInstances } from '@hero-legend/game-data'
import { HERO_NAME_TO_ID as NAME_TO_ID } from '../heroPortraitNames'

const API = '/api'

const portraitModules = import.meta.glob('../images/avatars/*.jpg', { eager: true, import: 'default' }) as Record<string, string>
const HERO_AVATARS_BY_NAME: Record<string, string> = {}
for (const [path, url] of Object.entries(portraitModules)) {
  const filename = path.replace('../images/avatars/', '').replace('.jpg', '')
  HERO_AVATARS_BY_NAME[filename] = url
}
const HERO_AVATARS_BY_ID: Record<string, string> = {}
for (const [cnName, heroId] of Object.entries(NAME_TO_ID)) {
  if (HERO_AVATARS_BY_NAME[cnName]) HERO_AVATARS_BY_ID[heroId] = HERO_AVATARS_BY_NAME[cnName]
}

const STAR_NAME_COLOR: Record<number, string> = {
  5: '#ffd700',
  4: '#a78bfa',
  3: '#60a5fa',
  2: '#86efac',
  1: '#9ca3af',
}

export function BattlePage() {
  const { stageId } = useParams()
  const navigate = useNavigate()
  const [stage, setStage] = useState<any>(null)
  const [battleIdx, setBattleIdx] = useState(0)
  const [save, setSave] = useState<any>(null)
  const [starting, setStarting] = useState(false)
  const [selectedHeroIdx, setSelectedHeroIdx] = useState(0)
  const [heroConfirmed, setHeroConfirmed] = useState(false)
  const [selectedAllyIdx, setSelectedAllyIdx] = useState(-1)  // -1 = 不带友军
  const [allHeroes, setAllHeroes] = useState<any[]>([])

  const { phase, result, startBattle } = useBattleStore()
  // 阶段 3 步骤 E: 战斗页卸载时释放 Worker, 防 Worker 泄漏
  useEffect(() => {
    return () => { useBattleStore.getState().cleanupBattle() }
  }, [])

  const userId = localStorage.getItem('hero-legend-userId') || ''

  // 计算当前关卡中作为敌人的英雄id集合, 玩家不能选这些英雄
  const currentBattle = stage?.battles?.[battleIdx]
  const forbiddenHeroIds = useMemo(
    () => new Set(currentBattle?.enemies ?? []),
    [currentBattle],
  )
  const availableHeroes = useMemo(
    () => (save?.heroes ?? [])
      .map((h: any, idx: number) => ({ h, idx }))
      .filter(({ h }: any) => !forbiddenHeroIds.has(h.heroId)),
    [save, forbiddenHeroIds],
  )

  useEffect(() => {
    const current = save?.heroes?.[selectedHeroIdx]
    if (!current || forbiddenHeroIds.has(current.heroId)) {
      setSelectedHeroIdx(availableHeroes[0]?.idx ?? 0)
    }
  }, [availableHeroes, forbiddenHeroIds, save, selectedHeroIdx])

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

  const handleStartBattle = async () => {
    // Use selected hero
    const heroInstance = save.heroes?.[selectedHeroIdx]
    if (!heroInstance) {
      alert('请先招募一个英雄!')
      navigate('/heroes')
      return
    }
    // 防御: 所选英雄是本关敌人, 阻止开始战斗
    if (forbiddenHeroIds.has(heroInstance.heroId)) {
      alert('该英雄是本关敌人, 不能出战!')
      return
    }

    setStarting(true)

    const config: GameConfig = {
      playerHeroId: heroInstance.heroId,
      playerInstance: heroInstance,
      allyHeroIds: [],
      allyInstances: selectedAllyIdx >= 0 ? [save.heroes[selectedAllyIdx]] : [],
      enemyHeroIds: currentBattle.enemies,
      // 根据关卡难度生成敌人 (星级 + 主印 + 辅印)
      enemyInstances: generateEnemyInstances({
        stageOrder: stage.order,
        battleIdx,
        totalBattles: stage.battles.length,
        isBoss: currentBattle.isBoss,
        enemyHeroIds: currentBattle.enemies,
      }),
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
          playerInstanceId: heroInstance.instanceId,
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
      setSelectedAllyIdx(-1)
      // 完整重置所有状态, 防止上一场战斗残留导致新战斗回合卡住
      useBattleStore.setState({
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
    <div style={isBattleActive
      ? { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-dark, #1a1a1a)' }
      : { padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {!isBattleActive && (
        <h2 style={{ textAlign: 'center', color: 'var(--text-gold)', marginBottom: '12px' }}>
          {stage.name} - 第 {battleIdx + 1} 战
          {currentBattle.isBoss && ' (BOSS)'}
        </h2>
      )}

      {!isBattleActive && (
        <div style={{ marginBottom: '12px', padding: '12px', background: 'var(--bg-medium)', borderRadius: '4px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            敌方: {currentBattle.enemies.join(', ')}
            {selectedAllyIdx >= 0 && save.heroes?.[selectedAllyIdx]
              ? ` | 友军: ${allHeroes.find((h: any) => h.id === save.heroes[selectedAllyIdx].heroId)?.name ?? save.heroes[selectedAllyIdx].heroId}`
              : ' | 友军: 无'}
          </p>
          {save.heroes?.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              {!heroConfirmed ? (
                <>
                  <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '6px' }}>
                    选择出战英雄{availableHeroes.length === 0 && ' (无可用英雄!)'}:
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
                    gap: '8px', alignContent: 'start',
                  }}>
                    {save.heroes.map((hero: any, idx: number) => {
                      const heroDef = allHeroes.find((h: any) => h.id === hero.heroId)
                      const selected = idx === selectedHeroIdx
                      const isForbidden = forbiddenHeroIds.has(hero.heroId)
                      const name = heroDef?.name ?? hero.heroId
                      const avatar = HERO_AVATARS_BY_NAME[name] ?? HERO_AVATARS_BY_ID[hero.heroId]
                      const nameColor = STAR_NAME_COLOR[hero.starLevel] ?? 'var(--text-light)'
                      return (
                        <div
                          key={`${hero.heroId}-${idx}`}
                          onClick={() => { if (!isForbidden) { setSelectedHeroIdx(idx); setSelectedAllyIdx(-1) } }}
                          title={isForbidden ? '该英雄是本关敌人, 不可选择' : name}
                          style={{
                            background: selected ? 'var(--bg-light)' : 'var(--bg-medium)',
                            border: `1px solid ${selected ? 'var(--border-gold)' : 'var(--border-wood)'}`,
                            borderRadius: '6px', padding: '4px', cursor: isForbidden ? 'not-allowed' : 'pointer',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                            opacity: isForbidden ? 0.4 : 1, position: 'relative',
                          }}
                        >
                          {avatar && (
                            <img src={avatar} alt={name} style={{
                              width: '100%', aspectRatio: '1', borderRadius: '4px',
                              objectFit: 'cover', display: 'block',
                              border: '1px solid var(--border-wood)', background: 'var(--bg-dark)',
                            }} />
                          )}
                          <span style={{ color: nameColor, fontWeight: 'bold', fontSize: '12px', textAlign: 'center', lineHeight: 1.1 }}>
                            {name}
                          </span>
                          {isForbidden && (
                            <div style={{
                              position: 'absolute', top: '-6px', right: '-4px',
                              background: '#e57373', color: '#fff', fontSize: '10px',
                              padding: '0 4px', borderRadius: '3px', fontWeight: 'bold',
                            }}>
                              敌方
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '10px' }}>
                    <button
                      className="primary"
                      disabled={availableHeroes.length === 0}
                      onClick={() => setHeroConfirmed(true)}
                      style={{ fontSize: '14px', padding: '8px 24px' }}
                    >确认出战英雄</button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>出战英雄:</span>
                  <span style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>
                    {allHeroes.find((h: any) => h.id === save.heroes[selectedHeroIdx]?.heroId)?.name ?? '???'}
                  </span>
                  <button onClick={() => { setHeroConfirmed(false); setSelectedAllyIdx(-1) }} style={{ fontSize: '12px', padding: '4px 14px' }}>← 重新选</button>
                </div>
              )}
            </div>
          )}

          {/* 友军选择 (可选, 最多1个) — 玩家英雄确认后才显示 */}
          {heroConfirmed && availableHeroes.length > 1 && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ color: 'var(--text-light)', fontSize: '13px', marginBottom: '6px' }}>
                选择友军 (可选, 不会出战):
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                gap: '8px', alignContent: 'start',
              }}>
                <div
                  onClick={() => setSelectedAllyIdx(-1)}
                  title="无友军"
                  style={{
                    background: selectedAllyIdx === -1 ? 'var(--bg-light)' : 'var(--bg-medium)',
                    border: `1px solid ${selectedAllyIdx === -1 ? 'var(--border-gold)' : 'var(--border-wood)'}`,
                    borderRadius: '6px', padding: '4px', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}
                >
                  <div style={{
                    width: '100%', aspectRatio: '1', borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px dashed var(--border-wood)', background: 'var(--bg-dark)',
                    color: 'var(--text-muted)', fontSize: '11px',
                  }}>无</div>
                  <span style={{ color: selectedAllyIdx === -1 ? 'var(--text-gold)' : 'var(--text-muted)', fontWeight: 'bold', fontSize: '12px' }}>无友军</span>
                </div>
                {save.heroes.map((hero: any, idx: number) => {
                  // 不能选自己, 不能选敌人
                  if (idx === selectedHeroIdx) return null
                  if (forbiddenHeroIds.has(hero.heroId)) return null
                  const heroDef = allHeroes.find((h: any) => h.id === hero.heroId)
                  const selected = idx === selectedAllyIdx
                  const name = heroDef?.name ?? hero.heroId
                  const avatar = HERO_AVATARS_BY_NAME[name] ?? HERO_AVATARS_BY_ID[hero.heroId]
                  const nameColor = STAR_NAME_COLOR[hero.starLevel] ?? 'var(--text-light)'
                  return (
                    <div
                      key={`ally-${hero.heroId}-${idx}`}
                      onClick={() => setSelectedAllyIdx(idx)}
                      title={name}
                      style={{
                        background: selected ? 'var(--bg-light)' : 'var(--bg-medium)',
                        border: `1px solid ${selected ? '#90caf9' : 'var(--border-wood)'}`,
                        borderRadius: '6px', padding: '4px', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      }}
                    >
                      {avatar && (
                        <img src={avatar} alt={name} style={{
                          width: '100%', aspectRatio: '1', borderRadius: '4px',
                          objectFit: 'cover', display: 'block',
                          border: '1px solid var(--border-wood)', background: 'var(--bg-dark)',
                        }} />
                      )}
                      <span style={{ color: nameColor, fontWeight: 'bold', fontSize: '12px', textAlign: 'center', lineHeight: 1.1 }}>
                        {name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {isBattleActive ? (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <BattleBoard />
        </div>
      ) : (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button
            className="primary"
            onClick={handleStartBattle}
            disabled={starting || availableHeroes.length === 0}
            style={{ fontSize: '18px', padding: '12px 40px' }}
          >
            {starting ? '战斗中...' : availableHeroes.length === 0 ? '无可用英雄' : '开始战斗'}
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
