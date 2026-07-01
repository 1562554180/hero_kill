import { createPortal } from 'react-dom'
import { useAnimationStore } from '../stores/animationStore'

export function DirectionalLineOverlay() {
  return createPortal(
    <div data-directional-overlay style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1500 }}>
      <DirectionalLineLayer />
    </div>,
    document.body,
  )
}

function DirectionalLineLayer() {
  const lines = useAnimationStore(s => s.directionalLines)
  if (lines.length === 0) return null
  return (
    <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <defs>
        <marker
          id="directional-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#ff5252" />
        </marker>
      </defs>
      {lines.map(l => (
        <g key={l.id}>
          <line
            className="directional-line"
            x1={l.fromX}
            y1={l.fromY}
            x2={l.toX}
            y2={l.toY}
            stroke="#ff5252"
            strokeWidth={2.5}
            opacity={0.85}
            markerEnd="url(#directional-arrow)"
          />
          <circle className="directional-target" cx={l.toX} cy={l.toY} r={4} />
        </g>
      ))}
    </svg>
  )
}