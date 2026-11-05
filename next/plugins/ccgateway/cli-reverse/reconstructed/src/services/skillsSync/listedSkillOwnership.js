/**
 * services/skillsSync/listedSkillOwnership.ts
 *
 * 2.1.316 新增：列出技能的归属。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n0vbdcfg.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename, sep } from "path";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { stripInvisibleChars, syncedItemPath } from "../../utils/plugins/syncedItems.js";
import { getSkillOwnership } from "../../skills/hostSkillMounts.js";

//@ chunk-n0vbdcfg.js:344-667 placement
/**
 * 记录技能列表中各技能（按清洗后的目录名）的归属、原名与是否从聊天保存，并把列表状态标为已获取。
 */
function recordListedSkillOwnerships(listedSkills) {
  let state = remoteToolsState();
  let { listedOwnerships } = state;
  listedOwnerships.clear();
  state.listedSkillsAnswer = "none_yet";
  for (let skill of listedSkills) {
    let listedName;
    try {
      listedName = stripInvisibleChars(basename(syncedItemPath(skill.name, sep)));
    } catch {
      continue;
    }
    if (!listedOwnerships.has(listedName))
      listedOwnerships.set(listedName, {
        listedName: skill.name,
        ownership: getSkillOwnership(skill),
        savedFromAChat: typeof skill.backing_plugin_id === "string",
      });
  }
  state.listedSkillsAnswer = "a_list";
  state.lastRoundCouldNotAsk = false;
}
//@ chunk-n0vbdcfg.js:667-723 placement
/**
 * 取列表里某技能的归属。
 */
function listedSkillOwnershipOf(listedName) {
  return remoteToolsState().listedOwnerships.get(stripInvisibleChars(listedName));
}
export { listedSkillOwnershipOf, recordListedSkillOwnerships };
