/**
 * commands/reload-skills/reloadSkills.ts
 *
 * 2.1.316 新增：/reload-skills：重新加载技能
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9dc848ph.js (2)
 * attribution: placement 2
 */
import { getProjectRoot } from "../../bootstrap/state.js";
import { filterMcpPromptCommands, dropSyncedNameClashes } from "../../utils/commandPredicates.js";
import { getSkillToolCommands, clearCommandsCache } from "../../commands.js";
import { refreshSkillsSyncVeto } from "../../utils/claudeAiSync/skillsSync.js";
import { skillsChangedSignal } from "../../utils/plugins/pluginsChangedSignal.js";
import { count } from "../../utils/collections.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-9dc848ph.js:11866-11997 placement
function formatSkillChangeCounts(addedCount, removedCount) {
  let parts = [
    ...(addedCount > 0 ? [`${addedCount} added`] : []),
    ...(removedCount > 0 ? [`${removedCount} removed`] : []),
  ];
  return parts.length > 0 ? parts.join(", ") : "none added or removed";
}
//@ chunk-9dc848ph.js:11997-12428 placement
/**
 * /reload-skills 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runReloadSkillsCommand = async (args, context) => {
  let projectRoot = getProjectRoot();
  let mcpPromptCommands = filterMcpPromptCommands(context.getMcp().commands);
  let dropClashes = (skillToolCommands) => dropSyncedNameClashes(skillToolCommands, mcpPromptCommands);
  let beforeSkills = dropClashes(await getSkillToolCommands(projectRoot, context.storageV5));
  let beforeNames = new Set(beforeSkills.map((skill) => skill.name));
  refreshSkillsSyncVeto();
  clearCommandsCache();
  let afterSkills = dropClashes(await getSkillToolCommands(projectRoot, context.storageV5));
  let afterNames = new Set(afterSkills.map((skill) => skill.name));
  skillsChangedSignal.emit();
  let countsText = formatSkillChangeCounts(
    count(afterSkills, (skill) => !beforeNames.has(skill.name)),
    count(beforeSkills, (skill) => !afterNames.has(skill.name)),
  );
  let safeModeNote = isSafeMode() ? "; custom skills are disabled in safe mode" : "";
  return {
    type: "text",
    value: `Reloaded skills: ${afterSkills.length} ${plural(afterSkills.length, "skill")} available (${countsText}${safeModeNote}).`,
  };
};
export { runReloadSkillsCommand };
