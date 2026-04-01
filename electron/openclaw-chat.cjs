/**
 * OpenClaw Gateway — OpenAI-compatible Chat Completions.
 * @see https://openclawlab.com/en/docs/gateway/openai-http-api/
 *
 * 需在 OpenClaw 配置里启用：
 *   gateway.http.endpoints.chatCompletions.enabled = true
 *
 * 环境变量（可在项目根 .env）：
 *   OPENCLAW_GATEWAY_URL=http://127.0.0.1:18789
 *   OPENCLAW_GATEWAY_TOKEN=...   （或 OPENCLAW_GATEWAY_PASSWORD）
 *   OPENCLAW_AGENT_ID=main      （可选）
 *   OPENCLAW_MODEL=openclaw/default （可选，如 openclaw:main）
 *   OPENCLAW_STREAM=0 （可选，主进程走非流式 chat/completions，用于不支持 SSE 的网关）
 */

/** 404 时附加说明（JSON / 非 JSON 响应共用） */
const HINT_404_CHAT_COMPLETIONS = [
  '常见原因：HTTP Chat Completions 默认关闭，CLI/TUI/WebSocket 仍能用时也会出现本错误。',
  '请在网关配置中启用 gateway.http.endpoints.chatCompletions.enabled = true 并重启。',
  '自检：curl -sS <网关>/v1/models -H "Authorization: Bearer <Token>"（应返回 JSON 模型列表）。',
  '若仍 404，再确认端口与网关根地址无误（勿在 /openclaw 里带 /v1）。',
].join('')

/**
 * 网关「根」地址，勿含 /v1 或 /v1/chat/completions（否则会重复拼接路径导致 404）。
 * @param {string} baseUrl
 * @returns {string}
 */
function normalizeOpenClawGatewayBaseUrl(baseUrl) {
  let root = String(baseUrl ?? '')
    .trim()
    .replace(/\/+$/u, '')
  root = root.replace(/\/v1\/chat\/completions$/iu, '')
  root = root.replace(/\/v1$/iu, '')
  return root.replace(/\/+$/u, '')
}

function extractAssistantText(message) {
  if (!message || typeof message !== 'object') return ''
  const c = /** @type {{ content?: unknown }} */ (message).content
  if (typeof c === 'string') return c.trim()
  if (Array.isArray(c)) {
    const parts = c
      .filter((p) => p && (p.type === 'text' || 'text' in p))
      .map((p) => (typeof p.text === 'string' ? p.text : ''))
    return parts.join('').trim()
  }
  return ''
}

/** OpenAI 流式 choices[0].delta 中的文本增量 */
function extractDeltaText(delta) {
  if (!delta || typeof delta !== 'object') return ''
  const c = /** @type {{ content?: unknown }} */ (delta).content
  if (c === null || c === undefined) return ''
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c
      .map((p) => {
        if (typeof p === 'string') return p
        if (p && typeof p === 'object' && 'text' in p) {
          const t = /** @type {{ text?: unknown }} */ (p).text
          return typeof t === 'string' ? t : ''
        }
        return ''
      })
      .join('')
  }
  return ''
}

/** 从单条 SSE JSON 里尽量取出 assistant 文本增量（兼容 OpenAI / 部分网关变体） */
function extractSseAssistantPiece(j) {
  const ch0 = j?.choices?.[0]
  if (!ch0 || typeof ch0 !== 'object') return ''
  const fromDelta =
    extractDeltaText(
      /** @type {{ delta?: unknown }} */ (ch0).delta,
    ) ||
    (typeof /** @type {{ text?: unknown }} */ (ch0).text === 'string'
      ? /** @type {{ text: string }} */ (ch0).text
      : '')
  if (fromDelta) return fromDelta
  /** 少数实现在流末尾用 message 带全文 */
  return extractAssistantText(
    /** @type {{ message?: unknown }} */ (ch0).message,
  )
}

/** @param {string} line 一行 SSE（可仍含行尾 \r） @returns {string} 文本增量，无则 '' */
function trySseLineToPiece(line) {
  const t = line.replace(/\r$/u, '').trimEnd()
  if (!t.startsWith('data:')) return ''
  const data = t.slice(5).trimStart()
  if (data === '' || data === '[DONE]') return ''
  try {
    const j = JSON.parse(data)
    return extractSseAssistantPiece(j)
  } catch {
    return ''
  }
}

function yieldToEventLoop() {
  return new Promise((r) => setImmediate(r))
}

/**
 * 流式 Chat Completions（SSE）。网关需支持 stream: true。
 * @param {object} opts 与 sendOpenClawChatCompletion 相同
 * @param {{ onDelta: (delta: string) => void | Promise<void> }} streamOpts
 *        每来一块文本会 await onDelta，便于主进程让出事件循环、渲染进程逐帧刷新。
 * @returns {Promise<string>} 完整 assistant 文本
 */
async function streamOpenClawChatCompletion(opts, streamOpts) {
  const {
    baseUrl,
    token,
    agentId = 'main',
    model = 'openclaw/default',
    openaiUser,
    messages,
  } = opts
  const { onDelta } = streamOpts

  const root = normalizeOpenClawGatewayBaseUrl(baseUrl)
  const url = `${root}/v1/chat/completions`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'text/event-stream',
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-openclaw-agent-id': agentId,
    },
    body: JSON.stringify({
      model,
      user: openaiUser,
      messages,
      stream: true,
    }),
  })

  const ct = (res.headers.get('content-type') || '').toLowerCase()

  if (!res.ok) {
    const raw = await res.text()
    let j
    try {
      j = JSON.parse(raw)
    } catch {
      const tail404 = res.status === 404 ? ` ${HINT_404_CHAT_COMPLETIONS}` : ''
      throw new Error(
        `[OpenClaw HTTP ${res.status}] 响应非 JSON：${raw.slice(0, 240)}${tail404}`,
      )
    }
    const errPart = j?.error
    const detail =
      (typeof errPart === 'object' && errPart?.message) ||
      (typeof errPart === 'string' ? errPart : null) ||
      JSON.stringify(j).slice(0, 320)
    const tail404 = res.status === 404 ? ` ${HINT_404_CHAT_COMPLETIONS}` : ''
    throw new Error(`[OpenClaw HTTP ${res.status}] ${detail}${tail404}`)
  }

  /** 网关忽略 stream 时可能直接返回整段 JSON */
  if (ct.includes('application/json')) {
    const raw = await res.text()
    let j
    try {
      j = JSON.parse(raw)
    } catch {
      throw new Error(
        `[OpenClaw] 流式请求返回 JSON 但解析失败：${raw.slice(0, 240)}`,
      )
    }
    const text = extractAssistantText(j.choices?.[0]?.message)
    if (!text) {
      throw new Error(
        `OpenClaw 未返回 assistant 文本：${JSON.stringify(j.choices?.[0]).slice(0, 200)}`,
      )
    }
    await onDelta(text)
    return text
  }

  if (!res.body) {
    throw new Error('OpenClaw 流式响应无 body')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let carry = ''
  let full = ''

  const emit = async (piece) => {
    if (!piece) return
    full += piece
    await onDelta(piece)
    await yieldToEventLoop()
  }

  while (true) {
    const { done, value } = await reader.read()
    carry += decoder.decode(value ?? new Uint8Array(), { stream: !done })

    let nl
    while ((nl = carry.indexOf('\n')) >= 0) {
      const rawLine = carry.slice(0, nl)
      carry = carry.slice(nl + 1)
      const piece = trySseLineToPiece(rawLine)
      if (piece) await emit(piece)
    }

    if (done) break
  }

  const tail = carry.replace(/\r$/u, '')
  if (tail.trim()) {
    const piece = trySseLineToPiece(tail)
    if (piece) await emit(piece)
  }

  if (!full.trim()) {
    throw new Error(
      'OpenClaw 流式结束但未收到任何 assistant 文本（请确认网关支持 stream）',
    )
  }
  return full
}

/**
 * @param {object} opts
 * @param {string} opts.baseUrl
 * @param {string} opts.token
 * @param {string} [opts.agentId]
 * @param {string} [opts.model]
 * @param {string} opts.openaiUser
 * @param {Array<{ role: string, content: string }>} opts.messages
 * @returns {Promise<string>}
 */
async function sendOpenClawChatCompletion(opts) {
  const {
    baseUrl,
    token,
    agentId = 'main',
    model = 'openclaw/default',
    openaiUser,
    messages,
  } = opts

  const root = normalizeOpenClawGatewayBaseUrl(baseUrl)
  const url = `${root}/v1/chat/completions`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-openclaw-agent-id': agentId,
    },
    body: JSON.stringify({
      model,
      user: openaiUser,
      messages,
      stream: false,
    }),
  })

  const raw = await res.text()
  let j
  try {
    j = JSON.parse(raw)
  } catch {
    const tail404 = res.status === 404 ? ` ${HINT_404_CHAT_COMPLETIONS}` : ''
    throw new Error(
      `[OpenClaw HTTP ${res.status}] 响应非 JSON：${raw.slice(0, 240)}${tail404}`,
    )
  }

  if (!res.ok) {
    const errPart = j?.error
    const detail =
      (typeof errPart === 'object' && errPart?.message) ||
      (typeof errPart === 'string' ? errPart : null) ||
      JSON.stringify(j).slice(0, 320)
    const tail404 = res.status === 404 ? ` ${HINT_404_CHAT_COMPLETIONS}` : ''
    throw new Error(`[OpenClaw HTTP ${res.status}] ${detail}${tail404}`)
  }

  const text = extractAssistantText(j.choices?.[0]?.message)
  if (!text) {
    throw new Error(
      `OpenClaw 未返回 assistant 文本：${JSON.stringify(j.choices?.[0]).slice(0, 200)}`,
    )
  }
  return text
}

module.exports = {
  sendOpenClawChatCompletion,
  streamOpenClawChatCompletion,
  normalizeOpenClawGatewayBaseUrl,
}
