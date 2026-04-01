/**
 * 主进程内多轮对话（与桌宠连续聊天）。
 * OpenAI/OpenClaw messages 需 user / assistant 交替；这里存已完成的轮次。
 */

const MAX_MESSAGES = 40 /** 约 20 来回 */

/** @type {Array<{ role: string, content: string }>} */
let history = []

function reset() {
  history = []
}

function trim() {
  if (history.length <= MAX_MESSAGES) return
  history = history.slice(history.length - MAX_MESSAGES)
}

/**
 * @param {string} userText
 * @param {string} assistantText
 */
function recordTurn(userText, assistantText) {
  history.push({ role: 'user', content: userText })
  history.push({ role: 'assistant', content: assistantText })
  trim()
}

/** @returns {ReadonlyArray<{ role: string, content: string }>} */
function getHistory() {
  return history
}

module.exports = {
  reset,
  recordTurn,
  getHistory,
}
