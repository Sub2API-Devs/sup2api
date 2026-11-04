/**
 * hooks/useCanUseTool.tsx
 *
 * canUseTool 实现：先查规则/模式/分类器（hasPermissionsToUseTool），allow 直接放行，ask 时进入交互权限流程；处理最近拒绝记录与 auto 模式拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useCanUseTool.tsx
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: sole-consumer 4, affinity 1, fingerprint 1
 */
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import {
  serializePayloadSafely,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { logError } from "../utils/log.js";
import { statusSnapshot } from "../components/Spinner/spinnerStatus.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useNotifications, GAUGE_DECAY_MS } from "../context/notifications.js";
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
import { ensureNoReasonProvided, AUTO_MODE_PREFIX } from "../utils/messages.js";
import { identity as identity_3 } from "../tools/REPLTool/constants.js";
import { MAX_INLINE_GRAPHEME_CHARS } from "../utils/truncateGraphemes.js";
import { scanForSecrets } from "../services/teamMemorySync/secretScanner.js";
import { saveGlobalConfig } from "../utils/config.js";
import { MIN_DENIALS_TO_PROMPT } from "../components/AutoModeEnvOnboarding.js";
import { cleanTaskDescription } from "../utils/taskDescription.js";
import { truncateToWidth } from "../utils/format.js";
import { AGENT } from "../tools/AgentTool/constants.js";
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

//@ chunk-18hwfzwa.js:1647210-1647298 sole-consumer
var EXCLUDED_BASH_INPUT_KEYS = ["description", "timeout"];
var FALSE_ALLOWED_BASH_KEYS = ["dangerouslyDisableSandbox", "run_in_background"];
//@ chunk-18hwfzwa.js:1647298-1647391 sole-consumer
function sanitizeBashInput(input) {
  return pickByHelper(
    input,
    (value, key) =>
      value !== undefined &&
      !EXCLUDED_BASH_INPUT_KEYS.includes(key) &&
      !(value === false && FALSE_ALLOWED_BASH_KEYS.includes(key)),
  );
}
//@ chunk-18hwfzwa.js:1647391-1647416 sole-consumer
function returnFalsePlaceholder(tool) {
  return false;
}
//@ chunk-18hwfzwa.js:1647416-1647742 sole-consumer
/**
 * 把被 auto 模式拒绝的工具调用序列化成去重键：MCP 工具带 "mcp:" 前缀与服务器名，shell 工具先规范化命令；无法序列化时记错误并返回 unserializable 键。
 */
function serializeAutoModeDenialKey(tool, input) {
  try {
    let [prefix, payload] = tool.mcpInfo
      ? ["mcp:", [tool.mcpInfo.serverName, input]]
      : SHELL_TOOL_NAMES.includes(tool.name)
        ? ["", sanitizeBashInput(input)]
        : ["", input];
    let serialized = serializePayloadSafely(payload, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    if (serialized !== undefined) return `${prefix}${serialized}`;
  } catch {}
  logError(Error("Auto mode denial input could not be serialized"));
  return `unserializable:${tool.mcpInfo?.serverName ?? ""}`;
}
//@ chunk-18hwfzwa.js:1647742-1647776 affinity
var AUTO_MODE_NOTICE_MAX_COLUMNS = 40;
var AUTO_MODE_DENIED = "auto-mode-denied";
//@ chunk-18hwfzwa.js:1647776-1652841 fingerprint (2.1.88 match: useCanUseTool, 0.447)
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
                denied.decisionReason.classifier !== "auto-mode" ||
                classifierDenyKind(denied.decisionReason) !== "block"
              )
                return;
              let noReasonProvided = ensureNoReasonProvided(denied.decisionReason.reason ?? "");
              let commandFieldName = returnFalsePlaceholder(tool);
              let commandText = undefined;
              let command = tool.mcpInfo
                ? undefined
                : SHELL_TOOL_NAMES.includes(tool.name)
                  ? input.command
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
              let display = isEmptyCommand ? `Empty ${identity_3(tool.name)} command` : description;
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
${noReasonProvided}
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
              let retainedReason = containsSecret ? "" : noReasonProvided;
              recordDenial({
                toolUseId: toolUseID,
                toolName: tool.name,
                display: containsSecret ? "" : display,
                ...(!containsSecret && displayParts),
                inputKey,
                reason: retainedReason,
                timestamp: Date.now(),
              });
              saveGlobalConfig((result) => {
                let denials = result.autoModeEnvSetup?.denials ?? 0;
                if (denials >= MIN_DENIALS_TO_PROMPT) return result;
                return {
                  ...result,
                  autoModeEnvSetup: {
                    ...result.autoModeEnvSetup,
                    denials: denials + 1,
                  },
                };
              }, storageV5);
              let speculativePromise = cleanTaskDescription(retainedReason);
              let speculativeHint = speculativePromise
                ? truncateToWidth(`${AUTO_MODE_PREFIX}${speculativePromise}`, AUTO_MODE_NOTICE_MAX_COLUMNS)
                : "";
              let now = Date.now();
              let gauge = denialGaugeRef.current;
              let { current: currentNotice, queue } = appStoreDirect.getState().notifications;
              let isNoticePending =
                currentNotice?.key === AUTO_MODE_DENIED ||
                queue.some((error) => error.key === AUTO_MODE_DENIED);
              gauge.count = isNoticePending || now - gauge.lastAt < GAUGE_DECAY_MS ? gauge.count + 1 : 1;
              gauge.lastAt = now;
              addNotification({
                key: AUTO_MODE_DENIED,
                kind: "warning",
                priority: "immediate",
                fold: (previousNotice, nextNotice) => nextNotice,
                segments: [
                  {
                    text:
                      gauge.count > 1
                        ? `${gauge.count} recent blocks by auto mode`
                        : `${(
                            tool.userFacingName(
                              input,
                              tool.name === AGENT && toolUseContext.forRemoteExecution !== true
                                ? {
                                    activeAgents: toolUseContext.options.agentDefinitions?.activeAgents,
                                    webFetchByAgentType: true,
                                  }
                                : undefined,
                            ) || tool.name
                          ).toLowerCase()} blocked by auto mode`,
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
export { useCanUseTool };
