import { Controller, Get, UseGuards } from '@nestjs/common'
import { stages } from '@hero-legend/game-data'
import { AuthGuard } from '../auth/auth.guard'

@UseGuards(AuthGuard)
@Controller('stage')
export class StageController {
  @Get()
  getAllStages() {
    return { stages }
  }
}
