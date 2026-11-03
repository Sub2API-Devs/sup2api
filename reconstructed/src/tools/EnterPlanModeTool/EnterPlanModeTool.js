/**
 * tools/EnterPlanModeTool/EnterPlanModeTool.ts
 *
 * EnterPlanMode 工具：主会话切换到计划模式（必要时需用户亲自确认）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/EnterPlanModeTool/EnterPlanModeTool.ts
 * pieces: chunk-a5k9jscj.js (2)
 * attribution: sole-consumer 1, fingerprint 1
 */
import { enterPlanModeToolPrompt } from "./prompt.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "./constants.js";
import { ExitPlanModeV2Tool } from "../ExitPlanModeTool/ExitPlanModeV2Tool.js";
import { isDiskless, handlePlanModeTransition } from "../../bootstrap/state.js";
import { applyValidatedPermissionUpdate } from "../../utils/permissions/PermissionUpdate.js";
import { prepareContextForPlanMode } from "../../utils/permissions/permissionSetup.js";
import { ASKUSERQUESTION } from "../AskUserQuestionTool/prompt.js";
import { EXITPLANMODE } from "../ExitPlanModeTool/constants.js";

/**
 * EnterPlanMode 的 prompt（主动在非平凡实现前进入计划模式的使用说明）。
 */
//@ chunk-a5k9jscj.js:31089-31115 sole-consumer
function getEnterPlanModePrompt() {
  return enterPlanModeToolPrompt();
}
/**
 * EnterPlanMode 工具（shouldDefer，只读可并发，isEnabled 跟随 ExitPlanModeV2Tool.isEnabled）。子代理不能进入计划模式；diskless 会话且当前不是 auto/plan 时需要用户亲自确认（personOnly、classifier 不可代批），否则直接允许。call 记录模式切换，把权限上下文切到 plan（prepareContextForPlanMode 保存 prePlanMode），结果附带计划模式要求：只读探索、需要时用 AskUserQuestion、完成后用 ExitPlanMode。
 */
//@ chunk-a5k9jscj.js:31115-33172 fingerprint = EnterPlanModeTool (0.578)
var enterPlanModeInputSchema = DoctorLazy(() => zodStrictObject({})),
  enterPlanModeOutputSchema = DoctorLazy(() =>
    u({ message: o().describe("Confirmation that plan mode was entered") }),
  ),
  EnterPlanModeTool = buildTool({
    name: ENTER_PLAN_MODE_TOOL_NAME,
    searchHint: "switch to plan mode to design an approach before coding",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    async description() {
      return "Requests permission to enter plan mode for complex tasks requiring exploration and design";
    },
    async prompt() {
      return getEnterPlanModePrompt();
    },
    get inputSchema() {
      return enterPlanModeInputSchema();
    },
    get outputSchema() {
      return enterPlanModeOutputSchema();
    },
    userFacingName() {
      return "";
    },
    shouldDefer: !0,
    isEnabled() {
      return ExitPlanModeV2Tool.isEnabled();
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    renderToolUseMessage() {
      return null;
    },
    create(e) {
      return {
        async validateInput(n) {
          if (e.agentId)
            return { result: !1, message: "Only the main session can enter plan mode.", errorCode: 1 };
          return { result: !0 };
        },
        async checkPermissions(n) {
          let { mode: mode } = e.permissions();
          return isDiskless() && mode !== "auto" && mode !== "plan"
            ? {
                behavior: "ask",
                message: "Enter plan mode?",
                updatedInput: n,
                personOnly: !0,
                decisionReason: {
                  type: "safetyCheck",
                  reason:
                    "In plan mode, an automatic check may approve read-only actions that you would otherwise be asked about.",
                  classifierApprovable: !1,
                },
              }
            : { behavior: "allow", updatedInput: n };
        },
        async call(n) {
          if (e.agentId) throw Error("EnterPlanMode tool cannot be used in agent contexts");
          return (
            handlePlanModeTransition(e.permissions().mode, "plan"),
            e.setToolPermissionContext((s) =>
              applyValidatedPermissionUpdate(prepareContextForPlanMode(s), {
                type: "setMode",
                mode: "plan",
                destination: "session",
              }),
            ),
            {
              data: {
                message:
                  "Entered plan mode. You should now focus on exploring the codebase and designing an implementation approach.",
              },
            }
          );
        },
      };
    },
    mapToolResultToToolResultBlockParam({ message: e }, n) {
      return {
        type: "tool_result",
        content: `${e}

In plan mode, you should:
1. Thoroughly explore the codebase to understand existing patterns
2. Identify similar features and architectural approaches
3. Consider multiple approaches and their trade-offs
4. Use ${ASKUSERQUESTION} if you need to clarify the approach
5. Design a concrete implementation strategy
6. When ready, use ${EXITPLANMODE} to present your plan for approval

Remember: DO NOT write or edit any files yet. This is a read-only exploration and planning phase.`,
        tool_use_id: n,
      };
    },
  });

export { EnterPlanModeTool };
