/**
 * state/artifactReadState.ts
 *
 * 2.1.316 新增：artifact 读取状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-23w567p3.js (5)
 * attribution: placement 5
 */
import {
  EMPTY_ARTIFACT_DB_READ_CONSENT,
  EMPTY_ARTIFACT_DB_READ_HUMAN_CONSENT,
  EMPTY_ARTIFACT_READ_CONSENT,
  EMPTY_ARTIFACT_ASSET_UPLOAD_CONSENT,
  EMPTY_ARTIFACT_ASSET_UPLOAD_HUMAN_CONSENT,
  EMPTY_ARTIFACT_ASSET_READ_CONSENT,
  EMPTY_ARTIFACT_ASSET_READ_HUMAN_CONSENT,
  EMPTY_ARTIFACT_OUTSIDE_ORG_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_READ_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_READ_HUMAN_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_WRITE_CONSENT,
  EMPTY_ARTIFACT_HANDLERS_WRITE_HUMAN_CONSENT,
  EMPTY_ARTIFACT_ROOM_JOIN_CONSENT,
  FROZEN_EMPTY_OBJECTS,
} from "./frozenSentinels.js";
import { getDefaultWebBrowserState } from "./webBrowserSlice.js";

//@ chunk-23w567p3.js:317-1474 placement
/**
 * Artifact 读取状态的初始切片与构造器。
 */
var EMPTY_ARTIFACT_READ_VERSIONS = Object.freeze({});
var EMPTY_ARTIFACT_READ_OBSERVERS = Object.freeze({});
var INITIAL_SLICE_STATE = {
  bagelActive: undefined,
  bagelUrl: undefined,
  bagelPanelVisible: undefined,
  computerUseMcpState: undefined,
  denialTracking: undefined,
  activeGoal: undefined,
  remoteAutocompactState: undefined,
  queuedGoalOrigin: undefined,
  frameOpenFailedPath: null,
  frameOpenFailedSeen: false,
  artifactWatchApproved: false,
  artifactDbWriteApproved: false,
  artifactDbWriteHumanApproved: false,
  artifactDbReadConsentSlugs: EMPTY_ARTIFACT_DB_READ_CONSENT,
  artifactDbReadHumanConsentSlugs: EMPTY_ARTIFACT_DB_READ_HUMAN_CONSENT,
  artifactReadConsentSlugs: EMPTY_ARTIFACT_READ_CONSENT,
  artifactConsentEpoch: 0,
  artifactAssetUploadConsentSlugs: EMPTY_ARTIFACT_ASSET_UPLOAD_CONSENT,
  artifactAssetUploadHumanConsentSlugs: EMPTY_ARTIFACT_ASSET_UPLOAD_HUMAN_CONSENT,
  artifactAssetReadConsentSlugs: EMPTY_ARTIFACT_ASSET_READ_CONSENT,
  artifactAssetReadHumanConsentSlugs: EMPTY_ARTIFACT_ASSET_READ_HUMAN_CONSENT,
  artifactOutsideOrgConsentSlugs: EMPTY_ARTIFACT_OUTSIDE_ORG_CONSENT,
  artifactHandlersReadConsentSlugs: EMPTY_ARTIFACT_HANDLERS_READ_CONSENT,
  artifactHandlersReadHumanConsentSlugs: EMPTY_ARTIFACT_HANDLERS_READ_HUMAN_CONSENT,
  artifactHandlersWriteConsentSlugs: EMPTY_ARTIFACT_HANDLERS_WRITE_CONSENT,
  artifactHandlersWriteHumanConsentSlugs: EMPTY_ARTIFACT_HANDLERS_WRITE_HUMAN_CONSENT,
  artifactRoomJoinConsentSlugs: EMPTY_ARTIFACT_ROOM_JOIN_CONSENT,
  artifactPlanPublishConsentPaths: FROZEN_EMPTY_OBJECTS,
  prResolvedThisSession: false,
  ultrareviewOverageConfirmed: false,
  artifactReadVersions: EMPTY_ARTIFACT_READ_VERSIONS,
  artifactReadObservers: EMPTY_ARTIFACT_READ_OBSERVERS,
};
var sliceInitialState = {
  artifactReadConsentSlugs: EMPTY_ARTIFACT_READ_CONSENT,
  artifactAssetReadConsentSlugs: EMPTY_ARTIFACT_ASSET_READ_CONSENT,
  artifactAssetReadHumanConsentSlugs: EMPTY_ARTIFACT_ASSET_READ_HUMAN_CONSENT,
  artifactOutsideOrgConsentSlugs: EMPTY_ARTIFACT_OUTSIDE_ORG_CONSENT,
};
var keys = Object.keys(sliceInitialState);
//@ chunk-23w567p3.js:1474-1537 placement
/**
 * 已是初始状态则原样返回，否则合回初始值。
 */
function resetSliceIfUnchanged(state) {
  return keys.every((key) => state[key] === sliceInitialState[key])
    ? state
    : {
        ...state,
        ...sliceInitialState,
      };
}
//@ chunk-23w567p3.js:1537-1560 placement
var keys_2 = Object.keys(INITIAL_SLICE_STATE);
//@ chunk-23w567p3.js:1560-1967 placement
/**
 * 清除会话的 artifact 读取状态与网页浏览器视图状态（已是初始状态时原样返回）。
 */
function resetArtifactReadState(prev) {
  let webBrowser = prev.webBrowser;
  let isWebBrowserEmpty =
    webBrowser.view === undefined &&
    webBrowser.logs.length === 0 &&
    webBrowser.unreadErrors === 0 &&
    webBrowser.unreadWarnings === 0;
  let isArtifactStateEmpty =
    Object.keys(prev.artifactReadVersions ?? {}).length === 0 &&
    Object.keys(prev.artifactReadObservers ?? {}).length === 0;
  if (
    isWebBrowserEmpty &&
    isArtifactStateEmpty &&
    keys_2.every(
      (key) =>
        key === "artifactReadVersions" ||
        key === "artifactReadObservers" ||
        prev[key] === INITIAL_SLICE_STATE[key],
    )
  )
    return prev;
  return {
    ...prev,
    ...INITIAL_SLICE_STATE,
    webBrowser: isWebBrowserEmpty
      ? webBrowser
      : {
          ...getDefaultWebBrowserState(),
          cleanupRegistered: webBrowser.cleanupRegistered,
        },
  };
}
//@ chunk-23w567p3.js:1967-2081 placement
/**
 * 若存在 WebView 视图，关闭 Bun 的全部 WebView，返回是否关闭。
 */
function closeWebViews(getState) {
  if (getState().webBrowser.view && typeof Bun !== "undefined" && "WebView" in Bun) {
    Bun.WebView.closeAll();
    return true;
  }
  return false;
}
export { resetSliceIfUnchanged, INITIAL_SLICE_STATE, closeWebViews, resetArtifactReadState };
