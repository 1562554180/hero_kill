import { Module } from '@nestjs/common'
import { StageController } from './stage.controller'

@Module({
  controllers: [StageController],
})
export class StageModule {}
