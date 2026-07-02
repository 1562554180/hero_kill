// 主印/辅印技能图标 — 文件名是技能中文名
// 查找优先级: skill.name 完全匹配 → skill.name 去后缀匹配
const modules = import.meta.glob('./images/skills/*.png', { eager: true, import: 'default' }) as Record<string, string>

const ICONS: Record<string, string> = {}
for (const [path, url] of Object.entries(modules)) {
  const filename = path.replace('./images/skills/', '').replace('.png', '')
  // 跳过 #xxx_rNcM 这种源文件命名
  if (!filename.startsWith('#')) {
    ICONS[filename] = url
  }
}

/** 根据技能名 (如 "傲剑"、"身强·贰") 拿图标 URL, 没匹配返回 null */
export function getSkillIcon(name?: string | null): string | null {
  if (!name) return null
  if (ICONS[name]) return ICONS[name]
  // 去后缀: "身强·贰" → "身强"
  const base = name.split(/[·•\-—]/)[0]?.trim()
  if (base && base !== name && ICONS[base]) return ICONS[base]
  return null
}
