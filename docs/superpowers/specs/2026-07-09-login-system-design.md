# 登录系统设计

> 创建于 2026-07-09,本地时间。

## 背景

当前项目用一个写死的字符串当 userId:首次打开页面生成 `user-${Date.now()}`,存到 `localStorage.hero-legend-userId`,服务端用这个 key 拉 `SaveDoc`。玩家换个浏览器/清缓存就等于新建账号,服务端没有"账号"概念,无法登录、登出、找回。这一档落地一个最小可用的账号系统。

## 决策记录

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 登录方式 | 用户名 + 密码 | 用户选"账号密码" |
| session 形态 | httpOnly cookie + express-session (memory store) | 用户选"cookie session";dev 单进程够用,生产可后续接 Redis |
| 字段 | username + passwordHash + userId + createdAt | 用户选"无邮箱无手机号",无重置密码 |
| 旧存档迁移 | 注册/登录后弹出 modal,服务端 bind 端点合并 | 用户选"绑定现有 userId 账号" |
| 游客模式 | **不保留**(强制登录) | 用户选"改动最小" |
| 现有 controller | 全部去掉 `:userId` 路径参数,从 session 读 | 用户选"推进快";一次性全切 |
| :userId 留存于 service 层 | 保留,内部仍接收 userId 字符串 | controller 层取 session 后透传,service 不变 |
| CSRF | SameSite=Lax cookie (默认够防跨站表单) | 本项目无第三方表单提交场景 |
| 密码 hashing | bcrypt cost=10 | NestJS 生态标准 |
| 旧 userId 命名 | `legacy` / `localId`,本地仍叫 `hero-legend-userId` 兼容 | 改动小 |

> 已知未做:Redis session store、找回密码、邮箱/手机号验证、OAuth、密码复杂度策略、暴力破解限流 — 留后续 issue。

## 架构

```
浏览器                              NestJS server
  │                                       │
  │── POST /api/auth/register ──────────> │ 创建 Account + SaveDoc
  │<── Set-Cookie (httpOnly) ────────────│   + Set-Cookie 同时设 session
  │                                       │
  │── POST /api/auth/login ────────────> │ bcrypt 比对 → 写 session
  │<── Set-Cookie ─────────────────────│
  │                                       │
  │── GET /api/save (cookie 自带) ─────> │ AuthGuard 校验 session
  │<── JSON SaveDoc ────────────────────│
  │                                       │
  │── POST /api/auth/bind {oldUserId} ─> │ 旧 SaveDoc 数据拷到新账号 → 删旧
  │<── {migrated...} ──────────────────│
```

`useShallow` 风格的依赖:新增 `auth` 模块,对现有 controller **不增加任何耦合**(它们只多挂一个 `AuthGuard`)。

## 设计 — 服务端

### 数据模型

**新 schema** `apps/server/src/modules/auth/account.schema.ts`:

```ts
@Schema()
export class AccountDoc extends Document {
  @Prop({ required: true, unique: true, index: true }) username: string
  @Prop({ required: true }) passwordHash: string
  @Prop({ required: true, unique: true }) userId: string   // uuid;同时也是 SaveDoc.userId
  @Prop({ default: Date.now }) createdAt: number
}

export const AccountSchema = SchemaFactory.createForClass(AccountDoc)
```

**新 module** `apps/server/src/modules/auth/auth.module.ts`:导出 `AccountSchema`、`AuthService`、`AuthController`、`AuthGuard`。

**新依赖** 加到 `apps/server/package.json`:
- `bcrypt` + `@types/bcrypt`
- `cookie-parser` + `@types/cookie-parser`
- `express-session` + `@types/express-session`
- `class-validator` 已有

### 端点

前缀 `/api/auth`,全部 json 入参出参。

| 方法 | 路径 | 入参 | 返回 |
|------|------|------|------|
| `POST /register` | `{username, password}` | 成功 200 `{success, userId, username}`,失败 400 `{error}` |
| `POST /login` | `{username, password}` | 成功 200 `{success, userId, username}`,失败 401 `{error}` |
| `POST /logout` | — | 200 `{success}` |
| `GET /me` | — | 已登录 200 `{userId, username}`,未登录 401 `{error}` |
| `POST /bind` | `{oldUserId}` | 成功 200 `{success, migrated: {heroes, treasures, heroStones, treasurePieces, materials}}`,失败 400/404 `{error}` |

#### 注册流程
1. 校验 username 格式 `^[a-zA-Z0-9_-]{3,20}$`、password 长度 ≥ 6
2. 失败 → `BadRequestException('INVALID_INPUT')`
3. 同名查重 → `ConflictException('USERNAME_TAKEN')`
4. `bcrypt.hash(password, 10)` → passwordHash
5. `userId = randomUUID()`
6. 新建 `AccountDoc` 持久化
7. `SaveService.createSave(userId)` 创建初始 SaveDoc
8. `req.session.userId = userId` + `req.session.username = username`
9. 返回 `{success: true, userId, username}`

#### 登录流程
1. 查 `AccountDoc` by username
2. 未找到 → `UnauthorizedException('INVALID_CREDENTIALS')` (不区分"用户名不存在"和"密码错误"防爆破探测)
3. `bcrypt.compare(password, passwordHash)` 失败 → 同上
4. `req.session.userId = account.userId`、`req.session.username = account.username`
5. 返回 `{success: true, userId: account.userId, username}`

#### bind 流程
1. AuthGuard 必须通过
2. 校验 `oldUserId` 与 session.userId 不同(防止误绑到自己)
3. 查 `SaveModel.findOne({userId: oldUserId})` 不存在 → 404 `LEGACY_SAVE_NOT_FOUND`
4. 旧 SaveDoc 整体读出 → 拆 userId 字段保留 → `$set` 全字段覆盖到 `userId: req.session.userId` 的 SaveDoc(必须已存在,因为登录时 createSave 已经 seed)
5. 删除旧 SaveDoc
6. 返回迁移量统计

#### AuthGuard

`apps/server/src/modules/auth/auth.guard.ts`:
```ts
@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    if (!req.session?.userId) throw new UnauthorizedException('NOT_LOGGED_IN')
    return true
  }
}
```

应用方式:每个现存 controller 加 `@UseGuards(AuthGuard)`,service 层不感知。

### main.ts 改造

新增 session 中间件:
```ts
import cookieParser from 'cookie-parser'
import session from 'express-session'
import * as express from 'express'

app.use(express.json())
app.use(cookieParser())
app.use(session({
  secret: process.env.SESSION_SECRET ?? 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,         // dev over http;生产建议 true
    maxAge: 7 * 24 * 3600 * 1000,
  },
  name: 'hl.sid',
}))
```

`AppModule` import `AuthModule`。

### 现有 controller 改造

7 个 controller 全部:
- 加 `@UseGuards(AuthGuard)`
- 删除 `@Param('userId') userId`
- 从 controller 函数体内 `const userId = req.session.userId`(需要先把 `req` 注入或者改用 `@Request()`)

> 注意 NestJS 不自动拿 session 字段做参数,需在 controller 用 `@Request() req: Request` 拿,或写一个 `@CurrentUserId()` 自定义装饰器(更干净,推荐)。

**推荐:加自定义装饰器** `apps/server/src/modules/auth/current-user.decorator.ts`:
```ts
export const CurrentUserId = createParamDecorator((_, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().session.userId
})
```

这样 controller 方法签名变:
```ts
@Post('equip-treasure/:instanceId')
async equip(@CurrentUserId() userId: string, @Param('instanceId') instanceId: string, @Body() body: ...) {
  return this.svc.equip(userId, instanceId, ...)
}
```

Routes 也对应去掉 `:userId`(全部依赖 `req.session.userId`,通过 `@CurrentUserId()` 注入):
- `GET /api/save/:userId` → `GET /api/save` (从 session 读;若不存在 → 返回 null,前端引导走 /register)
- `POST /api/save/:userId` → `POST /api/save` (updateSave,接收 update body)
- `POST /api/save/seed-debug/:userId` → `POST /api/save/seed-debug` (seeding 调试资源)
- `POST /api/hero/equip-treasure/:userId/:instanceId` → `POST /api/hero/equip-treasure/:instanceId`
- 其余类推,全部 controller 一个 commit 内全改

> 不再做自动 createSave on demand:getSave 返回 null 由前端处理(跳 /register 或重新登录)。新建存档唯一入口是 `POST /api/auth/register` 内部调用 `SaveService.createSave`。

### 测试

服务端 (NestJS e2e jest 或 supertest,沿用现有测试模式 — 若无则手测):
1. register → me 返回 username
2. 注册同 username → 409
3. login 错误密码 → 401
4. login → me 返回正确 userId
5. 未登录调 /api/save → 401
6. 登录后调 /api/save → 200
7. logout → 再 /api/auth/me → 401
8. bind 不存在的 oldUserId → 404
9. bind 已存在的旧存档 → 成功,新 save 的 heroes 数 = 旧存档
10. bind 第二次绑同一个 oldUserId → 404

## 设计 — 前端

### 新增 / 改动

| 文件 | 类型 | 内容 |
|------|------|------|
| `apps/web/src/pages/LoginPage/index.tsx` | 新增 | 登录/注册二合一页面 |
| `apps/web/src/pages/MainPage.tsx` | 改 | 启动时 fetch /api/auth/me,已登录 → /city,未登录 → /login |
| `apps/web/src/main.tsx` | 改 | 加 `/login` 路由 |
| `apps/web/src/stores/gameStore.ts` | 改 | 删除 userId,加 `account: {userId, username} \| null`,启动拉 /me 初始化 |
| 所有 `localStorage.getItem('hero-legend-userId')` 调用 | 改 | 改成从 store 取 (改动 = 大约 10 处) |

### LoginPage 流程

1. 顶部 logo + 标题「英雄传奇」
2. 两个 tab:**[登录] [注册]**,默认登录
3. 表单:username (input text) + password (input password) + 提交 button
4. 提交:
   - 客户端校验 (regex 一致)
   - 显示 loading + 按钮 disabled
   - 失败显示 toast 错误 (红色浮动)
5. 成功后:`fetch /api/auth/me` 拿账户 → 写 store → 跳 /city

### 绑定 modal

跳 /city 之前的 guard:

```tsx
// LoginPage handleSuccess() 内
const localId = localStorage.getItem('hero-legend-userId')
if (localId && localId !== account.userId) {
  setBindPrompt({ open: true, localId })
} else {
  navigate('/city')
}
```

Modal (`BindLegacySaveModal.tsx`):
- 题:**「检测到本地存档,要并入账号吗?」**
- 文案:「你的旧 userId 是 `user-1234…`,账号 `foo` 已登录。点确认会把该存档的所有英雄、宝具、材料拷到当前账号,然后删掉旧存档。」
- [绑定] [放弃旧存档] [取消]

| 选择 | 行为 |
|------|------|
| 绑定 | `POST /api/auth/bind {oldUserId: localId}` → 成功 toast 显示迁移量 → 删 localStorage → 跳 /city |
| 放弃 | 删 localStorage → 跳 /city |
| 取消 | 留在登录页 |

### 退出登录

主城 (CityPage) / 通用设置区域加一个「退出登录」按钮:弹 `confirm()` → `POST /api/auth/logout` → 清 store → 跳 `/login`。

最小修改:不做独立 /settings 页面,直接放 CityPage 底部。

### fetch 改动清单

所有现存 fetch 都要去掉路径里的 userId:
- `${API}/save/${userId}` → `${API}/save`
- `${API}/hero/equip-treasure/${userId}/${instanceId}` → `${API}/hero/equip-treasure/${instanceId}`

> 全部 10+ 个调用点一次性批量改。cookie 自动随同源请求带回。

## 文件结构(本次新增 / 改动)

```
apps/server/src/modules/auth/                       ← 新增整个目录
├── account.schema.ts                               (新)
├── auth.service.ts                                 (新)
├── auth.controller.ts                              (新)
├── auth.guard.ts                                   (新)
├── auth.module.ts                                  (新)
└── current-user.decorator.ts                       (新)
apps/server/src/main.ts                             (改:装 cookieParser + session)
apps/server/src/app.module.ts                       (改: import AuthModule)
apps/server/src/modules/{save,hero,battle,recruit,treasure,treasurePavilion,stage}/*.controller.ts
                                                   (7 个 controller 各改一次,加 AuthGuard + 去 userId)
apps/server/package.json                            (改: 加 bcrypt / cookie-parser / express-session)

apps/web/src/pages/LoginPage/index.tsx              (新)
apps/web/src/components/BindLegacySaveModal.tsx     (新)
apps/web/src/pages/MainPage.tsx                     (改: 启动判登录)
apps/web/src/main.tsx                               (改: + /login 路由)
apps/web/src/stores/gameStore.ts                    (改: userId → account)
apps/web/src/pages/*/index.tsx (10+ 个 fetch 点)    (改: 去掉 userId 路径段 + 改从 store 取)
```

## 测试(前端 / 手测为主)

1. 清缓存 → 打开站点 → 应该立刻重定向到 /login
2. 注册 → 跳 /city + 角色资源齐全
3. 注册同名 → 报错 `USERNAME_TAKEN`
4. 登出 → 回到 /login,刷新后再访问其他页面也要被踢回
5. 把 localStorage.hero-legend-userId 手动塞一个,刷新后登录 → 应弹绑 modal
6. 点绑定 → 跳 /city + 老存档的 items 可见
7. 关浏览器再开 → 仍在登录态(7 天 cookie)
8. 删除 cookie → 再访问 → 应跳 /login

## 风险与未决项

- **多标签页同步**:开 A 标签登出,B 标签不知情。本次不做。
- **session store**:dev 用内存,服务端重启所有用户被踢。dev 可接受。
- **同浏览器多账号**:登 A 再登 B,旧的 A 账号 session 还在 cookie 里 — 但下次刷新会被 B 覆盖。可后续加切换账号 UI。
- **GET /api/save 改无参**:若现有前端有调 GET /api/save/:userId,本次要么重构成 GET /无参;若保留 GET 也行(只是没 session 取不到内容)。本次统一改无参。

## 实施拆分(本 spec 对应 plan 的一部分)

1. 后端骨架:`auth` 模块 + session + main.ts 接线
2. 后端改造:7 个 controller 加 `@UseGuards(AuthGuard)` + 去 `:userId` 段 + 改用 `@CurrentUserId()`
3. 前端 `LoginPage` + `MainPage` 重定向 + `/auth/me` 初始化
4. 前端 store 改造 + 10+ fetch 调用点去 userId 段
5. `BindLegacySaveModal` + `/auth/bind` 端点
6. CityPage 加退出登录按钮
7. 提交:可分 3 个 commit (后端 / 前端 login / 前端老存档迁移)
