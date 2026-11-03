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
import { join } from "path";
import { randomUUID } from "crypto";
import { pushFlagArg } from "./childArgs.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { writeSessionFileAtomically } from "./hostConfigSnapshot.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedErrCodeForTelemetry,
  getErrnoCode,
  sanitizeErrnoForTelemetry,
} from "../../utils/errors.js";
import { RepositoryAccessError } from "../../selfHostedRunner/git/repoPrepare.js";
import { REPO_NAME_RE } from "../../utils/git/githubUrl.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { decodeJwtExpiry, decodeJwtPayload, createTokenRefreshScheduler } from "../../bridge/jwtUtils.js";
import { formatDuration } from "../../utils/format.js";
import { sleep } from "../../utils/sleep.js";
import { takeLastChars } from "../../utils/stringUtils.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";

//@ chunk-hm0ce8vc.js:59108-59119 placement
var SYSTEM_PROMPT_FILE_WRITE_TIMEOUT_MS = 1e4;
//@ chunk-hm0ce8vc.js:59148-59430 placement
/**
 * --system-prompt / --append-system-prompt 等参数与对应投递文件名表。
 */
var MAX_INLINE_PROMPT_BYTES_2 = 131072;
var MAX_INLINE_PROMPT_BYTES = 1e4;
var APPEND_SUBAGENT_SYSTEM_PROMPT = "append-subagent-system-prompt";
var SYSTEM_PROMPT_FILE_ARGS = [
  {
    key: "system-prompt",
    fileName: "remote-system-prompt.txt",
  },
  {
    key: "append-system-prompt",
    fileName: "remote-append-system-prompt.txt",
  },
  {
    key: APPEND_SUBAGENT_SYSTEM_PROMPT,
    fileName: "remote-append-subagent-system-prompt.txt",
    pinnedChildMayLackFileFlag: true,
  },
];
//@ chunk-hm0ce8vc.js:59430-59515 placement
/**
 * 按开关决定是否保留子代理系统提示词，其余系统提示词键一律保留。
 */
function stripSystemPromptFileArgs(e, subagentPromptInline) {
  let r = {
    ...e,
  };
  for (let { key } of SYSTEM_PROMPT_FILE_ARGS)
    if (key !== APPEND_SUBAGENT_SYSTEM_PROMPT || !subagentPromptInline) delete r[key];
  return r;
}
//@ chunk-hm0ce8vc.js:59515-60292 placement
/**
 * 把服务器下发的系统提示词写入会话目录并改用 *-file 参数传递。
 */
async function writeSystemPromptFile(e) {
  let { args, claudeCodeArgs, configDir, stagedPaths, onDebug } = e;
  let l = {
    ...claudeCodeArgs,
  };
  for (let { key, fileName, pinnedChildMayLackFileFlag } of SYSTEM_PROMPT_FILE_ARGS) {
    let S = claudeCodeArgs[key];
    let T = S === undefined ? "" : String(S);
    if (T === "") continue;
    let y = Buffer.byteLength(T, "utf8");
    if (pinnedChildMayLackFileFlag && !e.childIsOwnBinary) {
      let E = [];
      pushFlagArg(E, key, T);
      if (E.every((A) => Buffer.byteLength(A, "utf8") < MAX_INLINE_PROMPT_BYTES_2)) continue;
    }
    delete l[key];
    let v = join(configDir, fileName);
    stagedPaths.push(v);
    let w = {
      cancelled: false,
    };
    try {
      await withBoundedTimeout(
        writeSessionFileAtomically(configDir, fileName, T, 384, w),
        MAX_INLINE_PROMPT_BYTES,
        `[runner:stuck] write ${v} (check NFS/CSI mount health)`,
      );
    } catch (error) {
      w.cancelled = true;
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `could not write the ${key} file for the session (${y} bytes, ${sanitizedErrCodeForTelemetry(error) ?? "unknown error"})`,
        "could not write a system prompt file for the session",
      );
    }
    args.push(`--${key}-file`, v);
    onDebug(`[runner:session] delivering ${key} by file: ${v} (${y} bytes)`);
  }
  return l;
}
//@ chunk-hm0ce8vc.js:60292-60412 placement
function repositoryDenialOf(e) {
  if (!(e instanceof RepositoryAccessError) || e.denial === undefined) return;
  return {
    denial: e.denial,
    error: e,
    repository: e.repository,
  };
}
//@ chunk-hm0ce8vc.js:60412-60423 placement
var MAX_REPO_SPEC_CHARS = 200;
//@ chunk-hm0ce8vc.js:60423-60507 placement
/**
 * 仓库规格字符串是否可安全显示（长度、路径字符、无密钥）。
 */
function isPrintableRepoSpec(e) {
  return (
    e.length <= MAX_REPO_SPEC_CHARS &&
    e.split("/").every((n) => REPO_NAME_RE.test(n)) &&
    redactSecretsInText(e) === e
  );
}
//@ chunk-hm0ce8vc.js:60507-60908 placement
function formatRepoNotAccessibleError(repo) {
  return `This runner couldn't read ${isPrintableRepoSpec(repo) ? repo : "one of this session's repositories (the output below may show which)"}. Either it doesn't exist or this runner can't access it. If it's the wrong repository, start a new session with the right one. If it's the right one, ask the team that manages your runners to check that the runners can access it. Once that's fixed, start a new session.`;
}
//@ chunk-hm0ce8vc.js:60908-61017 placement
function REPO_NOT_FOUND_REASON(error) {
  let n = repositoryDenialOf(error);
  return n?.denial === "repo_not_found_or_no_permission"
    ? formatRepoNotAccessibleError(n.repository.repo)
    : undefined;
}
//@ chunk-hm0ce8vc.js:61017-61378 placement
/**
 * 子进程启动失败（E2BIG、ENOENT、EACCES 等）的说明表。
 */
var SPAWN_FAILURE_DESCRIPTIONS = {
  e2big: "the launch configuration was too large",
  enoent: "the Claude Code executable or working directory was not found",
  eacces: "the Claude Code executable could not be executed",
  enoexec: "the Claude Code executable could not be executed",
  eio: "the system could not start the Claude Code process",
  enomem: "the system could not start the Claude Code process",
};
//@ chunk-hm0ce8vc.js:61378-61477 placement
/**
 * 把启动失败的 errno 归类成已知类别或 other。
 */
function spawnFailureClass(e) {
  if (e === undefined || e === null) return;
  let n = getErrnoCode(e)?.toLowerCase() ?? "";
  return isKnownSpawnFailureCode(n) ? n : "other";
}
//@ chunk-hm0ce8vc.js:61477-61519 placement
function isKnownSpawnFailureCode(e) {
  return Object.hasOwn(SPAWN_FAILURE_DESCRIPTIONS, e);
}
//@ chunk-hm0ce8vc.js:61519-61616 placement
/**
 * 生成启动失败的遥测字段（错误类别、最长参数与环境变量长度）。
 */
function spawnFailureFields(e) {
  return {
    start_error_class: e.class,
    max_arg_len: e.maxArgLen,
    max_env_len: e.maxEnvLen,
  };
}
//@ chunk-hm0ce8vc.js:61616-61705 placement
/**
 * 计算一组字符串中最大的 UTF-8 字节长度。
 */
function maxUtf8ByteLength(e) {
  let n = 0;
  for (let r of e) n = Math.max(n, Buffer.byteLength(r, "utf8"));
  return n;
}
//@ chunk-hm0ce8vc.js:61705-62051 placement
/**
 * 描述启动失败原因（含参数/环境最长项长度）。
 */
function describeSpawnFailure(e, n, r) {
  let s = spawnFailureClass(e) ?? "other";
  let a = maxUtf8ByteLength(n);
  let o = maxUtf8ByteLength(
    Object.entries(r).flatMap(([key, value]) => (value === undefined ? [] : [`${key}=${value}`])),
  );
  let l =
    s === "other"
      ? (sanitizeErrnoForTelemetry(e) ?? "unknown error")
      : `${SPAWN_FAILURE_DESCRIPTIONS[s]} (${s.toUpperCase()}${s === "e2big" ? `; longest argument ${a} bytes, longest environment entry ${o} bytes` : ""})`;
  return {
    class: s,
    maxArgLen: a,
    maxEnvLen: o,
    description: `spawn error: ${l}`,
  };
}
//@ chunk-hm0ce8vc.js:62051-62339 placement
function createPrepTimer() {
  let e;
  let n;
  let r = {};
  return {
    start(s = Date.now()) {
      if (e === undefined) {
        e = s;
        n = s;
      }
    },
    mark(s, a = Date.now()) {
      if (n === undefined) return;
      r[s] = (r[s] ?? 0) + Math.max(0, a - n);
      n = a;
    },
    lap(s = Date.now()) {
      if (n !== undefined) n = s;
    },
    finish(s = Date.now()) {
      if (e === undefined) return {};
      return {
        ...r,
        runner_prep_total_ms: Math.max(0, s - e),
      };
    },
  };
}
//@ chunk-hm0ce8vc.js:62339-62368 placement
var CCR_SHR_START_MARKS = "CCR_SHR_START_MARKS";
//@ chunk-hm0ce8vc.js:62368-62387 placement
var MAX_STDERR_TAIL_CHARS = 1e4;
var MAX_STDERR_TAIL_BYTES = 4 * MAX_STDERR_TAIL_CHARS;
//@ chunk-hm0ce8vc.js:62387-62445 placement
function decodeSessionJwt(e) {
  return decodeJwtExpiry(e.replace(/^sk-ant-[a-z]+-/, ""));
}
//@ chunk-hm0ce8vc.js:62445-62656 placement
function getSessionIdFromJwt(e) {
  let replaced = e.replace(/^sk-ant-[a-z]+-/, "");
  let r = decodeJwtPayload(replaced);
  if (r === null || typeof r !== "object") return null;
  let act = r.act;
  if (act === null || typeof act !== "object") return null;
  let email = act.email;
  return typeof email === "string" ? email : null;
}
//@ chunk-hm0ce8vc.js:62656-62840 placement
function getSpawnSessionIdFromJwt(e) {
  let replaced = e.replace(/^sk-ant-[a-z]+-/, "");
  let r = decodeJwtPayload(replaced);
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
async function notAvailableInThisBuild({ tokenState, refreshToken, adopt }) {
  throw Error("not available in this build");
}
//@ chunk-hm0ce8vc.js:63080-63274 placement
function getJwtExpiry({ getAccessToken, onRefresh, label }) {
  return createTokenRefreshScheduler({
    getAccessToken,
    onRefresh,
    label,
    maxFailures: 1 / 0,
    adaptiveBuffer: true,
    rescheduleFromNewToken: true,
    decodeExpiry: decodeSessionJwt,
    formatDelay: formatDuration,
  });
}
//@ chunk-hm0ce8vc.js:63311-63323 placement
var STDERR_TAIL_CHARS = 2000;
//@ chunk-hm0ce8vc.js:63323-63411 placement
function isEpochMismatchError(error) {
  return error instanceof Error && "isEpochMismatch" in error && error.isEpochMismatch === true;
}
//@ chunk-hm0ce8vc.js:63411-63489 placement
function isNotFoundError(e) {
  return e instanceof Error && "isNotFound" in e && e.isNotFound === true;
}
//@ chunk-hm0ce8vc.js:63489-63583 placement
function isSessionNotActiveError(e) {
  return e instanceof Error && "isSessionNotActive" in e && e.isSessionNotActive === true;
}
//@ chunk-hm0ce8vc.js:63583-63618 placement
/**
 * 判断错误是否表示仓库/会话不存在或会话未活动。
 */
function isNotFoundOrInactive(error) {
  return isNotFoundError(error) || isSessionNotActiveError(error);
}
//@ chunk-hm0ce8vc.js:63618-65443 placement
/**
 * 会话启动失败时向服务器发布失败结果（主动中止的会话跳过）。
 */
async function postSessionFailureResult(e) {
  let {
    apiClient,
    apiBaseUrl,
    sessionId,
    sessionToken,
    workerEpoch,
    exitCode,
    exitSignal,
    stderrTail,
    setupTerminal,
    setupFailureKind,
    startError,
    refusedByHostPolicy,
    ranAsThread,
    insteadOfRetryHint,
    onDebug,
    onStatus,
    signal,
  } = e;
  if (signal.aborted) {
    onDebug(
      `[runner:session] Skipping failure-result post for ${sessionId} \u2014 session was deliberately aborted`,
    );
    return "skipped";
  }
  let K = [
    ...(startError ? [logEnvManagerError(startError)] : []),
    ...describeSessionProcessExit({
      exitCode,
      exitSignal,
      stderrTail,
      setupTerminal,
      setupFailureKind,
      startError,
      refusedByHostPolicy,
      ranAsThread,
      insteadOfRetryHint,
    }),
  ];
  let L = () => apiClient.postWorkerEvents(apiBaseUrl, sessionId, sessionToken, workerEpoch, K, signal);
  try {
    await L();
    onDebug(
      `[runner:session] Posted failure result for ${sessionId} (exitCode=${exitCode} signal=${exitSignal})`,
    );
    return "posted";
  } catch (error) {
    if (isNotFoundOrInactive(error)) {
      onDebug(
        `[runner:session] failure-result rejected (session gone) \u2014 ${sessionId} is archived or deleted server-side`,
      );
      return "session_gone";
    }
    if (isEpochMismatchError(error)) {
      onDebug(
        `[runner:session] failure-result rejected (stale epoch) \u2014 another runner has taken over ${sessionId}. This process was the orphan.`,
      );
      return "epoch_stale";
    }
    let oe = redactSecretsInText(error instanceof Error ? error.message : String(error));
    onStatus(
      `[runner:stuck] Failed to post failure-result for ${sessionId} (attempt 1): ${oe} \u2014 retrying in 2s`,
    );
    await sleep(2000, signal);
  }
  try {
    await L();
    onDebug(
      `[runner:session] Posted failure result for ${sessionId} on retry (exitCode=${exitCode} signal=${exitSignal})`,
    );
    return "posted";
  } catch (error) {
    if (isNotFoundOrInactive(error)) {
      onDebug(
        `[runner:session] failure-result rejected (session gone on retry) \u2014 ${sessionId} is archived or deleted server-side`,
      );
      return "session_gone";
    }
    if (isEpochMismatchError(error)) {
      onDebug(
        `[runner:session] failure-result rejected (stale epoch on retry) \u2014 another runner has taken over ${sessionId}. This process was the orphan.`,
      );
      return "epoch_stale";
    }
    let oe = redactSecretsInText(error instanceof Error ? error.message : String(error));
    onStatus(
      `[runner:stuck] Failed to post failure-result for ${sessionId} after retry: ${oe} \u2014 UI spinner may not stop`,
    );
    return "post_failed";
  }
}
//@ chunk-hm0ce8vc.js:65443-65693 placement
function logEnvManagerError(startError) {
  return {
    type: "env_manager_log",
    uuid: randomUUID(),
    data: {
      level: "error",
      category: "execute",
      content: "Claude Code execution failed",
      timestamp: new Date().toISOString(),
      extra: {
        error: startError.description,
        exit_code: -1,
        duration_ms: 0,
        stderr_class: "",
        ...spawnFailureFields(startError),
      },
    },
  };
}
//@ chunk-hm0ce8vc.js:65693-66975 placement
/**
 * 描述会话进程退出（启动失败、退出码、托管设置 disableSideloadFlags 拒绝等）。
 */
function describeSessionProcessExit({
  exitCode,
  exitSignal,
  stderrTail,
  setupTerminal,
  setupFailureKind,
  startError,
  refusedByHostPolicy = false,
  ranAsThread = false,
  insteadOfRetryHint,
}) {
  let p = exitCode !== null || exitSignal !== null;
  let S = exitCode === null ? "failed to start" : `exited with code ${exitCode}`;
  let T = ranAsThread ? "Claude stopped unexpectedly." : `The session process ${S}.`;
  let v = refusedByHostPolicy
    ? `${T} This machine's managed settings (disableSideloadFlags) refused the launch.`
    : `${T} ${insteadOfRetryHint ?? (ranAsThread ? "Send a message to continue. If this keeps happening, start a new session." : "You can try again by sending a new message or starting a new session.")}`;
  if (stderrTail.trim().length > 0) {
    let A =
      stderrTail.length > STDERR_TAIL_CHARS
        ? `\u2026${takeLastChars(stderrTail, STDERR_TAIL_CHARS)}`
        : stderrTail;
    v += `

Last output before exit:
${A}`;
  }
  let w = {
    type: "assistant",
    uuid: randomUUID(),
    message: {
      role: "assistant",
      model: SYNTHETIC_MODEL,
      content: [
        {
          type: "text",
          text: v,
        },
      ],
      stop_reason: "stop_sequence",
      usage: {
        input_tokens: 0,
        output_tokens: 0,
      },
    },
    parent_tool_use_id: null,
    isApiErrorMessage: true,
  };
  let E = {
    type: "result",
    uuid: randomUUID(),
    subtype: "error_during_execution",
    is_error: true,
    duration_ms: 0,
    duration_api_ms: 0,
    num_turns: 0,
    total_cost_usd: 0,
    errors: [v],
    runner_exit: p
      ? {
          phase: "run",
          exit_code: exitCode,
          signal: exitSignal,
        }
      : {
          phase: "setup",
          ...(startError && spawnFailureFields(startError)),
          ...(setupTerminal && {
            terminal: true,
          }),
          ...(setupFailureKind && {
            setup_failure_kind: setupFailureKind,
          }),
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
/**
 * 启动器钩子文件名模式、受支持的钩子事件集合与仓库不存在输出上限。
 */
var LAUNCHER_HOOK_FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}\.(py|sh)$/;
var LAUNCHER_HOOK_EVENTS = new Set([
  "Stop",
  "SubagentStop",
  "UserPromptSubmit",
  "SessionStart",
  "SessionEnd",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "Notification",
]);
var MAX_REPO_NOT_FOUND_OUTPUT_BYTES = 131072;
export {
  createPrepTimer,
  isEpochMismatchError,
  isNotFoundOrInactive,
  decodeSessionJwt,
  getJwtExpiry,
  writeSystemPromptFile,
  APPEND_SUBAGENT_SYSTEM_PROMPT,
  postSessionFailureResult,
  REPO_NOT_FOUND_REASON,
  stripSystemPromptFileArgs,
  getSessionIdFromJwt,
  CCR_SHR_START_MARKS,
  describeSpawnFailure,
  LAUNCHER_HOOK_EVENTS,
  LAUNCHER_HOOK_FILENAME_PATTERN,
  MAX_REPO_NOT_FOUND_OUTPUT_BYTES,
  SYSTEM_PROMPT_FILE_WRITE_TIMEOUT_MS,
  isPoolSpawnJwt,
  getSpawnSessionIdFromJwt,
  notAvailableInThisBuild,
  isNotFoundError,
};
