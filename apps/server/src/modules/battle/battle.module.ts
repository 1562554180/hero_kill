import { Module } from '@nestjs/common'
import { BattleController } from './battle.controller'
import { BattleService } from './battle.service'
import { SaveModule } from '../save/save.module'

@Module({
  imports: [SaveModule],
  controllers: [BattleController],
  providers: [BattleService],
})
export class BattleModule {}
