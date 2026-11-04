// 递归列出目录下所有文件（相对路径，/ 分隔，排序）。
// 用法：import { listFiles } from './files.mjs'
import fs from 'node:fs';
import path from 'node:path';

export function listFiles(root) {
  const out = [];
  const walk = (rel) => {
    for (const ent of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + ent.name : ent.name;
      if (ent.isDirectory()) walk(r);
      else out.push(r);
    }
  };
  walk('');
  return out.sort();
}
