import React from 'react'
import ReactDOM from 'react-dom/client'
import type { BuddyGlobalConfig } from '@buddy/config.js'
import { setGlobalConfig } from '@buddy/config.js'
import App from './App'
import './index.css'

function previewConfig(): BuddyGlobalConfig {
  return {
    userID: 'preview-user',
    companion: undefined,
    companionMuted: false,
  }
}

async function main() {
  let hatchLocked = false
  let hasHatchedCompanion = false
  let cfg: BuddyGlobalConfig = previewConfig()
  if (window.buddyDesktop?.getProfile) {
    try {
      const p = await window.buddyDesktop.getProfile()
      hatchLocked = p.hatchLocked
      hasHatchedCompanion = Boolean(p.companion)
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
      <App
        initialHatchLocked={hatchLocked}
        initialHasHatchedCompanion={hasHatchedCompanion}
      />
    </React.StrictMode>,
  )
}

void main()
