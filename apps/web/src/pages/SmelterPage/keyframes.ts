/**
 * SmelterPage 用到的所有 CSS keyframes, 通过 useSmelterKeyframes() 注入 document.head
 * 一次性注入, 后续 render 复用.
 */
export const SMELTER_KEYFRAMES = `
@keyframes slot-pulse {
  0%, 100% { box-shadow: 0 0 8px 2px var(--slot-color, rgba(255, 213, 79, 0.3)); }
  50%      { box-shadow: 0 0 16px 4px var(--slot-color, rgba(255, 213, 79, 0.7)); }
}
@keyframes flicker {
  0%, 100% { opacity: 0.7; transform: scaleY(1) translateX(-50%); }
  50%      { opacity: 0.95; transform: scaleY(1.08) translateX(-50%); }
}
@keyframes cauldron-shake {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-2deg); }
  75%      { transform: rotate(2deg); }
}
@keyframes slot-fly-out {
  0%   { transform: scale(1);    opacity: 1; }
  100% { transform: scale(0.3);  opacity: 0; }
}
@keyframes result-rise {
  0%   { transform: translateY(40px) scale(0.6); opacity: 0; }
  100% { transform: translateY(0)    scale(1);   opacity: 1; }
}
@keyframes ring-pulse {
  0%   { transform: scale(0.8); opacity: 0; }
  40%  { opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}
`

let injected = false

/** 注入 SMELTER_KEYFRAMES 到 document.head, 只注入一次 */
export function useSmelterKeyframes(): void {
  if (typeof document === 'undefined') return
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.setAttribute('data-smelter', 'true')
  style.textContent = SMELTER_KEYFRAMES
  document.head.appendChild(style)
}