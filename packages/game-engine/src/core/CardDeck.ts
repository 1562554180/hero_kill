import type { Card } from '@hero-legend/shared-types'

export class CardDeck {
  private drawPile: Card[] = []
  private discardPile: Card[] = []
  /** [DEBUG] 全部抽到的牌强制变♣ (神偷测试用) */
  private forceClubSuit = false

  constructor(cards: Card[]) {
    this.drawPile = [...cards]
    this.shuffle()
  }

  /** [DEBUG] 开启: 之后所有抽到的牌 suit 都改为 club */
  enableForceClubSuit(): void {
    this.forceClubSuit = true
  }

  /** [DEBUG] 关闭 */
  disableForceClubSuit(): void {
    this.forceClubSuit = false
  }

  shuffle(): void {
    for (let i = this.drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[this.drawPile[i], this.drawPile[j]] = [this.drawPile[j], this.drawPile[i]]
    }
  }

  draw(count: number): Card[] {
    const drawn: Card[] = []
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        this.reshuffleDiscard()
      }
      if (this.drawPile.length === 0) break
      const card = this.drawPile.pop()!
      drawn.push(this.forceClubSuit ? { ...card, suit: 'club' as const } : card)
    }
    return drawn
  }

  discard(cards: Card[]): void {
    this.discardPile.push(...cards)
  }

  /** 从弃牌堆中按 id 拿走一张指定的牌 (集权需要) */
  takeFromDiscard(cardId: string): Card | null {
    const idx = this.discardPile.findIndex(c => c.id === cardId)
    if (idx === -1) return null
    return this.discardPile.splice(idx, 1)[0]
  }

  /** 把牌放到牌堆顶或底 (东方朔 词赋 使用). where: 'top' = 下一张抽到, 'bottom' = 最后才抽到 */
  placeOnTopOrBottom(card: Card, where: 'top' | 'bottom'): void {
    if (where === 'top') {
      this.drawPile.push(card)
    } else {
      this.drawPile.unshift(card)
    }
  }

  discardById(cardIds: string[], hand: Card[]): Card[] {
    const discarded: Card[] = []
    for (const id of cardIds) {
      const idx = hand.findIndex(c => c.id === id)
      if (idx !== -1) {
        const card = hand.splice(idx, 1)[0]
        discarded.push(card)
      }
    }
    this.discardPile.push(...discarded)
    return discarded
  }

  peek(): Card | undefined {
    if (this.drawPile.length === 0) this.reshuffleDiscard()
    return this.drawPile[this.drawPile.length - 1]
  }

  getDrawPileSize(): number {
    return this.drawPile.length
  }

  getDiscardPileSize(): number {
    return this.discardPile.length
  }

  private reshuffleDiscard(): void {
    if (this.discardPile.length === 0) return
    this.drawPile = [...this.discardPile]
    this.discardPile = []
    this.shuffle()
  }
}
