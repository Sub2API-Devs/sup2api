/**
 * remote/tools/serve/servingPolicy.ts
 *
 * 2.1.316 新增：远程工具服务策略（本地一致性、询问等待、执行模式）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ad2e1aj6.js (13)
 * attribution: placement 13
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { ASK_WAIT_SCHEMA } from "./sessionApprovals.js";
import { DEFAULT_SERVING_LIMITS } from "../protocolConstants.js";
import {
  SYNC_ANSWER_TTL_MS,
  toWireSyncAnswer,
  SYNC_ANSWER_VERSION,
} from "../../../services/remoteTools/shellForwarding.js";
import { SESSION_APPROVAL_STALE_MS, SESSION_APPROVAL_LIMITS } from "./servingState.js";
import { logForDebugging } from "../../../utils/debug.js";
import { MAX_RESULT_BYTES, REMOTE_TOOL_LIMITS } from "../protocolSchemas.js";
import { strictRealpathCache } from "../../../utils/hooks/servedHooks/hookSandbox.js";
import {
  SANDBOX_OVERRIDE_INPUT_KEYS,
  SANDBOX_MAX_DEPTH,
  sandboxDefaultPolicy,
} from "../../../utils/sandbox/sandboxDefaultPolicy.js";
import { SERVED_BACKGROUND_LIMITS } from "./backgroundCommands.js";
import {
  callerSessionsLimit,
  remoteToolServingPolicyName,
} from "../../../services/remoteTools/servingGates.js";
import { MAX_CALLER_SESSIONS } from "./pendingAsks.js";
import { isServedCornerEnabled } from "./servingFlags.js";
import {
  DEVICE_PASSTHROUGH_TOOL_NAMES,
  isViolinVarnishOn,
} from "../../../services/remoteTools/backgroundCommands.js";
import { TASKSTOP } from "../../../tools/TaskStopTool/prompt.js";
import { getToolRemoteExecution } from "../../../Tool.js";
import { DEFAULT_SERVING_POLICY, mergeServingPolicy } from "../../../services/remoteTools/pathMapping.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { shouldMaintainProjectWorkingDir } from "../../../utils/envUtils.js";
import { isBackgroundTasksOff } from "../../../tools/AgentTool/backgroundGates.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import {
  zodStrictObject,
  _enum,
  literal,
  hu,
  union,
  string,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { classifyCcrContainerAsk } from "./servedSafetyChecks.js";
import { getPlatform } from "../../../utils/platform.js";
import { useSecurityParser } from "../../../tools/BashTool/readOnlyShellCheck.js";
import { runInRemoteCallFrameMain } from "../../remoteMode.js";
import { expandPath } from "../../../utils/path.js";

//@ chunk-ad2e1aj6.js:9982-10423 placement
function servedAskWaitMs() {
  let e;
  try {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_spruce", null);
    let s = ASK_WAIT_SCHEMA().safeParse(featureValue_CACHED_MAY_BE_STALE);
    if (s.success && Number.isInteger(s.data.askWaitMs)) {
      if (
        s.data.askWaitMs >= DEFAULT_SERVING_LIMITS.max_ask_ms &&
        s.data.askWaitMs <= SYNC_ANSWER_TTL_MS - SESSION_APPROVAL_STALE_MS
      )
        return s.data.askWaitMs;
      e = "out_of_range";
    } else
      e =
        featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined
          ? "absent"
          : "wrong_type";
  } catch {
    e = "unreadable";
  }
  logForDebugging(
    `[remote-tools] tengu_violin_spruce not used (${e}): approval cards keep the built-in wait`,
    {
      level: e === "absent" ? "debug" : "warn",
    },
  );
  return;
}
//@ chunk-ad2e1aj6.js:10423-11011 placement
/**
 * 远程服务的默认策略：58 s 截止、4 并发、沙箱/后台/凭证擦除等默认值，以及给用户看的策略说明文案。
 */
var SERVING_POLICY_DEFAULTS = 58000;
var MAX_REQUEST_BYTES = MAX_RESULT_BYTES;
var MAX_IN_FLIGHT = 4;
var BASE_SERVING_POLICY = {
  sandbox: "tool_default",
  background: "forbidden",
  pinCwd: false,
  scrubCredentialEnv: false,
  maxTimeoutMs: undefined,
  get additionalDenyRead() {
    return strictRealpathCache();
  },
  get additionalDenyWrite() {
    return strictRealpathCache();
  },
};
var SANDBOX_OVERRIDE_KEYS = SANDBOX_OVERRIDE_INPUT_KEYS;
var START_IN_PROJECT_NOTE = "Commands start in the project folder.";
var CD_CARRIES_OVER_NOTE = "A cd inside it carries over.";
var CD_NOT_CARRIES_OVER_NOTE = "A cd does not carry over.";
var MACHINE_RULES_NOTE =
  "This machine's rules, hooks and sandbox settings apply (a hook can block or rewrite a call, never pre-approve it). Approvals are asked in this session.";
var NO_BACKGROUND_NOTE = "No background commands.";
var BACKGROUND_ALLOWED_NOTE = `Up to ${SERVED_BACKGROUND_LIMITS} background Bash commands, stopped when this machine detaches.`;
//@ chunk-ad2e1aj6.js:11011-12063 placement
/**
 * "local_parity" 服务策略：个人机器、需要信封、设备绑定准入、沙箱/后台/凭证擦除等约束。
 */
function localParityPolicy(e = {}) {
  let n = e.backgroundShells?.() === true;
  return {
    name: "local_parity",
    kind: "personal_machine",
    requireEnvelope: true,
    admission: "device_binding",
    stance: {
      mode: "session",
      honorLocalRules: true,
      onAsk: "session",
      askOnDestructive: false,
      unattended: "own_record",
    },
    limits: {
      max_call_ms: SERVING_POLICY_DEFAULTS,
      max_request_bytes: MAX_REQUEST_BYTES,
      max_in_flight: MAX_IN_FLIGHT,
      caller_sessions_max: callerSessionsLimit() ?? MAX_CALLER_SESSIONS,
      pending_asks_max: SANDBOX_MAX_DEPTH,
      progress_interval_ms: DEFAULT_SERVING_LIMITS.progress_interval_ms,
      progress_misses: DEFAULT_SERVING_LIMITS.progress_misses,
      ...(isServedCornerEnabled() && {
        max_ask_ms: servedAskWaitMs() ?? SESSION_APPROVAL_LIMITS,
      }),
    },
    capabilities: [
      "progress_checks",
      "standing_approvals",
      "plan_classifier",
      ...(n ? ["background_shells"] : []),
    ],
    serves: (h) =>
      (DEVICE_PASSTHROUGH_TOOL_NAMES.has(h.name) || (n && h.name === TASKSTOP)) &&
      getToolRemoteExecution(h).supported,
    constraints: (h, r, i = DEFAULT_SERVING_POLICY) => {
      let toolRemoteExecution = getToolRemoteExecution(h);
      return mergeServingPolicy(
        BASE_SERVING_POLICY,
        toolRemoteExecution.supported ? toolRemoteExecution.tighten : undefined,
      );
    },
    refusedInputFields: (h) => {
      let toolRemoteExecution = getToolRemoteExecution(h);
      return (toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : []).filter(
        (y) =>
          !SANDBOX_OVERRIDE_KEYS.has(y) &&
          !(y === "run_in_background" && h.name === BASH_TOOL_NAME && n && e.backgroundShells?.() === true),
      );
    },
    ...(n &&
      e.backgroundShells && {
        backgroundShells: {
          maxPerSession: SERVED_BACKGROUND_LIMITS,
          enabled: e.backgroundShells,
        },
      }),
    notes: () =>
      [
        START_IN_PROJECT_NOTE,
        shouldMaintainProjectWorkingDir() ? CD_NOT_CARRIES_OVER_NOTE : CD_CARRIES_OVER_NOTE,
        MACHINE_RULES_NOTE,
        n ? BACKGROUND_ALLOWED_NOTE : NO_BACKGROUND_NOTE,
      ].join(" "),
  };
}
//@ chunk-ad2e1aj6.js:12063-12149 placement
function resolveServingPolicy(e = remoteToolServingPolicyName()) {
  return e === "parity"
    ? localParityPolicy({
        backgroundShells: () => isViolinVarnishOn() && !isBackgroundTasksOff(),
      })
    : sandboxDefaultPolicy();
}
//@ chunk-ad2e1aj6.js:12186-12559 placement
function deviceFrame(e, instanceId, sequence) {
  let h = e.kind !== "not_running";
  return toWireSyncAnswer({
    v: SYNC_ANSWER_VERSION,
    frame: {
      side: "device",
      generation: h ? e.generation : 0,
      tree: h ? e.tree : null,
      appliedGeneration: h ? e.taken : 0,
      mayHaveUnuploadedChanges: h,
      shipping: null,
      appliesOtherSide: h,
      instanceId,
      sequence,
    },
    outcome:
      e.kind === "failed" || e.kind === "kept_here"
        ? {
            kind: e.kind,
            reason: e.reason,
          }
        : {
            kind: e.kind === "queued" ? "unchanged" : e.kind,
          },
  });
}
//@ chunk-ad2e1aj6.js:12559-12675 placement
function parseExecutionMode(execution) {
  let n = executionModeSchema().safeParse(execution);
  return n.success
    ? n.data
    : {
        mode: "vm",
        availability: () => ({
          state: "unavailable",
        }),
      };
}
//@ chunk-ad2e1aj6.js:12675-13083 placement
/**
 * 执行模式 schema：in_process 与 vm（含 availability、executor、copy 说明）两种模式的定义。
 */
var EXECUTION_MODE_SCHEMAS = DoctorLazy(() =>
  zodStrictObject({
    state: _enum(["ready", "starting", "unavailable"]),
  }),
);
var inProcessModeSchema = DoctorLazy(() =>
  zodStrictObject({
    mode: literal("in_process"),
  }),
);
var vmModeSchema = DoctorLazy(() =>
  zodStrictObject({
    mode: literal("vm"),
    availability: hu((e) => typeof e === "function"),
  }),
);
var executionModeSchema = DoctorLazy(() => union([inProcessModeSchema(), vmModeSchema()]));
var servedExecutionModeSchema = DoctorLazy(() =>
  union([
    inProcessModeSchema(),
    zodStrictObject({
      ...vmModeSchema().shape,
      executor: hu((e) => typeof e === "function"),
      notes: string().max(REMOTE_TOOL_LIMITS).optional(),
      copy: zodStrictObject({
        platform: string(),
        workingDir: string(),
        shell: string(),
        tools: hu((e) => typeof e === "function"),
      }).optional(),
    }),
  ]),
);
//@ chunk-ad2e1aj6.js:13083-13206 placement
function arrivesOverSession(e) {
  switch (e) {
    case "session":
      return true;
    case "bridge":
    case "direct":
    case "relay":
      return false;
    default: {
      let n = e;
      return false;
    }
  }
}
//@ chunk-ad2e1aj6.js:13206-13372 placement
function acceptsArrival(raisedOver, arrivedOver) {
  switch (raisedOver) {
    case "session":
      return arrivedOver === "session";
    case "bridge":
    case "direct":
      return arrivedOver !== "relay";
    case "relay":
      return arrivedOver === "relay";
    default: {
      let s = raisedOver;
      return false;
    }
  }
}
//@ chunk-ad2e1aj6.js:13372-13583 placement
function callerKindForArrival(arrivedOver, n, s, trust = DEFAULT_SERVING_POLICY) {
  switch (arrivedOver) {
    case "session":
      return classifyCcrContainerAsk(s);
    case "bridge":
    case "direct":
      return n === "bridge" ? "bridge" : undefined;
    case "relay":
      return trust.approvalAttested === true ? "relayed" : undefined;
    default: {
      let r = arrivedOver;
      return;
    }
  }
}
//@ chunk-ad2e1aj6.js:13583-13623 placement
var PIPE_BUFFER_BYTES_BY_PLATFORM = {
  macos: 1024,
  linux: 4096,
  wsl: 4096,
};
//@ chunk-ad2e1aj6.js:13623-13877 placement
function platformPathGuard(tool, n, s) {
  let h = PIPE_BUFFER_BYTES_BY_PLATFORM[getPlatform()];
  if (h === undefined || tool.isMcp === true || tool.getPath === undefined || !useSecurityParser()) return;
  try {
    let r = runInRemoteCallFrameMain(s, () => {
      let path = tool.getPath?.(n);
      return typeof path === "string" ? expandPath(path) : undefined;
    });
    return typeof r === "string" && Buffer.byteLength(r) >= h ? h : undefined;
  } catch {
    return;
  }
}
//@ chunk-ad2e1aj6.js:13877-13890 placement
var RESULT_RETENTION_MS = 15000;
export {
  platformPathGuard,
  arrivesOverSession,
  acceptsArrival,
  callerKindForArrival,
  deviceFrame,
  parseExecutionMode,
  RESULT_RETENTION_MS,
  resolveServingPolicy,
};
