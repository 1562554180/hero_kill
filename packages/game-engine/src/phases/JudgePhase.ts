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

      // 天香: 判定开始前, 玩家可弃1张手牌免判 (判定牌不消失, 同一回合仍会判定)
      const tianXiangUsed = await game.promptTianXiang(player, delayedCard)
      if (tianXiangUsed) {
        // 把判定牌放回判定区 (画地为牢保留, 下一回合再判)
        player.addJudgeCard(delayedCard)
        actions.push({ type: 'judge', data: { heroId: player.getId(), cardId: delayedCard.id, skipped: true } })
        continue
      }

      // 判定开始: 允许任何玩家响应无懈可击抵消本次判定效果
      const fromPlayer = (delayedCard as any).fromPlayerId
        ? game.getPlayerById((delayedCard as any).fromPlayerId)
        : undefined
      const judgeNullified = await game.checkJudgeNullify(player, delayedCard.name, fromPlayer)
      if (judgeNullified) {
        game.cardDeck.discard([delayedCard])
        eventBus.emit({ type: 'card:discard', sourceHeroId: player.getId(), data: { cards: [delayedCard.id] } })
        game.emitSkillTrigger(player, delayedCard.name, '判定被无懈可击-失效')
        continue
      }

      const j = await game.judge(player, delayedCard.name)
      const resultSuit = j.suit
      const resultNumber = j.card.number

      if (delayedCard.name === '画地为牢') {
        if (resultSuit === 'heart') {
          game.emitSkillTrigger(player, '画地为牢', '红桃-失效')
        } else {
          ;(game as any).skipCurrentTurnPlayerId = player.getId()
          game.emitSkillTrigger(player, '画地为牢', '生效-跳过出牌阶段')
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

      // 天香: 判定开始前, 玩家可弃1张手牌免判 (手捧雷保留, 不顺延, 同一回合仍会判定)
      const tianXiangUsed = await game.promptTianXiang(player, thunder)
      if (tianXiangUsed) {
        // 把手捧雷放回判定区 (保留在当前玩家, 不顺延, 同一回合仍会判定)
        player.addJudgeCard(thunder)
        continue
      }

      // 判定开始: 允许任何玩家响应无懈可击抵消本次手捧雷判定
      const fromPlayer = (thunder as any).fromPlayerId
        ? game.getPlayerById((thunder as any).fromPlayerId)
        : undefined
      const judgeNullified = await game.checkJudgeNullify(player, '手捧雷', fromPlayer)
      if (judgeNullified) {
        // 免于判定，传递给下一个无雷玩家
        const nextPlayer = this.findNextPlayerWithoutThunder(game, player)
        if (nextPlayer) {
          nextPlayer.addJudgeCard(thunder)
          game.emitSkillTrigger(player, '手捧雷', `被无懈可击-顺延给${nextPlayer.getName()}`)
        } else {
          player.addJudgeCard(thunder)
          game.emitSkillTrigger(player, '手捧雷', '被无懈可击-无目标,雷保留')
        }
        continue
      }

      // 变法可在此处替换判定结果(对当前玩家生效)
      const j = await game.judge(player, '手捧雷')
      const resultSuit = j.suit
      const resultNumber = j.card.number

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