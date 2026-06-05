import type { PhaseType } from '@hero-legend/shared-types'
import { Phase } from './Phase.js'

export class DrawPhase extends Phase {
  readonly type: PhaseType = 'draw'

  async execute(context: any): Promise<any> {
    const { player, cardDeck, eventBus } = context
    const cards = cardDeck.draw(2)
    player.drawCards(cards)

    eventBus.emit({
      type: 'card:draw',
      sourceHeroId: player.getId(),
      data: { count: 2, cards: cards.map((c: any) => c.id) },
    })

    return { completed: true, actions: [{ type: 'draw', data: { heroId: player.getId(), count: 2 } }] }
  }
}
