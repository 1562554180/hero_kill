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

/** 门神: 秦琼出牌阶段结束询问是否发动 (true=发动, 进入选目标; false=不发动). AI 由引擎自动决策. */
export interface MenShenConfirmCtx {
  qinQiongId: string
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

/** 盘龙棍: 杀被闪避后, 装备者是否继续追击 (true=继续出杀; false=停止) */
export interface PanLongGunCtx {
  attackerId: string
  defenderId: string
  nextKillCardId: string     // 手牌中可作追击的下一张杀
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

/** 噬心: 妲己受伤后选是否发动 + 选弃哪张牌 (返回 cardId=弃该牌发动; null=不发动) */
export interface ShiXinTriggerCtx {
  victimId: string
  attackerId: string
  damage: number
  options: { hand: Card[]; equipment: Card[] }
}

/** 神断: 包拯判定时选是否发动 + 选改成哪个花色 (返回 'spade'|'heart'|'club'|'diamond' = 改成的花色; null=不发动) */
export interface ShenDuanCtx {
  baoZhengId: string
  judgeCard: Card
  judgeHeroId: string
}

/** 布道: 张三丰摸牌阶段是否发动 + 摸3张后选给谁哪张牌 */
export interface BuDao3Ctx {
  zhangSanFengId: string
  candidateIds: string[]
  /** 摸到的3张牌 (待分配的) */
  drawn: Card[]
}

/** 太极: 张三丰打出闪后, 是否立即对攻击范围内角色出杀 + 选目标 (返回 cardId=出该杀; null=不发动) */
export interface TaiJiCtx {
  zhangSanFengId: string
  /** 攻击范围内可出杀的目标 */
  candidateIds: string[]
  /** 手牌中可作杀的牌 (含 闪/红桃牌等) */
  killableCards: Card[]
}

/** 词赋: 东方朔回合开始阶段判定后, 选分配 (黑: 给某角色; 红: 放牌堆顶/底) */
export interface CiFuCtx {
  dongFangSuoId: string
  /** 判定牌的副本 (实际处理时由引擎结算) */
  judgeCard: Card
  /** 黑色时: candidateIds=场上所有存活角色; 红色时: 固定 top/bottom 二选一 */
  candidateIds: string[]
  isBlack: boolean
}
