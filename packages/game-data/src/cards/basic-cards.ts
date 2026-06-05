import type { Card, Suit } from '@hero-legend/shared-types'

let cardId = 0
function makeCard(suit: Suit, number: number, name: any, type: any): Card {
  return { id: `card-${++cardId}`, suit, number, type, name }
}

// 基本牌：杀 (30张)
const kills: Card[] = []
for (let i = 0; i < 7; i++) kills.push(makeCard('spade', 7 + i, '杀', 'basic'))
for (let i = 0; i < 7; i++) kills.push(makeCard('heart', 7 + i, '杀', 'basic'))
for (let i = 0; i < 5; i++) kills.push(makeCard('club', 7 + i, '杀', 'basic'))
for (let i = 0; i < 5; i++) kills.push(makeCard('diamond', 7 + i, '杀', 'basic'))
for (let i = 0; i < 3; i++) kills.push(makeCard('spade', i + 2, '杀', 'basic'))
for (let i = 0; i < 3; i++) kills.push(makeCard('heart', i + 2, '杀', 'basic'))

// 基本牌：闪 (15张)
const dodges: Card[] = []
for (let i = 0; i < 5; i++) dodges.push(makeCard('diamond', i + 2, '闪', 'basic'))
for (let i = 0; i < 5; i++) dodges.push(makeCard('heart', i + 2, '闪', 'basic'))
for (let i = 0; i < 5; i++) dodges.push(makeCard('club', i + 2, '闪', 'basic'))

// 基本牌：药 (8张)
const medicines: Card[] = []
for (let i = 0; i < 4; i++) medicines.push(makeCard('heart', i + 1, '药', 'basic'))
for (let i = 0; i < 4; i++) medicines.push(makeCard('diamond', i + 1, '药', 'basic'))

export const basicCards: Card[] = [...kills, ...dodges, ...medicines]
