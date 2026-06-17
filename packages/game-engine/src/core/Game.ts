import type {
  Hero, HeroInstance, Role, GameState, BattleResult, GameAction, Card, Suit, EquipmentSlot, GameEvent
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
  responseActionHandler?: (game: Game, player: Player, responseType: 'kill' | 'nullify' | 'dodge', context: { sourceHeroId: string, schemeName: string, needCount?: number; targetHeroId?: string }) => Promise<string | null>
  /** 拼点交互：选择1张手牌参与拼点，返回null=取消 */
  pinDianHandler?: (game: Game, player: Player, against: Player, reason: string) => Promise<string | null>
  /** 侠胆: 拼点中玩家自己选1张手牌(双方同时选, 不会看到对方的牌), null=取消 */
  xiaDanPlayerCardHandler?: (game: Game, player: Player, against: Player) => Promise<string | null>
  /** 釜底抽薪：选目标 */
  fudiTargetHandler?: (game: Game, attacker: Player, candidates: Player[]) => Promise<string | null>
  /** 釜底抽薪：选要弃的目标牌（手牌/判定/装备之一） */
  fudiPickHandler?: (game: Game, attacker: Player, target: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => Promise<string | null>
  /** 探囊取物：选目标 */
  tanNangTargetHandler?: (game: Game, attacker: Player, candidates: Player[]) => Promise<string | null>
  /** 探囊取物：选要拿的目标牌 */
  tanNangPickHandler?: (game: Game, attacker: Player, target: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => Promise<string | null>
  /** 借刀杀人：选武器持有者 */
  jieDaoTargetHandler?: (game: Game, attacker: Player, weaponHolders: Player[]) => Promise<string | null>
  /** 借刀杀人：选攻击目标 */
  jieDaoAttackTargetHandler?: (game: Game, attacker: Player, borrower: Player, candidates: Player[]) => Promise<string | null>
  /** 五谷丰登：选牌 */
  wuguPickHandler?: (game: Game, picker: Player, candidates: Card[]) => Promise<string | null>
  /** 多目标（狼牙棒/侠胆多杀） */
  multiTargetHandler?: (game: Game, attacker: Player, candidates: Player[]) => Promise<string[]>
  /** 选2张手牌（芦叶枪） */
  dualCardHandler?: (game: Game, attacker: Player) => Promise<string[]>
  /** 芦叶枪：选杀的目标 */
  luYeQiangTargetHandler?: (game: Game, attacker: Player, candidates: Player[]) => Promise<string | null>
  /** 龙鳞刀：选对方2张牌弃掉 (返回2个cardId, 或null表示正常掉血) */
  longLinPickHandler?: (game: Game, attacker: Player, defender: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => Promise<string[] | null>
  /** 博浪锤：攻击方从手牌选2张弃掉强制命中 (返回2个cardId; null=放弃不触发) */
  boLangChuiHandler?: (game: Game, attacker: Player, hand: Card[]) => Promise<string[] | null>
  /** 法家: 受伤后从伤害来源选一张牌(手牌/装备/判定)获得 (null=不触发/放弃) */
  faJiaPickHandler?: (game: Game, victim: Player, attacker: Player, options: { hand: Card[]; judge: Card[]; equipment: Card[] }) => Promise<string | null>
  /** 玉如意: 防御方是否使用 (true=触发判定; false=跳过). attackName 用于显示在提示中 */
  yuRuYiHandler?: (game: Game, defender: Player, attackName: string) => Promise<boolean>
  /** 弃牌阶段: 选要弃的手牌, 返回要弃的牌ID数组 */
  discardPickHandler?: (game: Game, player: Player, handCards: Card[], discardCount: number) => Promise<string[]>
  /** 霸王弓: 选拆哪匹马, 返回 'attackMount' | 'defenseMount' | null */
  baWangMountHandler?: (game: Game, attacker: Player, defender: Player, mountOptions: { attackMount: Card | null; defenseMount: Card | null }) => Promise<'attackMount' | 'defenseMount' | null>
  /** 强掠: 杀被闪后是否要发动 (true=发动判定; false=不发动) */
  qiangLueHandler?: (game: Game, attacker: Player, defender: Player) => Promise<boolean>
  /** 刺客: 出杀指定目标后是否发动 (true=发动判定; false=不发动) */
  ciKeHandler?: (game: Game, attacker: Player, defender: Player) => Promise<boolean>
  /** 蝶魂: 群体锦囊目标是否发动 (true=跳过结算并摸1张; false=走正常逻辑) */
  dieHunHandler?: (game: Game, target: Player, schemeName: string) => Promise<boolean>
  /** 天香: 判定开始前是否发动 (返回cardId=弃1张手牌免判; null=不发动, 正常判定) */
  tianXiangHandler?: (game: Game, player: Player, judgeCard: Card) => Promise<string | null>
  /** 曼舞: 受伤时选择弃哪张红桃/黑桃手牌 (返回cardId; null=取消/不发动) */
  manWuPickCardHandler?: (game: Game, victim: Player) => Promise<string | null>
  /** 曼舞: 受伤时选择转移目标 (返回targetId; null=不发动) */
  manWuHandler?: (game: Game, victim: Player, attacker: Player, damage: number, candidates: Player[]) => Promise<string | null>
  /** 绝击: AI/玩家 是否发动以及选 (弃武器/null=受1血) + 目标. 返回null=不发动 */
  jueJiHandler?: (game: Game, attacker: Player, inRangeEnemies: Player[]) => Promise<{ weaponCardId: string | null; targetId: string } | null>
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
  private killsUsedThisTurn = 0        // 本回合已出杀次数
  private killsMaxThisTurn = 1         // 本回合最大杀次数 (天狼/虎符→Infinity; 侠胆胜→2)
  private lastPlayedCardName: string | null = null
  private zuijiuActive = false  // 醉酒：本回合杀/决斗伤害+1
  private skipNextTurnPlayerId: string | null = null  // 蓄谋：跳过指定玩家的下一回合
  private skipCurrentTurnPlayerId: string | null = null  // 画地为牢：跳过指定玩家的当前回合
  private aoJianActive = new Set<string>()  // 傲剑主动模式: 玩家id集合, 回合结束清空
  // 侠胆: 本回合赢了拼点 → 可出2张无距离限制的杀(每张最多2目标); 输了 → 本回合不能出杀
  private xiaDanWinKillsLeft = new Map<string, number>()    // playerId → 剩余杀次数
  private xiaDanWinTargetsPerKill = new Map<string, number>() // playerId → 每张杀目标数上限
  private xiaDanLossThisTurn = new Set<string>()             // 输了侠胆的玩家集合
  private xiaDanUsedThisTurn = new Set<string>()             // 本回合已尝试拼点的玩家 (限1次)
  private skipDrawThisTurn = false                            // 起义: 跳过本回合摸牌
  /** 五谷丰登剩余玩家延续函数 (玩家出牌后继续) */
  pendingWuguContinuation: (() => Promise<void>) | null = null

  get canPlayKill() {
    const player = this.players.find(p => p.getRole() === 'player')
    if (!player) return false
    if (this.xiaDanLossThisTurn.has(player.getId())) return false
    // 天狼/虎符: 杀无限制
    if (this.hasUnlimitedKill(player)) return true
    // 侠胆胜出后: 杀次数被设为2(已用算入)
    return this.killsUsedThisTurn < this.killsMaxThisTurn
  }

  /** 控局: 控局角色对手牌相关锦囊的免疫判定 */
  isKongJuImmuneTo(player: Player, schemeName: string): boolean {
    if (!player.hasSkillOrTreasure('kong-ju')) return false
    if (schemeName === '画地为牢') return player.getHandSize() > player.getMaxHp()
    if (schemeName === '探囊取物' || schemeName === '釜底抽薪') return player.getHandSize() < player.getMaxHp()
    return false
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

  isEffectivelyRed(card: Card, player: Player): boolean {
    if (isRedSuit(card.suit)) return true
    return player.hasSkillOrTreasure('hong-zhuang') && isBlackSuit(card.suit)
  }

  /** 红妆: 将黑桃花色视为红桃 (用于判定结果). 注意: 方块本就是红色, 由 isRedSuit 判定 */
  isEffectivelyHeart(suit: Suit, player: Player): boolean {
    if (suit === 'heart') return true
    return player.hasSkillOrTreasure('hong-zhuang') && suit === 'spade'
  }

  /** 红妆: 仅黑桃视作红色 (梅花依旧黑色) — 用于玉如意等需要"红色"判定的技能 */
  isEffectivelyRedForJudge(suit: Suit, player: Player): boolean {
    if (isRedSuit(suit)) return true
    return player.hasSkillOrTreasure('hong-zhuang') && suit === 'spade'
  }

  /**
   * 统一判定处理: 自动处理天香(可跳过)和红妆(黑桃→红桃)
   * - 先检查天香, 发动则跳过判定
   * - 判定结果自动应用红妆转换
   * - 返回: { skipped: boolean; suit: Suit; number: number }
   *
   * 所有新增判定技能都应调用此方法, 只需关注红/黑结果的业务逻辑
   */
  async judgeWithSkills(
    player: Player,
    reason: string,
  ): Promise<{ skipped: boolean; suit: Suit; number: number }> {
    // 构造虚拟判定牌供天香使用
    const judgeCard = { name: reason, type: 'skill' as const, suit: 'spade' as const, number: 1, id: `skill-${reason}-${Date.now()}` } as unknown as Card
    const skipped = await this.promptTianXiang(player, judgeCard)
    if (skipped) return { skipped: true, suit: 'spade', number: 1 }
    const j = await this.judge(player, reason)
    // 红妆: 黑桃视为红桃 (手捧雷等需要黑桃判定的技能失效)
    const effectiveSuit: Suit = j.suit === 'spade' && player.hasSkillOrTreasure('hong-zhuang')
      ? 'heart'
      : j.suit
    return { skipped: false, suit: effectiveSuit, number: j.card.number }
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

    this.eventBus.on('die', (event) => this.handleKillReward(event))
    this.eventBus.on('die', (event) => this.cleanupDeadPlayer(event))
  }

  // --- Helpers ---

  emitSkillTrigger(player: Player, name: string, effect: string): void {
    this.eventBus.emit({ type: 'skill:trigger', sourceHeroId: player.getId(), data: { skillName: name, effect } })
  }

  /** 是否无杀次数限制: 天狼技能 或 装备虎符武器 */
  private hasUnlimitedKill(player: Player): boolean {
    return player.hasSkillOrTreasure('tian-lang') || player.getWeaponName() === '虎符'
  }

  /** 强运: 手牌为空时立即摸2张（无次数限制；牌堆彻底为空时不再触发） */
  triggerQiangYun(player: Player): void {
    if (!player.hasSkillOrTreasure('qiang-yun')) return
    if (player.getHandSize() !== 0) return
    const drawn = this.cardDeck.draw(2)
    if (drawn.length === 0) return
    player.drawCards(drawn)
    this.emitSkillTrigger(player, '强运', `手牌为空-摸${drawn.length}张`)
  }

  /** 包装 Player.removeCard: 移除手牌后立即检查强运 */
  private removeHandCard(player: Player, cardId: string): Card | undefined {
    const card = player.removeCard(cardId)
    if (card) this.triggerQiangYun(player)
    return card
  }

  private canUseAsKill(card: Card, player: Player): boolean {
    if (card.name === '杀') return true
    // 傲剑 (主动模式): 红色牌当杀, 包括手牌和装备
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

  /** 杀造成伤害后：攻击类辅印触发（强化/吸血/杀之贪/杀之卸） */
  private async onKillDamageDealt(attacker: Player, defender: Player): Promise<void> {
    // 强化: 30%几率伤害+1
    if (this.rollSubTreasure(attacker, 'treasure-qiang-hua')) {
      const extraDmg = defender.takeDamage(1)
      this.emitSkillTrigger(attacker, '强化', '伤害+1')
      this.eventBus.emit({ type: 'damage:deal', sourceHeroId: attacker.getId(), targetHeroId: defender.getId(), data: { damage: 1 } })
      if (!defender.isAlive()) {
        this.eventBus.emit({ type: 'die', sourceHeroId: defender.getId(), data: { killedBy: attacker.getId(), extraDamage: true } })
      }
    }
    // 吸血: 30%几率回复1点体力
    if (this.rollSubTreasure(attacker, 'treasure-xi-xue')) {
      if (attacker.getCurrentHp() < attacker.getMaxHp()) {
        attacker.heal(1)
        this.emitSkillTrigger(attacker, '吸血', '回复1点体力')
      }
    }
    // 杀之贪: 30%几率摸1张牌
    if (this.rollSubTreasure(attacker, 'treasure-sha-zhi-tan')) {
      const drawn = this.cardDeck.draw(1)
      attacker.drawCards(drawn)
      this.emitSkillTrigger(attacker, '杀之贪', '摸1张牌')
    }
    // 杀之卸: 30%几率弃置目标1张装备牌
    if (this.rollSubTreasure(attacker, 'treasure-sha-zhi-xie')) {
      const equipSlots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      for (const slot of equipSlots) {
        const card = defender.getEquippedCard(slot)
        if (card) {
          defender.unequip(slot)
          this.cardDeck.discard([card])
          this.emitSkillTrigger(attacker, '杀之卸', `弃置【${(card as any).name}】`)
          break
        }
      }
    }
  }

  /** 受到杀的伤害后：防御类辅印触发（伤之仇/伤之贪/伤之卸/伤之削） */
  private async onKillDamageReceived(victim: Player, attacker: Player): Promise<void> {
    if (!attacker.isAlive()) return
    // 伤之仇: 30%几率让伤害来源受到1点伤害
    if (this.rollSubTreasure(victim, 'treasure-shang-zhi-chou')) {
      // 曼舞: 反弹的伤害，受击方(attacker)有曼舞则可转移
      if (await this.promptManWu(attacker, victim, 1)) {
        this.emitSkillTrigger(victim, '伤之仇', '反弹被转移')
      } else {
        const dmg = attacker.takeDamage(1)
        this.emitSkillTrigger(victim, '伤之仇', '反击1点伤害')
        this.eventBus.emit({ type: 'damage:deal', sourceHeroId: victim.getId(), targetHeroId: attacker.getId(), data: { damage: dmg } })
        if (!attacker.isAlive()) {
          this.eventBus.emit({ type: 'die', sourceHeroId: attacker.getId(), data: { killedBy: victim.getId() } })
        }
      }
    }
    // 伤之贪: 30%几率摸1张牌
    if (this.rollSubTreasure(victim, 'treasure-shang-zhi-tan')) {
      const drawn = this.cardDeck.draw(1)
      victim.drawCards(drawn)
      this.emitSkillTrigger(victim, '伤之贪', '摸1张牌')
    }
    // 伤之卸: 30%几率弃置伤害来源1张装备牌
    if (this.rollSubTreasure(victim, 'treasure-shang-zhi-xie')) {
      const equipSlots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      for (const slot of equipSlots) {
        const card = attacker.getEquippedCard(slot)
        if (card) {
          attacker.unequip(slot)
          this.cardDeck.discard([card])
          this.emitSkillTrigger(victim, '伤之卸', `弃置【${(card as any).name}】`)
          break
        }
      }
    }
    // 伤之削: 30%几率弃置伤害来源1张手牌
    if (this.rollSubTreasure(victim, 'treasure-shang-zhi-xue')) {
      if (attacker.getHandSize() > 0) {
        const hand = attacker.getHand()
        const card = hand[Math.floor(Math.random() * hand.length)]
        this.removeHandCard(attacker,card.id)
        this.cardDeck.discard([card])
        this.emitSkillTrigger(victim, '伤之削', `弃置【${(card as any).name}】`)
      }
    }
  }

  private isMale(player: Player): boolean {
    // 简单判断：虞姬、小乔、李师师、武则天、赵飞燕、吕雉、花木兰、褒姒 为女性
    const femaleIds = ['yu-ji', 'xiao-qiao', 'li-shi-shi', 'wu-ze-tian', 'zhao-fei-yan', 'lv-zhi', 'hua-mu-lan', 'bao-si']
    return !femaleIds.includes(player.getId())
  }

  /** 蝶魂: 群体锦囊(五谷丰登/万箭齐发/烽火狼烟/休养生息)目标时可发动, 跳过结算并摸1张
   *  - 休养生息仅血量不满时触发
   *  - 玩家: 询问发动(默认不发动, 以避免静默生效)
   *  - AI: 默认发动
   *  返回 true=发动, 跳过本次锦囊效果; false=不发动, 走正常逻辑
   */
  private async checkDieHun(target: Player, schemeName: string): Promise<boolean> {
    if (!target.hasSkillOrTreasure('die-hun')) return false
    const allowed = ['五谷丰登', '万箭齐发', '烽火狼烟', '休养生息']
    if (!allowed.includes(schemeName)) return false
    if (schemeName === '休养生息' && target.getCurrentHp() >= target.getMaxHp()) return false

    let trigger = true
    if (target.getRole() === 'player') {
      trigger = this.config.dieHunHandler ? await this.config.dieHunHandler(this, target, schemeName) : false
    }
    if (!trigger) return false
    const drawn = this.cardDeck.draw(1)
    target.drawCards(drawn)
    this.emitSkillTrigger(target, '蝶魂', `跳过${schemeName}并摸1张`)
    return true
  }

  /** 抽取一张手牌（用于法家、起义等） */
  private stealRandomCard(from: Player, to: Player): void {
    const hand = from.getHand()
    if (hand.length === 0) return
    const card = hand[Math.floor(Math.random() * hand.length)]
    this.removeHandCard(from,card.id)
    to.drawCards([card])
  }

  /** 判定：翻牌堆顶一张牌，链式变法替换，返回最终花色 */
  async judge(judgingPlayer?: Player, judgeCardName?: string): Promise<{ suit: Suit; card: Card }> {
    const cards = this.cardDeck.draw(1)
    let card = cards[0]
    const judgeHeroId = judgingPlayer?.getId()
    this.eventBus.emit({ type: 'judge', sourceHeroId: judgeHeroId, data: { suit: card.suit, number: card.number, cardName: card.name, judgeCardName, phase: 'reveal' } })

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
        const replacement = this.removeHandCard(player,replaceCardId)
        if (replacement) {
          this.cardDeck.discard([card])
          this.emitSkillTrigger(player, '变法', `用${replacement.name}替换${card.name}`)
          card = replacement
          this.eventBus.emit({ type: 'judge', sourceHeroId: judgeHeroId, data: { suit: card.suit, number: card.number, cardName: card.name, judgeCardName, phase: 'replace' } })
        }
      }
    }

    this.cardDeck.discard([card])
    this.eventBus.emit({ type: 'judge', sourceHeroId: judgeHeroId, data: { suit: card.suit, number: card.number, cardName: card.name, judgeCardName, phase: 'result' } })
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

  /**
   * 击杀奖励: 玩家/友军杀死敌人后摸3张牌
   * 若该敌人是最后一个敌人, 摸3张后直接判定闯关成功
   */
  private handleKillReward(event: GameEvent): void {
    const victimId = event.sourceHeroId
    const killerId = (event.data as any)?.killedBy
    if (!victimId || !killerId) return
    // 跳过辅印/技能造成的额外伤害击杀(已在主伤害处发放过奖励)
    if ((event.data as any)?.extraDamage) return
    const victim = this.getPlayerById(victimId)
    const killer = this.getPlayerById(killerId)
    if (!victim || !killer) return
    // 只对击杀敌人发放奖励
    if (victim.getRole() !== 'enemy') return
    if (killer.getRole() === 'enemy') return
    if (!killer.isAlive()) return

    // 任何击杀都先摸3张
    const drawn = this.cardDeck.draw(3)
    if (drawn.length > 0) {
      killer.drawCards(drawn)
      this.emitSkillTrigger(killer, '击杀', `击杀${victim.getName()}, 摸${drawn.length}张`)
      this.eventBus.emit({ type: 'card:draw', sourceHeroId: killer.getId(), data: { count: drawn.length, reason: 'kill' } })
    }

    // 击杀最后一个敌人 → 摸3张后再判定闯关成功
    const otherEnemiesAlive = this.players.some(p => p.getRole() === 'enemy' && p.isAlive() && p.getId() !== victimId)
    if (!otherEnemiesAlive) {
      this.emitSkillTrigger(killer, '击杀', `击杀${victim.getName()}, 闯关成功!`)
      this.checkGameEnd()
    }
  }

  private cleanupDeadPlayer(event: GameEvent): void {
    const victimId = event.sourceHeroId
    if (!victimId) return
    const victim = this.getPlayerById(victimId)
    if (!victim) return
    const allCards: Card[] = []
    // 手牌
    allCards.push(...victim.getHand())
    victim.getHand().forEach(c => this.removeHandCard(victim, c.id))
    // 装备区
    for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
      const eq = victim.getEquippedCard(slot)
      if (eq) {
        victim.unequip(slot)
        allCards.push(eq)
      }
    }
    // 判定区
    const judgeCards = victim.getJudgeCards()
    judgeCards.forEach(() => {
      const c = victim.consumeNextJudgeCard()
      if (c) allCards.push(c)
    })
    if (allCards.length > 0) {
      this.cardDeck.discard(allCards)
      this.eventBus.emit({ type: 'card:discard', sourceHeroId: victimId, data: { count: allCards.length, reason: 'death' } })
    }
  }

  private async executeTurn(): Promise<void> {
    this.turnNumber++
    const player = this.players[this.currentPlayerIndex]
    if (!player.isAlive()) {
      this.advanceToNextAlive()
      return
    }

    // 蓄谋：跳过回合
    if (this.skipNextTurnPlayerId === player.getId()) {
      this.skipNextTurnPlayerId = null
      this.emitSkillTrigger(player, '蓄谋', '跳过本回合')
      this.eventBus.emit({ type: 'turn:start', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })
      this.eventBus.emit({ type: 'turn:end', sourceHeroId: player.getId(), data: { turn: this.turnNumber } })
      this.advanceToNextAlive()
      return
    }

    player.resetSkillUses()
    this.killUsedThisTurn = false
    this.killsUsedThisTurn = 0
    this.killsMaxThisTurn = 1
    this.lastPlayedCardName = null
    this.zuijiuActive = false
    this.aoJianActive.clear()  // 傲剑主动模式: 每个玩家回合开始时清空
    // 侠胆: 每个玩家回合开始时重置
    this.xiaDanWinKillsLeft.delete(player.getId())
    this.xiaDanWinTargetsPerKill.delete(player.getId())
    this.xiaDanLossThisTurn.delete(player.getId())
    this.xiaDanUsedThisTurn.delete(player.getId())
    this.skipDrawThisTurn = false
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

    // 贪手: 回合开始时30%几率额外获取1张牌
    if (this.rollSubTreasure(player, 'treasure-tan-shou')) {
      const extra = this.cardDeck.draw(1)
      if (extra.length > 0) {
        player.drawCards(extra)
        this.emitSkillTrigger(player, '贪手', '额外获取1张')
      }
    }

    this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'draw' } })

    if (!player.isAlive()) { this.advanceToNextAlive(); return }

    // 画地为牢：跳过出牌阶段（摸牌正常，直接进弃牌）
    if (this.skipCurrentTurnPlayerId === player.getId()) {
      this.skipCurrentTurnPlayerId = null
    } else {
      // 出牌阶段
      this.eventBus.emit({ type: 'phase:start', sourceHeroId: player.getId(), data: { phase: 'play' } })
      if (player.getRole() === 'player' && this.config.playerActionHandler) {
        await this.config.playerActionHandler(this, player)
      } else {
        await this.autoPlayPhase(player)
      }
      this.eventBus.emit({ type: 'phase:end', sourceHeroId: player.getId(), data: { phase: 'play' } })

      // 五谷丰登玩家选完后的剩余玩家继续 (playerActionHandler 等待玩家结束回合)
      if (player.getRole() === 'player' && this.pendingWuguContinuation) {
        await this.pendingWuguContinuation()
      }
    }

    // 击杀最后一个敌人 → 立即结束游戏 (跳过弃牌阶段)
    if (this.isOver) return

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
    // 蓄谋: 回合结束摸三张，跳过自己的下回合
    if (player.hasSkillOrTreasure('xu-mou') && player.useSkill('xu-mou')) {
      const cards = this.cardDeck.draw(3)
      player.drawCards(cards)
      this.skipNextTurnPlayerId = player.getId()
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
        this.removeHandCard(player,card.id)
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
          const c = this.removeHandCard(player,uselessCards[i].id)
          if (c) this.cardDeck.discard([c])
        }
        const newCards = this.cardDeck.draw(discardCount)
        player.drawCards(newCards)
        this.emitSkillTrigger(player, '驭人', `弃${discardCount}摸${discardCount}`)
      }
    }

    // 出杀
    const canKill = this.hasUnlimitedKill(player) || this.killsUsedThisTurn < this.killsMaxThisTurn
    if (canKill) {
      const killCard = this.findKillCard(player)
      if (killCard) {
        const targets = this.getEnemies(player)
        if (targets.length > 0) {
          await this.executeKill(player, targets[0], killCard)
          if (!this.hasUnlimitedKill(player)) {
            this.killsUsedThisTurn++
            this.killUsedThisTurn = true
            player.setUsedKillThisTurn(true)
          }
        }
      }
    }

    // 装备
    for (const card of player.getCardsByType('equipment')) {
      if (card.type === 'equipment') {
        this.removeHandCard(player,card.id)
        const slot = (card as any).slot
        if (slot) {
          player.equip(card, slot)
          this.cardDeck.discard([card])
        }
      }
    }

    // 绝击: 询问发动 + (弃武器/null=受1血) + 选目标
    if (player.hasSkillOrTreasure('jue-ji')) {
      const inRangeEnemies = this.getEnemies(player).filter(e => e.isAlive() && this.isInAttackRange(player, e))
      if (inRangeEnemies.length > 0 && player.getCurrentHp() > 1 && player.getSkillUseCount('jue-ji') === 0) {
        let choice: { weaponCardId: string | null; targetId: string } | null = null
        if (this.config.jueJiHandler) {
          choice = await this.config.jueJiHandler(this, player, inRangeEnemies)
        } else {
          // AI 默认: 优先弃武器 (装备区或手牌, 无损失), 无武器才掉血
          const equipped = player.getEquippedCard('weapon')
          const handWeapon = player.getHand().find(c => c.type === 'equipment' && (c as any).slot === 'weapon')
          const weapon = equipped ?? handWeapon
          if (weapon) {
            choice = { weaponCardId: weapon.id, targetId: inRangeEnemies[0].getId() }
          } else {
            choice = { weaponCardId: null, targetId: inRangeEnemies[0].getId() }
          }
        }
        if (choice) {
          await this.playerJueJi(player, choice.weaponCardId, choice.targetId)
          if (!player.isAlive() || this.isOver) return
        }
      }
    }

    // 锦囊: AI主动使用
    const enemies = this.getEnemies(player).filter(e => e.isAlive())
    const hand2 = player.getHand()

    // 1) 自身锦囊: 手牌少时用无中生有/休养生息
    const selfCard = hand2.find((c: Card) => c.name === '无中生有' || c.name === '休养生息')
    if (selfCard && hand2.length <= 3) {
      await this.playerPlayScheme(player, selfCard.id)
      if (!player.isAlive() || this.isOver) return
    }

    if (enemies.length > 0) {
      // 计算每个敌方角色的"总牌数" (手牌+装备+判定), 用于排序
      const enemyCardTotal = (e: Player) =>
        e.getHandSize() + this.collectEquipmentCards(e).length + e.getJudgeCards().length

      // 2) 探囊取物: 选距离内总牌数最多的目标
      const tn = player.getHand().find((c: Card) => c.name === '探囊取物')
      if (tn) {
        const target = [...enemies]
          .filter(e => this.canTanNang(player, e) && !this.isKongJuImmuneTo(e, '探囊取物'))
          .sort((a, b) => enemyCardTotal(b) - enemyCardTotal(a))[0]
        if (target) {
          await this.playerPlayScheme(player, tn.id, target.getId())
          if (!player.isAlive() || this.isOver) return
        }
      }

      // 3) 釜底抽薪: 选手牌数最多的目标 (无距离限制, 任意敌方)
      const fudi = player.getHand().find((c: Card) => c.name === '釜底抽薪')
      if (fudi) {
        const target = [...enemies]
          .filter(e => e.isAlive() && !this.isKongJuImmuneTo(e, '釜底抽薪') && (
            e.getHandSize() > 0 || this.collectEquipmentCards(e).length > 0 || e.getJudgeCards().length > 0
          ))
          .sort((a, b) => b.getHandSize() - a.getHandSize())[0]
        if (target) {
          await this.playerPlayScheme(player, fudi.id, target.getId())
          if (!player.isAlive() || this.isOver) return
        }
      }

      // 4) 决斗: 选手牌少且没杀的目标 (低威胁优先)
      const duel = player.getHand().find((c: Card) => c.name === '决斗')
      if (duel) {
        const target = [...enemies]
          .filter(e => e.isAlive() && this.canBeSchemeTarget(e, duel))
          .sort((a, b) => {
            // 优先: 无杀 / 手牌≤1
            const aScore = (this.findKillCard(a) ? 100 : 0) + a.getHandSize()
            const bScore = (this.findKillCard(b) ? 100 : 0) + b.getHandSize()
            return aScore - bScore
          })[0]
        if (target) {
          await this.playerPlayScheme(player, duel.id, target.getId())
          if (!player.isAlive() || this.isOver) return
        }
      }

      // 4.5) 借刀杀人: 找有武器的敌方 + 有杀的我方
      const jieDao = player.getHand().find((c: Card) => c.name === '借刀杀人')
      if (jieDao) {
        const holder = [...enemies].find(e => e.isAlive() && e.getEquippedCard('weapon'))
        if (holder) {
          await this.playerPlayScheme(player, jieDao.id, holder.getId())
          if (!player.isAlive() || this.isOver) return
        }
      }
    }

    // 5) AOE锦囊: 多敌人才用
    if (enemies.length >= 2) {
      const aoeOrder = ['万箭齐发', '南蛮入侵', '烽火狼烟', '五谷丰登']
      for (const name of aoeOrder) {
        const aoe = player.getHand().find((c: Card) => c.name === name)
        if (!aoe) continue
        await this.playerPlayScheme(player, aoe.id)
        if (!player.isAlive() || this.isOver) return
        break
      }
    }
  }

  // --- Kill execution ---

  async executeKill(attacker: Player, defender: Player, killCard: Card, opts?: { forceNoDodge?: boolean }): Promise<void> {
    this.removeCardFromPlayer(attacker, killCard)
    // killsUsedThisTurn 由 caller 累加 (playerPlayKill / playerPlayKillMulti / AI 流程)

    const usedAsSkill = killCard.name !== '杀'
    let skillName = ''
    let usedAoJian = false
    if (usedAsSkill) {
      if (killCard.name === '闪' && attacker.hasSkillOrTreasure('wu-mu')) skillName = '武穆'
      else if (attacker.hasSkillOrTreasure('ao-jian')) skillName = '傲剑'
    }
    // 傲剑: 即使出的是普通【杀】, 只要激活了就触发
    if (!skillName && attacker.hasSkillOrTreasure('ao-jian') && this.aoJianActive.has(attacker.getId()) && this.isEffectivelyRed(killCard, attacker)) {
      skillName = '傲剑'
      usedAoJian = true
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

    // 黑杀盾/红杀盾: 30%几率免疫对方黑色/红色杀（判定前生效）
    const isBlackKill = isBlackSuit(killCard.suit)
    const isRedKill = isRedSuit(killCard.suit)
    if ((isBlackKill && this.rollSubTreasure(defender, 'treasure-hei-sha-dun')) ||
        (isRedKill && this.rollSubTreasure(defender, 'treasure-hong-sha-dun'))) {
      const shieldName = isBlackKill ? '黑杀盾' : '红杀盾'
      this.emitSkillTrigger(defender, shieldName, '免疫杀')
      this.eventBus.emit({ type: 'damage:prevent', sourceHeroId: defender.getId(), data: { reason: shieldName } })
      return
    }

    // 刺客: 询问发动 → 判定, 红色不可被闪, 黑色造成伤害后弃对方一张牌
    let assassinNoDodge = opts?.forceNoDodge ?? false
    let assassinDiscard = false
    if (attacker.hasSkillOrTreasure('ci-ke')) {
      let trigger = false
      if (attacker.getRole() === 'player' && this.config.ciKeHandler) {
        trigger = await this.config.ciKeHandler(this, attacker, defender)
      } else if (attacker.getRole() !== 'player') {
        // AI: 总是发动刺客 (判定期望收益最高)
        trigger = true
      }
      if (trigger) {
        const result = await this.judgeWithSkills(attacker, '刺客')
        if (!result.skipped) {
          const isRed = this.isEffectivelyHeart(result.suit, attacker)
          if (isRed) {
            assassinNoDodge = true
            this.emitSkillTrigger(attacker, '刺客', `红色不可被闪`)
          } else {
            assassinDiscard = true
          }
        }
      }
    }

    // 精准: 30%几率令此杀不可被闪响应
    if (!assassinNoDodge && this.rollSubTreasure(attacker, 'treasure-jing-zhun')) {
      assassinNoDodge = true
      this.emitSkillTrigger(attacker, '精准', '杀不可闪响应')
    }

    // 豹头: 目标手牌数≥攻击者体力 → 此杀不可被闪
    if (!assassinNoDodge && attacker.hasSkillOrTreasure('bao-tou') &&
        defender.getHandSize() >= attacker.getCurrentHp()) {
      assassinNoDodge = true
      this.emitSkillTrigger(attacker, '豹头', `目标手牌${defender.getHandSize()}≥体力${attacker.getCurrentHp()}-不可闪`)
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
      // 玉如意/国色: 判定, 红色视为闪 — 每次杀只判定一次
      if (dodgeCount < dodgeNeeded && await this.tryYuRuYiDodge(defender, '杀', attacker.getWeaponName())) {
        dodgeCount++
      }
      for (let i = 0; i < dodgeNeeded; i++) {
        if (dodgeCount >= dodgeNeeded) break
        const dodgeCard = await this.promptResponseDodge(defender, attacker.getId(), '杀')
        if (dodgeCard) {
          this.removeHandCard(defender,dodgeCard.id)
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
          // 轻灵: 打出闪后30%几率摸一张
          if (this.rollSubTreasure(defender, 'treasure-qing-ling')) {
            const drawn = this.cardDeck.draw(1)
            defender.drawCards(drawn)
            this.emitSkillTrigger(defender, '轻灵', '出闪后摸1张')
          }
        } else {
          // 玩家主动选择掉血 / AI 无闪
          break
        }
      }
      dodged = dodgeCount >= dodgeNeeded
    }

    if (!dodged) {
      // 龙鳞刀: 命中后可选弃对方最多2张牌代替掉血
      const isLongLin = attacker.getWeaponName() === '龙鳞刀'
      let longLinPickedIds: string[] | null = null
      if (isLongLin) {
        const totalCards = defender.getHandSize() + this.collectEquipmentCards(defender).length + defender.getJudgeCards().length
        if (totalCards > 0) {
          if (attacker.getRole() === 'player' && this.config.longLinPickHandler) {
            longLinPickedIds = await this.config.longLinPickHandler(
              this, attacker, defender,
              { hand: defender.getHand(), judge: defender.getJudgeCards(), equipment: this.collectEquipmentCards(defender) },
            )
          } else if (attacker.getRole() !== 'player') {
            // AI: 默认选择弃牌，随机选最多2张
            const allIds: string[] = [
              ...defender.getHand().map(c => c.id),
              ...this.collectEquipmentCards(defender).map(c => c.id),
              ...defender.getJudgeCards().map(c => c.id),
            ]
            const shuffled = allIds.sort(() => Math.random() - 0.5)
            longLinPickedIds = shuffled.slice(0, Math.min(2, shuffled.length))
          }
        }
      }

      if (longLinPickedIds && longLinPickedIds.length > 0) {
        for (const cid of longLinPickedIds) {
          this.discardCardFromTarget(defender, cid, '龙鳞刀')
        }
        this.emitSkillTrigger(attacker, '龙鳞刀', `弃${defender.getName()}${longLinPickedIds.length}张牌`)
        // 龙鳞刀: 弃牌代替掉血, 不算造成伤害 → 不触发强化等攻击后辅印
      } else {
        let damage = 1
        // 醉酒伤害+1
        if (this.zuijiuActive) {
          damage += 1
          this.zuijiuActive = false
        }
        // 曼舞: 受伤前检查, 可转移伤害
        if (await this.promptManWu(defender, attacker, damage)) {
          // 伤害已转移, 不触发受伤害后效果
        } else {
          const actualDamage = defender.takeDamage(damage)
          this.eventBus.emit({ type: 'damage:deal', sourceHeroId: attacker.getId(), targetHeroId: defender.getId(), data: { damage } })
          this.eventBus.emit({ type: 'damage:receive', sourceHeroId: defender.getId(), data: { damage, from: attacker.getId() } })

          // 受伤触发
          await this.onDamageReceived(defender, attacker, killCard)

          // 杀造成伤害后: 攻击类辅印触发
          await this.onKillDamageDealt(attacker, defender)

          // 受到杀的伤害后: 防御类辅印触发
          await this.onKillDamageReceived(defender, attacker)
        }

        // 霸王弓: 杀命中后拆对方一匹马
        if (attacker.getWeaponName() === '霸王弓' && defender.isAlive()) {
          const attackMount = defender.getEquippedCard('attackMount')
          const defenseMount = defender.getEquippedCard('defenseMount')
          const hasBoth = attackMount && defenseMount
          let mountSlot: EquipmentSlot | null = null

          if (hasBoth && attacker.getRole() === 'player' && (this as any).config.baWangMountHandler) {
            // 两匹马都有且是玩家: 让玩家选择
            mountSlot = await (this as any).config.baWangMountHandler(this, attacker, defender, { attackMount, defenseMount })
          } else if (attackMount) {
            mountSlot = 'attackMount'
          } else if (defenseMount) {
            mountSlot = 'defenseMount'
          }

          if (mountSlot) {
            const mount = defender.unequip(mountSlot)
            if (mount) {
              this.cardDeck.discard([mount])
              this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: defender.getId(), data: { cardId: mount.id, slot: mountSlot } })
              this.emitSkillTrigger(attacker, '霸王弓', `拆${defender.getName()}${mount.name}`)
            }
          }
        }

        // 刺客黑色: 弃对方一张牌
        if (assassinDiscard) {
          const dHand = defender.getHand()
          if (dHand.length > 0) {
            const target = dHand[Math.floor(Math.random() * dHand.length)]
            this.removeHandCard(defender,target.id)
            this.cardDeck.discard([target])
            this.emitSkillTrigger(attacker, '刺客', '黑色-弃对方一张牌')
          }
        }

        if (!defender.isAlive()) {
          this.eventBus.emit({ type: 'die', sourceHeroId: defender.getId(), data: { killedBy: attacker.getId() } })
        }
      }
    } else {
      // 强掠: 杀被闪后询问是否发动 → 判定，黑色抽对方一张
      if (attacker.hasSkillOrTreasure('qiang-lue') && attacker.isAlive() && defender.isAlive()) {
        let trigger = false
        if (attacker.getRole() === 'player' && this.config.qiangLueHandler) {
          trigger = await this.config.qiangLueHandler(this, attacker, defender)
        } else if (attacker.getRole() !== 'player') {
          // AI: 有手牌可抽才发动
          trigger = defender.getHandSize() + this.collectEquipmentCards(defender).length + defender.getJudgeCards().length > 0
        }
        if (trigger) {
          const result = await this.judgeWithSkills(attacker, '强掠')
          if (!result.skipped) {
            const isBlack = isBlackSuit(result.suit)
            if (isBlack) {
              this.stealRandomCard(defender, attacker)
              this.emitSkillTrigger(attacker, '强掠', '抽对方一张牌')
            } else {
              this.emitSkillTrigger(attacker, '强掠', '判定非黑-失效')
            }
          }
        }
      }
      // 博浪锤: 杀被闪避后, 攻击方可弃2张手牌强制命中 (掉1血)
      if (attacker.getWeaponName() === '博浪锤' && defender.isAlive()) {
        const attackerHand = attacker.getHand()
        if (attackerHand.length >= 2) {
          let toDiscard: string[] | null = null
          if (attacker.getRole() === 'player' && this.config.boLangChuiHandler) {
            toDiscard = await this.config.boLangChuiHandler(this, attacker, attackerHand)
          } else if (attacker.getRole() !== 'player') {
            // AI: 弃最没用的2张 (非杀非闪优先, 简化取前2张)
            toDiscard = attackerHand.slice(0, 2).map(c => c.id)
          }
          if (toDiscard && toDiscard.length >= 2) {
            for (const cid of toDiscard.slice(0, 2)) {
              const card = this.removeHandCard(attacker, cid)
              if (card) this.cardDeck.discard([card])
            }
            this.emitSkillTrigger(attacker, '博浪锤', `弃2牌强制命中${defender.getName()}`)
            // 曼舞: 受伤前检查, 可转移伤害
            if (await this.promptManWu(defender, attacker, 1)) {
              // 伤害已转移
            } else {
              const dmg = defender.takeDamage(1)
              this.eventBus.emit({ type: 'damage:deal', sourceHeroId: attacker.getId(), targetHeroId: defender.getId(), data: { damage: 1 } })
              this.eventBus.emit({ type: 'damage:receive', sourceHeroId: defender.getId(), data: { damage: 1, from: attacker.getId() } })
              await this.onDamageReceived(defender, attacker, killCard)
              await this.onKillDamageDealt(attacker, defender)
              await this.onKillDamageReceived(defender, attacker)
              if (!defender.isAlive()) {
                this.eventBus.emit({ type: 'die', sourceHeroId: defender.getId(), data: { killedBy: attacker.getId() } })
              }
            }
          }
        }
      }
      // 盘龙棍: 杀被闪避后自动继续出杀 (手牌里找下一张杀, 对同一目标)
      if (attacker.getWeaponName() === '盘龙棍' && defender.isAlive()) {
        const nextKill = attacker.getHand().find(c => c.name === '杀')
        if (nextKill) {
          this.emitSkillTrigger(attacker, '盘龙棍', `对${defender.getName()}继续出杀`)
          await this.executeKill(attacker, defender, nextKill)
        }
      }
    }

    // 傲剑: 出杀后自动关闭激活状态 (激活一次使用一次)
    if (skillName === '傲剑' || usedAoJian) {
      this.aoJianActive.delete(attacker.getId())
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

    // 法家: 从伤害来源获得一张牌(手牌/装备/判定)
    if (victim.hasSkillOrTreasure('fa-jia')) {
      const attackerCards = attacker.getHandSize() + this.collectEquipmentCards(attacker).length + attacker.getJudgeCards().length
      if (attackerCards > 0) {
        let pickedId: string | null = null
        if (victim.getRole() === 'player' && this.config.faJiaPickHandler) {
          pickedId = await this.config.faJiaPickHandler(
            this, victim, attacker,
            { hand: attacker.getHand(), judge: attacker.getJudgeCards(), equipment: this.collectEquipmentCards(attacker) },
          )
        }
        if (pickedId) {
          this.takeCardFromTarget(victim, attacker, pickedId, '法家')
        } else {
          // AI或放弃时随机拿一张
          this.stealRandomCard(attacker, victim)
          this.emitSkillTrigger(victim, '法家', '获得伤害来源一张牌')
        }
      }
    }

    // 反击: 对来源出杀(红色不可被闪, 黑色正常可闪)
    if (victim.hasSkillOrTreasure('fan-ji') && attacker.isAlive()) {
      const hasKillable = victim.getHand().some(c => this.canUseAsKill(c, victim))
      if (hasKillable) {
        // 复用 promptResponseKill: AI自动选, 玩家走响应UI (支持傲剑/武穆等)
        const killCard = await this.promptResponseKill(victim, attacker.getId(), '反击', 1)
        if (killCard) {
          const isRed = isRedSuit(killCard.suit)
          this.emitSkillTrigger(victim, '反击', isRed ? '红色杀-不可闪' : '对来源出杀')
          await this.executeKill(victim, attacker, killCard, { forceNoDodge: isRed })
        }
      }
    }

    // 复仇: 判定，非红桃则来源受1伤或弃2牌
    if (victim.hasSkillOrTreasure('fu-chou') && attacker.isAlive()) {
      const result = await this.judgeWithSkills(victim, '复仇')
      if (!result.skipped) {
        const isHeart = this.isEffectivelyHeart(result.suit, victim)
        if (!isHeart) {
          // 曼舞: 反弹的伤害, 受击方(attacker)有曼舞则可转移
          if (await this.promptManWu(attacker, victim, 1)) {
            this.emitSkillTrigger(victim, '复仇', '反弹被转移')
          } else {
            const dmg = attacker.takeDamage(1)
            this.emitSkillTrigger(victim, '复仇', `判定非红桃-来源受到1点伤害`)
            this.eventBus.emit({ type: 'damage:deal', sourceHeroId: victim.getId(), targetHeroId: attacker.getId(), data: { damage: dmg } })
            if (!attacker.isAlive()) {
              this.eventBus.emit({ type: 'die', sourceHeroId: attacker.getId(), data: { killedBy: victim.getId() } })
            }
          }
        } else {
          this.emitSkillTrigger(victim, '复仇', '判定红桃-失效')
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
        await this.dealDuelDamage(current, lastKiller ?? other)
        return
      }
      // 出杀
      this.removeCardFromPlayer(current, killCard)

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
    // 先查手牌, 再查装备区 (傲剑可用红色装备当杀)
    let card = player.getHand().find(c => c.id === cardId)
    if (!card) {
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = player.getEquippedCard(slot)
        if (eq && eq.id === cardId) { card = eq; break }
      }
    }
    if (!card || !this.canUseAsKill(card, player)) return null
    return card
  }

  /**
   * 询问杀响应: 让玩家选择是否用闪
   * - 玩家: 调responseActionHandler(type='dodge'), 选卡则闪避, 选空则主动掉血
   * - AI: 有闪则自动用, 无闪则掉血
   */
  private async promptResponseDodge(player: Player, attackerId: string, schemeName: string): Promise<Card | null> {
    if (player.getRole() === 'player') {
      if (!this.config.responseActionHandler) return null
      const cardId = await this.config.responseActionHandler(this, player, 'dodge', { sourceHeroId: attackerId, schemeName, targetHeroId: player.getId() })
      if (!cardId) return null  // 玩家主动选择掉血
      const card = player.getHand().find(c => c.id === cardId)
      if (!card || !this.canUseAsDodge(card, player)) return null
      return card
    }
    // AI: 有闪则自动用
    return this.findDodgeCard(player) ?? null
  }

  /**
   * 玉如意/国色: 受到闪响应请求时(杀/万箭齐发), 可判定一次, 红色视为闪
   * 返回 true=已发动且红色, 视作闪响应成功
   * attackName: 用于UI显示(如"杀"/"万箭齐发")
   * attackerWeapon: 攻击方的武器名(鱼肠剑无视防具)
   */
  async tryYuRuYiDodge(defender: Player, attackName: string, attackerWeapon?: string): Promise<boolean> {
    if (attackerWeapon === '鱼肠剑') return false  // 鱼肠剑无视防具
    const hasYuRuYiArmor = defender.getArmorName() === '玉如意'
    const hasGuoSe = defender.hasSkillOrTreasure('guo-se')
    if (!hasYuRuYiArmor && !hasGuoSe) return false

    // 询问是否使用玉如意 (玩家可选, AI 默认使用)
    let useYuRuYi = true
    if (defender.getRole() === 'player') {
      useYuRuYi = this.config.yuRuYiHandler ? await this.config.yuRuYiHandler(this, defender, attackName) : false
    }
    // AI: 默认使用
    const srcName = hasYuRuYiArmor && !hasGuoSe ? '玉如意' : '国色'
    if (!useYuRuYi) {
      this.emitSkillTrigger(defender, srcName, '选择不使用')
      return false
    }
    const result = await this.judgeWithSkills(defender, '玉如意')
    if (result.skipped) return false
    // 玉如意: 红色(红桃/方块/黑桃+红妆)视为闪
    const isRed = this.isEffectivelyRedForJudge(result.suit, defender)
    if (isRed) {
      this.emitSkillTrigger(defender, srcName, '玉如意判定-视为闪')
      return true
    }
    this.emitSkillTrigger(defender, srcName, '玉如意判定-失效')
    return false
  }

  /**
   * 天香: 判定开始前, 询问是否弃1张牌免判
   * 返回 true=已发动 (已弃1张牌, 跳过本次判定), false=不发动
   * 延时锦囊(画地为牢/手捧雷等): 判定牌不消失也不顺延, 同一回合仍会再次判定
   * 技能判定(刺客/玉如意/强掠等): 同样可以天香取消, 正常跳过该技能效果
   */
  async promptTianXiang(player: Player, judgeCard: Card): Promise<boolean> {
    if (!player.hasSkillOrTreasure('tian-xiang')) return false
    const hand = player.getHand()
    const equipment = this.collectEquipmentCards(player)
    if (hand.length === 0 && equipment.length === 0) return false  // 无牌可弃
    if (!player.useSkill('tian-xiang')) return false  // 已用本回合
    let cardId: string | null = null
    if (player.getRole() === 'player' && this.config.tianXiangHandler) {
      cardId = await this.config.tianXiangHandler(this, player, judgeCard)
    } else if (player.getRole() !== 'player') {
      // AI: 有手牌就发动 (优先弃基本牌, 避免损失有价值的装备/锦囊)
      cardId = hand.find(c => c.type === 'basic')?.id ?? hand[0]?.id ?? null
    }
    if (!cardId) return false
    // 优先从手牌中移除
    const handCard = hand.find(c => c.id === cardId)
    if (handCard) {
      this.removeHandCard(player, handCard.id)
      this.cardDeck.discard([handCard])
      this.emitSkillTrigger(player, '天香', `弃${handCard.name}免判${judgeCard.name}`)
    } else {
      // 从装备区移除
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      let discarded: Card | null = null
      for (const s of slots) {
        const eq = player.getEquippedCard(s)
        if (eq && eq.id === cardId) {
          discarded = player.unequip(s)
          if (discarded) this.cardDeck.discard([discarded])
          break
        }
      }
      if (!discarded) return false
      this.emitSkillTrigger(player, '天香', `弃${discarded.name}免判${judgeCard.name}`)
    }
    return true
  }

  /**
   * 曼舞: 受到伤害时，可弃1张红桃手牌将伤害转移给另一名角色
   * 返回 true=已发动 (已弃牌、转移伤害); false=不发动
   */
  async promptManWu(victim: Player, attacker: Player, damage: number): Promise<boolean> {
    if (!victim.hasSkillOrTreasure('man-wu')) return false
    if (!victim.useSkill('man-wu')) return false  // 已用本回合
    const hand = victim.getHand()
    // 找可弃的手牌: 红桃始终可用; 黑桃在红妆时也可当红桃用
    const selectableCards = hand.filter(c => c.suit === 'heart' || (victim.hasSkillOrTreasure('hong-zhuang') && c.suit === 'spade'))
    if (selectableCards.length === 0) return false  // 无可弃的牌
    let cardId: string | null = null
    let targetId: string | null = null
    if (victim.getRole() === 'player') {
      // 玩家: 先选转移目标
      if (this.config.manWuHandler) {
        const candidates = this.getAlivePlayers().filter(p => p.getId() !== victim.getId())
        targetId = await this.config.manWuHandler(this, victim, attacker, damage, candidates)
      }
      if (!targetId) return false
      // 再选红桃手牌弃掉
      if (this.config.manWuPickCardHandler) {
        cardId = await this.config.manWuPickCardHandler(this, victim)
      }
      if (!cardId) return false
    } else {
      // AI: 随机选一张可用牌, 随机选一个目标
      cardId = selectableCards[Math.floor(Math.random() * selectableCards.length)].id
      const candidates = this.getAlivePlayers().filter(p => p.getId() !== victim.getId())
      targetId = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)].getId() : null
    }
    if (!cardId || !targetId) return false
    // 弃红桃牌
    const card = this.removeHandCard(victim, cardId)
    if (card) this.cardDeck.discard([card])
    // 找目标
    const target = this.players.find(p => p.getId() === targetId)
    if (!target || !target.isAlive() || target.getId() === victim.getId()) return false
    // 目标承受伤害
    const actualDamage = target.takeDamage(damage)
    this.eventBus.emit({ type: 'damage:deal', sourceHeroId: attacker.getId(), targetHeroId: target.getId(), data: { damage } })
    this.eventBus.emit({ type: 'damage:receive', sourceHeroId: target.getId(), data: { damage, from: attacker.getId() } })
    // 目标摸X张牌, X=目标(被转移者)损失的血量 (target alive 时自然 ≤ maxHp-1)
    const hpLoss = target.getMaxHp() - target.getCurrentHp()
    if (hpLoss > 0) {
      const drawn = this.cardDeck.draw(hpLoss)
      target.drawCards(drawn)
    }
    this.emitSkillTrigger(victim, '曼舞', `转移${damage}点伤害给${target.getName()},摸${hpLoss}张牌`)
    return true
  }

  private async dealDuelDamage(loser: Player, source: Player): Promise<void> {
    let damage = 1
    if (this.zuijiuActive) {
      damage += 1
      this.zuijiuActive = false
    }
    // 曼舞: 转移伤害
    if (await this.promptManWu(loser, source, damage)) {
      // 伤害已转移
      return
    }
    const actual = loser.takeDamage(damage)
    this.eventBus.emit({ type: 'damage:deal', sourceHeroId: source.getId(), targetHeroId: loser.getId(), data: { damage } })
    this.eventBus.emit({ type: 'damage:receive', sourceHeroId: loser.getId(), data: { damage, from: source.getId() } })

    // 受伤触发 (法家、还击/反击、复仇等)
    await this.onDamageReceived(loser, source)

    if (!loser.isAlive()) {
      this.eventBus.emit({ type: 'die', sourceHeroId: loser.getId(), data: { killedBy: source.getId() } })
    }
  }

  // --- 无懈可击 (锦囊抵消) ---

  /** 判定阶段的无懈可击响应：从判定玩家开始顺时针询问是否抵消 */
  async checkJudgeNullify(judgingPlayer: Player, schemeName: string, fromPlayer: Player | undefined): Promise<boolean> {
    // 构造虚拟锦囊牌用于无懈可击链
    const virtualCard = { name: schemeName, type: 'scheme' as const } as Card
    return this.checkNullification(fromPlayer ?? judgingPlayer, judgingPlayer, virtualCard)
  }

  async checkNullification(schemePlayer: Player, targetPlayer: Player | undefined, schemeCard: Card): Promise<boolean> {
    const alivePlayers = this.getAlivePlayers()
    const startIdx = targetPlayer
      ? alivePlayers.indexOf(targetPlayer)
      : (alivePlayers.indexOf(schemePlayer) + 1) % alivePlayers.length
    if (startIdx < 0) return false

    // 链式响应: 轮询从目标开始, 每个存活玩家可选择抵消当前 active 卡
    // - 第一轮 active = 原锦囊, 上一个施法者 = schemePlayer (使用者不能抵消自己的原锦囊)
    // - 任何玩家出无懈可击后, active 变成那张无懈可击, 上一个施法者变成该玩家
    // - 跳过上一个施法者 (不能抵消自己的无懈可击)
    // - 一轮轮询 (所有存活非施法者都放弃) 结束
    let nullified = false
    let lastActor: Player = schemePlayer
    let position = startIdx
    let idleCount = 0  // 连续无反应的玩家数, 达到存活数 - 1 则结束 (因为跳过 lastActor)

    while (idleCount < Math.max(1, alivePlayers.length - 1)) {
      const candidate = alivePlayers[position]
      // 跳过死亡玩家与上一个施法者 (含初始 schemePlayer)
      if (!candidate.isAlive() || candidate === lastActor) {
        position = (position + 1) % alivePlayers.length
        idleCount++
        continue
      }

      const wxCard = await this.promptNullifyResponse(candidate, schemePlayer, schemeCard)
      if (!wxCard) {
        position = (position + 1) % alivePlayers.length
        idleCount++
        continue
      }

      this.removeHandCard(candidate, wxCard.id)
      this.cardDeck.discard([wxCard])
      this.eventBus.emit({
        type: 'card:play', sourceHeroId: candidate.getId(),
        data: { cardId: wxCard.id, cardName: '无懈可击' },
      })
      // 无懈: 30%几率摸一张
      if (this.rollSubTreasure(candidate, 'treasure-wu-xie')) {
        const drawn = this.cardDeck.draw(1)
        candidate.drawCards(drawn)
        this.emitSkillTrigger(candidate, '无懈', '摸1张')
      }
      nullified = !nullified
      lastActor = candidate
      position = (position + 1) % alivePlayers.length
      idleCount = 0  // 有人响应, 重置
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
    // 先查手牌, 再查装备区 (傲剑可用红色装备当杀)
    let killCard = player.getHand().find(c => c.id === cardId)
    if (!killCard) {
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = player.getEquippedCard(slot)
        if (eq && eq.id === cardId) { killCard = eq; break }
      }
    }
    if (!killCard || !this.canUseAsKill(killCard, player)) return
    // 侠胆: 输了拼点不能出杀
    if (this.xiaDanLossThisTurn.has(player.getId())) return
    // 杀次数已用尽
    if (!this.hasUnlimitedKill(player) && this.killsUsedThisTurn >= this.killsMaxThisTurn) return
    const target = this.players.find(p => p.getId() === targetId)
    if (!target || !target.isAlive()) return
    if (!this.isInAttackRange(player, target)) return
    await this.executeKill(player, target, killCard)
    if (!this.hasUnlimitedKill(player)) {
      this.killsUsedThisTurn++
      this.killUsedThisTurn = true
      player.setUsedKillThisTurn(true)
    }
  }

  /**
   * 侠胆: 一张杀指定多个目标(每张最多xiaDanWinTargetsPerKill个)
   * 侠胆胜出期间无视距离限制, 一次多杀只消耗一次 win-kill(无论命中几个目标)
   * 注: 复用狼牙棒的多目标模式 — 首次真实从手牌移除, 后续以同一 cardId 引用作用于其他目标
   */
  async playerPlayKillMulti(player: Player, cardId: string, targetIds: string[]): Promise<void> {
    if (this.xiaDanLossThisTurn.has(player.getId())) return
    const winKills = this.xiaDanWinKillsLeft.get(player.getId()) ?? 0
    const maxTargets = this.xiaDanWinTargetsPerKill.get(player.getId()) ?? 0
    if (winKills <= 0 || maxTargets <= 0) return
    let killCard = player.getHand().find(c => c.id === cardId)
    if (!killCard) {
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = player.getEquippedCard(slot)
        if (eq && eq.id === cardId) { killCard = eq; break }
      }
    }
    if (!killCard || !this.canUseAsKill(killCard, player)) return
    // 限定: 目标数 ≤ maxTargets
    const limited = targetIds.slice(0, maxTargets)
    for (const tid of limited) {
      const target = this.players.find(p => p.getId() === tid)
      if (!target || !target.isAlive()) continue
      if (!this.isInAttackRange(player, target)) continue
      // 后续迭代时牌已不在手牌/装备区, 复用初始引用
      await this.executeKill(player, target, killCard)
    }
    // 一次多杀只消耗 1 次杀次数
    if (!this.hasUnlimitedKill(player)) {
      this.killsUsedThisTurn++
      this.killUsedThisTurn = true
      player.setUsedKillThisTurn(true)
    }
  }

  async playerPlayScheme(player: Player, cardId: string, targetId?: string): Promise<void> {
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || card.type !== 'scheme') return

    // 魅惑: 方块牌可当画地为牢
    let effectiveCard: Card = card
    let usedAsSkill = ''
    if (player.hasSkillOrTreasure('mei-huo') && card.suit === 'diamond' && card.name !== '画地为牢' && card.name !== '手捧雷') {
      effectiveCard = { ...card, name: '画地为牢', delayed: true } as Card
      usedAsSkill = '魅惑'
    }

    this.removeHandCard(player,card.id)
    this.cardDeck.discard([card])
    this.eventBus.emit({
      type: 'card:play',
      sourceHeroId: player.getId(),
      targetHeroId: targetId,
      data: { cardId: card.id, cardName: effectiveCard.name, usedAsSkill: usedAsSkill || undefined },
    })
    this.lastPlayedCardName = effectiveCard.name
    if (usedAsSkill) this.emitSkillTrigger(player, '魅惑', `${card.name}当画地为牢`)

    // 延时锦囊：放到目标判定区 (使用时不支持无懈可击, 判定前才响应)
    if ((effectiveCard as any).delayed) {
      if (effectiveCard.name === '手捧雷') {
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
      // 控局: 手牌数>体力上限时免疫画地为牢
      if (this.isKongJuImmuneTo(target, '画地为牢')) {
        this.emitSkillTrigger(target, '控局', '免疫画地为牢')
        return
      }
      target.addJudgeCard(card)
      this.eventBus.emit({
        type: 'skill:trigger', sourceHeroId: target.getId(),
        data: { skillName: effectiveCard.name, effect: '放入判定区' },
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
      // 生有: 30%几率额外摸1张
      if (this.rollSubTreasure(player, 'treasure-sheng-you')) {
        const extra = this.cardDeck.draw(1)
        player.drawCards(extra)
        this.emitSkillTrigger(player, '生有', '额外摸1张')
      }
    } else if (card.name === '探囊取物') {
      // 选目标: 如未传targetId, 通过tanNangTargetHandler选
      let target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
      if (!target && this.config.tanNangTargetHandler) {
        const candidates = this.getEnemies(player).filter(p =>
          this.canTanNang(player, p) &&
          this.canBeSchemeTarget(p, card) &&
          // 控局: 手牌数<体力上限时免疫探囊取物
          !(p.hasSkillOrTreasure('kong-ju') && p.getHandSize() < p.getMaxHp())
        )
        if (candidates.length === 0) {
          this.emitSkillTrigger(player, '探囊取物', '无合法目标-失效')
          return
        }
        const chosenId = await this.config.tanNangTargetHandler(this, player, candidates)
        if (!chosenId) return
        target = this.players.find(p => p.getId() === chosenId)
      }
      if (!target) return
      if (!this.canTanNang(player, target)) {
        this.emitSkillTrigger(player, '探囊取物', `${target.getName()}不合法-失效`)
        return
      }
      if (!this.canBeSchemeTarget(target, card)) {
        this.emitSkillTrigger(target, '洞察', `免疫黑桃锦囊-探囊取物失效`)
        return
      }
      // 控局: 手牌数<体力上限时免疫探囊取物
      if (this.isKongJuImmuneTo(target, '探囊取物')) {
        this.emitSkillTrigger(target, '控局', `免疫探囊取物`)
        return
      }
      // 选1张牌(手牌/装备/判定)
      let pickedId: string | null = null
      if (player.getRole() === 'player' && this.config.tanNangPickHandler) {
        pickedId = await this.config.tanNangPickHandler(
          this, player, target,
          { hand: target.getHand(), judge: target.getJudgeCards(), equipment: this.collectEquipmentCards(target) },
        )
      }
      // 必拿: 若handler没选或选空, 取手牌第一张
      if (!pickedId) {
        if (target.getHandSize() > 0) pickedId = target.getHand()[0].id
        else {
          const eqs = this.collectEquipmentCards(target)
          if (eqs.length > 0) pickedId = eqs[0].id
          else if (target.getJudgeCards().length > 0) pickedId = target.getJudgeCards()[0].id
        }
      }
      if (pickedId) this.takeCardFromTarget(player, target, pickedId, '探囊取物')
    } else if (card.name === '釜底抽薪') {
      // 选目标: 如未传targetId, 通过fudiTargetHandler选
      let target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
      if (!target && this.config.fudiTargetHandler) {
        const candidates = this.getEnemies(player).filter(p =>
          p.isAlive() &&
          this.canBeSchemeTarget(p, card) &&
          // 控局: 手牌数<体力上限时免疫釜底抽薪
          !(p.hasSkillOrTreasure('kong-ju') && p.getHandSize() < p.getMaxHp())
        )
        if (candidates.length === 0) {
          return
        }
        const chosenId = await this.config.fudiTargetHandler(this, player, candidates)
        if (!chosenId) return
        target = this.players.find(p => p.getId() === chosenId)
      }
      if (target && !this.canBeSchemeTarget(target, card)) {
        this.emitSkillTrigger(target, '洞察', `免疫黑桃锦囊-釜底抽薪失效`)
        return
      }
      // 控局: 手牌数<体力上限时免疫釜底抽薪
      if (target && this.isKongJuImmuneTo(target, '釜底抽薪')) {
        this.emitSkillTrigger(target, '控局', `免疫釜底抽薪`)
        return
      }
      if (target) {
        // 目标无任何牌: 无法使用
        const hasAny = target.getHandSize() > 0 || this.collectEquipmentCards(target).length > 0 || target.getJudgeCards().length > 0
        if (!hasAny) {
          this.emitSkillTrigger(player, '釜底抽薪', `${target.getName()}无牌可弃`)
          return
        }
        let pickedId: string | null = null
        if (player.getRole() === 'player' && this.config.fudiPickHandler) {
          pickedId = await this.config.fudiPickHandler(
            this, player, target,
            { hand: target.getHand(), judge: target.getJudgeCards(), equipment: this.collectEquipmentCards(target) },
          )
        }
        if (!pickedId) {
          // 默认从手牌选第1张
          if (target.getHandSize() > 0) pickedId = target.getHand()[0].id
          else {
            const eqs = this.collectEquipmentCards(target)
            if (eqs.length > 0) pickedId = eqs[0].id
            else if (target.getJudgeCards().length > 0) pickedId = target.getJudgeCards()[0].id
          }
        }
        if (pickedId) this.discardCardFromTarget(target, pickedId, '釜底抽薪')
      }
    } else if (card.name === '借刀杀人') {
      // 借刀: 走 playerPlayJieDao (支持 UI 预选 holder), 这里只是占位
      return
    } else if (card.name === '决斗') {
      const target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
      if (target && target.isAlive() && target.getId() !== player.getId() && this.canBeSchemeTarget(target, card)) {
        await this.executeDuel(player, target)
      } else if (target && target.isAlive() && !this.canBeSchemeTarget(target, card)) {
        this.emitSkillTrigger(target, '洞察', `免疫黑桃锦囊-决斗失效`)
      }
    } else if (card.name === '休养生息') {
      for (const p of this.getAlivePlayers()) {
        if (!this.canBeSchemeTarget(p, card)) {
          this.emitSkillTrigger(p, '洞察', `免疫黑桃锦囊-休养生息无效`)
          continue
        }
        // 蝶魂: 血量不满时才可发动 (因为休养生息只给不满血的人加血)
        if (await this.checkDieHun(p, '休养生息')) continue
        if (p.getCurrentHp() < p.getMaxHp()) {
          const healed = p.heal(1)
          this.eventBus.emit({ type: 'heal', sourceHeroId: p.getId(), data: { amount: healed } })
        }
      }
    } else if (card.name === '五谷丰登') {
      await this.executeWuguFengdeng(player, card)
    } else if (card.name === '烽火狼烟') {
      let langYanBoost = false
      if (this.rollSubTreasure(player, 'treasure-lang-yan')) langYanBoost = true
      for (const target of this.getEnemies(player)) {
        if (!target.isAlive()) continue
        if (!this.canBeSchemeTarget(target, card)) {
          this.emitSkillTrigger(target, '洞察', `免疫黑桃锦囊-烽火狼烟无效`)
          continue
        }
        if (await this.checkDieHun(target, '烽火狼烟')) continue
        const killCard = await this.promptResponseKill(target, player.getId(), '烽火狼烟', 1)
        if (killCard) {
          this.removeCardFromPlayer(target, killCard)
          this.eventBus.emit({
            type: 'damage:prevent', sourceHeroId: target.getId(),
            targetHeroId: player.getId(),
            data: { cardName: killCard.name },
          })
        } else {
          let damage = 1
          if (langYanBoost) damage += 1
          if (this.zuijiuActive) { damage += 1; this.zuijiuActive = false }
          // 曼舞: 转移伤害
          if (await this.promptManWu(target, player, damage)) {
            // 伤害已转移
          } else {
            target.takeDamage(damage)
            this.eventBus.emit({ type: 'damage:deal', sourceHeroId: player.getId(), targetHeroId: target.getId(), data: { damage } })
            this.eventBus.emit({ type: 'damage:receive', sourceHeroId: target.getId(), data: { damage, from: player.getId() } })
            if (!target.isAlive()) {
              this.eventBus.emit({ type: 'die', sourceHeroId: target.getId(), data: { killedBy: player.getId() } })
            }
          }
        }
      }
      if (langYanBoost) this.emitSkillTrigger(player, '狼烟', '烽火狼烟伤害+1')
    } else if (card.name === '万箭齐发') {
      let wanJianBoost = false
      if (this.rollSubTreasure(player, 'treasure-wan-jian')) wanJianBoost = true
      for (const target of this.getEnemies(player)) {
        if (!target.isAlive()) continue
        if (!this.canBeSchemeTarget(target, card)) {
          this.emitSkillTrigger(target, '洞察', `免疫黑桃锦囊-万箭齐发无效`)
          continue
        }
        if (await this.checkDieHun(target, '万箭齐发')) continue
        // 玉如意/国色: 受到万箭齐发时也可判定, 红色视为闪
        if (await this.tryYuRuYiDodge(target, '万箭齐发')) continue
        const dodgeCard = await this.promptResponseDodge(target, player.getId(), '万箭齐发')
        if (dodgeCard) {
          this.removeHandCard(target,dodgeCard.id)
          this.cardDeck.discard([dodgeCard])
          this.eventBus.emit({
            type: 'damage:prevent', sourceHeroId: target.getId(),
            targetHeroId: player.getId(),
            data: { cardName: dodgeCard.name },
          })
          // 轻灵: 使用闪后30%几率摸一张
          if (this.rollSubTreasure(target, 'treasure-qing-ling')) {
            const drawn = this.cardDeck.draw(1)
            target.drawCards(drawn)
            this.emitSkillTrigger(target, '轻灵', '出闪后摸1张')
          }
        } else {
          let damage = 1
          if (wanJianBoost) damage += 1
          if (this.zuijiuActive) { damage += 1; this.zuijiuActive = false }
          // 曼舞: 转移伤害
          if (await this.promptManWu(target, player, damage)) {
            // 伤害已转移
          } else {
            target.takeDamage(damage)
            this.eventBus.emit({ type: 'damage:deal', sourceHeroId: player.getId(), targetHeroId: target.getId(), data: { damage } })
            this.eventBus.emit({ type: 'damage:receive', sourceHeroId: target.getId(), data: { damage, from: player.getId() } })
            if (!target.isAlive()) {
              this.eventBus.emit({ type: 'die', sourceHeroId: target.getId(), data: { killedBy: player.getId() } })
            }
          }
        }
      }
      if (wanJianBoost) this.emitSkillTrigger(player, '万箭', '万箭齐发伤害+1')
    }

    // 妙计: 使用锦囊牌时摸一张
    if (player.hasSkillOrTreasure('miao-ji')) {
      const drawn = this.cardDeck.draw(1)
      player.drawCards(drawn)
      this.emitSkillTrigger(player, '妙计', '使用锦囊摸1张')
    }
  }

  playerPlayHeal(player: Player, cardId: string): void {
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || card.name !== '药') return
    if (player.getCurrentHp() >= player.getMaxHp()) return
    this.removeHandCard(player,card.id)
    let healAmount = 1
    if (this.rollSubTreasure(player, 'yi-xin')) {
      healAmount += 1
      this.emitSkillTrigger(player, '医心', '治疗+1')
    }
    player.heal(healAmount)
    this.cardDeck.discard([card])
    this.eventBus.emit({ type: 'heal', sourceHeroId: player.getId(), data: { amount: healAmount } })
    this.lastPlayedCardName = '药'
  }

  playerEquipCard(player: Player, cardId: string): void {
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || card.type !== 'equipment') return
    const slot = (card as any).slot
    if (!slot) return
    // 同槽位已有装备: 旧装备弃入牌堆, 装备新牌 (走 removeCardFromPlayer 触发乾坤袋)
    if (player.getEquippedCard(slot as any)) {
      const old = player.getEquippedCard(slot as any)!
      this.removeCardFromPlayer(player, old)
    }
    this.removeHandCard(player, card.id)
    player.equip(card, slot)
    this.eventBus.emit({ type: 'equipment:equip', sourceHeroId: player.getId(), data: { cardId: card.id, slot, cardName: card.name } })
    this.lastPlayedCardName = '装备'
  }

  /** 驭人: 弃牌摸牌 (手牌或装备区) */
  playerYuRen(player: Player, cardIds: string[]): void {
    if (!player.hasSkillOrTreasure('yu-ren')) return
    if (!player.useSkill('yu-ren')) return
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
    let qianKunDaiLost = false
    for (const cid of cardIds) {
      const hand = this.removeHandCard(player, cid)
      if (hand) {
        this.cardDeck.discard([hand])
        continue
      }
      // 装备区
      const slot = slots.find(s => player.getEquippedCard(s)?.id === cid)
      if (slot) {
        const eq = player.unequip(slot)
        if (eq) {
          if (eq.name === '乾坤袋') qianKunDaiLost = true
          this.cardDeck.discard([eq])
          this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: player.getId(), data: { cardId: cid, slot } })
        }
      }
    }
    let drawnCount = cardIds.length
    // 乾坤袋被弃 → 玩家摸1张 (额外的)
    if (qianKunDaiLost) drawnCount += 1
    const drawn = this.cardDeck.draw(drawnCount)
    player.drawCards(drawn)
    this.emitSkillTrigger(player, '驭人', `弃${cardIds.length}摸${drawn.length}`)
    if (qianKunDaiLost) {
      this.emitSkillTrigger(player, '乾坤袋', '装备丢失-摸1张')
    }
    this.lastPlayedCardName = '驭人'
  }

  /** 奸雄: 打出一张牌当上一张打出的牌 */
  playerJianXiong(player: Player, cardId: string): void {
    if (!player.hasSkillOrTreasure('jian-xiong')) return
    if (!player.useSkill('jian-xiong')) return
    if (!this.lastPlayedCardName) return
    const card = player.getHand().find(c => c.id === cardId)
    if (!card) return
    this.removeHandCard(player,card.id)
    this.cardDeck.discard([card])
    this.emitSkillTrigger(player, '奸雄', `将${card.name}当${this.lastPlayedCardName}使用`)
    this.lastPlayedCardName = card.name
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
      const card = this.removeHandCard(player,cid)
      if (card) target.drawCards([card])
    }
    if (cardIds.length >= 2 && player.getCurrentHp() < player.getMaxHp()) {
      player.heal(1)
      this.eventBus.emit({ type: 'heal', sourceHeroId: player.getId(), data: { amount: 1 } })
    }
    this.emitSkillTrigger(player, '疏财', `给${target.getName()} ${cardIds.length}张牌`)
  }

  /** 天香: 判定开始前弃1张牌免判 (见 promptTianXiang) */

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
      this.removeHandCard(target,toDiscard.id)
      this.cardDeck.discard([toDiscard])
      this.emitSkillTrigger(player, '攻心', `弃${target.getName()}一张${color === 'red' ? '红色' : '黑色'}牌`)
    }
  }

  /** 疗伤: 弃1张手牌令1名角色回复1点体力 */
  playerLiaoShang(player: Player, cardId: string, targetId: string): void {
    if (!player.hasSkillOrTreasure('liao-shang')) return
    if (!player.useSkill('liao-shang')) return
    const card = player.getHand().find(c => c.id === cardId)
    if (!card) return
    const target = this.getPlayerById(targetId)
    if (!target || !target.isAlive() || target.getCurrentHp() >= target.getMaxHp()) return
    this.removeHandCard(player,card.id)
    this.cardDeck.discard([card])
    target.heal(1)
    this.eventBus.emit({ type: 'heal', sourceHeroId: target.getId(), data: { amount: 1 } })
    this.emitSkillTrigger(player, '疗伤', `${target.getName()}回复1体力`)
  }

  /** 治愈: 弃2张手牌令1名角色回复1点体力 */
  playerZhiYu(player: Player, cardIds: string[], targetId: string): void {
    if (!player.hasSkillOrTreasure('zhi-yu')) return
    if (!player.useSkill('zhi-yu')) return
    if (cardIds.length !== 2) return
    const target = this.getPlayerById(targetId)
    if (!target || !target.isAlive() || target.getCurrentHp() >= target.getMaxHp()) return
    const cards = cardIds.map(id => player.getHand().find(c => c.id === id)).filter((c): c is Card => !!c)
    if (cards.length !== 2) return
    for (const c of cards) {
      this.removeHandCard(player,c.id)
      this.cardDeck.discard([c])
    }
    target.heal(1)
    this.eventBus.emit({ type: 'heal', sourceHeroId: target.getId(), data: { amount: 1 } })
    this.emitSkillTrigger(player, '治愈', `${target.getName()}回复1体力`)
  }

  /** 烽火: 弃1张装备牌视为使用【烽火狼烟】 (手牌或装备区) */
  async playerFengHuo(player: Player, cardId: string): Promise<void> {
    if (!player.hasSkillOrTreasure('feng-huo')) return
    if (!player.useSkill('feng-huo')) return
    let card: Card | undefined = player.getHand().find(c => c.id === cardId) ?? undefined
    if (!card) {
      const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
      for (const s of slots) {
        const eq = player.getEquippedCard(s)
        if (eq && eq.id === cardId) { card = eq; break }
      }
    }
    if (!card || card.type !== 'equipment') return
    // 优先从装备区卸下, 再从手牌
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
    const equippedSlot = slots.find(s => player.getEquippedCard(s)?.id === card!.id)
    let qianKunDaiLost = false
    if (equippedSlot) {
      if (card.name === '乾坤袋') qianKunDaiLost = true
      player.unequip(equippedSlot)
    } else {
      this.removeHandCard(player, card.id)
    }
    this.cardDeck.discard([card])
    this.emitSkillTrigger(player, '烽火', '弃装备-视为烽火狼烟')
    this.eventBus.emit({
      type: 'card:play',
      sourceHeroId: player.getId(),
      data: { cardId: card.id, cardName: '烽火狼烟', usedAsSkill: '烽火' },
    })
    await this.executeFengHuoLangYan(player)
    // 妙计: 烽火狼烟视为锦囊 → 摸1张
    if (player.hasSkillOrTreasure('miao-ji')) {
      const drawn = this.cardDeck.draw(1)
      if (drawn.length > 0) {
        player.drawCards(drawn)
        this.emitSkillTrigger(player, '妙计', '使用锦囊摸1张')
      }
    }
    // 乾坤袋被弃 (从装备区) → 摸1张
    if (qianKunDaiLost) {
      const drawn = this.cardDeck.draw(1)
      if (drawn.length > 0) {
        player.drawCards(drawn)
        this.emitSkillTrigger(player, '乾坤袋', '装备丢失-摸1张')
      }
    }
  }

  private async executeFengHuoLangYan(player: Player): Promise<void> {
    let langYanBoost = false
    if (this.rollSubTreasure(player, 'treasure-lang-yan')) langYanBoost = true
    // 烽火狼烟 card 引用(用于 canBeSchemeTarget)
    const fengHuoCard: Card = { id: 'fhly-virtual', suit: 'spade', number: 1, type: 'scheme', name: '烽火狼烟' } as Card
    for (const target of this.getEnemies(player)) {
      if (!target.isAlive()) continue
      if (!this.canBeSchemeTarget(target, fengHuoCard)) {
        this.emitSkillTrigger(target, '洞察', `免疫黑桃锦囊-烽火狼烟无效`)
        continue
      }
      if (await this.checkDieHun(target, '烽火狼烟')) continue
      const killCard = this.findKillCard(target)
      if (killCard) {
        this.removeHandCard(target,killCard.id)
        this.cardDeck.discard([killCard])
        this.eventBus.emit({
          type: 'damage:prevent', sourceHeroId: target.getId(),
          targetHeroId: player.getId(),
          data: { cardName: killCard.name },
        })
      } else {
        let damage = 1
        if (langYanBoost) damage += 1
        if (this.zuijiuActive) { damage += 1; this.zuijiuActive = false }
        target.takeDamage(damage)
        this.eventBus.emit({ type: 'damage:deal', sourceHeroId: player.getId(), targetHeroId: target.getId(), data: { damage } })
        this.eventBus.emit({ type: 'damage:receive', sourceHeroId: target.getId(), data: { damage, from: player.getId() } })
        if (!target.isAlive()) {
          this.eventBus.emit({ type: 'die', sourceHeroId: target.getId(), data: { killedBy: player.getId() } })
        }
      }
    }
    if (langYanBoost) this.emitSkillTrigger(player, '狼烟', '烽火狼烟伤害+1')
  }

  /** 起义: 放弃摸牌, 改为从至多2名其他角色各获得1张手牌 */
  playerQiYi(player: Player, targetIds: string[]): void {
    if (!player.hasSkillOrTreasure('qi-yi')) return
    if (!player.useSkill('qi-yi')) return
    if (targetIds.length === 0 || targetIds.length > 2) return
    this.skipDrawThisTurn = true
    for (const tid of targetIds) {
      const target = this.getPlayerById(tid)
      if (!target || !target.isAlive()) continue
      const hand = target.getHand()
      if (hand.length === 0) continue
      const stolen = hand[Math.floor(Math.random() * hand.length)]
      this.removeHandCard(target,stolen.id)
      player.drawCards([stolen])
      this.emitSkillTrigger(player, '起义', `从${target.getName()}获取一张牌`)
    }
  }

  /** 绝击: 弃1张武器牌 (装备区或手牌) 或受1点伤害, 令攻击范围内1名角色受1点伤害 (每回合限1次) */
  async playerJueJi(player: Player, weaponCardId: string | null, targetId: string): Promise<void> {
    if (!player.hasSkillOrTreasure('jue-ji')) return
    if (!player.useSkill('jue-ji')) return
    const target = this.getPlayerById(targetId)
    if (!target || !target.isAlive()) return
    if (!this.isInAttackRange(player, target)) return
    if (weaponCardId) {
      // 优先从装备区找, 否则从手牌找
      const equipped = player.getEquippedCard('weapon')
      if (equipped && equipped.id === weaponCardId) {
        player.unequip('weapon')
        this.cardDeck.discard([equipped])
        this.emitSkillTrigger(player, '绝击', `弃置${equipped.name}`)
      } else {
        const handCard = player.getHand().find(c => c.id === weaponCardId)
        if (!handCard) return
        this.removeHandCard(player, handCard.id)
        this.cardDeck.discard([handCard])
        this.emitSkillTrigger(player, '绝击', `弃置手牌${handCard.name}`)
      }
    } else {
      const dmg = player.takeDamage(1)
      this.eventBus.emit({ type: 'damage:receive', sourceHeroId: player.getId(), data: { damage: dmg, from: '绝击' } })
      if (!player.isAlive()) {
        this.eventBus.emit({ type: 'die', sourceHeroId: player.getId(), data: { killedBy: '绝击' } })
        return
      }
    }
    // 曼舞: 目标有曼舞可转移绝击伤害
    if (await this.promptManWu(target, player, 1)) {
      // 伤害已转移
    } else {
      target.takeDamage(1)
      this.eventBus.emit({ type: 'damage:deal', sourceHeroId: player.getId(), targetHeroId: target.getId(), data: { damage: 1 } })
      this.eventBus.emit({ type: 'damage:receive', sourceHeroId: target.getId(), data: { damage: 1, from: player.getId() } })
      if (!target.isAlive()) {
        this.eventBus.emit({ type: 'die', sourceHeroId: target.getId(), data: { killedBy: player.getId() } })
      }
      this.emitSkillTrigger(player, '绝击', `${target.getName()}受1伤害`)
    }
  }

  /** 判断目标是否在攻击者的攻击范围内 */
  isInAttackRange(attacker: Player, target: Player): boolean {
    if (attacker.getId() === target.getId()) return false
    const range = attacker.getAttackRange()
    const distance = this.getEffectiveDistance(attacker, target)
    return distance <= range && distance > 0
  }

  /** 计算两角色之间的原始坐座位距离 (相邻=1, 否则=2) */
  calculateDistance(a: Player, b: Player): number {
    const alive = this.getAlivePlayers()
    const ia = alive.indexOf(a)
    const ib = alive.indexOf(b)
    if (ia < 0 || ib < 0) return Infinity
    const n = alive.length
    const diff = Math.abs(ia - ib)
    return Math.min(diff, n - diff)
  }

  /**
   * 考虑马匹的有效距离:
   * - 进攻马: 已包含在 getAttackRange / canTanNang 中, 此处不重复计算
   * - 防御马: 目标装备 → 距离 +1 (推远, 防御)
   */
  getEffectiveDistance(attacker: Player, target: Player): number {
    const raw = this.calculateDistance(attacker, target)
    if (raw === Infinity) return Infinity
    let d = raw
    if (target.getEquippedCard('defenseMount')) d += 1
    return d
  }

  /**
   * 侠胆: 与另一名角色拼点
   * 流程: 双方同时选牌 (玩家通过 xiaDanPlayerCardHandler, 目标通过 pinDianHandler / AI 自动选最小),
   *       双方都选完后系统同时揭示并比较: 玩家点数 >= 目标点数 即胜 (杀次数设为2), 否则本回合不能出杀
   */
  async playerXiaDan(player: Player, targetId: string): Promise<void> {
    if (!player.hasSkillOrTreasure('xia-dan')) return
    if (!player.useSkill('xia-dan')) return
    if (this.xiaDanUsedThisTurn.has(player.getId())) return
    const target = this.getPlayerById(targetId)
    if (!target || !target.isAlive() || target.getId() === player.getId()) return
    if (target.getHandSize() === 0) {
      this.emitSkillTrigger(player, '侠胆', '对手无手牌-跳过')
      return
    }
    if (player.getHandSize() === 0) {
      this.emitSkillTrigger(player, '侠胆', '自己无手牌-跳过')
      return
    }

    // 双方同时选牌 (玩家: xiaDanPlayerCardHandler; 目标: pinDianHandler 或 AI 自动选最小)
    const targetPickPromise = (async (): Promise<Card | null> => {
      if (this.config.pinDianHandler) {
        const cid = await this.config.pinDianHandler(this, target, player, '侠胆')
        if (cid) return target.getHand().find(c => c.id === cid) ?? null
      }
      // AI: 选最小的牌
      return [...target.getHand()].sort((a, b) => a.number - b.number)[0] ?? null
    })()

    const playerPickPromise = (async (): Promise<Card | null> => {
      if (this.config.xiaDanPlayerCardHandler) {
        const cid = await this.config.xiaDanPlayerCardHandler(this, player, target)
        if (cid) return player.getHand().find(c => c.id === cid) ?? null
      }
      return null
    })()

    const [opponentCard, playerCard] = await Promise.all([targetPickPromise, playerPickPromise])
    this.xiaDanUsedThisTurn.add(player.getId())

    if (!opponentCard || !playerCard) {
      // 任何一方取消, 双方手牌都保留
      this.eventBus.emit({
        type: 'skill:trigger',
        sourceHeroId: player.getId(),
        data: { skillName: '侠胆', effect: `与${target.getName()}拼点取消` },
      })
      return
    }

    this.removeHandCard(target,opponentCard.id)
    this.cardDeck.discard([opponentCard])
    this.removeHandCard(player,playerCard.id)
    this.cardDeck.discard([playerCard])

    // 比较点数, 应用效果
    this.eventBus.emit({
      type: 'skill:trigger',
      sourceHeroId: player.getId(),
      data: { skillName: '侠胆', effect: `与${target.getName()}拼点: 玩家${playerCard.name}${playerCard.number} vs 目标${opponentCard.name}${opponentCard.number}` },
    })

    if (playerCard.number >= opponentCard.number) {
      // 胜: 杀次数设为 2 (天狼则无限)
      this.killsMaxThisTurn = this.hasUnlimitedKill(player) ? Infinity : 2
      this.xiaDanWinKillsLeft.set(player.getId(), this.killsMaxThisTurn === Infinity ? Number.MAX_SAFE_INTEGER : 2)
      this.xiaDanWinTargetsPerKill.set(player.getId(), 2)
      this.emitSkillTrigger(player, '侠胆', '拼点胜-本回合杀次数=2(每张最多2目标)')
    } else {
      this.xiaDanLossThisTurn.add(player.getId())
      this.emitSkillTrigger(player, '侠胆', '拼点负-本回合不能出杀')
    }
  }

  /** 收集目标装备区所有卡牌 */
  collectEquipmentCards(target: Player): Card[] {
    const result: Card[] = []
    for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
      const c = target.getEquippedCard(slot)
      if (c) result.push(c)
    }
    return result
  }

  /** 探囊取物: 是否可对目标使用 (基础1+进攻马+骑射/单骑, 防御马算入有效距离; 目标至少有一张牌) */
  canTanNang(player: Player, target: Player): boolean {
    if (!target.isAlive() || target.getId() === player.getId()) return false
    const effectiveDistance = this.getEffectiveDistance(player, target)
    const range = player.getAttackRange()
    if (range <= 0 || effectiveDistance > range) return false
    if (target.getHandSize() === 0 && this.collectEquipmentCards(target).length === 0 && target.getJudgeCards().length === 0) {
      return false
    }
    return true
  }

  /**
   * 洞察 (dong-cha): 拥有此技能的角色不能成为黑桃花色(♠)锦囊牌的目标
   * 例外: 画地为牢/手捧雷 是延时锦囊, 直接放入判定区, 不属于"被指定为目标"
   */
  canBeSchemeTarget(target: Player, card: Card): boolean {
    if (card.type !== 'scheme') return true
    if ((card as any).delayed) return true  // 画地为牢/手捧雷: 延时锦囊, 不受洞察影响
    if (!target.hasSkillOrTreasure('dong-cha')) return true
    return card.suit !== 'spade'
  }

  /**
   * 从目标处拿1张牌 (探囊取物): 选手牌/装备/判定
   * 牌到手牌后, 玩家可以正常使用
   */
  private takeCardFromTarget(player: Player, target: Player, cardId: string, reason: string): void {
    let card: Card | undefined = this.removeHandCard(target,cardId)
    let wasQianKunDai = false
    if (!card) {
      // 装备
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = target.getEquippedCard(slot)
        if (eq && eq.id === cardId) {
          if (eq.name === '乾坤袋') wasQianKunDai = true
          card = target.unequip(slot) ?? undefined
          if (card) this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: target.getId(), data: { cardId, slot } })
          break
        }
      }
    }
    if (!card) {
      // 判定
      card = target.removeJudgeCard(cardId)
    }
    if (!card) return
    player.drawCards([card])
    this.eventBus.emit({
      type: 'card:gain', sourceHeroId: player.getId(),
      data: { cardId: card.id, cardName: card.name, from: target.getId(), reason },
    })
    this.emitSkillTrigger(player, reason, `从${target.getName()}获取${card.name}`)
    // 乾坤袋被拿 → 目标摸1张
    if (wasQianKunDai) {
      const drawn = this.cardDeck.draw(1)
      if (drawn.length > 0) {
        target.drawCards(drawn)
        this.emitSkillTrigger(target, '乾坤袋', '装备丢失-摸1张')
      }
    }
  }

  /** 让目标弃1张牌 (釜底抽薪) */
  private discardCardFromTarget(target: Player, cardId: string, reason: string): void {
    let card: Card | undefined = this.removeHandCard(target,cardId)
    let wasQianKunDai = false
    if (!card) {
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = target.getEquippedCard(slot)
        if (eq && eq.id === cardId) {
          if (eq.name === '乾坤袋') wasQianKunDai = true
          card = target.unequip(slot) ?? undefined
          if (card) this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: target.getId(), data: { cardId, slot } })
          break
        }
      }
    }
    if (!card) {
      card = target.removeJudgeCard(cardId)
    }
    if (!card) return
    this.cardDeck.discard([card])
    this.eventBus.emit({
      type: 'card:discard', sourceHeroId: target.getId(),
      data: { cards: [card.id], reason },
    })
    this.emitSkillTrigger(this.getPlayer(), reason, `${target.getName()}弃${card.name}`)
    // 乾坤袋被弃 → 目标摸1张
    if (wasQianKunDai) {
      const drawn = this.cardDeck.draw(1)
      if (drawn.length > 0) {
        target.drawCards(drawn)
        this.emitSkillTrigger(target, '乾坤袋', '装备丢失-摸1张')
      }
    }
  }

  /**
   * 五谷丰登: 翻N张牌(N=存活人数), 按顺序(从使用者起)每人拿1张
   * 拿牌过程可被无懈可击阻止
   * 玩家选牌时让出回合, 等玩家回合结束后继续处理剩余玩家
   */
  private async executeWuguFengdeng(player: Player, card: Card): Promise<void> {
    const alive = this.getAlivePlayers()
    const n = alive.length
    if (n === 0) return
    const cards = this.cardDeck.draw(n)
    if (cards.length === 0) {
      this.emitSkillTrigger(player, '五谷丰登', '牌堆无牌-失效')
      return
    }
    this.eventBus.emit({
      type: 'wugu:reveal', sourceHeroId: player.getId(),
      data: { cards: cards.map(c => ({ id: c.id, name: c.name, suit: c.suit, number: c.number })) },
    })
    this.emitSkillTrigger(player, '五谷丰登', `翻${cards.length}张牌`)

    // 从使用者开始, 每人拿1张
    const startIdx = alive.indexOf(player)
    const ordered = [
      ...alive.slice(startIdx),
      ...alive.slice(0, startIdx),
    ]
    const remaining = [...cards]

    // 单次选牌逻辑
    const doPick = async (p: Player): Promise<void> => {
      if (remaining.length === 0) return
      if (!p.isAlive()) return

      if (!this.canBeSchemeTarget(p, card)) {
        this.emitSkillTrigger(p, '洞察', `免疫黑桃锦囊-五谷丰登无效`)
        return
      }

      // 蝶魂: 群体锦囊目标可发动, 跳过拿牌
      if (await this.checkDieHun(p, '五谷丰登')) return

      const virtualCard = { name: '五谷丰登', type: 'scheme' as const, id: 'wugu-virtual', suit: 'heart', number: 1, delayed: false } as Card
      const nullified = await this.checkNullification(player, p, virtualCard)
      if (nullified) {
        this.emitSkillTrigger(p, '五谷丰登', `${p.getName()}被无懈可击-跳过`)
        return
      }

      let pickedId: string | null = null
      if (this.config.wuguPickHandler) {
        this.eventBus.emit({
          type: 'wugu:pickStart', sourceHeroId: p.getId(),
          data: { playerId: p.getId(), playerName: p.getName(), cards: remaining.map(c => ({ id: c.id, name: c.name, suit: c.suit, number: c.number })) },
        })
        pickedId = await this.config.wuguPickHandler(this, p, remaining)
      }
      if (!pickedId) {
        await new Promise(resolve => setTimeout(resolve, 400))
        pickedId = remaining[0].id
      }
      const idx = remaining.findIndex(c => c.id === pickedId)
      if (idx < 0) return
      const [picked] = remaining.splice(idx, 1)
      p.drawCards([picked])
      this.eventBus.emit({
        type: 'card:gain', sourceHeroId: p.getId(),
        data: { cardId: picked.id, cardName: picked.name, from: 'wugu' },
      })
      this.emitSkillTrigger(p, '五谷丰登', `${p.getName()}拿${picked.name}`)

      if (p.getRole() !== 'player') {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }

    // 玩家先拿, 让出回合; continuation 处理剩余 AI 玩家
    this.pendingWuguContinuation = async () => {
      for (let i = 1; i < ordered.length; i++) {
        if (remaining.length === 0) break
        await doPick(ordered[i])
      }
      this.pendingWuguContinuation = null
    }

    // 玩家选牌 (playerActionHandler 等待 wuguPickHandler 返回)
    await doPick(ordered[0])
    // 返回让出回合, continuation 在玩家回合结束后被调用
  }

  /** 借刀杀人: 出牌, 可预选holder (UI提前选), 不传则用handler选 */
  async playerPlayJieDao(player: Player, cardId: string, holderId?: string): Promise<void> {
    const card = player.getHand().find(c => c.id === cardId)
    if (!card || card.type !== 'scheme' || card.name !== '借刀杀人') return
    this.removeHandCard(player, card.id)
    this.cardDeck.discard([card])
    this.eventBus.emit({
      type: 'card:play', sourceHeroId: player.getId(),
      data: { cardId: card.id, cardName: card.name },
    })
    this.lastPlayedCardName = card.name
    await this.executeJieDao(player, card, holderId)
    // 妙计
    if (player.hasSkillOrTreasure('miao-ji')) {
      const drawn = this.cardDeck.draw(1)
      player.drawCards(drawn)
      this.emitSkillTrigger(player, '妙计', '使用锦囊摸1张')
    }
  }

  /** 借刀杀人: 选一个持武器的角色对另一名角色使用杀 (holderId可选: UI已选) */
  private async executeJieDao(player: Player, jieCard: Card, holderId?: string): Promise<void> {
    // 选持武器的人
    let holder: Player | undefined
    if (holderId) {
      holder = this.players.find(p => p.getId() === holderId)
      if (!holder || !holder.isAlive() || !holder.getEquippedCard('weapon')) return
    } else {
      // 筛选: 存活、不是玩家自己、装备了武器
      const weaponHolders = this.players.filter(p =>
        p.isAlive() && p.getId() !== player.getId() && p.getEquippedCard('weapon'),
      )
      if (weaponHolders.length === 0) {
        this.emitSkillTrigger(player, '借刀杀人', '无人持武器-无效')
        return
      }
      let hid: string | null = null
      if (this.config.jieDaoTargetHandler) {
        hid = await this.config.jieDaoTargetHandler(this, player, weaponHolders)
      } else {
        hid = weaponHolders[0].getId()
      }
      if (!hid) return
      holder = this.players.find(p => p.getId() === hid)
      if (!holder || !holder.isAlive() || !holder.getEquippedCard('weapon')) return
    }

    // 选攻击目标: 必须是除holder外存活角色, 且在holder攻击范围内, 且不受洞察免疫
    const candidates = this.players.filter(p =>
      p.isAlive() && p.getId() !== holder.getId() && this.isInAttackRange(holder, p) && this.canBeSchemeTarget(p, jieCard),
    )
    if (candidates.length === 0) {
      this.emitSkillTrigger(player, '借刀杀人', `${holder.getName()}无合法目标-跳过`)
      return
    }
    let attackTargetId: string | null = null
    if (this.config.jieDaoAttackTargetHandler) {
      attackTargetId = await this.config.jieDaoAttackTargetHandler(this, player, holder, candidates)
    } else {
      attackTargetId = candidates[0].getId()
    }
    if (!attackTargetId) return
    const attackTarget = this.players.find(p => p.getId() === attackTargetId)
    if (!attackTarget || !attackTarget.isAlive()) return
    if (!this.canBeSchemeTarget(attackTarget, jieCard)) {
      this.emitSkillTrigger(attackTarget, '洞察', `免疫黑桃锦囊-借刀杀人无效`)
      return
    }

    this.emitSkillTrigger(player, '借刀杀人', `令${holder.getName()}对${attackTarget.getName()}使用杀`)

    // 检查无懈可击: 借刀杀人作为锦囊, 杀作为其结果
    const jieNullified = await this.checkNullification(player, attackTarget, jieCard)
    if (jieNullified) return

    // 强制holder出一张杀
    const killCard = holder.getHand().find(c => c.name === '杀')
    if (!killCard) {
      // holder没有杀 → 武器归玩家
      const weapon = holder.unequip('weapon')
      if (weapon) player.drawCards([weapon])
      this.emitSkillTrigger(player, '借刀杀人', `${holder.getName()}无杀-武器归${player.getName()}`)
    } else {
      // holder出杀, 无论是否命中, 武器都保留在holder
      await this.executeKill(holder, attackTarget, killCard)
    }
  }

  /** 狼牙棒: 自动选择多目标出杀 */
  async playerPlayKillAuto(player: Player, cardId: string): Promise<void> {
    const killCard = player.getHand().find(c => c.id === cardId)
    if (!killCard || !this.canUseAsKill(killCard, player)) return
    if (this.config.multiTargetHandler) {
      const enemies = this.getEnemies(player)
      const targetIds = await this.config.multiTargetHandler(this, player, enemies)
      for (const tid of targetIds) {
        const target = this.players.find(p => p.getId() === tid)
        if (target && target.isAlive() && this.isInAttackRange(player, target)) {
          const c = player.getHand().find(card => card.id === cardId) ?? killCard
          await this.executeKill(player, target, c)
        }
      }
    }
  }

  /** 从手牌或装备区移除一张牌并弃掉 */
  private removeCardFromPlayer(player: Player, card: Card): void {
    const wasInHand = player.getHand().some(c => c.id === card.id)
    let wasQianKunDai = false
    if (wasInHand) {
      this.removeHandCard(player, card.id)
    } else {
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = player.getEquippedCard(slot)
        if (eq && eq.id === card.id) {
          if (eq.name === '乾坤袋') wasQianKunDai = true
          player.unequip(slot)
          this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: player.getId(), data: { cardId: card.id, slot } })
          break
        }
      }
    }
    this.cardDeck.discard([card])
    // 乾坤袋被移除 (从装备区) → 目标摸1张
    if (wasQianKunDai) {
      const drawn = this.cardDeck.draw(1)
      if (drawn.length > 0) {
        player.drawCards(drawn)
        this.emitSkillTrigger(player, '乾坤袋', '装备丢失-摸1张')
      }
    }
  }

  /** 芦叶枪: 选2张手牌当杀 (没有杀时用两张代替一张杀, 占杀次数) */
  async playerUseLuYeQiang(player: Player): Promise<void> {
    if (!this.config.dualCardHandler) return
    // 侠胆: 输了拼点不能出杀
    if (this.xiaDanLossThisTurn.has(player.getId())) return
    // 杀次数已用尽 (虎符/天狼 仍可无限)
    if (!this.hasUnlimitedKill(player) && this.killsUsedThisTurn >= this.killsMaxThisTurn) return
    const cardIds = await this.config.dualCardHandler(this, player)
    if (cardIds.length !== 2) return
    const cards = cardIds.map(id => player.getHand().find(c => c.id === id)).filter((c): c is Card => !!c)
    if (cards.length !== 2) return
    // 第二张牌直接弃掉, 第一张由 executeKill 处理
    this.removeHandCard(player, cards[1].id)
    this.cardDeck.discard([cards[1]])

    // 选目标: 在攻击范围内的敌人
    const inRange = this.getEnemies(player).filter(e => this.isInAttackRange(player, e))
    let targetId: string | null = null
    if (this.config.luYeQiangTargetHandler) {
      targetId = await this.config.luYeQiangTargetHandler(this, player, inRange)
    }
    const target = targetId ? this.players.find(p => p.getId() === targetId) : null
    if (target && target.isAlive()) {
      await this.executeKill(player, target, cards[0])
    } else {
      // 无目标时也要移除第一张牌
      this.removeHandCard(player, cards[0].id)
      this.cardDeck.discard([cards[0]])
    }
    // 计入本回合杀次数
    if (!this.hasUnlimitedKill(player)) {
      this.killsUsedThisTurn++
      this.killUsedThisTurn = true
      player.setUsedKillThisTurn(true)
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
