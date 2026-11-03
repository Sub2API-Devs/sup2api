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
  freeze as freeze_3,
  freeze_2 as freeze_2_2,
  freeze_3 as freeze_3_2,
  freeze_7,
  freeze_8,
  freeze_4,
  freeze_5,
  freeze_6,
  freeze_9,
  freeze_10,
  freeze_11,
  freeze_12,
  freeze_13,
  FROZEN_EMPTY_OBJECTS,
} from "./frozenSentinels.js";
import { getDefaultWebBrowserState } from "./webBrowserSlice.js";

//@ chunk-b5yaajx0.js:317-1474 placement
var freeze = Object.freeze({}),
  freeze_2 = Object.freeze({}),
  Sqn = {
    bagelActive: void 0,
    bagelUrl: void 0,
    bagelPanelVisible: void 0,
    computerUseMcpState: void 0,
    denialTracking: void 0,
    activeGoal: void 0,
    remoteAutocompactState: void 0,
    queuedGoalOrigin: void 0,
    frameOpenFailedPath: null,
    frameOpenFailedSeen: !1,
    artifactWatchApproved: !1,
    artifactDbWriteApproved: !1,
    artifactDbWriteHumanApproved: !1,
    artifactDbReadConsentSlugs: freeze_3,
    artifactDbReadHumanConsentSlugs: freeze_2_2,
    artifactReadConsentSlugs: freeze_3_2,
    artifactConsentEpoch: 0,
    artifactAssetUploadConsentSlugs: freeze_7,
    artifactAssetUploadHumanConsentSlugs: freeze_8,
    artifactAssetReadConsentSlugs: freeze_4,
    artifactAssetReadHumanConsentSlugs: freeze_5,
    artifactOutsideOrgConsentSlugs: freeze_6,
    artifactHandlersReadConsentSlugs: freeze_9,
    artifactHandlersReadHumanConsentSlugs: freeze_10,
    artifactHandlersWriteConsentSlugs: freeze_11,
    artifactHandlersWriteHumanConsentSlugs: freeze_12,
    artifactRoomJoinConsentSlugs: freeze_13,
    artifactPlanPublishConsentPaths: FROZEN_EMPTY_OBJECTS,
    prResolvedThisSession: !1,
    ultrareviewOverageConfirmed: !1,
    artifactReadVersions: freeze,
    artifactReadObservers: freeze_2,
  },
  n = {
    artifactReadConsentSlugs: freeze_3_2,
    artifactAssetReadConsentSlugs: freeze_4,
    artifactAssetReadHumanConsentSlugs: freeze_5,
    artifactOutsideOrgConsentSlugs: freeze_6,
  },
  keys = Object.keys(n);
//@ chunk-b5yaajx0.js:1474-1537 placement
function wqn(e) {
  return keys.every((t) => e[t] === n[t]) ? e : { ...e, ...n };
}
//@ chunk-b5yaajx0.js:1537-1560 placement
var keys_2 = Object.keys(Sqn);
/**
 * 清除会话的 artifact 读取状态与网页浏览器视图状态（已是初始状态时原样返回）。
 */
//@ chunk-b5yaajx0.js:1560-1967 placement
function resetArtifactReadState(e) {
  let webBrowser = e.webBrowser,
    s =
      webBrowser.view === void 0 &&
      webBrowser.logs.length === 0 &&
      webBrowser.unreadErrors === 0 &&
      webBrowser.unreadWarnings === 0,
    S =
      Object.keys(e.artifactReadVersions ?? {}).length === 0 &&
      Object.keys(e.artifactReadObservers ?? {}).length === 0;
  if (
    s &&
    S &&
    keys_2.every((a) => a === "artifactReadVersions" || a === "artifactReadObservers" || e[a] === Sqn[a])
  )
    return e;
  return {
    ...e,
    ...Sqn,
    webBrowser: s
      ? webBrowser
      : { ...getDefaultWebBrowserState(), cleanupRegistered: webBrowser.cleanupRegistered },
  };
}
/**
 * 若存在 WebView 视图，关闭 Bun 的全部 WebView，返回是否关闭。
 */
//@ chunk-b5yaajx0.js:1967-2081 placement
function closeWebViews(e) {
  if (e().webBrowser.view && typeof Bun < "u" && "WebView" in Bun) return (Bun.WebView.closeAll(), !0);
  return !1;
}

export { closeWebViews, resetArtifactReadState, wqn, Sqn };
