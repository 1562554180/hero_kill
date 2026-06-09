import type { Card } from '@hero-legend/shared-types'

export class CardValueEvaluator {
  static getValue(card: Card): number {
    if (card.type === 'basic') {
      const values: Record<string, number> = { '杀': 3, '闪': 3, '药': 4, '血杀': 4, '暗杀': 4 }
      return values[card.name as string] ?? 1
    }
    if (card.type === 'scheme') {
      const values: Record<string, number> = {
        '无中生有': 5, '无懈可击': 4, '决斗': 3, '烽火狼烟': 3,
        '万箭齐发': 3, '五谷丰登': 2, '探囊取物': 2, '釜底抽薪': 2,
        '借刀杀人': 2, '手捧雷': 3, '画地为牢': 3, '休养生息': 2,
      }
      return values[card.name as string] ?? 1
    }
    if (card.type === 'equipment') return 3
    return 0
  }

  static sortByValue(cards: Card[]): Card[] {
    return [...cards].sort((a, b) => CardValueEvaluator.getValue(b) - CardValueEvaluator.getValue(a))
  }
}
