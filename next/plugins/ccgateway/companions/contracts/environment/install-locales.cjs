const { spawnSync } = require('node:child_process')
const locales = require('./locales.json')

function installLocales(run = spawnSync) {
  function checked(command, args, options = {}) {
    const result = run(command, args, { encoding: 'utf8', ...options })
    if (result.error || result.status !== 0 || result.stderr.trim()) {
      throw new Error(`${command} failed: ${result.error || result.stderr}`)
    }
    return result.stdout.trim()
  }

  for (const tag of locales) {
    const source = tag.replace('-', '_')
    const locale = `${source}.UTF-8`
    checked('localedef', ['-i', source, '-f', 'UTF-8', locale])
    const charmap = checked('locale', ['charmap'], { env: { ...process.env, LANG: locale, LC_ALL: locale } })
    if (charmap !== 'UTF-8') throw new Error(`Locale ${locale} did not load as UTF-8: ${charmap}`)
  }
}

module.exports = { installLocales }
if (require.main === module) installLocales()
