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
import { objectSchema, stringSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../tools/permissionCheckGuard.js";
import { SUBAGENTHANDBACK } from "../../tools/AgentTool/constants.js";
import {
  SUBAGENT_REPORT_INSTRUCTIONS,
  SUBAGENT_HANDBACK_INSTRUCTIONS,
  SUBAGENT_HANDBACK_DESCRIPTION,
  blockedReportWarning,
} from "../../tools/AgentTool/subagentSpawn.js";
import { takeClassifierBlock } from "../../utils/permissions/permissions.js";
import { flagAgentContract, setAgentMissState } from "../../tools/AgentTool/handbackReport.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-41w44bgm.js:38376-38491 placement
var reportInputSchema = DoctorLazy(() =>
  objectSchema({
    message: stringSchema().describe("Your full report for your caller"),
  }),
);
var reportOutputSchema = DoctorLazy(() =>
  objectSchema({
    success: booleanSchema(),
    message: stringSchema(),
  }),
);
//@ chunk-41w44bgm.js:38491-40004 placement
/**
 * 构造子代理向调用者交回最终报告的工具（SUBAGENTHANDBACK）：只对指定 agentId 有效，报告不能为空且只计第一次；附带分类器审查结果，可配置为交付后结束回合。
 */
function createSubagentHandbackTool(agentId, deliver) {
  return buildTool({
    name: SUBAGENTHANDBACK,
    searchHint: "deliver your final report to the agent that spawned you",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    alwaysLoad: true,
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
      return false;
    },
    classifierOnly() {
      return {
        onBlock: "flag",
      };
    },
    async description() {
      return SUBAGENT_REPORT_INSTRUCTIONS;
    },
    async prompt() {
      return SUBAGENT_HANDBACK_INSTRUCTIONS;
    },
    toAutoClassifierInput(input) {
      return `${SUBAGENT_HANDBACK_DESCRIPTION}: ${input.message}`;
    },
    create(context) {
      return {
        async validateInput(input) {
          return input.message.trim().length === 0
            ? {
                result: false,
                message: "Your report is empty. Put your full report in message and call again.",
                errorCode: 9,
              }
            : {
                result: true,
              };
        },
        async call(input, callContext) {
          let block = takeClassifierBlock(callContext.toolUseId);
          if (block !== undefined && block.kind !== "unavailable" && context.agentId !== undefined)
            flagAgentContract(context.agentId);
          if (context.agentId !== agentId)
            return {
              data: {
                success: false,
                message: `Nothing was sent: ${SUBAGENTHANDBACK} is not active for this agent. Write your report as plain text instead.`,
              },
            };
          let review =
            block === undefined
              ? null
              : block.kind === "blocked"
                ? {
                    warning: blockedReportWarning(block.reason),
                    kind: "flagged",
                  }
                : undefined;
          if (
            !deliver({
              message: input.message,
              review,
              ...(block !== undefined &&
                block.kind !== "blocked" && {
                  noVerdict: block,
                }),
              toolUseId: callContext.toolUseId,
            })
          )
            return {
              data: {
                success: false,
                message: "Not sent: you already delivered a report, and only the first one counts. Stop now.",
              },
            };
          if (callContext.toolUseId !== undefined) setAgentMissState(agentId, callContext.toolUseId);
          return {
            data: {
              success: true,
              message: "Report delivered to your caller.",
            },
            ...(getFeatureValue_CACHED_MAY_BE_STALE("tengu_purring_pine", true) && {
              endsTurn: true,
            }),
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: [
          {
            type: "text",
            text: jsonStringify(result),
          },
        ],
      };
    },
    renderToolUseMessage() {
      return null;
    },
  });
}
export { createSubagentHandbackTool };
