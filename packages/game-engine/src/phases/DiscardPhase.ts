import { Phase } from './Phase.js'

export class DiscardPhase extends Phase {
  readonly type = 'discard' as const

  async execute(context: any): Promise<any> {
    const { player, cardDeck, eventBus, game } = context
    const handLimit = player.getHandLimit()
    const handSize = player.getHandSize()

    // 隐忍: 出牌阶段没出过杀，不用弃牌
    if (player.hasSkillOrTreasure('yin-ren') && !player.hasUsedKillThisTurn()) {
      return { completed: true, actions: [] }
    }

    // 控局: 手牌数≤体力值不用弃牌
    if (player.hasSkillOrTreasure('kong-ju') && handSize <= handLimit) {
      return { completed: true, actions: [] }
    }

    const actions = []
    if (handSize > handLimit) {
      const discardCount = handSize - handLimit
      const discarded = []
      for (let i = 0; i < discardCount; i++) {
        const hand = player.getHand()
        if (hand.length === 0) break
        const card = player.removeCard(hand[hand.length - 1].id)
        if (card) {
          cardDeck.discard([card])
          discarded.push(card)
        }
      }
      if (discarded.length > 0) {
        eventBus.emit({
          type: 'card:discard',
          sourceHeroId: player.getId(),
          data: { cards: discarded.map(c => c.id) },
        })
        actions.push({ type: 'discard', data: { heroId: player.getId(), cards: discarded.map(c => c.id) } })
      }
    }

    return { completed: true, actions }
  }
}
