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
import { Eae } from "../../../utils/untrustedArray.js";
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
  xQr,
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
import { capResultRows, j0, G7 } from "../../../services/artifacts/artifactPeople.js";
import { jsonStringify } from "../../../utils/slowOperations.js";

//@ chunk-8wvtd8sr.js:81989-82230 placement
function readCopyFromInput(e) {
  let n = (h) => (e === void 0 ? void 0 : Reflect.get(e, h)),
    s = (h) => {
      let y = n(h);
      return typeof y === "string" ? y : void 0;
    },
    r = Eae(n("asset_ids"));
  return {
    url: s("url"),
    fromUrl: s("from_url"),
    ids: r !== void 0 && r.every((h) => typeof h === "string") ? r : void 0,
  };
}
/**
 * 校验 copy_from 的 asset_ids：必须 1–yue 个、32 位资产 id、不重复；不合法时返回错误文案。
 */
//@ chunk-8wvtd8sr.js:82230-82741 placement
function assetIdsInputError(assetIds) {
  if (assetIds === void 0 || assetIds.length === 0)
    return `action "copy_from" requires \`asset_ids\` \u2014 1\u2013${MAX_COPY_ASSET_IDS} asset ids from the source artifact (its list_assets result).`;
  if (assetIds.length > MAX_COPY_ASSET_IDS)
    return `\`asset_ids\` names ${assetIds.length} ids; copy_from takes at most ${MAX_COPY_ASSET_IDS} per call \u2014 split it.`;
  if (!assetIds.every((n) => ASSET_ID_RE.test(n)))
    return "`asset_ids` must be 32-character asset ids, exactly as list_assets printed them.";
  if (new Set(assetIds).size !== assetIds.length)
    return "`asset_ids` repeats an id \u2014 name each asset once.";
  return;
}
//@ chunk-8wvtd8sr.js:82741-82786 placement
function lu(e) {
  return [...e].sort().join(",");
}
/**
 * 为 copy_from 的权限询问补一句归属说明：源/目标 Artifact 是共写的、外组织公开、外组织共享、他人的或无法确认。
 */
//@ chunk-8wvtd8sr.js:82786-83636 placement
function copyOwnershipNote(side, share) {
  if (share === void 0) return "";
  if (ownedByUser(share))
    return side === "source" && filesCowritten(share) && !ownTypeInstance(share)
      ? " A co-writer has also published to the source artifact, so its assets may include files they added."
      : "";
  if (side === "source" && outsideOrgRead(share))
    return " The source is a public artifact from outside your organization. If you approve, Claude copies its assets into this one.";
  if (side === "source" && invitedCopySource(share))
    return " The source artifact belongs to another organization and was shared with you. If you approve, Claude copies its assets into this one.";
  if (share.probeFailed || share.role === void 0 || share.role === "unknown")
    return ` Couldn't confirm whether the ${side} artifact is yours.`;
  return side === "source"
    ? " The source artifact belongs to someone else \u2014 approving reads its assets into this copy."
    : " The destination artifact belongs to someone else \u2014 approving writes these assets into their artifact.";
}
/**
 * copy_from 动作模块：cu 为跨组织拒绝文案，Yg 为会话内已批准提示，uu 为动作处理器（checkPermissions / call / toAutoClassifierInput / getToolUseSummary），fu 渲染复制结果。
 */
//@ chunk-8wvtd8sr.js:83636-94022 placement
var COPY_INTO_OTHER_ORG_MESSAGE =
    "the destination artifact belongs to another organization, and assets can only be copied into artifacts in your own organization, so nothing was copied. Copy them into one of your own artifacts instead",
  COPY_ALREADY_APPROVED_NOTE =
    "Asset uploads into this artifact and reads of the source already approved this session",
  ARTIFACT_COPY_FROM_ACTION_HANDLER = {
    actions: ["copy_from"],
    async checkPermissions(e, n, s) {
      let { url: url, fromUrl: fromUrl, ids: ids } = readCopyFromInput(n),
        p = url !== void 0 ? parseArtifactUrl(url) : null,
        w = fromUrl !== void 0 ? parseArtifactUrl(fromUrl) : null;
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
            classifierApprovable: !1,
          },
        };
      let A = assetIdsInputError(ids);
      if (A !== void 0)
        return {
          behavior: "deny",
          message: A,
          decisionReason: { type: "other", reason: "Asset copy input has missing or malformed asset_ids" },
        };
      let S = ($e) =>
          artifactReadRule(getToolPermissionContext(s), w, fromUrl, $e, {
            copySource: !0,
            action: "copy_from",
          }),
        R = S("deny");
      if (R !== null) return denyByArtifactRule(R, "nothing was copied", !0);
      let T = () => hasOtherCommentPending(p.slug),
        P = ($e) => ({
          [ASSET_TARGET_PIN_TAG]: {
            action: "copy_from",
            slug: p.slug,
            from: w.slug,
            ids: lu(ids ?? []),
            dstAsked: $e.dst,
            srcAsked: $e.src,
            ...($e.dst && { otherCommentSeq: otherCommentPendingSeq(p.slug) }),
          },
        }),
        L = P({ dst: !1, src: !1 }),
        V = { [CONSENT_ASK_TAG]: !1, [PLAN_CONSENT_ASK_TAG]: !1, [USER_ONLY_CONSENT_ASK_TAG]: !1 },
        M = () => {
          let $e = getToolPermissionContext(s),
            oe = $e.mode === "plan",
            ke = $e.mode !== "auto",
            Se = needsHumanAssetConsent(s, p.slug),
            ce = Se && T(),
            Re = Se && !ce,
            Fe = getShareEntry(w.slug),
            xe = copySourceConsented(s, w, "assets"),
            it = !xe && !ownedByUser(Fe) && othersArtifactReadIsUserOnly(w);
          return {
            inPlanMode: oe,
            coversSession: ke,
            askedAgain: ce,
            dstConsented: Re,
            srcEntry: Fe,
            srcConsented: xe,
            userOnly: it,
          };
        },
        x = () =>
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
        copySource: !0,
        action: "copy_from",
      });
      if (re !== null) return denyByArtifactRule(re, "nothing was copied", !0);
      let Z = S("ask");
      if (Z === null && !readKeepsFlagOffAsk(s)) {
        let $e = classifyArtifactConsent(classFactsFor("write", p, s));
        if (!writeKeepsFlagOffAsk($e, s) && !T())
          return decideByClasses({ ...n, ...P({ dst: !1, src: !1 }), ...V }, s, [
            { ruling: $e, slug: p.slug, display: artifactCardTitleFor(p, s), action: "write" },
            {
              ruling: copySourceRulingFor(w, s),
              slug: w.slug,
              display: artifactCardTitleFor(w, s),
              action: "copy_from",
              userOnly: othersArtifactReadIsUserOnly(w),
            },
          ]);
      }
      let ue = M();
      if (ue.dstConsented && ue.srcConsented && Z === null)
        return {
          behavior: "allow",
          updatedInput: { ...n, ...L, ...V },
          decisionReason: { type: "other", reason: COPY_ALREADY_APPROVED_NOTE },
        };
      if (planConsentMustDeny(s) || (!ue.srcConsented && coworkConsentMustDeny(s)))
        return {
          behavior: "deny",
          message:
            "Copying assets into a published artifact needs a consent surface, and no one can answer the prompt in this session. Raise the copy with the user in chat; do not retry it in this session.",
          decisionReason: {
            type: "safetyCheck",
            reason: "Artifact asset copies require a live human consent surface here",
            classifierApprovable: !1,
          },
        };
      let we =
        !ue.srcConsented && Z === null ? othersContentFloorDeny(s, "Nothing was copied", ue.userOnly) : null;
      if (we !== null) return we;
      let Ie = getShareEntry(p.slug),
        ie = ids.length,
        _e = ($e) => {
          let { title: title } = artifactCardTitleFor($e, s);
          return title !== void 0 && title !== "" ? `"${title}"` : "an untitled artifact";
        },
        Oe = `

source: ${artifactViewerUrlFor(w)}
into: ${artifactViewerUrlFor(p)}`,
        me = `${ie} ${plural(ie, "asset")} from ${_e(w)} into ${_e(p)}`,
        ge = ue.srcConsented ? "" : copyOwnershipNote("source", ue.srcEntry),
        Je = copyOwnershipNote("destination", Ie),
        He = ue.srcConsented || Z !== null,
        se = !ue.coversSession
          ? ""
          : ue.askedAgain
            ? He
              ? " Approving covers later uploads and copies here until someone else comments on this artifact again."
              : " Approving covers later uploads and copies here until someone else comments on this artifact again, and reads of the source this session."
            : He
              ? ASSET_UPLOAD_COVERS_SESSION_COPIES_NOTE
              : COPY_FROM_COVERS_SESSION_AND_SOURCE_NOTE,
        B = Z === null ? "" : askRuleCoverageNote(Z),
        U = ue.askedAgain && He ? "" : se,
        he = `${COPY_FROM_CARD_LEDE}${ue.inPlanMode ? planModeCardNote(!1) : ""}${ge}${Je}${U}`;
      return (
        recordNamedOtherOrgs(
          s,
          !ue.srcConsented && otherOrgCopySource(ue.srcEntry) ? [w.slug] : [],
          consentAskCanReachUser(s),
        ),
        {
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
            ...P({ dst: !ue.dstConsented, src: !ue.srcConsented && Z === null }),
            [CONSENT_ASK_TAG]: ue.coversSession && consentAskCanReachUser(s),
            [PLAN_CONSENT_ASK_TAG]: ue.inPlanMode,
            [USER_ONLY_CONSENT_ASK_TAG]: ue.userOnly,
          },
          suppressAlwaysAllowRule: !0,
          decisionReason: ue.inPlanMode
            ? { type: "safetyCheck", reason: he, classifierApprovable: !1 }
            : Z !== null && !ue.userOnly
              ? { type: "rule", rule: Z }
              : consentDecisionReason(ue.userOnly, he),
          ...(Z !== null && { matchedAskRule: Z }),
          localDisplayOnly: !0,
        }
      );
    },
    async validateInput(e, n) {
      let s = ["action", "url", "from_url", "asset_ids"],
        filtered = Object.keys(n).filter((A) => !s.includes(A) && n[A] !== void 0);
      if (filtered.length > 0)
        return {
          result: !1,
          message: `action "copy_from" does not take ${filtered.join(", ")} \u2014 remove ${filtered.length === 1 ? "it" : "them"} and keep \`url\`, \`from_url\` and \`asset_ids\`.${"files" in inputSchema().shape ? " (To copy another artifact's published FILES instead, publish with `files` mapping a path to {artifact, path}.)" : ""}`,
          errorCode: 8,
        };
      if (!artifactCopyFromFrozen())
        return { result: !1, message: 'action "copy_from" is not enabled for this account.', errorCode: 9 };
      let { url: url, fromUrl: fromUrl, ids: ids } = readCopyFromInput(n);
      for (let [A, S] of [
        ["url", url],
        ["from_url", fromUrl],
      ]) {
        if (S === void 0)
          return {
            result: !1,
            message: `action "copy_from" requires \`${A}\` \u2014 the ${A === "url" ? "DESTINATION" : "SOURCE"} Artifact's claude.ai URL (find it with action: "list").`,
            errorCode: 7,
          };
        let R = parseSessionArtifactUrl(S, { field: A });
        if (!R.ok) return { result: !1, message: `\`${A}\`: ${R.message}`, errorCode: R.errorCode };
        let T = urlSubPathError(S, "", A);
        if (T !== void 0) return T;
      }
      if (parseArtifactUrl(url).slug === parseArtifactUrl(fromUrl).slug)
        return {
          result: !1,
          message:
            "`from_url` names the destination itself \u2014 its assets are already there; nothing to copy.",
          errorCode: 4,
        };
      let w = assetIdsInputError(ids);
      if (w !== void 0) return { result: !1, message: w, errorCode: 7 };
      return { result: !0 };
    },
    async call(e, n, s) {
      if (!artifactCopyFromFrozen())
        throw new ArtifactInputError(
          'action "copy_from" is not enabled for this account',
          "copy_from_disabled",
        );
      let { url: url, fromUrl: fromUrl, ids: ids } = readCopyFromInput(n),
        p = url !== void 0 && parseSessionArtifactUrl(url).ok ? parseArtifactUrl(url) : null,
        w = fromUrl !== void 0 && parseSessionArtifactUrl(fromUrl).ok ? parseArtifactUrl(fromUrl) : null;
      if (p === null || w === null || p.slug === w.slug)
        throw new ArtifactInputError(
          'url and from_url must be two different artifact URLs for action "copy_from"',
          "asset_copy_bad_url",
        );
      let A = assetIdsInputError(ids);
      if (A !== void 0 || ids === void 0)
        throw new ArtifactInputError(A ?? "asset_ids missing", "asset_copy_bad_ids");
      let S = Reflect.get(n, ASSET_TARGET_PIN_TAG);
      if (
        carriesForeignPin(n, ASSET_TARGET_PIN_TAG) ||
        (S !== void 0 &&
          (S?.action !== "copy_from" || S.slug !== p.slug || S.from !== w.slug || S.ids !== lu(ids)))
      )
        throw new ArtifactInputError(
          "url, from_url or asset_ids no longer name the copy that was approved \u2014 nothing was copied; retry so it is checked again",
          "asset_copy_target_changed",
        );
      let R = readDeniedByRule(s, w, fromUrl, "nothing was copied", { copySource: !0, action: "copy_from" });
      if (R !== void 0) throw R;
      if (otherOrgCopySource(getShareEntry(p.slug)))
        throw new ArtifactInputError(`${COPY_INTO_OTHER_ORG_MESSAGE}.`, "asset_copy_outside_org_destination");
      let T = getShareEntry(w.slug),
        P = wasOtherOrgNamed(s, w.slug);
      xQr(s);
      let L = P && consentAskCanReachUser(s),
        V = () => crossOrgCopyOk(s, w.slug, L);
      if (otherOrgCopySource(T) && !V()) throw outsideOrgConsentRefusal(s, "asset_copy");
      let M = () =>
          copyArtifactAsset(
            { slug: p.slug, fromSlug: w.slug, ids: ids, crossOrgOk: V(), credentials: s.credentials },
            s.abortController.signal,
          ),
        x = await M();
      if (
        x.kind === "error" &&
        x.reason === "not_found" &&
        isFramePublicReadEnabled() &&
        !otherOrgCopySource(T) &&
        (T === void 0 || T.probeFailed === !0)
      ) {
        if ((await reprobeShareEntry(w, s, "copy_from retry"), otherOrgCopySource(getShareEntry(w.slug)))) {
          if (!V()) throw outsideOrgConsentRefusal(s, "asset_copy");
          x = await M();
        }
      }
      if (x.kind === "error") throw new ArtifactInputError(x.message, `asset_copy_${x.reason}`);
      if (S?.dstAsked === !0)
        stampArtifactAssetUploadConsent(
          n,
          s,
          p.slug,
          typeof S.otherCommentSeq === "number" ? S.otherCommentSeq : void 0,
        );
      if (S?.srcAsked === !0) stampArtifactAssetReadConsent(n, s, w.slug, P);
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
              ...(asset.sha256 !== void 0 && { sha256: asset.sha256 }),
            })),
          },
        },
      };
    },
    toAutoClassifierInput(e) {
      let { url: url, fromUrl: fromUrl, ids: ids } = readCopyFromInput(e),
        h = url !== void 0 ? parseArtifactUrl(url) : null,
        y = fromUrl !== void 0 ? parseArtifactUrl(fromUrl) : null,
        p = h !== null ? getShareEntry(h.slug) : void 0,
        w = y !== null ? getShareEntry(y.slug) : void 0,
        A = p?.probeFailed
          ? " [shared-live: unknown]"
          : p !== void 0 && p.mode !== "owner"
            ? ` [shared-live: ${p.mode}]`
            : "",
        S = ids?.length ?? 0;
      return `copy ${S} runtime ${plural(S, "asset")} server side from artifact ${classifierArtifactTargetFor(fromUrl, "(unrecognized address)")}${ownershipClassifierTag(w, "assets")} into the asset store of artifact ${classifierArtifactTargetFor(url, "(unrecognized address)")}${ownershipClassifierMark(p)}${shareClassifierMarks(p)}${A} (no local file is read or written)`;
    },
    async description(e, n, s) {
      let { url: url, fromUrl: fromUrl, ids: ids } = readCopyFromInput(n),
        p = ids?.length ?? 0,
        w = url !== void 0 ? parseArtifactUrl(url) : null,
        A = fromUrl !== void 0 ? parseArtifactUrl(fromUrl) : null,
        S = w !== null ? getShareEntry(w.slug) : void 0,
        R = ownershipSuffix(A !== null ? getShareEntry(A.slug) : void 0, "assets"),
        T = S?.probeFailed
          ? "share status unconfirmed"
          : S !== void 0 && S.mode !== "owner"
            ? `shared \u2014 loadable by ${entryAudience(S)}`
            : "loadable by anyone who can open the artifact",
        P = s?.toolPermissionContext.mode === "auto";
      return `Copy ${p} ${plural(p, "asset")} from the published artifact ${canonicalArtifactTargetFor(fromUrl, "(unrecognized address)")}${R} into the asset store of ${canonicalArtifactTargetFor(url, "(unrecognized address)")}${ownershipTag(S)} on claude.ai, server side (${T}); ${P ? "each copy asks separately" : "approving covers further uploads and copies into this artifact for the rest of this session"}.`;
    },
    getToolUseSummary(e) {
      let { url: url, fromUrl: fromUrl, ids: ids } = readCopyFromInput(e),
        h = ids?.length ?? 0,
        y = url !== void 0 ? parseArtifactUrl(url) : null,
        p = fromUrl !== void 0 ? parseArtifactUrl(fromUrl) : null,
        w = y !== null ? getShareEntry(y.slug) : void 0,
        A = p !== null ? getShareEntry(p.slug) : void 0;
      return `copy ${h} ${plural(h, "asset")} from ${canonicalArtifactTargetFor(fromUrl, "(unrecognized address)")}${ownershipSuffix(A, "assets")} into an artifact's asset store${shareAudienceMark(w)}${ownershipTag(w)}`;
    },
  },
  renderCopyFromResult = (e, n) => {
    let s = "asset_copy" in e && isPlainObject(e.asset_copy) ? e.asset_copy : {},
      r = capResultRows(s.assets),
      mapped = r.rows.map(
        (row) =>
          `- ${j0(row.url, ASSET_BLOB_URL_RE, "(unrecognized url)")}  ${j0(row.content_type, CONTENT_TYPE_RE, "(unrecognized type)")}  ${G7(row.size_bytes)} bytes  \u2190 source id ${j0(row.from_id, ASSET_ID_RE, "unreadable")}${typeof row.sha256 === "string" ? `  sha256 ${j0(row.sha256, SHA256_HEX_RE, "unreadable")}` : ""}`,
      ),
      y = r.rows.length,
      p = j0(r.rows[0]?.url, ASSET_BLOB_URL_RE, "_blob/\u2026");
    return {
      tool_use_id: n,
      type: "tool_result",
      content:
        `Copied ${y} ${plural(y, "asset")} from ${canonicalArtifactTargetFor(s.from_url, "(unrecognized source address)")} into ${canonicalArtifactTargetFor(s.url, "(unrecognized address)")} \u2014 each is now a separate asset of the destination (new id, same bytes), independent of the source from here on:
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
