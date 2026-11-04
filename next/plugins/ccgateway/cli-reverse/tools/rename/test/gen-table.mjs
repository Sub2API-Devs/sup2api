#!/usr/bin/env node
// 生成压力测试用命名表（不是正式命名表）。
// 用法：node tools/rename/test/gen-table.mjs <original> <out.json> <mode> [--seed n]
//   mode:
//     full        每个模块的每个未冻结绑定 → `原名_随机后缀`（导入绑定也显式改）
//     no-imports  同上但不写导入绑定，导入方别名全部走"跟随导出方"默认规则
//     collide     所有局部绑定 → value，所有顶层绑定 → item（逼出大量冲突与后缀）
//     globals     绑定轮流改成 process / require / Object / undefined / module / exports / Buffer / console
//                 （逼出"捕获全局"冲突）
// 输出：单个 JSON 命名表（naming/README.md 格式，偏移键）。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isJsFile, readText, tryParse } from '../lib/parse.mjs';
import { bindingsOf } from '../lib/rename.mjs';
import { listFiles } from '../lib/files.mjs';

const GLOBALS = ['process', 'require', 'Object', 'undefined', 'module', 'exports', 'Buffer', 'console'];

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function genTable(original, mode, seed = 1) {
  const rand = rng(seed);
  const table = {};
  let n = 0;
  for (const file of listFiles(original)) {
    if (!isJsFile(file)) continue;
    const { text } = readText(path.join(original, file));
    const p = tryParse(text);
    if (p.error) continue;
    const entry = {};
    let i = 0;
    for (const b of bindingsOf(file, text, { ast: p.ast })) {
      if (b.frozen) continue;
      if (mode === 'no-imports' && b.kind === 'import') continue;
      let name;
      if (mode === 'full' || mode === 'no-imports') name = `${b.name}_${Math.floor(rand() * 36 ** 4).toString(36)}`;
      else if (mode === 'collide') name = b.scope === 'top' ? 'item' : 'value';
      else if (mode === 'globals') name = GLOBALS[i++ % GLOBALS.length];
      else throw new Error(`unknown mode ${mode}`);
      entry[b.key] = { name, source: 'auto', confidence: 0.1 };
      n++;
    }
    table[file] = entry;
  }
  return { table, n };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [original, out, mode, ...rest] = process.argv.slice(2);
  const seed = rest[0] === '--seed' ? Number(rest[1]) : 1;
  const { table, n } = genTable(original, mode, seed);
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(table));
  console.log(`${mode}: ${n} entries → ${out}`);
}
