import type { Card, SchemeCard, Suit } from '@hero-legend/shared-types'

let id = 1000
function sc(suit: Suit, number: number, name: any, delayed: boolean): SchemeCard {
  return { id: `card-${++id}`, suit, number, type: 'scheme', name, delayed }
}

export const schemeCards: SchemeCard[] = [
  // 无中生有 ×4
  sc('heart', 7, '无中生有', false), sc('heart', 8, '无中生有', false),
  sc('heart', 9, '无中生有', false), sc('heart', 10, '无中生有', false),
  // 决斗 ×3
  sc('spade', 1, '决斗', false), sc('club', 1, '决斗', false), sc('diamond', 1, '决斗', false),
  // 万箭齐发 ×1
  sc('heart', 1, '万箭齐发', false),
  // 南蛮入侵 ×2
  sc('spade', 7, '南蛮入侵', false), sc('spade', 13, '南蛮入侵', false),
  // 无懈可击 ×4
  sc('diamond', 11, '无懈可击', false), sc('diamond', 12, '无懈可击', false),
  sc('diamond', 13, '无懈可击', false), sc('heart', 1, '无懈可击', false),
  // 五谷丰登 ×2
  sc('heart', 3, '五谷丰登', false), sc('heart', 4, '五谷丰登', false),
  // 探囊取物 ×2
  sc('club', 3, '探囊取物', false), sc('club', 4, '探囊取物', false),
  // 釜底抽薪 ×2
  sc('spade', 3, '釜底抽薪', false), sc('spade', 4, '釜底抽薪', false),
  // 借刀杀人 ×2
  sc('club', 11, '借刀杀人', false), sc('club', 12, '借刀杀人', false),
  // 手捧雷 (延时) ×2
  sc('spade', 1, '手捧雷', true), sc('club', 1, '手捧雷', true),
  // 画地为牢 (延时) ×2
  sc('heart', 1, '画地为牢', true), sc('diamond', 1, '画地为牢', true),
]
