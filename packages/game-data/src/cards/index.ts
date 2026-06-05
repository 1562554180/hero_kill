import { basicCards } from './basic-cards.js'
import { schemeCards } from './scheme-cards.js'
import { equipmentCards } from './equipment-cards.js'

export function createFullDeck() {
  // 重置卡牌ID，确保每局生成新ID
  const all = [...basicCards, ...schemeCards, ...equipmentCards]
  return all.map((card, i) => ({ ...card, id: `card-${i + 1}` }))
}

export { basicCards, schemeCards, equipmentCards }
