import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'
const source = await readFile(new URL('../src/utils/clipboard.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText
const { copyText } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'))
const sample = 'test-key-with-\nexact-newline'
let field, attached, copies, focused, restored
class Element {
  value = ''; style = {}; parent = null
  closest() { return modal }
  focus() { focused = this }
  select() { assert.equal(this.value, sample) }
  setSelectionRange(start, end) { assert.equal(start, 0); assert.equal(end, sample.length) }
  remove() { attached = false }
}
const modal = { appendChild(el) { field = el; attached = true } }
const active = new Element()
globalThis.HTMLElement = Element
function setup(clipboard, result = true) {
 copies = 0; field = null; attached = false; restored = false
 Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard } })
 globalThis.document = {
  activeElement: active, body: { appendChild() { throw Error('must remain in modal') } },
  getSelection: () => ({ rangeCount: 1, getRangeAt: () => ({ cloneRange: () => 'selection' }), removeAllRanges() {}, addRange(r) { restored = r === 'selection' } }),
  createElement: () => new Element(),
  execCommand(cmd) { assert.equal(cmd, 'copy'); assert.equal(field.value, sample); copies++; if (result instanceof Error) throw result; return result }
 }
}
setup({ writeText: async text => assert.equal(text, sample) })
assert.equal(await copyText(sample), true); assert.equal(copies, 0); assert.equal(field, null)
for (const clipboard of [undefined, { writeText: async () => { throw Error('permission denied') } }]) {
 setup(clipboard)
 assert.equal(await copyText(sample), true); assert.equal(copies, 1)
 assert.equal(attached, false); assert.equal(field.value, ''); assert.equal(focused, active); assert.equal(restored, true)
}
for (const result of [false, Error('copy blocked')]) {
 setup(undefined, result)
 assert.equal(await copyText(sample), false); assert.equal(attached, false); assert.equal(field.value, '')
}
console.log('PASS: secure clipboard, HTTP fallback, permission fallback, modal focus, exact text, failure reporting and cleanup')
