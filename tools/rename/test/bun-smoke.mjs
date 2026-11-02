#!/usr/bin/env node
// 运行层冒烟：用 tools/verify/run.mjs（Bun 1.4.4、隔离沙箱、假上游）分别运行两棵树，比较
// --version、--help 的输出和 `-p hi` 发给假上游的请求体（归一化随机值：UUID、64 位十六进制、cch、沙箱路径）。
// 用法：node tools/rename/test/bun-smoke.mjs <a-dir> <b-dir> [<c-dir> …]
// 退出码 0 = 全部一致。依赖 node_modules/bun（npm 包 bun@1.4.4）。
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const { runCli } = await import(new URL('../../verify/run.mjs', import.meta.url));

const norm = (s) =>
  JSON.stringify(s)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'UUID')
    .replace(/[0-9a-f]{64}/g, 'HEX64')
    .replace(/cch=[0-9a-f]+/g, 'cch=X')
    .replace(/run-[A-Za-z0-9]{6}/g, 'run-X');

const md5 = (s) => createHash('md5').update(s).digest('hex');

export async function smoke(tree) {
  const out = {};
  const v = await runCli({ tree, args: ['--version'], timeoutMs: 120000, upstream: false });
  out.version = { exit: v.exitCode, stdout: v.stdout.trim() };
  const h = await runCli({ tree, args: ['--help'], timeoutMs: 120000, upstream: false });
  out.help = { exit: h.exitCode, md5: md5(h.stdout) };
  const p = await runCli({ tree, args: ['-p', 'hi'], timeoutMs: 180000 });
  out.print = { exit: p.exitCode, stdout: p.stdout.trim(), requests: p.requests.length, bodyMd5: md5(norm(p.requests.map((r) => r.body))) };
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const trees = process.argv.slice(2);
  const results = [];
  for (const t of trees) {
    const r = await smoke(t);
    results.push(r);
    console.log(t, JSON.stringify(r));
  }
  const key = (r) => JSON.stringify(r);
  const same = results.every((r) => key(r) === key(results[0]));
  console.log(same ? 'IDENTICAL' : 'DIFFERENT');
  if (!same) process.exitCode = 1;
}
