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
import { TFe } from "../protocolConstants.js";
import { B7, toWireSyncAnswer, SYNC_ANSWER_VERSION } from "../../../services/remoteTools/shellForwarding.js";
import { ut, SESSION_APPROVAL_LIMITS } from "./servingState.js";
import { logForDebugging } from "../../../utils/debug.js";
import { wlr, REMOTE_TOOL_LIMITS } from "../protocolSchemas.js";
import { c0e } from "../../../utils/hooks/servedHooks/hookSandbox.js";
import {
  SANDBOX_OVERRIDE_INPUT_KEYS,
  wgt,
  sandboxDefaultPolicy,
} from "../../../utils/sandbox/sandboxDefaultPolicy.js";
import { SERVED_BACKGROUND_LIMITS } from "./backgroundCommands.js";
import {
  callerSessionsLimit,
  remoteToolServingPolicyName,
} from "../../../services/remoteTools/servingGates.js";
import { MAX_CALLER_SESSIONS } from "./pendingAsks.js";
import { isServedCornerEnabled } from "./servingFlags.js";
import { iie, P6 } from "../../../services/remoteTools/backgroundCommands.js";
import { TASKSTOP } from "../../../tools/TaskStopTool/prompt.js";
import { getToolRemoteExecution } from "../../../Tool.js";
import { RTe, mergeServingPolicy } from "../../../services/remoteTools/pathMapping.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { shouldMaintainProjectWorkingDir } from "../../../utils/envUtils.js";
import { uf } from "../../../tools/AgentTool/backgroundGates.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { zodStrictObject, U, T, hu, Ue, o } from "../../../../vendor/zod/v4/classic/schemas.js";
import { classifyCcrContainerAsk } from "./servedSafetyChecks.js";
import { getPlatform } from "../../../utils/platform.js";
import { nLe } from "../../../tools/BashTool/readOnlyShellCheck.js";
import { Yg } from "../../remoteMode.js";
import { expandPath } from "../../../utils/path.js";

//@ chunk-ad2e1aj6.js:9982-10423 placement
function servedAskWaitMs() {
  let e;
  try {
    let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_spruce", null),
      safeParse = ASK_WAIT_SCHEMA().safeParse(n);
    if (safeParse.success && Number.isInteger(safeParse.data.askWaitMs)) {
      if (safeParse.data.askWaitMs >= TFe.max_ask_ms && safeParse.data.askWaitMs <= B7 - ut)
        return safeParse.data.askWaitMs;
      e = "out_of_range";
    } else e = n === null || n === void 0 ? "absent" : "wrong_type";
  } catch {
    e = "unreadable";
  }
  logForDebugging(
    `[remote-tools] tengu_violin_spruce not used (${e}): approval cards keep the built-in wait`,
    { level: e === "absent" ? "debug" : "warn" },
  );
  return;
}
//@ chunk-ad2e1aj6.js:10423-11011 placement
var SERVING_POLICY_DEFAULTS = 58000,
  ar = wlr,
  dr = 4,
  lr = {
    sandbox: "tool_default",
    background: "forbidden",
    pinCwd: !1,
    scrubCredentialEnv: !1,
    maxTimeoutMs: void 0,
    get additionalDenyRead() {
      return c0e();
    },
    get additionalDenyWrite() {
      return c0e();
    },
  },
  ur = SANDBOX_OVERRIDE_INPUT_KEYS,
  mr = "Commands start in the project folder.",
  fr = "A cd inside it carries over.",
  pr = "A cd does not carry over.",
  gr =
    "This machine's rules, hooks and sandbox settings apply (a hook can block or rewrite a call, never pre-approve it). Approvals are asked in this session.",
  hr = "No background commands.",
  yr = `Up to ${SERVED_BACKGROUND_LIMITS} background Bash commands, stopped when this machine detaches.`;
/**
 * "local_parity" 服务策略：个人机器、需要信封、设备绑定准入、沙箱/后台/凭证擦除等约束。
 */
//@ chunk-ad2e1aj6.js:11011-12063 placement
function localParityPolicy(e = {}) {
  let n = e.backgroundShells?.() === !0;
  return {
    name: "local_parity",
    kind: "personal_machine",
    requireEnvelope: !0,
    admission: "device_binding",
    stance: {
      mode: "session",
      honorLocalRules: !0,
      onAsk: "session",
      askOnDestructive: !1,
      unattended: "own_record",
    },
    limits: {
      max_call_ms: SERVING_POLICY_DEFAULTS,
      max_request_bytes: ar,
      max_in_flight: dr,
      caller_sessions_max: callerSessionsLimit() ?? MAX_CALLER_SESSIONS,
      pending_asks_max: wgt,
      progress_interval_ms: TFe.progress_interval_ms,
      progress_misses: TFe.progress_misses,
      ...(isServedCornerEnabled() && { max_ask_ms: servedAskWaitMs() ?? SESSION_APPROVAL_LIMITS }),
    },
    capabilities: [
      "progress_checks",
      "standing_approvals",
      "plan_classifier",
      ...(n ? ["background_shells"] : []),
    ],
    serves: (h) => (iie.has(h.name) || (n && h.name === TASKSTOP)) && getToolRemoteExecution(h).supported,
    constraints: (h, r, i = RTe) => {
      let y = getToolRemoteExecution(h);
      return mergeServingPolicy(lr, y.supported ? y.tighten : void 0);
    },
    refusedInputFields: (h) => {
      let r = getToolRemoteExecution(h);
      return (r.supported ? (r.refusedInputFields ?? []) : []).filter(
        (y) =>
          !ur.has(y) &&
          !(y === "run_in_background" && h.name === BASH_TOOL_NAME && n && e.backgroundShells?.() === !0),
      );
    },
    ...(n &&
      e.backgroundShells && {
        backgroundShells: { maxPerSession: SERVED_BACKGROUND_LIMITS, enabled: e.backgroundShells },
      }),
    notes: () => [mr, shouldMaintainProjectWorkingDir() ? pr : fr, gr, n ? yr : hr].join(" "),
  };
}
//@ chunk-ad2e1aj6.js:12063-12149 placement
function resolveServingPolicy(e = remoteToolServingPolicyName()) {
  return e === "parity"
    ? localParityPolicy({ backgroundShells: () => P6() && !uf() })
    : sandboxDefaultPolicy();
}
//@ chunk-ad2e1aj6.js:12186-12559 placement
function deviceFrame(e, n, s) {
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
      instanceId: n,
      sequence: s,
    },
    outcome:
      e.kind === "failed" || e.kind === "kept_here"
        ? { kind: e.kind, reason: e.reason }
        : { kind: e.kind === "queued" ? "unchanged" : e.kind },
  });
}
//@ chunk-ad2e1aj6.js:12559-12675 placement
function parseExecutionMode(e) {
  let safeParse = Sr().safeParse(e);
  return safeParse.success ? safeParse.data : { mode: "vm", availability: () => ({ state: "unavailable" }) };
}
//@ chunk-ad2e1aj6.js:12675-13083 placement
var EXECUTION_MODE_SCHEMAS = DoctorLazy(() =>
    zodStrictObject({ state: U(["ready", "starting", "unavailable"]) }),
  ),
  Ln = DoctorLazy(() => zodStrictObject({ mode: T("in_process") })),
  Mn = DoctorLazy(() => zodStrictObject({ mode: T("vm"), availability: hu((e) => typeof e === "function") })),
  Sr = DoctorLazy(() => Ue([Ln(), Mn()])),
  Mi = DoctorLazy(() =>
    Ue([
      Ln(),
      zodStrictObject({
        ...Mn().shape,
        executor: hu((e) => typeof e === "function"),
        notes: o().max(REMOTE_TOOL_LIMITS).optional(),
        copy: zodStrictObject({
          platform: o(),
          workingDir: o(),
          shell: o(),
          tools: hu((e) => typeof e === "function"),
        }).optional(),
      }),
    ]),
  );
//@ chunk-ad2e1aj6.js:13083-13206 placement
function arrivesOverSession(e) {
  switch (e) {
    case "session":
      return !0;
    case "bridge":
    case "direct":
    case "relay":
      return !1;
    default: {
      let n = e;
      return !1;
    }
  }
}
//@ chunk-ad2e1aj6.js:13206-13372 placement
function acceptsArrival(e, n) {
  switch (e) {
    case "session":
      return n === "session";
    case "bridge":
    case "direct":
      return n !== "relay";
    case "relay":
      return n === "relay";
    default: {
      let s = e;
      return !1;
    }
  }
}
//@ chunk-ad2e1aj6.js:13372-13583 placement
function callerKindForArrival(e, n, s, h = RTe) {
  switch (e) {
    case "session":
      return classifyCcrContainerAsk(s);
    case "bridge":
    case "direct":
      return n === "bridge" ? "bridge" : void 0;
    case "relay":
      return h.approvalAttested === !0 ? "relayed" : void 0;
    default: {
      let r = e;
      return;
    }
  }
}
//@ chunk-ad2e1aj6.js:13583-13623 placement
var _r = { macos: 1024, linux: 4096, wsl: 4096 };
//@ chunk-ad2e1aj6.js:13623-13877 placement
function platformPathGuard(e, n, s) {
  let h = _r[getPlatform()];
  if (h === void 0 || e.isMcp === !0 || e.getPath === void 0 || !nLe()) return;
  try {
    let r = Yg(s, () => {
      let i = e.getPath?.(n);
      return typeof i === "string" ? expandPath(i) : void 0;
    });
    return typeof r === "string" && Buffer.byteLength(r) >= h ? h : void 0;
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
