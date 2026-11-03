/**
 * services/artifacts/comments/commentsGate.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b0a246e7.js (2)
 * attribution: placement 2
 */
import { env } from "../../../utils/env.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../analytics/growthbook.js";

/**
 * Artifact 评论功能开关：CLAUDE_CODE_ARTIFACT_COMMENTS 或 tengu_teal_corbel。
 */
//@ chunk-b0a246e7.js:3385-3466 placement
function isArtifactCommentsEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_COMMENTS ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel", !1);
}
/**
 * Artifact 评论开关的来源（env 或 GrowthBook）。
 */
//@ chunk-b0a246e7.js:3466-3569 placement
function getArtifactCommentsFlagSource() {
  return env.CLAUDE_CODE_ARTIFACT_COMMENTS !== void 0
    ? "env"
    : getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_teal_corbel", !1).source;
}

export { isArtifactCommentsEnabled, getArtifactCommentsFlagSource };
