/**
 * selfHostedRunner/git/fetchErrors.ts
 *
 * BYOC git fetch 错误类与安全配置参数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rzkdv0c6.js (30)
 * attribution: placement 30
 */
import { env, antEnv } from "../../utils/env.js";
import { REPOSITORY_PREPARE_CONCURRENCY } from "./repoPrepare.js";
import { redactToken, hoistFatalLines, FATAL_LINE_RE } from "./tokenRedact.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { EXIT_TEMPFAIL } from "../../utils/exitCodes.js";
import { nullDevicePath } from "../../utils/gitSafeExec.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rzkdv0c6.js:5395-5441 placement
/**
 * 导出常量或表 `DEFAULT_FETCH_REFSPEC`：值为 "+refs/heads/*:refs/remotes/origin/*"。
 */
var DEFAULT_FETCH_REFSPEC = "+refs/heads/*:refs/remotes/origin/*";
//@ chunk-rzkdv0c6.js:5441-5478 placement
/**
 * 导出函数 `getUpstreamUrl`：参数 e，返回 e.upstreamUrl。
 */
function getUpstreamUrl(config) {
  return config.upstreamUrl;
}
//@ chunk-rzkdv0c6.js:5478-5568 placement
function fetchDepthArgs(full) {
  if (full) return [];
  let { depth } = resolveFetchDepth();
  return depth === undefined ? [] : ["--depth", String(depth)];
}
//@ chunk-rzkdv0c6.js:5568-5823 placement
function resolveFetchDepth() {
  let CLAUDE_RUNNER_FETCH_DEPTH = env.CLAUDE_RUNNER_FETCH_DEPTH;
  if (CLAUDE_RUNNER_FETCH_DEPTH === undefined)
    return {
      depth: REPOSITORY_PREPARE_CONCURRENCY,
      invalid: undefined,
    };
  if (CLAUDE_RUNNER_FETCH_DEPTH === "full" || CLAUDE_RUNNER_FETCH_DEPTH === "0")
    return {
      depth: undefined,
      invalid: undefined,
    };
  let parsed = Number(CLAUDE_RUNNER_FETCH_DEPTH);
  if (Number.isInteger(parsed) && parsed > 0)
    return {
      depth: parsed,
      invalid: undefined,
    };
  return {
    depth: REPOSITORY_PREPARE_CONCURRENCY,
    invalid: CLAUDE_RUNNER_FETCH_DEPTH,
  };
}
//@ chunk-rzkdv0c6.js:5823-5868 placement
var MIN_SERVER_PROGRESS_CAP_MS = 120000;
var DEFAULT_SERVER_PROGRESS_CAP_MS = 600000;
var DELTA_COMPLETE_SILENCE_MS = 300000;
var MAX_SERVER_PROGRESS_CAP_MS = 1800000;
//@ chunk-rzkdv0c6.js:5868-6251 placement
/**
 * 解析 git fetch 服务端进度上限的环境变量：未设置用默认值，0/off 关闭，合法整数夹在上下限之间，非法值回退默认并记录。
 */
function resolveServerProgressCap() {
  let raw = env.CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS;
  if (raw === undefined)
    return {
      capMs: DEFAULT_SERVER_PROGRESS_CAP_MS,
      invalid: undefined,
      clamped: undefined,
    };
  if (raw === "0" || raw.toLowerCase() === "off")
    return {
      capMs: 0,
      invalid: undefined,
      clamped: undefined,
    };
  let parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed > 0) {
    let min = Math.min(Math.max(parsed, MIN_SERVER_PROGRESS_CAP_MS), MAX_SERVER_PROGRESS_CAP_MS);
    return {
      capMs: min,
      invalid: undefined,
      clamped: min === parsed ? undefined : raw,
    };
  }
  return {
    capMs: DEFAULT_SERVER_PROGRESS_CAP_MS,
    invalid: raw,
    clamped: undefined,
  };
}
//@ chunk-rzkdv0c6.js:6251-6615 placement
/**
 * git 进度解析与输出相关常量：进度日志间隔、进度行与对象枚举正则、单位换算、各类上限与超时，以及不报告进度的子命令。
 */
var PROGRESS_LOG_INTERVAL_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_PROGRESS_REGEX;
var ENUMERATING_OBJECTS_REGEX;
var RECEIVING_OBJECTS;
var BYTE_UNITS;
var NO_DATA_WARN_MS;
var STDERR_TAIL_CHARS;
var GIT_WATCHDOG_MS;
var SKIP_WATCHDOG_SUBCOMMANDS;
deferInit("chunk-rzkdv0c6.js:6251", () => {
  PROGRESS_LOG_INTERVAL_MS = 5000;
  GIT_PROGRESS_REGEX =
    /^(Counting objects|Compressing objects|Receiving objects|Resolving deltas|Updating files|Checking out files|Filtering content):\s+(\d+)%(?:\s+\((\d+)\/(\d+)\))?(?:, ([\d.]+) (KiB|MiB|GiB))?/;
  ENUMERATING_OBJECTS_REGEX = /^(Enumerating objects): (\d{1,15})\b/;
  RECEIVING_OBJECTS = "Receiving objects";
  BYTE_UNITS = {
    KiB: 1024,
    MiB: 1048576,
    GiB: 1073741824,
  };
  NO_DATA_WARN_MS = 5000;
  STDERR_TAIL_CHARS = 500;
  GIT_WATCHDOG_MS = 600000;
  SKIP_WATCHDOG_SUBCOMMANDS = new Set(["worktree"]);
});
//@ chunk-rzkdv0c6.js:6615-7287 placement
/**
 * 解析 git 进度输出：识别各阶段百分比、对象数、已接收字节（含 remote: 前缀的服务端进度），分别给出最新的显示行、本地进度与服务端进度。
 */
function parseGitProgress(chunk, skipFirstLine = false) {
  let display;
  let client;
  let server;
  let remoteLineCount = 0;
  let lines = chunk.split(/\r|\n/);
  if (skipFirstLine) lines = lines.slice(1);
  for (let line of lines) {
    if (line.length === 0) continue;
    let remoteLine = line.startsWith("remote: ");
    if (remoteLine) remoteLineCount++;
    let payload = remoteLine ? line.slice(8) : line;
    let match = GIT_PROGRESS_REGEX.exec(payload);
    if (match === null) {
      if (remoteLine) {
        let match = ENUMERATING_OBJECTS_REGEX.exec(payload);
        if (match !== null) {
          let doneCount = Number(match[2]);
          server = {
            sideband: remoteLine,
            label: match[1],
            pct: 0,
            done: doneCount,
            raw: `remote: ${match[1]}: ${doneCount}`,
          };
        }
      }
      continue;
    }
    let [, label, pct, done, total, sizeValue, sizeUnit] = match;
    let progress = {
      sideband: remoteLine,
      label,
      pct: Math.min(100, Number(pct)),
      done: done !== undefined ? Number(done) : undefined,
      total: total !== undefined ? Number(total) : undefined,
      bytes:
        sizeValue !== undefined && sizeUnit !== undefined
          ? Math.round(Number(sizeValue) * BYTE_UNITS[sizeUnit])
          : undefined,
      raw: `${remoteLine ? "remote: " : ""}${label}: ${pct}%${done !== undefined ? ` (${done}/${total})` : ""}`,
    };
    display = progress;
    if (remoteLine) server = progress;
    else client = progress;
  }
  return {
    display,
    client,
    server,
    remoteLines: remoteLineCount,
  };
}
//@ chunk-rzkdv0c6.js:7287-7299 placement
var REMOTE_ACTIVE_AFTER_MS = 1000;
//@ chunk-rzkdv0c6.js:7299-7508 placement
function noteServerProgress(state, gitProgress, now) {
  if (state.active) return;
  if (gitProgress.display?.sideband) {
    state.active = true;
    return;
  }
  if (gitProgress.remoteLines === 0) return;
  if (state.firstRemoteLineAt === undefined) state.firstRemoteLineAt = now;
  else if (now - state.firstRemoteLineAt >= REMOTE_ACTIVE_AFTER_MS) state.active = true;
}
//@ chunk-rzkdv0c6.js:7508-7681 placement
function isProgressAdvance(previous, client) {
  if (previous === undefined) return true;
  if (client.label !== previous.label) return true;
  if (client.done !== undefined && previous.done !== undefined)
    return client.done > previous.done || (client.bytes ?? 0) > (previous.bytes ?? 0);
  return client.pct > previous.pct;
}
//@ chunk-rzkdv0c6.js:7681-7879 placement
function shouldLogProgress(previous, logged, server) {
  if (previous === undefined || server.label !== previous.label) return !logged.has(server.label);
  if (server.done !== undefined && previous.done !== undefined) return server.done > previous.done;
  if ((server.done === undefined) !== (previous.done === undefined)) return false;
  return server.pct > previous.pct;
}
//@ chunk-rzkdv0c6.js:7879-7943 placement
function isDeltasComplete(client) {
  return client.label === "Resolving deltas" && client.pct === 100;
}
//@ chunk-rzkdv0c6.js:7943-8039 placement
function isGitProgressLine(line) {
  let remote = line.startsWith("remote: ");
  let body = remote ? line.slice(8) : line;
  return GIT_PROGRESS_REGEX.test(body) || (remote && ENUMERATING_OBJECTS_REGEX.test(body));
}
//@ chunk-rzkdv0c6.js:8039-8051 placement
var MAX_GIT_OUTPUT_TAIL_CHARS = 2000;
//@ chunk-rzkdv0c6.js:8051-8238 placement
function gitStderrSummary(stderr, skipFirst, authURL, authUrl) {
  let trimmed = skipFirst ? stderr.replace(/^[^\r\n]*[\r\n]?/, "") : stderr;
  let text = redactToken(trimmed, authURL, authUrl)
    .split(/\r|\n/)
    .filter((line) => line.length > 0 && !isGitProgressLine(line)).join(`
`);
  let summary = hoistFatalLines(text);
  return FATAL_LINE_RE.test(summary)
    ? summary.slice(0, MAX_GIT_OUTPUT_TAIL_CHARS)
    : summary.slice(-MAX_GIT_OUTPUT_TAIL_CHARS);
}
//@ chunk-rzkdv0c6.js:8238-8311 placement
var FILESYSTEM_OP_TIMEOUT_MS = 1e4;
var READ_TREE_TIMEOUT_MS = 30000;
var VALIDATION_MAX_ATTEMPTS = 3;
var THROTTLE_BACKOFF_MULTIPLIER = 6;
var FETCH_MAX_ATTEMPTS = 5;
var MAX_ERROR_TEXT_CHARS = 300;
var ERROR_TEXT_HEAD_CHARS = 150;
var SLOW_FETCH_CONFIG_AFTER_ATTEMPT = 2;
var MUTE_GIVEUP_ATTEMPTS = 3;
var HTTP_LOW_SPEED_LIMIT_BPS = 1000;
var HTTP_LOW_SPEED_TIME_S = 15;
//@ chunk-rzkdv0c6.js:8311-8374 placement
function isFailFastFetchEnabled() {
  return Boolean(antEnv.CLAUDE_RUNNER_FAIL_FAST_FETCH);
}
//@ chunk-rzkdv0c6.js:8374-8434 placement
function isStallGiveUpEnabled() {
  return Boolean(antEnv.CLAUDE_RUNNER_STALL_GIVEUP);
}
//@ chunk-rzkdv0c6.js:8434-8646 placement
function isCurlTimeoutOnly(text) {
  return text
    .split(
      `
`,
    )
    .some((line) => {
      let index = line.indexOf("Operation too slow");
      if (index === -1) return false;
      let sliced = line.slice(0, index);
      return !/\bremote(?: error)?: /.test(sliced) && /curl 28\b|unable to access '[^']*': $/.test(sliced);
    });
}
//@ chunk-rzkdv0c6.js:8646-8695 placement
function isDeltaResetEnabled() {
  return Boolean(antEnv.CCR_DELTA_RESET);
}
//@ chunk-rzkdv0c6.js:8695-8731 placement
var REF_NOT_FOUND_PATTERNS = ["couldn't find remote ref"];
//@ chunk-rzkdv0c6.js:8731-8804 placement
/**
 * 导出函数 `isFetchRefNotFound`：参数 e，返回 rt.some((t) => lower.includes(t))。
 */
function isFetchRefNotFound(text) {
  let lower = text.toLowerCase();
  return REF_NOT_FOUND_PATTERNS.some((pattern) => lower.includes(pattern));
}
//@ chunk-rzkdv0c6.js:8804-8863 placement
var regExp; // deferred: uses REF_NOT_FOUND_PATTERNS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rzkdv0c6.js:8804", () => {
  regExp = new RegExp(REF_NOT_FOUND_PATTERNS[0].replaceAll("i", "[i\\u0130]"), "gi");
});
//@ chunk-rzkdv0c6.js:8863-8930 placement
/**
 * 导出函数 `rewriteContractionError`：参数 e，返回 e.replace(regExp, (n) => `could not${n.slice(8)}`)。
 */
function rewriteContractionError(text) {
  return text.replace(regExp, (verb) => `could not${verb.slice(8)}`);
}
//@ chunk-rzkdv0c6.js:8930-9104 placement
let FetchRefNotFoundError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rzkdv0c6.js:8930", () => {
  FetchRefNotFoundError = class FetchRefNotFoundError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    constructor(detail) {
      super(
        `git fetch failed (permanent): ${detail}`,
        "git fetch failed (permanent): ref not found on the remote",
      );
      this.name = "FetchRefNotFoundError";
    }
  };
});
//@ chunk-rzkdv0c6.js:9104-9294 placement
/**
 * git fetch 被拒原因的说明文案（git 包装器以 75 退出、HTTP 429）及 429 错误行正则。
 */
var FETCH_REFUSAL_REASONS = {
  refused_by_git_wrapper: "a wrapper installed as git exited with 75",
  http_429: "the host answered HTTP 429",
};
var HTTP_429_LINE_REGEX = /^fatal: unable to access '.*': the requested url returned error: 429$/;
//@ chunk-rzkdv0c6.js:9294-9661 placement
/**
 * 判断 git fetch 失败是否属于被拒：包装器退出码，或 HTTP(S) 远程的错误输出全部是 429 行。
 */
function classifyFetchRefusal(text, exitCode, gitURL) {
  if (/^git \S+ failed \(watchdog:/.test(text)) return;
  if (exitCode === EXIT_TEMPFAIL) return "refused_by_git_wrapper";
  if (!/^https?:/i.test(gitURL)) return;
  let replaced = text.replace(/^git \S+ failed: /, "");
  if (replaced.length >= MAX_GIT_OUTPUT_TAIL_CHARS) return;
  let filtered = replaced
    .toLowerCase()
    .split(/\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("remote:"));
  return filtered.length > 0 && filtered.every((line) => HTTP_429_LINE_REGEX.test(line))
    ? "http_429"
    : undefined;
}
//@ chunk-rzkdv0c6.js:9661-9815 placement
let FetchThrottledError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rzkdv0c6.js:9661", () => {
  FetchThrottledError = class FetchThrottledError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    throttle;
    constructor(detail, throttle) {
      super(detail, "git fetch failed: throttled on its last attempt");
      this.name = "FetchThrottledError";
      this.throttle = throttle;
    }
  };
});
//@ chunk-rzkdv0c6.js:9815-10293 placement
/**
 * 安全 git 环境与参数：禁 hook、禁 fsmonitor、禁 askPass、关自动 gc 的 -c 参数，安全环境变量（含 GIT_ALLOW_PROTOCOL）以及完全锁定协议的子进程环境。
 */
var SAFE_GIT_CONFIG_ARGS; // deferred: uses nullDevicePath (../../utils/gitSafeExec.js) of its import cycle while loading; runs once the cycle is complete
var SAFE_GIT_ENV;
var LOCKED_GIT_ENV;
var SAFE_GIT_EXTRA_ARGS;
deferInit("chunk-rzkdv0c6.js:9815", () => {
  SAFE_GIT_CONFIG_ARGS = [
    "-c",
    `core.hooksPath=${nullDevicePath()}`,
    "-c",
    "core.fsmonitor=",
    "-c",
    "core.askPass=",
    "-c",
    "gc.auto=0",
    "-c",
    "maintenance.auto=false",
  ];
  SAFE_GIT_ENV = {
    SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
    SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
    GIT_ALLOW_PROTOCOL: "https:http:ssh",
  };
  LOCKED_GIT_ENV = {
    GIT_NO_LAZY_FETCH: "1",
    GIT_ALLOW_PROTOCOL: "none",
    GIT_SSH_COMMAND: "false",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
  };
  SAFE_GIT_EXTRA_ARGS = ["-c", "alias.remote-none=", "-c", "fetch.bundleURI="];
});
export {
  getUpstreamUrl,
  FetchRefNotFoundError,
  isFetchRefNotFound,
  FetchThrottledError,
  FETCH_REFUSAL_REASONS,
  rewriteContractionError,
  DEFAULT_FETCH_REFSPEC,
  SAFE_GIT_CONFIG_ARGS,
  SAFE_GIT_ENV,
  GIT_WATCHDOG_MS,
  resolveFetchDepth,
  resolveServerProgressCap,
  DEFAULT_SERVER_PROGRESS_CAP_MS,
  MAX_SERVER_PROGRESS_CAP_MS,
  MAX_GIT_OUTPUT_TAIL_CHARS,
  VALIDATION_MAX_ATTEMPTS,
  classifyFetchRefusal,
  THROTTLE_BACKOFF_MULTIPLIER,
  FILESYSTEM_OP_TIMEOUT_MS,
  fetchDepthArgs,
  isDeltaResetEnabled,
  LOCKED_GIT_ENV,
  isFailFastFetchEnabled,
  READ_TREE_TIMEOUT_MS,
  SLOW_FETCH_CONFIG_AFTER_ATTEMPT,
  HTTP_LOW_SPEED_LIMIT_BPS,
  HTTP_LOW_SPEED_TIME_S,
  isStallGiveUpEnabled,
  MAX_ERROR_TEXT_CHARS,
  ERROR_TEXT_HEAD_CHARS,
  FETCH_MAX_ATTEMPTS,
  MUTE_GIVEUP_ATTEMPTS,
  isCurlTimeoutOnly,
  SAFE_GIT_EXTRA_ARGS,
  SKIP_WATCHDOG_SUBCOMMANDS,
  MIN_SERVER_PROGRESS_CAP_MS,
  PROGRESS_LOG_INTERVAL_MS,
  parseGitProgress,
  noteServerProgress,
  DELTA_COMPLETE_SILENCE_MS,
  isDeltasComplete,
  isProgressAdvance,
  RECEIVING_OBJECTS,
  shouldLogProgress,
  STDERR_TAIL_CHARS,
  NO_DATA_WARN_MS,
  gitStderrSummary,
};
