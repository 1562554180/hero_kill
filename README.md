# 英雄传奇 (Hero Legend)

一款基于网页的卡牌对战游戏，灵感来源于经典桌游"英雄杀"。玩家招募英雄、装备宝具（主印/辅印），通过闯关模式挑战关卡。

## 技术栈

- **前端**: React 19 + Vite + Zustand + TypeScript
- **后端**: NestJS + MongoDB (Mongoose)
- **游戏引擎**: 纯 TypeScript，客户端运行，异步回调驱动
- **构建**: pnpm monorepo + Turborepo

## 快速开始

```bash
# 安装依赖
pnpm install

# 构建所有包（修改 packages/* 后需重新构建）
pnpm build

# 启动后端（需要 MongoDB 运行在 localhost:27017）
pnpm --filter @hero-legend/server dev

# 启动前端（新终端）
pnpm --filter @hero-legend/web dev
```

前端访问 http://localhost:5173，后端 API 在 http://localhost:3000。

## 项目结构

```
packages/
  shared-types/    # 所有 TypeScript 接口定义（Hero, Card, Skill, Treasure 等）
  game-data/       # 静态数据（英雄定义、卡牌堆、关卡、宝具定义）
  game-engine/     # 核心游戏逻辑（Game, Player, CardDeck, EventBus, 回合阶段）
  ai-engine/       # AI 决策引擎（敌方英雄自动出牌）

apps/
  server/          # NestJS 后端 REST API
  web/             # React 前端 SPA
```

### 依赖关系

```
shared-types ← game-data ← game-engine ← ai-engine
     ↑              ↑            ↑              ↑
     └──── server (全部4个) ────┘    web (前3个)
```

## 核心玩法

- **战斗引擎**: 完全在浏览器端运行，通过 `playerActionHandler` 异步回调与 UI 交互
- **回合制**: 出牌阶段 → 判定阶段 → 弃牌阶段，支持杀、闪、药、锦囊等卡牌
- **宝具系统**: 主印（100%触发）+ 辅印（30%概率触发），提供被动技能加成
- **闯关模式**: 徐州 → 扬州 → 益州，逐步解锁更难关卡

## 测试

```bash
pnpm --filter @hero-legend/game-engine test
```

## 许可

私有项目
