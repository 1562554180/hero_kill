import type { Card } from '@hero-legend/shared-types'

export class CardDeck {
  private drawPile: Card[] = []
  private discardPile: Card[] = []

  constructor(cards: Card[]) {
    this.drawPile = [...cards]
    this.shuffle()
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
      drawn.push(this.drawPile.pop()!)
    }
    return drawn
  }

  discard(cards: Card[]): void {
    this.discardPile.push(...cards)
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
