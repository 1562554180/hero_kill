import { useState } from 'react'
import { useBattleStore } from '../../stores/battleStore'
import { useShallow } from 'zustand/react/shallow'
import { HandCard } from '../HandCard'
import type { Card } from '@hero-legend/shared-types'

const noop = () => {}

export function BattleOverlays() {
  const [resultOverlayDismissed, setResultOverlayDismissed] = useState(false)

  const s = useBattleStore(useShallow(st => ({
    phase: st.phase,
    gameState: st.gameState,
    treasureSkill: st.treasureSkill,
    treasurePrompt: st.treasurePrompt,
    treasureTargetIds: st.treasureTargetIds,
    qiYiCardMap: st.qiYiCardMap,
    qiYiCurrentTargetIndex: st.qiYiCurrentTargetIndex,
    qiYiDecision: st.qiYiDecision,
    qiYiStep: st.qiYiStep,
    xiaDanActive: st.xiaDanActive,
    longLinTargetInfo: st.longLinTargetInfo,
    longLinSelectedCards: st.longLinSelectedCards,
    wuguCandidates: st.wuguCandidates,
    wuguPicks: st.wuguPicks,
    wuguTotalPickers: st.wuguTotalPickers,
    tanNangTargetInfo: st.tanNangTargetInfo,
    fudiTargetInfo: st.fudiTargetInfo,
    faJiaTargetInfo: st.faJiaTargetInfo,
    sheShenPrompt: st.sheShenPrompt,
    sheShenSelectedCardIds: st.sheShenSelectedCardIds,
    sheShenDistribution: st.sheShenDistribution,
    result: st.result,
    lastJudgeResult: st.lastJudgeResult,
    buDao3GivePrompt: st.buDao3GivePrompt,
    cancelTreasureSkill: st.cancelTreasureSkill,
    confirmTreasureTargets: st.confirmTreasureTargets,
    pickQiYiCard: st.pickQiYiCard,
    skipQiYiCurrentTarget: st.skipQiYiCurrentTarget,
    cancelQiYiCards: st.cancelQiYiCards,
    pickQiYiDecisionCard: st.pickQiYiDecisionCard,
    toggleLongLinCard: st.toggleLongLinCard,
    confirmLongLinPick: st.confirmLongLinPick,
    cancelLongLinPick: st.cancelLongLinPick,
    selectWuguCard: st.selectWuguCard,
    cancelWuguPick: st.cancelWuguPick,
    selectTanNangCard: st.selectTanNangCard,
    selectFudiCard: st.selectFudiCard,
    selectFaJiaCard: st.selectFaJiaCard,
    toggleSheShenCard: st.toggleSheShenCard,
    assignSheShenCard: st.assignSheShenCard,
    unassignSheShenCard: st.unassignSheShenCard,
    finishSheShen: st.finishSheShen,
    playerJueJiSelf: st.playerJueJiSelf,
    selectBuDao3Card: st.selectBuDao3Card,
    cancelBuDao3Give: st.cancelBuDao3Give,
    taiJiPrompt: st.taiJiPrompt,
    selectTaiJiKillCard: st.selectTaiJiKillCard,
    selectTaiJiTarget: st.selectTaiJiTarget,
    cancelTaiJi: st.cancelTaiJi,
  })))

  const {
    phase, gameState, treasureSkill, treasurePrompt, treasureTargetIds, qiYiCardMap,
    qiYiCurrentTargetIndex, qiYiDecision, qiYiStep,
    xiaDanActive, longLinTargetInfo, longLinSelectedCards,
    wuguCandidates, wuguPicks, wuguTotalPickers, tanNangTargetInfo, fudiTargetInfo, faJiaTargetInfo,
    sheShenPrompt, sheShenSelectedCardIds, sheShenDistribution,
    result, lastJudgeResult,
    buDao3GivePrompt, taiJiPrompt,
    cancelTreasureSkill, confirmTreasureTargets, pickQiYiCard, skipQiYiCurrentTarget, cancelQiYiCards,
    pickQiYiDecisionCard,
    toggleLongLinCard, confirmLongLinPick, cancelLongLinPick,
    selectWuguCard, cancelWuguPick, selectTanNangCard, selectFudiCard, selectFaJiaCard,
    toggleSheShenCard, assignSheShenCard, unassignSheShenCard, finishSheShen,
    playerJueJiSelf,
    selectBuDao3Card, cancelBuDao3Give,
    selectTaiJiKillCard, selectTaiJiTarget, cancelTaiJi,
  } = s

  return (
    <>
      {/* 宝具技能 浮层 — 侠胆自己选牌时不要遮挡手牌, 侠胆激活时也无需浮层; 驭人/烽火/绝击/疗伤/治愈/负荆用内联提示或无提示; 起义有自己的 banner + 顺序选牌弹框, 不用此通用浮层 */}
      {treasureSkill && phase !== 'xiaDanPickCard' && !xiaDanActive && treasureSkill !== 'yu-ren' && treasureSkill !== 'feng-huo' && treasureSkill !== 'jue-ji' && treasureSkill !== 'liao-shang' && treasureSkill !== 'zhi-yu' && treasureSkill !== 'fu-jing' && treasureSkill !== 'qi-yi' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 90, paddingTop: '20vh',
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #b8860b',
            borderRadius: '12px', padding: '20px 28px', textAlign: 'center', minWidth: '320px',
          }}>
            <div style={{ color: 'var(--text-gold)', fontSize: '16px', marginBottom: '12px' }}>
              {treasurePrompt}
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={cancelTreasureSkill}>取消</button>
              {phase === 'treasureSelectWeapon' && (
                <button
                  className="primary"
                  onClick={() => playerJueJiSelf(null)}
                >
                  受1血
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 起义: 选目标阶段底部状态条 — 扁平化文字提示, 不挡场上英雄卡 (玩家直接点场上英雄) */}
      {treasureSkill === 'qi-yi' && phase === 'treasureSelectTargets' && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(0,0,0,0.75)',
          padding: '6px 16px',
          display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'center',
          zIndex: 80, pointerEvents: 'auto',
        }}>
          <span style={{ color: '#ffd54f', fontSize: '13px' }}>
            ✊ 起义 — 直接点击场上英雄 (有手牌) 选择目标
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            已选 {treasureTargetIds.length}/2
          </span>
          <button
            style={{ fontSize: '12px', padding: '2px 10px' }}
            onClick={cancelTreasureSkill}
          >
            取消
          </button>
          <button
            className="primary"
            style={{ fontSize: '12px', padding: '2px 10px' }}
            disabled={treasureTargetIds.length === 0}
            onClick={confirmTreasureTargets}
          >
            确认选目标
          </button>
        </div>
      )}

      {/* 起义: 顺序选牌 — 一次只显示当前目标的手牌, 选完自动推进/提交 */}
      {phase === 'treasureSelectQiYiCards' && treasureTargetIds.length > 0 && (() => {
        const currentTid = treasureTargetIds[qiYiCurrentTargetIndex]
        const target = currentTid && gameState
          ? (gameState as any).players?.find((p: any) => p.hero.id === currentTid)
          : null
        const targetName = target?.hero?.name ?? currentTid ?? ''
        const hand: Card[] = target?.handCards ?? []
        const selectedId = qiYiCardMap[currentTid]
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 95, paddingTop: '10vh',
          }}>
            <div style={{
              background: 'var(--bg-medium)', border: '2px solid #b8860b',
              borderRadius: '12px', padding: '20px 28px', minWidth: '380px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
            }}>
              <h2 style={{ color: 'var(--text-gold)', fontSize: '18px', marginBottom: '12px', textAlign: 'center' }}>
                ✊ 起义 ({qiYiCurrentTargetIndex + 1}/{treasureTargetIds.length})
              </h2>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '10px', textAlign: 'center' }}>
                {treasurePrompt}
              </div>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>
                  {targetName} 的手牌 {hand.length > 0 ? `(${hand.length}张)` : '(空)'}
                  {selectedId && <span style={{ color: '#b8860b', marginLeft: '8px' }}>✓ 已选</span>}
                </div>
                {hand.length > 0 ? (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {hand.map(card => {
                      const isSelected = selectedId === card.id
                      const color = card.suit === 'spade' || card.suit === 'club' ? '♠' : '♥'
                      const textColor = card.suit === 'spade' || card.suit === 'club' ? '#000' : '#c62828'
                      return (
                        <div
                          key={card.id}
                          onClick={() => pickQiYiCard(currentTid, card.id)}
                          style={{
                            cursor: 'pointer',
                            background: isSelected ? 'rgba(184,134,11,0.25)' : 'var(--bg-dark)',
                            border: `2px solid ${isSelected ? '#b8860b' : '#8b6914'}`,
                            borderRadius: '6px', padding: '6px 10px', minWidth: '60px',
                            textAlign: 'center', userSelect: 'none',
                          }}
                        >
                          <div style={{ color: textColor, fontSize: '14px' }}>{color} {card.number}</div>
                          <div style={{ color: 'var(--text-light)', fontSize: '12px', fontWeight: 'bold' }}>{card.name}</div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>
                    该目标无手牌, 将自动跳过
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '12px' }}>
                <button onClick={cancelQiYiCards}>取消</button>
                {hand.length === 0 && (
                  <button className="primary" onClick={skipQiYiCurrentTarget}>
                    跳过此目标
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Long Lin Dao 询问浮层 */}
      {phase === 'longLinDisarm' && longLinTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #ff8a65',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#ff8a65', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              龙鳞刀 — 选{longLinTargetInfo.name}至多2张牌弃掉
            </h2>

            {longLinTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌 (位置)</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {longLinTargetInfo.hand.map((card, idx) => {
                    const sel = longLinSelectedCards.includes(card.id)
                    return (
                      <div key={card.id} onClick={() => toggleLongLinCard(card.id)} style={{
                        cursor: 'pointer', background: sel ? 'rgba(255,138,101,0.2)' : 'var(--bg-dark)',
                        border: `1px solid ${sel ? '#ff8a65' : '#8b6914'}`,
                        borderRadius: '6px', padding: '8px 12px', minWidth: '60px', textAlign: 'center', userSelect: 'none',
                      }}>
                        <div style={{ color: 'var(--text-light)', fontSize: '15px', fontWeight: 'bold' }}>位置 {idx + 1}</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {longLinTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {longLinTargetInfo.judge.map(card => {
                    const sel = longLinSelectedCards.includes(card.id)
                    return (
                      <div key={card.id} onClick={() => toggleLongLinCard(card.id)} style={{
                        cursor: 'pointer', border: sel ? '2px solid #ff8a65' : 'none',
                        borderRadius: '6px',
                      }}>
                        <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {longLinTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {longLinTargetInfo.equipment.map(card => {
                    const sel = longLinSelectedCards.includes(card.id)
                    return (
                      <div key={card.id} onClick={() => toggleLongLinCard(card.id)} style={{
                        cursor: 'pointer', border: sel ? '2px solid #ff8a65' : 'none',
                        borderRadius: '6px',
                      }}>
                        <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '12px' }}>
              <button
                onClick={cancelLongLinPick}
                style={{ padding: '10px 20px', background: '#e57373', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
              >
                正常掉血
              </button>
              <button
                onClick={confirmLongLinPick}
                disabled={longLinSelectedCards.length === 0}
                style={{
                  padding: '10px 20px', background: longLinSelectedCards.length > 0 ? '#64b5f6' : '#555',
                  color: '#fff', border: 'none', borderRadius: '6px', cursor: longLinSelectedCards.length > 0 ? 'pointer' : 'not-allowed', fontSize: '14px', fontWeight: 'bold',
                }}
              >
                弃{longLinSelectedCards.length > 0 ? `${longLinSelectedCards.length}张牌` : '牌'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 五谷丰登 选牌浮层 — 默认无阴影; 已被选走的牌加阴影 + 显示 picker 名; 全选完自动关闭 */}
      {wuguCandidates && (phase === 'selectWugu' || wuguPicks.length > 0) && (() => {
        const pickedMap = new Map(wuguPicks.map(p => [p.cardId, p.heroName]))
        const canPick = phase === 'selectWugu'
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}>
            <div style={{
              background: 'var(--bg-medium)', border: '2px solid #ffd54f',
              borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '640px',
            }}>
              <h2 style={{ color: '#ffd54f', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
                🌾 五谷丰登
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '13px', textAlign: 'center' }}>
                {canPick ? '从候选牌中选1张 (你优先选)' : `等待其他角色选牌 (${wuguPicks.length}/${wuguTotalPickers})`}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '16px' }}>
                {wuguCandidates.map(card => {
                  const pickerName = pickedMap.get(card.id)
                  const isPicked = !!pickerName
                  return (
                    <div
                      key={card.id}
                      onClick={() => canPick && !isPicked && selectWuguCard(card.id)}
                      style={{
                        cursor: canPick && !isPicked ? 'pointer' : 'default',
                        position: 'relative',
                        boxShadow: isPicked ? '0 6px 18px rgba(0,0,0,0.6)' : 'none',
                        opacity: isPicked ? 0.7 : 1,
                        transition: 'box-shadow 0.2s, opacity 0.2s',
                      }}
                    >
                      <HandCard card={card} disabled={true} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                      {isPicked && (
                        <span style={{
                          position: 'absolute',
                          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                          writingMode: 'vertical-rl',
                          background: 'rgba(0,0,0,0.78)',
                          color: '#ffd54f',
                          fontSize: '13px', fontWeight: 'bold',
                          padding: '10px 4px',
                          borderRadius: '4px',
                          letterSpacing: '2px',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          boxShadow: '0 0 8px rgba(255,213,79,0.6)',
                        }}>{pickerName}</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button onClick={cancelWuguPick} disabled={!canPick} style={{ opacity: canPick ? 1 : 0.4 }}>
                  {canPick ? '放弃' : '选牌中...'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 舍身 分配 — 无遮罩浮动面板 (多选牌);
          点战场上的角色卡把选中的牌飞给他, 全部分完自动关闭 */}
      {phase === 'sheShenDistribute' && sheShenPrompt && (() => {
        return (
          <div style={{
            position: 'fixed', top: '42%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 80,
            background: 'var(--bg-medium)', border: '2px solid #ffd54f',
            borderRadius: '12px', padding: '16px 20px', minWidth: '420px', maxWidth: '720px',
          }}>
            <h2 style={{ color: '#ffd54f', fontSize: '18px', marginBottom: '8px', textAlign: 'center' }}>
              🪷 舍身 — 多选牌后点击角色分配
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '12px', fontSize: '12px', textAlign: 'center' }}>
              {sheShenSelectedCardIds.length > 0 ? `已选 ${sheShenSelectedCardIds.length} 张, 点击战场上的角色` : '点击下方牌选中'}
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {sheShenPrompt.cards.map(card => {
                const assignedHeroId = Object.keys(sheShenDistribution).find(hid => sheShenDistribution[hid].includes(card.id))
                const isAssigned = !!assignedHeroId
                const isSelected = sheShenSelectedCardIds.includes(card.id)
                return (
                  <div
                    key={card.id}
                    onClick={() => !isAssigned && toggleSheShenCard(card.id)}
                    style={{
                      cursor: isAssigned ? 'default' : 'pointer',
                      position: 'relative',
                      outline: isSelected ? '2px solid #ffd54f' : 'none',
                      borderRadius: '4px',
                      opacity: isAssigned ? 0.55 : 1,
                    }}
                    title={isAssigned ? '已分配' : '点击选中'}
                  >
                    <HandCard card={card} disabled={true} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* 探囊取物 选目标牌浮层 */}
      {phase === 'selectTanNangCard' && tanNangTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #64b5f6',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#64b5f6', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              🎒 探囊取物 — 选{tanNangTargetInfo.name}的1张牌
            </h2>

            {tanNangTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tanNangTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectTanNangCard(card.id)} style={{
                      cursor: 'pointer',
                      width: '61px', height: '82px',
                      background: 'var(--bg-dark)',
                      border: '1px solid #8b6914',
                      borderRadius: '4px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '22px', fontWeight: 'bold' }}>{idx + 1}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '2px' }}>手牌</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {tanNangTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tanNangTargetInfo.judge.map(card => (
                    <div key={card.id} onClick={() => selectTanNangCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {tanNangTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {tanNangTargetInfo.equipment.map(card => (
                    <div key={card.id} onClick={() => selectTanNangCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {tanNangTargetInfo.hand.length === 0 && tanNangTargetInfo.judge.length === 0 && tanNangTargetInfo.equipment.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>无可拿的牌</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
            </div>
          </div>
        </div>
      )}

      {/* 起义 (陈胜 摸牌前) Step 3: 单独弹框从已选目标手牌中抽 1 张, 与探囊取物手牌样式一致 (看不到牌内容) */}
      {phase === 'qiYiPrompt' && qiYiDecision && qiYiStep === 'pickCards' && (() => {
        const currentTid = treasureTargetIds.find(tid => !qiYiCardMap[tid])
        if (!currentTid) return null
        const cand = qiYiDecision.candidates.find(c => c.id === currentTid)
        if (!cand) return null
        const pickedCount = treasureTargetIds.filter(tid => qiYiCardMap[tid]).length
        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100,
          }}>
            <div style={{
              background: 'var(--bg-medium)', border: '2px solid #ffd54f',
              borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
              boxShadow: '0 4px 24px rgba(255,213,79,0.4)',
            }}>
              <h2 style={{ color: '#ffd54f', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
                ⚔️ 起义 — 从 {cand.name} 的手牌中抽 1 张
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
                已抽 {pickedCount}/{treasureTargetIds.length}
              </p>
              {cand.hand.length > 0 ? (
                <>
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px', textAlign: 'center' }}>手牌</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {cand.hand.map((card: Card, idx: number) => (
                      <div key={card.id} onClick={() => pickQiYiDecisionCard(currentTid, card.id)} style={{
                        cursor: 'pointer',
                        width: '61px', height: '82px',
                        background: 'var(--bg-dark)',
                        border: '1px solid #8b6914',
                        borderRadius: '4px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        textAlign: 'center',
                        userSelect: 'none',
                      }}>
                        <div style={{ color: 'var(--text-light)', fontSize: '22px', fontWeight: 'bold' }}>{idx + 1}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '2px' }}>手牌</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>该角色无手牌可抽</p>
              )}
            </div>
          </div>
        )
      })()}

      {/* 釜底抽薪 选目标牌浮层 (弃牌) */}
      {phase === 'selectFudiCard' && fudiTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #e57373',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#e57373', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              🔥 釜底抽薪 — 弃{fudiTargetInfo.name}的1张牌
            </h2>

            {fudiTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {fudiTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectFudiCard(card.id)} style={{
                      cursor: 'pointer',
                      width: '61px', height: '82px',
                      background: 'var(--bg-dark)',
                      border: '1px solid #e57373',
                      borderRadius: '4px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '22px', fontWeight: 'bold' }}>{idx + 1}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px' }}>手牌</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {fudiTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {fudiTargetInfo.judge.map(card => (
                    <div key={card.id} onClick={() => selectFudiCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {fudiTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {fudiTargetInfo.equipment.map(card => (
                    <div key={card.id} onClick={() => selectFudiCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {fudiTargetInfo.hand.length === 0 && fudiTargetInfo.judge.length === 0 && fudiTargetInfo.equipment.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>无可弃的牌</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
            </div>
          </div>
        </div>
      )}

      {/* 法家 选伤害来源的牌浮层 */}
      {phase === 'selectFaJiaCard' && faJiaTargetInfo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid #ce93d8',
            borderRadius: '12px', padding: '24px', minWidth: '420px', maxWidth: '720px', maxHeight: '80vh', overflow: 'auto',
          }}>
            <h2 style={{ color: '#ce93d8', fontSize: '22px', marginBottom: '12px', textAlign: 'center' }}>
              法家 — 选{faJiaTargetInfo.name}的1张牌
            </h2>

            {faJiaTargetInfo.hand.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>手牌</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {faJiaTargetInfo.hand.map((card, idx) => (
                    <div key={card.id} onClick={() => selectFaJiaCard(card.id)} style={{
                      cursor: 'pointer',
                      width: '61px', height: '82px',
                      background: 'var(--bg-dark)',
                      border: '1px solid #8b6914',
                      borderRadius: '4px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      textAlign: 'center',
                      userSelect: 'none',
                    }}>
                      <div style={{ color: 'var(--text-light)', fontSize: '22px', fontWeight: 'bold' }}>{idx + 1}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginTop: '2px' }}>手牌</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {faJiaTargetInfo.judge.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>判定区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {faJiaTargetInfo.judge.map(card => (
                    <div key={card.id} onClick={() => selectFaJiaCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {faJiaTargetInfo.equipment.length > 0 && (
              <>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>装备区</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {faJiaTargetInfo.equipment.map(card => (
                    <div key={card.id} onClick={() => selectFaJiaCard(card.id)} style={{ cursor: 'pointer' }}>
                      <HandCard card={card} disabled={false} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                    </div>
                  ))}
                </div>
              </>
            )}

            {faJiaTargetInfo.hand.length === 0 && faJiaTargetInfo.judge.length === 0 && faJiaTargetInfo.equipment.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '16px' }}>无可拿的牌</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
            </div>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {phase === 'ended' && result && !resultOverlayDismissed && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'var(--bg-medium)', border: '2px solid var(--border-gold)',
            borderRadius: '12px', padding: '30px', textAlign: 'center', minWidth: '300px',
            position: 'relative',
          }}>
            <button
              onClick={() => setResultOverlayDismissed(true)}
              style={{
                position: 'absolute', top: '8px', right: '12px',
                background: 'transparent', color: 'var(--text-muted)',
                border: '1px solid var(--border-wood)', borderRadius: '4px',
                padding: '2px 10px', cursor: 'pointer', fontSize: '14px',
              }}
              title="关闭弹窗查看战斗记录"
            >
              ✕
            </button>
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

      {/* 判定结果中央高亮显示 (2.5秒后自动消失) */}
      {lastJudgeResult && (
        <div style={{
          position: 'fixed', left: '50%', top: '40%', transform: 'translate(-50%, -50%)',
          zIndex: 1000, pointerEvents: 'none',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          animation: 'judgePopup 0.3s ease-out',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(218,165,32,0.95), rgba(184,134,11,0.95))',
            color: '#1a1a1a', padding: '6px 18px', borderRadius: '20px',
            fontSize: '14px', fontWeight: 'bold',
            border: '2px solid #ffd700', boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
          }}>
            {lastJudgeResult.judgeHeroName && `【${lastJudgeResult.judgeHeroName}】 `}
            {lastJudgeResult.judgeCardName ? `判定【${lastJudgeResult.judgeCardName}】` : '判定结果'}
          </div>
          <div>
            <HandCard
              card={lastJudgeResult.resultCard}
              disabled={true}
              canPlayKill={false}
              isFullHp={true}
              aoJianActive={false}
              hasHongZhuang={false}
              huiChunAvailable={false}
              isHandCardSelect={true}
              onPlayKill={noop}
              onPlayHeal={noop}
              onEquip={noop}
            />
          </div>
        </div>
      )}

      {/* 布道 (张三丰) 选牌+选目标 — 五谷丰登风格 无遮罩
          点牌 → 高亮 → 点场上任意存活角色 (含自己) → 给牌, 剩余 2 张留手 */}
      {phase === 'buDao3Give' && buDao3GivePrompt && (
        <div style={{
          position: 'fixed', top: 'calc(12% + 30px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 80,
          background: 'var(--bg-medium)', border: '2px solid #ffd54f',
          borderRadius: '12px', padding: '16px 20px', minWidth: '420px', maxWidth: '720px',
        }}>
          <h2 style={{ color: '#ffd54f', fontSize: '18px', marginBottom: '8px', textAlign: 'center' }}>
            ☯️ 布道 — 选1张牌交给存活角色
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
            {buDao3GivePrompt.selectedCardId
              ? '已选牌, 点击战场上任意存活角色 (含自己) 给出'
              : '点击下方 3 张牌中的 1 张选中'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '12px' }}>
            {buDao3GivePrompt.drawn.map(card => {
              const isSelected = buDao3GivePrompt.selectedCardId === card.id
              return (
                <div
                  key={card.id}
                  onClick={() => selectBuDao3Card(card.id)}
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    outline: isSelected ? '3px solid #ffd54f' : 'none',
                    borderRadius: '4px',
                    boxShadow: isSelected ? '0 0 12px rgba(255,213,79,0.7)' : 'none',
                    transition: 'outline 0.15s, box-shadow 0.15s',
                  }}
                  title={isSelected ? '已选中, 点击角色给出' : '点击选中'}
                >
                  <HandCard card={card} disabled={true} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={cancelBuDao3Give} style={{ fontSize: '12px', padding: '4px 12px' }}>
              全部留给自己 (取消)
            </button>
          </div>
        </div>
      )}

      {/* 太极 (张三丰) 出闪后立即反击 — 选杀 + 选目标 (无遮罩, 类似布道给牌风格) */}
      {phase === 'taiJi' && taiJiPrompt && (
        <div style={{
          position: 'fixed', top: 'calc(12% + 30px)', left: '50%', transform: 'translateX(-50%)',
          zIndex: 80,
          background: 'var(--bg-medium)', border: '2px solid #ffd54f',
          borderRadius: '12px', padding: '16px 20px', minWidth: '420px', maxWidth: '720px',
        }}>
          <h2 style={{ color: '#ffd54f', fontSize: '18px', marginBottom: '8px', textAlign: 'center' }}>
            ☯️ 太极 — 出闪后立即反击 (选1张杀 + 攻击范围内目标)
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '12px', textAlign: 'center' }}>
            {taiJiPrompt.selectedCardId ? '已选杀, 点击场上攻击范围内的角色' : '点击下方手牌选中一张当杀'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '12px' }}>
            {taiJiPrompt.killableCards.map(card => {
              const isSelected = taiJiPrompt.selectedCardId === card.id
              return (
                <div
                  key={card.id}
                  onClick={() => selectTaiJiKillCard(card.id)}
                  style={{
                    cursor: 'pointer',
                    position: 'relative',
                    outline: isSelected ? '3px solid #ffd54f' : 'none',
                    borderRadius: '4px',
                    boxShadow: isSelected ? '0 0 12px rgba(255,213,79,0.7)' : 'none',
                    transition: 'outline 0.15s, box-shadow 0.15s',
                  }}
                  title={isSelected ? '已选中, 点击角色出杀' : '点击选中'}
                >
                  <HandCard card={card} disabled={true} canPlayKill={false} isFullHp={true} aoJianActive={false} hasHongZhuang={false} huiChunAvailable={false} onPlayKill={noop} onPlayHeal={noop} onEquip={noop} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button onClick={cancelTaiJi} style={{ fontSize: '12px', padding: '4px 12px' }}>
              不反击 (取消)
            </button>
          </div>
        </div>
      )}
    </>
  )
}
