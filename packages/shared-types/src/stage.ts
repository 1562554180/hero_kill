export interface StageBattle {
  id: string
  enemies: string[]      // 敌方英雄ID列表
  allies: string[]       // 友军英雄ID列表（空=无友军）
  isBoss: boolean
}

export interface Stage {
  id: string
  name: string
  description: string
  order: number          // 关卡顺序
  battles: StageBattle[]
  rewards: StageReward
}

export interface StageReward {
  gold: number
  growthValue: number
  heroFragmentChance: number   // 英雄碎片掉落概率 0-1
  treasureFragmentChance: number
  bossBonus?: {
    gold: number
    treasureChance: number
  }
}

export interface StageProgress {
  stageId: string
  battlesCompleted: number
  stars: number          // 0-3星评价
  unlocked: boolean
}
