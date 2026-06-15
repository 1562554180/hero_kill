import { create } from 'zustand'
import { Game, type GameConfig, type Player } from '@hero-legend/game-engine'
import type { GameState, BattleResult, Card, GameEvent, GameEventType, HeroInstance, EquipmentSlot } from '@hero-legend/shared-types'

export type BattlePhase = 'idle' | 'playing' | 'selectTarget' | 'waiting' | 'ended' | 'judgeReplace' | 'awaitingResponse' | 'selectMultiTargets' | 'selectKillMultiTargets' | 'selectDualCards' | 'longLinDisarm' | 'selectJieDaoHolder' | 'selectJieDaoTarget' | 'selectTanNangTarget' | 'selectTanNangCard' | 'selectWugu' | 'selectFudiTarget' | 'selectFudiCard' | 'selectFaJiaCard' | 'treasureSkill' | 'treasureSelectCard' | 'treasureSelect2Cards' | 'treasureSelectTarget' | 'treasureSelectTargets' | 'treasureSelectEquipment' | 'treasureSelectWeapon' | 'xiaDanPickCard'

interface BattleState {
  game: Game | null
  gameState: GameState | null
  phase: BattlePhase
  playerHand: Card[]
  actionLog: string[]
  result: BattleResult | null
  pendingCardId: string | null
  pendingCardType: 'kill' | 'scheme' | null
  aoJianActive: boolean
  responsePrompt: string | null  // 例如 '决斗: 请打出【杀】或放弃'
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
  // 釜底抽薪: 选目标后展示其手牌/判定/装备
  fudiTargetInfo: { id: string; name: string; hand: Card[]; judge: Card[]; equipment: Card[] } | null
  // 主印技能流程
  treasureSkill: 'liao-shang' | 'zhi-yu' | 'feng-huo' | 'jue-ji' | 'qi-yi' | 'xia-dan' | null
  treasurePrompt: string
  treasureCardIds: string[]         // 累计已选的卡牌 (用于治愈/绝击)
  treasureTargetIds: string[]       // 累计已选的目标 (用于起义)
  // 侠胆拼点: 目标已选牌后, 玩家自己选牌的状态
  xiaDanOpponentCard: Card | null
  xiaDanTargetName: string | null

  resolveAction: ((action: string | null) => void) | null
  resolveResponse: ((cardId: string | null) => void) | null
  resolveJudge: ((cardId: string | null) => void) | null
  resolveLongLin: ((cardIds: string[] | null) => void) | null
  resolveMultiTarget: ((targetIds: string[]) => void) | null
  resolveDualCard: ((cardIds: string[]) => void) | null
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
  judgeCard: Card | null
  // 最近一次判定结果 (含来源名/牌名, 供中央显示; 显示2.5秒后自动清空)
  lastJudgeResult: { judgeHeroName: string; judgeCardName: string; resultCard: { suit: string; number: number; name: string } } | null

  startBattle: (config: GameConfig) => Promise<BattleResult>
  playKill: (cardId: string) => void
  playScheme: (cardId: string) => void
  playSchemeSelf: (cardId: string) => void
  confirmTarget: (targetId: string) => void
  playHeal: (cardId: string) => void
  equipCard: (cardId: string) => void
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
  useTreasureSkill: (skill: 'liao-shang' | 'zhi-yu' | 'feng-huo' | 'jue-ji' | 'qi-yi' | 'xia-dan') => void
  pickTreasureCard: (cardId: string) => void
  pickTreasureTarget: (targetId: string) => void
  confirmTreasureTargets: () => void
  cancelTreasureSkill: () => void
  // 侠胆: 玩家选自己拼点的牌
  pickXiaDanCard: (cardId: string) => void
  cancelXiaDanCard: () => void
  // 侠胆: 已激活(待选目标), 无浮层, 按钮高亮
  xiaDanActive: boolean
  cancelXiaDan: () => void
  // 侠胆: 本回合已使用过(成功后置true, 下回合重置)
  xiaDanUsedThisTurn: boolean
}

const heroNames: Record<string, string> = {}

function getHeroName(id: string, game: Game): string {
  if (heroNames[id]) return heroNames[id]
  const p = game.players.find(p => p.getId() === id)
  if (p) heroNames[id] = p.getName()
  return heroNames[id] || id
}

function eventToLog(event: GameEvent, game: Game): string | null {
  const src = event.sourceHeroId ? getHeroName(event.sourceHeroId, game) : ''
  const tgt = event.targetHeroId ? getHeroName(event.targetHeroId, game) : ''
  switch (event.type) {
    case 'turn:start': return `── ${src} 的回合 (第${(event.data as any)?.turn}回合) ──`
    case 'card:play': {
      const name = (event.data as any)?.cardName
      return tgt ? `${src} 对 ${tgt} 使用了【${name}】` : `${src} 使用了【${name}】`
    }
    case 'damage:prevent': {
      const cardName = (event.data as any)?.cardName ?? '闪'
      return `${src} 使用【${cardName}】抵消了攻击`
    }
    case 'damage:deal': return `${src} → ${tgt} 造成 ${(event.data as any)?.damage} 点伤害`
    case 'damage:receive': return `${src} 受到 ${(event.data as any)?.damage} 点伤害`
    case 'heal': return `${src} 回复 ${(event.data as any)?.amount} 点生命`
    case 'die': return `${src} 阵亡!`
    case 'skill:trigger': {
      const name = (event.data as any)?.skillName
      const effect = (event.data as any)?.effect
      return effect ? `【${name}】触发: ${effect}` : `【${name}】触发!`
    }
    case 'equipment:equip': return `${src} 装备了装备`
    case 'card:draw': return null // too noisy
    case 'card:discard': return null
    case 'scheme:nullify': {
      const name = (event.data as any)?.originalCardName
      return `【${name}】被【无懈可击】抵消！`
    }
    case 'judge': {
      const data = event.data as any
      const phase = data?.phase
      const heroName = src
      if (phase === 'result') {
        return `⚖ 判定结果: ${data?.cardName ?? ''} (${data?.suit ?? ''} ${data?.number ?? ''})`
      }
      if (phase === 'resolve' && data?.judgeCardName) {
        return `⚖ ${heroName} 判定【${data.judgeCardName}】: ${data?.cardName ?? ''} (${data?.suit ?? ''} ${data?.number ?? ''})`
      }
      if (phase === 'replace') {
        return `⚖ 变法: 判定改为 ${data?.cardName ?? ''}`
      }
      return null
    }
    default: return null
  }
}

const allEventTypes: GameEventType[] = [
  'game:start', 'game:end', 'turn:start', 'turn:end',
  'phase:start', 'phase:end', 'card:play', 'card:draw', 'card:discard',
  'damage:deal', 'damage:receive', 'damage:prevent', 'heal', 'die',
  'skill:trigger', 'skill:resolve', 'judge', 'equipment:equip', 'equipment:unequip',
  'scheme:nullify',
]

export const useBattleStore = create<BattleState>((set, get) => ({
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
  resolveAction: null,
  resolveResponse: null,
  resolveJudge: null,
  resolveLongLin: null,
  resolveMultiTarget: null,
  resolveDualCard: null,
  judgeCard: null,
  lastJudgeResult: null,
  equippedCards: {},
  multiTargetCandidates: [],
  selectedTargets: [],
  killMultiCardId: null,
  killMultiMax: 0,
  killMultiRemaining: 0,
  selectedDualCards: [],
  longLinTargetInfo: null,
  longLinSelectedCards: [],
  jieDaoHolders: [],
  jieDaoCandidates: [],
  tanNangCandidates: [],
  tanNangTargetInfo: null,
  wuguCandidates: null,
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
  xiaDanOpponentCard: null,
  xiaDanTargetName: null,
  resolveXiaDanCard: null,
  xiaDanActive: false,
  xiaDanUsedThisTurn: false,

  startBattle: async (config: GameConfig) => {
    Object.keys(heroNames).forEach(k => delete heroNames[k])

    // 完整重置所有状态, 防止上一场战斗残留导致回合卡住
    set({
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
      tanNangCandidates: [],
      tanNangTargetInfo: null,
      wuguCandidates: null,
      fudiTargetInfo: null,
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
      resolveXiaDanCard: null,
      xiaDanOpponentCard: null,
      xiaDanTargetName: null,
      xiaDanActive: false,
      xiaDanUsedThisTurn: false,
      judgeCard: null,
      lastJudgeResult: null,
    })

    const wrappedConfig: GameConfig = {
      ...config,
      judgeActionHandler: async (game: Game, player: any, judgeCard: Card) => {
        set({ phase: 'judgeReplace', judgeCard, playerHand: player.getHand() })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveJudge: resolve })
        })
        set({ resolveJudge: null, judgeCard: null })
        return cardId
      },
      xiaDanPlayerCardHandler: async (game: Game, player: any, _against: Player) => {
        // 双方同时选牌, 玩家不会看到对方的牌
        set({
          phase: 'xiaDanPickCard',
          playerHand: player.getHand(),
          xiaDanOpponentCard: null,  // 不展示对方已选牌
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveXiaDanCard: resolve })
        })
        set({ resolveXiaDanCard: null, xiaDanOpponentCard: null, xiaDanTargetName: null })
        return cardId
      },
      responseActionHandler: async (game: Game, player: any, responseType: 'kill' | 'nullify' | 'dodge', ctx: any) => {
        const prompt = responseType === 'nullify'
          ? `【${ctx.schemeName}】即将生效，是否使用【无懈可击】抵消？`
          : responseType === 'dodge'
            ? `【${player.getName()}】受到【${ctx.schemeName || '杀'}】攻击，是否打出【闪】响应？`
            : `${ctx.schemeName}: 请打出【杀】响应 (${ctx.needCount}张) 或放弃`
        set({
          phase: 'awaitingResponse',
          playerHand: player.getHand(),
          responsePrompt: prompt,
          game,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveResponse: resolve })
        })
        // 关键: 这里不能设 phase='playing' — 此时不是玩家出牌阶段, 是攻击方(AI)继续处理中
        // 设成 'waiting' 让 UI 显示"等待中", 直到 engine 真正轮到玩家时再由 playerActionHandler 改回 'playing'
        set({ resolveResponse: null, responsePrompt: null, phase: 'waiting', gameState: game.getState() })
        return cardId
      },
      longLinPickHandler: async (game: Game, attacker: Player, defender: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => {
        set({
          phase: 'longLinDisarm',
          longLinTargetInfo: {
            id: defender.getId(), name: defender.getName(),
            hand: [...options.hand], judge: [...options.judge], equipment: [...options.equipment],
          },
          longLinSelectedCards: [],
          playerHand: attacker.getHand(),
        })
        return new Promise<string[] | null>(resolve => {
          set({ resolveLongLin: resolve })
        })
      },
      multiTargetHandler: async (game: Game, attacker: Player, candidates: Player[]) => {
        set({
          phase: 'selectMultiTargets',
          multiTargetCandidates: candidates.map(p => ({ id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() })),
          selectedTargets: [],
          game,
        })
        return new Promise<string[]>(resolve => {
          set({ resolveMultiTarget: resolve })
        })
      },
      dualCardHandler: async (game: Game, attacker: Player) => {
        set({
          phase: 'selectDualCards',
          playerHand: attacker.getHand(),
          selectedDualCards: [],
        })
        return new Promise<string[]>(resolve => {
          set({ resolveDualCard: resolve })
        })
      },
      wuguPickHandler: async (game: Game, picker: Player, candidates: Card[]) => {
        set({
          phase: 'selectWugu',
          wuguCandidates: [...candidates],
          game,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveWuguPick: resolve })
        })
        set({ resolveWuguPick: null, wuguCandidates: null, phase: 'playing' })
        return cardId
      },
      jieDaoTargetHandler: async (game: Game, attacker: Player, weaponHolders: Player[]) => {
        set({
          phase: 'selectJieDaoHolder',
          jieDaoHolders: weaponHolders.map(p => ({ id: p.getId(), name: p.getName() })),
          game,
        })
        const holderId = await new Promise<string | null>(resolve => {
          set({ resolveJieDaoHolder: resolve })
        })
        set({ resolveJieDaoHolder: null, jieDaoHolders: [], phase: 'playing' })
        return holderId
      },
      jieDaoAttackTargetHandler: async (game: Game, attacker: Player, borrower: Player, candidates: Player[]) => {
        set({
          phase: 'selectJieDaoTarget',
          jieDaoCandidates: candidates.map(p => ({ id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() })),
          game,
        })
        const targetId = await new Promise<string | null>(resolve => {
          set({ resolveJieDaoTarget: resolve })
        })
        set({ resolveJieDaoTarget: null, jieDaoCandidates: [], phase: 'playing' })
        return targetId
      },
      tanNangTargetHandler: async (game: Game, attacker: Player, candidates: Player[]) => {
        set({
          phase: 'selectTanNangTarget',
          tanNangTargetInfo: null,
          tanNangCandidates: candidates.map(p => ({ id: p.getId(), name: p.getName() })),
          game,
        })
        const targetId = await new Promise<string | null>(resolve => {
          set({ resolveTanNangTarget: resolve })
        })
        set({ resolveTanNangTarget: null, phase: 'playing', tanNangCandidates: [] })
        return targetId
      },
      tanNangPickHandler: async (game: Game, attacker: Player, target: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => {
        set({
          phase: 'selectTanNangCard',
          tanNangTargetInfo: {
            id: target.getId(),
            name: target.getName(),
            hand: [...options.hand],
            judge: [...options.judge],
            equipment: [...options.equipment],
          },
          game,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveTanNangPick: resolve })
        })
        set({ resolveTanNangPick: null, tanNangTargetInfo: null, phase: 'playing' })
        return cardId
      },
      fudiTargetHandler: async (game: Game, attacker: Player, candidates: Player[]) => {
        set({
          phase: 'selectFudiTarget',
          fudiTargetInfo: null,
          game,
        })
        const targetId = await new Promise<string | null>(resolve => {
          set({ resolveFudiTarget: resolve })
        })
        set({ resolveFudiTarget: null, phase: 'playing' })
        return targetId
      },
      fudiPickHandler: async (game: Game, attacker: Player, target: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => {
        set({
          phase: 'selectFudiCard',
          fudiTargetInfo: {
            id: target.getId(),
            name: target.getName(),
            hand: [...options.hand],
            judge: [...options.judge],
            equipment: [...options.equipment],
          },
          game,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveFudiPick: resolve })
        })
        set({ resolveFudiPick: null, fudiTargetInfo: null, phase: 'playing' })
        return cardId
      },
      faJiaPickHandler: async (game: Game, victim: Player, attacker: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => {
        set({
          phase: 'selectFaJiaCard',
          faJiaTargetInfo: {
            id: attacker.getId(),
            name: attacker.getName(),
            hand: [...options.hand],
            judge: [...options.judge],
            equipment: [...options.equipment],
          },
          game,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveFaJiaPick: resolve })
        })
        set({ resolveFaJiaPick: null, faJiaTargetInfo: null, phase: 'playing' })
        return cardId
      },
      playerActionHandler: async (game: Game, player: any) => {
        while (true) {
          const state = game.getState()
          set({
            game,
            gameState: state,
            playerHand: player.getHand(),
            phase: 'playing',
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
            // 侠胆多杀: 形如 killMulti:cardId:targetId1,targetId2
            const [, cardId, idsRaw] = action.split(':')
            const targetIds = (idsRaw ?? '').split(',').filter(Boolean)
            if (targetIds.length > 0) await game.playerPlayKillMulti(player, cardId, targetIds)
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
          } else if (action.startsWith('heal:')) {
            const cardId = action.slice(5)
            game.playerPlayHeal(player, cardId)
          } else if (action.startsWith('equip:')) {
            const cardId = action.slice(6)
            game.playerEquipCard(player, cardId)
          } else if (action.startsWith('luYeQiang:')) {
            await game.playerUseLuYeQiang(player)
          }

          set({ gameState: game.getState(), playerHand: player.getHand() })
        }
      },
    }

    const game = new Game(wrappedConfig)

    const handler = (event: GameEvent) => {
      const msg = eventToLog(event, game)
      if (msg) {
        set(s => ({ actionLog: [...s.actionLog, msg] }))
      }
      // 判定最终结果 (中央高亮显示 2.5 秒)
      if (event.type === 'judge') {
        const data = event.data as any
        const phase = data?.phase
        if (phase === 'result' || phase === 'resolve') {
          const heroName = event.sourceHeroId ? getHeroName(event.sourceHeroId, game) : ''
          const judgeCardName = data?.judgeCardName ?? ''
          set({
            lastJudgeResult: {
              judgeHeroName: heroName,
              judgeCardName,
              resultCard: { suit: data?.suit, number: data?.number, name: data?.cardName ?? '' },
            },
          })
          setTimeout(() => {
            const cur = get().lastJudgeResult
            // 防止被新的判定覆盖时, 误清空新结果
            if (cur && cur.resultCard.name === (data?.cardName ?? '') && cur.resultCard.suit === data?.suit) {
              set({ lastJudgeResult: null })
            }
          }, 2500)
        }
      }
      // 关键事件触发时同步 gameState, 避免 UI 显示陈旧的 HP/状态
      if (event.type === 'damage:deal' || event.type === 'damage:receive' ||
          event.type === 'heal' || event.type === 'die' ||
          event.type === 'turn:start' || event.type === 'turn:end' ||
          event.type === 'card:play' || event.type === 'card:draw' ||
          event.type === 'card:discard' || event.type === 'phase:start' ||
          event.type === 'phase:end' || event.type === 'judge' ||
          event.type === 'scheme:nullify') {
        set({ gameState: game.getState() })
      }
      // 玩家回合开始: 重置 侠胆 已用标记
      if (event.type === 'turn:start' && event.sourceHeroId === game.getPlayer()?.getId()) {
        set({ xiaDanUsedThisTurn: false })
      }
      // 追踪装备状态
      if (event.type === 'equipment:equip' && event.sourceHeroId && event.data) {
        const slot = (event.data as any).slot as EquipmentSlot
        const cardId = (event.data as any).cardId as string
        // 从玩家手牌中找出已装备的卡
        const hero = game.players.find(p => p.getId() === event.sourceHeroId)
        if (hero) {
          const card = hero.getEquippedCard(slot)
          if (card) {
            set(s => ({
              equippedCards: {
                ...s.equippedCards,
                [event.sourceHeroId!]: { ...s.equippedCards[event.sourceHeroId!], [slot]: card }
              }
            }))
          }
        }
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
    }

    for (const et of allEventTypes) {
      game.eventBus.on(et, handler)
    }

    set({ game, phase: 'waiting', actionLog: [], result: null, aoJianActive: false })

    const result = await game.start()
    set({ phase: 'ended', result, gameState: game.getState(), aoJianActive: false })
    return result
  },

  playKill: (cardId: string) => {
    // 侠胆胜出: 进入多目标选人(每张杀最多xiaDanWinTargetsPerKill目标, 共xiaDanWinKillsLeft次)
    const { game } = get()
    if (game) {
      const playerId = game.getPlayer().getId()
      const winKillsP = (game as any).xiaDanWinKillsLeft?.get?.(playerId) ?? 0
      const maxTargetsP = (game as any).xiaDanWinTargetsPerKill?.get?.(playerId) ?? 0
      if (winKillsP > 0 && maxTargetsP > 1) {
        const enemies = game.players.filter(p => p.getRole() !== 'player' && p.getRole() !== 'ally' && p.isAlive())
        set({
          phase: 'selectKillMultiTargets',
          pendingCardId: cardId,
          pendingCardType: 'kill',
          killMultiCardId: cardId,
          killMultiMax: maxTargetsP,
          killMultiRemaining: winKillsP,
          multiTargetCandidates: enemies.map(p => ({ id: p.getId(), name: p.getName(), currentHp: p.getCurrentHp(), maxHp: p.getMaxHp() })),
          selectedTargets: [],
        })
        return
      }
    }
    set({ phase: 'selectTarget', pendingCardId: cardId, pendingCardType: 'kill' })
  },

  playScheme: (cardId: string) => {
    // 所有锦囊统一走 selectTarget 选目标, 跟杀一样的流程
    // 探囊/釜底/借刀也通过 UI 选目标, 取消时牌保留
    const card = get().playerHand.find(c => c.id === cardId)
    if (!card) return

    if (card.name === '借刀杀人') {
      // 借刀: 选持武器的玩家 (1阶段); 引擎收到holder后再开2阶段选攻击目标
      const { game } = get()
      if (!game) return
      const player = game.getPlayer()
      if (!player) return
      const holders = game.players.filter(p =>
        p.isAlive() && p.getId() !== player.getId() && p.getEquippedCard('weapon'),
      ).map(p => ({ id: p.getId(), name: p.getName() }))
      set({
        phase: 'selectJieDaoHolder',
        pendingCardId: cardId,
        pendingCardType: 'scheme',
        jieDaoHolders: holders,
      })
      return
    }

    // 探囊/釜底/其他锦囊: 统一 selectTarget 阶段
    set({ phase: 'selectTarget', pendingCardId: cardId, pendingCardType: 'scheme' })
  },

  playSchemeSelf: (cardId: string) => {
    const { resolveAction } = get()
    if (!resolveAction) return
    resolveAction(`scheme:${cardId}:`)  // 空 targetId 表示自己
    set({ resolveAction: null })
  },

  confirmTarget: (targetId: string) => {
    const { pendingCardId, pendingCardType, resolveAction } = get()
    if (!pendingCardId || !resolveAction) return
    const prefix = pendingCardType === 'scheme' ? 'scheme' : 'kill'
    resolveAction(`${prefix}:${pendingCardId}:${targetId}`)
    set({ resolveAction: null, pendingCardId: null, pendingCardType: null })
  },

  playHeal: (cardId: string) => {
    const { resolveAction } = get()
    if (!resolveAction) return
    resolveAction(`heal:${cardId}`)
    set({ resolveAction: null })
  },

  equipCard: (cardId: string) => {
    const { resolveAction } = get()
    if (!resolveAction) return
    resolveAction(`equip:${cardId}`)
    set({ resolveAction: null })
  },

  endPlayPhase: () => {
    const { resolveAction } = get()
    if (!resolveAction) return
    resolveAction('endPhase')
    set({ resolveAction: null })
  },

  cancelSelection: () => {
    set({ phase: 'playing', pendingCardId: null, pendingCardType: null })
  },

  judgeReplace: (cardId: string | null) => {
    const { resolveJudge } = get()
    if (!resolveJudge) return
    resolveJudge(cardId)
    set({ resolveJudge: null, judgeCard: null })
  },

  toggleAoJian: () => {
    const { game, aoJianActive, phase } = get()
    if (phase !== 'playing' && phase !== 'awaitingResponse') return
    const player = game?.getPlayer()
    if (!player || !player.hasSkillOrTreasure('ao-jian')) return
    if (aoJianActive) {
      game?.deactivateAoJian(player.getId())
      set({ aoJianActive: false })
    } else {
      game?.activateAoJian(player.getId())
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
    const { selectedTargets, killMultiMax, killMultiCardId, resolveAction, game } = get()
    if (!killMultiCardId || !resolveAction || !game) return
    if (selectedTargets.includes(targetId)) {
      set({ selectedTargets: selectedTargets.filter(id => id !== targetId) })
    } else if (selectedTargets.length < (killMultiMax || 2)) {
      // 跳过已在 selectedTargets 里的: 不能选同一目标两次
      set({ selectedTargets: [...selectedTargets, targetId] })
    }
  },
  confirmKillMultiTarget: () => {
    const { selectedTargets, killMultiCardId, resolveAction, killMultiRemaining } = get()
    if (!killMultiCardId || !resolveAction) return
    if (selectedTargets.length === 0) {
      // 取消: 退回到playing
      resolveAction(null)
      set({ resolveAction: null, phase: 'playing', multiTargetCandidates: [], selectedTargets: [], killMultiCardId: null, pendingCardId: null, pendingCardType: null })
      return
    }
    // 用killMulti前缀传多个目标(逗号分隔)
    resolveAction(`killMulti:${killMultiCardId}:${selectedTargets.join(',')}`)
    set({ resolveAction: null, phase: 'waiting', multiTargetCandidates: [], selectedTargets: [], killMultiCardId: null, pendingCardId: null, pendingCardType: null, killMultiRemaining: Math.max(0, killMultiRemaining - 1) })
  },
  cancelKillMultiTarget: () => {
    const { resolveAction } = get()
    if (!resolveAction) return
    resolveAction(null)
    set({ resolveAction: null, phase: 'playing', multiTargetCandidates: [], selectedTargets: [], killMultiCardId: null, pendingCardId: null, pendingCardType: null })
  },

  // 芦叶枪选2张手牌
  toggleDualCard: (cardId: string) => {
    const { selectedDualCards } = get()
    if (selectedDualCards.includes(cardId)) {
      set({ selectedDualCards: selectedDualCards.filter(id => id !== cardId) })
    } else if (selectedDualCards.length < 2) {
      set({ selectedDualCards: [...selectedDualCards, cardId] })
    }
  },
  confirmDualCards: () => {
    const { resolveDualCard, selectedDualCards } = get()
    if (!resolveDualCard) return
    resolveDualCard(selectedDualCards)
    set({ resolveDualCard: null, selectedDualCards: [], phase: 'playing' })
  },
  cancelDualCards: () => {
    const { resolveDualCard } = get()
    if (!resolveDualCard) return
    resolveDualCard([])
    set({ resolveDualCard: null, selectedDualCards: [], phase: 'playing' })
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

  // 借刀杀人
  selectJieDaoHolder: (holderId: string) => {
    // 2阶段: 引擎回调 (用户已选holder, 进入选攻击目标)
    const { resolveJieDaoHolder } = get()
    if (resolveJieDaoHolder) {
      resolveJieDaoHolder(holderId)
      set({ resolveJieDaoHolder: null, jieDaoHolders: [] })
      return
    }
    // 1阶段: UI预选holder, 启动引擎
    const { pendingCardId, resolveAction } = get()
    if (!pendingCardId || !resolveAction) return
    resolveAction(`jieDao:${pendingCardId}:${holderId}`)
    set({ resolveAction: null, pendingCardId: null, pendingCardType: null, jieDaoHolders: [] })
  },
  cancelJieDaoHolder: () => {
    const { resolveJieDaoHolder } = get()
    if (resolveJieDaoHolder) {
      resolveJieDaoHolder(null)
      set({ resolveJieDaoHolder: null, jieDaoHolders: [] })
      return
    }
    // 1阶段取消: 重置phase, 牌保留
    set({ phase: 'playing', pendingCardId: null, pendingCardType: null, jieDaoHolders: [] })
  },
  selectJieDaoTarget: (targetId: string) => {
    const { resolveJieDaoTarget } = get()
    if (!resolveJieDaoTarget) return
    resolveJieDaoTarget(targetId)
    set({ resolveJieDaoTarget: null, jieDaoCandidates: [] })
  },
  cancelJieDaoTarget: () => {
    const { resolveJieDaoTarget } = get()
    if (!resolveJieDaoTarget) return
    resolveJieDaoTarget(null)
    set({ resolveJieDaoTarget: null, jieDaoCandidates: [] })
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
    set({ resolveWuguPick: null, wuguCandidates: null, phase: 'playing' })
  },
  cancelWuguPick: () => {
    const { resolveWuguPick } = get()
    if (!resolveWuguPick) return
    resolveWuguPick(null)
    set({ resolveWuguPick: null, wuguCandidates: null, phase: 'playing' })
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
    const { game, playerHand } = get()
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
      const eqs = playerHand.filter(c => c.type === 'equipment')
      if (eqs.length === 0) { set({ treasureSkill: null, treasurePrompt: '无装备牌可弃' }); return }
      set({ phase: 'treasureSelectEquipment', treasurePrompt: '【烽火】选择1张装备牌弃置' })
    } else if (skill === 'jue-ji') {
      set({ phase: 'treasureSelectTarget', treasurePrompt: '【绝击】选择攻击范围内的1名角色 (无武器则自己掉1血)' })
    } else if (skill === 'qi-yi') {
      set({ phase: 'treasureSelectTargets', treasurePrompt: '【起义】选择至多2名其他角色 (各获得1张手牌), 点确认结束' })
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
    }
  },

  pickTreasureCard: (cardId) => {
    const { treasureSkill, treasureCardIds, game, playerHand } = get()
    if (!treasureSkill) return
    const card = playerHand.find(c => c.id === cardId)
    if (!card) return
    const player = game!.getPlayer()!

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
      // 直接执行
      game!.playerFengHuo(player, cardId)
      set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', gameState: game!.getState(), playerHand: player.getHand() })
    }
    // 注: 侠胆不走 pickTreasureCard, 它先选目标再选自己手牌
  },

  pickTreasureTarget: (targetId) => {
    const { treasureSkill, treasureCardIds, treasureTargetIds, game, xiaDanActive } = get()
    if (!treasureSkill && !xiaDanActive) return
    const player = game!.getPlayer()!

    if (treasureSkill === 'liao-shang') {
      game!.playerLiaoShang(player, treasureCardIds[0], targetId)
      set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], gameState: game!.getState(), playerHand: player.getHand() })
    } else if (treasureSkill === 'zhi-yu') {
      game!.playerZhiYu(player, treasureCardIds, targetId)
      set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureCardIds: [], gameState: game!.getState(), playerHand: player.getHand() })
    } else if (treasureSkill === 'jue-ji') {
      // 检查手牌有无武器, 有则询问, 没有则受1伤
      const hasWeapon = player.getHand().some(c => c.type === 'equipment' && (c as any).slot === 'weapon')
      if (hasWeapon) {
        set({ treasureTargetIds: [targetId], phase: 'treasureSelectWeapon', treasurePrompt: '【绝击】选择1张手牌中的武器弃置, 或点"受1血"直接执行' })
      } else {
        game!.playerJueJi(player, null, targetId)
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
        const g = get()
        if (g.phase === 'xiaDanPickCard') {
          set({ phase: 'playing', treasureSkill: null, treasurePrompt: '', treasureCardIds: [], xiaDanOpponentCard: null, xiaDanTargetName: null, gameState: g.game!.getState(), playerHand: g.game!.getPlayer().getHand() })
        } else {
          set({ treasureSkill: null, treasurePrompt: '', treasureCardIds: [], xiaDanOpponentCard: null, xiaDanTargetName: null, gameState: g.game!.getState(), playerHand: g.game!.getPlayer().getHand() })
        }
      })
    }
  },

  confirmTreasureTargets: () => {
    const { treasureSkill, treasureTargetIds, game } = get()
    if (!treasureSkill) return
    const player = game!.getPlayer()!
    if (treasureSkill === 'qi-yi') {
      game!.playerQiYi(player, treasureTargetIds)
      set({ treasureSkill: null, treasurePrompt: '', phase: 'playing', treasureTargetIds: [], gameState: game!.getState(), playerHand: player.getHand() })
    }
  },

  cancelTreasureSkill: () => {
    set({
      treasureSkill: null, treasurePrompt: '', phase: 'playing',
      treasureCardIds: [], treasureTargetIds: [],
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
}))
