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
import { R, Q, ce } from "../../vendor/react/cjs/react.production.js";
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
function sanitizeBashInput(h) {
  return pickByHelper(
    h,
    (x, D) =>
      x !== undefined &&
      !EXCLUDED_BASH_INPUT_KEYS.includes(D) &&
      !(x === false && FALSE_ALLOWED_BASH_KEYS.includes(D)),
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
function serializeAutoModeDenialKey(tool, x) {
  try {
    let [D, L] = tool.mcpInfo
      ? ["mcp:", [tool.mcpInfo.serverName, x]]
      : SHELL_TOOL_NAMES.includes(tool.name)
        ? ["", sanitizeBashInput(x)]
        : ["", x];
    let ee = serializePayloadSafely(L, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    if (ee !== undefined) return `${D}${ee}`;
  } catch {}
  logError(Error("Auto mode denial input could not be serialized"));
  return `unserializable:${tool.mcpInfo?.serverName ?? ""}`;
}
//@ chunk-18hwfzwa.js:1647742-1647776 affinity
var AUTO_MODE_NOTICE_MAX_COLUMNS = 40;
var AUTO_MODE_DENIED = "auto-mode-denied";
//@ chunk-18hwfzwa.js:1647776-1652841 fingerprint = useCanUseTool (0.447)
/**
 * canUseTool 主流程：每次工具调用返回一个 Promise。先匹配最近拒绝记录；调用 hasPermissionsToUseTool（规则 + 模式 + auto 分类器）得出 allow/deny/ask；allow 时记录日志直接 buildAllow；ask 时取工具 description，进入 pWn（交互式请求：本地对话框 + bridge + channel + hooks 竞速）；deny 记录拒绝；中止时 resolveIfAborted。
 */
function useCanUseTool() {
  let { recordDenial, getDenials, removeDenial } = statusSnapshot();
  let { storageV5 } = useTheme_2();
  let { addNotification } = useNotifications();
  let ke = R({
    count: 0,
    lastAt: 0,
  });
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let permissionUpdater = Q(() => makeClassifierApprovalsSetter(setAppState), [setAppState]);
  let canUseTool = ce(
    async (tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) => {
      let Ot;
      let denials = getDenials();
      if (denials.length > 0) {
        let Lt = serializeAutoModeDenialKey(tool, input);
        Ot = denials.find((resolve) => resolve.toolName === tool.name && resolve.inputKey === Lt);
      }
      let promise = new Promise((resolve) => {
        let oo = (so) => {
          toolUseContext.session.outsideReadPrompt.closeFor(toolUseID);
          resolve(so);
        };
        let permissionContext = createPermissionContext(
          tool,
          input,
          toolUseContext,
          assistantMessage,
          toolUseID,
          permissionUpdater,
        );
        if (permissionContext.resolveIfAborted(oo)) return;
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
          .then(async (so) => {
            if (so.behavior === "allow") {
              if (permissionContext.resolveIfAborted(oo)) return;
              if (so.decisionReason?.type === "classifier" && so.decisionReason.classifier === "auto-mode")
                setClassifierApproval(permissionUpdater, toolUseID, so.decisionReason.reason);
              permissionContext.logDecision(
                {
                  decision: "accept",
                  source: "config",
                  decisionReason: so.decisionReason,
                  surface: decisionReasonToString(
                    toolUseContext.session,
                    so.decisionReason,
                    getToolPermissionContext(toolUseContext),
                  ),
                },
                {
                  input: so.updatedInput ?? input,
                },
              );
              oo(
                permissionContext.buildAllow(so.updatedInput ?? input, {
                  decisionReason: so.decisionReason,
                  matchedAskRule: so.matchedAskRule,
                }),
              );
              return;
            }
            let toolPermissionContext = getToolPermissionContext(toolUseContext);
            let ao = await tool.description(input, {
              isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
              toolPermissionContext,
              tools: toolUseContext.options.tools,
            });
            if (permissionContext.resolveIfAborted(oo)) return;
            let co = (bo) => {
              if (
                bo.decisionReason?.type !== "classifier" ||
                bo.decisionReason.classifier !== "auto-mode" ||
                classifierDenyKind(bo.decisionReason) !== "block"
              )
                return;
              let noReasonProvided = ensureNoReasonProvided(bo.decisionReason.reason ?? "");
              let Bo = returnFalsePlaceholder(tool);
              let Ro = undefined;
              let Ho = tool.mcpInfo
                ? undefined
                : SHELL_TOOL_NAMES.includes(tool.name)
                  ? input.command
                  : undefined;
              let Io = typeof Ho === "string" && Ho !== "";
              let Wo = !Io && !tool.mcpInfo && (SHELL_TOOL_NAMES.includes(tool.name) || Bo);
              let mn =
                !tool.mcpInfo &&
                SHELL_TOOL_NAMES.includes(tool.name) &&
                Object.keys(sanitizeBashInput(input)).some((key) => key !== "command");
              let Cn = serializeAutoModeDenialKey(tool, input);
              let found = getDenials().find((wn) => wn.toolName === tool.name && wn.inputKey === Cn);
              if (found) removeDenial(found);
              let vo = Wo ? `Empty ${identity_3(tool.name)} command` : ao;
              let Yo = {
                ...(tool.mcpInfo
                  ? {
                      server: tool.mcpInfo.serverName,
                      tool: tool.mcpInfo.toolName,
                    }
                  : {
                      tool: tool.name,
                    }),
                input: Wo
                  ? {
                      [Bo ? "code" : "command"]: Ho,
                    }
                  : input,
              };
              let kn = serializePayloadSafely(Yo, MAX_INLINE_GRAPHEME_CHARS);
              let Fn = serializeApprovalPayload(kn, {
                scrub: "key",
                maxUnits: MAX_INLINE_GRAPHEME_CHARS,
              });
              let bn =
                Io && !mn
                  ? {
                      command: Ho,
                    }
                  : {
                      input: Fn,
                      rawInput: Fn.kind === "withheld" ? undefined : kn,
                    };
              let Go =
                bn.input === undefined
                  ? bn.command.slice(0, MAX_PAYLOAD_UNITS)
                  : bn.input.kind === "withheld"
                    ? ""
                    : `${bn.input.text}
${bn.rawInput}`;
              let hn = true;
              try {
                let wn = `${vo.slice(0, MAX_PAYLOAD_UNITS)}
${noReasonProvided}
${Go}`;
                let replaced = wn.replace(
                  /\\+(?:u[0-9a-fA-F]{4}|[^]|$)|%(?:[0-9a-fA-F]{2})?|[^\w+/=.~\\%-]+/g,
                  `
`,
                );
                hn =
                  scanForSecrets(`${wn}
${replaced}
${replaced.replace(
  /[./~]+/g,
  `
`,
)}`).length > 0;
              } catch {
                logError(Error("Auto mode denial text could not be checked"));
              }
              let Mn = hn ? "" : noReasonProvided;
              recordDenial({
                toolUseId: toolUseID,
                toolName: tool.name,
                display: hn ? "" : vo,
                ...(!hn && bn),
                inputKey: Cn,
                reason: Mn,
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
              let speculativePromise = cleanTaskDescription(Mn);
              let Sn = speculativePromise
                ? truncateToWidth(`${AUTO_MODE_PREFIX}${speculativePromise}`, AUTO_MODE_NOTICE_MAX_COLUMNS)
                : "";
              let now = Date.now();
              let on = ke.current;
              let { current: _o, queue } = appStoreDirect.getState().notifications;
              let Dn = _o?.key === AUTO_MODE_DENIED || queue.some((error) => error.key === AUTO_MODE_DENIED);
              on.count = Dn || now - on.lastAt < GAUGE_DECAY_MS ? on.count + 1 : 1;
              on.lastAt = now;
              addNotification({
                key: AUTO_MODE_DENIED,
                kind: "warning",
                priority: "immediate",
                fold: (wn, mr) => mr,
                segments: [
                  {
                    text:
                      on.count > 1
                        ? `${on.count} recent blocks by auto mode`
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
                  ...(Sn
                    ? [
                        {
                          text: ` \xB7 ${Sn}`,
                          dim: true,
                        },
                      ]
                    : []),
                ],
              });
            };
            switch (so.behavior) {
              case "deny": {
                permissionContext.logDecision({
                  decision: "reject",
                  source: "config",
                  decisionReason: so.decisionReason,
                });
                co(so);
                oo(so);
                return;
              }
              case "ask": {
                if (toolPermissionContext.awaitAutomatedChecksBeforeDialog) {
                  let Bo = await handleCoordinatorPermission({
                    ctx: permissionContext,
                    updatedInput: so.updatedInput,
                    suggestions: so.suggestions,
                    permissionMode: toolPermissionContext.mode,
                    askSuppressesAlwaysAllowRule: so.suppressAlwaysAllowRule === true,
                    askIsPersonOnly: so.personOnly === true,
                  });
                  if (Bo) {
                    oo(Bo);
                    return;
                  }
                }
                if (permissionContext.resolveIfAborted(oo)) return;
                let bo =
                  so.localDisplayOnly ||
                  so.metadata?.mcpSkill !== undefined ||
                  so.forcedByCaller === true ||
                  so.denialLimitFallback !== undefined ||
                  so.autoDenyWindow !== undefined ||
                  so.oneTimeAnswersOnly === true ||
                  toolUseContext.forRemoteExecution === true
                    ? null
                    : await handleSwarmWorkerPermission({
                        ctx: permissionContext,
                        description: ao,
                        updatedInput: so.updatedInput,
                        suggestions: so.suggestions,
                        askSuppressesAlwaysAllowRule: so.suppressAlwaysAllowRule === true,
                        matchedAskRule: so.matchedAskRule,
                      });
                if (bo) {
                  oo(bo);
                  return;
                }
                let permissionRelays = toolUseContext.permissionRelays;
                return repromptFilePermission(
                  {
                    ctx: permissionContext,
                    description: ao,
                    result: so,
                    awaitAutomatedChecksBeforeDialog: toolPermissionContext.awaitAutomatedChecksBeforeDialog,
                    bridgeCallbacks: permissionRelays.bridge?.permission,
                    bridgeDialogCallbacks: permissionRelays.bridge?.dialog,
                    channelCallbacks: permissionRelays.channel,
                    onClassifierDenyDelivered: co,
                  },
                  oo,
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
              oo(permissionContext.cancelAndAbort(undefined, true));
            } else {
              logError(withTelemetryMessage(toError(error), "useCanUseTool permission flow failed"));
              oo(permissionContext.cancelAndAbort(undefined, true));
            }
          })
          .finally(() => {
            clearClassifierChecking(permissionUpdater, toolUseID);
          });
      });
      if (Ot) {
        let Lt = Ot;
        promise.then((oo) => {
          if (oo.behavior === "allow") {
            logEvent("tengu_auto_mode_subsequent_approval", {
              toolName: sanitizeToolNameForAnalytics(tool.name),
              isMcp: tool.isMcp ?? false,
              ...mcpToolLogFields(tool, toolUseContext.options.mcpClients),
              msSinceDeny: Date.now() - Lt.timestamp,
              allowReasonType: fromEnumOpt(oo.decisionReason?.type),
            });
            removeDenial(Lt);
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
