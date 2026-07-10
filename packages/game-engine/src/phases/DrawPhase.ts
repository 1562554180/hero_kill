import type { PhaseType } from '@hero-legend/shared-types'
import { Phase } from './Phase.js'

export class DrawPhase extends Phase {
  readonly type: PhaseType = 'draw'

  async execute(context: any): Promise<any> {
    const { player, cardDeck, eventBus, game } = context

    // 起义: 放弃本回合摸牌 (playerQiYi 已设置此标志)
    if ((game as any).skipDrawThisTurn) {
      ;(game as any).skipDrawThisTurn = false
      game.emitSkillTrigger(player, '起义', '放弃摸牌')
      return { completed: true, actions: [] }
    }

    // 布道 (张三丰): 摸牌阶段可摸3张, 然后将其中1张交给任意一名角色
    // 不受画地为牢影响 (画地为牢跳过出牌阶段, 摸牌照常进行, 同理布道生效)
    // 受南蛮/天命生效后跳过摸牌的影响: 跳到此处时 skipDrawThisTurn 已被设置
    if (player.hasSkillOrTreasure('bu-dao')) {
      const drawn = cardDeck.draw(3)
      player.drawCards(drawn)
      eventBus.emit({
        type: 'card:draw',
        sourceHeroId: player.getId(),
        data: { count: 3, reason: '布道', cards: drawn.map((c: any) => c.id) },
      })
      game.emitSkillTrigger(player, '布道', '摸3张')

      // 询问给牌: 玩家调 handler; AI 选血量最低的队友
      let give: { targetId: string; cardId: string } | null = null
      if (player.getRole() === 'player' && (game as any).config?.buDao3GiveHandler) {
        give = await (game as any).config.buDao3GiveHandler({
          zhangSanFengId: player.getId(),
          candidateIds: game.getAlivePlayers().filter((p: any) => p.getId() !== player.getId()).map((p: any) => p.getId()),
          drawn,
        })
      } else if (player.getRole() !== 'player') {
        // AI: 给血量最低的队友 (玩家/友军优先), 否则给任意其他角色
        const allies = game.getAlivePlayers().filter((p: any) =>
          p.getId() !== player.getId() && (p.getRole() === player.getRole() ||
            (player.getRole() === 'ally' && p.getRole() === 'player') ||
            (player.getRole() === 'player' && p.getRole() === 'ally'))
        )
        const target = allies.length > 0
          ? allies.sort((a: any, b: any) => a.getCurrentHp() - b.getCurrentHp())[0]
          : game.getAlivePlayers().find((p: any) => p.getId() !== player.getId())
        if (target && drawn.length > 0) {
          // 优先给锦囊/装备, 杀/闪最有用
          const priority = (c: any) => {
            if (c.name === '杀' || c.name === '闪') return 3
            if (c.type === 'equipment') return 1
            if (c.type === 'scheme') return 0
            return 2
          }
          const sorted = [...drawn].sort((a, b) => priority(a) - priority(b))
          give = { targetId: target.getId(), cardId: sorted[0].id }
        }
      }
      if (give) {
        const target = game.getPlayerById(give.targetId)
        const card = player.getHand().find((c: any) => c.id === give!.cardId)
        if (target && target.isAlive() && card) {
          player.removeCard(card.id)
          target.drawCards([card])
          eventBus.emit({
            type: 'card:gain',
            sourceHeroId: target.getId(),
            data: { count: 1, reason: '布道', from: player.getId(), cards: [card.id] },
          })
          game.emitSkillTrigger(player, '布道', `给${target.getName()} 1张${card.name}`)
        }
      }

      return { completed: true, actions: [{ type: 'draw', data: { heroId: player.getId(), count: 3 } }] }
    }

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
