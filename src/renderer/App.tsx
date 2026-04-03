import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getGlobalConfig, setGlobalConfig } from '@buddy/config.js'
import { clearRollCache, getCompanion } from '@buddy/companion.js'
import { type BuddyAppState, type ShellAppearance } from '@buddy/types.js'
import {
  BuddyStateProvider,
  useAppState,
  useSetAppState,
} from './BuddyState'
import { PetView, shouldShowPetSideSlot } from './PetView'
import {
  getOpenclawHelpSteps,
  OPENCLAW_LOCAL_DEFAULT_URL,
} from '../openclawSetupZh'
import { HELP_BUBBLE_TEXT } from './helpBubbleText'

function isSlashRandomPet(t: string): boolean {
  return t === '/p' || t.startsWith('/p ')
}

function isSlashNight(t: string): boolean {
  return t === '/c' || t.startsWith('/c ')
}

/** 合法化外观；旧 solid-* 映射到精灵底以免 state 失效 */
function normalizeShellAppearance(
  a:
    | ShellAppearance
    | 'solid-day'
    | 'solid-night'
    | undefined,
): ShellAppearance {
  if (a === 'transparent-dark') return 'transparent-dark'
  if (a === 'sprite-backdrop-light') return 'sprite-backdrop-light'
  if (a === 'sprite-backdrop-dark') return 'sprite-backdrop-dark'
  if (a === 'solid-day') return 'sprite-backdrop-light'
  if (a === 'solid-night') return 'sprite-backdrop-dark'
  return 'transparent'
}

function nextShellAppearance(
  current: ShellAppearance | undefined,
): ShellAppearance {
  const c = normalizeShellAppearance(current)
  if (c === 'transparent') return 'transparent-dark'
  if (c === 'transparent-dark') return 'sprite-backdrop-light'
  if (c === 'sprite-backdrop-light') return 'sprite-backdrop-dark'
  return 'transparent'
}

/** `/help` 输入过程中的合法前缀（`/`, `/h`, …, `/help`） */
function isHelpCommandPrefix(v: string): boolean {
  const h = '/help'
  if (!v.startsWith('/')) return false
  const x = v.toLowerCase()
  return h.startsWith(x) && x.length <= h.length
}

/** `/weather` 与简写 `/w`（避免误匹配 `/wax` 等：仅 `/w` 或 `/w ` 打头） */
function isSlashWeather(low: string): boolean {
  return (
    low === '/weather' ||
    low.startsWith('/weather ') ||
    low === '/w' ||
    /^\/w\s/.test(low)
  )
}

/** `/weather` 输入白名单：`/w`、`/we`… 直至完整词 */
function isWeatherCommandDraft(v: string): boolean {
  if (!v.startsWith('/')) return false
  const x = v.toLowerCase()
  if (x === '/w' || /^\/w\s/.test(x)) return true
  const wx = '/weather'
  return wx.startsWith(x) && x.length <= wx.length
}

function isSlashReboot(low: string): boolean {
  return low === '/reboot' || low.startsWith('/reboot ')
}

function isSlashTestLine(low: string): boolean {
  return low === '/line' || low.startsWith('/line ')
}

/** 「在想中」时输入框仅允许键入本地便民指令的前缀或完整内容 */
function isAllowedPetShortcutDraft(v: string, testMode: boolean): boolean {
  if (v === '') return true
  if (isHelpCommandPrefix(v)) return true
  if (/^\/help(\s.*)?$/i.test(v)) return true
  if (v === '/') return true
  if (/^\/c(\s.*)?$/i.test(v)) return true
  if (isWeatherCommandDraft(v)) return true
  if (/^\/stat(\s.*)?$/i.test(v)) return true
  if (/^\/solo(\s.*)?$/i.test(v)) return true
  if (/^\/bubble(\s.*)?$/i.test(v)) return true
  if (/^\/openclaw(\s.*)?$/i.test(v)) return true
  if (!testMode) return false
  const slashed = ['/test off', '/test', '/reboot', '/line']
  for (const full of slashed) {
    if (full.startsWith(v) || v === full) return true
    if (
      v.startsWith(full) &&
      (v.length === full.length || v[full.length] === ' ')
    ) {
      return true
    }
  }
  return false
}

type OpenclawSlash =
  | { kind: 'save'; url: string; token: string }
  | { kind: 'clear' }
  | { kind: 'help' }

/** 单行若长得像「只填了网关没填 Token」则不要误当成 Token */
function looksLikeOpenclawGatewayRefOnly(s: string): boolean {
  const x = s.trim()
  if (/^https?:\/\//i.test(x)) {
    try {
      new globalThis.URL(x)
      return true
    } catch {
      return false
    }
  }
  return /^([\w.-]+|\d{1,3}(?:\.\d{1,3}){3}):\d{2,5}$/u.test(x)
}

/** 本机：/openclaw Token | 远程：/openclaw 网关 URL Token | /openclaw clear | help */
function parseOpenclawSlash(t: string): OpenclawSlash | null {
  const s = t.trim()
  if (!s.startsWith('/openclaw')) return null
  const rest = s.slice('/openclaw'.length).trim()
  if (rest === '' || rest === 'help' || rest === '?') return { kind: 'help' }
  if (rest === 'clear') return { kind: 'clear' }
  const sp = rest.search(/\s/u)
  if (sp === -1) {
    if (looksLikeOpenclawGatewayRefOnly(rest)) return { kind: 'help' }
    return { kind: 'save', url: OPENCLAW_LOCAL_DEFAULT_URL, token: rest }
  }
  let url = rest.slice(0, sp).trim()
  const token = rest.slice(sp + 1).trim()
  if (!token) return { kind: 'help' }
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`
  try {
    new globalThis.URL(url)
  } catch {
    return { kind: 'help' }
  }
  return { kind: 'save', url, token }
}

const OPENCLAW_GUIDE_STEPS = getOpenclawHelpSteps()

const SLEEP_AFTER_MS = 15_000
const MOOD_TICK_MS = 1000
/** 输入框失焦后多久隐藏桌旁聊天气泡（光标不在输入框内） */
const BUBBLE_HIDE_AFTER_INPUT_BLUR_MS = 5000

/** 刷新「未休眠」计时；若在睡觉则弄醒。用于发收消息与输入框键入。 */
function bumpDialogueActivity(s: BuddyAppState): Partial<BuddyAppState> {
  const now = Date.now()
  return {
    lastConversationActivityAt: now,
    petMood: s.petMood === 'sleep' ? undefined : s.petMood,
  }
}

/** 按沉默时长自动切换 `petMood`（仅睡眠） */
function AutoPetMood(): null {
  const setAppState = useSetAppState()
  useEffect(() => {
    const id = window.setInterval(() => {
      setAppState(s => {
        const now = Date.now()
        const lastConv = s.lastConversationActivityAt ?? now
        const lastPet = s.lastPetAttentionAt ?? 0
        const lastForSleep = Math.max(lastConv, lastPet)
        const effSilentSleep = s.chatLoading ? 0 : now - lastForSleep

        const petMood: 'sleep' | undefined =
          effSilentSleep >= SLEEP_AFTER_MS ? 'sleep' : undefined

        if (s.petMood === petMood) return s
        return { ...s, petMood }
      })
    }, MOOD_TICK_MS)
    return () => clearInterval(id)
  }, [setAppState])
  return null
}

/** 底部：对白输入；睡眠 zzz 时仅隐藏（占位不变），避免窗口缩放导致精灵位移 */
function ChatDialogPanel(): React.ReactElement {
  const setAppState = useSetAppState()
  const hasHatchedCompanion = useAppState(s => s.hasHatchedCompanion === true)
  const chatLoading = useAppState(s => s.chatLoading)
  const petMood = useAppState(s => s.petMood)
  const petSoloMode = useAppState(s => s.petSoloMode === true)
  const testMode = useAppState(s => Boolean(s.testMode))
  const openclawGuideStep = useAppState(s => s.openclawGuideStep)
  const openclawConfigured = useAppState(s => s.openclawConfigured)
  const [draft, setDraft] = useState('')
  const streamIdRef = useRef(0)
  const activeStreamSessionRef = useRef(-1)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bubbleHideAfterBlurRef = useRef(0)
  /** 睡眠 / 仅桌宠：输入区交互关闭，但面板仍占位（visibility:hidden），与睡眠一致、不缩窗 */
  const chatPanelVisible =
    (hasHatchedCompanion || testMode) &&
    !petSoloMode &&
    (petMood !== 'sleep' ||
      testMode ||
      typeof openclawGuideStep === 'number' ||
      Boolean(chatLoading))

  useEffect(() => {
    const sub = window.buddyDesktop?.subscribeChatStream
    if (!sub) return
    return sub(p => {
      if (p.streamSessionId !== activeStreamSessionRef.current) return
      if (p.kind === 'delta' && p.delta) {
        setAppState(s => ({
          ...s,
          chatBubble: (s.chatBubble ?? '') + p.delta,
        }))
      }
    })
  }, [setAppState])

  useEffect(() => {
    const api = window.buddyDesktop?.getOpenclawStatus
    if (!api) return
    void api().then(r => {
      setAppState(s => ({
        ...s,
        openclawConfigured: Boolean(r?.configured),
      }))
    })
  }, [setAppState])

  const clearBubbleHideTimer = useCallback((): void => {
    if (bubbleHideAfterBlurRef.current) {
      window.clearTimeout(bubbleHideAfterBlurRef.current)
      bubbleHideAfterBlurRef.current = 0
    }
  }, [])

  useEffect(() => () => clearBubbleHideTimer(), [clearBubbleHideTimer])

  /** OpenClaw 引导进行中：不决断「失焦隐藏」，并清除待触发定时器 */
  useEffect(() => {
    if (typeof openclawGuideStep !== 'number') return
    clearBubbleHideTimer()
    setAppState(s =>
      s.chatBubbleIdleHidden ? { ...s, chatBubbleIdleHidden: false } : s,
    )
  }, [openclawGuideStep, clearBubbleHideTimer, setAppState])

  const onChatInputFocus = useCallback((): void => {
    clearBubbleHideTimer()
    setAppState(s =>
      s.chatBubbleIdleHidden ? { ...s, chatBubbleIdleHidden: false } : s,
    )
  }, [clearBubbleHideTimer, setAppState])

  const onChatInputBlur = useCallback((): void => {
    clearBubbleHideTimer()
    bubbleHideAfterBlurRef.current = window.setTimeout(() => {
      bubbleHideAfterBlurRef.current = 0
      setAppState(s => {
        if (typeof s.openclawGuideStep === 'number') return s
        if (s.chatLoading) return s
        return { ...s, chatBubbleIdleHidden: true }
      })
    }, BUBBLE_HIDE_AFTER_INPUT_BLUR_MS)
  }, [clearBubbleHideTimer, setAppState])

  const startOpenclawGuide = useCallback(() => {
    setAppState(s => ({
      ...s,
      openclawGuideStep: 0,
      chatBubble: OPENCLAW_GUIDE_STEPS[0],
    }))
  }, [setAppState])

  const advanceOpenclawGuide = useCallback(() => {
    setAppState(s => {
      if (typeof s.openclawGuideStep !== 'number') return s
      const i = s.openclawGuideStep
      if (i >= OPENCLAW_GUIDE_STEPS.length - 1) {
        return {
          ...s,
          openclawGuideStep: undefined,
          chatBubble: undefined,
        }
      }
      return {
        ...s,
        openclawGuideStep: i + 1,
        chatBubble: OPENCLAW_GUIDE_STEPS[i + 1],
      }
    })
  }, [setAppState])

  const send = useCallback(async (): Promise<void> => {
    const t = draft.trim()
    if (!t) return

    const low = t.trim().toLowerCase()
    if (low === '/help' || low.startsWith('/help ')) {
      setDraft('')
      setAppState(s => ({
        ...s,
        chatBubble: HELP_BUBBLE_TEXT,
        chatBubbleIdleHidden: false,
        openclawGuideStep: undefined,
      }))
      return
    }

    if (isSlashRandomPet(t)) {
      setDraft('')
      setAppState(s => ({
        ...s,
        chatBubble: '随机换宠已关闭，外形由孵化固定。',
      }))
      return
    }
    if (isSlashNight(t)) {
      setDraft('')
      setAppState(s => ({
        ...s,
        shellAppearance: nextShellAppearance(s.shellAppearance),
      }))
      return
    }

    if (isSlashWeather(low)) {
      setDraft('')
      setAppState(s => ({
        ...s,
        petCloudsHidden: !(s.petCloudsHidden === true),
      }))
      return
    }

    if (low === '/stat off' || low.startsWith('/stat off ')) {
      setDraft('')
      setAppState(s => ({ ...s, statPanelOpen: false }))
      return
    }
    if (low === '/stat' || low.startsWith('/stat ')) {
      setDraft('')
      if (low === '/stat' || low === '/stat toggle') {
        setAppState(s => ({
          ...s,
          statPanelOpen: !s.statPanelOpen,
        }))
        return
      }
      if (low === '/stat on' || low.startsWith('/stat on ')) {
        setAppState(s => ({ ...s, statPanelOpen: true }))
        return
      }
      setAppState(s => ({
        ...s,
        statPanelOpen: !s.statPanelOpen,
      }))
      return
    }

    if (low === '/bubble off' || low.startsWith('/bubble off ')) {
      setDraft('')
      setAppState(s => ({
        ...s,
        chatBubble: undefined,
        chatBubbleIdleHidden: false,
        openclawGuideStep: undefined,
      }))
      return
    }
    if (low === '/solo off' || low.startsWith('/solo off ')) {
      setDraft('')
      setAppState(s => ({ ...s, petSoloMode: false }))
      return
    }
    if (low === '/solo' || low.startsWith('/solo ')) {
      setDraft('')
      const rest = low.slice('/solo'.length).trim()
      if (rest === '' || rest === 'on') {
        setAppState(s => ({ ...s, petSoloMode: true }))
        return
      }
      if (rest === 'off') {
        setAppState(s => ({ ...s, petSoloMode: false }))
        return
      }
      setAppState(s => ({ ...s, petSoloMode: !s.petSoloMode }))
      return
    }

    if (low === '/test off' || low.startsWith('/test off ')) {
      setDraft('')
      clearRollCache()
      setGlobalConfig({
        testMode: false,
        testForcedRarity: undefined,
        testRollNonce: undefined,
        testLuck: undefined,
      })
      setAppState(s => ({
        ...s,
        testMode: false,
        testShellOutline: false,
        chatBubble: '已退出测试模式。',
      }))
      return
    }
    if (low === '/test') {
      setDraft('')
      clearRollCache()
      setGlobalConfig({
        testMode: true,
        testForcedRarity: undefined,
        testRollNonce: undefined,
        testLuck: undefined,
      })
      setAppState(s => ({
        ...s,
        testMode: true,
        chatBubble:
          '测试模式：/reboot 清桌宠回开蛋；/line 切换窗口内容边界线；抽卡仅孵蛋。/test off 退出。',
      }))
      return
    }

    if (isSlashTestLine(low)) {
      if (!getGlobalConfig().testMode) {
        setDraft('')
        setAppState(s => ({
          ...s,
          chatBubble: '仅测试模式可用：先发 /test。',
        }))
        return
      }
      setDraft('')
      const rest = low.slice('/line'.length).trim()
      setAppState(s => {
        const cur = s.testShellOutline === true
        let next: boolean
        if (rest === 'on' || rest === '1') next = true
        else if (rest === 'off' || rest === '0') next = false
        else next = !cur
        return {
          ...s,
          testShellOutline: next,
          chatBubble: next
            ? '已显示内容区边界线（/line 再发一次或由 /line off 关闭）。'
            : '已隐藏边界线。',
        }
      })
      return
    }

    if (isSlashReboot(low)) {
      if (!getGlobalConfig().testMode) {
        setDraft('')
        setAppState(s => ({
          ...s,
          chatBubble: '仅测试模式可用：先发 /test。',
        }))
        return
      }
      setDraft('')
      const save = window.buddyDesktop?.saveProfile
      if (save) {
        const r = await save({ clearCompanion: true })
        if (!r.ok) {
          setAppState(s => ({
            ...s,
            chatBubble: r.error ?? '清除 profile 失败',
          }))
          return
        }
      }
      clearRollCache()
      setGlobalConfig({
        companion: undefined,
        testMode: false,
        testForcedRarity: undefined,
        testRollNonce: undefined,
        testLuck: undefined,
      })
      setAppState(s => ({
        ...s,
        hasHatchedCompanion: false,
        statPanelOpen: false,
        testMode: false,
        petSoloMode: false,
        petCloudsHidden: false,
        chatBubble: undefined,
        chatBubbleIdleHidden: false,
        openclawGuideStep: undefined,
        chatLoading: false,
        petMood: undefined,
        testShellOutline: false,
      }))
      return
    }

    if (chatLoading) return
    setDraft('')

    if (!getGlobalConfig().companion) {
      setAppState(s => ({
        ...s,
        chatBubble: '请先完成孵化（点击蛋）。',
        chatBubbleIdleHidden: false,
      }))
      return
    }

    const ocSlash = parseOpenclawSlash(t)
    if (ocSlash) {
      const saveApi = window.buddyDesktop?.saveOpenclawConfig
      if (!saveApi) {
        setAppState(s => ({
          ...s,
          chatBubble: '仅 Electron 内可保存 OpenClaw 配置。',
        }))
        return
      }
      if (ocSlash.kind === 'help') {
        const st = await window.buddyDesktop?.getOpenclawStatus?.()
        if (st?.configured) {
          setAppState(s => ({
            ...s,
            openclawConfigured: true,
            openclawGuideStep: undefined,
            chatBubble: '已连接，直接发消息即可。',
          }))
        } else {
          startOpenclawGuide()
        }
        return
      }
      if (ocSlash.kind === 'clear') {
        const r = await saveApi({ clear: true })
        setAppState(s => ({
          ...s,
          openclawConfigured: false,
          openclawGuideStep: undefined,
          chatBubble: r.ok
            ? '已清除本机保存的 OpenClaw 配置。'
            : (r.error ?? '清除失败'),
        }))
        return
      }
      const r = await saveApi({
        url: ocSlash.url,
        token: ocSlash.token,
      })
      setAppState(s => ({
        ...s,
        openclawConfigured: r.ok ? true : s.openclawConfigured,
        openclawGuideStep: r.ok ? undefined : s.openclawGuideStep,
        chatBubble: r.ok
          ? `已保存 OpenClaw：${ocSlash.url}（Token 已写入本机用户目录，勿录屏泄露）`
          : (r.error ?? '保存失败'),
      }))
      return
    }

    setAppState(s => ({
      ...s,
      ...bumpDialogueActivity(s),
      chatLoading: true,
      chatBubble: undefined,
      openclawGuideStep: undefined,
      chatBubbleIdleHidden: false,
    }))

    const buddy = getCompanion()
    const api = window.buddyDesktop?.sendChat
    if (!api) {
      setAppState(s => ({
        ...s,
        chatLoading: false,
        chatBubble: '当前环境不支持对话（请用 Electron 运行）。',
      }))
      return
    }

    const streamSessionId = ++streamIdRef.current
    activeStreamSessionRef.current = streamSessionId

    const r = await api({
      text: t,
      companionName: buddy?.name ?? 'buddy',
      personality: buddy?.personality ?? 'A friendly desk pet.',
      streamSessionId,
    })

    activeStreamSessionRef.current = -1

    setAppState(s => ({
      ...s,
      ...bumpDialogueActivity(s),
      chatLoading: false,
      ...(r.needOpenclawGuide
        ? {
            openclawGuideStep: 0,
            chatBubble: OPENCLAW_GUIDE_STEPS[0],
          }
        : {
            chatBubble: r.ok
              ? (r.text ?? s.chatBubble ?? '')
              : (r.error ?? '请求失败'),
          }),
    }))
  }, [chatLoading, draft, setAppState])

  useLayoutEffect(() => {
    if (chatPanelVisible) inputRef.current?.focus()
    else inputRef.current?.blur()
  }, [chatPanelVisible])

  const inputPlaceholder = useMemo((): string => {
    const base = 'Enter 输入 · /help'
    if (chatLoading) return `在想中 · /help`
    return base
  }, [chatLoading])

  const onDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>): void => {
      const value = e.target.value
      setAppState(s => ({ ...s, ...bumpDialogueActivity(s) }))
      if (!chatLoading) {
        setDraft(value)
        return
      }
      setDraft(prev =>
        isAllowedPetShortcutDraft(value, testMode) ? value : prev,
      )
    },
    [chatLoading, testMode, setAppState],
  )

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (typeof openclawGuideStep === 'number' && !draft.trim()) {
        advanceOpenclawGuide()
        return
      }
      void send()
    }
  }

  return (
    <div
      className={
        chatPanelVisible
          ? 'chat-dialog-panel surface-card'
          : 'chat-dialog-panel surface-card chat-dialog-panel--concealed'
      }
      role="dialog"
      aria-label="对桌宠说话"
      aria-hidden={!chatPanelVisible}
    >
      <textarea
        ref={inputRef}
        className="chat-dialog-input"
        rows={1}
        value={draft}
        placeholder={inputPlaceholder}
        aria-label="输入消息，Enter 发送；发 /help 查看操作说明"
        disabled={!chatPanelVisible}
        tabIndex={chatPanelVisible ? 0 : -1}
        onChange={onDraftChange}
        onFocus={onChatInputFocus}
        onBlur={onChatInputBlur}
        onKeyDown={onKeyDown}
      />
  </div>
  )
}

/** 气泡增高时窗口向上扩展；略大于一行即可，过大则窗顶长期一堆空白 */
const BUBBLE_STACK_RESERVE_PX = 40
/** 水平多留一点盖住尾巴；竖直少留降低顶/底空白 */
const RESIZE_MARGIN_X = 8
const RESIZE_MARGIN_Y = 4
/** 取整后仍易少 1px；主进程也会 ±1 忽略，渲染端略放大更稳 */
const FIT_EXTRA_SLACK_PX = 2
/** CSS：tail `right:-5` + 5px 三角；引擎常对 0×0 边框三角返回空 rect，必须几何补足 */
const BUBBLE_TAIL_EXTEND_RIGHT_PX = 8

/** 参与 union：锚点、精灵舞台、像素云朵层（动效会超出舞台 layout 盒）、尾巴节点 */
const SHELL_FIT_UNION_SELECTOR =
  '.pet-bubble-anchor, .pet-sprite-stage, .pet-sprite-clouds, .pet-chat-bubble-tail'

function shellClassName(appearance: ShellAppearance | undefined): string {
  const a = normalizeShellAppearance(appearance)
  if (a === 'transparent-dark' || a === 'sprite-backdrop-dark')
    return 'shell shell--transparent shell--palette-night'
  return 'shell shell--transparent'
}

function measureShellFitPx(el: HTMLElement): { w: number; h: number } {
  const r = el.getBoundingClientRect()
  let left = r.left
  let right = r.right
  let top = r.top
  let bottom = r.bottom
  const merge = (b: DOMRect): void => {
    left = Math.min(left, b.left)
    right = Math.max(right, b.right)
    top = Math.min(top, b.top)
    bottom = Math.max(bottom, b.bottom)
  }
  for (const node of el.querySelectorAll(SHELL_FIT_UNION_SELECTOR)) {
    merge(node.getBoundingClientRect())
  }
  for (const outer of el.querySelectorAll('.pet-chat-bubble-outer')) {
    if (!(outer instanceof HTMLElement)) continue
    if (!outer.querySelector('.pet-chat-bubble-tail')) continue
    const o = outer.getBoundingClientRect()
    right = Math.max(right, o.right + BUBBLE_TAIL_EXTEND_RIGHT_PX)
  }
  const w =
    Math.ceil(right - left + RESIZE_MARGIN_X * 2) + FIT_EXTRA_SLACK_PX
  const h =
    Math.ceil(
      bottom -
        top +
        BUBBLE_STACK_RESERVE_PX +
        RESIZE_MARGIN_Y * 2,
    ) + FIT_EXTRA_SLACK_PX
  return { w, h }
}

/**
 * 透明窗：主进程 setIgnoreMouseEvents + forward，衬底空白区点到后面应用/桌面。
 * solo：仅 .pet-sprite-stage 接收；非 solo：整 .shell（气泡/输入等）接收，#root 余白穿透。
 */
function PetSoloPointerBridge(): null {
  const petSoloMode = useAppState(s => s.petSoloMode === true)

  useEffect(() => {
    const send = window.buddyDesktop?.sendSoloPointerState
    if (!send) return

    let raf = 0
    let lastAccept: boolean | null = null

    const flush = (clientX: number, clientY: number): void => {
      const el = document.elementFromPoint(clientX, clientY)
      const accept = petSoloMode
        ? Boolean(el?.closest?.('.pet-sprite-stage'))
        : Boolean(el?.closest?.('.shell'))
      if (lastAccept === accept) return
      lastAccept = accept
      send(
        petSoloMode
          ? { solo: true, overPet: accept }
          : { solo: false, overShell: accept },
      )
    }

    const onPointer = (e: PointerEvent): void => {
      if (raf) return
      raf = window.requestAnimationFrame(() => {
        raf = 0
        flush(e.clientX, e.clientY)
      })
    }

    lastAccept = null
    send(petSoloMode ? { solo: true, overPet: false } : { solo: false, overShell: false })

    window.addEventListener('pointermove', onPointer, { capture: true })
    window.addEventListener('pointerdown', onPointer, { capture: true })

    return () => {
      window.removeEventListener('pointermove', onPointer, { capture: true })
      window.removeEventListener('pointerdown', onPointer, { capture: true })
      if (raf) window.cancelAnimationFrame(raf)
      send({ mode: 'disabled' })
    }
  }, [petSoloMode])

  return null
}

function Shell(): React.ReactElement {
  const setAppState = useSetAppState()
  const hasHatchedCompanion = useAppState(s => s.hasHatchedCompanion === true)
  const testShellOutlinePaint = useAppState(
    s => s.testMode === true && s.testShellOutline === true,
  )

  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    root.classList.toggle('root--test-outline', testShellOutlinePaint)
    return () => {
      root.classList.remove('root--test-outline')
    }
  }, [testShellOutlinePaint])
  const shellAppearance = useAppState(s => s.shellAppearance)
  const statPanelOpen = useAppState(s => s.statPanelOpen === true)
  const petSoloMode = useAppState(s => s.petSoloMode === true)
  const petSideSlotVisible = useAppState(shouldShowPetSideSlot)
  const chatBubbleForFit = useAppState(s => s.chatBubble)
  const chatLoadingForFit = useAppState(s => s.chatLoading)
  const shellRef = useRef<HTMLDivElement>(null)

  /** StrictMode 会重建 store，但 `setGlobalConfig` 里的 companion 不会回滚；与磁盘真值对齐，避免对话/测高与精灵脱节 */
  useLayoutEffect(() => {
    setAppState(s => {
      const hatched = Boolean(getGlobalConfig().companion)
      if (Boolean(s.hasHatchedCompanion) === hatched) return s
      return { ...s, hasHatchedCompanion: hatched }
    })
  }, [setAppState])
  const resizeRaf = useRef(0)
  /** 与流式 `chatBubble` 同帧多次更新合并为一次测量，减少 buddy-resize IPC */
  const fitFromStateRaf = useRef(0)
  const lastFitRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const applyFitRef = useRef<() => void>(() => {})
  /** `apply()` 内读取：流式阶段防抖，避免每个 delta 都 setBounds */
  const chatLoadingFitRef = useRef(false)
  const fitDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  chatLoadingFitRef.current = Boolean(chatLoadingForFit)

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return

    const CHAT_FIT_DEBOUNCE_MS = 110

    const flush = (): void => {
      const root = shellRef.current
      const api = window.buddyDesktop?.resizeToFit
      if (!root || !api) return
      const { w, h } = measureShellFitPx(root)
      const { w: lw, h: lh } = lastFitRef.current
      /** 禁用「±3px 跳过」：少涨 1～2px 时以前会一直不调 resize，气泡/尾巴必然裁切 */
      if (w === lw && h === lh) return
      lastFitRef.current = { w, h }
      void api(w, h)
    }

    const apply = (): void => {
      const loading = chatLoadingFitRef.current
      if (loading) {
        if (fitDebounceTimerRef.current !== undefined) {
          window.clearTimeout(fitDebounceTimerRef.current)
        }
        fitDebounceTimerRef.current = window.setTimeout(() => {
          fitDebounceTimerRef.current = undefined
          flush()
        }, CHAT_FIT_DEBOUNCE_MS)
        return
      }
      if (fitDebounceTimerRef.current !== undefined) {
        window.clearTimeout(fitDebounceTimerRef.current)
        fitDebounceTimerRef.current = undefined
      }
      flush()
    }

    applyFitRef.current = apply

    const ro = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeRaf.current)
      resizeRaf.current = window.requestAnimationFrame(apply)
    })
    ro.observe(el)
    apply()
    return () => {
      ro.disconnect()
      window.cancelAnimationFrame(resizeRaf.current)
      if (fitDebounceTimerRef.current !== undefined) {
        window.clearTimeout(fitDebounceTimerRef.current)
        fitDebounceTimerRef.current = undefined
      }
    }
  }, [])

  /** 气泡绝对定位不参与 shell 的 layout 宽高：同帧合并多次状态更新后再测，并 rAF 收紧一轮 */
  useLayoutEffect(() => {
    window.cancelAnimationFrame(fitFromStateRaf.current)
    fitFromStateRaf.current = window.requestAnimationFrame(() => {
      fitFromStateRaf.current = 0
      applyFitRef.current()
      window.requestAnimationFrame(() => applyFitRef.current())
    })
    return () => {
      window.cancelAnimationFrame(fitFromStateRaf.current)
      fitFromStateRaf.current = 0
    }
  }, [
    petSideSlotVisible,
    chatBubbleForFit,
    chatLoadingForFit,
    statPanelOpen,
    petSoloMode,
    shellAppearance,
    hasHatchedCompanion,
  ])

  const shellClass = [
    shellClassName(shellAppearance),
    petSoloMode ? 'shell--pet-solo-passthrough' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass} ref={shellRef}>
      <PetSoloPointerBridge />
      <AutoPetMood />
      <div className="pet-column">
        <div className="pet-row-outer">
          <div className="pet-drag">
            <PetView />
          </div>
        </div>
        <ChatDialogPanel />
      </div>
    </div>
  )
}

export default function App({
  initialHatchLocked = false,
  initialHasHatchedCompanion = false,
}: {
  initialHatchLocked?: boolean
  initialHasHatchedCompanion?: boolean
}): React.ReactElement {
  return (
    <BuddyStateProvider
      initialState={{
        hatchLocked: initialHatchLocked,
        hasHatchedCompanion: initialHasHatchedCompanion,
        lastConversationActivityAt: Date.now(),
        lastPetAttentionAt: Date.now(),
      }}
    >
      <Shell />
    </BuddyStateProvider>
  )
}
