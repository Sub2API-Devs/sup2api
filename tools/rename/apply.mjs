#!/usr/bin/env node
// 应用命名表：original/ + naming/*.json → runnable/（文件布局与 original 完全一致）。
//
// 用法：
//   node tools/rename/apply.mjs <original> <naming-dir> <out-dir> [选项]
//     --report <file>          写详细报告 JSON（冲突、被拒、警告、跨模块导出改名）；默认不写
//     --force                  out-dir 已存在且非空时先清空（拒绝清空 original 自身或其祖先目录）
//     --auto-import-names      没有命名条目的别名导入用导入名作本地名（`import {extname as Qo}` → 本地名 extname）；默认关
//     --list-renamed           报告里列出每个改名（很大）
//     --check                  生成后立即跑 alpha-check（original ↔ out-dir）
//     --jobs <n>               worker 数，默认 CPU 数 - 1（上限 12）
//   例：node tools/rename/apply.mjs original naming runnable --force --report artifacts/rename-report.json --check
//
// 输入：<original> 下所有文件；<naming-dir> 下所有 *.json / *.jsonl（递归，跳过 _ 开头的文件），格式见 naming/README.md。
// 输出：<out-dir> 下同名文件。JS 模块只替换改名标识符所在的字符区间（其余逐字节不变，文件头注释保留）；
//       不能解析的 .js（zstd 压缩的资源脚本等）和非 JS 资源原样复制。
// 库接口：import { applyNaming } from './apply.mjs'；单模块接口见 lib/rename.mjs。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isJsFile } from './lib/parse.mjs';
import { loadNaming, moduleEntryToJSON } from './lib/naming.mjs';
import { buildGlobalPlan } from './lib/global.mjs';
import { runPool, defaultJobs } from './lib/pool.mjs';
import { listFiles } from './lib/files.mjs';

export { listFiles };

function prepareOut(original, out, force) {
  const absO = path.resolve(original);
  const absOut = path.resolve(out);
  if (absO === absOut || absO.startsWith(absOut + path.sep)) throw new Error(`refusing to write into ${out}: it is (or contains) the original tree`);
  if (fs.existsSync(absOut) && fs.readdirSync(absOut).length) {
    if (!force) throw new Error(`${out} is not empty (use --force to clear it)`);
    fs.rmSync(absOut, { recursive: true, force: true });
  }
  fs.mkdirSync(absOut, { recursive: true });
}

// naming 可以是目录路径，也可以是 loadNaming 的结果（测试用）。
export async function applyNaming({ original, naming, out, force = false, autoImportNames = false, listRenamed = false, jobs = defaultJobs(), log = () => {} }) {
  const t0 = Date.now();
  const nm = typeof naming === 'string' || naming == null ? loadNaming(naming) : naming;
  prepareOut(original, out, force);
  const files = listFiles(original);
  const js = files.filter(isJsFile);
  const weight = (f) => fs.statSync(path.join(original, f)).size;

  const factsRes = await runPool(js.map((f) => ({ op: 'facts', args: { root: original, file: f }, weight: weight(f) })), { size: jobs });
  const t1 = Date.now();
  const parsed = factsRes.filter((r) => !r.passthrough);
  const passthrough = factsRes.filter((r) => r.passthrough).map((r) => ({ file: r.file, reason: r.passthrough }));
  const known = new Set(parsed.map((r) => r.file));
  const unknownNamingFiles = [...nm.modules.keys()].filter((f) => !known.has(f));
  const plan = buildGlobalPlan(parsed.map((r) => r.facts), nm.modules, { autoImportNames });
  log(`facts: ${parsed.length} modules, ${passthrough.length} passthrough, ${Date.now() - t0} ms`);

  const renameRes = await runPool(
    js.map((f) => ({ op: 'rename', args: { root: original, out, file: f, entry: moduleEntryToJSON(nm.modules.get(f)) }, weight: weight(f) })),
    { size: jobs, workerData: { plan, opts: { autoImportNames, listRenamed } } },
  );
  const t2 = Date.now();
  let copied = 0;
  for (const f of files) {
    if (isJsFile(f)) continue;
    const dst = path.join(out, f);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(path.join(original, f), dst);
    copied++;
  }
  const modules = renameRes.filter((r) => !r.passthrough);
  const sum = (k) => modules.reduce((a, r) => a + r.stats[k], 0);
  const report = {
    original,
    out,
    namingFiles: nm.files,
    summary: {
      files: files.length,
      jsModules: modules.length,
      passthroughJs: passthrough.length,
      resourcesCopied: copied,
      bindings: sum('bindings'),
      renamedBindings: sum('renamed'),
      frozenBindings: sum('frozen'),
      edits: sum('edits'),
      conflicts: modules.reduce((a, r) => a + r.conflicts.length, 0),
      rejected: modules.reduce((a, r) => a + r.rejected.length, 0) + plan.rejected.length,
      warnings: modules.reduce((a, r) => a + r.warnings.length, 0) + unknownNamingFiles.length + (nm.warnings?.length ?? 0),
      namingClashes: nm.clashes.length,
      exportsRenamed: Object.values(plan.exportRenames).reduce((a, m) => a + Object.keys(m).length, 0),
      exportFrozenModules: Object.keys(plan.frozenExports).length,
      ms: { facts: t1 - t0, rename: t2 - t1, total: Date.now() - t0 },
    },
    namingClashes: nm.clashes,
    namingWarnings: nm.warnings ?? [],
    unknownNamingFiles,
    passthrough,
    exportPlan: { renames: plan.exportRenames, rejected: plan.rejected, conflicts: plan.conflicts, frozenExports: plan.frozenExports },
    directEvals: modules.filter((r) => r.directEvals.length).map((r) => ({ file: r.file, at: r.directEvals })),
    annexB: modules.filter((r) => r.annexB.length).map((r) => ({ file: r.file, at: r.annexB })),
    modules: modules
      .filter((r) => r.conflicts.length || r.rejected.length || r.warnings.length || r.renamed?.length)
      .map((r) => ({ file: r.file, stats: r.stats, conflicts: r.conflicts, rejected: r.rejected, warnings: r.warnings, renamed: r.renamed })),
  };
  return report;
}

function parseArgs(argv) {
  const pos = [];
  const o = { force: false, autoImportNames: false, listRenamed: false, check: false, report: null, jobs: defaultJobs() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') o.force = true;
    else if (a === '--auto-import-names') o.autoImportNames = true;
    else if (a === '--list-renamed') o.listRenamed = true;
    else if (a === '--check') o.check = true;
    else if (a === '--report') o.report = argv[++i];
    else if (a === '--jobs') o.jobs = Number(argv[++i]);
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else pos.push(a);
  }
  if (pos.length !== 3) throw new Error('usage: node tools/rename/apply.mjs <original> <naming-dir> <out-dir> [--report f] [--force] [--check] [--jobs n] [--auto-import-names] [--list-renamed]');
  [o.original, o.naming, o.out] = pos;
  return o;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const o = parseArgs(process.argv.slice(2));
    const report = await applyNaming({ ...o, log: (m) => console.error(m) });
    if (o.report) {
      fs.mkdirSync(path.dirname(path.resolve(o.report)), { recursive: true });
      fs.writeFileSync(o.report, JSON.stringify(report, null, 1));
    }
    console.log(JSON.stringify(report.summary, null, 1));
    if (o.check) {
      const { alphaCheck } = await import('./alpha-check.mjs');
      const r = await alphaCheck({ a: o.original, b: o.out, jobs: o.jobs });
      console.log(JSON.stringify(r.summary, null, 1));
      if (!r.ok) process.exitCode = 1;
    }
  } catch (e) {
    console.error(e.stack || String(e));
    process.exitCode = 2;
  }
}
