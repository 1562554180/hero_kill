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
  }, [userId, navigate, refresh])

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
