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
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { ASKUSERQUESTION } from "../../../tools/AskUserQuestionTool/prompt.js";
import { summarizePendingQuestions, c6 } from "../../../components/fleet/sessionAttention.js";
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
import { requiresConnectorGrant } from "../../../services/mcp/claudeai.js";
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

/**
 * 生成发到桥接端的批准提示文字：AskUserQuestion 用专门格式，ExitPlanMode 为 approve plan，其他工具为"approve 工具名: 命令/路径/URL"。
 */
//@ chunk-s4bxxzsw.js:37374-37735 placement
function bridgeApprovalPrompt(e) {
  let input = e.input;
  if (e.tool.name === ASKUSERQUESTION) return summarizePendingQuestions(input);
  if (e.tool.name === EXITPLANMODE) return { text: "approve plan" };
  let trimmed = e.tool.userFacingName(e.input).trim(),
    s =
      typeof input?.command === "string"
        ? input.command
        : typeof input?.file_path === "string"
          ? input.file_path
          : typeof input?.url === "string"
            ? input.url
            : "",
    y = trimmed || e.tool.name;
  return { text: s && !y.includes(s) ? c6(`approve ${y}: ${s}`) : `approve ${y}` };
}
/**
 * 通过 Remote Control bridge 发送"自动模式读工作目录外文件"确认对话框（bridge 支持且开关 tengu_compressed_river 开启），回答时回调 onAnswer 并记埋点，返回撤回函数。
 */
//@ chunk-s4bxxzsw.js:37772-38387 placement
function sendOutsideReadsBridgeDialog({
  bridge: bridge,
  toolName: toolName,
  path: path,
  toolUseID: toolUseID,
  onAnswer: onAnswer,
}) {
  if (
    bridge === void 0 ||
    !bridge.supportsKind(AUTO_MODE_OUTSIDE_READS_DIALOG.kind) ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_compressed_river", !0)
  )
    return;
  let R = forwardDialogToBridge({
    bridge: bridge,
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
            logFeatureOk("permission_outside_reads_bridge_dialog", { answer: fromEnum(C.result) });
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
  if (R === void 0) {
    logFeatureSad("permission_outside_reads_bridge_dialog", "send_declined");
    return;
  }
  return R.retire;
}
/**
 * 应用桥接端回答附带的权限更新：远程执行或 hook/插件主导时忽略；setMode 逐个尝试（失败退回 default），其余规则持久化；返回实际应用的更新。
 */
//@ chunk-s4bxxzsw.js:38387-38797 placement
function applyBridgePermissionUpdates(e, r) {
  if (r.length === 0) return [];
  if (e.toolUseContext.forRemoteExecution === !0 || isHookOrPluginSteered(e.toolUseContext)) return [];
  let n = [],
    s = [];
  for (let y of r)
    if (y.type === "setMode") {
      let setModeFromBridge = e.setModeFromBridge(y.mode);
      if (setModeFromBridge.ok) n.push(y);
      else
        (logForDebugging(
          `bridge setMode '${y.mode}' rejected (${setModeFromBridge.error}); falling back to 'default'`,
        ),
          e.setModeFromBridge("default"));
    } else s.push(y);
  if (s.length > 0) e.persistPermissions(s);
  return n.concat(s);
}
//@ chunk-s4bxxzsw.js:38797-38962 placement
function isLocalOnlyAsk(e, r) {
  return (
    Boolean(e.localDisplayOnly) ||
    e.denialLimitFallback !== void 0 ||
    e.autoDenyWindow !== void 0 ||
    e.oneTimeAnswersOnly === !0 ||
    r.forRemoteExecution === !0
  );
}
//@ chunk-s4bxxzsw.js:38962-39090 placement
function requiresLocalPerson(e, r) {
  return (
    e.tool.requiresUserInteraction?.() === !0 ||
    requiresConnectorGrant(e.tool) ||
    mustBeLeftToAPerson(r, e.tool, e.input, e.toolUseContext, e.toolUseID)
  );
}
/**
 * 交互式权限竞速：除本地对话框外，同时向 Remote Control bridge 发送请求、监听 channel 回复、服务器审批 watcher 与 PermissionRequest hooks，任一方先给出决定即 claim 并 teardown 其余方。
 */
//@ chunk-s4bxxzsw.js:39090-44358 fingerprint = handleInteractivePermission (0.477)
function handleInteractivePermission(e) {
  let {
      ctx: ctx,
      description: description,
      result: result,
      displayInput: displayInput,
      permissionPromptStartTimeMs: permissionPromptStartTimeMs,
      awaitAutomatedChecksBeforeDialog: awaitAutomatedChecksBeforeDialog,
      bridgeCallbacks: bridgeCallbacks,
      bridgeDialogCallbacks: bridgeDialogCallbacks,
      channelCallbacks: channelCallbacks,
      claim: claim,
      isResolved: isResolved,
      onWin: onWin,
      onReprompt: onReprompt,
      onRemoteDialogAnswer: onRemoteDialogAnswer,
    } = e,
    P = isLocalOnlyAsk(result, ctx.toolUseContext),
    E = P ? void 0 : bridgeCallbacks,
    V = P ? void 0 : bridgeDialogCallbacks,
    x = P ? void 0 : channelCallbacks,
    { setClassifierApprovals: setClassifierApprovals } = ctx,
    M = E ? randomUUID_2() : void 0,
    Y,
    H,
    ke,
    Re = result.offersBlockOutsideReads === !0 ? ctx.tool.getPath?.(displayInput) : void 0,
    Q = Re
      ? sendOutsideReadsBridgeDialog({
          bridge: V,
          toolName: ctx.tool.name,
          path: Re,
          toolUseID: ctx.toolUseID,
          onAnswer: (L) => {
            if (!claim()) return !1;
            switch ((clearClassifierChecking(setClassifierApprovals, ctx.toolUseID), L)) {
              case "allow":
                onRemoteDialogAnswer({ behavior: "allow", updatedInput: displayInput });
                break;
              case "block":
                onRemoteDialogAnswer({ behavior: "deny", blockOutsideReads: !0 });
                break;
              case "ask_again":
                onRemoteDialogAnswer({ behavior: "deny" });
                break;
              case "allow_once":
                onRemoteDialogAnswer({
                  behavior: "allow",
                  updatedInput: displayInput,
                  askAgainOutsideReads: !0,
                });
                break;
            }
            return !0;
          },
        })
      : void 0;
  function oe(L) {
    if (E && M) {
      if (L) E.sendResponse(M, L);
      E.cancelRequest(M);
    }
    (Y?.(), H?.(), Q?.());
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
      requiresLocalPerson(ctx, result) || void 0,
      ce ? "browser" : void 0,
      void 0,
    );
    let signal = ctx.toolUseContext.abortController.signal;
    ((Y = E.onResponse(M, ctx.tool.name, (K) => {
      if (!claim()) return;
      if (K.updatedPermissionsDropped)
        logFeatureSad("permission_bridge_relay", "updated_permissions_malformed");
      else logFeatureOk("permission_bridge_relay");
      if (Y) signal.removeEventListener("abort", Y);
      if (
        (clearClassifierChecking(setClassifierApprovals, ctx.toolUseID), H?.(), Q?.(), K.behavior === "allow")
      ) {
        let displayInput_2 =
            result.metadata?.mcpSkill === void 0 &&
            findSafetyCheckReason(result.decisionReason, (response) => !response.classifierApprovable) !==
              void 0,
          ge = normalizePermissionUpdate(
            K.updatedPermissions ?? [],
            displayInput_2 ||
              ctx.tool.suppressesAlwaysAllowRule?.(displayInput) === !0 ||
              result.suppressAlwaysAllowRule === !0
              ? void 0
              : suggestWebToolRule(ctx.tool, displayInput),
            getToolPermissionContext(ctx.toolUseContext),
          ),
          re = result.metadata?.mcpSkill === void 0 ? void 0 : { rule: void 0 },
          Ae =
            re !== void 0
              ? answerUpdatesForMcpSkillAsk(ge, re.rule)
              : ctx.tool.suppressesAllPermissionUpdates?.(displayInput) === !0 || displayInput_2
                ? withoutGrantsForRemoteScope(ge)
                : ctx.tool.suppressesAlwaysAllowRule?.(displayInput) === !0 ||
                    result.suppressAlwaysAllowRule === !0
                  ? stripWholeToolGrantsForAsk(ge, ctx.tool, getToolPermissionContext(ctx.toolUseContext))
                  : ge,
          _e = applyBridgePermissionUpdates(ctx, Ae);
        if (Ae.length) logShellAllowRuleAdded(Ae);
        let channelRequestId = permissionGrantScope(_e);
        (ctx.logDecision(
          {
            decision: "accept",
            source: { type: "user", permanent: channelRequestId === "always" },
            scope: channelRequestId,
          },
          { input: K.updatedInput ?? displayInput, permissionPromptStartTimeMs: permissionPromptStartTimeMs },
        ),
          onWin(ctx.buildAllow(K.updatedInput ?? displayInput)));
      } else
        (ctx.logDecision(
          { decision: "reject", source: { type: "user_reject", hasFeedback: !!K.message } },
          { permissionPromptStartTimeMs: permissionPromptStartTimeMs },
        ),
          onWin(ctx.cancelAndAbort(K.message, void 0, void 0, { feedbackIsFromUser: !0 })));
    })),
      signal.addEventListener("abort", Y, { once: !0 }));
  }
  if (x && isChannelsEnabled() && !requiresLocalPerson(ctx, result)) {
    let L = generatePermissionRequestId(`${ctx.toolUseID}:${randomUUID_2()}`),
      allowedChannels = getAllowedChannels(),
      ce = result.metadata?.mcpSkill?.server.name,
      ie = filterPermissionRelayClients(
        ctx.toolUseContext.getMcp().clients,
        (K) => K !== ce && findChannelEntry(K, allowedChannels) !== void 0,
        (name) => x.isServerRegistered(name),
      );
    if (ie.length > 0) {
      let params = {
        request_id: L,
        tool_name: ctx.tool.name,
        description: sanitizePreviewLine(
          redactSecretsForDisplay(result.metadata?.mcpSkill?.summary ?? description),
        ),
        input_preview: truncateForPreview(displayInput),
      };
      for (let client of ie) {
        if (client.type !== "connected") continue;
        sendMcpNotification(client, { method: CHANNEL_PERMISSION_REQUEST_METHOD, params: params }).catch(
          (Ae) => {
            (logFeatureBad("permission_channel_relay", "permission_channel_relay_send_failed"),
              logForDebugging(`Channel permission_request failed for ${client.name}: ${errorMessage(Ae)}`, {
                level: "error",
              }));
          },
        );
      }
      let channelSignal = ctx.toolUseContext.abortController.signal,
        mapUnsub = x.onResponse(L, (response) => {
          if (response.behavior === "allow" && response.fromServer === ce) return;
          if (!claim()) return;
          if (
            (logFeatureOk("permission_channel_relay"),
            clearClassifierChecking(setClassifierApprovals, ctx.toolUseID),
            oe(),
            response.behavior === "allow")
          )
            (ctx.logDecision(
              { decision: "accept", source: { type: "user", permanent: !1 } },
              { permissionPromptStartTimeMs: permissionPromptStartTimeMs },
            ),
              onWin(ctx.buildAllow(displayInput)));
          else
            (ctx.logDecision(
              { decision: "reject", source: { type: "user_reject", hasFeedback: !1 } },
              { permissionPromptStartTimeMs: permissionPromptStartTimeMs },
            ),
              onWin(ctx.cancelAndAbort(`Denied via channel ${response.fromServer}`)));
        });
      ((H = () => {
        (mapUnsub(), channelSignal.removeEventListener("abort", H));
      }),
        channelSignal.addEventListener("abort", H, { once: !0 }));
    }
  }
  let serverApprovalWatch = result.serverApprovalWatch,
    pe = serverApprovalWatch ? getInteractiveHandlerHost() : null,
    De =
      serverApprovalWatch && pe?.isEnabled()
        ? pe.createObserver(serverApprovalWatch, ctx.toolUseContext.toolState, ctx.toolUseContext.credentials)
        : null;
  if (serverApprovalWatch && De) {
    let signal = ctx.toolUseContext.abortController.signal,
      me = !1;
    ((ke = () => {
      me = !0;
    }),
      (async () => {
        let poll = await De.poll(),
          ie = 3000,
          K = 15000;
        while (!poll && !isResolved() && !signal.aborted && !me) {
          if ((await sleep(ie, signal), isResolved() || signal.aborted || me)) return;
          if (((poll = await De.poll()), !poll)) {
            ie = Math.min(Math.round(ie * 1.5), K);
            continue;
          }
          if (getToolPermissionContext(ctx.toolUseContext).mode === "plan") {
            (logForDebugging("Server approval observed but parked: session is in plan mode"),
              (poll = !1),
              (ie = Math.min(Math.round(ie * 1.5), K)));
            continue;
          }
          if (me || !claim()) return;
          (clearClassifierChecking(setClassifierApprovals, ctx.toolUseID),
            oe(),
            logFeatureOk("permission_server_approval_watch"),
            ctx.logDecision(
              { decision: "accept", source: { type: "user", permanent: !1 } },
              { permissionPromptStartTimeMs: permissionPromptStartTimeMs },
            ),
            onWin(
              ctx.buildAllow({ ...(result.updatedInput ?? displayInput), __projectGrantServerObserved: !0 }),
            ));
          return;
        }
      })().catch((ce) => {
        (logFeatureBad("permission_server_approval_watch", "watcher_stopped"),
          logForDebugging(`Server-approval watcher stopped (${errorMessage(ce)})`));
      }));
  }
  if (!awaitAutomatedChecksBeforeDialog && result.personOnly !== !0)
    (async () => {
      if (isResolved()) return;
      let runHooks = await ctx.runHooks(
        getToolPermissionContext(ctx.toolUseContext).mode,
        result.suggestions,
        result.suppressAlwaysAllowRule === !0,
        () => isResolved() || ctx.toolUseContext.abortController.signal.aborted,
        result.updatedInput,
        permissionPromptStartTimeMs,
      );
      if (runHooks && "reprompted" in runHooks) {
        if (isResolved()) return;
        (clearClassifierChecking(setClassifierApprovals, ctx.toolUseID),
          oe(),
          (M = void 0),
          ke?.(),
          onReprompt(runHooks.finalInput, runHooks.reprompted.decisionReason, runHooks.reprompted));
        return;
      }
      if (!runHooks || !claim()) return;
      (oe(), onWin(runHooks));
    })().catch((error) => {
      if (error instanceof StreamClosedAbortError) {
        logForDebugging("PermissionRequest hooks cancelled (control stream closed)");
        return;
      }
      logError(error);
    });
  return { notifyBridgeAndTeardown: oe };
}

export { handleInteractivePermission, bridgeApprovalPrompt };
