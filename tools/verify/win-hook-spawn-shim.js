// 验证环境的补丁，不是 Claude Code 2.1.316 源码的一部分。
//
// 问题：316 的 linux 构建把平台固化成 "linux"（见 win-append-shim.js 与 docs/process/verify.md 第 13 节）。
// 命令钩子（settings.json / 插件 hooks.json 的 type:"command"）在 utils/hooks.js 的执行函数里是
//   let detached = !isWindows;                       // linux 构建里恒为 true
//   let shell = isWindows ? <Git Bash 路径> : true;   // linux 构建里恒为 true
//   spawn(finalCommand, [], { env, cwd, shell, detached, windowsHide: true })
// 然后往 child.stdin 写钩子输入 JSON。在 Windows 上这会出两个问题（docs/process/scenarios.md 第 3 节）：
//   1. 公版 Bun 1.4.4 在 Windows 上 spawn(…, {shell:true, detached:true}) 时子进程拿不到管道 stdin/stdout
//      （最小复现：不 detached 能收到，detached 收不到，子进程也不输出），钩子读 stdin 一直等到 CLI 的钩子超时；
//   2. shell:true 在 Windows 上是 cmd.exe，不展开 ${CLAUDE_PLUGIN_ROOT} 这类变量（CLI 靠 shell 从环境变量展开），
//      插件钩子 node "${CLAUDE_PLUGIN_ROOT}/hooks/x.cjs" 找不到脚本。
// Windows 构建走的是 isWindows 分支：detached=false、shell=Git Bash，两个问题都没有。
//
// 做法：只在 win32 上、只对"shell === true 且 detached 为真"的 child_process.spawn 调用，改成 Windows 构建的参数：
// detached=false，shell=CLAUDE_CODE_GIT_BASH_PATH（run.mjs 总会设置；没有时只改 detached）。
// Bash 工具是 spawn(bash, [-c, …], {detached:true, stdio:[pipe, fd, fd]})，不带 shell，不受影响；
// MCP stdio 服务器不 detached，也不受影响。
// 用法：bun --preload tools/verify/win-hook-spawn-shim.js …；run.mjs --shim-win-hook-spawn / runCli({ shimWinHookSpawn: true })。
'use strict';
(function install() {
  if (process.platform !== 'win32') return;
  const cp = require('child_process');
  const orig = cp.spawn;
  cp.spawn = function (file, args, opts) {
    const o = Array.isArray(args) ? opts : args;
    if (o && typeof o === 'object' && o.shell === true && o.detached) {
      const fixed = { ...o, detached: false };
      if (process.env.CLAUDE_CODE_GIT_BASH_PATH) fixed.shell = process.env.CLAUDE_CODE_GIT_BASH_PATH;
      return Array.isArray(args) ? orig.call(this, file, args, fixed) : orig.call(this, file, fixed);
    }
    return orig.apply(this, arguments);
  };
})();
