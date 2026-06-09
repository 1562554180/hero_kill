import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { SaveDoc } from './save.schema'
import { generateInitialTreasures } from '@hero-legend/game-data'

@Injectable()
export class SaveService {
  constructor(@InjectModel(SaveDoc.name) private saveModel: Model<SaveDoc>) {}

  async getSave(userId: string): Promise<SaveDoc | null> {
    const save = await this.saveModel.findOne({ userId }).exec()
    if (!save) return null
    // 补全旧文档缺失的字段
    let patched = false
    if (!save.materials || save.materials.length === 0) {
      save.materials = [{ type: 'gold', amount: 1000 }] as any
      patched = true
    }
    if (!save.buildings || save.buildings.length === 0) {
      save.buildings = [
        { type: 'mainCity', level: 1 }, { type: 'recruit', level: 1 },
        { type: 'smelt', level: 1 }, { type: 'treasureWorkshop', level: 1 },
        { type: 'training', level: 1 }, { type: 'commandPost', level: 1 },
      ] as any
      patched = true
    }
    if (patched) await save.save()
    return save
  }

  async createSave(userId: string): Promise<SaveDoc> {
    const save = new this.saveModel({
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
      treasures: generateInitialTreasures(),
      materials: [{ type: 'gold', amount: 1000 }],
      stageProgress: [
        { stageId: 'xu-zhou', battlesCompleted: 0, stars: 0, unlocked: true },
        { stageId: 'yang-zhou', battlesCompleted: 0, stars: 0, unlocked: false },
        { stageId: 'yi-zhou', battlesCompleted: 0, stars: 0, unlocked: false },
      ],
    })
    return save.save()
  }

  async updateSave(userId: string, update: Partial<SaveDoc>): Promise<SaveDoc | null> {
    return this.saveModel.findOneAndUpdate(
      { userId },
      { ...update, updatedAt: Date.now() },
      { new: true },
    ).exec()
  }

  async addHero(userId: string, hero: any): Promise<SaveDoc | null> {
    return this.saveModel.findOneAndUpdate(
      { userId },
      { $push: { heroes: hero }, updatedAt: Date.now() },
      { new: true },
    ).exec()
  }

  async addMaterial(userId: string, type: string, amount: number): Promise<SaveDoc | null> {
    await this.saveModel.updateOne(
      { userId, 'materials.type': type },
      { $inc: { 'materials.$.amount': amount }, updatedAt: Date.now() },
    ).exec()
    return this.getSave(userId)
  }
}
