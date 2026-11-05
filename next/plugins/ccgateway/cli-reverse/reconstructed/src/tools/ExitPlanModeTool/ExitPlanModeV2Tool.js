/**
 * tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts
 *
 * ExitPlanMode 工具：提交计划请求批准，恢复计划前的权限模式；队友走 team lead 邮箱审批；diskless 会话以参数传 plan
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts
 * pieces: chunk-sc94d59g.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  _enum,
  stringSchema,
  zodStrictObject,
  array,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { EXITPLANMODE_2 } from "./constants.js";
import {
  isDisklessSession,
  getPlanFilePath,
  notePlanFileForgotten,
  getPlanAsync,
  persistPlanEdit,
} from "../../utils/plans.js";
import { EXIT_PLAN_MODE_PROMPT, EXIT_PLAN_MODE_DISKLESS_PROMPT, DISKLESS_PLAN_PROMPT } from "./prompt.js";
import {
  isDisklessPlanDocsOn,
  planDocRef,
  describePlanDoc,
  planDocsServerNameFor,
  planDocUrl,
  planDocIdFromPath,
} from "../../services/mcp/claudeDocsLinks.js";
import {
  getAllowedChannels,
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  hasExitedPlanModeInSession,
  setHasExitedPlanMode,
  setNeedsPlanModeExitAttachment,
  setNeedsAutoModeExitAttachment,
} from "../../bootstrap/state.js";
import { hasPermissionPromptTool } from "../../utils/permissions/permissionPromptHost.js";
import { isTeammate, getEffectiveTeammateContext } from "../../utils/teammate.js";
import { FORK, AGENT } from "../AgentTool/constants.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../EnterPlanModeTool/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { stripHostOwnedInputKeys } from "../../utils/permissions/permissionAnswer.js";
import { READ } from "../../services/mcp/firstPartyServerIds.js";
import { PlanPreconditionError, isResumableTeammate, teammateSpawnPlanHint } from "./planPreconditions.js";
import { chainPlanSnapshot } from "../../utils/api.js";
import { timestampedAgentAddress, agentAddress } from "../../utils/swarm/teammateIds.js";
import { writeToMailbox } from "../../utils/teammateMailbox.js";
import { setAwaitingPlanApproval } from "../../utils/swarm/planApprovalResponse.js";
import { swarmHostState } from "../../utils/swarm/hostState.js";
import { logForDebugging } from "../../utils/debug.js";
import { logPermissionModeChanged } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { matchesToolName } from "../../Tool.js";
import { toolMissingInDiskless } from "../AgentTool/agentEffort.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-sc94d59g.js:6559-8079 fingerprint (2.1.88 match: outputSchema, 0.614)
/**
 * ExitPlanMode 的 schema：allowedPrompts（已废弃）、diskless 下的 plan JSON schema、32768 字节上限、注入 plan/planFilePath 的规范化输入、输出（plan/isAgent/filePath/hasTaskTool/planWasEdited/awaitingLeaderApproval/requestId）。
 */
var allowedPromptSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var exitPlanModeInputSchema;
var DISKLESS_EXIT_PLAN_INPUT_JSON_SCHEMA;
var MAX_PLAN_JSON_BYTES;
var DISKLESS_PLAN_JSON_SCHEMA_KEEPING_PLAN;
var exitPlanModeNormalizedInputSchema;
var exitPlanModeOutputSchema;
deferInit("chunk-sc94d59g.js:6559", () => {
  allowedPromptSchema = DoctorLazy(() =>
    objectSchema({
      tool: _enum(["Bash"]).describe("The tool this prompt applies to"),
      prompt: stringSchema().describe(
        'Semantic description of the action, e.g. "run tests", "install dependencies"',
      ),
    }),
  );
  exitPlanModeInputSchema = DoctorLazy(() =>
    zodStrictObject({
      allowedPrompts: array(allowedPromptSchema()).optional().describe("Deprecated: no longer used."),
    }).passthrough(),
  );
  DISKLESS_EXIT_PLAN_INPUT_JSON_SCHEMA = {
    type: "object",
    properties: {
      plan: {
        type: "string",
        description: "The whole plan, in Markdown, as the user will see it",
      },
    },
    required: ["plan"],
    additionalProperties: false,
  };
  MAX_PLAN_JSON_BYTES = 32768;
  DISKLESS_PLAN_JSON_SCHEMA_KEEPING_PLAN = {
    type: "object",
    properties: {
      plan: {
        type: "string",
        description:
          "The whole plan, in Markdown, as the user will see it. Leave it out when plan mode's reminder has you keep the plan in a Claude Doc.",
      },
    },
    additionalProperties: false,
  };
  exitPlanModeNormalizedInputSchema = DoctorLazy(() =>
    exitPlanModeInputSchema().extend({
      plan: stringSchema().optional().describe("The plan content (injected by normalizeToolInput from disk)"),
      planFilePath: stringSchema().optional().describe("The plan file path (injected by normalizeToolInput)"),
    }),
  );
  exitPlanModeOutputSchema = DoctorLazy(() =>
    objectSchema({
      plan: stringSchema().nullable().describe("The plan that was presented to the user"),
      isAgent: booleanSchema(),
      filePath: stringSchema().optional().describe("The file path where the plan was saved"),
      hasTaskTool: booleanSchema()
        .optional()
        .describe("Whether the Agent tool is available in the current context"),
      planWasEdited: booleanSchema()
        .optional()
        .describe(
          "True when the user edited the plan (CCR web UI or Ctrl+G); determines whether the plan is echoed back in tool_result",
        ),
      awaitingLeaderApproval: booleanSchema()
        .optional()
        .describe("When true, the teammate has sent a plan approval request to the team leader"),
      requestId: stringSchema().optional().describe("Unique identifier for the plan approval request"),
    }),
  );
});
//@ chunk-sc94d59g.js:8189-17039 fingerprint (2.1.88 match: ExitPlanModeV2Tool, 0.636)
/**
 * ExitPlanMode 工具（V2；shouldDefer，非只读，requiresUserInteraction 除队友外为真）。isEnabled：有 channels 的非交互会话或无可用提问通道的非交互会话时关闭。diskless 会话（host launchOptions.diskless）改用 `plan` 参数（≤32768 字节 JSON），否则从计划文件读取。validateInput：fork 子代理不能退出；非计划模式报错提示先 EnterPlanMode。checkPermissions：队友直接允许，否则询问 "Exit plan mode?"。call：队友需审批时把 plan_approval_request 写入 team-lead 邮箱并返回等待状态；否则恢复 prePlanMode（auto 模式不可用时回退 default 并发通知，恢复/剥离危险规则），结果附已批准的计划与计划文件路径。
 */
var ExitPlanModeV2Tool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-sc94d59g.js:8189", () => {
  ExitPlanModeV2Tool = buildTool({
    name: EXITPLANMODE_2,
    searchHint: "present plan for approval and start coding (plan mode only)",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return "Prompts the user to exit plan mode and start coding";
    },
    async prompt() {
      if (!isDisklessSession()) return EXIT_PLAN_MODE_PROMPT;
      return isDisklessPlanDocsOn() ? EXIT_PLAN_MODE_DISKLESS_PROMPT : DISKLESS_PLAN_PROMPT;
    },
    get inputSchema() {
      return exitPlanModeInputSchema();
    },
    get inputJSONSchema() {
      if (!isDisklessSession()) return;
      return isDisklessPlanDocsOn()
        ? DISKLESS_PLAN_JSON_SCHEMA_KEEPING_PLAN
        : DISKLESS_EXIT_PLAN_INPUT_JSON_SCHEMA;
    },
    get outputSchema() {
      return exitPlanModeOutputSchema();
    },
    userFacingName() {
      return "";
    },
    shouldDefer: true,
    isEnabled() {
      if (getAllowedChannels().length > 0 && getIsNonInteractiveSession()) return false;
      if (getIsNonInteractiveSession() && !hasPermissionPromptTool(getPermissionPromptToolName()))
        return false;
      return true;
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return false;
    },
    requiresUserInteraction() {
      if (isTeammate()) return false;
      return true;
    },
    renderToolUseMessage() {
      return null;
    },
    create(toolContext) {
      return {
        async validateInput(input) {
          let context = toolContext;
          if (
            context.agentContext.agentType === "subagent" &&
            context.agentContext.isBuiltIn === true &&
            context.agentContext.subagentName === FORK &&
            (getEffectiveTeammateContext(context) || context.permissions().mode === "plan")
          )
            return {
              result: false,
              message:
                "A fork cannot exit plan mode; that belongs to the session that forked it. Finish your part and report back.",
              errorCode: 2,
            };
          if (getEffectiveTeammateContext(context))
            return {
              result: true,
            };
          if (isDisklessSession() && context.agentId)
            return {
              result: false,
              message:
                "Only the main conversation can ask for plan approval in this session. Give your plan in your final message.",
              errorCode: 3,
            };
          let mode = context.permissions().mode;
          if (mode !== "plan") {
            logEvent("tengu_exit_plan_mode_called_outside_plan", {
              model: telemetrySafeModelName(context.mainLoopModel()),
              mode: fromEnum(mode),
              hasExitedPlanModeInSession: hasExitedPlanModeInSession(),
            });
            return {
              result: false,
              message: `You are not in plan mode. To enter plan mode, call the ${ENTER_PLAN_MODE_TOOL_NAME} tool first. If your plan was already approved, continue with implementation.`,
              errorCode: 1,
            };
          }
          if (isDisklessSession()) {
            let approvalMode = planDocRef(context.permissions());
            if (approvalMode !== undefined)
              return Object.keys(input).length === 0
                ? {
                    result: true,
                  }
                : {
                    result: false,
                    message: `This session's plan is ${describePlanDoc(approvalMode)}, and the user approves the Doc as it stands. Put any change into the Doc, then call this tool with no argument.`,
                    errorCode: 6,
                  };
            let plan = "plan" in input ? input.plan : undefined;
            if (typeof plan !== "string" || plan.trim() === "" || Object.keys(input).length > 1)
              return {
                result: false,
                message:
                  planDocsServerNameFor(context.tools, context.permissions()) === undefined
                    ? "Pass the whole plan as non-empty text in the `plan` argument, and pass no other argument. This session has no plan file to read it from."
                    : "No plan Doc is recorded for this session: none was created, or it was created with arguments other than the ones that plan mode's reminder shows. If you created none, create it with exactly that call and then call this tool with no argument. If you already created one, pass the whole plan as non-empty text in `plan` as the only argument, so that the user is not left with two Docs.",
                errorCode: 4,
              };
            let planJsonBytes = Buffer.byteLength(jsonStringify(input));
            if (planJsonBytes > MAX_PLAN_JSON_BYTES)
              return {
                result: false,
                message: `The plan is ${planJsonBytes} bytes as JSON, over the ${MAX_PLAN_JSON_BYTES} that the user's approval card can carry. A quote, backslash or line break counts as two bytes, and a non-ASCII character as two to four. Shorten the plan and call this tool again.`,
                errorCode: 5,
              };
          }
          return {
            result: true,
          };
        },
        async checkPermissions(input) {
          if (getEffectiveTeammateContext(toolContext))
            return {
              behavior: "allow",
              updatedInput: stripHostOwnedInputKeys(EXITPLANMODE_2, input),
            };
          let planMode = "plan" in input ? undefined : planDocRef(toolContext.permissions());
          return {
            behavior: "ask",
            message: "Exit plan mode?",
            updatedInput:
              planMode === undefined
                ? input
                : {
                    plan: `${
                      planMode.title === undefined
                        ? "This plan is a Claude Doc"
                        : `**${planMode.title.replace(/[!-/:-@[-`{-~]/g, "\\$&")}**

This plan is the Claude Doc of the same name`
                    } that Claude made in this chat. To change the plan, edit the Doc before you answer. If you approve, Claude carries out the Doc as it reads at that moment; if you decline, Claude keeps planning.`,
                    planFilePath: planDocUrl(planMode),
                  },
          };
        },
        async call(input, { onProgress }) {
          let context = toolContext;
          let autoModeModule = null;
          let autoModeHelpers = null;
          [autoModeModule, autoModeHelpers] = await Promise.all([
            import("../../utils/permissions/autoModeState.js"),
            import("../../utils/permissions/permissionSetup.js"),
          ]);
          let isAgent = !!context.agentId;
          let isDiskless = isDisklessSession();
          let permissionMode = planDocRef(context.permissions());
          let filePath =
            isDisklessPlanDocsOn() && "planFilePath" in input
              ? planDocIdFromPath(input.planFilePath)
              : undefined;
          let requestedMode =
            filePath !== undefined && filePath !== permissionMode?.id
              ? {
                  id: filePath,
                  title: undefined,
                }
              : filePath !== undefined || !("plan" in input)
                ? permissionMode
                : undefined;
          let targetMode =
            (requestedMode &&
              `The approved plan is ${describePlanDoc(requestedMode)}, as the user left it when they approved. They may have changed it after you last wrote it, up to that moment, so what you remember writing may not be what they approved.

Before your todo list or any other step, read the Doc: first call ${context.tools.find((docsNote) => docsNote.mcpInfo?.docsConnector === true && docsNote.mcpInfo.toolName === READ)?.name ?? "the Claude Docs connector's read tool"} with only \`ref\` {"object":"project","id":"${requestedMode.id}"}, which lists its tabs and the id of each tab's body (\`content.id\`); then read each body with \`ref\` {"object":"node","id":"<content.id>"} and \`container\` {"kind":"project","id":"${requestedMode.id}"}. Work to the Doc: where it differs from your draft, the Doc is the user's instruction, and following your draft would drop their corrections while they believe that the work follows their plan. If you have not started the work yet, say in one line what they changed, or that nothing changed, then start.

If the read fails, try it once more. If it still fails, do not work from memory: tell the user that you could not read the approved plan, and ask whether to go ahead with it as you last wrote it.`) ??
            ("plan" in input && typeof input.plan === "string" ? input.plan : undefined);
          if (isDiskless && targetMode === undefined)
            throw new PlanPreconditionError(
              "The approval arrived without the plan, so plan mode was not exited. Call this tool again with the whole plan in the `plan` argument.",
            );
          let teamAgent = getPlanFilePath(context.agentId);
          if (!isDiskless) notePlanFileForgotten(teamAgent);
          let planText = targetMode ?? (await getPlanAsync(context.agentId, context.storageV5));
          if (targetMode !== undefined && teamAgent) {
            await persistPlanEdit(teamAgent, targetMode, context.storageV5);
            chainPlanSnapshot(context.storageV5);
          }
          let teammateInfo = getEffectiveTeammateContext(context);
          let teammateTask = teammateInfo
            ? Object.values(context.tasks() ?? {}).find((teammate) =>
                isResumableTeammate(teammate, teammateInfo.agentName),
              )
            : undefined;
          let planRequiredByTeammate =
            context.teammateContext !== undefined && context.permissions().mode === "plan";
          if (planRequiredByTeammate && teammateTask === undefined)
            throw new PlanPreconditionError(
              "This teammate's task could not be found, so plan mode was not exited. Ask the lead to approve your plan.",
            );
          let teammateInPlanMode = planRequiredByTeammate && teammateTask?.permissionMode === "plan";
          if (teammateInfo && (teammateInfo.planModeRequired || teammateInPlanMode)) {
            if (!planText)
              throw new PlanPreconditionError(
                `No plan file found at ${teamAgent}. Please write your plan to this file before calling ExitPlanMode.`,
              );
            let { agentName, teamName } = teammateInfo;
            let approvalRequest = timestampedAgentAddress(
              "plan_approval",
              agentAddress(agentName, teamName || "default"),
            );
            let requestBody = {
              type: "plan_approval_request",
              from: agentName,
              timestamp: new Date().toISOString(),
              planFilePath: teamAgent,
              planContent: planText,
              requestId: approvalRequest,
            };
            if (
              (await writeToMailbox(
                "team-lead",
                {
                  from: agentName,
                  text: jsonStringify(requestBody),
                  timestamp: new Date().toISOString(),
                },
                teamName,
                context.storageV5,
              )) === undefined
            )
              throw new PlanPreconditionError(
                "Failed to write the plan approval request to the lead's inbox \u2014 plan not submitted; try again",
              );
            if (teammateTask)
              setAwaitingPlanApproval(teammateTask.id, context.taskRegistry, {
                requestId: approvalRequest,
              });
            else
              swarmHostState().swarmPermissions.pendingPlanApproval = {
                requestId: approvalRequest,
                answered: false,
              };
            return {
              data: {
                plan: planText,
                isAgent: true,
                filePath: teamAgent,
                awaitingLeaderApproval: true,
                requestId: approvalRequest,
              },
            };
          }
          let autoModeGateNote = null;
          {
            let plannedMode = context.permissions().prePlanMode ?? "default";
            if (plannedMode === "auto" && !(autoModeHelpers?.canPlanReturnToAutoMode(plannedMode) ?? false)) {
              let autoReason = autoModeHelpers?.getAutoModeUnavailableReason() ?? "circuit-breaker";
              autoModeGateNote =
                autoModeHelpers?.getAutoModeUnavailableNotification(autoReason) ?? "auto mode unavailable";
              logForDebugging(
                `[auto-mode gate @ ExitPlanModeV2Tool] prePlanMode=${plannedMode} but plan may not return to it (reason=${autoReason}) \u2014 falling back to default on plan exit`,
                {
                  level: "warn",
                },
              );
            }
          }
          if (autoModeGateNote)
            onProgress?.({
              type: "notification",
              notification: {
                key: "auto-mode-gate-plan-exit-fallback",
                text: `plan exit \u2192 default \xB7 ${autoModeGateNote}`,
                priority: "immediate",
                color: "warning",
                timeoutMs: 1e4,
              },
            });
          let permissionState = context.permissions();
          if (permissionState.mode === "plan" && context.teammateContext === undefined) {
            setHasExitedPlanMode(true);
            setNeedsPlanModeExitAttachment(true);
            let restoreMode = permissionState.prePlanMode ?? "default";
            {
              if (restoreMode === "auto" && !(autoModeHelpers?.canPlanReturnToAutoMode(restoreMode) ?? false))
                restoreMode = "default";
              let returnMode = restoreMode === "auto";
              let isAuto = autoModeModule?.isAutoModeActive() ?? false;
              autoModeModule?.setAutoModeActive(returnMode);
              if (isAuto && !returnMode) setNeedsAutoModeExitAttachment(true);
            }
            logPermissionModeChanged(
              {
                from: "plan",
                to: restoreMode,
                trigger: "exit_plan_mode",
              },
              context.agentContext,
            );
            let isAutoMode = restoreMode === "auto";
            let strippedRules = permissionState.strippedDangerousRules;
            context.setToolPermissionContext((permissionContextBase) => {
              let updated = permissionContextBase;
              if (isAutoMode)
                updated = autoModeHelpers?.stripDangerousPermissionsForAutoMode(updated) ?? updated;
              else if (strippedRules)
                updated = autoModeHelpers?.restoreDangerousPermissions(updated) ?? updated;
              return {
                ...updated,
                mode: restoreMode,
                prePlanMode: undefined,
              };
            });
          }
          let hasTaskTool =
            isAgentSwarmsEnabled() &&
            context.tools.some((canProceed) => matchesToolName(canProceed, AGENT)) &&
            !toolMissingInDiskless(SENDMESSAGE, context.tools);
          return {
            data: {
              plan: planText,
              isAgent,
              filePath: isDiskless ? undefined : teamAgent,
              hasTaskTool: hasTaskTool || undefined,
              planWasEdited: (targetMode !== undefined && !isDiskless) || undefined,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(
      {
        isAgent: output,
        plan: isAgentOut,
        filePath: planWasEdited,
        hasTaskTool: awaitingLead,
        planWasEdited: requestId,
        awaitingLeaderApproval: requestIdOut,
        requestId: toolResultType,
      },
      toolUseId,
    ) {
      if (requestIdOut)
        return {
          type: "tool_result",
          content: `Your plan has been submitted to the team lead for approval.

Plan file: ${planWasEdited}

**What happens next:**
1. Wait for the team lead to review your plan
2. You will receive a message in your inbox with approval/rejection
3. If approved, you can proceed with implementation
4. If rejected, refine your plan based on the feedback

**Important:** Do NOT proceed until you receive approval. Check your inbox for response.

Request ID: ${toolResultType}`,
          tool_use_id: toolUseId,
        };
      if (output)
        return {
          type: "tool_result",
          content:
            'User has approved the plan. There is nothing else needed from you now. Please respond with "ok"',
          tool_use_id: toolUseId,
        };
      if (!isAgentOut || isAgentOut.trim() === "")
        return {
          type: "tool_result",
          content: "User has approved exiting plan mode. You can now proceed.",
          tool_use_id: toolUseId,
        };
      let approvedText = teammateSpawnPlanHint(Boolean(awaitingLead));
      let approvedLabel = requestId ? "Approved Plan (edited by user)" : "Approved Plan";
      return {
        type: "tool_result",
        content: `User has approved your plan. You can now start coding. Start with updating your todo list if applicable${
          planWasEdited === undefined
            ? ""
            : `

Your plan has been saved to: ${planWasEdited}
You can refer back to it if needed during implementation.`
        }${approvedText}

## ${approvedLabel}:
${isAgentOut}`,
        tool_use_id: toolUseId,
      };
    },
  });
});
export { ExitPlanModeV2Tool };
