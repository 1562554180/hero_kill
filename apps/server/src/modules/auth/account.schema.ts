import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema()
export class AccountDoc extends Document {
  @Prop({ required: true, unique: true, index: true }) username: string
  @Prop({ required: true }) passwordHash: string
  @Prop({ required: true, unique: true }) userId: string
  @Prop({ default: Date.now }) createdAt: number
}

export const AccountSchema = SchemaFactory.createForClass(AccountDoc)