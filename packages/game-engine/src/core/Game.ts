import type {
  Hero, HeroInstance, Role, GameState, BattleResult, GameAction, Card, Suit
} from '@hero-legend/shared-types'
import { isRedSuit, isBlackSuit, getSubTriggerBonus } from '@hero-legend/shared-types'
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
  /** 变法/判定交互：返回要替换的手牌ID，null表示不替换 */
  judgeActionHandler?: (game: Game, player: Player, judgeCard: Card) => Promise<string | null>
  /** 响应交互：例如决斗中打杀/南蛮入侵出杀，返回要打的牌ID, null表示不响应 */
  responseActionHandler?: (game: Game, player: Player, responseType: 'kill' | 'nullify', context: { sourceHeroId: string, schemeName: string, needCount?: number, targetHeroId?: string }) => Promise<string | null>
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
  private lastPlayedCardName: string | null = null
  private zuijiuActive = false  // 醉酒：本回合杀/决斗伤害+1
  private skipNextTurn = false   // 蓄谋：跳过下一回合
  private skipCurrentTurn = false // 画地为牢：跳过当前回合
  private aoJianActive = new Set<string>()  // 傲剑主动模式: 玩家id集合, 回合结束清空

  get canPlayKill() {
    const player = this.players.find(p => p.getRole() === 'player')
    if (!player) return false
    return !this.killUsedThisTurn || player.hasSkillOrTreasure('tian-lang')
  }

  // 傲剑主动模式: UI点击时调用
  activateAoJian(playerId: string): void {
    this.aoJianActive.add(playerId)
  }
  deactivateAoJian(playerId: string): void {
    this.aoJianActive.delete(playerId)
  }
  isAoJianActive(playerId: string): boolean {
    return this.aoJianActive.has(playerId)
  }

  constructor(private config: GameConfig) {
    this.id = `game-${Date.now()}`
    this.eventBus = new EventBus()
    this.cardDeck = new CardDeck(createFullDeck())
    this.players = []

    const playerHero = getHeroById(config.playerHeroId)!
    this.players.push(new Player(playerHero, config.playerInstance, 'player'))

    for (const allyId of config.allyHeroIds) {
      const hero = getHeroById(allyId)
      if (hero) {
        this.players.push(new Player(hero, { heroId: allyId, level: 1, growthValue: 0, starLevel: hero.starLevel, treasures: { main: [], sub: [] } }, 'ally'))
      }
    }

    for (const enemyId of config.enemyHeroIds) {
      const hero = getHeroById(enemyId)
      if (hero) {
        this.players.push(new Player(hero, { heroId: enemyId, level: 1, growthValue: 0, starLevel: hero.starLevel, treasures: { main: [], sub: [] } }, 'enemy'))
      }
    }
  }

  // --- Helpers ---

  emitSkillTrigger(player: Player, name: string, effect: string): void {
    this.eventBus.emit({ type: 'skill:trigger', sourceHeroId: player.getId(), data: { skillName: name, effect } })
  }

  private isEffectivelyRed(card: Card, player: Player): boolean {
    if (isRedSuit(card.suit)) return true
    return player.hasSkillOrTreasure('hong-zhuang') && isBlackSuit(card.suit)
  }

  private canUseAsKill(card: Card, player: Player): boolean {
    if (card.name === '杀') return true
    // 傲剑 (主动模式): 红色牌当杀, 包括药
    if (player.hasSkillOrTreasure('ao-jian') && this.aoJianActive.has(player.getId()) && this.isEffectivelyRed(card, player)) return true
    // 武穆: 闪当杀
    if (player.hasSkillOrTreasure('wu-mu') && card.name === '闪') return true
    return false
  }

  private canUseAsDodge(card: Card, player: Player): boolean {
    if (card.name === '闪') return true
    // 轻影: 黑色牌当闪
    if (player.hasSkillOrTreasure('qing-ying') && isBlackSuit(card.suit) && card.name !== '药') return true
    // 武穆: 杀当闪
    if (player.hasSkillOrTreasure('wu-mu') && card.name === '杀') return true
    return false
  }

  private findKillCard(player: Player): Card | undefined {
    return player.getHand().find(c => this.canUseAsKill(c, player))
  }

  private findDodgeCard(player: Player): Card | undefined {
    return player.getHand().find(c => this.canUseAsDodge(c, player))
  }

  private rollSubTreasure(player: Player, skillId: string): boolean {
    const treasure = [...player.hero.instance.treasures.sub].find(t => t?.skill.id === skillId)
    if (!treasure) return false
    const bonus = getSubTriggerBonus(player.hero.instance.starLevel)
    return Math.random() < treasure.triggerRate + bonus
  }

  private isMale(player: Player): boolean {
    // 简单判断：虞姬、小乔、李师师、武则天、赵飞燕、吕雉、花木兰、褒姒 为女性
    const femaleIds = ['yu-ji', 'xiao-qiao', 'li-shi-shi', 'wu-ze-tian', 'zhao-fei-yan', 'lv-zhi', 'hua-mu-lan', 'bao-si']
    return !femaleIds.includes(player.getId())
  }

  /** 抽取一张手牌（用于法家、起义等） */
  private stealRandomCard(from: Player, to: Player): void {
    const hand = from.getHand()
    if (hand.length === 0) return
    const card = hand[Math.floor(Math.random() * hand.length)]
    from.removeCard(card.id)
    to.drawCards([card])
  }

  /** 判定：翻牌堆顶一张牌，链式变法替换，返回最终花色 */
  async judge(judgingPlayer?: Player): Promise<{ suit: Suit; card: Card }> {
    const cards = this.cardDeck.draw(1)
    let card = cards[0]
    this.eventBus.emit({ type: 'judge', data: { suit: card.suit, number: card.number, cardName: card.name, phase: 'reveal' } })

    // 变法链: 从判定方开始, 顺时针遍历所有存活玩家
    // 每人可改一次, 多个变法玩家按顺序链式修改, 以最后一个为准
    const alivePlayers = this.players.filter(p => p.isAlive())
    const startIdx = judgingPlayer ? alivePlayers.indexOf(judgingPlayer) : 0
    // 防御: 如果 judgingPlayer 不在 alivePlayers 中(理论上不会), 从头开始
    const orderedPlayers = startIdx >= 0
      ? [...alivePlayers.slice(startIdx), ...alivePlayers.slice(0, startIdx)]
      : alivePlayers

    for (const player of orderedPlayers) {
      if (!player.hasSkillOrTreasure('bian-fa')) continue
      if (!player.useSkill('bian-fa')) continue
      if (player.getHandSize() === 0) continue

      let replaceCardId: string | null = null
      if (player.getRole() === 'player' && this.config.judgeActionHandler) {
        replaceCardId = await this.config.judgeActionHandler(this, player, card)
      } else {
        // AI: 50%概率替换（简化逻辑）
        replaceCardId = Math.random() < 0.5 ? player.getHand()[0].id : null
      }

      if (replaceCardId) {
        const replacement = player.removeCard(replaceCardId)
        if (replacement) {
          this.cardDeck.discard([card])
          this.emitSkillTrigger(player, '变法', `用${replacement.name}替换${card.name}`)
          card = replacement
          this.eventBus.emit({ type: 'judge', data: { suit: card.suit, number: card.number, cardName: card.name, phase: 'replace' } })
        }
      }
    }

    this.cardDeck.discard([card])
    this.eventBus.emit({ type: 'judge', data: { suit: card.suit, number: card.number, cardName: card.name, phase: 'result' } })
    return { suit: card.suit, card }
  }

  // --- Game flow ---

  async start(): Promise<BattleResult> {
    this.eventBus.emit({ type: 'game:start', data: { playerCount: this.players.length } })

    for (const player of this.players) {
      const cards = this.cardDeck.draw(4)
      player.drawCards(cards)
    }

    this.currentPlayerIndex = 0

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

    // 蓄谋：跳过回合
    if (this.skipNextTurn && (player.getRole() === 'player' || player.getRole() === 'ally')) {
      this.skipNextTurn = false
      this.emitSkillTrigger(player, '蓄谋', '跳过本回合')
      this.eventBus.emit({ type: 'turn:start', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })
      this.eventBus.emit({ type: 'turn:end', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })
      this.advanceToNextAlive()
      return
    }

    player.resetSkillUses()
    this.killUsedThisTurn = false
    this.lastPlayedCardName = null
    this.zuijiuActive = false
    this.aoJianActive.clear()  // 傲剑主动模式: 每个玩家回合开始时清空
    const ctx = { player, cardDeck: this.cardDeck, eventBus: this.eventBus, game: this }

    this.eventBus.emit({ type: 'turn:start', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })

    // 画地为牢：跳过当前回合
    if (this.skipCurrentTurn) {
      this.skipCurrentTurn = false
      this.eventBus.emit({ type: 'turn:end', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })
      this.advanceToNextAlive()
      return
    }

    // 判定阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'judge' } })
    await new JudgePhase().execute(ctx)
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'judge' } })

    if (!player.isAlive()) { this.advanceToNextAlive(); return }

    // 摸牌阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'draw' } })
    await new DrawPhase().execute(ctx)
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'draw' } })

    if (!player.isAlive()) { this.advanceToNextAlive(); return }

    // 出牌阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'play' } })
    if (player.getRole() === 'player' && this.config.playerActionHandler) {
      await this.config.playerActionHandler(this, player)
    } else {
      await this.autoPlayPhase(player)
    }
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'play' } })

    // 弃牌阶段
    this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'discard' } })
    await new DiscardPhase().execute(ctx)
    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'discard' } })

    // 回合结束触发
    this.onTurnEnd(player)

    this.eventBus.emit({ type: 'turn:end', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })
    this.advanceToNextAlive()
  }

  private onTurnEnd(player: Player): void {
    // 蓄谋: 回合结束摸三张，跳过下回合
    if (player.hasSkillOrTreasure('xu-mou') && player.useSkill('xu-mou')) {
      const cards = this.cardDeck.draw(3)
      player.drawCards(cards)
      this.skipNextTurn = true
      this.emitSkillTrigger(player, '蓄谋', '摸3张，跳过下回合')
    }
  }

  private async autoPlayPhase(player: Player): Promise<void> {
    const hand = player.getHand()

    // 醉酒: AI自动少摸一张（在DrawPhase已处理摸牌，这里标记伤害+1）
    // 简化：AI不做醉酒选择

    // 用药
    for (const card of hand) {
      if (card.name === '药' && player.getCurrentHp() < player.getMaxHp()) {
        player.removeCard(card.id)
        let healAmount = 1
        if (this.rollSubTreasure(player, 'yi-xin')) {
          healAmount += 1
          this.emitSkillTrigger(player, '医心', '治疗+1')
        }
        player.heal(healAmount)
        this.cardDeck.discard([card])
        this.eventBus.emit({ type: 'heal', sourceHeroId: player.getId(), data: { amount: healAmount } })
        break
      }
    }

    // 驭人: AI弃掉不需要的牌换新牌
    if (player.hasSkillOrTreasure('yu-ren') && player.useSkill('yu-ren')) {
      const handNow = player.getHand()
      const uselessCards = handNow.filter(c => c.name === '闪' || (c.type === 'equipment' && c.name !== '进攻马'))
      if (uselessCards.length > 0) {
        const discardCount = Math.min(uselessCards.length, 2)
        for (let i = 0; i < discardCount; i++) {
          const c = player.removeCard(uselessCards[i].id)
          if (c) this.cardDeck.discard([c])
        }
        const newCards = this.cardDeck.draw(discardCount)
        player.drawCards(newCards)
        this.emitSkillTrigger(player, '驭人', `弃${discardCount}摸${discardCount}`)
      }
    }

    // 出杀
    const canKill = !this.killUsedThisTurn || player.hasSkillOrTreasure('tian-lang')
    if (canKill) {
      const killCard = this.findKillCard(player)
      if (killCard) {
        const targets = this.getEnemies(player)
        if (targets.length > 0) {
          await this.executeKill(player, targets[0], killCard)
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

  // --- Kill execution ---

  async executeKill(attacker: Player, defender: Player, killCard: Card): Promise<void> {
    attacker.removeCard(killCard.id)
    this.cardDeck.discard([killCard])

    if (!attacker.hasSkillOrTreasure('tian-lang')) {
      this.killUsedThisTurn = true
      attacker.setUsedKillThisTurn(true)
    }

    const usedAsSkill = killCard.name !== '杀'
    let skillName = ''
    if (usedAsSkill) {
      if (killCard.name === '闪' && attacker.hasSkillOrTreasure('wu-mu')) skillName = '武穆'
      else if (attacker.hasSkillOrTreasure('ao-jian')) skillName = '傲剑'
    }

    this.eventBus.emit({
      type: 'card:play',
      sourceHeroId: attacker.getId(),
      targetHeroId: defender.getId(),
      data: { cardId: killCard.id, cardName: '杀', usedAsSkill: skillName || undefined },
    })

    if (usedAsSkill) {
      this.emitSkillTrigger(attacker, skillName, `${killCard.name}当杀`)
    }

    this.lastPlayedCardName = '杀'

    // 刺客: 判定
    let assassinNoDodge = false
    let assassinDiscard = false
    if (attacker.hasSkillOrTreasure('ci-ke')) {
      const j = await this.judge(attacker)
      if (isRedSuit(j.suit)) {
        assassinNoDodge = true
        this.emitSkillTrigger(attacker, '刺客', '红色-不可被闪')
      } else {
        assassinDiscard = true
      }
    }

    // 检查防御
    let dodged = false
    if (!assassinNoDodge) {
      // 需要几张闪?
      let dodgeNeeded = 1
      if (attacker.hasSkillOrTreasure('ba-wang')) {
        dodgeNeeded = 2
        this.emitSkillTrigger(attacker, '霸王', '需要两张闪')
      }

      let dodgeCount = 0
      for (let i = 0; i < dodgeNeeded; i++) {
        const dodgeCard = this.findDodgeCard(defender)
        if (dodgeCard) {
          defender.removeCard(dodgeCard.id)
          this.cardDeck.discard([dodgeCard])
          dodgeCount++
          const dodgeSkill = dodgeCard.name !== '闪'
          this.eventBus.emit({ type: 'damage:prevent', sourceHeroId: defender.getId(), data: { cardId: dodgeCard.id } })
          if (dodgeSkill) {
            let dName = '轻影'
            if (dodgeCard.name === '杀' && defender.hasSkillOrTreasure('wu-mu')) dName = '武穆'
            this.emitSkillTrigger(defender, dName, `${dodgeCard.name}当闪`)
          }
          // 图强: 回合外打出闪摸一张牌
          if (defender.hasSkillOrTreasure('tu-qiang')) {
            const drawn = this.cardDeck.draw(1)
            defender.drawCards(drawn)
            this.emitSkillTrigger(defender, '图强', '打出闪摸一张')
          }
        } else {
          break
        }
      }
      dodged = dodgeCount >= dodgeNeeded
    }

    if (!dodged) {
      let damage = 1
      // 醉酒伤害+1
      if (this.zuijiuActive) {
        damage += 1
        this.zuijiuActive = false
      }
      const actualDamage = defender.takeDamage(damage)
      this.eventBus.emit({ type: 'damage:deal', sourceHeroId: attacker.getId(), targetHeroId: defender.getId(), data: { damage } })
      this.eventBus.emit({ type: 'damage:receive', sourceHeroId: defender.getId(), data: { damage, from: attacker.getId() } })

      // 受伤触发
      await this.onDamageReceived(defender, attacker, killCard)

      // 刺客黑色: 弃对方一张牌
      if (assassinDiscard) {
        const dHand = defender.getHand()
        if (dHand.length > 0) {
          const target = dHand[Math.floor(Math.random() * dHand.length)]
          defender.removeCard(target.id)
          this.cardDeck.discard([target])
          this.emitSkillTrigger(attacker, '刺客', '黑色-弃对方一张牌')
        }
      }

      if (!defender.isAlive()) {
        this.eventBus.emit({ type: 'die', sourceHeroId: defender.getId(), data: { killedBy: attacker.getId() } })
      }
    } else {
      // 强掠: 杀被闪后判定，黑色抽对方一张
      if (attacker.hasSkillOrTreasure('qiang-lue')) {
        const j = await this.judge(attacker)
        if (isBlackSuit(j.suit)) {
          this.stealRandomCard(defender, attacker)
          this.emitSkillTrigger(attacker, '强掠', '抽对方一张牌')
        }
      }
    }

    // 强运: 使用最后一张手牌时摸一张
    if (attacker.hasSkillOrTreasure('qiang-yun') && attacker.getHandSize() === 0) {
      const drawn = this.cardDeck.draw(1)
      attacker.drawCards(drawn)
      this.emitSkillTrigger(attacker, '强运', '最后一张手牌摸一张')
    }
  }

  /** 受伤后的被动技能触发 */
  private async onDamageReceived(victim: Player, attacker: Player, sourceCard?: Card): Promise<void> {
    // 集权: 获得造成伤害的牌
    if (victim.hasSkillOrTreasure('ji-tian') && sourceCard) {
      // 简化：摸一张替代（牌已进弃牌堆）
      const drawn = this.cardDeck.draw(1)
      victim.drawCards(drawn)
      this.emitSkillTrigger(victim, '集权', '获得造成伤害的牌')
    }

    // 舍身: 掉血摸两张
    if (victim.hasSkillOrTreasure('she-shen')) {
      const drawn = this.cardDeck.draw(2)
      victim.drawCards(drawn)
      this.emitSkillTrigger(victim, '舍身', '受伤摸两张')
    }

    // 法家: 获得伤害来源一张手牌
    if (victim.hasSkillOrTreasure('fa-jia') && attacker.getHandSize() > 0) {
      this.stealRandomCard(attacker, victim)
      this.emitSkillTrigger(victim, '法家', '获得伤害来源一张牌')
    }

    // 还击: 对来源出杀(红色不可避)
    if (victim.hasSkillOrTreasure('fan-ji') && attacker.isAlive()) {
      const hand = victim.getHand()
      // 找杀或红色牌当杀
      const killCard = hand.find(c => c.name === '杀' || (isRedSuit(c.suit) && c.name !== '药'))
      if (killCard) {
        victim.removeCard(killCard.id)
        this.cardDeck.discard([killCard])
        const dmg = attacker.takeDamage(1)
        this.emitSkillTrigger(victim, '还击', '对来源出杀')
        this.eventBus.emit({ type: 'damage:deal', sourceHeroId: victim.getId(), targetHeroId: attacker.getId(), data: { damage: dmg } })
        if (!attacker.isAlive()) {
          this.eventBus.emit({ type: 'die', sourceHeroId: attacker.getId(), data: { killedBy: victim.getId() } })
        }
      }
    }

    // 复仇: 判定，非红桃则来源受1伤或弃2牌
    if (victim.hasSkillOrTreasure('fu-chou') && attacker.isAlive()) {
      const j = await this.judge(victim)
      if (j.suit !== 'heart') {
        // 简化：直接造成1点伤害
        const dmg = attacker.takeDamage(1)
        this.emitSkillTrigger(victim, '复仇', '来源受到1点伤害')
        this.eventBus.emit({ type: 'damage:deal', sourceHeroId: victim.getId(), targetHeroId: attacker.getId(), data: { damage: dmg } })
        if (!attacker.isAlive()) {
          this.eventBus.emit({ type: 'die', sourceHeroId: attacker.getId(), data: { killedBy: victim.getId() } })
        }
      }
    }

    // 妙计: 使用锦囊牌摸一张 (sourceCard为锦囊时)
    // 这个在card:play时触发更合适，此处跳过
  }

  // --- Query methods ---

  // --- Duel (决斗) ---

  async executeDuel(initiator: Player, target: Player): Promise<void> {
    if (!target.isAlive() || !initiator.isAlive()) return

    // 交替出杀, target 先. 输方掉1血
    let current = target
    let other = initiator
    let lastKiller: Player | null = null  // 上一轮出杀的人
    let needCount = 1  // 本轮需要出几张杀(霸王影响)

    while (current.isAlive()) {
      // 找杀(傲剑: 红色牌当杀, 武穆: 闪当杀, 排除药)
      const killCard = await this.promptResponseKill(current, initiator.getId(), '决斗', needCount)
      if (!killCard) {
        // 输: current 掉1血
        this.dealDuelDamage(current, lastKiller ?? other)
        return
      }
      // 出杀
      current.removeCard(killCard.id)
      this.cardDeck.discard([killCard])

      // 标记傲剑/武穆
      const usedAsSkill = killCard.name !== '杀'
      let skillName = ''
      if (usedAsSkill) {
        if (killCard.name === '闪' && current.hasSkillOrTreasure('wu-mu')) skillName = '武穆'
        else if (current.hasSkillOrTreasure('ao-jian')) skillName = '傲剑'
      }

      this.eventBus.emit({
        type: 'card:play',
        sourceHeroId: current.getId(),
        data: { cardId: killCard.id, cardName: '杀', usedAsSkill: skillName || undefined },
      })
      if (usedAsSkill) {
        this.emitSkillTrigger(current, skillName, `${killCard.name}当杀`)
      }

      lastKiller = current

      // 霸王: 出杀者有霸王, 下一轮需要2张杀
      needCount = current.hasSkillOrTreasure('ba-wang') ? 2 : 1

      // 切换
      ;[current, other] = [other, current]
    }
  }

  private async promptResponseKill(player: Player, sourceHeroId: string, schemeName: string, needCount: number): Promise<Card | null> {
    if (player.getRole() !== 'player') {
      // AI: 直接找一张杀
      return this.findKillCard(player) ?? null
    }
    if (!this.config.responseActionHandler) return null
    const cardId = await this.config.responseActionHandler(this, player, 'kill', { sourceHeroId, schemeName, needCount })
    if (!cardId) return null
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || !this.canUseAsKill(card, player)) return null
    return card
  }

  private dealDuelDamage(loser: Player, source: Player): void {
    let damage = 1
    if (this.zuijiuActive) {
      damage += 1
      this.zuijiuActive = false
    }
    const actual = loser.takeDamage(damage)
    this.eventBus.emit({ type: 'damage:deal', sourceHeroId: source.getId(), targetHeroId: loser.getId(), data: { damage } })
    this.eventBus.emit({ type: 'damage:receive', sourceHeroId: loser.getId(), data: { damage, from: source.getId() } })
    if (!loser.isAlive()) {
      this.eventBus.emit({ type: 'die', sourceHeroId: loser.getId(), data: { killedBy: source.getId() } })
    }
  }

  // --- 无懈可击 (锦囊抵消) ---

  async checkNullification(schemePlayer: Player, targetPlayer: Player | undefined, schemeCard: Card): Promise<boolean> {
    const alivePlayers = this.getAlivePlayers()
    const startIdx = targetPlayer
      ? alivePlayers.indexOf(targetPlayer)
      : (alivePlayers.indexOf(schemePlayer) + 1) % alivePlayers.length
    if (startIdx < 0) return false
    const ordered = [
      ...alivePlayers.slice(startIdx),
      ...alivePlayers.slice(0, startIdx),
    ]

    let nullified = false

    for (const candidate of ordered) {
      if (!candidate.isAlive()) continue
      const wxCard = await this.promptNullifyResponse(candidate, schemePlayer, schemeCard)
      if (!wxCard) continue

      candidate.removeCard(wxCard.id)
      this.cardDeck.discard([wxCard])
      this.eventBus.emit({
        type: 'card:play', sourceHeroId: candidate.getId(),
        data: { cardId: wxCard.id, cardName: '无懈可击' },
      })
      nullified = !nullified
    }

    if (nullified) {
      this.eventBus.emit({
        type: 'scheme:nullify', sourceHeroId: schemePlayer.getId(),
        data: { originalCardName: schemeCard.name, nullified: true },
      })
    }
    return nullified
  }

  private async promptNullifyResponse(candidate: Player, schemePlayer: Player, schemeCard: Card): Promise<Card | null> {
    const wxCard = candidate.getHand().find(c => c.name === '无懈可击')
    if (!wxCard) return null

    if (candidate.getRole() === 'player') {
      if (!this.config.responseActionHandler) return null
      const cardId = await this.config.responseActionHandler(
        this, candidate, 'nullify',
        { sourceHeroId: schemePlayer.getId(), schemeName: schemeCard.name, targetHeroId: undefined },
      )
      if (!cardId) return null
      const card = candidate.getHand().find(c => c.id === cardId)
      if (!card || card.name !== '无懈可击') return null
      return card
    }

    // AI
    return this.aiNullifyDecision(candidate, schemePlayer, schemeCard, wxCard)
  }

  private aiNullifyDecision(candidate: Player, schemePlayer: Player, schemeCard: Card, wxCard: Card): Card | null {
    const candidateRole = candidate.getRole()
    const schemePlayerRole = schemePlayer.getRole()
    const isEnemy = (candidateRole === 'player' || candidateRole === 'ally') && schemePlayerRole === 'enemy'
      || candidateRole === 'enemy' && (schemePlayerRole === 'player' || schemePlayerRole === 'ally')

    let probability = 0
    if (isEnemy) {
      const harmful = ['决斗', '釜底抽薪', '探囊取物', '画地为牢', '手捧雷', '万箭齐发', '南蛮入侵']
      probability = harmful.includes(schemeCard.name) ? 0.6 : 0.2
    }
    if (candidate.getHandSize() <= 2) probability *= 0.5

    return Math.random() < probability ? wxCard : null
  }

  /** 手捧雷顺延：找到下一个无雷的存活玩家 */
  findNextPlayerWithoutThunder(from: Player): Player | undefined {
    const alive = this.getAlivePlayers()
    const idx = alive.indexOf(from)
    for (let i = 1; i <= alive.length; i++) {
      const next = alive[(idx + i) % alive.length]
      if (!next.getJudgeCards().some(c => c.name === '手捧雷')) return next
    }
    return undefined
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

  getPlayer(): Player {
    return this.players.find(p => p.getRole() === 'player')!
  }

  getPlayerById(id: string): Player | undefined {
    return this.players.find(p => p.getId() === id)
  }

  // --- Public player action methods ---

  canPlayerUseAsKill(cardId: string): boolean {
    const player = this.getPlayer()
    const card = player.getCard(cardId)
    if (!card) return false
    return this.canUseAsKill(card, player)
  }

  async playerPlayKill(player: Player, targetId: string, cardId: string): Promise<void> {
    const killCard = player.getHand().find(c => c.id === cardId)
    if (!killCard || !this.canUseAsKill(killCard, player)) return
    if (this.killUsedThisTurn && !player.hasSkillOrTreasure('tian-lang')) return
    const target = this.players.find(p => p.getId() === targetId)
    if (!target || !target.isAlive()) return
    await this.executeKill(player, target, killCard)
  }

  async playerPlayScheme(player: Player, cardId: string, targetId?: string): Promise<void> {
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || card.type !== 'scheme') return

    player.removeCard(card.id)
    this.cardDeck.discard([card])
    this.eventBus.emit({
      type: 'card:play',
      sourceHeroId: player.getId(),
      targetHeroId: targetId,
      data: { cardId: card.id, cardName: card.name },
    })
    this.lastPlayedCardName = card.name

    // 延时锦囊：放到目标判定区
    if ((card as any).delayed) {
      if (card.name === '手捧雷') {
        const hasThunder = player.getJudgeCards().some(c => c.name === '手捧雷')
        if (hasThunder) {
          player.drawCards([card])
          this.emitSkillTrigger(player, '手捧雷', '已有雷标记-使用失败')
          return
        }
        const aliveCount = this.players.filter(p => p.isAlive()).length
        const thunderCount = this.players.reduce((n, p) => n + p.getJudgeCards().filter(c => c.name === '手捧雷').length, 0)
        if (thunderCount >= aliveCount) {
          player.drawCards([card])
          this.emitSkillTrigger(player, '手捧雷', '雷已达上限-使用失败')
          return
        }
        const nullified = await this.checkNullification(player, player, card)
        if (nullified) {
          // 被无懈可击抵消: 顺延到下一个无雷玩家
          const next = this.findNextPlayerWithoutThunder(player)
          if (next) {
            next.addJudgeCard(card)
            this.eventBus.emit({
              type: 'skill:trigger', sourceHeroId: next.getId(),
              data: { skillName: '手捧雷', effect: `被抵消-顺延到${next.getName()}` },
            })
          }
          return
        }
        player.addJudgeCard(card)
        this.eventBus.emit({
          type: 'skill:trigger', sourceHeroId: player.getId(),
          data: { skillName: '手捧雷', effect: '标记雷-下回合开始判定' },
        })
        return
      }
      // 画地为牢
      let target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
      if (!target || !target.isAlive()) return
      const hdNullified = await this.checkNullification(player, target, card)
      if (hdNullified) return  // 被抵消, 不放置
      target.addJudgeCard(card)
      this.eventBus.emit({
        type: 'skill:trigger', sourceHeroId: target.getId(),
        data: { skillName: card.name, effect: '放入判定区' },
      })
      return
    }

    // 立即锦囊: 先检查无懈可击
    const schemeTarget = targetId ? this.players.find(p => p.getId() === targetId) : undefined
    const schemeNullified = await this.checkNullification(player, schemeTarget, card)
    if (schemeNullified) {
      // 被抵消, 不执行效果
    } else if (card.name === '无中生有') {
      const drawn = this.cardDeck.draw(2)
      player.drawCards(drawn)
      this.eventBus.emit({ type: 'card:draw', sourceHeroId: player.getId(), data: { count: 2, reason: '无中生有' } })
    } else if (card.name === '探囊取物') {
      const target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
      if (target && target.getHandSize() > 0) {
        const stolen = target.getHand()[Math.floor(Math.random() * target.getHandSize())]
        target.removeCard(stolen.id)
        player.drawCards([stolen])
        this.emitSkillTrigger(player, '探囊取物', `从${target.getName()}获取一张牌`)
      }
    } else if (card.name === '釜底抽薪') {
      const target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
      if (target) {
        const hand = target.getHand()
        const count = Math.min(2, hand.length)
        for (let i = 0; i < count; i++) {
          const c = target.removeCard(hand[hand.length - 1 - i].id)
          if (c) this.cardDeck.discard([c])
        }
        this.emitSkillTrigger(player, '釜底抽薪', `${target.getName()}弃${count}张牌`)
      }
    } else if (card.name === '决斗') {
      const target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
      if (target && target.isAlive() && target.getId() !== player.getId()) {
        await this.executeDuel(player, target)
      }
    } else if (card.name === '休养生息') {
      for (const p of this.getAlivePlayers()) {
        if (p.getCurrentHp() < p.getMaxHp()) {
          const healed = p.heal(1)
          this.eventBus.emit({ type: 'heal', sourceHeroId: p.getId(), data: { amount: healed } })
        }
      }
    } else if (card.name === '烽火狼烟') {
      for (const target of this.getEnemies(player)) {
        if (!target.isAlive()) continue
        const killCard = this.findKillCard(target)
        if (killCard) {
          target.removeCard(killCard.id)
          this.cardDeck.discard([killCard])
          this.eventBus.emit({
            type: 'damage:prevent', sourceHeroId: target.getId(),
            targetHeroId: player.getId(),
            data: { cardName: killCard.name },
          })
        } else {
          let damage = 1
          if (this.zuijiuActive) { damage += 1; this.zuijiuActive = false }
          target.takeDamage(damage)
          this.eventBus.emit({ type: 'damage:deal', sourceHeroId: player.getId(), targetHeroId: target.getId(), data: { damage } })
          this.eventBus.emit({ type: 'damage:receive', sourceHeroId: target.getId(), data: { damage, from: player.getId() } })
          if (!target.isAlive()) {
            this.eventBus.emit({ type: 'die', sourceHeroId: target.getId(), data: { killedBy: player.getId() } })
          }
        }
      }
    }

    // 强运: 使用最后一张手牌时摸一张
    if (player.hasSkillOrTreasure('qiang-yun') && player.getHandSize() === 0) {
      const drawn = this.cardDeck.draw(1)
      player.drawCards(drawn)
      this.emitSkillTrigger(player, '强运', '最后一张手牌摸一张')
    }
  }

  playerPlayHeal(player: Player, cardId: string): void {
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || card.name !== '药') return
    if (player.getCurrentHp() >= player.getMaxHp()) return
    player.removeCard(card.id)
    let healAmount = 1
    if (this.rollSubTreasure(player, 'yi-xin')) {
      healAmount += 1
      this.emitSkillTrigger(player, '医心', '治疗+1')
    }
    player.heal(healAmount)
    this.cardDeck.discard([card])
    this.eventBus.emit({ type: 'heal', sourceHeroId: player.getId(), data: { amount: healAmount } })
    this.lastPlayedCardName = '药'

    if (player.hasSkillOrTreasure('qiang-yun') && player.getHandSize() === 0) {
      const drawn = this.cardDeck.draw(1)
      player.drawCards(drawn)
      this.emitSkillTrigger(player, '强运', '最后一张手牌摸一张')
    }
  }

  playerEquipCard(player: Player, cardId: string): void {
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || card.type !== 'equipment') return
    const slot = (card as any).slot
    if (!slot) return
    player.removeCard(card.id)
    player.equip(card, slot)
    this.cardDeck.discard([card])
    this.eventBus.emit({ type: 'equipment:equip', sourceHeroId: player.getId(), data: { cardId: card.id, slot } })
    this.lastPlayedCardName = '装备'
  }

  /** 驭人: 弃牌摸牌 */
  playerYuRen(player: Player, cardIds: string[]): void {
    if (!player.hasSkillOrTreasure('yu-ren')) return
    if (!player.useSkill('yu-ren')) return
    for (const cid of cardIds) {
      const c = player.removeCard(cid)
      if (c) this.cardDeck.discard([c])
    }
    const drawn = this.cardDeck.draw(cardIds.length)
    player.drawCards(drawn)
    this.emitSkillTrigger(player, '驭人', `弃${cardIds.length}摸${cardIds.length}`)
    this.lastPlayedCardName = '驭人'
  }

  /** 奸雄: 打出一张牌当上一张打出的牌 */
  playerJianXiong(player: Player, cardId: string): void {
    if (!player.hasSkillOrTreasure('jian-xiong')) return
    if (!player.useSkill('jian-xiong')) return
    if (!this.lastPlayedCardName) return
    const card = player.getHand().find(c => c.id === cardId)
    if (!card) return
    player.removeCard(card.id)
    this.cardDeck.discard([card])
    this.emitSkillTrigger(player, '奸雄', `将${card.name}当${this.lastPlayedCardName}使用`)
    this.lastPlayedCardName = card.name

    if (player.hasSkillOrTreasure('qiang-yun') && player.getHandSize() === 0) {
      const drawn = this.cardDeck.draw(1)
      player.drawCards(drawn)
      this.emitSkillTrigger(player, '强运', '最后一张手牌摸一张')
    }
  }

  /** 醉酒: 标记本回合伤害+1 */
  playerZuiJiu(player: Player): void {
    if (!player.hasSkillOrTreasure('zui-jiu')) return
    if (!player.useSkill('zui-jiu')) return
    this.zuijiuActive = true
    this.emitSkillTrigger(player, '醉酒', '本回合杀伤害+1')
  }

  /** 疏财: 将手牌给其他角色 */
  playerShuCai(player: Player, cardIds: string[], targetId: string): void {
    if (!player.hasSkillOrTreasure('shu-cai')) return
    if (!player.useSkill('shu-cai')) return
    const target = this.getPlayerById(targetId)
    if (!target) return
    for (const cid of cardIds) {
      const card = player.removeCard(cid)
      if (card) target.drawCards([card])
    }
    if (cardIds.length >= 2 && player.getCurrentHp() < player.getMaxHp()) {
      player.heal(1)
      this.eventBus.emit({ type: 'heal', sourceHeroId: player.getId(), data: { amount: 1 } })
    }
    this.emitSkillTrigger(player, '疏财', `给${target.getName()} ${cardIds.length}张牌`)
  }

  /** 天香: 弃两张手牌令角色回复1 */
  playerTianXiang(player: Player, cardIds: string[], targetId: string): void {
    if (!player.hasSkillOrTreasure('tian-xiang')) return
    if (!player.useSkill('tian-xiang')) return
    const target = this.getPlayerById(targetId)
    if (!target || target.getCurrentHp() >= target.getMaxHp()) return
    for (const cid of cardIds) {
      const c = player.removeCard(cid)
      if (c) this.cardDeck.discard([c])
    }
    target.heal(1)
    this.eventBus.emit({ type: 'heal', sourceHeroId: target.getId(), data: { amount: 1 } })
    this.emitSkillTrigger(player, '天香', `${target.getName()}回复1体力`)
  }

  /** 攻心: 观看对方手牌弃一张红或黑 */
  playerGongXin(player: Player, targetId: string, color: 'red' | 'black'): void {
    if (!player.hasSkillOrTreasure('gong-xin')) return
    if (!player.useSkill('gong-xin')) return
    const target = this.getPlayerById(targetId)
    if (!target) return
    const hand = target.getHand()
    const toDiscard = hand.find(c =>
      color === 'red' ? isRedSuit(c.suit) : isBlackSuit(c.suit)
    )
    if (toDiscard) {
      target.removeCard(toDiscard.id)
      this.cardDeck.discard([toDiscard])
      this.emitSkillTrigger(player, '攻心', `弃${target.getName()}一张${color === 'red' ? '红色' : '黑色'}牌`)
    }
  }

  // --- Internal ---

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
