/**
 * 阶段 3 步骤 E: 主线程 ↔ Web Worker 通信协议.
 *
 * 引擎 (Game + EventBus + handler 实现入口) 全部挪进 Worker.
 * 主线程保留:
 *   - Zustand battleStore (UI state + handler 实现的业务逻辑)
 *   - EngineProxy (异步 API 包装 Worker postMessage)
 *
 * 通信分两类:
 *   - Worker → Main: event / handler-call / done / error
 *   - Main → Worker: start / action / handler-response / terminate
 *
 * 关键点: handler 在 Worker 内被 engine 调用 (engine await handler promise).
 * Worker 把 (handlerName + ctx) postMessage 给主线程, 主线程执行真正的 handler 实现
 * (因为 handler 需要操作 store state + 触发 UI prompt), 结果回 Worker resolve promise.
 *
 * EventBus 订阅: Worker 内 engine.eventBus.on(et, e => postMessage {kind:'event'}).
 * 主线程 EngineProxy 转发给自己的 EventEmitter, battleStore 订阅它.
 *
 * Game.getState() 等读取: Worker 在每个 event 顺带广播 snapshot (gameState/playerHand/
 * heroStates/derived), 主线程 setState 同步. 避免每次跨 Worker 同步调.
 */
import type {
  GameEvent, GameEventType, GameState, BattleResult, Card, EquipmentSlot, Role,
} from '@hero-legend/shared-types'
import type { DerivedSnapshot } from '@hero-legend/game-engine'
import type {
  PlayerActionCtx, JudgeActionCtx, ChaoTuoCtx, ResponseActionCtx, PinDianCtx, XiaDanPlayerCardCtx,
  FudiTargetCtx, FudiPickCtx, TanNangTargetCtx, TanNangPickCtx, JieDaoTargetCtx, JieDaoAttackTargetCtx,
  WuguPickCtx, MultiTargetCtx, DualCardCtx, LuYeQiangTargetCtx, LongLinPickCtx, BoLangChuiCtx,
  FaJiaPickCtx, YuRuYiCtx, DiscardPickCtx, BaWangMountCtx, QiangLueCtx, CiKeCtx, DieHunCtx,
  HouZhuCtx, TianXiangCtx, ManWuPickCardCtx, ManWuCtx, JueJiCtx, MenShenTargetCtx, SanBanFuCtx,
  ZhenShaCtx, JueBieCtx, BuDaoCtx, FuChouTriggerCtx, FuChouChooseCtx, FuChouPickCtx, DyingRescueCtx,
  SheShenCtx, SheShenTriggerCtx,
} from '@hero-legend/game-engine'
import type { HeroInstance } from '@hero-legend/shared-types'

// ---------- Handler 名字 (GameConfig 字段名去 Handler 后缀) ----------
export type HandlerName =
  | 'playerActionHandler'
  | 'judgeActionHandler'
  | 'chaoTuoHandler'
  | 'responseActionHandler'
  | 'pinDianHandler'
  | 'xiaDanPlayerCardHandler'
  | 'fudiTargetHandler'
  | 'fudiPickHandler'
  | 'tanNangTargetHandler'
  | 'tanNangPickHandler'
  | 'jieDaoTargetHandler'
  | 'jieDaoAttackTargetHandler'
  | 'wuguPickHandler'
  | 'multiTargetHandler'
  | 'dualCardHandler'
  | 'luYeQiangTargetHandler'
  | 'longLinPickHandler'
  | 'boLangChuiHandler'
  | 'faJiaPickHandler'
  | 'yuRuYiHandler'
  | 'discardPickHandler'
  | 'baWangMountHandler'
  | 'qiangLueHandler'
  | 'ciKeHandler'
  | 'dieHunHandler'
  | 'houZhuHandler'
  | 'tianXiangHandler'
  | 'manWuPickCardHandler'
  | 'manWuHandler'
  | 'jueJiHandler'
  | 'menShenTargetHandler'
  | 'sanBanFuHandler'
  | 'zhenShaHandler'
  | 'jueBieHandler'
  | 'buDaoHandler'
  | 'fuChouTriggerHandler'
  | 'fuChouChooseHandler'
  | 'fuChouPickHandler'
  | 'dyingRescueHandler'
  | 'sheShenTriggerHandler'
  | 'sheShenDistributeHandler'
  | 'awaitUIReady'

// ctx 联合类型 — Worker 接收 handler-call 时透传, 主线程按 name 分派到强类型实现
export type HandlerCtx =
  | PlayerActionCtx | JudgeActionCtx | ChaoTuoCtx | ResponseActionCtx | PinDianCtx | XiaDanPlayerCardCtx
  | FudiTargetCtx | FudiPickCtx | TanNangTargetCtx | TanNangPickCtx | JieDaoTargetCtx | JieDaoAttackTargetCtx
  | WuguPickCtx | MultiTargetCtx | DualCardCtx | LuYeQiangTargetCtx | LongLinPickCtx | BoLangChuiCtx
  | FaJiaPickCtx | YuRuYiCtx | DiscardPickCtx | BaWangMountCtx | QiangLueCtx | CiKeCtx | DieHunCtx
  | HouZhuCtx | TianXiangCtx | ManWuPickCardCtx | ManWuCtx | JueJiCtx | MenShenTargetCtx | SanBanFuCtx
  | ZhenShaCtx | JueBieCtx | BuDaoCtx | FuChouTriggerCtx | FuChouChooseCtx | FuChouPickCtx | DyingRescueCtx
  | SheShenCtx | SheShenTriggerCtx
  | undefined  // awaitUIReady 无 ctx

// ---------- 启动配置 (可序列化) ----------
export interface SerializedGameConfig {
  playerHeroId: string
  playerInstance: HeroInstance
  allyHeroIds: string[]
  allyInstances?: HeroInstance[]
  enemyHeroIds: string[]
  enemyInstances?: HeroInstance[]
}

// ---------- 主线程 → Worker ----------
export type MainMessage =
  | { kind: 'start'; config: SerializedGameConfig }
  | { kind: 'action'; id: number; name: EngineMethodName; args: EngineMethodArgsMap[EngineMethodName] }
  | { kind: 'handler-response'; id: number; result: unknown }
  | { kind: 'terminate' }

// engine 方法分派: 把所有主线程需要调的 engine method 名字 + 参数 + 返回类型列出来
// 注意: 原 engine API 收 Player 实例, Worker 内部按 playerId 重新 lookup.
export type EngineMethodName =
  | 'start'
  | 'playerPlayKill'
  | 'playerPlayKillMulti'
  | 'playerPlayJieDao'
  | 'playerPlayScheme'
  | 'playerPlayHeal'
  | 'playerEquipCard'
  | 'playerUseLuYeQiang'
  | 'playerLiaoShang'
  | 'playerZhiYu'
  | 'playerFengHuo'
  | 'playerJueJi'
  | 'playerXiaDan'
  | 'playerQiYi'
  | 'playerShiQuan'
  | 'playerYuRen'
  | 'playerHuiChunHeal'
  | 'resolveQiYiDecision'
  | 'activateAoJian'
  | 'deactivateAoJian'
  | 'isAoJianActive'
  | 'getMaxTargetsPerKill'
  | 'canPlayerUseAsKill'
  | 'runPendingWuguContinuation'

export interface EngineMethodArgsMap {
  start: []
  playerPlayKill: [playerId: string, targetId: string, cardId: string]
  playerPlayKillMulti: [playerId: string, cardId: string, targetIds: string[], maxTargetsOverride?: number]
  playerPlayJieDao: [playerId: string, cardId: string, holderId?: string]
  playerPlayScheme: [playerId: string, cardId: string, targetId?: string]
  playerPlayHeal: [playerId: string, cardId: string]
  playerEquipCard: [playerId: string, cardId: string]
  playerUseLuYeQiang: [playerId: string]
  playerLiaoShang: [playerId: string, cardId: string, targetId: string]
  playerZhiYu: [playerId: string, cardIds: string[], targetId: string]
  playerFengHuo: [playerId: string, cardId: string]
  playerJueJi: [playerId: string, weaponCardId: string | null, targetId?: string]
  playerXiaDan: [playerId: string, targetId: string]
  playerQiYi: [playerId: string, targetIds: string[], cardMap: Record<string, string>]
  playerShiQuan: [playerId: string, cardId: string]
  playerYuRen: [playerId: string, cardIds: string[]]
  playerHuiChunHeal: [playerId: string, cardId: string]
  resolveQiYiDecision: [decision: { useIt: boolean; targetIds?: string[]; cardMap?: Record<string, string> } | null]
  activateAoJian: [playerId: string]
  deactivateAoJian: [playerId: string]
  isAoJianActive: [playerId: string]
  getMaxTargetsPerKill: []
  canPlayerUseAsKill: [cardId: string]
  runPendingWuguContinuation: []
}

export interface EngineMethodReturnMap {
  start: BattleResult
  playerPlayKill: void
  playerPlayKillMulti: void
  playerPlayJieDao: void
  playerPlayScheme: void
  playerPlayHeal: void
  playerEquipCard: void
  playerUseLuYeQiang: void
  playerLiaoShang: void
  playerZhiYu: void
  playerFengHuo: void
  playerJueJi: void
  playerXiaDan: void
  playerQiYi: void
  playerShiQuan: void
  playerYuRen: void
  playerHuiChunHeal: void
  resolveQiYiDecision: void
  activateAoJian: void
  deactivateAoJian: void
  isAoJianActive: boolean
  getMaxTargetsPerKill: number
  canPlayerUseAsKill: boolean
  runPendingWuguContinuation: void
}

// ---------- Worker → 主线程 ----------
export interface HeroStateLite {
  id: string
  name: string
  role: Role
  currentHp: number
  maxHp: number
  isAlive: boolean
  handSize: number
  weaponName?: string
  skills: string[]       // skillId + treasureId list, 用于 hasSkillOrTreasure
}

/**
 * Worker 在每个 event 顺带广播的全量状态快照 (主线程 store 同步用).
 * 主线程 setState 后, store action / handler 实现内部从 store 读取这些字段.
 */
export interface WorkerSnapshot {
  gameState: GameState
  /** 玩家手牌 (Card[]). engine 每次状态变更 emit 后重算 */
  playerHand: Card[]
  /** 每个 hero 的装备区 (实际 Card | undefined). 玩家+敌方都用, 飞行卡动画/equippedCards 同步 */
  equippedCardsByHero: Record<string, Partial<Record<EquipmentSlot, Card>>>
  /** hero 基础状态 (hp/role/alive/handSize/weapon/skills) */
  heroStates: Record<string, HeroStateLite>
  /** 引擎 derived snapshot */
  derived: DerivedSnapshot
  /** 玩家 hero id (持久, 用于 store.getPlayer) */
  playerId: string
  /** 名字缓存 (eventToLog 用) */
  heroNames: Record<string, string>
  /** 每个 hero 实际手牌 Card[] (handler 实现 manWu/tianXiang 等需要按花色过滤) */
  handsByHero: Record<string, Card[]>
  /** 玩家是否激活 aoJian (与 derived.aoJianActive 重复, 但保留以便 store 同步) */
  aoJianActive: boolean
  /** 玩家是否可出杀 (替代 game.canPlayKill) */
  canPlayKill: boolean
  /** jueJi 已用次数 (替代 SkillBar 引擎读取) */
  jueJiUsedCount: number
  /** 侠胆: 当前每张杀最多目标数 (默认1, 侠胆胜出=2). engine.getMaxTargetsPerKill() */
  xiaDanMultiTargetPerKill: number
  /** 玩家是否激活侠胆多目标状态 (即 getMaxTargetsPerKill > 1) — 用于 playKill 路径分派 */
  xiaDanMultiTargetActive: boolean
}

export type WorkerMessage =
  | { kind: 'event'; event: GameEvent; snapshot: WorkerSnapshot }
  | { kind: 'handler-call'; id: number; name: HandlerName; ctx: HandlerCtx }
  | { kind: 'done'; result: BattleResult; snapshot: WorkerSnapshot }
  | { kind: 'error'; message: string; stack?: string }
  | { kind: 'action-done'; id: number; result: unknown }
  | { kind: 'action-error'; id: number; message: string; stack?: string }

export const ALL_EVENT_TYPES: GameEventType[] = [
  'game:start', 'game:end', 'turn:start', 'turn:end',
  'phase:start', 'phase:end', 'card:play', 'card:draw', 'card:discard', 'card:gain',
  'damage:deal', 'damage:receive', 'damage:prevent', 'heal', 'dying', 'die',
  'skill:trigger', 'skill:resolve', 'judge', 'equipment:equip', 'equipment:unequip',
  'scheme:nullify', 'wugu:reveal', 'wugu:pickStart',
]
