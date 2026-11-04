/**
 * skills/skillVisibility.ts
 *
 * 2.1.316 新增：技能可见性。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1x527z82.js (3)
 * attribution: placement 3
 */
import { isSkillOutsideCorePolicy, isBundledSkillsDisabled } from "./bundledSkillsGate.js";
import { WORKFLOW_AUTHORING } from "./bundled/bundledSkillNames.js";
import { isWorkflowsAvailable } from "../utils/workflows/workflowGates.js";
import { getDisableSlashCommands, getSessionSkillAllowlist } from "../bootstrap/state.js";
import { env } from "../utils/env.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { toolMatchesName } from "../Tool.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";

//@ chunk-1x527z82.js:484-540 placement
/**
 * 工作流编写技能是否可见（可用、未被禁用、且工具合适）。
 */
function isWorkflowAuthoringSkillVisible(tools) {
  return (
    isWorkflowAuthoringSkillAvailable() &&
    !isSkillOutsideCorePolicy(WORKFLOW_AUTHORING) &&
    (tools === undefined || toolsIncludeSkillTool(tools))
  );
}
//@ chunk-1x527z82.js:540-788 placement
function isWorkflowAuthoringSkillAvailable() {
  if (!isWorkflowsAvailable()) return false;
  if (isBundledSkillsDisabled() || getDisableSlashCommands()) return false;
  if (env.CLAUDE_CODE_ENTRYPOINT === "local-agent") return false;
  let override = getInitialSettings_2().skillOverrides?.[WORKFLOW_AUTHORING];
  if (override === "off" || override === "user-invocable-only") return false;
  let sessionSkillAllowlist = getSessionSkillAllowlist();
  if (sessionSkillAllowlist !== undefined && !sessionSkillAllowlist.includes(WORKFLOW_AUTHORING))
    return false;
  return true;
}
//@ chunk-1x527z82.js:788-831 placement
/**
 * 工具表里是否有 Skill 工具。
 */
function toolsIncludeSkillTool(tools) {
  return tools.some((tool) => toolMatchesName(tool, SKILL));
}
export { isWorkflowAuthoringSkillVisible };
