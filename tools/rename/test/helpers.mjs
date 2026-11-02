// 测试辅助：在临时目录里造模块树、对单模块做改名 / 比较。
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { renameModule } from '../lib/rename.mjs';
import { compareModule, crossCheck } from '../lib/alpha.mjs';
import { parseModule } from '../lib/parse.mjs';

export function tmpDir(prefix = 'rename-test-') {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeTree(dir, files) {
  for (const [name, text] of Object.entries(files)) {
    const p = path.join(dir, name);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text);
  }
  return dir;
}

export function readTree(dir, names) {
  return Object.fromEntries(names.map((n) => [n, fs.readFileSync(path.join(dir, n), 'utf8')]));
}

// 找到第 nth 个（从 0 起）名为 name 的标识符的偏移，用作 locals 键。
export function offsetOf(src, name, nth = 0) {
  const re = new RegExp(`(?<![A-Za-z0-9_$.#])${name.replace(/\$/g, '\\$')}(?![A-Za-z0-9_$])`, 'g');
  let m;
  let i = 0;
  while ((m = re.exec(src))) {
    if (i++ === nth) return m.index;
  }
  throw new Error(`${name}#${nth} not found`);
}

// 单模块：改名并做 α 校验，返回 { r, cmp }。
export function renameAndCheck(src, entry, file = 'm.js') {
  const r = renameModule(file, src, entry, null);
  parseModule(r.code); // 必须仍可解析
  const cmp = compareModule(file, src, r.code);
  return { r, cmp };
}

// 单模块 α 比较（手写的 B）
export function alpha(srcA, srcB, file = 'm.js') {
  return compareModule(file, srcA, srcB);
}

// 多模块 α 比较（不经过磁盘）
export function alphaTree(treeA, treeB) {
  const results = Object.keys(treeA).map((f) => compareModule(f, treeA[f], treeB[f]));
  const cross = crossCheck(results);
  return { ok: results.every((r) => r.ok) && cross.length === 0, results, cross };
}
