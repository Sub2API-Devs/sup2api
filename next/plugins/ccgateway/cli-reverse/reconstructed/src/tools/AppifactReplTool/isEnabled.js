/**
 * tools/AppifactReplTool/isEnabled.ts
 *
 * 2.1.316 新增。AppifactRepl 工具开关（tengu_buzzing_lightning）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kjyvw9va.js (3)
 * attribution: placement 3
 */
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isRemoteCowork } from "../../utils/entrypointKinds.js";

//@ chunk-kjyvw9va.js:298-330 placement
var TENGU_BUZZING_LIGHTNING = "tengu_buzzing_lightning";
//@ chunk-kjyvw9va.js:330-432 placement
function isArtifactReplPathEnabled() {
  let sessionFeatureValues = getSessionFeatureValues();
  let unused = undefined;
  sessionFeatureValues.artifactReplPathEnabled ??= getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_BUZZING_LIGHTNING,
    false,
  );
  return sessionFeatureValues.artifactReplPathEnabled;
}
//@ chunk-kjyvw9va.js:432-464 placement
/**
 * AppifactRepl 工具开关（tengu_buzzing_lightning）。
 */
function isAppifactReplToolEnabled() {
  return isRemoteCowork() && isArtifactReplPathEnabled();
}
export { isAppifactReplToolEnabled };
