/**
 * hooks/toolPermission/handlers/interactiveHandler.ts
 *
 * 交互式权限处理：同时监听本地对话框、Remote Control bridge、channel 回复、服务器审批与 PermissionRequest hooks，谁先回复谁生效。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/toolPermission/handlers/interactiveHandler.ts
 * pieces: chunk-s4bxxzsw.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { randomUUID } from "crypto";
import { ASKUSERQUESTION } from "../../../tools/AskUserQuestionTool/prompt.js";
import {
  summarizePendingQuestions,
  truncateAttentionText,
} from "../../../components/fleet/sessionAttention.js";
import { EXITPLANMODE } from "../../../tools/ExitPlanModeTool/constants.js";
import {
  AUTO_MODE_OUTSIDE_READS_DIALOG,
  buildOutsideReadsDialog,
} from "../../../components/permissions/permissionCardKinds.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { forwardDialogToBridge } from "../../../services/requestUserDialog.js";
import {
  sanitizePreviewLine,
  generatePermissionRequestId,
  filterPermissionRelayClients,
  truncateForPreview,
} from "../../../services/mcp/channelPermissions.js";
import {
  redactSecretsForDisplay,
  redactSecretsInText,
} from "../../../services/teamMemorySync/secretScanner.js";
import { sandboxReadBlockApplies } from "../../../utils/sandbox/sandbox-adapter.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { isHookOrPluginSteered } from "../../../utils/agentContext.js";
import { logForDebugging } from "../../../utils/debug.js";
import { requiresConnectorGrant_2 } from "../../../services/mcp/claudeai.js";
import { mustBeLeftToAPerson } from "../../../types/permissions.js";
import {
  clearClassifierChecking,
  findSafetyCheckReason,
  answerUpdatesForMcpSkillAsk,
  withoutGrantsForRemoteScope,
  stripWholeToolGrantsForAsk,
  permissionGrantScope,
} from "../../../utils/permissions/permissions.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { isChromeToolName } from "../../../utils/claudeInChrome/chromeToolNames.js";
import { getToolNameForPermissionCheck } from "../../../services/mcp/mcpStringUtils.js";
import {
  normalizePermissionUpdate,
  suggestWebToolRule,
} from "../../../utils/permissions/permissionRulePayload.js";
import { getToolPermissionContext } from "../../../utils/permissions/toolPermissionContext.js";
import { logShellAllowRuleAdded } from "../../../utils/permissions/shellAllowRuleTelemetry.js";
import { isChannelsEnabled } from "../../../services/mcp/channelAllowlist.js";
import { getAllowedChannels } from "../../../bootstrap/state.js";
import {
  findChannelEntry,
  CHANNEL_PERMISSION_REQUEST_METHOD,
} from "../../../services/mcp/channelNotification.js";
import { sendMcpNotification } from "../../../services/mcp/mcpWireUtils.js";
import { errorMessage, StreamClosedAbortError } from "../../../utils/errors.js";
import { getInteractiveHandlerHost } from "./interactiveHandlerState.js";
import { sleep } from "../../../utils/sleep.js";
import { logError } from "../../../utils/log.js";

//@ chunk-s4bxxzsw.js:37374-37735 placement
/**
 * 生成发到桥接端的批准提示文字：AskUserQuestion 用专门格式，ExitPlanMode 为 approve plan，其他工具为"approve 工具名: 命令/路径/URL"。
 */
function bridgeApprovalPrompt(e) {
  let input = e.input;
  if (e.tool.name === ASKUSERQUESTION) return summarizePendingQuestions(input);
  if (e.tool.name === EXITPLANMODE)
    return {
      text: "approve plan",
    };
  let trimmed = e.tool.userFacingName(e.input).trim();
  let s =
    typeof input?.command === "string"
      ? input.command
      : typeof input?.file_path === "string"
        ? input.file_path
        : typeof input?.url === "string"
          ? input.url
          : "";
  let y = trimmed || e.tool.name;
  return {
    text: s && !y.includes(s) ? truncateAttentionText(`approve ${y}: ${s}`) : `approve ${y}`,
  };
}
//@ chunk-s4bxxzsw.js:37772-38387 placement
/**
 * 通过 Remote Control bridge 发送"自动模式读工作目录外文件"确认对话框（bridge 支持且开关 tengu_compressed_river 开启），回答时回调 onAnswer 并记埋点，返回撤回函数。
 */
function sendOutsideReadsBridgeDialog({ bridge, toolName, path, toolUseID, onAnswer }) {
  if (
    bridge === undefined ||
    !bridge.supportsKind(AUTO_MODE_OUTSIDE_READS_DIALOG.kind) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_compressed_river", true)
  )
    return;
  let R = forwardDialogToBridge({
    bridge,
    dialog: AUTO_MODE_OUTSIDE_READS_DIALOG,
    payload: buildOutsideReadsDialog({
      toolName: sanitizePreviewLine(toolName),
      path: sanitizePreviewLine(redactSecretsForDisplay(path)),
      sandboxFenced: sandboxReadBlockApplies(),
    }),
    toolUseId: toolUseID,
    onSettled: (C) => {
      switch (C.kind) {
        case "answered":
          if (onAnswer(C.result))
            logFeatureOk("permission_outside_reads_bridge_dialog", {
              answer: fromEnum(C.result),
            });
          return;
        case "malformed":
          logFeatureSad("permission_outside_reads_bridge_dialog", "result_unparseable");
          return;
        case "cancelled":
        case "detached":
          return;
      }
    },
  });
  if (R === undefined) {
    logFeatureSad("permission_outside_reads_bridge_dialog", "send_declined");
    return;
  }
  return R.retire;
}
//@ chunk-s4bxxzsw.js:38387-38797 placement
/**
 * 应用桥接端回答附带的权限更新：远程执行或 hook/插件主导时忽略；setMode 逐个尝试（失败退回 default），其余规则持久化；返回实际应用的更新。
 */
function applyBridgePermissionUpdates(ctx, r) {
  if (r.length === 0) return [];
  if (ctx.toolUseContext.forRemoteExecution === true || isHookOrPluginSteered(ctx.toolUseContext)) return [];
  let n = [];
  let s = [];
  for (let y of r)
    if (y.type === "setMode") {
      let R = ctx.setModeFromBridge(y.mode);
      if (R.ok) n.push(y);
      else {
        logForDebugging(`bridge setMode '${y.mode}' rejected (${R.error}); falling back to 'default'`);
        ctx.setModeFromBridge("default");
      }
    } else s.push(y);
  if (s.length > 0) ctx.persistPermissions(s);
  return n.concat(s);
}
//@ chunk-s4bxxzsw.js:38797-38962 placement
function isLocalOnlyAsk(result, toolUseContext) {
  return (
    Boolean(result.localDisplayOnly) ||
    result.denialLimitFallback !== undefined ||
    result.autoDenyWindow !== undefined ||
    result.oneTimeAnswersOnly === true ||
    toolUseContext.forRemoteExecution === true
  );
}
//@ chunk-s4bxxzsw.js:38962-39090 placement
function requiresLocalPerson(ctx, result) {
  return (
    ctx.tool.requiresUserInteraction?.() === true ||
    requiresConnectorGrant_2(ctx.tool) ||
    mustBeLeftToAPerson(result, ctx.tool, ctx.input, ctx.toolUseContext, ctx.toolUseID)
  );
}
//@ chunk-s4bxxzsw.js:39090-44358 fingerprint = handleInteractivePermission (0.477)
/**
 * 交互式权限竞速：除本地对话框外，同时向 Remote Control bridge 发送请求、监听 channel 回复、服务器审批 watcher 与 PermissionRequest hooks，任一方先给出决定即 claim 并 teardown 其余方。
 */
function handleInteractivePermission(e) {
  let {
    ctx,
    description,
    result,
    displayInput,
    permissionPromptStartTimeMs,
    awaitAutomatedChecksBeforeDialog,
    bridgeCallbacks,
    bridgeDialogCallbacks,
    channelCallbacks,
    claim,
    isResolved,
    onWin,
    onReprompt,
    onRemoteDialogAnswer,
  } = e;
  let P = isLocalOnlyAsk(result, ctx.toolUseContext);
  let E = P ? undefined : bridgeCallbacks;
  let bridge = P ? undefined : bridgeDialogCallbacks;
  let x = P ? undefined : channelCallbacks;
  let { setClassifierApprovals } = ctx;
  let M = E ? randomUUID() : undefined;
  let Y;
  let H;
  let ke;
  let Re = result.offersBlockOutsideReads === true ? ctx.tool.getPath?.(displayInput) : undefined;
  let Q = Re
    ? sendOutsideReadsBridgeDialog({
        bridge,
        toolName: ctx.tool.name,
        path: Re,
        toolUseID: ctx.toolUseID,
        onAnswer: (L) => {
          if (!claim()) return false;
          switch ((clearClassifierChecking(setClassifierApprovals, ctx.toolUseID), L)) {
            case "allow":
              onRemoteDialogAnswer({
                behavior: "allow",
                updatedInput: displayInput,
              });
              break;
            case "block":
              onRemoteDialogAnswer({
                behavior: "deny",
                blockOutsideReads: true,
              });
              break;
            case "ask_again":
              onRemoteDialogAnswer({
                behavior: "deny",
              });
              break;
            case "allow_once":
              onRemoteDialogAnswer({
                behavior: "allow",
                updatedInput: displayInput,
                askAgainOutsideReads: true,
              });
              break;
          }
          return true;
        },
      })
    : undefined;
  function oe(L) {
    if (E && M) {
      if (L) E.sendResponse(M, L);
      E.cancelRequest(M);
    }
    Y?.();
    H?.();
    Q?.();
  }
  if (E && M) {
    let L = "";
    if (ctx.tool.name !== BASH_TOOL_NAME && ctx.tool.name !== POWERSHELL_TOOL_NAME)
      try {
        L =
          ctx.tool.getToolUseSummary?.(displayInput) ?? ctx.tool.getActivityDescription?.(displayInput) ?? "";
      } catch {
        L = "";
      }
    let metadata = result.metadata;
    if (metadata?.mcpSkill)
      L = findSafetyCheckReason(result.decisionReason)?.reason ?? metadata.mcpSkill.summary;
    let ce = isChromeToolName(getToolNameForPermissionCheck(ctx.tool));
    E.sendRequest(
      M,
      ctx.tool.name,
      displayInput,
      ctx.toolUseID,
      sanitizePreviewLine(redactSecretsInText(L)),
      result.suggestions,
      result.blockedPath,
      requiresLocalPerson(ctx, result) || undefined,
      ce ? "browser" : undefined,
      undefined,
    );
    let signal = ctx.toolUseContext.abortController.signal;
    Y = E.onResponse(M, ctx.tool.name, (K) => {
      if (!claim()) return;
      if (K.updatedPermissionsDropped)
        logFeatureSad("permission_bridge_relay", "updated_permissions_malformed");
      else logFeatureOk("permission_bridge_relay");
      if (Y) signal.removeEventListener("abort", Y);
      clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
      H?.();
      Q?.();
      if (K.behavior === "allow") {
        let displayInput_2 =
          result.metadata?.mcpSkill === undefined &&
          findSafetyCheckReason(result.decisionReason, (response) => !response.classifierApprovable) !==
            undefined;
        let mode = normalizePermissionUpdate(
          K.updatedPermissions ?? [],
          displayInput_2 ||
            ctx.tool.suppressesAlwaysAllowRule?.(displayInput) === true ||
            result.suppressAlwaysAllowRule === true
            ? undefined
            : suggestWebToolRule(ctx.tool, displayInput),
          getToolPermissionContext(ctx.toolUseContext),
        );
        let re =
          result.metadata?.mcpSkill === undefined
            ? undefined
            : {
                rule: undefined,
              };
        let Ae =
          re !== undefined
            ? answerUpdatesForMcpSkillAsk(mode, re.rule)
            : ctx.tool.suppressesAllPermissionUpdates?.(displayInput) === true || displayInput_2
              ? withoutGrantsForRemoteScope(mode)
              : ctx.tool.suppressesAlwaysAllowRule?.(displayInput) === true ||
                  result.suppressAlwaysAllowRule === true
                ? stripWholeToolGrantsForAsk(mode, ctx.tool, getToolPermissionContext(ctx.toolUseContext))
                : mode;
        let _e = applyBridgePermissionUpdates(ctx, Ae);
        if (Ae.length) logShellAllowRuleAdded(Ae);
        let channelRequestId = permissionGrantScope(_e);
        ctx.logDecision(
          {
            decision: "accept",
            source: {
              type: "user",
              permanent: channelRequestId === "always",
            },
            scope: channelRequestId,
          },
          {
            input: K.updatedInput ?? displayInput,
            permissionPromptStartTimeMs,
          },
        );
        onWin(ctx.buildAllow(K.updatedInput ?? displayInput));
      } else {
        ctx.logDecision(
          {
            decision: "reject",
            source: {
              type: "user_reject",
              hasFeedback: !!K.message,
            },
          },
          {
            permissionPromptStartTimeMs,
          },
        );
        onWin(
          ctx.cancelAndAbort(K.message, undefined, undefined, {
            feedbackIsFromUser: true,
          }),
        );
      }
    });
    signal.addEventListener("abort", Y, {
      once: true,
    });
  }
  if (x && isChannelsEnabled() && !requiresLocalPerson(ctx, result)) {
    let channelRequestId = generatePermissionRequestId(`${ctx.toolUseID}:${randomUUID()}`);
    let allowedChannels = getAllowedChannels();
    let ce = result.metadata?.mcpSkill?.server.name;
    let channelClients = filterPermissionRelayClients(
      ctx.toolUseContext.getMcp().clients,
      (K) => K !== ce && findChannelEntry(K, allowedChannels) !== undefined,
      (name) => x.isServerRegistered(name),
    );
    if (channelClients.length > 0) {
      let params = {
        request_id: channelRequestId,
        tool_name: ctx.tool.name,
        description: sanitizePreviewLine(
          redactSecretsForDisplay(result.metadata?.mcpSkill?.summary ?? description),
        ),
        input_preview: truncateForPreview(displayInput),
      };
      for (let client of channelClients) {
        if (client.type !== "connected") continue;
        sendMcpNotification(client, {
          method: CHANNEL_PERMISSION_REQUEST_METHOD,
          params,
        }).catch((e) => {
          logFeatureBad("permission_channel_relay", "permission_channel_relay_send_failed");
          logForDebugging(`Channel permission_request failed for ${client.name}: ${errorMessage(e)}`, {
            level: "error",
          });
        });
      }
      let channelSignal = ctx.toolUseContext.abortController.signal;
      let mapUnsub = x.onResponse(channelRequestId, (response) => {
        if (response.behavior === "allow" && response.fromServer === ce) return;
        if (!claim()) return;
        logFeatureOk("permission_channel_relay");
        clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
        oe();
        if (response.behavior === "allow") {
          ctx.logDecision(
            {
              decision: "accept",
              source: {
                type: "user",
                permanent: false,
              },
            },
            {
              permissionPromptStartTimeMs,
            },
          );
          onWin(ctx.buildAllow(displayInput));
        } else {
          ctx.logDecision(
            {
              decision: "reject",
              source: {
                type: "user_reject",
                hasFeedback: false,
              },
            },
            {
              permissionPromptStartTimeMs,
            },
          );
          onWin(ctx.cancelAndAbort(`Denied via channel ${response.fromServer}`));
        }
      });
      H = () => {
        mapUnsub();
        channelSignal.removeEventListener("abort", H);
      };
      channelSignal.addEventListener("abort", H, {
        once: true,
      });
    }
  }
  let serverApprovalWatch = result.serverApprovalWatch;
  let pe = serverApprovalWatch ? getInteractiveHandlerHost() : null;
  let De =
    serverApprovalWatch && pe?.isEnabled()
      ? pe.createObserver(serverApprovalWatch, ctx.toolUseContext.toolState, ctx.toolUseContext.credentials)
      : null;
  if (serverApprovalWatch && De) {
    let signal = ctx.toolUseContext.abortController.signal;
    let me = false;
    ke = () => {
      me = true;
    };
    (async () => {
      let ce = await De.poll();
      let ie = 3000;
      let K = 15000;
      while (!ce && !isResolved() && !signal.aborted && !me) {
        await sleep(ie, signal);
        if (isResolved() || signal.aborted || me) return;
        ce = await De.poll();
        if (!ce) {
          ie = Math.min(Math.round(ie * 1.5), K);
          continue;
        }
        if (getToolPermissionContext(ctx.toolUseContext).mode === "plan") {
          logForDebugging("Server approval observed but parked: session is in plan mode");
          ce = false;
          ie = Math.min(Math.round(ie * 1.5), K);
          continue;
        }
        if (me || !claim()) return;
        clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
        oe();
        logFeatureOk("permission_server_approval_watch");
        ctx.logDecision(
          {
            decision: "accept",
            source: {
              type: "user",
              permanent: false,
            },
          },
          {
            permissionPromptStartTimeMs,
          },
        );
        onWin(
          ctx.buildAllow({
            ...(result.updatedInput ?? displayInput),
            __projectGrantServerObserved: true,
          }),
        );
        return;
      }
    })().catch((error) => {
      logFeatureBad("permission_server_approval_watch", "watcher_stopped");
      logForDebugging(`Server-approval watcher stopped (${errorMessage(error)})`);
    });
  }
  if (!awaitAutomatedChecksBeforeDialog && result.personOnly !== true)
    (async () => {
      if (isResolved()) return;
      let L = await ctx.runHooks(
        getToolPermissionContext(ctx.toolUseContext).mode,
        result.suggestions,
        result.suppressAlwaysAllowRule === true,
        () => isResolved() || ctx.toolUseContext.abortController.signal.aborted,
        result.updatedInput,
        permissionPromptStartTimeMs,
      );
      if (L && "reprompted" in L) {
        if (isResolved()) return;
        clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
        oe();
        M = undefined;
        ke?.();
        onReprompt(L.finalInput, L.reprompted.decisionReason, L.reprompted);
        return;
      }
      if (!L || !claim()) return;
      oe();
      onWin(L);
    })().catch((error) => {
      if (error instanceof StreamClosedAbortError) {
        logForDebugging("PermissionRequest hooks cancelled (control stream closed)");
        return;
      }
      logError(error);
    });
  return {
    notifyBridgeAndTeardown: oe,
  };
}
export { handleInteractivePermission, bridgeApprovalPrompt };
