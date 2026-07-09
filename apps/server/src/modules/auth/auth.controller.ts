import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { AuthGuard } from './auth.guard'
import { CurrentUserId } from './current-user.decorator'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { username: string; password: string },
    @Req() req: Request,
  ) {
    const { userId, username } = await this.authService.register(body.username, body.password)
    req.session.userId = userId
    ;(req.session as any).username = username
    return { success: true, userId, username }
  }

  @Post('login')
  async login(
    @Body() body: { username: string; password: string },
    @Req() req: Request,
  ) {
    const { userId, username } = await this.authService.login(body.username, body.password)
    req.session.userId = userId
    ;(req.session as any).username = username
    return { success: true, userId, username }
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()))
    return { success: true }
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    return {
      userId: req.session.userId,
      username: (req.session as any).username ?? null,
    }
  }

  @UseGuards(AuthGuard)
  @Post('bind')
  async bind(
    @CurrentUserId() userId: string,
    @Body() body: { oldUserId: string },
  ) {
    return this.authService.bindLegacySave(userId, body.oldUserId)
  }
}
