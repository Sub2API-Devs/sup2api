/**
 * skills/hostSkillCatalog.ts
 *
 * 2.1.316 新增：宿主提供的技能目录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { hostSkillCatalog } from "../utils/sessionShape.js";
import { builtinSkillsSchema } from "../plugins/builtinPlugins.js";
import { safeParseJSON } from "../utils/json.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { hostSkillsEntry } from "../utils/commandPredicates.js";

//@ chunk-e6aww6q8.js:956944-957291 placement
/**
 * 读取宿主下发的技能目录 CLAUDE_CODE_HOST_SKILL_CATALOG（1–64 个合法文件夹名），格式不对时记录警告与特性状态并返回 null。
 */
function hostSkillCatalogFolders() {
  let e = hostSkillCatalog();
  if (e === undefined) return null;
  let n = builtinSkillsSchema().safeParse(safeParseJSON(e, false));
  if (!n.success) {
    logForDebugging(
      'Ignoring CLAUDE_CODE_HOST_SKILL_CATALOG: expected {"skills": 1 to 64 folder names of ASCII letters, digits, ".", "_" or "-", other than "." and ".."}',
      {
        level: "warn",
      },
    );
    logFeatureBad("skill_host_catalog", "invalid_value");
    return null;
  }
  return hostSkillsEntry(n.data.skills);
}
export { hostSkillCatalogFolders };
