import { Phase } from './Phase.js'
import type { Card } from '@hero-legend/shared-types'

export class JudgePhase extends Phase {
  readonly type = 'judge' as const

  async execute(context: any): Promise<any> {
    const { player, eventBus, game } = context
    const actions = []

    // 1. 先处理手捧雷标记（链式传递）
    await this.processThunders(player, game, eventBus)

    // 2. 再处理画地为牢等延时锦囊 (手捧雷是持续标记, 由 processThunders 单独处理, 这里跳过)
    // 提取所有非手捧雷的判定牌, 处理完后再把手捧雷放回
    const toProcess: Card[] = []
    const keptThunders: Card[] = []
    while (player.getJudgeCards().length > 0) {
      const c = player.consumeNextJudgeCard()!
      if (c.name === '手捧雷') keptThunders.push(c)
      else toProcess.push(c)
    }
    // 把手捧雷放回判定区 (它们是持续标记, 等待下一回合)
    for (const t of keptThunders) player.addJudgeCard(t)

    for (const delayedCard of toProcess) {
      if (!player.isAlive()) break

      const j = await game.judge(player)
      const resultSuit = j.suit
      const resultNumber = j.card.number

      eventBus.emit({
        type: 'judge',
        sourceHeroId: player.getId(),
        data: { judgeCardId: delayedCard.id, judgeCardName: delayedCard.name, resultCard: j.card.id, resultSuit, resultNumber, phase: 'resolve' },
      })

      if (delayedCard.name === '画地为牢') {
        if (resultSuit === 'heart') {
          game.emitSkillTrigger(player, '画地为牢', '红桃-失效')
        } else {
          ;(game as any).skipCurrentTurn = true
          game.emitSkillTrigger(player, '画地为牢', '生效-跳过当前回合')
        }
      }

      actions.push({ type: 'judge', data: { heroId: player.getId(), cardId: delayedCard.id, resultSuit, resultNumber } })
    }

    return { completed: true, actions }
  }

  /**
   * 处理手捧雷标记：
   * - 玩家身上每张手捧雷都需要判定
   * - 失效 → 从当前玩家移除, 顺延给下一个存活的、没有手捧雷的玩家
   * - 生效 → 当前玩家掉3血, 标记消失
   * - 如果所有存活玩家都有雷, 失效的雷也无处可去, 标记留在当前玩家(等待下一回合)
   */
  private async processThunders(player: any, game: any, eventBus: any): Promise<void> {
    // 取出所有手捧雷标记(其他延时锦囊保留)
    const thunders: Card[] = []
    const others: Card[] = []
    for (const c of player.getJudgeCards()) {
      if (c.name === '手捧雷') thunders.push(c)
      else others.push(c)
    }
    if (thunders.length === 0) return

    // 暂时把手捧雷从判定区移出
    for (const t of thunders) player.removeJudgeCard(t.id)

    for (const thunder of thunders) {
      if (!player.isAlive()) {
        // 玩家已死, 直接丢弃
        game.cardDeck.discard([thunder])
        eventBus.emit({ type: 'card:discard', sourceHeroId: player.getId(), data: { cards: [thunder.id] } })
        continue
      }

      // 变法可在此处替换判定结果(对当前玩家生效)
      const j = await game.judge(player)
      const resultSuit = j.suit
      const resultNumber = j.card.number

      eventBus.emit({
        type: 'judge',
        sourceHeroId: player.getId(),
        data: { judgeCardId: thunder.id, judgeCardName: '手捧雷', resultCard: j.card.id, resultSuit, resultNumber, phase: 'resolve' },
      })

      if (resultSuit === 'spade' && resultNumber >= 2 && resultNumber <= 9) {
        // 生效: 3血, 标记消失
        const dmg = player.takeDamage(3)
        eventBus.emit({ type: 'damage:receive', sourceHeroId: player.getId(), data: { damage: dmg, from: '手捧雷' } })
        game.emitSkillTrigger(player, '手捧雷', `黑桃${resultNumber}-受到3点伤害`)
        game.cardDeck.discard([thunder])
        if (!player.isAlive()) {
          eventBus.emit({ type: 'die', sourceHeroId: player.getId(), data: { killedBy: '手捧雷' } })
        }
      } else {
        // 失效: 顺延给下一个存活且无雷的玩家
        const nextPlayer = this.findNextPlayerWithoutThunder(game, player)
        if (nextPlayer) {
          nextPlayer.addJudgeCard(thunder)
          game.emitSkillTrigger(player, '手捧雷', `失效-顺延给${nextPlayer.getName()}`)
        } else {
          // 所有人都有雷(或只剩自己), 放回自己
          player.addJudgeCard(thunder)
          game.emitSkillTrigger(player, '手捧雷', `失效-无目标, 雷保留`)
        }
      }
    }
  }

  /** 找下一个存活且没有手捧雷标记的玩家 */
  private findNextPlayerWithoutThunder(game: any, currentPlayer: any): any {
    const allPlayers = game.players
    const idx = allPlayers.indexOf(currentPlayer)
    for (let i = 1; i <= allPlayers.length; i++) {
      const next = allPlayers[(idx + i) % allPlayers.length]
      if (!next.isAlive()) continue
      if (next === currentPlayer) continue  // 跳过自己
      const hasThunder = next.getJudgeCards().some((c: Card) => c.name === '手捧雷')
      if (!hasThunder) return next
    }
    return null
  }
}