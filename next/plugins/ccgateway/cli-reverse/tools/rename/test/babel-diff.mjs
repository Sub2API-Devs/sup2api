#!/usr/bin/env node
// 差分核对：lib/scope.mjs 的绑定解析 vs @babel/traverse 的作用域分析。
// 用法：node tools/rename/test/babel-diff.mjs <original> [--limit n] [--files a.js,b.js]
// 对每个标识符出现（声明或引用），两边各自给出它解析到的绑定；要求两边的绑定对应关系是双射，
// 且"解析为全局"的集合相同。已知并接受的建模差异：
//   - 隐式 arguments：scope.mjs 建了隐式绑定，Babel 视为全局 → 跳过名为 arguments 的引用；
//   - Annex B catch var：scope.mjs 冻结两边，不比较（original 中 0 处）；
//   - 函数声明 / 函数表达式的名字标识符：Babel 的 path.scope 是函数自身作用域，按函数声明的外层作用域查；
//     函数表达式名字在 Babel 里与参数同处一个作用域（function f(f){} 会被 Babel 混为一个绑定），
//     出现这种同名时跳过名字标识符本身（scope.mjs 按规范把名字放在参数外一层）；同理函数体里与函数表达式名同名的
//     let/const/var 会被 Babel 解析到名字绑定（kind "local"），这类出现计入 skipped 不比较。
// 输出：每个模块的差异条数与前几条样例；退出码 0 = 无差异。
// 库接口：import { babelDiff } from './babel-diff.mjs'
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import _traverse from '@babel/traverse';
import { parseModule, isJsFile, readText } from '../lib/parse.mjs';
import { analyze, OCC } from '../lib/scope.mjs';
import { listFiles } from '../lib/files.mjs';

const traverse = _traverse.default ?? _traverse;

export function babelDiff(source) {
  const ast = parseModule(source);
  const an = analyze(ast, source);
  const ours2babel = new Map();
  const babel2ours = new Map();
  const diffs = [];
  let checked = 0;
  let skipped = 0;
  const note = (msg, node) => {
    if (diffs.length < 10) diffs.push({ msg, at: node.start, text: source.slice(Math.max(0, node.start - 40), node.end + 40) });
    else diffs.length++;
  };
  traverse(ast, {
    Identifier(p) {
      const node = p.node;
      const o = node[OCC];
      const isBindingSite = p.isBindingIdentifier();
      const isRef = p.isReferencedIdentifier();
      if (!o) {
        // 我们认为不是绑定相关（属性名、标签、导入导出名……）
        if (isRef && !p.parentPath.isExportSpecifier() && !p.parentPath.isImportSpecifier()) note(`babel sees a reference ${node.name}, scope.mjs does not`, node);
        return;
      }
      if (!isBindingSite && !isRef && !p.parentPath.isExportSpecifier()) {
        note(`scope.mjs records ${node.name} but babel sees neither binding nor reference`, node);
        return;
      }
      if (node.name === 'arguments' && o.binding?.implicit) return;
      checked++;
      let lookup = p.scope;
      const par = p.parentPath;
      if (p.key === 'id' && (par.isFunctionDeclaration() || par.isClassDeclaration())) lookup = par.scope.parent;
      if (p.key === 'id' && par.isFunctionExpression() && par.scope.getOwnBinding(node.name)?.identifier !== node) {
        skipped++;
        return;
      }
      const bb = lookup.getBinding(node.name) ?? null;
      const ob = o.binding;
      if (ob && ob.frozen === 'annexB-catch-var') return;
      if ((bb === null) !== (ob === null)) {
        note(`${node.name}: babel ${bb ? 'binding' : 'global'} vs scope.mjs ${ob ? 'binding' : 'global'}`, node);
        return;
      }
      if (!bb) return;
      if (bb.kind === 'local' && ob.kind !== 'fnname' && ob.kind !== 'classname') {
        skipped++;
        return;
      }
      const x = ours2babel.get(ob);
      const y = babel2ours.get(bb);
      if (x === undefined && y === undefined) {
        ours2babel.set(ob, bb);
        babel2ours.set(bb, ob);
      } else if (x !== bb || y !== ob) note(`${node.name}: binding correspondence is not a bijection`, node);
    },
  });
  return { checked, skipped, diffs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const root = argv[0];
  let limit = Infinity;
  let only = null;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--limit') limit = Number(argv[++i]);
    else if (argv[i] === '--files') only = argv[++i].split(',');
  }
  const t0 = Date.now();
  let files = (only ?? listFiles(root)).filter(isJsFile);
  let n = 0;
  let bad = 0;
  let checked = 0;
  let skipped = 0;
  for (const f of files) {
    if (n >= limit) break;
    const { text } = readText(path.join(root, f));
    if (text === null) continue; // 非 UTF-8（zstd 资源脚本）
    let r;
    try {
      r = babelDiff(text);
    } catch (e) {
      throw new Error(`${f}: ${e.message}`);
    }
    n++;
    checked += r.checked;
    skipped += r.skipped;
    if (r.diffs.length) {
      bad++;
      console.log(f, r.diffs.length, JSON.stringify(r.diffs.slice(0, 3)));
    }
  }
  console.log(JSON.stringify({ modules: n, identifiersChecked: checked, skippedBabelLimitations: skipped, modulesWithDiffs: bad, ms: Date.now() - t0 }));
  if (bad) process.exitCode = 1;
}
