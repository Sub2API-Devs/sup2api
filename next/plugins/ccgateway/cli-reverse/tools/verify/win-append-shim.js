// 验证环境的补丁，不是 Claude Code 2.1.316 源码的一部分。
//
// 问题：316 的 linux 构建把平台固化成 "linux"（chunk-znrryf4y.js：new u({platform:"linux",…})，
// 打包时 process.platform 被内联），在 Windows 上运行时 I() 仍返回 "linux"，Bash 工具走 POSIX 分支：
// 输出文件用 O_WRONLY|O_APPEND|O_CREAT|O_EXCL 打开（chunk-1dp9p908.js 的 x()），再把这个 fd 当成子进程
// bash 的 stdout/stderr。Windows 上 libuv 对 O_APPEND 只申请 FILE_APPEND_DATA、去掉 FILE_WRITE_DATA，
// MSYS2/Git Bash 往这种句柄写会报 "write error: Bad file descriptor"（Node 24 与公版 Bun 都一样，见
// docs/process/verify.md 第 13 节的最小复现）。Windows 构建走的是 I()==="windows" 分支，用 "w" 打开，不受影响。
//
// 做法：只在 win32 上、只对"同时带 O_APPEND、O_CREAT、O_EXCL 的数字 flags"（= 新建独占文件）去掉 O_APPEND。
// 新建的空文件从偏移 0 写与追加写结果相同；已存在的文件（不带 O_EXCL）不动，避免覆盖。
// 用法：bun --preload tools/verify/win-append-shim.js …；run.mjs --shim-win-append / runCli({ shimWinAppend: true })。
'use strict';
(function install() {
  if (process.platform !== 'win32') return;
  const fs = require('fs');
  const fsp = require('fs/promises');
  const { O_APPEND, O_CREAT, O_EXCL } = fs.constants;
  if (!O_APPEND || !O_CREAT || !O_EXCL) return;
  const fix = (flags) => (typeof flags === 'number' && (flags & O_APPEND) && (flags & O_CREAT) && (flags & O_EXCL) ? flags & ~O_APPEND : flags);
  const wrap = (mod, name) => {
    const orig = mod[name];
    if (typeof orig !== 'function') return;
    mod[name] = function (p, flags, ...rest) { return orig.call(this, p, fix(flags), ...rest); };
  };
  wrap(fsp, 'open');
  wrap(fs, 'open');
  wrap(fs, 'openSync');
  if (fs.promises && fs.promises !== fsp) wrap(fs.promises, 'open');
})();
