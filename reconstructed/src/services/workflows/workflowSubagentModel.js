/**
 * services/workflows/workflowSubagentModel.ts
 *
 * 2.1.316 新增：工作流子代理模型。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yt4ytnf6.js (1)
 * attribution: placement 1
 */
import { env } from "../../utils/env.js";
import { getAdminTierEnvValue } from "../../utils/settings/settings.js";

//@ chunk-yt4ytnf6.js:263-474 placement
/**
 * 读取工作流子代理模型 CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL：未设置或为 inherit 时返回 undefined；强制子代理模型时只认管理员层设置的同值。
 */
function getWorkflowSubagentModel() {
  let CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL = env.CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL;
  if (!CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL || CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL.toLowerCase() === "inherit")
    return;
  if (
    env.CLAUDE_CODE_SUBAGENT_MODEL_FORCE &&
    getAdminTierEnvValue("CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL")?.trim() !==
      CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL
  )
    return;
  return CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL;
}
export { getWorkflowSubagentModel };
