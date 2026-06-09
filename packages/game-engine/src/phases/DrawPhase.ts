import type { PhaseType } from '@hero-legend/shared-types'
import { Phase } from './Phase.js'

export class DrawPhase extends Phase {
  readonly type: PhaseType = 'draw'

  async execute(context: any): Promise<any> {
    const { player, cardDeck, eventBus, game } = context

    // 醉酒: 可选择少摸一张，本回合杀/决斗伤害+1
    let drawCount = 2
    if (player.hasSkillOrTreasure('bing-xian')) {
      drawCount = 3
      game.emitSkillTrigger(player, '兵仙', '摸牌阶段摸3张')
    }

    const cards = cardDeck.draw(drawCount)
    player.drawCards(cards)

    eventBus.emit({
      type: 'card:draw',
      sourceHeroId: player.getId(),
      data: { count: drawCount, cards: cards.map((c: any) => c.id) },
    })

    return { completed: true, actions: [{ type: 'draw', data: { heroId: player.getId(), count: drawCount } }] }
  }
}
