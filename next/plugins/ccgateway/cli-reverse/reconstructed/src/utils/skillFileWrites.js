/**
 * utils/skillFileWrites.ts
 *
 * 2.1.316 新增：技能文件写入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1367457-1368284 placement
/**
 * 账号技能同步目录的写入提示文本表（保存/提议/发文件/无工具/未保存）。
 */
var describeSyncedSkillWrite; // deferred: uses SAVE_SKILL_PROMPTS (../skills/saveSkillPrompt.js) of its import cycle while loading; runs once the cycle is complete
var SYNCED_SKILL_SAVE_HINTS;
deferInit("chunk-5xgkngpb.js:1367457", () => {
  describeSyncedSkillWrite =
    " Note: this file is inside the folder that holds synced copies of the user's account skills. A change or new file here is not saved to their account, so do not report it as saved, and the next sync from their account can overwrite or remove it.";
  SYNCED_SKILL_SAVE_HINTS = {
    save_tool: ` To save a skill change for the user, use the \`${SAVE_SKILL_PROMPTS}\` tool.`,
    propose_tool: ` To let the user save this change, call \`${PROPOSE_SKILLS}\` with the complete SKILL.md.`,
    send_file: ` To pass this change to the user, send them the complete SKILL.md with the \`${SEND_USER_FILE_TOOL_NAME}\` tool. ${saveSkillPromptProposal}`,
    no_save_tool:
      " This session has no tool that saves a skill to the user's account: tell the user that this change is not saved, and point them to their claude.ai settings, where skills are managed.",
    report_unsaved: " Say in your reply that this change is not saved to the user's account.",
  };
});
//@ chunk-5xgkngpb.js:1368284-1368514 placement
function skillSaveMode(writeContext, filePaths, hasSkillFile) {
  if (!hasSkillFile) return;
  if (
    writeContext.remoteCall !== undefined ||
    writeContext.agentId !== undefined ||
    !filePaths.some((filePath) => basename(filePath).toLowerCase() === "skill.md")
  )
    return "report_unsaved";
  let mode = skillSaveMode_2(writeContext.tools);
  return mode === "send_file" && skillSavePromptFor(writeContext.tools) === null ? "no_save_tool" : mode;
}
//@ chunk-5xgkngpb.js:1368514-1368584 placement
function syncedSkillSaveHint(syncedSkillNext) {
  return syncedSkillNext !== undefined && Object.hasOwn(SYNCED_SKILL_SAVE_HINTS, syncedSkillNext)
    ? describeSyncedSkillWrite + SYNCED_SKILL_SAVE_HINTS[syncedSkillNext]
    : "";
}
export { syncedSkillSaveHint, skillSaveMode };
