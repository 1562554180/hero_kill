import { create } from 'zustand'
import { type GameConfig, type DerivedSnapshot } from '@hero-legend/game-engine'
import type {
  PlayerActionCtx, JudgeActionCtx, ChaoTuoCtx, ResponseActionCtx, XiaDanPlayerCardCtx,
  FudiTargetCtx, FudiPickCtx, TanNangTargetCtx, TanNangPickCtx, JieDaoTargetCtx, JieDaoAttackTargetCtx,
  WuguPickCtx, MultiTargetCtx, DualCardCtx, LuYeQiangTargetCtx, LongLinPickCtx, BoLangChuiCtx,
  FaJiaPickCtx, YuRuYiCtx, DiscardPickCtx, BaWangMountCtx, CiKeCtx, DieHunCtx,
  HouZhuCtx, TianXiangCtx, ManWuPickCardCtx, ManWuCtx, JueJiCtx, MenShenTargetCtx, SanBanFuCtx,
  ZhenShaCtx, JueBieCtx, BuDaoCtx, FuChouTriggerCtx, FuChouChooseCtx, FuChouPickCtx, DyingRescueCtx,
  SheShenCtx, SheShenTriggerCtx
} from '@hero-legend/game-engine'
import type { GameState, BattleResult, Card, GameEvent, GameEventType, HeroInstance, EquipmentSlot } from '@hero-legend/shared-types'
import type { FlyingCard, FlyingStage } from '../components/FlyingCard'
import { useAnimationStore } from './animationStore'
import type { DirectionalLine, DamageFloater } from './animationStore'
import { EngineProxy } from '../workers/engineProxy.js'
import { ALL_EVENT_TYPES as WORKER_EVENT_TYPES } from '../workers/protocol.js'
import type { WorkerSnapshot, HandlerCtx, HandlerName, HeroStateLite } from '../workers/protocol.js'
// 重导出类型, 保持向后兼容 (overlay 之前从 battleStore 导入)
export type { DirectionalLine, DamageFloater } from './animationStore'

/**
 * 阶段 3 步骤 E: engine 已挪进 Web Worker. gameRef 改为持有 EngineProxy.
 * store action / handler 实现通过 proxy 调 engine 方法 (异步),
 * 或读 store snapshot (gameState/playerHand/derived) 同步.
 */
let engineProxy: EngineProxy | null = null

// 最近一次 Worker snapshot (handler 实现内部读它替代 game 实例)
let latestSnapshot: WorkerSnapshot | null = null

function getHeroName(id: string): string {
  return latestSnapshot?.heroNames[id] ?? id
}

function getHeroState(id: string): HeroStateLite | undefined {
  return latestSnapshot?.heroStates[id]
}

function getHeroHand(id: string): Card[] {
  return latestSnapshot?.handsByHero[id] ?? []
}

function getEquippedCard(heroId: string, slot: EquipmentSlot): Card | undefined {
  return latestSnapshot?.equippedCardsByHero[heroId]?.[slot]
}

function heroHasSkill(heroId: string, skillId: string): boolean {
  const skills = getHeroState(heroId)?.skills
  if (!skills) return false
  return skills.includes(skillId) || skills.includes(`treasure-${skillId}`)
}

// ============================================================
// Game / Player proxy shims — 让旧代码不改动, 内部转发到 EngineProxy
// ============================================================

class PlayerProxy {
  constructor(public readonly id: string) {}
  getId(): string { return this.id }
  getName(): string { return getHeroName(this.id) }
  getRole(): HeroStateLite['role'] { return getHeroState(this.id)?.role ?? 'enemy' }
  getCurrentHp(): number { return getHeroState(this.id)?.currentHp ?? 0 }
  getMaxHp(): number { return getHeroState(this.id)?.maxHp ?? 0 }
  isAlive(): boolean { return !!getHeroState(this.id)?.isAlive }
  getHandSize(): number { return getHeroState(this.id)?.handSize ?? 0 }
  getHand(): Card[] { return getHeroHand(this.id) }
  getWeaponName(): string | undefined { return getHeroState(this.id)?.weaponName }
  getEquippedCard(slot: EquipmentSlot): Card | undefined { return getEquippedCard(this.id, slot) }
  hasSkillOrTreasure(skillId: string): boolean { return heroHasSkill(this.id, skillId) }
}

class GameProxy {
  get players(): PlayerProxy[] {
    const snap = latestSnapshot
    if (!snap) return []
    return Object.keys(snap.heroStates).map(id => new PlayerProxy(id))
  }
  get canPlayKill(): boolean { return !!latestSnapshot?.canPlayKill }
  get pendingWuguContinuation(): (() => Promise<void>) | null {
    // 主线程不再持 engine state — 五谷丰登延续在 Worker 内, 由 playerPlayScheme 完成时自动触发.
    // 这里返回 null, 原 playerActionHandler 里的 `if (game.pendingWuguContinuation) await game.pendingWuguContinuation()`
    // 改由 playerPlayScheme 在 Worker 内自动调用.
    return null
  }
  getPlayer(): PlayerProxy | undefined {
    const pid = latestSnapshot?.playerId
    return pid ? new PlayerProxy(pid) : undefined
  }
  getPlayerById(id: string): PlayerProxy | undefined {
    if (!getHeroState(id)) return undefined
    return new PlayerProxy(id)
  }
  getState(): GameState | null { return latestSnapshot?.gameState ?? null }
  isAoJianActive(playerId: string): boolean {
    return !!latestSnapshot && playerId === latestSnapshot.playerId ? latestSnapshot.aoJianActive : false
  }
  getMaxTargetsPerKill(): number {
    return latestSnapshot?.xiaDanMultiTargetPerKill ?? 1
  }
  canPlayerUseAsKill(cardId: string): boolean {
    return latestSnapshot?.derived.validKillCardIds.includes(cardId) ?? false
  }
  collectEquipmentCards(_target: PlayerProxy): Card[] {
    // 天香: 收集玩家所有装备牌
    const pid = latestSnapshot?.playerId
    if (!pid) return []
    const eq = latestSnapshot?.equippedCardsByHero[pid]
    if (!eq) return []
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
    const out: Card[] = []
    for (const s of slots) {
      const c = eq[s]
      if (c) out.push(c)
    }
    return out
  }
  getQiYiCandidates(_player: PlayerProxy): PlayerProxy[] {
    // 起义候选: 所有非玩家有手牌的英雄
    const snap = latestSnapshot
    if (!snap) return []
    return Object.values(snap.heroStates)
      .filter(h => h.id !== snap.playerId && h.isAlive && h.handSize > 0)
      .map(h => new PlayerProxy(h.id))
  }
  activateAoJian(playerId: string): void { void engineProxy?.action('activateAoJian', playerId) }
  deactivateAoJian(playerId: string): void { void engineProxy?.action('deactivateAoJian', playerId) }
  resolveQiYiDecision(decision: { useIt: boolean; targetIds?: string[]; cardMap?: Record<string, string> } | null): void {
    void engineProxy?.action('resolveQiYiDecision', decision)
  }
  playerPlayKill(_p: PlayerProxy, targetId: string, cardId: string): Promise<void> {
    return engineProxy?.action('playerPlayKill', _p.id, targetId, cardId) ?? Promise.resolve()
  }
  playerPlayKillMulti(_p: PlayerProxy, cardId: string, targetIds: string[], maxOverride?: number): Promise<void> {
    return engineProxy?.action('playerPlayKillMulti', _p.id, cardId, targetIds, maxOverride) ?? Promise.resolve()
  }
  playerPlayJieDao(_p: PlayerProxy, cardId: string, holderId?: string): Promise<void> {
    return engineProxy?.action('playerPlayJieDao', _p.id, cardId, holderId) ?? Promise.resolve()
  }
  playerPlayScheme(_p: PlayerProxy, cardId: string, targetId?: string): Promise<void> {
    return engineProxy?.action('playerPlayScheme', _p.id, cardId, targetId) ?? Promise.resolve()
  }
  playerPlayHeal(_p: PlayerProxy, cardId: string): void {
    void engineProxy?.action('playerPlayHeal', _p.id, cardId)
  }
  playerEquipCard(_p: PlayerProxy, cardId: string): void {
    void engineProxy?.action('playerEquipCard', _p.id, cardId)
  }
  playerUseLuYeQiang(_p: PlayerProxy): Promise<void> {
    return engineProxy?.action('playerUseLuYeQiang', _p.id) ?? Promise.resolve()
  }
  playerLiaoShang(_p: PlayerProxy, cardId: string, targetId: string): void {
    void engineProxy?.action('playerLiaoShang', _p.id, cardId, targetId)
  }
  playerZhiYu(_p: PlayerProxy, cardIds: string[], targetId: string): void {
    void engineProxy?.action('playerZhiYu', _p.id, cardIds, targetId)
  }
  async playerFengHuo(_p: PlayerProxy, cardId: string): Promise<void> {
    await engineProxy?.action('playerFengHuo', _p.id, cardId)
  }
  async playerJueJi(_p: PlayerProxy, weaponCardId: string | null, targetId?: string): Promise<void> {
    await engineProxy?.action('playerJueJi', _p.id, weaponCardId, targetId)
  }
  async playerXiaDan(_p: PlayerProxy, targetId: string): Promise<void> {
    await engineProxy?.action('playerXiaDan', _p.id, targetId)
  }
  playerQiYi(_p: PlayerProxy, targetIds: string[], cardMap: Record<string, string>): void {
    void engineProxy?.action('playerQiYi', _p.id, targetIds, cardMap)
  }
  async playerShiQuan(_p: PlayerProxy, cardId: string): Promise<void> {
    await engineProxy?.action('playerShiQuan', _p.id, cardId)
  }
  playerYuRen(_p: PlayerProxy, cardIds: string[]): void {
    void engineProxy?.action('playerYuRen', _p.id, cardIds)
  }
  playerHuiChunHeal(_p: PlayerProxy, cardId: string): void {
    void engineProxy?.action('playerHuiChunHeal', _p.id, cardId)
  }
}

// gameRef 类型 — 旧代码用的 Game 类型, 这里改成 union (GameProxy 形态兼容)
// 用 let gameRef: GameProxy | null 直接替换
let gameRef: GameProxy | null = null

export type BattlePhase = 'idle' | 'playing' | 'selectTarget' | 'waiting' | 'ended' | 'judgeReplace' | 'awaitingResponse' | 'selectMultiTargets' | 'selectKillMultiTargets' | 'selectDualCards' | 'selectLuYeQiangTarget' | 'longLinDisarm' | 'selectJieDaoHolder' | 'selectJieDaoTarget' | 'selectTanNangTarget' | 'selectTanNangCard' | 'selectWugu' | 'selectFudiTarget' | 'selectFudiCard' | 'selectFaJiaCard' | 'treasureSkill' | 'treasureSelectCard' | 'treasureSelect2Cards' | 'treasureSelectTarget' | 'treasureSelectTargets' | 'treasureSelectEquipment' | 'treasureSelectWeapon' | 'treasureSelectQiYiCards' | 'xiaDanPickCard' | 'selectDiscardCards' | 'selectBaWangMount' | 'tianXiang' | 'menShenTarget' | 'jueBieTarget' | 'buDaoKill' | 'sanBanFuConfirm' | 'selectFuChouDiscard' | 'dyingRescue' | 'chaoTuoPick' | 'houZhuTarget' | 'qiYiPrompt' | 'sheShenTrigger' | 'sheShenDistribute'

interface BattleState {
  gameState: GameState | null
  phase: BattlePhase
  playerHand: Card[]
  actionLog: string[]
  result: BattleResult | null
  pendingCardId: string | null
  pendingCardType: 'kill' | 'scheme' | 'schemeSelf' | 'heal' | 'equip' | null
  pendingCardFromPos: { x: number; y: number } | null  // 玩家点牌时手牌位置, 飞行卡起点用
  selectedTargetId: string | null  // pending 状态下选中的目标 (仅高亮, 不立即出牌)
  aoJianActive: boolean
  /** 引擎派生快照 (阶段 3 步骤 B): 由 event.data.derived merge, 子组件 render 期读它替代调 game.xxx() */
  derived: DerivedSnapshot | null
  responsePrompt: string | null  // 例如 '决斗: 请打出【杀】或放弃'
  responseType: 'kill' | 'nullify' | 'dodge' | null  // 响应阶段需要的牌型, 用于精确加阴影
  equippedCards: Record<string, Partial<Record<EquipmentSlot, Card>>>  // heroId -> slot -> card
  // 狼牙棒多目标
  multiTargetCandidates: { id: string; name: string; currentHp: number; maxHp: number }[]
  selectedTargets: string[]
  // 侠胆多杀(每张杀最多2目标)
  killMultiCardId: string | null
  killMultiMax: number    // 每张杀最大目标数
  killMultiRemaining: number  // 本次侠胆还剩几次出杀
  // 芦叶枪选2张手牌
  selectedDualCards: string[]
  // 芦叶枪选杀的目标
  luYeQiangCandidates: { id: string; name: string; currentHp: number; maxHp: number }[]
  luYeQiangKillCardId: string | null  // 第一张作为杀的牌ID
  // 龙鳞刀: 选对方牌弃掉
  longLinTargetInfo: { id: string; name: string; hand: Card[]; judge: Card[]; equipment: Card[] } | null
  longLinSelectedCards: string[]
  // 借刀杀人: 选武器持有者
  jieDaoHolders: { id: string; name: string }[]
  // 借刀杀人: 选攻击目标
  jieDaoCandidates: { id: string; name: string; currentHp: number; maxHp: number }[]
  // 探囊取物: 合法目标列表 (用于UI高亮/置暗)
  tanNangCandidates: { id: string; name: string }[]
  // 探囊取物: 选目标后展示其手牌/判定/装备
  tanNangTargetInfo: { id: string; name: string; hand: Card[]; judge: Card[]; equipment: Card[] } | null
  // 五谷丰登: 翻开的候选牌池
  wuguCandidates: Card[] | null
  // 五谷丰登: 每个角色的选牌结果 (含玩家自己和后续 AI), 全部完成时关闭弹框
  wuguPicks: { heroId: string; heroName: string; cardId: string }[]
  wuguTotalPickers: number  // 总参与人数, 用于判断是否全部选完
  // 釜底抽薪: 选目标后展示其手牌/判定/装备
  fudiTargetInfo: { id: string; name: string; hand: Card[]; judge: Card[]; equipment: Card[] } | null
  // 主印技能流程
  treasureSkill: 'liao-shang' | 'zhi-yu' | 'feng-huo' | 'jue-ji' | 'qi-yi' | 'xia-dan' | 'yu-ren' | 'shi-quan' | null
  treasurePrompt: string
  treasureCardIds: string[]         // 累计已选的卡牌 (用于治愈/绝击)
  treasureTargetIds: string[]       // 累计已选的目标 (用于起义)
  // 起义: targetId → 要拿的牌ID 映射 (没选则随机)
  qiYiCardMap: Record<string, string>
  // 起义 (摸牌前提示): 候选目标列表
  qiYiDecision: { candidates: { id: string; name: string; handSize: number; hand: Card[] }[] } | null
  // 起义 (摸牌前提示): 当前 UI 步骤
  qiYiStep: 'confirm' | 'pickTargets' | 'pickCards' | null
  // 侠胆拼点: 目标已选牌后, 玩家自己选牌的状态
  xiaDanOpponentCard: Card | null
  xiaDanTargetName: string | null

  resolveAction: ((action: string | null) => void) | null
  resolveResponse: ((cardId: string | null) => void) | null
  resolveJudge: ((cardId: string | null) => void) | null
  resolveLongLin: ((cardIds: string[] | null) => void) | null
  resolveMultiTarget: ((targetIds: string[]) => void) | null
  resolveDualCard: ((cardIds: string[]) => void) | null
  resolveLuYeQiangTarget: ((targetId: string | null) => void) | null
  resolveJieDaoHolder: ((holderId: string | null) => void) | null
  resolveJieDaoTarget: ((targetId: string | null) => void) | null
  resolveTanNangTarget: ((targetId: string | null) => void) | null
  resolveTanNangPick: ((cardId: string | null) => void) | null
  resolveWuguPick: ((cardId: string | null) => void) | null
  resolveFudiTarget: ((targetId: string | null) => void) | null
  resolveFudiPick: ((cardId: string | null) => void) | null
  // 法家: 从伤害来源选一张牌
  faJiaTargetInfo: { id: string; name: string; hand: Card[]; judge: Card[]; equipment: Card[] } | null
  resolveFaJiaPick: ((cardId: string | null) => void) | null
  resolveXiaDanCard: ((cardId: string | null) => void) | null
  // 弃牌阶段: 选择要弃的牌
  selectedDiscardCards: string[]
  discardCount: number
  resolveDiscard: ((cardIds: string[]) => void) | null
  // 霸王弓: 选择拆哪匹马
  baWangOptions: { attackMount: Card | null; defenseMount: Card | null } | null
  resolveBaWangMount: ((mountSlot: 'attackMount' | 'defenseMount' | null) => void) | null
  // 刺客: 出杀后是否发动 (玩家专用)
  ciKePrompt: { defenderId: string; defenderName: string } | null
  resolveCiKe: ((use: boolean) => void) | null
  // 玉如意/国色: 受到攻击时是否发动判定
  yuRuYiPrompt: { attackType: string; attackName: string } | null
  resolveYuRuYi: ((use: boolean) => void) | null
  // 蝶魂: 群体锦囊目标是否发动 (玩家专用)
  dieHunPrompt: { schemeName: string } | null
  resolveDieHun: ((use: boolean) => void) | null
  // 曼舞: 受伤时转移伤害
  manWuPrompt: { attackerName: string; damage: number; candidates: { id: string; name: string }[] } | null
  manWuRedHeartCards: Card[]  // 可选的红桃手牌
  manWuSelectedCardId: string | null  // 已选的红桃牌ID
  resolveManWuPickCard: ((cardId: string | null) => void) | null  // 等待选牌阶段
  resolveManWu: ((targetId: string | null) => void) | null
  // 天香: 判定前是否弃1张手牌或装备免判
  tianXiangJudgeCard: { name: string; suit: string; number: number } | null
  tianXiangEquipment: Card[]
  resolveTianXiang: ((cardId: string | null) => void) | null
  // 门神: 秦琼回合结束选择保护目标
  menShenCandidates: { id: string; name: string; currentHp: number; maxHp: number }[]
  resolveMenShenTarget: ((targetId: string | null) => void) | null
  // 诀别: 虞姬濒死选择男性
  jueBieCandidates: { id: string; name: string; currentHp: number; maxHp: number }[]
  resolveJueBieTarget: ((targetId: string | null) => void) | null
  // 鸩杀: 吕雉被询问是否对濒死目标使用【药】
  zhenShaPrompt: { targetName: string } | null
  resolveZhenSha: ((use: boolean) => void) | null
  // 补刀: 关羽对受害角色出杀
  buDaoPrompt: { victimId: string; victimName: string } | null
  resolveBuDao: ((cardId: string | null) => void) | null
  // 三板斧: 程咬金出杀时确认
  sanBanFuPrompt: { targetName: string } | null
  resolveSanBanFu: ((use: boolean) => void) | null
  // 复仇: 受伤后是否发动判定 (玩家专用)
  fuChouTriggerPrompt: { attackerName: string } | null
  resolveFuChouTrigger: ((use: boolean) => void) | null
  // 复仇: 来源(玩家)选 弃2张手牌 / 掉1血
  fuChouChoosePrompt: { attackerId: string; attackerName: string; handCount: number } | null
  resolveFuChouChoose: ((choice: 'discard' | 'damage') => void) | null
  // 复仇: 来源(玩家)选弃哪2张手牌 (直接从手牌点击, 无独立弹框)
  fuChouPickSelected: string[]
  resolveFuChouPick: ((cardIds: string[]) => void) | null
  // 濒死救援: 玩家被问是否用药救濒死目标
  dyingRescuePrompt: { saviorId: string; saviorName: string; targetId: string; targetName: string; yaoHandCards: Card[] } | null
  dyingRescueSelected: string[]
  resolveDyingRescue: ((cardIds: string[] | null) => void) | null
  // 舍身: 受伤后是否发动 (玩家确认)
  sheShenTriggerPrompt: { damage: number; drawCount: number } | null
  resolveSheShenTrigger: ((use: boolean) => void) | null
  // 舍身: 分配 UI — 玩家点牌再点目标角色, 全部分完点确认
  sheShenPrompt: { cards: Card[]; candidates: { id: string; name: string }[] } | null
  sheShenSelectedCardIds: string[]  // 多选待分配的牌
  sheShenDistribution: Record<string, string[]>  // { [heroId]: cardId[] }
  resolveSheShen: ((distribution: Record<string, string[]> | null) => void) | null
  // 超脱: 李煜判定时用黑色手牌或装备替换
  chaoTuoPrompt: { judgeCardName: string; blackHandIds: string[]; blackEquipment: Array<{ cardId: string; slot: string; name: string }> } | null
  resolveChaoTuo: ((cardId: string | null) => void) | null
  // 后主: 李煜用闪后选目标令其判定
  houZhuPrompt: { candidates: Array<{ id: string; name: string; currentHp: number; maxHp: number }> } | null
  resolveHouZhu: ((targetId: string | null) => void) | null
  judgeCard: Card | null
  // 最近一次判定结果 (含来源名/牌名, 供中央显示; 显示2.5秒后自动清空)
  lastJudgeResult: { judgeHeroName: string; judgeCardName: string; resultCard: { suit: string; number: number; name: string } } | null

  startBattle: (config: GameConfig) => Promise<BattleResult>
  /** 阶段 3 步骤 E: 释放 Worker (战斗页卸载 / 切换关卡时调, 防 Worker 泄漏) */
  cleanupBattle: () => void
  playKill: (cardId: string, fromPos?: { x: number; y: number }) => void
  playScheme: (cardId: string, fromPos?: { x: number; y: number }) => void
  playSchemeSelf: (cardId: string, fromPos?: { x: number; y: number }) => void
  confirmTarget: (targetId: string) => void
  confirmPlay: () => void
  cancelPlay: () => void
  playHeal: (cardId: string, fromPos?: { x: number; y: number }) => void
  equipCard: (cardId: string, fromPos?: { x: number; y: number }) => void
  endPlayPhase: () => void
  cancelSelection: () => void
  judgeReplace: (cardId: string | null) => void
  toggleAoJian: () => void
  respondWithCard: (cardId: string | null) => void
  // 狼牙棒多目标
  toggleTarget: (targetId: string) => void
  confirmMultiTarget: () => void
  cancelMultiTarget: () => void
  // 侠胆多杀
  toggleKillMultiTarget: (targetId: string) => void
  confirmKillMultiTarget: () => void
  cancelKillMultiTarget: () => void
  // 芦叶枪选2张手牌
  toggleDualCard: (cardId: string) => void
  confirmDualCards: () => void
  cancelDualCards: () => void
  selectLuYeQiangTarget: (targetId: string) => void
  cancelLuYeQiangTarget: () => void
  // 龙鳞刀
  toggleLongLinCard: (cardId: string) => void
  confirmLongLinPick: () => void
  cancelLongLinPick: () => void
  // 借刀杀人
  selectJieDaoHolder: (holderId: string) => void
  cancelJieDaoHolder: () => void
  selectJieDaoTarget: (targetId: string) => void
  cancelJieDaoTarget: () => void
  // 探囊取物
  selectTanNangTarget: (targetId: string) => void
  cancelTanNangTarget: () => void
  selectTanNangCard: (cardId: string | null) => void
  cancelTanNangCard: () => void
  // 五谷丰登
  selectWuguCard: (cardId: string) => void
  cancelWuguPick: () => void
  // 釜底抽薪
  selectFudiTarget: (targetId: string) => void
  cancelFudiTarget: () => void
  selectFudiCard: (cardId: string | null) => void
  cancelFudiCard: () => void
  // 法家
  selectFaJiaCard: (cardId: string | null) => void
  cancelFaJiaCard: () => void
  // 宝具技能
  useTreasureSkill: (skill: 'liao-shang' | 'zhi-yu' | 'feng-huo' | 'jue-ji' | 'qi-yi' | 'xia-dan' | 'yu-ren' | 'shi-quan') => void
  pickTreasureCard: (cardId: string) => Promise<void> | void
  pickTreasureTarget: (targetId: string) => void
  confirmTreasureTargets: () => void
  pickQiYiCard: (targetId: string, cardId: string) => void
  confirmQiYiCards: () => void
  // 起义 (摸牌前提示)
  pickQiYiDecisionTarget: (targetId: string) => void
  pickQiYiDecisionCard: (targetId: string, cardId: string) => void
  confirmQiYiDecision: () => void
  cancelQiYiDecision: () => void
  cancelTreasureSkill: () => void
  // 侠胆: 玩家选自己拼点的牌
  pickXiaDanCard: (cardId: string) => void
  cancelXiaDanCard: () => void
  // 侠胆: 已激活(待选目标), 无浮层, 按钮高亮
  xiaDanActive: boolean
  cancelXiaDan: () => void
  // 侠胆: 本回合已使用过(成功后置true, 下回合重置)
  xiaDanUsedThisTurn: boolean
  // 驭人: 累计已选的弃牌
  yuRenCardIds: string[]
  // 驭人: 本回合已使用过(成功后置true, 下回合重置)
  yuRenUsedThisTurn: boolean
  // 弃牌阶段: 选择要弃的手牌
  toggleDiscardCard: (cardId: string) => void
  confirmDiscardCards: () => void
  cancelDiscardCards: () => void
  // 霸王弓: 选择拆哪匹马
  selectBaWangMount: (mountSlot: 'attackMount' | 'defenseMount') => void
  // 刺客
  confirmCiKe: () => void
  cancelCiKe: () => void
  // 玉如意
  confirmYuRuYi: () => void
  cancelYuRuYi: () => void
  // 蝶魂
  confirmDieHun: () => void
  cancelDieHun: () => void
  // 曼舞: 选择红桃/黑桃手牌
  selectManWuCard: (cardId: string | null) => void
  // 曼舞: 确认选中的弃牌
  confirmManWuCard: () => void
  // 曼舞: 选择转移目标
  selectManWuTarget: (targetId: string) => void
  cancelManWu: () => void
  // 天香
  selectTianXiangCard: (cardId: string | null) => void
  // 驭人: 确认弃牌
  confirmYuRenCards: () => void
  /** 绝击: 子组件点击武器/手牌/受1血触发, 由 store 内部调 game.playerJueJi (子组件无 game 引用) */
  playerJueJiSelf: (weaponCardId: string | null) => void
  // 门神
  selectMenShenTarget: (targetId: string) => void
  cancelMenShenTarget: () => void
  // 诀别
  selectJueBieTarget: (targetId: string) => void
  cancelJueBieTarget: () => void
  // 鸩杀
  confirmZhenSha: () => void
  cancelZhenSha: () => void
  // 补刀
  selectBuDaoCard: (cardId: string | null) => void
  // 三板斧
  confirmSanBanFu: () => void
  cancelSanBanFu: () => void
  // 复仇
  confirmFuChouTrigger: () => void
  cancelFuChouTrigger: () => void
  confirmFuChouChoose: (choice: 'discard' | 'damage') => void
  toggleFuChouPick: (cardId: string) => void
  confirmFuChouPick: () => void
  // 濒死救援
  toggleDyingRescueCard: (cardId: string) => void
  confirmDyingRescue: () => void
  cancelDyingRescue: () => void
  // 舍身: 是否发动 / 选分配牌 / 选接收目标 / 撤销 / 完成
  confirmSheShenTrigger: (use: boolean) => void
  toggleSheShenCard: (cardId: string) => void
  assignSheShenCard: (heroId: string) => void
  unassignSheShenCard: (heroId: string, cardId: string) => void
  finishSheShen: () => void
  // 超脱: 选牌 / 取消
  selectChaoTuoCard: (cardId: string | null) => void
  // 后主: 选目标 / 取消
  selectHouZhuTarget: (targetId: string | null) => void
  // 回春: 回合外用红桃手牌/装备当药
  huiChunHeal: (cardId: string) => void
  // 卡牌飞行动画队列 (渲染层用)
  flyingCards: FlyingCard[]
  // 内部辅助: 入队一张飞行卡
  _queueFlyingCard: (req: { card: Card; sourceType: 'hand' | 'equipment'; sourceRef?: string; targetType: 'discard' | 'equipment' | 'hand'; targetHeroId?: string; targetSlot?: EquipmentSlot; fromHeroId?: string; fromPos?: { x: number; y: number }; onComplete?: () => void }) => void
  // 指向性攻击线 (从 source → target 划线动画, 渲染层用)
  directionalLines: DirectionalLine[]
  // 伤害/治疗飘字队列 (渲染层用)
  damageFloaters: DamageFloater[]
  removeFloater: (id: string) => void
}

const heroNames: Record<string, string> = {}

// 飞行卡动画: 位置查找 helpers
function rectCenter(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

function findCenterPos(): { x: number; y: number } {
  const el = document.querySelector('[data-center-marker]') as HTMLElement | null
  if (el) {
    const c = rectCenter(el.getBoundingClientRect())
    return { x: c.x, y: c.y - 50 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 }
}

function findSourcePos(heroId: string, sourceType: 'hand' | 'equipment', ref: string | undefined): { x: number; y: number } | null {
  if (sourceType === 'hand') {
    if (ref) {
      const el = document.querySelector(`[data-card-id="${ref}"]`) as HTMLElement | null
      if (el) return rectCenter(el.getBoundingClientRect())
    }
    // AI 手牌: 用 hero card 根的中心作代理
    const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    if (heroEl) return rectCenter(heroEl.getBoundingClientRect())
  } else {
    const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
    const slotEl = heroEl?.querySelector(`[data-equip-slot="${ref}"]`) as HTMLElement | null
    if (slotEl) return rectCenter(slotEl.getBoundingClientRect())
  }
  return null
}

function findHandPos(heroId: string): { x: number; y: number } | null {
  const heroEl = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
  if (heroEl) return rectCenter(heroEl.getBoundingClientRect())
  return null
}

function findHeroCenter(heroId: string): { x: number; y: number } | null {
  const el = document.querySelector(`[data-hero-id="${heroId}"]`) as HTMLElement | null
  return el ? rectCenter(el.getBoundingClientRect()) : null
}

function eventToLog(event: GameEvent): string | null {
  const src = event.sourceHeroId ? getHeroName(event.sourceHeroId) : ''
  const tgt = event.targetHeroId ? getHeroName(event.targetHeroId) : ''
  const wrap = (name: string) => name ? `**${name}**` : ''
  const skill = (name: string) => `≪${name}≫`
  switch (event.type) {
    case 'turn:start': return `── ${wrap(src)} 的回合 (第${(event.data as any)?.turn}回合) ──`
    case 'card:play': {
      const name = (event.data as any)?.cardName
      return tgt ? `${wrap(src)} 对 ${wrap(tgt)} 使用了【${name}】` : `${wrap(src)} 使用了【${name}】`
    }
    case 'damage:prevent': {
      const cardName = (event.data as any)?.cardName ?? '闪'
      return `${wrap(src)} 使用【${cardName}】抵消了攻击`
    }
    case 'damage:deal': return `${wrap(src)} → ${wrap(tgt)} 造成 ${(event.data as any)?.damage} 点伤害`
    case 'damage:receive': return `${wrap(src)} 受到 ${(event.data as any)?.damage} 点伤害`
    case 'heal': return `${wrap(src)} 回复 ${(event.data as any)?.amount} 点生命`
    case 'dying': return `${wrap(src)} 濒死!`
    case 'die': return `${wrap(src)} 阵亡!`
    case 'skill:trigger': {
      const name = (event.data as any)?.skillName
      const effect = (event.data as any)?.effect
      return effect ? `${skill(name)} 触发: ${effect}` : `${skill(name)} 触发!`
    }
    case 'equipment:equip': {
      const cardName = (event.data as any)?.cardName ?? '装备'
      return `${wrap(src)} 使用了【${cardName}】`
    }
    case 'card:draw': return null // too noisy
    case 'card:discard': {
      const cardDescs = (event.data as any)?.cardDescs as string[] | undefined
      const count = (event.data as any)?.count
      const reason = (event.data as any)?.reason
      if (cardDescs && cardDescs.length > 0) {
        return `${wrap(src)} 弃了 ${count ?? cardDescs.length} 张牌: ${cardDescs.join('、')}${reason ? ` (${reason})` : ''}`
      }
      return null
    }
    case 'card:gain': {
      const cardName = (event.data as any)?.cardName
      const from = (event.data as any)?.from
      if (from === 'wugu') return `${wrap(src)} 拿走了【${cardName}】`
      return `${wrap(src)} 获得了【${cardName}】`
    }
    case 'scheme:nullify': {
      const name = (event.data as any)?.originalCardName
      return `【${name}】被【无懈可击】抵消！`
    }
    case 'judge': {
      const data = event.data as any
      const phase = data?.phase
      if (phase === 'result' && data?.judgeCardName) {
        return `⚖ ${wrap(src)} 判定【${data.judgeCardName}】: ${data?.cardName ?? ''} (${data?.suit ?? ''} ${data?.number ?? ''})`
      }
      if (phase === 'result') {
        return `⚖ 判定结果: ${data?.cardName ?? ''} (${data?.suit ?? ''} ${data?.number ?? ''})`
      }
      if (phase === 'replace') {
        return `⚖ 变法: 判定改为 ${data?.cardName ?? ''}`
      }
      return null
    }
    case 'wugu:pickStart': {
      const playerName = (event.data as any)?.playerName
      return `🌾 ${playerName ? wrap(playerName) : wrap(src)} 选择要拿的牌...`
    }
    case 'wugu:reveal': return null
    default: return null
  }
}

const allEventTypes: GameEventType[] = WORKER_EVENT_TYPES

export const useBattleStore = create<BattleState>((set, get) => ({
  gameState: null,
  phase: 'idle',
  playerHand: [],
  actionLog: [],
  result: null,
  pendingCardId: null,
  pendingCardType: null,
  pendingCardFromPos: null,
  selectedTargetId: null,
  aoJianActive: false,
  derived: null,
  responsePrompt: null,
  responseType: null,
  resolveAction: null,
  resolveResponse: null,
  resolveJudge: null,
  resolveLongLin: null,
  resolveMultiTarget: null,
  resolveDualCard: null,
  resolveLuYeQiangTarget: null,
  judgeCard: null,
  lastJudgeResult: null,
  equippedCards: {},
  multiTargetCandidates: [],
  selectedTargets: [],
  killMultiCardId: null,
  killMultiMax: 0,
  killMultiRemaining: 0,
  selectedDualCards: [],
  luYeQiangCandidates: [],
  luYeQiangKillCardId: null,
  longLinTargetInfo: null,
  longLinSelectedCards: [],
  jieDaoHolders: [],
  jieDaoCandidates: [],
  tanNangCandidates: [],
  tanNangTargetInfo: null,
  wuguCandidates: null,
  wuguPicks: [],
  wuguTotalPickers: 0,
  fudiTargetInfo: null,
  resolveJieDaoHolder: null,
  resolveJieDaoTarget: null,
  resolveTanNangTarget: null,
  resolveTanNangPick: null,
  resolveWuguPick: null,
  resolveFudiTarget: null,
  resolveFudiPick: null,
  faJiaTargetInfo: null,
  resolveFaJiaPick: null,
  treasureSkill: null,
  treasurePrompt: '',
  treasureCardIds: [],
  treasureTargetIds: [],
  qiYiCardMap: {},
  qiYiDecision: null,
  qiYiStep: null,
  xiaDanOpponentCard: null,
  xiaDanTargetName: null,
  resolveXiaDanCard: null,
  selectedDiscardCards: [],
  discardCount: 0,
  resolveDiscard: null,
  baWangOptions: null,
  resolveBaWangMount: null,
  ciKePrompt: null,
  resolveCiKe: null,
  yuRuYiPrompt: null,
  resolveYuRuYi: null,
  dieHunPrompt: null,
  resolveDieHun: null,
  manWuPrompt: null,
  manWuRedHeartCards: [],
  manWuSelectedCardId: null,
  resolveManWuPickCard: null,
  resolveManWu: null,
  tianXiangJudgeCard: null,
  tianXiangEquipment: [],
  resolveTianXiang: null,
  menShenCandidates: [],
  resolveMenShenTarget: null,
  jueBieCandidates: [],
  resolveJueBieTarget: null,
  zhenShaPrompt: null,
  resolveZhenSha: null,
  buDaoPrompt: null,
  resolveBuDao: null,
  sanBanFuPrompt: null,
  resolveSanBanFu: null,
  fuChouTriggerPrompt: null,
  resolveFuChouTrigger: null,
  fuChouChoosePrompt: null,
  resolveFuChouChoose: null,
  fuChouPickSelected: [],
  resolveFuChouPick: null,
  dyingRescuePrompt: null,
  dyingRescueSelected: [],
  resolveDyingRescue: null,
  sheShenTriggerPrompt: null,
  resolveSheShenTrigger: null,
  sheShenPrompt: null,
  sheShenSelectedCardIds: [],
  sheShenDistribution: {},
  resolveSheShen: null,
  chaoTuoPrompt: null,
  resolveChaoTuo: null,
  houZhuPrompt: null,
  resolveHouZhu: null,
  xiaDanActive: false,
  xiaDanUsedThisTurn: false,
  yuRenCardIds: [],
  yuRenUsedThisTurn: false,
  flyingCards: [],
  directionalLines: [],
  damageFloaters: [],
  _queueFlyingCard: (req) => {
    // 转发到 animationStore, 让高频动画状态脱离 battleStore (避免 BattleBoard 全量订阅被动画 mutate 触发重渲染)
    useAnimationStore.getState()._queueFlyingCard(req)
  },

  removeFloater: (id: string) => {
    useAnimationStore.getState().removeFloater(id)
  },

  startBattle: async (config: GameConfig) => {
    Object.keys(heroNames).forEach(k => delete heroNames[k])

    // 完整重置所有状态, 防止上一场战斗残留导致回合卡住
    set({
      gameState: null,
      phase: 'idle',
      playerHand: [],
      actionLog: [],
      result: null,
      pendingCardId: null,
      pendingCardType: null,
      selectedTargetId: null,
      aoJianActive: false,
      derived: null,
      responsePrompt: null,
      responseType: null,
      equippedCards: {},
      multiTargetCandidates: [],
      selectedTargets: [],
      selectedDualCards: [],
      longLinTargetInfo: null,
      longLinSelectedCards: [],
      jieDaoHolders: [],
      jieDaoCandidates: [],
      tanNangCandidates: [],
      tanNangTargetInfo: null,
      wuguCandidates: null,
      wuguPicks: [],
      wuguTotalPickers: 0,
      fudiTargetInfo: null,
      treasureSkill: null,
      treasurePrompt: '',
      treasureCardIds: [],
      treasureTargetIds: [],
      qiYiCardMap: {},
      qiYiDecision: null,
      qiYiStep: null,
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
      resolveXiaDanCard: null,
      xiaDanOpponentCard: null,
      xiaDanTargetName: null,
      xiaDanActive: false,
      xiaDanUsedThisTurn: false,
      yuRenCardIds: [],
      yuRenUsedThisTurn: false,
      judgeCard: null,
      lastJudgeResult: null,
      baWangOptions: null,
      resolveBaWangMount: null,
      ciKePrompt: null,
      resolveCiKe: null,
      yuRuYiPrompt: null,
      resolveYuRuYi: null,
      dieHunPrompt: null,
      resolveDieHun: null,
      manWuPrompt: null,
      manWuRedHeartCards: [],
      manWuSelectedCardId: null,
      resolveManWuPickCard: null,
      resolveManWu: null,
      tianXiangJudgeCard: null,
      tianXiangEquipment: [],
      resolveTianXiang: null,
      menShenCandidates: [],
      resolveMenShenTarget: null,
      jueBieCandidates: [],
      resolveJueBieTarget: null,
      zhenShaPrompt: null,
      resolveZhenSha: null,
      buDaoPrompt: null,
      resolveBuDao: null,
      sanBanFuPrompt: null,
      resolveSanBanFu: null,
      fuChouTriggerPrompt: null,
      resolveFuChouTrigger: null,
      fuChouChoosePrompt: null,
      resolveFuChouChoose: null,
      fuChouPickSelected: [],
      resolveFuChouPick: null,
      dyingRescuePrompt: null,
      dyingRescueSelected: [],
      resolveDyingRescue: null,
      sheShenTriggerPrompt: null,
      resolveSheShenTrigger: null,
      sheShenPrompt: null,
      sheShenSelectedCardIds: [],
      sheShenDistribution: {},
      resolveSheShen: null,
      chaoTuoPrompt: null,
      resolveChaoTuo: null,
      houZhuPrompt: null,
      resolveHouZhu: null,
      flyingCards: [],
      directionalLines: [],
      damageFloaters: [],
    })
    // 同步重置 animationStore
    useAnimationStore.getState().reset()

    // game 实例前置引用: 模块级 gameRef 在 startBattle 入口重置, handler 内部通过闭包访问
    gameRef = null
    engineProxy?.dispose()
    engineProxy = new EngineProxy()
    // 通过 id 从 gameRef 拿 Player 实例的辅助 (PlayerProxy shim)
    const P = (id: string) => gameRef!.getPlayerById(id)!

    const wrappedConfig: GameConfig = {
      ...config,
      judgeActionHandler: async (ctx: JudgeActionCtx) => {
        const player = P(ctx.playerId)
        set({ phase: 'judgeReplace', judgeCard: ctx.judgeCard, playerHand: player.getHand() })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveJudge: resolve })
        })
        set({ resolveJudge: null, judgeCard: null })
        return cardId
      },
      xiaDanPlayerCardHandler: async (ctx: XiaDanPlayerCardCtx) => {
        // 双方同时选牌, 玩家不会看到对方的牌
        set({
          phase: 'xiaDanPickCard',
          playerHand: P(ctx.playerId).getHand(),
          xiaDanOpponentCard: null,  // 不展示对方已选牌
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveXiaDanCard: resolve })
        })
        set({ resolveXiaDanCard: null, xiaDanOpponentCard: null, xiaDanTargetName: null })
        return cardId
      },
      responseActionHandler: async (ctx: ResponseActionCtx) => {
        const player = P(ctx.playerId)
        const game = gameRef!
        const c = ctx.context
        const sourceName = c.sourceHeroId ? game.getPlayerById(c.sourceHeroId)?.getName() : ''
        const prompt = ctx.responseType === 'nullify'
          ? `${sourceName ? `**${sourceName}** 的` : ''}【${c.schemeName}】即将生效，是否使用【无懈可击】抵消？`
          : ctx.responseType === 'dodge'
            ? `${sourceName ? `**${sourceName}** 使用` : ''}【${c.schemeName || '杀'}】攻击你，是否打出【闪】响应？`
            : `${sourceName ? `**${sourceName}** 发起` : ''}${c.schemeName}: 请打出【杀】响应 (${c.needCount}张) 或放弃`
        set({
          phase: 'awaitingResponse',
          playerHand: player.getHand(),
          responsePrompt: prompt,
          responseType: ctx.responseType,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveResponse: resolve })
        })
        // 关键: 这里不能设 phase='playing' — 此时不是玩家出牌阶段, 是攻击方(AI)继续处理中
        // 设成 'waiting' 让 UI 显示"等待中", 直到 engine 真正轮到玩家时再由 playerActionHandler 改回 'playing'
        set({ resolveResponse: null, responsePrompt: null, responseType: null, phase: 'waiting', gameState: game.getState() })
        return cardId
      },
      longLinPickHandler: async (ctx: LongLinPickCtx) => {
        const defender = P(ctx.defenderId)
        set({
          phase: 'longLinDisarm',
          longLinTargetInfo: {
            id: defender.getId(), name: defender.getName(),
            hand: [...ctx.options.hand], judge: [...ctx.options.judge], equipment: [...ctx.options.equipment],
          },
          longLinSelectedCards: [],
          playerHand: P(ctx.attackerId).getHand(),
        })
        return new Promise<string[] | null>(resolve => {
          set({ resolveLongLin: resolve })
        })
      },
      multiTargetHandler: async (ctx: MultiTargetCtx) => {
        const game = gameRef!
        set({
          phase: 'selectMultiTargets',
          multiTargetCandidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() } }),
          selectedTargets: [],
        })
        return new Promise<string[]>(resolve => {
          set({ resolveMultiTarget: resolve })
        })
      },
      dualCardHandler: async (ctx: DualCardCtx) => {
        set({
          phase: 'selectDualCards',
          playerHand: P(ctx.attackerId).getHand(),
          selectedDualCards: [],
        })
        return new Promise<string[]>(resolve => {
          set({ resolveDualCard: resolve })
        })
      },
      luYeQiangTargetHandler: async (ctx: LuYeQiangTargetCtx) => {
        set({
          phase: 'selectLuYeQiangTarget',
          luYeQiangCandidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() } }),
        })
        return new Promise<string | null>(resolve => {
          set({ resolveLuYeQiangTarget: resolve })
        })
      },
      wuguPickHandler: async (ctx: WuguPickCtx) => {
        const picker = P(ctx.pickerId)
        const game = gameRef!
        // AI 玩家: 自动选第1张, 加延迟让玩家看清
        if (picker.getRole() !== 'player') {
          await new Promise(resolve => setTimeout(resolve, 400))
          return ctx.candidates[0]?.id ?? null
        }
        // 玩家: 进入选牌 UI; 总人数 = 当前存活英雄数
        const aliveCount = (game.getState()?.heroes ?? []).filter(h => h.currentHp > 0).length
        set({
          phase: 'selectWugu',
          wuguCandidates: [...ctx.candidates],
          wuguPicks: [],
          wuguTotalPickers: aliveCount,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveWuguPick: resolve })
        })
        // 玩家选完后不关弹框 — 让 card:gain 事件和 wuguPicks 跟踪后续 AI 选牌
        set({ resolveWuguPick: null, phase: 'playing' })
        return cardId
      },
      jieDaoTargetHandler: async (ctx: JieDaoTargetCtx) => {
        const game = gameRef!
        set({
          phase: 'selectJieDaoHolder',
          jieDaoHolders: ctx.weaponHolderIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName() } }),
        })
        const holderId = await new Promise<string | null>(resolve => {
          set({ resolveJieDaoHolder: resolve })
        })
        set({ resolveJieDaoHolder: null, jieDaoHolders: [], phase: 'playing' })
        return holderId
      },
      jieDaoAttackTargetHandler: async (ctx: JieDaoAttackTargetCtx) => {
        const game = gameRef!
        // 借刀 step 2: 走 pending+confirm 流程, 与手牌一致
        // 复用pending状态 + jieDaoCandidates作为合法目标列表
        set({
          phase: 'playing',
          jieDaoHolders: [],
          jieDaoCandidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() } }),
          pendingCardId: '__jieDaoStep2__',  // 标记 (card已离手, 但banner需知道显示)
          pendingCardType: 'scheme',
          selectedTargetId: null,
        })
        const targetId = await new Promise<string | null>(resolve => {
          set({ resolveJieDaoTarget: resolve })
        })
        set({ resolveJieDaoTarget: null, jieDaoCandidates: [], phase: 'playing', pendingCardId: null, pendingCardType: null, pendingCardFromPos: null })
        return targetId
      },
      tanNangTargetHandler: async (ctx: TanNangTargetCtx) => {
        const game = gameRef!
        set({
          phase: 'selectTanNangTarget',
          tanNangTargetInfo: null,
          tanNangCandidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName() } }),
        })
        const targetId = await new Promise<string | null>(resolve => {
          set({ resolveTanNangTarget: resolve })
        })
        set({ resolveTanNangTarget: null, phase: 'playing', tanNangCandidates: [] })
        return targetId
      },
      tanNangPickHandler: async (ctx: TanNangPickCtx) => {
        const game = gameRef!
        const target = P(ctx.targetId)
        set({
          phase: 'selectTanNangCard',
          tanNangTargetInfo: {
            id: target.getId(),
            name: target.getName(),
            hand: [...ctx.options.hand],
            judge: [...ctx.options.judge],
            equipment: [...ctx.options.equipment],
          },
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveTanNangPick: resolve })
        })
        set({ resolveTanNangPick: null, tanNangTargetInfo: null, phase: 'playing' })
        return cardId
      },
      fudiTargetHandler: async (ctx: FudiTargetCtx) => {
        const game = gameRef!
        set({
          phase: 'selectFudiTarget',
          fudiTargetInfo: null,
        })
        const targetId = await new Promise<string | null>(resolve => {
          set({ resolveFudiTarget: resolve })
        })
        set({ resolveFudiTarget: null, phase: 'playing' })
        return targetId
      },
      fudiPickHandler: async (ctx: FudiPickCtx) => {
        const game = gameRef!
        const target = P(ctx.targetId)
        set({
          phase: 'selectFudiCard',
          fudiTargetInfo: {
            id: target.getId(),
            name: target.getName(),
            hand: [...ctx.options.hand],
            judge: [...ctx.options.judge],
            equipment: [...ctx.options.equipment],
          },
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveFudiPick: resolve })
        })
        set({ resolveFudiPick: null, fudiTargetInfo: null, phase: 'playing' })
        return cardId
      },
      faJiaPickHandler: async (ctx: FaJiaPickCtx) => {
        const game = gameRef!
        const attacker = P(ctx.attackerId)
        set({
          phase: 'selectFaJiaCard',
          faJiaTargetInfo: {
            id: attacker.getId(),
            name: attacker.getName(),
            hand: [...ctx.options.hand],
            judge: [...ctx.options.judge],
            equipment: [...ctx.options.equipment],
          },
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveFaJiaPick: resolve })
        })
        set({ resolveFaJiaPick: null, faJiaTargetInfo: null, phase: 'playing' })
        return cardId
      },
      discardPickHandler: async (ctx: DiscardPickCtx) => {
        set({ phase: 'selectDiscardCards', selectedDiscardCards: [], discardCount: ctx.discardCount })
        return new Promise<string[]>(resolve => {
          set({ resolveDiscard: resolve })
        })
      },
      baWangMountHandler: async (ctx: BaWangMountCtx) => {
        set({ phase: 'selectBaWangMount', baWangOptions: ctx.mountOptions })
        return new Promise<'attackMount' | 'defenseMount' | null>(resolve => {
          set({ resolveBaWangMount: resolve })
        })
      },
      ciKeHandler: async (ctx: CiKeCtx) => {
        const defender = P(ctx.defenderId)
        set({ ciKePrompt: { defenderId: defender.getId(), defenderName: defender.getName() } })
        return new Promise<boolean>(resolve => {
          set({ resolveCiKe: resolve })
        })
      },
      yuRuYiHandler: async (ctx: YuRuYiCtx) => {
        set({ yuRuYiPrompt: { attackType: ctx.attackName, attackName: ctx.attackName } })
        return new Promise<boolean>(resolve => {
          set({ resolveYuRuYi: resolve })
        })
      },
      dieHunHandler: async (ctx: DieHunCtx) => {
        set({ dieHunPrompt: { schemeName: ctx.schemeName } })
        return new Promise<boolean>(resolve => {
          set({ resolveDieHun: resolve })
        })
      },
      fuChouTriggerHandler: async (ctx: FuChouTriggerCtx) => {
        const attacker = P(ctx.attackerId)
        set({ fuChouTriggerPrompt: { attackerName: attacker.getName() } })
        return new Promise<boolean>(resolve => {
          set({ resolveFuChouTrigger: resolve })
        })
      },
      fuChouChooseHandler: async (ctx: FuChouChooseCtx) => {
        const attacker = P(ctx.attackerId)
        set({ fuChouChoosePrompt: { attackerId: attacker.getId(), attackerName: attacker.getName(), handCount: ctx.handCards.length } })
        return new Promise<'discard' | 'damage'>(resolve => {
          set({ resolveFuChouChoose: resolve })
        })
      },
      fuChouPickHandler: async (ctx: FuChouPickCtx) => {
        set({
          phase: 'selectFuChouDiscard',
          fuChouPickSelected: [],
        })
        const picked = await new Promise<string[]>(resolve => {
          set({ resolveFuChouPick: resolve })
        })
        set({ resolveFuChouPick: null, fuChouPickSelected: [], phase: 'playing' })
        return picked
      },
      sheShenTriggerHandler: async (ctx: SheShenTriggerCtx) => {
        set({
          phase: 'sheShenTrigger',
          sheShenTriggerPrompt: { damage: ctx.damage, drawCount: ctx.damage * 2 },
        })
        const use = await new Promise<boolean>(resolve => {
          set({ resolveSheShenTrigger: resolve })
        })
        set({ resolveSheShenTrigger: null, sheShenTriggerPrompt: null, phase: 'waiting' })
        return use
      },
      sheShenDistributeHandler: async (ctx: SheShenCtx) => {
        // 候选接收者: 自己 + 所有存活其他角色 (用 gameState 快照)
        const gs = useBattleStore.getState().gameState
        const candidates = (gs?.heroes ?? [])
          .filter(h => h.currentHp > 0)
          .map(h => ({ id: h.hero.id, name: h.hero.name }))
        set({
          phase: 'sheShenDistribute',
          sheShenPrompt: { cards: [...ctx.cards], candidates },
          sheShenSelectedCardIds: [],
          sheShenDistribution: {},
        })
        const distribution = await new Promise<Record<string, string[]> | null>(resolve => {
          set({ resolveSheShen: resolve })
        })
        set({
          resolveSheShen: null, sheShenPrompt: null,
          sheShenSelectedCardIds: [], sheShenDistribution: {}, phase: 'waiting',
        })
        return distribution
      },
      manWuPickCardHandler: async (ctx: ManWuPickCardCtx) => {
        const victim = P(ctx.victimId)
        // 找可弃的手牌: 红桃始终可用; 黑桃在红妆时也可当红桃用
        const hasHongZhuang = victim.hasSkillOrTreasure('hong-zhuang')
        const selectableCards = victim.getHand().filter((c: Card) => c.suit === 'heart' || (hasHongZhuang && c.suit === 'spade'))
        if (selectableCards.length === 0) return null
        set({
          manWuRedHeartCards: selectableCards,
          manWuSelectedCardId: null,
        })
        return new Promise<string | null>(resolve => {
          set({ resolveManWuPickCard: resolve })
        })
      },
      manWuHandler: async (ctx: ManWuCtx) => {
        const attacker = P(ctx.attackerId)
        set({
          manWuPrompt: {
            attackerName: attacker.getName(),
            damage: ctx.damage,
            candidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName() } }),
          },
        })
        return new Promise<string | null>(resolve => {
          set({ resolveManWu: resolve })
        })
      },
      tianXiangHandler: async (ctx: TianXiangCtx) => {
        const game = gameRef!
        const player = P(ctx.playerId)
        const equipment = game.collectEquipmentCards(player)
        set({
          phase: 'tianXiang',
          tianXiangJudgeCard: { name: ctx.judgeCard.name, suit: ctx.judgeCard.suit, number: ctx.judgeCard.number },
          tianXiangEquipment: equipment,
          playerHand: player.getHand(),
        })
        return new Promise<string | null>(resolve => {
          set({ resolveTianXiang: resolve })
        })
      },
      menShenTargetHandler: async (ctx: MenShenTargetCtx) => {
        set({
          phase: 'menShenTarget',
          menShenCandidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() } }),
        })
        return new Promise<string | null>(resolve => {
          set({ resolveMenShenTarget: resolve })
        })
      },
      jueBieHandler: async (ctx: JueBieCtx) => {
        set({
          phase: 'jueBieTarget',
          jueBieCandidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() } }),
        })
        return new Promise<string | null>(resolve => {
          set({ resolveJueBieTarget: resolve })
        })
      },
      zhenShaHandler: async (ctx: ZhenShaCtx) => {
        const dyingTarget = P(ctx.dyingTargetId)
        set({ zhenShaPrompt: { targetName: dyingTarget.getName() } })
        return new Promise<boolean>(resolve => {
          set({ resolveZhenSha: resolve })
        })
      },
      dyingRescueHandler: async (ctx: DyingRescueCtx) => {
        const game = gameRef!
        const savior = P(ctx.saviorId)
        const dyingTarget = P(ctx.dyingTargetId)
        set({
          phase: 'dyingRescue',
          dyingRescuePrompt: {
            saviorId: savior.getId(),
            saviorName: savior.getName(),
            targetId: dyingTarget.getId(),
            targetName: dyingTarget.getName(),
            yaoHandCards: [...ctx.yaoHandCards],
          },
          dyingRescueSelected: [],
        })
        const cardIds = await new Promise<string[] | null>(resolve => {
          set({ resolveDyingRescue: resolve })
        })
        set({ resolveDyingRescue: null, dyingRescuePrompt: null, dyingRescueSelected: [], phase: 'waiting' })
        return cardIds
      },
      chaoTuoHandler: async (ctx: ChaoTuoCtx) => {
        const player = P(ctx.playerId)
        const equippedCards: Record<string, Partial<Record<EquipmentSlot, Card>>> = useBattleStore.getState().equippedCards
        const heroEquip = equippedCards[player.getId()] ?? {}
        const blackEquipment = ctx.blackCardIds.equipment.map(({ cardId, slot }) => {
          const eq = heroEquip[slot as EquipmentSlot]
          return { cardId, slot, name: eq?.name ?? '' }
        })
        set({
          phase: 'chaoTuoPick',
          chaoTuoPrompt: {
            judgeCardName: ctx.judgeCard.name,
            blackHandIds: ctx.blackCardIds.hand,
            blackEquipment,
          },
          playerHand: player.getHand(),
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveChaoTuo: resolve })
        })
        set({ resolveChaoTuo: null, chaoTuoPrompt: null, phase: 'waiting' })
        return cardId
      },
      houZhuHandler: async (ctx: HouZhuCtx) => {
        set({
          phase: 'houZhuTarget',
          houZhuPrompt: {
            candidates: ctx.candidateIds.map(id => { const p = P(id); return { id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() } }),
          },
        })
        const targetId = await new Promise<string | null>(resolve => {
          set({ resolveHouZhu: resolve })
        })
        set({ resolveHouZhu: null, houZhuPrompt: null, phase: 'waiting' })
        return targetId
      },
      buDaoHandler: async (ctx: BuDaoCtx) => {
        const victim = P(ctx.victimId)
        set({
          phase: 'buDaoKill',
          buDaoPrompt: { victimId: victim.getId(), victimName: victim.getName() },
          playerHand: P(ctx.guanYuId).getHand(),
        })
        return new Promise<string | null>(resolve => {
          set({ resolveBuDao: resolve })
        })
      },
      sanBanFuHandler: async (ctx: SanBanFuCtx) => {
        const defender = P(ctx.defenderId)
        set({ sanBanFuPrompt: { targetName: defender.getName() } })
        return new Promise<boolean>(resolve => {
          set({ resolveSanBanFu: resolve })
        })
      },
      playerActionHandler: async (ctx: PlayerActionCtx) => {
        const game = gameRef!
        const player = P(ctx.playerId)
        while (true) {
          const state = game.getState()
          const engineAoJianActive = game.isAoJianActive(player.getId())
          set({
            gameState: state,
            playerHand: player.getHand(),
            phase: 'playing',
            aoJianActive: engineAoJianActive,
          })

          const action = await new Promise<string | null>(resolve => {
            set({ resolveAction: resolve, pendingCardId: null })
          })

          if (!action || action === 'endPhase') {
            set({ phase: 'waiting', aoJianActive: false })
            return null
          }

          if (action.startsWith('kill:')) {
            const [, cardId, targetId] = action.split(':')
            if (targetId) await game.playerPlayKill(player, targetId, cardId)
          } else if (action.startsWith('killMulti:')) {
            // 侠胆多杀: 形如 killMulti:cardId:targetId1,targetId2[:maxTargets]
            // 狼牙棒: 末尾带 :3 表示 maxTargets=3
            const parts = action.split(':')
            const cardId = parts[1]
            const idsRaw = parts[2] ?? ''
            const maxTargetsOverride = parts[3] ? Number(parts[3]) : undefined
            const targetIds = idsRaw.split(',').filter(Boolean)
            if (targetIds.length > 0) await game.playerPlayKillMulti(player, cardId, targetIds, maxTargetsOverride)
          } else if (action.startsWith('jieDao:')) {
            // 借刀: jieDao:cardId:holderId (UI预选holder)
            const parts = action.split(':')
            const cardId = parts[1]
            const holderId = parts[2] || undefined
            await game.playerPlayJieDao(player, cardId, holderId)
          } else if (action.startsWith('scheme:')) {
            const parts = action.split(':')
            const cardId = parts[1]
            const targetId = parts[2] || undefined
            await game.playerPlayScheme(player, cardId, targetId)
            // 五谷丰登选完后继续处理剩余玩家
            if (game.pendingWuguContinuation) {
              await game.pendingWuguContinuation()
            }
          } else if (action.startsWith('heal:')) {
            const cardId = action.slice(5)
            game.playerPlayHeal(player, cardId)
          } else if (action.startsWith('equip:')) {
            const cardId = action.slice(6)
            game.playerEquipCard(player, cardId)
          } else if (action.startsWith('luYeQiang:')) {
            await game.playerUseLuYeQiang(player)
          }

          // 击杀最后一个敌人后立即退出出牌阶段
          if (game.getState()?.isOver) {
            set({ phase: 'waiting' })
            return null
          }

          set({ gameState: game.getState(), playerHand: player.getHand() })
        }
      },
      // 动画就绪门控: 等 flyingCards 全部清空才让 engine 调下一个 UI handler
      // 事件驱动 (Zustand subscribe), 0 polling; 5s 安全超时防卡死
      // 注意: flyingCards 实际状态在 animationStore (拆出去避免高频动画 mutate battleStore 触发全屏重渲染)
      awaitUIReady: () => new Promise<void>(resolve => {
        const animState = useAnimationStore.getState()
        if (animState.flyingCards.length === 0) {
          resolve()
          return
        }
        let unsub: (() => void) | null = null
        unsub = useAnimationStore.subscribe((s, prev) => {
          if (s.flyingCards.length === 0 && prev.flyingCards.length > 0) {
            unsub?.()
            resolve()
          }
        })
        setTimeout(() => { unsub?.(); resolve() }, 5000)
      }),
    }

    // 阶段 3 步骤 E: engine 在 Web Worker 内. 主线程不再 new Game.
    // 1) 把 wrappedConfig 的 handler 实现注册到 engineProxy (Worker 内 forward 回主线程执行)
    // 2) 订阅 engineProxy 转发的 EventBus
    // 3) GameProxy shim 让旧代码的 gameRef!.xxx() 调用透明转发
    for (const handlerName of Object.keys(wrappedConfig) as Array<keyof GameConfig>) {
      if (handlerName === 'playerHeroId' || handlerName === 'playerInstance' ||
          handlerName === 'allyHeroIds' || handlerName === 'allyInstances' ||
          handlerName === 'enemyHeroIds' || handlerName === 'enemyInstances') continue
      const impl = wrappedConfig[handlerName] as ((ctx: HandlerCtx) => Promise<unknown> | unknown) | undefined
      if (typeof impl === 'function') {
        engineProxy.setHandler(handlerName as HandlerName, impl)
      }
    }

    const game = new GameProxy()
    gameRef = game

    // 飘字入队: 转发到 animationStore, 让高频动画状态脱离 battleStore
    const pushFloater = (entry: { heroId: string; amount: number; type: 'damage' | 'heal' | 'dodge' | 'response-kill' }) => {
      useAnimationStore.getState().pushFloater(entry)
    }

    const MAX_LOG = 200
    const handler = (event: GameEvent) => {
      // 阶段 3 步骤 E: derived / gameState / playerHand / heroNames / handsByHero 等已由 EngineProxy
      // 从 Worker snapshot 同步到 latestSnapshot (handler 实现读 latestSnapshot).
      // 步骤 B 的 derived merge 由 Worker 在 snapshot.derived 提供 — 这里也 merge 到 store.
      const derived = latestSnapshot?.derived
      if (derived) set({ derived })
      const msg = eventToLog(event)
      if (msg) {
        set(s => {
          const next = [...s.actionLog, msg]
          // 长局日志截断, 避免无界增长 + 减少 BattleLog 重渲染成本
          if (next.length > MAX_LOG + 20) next.splice(0, next.length - MAX_LOG)
          return { actionLog: next }
        })
      }
      // 五谷丰登: 跟踪每个 picker 的选牌; 全部选完关闭弹框
      if (event.type === 'card:gain' && (event.data as any)?.from === 'wugu') {
        const pickerId = event.sourceHeroId ?? ''
        const cardId = (event.data as any)?.cardId as string | undefined
        const pickerName = getHeroName(pickerId)
        if (pickerId && cardId) {
          const s = get()
          if (s.wuguTotalPickers > 0) {
            const nextPicks = [...s.wuguPicks, { heroId: pickerId, heroName: pickerName, cardId }]
            const done = nextPicks.length >= s.wuguTotalPickers
            set({
              wuguPicks: nextPicks,
              ...(done ? { wuguCandidates: null, wuguPicks: [], wuguTotalPickers: 0 } : {}),
            })
          }
        }
      }
      // 判定事件: reveal (翻牌)/replace (被替换)/result (最终) — 都更新中央展示
      if (event.type === 'judge') {
        const data = event.data as any
        const phase = data?.phase as string | undefined
        const heroName = event.sourceHeroId ? getHeroName(event.sourceHeroId) : ''
        const judgeCardName = (data?.judgeCardName as string) ?? ''
        // result 阶段如果 data 里没有 cardName/suit (理论上有), 兜底用 resultSuit/resultNumber
        const cardName = (data?.cardName as string) ?? ''
        const suit = (data?.suit as string) ?? ''
        const number = (data?.number as number) ?? 0
        // JudgePhase 的 skipped 分支没有 cardName/suit, 用 resultSuit/resultNumber 推断
        const finalCardName = cardName || (data?.cardId ? '' : '')
        set({ lastJudgeResult: {
          judgeHeroName: heroName,
          judgeCardName,
          resultCard: { suit, number, name: finalCardName },
        }})
        // 仅 result 阶段后定时清除
        if (phase === 'result') {
          setTimeout(() => {
            const cur = get().lastJudgeResult
            if (cur && cur.resultCard.name === cardName && cur.resultCard.suit === suit) {
              set({ lastJudgeResult: null })
            }
          }, 3000)
        }
      }
      // 飘字入队 (伤害/治疗)
      if (event.type === 'damage:deal' || event.type === 'damage:receive') {
        if (event.targetHeroId) {
          const dmg = (event.data as any)?.damage as number | undefined
          if (typeof dmg === 'number' && dmg > 0) {
            pushFloater({ heroId: event.targetHeroId, amount: -dmg, type: 'damage' })
          }
        }
      } else if (event.type === 'heal') {
        if (event.targetHeroId) {
          const amt = (event.data as any)?.amount as number | undefined
          if (typeof amt === 'number' && amt > 0) {
            pushFloater({ heroId: event.targetHeroId, amount: amt, type: 'heal' })
          }
        }
      } else if (event.type === 'damage:prevent') {
        // 闪/杀响应: data 含 cardId 或 cardName (排除 data.reason = 宝具免疫如红杀盾)
        // 烽火狼烟响应出杀 → 'response-kill', 万箭齐发响应出闪 → 'dodge'
        if (event.sourceHeroId) {
          const data = event.data as any
          const cardName = data?.cardName as string | undefined
          const hasResponse = !!(data?.cardId || cardName)
          if (hasResponse) {
            const type: 'dodge' | 'response-kill' = cardName === '杀' ? 'response-kill' : 'dodge'
            pushFloater({ heroId: event.sourceHeroId, amount: 0, type })
          }
        }
      }
      // 关键事件触发时同步 gameState + playerHand, 避免 UI 显示陈旧的 HP/手牌
      // (出牌/弃牌/摸牌/失去装备 时手牌会变, 必须同步, 否则像李逵复仇等待时
      //  玩家出的杀卡还留在手里 — 因为 playerActionHandler 在 await 复仇, 之后那行同步未执行)
      // 注意: equipment:equip 的 gameState 同步延后到飞行卡动画完成后 (见 queueFly 的 onComplete)
      if (event.type === 'damage:deal' || event.type === 'damage:receive' ||
          event.type === 'heal' || event.type === 'die' ||
          event.type === 'turn:start' || event.type === 'turn:end' ||
          event.type === 'card:play' || event.type === 'card:draw' ||
          event.type === 'card:discard' || event.type === 'card:gain' ||
          event.type === 'phase:start' ||
          event.type === 'phase:end' || event.type === 'judge' ||
          event.type === 'scheme:nullify' ||
          event.type === 'equipment:unequip') {
        const player = game.getPlayer()
        set({
          gameState: game.getState(),
          playerHand: player?.getHand() ?? get().playerHand,
        })
      }
      // 起义 (陈胜): 摸牌前提示 — 设置 qiYiDecision 让 UI 渲染选择面板
      if (event.type === 'phase:start' && event.data?.phase === 'qiYiPrompt' && event.sourceHeroId === game.getPlayer()?.getId()) {
        const candidates = game.getQiYiCandidates(game.getPlayer()!).map(p => ({
          id: p.getId(),
          name: p.getName(),
          handSize: p.getHandSize(),
          hand: p.getHand(),
        }))
        set({
          qiYiDecision: { candidates },
          qiYiStep: 'confirm',
          phase: 'qiYiPrompt',
          treasureSkill: null, treasurePrompt: '',
          treasureTargetIds: [], qiYiCardMap: {},
        })
      }
      // 起义结束: 清空状态
      if (event.type === 'phase:end' && event.data?.phase === 'qiYiPrompt') {
        set({ qiYiDecision: null, qiYiStep: null, phase: 'playing' })
      }
      // 玩家回合开始: 重置 侠胆/驭人 已用标记
      if (event.type === 'turn:start' && event.sourceHeroId === game.getPlayer()?.getId()) {
        set({ xiaDanUsedThisTurn: false, yuRenUsedThisTurn: false })
      }
      // 装备: equippedCards 更新延后到飞行卡动画完成 (onComplete), 避免装备栏立即显示新装备
      // (但 playerHand 需立即同步, 因为手牌已经少了那张装备牌)
      if (event.type === 'equipment:equip' && event.sourceHeroId && event.data) {
        const player = game.getPlayer()
        set({
          playerHand: player?.getHand() ?? get().playerHand,
        })
      }
      if (event.type === 'equipment:unequip' && event.sourceHeroId && event.data) {
        const slot = (event.data as any).slot as EquipmentSlot
        set(s => {
          const heroEquip = { ...(s.equippedCards[event.sourceHeroId!] ?? {}) }
          delete heroEquip[slot]
          return {
            equippedCards: { ...s.equippedCards, [event.sourceHeroId!]: heroEquip }
          }
        })
      }
      // === 飞行卡动画钩子: 5 类事件 → 飞行卡 ===
      const queueFly = (req: { card: Card; fromHeroId: string; sourceType: 'hand' | 'equipment'; sourceRef?: string; targetType: 'discard' | 'equipment' | 'hand'; targetHeroId?: string; targetSlot?: EquipmentSlot; fromPos?: { x: number; y: number }; onComplete?: () => void }) => {
        get()._queueFlyingCard(req)
      }

      if (event.type === 'card:play' && event.data?.cardId) {
        // 指向性卡牌: 画攻击线 (从 source 到 target(s))
        {
          const cardName = (event.data as any)?.cardName as string | undefined
          const sourceId = event.sourceHeroId
          const singleTargetId = event.targetHeroId
          const aoeTargets: string[] =
            ((event.data as any)?.targetHeroIds as string[] | undefined)
            ?? ((event.data as any)?.affectedHeroIds as string[] | undefined)
            ?? (singleTargetId ? [singleTargetId] : [])

          if (sourceId && aoeTargets.length > 0) {
            const from = findHeroCenter(sourceId)
            if (from) {
              const targets = aoeTargets
                .filter(tid => tid !== sourceId)
                .map(tid => findHeroCenter(tid))
                .filter((p): p is { x: number; y: number } => !!p)
              if (targets.length > 0) {
                const now = Date.now()
                const newLines: DirectionalLine[] = targets.map((p, i) => ({
                  id: `${now}-${i}-${Math.random().toString(36).slice(2, 6)}`,
                  fromX: from.x, fromY: from.y,
                  toX: p.x, toY: p.y,
                  cardName: cardName ?? '',
                  createdAt: now,
                }))
                useAnimationStore.getState().addDirectionalLines(newLines)
                setTimeout(() => {
                  useAnimationStore.getState().removeDirectionalLines(newLines.map(n => n.id))
                }, 1100)
              }
            }
          }
        }
        const cardId = event.data.cardId as string
        const heroId = event.sourceHeroId
        if (heroId) {
          // Engine emits after removing card from hand — use the card reference from event data
          const card: Card | undefined = (event.data as any)?.card as Card | undefined
          if (card) {
        const fromPos = get().pendingCardFromPos
        queueFly({ card, fromHeroId: heroId, sourceType: 'hand', sourceRef: cardId, targetType: 'discard', fromPos: fromPos ?? undefined })
        if (fromPos) set({ pendingCardFromPos: null })
      }
        }
      }

      if (event.type === 'equipment:equip' && event.data?.cardId && event.data?.slot) {
        const cardId = event.data.cardId as string
        const slot = (event.data as any).slot as EquipmentSlot
        const heroId = event.sourceHeroId
        if (heroId) {
          const hero = game.getPlayerById(heroId)
          const card = hero?.getEquippedCard(slot)
          if (card) {
        const fromPos = get().pendingCardFromPos
        const onComplete = () => {
          // 飞行卡动画完成后再同步 gameState + equippedCards, 让装备栏此时才显示新装备
          set(s => ({
            gameState: game.getState(),
            equippedCards: {
              ...s.equippedCards,
              [heroId]: { ...s.equippedCards[heroId], [slot]: card }
            },
          }))
        }
        queueFly({ card, fromHeroId: heroId, sourceType: 'hand', sourceRef: cardId, targetType: 'equipment', targetHeroId: heroId, targetSlot: slot, fromPos: fromPos ?? undefined, onComplete })
        if (fromPos) set({ pendingCardFromPos: null })
      }
        }
      }

      if (event.type === 'equipment:unequip' && event.data?.cardId && event.data?.slot) {
        const slot = (event.data as any).slot as EquipmentSlot
        const heroId = event.sourceHeroId
        if (heroId) {
          const hero = game.getPlayerById(heroId)
          let card: Card | undefined = hero?.getHand().find(c => c.id === (event.data as any).cardId)
          if (!card) {
            for (const p of game.players) {
              for (const s of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
                const eq = p.getEquippedCard(s)
                if (eq?.id === (event.data as any).cardId) { card = eq; break }
              }
              if (card) break
            }
          }
          if (card) queueFly({ card, fromHeroId: heroId, sourceType: 'equipment', sourceRef: slot, targetType: 'discard' })
        }
      }

      if (event.type === 'card:discard' && event.sourceHeroId) {
        const heroId = event.sourceHeroId
        const cardsData = (event.data as any)?.cards as string[] | undefined
        if (Array.isArray(cardsData)) {
          for (const cid of cardsData) {
            let card: Card | undefined
            for (const p of game.players) {
              const inHand = p.getHand().find(c => c.id === cid)
              if (inHand) { card = inHand; break }
              for (const s of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
                const eq = p.getEquippedCard(s)
                if (eq?.id === cid) { card = eq; break }
              }
              if (card) break
            }
            if (card) queueFly({ card, fromHeroId: heroId, sourceType: 'hand', sourceRef: cid, targetType: 'discard' })
          }
        }
      }

      if (event.type === 'card:gain' && (event.data as any)?.from && event.sourceHeroId) {
        const fromHeroId = (event.data as any).from as string
        const toHeroId = event.sourceHeroId
        const cardId = (event.data as any).cardId as string | undefined
        const cardsArr = (event.data as any)?.cards as string[] | undefined
        const cardIdsToAnimate = cardId ? [cardId] : (cardsArr ?? [])
        for (const cid of cardIdsToAnimate) {
          const toHero = game.getPlayerById(toHeroId)
          const card = toHero?.getHand().find(c => c.id === cid)
          if (card) queueFly({ card, fromHeroId: fromHeroId, sourceType: 'hand', sourceRef: cid, targetType: 'hand', targetHeroId: toHeroId })
        }
      }
    }

    // 订阅 Worker 转发的 EventBus — 同步 snapshot 再 dispatch handler
    engineProxy.onSnapshot = (snap) => {
      latestSnapshot = snap
      // 关键状态字段同步到 store, 子组件 render 期直接读 store
      set({
        gameState: snap.gameState,
        playerHand: snap.playerHand,
        equippedCards: snap.equippedCardsByHero,
      })
      Object.keys(snap.heroNames).forEach(k => { heroNames[k] = snap.heroNames[k] })
    }
    const unsubs: Array<() => void> = []
    for (const et of allEventTypes) {
      unsubs.push(engineProxy.on(et, handler))
    }

    set({ phase: 'waiting', actionLog: [], result: null, aoJianActive: false, selectedDiscardCards: [], discardCount: 0, resolveDiscard: null, baWangOptions: null, resolveBaWangMount: null })

    try {
      const result = await engineProxy.start({
        playerHeroId: config.playerHeroId,
        playerInstance: config.playerInstance,
        allyHeroIds: config.allyHeroIds,
        allyInstances: config.allyInstances,
        enemyHeroIds: config.enemyHeroIds,
        enemyInstances: config.enemyInstances,
      })
      const finalSnap = engineProxy.latestSnapshot
      set({ phase: 'ended', result, gameState: finalSnap?.gameState ?? null, aoJianActive: false })
      return result
    } catch (err) {
      // 战斗中 engine 抛错: 清理 + 传播
      unsubs.forEach(u => { try { u() } catch { /* noop */ } })
      engineProxy.onSnapshot = null
      set({ phase: 'idle' })
      throw err
    }
  },

  cleanupBattle: () => {
    // 释放 Worker — 战斗页卸载时调用, 防止跨场残留
    if (engineProxy) {
      engineProxy.dispose()
      engineProxy = null
    }
    gameRef = null
    latestSnapshot = null
    Object.keys(heroNames).forEach(k => delete heroNames[k])
  },

  playKill: (cardId: string, fromPos?: { x: number; y: number }) => {
    // 点击同一张pending牌 → 取消
    const { pendingCardId, pendingCardType, selectedTargetId } = get()
    if (pendingCardId === cardId && pendingCardType === 'kill') {
      set({ pendingCardId: null, pendingCardType: null, selectedTargetId: null, pendingCardFromPos: null })
      return
    }
    // 侠胆胜出: 进入多目标选人(每张杀最多xiaDanMultiTargetPerKill目标, 持续整个回合)
    const game = gameRef
    if (game) {
      const maxTargetsP = (game as any).getMaxTargetsPerKill?.() ?? 1
      if (maxTargetsP > 1) {
        const enemies = game.players.filter(p => p.getRole() !== 'player' && p.getRole() !== 'ally' && p.isAlive())
        set({
          phase: 'selectKillMultiTargets',
          pendingCardId: cardId,
          pendingCardType: 'kill',
          killMultiCardId: cardId,
          killMultiMax: maxTargetsP,
          killMultiRemaining: 0,  // 侠胆模式下无"剩余次数"概念
          multiTargetCandidates: enemies.map(p => ({ id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() })),
          selectedTargets: [],
          pendingCardFromPos: fromPos ?? null,
        })
        return
      }
    }
    // 狼牙棒: 最后一张手牌出杀时最多3目标 (含傲剑/武穆 等所有可当杀的牌)
    if (game) {
      const player = game.getPlayer()
      const isKill = game.canPlayerUseAsKill(cardId)
      if (isKill && player?.getWeaponName() === '狼牙棒' && player?.getHandSize() === 1) {
        const enemies = game.players.filter(p => p.getRole() !== 'player' && p.getRole() !== 'ally' && p.isAlive())
        set({
          phase: 'selectKillMultiTargets',
          pendingCardId: cardId,
          pendingCardType: 'kill',
          killMultiCardId: cardId,
          killMultiMax: 3,
          killMultiRemaining: 1,
          multiTargetCandidates: enemies.map(p => ({ id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() })),
          selectedTargets: [],
          pendingCardFromPos: fromPos ?? null,
        })
        return
      }
    }
    // 设置pending, 等玩家点选目标后点确定才真正出牌
    set({
      phase: 'playing',
      pendingCardId: cardId,
      pendingCardType: 'kill',
      selectedTargetId: null,
      pendingCardFromPos: fromPos ?? null,
    })
  },

  playScheme: (cardId: string, fromPos?: { x: number; y: number }) => {
    // 点击同一张pending牌 → 取消
    const { pendingCardId, pendingCardType, playerHand } = get()
    if (pendingCardId === cardId && pendingCardType === 'scheme') {
      set({ pendingCardId: null, pendingCardType: null, selectedTargetId: null, pendingCardFromPos: null })
      return
    }
    // 所有锦囊统一走 selectTarget 选目标, 跟杀一样的流程
    const card = playerHand.find(c => c.id === cardId)
    if (!card) return

    if (card.name === '借刀杀人') {
      // 借刀: 走 pending+confirm 流程 (1阶段选持武器玩家), 与其他牌一致
      const game = gameRef
      if (!game) return
      const player = game.getPlayer()
      if (!player) return
      const holders = game.players.filter(p =>
        p.isAlive() && p.getId() !== player.getId() && p.getEquippedCard('weapon'),
      ).map(p => ({ id: p.getId(), name: p.getName() }))
      set({
        phase: 'playing',
        pendingCardId: cardId,
        pendingCardType: 'scheme',
        selectedTargetId: null,
        jieDaoHolders: holders,
        jieDaoCandidates: [],
        pendingCardFromPos: fromPos ?? null,
      })
      return
    }

    // 探囊/釜底/其他锦囊: 设置pending, 等玩家点选目标后点确定才真正出牌
    set({
      phase: 'playing',
      pendingCardId: cardId,
      pendingCardType: 'scheme',
      selectedTargetId: null,
      pendingCardFromPos: fromPos ?? null,
    })
  },

  playSchemeSelf: (cardId: string, fromPos?: { x: number; y: number }) => {
    // 点击同一张pending牌 → 取消
    const { pendingCardId, pendingCardType } = get()
    if (pendingCardId === cardId && pendingCardType === 'schemeSelf') {
      set({ pendingCardId: null, pendingCardType: null, pendingCardFromPos: null })
      return
    }
    // 设置pending, 等待玩家点"确定"
    set({
      pendingCardId: cardId,
      pendingCardType: 'schemeSelf',
      selectedTargetId: null,
      pendingCardFromPos: fromPos ?? null,
    })
  },

  confirmTarget: (targetId: string) => {
    // 仅设置选中目标, 不立即commit (由 confirmPlay 真正出牌)
    set({ selectedTargetId: targetId })
  },

  confirmPlay: () => {
    const { pendingCardId, pendingCardType, selectedTargetId, jieDaoHolders, jieDaoCandidates, resolveAction, resolveJieDaoTarget } = get()
    if (!pendingCardId) return

    // 借刀杀人 step 2: 走 engine handler (无 resolveAction, 用 resolveJieDaoTarget)
    if (pendingCardType === 'scheme' && jieDaoCandidates.length > 0) {
      if (!resolveJieDaoTarget || !selectedTargetId) return
      const targetId = selectedTargetId
      set({
        pendingCardId: null,
        pendingCardType: null,
        selectedTargetId: null,
        resolveJieDaoTarget: null,
        jieDaoCandidates: [],
      })
      resolveJieDaoTarget(targetId)
      return
    }

    if (!resolveAction) return

    // 借刀杀人 step 1: 走 action resolution
    if (pendingCardType === 'scheme' && jieDaoHolders.length > 0) {
      if (!selectedTargetId || !jieDaoHolders.some(h => h.id === selectedTargetId)) return
      resolveAction(`jieDao:${pendingCardId}:${selectedTargetId}`)
      set({
        pendingCardId: null,
        pendingCardType: null,
        selectedTargetId: null,
        resolveAction: null,
        jieDaoHolders: [],
      })
      return
    }

    if (pendingCardType === 'kill' || pendingCardType === 'scheme') {
      if (!selectedTargetId) return  // 需选目标但未选
      const prefix = pendingCardType === 'scheme' ? 'scheme' : 'kill'
      resolveAction(`${prefix}:${pendingCardId}:${selectedTargetId}`)
    } else if (pendingCardType === 'schemeSelf') {
      resolveAction(`scheme:${pendingCardId}:`)
    } else if (pendingCardType === 'heal') {
      resolveAction(`heal:${pendingCardId}`)
    } else if (pendingCardType === 'equip') {
      resolveAction(`equip:${pendingCardId}`)
    } else {
      return
    }
    set({
      pendingCardId: null,
      pendingCardType: null,
      selectedTargetId: null,
      resolveAction: null,
    })
  },

  cancelPlay: () => {
    const { resolveJieDaoTarget } = get()
    set({
      pendingCardId: null,
      pendingCardType: null,
      selectedTargetId: null,
      jieDaoHolders: [],
      jieDaoCandidates: [],
    })
    if (resolveJieDaoTarget) {
      set({ resolveJieDaoTarget: null })
      resolveJieDaoTarget(null)
    }
  },

  playHeal: (cardId: string, fromPos?: { x: number; y: number }) => {
    // 点击同一张pending牌 → 取消
    const { pendingCardId, pendingCardType } = get()
    if (pendingCardId === cardId && pendingCardType === 'heal') {
      set({ pendingCardId: null, pendingCardType: null, pendingCardFromPos: null })
      return
    }
    // 设置pending, 等待玩家点"确定"
    set({
      pendingCardId: cardId,
      pendingCardType: 'heal',
      selectedTargetId: null,
      pendingCardFromPos: fromPos ?? null,
    })
  },

  equipCard: (cardId: string, fromPos?: { x: number; y: number }) => {
    // 点击同一张pending牌 → 取消
    const { pendingCardId, pendingCardType } = get()
    if (pendingCardId === cardId && pendingCardType === 'equip') {
      set({ pendingCardId: null, pendingCardType: null, pendingCardFromPos: null })
      return
    }
    // 设置pending, 等待玩家点"确定"
    set({
      pendingCardId: cardId,
      pendingCardType: 'equip',
      selectedTargetId: null,
      pendingCardFromPos: fromPos ?? null,
    })
  },

  endPlayPhase: () => {
    const { resolveAction } = get()
    if (!resolveAction) return
    resolveAction('endPhase')
    set({ resolveAction: null })
  },

  cancelSelection: () => {
    set({ phase: 'playing', pendingCardId: null, pendingCardType: null, pendingCardFromPos: null })
  },

  judgeReplace: (cardId: string | null) => {
    const { resolveJudge } = get()
    if (!resolveJudge) return
    resolveJudge(cardId)
    set({ resolveJudge: null, judgeCard: null })
  },

  toggleAoJian: () => {
    const game = gameRef
    const { phase } = get()
    if (phase !== 'playing' && phase !== 'awaitingResponse') return
    const player = game?.getPlayer()
    if (!player || !player.hasSkillOrTreasure('ao-jian')) return
    if (!game) return
    if (game.isAoJianActive(player.getId())) {
      game.deactivateAoJian(player.getId())
      set({ aoJianActive: false })
    } else {
      game.activateAoJian(player.getId())
      set({ aoJianActive: true })
    }
  },

  respondWithCard: (cardId: string | null) => {
    const { resolveResponse } = get()
    if (!resolveResponse) return
    resolveResponse(cardId)
  },

  // 狼牙棒多目标
  toggleTarget: (targetId: string) => {
    const { selectedTargets } = get()
    if (selectedTargets.includes(targetId)) {
      set({ selectedTargets: selectedTargets.filter(id => id !== targetId) })
    } else if (selectedTargets.length < 3) {
      set({ selectedTargets: [...selectedTargets, targetId] })
    }
  },
  confirmMultiTarget: () => {
    const { resolveMultiTarget, selectedTargets } = get()
    if (!resolveMultiTarget) return
    resolveMultiTarget(selectedTargets)
    set({ resolveMultiTarget: null, multiTargetCandidates: [], selectedTargets: [], phase: 'playing' })
  },
  cancelMultiTarget: () => {
    const { resolveMultiTarget } = get()
    if (!resolveMultiTarget) return
    resolveMultiTarget([])
    set({ resolveMultiTarget: null, multiTargetCandidates: [], selectedTargets: [], phase: 'playing' })
  },

  // 侠胆多杀(每张杀最多2目标)
  toggleKillMultiTarget: (targetId: string) => {
    const { selectedTargets, killMultiMax, killMultiCardId, resolveAction } = get()
    if (!killMultiCardId || !resolveAction) return
    if (selectedTargets.includes(targetId)) {
      set({ selectedTargets: selectedTargets.filter(id => id !== targetId) })
    } else if (selectedTargets.length < (killMultiMax || 2)) {
      // 跳过已在 selectedTargets 里的: 不能选同一目标两次
      set({ selectedTargets: [...selectedTargets, targetId] })
    }
  },
  confirmKillMultiTarget: () => {
    const { selectedTargets, killMultiCardId, resolveAction, killMultiRemaining, killMultiMax } = get()
    if (!killMultiCardId || !resolveAction) return
    if (selectedTargets.length === 0) {
      // 取消: 退回到playing
      resolveAction(null)
      set({ resolveAction: null, phase: 'playing', multiTargetCandidates: [], selectedTargets: [], killMultiCardId: null, pendingCardId: null, pendingCardType: null, pendingCardFromPos: null })
      return
    }
    // 用killMulti前缀传多个目标(逗号分隔); 狼牙棒额外传maxTargets参数
    const game = gameRef
    const isWolfFang = !!game && game.getPlayer()?.getWeaponName() === '狼牙棒' && killMultiMax === 3
    const payload = isWolfFang
      ? `killMulti:${killMultiCardId}:${selectedTargets.join(',')}:3`
      : `killMulti:${killMultiCardId}:${selectedTargets.join(',')}`
    resolveAction(payload)
    set({ resolveAction: null, phase: 'waiting', multiTargetCandidates: [], selectedTargets: [], killMultiCardId: null, pendingCardId: null, pendingCardType: null, pendingCardFromPos: null, killMultiRemaining: 0 })
  },
  cancelKillMultiTarget: () => {
    const { resolveAction } = get()
    if (!resolveAction) return
    resolveAction(null)
    set({ resolveAction: null, phase: 'playing', multiTargetCandidates: [], selectedTargets: [], killMultiCardId: null, pendingCardId: null, pendingCardType: null, pendingCardFromPos: null })
  },

  // 芦叶枪选2张手牌 (选满2张后由 confirmDualCards 手动确认)
  toggleDualCard: (cardId: string) => {
    const { selectedDualCards } = get()
    const picked = selectedDualCards
    let nextPicked: string[]
    if (picked.includes(cardId)) {
      nextPicked = picked.filter(id => id !== cardId)
    } else if (picked.length < 2) {
      nextPicked = [...picked, cardId]
    } else {
      return
    }
    set({ selectedDualCards: nextPicked })
  },
  confirmDualCards: () => {
    const { resolveDualCard, selectedDualCards } = get()
    if (!resolveDualCard) return
    if (selectedDualCards.length !== 2) return
    resolveDualCard(selectedDualCards)
    // 第一张当杀 - 高亮显示【杀】徽章, 让玩家看到"杀的提示"再选目标
    set({
      resolveDualCard: null,
      selectedDualCards: [],
      luYeQiangKillCardId: selectedDualCards[0],
      phase: 'playing',
    })
  },
  cancelDualCards: () => {
    const { resolveDualCard } = get()
    if (!resolveDualCard) return
    resolveDualCard([])
    set({ resolveDualCard: null, selectedDualCards: [], luYeQiangKillCardId: null, phase: 'playing' })
  },
  selectLuYeQiangTarget: (targetId: string) => {
    const { resolveLuYeQiangTarget } = get()
    if (!resolveLuYeQiangTarget) return
    resolveLuYeQiangTarget(targetId)
    set({ resolveLuYeQiangTarget: null, luYeQiangCandidates: [], luYeQiangKillCardId: null, phase: 'playing' })
  },
  cancelLuYeQiangTarget: () => {
    const { resolveLuYeQiangTarget } = get()
    if (!resolveLuYeQiangTarget) return
    resolveLuYeQiangTarget(null)
    set({ resolveLuYeQiangTarget: null, luYeQiangCandidates: [], luYeQiangKillCardId: null, phase: 'playing' })
  },

  // 龙鳞刀
  toggleLongLinCard: (cardId: string) => {
    const { longLinSelectedCards } = get()
    if (longLinSelectedCards.includes(cardId)) {
      useBattleStore.setState({ longLinSelectedCards: longLinSelectedCards.filter(id => id !== cardId) })
    } else if (longLinSelectedCards.length < 2) {
      useBattleStore.setState({ longLinSelectedCards: [...longLinSelectedCards, cardId] })
    }
  },
  confirmLongLinPick: () => {
    const { resolveLongLin, longLinSelectedCards } = get()
    if (!resolveLongLin || longLinSelectedCards.length === 0) return
    resolveLongLin(longLinSelectedCards)
    set({ resolveLongLin: null, longLinTargetInfo: null, longLinSelectedCards: [], phase: 'playing' })
  },
  cancelLongLinPick: () => {
    const { resolveLongLin } = get()
    if (!resolveLongLin) return
    resolveLongLin(null)
    set({ resolveLongLin: null, longLinTargetInfo: null, longLinSelectedCards: [], phase: 'playing' })
  },

  // 借刀杀人 (pending+confirm 流程统一通过 confirmTarget/confirmPlay/cancelPlay 处理)
  // 保留以下方法仅为兼容旧调用, 实际不再使用 (UI 已切到 confirmTarget)
  selectJieDaoHolder: (_holderId: string) => {
    // noop: 借刀 step 1 由 confirmPlay 处理
  },
  cancelJieDaoHolder: () => {
    // 兼容: 清除step 1的holders
    set({ jieDaoHolders: [] })
  },
  selectJieDaoTarget: (_targetId: string) => {
    // noop: 借刀 step 2 由 confirmPlay 处理
  },
  cancelJieDaoTarget: () => {
    // 兼容: 走cancelPlay统一处理 (会 resolveJieDaoTarget(null))
    const { resolveJieDaoTarget } = get()
    set({ jieDaoCandidates: [], pendingCardId: null, pendingCardType: null, selectedTargetId: null })
    if (resolveJieDaoTarget) {
      set({ resolveJieDaoTarget: null })
      resolveJieDaoTarget(null)
    }
  },

  // 探囊取物
  selectTanNangTarget: (targetId: string) => {
    const { resolveTanNangTarget } = get()
    if (!resolveTanNangTarget) return
    resolveTanNangTarget(targetId)
    set({ resolveTanNangTarget: null })
  },
  cancelTanNangTarget: () => {
    const { resolveTanNangTarget } = get()
    if (!resolveTanNangTarget) return
    resolveTanNangTarget(null)
    set({ resolveTanNangTarget: null })
  },
  selectTanNangCard: (cardId: string | null) => {
    const { resolveTanNangPick } = get()
    if (!resolveTanNangPick) return
    resolveTanNangPick(cardId)
    set({ resolveTanNangPick: null, tanNangTargetInfo: null })
  },
  cancelTanNangCard: () => {
    const { resolveTanNangPick } = get()
    if (!resolveTanNangPick) return
    resolveTanNangPick(null)
    set({ resolveTanNangPick: null, tanNangTargetInfo: null })
  },

  // 五谷丰登
  selectWuguCard: (cardId: string) => {
    const { resolveWuguPick } = get()
    if (!resolveWuguPick) return
    resolveWuguPick(cardId)
    // 不关弹框 — 等所有 picker 选完 (card:gain from:'wugu' 累计到 wuguPicks)
    set({ resolveWuguPick: null })
  },
  cancelWuguPick: () => {
    const { resolveWuguPick } = get()
    if (!resolveWuguPick) return
    resolveWuguPick(null)
    set({ resolveWuguPick: null, wuguCandidates: null, wuguPicks: [], wuguTotalPickers: 0, phase: 'playing' })
  },

  // 釜底抽薪
  selectFudiTarget: (targetId: string) => {
    const { resolveFudiTarget } = get()
    if (!resolveFudiTarget) return
    resolveFudiTarget(targetId)
    set({ resolveFudiTarget: null })
  },
  cancelFudiTarget: () => {
    const { resolveFudiTarget } = get()
    if (!resolveFudiTarget) return
    resolveFudiTarget(null)
    set({ resolveFudiTarget: null })
  },
  selectFudiCard: (cardId: string | null) => {
    const { resolveFudiPick } = get()
    if (!resolveFudiPick) return
    resolveFudiPick(cardId)
    set({ resolveFudiPick: null, fudiTargetInfo: null })
  },
  cancelFudiCard: () => {
    const { resolveFudiPick } = get()
    if (!resolveFudiPick) return
    resolveFudiPick(null)
    set({ resolveFudiPick: null, fudiTargetInfo: null })
  },

  // 法家
  selectFaJiaCard: (cardId: string | null) => {
    const { resolveFaJiaPick } = get()
    if (!resolveFaJiaPick) return
    resolveFaJiaPick(cardId)
    set({ resolveFaJiaPick: null, faJiaTargetInfo: null })
  },
  cancelFaJiaCard: () => {
    const { resolveFaJiaPick } = get()
    if (!resolveFaJiaPick) return
    resolveFaJiaPick(null)
    set({ resolveFaJiaPick: null, faJiaTargetInfo: null })
  },

  // 宝具技能
  useTreasureSkill: (skill) => {
    const game = gameRef
    const { playerHand } = get()
    const player = game?.getPlayer()
    if (!player) return
    set({ treasureSkill: skill, treasureCardIds: [], treasureTargetIds: [], xiaDanActive: false })
    if (skill === 'liao-shang') {
      if (playerHand.length === 0) { set({ treasureSkill: null, treasurePrompt: '' }); return }
      set({ phase: 'treasureSelectCard', treasurePrompt: '【疗伤】选择1张手牌弃置' })
    } else if (skill === 'zhi-yu') {
      if (playerHand.length < 2) { set({ treasureSkill: null, treasurePrompt: '手牌不足2张' }); return }
      set({ phase: 'treasureSelect2Cards', treasurePrompt: `【治愈】选择2张手牌弃置 (已选 0/2)` })
    } else if (skill === 'feng-huo') {
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      const equipped = slots.map(s => player.getEquippedCard(s)).filter((c): c is Card => !!c)
      if (equipped.length === 0) { set({ treasureSkill: null, treasurePrompt: '无装备牌可弃' }); return }
      set({ phase: 'treasureSelectEquipment', treasurePrompt: '【烽火】选择1张装备区装备弃置' })
    } else if (skill === 'jue-ji') {
      set({ phase: 'treasureSelectTarget', treasurePrompt: '【绝击】选择攻击范围内的1名角色 (无武器则自己掉1血)' })
    } else if (skill === 'qi-yi') {
      set({ phase: 'treasureSelectTargets', treasurePrompt: '【起义】选择至多2名其他角色 (各获得1张手牌), 点确认结束' })
    } else if (skill === 'shi-quan') {
      // 释权: 黑桃/梅花手牌 或 装备区任意
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      const hasBlack = playerHand.some(c => c.suit === 'spade' || c.suit === 'club')
      const hasEquip = slots.some(s => !!player.getEquippedCard(s))
      if (!hasBlack && !hasEquip) { set({ treasureSkill: null, treasurePrompt: '无黑色手牌或装备可弃' }); return }
      set({ phase: 'treasureSelectCard', treasurePrompt: '【释权】选择1张黑色手牌或装备区的牌, 当釜底抽薪使用' })
    } else if (skill === 'xia-dan') {
      // 侠胆: 仅内部标记状态, 不弹浮层; 玩家自己点有手牌的角色
      if (playerHand.length === 0) { set({ treasureSkill: null, treasurePrompt: '无手牌' }); return }
      const { xiaDanActive } = get()
      if (xiaDanActive) {
        // 再次点击 = 取消
        set({ xiaDanActive: false, phase: 'playing', treasurePrompt: '' })
        return
      }
      const candidates = game!.players.filter(p => p.getId() !== player.getId() && p.isAlive() && p.getHandSize() > 0)
      if (candidates.length === 0) { set({ treasureSkill: null, treasurePrompt: '无可拼点目标' }); return }
      set({
        xiaDanActive: true,
        phase: 'treasureSelectTarget',
        treasurePrompt: '',
        treasureCardIds: [],
      })
    } else if (skill === 'yu-ren') {
      if (get().yuRenUsedThisTurn) { set({ treasureSkill: null, treasurePrompt: '本回合已使用过驭人' }); return }
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      const hasEquip = slots.some(s => !!player.getEquippedCard(s))
      if (playerHand.length === 0 && !hasEquip) { set({ treasureSkill: null, treasurePrompt: '无手牌或装备可弃' }); return }
      set({ phase: 'treasureSelectCard', treasurePrompt: `【驭人】选择要弃置的手牌或装备 (弃X摸X)`, yuRenCardIds: [] })
    }
  },

  pickTreasureCard: async (cardId) => {
    const game = gameRef
    const { treasureSkill, treasureCardIds, playerHand } = get()
    if (!treasureSkill) return
    const player = game!.getPlayer()!
    // 检查手牌和装备区
    let card = playerHand.find((c: Card) => c.id === cardId)
    if (!card) {
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      card = slots.map(s => player.getEquippedCard(s)).find((c: Card | undefined) => c?.id === cardId) ?? undefined
    }
    if (!card) return

    if (treasureSkill === 'liao-shang') {
      // 选完卡 → 选目标
      set({ treasureCardIds: [cardId], phase: 'treasureSelectTarget', treasurePrompt: '【疗伤】选择1名角色 (回复1血)' })
    } else if (treasureSkill === 'zhi-yu') {
      const next = [...treasureCardIds, cardId]
      if (next.length < 2) {
        set({ treasureCardIds: next, treasurePrompt: `【治愈】选择2张手牌弃置 (已选 ${next.length}/2)` })
      } else {
        set({ treasureCardIds: next, phase: 'treasureSelectTarget', treasurePrompt: '【治愈】选择1名角色 (回复1血)' })
      }
    } else if (treasureSkill === 'feng-huo') {
      // 直接执行 (playerFengHuo 是 async, 必须 await 才能拿到妙计/乾坤袋的摸牌)
      // 提前清掉 treasureSkill/按钮高亮, 避免 await 期间触发的复仇 prompt 与烽火"选装备"状态叠加
      set({ treasureSkill: null, treasurePrompt: '' })
      await game!.playerFengHuo(player, cardId)
      set({ phase: 'playing', gameState: game!.getState(), playerHand: player.getHand() })
    } else if (treasureSkill === 'yu-ren') {
      const { yuRenCardIds } = get()
      const next = yuRenCardIds.includes(cardId)
        ? yuRenCardIds.filter(id => id !== cardId)
        : [...yuRenCardIds, cardId]
      set({ yuRenCardIds: next, treasurePrompt: `【驭人】选择要弃置的手牌 (已选 ${next.length}张) — 选好后点"确认驭人"` })
    } else if (treasureSkill === 'shi-quan') {
      // 校验: 手牌必须是黑色, 装备区任意
      const fromHand = playerHand.find((c: Card) => c.id === cardId)
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      const fromEquip = slots.map(s => player.getEquippedCard(s)).find((c): c is Card => !!c && c.id === cardId)
      const valid = fromHand
        ? (fromHand.suit === 'spade' || fromHand.suit === 'club')
        : !!fromEquip
      if (!valid) return
      // 释权: 异步, 引擎内部会走釜底抽薪的fudiTarget/fudiPick handler
      await game!.playerShiQuan(player, cardId)
      set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], gameState: game!.getState(), playerHand: player.getHand() })
    }
    // 注: 侠胆不走 pickTreasureCard, 它先选目标再选自己手牌
  },

  pickTreasureTarget: async (targetId) => {
    const game = gameRef
    const { treasureSkill, treasureCardIds, treasureTargetIds, xiaDanActive } = get()
    if (!treasureSkill && !xiaDanActive) return
    const player = game!.getPlayer()!

    if (treasureSkill === 'liao-shang') {
      const target = game!.getPlayerById(targetId)
      if (!target || target.getCurrentHp() <= 0 || target.getCurrentHp() >= target.getMaxHp()) return
      game!.playerLiaoShang(player, treasureCardIds[0], targetId)
      set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], gameState: game!.getState(), playerHand: player.getHand() })
    } else if (treasureSkill === 'zhi-yu') {
      const target = game!.getPlayerById(targetId)
      if (!target || target.getCurrentHp() <= 0 || target.getCurrentHp() >= target.getMaxHp()) return
      game!.playerZhiYu(player, treasureCardIds, targetId)
      set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], gameState: game!.getState(), playerHand: player.getHand() })
    } else if (treasureSkill === 'jue-ji') {
      // 检查手牌或装备区有无武器, 有则询问, 没有则受1伤
      const hasHandWeapon = player.getHand().some(c => c.type === 'equipment' && (c as any).slot === 'weapon')
      const hasEquippedWeapon = !!player.getEquippedCard('weapon')
      if (hasHandWeapon || hasEquippedWeapon) {
        set({ treasureTargetIds: [targetId], phase: 'treasureSelectWeapon', treasurePrompt: '【绝击】选择装备区或手牌里的武器弃置, 或点"受1血"直接执行' })
      } else {
        await game!.playerJueJi(player, null, targetId)
        set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', gameState: game!.getState(), playerHand: player.getHand() })
      }
    } else if (xiaDanActive) {
      // 侠胆: 双方同时选牌, 玩家不会看到对方出了什么
      const target = game!.getPlayerById(targetId)
      const targetName = target?.getName() ?? targetId
      // 防御: 选中的目标无手牌则直接拒绝
      if (!target || target.getHandSize() === 0) return
      set({ xiaDanTargetName: targetName, xiaDanActive: false, xiaDanUsedThisTurn: true })
      // 引擎内部双方同时选牌: target 通过 pinDianHandler, 玩家通过 xiaDanPlayerCardHandler
      game!.playerXiaDan(player, targetId).then(() => {
        // 引擎完成后清理
        const g = gameRef
        const cur = get()
        if (cur.phase === 'xiaDanPickCard') {
          set({ phase: 'playing', treasureSkill: null, treasurePrompt: '', treasureCardIds: [], xiaDanOpponentCard: null, xiaDanTargetName: null, gameState: g!.getState() ?? null, playerHand: g!.getPlayer()?.getHand() ?? [] })
        } else {
          set({ treasureSkill: null, treasurePrompt: '', treasureCardIds: [], xiaDanOpponentCard: null, xiaDanTargetName: null, gameState: g!.getState() ?? null, playerHand: g!.getPlayer()?.getHand() ?? [] })
        }
      })
    }
  },

  confirmTreasureTargets: () => {
    const game = gameRef
    const { treasureSkill, treasureTargetIds } = get()
    if (!treasureSkill) return
    const player = game!.getPlayer()!
    if (treasureSkill === 'qi-yi') {
      // 起义: 选完目标后进入选牌阶段, 让玩家从每个target手牌里各拿1张
      set({
        phase: 'treasureSelectQiYiCards',
        treasurePrompt: '【起义】从每个目标手牌中各选1张, 选好后点"确认起义"',
        qiYiCardMap: {},
      })
    }
  },

  /** 起义: 选中/取消目标的一张手牌 */
  pickQiYiCard: (targetId: string, cardId: string) => {
    const game = gameRef
    const { qiYiCardMap, treasureTargetIds } = get()
    if (!treasureTargetIds.includes(targetId)) return
    const target = game?.getPlayerById(targetId)
    if (!target) return
    // 校验: 该card必须确实在该target的手牌里
    if (!target.getHand().some(c => c.id === cardId)) return
    const next = { ...qiYiCardMap }
    if (next[targetId] === cardId) {
      delete next[targetId]
    } else {
      next[targetId] = cardId
    }
    set({ qiYiCardMap: next })
  },

  /** 起义: 确认选牌, 执行业务 */
  confirmQiYiCards: () => {
    const game = gameRef
    const { treasureTargetIds, qiYiCardMap } = get()
    const player = game!.getPlayer()!
    game!.playerQiYi(player, treasureTargetIds, qiYiCardMap)
    set({
      treasureSkill: null, treasurePrompt: '', phase: 'playing',
      treasureTargetIds: [], qiYiCardMap: {},
      gameState: game!.getState(), playerHand: player.getHand(),
    })
  },

  /** 起义 (摸牌前): 切换选中/取消目标 (至多2名, 仅 pickTargets 步骤生效) */
  pickQiYiDecisionTarget: (targetId: string) => {
    const { qiYiDecision, qiYiStep, treasureTargetIds } = get()
    if (!qiYiDecision || qiYiStep !== 'pickTargets') return
    // 没手牌的目标不可选 (UI 灰掉, 这里再防御一次)
    const cand = qiYiDecision.candidates.find(c => c.id === targetId)
    if (!cand || cand.handSize === 0) return
    if (treasureTargetIds.includes(targetId)) {
      set({ treasureTargetIds: treasureTargetIds.filter(id => id !== targetId) })
      // 取消时清掉其 cardMap
      set(s => {
        const next = { ...s.qiYiCardMap }
        delete next[targetId]
        return { qiYiCardMap: next }
      })
    } else {
      if (treasureTargetIds.length >= 2) return
      set({ treasureTargetIds: [...treasureTargetIds, targetId] })
    }
  },

  /** 起义 (摸牌前): 给已选目标挑1张手牌 (仅 pickCards 步骤, 选完自动推进/resolve) */
  pickQiYiDecisionCard: (targetId: string, cardId: string) => {
    const game = gameRef
    const { qiYiStep, treasureTargetIds, qiYiCardMap } = get()
    if (qiYiStep !== 'pickCards') return
    if (!treasureTargetIds.includes(targetId)) return
    const next = { ...qiYiCardMap }
    if (next[targetId] === cardId) {
      // 取消选中
      delete next[targetId]
      set({ qiYiCardMap: next })
      return
    }
    next[targetId] = cardId
    // 检查是否所有目标都已选完, 是则 resolve
    if (treasureTargetIds.every(tid => next[tid])) {
      game!.resolveQiYiDecision({ useIt: true, targetIds: treasureTargetIds, cardMap: next })
    } else {
      set({ qiYiCardMap: next })
    }
  },

  /** 起义 (摸牌前): 根据当前 step 执行不同操作 */
  confirmQiYiDecision: () => {
    const { qiYiStep, treasureTargetIds } = get()
    if (!qiYiStep) return
    if (qiYiStep === 'confirm') {
      // 进入选目标
      set({ qiYiStep: 'pickTargets' })
    } else if (qiYiStep === 'pickTargets') {
      // 至少选 1 个目标才进入抽牌
      if (treasureTargetIds.length === 0) return
      set({ qiYiStep: 'pickCards' })
    }
    // pickCards 步骤不需要此按钮 (挑牌即自动推进/resolve)
  },

  /** 起义 (摸牌前): 根据当前 step 执行不同回退/取消 */
  cancelQiYiDecision: () => {
    const { qiYiStep } = get()
    if (!qiYiStep) return
    if (qiYiStep === 'confirm') {
      // 放弃发动
      gameRef!.resolveQiYiDecision({ useIt: false })
    } else if (qiYiStep === 'pickTargets') {
      // 回到确认步骤, 清空已选目标
      set({ qiYiStep: 'confirm', treasureTargetIds: [], qiYiCardMap: {} })
    } else if (qiYiStep === 'pickCards') {
      // 回到选目标步骤, 清空已选牌 (保留已选目标, 让用户重新选)
      set({ qiYiStep: 'pickTargets', qiYiCardMap: {} })
    }
  },

  confirmYuRenCards: () => {
    const game = gameRef
    const { treasureSkill, yuRenCardIds } = get()
    if (!treasureSkill || treasureSkill !== 'yu-ren') return
    if (yuRenCardIds.length === 0) return
    const player = game!.getPlayer()!
    game!.playerYuRen(player, yuRenCardIds)
    set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', yuRenCardIds: [], yuRenUsedThisTurn: true, gameState: game!.getState(), playerHand: player.getHand() })
  },

  /** 绝击: 子组件 (HeroBattleCard 装备区武器 / PlayerHand 手牌武器 / 浮层"受1血") 触发. */
  playerJueJiSelf: async (weaponCardId) => {
    const game = gameRef
    if (!game) return
    const { treasureTargetIds } = get()
    const player = game.getPlayer()
    if (!player) return
    await game.playerJueJi(player, weaponCardId, treasureTargetIds[0])
    set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], treasureTargetIds: [], gameState: game.getState(), playerHand: player.getHand() })
  },

  cancelTreasureSkill: () => {
    set({
      treasureSkill: null, treasurePrompt: '', phase: 'playing',
      treasureCardIds: [], treasureTargetIds: [], yuRenCardIds: [],
      qiYiCardMap: {},
      xiaDanOpponentCard: null, xiaDanTargetName: null, xiaDanActive: false,
    })
    // 若引擎还在 await 侠胆选牌, 也告知取消
    const { resolveXiaDanCard } = get()
    if (resolveXiaDanCard) {
      resolveXiaDanCard(null)
      set({ resolveXiaDanCard: null })
    }
  },

  // 侠胆: 玩家选自己的拼点牌
  pickXiaDanCard: (cardId: string) => {
    const { resolveXiaDanCard } = get()
    if (!resolveXiaDanCard) return
    resolveXiaDanCard(cardId)
  },
  cancelXiaDanCard: () => {
    const { resolveXiaDanCard } = get()
    if (!resolveXiaDanCard) return
    resolveXiaDanCard(null)
  },
  cancelXiaDan: () => {
    set({ xiaDanActive: false, phase: 'playing', treasurePrompt: '' })
  },

  // 弃牌阶段选牌
  toggleDiscardCard: (cardId: string) => {
    const { selectedDiscardCards, discardCount } = get()
    if (selectedDiscardCards.includes(cardId)) {
      set({ selectedDiscardCards: selectedDiscardCards.filter(id => id !== cardId) })
    } else if (selectedDiscardCards.length < discardCount) {
      set({ selectedDiscardCards: [...selectedDiscardCards, cardId] })
    }
  },
  confirmDiscardCards: () => {
    const { resolveDiscard, selectedDiscardCards, discardCount } = get()
    if (!resolveDiscard) return
    // 选够了才确认
    if (selectedDiscardCards.length >= discardCount) {
      resolveDiscard(selectedDiscardCards)
    }
    set({ resolveDiscard: null, selectedDiscardCards: [], discardCount: 0 })
  },
  cancelDiscardCards: () => {
    const { resolveDiscard } = get()
    if (!resolveDiscard) return
    resolveDiscard([])
    set({ resolveDiscard: null, selectedDiscardCards: [], discardCount: 0 })
  },

  // 霸王弓选马
  selectBaWangMount: (mountSlot: 'attackMount' | 'defenseMount') => {
    const { resolveBaWangMount } = get()
    if (!resolveBaWangMount) return
    resolveBaWangMount(mountSlot)
    set({ resolveBaWangMount: null, baWangOptions: null })
  },

  // 刺客: 使用 / 不用
  confirmCiKe: () => {
    const { resolveCiKe } = get()
    if (!resolveCiKe) return
    resolveCiKe(true)
    set({ resolveCiKe: null, ciKePrompt: null })
  },
  cancelCiKe: () => {
    const { resolveCiKe } = get()
    if (!resolveCiKe) return
    resolveCiKe(false)
    set({ resolveCiKe: null, ciKePrompt: null })
  },

  // 玉如意: 使用 / 不用
  confirmYuRuYi: () => {
    const { resolveYuRuYi } = get()
    if (!resolveYuRuYi) return
    resolveYuRuYi(true)
    set({ resolveYuRuYi: null, yuRuYiPrompt: null })
  },
  cancelYuRuYi: () => {
    const { resolveYuRuYi } = get()
    if (!resolveYuRuYi) return
    resolveYuRuYi(false)
    set({ resolveYuRuYi: null, yuRuYiPrompt: null })
  },

  // 蝶魂: 发动 / 不发动
  confirmDieHun: () => {
    const { resolveDieHun } = get()
    if (!resolveDieHun) return
    resolveDieHun(true)
    set({ resolveDieHun: null, dieHunPrompt: null })
  },
  cancelDieHun: () => {
    const { resolveDieHun } = get()
    if (!resolveDieHun) return
    resolveDieHun(false)
    set({ resolveDieHun: null, dieHunPrompt: null })
  },

  // 曼舞: 选择转移目标 / 取消 = 不发动
  selectManWuCard: (cardId: string | null) => {
    // 标记当前选中的牌, 不 resolve
    set({ manWuSelectedCardId: cardId })
  },
  confirmManWuCard: () => {
    const { resolveManWuPickCard, manWuSelectedCardId, manWuRedHeartCards } = get()
    if (!resolveManWuPickCard) return
    if (manWuSelectedCardId && !manWuRedHeartCards.some(c => c.id === manWuSelectedCardId)) {
      resolveManWuPickCard(null)
    } else {
      resolveManWuPickCard(manWuSelectedCardId)
    }
    set({ resolveManWuPickCard: null, manWuRedHeartCards: [], manWuSelectedCardId: null })
  },
  selectManWuTarget: (targetId: string) => {
    const { resolveManWu } = get()
    if (!resolveManWu) return
    resolveManWu(targetId)
    set({ resolveManWu: null, manWuPrompt: null })
  },
  cancelManWu: () => {
    const { resolveManWuPickCard, resolveManWu } = get()
    if (resolveManWuPickCard) {
      resolveManWuPickCard(null)
      set({ resolveManWuPickCard: null, manWuRedHeartCards: [], manWuSelectedCardId: null })
    } else if (resolveManWu) {
      resolveManWu(null)
      set({ resolveManWu: null, manWuPrompt: null })
    }
  },

  // 天香: 选1张手牌弃掉免判 / 取消 = 不发动
  selectTianXiangCard: (cardId: string | null) => {
    const { resolveTianXiang, playerHand, tianXiangEquipment } = get()
    if (!resolveTianXiang) return
    // 校验牌在手牌或装备区中
    if (cardId && !playerHand.some(c => c.id === cardId) && !tianXiangEquipment.some(c => c.id === cardId)) {
      resolveTianXiang(null)
    } else {
      resolveTianXiang(cardId)
    }
    set({ resolveTianXiang: null, tianXiangJudgeCard: null, tianXiangEquipment: [], phase: 'waiting' })
  },

  // 门神: 选保护目标 / 取消 = 不发动
  selectMenShenTarget: (targetId: string) => {
    const { resolveMenShenTarget } = get()
    if (!resolveMenShenTarget) return
    resolveMenShenTarget(targetId)
    set({ resolveMenShenTarget: null, menShenCandidates: [], phase: 'waiting' })
  },
  cancelMenShenTarget: () => {
    const { resolveMenShenTarget } = get()
    if (!resolveMenShenTarget) return
    resolveMenShenTarget(null)
    set({ resolveMenShenTarget: null, menShenCandidates: [], phase: 'waiting' })
  },

  // 诀别: 选男性候选 / 取消 = 失效
  selectJueBieTarget: (targetId: string) => {
    const { resolveJueBieTarget } = get()
    if (!resolveJueBieTarget) return
    resolveJueBieTarget(targetId)
    set({ resolveJueBieTarget: null, jueBieCandidates: [], phase: 'waiting' })
  },
  cancelJueBieTarget: () => {
    const { resolveJueBieTarget } = get()
    if (!resolveJueBieTarget) return
    resolveJueBieTarget(null)
    set({ resolveJueBieTarget: null, jueBieCandidates: [], phase: 'waiting' })
  },

  // 鸩杀: 发动 / 不发动
  confirmZhenSha: () => {
    const { resolveZhenSha } = get()
    if (!resolveZhenSha) return
    resolveZhenSha(true)
    set({ resolveZhenSha: null, zhenShaPrompt: null, phase: 'waiting' })
  },
  cancelZhenSha: () => {
    const { resolveZhenSha } = get()
    if (!resolveZhenSha) return
    resolveZhenSha(false)
    set({ resolveZhenSha: null, zhenShaPrompt: null, phase: 'waiting' })
  },

  // 补刀: 选杀/装备当杀 / 取消 = 不补
  selectBuDaoCard: (cardId: string | null) => {
    const game = gameRef
    const { resolveBuDao, playerHand, buDaoPrompt } = get()
    if (!resolveBuDao || !game || !buDaoPrompt) return
    // 校验: 必须是手牌中可当杀的牌
    if (cardId) {
      if (!game.canPlayerUseAsKill(cardId)) {
        // 无效牌 → 当作不补
        resolveBuDao(null)
        set({ resolveBuDao: null, buDaoPrompt: null, phase: 'waiting' })
        return
      }
    }
    resolveBuDao(cardId)
    set({ resolveBuDao: null, buDaoPrompt: null, phase: 'waiting' })
  },

  // 三板斧: 发动 / 不用
  confirmSanBanFu: () => {
    const { resolveSanBanFu } = get()
    if (!resolveSanBanFu) return
    resolveSanBanFu(true)
    set({ resolveSanBanFu: null, sanBanFuPrompt: null, phase: 'waiting' })
  },
  cancelSanBanFu: () => {
    const { resolveSanBanFu } = get()
    if (!resolveSanBanFu) return
    resolveSanBanFu(false)
    set({ resolveSanBanFu: null, sanBanFuPrompt: null, phase: 'waiting' })
  },

  // 复仇: 发动 / 不发动
  confirmFuChouTrigger: () => {
    const { resolveFuChouTrigger } = get()
    if (!resolveFuChouTrigger) return
    resolveFuChouTrigger(true)
    set({ resolveFuChouTrigger: null, fuChouTriggerPrompt: null, phase: 'waiting' })
  },
  cancelFuChouTrigger: () => {
    const { resolveFuChouTrigger } = get()
    if (!resolveFuChouTrigger) return
    resolveFuChouTrigger(false)
    set({ resolveFuChouTrigger: null, fuChouTriggerPrompt: null, phase: 'waiting' })
  },
  // 复仇: 来源选 弃2牌 / 掉1血
  confirmFuChouChoose: (choice: 'discard' | 'damage') => {
    const { resolveFuChouChoose } = get()
    if (!resolveFuChouChoose) return
    resolveFuChouChoose(choice)
    set({ resolveFuChouChoose: null, fuChouChoosePrompt: null, phase: 'waiting' })
  },
  // 复仇: 来源选弃哪2张手牌 (直接从手牌点击, 选满2张后需点确定)
  toggleFuChouPick: (cardId: string) => {
    const { fuChouPickSelected } = get()
    const picked = fuChouPickSelected
    let nextPicked: string[]
    if (picked.includes(cardId)) {
      nextPicked = picked.filter(id => id !== cardId)
    } else if (picked.length < 2) {
      nextPicked = [...picked, cardId]
    } else {
      return
    }
    set({ fuChouPickSelected: nextPicked })
  },
  confirmFuChouPick: () => {
    const { fuChouPickSelected, resolveFuChouPick } = get()
    if (!resolveFuChouPick) return
    if (fuChouPickSelected.length < 2) return
    const resolve = resolveFuChouPick
    set({ resolveFuChouPick: null, fuChouPickSelected: [] })
    resolve(fuChouPickSelected)
  },
  // 濒死救援: 选/取消药
  toggleDyingRescueCard: (cardId: string) => {
    const { dyingRescuePrompt, dyingRescueSelected } = get()
    if (!dyingRescuePrompt) return
    if (dyingRescueSelected.includes(cardId)) {
      set({ dyingRescueSelected: dyingRescueSelected.filter(id => id !== cardId) })
    } else {
      set({ dyingRescueSelected: [...dyingRescueSelected, cardId] })
    }
  },
  confirmDyingRescue: () => {
    const { resolveDyingRescue, dyingRescueSelected } = get()
    if (!resolveDyingRescue) return
    resolveDyingRescue(dyingRescueSelected)
  },
  cancelDyingRescue: () => {
    const { resolveDyingRescue } = get()
    if (!resolveDyingRescue) return
    resolveDyingRescue(null)
  },
  // 舍身: 是否发动
  confirmSheShenTrigger: (use: boolean) => {
    const { resolveSheShenTrigger } = get()
    if (!resolveSheShenTrigger) return
    resolveSheShenTrigger(use)
    set({ resolveSheShenTrigger: null, sheShenTriggerPrompt: null })
  },
  // 舍身分配: 切换某张牌的选中态 (多选)
  toggleSheShenCard: (cardId: string) => {
    const { sheShenSelectedCardIds } = get()
    if (sheShenSelectedCardIds.includes(cardId)) {
      set({ sheShenSelectedCardIds: sheShenSelectedCardIds.filter(id => id !== cardId) })
    } else {
      set({ sheShenSelectedCardIds: [...sheShenSelectedCardIds, cardId] })
    }
  },
  // 舍身分配: 把当前选中的所有牌分给指定 hero
  assignSheShenCard: (heroId: string) => {
    const { sheShenSelectedCardIds, sheShenDistribution, sheShenPrompt, resolveSheShen } = get()
    if (sheShenSelectedCardIds.length === 0) return
    const next: Record<string, string[]> = { ...sheShenDistribution }
    const existing = new Set(next[heroId] ?? [])
    for (const cid of sheShenSelectedCardIds) existing.add(cid)
    next[heroId] = [...existing]
    // 飞牌动画: 选中的每张牌飞向目标英雄手牌
    const cards = sheShenPrompt?.cards ?? []
    for (const cid of sheShenSelectedCardIds) {
      const card = cards.find(c => c.id === cid)
      if (card) {
        useAnimationStore.getState()._queueFlyingCard({
          card,
          sourceType: 'hand',
          targetType: 'hand',
          targetHeroId: heroId,
        })
      }
    }
    // 全部分完 → 关闭弹框, 等飞牌动画结束后再 resolve (避免引擎在牌还在飞时推进后续 AI 行动)
    const allCardIds = (sheShenPrompt?.cards ?? []).map(c => c.id)
    const assignedSet = new Set(Object.values(next).flat())
    const allAssigned = allCardIds.length > 0 && allCardIds.every(id => assignedSet.has(id))
    if (allAssigned && resolveSheShen) {
      // 立即关闭弹框让玩家看到飞牌过程
      set({ sheShenPrompt: null, sheShenSelectedCardIds: [], sheShenDistribution: {}, phase: 'waiting' })
      const finalize = () => {
        resolveSheShen(next)
      }
      const animState = useAnimationStore.getState()
      if (animState.flyingCards.length === 0) {
        finalize()
      } else {
        let unsub: (() => void) | null = null
        unsub = useAnimationStore.subscribe((s, prev) => {
          if (s.flyingCards.length === 0 && prev.flyingCards.length > 0) {
            unsub?.()
            finalize()
          }
        })
        setTimeout(() => { unsub?.(); finalize() }, 5000)
      }
      return
    }
    set({ sheShenDistribution: next, sheShenSelectedCardIds: [] })
  },
  // 舍身分配: 撤销某 hero 的某张牌
  unassignSheShenCard: (heroId: string, cardId: string) => {
    const { sheShenDistribution } = get()
    const next: Record<string, string[]> = { ...sheShenDistribution }
    if (!next[heroId]) return
    next[heroId] = next[heroId].filter(id => id !== cardId)
    if (next[heroId].length === 0) delete next[heroId]
    set({ sheShenDistribution: next })
  },
  // 舍身分配: 完成 (全部分完或主动确认)
  finishSheShen: () => {
    const { resolveSheShen, sheShenPrompt, sheShenDistribution } = get()
    if (!resolveSheShen) return
    // 校验: 所有牌必须分完
    const allCardIds = (sheShenPrompt?.cards ?? []).map(c => c.id)
    const assignedSet = new Set(Object.values(sheShenDistribution).flat())
    const allAssigned = allCardIds.every(id => assignedSet.has(id))
    if (!allAssigned) return
    resolveSheShen(sheShenDistribution)
    set({ resolveSheShen: null, sheShenPrompt: null, sheShenSelectedCardIds: [], sheShenDistribution: {}, phase: 'waiting' })
  },
  // 超脱: 选牌或取消
  selectChaoTuoCard: (cardId: string | null) => {
    const { resolveChaoTuo } = get()
    if (!resolveChaoTuo) return
    resolveChaoTuo(cardId)
  },
  // 后主: 选目标或取消
  selectHouZhuTarget: (targetId: string | null) => {
    const { resolveHouZhu } = get()
    if (!resolveHouZhu) return
    resolveHouZhu(targetId)
  },
  // 回春: 回合外用红桃手牌/装备当药
  huiChunHeal: (cardId: string) => {
    const game = gameRef
    if (!game) return
    const player = game.getPlayer()
    if (!player) return
    game.playerHuiChunHeal(player, cardId)
    set({ gameState: game.getState(), playerHand: player.getHand(), equippedCards: get().equippedCards })
  },
}))
