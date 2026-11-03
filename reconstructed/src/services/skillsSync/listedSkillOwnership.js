/**
 * services/skillsSync/listedSkillOwnership.ts
 *
 * 2.1.316 新增：列出技能的归属。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g6806zjs.js (2)
 * attribution: placement 2
 */
import { basename, sep } from "path";
import { remoteToolsState } from "../../remote/tools/callResults.js";
import { stripInvisibleChars, syncedItemPath } from "../../utils/plugins/syncedItems.js";
import { getSkillOwnership } from "../../skills/hostSkillMounts.js";

//@ chunk-g6806zjs.js:344-667 placement
/**
 * 记录技能列表中各技能（按清洗后的目录名）的归属、原名与是否从聊天保存，并把列表状态标为已获取。
 */
function recordListedSkillOwnerships(s) {
  let e = remoteToolsState();
  let { listedOwnerships } = e;
  listedOwnerships.clear();
  e.listedSkillsAnswer = "none_yet";
  for (let t of s) {
    let l;
    try {
      l = stripInvisibleChars(basename(syncedItemPath(t.name, sep)));
    } catch {
      continue;
    }
    if (!listedOwnerships.has(l))
      listedOwnerships.set(l, {
        listedName: t.name,
        ownership: getSkillOwnership(t),
        savedFromAChat: typeof t.backing_plugin_id === "string",
      });
  }
  e.listedSkillsAnswer = "a_list";
  e.lastRoundCouldNotAsk = false;
}
//@ chunk-g6806zjs.js:667-723 placement
/**
 * 取列表里某技能的归属。
 */
function listedSkillOwnershipOf(s) {
  return remoteToolsState().listedOwnerships.get(stripInvisibleChars(s));
}
export { listedSkillOwnershipOf, recordListedSkillOwnerships };
