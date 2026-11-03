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

//@ chunk-g9fr1aeb.js:227-380 placement
/**
 * runner 转交给子进程的服务器参数：参数名格式、布尔型参数、系统提示文件类参数。
 */
var SERVER_ARG_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
var BOOLEAN_SERVER_ARGS = new Set(["restricted"]);
var SYSTEM_PROMPT_FILE_ARGS = [
  "system-prompt-file",
  "append-system-prompt-file",
  "append-subagent-system-prompt-file",
];
//@ chunk-g9fr1aeb.js:380-415 placement
/**
 * 拼出 `--key value` 形式的参数。
 */
function keyValueArg(t, e) {
  return `${t}=${e}`;
}
//@ chunk-g9fr1aeb.js:415-510 placement
/**
 * 拼出 flag 与值的参数对（必要时省略值）。
 */
function flagArgPair(t, e) {
  let n = String(e);
  if (n.length > 1 && n.startsWith("-")) return [keyValueArg(t, n)];
  return [t, n];
}
//@ chunk-g9fr1aeb.js:510-557 placement
/**
 * 按条件追加一对 flag 参数。
 */
function pushFlagArg(t, e, n) {
  t.push(...flagArgPair(`--${e}`, n));
}
//@ chunk-g9fr1aeb.js:557-810 placement
function appendServerArgs(t, e, n, o) {
  let i = 0;
  for (let [key, value] of Object.entries(e)) {
    if (!SERVER_ARG_NAME_PATTERN.test(key)) {
      o("malformed", JSON.stringify(key));
      continue;
    }
    if (n.has(key)) {
      o("blocked", key);
      continue;
    }
    if (BOOLEAN_SERVER_ARGS.has(key)) {
      if (!isEnvDefinedFalsy(String(value))) {
        t.push(`--${key}`);
        i++;
      }
      continue;
    }
    if (value !== "") {
      pushFlagArg(t, key, value);
      i++;
    }
  }
  return i;
}
export { appendServerArgs, pushFlagArg, SYSTEM_PROMPT_FILE_ARGS, keyValueArg, flagArgPair };
