import { Module } from '@nestjs/common'
import { TreasureController } from './treasure.controller'
import { TreasureService } from './treasure.service'
import { SaveModule } from '../save/save.module'

@Module({
  imports: [SaveModule],
  controllers: [TreasureController],
  providers: [TreasureService],
})
export class TreasureModule {}
