import { Module } from '@nestjs/common'
import { TreasurePavilionController } from './treasure-pavilion.controller'
import { TreasurePavilionService } from './treasure-pavilion.service'
import { SaveModule } from '../save/save.module'

@Module({
  imports: [SaveModule],
  controllers: [TreasurePavilionController],
  providers: [TreasurePavilionService],
})
export class TreasurePavilionModule {}
