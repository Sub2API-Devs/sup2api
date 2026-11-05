/**
 * hooks/useCanUseTool.tsx
 *
 * canUseTool 实现：先查规则/模式/分类器（hasPermissionsToUseTool），allow 直接放行，ask 时进入交互权限流程；处理最近拒绝记录与 auto 模式拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useCanUseTool.tsx
 * pieces: chunk-czq1j3j2.js (11)
 * attribution: placement 2, sole-consumer 8, fingerprint 1
 */
import {
  MAX_ZERO_WIDTH_RUN,
  serializePayloadSafely,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { isStateOn } from "../utils/codeMode/accepted.js";
import { REPL_TOOL_NAME, shownToolName } from "../tools/REPLTool/constants.js";
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import { logError } from "../utils/log.js";
import { GAUGE_DECAY_MS, useNotifications } from "../context/notifications.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { truncateToWidth } from "../utils/format.js";
import { cleanTaskDescription } from "../utils/taskDescription.js";
import { statusSnapshot } from "../components/Spinner/spinnerStatus.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useRef, useMemo, useCallback } from "../../vendor/react/cjs/react.production.js";
import { useSetAppState, useAppStoreDirect } from "../state/AppState.js";
import {
  makeClassifierApprovalsSetter,
  hasPermissionsToUseToolWithSink,
  setClassifierApproval,
  clearClassifierChecking,
} from "../utils/permissions/permissions.js";
import { createPermissionContext } from "./toolPermission/PermissionContext.js";
import { applyPermissionAnswerChanges } from "../utils/permissions/permissionAnswer.js";
import { decisionReasonToString, repromptFilePermission } from "../components/permissions/hooks.js";
import { getToolPermissionContext } from "../utils/permissions/toolPermissionContext.js";
import { classifierDenyKind } from "../types/permissions.js";
import { excludeMainSessionAgentId } from "../utils/agentContext.js";
import { NO_USABLE_ANSWER_TEXT, ensureNoReasonProvided, AUTO_MODE_PREFIX } from "../utils/messages.js";
import { MAX_INLINE_GRAPHEME_CHARS } from "../utils/truncateGraphemes.js";
import { scanForSecrets } from "../services/teamMemorySync/secretScanner.js";
import { saveGlobalConfig } from "../utils/config.js";
import { MIN_DENIALS_TO_PROMPT } from "../components/AutoModeEnvOnboarding.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { handleCoordinatorPermission } from "./toolPermission/handlers/coordinatorHandler.js";
import { handleSwarmWorkerPermission } from "./toolPermission/handlers/swarmWorkerHandler.js";
import { AbortError, withTelemetryMessage, toError } from "../utils/errors.js";
import { APIUserAbortError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { mcpToolLogFields } from "./toolPermission/permissionLogging.js";
import { fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { setPermissionPromptPerson } from "../utils/permissions/permissionPromptHost.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1418191-1418254 placement
var NOTICE_PADDING; // deferred: uses MAX_ZERO_WIDTH_RUN (../utils/permissions/approvalPayloadSerialization.js) of its import cycle while loading; runs once the cycle is complete
var MAX_NOTICE_COLUMNS;
var AUTO_MODE_NOTICE_MAX_COLUMNS;
var MAX_NOTICE_WIDTH;
var MAX_NOTICE_WRAP_WIDTH;
var ZERO_WIDTH_RESERVE;
deferInit("chunk-czq1j3j2.js:1418191", () => {
  NOTICE_PADDING = 8;
  MAX_NOTICE_COLUMNS = 120;
  AUTO_MODE_NOTICE_MAX_COLUMNS = 40;
  MAX_NOTICE_WIDTH = AUTO_MODE_NOTICE_MAX_COLUMNS + NOTICE_PADDING;
  MAX_NOTICE_WRAP_WIDTH = MAX_NOTICE_COLUMNS + NOTICE_PADDING;
  ZERO_WIDTH_RESERVE = (1 + MAX_ZERO_WIDTH_RUN) * 2;
});
//@ chunk-czq1j3j2.js:1692123-1692211 sole-consumer
var EXCLUDED_BASH_INPUT_KEYS = ["description", "timeout"];
var FALSE_ALLOWED_BASH_KEYS = ["dangerouslyDisableSandbox", "run_in_background"];
//@ chunk-czq1j3j2.js:1692211-1692304 sole-consumer
function sanitizeBashInput(input) {
  return pickByHelper(
    input,
    (value, key) =>
      value !== undefined &&
      !EXCLUDED_BASH_INPUT_KEYS.includes(key) &&
      !(value === false && FALSE_ALLOWED_BASH_KEYS.includes(key)),
  );
}
//@ chunk-czq1j3j2.js:1692304-1692358 sole-consumer
function isReplToolWithoutMcpInfo(tool) {
  return isStateOn() && tool.name === REPL_TOOL_NAME && !tool.mcpInfo;
}
//@ chunk-czq1j3j2.js:1692358-1692710 sole-consumer
/**
 * 把被 auto 模式拒绝的工具调用序列化成去重键：MCP 工具带 "mcp:" 前缀与服务器名，shell 工具先规范化命令；无法序列化时记错误并返回 unserializable 键。
 */
function serializeAutoModeDenialKey(tool, input) {
  try {
    let [prefix, payload] = tool.mcpInfo
      ? ["mcp:", [tool.mcpInfo.serverName, input]]
      : SHELL_TOOL_NAMES.includes(tool.name)
        ? ["", sanitizeBashInput(input)]
        : isReplToolWithoutMcpInfo(tool)
          ? ["script:", input.code]
          : ["", input];
    let serialized = serializePayloadSafely(payload, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    if (serialized !== undefined) return `${prefix}${serialized}`;
  } catch {}
  logError(Error("Auto mode denial input could not be serialized"));
  return `unserializable:${tool.mcpInfo?.serverName ?? ""}`;
}
//@ chunk-czq1j3j2.js:1692710-1692775 sole-consumer
var MAX_TASK_DESCRIPTION = 40;
var MAX_TASK_LABEL = 40;
var AUTO_MODE_DENIED = "auto-mode-denied";
var AUTO_MODE_NOT_RUN = "auto-mode-not-run";
//@ chunk-czq1j3j2.js:1692775-1692802 sole-consumer
function toolNameOf(tool, fallback) {
  return fallback;
}
//@ chunk-czq1j3j2.js:1692802-1692965 sole-consumer
function bumpGauge(gauge, key, { current, queue }) {
  let now = Date.now();
  let isSameKey = current?.key === key || queue.some((entry) => entry.key === key);
  gauge.count = isSameKey || now - gauge.lastAt < GAUGE_DECAY_MS ? gauge.count + 1 : 1;
  gauge.lastAt = now;
  return gauge.count;
}
//@ chunk-czq1j3j2.js:1692965-1693193 sole-consumer
function describeTask(tool, input, toolUseContext) {
  let toolName = tool.userFacingName(
    input,
    tool.name === AGENT && toolUseContext.forRemoteExecution !== true
      ? {
          activeAgents: toolUseContext.options.agentDefinitions?.activeAgents,
          webFetchByAgentType: true,
        }
      : undefined,
  );
  return truncateToWidth(
    cleanTaskDescription(toolName.toLowerCase()) ?? tool.name.toLowerCase(),
    MAX_TASK_LABEL,
  );
}
//@ chunk-czq1j3j2.js:1693193-1698565 fingerprint (2.1.88 match: useCanUseTool, 0.386)
/**
 * canUseTool 主流程：每次工具调用返回一个 Promise。先匹配最近拒绝记录；调用 hasPermissionsToUseTool（规则 + 模式 + auto 分类器）得出 allow/deny/ask；allow 时记录日志直接 buildAllow；ask 时取工具 description，进入 pWn（交互式请求：本地对话框 + bridge + channel + hooks 竞速）；deny 记录拒绝；中止时 resolveIfAborted。
 */
function useCanUseTool() {
  let { recordDenial, getDenials, removeDenial } = statusSnapshot();
  let { storageV5 } = useTheme_2();
  let { addNotification } = useNotifications();
  let denialGaugeRef = useRef({
    count: 0,
    lastAt: 0,
  });
  let gaugeRef = useRef({
    count: 0,
    lastAt: 0,
  });
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let permissionUpdater = useMemo(() => makeClassifierApprovalsSetter(setAppState), [setAppState]);
  let canUseTool = useCallback(
    async (tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) => {
      let matchingDenial;
      let denials = getDenials();
      if (denials.length > 0) {
        let inputKey = serializeAutoModeDenialKey(tool, input);
        matchingDenial = denials.find(
          (resolve) => resolve.toolName === tool.name && resolve.inputKey === inputKey,
        );
      }
      let promise = new Promise((resolve) => {
        let resolveOnce = (decision) => {
          toolUseContext.session.outsideReadPrompt.closeFor(toolUseID);
          resolve(decision);
        };
        let permissionContext = createPermissionContext(
          tool,
          input,
          toolUseContext,
          assistantMessage,
          toolUseID,
          permissionUpdater,
        );
        if (permissionContext.resolveIfAborted(resolveOnce)) return;
        return (
          forceDecision !== undefined
            ? Promise.resolve(forceDecision)
            : hasPermissionsToUseToolWithSink(
                tool,
                input,
                toolUseContext,
                assistantMessage,
                toolUseID,
                applyPermissionAnswerChanges,
                addNotification,
                permissionUpdater,
              )
        )
          .then(async (permissionResult) => {
            if (permissionResult.behavior === "allow") {
              if (permissionContext.resolveIfAborted(resolveOnce)) return;
              if (
                permissionResult.decisionReason?.type === "classifier" &&
                permissionResult.decisionReason.classifier === "auto-mode"
              )
                setClassifierApproval(permissionUpdater, toolUseID, permissionResult.decisionReason.reason);
              permissionContext.logDecision(
                {
                  decision: "accept",
                  source: "config",
                  decisionReason: permissionResult.decisionReason,
                  surface: decisionReasonToString(
                    toolUseContext.session,
                    permissionResult.decisionReason,
                    getToolPermissionContext(toolUseContext),
                  ),
                },
                {
                  input: permissionResult.updatedInput ?? input,
                },
              );
              resolveOnce(
                permissionContext.buildAllow(permissionResult.updatedInput ?? input, {
                  decisionReason: permissionResult.decisionReason,
                  matchedAskRule: permissionResult.matchedAskRule,
                }),
              );
              return;
            }
            let toolPermissionContext = getToolPermissionContext(toolUseContext);
            let description = await tool.description(input, {
              isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
              toolPermissionContext,
              tools: toolUseContext.options.tools,
            });
            if (permissionContext.resolveIfAborted(resolveOnce)) return;
            let onClassifierDeny = (denied) => {
              if (
                denied.decisionReason?.type !== "classifier" ||
                denied.decisionReason.classifier !== "auto-mode"
              )
                return;
              let commandFieldName = isReplToolWithoutMcpInfo(tool);
              if (classifierDenyKind(denied.decisionReason) !== "block") {
                if (
                  excludeMainSessionAgentId(toolUseContext.agentId, toolUseContext.agentContext) ===
                    undefined ||
                  denied.selfMending === true ||
                  denied.endsTurn === true ||
                  denied.decisionReason.monitorBlocked === true
                )
                  return;
                let agentActionCount = bumpGauge(
                  gaugeRef.current,
                  AUTO_MODE_NOT_RUN,
                  appStoreDirect.getState().notifications,
                );
                addNotification({
                  key: AUTO_MODE_NOT_RUN,
                  kind: "warning",
                  priority: "immediate",
                  waitsItsTurn: true,
                  requeueOnPreempt: true,
                  fold: toolNameOf,
                  segments: [
                    {
                      text:
                        agentActionCount > 1
                          ? `${agentActionCount} agent actions not run`
                          : commandFieldName
                            ? "Agent's script not run"
                            : `Agent's ${describeTask(tool, input, toolUseContext)} not run`,
                      color: "warning",
                    },
                    {
                      text: ` \xB7 ${NO_USABLE_ANSWER_TEXT}`,
                      dim: true,
                    },
                  ],
                });
                return;
              }
              let speculativePromise = ensureNoReasonProvided(denied.decisionReason.reason ?? "");
              let commandText = commandFieldName
                ? require("../utils/codeMode/displayableScriptDescription.js").displayableScriptDescription(
                    input.description,
                  )
                : undefined;
              let command = tool.mcpInfo
                ? undefined
                : SHELL_TOOL_NAMES.includes(tool.name)
                  ? input.command
                  : commandFieldName
                    ? input.code
                    : undefined;
              let hasCommand = typeof command === "string" && command !== "";
              let isEmptyCommand =
                !hasCommand && !tool.mcpInfo && (SHELL_TOOL_NAMES.includes(tool.name) || commandFieldName);
              let hasOtherFields =
                !tool.mcpInfo &&
                SHELL_TOOL_NAMES.includes(tool.name) &&
                Object.keys(sanitizeBashInput(input)).some((key) => key !== "command");
              let inputKey = serializeAutoModeDenialKey(tool, input);
              let found = getDenials().find(
                (denial) => denial.toolName === tool.name && denial.inputKey === inputKey,
              );
              if (found) removeDenial(found);
              let display = isEmptyCommand
                ? `Empty ${shownToolName(tool.name)} command`
                : commandFieldName
                  ? commandText || "Run commands"
                  : description;
              let payload = {
                ...(tool.mcpInfo
                  ? {
                      server: tool.mcpInfo.serverName,
                      tool: tool.mcpInfo.toolName,
                    }
                  : {
                      tool: tool.name,
                    }),
                input: isEmptyCommand
                  ? {
                      [commandFieldName ? "code" : "command"]: command,
                    }
                  : input,
              };
              let serialized = serializePayloadSafely(payload, MAX_INLINE_GRAPHEME_CHARS);
              let scrubbed = serializeApprovalPayload(serialized, {
                scrub: "key",
                maxUnits: MAX_INLINE_GRAPHEME_CHARS,
              });
              let displayParts =
                hasCommand && !hasOtherFields
                  ? {
                      command,
                    }
                  : {
                      input: scrubbed,
                      rawInput: scrubbed.kind === "withheld" ? undefined : serialized,
                    };
              let scrubText =
                displayParts.input === undefined
                  ? displayParts.command.slice(0, MAX_PAYLOAD_UNITS)
                  : displayParts.input.kind === "withheld"
                    ? ""
                    : `${displayParts.input.text}
${displayParts.rawInput}`;
              let containsSecret = true;
              try {
                let candidateText = `${display.slice(0, MAX_PAYLOAD_UNITS)}
${speculativePromise}
${scrubText}`;
                let replaced = candidateText.replace(
                  /\\+(?:u[0-9a-fA-F]{4}|[^]|$)|%(?:[0-9a-fA-F]{2})?|[^\w+/=.~\\%-]+/g,
                  `
`,
                );
                containsSecret =
                  scanForSecrets(`${candidateText}
${replaced}
${replaced.replace(
  /[./~]+/g,
  `
`,
)}`).length > 0;
              } catch {
                logError(Error("Auto mode denial text could not be checked"));
              }
              let retainedReason = containsSecret ? "" : speculativePromise;
              recordDenial({
                toolUseId: toolUseID,
                toolName: tool.name,
                display: containsSecret ? "" : display,
                ...(!containsSecret && displayParts),
                inputKey,
                reason: retainedReason,
                timestamp: Date.now(),
              });
              saveGlobalConfig((previousNotice) => {
                let denials = previousNotice.autoModeEnvSetup?.denials ?? 0;
                if (denials >= MIN_DENIALS_TO_PROMPT) return previousNotice;
                return {
                  ...previousNotice,
                  autoModeEnvSetup: {
                    ...previousNotice.autoModeEnvSetup,
                    denials: denials + 1,
                  },
                };
              }, storageV5);
              let cleanedReason = cleanTaskDescription(retainedReason);
              let speculativeHint = cleanedReason
                ? truncateToWidth(`${AUTO_MODE_PREFIX}${cleanedReason}`, MAX_TASK_DESCRIPTION)
                : "";
              let blockGauge = bumpGauge(
                denialGaugeRef.current,
                AUTO_MODE_DENIED,
                appStoreDirect.getState().notifications,
              );
              addNotification({
                key: AUTO_MODE_DENIED,
                kind: "warning",
                priority: "immediate",
                fold: toolNameOf,
                segments: [
                  {
                    text:
                      blockGauge > 1
                        ? `${blockGauge} recent blocks by auto mode`
                        : commandFieldName
                          ? "Blocked by auto mode"
                          : `${describeTask(tool, input, toolUseContext)} blocked by auto mode`,
                    color: "error",
                  },
                  ...(isRemoteSessionAvailable()
                    ? []
                    : [
                        {
                          text: " \xB7 /permissions",
                          dim: true,
                        },
                      ]),
                  ...(speculativeHint
                    ? [
                        {
                          text: ` \xB7 ${speculativeHint}`,
                          dim: true,
                        },
                      ]
                    : []),
                ],
              });
            };
            switch (permissionResult.behavior) {
              case "deny": {
                permissionContext.logDecision({
                  decision: "reject",
                  source: "config",
                  decisionReason: permissionResult.decisionReason,
                });
                onClassifierDeny(permissionResult);
                resolveOnce(permissionResult);
                return;
              }
              case "ask": {
                if (toolPermissionContext.awaitAutomatedChecksBeforeDialog) {
                  let coordinatorResult = await handleCoordinatorPermission({
                    ctx: permissionContext,
                    updatedInput: permissionResult.updatedInput,
                    suggestions: permissionResult.suggestions,
                    permissionMode: toolPermissionContext.mode,
                    askSuppressesAlwaysAllowRule: permissionResult.suppressAlwaysAllowRule === true,
                    askIsPersonOnly: permissionResult.personOnly === true,
                  });
                  if (coordinatorResult) {
                    resolveOnce(coordinatorResult);
                    return;
                  }
                }
                if (permissionContext.resolveIfAborted(resolveOnce)) return;
                let swarmResult =
                  permissionResult.localDisplayOnly ||
                  permissionResult.metadata?.mcpSkill !== undefined ||
                  permissionResult.forcedByCaller === true ||
                  permissionResult.denialLimitFallback !== undefined ||
                  permissionResult.autoDenyWindow !== undefined ||
                  permissionResult.oneTimeAnswersOnly === true ||
                  toolUseContext.forRemoteExecution === true
                    ? null
                    : await handleSwarmWorkerPermission({
                        ctx: permissionContext,
                        description,
                        updatedInput: permissionResult.updatedInput,
                        suggestions: permissionResult.suggestions,
                        askSuppressesAlwaysAllowRule: permissionResult.suppressAlwaysAllowRule === true,
                        matchedAskRule: permissionResult.matchedAskRule,
                      });
                if (swarmResult) {
                  resolveOnce(swarmResult);
                  return;
                }
                let permissionRelays = toolUseContext.permissionRelays;
                return repromptFilePermission(
                  {
                    ctx: permissionContext,
                    description,
                    result: permissionResult,
                    awaitAutomatedChecksBeforeDialog: toolPermissionContext.awaitAutomatedChecksBeforeDialog,
                    bridgeCallbacks: permissionRelays.bridge?.permission,
                    bridgeDialogCallbacks: permissionRelays.bridge?.dialog,
                    channelCallbacks: permissionRelays.channel,
                    onClassifierDenyDelivered: onClassifierDeny,
                  },
                  resolveOnce,
                );
              }
            }
          })
          .catch((error) => {
            if (error instanceof AbortError || error instanceof APIUserAbortError) {
              logForDebugging(
                `Permission check threw ${error.constructor.name} for tool=${tool.name}: ${error.message}`,
              );
              permissionContext.logCancelled();
              resolveOnce(permissionContext.cancelAndAbort(undefined, true));
            } else {
              logError(withTelemetryMessage(toError(error), "useCanUseTool permission flow failed"));
              resolveOnce(permissionContext.cancelAndAbort(undefined, true));
            }
          })
          .finally(() => {
            clearClassifierChecking(permissionUpdater, toolUseID);
          });
      });
      if (matchingDenial) {
        let priorDenial = matchingDenial;
        promise.then((result) => {
          if (result.behavior === "allow") {
            logEvent("tengu_auto_mode_subsequent_approval", {
              toolName: sanitizeToolNameForAnalytics(tool.name),
              isMcp: tool.isMcp ?? false,
              ...mcpToolLogFields(tool, toolUseContext.options.mcpClients),
              msSinceDeny: Date.now() - priorDenial.timestamp,
              allowReasonType: fromEnumOpt(result.decisionReason?.type),
            });
            removeDenial(priorDenial);
          }
        });
      }
      return promise;
    },
    [recordDenial, getDenials, removeDenial, addNotification, permissionUpdater, storageV5, appStoreDirect],
  );
  return setPermissionPromptPerson(canUseTool);
}
//@ chunk-czq1j3j2.js:1698565-1698577 placement
var useCanUseToolRef = useCanUseTool;
export { useCanUseToolRef };
