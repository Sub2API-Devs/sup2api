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
var PROCESS_WRAPPER_ENV = "CLAUDE_CODE_PROCESS_WRAPPER",
  Xit = 12000,
  c = { argv: [], error: null, platformIgnored: !1, record: "" };
//@ chunk-ch0vxh4c.js:643-1292 placement
class ProcessWrapperState {
  memoRaw = void 0;
  memoState = c;
  getState() {
    let r = withHostOwnedEnv(() => process.env[PROCESS_WRAPPER_ENV]);
    if (!r) return c;
    let e = r === this.memoRaw ? this.memoState.error : null;
    if (r === this.memoRaw && e === null) return this.memoState;
    if (
      ((this.memoRaw = r),
      (this.memoState = readProcessWrapper(r)),
      this.memoState.error && this.memoState.error !== e)
    )
      logForDebugging(
        `${PROCESS_WRAPPER_ENV} is set but can't be used \u2014 self-spawns that require it will refuse to start rather than run unwrapped: ${this.memoState.error}`,
        { level: "error" },
      );
    else if (this.memoState.platformIgnored)
      logForDebugging(
        `${PROCESS_WRAPPER_ENV} is set but ignored on Windows \u2014 the launcher must exec into Claude Code, which Windows can't do; sessions run unwrapped`,
        { level: "warn" },
      );
    return this.memoState;
  }
}
//@ chunk-ch0vxh4c.js:1292-1315 placement
var S = new HostScoped(() => new ProcessWrapperState());
//@ chunk-ch0vxh4c.js:1315-1363 placement
function processWrapperState() {
  return S.of(getRootSession().host).getState();
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
  if (processWrapperError() !== null) return !1;
  let r = processWrapperArgv();
  if (r.length === 0) return !0;
  let e = absoluteLauncher(r)[0];
  return e === void 0 ? !0 : isPossibleClaudeBinary(e);
}
//@ chunk-ch0vxh4c.js:1657-1728 placement
function absoluteLauncher(r) {
  let e = r[0];
  return e !== void 0 && e.startsWith("/") ? [e] : [];
}
//@ chunk-ch0vxh4c.js:1728-1923 placement
async function processWrapperProblem() {
  let r = processWrapperError();
  if (r) return r;
  if (await isProcessWrapperUsable()) return null;
  return `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then retry`;
}
//@ chunk-ch0vxh4c.js:1923-1957 placement
function processWrapperRecord() {
  return processWrapperState().record;
}
//@ chunk-ch0vxh4c.js:1957-2828 placement
function readProcessWrapper(r) {
  if (getPlatform() === "windows") return { argv: [], error: null, platformIgnored: !0, record: "" };
  let e;
  try {
    e = parseWrapperArgv(r);
  } catch (error) {
    return i(error instanceof Error ? error.message : String(error));
  }
  if (e.length === 0)
    return i(
      "the value is set but contains no launcher \u2014 unset the variable to run without one, or set it to the absolute path of your launcher",
    );
  let s = e[0];
  if (s === process.execPath || s === join(getUserBinDir(), "claude"))
    return i(
      `launcher \`${s}\` is Claude Code's own launch path \u2014 point ${PROCESS_WRAPPER_ENV} at your launcher, not at claude`,
    );
  if (!isAbsolute(s)) return i("the launcher must be an absolute path, not a bare name resolved via PATH");
  try {
    let n = statSync(s);
    if (!n.isFile() || (n.mode & 73) === 0) return i(`launcher \`${s}\` is not an executable regular file`);
  } catch {
    return i(`launcher \`${s}\` does not exist or is not readable`);
  }
  return {
    argv: e,
    error: null,
    platformIgnored: !1,
    record: e.map((n) => (/[\s"]/.test(n) ? jsonStringify(n) : n)).join(" "),
  };
}
//@ chunk-ch0vxh4c.js:2828-2907 placement
function i(r) {
  return { argv: [], error: `${PROCESS_WRAPPER_ENV}: ${r}`, platformIgnored: !1, record: "" };
}
//@ chunk-ch0vxh4c.js:2907-2925 placement
var P = ";|&$()`<>";
/**
 * 解析 CLAUDE_CODE_PROCESS_WRAPPER：JSON 数组或 shell 风格字符串转成 argv。
 */
//@ chunk-ch0vxh4c.js:2925-4054 placement
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
  let s = [],
    n = "",
    u = !1,
    l = !1;
  for (let o = 0; o < trimmed.length; o++) {
    let a = trimmed[o];
    if (l) {
      if (a === "\\" && (trimmed[o + 1] === '"' || trimmed[o + 1] === "\\")) n += trimmed[++o];
      else if (a === '"') l = !1;
      else n += a;
      continue;
    }
    if (a === '"') {
      ((l = !0), (u = !0));
      continue;
    }
    if (/\s/.test(a)) {
      if (u) (s.push(n), (n = ""), (u = !1));
      continue;
    }
    if (P.includes(a))
      throw Error(
        "the value contains an unquoted shell metacharacter (one of ; | & $ ( ) ` < >) \u2014 it is an argv list, not a shell command",
      );
    ((n += a), (u = !0));
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
  PROCESS_WRAPPER_ENV,
  Xit,
  processWrapperProblem,
  absoluteLauncher,
  processWrapperState,
};
