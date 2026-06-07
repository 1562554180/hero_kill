import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema()
export class HeroInstanceDoc {
  @Prop({ required: true }) heroId: string
  @Prop({ default: 1 }) level: number
  @Prop({ default: 0 }) growthValue: number
  @Prop({ default: 1 }) starLevel: number
  @Prop({ type: Object }) treasures: { main: any[]; sub: any[] }
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
  @Prop() itemId: string
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
  @Prop({ type: [StageProgressDoc], default: [] }) stageProgress: StageProgressDoc[]
  @Prop({ default: Date.now }) createdAt: number
  @Prop({ default: Date.now }) updatedAt: number
}

export const SaveSchema = SchemaFactory.createForClass(SaveDoc)
