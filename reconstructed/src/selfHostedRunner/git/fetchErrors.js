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
import { me } from "./repoPrepare.js";
import { redactToken, hoistFatalLines, gt } from "./tokenRedact.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { the } from "../../utils/exitCodes.js";
import { rDn } from "../../utils/gitSafeExec.js";

//@ chunk-t3sg9e26.js:5396-5442 placement
var LVn = "+refs/heads/*:refs/remotes/origin/*";
//@ chunk-t3sg9e26.js:5442-5479 placement
function H0r(e) {
  return e.upstreamUrl;
}
//@ chunk-t3sg9e26.js:5479-5569 placement
function Je(e) {
  if (e) return [];
  let { depth: depth } = resolveFetchDepth();
  return depth === void 0 ? [] : ["--depth", String(depth)];
}
//@ chunk-t3sg9e26.js:5569-5824 placement
function resolveFetchDepth() {
  let CLAUDE_RUNNER_FETCH_DEPTH = env.CLAUDE_RUNNER_FETCH_DEPTH;
  if (CLAUDE_RUNNER_FETCH_DEPTH === void 0) return { depth: me, invalid: void 0 };
  if (CLAUDE_RUNNER_FETCH_DEPTH === "full" || CLAUDE_RUNNER_FETCH_DEPTH === "0")
    return { depth: void 0, invalid: void 0 };
  let n = Number(CLAUDE_RUNNER_FETCH_DEPTH);
  if (Number.isInteger(n) && n > 0) return { depth: n, invalid: void 0 };
  return { depth: me, invalid: CLAUDE_RUNNER_FETCH_DEPTH };
}
//@ chunk-t3sg9e26.js:5824-5869 placement
var qe = 120000,
  Oe = 600000,
  Be = 300000,
  se = 1800000;
/**
 * 解析 git fetch 服务端进度上限的环境变量：未设置用默认值，0/off 关闭，合法整数夹在上下限之间，非法值回退默认并记录。
 */
//@ chunk-t3sg9e26.js:5869-6252 placement
function resolveServerProgressCap() {
  let e = env.CLAUDE_RUNNER_FETCH_SERVER_PROGRESS_CAP_MS;
  if (e === void 0) return { capMs: Oe, invalid: void 0, clamped: void 0 };
  if (e === "0" || e.toLowerCase() === "off") return { capMs: 0, invalid: void 0, clamped: void 0 };
  let n = Number(e);
  if (Number.isInteger(n) && n > 0) {
    let min = Math.min(Math.max(n, qe), se);
    return { capMs: min, invalid: void 0, clamped: min === n ? void 0 : e };
  }
  return { capMs: Oe, invalid: e, clamped: void 0 };
}
/**
 * git 进度解析与输出相关常量：进度日志间隔、进度行与对象枚举正则、单位换算、各类上限与超时，以及不报告进度的子命令。
 */
//@ chunk-t3sg9e26.js:6252-6616 placement
var PROGRESS_LOG_INTERVAL_MS = 5000,
  GIT_PROGRESS_REGEX =
    /^(Counting objects|Compressing objects|Receiving objects|Resolving deltas|Updating files|Checking out files|Filtering content):\s+(\d+)%(?:\s+\((\d+)\/(\d+)\))?(?:, ([\d.]+) (KiB|MiB|GiB))?/,
  ENUMERATING_OBJECTS_REGEX = /^(Enumerating objects): (\d{1,15})\b/,
  RECEIVING_OBJECTS = "Receiving objects",
  BYTE_UNITS = { KiB: 1024, MiB: 1048576, GiB: 1073741824 },
  NO_DATA_WARN_MS = 5000,
  STDERR_TAIL_CHARS = 500,
  GIT_WATCHDOG_MS = 600000,
  SKIP_WATCHDOG_SUBCOMMANDS = new Set(["worktree"]);
/**
 * 解析 git 进度输出：识别各阶段百分比、对象数、已接收字节（含 remote: 前缀的服务端进度），分别给出最新的显示行、本地进度与服务端进度。
 */
//@ chunk-t3sg9e26.js:6616-7288 placement
function parseGitProgress(chunk, skipFirstLine = !1) {
  let display,
    client,
    server,
    remoteLineCount = 0,
    parts = chunk.split(/\r|\n/);
  if (skipFirstLine) parts = parts.slice(1);
  for (let c of parts) {
    if (c.length === 0) continue;
    let startsWith = c.startsWith("remote: ");
    if (startsWith) remoteLineCount++;
    let u = startsWith ? c.slice(8) : c,
      match = GIT_PROGRESS_REGEX.exec(u);
    if (match === null) {
      if (startsWith) {
        let match = ENUMERATING_OBJECTS_REGEX.exec(u);
        if (match !== null) {
          let l = Number(match[2]);
          server = {
            sideband: startsWith,
            label: match[1],
            pct: 0,
            done: l,
            raw: `remote: ${match[1]}: ${l}`,
          };
        }
      }
      continue;
    }
    let [, y, f, R, b, P, v] = match,
      A = {
        sideband: startsWith,
        label: y,
        pct: Math.min(100, Number(f)),
        done: R !== void 0 ? Number(R) : void 0,
        total: b !== void 0 ? Number(b) : void 0,
        bytes: P !== void 0 && v !== void 0 ? Math.round(Number(P) * BYTE_UNITS[v]) : void 0,
        raw: `${startsWith ? "remote: " : ""}${y}: ${f}%${R !== void 0 ? ` (${R}/${b})` : ""}`,
      };
    if (((display = A), startsWith)) server = A;
    else client = A;
  }
  return { display: display, client: client, server: server, remoteLines: remoteLineCount };
}
//@ chunk-t3sg9e26.js:7288-7300 placement
var kt = 1000;
//@ chunk-t3sg9e26.js:7300-7509 placement
function noteServerProgress(e, n, t) {
  if (e.active) return;
  if (n.display?.sideband) {
    e.active = !0;
    return;
  }
  if (n.remoteLines === 0) return;
  if (e.firstRemoteLineAt === void 0) e.firstRemoteLineAt = t;
  else if (t - e.firstRemoteLineAt >= kt) e.active = !0;
}
//@ chunk-t3sg9e26.js:7509-7682 placement
function isProgressAdvance(e, n) {
  if (e === void 0) return !0;
  if (n.label !== e.label) return !0;
  if (n.done !== void 0 && e.done !== void 0) return n.done > e.done || (n.bytes ?? 0) > (e.bytes ?? 0);
  return n.pct > e.pct;
}
//@ chunk-t3sg9e26.js:7682-7880 placement
function shouldLogProgress(e, n, t) {
  if (e === void 0 || t.label !== e.label) return !n.has(t.label);
  if (t.done !== void 0 && e.done !== void 0) return t.done > e.done;
  if ((t.done === void 0) !== (e.done === void 0)) return !1;
  return t.pct > e.pct;
}
//@ chunk-t3sg9e26.js:7880-7944 placement
function Nt(e) {
  return e.label === "Resolving deltas" && e.pct === 100;
}
//@ chunk-t3sg9e26.js:7944-8040 placement
function Ft(e) {
  let startsWith = e.startsWith("remote: "),
    t = startsWith ? e.slice(8) : e;
  return GIT_PROGRESS_REGEX.test(t) || (startsWith && ENUMERATING_OBJECTS_REGEX.test(t));
}
//@ chunk-t3sg9e26.js:8040-8052 placement
var ae = 2000;
//@ chunk-t3sg9e26.js:8052-8239 placement
function gitStderrSummary(e, n, t, r) {
  let s = n ? e.replace(/^[^\r\n]*[\r\n]?/, "") : e,
    joined = redactToken(s, t, r)
      .split(/\r|\n/)
      .filter((c) => c.length > 0 && !Ft(c)).join(`
`),
    a = hoistFatalLines(joined);
  return gt.test(a) ? a.slice(0, ae) : a.slice(-ae);
}
//@ chunk-t3sg9e26.js:8239-8312 placement
var de = 1e4,
  Mt = 30000,
  $e = 3,
  Ht = 6,
  ie = 5,
  xe = 300,
  We = 150,
  tt = 2,
  oe = 3,
  Vt = 1000,
  Bt = 15;
//@ chunk-t3sg9e26.js:8312-8375 placement
function nt() {
  return Boolean(antEnv.CLAUDE_RUNNER_FAIL_FAST_FETCH);
}
//@ chunk-t3sg9e26.js:8375-8435 placement
function xt() {
  return Boolean(antEnv.CLAUDE_RUNNER_STALL_GIVEUP);
}
//@ chunk-t3sg9e26.js:8435-8647 placement
function isCurlTimeoutOnly(e) {
  return e
    .split(
      `
`,
    )
    .some((n) => {
      let index = n.indexOf("Operation too slow");
      if (index === -1) return !1;
      let sliced = n.slice(0, index);
      return !/\bremote(?: error)?: /.test(sliced) && /curl 28\b|unable to access '[^']*': $/.test(sliced);
    });
}
//@ chunk-t3sg9e26.js:8647-8696 placement
function Yt() {
  return Boolean(antEnv.CCR_DELTA_RESET);
}
//@ chunk-t3sg9e26.js:8696-8732 placement
var rt = ["couldn't find remote ref"];
//@ chunk-t3sg9e26.js:8732-8805 placement
function NVn(e) {
  let lower = e.toLowerCase();
  return rt.some((t) => lower.includes(t));
}
//@ chunk-t3sg9e26.js:8805-8864 placement
var regExp = new RegExp(rt[0].replaceAll("i", "[i\\u0130]"), "gi");
//@ chunk-t3sg9e26.js:8864-8931 placement
function Mln(e) {
  return e.replace(regExp, (n) => `could not${n.slice(8)}`);
}
//@ chunk-t3sg9e26.js:8931-9105 placement
class FetchRefNotFoundError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  constructor(e) {
    super(`git fetch failed (permanent): ${e}`, "git fetch failed (permanent): ref not found on the remote");
    this.name = "FetchRefNotFoundError";
  }
}
/**
 * git fetch 被拒原因的说明文案（git 包装器以 75 退出、HTTP 429）及 429 错误行正则。
 */
//@ chunk-t3sg9e26.js:9105-9295 placement
var FETCH_REFUSAL_REASONS = {
    refused_by_git_wrapper: "a wrapper installed as git exited with 75",
    http_429: "the host answered HTTP 429",
  },
  HTTP_429_LINE_REGEX = /^fatal: unable to access '.*': the requested url returned error: 429$/;
/**
 * 判断 git fetch 失败是否属于被拒：包装器退出码，或 HTTP(S) 远程的错误输出全部是 429 行。
 */
//@ chunk-t3sg9e26.js:9295-9662 placement
function classifyFetchRefusal(e, n, t) {
  if (/^git \S+ failed \(watchdog:/.test(e)) return;
  if (n === the) return "refused_by_git_wrapper";
  if (!/^https?:/i.test(t)) return;
  let replaced = e.replace(/^git \S+ failed: /, "");
  if (replaced.length >= ae) return;
  let filtered = replaced
    .toLowerCase()
    .split(/\r|\n/)
    .map((o) => o.trim())
    .filter((o) => o !== "" && !o.startsWith("remote:"));
  return filtered.length > 0 && filtered.every((o) => HTTP_429_LINE_REGEX.test(o)) ? "http_429" : void 0;
}
//@ chunk-t3sg9e26.js:9662-9816 placement
class FetchThrottledError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  throttle;
  constructor(e, n) {
    super(e, "git fetch failed: throttled on its last attempt");
    ((this.name = "FetchThrottledError"), (this.throttle = n));
  }
}
//@ chunk-t3sg9e26.js:9816-10294 placement
var SAFE_GIT_CONFIG_ARGS = [
    "-c",
    `core.hooksPath=${rDn()}`,
    "-c",
    "core.fsmonitor=",
    "-c",
    "core.askPass=",
    "-c",
    "gc.auto=0",
    "-c",
    "maintenance.auto=false",
  ],
  mHe = {
    SELF_HOSTED_RUNNER_POOL_SECRET: void 0,
    SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: void 0,
    GIT_ALLOW_PROTOCOL: "https:http:ssh",
  },
  V = {
    GIT_NO_LAZY_FETCH: "1",
    GIT_ALLOW_PROTOCOL: "none",
    GIT_SSH_COMMAND: "false",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
    CLAUDE_CODE_SESSION_ACCESS_TOKEN: void 0,
  },
  Kt = ["-c", "alias.remote-none=", "-c", "fetch.bundleURI="];

export {
  SAFE_GIT_CONFIG_ARGS,
  H0r,
  FetchRefNotFoundError,
  NVn,
  FetchThrottledError,
  FETCH_REFUSAL_REASONS,
  Mln,
  LVn,
  mHe,
  GIT_WATCHDOG_MS,
  resolveFetchDepth,
  resolveServerProgressCap,
  Oe,
  se,
  ae,
  $e,
  classifyFetchRefusal,
  Ht,
  de,
  Je,
  Yt,
  V,
  nt,
  Mt,
  tt,
  Vt,
  Bt,
  xt,
  xe,
  We,
  ie,
  oe,
  isCurlTimeoutOnly,
  Kt,
  SKIP_WATCHDOG_SUBCOMMANDS,
  qe,
  PROGRESS_LOG_INTERVAL_MS,
  parseGitProgress,
  noteServerProgress,
  Be,
  Nt,
  isProgressAdvance,
  RECEIVING_OBJECTS,
  shouldLogProgress,
  STDERR_TAIL_CHARS,
  NO_DATA_WARN_MS,
  gitStderrSummary,
};
