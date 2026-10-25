import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Tailwind drops a component class of style.css that no scanned file names
// literally, so a class only ever built as `btn-${size}` never reaches the
// production CSS (until 0.1.193 that was every secondary / danger / large
// button and the stat card icon colours).
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name)
    if (e.isDirectory()) return sources(path)
    return /\.(vue|ts)$/.test(e.name) && !e.name.includes('.spec.') ? [readFileSync(path, 'utf8')] : []
  })
}

describe('style.css component classes', () => {
  it('are each written literally in a scanned source', () => {
    const css = readFileSync('src/style.css', 'utf8')
    const names = new Set([...css.matchAll(/^\s*\.([a-z][a-z0-9-]*)[\s,{:]/gm)].map((m) => m[1]))
    const code = [...sources('src'), ...sources('packages/ui/src'), readFileSync('index.html', 'utf8')].join('\n')
    const unused = [...names].filter((n) => !new RegExp(String.raw`(^|[^\w-])${n}($|[^\w-])`).test(code))
    expect(unused).toEqual([])
  })
})
