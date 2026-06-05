import { Phase } from './Phase.js'

export class JudgePhase extends Phase {
  readonly type = 'judge' as const

  async execute(context: any): Promise<any> {
    const { player, cardDeck, eventBus } = context
    const actions = []

    // 处理判定区的延时锦囊
    if (player.hero.judgeCards.length > 0) {
      const judgeCardIds = [...player.hero.judgeCards]
      player.hero.judgeCards = []

      for (const cardId of judgeCardIds) {
        const judgeCard = cardDeck.peek()
        if (judgeCard) {
          cardDeck.draw(1)
          eventBus.emit({
            type: 'judge',
            sourceHeroId: player.getId(),
            data: { judgeCardId: cardId, resultCard: judgeCard.id },
          })
          actions.push({ type: 'judge', data: { heroId: player.getId(), cardId, resultCard: judgeCard.id } })
        }
      }
    }

    return { completed: true, actions }
  }
}
