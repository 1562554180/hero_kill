import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import * as express from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: true, credentials: true })
  app.use(express.json())
  app.use(cookieParser())
  app.use(session({
    secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 3600 * 1000,
    },
    name: 'hl.sid',
  }))
  await app.listen(3000)
  console.log('Server running on http://localhost:3000')
}
bootstrap()