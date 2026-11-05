/**
 * tools/ArtifactTool/permissions/ownershipConsent.ts
 *
 * 2.1.316 新增：Artifact 所有权同意与打开 frame
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nfkwcnxd.js (15)
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
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
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

//@ chunk-nfkwcnxd.js:3376-3481 placement
function consentDecisionReason(personOnly, reason) {
  return personOnly
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
//@ chunk-nfkwcnxd.js:3481-3644 placement
function artifactCardTitleFor(target, context) {
  let title = artifactCardTitle(
    getShareEntry(target.slug)?.title ||
      nonOpenedFrameUrls(context.getAppState().frameUrls).find(
        ([, entry]) => entry.title && uuidSlugFromUrl(entry.url) === target.slug,
      )?.[1].title,
  );
  return {
    url: artifactViewerUrlFor(target),
    ...(title && {
      title,
    }),
  };
}
//@ chunk-nfkwcnxd.js:3644-4525 placement
/**
 * 在界面中打开（或记录待打开）已发布 artifact 的 frame 行，更新 AppState 中的 frameUrls。
 */
function openArtifactFrame(toolUseContext, target, title, { mcpPublished: options = false } = {}) {
  let openedKey = `${OPENED}${target.slug}`;
  let existingKey = openedKey;
  let alreadyShown = false;
  let lastOpenFailed = false;
  let nextFrameUrls;
  toolUseContext.setAppState((state) => {
    let [foundKey, foundEntry] =
      Object.entries(state.frameUrls).find(([, value]) => uuidSlugFromUrl(value.url) === target.slug) ?? [];
    alreadyShown = foundKey !== undefined && foundEntry?.dismissed !== true;
    existingKey = foundKey !== undefined && foundKey !== openedKey ? foundKey : openedKey;
    lastOpenFailed = state.frameOpenFailedPath === existingKey;
    if (options && foundKey !== undefined && foundKey !== openedKey && foundEntry !== undefined) {
      let { [foundKey]: removed, ...rest } = state.frameUrls;
      let { dismissed, ...entryRest } = foundEntry;
      nextFrameUrls = {
        ...rest,
        [foundKey]: {
          ...entryRest,
          updatedAt: Date.now(),
        },
      };
      return {
        ...state,
        frameUrls: nextFrameUrls,
      };
    }
    if (foundKey !== undefined && foundEntry?.dismissed === true) {
      let { dismissed, ...rest } = foundEntry;
      return {
        ...state,
        frameUrls: {
          ...state.frameUrls,
          [foundKey]: rest,
        },
      };
    }
    if (alreadyShown && state.frameUrls[openedKey] === undefined) return state;
    let { [openedKey]: removed, ...rest } = state.frameUrls;
    nextFrameUrls = {
      ...rest,
      [openedKey]: {
        url: artifactViewerUrlFor(target),
        updatedAt: Date.now(),
        ...((title ?? removed?.title) !== undefined && {
          title: title ?? removed?.title,
        }),
        ...((options || removed?.mcpPublished === true) && {
          mcpPublished: true,
        }),
        ...((options || removed?.mcpPublishedHere === true) && {
          mcpPublishedHere: true,
        }),
      },
    };
    return {
      ...state,
      frameUrls: nextFrameUrls,
    };
  });
  if (options && nextFrameUrls !== undefined) persistBridgeArtifactFrames(nextFrameUrls);
  return {
    rowKey: existingKey,
    alreadyShown,
    lastOpenFailed,
  };
}
//@ chunk-nfkwcnxd.js:4525-4589 placement
function updateFrameState(toolUseContext, slug) {
  forgetDeletedArtifact(slug, {
    updateAppState: toolUseContext.setAppState,
    context: toolUseContext,
  });
}
//@ chunk-nfkwcnxd.js:4589-4799 placement
function markFrameOpenOutcome(toolUseContext, rowKey, succeeded) {
  toolUseContext.setAppState((state) => {
    if (succeeded)
      return state.frameOpenFailedPath === rowKey
        ? {
            ...state,
            frameOpenFailedPath: null,
          }
        : state;
    if (state.frameOpenFailedPath === rowKey) return state;
    return {
      ...state,
      frameOpenFailedPath: rowKey,
      frameOpenFailedSeen: false,
    };
  });
}
//@ chunk-nfkwcnxd.js:4799-4996 placement
function ownershipSuffix(shareEntry, context) {
  return ownedByUser(shareEntry) && filesCowritten(shareEntry) && !ownTypeInstance(shareEntry)
    ? " (yours; a co-writer has also published to it)"
    : context === "files" && ownedByUser(shareEntry) && filesFromType(shareEntry)
      ? " (yours; its files come from an Artifact type its publisher wrote)"
      : ownershipTag(shareEntry);
}
//@ chunk-nfkwcnxd.js:4996-5164 placement
function ownershipClassifierTag(shareEntry, surface) {
  return ownedByUser(shareEntry) && filesCowritten(shareEntry) && !ownTypeInstance(shareEntry)
    ? " [ownership: yours, co-written: a non-owner has also published to it]"
    : surface === "files" && ownedByUser(shareEntry) && filesFromType(shareEntry)
      ? OWN_TYPE_INSTANCE_CLASSIFIER_MARK
      : `${ownershipClassifierMark(shareEntry)}${otherOrgClassifierMark(shareEntry)}`;
}
//@ chunk-nfkwcnxd.js:5164-5236 placement
/**
 * 生成单个同意条目的唯一键。
 */
function consentEntryKey(entry) {
  return jsonStringify([entry.path, entry.from.slug, entry.from.path, entry.from.ver ?? ""]);
}
//@ chunk-nfkwcnxd.js:5236-5288 placement
function consentSlugsKey(entries) {
  return normalizeCaseForComparison_2(entries.map(consentEntryKey)).sort().join(`
`);
}
//@ chunk-nfkwcnxd.js:5288-5329 placement
function isSameConsentSlugs(storedSlugsKey, entries) {
  return (storedSlugsKey ?? "") === consentSlugsKey(entries);
}
//@ chunk-nfkwcnxd.js:5329-5534 placement
function needsHumanAssetConsent(toolUseContext, slug) {
  let { mode, modeBeforeRewrite } = getToolPermissionContext(toolUseContext);
  if (mode === "auto" || modeBeforeRewrite === "auto") return false;
  return hasSharedReadConsentClasses(
    toolUseContext.getAppState(),
    mode === "plan" ? "artifactAssetUploadHumanConsentSlugs" : "artifactAssetUploadConsentSlugs",
    slug,
  );
}
//@ chunk-nfkwcnxd.js:5534-6288 placement
/**
 * 对共同写入或来自类型的 artifact，在上传/复制资源前要求人工确认（artifactAssetUploadConsentSlugs）。
 */
function cowrittenConsentAsk(input, context, target, cowrittenByOther, checkCowritten, kind, forced = false) {
  let isCowritten = checkCowritten && !ownTypeInstance(getShareEntry(target.slug));
  if (
    readKeepsFlagOffAsk(context) &&
    (isCowritten || forced) &&
    cowrittenByOther &&
    !consentAskReachedUser(input, context) &&
    !artifactFilesConsentHeld(context, target, ownedByUser(getShareEntry(target.slug))) &&
    (consentAskCanReachUser(context) || planConsentMustDeny(context) || coworkConsentMustDeny(context))
  ) {
    logFeatureBad("artifact_cowritten_consent", "refused_unasked", {
      assets: kind === "assets",
      ...(!isCowritten && {
        from_type: true,
      }),
    });
    throw new ArtifactInputError(
      isCowritten
        ? `a co-writer has published to this artifact, so its ${kind} are someone else's content \u2014 nothing was returned; retry the same action so it is checked again (the user is asked once where a prompt can reach them)`
        : `this artifact was created from an Artifact type, so its ${kind} are the type publisher's content \u2014 nothing was returned; retry the same action so it is checked again (the user is asked once where a prompt can reach them)`,
      `${kind === "files" ? "file" : "asset"}_${isCowritten ? "cowritten" : "from_type"}_unasked`,
    );
  }
}
//@ chunk-nfkwcnxd.js:6288-6474 placement
function outsideOrgConsentRefusal(ruling, kind, retryUrl) {
  logFeatureBad("artifact_outside_org_consent", "refused_unasked", {
    assets: kind === "asset_copy",
  });
  return new ArtifactInputError(
    outsideOrgUnaskedWords(
      ruling,
      true,
      kind === "file_copy"
        ? {
            retryUrl,
          }
        : undefined,
    ),
    `${kind}_outside_org_unasked`,
  );
}
//@ chunk-nfkwcnxd.js:6474-6512 placement
function clearPublicReadUnasked(reason, ruling, kind) {
  if (reason === PUBLIC_READ_UNASKED_REASON) refuseOutsideOrgUnasked(ruling, kind);
}
//@ chunk-nfkwcnxd.js:6512-6674 placement
function refuseOutsideOrgUnasked(ruling, kind) {
  logFeatureBad("artifact_outside_org_consent", "refused_unasked", {
    assets: kind !== "files",
  });
  throw new ArtifactInputError(
    outsideOrgUnaskedWords(ruling),
    `${kind === "files" ? "file" : "asset"}_outside_org_unasked`,
  );
}
export {
  artifactCardTitleFor,
  ownershipSuffix,
  ownershipClassifierTag,
  consentDecisionReason,
  needsHumanAssetConsent,
  consentSlugsKey,
  cowrittenConsentAsk,
  clearPublicReadUnasked,
  markFrameOpenOutcome,
  isSameConsentSlugs,
  outsideOrgConsentRefusal,
  openArtifactFrame,
  updateFrameState,
};
