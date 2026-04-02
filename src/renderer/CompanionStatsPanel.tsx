import React from 'react'
import { getCompanion } from '@buddy/companion.js'
import {
  BUDDY_RARITY_RGB_DARK,
  BUDDY_RARITY_RGB_LIGHT,
  type ShellAppearance,
  STAT_NAMES,
} from '@buddy/types.js'

function shellIsNight(appearance: ShellAppearance | undefined): boolean {
  const a = appearance ?? 'transparent'
  return a === 'transparent-dark' || a === 'sprite-backdrop-dark'
}

/**
 * 五条属性：终端/Claude Code buddy 风格（等宽 + 稀有色标题 + 细条；不进聊天气泡）
 */
export function CompanionStatsPanel({
  shellAppearance,
  onClose,
}: {
  shellAppearance: ShellAppearance | undefined
  onClose?: () => void
}): React.ReactElement | null {
  const companion = getCompanion()
  const dark = shellIsNight(shellAppearance)

  if (!companion) {
    return (
      <div
        className="companion-stats-panel companion-stats-panel--empty"
        aria-hidden
      >
        {onClose ? (
          <button
            type="button"
            className="companion-stats-panel__close"
            onClick={onClose}
            aria-label="关闭属性面板"
          >
            ×
          </button>
        ) : null}
        <span className="companion-stats-panel__mute">暂无桌宠数据</span>
      </div>
    )
  }

  const rarityRgb = dark
    ? BUDDY_RARITY_RGB_DARK[companion.rarity]
    : BUDDY_RARITY_RGB_LIGHT[companion.rarity]

  return (
    <div
      className="companion-stats-panel"
      aria-label="桌宠属性"
    >
      {onClose ? (
        <button
          type="button"
          className="companion-stats-panel__close"
          onClick={onClose}
          aria-label="关闭属性面板"
        >
          ×
        </button>
      ) : null}
      <div
        className="companion-stats-panel__head"
        style={{ color: rarityRgb }}
      >
        <span className="companion-stats-panel__head-title">STATS</span>
        <span className="companion-stats-panel__head-rarity">
          {companion.rarity.toUpperCase()}
        </span>
      </div>
      <div className="companion-stats-panel__rows">
        {STAT_NAMES.map(name => {
          const v = companion.stats[name]
          const pct = Math.min(100, Math.max(0, v))
          return (
            <div key={name} className="companion-stats-panel__row">
              <span className="companion-stats-panel__label">{name}</span>
              <span className="companion-stats-panel__num">{v}</span>
              <div className="companion-stats-panel__track">
                <div
                  className="companion-stats-panel__fill"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: rarityRgb,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
