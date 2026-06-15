import { Phase } from './Phase.js'
import type { Card } from '@hero-legend/shared-types'

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
      let discardIds: string[] = []

      if (player.getRole() === 'player' && (game as any).config.discardPickHandler) {
        // 玩家: 通过 UI 选择要弃的牌
        discardIds = await (game as any).config.discardPickHandler(game, player, player.getHand(), discardCount)
      } else {
        // AI: 自动弃手牌末尾的牌
        const hand = player.getHand()
        discardIds = hand.slice(-discardCount).map((c: Card) => c.id)
      }

      const discarded: Card[] = []
      for (const cid of discardIds) {
        const card = player.removeCard(cid)
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
