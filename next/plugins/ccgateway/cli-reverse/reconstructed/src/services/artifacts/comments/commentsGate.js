/**
 * services/artifacts/comments/commentsGate.ts
 *
 * 2.1.316 新增：Artifact 评论功能开关（环境变量 CLAUDE_CODE_ARTIFACT_COMMENTS 或 GrowthBook tengu_teal_corbel）及开关来源。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-78ymyfsy.js (2)
 * attribution: placement 2
 */
import { env } from "../../../utils/env.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../analytics/growthbook.js";

//@ chunk-78ymyfsy.js:3418-3499 placement
/**
 * Artifact 评论功能开关：CLAUDE_CODE_ARTIFACT_COMMENTS 或 tengu_teal_corbel。
 */
function isArtifactCommentsEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_COMMENTS ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_teal_corbel", false);
}
//@ chunk-78ymyfsy.js:3499-3602 placement
/**
 * Artifact 评论开关的来源（env 或 GrowthBook）。
 */
function getArtifactCommentsFlagSource() {
  return env.CLAUDE_CODE_ARTIFACT_COMMENTS !== undefined
    ? "env"
    : getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_teal_corbel", false).source;
}
export { isArtifactCommentsEnabled, getArtifactCommentsFlagSource };
