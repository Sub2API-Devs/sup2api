/**
 * tools/MonitorTool/MonitorTool.ts
 *
 * Monitor 工具（沙箱检查、界面）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b91jfdd4.js (14)
 * attribution: placement 14
 */
import { isIP, isIP as isIP_2 } from "net";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u, o, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  persistentMonitorInputFields,
  re,
  le,
  ie,
  se,
  Te,
  Ce,
  boundedMonitorInputFields,
  te,
  MONITOR_INPUT_DESCRIPTIONS,
  J,
  _e,
  runWebSocketMonitor,
  pickMonitorContext,
} from "./websocketMonitor.js";
import { IfConditionSchema } from "../../schemas/hooks.js";
import {
  isMonitorPersistentAllowed,
  monitorMaxTimeoutMs,
  MONITOR_DEFAULT_TIMEOUT_MS,
  monitorTimedOutMessage,
  monitorToolPrompt,
  WS_SOURCE_PARAGRAPH,
  monitorEventGuidance,
  clampMonitorTimeout,
} from "./prompt.js";
import { isDiskless } from "../../bootstrap/state.js";
import { toolInputJsonSchema } from "../../plugins/functionHooks/types/builtinToolSchemas.js";
import { aie } from "../../services/remoteTools/backgroundCommands.js";
import { hW } from "../../utils/agentProcessRegistry.js";
import { wholeBashRuleVerdict } from "../../utils/permissions/filterToolsByDenyRules.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { MONITOR } from "./constants.js";
import {
  bashToolHasPermissionTwoPass,
  denyCrashedCheckUnderCommandClamp,
  denyForBashCommandClamp,
} from "../BashTool/bashPermissions.js";
import { shouldUseSandbox, sandboxPolicyRefusal } from "../BashTool/shouldUseSandbox.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import {
  checkAllowedDomainsInput,
  takeCommandNetworkLists,
  getCommandNetworkLists,
} from "../BashTool/sandboxNetwork.js";
import {
  SandboxPolicyRefusalError,
  isHostAllowedBySandboxNetworkPolicy,
} from "../../utils/sandbox/sandbox-adapter.js";
import {
  createMonitorDelivery,
  recordMonitorPlugin,
  enqueueMonitorEvent,
} from "../../tasks/MonitorTask/monitorDelivery.js";
import { killTask } from "../../tasks/LocalShellTask/killShellTasks.js";
import { exec } from "../../utils/Shell.js";
import { isolationWorktreeFor } from "../../utils/worktreeIsolation.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { backgroundShellCommand } from "../../tasks/LocalShellTask/LocalShellTask.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { logError } from "../../utils/log.js";
import { removeKeepaliveReason } from "../../utils/task/framework.js";
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { isBlockedAddress } from "../../utils/hooks/ssrfGuard.js";
import { formatQuotedList, subprotocolsSuffix } from "../../utils/websocketSummary.js";
import { truncate, formatDuration } from "../../utils/format.js";
import { JT } from "../../constants/outputLimits.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import { getCommandField } from "../../utils/hooks/hookMatchers.js";
import { buildRuleRelevanceFilter } from "../BashTool/bashCommandShape.js";
import { T_ } from "../AgentTool/backgroundGates.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";

//@ chunk-b91jfdd4.js:9609-9788 placement
var monitorInputSchema = DoctorLazy(() =>
    zodStrictObject({ ...persistentMonitorInputFields(), ...IfConditionSchema() })
      .refine((e) => re(e.command, e.ws), le)
      .refine(ie, se)
      .refine(Te, Ce),
  ),
  boundedMonitorInputSchema = DoctorLazy(() =>
    u({ ...boundedMonitorInputFields(), ...IfConditionSchema() })
      .refine((e) => re(e.command, e.ws), le)
      .refine(ie, se),
  );
//@ chunk-b91jfdd4.js:9788-9825 placement
function De() {
  return isMonitorPersistentAllowed() ? boundedMonitorInputSchema() : monitorInputSchema();
}
//@ chunk-b91jfdd4.js:9825-10080 placement
var remoteMonitorInputSchema = DoctorLazy(() => {
  let e = boundedMonitorInputFields(),
    n = monitorMaxTimeoutMs();
  return u({
    ...e,
    timeout_ms: e.timeout_ms.describe(
      `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms. Deadlines above ${n}ms are capped to ${n}ms. It may also stop soon after your reply.`,
    ),
    command: te().describe(MONITOR_INPUT_DESCRIPTIONS),
  });
});
//@ chunk-b91jfdd4.js:10080-10146 placement
function Ee() {
  if (!isDiskless()) return;
  let e = toolInputJsonSchema(remoteMonitorInputSchema());
  return Ae(e) ? e : void 0;
}
//@ chunk-b91jfdd4.js:10146-10186 placement
function Ae(e) {
  return e.type === "object";
}
//@ chunk-b91jfdd4.js:10186-10435 placement
var monitorOutputSchema = DoctorLazy(() =>
  u({
    taskId: o().describe("ID of the background monitor task."),
    timeoutMs: E().describe("Timeout deadline in milliseconds (0 when persistent)."),
    persistent: M().optional().describe("No timeout \u2014 runs until TaskStop or session end."),
  }),
);
//@ chunk-b91jfdd4.js:10435-10587 placement
function assertAgentNotStopping(e) {
  let n = aie(e);
  if (n !== void 0 && hW(n))
    throw Error("This agent has been stopped and its stop is still completing; it cannot start monitors.");
}
/**
 * Monitor 权限：先看整条 Bash 规则的裁决，再按 Bash 两轮权限检查（暂停沙箱自动放行）；ask 时带上命中的 ask 规则。
 */
//@ chunk-b91jfdd4.js:10587-10954 placement
async function checkMonitorPermission(e, n) {
  let s = wholeBashRuleVerdict(getToolPermissionContext(n), MONITOR);
  if (s?.verdict.behavior === "deny") return s.verdict;
  let r = await bashToolHasPermissionTwoPass(
    { ...e, command: e.command },
    { ...n, permissionLayers: [...(n.permissionLayers ?? []), { kind: "sandbox_auto_allow_suspended" }] },
  );
  if (s === null || r.behavior === "deny") return r;
  if (r.behavior === "ask") {
    let { suggestions: suggestions, ...g } = r;
    return { ...g, matchedAskRule: s.rule };
  }
  return s.verdict;
}
//@ chunk-b91jfdd4.js:10954-11220 placement
async function validateMonitorSandbox(e) {
  if (e.command === void 0) return { result: !0 };
  let n = shouldUseSandbox({ command: e.command }),
    s = sandboxPolicyRefusal(n, e.command, !1, "bash");
  if (s !== null)
    return (
      logFeatureSad("sandbox_exec", "sandbox_policy_refusal", { tool: lit("monitor") }),
      { result: !1, message: s, errorCode: 14 }
    );
  return checkAllowedDomainsInput(e, n) ?? { result: !0 };
}
//@ chunk-b91jfdd4.js:11220-13006 placement
async function checkMonitorSandbox(e, n, s, r, d) {
  let { description: description, timeout_ms: timeout_ms, persistent: persistent } = n,
    { abortController: abortController, toolUseId: toolUseId, taskRegistry: taskRegistry } = r,
    i = aie(r),
    V = shouldUseSandbox({ command: e }),
    O = sandboxPolicyRefusal(V, e, !1, "bash");
  if (O !== null)
    throw (
      logFeatureSad("sandbox_exec", "sandbox_policy_refusal", { tool: lit("monitor") }),
      new SandboxPolicyRefusalError(O)
    );
  let P = {},
    L = createMonitorDelivery({
      description: description,
      agentId: i,
      taskRef: P,
      arm: "bash",
      killTask: () => {
        if (!P.id) return !1;
        return (killTask(P.id, taskRegistry), !0);
      },
    }),
    D = await exec(e, abortController.signal, "bash", {
      session: r.session,
      owningAgentId: i,
      preventCwdChanges: !0,
      shouldUseSandbox: V,
      sandboxAttributionId: toolUseId,
      sandboxNetworkLists: takeCommandNetworkLists(toolUseId, e),
      attributionMessageId: d?.message.id,
      onStdout: L.onData,
      agentWorktree: r.agentWorktree,
      isolationRoot: isolationWorktreeFor(r),
      sessionEnvVars: r.sessionEnvVars,
      storageV5: r.storageV5,
    });
  if (D.status === "completed") {
    let I = await D.result;
    if (I.preSpawnError) {
      let R = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        I.preSpawnError,
        "Monitor: pre-spawn error (cwd/argv redacted)",
      );
      throw I.preSpawnErrorCode === "e2big" ? tagObject(R, { kind: "spawn_arg_limit" }) : R;
    }
  }
  if (D.status === "killed") {
    if ((await D.result, D.cleanup(), i !== void 0 && hW(i)))
      throw Error("This agent has been stopped and its stop is still completing; it cannot start monitors.");
    throw Error("This call was interrupted before the monitor started; nothing is running.");
  }
  let m = await backgroundShellCommand(
    {
      command: e,
      description: description,
      shellCommand: D,
      toolUseId: toolUseId,
      agentId: i,
      kind: "monitor",
    },
    { abortController: abortController, taskRegistry: taskRegistry },
  );
  ((P.id = m.taskId),
    recordMonitorPlugin(m.taskId, r, taskRegistry),
    addAgentKeepaliveReason(i, `monitor:${m.taskId}`, taskRegistry));
  let W = persistent
    ? void 0
    : setTimeout(
        (I, R, x, z, q, U) => {
          if (I.isClosed()) return;
          if ((I.flush(), I.isClosed())) return;
          (enqueueMonitorEvent(R, monitorTimedOutMessage(U.timeoutMs, I.eventCount(), U.bounded), x, {
            isHousekeeping: !0,
            agentId: z,
          }),
            killTask(x, q));
        },
        timeout_ms,
        L,
        description,
        m.taskId,
        i,
        taskRegistry,
        { timeoutMs: timeout_ms, bounded: s },
      );
  return (
    D.result.then(async () => {
      if (W) clearTimeout(W);
      try {
        await L.reportExit(m);
      } catch (error) {
        logError(error);
      } finally {
        removeKeepaliveReason(i, `monitor:${m.taskId}`, taskRegistry);
      }
    }),
    { data: { taskId: m.taskId, timeoutMs: persistent ? 0 : timeout_ms, persistent: persistent } }
  );
}
//@ chunk-b91jfdd4.js:13006-13434 placement
function wsEgressDenyReason(e) {
  let n = policyDeniedReason("allow_web_fetch", "Arbitrary-URL egress", "is");
  if (n !== null) return { kind: "compliance", host: "", detail: n };
  let s = new URL(e),
    r = J(s.hostname);
  if (isIP(r) && isBlockedAddress(r))
    return {
      kind: "ssrf",
      host: r,
      detail: "the address is in a private, link-local, or cloud-metadata range",
    };
  let d = s.port !== "" ? Number(s.port) : s.protocol === "wss:" ? 443 : 80,
    g = isHostAllowedBySandboxNetworkPolicy(r, d);
  if (!g.allowed) return { kind: "sandbox-policy", host: r, detail: g.reason };
  return null;
}
//@ chunk-b91jfdd4.js:13434-13993 placement
function checkMonitorWebSocketAllowed(e) {
  let n = wsEgressDenyReason(e.url);
  if (n !== null)
    return {
      behavior: "deny",
      message:
        n.kind === "compliance"
          ? `Monitor cannot open a WebSocket. ${n.detail}`
          : `Monitor cannot open a WebSocket to ${n.host}: ${n.detail}.`,
      decisionReason: {
        type: "other",
        reason:
          n.kind === "compliance"
            ? "organization policy disables model-chosen URL egress"
            : n.kind === "ssrf"
              ? "SSRF-blocked address range"
              : n.detail,
      },
    };
  let s =
    e.protocols !== void 0 && e.protocols.length > 0
      ? ` (subprotocols: ${formatQuotedList(e.protocols)})`
      : "";
  return { behavior: "ask", message: `Monitor will open a WebSocket to ${e.url}${s}`, suggestions: [] };
}
/**
 * 为 Monitor 后台命令构造惰性上下文：大多数字段透传，abortController/toolUseId 改用监控自身的信号与调用 id。
 */
//@ chunk-b91jfdd4.js:13993-14632 placement
function buildMonitorToolContext(parentContext, monitorScope) {
  return {
    get session() {
      return parentContext.session;
    },
    get hookCaller() {
      return parentContext.hookCaller;
    },
    get hookServesModel() {
      return parentContext.hookServesModel;
    },
    get storageV5() {
      return parentContext.storageV5;
    },
    get credentials() {
      return parentContext.credentials;
    },
    get agentId() {
      return parentContext.agentId;
    },
    get agentWorktree() {
      return parentContext.agentWorktree;
    },
    get taskRegistry() {
      return parentContext.taskRegistry;
    },
    get sessionEnvVars() {
      return parentContext.sessionEnvVars;
    },
    get shellPermission() {
      return {
        ...parentContext.shellPermission,
        abortController: { signal: monitorScope.signal },
        toolUseId: monitorScope.toolUseId,
      };
    },
    get mcpState() {
      return parentContext.mcpState;
    },
    get getMcp() {
      return parentContext.mcpState;
    },
    get toolUseId() {
      return monitorScope.toolUseId;
    },
    get abortController() {
      return { signal: monitorScope.signal };
    },
  };
}
//@ chunk-b91jfdd4.js:14632-16920 placement
var MonitorToolUI = {
    name: MONITOR,
    enablesCodeExecution: !0,
    maxResultSizeChars: 1e4,
    shouldDefer: !0,
    userFacingName() {
      return "Monitor";
    },
    getToolUseSummary(e) {
      if (!e?.description) return null;
      return truncate(e.description, JT);
    },
    getActivityDescription(e) {
      return e?.description ? `Monitoring: ${e.description}` : "Monitoring";
    },
    isEnabled() {
      return isBashAvailable();
    },
    async preparePermissionMatcher(e) {
      let n = getCommandField(e);
      return n === void 0 ? () => !1 : buildRuleRelevanceFilter(n);
    },
    isConcurrencySafe() {
      return !0;
    },
    renderToolUseMessage(e) {
      if (!e.description) return null;
      return e.description;
    },
    get outputSchema() {
      return monitorOutputSchema();
    },
    mapToolResultToToolResultBlockParam(e, n) {
      let s = formatDuration(e.timeoutMs, { hideTrailingZeros: !0 }),
        r = isDiskless()
          ? `expires in ${s} unless the command exits first, and may stop soon after your reply`
          : e.persistent
            ? "persistent \u2014 runs until TaskStop or session end"
            : isMonitorPersistentAllowed()
              ? `expires in ${s} unless the source ends first; you get one notice at expiry \u2014 re-arm if you still need the watch`
              : `timeout ${e.timeoutMs}ms`,
        d =
          !isDiskless() && T_()
            ? `${r}; in this session it is also likely stopped a few minutes after your reply`
            : r;
      return {
        tool_use_id: n,
        type: "tool_result",
        content: `Monitor started (task ${e.taskId}, ${d}). You will be notified on each event. Keep working \u2014 do not poll or sleep. ${isDiskless() ? "An event that arrives after your reply is not the user's reply." : "Events may arrive while you are waiting for the user \u2014 an event is not their reply."}`,
      };
    },
  },
  Ue = buildTool({
    ...MonitorToolUI,
    backgrounding: "never",
    searchHint:
      "watch, monitor, or keep an eye on a process/log/command or WebSocket \u2014 stream each stdout line as a live notification",
    async description() {
      return monitorToolPrompt() + (isDiskless() ? "" : WS_SOURCE_PARAGRAPH) + monitorEventGuidance();
    },
    async prompt() {
      return monitorToolPrompt() + (isDiskless() ? "" : WS_SOURCE_PARAGRAPH) + monitorEventGuidance();
    },
    get inputSchema() {
      return De();
    },
    get inputJSONSchema() {
      return Ee();
    },
    toAutoClassifierInput(e) {
      return e.ws ? `websocket ${e.ws.url}${subprotocolsSuffix(e.ws)}` : _e(e);
    },
    sandboxNetworkLists(e) {
      return getCommandNetworkLists(e);
    },
    create(e) {
      return {
        permissionCheckFailureDecision(n, s) {
          let r = buildMonitorToolContext(e, s);
          return denyCrashedCheckUnderCommandClamp(MONITOR, r.shellPermission);
        },
        validateInput: validateMonitorSandbox,
        async checkPermissions(n, s) {
          let r = buildMonitorToolContext(e, s);
          if (n.ws) {
            let d = denyForBashCommandClamp("Monitor websocket", r.shellPermission);
            if (d !== void 0) return d;
            return checkMonitorWebSocketAllowed(n.ws);
          }
          return checkMonitorPermission(n, r.shellPermission);
        },
        async call(n, s) {
          let r = buildMonitorToolContext(e, s),
            { parentMessage: parentMessage } = s;
          assertAgentNotStopping(r);
          let g = isMonitorPersistentAllowed(),
            w = clampMonitorTimeout(n, g);
          if (n.ws) return runWebSocketMonitor({ ...n, ...w, bounded: g, ws: n.ws }, pickMonitorContext(r));
          return checkMonitorSandbox(n.command, { ...n, ...w }, g, r, parentMessage);
        },
      };
    },
  }),
  MonitorTool = Ue;

export { wsEgressDenyReason };
