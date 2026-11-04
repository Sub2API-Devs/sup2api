/**
 * skills/bundled/workflowAuthoring.ts
 *
 * 2.1.316 新增。注册"编写 Workflow 脚本"内置技能。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-60vpedhe.js (2)
 * attribution: placement 2
 */
import { WORKFLOW_SCRIPT_API_DOC } from "../../tools/WorkflowTool/prompt.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { WORKFLOW_AUTHORING } from "./bundledSkillNames.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { isWorkflowsAvailable } from "../../utils/workflows/workflowGates.js";

//@ chunk-60vpedhe.js:372-420 placement
function renderWorkflowAuthoringSkillBody() {
  return [
    {
      type: "text",
      text: WORKFLOW_SCRIPT_API_DOC(),
    },
  ];
}
//@ chunk-60vpedhe.js:420-840 placement
/**
 * 注册"编写 Workflow 脚本"内置技能。
 */
function registerWorkflowAuthoringSkill() {
  registerBundledSkill({
    name: WORKFLOW_AUTHORING,
    description: `Reference for writing a ${WORKFLOW_TOOL_NAME} tool script (script API and gotchas, resume, quality patterns, worked examples). Load before authoring a script for a workflow the user already opted into; it does not itself authorize running one.`,
    menuDescription: "Load the reference for writing Workflow tool scripts",
    userInvocable: true,
    isEnabled: () => isWorkflowsAvailable(),
    async getPromptForCommand() {
      return renderWorkflowAuthoringSkillBody();
    },
  });
}
export { renderWorkflowAuthoringSkillBody, registerWorkflowAuthoringSkill };
