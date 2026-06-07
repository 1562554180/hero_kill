import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { BattleModule } from './modules/battle/battle.module'
import { HeroModule } from './modules/hero/hero.module'
import { StageModule } from './modules/stage/stage.module'
import { SaveModule } from './modules/save/save.module'

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/hero-legend'),
    BattleModule,
    HeroModule,
    StageModule,
    SaveModule,
  ],
})
export class AppModule {}
