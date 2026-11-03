/**
 * tools/AppifactReplTool/isEnabled.ts
 *
 * 2.1.316 新增。AppifactRepl 工具开关（tengu_buzzing_lightning）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-djnrvf1b.js (3)
 * attribution: placement 3
 */
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isRemoteCowork } from "../../utils/entrypointKinds.js";

//@ chunk-djnrvf1b.js:298-330 placement
var TENGU_BUZZING_LIGHTNING = "tengu_buzzing_lightning";
//@ chunk-djnrvf1b.js:330-432 placement
function isArtifactReplPathEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  let o = undefined;
  sessionFeatureValues.artifactReplPathEnabled ??= getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_BUZZING_LIGHTNING,
    false,
  );
  return sessionFeatureValues.artifactReplPathEnabled;
}
//@ chunk-djnrvf1b.js:432-464 placement
/**
 * AppifactRepl 工具开关（tengu_buzzing_lightning）。
 */
function isAppifactReplToolEnabled() {
  return isRemoteCowork() && isArtifactReplPathEnabled();
}
export { isAppifactReplToolEnabled };
