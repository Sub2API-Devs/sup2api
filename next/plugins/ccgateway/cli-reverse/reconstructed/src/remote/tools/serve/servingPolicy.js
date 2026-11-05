/**
 * remote/tools/serve/servingPolicy.ts
 *
 * 2.1.316 新增：远程工具服务策略（本地一致性、询问等待、执行模式）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nvm0wye1.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
  custom,
  union,
  stringSchema,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { classifyCcrContainerAsk } from "./servedSafetyChecks.js";
import { getPlatform } from "../../../utils/platform.js";
import { useSecurityParser } from "../../../tools/BashTool/readOnlyShellCheck.js";
import { runInRemoteCallFrameMain } from "../../remoteMode.js";
import { expandPath } from "../../../utils/path.js";

//@ chunk-nvm0wye1.js:10309-10751 placement
function servedAskWaitMs() {
  let reason;
  try {
    let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_spruce", null);
    let parsed = ASK_WAIT_SCHEMA().safeParse(featureValue_CACHED_MAY_BE_STALE);
    if (parsed.success && Number.isInteger(parsed.data.askWaitMs)) {
      if (
        parsed.data.askWaitMs >= DEFAULT_SERVING_LIMITS.max_ask_ms &&
        parsed.data.askWaitMs <= SYNC_ANSWER_TTL_MS - SESSION_APPROVAL_STALE_MS
      )
        return parsed.data.askWaitMs;
      reason = "out_of_range";
    } else
      reason =
        featureValue_CACHED_MAY_BE_STALE === null || featureValue_CACHED_MAY_BE_STALE === undefined
          ? "absent"
          : "wrong_type";
  } catch {
    reason = "unreadable";
  }
  logForDebugging(
    `[remote-tools] tengu_violin_spruce not used (${reason}): approval cards keep the built-in wait`,
    {
      level: reason === "absent" ? "debug" : "warn",
    },
  );
  return;
}
//@ chunk-nvm0wye1.js:10751-11339 placement
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
//@ chunk-nvm0wye1.js:11339-12391 placement
/**
 * "local_parity" 服务策略：个人机器、需要信封、设备绑定准入、沙箱/后台/凭证擦除等约束。
 */
function localParityPolicy(options = {}) {
  let backgroundOn = options.backgroundShells?.() === true;
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
      ...(backgroundOn ? ["background_shells"] : []),
    ],
    serves: (tool) =>
      (DEVICE_PASSTHROUGH_TOOL_NAMES.has(tool.name) || (backgroundOn && tool.name === TASKSTOP)) &&
      getToolRemoteExecution(tool).supported,
    constraints: (tool, launchDir, call = DEFAULT_SERVING_POLICY) => {
      let toolRemoteExecution = getToolRemoteExecution(tool);
      return mergeServingPolicy(
        BASE_SERVING_POLICY,
        toolRemoteExecution.supported ? toolRemoteExecution.tighten : undefined,
      );
    },
    refusedInputFields: (tool) => {
      let toolRemoteExecution = getToolRemoteExecution(tool);
      return (toolRemoteExecution.supported ? (toolRemoteExecution.refusedInputFields ?? []) : []).filter(
        (field) =>
          !SANDBOX_OVERRIDE_KEYS.has(field) &&
          !(
            field === "run_in_background" &&
            tool.name === BASH_TOOL_NAME &&
            backgroundOn &&
            options.backgroundShells?.() === true
          ),
      );
    },
    ...(backgroundOn &&
      options.backgroundShells && {
        backgroundShells: {
          maxPerSession: SERVED_BACKGROUND_LIMITS,
          enabled: options.backgroundShells,
        },
      }),
    notes: () =>
      [
        START_IN_PROJECT_NOTE,
        shouldMaintainProjectWorkingDir() ? CD_NOT_CARRIES_OVER_NOTE : CD_CARRIES_OVER_NOTE,
        MACHINE_RULES_NOTE,
        backgroundOn ? BACKGROUND_ALLOWED_NOTE : NO_BACKGROUND_NOTE,
      ].join(" "),
  };
}
//@ chunk-nvm0wye1.js:12391-12477 placement
function resolveServingPolicy(policyName = remoteToolServingPolicyName()) {
  return policyName === "parity"
    ? localParityPolicy({
        backgroundShells: () => isViolinVarnishOn() && !isBackgroundTasksOff(),
      })
    : sandboxDefaultPolicy();
}
//@ chunk-nvm0wye1.js:12532-12905 placement
function deviceFrame(capture, instanceId, sequence) {
  let running = capture.kind !== "not_running";
  return toWireSyncAnswer({
    v: SYNC_ANSWER_VERSION,
    frame: {
      side: "device",
      generation: running ? capture.generation : 0,
      tree: running ? capture.tree : null,
      appliedGeneration: running ? capture.taken : 0,
      mayHaveUnuploadedChanges: running,
      shipping: null,
      appliesOtherSide: running,
      instanceId,
      sequence,
    },
    outcome:
      capture.kind === "failed" || capture.kind === "kept_here"
        ? {
            kind: capture.kind,
            reason: capture.reason,
          }
        : {
            kind: capture.kind === "queued" ? "unchanged" : capture.kind,
          },
  });
}
//@ chunk-nvm0wye1.js:12905-13021 placement
function parseExecutionMode(execution) {
  let parsed = executionModeSchema().safeParse(execution);
  return parsed.success
    ? parsed.data
    : {
        mode: "vm",
        availability: () => ({
          state: "unavailable",
        }),
      };
}
//@ chunk-nvm0wye1.js:13021-13429 placement
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
    availability: custom((value) => typeof value === "function"),
  }),
);
var executionModeSchema = DoctorLazy(() => union([inProcessModeSchema(), vmModeSchema()]));
var servedExecutionModeSchema = DoctorLazy(() =>
  union([
    inProcessModeSchema(),
    zodStrictObject({
      ...vmModeSchema().shape,
      executor: custom((value) => typeof value === "function"),
      notes: stringSchema().max(REMOTE_TOOL_LIMITS).optional(),
      copy: zodStrictObject({
        platform: stringSchema(),
        workingDir: stringSchema(),
        shell: stringSchema(),
        tools: custom((value) => typeof value === "function"),
      }).optional(),
    }),
  ]),
);
//@ chunk-nvm0wye1.js:13429-13552 placement
function arrivesOverSession(transport) {
  switch (transport) {
    case "session":
      return true;
    case "bridge":
    case "direct":
    case "relay":
      return false;
    default: {
      let other = transport;
      return false;
    }
  }
}
//@ chunk-nvm0wye1.js:13552-13718 placement
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
      let other = raisedOver;
      return false;
    }
  }
}
//@ chunk-nvm0wye1.js:13718-13929 placement
function callerKindForArrival(arrivedOver, transport, facts, trust = DEFAULT_SERVING_POLICY) {
  switch (arrivedOver) {
    case "session":
      return classifyCcrContainerAsk(facts);
    case "bridge":
    case "direct":
      return transport === "bridge" ? "bridge" : undefined;
    case "relay":
      return trust.approvalAttested === true ? "relayed" : undefined;
    default: {
      let other = arrivedOver;
      return;
    }
  }
}
//@ chunk-nvm0wye1.js:13929-13969 placement
var PIPE_BUFFER_BYTES_BY_PLATFORM = {
  macos: 1024,
  linux: 4096,
  wsl: 4096,
};
//@ chunk-nvm0wye1.js:13969-14223 placement
function platformPathGuard(tool, input, cwd) {
  let limitBytes = PIPE_BUFFER_BYTES_BY_PLATFORM[getPlatform()];
  if (limitBytes === undefined || tool.isMcp === true || tool.getPath === undefined || !useSecurityParser())
    return;
  try {
    let path = runInRemoteCallFrameMain(cwd, () => {
      let path = tool.getPath?.(input);
      return typeof path === "string" ? expandPath(path) : undefined;
    });
    return typeof path === "string" && Buffer.byteLength(path) >= limitBytes ? limitBytes : undefined;
  } catch {
    return;
  }
}
//@ chunk-nvm0wye1.js:14223-14236 placement
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
