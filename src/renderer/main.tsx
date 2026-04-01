import React from 'react'
import ReactDOM from 'react-dom/client'
import type { BuddyGlobalConfig } from '@buddy/config.js'
import { setGlobalConfig } from '@buddy/config.js'
import App from './App'
import './index.css'

function defaultCompanionConfig(): BuddyGlobalConfig {
  return {
    userID: 'buddy-desktop',
    companion: {
      name: 'Mochi',
      personality: 'desktop',
      hatchedAt: Date.now(),
    },
    companionMuted: false,
  }
}

async function main() {
  let hatchLocked = false
  let cfg: BuddyGlobalConfig = defaultCompanionConfig()
  if (window.buddyDesktop?.getProfile) {
    try {
      const p = await window.buddyDesktop.getProfile()
      hatchLocked = p.hatchLocked
      cfg = {
        userID: p.userID,
        companion: p.companion,
        companionMuted: false,
      }
    } catch {
      /* 浏览器预览等环境 */
    }
  }
  setGlobalConfig(cfg)

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App initialHatchLocked={hatchLocked} />
    </React.StrictMode>,
  )
}

void main()
