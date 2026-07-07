/**
 * 阶段 3 步骤 E: game engine 物理隔离到 Web Worker.
 *
 * 职责:
 *  1. 创建 Game 实例 (handler 改为 placeholder, 把调用转发到主线程)
 *  2. 订阅 engine.eventBus, 把 event + 当前快照 postMessage 给主线程
 *  3. 监听主线程消息: start / action / handler-response / terminate
 *  4. 维护 pendingHandlers Map, resolve handler promise
 *
 * 不做的事:
 *  - 不操作 UI / DOM / Zustand store (主线程负责)
 *  - 不写测试
 */
import { Game, Player } from '@hero-legend/game-engine'
import type {
  GameConfig, PlayerActionCtx, JudgeActionCtx, ChaoTuoCtx, ResponseActionCtx, PinDianCtx,
  XiaDanPlayerCardCtx, FudiTargetCtx, FudiPickCtx, TanNangTargetCtx, TanNangPickCtx,
  JieDaoTargetCtx, JieDaoAttackTargetCtx, WuguPickCtx, MultiTargetCtx, DualCardCtx,
  LuYeQiangTargetCtx, LongLinPickCtx, BoLangChuiCtx, FaJiaPickCtx, YuRuYiCtx, DiscardPickCtx,
  BaWangMountCtx, QiangLueCtx, CiKeCtx, DieHunCtx, HouZhuCtx, TianXiangCtx, ManWuPickCardCtx,
  ManWuCtx, JueJiCtx, MenShenTargetCtx, SanBanFuCtx, ZhenShaCtx, JueBieCtx, BuDaoCtx,
  FuChouTriggerCtx, FuChouChooseCtx, FuChouPickCtx, DyingRescueCtx,
  SheShenCtx, SheShenTriggerCtx, PanLongGunCtx,
} from '@hero-legend/game-engine'
import type { Card, EquipmentSlot, GameEvent } from '@hero-legend/shared-types'
import type {
  MainMessage, WorkerMessage, WorkerSnapshot, HandlerName, HandlerCtx,
  EngineMethodName, EngineMethodArgsMap,
  SerializedGameConfig,
} from './protocol.js'
import { ALL_EVENT_TYPES } from './protocol.js'

/** Worker scope — 最小类型, 避免依赖 WebWorker lib (主线程 tsconfig 无此 lib). */
interface WorkerScope {
  postMessage(msg: unknown): void
  addEventListener(type: 'message', cb: (e: MessageEvent) => void): void
  close(): void
}
const workerScope: WorkerScope = self as unknown as WorkerScope
const postMsg = (msg: WorkerMessage): void => workerScope.postMessage(msg)

let game: Game | null = null
let nextHandlerId = 1
const pendingHandlers = new Map<number, (result: unknown) => void>()

/** 把 handler 调用透传到主线程, 返回一个 Promise (engine await 它). */
function forwardHandler<T>(name: HandlerName, ctx: HandlerCtx): Promise<T> {
  const id = nextHandlerId++
  return new Promise<T>(resolve => {
    pendingHandlers.set(id, resolve as (result: unknown) => void)
    const msg: WorkerMessage = { kind: 'handler-call', id, name, ctx }
    postMsg(msg)
  })
}

/** 构建当前全量状态快照 — 主线程 store 同步用. */
function buildSnapshot(game: Game): WorkerSnapshot {
  const player = game.getPlayer()
  const playerId = player?.getId() ?? ''
  const heroStates: WorkerSnapshot['heroStates'] = {}
  const equippedCardsByHero: WorkerSnapshot['equippedCardsByHero'] = {}
  const handsByHero: WorkerSnapshot['handsByHero'] = {}
  const heroNames: Record<string, string> = {}
  const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
  for (const p of game.players) {
    const id = p.getId()
    heroNames[id] = p.getName()
    const equip: Partial<Record<EquipmentSlot, Card>> = {}
    for (const s of slots) {
      const c = p.getEquippedCard(s)
      if (c) equip[s] = c
    }
    equippedCardsByHero[id] = equip
    handsByHero[id] = p.getHand()
    heroStates[id] = {
      id,
      name: p.getName(),
      role: p.getRole(),
      currentHp: p.getCurrentHp(),
      maxHp: p.getMaxHp(),
      isAlive: p.isAlive(),
      handSize: p.getHandSize(),
      weaponName: p.getWeaponName(),
      skills: collectSkillIds(p),
    }
  }
  const derived = game.computeDerived()
  const xiaDanMultiTargetPerKill = game.getMaxTargetsPerKill()
  return {
    gameState: game.getState(),
    playerHand: player?.getHand() ?? [],
    equippedCardsByHero,
    handsByHero,
    heroStates,
    derived,
    playerId,
    heroNames,
    aoJianActive: player ? game.isAoJianActive(playerId) : false,
    canPlayKill: game.canPlayKill,
    jueJiUsedCount: derived.jueJiUsedCount,
    xiaDanMultiTargetPerKill,
    xiaDanMultiTargetActive: xiaDanMultiTargetPerKill > 1,
  }
}

function collectSkillIds(p: Player): string[] {
  // 复制 hasSkillOrTreasure 用的源: hero.skills[].id + instance.treasures.{main,sub}[].skill.id
  // (Player.hasSkillOrTreasure 检查的是 Treasure 嵌套的 skill.id, 不是 Treasure.id)
  const skills: string[] = []
  const heroAny = (p as unknown as {
    hero: {
      hero: { skills: Array<{ id: string }> }
      instance: { treasures?: { main?: Array<{ skill: { id: string } } | null>; sub?: Array<{ skill: { id: string } } | null> } }
    }
  }).hero
  for (const s of heroAny.hero.skills ?? []) skills.push(s.id)
  const treasures = heroAny.instance.treasures
  if (treasures) {
    for (const t of treasures.main ?? []) { if (t?.skill?.id) skills.push(t.skill.id) }
    for (const t of treasures.sub ?? []) { if (t?.skill?.id) skills.push(t.skill.id) }
  }
  return skills
}

function emitEvent(event: GameEvent): void {
  if (!game) return
  const snapshot = buildSnapshot(game)
  const msg: WorkerMessage = { kind: 'event', event, snapshot }
  postMsg(msg)
}

function setupEventBus(game: Game): void {
  for (const et of ALL_EVENT_TYPES) {
    game.eventBus.on(et, e => emitEvent(e))
  }
}

function buildWrappedConfig(config: SerializedGameConfig): GameConfig {
  // handler 全部 forward 到主线程
  const wrapped: GameConfig = {
    playerHeroId: config.playerHeroId,
    playerInstance: config.playerInstance,
    allyHeroIds: config.allyHeroIds,
    enemyHeroIds: config.enemyHeroIds,
  }
  if (config.allyInstances) wrapped.allyInstances = config.allyInstances
  if (config.enemyInstances) wrapped.enemyInstances = config.enemyInstances
  wrapped.playerActionHandler = (ctx: PlayerActionCtx) => forwardHandler('playerActionHandler', ctx)
  wrapped.judgeActionHandler = (ctx: JudgeActionCtx) => forwardHandler('judgeActionHandler', ctx)
  wrapped.chaoTuoHandler = (ctx: ChaoTuoCtx) => forwardHandler('chaoTuoHandler', ctx)
  wrapped.responseActionHandler = (ctx: ResponseActionCtx) => forwardHandler('responseActionHandler', ctx)
  wrapped.pinDianHandler = (ctx: PinDianCtx) => forwardHandler('pinDianHandler', ctx)
  wrapped.xiaDanPlayerCardHandler = (ctx: XiaDanPlayerCardCtx) => forwardHandler('xiaDanPlayerCardHandler', ctx)
  wrapped.fudiTargetHandler = (ctx: FudiTargetCtx) => forwardHandler('fudiTargetHandler', ctx)
  wrapped.fudiPickHandler = (ctx: FudiPickCtx) => forwardHandler('fudiPickHandler', ctx)
  wrapped.tanNangTargetHandler = (ctx: TanNangTargetCtx) => forwardHandler('tanNangTargetHandler', ctx)
  wrapped.tanNangPickHandler = (ctx: TanNangPickCtx) => forwardHandler('tanNangPickHandler', ctx)
  wrapped.jieDaoTargetHandler = (ctx: JieDaoTargetCtx) => forwardHandler('jieDaoTargetHandler', ctx)
  wrapped.jieDaoAttackTargetHandler = (ctx: JieDaoAttackTargetCtx) => forwardHandler('jieDaoAttackTargetHandler', ctx)
  wrapped.wuguPickHandler = (ctx: WuguPickCtx) => forwardHandler('wuguPickHandler', ctx)
  wrapped.multiTargetHandler = (ctx: MultiTargetCtx) => forwardHandler('multiTargetHandler', ctx)
  wrapped.dualCardHandler = (ctx: DualCardCtx) => forwardHandler('dualCardHandler', ctx)
  wrapped.luYeQiangTargetHandler = (ctx: LuYeQiangTargetCtx) => forwardHandler('luYeQiangTargetHandler', ctx)
  wrapped.longLinPickHandler = (ctx: LongLinPickCtx) => forwardHandler('longLinPickHandler', ctx)
  wrapped.boLangChuiHandler = (ctx: BoLangChuiCtx) => forwardHandler('boLangChuiHandler', ctx)
  wrapped.faJiaPickHandler = (ctx: FaJiaPickCtx) => forwardHandler('faJiaPickHandler', ctx)
  wrapped.yuRuYiHandler = (ctx: YuRuYiCtx) => forwardHandler('yuRuYiHandler', ctx)
  wrapped.discardPickHandler = (ctx: DiscardPickCtx) => forwardHandler('discardPickHandler', ctx)
  wrapped.baWangMountHandler = (ctx: BaWangMountCtx) => forwardHandler('baWangMountHandler', ctx)
  wrapped.qiangLueHandler = (ctx: QiangLueCtx) => forwardHandler('qiangLueHandler', ctx)
  wrapped.ciKeHandler = (ctx: CiKeCtx) => forwardHandler('ciKeHandler', ctx)
  wrapped.dieHunHandler = (ctx: DieHunCtx) => forwardHandler('dieHunHandler', ctx)
  wrapped.houZhuHandler = (ctx: HouZhuCtx) => forwardHandler('houZhuHandler', ctx)
  wrapped.tianXiangHandler = (ctx: TianXiangCtx) => forwardHandler('tianXiangHandler', ctx)
  wrapped.manWuPickCardHandler = (ctx: ManWuPickCardCtx) => forwardHandler('manWuPickCardHandler', ctx)
  wrapped.manWuHandler = (ctx: ManWuCtx) => forwardHandler('manWuHandler', ctx)
  wrapped.jueJiHandler = (ctx: JueJiCtx) => forwardHandler('jueJiHandler', ctx)
  wrapped.menShenTargetHandler = (ctx: MenShenTargetCtx) => forwardHandler('menShenTargetHandler', ctx)
  wrapped.sanBanFuHandler = (ctx: SanBanFuCtx) => forwardHandler('sanBanFuHandler', ctx)
  wrapped.zhenShaHandler = (ctx: ZhenShaCtx) => forwardHandler('zhenShaHandler', ctx)
  wrapped.jueBieHandler = (ctx: JueBieCtx) => forwardHandler('jueBieHandler', ctx)
  wrapped.buDaoHandler = (ctx: BuDaoCtx) => forwardHandler('buDaoHandler', ctx)
  wrapped.panLongGunHandler = (ctx: PanLongGunCtx) => forwardHandler('panLongGunHandler', ctx)
  wrapped.fuChouTriggerHandler = (ctx: FuChouTriggerCtx) => forwardHandler('fuChouTriggerHandler', ctx)
  wrapped.fuChouChooseHandler = (ctx: FuChouChooseCtx) => forwardHandler('fuChouChooseHandler', ctx)
  wrapped.fuChouPickHandler = (ctx: FuChouPickCtx) => forwardHandler('fuChouPickHandler', ctx)
  wrapped.dyingRescueHandler = (ctx: DyingRescueCtx) => forwardHandler('dyingRescueHandler', ctx)
  wrapped.sheShenTriggerHandler = (ctx: SheShenTriggerCtx) => forwardHandler('sheShenTriggerHandler', ctx)
  wrapped.sheShenDistributeHandler = (ctx: SheShenCtx) => forwardHandler('sheShenDistributeHandler', ctx)
  wrapped.awaitUIReady = () => forwardHandler<void>('awaitUIReady', undefined)
  return wrapped
}

async function handleAction(name: EngineMethodName, args: EngineMethodArgsMap[EngineMethodName]): Promise<unknown> {
  if (!game) throw new Error('engine not started')
  const g = game
  // 重新 lookup Player 实例 (主线程只传 playerId)
  const lookup = (id?: string) => id ? g.getPlayerById(id) : undefined
  switch (name) {
    case 'start': {
      const result = await g.start()
      return result
    }
    case 'playerPlayKill': {
      const [pid, tid, cid] = args as EngineMethodArgsMap['playerPlayKill']
      const p = lookup(pid)
      if (p) await g.playerPlayKill(p, tid, cid)
      return
    }
    case 'playerPlayKillMulti': {
      const [pid, cid, tids, maxOverride] = args as EngineMethodArgsMap['playerPlayKillMulti']
      const p = lookup(pid)
      if (p) await g.playerPlayKillMulti(p, cid, tids, maxOverride)
      return
    }
    case 'playerPlayJieDao': {
      const [pid, cid, hid] = args as EngineMethodArgsMap['playerPlayJieDao']
      const p = lookup(pid)
      if (p) await g.playerPlayJieDao(p, cid, hid)
      return
    }
    case 'playerPlayScheme': {
      const [pid, cid, tid] = args as EngineMethodArgsMap['playerPlayScheme']
      const p = lookup(pid)
      if (p) {
        await g.playerPlayScheme(p, cid, tid)
        // 五谷丰登选完后继续处理剩余玩家 — 引擎内部 pendingWuguContinuation 在 Worker 内可见
        if (g.pendingWuguContinuation) await g.pendingWuguContinuation()
      }
      return
    }
    case 'playerPlayHeal': {
      const [pid, cid] = args as EngineMethodArgsMap['playerPlayHeal']
      const p = lookup(pid)
      if (p) g.playerPlayHeal(p, cid)
      return
    }
    case 'playerEquipCard': {
      const [pid, cid] = args as EngineMethodArgsMap['playerEquipCard']
      const p = lookup(pid)
      if (p) g.playerEquipCard(p, cid)
      return
    }
    case 'playerUseLuYeQiang': {
      const [pid] = args as EngineMethodArgsMap['playerUseLuYeQiang']
      const p = lookup(pid)
      if (p) await g.playerUseLuYeQiang(p)
      return
    }
    case 'playerLiaoShang': {
      const [pid, cid, tid] = args as EngineMethodArgsMap['playerLiaoShang']
      const p = lookup(pid)
      if (p) g.playerLiaoShang(p, cid, tid)
      return
    }
    case 'playerZhiYu': {
      const [pid, cids, tid] = args as EngineMethodArgsMap['playerZhiYu']
      const p = lookup(pid)
      if (p) g.playerZhiYu(p, cids, tid)
      return
    }
    case 'playerFengHuo': {
      const [pid, cid] = args as EngineMethodArgsMap['playerFengHuo']
      const p = lookup(pid)
      if (p) await g.playerFengHuo(p, cid)
      return
    }
    case 'playerJueJi': {
      const [pid, wid, tid] = args as EngineMethodArgsMap['playerJueJi']
      const p = lookup(pid)
      if (p) await g.playerJueJi(p, wid, tid ?? '')
      return
    }
    case 'playerFuJing': {
      const [pid] = args as EngineMethodArgsMap['playerFuJing']
      const p = lookup(pid)
      if (p) await g.playerFuJing(p)
      return
    }
    case 'playerXiaDan': {
      const [pid, tid] = args as EngineMethodArgsMap['playerXiaDan']
      const p = lookup(pid)
      if (p) await g.playerXiaDan(p, tid)
      return
    }
    case 'playerQiYi': {
      const [pid, tids, cm] = args as EngineMethodArgsMap['playerQiYi']
      const p = lookup(pid)
      if (p) g.playerQiYi(p, tids, cm)
      return
    }
    case 'playerShiQuan': {
      const [pid, cid] = args as EngineMethodArgsMap['playerShiQuan']
      const p = lookup(pid)
      if (p) await g.playerShiQuan(p, cid)
      return
    }
    case 'playerYuRen': {
      const [pid, cids] = args as EngineMethodArgsMap['playerYuRen']
      const p = lookup(pid)
      if (p) g.playerYuRen(p, cids)
      return
    }
    case 'playerHuiChunHeal': {
      const [pid, cid] = args as EngineMethodArgsMap['playerHuiChunHeal']
      const p = lookup(pid)
      if (p) g.playerHuiChunHeal(p, cid)
      return
    }
    case 'resolveQiYiDecision': {
      const [decision] = args as EngineMethodArgsMap['resolveQiYiDecision']
      g.resolveQiYiDecision(decision)
      return
    }
    case 'activateAoJian': {
      const [pid] = args as EngineMethodArgsMap['activateAoJian']
      g.activateAoJian(pid)
      postMsg({ kind: 'event', event: { type: 'phase:end', timestamp: Date.now(), data: { phase: 'aoJianToggle' } }, snapshot: buildSnapshot(g) })
      return
    }
    case 'deactivateAoJian': {
      const [pid] = args as EngineMethodArgsMap['deactivateAoJian']
      g.deactivateAoJian(pid)
      postMsg({ kind: 'event', event: { type: 'phase:end', timestamp: Date.now(), data: { phase: 'aoJianToggle' } }, snapshot: buildSnapshot(g) })
      return
    }
    case 'isAoJianActive': {
      const [pid] = args as EngineMethodArgsMap['isAoJianActive']
      return g.isAoJianActive(pid)
    }
    case 'getMaxTargetsPerKill': {
      return g.getMaxTargetsPerKill()
    }
    case 'canPlayerUseAsKill': {
      const [cid] = args as EngineMethodArgsMap['canPlayerUseAsKill']
      return g.canPlayerUseAsKill(cid)
    }
    case 'runPendingWuguContinuation': {
      if (g.pendingWuguContinuation) await g.pendingWuguContinuation()
      return
    }
    default: {
      const _exhaustive: never = name
      void _exhaustive
      throw new Error(`unknown engine method: ${String(name)}`)
    }
  }
}

workerScope.addEventListener('message', async (e: MessageEvent<MainMessage>) => {
  const msg = e.data
  if (!msg) return
  try {
    switch (msg.kind) {
      case 'start': {
        const wrappedConfig = buildWrappedConfig(msg.config)
        game = new Game(wrappedConfig)
        setupEventBus(game)
        // 主线程 startBattle await 此 promise
        const result = await game.start()
        if (game) {
          const snapshot = buildSnapshot(game)
          const done: WorkerMessage = { kind: 'done', result, snapshot }
          postMsg(done)
        }
        return
      }
      case 'action': {
        const actionId = msg.id
        try {
          const result = await handleAction(msg.name, msg.args)
          const resp: WorkerMessage = { kind: 'action-done', id: actionId, result }
          postMsg(resp)
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err)
          const stack = err instanceof Error ? err.stack : undefined
          const resp: WorkerMessage = { kind: 'action-error', id: actionId, message, stack }
          postMsg(resp)
        }
        return
      }
      case 'handler-response': {
        const resolve = pendingHandlers.get(msg.id)
        if (resolve) {
          pendingHandlers.delete(msg.id)
          resolve(msg.result)
        }
        return
      }
      case 'terminate': {
        game = null
        pendingHandlers.clear()
        workerScope.close()
        return
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    const errMsg: WorkerMessage = { kind: 'error', message, stack }
    postMsg(errMsg)
  }
})
