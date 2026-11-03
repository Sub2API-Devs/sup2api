/**
 * state/artifactReadState.ts
 *
 * 2.1.316 新增：artifact 读取状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b5yaajx0.js (5)
 * attribution: placement 5
 */
import {
  Tqn,
  Aqn,
  Qln,
  Cqn,
  Rqn,
  Zln,
  edn,
  tdn,
  xqn,
  Pqn,
  Iqn,
  Oqn,
  y_t,
  FROZEN_EMPTY_OBJECTS,
} from "./frozenSentinels.js";
import { getDefaultWebBrowserState } from "./webBrowserSlice.js";

//@ chunk-b5yaajx0.js:317-1474 placement
/**
 * Artifact 读取状态的初始切片与构造器。
 */
var r = Object.freeze({});
var i = Object.freeze({});
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
  artifactDbReadConsentSlugs: Tqn,
  artifactDbReadHumanConsentSlugs: Aqn,
  artifactReadConsentSlugs: Qln,
  artifactConsentEpoch: 0,
  artifactAssetUploadConsentSlugs: Cqn,
  artifactAssetUploadHumanConsentSlugs: Rqn,
  artifactAssetReadConsentSlugs: Zln,
  artifactAssetReadHumanConsentSlugs: edn,
  artifactOutsideOrgConsentSlugs: tdn,
  artifactHandlersReadConsentSlugs: xqn,
  artifactHandlersReadHumanConsentSlugs: Pqn,
  artifactHandlersWriteConsentSlugs: Iqn,
  artifactHandlersWriteHumanConsentSlugs: Oqn,
  artifactRoomJoinConsentSlugs: y_t,
  artifactPlanPublishConsentPaths: FROZEN_EMPTY_OBJECTS,
  prResolvedThisSession: false,
  ultrareviewOverageConfirmed: false,
  artifactReadVersions: r,
  artifactReadObservers: i,
};
var sliceInitialState = {
  artifactReadConsentSlugs: Qln,
  artifactAssetReadConsentSlugs: Zln,
  artifactAssetReadHumanConsentSlugs: edn,
  artifactOutsideOrgConsentSlugs: tdn,
};
var keys = Object.keys(sliceInitialState);
//@ chunk-b5yaajx0.js:1474-1537 placement
/**
 * 已是初始状态则原样返回，否则合回初始值。
 */
function resetSliceIfUnchanged(e) {
  return keys.every((t) => e[t] === sliceInitialState[t])
    ? e
    : {
        ...e,
        ...sliceInitialState,
      };
}
//@ chunk-b5yaajx0.js:1537-1560 placement
var keys_2 = Object.keys(INITIAL_SLICE_STATE);
//@ chunk-b5yaajx0.js:1560-1967 placement
/**
 * 清除会话的 artifact 读取状态与网页浏览器视图状态（已是初始状态时原样返回）。
 */
function resetArtifactReadState(prev) {
  let webBrowser = prev.webBrowser;
  let s =
    webBrowser.view === undefined &&
    webBrowser.logs.length === 0 &&
    webBrowser.unreadErrors === 0 &&
    webBrowser.unreadWarnings === 0;
  let S =
    Object.keys(prev.artifactReadVersions ?? {}).length === 0 &&
    Object.keys(prev.artifactReadObservers ?? {}).length === 0;
  if (
    s &&
    S &&
    keys_2.every(
      (a) =>
        a === "artifactReadVersions" || a === "artifactReadObservers" || prev[a] === INITIAL_SLICE_STATE[a],
    )
  )
    return prev;
  return {
    ...prev,
    ...INITIAL_SLICE_STATE,
    webBrowser: s
      ? webBrowser
      : {
          ...getDefaultWebBrowserState(),
          cleanupRegistered: webBrowser.cleanupRegistered,
        },
  };
}
//@ chunk-b5yaajx0.js:1967-2081 placement
/**
 * 若存在 WebView 视图，关闭 Bun 的全部 WebView，返回是否关闭。
 */
function closeWebViews(e) {
  if (e().webBrowser.view && typeof Bun !== "undefined" && "WebView" in Bun) {
    Bun.WebView.closeAll();
    return true;
  }
  return false;
}
export { closeWebViews, resetArtifactReadState, resetSliceIfUnchanged, INITIAL_SLICE_STATE };
