/**
 * Load project root `.env` into process.env (Electron main only).
 * Does not override existing environment variables.
 */
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const envPath = path.join(root, '.env')

if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, 'utf8')
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq === -1) continue
    const k = t.slice(0, eq).trim()
    let v = t.slice(eq + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    if (k && process.env[k] === undefined) process.env[k] = v
  }
}
