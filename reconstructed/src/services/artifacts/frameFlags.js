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
var FRAME_CONSTANTS = null,
  MAX_ARTIFACT_BYTES = 16777216,
  tl = "/api/frame/contract/latest";
//@ chunk-06y4szbn.js:41552-41606 placement
function isFrameBaseVersionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_fern", !0);
}
//@ chunk-06y4szbn.js:41606-41661 placement
function isFrameStaleGuardAutoReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_moss", !0);
}
//@ chunk-06y4szbn.js:41661-41673 placement
var nl = 2000;
//@ chunk-06y4szbn.js:41673-41698 placement
function handoverProbeWallClockMs() {
  return nl;
}
//@ chunk-06y4szbn.js:41698-41838 placement
function artifactPageInlineResultCap() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sill", null);
  return typeof e === "number" && Number.isFinite(e) && e >= 0
    ? Math.min(Math.floor(e), ARTIFACT_DB_READ_MAX_RESULT_SIZE_CHARS)
    : ARTIFACT_PAGE_INLINE_RESULT_CAP;
}
//@ chunk-06y4szbn.js:41838-41930 placement
function isFrameMultiFileEnabled() {
  return (
    env.CLAUDE_CODE_ARTIFACT_MULTI_FILE ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_bracken", !1)
  );
}
//@ chunk-06y4szbn.js:41930-41989 placement
function isFrameCopyFromEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_samphire", !1);
}
//@ chunk-06y4szbn.js:41989-42037 placement
function isFrameFilePreconditionsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_widget", !0);
}
//@ chunk-06y4szbn.js:42037-42093 placement
function isFrameSameChannelRawReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_tansy", !1);
}
//@ chunk-06y4szbn.js:42093-42150 placement
function isFrameSameOrgInlineReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_mallow", !1);
}
//@ chunk-06y4szbn.js:42150-42200 placement
function isFrameLiveSubscribeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_lantern", !1);
}
//@ chunk-06y4szbn.js:42200-42256 placement
function isFrameLiveTokenLeaseEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_slate_lantern_ember", !1);
}
//@ chunk-06y4szbn.js:42256-42338 placement
function isFrameHotUpdateEnabled() {
  return env.CLAUDE_CODE_ARTIFACT_HOT ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_hinge_wren", !1);
}
//@ chunk-06y4szbn.js:42338-42387 placement
function isHotUpdateFrozenOn() {
  return getLiveState().frozenHotUpdate ?? isFrameHotUpdateEnabled();
}
//@ chunk-06y4szbn.js:42387-42449 placement
function isFrameDeclaredThumbnailEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_campion", !1) === !0;
}
/**
 * 无法访问 Artifacts 时的提示：无盘会话说明无法连接，否则提示运行 /login。
 */
//@ chunk-99h01h55.js:1400-1518 placement
function describeArtifactAuthFailure(e) {
  return isDiskless()
    ? `This session could not reach Artifacts: ${e}`
    : `Not authenticated \u2014 run /login (${e})`;
}
//@ chunk-99h01h55.js:1518-1573 placement
function isFramePublicReadEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_plinth_sedge", !1);
}
//@ chunk-99h01h55.js:1573-1732 placement
var PUBLIC_READ_UNASKED_REASON = "public_unasked",
  PUBLIC_READ_UNASKED_WORDS =
    "this is a public artifact from outside your organization, and no person has approved reading it here \u2014 nothing was fetched";

export {
  isFramePublicReadEnabled,
  isFrameDeclaredThumbnailEnabled,
  isHotUpdateFrozenOn,
  MAX_ARTIFACT_BYTES,
  isFrameBaseVersionEnabled,
  isFrameMultiFileEnabled,
  isFrameCopyFromEnabled,
  tl,
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
