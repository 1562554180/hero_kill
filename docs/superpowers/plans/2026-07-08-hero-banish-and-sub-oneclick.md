# 英雄放逐 + 辅印一键拉满 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 HeroPage 英雄详情添加"放逐"按钮（带 2s 倒计时确认弹窗），在 TreasureWorkshopPage 添加"一键拉满"辅印强化按钮。两者均要求后端 / 前端就绪后浏览器手测通过。

**Architecture:**
- 放逐：服务端新增原子端点（`POST /api/hero/banish/:userId/:instanceId`）一次 `save.save()` 内删除实例 + 把装备副本推回背包；前端 HeroPage 加红色 outline 按钮 + BanishConfirmModal。
- 一键拉满：纯前端，复用 `handleUpgrade10` 循环结构，但把循环上限改成 `50 - currentEnhanceCount`。

**Tech Stack:** NestJS 11 (Mongoose 8) 后端；React 19 + Vite + Zustand 前端；TypeScript 5。

**Spec:** `docs/superpowers/specs/2026-07-08-hero-banish-and-sub-oneclick-design.md`

**Note on TDD:** 本仓库目前仅 `game-engine` 包配置了 vitest（见 `CLAUDE.md`），`server` 与 `web` 没有单元测试基础设施。本计划所有验证步骤采用**手动 smoke test**（curl + 浏览器），不写单测。如后续要补单测，应单独立项。

---

## File Structure

**Create:**
- `apps/web/src/components/BanishConfirmModal.tsx` — 放逐确认弹窗，2s 倒计时确认按钮，单一职责。

**Modify:**
- `apps/server/src/modules/hero/hero.service.ts` — 末尾追加 `banish()` 方法。
- `apps/server/src/modules/hero/hero.controller.ts` — 末尾追加 `/banish/:userId/:instanceId` 路由。
- `apps/web/src/pages/HeroPage/index.tsx` — 详情面板新增放逐按钮行 + 弹窗状态 + `fetchBanish` 内联函数。
- `apps/web/src/pages/TreasureWorkshopPage/index.tsx` — 抽 `findTreasureAcrossSlots` 辅助函数；新增 `handleUpgradeMax`；新增"一键拉满"按钮。

**Commit 拆分（3 个 commit）:**
1. `feat(server): hero banish endpoint` (Task 1–4)
2. `feat(web): hero detail banish action` (Task 5–8)
3. `feat(web): sub-treasure one-click max enhance` (Task 9–12)

---

## Task 1: 后端 — hero.service.ts 添加 banish 方法

**Files:**
- Modify: `apps/server/src/modules/hero/hero.service.ts:1-128` — 修改顶部 imports，并在 `useHeroStone` 之后追加新方法。

- [ ] **Step 1: 修改 imports**

打开 `apps/server/src/modules/hero/hero.service.ts`，第 1 行：

```ts
import { Injectable } from '@nestjs/common'
```

改为：

```ts
import { Injectable, BadRequestException } from '@nestjs/common'
```

- [ ] **Step 2: 在 useHeroSmith 之后追加 banish 方法**

定位 `useHeroStone` 方法（文件末尾，第 125-128 行）：

```ts
  /** 使用一颗英雄石, 生成 HeroInstance */
  async useHeroStone(userId: string, stoneId: string) {
    return this.saveService.useHeroStone(userId, stoneId)
  }
}
```

在最后一个 `}` 之前（即 class 结束 `}` 前）插入新方法：

```ts

  /**
   * 放逐英雄: 删除 HeroInstance 并把装备副本（含强化等级）全部推回背包.
   * 单文档原子写 (getSave + save.save). 找不到 instanceId 抛 BadRequestException.
   */
  async banish(userId: string, instanceId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const idx = (save.heroes as HeroInstance[]).findIndex(h => h.instanceId === instanceId)
    if (idx === -1) throw new BadRequestException('INVALID_HERO')
    const victim = save.heroes[idx]

    // 收集非空装备副本
    const returned: Treasure[] = []
    for (const t of (victim.treasures?.main ?? [])) {
      if (t) returned.push(t)
    }
    for (const t of (victim.treasures?.sub ?? [])) {
      if (t) returned.push(t)
    }

    // 从 heroes 数组移除该实例
    save.heroes.splice(idx, 1)
    // 装备副本推回背包 (在末尾追加, 保留独立副本语义)
    if (returned.length > 0) {
      save.treasures.push(...returned)
    }

    await save.save()

    const heroDef = heroes.find(h => h.id === victim.heroId)
    return {
      success: true,
      removedInstanceId: instanceId,
      heroId: victim.heroId,
      heroName: heroDef?.name ?? victim.heroId,
      returnedTreasures: returned.length,
    }
  }
```

- [ ] **Step 3: tsc 编译验证**

Run:
```bash
cd apps/server && npx tsc --noEmit
```

Expected: 无错误。如果报 `BadRequestException not found`，回到 Step 1 检查 import。

---

## Task 2: 后端 — hero.controller.ts 添加 banish 路由

**Files:**
- Modify: `apps/server/src/modules/hero/hero.controller.ts:37-40` — 在 `useStone` 路由之后追加。

- [ ] **Step 1: 追加新路由**

打开 `apps/server/src/modules/hero/hero.controller.ts`，在 `useStone` 路由（第 37-40 行）之后、类结束 `}` 之前插入：

```ts

  @Post('banish/:userId/:instanceId')
  async banish(
    @Param('userId') userId: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.heroService.banish(userId, instanceId)
  }
```

- [ ] **Step 2: 编译验证**

Run:
```bash
cd apps/server && npx tsc --noEmit
```

Expected: 无错误。

---

## Task 3: 后端 — 服务构建 + curl smoke test

**Files:** 仅构建与测试。

- [ ] **Step 1: 确认 server dev 在跑（如不在则启动）**

Run:
```bash
netstat -ano | grep ':3000' | grep LISTENING
```

如果没输出，启动：

```bash
cd apps/server && pnpm dev
```

等 5-6 秒看到 `Server running on http://localhost:3000`。NestJS watch 模式会在文件改动后自动重启。

- [ ] **Step 2: 取一个真实 userId**

前端登录时会写 `localStorage.hero-legend-userId`。从浏览器 devtools Application/Local Storage 取一个 userId。备用值（如果你之前测试用过）：

```bash
USER_ID="user-1781274579830"
```

- [ ] **Step 3: 拉取当前存档，确认有英雄**

Run:
```bash
curl -s "http://localhost:3000/api/save/$USER_ID" | python -m json.tool | grep -B 2 -A 8 '"heroes"' | head -40
```

Expected: 输出包含 `instanceId`, `heroId`, `level`, `treasures` 字段的 JSON。

- [ ] **Step 4: 选一个英雄放逐**

挑一个**不是当前组队的**英雄。从上面输出中复制它的 `instanceId`：

```bash
INSTANCE_ID="<从上面输出复制>"
curl -s -X POST "http://localhost:3000/api/hero/banish/$USER_ID/$INSTANCE_ID" | python -m json.tool
```

Expected:
```json
{
    "success": true,
    "removedInstanceId": "<id>",
    "heroId": "...",
    "heroName": "...",
    "returnedTreasures": 3
}
```

- [ ] **Step 5: 验证存档变化**

Run:
```bash
curl -s "http://localhost:3000/api/save/$USER_ID" > /tmp/save-after.json
python -c "import json; d=json.load(open('/tmp/save-after.json')); print('treasures:', len(d['treasures']), 'heroes:', len(d['heroes']))"
```

Expected: `heroes` 比放逐前少 1，`treasures` 比放逐前多 `returnedTreasures` 个。

- [ ] **Step 6: 重复放逐同一 instanceId 应报错**

Run:
```bash
curl -s -X POST "http://localhost:3000/api/hero/banish/$USER_ID/$INSTANCE_ID" | python -m json.tool
```

Expected:
```json
{
    "message": "INVALID_HERO",
    "error": "Bad Request",
    "statusCode": 400
}
```

---

## Task 4: 提交后端改动

- [ ] **Step 1: 确认无 settings.local.json 改动**

Run:
```bash
cd /d/work/hero_kill && git status --short
```

如果 `.claude/settings.local.json` 显示 `M`，执行：

```bash
cd /d/work/hero_kill && git checkout -- .claude/settings.local.json
```

Expected: 仅 `apps/server/src/modules/hero/hero.service.ts` 和 `hero.controller.ts` 显示 `M`。

- [ ] **Step 2: 暂存并提交**

Run:
```bash
cd /d/work/hero_kill && git add apps/server/src/modules/hero/hero.service.ts apps/server/src/modules/hero/hero.controller.ts
git commit -m "$(cat <<'EOF'
feat(server): hero banish endpoint

POST /api/hero/banish/:userId/:instanceId 原子删除 HeroInstance
并把其身上主印/辅印副本（含强化等级）推回宝具背包。
找不到 instanceId 返回 INVALID_HERO。

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: commit 成功，message 含 `2 files changed`。

---

## Task 5: 前端 — 创建 BanishConfirmModal 组件

**Files:**
- Create: `apps/web/src/components/BanishConfirmModal.tsx`

- [ ] **Step 1: 创建文件**

写入 `apps/web/src/components/BanishConfirmModal.tsx`：

```tsx
import { useEffect, useState } from 'react'

interface BanishConfirmModalProps {
  open: boolean
  heroName: string
  heroLevel: number
  heroStar: number
  faction: string
  returnedCount: number
  onConfirm: () => void
  onCancel: () => void
}

/** 2 秒倒计时确认按钮, 防误点 */
export function BanishConfirmModal({
  open,
  heroName,
  heroLevel,
  heroStar,
  faction,
  returnedCount,
  onConfirm,
  onCancel,
}: BanishConfirmModalProps) {
  const [remaining, setRemaining] = useState(2)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (!open) {
      setRemaining(2)
      setConfirmed(false)
      return
    }
    setRemaining(2)
    setConfirmed(false)
    const tick = setInterval(() => {
      setRemaining(s => {
        if (s <= 1) {
          clearInterval(tick)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [open])

  if (!open) return null

  const starText = '★'.repeat(heroStar) + '☆'.repeat(5 - heroStar)
  const canConfirm = remaining === 0 && !confirmed

  const handleConfirm = () => {
    setConfirmed(true)
    onConfirm()
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '24px', minWidth: '360px', maxWidth: '480px',
        }}
      >
        <h3 style={{ margin: '0 0 12px', color: '#c62828' }}>⚠️ 放逐英雄</h3>
        <div style={{ marginBottom: '8px', color: 'var(--text)' }}>
          <strong style={{ color: 'var(--text-gold)' }}>{heroName}</strong>
          {' '}{starText} Lv.{heroLevel} · {faction}
        </div>
        <div style={{ marginBottom: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
          将返还 <strong style={{ color: 'var(--text-gold)' }}>{returnedCount}</strong> 件宝具到背包
        </div>
        <div style={{ marginBottom: '20px', color: '#c62828', fontSize: '13px' }}>
          此操作不可恢复
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel}>取消</button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              padding: '8px 16px', fontWeight: 'bold',
              background: canConfirm ? '#c62828' : '#555',
              color: '#fff', border: 'none', borderRadius: '4px',
              cursor: canConfirm ? 'pointer' : 'not-allowed',
            }}
          >
            {confirmed ? '处理中...' : remaining > 0 ? `请等待 ${remaining}...` : '确认放逐'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 不应出现 `BanishConfirmModal.tsx` 相关报错。可以忽略上游已知报错（`BattleField.tsx` 的 `shenTouActive`、`engine.worker.ts` 的 Card 类型）。

---

## Task 6: 前端 — HeroPage 接入放逐按钮

**Files:**
- Modify: `apps/web/src/pages/HeroPage/index.tsx`

- [ ] **Step 1: 添加 import**

定位文件顶部 import 区域，在最后一行 import（第 5 行 `heroPortraitNames`）之后插入：

```tsx
import { BanishConfirmModal } from '../../components/BanishConfirmModal'
```

- [ ] **Step 2: 在 component state 区追加 modal state**

定位 state 声明区域，找到 `equipPage` state（第 49 行）。在 `equipPage` 之后插入：

```tsx
  const [banishModal, setBanishModal] = useState<{
    open: boolean
    instanceId: string | null
    heroName: string
    heroLevel: number
    heroStar: number
    faction: string
    returnedCount: number
  }>({ open: false, instanceId: null, heroName: '', heroLevel: 0, heroStar: 0, faction: '', returnedCount: 0 })
```

- [ ] **Step 3: 在 unequipTreasure 之后追加 openBanishModal / fetchBanish / handleBanishConfirm**

定位 `unequipTreasure` 函数（第 90-103 行）。在它的 `}` 之后插入：

```tsx
  const openBanishModal = () => {
    if (!selectedInstance || !selectedConfig) return
    const returnedCount = [
      ...(selectedInstance.treasures?.main ?? []),
      ...(selectedInstance.treasures?.sub ?? []),
    ].filter(t => t != null).length
    setBanishModal({
      open: true,
      instanceId: selectedInstance.instanceId ?? null,
      heroName: selectedConfig.name,
      heroLevel: selectedInstance.level,
      heroStar: selectedInstance.starLevel,
      faction: selectedConfig.faction,
      returnedCount,
    })
  }

  const fetchBanish = async (instanceId: string) => {
    const res = await fetch(`${API}/hero/banish/${userId}/${instanceId}`, { method: 'POST' })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? data.message ?? `HTTP ${res.status}`)
    return data as { success: true; removedInstanceId: string; heroId: string; heroName: string; returnedTreasures: number }
  }

  const handleBanishConfirm = async () => {
    if (!banishModal.instanceId) return
    try {
      const data = await fetchBanish(banishModal.instanceId)
      setBanishModal(m => ({ ...m, open: false }))
      setSelectedInstanceId(null)
      await refreshSave()
      setMessage(`已放逐【${data.heroName}】，返还 ${data.returnedTreasures} 件宝具`)
    } catch (e: any) {
      setMessage(`放逐失败: ${e.message ?? e}`)
      // 弹窗保持打开, 让用户看到错误后手动取消
    }
  }
```

- [ ] **Step 4: 在右侧详情面板 stat grid 之后插入放逐按钮**

定位右侧详情 panel 的 stat grid 渲染（约 L196-228，搜 `{getStarDisplay(...)}` 等锚点）。在 stats grid `</div>` 闭合之后、`{/* 技能 */}` 或 skills 区域之前插入：

```tsx
          {/* 放逐按钮 (红色 outline, 与主操作区分) */}
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button
              onClick={openBanishModal}
              style={{
                padding: '6px 14px', fontSize: '13px',
                background: 'transparent', color: '#c62828',
                border: '1px solid #c62828', borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              放逐
            </button>
          </div>
```

- [ ] **Step 5: 在 return 顶部插入 BanishConfirmModal**

定位 HeroPage return 块最外层 `<div>` 开头（第 112 行 `<div style={{ padding: '20px' ... }}>`）。在该行之后插入：

```tsx
      <BanishConfirmModal
        open={banishModal.open}
        heroName={banishModal.heroName}
        heroLevel={banishModal.heroLevel}
        heroStar={banishModal.heroStar}
        faction={banishModal.faction}
        returnedCount={banishModal.returnedCount}
        onConfirm={handleBanishConfirm}
        onCancel={() => setBanishModal(m => ({ ...m, open: false }))}
      />
```

- [ ] **Step 6: 类型检查**

Run:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 不应出现 `HeroPage/index.tsx` 的新报错。可以忽略上游已知 `shenTouActive` / `engine.worker.ts` 报错。

---

## Task 7: 浏览器手测放逐

- [ ] **Step 1: 确认两个 dev server 在跑**

Run:
```bash
netstat -ano | grep -E ':3000|:5173' | grep LISTENING
```

Expected: `:3000` 和 `:5173` 都有进程。

- [ ] **Step 2: 浏览器打开 /heroes**

URL: `http://localhost:5173/heroes`。

- [ ] **Step 3: 选一个有装备的英雄，点击"放逐"按钮**

Expected:
- 弹出 modal
- 显示英雄名 / Lv / 星 / 阵营 / "将返还 N 件宝具到背包"
- 主按钮文字 `请等待 2...`，disabled

- [ ] **Step 4: 等 2 秒**

Expected: 主按钮文字变 `确认放逐`，enabled。

- [ ] **Step 5: 验证按钮 disabled 期间不可点（点一下应无反应）**

- [ ] **Step 6: 点"确认放逐"**

Expected:
- modal 关闭
- 右侧详情面板清空（`selectedInstanceId = null`）
- 顶部计数 `英雄管理 (X)` 减少 1
- 顶部黄色 message 出现：`已放逐【XXX】，返还 N 件宝具`

- [ ] **Step 7: 进背包确认宝具回来了**

点击顶部"背包" → 宝具 tab → 应看到返还的宝具（含 Lv. 和 enhanceCount）。

- [ ] **Step 8: 取消路径**

新选一个英雄 → 点"放逐" → 点"取消"。Expected: modal 关闭，无任何变化。

- [ ] **Step 9: 错误路径（可选）**

如果想把网络错误也走通：临时把 server 停了，再走一遍"确认放逐"。Expected: modal 保持打开，顶部 message 显示 `放逐失败: ...`，按钮恢复 enabled。

---

## Task 8: 提交前端放逐改动

- [ ] **Step 1: 确认 settings.local.json 没改**

Run:
```bash
cd /d/work/hero_kill && git status --short
```

如果 `.claude/settings.local.json` 显示 `M`，执行：

```bash
cd /d/work/hero_kill && git checkout -- .claude/settings.local.json
```

Expected: 仅 `apps/web/src/components/BanishConfirmModal.tsx` 和 `apps/web/src/pages/HeroPage/index.tsx` 显示 `A` / `M`。

- [ ] **Step 2: 暂存并提交**

Run:
```bash
cd /d/work/hero_kill && git add apps/web/src/components/BanishConfirmModal.tsx apps/web/src/pages/HeroPage/index.tsx
git commit -m "$(cat <<'EOF'
feat(web): hero detail banish action

HeroPage 英雄详情 stat grid 下方新增红色 outline [放逐] 按钮。
点击打开 BanishConfirmModal，2s 倒计时后 [确认放逐] 按钮才可点。
成功后清空选中、刷新存档、message 显示返还的宝具数。

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: `2 files changed`。

---

## Task 9: 前端 — 抽取 findTreasureAcrossSlots 公共函数

**Files:**
- Modify: `apps/web/src/pages/TreasureWorkshopPage/index.tsx`

- [ ] **Step 1: 在最后一行 import 之后插入辅助函数**

打开 `apps/web/src/pages/TreasureWorkshopPage/index.tsx`，找到最后一行 import。在它之后、第一个 `export`/`function` 之前插入：

```tsx
/** 跨背包 + 所有英雄装备槽查找指定 treasureId 的宝具副本 */
function findTreasureAcrossSlots(save: any, treasureId: string): Treasure | undefined {
  const inBag = save?.treasures?.find((x: Treasure) => x.id === treasureId)
  if (inBag) return inBag
  for (const h of save?.heroes ?? []) {
    const ts = h.treasures ?? { main: [], sub: [] }
    const inMain = ts.main?.find((x: Treasure | null) => x?.id === treasureId)
    if (inMain) return inMain
    const inSub = ts.sub?.find((x: Treasure | null) => x?.id === treasureId)
    if (inSub) return inSub
  }
  return undefined
}
```

- [ ] **Step 2: 重构 handleUpgrade10 用新函数**

定位 `handleUpgrade10` 函数（约第 128-194 行）。把内联查找（约原代码 143-151 行的 `if (!t) { for (const h of (fresh.heroes ...) { ... } }` 循环）替换为 `findTreasureAcrossSlots` 调用：

替换前（原代码大约是这样）：

```tsx
        const fresh = await fetch(`${API}/save/${userId}`).then(r => r.json())
        // 跨位置查找: 背包 + 所有英雄的装备槽 (装备中的辅印也能十连)
        let t: Treasure | undefined = (fresh.treasures as Treasure[])?.find(x => x.id === selectedTreasure.id)
        if (!t) {
          for (const h of (fresh.heroes as HeroInstance[]) ?? []) {
            const ts = h.treasures ?? { main: [], sub: [] }
            const inMain = ts.main?.find(x => x?.id === selectedTreasure.id)
            if (inMain) { t = inMain; break }
            const inSub = ts.sub?.find(x => x?.id === selectedTreasure.id)
            if (inSub) { t = inSub; break }
          }
        }
```

替换为：

```tsx
        const fresh = await fetch(`${API}/save/${userId}`).then(r => r.json())
        const t = findTreasureAcrossSlots(fresh, selectedTreasure.id)
```

`handleUpgrade10` 的其余逻辑保持不变。

- [ ] **Step 3: 类型检查**

Run:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 不应出现 `TreasureWorkshopPage/index.tsx` 相关新报错。

---

## Task 10: 前端 — 新增 handleUpgradeMax

**Files:**
- Modify: `apps/web/src/pages/TreasureWorkshopPage/index.tsx`

- [ ] **Step 1: 在 handleUpgrade10 之后插入 handleUpgradeMax**

定位 `handleUpgrade10` 函数末尾的 `}`（在 `setTimeout(... refresh(), 2800)` 之后）。在该 `}` 之后插入：

```tsx

  /**
   * 一键拉满: 用完所有剩余强化次数 (50 - currentEnhanceCount).
   * 资源/等级/次数上限遇任一限制时提前停止.
   */
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
      // 第一次拉存档确定本次循环上限
      const initial = await fetch(`${API}/save/${userId}`).then(r => r.json())
      const initialT = findTreasureAcrossSlots(initial, selectedTreasure.id)
      if (!initialT) {
        stoppedReason = '辅印不存在'
      }
      const remaining = Math.max(0, 50 - (initialT?.enhanceCount ?? 0))

      for (let i = 0; i < remaining; i++) {
        const fresh = await fetch(`${API}/save/${userId}`).then(r => r.json())
        const t = findTreasureAcrossSlots(fresh, selectedTreasure.id)
        const talisman = (fresh.materials as Material[])?.find(m => m.type === 'enhancementTalisman')?.amount ?? 0
        const lucky = (fresh.materials as Material[])?.find(m => m.type === 'luckyStone')?.amount ?? 0
        const gold = (fresh.materials as Material[])?.find(m => m.type === 'gold')?.amount ?? 0
        if (!t) { stoppedReason = '辅印不存在'; break }
        const lvl = t.level ?? 0
        const cnt = t.enhanceCount ?? 0
        const cost = 100 * (lvl + 1)
        if (lvl >= 45) { stoppedReason = '已满级'; break }
        if (cnt >= 50) { stoppedReason = '已达强化次数上限'; break }
        if (talisman < 1) { stoppedReason = '强化符不足'; break }
        if (lucky < luckyStones) { stoppedReason = '幸运石不足'; break }
        if (gold < cost) { stoppedReason = '金币不足'; break }
        const res = await fetch(`${API}/treasure/upgrade/${userId}/${encodeURIComponent(selectedTreasure.id)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ luckyStones }),
        })
        const data = await res.json()
        if (!res.ok || data.error) { stoppedReason = data.error ?? data.message ?? `${res.status}`; break }
        if (data.success) successCount++
        else failCount++
        if (data.lucky) luckyCount++
        newLevel = data.newLevel as number
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

- [ ] **Step 2: 类型检查**

Run:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 不应出现 `TreasureWorkshopPage/index.tsx` 新报错。

---

## Task 11: 前端 — 添加"一键拉满"按钮 UI

**Files:**
- Modify: `apps/web/src/pages/TreasureWorkshopPage/index.tsx`

- [ ] **Step 1: 计算 canUpgradeMax 派生量**

定位文件顶部 `canUpgrade` 的派生计算（约 L80-89），在 `canUpgrade` 之后插入：

```tsx
  /** 一键拉满: 选中宝具存在 + 非主印 + 未满级 + 未达次数上限 + 至少还有 1 次剩余 */
  const canUpgradeMax = (() => {
    if (!canUpgrade || !selectedTreasure) return false
    const remaining = 50 - (selectedTreasure.enhanceCount ?? 0)
    return remaining > 0 && (selectedTreasure.level ?? 0) < 45
  })()
  const upgradeMaxRemaining = selectedTreasure
    ? Math.max(0, 50 - (selectedTreasure.enhanceCount ?? 0))
    : 0
```

- [ ] **Step 2: 在底部按钮区插入新按钮**

定位底部按钮区域（约 L348-352），在"强化十次"按钮之后、`</div>` 之前插入：

```tsx
        <button
          onClick={handleUpgradeMax}
          disabled={!canUpgradeMax || phase !== 'idle'}
          style={{
            padding: '10px 20px', fontSize: '15px', fontWeight: 'bold',
            color: 'var(--text-gold)',
            border: `1px solid ${canUpgradeMax ? 'var(--text-gold)' : '#555'}`,
            background: 'transparent',
            borderRadius: '4px',
            cursor: canUpgradeMax ? 'pointer' : 'not-allowed',
            opacity: canUpgradeMax ? 1 : 0.4,
          }}
        >
          {phase === 'upgrading' ? '拉满中...' : `一键拉满 (${upgradeMaxRemaining}次)`}
        </button>
```

- [ ] **Step 3: 类型检查**

Run:
```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: 不应出现新报错。

---

## Task 12: 浏览器手测一键拉满

- [ ] **Step 1: 浏览器打开 /treasure-workshop**

URL: `http://localhost:5173/treasure-workshop`。

- [ ] **Step 2: 确认资源充足**

顶部资源条应显示 `强化符 >= 50, 金币充足`。如果没有，用调试脚本给 userId 补一份：

```bash
curl -s -X POST "http://localhost:3000/api/save/seed-debug/$USER_ID" -H 'Content-Type: application/json' -d '{"resources":{"enhancementTalisman":99999,"luckyStone":99999,"gold":9999999}}' | python -m json.tool
```

（或用你惯用的调试脚本。）

- [ ] **Step 3: 选一个 Lv.0、enhanceCount=0 的辅印**

Expected:
- 右侧底部按钮区出现三个按钮：`强化` `强化十次` `一键拉满 (50次)`
- 金色边框的"一键拉满 (50次)" enabled

- [ ] **Step 4: 点"一键拉满"**

Expected:
- 按钮文字变 `拉满中...`，所有强化按钮 disabled
- 进度在结算后显示：`一键拉满完成: 成功 X / 失败 Y / 欧皇 Z`
- 顶部资源条减少（约 50 个强化符 + 50 * 100 = 5000 金币基础消耗）

- [ ] **Step 5: 验证 enhanceCount 已用完**

在右侧辅印列表找到刚才那件宝具，看 level / enhanceCount。Expected: `enhanceCount` 已涨满 50（或 50 - luckyCount，因为每次都消耗 1 次，无论成败）。

- [ ] **Step 6: 再选同一个宝具（已用完）**

Expected:
- "一键拉满"按钮文字变 `一键拉满 (0次)`
- 按钮 disabled（opacity 0.4）

- [ ] **Step 7: 选另一个 enhanceCount=30 的辅印**

Expected:
- "一键拉满 (20次)" enabled
- 点 → 跑 20 次（或遇资源停）

- [ ] **Step 8: 选一个 Lv.45 满级辅印**

Expected:
- "一键拉满"按钮 disabled
- 文字可能仍显示剩余次数，但点不动

- [ ] **Step 9: 选一个主印**

Expected:
- "强化"和"强化十次"已经 disabled（沿用 canUpgrade），"一键拉满"也 disabled

- [ ] **Step 10: 中途资源耗尽**

把强化符消耗到 0（用调试脚本减少或选一个低资源存档）。Expected:
- 点一键拉满 → 跑了几次后停止
- 结算 message: `一键拉满完成: 成功 X / 失败 Y / 提前停止: 强化符不足`

---

## Task 13: 提交前端一键拉满改动

- [ ] **Step 1: 确认 settings.local.json 没改**

Run:
```bash
cd /d/work/hero_kill && git status --short
```

如果 `.claude/settings.local.json` 显示 `M`：

```bash
cd /d/work/hero_kill && git checkout -- .claude/settings.local.json
```

- [ ] **Step 2: 暂存并提交**

Run:
```bash
cd /d/work/hero_kill && git add apps/web/src/pages/TreasureWorkshopPage/index.tsx
git commit -m "$(cat <<'EOF'
feat(web): sub-treasure one-click max enhance

宝具工坊在原有 [强化] [强化十次] 旁新增 [一键拉满 (N次)] 金色按钮.
循环次数 = 50 - 当前 enhanceCount, 资源/等级/次数任一上限触发即停.

同时抽取 findTreasureAcrossSlots 公共函数,
handleUpgrade10 也复用之减少重复代码.

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

Expected: `1 file changed`。

---

## Self-Review Checklist

完成后请按以下顺序自检：

1. **Spec coverage：** 重新打开 `docs/superpowers/specs/2026-07-08-hero-banish-and-sub-oneclick-design.md`，逐节确认任务已覆盖。
   - 决策表：✅ 用户选项已落到 spec
   - 放逐设计：Task 1-6 实现服务端 + 前端组件，Task 7 浏览器手测
   - 一键拉满设计：Task 9-11 实现，Task 12 浏览器手测
   - 测试用例：Task 3 / 7 / 12 覆盖放逐 1-6 + 一键拉满 1-6
   - 风险：未决项（多标签页同步）已声明不处理
   - 实施拆分：3 个 commit 对应 Task 4 / 8 / 13

2. **Placeholder scan：** 没有 TBD/TODO；每步都有具体代码或命令。

3. **Type consistency：**
   - 服务端 `banish()` 返回 `{ success, removedInstanceId, heroId, heroName, returnedTreasures }`
   - 前端 `fetchBanish` 同样的类型断言
   - 共享 `findTreasureAcrossSlots` 函数在 handleUpgrade10 和 handleUpgradeMax 中签名一致
   - `Treasure` 类型 import 在所有引用点都已 import

4. **Commit 拆分：** Task 4（后端）/ Task 8（前端放逐）/ Task 13（前端一键拉满）—— 3 个独立 commit，互不耦合。

---

## 完成定义

- 后端 `pnpm --filter @hero-legend/server build` 通过
- 前端 `cd apps/web && npx tsc --noEmit` 通过（忽略上游已知 `shenTouActive` / `engine.worker.ts` 报错）
- 浏览器 `/heroes` 能放逐英雄并返还宝具
- 浏览器 `/treasure-workshop` 一键拉满按钮工作
- 3 个 commit 已 push 到 `gitee/master`

