// 跨模块：applyNaming 在临时树上生成 runnable，再用 alphaCheck 校验；并对生成物做破坏，确认被拒绝。
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { applyNaming } from '../apply.mjs';
import { alphaCheck } from '../alpha-check.mjs';
import { namingFromObjects } from '../lib/naming.mjs';
import { tmpDir, writeTree, readTree } from './helpers.mjs';

const ORIGINAL = {
  'cli.js': '// @bun @bytecode\n// (c) header\nimport"./chunk-a.js";import{Xa as r,Yb}from"./chunk-a.js";import{Zc}from"./chunk-b.js";console.log(r(1),Yb,Zc);let m=await import("./chunk-d.js");m.Dd();\n',
  'chunk-a.js': '// @bun @bytecode\nfunction Xa(e){return e+1}var Yb=2,q=3;export{Xa,Yb,q as Qq};\n',
  'chunk-b.js': '// @bun @bytecode\nimport{Xa}from"./chunk-a.js";import*as ns from"./chunk-c.js";var Zc=Xa(ns.Cc);export{Zc};\n',
  'chunk-c.js': '// @bun @bytecode\nvar k=5;export{k as Cc};\n',
  'chunk-d.js': '// @bun @bytecode\nfunction w(){return 1}export{w as Dd};\n',
  'asset-1.txt': 'resource bytes \u0000\u0001',
  'sub/dir/worker.js': '// @bun\nlet z=1;export{z};\n',
};

const NAMING = {
  'chunk-a.js': { top: { Xa: { name: 'increment', source: 'semantic' }, Yb: 'two', q: 'three' }, exports: { Qq: 'THREE' } },
  'chunk-b.js': { top: { Zc: 'computed' } },
  'chunk-c.js': { top: { k: 'five' }, exports: { Cc: 'FIVE' } },
  'chunk-d.js': { top: { w: 'one' }, exports: { Dd: 'ONE' } },
  'sub/dir/worker.js': { top: { z: 'zed' } },
};

async function build(naming) {
  const orig = writeTree(tmpDir(), ORIGINAL);
  const out = path.join(tmpDir(), 'runnable');
  const report = await applyNaming({ original: orig, naming: namingFromObjects([naming]), out, jobs: 2 });
  return { orig, out, report };
}

test('跨模块改名：导出方改名，导入方 specifier 与本地别名同步；动态 / 命名空间导入的模块导出名冻结', async () => {
  const { orig, out, report } = await build(NAMING);
  const t = readTree(out, Object.keys(ORIGINAL));
  assert.equal(t['chunk-a.js'], '// @bun @bytecode\nfunction increment(e){return e+1}var two=2,three=3;export{increment,two,three as THREE};\n');
  // 导入方：import{Xa as r} → 导出名变 increment，本地别名默认跟随导出方新本地名
  assert.equal(t['cli.js'], '// @bun @bytecode\n// (c) header\nimport"./chunk-a.js";import{increment,two}from"./chunk-a.js";import{computed}from"./chunk-b.js";console.log(increment(1),two,computed);let m=await import("./chunk-d.js");m.Dd();\n');
  assert.match(t['chunk-b.js'], /import\{increment\}from"\.\/chunk-a\.js";import\*as ns from"\.\/chunk-c\.js";var computed=increment\(ns\.Cc\);export\{computed\}/);
  // chunk-c 被 import * as 引用、chunk-d 被 import() 引用：导出名不变，只改本地名
  assert.equal(t['chunk-c.js'], '// @bun @bytecode\nvar five=5;export{five as Cc};\n');
  assert.equal(t['chunk-d.js'], '// @bun @bytecode\nfunction one(){return 1}export{one as Dd};\n');
  assert.equal(t['sub/dir/worker.js'], '// @bun\nlet zed=1;export{zed as z};\n');
  assert.equal(fs.readFileSync(path.join(out, 'asset-1.txt'), 'latin1'), fs.readFileSync(path.join(orig, 'asset-1.txt'), 'latin1'));
  assert.deepEqual(report.exportPlan.rejected.map((r) => r.export).sort(), ['Cc', 'Dd']);
  assert.match(report.exportPlan.frozenExports['sub/dir/worker.js'], /not statically imported/);
  const chk = await alphaCheck({ a: orig, b: out, jobs: 2 });
  assert.ok(chk.ok, JSON.stringify(chk, null, 1));
  assert.equal(chk.summary.exportsRenamed, 4); // Xa、Yb、Qq、Zc
});

test('跨模块负例：导出方改了名但导入方没同步 → alphaCheck 拒绝', async () => {
  const { orig, out } = await build(NAMING);
  fs.copyFileSync(path.join(orig, 'chunk-b.js'), path.join(out, 'chunk-b.js')); // 导入方回退到旧版
  const chk = await alphaCheck({ a: orig, b: out, jobs: 2 });
  assert.equal(chk.ok, false);
  assert.ok(chk.crossDiffs.some((d) => d.kind === 'import-sync' && d.file === 'chunk-b.js'), JSON.stringify(chk.crossDiffs));
});

test('负例：资源字节被改、文件缺失 → alphaCheck 拒绝', async () => {
  const { orig, out } = await build({});
  fs.writeFileSync(path.join(out, 'asset-1.txt'), 'changed');
  fs.rmSync(path.join(out, 'chunk-d.js'));
  const chk = await alphaCheck({ a: orig, b: out, jobs: 2 });
  assert.equal(chk.ok, false);
  assert.deepEqual(chk.fileDiffs.map((d) => d.kind).sort(), ['missing-in-b', 'resource-bytes-differ']);
});

test('空命名表 → 逐字节相同', async () => {
  const { orig, out } = await build({});
  for (const f of Object.keys(ORIGINAL)) assert.ok(fs.readFileSync(path.join(orig, f)).equals(fs.readFileSync(path.join(out, f))), f);
  const chk = await alphaCheck({ a: orig, b: out, jobs: 2 });
  assert.ok(chk.ok);
  assert.equal(chk.summary.byteIdenticalModules, chk.summary.jsModules);
});

test('导出名冲突：两个导出想改成同一个名字 → 第二个加后缀；导入方跟随', async () => {
  const { orig, out, report } = await build({ 'chunk-a.js': { exports: { Xa: 'same', Yb: 'same' } } });
  const t = readTree(out, ['chunk-a.js', 'cli.js']);
  assert.match(t['chunk-a.js'], /export\{Xa as same,Yb as same_2,q as Qq\}/);
  assert.match(t['cli.js'], /import\{same,same_2\}from"\.\/chunk-a\.js";import\{Zc\}from"\.\/chunk-b\.js";console\.log\(same\(1\),same_2,Zc\)/);
  assert.equal(report.exportPlan.conflicts.length, 1);
  const chk = await alphaCheck({ a: orig, b: out, jobs: 2 });
  assert.ok(chk.ok, JSON.stringify(chk.crossDiffs));
});
