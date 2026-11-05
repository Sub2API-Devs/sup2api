/**
 * services/artifacts/frameFlags.ts
 *
 * 2.1.316 新增：frame/artifact 相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (16), chunk-chhd9p2w.js (3)
 * attribution: placement 19
 */
import { isDiskless } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS,
  ARTIFACT_PAGE_INLINE_RESULT_CAP,
} from "../../tools/ArtifactTool/constants.js";
import { env } from "../../utils/env.js";
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-chhd9p2w.js:1433-1551 placement
/**
 * 无法访问 Artifacts 时的提示：无盘会话说明无法连接，否则提示运行 /login。
 */
function describeArtifactAuthFailure(detail) {
  return isDiskless()
    ? `This session could not reach Artifacts: ${detail}`
    : `Not authenticated \u2014 run /login (${detail})`;
}
//@ chunk-chhd9p2w.js:1551-1606 placement
function isFramePublicReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sedge", false);
}
//@ chunk-chhd9p2w.js:1606-1765 placement
var PUBLIC_READ_UNASKED_REASON = "public_unasked";
var PUBLIC_READ_UNASKED_WORDS =
  "this is a public artifact from outside your organization, and no person has approved reading it here \u2014 nothing was fetched";
//@ chunk-51jy8ztq.js:43745-43801 placement
/**
 * 导出常量或表 `FRAME_CONSTANTS`：值为 null, MAX_ARTIFACT_BYTES = 16777216, tl = "/api/frame/contract/latest"。
 */
var FRAME_CONSTANTS = null;
var MAX_ARTIFACT_BYTES = 16777216;
var LATEST_CONTRACT_PATH_FRAME = "/api/frame/contract/latest";
//@ chunk-51jy8ztq.js:43801-43855 placement
function isFrameBaseVersionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_fern", true);
}
//@ chunk-51jy8ztq.js:43855-43910 placement
function isFrameStaleGuardAutoReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_moss", true);
}
//@ chunk-51jy8ztq.js:43910-43922 placement
var DEFAULT_FRAME_TIMEOUT_MS = 2000;
//@ chunk-51jy8ztq.js:43922-43947 placement
function handoverProbeWallClockMs() {
  return DEFAULT_FRAME_TIMEOUT_MS;
}
//@ chunk-51jy8ztq.js:43947-44087 placement
function artifactPageInlineResultCap() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_cobalt_plinth_sill",
    null,
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE >= 0
    ? Math.min(Math.floor(featureValue_CACHED_MAY_BE_STALE), ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS)
    : ARTIFACT_PAGE_INLINE_RESULT_CAP;
}
//@ chunk-51jy8ztq.js:44087-44179 placement
function isFrameMultiFileEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_MULTI_FILE ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_bracken", false)
  );
}
//@ chunk-51jy8ztq.js:44179-44238 placement
function isFrameCopyFromEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_samphire", false);
}
//@ chunk-51jy8ztq.js:44238-44286 placement
function isFrameFilePreconditionsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_widget", true);
}
//@ chunk-51jy8ztq.js:44286-44342 placement
function isFrameSameChannelRawReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_tansy", false);
}
//@ chunk-51jy8ztq.js:44342-44399 placement
function isFrameSameOrgInlineReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_mallow", false);
}
//@ chunk-51jy8ztq.js:44399-44449 placement
function isFrameLiveSubscribeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_lantern", false);
}
//@ chunk-51jy8ztq.js:44449-44505 placement
function isFrameLiveTokenLeaseEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_lantern_ember", false);
}
//@ chunk-51jy8ztq.js:44505-44587 placement
function isFrameHotUpdateEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_HOT ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_hinge_wren", false)
  );
}
//@ chunk-51jy8ztq.js:44587-44636 placement
function isHotUpdateFrozenOn() {
  return getLiveState().frozenHotUpdate ?? isFrameHotUpdateEnabled();
}
//@ chunk-51jy8ztq.js:44636-44699 placement
function isFrameDeclaredThumbnailEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_campion", false) === true;
}
export {
  isFramePublicReadEnabled,
  isFrameMultiFileEnabled,
  isFrameHotUpdateEnabled,
  isFrameCopyFromEnabled,
  MAX_ARTIFACT_BYTES,
  isFrameBaseVersionEnabled,
  artifactPageInlineResultCap,
  isFrameStaleGuardAutoReadEnabled,
  isFrameDeclaredThumbnailEnabled,
  isFrameFilePreconditionsEnabled,
  describeArtifactAuthFailure,
  isHotUpdateFrozenOn,
  LATEST_CONTRACT_PATH_FRAME,
  FRAME_CONSTANTS,
  handoverProbeWallClockMs,
  PUBLIC_READ_UNASKED_REASON,
  PUBLIC_READ_UNASKED_WORDS,
  isFrameLiveTokenLeaseEnabled,
  isFrameLiveSubscribeEnabled,
  isFrameSameChannelRawReadEnabled,
  isFrameSameOrgInlineReadEnabled,
};
