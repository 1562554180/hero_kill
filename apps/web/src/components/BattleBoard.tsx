import { useBattleStore } from '../stores/battleStore'
import { HeroBattleCard } from './HeroBattleCard'
import { HandCard } from './HandCard'
import { BattleLog } from './BattleLog'

export function BattleBoard() {
  const {
    gameState, phase, playerHand, actionLog, result,
    playKill, playScheme, playSchemeSelf, confirmTarget, playHeal, equipCard, endPlayPhase, cancelSelection, game,
    judgeReplace, judgeCard, aoJianActive, responsePrompt, toggleAoJian, respondWithCard,
  } = useBattleStore()

  if (!gameState) return null

  const enemies = gameState.heroes.filter(h => h.role === 'enemy')
  const allies = gameState.heroes.filter(h => h.role === 'ally')
  const player = gameState.heroes.find(h => h.role === 'player')

  const isPlayerTurn = phase === 'playing' || phase === 'selectTarget'
  const canPlayKill = game?.canPlayKill ?? false
  const isFullHp = player ? player.currentHp >= player.maxHp : true

  const playerHero = player?.instance
  const allSkills = player?.hero.skills ?? []
  const allTreasures = [
    ...(playerHero?.treasures?.main ?? []),
    ...(playerHero?.treasures?.sub ?? []),
  ].filter(Boolean)
  const hasSkillOrTreasure = (id: string) =>
    allSkills.some(s => s.id === id) || allTreasures.some(t => t?.skill.id === id || t?.skill.id === `treasure-${id}`)

  const hasAoJian = hasSkillOrTreasure('ao-jian')
  const hasHongZhuang = hasSkillOrTreasure('hong-zhuang')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      {/* Enemy area */}
      <div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>敌方</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {enemies.map(h => (
            <HeroBattleCard
              key={h.hero.id}
              hero={h}
              isCurrentTurn={gameState.currentHeroId === h.hero.id && !isPlayerTurn}
              isSelectable={phase === 'selectTarget' && h.currentHp > 0}
              onClick={() => confirmTarget(h.hero.id)}
            />
          ))}
        </div>
        {phase === 'selectTarget' && (
          <div style={{
            marginTop: '6px', padding: '6px 12px',
            background: 'rgba(255,68,68,0.15)', borderRadius: '4px',
            border: '1px solid rgba(255,68,68,0.3)',
            color: '#ff6b6b', fontSize: '13px', textAlign: 'center',
          }}>
            点击敌方英雄选择攻击目标
          </div>
        )}
      </div>

      {/* Battle log */}
      <BattleLog logs={actionLog} />

      {/* Ally area */}
      {allies.length > 0 && (
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>友军</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allies.map(h => (
              <HeroBattleCard
                key={h.hero.id}
                hero={h}
                isCurrentTurn={gameState.currentHeroId === h.hero.id && !isPlayerTurn}
                isSelectable={false}
              />
            ))}
          </div>
        </div>
      )}

      {/* Player area */}
      {player && (
        <div style={{
          background: 'var(--bg-medium)',
          border: '1px solid var(--border-wood)',
          borderRadius: '8px',
          padding: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <HeroBattleCard
              hero={player}
              isCurrentTurn={isPlayerTurn}
              isSelectable={false}
            />
            {phase === 'selectTarget' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#ff6b6b', fontSize: '14px', fontWeight: 'bold' }}>
                  {useBattleStore.getState().pendingCardType === 'scheme' ? '选择锦囊目标' : '选择攻击目标'}
                </span>
                <button style={{ fontSize: '12px' }} onClick={cancelSelection}>取消</button>
              </div>
            ) : phase === 'judgeReplace' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#64b5f6', fontSize: '14px', fontWeight: 'bold' }}>
                  变法 — 点击手牌替换判定牌
                </span>
                <button style={{ fontSize: '12px' }} onClick={() => judgeReplace(null)}>跳过</button>
              </div>
            ) : phase === 'awaitingResponse' ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ color: '#ff9800', fontSize: '14px', fontWeight: 'bold' }}>
                  {responsePrompt || '请响应'}
                </span>
                <button style={{ fontSize: '12px' }} onClick={() => respondWithCard(null)}>放弃</button>
              </div>
            ) : isPlayerTurn ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-gold)', fontSize: '12px' }}>你的回合 - 点击手牌出牌</span>
                {hasAoJian && (
                  <button
                    onClick={toggleAoJian}
                    style={{
                      fontSize: '12px',
                      padding: '4px 10px',
                      background: aoJianActive ? '#e57373' : 'var(--bg-dark)',
                      color: aoJianActive ? '#fff' : 'var(--text-light)',
                      border: aoJianActive ? '1px solid #e57373' : '1px solid var(--border-wood)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: aoJianActive ? 'bold' : 'normal',
                    }}
                    title="傲剑: 红色牌当杀(包括药)"
                  >
                    {aoJianActive ? '⚔ 傲剑·激活' : '⚔ 傲剑'}
                  </button>
                )}
                <button className="primary" style={{ fontSize: '14px' }} onClick={endPlayPhase}>
                  结束出牌
                </button>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>等待中...</span>
            )}
          </div>

          {/* Judge replace info */}
          {phase === 'judgeReplace' && judgeCard && (
            <div style={{
              marginBottom: '8px', padding: '8px 12px',
              background: 'rgba(100,181,246,0.12)', borderRadius: '4px',
              border: '1px solid rgba(100,181,246,0.3)',
              color: '#90caf9', fontSize: '12px',
            }}>
              判定牌: {judgeCard.name} ({judgeCard.suit === 'heart' ? '♥' : judgeCard.suit === 'diamond' ? '♦' : judgeCard.suit === 'spade' ? '♠' : '♣'}{judgeCard.number === 1 ? 'A' : judgeCard.number > 10 ? ['J','Q','K'][judgeCard.number - 11] : judgeCard.number})
              {' — '}弃一张手牌可替换此判定牌
            </div>
          )}

          {/* Hand cards */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {playerHand.map(card => (
              <HandCard
                key={card.id}
                card={card}
                disabled={!(isPlayerTurn || phase === 'judgeReplace' || phase === 'awaitingResponse') || phase === 'selectTarget'}
                canPlayKill={canPlayKill}
                isFullHp={isFullHp}
                aoJianActive={aoJianActive}
                hasHongZhuang={hasHongZhuang}
                isResponse={phase === 'awaitingResponse'}
                isJudgeReplace={phase === 'judgeReplace'}
                onPlayKill={playKill}
                onPlayHeal={playHeal}
                onEquip={equipCard}
                onPlayScheme={playScheme}
                onPlaySchemeSelf={playSchemeSelf}
                onJudgeReplace={judgeReplace}
                onRespondWithCard={respondWithCard}
              />
            ))}
          </div>
        </div>
      )}

      {/* Result overlay */}
      {phase === 'ended' && result && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid var(--border-gold)',
            borderRadius: '12px', padding: '30px', textAlign: 'center', minWidth: '300px',
          }}>
            <h2 style={{ color: result.won ? 'var(--text-gold)' : '#f44336', fontSize: '28px', marginBottom: '12px' }}>
              {result.won ? '胜利!' : '失败!'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>回合数: {result.turnCount}</p>
            {result.won && (
              <p style={{ color: 'var(--text-gold)' }}>
                奖励: {result.rewards.gold} 金币, {result.rewards.growthValue} 成长值
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
