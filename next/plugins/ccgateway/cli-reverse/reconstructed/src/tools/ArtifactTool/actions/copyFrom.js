/**
 * tools/ArtifactTool/actions/copyFrom.ts
 *
 * 2.1.316 新增：copy_from 动作
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (5)
 * attribution: placement 5
 */
import { readUntrustedArrayOrUndefined } from "../../../utils/untrustedArray.js";
import {
  MAX_COPY_ASSET_IDS,
  copyArtifactAsset,
  ASSET_BLOB_URL_RE,
  CONTENT_TYPE_RE,
  SHA256_HEX_RE,
} from "./uploadAsset.js";
import { ASSET_ID_RE, parseArtifactUrl, ArtifactInputError } from "../constants.js";
import {
  ownedByUser,
  hasOtherCommentPending,
  otherCommentPendingSeq,
  getShareEntry,
  ownershipClassifierMark,
  shareClassifierMarks,
  entryAudience,
  ownershipTag,
  shareAudienceMark,
} from "../../../services/artifacts/shareEntries.js";
import {
  filesCowritten,
  ownTypeInstance,
  ASSET_TARGET_PIN_TAG,
  CONSENT_ASK_TAG,
  PLAN_CONSENT_ASK_TAG,
  USER_ONLY_CONSENT_ASK_TAG,
  carriesForeignPin,
  stampArtifactAssetUploadConsent,
  stampArtifactAssetReadConsent,
} from "../permissions/consentStamps.js";
import {
  outsideOrgRead,
  invitedCopySource,
  othersArtifactReadIsUserOnly,
  otherOrgCopySource,
  othersArtifactReadConsentSurface,
  pickByToolset,
} from "../../../services/artifacts/artifactToolGates.js";
import { artifactReadRule, artifactCallReadRule } from "../permissions/readRules.js";
import {
  getToolPermissionContext,
  planConsentMustDeny,
  consentAskCanReachUser,
} from "../../../utils/permissions/toolPermissionContext.js";
import {
  denyByArtifactRule,
  denyOtherOrgArtifact,
  askRuleCoverageNote,
  readDeniedByRule,
} from "../permissions/artifactPermissionRules.js";
import {
  needsHumanAssetConsent,
  artifactCardTitleFor,
  consentDecisionReason,
  outsideOrgConsentRefusal,
  ownershipClassifierTag,
  ownershipSuffix,
} from "../permissions/ownershipConsent.js";
import {
  copySourceConsented,
  copySourceRulingFor,
  coworkConsentMustDeny,
} from "../permissions/readConsent.js";
import { probeArtifactHostEgress } from "../../../services/artifacts/hostEgressProbe.js";
import { warmShareEntry, reprobeShareEntry } from "../../../services/artifacts/shareEntryWarm.js";
import {
  readKeepsFlagOffAsk,
  classFactsFor,
  writeKeepsFlagOffAsk,
  decideByClasses,
  othersContentFloorDeny,
  crossOrgCopyOk,
} from "../artifactAccessClasses.js";
import {
  classifyArtifactConsent,
  recordNamedOtherOrgs,
  wasOtherOrgNamed,
  forgetNamedOtherOrg,
} from "../../../services/artifacts/consentClasses.js";
import {
  artifactViewerUrlFor,
  classifierArtifactTargetFor,
  canonicalArtifactTargetFor,
} from "../artifactUrls.js";
import { plural } from "../../../utils/stringUtils.js";
import {
  ASSET_UPLOAD_COVERS_SESSION_COPIES_NOTE,
  COPY_FROM_COVERS_SESSION_AND_SOURCE_NOTE,
  COPY_FROM_CARD_LEDE,
  planModeCardNote,
} from "../promptText.js";
import { inputSchema, artifactCopyFromFrozen } from "../../../services/artifacts/artifactToolSchema.js";
import { validateSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { urlSubPathError } from "../permissions/dbWriteInputs.js";
import { isFramePublicReadEnabled } from "../../../services/artifacts/frameFlags.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { capResultRows, peerOrFallback, numberText } from "../../../services/artifacts/artifactPeople.js";
import { jsonStringify } from "../../../utils/slowOperations.js";

//@ chunk-xzmy9dn4.js:82306-82547 placement
function readCopyFromInput(input) {
  let readField = (key) => (input === undefined ? undefined : Reflect.get(input, key));
  let readString = (key) => {
    let value = readField(key);
    return typeof value === "string" ? value : undefined;
  };
  let untrustedArrayOrUndefined = readUntrustedArrayOrUndefined(readField("asset_ids"));
  return {
    url: readString("url"),
    fromUrl: readString("from_url"),
    ids:
      untrustedArrayOrUndefined !== undefined &&
      untrustedArrayOrUndefined.every((id) => typeof id === "string")
        ? untrustedArrayOrUndefined
        : undefined,
  };
}
//@ chunk-xzmy9dn4.js:82547-83058 placement
/**
 * 校验 copy_from 的 asset_ids：必须 1–yue 个、32 位资产 id、不重复；不合法时返回错误文案。
 */
function assetIdsInputError(assetIds) {
  if (assetIds === undefined || assetIds.length === 0)
    return `action "copy_from" requires \`asset_ids\` \u2014 1\u2013${MAX_COPY_ASSET_IDS} asset ids from the source artifact (its list_assets result).`;
  if (assetIds.length > MAX_COPY_ASSET_IDS)
    return `\`asset_ids\` names ${assetIds.length} ids; copy_from takes at most ${MAX_COPY_ASSET_IDS} per call \u2014 split it.`;
  if (!assetIds.every((assetId) => ASSET_ID_RE.test(assetId)))
    return "`asset_ids` must be 32-character asset ids, exactly as list_assets printed them.";
  if (new Set(assetIds).size !== assetIds.length)
    return "`asset_ids` repeats an id \u2014 name each asset once.";
  return;
}
//@ chunk-xzmy9dn4.js:83058-83103 placement
/**
 * 把集合去重排序后用逗号连接。
 */
function sortedJoinedKeys(ids) {
  return [...ids].sort().join(",");
}
//@ chunk-xzmy9dn4.js:83103-83953 placement
/**
 * 为 copy_from 的权限询问补一句归属说明：源/目标 Artifact 是共写的、外组织公开、外组织共享、他人的或无法确认。
 */
function copyOwnershipNote(side, share) {
  if (share === undefined) return "";
  if (ownedByUser(share))
    return side === "source" && filesCowritten(share) && !ownTypeInstance(share)
      ? " A co-writer has also published to the source artifact, so its assets may include files they added."
      : "";
  if (side === "source" && outsideOrgRead(share))
    return " The source is a public artifact from outside your organization. If you approve, Claude copies its assets into this one.";
  if (side === "source" && invitedCopySource(share))
    return " The source artifact belongs to another organization and was shared with you. If you approve, Claude copies its assets into this one.";
  if (share.probeFailed || share.role === undefined || share.role === "unknown")
    return ` Couldn't confirm whether the ${side} artifact is yours.`;
  return side === "source"
    ? " The source artifact belongs to someone else \u2014 approving reads its assets into this copy."
    : " The destination artifact belongs to someone else \u2014 approving writes these assets into their artifact.";
}
//@ chunk-xzmy9dn4.js:83953-94354 placement
/**
 * copy_from 动作模块：cu 为跨组织拒绝文案，Yg 为会话内已批准提示，uu 为动作处理器（checkPermissions / call / toAutoClassifierInput / getToolUseSummary），fu 渲染复制结果。
 */
var COPY_INTO_OTHER_ORG_MESSAGE =
  "the destination artifact belongs to another organization, and assets can only be copied into artifacts in your own organization, so nothing was copied. Copy them into one of your own artifacts instead";
var COPY_ALREADY_APPROVED_NOTE =
  "Asset uploads into this artifact and reads of the source already approved this session";
var ARTIFACT_COPY_FROM_ACTION_HANDLER = {
  actions: ["copy_from"],
  async checkPermissions(tool, input, context) {
    let { url, fromUrl, ids } = readCopyFromInput(input);
    let destUrl = url !== undefined ? parseArtifactUrl(url) : null;
    let sourceUrl = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    if (destUrl === null || sourceUrl === null || destUrl.slug === sourceUrl.slug)
      return {
        behavior: "deny",
        message:
          destUrl === null || sourceUrl === null
            ? "copy_from needs two artifact urls Claude can address \u2014 url (the destination) and from_url (the source), from the list or publish results."
            : "copy_from needs two different artifacts \u2014 from_url names the destination itself.",
        decisionReason: {
          type: "safetyCheck",
          reason:
            "Unparseable or identical artifact urls \u2014 the copy cannot be addressed or probed for ownership",
          classifierApprovable: false,
        },
      };
    let assetIdsProblem = assetIdsInputError(ids);
    if (assetIdsProblem !== undefined)
      return {
        behavior: "deny",
        message: assetIdsProblem,
        decisionReason: {
          type: "other",
          reason: "Asset copy input has missing or malformed asset_ids",
        },
      };
    let sourceRuleFor = (mode) =>
      artifactReadRule(getToolPermissionContext(context), sourceUrl, fromUrl, mode, {
        copySource: true,
        action: "copy_from",
      });
    let sourceDenyRule = sourceRuleFor("deny");
    if (sourceDenyRule !== null) return denyByArtifactRule(sourceDenyRule, "nothing was copied", true);
    let hasOtherComment = () => hasOtherCommentPending(destUrl.slug);
    let pinBuilder = (askedFlags) => ({
      [ASSET_TARGET_PIN_TAG]: {
        action: "copy_from",
        slug: destUrl.slug,
        from: sourceUrl.slug,
        ids: sortedJoinedKeys(ids ?? []),
        dstAsked: askedFlags.dst,
        srcAsked: askedFlags.src,
        ...(askedFlags.dst && {
          otherCommentSeq: otherCommentPendingSeq(destUrl.slug),
        }),
      },
    });
    let basePins = pinBuilder({
      dst: false,
      src: false,
    });
    let baseTags = {
      [CONSENT_ASK_TAG]: false,
      [PLAN_CONSENT_ASK_TAG]: false,
      [USER_ONLY_CONSENT_ASK_TAG]: false,
    };
    let readConsentState = () => {
      let toolPermissionContext = getToolPermissionContext(context);
      let inPlanMode = toolPermissionContext.mode === "plan";
      let coversSession = toolPermissionContext.mode !== "auto";
      let needsConsent = needsHumanAssetConsent(context, destUrl.slug);
      let askedAgain = needsConsent && hasOtherComment();
      let dstConsented = needsConsent && !askedAgain;
      let shareEntry = getShareEntry(sourceUrl.slug);
      let sourceConsented = copySourceConsented(context, sourceUrl, "assets");
      let userOnly = !sourceConsented && !ownedByUser(shareEntry) && othersArtifactReadIsUserOnly(sourceUrl);
      return {
        inPlanMode,
        coversSession,
        askedAgain,
        dstConsented,
        srcEntry: shareEntry,
        srcConsented: sourceConsented,
        userOnly,
      };
    };
    let orgDeny = () =>
      denyOtherOrgArtifact(destUrl, "Nothing was copied") ??
      denyOtherOrgArtifact(sourceUrl, "Nothing was copied") ??
      (otherOrgCopySource(getShareEntry(destUrl.slug))
        ? {
            behavior: "deny",
            message: `${COPY_INTO_OTHER_ORG_MESSAGE}. Tell the user.`,
            decisionReason: {
              type: "other",
              reason: "The destination artifact belongs to another organization",
            },
          }
        : null);
    if (othersArtifactReadConsentSurface())
      await probeArtifactHostEgress(sourceUrl, context.abortController.signal);
    await Promise.all([
      warmShareEntry(destUrl, context, "copy_from"),
      warmShareEntry(sourceUrl, context, "copy_from"),
    ]);
    let orgDenyResult = orgDeny();
    if (orgDenyResult !== null) return orgDenyResult;
    let sourceCallDenyRule = artifactCallReadRule(
      getToolPermissionContext(context),
      sourceUrl,
      fromUrl,
      "deny",
      {
        copySource: true,
        action: "copy_from",
      },
    );
    if (sourceCallDenyRule !== null)
      return denyByArtifactRule(sourceCallDenyRule, "nothing was copied", true);
    let sourceAskRule = sourceRuleFor("ask");
    if (sourceAskRule === null && !readKeepsFlagOffAsk(context)) {
      let writeRuling = classifyArtifactConsent(classFactsFor("write", destUrl, context));
      if (!writeKeepsFlagOffAsk(writeRuling, context) && !hasOtherComment())
        return decideByClasses(
          {
            ...input,
            ...pinBuilder({
              dst: false,
              src: false,
            }),
            ...baseTags,
          },
          context,
          [
            {
              ruling: writeRuling,
              slug: destUrl.slug,
              display: artifactCardTitleFor(destUrl, context),
              action: "write",
            },
            {
              ruling: copySourceRulingFor(sourceUrl, context),
              slug: sourceUrl.slug,
              display: artifactCardTitleFor(sourceUrl, context),
              action: "copy_from",
              userOnly: othersArtifactReadIsUserOnly(sourceUrl),
            },
          ],
        );
    }
    let consentState = readConsentState();
    if (consentState.dstConsented && consentState.srcConsented && sourceAskRule === null)
      return {
        behavior: "allow",
        updatedInput: {
          ...input,
          ...basePins,
          ...baseTags,
        },
        decisionReason: {
          type: "other",
          reason: COPY_ALREADY_APPROVED_NOTE,
        },
      };
    if (planConsentMustDeny(context) || (!consentState.srcConsented && coworkConsentMustDeny(context)))
      return {
        behavior: "deny",
        message:
          "Copying assets into a published artifact needs a consent surface, and no one can answer the prompt in this session. Raise the copy with the user in chat; do not retry it in this session.",
        decisionReason: {
          type: "safetyCheck",
          reason: "Artifact asset copies require a live human consent surface here",
          classifierApprovable: false,
        },
      };
    let othersFloorDeny =
      !consentState.srcConsented && sourceAskRule === null
        ? othersContentFloorDeny(context, "Nothing was copied", consentState.userOnly)
        : null;
    if (othersFloorDeny !== null) return othersFloorDeny;
    let share = getShareEntry(destUrl.slug);
    let assetCount = ids.length;
    let labelFor = (url) => {
      let { title } = artifactCardTitleFor(url, context);
      return title !== undefined && title !== "" ? `"${title}"` : "an untitled artifact";
    };
    let sourceBlock = `

source: ${artifactViewerUrlFor(sourceUrl)}
into: ${artifactViewerUrlFor(destUrl)}`;
    let copyPhrase = `${assetCount} ${plural(assetCount, "asset")} from ${labelFor(sourceUrl)} into ${labelFor(destUrl)}`;
    let sourceOwnershipNote = consentState.srcConsented
      ? ""
      : copyOwnershipNote("source", consentState.srcEntry);
    let destOwnershipNote = copyOwnershipNote("destination", share);
    let hasSourceConsent = consentState.srcConsented || sourceAskRule !== null;
    let coverageNote = !consentState.coversSession
      ? ""
      : consentState.askedAgain
        ? hasSourceConsent
          ? " Approving covers later uploads and copies here until someone else comments on this artifact again."
          : " Approving covers later uploads and copies here until someone else comments on this artifact again, and reads of the source this session."
        : hasSourceConsent
          ? ASSET_UPLOAD_COVERS_SESSION_COPIES_NOTE
          : COPY_FROM_COVERS_SESSION_AND_SOURCE_NOTE;
    let ruleNote = sourceAskRule === null ? "" : askRuleCoverageNote(sourceAskRule);
    let coverageText = consentState.askedAgain && hasSourceConsent ? "" : coverageNote;
    let cardReason = `${COPY_FROM_CARD_LEDE}${consentState.inPlanMode ? planModeCardNote(false) : ""}${sourceOwnershipNote}${destOwnershipNote}${coverageText}`;
    recordNamedOtherOrgs(
      context,
      !consentState.srcConsented && otherOrgCopySource(consentState.srcEntry) ? [sourceUrl.slug] : [],
      consentAskCanReachUser(context),
    );
    return {
      behavior: "ask",
      message:
        `Claude wants to copy ${copyPhrase} on the server, so everyone who can open that artifact can load them${ruleNote}.` +
        sourceOwnershipNote +
        destOwnershipNote +
        (consentState.coversSession ? coverageNote : " Each such copy asks again.") +
        (sourceAskRule !== null && consentState.coversSession ? " A copy from this source asks again." : "") +
        sourceBlock,
      updatedInput: {
        ...input,
        ...pinBuilder({
          dst: !consentState.dstConsented,
          src: !consentState.srcConsented && sourceAskRule === null,
        }),
        [CONSENT_ASK_TAG]: consentState.coversSession && consentAskCanReachUser(context),
        [PLAN_CONSENT_ASK_TAG]: consentState.inPlanMode,
        [USER_ONLY_CONSENT_ASK_TAG]: consentState.userOnly,
      },
      suppressAlwaysAllowRule: true,
      decisionReason: consentState.inPlanMode
        ? {
            type: "safetyCheck",
            reason: cardReason,
            classifierApprovable: false,
          }
        : sourceAskRule !== null && !consentState.userOnly
          ? {
              type: "rule",
              rule: sourceAskRule,
            }
          : consentDecisionReason(consentState.userOnly, cardReason),
      ...(sourceAskRule !== null && {
        matchedAskRule: sourceAskRule,
      }),
      localDisplayOnly: true,
    };
  },
  async validateInput(tool, input) {
    let allowedFields = ["action", "url", "from_url", "asset_ids"];
    let filtered = Object.keys(input).filter(
      (key) => !allowedFields.includes(key) && input[key] !== undefined,
    );
    if (filtered.length > 0)
      return {
        result: false,
        message: `action "copy_from" does not take ${filtered.join(", ")} \u2014 remove ${filtered.length === 1 ? "it" : "them"} and keep \`url\`, \`from_url\` and \`asset_ids\`.${"files" in inputSchema().shape ? " (To copy another artifact's published FILES instead, publish with `files` mapping a path to {artifact, path}.)" : ""}`,
        errorCode: 8,
      };
    if (!artifactCopyFromFrozen())
      return {
        result: false,
        message: 'action "copy_from" is not enabled for this account.',
        errorCode: 9,
      };
    let { url, fromUrl, ids } = readCopyFromInput(input);
    for (let [fieldName, fieldValue] of [
      ["url", url],
      ["from_url", fromUrl],
    ]) {
      if (fieldValue === undefined)
        return {
          result: false,
          message: `action "copy_from" requires \`${fieldName}\` \u2014 the ${fieldName === "url" ? "DESTINATION" : "SOURCE"} Artifact's claude.ai URL (find it with action: "list").`,
          errorCode: 7,
        };
      let urlField = validateSessionArtifactUrl(fieldValue, {
        field: fieldName,
      });
      if (!urlField.ok)
        return {
          result: false,
          message: `\`${fieldName}\`: ${urlField.message}`,
          errorCode: urlField.errorCode,
        };
      let urlError = urlSubPathError(fieldValue, "", fieldName);
      if (urlError !== undefined) return urlError;
    }
    if (parseArtifactUrl(url).slug === parseArtifactUrl(fromUrl).slug)
      return {
        result: false,
        message:
          "`from_url` names the destination itself \u2014 its assets are already there; nothing to copy.",
        errorCode: 4,
      };
    let idsProblem = assetIdsInputError(ids);
    if (idsProblem !== undefined)
      return {
        result: false,
        message: idsProblem,
        errorCode: 7,
      };
    return {
      result: true,
    };
  },
  async call(tool, input, context) {
    if (!artifactCopyFromFrozen())
      throw new ArtifactInputError(
        'action "copy_from" is not enabled for this account',
        "copy_from_disabled",
      );
    let { url, fromUrl, ids } = readCopyFromInput(input);
    let destUrl = url !== undefined && validateSessionArtifactUrl(url).ok ? parseArtifactUrl(url) : null;
    let sourceUrl =
      fromUrl !== undefined && validateSessionArtifactUrl(fromUrl).ok ? parseArtifactUrl(fromUrl) : null;
    if (destUrl === null || sourceUrl === null || destUrl.slug === sourceUrl.slug)
      throw new ArtifactInputError(
        'url and from_url must be two different artifact URLs for action "copy_from"',
        "asset_copy_bad_url",
      );
    let idsProblem = assetIdsInputError(ids);
    if (idsProblem !== undefined || ids === undefined)
      throw new ArtifactInputError(idsProblem ?? "asset_ids missing", "asset_copy_bad_ids");
    let targetPin = Reflect.get(input, ASSET_TARGET_PIN_TAG);
    if (
      carriesForeignPin(input, ASSET_TARGET_PIN_TAG) ||
      (targetPin !== undefined &&
        (targetPin?.action !== "copy_from" ||
          targetPin.slug !== destUrl.slug ||
          targetPin.from !== sourceUrl.slug ||
          targetPin.ids !== sortedJoinedKeys(ids)))
    )
      throw new ArtifactInputError(
        "url, from_url or asset_ids no longer name the copy that was approved \u2014 nothing was copied; retry so it is checked again",
        "asset_copy_target_changed",
      );
    let deniedByRule = readDeniedByRule(context, sourceUrl, fromUrl, "nothing was copied", {
      copySource: true,
      action: "copy_from",
    });
    if (deniedByRule !== undefined) throw deniedByRule;
    if (otherOrgCopySource(getShareEntry(destUrl.slug)))
      throw new ArtifactInputError(`${COPY_INTO_OTHER_ORG_MESSAGE}.`, "asset_copy_outside_org_destination");
    let shareEntry = getShareEntry(sourceUrl.slug);
    let otherOrgWasNamed = wasOtherOrgNamed(context, sourceUrl.slug);
    forgetNamedOtherOrg(context);
    let canAsk = otherOrgWasNamed && consentAskCanReachUser(context);
    let crossOrgOk = () => crossOrgCopyOk(context, sourceUrl.slug, canAsk);
    if (otherOrgCopySource(shareEntry) && !crossOrgOk())
      throw outsideOrgConsentRefusal(context, "asset_copy");
    let doCopy = () =>
      copyArtifactAsset(
        {
          slug: destUrl.slug,
          fromSlug: sourceUrl.slug,
          ids,
          crossOrgOk: crossOrgOk(),
          credentials: context.credentials,
        },
        context.abortController.signal,
      );
    let copyResult = await doCopy();
    if (
      copyResult.kind === "error" &&
      copyResult.reason === "not_found" &&
      isFramePublicReadEnabled() &&
      !otherOrgCopySource(shareEntry) &&
      (shareEntry === undefined || shareEntry.probeFailed === true)
    ) {
      await reprobeShareEntry(sourceUrl, context, "copy_from retry");
      if (otherOrgCopySource(getShareEntry(sourceUrl.slug))) {
        if (!crossOrgOk()) throw outsideOrgConsentRefusal(context, "asset_copy");
        copyResult = await doCopy();
      }
    }
    if (copyResult.kind === "error")
      throw new ArtifactInputError(copyResult.message, `asset_copy_${copyResult.reason}`);
    if (targetPin?.dstAsked === true)
      stampArtifactAssetUploadConsent(
        input,
        context,
        destUrl.slug,
        typeof targetPin.otherCommentSeq === "number" ? targetPin.otherCommentSeq : undefined,
      );
    if (targetPin?.srcAsked === true)
      stampArtifactAssetReadConsent(input, context, sourceUrl.slug, otherOrgWasNamed);
    return {
      data: {
        asset_copy: {
          url: artifactViewerUrlFor(destUrl),
          from_url: artifactViewerUrlFor(sourceUrl),
          assets: copyResult.assets.map((asset) => ({
            from_id: asset.fromId,
            id: asset.id,
            url: asset.url,
            size_bytes: asset.sizeBytes,
            content_type: asset.contentType,
            ...(asset.sha256 !== undefined && {
              sha256: asset.sha256,
            }),
          })),
        },
      },
    };
  },
  toAutoClassifierInput(input) {
    let { url, fromUrl, ids } = readCopyFromInput(input);
    let destUrl = url !== undefined ? parseArtifactUrl(url) : null;
    let sourceUrl = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    let destEntry = destUrl !== null ? getShareEntry(destUrl.slug) : undefined;
    let sourceEntry = sourceUrl !== null ? getShareEntry(sourceUrl.slug) : undefined;
    let sharedLiveMark = destEntry?.probeFailed
      ? " [shared-live: unknown]"
      : destEntry !== undefined && destEntry.mode !== "owner"
        ? ` [shared-live: ${destEntry.mode}]`
        : "";
    let assetCount = ids?.length ?? 0;
    return `copy ${assetCount} runtime ${plural(assetCount, "asset")} server side from artifact ${classifierArtifactTargetFor(fromUrl, "(unrecognized address)")}${ownershipClassifierTag(sourceEntry, "assets")} into the asset store of artifact ${classifierArtifactTargetFor(url, "(unrecognized address)")}${ownershipClassifierMark(destEntry)}${shareClassifierMarks(destEntry)}${sharedLiveMark} (no local file is read or written)`;
  },
  async description(tool, input, options) {
    let { url, fromUrl, ids } = readCopyFromInput(input);
    let assetCount = ids?.length ?? 0;
    let destUrl = url !== undefined ? parseArtifactUrl(url) : null;
    let sourceUrl = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    let destEntry = destUrl !== null ? getShareEntry(destUrl.slug) : undefined;
    let sourceOwnership = ownershipSuffix(
      sourceUrl !== null ? getShareEntry(sourceUrl.slug) : undefined,
      "assets",
    );
    let audienceText = destEntry?.probeFailed
      ? "share status unconfirmed"
      : destEntry !== undefined && destEntry.mode !== "owner"
        ? `shared \u2014 loadable by ${entryAudience(destEntry)}`
        : "loadable by anyone who can open the artifact";
    let asksEach = options?.toolPermissionContext.mode === "auto";
    return `Copy ${assetCount} ${plural(assetCount, "asset")} from the published artifact ${canonicalArtifactTargetFor(fromUrl, "(unrecognized address)")}${sourceOwnership} into the asset store of ${canonicalArtifactTargetFor(url, "(unrecognized address)")}${ownershipTag(destEntry)} on claude.ai, server side (${audienceText}); ${asksEach ? "each copy asks separately" : "approving covers further uploads and copies into this artifact for the rest of this session"}.`;
  },
  getToolUseSummary(input) {
    let { url, fromUrl, ids } = readCopyFromInput(input);
    let assetCount = ids?.length ?? 0;
    let destUrl = url !== undefined ? parseArtifactUrl(url) : null;
    let sourceUrl = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    let destEntry = destUrl !== null ? getShareEntry(destUrl.slug) : undefined;
    let sourceEntry = sourceUrl !== null ? getShareEntry(sourceUrl.slug) : undefined;
    return `copy ${assetCount} ${plural(assetCount, "asset")} from ${canonicalArtifactTargetFor(fromUrl, "(unrecognized address)")}${ownershipSuffix(sourceEntry, "assets")} into an artifact's asset store${shareAudienceMark(destEntry)}${ownershipTag(destEntry)}`;
  },
};
var renderCopyFromResult = (result, toolUseId) => {
  let assetCopy = "asset_copy" in result && isPlainObject(result.asset_copy) ? result.asset_copy : {};
  let capped = capResultRows(assetCopy.assets);
  let mapped = capped.rows.map(
    (asset) =>
      `- ${peerOrFallback(asset.url, ASSET_BLOB_URL_RE, "(unrecognized url)")}  ${peerOrFallback(asset.content_type, CONTENT_TYPE_RE, "(unrecognized type)")}  ${numberText(asset.size_bytes)} bytes  \u2190 source id ${peerOrFallback(asset.from_id, ASSET_ID_RE, "unreadable")}${typeof asset.sha256 === "string" ? `  sha256 ${peerOrFallback(asset.sha256, SHA256_HEX_RE, "unreadable")}` : ""}`,
  );
  let rowCount = capped.rows.length;
  let exampleUrl = peerOrFallback(capped.rows[0]?.url, ASSET_BLOB_URL_RE, "_blob/\u2026");
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content:
      `Copied ${rowCount} ${plural(rowCount, "asset")} from ${canonicalArtifactTargetFor(assetCopy.from_url, "(unrecognized source address)")} into ${canonicalArtifactTargetFor(assetCopy.url, "(unrecognized address)")} \u2014 each is now a separate asset of the destination (new id, same bytes), independent of the source from here on:
` +
      (mapped.length > 0
        ? mapped.join(`
`)
        : "- (this record lists no copies)") +
      (capped.unreadable + capped.pastCap > 0
        ? `
(${capped.unreadable + capped.pastCap} more ${plural(capped.unreadable + capped.pastCap, "row")} not shown \u2014 run ${pickByToolset('action "list_assets"', () => 'action "list" with `scope: "assets"`')} on the destination for the real listing)`
        : "") +
      `
Reference a copy from the destination's page by its url verbatim \u2014 e.g. <img src=${jsonStringify(exampleUrl)}> \u2014 never by the source's id, which resolves only on the source artifact. Everyone who can open the destination can load these; they stay until deleted with ${pickByToolset('action "delete_asset"', () => 'action "delete" and an id as `path`')}.`,
  };
};
export { ARTIFACT_COPY_FROM_ACTION_HANDLER, renderCopyFromResult };
