import { Controller, Get } from '@nestjs/common'
import { heroes, bossHeroes } from '@hero-legend/game-data'

@Controller('hero')
export class HeroController {
  @Get()
  getAllHeroes() {
    return { heroes, bossHeroes }
  }
}
