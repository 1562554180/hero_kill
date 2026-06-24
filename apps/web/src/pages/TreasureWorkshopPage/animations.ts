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
