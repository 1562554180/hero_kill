import { Injectable } from '@nestjs/common'

interface SaveData {
  userId: string
  mainCityLevel: number
  buildings: any[]
  heroes: any[]
  treasures: any[]
  materials: any[]
  stageProgress: any[]
  createdAt: number
  updatedAt: number
}

function createDefaultSave(userId: string): SaveData {
  return {
    userId,
    mainCityLevel: 1,
    buildings: [
      { type: 'mainCity', level: 1 },
      { type: 'recruit', level: 1 },
      { type: 'smelt', level: 1 },
      { type: 'treasureWorkshop', level: 1 },
      { type: 'training', level: 1 },
      { type: 'commandPost', level: 1 },
    ],
    heroes: [],
    treasures: [],
    materials: [{ type: 'gold', amount: 1000 }],
    stageProgress: [
      { stageId: 'xu-zhou', battlesCompleted: 0, stars: 0, unlocked: true },
      { stageId: 'yang-zhou', battlesCompleted: 0, stars: 0, unlocked: false },
      { stageId: 'yi-zhou', battlesCompleted: 0, stars: 0, unlocked: false },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

@Injectable()
export class MemorySaveService {
  private saves = new Map<string, SaveData>()

  async getSave(userId: string): Promise<SaveData | null> {
    return this.saves.get(userId) ?? null
  }

  async createSave(userId: string): Promise<SaveData> {
    const save = createDefaultSave(userId)
    this.saves.set(userId, save)
    return save
  }

  async updateSave(userId: string, update: Partial<SaveData>): Promise<SaveData | null> {
    const save = this.saves.get(userId)
    if (!save) return null
    Object.assign(save, update, { updatedAt: Date.now() })
    return save
  }

  async addHero(userId: string, hero: any): Promise<SaveData | null> {
    const save = this.saves.get(userId)
    if (!save) return null
    save.heroes.push(hero)
    save.updatedAt = Date.now()
    return save
  }

  async addMaterial(userId: string, type: string, amount: number): Promise<SaveData | null> {
    const save = this.saves.get(userId)
    if (!save) return null
    const mat = save.materials.find((m: any) => m.type === type)
    if (mat) mat.amount += amount
    else save.materials.push({ type, amount })
    save.updatedAt = Date.now()
    return save
  }
}
