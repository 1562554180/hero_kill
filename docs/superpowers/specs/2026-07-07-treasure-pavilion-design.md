# 珍宝阁 (Treasure Pavilion) 设计

**日期**: 2026-07-07
**作者**: 协同设计 (用户 + Claude)
**状态**: 待审阅

## 1. 功能概要

主城里新增一张**建筑卡片「珍宝阁」**(不可升级), 进入后是抽卡页面。两种模式: **抽卡** 和 **兑换商城**, 另加 **碎片合成** 入口。

### 抽卡

**货币**: 宝具券 (`treasureTicket`, 新材料类型), 单抽 1 张 / 十连 9 张。

**十连保底**: 第 10 件**强制**为 3★宝具 (额外补, 不影响其他 9 件的随机)。

**抽卡产出** (权重总和 = 100.0):

| 产出 | 概率 | 行为 |
|---|---|---|
| 1★宝具 | 25.8% | 直接进 `save.treasures` |
| 2★宝具 | 4.2% | 同上 |
| 3★宝具 | 1.4% | 同上 |
| 4★宝具 | 1.8% | 同上 |
| 5★宝具 | 0.5% | 同上 |
| **万能碎片** | 30% | `treasureFragment` 材料 += 1~3 |
| 3★宝具碎片 | 16.8% | 随机选 3★宝具 → `treasurePiece[treasureId] += 1~3` |
| 4★宝具碎片 | 12.5% | 同上 (4★) |
| 5★宝具碎片 | 7% | 同上 (5★) |

### 关键概念: 两种碎片

- **万能碎片 (treasureFragment)**: 通用货币。来源: 分解任意宝具 / 抽卡的 30% 概率。用途: 兑换商城。
- **指定宝具碎片 (treasurePiece)**: 按宝具区分 (例: "法家碎片")。来源: 抽卡的 16.8%/12.5%/7% 概率。用途: 100 个合成对应宝具。

合成只能用指定碎片, 兑换只能用万能碎片, 互不通用。

### 兑换商城

8 种宝具, 用万能碎片 (`treasureFragment`) 兑换:

| 宝具 | 星级 | 价格 (万能碎片) |
|---|---|---|
| 烽火 | 4★ | 4000 |
| 醉酒 | 4★ | 4000 |
| 控局 | 5★ | 5000 |
| 法家 | 5★ | 5000 |
| 国色 | 5★ | 5000 |
| 强化·伍 | 5★ | 5000 |
| 精准·伍 | 5★ | 5000 |
| 杀贪·伍 | 5★ | 5000 |

### 碎片合成

`treasurePiece[treasureId] >= 100` → 扣 100 → 加宝具到 `save.treasures` (生成新 instanceId)。

## 2. 数据模型变更

### `shared-types/save.ts`

新增 `Material.type` 值:

```typescript
| 'treasureTicket'          // 珍宝阁门票
```

新增 `UserSave` 字段:

```typescript
/** 指定宝具碎片: 每件宝具的碎片数量 (合成用) */
treasurePiece: { treasureId: string; amount: number }[]
```

**注意命名**: 现有 `treasureFragment` (通用材料, 分解产物) = 万能碎片, 保持语义不变。新字段 `treasurePiece` 表示按宝具区分的指定碎片。两者是**不同**的产物, 不可混淆。

### `apps/server/src/modules/save/save.schema.ts`

对应加两个字段:
- `treasureTicket` 走现有 `materials` 数组, 不需要单独 schema 字段。
- `treasurePiece` 顶级字段, 默认 `[]`:

```typescript
@Prop({ type: [{ treasureId: String, amount: Number }], default: [] })
treasurePiece: { treasureId: string; amount: number }[]
```

### 初始存档

新用户注册时:
- `materials` 加 `{ type: 'treasureTicket', amount: 50 }`
- `treasurePiece: []` (默认)

### 关卡奖励

`shared-types/stage.ts` 的 `StageReward` 加 `treasureTicketChance?: number`, 各 stage 定义填 0.2~0.4。生成奖励时按概率加 1 张 `treasureTicket`。

## 3. 数据层 (game-data)

新文件 `packages/game-data/src/treasures/treasure-pavilion.ts`:

```typescript
// 兑换商城列表
export const TREASURE_PAVILION_EXCHANGE_LIST = [
  { treasureId: 'treasure-feng-huo',      star: 4, price: 4000 },
  { treasureId: 'treasure-zui-jiu',       star: 4, price: 4000 },
  { treasureId: 'treasure-kong-ju',       star: 5, price: 5000 },
  { treasureId: 'treasure-fa-jia',        star: 5, price: 5000 },
  { treasureId: 'treasure-guo-se',        star: 5, price: 5000 },
  { treasureId: 'treasure-qiang-hua-5',   star: 5, price: 5000 },
  { treasureId: 'treasure-jing-zhun-5',   star: 5, price: 5000 },
  { treasureId: 'treasure-sha-zhi-tan-5', star: 5, price: 5000 },
] as const

export const TREASURE_COMPOSE_COST = 100

// 抽卡权重表 (和 = 100)
export const TREASURE_PAVILION_RATES = {
  treasureStar1: 25.8,
  treasureStar2: 4.2,
  treasureStar3: 1.4,
  treasureStar4: 1.8,
  treasureStar5: 0.5,
  universalFragment: 30.0,
  pieceStar3: 16.8,
  pieceStar4: 12.5,
  pieceStar5: 7.0,
} as const

export type PavilionSlotType =
  | 'star1' | 'star2' | 'star3' | 'star4' | 'star5'
  | 'universal' | 'piece3' | 'piece4' | 'piece5'

export function rollTreasurePavilionSlot(): PavilionSlotType
export function randomTreasureIdByStar(star: 1|2|3|4|5): string  // 从 treasureDefinitions 随机
```

`treasure-definitions.ts` 需按星级索引, 加速 `randomTreasureIdByStar`。可用 `Map<star, treasureId[]>` 缓存。

## 4. 后端

### 新模块 `apps/server/src/modules/treasure-pavilion/`

- `treasure-pavilion.module.ts`
- `treasure-pavilion.controller.ts`
- `treasure-pavilion.service.ts`

### API

```
POST /api/treasure-pavilion/draw/:userId       body: { count: 1 | 10 }
POST /api/treasure-pavilion/compose/:userId    body: { treasureId }
POST /api/treasure-pavilion/exchange/:userId   body: { treasureId }
GET  /api/treasure-pavilion/info/:userId       (返回碎片/券/可兑列表)
```

### 抽卡逻辑 (`draw`)

1. 校验 `count ∈ {1, 10}`。
2. 取存档, 校验 `treasureTicket` 余额 (1 或 9), `spendMaterial('treasureTicket', cost)`。
3. 单抽按全表权重抽一次; 十连循环 10 次:
   - 前 9 次: 按全表权重 `rollTreasurePavilionSlot()`。
   - 第 10 次: 强制走 `star3` 档 (跳过权重, 直接给一件 3★宝具)。
4. 每抽结算 (按 `PavilionSlotType` 分类):
   - `starN` (`1`~`5`): `randomTreasureIdByStar(N)` → 新宝具实例 (新 instanceId) 加入 `save.treasures`。
   - `universal`: `treasureFragment` 材料 += `rand(1,3)`。
   - `pieceN` (`3`~`5`): `randomTreasureIdByStar(N)` → `treasurePiece` 找/建该 `treasureId` 项, `+= rand(1,3)`。
5. 一次性持久化 (避免多次 round-trip)。
6. 返回所有抽得项的明细 (前端做动画):
   ```typescript
   {
     success: true,
     results: Array<
       | { kind: 'treasure'; treasureId: string; instanceId: string; star: number }
       | { kind: 'universal'; amount: number }
       | { kind: 'piece'; treasureId: string; amount: number }
     >,
     remainingTickets: number,
   }
   ```

### 合成 (`compose`)

1. 取 `treasurePiece[treasureId]`, 校验 `amount >= 100`。
2. 扣 100。
3. 用 `treasureDefinitions` 找定义, 生成新 `Treasure` (新 instanceId, level=0, count=1) 加入 `save.treasures`。
4. 返回新宝具。

### 兑换 (`exchange`)

1. 在 `TREASURE_PAVILION_EXCHANGE_LIST` 找到该 `treasureId` 及其 `price`。
2. 校验 `treasureFragment` 余额。
3. `spendMaterial('treasureFragment', price)`。
4. 生成新 `Treasure` 加入 `save.treasures`。
5. 返回新宝具 + 剩余万能碎片。

### 信息查询 (`info`)

返回前端需要的展示数据:
```typescript
{
  ticketAmount: number,
  universalFragment: number,
  treasurePiece: { treasureId, amount }[],
  exchangeList: typeof TREASURE_PAVILION_EXCHANGE_LIST,
}
```

## 5. 前端

### 路由

`/treasure-pavilion` (新页)。

### 入口

`apps/web/src/pages/CityPage/index.tsx`:
- 在建筑网格里增加一张**「珍宝阁」卡片**。
- 显示名字 + 简介, 但**无 Lv.X 显示, 无升级按钮**。
- 只有"进入"按钮 → `navigate('/treasure-pavilion')`。

实现方式: 卡片渲染时按 `b.type === 'treasurePavilion'` 走特殊分支, 不显示等级/升级。或在 `save.buildings` 里加一条 `{ type: 'treasurePavilion', level: 1 }` (但 level 永远不动, 也不消耗金币升级)。

**推荐**: 不在 `save.buildings` 加, 而是作为 CityPage 的静态渲染项 (类似 "关卡"/"英雄"/"背包" 这种导航按钮), 但样式上做成卡片风格与建筑网格对齐。

### 新页面 `apps/web/src/pages/TreasurePavilionPage/`

布局:
- 顶部: 标题 + 宝具券数 + 万能碎片数 + 关闭按钮 (回主城)
- Tab 切换: **抽卡** / **兑换** / **碎片合成**

**抽卡 Tab**:
- 概率表 (展开/折叠)
- 单抽 / 十连按钮 (按钮上显示消耗: "单抽 (×1)" / "十连 (×9)")
- 触发后展示抽卡动画, 逐件揭晓

**兑换 Tab**:
- 8 张宝具卡片网格
- 每张显示: 名字 + 星级 + 价格 + "兑换"按钮
- 余额不足时按钮置灰

**碎片合成 Tab**:
- 列出 `treasurePiece` 里 `amount >= 1` 的项 (从 0 到 100 的进度条)
- 达到 100 时按钮可点 (合成), 否则置灰

### 抽卡动画

复用现有 `DrawAnimation` 组件, 但需扩展:
- 现有只支持英雄石 (单一类型)。
- 新增支持展示: 宝具 (复用 `HeroBattleCard` 同款宝具视觉) / 万能碎片图标 / 指定碎片图标 (该宝具小图 + "碎片×N")。
- 抽到 10 件按顺序展示, 可点击逐件揭晓或自动播放。
- 提供"继续抽"和"关闭"按钮。

考虑: 是否单独抽 `TreasureDrawAnimation` 组件, 还是扩展 `DrawAnimation`? 优先**扩展** (复用 continue/close 流), 但若 types/signs 冲突大, 再拆分。

## 6. 范围 (YAGNI - 这次不做)

- 保底计数器 / 大保底 (除了十连必出 3★)
- 抽卡历史 / 抽卡日志
- 抽卡累积次数奖励
- 抽卡十连特效动画 (用现有 DrawAnimation 即可)
- 关卡掉率动态调整
- 珍宝阁建筑等级影响 (无等级)
- 兑换商城货架空位 / 上架 / 下架管理 (固定 8 种)

## 7. 测试与验证

按用户偏好不写自动化测试, 仅:
1. `pnpm build` 通过 (类型检查)。
2. 手动验证: 注册新档 → 50 张券到位 → 单抽/十连 → 各类产出 → 分解产物 → 兑换 → 100 碎片合成。

## 8. 实现顺序建议

1. `shared-types`: 新增 `treasureTicket` material 类型 + `treasurePiece` save 字段 + `treasureTicketChance` stage 字段。
2. `game-data`: 抽卡权重表 + 兑换列表 + 工具函数 + 初始存档 50 张。
3. `save.schema.ts`: 加 `treasurePiece` schema 字段。
4. `save.service.ts`: 加 `addTreasurePiece` / `getTreasurePiece` 之类的 helper。
5. 后端 `treasure-pavilion` 模块: controller + service + 三个 API。
6. 关卡掉落: 在 stage-definitions 填概率 + reward 生成逻辑。
7. 前端 CityPage 入口卡片。
8. 前端 TreasurePavilionPage 页面 (抽卡 / 兑换 / 合成三个 tab)。
9. 前端 DrawAnimation 扩展 (宝具 / 碎片展示)。
10. 全链路手测 + commit。
