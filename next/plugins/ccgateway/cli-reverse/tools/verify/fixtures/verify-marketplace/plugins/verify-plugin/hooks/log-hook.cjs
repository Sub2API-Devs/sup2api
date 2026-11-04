// verify-plugin 的命令钩子（运行验证夹具，不是 316 源码）。
// 从 stdin 读钩子输入 JSON，往 <CLAUDE_PROJECT_DIR 或 cwd>/plugin-hook.log 追加一行摘要（事件名、工具名、
// CLAUDE_PLUGIN_ROOT 是否指向插件目录），场景据此检查钩子是否运行、按什么顺序运行。
//   UserPromptSubmit：stdout 输出 VERIFY-PLUGIN-HOOK-CONTEXT（CLI 把它作为附加上下文放进请求）
//   PreToolUse Write 且文件名是 plugin-blocked.txt：stderr 说明原因并以退出码 2 拦截
// 只用 Node 内置模块；收到完整 JSON 就处理（不依赖 stdin 的 end 事件）。
'use strict';
const fs = require('fs');
const path = require('path');
let buf = '';
let done = false;
function handle(j) {
  done = true;
  const dir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const root = process.env.CLAUDE_PLUGIN_ROOT || '';
  const line = { ev: j.hook_event_name, tool: j.tool_name, pluginRoot: path.basename(root) || null };
  fs.appendFileSync(path.join(dir, 'plugin-hook.log'), JSON.stringify(line) + '\n');
  if (j.hook_event_name === 'UserPromptSubmit') process.stdout.write('VERIFY-PLUGIN-HOOK-CONTEXT');
  if (j.hook_event_name === 'PreToolUse' && j.tool_name === 'Write' && /plugin-blocked\.txt$/.test(String(j.tool_input?.file_path))) {
    process.stderr.write('verify-plugin hook: plugin-blocked.txt is blocked');
    process.exit(2);
  }
  process.exit(0);
}
process.stdin.on('data', (d) => {
  buf += d;
  try { handle(JSON.parse(buf)); } catch (e) { if (done) throw e; }
});
process.stdin.on('end', () => { if (!done) { try { handle(JSON.parse(buf || '{}')); } catch { process.exit(1); } } });
