import type {
  Card, BattleHero, Hero, HeroInstance, Role, EquipmentSlot
} from '@hero-legend/shared-types'
import { getHpByStar } from '@hero-legend/shared-types'

export class Player {
  readonly hero: BattleHero
  private handCards: Card[] = []
  private judgeAreaCards: Card[] = []  // 判定区的实际卡牌对象
  private equippedCards: Map<EquipmentSlot, Card> = new Map()
  private usedKillThisTurn = false

  constructor(hero: Hero, instance: HeroInstance, role: Role) {
    const baseHp = getHpByStar(hero.baseHp, instance.starLevel)
    const hpBonus = (instance.treasures.main ?? [])
      .filter((t): t is NonNullable<typeof t> => t != null)
      .reduce((sum, t) => sum + (t.effect?.hpBonus ?? 0), 0)
    const maxHp = baseHp + hpBonus
    this.hero = {
      instance,
      hero,
      role,
      currentHp: maxHp,
      maxHp,
      handCards: [],
      equipment: { weapon: null, attackMount: null, defenseMount: null, armor: null },
      judgeCards: [],
      statusEffects: [],
      skillUsesThisTurn: {},
    }
  }

  getId(): string { return this.hero.hero.id }
  getName(): string { return this.hero.hero.name }
  getRole(): Role { return this.hero.role }
  getCurrentHp(): number { return this.hero.currentHp }
  getMaxHp(): number { return this.hero.maxHp }
  getHand(): Card[] { return [...this.handCards] }
  getHandSize(): number { return this.handCards.length }

  getHandLimit(): number {
    let limit = this.hero.currentHp
    // 乾坤袋: 手牌上限+1
    if (this.getArmorName() === '乾坤袋') limit += 1
    // 运筹 主印: 手牌上限 +N
    const handBonus = (this.hero.instance.treasures.main ?? [])
      .filter((t): t is NonNullable<typeof t> => t != null)
      .reduce((sum, t) => sum + (t.effect?.handBonus ?? 0), 0)
    limit += handBonus
    return limit
  }

  isAlive(): boolean { return this.hero.currentHp > 0 }

  drawCards(cards: Card[]): void {
    this.handCards.push(...cards)
    this.hero.handCards = this.handCards.map(c => c.id)
  }

  removeCard(cardId: string): Card | undefined {
    const idx = this.handCards.findIndex(c => c.id === cardId)
    if (idx === -1) return undefined
    const card = this.handCards.splice(idx, 1)[0]
    this.hero.handCards = this.handCards.map(c => c.id)
    return card
  }

  getCard(cardId: string): Card | undefined {
    return this.handCards.find(c => c.id === cardId)
  }

  getCardsByType(type: Card['type']): Card[] {
    return this.handCards.filter(c => c.type === type)
  }

  takeDamage(amount: number): number {
    const actual = Math.min(amount, this.hero.currentHp)
    this.hero.currentHp -= actual
    return actual
  }

  heal(amount: number): number {
    const before = this.hero.currentHp
    this.hero.currentHp = Math.min(this.hero.maxHp, this.hero.currentHp + amount)
    return this.hero.currentHp - before
  }

  equip(card: Card, slot: EquipmentSlot): string | null {
    const old = this.hero.equipment[slot]
    this.hero.equipment[slot] = card.id
    this.equippedCards.set(slot, card)
    return old
  }

  unequip(slot: EquipmentSlot): Card | null {
    const old = this.equippedCards.get(slot) ?? null
    this.hero.equipment[slot] = null
    this.equippedCards.delete(slot)
    return old
  }

  getEquippedCard(slot: EquipmentSlot): Card | undefined {
    return this.equippedCards.get(slot)
  }

  getWeaponName(): string | undefined {
    return this.equippedCards.get('weapon')?.name
  }

  getArmorName(): string | undefined {
    const equipped = this.equippedCards.get('armor')?.name
    if (equipped) return equipped
    // 国色: 无防具时视为装备玉如意
    if (this.hasSkillOrTreasure('guo-se')) return '玉如意'
    return undefined
  }

  getAttackRange(): number {
    let range = 1
    const weapon = this.equippedCards.get('weapon')
    if (weapon) range = (weapon as any).range ?? 1
    if (this.hero.equipment.attackMount) range += 1
    // 骑射/单骑: 默认视为装备进攻马
    if (this.hasSkillOrTreasure('qi-she') || this.hasSkillOrTreasure('dan-qi')) range += 1
    // 穿杨 主印: 攻击距离 +N
    const rangeBonus = (this.hero.instance.treasures.main ?? [])
      .filter((t): t is NonNullable<typeof t> => t != null)
      .reduce((sum, t) => sum + (t.effect?.rangeBonus ?? 0), 0)
    range += rangeBonus
    return range
  }

  /** 锦囊(探囊取物)距离: 基础1+进攻马+骑射/单骑, 不含武器范围 */
  getSchemeRange(): number {
    let range = 1
    if (this.hero.equipment.attackMount) range += 1
    if (this.hasSkillOrTreasure('qi-she') || this.hasSkillOrTreasure('dan-qi')) range += 1
    return range
  }

  getDefenseRange(): number {
    let range = 0
    if (this.hero.equipment.defenseMount) range += 1
    return range
  }

  hasUsedKillThisTurn(): boolean { return this.usedKillThisTurn }
  setUsedKillThisTurn(v: boolean): void { this.usedKillThisTurn = v }

  // 判定区（延时锦囊）
  addJudgeCard(card: Card | any): void {
    this.judgeAreaCards.push(card)
    this.hero.judgeCards = this.judgeAreaCards.map(c => c.id)
  }
  removeJudgeCard(cardId: string): Card | undefined {
    const idx = this.judgeAreaCards.findIndex(c => c.id === cardId)
    if (idx === -1) return undefined
    const card = this.judgeAreaCards.splice(idx, 1)[0]
    this.hero.judgeCards = this.judgeAreaCards.map(c => c.id)
    return card
  }
  consumeNextJudgeCard(): Card | undefined {
    if (this.judgeAreaCards.length === 0) return undefined
    const card = this.judgeAreaCards.shift()!
    this.hero.judgeCards = this.judgeAreaCards.map(c => c.id)
    return card
  }
  peekJudgeCard(): Card | undefined {
    return this.judgeAreaCards[0]
  }
  getJudgeCards(): Card[] {
    return [...this.judgeAreaCards]
  }

  resetSkillUses(): void {
    this.hero.skillUsesThisTurn = {}
    this.usedKillThisTurn = false
  }

  hasSkillOrTreasure(skillId: string): boolean {
    if (this.hero.hero.skills.some(s => s.id === skillId)) return true
    const allTreasures = [
      ...this.hero.instance.treasures.main,
      ...this.hero.instance.treasures.sub,
    ]
    return allTreasures.some(t => t?.skill.id === skillId || t?.skill.id === `treasure-${skillId}`)
  }

  /** 武则天/吕雉/虞姬/李师师/小乔 视为女性英雄 (无性别字段, 硬编码) */
  isFemale(): boolean {
    const femaleHeroes = ['wu-ze-tian', 'lv-zhi', 'yu-ji', 'li-shi-shi', 'xiao-qiao']
    return femaleHeroes.includes(this.hero.hero.id)
  }

  getSkillMaxUses(skillId: string): number | undefined {
    const skill = this.hero.hero.skills.find(s => s.id === skillId)
    return skill?.maxUsesPerTurn
  }

  useSkill(skillId: string): boolean {
    const maxUses = this.getSkillMaxUses(skillId)
    if (!maxUses) return true
    const used = this.hero.skillUsesThisTurn[skillId] ?? 0
    if (used >= maxUses) return false
    this.hero.skillUsesThisTurn[skillId] = used + 1
    return true
  }

  getSkillUseCount(skillId: string): number {
    return this.hero.skillUsesThisTurn[skillId] ?? 0
  }

  getFaction(): string { return this.hero.hero.faction }

  toBattleHero(): BattleHero {
    return { ...this.hero, handCards: this.handCards.map(c => c.id) }
  }
}
