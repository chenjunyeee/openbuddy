import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getGlobalConfig, setGlobalConfig } from '@buddy/config.js'
import {
  clearRollCache,
  companionUserId,
  roll,
} from '@buddy/companion.js'
import {
  RARITIES,
  type BuddyAppState,
  type CompanionBones,
  type Rarity,
  type ShellAppearance,
  voidling,
} from '@buddy/types.js'
import {
  BuddyStateProvider,
  useAppState,
  useSetAppState,
} from './BuddyState'
import { PetView } from './PetView'
import {
  getOpenclawHelpSteps,
  OPENCLAW_LOCAL_DEFAULT_URL,
} from '../openclawSetupZh'

function isSlashRandomPet(t: string): boolean {
  return t === '/p' || t.startsWith('/p ')
}

function isSlashNight(t: string): boolean {
  return t === '/c' || t.startsWith('/c ')
}

function nextShellAppearance(
  current: ShellAppearance | undefined,
): ShellAppearance {
  const c = current ?? 'transparent'
  if (c === 'transparent') return 'transparent-dark'
  if (c === 'transparent-dark') return 'solid-day'
  if (c === 'solid-day') return 'solid-night'
  return 'transparent'
}

function parseTestRaritySlash(t: string): Rarity | null {
  const s = t.trim().toLowerCase()
  if (!s.startsWith('/')) return null
  const token = s.split(/\s+/u)[0]!.slice(1)
  return (RARITIES as readonly string[]).includes(token) ? (token as Rarity) : null
}

const RARITY_ZH: Record<Rarity, string> = {
  common: '常见',
  uncommon: '少见',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
}

function formatTestRollBubble(bones: CompanionBones): string {
  const sp =
    bones.species === voidling
      ? `${bones.species}（隐藏种）`
      : bones.species
  const parts = [RARITY_ZH[bones.rarity], sp]
  if (bones.shiny) parts.push('异色')
  if (bones.hat !== 'none') parts.push(`帽子·${bones.hat}`)
  return `抽到了：${parts.join(' · ')}`
}

/** 「在想中」时输入框仅允许键入本地快捷指令的前缀或完整内容 */
function isAllowedPetShortcutDraft(v: string, testMode: boolean): boolean {
  if (v === '') return true
  if (v === '/') return true
  if (/^\/c(\s.*)?$/i.test(v)) return true
  if (/^\/openclaw(\s.*)?$/i.test(v)) return true
  if (!testMode) return false
  const slashed = [
    '/test off',
    '/test',
    '/roll',
    '/high',
    '/low',
    '/common',
    '/uncommon',
    '/rare',
    '/epic',
    '/legendary',
  ]
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
  const chatLoading = useAppState(s => s.chatLoading)
  const petMood = useAppState(s => s.petMood)
  const testMode = useAppState(s => Boolean(s.testMode))
  const openclawGuideStep = useAppState(s => s.openclawGuideStep)
  const openclawConfigured = useAppState(s => s.openclawConfigured)
  const [draft, setDraft] = useState('')
  const streamIdRef = useRef(0)
  const activeStreamSessionRef = useRef(-1)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /** 睡眠时收起输入；引导 / 在想中始终保留以便 /c 等 */
  const chatPanelVisible =
    petMood !== 'sleep' ||
    typeof openclawGuideStep === 'number' ||
    Boolean(chatLoading)

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

    const low = t.trim().toLowerCase()
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
        testLuck: 'normal',
        testRollNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      })
      setAppState(s => ({
        ...s,
        testMode: true,
        chatBubble:
          '测试模式：发 /roll 随机抽外形（不换存档）。/high 提高稀有、隐藏种、异色概率；/low 降低。/common～/legendary 可固定稀有度再 roll。/test off 退出。',
      }))
      return
    }

    if (low === '/roll' || low.startsWith('/roll ')) {
      if (!getGlobalConfig().testMode) {
        setDraft('')
        setAppState(s => ({
          ...s,
          chatBubble: '请先发 /test 进入测试模式，再用 /roll 体验抽取。',
        }))
        return
      }
      setDraft('')
      clearRollCache()
      setGlobalConfig({
        testForcedRarity: undefined,
        testRollNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      })
      const { bones } = roll(companionUserId())
      setAppState(s => ({
        ...s,
        chatBubble: formatTestRollBubble(bones),
      }))
      return
    }

    if (low === '/high' || low.startsWith('/high ')) {
      if (!getGlobalConfig().testMode) {
        setDraft('')
        setAppState(s => ({
          ...s,
          chatBubble: '请先发 /test，再用 /high 拉高中奖率。',
        }))
        return
      }
      setDraft('')
      setGlobalConfig({ testLuck: 'high' })
      setAppState(s => ({
        ...s,
        chatBubble:
          '欧气已调高：更高稀有、隐藏种 voidling、异色更容易出现。发 /roll 试试。',
      }))
      return
    }

    if (low === '/low' || low.startsWith('/low ')) {
      if (!getGlobalConfig().testMode) {
        setDraft('')
        setAppState(s => ({
          ...s,
          chatBubble: '请先发 /test，再用 /low 压低中奖率。',
        }))
        return
      }
      setDraft('')
      setGlobalConfig({ testLuck: 'low' })
      setAppState(s => ({
        ...s,
        chatBubble:
          '欧气已调低：稀有与隐藏、异色更难出。发 /roll 试试，/high 可恢复。',
      }))
      return
    }

    const raritySlash = parseTestRaritySlash(t)
    if (raritySlash) {
      if (!getGlobalConfig().testMode) {
        setDraft('')
        return
      }
      setDraft('')
      clearRollCache()
      setGlobalConfig({
        testForcedRarity: raritySlash,
        testRollNonce: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      })
      setAppState(s => ({
        ...s,
        chatBubble: `已按 ${raritySlash}（${RARITY_ZH[raritySlash]}）随机外形；仍可发 /roll 继续抽。`,
      }))
      return
    }

    if (chatLoading) return
    setDraft('')

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
    }))

    const soul = getGlobalConfig().companion
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
      companionName: soul?.name ?? 'Mochi',
      personality: soul?.personality ?? 'desktop',
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
    const tail = ' · /c（夜/浅色框/深色框）'
    if (chatLoading) return '在想中：仅可 /c'
    if (testMode) return `测试：/roll · /high /low · /test off${tail}`
    if (openclawConfigured) return `Enter 发送${tail}`
    if (typeof openclawGuideStep === 'number')
      return `引导中：留空 Enter 下一步${tail}`
    return `Enter 发送${tail}`
  }, [chatLoading, openclawConfigured, openclawGuideStep, testMode])

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
        aria-label="消息输入，Enter 发送"
        disabled={!chatPanelVisible}
        tabIndex={chatPanelVisible ? 0 : -1}
        onChange={onDraftChange}
        onKeyDown={onKeyDown}
      />
  </div>
  )
}

/** 气泡增高时窗口向上扩展；预留少量高度缓冲，避免边缘抖动（主进程已锚定右下角） */
const BUBBLE_STACK_RESERVE_PX = 72
const RESIZE_MARGIN = 8

const RESIZE_FIT_EPSILON_PX = 3

function shellClassName(appearance: ShellAppearance | undefined): string {
  const a = appearance ?? 'transparent'
  if (a === 'transparent') return 'shell shell--transparent'
  if (a === 'transparent-dark')
    return 'shell shell--transparent shell--palette-night'
  if (a === 'solid-day') return 'shell shell--solid shell--solid-day'
  return 'shell shell--solid shell--solid-night shell--palette-night'
}

function Shell(): React.ReactElement {
  const shellAppearance = useAppState(s => s.shellAppearance)
  const shellRef = useRef<HTMLDivElement>(null)
  const resizeRaf = useRef(0)
  const lastFitRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return

    const apply = (): void => {
      const api = window.buddyDesktop?.resizeToFit
      if (!api) return
      const r = el.getBoundingClientRect()
      // 用 round 减少与主进程 getBounds 取整方向不一致导致的宽度来回修正（表现为向右挤）
      const w = Math.round(r.width + RESIZE_MARGIN * 2)
      const h = Math.round(
        r.height + BUBBLE_STACK_RESERVE_PX + RESIZE_MARGIN * 2,
      )
      const { w: lw, h: lh } = lastFitRef.current
      if (
        Math.abs(w - lw) <= RESIZE_FIT_EPSILON_PX &&
        Math.abs(h - lh) <= RESIZE_FIT_EPSILON_PX
      ) {
        return
      }
      lastFitRef.current = { w, h }
      void api(w, h)
    }

    const ro = new ResizeObserver(() => {
      window.cancelAnimationFrame(resizeRaf.current)
      resizeRaf.current = window.requestAnimationFrame(apply)
    })
    ro.observe(el)
    apply()
    return () => {
      ro.disconnect()
      window.cancelAnimationFrame(resizeRaf.current)
    }
  }, [])

  return (
    <div className={shellClassName(shellAppearance)} ref={shellRef}>
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
}: {
  initialHatchLocked?: boolean
}): React.ReactElement {
  return (
    <BuddyStateProvider
      initialState={{
        hatchLocked: initialHatchLocked,
        lastConversationActivityAt: Date.now(),
        lastPetAttentionAt: Date.now(),
      }}
    >
      <Shell />
    </BuddyStateProvider>
  )
}
