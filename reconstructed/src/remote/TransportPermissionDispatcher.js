/**
 * remote/TransportPermissionDispatcher.ts
 *
 * 2.1.316 新增。远程传输的权限请求分派。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: placement 1
 */
import { logForDebugging } from "../utils/debug.js";
import {
  normalizeCanUseToolRequest,
  parsePermissionRequest,
  isSubagentToolRequest,
} from "./wireFrameShape.js";
import {
  KNe,
  m2,
  isComputerFolderTarget,
  toCanUseToolRequest,
  toServedPermissionRequest,
} from "./tools/protocolConstants.js";
import { isSameLocalFolder } from "../components/RemoteEnvironmentDialog.js";
import { hasVisibleText } from "../utils/permissions/approvalPayloadSerialization.js";
import { UH, aUe, buildForwardedPermissionDialog, i0t } from "./forwardedPermissionDialog.js";
import { deviceProofState } from "../utils/hooks/deviceHooks/contentDigest.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./tools/consentText.js";
import { CountedAsk } from "../utils/countedAsk.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { Yn } from "../utils/stripAnsi.js";
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import { het, createAssistantMessage } from "../utils/messages.js";
import { wt } from "./remoteMode.js";
import { sleep } from "../utils/sleep.js";
import { isNotAskUserQuestionCard } from "../components/permissions/permissionCardKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { createPermissionQueueOps } from "../hooks/toolPermission/PermissionContext.js";

/**
 * 远端传输上的权限分派器：接收 can_use_tool/文件夹/仓库信任等 control_request，校验 request_id 与输入形状，排队弹本地对话框，把回答作为 control_response 发回，多设备时处理被别处回答的情况。
 */
//@ chunk-18hwfzwa.js:231334-238716 placement
class TransportPermissionDispatcher {
  inputs;
  inFlight = new Map();
  constructor(h) {
    this.inputs = h;
  }
  setInputs(h) {
    this.inputs = h;
  }
  dispatch = (h, x = !1) => {
    if (h.request.subtype !== "can_use_tool") return !1;
    let request_id = h.request_id;
    if (typeof request_id !== "string")
      return (
        logForDebugging(
          "[TransportPermissionDispatcher] Dropping can_use_tool whose request_id is not a string \u2014 no response is possible",
          { level: "error" },
        ),
        !1
      );
    if (!normalizeCanUseToolRequest(h.request))
      return (
        logForDebugging(`[TransportPermissionDispatcher] Denying malformed can_use_tool ${h.request_id}`, {
          level: "error",
        }),
        this.inputs.sendResponse(h.request_id, parsePermissionRequest(h.request)),
        !1
      );
    let L = KNe(h.request.tool_name) ? this.inputs.repositoryTrustQuestion : void 0,
      ee = L === void 0 && this.inputs.computerFolderPrompt === !0 && m2(h.request.tool_name);
    if (ee && !isComputerFolderTarget(h.request.input))
      return (
        logForDebugging(
          "[TransportPermissionDispatcher] Denying a folder request whose input is not exactly its three string arguments",
          { level: "error" },
        ),
        this.inputs.sendResponse(request_id, parsePermissionRequest(h.request)),
        !1
      );
    let ke =
        L !== void 0 ? toCanUseToolRequest(h.request) : ee ? toServedPermissionRequest(h.request) : h.request,
      Re =
        ee &&
        ke.computer_folder !== void 0 &&
        isSameLocalFolder(ke.computer_folder, ke.input) &&
        [ke.computer_folder.path, ke.computer_folder.computer_name].every(
          (bo) => hasVisibleText(bo) && !/[\r\n\u2028\u2029]/.test(bo) && UH(bo) === bo,
        )
          ? ke.computer_folder
          : void 0,
      request_id_2 = h.request_id,
      He = L === void 0 ? void 0 : deviceProofState(ke, L.answersProveDevice);
    if (L !== void 0 && He !== void 0) {
      logForDebugging(
        `[TransportPermissionDispatcher] Not showing a repository-trust question (${He}); left unanswered for the other devices`,
        { level: "warn" },
      );
      try {
        L.onNotShown?.(He, request_id_2);
      } catch (error) {
        logForDebugging(
          `[TransportPermissionDispatcher] the repository-trust not-shown hook threw: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        );
      }
      return !1;
    }
    let inFlight = this.inFlight;
    if (inFlight.has(request_id_2))
      return (
        logForDebugging(
          `[TransportPermissionDispatcher] can_use_tool ${UH(request_id_2).slice(0, 80)} is already open here \u2014 not dispatching it again`,
          { level: "warn" },
        ),
        !1
      );
    let {
        toolRegistry: toolRegistry,
        toolPermissionContext: toolPermissionContext,
        theme: theme,
      } = this.inputs,
      kt = aUe(ke.tool_name, toolRegistry),
      At = ke.tool_kind === "mcp_skill" || ke.mcp_skill !== void 0;
    if (At) {
      let sliced = UH(request_id_2).slice(0, 80);
      logForDebugging(
        `[TransportPermissionDispatcher] can_use_tool ${sliced}: not showing and not answering this permission request, because this version of Claude Code cannot answer a request of its kind. If it is still open, it stays open until another device of the session answers it, where the session has one, or the session drops it, which for most requests is the end of the turn.`,
        { level: "warn" },
      );
      try {
        this.inputs.onAskNotShown?.(this.inputs.askedByBackgroundSubagent?.(ke) === !0);
      } catch (error) {
        logForDebugging(
          `[TransportPermissionDispatcher] can_use_tool ${sliced}: onAskNotShown or askedByBackgroundSubagent threw: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        );
      }
      return !1;
    }
    let It = ke.description === void 0 ? void 0 : UH(ke.description),
      Ot = ke.decision_reason === void 0 ? void 0 : UH(ke.decision_reason),
      Et =
        It === void 0 || Ot === void 0
          ? void 0
          : It === Ot
            ? ""
            : It.endsWith(`
${Ot}`)
              ? It.slice(0, -(Ot.length + 1))
              : void 0,
      Dt =
        Et === void 0
          ? (ke.description ?? `${ke.tool_name} requires permission`)
          : Et || `${ke.tool_name} requires permission`,
      abortController = new AbortController();
    inFlight.set(request_id_2, abortController);
    let oo = () => inFlight.get(request_id_2) === abortController,
      Xt = this.inputs.askedByBackgroundSubagent !== void 0 && isSubagentToolRequest(ke),
      io = x || this.inputs.handedOverAtAttach?.some((bo) => bo.request_id === request_id_2),
      so = () => Xt && this.inputs.askedByBackgroundSubagent?.(ke) === !0,
      po =
        Re === void 0
          ? void 0
          : {
              name: REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.name"],
              card: {
                question: REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.question"],
                lines: [
                  REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.meaning"],
                  REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.folder"](Re.path),
                  REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.computer"](Re.computer_name),
                ],
                values: [],
              },
            },
      ao = new CountedAsk(),
      co = At
        ? {
            ...(ke.mcp_skill !== void 0 && {
              name: ke.mcp_skill.name,
              ...(ke.mcp_skill.server_description !== void 0 && {
                description: stripNonPrintable(ke.mcp_skill.server_description),
              }),
            }),
          }
        : void 0;
    return (
      buildForwardedPermissionDialog({
        tool: kt,
        input: ke.input,
        description: Dt,
        toolUseID: ke.tool_use_id,
        ...(Xt && { requestSource: { type: "subagent" } }),
        permissionResult: {
          behavior: "ask",
          message: Dt,
          suggestions: ke.permission_suggestions,
          blockedPath: ke.blocked_path,
          suppressAlwaysAllowRule: ke.suppress_always_allow_rule,
          defaultToNo: ke.default_to_no,
          ...(ke.matched_ask_rule &&
            i0t(ke.matched_ask_rule.source) && {
              matchedAskRule: {
                source: ke.matched_ask_rule.source,
                ruleBehavior: "ask",
                ruleValue: {
                  toolName: stripNonPrintable(Yn(ke.matched_ask_rule.tool_name)),
                  ...(ke.matched_ask_rule.rule_content !== void 0 && {
                    ruleContent: stripNonPrintable(Yn(ke.matched_ask_rule.rule_content)),
                  }),
                },
              },
            }),
          ...(ke.decision_reason !== void 0 &&
            ke.decision_reason_type !== "sandboxOverride" && {
              decisionReason:
                ke.decision_reason_type === "safetyCheck" || ke.decision_reason_type === "subcommandResults"
                  ? {
                      type: "safetyCheck",
                      reason: stripNonPrintable(Yn(ke.decision_reason)),
                      classifierApprovable: ke.classifier_approvable ?? !1,
                    }
                  : {
                      type: "other",
                      reason:
                        ke.decision_reason_type === "hook"
                          ? `A hook run for this remote session requires confirmation: ${stripNonPrintable(Yn(ke.decision_reason))}`
                          : ke.decision_reason_type === "classifier"
                            ? `Auto mode needs your confirmation for this ${SHELL_TOOL_NAMES.includes(ke.tool_name) ? "command" : "tool"}.
${het(stripNonPrintable(Yn(ke.decision_reason)))}`
                            : stripNonPrintable(Yn(ke.decision_reason)),
                    },
            }),
          ...(L !== void 0 && {
            decisionReason: {
              type: "other",
              reason:
                L.answersProveDevice === !0
                  ? REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.meaning"]
                  : `${REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.meaning"]}
${REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.unbound"]}`,
            },
          }),
        },
        assistantMessage: createAssistantMessage({
          content: [{ type: "tool_use", id: ke.tool_use_id, name: ke.tool_name, input: ke.input }],
        }),
        theme: theme,
        toolPermissionContext: toolPermissionContext,
        remoteWorkspace: wt(),
        heldServedCall: this.inputs.heldServedCall,
        ...(L !== void 0 && { roomyDescription: !0 }),
        ...(po !== void 0 && { servedCard: po }),
        ...(co !== void 0 && { forwardedMcpSkill: co }),
        signal: abortController.signal,
      })
        .then((bo) => (io ? sleep(0).then(() => bo) : bo))
        .then(({ dialog: dialog, descriptor: descriptor }) => {
          if (!oo()) return Promise.resolve({ behavior: "cancelled" });
          let requestDialog = this.inputs.requestDialog(dialog, descriptor, {
            signal: abortController.signal,
            place: "under",
            ...((so() || io) && { armInputGrace: !0 }),
            ...(isNotAskUserQuestionCard(dialog.kind) && { countedAsk: ao }),
          });
          return (ao.settleWhen(requestDialog), requestDialog);
        })
        .then((bo) => {
          if (!oo()) return;
          inFlight.delete(request_id_2);
          let { sendResponse: sendResponse, canInterruptTurn: canInterruptTurn } = this.inputs,
            Ro = so(),
            Ho = (Io, Wo) => {
              if (Xt)
                logEvent("tengu_remote_subagent_permission_request_answered", {
                  allowed: Io,
                  dismissed: Wo,
                  in_background: Ro,
                });
            };
          if (L !== void 0 && bo.behavior !== "cancelled")
            try {
              L.onAnswered?.();
            } catch (error) {
              logForDebugging(
                `[TransportPermissionDispatcher] the repository-trust answer hook threw: ${error instanceof Error ? error.message : String(error)}`,
                { level: "error" },
              );
            }
          switch (bo.behavior) {
            case "allow":
              (sendResponse(request_id_2, {
                behavior: "allow",
                updatedInput: L === void 0 && !ee ? bo.updatedInput : ke.input,
                ...(L === void 0 &&
                  !ee &&
                  bo.permissionUpdates?.length && { updatedPermissions: [...(bo.permissionUpdates ?? [])] }),
                toolUseID: ke.tool_use_id,
              }),
                Ho(!0, !1));
              return;
            case "deny": {
              let Io =
                canInterruptTurn &&
                createPermissionQueueOps({
                  feedback: bo.feedback,
                  contentBlocks: bo.contentBlocks,
                  isSubagent: isSubagentToolRequest(ke),
                });
              (sendResponse(request_id_2, {
                behavior: "deny",
                message: bo.feedback ?? "User denied permission",
                ...(Io && { interrupt: !0 }),
                toolUseID: ke.tool_use_id,
                ...(L !== void 0 && { decisionClassification: "user_reject" }),
              }),
                Ho(!1, !1));
              return;
            }
            case "cancelled":
              (sendResponse(request_id_2, {
                behavior: "deny",
                message: Ro ? "User denied permission" : "User aborted",
                ...(canInterruptTurn && !Ro && { interrupt: !0 }),
                toolUseID: ke.tool_use_id,
              }),
                Ho(!1, !0));
              return;
          }
        })
        .catch((bo) => {
          if (!oo()) return;
          (inFlight.delete(request_id_2),
            this.inputs.sendResponse(request_id_2, {
              behavior: "deny",
              message: `Permission dialog failed: ${bo instanceof Error ? bo.message : String(bo)}`,
              toolUseID: ke.tool_use_id,
            }));
        }),
      !0
    );
  };
  cancel = (h) => {
    let x = this.inFlight.get(h);
    if (!x) return;
    (this.inFlight.delete(h), x.abort());
  };
  countInFlight() {
    return this.inFlight.size;
  }
  dismissAll() {
    Array.from(this.inFlight.keys()).forEach(this.cancel);
  }
  drain() {
    for (let [h, x] of this.inFlight)
      (this.inFlight.delete(h),
        this.inputs.sendResponse(h, { behavior: "deny", message: "Permission dispatcher unmounted" }),
        x.abort());
  }
}

export { TransportPermissionDispatcher };
