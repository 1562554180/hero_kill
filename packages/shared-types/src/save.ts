import type { HeroInstance } from './hero.js'
import type { Treasure } from './skill.js'
import type { StageProgress } from './stage.js'

export interface Material {
  type: 'gold' | 'heroFragment' | 'treasureFragment' | 'jade' | 'heroToken'
  itemId?: string          // 碎片对应的 hero/treasure ID
  amount: number
}

export interface Building {
  type: 'mainCity' | 'recruit' | 'smelt' | 'treasureWorkshop' | 'training' | 'commandPost'
  level: number
}

export interface UserSave {
  userId: string
  mainCityLevel: number
  buildings: Building[]
  heroes: HeroInstance[]
  treasures: Treasure[]
  materials: Material[]
  stageProgress: StageProgress[]
  createdAt: number
  updatedAt: number
}
