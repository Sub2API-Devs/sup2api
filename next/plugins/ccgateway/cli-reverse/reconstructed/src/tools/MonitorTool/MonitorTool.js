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
import {
  zodStrictObject,
  objectSchema,
  stringSchema,
  numberSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b91jfdd4.js:9609-9788 placement
var monitorInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var boundedMonitorInputSchema;
deferInit("chunk-b91jfdd4.js:9609", () => {
  monitorInputSchema = DoctorLazy(() =>
    zodStrictObject({
      ...persistentMonitorInputFields(),
      ...IfConditionSchema(),
    })
      .refine((input) => exactlyOneSet(input.command, input.ws), EXACTLY_ONE_SOURCE_MESSAGE)
      .refine(hasNoConflictingNetworkLists, ALLOWED_DOMAINS_COMMAND_ONLY)
      .refine(isValidMonitorTimeout, MONITOR_TIMEOUT_LIMIT_ERROR),
  );
  boundedMonitorInputSchema = DoctorLazy(() =>
    objectSchema({
      ...boundedMonitorInputFields(),
      ...IfConditionSchema(),
    })
      .refine((input) => exactlyOneSet(input.command, input.ws), EXACTLY_ONE_SOURCE_MESSAGE)
      .refine(hasNoConflictingNetworkLists, ALLOWED_DOMAINS_COMMAND_ONLY),
  );
});
//@ chunk-b91jfdd4.js:9788-9825 placement
/**
 * 按是否允许持久监视返回 Monitor 的输入 schema。
 */
function monitorToolInputSchema() {
  return isMonitorPersistentAllowed() ? boundedMonitorInputSchema() : monitorInputSchema();
}
//@ chunk-b91jfdd4.js:9825-10080 placement
var remoteMonitorInputSchema_2; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b91jfdd4.js:9825", () => {
  remoteMonitorInputSchema_2 = DoctorLazy(() => {
    let baseFields = boundedMonitorInputFields();
    let maxTimeoutMs = monitorMaxTimeoutMs();
    return objectSchema({
      ...baseFields,
      timeout_ms: baseFields.timeout_ms.describe(
        `Kill the monitor after this deadline. Default ${MONITOR_DEFAULT_TIMEOUT_MS}ms. Deadlines above ${maxTimeoutMs}ms are capped to ${maxTimeoutMs}ms. It may also stop soon after your reply.`,
      ),
      command: printableCommandSchema().describe(MONITOR_INPUT_DESCRIPTIONS),
    });
  });
});
//@ chunk-b91jfdd4.js:10080-10146 placement
/**
 * 无盘会话下返回远程 Monitor 的输入 schema（非对象时 undefined）。
 */
function remoteMonitorInputSchema() {
  if (!isDiskless()) return;
  let schema = toolInputJsonSchema(remoteMonitorInputSchema_2());
  return isObjectSchema(schema) ? schema : undefined;
}
//@ chunk-b91jfdd4.js:10146-10186 placement
/**
 * 判断 schema 是否为对象类型。
 */
function isObjectSchema(schema) {
  return schema.type === "object";
}
//@ chunk-b91jfdd4.js:10186-10435 placement
var monitorOutputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b91jfdd4.js:10186", () => {
  monitorOutputSchema = DoctorLazy(() =>
    objectSchema({
      taskId: stringSchema().describe("ID of the background monitor task."),
      timeoutMs: numberSchema().describe("Timeout deadline in milliseconds (0 when persistent)."),
      persistent: booleanSchema()
        .optional()
        .describe("No timeout \u2014 runs until TaskStop or session end."),
    }),
  );
});
//@ chunk-b91jfdd4.js:10435-10587 placement
function assertAgentNotStopping(monitorToolContext) {
  let agentId = currentAgentId(monitorToolContext);
  if (agentId !== undefined && isAgentStopPending(agentId))
    throw Error("This agent has been stopped and its stop is still completing; it cannot start monitors.");
}
//@ chunk-b91jfdd4.js:10587-10954 placement
/**
 * Monitor 权限：先看整条 Bash 规则的裁决，再按 Bash 两轮权限检查（暂停沙箱自动放行）；ask 时带上命中的 ask 规则。
 */
async function checkMonitorPermission(input, shellPermission) {
  let ruleVerdict = wholeBashRuleVerdict(getToolPermissionContext(shellPermission), MONITOR);
  if (ruleVerdict?.verdict.behavior === "deny") return ruleVerdict.verdict;
  let bashVerdict = await bashToolHasPermissionTwoPass(
    {
      ...input,
      command: input.command,
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
  if (ruleVerdict === null || bashVerdict.behavior === "deny") return bashVerdict;
  if (bashVerdict.behavior === "ask") {
    let { suggestions, ...verdictWithoutSuggestions } = bashVerdict;
    return {
      ...verdictWithoutSuggestions,
      matchedAskRule: ruleVerdict.rule,
    };
  }
  return ruleVerdict.verdict;
}
//@ chunk-b91jfdd4.js:10954-11220 placement
async function validateMonitorSandbox(input) {
  if (input.command === undefined)
    return {
      result: true,
    };
  let sandboxDecision = shouldUseSandbox({
    command: input.command,
  });
  let policyRefusal = sandboxPolicyRefusal(sandboxDecision, input.command, false, "bash");
  if (policyRefusal !== null) {
    logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
      tool: lit("monitor"),
    });
    return {
      result: false,
      message: policyRefusal,
      errorCode: 14,
    };
  }
  return (
    checkAllowedDomainsInput(input, sandboxDecision) ?? {
      result: true,
    }
  );
}
//@ chunk-b91jfdd4.js:11220-13006 placement
async function checkMonitorSandbox(command, input, bounded, taskRegistry, parentMessage) {
  let { description, timeout_ms: timeoutMs, persistent } = input;
  let { abortController, toolUseId, taskRegistry: taskRegistry_2 } = taskRegistry;
  let agentId = currentAgentId(taskRegistry);
  let sandboxDecision = shouldUseSandbox({
    command,
  });
  let policyRefusal = sandboxPolicyRefusal(sandboxDecision, command, false, "bash");
  if (policyRefusal !== null) {
    logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
      tool: lit("monitor"),
    });
    throw new SandboxPolicyRefusalError(policyRefusal);
  }
  let taskRef = {};
  let monitorDelivery = createMonitorDelivery({
    description,
    agentId,
    taskRef,
    arm: "bash",
    killTask: () => {
      if (!taskRef.id) return false;
      killTask(taskRef.id, taskRegistry_2);
      return true;
    },
  });
  let execResult = await exec(command, abortController.signal, "bash", {
    session: taskRegistry.session,
    owningAgentId: agentId,
    preventCwdChanges: true,
    shouldUseSandbox: sandboxDecision,
    sandboxAttributionId: toolUseId,
    sandboxNetworkLists: takeCommandNetworkLists(toolUseId, command),
    attributionMessageId: parentMessage?.message.id,
    onStdout: monitorDelivery.onData,
    agentWorktree: taskRegistry.agentWorktree,
    isolationRoot: isolationWorktreeFor(taskRegistry),
    sessionEnvVars: taskRegistry.sessionEnvVars,
    storageV5: taskRegistry.storageV5,
  });
  if (execResult.status === "completed") {
    let spawnResult = await execResult.result;
    if (spawnResult.preSpawnError) {
      let preSpawnError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        spawnResult.preSpawnError,
        "Monitor: pre-spawn error (cwd/argv redacted)",
      );
      throw spawnResult.preSpawnErrorCode === "e2big"
        ? tagObject(preSpawnError, {
            kind: "spawn_arg_limit",
          })
        : preSpawnError;
    }
  }
  if (execResult.status === "killed") {
    await execResult.result;
    execResult.cleanup();
    if (agentId !== undefined && isAgentStopPending(agentId))
      throw Error("This agent has been stopped and its stop is still completing; it cannot start monitors.");
    throw Error("This call was interrupted before the monitor started; nothing is running.");
  }
  let backgroundTask = await backgroundShellCommand(
    {
      command,
      description,
      shellCommand: execResult,
      toolUseId,
      agentId,
      kind: "monitor",
    },
    {
      abortController,
      taskRegistry: taskRegistry_2,
    },
  );
  taskRef.id = backgroundTask.taskId;
  recordMonitorPlugin(backgroundTask.taskId, taskRegistry, taskRegistry_2);
  addAgentKeepaliveReason(agentId, `monitor:${backgroundTask.taskId}`, taskRegistry_2);
  let timeoutTimer = persistent
    ? undefined
    : setTimeout(
        (delivery, taskDescription, taskId, agentId, registry, timeoutInfo) => {
          if (delivery.isClosed()) return;
          delivery.flush();
          if (delivery.isClosed()) return;
          enqueueMonitorEvent(
            taskDescription,
            monitorTimedOutMessage(timeoutInfo.timeoutMs, delivery.eventCount(), timeoutInfo.bounded),
            taskId,
            {
              isHousekeeping: true,
              agentId,
            },
          );
          killTask(taskId, registry);
        },
        timeoutMs,
        monitorDelivery,
        description,
        backgroundTask.taskId,
        agentId,
        taskRegistry_2,
        {
          timeoutMs,
          bounded,
        },
      );
  execResult.result.then(async () => {
    if (timeoutTimer) clearTimeout(timeoutTimer);
    try {
      await monitorDelivery.reportExit(backgroundTask);
    } catch (error) {
      logError(error);
    } finally {
      removeKeepaliveReason(agentId, `monitor:${backgroundTask.taskId}`, taskRegistry_2);
    }
  });
  return {
    data: {
      taskId: backgroundTask.taskId,
      timeoutMs: persistent ? 0 : timeoutMs,
      persistent,
    },
  };
}
//@ chunk-b91jfdd4.js:13006-13434 placement
function wsEgressDenyReason(url) {
  let policyReason = policyDeniedReason("allow_web_fetch", "Arbitrary-URL egress", "is");
  if (policyReason !== null)
    return {
      kind: "compliance",
      host: "",
      detail: policyReason,
    };
  let parsedUrl = new URL(url);
  let hostname = stripIpv6Brackets(parsedUrl.hostname);
  if (isIP(hostname) && isBlockedAddress(hostname))
    return {
      kind: "ssrf",
      host: hostname,
      detail: "the address is in a private, link-local, or cloud-metadata range",
    };
  let port = parsedUrl.port !== "" ? Number(parsedUrl.port) : parsedUrl.protocol === "wss:" ? 443 : 80;
  let policyVerdict = isHostAllowedBySandboxNetworkPolicy(hostname, port);
  if (!policyVerdict.allowed)
    return {
      kind: "sandbox-policy",
      host: hostname,
      detail: policyVerdict.reason,
    };
  return null;
}
//@ chunk-b91jfdd4.js:13434-13993 placement
function checkMonitorWebSocketAllowed(wsRequest) {
  let denyReason = wsEgressDenyReason(wsRequest.url);
  if (denyReason !== null)
    return {
      behavior: "deny",
      message:
        denyReason.kind === "compliance"
          ? `Monitor cannot open a WebSocket. ${denyReason.detail}`
          : `Monitor cannot open a WebSocket to ${denyReason.host}: ${denyReason.detail}.`,
      decisionReason: {
        type: "other",
        reason:
          denyReason.kind === "compliance"
            ? "organization policy disables model-chosen URL egress"
            : denyReason.kind === "ssrf"
              ? "SSRF-blocked address range"
              : denyReason.detail,
      },
    };
  let subprotocolNote =
    wsRequest.protocols !== undefined && wsRequest.protocols.length > 0
      ? ` (subprotocols: ${formatQuotedList(wsRequest.protocols)})`
      : "";
  return {
    behavior: "ask",
    message: `Monitor will open a WebSocket to ${wsRequest.url}${subprotocolNote}`,
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
var MonitorToolUI; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
var MONITOR_TOOL_DEFINITION;
var MonitorTool;
deferInit("chunk-b91jfdd4.js:14632", () => {
  MonitorToolUI = {
    name: MONITOR,
    enablesCodeExecution: true,
    maxResultSizeChars: 1e4,
    shouldDefer: true,
    userFacingName() {
      return "Monitor";
    },
    getToolUseSummary(input) {
      if (!input?.description) return null;
      return truncate(input.description, MAX_DESCRIPTION_CHARS);
    },
    getActivityDescription(input) {
      return input?.description ? `Monitoring: ${input.description}` : "Monitoring";
    },
    isEnabled() {
      return isBashAvailable();
    },
    async preparePermissionMatcher(input) {
      let command = getCommandField(input);
      return command === undefined ? () => false : buildRuleRelevanceFilter(command);
    },
    isConcurrencySafe() {
      return true;
    },
    renderToolUseMessage(input) {
      if (!input.description) return null;
      return input.description;
    },
    get outputSchema() {
      return monitorOutputSchema();
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      let durationText = formatDuration(result.timeoutMs, {
        hideTrailingZeros: true,
      });
      let lifetimeText = isDiskless()
        ? `expires in ${durationText} unless the command exits first, and may stop soon after your reply`
        : result.persistent
          ? "persistent \u2014 runs until TaskStop or session end"
          : isMonitorPersistentAllowed()
            ? `expires in ${durationText} unless the source ends first; you get one notice at expiry \u2014 re-arm if you still need the watch`
            : `timeout ${result.timeoutMs}ms`;
      let finalLifetimeText =
        !isDiskless() && hasBackgroundBashStopAfterReply()
          ? `${lifetimeText}; in this session it is also likely stopped a few minutes after your reply`
          : lifetimeText;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `Monitor started (task ${result.taskId}, ${finalLifetimeText}). You will be notified on each event. Keep working \u2014 do not poll or sleep. ${isDiskless() ? "An event that arrives after your reply is not the user's reply." : "Events may arrive while you are waiting for the user \u2014 an event is not their reply."}`,
      };
    },
  };
  MONITOR_TOOL_DEFINITION = buildTool({
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
    toAutoClassifierInput(input) {
      return input.ws
        ? `websocket ${input.ws.url}${subprotocolsSuffix(input.ws)}`
        : mergeCommandNetworkLists(input);
    },
    sandboxNetworkLists(input) {
      return getCommandNetworkLists(input);
    },
    create(parentContext) {
      return {
        permissionCheckFailureDecision(input, monitorScope) {
          let monitorToolContext = buildMonitorToolContext(parentContext, monitorScope);
          return denyCrashedCheckUnderCommandClamp(MONITOR, monitorToolContext.shellPermission);
        },
        validateInput: validateMonitorSandbox,
        async checkPermissions(input, monitorScope) {
          let monitorToolContext = buildMonitorToolContext(parentContext, monitorScope);
          if (input.ws) {
            let clampDenial = denyForBashCommandClamp(
              "Monitor websocket",
              monitorToolContext.shellPermission,
            );
            if (clampDenial !== undefined) return clampDenial;
            return checkMonitorWebSocketAllowed(input.ws);
          }
          return checkMonitorPermission(input, monitorToolContext.shellPermission);
        },
        async call(input, monitorScope) {
          let monitorToolContext = buildMonitorToolContext(parentContext, monitorScope);
          let { parentMessage } = monitorScope;
          assertAgentNotStopping(monitorToolContext);
          let bounded = isMonitorPersistentAllowed();
          let timeoutFields = clampMonitorTimeout(input, bounded);
          if (input.ws)
            return runWebSocketMonitor(
              {
                ...input,
                ...timeoutFields,
                bounded,
                ws: input.ws,
              },
              pickMonitorContext(monitorToolContext),
            );
          return checkMonitorSandbox(
            input.command,
            {
              ...input,
              ...timeoutFields,
            },
            bounded,
            monitorToolContext,
            parentMessage,
          );
        },
      };
    },
  });
  MonitorTool = MONITOR_TOOL_DEFINITION;
});
export { wsEgressDenyReason, MonitorTool };
