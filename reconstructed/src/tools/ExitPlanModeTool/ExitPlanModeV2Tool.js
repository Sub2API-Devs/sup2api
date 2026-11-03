/**
 * tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts
 *
 * ExitPlanMode 工具：提交计划请求批准，恢复计划前的权限模式；队友走 team lead 邮箱审批；diskless 会话以参数传 plan
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ExitPlanModeTool/ExitPlanModeV2Tool.ts
 * pieces: chunk-fnhsh6ng.js (2)
 * attribution: fingerprint 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, U, o, zodStrictObject, A, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { EXITPLANMODE_2 } from "./constants.js";
import {
  MCe,
  getPlanFilePath,
  notePlanFileForgotten,
  getPlanAsync,
  persistPlanEdit,
} from "../../utils/plans.js";
import { EXIT_PLAN_MODE_DISKLESS_PROMPT, EXIT_PLAN_MODE_PROMPT } from "./prompt.js";
import {
  getAllowedChannels,
  getIsNonInteractiveSession,
  getPermissionPromptToolName,
  hasExitedPlanModeInSession,
  setHasExitedPlanMode,
  setNeedsPlanModeExitAttachment,
  setNeedsAutoModeExitAttachment,
} from "../../bootstrap/state.js";
import { zue } from "../../utils/permissions/permissionPromptHost.js";
import { isTeammate, getEffectiveTeammateContext } from "../../utils/teammate.js";
import { FORK, AGENT } from "../AgentTool/constants.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../EnterPlanModeTool/constants.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { stripHostOwnedInputKeys } from "../../utils/permissions/permissionAnswer.js";
import { PlanPreconditionError, isResumableTeammate, teammateSpawnPlanHint } from "./planPreconditions.js";
import { chainPlanSnapshot } from "../../utils/api.js";
import { Fhr, MG } from "../../utils/swarm/teammateIds.js";
import { writeToMailbox } from "../../utils/teammateMailbox.js";
import { setAwaitingPlanApproval } from "../../utils/swarm/planApprovalResponse.js";
import { ci } from "../../utils/swarm/hostState.js";
import { logForDebugging } from "../../utils/debug.js";
import { logPermissionModeChanged } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { toolMatchesName } from "../../Tool.js";
import { o8n } from "../AgentTool/agentEffort.js";
import { SENDMESSAGE } from "../SendMessageTool/constants.js";

/**
 * ExitPlanMode 的 schema：allowedPrompts（已废弃）、diskless 下的 plan JSON schema、32768 字节上限、注入 plan/planFilePath 的规范化输入、输出（plan/isAgent/filePath/hasTaskTool/planWasEdited/awaitingLeaderApproval/requestId）。
 */
//@ chunk-fnhsh6ng.js:5426-6724 fingerprint = outputSchema (0.634)
var allowedPromptSchema = DoctorLazy(() =>
    u({
      tool: U(["Bash"]).describe("The tool this prompt applies to"),
      prompt: o().describe('Semantic description of the action, e.g. "run tests", "install dependencies"'),
    }),
  ),
  exitPlanModeInputSchema = DoctorLazy(() =>
    zodStrictObject({
      allowedPrompts: A(allowedPromptSchema()).optional().describe("Deprecated: no longer used."),
    }).passthrough(),
  ),
  DISKLESS_EXIT_PLAN_INPUT_JSON_SCHEMA = {
    type: "object",
    properties: {
      plan: { type: "string", description: "The whole plan, in Markdown, as the user will see it" },
    },
    required: ["plan"],
    additionalProperties: !1,
  },
  MAX_PLAN_JSON_BYTES = 32768,
  exitPlanModeNormalizedInputSchema = DoctorLazy(() =>
    exitPlanModeInputSchema().extend({
      plan: o().optional().describe("The plan content (injected by normalizeToolInput from disk)"),
      planFilePath: o().optional().describe("The plan file path (injected by normalizeToolInput)"),
    }),
  ),
  exitPlanModeOutputSchema = DoctorLazy(() =>
    u({
      plan: o().nullable().describe("The plan that was presented to the user"),
      isAgent: M(),
      filePath: o().optional().describe("The file path where the plan was saved"),
      hasTaskTool: M().optional().describe("Whether the Agent tool is available in the current context"),
      planWasEdited: M()
        .optional()
        .describe(
          "True when the user edited the plan (CCR web UI or Ctrl+G); determines whether the plan is echoed back in tool_result",
        ),
      awaitingLeaderApproval: M()
        .optional()
        .describe("When true, the teammate has sent a plan approval request to the team leader"),
      requestId: o().optional().describe("Unique identifier for the plan approval request"),
    }),
  );
/**
 * ExitPlanMode 工具（V2；shouldDefer，非只读，requiresUserInteraction 除队友外为真）。isEnabled：有 channels 的非交互会话或无可用提问通道的非交互会话时关闭。diskless 会话（host launchOptions.diskless）改用 `plan` 参数（≤32768 字节 JSON），否则从计划文件读取。validateInput：fork 子代理不能退出；非计划模式报错提示先 EnterPlanMode。checkPermissions：队友直接允许，否则询问 "Exit plan mode?"。call：队友需审批时把 plan_approval_request 写入 team-lead 邮箱并返回等待状态；否则恢复 prePlanMode（auto 模式不可用时回退 default 并发通知，恢复/剥离危险规则），结果附已批准的计划与计划文件路径。
 */
//@ chunk-fnhsh6ng.js:6834-13234 fingerprint = ExitPlanModeV2Tool (0.715)
var ExitPlanModeV2Tool = buildTool({
  name: EXITPLANMODE_2,
  searchHint: "present plan for approval and start coding (plan mode only)",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return "Prompts the user to exit plan mode and start coding";
  },
  async prompt() {
    return MCe() ? EXIT_PLAN_MODE_DISKLESS_PROMPT : EXIT_PLAN_MODE_PROMPT;
  },
  get inputSchema() {
    return exitPlanModeInputSchema();
  },
  get inputJSONSchema() {
    return MCe() ? DISKLESS_EXIT_PLAN_INPUT_JSON_SCHEMA : void 0;
  },
  get outputSchema() {
    return exitPlanModeOutputSchema();
  },
  userFacingName() {
    return "";
  },
  shouldDefer: !0,
  isEnabled() {
    if (getAllowedChannels().length > 0 && getIsNonInteractiveSession()) return !1;
    if (getIsNonInteractiveSession() && !zue(getPermissionPromptToolName())) return !1;
    return !0;
  },
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !1;
  },
  requiresUserInteraction() {
    if (isTeammate()) return !1;
    return !0;
  },
  renderToolUseMessage() {
    return null;
  },
  create(r) {
    return {
      async validateInput(e) {
        let n = r;
        if (
          n.agentContext.agentType === "subagent" &&
          n.agentContext.isBuiltIn === !0 &&
          n.agentContext.subagentName === FORK &&
          (getEffectiveTeammateContext(n) || n.permissions().mode === "plan")
        )
          return {
            result: !1,
            message:
              "A fork cannot exit plan mode; that belongs to the session that forked it. Finish your part and report back.",
            errorCode: 2,
          };
        if (getEffectiveTeammateContext(n)) return { result: !0 };
        if (MCe() && n.agentId)
          return {
            result: !1,
            message:
              "Only the main conversation can ask for plan approval in this session. Give your plan in your final message.",
            errorCode: 3,
          };
        let mode = n.permissions().mode;
        if (mode !== "plan")
          return (
            logEvent("tengu_exit_plan_mode_called_outside_plan", {
              model: telemetrySafeModelName(n.mainLoopModel()),
              mode: fromEnum(mode),
              hasExitedPlanModeInSession: hasExitedPlanModeInSession(),
            }),
            {
              result: !1,
              message: `You are not in plan mode. To enter plan mode, call the ${ENTER_PLAN_MODE_TOOL_NAME} tool first. If your plan was already approved, continue with implementation.`,
              errorCode: 1,
            }
          );
        if (MCe()) {
          let d = "plan" in e ? e.plan : void 0;
          if (typeof d !== "string" || d.trim() === "" || Object.keys(e).length > 1)
            return {
              result: !1,
              message:
                "Pass the whole plan as non-empty text in the `plan` argument, and pass no other argument. This session has no plan file to read it from.",
              errorCode: 4,
            };
          let byteLength = Buffer.byteLength(jsonStringify(e));
          if (byteLength > MAX_PLAN_JSON_BYTES)
            return {
              result: !1,
              message: `The plan is ${byteLength} bytes as JSON, over the ${MAX_PLAN_JSON_BYTES} that the user's approval card can carry. A quote, backslash or line break counts as two bytes, and a non-ASCII character as two to four. Shorten the plan and call this tool again.`,
              errorCode: 5,
            };
        }
        return { result: !0 };
      },
      async checkPermissions(e) {
        if (getEffectiveTeammateContext(r))
          return { behavior: "allow", updatedInput: stripHostOwnedInputKeys(EXITPLANMODE_2, e) };
        return { behavior: "ask", message: "Exit plan mode?", updatedInput: e };
      },
      async call(e, { onProgress: n }) {
        let s = r,
          l = null,
          d = null;
        [l, d] = await Promise.all([import("./chunk-dbas1xsr.js"), import("./chunk-x38v0jj9.js")]);
        let h = !!s.agentId,
          m = MCe(),
          P = "plan" in e && typeof e.plan === "string" ? e.plan : void 0;
        if (m && P === void 0)
          throw new PlanPreconditionError(
            "The approval arrived without the plan, so plan mode was not exited. Call this tool again with the whole plan in the `plan` argument.",
          );
        let T = getPlanFilePath(s.agentId);
        if (!m) notePlanFileForgotten(T);
        let x = P ?? (await getPlanAsync(s.agentId, s.storageV5));
        if (P !== void 0 && T) (await persistPlanEdit(T, P, s.storageV5), chainPlanSnapshot(s.storageV5));
        let S = getEffectiveTeammateContext(s),
          k = S ? Object.values(s.tasks() ?? {}).find((i) => isResumableTeammate(i, S.agentName)) : void 0,
          L = s.teammateContext !== void 0 && s.permissions().mode === "plan";
        if (L && k === void 0)
          throw new PlanPreconditionError(
            "This teammate's task could not be found, so plan mode was not exited. Ask the lead to approve your plan.",
          );
        let F = L && k?.permissionMode === "plan";
        if (S && (S.planModeRequired || F)) {
          if (!x)
            throw new PlanPreconditionError(
              `No plan file found at ${T}. Please write your plan to this file before calling ExitPlanMode.`,
            );
          let { agentName: agentName, teamName: teamName } = S,
            w = Fhr("plan_approval", MG(agentName, teamName || "default")),
            b = {
              type: "plan_approval_request",
              from: agentName,
              timestamp: new Date().toISOString(),
              planFilePath: T,
              planContent: x,
              requestId: w,
            };
          if (
            (await writeToMailbox(
              "team-lead",
              { from: agentName, text: jsonStringify(b), timestamp: new Date().toISOString() },
              teamName,
              s.storageV5,
            )) === void 0
          )
            throw new PlanPreconditionError(
              "Failed to write the plan approval request to the lead's inbox \u2014 plan not submitted; try again",
            );
          if (k) setAwaitingPlanApproval(k.id, s.taskRegistry, { requestId: w });
          else ci().swarmPermissions.pendingPlanApproval = { requestId: w, answered: !1 };
          return { data: { plan: x, isAgent: !0, filePath: T, awaitingLeaderApproval: !0, requestId: w } };
        }
        let O = null;
        {
          let i = s.permissions().prePlanMode ?? "default";
          if (i === "auto" && !(d?.canPlanReturnToAutoMode(i) ?? !1)) {
            let v = d?.getAutoModeUnavailableReason() ?? "circuit-breaker";
            ((O = d?.getAutoModeUnavailableNotification(v) ?? "auto mode unavailable"),
              logForDebugging(
                `[auto-mode gate @ ExitPlanModeV2Tool] prePlanMode=${i} but plan may not return to it (reason=${v}) \u2014 falling back to default on plan exit`,
                { level: "warn" },
              ));
          }
        }
        if (O)
          n?.({
            type: "notification",
            notification: {
              key: "auto-mode-gate-plan-exit-fallback",
              text: `plan exit \u2192 default \xB7 ${O}`,
              priority: "immediate",
              color: "warning",
              timeoutMs: 1e4,
            },
          });
        let permissions = s.permissions();
        if (permissions.mode === "plan" && s.teammateContext === void 0) {
          (setHasExitedPlanMode(!0), setNeedsPlanModeExitAttachment(!0));
          let i = permissions.prePlanMode ?? "default";
          {
            if (i === "auto" && !(d?.canPlanReturnToAutoMode(i) ?? !1)) i = "default";
            let b = i === "auto",
              y = l?.isAutoModeActive() ?? !1;
            if ((l?.setAutoModeActive(b), y && !b)) setNeedsAutoModeExitAttachment(!0);
          }
          logPermissionModeChanged({ from: "plan", to: i, trigger: "exit_plan_mode" }, s.agentContext);
          let v = i === "auto",
            strippedDangerousRules = permissions.strippedDangerousRules;
          s.setToolPermissionContext((b) => {
            let y = b;
            if (v) y = d?.stripDangerousPermissionsForAutoMode(y) ?? y;
            else if (strippedDangerousRules) y = d?.restoreDangerousPermissions(y) ?? y;
            return { ...y, mode: i, prePlanMode: void 0 };
          });
        }
        let B =
          isAgentSwarmsEnabled() &&
          s.tools.some((tool) => toolMatchesName(tool, AGENT)) &&
          !o8n(SENDMESSAGE, s.tools);
        return {
          data: {
            plan: x,
            isAgent: h,
            filePath: m ? void 0 : T,
            hasTaskTool: B || void 0,
            planWasEdited: (P !== void 0 && !m) || void 0,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(
    {
      isAgent: r,
      plan: e,
      filePath: n,
      hasTaskTool: s,
      planWasEdited: l,
      awaitingLeaderApproval: d,
      requestId: h,
    },
    m,
  ) {
    if (d)
      return {
        type: "tool_result",
        content: `Your plan has been submitted to the team lead for approval.

Plan file: ${n}

**What happens next:**
1. Wait for the team lead to review your plan
2. You will receive a message in your inbox with approval/rejection
3. If approved, you can proceed with implementation
4. If rejected, refine your plan based on the feedback

**Important:** Do NOT proceed until you receive approval. Check your inbox for response.

Request ID: ${h}`,
        tool_use_id: m,
      };
    if (r)
      return {
        type: "tool_result",
        content:
          'User has approved the plan. There is nothing else needed from you now. Please respond with "ok"',
        tool_use_id: m,
      };
    if (!e || e.trim() === "")
      return {
        type: "tool_result",
        content: "User has approved exiting plan mode. You can now proceed.",
        tool_use_id: m,
      };
    let P = teammateSpawnPlanHint(Boolean(s)),
      T = l ? "Approved Plan (edited by user)" : "Approved Plan";
    return {
      type: "tool_result",
      content: `User has approved your plan. You can now start coding. Start with updating your todo list if applicable${
        n === void 0
          ? ""
          : `

Your plan has been saved to: ${n}
You can refer back to it if needed during implementation.`
      }${P}

## ${T}:
${e}`,
      tool_use_id: m,
    };
  },
});

export { ExitPlanModeV2Tool };
