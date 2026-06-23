import type { HeroInstance } from './hero.js'
import type { Treasure } from './skill.js'
import type { StageProgress } from './stage.js'
import type { HeroStone } from './recruit.js'

export interface Material {
  type:
    | 'gold'
    | 'heroFragment'
    | 'treasureFragment'
    | 'jade'
    | 'heroToken'
    | 'bailiTicket'   // 百里抽卡券
    | 'qianliTicket'  // 千里抽卡券
    | 'wanliTicket'   // 万里抽卡券
  itemId?: string          // 碎片对应的 hero/treasure ID
  amount: number
}

export interface Building {
  type: 'mainCity' | 'recruit' | 'smelt' | 'treasureWorkshop' | 'training' | 'commandPost'
  level: number
}

/** 每日首次十连保底记录 (UTC 日期字符串, null = 未使用) */
export interface DailyRecruitGuarantee {
  qianliDate: string | null  // 形如 '2026-06-23'
  wanliDate: string | null
}

export interface UserSave {
  userId: string
  mainCityLevel: number
  buildings: Building[]
  heroes: HeroInstance[]
  treasures: Treasure[]
  materials: Material[]
  heroStones: HeroStone[]                       // 待使用的英雄石
  dailyRecruitGuarantee: DailyRecruitGuarantee  // 每日首次十连保底记录
  stageProgress: StageProgress[]
  createdAt: number
  updatedAt: number
}