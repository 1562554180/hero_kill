import type {
  Card, BattleHero, Hero, HeroInstance, Role, EquipmentSlot
} from '@hero-legend/shared-types'
import { getHpByStar } from '@hero-legend/shared-types'

export class Player {
  readonly hero: BattleHero
  private handCards: Card[] = []

  constructor(hero: Hero, instance: HeroInstance, role: Role) {
    const maxHp = getHpByStar(hero.baseHp, instance.starLevel)
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

  getId(): string {
    return this.hero.hero.id
  }

  getName(): string {
    return this.hero.hero.name
  }

  getRole(): Role {
    return this.hero.role
  }

  getCurrentHp(): number {
    return this.hero.currentHp
  }

  getMaxHp(): number {
    return this.hero.maxHp
  }

  getHand(): Card[] {
    return [...this.handCards]
  }

  getHandSize(): number {
    return this.handCards.length
  }

  getHandLimit(): number {
    return this.hero.currentHp
  }

  isAlive(): boolean {
    return this.hero.currentHp > 0
  }

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
    return old
  }

  unequip(slot: EquipmentSlot): string | null {
    const old = this.hero.equipment[slot]
    this.hero.equipment[slot] = null
    return old
  }

  getAttackRange(): number {
    let range = 1
    if (this.hero.equipment.weapon) range = 1 // 武器范围由卡牌定义
    return range
  }

  resetSkillUses(): void {
    this.hero.skillUsesThisTurn = {}
  }

  useSkill(skillId: string, maxUses?: number): boolean {
    if (!maxUses) return true
    const used = this.hero.skillUsesThisTurn[skillId] ?? 0
    if (used >= maxUses) return false
    this.hero.skillUsesThisTurn[skillId] = used + 1
    return true
  }

  toBattleHero(): BattleHero {
    return { ...this.hero, handCards: this.handCards.map(c => c.id) }
  }
}
