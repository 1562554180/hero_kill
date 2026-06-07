import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { SaveController } from './save.controller'
import { SaveService } from './save.service'
import { SaveDoc, SaveSchema } from './save.schema'

@Module({
  imports: [MongooseModule.forFeature([{ name: SaveDoc.name, schema: SaveSchema }])],
  controllers: [SaveController],
  providers: [SaveService],
  exports: [SaveService],
})
export class SaveModule {}
