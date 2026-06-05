import type { EquipmentCard } from '@hero-legend/shared-types'

let id = 2000
function eq(suit: any, number: number, name: any, slot: any, range: number | undefined, desc: string): EquipmentCard {
  return { id: `card-${++id}`, suit, number, type: 'equipment', name, slot, range, description: desc }
}

export const equipmentCards: EquipmentCard[] = [
  // 武器
  eq('spade', 1, '虎头枪', 'weapon', 2, '攻击范围2'),
  eq('spade', 2, '盘龙棍', 'weapon', 2, '攻击范围2'),
  eq('spade', 3, '狼牙棒', 'weapon', 3, '攻击范围3'),
  eq('spade', 4, '芦叶枪', 'weapon', 3, '攻击范围3'),
  eq('heart', 1, '龙鳞刀', 'weapon', 2, '攻击范围2'),
  eq('club', 1, '霸王弓', 'weapon', 5, '攻击范围5'),
  // 坐骑
  eq('diamond', 5, '进攻马', 'attackMount', undefined, '与其他角色距离-1'),
  eq('club', 5, '进攻马', 'attackMount', undefined, '与其他角色距离-1'),
  eq('heart', 5, '防御马', 'defenseMount', undefined, '其他角色与你的距离+1'),
  eq('diamond', 6, '防御马', 'defenseMount', undefined, '其他角色与你的距离+1'),
  // 防具
  eq('diamond', 2, '玉如意', 'armor', undefined, '当你需要出闪时，可判定，红色视为出闪'),
  eq('diamond', 3, '护心镜', 'armor', undefined, '每回合第一次受到的伤害-1'),
]
