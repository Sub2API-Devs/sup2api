/**
 * remote/TransportPermissionDispatcher.ts
 *
 * 2.1.316 新增。远程传输的权限请求分派。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-czq1j3j2.js:236373-243755 placement
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
  dispatch = (request, handedOver = false) => {
    if (request.request.subtype !== "can_use_tool") return false;
    let requestId = request.request_id;
    if (typeof requestId !== "string") {
      logForDebugging(
        "[TransportPermissionDispatcher] Dropping can_use_tool whose request_id is not a string \u2014 no response is possible",
        {
          level: "error",
        },
      );
      return false;
    }
    if (!normalizeCanUseToolRequest(request.request)) {
      logForDebugging(
        `[TransportPermissionDispatcher] Denying malformed can_use_tool ${request.request_id}`,
        {
          level: "error",
        },
      );
      this.inputs.sendResponse(request.request_id, parsePermissionRequest(request.request));
      return false;
    }
    let repositoryTrustQuestion = isConfirmRepositoryTrustTool(request.request.tool_name)
      ? this.inputs.repositoryTrustQuestion
      : undefined;
    let folderPrompt =
      repositoryTrustQuestion === undefined &&
      this.inputs.computerFolderPrompt === true &&
      isRequestComputerFolderTool(request.request.tool_name);
    if (folderPrompt && !isComputerFolderTarget(request.request.input)) {
      logForDebugging(
        "[TransportPermissionDispatcher] Denying a folder request whose input is not exactly its three string arguments",
        {
          level: "error",
        },
      );
      this.inputs.sendResponse(requestId, parsePermissionRequest(request.request));
      return false;
    }
    let normalized =
      repositoryTrustQuestion !== undefined
        ? toCanUseToolRequest(request.request)
        : folderPrompt
          ? toServedPermissionRequest(request.request)
          : request.request;
    let computerFolder =
      folderPrompt &&
      normalized.computer_folder !== undefined &&
      isSameLocalFolder(normalized.computer_folder, normalized.input) &&
      [normalized.computer_folder.path, normalized.computer_folder.computer_name].every(
        (value) =>
          hasVisibleText(value) &&
          !/[\r\n\u2028\u2029]/.test(value) &&
          toPrintablePermissionText(value) === value,
      )
        ? normalized.computer_folder
        : undefined;
    let requestId_2 = request.request_id;
    let proofState =
      repositoryTrustQuestion === undefined
        ? undefined
        : deviceProofState(normalized, repositoryTrustQuestion.answersProveDevice);
    if (repositoryTrustQuestion !== undefined && proofState !== undefined) {
      logForDebugging(
        `[TransportPermissionDispatcher] Not showing a repository-trust question (${proofState}); left unanswered for the other devices`,
        {
          level: "warn",
        },
      );
      try {
        repositoryTrustQuestion.onNotShown?.(proofState, requestId_2);
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
    let tool = getStubToolForForwardedPermission(normalized.tool_name, toolRegistry);
    let isMcpSkill = normalized.tool_kind === "mcp_skill" || normalized.mcp_skill !== undefined;
    if (isMcpSkill) {
      let sliced = toPrintablePermissionText(requestId_2).slice(0, 80);
      logForDebugging(
        `[TransportPermissionDispatcher] can_use_tool ${sliced}: not showing and not answering this permission request, because this version of Claude Code cannot answer a request of its kind. If it is still open, it stays open until another device of the session answers it, where the session has one, or the session drops it, which for most requests is the end of the turn.`,
        {
          level: "warn",
        },
      );
      try {
        this.inputs.onAskNotShown?.(this.inputs.askedByBackgroundSubagent?.(normalized) === true);
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
    let description =
      normalized.description === undefined ? undefined : toPrintablePermissionText(normalized.description);
    let decisionReason =
      normalized.decision_reason === undefined
        ? undefined
        : toPrintablePermissionText(normalized.decision_reason);
    let trimmedDescription =
      description === undefined || decisionReason === undefined
        ? undefined
        : description === decisionReason
          ? ""
          : description.endsWith(`
${decisionReason}`)
            ? description.slice(0, -(decisionReason.length + 1))
            : undefined;
    let message =
      trimmedDescription === undefined
        ? (normalized.description ?? `${normalized.tool_name} requires permission`)
        : trimmedDescription || `${normalized.tool_name} requires permission`;
    let abortController = new AbortController();
    inFlight.set(requestId_2, abortController);
    let isCurrent = () => inFlight.get(requestId_2) === abortController;
    let fromSubagent =
      this.inputs.askedByBackgroundSubagent !== undefined && isSubagentToolRequest(normalized);
    let atAttach =
      handedOver || this.inputs.handedOverAtAttach?.some((entry) => entry.request_id === requestId_2);
    let inBackground = () => fromSubagent && this.inputs.askedByBackgroundSubagent?.(normalized) === true;
    let servedCard =
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
    let countedAsk = new CountedAsk();
    let mcpSkillInfo = isMcpSkill
      ? {
          ...(normalized.mcp_skill !== undefined && {
            name: normalized.mcp_skill.name,
            ...(normalized.mcp_skill.server_description !== undefined && {
              description: stripNonPrintable(normalized.mcp_skill.server_description),
            }),
          }),
        }
      : undefined;
    buildForwardedPermissionDialog({
      tool,
      input: normalized.input,
      description: message,
      toolUseID: normalized.tool_use_id,
      ...(fromSubagent && {
        requestSource: {
          type: "subagent",
        },
      }),
      permissionResult: {
        behavior: "ask",
        message,
        suggestions: normalized.permission_suggestions,
        blockedPath: normalized.blocked_path,
        suppressAlwaysAllowRule: normalized.suppress_always_allow_rule,
        defaultToNo: normalized.default_to_no,
        ...(normalized.matched_ask_rule &&
          isPermissionRuleSource(normalized.matched_ask_rule.source) && {
            matchedAskRule: {
              source: normalized.matched_ask_rule.source,
              ruleBehavior: "ask",
              ruleValue: {
                toolName: stripNonPrintable(stripAnsi(normalized.matched_ask_rule.tool_name)),
                ...(normalized.matched_ask_rule.rule_content !== undefined && {
                  ruleContent: stripNonPrintable(stripAnsi(normalized.matched_ask_rule.rule_content)),
                }),
              },
            },
          }),
        ...(normalized.decision_reason !== undefined &&
          normalized.decision_reason_type !== "sandboxOverride" && {
            decisionReason:
              normalized.decision_reason_type === "safetyCheck" ||
              normalized.decision_reason_type === "subcommandResults"
                ? {
                    type: "safetyCheck",
                    reason: stripNonPrintable(stripAnsi(normalized.decision_reason)),
                    classifierApprovable: normalized.classifier_approvable ?? false,
                  }
                : {
                    type: "other",
                    reason:
                      normalized.decision_reason_type === "hook"
                        ? `A hook run for this remote session requires confirmation: ${stripNonPrintable(stripAnsi(normalized.decision_reason))}`
                        : normalized.decision_reason_type === "classifier"
                          ? `Auto mode needs your confirmation for this ${SHELL_TOOL_NAMES.includes(normalized.tool_name) ? "command" : "tool"}.
${ensureNoReasonProvided(stripNonPrintable(stripAnsi(normalized.decision_reason)))}`
                          : stripNonPrintable(stripAnsi(normalized.decision_reason)),
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
            id: normalized.tool_use_id,
            name: normalized.tool_name,
            input: normalized.input,
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
      ...(servedCard !== undefined && {
        servedCard,
      }),
      ...(mcpSkillInfo !== undefined && {
        forwardedMcpSkill: mcpSkillInfo,
      }),
      signal: abortController.signal,
    })
      .then((forwardedPermissionDialog) =>
        atAttach ? sleep(0).then(() => forwardedPermissionDialog) : forwardedPermissionDialog,
      )
      .then(({ dialog, descriptor }) => {
        if (!isCurrent())
          return Promise.resolve({
            behavior: "cancelled",
          });
        let answer = this.inputs.requestDialog(dialog, descriptor, {
          signal: abortController.signal,
          place: "under",
          ...((inBackground() || atAttach) && {
            armInputGrace: true,
          }),
          ...(isNotAskUserQuestionCard(dialog.kind) && {
            countedAsk,
          }),
        });
        countedAsk.settleWhen(answer);
        return answer;
      })
      .then((answer) => {
        if (!isCurrent()) return;
        inFlight.delete(requestId_2);
        let { sendResponse, canInterruptTurn } = this.inputs;
        let answeredInBackground = inBackground();
        let logSubagentAnswer = (allowed, dismissed) => {
          if (fromSubagent)
            logEvent("tengu_remote_subagent_permission_request_answered", {
              allowed,
              dismissed,
              in_background: answeredInBackground,
            });
        };
        if (repositoryTrustQuestion !== undefined && answer.behavior !== "cancelled")
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
        switch (answer.behavior) {
          case "allow":
            sendResponse(requestId_2, {
              behavior: "allow",
              updatedInput:
                repositoryTrustQuestion === undefined && !folderPrompt
                  ? answer.updatedInput
                  : normalized.input,
              ...(repositoryTrustQuestion === undefined &&
                !folderPrompt &&
                answer.permissionUpdates?.length && {
                  updatedPermissions: [...(answer.permissionUpdates ?? [])],
                }),
              toolUseID: normalized.tool_use_id,
            });
            logSubagentAnswer(true, false);
            return;
          case "deny": {
            let queueOps =
              canInterruptTurn &&
              createPermissionQueueOps({
                feedback: answer.feedback,
                contentBlocks: answer.contentBlocks,
                isSubagent: isSubagentToolRequest(normalized),
              });
            sendResponse(requestId_2, {
              behavior: "deny",
              message: answer.feedback ?? "User denied permission",
              ...(queueOps && {
                interrupt: true,
              }),
              toolUseID: normalized.tool_use_id,
              ...(repositoryTrustQuestion !== undefined && {
                decisionClassification: "user_reject",
              }),
            });
            logSubagentAnswer(false, false);
            return;
          }
          case "cancelled":
            sendResponse(requestId_2, {
              behavior: "deny",
              message: answeredInBackground ? "User denied permission" : "User aborted",
              ...(canInterruptTurn &&
                !answeredInBackground && {
                  interrupt: true,
                }),
              toolUseID: normalized.tool_use_id,
            });
            logSubagentAnswer(false, true);
            return;
        }
      })
      .catch((error) => {
        if (!isCurrent()) return;
        inFlight.delete(requestId_2);
        this.inputs.sendResponse(requestId_2, {
          behavior: "deny",
          message: `Permission dialog failed: ${error instanceof Error ? error.message : String(error)}`,
          toolUseID: normalized.tool_use_id,
        });
      });
    return true;
  };
  cancel = (requestId) => {
    let controller = this.inFlight.get(requestId);
    if (!controller) return;
    this.inFlight.delete(requestId);
    controller.abort();
  };
  countInFlight() {
    return this.inFlight.size;
  }
  dismissAll() {
    Array.from(this.inFlight.keys()).forEach(this.cancel);
  }
  drain() {
    for (let [requestId, controller] of this.inFlight) {
      this.inFlight.delete(requestId);
      this.inputs.sendResponse(requestId, {
        behavior: "deny",
        message: "Permission dispatcher unmounted",
      });
      controller.abort();
    }
  }
}
export { TransportPermissionDispatcher };
