// 模块文件名"提及"：源码里（字符串、模板、注释……任何位置，静态 import / export-from 的来源字符串除外）
// 出现的 *.js / *.mjs / *.cjs 文件名。被这样提及的模块可能经 require("./x.js")、new Worker(路径)、
// import.meta.dir + "/x.js" 等方式按路径加载，其导出按属性名访问，所以导出名必须冻结。
// 这是有意的过近似：多冻结只会少改导出名，不会出错。
// 用法：
//   import { mentionTokens, resolveMentions } from './mentions.mjs'
//   const tokens = mentionTokens(source, skipRanges)        // skipRanges: [[start,end)…]（静态导入来源）
//   const files = resolveMentions(tokens, knownFiles)       // 按文件名（basename）匹配，返回 Set<file>
const RE = /[A-Za-z0-9_$@.\-]+\.(?:m?js|cjs)(?![A-Za-z0-9_$])/g;

export function mentionTokens(source, skipRanges = []) {
  const ranges = [...skipRanges].sort((a, b) => a[0] - b[0]);
  const out = new Set();
  let ri = 0;
  for (const m of source.matchAll(RE)) {
    const at = m.index;
    while (ri < ranges.length && ranges[ri][1] <= at) ri++;
    if (ri < ranges.length && ranges[ri][0] <= at && at < ranges[ri][1]) continue;
    out.add(m[0]);
  }
  return [...out];
}

export function basenameIndex(knownFiles) {
  const idx = new Map();
  for (const f of knownFiles) {
    const b = f.slice(f.lastIndexOf('/') + 1);
    let arr = idx.get(b);
    if (!arr) idx.set(b, (arr = []));
    arr.push(f);
  }
  return idx;
}

export function resolveMentions(tokens, idx) {
  const out = new Set();
  for (const t of tokens) {
    const b = t.slice(t.lastIndexOf('/') + 1);
    for (const f of idx.get(b) ?? []) out.add(f);
  }
  return out;
}
