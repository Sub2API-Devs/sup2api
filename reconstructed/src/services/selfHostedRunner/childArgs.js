/**
 * services/selfHostedRunner/childArgs.ts
 *
 * 2.1.316 新增：自托管 runner 把服务器下发的参数转为子进程 CLI 参数（拒绝畸形/被阻止的键）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g9fr1aeb.js (5)
 * attribution: placement 5
 */
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";

/**
 * runner 转交给子进程的服务器参数：参数名格式、布尔型参数、系统提示文件类参数。
 */
//@ chunk-g9fr1aeb.js:227-380 placement
var SERVER_ARG_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/,
  BOOLEAN_SERVER_ARGS = new Set(["restricted"]),
  SYSTEM_PROMPT_FILE_ARGS = [
    "system-prompt-file",
    "append-system-prompt-file",
    "append-subagent-system-prompt-file",
  ];
//@ chunk-g9fr1aeb.js:380-415 placement
function RC(t, e) {
  return `${t}=${e}`;
}
//@ chunk-g9fr1aeb.js:415-510 placement
function mxr(t, e) {
  let n = String(e);
  if (n.length > 1 && n.startsWith("-")) return [RC(t, n)];
  return [t, n];
}
//@ chunk-g9fr1aeb.js:510-557 placement
function wrn(t, e, n) {
  t.push(...mxr(`--${e}`, n));
}
//@ chunk-g9fr1aeb.js:557-810 placement
function appendServerArgs(t, e, n, o) {
  let i = 0;
  for (let [r, s] of Object.entries(e)) {
    if (!SERVER_ARG_NAME_PATTERN.test(r)) {
      o("malformed", JSON.stringify(r));
      continue;
    }
    if (n.has(r)) {
      o("blocked", r);
      continue;
    }
    if (BOOLEAN_SERVER_ARGS.has(r)) {
      if (!isEnvDefinedFalsy(String(s))) (t.push(`--${r}`), i++);
      continue;
    }
    if (s !== "") (wrn(t, r, s), i++);
  }
  return i;
}

export { appendServerArgs, wrn, SYSTEM_PROMPT_FILE_ARGS, RC, mxr };
