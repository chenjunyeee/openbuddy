/**
 * 快速测 OpenClaw Gateway /v1/chat/completions（不走 Electron UI）。
 * 用法：在项目根配置 .env 后执行 npm run test:openclaw
 */
require('./load-env.cjs')
const { sendOpenClawChatCompletion } = require('./openclaw-chat.cjs')
const { buildSystemPrompt } = require('./buddy-prompt.cjs')

const baseUrl = process.env.OPENCLAW_GATEWAY_URL?.trim()
const token =
  process.env.OPENCLAW_GATEWAY_TOKEN?.trim() ||
  process.env.OPENCLAW_GATEWAY_PASSWORD?.trim()

if (!baseUrl || !token) {
  console.error(
    '请设置 OPENCLAW_GATEWAY_URL 与 OPENCLAW_GATEWAY_TOKEN（或 PASSWORD）',
  )
  process.exit(1)
}

const agentId = process.env.OPENCLAW_AGENT_ID?.trim() || 'main'
const model = process.env.OPENCLAW_MODEL?.trim() || 'openclaw/default'
const system = buildSystemPrompt('Test', 'test')

sendOpenClawChatCompletion({
  baseUrl,
  token,
  agentId,
  model,
  openaiUser: 'buddy-desktop-test',
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: '只回复一个字：好' },
  ],
})
  .then((t) => {
    console.log('OpenClaw 正常，回复片段:', t.slice(0, 200))
  })
  .catch((e) => {
    console.error('失败:', e.message)
    process.exit(1)
  })
