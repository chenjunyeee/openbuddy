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
  normalizeOpenClawGatewayBaseUrl,
}
