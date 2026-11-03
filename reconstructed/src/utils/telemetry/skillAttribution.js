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
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../env.js";
import { parseJsonRegistryFile, normalizeRegistryKey } from "../plugins/localMarketplacePaths.js";
import { logForDebugging } from "../debug.js";

//@ chunk-csq9ftr9.js:3713-3767 placement
var Z = /^skill_(?:staging_|local_)?[A-Za-z0-9]{1,64}$/;
//@ chunk-csq9ftr9.js:3767-3798 placement
function x(e) {
  return Z.test(e);
}
//@ chunk-csq9ftr9.js:3798-3815 placement
var SKILL_ID = "skill_id";
/**
 * 合法的 skillId/pluginId 归属。
 */
//@ chunk-csq9ftr9.js:3815-3983 placement
function buildSkillAttribution(e, n) {
  let r = {};
  if (typeof e === "string" && x(e)) r.skillId = e;
  if (typeof n === "string" && isServerPluginId(n)) r.pluginId = n;
  return r.skillId === void 0 && r.pluginId === void 0 ? void 0 : r;
}
//@ chunk-csq9ftr9.js:3983-4116 placement
var SkillAttributionSchema = DoctorLazy(() =>
    u({
      [SKILL_ID]: o()
        .regex(Z)
        .optional()
        .catch(void 0),
      [SERVER_PLUGIN_ID]: o()
        .regex(SERVER_PLUGIN_ID_PATTERN)
        .optional()
        .catch(void 0),
    }),
  ),
  MAX_ATTRIBUTION_BYTES = 262144,
  noop = () => {
    return;
  };
//@ chunk-csq9ftr9.js:4116-4269 placement
function isSkillAttributionEnabled() {
  let CLAUDE_CODE_SKILL_ATTRIBUTION = env.CLAUDE_CODE_SKILL_ATTRIBUTION;
  if (CLAUDE_CODE_SKILL_ATTRIBUTION === void 0) return noop;
  let n = parseJsonRegistryFile(
    "CLAUDE_CODE_SKILL_ATTRIBUTION",
    CLAUDE_CODE_SKILL_ATTRIBUTION,
    MAX_ATTRIBUTION_BYTES,
    parseSkillAttribution,
  );
  return (r) => n.get(normalizeRegistryKey(r));
}
/**
 * 校验 CLAUDE_CODE_SKILL_ATTRIBUTION 条目。
 */
//@ chunk-csq9ftr9.js:4269-4620 placement
function parseSkillAttribution(e) {
  let safeParse = SkillAttributionSchema().safeParse(e);
  if (!safeParse.success) {
    logForDebugging("Ignoring a CLAUDE_CODE_SKILL_ATTRIBUTION entry: not a JSON object");
    return;
  }
  let r = buildSkillAttribution(safeParse.data[SKILL_ID], safeParse.data[SERVER_PLUGIN_ID]);
  if (typeof e === "object" && e !== null) {
    for (let [s, g] of [
      [SKILL_ID, r?.skillId],
      [SERVER_PLUGIN_ID, r?.pluginId],
    ])
      if (s in e && g === void 0)
        logForDebugging(`Ignoring a CLAUDE_CODE_SKILL_ATTRIBUTION entry field: invalid ${s}`);
  }
  return r;
}

export { x, isSkillAttributionEnabled, buildSkillAttribution };
