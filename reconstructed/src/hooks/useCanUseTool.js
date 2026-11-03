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
import { Do } from "../utils/git/gitSafeEnv.js";
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import {
  iZr,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
} from "../utils/permissions/approvalPayloadSerialization.js";
import { logError } from "../utils/log.js";
import { UWe } from "../components/Spinner/spinnerStatus.js";
import { Me } from "../components/design-system/ThemeProvider.js";
import { useNotifications, RUn } from "../context/notifications.js";
import { R, Q, ce } from "../../vendor/react/cjs/react.production.js";
import { useSetAppState, Cr } from "../state/AppState.js";
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
import { het, AUTO_MODE_PREFIX } from "../utils/messages.js";
import { pae } from "../tools/REPLTool/constants.js";
import { RMt } from "../utils/truncateGraphemes.js";
import { scanForSecrets } from "../services/teamMemorySync/secretScanner.js";
import { saveGlobalConfig } from "../utils/config.js";
import { Kse } from "../components/AutoModeEnvOnboarding.js";
import { vc } from "../utils/taskDescription.js";
import { truncateToWidth } from "../utils/format.js";
import { AGENT } from "../tools/AgentTool/constants.js";
import { wt } from "../remote/remoteMode.js";
import { handleCoordinatorPermission } from "./toolPermission/handlers/coordinatorHandler.js";
import { handleSwarmWorkerPermission } from "./toolPermission/handlers/swarmWorkerHandler.js";
import { AbortError, withTelemetryMessage, toError } from "../utils/errors.js";
import { Lf } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../services/analytics/metadata.js";
import { mcpToolLogFields } from "./toolPermission/permissionLogging.js";
import { fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { v8n } from "../utils/permissions/permissionPromptHost.js";

//@ chunk-18hwfzwa.js:1647210-1647298 sole-consumer
var q$o = ["description", "timeout"],
  $$o = ["dangerouslyDisableSandbox", "run_in_background"];
//@ chunk-18hwfzwa.js:1647298-1647391 sole-consumer
function Fvt(h) {
  return Do(h, (x, D) => x !== void 0 && !q$o.includes(D) && !(x === !1 && $$o.includes(D)));
}
//@ chunk-18hwfzwa.js:1647391-1647416 sole-consumer
function G$o(h) {
  return !1;
}
/**
 * 把被 auto 模式拒绝的工具调用序列化成去重键：MCP 工具带 "mcp:" 前缀与服务器名，shell 工具先规范化命令；无法序列化时记错误并返回 unserializable 键。
 */
//@ chunk-18hwfzwa.js:1647416-1647742 sole-consumer
function serializeAutoModeDenialKey(h, x) {
  try {
    let [D, L] = h.mcpInfo
        ? ["mcp:", [h.mcpInfo.serverName, x]]
        : SHELL_TOOL_NAMES.includes(h.name)
          ? ["", Fvt(x)]
          : ["", x],
      ee = iZr(L, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
    if (ee !== void 0) return `${D}${ee}`;
  } catch {}
  return (
    logError(Error("Auto mode denial input could not be serialized")),
    `unserializable:${h.mcpInfo?.serverName ?? ""}`
  );
}
//@ chunk-18hwfzwa.js:1647742-1647776 affinity
var z$o = 40,
  AUTO_MODE_DENIED = "auto-mode-denied";
/**
 * canUseTool 主流程：每次工具调用返回一个 Promise。先匹配最近拒绝记录；调用 hasPermissionsToUseTool（规则 + 模式 + auto 分类器）得出 allow/deny/ask；allow 时记录日志直接 buildAllow；ask 时取工具 description，进入 pWn（交互式请求：本地对话框 + bridge + channel + hooks 竞速）；deny 记录拒绝；中止时 resolveIfAborted。
 */
//@ chunk-18hwfzwa.js:1647776-1652841 fingerprint = useCanUseTool (0.447)
function useCanUseTool() {
  let { recordDenial: recordDenial, getDenials: getDenials, removeDenial: removeDenial } = UWe(),
    { storageV5: storageV5 } = Me(),
    { addNotification: addNotification } = useNotifications(),
    ke = R({ count: 0, lastAt: 0 }),
    Re = useSetAppState(),
    Be = Cr(),
    permissionUpdater = Q(() => makeClassifierApprovalsSetter(Re), [Re]),
    canUseTool = ce(
      async (tool, input, toolUseContext, assistantMessage, toolUseID, forceDecision) => {
        let Ot,
          Et = getDenials();
        if (Et.length > 0) {
          let Lt = serializeAutoModeDenialKey(tool, input);
          Ot = Et.find((resolve) => resolve.toolName === tool.name && resolve.inputKey === Lt);
        }
        let promise = new Promise((Lt) => {
          let oo = (so) => {
              (toolUseContext.session.outsideReadPrompt.closeFor(toolUseID), Lt(so));
            },
            Xt = createPermissionContext(
              tool,
              input,
              toolUseContext,
              assistantMessage,
              toolUseID,
              permissionUpdater,
            );
          if (Xt.resolveIfAborted(oo)) return;
          return (
            forceDecision !== void 0
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
                if (Xt.resolveIfAborted(oo)) return;
                if (so.decisionReason?.type === "classifier" && so.decisionReason.classifier === "auto-mode")
                  setClassifierApproval(permissionUpdater, toolUseID, so.decisionReason.reason);
                (Xt.logDecision(
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
                  { input: so.updatedInput ?? input },
                ),
                  oo(
                    Xt.buildAllow(so.updatedInput ?? input, {
                      decisionReason: so.decisionReason,
                      matchedAskRule: so.matchedAskRule,
                    }),
                  ));
                return;
              }
              let po = getToolPermissionContext(toolUseContext),
                description = await tool.description(input, {
                  isNonInteractiveSession: toolUseContext.options.isNonInteractiveSession,
                  toolPermissionContext: po,
                  tools: toolUseContext.options.tools,
                });
              if (Xt.resolveIfAborted(oo)) return;
              let co = (bo) => {
                if (
                  bo.decisionReason?.type !== "classifier" ||
                  bo.decisionReason.classifier !== "auto-mode" ||
                  classifierDenyKind(bo.decisionReason) !== "block"
                )
                  return;
                let Ao = het(bo.decisionReason.reason ?? ""),
                  Bo = G$o(tool),
                  Ro = void 0,
                  Ho = tool.mcpInfo ? void 0 : SHELL_TOOL_NAMES.includes(tool.name) ? input.command : void 0,
                  Io = typeof Ho === "string" && Ho !== "",
                  Wo = !Io && !tool.mcpInfo && (SHELL_TOOL_NAMES.includes(tool.name) || Bo),
                  mn =
                    !tool.mcpInfo &&
                    SHELL_TOOL_NAMES.includes(tool.name) &&
                    Object.keys(Fvt(input)).some((wn) => wn !== "command"),
                  Cn = serializeAutoModeDenialKey(tool, input),
                  found = getDenials().find((wn) => wn.toolName === tool.name && wn.inputKey === Cn);
                if (found) removeDenial(found);
                let vo = Wo ? `Empty ${pae(tool.name)} command` : description,
                  Yo = {
                    ...(tool.mcpInfo
                      ? { server: tool.mcpInfo.serverName, tool: tool.mcpInfo.toolName }
                      : { tool: tool.name }),
                    input: Wo ? { [Bo ? "code" : "command"]: Ho } : input,
                  },
                  kn = iZr(Yo, RMt),
                  Fn = serializeApprovalPayload(kn, { scrub: "key", maxUnits: RMt }),
                  bn =
                    Io && !mn
                      ? { command: Ho }
                      : { input: Fn, rawInput: Fn.kind === "withheld" ? void 0 : kn },
                  Go =
                    bn.input === void 0
                      ? bn.command.slice(0, MAX_PAYLOAD_UNITS)
                      : bn.input.kind === "withheld"
                        ? ""
                        : `${bn.input.text}
${bn.rawInput}`,
                  hn = !0;
                try {
                  let wn = `${vo.slice(0, MAX_PAYLOAD_UNITS)}
${Ao}
${Go}`,
                    replaced = wn.replace(
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
                let Mn = hn ? "" : Ao;
                (recordDenial({
                  toolUseId: toolUseID,
                  toolName: tool.name,
                  display: hn ? "" : vo,
                  ...(!hn && bn),
                  inputKey: Cn,
                  reason: Mn,
                  timestamp: Date.now(),
                }),
                  saveGlobalConfig((result) => {
                    let mr = result.autoModeEnvSetup?.denials ?? 0;
                    if (mr >= Kse) return result;
                    return { ...result, autoModeEnvSetup: { ...result.autoModeEnvSetup, denials: mr + 1 } };
                  }, storageV5));
                let speculativePromise = vc(Mn),
                  Sn = speculativePromise
                    ? truncateToWidth(`${AUTO_MODE_PREFIX}${speculativePromise}`, z$o)
                    : "",
                  now = Date.now(),
                  on = ke.current,
                  { current: _o, queue: queue } = Be.getState().notifications,
                  Dn = _o?.key === AUTO_MODE_DENIED || queue.some((error) => error.key === AUTO_MODE_DENIED);
                ((on.count = Dn || now - on.lastAt < RUn ? on.count + 1 : 1),
                  (on.lastAt = now),
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
                            : `${(tool.userFacingName(input, tool.name === AGENT && toolUseContext.forRemoteExecution !== !0 ? { activeAgents: toolUseContext.options.agentDefinitions?.activeAgents, webFetchByAgentType: !0 } : void 0) || tool.name).toLowerCase()} blocked by auto mode`,
                        color: "error",
                      },
                      ...(wt() ? [] : [{ text: " \xB7 /permissions", dim: !0 }]),
                      ...(Sn ? [{ text: ` \xB7 ${Sn}`, dim: !0 }] : []),
                    ],
                  }));
              };
              switch (so.behavior) {
                case "deny": {
                  (Xt.logDecision({
                    decision: "reject",
                    source: "config",
                    decisionReason: so.decisionReason,
                  }),
                    co(so),
                    oo(so));
                  return;
                }
                case "ask": {
                  if (po.awaitAutomatedChecksBeforeDialog) {
                    let Bo = await handleCoordinatorPermission({
                      ctx: Xt,
                      updatedInput: so.updatedInput,
                      suggestions: so.suggestions,
                      permissionMode: po.mode,
                      askSuppressesAlwaysAllowRule: so.suppressAlwaysAllowRule === !0,
                      askIsPersonOnly: so.personOnly === !0,
                    });
                    if (Bo) {
                      oo(Bo);
                      return;
                    }
                  }
                  if (Xt.resolveIfAborted(oo)) return;
                  let bo =
                    so.localDisplayOnly ||
                    so.metadata?.mcpSkill !== void 0 ||
                    so.forcedByCaller === !0 ||
                    so.denialLimitFallback !== void 0 ||
                    so.autoDenyWindow !== void 0 ||
                    so.oneTimeAnswersOnly === !0 ||
                    toolUseContext.forRemoteExecution === !0
                      ? null
                      : await handleSwarmWorkerPermission({
                          ctx: Xt,
                          description: description,
                          updatedInput: so.updatedInput,
                          suggestions: so.suggestions,
                          askSuppressesAlwaysAllowRule: so.suppressAlwaysAllowRule === !0,
                          matchedAskRule: so.matchedAskRule,
                        });
                  if (bo) {
                    oo(bo);
                    return;
                  }
                  let permissionRelays = toolUseContext.permissionRelays;
                  return repromptFilePermission(
                    {
                      ctx: Xt,
                      description: description,
                      result: so,
                      awaitAutomatedChecksBeforeDialog: po.awaitAutomatedChecksBeforeDialog,
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
            .catch((so) => {
              if (so instanceof AbortError || so instanceof Lf)
                (logForDebugging(
                  `Permission check threw ${so.constructor.name} for tool=${tool.name}: ${so.message}`,
                ),
                  Xt.logCancelled(),
                  oo(Xt.cancelAndAbort(void 0, !0)));
              else
                (logError(withTelemetryMessage(toError(so), "useCanUseTool permission flow failed")),
                  oo(Xt.cancelAndAbort(void 0, !0)));
            })
            .finally(() => {
              clearClassifierChecking(permissionUpdater, toolUseID);
            });
        });
        if (Ot) {
          let Lt = Ot;
          promise.then((oo) => {
            if (oo.behavior === "allow")
              (logEvent("tengu_auto_mode_subsequent_approval", {
                toolName: sanitizeToolNameForAnalytics(tool.name),
                isMcp: tool.isMcp ?? !1,
                ...mcpToolLogFields(tool, toolUseContext.options.mcpClients),
                msSinceDeny: Date.now() - Lt.timestamp,
                allowReasonType: fromEnumOpt(oo.decisionReason?.type),
              }),
                removeDenial(Lt));
          });
        }
        return promise;
      },
      [recordDenial, getDenials, removeDenial, addNotification, permissionUpdater, storageV5, Be],
    );
  return v8n(canUseTool);
}

export { useCanUseTool };
