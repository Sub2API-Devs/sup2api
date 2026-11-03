/**
 * tools/ArtifactTool/permissions/ownershipConsent.ts
 *
 * 2.1.316 新增：Artifact 所有权同意与打开 frame
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qxvqcab6.js (15)
 * attribution: placement 15
 */
import {
  artifactCardTitle,
  artifactViewerUrlFor,
  OWN_TYPE_INSTANCE_CLASSIFIER_MARK,
} from "../artifactUrls.js";
import {
  getShareEntry,
  ownedByUser,
  ownershipTag,
  ownershipClassifierMark,
  otherOrgClassifierMark,
} from "../../../services/artifacts/shareEntries.js";
import { Zz, OPENED } from "../artifactResumeCarry.js";
import { uuidSlugFromUrl, ArtifactInputError } from "../constants.js";
import { aW } from "../../../utils/sessionTagRefresh.js";
import { forgetDeletedArtifact } from "../actions/delete.js";
import { filesCowritten, ownTypeInstance, filesFromType, consentAskReachedUser } from "./consentStamps.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { uniq } from "../../../utils/collections.js";
import {
  getToolPermissionContext,
  consentAskCanReachUser,
  planConsentMustDeny,
} from "../../../utils/permissions/toolPermissionContext.js";
import { Hte } from "../../../services/artifacts/consentClasses.js";
import { readKeepsFlagOffAsk, outsideOrgUnaskedWords } from "../artifactAccessClasses.js";
import { artifactFilesConsentHeld, coworkConsentMustDeny } from "./readConsent.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { PUBLIC_READ_UNASKED_REASON } from "../../../services/artifacts/frameFlags.js";

//@ chunk-qxvqcab6.js:3404-3509 placement
function consentDecisionReason(e, n) {
  return e ? { type: "safetyCheck", reason: n, classifierApprovable: !1 } : { type: "other", reason: n };
}
//@ chunk-qxvqcab6.js:3509-3672 placement
function artifactCardTitleFor(e, n) {
  let r = artifactCardTitle(
    getShareEntry(e.slug)?.title ||
      Zz(n.getAppState().frameUrls).find(([, o]) => o.title && uuidSlugFromUrl(o.url) === e.slug)?.[1].title,
  );
  return { url: artifactViewerUrlFor(e), ...(r && { title: r }) };
}
/**
 * 在界面中打开（或记录待打开）已发布 artifact 的 frame 行，更新 AppState 中的 frameUrls。
 */
//@ chunk-qxvqcab6.js:3672-4553 placement
function openArtifactFrame(e, n, r, { mcpPublished: o = !1 } = {}) {
  let s = `${OPENED}${n.slug}`,
    u = s,
    a = !1,
    l = !1,
    d;
  if (
    (e.setAppState((f) => {
      let [p, g] = Object.entries(f.frameUrls).find(([, h]) => uuidSlugFromUrl(h.url) === n.slug) ?? [];
      if (
        ((a = p !== void 0 && g?.dismissed !== !0),
        (u = p !== void 0 && p !== s ? p : s),
        (l = f.frameOpenFailedPath === u),
        o && p !== void 0 && p !== s && g !== void 0)
      ) {
        let { [p]: h, ...A } = f.frameUrls,
          { dismissed: dismissed, ...x } = g;
        return ((d = { ...A, [p]: { ...x, updatedAt: Date.now() } }), { ...f, frameUrls: d });
      }
      if (p !== void 0 && g?.dismissed === !0) {
        let { dismissed: dismissed, ...A } = g;
        return { ...f, frameUrls: { ...f.frameUrls, [p]: A } };
      }
      if (a && f.frameUrls[s] === void 0) return f;
      let { [s]: c, ...w } = f.frameUrls;
      return (
        (d = {
          ...w,
          [s]: {
            url: artifactViewerUrlFor(n),
            updatedAt: Date.now(),
            ...((r ?? c?.title) !== void 0 && { title: r ?? c?.title }),
            ...((o || c?.mcpPublished === !0) && { mcpPublished: !0 }),
            ...((o || c?.mcpPublishedHere === !0) && { mcpPublishedHere: !0 }),
          },
        }),
        { ...f, frameUrls: d }
      );
    }),
    o && d !== void 0)
  )
    aW(d);
  return { rowKey: u, alreadyShown: a, lastOpenFailed: l };
}
//@ chunk-qxvqcab6.js:4553-4617 placement
function updateFrameState(e, n) {
  forgetDeletedArtifact(n, { updateAppState: e.setAppState, context: e });
}
//@ chunk-qxvqcab6.js:4617-4827 placement
function markFrameOpenOutcome(e, n, r) {
  e.setAppState((o) => {
    if (r) return o.frameOpenFailedPath === n ? { ...o, frameOpenFailedPath: null } : o;
    if (o.frameOpenFailedPath === n) return o;
    return { ...o, frameOpenFailedPath: n, frameOpenFailedSeen: !1 };
  });
}
//@ chunk-qxvqcab6.js:4827-5023 placement
function ownershipSuffix(e, n) {
  return ownedByUser(e) && filesCowritten(e) && !ownTypeInstance(e)
    ? " (yours; a co-writer has also published to it)"
    : n === "files" && ownedByUser(e) && filesFromType(e)
      ? " (yours; its files come from an Artifact type its publisher wrote)"
      : ownershipTag(e);
}
//@ chunk-qxvqcab6.js:5023-5190 placement
function ownershipClassifierTag(e, n) {
  return ownedByUser(e) && filesCowritten(e) && !ownTypeInstance(e)
    ? " [ownership: yours, co-written: a non-owner has also published to it]"
    : n === "files" && ownedByUser(e) && filesFromType(e)
      ? OWN_TYPE_INSTANCE_CLASSIFIER_MARK
      : `${ownershipClassifierMark(e)}${otherOrgClassifierMark(e)}`;
}
//@ chunk-qxvqcab6.js:5190-5262 placement
function F(e) {
  return jsonStringify([e.path, e.from.slug, e.from.path, e.from.ver ?? ""]);
}
//@ chunk-qxvqcab6.js:5262-5314 placement
function consentSlugsKey(e) {
  return uniq(e.map(F)).sort().join(`
`);
}
//@ chunk-qxvqcab6.js:5314-5355 placement
function isSameConsentSlugs(e, n) {
  return (e ?? "") === consentSlugsKey(n);
}
//@ chunk-qxvqcab6.js:5355-5560 placement
function needsHumanAssetConsent(e, n) {
  let { mode: mode, modeBeforeRewrite: modeBeforeRewrite } = getToolPermissionContext(e);
  if (mode === "auto" || modeBeforeRewrite === "auto") return !1;
  return Hte(
    e.getAppState(),
    mode === "plan" ? "artifactAssetUploadHumanConsentSlugs" : "artifactAssetUploadConsentSlugs",
    n,
  );
}
/**
 * 对共同写入或来自类型的 artifact，在上传/复制资源前要求人工确认（artifactAssetUploadConsentSlugs）。
 */
//@ chunk-qxvqcab6.js:5560-6313 placement
function cowrittenConsentAsk(e, n, r, o, s, u, a = !1) {
  let l = s && !ownTypeInstance(getShareEntry(r.slug));
  if (
    readKeepsFlagOffAsk(n) &&
    (l || a) &&
    o &&
    !consentAskReachedUser(e, n) &&
    !artifactFilesConsentHeld(n, r, ownedByUser(getShareEntry(r.slug))) &&
    (consentAskCanReachUser(n) || planConsentMustDeny(n) || coworkConsentMustDeny(n))
  )
    throw (
      logFeatureBad("artifact_cowritten_consent", "refused_unasked", {
        assets: u === "assets",
        ...(!l && { from_type: !0 }),
      }),
      new ArtifactInputError(
        l
          ? `a co-writer has published to this artifact, so its ${u} are someone else's content \u2014 nothing was returned; retry the same action so it is checked again (the user is asked once where a prompt can reach them)`
          : `this artifact was created from an Artifact type, so its ${u} are the type publisher's content \u2014 nothing was returned; retry the same action so it is checked again (the user is asked once where a prompt can reach them)`,
        `${u === "files" ? "file" : "asset"}_${l ? "cowritten" : "from_type"}_unasked`,
      )
    );
}
//@ chunk-qxvqcab6.js:6313-6499 placement
function outsideOrgConsentRefusal(e, n, r) {
  return (
    logFeatureBad("artifact_outside_org_consent", "refused_unasked", { assets: n === "asset_copy" }),
    new ArtifactInputError(
      outsideOrgUnaskedWords(e, !0, n === "file_copy" ? { retryUrl: r } : void 0),
      `${n}_outside_org_unasked`,
    )
  );
}
//@ chunk-qxvqcab6.js:6499-6537 placement
function clearPublicReadUnasked(e, n, r) {
  if (e === PUBLIC_READ_UNASKED_REASON) refuseOutsideOrgUnasked(n, r);
}
//@ chunk-qxvqcab6.js:6537-6699 placement
function refuseOutsideOrgUnasked(e, n) {
  throw (
    logFeatureBad("artifact_outside_org_consent", "refused_unasked", { assets: n !== "files" }),
    new ArtifactInputError(
      outsideOrgUnaskedWords(e),
      `${n === "files" ? "file" : "asset"}_outside_org_unasked`,
    )
  );
}

export {
  artifactCardTitleFor,
  needsHumanAssetConsent,
  consentDecisionReason,
  outsideOrgConsentRefusal,
  ownershipClassifierTag,
  ownershipSuffix,
  openArtifactFrame,
  markFrameOpenOutcome,
  consentSlugsKey,
  cowrittenConsentAsk,
  clearPublicReadUnasked,
  isSameConsentSlugs,
  updateFrameState,
};
