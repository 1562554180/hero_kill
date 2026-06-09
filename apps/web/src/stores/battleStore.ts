import { create } from 'zustand'
import { Game, type GameConfig } from '@hero-legend/game-engine'
import type { GameState, BattleResult, Card, GameEvent, GameEventType, HeroInstance } from '@hero-legend/shared-types'

export type BattlePhase = 'idle' | 'playing' | 'selectTarget' | 'waiting' | 'ended' | 'judgeReplace' | 'awaitingResponse'

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

  resolveAction: ((action: string | null) => void) | null
  resolveResponse: ((cardId: string | null) => void) | null
  resolveJudge: ((cardId: string | null) => void) | null
  judgeCard: Card | null

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
    case 'damage:prevent': return `${src} 使用【闪】抵消了攻击`
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
    default: return null
  }
}

const allEventTypes: GameEventType[] = [
  'game:start', 'game:end', 'turn:start', 'turn:end',
  'phase:start', 'phase:end', 'card:play', 'card:draw', 'card:discard',
  'damage:deal', 'damage:receive', 'damage:prevent', 'heal', 'die',
  'skill:trigger', 'skill:resolve', 'judge', 'equipment:equip', 'equipment:unequip',
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
  judgeCard: null,

  startBattle: async (config: GameConfig) => {
    Object.keys(heroNames).forEach(k => delete heroNames[k])

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
      responseActionHandler: async (game: Game, player: any, _type: 'kill', ctx: { sourceHeroId: string, schemeName: string, needCount: number }) => {
        const prompt = `${ctx.schemeName}: 请打出【杀】响应 (${ctx.needCount}张) 或放弃`
        set({
          phase: 'awaitingResponse',
          playerHand: player.getHand(),
          responsePrompt: prompt,
          game,
        })
        const cardId = await new Promise<string | null>(resolve => {
          set({ resolveResponse: resolve })
        })
        set({ resolveResponse: null, responsePrompt: null, phase: 'playing' })
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
            await game.playerPlayKill(player, targetId, cardId)
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
    set({ phase: 'selectTarget', pendingCardId: cardId, pendingCardType: 'kill' })
  },

  playScheme: (cardId: string) => {
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
    if (phase !== 'playing') return
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
}))
