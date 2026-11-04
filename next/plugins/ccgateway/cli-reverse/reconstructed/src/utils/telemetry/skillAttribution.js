/**
 * utils/telemetry/skillAttribution.ts
 *
 * 技能归因（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-csq9ftr9.js (7)
 * attribution: placement 7
 */
import {
  isServerPluginId,
  SERVER_PLUGIN_ID,
  SERVER_PLUGIN_ID_PATTERN,
} from "../plugins/pluginAttribution.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { parseJsonRegistryFile, normalizeRegistryKey } from "../plugins/localMarketplacePaths.js";
import { logForDebugging } from "../debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-csq9ftr9.js:3713-3767 placement
var SKILL_ID_RE = /^skill_(?:staging_|local_)?[A-Za-z0-9]{1,64}$/;
//@ chunk-csq9ftr9.js:3767-3798 placement
function isValidSkillId(skillId) {
  return SKILL_ID_RE.test(skillId);
}
//@ chunk-csq9ftr9.js:3798-3815 placement
var SKILL_ID = "skill_id";
//@ chunk-csq9ftr9.js:3815-3983 placement
/**
 * 合法的 skillId/pluginId 归属。
 */
function buildSkillAttribution(skillId, backingPluginId) {
  let attribution = {};
  if (typeof skillId === "string" && isValidSkillId(skillId)) attribution.skillId = skillId;
  if (typeof backingPluginId === "string" && isServerPluginId(backingPluginId))
    attribution.pluginId = backingPluginId;
  return attribution.skillId === undefined && attribution.pluginId === undefined ? undefined : attribution;
}
//@ chunk-csq9ftr9.js:3983-4116 placement
var SkillAttributionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_ATTRIBUTION_BYTES;
var noop;
deferInit("chunk-csq9ftr9.js:3983", () => {
  SkillAttributionSchema = DoctorLazy(() =>
    objectSchema({
      [SKILL_ID]: stringSchema().regex(SKILL_ID_RE).optional().catch(undefined),
      [SERVER_PLUGIN_ID]: stringSchema().regex(SERVER_PLUGIN_ID_PATTERN).optional().catch(undefined),
    }),
  );
  MAX_ATTRIBUTION_BYTES = 262144;
  noop = () => {
    return;
  };
});
//@ chunk-csq9ftr9.js:4116-4269 placement
function isSkillAttributionEnabled() {
  let CLAUDE_CODE_SKILL_ATTRIBUTION = env.CLAUDE_CODE_SKILL_ATTRIBUTION;
  if (CLAUDE_CODE_SKILL_ATTRIBUTION === undefined) return noop;
  let jsonRegistryFile = parseJsonRegistryFile(
    "CLAUDE_CODE_SKILL_ATTRIBUTION",
    CLAUDE_CODE_SKILL_ATTRIBUTION,
    MAX_ATTRIBUTION_BYTES,
    parseSkillAttribution,
  );
  return (registry) => jsonRegistryFile.get(normalizeRegistryKey(registry));
}
//@ chunk-csq9ftr9.js:4269-4620 placement
/**
 * 校验 CLAUDE_CODE_SKILL_ATTRIBUTION 条目。
 */
function parseSkillAttribution(entry) {
  let result = SkillAttributionSchema().safeParse(entry);
  if (!result.success) {
    logForDebugging("Ignoring a CLAUDE_CODE_SKILL_ATTRIBUTION entry: not a JSON object");
    return;
  }
  let skillAttribution = buildSkillAttribution(result.data[SKILL_ID], result.data[SERVER_PLUGIN_ID]);
  if (typeof entry === "object" && entry !== null) {
    for (let [field, value] of [
      [SKILL_ID, skillAttribution?.skillId],
      [SERVER_PLUGIN_ID, skillAttribution?.pluginId],
    ])
      if (field in entry && value === undefined)
        logForDebugging(`Ignoring a CLAUDE_CODE_SKILL_ATTRIBUTION entry field: invalid ${field}`);
  }
  return skillAttribution;
}
export { isValidSkillId, isSkillAttributionEnabled, buildSkillAttribution };
