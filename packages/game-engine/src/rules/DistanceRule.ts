import type { Player } from '../core/Player.js'

export class DistanceRule {
  static getDistance(from: Player, to: Player, allPlayers: Player[]): number {
    const fromIdx = allPlayers.indexOf(from)
    const toIdx = allPlayers.indexOf(to)
    if (fromIdx === -1 || toIdx === -1) return Infinity

    const n = allPlayers.filter(p => p.isAlive()).length
    const rawDist = Math.abs(fromIdx - toIdx)
    let dist = Math.min(rawDist, n - rawDist)

    // 进攻马：距离-1
    if (from.hero.equipment.attackMount) dist = Math.max(1, dist - 1)
    // 防御马：距离+1
    if (to.hero.equipment.defenseMount) dist += 1

    return dist
  }

  static getAttackRange(player: Player): number {
    // 默认攻击距离1，武器可增加
    const weaponId = player.hero.equipment.weapon
    if (!weaponId) return 1
    // 武器范围由卡牌数据定义，这里从装备名推断
    const weaponRanges: Record<string, number> = {
      '虎头枪': 2, '盘龙棍': 2, '狼牙棒': 3,
      '芦叶枪': 3, '龙鳞刀': 2, '霸王弓': 5,
    }
    // 查找武器卡在手牌中获取名称（简化：通过id查）
    // 实际范围在装备时记录到hero上
    return weaponRanges[weaponId] ?? 1
  }

  static canAttack(from: Player, to: Player, allPlayers: Player[]): boolean {
    if (!to.isAlive()) return false
    const dist = DistanceRule.getDistance(from, to, allPlayers)
    const range = DistanceRule.getAttackRange(from)
    return dist <= range
  }

  static getValidTargets(player: Player, allPlayers: Player[]): Player[] {
    return allPlayers.filter(p => p !== player && DistanceRule.canAttack(player, p, allPlayers))
  }
}
