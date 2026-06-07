import { Module } from '@nestjs/common'
import { HeroController } from './hero.controller'
import { HeroService } from './hero.service'
import { SaveModule } from '../save/save.module'

@Module({
  imports: [SaveModule],
  controllers: [HeroController],
  providers: [HeroService],
})
export class HeroModule {}
