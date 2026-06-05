import type {
  Suit, CardType, BasicCardName, SchemeCardName,
  EquipmentCardName, EquipmentSlot
} from './enums.js'

export interface Card {
  id: string
  suit: Suit
  number: number        // 1-13 (A-K)
  type: CardType
  name: BasicCardName | SchemeCardName | EquipmentCardName
}

export interface BasicCard extends Card {
  type: 'basic'
  name: BasicCardName
}

export interface SchemeCard extends Card {
  type: 'scheme'
  name: SchemeCardName
  delayed: boolean      // 延时锦囊（手捧雷、画地为牢）
}

export interface EquipmentCard extends Card {
  type: 'equipment'
  name: EquipmentCardName
  slot: EquipmentSlot
  range?: number        // 武器攻击距离
  description: string
}

export function isBasicCard(card: Card): card is BasicCard {
  return card.type === 'basic'
}

export function isSchemeCard(card: Card): card is SchemeCard {
  return card.type === 'scheme'
}

export function isEquipmentCard(card: Card): card is EquipmentCard {
  return card.type === 'equipment'
}
