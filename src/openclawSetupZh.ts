import raw from '../electron/openclaw-setup-zh.json'

export const OPENCLAW_DOC_URL = raw.docUrl as string
export const OPENCLAW_LOCAL_DEFAULT_URL = raw.localDefaultUrl as string

function applyPlaceholders(lines: string[]): string[] {
  const docUrl = raw.docUrl as string
  const localDefaultUrl = raw.localDefaultUrl as string
  return lines.map((line) =>
    line
      .replaceAll('{docUrl}', docUrl)
      .replaceAll('{localDefaultUrl}', localDefaultUrl),
  )
}

export function getOpenclawHelpSteps(): string[] {
  return applyPlaceholders(raw.helpSteps as string[])
}
