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
  /** 玩家自选友军(优先于 allyHeroIds). 携带玩家的完整 HeroInstance (等级/星级/宝具) */
  allyInstances?: HeroInstance[]
  enemyHeroIds: string[]
  /** 敌方实例(优先于 enemyHeroIds 的空stub). 由前端根据关卡难度生成, 含星级+宝具. */
  enemyInstances?: HeroInstance[]
  playerActionHandler?: (game: Game, player: Player) => Promise<GameAction | null>
  /** 变法/判定交互：返回要替换的手牌ID，null表示不替换 */
  judgeActionHandler?: (game: Game, player: Player, judgeCard: Card) => Promise<string | null>
  /** 超脱: 判定时用黑色手牌或装备替换, 返回 cardId (hand或装备均可). null=不替换 */
  chaoTuoHandler?: (game: Game, player: Player, judgeCard: Card, blackCardIds: { hand: string[]; equipment: Array<{ cardId: string; slot: string }> }) => Promise<string | null>
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
  /** 后主: 使用闪后是否发动 + 选目标. 返回 null=不发动; 否则为目标id */
  houZhuHandler?: (game: Game, dodger: Player, candidates: Player[]) => Promise<string | null>
  /** 天香: 判定开始前是否发动 (返回cardId=弃1张手牌免判; null=不发动, 正常判定) */
  tianXiangHandler?: (game: Game, player: Player, judgeCard: Card) => Promise<string | null>
  /** 曼舞: 受伤时选择弃哪张红桃/黑桃手牌 (返回cardId; null=取消/不发动) */
  manWuPickCardHandler?: (game: Game, victim: Player) => Promise<string | null>
  /** 曼舞: 受伤时选择转移目标 (返回targetId; null=不发动) */
  manWuHandler?: (game: Game, victim: Player, attacker: Player, damage: number, candidates: Player[]) => Promise<string | null>
  /** 绝击: AI/玩家 是否发动以及选 (弃武器/null=受1血) + 目标. 返回null=不发动 */
  jueJiHandler?: (game: Game, attacker: Player, inRangeEnemies: Player[]) => Promise<{ weaponCardId: string | null; targetId: string } | null>
  /** 门神: 秦琼回合结束选择保护目标 */
  menShenTargetHandler?: (game: Game, qinQiong: Player, candidates: Player[]) => Promise<string | null>
  /** 三板斧: 程咬金出杀时是否发动 */
  sanBanFuHandler?: (game: Game, attacker: Player, defender: Player) => Promise<boolean>
  /** 鸩杀: 吕雉是否对濒死目标使用【药】 */
  zhenShaHandler?: (game: Game, lvZhi: Player, dyingTarget: Player) => Promise<boolean>
  /** 诀别: 虞姬濒死时是否指定男性英雄 (null=不指定) */
  jueBieHandler?: (game: Game, yuJi: Player, candidates: Player[]) => Promise<string | null>
  /** 补刀: 关羽是否对目标补杀 (null=不补) */
  buDaoHandler?: (game: Game, guanYu: Player, victim: Player) => Promise<string | null>
  /** 复仇: 受伤后是否发动判定 (true=发动; false=不发动) */
  fuChouTriggerHandler?: (game: Game, victim: Player, attacker: Player) => Promise<boolean>
  /** 复仇: 判定成功后, 来源选 (弃2张手牌 / 掉1血). 返回 'discard' | 'damage'; 手牌<2时引擎直接掉血不询问 */
  fuChouChooseHandler?: (game: Game, attacker: Player, handCards: Card[]) => Promise<'discard' | 'damage'>
  /** 复仇: 来源选弃2张手牌时, 选哪2张 (返回2个cardId, 至少2个; 不足时引擎补齐) */
  fuChouPickHandler?: (game: Game, attacker: Player, handCards: Card[]) => Promise<string[]>
  /** 濒死救援: 救者是否用药救濒死目标 (返回要弃的药cardIds数组; null/[]=不救). AI由引擎自行决策 */
  dyingRescueHandler?: (game: Game, savior: Player, dyingTarget: Player, yaoHandCards: Card[]) => Promise<string[] | null>
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
  private killsMaxThisTurn = 1         // 本回合最大杀次数 (天狼/虎符→Infinity; 侠胆胜→+1, 与天狼/虎符互不影响)
  private xiaDanMultiTargetPerKill = 1  // 侠胆: 每张杀最多指定几个目标(胜出=2, 默认1)
  private lastPlayedCardName: string | null = null
  private zuijiuActive = false  // 醉酒：本回合杀/决斗伤害+1
  private skipNextTurnPlayerId: string | null = null  // 蓄谋：跳过指定玩家的下一回合
  private skipCurrentTurnPlayerId: string | null = null  // 画地为牢：跳过指定玩家的当前回合
  private aoJianActive = new Set<string>()  // 傲剑主动模式: 玩家id集合, 回合结束清空
  // 侠胆: 胜→本回合所有杀可指定2目标 + 杀次数+1 (天狼/虎符不增加次数但保留2目标)
  //      负→本回合不能出杀
  private xiaDanLossThisTurn = new Set<string>()             // 输了侠胆的玩家集合
  private xiaDanUsedThisTurn = new Set<string>()             // 本回合已尝试拼点的玩家 (限1次)
  private skipDrawThisTurn = false                            // 起义: 跳过本回合摸牌
  // 门神: 秦琼 → 受保护的目标ID (回合结束指定, 下回合开始失效)
  private menShenMap = new Map<string, string>()              // qinQiongId → protectedTargetId
  // 诀别: 虞姬濒死时指定的男性英雄ID; 阵亡后牌归其
  private jueBieTarget: string | null = null
  /** 五谷丰登剩余玩家延续函数 (玩家出牌后继续) */
  pendingWuguContinuation: (() => Promise<void>) | null = null

  get canPlayKill() {
    const player = this.players.find(p => p.getRole() === 'player')
    if (!player) return false
    if (this.xiaDanLossThisTurn.has(player.getId())) return false
    // 天狼/虎符: 杀无限制
    if (this.hasUnlimitedKill(player)) return true
    // 杀次数: 基础1, 侠胆胜出+1(已算入killsMaxThisTurn)
    return this.killsUsedThisTurn < this.killsMaxThisTurn
  }

  /** 侠胆: 每张杀最多可指定几个目标(默认1, 侠胆胜出=2) */
  getMaxTargetsPerKill(): number {
    return this.xiaDanMultiTargetPerKill
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

    // 友军: 玩家自选 (allyInstances) 优先, 否则回退到 allyHeroIds + 空 stub
    if (config.allyInstances && config.allyInstances.length > 0) {
      for (const inst of config.allyInstances) {
        const hero = getHeroById(inst.heroId)
        if (hero) this.players.push(new Player(hero, inst, 'ally'))
      }
    } else {
      for (const allyId of config.allyHeroIds) {
        const hero = getHeroById(allyId)
        if (hero) {
          this.players.push(new Player(hero, { heroId: allyId, level: 1, growthValue: 0, starLevel: hero.starLevel, treasures: { main: [], sub: [] } }, 'ally'))
        }
      }
    }

    for (let i = 0; i < config.enemyHeroIds.length; i++) {
      const enemyId = config.enemyHeroIds[i]
      const hero = getHeroById(enemyId)
      if (hero) {
        // 优先用 enemyInstances (含星级+宝具), 否则退回到空 stub
        const inst = config.enemyInstances?.[i]
          ?? { heroId: enemyId, level: 1, growthValue: 0, starLevel: hero.starLevel, treasures: { main: [], sub: [] } }
        this.players.push(new Player(hero, inst, 'enemy'))
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
      this.emitSkillTrigger(attacker, '强化', '伤害+1')
      await this.applyDamage(attacker, defender, 1)
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
        this.emitSkillTrigger(victim, '伤之仇', '反击1点伤害')
        await this.applyDamage(victim, attacker, 1)
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

  /** 后主: 使用闪后可令另一名角色判定, 若黑桃则其掉2血 */
  async triggerHouZhu(dodger: Player): Promise<void> {
    if (!dodger.hasSkillOrTreasure('hou-zhu')) return
    if (!dodger.isAlive()) return
    const candidates = this.players.filter(p => p.isAlive() && p.getId() !== dodger.getId())
    if (candidates.length === 0) return

    let targetId: string | null = null
    if (dodger.getRole() === 'player' && this.config.houZhuHandler) {
      targetId = await this.config.houZhuHandler(this, dodger, candidates)
    } else {
      // AI: 50% 概率触发, 随机选目标
      if (Math.random() < 0.5) {
        targetId = candidates[Math.floor(Math.random() * candidates.length)].getId()
      }
    }

    if (!targetId) return
    const target = this.getPlayerById(targetId)
    if (!target || !target.isAlive()) return

    this.emitSkillTrigger(dodger, '后主', `令${target.getName()}判定`)
    const result = await this.judge(target)
    if (result.suit === 'spade') {
      this.emitSkillTrigger(dodger, '后主', `${target.getName()}判定黑桃, 掉2血`)
      await this.applyDamage(dodger, target, 2)
    }
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
      // 变法: 替换判定牌
      if (player.hasSkillOrTreasure('bian-fa') && player.useSkill('bian-fa') && player.getHandSize() > 0) {
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

      // 超脱: 用黑色手牌或装备替换判定牌
      if (player.hasSkillOrTreasure('chao-tuo')) {
        const blackHandIds = player.getHand().filter(c => isBlackSuit(c.suit)).map(c => c.id)
        const blackEquipment: Array<{ cardId: string; slot: string }> = []
        for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
          const eq = player.getEquippedCard(slot)
          if (eq && isBlackSuit(eq.suit)) blackEquipment.push({ cardId: eq.id, slot })
        }
        if (blackHandIds.length > 0 || blackEquipment.length > 0) {
          let replaceCardId: string | null = null
          if (player.getRole() === 'player' && this.config.chaoTuoHandler) {
            replaceCardId = await this.config.chaoTuoHandler(this, player, card, { hand: blackHandIds, equipment: blackEquipment })
          } else {
            // AI: 50%概率替换
            if (Math.random() < 0.5) {
              if (blackHandIds.length > 0) replaceCardId = blackHandIds[0]
              else if (blackEquipment.length > 0) replaceCardId = blackEquipment[0].cardId
            }
          }

          if (replaceCardId) {
            let replacement: Card | undefined
            // 尝试从手牌取
            const handCard = player.getHand().find(c => c.id === replaceCardId)
            if (handCard) {
              replacement = this.removeHandCard(player, replaceCardId) ?? undefined
            } else {
              // 从装备区取
              for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
                const eq = player.getEquippedCard(slot)
                if (eq && eq.id === replaceCardId) {
                  replacement = player.unequip(slot) ?? undefined
                  if (replacement) {
                    this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: player.getId(), data: { cardId: replacement.id, slot } })
                  }
                  break
                }
              }
            }
            if (replacement) {
              this.cardDeck.discard([card])
              this.emitSkillTrigger(player, '超脱', `用${replacement.name}(${replacement.suit})替换${card.name}`)
              card = replacement
              this.eventBus.emit({ type: 'judge', sourceHeroId: judgeHeroId, data: { suit: card.suit, number: card.number, cardName: card.name, judgeCardName, phase: 'replace' } })
            }
          }
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
      // 诀别: 虞姬阵亡后所有牌归入指定男性
      if (this.jueBieTarget && victim.hero.hero.id === 'yu-ji') {
        const target = this.getPlayerById(this.jueBieTarget)
        if (target && target.isAlive() && !target.isFemale()) {
          target.drawCards(allCards)
          this.eventBus.emit({ type: 'card:gain', sourceHeroId: target.getId(), data: { count: allCards.length, reason: '诀别', from: victim.getId() } })
          this.emitSkillTrigger(victim, '诀别', `所有牌归入${target.getName()}`)
          this.jueBieTarget = null
          return
        }
      }
      this.cardDeck.discard(allCards)
      this.eventBus.emit({ type: 'card:discard', sourceHeroId: victimId, data: { count: allCards.length, reason: 'death' } })
    }
    this.jueBieTarget = null
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
    // 门神: 秦琼的下回合开始时清除自己上回合指定的保护
    this.menShenMap.delete(player.getId())
    // 侠胆: 每个玩家回合开始时重置
    this.xiaDanMultiTargetPerKill = 1
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
      this.emitSkillTrigger(player, '蓄谋', '摸3张，跳下回合')
    }
    // 门神: 秦琼回合结束可指定1目标, 到下回合开始前对该目标的【杀】/【决斗】视为对秦琼打出
    if (player.hasSkillOrTreasure('men-shen')) {
      void this.promptMenShenTarget(player)
    }
  }

  private async promptMenShenTarget(qinQiong: Player): Promise<void> {
    const candidates = this.getAlivePlayers().filter(p => p.getId() !== qinQiong.getId())
    if (candidates.length === 0) return
    let chosenId: string | null = null
    if (qinQiong.getRole() === 'player' && this.config.menShenTargetHandler) {
      chosenId = await this.config.menShenTargetHandler(this, qinQiong, candidates)
    } else {
      // AI: 选血量最低的敌人优先
      const enemies = candidates.filter(p => p.getRole() !== qinQiong.getRole())
      const target = (enemies.length > 0 ? enemies : candidates)
        .sort((a, b) => a.getCurrentHp() - b.getCurrentHp())[0]
      chosenId = target?.getId() ?? null
    }
    if (chosenId) {
      this.menShenMap.set(qinQiong.getId(), chosenId)
      const target = this.getPlayerById(chosenId)
      this.emitSkillTrigger(qinQiong, '门神', `指定${target?.getName() ?? '?'}为目标`)
    }
  }

  /** 门神重定向: 若defender是秦琼保护的目标, 则把defender替换为秦琼 */
  private redirectIfMenShen(attacker: Player, defender: Player): Player {
    for (const [qinId, protectedId] of this.menShenMap) {
      if (protectedId === defender.getId()) {
        const qinQiong = this.getPlayerById(qinId)
        if (qinQiong && qinQiong.isAlive() && qinQiong.getId() !== attacker.getId()) {
          this.emitSkillTrigger(qinQiong, '门神', `${attacker.getName()}的杀/决斗→自己`)
          return qinQiong
        }
      }
    }
    return defender
  }

  /** 诀别: 虞姬濒死时选择一名男性英雄 */
  private async promptJueBieTarget(yuJi: Player): Promise<void> {
    const candidates = this.getAlivePlayers().filter(p =>
      p.getId() !== yuJi.getId() && !p.isFemale()
    )
    if (candidates.length === 0) {
      this.emitSkillTrigger(yuJi, '诀别', '无男性候选-失效')
      return
    }
    let chosenId: string | null = null
    if (yuJi.getRole() === 'player' && this.config.jueBieHandler) {
      chosenId = await this.config.jueBieHandler(this, yuJi, candidates)
    } else {
      // AI: 选血量最高的友军男性
      const allies = candidates.filter(p => p.getRole() === yuJi.getRole())
      const pool = allies.length > 0 ? allies : candidates
      const target = pool.sort((a, b) => b.getCurrentHp() - a.getCurrentHp())[0]
      chosenId = target?.getId() ?? null
    }
    if (chosenId) {
      this.jueBieTarget = chosenId
      const target = this.getPlayerById(chosenId)
      this.emitSkillTrigger(yuJi, '诀别', `指定${target?.getName() ?? '?'}继承所有牌`)
    }
  }

  /** 鸩杀: 吕雉对濒死目标使用【药】使其阵亡 */
  private async promptZhenSha(dyingTarget: Player): Promise<void> {
    const lvZhi = this.players.find(p => p.hero.hero.id === 'lv-zhi' && p.isAlive())
    if (!lvZhi) return
    if (!lvZhi.getHand().some(c => c.name === '药')) return
    let trigger = false
    if (lvZhi.getRole() === 'player' && this.config.zhenShaHandler) {
      trigger = await this.config.zhenShaHandler(this, lvZhi, dyingTarget)
    } else {
      // AI: 濒死目标是敌人就发动
      trigger = lvZhi.getRole() !== dyingTarget.getRole()
    }
    if (!trigger) return
    // 找一张药弃掉 (吕雉手牌)
    const yao = lvZhi.getHand().find(c => c.name === '药')
    if (!yao) return
    this.removeHandCard(lvZhi, yao.id)
    this.cardDeck.discard([yao])
    this.emitSkillTrigger(lvZhi, '鸩杀', `对${dyingTarget.getName()}使用【药】使阵亡`)
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
          // 同槽位已有装备: 旧装备弃入牌堆, 装备新牌 (走 removeCardFromPlayer 触发乾坤袋)
          if (player.getEquippedCard(slot as any)) {
            const old = player.getEquippedCard(slot as any)!
            this.removeCardFromPlayer(player, old)
          }
          player.equip(card, slot)
          this.eventBus.emit({ type: 'equipment:equip', sourceHeroId: player.getId(), data: { cardId: card.id, slot, cardName: card.name } })
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
    // 门神: 若defender被秦琼保护, 重定向到秦琼
    defender = this.redirectIfMenShen(attacker, defender)
    if (!attacker.isAlive() || !defender.isAlive()) return
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
          if (dodgeCard.name === '闪') await this.triggerHouZhu(defender)
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
          // 杀伤害: 走统一伤害处理 (含濒死救援 + 受伤触发 + 杀辅印)
          await this.applyDamage(attacker, defender, damage, killCard, {
            sourceAction: 'kill',
            afterOnDamageReceived: async () => {
              await this.onKillDamageDealt(attacker, defender)
              await this.onKillDamageReceived(defender, attacker)
            },
          })
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
        // 注: 'die' 事件由 applyDamage 内部统一发送, 此处不重复 emit
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
              await this.applyDamage(attacker, defender, 1, killCard, {
                sourceAction: 'kill',
                afterOnDamageReceived: async () => {
                  await this.onKillDamageDealt(attacker, defender)
                  await this.onKillDamageReceived(defender, attacker)
                },
              })
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
  private async onDamageReceived(victim: Player, attacker: Player, sourceCard?: Card, sourceAction?: string): Promise<void> {
    // 濒死救援: HP≤0 时先进入濒死阶段 (鸩杀→救援→诀别). 若未救活则不再走下面的技能触发
    if (victim.getCurrentHp() <= 0 && victim.isAlive()) {
      const saved = await this.rescueDyingPlayer(victim)
      if (!saved) return
    }

    // 集权: 获得造成伤害的牌
    if (victim.hasSkillOrTreasure('ji-tian') && sourceCard) {
      // 从弃牌堆找回那张具体牌
      const recovered = this.cardDeck.takeFromDiscard(sourceCard.id)
      if (recovered) {
        victim.drawCards([recovered])
        this.emitSkillTrigger(victim, '集权', `获得【${recovered.name}】`)
      } else {
        // 找不到(可能已洗回抽牌堆): 退而求其次摸1张
        const drawn = this.cardDeck.draw(1)
        victim.drawCards(drawn)
        this.emitSkillTrigger(victim, '集权', '获得造成伤害的牌(已重洗)')
      }
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
    // 使用反击 → 本次 onDamageReceived 的补刀被阻断(反击造成的伤害在新的 onDamageReceived 里走自己的补刀检查)
    let fanJiUsed = false
    if (victim.hasSkillOrTreasure('fan-ji') && attacker.isAlive()) {
      const hasKillable = victim.getHand().some(c => this.canUseAsKill(c, victim))
      if (hasKillable) {
        // 复用 promptResponseKill: AI自动选, 玩家走响应UI (支持傲剑/武穆等)
        const killCard = await this.promptResponseKill(victim, attacker.getId(), '反击', 1)
        if (killCard) {
          fanJiUsed = true
          const isRed = isRedSuit(killCard.suit)
          this.emitSkillTrigger(victim, '反击', isRed ? '红色杀-不可闪' : '对来源出杀')
          await this.executeKill(victim, attacker, killCard, { forceNoDodge: isRed })
        }
      }
    }

    // 复仇: 受伤后可发动, 判定成功后来源弃2牌或掉1血
    if (victim.hasSkillOrTreasure('fu-chou') && attacker.isAlive()) {
      await this.promptFuChou(victim, attacker)
    }

    // 补刀: 关羽回合外, 攻击范围内的角色被【杀】掉血后, 可对该角色补杀, 造成伤害则继续
    // 触发顺序: 在复仇/法家/反击之后
    // 兼容: sourceAction === 'kill' (武圣/傲剑把红牌当杀时) 或 sourceCard.name === '杀'
    // 防递归: 关羽自己出杀(补刀链)不触发补刀
    // 被反击打断: 受害方反击了 → 本次补刀被阻断(反击造成的伤害在新的 onDamageReceived 里走自己的补刀检查)
    const isKillDamage = sourceAction === 'kill' || sourceCard?.name === '杀'
    if (isKillDamage && victim.isAlive() && !fanJiUsed) {
      const guanYu = this.players.find(p => p.hero.hero.id === 'guan-yu' && p.isAlive())
      const currentPlayer = this.players[this.currentPlayerIndex]
      if (guanYu && currentPlayer && guanYu.getId() !== currentPlayer.getId() &&
          guanYu.getId() !== victim.getId() &&
          attacker.getId() !== guanYu.getId() &&
          this.isInAttackRange(guanYu, victim) &&
          guanYu.getHand().some(c => this.canUseAsKill(c, guanYu))) {
        await this.executeBuDao(guanYu, victim)
      }
    }

    // 妙计: 使用锦囊牌摸一张 (sourceCard为锦囊时)
    // 这个在card:play时触发更合适，此处跳过
  }

  // --- Query methods ---

  // --- Duel (决斗) ---

  async executeDuel(initiator: Player, target: Player): Promise<void> {
    if (!target.isAlive() || !initiator.isAlive()) return

    // 门神: 决斗目标若被秦琼保护, 重定向到秦琼
    target = this.redirectIfMenShen(initiator, target)
    if (!target.isAlive()) return

    // 女权(技能, 仅武则天): 女性对男性出【决斗】, 对方需出2张【杀】; 男性对女性正常出决斗
    const femaleVsMale = initiator.hasSkillOrTreasure('nu-quan') && !target.hasSkillOrTreasure('nu-quan')

    // 交替出杀, target 先. 输方掉1血
    let current = target
    let other = initiator
    let lastKiller: Player | null = null  // 上一轮出杀的人
    let needCount = femaleVsMale ? 2 : 1  // 本轮需要出几张杀(霸王/女权影响)

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
    // 目标承受伤害 (走统一处理, 含濒死救援)
    await this.applyDamage(attacker, target, damage, undefined, {
      skipOnDamageReceived: true,  // 转移伤害不重复触发受伤技能 (原victim已触发过)
      afterOnDamageReceived: async () => {
        // 目标摸X张牌, X=目标(被转移者)损失的血量 (target alive 时自然 ≤ maxHp-1)
        const hpLoss = target.getMaxHp() - target.getCurrentHp()
        if (hpLoss > 0) {
          const drawn = this.cardDeck.draw(hpLoss)
          target.drawCards(drawn)
        }
      },
    })
    this.emitSkillTrigger(victim, '曼舞', `转移${damage}点伤害给${target.getName()}`)
    return true
  }

  /**
   * 复仇: 受伤后可发动, 判定非红桃则来源弃2张手牌或掉1血 (来源自选, 非随机)
   * - 玩家: 先询问 victim 是否发动, 判定成功后再让 attacker 选 (弃牌/掉血), 弃牌时再让 attacker 选哪2张
   * - AI: 默认发动; 来源手牌≥2时弃牌 (避免掉血), 否则掉血; 弃牌时随机丢前2张
   * - 若 attacker 手牌<2张, 引擎直接掉血 (不询问)
   */
  async promptFuChou(victim: Player, attacker: Player): Promise<void> {
    if (!attacker.isAlive()) return

    // 1. 询问 victim 是否发动
    let triggered = false
    if (victim.getRole() === 'player') {
      if (this.config.fuChouTriggerHandler) {
        triggered = await this.config.fuChouTriggerHandler(this, victim, attacker)
      }
    } else {
      triggered = true
    }
    if (!triggered) {
      this.emitSkillTrigger(victim, '复仇', '选择不发动')
      return
    }

    // 2. 判定 (天香可跳过; 红妆黑桃视红桃)
    const result = await this.judgeWithSkills(victim, '复仇')
    if (result.skipped) return
    const isHeart = this.isEffectivelyHeart(result.suit, victim)
    if (isHeart) {
      this.emitSkillTrigger(victim, '复仇', '判定红桃-失效')
      return
    }

    // 3. 来源手牌<2直接掉血
    const hand = attacker.getHand()
    if (hand.length < 2) {
      this.emitSkillTrigger(victim, '复仇', '来源手牌<2-直接掉1血')
      await this.applyFuChouDamage(victim, attacker)
      return
    }

    // 4. 来源选 (弃2张手牌 / 掉1血)
    let choice: 'discard' | 'damage'
    if (attacker.getRole() === 'player') {
      if (!this.config.fuChouChooseHandler) {
        choice = 'damage'
      } else {
        choice = await this.config.fuChouChooseHandler(this, attacker, hand)
      }
    } else {
      // AI: 优先弃2张手牌保命
      choice = 'discard'
    }

    if (choice === 'damage') {
      this.emitSkillTrigger(victim, '复仇', '来源选择掉1血')
      await this.applyFuChouDamage(victim, attacker)
      return
    }

    // 5. 弃牌: 玩家选2张, AI 随机
    let pickedIds: string[]
    if (attacker.getRole() === 'player') {
      if (this.config.fuChouPickHandler) {
        pickedIds = await this.config.fuChouPickHandler(this, attacker, hand)
      } else {
        pickedIds = hand.slice(0, 2).map(c => c.id)
      }
    } else {
      pickedIds = hand.slice(0, 2).map(c => c.id)
    }
    if (pickedIds.length < 2) pickedIds = hand.slice(0, 2).map(c => c.id)
    const removed: Card[] = []
    for (const id of pickedIds.slice(0, 2)) {
      const c = this.removeHandCard(attacker, id)
      if (c) removed.push(c)
    }
    if (removed.length > 0) this.cardDeck.discard(removed)
    this.emitSkillTrigger(victim, '复仇', `来源弃${removed.length}张手牌`)
  }

  private async applyFuChouDamage(victim: Player, attacker: Player): Promise<void> {
    // 曼舞: 反弹的伤害, attacker 有曼舞可转移
    if (await this.promptManWu(attacker, victim, 1)) {
      this.emitSkillTrigger(victim, '复仇', '反弹被转移')
      return
    }
    // 走统一伤害处理 (含濒死救援). skipOnDamageReceived避免attacker死后再次触发复仇死循环
    await this.applyDamage(victim, attacker, 1, undefined, { skipOnDamageReceived: true })
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
    // 走统一伤害处理 (含濒死救援)
    await this.applyDamage(source, loser, damage)
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

  /** 同阵营判定: player/ally 是一方, enemy 是另一方 */
  isSameSide(a: Player, b: Player): boolean {
    const aFriendly = a.getRole() !== 'enemy'
    const bFriendly = b.getRole() !== 'enemy'
    return aFriendly === bFriendly
  }

  /**
   * 濒死救援阶段: 当某玩家HP≤0时, 进入濒死
   * - 鸩杀: 吕雉可先用【药】让目标立即阵亡 (先发制人)
   * - 救援: 仅询问濒死者的友方, 从濒死者开始顺时针, 每个友方可选择用【药】救 (每人可弃任意张药)
   * - 诀别: 若濒死者是虞姬且未获救, 询问指定继承男性
   * - 返回 true = 已救活 (HP>0); false = 未救活 (将阵亡, 由调用方emit die)
   */
  async rescueDyingPlayer(dyingTarget: Player): Promise<boolean> {
    if (dyingTarget.getCurrentHp() > 0 || !dyingTarget.isAlive()) return true
    this.eventBus.emit({ type: 'dying', sourceHeroId: dyingTarget.getId(), data: {} })

    // 1. 鸩杀: 吕雉是否先发制人
    await this.promptZhenSha(dyingTarget)
    if (dyingTarget.getCurrentHp() > 0) return true
    if (!dyingTarget.isAlive()) return false

    // 2. 仅询问濒死者的友方 (同阵营): 从濒死者开始顺时针, 每个友方可弃药救人
    const friends = this.players.filter(p =>
      (p.isAlive() || p.getId() === dyingTarget.getId()) && this.isSameSide(p, dyingTarget)
    )
    const startIdx = friends.findIndex(p => p.getId() === dyingTarget.getId())
    if (startIdx < 0) return false
    for (let i = 0; i < friends.length; i++) {
      if (dyingTarget.getCurrentHp() > 0) break
      const savior = friends[(startIdx + i) % friends.length]
      const yaoHandCards = savior.getHand().filter(c => c.name === '药')
      // 回春: 扁鹊的红桃手牌或装备也可当药 (救援场景下不限制"回合外"条件)
      const hasHuiChun = savior.hasSkillOrTreasure('hui-chun')
      const huiChunCards: Card[] = hasHuiChun
        ? [
          ...savior.getHand().filter(c => c.suit === 'heart'),
          ...['weapon', 'armor', 'attackMount', 'defenseMount']
            .map(s => savior.getEquippedCard(s as any))
            .filter((c): c is Card => !!c && c.suit === 'heart'),
        ]
        : []
      const allRescueCards = [...yaoHandCards, ...huiChunCards]
      if (allRescueCards.length === 0) continue

      let cardIds: string[] = []
      if (savior.getRole() === 'player' && this.config.dyingRescueHandler) {
        cardIds = (await this.config.dyingRescueHandler(this, savior, dyingTarget, allRescueCards)) ?? []
      } else if (yaoHandCards.length > 0) {
        // AI 友方: 自动弃1张药救 (优先用药, 回春卡当备选)
        cardIds = [yaoHandCards[0].id]
      } else if (huiChunCards.length > 0) {
        cardIds = [huiChunCards[0].id]
      }

      if (cardIds.length > 0) {
        this.useYaoToSave(savior, dyingTarget, cardIds)
      }
    }

    if (dyingTarget.getCurrentHp() > 0) return true

    // 3. 诀别: 虞姬濒死时指定继承男性
    if (dyingTarget.hero.hero.id === 'yu-ji' && !this.jueBieTarget) {
      await this.promptJueBieTarget(dyingTarget)
    }
    return false
  }

  /** 用药救濒死目标: 救者弃药 (或扁鹊的红桃回春卡), 给目标回血 */
  useYaoToSave(savior: Player, target: Player, cardIds: string[]): void {
    let usedCount = 0
    const hasHuiChun = savior.hasSkillOrTreasure('hui-chun')
    for (const cardId of cardIds) {
      // 先尝试手牌 (药 或 回春用的红桃)
      let card: Card | undefined = savior.getHand().find(c => c.id === cardId)
      let fromEquipment = false
      let equipmentSlot: EquipmentSlot | null = null
      if (!card) {
        // 尝试装备区 (回春用的红桃装备)
        for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
          const eq = savior.getEquippedCard(slot)
          if (eq && eq.id === cardId) {
            card = eq
            fromEquipment = true
            equipmentSlot = slot
            break
          }
        }
      }
      if (!card) continue
      // 校验: 药 或 (回春 + 红桃)
      const valid = card.name === '药' || (hasHuiChun && card.suit === 'heart')
      if (!valid) continue

      if (fromEquipment && equipmentSlot) {
        const removed = savior.unequip(equipmentSlot)
        if (removed) {
          this.cardDeck.discard([removed])
          this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: savior.getId(), data: { cardId: removed.id, slot: equipmentSlot } })
        }
      } else {
        this.removeHandCard(savior, cardId)
        this.cardDeck.discard([card])
      }
      const healed = target.heal(1)
      if (healed > 0) {
        this.eventBus.emit({
          type: 'heal',
          sourceHeroId: target.getId(),
          data: { amount: healed, from: savior.getId(), reason: 'dying-rescue' },
        })
        usedCount++
      }
    }
    if (usedCount > 0) {
      this.emitSkillTrigger(savior, '救援', `用${usedCount}张【药】救${target.getName()}`)
    }
  }

  /**
   * 统一伤害处理: takeDamage → damage events → 濒死救援 → onDamageReceived → 死亡判定
   * @param skipOnDamageReceived 复仇反弹等场景不需要触发 onDamageReceived (避免死循环)
   * @param afterOnDamageReceived 杀伤害额外逻辑 (强化/吸血/伤之仇等)
   * @param sourceAction 伤害来源的"有效牌型" (kill/dodge/scheme/judge/...) — 武圣/傲剑把红牌当杀时, sourceCard.name != '杀', 用此字段补刀/补杀等技能判断
   */
  async applyDamage(
    attacker: Player,
    defender: Player,
    damage: number,
    sourceCard?: Card,
    options?: {
      skipOnDamageReceived?: boolean
      afterOnDamageReceived?: () => Promise<void>
      sourceAction?: 'kill' | 'dodge' | 'scheme' | 'judge' | 'mount' | string
    }
  ): Promise<void> {
    const actual = defender.takeDamage(damage)
    if (actual <= 0) return

    this.eventBus.emit({
      type: 'damage:deal',
      sourceHeroId: attacker.getId(),
      targetHeroId: defender.getId(),
      data: { damage: actual, sourceAction: options?.sourceAction },
    })
    this.eventBus.emit({
      type: 'damage:receive',
      sourceHeroId: defender.getId(),
      data: { damage: actual, from: attacker.getId(), sourceAction: options?.sourceAction },
    })

    // 濒死救援: 若HP≤0, 进入濒死阶段
    if (!defender.isAlive()) {
      const saved = await this.rescueDyingPlayer(defender)
      if (!saved) {
        this.eventBus.emit({
          type: 'die',
          sourceHeroId: defender.getId(),
          data: { killedBy: attacker.getId() },
        })
        return
      }
    }

    if (!options?.skipOnDamageReceived) {
      await this.onDamageReceived(defender, attacker, sourceCard, options?.sourceAction)
    }

    if (options?.afterOnDamageReceived) {
      await options.afterOnDamageReceived()
    }

    if (!defender.isAlive()) {
      this.eventBus.emit({
        type: 'die',
        sourceHeroId: defender.getId(),
        data: { killedBy: attacker.getId() },
      })
    }
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
    // 三板斧: 程咬金出杀时询问是否发动 (主动技, 限1次/回合)
    if (player.hasSkillOrTreasure('san-ban-fu') && player.getSkillUseCount('san-ban-fu') === 0) {
      let useSanBanFu = true
      if (player.getRole() === 'player' && this.config.sanBanFuHandler) {
        useSanBanFu = await this.config.sanBanFuHandler(this, player, target)
      }
      if (useSanBanFu && player.useSkill('san-ban-fu')) {
        await this.executeSanBanFuKill(player, target, killCard)
        if (!this.hasUnlimitedKill(player)) {
          this.killsUsedThisTurn++
          this.killUsedThisTurn = true
          player.setUsedKillThisTurn(true)
        }
        return
      }
    }
    await this.executeKill(player, target, killCard)
    if (!this.hasUnlimitedKill(player)) {
      this.killsUsedThisTurn++
      this.killUsedThisTurn = true
      player.setUsedKillThisTurn(true)
    }
  }

  /**
   * 三板斧: 程咬金对其他角色出【杀】特殊结算
   * - 目标出0闪: 目标掉2血, 程咬金弃1张手牌
   * - 目标出1闪: 双方各掉1血
   * - 目标出2闪: 程咬金自己掉1血
   */
  private async executeSanBanFuKill(attacker: Player, defender: Player, killCard: Card): Promise<void> {
    if (!attacker.isAlive() || !defender.isAlive()) return
    this.removeCardFromPlayer(attacker, killCard)
    this.eventBus.emit({
      type: 'card:play',
      sourceHeroId: attacker.getId(),
      targetHeroId: defender.getId(),
      data: { cardId: killCard.id, cardName: '杀', usedAsSkill: '三板斧' },
    })
    this.emitSkillTrigger(attacker, '三板斧', `对${defender.getName()}出杀`)
    this.lastPlayedCardName = '杀'

    // 让defender打0-2张闪 (自愿)
    let dodgeCount = 0
    for (let i = 0; i < 2; i++) {
      const dodgeCard = await this.promptResponseDodge(defender, attacker.getId(), '三板斧')
      if (!dodgeCard) break
      this.removeHandCard(defender, dodgeCard.id)
      this.cardDeck.discard([dodgeCard])
      this.eventBus.emit({ type: 'damage:prevent', sourceHeroId: defender.getId(), data: { cardId: dodgeCard.id } })
      if (dodgeCard.name === '闪') await this.triggerHouZhu(defender)
      if (defender.hasSkillOrTreasure('tu-qiang')) {
        const drawn = this.cardDeck.draw(1)
        defender.drawCards(drawn)
        this.emitSkillTrigger(defender, '图强', '打出闪摸一张')
      }
      if (this.rollSubTreasure(defender, 'treasure-qing-ling')) {
        const drawn = this.cardDeck.draw(1)
        defender.drawCards(drawn)
        this.emitSkillTrigger(defender, '轻灵', '出闪后摸1张')
      }
      dodgeCount++
    }

    if (dodgeCount === 0) {
      // 目标掉2血, 程咬金弃1张手牌
      await this.applyDamageWithManWu(defender, attacker, 2, killCard)
      if (attacker.isAlive() && attacker.getHand().length > 0) {
        let discardId: string | null = null
        if (attacker.getRole() === 'player' && this.config.discardPickHandler) {
          const picks = await this.config.discardPickHandler(this, attacker, attacker.getHand(), 1)
          discardId = picks?.[0] ?? null
        }
        if (!discardId) discardId = attacker.getHand()[0].id
        const discarded = this.removeHandCard(attacker, discardId)
        if (discarded) {
          this.cardDeck.discard([discarded])
          this.eventBus.emit({ type: 'card:discard', sourceHeroId: attacker.getId(), data: { cards: [discarded.id], reason: '三板斧' } })
        }
      }
    } else if (dodgeCount === 1) {
      // 双方各掉1血
      await this.applyDamageWithManWu(defender, attacker, 1, killCard)
      if (defender.isAlive() && attacker.isAlive()) {
        await this.applyDamageWithManWu(attacker, defender, 1, killCard)
      }
    } else {
      // 2闪: 程咬金自己掉1血
      await this.applyDamageWithManWu(attacker, defender, 1, killCard, 'kill')
    }
  }

  /** 应用伤害并触发受击效果 (含曼舞, 含濒死救援) */
  private async applyDamageWithManWu(victim: Player, attacker: Player, damage: number, sourceCard?: Card, sourceAction?: string): Promise<void> {
    if (this.zuijiuActive) { damage += 1; this.zuijiuActive = false }
    if (await this.promptManWu(victim, attacker, damage)) return
    await this.applyDamage(attacker, victim, damage, sourceCard, sourceAction ? { sourceAction } : undefined)
  }

  /**
   * 补刀: 关羽对受害角色出杀, 若造成伤害则继续出杀
   * 不消耗回合杀次数, 但每张杀会单独走executeKill完整流程
   */
  private async executeBuDao(guanYu: Player, victim: Player): Promise<void> {
    let continueKill = true
    while (continueKill && guanYu.isAlive() && victim.isAlive()) {
      if (!this.isInAttackRange(guanYu, victim)) break
      // 玩家: 询问是否补刀 + 选卡; AI: 自动
      let killCardId: string | null = null
      if (guanYu.getRole() === 'player' && this.config.buDaoHandler) {
        killCardId = await this.config.buDaoHandler(this, guanYu, victim)
      } else if (guanYu.getRole() !== 'player') {
        // AI: 自动找一张可当杀的卡
        const c = guanYu.getHand().find(card => this.canUseAsKill(card, guanYu))
        killCardId = c?.id ?? null
      }
      if (!killCardId) break
      const killCard = guanYu.getHand().find(c => c.id === killCardId)
        ?? guanYu.getEquippedCard('weapon')
        ?? guanYu.getEquippedCard('armor')
        ?? guanYu.getEquippedCard('attackMount')
        ?? guanYu.getEquippedCard('defenseMount')
      if (!killCard) break
      this.emitSkillTrigger(guanYu, '补刀', `对${victim.getName()}补刀 使用了【杀】`)
      const beforeHp = victim.getCurrentHp()
      await this.executeKill(guanYu, victim, killCard)
      // 闪后(afterHp == beforeHp, 无伤害)立即结束补刀链; 造成伤害才继续
      const afterHp = victim.getCurrentHp()
      if (afterHp >= beforeHp) break
    }
  }

  /**
   * 侠胆/狼牙棒: 一张杀指定多个目标(每张最多 maxTargets 个)
   * 侠胆胜出期间无视距离限制, 狼牙棒按正常距离; 一次多杀只消耗一次杀次数
   * 注: 复用狼牙棒的多目标模式 — 首次真实从手牌移除, 后续以同一 cardId 引用作用于其他目标
   */
  async playerPlayKillMulti(player: Player, cardId: string, targetIds: string[], maxTargetsOverride?: number): Promise<void> {
    if (this.xiaDanLossThisTurn.has(player.getId())) return
    const maxTargets = maxTargetsOverride ?? this.xiaDanMultiTargetPerKill
    // 触发条件: 侠胆胜出(xiaDanMultiTargetPerKill>1) OR 狼牙棒最后一杀 (maxTargetsOverride 由调用方保证)
    if (maxTargets <= 1 && !maxTargetsOverride) return
    let killCard = player.getHand().find(c => c.id === cardId)
    if (!killCard) {
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = player.getEquippedCard(slot)
        if (eq && eq.id === cardId) { killCard = eq; break }
      }
    }
    if (!killCard || !this.canUseAsKill(killCard, player)) return
    const ignoreRange = this.xiaDanMultiTargetPerKill > 1  // 侠胆胜出期间无视距离限制
    // 限定: 目标数 ≤ maxTargets
    const limited = targetIds.slice(0, maxTargets)
    for (const tid of limited) {
      const target = this.players.find(p => p.getId() === tid)
      if (!target || !target.isAlive()) continue
      if (!ignoreRange && !this.isInAttackRange(player, target)) continue
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
      await this.executeFudiChouXin(player, targetId, card)
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
      for (const target of this.players) {
        if (target.getId() === player.getId()) continue
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
            await this.applyDamage(player, target, damage, card)
          }
        }
      }
      if (langYanBoost) this.emitSkillTrigger(player, '狼烟', '烽火狼烟伤害+1')
    } else if (card.name === '万箭齐发') {
      let wanJianBoost = false
      if (this.rollSubTreasure(player, 'treasure-wan-jian')) wanJianBoost = true
      for (const target of this.players) {
        if (target.getId() === player.getId()) continue
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
          if (dodgeCard.name === '闪') await this.triggerHouZhu(target)
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
            await this.applyDamage(player, target, damage, card)
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

  /** 回春: 扁鹊在自己回合外用红桃手牌或装备当药 */
  playerHuiChunHeal(player: Player, cardId: string): void {
    if (!player.hasSkillOrTreasure('hui-chun')) return
    // 只能在回合外使用
    if (this.players[this.currentPlayerIndex]?.getId() === player.getId()) return
    if (player.getCurrentHp() >= player.getMaxHp()) return

    // 找卡 (手牌或装备)
    let card: Card | undefined
    let fromEquipment = false
    let equipmentSlot: EquipmentSlot | null = null
    card = player.getHand().find(c => c.id === cardId)
    if (!card) {
      for (const slot of ['weapon', 'armor', 'attackMount', 'defenseMount'] as const) {
        const eq = player.getEquippedCard(slot)
        if (eq && eq.id === cardId) {
          card = eq
          fromEquipment = true
          equipmentSlot = slot
          break
        }
      }
    }
    if (!card || card.suit !== 'heart') return

    // 弃卡
    if (fromEquipment && equipmentSlot) {
      const removed = player.unequip(equipmentSlot)
      if (removed) {
        this.cardDeck.discard([removed])
        this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: player.getId(), data: { cardId: removed.id, slot: equipmentSlot } })
      }
    } else {
      this.removeHandCard(player, cardId)
      this.cardDeck.discard([card])
    }

    // 治疗
    let healAmount = 1
    if (this.rollSubTreasure(player, 'yi-xin')) {
      healAmount += 1
      this.emitSkillTrigger(player, '医心', '治疗+1')
    }
    player.heal(healAmount)
    this.eventBus.emit({ type: 'heal', sourceHeroId: player.getId(), data: { amount: healAmount } })
    this.emitSkillTrigger(player, '回春', `用${card.name}当药`)
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

  /** 釜底抽薪: 选1个目标, 让其弃1张牌 (手牌/装备/判定) */
  private async executeFudiChouXin(player: Player, targetId?: string, srcCard?: Card): Promise<void> {
    const card: Card = srcCard ?? { id: 'fudi-virtual', suit: 'spade', number: 1, type: 'scheme', name: '釜底抽薪' } as Card
    let target = targetId ? this.players.find(p => p.getId() === targetId) : undefined
    if (!target && this.config.fudiTargetHandler) {
      const candidates = this.getEnemies(player).filter(p =>
        p.isAlive() &&
        this.canBeSchemeTarget(p, card) &&
        // 控局: 手牌数<体力上限时免疫釜底抽薪
        !(p.hasSkillOrTreasure('kong-ju') && p.getHandSize() < p.getMaxHp()) &&
        // 必须有可弃的牌 (手牌/装备/判定区)
        (p.getHandSize() > 0 || this.collectEquipmentCards(p).length > 0 || p.getJudgeCards().length > 0)
      )
      if (candidates.length === 0) return
      const chosenId = await this.config.fudiTargetHandler(this, player, candidates)
      if (!chosenId) return
      target = this.players.find(p => p.getId() === chosenId)
    }
    if (!target) return
    if (!this.canBeSchemeTarget(target, card)) {
      this.emitSkillTrigger(target, '洞察', `免疫黑桃锦囊-釜底抽薪失效`)
      return
    }
    if (this.isKongJuImmuneTo(target, '釜底抽薪')) {
      this.emitSkillTrigger(target, '控局', `免疫釜底抽薪`)
      return
    }
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
      if (target.getHandSize() > 0) pickedId = target.getHand()[0].id
      else {
        const eqs = this.collectEquipmentCards(target)
        if (eqs.length > 0) pickedId = eqs[0].id
        else if (target.getJudgeCards().length > 0) pickedId = target.getJudgeCards()[0].id
      }
    }
    if (pickedId) this.discardCardFromTarget(target, pickedId, '釜底抽薪')
  }

  private async executeFengHuoLangYan(player: Player): Promise<void> {
    let langYanBoost = false
    if (this.rollSubTreasure(player, 'treasure-lang-yan')) langYanBoost = true
    // 烽火狼烟 card 引用(用于 canBeSchemeTarget)
    const fengHuoCard: Card = { id: 'fhly-virtual', suit: 'spade', number: 1, type: 'scheme', name: '烽火狼烟' } as Card
    for (const target of this.players) {
      if (target.getId() === player.getId()) continue
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
        await this.applyDamage(player, target, damage, fengHuoCard)
      }
    }
    if (langYanBoost) this.emitSkillTrigger(player, '狼烟', '烽火狼烟伤害+1')
  }

  /** 起义: 放弃摸牌, 改为从至多2名其他角色各获得1张手牌 */
  playerQiYi(player: Player, targetIds: string[], targetCardIds?: Record<string, string>): void {
    if (!player.hasSkillOrTreasure('qi-yi')) return
    if (!player.useSkill('qi-yi')) return
    if (targetIds.length === 0 || targetIds.length > 2) return
    this.skipDrawThisTurn = true
    for (const tid of targetIds) {
      const target = this.getPlayerById(tid)
      if (!target || !target.isAlive()) continue
      const hand = target.getHand()
      if (hand.length === 0) continue
      let stolen: Card | undefined
      // 若指定了cardId, 从该target的手牌里取对应的那张
      const specifiedId = targetCardIds?.[tid]
      if (specifiedId) {
        stolen = hand.find(c => c.id === specifiedId)
      }
      if (!stolen) stolen = hand[Math.floor(Math.random() * hand.length)]
      this.removeHandCard(target,stolen.id)
      player.drawCards([stolen])
      this.emitSkillTrigger(player, '起义', `从${target.getName()}获取${stolen.name}`)
    }
  }

  /** 释权: 将1张黑色手牌或装备区的牌当作【釜底抽薪】使用 */
  async playerShiQuan(player: Player, cardId: string): Promise<void> {
    if (!player.hasSkillOrTreasure('shi-quan')) return
    // 找卡: 手牌(黑色) 或 装备区任意
    const slots: EquipmentSlot[] = ['weapon', 'armor', 'attackMount', 'defenseMount']
    let card: Card | undefined = player.getHand().find(c => c.id === cardId && isBlackSuit(c.suit))
    let fromEquipSlot: EquipmentSlot | null = null
    if (!card) {
      for (const s of slots) {
        const eq = player.getEquippedCard(s)
        if (eq && eq.id === cardId) { card = eq; fromEquipSlot = s; break }
      }
    }
    if (!card) return
    // 弃牌/卸装备
    let qianKunDaiLost = false
    if (fromEquipSlot) {
      if (card.name === '乾坤袋') qianKunDaiLost = true
      player.unequip(fromEquipSlot)
      this.eventBus.emit({ type: 'equipment:unequip', sourceHeroId: player.getId(), data: { cardId, slot: fromEquipSlot } })
    } else {
      this.removeHandCard(player, card.id)
    }
    this.cardDeck.discard([card])
    this.emitSkillTrigger(player, '释权', `将${card.name}当釜底抽薪使用`)
    this.eventBus.emit({
      type: 'card:play',
      sourceHeroId: player.getId(),
      data: { cardId: card.id, cardName: '釜底抽薪', usedAsSkill: '释权' },
    })
    await this.executeFudiChouXin(player)
    // 妙计: 使用锦囊摸1张
    if (player.hasSkillOrTreasure('miao-ji')) {
      const drawn = this.cardDeck.draw(1)
      if (drawn.length > 0) {
        player.drawCards(drawn)
        this.emitSkillTrigger(player, '妙计', '使用锦囊摸1张')
      }
    }
    // 乾坤袋被弃 → 摸1张
    if (qianKunDaiLost) {
      const drawn = this.cardDeck.draw(1)
      if (drawn.length > 0) {
        player.drawCards(drawn)
        this.emitSkillTrigger(player, '乾坤袋', '装备丢失-摸1张')
      }
    }
    this.lastPlayedCardName = '釜底抽薪'
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
      await this.applyDamage(player, player, 1, undefined, { skipOnDamageReceived: true })
      if (!player.isAlive()) return
    }
    // 曼舞: 目标有曼舞可转移绝击伤害
    if (await this.promptManWu(target, player, 1)) {
      // 伤害已转移
    } else {
      await this.applyDamage(player, target, 1, undefined, { skipOnDamageReceived: true })
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
   * 流程: 双方同时选牌 (玩家通过 xiaDanPlayerCardHandler, 目标通过 pinDianHandler / AI 按角色选牌策略),
   *       双方都选完后系统同时揭示并比较: 玩家点数 >= 目标点数 即胜, 否则本回合不能出杀
   * AI 选牌策略: 敌方选最大牌(求胜), 友方选最小牌(让玩家赢)
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

    // 双方同时选牌 (玩家: xiaDanPlayerCardHandler; 目标: pinDianHandler 或 AI 按角色选牌策略)
    const targetPickPromise = (async (): Promise<Card | null> => {
      if (this.config.pinDianHandler) {
        const cid = await this.config.pinDianHandler(this, target, player, '侠胆')
        if (cid) return target.getHand().find(c => c.id === cid) ?? null
      }
      // AI: 敌方选最大牌(求胜, 不让玩家拼点成功), 友方选最小牌(让玩家赢)
      const sorted = [...target.getHand()].sort((a, b) => a.number - b.number)
      return (target.getRole() === 'enemy' ? sorted[sorted.length - 1] : sorted[0]) ?? null
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
      // 胜: 侠胆成功
      //  - 杀次数 +1 (天狼/虎符的无限杀不受影响)
      //  - 本回合所有杀可指定最多2个目标, 无视距离
      if (!this.hasUnlimitedKill(player)) {
        this.killsMaxThisTurn += 1
      }
      this.xiaDanMultiTargetPerKill = 2
      this.emitSkillTrigger(player, '侠胆', '拼点胜-本回合每张杀可指定2目标(无视距离), 杀次数+1')
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
    const range = player.getSchemeRange()
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
