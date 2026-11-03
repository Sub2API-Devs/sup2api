/**
 * services/selfHostedRunner/sessionLaunch.ts
 *
 * 2.1.316 新增：自托管 runner 启动会话进程的辅助：系统提示词文件投递、启动失败分类、会话 JWT 字段读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hm0ce8vc.js (33)
 * attribution: placement 33
 */
import { join, join as join_2, join as join_3, join as join_4, join as join_5, join as join_6 } from "path";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { wrn } from "./childArgs.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { writeSessionFileAtomically } from "./hostConfigSnapshot.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedErrCodeForTelemetry,
  getErrnoCode,
  sanitizeErrnoForTelemetry,
} from "../../utils/errors.js";
import { RepositoryAccessError } from "../../selfHostedRunner/git/repoPrepare.js";
import { jMt } from "../../utils/git/githubUrl.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { decodeJwtExpiry, decodeJwtPayload, createTokenRefreshScheduler } from "../../bridge/jwtUtils.js";
import { formatDuration } from "../../utils/format.js";
import { sleep } from "../../utils/sleep.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";

//@ chunk-hm0ce8vc.js:59108-59119 placement
var fd = 1e4;
/**
 * --system-prompt / --append-system-prompt 等参数与对应投递文件名表。
 */
//@ chunk-hm0ce8vc.js:59148-59430 placement
var MAX_INLINE_PROMPT_BYTES = 131072,
  Ql = 1e4,
  APPEND_SUBAGENT_SYSTEM_PROMPT = "append-subagent-system-prompt",
  hd = [
    { key: "system-prompt", fileName: "remote-system-prompt.txt" },
    { key: "append-system-prompt", fileName: "remote-append-system-prompt.txt" },
    {
      key: APPEND_SUBAGENT_SYSTEM_PROMPT,
      fileName: "remote-append-subagent-system-prompt.txt",
      pinnedChildMayLackFileFlag: !0,
    },
  ];
//@ chunk-hm0ce8vc.js:59430-59515 placement
function pd(e, n) {
  let r = { ...e };
  for (let { key: key } of hd) if (key !== APPEND_SUBAGENT_SYSTEM_PROMPT || !n) delete r[key];
  return r;
}
/**
 * 把服务器下发的系统提示词写入会话目录并改用 *-file 参数传递。
 */
//@ chunk-hm0ce8vc.js:59515-60292 placement
async function writeSystemPromptFile(e) {
  let {
      args: args,
      claudeCodeArgs: claudeCodeArgs,
      configDir: configDir,
      stagedPaths: stagedPaths,
      onDebug: onDebug,
    } = e,
    l = { ...claudeCodeArgs };
  for (let { key: key, fileName: fileName, pinnedChildMayLackFileFlag: pinnedChildMayLackFileFlag } of hd) {
    let S = claudeCodeArgs[key],
      T = S === void 0 ? "" : String(S);
    if (T === "") continue;
    let byteLength = Buffer.byteLength(T, "utf8");
    if (pinnedChildMayLackFileFlag && !e.childIsOwnBinary) {
      let E = [];
      if ((wrn(E, key, T), E.every((A) => Buffer.byteLength(A, "utf8") < MAX_INLINE_PROMPT_BYTES))) continue;
    }
    delete l[key];
    let v = join_6(configDir, fileName);
    stagedPaths.push(v);
    let w = { cancelled: !1 };
    try {
      await withBoundedTimeout(
        writeSessionFileAtomically(configDir, fileName, T, 384, w),
        Ql,
        `[runner:stuck] write ${v} (check NFS/CSI mount health)`,
      );
    } catch (error) {
      throw (
        (w.cancelled = !0),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `could not write the ${key} file for the session (${byteLength} bytes, ${sanitizedErrCodeForTelemetry(error) ?? "unknown error"})`,
          "could not write a system prompt file for the session",
        )
      );
    }
    (args.push(`--${key}-file`, v),
      onDebug(`[runner:session] delivering ${key} by file: ${v} (${byteLength} bytes)`));
  }
  return l;
}
//@ chunk-hm0ce8vc.js:60292-60412 placement
function repositoryDenialOf(e) {
  if (!(e instanceof RepositoryAccessError) || e.denial === void 0) return;
  return { denial: e.denial, error: e, repository: e.repository };
}
//@ chunk-hm0ce8vc.js:60412-60423 placement
var ec = 200;
//@ chunk-hm0ce8vc.js:60423-60507 placement
function tc(e) {
  return e.length <= ec && e.split("/").every((n) => jMt.test(n)) && redactSecretsInText(e) === e;
}
//@ chunk-hm0ce8vc.js:60507-60908 placement
function formatRepoNotAccessibleError(e) {
  return `This runner couldn't read ${tc(e) ? e : "one of this session's repositories (the output below may show which)"}. Either it doesn't exist or this runner can't access it. If it's the wrong repository, start a new session with the right one. If it's the right one, ask the team that manages your runners to check that the runners can access it. Once that's fixed, start a new session.`;
}
//@ chunk-hm0ce8vc.js:60908-61017 placement
function REPO_NOT_FOUND_REASON(e) {
  let n = repositoryDenialOf(e);
  return n?.denial === "repo_not_found_or_no_permission"
    ? formatRepoNotAccessibleError(n.repository.repo)
    : void 0;
}
/**
 * 子进程启动失败（E2BIG、ENOENT、EACCES 等）的说明表。
 */
//@ chunk-hm0ce8vc.js:61017-61378 placement
var SPAWN_FAILURE_DESCRIPTIONS = {
  e2big: "the launch configuration was too large",
  enoent: "the Claude Code executable or working directory was not found",
  eacces: "the Claude Code executable could not be executed",
  enoexec: "the Claude Code executable could not be executed",
  eio: "the system could not start the Claude Code process",
  enomem: "the system could not start the Claude Code process",
};
//@ chunk-hm0ce8vc.js:61378-61477 placement
function rc(e) {
  if (e === void 0 || e === null) return;
  let n = getErrnoCode(e)?.toLowerCase() ?? "";
  return sc(n) ? n : "other";
}
//@ chunk-hm0ce8vc.js:61477-61519 placement
function sc(e) {
  return Object.hasOwn(SPAWN_FAILURE_DESCRIPTIONS, e);
}
//@ chunk-hm0ce8vc.js:61519-61616 placement
function Qo(e) {
  return { start_error_class: e.class, max_arg_len: e.maxArgLen, max_env_len: e.maxEnvLen };
}
//@ chunk-hm0ce8vc.js:61616-61705 placement
function Ed(e) {
  let n = 0;
  for (let r of e) n = Math.max(n, Buffer.byteLength(r, "utf8"));
  return n;
}
/**
 * 描述启动失败原因（含参数/环境最长项长度）。
 */
//@ chunk-hm0ce8vc.js:61705-62051 placement
function describeSpawnFailure(e, n, r) {
  let s = rc(e) ?? "other",
    a = Ed(n),
    o = Ed(Object.entries(r).flatMap(([u, h]) => (h === void 0 ? [] : [`${u}=${h}`]))),
    l =
      s === "other"
        ? (sanitizeErrnoForTelemetry(e) ?? "unknown error")
        : `${SPAWN_FAILURE_DESCRIPTIONS[s]} (${s.toUpperCase()}${s === "e2big" ? `; longest argument ${a} bytes, longest environment entry ${o} bytes` : ""})`;
  return { class: s, maxArgLen: a, maxEnvLen: o, description: `spawn error: ${l}` };
}
//@ chunk-hm0ce8vc.js:62051-62339 placement
function createPrepTimer() {
  let e,
    n,
    r = {};
  return {
    start(s = Date.now()) {
      if (e === void 0) ((e = s), (n = s));
    },
    mark(s, a = Date.now()) {
      if (n === void 0) return;
      ((r[s] = (r[s] ?? 0) + Math.max(0, a - n)), (n = a));
    },
    lap(s = Date.now()) {
      if (n !== void 0) n = s;
    },
    finish(s = Date.now()) {
      if (e === void 0) return {};
      return { ...r, runner_prep_total_ms: Math.max(0, s - e) };
    },
  };
}
//@ chunk-hm0ce8vc.js:62339-62368 placement
var CCR_SHR_START_MARKS = "CCR_SHR_START_MARKS";
//@ chunk-hm0ce8vc.js:62368-62387 placement
var oc = 1e4,
  uS = 4 * oc;
//@ chunk-hm0ce8vc.js:62387-62445 placement
function decodeSessionJwt(e) {
  return decodeJwtExpiry(e.replace(/^sk-ant-[a-z]+-/, ""));
}
//@ chunk-hm0ce8vc.js:62445-62656 placement
function getSessionIdFromJwt(e) {
  let replaced = e.replace(/^sk-ant-[a-z]+-/, ""),
    r = decodeJwtPayload(replaced);
  if (r === null || typeof r !== "object") return null;
  let act = r.act;
  if (act === null || typeof act !== "object") return null;
  let email = act.email;
  return typeof email === "string" ? email : null;
}
//@ chunk-hm0ce8vc.js:62656-62840 placement
function getSpawnSessionIdFromJwt(e) {
  let replaced = e.replace(/^sk-ant-[a-z]+-/, ""),
    r = decodeJwtPayload(replaced);
  if (r === null || typeof r !== "object") return null;
  let s = r["ccr:spawn_session_id"];
  return typeof s === "string" && s.length > 0 ? s : null;
}
//@ chunk-hm0ce8vc.js:62840-62980 placement
function isPoolSpawnJwt(e) {
  let n = decodeJwtPayload(e.replace(/^sk-ant-[a-z]+-/, ""));
  return n !== null && typeof n === "object" && "ccr:role" in n && n["ccr:role"] === "pool_spawn";
}
//@ chunk-hm0ce8vc.js:62980-63080 placement
async function notAvailableInThisBuild({ tokenState: tokenState, refreshToken: refreshToken, adopt: adopt }) {
  throw Error("not available in this build");
}
//@ chunk-hm0ce8vc.js:63080-63274 placement
function getJwtExpiry({ getAccessToken: getAccessToken, onRefresh: onRefresh, label: label }) {
  return createTokenRefreshScheduler({
    getAccessToken: getAccessToken,
    onRefresh: onRefresh,
    label: label,
    maxFailures: 1 / 0,
    adaptiveBuffer: !0,
    rescheduleFromNewToken: !0,
    decodeExpiry: decodeSessionJwt,
    formatDelay: formatDuration,
  });
}
//@ chunk-hm0ce8vc.js:63311-63323 placement
var bd = 2000;
//@ chunk-hm0ce8vc.js:63323-63411 placement
function isEpochMismatchError(e) {
  return e instanceof Error && "isEpochMismatch" in e && e.isEpochMismatch === !0;
}
//@ chunk-hm0ce8vc.js:63411-63489 placement
function isNotFoundError(e) {
  return e instanceof Error && "isNotFound" in e && e.isNotFound === !0;
}
//@ chunk-hm0ce8vc.js:63489-63583 placement
function isSessionNotActiveError(e) {
  return e instanceof Error && "isSessionNotActive" in e && e.isSessionNotActive === !0;
}
//@ chunk-hm0ce8vc.js:63583-63618 placement
function co(e) {
  return isNotFoundError(e) || isSessionNotActiveError(e);
}
/**
 * 会话启动失败时向服务器发布失败结果（主动中止的会话跳过）。
 */
//@ chunk-hm0ce8vc.js:63618-65443 placement
async function postSessionFailureResult(e) {
  let {
    apiClient: apiClient,
    apiBaseUrl: apiBaseUrl,
    sessionId: sessionId,
    sessionToken: sessionToken,
    workerEpoch: workerEpoch,
    exitCode: exitCode,
    exitSignal: exitSignal,
    stderrTail: stderrTail,
    setupTerminal: setupTerminal,
    setupFailureKind: setupFailureKind,
    startError: startError,
    refusedByHostPolicy: refusedByHostPolicy,
    ranAsThread: ranAsThread,
    insteadOfRetryHint: insteadOfRetryHint,
    onDebug: onDebug,
    onStatus: onStatus,
    signal: signal,
  } = e;
  if (signal.aborted)
    return (
      onDebug(
        `[runner:session] Skipping failure-result post for ${sessionId} \u2014 session was deliberately aborted`,
      ),
      "skipped"
    );
  let K = [
      ...(startError ? [logEnvManagerError(startError)] : []),
      ...describeSessionProcessExit({
        exitCode: exitCode,
        exitSignal: exitSignal,
        stderrTail: stderrTail,
        setupTerminal: setupTerminal,
        setupFailureKind: setupFailureKind,
        startError: startError,
        refusedByHostPolicy: refusedByHostPolicy,
        ranAsThread: ranAsThread,
        insteadOfRetryHint: insteadOfRetryHint,
      }),
    ],
    L = () => apiClient.postWorkerEvents(apiBaseUrl, sessionId, sessionToken, workerEpoch, K, signal);
  try {
    return (
      await L(),
      onDebug(
        `[runner:session] Posted failure result for ${sessionId} (exitCode=${exitCode} signal=${exitSignal})`,
      ),
      "posted"
    );
  } catch (error) {
    if (co(error))
      return (
        onDebug(
          `[runner:session] failure-result rejected (session gone) \u2014 ${sessionId} is archived or deleted server-side`,
        ),
        "session_gone"
      );
    if (isEpochMismatchError(error))
      return (
        onDebug(
          `[runner:session] failure-result rejected (stale epoch) \u2014 another runner has taken over ${sessionId}. This process was the orphan.`,
        ),
        "epoch_stale"
      );
    let oe = redactSecretsInText(error instanceof Error ? error.message : String(error));
    (onStatus(
      `[runner:stuck] Failed to post failure-result for ${sessionId} (attempt 1): ${oe} \u2014 retrying in 2s`,
    ),
      await sleep(2000, signal));
  }
  try {
    return (
      await L(),
      onDebug(
        `[runner:session] Posted failure result for ${sessionId} on retry (exitCode=${exitCode} signal=${exitSignal})`,
      ),
      "posted"
    );
  } catch (error) {
    if (co(error))
      return (
        onDebug(
          `[runner:session] failure-result rejected (session gone on retry) \u2014 ${sessionId} is archived or deleted server-side`,
        ),
        "session_gone"
      );
    if (isEpochMismatchError(error))
      return (
        onDebug(
          `[runner:session] failure-result rejected (stale epoch on retry) \u2014 another runner has taken over ${sessionId}. This process was the orphan.`,
        ),
        "epoch_stale"
      );
    let oe = redactSecretsInText(error instanceof Error ? error.message : String(error));
    return (
      onStatus(
        `[runner:stuck] Failed to post failure-result for ${sessionId} after retry: ${oe} \u2014 UI spinner may not stop`,
      ),
      "post_failed"
    );
  }
}
//@ chunk-hm0ce8vc.js:65443-65693 placement
function logEnvManagerError(e) {
  return {
    type: "env_manager_log",
    uuid: randomUUID_3(),
    data: {
      level: "error",
      category: "execute",
      content: "Claude Code execution failed",
      timestamp: new Date().toISOString(),
      extra: { error: e.description, exit_code: -1, duration_ms: 0, stderr_class: "", ...Qo(e) },
    },
  };
}
/**
 * 描述会话进程退出（启动失败、退出码、托管设置 disableSideloadFlags 拒绝等）。
 */
//@ chunk-hm0ce8vc.js:65693-66975 placement
function describeSessionProcessExit({
  exitCode: exitCode,
  exitSignal: exitSignal,
  stderrTail: stderrTail,
  setupTerminal: setupTerminal,
  setupFailureKind: setupFailureKind,
  startError: startError,
  refusedByHostPolicy: refusedByHostPolicy = !1,
  ranAsThread: ranAsThread = !1,
  insteadOfRetryHint: insteadOfRetryHint,
}) {
  let p = exitCode !== null || exitSignal !== null,
    S = exitCode === null ? "failed to start" : `exited with code ${exitCode}`,
    T = ranAsThread ? "Claude stopped unexpectedly." : `The session process ${S}.`,
    v = refusedByHostPolicy
      ? `${T} This machine's managed settings (disableSideloadFlags) refused the launch.`
      : `${T} ${insteadOfRetryHint ?? (ranAsThread ? "Send a message to continue. If this keeps happening, start a new session." : "You can try again by sending a new message or starting a new session.")}`;
  if (stderrTail.trim().length > 0) {
    let A = stderrTail.length > bd ? `\u2026${takeLastChars(stderrTail, bd)}` : stderrTail;
    v += `

Last output before exit:
${A}`;
  }
  let w = {
      type: "assistant",
      uuid: randomUUID_3(),
      message: {
        role: "assistant",
        model: SYNTHETIC_MODEL,
        content: [{ type: "text", text: v }],
        stop_reason: "stop_sequence",
        usage: { input_tokens: 0, output_tokens: 0 },
      },
      parent_tool_use_id: null,
      isApiErrorMessage: !0,
    },
    E = {
      type: "result",
      uuid: randomUUID_3(),
      subtype: "error_during_execution",
      is_error: !0,
      duration_ms: 0,
      duration_api_ms: 0,
      num_turns: 0,
      total_cost_usd: 0,
      errors: [v],
      runner_exit: p
        ? { phase: "run", exit_code: exitCode, signal: exitSignal }
        : {
            phase: "setup",
            ...(startError && Qo(startError)),
            ...(setupTerminal && { terminal: !0 }),
            ...(setupFailureKind && { setup_failure_kind: setupFailureKind }),
          },
      modelUsage: {},
      permission_denials: [],
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    };
  return [w, E];
}
//@ chunk-hm0ce8vc.js:66975-67174 placement
var LAUNCHER_HOOK_FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}\.(py|sh)$/,
  lc = new Set([
    "Stop",
    "SubagentStop",
    "UserPromptSubmit",
    "SessionStart",
    "SessionEnd",
    "PreToolUse",
    "PostToolUse",
    "PreCompact",
    "Notification",
  ]),
  Od = 131072;

export {
  createPrepTimer,
  isEpochMismatchError,
  co,
  decodeSessionJwt,
  getJwtExpiry,
  writeSystemPromptFile,
  APPEND_SUBAGENT_SYSTEM_PROMPT,
  postSessionFailureResult,
  REPO_NOT_FOUND_REASON,
  pd,
  getSessionIdFromJwt,
  CCR_SHR_START_MARKS,
  describeSpawnFailure,
  lc,
  LAUNCHER_HOOK_FILENAME_PATTERN,
  Od,
  fd,
  isPoolSpawnJwt,
  getSpawnSessionIdFromJwt,
  notAvailableInThisBuild,
  isNotFoundError,
};
