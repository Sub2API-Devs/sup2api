#!/usr/bin/env node
// α 等价校验：两棵树（通常是 original 与 runnable）逐模块比较，除绑定名外 AST 完全一致，
// 绑定对应关系是一致的双射，导入导出跨模块同步。
//
// 用法：
//   node tools/rename/alpha-check.mjs <a-dir> <b-dir> [--report out.json] [--jobs n]
//   退出码：0 = 等价；1 = 有差异（详见报告 / stderr）；2 = 运行错误
//   例：node tools/rename/alpha-check.mjs original runnable --report artifacts/alpha-report.json
//
// 检查项：
//   - 文件集合一致；非 JS 文件与不能解析的 .js 必须逐字节相同；
//   - 每个 JS 模块：lib/alpha.mjs compareModule（AST 同步遍历、绑定双射、全局名不变、注释不变、直接 eval 可见名不变）；
//   - 跨模块：导出名映射在模块内是双射；每个导入方 import {x} 的 x 与导出方的新导出名一致；外部模块导入名不变；
//     被 import() 动态加载的模块导出名不变。
// 库接口：import { alphaCheck } from './alpha-check.mjs'
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isJsFile } from './lib/parse.mjs';
import { crossCheck } from './lib/alpha.mjs';
import { runPool, defaultJobs } from './lib/pool.mjs';
import { listFiles } from './lib/files.mjs';

export async function alphaCheck({ a, b, jobs = defaultJobs() }) {
  const t0 = Date.now();
  const fa = listFiles(a);
  const fb = listFiles(b);
  const setB = new Set(fb);
  const setA = new Set(fa);
  const fileDiffs = [];
  for (const f of fa) if (!setB.has(f)) fileDiffs.push({ file: f, kind: 'missing-in-b' });
  for (const f of fb) if (!setA.has(f)) fileDiffs.push({ file: f, kind: 'extra-in-b' });
  let resourcesSame = 0;
  for (const f of fa) {
    if (isJsFile(f) || !setB.has(f)) continue;
    if (fs.readFileSync(path.join(a, f)).equals(fs.readFileSync(path.join(b, f)))) resourcesSame++;
    else fileDiffs.push({ file: f, kind: 'resource-bytes-differ' });
  }
  const js = fa.filter((f) => isJsFile(f) && setB.has(f));
  const results = await runPool(js.map((f) => ({ op: 'compare', args: { dirA: a, dirB: b, file: f }, weight: fs.statSync(path.join(a, f)).size })), { size: jobs });
  const cross = crossCheck(results.filter((r) => !r.passthrough));
  const bad = results.filter((r) => !r.ok);
  const parsed = results.filter((r) => !r.passthrough);
  const summary = {
    ok: fileDiffs.length === 0 && bad.length === 0 && cross.length === 0,
    files: fa.length,
    jsModules: parsed.length,
    passthroughJs: results.length - parsed.length,
    resourcesIdentical: resourcesSame,
    byteIdenticalModules: parsed.filter((r) => r.identical).length,
    bindings: parsed.reduce((s, r) => s + (r.stats?.bindings ?? 0), 0),
    renamedBindings: parsed.reduce((s, r) => s + (r.stats?.renamedBindings ?? 0), 0),
    identifiers: parsed.reduce((s, r) => s + (r.stats?.idents ?? 0), 0),
    exportsRenamed: parsed.reduce((s, r) => s + (r.stats?.exportsRenamed ?? 0), 0),
    importSpecifiers: parsed.reduce((s, r) => s + (r.importPairs?.length ?? 0), 0),
    moduleDiffs: bad.length,
    crossModuleDiffs: cross.length,
    fileDiffs: fileDiffs.length,
    ms: Date.now() - t0,
  };
  return {
    ok: summary.ok,
    summary,
    fileDiffs,
    crossDiffs: cross,
    moduleDiffs: bad.map((r) => ({ file: r.file, diffs: r.diffs })),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const argv = process.argv.slice(2);
    const pos = [];
    let report = null;
    let jobs = defaultJobs();
    for (let i = 0; i < argv.length; i++) {
      if (argv[i] === '--report') report = argv[++i];
      else if (argv[i] === '--jobs') jobs = Number(argv[++i]);
      else if (argv[i].startsWith('--')) throw new Error(`unknown option ${argv[i]}`);
      else pos.push(argv[i]);
    }
    if (pos.length !== 2) throw new Error('usage: node tools/rename/alpha-check.mjs <a-dir> <b-dir> [--report out.json] [--jobs n]');
    const r = await alphaCheck({ a: pos[0], b: pos[1], jobs });
    if (report) {
      fs.mkdirSync(path.dirname(path.resolve(report)), { recursive: true });
      fs.writeFileSync(report, JSON.stringify(r, null, 1));
    }
    console.log(JSON.stringify(r.summary, null, 1));
    if (!r.ok) {
      for (const d of r.fileDiffs.slice(0, 10)) console.error('file:', JSON.stringify(d));
      for (const m of r.moduleDiffs.slice(0, 10)) console.error('module:', m.file, JSON.stringify(m.diffs.slice(0, 3)));
      for (const d of r.crossDiffs.slice(0, 10)) console.error('cross:', JSON.stringify(d));
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(e.stack || String(e));
    process.exitCode = 2;
  }
}
