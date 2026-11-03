/**
 * services/workflow/reportTool.ts
 *
 * 2.1.316 新增：工作流汇报工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../tools/permissionCheckGuard.js";
import { SUBAGENTHANDBACK } from "../../tools/AgentTool/constants.js";
import { SUBAGENT_REPORT_INSTRUCTIONS, t2n, n2n, Zzn } from "../../tools/AgentTool/subagentSpawn.js";
import { O9n } from "../../utils/permissions/permissions.js";
import { R5t, Igi } from "../../tools/AgentTool/handbackReport.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-41w44bgm.js:38376-38491 placement
var reportInputSchema = DoctorLazy(() => u({ message: o().describe("Your full report for your caller") })),
  reportOutputSchema = DoctorLazy(() => u({ success: M(), message: o() }));
/**
 * 构造子代理向调用者交回最终报告的工具（SUBAGENTHANDBACK）：只对指定 agentId 有效，报告不能为空且只计第一次；附带分类器审查结果，可配置为交付后结束回合。
 */
//@ chunk-41w44bgm.js:38491-40004 placement
function createSubagentHandbackTool(agentId, deliver) {
  return buildTool({
    name: SUBAGENTHANDBACK,
    searchHint: "deliver your final report to the agent that spawned you",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    alwaysLoad: !0,
    userFacingName() {
      return SUBAGENTHANDBACK;
    },
    get inputSchema() {
      return reportInputSchema();
    },
    get outputSchema() {
      return reportOutputSchema();
    },
    isReadOnly() {
      return !1;
    },
    classifierOnly() {
      return { onBlock: "flag" };
    },
    async description() {
      return SUBAGENT_REPORT_INSTRUCTIONS;
    },
    async prompt() {
      return t2n;
    },
    toAutoClassifierInput(r) {
      return `${n2n}: ${r.message}`;
    },
    create(r) {
      return {
        async validateInput(h) {
          return h.message.trim().length === 0
            ? {
                result: !1,
                message: "Your report is empty. Put your full report in message and call again.",
                errorCode: 9,
              }
            : { result: !0 };
        },
        async call(h, T) {
          let y = O9n(T.toolUseId);
          if (y !== void 0 && y.kind !== "unavailable" && r.agentId !== void 0) R5t(r.agentId);
          if (r.agentId !== agentId)
            return {
              data: {
                success: !1,
                message: `Nothing was sent: ${SUBAGENTHANDBACK} is not active for this agent. Write your report as plain text instead.`,
              },
            };
          let A =
            y === void 0 ? null : y.kind === "blocked" ? { warning: Zzn(y.reason), kind: "flagged" } : void 0;
          if (
            !deliver({
              message: h.message,
              review: A,
              ...(y !== void 0 && y.kind !== "blocked" && { noVerdict: y }),
              toolUseId: T.toolUseId,
            })
          )
            return {
              data: {
                success: !1,
                message: "Not sent: you already delivered a report, and only the first one counts. Stop now.",
              },
            };
          if (T.toolUseId !== void 0) Igi(agentId, T.toolUseId);
          return {
            data: { success: !0, message: "Report delivered to your caller." },
            ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_purring_pine", !0) && { endsTurn: !0 }),
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(r, h) {
      return { tool_use_id: h, type: "tool_result", content: [{ type: "text", text: jsonStringify(r) }] };
    },
    renderToolUseMessage() {
      return null;
    },
  });
}

export { createSubagentHandbackTool };
