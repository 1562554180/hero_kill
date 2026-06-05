import { Phase } from './Phase.js'

export class DiscardPhase extends Phase {
  readonly type = 'discard' as const

  async execute(context: any): Promise<any> {
    const { player, cardDeck, eventBus } = context
    const handLimit = player.getHandLimit()
    const handSize = player.getHandSize()
    const actions = []

    if (handSize > handLimit) {
      // 需要弃牌 - 在完整实现中这里需要等待玩家选择
      // 目前自动弃掉多余的牌（优先弃价值低的）
      const discardCount = handSize - handLimit
      const discarded = []
      for (let i = 0; i < discardCount; i++) {
        const hand = player.getHand()
        if (hand.length === 0) break
        // 简单策略：弃最后一张
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
