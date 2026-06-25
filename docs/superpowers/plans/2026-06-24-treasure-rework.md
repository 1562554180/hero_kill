# 宝具系统重构 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展宝具系统,新增 3 个主印 (身强/穿杨/运筹)、18 辅印 × 5 星扩展、强化系统 (L1-45 + 50 次上限 + 幸运石)、等级转移 (转移符)。

**Architecture:** 类型先行,数据配置,服务端模块 (TreasureModule),前端宝具工坊页 (沿用 SmelterPage 状态机模式)。`Treasure` 接口加 `level?` 和 `enhanceCount?`,`Material.type` 加 3 种新材料。

**Tech Stack:** NestJS + Mongoose (服务端),React 19 + Vite (前端),pnpm monorepo,Turborepo。

**实施约定:**
- 每步完成后跑 `pnpm --filter <pkg> build` 验证类型
- 不写 vitest (项目当前修复/实现流程不写测试)
- 全部 packages 在 server/web 改动前必须先 build (`shared-types` → `game-data` → `game-engine`)
- 每任务结束后 commit

---

## 文件结构总览

| 层 | 新增 | 修改 |
|---|---|---|
| shared-types | — | `skill.ts`, `save.ts` |
| game-data | — | `treasure-definitions.ts`, `treasure-generator.ts` |
| game-engine | — | `Player.ts`, `Game.ts` |
| server | `modules/treasure/{module,controller,service}.ts` | `save/save.service.ts`, `battle/battle.service.ts`, `app.module.ts` |
| web | `pages/TreasureWorkshopPage/{index,Cauldron,SubTreasureList,TransferModal,animations}.tsx` | `main.tsx`, `pages/CityPage/index.tsx` |

---

## Task 1: 扩展 Treasure 接口 + Material 类型

**Files:**
- Modify: `packages/shared-types/src/skill.ts`
- Modify: `packages/shared-types/src/save.ts`

- [ ] **Step 1: 修改 Treasure 接口**

Edit `packages/shared-types/src/skill.ts`, 在 `Treasure` 接口里加 2 个可选字段:

```ts
export interface Treasure {
  id: string
  name: string
  type: TreasureType
  sourceHeroId?: string
  skill: Skill
  triggerRate: number
  starLevel: number
  count?: number
  /** 强化等级 (0 = 未强化, 最大 45). 旧数据 backfill */
  level?: number
  /** 强化次数 (0-50). 旧数据 backfill */
  enhanceCount?: number
}
```

- [ ] **Step 2: 扩展 Material.type 联合**

Edit `packages/shared-types/src/save.ts`, 在 `Material.type` 联合里加 3 种:

```ts
export interface Material {
  type:
    | 'gold'
    | 'heroFragment'
    | 'treasureFragment'
    | 'jade'
    | 'heroToken'
    | 'bailiTicket'
    | 'qianliTicket'
    | 'wanliTicket'
    | 'enhancementTalisman'   // 强化符
    | 'luckyStone'            // 幸运石
    | 'transferTalisman'      // 转移符
  itemId?: string
  amount: number
}
```

- [ ] **Step 3: 重导出 + build 验证**

```bash
cd D:/work/hero-legend
npx turbo build --filter=@hero-legend/shared-types
```

Expected: 编译成功,无 type 错误。

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/src/skill.ts packages/shared-types/src/save.ts
git commit -m "feat(types): Treasure 加 level/enhanceCount 字段 + 3 种新材料"
```

---

## Task 2: 宝具定义 - 3 新主印 + 18 辅印扩展

**Files:**
- Modify: `packages/game-data/src/treasures/treasure-definitions.ts`

- [ ] **Step 1: 加 TreasureDefinition.effect 字段**

在 `treasure-definitions.ts` 顶部,`TreasureDefinition` 接口加可选 `effect`:

```ts
export interface TreasureDefinition {
  id: string
  name: string
  sourceHeroId: string | null
  sourceSkillId: string | null
  type: TreasureType
  description: string
  baseTriggerRate: number
  starLevel: number
  category?: SubTreasureCategory
  effect?: {
    hpBonus?: number
    rangeBonus?: number
    handBonus?: number
  }
}
```

- [ ] **Step 2: 删除原 18 辅印 (硬编码 30% starLevel 2)**

删除 `treasure-definitions.ts` 里 "===== 辅印 — 攻击类 =====" 到 "===== 辅印 — 锦囊类 =====" 整段 (3 个 category 块, 共 18 条)。

- [ ] **Step 3: 加入 3 新主印 × 5 星 = 15 条**

在 "===== 主印 ★★★ =====" 段后 (即 27 条主印之后, 新辅印之前) 加:

```ts
// ===== 主印 - 身强 (HP 上限 +N) =====
{ id: 'main_shengqiang', name: '身强', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +1。', baseTriggerRate: 1.0, starLevel: 1, effect: { hpBonus: 1 } },
{ id: 'main_shengqiang_2', name: '身强·贰', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +2。', baseTriggerRate: 1.0, starLevel: 2, effect: { hpBonus: 2 } },
{ id: 'main_shengqiang_3', name: '身强·叁', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +3。', baseTriggerRate: 1.0, starLevel: 3, effect: { hpBonus: 3 } },
{ id: 'main_shengqiang_4', name: '身强·肆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +4。', baseTriggerRate: 1.0, starLevel: 4, effect: { hpBonus: 4 } },
{ id: 'main_shengqiang_5', name: '身强·伍', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄体力上限 +5。', baseTriggerRate: 1.0, starLevel: 5, effect: { hpBonus: 5 } },

// ===== 主印 - 穿杨 (攻击距离 +N) =====
{ id: 'main_chuanyang', name: '穿杨', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +1。', baseTriggerRate: 1.0, starLevel: 1, effect: { rangeBonus: 1 } },
{ id: 'main_chuanyang_2', name: '穿杨·贰', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +2。', baseTriggerRate: 1.0, starLevel: 2, effect: { rangeBonus: 2 } },
{ id: 'main_chuanyang_3', name: '穿杨·叁', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +3。', baseTriggerRate: 1.0, starLevel: 3, effect: { rangeBonus: 3 } },
{ id: 'main_chuanyang_4', name: '穿杨·肆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +4。', baseTriggerRate: 1.0, starLevel: 4, effect: { rangeBonus: 4 } },
{ id: 'main_chuanyang_5', name: '穿杨·伍', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄攻击距离 +5。', baseTriggerRate: 1.0, starLevel: 5, effect: { rangeBonus: 5 } },

// ===== 主印 - 运筹 (手牌上限 +N) =====
{ id: 'main_yunchou', name: '运筹', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +1。', baseTriggerRate: 1.0, starLevel: 1, effect: { handBonus: 1 } },
{ id: 'main_yunchou_2', name: '运筹·贰', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +2。', baseTriggerRate: 1.0, starLevel: 2, effect: { handBonus: 2 } },
{ id: 'main_yunchou_3', name: '运筹·叁', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +3。', baseTriggerRate: 1.0, starLevel: 3, effect: { handBonus: 3 } },
{ id: 'main_yunchou_4', name: '运筹·肆', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +4。', baseTriggerRate: 1.0, starLevel: 4, effect: { handBonus: 4 } },
{ id: 'main_yunchou_5', name: '运筹·伍', sourceHeroId: null, sourceSkillId: null, type: 'main', description: '装备后英雄手牌上限 +5。', baseTriggerRate: 1.0, starLevel: 5, effect: { handBonus: 5 } },
```

- [ ] **Step 4: 加入 18 辅印 × 5 星 = 90 条**

在 3 新主印段后插入:

```ts
// ===== 辅印 - 攻击类 (5 星 =====
{ id: 'treasure-qiang-hua', name: '强化', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率令此伤害+1。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
{ id: 'treasure-qiang-hua-2', name: '强化·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率令此伤害+1。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
{ id: 'treasure-qiang-hua-3', name: '强化·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率令此伤害+1。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
{ id: 'treasure-qiang-hua-4', name: '强化·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率令此伤害+1。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
{ id: 'treasure-qiang-hua-5', name: '强化·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率令此伤害+1。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

{ id: 'treasure-xi-xue', name: '吸血', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率回复1点体力。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
{ id: 'treasure-xi-xue-2', name: '吸血·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率回复1点体力。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
{ id: 'treasure-xi-xue-3', name: '吸血·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率回复1点体力。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
{ id: 'treasure-xi-xue-4', name: '吸血·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率回复1点体力。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
{ id: 'treasure-xi-xue-5', name: '吸血·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率回复1点体力。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

{ id: 'treasure-jing-zhun', name: '精准', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 15% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
{ id: 'treasure-jing-zhun-2', name: '精准·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 20% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
{ id: 'treasure-jing-zhun-3', name: '精准·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 25% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
{ id: 'treasure-jing-zhun-4', name: '精准·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 30% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
{ id: 'treasure-jing-zhun-5', name: '精准·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】指定目标后，基础 35% 几率令此【杀】不可被【闪】响应。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

{ id: 'treasure-sha-zhi-tan', name: '杀之贪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
{ id: 'treasure-sha-zhi-tan-2', name: '杀之贪·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
{ id: 'treasure-sha-zhi-tan-3', name: '杀之贪·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
{ id: 'treasure-sha-zhi-tan-4', name: '杀之贪·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
{ id: 'treasure-sha-zhi-tan-5', name: '杀之贪·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

{ id: 'treasure-sha-zhi-xie', name: '杀之卸', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 15% 几率弃置目标一张装备牌。', baseTriggerRate: 0.15, starLevel: 1, category: '攻击' },
{ id: 'treasure-sha-zhi-xie-2', name: '杀之卸·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 20% 几率弃置目标一张装备牌。', baseTriggerRate: 0.20, starLevel: 2, category: '攻击' },
{ id: 'treasure-sha-zhi-xie-3', name: '杀之卸·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 25% 几率弃置目标一张装备牌。', baseTriggerRate: 0.25, starLevel: 3, category: '攻击' },
{ id: 'treasure-sha-zhi-xie-4', name: '杀之卸·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 30% 几率弃置目标一张装备牌。', baseTriggerRate: 0.30, starLevel: 4, category: '攻击' },
{ id: 'treasure-sha-zhi-xie-5', name: '杀之卸·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【杀】造成伤害后，基础 35% 几率弃置目标一张装备牌。', baseTriggerRate: 0.35, starLevel: 5, category: '攻击' },

// ===== 辅印 - 防御类 =====
{ id: 'treasure-shang-zhi-chou', name: '伤之仇', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-shang-zhi-chou-2', name: '伤之仇·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-shang-zhi-chou-3', name: '伤之仇·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-shang-zhi-chou-4', name: '伤之仇·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-shang-zhi-chou-5', name: '伤之仇·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率令伤害来源受到1点伤害。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

{ id: 'treasure-shang-zhi-tan', name: '伤之贪', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-shang-zhi-tan-2', name: '伤之贪·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-shang-zhi-tan-3', name: '伤之贪·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-shang-zhi-tan-4', name: '伤之贪·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-shang-zhi-tan-5', name: '伤之贪·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

{ id: 'treasure-yi-xin', name: '医心', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 15% 几率额外回复1点体力。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-yi-xin-2', name: '医心·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 20% 几率额外回复1点体力。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-yi-xin-3', name: '医心·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 25% 几率额外回复1点体力。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-yi-xin-4', name: '医心·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 30% 几率额外回复1点体力。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-yi-xin-5', name: '医心·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【药】时，基础 35% 几率额外回复1点体力。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

{ id: 'treasure-qing-ling', name: '轻灵', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-qing-ling-2', name: '轻灵·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-qing-ling-3', name: '轻灵·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-qing-ling-4', name: '轻灵·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-qing-ling-5', name: '轻灵·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【闪】后，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

{ id: 'treasure-hei-sha-dun', name: '黑杀盾', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 15% 几率防止此伤害。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-hei-sha-dun-2', name: '黑杀盾·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 20% 几率防止此伤害。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-hei-sha-dun-3', name: '黑杀盾·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 25% 几率防止此伤害。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-hei-sha-dun-4', name: '黑杀盾·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 30% 几率防止此伤害。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-hei-sha-dun-5', name: '黑杀盾·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到黑色【杀】的伤害后，基础 35% 几率防止此伤害。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

{ id: 'treasure-hong-sha-dun', name: '红杀盾', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 15% 几率防止此伤害。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-hong-sha-dun-2', name: '红杀盾·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 20% 几率防止此伤害。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-hong-sha-dun-3', name: '红杀盾·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 25% 几率防止此伤害。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-hong-sha-dun-4', name: '红杀盾·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 30% 几率防止此伤害。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-hong-sha-dun-5', name: '红杀盾·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到红色【杀】的伤害后，基础 35% 几率防止此伤害。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

{ id: 'treasure-shang-zhi-xie', name: '伤之卸', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-shang-zhi-xie-2', name: '伤之卸·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-shang-zhi-xie-3', name: '伤之卸·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-shang-zhi-xie-4', name: '伤之卸·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-shang-zhi-xie-5', name: '伤之卸·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率弃置伤害来源一张装备牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

{ id: 'treasure-shang-zhi-xue', name: '伤之削', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 15% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.15, starLevel: 1, category: '防御' },
{ id: 'treasure-shang-zhi-xue-2', name: '伤之削·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 20% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.20, starLevel: 2, category: '防御' },
{ id: 'treasure-shang-zhi-xue-3', name: '伤之削·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 25% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.25, starLevel: 3, category: '防御' },
{ id: 'treasure-shang-zhi-xue-4', name: '伤之削·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 30% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.30, starLevel: 4, category: '防御' },
{ id: 'treasure-shang-zhi-xue-5', name: '伤之削·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你受到【杀】的伤害后，基础 35% 几率弃置伤害来源一张手牌。', baseTriggerRate: 0.35, starLevel: 5, category: '防御' },

// ===== 辅印 - 锦囊类 =====
{ id: 'treasure-tan-shou', name: '贪手', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 15% 几率额外摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
{ id: 'treasure-tan-shou-2', name: '贪手·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 20% 几率额外摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
{ id: 'treasure-tan-shou-3', name: '贪手·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 25% 几率额外摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
{ id: 'treasure-tan-shou-4', name: '贪手·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 30% 几率额外摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
{ id: 'treasure-tan-shou-5', name: '贪手·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '摸牌阶段开始时，基础 35% 几率额外摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

{ id: 'treasure-sheng-you', name: '生有', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 15% 几率额外摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
{ id: 'treasure-sheng-you-2', name: '生有·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 20% 几率额外摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
{ id: 'treasure-sheng-you-3', name: '生有·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 25% 几率额外摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
{ id: 'treasure-sheng-you-4', name: '生有·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 30% 几率额外摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
{ id: 'treasure-sheng-you-5', name: '生有·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无中生有】时，基础 35% 几率额外摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

{ id: 'treasure-lang-yan', name: '狼烟', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 15% 几率使其伤害+1。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
{ id: 'treasure-lang-yan-2', name: '狼烟·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 20% 几率使其伤害+1。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
{ id: 'treasure-lang-yan-3', name: '狼烟·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 25% 几率使其伤害+1。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
{ id: 'treasure-lang-yan-4', name: '狼烟·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 30% 几率使其伤害+1。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
{ id: 'treasure-lang-yan-5', name: '狼烟·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【烽火狼烟】时，基础 35% 几率使其伤害+1。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

{ id: 'treasure-wan-jian', name: '万箭', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 15% 几率使其伤害+1。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
{ id: 'treasure-wan-jian-2', name: '万箭·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 20% 几率使其伤害+1。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
{ id: 'treasure-wan-jian-3', name: '万箭·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 25% 几率使其伤害+1。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
{ id: 'treasure-wan-jian-4', name: '万箭·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 30% 几率使其伤害+1。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
{ id: 'treasure-wan-jian-5', name: '万箭·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【万箭齐发】时，基础 35% 几率使其伤害+1。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },

{ id: 'treasure-wu-xie', name: '无懈', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 15% 几率摸一张牌。', baseTriggerRate: 0.15, starLevel: 1, category: '锦囊' },
{ id: 'treasure-wu-xie-2', name: '无懈·贰', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 20% 几率摸一张牌。', baseTriggerRate: 0.20, starLevel: 2, category: '锦囊' },
{ id: 'treasure-wu-xie-3', name: '无懈·叁', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 25% 几率摸一张牌。', baseTriggerRate: 0.25, starLevel: 3, category: '锦囊' },
{ id: 'treasure-wu-xie-4', name: '无懈·肆', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 30% 几率摸一张牌。', baseTriggerRate: 0.30, starLevel: 4, category: '锦囊' },
{ id: 'treasure-wu-xie-5', name: '无懈·伍', sourceHeroId: null, sourceSkillId: null, type: 'sub', description: '你使用【无懈可击】时，基础 35% 几率摸一张牌。', baseTriggerRate: 0.35, starLevel: 5, category: '锦囊' },
```

- [ ] **Step 5: build 验证**

```bash
npx turbo build --filter=@hero-legend/game-data
```

Expected: 类型编译通过 (save/skill 都已 build)。

- [ ] **Step 6: Commit**

```bash
git add packages/game-data/src/treasures/treasure-definitions.ts
git commit -m "feat(game-data): 3 新主印 + 90 辅印 (5 星) + TreasureDefinition.effect"
```

---

## Task 3: 调整 treasure-generator 使用新字段

**Files:**
- Modify: `packages/game-data/src/treasures/treasure-generator.ts`

- [ ] **Step 1: `generateTreasureDrop` 使用 effect**

修改 `treasure-generator.ts` 的 `generateTreasureDrop` 函数 (line 4-35),把生成的 `treasure` 对象加 `effect` 字段透传:

```ts
const treasure: Treasure = {
  id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: def.name,
  type: def.type,
  sourceHeroId: def.sourceHeroId ?? undefined,
  skill: {
    id: def.sourceSkillId ?? def.id,
    name: def.name,
    type: 'passive',
    description: def.description,
  },
  triggerRate,
  starLevel: def.starLevel,
  count: 1,
  effect: def.effect,
}
```

- [ ] **Step 2: `pickTreasureFromPool` 透传 effect**

修改同文件 `pickTreasureFromPool` 函数 (line 69-89) 的 return 对象:

```ts
return {
  id: `t-enemy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  name: def.name,
  type: def.type,
  sourceHeroId: def.sourceHeroId ?? undefined,
  skill: {
    id: def.sourceSkillId ?? def.id,
    name: def.name,
    type: 'passive',
    description: def.description,
  },
  triggerRate: def.type === 'main' ? 1.0 : def.baseTriggerRate,
  starLevel: def.starLevel,
  effect: def.effect,
}
```

- [ ] **Step 3: `generateInitialTreasures` 透传 effect**

修改 `generateInitialTreasures` (line 125-158) 里两处 push:

主印 push (line 131-141):
```ts
treasures.push({
  id: `t-init-${def.id}`,
  name: def.name,
  type: 'main',
  sourceHeroId: def.sourceHeroId ?? undefined,
  skill: { id: def.sourceSkillId ?? def.id, name: def.name, type: 'passive', description: def.description },
  triggerRate: 1.0,
  starLevel: def.starLevel,
  count: 50,
  effect: def.effect,
})
```

辅印 push (line 144-155):
```ts
treasures.push({
  id: `t-init-${def.id}`,
  name: def.name,
  type: 'sub',
  sourceHeroId: def.sourceHeroId ?? undefined,
  skill: { id: def.sourceSkillId ?? def.id, name: def.name, type: 'passive', description: def.description },
  triggerRate: def.baseTriggerRate,
  starLevel: def.starLevel,
  count: 50,
  effect: def.effect,
})
```

- [ ] **Step 4: build 验证**

```bash
npx turbo build --filter=@hero-legend/game-data
```

- [ ] **Step 5: Commit**

```bash
git add packages/game-data/src/treasures/treasure-generator.ts
git commit -m "feat(game-data): treasure-generator 透传 effect 字段"
```

---

## Task 4: 游戏引擎 - 主印效果加成 (HP/range/handLimit)

**Files:**
- Modify: `packages/game-engine/src/core/Player.ts`

- [ ] **Step 1: `Player.constructor` 加 HP bonus**

在 `Player.ts` line 14 替换:

```ts
constructor(hero: Hero, instance: HeroInstance, role: Role) {
  const baseHp = getHpByStar(hero.baseHp, instance.starLevel)
  const hpBonus = (instance.treasures.main ?? [])
    .filter((t): t is NonNullable<typeof t> => t != null)
    .reduce((sum, t) => sum + (t.effect?.hpBonus ?? 0), 0)
  const maxHp = baseHp + hpBonus
  this.hero = {
    instance,
    hero,
    role,
    currentHp: maxHp,
    maxHp,
    handCards: [],
    equipment: { weapon: null, attackMount: null, defenseMount: null, armor: null },
    judgeCards: [],
    statusEffects: [],
    skillUsesThisTurn: {},
  }
}
```

- [ ] **Step 2: `getHandLimit` 加运筹 bonus**

修改 `getHandLimit` (line 37-42):

```ts
getHandLimit(): number {
  let limit = this.hero.currentHp
  // 乾坤袋: 手牌上限+1
  if (this.getArmorName() === '乾坤袋') limit += 1
  // 运筹 主印: 手牌上限 +N
  const handBonus = (this.hero.instance.treasures.main ?? [])
    .filter((t): t is NonNullable<typeof t> => t != null)
    .reduce((sum, t) => sum + (t.effect?.handBonus ?? 0), 0)
  limit += handBonus
  return limit
}
```

- [ ] **Step 3: `getAttackRange` 加穿杨 bonus**

修改 `getAttackRange` (line 109-117):

```ts
getAttackRange(): number {
  let range = 1
  const weapon = this.equippedCards.get('weapon')
  if (weapon) range = (weapon as any).range ?? 1
  if (this.hero.equipment.attackMount) range += 1
  // 骑射/单骑: 默认视为装备进攻马
  if (this.hasSkillOrTreasure('qi-she') || this.hasSkillOrTreasure('dan-qi')) range += 1
  // 穿杨 主印: 攻击距离 +N
  const rangeBonus = (this.hero.instance.treasures.main ?? [])
    .filter((t): t is NonNullable<typeof t> => t != null)
    .reduce((sum, t) => sum + (t.effect?.rangeBonus ?? 0), 0)
  range += rangeBonus
  return range
}
```

- [ ] **Step 4: build 验证 + commit**

```bash
npx tsc -p packages/game-engine
git add packages/game-engine/src/core/Player.ts
git commit -m "feat(game-engine): Player 集成主印 HP/range/handLimit bonus"
```

Expected: 类型编译通过。

---

## Task 5: 游戏引擎 - 辅印触发公式加等级加成

**Files:**
- Modify: `packages/game-engine/src/core/Game.ts`

- [ ] **Step 1: 修改 `rollSubTreasure`**

修改 `Game.ts` line 307-312 的 `rollSubTreasure`:

```ts
private rollSubTreasure(player: Player, skillId: string): boolean {
  const treasure = [...player.hero.instance.treasures.sub].find(t => t?.skill.id === skillId)
  if (!treasure) return false
  const bonus = getSubTriggerBonus(player.hero.instance.starLevel)
  const levelBonus = (treasure.level ?? 0) * 0.01
  return Math.random() < treasure.triggerRate + levelBonus + bonus
}
```

- [ ] **Step 2: build 验证 + commit**

```bash
npx tsc -p packages/game-engine
git add packages/game-engine/src/core/Game.ts
git commit -m "feat(game-engine): rollSubTreasure 加 level 加成"
```

---

## Task 6: SaveService 迁移 + 新 updateTreasure + 强化符 seed

**Files:**
- Modify: `apps/server/src/modules/save/save.service.ts`

- [ ] **Step 1: `getSave` 加 treasure 字段 backfill**

在 `getSave` 函数 (line 14-59) 现有的 patch 段后加:

```ts
// 老存档的 treasure 缺 level/enhanceCount/triggerRate → backfill
if (save.treasures && save.treasures.length > 0) {
  for (const t of save.treasures as any[]) {
    if (t.level == null) { t.level = 0; patched = true }
    if (t.enhanceCount == null) { t.enhanceCount = 0; patched = true }
    // 老 18 辅印 (硬编码 starLevel=2 + 无 triggerRate) → 新 ★2 (0.20)
    if (t.type === 'sub' && t.triggerRate == null) {
      t.starLevel = 2
      t.triggerRate = 0.20
      patched = true
    }
  }
}
// 老存档 seed 强化符 20 张 (新手补偿)
if (!save.materials.find((m: any) => m.type === 'enhancementTalisman')) {
  save.materials.push({ type: 'enhancementTalisman', amount: 20 })
  patched = true
}
```

- [ ] **Step 2: `createSave` 加强化符 seed**

修改 `createSave` (line 61-90),在 materials 数组里加:

```ts
materials: [
  { type: 'gold', amount: 1000 },
  { type: 'bailiTicket', amount: 99 },
  { type: 'qianliTicket', amount: 99 },
  { type: 'wanliTicket', amount: 99 },
  { type: 'enhancementTalisman', amount: 20 },  // 强化符新手 20 张
],
```

- [ ] **Step 3: 新增 `updateTreasure` 方法**

在 `save.service.ts` 文件末尾加新方法:

```ts
/**
 * 更新指定 treasure 的字段 (level / enhanceCount / triggerRate 等)
 * 用数组元素匹配定位, 然后 $set 更新
 */
async updateTreasure(userId: string, treasureId: string, patch: Record<string, any>): Promise<SaveDoc | null> {
  return this.saveModel.findOneAndUpdate(
    { userId, 'treasures.id': treasureId },
    {
      $set: Object.fromEntries(Object.entries(patch).map(([k, v]) => [`treasures.$.${k}`, v])),
      $set: { ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [`treasures.$.${k}`, v])), updatedAt: Date.now() },
    },
    { new: true },
  ).exec()
}
```

> 注意: 上面 `$set` 是合并写法,实际只有一个 `$set` (用 spread)。修正:

```ts
async updateTreasure(userId: string, treasureId: string, patch: Record<string, any>): Promise<SaveDoc | null> {
  const setFields: Record<string, any> = { updatedAt: Date.now() }
  for (const [k, v] of Object.entries(patch)) {
    setFields[`treasures.$.${k}`] = v
  }
  return this.saveModel.findOneAndUpdate(
    { userId, 'treasures.id': treasureId },
    { $set: setFields },
    { new: true },
  ).exec()
}
```

- [ ] **Step 4: build 验证 + commit**

```bash
npx turbo build --filter=@hero-legend/server
git add apps/server/src/modules/save/save.service.ts
git commit -m "feat(server): SaveService 迁移 treasure 字段 + updateTreasure 方法"
```

---

## Task 7: TreasureService - upgrade 业务逻辑

**Files:**
- Create: `apps/server/src/modules/treasure/treasure.service.ts`

- [ ] **Step 1: 写 TreasureService 文件**

```ts
import { Injectable, BadRequestException } from '@nestjs/common'
import { SaveService } from '../save/save.service'
import type { Treasure } from '@hero-legend/shared-types'

export interface UpgradeResult {
  success: boolean
  newLevel: number
  successRate: number  // adjustedRate (含 luckyStones 加成)
  baseRate: number     // 原始 rate (不含 luckyStones)
  goldCost: number
  luckyStonesUsed: number
  treasure: Treasure
}

@Injectable()
export class TreasureService {
  constructor(private saveService: SaveService) {}

  private isMain(t: Treasure): boolean {
    return t.type === 'main'
  }

  async upgrade(userId: string, treasureId: string, luckyStones: number): Promise<UpgradeResult> {
    if (luckyStones < 0 || luckyStones > 6 || !Number.isInteger(luckyStones)) {
      throw new BadRequestException('幸运石数量需在 0-6 之间')
    }

    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const treasure = (save.treasures as Treasure[]).find(t => t.id === treasureId)
    if (!treasure) throw new BadRequestException('宝具不存在')
    if (this.isMain(treasure)) throw new BadRequestException('主印不可强化')

    const level = treasure.level ?? 0
    if (level >= 45) throw new BadRequestException('已满级 (45)')

    const enhanceCount = treasure.enhanceCount ?? 0
    if (enhanceCount >= 50) throw new BadRequestException('强化次数已用尽 (50/50)')

    // 成功率: L0=100% → L44=15%
    const baseRate = Math.round(100 - level * 85 / 44)
    const goldCost = 100 * (level + 1)

    // 检查材料
    const talisman = (save.materials as any[]).find(m => m.type === 'enhancementTalisman')
    if (!talisman || talisman.amount < 1) throw new BadRequestException('强化符不足')

    if (luckyStones > 0) {
      const lucky = (save.materials as any[]).find(m => m.type === 'luckyStone')
      if (!lucky || lucky.amount < luckyStones) throw new BadRequestException('幸运石不足')
    }

    const gold = (save.materials as any[]).find(m => m.type === 'gold')
    if (!gold || gold.amount < goldCost) throw new BadRequestException('金币不足')

    // RNG
    const adjustedRate = Math.min(100, baseRate + luckyStones * 5)
    const roll = Math.random() * 100
    const success = roll < adjustedRate

    // 扣材料 (无条件)
    await this.saveService.spendMaterial(userId, 'enhancementTalisman', 1)
    if (luckyStones > 0) {
      await this.saveService.spendMaterial(userId, 'luckyStone', luckyStones)
    }
    await this.saveService.spendMaterial(userId, 'gold', goldCost)

    // 更新 treasure
    const newLevel = success ? level + 1 : level
    const newEnhanceCount = enhanceCount + 1
    await this.saveService.updateTreasure(userId, treasureId, {
      level: newLevel,
      enhanceCount: newEnhanceCount,
    })

    // 返回最新 treasure
    const updatedSave = await this.saveService.getSave(userId)
    const updatedTreasure = (updatedSave!.treasures as Treasure[]).find(t => t.id === treasureId)!

    return {
      success,
      newLevel,
      successRate: adjustedRate,
      baseRate,
      goldCost,
      luckyStonesUsed: luckyStones,
      treasure: updatedTreasure,
    }
  }

  async transferLevel(userId: string, fromTreasureId: string, toTreasureId: string) {
    const save = await this.saveService.getSave(userId)
    if (!save) throw new BadRequestException('存档不存在')

    const from = (save.treasures as Treasure[]).find(t => t.id === fromTreasureId)
    const to = (save.treasures as Treasure[]).find(t => t.id === toTreasureId)
    if (!from) throw new BadRequestException('源宝具不存在')
    if (!to) throw new BadRequestException('目标宝具不存在')

    if (this.isMain(from) || this.isMain(to)) {
      throw new BadRequestException('主印不可转移')
    }

    const fromLevel = from.level ?? 0
    const toLevel = to.level ?? 0
    if (fromLevel < 1) throw new BadRequestException('源无等级可转移')
    if (toLevel > 0) throw new BadRequestException('目标已有等级,无法接收')

    const transferMat = (save.materials as any[]).find(m => m.type === 'transferTalisman')
    if (!transferMat || transferMat.amount < 1) throw new BadRequestException('转移符不足')

    // 扣转移符
    await this.saveService.spendMaterial(userId, 'transferTalisman', 1)

    // 更新 source.level = 0
    await this.saveService.updateTreasure(userId, fromTreasureId, { level: 0 })
    // 更新 target.level = fromLevel (transfer 前的)
    await this.saveService.updateTreasure(userId, toTreasureId, { level: fromLevel })

    const updatedSave = await this.saveService.getSave(userId)
    const updatedFrom = (updatedSave!.treasures as Treasure[]).find(t => t.id === fromTreasureId)!
    const updatedTo = (updatedSave!.treasures as Treasure[]).find(t => t.id === toTreasureId)!

    return {
      fromTreasure: updatedFrom,
      toTreasure: updatedTo,
      transferredLevel: fromLevel,
    }
  }
}
```

- [ ] **Step 2: build 验证 + commit**

```bash
npx turbo build --filter=@hero-legend/server
git add apps/server/src/modules/treasure/treasure.service.ts
git commit -m "feat(server): TreasureService 实现 upgrade + transferLevel"
```

---

## Task 8: TreasureController - 2 个端点

**Files:**
- Create: `apps/server/src/modules/treasure/treasure.controller.ts`

- [ ] **Step 1: 写 controller**

```ts
import { Controller, Post, Param, Body } from '@nestjs/common'
import { TreasureService } from './treasure.service'

@Controller('treasure')
export class TreasureController {
  constructor(private treasureService: TreasureService) {}

  @Post('upgrade/:userId/:treasureId')
  async upgrade(
    @Param('userId') userId: string,
    @Param('treasureId') treasureId: string,
    @Body() body: { luckyStones?: number },
  ) {
    return this.treasureService.upgrade(userId, treasureId, body.luckyStones ?? 0)
  }

  @Post('transfer-level/:userId')
  async transfer(
    @Param('userId') userId: string,
    @Body() body: { fromTreasureId: string; toTreasureId: string },
  ) {
    return this.treasureService.transferLevel(userId, body.fromTreasureId, body.toTreasureId)
  }
}
```

- [ ] **Step 2: build 验证 + commit**

```bash
npx turbo build --filter=@hero-legend/server
git add apps/server/src/modules/treasure/treasure.controller.ts
git commit -m "feat(server): TreasureController 暴露 upgrade + transfer-level 路由"
```

---

## Task 9: TreasureModule + AppModule 注册

**Files:**
- Create: `apps/server/src/modules/treasure/treasure.module.ts`
- Modify: `apps/server/src/app.module.ts`

- [ ] **Step 1: 写 TreasureModule**

```ts
import { Module } from '@nestjs/common'
import { TreasureController } from './treasure.controller'
import { TreasureService } from './treasure.service'
import { SaveModule } from '../save/save.module'

@Module({
  imports: [SaveModule],
  controllers: [TreasureController],
  providers: [TreasureService],
})
export class TreasureModule {}
```

- [ ] **Step 2: 在 AppModule 注册**

修改 `apps/server/src/app.module.ts`:

```ts
import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { BattleModule } from './modules/battle/battle.module'
import { HeroModule } from './modules/hero/hero.module'
import { StageModule } from './modules/stage/stage.module'
import { SaveModule } from './modules/save/save.module'
import { RecruitModule } from './modules/recruit/recruit.module'
import { TreasureModule } from './modules/treasure/treasure.module'

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/hero-legend'),
    BattleModule,
    HeroModule,
    StageModule,
    SaveModule,
    RecruitModule,
    TreasureModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: build 验证 + commit**

```bash
npx turbo build --filter=@hero-legend/server
git add apps/server/src/modules/treasure/treasure.module.ts apps/server/src/app.module.ts
git commit -m "feat(server): 注册 TreasureModule"
```

---

## Task 10: BattleService - 幸运石/转移符掉落

**Files:**
- Modify: `apps/server/src/modules/battle/battle.service.ts`

- [ ] **Step 1: 强化现有强化符掉率 + 加新材料**

修改 `saveResult` 函数 (line 91-108 之间),在 `cardDrops` 块后新增:

```ts
// 关卡胜利后掉落强化符 + 幸运石 + 转移符
const materialDrops: Array<{ type: string; amount: number }> = []
if (result.won && stage) {
  const isBoss = stage.battles[battleIdx]?.isBoss ?? false
  if (isBoss) {
    materialDrops.push({ type: 'enhancementTalisman', amount: 2 })
    if (Math.random() < 0.33) materialDrops.push({ type: 'luckyStone', amount: 1 })
    if (Math.random() < 0.33) materialDrops.push({ type: 'transferTalisman', amount: 1 })
  } else {
    if (Math.random() < 0.30) materialDrops.push({ type: 'enhancementTalisman', amount: 1 })
    if (Math.random() < 0.10) materialDrops.push({ type: 'luckyStone', amount: 1 })
    if (Math.random() < 0.10) materialDrops.push({ type: 'transferTalisman', amount: 1 })
  }
  for (const drop of materialDrops) {
    const mat = save.materials.find((m: any) => m.type === drop.type)
    if (mat) mat.amount += drop.amount
    else save.materials.push({ type: drop.type, amount: drop.amount })
  }
}
```

> 删除 line 93-108 旧 cardDrops 那段 (抽卡券掉落),与 materialDrops 合并成一个块。

替换为完整版:

```ts
// 关卡胜利后发奖: 抽卡券 + 强化符 + 幸运石 + 转移符
const allDrops: Array<{ type: string; amount: number }> = []
if (result.won && stage) {
  const isBoss = stage.battles[battleIdx]?.isBoss ?? false
  if (isBoss) {
    allDrops.push({ type: 'qianliTicket', amount: 1 })
    if (Math.random() < 0.05) allDrops.push({ type: 'wanliTicket', amount: 1 })
    allDrops.push({ type: 'enhancementTalisman', amount: 2 })
    if (Math.random() < 0.33) allDrops.push({ type: 'luckyStone', amount: 1 })
    if (Math.random() < 0.33) allDrops.push({ type: 'transferTalisman', amount: 1 })
  } else {
    if (Math.random() < 0.20) allDrops.push({ type: 'bailiTicket', amount: 1 })
    if (Math.random() < 0.30) allDrops.push({ type: 'enhancementTalisman', amount: 1 })
    if (Math.random() < 0.10) allDrops.push({ type: 'luckyStone', amount: 1 })
    if (Math.random() < 0.10) allDrops.push({ type: 'transferTalisman', amount: 1 })
  }
  for (const drop of allDrops) {
    const mat = save.materials.find((m: any) => m.type === drop.type)
    if (mat) mat.amount += drop.amount
    else save.materials.push({ type: drop.type, amount: drop.amount })
  }
}
```

- [ ] **Step 2: 把 return 里的 cardDrops 改名 allDrops**

修改最后 return (line 117):

```ts
return { success: true, rewards: result.rewards, droppedTreasure, drops: allDrops }
```

(把 cardDrops 改成 allDrops,字段名也改为 drops)

- [ ] **Step 3: build 验证 + commit**

```bash
npx turbo build --filter=@hero-legend/server
git add apps/server/src/modules/battle/battle.service.ts
git commit -m "feat(server): BattleService 合并抽卡券+强化符+幸运石+转移符掉落"
```

---

## Task 11: web 路由 + CityPage 入口

**Files:**
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/src/pages/CityPage/index.tsx`

- [ ] **Step 1: main.tsx 加路由**

修改 `apps/web/src/main.tsx`:

在顶部 import 加:
```tsx
import { TreasureWorkshopPage } from './pages/TreasureWorkshopPage'
```

在 `<Routes>` 里加:
```tsx
<Route path="/treasure-workshop" element={<TreasureWorkshopPage />} />
```

- [ ] **Step 2: CityPage 加宝具工坊入口**

修改 `apps/web/src/pages/CityPage/index.tsx`:

在 `buildingDescs` 下的 `smelt` 按钮 (line 111-115) 后加:

```tsx
{b.type === 'treasureWorkshop' && (
  <button style={{ width: '100%', fontSize: '12px', marginBottom: '8px' }}
    onClick={() => navigate('/treasure-workshop')}>
    进入宝具工坊
  </button>
)}
```

- [ ] **Step 3: build 验证 (web 端 build 暂时没 step 12+ 的代码会失败, 这里只 lint)**

```bash
cd apps/web && npx tsc --noEmit
```

Expected: 报缺 `./pages/TreasureWorkshopPage` 模块错误 — 这是预期的, 后面的 Task 创建后会消失。

- [ ] **Step 4: Commit (web 端代码片段占位)**

先创建占位文件让 build 通过:

```tsx
// apps/web/src/pages/TreasureWorkshopPage/index.tsx
export function TreasureWorkshopPage() { return <div>宝具工坊 (TODO)</div> }
```

```bash
mkdir -p apps/web/src/pages/TreasureWorkshopPage
```

然后写文件:
```tsx
export function TreasureWorkshopPage() {
  return <div style={{ padding: 40 }}>宝具工坊 (开发中)</div>
}
```

跑 build:
```bash
npx turbo build --filter=@hero-legend/web
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/main.tsx apps/web/src/pages/CityPage/index.tsx apps/web/src/pages/TreasureWorkshopPage/index.tsx
git commit -m "feat(web): 加 /treasure-workshop 路由 + CityPage 入口"
```

---

## Task 12: 宝具工坊 - animations.ts

**Files:**
- Create: `apps/web/src/pages/TreasureWorkshopPage/animations.ts`

- [ ] **Step 1: 写 animations.ts**

```ts
/**
 * 宝具工坊用到的 CSS keyframes. 沿用 SmelterPage 的 slot-pulse/flicker/cauldron-shake,
 * 新增 success-burst / failure-flicker.
 */
export const WORKSHOP_KEYFRAMES = `
@keyframes slot-pulse {
  0%, 100% { box-shadow: 0 0 8px 2px rgba(255, 213, 79, 0.3); }
  50%      { box-shadow: 0 0 16px 4px rgba(255, 213, 79, 0.7); }
}
@keyframes cauldron-shake {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-2deg); }
  75%      { transform: rotate(2deg); }
}
@keyframes success-burst {
  0%   { transform: scale(0.5); opacity: 0; }
  30%  { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(2.0); opacity: 0; }
}
@keyframes failure-flicker {
  0%, 100% { filter: brightness(0.6); }
  50%      { filter: brightness(0.3); }
}
`

let injected = false

export function useWorkshopKeyframes(): void {
  if (typeof document === 'undefined') return
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-workshop', 'true')
  style.textContent = WORKSHOP_KEYFRAMES
  document.head.appendChild(style)
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/TreasureWorkshopPage/animations.ts
git commit -m "feat(web): TreasureWorkshopPage animations.ts (success-burst + failure-flicker)"
```

---

## Task 13: Cauldron 组件 (1 槽)

**Files:**
- Create: `apps/web/src/pages/TreasureWorkshopPage/Cauldron.tsx`

- [ ] **Step 1: 写 Cauldron.tsx**

```tsx
import type { Treasure } from '@hero-legend/shared-types'

interface CauldronProps {
  selectedTreasure: Treasure | null
  phase: 'idle' | 'upgrading' | 'revealed'
  onSlotClick: () => void
}

const SLOT_COLOR_BY_STAR: Record<number, string> = {
  1: '#8a6a3a',
  2: '#8a6a3a',
  3: '#8a6a3a',
  4: '#9c7ec8',
  5: '#ffd54f',
}

export function Cauldron({ selectedTreasure, phase, onSlotClick }: CauldronProps) {
  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 炉身 */}
      <div style={{
        width: '200px', height: '200px', borderRadius: '50%',
        background: 'radial-gradient(circle, #2a1a0a, #1a0a00)',
        border: '3px solid #4a2a1a',
        boxShadow: '0 0 30px rgba(255, 100, 0, 0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
        animation: phase === 'upgrading' ? 'cauldron-shake 200ms ease-in-out infinite' : 'none',
        filter: phase === 'revealed' ? 'brightness(1.2)' : 'none',
      }}>
        {/* 槽 */}
        <div
          onClick={onSlotClick}
          style={{
            width: '120px', height: '120px', borderRadius: '8px',
            background: selectedTreasure ? 'transparent' : 'rgba(0,0,0,0.5)',
            border: `2px dashed ${selectedTreasure ? SLOT_COLOR_BY_STAR[selectedTreasure.starLevel] : 'rgba(255,255,255,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: phase === 'idle' ? 'pointer' : 'not-allowed',
            animation: phase === 'idle' && !selectedTreasure ? 'slot-pulse 1500ms ease-in-out infinite' : 'none',
            '--slot-color': selectedTreasure ? SLOT_COLOR_BY_STAR[selectedTreasure.starLevel] : 'rgba(255, 213, 79, 0.3)',
          } as any}
        >
          {selectedTreasure && (
            <div style={{ textAlign: 'center', color: 'var(--text-gold)' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                {'★'.repeat(selectedTreasure.starLevel)}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>
                {selectedTreasure.name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Lv.{selectedTreasure.level ?? 0}
              </div>
            </div>
          )}
          {!selectedTreasure && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              请从右侧选辅印
            </div>
          )}
        </div>

        {/* success-burst 光环 (仅 revealed-success 时) */}
        {phase === 'revealed' && (
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '3px solid var(--text-gold)',
            animation: 'success-burst 1500ms ease-out forwards',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* 中央遮罩 */}
      {phase === 'upgrading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', borderRadius: '4px',
          pointerEvents: 'none', zIndex: 10,
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)', color: 'var(--text-gold)',
            padding: '8px 20px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold',
          }}>
            强化中...
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/TreasureWorkshopPage/Cauldron.tsx
git commit -m "feat(web): Cauldron 组件 (1 槽 + shake/burst 动画)"
```

---

## Task 14: SubTreasureList 组件 (90 条)

**Files:**
- Create: `apps/web/src/pages/TreasureWorkshopPage/SubTreasureList.tsx`

- [ ] **Step 1: 写 SubTreasureList.tsx**

```tsx
import type { Treasure } from '@hero-legend/shared-types'

interface SubTreasureListProps {
  treasures: Treasure[]
  selectedTreasureId: string | null
  disabledTreasureIds: Set<string>  // 已投入或强化次数已满
  onPick: (treasureId: string) => void
  disabled?: boolean
}

export function SubTreasureList({ treasures, selectedTreasureId, disabledTreasureIds, onPick, disabled }: SubTreasureListProps) {
  const subs = treasures.filter(t => t.type === 'sub')

  if (subs.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 16px' }}>
        没有辅印 — 去关卡战斗或熔炼获取
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px', padding: '0 4px' }}>
        点行投入强化 (90 条全展开)
      </div>
      {subs.map(t => {
        const lvl = t.level ?? 0
        const cnt = t.enhanceCount ?? 0
        const maxed = cnt >= 50
        const isSelected = selectedTreasureId === t.id
        const isDisabled = disabledTreasureIds.has(t.id) || maxed
        return (
          <div
            key={t.id}
            onClick={() => !disabled && !isDisabled && onPick(t.id)}
            style={{
              background: isSelected ? '#3a2a1a' : 'var(--bg-dark)',
              border: `1px solid ${isSelected ? 'var(--text-gold)' : 'var(--border-wood)'}`,
              borderRadius: '4px', padding: '6px 10px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: disabled || isDisabled ? 'not-allowed' : 'pointer',
              opacity: disabled || isDisabled ? 0.4 : 1,
              fontSize: '12px',
              transition: 'all 150ms',
            }}
          >
            <span style={{ color: 'var(--text-light)', fontWeight: 'bold' }}>
              {'★'.repeat(t.starLevel)} {t.name}
            </span>
            <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                Lv.{lvl}
              </span>
              <span style={{
                color: maxed ? '#ff6b6b' : 'var(--text-muted)',
                fontSize: '11px',
              }}>
                {cnt}/50{maxed ? ' (满)' : ''}
              </span>
              {maxed && <span style={{ fontSize: '10px', color: '#ff6b6b' }}>已满</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/TreasureWorkshopPage/SubTreasureList.tsx
git commit -m "feat(web): SubTreasureList 组件 (90 条 + 强化次数显示)"
```

---

## Task 15: TransferModal 组件

**Files:**
- Create: `apps/web/src/pages/TreasureWorkshopPage/TransferModal.tsx`

- [ ] **Step 1: 写 TransferModal.tsx**

```tsx
import { useState, useEffect } from 'react'
import type { Treasure } from '@hero-legend/shared-types'

interface TransferModalProps {
  open: boolean
  treasures: Treasure[]
  transferTalismanCount: number
  onConfirm: (fromId: string, toId: string) => Promise<void>
  onClose: () => void
}

export function TransferModal({ open, treasures, transferTalismanCount, onConfirm, onClose }: TransferModalProps) {
  const [fromId, setFromId] = useState('')
  const [toId, setToId] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) { setFromId(''); setToId('') }
  }, [open])

  if (!open) return null

  const subs = treasures.filter(t => t.type === 'sub')
  const sources = subs.filter(t => (t.level ?? 0) >= 1)
  const targets = subs.filter(t => (t.level ?? 0) === 0)

  const fromTreasure = subs.find(t => t.id === fromId)
  const toTreasure = subs.find(t => t.id === toId)
  const canConfirm = !!fromTreasure && !!toTreasure && !busy && transferTalismanCount >= 1

  const handleConfirm = async () => {
    if (!canConfirm) return
    setBusy(true)
    try {
      await onConfirm(fromId, toId)
      onClose()
    } catch (e) {
      // error already toasted by parent
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: 'var(--bg-medium)', border: '2px solid var(--border-wood)',
        borderRadius: '8px', padding: '24px', minWidth: '480px', maxWidth: '600px',
      }}>
        <h3 style={{ color: 'var(--text-gold)', marginTop: 0 }}>等级转移</h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '13px' }}>源辅印 (需有等级)</label>
          <select
            value={fromId}
            onChange={e => setFromId(e.target.value)}
            style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', color: 'var(--text-light)', border: '1px solid var(--border-wood)', borderRadius: '4px' }}
          >
            <option value="">-- 选择 --</option>
            {sources.map(t => (
              <option key={t.id} value={t.id}>
                {'★'.repeat(t.starLevel)} {t.name} (Lv.{t.level}, {t.enhanceCount ?? 0}/50 次)
              </option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ color: 'var(--text-muted)', fontSize: '13px' }}>目标辅印 (需无等级)</label>
          <select
            value={toId}
            onChange={e => setToId(e.target.value)}
            style={{ width: '100%', padding: '8px', background: 'var(--bg-dark)', color: 'var(--text-light)', border: '1px solid var(--border-wood)', borderRadius: '4px' }}
          >
            <option value="">-- 选择 --</option>
            {targets.map(t => (
              <option key={t.id} value={t.id}>
                {'★'.repeat(t.starLevel)} {t.name} (Lv.0, {t.enhanceCount ?? 0}/50 次)
              </option>
            ))}
          </select>
        </div>

        {fromTreasure && toTreasure && (
          <div style={{
            background: 'var(--bg-dark)', borderRadius: '4px', padding: '12px',
            marginBottom: '12px', fontSize: '13px',
          }}>
            <div style={{ color: 'var(--text-muted)', marginBottom: '6px' }}>转移后:</div>
            <div style={{ color: 'var(--text-light)' }}>
              源: {'★'.repeat(fromTreasure.starLevel)} {fromTreasure.name}
              → Lv.0 ({fromTreasure.enhanceCount ?? 0}/50 次)
            </div>
            <div style={{ color: 'var(--text-gold)' }}>
              目标: {'★'.repeat(toTreasure.starLevel)} {toTreasure.name}
              → Lv.{fromTreasure.level} ({toTreasure.enhanceCount ?? 0}/50 次)
            </div>
          </div>
        )}

        <div style={{ color: transferTalismanCount >= 1 ? 'var(--text-light)' : '#ff6b6b', marginBottom: '16px', fontSize: '13px' }}>
          消耗: 1 张转移符 (你持有 {transferTalismanCount} 张)
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
          <button onClick={onClose} disabled={busy}>取消</button>
          <button className="primary" onClick={handleConfirm} disabled={!canConfirm}
            style={{ opacity: canConfirm ? 1 : 0.4 }}>
            {busy ? '转移中...' : '确认转移'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/pages/TreasureWorkshopPage/TransferModal.tsx
git commit -m "feat(web): TransferModal 组件"
```

---

## Task 16: 主页面 index.tsx - 整合所有组件 + 状态机

**Files:**
- Modify: `apps/web/src/pages/TreasureWorkshopPage/index.tsx`

- [ ] **Step 1: 重写 index.tsx**

替换 Task 11 创建的占位文件,写完整逻辑:

```tsx
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Treasure, Material } from '@hero-legend/shared-types'
import { Cauldron } from './Cauldron'
import { SubTreasureList } from './SubTreasureList'
import { TransferModal } from './TransferModal'
import { useWorkshopKeyframes } from './animations'

const API = '/api'

interface SaveData {
  treasures: Treasure[]
  materials: Material[]
}

type Phase = 'idle' | 'upgrading' | 'revealed'

export function TreasureWorkshopPage() {
  useWorkshopKeyframes()
  const navigate = useNavigate()
  const userId = localStorage.getItem('hero-legend-userId') || ''
  const [save, setSave] = useState<SaveData | null>(null)
  const [selectedTreasureId, setSelectedTreasureId] = useState<string | null>(null)
  const [luckyStones, setLuckyStones] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<{ success: boolean; newLevel: number; oldLevel: number } | null>(null)
  const [toast, setToast] = useState('')
  const [transferOpen, setTransferOpen] = useState(false)

  const refresh = useCallback(async () => {
    const data = await fetch(`${API}/save/${userId}`).then(r => r.json())
    setSave(data)
  }, [userId])

  useEffect(() => {
    if (!userId) { navigate('/'); return }
    refresh()
  }, [userId, refresh])

  const subs = useMemo(() => (save?.treasures ?? []).filter(t => t.type === 'sub'), [save])
  const selectedTreasure = subs.find(t => t.id === selectedTreasureId) ?? null
  const talismanCount = save?.materials.find(m => m.type === 'enhancementTalisman')?.amount ?? 0
  const luckyStoneCount = save?.materials.find(m => m.type === 'luckyStone')?.amount ?? 0
  const goldCount = save?.materials.find(m => m.type === 'gold')?.amount ?? 0
  const transferTalismanCount = save?.materials.find(m => m.type === 'transferTalisman')?.amount ?? 0

  const baseRate = selectedTreasure ? Math.round(100 - (selectedTreasure.level ?? 0) * 85 / 44) : 0
  const adjustedRate = Math.min(100, baseRate + luckyStones * 5)
  const goldCost = selectedTreasure ? 100 * ((selectedTreasure.level ?? 0) + 1) : 0
  const canUpgrade = !!selectedTreasure
    && phase === 'idle'
    && talismanCount >= 1
    && luckyStoneCount >= luckyStones
    && goldCount >= goldCost
    && (selectedTreasure.enhanceCount ?? 0) < 50
    && (selectedTreasure.level ?? 0) < 45

  const handleUpgrade = async () => {
    if (!canUpgrade || !selectedTreasure) return
    setPhase('upgrading')
    try {
      const res = await fetch(`${API}/treasure/upgrade/${userId}/${selectedTreasure.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ luckyStones }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setToast('强化失败: ' + (data.error ?? data.message ?? `${res.status}`))
        setTimeout(() => setToast(''), 3000)
        setPhase('idle')
        return
      }
      setResult({
        success: data.success,
        oldLevel: (selectedTreasure.level ?? 0),
        newLevel: data.newLevel,
      })
      setPhase('revealed')
      setTimeout(() => {
        setSelectedTreasureId(null)
        setLuckyStones(0)
        setResult(null)
        setPhase('idle')
        refresh()
      }, 1800)
    } catch (e: any) {
      setToast('网络错误: ' + (e?.message ?? ''))
      setTimeout(() => setToast(''), 3000)
      setPhase('idle')
    }
  }

  const handleTransfer = async (fromId: string, toId: string) => {
    try {
      const res = await fetch(`${API}/treasure/transfer-level/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromTreasureId: fromId, toTreasureId: toId }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setToast('转移失败: ' + (data.error ?? data.message ?? `${res.status}`))
        setTimeout(() => setToast(''), 3000)
        throw new Error(data.error)
      }
      setToast('转移成功')
      setTimeout(() => setToast(''), 2000)
      await refresh()
    } catch (e: any) {
      if (e?.message && e.message !== 'CANCEL') {
        // already toasted
      }
      throw e
    }
  }

  if (!save) return <div style={{ padding: 40, textAlign: 'center' }}>加载中...</div>

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', height: '100vh', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* 顶部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => navigate('/city')}>←返回主城</button>
          <h2 style={{ color: 'var(--text-gold)', margin: 0 }}>宝具工坊</h2>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
          强化符 {talismanCount} · 幸运石 {luckyStoneCount} · 转移符 {transferTalismanCount}
        </div>
      </div>

      {toast && (
        <div style={{ padding: '8px', background: '#c62828', color: '#fff', borderRadius: '4px', marginBottom: '12px', textAlign: 'center' }}>
          {toast}
        </div>
      )}

      {/* 主体 */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* 左: 炉区 */}
        <div style={{
          position: 'relative', background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Cauldron
            selectedTreasure={selectedTreasure}
            phase={phase === 'revealed' && result?.success ? 'revealed' : phase}
            onSlotClick={() => phase === 'idle' && selectedTreasureId && setSelectedTreasureId(null)}
          />

          {phase === 'revealed' && result && (
            <div style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              padding: '8px 16px', borderRadius: '20px',
              background: result.success ? 'rgba(76, 175, 80, 0.9)' : 'rgba(198, 40, 40, 0.9)',
              color: '#fff', fontSize: '14px', fontWeight: 'bold',
              pointerEvents: 'none', zIndex: 10,
            }}>
              {result.success
                ? `强化成功! Lv.${result.oldLevel} → Lv.${result.newLevel}`
                : `强化失败,等级维持 Lv.${result.oldLevel}`}
            </div>
          )}
        </div>

        {/* 右: 辅印列表 */}
        <div style={{
          background: 'var(--bg-medium)', border: '1px solid var(--border-wood)',
          borderRadius: '8px', padding: '12px', overflowY: 'auto',
        }}>
          <h4 style={{ color: 'var(--text-gold)', marginBottom: '8px' }}>辅印列表</h4>
          <SubTreasureList
            treasures={save.treasures}
            selectedTreasureId={selectedTreasureId}
            disabledTreasureIds={new Set(selectedTreasureId ? [selectedTreasureId] : [])}
            onPick={(id) => setSelectedTreasureId(id)}
            disabled={phase !== 'idle'}
          />
        </div>
      </div>

      {/* 底部 */}
      <div style={{
        marginTop: '16px', padding: '12px 16px', background: 'var(--bg-medium)',
        border: '1px solid var(--border-wood)', borderRadius: '8px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
      }}>
        <div style={{ flex: 1, fontSize: '13px' }}>
          {selectedTreasure ? (
            <>
              <div style={{ color: 'var(--text-gold)', fontWeight: 'bold' }}>
                {'★'.repeat(selectedTreasure.starLevel)} {selectedTreasure.name} Lv.{selectedTreasure.level ?? 0}
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                本次成功率: {adjustedRate}% (基础 {baseRate}% {luckyStones > 0 && `+ 幸运石 ${luckyStones} 颗 = +${luckyStones * 5}%`})
              </div>
              <div style={{ color: 'var(--text-muted)' }}>
                消耗: {goldCost} 金币 + 1 强化符{luckyStones > 0 && ` + ${luckyStones} 幸运石`}
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>请从右侧选择辅印</span>
          )}
        </div>

        {/* 幸运石选择 */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>幸运石:</span>
          {[0, 1, 2, 3, 4, 5, 6].map(n => (
            <button key={n}
              onClick={() => setLuckyStones(n)}
              disabled={n > luckyStoneCount || phase !== 'idle'}
              style={{
                padding: '4px 8px', fontSize: '12px',
                background: luckyStones === n ? 'var(--text-gold)' : 'var(--bg-dark)',
                color: luckyStones === n ? '#000' : 'var(--text-light)',
                opacity: n > luckyStoneCount ? 0.3 : 1,
              }}>
              {n}
            </button>
          ))}
        </div>

        <button onClick={() => setTransferOpen(true)} disabled={phase !== 'idle'}>
          + 等级转移
        </button>
        <button className="primary" onClick={handleUpgrade}
          disabled={!canUpgrade}
          style={{ padding: '10px 32px', fontSize: '15px', opacity: canUpgrade ? 1 : 0.4 }}>
          {phase === 'upgrading' ? '强化中...' : '强化'}
        </button>
      </div>

      <TransferModal
        open={transferOpen}
        treasures={save.treasures}
        transferTalismanCount={transferTalismanCount}
        onConfirm={handleTransfer}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  )
}
```

- [ ] **Step 2: build 验证**

```bash
npx turbo build --filter=@hero-legend/web
```

Expected: 所有组件类型通过,web 编译成功。

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/TreasureWorkshopPage/index.tsx
git commit -m "feat(web): TreasureWorkshopPage 主页面 (状态机 + 强化 + 转移)"
```

---

## Task 17: 全栈最终 build 验证

**Files:** (无)

- [ ] **Step 1: 完整 build**

```bash
cd D:/work/hero-legend
pnpm build
```

Expected: 所有包通过 (shared-types → game-data → game-engine → server + web)。

- [ ] **Step 2: 提交 (如无新改动可跳过)**

无新改动,无需 commit。

---

## 完成

实施完毕。最终改动:
- `packages/shared-types`: Treasure + Material 类型扩展
- `packages/game-data`: 3 新主印 + 90 辅印 + effect 字段
- `packages/game-engine`: 主印效果 + 辅印等级加成
- `apps/server`: SaveService 迁移 + TreasureModule + BattleService 掉落
- `apps/web`: TreasureWorkshopPage 完整页面

接下来手动验证 (按 spec "前端冒烟" 步骤),然后用 `superpowers:finishing-a-development-branch` 完成。
