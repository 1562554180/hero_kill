# 英雄放逐 + 辅印一键拉满 设计

> 创建于 2026-07-08，本地时间。

## 背景

玩家在 `/heroes` 页面想清理掉没用 / 重复 / 不喜欢的英雄，但目前没有任何移除入口，只能任由它们占着名额。同样，宝具工坊（`/treasure-workshop`）的辅印强化只能一次一次点或十连，玩家希望在资源充足时一键把所有剩余强化次数用完。

本次需求拆成两个独立小功能，各自单独提交：

1. **放逐**：英雄详情页增加"放逐"按钮，按下后该实例从 `save.heroes[]` 中消失，身上的主印 + 辅印（含强化等级）全部回到宝具背包。
2. **一键拉满**：宝具工坊在原"强化""十连"按钮旁新增"一键拉满"按钮，一次性消耗 `50 - currentEnhanceCount` 次强化（受资源/等级上限限制自动停止）。

## 决策记录

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 放逐后宝具去向 | 全部返回背包 | 用户原话"身上的宝具保留"，不损失资源 |
| 放逐代价 | 免费、不限等级/星级 | 用户选"不限条件" |
| 防误点 | 弹窗 + 2 秒倒计时确认按钮 | 用户选"弹窗二次确认" |
| 一键强化范围 | `50 - 当前 enhanceCount` 剩余次数 | 用户选"剩余全部尝试" |
| 工坊按钮 | 三按钮并存（强化/十连/一键拉满） | 用户选"保留两者并新增" |
| 放逐时是否动 `heroStones[]` | 不动 | 用户选"不动英雄石" |
| 死亡英雄放逐 | 不存在此场景，无需校验 | `HeroInstance` 无 `alive` 字段；HP=0 时引擎直接 splice 移除 |
| 服务端改动 | 新增 banish 端点（不放客户端分步） | 放逐不可逆，原子事务更安全 |

## 设计 — 放逐

### 服务端

新增 `POST /api/hero/banish/:userId/:instanceId`。

**`apps/server/src/modules/hero/hero.service.ts`** 新增方法：

```ts
async banish(userId: string, instanceId: string) {
  const save = await this.saveService.getSave(userId)
  const idx = save.heroes.findIndex(h => h.instanceId === instanceId)
  if (idx === -1) throw new BadRequestException('INVALID_HERO')
  const victim = save.heroes[idx]

  // 收集非空装备副本 (保留 level/enhanceCount/triggerRate 等全部字段)
  const returned: Treasure[] = []
  for (const t of (victim.treasures?.main ?? [])) if (t) returned.push(t)
  for (const t of (victim.treasures?.sub ?? [])) if (t) returned.push(t)

  // 从 heroes 数组移除该实例
  save.heroes.splice(idx, 1)
  // 把装备副本推回背包
  if (returned.length > 0) {
    save.treasures.push(...returned)
  }

  await save.save()

  const heroDef = this.heroData.allHeroes.find(h => h.id === victim.heroId)
  return {
    success: true,
    removedInstanceId: instanceId,
    heroId: victim.heroId,
    heroName: heroDef?.name ?? victim.heroId,
    returnedTreasures: returned.length,
  }
}
```

**`apps/server/src/modules/hero/hero.controller.ts`** 新增路由：

```ts
@Post('banish/:userId/:instanceId')
async banish(
  @Param('userId') userId: string,
  @Param('instanceId') instanceId: string,
) {
  return this.heroService.banish(userId, instanceId)
}
```

**约束**

- 不删除 `save.heroStones[]`（用户选择）
- 不删除 `save.heroes[]` 中的其他实例
- 不改 `save.materials[]`
- `save.heroes[]` 找不到 instanceId → 抛 `BadRequestException('INVALID_HERO')`（防重复放逐、参数错误）

**原子性**

`getSave` 返回 Mongoose 文档，`save.save()` 单文档原子写；并发由 MongoDB 写锁兜底。不需要 `$pull`/`$push` 拆分。

### 前端

**`apps/web/src/pages/HeroPage/index.tsx`** 右侧详情面板（当前 L188–474）：

- 在 stat grid（Lv / 星级 / 血量 / 阵营，约 L196–228）下方、"宝具槽"上方（约 L252 之前）插入新一行操作按钮。
- 按钮样式：红色 outline（`background:transparent; border:1px solid #c62828; color:#c62828;`），与现有主操作按钮做视觉区分。
- 点击 → 打开 `<BanishConfirmModal>`。

**新组件 `apps/web/src/components/BanishConfirmModal.tsx`**

- 居中 modal，半透明黑色 backdrop
- 内容：
  - 标题：`⚠️ 放逐英雄`
  - 副信息：英雄名 + Lv + ★数字 + 阵营 + `将返还 N 件宝具到背包`
  - 提示：`此操作不可恢复`
  - 按钮：
    - 主按钮`确认放逐`，按下后**倒计时 2 秒**才可点击（disabled，文字显示 `请等待 2... 1...`）
    - 次按钮`取消`，立即关闭

**`fetchBanish()`**（写在 HeroPage 内联，与现有 `equipTreasure/unequipTreasure` 风格一致）：

```ts
const fetchBanish = async (instanceId: string) => {
  const res = await fetch(`${API}/hero/banish/${userId}/${instanceId}`, { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? '放逐失败')
  return data as {
    success: true
    removedInstanceId: string
    heroId: string
    heroName: string
    returnedTreasures: number
  }
}
```

**交互流程**

```
点击 [放逐]
  → setBanishModalOpen(true)
  → modal 渲染 (倒计时启动)
  → 用户点 [确认放逐]
  → 按钮 disabled，2 秒后 enabled
  → 用户再点 → fetchBanish(instanceId)
  → 成功：
      - 关闭 modal
      - setSelectedInstanceId(null)（避免面板指向已删实例）
      - 重新 fetch myHeroes 和 inventory
      - toast: `已放逐【廉颇】，返还 3 件宝具`
  → 失败：
      - modal 保持打开
      - 按钮恢复 enabled
      - toast: `放逐失败: ${err.message}`
```

## 设计 — 一键拉满

### 纯前端改动，不动服务端

`apps/web/src/pages/TreasureWorkshopPage/index.tsx` 已有 `handleUpgrade10()`：循环最多 10 次，每轮先 GET `/api/save/:userId` 检查资源/等级/次数上限，再 POST `/api/treasure/upgrade/:userId/:treasureId`。

新增 `handleUpgradeMax()`，结构相同，仅循环上限改成 `50 - currentCount`：

```ts
const handleUpgradeMax = async () => {
  if (!canUpgrade || !selectedTreasure) return
  setPhase('upgrading')
  let successCount = 0
  let luckyCount = 0
  let failCount = 0
  let oldLevel = selectedTreasure.level ?? 0
  let newLevel = oldLevel
  let stoppedReason = ''

  try {
    // 第一次拉存档，计算剩余次数作为循环上限
    const initial = await fetch(`${API}/save/${userId}`).then(r => r.json())
    const initialT = findTreasureAcrossSlots(initial, selectedTreasure.id)
    if (!initialT) { stoppedReason = '辅印不存在' }
    const remaining = Math.max(0, 50 - (initialT?.enhanceCount ?? 0))

    for (let i = 0; i < remaining; i++) {
      // 复用 handleUpgrade10 中的资源/等级/次数检查 + POST 逻辑
      const fresh = await fetch(`${API}/save/${userId}`).then(r => r.json())
      const t = findTreasureAcrossSlots(fresh, selectedTreasure.id)
      // ... 资源校验同 handleUpgrade10
      // ... POST upgrade
      // ... 累加 successCount / failCount / luckyCount
    }

    setResult({
      success: successCount > 0,
      lucky: luckyCount > 0,
      oldLevel,
      newLevel,
      message: `一键拉满完成: 成功 ${successCount} / 失败 ${failCount}${luckyCount > 0 ? ` / 欧皇 ${luckyCount}` : ''}${stoppedReason ? ` / 提前停止: ${stoppedReason}` : ''}`,
    })
    setPhase('revealed')
    setTimeout(() => {
      setResult(null)
      setPhase('idle')
      refresh()
    }, 2800)
  } catch (e: any) {
    setToast('网络错误: ' + (e?.message ?? ''))
    setTimeout(() => setToast(''), 3000)
    setPhase('idle')
  }
}
```

### 抽取公共函数

`handleUpgrade10` 和 `handleUpgradeMax` 都需要：
- `findTreasureAcrossSlots(save, treasureId)` — 跨背包 + 所有英雄装备槽查找
- 每轮资源/等级/次数上限校验

把这两个抽到 `TreasureWorkshopPage/index.tsx` 模块顶部，作为内部辅助函数。**不**抽到独立 hooks（避免引入新文件，仅复用现有 reducer）。

### UI

Cauldron 下方现有"强化""十连"两按钮改为三按钮横排：

```
[ 强化 ] [ 十连 ] [ 一键拉满 (38次) ]
```

- 一键拉满按钮颜色：`color: var(--text-gold)` + `border: 1px solid var(--text-gold)`
- 文本动态显示剩余次数（`一键拉满 (${remaining}次)`）
- 禁用条件：剩余次数 = 0、已达 Lv.45、无选中宝具（沿用 `canUpgrade` 计算逻辑，新增一个 `canUpgradeMax` 派生量）
- 进度展示：复用现有 `phase = 'upgrading'` 状态和 `Cauldron` 动画
- 结算：复用 `setResult` + `revealed` 动画，message 字段改为拉满文案

## 测试

### 放逐
1. Lv.5 廉颇 + 身上 2 主印 2 辅印 → 放逐 → `save.heroes[]` 少 1 个，`save.treasures[]` 多 4 件（强化等级保留）
2. 强化等级 Lv.20 辅印 → 放逐 → 回到背包仍是 Lv.20，`enhanceCount` 不变
3. 倒计时期间再点 `确认放逐` → 应无效（按钮 disabled）
4. 网络错误 → modal 不关闭，按钮恢复 enabled，toast 显示原因
5. 同一 instanceId 重复放逐 → 第二次返回 `INVALID_HERO`
6. 装备槽全部为 null 的英雄放逐 → 仍能成功，`returnedTreasures = 0`

### 一键拉满
1. Lv.0、`enhanceCount=0` 辅印 + 充足资源 → 跑满 50 次（遇资源停）
2. `enhanceCount=30` 辅印 → 只跑 20 次
3. Lv.45 满级辅印 → 按钮 disabled
4. 选中主印 → 按钮 disabled（沿用 `canUpgrade` 现有校验）
5. 资源中途耗尽（金币 / 强化符 / 幸运石） → 提前停止，message 显示停止原因
6. 跑动期间 UI 显示 `phase = 'upgrading'`，按钮全 disabled（避免重复点击）

## 风险与未决项

- **多标签页同步**：另一标签页打开同一存档时，roster 视图不会自动刷新。本次**不处理**（不在需求范围）。
- **inventory 顺序**：放逐后推入 `save.treasures` 末尾，UI 上 `inventory` 列表顺序可能与玩家预期不同。本次**不处理**（沿用现有背包顺序规则）。
- **一键拉满的服务端性能**：连续 50 次 POST 是 N+1 请求。可后续考虑批处理端点，但本次不做。

## 实施拆分

1. 后端：`hero.service.ts banish()` + `hero.controller.ts` 路由 + `pnpm --filter @hero-legend/server build`
2. 前端 A：`BanishConfirmModal.tsx` 新组件 + `HeroPage/index.tsx` 接入 + 放逐 fetch
3. 前端 B：`TreasureWorkshopPage/index.tsx` 抽取 `findTreasureAcrossSlots` + 新增 `handleUpgradeMax` + 三按钮 UI
4. 联调：浏览器跑两套测试用例，确认 toast / modal / 按钮禁用 / 库存刷新都符合预期
5. 提交：分 2-3 个 commit（后端 1 + 前端放逐 1 + 前端一键拉满 1）