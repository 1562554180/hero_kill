import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AuthModule } from './modules/auth/auth.module'
import { BattleModule } from './modules/battle/battle.module'
import { HeroModule } from './modules/hero/hero.module'
import { StageModule } from './modules/stage/stage.module'
import { SaveModule } from './modules/save/save.module'
import { RecruitModule } from './modules/recruit/recruit.module'
import { TreasureModule } from './modules/treasure/treasure.module'
import { TreasurePavilionModule } from './modules/treasurePavilion/treasure-pavilion.module'

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/hero-legend'),
    AuthModule,
    BattleModule,
    HeroModule,
    StageModule,
    SaveModule,
    RecruitModule,
    TreasureModule,
    TreasurePavilionModule,
  ],
})
export class AppModule {}
