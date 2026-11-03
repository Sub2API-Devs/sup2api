/**
 * services/artifacts/frameFlags.ts
 *
 * 2.1.316 新增：frame/artifact 相关功能开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (16), chunk-99h01h55.js (3)
 * attribution: placement 19
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS,
  ARTIFACT_PAGE_INLINE_RESULT_CAP,
} from "../../tools/ArtifactTool/constants.js";
import { env } from "../../utils/env.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-06y4szbn.js:41496-41552 placement
/**
 * 导出常量或表 `FRAME_CONSTANTS`：值为 null, MAX_ARTIFACT_BYTES = 16777216, tl = "/api/frame/contract/latest"。
 */
var FRAME_CONSTANTS = null;
var MAX_ARTIFACT_BYTES = 16777216;
var LATEST_CONTRACT_PATH_FRAME = "/api/frame/contract/latest";
//@ chunk-06y4szbn.js:41552-41606 placement
function isFrameBaseVersionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_fern", true);
}
//@ chunk-06y4szbn.js:41606-41661 placement
function isFrameStaleGuardAutoReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_moss", true);
}
//@ chunk-06y4szbn.js:41661-41673 placement
var DEFAULT_FRAME_TIMEOUT_MS = 2000;
//@ chunk-06y4szbn.js:41673-41698 placement
function handoverProbeWallClockMs() {
  return DEFAULT_FRAME_TIMEOUT_MS;
}
//@ chunk-06y4szbn.js:41698-41838 placement
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
//@ chunk-06y4szbn.js:41838-41930 placement
function isFrameMultiFileEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_MULTI_FILE ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_bracken", false)
  );
}
//@ chunk-06y4szbn.js:41930-41989 placement
function isFrameCopyFromEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_samphire", false);
}
//@ chunk-06y4szbn.js:41989-42037 placement
function isFrameFilePreconditionsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_widget", true);
}
//@ chunk-06y4szbn.js:42037-42093 placement
function isFrameSameChannelRawReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_tansy", false);
}
//@ chunk-06y4szbn.js:42093-42150 placement
function isFrameSameOrgInlineReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_mallow", false);
}
//@ chunk-06y4szbn.js:42150-42200 placement
function isFrameLiveSubscribeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_lantern", false);
}
//@ chunk-06y4szbn.js:42200-42256 placement
function isFrameLiveTokenLeaseEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_lantern_ember", false);
}
//@ chunk-06y4szbn.js:42256-42338 placement
function isFrameHotUpdateEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_HOT ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_hinge_wren", false)
  );
}
//@ chunk-06y4szbn.js:42338-42387 placement
function isHotUpdateFrozenOn() {
  return getLiveState().frozenHotUpdate ?? isFrameHotUpdateEnabled();
}
//@ chunk-06y4szbn.js:42387-42449 placement
function isFrameDeclaredThumbnailEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_campion", false) === true;
}
//@ chunk-99h01h55.js:1400-1518 placement
/**
 * 无法访问 Artifacts 时的提示：无盘会话说明无法连接，否则提示运行 /login。
 */
function describeArtifactAuthFailure(detail) {
  return isDiskless()
    ? `This session could not reach Artifacts: ${detail}`
    : `Not authenticated \u2014 run /login (${detail})`;
}
//@ chunk-99h01h55.js:1518-1573 placement
function isFramePublicReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sedge", false);
}
//@ chunk-99h01h55.js:1573-1732 placement
var PUBLIC_READ_UNASKED_REASON = "public_unasked";
var PUBLIC_READ_UNASKED_WORDS =
  "this is a public artifact from outside your organization, and no person has approved reading it here \u2014 nothing was fetched";
export {
  isFramePublicReadEnabled,
  isFrameDeclaredThumbnailEnabled,
  isHotUpdateFrozenOn,
  MAX_ARTIFACT_BYTES,
  isFrameBaseVersionEnabled,
  isFrameMultiFileEnabled,
  isFrameCopyFromEnabled,
  LATEST_CONTRACT_PATH_FRAME,
  describeArtifactAuthFailure,
  FRAME_CONSTANTS,
  handoverProbeWallClockMs,
  artifactPageInlineResultCap,
  isFrameStaleGuardAutoReadEnabled,
  isFrameHotUpdateEnabled,
  PUBLIC_READ_UNASKED_REASON,
  PUBLIC_READ_UNASKED_WORDS,
  isFrameLiveTokenLeaseEnabled,
  isFrameLiveSubscribeEnabled,
  isFrameFilePreconditionsEnabled,
  isFrameSameChannelRawReadEnabled,
  isFrameSameOrgInlineReadEnabled,
};
