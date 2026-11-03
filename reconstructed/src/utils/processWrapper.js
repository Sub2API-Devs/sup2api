/**
 * utils/processWrapper.ts
 *
 * 2.1.316 新增：CLAUDE_CODE_PROCESS_WRAPPER 解析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ch0vxh4c.js (14)
 * attribution: placement 14
 */
import { join, isAbsolute } from "path";
import { statSync } from "fs";
import { withHostOwnedEnv } from "./settings/managedSettingsFiles.js";
import { logForDebugging } from "./debug.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { isPossibleClaudeBinary } from "./nativeInstaller/installer.js";
import { getPlatform } from "./platform.js";
import { getUserBinDir } from "./xdg.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";

//@ chunk-ch0vxh4c.js:544-643 placement
/**
 * PROCESS_WRAPPER_ENV：进程包装器环境变量；PROCESS_WRAPPER_TIMEOUT_MS：进程包装器超时（同一声明共 2 个绑定）。
 */
var PROCESS_WRAPPER_ENV_2 = "CLAUDE_CODE_PROCESS_WRAPPER";
var PROCESS_WRAPPER_ENV = 12000;
var PROCESS_WRAPPER_TIMEOUT_MS = {
  argv: [],
  error: null,
  platformIgnored: false,
  record: "",
};
//@ chunk-ch0vxh4c.js:643-1292 placement
class ProcessWrapperState {
  memoRaw = undefined;
  memoState = PROCESS_WRAPPER_TIMEOUT_MS;
  getState() {
    let r = withHostOwnedEnv(() => process.env[PROCESS_WRAPPER_ENV_2]);
    if (!r) return PROCESS_WRAPPER_TIMEOUT_MS;
    let error = r === this.memoRaw ? this.memoState.error : null;
    if (r === this.memoRaw && error === null) return this.memoState;
    this.memoRaw = r;
    this.memoState = readProcessWrapper(r);
    if (this.memoState.error && this.memoState.error !== error)
      logForDebugging(
        `${PROCESS_WRAPPER_ENV_2} is set but can't be used \u2014 self-spawns that require it will refuse to start rather than run unwrapped: ${this.memoState.error}`,
        {
          level: "error",
        },
      );
    else if (this.memoState.platformIgnored)
      logForDebugging(
        `${PROCESS_WRAPPER_ENV_2} is set but ignored on Windows \u2014 the launcher must exec into Claude Code, which Windows can't do; sessions run unwrapped`,
        {
          level: "warn",
        },
      );
    return this.memoState;
  }
}
//@ chunk-ch0vxh4c.js:1292-1315 placement
var processWrapperStateSlot = new HostScoped(() => new ProcessWrapperState());
//@ chunk-ch0vxh4c.js:1315-1363 placement
function processWrapperState() {
  return processWrapperStateSlot.of(getRootSession().host).getState();
}
//@ chunk-ch0vxh4c.js:1363-1395 placement
function processWrapperArgv() {
  return processWrapperState().argv;
}
//@ chunk-ch0vxh4c.js:1395-1428 placement
function processWrapperError() {
  return processWrapperState().error;
}
//@ chunk-ch0vxh4c.js:1428-1552 placement
async function isProcessWrapperUsable() {
  if (processWrapperError() !== null) return false;
  let r = processWrapperArgv();
  if (r.length === 0) return true;
  let filePath = absoluteLauncher(r)[0];
  return filePath === undefined ? true : isPossibleClaudeBinary(filePath);
}
//@ chunk-ch0vxh4c.js:1657-1728 placement
function absoluteLauncher(r) {
  let e = r[0];
  return e !== undefined && e.startsWith("/") ? [e] : [];
}
//@ chunk-ch0vxh4c.js:1728-1923 placement
async function processWrapperProblem() {
  let r = processWrapperError();
  if (r) return r;
  if (await isProcessWrapperUsable()) return null;
  return `${PROCESS_WRAPPER_ENV_2}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then retry`;
}
//@ chunk-ch0vxh4c.js:1923-1957 placement
function processWrapperRecord() {
  return processWrapperState().record;
}
//@ chunk-ch0vxh4c.js:1957-2828 placement
function readProcessWrapper(r) {
  if (getPlatform() === "windows")
    return {
      argv: [],
      error: null,
      platformIgnored: true,
      record: "",
    };
  let e;
  try {
    e = parseWrapperArgv(r);
  } catch (error) {
    return processWrapperError_2(error instanceof Error ? error.message : String(error));
  }
  if (e.length === 0)
    return processWrapperError_2(
      "the value is set but contains no launcher \u2014 unset the variable to run without one, or set it to the absolute path of your launcher",
    );
  let s = e[0];
  if (s === process.execPath || s === join(getUserBinDir(), "claude"))
    return processWrapperError_2(
      `launcher \`${s}\` is Claude Code's own launch path \u2014 point ${PROCESS_WRAPPER_ENV_2} at your launcher, not at claude`,
    );
  if (!isAbsolute(s))
    return processWrapperError_2("the launcher must be an absolute path, not a bare name resolved via PATH");
  try {
    let n = statSync(s);
    if (!n.isFile() || (n.mode & 73) === 0)
      return processWrapperError_2(`launcher \`${s}\` is not an executable regular file`);
  } catch {
    return processWrapperError_2(`launcher \`${s}\` does not exist or is not readable`);
  }
  return {
    argv: e,
    error: null,
    platformIgnored: false,
    record: e.map((n) => (/[\s"]/.test(n) ? jsonStringify(n) : n)).join(" "),
  };
}
//@ chunk-ch0vxh4c.js:2828-2907 placement
function processWrapperError_2(r) {
  return {
    argv: [],
    error: `${PROCESS_WRAPPER_ENV_2}: ${r}`,
    platformIgnored: false,
    record: "",
  };
}
//@ chunk-ch0vxh4c.js:2907-2925 placement
var SHELL_METACHARS = ";|&$()`<>";
//@ chunk-ch0vxh4c.js:2925-4054 placement
/**
 * 解析 CLAUDE_CODE_PROCESS_WRAPPER：JSON 数组或 shell 风格字符串转成 argv。
 */
function parseWrapperArgv(r) {
  let trimmed = r.trim();
  if (trimmed === "") return [];
  if (trimmed.startsWith("[")) {
    let o;
    try {
      o = jsonParse(trimmed);
    } catch {
      throw Error("value starts with `[` but is not valid JSON");
    }
    if (!Array.isArray(o) || !o.every((a) => typeof a === "string"))
      throw Error("JSON form must be an array of strings");
    if (o.length > 0 && o.some((a) => a === "")) {
      if (o.every((a) => a === "")) return [];
      throw Error(
        "the JSON array contains an empty element \u2014 remove it, or fill in the value it was a placeholder for",
      );
    }
    return o;
  }
  let s = [];
  let n = "";
  let u = false;
  let l = false;
  for (let j = 0; j < trimmed.length; j++) {
    let a = trimmed[j];
    if (l) {
      if (a === "\\" && (trimmed[j + 1] === '"' || trimmed[j + 1] === "\\")) n += trimmed[++j];
      else if (a === '"') l = false;
      else n += a;
      continue;
    }
    if (a === '"') {
      l = true;
      u = true;
      continue;
    }
    if (/\s/.test(a)) {
      if (u) {
        s.push(n);
        n = "";
        u = false;
      }
      continue;
    }
    if (SHELL_METACHARS.includes(a))
      throw Error(
        "the value contains an unquoted shell metacharacter (one of ; | & $ ( ) ` < >) \u2014 it is an argv list, not a shell command",
      );
    n += a;
    u = true;
  }
  if (l) throw Error("unterminated double quote");
  if (u) s.push(n);
  if (s.length > 0 && s.some((o) => o === "")) {
    if (s.every((o) => o === "")) return [];
    throw Error(
      'the value contains an empty `""` token \u2014 remove it, or fill in the value it was a placeholder for',
    );
  }
  return s;
}
export {
  processWrapperRecord,
  processWrapperError,
  isProcessWrapperUsable,
  processWrapperArgv,
  PROCESS_WRAPPER_ENV_2,
  PROCESS_WRAPPER_ENV,
  processWrapperProblem,
  absoluteLauncher,
  processWrapperState,
};
