/**
 * utils/processWrapper.ts
 *
 * 2.1.316 新增：CLAUDE_CODE_PROCESS_WRAPPER 解析
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wfxhhysk.js (14)
 * attribution: placement 14
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, isAbsolute } from "path";
import { statSync } from "fs";
import { withHostOwnedEnv } from "./settings/hostEnvWrites.js";
import { logForDebugging } from "./debug.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { isPossibleClaudeBinary } from "./nativeInstaller/installer.js";
import { getPlatform } from "./platform.js";
import { getUserBinDir } from "./xdg.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-wfxhhysk.js:544-643 placement
/**
 * 进程包装器的常量组：lR 是环境变量名 CLAUDE_CODE_PROCESS_WRAPPER；Xit 是超时 12000 ms；c 是 memoState 的空状态对象（argv/error/platformIgnored/record）。
 */
var PROCESS_WRAPPER_ENV = "CLAUDE_CODE_PROCESS_WRAPPER";
var PROCESS_WRAPPER_TIMEOUT_MS = 12000;
var IDLE_WRAPPER_STATE = {
  argv: [],
  error: null,
  platformIgnored: false,
  record: "",
};
//@ chunk-wfxhhysk.js:643-1292 placement
class ProcessWrapperState {
  memoRaw = undefined;
  memoState = IDLE_WRAPPER_STATE;
  getState() {
    let raw = withHostOwnedEnv(() => process.env[PROCESS_WRAPPER_ENV]);
    if (!raw) return IDLE_WRAPPER_STATE;
    let error = raw === this.memoRaw ? this.memoState.error : null;
    if (raw === this.memoRaw && error === null) return this.memoState;
    this.memoRaw = raw;
    this.memoState = readProcessWrapper(raw);
    if (this.memoState.error && this.memoState.error !== error)
      logForDebugging(
        `${PROCESS_WRAPPER_ENV} is set but can't be used \u2014 self-spawns that require it will refuse to start rather than run unwrapped: ${this.memoState.error}`,
        {
          level: "error",
        },
      );
    else if (this.memoState.platformIgnored)
      logForDebugging(
        `${PROCESS_WRAPPER_ENV} is set but ignored on Windows \u2014 the launcher must exec into Claude Code, which Windows can't do; sessions run unwrapped`,
        {
          level: "warn",
        },
      );
    return this.memoState;
  }
}
//@ chunk-wfxhhysk.js:1292-1315 placement
var processWrapperStateSlot; // deferred: uses ProcessWrapperState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-wfxhhysk.js:1292", () => {
  processWrapperStateSlot = new HostScoped(() => new ProcessWrapperState());
});
//@ chunk-wfxhhysk.js:1315-1363 placement
function processWrapperState() {
  return processWrapperStateSlot.of(getRootSession().host).getState();
}
//@ chunk-wfxhhysk.js:1363-1395 placement
function processWrapperArgv() {
  return processWrapperState().argv;
}
//@ chunk-wfxhhysk.js:1395-1428 placement
function processWrapperError() {
  return processWrapperState().error;
}
//@ chunk-wfxhhysk.js:1428-1552 placement
async function isProcessWrapperUsable() {
  if (processWrapperError() !== null) return false;
  let argv = processWrapperArgv();
  if (argv.length === 0) return true;
  let filePath = absoluteLauncher(argv)[0];
  return filePath === undefined ? true : isPossibleClaudeBinary(filePath);
}
//@ chunk-wfxhhysk.js:1657-1728 placement
function absoluteLauncher(argv) {
  let first = argv[0];
  return first !== undefined && first.startsWith("/") ? [first] : [];
}
//@ chunk-wfxhhysk.js:1728-1923 placement
async function processWrapperProblem() {
  let error = processWrapperError();
  if (error) return error;
  if (await isProcessWrapperUsable()) return null;
  return `${PROCESS_WRAPPER_ENV}: launcher \`${processWrapperArgv()[0]}\` was deleted or is not executable \u2014 restore it (or fix the setting), then retry`;
}
//@ chunk-wfxhhysk.js:1923-1957 placement
function processWrapperRecord() {
  return processWrapperState().record;
}
//@ chunk-wfxhhysk.js:1957-2828 placement
function readProcessWrapper(raw) {
  if (getPlatform() === "windows")
    return {
      argv: [],
      error: null,
      platformIgnored: true,
      record: "",
    };
  let argv;
  try {
    argv = parseWrapperArgv(raw);
  } catch (error) {
    return processWrapperError_2(error instanceof Error ? error.message : String(error));
  }
  if (argv.length === 0)
    return processWrapperError_2(
      "the value is set but contains no launcher \u2014 unset the variable to run without one, or set it to the absolute path of your launcher",
    );
  let launcher = argv[0];
  if (launcher === process.execPath || launcher === join(getUserBinDir(), "claude"))
    return processWrapperError_2(
      `launcher \`${launcher}\` is Claude Code's own launch path \u2014 point ${PROCESS_WRAPPER_ENV} at your launcher, not at claude`,
    );
  if (!isAbsolute(launcher))
    return processWrapperError_2("the launcher must be an absolute path, not a bare name resolved via PATH");
  try {
    let stats = statSync(launcher);
    if (!stats.isFile() || (stats.mode & 73) === 0)
      return processWrapperError_2(`launcher \`${launcher}\` is not an executable regular file`);
  } catch {
    return processWrapperError_2(`launcher \`${launcher}\` does not exist or is not readable`);
  }
  return {
    argv,
    error: null,
    platformIgnored: false,
    record: argv.map((arg) => (/[\s"]/.test(arg) ? jsonStringify(arg) : arg)).join(" "),
  };
}
//@ chunk-wfxhhysk.js:2828-2907 placement
function processWrapperError_2(reason) {
  return {
    argv: [],
    error: `${PROCESS_WRAPPER_ENV}: ${reason}`,
    platformIgnored: false,
    record: "",
  };
}
//@ chunk-wfxhhysk.js:2907-2925 placement
var SHELL_METACHARS = ";|&$()`<>";
//@ chunk-wfxhhysk.js:2925-4054 placement
/**
 * 解析 CLAUDE_CODE_PROCESS_WRAPPER：JSON 数组或 shell 风格字符串转成 argv。
 */
function parseWrapperArgv(value) {
  let trimmed = value.trim();
  if (trimmed === "") return [];
  if (trimmed.startsWith("[")) {
    let parsed;
    try {
      parsed = jsonParse(trimmed);
    } catch {
      throw Error("value starts with `[` but is not valid JSON");
    }
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === "string"))
      throw Error("JSON form must be an array of strings");
    if (parsed.length > 0 && parsed.some((item) => item === "")) {
      if (parsed.every((item) => item === "")) return [];
      throw Error(
        "the JSON array contains an empty element \u2014 remove it, or fill in the value it was a placeholder for",
      );
    }
    return parsed;
  }
  let tokens = [];
  let current = "";
  let hasToken = false;
  let inQuote = false;
  for (let j = 0; j < trimmed.length; j++) {
    let char = trimmed[j];
    if (inQuote) {
      if (char === "\\" && (trimmed[j + 1] === '"' || trimmed[j + 1] === "\\")) current += trimmed[++j];
      else if (char === '"') inQuote = false;
      else current += char;
      continue;
    }
    if (char === '"') {
      inQuote = true;
      hasToken = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (hasToken) {
        tokens.push(current);
        current = "";
        hasToken = false;
      }
      continue;
    }
    if (SHELL_METACHARS.includes(char))
      throw Error(
        "the value contains an unquoted shell metacharacter (one of ; | & $ ( ) ` < >) \u2014 it is an argv list, not a shell command",
      );
    current += char;
    hasToken = true;
  }
  if (inQuote) throw Error("unterminated double quote");
  if (hasToken) tokens.push(current);
  if (tokens.length > 0 && tokens.some((token) => token === "")) {
    if (tokens.every((token) => token === "")) return [];
    throw Error(
      'the value contains an empty `""` token \u2014 remove it, or fill in the value it was a placeholder for',
    );
  }
  return tokens;
}
export {
  processWrapperError,
  processWrapperRecord,
  isProcessWrapperUsable,
  processWrapperArgv,
  PROCESS_WRAPPER_ENV,
  processWrapperState,
  PROCESS_WRAPPER_TIMEOUT_MS,
  processWrapperProblem,
  absoluteLauncher,
};
