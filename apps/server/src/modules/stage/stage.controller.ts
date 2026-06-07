import { Controller, Get } from '@nestjs/common'
import { stages } from '@hero-legend/game-data'

@Controller('stage')
export class StageController {
  @Get()
  getAllStages() {
    return { stages }
  }
}
