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
import { nonOpenedFrameUrls, OPENED } from "../artifactResumeCarry.js";
import { uuidSlugFromUrl, ArtifactInputError } from "../constants.js";
import { persistBridgeArtifactFrames } from "../../../utils/sessionTagRefresh.js";
import { forgetDeletedArtifact } from "../actions/delete.js";
import { filesCowritten, ownTypeInstance, filesFromType, consentAskReachedUser } from "./consentStamps.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { uniq } from "../../../utils/collections.js";
import {
  getToolPermissionContext,
  consentAskCanReachUser,
  planConsentMustDeny,
} from "../../../utils/permissions/toolPermissionContext.js";
import { hasSharedReadConsentClasses } from "../../../services/artifacts/consentClasses.js";
import { readKeepsFlagOffAsk, outsideOrgUnaskedWords } from "../artifactAccessClasses.js";
import { artifactFilesConsentHeld, coworkConsentMustDeny } from "./readConsent.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { PUBLIC_READ_UNASKED_REASON } from "../../../services/artifacts/frameFlags.js";

//@ chunk-qxvqcab6.js:3404-3509 placement
function consentDecisionReason(e, reason) {
  return e
    ? {
        type: "safetyCheck",
        reason,
        classifierApprovable: false,
      }
    : {
        type: "other",
        reason,
      };
}
//@ chunk-qxvqcab6.js:3509-3672 placement
function artifactCardTitleFor(e, n) {
  let r = artifactCardTitle(
    getShareEntry(e.slug)?.title ||
      nonOpenedFrameUrls(n.getAppState().frameUrls).find(
        ([, o]) => o.title && uuidSlugFromUrl(o.url) === e.slug,
      )?.[1].title,
  );
  return {
    url: artifactViewerUrlFor(e),
    ...(r && {
      title: r,
    }),
  };
}
//@ chunk-qxvqcab6.js:3672-4553 placement
/**
 * 在界面中打开（或记录待打开）已发布 artifact 的 frame 行，更新 AppState 中的 frameUrls。
 */
function openArtifactFrame(e, n, title, { mcpPublished: o = false } = {}) {
  let s = `${OPENED}${n.slug}`;
  let u = s;
  let a = false;
  let lastOpenFailed = false;
  let d;
  e.setAppState((f) => {
    let [p, g] = Object.entries(f.frameUrls).find(([, value]) => uuidSlugFromUrl(value.url) === n.slug) ?? [];
    a = p !== undefined && g?.dismissed !== true;
    u = p !== undefined && p !== s ? p : s;
    lastOpenFailed = f.frameOpenFailedPath === u;
    if (o && p !== undefined && p !== s && g !== undefined) {
      let { [p]: h, ...A } = f.frameUrls;
      let { dismissed, ...x } = g;
      d = {
        ...A,
        [p]: {
          ...x,
          updatedAt: Date.now(),
        },
      };
      return {
        ...f,
        frameUrls: d,
      };
    }
    if (p !== undefined && g?.dismissed === true) {
      let { dismissed, ...A } = g;
      return {
        ...f,
        frameUrls: {
          ...f.frameUrls,
          [p]: A,
        },
      };
    }
    if (a && f.frameUrls[s] === undefined) return f;
    let { [s]: c, ...w } = f.frameUrls;
    d = {
      ...w,
      [s]: {
        url: artifactViewerUrlFor(n),
        updatedAt: Date.now(),
        ...((title ?? c?.title) !== undefined && {
          title: title ?? c?.title,
        }),
        ...((o || c?.mcpPublished === true) && {
          mcpPublished: true,
        }),
        ...((o || c?.mcpPublishedHere === true) && {
          mcpPublishedHere: true,
        }),
      },
    };
    return {
      ...f,
      frameUrls: d,
    };
  });
  if (o && d !== undefined) persistBridgeArtifactFrames(d);
  return {
    rowKey: u,
    alreadyShown: a,
    lastOpenFailed,
  };
}
//@ chunk-qxvqcab6.js:4553-4617 placement
function updateFrameState(e, n) {
  forgetDeletedArtifact(n, {
    updateAppState: e.setAppState,
    context: e,
  });
}
//@ chunk-qxvqcab6.js:4617-4827 placement
function markFrameOpenOutcome(e, n, r) {
  e.setAppState((o) => {
    if (r)
      return o.frameOpenFailedPath === n
        ? {
            ...o,
            frameOpenFailedPath: null,
          }
        : o;
    if (o.frameOpenFailedPath === n) return o;
    return {
      ...o,
      frameOpenFailedPath: n,
      frameOpenFailedSeen: false,
    };
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
/**
 * 生成单个同意条目的唯一键。
 */
function consentEntryKey(e) {
  return jsonStringify([e.path, e.from.slug, e.from.path, e.from.ver ?? ""]);
}
//@ chunk-qxvqcab6.js:5262-5314 placement
function consentSlugsKey(e) {
  return uniq(e.map(consentEntryKey)).sort().join(`
`);
}
//@ chunk-qxvqcab6.js:5314-5355 placement
function isSameConsentSlugs(copies, copied) {
  return (copies ?? "") === consentSlugsKey(copied);
}
//@ chunk-qxvqcab6.js:5355-5560 placement
function needsHumanAssetConsent(e, slug) {
  let { mode, modeBeforeRewrite } = getToolPermissionContext(e);
  if (mode === "auto" || modeBeforeRewrite === "auto") return false;
  return hasSharedReadConsentClasses(
    e.getAppState(),
    mode === "plan" ? "artifactAssetUploadHumanConsentSlugs" : "artifactAssetUploadConsentSlugs",
    slug,
  );
}
//@ chunk-qxvqcab6.js:5560-6313 placement
/**
 * 对共同写入或来自类型的 artifact，在上传/复制资源前要求人工确认（artifactAssetUploadConsentSlugs）。
 */
function cowrittenConsentAsk(e, n, r, o, s, u, a = false) {
  let l = s && !ownTypeInstance(getShareEntry(r.slug));
  if (
    readKeepsFlagOffAsk(n) &&
    (l || a) &&
    o &&
    !consentAskReachedUser(e, n) &&
    !artifactFilesConsentHeld(n, r, ownedByUser(getShareEntry(r.slug))) &&
    (consentAskCanReachUser(n) || planConsentMustDeny(n) || coworkConsentMustDeny(n))
  ) {
    logFeatureBad("artifact_cowritten_consent", "refused_unasked", {
      assets: u === "assets",
      ...(!l && {
        from_type: true,
      }),
    });
    throw new ArtifactInputError(
      l
        ? `a co-writer has published to this artifact, so its ${u} are someone else's content \u2014 nothing was returned; retry the same action so it is checked again (the user is asked once where a prompt can reach them)`
        : `this artifact was created from an Artifact type, so its ${u} are the type publisher's content \u2014 nothing was returned; retry the same action so it is checked again (the user is asked once where a prompt can reach them)`,
      `${u === "files" ? "file" : "asset"}_${l ? "cowritten" : "from_type"}_unasked`,
    );
  }
}
//@ chunk-qxvqcab6.js:6313-6499 placement
function outsideOrgConsentRefusal(e, n, retryUrl) {
  logFeatureBad("artifact_outside_org_consent", "refused_unasked", {
    assets: n === "asset_copy",
  });
  return new ArtifactInputError(
    outsideOrgUnaskedWords(
      e,
      true,
      n === "file_copy"
        ? {
            retryUrl,
          }
        : undefined,
    ),
    `${n}_outside_org_unasked`,
  );
}
//@ chunk-qxvqcab6.js:6499-6537 placement
function clearPublicReadUnasked(reason, n, r) {
  if (reason === PUBLIC_READ_UNASKED_REASON) refuseOutsideOrgUnasked(n, r);
}
//@ chunk-qxvqcab6.js:6537-6699 placement
function refuseOutsideOrgUnasked(e, n) {
  logFeatureBad("artifact_outside_org_consent", "refused_unasked", {
    assets: n !== "files",
  });
  throw new ArtifactInputError(
    outsideOrgUnaskedWords(e),
    `${n === "files" ? "file" : "asset"}_outside_org_unasked`,
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
