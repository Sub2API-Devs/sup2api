/**
 * selfHostedRunner/git/fetchErrors.ts
 *
 * BYOC git fetch 错误类与安全配置参数（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (30)
 * attribution: placement 30
 */
import { env, antEnv } from "../../utils/env.js";
import { REPOSITORY_PREPARE_CONCURRENCY } from "./repoPrepare.js";
import { redactToken, hoistFatalLines, FATAL_LINE_RE } from "./tokenRedact.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { EXIT_TEMPFAIL } from "../../utils/exitCodes.js";
import { nullDevicePath } from "../../utils/gitSafeExec.js";

//@ chunk-t3sg9e26.js:5396-5442 placement
/**
 * 导出常量或表 `DEFAULT_FETCH_REFSPEC`：值为 "+refs/heads/*:refs/remotes/origin/*"。
 */
var DEFAULT_FETCH_REFSPEC = "+refs/heads/*:refs/remotes/origin/*";
//@ chunk-t3sg9e26.js:5442-5479 placement
/**
 * 导出函数 `getUpstreamUrl`：参数 e，返回 e.upstreamUrl。
 */
function getUpstreamUrl(e) {
  return e.upstreamUrl;
}
//@ chunk-t3sg9e26.js:5479-5569 placement
function fetchDepthArgs(e) {
  if (e) return [];
  let { depth } = resolveFetchDepth();
  return depth === undefined ? [] : ["--depth", String(depth)];
}
//@ chunk-t3sg9e26.js:5569-5824 placement
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
  let n = Number(CLAUDE_RUNNER_FETCH_DEPTH);
  if (Number.isInteger(n) && n > 0)
    return {
      depth: n,
      invalid: undefined,
    };
  return {
    depth: REPOSITORY_PREPARE_CONCURRENCY,
    invalid: CLAUDE_RUNNER_FETCH_DEPTH,
  };
}
//@ chunk-t3sg9e26.js:5824-5869 placement
var MIN_SERVER_PROGRESS_CAP_MS = 120000;
var DEFAULT_SERVER_PROGRESS_CAP_MS = 600000;
var DELTA_COMPLETE_SILENCE_MS = 300000;
var MAX_SERVER_PROGRESS_CAP_MS = 1800000;
//@ chunk-t3sg9e26.js:5869-6252 placement
/**
 * 解析 git fetch 服务端进度上限的环境变量：未设置用默认值，0/off 关闭，合法整数夹在上下限之间，非法值回退默认并记录。
 */
function resolveServerProgressCap() {
  let e = env.CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS;
  if (e === undefined)
    return {
      capMs: DEFAULT_SERVER_PROGRESS_CAP_MS,
      invalid: undefined,
      clamped: undefined,
    };
  if (e === "0" || e.toLowerCase() === "off")
    return {
      capMs: 0,
      invalid: undefined,
      clamped: undefined,
    };
  let n = Number(e);
  if (Number.isInteger(n) && n > 0) {
    let min = Math.min(Math.max(n, MIN_SERVER_PROGRESS_CAP_MS), MAX_SERVER_PROGRESS_CAP_MS);
    return {
      capMs: min,
      invalid: undefined,
      clamped: min === n ? undefined : e,
    };
  }
  return {
    capMs: DEFAULT_SERVER_PROGRESS_CAP_MS,
    invalid: e,
    clamped: undefined,
  };
}
//@ chunk-t3sg9e26.js:6252-6616 placement
/**
 * git 进度解析与输出相关常量：进度日志间隔、进度行与对象枚举正则、单位换算、各类上限与超时，以及不报告进度的子命令。
 */
var PROGRESS_LOG_INTERVAL_MS = 5000;
var GIT_PROGRESS_REGEX =
  /^(Counting objects|Compressing objects|Receiving objects|Resolving deltas|Updating files|Checking out files|Filtering content):\s+(\d+)%(?:\s+\((\d+)\/(\d+)\))?(?:, ([\d.]+) (KiB|MiB|GiB))?/;
var ENUMERATING_OBJECTS_REGEX = /^(Enumerating objects): (\d{1,15})\b/;
var RECEIVING_OBJECTS = "Receiving objects";
var BYTE_UNITS = {
  KiB: 1024,
  MiB: 1048576,
  GiB: 1073741824,
};
var NO_DATA_WARN_MS = 5000;
var STDERR_TAIL_CHARS = 500;
var GIT_WATCHDOG_MS = 600000;
var SKIP_WATCHDOG_SUBCOMMANDS = new Set(["worktree"]);
//@ chunk-t3sg9e26.js:6616-7288 placement
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
    let d = line.startsWith("remote: ");
    if (d) remoteLineCount++;
    let u = d ? line.slice(8) : line;
    let match = GIT_PROGRESS_REGEX.exec(u);
    if (match === null) {
      if (d) {
        let match = ENUMERATING_OBJECTS_REGEX.exec(u);
        if (match !== null) {
          let l = Number(match[2]);
          server = {
            sideband: d,
            label: match[1],
            pct: 0,
            done: l,
            raw: `remote: ${match[1]}: ${l}`,
          };
        }
      }
      continue;
    }
    let [, y, f, R, b, P, v] = match;
    let A = {
      sideband: d,
      label: y,
      pct: Math.min(100, Number(f)),
      done: R !== undefined ? Number(R) : undefined,
      total: b !== undefined ? Number(b) : undefined,
      bytes: P !== undefined && v !== undefined ? Math.round(Number(P) * BYTE_UNITS[v]) : undefined,
      raw: `${d ? "remote: " : ""}${y}: ${f}%${R !== undefined ? ` (${R}/${b})` : ""}`,
    };
    display = A;
    if (d) server = A;
    else client = A;
  }
  return {
    display,
    client,
    server,
    remoteLines: remoteLineCount,
  };
}
//@ chunk-t3sg9e26.js:7288-7300 placement
var REMOTE_ACTIVE_AFTER_MS = 1000;
//@ chunk-t3sg9e26.js:7300-7509 placement
function noteServerProgress(e, gitProgress, t) {
  if (e.active) return;
  if (gitProgress.display?.sideband) {
    e.active = true;
    return;
  }
  if (gitProgress.remoteLines === 0) return;
  if (e.firstRemoteLineAt === undefined) e.firstRemoteLineAt = t;
  else if (t - e.firstRemoteLineAt >= REMOTE_ACTIVE_AFTER_MS) e.active = true;
}
//@ chunk-t3sg9e26.js:7509-7682 placement
function isProgressAdvance(e, client) {
  if (e === undefined) return true;
  if (client.label !== e.label) return true;
  if (client.done !== undefined && e.done !== undefined)
    return client.done > e.done || (client.bytes ?? 0) > (e.bytes ?? 0);
  return client.pct > e.pct;
}
//@ chunk-t3sg9e26.js:7682-7880 placement
function shouldLogProgress(e, n, server) {
  if (e === undefined || server.label !== e.label) return !n.has(server.label);
  if (server.done !== undefined && e.done !== undefined) return server.done > e.done;
  if ((server.done === undefined) !== (e.done === undefined)) return false;
  return server.pct > e.pct;
}
//@ chunk-t3sg9e26.js:7880-7944 placement
function isDeltasComplete(client) {
  return client.label === "Resolving deltas" && client.pct === 100;
}
//@ chunk-t3sg9e26.js:7944-8040 placement
function isGitProgressLine(line) {
  let n = line.startsWith("remote: ");
  let t = n ? line.slice(8) : line;
  return GIT_PROGRESS_REGEX.test(t) || (n && ENUMERATING_OBJECTS_REGEX.test(t));
}
//@ chunk-t3sg9e26.js:8040-8052 placement
var MAX_GIT_OUTPUT_TAIL_CHARS = 2000;
//@ chunk-t3sg9e26.js:8052-8239 placement
function gitStderrSummary(stderr, n, authURL, r) {
  let s = n ? stderr.replace(/^[^\r\n]*[\r\n]?/, "") : stderr;
  let joined = redactToken(s, authURL, r)
    .split(/\r|\n/)
    .filter((line) => line.length > 0 && !isGitProgressLine(line)).join(`
`);
  let a = hoistFatalLines(joined);
  return FATAL_LINE_RE.test(a) ? a.slice(0, MAX_GIT_OUTPUT_TAIL_CHARS) : a.slice(-MAX_GIT_OUTPUT_TAIL_CHARS);
}
//@ chunk-t3sg9e26.js:8239-8312 placement
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
//@ chunk-t3sg9e26.js:8312-8375 placement
function isFailFastFetchEnabled() {
  return Boolean(antEnv.CLAUDE_RUNNER_FAIL_FAST_FETCH);
}
//@ chunk-t3sg9e26.js:8375-8435 placement
function isStallGiveUpEnabled() {
  return Boolean(antEnv.CLAUDE_RUNNER_STALL_GIVEUP);
}
//@ chunk-t3sg9e26.js:8435-8647 placement
function isCurlTimeoutOnly(e) {
  return e
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
//@ chunk-t3sg9e26.js:8647-8696 placement
function isDeltaResetEnabled() {
  return Boolean(antEnv.CCR_DELTA_RESET);
}
//@ chunk-t3sg9e26.js:8696-8732 placement
var REF_NOT_FOUND_PATTERNS = ["couldn't find remote ref"];
//@ chunk-t3sg9e26.js:8732-8805 placement
/**
 * 导出函数 `isFetchRefNotFound`：参数 e，返回 rt.some((t) => lower.includes(t))。
 */
function isFetchRefNotFound(e) {
  let lower = e.toLowerCase();
  return REF_NOT_FOUND_PATTERNS.some((t) => lower.includes(t));
}
//@ chunk-t3sg9e26.js:8805-8864 placement
var regExp = new RegExp(REF_NOT_FOUND_PATTERNS[0].replaceAll("i", "[i\\u0130]"), "gi");
//@ chunk-t3sg9e26.js:8864-8931 placement
/**
 * 导出函数 `rewriteContractionError`：参数 e，返回 e.replace(regExp, (n) => `could not${n.slice(8)}`)。
 */
function rewriteContractionError(e) {
  return e.replace(regExp, (n) => `could not${n.slice(8)}`);
}
//@ chunk-t3sg9e26.js:8931-9105 placement
class FetchRefNotFoundError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(`git fetch failed (permanent): ${e}`, "git fetch failed (permanent): ref not found on the remote");
    this.name = "FetchRefNotFoundError";
  }
}
//@ chunk-t3sg9e26.js:9105-9295 placement
/**
 * git fetch 被拒原因的说明文案（git 包装器以 75 退出、HTTP 429）及 429 错误行正则。
 */
var FETCH_REFUSAL_REASONS = {
  refused_by_git_wrapper: "a wrapper installed as git exited with 75",
  http_429: "the host answered HTTP 429",
};
var HTTP_429_LINE_REGEX = /^fatal: unable to access '.*': the requested url returned error: 429$/;
//@ chunk-t3sg9e26.js:9295-9662 placement
/**
 * 判断 git fetch 失败是否属于被拒：包装器退出码，或 HTTP(S) 远程的错误输出全部是 429 行。
 */
function classifyFetchRefusal(e, n, gitURL) {
  if (/^git \S+ failed \(watchdog:/.test(e)) return;
  if (n === EXIT_TEMPFAIL) return "refused_by_git_wrapper";
  if (!/^https?:/i.test(gitURL)) return;
  let replaced = e.replace(/^git \S+ failed: /, "");
  if (replaced.length >= MAX_GIT_OUTPUT_TAIL_CHARS) return;
  let filtered = replaced
    .toLowerCase()
    .split(/\r|\n/)
    .map((line) => line.trim())
    .filter((o) => o !== "" && !o.startsWith("remote:"));
  return filtered.length > 0 && filtered.every((o) => HTTP_429_LINE_REGEX.test(o)) ? "http_429" : undefined;
}
//@ chunk-t3sg9e26.js:9662-9816 placement
class FetchThrottledError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  throttle;
  constructor(e, throttle) {
    super(e, "git fetch failed: throttled on its last attempt");
    this.name = "FetchThrottledError";
    this.throttle = throttle;
  }
}
//@ chunk-t3sg9e26.js:9816-10294 placement
/**
 * 安全 git 环境与参数：禁 hook、禁 fsmonitor、禁 askPass、关自动 gc 的 -c 参数，安全环境变量（含 GIT_ALLOW_PROTOCOL）以及完全锁定协议的子进程环境。
 */
var SAFE_GIT_CONFIG_ARGS = [
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
var SAFE_GIT_ENV = {
  SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
  SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
  GIT_ALLOW_PROTOCOL: "https:http:ssh",
};
var LOCKED_GIT_ENV = {
  GIT_NO_LAZY_FETCH: "1",
  GIT_ALLOW_PROTOCOL: "none",
  GIT_SSH_COMMAND: "false",
  GIT_NO_REPLACE_OBJECTS: "1",
  GIT_TERMINAL_PROMPT: "0",
  CLAUDE_CODE_SESSION_ACCESS_TOKEN: undefined,
};
var SAFE_GIT_EXTRA_ARGS = ["-c", "alias.remote-none=", "-c", "fetch.bundleURI="];
export {
  SAFE_GIT_CONFIG_ARGS,
  getUpstreamUrl,
  FetchRefNotFoundError,
  isFetchRefNotFound,
  FetchThrottledError,
  FETCH_REFUSAL_REASONS,
  rewriteContractionError,
  DEFAULT_FETCH_REFSPEC,
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
