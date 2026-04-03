/**
 * Desktop shell: frameless transparent always-on-top window (patterns from clawd-on-desk).
 */
require('./load-env.cjs')
const { buildSystemPrompt } = require('./buddy-prompt.cjs')
const chatSession = require('./chat-session.cjs')
const {
  streamOpenClawChatCompletion,
  sendOpenClawChatCompletion,
  normalizeOpenClawGatewayBaseUrl,
} = require('./openclaw-chat.cjs')
const electron = require('electron')
/** 禁止 `node electron/main.cjs`：必须用 Electron 二进制拉起主进程，否则 `app` 等 API 不可用 */
if (
  !electron ||
  typeof electron !== 'object' ||
  typeof electron.app?.getPath !== 'function'
) {
  console.error(
    '[buddy-desktop] 主进程不能直接用 node 运行；请用 Electron 入口：\n' +
      '  npm run dev   或   npx electron .   或   npm run start:dist\n' +
      '（直接 node 时 require("electron") 不会是完整 API，导致 app.getPath 等为 undefined）',
  )
  process.exit(1)
}
const { app, BrowserWindow, screen, Menu, ipcMain } = electron
/** 若仍有拖影可试：启动前 export BUDDY_DISABLE_GPU=1（会略损性能） */
if (process.env.BUDDY_DISABLE_GPU === '1') app.disableHardwareAcceleration()
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const buddyRoll = require('./buddy-roll.cjs')

const isMac = process.platform === 'darwin'
const isLinux = process.platform === 'linux'
const isWin = process.platform === 'win32'
const LINUX_WINDOW_TYPE = 'toolbar'
const WIN_TOPMOST_LEVEL = 'pop-up-menu'
const MAC_TOPMOST_LEVEL = 'screen-saver'

const USER_DATA = app.getPath('userData')
const PREFS_PATH = path.join(USER_DATA, 'buddy-desktop-prefs.json')
const OPENCLAW_PREFS_PATH = path.join(USER_DATA, 'buddy-openclaw.json')
const PROFILE_PATH = path.join(USER_DATA, 'buddy-profile.json')
const BOOTSTRAP_PENDING = path.join(USER_DATA, 'buddy-bootstrap-pending.json')
const BOOTSTRAP_APPLIED = path.join(USER_DATA, 'buddy-bootstrap-applied.json')

const PRINT_PATHS_ONLY = process.argv.includes('--buddy-print-paths')
/** 首帧占位（宽含多气泡列、高接近渲染端「内容 + 气泡栈预留」），减少首帧后尺寸跳动 */
const DEFAULT_W = 340
const DEFAULT_H = 520

/** @type {{ url: string, token: string } | null | undefined} undefined 未读盘，null 无配置 */
let openclawDiskCache

function readOpenclawDiskPrefs() {
  if (openclawDiskCache !== undefined) return openclawDiskCache
  try {
    const raw = JSON.parse(fs.readFileSync(OPENCLAW_PREFS_PATH, 'utf8'))
    const url = String(raw?.url ?? '').trim()
    const token = String(raw?.token ?? '').trim()
    openclawDiskCache = url && token ? { url, token } : null
  } catch {
    openclawDiskCache = null
  }
  return openclawDiskCache
}

function writeOpenclawDiskPrefs(p) {
  const url = normalizeOpenClawGatewayBaseUrl(p.url)
  const token = p.token.trim()
  fs.writeFileSync(OPENCLAW_PREFS_PATH, JSON.stringify({ url, token }))
  openclawDiskCache = { url, token }
}

function clearOpenclawDiskPrefs() {
  try {
    fs.unlinkSync(OPENCLAW_PREFS_PATH)
  } catch {}
  openclawDiskCache = null
}

function readProfileDisk() {
  try {
    const raw = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf8'))
    if (!raw || typeof raw !== 'object') return null
    return raw
  } catch {
    return null
  }
}

function writeProfileDisk(profile) {
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2))
}

function ensureProfileSkeletonOnDisk() {
  let p = readProfileDisk()
  if (!p || typeof p !== 'object') {
    p = { version: 1, userID: crypto.randomUUID(), hatchLocked: false }
    writeProfileDisk(p)
    return p
  }
  let changed = false
  if (typeof p.userID !== 'string' || !p.userID.trim()) {
    p = { ...p, version: 1, userID: crypto.randomUUID() }
    changed = true
  }
  if (p.version == null) {
    p = { ...p, version: 1 }
    changed = true
  }
  if (changed) writeProfileDisk(p)
  return p
}

/** 首次启动仅写 userId；已孵化才有 companion */
function readProfileForRenderer() {
  const raw = ensureProfileSkeletonOnDisk()
  const hatchLocked = Boolean(raw.hatchLocked)
  const userID =
    typeof raw.userID === 'string' && raw.userID.trim()
      ? String(raw.userID)
      : crypto.randomUUID()

  if (userID !== raw.userID) {
    const merged = { ...raw, userID, version: 1 }
    writeProfileDisk(merged)
  }

  const c = raw.companion
  if (
    c &&
    typeof c === 'object' &&
    typeof c.name === 'string' &&
    typeof c.personality === 'string' &&
    Number.isFinite(Number(c.hatchedAt))
  ) {
    return {
      userID,
      companion: {
        name: String(c.name).trim().toLowerCase(),
        personality: String(c.personality),
        hatchedAt: Number(c.hatchedAt),
      },
      hatchLocked,
    }
  }
  return { userID, companion: undefined, hatchLocked }
}

/**
 * 消费 buddy-bootstrap-pending.json：写 OpenClaw + buddy-profile（hatchLocked）
 */
function applyBootstrapIfPending() {
  if (!fs.existsSync(BOOTSTRAP_PENDING)) return
  let rawText
  try {
    rawText = fs.readFileSync(BOOTSTRAP_PENDING, 'utf8')
  } catch (e) {
    console.error('[buddy-bootstrap] read pending failed', e)
    return
  }
  let data
  try {
    data = JSON.parse(rawText)
  } catch (e) {
    console.error('[buddy-bootstrap] invalid JSON', e)
    return
  }
  if (data.version !== 1) {
    console.error('[buddy-bootstrap] version must be 1')
    return
  }
  const oc = data.openclaw
  const hatch = data.hatch
  if (
    !oc ||
    typeof oc.url !== 'string' ||
    typeof oc.token !== 'string'
  ) {
    console.error('[buddy-bootstrap] missing openclaw.url / openclaw.token')
    return
  }
  if (!hatch || typeof hatch.userID !== 'string') {
    console.error('[buddy-bootstrap] missing hatch.userID')
    return
  }
  const existing = readProfileDisk()
  if (existing?.hatchLocked === true) {
    const skip = path.join(
      USER_DATA,
      `buddy-bootstrap-skipped-${Date.now()}.json`,
    )
    try {
      fs.renameSync(BOOTSTRAP_PENDING, skip)
    } catch {
      try {
        fs.unlinkSync(BOOTSTRAP_PENDING)
      } catch {}
    }
    console.warn('[buddy-bootstrap] hatchLocked already; skipped →', skip)
    return
  }

  const urlIn = String(oc.url).trim()
  const token = String(oc.token).trim()
  if (!urlIn || !token) {
    console.error('[buddy-bootstrap] empty openclaw url or token')
    return
  }
  try {
    writeOpenclawDiskPrefs({ url: urlIn, token })
  } catch (e) {
    console.error('[buddy-bootstrap] openclaw write failed', e)
    return
  }

  let userID = String(hatch.userID).trim().slice(0, 128)
  if (!userID) userID = crypto.randomUUID()
  const persIn =
    typeof hatch.personality === 'string' ? hatch.personality.trim() : ''
  const soul = buddyRoll.hatchStoredSoul(userID, persIn || undefined)
  let hatchedAt = Number(hatch.hatchedAt)
  if (!Number.isFinite(hatchedAt) || hatchedAt <= 0) hatchedAt = soul.hatchedAt

  const profileClean = {
    version: 1,
    userID,
    companion: {
      name: soul.name,
      personality: soul.personality,
      hatchedAt,
    },
    hatchLocked: true,
  }
  try {
    writeProfileDisk(profileClean)
  } catch (e) {
    console.error('[buddy-bootstrap] profile write failed', e)
    return
  }

  try {
    fs.writeFileSync(
      BOOTSTRAP_APPLIED,
      JSON.stringify({ ...data, appliedAt: Date.now() }, null, 2),
    )
    fs.unlinkSync(BOOTSTRAP_PENDING)
  } catch (e) {
    console.error('[buddy-bootstrap] finalize pending failed', e)
  }
  console.log('[buddy-bootstrap] applied successfully')
}

function printBuddyPathsJson() {
  const ud = app.getPath('userData')
  console.log(
    JSON.stringify(
      {
        userData: ud,
        bootstrapPending: path.join(ud, 'buddy-bootstrap-pending.json'),
        profile: path.join(ud, 'buddy-profile.json'),
        openclaw: path.join(ud, 'buddy-openclaw.json'),
        bootstrapApplied: path.join(ud, 'buddy-bootstrap-applied.json'),
      },
      null,
      2,
    ),
  )
}

function getNearestWorkArea(cx, cy) {
  const displays = screen.getAllDisplays()
  let nearest = displays[0].workArea
  let minDist = Infinity
  for (const d of displays) {
    const wa = d.workArea
    const dx = Math.max(wa.x - cx, 0, cx - (wa.x + wa.width))
    const dy = Math.max(wa.y - cy, 0, cy - (wa.y + wa.height))
    const dist = dx * dx + dy * dy
    if (dist < minDist) {
      minDist = dist
      nearest = wa
    }
  }
  return nearest
}

function clampToScreen(x, y, w, h) {
  const nearest = getNearestWorkArea(x + w / 2, y + h / 2)
  const mLeft = Math.round(w * 0.25)
  const mRight = Math.round(w * 0.25)
  const mTop = Math.round(h * 0.6)
  const mBot = Math.round(h * 0.04)
  return {
    x: Math.max(
      nearest.x - mLeft,
      Math.min(x, nearest.x + nearest.width - w + mRight),
    ),
    y: Math.max(
      nearest.y - mTop,
      Math.min(y, nearest.y + nearest.height - h + mBot),
    ),
  }
}

/** 逻辑右下角（屏幕坐标）；连续 buddy-resize 用存值而非每次 getBounds，减轻取整回读导致的水平漂移 */
let buddyResizeAnchorR = null
let buddyResizeAnchorB = null
/** 略放宽：减小程序 resize 与 getBounds 取整差导致的锚点重置 → 减轻精灵「平移闪一下」 */
const BUDDY_RESIZE_ANCHOR_DRIFT = 22

/**
 * 缩放时固定窗口右下角（与渲染进程测量一致），避免因 clampToScreen 把顶边下移而「整块 UI 被挤到屏幕下方」。
 * 若理想高度会超出工作区顶部，则缩小 h（内容可能裁切），而不是改变底边纵向位置。
 */
function buddyResizeWithAnchoredBottomRight(win, reqW, reqH) {
  const MIN_W = 160
  const MIN_H = 96
  const MAX_W = 1200
  const MAX_H_RAW = 4096
  const PAD = 8

  let w = Math.round(
    Math.min(Math.max(Number(reqW) || 0, MIN_W), MAX_W),
  )
  let h = Math.round(
    Math.min(Math.max(Number(reqH) || 0, MIN_H), MAX_H_RAW),
  )

  const b = win.getBounds()
  const br = b.x + b.width
  const bb = b.y + b.height
  if (
    buddyResizeAnchorR == null ||
    buddyResizeAnchorB == null ||
    Math.abs(br - buddyResizeAnchorR) > BUDDY_RESIZE_ANCHOR_DRIFT ||
    Math.abs(bb - buddyResizeAnchorB) > BUDDY_RESIZE_ANCHOR_DRIFT
  ) {
    buddyResizeAnchorR = br
    buddyResizeAnchorB = bb
  }
  const anchorRight = buddyResizeAnchorR
  const anchorBottom = buddyResizeAnchorB

  const wa = getNearestWorkArea(anchorRight - 12, anchorBottom - 12)
  const workLeft = wa.x + PAD
  const workRight = wa.x + wa.width - PAD
  const workTop = wa.y + PAD
  const workBottom = wa.y + wa.height - PAD

  const effectiveBottom = Math.min(anchorBottom, workBottom)
  const effectiveRight = Math.min(anchorRight, workRight)

  // —— 竖直：底边尽量仍为 effectiveBottom；顶边不得高于 workTop（否则缩高度）
  let ny = Math.round(effectiveBottom - h)
  if (ny < workTop) {
    h = Math.max(MIN_H, Math.floor(effectiveBottom - workTop))
    ny = Math.round(effectiveBottom - h)
  }

  // —— 水平：与竖直对称，固定「可视右缘」为 effectiveRight；左沿不得小于 workLeft 则缩 w
  // 避免旧逻辑先缩 w 再 nx=workRight-w 导致右缘在 workRight 与 anchorRight 之间来回切、整块被向右挤
  let nx = Math.round(effectiveRight - w)
  if (nx < workLeft) {
    w = Math.max(MIN_W, Math.floor(effectiveRight - workLeft))
    nx = Math.round(effectiveRight - w)
  }

  suppressMovePetForResize = true
  try {
    win.setBounds({ x: nx, y: ny, width: w, height: h })
    buddyResizeAnchorR = nx + w
    buddyResizeAnchorB = ny + h
  } finally {
    setTimeout(() => {
      suppressMovePetForResize = false
    }, 200)
  }
}

function loadPrefs() {
  try {
    const raw = JSON.parse(fs.readFileSync(PREFS_PATH, 'utf8'))
    if (!raw || typeof raw !== 'object') return null
    for (const key of ['x', 'y']) {
      if (key in raw && (typeof raw[key] !== 'number' || !isFinite(raw[key])))
        delete raw[key]
    }
    return raw
  } catch {
    return null
  }
}

function saveWindowBounds(win) {
  if (!win || win.isDestroyed()) return
  const { x, y, width, height } = win.getBounds()
  try {
    fs.writeFileSync(PREFS_PATH, JSON.stringify({ x, y, width, height }))
  } catch {}
}

function getOpenClawGatewayUrl() {
  return (
    process.env.OPENCLAW_GATEWAY_URL?.trim() ||
    readOpenclawDiskPrefs()?.url ||
    ''
  )
}

function getOpenClawToken() {
  return (
    process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
    process.env.OPENCLAW_GATEWAY_PASSWORD?.trim() ||
    readOpenclawDiskPrefs()?.token ||
    ''
  )
}

/** Keep pet above normal windows (Windows DWM can drop z-order). */
function startTopmostWatchdog(win) {
  if (!isWin) return () => {}
  const id = setInterval(() => {
    if (win && !win.isDestroyed())
      win.setAlwaysOnTop(true, WIN_TOPMOST_LEVEL)
  }, 5000)
  return () => clearInterval(id)
}

function reapplyMacVisibility(win) {
  if (!isMac || !win || win.isDestroyed()) return
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, MAC_TOPMOST_LEVEL)
}

/** @type {BrowserWindow | null} */
let mainWindow = null

/** 用户拖窗 → 渲染层抚摸；程序化 `setBounds`（resize）也会触发 `move`，需忽略 */
let suppressMovePetForResize = false
let buddyWindowMovePetAllowed = false
let lastBuddyWindowMovePetSent = 0

function createWindow() {
  buddyWindowMovePetAllowed = false
  lastBuddyWindowMovePetSent = 0
  const prefs = loadPrefs()
  const wa = screen.getPrimaryDisplay().workArea
  let x = prefs?.x
  let y = prefs?.y
  const w = prefs?.width && prefs.width > 0 ? prefs.width : DEFAULT_W
  const h = prefs?.height && prefs.height > 0 ? prefs.height : DEFAULT_H
  if (typeof x !== 'number' || !isFinite(x))
    x = wa.x + wa.width - w - 20
  if (typeof y !== 'number' || !isFinite(y))
    y = wa.y + wa.height - h - 20
  const clamped = clampToScreen(x, y, w, h)

  mainWindow = new BrowserWindow({
    width: w,
    height: h,
    x: clamped.x,
    y: clamped.y,
    show: false,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: !isMac,
    fullscreenable: false,
    enableLargerThanScreen: true,
    ...(isLinux ? { type: LINUX_WINDOW_TYPE } : {}),
    ...(isMac ? { type: 'panel', roundedCorners: false } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  })

  mainWindow.setFocusable(true)

  if (isWin) mainWindow.setAlwaysOnTop(true, WIN_TOPMOST_LEVEL)

  const devUrl = process.env.VITE_DEV_SERVER_URL
  if (devUrl) {
    console.log('[buddy-desktop] Dev load URL:', devUrl.trim())
    mainWindow.webContents.on('console-message', (_e, level, message) => {
      if (level >= 1) console.log(`[renderer][${level}]`, message)
    })
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error('buddy-desktop: failed to load', url, code, desc)
    })
    mainWindow.loadURL(devUrl.trim())
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return
    if (isWin) mainWindow.setAlwaysOnTop(true, WIN_TOPMOST_LEVEL)
    if (isMac) reapplyMacVisibility(mainWindow)
    if (isLinux) mainWindow.setSkipTaskbar(true)
    mainWindow.showInactive()
    mainWindow.setIgnoreMouseEvents(false)
    setTimeout(() => {
      buddyWindowMovePetAllowed = true
    }, 500)
    console.log('[buddy-desktop] Window visible (ready-to-show)')
  })

  const stopWatch = startTopmostWatchdog(mainWindow)
  mainWindow.on('closed', () => {
    stopWatch()
    mainWindow = null
    buddyResizeAnchorR = null
    buddyResizeAnchorB = null
  })

  mainWindow.on('move', () => {
    saveWindowBounds(mainWindow)
    if (
      !buddyWindowMovePetAllowed ||
      suppressMovePetForResize ||
      !mainWindow ||
      mainWindow.isDestroyed()
    )
      return
    const now = Date.now()
    if (now - lastBuddyWindowMovePetSent < 80) return
    lastBuddyWindowMovePetSent = now
    const wc = mainWindow.webContents
    if (!wc.isDestroyed()) wc.send('buddy-window-moved')
  })
  mainWindow.on('resize', () => saveWindowBounds(mainWindow))

  mainWindow.webContents.on('context-menu', (_e, params) => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ])
    menu.popup({ window: mainWindow })
  })
}

app.whenReady().then(() => {
  if (PRINT_PATHS_ONLY) {
    printBuddyPathsJson()
    app.quit()
    return
  }

  applyBootstrapIfPending()

  ipcMain.handle('buddy-get-profile', () => readProfileForRenderer())

  ipcMain.handle('buddy-save-profile', (_e, payload) => {
    try {
      const cur = readProfileDisk() || ensureProfileSkeletonOnDisk()
      if (payload?.clearCompanion === true) {
        const merged = {
          version: 1,
          userID:
            typeof cur.userID === 'string' && cur.userID.trim()
              ? cur.userID
              : crypto.randomUUID(),
          hatchLocked: Boolean(cur.hatchLocked),
        }
        writeProfileDisk(merged)
        return { ok: true }
      }
      const c = payload?.companion
      if (
        !c ||
        typeof c !== 'object' ||
        typeof c.name !== 'string' ||
        typeof c.personality !== 'string'
      ) {
        return { ok: false, error: 'invalid companion' }
      }
      const name = String(c.name).trim().toLowerCase()
      if (!buddyRoll.isValidSpeciesId(name)) {
        return { ok: false, error: 'invalid species id' }
      }
      const merged = {
        ...cur,
        version: 1,
        userID:
          typeof cur.userID === 'string' && cur.userID.trim()
            ? cur.userID
            : crypto.randomUUID(),
        companion: {
          name,
          personality: String(c.personality).trim().slice(0, 200),
          hatchedAt: Number.isFinite(Number(c.hatchedAt))
            ? Number(c.hatchedAt)
            : Date.now(),
        },
      }
      writeProfileDisk(merged)
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: msg.slice(0, 400) }
    }
  })

  ipcMain.handle('buddy-get-paths', () => ({
    userData: app.getPath('userData'),
    bootstrapPending: BOOTSTRAP_PENDING,
    profile: PROFILE_PATH,
    openclaw: OPENCLAW_PREFS_PATH,
    bootstrapApplied: BOOTSTRAP_APPLIED,
  }))

  ipcMain.handle('buddy-resize', (event, width, height) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    const b = win.getBounds()
    const w = Math.round(Math.min(Math.max(Number(width) || 0, 160), 1200))
    const h = Math.round(Math.min(Math.max(Number(height) || 0, 96), 4096))
    if (Math.abs(b.width - w) <= 1 && Math.abs(b.height - h) <= 1) return
    buddyResizeWithAnchoredBottomRight(win, w, h)
  })

  ipcMain.on('buddy-solo-pointer', (event, payload) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return
    const p = payload && typeof payload === 'object' ? payload : {}
    if (!p.solo) {
      win.setIgnoreMouseEvents(false)
      return
    }
    win.setIgnoreMouseEvents(!p.overPet, { forward: true })
  })

  ipcMain.handle('buddy-chat', async (event, payload) => {
    try {
      const userText = String(payload?.text ?? '').trim().slice(0, 12_000)
      if (!userText)
        return { ok: false, error: '内容为空' }

      const openclawUrl = getOpenClawGatewayUrl()
      const oct = getOpenClawToken()
      if (!openclawUrl || !oct) {
        return { ok: false, needOpenclawGuide: true }
      }

      const companionName = String(
        payload?.companionName ?? 'buddy',
      ).slice(0, 64)
      const personality = String(
        payload?.personality ?? 'A friendly desk pet.',
      ).slice(0, 200)
      const system = buildSystemPrompt(companionName, personality)

      const prior = chatSession.getHistory()
      const messages = [
        { role: 'system', content: system },
        ...prior,
        { role: 'user', content: userText },
      ]

      const agentId = process.env.OPENCLAW_AGENT_ID?.trim() || 'main'
      const ocModel = process.env.OPENCLAW_MODEL?.trim() || 'openclaw/default'
      const openaiUser = `buddy-desktop:${companionName}`

      const wc = event.sender
      const streamSessionId = Number(payload?.streamSessionId) || 0
      const safeSend = (payload) => {
        if (!wc.isDestroyed())
          wc.send('buddy-chat-stream', { streamSessionId, ...payload })
      }

      const useStream = process.env.OPENCLAW_STREAM !== '0'
      let text
      if (useStream) {
        text = await streamOpenClawChatCompletion(
          {
            baseUrl: openclawUrl,
            token: oct,
            agentId,
            model: ocModel,
            openaiUser,
            messages,
          },
          {
            onDelta(delta) {
              if (delta) safeSend({ kind: 'delta', delta })
            },
          },
        )
      } else {
        text = await sendOpenClawChatCompletion({
          baseUrl: openclawUrl,
          token: oct,
          agentId,
          model: ocModel,
          openaiUser,
          messages,
        })
      }

      safeSend({ kind: 'done' })
      chatSession.recordTurn(userText, text)
      return { ok: true, text }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error('[buddy-chat]', msg)
      try {
        if (!event.sender.isDestroyed()) {
          const sid = Number(payload?.streamSessionId) || 0
          event.sender.send('buddy-chat-stream', {
            streamSessionId: sid,
            kind: 'error',
            message: msg.slice(0, 1200),
          })
        }
      } catch (_) {
        /* ignore */
      }
      return { ok: false, error: msg.slice(0, 1200) }
    }
  })

  ipcMain.handle('buddy-openclaw-status', () => {
    const url = getOpenClawGatewayUrl()
    const token = getOpenClawToken()
    return { configured: Boolean(url && token) }
  })

  ipcMain.handle('buddy-chat-reset', () => {
    chatSession.reset()
  })

  ipcMain.handle('buddy-save-openclaw', (_e, payload) => {
    try {
      if (payload?.clear) {
        clearOpenclawDiskPrefs()
        return { ok: true }
      }
      let url = String(payload?.url ?? '').trim()
      const token = String(payload?.token ?? '').trim()
      if (!url || !token) {
        return { ok: false, error: 'URL 与 Token 不能为空' }
      }
      if (!/^https?:\/\//i.test(url)) url = `http://${url}`
      new globalThis.URL(url)
      if (token.length > 8_000) {
        return { ok: false, error: 'Token 过长' }
      }
      writeOpenclawDiskPrefs({ url, token })
      return { ok: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: msg }
    }
  })

  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (!isMac) app.quit()
})
