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
  isConfirmRepositoryTrustTool,
  isRequestComputerFolderTool,
  isComputerFolderTarget,
  toCanUseToolRequest,
  toServedPermissionRequest,
} from "./tools/protocolConstants.js";
import { isSameLocalFolder } from "../components/RemoteEnvironmentDialog.js";
import { hasVisibleText } from "../utils/permissions/approvalPayloadSerialization.js";
import {
  toPrintablePermissionText,
  getStubToolForForwardedPermission,
  buildForwardedPermissionDialog,
  isPermissionRuleSource,
} from "./forwardedPermissionDialog.js";
import { deviceProofState } from "../utils/hooks/deviceHooks/contentDigest.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./tools/consentText.js";
import { CountedAsk } from "../utils/countedAsk.js";
import { stripNonPrintable } from "../utils/truncateGraphemes.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { SHELL_TOOL_NAMES } from "../utils/shell/shellToolUtils.js";
import { ensureNoReasonProvided, createAssistantMessage } from "../utils/messages.js";
import { isRemoteSessionAvailable } from "./remoteMode.js";
import { sleep } from "../utils/sleep.js";
import { isNotAskUserQuestionCard } from "../components/permissions/permissionCardKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { createPermissionQueueOps } from "../hooks/toolPermission/PermissionContext.js";

//@ chunk-18hwfzwa.js:231334-238716 placement
/**
 * 远端传输上的权限分派器：接收 can_use_tool/文件夹/仓库信任等 control_request，校验 request_id 与输入形状，排队弹本地对话框，把回答作为 control_response 发回，多设备时处理被别处回答的情况。
 */
class TransportPermissionDispatcher {
  inputs;
  inFlight = new Map();
  constructor(inputs) {
    this.inputs = inputs;
  }
  setInputs(inputs) {
    this.inputs = inputs;
  }
  dispatch = (h, x = false) => {
    if (h.request.subtype !== "can_use_tool") return false;
    let requestId = h.request_id;
    if (typeof requestId !== "string") {
      logForDebugging(
        "[TransportPermissionDispatcher] Dropping can_use_tool whose request_id is not a string \u2014 no response is possible",
        {
          level: "error",
        },
      );
      return false;
    }
    if (!normalizeCanUseToolRequest(h.request)) {
      logForDebugging(`[TransportPermissionDispatcher] Denying malformed can_use_tool ${h.request_id}`, {
        level: "error",
      });
      this.inputs.sendResponse(h.request_id, parsePermissionRequest(h.request));
      return false;
    }
    let repositoryTrustQuestion = isConfirmRepositoryTrustTool(h.request.tool_name)
      ? this.inputs.repositoryTrustQuestion
      : undefined;
    let ee =
      repositoryTrustQuestion === undefined &&
      this.inputs.computerFolderPrompt === true &&
      isRequestComputerFolderTool(h.request.tool_name);
    if (ee && !isComputerFolderTarget(h.request.input)) {
      logForDebugging(
        "[TransportPermissionDispatcher] Denying a folder request whose input is not exactly its three string arguments",
        {
          level: "error",
        },
      );
      this.inputs.sendResponse(requestId, parsePermissionRequest(h.request));
      return false;
    }
    let ke =
      repositoryTrustQuestion !== undefined
        ? toCanUseToolRequest(h.request)
        : ee
          ? toServedPermissionRequest(h.request)
          : h.request;
    let computerFolder =
      ee &&
      ke.computer_folder !== undefined &&
      isSameLocalFolder(ke.computer_folder, ke.input) &&
      [ke.computer_folder.path, ke.computer_folder.computer_name].every(
        (bo) => hasVisibleText(bo) && !/[\r\n\u2028\u2029]/.test(bo) && toPrintablePermissionText(bo) === bo,
      )
        ? ke.computer_folder
        : undefined;
    let requestId_2 = h.request_id;
    let He =
      repositoryTrustQuestion === undefined
        ? undefined
        : deviceProofState(ke, repositoryTrustQuestion.answersProveDevice);
    if (repositoryTrustQuestion !== undefined && He !== undefined) {
      logForDebugging(
        `[TransportPermissionDispatcher] Not showing a repository-trust question (${He}); left unanswered for the other devices`,
        {
          level: "warn",
        },
      );
      try {
        repositoryTrustQuestion.onNotShown?.(He, requestId_2);
      } catch (error) {
        logForDebugging(
          `[TransportPermissionDispatcher] the repository-trust not-shown hook threw: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
      }
      return false;
    }
    let inFlight = this.inFlight;
    if (inFlight.has(requestId_2)) {
      logForDebugging(
        `[TransportPermissionDispatcher] can_use_tool ${toPrintablePermissionText(requestId_2).slice(0, 80)} is already open here \u2014 not dispatching it again`,
        {
          level: "warn",
        },
      );
      return false;
    }
    let { toolRegistry, toolPermissionContext, theme } = this.inputs;
    let tool = getStubToolForForwardedPermission(ke.tool_name, toolRegistry);
    let At = ke.tool_kind === "mcp_skill" || ke.mcp_skill !== undefined;
    if (At) {
      let sliced = toPrintablePermissionText(requestId_2).slice(0, 80);
      logForDebugging(
        `[TransportPermissionDispatcher] can_use_tool ${sliced}: not showing and not answering this permission request, because this version of Claude Code cannot answer a request of its kind. If it is still open, it stays open until another device of the session answers it, where the session has one, or the session drops it, which for most requests is the end of the turn.`,
        {
          level: "warn",
        },
      );
      try {
        this.inputs.onAskNotShown?.(this.inputs.askedByBackgroundSubagent?.(ke) === true);
      } catch (error) {
        logForDebugging(
          `[TransportPermissionDispatcher] can_use_tool ${sliced}: onAskNotShown or askedByBackgroundSubagent threw: ${error instanceof Error ? error.message : String(error)}`,
          {
            level: "error",
          },
        );
      }
      return false;
    }
    let It = ke.description === undefined ? undefined : toPrintablePermissionText(ke.description);
    let Ot = ke.decision_reason === undefined ? undefined : toPrintablePermissionText(ke.decision_reason);
    let Et =
      It === undefined || Ot === undefined
        ? undefined
        : It === Ot
          ? ""
          : It.endsWith(`
${Ot}`)
            ? It.slice(0, -(Ot.length + 1))
            : undefined;
    let Dt =
      Et === undefined
        ? (ke.description ?? `${ke.tool_name} requires permission`)
        : Et || `${ke.tool_name} requires permission`;
    let abortController = new AbortController();
    inFlight.set(requestId_2, abortController);
    let oo = () => inFlight.get(requestId_2) === abortController;
    let Xt = this.inputs.askedByBackgroundSubagent !== undefined && isSubagentToolRequest(ke);
    let io = x || this.inputs.handedOverAtAttach?.some((bo) => bo.request_id === requestId_2);
    let so = () => Xt && this.inputs.askedByBackgroundSubagent?.(ke) === true;
    let po =
      computerFolder === undefined
        ? undefined
        : {
            name: REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.name"],
            card: {
              question: REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.question"],
              lines: [
                REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.meaning"],
                REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.folder"](computerFolder.path),
                REMOTE_TOOLS_CONSENT_TEXT["computer_folder.prompt.computer"](computerFolder.computer_name),
              ],
              values: [],
            },
          };
    let ao = new CountedAsk();
    let co = At
      ? {
          ...(ke.mcp_skill !== undefined && {
            name: ke.mcp_skill.name,
            ...(ke.mcp_skill.server_description !== undefined && {
              description: stripNonPrintable(ke.mcp_skill.server_description),
            }),
          }),
        }
      : undefined;
    buildForwardedPermissionDialog({
      tool,
      input: ke.input,
      description: Dt,
      toolUseID: ke.tool_use_id,
      ...(Xt && {
        requestSource: {
          type: "subagent",
        },
      }),
      permissionResult: {
        behavior: "ask",
        message: Dt,
        suggestions: ke.permission_suggestions,
        blockedPath: ke.blocked_path,
        suppressAlwaysAllowRule: ke.suppress_always_allow_rule,
        defaultToNo: ke.default_to_no,
        ...(ke.matched_ask_rule &&
          isPermissionRuleSource(ke.matched_ask_rule.source) && {
            matchedAskRule: {
              source: ke.matched_ask_rule.source,
              ruleBehavior: "ask",
              ruleValue: {
                toolName: stripNonPrintable(stripAnsi(ke.matched_ask_rule.tool_name)),
                ...(ke.matched_ask_rule.rule_content !== undefined && {
                  ruleContent: stripNonPrintable(stripAnsi(ke.matched_ask_rule.rule_content)),
                }),
              },
            },
          }),
        ...(ke.decision_reason !== undefined &&
          ke.decision_reason_type !== "sandboxOverride" && {
            decisionReason:
              ke.decision_reason_type === "safetyCheck" || ke.decision_reason_type === "subcommandResults"
                ? {
                    type: "safetyCheck",
                    reason: stripNonPrintable(stripAnsi(ke.decision_reason)),
                    classifierApprovable: ke.classifier_approvable ?? false,
                  }
                : {
                    type: "other",
                    reason:
                      ke.decision_reason_type === "hook"
                        ? `A hook run for this remote session requires confirmation: ${stripNonPrintable(stripAnsi(ke.decision_reason))}`
                        : ke.decision_reason_type === "classifier"
                          ? `Auto mode needs your confirmation for this ${SHELL_TOOL_NAMES.includes(ke.tool_name) ? "command" : "tool"}.
${ensureNoReasonProvided(stripNonPrintable(stripAnsi(ke.decision_reason)))}`
                          : stripNonPrintable(stripAnsi(ke.decision_reason)),
                  },
          }),
        ...(repositoryTrustQuestion !== undefined && {
          decisionReason: {
            type: "other",
            reason:
              repositoryTrustQuestion.answersProveDevice === true
                ? REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.meaning"]
                : `${REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.meaning"]}
${REMOTE_TOOLS_CONSENT_TEXT["repository_trust.prompt.unbound"]}`,
          },
        }),
      },
      assistantMessage: createAssistantMessage({
        content: [
          {
            type: "tool_use",
            id: ke.tool_use_id,
            name: ke.tool_name,
            input: ke.input,
          },
        ],
      }),
      theme,
      toolPermissionContext,
      remoteWorkspace: isRemoteSessionAvailable(),
      heldServedCall: this.inputs.heldServedCall,
      ...(repositoryTrustQuestion !== undefined && {
        roomyDescription: true,
      }),
      ...(po !== undefined && {
        servedCard: po,
      }),
      ...(co !== undefined && {
        forwardedMcpSkill: co,
      }),
      signal: abortController.signal,
    })
      .then((forwardedPermissionDialog) =>
        io ? sleep(0).then(() => forwardedPermissionDialog) : forwardedPermissionDialog,
      )
      .then(({ dialog, descriptor }) => {
        if (!oo())
          return Promise.resolve({
            behavior: "cancelled",
          });
        let Bo = this.inputs.requestDialog(dialog, descriptor, {
          signal: abortController.signal,
          place: "under",
          ...((so() || io) && {
            armInputGrace: true,
          }),
          ...(isNotAskUserQuestionCard(dialog.kind) && {
            countedAsk: ao,
          }),
        });
        ao.settleWhen(Bo);
        return Bo;
      })
      .then((bo) => {
        if (!oo()) return;
        inFlight.delete(requestId_2);
        let { sendResponse, canInterruptTurn } = this.inputs;
        let Ro = so();
        let Ho = (allowed, dismissed) => {
          if (Xt)
            logEvent("tengu_remote_subagent_permission_request_answered", {
              allowed,
              dismissed,
              in_background: Ro,
            });
        };
        if (repositoryTrustQuestion !== undefined && bo.behavior !== "cancelled")
          try {
            repositoryTrustQuestion.onAnswered?.();
          } catch (error) {
            logForDebugging(
              `[TransportPermissionDispatcher] the repository-trust answer hook threw: ${error instanceof Error ? error.message : String(error)}`,
              {
                level: "error",
              },
            );
          }
        switch (bo.behavior) {
          case "allow":
            sendResponse(requestId_2, {
              behavior: "allow",
              updatedInput: repositoryTrustQuestion === undefined && !ee ? bo.updatedInput : ke.input,
              ...(repositoryTrustQuestion === undefined &&
                !ee &&
                bo.permissionUpdates?.length && {
                  updatedPermissions: [...(bo.permissionUpdates ?? [])],
                }),
              toolUseID: ke.tool_use_id,
            });
            Ho(true, false);
            return;
          case "deny": {
            let Io =
              canInterruptTurn &&
              createPermissionQueueOps({
                feedback: bo.feedback,
                contentBlocks: bo.contentBlocks,
                isSubagent: isSubagentToolRequest(ke),
              });
            sendResponse(requestId_2, {
              behavior: "deny",
              message: bo.feedback ?? "User denied permission",
              ...(Io && {
                interrupt: true,
              }),
              toolUseID: ke.tool_use_id,
              ...(repositoryTrustQuestion !== undefined && {
                decisionClassification: "user_reject",
              }),
            });
            Ho(false, false);
            return;
          }
          case "cancelled":
            sendResponse(requestId_2, {
              behavior: "deny",
              message: Ro ? "User denied permission" : "User aborted",
              ...(canInterruptTurn &&
                !Ro && {
                  interrupt: true,
                }),
              toolUseID: ke.tool_use_id,
            });
            Ho(false, true);
            return;
        }
      })
      .catch((error) => {
        if (!oo()) return;
        inFlight.delete(requestId_2);
        this.inputs.sendResponse(requestId_2, {
          behavior: "deny",
          message: `Permission dialog failed: ${error instanceof Error ? error.message : String(error)}`,
          toolUseID: ke.tool_use_id,
        });
      });
    return true;
  };
  cancel = (h) => {
    let x = this.inFlight.get(h);
    if (!x) return;
    this.inFlight.delete(h);
    x.abort();
  };
  countInFlight() {
    return this.inFlight.size;
  }
  dismissAll() {
    Array.from(this.inFlight.keys()).forEach(this.cancel);
  }
  drain() {
    for (let [h, x] of this.inFlight) {
      this.inFlight.delete(h);
      this.inputs.sendResponse(h, {
        behavior: "deny",
        message: "Permission dispatcher unmounted",
      });
      x.abort();
    }
  }
}
export { TransportPermissionDispatcher };
