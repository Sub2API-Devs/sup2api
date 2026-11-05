/**
 * skills/hostSkillCatalog.ts
 *
 * 2.1.316 新增：宿主提供的技能目录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { hostSkillCatalog } from "../utils/sessionShape.js";
import { builtinSkillsSchema } from "../plugins/builtinPlugins.js";
import { safeParseJSON } from "../utils/json.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { hostSkillsEntry } from "../utils/commandPredicates.js";

//@ chunk-5xgkngpb.js:968726-969073 placement
/**
 * 读取宿主下发的技能目录 CLAUDE_CODE_HOST_SKILL_CATALOG（1–64 个合法文件夹名），格式不对时记录警告与特性状态并返回 null。
 */
function hostSkillCatalogFolders() {
  let rawCatalog = hostSkillCatalog();
  if (rawCatalog === undefined) return null;
  let parsed = builtinSkillsSchema().safeParse(safeParseJSON(rawCatalog, false));
  if (!parsed.success) {
    logForDebugging(
      'Ignoring CLAUDE_CODE_HOST_SKILL_CATALOG: expected {"skills": 1 to 64 folder names of ASCII letters, digits, ".", "_" or "-", other than "." and ".."}',
      {
        level: "warn",
      },
    );
    logFeatureBad("skill_host_catalog", "invalid_value");
    return null;
  }
  return hostSkillsEntry(parsed.data.skills);
}
export { hostSkillCatalogFolders };
