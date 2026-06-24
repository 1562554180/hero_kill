import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { randomUUID } from 'crypto'
import { SaveDoc } from './save.schema'
import { generateInitialTreasures } from '@hero-legend/game-data'
import type { HeroInstance, HeroStone } from '@hero-legend/shared-types'
import { getTreasureSlots } from '@hero-legend/shared-types'

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
    // 老存档的 heroes 缺 instanceId → backfill
    if (save.heroes && save.heroes.length > 0) {
      for (const h of save.heroes as any[]) {
        if (!h.instanceId) {
          h.instanceId = randomUUID()
          patched = true
        }
      }
    }
    if (!save.heroStones) {
      save.heroStones = [] as any
      patched = true
    }
    if (!save.dailyRecruitGuarantee) {
      save.dailyRecruitGuarantee = { qianliDate: null, wanliDate: null } as any
      patched = true
    }
    // 老存档缺哪种抽卡券就 seed 99 张 (新手补偿)
    for (const t of ['bailiTicket', 'qianliTicket', 'wanliTicket']) {
      if (!save.materials.find((m: any) => m.type === t)) {
        save.materials.push({ type: t, amount: 99 })
        patched = true
      }
    }
    // 老存档的 treasure 缺 level/enhanceCount/triggerRate → backfill
    if (save.treasures && save.treasures.length > 0) {
      for (const t of save.treasures as any[]) {
        if (t.level == null) { t.level = 0; patched = true }
        if (t.enhanceCount == null) { t.enhanceCount = 0; patched = true }
        // 老 18 辅印 (硬编码 starLevel=2 + triggerRate=0.30) → 新 ★2 (0.20)
        if (t.type === 'sub' && t.starLevel === 2 && t.triggerRate === 0.30) {
          t.triggerRate = 0.20
          patched = true
        }
      }
    }
    // 老存档 seed 强化符 20 张 (新手补偿)
    if (!save.materials.find((m: any) => m.type === 'enhancementTalisman')) {
      save.materials.push({ type: 'enhancementTalisman', amount: 20 })
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
      materials: [
        { type: 'gold', amount: 1000 },
        { type: 'bailiTicket', amount: 99 },   // 新存档给 99 张百里卡开局
        { type: 'qianliTicket', amount: 99 },  // 新存档给 99 张千里卡开局
        { type: 'wanliTicket', amount: 99 },   // 新存档给 99 张万里卡开局
        { type: 'enhancementTalisman', amount: 20 },  // 强化符新手 20 张
      ],
      heroStones: [],
      dailyRecruitGuarantee: { qianliDate: null, wanliDate: null },
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

  async addHero(userId: string, hero: HeroInstance): Promise<SaveDoc | null> {
    if (!hero.instanceId) hero.instanceId = randomUUID()
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

  /** 消耗门票 (允许负数, 若余额不足则返回 null 由调用方处理) */
  async spendMaterial(userId: string, type: string, amount: number): Promise<{ save: SaveDoc; newAmount: number } | null> {
    const save = await this.getSave(userId)
    if (!save) return null
    const mat = save.materials.find((m: any) => m.type === type)
    const current = mat?.amount ?? 0
    if (current < amount) return null
    const newAmount = current - amount
    if (mat) {
      mat.amount = newAmount
    } else {
      save.materials.push({ type, amount: newAmount } as any)
    }
    await this.saveModel.findOneAndUpdate(
      { userId },
      { $set: { materials: save.materials, updatedAt: Date.now() } },
      { new: true },
    ).exec()
    return { save, newAmount }
  }

  /** 把一批抽到的英雄石加入存档 */
  async addHeroStones(userId: string, stones: HeroStone[]): Promise<SaveDoc | null> {
    return this.saveModel.findOneAndUpdate(
      { userId },
      { $push: { heroStones: { $each: stones } }, updatedAt: Date.now() },
      { new: true },
    ).exec()
  }

  /** 熔炼: 先 $pull 删除消耗的石头, 再 $push 新石头. Mongo 不允许同路径同时 $pull/$push, 拆两步 */
  async smeltStones(userId: string, consumeStoneIds: string[], newStone: HeroStone): Promise<SaveDoc | null> {
    await this.saveModel.updateOne(
      { userId },
      {
        $pull: { heroStones: { stoneId: { $in: consumeStoneIds } } },
        $set: { updatedAt: Date.now() },
      },
    ).exec()
    return this.saveModel.findOneAndUpdate(
      { userId },
      {
        $push: { heroStones: newStone },
        $set: { updatedAt: Date.now() },
      },
      { new: true },
    ).exec()
  }

  /** 更新每日保底字段 (qianliDate 或 wanliDate 之一) */
  async updateDailyGuarantee(userId: string, key: 'qianliDate' | 'wanliDate', dateStr: string): Promise<SaveDoc | null> {
    return this.saveModel.findOneAndUpdate(
      { userId },
      { $set: { [`dailyRecruitGuarantee.${key}`]: dateStr, updatedAt: Date.now() } },
      { new: true },
    ).exec()
  }

  /**
   * 使用一颗英雄石 → 生成 HeroInstance
   * 返回 { hero: 新生成的实例, remainingStones: 剩余石头数 } 或 null (石头不存在)
   */
  async useHeroStone(userId: string, stoneId: string): Promise<{ hero: HeroInstance; remainingStones: number } | null> {
    const save = await this.getSave(userId)
    if (!save) return null
    const idx = (save.heroStones as any[]).findIndex(s => s.stoneId === stoneId)
    if (idx < 0) return null
    const stone = save.heroStones[idx]
    const starLevel = stone.starLevel as 1 | 2 | 3 | 4 | 5

    // 同名可多份: 直接新建一份 instance, instanceId 用新 uuid
    const slots = getTreasureSlots(starLevel)
    const newHero: HeroInstance = {
      instanceId: randomUUID(),
      heroId: stone.heroId,
      level: 1,
      growthValue: 0,
      starLevel,
      treasures: {
        main: new Array(slots.main).fill(null),
        sub: new Array(slots.sub).fill(null),
      },
    }

    // 原子操作: $push hero + $pull stone
    await this.saveModel.findOneAndUpdate(
      { userId },
      {
        $push: { heroes: newHero },
        $pull: { heroStones: { stoneId } },
        $set: { updatedAt: Date.now() },
      },
      { new: true },
    ).exec()

    return { hero: newHero, remainingStones: (save.heroStones as any[]).length - 1 }
  }

  /**
   * 更新指定 treasure 的字段 (level / enhanceCount / triggerRate 等)
   * 用数组元素匹配定位, 然后 $set 更新
   */
  async updateTreasure(userId: string, treasureId: string, patch: Record<string, any>): Promise<SaveDoc | null> {
    const setFields: Record<string, any> = { updatedAt: Date.now() }
    for (const [k, v] of Object.entries(patch)) {
      setFields[`treasures.$.${k}`] = v
    }
    return this.saveModel.findOneAndUpdate(
      { userId, 'treasures.id': treasureId },
      { $set: setFields },
      { new: true },
    ).exec()
  }
}