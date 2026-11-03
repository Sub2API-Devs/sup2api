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
import { isIP } from "net";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u, string, E, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  persistentMonitorInputFields,
  exactlyOneSet,
  EXACTLY_ONE_SOURCE_MESSAGE,
  hasNoConflictingNetworkLists,
  ALLOWED_DOMAINS_COMMAND_ONLY,
  isValidMonitorTimeout,
  MONITOR_TIMEOUT_LIMIT_ERROR,
  boundedMonitorInputFields,
  printableCommandSchema,
  MONITOR_INPUT_DESCRIPTIONS,
  stripIpv6Brackets,
  mergeCommandNetworkLists,
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
import { currentAgentId } from "../../services/remoteTools/backgroundCommands.js";
import { isAgentStopPending } from "../../utils/agentProcessRegistry.js";
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
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { isBashAvailable } from "../../utils/shell/shellToolUtils.js";
import { getCommandField } from "../../utils/hooks/hookMatchers.js";
import { buildRuleRelevanceFilter } from "../BashTool/bashCommandShape.js";
import { hasBackgroundBashStopAfterReply } from "../AgentTool/backgroundGates.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";

//@ chunk-b91jfdd4.js:9609-9788 placement
var monitorInputSchema = DoctorLazy(() =>
  zodStrictObject({
    ...persistentMonitorInputFields(),
    ...IfConditionSchema(),
  })
    .refine((e) => exactlyOneSet(e.command, e.ws), EXACTLY_ONE_SOURCE_MESSAGE)
    .refine(hasNoConflictingNetworkLists, ALLOWED_DOMAINS_COMMAND_ONLY)
    .refine(isValidMonitorTimeout, MONITOR_TIMEOUT_LIMIT_ERROR),
);
var boundedMonitorInputSchema = DoctorLazy(() =>
  u({
    ...boundedMonitorInputFields(),
    ...IfConditionSchema(),
  })
    .refine((e) => exactlyOneSet(e.command, e.ws), EXACTLY_ONE_SOURCE_MESSAGE)
    .refine(hasNoConflictingNetworkLists, ALLOWED_DOMAINS_COMMAND_ONLY),
);
//@ chunk-b91jfdd4.js:9788-9825 placement
/**
 * 按是否允许持久监视返回 Monitor 的输入 schema。
 */
function monitorToolInputSchema() {
  return isMonitorPersistentAllowed() ? boundedMonitorInputSchema() : monitorInputSchema();
}
//@ chunk-b91jfdd4.js:9825-10080 placement
var remoteMonitorInputSchema_2 = DoctorLazy(() => {
  let e = boundedMonitorInputFields();
  let n = monitorMaxTimeoutMs();
  return u({
    ...e,
    timeout_ms: e.timeout_ms.describe(
      `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms. Deadlines above ${n}ms are capped to ${n}ms. It may also stop soon after your reply.`,
    ),
    command: printableCommandSchema().describe(MONITOR_INPUT_DESCRIPTIONS),
  });
});
//@ chunk-b91jfdd4.js:10080-10146 placement
/**
 * 无盘会话下返回远程 Monitor 的输入 schema（非对象时 undefined）。
 */
function remoteMonitorInputSchema() {
  if (!isDiskless()) return;
  let e = toolInputJsonSchema(remoteMonitorInputSchema_2());
  return isObjectSchema(e) ? e : undefined;
}
//@ chunk-b91jfdd4.js:10146-10186 placement
/**
 * 判断 schema 是否为对象类型。
 */
function isObjectSchema(e) {
  return e.type === "object";
}
//@ chunk-b91jfdd4.js:10186-10435 placement
var monitorOutputSchema = DoctorLazy(() =>
  u({
    taskId: string().describe("ID of the background monitor task."),
    timeoutMs: E().describe("Timeout deadline in milliseconds (0 when persistent)."),
    persistent: M().optional().describe("No timeout \u2014 runs until TaskStop or session end."),
  }),
);
//@ chunk-b91jfdd4.js:10435-10587 placement
function assertAgentNotStopping(monitorToolContext) {
  let n = currentAgentId(monitorToolContext);
  if (n !== undefined && isAgentStopPending(n))
    throw Error("This agent has been stopped and its stop is still completing; it cannot start monitors.");
}
//@ chunk-b91jfdd4.js:10587-10954 placement
/**
 * Monitor 权限：先看整条 Bash 规则的裁决，再按 Bash 两轮权限检查（暂停沙箱自动放行）；ask 时带上命中的 ask 规则。
 */
async function checkMonitorPermission(e, shellPermission) {
  let s = wholeBashRuleVerdict(getToolPermissionContext(shellPermission), MONITOR);
  if (s?.verdict.behavior === "deny") return s.verdict;
  let r = await bashToolHasPermissionTwoPass(
    {
      ...e,
      command: e.command,
    },
    {
      ...shellPermission,
      permissionLayers: [
        ...(shellPermission.permissionLayers ?? []),
        {
          kind: "sandbox_auto_allow_suspended",
        },
      ],
    },
  );
  if (s === null || r.behavior === "deny") return r;
  if (r.behavior === "ask") {
    let { suggestions, ...g } = r;
    return {
      ...g,
      matchedAskRule: s.rule,
    };
  }
  return s.verdict;
}
//@ chunk-b91jfdd4.js:10954-11220 placement
async function validateMonitorSandbox(e) {
  if (e.command === undefined)
    return {
      result: true,
    };
  let n = shouldUseSandbox({
    command: e.command,
  });
  let s = sandboxPolicyRefusal(n, e.command, false, "bash");
  if (s !== null) {
    logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
      tool: lit("monitor"),
    });
    return {
      result: false,
      message: s,
      errorCode: 14,
    };
  }
  return (
    checkAllowedDomainsInput(e, n) ?? {
      result: true,
    }
  );
}
//@ chunk-b91jfdd4.js:11220-13006 placement
async function checkMonitorSandbox(command, n, bounded, monitorToolContext, parentMessage) {
  let { description, timeout_ms: timeoutMs, persistent } = n;
  let { abortController, toolUseId, taskRegistry } = monitorToolContext;
  let i = currentAgentId(monitorToolContext);
  let V = shouldUseSandbox({
    command,
  });
  let O = sandboxPolicyRefusal(V, command, false, "bash");
  if (O !== null) {
    logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
      tool: lit("monitor"),
    });
    throw new SandboxPolicyRefusalError(O);
  }
  let P = {};
  let monitorDelivery = createMonitorDelivery({
    description,
    agentId: i,
    taskRef: P,
    arm: "bash",
    killTask: () => {
      if (!P.id) return false;
      killTask(P.id, taskRegistry);
      return true;
    },
  });
  let D = await exec(command, abortController.signal, "bash", {
    session: monitorToolContext.session,
    owningAgentId: i,
    preventCwdChanges: true,
    shouldUseSandbox: V,
    sandboxAttributionId: toolUseId,
    sandboxNetworkLists: takeCommandNetworkLists(toolUseId, command),
    attributionMessageId: parentMessage?.message.id,
    onStdout: monitorDelivery.onData,
    agentWorktree: monitorToolContext.agentWorktree,
    isolationRoot: isolationWorktreeFor(monitorToolContext),
    sessionEnvVars: monitorToolContext.sessionEnvVars,
    storageV5: monitorToolContext.storageV5,
  });
  if (D.status === "completed") {
    let I = await D.result;
    if (I.preSpawnError) {
      let R = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        I.preSpawnError,
        "Monitor: pre-spawn error (cwd/argv redacted)",
      );
      throw I.preSpawnErrorCode === "e2big"
        ? tagObject(R, {
            kind: "spawn_arg_limit",
          })
        : R;
    }
  }
  if (D.status === "killed") {
    await D.result;
    D.cleanup();
    if (i !== undefined && isAgentStopPending(i))
      throw Error("This agent has been stopped and its stop is still completing; it cannot start monitors.");
    throw Error("This call was interrupted before the monitor started; nothing is running.");
  }
  let m = await backgroundShellCommand(
    {
      command,
      description,
      shellCommand: D,
      toolUseId,
      agentId: i,
      kind: "monitor",
    },
    {
      abortController,
      taskRegistry,
    },
  );
  P.id = m.taskId;
  recordMonitorPlugin(m.taskId, monitorToolContext, taskRegistry);
  addAgentKeepaliveReason(i, `monitor:${m.taskId}`, taskRegistry);
  let W = persistent
    ? undefined
    : setTimeout(
        (I, R, x, agentId, q, U) => {
          if (I.isClosed()) return;
          I.flush();
          if (I.isClosed()) return;
          enqueueMonitorEvent(R, monitorTimedOutMessage(U.timeoutMs, I.eventCount(), U.bounded), x, {
            isHousekeeping: true,
            agentId,
          });
          killTask(x, q);
        },
        timeoutMs,
        monitorDelivery,
        description,
        m.taskId,
        i,
        taskRegistry,
        {
          timeoutMs,
          bounded,
        },
      );
  D.result.then(async () => {
    if (W) clearTimeout(W);
    try {
      await monitorDelivery.reportExit(m);
    } catch (error) {
      logError(error);
    } finally {
      removeKeepaliveReason(i, `monitor:${m.taskId}`, taskRegistry);
    }
  });
  return {
    data: {
      taskId: m.taskId,
      timeoutMs: persistent ? 0 : timeoutMs,
      persistent,
    },
  };
}
//@ chunk-b91jfdd4.js:13006-13434 placement
function wsEgressDenyReason(e) {
  let n = policyDeniedReason("allow_web_fetch", "Arbitrary-URL egress", "is");
  if (n !== null)
    return {
      kind: "compliance",
      host: "",
      detail: n,
    };
  let s = new URL(e);
  let r = stripIpv6Brackets(s.hostname);
  if (isIP(r) && isBlockedAddress(r))
    return {
      kind: "ssrf",
      host: r,
      detail: "the address is in a private, link-local, or cloud-metadata range",
    };
  let d = s.port !== "" ? Number(s.port) : s.protocol === "wss:" ? 443 : 80;
  let g = isHostAllowedBySandboxNetworkPolicy(r, d);
  if (!g.allowed)
    return {
      kind: "sandbox-policy",
      host: r,
      detail: g.reason,
    };
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
    e.protocols !== undefined && e.protocols.length > 0
      ? ` (subprotocols: ${formatQuotedList(e.protocols)})`
      : "";
  return {
    behavior: "ask",
    message: `Monitor will open a WebSocket to ${e.url}${s}`,
    suggestions: [],
  };
}
//@ chunk-b91jfdd4.js:13993-14632 placement
/**
 * 为 Monitor 后台命令构造惰性上下文：大多数字段透传，abortController/toolUseId 改用监控自身的信号与调用 id。
 */
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
        abortController: {
          signal: monitorScope.signal,
        },
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
      return {
        signal: monitorScope.signal,
      };
    },
  };
}
//@ chunk-b91jfdd4.js:14632-16920 placement
/**
 * Monitor 工具的完整定义对象。
 */
var MonitorToolUI = {
  name: MONITOR,
  enablesCodeExecution: true,
  maxResultSizeChars: 1e4,
  shouldDefer: true,
  userFacingName() {
    return "Monitor";
  },
  getToolUseSummary(e) {
    if (!e?.description) return null;
    return truncate(e.description, MAX_DESCRIPTION_CHARS);
  },
  getActivityDescription(e) {
    return e?.description ? `Monitoring: ${e.description}` : "Monitoring";
  },
  isEnabled() {
    return isBashAvailable();
  },
  async preparePermissionMatcher(e) {
    let commandField = getCommandField(e);
    return commandField === undefined ? () => false : buildRuleRelevanceFilter(commandField);
  },
  isConcurrencySafe() {
    return true;
  },
  renderToolUseMessage(e) {
    if (!e.description) return null;
    return e.description;
  },
  get outputSchema() {
    return monitorOutputSchema();
  },
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    let s = formatDuration(e.timeoutMs, {
      hideTrailingZeros: true,
    });
    let r = isDiskless()
      ? `expires in ${s} unless the command exits first, and may stop soon after your reply`
      : e.persistent
        ? "persistent \u2014 runs until TaskStop or session end"
        : isMonitorPersistentAllowed()
          ? `expires in ${s} unless the source ends first; you get one notice at expiry \u2014 re-arm if you still need the watch`
          : `timeout ${e.timeoutMs}ms`;
    let d =
      !isDiskless() && hasBackgroundBashStopAfterReply()
        ? `${r}; in this session it is also likely stopped a few minutes after your reply`
        : r;
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: `Monitor started (task ${e.taskId}, ${d}). You will be notified on each event. Keep working \u2014 do not poll or sleep. ${isDiskless() ? "An event that arrives after your reply is not the user's reply." : "Events may arrive while you are waiting for the user \u2014 an event is not their reply."}`,
    };
  },
};
var MONITOR_TOOL_DEFINITION = buildTool({
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
    return monitorToolInputSchema();
  },
  get inputJSONSchema() {
    return remoteMonitorInputSchema();
  },
  toAutoClassifierInput(e) {
    return e.ws ? `websocket ${e.ws.url}${subprotocolsSuffix(e.ws)}` : mergeCommandNetworkLists(e);
  },
  sandboxNetworkLists(e) {
    return getCommandNetworkLists(e);
  },
  create(parentContext) {
    return {
      permissionCheckFailureDecision(n, monitorScope) {
        let monitorToolContext = buildMonitorToolContext(parentContext, monitorScope);
        return denyCrashedCheckUnderCommandClamp(MONITOR, monitorToolContext.shellPermission);
      },
      validateInput: validateMonitorSandbox,
      async checkPermissions(n, monitorScope) {
        let monitorToolContext = buildMonitorToolContext(parentContext, monitorScope);
        if (n.ws) {
          let d = denyForBashCommandClamp("Monitor websocket", monitorToolContext.shellPermission);
          if (d !== undefined) return d;
          return checkMonitorWebSocketAllowed(n.ws);
        }
        return checkMonitorPermission(n, monitorToolContext.shellPermission);
      },
      async call(n, monitorScope) {
        let monitorToolContext = buildMonitorToolContext(parentContext, monitorScope);
        let { parentMessage } = monitorScope;
        assertAgentNotStopping(monitorToolContext);
        let bounded = isMonitorPersistentAllowed();
        let w = clampMonitorTimeout(n, bounded);
        if (n.ws)
          return runWebSocketMonitor(
            {
              ...n,
              ...w,
              bounded,
              ws: n.ws,
            },
            pickMonitorContext(monitorToolContext),
          );
        return checkMonitorSandbox(
          n.command,
          {
            ...n,
            ...w,
          },
          bounded,
          monitorToolContext,
          parentMessage,
        );
      },
    };
  },
});
var MonitorTool = MONITOR_TOOL_DEFINITION;
export { wsEgressDenyReason };
