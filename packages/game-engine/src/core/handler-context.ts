import type { Card, EquipmentSlot, GameAction } from '@hero-legend/shared-types'

/**
 * Engine handler ctx 类型集中定义.
 *
 * 阶段 3 步骤 A: 所有 handler 不再接收 Game/Player 实例, 只接收可结构化克隆的纯数据 ctx.
 * - 玩家用 playerId / heroId (Hero definition id) 替代 player: Player
 * - 角色相关参数用具体 id: attackerId / defenderId / victimId / pickerId / saviorId 等
 * - 候选目标 Player[] → candidateIds: string[]
 * - 复杂参数 (hand, equipment 等已是 Card[] 或可序列化对象) 保持原样
 * - 返回值类型不变
 *
 * 注: web/ai 都可复用本文件.
 */

// ---------- 基础 ----------
export interface PlayerActionCtx {
  playerId: string
}

export interface JudgeActionCtx {
  playerId: string
  judgeCard: Card
}

export interface ChaoTuoCtx {
  playerId: string
  judgeCard: Card
  blackCardIds: { hand: string[]; equipment: Array<{ cardId: string; slot: string }> }
}

export interface ResponseActionCtx {
  playerId: string
  responseType: 'kill' | 'nullify' | 'dodge'
  context: { sourceHeroId: string; schemeName: string; needCount?: number; targetHeroId?: string }
}

export interface PinDianCtx {
  playerId: string
  againstId: string
  reason: string
}

export interface XiaDanPlayerCardCtx {
  playerId: string
  againstId: string
}

// ---------- 选择目标 ----------
export interface FudiTargetCtx {
  attackerId: string
  candidateIds: string[]
}

export interface FudiPickCtx {
  attackerId: string
  targetId: string
  options: { hand: Card[]; judge: Card[]; equipment: Card[] }
}

export interface TanNangTargetCtx {
  attackerId: string
  candidateIds: string[]
}

export interface TanNangPickCtx {
  attackerId: string
  targetId: string
  options: { hand: Card[]; judge: Card[]; equipment: Card[] }
}

export interface JieDaoTargetCtx {
  attackerId: string
  weaponHolderIds: string[]
}

export interface JieDaoAttackTargetCtx {
  attackerId: string
  borrowerId: string
  candidateIds: string[]
}

export interface WuguPickCtx {
  pickerId: string
  candidates: Card[]
}

export interface MultiTargetCtx {
  attackerId: string
  candidateIds: string[]
}

export interface DualCardCtx {
  attackerId: string
}

export interface LuYeQiangTargetCtx {
  attackerId: string
  candidateIds: string[]
}

// ---------- 武器/技能相关 ----------
export interface LongLinPickCtx {
  attackerId: string
  defenderId: string
  options: { hand: Card[]; judge: Card[]; equipment: Card[] }
}

export interface BoLangChuiCtx {
  attackerId: string
  hand: Card[]
}

export interface FaJiaPickCtx {
  victimId: string
  attackerId: string
  options: { hand: Card[]; judge: Card[]; equipment: Card[] }
}

export interface YuRuYiCtx {
  defenderId: string
  attackName: string
}

export interface DiscardPickCtx {
  playerId: string
  handCards: Card[]
  discardCount: number
}

export interface BaWangMountCtx {
  attackerId: string
  defenderId: string
  mountOptions: { attackMount: Card | null; defenseMount: Card | null }
}

export interface QiangLueCtx {
  attackerId: string
  defenderId: string
}

export interface CiKeCtx {
  attackerId: string
  defenderId: string
}

export interface DieHunCtx {
  targetId: string
  schemeName: string
}

export interface HouZhuCtx {
  dodgerId: string
  candidateIds: string[]
}

export interface TianXiangCtx {
  playerId: string
  judgeCard: Card
}

export interface ManWuPickCardCtx {
  victimId: string
}

export interface ManWuCtx {
  victimId: string
  attackerId: string
  damage: number
  candidateIds: string[]
}

export interface JueJiCtx {
  attackerId: string
  inRangeEnemyIds: string[]
}

export interface MenShenTargetCtx {
  qinQiongId: string
  candidateIds: string[]
}

export interface SanBanFuCtx {
  attackerId: string
  defenderId: string
}

export interface ZhenShaCtx {
  lvZhiId: string
  dyingTargetId: string
}

export interface JueBieCtx {
  yuJiId: string
  candidateIds: string[]
}

export interface BuDaoCtx {
  guanYuId: string
  victimId: string
}

export interface FuChouTriggerCtx {
  victimId: string
  attackerId: string
}

export interface FuChouChooseCtx {
  attackerId: string
  handCards: Card[]
}

export interface FuChouPickCtx {
  attackerId: string
  handCards: Card[]
}

export interface DyingRescueCtx {
  saviorId: string
  dyingTargetId: string
  yaoHandCards: Card[]
}

export interface SheShenCtx {
  victimId: string
  cards: Card[]
}

export interface SheShenTriggerCtx {
  victimId: string
  damage: number
}
