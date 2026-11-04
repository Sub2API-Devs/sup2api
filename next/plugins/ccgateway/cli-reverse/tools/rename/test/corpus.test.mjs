// 全语料测试（original/ 的 2650 个 JS 模块）：
//   (a) 空命名表 → 逐字节相同且 α 等价；
//   (b) 全量随机改名表（每个绑定 → 原名_随机后缀）→ α 等价、0 差异；
//   (b') 冲突压力表（局部全改成 value、顶层全改成 item；或轮流改成 process/require/… 全局名）→ α 等价；
//   (d) scope.mjs 与 @babel/traverse 的绑定解析差分 0 差异；
//   (e) 可选：RENAME_BUN=1 时用 Bun 1.4.4 跑 --version / --help / -p hi，与 original 对拍。
// 运行：node --test tools/rename/test/   （约 2–3 分钟；RENAME_CORPUS=0 跳过本文件）
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyNaming } from '../apply.mjs';
import { alphaCheck } from '../alpha-check.mjs';
import { namingFromObjects } from '../lib/naming.mjs';
import { genTable } from './gen-table.mjs';
import { tmpDir } from './helpers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ORIGINAL = path.join(ROOT, 'original');
const skip = process.env.RENAME_CORPUS === '0' || !fs.existsSync(path.join(ORIGINAL, 'cli.js'));

async function run(naming, label) {
  const out = path.join(tmpDir(`rename-corpus-${label}-`), 'runnable');
  const t0 = Date.now();
  const report = await applyNaming({ original: ORIGINAL, naming, out });
  const chk = await alphaCheck({ a: ORIGINAL, b: out });
  console.log(`[${label}] apply ${report.summary.ms.total} ms, alpha ${chk.summary.ms} ms, renamed ${report.summary.renamedBindings}/${report.summary.bindings}, conflicts ${report.summary.conflicts}, exports renamed ${report.summary.exportsRenamed}, total ${Date.now() - t0} ms`);
  return { out, report, chk };
}

function cleanup(out) {
  fs.rmSync(path.dirname(out), { recursive: true, force: true });
}

test('(a) 空命名表：runnable 与 original 逐字节相同、α 等价', { skip, timeout: 600000 }, async () => {
  const { out, report, chk } = await run(namingFromObjects([]), 'empty');
  assert.equal(report.summary.edits, 0);
  assert.ok(chk.ok, JSON.stringify(chk.summary));
  assert.equal(chk.summary.byteIdenticalModules, chk.summary.jsModules);
  assert.equal(chk.summary.resourcesIdentical + chk.summary.jsModules + chk.summary.passthroughJs, chk.summary.files);
  cleanup(out);
});

test('(b) 全量随机改名：每个绑定都改名，α 校验 0 差异', { skip, timeout: 600000 }, async () => {
  const { table } = genTable(ORIGINAL, 'full', 20261103);
  const { out, report, chk } = await run(namingFromObjects([table]), 'full');
  assert.ok(chk.ok, JSON.stringify({ s: chk.summary, m: chk.moduleDiffs.slice(0, 3), c: chk.crossDiffs.slice(0, 3) }));
  assert.equal(report.summary.conflicts, 0);
  // 只剩直接 eval 链上的冻结绑定没改
  assert.equal(report.summary.renamedBindings, report.summary.bindings - report.summary.frozenBindings);
  assert.ok(report.summary.exportsRenamed > 20000);
  cleanup(out);
});

test("(b') 冲突压力：全部改成 value/item，或改成全局名 → 自动加后缀，α 等价", { skip, timeout: 900000 }, async () => {
  for (const mode of ['collide', 'globals']) {
    const { table } = genTable(ORIGINAL, mode);
    const { out, report, chk } = await run(namingFromObjects([table]), mode);
    assert.ok(chk.ok, `${mode}: ${JSON.stringify({ s: chk.summary, m: chk.moduleDiffs.slice(0, 3), c: chk.crossDiffs.slice(0, 3) })}`);
    assert.ok(report.summary.conflicts > 100000, `${mode} should produce many conflicts`);
    cleanup(out);
  }
});

test('(d) scope.mjs 与 @babel/traverse 绑定解析差分', { skip, timeout: 600000 }, async () => {
  const { babelDiff } = await import('./babel-diff.mjs');
  const { listFiles } = await import('../lib/files.mjs');
  const { readText, isJsFile } = await import('../lib/parse.mjs');
  let checked = 0;
  const bad = [];
  for (const f of listFiles(ORIGINAL).filter(isJsFile)) {
    const { text } = readText(path.join(ORIGINAL, f));
    if (text === null) continue;
    const r = babelDiff(text);
    checked += r.checked;
    if (r.diffs.length) bad.push({ f, d: r.diffs.slice(0, 2) });
  }
  console.log(`[babel-diff] identifiers checked ${checked}`);
  assert.deepEqual(bad, []);
  assert.ok(checked > 2000000);
});

test('(e) Bun 运行对拍（RENAME_BUN=1 才跑）', { skip: skip || process.env.RENAME_BUN !== '1', timeout: 900000 }, async () => {
  const { smoke } = await import('./bun-smoke.mjs');
  const { table } = genTable(ORIGINAL, 'collide');
  const out = path.join(tmpDir('rename-bun-'), 'runnable');
  await applyNaming({ original: ORIGINAL, naming: namingFromObjects([table]), out });
  const a = await smoke(ORIGINAL);
  const b = await smoke(out);
  assert.deepEqual(b, a);
  cleanup(out);
});
