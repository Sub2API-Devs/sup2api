/**
 * tools/BriefTool/pewterOwl.ts
 *
 * 2.1.316 新增。pewter_owl 工具开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gt4x42hj.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { getCachedClientData } from "../../utils/config.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getMainLoopModel } from "../../utils/model/model.js";

//@ chunk-gt4x42hj.js:306-424 placement
function getPewterOwlModel(t) {
  let e = t?.pewter_owl_model;
  if (typeof e === "string" && e !== "") return e;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_pewter_owl_model", "");
}
/**
 * pewter_owl 开关（环境变量、模型、GrowthBook）
 */
//@ chunk-gt4x42hj.js:424-623 placement
function isPewterOwlEnabled(t) {
  if (env.CLAUDE_CODE_PEWTER_OWL !== void 0) return env.CLAUDE_CODE_PEWTER_OWL;
  if (getIsNonInteractiveSession()) return !1;
  let e = getCachedClientData(),
    r = getPewterOwlModel(e);
  if (r !== "" && !getCanonicalName(getMainLoopModel()).includes(r)) return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE(`tengu_${t}`, !1) || e?.[t] === !0;
}
/**
 * pewter_owl 工具开关。
 */
//@ chunk-gt4x42hj.js:623-745 placement
function isPewterOwlTool() {
  if (env.CLAUDE_CODE_PEWTER_OWL_TOOL !== void 0) return env.CLAUDE_CODE_PEWTER_OWL_TOOL;
  return isPewterOwlEnabled("pewter_owl_tool");
}
//@ chunk-gt4x42hj.js:745-789 placement
function isPewterOwlBrief() {
  return isPewterOwlEnabled("pewter_owl_brief");
}

export { isPewterOwlTool, isPewterOwlBrief };
