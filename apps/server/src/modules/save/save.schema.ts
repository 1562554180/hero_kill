import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema()
export class HeroInstanceDoc {
  @Prop() instanceId: string                 // uuid, 老存档 patch 时由 getSave backfill
  @Prop({ required: true }) heroId: string
  @Prop({ default: 1 }) level: number
  @Prop({ default: 0 }) growthValue: number
  @Prop({ default: 1 }) starLevel: number
  @Prop({ type: Object }) treasures: { main: any[]; sub: any[] }
}

@Schema()
export class HeroStoneDoc {
  @Prop({ required: true }) stoneId: string
  @Prop({ required: true }) heroId: string
  @Prop({ required: true }) starLevel: number
  @Prop({ required: true }) pool: string
  @Prop({ default: Date.now }) acquiredAt: number
}

@Schema()
export class DailyRecruitGuaranteeDoc {
  @Prop({ default: null }) qianliDate: string | null
  @Prop({ default: null }) wanliDate: string | null
}

@Schema()
export class StageProgressDoc {
  @Prop({ required: true }) stageId: string
  @Prop({ default: 0 }) battlesCompleted: number
  @Prop({ default: 0 }) stars: number
  @Prop({ default: false }) unlocked: boolean
}

@Schema()
export class MaterialDoc {
  @Prop({ required: true }) type: string
  @Prop({ required: false }) itemId?: string
  @Prop({ default: 0 }) amount: number
}

@Schema()
export class SaveDoc extends Document {
  @Prop({ required: true, unique: true }) userId: string
  @Prop({ default: 1 }) mainCityLevel: number
  @Prop({ type: [Object], default: [] }) buildings: any[]
  @Prop({ type: [HeroInstanceDoc], default: [] }) heroes: HeroInstanceDoc[]
  @Prop({ type: [Object], default: [] }) treasures: any[]
  @Prop({ type: [MaterialDoc], default: [] }) materials: MaterialDoc[]
  @Prop({ type: [HeroStoneDoc], default: [] }) heroStones: HeroStoneDoc[]
  @Prop({ type: DailyRecruitGuaranteeDoc, default: { qianliDate: null, wanliDate: null } })
  dailyRecruitGuarantee: DailyRecruitGuaranteeDoc
  @Prop({ type: [StageProgressDoc], default: [] }) stageProgress: StageProgressDoc[]
  @Prop({ default: Date.now }) createdAt: number
  @Prop({ default: Date.now }) updatedAt: number
}

export const SaveSchema = SchemaFactory.createForClass(SaveDoc)