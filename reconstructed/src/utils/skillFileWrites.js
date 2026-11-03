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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { SAVE_SKILL_PROMPTS, sqo, skillSaveMode as skillSaveMode_2, t4r } from "../skills/saveSkillPrompt.js";
import { PROPOSE_SKILLS } from "../tools/ProposeSkillsTool/ProposeSkillsTool.js";
import { SEND_USER_FILE_TOOL_NAME } from "../tools/SendUserFileTool/prompt.js";

//@ chunk-e6aww6q8.js:1367951-1368778 placement
var describeSyncedSkillWrite =
    " Note: this file is inside the folder that holds synced copies of the user's account skills. A change or new file here is not saved to their account, so do not report it as saved, and the next sync from their account can overwrite or remove it.",
  fXt = {
    save_tool: ` To save a skill change for the user, use the \`${SAVE_SKILL_PROMPTS}\` tool.`,
    propose_tool: ` To let the user save this change, call \`${PROPOSE_SKILLS}\` with the complete SKILL.md.`,
    send_file: ` To pass this change to the user, send them the complete SKILL.md with the \`${SEND_USER_FILE_TOOL_NAME}\` tool. ${sqo}`,
    no_save_tool:
      " This session has no tool that saves a skill to the user's account: tell the user that this change is not saved, and point them to their claude.ai settings, where skills are managed.",
    report_unsaved: " Say in your reply that this change is not saved to the user's account.",
  };
//@ chunk-e6aww6q8.js:1368778-1369008 placement
function skillSaveMode(e, n, r) {
  if (!r) return;
  if (
    e.remoteCall !== void 0 ||
    e.agentId !== void 0 ||
    !n.some((h) => basename_28(h).toLowerCase() === "skill.md")
  )
    return "report_unsaved";
  let s = skillSaveMode_2(e.tools);
  return s === "send_file" && t4r(e.tools) === null ? "no_save_tool" : s;
}
//@ chunk-e6aww6q8.js:1369008-1369078 placement
function hSe(e) {
  return e !== void 0 && Object.hasOwn(fXt, e) ? describeSyncedSkillWrite + fXt[e] : "";
}

export { hSe, skillSaveMode };
