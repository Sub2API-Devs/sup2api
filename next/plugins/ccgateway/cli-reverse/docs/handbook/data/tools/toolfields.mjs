// 用法：node docs/handbook/data/tools/toolfields.mjs（在 cli-reverse 目录执行）
// 输入：analysis/scan/decls.jsonl、original/*.js
// 输出：stdout —— 316 中所有工具定义对象（on({...}) 调用的第一个参数的顶层键）出现频次，与旧版 Tool.ts 的字段对比
import fs from 'node:fs';
import { parse } from '@babel/parser';
const rd = (p) => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const D = rd('analysis/scan/decls.jsonl');
const cand = D.filter((d) => d.props.includes('inputSchema') && (d.props.includes('create') || d.props.includes('call')) && d.props.includes('name'));
const freq = new Map(); let n = 0; const names = [];
const byFile = new Map();
for (const d of cand) (byFile.get(d.file) ?? byFile.set(d.file, []).get(d.file)).push(d);
for (const [f, ds] of byFile) {
  const src = fs.readFileSync('original/' + f, 'utf8');
  for (const d of ds) {
    let ast; try { ast = parse(src.slice(d.start, d.end), { sourceType: 'module', errorRecovery: true, allowReturnOutsideFunction: true, allowAwaitOutsideFunction: true }); } catch { continue; }
    // find object expressions with key name + inputSchema-ish
    const stack = [ast.program];
    while (stack.length) {
      const x = stack.pop();
      if (!x || typeof x !== 'object') continue;
      if (Array.isArray(x)) { stack.push(...x); continue; }
      if (x.type === 'ObjectExpression') {
        const keys = x.properties.map((p) => p.key?.name ?? p.key?.value ?? (p.type === 'SpreadElement' ? '...' : '?'));
        if (keys.includes('name') && (keys.includes('inputSchema') || keys.includes('create')) && (keys.includes('create') || keys.includes('prompt'))) {
          n++; for (const k of new Set(keys)) freq.set(k, (freq.get(k) ?? 0) + 1);
        }
      }
      for (const k in x) if (k !== 'loc' && k !== 'start' && k !== 'end') stack.push(x[k]);
    }
  }
}
console.log('tool definition objects:', n);
const ref = fs.readFileSync('references/claude-code-analysis/src/Tool.ts', 'utf8');
for (const [k, v] of [...freq].sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(4), k, ref.includes(k) ? '' : '  [新]');
