/**
 * utils/skillFileWrites.ts
 *
 * 2.1.316 新增：技能文件写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { basename } from "path";
import {
  SAVE_SKILL_PROMPTS,
  saveSkillPromptProposal,
  skillSaveMode as skillSaveMode_2,
  skillSavePromptFor,
} from "../skills/saveSkillPrompt.js";
import { PROPOSE_SKILLS } from "../tools/ProposeSkillsTool/ProposeSkillsTool.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";

//@ chunk-e6aww6q8.js:1367951-1368778 placement
/**
 * 账号技能同步目录的写入提示文本表（保存/提议/发文件/无工具/未保存）。
 */
var describeSyncedSkillWrite =
  " Note: this file is inside the folder that holds synced copies of the user's account skills. A change or new file here is not saved to their account, so do not report it as saved, and the next sync from their account can overwrite or remove it.";
var SYNCED_SKILL_SAVE_HINTS = {
  save_tool: ` To save a skill change for the user, use the \`${SAVE_SKILL_PROMPTS}\` tool.`,
  propose_tool: ` To let the user save this change, call \`${PROPOSE_SKILLS}\` with the complete SKILL.md.`,
  send_file: ` To pass this change to the user, send them the complete SKILL.md with the \`${SEND_USER_FILE_TOOL_NAME}\` tool. ${saveSkillPromptProposal}`,
  no_save_tool:
    " This session has no tool that saves a skill to the user's account: tell the user that this change is not saved, and point them to their claude.ai settings, where skills are managed.",
  report_unsaved: " Say in your reply that this change is not saved to the user's account.",
};
//@ chunk-e6aww6q8.js:1368778-1369008 placement
function skillSaveMode(e, n, r) {
  if (!r) return;
  if (
    e.remoteCall !== undefined ||
    e.agentId !== undefined ||
    !n.some((h) => basename(h).toLowerCase() === "skill.md")
  )
    return "report_unsaved";
  let s = skillSaveMode_2(e.tools);
  return s === "send_file" && skillSavePromptFor(e.tools) === null ? "no_save_tool" : s;
}
//@ chunk-e6aww6q8.js:1369008-1369078 placement
function syncedSkillSaveHint(syncedSkillNext) {
  return syncedSkillNext !== undefined && Object.hasOwn(SYNCED_SKILL_SAVE_HINTS, syncedSkillNext)
    ? describeSyncedSkillWrite + SYNCED_SKILL_SAVE_HINTS[syncedSkillNext]
    : "";
}
export { syncedSkillSaveHint, skillSaveMode };
