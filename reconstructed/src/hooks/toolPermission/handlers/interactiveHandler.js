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
function bridgeApprovalPrompt(request) {
  let input = request.input;
  if (request.tool.name === ASKUSERQUESTION) return summarizePendingQuestions(input);
  if (request.tool.name === EXITPLANMODE)
    return {
      text: "approve plan",
    };
  let trimmed = request.tool.userFacingName(request.input).trim();
  let detailText =
    typeof input?.command === "string"
      ? input.command
      : typeof input?.file_path === "string"
        ? input.file_path
        : typeof input?.url === "string"
          ? input.url
          : "";
  let label = trimmed || request.tool.name;
  return {
    text:
      detailText && !label.includes(detailText)
        ? truncateAttentionText(`approve ${label}: ${detailText}`)
        : `approve ${label}`,
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
  let forwarded = forwardDialogToBridge({
    bridge,
    dialog: AUTO_MODE_OUTSIDE_READS_DIALOG,
    payload: buildOutsideReadsDialog({
      toolName: sanitizePreviewLine(toolName),
      path: sanitizePreviewLine(redactSecretsForDisplay(path)),
      sandboxFenced: sandboxReadBlockApplies(),
    }),
    toolUseId: toolUseID,
    onSettled: (settleResult) => {
      switch (settleResult.kind) {
        case "answered":
          if (onAnswer(settleResult.result))
            logFeatureOk("permission_outside_reads_bridge_dialog", {
              answer: fromEnum(settleResult.result),
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
  if (forwarded === undefined) {
    logFeatureSad("permission_outside_reads_bridge_dialog", "send_declined");
    return;
  }
  return forwarded.retire;
}
//@ chunk-s4bxxzsw.js:38387-38797 placement
/**
 * 应用桥接端回答附带的权限更新：远程执行或 hook/插件主导时忽略；setMode 逐个尝试（失败退回 default），其余规则持久化；返回实际应用的更新。
 */
function applyBridgePermissionUpdates(ctx, updates) {
  if (updates.length === 0) return [];
  if (ctx.toolUseContext.forRemoteExecution === true || isHookOrPluginSteered(ctx.toolUseContext)) return [];
  let appliedModeUpdates = [];
  let otherUpdates = [];
  for (let update of updates)
    if (update.type === "setMode") {
      let setModeResult = ctx.setModeFromBridge(update.mode);
      if (setModeResult.ok) appliedModeUpdates.push(update);
      else {
        logForDebugging(
          `bridge setMode '${update.mode}' rejected (${setModeResult.error}); falling back to 'default'`,
        );
        ctx.setModeFromBridge("default");
      }
    } else otherUpdates.push(update);
  if (otherUpdates.length > 0) ctx.persistPermissions(otherUpdates);
  return appliedModeUpdates.concat(otherUpdates);
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
function handleInteractivePermission(params) {
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
  } = params;
  let isLocalOnly = isLocalOnlyAsk(result, ctx.toolUseContext);
  let bridge = isLocalOnly ? undefined : bridgeCallbacks;
  let bridge_2 = isLocalOnly ? undefined : bridgeDialogCallbacks;
  let channelRelay = isLocalOnly ? undefined : channelCallbacks;
  let { setClassifierApprovals } = ctx;
  let bridgeRequestId = bridge ? randomUUID() : undefined;
  let bridgeAbortListener;
  let channelAbortListener;
  let stopServerApprovalWatch;
  let outsideReadsPath =
    result.offersBlockOutsideReads === true ? ctx.tool.getPath?.(displayInput) : undefined;
  let outsideReadsRetire = outsideReadsPath
    ? sendOutsideReadsBridgeDialog({
        bridge: bridge_2,
        toolName: ctx.tool.name,
        path: outsideReadsPath,
        toolUseID: ctx.toolUseID,
        onAnswer: (answer) => {
          if (!claim()) return false;
          switch ((clearClassifierChecking(setClassifierApprovals, ctx.toolUseID), answer)) {
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
  function teardown(response) {
    if (bridge && bridgeRequestId) {
      if (response) bridge.sendResponse(bridgeRequestId, response);
      bridge.cancelRequest(bridgeRequestId);
    }
    bridgeAbortListener?.();
    channelAbortListener?.();
    outsideReadsRetire?.();
  }
  if (bridge && bridgeRequestId) {
    let summary = "";
    if (ctx.tool.name !== BASH_TOOL_NAME && ctx.tool.name !== POWERSHELL_TOOL_NAME)
      try {
        summary =
          ctx.tool.getToolUseSummary?.(displayInput) ?? ctx.tool.getActivityDescription?.(displayInput) ?? "";
      } catch {
        summary = "";
      }
    let metadata = result.metadata;
    if (metadata?.mcpSkill)
      summary = findSafetyCheckReason(result.decisionReason)?.reason ?? metadata.mcpSkill.summary;
    let isBrowserTool = isChromeToolName(getToolNameForPermissionCheck(ctx.tool));
    bridge.sendRequest(
      bridgeRequestId,
      ctx.tool.name,
      displayInput,
      ctx.toolUseID,
      sanitizePreviewLine(redactSecretsInText(summary)),
      result.suggestions,
      result.blockedPath,
      requiresLocalPerson(ctx, result) || undefined,
      isBrowserTool ? "browser" : undefined,
      undefined,
    );
    let signal = ctx.toolUseContext.abortController.signal;
    bridgeAbortListener = bridge.onResponse(bridgeRequestId, ctx.tool.name, (response) => {
      if (!claim()) return;
      if (response.updatedPermissionsDropped)
        logFeatureSad("permission_bridge_relay", "updated_permissions_malformed");
      else logFeatureOk("permission_bridge_relay");
      if (bridgeAbortListener) signal.removeEventListener("abort", bridgeAbortListener);
      clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
      channelAbortListener?.();
      outsideReadsRetire?.();
      if (response.behavior === "allow") {
        let displayInput_2 =
          result.metadata?.mcpSkill === undefined &&
          findSafetyCheckReason(result.decisionReason, (response) => !response.classifierApprovable) !==
            undefined;
        let mode = normalizePermissionUpdate(
          response.updatedPermissions ?? [],
          displayInput_2 ||
            ctx.tool.suppressesAlwaysAllowRule?.(displayInput) === true ||
            result.suppressAlwaysAllowRule === true
            ? undefined
            : suggestWebToolRule(ctx.tool, displayInput),
          getToolPermissionContext(ctx.toolUseContext),
        );
        let mcpSkillInfo =
          result.metadata?.mcpSkill === undefined
            ? undefined
            : {
                rule: undefined,
              };
        let normalizedUpdates =
          mcpSkillInfo !== undefined
            ? answerUpdatesForMcpSkillAsk(mode, mcpSkillInfo.rule)
            : ctx.tool.suppressesAllPermissionUpdates?.(displayInput) === true || displayInput_2
              ? withoutGrantsForRemoteScope(mode)
              : ctx.tool.suppressesAlwaysAllowRule?.(displayInput) === true ||
                  result.suppressAlwaysAllowRule === true
                ? stripWholeToolGrantsForAsk(mode, ctx.tool, getToolPermissionContext(ctx.toolUseContext))
                : mode;
        let appliedUpdates = applyBridgePermissionUpdates(ctx, normalizedUpdates);
        if (normalizedUpdates.length) logShellAllowRuleAdded(normalizedUpdates);
        let channelRequestId = permissionGrantScope(appliedUpdates);
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
            input: response.updatedInput ?? displayInput,
            permissionPromptStartTimeMs,
          },
        );
        onWin(ctx.buildAllow(response.updatedInput ?? displayInput));
      } else {
        ctx.logDecision(
          {
            decision: "reject",
            source: {
              type: "user_reject",
              hasFeedback: !!response.message,
            },
          },
          {
            permissionPromptStartTimeMs,
          },
        );
        onWin(
          ctx.cancelAndAbort(response.message, undefined, undefined, {
            feedbackIsFromUser: true,
          }),
        );
      }
    });
    signal.addEventListener("abort", bridgeAbortListener, {
      once: true,
    });
  }
  if (channelRelay && isChannelsEnabled() && !requiresLocalPerson(ctx, result)) {
    let channelRequestId = generatePermissionRequestId(`${ctx.toolUseID}:${randomUUID()}`);
    let allowedChannels = getAllowedChannels();
    let ownServerName = result.metadata?.mcpSkill?.server.name;
    let channelClients = filterPermissionRelayClients(
      ctx.toolUseContext.getMcp().clients,
      (client) => client !== ownServerName && findChannelEntry(client, allowedChannels) !== undefined,
      (name) => channelRelay.isServerRegistered(name),
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
      let mapUnsub = channelRelay.onResponse(channelRequestId, (response) => {
        if (response.behavior === "allow" && response.fromServer === ownServerName) return;
        if (!claim()) return;
        logFeatureOk("permission_channel_relay");
        clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
        teardown();
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
      channelAbortListener = () => {
        mapUnsub();
        channelSignal.removeEventListener("abort", channelAbortListener);
      };
      channelSignal.addEventListener("abort", channelAbortListener, {
        once: true,
      });
    }
  }
  let serverApprovalWatch = result.serverApprovalWatch;
  let handlerHost = serverApprovalWatch ? getInteractiveHandlerHost() : null;
  let approvalObserver =
    serverApprovalWatch && handlerHost?.isEnabled()
      ? handlerHost.createObserver(
          serverApprovalWatch,
          ctx.toolUseContext.toolState,
          ctx.toolUseContext.credentials,
        )
      : null;
  if (serverApprovalWatch && approvalObserver) {
    let signal = ctx.toolUseContext.abortController.signal;
    let isWatchStopped = false;
    stopServerApprovalWatch = () => {
      isWatchStopped = true;
    };
    (async () => {
      let approved = await approvalObserver.poll();
      let pollDelayMs = 3000;
      let maxPollDelayMs = 15000;
      while (!approved && !isResolved() && !signal.aborted && !isWatchStopped) {
        await sleep(pollDelayMs, signal);
        if (isResolved() || signal.aborted || isWatchStopped) return;
        approved = await approvalObserver.poll();
        if (!approved) {
          pollDelayMs = Math.min(Math.round(pollDelayMs * 1.5), maxPollDelayMs);
          continue;
        }
        if (getToolPermissionContext(ctx.toolUseContext).mode === "plan") {
          logForDebugging("Server approval observed but parked: session is in plan mode");
          approved = false;
          pollDelayMs = Math.min(Math.round(pollDelayMs * 1.5), maxPollDelayMs);
          continue;
        }
        if (isWatchStopped || !claim()) return;
        clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
        teardown();
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
      let hookOutcome = await ctx.runHooks(
        getToolPermissionContext(ctx.toolUseContext).mode,
        result.suggestions,
        result.suppressAlwaysAllowRule === true,
        () => isResolved() || ctx.toolUseContext.abortController.signal.aborted,
        result.updatedInput,
        permissionPromptStartTimeMs,
      );
      if (hookOutcome && "reprompted" in hookOutcome) {
        if (isResolved()) return;
        clearClassifierChecking(setClassifierApprovals, ctx.toolUseID);
        teardown();
        bridgeRequestId = undefined;
        stopServerApprovalWatch?.();
        onReprompt(hookOutcome.finalInput, hookOutcome.reprompted.decisionReason, hookOutcome.reprompted);
        return;
      }
      if (!hookOutcome || !claim()) return;
      teardown();
      onWin(hookOutcome);
    })().catch((error) => {
      if (error instanceof StreamClosedAbortError) {
        logForDebugging("PermissionRequest hooks cancelled (control stream closed)");
        return;
      }
      logError(error);
    });
  return {
    notifyBridgeAndTeardown: teardown,
  };
}
export { handleInteractivePermission, bridgeApprovalPrompt };
