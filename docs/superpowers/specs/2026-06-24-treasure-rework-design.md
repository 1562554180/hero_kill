# 宝具系统重构 — Spec

**日期**: 2026-06-24
**会话**: 宝具强化 / 主印扩展 / 等级转移
**状态**: 设计已确认, 待用户审阅后进入实施规划

## 目标

把当前"宝具 = 27 主印 (100% 触发, 3-5★) + 18 辅印 (硬编码 30% 触发, 仅 2★)"的系统,扩展为可强化的宝具系统:

- **3 个新主印** (身强 / 穿杨 / 运筹): 增加 HP / 攻击距离 / 手牌上限,各 1-5★ 五个等级
- **辅印星级扩展**: 现有 18 个辅印 × 5 星 = 90 条数据,触发率随星级递增
- **辅印强化系统**: 强化符 + 金币升级,1-45 级,成功/失败动画区分
- **强化次数上限**: 每辅印最多 50 次升级机会
- **幸运石系统**: 强化时可选加 0-6 颗幸运石,每颗 +5% 成功率
- **等级转移系统**: 强化次数耗尽时,可用转移符把已强化等级转移给新辅印

预期效果: 给辅印长期成长线,避免"30% 触发"的随机性被吐槽;给中后期玩家"投资保值"机制(等级转移)。

## 背景

当前系统:
- 主印从 `generateInitialTreasures()` 拿 27 条中的 2 条,玩家挑一条装备
- 辅印全是 2★,30% 触发率,无法升级
- 没有强化 / 升星 / 转移机制
- Game engine 在 `rollSubTreasure` 用硬编码 0.30

新方案引入"强化"循环: 玩家拿到辅印 → 用强化符 + 金币升级 → 触发率提升 → 强化次数耗尽后可转移给新辅印。

## 范围

### 包含

- 3 个新主印 (身强 / 穿杨 / 运筹) × 5 星 = 15 条新数据
- 18 个辅印 × 5 星 = 90 条新数据 (替换现有 18 条)
- `Treasure` 接口加 `level: number` 和 `enhanceCount: number` 字段
- `Material.type` 加 `luckyStone` 和 `transferTalisman`
- 新建 `apps/server/src/modules/treasure/` 模块 (controller + service)
- 新端点 `POST /api/treasure/upgrade/:userId/:treasureId` (body 带 luckyStones)
- 新端点 `POST /api/treasure/transfer-level/:userId`
- 老存档迁移: `level=0` / `enhanceCount=0` backfill;旧 18 辅印改为 `starLevel=2 + triggerRate=0.20`
- 战斗胜利掉落: 强化符 (已有 30%/100%),新增幸运石/转移符各 10%/33%
- 宝具工坊页 `/treasure-workshop`: 强化界面 + 等级转移 modal
- Game engine 集成 3 主印效果 (HP/range/handLimit)
- Game engine `rollSubTreasure` 改用 `treasure.triggerRate + level + (heroStar===5 ? 0.10 : 0)`

### 不包含 (YAGNI)

- 强化保护符 (失败不扣材料)
- 批量强化 / 一键到 45
- 主印也能强化
- 强化记录 / 失败历史显示
- 商城 / 充值获取幸运石或转移符

## 数据模型

### `packages/shared-types/src/skill.ts`

`Treasure` 接口加可选字段 (向后兼容):

```ts
interface Treasure {
  // ... 现有字段
  level?: number          // 0 默认, 旧数据 backfill; 最大 45
  enhanceCount?: number   // 0 默认, 旧数据 backfill; 最大 50
}
```

> 这两个字段挂在 treasure 本体而非装备槽 — 玩家换英雄后强化保留。

### `packages/shared-types/src/save.ts`

`Material.type` 联合扩展:

```ts
type MaterialType = 'gold' | 'heroFragment' | 'treasureFragment' | 'jade'
  | 'heroToken' | 'bailiTicket' | 'qianliTicket' | 'wanliTicket'
  | 'enhancementTalisman'  // 强化符 (已有, 初始 seed 20)
  | 'luckyStone'           // 幸运石 (新增, 无初始 seed)
  | 'transferTalisman'     // 转移符 (新增, 无初始 seed)
```

### 新宝具数据 (`packages/game-data/src/treasures/treasure-definitions.ts`)

**3 个新主印 × 5 星 = 15 条**:

| 主印 id 前缀 | 效果字段 | 1★ | 5★ |
|---|---|---|---|
| `main_shengqiang` | `hpBonus: N` | +1 | +5 |
| `main_chuanyang` | `rangeBonus: N` | +1 | +5 |
| `main_yunchou` | `handBonus: N` | +1 | +5 |

```ts
// 1★ 身强
{ id: 'main_shengqiang', starLevel: 1, effect: { hpBonus: 1 } }
// 5★ 身强
{ id: 'main_shengqiang_5', starLevel: 5, effect: { hpBonus: 5 } }
// (其他主印同理)
```

> id 后缀不带星 (1★),带星则写 `_2` `_3` `_4` `_5`。老惯例。

**18 个辅印 × 5 星 = 90 条**,替换现有 18 条:

| 星级 | 基础触发率 |
|---|---|
| 1★ | 15% |
| 2★ | 20% |
| 3★ | 25% |
| 4★ | 30% |
| 5★ | 35% |

每条形如:
```ts
{ id: 'sub_shenqibing', starLevel: 1, triggerRate: 0.15, effect: {...} }
{ id: 'sub_shenqibing', starLevel: 2, triggerRate: 0.20, effect: {...} }
// ... 直到 5★
```

旧 18 条 (全是 `starLevel=2 + 硬编码 0.30`) 删除,只保留新 5 星版本。

### 触发概率公式

战斗中辅印是否触发:
```
finalRate = treasure.triggerRate + treasure.level * 0.01 + (hero.starLevel === 5 ? 0.10 : 0)
```

例: 5★ 骁勇强化到 L20,装在 5★ 英雄上 = 0.35 + 0.20 + 0.10 = 0.65

`getSubTriggerBonus(5)` 已实现 +0.10,本方案不动它。

## 强化规则

### 升级公式

```
successRate(level) = round(100 - level * 85 / 44)   // level 0-44
goldCost(level) = 100 * (level + 1)                 // L0→1 扣 100, L44→45 扣 4500
```

| 当前等级 | 升级成功率 | 金币消耗 | 1★ 辅印强化后触发率 |
|---|---|---|---|
| L0 | 100% | 100 | 15% + 1% = 16% |
| L10 | 81% | 1100 | 15% + 11% = 26% |
| L22 | 58% | 2300 | 15% + 23% = 38% |
| L44 | 15% | 4500 | 15% + 45% = 60% |
| L45 | — | — | (已满级,不可强化) |

### 幸运石加成

单次强化可附加 0-6 颗幸运石:
```
adjustedRate = clamp(0, 100, baseRate + luckyStones * 5)
```

每颗幸运石 +5%,最多 +30%。消耗: 幸运石数量永远扣,无论成败。

### 强化次数上限

每辅印独立计数 `enhanceCount`:
- 每次升级尝试 (无论成败) `+1`
- `enhanceCount >= 50` 时,服务端拒绝强化
- 等级转移不影响 enhanceCount

### 服务端流程

```
POST /api/treasure/upgrade/:userId/:treasureId
Body: { luckyStones: number }   // 0-6

1. getSave → 找 treasure
2. isSub(treasure) ?           // 主印不可强化
3. level < 45 ?                // 已满级拒绝
4. enhanceCount < 50 ?         // 次数耗尽拒绝
5. materials 足够 ?            // 强化符×1 + luckyStones×N + goldCost
6. successRate = round(100 - level * 85 / 44)
7. adjustedRate = min(100, successRate + luckyStones * 5)
8. roll = random(0, 100)
9. success = roll < adjustedRate
10. treasure.level = success ? level + 1 : level
11. treasure.enhanceCount = enhanceCount + 1
12. 扣: 强化符×1 + luckyStones×N + goldCost×1
13. updateTreasure(userId, treasureId, { level, enhanceCount })
14. return { success, newLevel, successRate: adjustedRate, goldCost, luckyStonesUsed, treasure }
```

错误码 (400 BadRequest):
- `'主印不可强化'`
- `'已满级 (45)'`
- `'强化次数已用尽 (50/50)'`
- `'强化符不足'`
- `'幸运石不足'` (luckyStones > 0 且库存不够)
- `'金币不足'`
- `'幸运石数量需在 0-6 之间'`

## 等级转移规则

### 约束

- 源: 必须为 sub treasure,**`level >= 1`** (`level === 0` 报错 "源无等级可转移")
- 目标: 必须为 sub treasure,**`level === 0`** (有等级报错 "目标已有等级,无法接收")
- 双方均不能是主印
- 玩家必须拥有 ≥1 张转移符

### 转移后状态

```
source.level = 0           // 源等级清零
target.level = source.level (transfer 前)
source.enhanceCount 不变    // 源仍记 50/50,不可再强化
target.enhanceCount 不变    // 目标保持自己的次数
```

例: 骁勇 L40 (50/50 次满) → 转移给新骁勇 L0 (0/50 次):
- 源: L0 + 50/50 (强化满, 不可再用)
- 目标: L40 + 0/50 (满级新辅印, 还有 50 次升级机会)

### 服务端流程

```
POST /api/treasure/transfer-level/:userId
Body: { fromTreasureId: string, toTreasureId: string }

1. getSave → 找 from / to
2. 双方 isSub ?               // 主印不可做源/目标
3. from.level >= 1 ?          // 无等级报错
4. to.level === 0 ?           // 目标有等级报错
5. 转移符 ≥ 1 ?
6. 扣 1 张转移符
7. from.level = 0
8. to.level = original from.level
9. updateTreasure(from) + updateTreasure(to)
10. return { fromTreasure, toTreasure, transferredLevel }
```

错误码:
- `'源宝具不存在'`
- `'目标宝具不存在'`
- `'主印不可转移'`
- `'源无等级可转移'`
- `'目标已有等级,无法接收'`
- `'转移符不足'`

## 存档迁移 (`apps/server/src/modules/save/save.service.ts`)

`getSave` 自动 patch:

```ts
// 1. 所有 treasure backfill 默认字段
for (const t of save.treasures) {
  t.level ??= 0
  t.enhanceCount ??= 0
}

// 2. 旧 18 辅印 (硬编码 0.30, 无 triggerRate 字段) → 新 ★2
for (const t of save.treasures) {
  if (isSubTreasure(t) && t.triggerRate == null) {
    t.starLevel = 2
    t.triggerRate = 0.20
  }
}

// 3. 老存档 seed 强化符 20 张 (新手补偿)
ensureMaterial(save, 'enhancementTalisman', 20)
// 幸运石 / 转移符不 seed,仅靠战斗掉落
```

> 老存档里的辅印触发率从 **30% → 20%** 永久下调 (你已接受此迁移)。
> 旧强化等级 (如果有) 仍保留;enhanceCount 默认 0 起步。

## 战斗掉落 (`apps/server/src/modules/battle/battle.service.ts`)

`saveResult` 胜利后发奖:

| 关卡类型 | 强化符 | 幸运石 | 转移符 |
|---|---|---|---|
| 普通关卡 | 30% ×1 | 10% ×1 | 10% ×1 |
| BOSS 关卡 | 100% ×2 | 33% ×1 | 33% ×1 |

每次独立 roll (即一关可能同时拿到三种材料,也可能一种都没有)。新主印 (身强/穿杨/运筹) **不加入战斗掉落** — 留给后续合成玩法。

## 服务端模块结构

新建 `apps/server/src/modules/treasure/`:

```
treasure/
  treasure.module.ts
  treasure.controller.ts
  treasure.service.ts
```

### treasure.controller.ts

```ts
@Post('upgrade/:userId/:treasureId')
async upgrade(
  @Param('userId') userId: string,
  @Param('treasureId') treasureId: string,
  @Body() body: { luckyStones?: number }
): Promise<UpgradeResult>

@Post('transfer-level/:userId')
async transfer(
  @Param('userId') userId: string,
  @Body() body: { fromTreasureId: string; toTreasureId: string }
): Promise<TransferResult>
```

### treasure.service.ts

依赖 `SaveService` (用现有 `getSave` / `spendMaterial` / `updateTreasure`)。

`isMain` / `isSub` 工具从 `getTreasureSlots` 附近导入,或简单判断 `treasure.id.startsWith('main_')`。

### app.module.ts

注册 `TreasureModule`。

## 引擎集成 (`packages/game-engine/src/core/Game.ts`)

### 主印效果加成

Hero 实例化时累计主印 bonus:

```ts
const hpBonus = hero.treasures.main
  .reduce((sum, t) => sum + (t.effect?.hpBonus ?? 0), 0)
const rangeBonus = hero.treasures.main
  .reduce((sum, t) => sum + (t.effect?.rangeBonus ?? 0), 0)
const handBonus = hero.treasures.main
  .reduce((sum, t) => sum + (t.effect?.handBonus ?? 0), 0)

hero.maxHp = getHpByStar(hero.starLevel) + hpBonus
hero.attackRange = (hero.baseRange ?? 1) + rangeBonus
game.handLimit = baseHandLimit + handBonus
```

### 辅印触发概率

`rollSubTreasure` 替换硬编码 0.30:

```ts
const finalRate = sub.triggerRate
  + (sub.level ?? 0) * 0.01
  + (hero.starLevel === 5 ? 0.10 : 0)

if (Math.random() < finalRate) {
  // 触发
}
```

> `getSubTriggerBonus(5)` 已返回 0.10,方案不动它;此处直接 inline 计算。

## 前端 — 宝具工坊页

### 路由与导航

`apps/web/src/main.tsx`:
```tsx
<Route path="/treasure-workshop" element={<TreasureWorkshopPage />} />
```

`apps/web/src/pages/CityPage/index.tsx`: 加宝具工坊入口卡。

### 文件结构

新建 `apps/web/src/pages/TreasureWorkshopPage/`:

```
TreasureWorkshopPage/
  index.tsx             # 主页面: 强化区 + 转移 modal
  Cauldron.tsx          # 1 槽熔炉 (复用 SmelterPage 视觉)
  SubTreasureList.tsx   # 辅印列表 (90 条全展开)
  TransferModal.tsx     # 等级转移 modal
  animations.ts         # 复用 + 新增 keyframes
```

### 主页面布局

```
┌──────────────────────────────────────────────────────────┐
│ ← 主城        宝具工坊        [+20 强化符 +0 幸运 +0 转]  │
├────────────────────────┬─────────────────────────────────┤
│                        │ 辅印列表 (90 条)                 │
│   ╭──────────────╮    │ ┌─────────────────────────────┐ │
│   │  ★★★ 骁勇     │    │ │ ★1 骁勇 ×2  L0  0/50       │ │
│   │   Lv.20       │    │ ├─────────────────────────────┤ │
│   ╰──────────────╯    │ │ ★2 骁勇 ×3  L0,5,10  0/50   │ │
│                        │ ├─────────────────────────────┤ │
│  本次成功率: 65%       │ │ ★3 骁勇 ×1  L0  0/50        │ │
│  (+幸运石 3 颗 = +15%) │ └─────────────────────────────┘ │
│  消耗: 2100 金 + 1 符  │                                  │
│  + 3 幸运石             │  [ + 等级转移 ]                  │
│                        │                                  │
│  [ + 0 幸运石 ] [ 强化 ] │                                  │
└────────────────────────┴─────────────────────────────────┘
```

### 强化状态机

```ts
type Phase = 'idle' | 'upgrading' | 'revealed'

const handleUpgrade = async () => {
  if (phase !== 'idle' || !selectedTreasure) return
  setPhase('upgrading')
  try {
    const res = await fetch(`/api/treasure/upgrade/${userId}/${selectedTreasure.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ luckyStones: selectedLuckyStones }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      setToast('强化失败: ' + data.error)
      setPhase('idle')
      return
    }
    setResult(data)
    setPhase('revealed')
    setTimeout(() => {
      setSelectedTreasure(null)
      setResult(null)
      setPhase('idle')
      refresh()
    }, 1800)
  } catch (e) {
    setToast('网络错误')
    setPhase('idle')
  }
}
```

### 动画 (animations.ts)

复用 SmelterPage:
- `slot-pulse` (空槽呼吸)
- `cauldron-shake` (升级时抖)

新增:
- `success-burst` (成功金色光环扩散)
- `failure-flicker` (失败灰烟 + 熔炉变暗)

| Phase | 效果 |
|---|---|
| upgrading | 熔炉抖 + 中央"强化中..."遮罩 |
| revealed-success | 金色 burst + "强化成功! L20 → L21" |
| revealed-failure | 灰烟 + "强化失败,等级维持 L20" |

### 列表项信息

每条辅印展示:
- `★N 骁勇`
- `×数量` (同 id + starLevel)
- `Lv 值` (列出所有,逗号分隔,如 `L0,L5,L10`)
- `强化次数 X/50`
- 满 50 次灰显 + "强化次数已满"

### 幸运石选择

强化按钮前一个小选择器: 6 个按钮 (0/1/2/3/4/5/6),点击切换 `selectedLuckyStones`。
选择后实时更新成功率预览:
```
显示成功率 = baseRate + luckyStones * 5  // clamp 100
```

### 等级转移 modal

主页面底部 `[ + 等级转移 ]` 按钮触发 `TransferModal`:

```
┌─ 等级转移 ─────────────────────────┐
│                                   │
│  源辅印: [选择...]                 │
│  → 目标辅印: [选择...]            │
│                                   │
│  源: ★3 骁勇 Lv.40 (40/50 次)     │
│  目标: ★2 骁勇 Lv.0  (0/50 次)    │
│                                   │
│  转移后:                          │
│  源: Lv.0 (40/50 次)              │
│  目标: Lv.40 (0/50 次)            │
│                                   │
│  消耗: 1 张转移符                  │
│                                   │
│  [ 取消 ]              [ 确认转移 ] │
└───────────────────────────────────┘
```

源/目标选择都是 dropdown (辅印列表,排除主印)。
- 源 dropdown 排除 `level === 0` 的
- 目标 dropdown 排除 `level > 0` 的
- 任一未选 → 确认按钮 disabled

成功 → 弹 toast "转移成功",refresh;失败 → 弹 toast 错误信息。

## 文件改动清单总览

| 层 | 文件 | 改动 |
|---|---|---|
| shared-types | `skill.ts` | `Treasure.level?` + `enhanceCount?` 字段 |
| shared-types | `save.ts` | `Material.type` 加 `luckyStone` + `transferTalisman` |
| game-data | `treasure-definitions.ts` | +15 主印 + 72 辅印 = +87 条;删 18 旧辅印 (净 +87) |
| game-engine | `core/Game.ts` | 3 主印效果加成 + 辅印触发公式用新字段 |
| server | `modules/treasure/` (新建) | module / controller / service 三件套 |
| server | `modules/save/save.service.ts` | `getSave` 加迁移 + 强化符 seed;新增 `updateTreasure` |
| server | `modules/battle/battle.service.ts` | 胜利后发幸运石 + 转移符掉落 |
| server | `app.module.ts` | 注册 TreasureModule |
| web | `pages/TreasureWorkshopPage/` (新建) | index + Cauldron + SubTreasureList + TransferModal + animations |
| web | `main.tsx` | 加 `/treasure-workshop` 路由 |
| web | `pages/CityPage/index.tsx` | 加宝具工坊入口卡 |

## 验证

**类型层**
```bash
pnpm build
```
所有包通过。

**服务端冒烟 (curl)**
```bash
pnpm --filter @hero-legend/server dev

# 1. seed 测试用户 + 拿一个 L0 辅印 + 1 强化符 + 500 金
# 2. 强化 L0 辅印 (luckyStones=0) → 100% 成功
curl -X POST localhost:3000/treasure/upgrade/test-user/<sub-id> \
  -H "Content-Type: application/json" -d '{"luckyStones":0}'
# 3. 强化主印 → 400 "主印不可强化"
# 4. luckyStones=7 → 400 "幸运石数量需在 0-6 之间"
# 5. 强化次数跑到 50 → 第 51 次 400 "强化次数已用尽"
# 6. 等级转移: 源 L40 (有等级) → 目标 L0 (无等级) → 成功
curl -X POST localhost:3000/treasure/transfer-level/test-user \
  -H "Content-Type: application/json" \
  -d '{"fromTreasureId":"<id-a>","toTreasureId":"<id-b>"}'
# 7. 转移时目标有等级 → 400 "目标已有等级,无法接收"
# 8. 转移时源无等级 → 400 "源无等级可转移"
# 9. 转移时主印做源 → 400 "主印不可转移"
# 10. 战斗胜利 (普通关卡) → 看 save.materials 强化符 / 幸运石 / 转移符 是否按概率增加
```

**前端冒烟**
1. `/city` 看宝具工坊入口
2. 点进入 → 右侧 90 条辅印全展开,带星级 / 数量 / Lv / 强化次数
3. 点 L0 辅印 → 左侧显示 + 成功率 100% + 消耗 100 金 + 1 符
4. 选 3 颗幸运石 → 成功率 100% + 15% (clamp 100) + 消耗 100 金 + 1 符 + 3 幸运
5. 点强化 → 看 upgrading 抖 + revealed 成功动画 + 等级 L1 + enhanceCount 1/50
6. 反复点强化一个 L44 辅印 → 看到 15% 成功率 + 4500 金 + 多次 failure 灰烟
7. 强化次数跑满 50 → 按钮 disabled + 列表灰显
8. 点"等级转移" → modal 打开 → 选源 (L40) + 目标 (L0) → 确认 → 看源 L0 + 目标 L40
9. 装备新 3 主印 (身强) 给一个英雄 → 进战斗验证 HP +N
10. 装备 5★ 骁勇 L20 给 5★ 英雄 → 进战斗看触发率约 65%

**回归**
- 老存档登录 → 辅印都变 ★2 + 20% 触发 (UI 确认)
- 老存档没强化符 → 显示 20 张 (seed 生效)
- 战斗胜利 → 背包里强化符 +1/+2;幸运石/转移符按 10%/33% 概率出现
- 不装备宝具的英雄不受影响 (没有 main → bonus 全 0)

## 关键风险与缓解

| 风险 | 缓解 |
|---|---|
| 老辅印 30% → 20% 永久下调引发老玩家反弹 | 服务端硬迁移,前端不显示差异 (玩家不会察觉除非对比日志);若需补偿可后续加 1 次免费强化 |
| 强化符/金币被刷 (前端伪造请求) | 服务端用 `SaveService.getSave` 重新读最新存档,不信任客户端状态 |
| 强化 RNG 不够随机 | 服务端单次 roll,前端只展示结果 |
| 强化失败动画让玩家感觉"扣材料亏了" | UI 文案强调 "等级维持",不让玩家觉得亏 (材料本身就是入场券) |
| 等级转移可被滥用 (SL 大法) | 强化是同步的,转移也是同步的,服务端单次事务;前端不存任何"待转移"状态 |
| 90 条辅印在低端机上渲染卡顿 | 全部 inline-styles 轻量组件,无重动画;列表虚拟化先不做 (90 条不超屏) |
| 3 主印叠加过强 (1 个英雄 +3 主印) | 每个英雄只能装备 1 个主印 (现有 `getTreasureSlots` 限制),不影响 |
