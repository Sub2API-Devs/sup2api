/**
 * skills/saveSkillPrompt.ts
 *
 * save_skill 提示词（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (3)
 * attribution: placement 3
 */
import { PROPOSE_SKILLS } from "../tools/ProposeSkillsTool/ProposeSkillsTool.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";
import { COWORK_PLUGIN } from "./bundled/bundledSkillNames.js";
import { isCoworkEntrypoint, isCoworkAny } from "../utils/entrypointKinds.js";
import { env } from "../utils/env.js";
import { toolMatchesName } from "../Tool.js";

//@ chunk-s61vbvea.js:422561-425552 placement
/**
 * 「保存技能」提示（用 ProposeSkills 工具给用户审核卡）。
 */
var SAVE_SKILL_PROMPTS = "save_skill";
var SAVE_SKILLS_INSTRUCTIONS = `# Saving skills

To create a skill for the user, or update one they ask to change, use the \`${SAVE_SKILL_PROMPTS}\` tool. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them does not change the user's saved skill.`;
var saveSkillPromptLegacy = `# Saving skills

To create a skill for the user, or change one they ask to change, call the \`${PROPOSE_SKILLS}\` tool: it shows them a review card where they can save it. When the user wants a skill added or updated, the proposal is the deliverable \u2014 draft the content any way that helps, then propose it; don't send them a SKILL.md or a packaged skill file to save themselves. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them, or writing a new skill file, does not change the user's skills. When the user saves a proposal it replaces that skill's whole SKILL.md. To change an existing skill, read its current SKILL.md first and propose the complete updated file.`;
var saveSkillPromptProposal =
  "Whether they can then save it as a skill (from the file card, or by uploading it themselves where their app allows) depends on their organization's settings, which you cannot see. So say in the text of your reply, not only in a caption (some apps don't show captions), that they can download it from the file card, or save it as a skill there if their organization allows that; never tell them outright to save it, and describe using the skill only conditionally ('if you add it as a skill, \u2026'), never as a given ('once it's saved \u2026', 'once added \u2026').";
var saveSkillPromptOnlyProposal = `# Saving skills

To create a skill for the user, or change one of their existing skills, write the complete skill as a single \`SKILL.md\` (or a packaged \`.skill\` zip archive) and send it to them with the \`${SEND_USER_FILE_TOOL_NAME}\` tool. ${saveSkillPromptProposal} You get no signal whether they saved it: report the skill as delivered, never as saved. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them, or writing a skill file without sending it, does not change the user's skills. A SKILL.md or .skill file named like one of the user's existing skills replaces that skill entirely if they save it, so start from the skill's current SKILL.md and deliver the complete updated file, never only the changes.`;
var saveSkillPromptNoTool = `# Saving skills

Skills can't be created or changed from here. Skill files on disk \u2014 including synced copies of the user's account skills \u2014 are a read-only cache: editing them, or writing a new skill file, does not change the user's skills. If asked to create or change a skill, say plainly that you can't do that here and point the user to their claude.ai settings.`;
var saveSkillPromptCowork = {
  save_tool: SAVE_SKILLS_INSTRUCTIONS,
  propose_tool: saveSkillPromptLegacy,
  send_file: saveSkillPromptOnlyProposal,
  no_save_tool: saveSkillPromptNoTool,
};
var SAVE_SKILL_PROMPT_TAIL = ` Skills that are part of an installed plugin are the exception: if this session includes the \`${COWORK_PLUGIN}\` skill, customize those through it \u2014 it edits the plugin and repackages it.`;
//@ chunk-s61vbvea.js:425552-425649 placement
/**
 * 按可用工具与会话类型选择保存技能的提示（不可用为 null）。
 */
function skillSavePromptFor(tools) {
  if (!isCoworkEntrypoint() && !isCoworkAny() && !env.CLAUDE_CODE_SKILL_PROPOSALS) return null;
  return saveSkillPromptCowork[skillSaveMode(tools)] + SAVE_SKILL_PROMPT_TAIL;
}
//@ chunk-s61vbvea.js:425649-425794 placement
/**
 * 按可用工具判断技能保存方式：保存工具、提议工具、发送文件或无。
 */
function skillSaveMode(e) {
  return e.some((n) => toolMatchesName(n, SAVE_SKILL_PROMPTS))
    ? "save_tool"
    : e.some((n) => toolMatchesName(n, PROPOSE_SKILLS))
      ? "propose_tool"
      : e.some((n) => toolMatchesName(n, SEND_USER_FILE_TOOL_NAME))
        ? "send_file"
        : "no_save_tool";
}
export { SAVE_SKILL_PROMPTS, saveSkillPromptProposal, skillSaveMode, skillSavePromptFor };
