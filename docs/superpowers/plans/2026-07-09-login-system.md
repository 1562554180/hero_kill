# 登录系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 username/password + httpOnly cookie session 替换现在的 localStorage 写死 userId,加 `BindLegacySaveModal` 把老的匿名存档一次性纳入账号。

**Architecture:** 服务端新增 auth 模块(Account schema、register/login/logout/me/bind 端点、AuthGuard、`@CurrentUserId()` 装饰器),session 用 `express-session` + 内存 store;7 个现 controller 加 AuthGuard + 去掉 `:userId` 路径段;前端 `/login` 走 login/register 二合一表单,登录成功后弹迁移 modal。

**Tech Stack:** NestJS 11 + Mongoose 8 + bcrypt + express-session + cookie-parser(后端);React 19 + react-router + Zustand(前端)。

**测试策略:** server 与 web 当前没有测试 runner,本次**不做单测基础设施**。每个 controller / 端点 / UI 改动**配手测 curl / 浏览器步骤**,在 commit 前由实施者本人验证。

---

## 文件结构(本次新增 / 改动)

```
apps/server/src/modules/auth/                      ← 新增目录
├── account.schema.ts                              (新)
├── auth.service.ts                                (新)
├── auth.controller.ts                             (新)
├── auth.guard.ts                                  (新)
├── current-user.decorator.ts                      (新)
└── auth.module.ts                                 (新)

apps/server/src/main.ts                            (改: 装 cookieParser + session)
apps/server/src/app.module.ts                      (改: import AuthModule)
apps/server/src/modules/{save,hero,battle,recruit,treasure,treasurePavilion,stage}/*.controller.ts
                                                 (7 个 controller:加 @UseGuards + 去 :userId + 用 @CurrentUserId)
apps/server/package.json                           (改: + bcrypt / cookie-parser / express-session 等)

apps/web/src/pages/LoginPage/index.tsx             (新)
apps/web/src/components/BindLegacySaveModal.tsx    (新)
apps/web/src/pages/MainPage.tsx                    (改: 启动判 /auth/me)
apps/web/src/main.tsx                              (改: + /login 路由)
apps/web/src/stores/gameStore.ts                   (改: userId → account)
apps/web/src/pages/*/                              (10+ 个 fetch 点去 userId 段)
apps/web/src/pages/CityPage/index.tsx              (改: 底部加 退出登录 按钮)
```

---

## Commit 1 — 后端 auth 模块骨架

### Task 1: 加新依赖 + main.ts 接入 session

**Files:**
- Modify: `apps/server/package.json` (deps 段)
- Modify: `apps/server/src/main.ts`

- [ ] **Step 1: 在 apps/server/package.json dependencies 段添加新依赖**

```json
"bcrypt": "^5.1.1",
"@types/bcrypt": "^5.0.2",
"cookie-parser": "^1.4.7",
"@types/cookie-parser": "^1.4.8",
"express-session": "^1.18.1",
"@types/express-session": "^1.18.1"
```

精确加在 `"class-transformer": ...` 之后、``"reflect-metadata"` 之前。

- [ ] **Step 2: 把 package.json `name` 段不动,运行 `pnpm install` 校验 lockfile**

Run: `cd D:/work/hero_kill && pnpm install`
Expected: 安装成功,无错误。

- [ ] **Step 3: 改写 `apps/server/src/main.ts` 完整内容**

```ts
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
```

注意 `enableCors` 加了 `credentials: true`,否则前端 fetch 无法透传 cookie (虽然 Vite 反代通常跨域不带 cookie,但保留 credentials 是兜底)。

- [ ] **Step 4: 编译验证**

Run: `cd D:/work/hero_kill && pnpm --filter @hero-legend/server build`
Expected: 编译通过(可能 warning 但不报 error)。

> 此时 `AuthModule` 还不存在,但 `app.module.ts` 还没 import 它,main.ts 编译不会引用未导入符号,这一步就能验证 cookie-parser + express-session 类型正确。

- [ ] **Step 5: Commit**

```bash
git add apps/server/package.json apps/server/src/main.ts pnpm-lock.yaml
git commit -m "feat(server): 接 cookie-parser + express-session"
```

### Task 2: Account schema + AuthModule 骨架

**Files:**
- Create: `apps/server/src/modules/auth/account.schema.ts`
- Create: `apps/server/src/modules/auth/auth.module.ts` (先空壳)
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: 创建 `apps/server/src/modules/auth/account.schema.ts`**

```ts
import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

@Schema()
export class AccountDoc extends Document {
  @Prop({ required: true, unique: true, index: true }) username: string
  @Prop({ required: true }) passwordHash: string
  @Prop({ required: true, unique: true }) userId: string
  @Prop({ default: Date.now }) createdAt: number
}

export const AccountSchema = SchemaFactory.createForClass(AccountDoc)
```

- [ ] **Step 2: 创建 `apps/server/src/modules/auth/auth.module.ts` 空壳**

```ts
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AccountDoc, AccountSchema } from './account.schema'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: AccountDoc.name, schema: AccountSchema }]),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, MongooseModule],
})
export class AuthModule {}
```

> 此时 `AuthService` 和 `AuthController` 文件还没创建,下一步才加。先不编译验证 — 这一步只是让 schema + module 在文件系统层就位。

- [ ] **Step 3: 在 `apps/server/src/app.module.ts` imports 段插入 `AuthModule`**

```ts
import { AuthModule } from './modules/auth/auth.module'
```

把 `AuthModule` 加进 imports 数组。

- [ ] **Step 4: Commit schema + 空 module + app.module 引用**

```bash
git add apps/server/src/modules/auth/account.schema.ts apps/server/src/modules/auth/auth.module.ts apps/server/src/app.module.ts
git commit -m "feat(server): Account schema + AuthModule 骨架"
```

### Task 3: CurrentUserId 装饰器 + AuthGuard

**Files:**
- Create: `apps/server/src/modules/auth/current-user.decorator.ts`
- Create: `apps/server/src/modules/auth/auth.guard.ts`

- [ ] **Step 1: 创建 `apps/server/src/modules/auth/current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest()
    return req.session?.userId ?? ''
  },
)
```

> session.userId 可能缺失(未登录路径),返回空串。让 controller 层在 AuthGuard 之后调用,自然保证存在。

- [ ] **Step 2: 创建 `apps/server/src/modules/auth/auth.guard.ts`**

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    if (!req.session?.userId) {
      throw new UnauthorizedException('NOT_LOGGED_IN')
    }
    return true
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/auth/current-user.decorator.ts apps/server/src/modules/auth/auth.guard.ts
git commit -m "feat(server): @CurrentUserId 装饰器 + AuthGuard"
```

### Task 4: AuthService.register / login / bind

**Files:**
- Create: `apps/server/src/modules/auth/auth.service.ts`

- [ ] **Step 1: 创建 `apps/server/src/modules/auth/auth.service.ts`(完整内容)**

```ts
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { AccountDoc } from './account.schema'
import { SaveDoc } from '../save/save.schema'
import { SaveService } from '../save/save.service'

const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(AccountDoc.name) private accountModel: Model<AccountDoc>,
    private saveService: SaveService,
  ) {}

  async register(username: string, password: string) {
    if (!USERNAME_RE.test(username)) {
      throw new ConflictException('USERNAME_INVALID')
    }
    if (typeof password !== 'string' || password.length < 6) {
      throw new ConflictException('PASSWORD_TOO_SHORT')
    }
    const existing = await this.accountModel.findOne({ username }).exec()
    if (existing) throw new ConflictException('USERNAME_TAKEN')

    const passwordHash = await bcrypt.hash(password, 10)
    const userId = randomUUID()
    await this.accountModel.create({ username, passwordHash, userId })
    await this.saveService.createSave(userId)

    return { userId, username }
  }

  async login(username: string, password: string) {
    const account = await this.accountModel.findOne({ username }).exec()
    if (!account) throw new UnauthorizedException('INVALID_CREDENTIALS')
    const ok = await bcrypt.compare(password, account.passwordHash)
    if (!ok) throw new UnauthorizedException('INVALID_CREDENTIALS')
    return { userId: account.userId, username: account.username }
  }

  async bindLegacySave(currentUserId: string, oldUserId: string) {
    if (!oldUserId || oldUserId === currentUserId) {
      throw new ConflictException('BIND_INVALID')
    }
    const oldSave = await this.saveService.getSave(oldUserId)
    if (!oldSave) throw new NotFoundException('LEGACY_SAVE_NOT_FOUND')
    const newSave = await this.saveService.getSave(currentUserId)
    if (!newSave) throw new NotFoundException('CURRENT_SAVE_NOT_FOUND')

    // 把旧存档的所有 user-data 字段拷到新存档(不复制 fields 创建时间戳等元数据)
    const fieldsToMigrate = [
      'mainCityLevel',
      'buildings',
      'heroes',
      'treasures',
      'materials',
      'heroStones',
      'dailyRecruitGuarantee',
      'treasurePiece',
      'stageProgress',
      'subDefMigrated',
    ]
    const patch: Record<string, any> = {}
    for (const f of fieldsToMigrate) {
      ;(patch as any)[f] = (oldSave as any)[f]
    }
    await (this.saveService as any).updateSave(currentUserId, patch)

    // 删除旧 SaveDoc
    await (this.saveService as any).saveModel.deleteOne({ userId: oldUserId }).exec()

    return {
      migrated: {
        heroes: Array.isArray(oldSave.heroes) ? oldSave.heroes.length : 0,
        treasures: Array.isArray(oldSave.treasures) ? oldSave.treasures.length : 0,
        heroStones: Array.isArray(oldSave.heroStones) ? oldSave.heroStones.length : 0,
        materials: Array.isArray(oldSave.materials) ? oldSave.materials.length : 0,
        treasurePieces: Array.isArray((oldSave as any).treasurePiece)
          ? (oldSave as any).treasurePiece.length
          : 0,
      },
    }
  }
}
```

> 注意 `saveModel.deleteOne` 直接访问 — SaveService 没暴露 model 字段,**先把 `saveModel` 设为公开或加一个 `deleteByUserId` 方法**。下面这步独立 commit 配套。

- [ ] **Step 2: 给 SaveService 加 model 暴露 + deleteByUserId**

修改 `apps/server/src/modules/save/save.service.ts`:

```ts
@Injectable()
export class SaveService {
  constructor(@InjectModel(SaveDoc.name) public saveModel: Model<SaveDoc>) {}
```

(把 `private` 改成 `public`)

加一个新方法:

```ts
  /** 删除指定 userId 的 SaveDoc (用于 bind 时删除旧存档) */
  async deleteByUserId(userId: string): Promise<void> {
    await this.saveModel.deleteOne({ userId }).exec()
  }
```

然后把 auth.service.ts 里那行：
```ts
await (this.saveService as any).saveModel.deleteOne({ userId: oldUserId }).exec()
```
替换为：
```ts
await this.saveService.deleteByUserId(oldUserId)
```

- [ ] **Step 3: 编译验证**

Run: `cd D:/work/hero_kill && pnpm --filter @hero-legend/server build`
Expected: 编译通过。

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/auth/auth.service.ts apps/server/src/modules/save/save.service.ts
git commit -m "feat(server): AuthService.register/login/bind 骨架"
```

### Task 5: AuthController 5 个端点

**Files:**
- Create: `apps/server/src/modules/auth/auth.controller.ts`

- [ ] **Step 1: 创建 `apps/server/src/modules/auth/auth.controller.ts`(完整内容)**

```ts
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
```

- [ ] **Step 2: 编译验证**

Run: `cd D:/work/hero_kill && pnpm --filter @hero-legend/server build`
Expected: 编译通过。

- [ ] **Step 3: 手测 register / login / me (curl)**

```bash
# 启 dev server: cd apps/server && pnpm dev
# 留 cookie jar
COOKIE_JAR=$(mktemp)

# 注册
curl -sS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"hunter2"}' \
  http://localhost:3000/auth/register
# Expected: {"success":true,"userId":"...uuid...","username":"alice"}

# me
curl -sS -b "$COOKIE_JAR" http://localhost:3000/auth/me
# Expected: {"userId":"...","username":"alice"}

# 登出后 me 应 401
curl -sS -b "$COOKIE_JAR" -X POST http://localhost:3000/auth/logout
curl -sS -o /dev/null -w '%{http_code}\n' -b "$COOKIE_JAR" http://localhost:3000/auth/me
# Expected: 200 / 然后 401

rm "$COOKIE_JAR"
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/modules/auth/auth.controller.ts
git commit -m "feat(server): /api/auth 5 个端点 + session 写入"
```

---

## Commit 2 — 7 个 controller 加 AuthGuard + 去 :userId

> 7 个 controller 改法相同,这里列规则 + 第一个示例(其他复制粘贴模式)。

### 通用规则

每个 controller 改动:
1. imports 加 `UseGuards`(已有则跳过) + `AuthGuard` + `CurrentUserId`
2. class 加 `@UseGuards(AuthGuard)`
3. 每个 method:
   - 删 `@Param('userId') userId: string`
   - 第一个参数加 `@CurrentUserId() userId: string`
4. 路径里 `/xxx/:userId/yyy` 改成 `/xxx/yyy` 或对应到只有路径参数的结构

### Task 6: save.controller 改造

**Files:**
- Modify: `apps/server/src/modules/save/save.controller.ts`

完整改后内容:

```ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { SaveService } from './save.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUserId } from '../auth/current-user.decorator'

@UseGuards(AuthGuard)
@Controller('save')
export class SaveController {
  constructor(private saveService: SaveService) {}

  @Get()
  async getSave(@CurrentUserId() userId: string) {
    const save = await this.saveService.getSave(userId)
    return save  // 可能为 null;前端引导 /register
  }

  @Post()
  async updateSave(@CurrentUserId() userId: string, @Body() update: any) {
    return this.saveService.updateSave(userId, update)
  }

  @Post('seed-debug')
  async seedDebug(@CurrentUserId() userId: string) {
    return this.saveService.seedDebugResources(userId)
  }
}
```

- [ ] **Step 1: 用 Edit 工具把 save.controller.ts 替换成上面的内容**

- [ ] **Step 2: 编译**

Run: `cd D:/work/hero_kill && pnpm --filter @hero-legend/server build`
Expected: 编译通过。

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/save/save.controller.ts
git commit -m "refactor(server): save.controller 加 AuthGuard,去 :userId"
```

### Task 7: hero.controller 改造

**Files:**
- Modify: `apps/server/src/modules/hero/hero.controller.ts`

读原文件全文 → 用 Edit 工具:
- imports 加 `UseGuards`(若原文件已有则跳过,缺则补)+ `AuthGuard` + `CurrentUserId`
- class 前加 `@UseGuards(AuthGuard)`
- 每个 method:
  - 删 `@Param('userId') userId`
  - 加 `@CurrentUserId() userId: string` 作为第一个参数(保留次序与原文件一致)
  - 路径中 `/xxx/:userId/yyy` 改成 `/xxx/yyy`

原 controller 路径样例(按之前 hero.service 的接口签名):
- `levelup/:userId/:instanceId` → `levelup/:instanceId`
- `equip-treasure/:userId/:instanceId` → `equip-treasure/:instanceId`
- `unequip-treasure/:userId/:instanceId` → `unequip-treasure/:instanceId`
- `hero-stone/use/:userId/:stoneId` → `hero-stone/use/:stoneId`
- `banish/:userId/:instanceId` → `banish/:instanceId`

- [ ] **Step 1: 用 Edit 改 controller(基于实际文件内容)**

- [ ] **Step 2: 编译验证**

Run: `cd D:/work/hero_kill && pnpm --filter @hero-legend/server build`
Expected: 通过。

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/modules/hero/hero.controller.ts
git commit -m "refactor(server): hero.controller 加 AuthGuard,去 :userId"
```

### Task 8: battle.controller 改造

**Files:**
- Modify: `apps/server/src/modules/battle/battle.controller.ts`

按 Task 6 通用规则改。同 Task 6/7,但具体路径以本文件为准。

- [ ] **Step 1-3: 改文件 → 编译 → commit**

```bash
git add apps/server/src/modules/battle/battle.controller.ts
git commit -m "refactor(server): battle.controller 加 AuthGuard,去 :userId"
```

### Task 9: recruit.controller 改造

**Files:**
- Modify: `apps/server/src/modules/recruit/recruit.controller.ts`

按 Task 6 通用规则改。

- [ ] **Step 1-3: 改文件 → 编译 → commit**

```bash
git add apps/server/src/modules/recruit/recruit.controller.ts
git commit -m "refactor(server): recruit.controller 加 AuthGuard,去 :userId"
```

### Task 10: treasure.controller 改造

**Files:**
- Modify: `apps/server/src/modules/treasure/treasure.controller.ts`

按 Task 6 通用规则改。

- [ ] **Step 1-3: 改文件 → 编译 → commit**

```bash
git add apps/server/src/modules/treasure/treasure.controller.ts
git commit -m "refactor(server): treasure.controller 加 AuthGuard,去 :userId"
```

### Task 11: treasurePavilion.controller 改造

**Files:**
- Modify: `apps/server/src/modules/treasurePavilion/treasure-pavilion.controller.ts`

按 Task 6 通用规则改。

- [ ] **Step 1-3: 改文件 → 编译 → commit**

```bash
git add apps/server/src/modules/treasurePavilion/treasure-pavilion.controller.ts
git commit -m "refactor(server): treasure-pavilion.controller 加 AuthGuard,去 :userId"
```

### Task 12: stage.controller 改造

**Files:**
- Modify: `apps/server/src/modules/stage/stage.controller.ts`

按 Task 6 通用规则改。

- [ ] **Step 1-3: 改文件 → 编译 → commit**

```bash
git add apps/server/src/modules/stage/stage.controller.ts
git commit -m "refactor(server): stage.controller 加 AuthGuard,去 :userId"
```

### Task 13: 编译全 server 验证

- [ ] **Step 1: 全编译 + 启动 dev server + 端到端 curl**

```bash
cd D:/work/hero_kill
pnpm --filter @hero-legend/server build
pnpm --filter @hero-legend/server dev &
SERVER_PID=$!
sleep 5

# 注册 + cookie
COOKIE_JAR=$(mktemp)
curl -sS -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"e2e","password":"hunter2"}' \
  http://localhost:3000/auth/register

# 应能调 /api/save
curl -sS -b "$COOKIE_JAR" http://localhost:3000/save | head -c 200

# 未登录应 401
curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/save
# Expected: 401

kill "$SERVER_PID"
rm "$COOKIE_JAR"
```

如果上面所有 step 全 200 / 401 行为符合预期,commit:

- [ ] **Step 2: 没有 commit 工作树的话,什么都不做;有未提交修改:**

```bash
git diff  # 看一眼是否有遗漏
```

如果 7 个 controller 改动都已 commit,本任务即完成。

---

## Commit 3 — 前端 LoginPage + MainPage 改造 + store

### Task 14: 改 useGameStore(去掉 userId,加 account)

**Files:**
- Modify: `apps/web/src/stores/gameStore.ts`

完整改后内容:

```ts
import { create } from 'zustand'

interface Account {
  userId: string
  username: string
}

interface GameState {
  account: Account | null
  save: any | null
  currentBattle: any | null
  isLoading: boolean

  setAccount: (a: Account | null) => void
  clearAccount: () => void
  setSave: (save: any) => void
  setCurrentBattle: (battle: any) => void
  setLoading: (loading: boolean) => void
}

export const useGameStore = create<GameState>((set) => ({
  account: null,
  save: null,
  currentBattle: null,
  isLoading: false,

  setAccount: (a) => set({ account: a }),
  clearAccount: () => set({ account: null }),
  setSave: (save) => set({ save }),
  setCurrentBattle: (battle) => set({ battle }),
  setLoading: (isLoading) => set({ isLoading }),
}))
```

- [ ] **Step 1: 用 Write 工具替换文件**

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/stores/gameStore.ts
git commit -m "refactor(web): gameStore 加 account 字段 + clearAccount,删除 userId"
```

### Task 15: 新增 LoginPage

**Files:**
- Create: `apps/web/src/pages/LoginPage/index.tsx`

- [ ] **Step 1: 创建 `apps/web/src/pages/LoginPage/index.tsx`(完整内容)**

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../../stores/gameStore'
import { BindLegacySaveModal } from '../../components/BindLegacySaveModal'

const API = '/api'
const LEGACY_KEY = 'hero-legend-userId'
const USERNAME_RE = /^[a-zA-Z0-9_-]{3,20}$/

export function LoginPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bind, setBind] = useState<{ open: boolean; oldUserId: string }>({ open: false, oldUserId: '' })

  const submit = async () => {
    setError('')
    if (!USERNAME_RE.test(username)) {
      setError('用户名需 3-20 字符,允许字母/数字/下划线/横线')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位')
      return
    }
    setBusy(true)
    try {
      const path = tab === 'login' ? '/auth/login' : '/auth/register'
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? '请求失败')
        return
      }
      // 拉 /me 拿账户(其实响应里也有 userId/username,但 /me 是统一入口)
      const meRes = await fetch(`${API}/auth/me`, { credentials: 'include' })
      const me = await meRes.json()
      useGameStore.getState().setAccount({ userId: me.userId, username: me.username })
      // 旧 localStorage 兜底
      const localId = localStorage.getItem(LEGACY_KEY)
      if (localId && localId !== me.userId) {
        setBind({ open: true, oldUserId: localId })
      } else {
        navigate('/city')
      }
    } catch (e: any) {
      setError(`网络错误: ${e?.message ?? ''}`)
    } finally {
      setBusy(false)
    }
  }

  const handleBindSuccess = () => {
    localStorage.removeItem(LEGACY_KEY)
    setBind({ open: false, oldUserId: '' })
    navigate('/city')
  }
  const handleBindSkip = () => {
    localStorage.removeItem(LEGACY_KEY)
    setBind({ open: false, oldUserId: '' })
    navigate('/city')
  }
  const handleBindCancel = () => {
    setBind({ open: false, oldUserId: '' })
    navigate('/city')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', gap: '20px', background: 'var(--bg-dark)',
    }}>
      <h1 style={{ fontSize: '40px', color: 'var(--text-gold)', letterSpacing: '8px' }}>英雄传奇</h1>
      <div style={{ display: 'flex', gap: '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-wood)' }}>
        {(['login', 'register'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError('') }}
            style={{
              padding: '8px 24px',
              background: tab === t ? 'var(--bg-light)' : 'var(--bg-medium)',
              color: tab === t ? 'var(--text-gold)' : 'var(--text-muted)',
              border: 'none',
              cursor: 'pointer',
              fontWeight: tab === t ? 'bold' : 'normal',
            }}
          >{t === 'login' ? '登录' : '注册'}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '320px' }}>
        <input
          placeholder="用户名 (3-20 字符,字母/数字/_/-)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={busy}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-wood)', background: 'var(--bg-medium)', color: 'var(--text-light)' }}
        />
        <input
          type="password"
          placeholder="密码 (≥6 位)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          onKeyDown={(e) => e.key === 'Enter' && !busy && submit()}
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid var(--border-wood)', background: 'var(--bg-medium)', color: 'var(--text-light)' }}
        />
        <button
          onClick={submit}
          disabled={busy}
          style={{
            padding: '12px', borderRadius: '4px',
            background: busy ? '#555' : 'var(--text-gold)',
            color: busy ? '#aaa' : '#000',
            border: 'none', cursor: busy ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >{busy ? '处理中...' : (tab === 'login' ? '登录' : '注册')}</button>
        {error && (
          <div style={{ padding: '8px', background: 'rgba(255,68,68,0.15)', color: '#ff6b6b', borderRadius: '4px', fontSize: '13px', textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
      <BindLegacySaveModal
        open={bind.open}
        oldUserId={bind.oldUserId}
        onSuccess={handleBindSuccess}
        onSkip={handleBindSkip}
        onCancel={handleBindCancel}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/LoginPage/index.tsx
git commit -m "feat(web): LoginPage 登录/注册二合一表单"
```

### Task 16: 新增 BindLegacySaveModal 组件

**Files:**
- Create: `apps/web/src/components/BindLegacySaveModal.tsx`

- [ ] **Step 1: 创建 `apps/web/src/components/BindLegacySaveModal.tsx`**

```tsx
import { useState } from 'react'

const API = '/api'

interface Props {
  open: boolean
  oldUserId: string
  onSuccess: (migrated: { heroes: number; treasures: number; heroStones: number; materials: number; treasurePieces: number }) => void
  onSkip: () => void
  onCancel: () => void
}

export function BindLegacySaveModal({ open, oldUserId, onSuccess, onSkip, onCancel }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  const handleBind = async () => {
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`${API}/auth/bind`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldUserId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? data.error ?? '绑定失败')
        return
      }
      onSuccess((data as any).migrated ?? { heroes: 0, treasures: 0, heroStones: 0, materials: 0, treasurePieces: 0 })
    } catch (e: any) {
      setError(`网络错误: ${e?.message ?? ''}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '440px', maxWidth: '92vw',
          background: 'var(--bg-medium)', border: '1px solid var(--border-gold)',
          borderRadius: '8px', padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}
      >
        <h3 style={{ color: 'var(--text-gold)', margin: 0 }}>检测到本地存档</h3>
        <p style={{ color: 'var(--text-light)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
          你之前用临时 ID <code style={{ color: 'var(--text-gold)' }}>{oldUserId}</code> 玩过。
          要把那份存档(英雄、宝具、材料等)并入当前账号吗?
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '12px', margin: 0 }}>
          绑定后会用该账号覆盖原匿名存档,放弃则原匿名存档丢失。
        </p>
        {error && (
          <div style={{ padding: '8px', background: 'rgba(255,68,68,0.15)', color: '#ff6b6b', borderRadius: '4px', fontSize: '12px' }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{ padding: '8px 14px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-wood)', borderRadius: '4px', cursor: 'pointer' }}
          >取消</button>
          <button
            onClick={onSkip}
            disabled={busy}
            style={{ padding: '8px 14px', background: 'transparent', color: '#ff6b6b', border: '1px solid #ff6b6b', borderRadius: '4px', cursor: 'pointer' }}
          >放弃旧存档</button>
          <button
            onClick={handleBind}
            disabled={busy}
            style={{
              padding: '8px 14px',
              background: busy ? '#555' : 'var(--text-gold)',
              color: busy ? '#aaa' : '#000',
              border: 'none', borderRadius: '4px',
              cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >{busy ? '处理中...' : '绑定'}</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/BindLegacySaveModal.tsx
git commit -m "feat(web): BindLegacySaveModal 绑定旧 userId 存档"
```

### Task 17: MainPage 改为启动判 /me + /login 路由 + +路由

**Files:**
- Modify: `apps/web/src/pages/MainPage.tsx`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: 替换 `apps/web/src/pages/MainPage.tsx` 完整内容**

```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../stores/gameStore'

const API = '/api'

export function MainPage() {
  const navigate = useNavigate()
  const setAccount = useGameStore((s) => s.setAccount)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`${API}/auth/me`, { credentials: 'include' })
        if (cancelled) return
        if (res.ok) {
          const me = await res.json()
          setAccount({ userId: me.userId, username: me.username })
          navigate('/city', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch {
        if (!cancelled) navigate('/login', { replace: true })
      } finally {
        if (!cancelled) setChecking(false)
      }
    })()
    return () => { cancelled = true }
  }, [setAccount, navigate])

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', color: 'var(--text-muted)',
    }}>
      {checking ? '载入中…' : ''}
    </div>
  )
}
```

- [ ] **Step 2: 在 `apps/web/src/main.tsx` 加 /login 路由**

找到 `const MainPage = lazy(...)` 那一行附近,加:

```tsx
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
```

在 `<Routes>` 内加:

```tsx
<Route path="/login" element={<LoginPage />} />
```

(放在 `<Route path="/" ...>` 之前或之后都 OK。)

- [ ] **Step 3: 浏览器手测**

1. 清 cookie + localStorage,打开 http://localhost:5173 → 应自动跳 /login
2. 注册一个账号 → 跳 /city
3. 关浏览器再开 → 仍在 /city(cookie 持续)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/MainPage.tsx apps/web/src/main.tsx
git commit -m "feat(web): MainPage 启动判 /me + 加 /login 路由"
```

### Task 18: 把 10+ 个 fetch 调用点的 userId 去掉

**Files:**
- Modify: 10+ 个文件 `apps/web/src/pages/*/index.tsx`

旧模式:
```ts
const API = '/api'
const userId = useGameStore.getState().userId // ❌ 不存在了
fetch(`${API}/save/${userId}`, ...)
fetch(`${API}/hero/equip-treasure/${userId}/${instanceId}`, ...)
```

新模式:
```ts
const API = '/api'
fetch(`${API}/save`, { credentials: 'include' })  // 不带 userId
fetch(`${API}/hero/equip-treasure/${instanceId}`, {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ slotType, slotIndex, treasureId }),
})
```

> 重要:每个 fetch 都要加 `credentials: 'include'`(否则 cookie 不带回)。`fetch` 默认 same-origin 会带 cookie,但显式写更安全。

涉及文件清单(按 Grep `hero-legend-userId` 找出来):

| 文件 | 改法 |
|------|------|
| `apps/web/src/pages/BattlePage.tsx` | 删 userId 取值,所有 fetch 去 userId + credentials: 'include' |
| `apps/web/src/pages/BackpackPage/index.tsx` | 同上 |
| `apps/web/src/pages/StageSelectPage.tsx` | 同上 |
| `apps/web/src/pages/CityPage/index.tsx` | 同上 |
| `apps/web/src/pages/TreasureWorkshopPage/index.tsx` | 同上 |
| `apps/web/src/pages/SmelterPage/index.tsx` | 同上 |
| `apps/web/src/pages/TreasurePavilionPage/index.tsx` | 同上 |
| `apps/web/src/pages/HeroPage/index.tsx` | 同上 |
| `apps/web/src/pages/RecruitPage/index.tsx` | 同上 |

- [ ] **Step 1: 用 Grep 工具列出所有 `localStorage.getItem('hero-legend-userId')` 与 fetch 中含 `${userId}` 的位置**

```bash
# 找 localStorage 调用
grep -rn "localStorage.getItem('hero-legend-userId')" apps/web/src
# 找 userId 出现在 fetch template literal
grep -rn '${userId}' apps/web/src
```

- [ ] **Step 2: 对每个文件依次改:**

改法统一:
- 删除 `const userId = localStorage.getItem('hero-legend-userId') || ''`(或改成空)
- 每个 fetch:
  - URL 模板里去掉 `${userId}` 段
  - 加 `credentials: 'include'`
  - 如果是 GET 简单拿数据,加 `credentials: 'include'` 即可

- [ ] **Step 3: 编译验证(`pnpm --filter @hero-legend/web build` 如果能通过)**

> 注意:MEMORY 提到 web build 有 tsc 错误与 HeroStoneIcon 缺失,这两个旧问题与本次无关。Vite dev 不做 tsc,直接 `pnpm dev` 应能起。

- [ ] **Step 4: 浏览器手测每页:登录后访问 /city /backpack /stages /recruit /heroes /smelter /treasure-workshop /treasure-pavilion 都能正常加载数据**

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/
git commit -m "refactor(web): 各页 fetch 去 :userId 段 + 加 credentials: include"
```

---

## Commit 4 — CityPage 退出登录 + 收尾

### Task 19: CityPage 加退出登录按钮

**Files:**
- Modify: `apps/web/src/pages/CityPage/index.tsx`

- [ ] **Step 1: 在 CityPage 文件顶部 imports 段加 `useGameStore` 和 `useNavigate` (若已存在则跳过)**

- [ ] **Step 2: 在 CityPage 组件底部(最末的 `</div>` 之前),加:**

```tsx
const account = useGameStore((s) => s.account)
const clearAccount = useGameStore((s) => s.clearAccount)
const navigate = useNavigate()

const handleLogout = async () => {
  if (!confirm('确定要退出登录吗?')) return
  await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
  clearAccount()
  navigate('/login')
}

// ...

// 在主 container 末尾、</div> 收尾之前
<div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
  <button
    onClick={handleLogout}
    style={{
      padding: '6px 14px', fontSize: '12px',
      background: 'transparent', color: 'var(--text-muted)',
      border: '1px solid var(--border-wood)', borderRadius: '4px',
      cursor: 'pointer',
    }}
  >退出登录 ({account?.username})</button>
</div>
```

> 真实落点要按照 CityPage 的现有 JSX 结构 — 阅读原文确定最佳插入位置(底部 footer row)。

- [ ] **Step 3: 浏览器手测**

1. 登录后进入 /city,看到「退出登录 (xxx)」按钮
2. 点 → confirm → 跳 /login
3. 再访问 /heroes 应被踢回 /login

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/pages/CityPage/index.tsx
git commit -m "feat(web): CityPage 加退出登录按钮"
```

---

## 总验收 checklist(实施完后)

- [ ] 后端:`pnpm --filter @hero-legend/server build` 通过
- [ ] 前端:`pnpm --filter @hero-legend/web build` 通过(若上游 tsc 错误与本次无关,可跳过)
- [ ] 后端 curl:`register` / `login` / `me` / `bind` / `logout` 5 个端点都按预期返回
- [ ] 后端 curl:未登录调 `/api/save` 等业务接口 → 401
- [ ] 前端:开新会话 → 自动跳 /login
- [ ] 前端:注册 → 跳 /city 看到完整初始资源
- [ ] 前端:登录后访问所有页(/backpack /stages 等)都能加载数据
- [ ] 前端:把 localStorage.hero-legend-userId 塞个老值,刷新后注册 → 应弹 BindLegacySaveModal
- [ ] 前端:点 modal 绑定 → 跳 /city,老英雄/宝具可见
- [ ] 前端:关浏览器再开 → 仍登录
- [ ] 前端:CityPage 退出登录按钮 → 回 /login

---

## 拆分 / 提交顺序汇总

| Commit | 内容 | 覆盖 Task |
|--------|------|-----------|
| 1 | 后端 auth 骨架 | Task 1, 2, 3, 4, 5 |
| 2 | 7 controller 加 AuthGuard + 去 :userId | Task 6, 7, 8, 9, 10, 11, 12, 13 |
| 3 | 前端 LoginPage + MainPage + store + fetch 改造 | Task 14, 15, 16, 17, 18 |
| 4 | 退出登录按钮 | Task 19 |

> 共 4 commit。顺序很重要:后端先就绪,前端 fetch 改造放在 store 之后(login page 之后)— 否则中间步骤会大量 fetch broken 但能 build 通过,debug 痛苦。
