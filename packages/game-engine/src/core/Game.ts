import type {
  Hero, HeroInstance, Role, GameState, BattleResult, GameAction, Card
} from '@hero-legend/shared-types'
import { createFullDeck, getHeroById } from '@hero-legend/game-data'
import { EventBus } from './EventBus.js'
import { CardDeck } from './CardDeck.js'
import { Player } from './Player.js'
import { DrawPhase, JudgePhase, DiscardPhase } from '../phases/index.js'

export interface GameConfig {
  playerHeroId: string
  playerInstance: HeroInstance
  allyHeroIds: string[]
  enemyHeroIds: string[]
  playerActionHandler?: (game: Game, player: Player) => Promise<GameAction | null>
}

export class Game {
  readonly eventBus: EventBus
  readonly cardDeck: CardDeck
  readonly players: Player[]
  readonly id: string

  private turnNumber = 0
  private currentPlayerIndex = 0
  private isOver = false
  private winner: 'player' | 'enemy' | null = null
  private killUsedThisTurn = false

  constructor(private config: GameConfig) {
    this.id = `game-${Date.now()}`
    this.eventBus = new EventBus()
    this.cardDeck = new CardDeck(createFullDeck())
    this.players = []

    // 创建玩家角色
    const playerHero = getHeroById(config.playerHeroId)!
    this.players.push(new Player(playerHero, config.playerInstance, 'player'))

    // 创建友军
    for (const allyId of config.allyHeroIds) {
      const hero = getHeroById(allyId)
      if (hero) {
        this.players.push(new Player(hero, { heroId: allyId, level: 1, growthValue: 0, starLevel: hero.starLevel, treasures: { main: [], sub: [] } }, 'ally'))
      }
    }

    // 创建敌方
    for (const enemyId of config.enemyHeroIds) {
      const hero = getHeroById(enemyId)
      if (hero) {
        this.players.push(new Player(hero, { heroId: enemyId, level: 1, growthValue: 0, starLevel: hero.starLevel, treasures: { main: [], sub: [] } }, 'enemy'))
      }
    }
  }

  async start(): Promise<BattleResult> {
    this.eventBus.emit({ type: 'game:start', data: { playerCount: this.players.length } })

    // 发初始手牌
    for (const player of this.players) {
      const cards = this.cardDeck.draw(4)
      player.drawCards(cards)
    }

    // 玩家先手
    this.currentPlayerIndex = 0

    // 回合循环
    while (!this.isOver) {
      await this.executeTurn()
      this.checkGameEnd()
    }

    return this.buildResult()
  }

  private async executeTurn(): Promise<void> {
    this.turnNumber++
    const player = this.players[this.currentPlayerIndex]
    if (!player.isAlive()) {
      this.advanceToNextAlive()
      return
    }

    player.resetSkillUses()
    this.killUsedThisTurn = false
    const ctx = { player, cardDeck: this.cardDeck, eventBus: this.eventBus, game: this }

    this.eventBus.emit({ type: 'turn:start', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })

    // 判定阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'judge' } })
    await new JudgePhase().execute(ctx)
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'judge' } })

    if (!player.isAlive()) { this.advanceToNextAlive(); return }

    // 摸牌阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'draw' } })
    await new DrawPhase().execute(ctx)
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'draw' } })

    // 出牌阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'play' } })
    if (player.getRole() === 'player' && this.config.playerActionHandler) {
      await this.config.playerActionHandler(this, player)
    } else {
      // AI/auto play phase - 简单版自动出牌
      await this.autoPlayPhase(player)
    }
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'play' } })

    // 弃牌阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'discard' } })
    await new DiscardPhase().execute(ctx)
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'discard' } })

    this.eventBus.emit({ type: 'turn:end', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })
    this.advanceToNextAlive()
  }

  private async autoPlayPhase(player: Player): Promise<void> {
    // 简单AI：优先用药补血，然后出杀，然后装备
    const hand = player.getHand()

    // 用药
    for (const card of hand) {
      if (card.name === '药' && player.getCurrentHp() < player.getMaxHp()) {
        player.removeCard(card.id)
        player.heal(1)
        this.cardDeck.discard([card])
        this.eventBus.emit({ type: 'heal', sourceHeroId: player.getId(), data: { amount: 1 } })
        break
      }
    }

    // 出杀
    if (!this.killUsedThisTurn) {
      const killCard = player.getHand().find(c => c.name === '杀')
      if (killCard) {
        const targets = this.getEnemies(player)
        if (targets.length > 0) {
          const target = targets[0]
          this.executeKill(player, target, killCard)
        }
      }
    }

    // 装备
    for (const card of player.getCardsByType('equipment')) {
      if (card.type === 'equipment') {
        player.removeCard(card.id)
        const slot = (card as any).slot
        if (slot) {
          player.equip(card, slot)
          this.cardDeck.discard([card])
        }
      }
    }
  }

  executeKill(attacker: Player, defender: Player, killCard: Card): void {
    attacker.removeCard(killCard.id)
    this.cardDeck.discard([killCard])
    this.killUsedThisTurn = true

    this.eventBus.emit({ type: 'card:play', sourceHeroId: attacker.getId(), targetHeroId: defender.getId(), data: { cardId: killCard.id, cardName: '杀' } })

    // 检查防御方有没有闪
    const dodgeCard = defender.getHand().find(c => c.name === '闪')
    if (dodgeCard) {
      defender.removeCard(dodgeCard.id)
      this.cardDeck.discard([dodgeCard])
      this.eventBus.emit({ type: 'damage:prevent', sourceHeroId: defender.getId(), data: { cardId: dodgeCard.id } })
    } else {
      const damage = defender.takeDamage(1)
      this.eventBus.emit({ type: 'damage:deal', sourceHeroId: attacker.getId(), targetHeroId: defender.getId(), data: { damage } })
      this.eventBus.emit({ type: 'damage:receive', sourceHeroId: defender.getId(), data: { damage, from: attacker.getId() } })

      if (!defender.isAlive()) {
        this.eventBus.emit({ type: 'die', sourceHeroId: defender.getId(), data: { killedBy: attacker.getId() } })
      }
    }
  }

  getEnemies(player: Player): Player[] {
    const role = player.getRole()
    if (role === 'player' || role === 'ally') {
      return this.players.filter(p => p.getRole() === 'enemy' && p.isAlive())
    }
    return this.players.filter(p => (p.getRole() === 'player' || p.getRole() === 'ally') && p.isAlive())
  }

  getAlivePlayers(): Player[] {
    return this.players.filter(p => p.isAlive())
  }

  private advanceToNextAlive(): void {
    let attempts = 0
    do {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length
      attempts++
    } while (!this.players[this.currentPlayerIndex].isAlive() && attempts < this.players.length)
  }

  private checkGameEnd(): void {
    const playerAlive = this.players.some(p => (p.getRole() === 'player' || p.getRole() === 'ally') && p.isAlive())
    const enemyAlive = this.players.some(p => p.getRole() === 'enemy' && p.isAlive())

    if (!playerAlive) {
      this.isOver = true
      this.winner = 'enemy'
    } else if (!enemyAlive) {
      this.isOver = true
      this.winner = 'player'
    }
  }

  getState(): GameState {
    return {
      id: this.id,
      turnNumber: this.turnNumber,
      currentPhase: 'play',
      currentHeroId: this.players[this.currentPlayerIndex]?.getId() ?? '',
      heroes: this.players.map(p => p.toBattleHero()),
      drawPile: [],
      discardPile: [],
      isOver: this.isOver,
      winner: this.winner,
    }
  }

  private buildResult(): BattleResult {
    return {
      won: this.winner === 'player',
      turnCount: this.turnNumber,
      rewards: {
        gold: this.winner === 'player' ? 100 : 0,
        growthValue: this.winner === 'player' ? 50 : 0,
        heroFragments: [],
        treasureFragments: [],
      },
      stars: this.winner === 'player' ? 1 : 0,
    }
  }
}
