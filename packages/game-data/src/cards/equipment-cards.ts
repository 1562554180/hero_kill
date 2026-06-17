import type { EquipmentCard } from '@hero-legend/shared-types'

let id = 2000
function eq(suit: any, number: number, name: any, slot: any, range: number | undefined, desc: string, icon: string): EquipmentCard {
  return { id: `card-${++id}`, suit, number, type: 'equipment', name, slot, range, description: desc, icon }
}

export const equipmentCards: EquipmentCard[] = [
  // 武器 (8种, 9张)
  eq('spade', 1, '虎符', 'weapon', 1, '出杀无次数限制', '🐯'),
  eq('spade', 13, '虎符', 'weapon', 1, '出杀无次数限制', '🐯'),
  eq('spade', 2, '盘龙棍', 'weapon', 3, '杀被闪避后可继续出杀', '🐉'),
  eq('spade', 6, '鱼肠剑', 'weapon', 2, '无视防具', '🗡'),
  eq('club', 3, '博浪锤', 'weapon', 2, '杀被闪避后可弃2张手牌强制命中', '🔨'),
  eq('club', 1, '霸王弓', 'weapon', 5, '杀命中后拆对方一匹马', '🏹'),
  eq('spade', 4, '芦叶枪', 'weapon', 3, '主动技: 出2张手牌当杀', '🔱'),
  eq('heart', 1, '龙鳞刀', 'weapon', 2, '杀命中后可选拆对方2张牌代替掉血', '⚔'),
  eq('spade', 3, '狼牙棒', 'weapon', 3, '最后一张手牌出杀时可同时对最多3个目标出杀', '🪓'),
  // 坐骑 (6张)
  eq('diamond', 5, '进攻马', 'attackMount', undefined, '攻击距离+1', '🐎'),
  eq('club', 5, '进攻马', 'attackMount', undefined, '攻击距离+1', '🐎'),
  eq('heart', 7, '进攻马', 'attackMount', undefined, '攻击距离+1', '🐎'),
  eq('heart', 5, '防御马', 'defenseMount', undefined, '对方攻击距离-1', '🐴'),
  eq('diamond', 6, '防御马', 'defenseMount', undefined, '对方攻击距离-1', '🐴'),
  eq('club', 8, '防御马', 'defenseMount', undefined, '对方攻击距离-1', '🐴'),
  // 防具 (4张)
  eq('diamond', 2, '玉如意', 'armor', undefined, '被杀时判定，红色视为闪', '🪄'),
  eq('diamond', 12, '玉如意', 'armor', undefined, '被杀时判定，红色视为闪', '🪄'),
  eq('heart', 3, '乾坤袋', 'armor', undefined, '手牌上限+1', '🎒'),
  eq('heart', 11, '乾坤袋', 'armor', undefined, '手牌上限+1', '🎒'),
]
