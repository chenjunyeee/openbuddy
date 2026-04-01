/**
 * 桌宠与 OpenClaw 对接短文案，正文见 openclaw-setup-zh.json。
 */
const fs = require('fs')
const path = require('path')

const zhPath = path.join(__dirname, 'openclaw-setup-zh.json')
const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'))

const OPENCLAW_DOC_URL = zh.docUrl
const OPENCLAW_LOCAL_DEFAULT_URL = zh.localDefaultUrl

/**
 * @param {string[]} lines
 */
function applyPlaceholders(lines) {
  const docUrl = zh.docUrl
  const localDefaultUrl = zh.localDefaultUrl
  return lines.map((line) =>
    line
      .replaceAll('{docUrl}', docUrl)
      .replaceAll('{localDefaultUrl}', localDefaultUrl),
  )
}

function getOpenclawHelpSteps() {
  return applyPlaceholders(zh.helpSteps)
}

module.exports = {
  OPENCLAW_DOC_URL,
  OPENCLAW_LOCAL_DEFAULT_URL,
  getOpenclawHelpSteps,
}
