const assert = require('node:assert/strict')
const { test } = require('node:test')
const { installLocales } = require('./install-locales.cjs')
const locales = require('./locales.json')

test('generates and verifies every offered locale using libc', () => {
  const calls = []
  installLocales((command, args, options) => {
    calls.push({ command, args, options })
    return { status: 0, stderr: '', stdout: command === 'locale' ? 'UTF-8\n' : '' }
  })
  assert.equal(calls.length, locales.length * 2)
  for (const [i, tag] of locales.entries()) {
    const source = tag.replace('-', '_')
    assert.deepEqual(calls[i * 2].args, ['-i', source, '-f', 'UTF-8', `${source}.UTF-8`])
    assert.equal(calls[i * 2 + 1].command, 'locale')
    assert.deepEqual(calls[i * 2 + 1].args, ['charmap'])
    assert.equal(calls[i * 2 + 1].options.env.LC_ALL, `${source}.UTF-8`)
  }
})

test('rejects missing locale data, libc warnings and fallback encodings', () => {
  for (const result of [
    { status: 1, stderr: 'missing locale', stdout: '' },
    { status: 0, stderr: 'cannot set locale', stdout: 'UTF-8' },
    { status: 0, stderr: '', stdout: 'ANSI_X3.4-1968' },
  ]) {
    assert.throws(() => installLocales(() => result))
  }
})
