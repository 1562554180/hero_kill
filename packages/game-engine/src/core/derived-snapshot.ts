/**
 * DerivedSnapshot: 引擎在状态变更 emit 时附带的可序列化派生数据快照.
 *
 * 阶段 3 步骤 B: 主线程子组件不再在 render 期同步调 game.xxx() 读 engine 状态,
 * 改为通过 useShallow 读 battleStore.derived 字段. 引擎在影响派生数据的关键 emit 点
 * 重新计算 derived 并附带在 event.data.derived 上广播.
 *
 * 设计原则:
 * - 所有字段必须可序列化 (string/number/boolean/数组/Record), 不能含 Game/Player/Card 实例.
 * - 字段名尽量贴合子组件原本调用的 engine 方法语义.
 * - 仅在状态真正影响派生数据时才重算, 不必每个 emit 都附带 (由 Game.computeDerived 决定).
 *
 * 字段来源映射 (子组件 render 期 engine 调用 → derived 字段):
 * - BattleField.isValidTarget(heroId)         → validKillTargetIds / validTanNangTargetIds /
 *                                               validSchemeTargetIds (按 pending scheme) /
 *                                               validJieDaoHolderIds / validJieDaoAttackTargetIds /
 *                                               validFudiTargetIds / validJueJiTargetIds
 * - PlayerHand.hasValidSchemeTarget(cardName) → hasTanNangTarget / hasFudiTarget / hasJieDaoHolder
 * - PlayerHand.hasLeiInJudge / SkillBar       → hasLeiInJudge
 * - PlayerHeroCard / SkillBar                 → canPlayKill / aoJianActive
 * - SkillBar.jueJiUsedThisTurn                → jueJiUsedCount
 * - SkillBar.playerHasEquip (烽火 disabled)   → playerHasEquipment
 */
import type { Card } from '@hero-legend/shared-types'

export interface DerivedSnapshot {
  /** 玩家本回合是否还可出杀 (受回合/侠胆负/天狼虎符/已用次数限制) */
  canPlayKill: boolean
  /** 玩家傲剑主动模式是否激活 (派生自 activeSkillId, 兼容旧 UI 高亮判定) */
  aoJianActive: boolean
  /** 玩家神偷主动模式是否激活 (派生自 activeSkillId, 兼容旧 UI 高亮判定) */
  shenTouActive: boolean
  /** 玩家当前激活的可激活技能 id (互斥, 同时只有一个); null = 无激活. UI 通用高亮判定优先用此字段 */
  activeSkillId: string | null
  /** 玩家是否在判定区有"手捧雷" (SkillBar/PlayerHand hasLeiInJudge) */
  hasLeiInJudge: boolean
  /** 玩家本回合"绝击"已用次数 (SkillBar 烽火/绝击 disabled) */
  jueJiUsedCount: number
  /** 玩家任意装备区是否有牌 (SkillBar 烽火按钮 disabled) */
  playerHasEquipment: boolean

  /**
   * 当前 pending 选目标的合法目标 id 集合 (合并 kill/scheme/treasure 各情况).
   * 仅在玩家正在选目标 (store.phase === 'playing' && pendingCardId 不空, 或 phase==='selectTarget' 等)
   * 时有意义; 引擎在每次状态变更后重算并广播, 子组件读时只需关心自己 phase.
   *
   * 注: 当前 pending 状态由 web store 维护 (pendingCardId/pendingCardType/phase),
   *     引擎无法直接知道. 所以 derived 这里给的是基础事实:
   *     - validKillTargetIds: 玩家当前可杀目标 (在攻击范围内 + 存活)
   *     - validTanNangTargetIds: 玩家探囊取物可指定目标
   *     - validFudiTargetIds: 玩家釜底抽薪可指定目标 (有牌可弃者)
   *     - validJueJiTargetIds: 玩家绝击可指定目标 (在攻击范围内)
   *     - hasJieDaoHolder: 是否存在持有武器的非玩家角色 (借刀杀人 step1 是否有合法目标)
   * 子组件根据当前 store.phase + pendingCardType 自行决定读哪个集合.
   */
  /** 玩家出杀的合法目标 id (在攻击范围内且存活) */
  validKillTargetIds: string[]
  /** 玩家"探囊取物"的合法目标 id (在范围 + 有牌可取 + 非控局免疫) */
  validTanNangTargetIds: string[]
  /** 玩家"釜底抽薪"的合法目标 id (有手牌/装备/判定牌任一) */
  validFudiTargetIds: string[]
  /** 玩家"绝击"宝具的合法目标 id (在攻击范围内) */
  validJueJiTargetIds: string[]
  /** 是否存在持有武器的非玩家角色 (借刀杀人 step1 整体合法性) */
  hasJieDaoHolder: boolean
  /**
   * 通用锦囊合法目标 (按手牌中每张 scheme cardId 预算): 含 canBeSchemeTarget (洞察黑桃判定)
   * + isKongJuImmuneTo(控局免疫) 过滤后的目标集合.
   * 子组件拿到 pendingSchemeCard.id 后, 查 validSchemeTargetIdsByCardId[cardId].includes(heroId).
   * 探囊取物/釜底抽薪/借刀杀人 不在此处 (它们有专用集合/走 jieDaoHolders store 字段).
   * 仅遍历玩家手牌, 开销 O(handSize * players).
   */
  validSchemeTargetIdsByCardId: Record<string, string[]>

  /**
   * 阶段 3 步骤 D: 以下字段用于子组件 render 期替代直接调 game/player 实例方法.
   */
  /** 玩家手牌中所有"可当杀使用"的 cardId (含杀本身 + 红色牌[傲剑] + 装备[傲剑] + 拼点[武穆] 等).
   *  用于补刀 buDaoKill 阶段判定手牌是否可当杀出 (替代 game.canPlayerUseAsKill). */
  validKillCardIds: string[]
  /** 每个角色判定区状态: hasThunder=有手捧雷, hasImprisoned=有画地为牢, hasMenShenProtection=被门神保护中 (HeroBattleCard 右上角标记用). */
  heroJudgeStatus: Record<string, { hasThunder: boolean; hasImprisoned: boolean; hasMenShenProtection: boolean }>
  /** 每个非玩家角色的手牌 (DEBUG_SHOW_AI_HAND 用, 生产环境可忽略). 玩家本身不在 map 里. */
  enemyHandsByHeroId: Record<string, Card[]>
}
