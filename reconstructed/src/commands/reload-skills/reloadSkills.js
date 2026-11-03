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
function formatSkillChangeCounts(m, e) {
  let a = [...(m > 0 ? [`${m} added`] : []), ...(e > 0 ? [`${e} removed`] : [])];
  return a.length > 0 ? a.join(", ") : "none added or removed";
}
//@ chunk-9dc848ph.js:11997-12428 placement
/**
 * /reload-skills 的 local call(args, context, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var runReloadSkillsCommand = async (args, context) => {
  let projectRoot = getProjectRoot();
  let l = filterMcpPromptCommands(context.getMcp().commands);
  let r = (skillToolCommands) => dropSyncedNameClashes(skillToolCommands, l);
  let s = r(await getSkillToolCommands(projectRoot, context.storageV5));
  let i = new Set(s.map((o) => o.name));
  refreshSkillsSyncVeto();
  clearCommandsCache();
  let t = r(await getSkillToolCommands(projectRoot, context.storageV5));
  let d = new Set(t.map((o) => o.name));
  skillsChangedSignal.emit();
  let c = formatSkillChangeCounts(
    count(t, (o) => !i.has(o.name)),
    count(s, (o) => !d.has(o.name)),
  );
  let p = isSafeMode() ? "; custom skills are disabled in safe mode" : "";
  return {
    type: "text",
    value: `Reloaded skills: ${t.length} ${plural(t.length, "skill")} available (${c}${p}).`,
  };
};
