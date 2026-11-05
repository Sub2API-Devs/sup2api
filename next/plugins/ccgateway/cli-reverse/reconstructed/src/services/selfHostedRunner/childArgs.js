/**
 * services/selfHostedRunner/childArgs.ts
 *
 * 2.1.316 新增：自托管 runner 把服务器下发的参数转为子进程 CLI 参数（拒绝畸形/被阻止的键）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-dmzh0zjv.js (5)
 * attribution: placement 5
 */
import { isEnvDefinedFalsy } from "../../utils/envUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dmzh0zjv.js:227-380 placement
/**
 * runner 转交给子进程的服务器参数：参数名格式、布尔型参数、系统提示文件类参数。
 */
var SERVER_ARG_NAME_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BOOLEAN_SERVER_ARGS;
var SYSTEM_PROMPT_FILE_ARGS;
deferInit("chunk-dmzh0zjv.js:227", () => {
  SERVER_ARG_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
  BOOLEAN_SERVER_ARGS = new Set(["restricted"]);
  SYSTEM_PROMPT_FILE_ARGS = [
    "system-prompt-file",
    "append-system-prompt-file",
    "append-subagent-system-prompt-file",
  ];
});
//@ chunk-dmzh0zjv.js:380-415 placement
/**
 * 拼出 `--key value` 形式的参数。
 */
function keyValueArg(key, value) {
  return `${key}=${value}`;
}
//@ chunk-dmzh0zjv.js:415-510 placement
/**
 * 拼出 flag 与值的参数对（必要时省略值）。
 */
function flagArgPair(flag, value) {
  let text = String(value);
  if (text.length > 1 && text.startsWith("-")) return [keyValueArg(flag, text)];
  return [flag, text];
}
//@ chunk-dmzh0zjv.js:510-557 placement
/**
 * 按条件追加一对 flag 参数。
 */
function pushFlagArg(args, name, value) {
  args.push(...flagArgPair(`--${name}`, value));
}
//@ chunk-dmzh0zjv.js:557-810 placement
function appendServerArgs(args, serverArgs, blockedNames, onProblem) {
  let pushedCount = 0;
  for (let [key, value] of Object.entries(serverArgs)) {
    if (!SERVER_ARG_NAME_PATTERN.test(key)) {
      onProblem("malformed", JSON.stringify(key));
      continue;
    }
    if (blockedNames.has(key)) {
      onProblem("blocked", key);
      continue;
    }
    if (BOOLEAN_SERVER_ARGS.has(key)) {
      if (!isEnvDefinedFalsy(String(value))) {
        args.push(`--${key}`);
        pushedCount++;
      }
      continue;
    }
    if (value !== "") {
      pushFlagArg(args, key, value);
      pushedCount++;
    }
  }
  return pushedCount;
}
export { appendServerArgs, pushFlagArg, SYSTEM_PROMPT_FILE_ARGS, keyValueArg, flagArgPair };
