/**
 * tools/ArtifactTool/actions/copyFrom.ts
 *
 * 2.1.316 新增：copy_from 动作
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (5)
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
import { parseSessionArtifactUrl } from "../../../services/artifacts/orgScope.js";
import { urlSubPathError } from "../permissions/dbWriteInputs.js";
import { isFramePublicReadEnabled } from "../../../services/artifacts/frameFlags.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { capResultRows, peerOrFallback, numberText } from "../../../services/artifacts/artifactPeople.js";
import { jsonStringify } from "../../../utils/slowOperations.js";

//@ chunk-8wvtd8sr.js:81989-82230 placement
function readCopyFromInput(e) {
  let n = (h) => (e === undefined ? undefined : Reflect.get(e, h));
  let s = (h) => {
    let y = n(h);
    return typeof y === "string" ? y : undefined;
  };
  let untrustedArrayOrUndefined = readUntrustedArrayOrUndefined(n("asset_ids"));
  return {
    url: s("url"),
    fromUrl: s("from_url"),
    ids:
      untrustedArrayOrUndefined !== undefined && untrustedArrayOrUndefined.every((h) => typeof h === "string")
        ? untrustedArrayOrUndefined
        : undefined,
  };
}
//@ chunk-8wvtd8sr.js:82230-82741 placement
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
//@ chunk-8wvtd8sr.js:82741-82786 placement
/**
 * 把集合去重排序后用逗号连接。
 */
function sortedJoinedKeys(e) {
  return [...e].sort().join(",");
}
//@ chunk-8wvtd8sr.js:82786-83636 placement
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
//@ chunk-8wvtd8sr.js:83636-94022 placement
/**
 * copy_from 动作模块：cu 为跨组织拒绝文案，Yg 为会话内已批准提示，uu 为动作处理器（checkPermissions / call / toAutoClassifierInput / getToolUseSummary），fu 渲染复制结果。
 */
var COPY_INTO_OTHER_ORG_MESSAGE =
  "the destination artifact belongs to another organization, and assets can only be copied into artifacts in your own organization, so nothing was copied. Copy them into one of your own artifacts instead";
var COPY_ALREADY_APPROVED_NOTE =
  "Asset uploads into this artifact and reads of the source already approved this session";
var ARTIFACT_COPY_FROM_ACTION_HANDLER = {
  actions: ["copy_from"],
  async checkPermissions(e, n, s) {
    let { url, fromUrl, ids } = readCopyFromInput(n);
    let p = url !== undefined ? parseArtifactUrl(url) : null;
    let w = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    if (p === null || w === null || p.slug === w.slug)
      return {
        behavior: "deny",
        message:
          p === null || w === null
            ? "copy_from needs two artifact urls Claude can address \u2014 url (the destination) and from_url (the source), from the list or publish results."
            : "copy_from needs two different artifacts \u2014 from_url names the destination itself.",
        decisionReason: {
          type: "safetyCheck",
          reason:
            "Unparseable or identical artifact urls \u2014 the copy cannot be addressed or probed for ownership",
          classifierApprovable: false,
        },
      };
    let A = assetIdsInputError(ids);
    if (A !== undefined)
      return {
        behavior: "deny",
        message: A,
        decisionReason: {
          type: "other",
          reason: "Asset copy input has missing or malformed asset_ids",
        },
      };
    let S = ($e) =>
      artifactReadRule(getToolPermissionContext(s), w, fromUrl, $e, {
        copySource: true,
        action: "copy_from",
      });
    let R = S("deny");
    if (R !== null) return denyByArtifactRule(R, "nothing was copied", true);
    let T = () => hasOtherCommentPending(p.slug);
    let P = ($e) => ({
      [ASSET_TARGET_PIN_TAG]: {
        action: "copy_from",
        slug: p.slug,
        from: w.slug,
        ids: sortedJoinedKeys(ids ?? []),
        dstAsked: $e.dst,
        srcAsked: $e.src,
        ...($e.dst && {
          otherCommentSeq: otherCommentPendingSeq(p.slug),
        }),
      },
    });
    let L = P({
      dst: false,
      src: false,
    });
    let V = {
      [CONSENT_ASK_TAG]: false,
      [PLAN_CONSENT_ASK_TAG]: false,
      [USER_ONLY_CONSENT_ASK_TAG]: false,
    };
    let M = () => {
      let toolPermissionContext = getToolPermissionContext(s);
      let inPlanMode = toolPermissionContext.mode === "plan";
      let coversSession = toolPermissionContext.mode !== "auto";
      let Se = needsHumanAssetConsent(s, p.slug);
      let ce = Se && T();
      let dstConsented = Se && !ce;
      let shareEntry = getShareEntry(w.slug);
      let xe = copySourceConsented(s, w, "assets");
      let userOnly = !xe && !ownedByUser(shareEntry) && othersArtifactReadIsUserOnly(w);
      return {
        inPlanMode,
        coversSession,
        askedAgain: ce,
        dstConsented,
        srcEntry: shareEntry,
        srcConsented: xe,
        userOnly,
      };
    };
    let x = () =>
      denyOtherOrgArtifact(p, "Nothing was copied") ??
      denyOtherOrgArtifact(w, "Nothing was copied") ??
      (otherOrgCopySource(getShareEntry(p.slug))
        ? {
            behavior: "deny",
            message: `${COPY_INTO_OTHER_ORG_MESSAGE}. Tell the user.`,
            decisionReason: {
              type: "other",
              reason: "The destination artifact belongs to another organization",
            },
          }
        : null);
    if (othersArtifactReadConsentSurface()) await probeArtifactHostEgress(w, s.abortController.signal);
    await Promise.all([warmShareEntry(p, s, "copy_from"), warmShareEntry(w, s, "copy_from")]);
    let q = x();
    if (q !== null) return q;
    let re = artifactCallReadRule(getToolPermissionContext(s), w, fromUrl, "deny", {
      copySource: true,
      action: "copy_from",
    });
    if (re !== null) return denyByArtifactRule(re, "nothing was copied", true);
    let Z = S("ask");
    if (Z === null && !readKeepsFlagOffAsk(s)) {
      let $e = classifyArtifactConsent(classFactsFor("write", p, s));
      if (!writeKeepsFlagOffAsk($e, s) && !T())
        return decideByClasses(
          {
            ...n,
            ...P({
              dst: false,
              src: false,
            }),
            ...V,
          },
          s,
          [
            {
              ruling: $e,
              slug: p.slug,
              display: artifactCardTitleFor(p, s),
              action: "write",
            },
            {
              ruling: copySourceRulingFor(w, s),
              slug: w.slug,
              display: artifactCardTitleFor(w, s),
              action: "copy_from",
              userOnly: othersArtifactReadIsUserOnly(w),
            },
          ],
        );
    }
    let ue = M();
    if (ue.dstConsented && ue.srcConsented && Z === null)
      return {
        behavior: "allow",
        updatedInput: {
          ...n,
          ...L,
          ...V,
        },
        decisionReason: {
          type: "other",
          reason: COPY_ALREADY_APPROVED_NOTE,
        },
      };
    if (planConsentMustDeny(s) || (!ue.srcConsented && coworkConsentMustDeny(s)))
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
    let we =
      !ue.srcConsented && Z === null ? othersContentFloorDeny(s, "Nothing was copied", ue.userOnly) : null;
    if (we !== null) return we;
    let share = getShareEntry(p.slug);
    let ie = ids.length;
    let _e = ($e) => {
      let { title } = artifactCardTitleFor($e, s);
      return title !== undefined && title !== "" ? `"${title}"` : "an untitled artifact";
    };
    let Oe = `

source: ${artifactViewerUrlFor(w)}
into: ${artifactViewerUrlFor(p)}`;
    let me = `${ie} ${plural(ie, "asset")} from ${_e(w)} into ${_e(p)}`;
    let ge = ue.srcConsented ? "" : copyOwnershipNote("source", ue.srcEntry);
    let Je = copyOwnershipNote("destination", share);
    let He = ue.srcConsented || Z !== null;
    let se = !ue.coversSession
      ? ""
      : ue.askedAgain
        ? He
          ? " Approving covers later uploads and copies here until someone else comments on this artifact again."
          : " Approving covers later uploads and copies here until someone else comments on this artifact again, and reads of the source this session."
        : He
          ? ASSET_UPLOAD_COVERS_SESSION_COPIES_NOTE
          : COPY_FROM_COVERS_SESSION_AND_SOURCE_NOTE;
    let B = Z === null ? "" : askRuleCoverageNote(Z);
    let U = ue.askedAgain && He ? "" : se;
    let he = `${COPY_FROM_CARD_LEDE}${ue.inPlanMode ? planModeCardNote(false) : ""}${ge}${Je}${U}`;
    recordNamedOtherOrgs(
      s,
      !ue.srcConsented && otherOrgCopySource(ue.srcEntry) ? [w.slug] : [],
      consentAskCanReachUser(s),
    );
    return {
      behavior: "ask",
      message:
        `Claude wants to copy ${me} on the server, so everyone who can open that artifact can load them${B}.` +
        ge +
        Je +
        (ue.coversSession ? se : " Each such copy asks again.") +
        (Z !== null && ue.coversSession ? " A copy from this source asks again." : "") +
        Oe,
      updatedInput: {
        ...n,
        ...P({
          dst: !ue.dstConsented,
          src: !ue.srcConsented && Z === null,
        }),
        [CONSENT_ASK_TAG]: ue.coversSession && consentAskCanReachUser(s),
        [PLAN_CONSENT_ASK_TAG]: ue.inPlanMode,
        [USER_ONLY_CONSENT_ASK_TAG]: ue.userOnly,
      },
      suppressAlwaysAllowRule: true,
      decisionReason: ue.inPlanMode
        ? {
            type: "safetyCheck",
            reason: he,
            classifierApprovable: false,
          }
        : Z !== null && !ue.userOnly
          ? {
              type: "rule",
              rule: Z,
            }
          : consentDecisionReason(ue.userOnly, he),
      ...(Z !== null && {
        matchedAskRule: Z,
      }),
      localDisplayOnly: true,
    };
  },
  async validateInput(e, n) {
    let s = ["action", "url", "from_url", "asset_ids"];
    let filtered = Object.keys(n).filter((key) => !s.includes(key) && n[key] !== undefined);
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
    let { url, fromUrl, ids } = readCopyFromInput(n);
    for (let [A, S] of [
      ["url", url],
      ["from_url", fromUrl],
    ]) {
      if (S === undefined)
        return {
          result: false,
          message: `action "copy_from" requires \`${A}\` \u2014 the ${A === "url" ? "DESTINATION" : "SOURCE"} Artifact's claude.ai URL (find it with action: "list").`,
          errorCode: 7,
        };
      let sessionArtifactUrl = parseSessionArtifactUrl(S, {
        field: A,
      });
      if (!sessionArtifactUrl.ok)
        return {
          result: false,
          message: `\`${A}\`: ${sessionArtifactUrl.message}`,
          errorCode: sessionArtifactUrl.errorCode,
        };
      let T = urlSubPathError(S, "", A);
      if (T !== undefined) return T;
    }
    if (parseArtifactUrl(url).slug === parseArtifactUrl(fromUrl).slug)
      return {
        result: false,
        message:
          "`from_url` names the destination itself \u2014 its assets are already there; nothing to copy.",
        errorCode: 4,
      };
    let w = assetIdsInputError(ids);
    if (w !== undefined)
      return {
        result: false,
        message: w,
        errorCode: 7,
      };
    return {
      result: true,
    };
  },
  async call(e, n, s) {
    if (!artifactCopyFromFrozen())
      throw new ArtifactInputError(
        'action "copy_from" is not enabled for this account',
        "copy_from_disabled",
      );
    let { url, fromUrl, ids } = readCopyFromInput(n);
    let p = url !== undefined && parseSessionArtifactUrl(url).ok ? parseArtifactUrl(url) : null;
    let w = fromUrl !== undefined && parseSessionArtifactUrl(fromUrl).ok ? parseArtifactUrl(fromUrl) : null;
    if (p === null || w === null || p.slug === w.slug)
      throw new ArtifactInputError(
        'url and from_url must be two different artifact URLs for action "copy_from"',
        "asset_copy_bad_url",
      );
    let A = assetIdsInputError(ids);
    if (A !== undefined || ids === undefined)
      throw new ArtifactInputError(A ?? "asset_ids missing", "asset_copy_bad_ids");
    let S = Reflect.get(n, ASSET_TARGET_PIN_TAG);
    if (
      carriesForeignPin(n, ASSET_TARGET_PIN_TAG) ||
      (S !== undefined &&
        (S?.action !== "copy_from" ||
          S.slug !== p.slug ||
          S.from !== w.slug ||
          S.ids !== sortedJoinedKeys(ids)))
    )
      throw new ArtifactInputError(
        "url, from_url or asset_ids no longer name the copy that was approved \u2014 nothing was copied; retry so it is checked again",
        "asset_copy_target_changed",
      );
    let deniedByRule = readDeniedByRule(s, w, fromUrl, "nothing was copied", {
      copySource: true,
      action: "copy_from",
    });
    if (deniedByRule !== undefined) throw deniedByRule;
    if (otherOrgCopySource(getShareEntry(p.slug)))
      throw new ArtifactInputError(`${COPY_INTO_OTHER_ORG_MESSAGE}.`, "asset_copy_outside_org_destination");
    let shareEntry = getShareEntry(w.slug);
    let P = wasOtherOrgNamed(s, w.slug);
    forgetNamedOtherOrg(s);
    let L = P && consentAskCanReachUser(s);
    let V = () => crossOrgCopyOk(s, w.slug, L);
    if (otherOrgCopySource(shareEntry) && !V()) throw outsideOrgConsentRefusal(s, "asset_copy");
    let M = () =>
      copyArtifactAsset(
        {
          slug: p.slug,
          fromSlug: w.slug,
          ids,
          crossOrgOk: V(),
          credentials: s.credentials,
        },
        s.abortController.signal,
      );
    let x = await M();
    if (
      x.kind === "error" &&
      x.reason === "not_found" &&
      isFramePublicReadEnabled() &&
      !otherOrgCopySource(shareEntry) &&
      (shareEntry === undefined || shareEntry.probeFailed === true)
    ) {
      await reprobeShareEntry(w, s, "copy_from retry");
      if (otherOrgCopySource(getShareEntry(w.slug))) {
        if (!V()) throw outsideOrgConsentRefusal(s, "asset_copy");
        x = await M();
      }
    }
    if (x.kind === "error") throw new ArtifactInputError(x.message, `asset_copy_${x.reason}`);
    if (S?.dstAsked === true)
      stampArtifactAssetUploadConsent(
        n,
        s,
        p.slug,
        typeof S.otherCommentSeq === "number" ? S.otherCommentSeq : undefined,
      );
    if (S?.srcAsked === true) stampArtifactAssetReadConsent(n, s, w.slug, P);
    return {
      data: {
        asset_copy: {
          url: artifactViewerUrlFor(p),
          from_url: artifactViewerUrlFor(w),
          assets: x.assets.map((asset) => ({
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
  toAutoClassifierInput(e) {
    let { url, fromUrl, ids } = readCopyFromInput(e);
    let h = url !== undefined ? parseArtifactUrl(url) : null;
    let y = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    let p = h !== null ? getShareEntry(h.slug) : undefined;
    let w = y !== null ? getShareEntry(y.slug) : undefined;
    let A = p?.probeFailed
      ? " [shared-live: unknown]"
      : p !== undefined && p.mode !== "owner"
        ? ` [shared-live: ${p.mode}]`
        : "";
    let S = ids?.length ?? 0;
    return `copy ${S} runtime ${plural(S, "asset")} server side from artifact ${classifierArtifactTargetFor(fromUrl, "(unrecognized address)")}${ownershipClassifierTag(w, "assets")} into the asset store of artifact ${classifierArtifactTargetFor(url, "(unrecognized address)")}${ownershipClassifierMark(p)}${shareClassifierMarks(p)}${A} (no local file is read or written)`;
  },
  async description(e, n, s) {
    let { url, fromUrl, ids } = readCopyFromInput(n);
    let p = ids?.length ?? 0;
    let w = url !== undefined ? parseArtifactUrl(url) : null;
    let A = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    let S = w !== null ? getShareEntry(w.slug) : undefined;
    let R = ownershipSuffix(A !== null ? getShareEntry(A.slug) : undefined, "assets");
    let T = S?.probeFailed
      ? "share status unconfirmed"
      : S !== undefined && S.mode !== "owner"
        ? `shared \u2014 loadable by ${entryAudience(S)}`
        : "loadable by anyone who can open the artifact";
    let P = s?.toolPermissionContext.mode === "auto";
    return `Copy ${p} ${plural(p, "asset")} from the published artifact ${canonicalArtifactTargetFor(fromUrl, "(unrecognized address)")}${R} into the asset store of ${canonicalArtifactTargetFor(url, "(unrecognized address)")}${ownershipTag(S)} on claude.ai, server side (${T}); ${P ? "each copy asks separately" : "approving covers further uploads and copies into this artifact for the rest of this session"}.`;
  },
  getToolUseSummary(e) {
    let { url, fromUrl, ids } = readCopyFromInput(e);
    let h = ids?.length ?? 0;
    let y = url !== undefined ? parseArtifactUrl(url) : null;
    let p = fromUrl !== undefined ? parseArtifactUrl(fromUrl) : null;
    let w = y !== null ? getShareEntry(y.slug) : undefined;
    let A = p !== null ? getShareEntry(p.slug) : undefined;
    return `copy ${h} ${plural(h, "asset")} from ${canonicalArtifactTargetFor(fromUrl, "(unrecognized address)")}${ownershipSuffix(A, "assets")} into an artifact's asset store${shareAudienceMark(w)}${ownershipTag(w)}`;
  },
};
var renderCopyFromResult = (e, toolUseId) => {
  let assetCopy = "asset_copy" in e && isPlainObject(e.asset_copy) ? e.asset_copy : {};
  let r = capResultRows(assetCopy.assets);
  let mapped = r.rows.map(
    (w) =>
      `- ${peerOrFallback(w.url, ASSET_BLOB_URL_RE, "(unrecognized url)")}  ${peerOrFallback(w.content_type, CONTENT_TYPE_RE, "(unrecognized type)")}  ${numberText(w.size_bytes)} bytes  \u2190 source id ${peerOrFallback(w.from_id, ASSET_ID_RE, "unreadable")}${typeof w.sha256 === "string" ? `  sha256 ${peerOrFallback(w.sha256, SHA256_HEX_RE, "unreadable")}` : ""}`,
  );
  let y = r.rows.length;
  let p = peerOrFallback(r.rows[0]?.url, ASSET_BLOB_URL_RE, "_blob/\u2026");
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content:
      `Copied ${y} ${plural(y, "asset")} from ${canonicalArtifactTargetFor(assetCopy.from_url, "(unrecognized source address)")} into ${canonicalArtifactTargetFor(assetCopy.url, "(unrecognized address)")} \u2014 each is now a separate asset of the destination (new id, same bytes), independent of the source from here on:
` +
      (mapped.length > 0
        ? mapped.join(`
`)
        : "- (this record lists no copies)") +
      (r.unreadable + r.pastCap > 0
        ? `
(${r.unreadable + r.pastCap} more ${plural(r.unreadable + r.pastCap, "row")} not shown \u2014 run ${pickByToolset('action "list_assets"', () => 'action "list" with `scope: "assets"`')} on the destination for the real listing)`
        : "") +
      `
Reference a copy from the destination's page by its url verbatim \u2014 e.g. <img src=${jsonStringify(p)}> \u2014 never by the source's id, which resolves only on the source artifact. Everyone who can open the destination can load these; they stay until deleted with ${pickByToolset('action "delete_asset"', () => 'action "delete" and an id as `path`')}.`,
  };
};
export { ARTIFACT_COPY_FROM_ACTION_HANDLER, renderCopyFromResult };
