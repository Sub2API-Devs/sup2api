/**
 * tools/ArtifactTool/permissions/readConsent.ts
 *
 * 2.1.316 新增。artifact 读取的同意路径与通知通道判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k0wpq966.js (19)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getLiveState } from "../../../services/liveReplica/liveReplica.js";
import { isFrameMultiFileEnabled } from "../../../services/artifacts/frameFlags.js";
import {
  isCoworkFramePublishSession,
  outsideOrgRead,
  othersReadIsUserOnly,
  otherOrgCopySource,
  othersArtifactReadIsUserOnly,
  outsideOrgReadIsUserOnly,
} from "../../../services/artifacts/artifactToolGates.js";
import {
  consentMustDeny,
  getToolPermissionContext,
  artifactFilesConsentSlugs,
  planConsentMustDeny,
  consentAskCanReachUser,
} from "../../../utils/permissions/toolPermissionContext.js";
import {
  ownFirstPartyTypeInstance,
  filesCowritten,
  ownTypeInstance,
  filesFromType,
  noteNoticeRead,
  noticeReadDisclosed,
} from "./consentStamps.js";
import {
  getShareEntry,
  isSomeoneElses,
  ownedByUser,
  issuedUnderDepartedAccount,
  hasAutoReactNoticePending,
  clearAutoReactNoticePending,
} from "../../../services/artifacts/shareEntries.js";
import {
  PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS,
  sessionNetworkOff,
  outsideOrgYesStands,
  classFactsFor,
  noticeAskFloorDeny,
} from "../artifactAccessClasses.js";
import {
  hasClassPersonConsent,
  hasSharedReadConsentClasses,
  hasClassConsent,
  classifyArtifactConsent,
  CLASSIFIER_2,
} from "../../../services/artifacts/consentClasses.js";
import { isAttestedArtifact, getAttestationKind } from "../../../services/artifacts/attestation.js";
import { isDelegatedObservationContext } from "../../../utils/agentContext.js";
import { artifactViewerUrlFor } from "../artifactUrls.js";
import { WEBFETCH } from "../../WebFetchTool/prompt.js";

//@ chunk-k0wpq966.js:689-738 placement
function artifactFilesOnForSession() {
  return getLiveState().frozenMultiFile ?? isFrameMultiFileEnabled();
}
//@ chunk-k0wpq966.js:738-772 placement
function coworkConsentMustDeny(context) {
  return isCoworkFramePublishSession() && consentMustDeny(context);
}
//@ chunk-k0wpq966.js:772-1256 placement
function coworkSurfacelessSourceDeny() {
  return {
    behavior: "deny",
    message:
      "Reading a local file from outside this session's connected folders, or through a link, needs the approval card, and no one can answer it in this Cowork session. Use a plain file inside the connected folders; do not retry this file in this session.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "A local file that may sit outside the working folders requires a live human consent surface in a Cowork-frame session",
      classifierApprovable: false,
    },
  };
}
//@ chunk-k0wpq966.js:1256-1720 placement
function coworkSurfacelessUnreadableSourceDeny(unreadable, fieldName = "file_path") {
  return {
    behavior: "deny",
    message: `cannot read ${fieldName} (${unreadable}) \u2014 the file could not be examined, and no one can answer the approval card in this Cowork session. Check that the file exists as a plain file inside the connected folders, then retry with that path.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "A local file that could not be examined requires a live human consent surface in a Cowork-frame session",
      classifierApprovable: false,
    },
  };
}
//@ chunk-k0wpq966.js:1720-2153 placement
function artifactFilesConsentHeld(context, target, owned) {
  if (
    attestedReadConsented(context, target.slug) ||
    ownFirstPartyTypeInstance(getShareEntry(target.slug), owned)
  )
    return true;
  if (!(PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS && getToolPermissionContext(context).mode === "plan")) {
    let shareEntry = getShareEntry(target.slug);
    if (outsideOrgRead(shareEntry))
      return (
        hasClassPersonConsent("foreign_read", target.slug) ||
        hasSharedReadConsentClasses(
          artifactFilesConsentSlugs(context),
          "artifactAssetReadHumanConsentSlugs",
          target.slug,
        )
      );
    return (
      owned ||
      (isSomeoneElses(shareEntry) && sessionNetworkOff(target) === false) ||
      (othersReadIsUserOnly(owned, target)
        ? hasClassPersonConsent("foreign_read", target.slug)
        : hasClassConsent("foreign_read", target.slug))
    );
  }
  return hasSharedReadConsentClasses(
    artifactFilesConsentSlugs(context),
    getToolPermissionContext(context).mode === "plan" || othersReadIsUserOnly(owned, target)
      ? "artifactAssetReadHumanConsentSlugs"
      : "artifactAssetReadConsentSlugs",
    target.slug,
  );
}
//@ chunk-k0wpq966.js:2153-2315 placement
function copySourceConsented(context, target, surface, kind = "copy") {
  let shareEntry = getShareEntry(target.slug);
  if (kind === "copy" && otherOrgCopySource(shareEntry)) return outsideOrgYesStands(context, target.slug);
  let owned = ownedByUser(shareEntry);
  return (
    (owned &&
      (!filesCowritten(shareEntry) || ownTypeInstance(shareEntry)) &&
      !(surface === "files" && filesFromType(shareEntry))) ||
    artifactFilesConsentHeld(context, target, owned)
  );
}
//@ chunk-k0wpq966.js:2315-2356 placement
function attestedReadConsented(context, slug) {
  return needsAttestedConsent(getToolPermissionContext(context).mode, slug);
}
//@ chunk-k0wpq966.js:2356-2396 placement
/**
 * 判断是否需要证明式读取同意（plan 调用除外）。
 */
function needsAttestedConsent(mode, slug) {
  return mode !== "plan" && needsAttestedReadConsent(slug);
}
//@ chunk-k0wpq966.js:2396-2508 placement
function needsAttestedReadConsent(slug) {
  let shareEntry = getShareEntry(slug);
  return (
    isSomeoneElses(shareEntry) &&
    !outsideOrgRead(shareEntry) &&
    shareEntry?.lastProbeIssuedAt !== undefined &&
    !issuedUnderDepartedAccount(shareEntry.lastProbeIssuedAt) &&
    isAttestedArtifact(slug)
  );
}
//@ chunk-k0wpq966.js:2508-2551 placement
function attestedDataReadConsented(context, slug) {
  return attestedDataReadConsentedInMode(getToolPermissionContext(context).mode, slug);
}
//@ chunk-k0wpq966.js:2551-2595 placement
function attestedDataReadConsentedInMode(mode, slug) {
  return mode !== "plan" && attestedDataReadVouched(slug);
}
//@ chunk-k0wpq966.js:2595-2629 placement
function attestedDataReadVouched(slug) {
  return isOrgSharedEntry(slug) && needsAttestedReadConsent(slug);
}
//@ chunk-k0wpq966.js:2629-2709 placement
/**
 * 判断共享条目是否为组织可见。
 */
function isOrgSharedEntry(slug) {
  let shareEntry = getShareEntry(slug);
  return shareEntry !== undefined && shareEntry.probeFailed !== true && shareEntry.mode === "org";
}
//@ chunk-k0wpq966.js:2709-2887 placement
/**
 * 第一方类型探测失败且已消失
 */
function isGoneFirstPartyTypeProbe(context, slug) {
  let shareEntry = getShareEntry(slug);
  return (
    getToolPermissionContext(context).mode !== "plan" &&
    shareEntry?.probeFailed === true &&
    shareEntry.probeGone === true &&
    shareEntry.lastProbeIssuedAt !== undefined &&
    !issuedUnderDepartedAccount(shareEntry.lastProbeIssuedAt) &&
    getAttestationKind(slug) === "first_party_type"
  );
}
//@ chunk-k0wpq966.js:2887-3024 placement
function readRulingFor(target, context, isDataRead = false) {
  let facts = classFactsFor("read", target, context);
  return (
    isDataRead
      ? attestedDataReadConsented(context, target.slug)
      : attestedReadConsented(context, target.slug) || isGoneFirstPartyTypeProbe(context, target.slug)
  )
    ? {
        ask: false,
        foreignRead: true,
        attested: true,
      }
    : classifyArtifactConsent(facts);
}
//@ chunk-k0wpq966.js:3024-3201 placement
function copySourceRulingFor(target, context) {
  let shareEntry = getShareEntry(target.slug);
  let ruling = otherOrgCopySource(shareEntry)
    ? classifyArtifactConsent({
        ...classFactsFor("read", target, context),
        owned: false,
        outsideOrg: true,
      })
    : readRulingFor(target, context);
  return ruling.ask && ruling.about === "outside_org"
    ? {
        ...ruling,
        answeredBy: CLASSIFIER_2,
        informedOnly: true,
      }
    : ruling;
}
//@ chunk-k0wpq966.js:3201-3431 placement
function filesConsentRoute(context, target) {
  if (planConsentMustDeny(context) || coworkConsentMustDeny(context)) return () => "none";
  let userOnly = othersArtifactReadIsUserOnly(target) || outsideOrgReadIsUserOnly(target.slug);
  if (!consentAskCanReachUser(context))
    return (classifierApproved) => (userOnly && !classifierApproved ? "none" : "save");
  let toolPermissionContext = getToolPermissionContext(context);
  let isAuto = toolPermissionContext.mode === "auto";
  let avoidPrompts = toolPermissionContext.shouldAvoidPermissionPrompts === true;
  return (classifierApproved) =>
    isAuto && !(userOnly && !classifierApproved) ? "save" : avoidPrompts ? "none" : "ask";
}
//@ chunk-k0wpq966.js:3431-4232 placement
/**
 * artifact 读取的同意路径与通知通道判定。
 */
function artifactFetchNoticeLane(context, target, findRule) {
  if (!(hasAutoReactNoticePending(target.slug) && !isDelegatedObservationContext(context.agentContext))) {
    noteNoticeRead("webfetch", context, target.slug, false);
    return null;
  }
  let initialRule = findRule();
  let viewerUrl = artifactViewerUrlFor(target);
  return ({ forcedBy, personOnly }) => {
    let rule = forcedBy ?? initialRule;
    noteNoticeRead("webfetch", context, target.slug, true, rule !== null);
    let lead = `${personOnly?.lead ?? `Claude wants to fetch the artifact at ${viewerUrl}`} \u2014 prompted by the new-comments notification; its content enters this conversation`;
    if (rule === null) {
      let floorDenial = noticeAskFloorDeny(context, "Nothing was fetched", lead);
      if (floorDenial !== null) return floorDenial;
    }
    let message =
      rule === null
        ? lead
        : `${lead} \u2014 your ${rule.ruleValue.toolName} ask rule covers ${rule.ruleValue.toolName !== WEBFETCH && rule.ruleValue.ruleContent?.startsWith("url:") ? "this url" : "artifact reads"}`;
    return {
      behavior: "ask",
      message,
      decisionReason: {
        type: "safetyCheck",
        reason: message,
        classifierApprovable: rule === null && personOnly === undefined,
      },
      ...(rule !== null && {
        matchedAskRule: rule,
      }),
      suppressAlwaysAllowRule: true,
      localDisplayOnly: true,
    };
  };
}
//@ chunk-k0wpq966.js:4232-4313 placement
function artifactFetchConsumesNotice(context, target) {
  if (
    noticeReadDisclosed("webfetch", context, target.slug, false) &&
    !isDelegatedObservationContext(context.agentContext)
  )
    clearAutoReactNoticePending(target.slug);
}
export {
  attestedDataReadConsented,
  coworkConsentMustDeny,
  readRulingFor,
  coworkSurfacelessUnreadableSourceDeny,
  coworkSurfacelessSourceDeny,
  attestedDataReadVouched,
  attestedDataReadConsentedInMode,
  artifactFilesOnForSession,
  copySourceConsented,
  attestedReadConsented,
  artifactFilesConsentHeld,
  copySourceRulingFor,
  filesConsentRoute,
  artifactFetchConsumesNotice,
  artifactFetchNoticeLane,
};
