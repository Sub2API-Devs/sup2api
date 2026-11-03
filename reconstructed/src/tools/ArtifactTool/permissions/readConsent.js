/**
 * tools/ArtifactTool/permissions/readConsent.ts
 *
 * 2.1.316 新增。artifact 读取的同意路径与通知通道判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vm0jn40f.js (19)
 * attribution: placement 19
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

//@ chunk-vm0jn40f.js:688-737 placement
function artifactFilesOnForSession() {
  return getLiveState().frozenMultiFile ?? isFrameMultiFileEnabled();
}
//@ chunk-vm0jn40f.js:737-771 placement
function coworkConsentMustDeny(t) {
  return isCoworkFramePublishSession() && consentMustDeny(t);
}
//@ chunk-vm0jn40f.js:771-1255 placement
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
//@ chunk-vm0jn40f.js:1255-1719 placement
function coworkSurfacelessUnreadableSourceDeny(unreadable, e = "file_path") {
  return {
    behavior: "deny",
    message: `cannot read ${e} (${unreadable}) \u2014 the file could not be examined, and no one can answer the approval card in this Cowork session. Check that the file exists as a plain file inside the connected folders, then retry with that path.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "A local file that could not be examined requires a live human consent surface in a Cowork-frame session",
      classifierApprovable: false,
    },
  };
}
//@ chunk-vm0jn40f.js:1719-2152 placement
function artifactFilesConsentHeld(t, e, n) {
  if (attestedReadConsented(t, e.slug) || ownFirstPartyTypeInstance(getShareEntry(e.slug), n)) return true;
  if (!(PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS && getToolPermissionContext(t).mode === "plan")) {
    let shareEntry = getShareEntry(e.slug);
    if (outsideOrgRead(shareEntry))
      return (
        hasClassPersonConsent("foreign_read", e.slug) ||
        hasSharedReadConsentClasses(
          artifactFilesConsentSlugs(t),
          "artifactAssetReadHumanConsentSlugs",
          e.slug,
        )
      );
    return (
      n ||
      (isSomeoneElses(shareEntry) && sessionNetworkOff(e) === false) ||
      (othersReadIsUserOnly(n, e)
        ? hasClassPersonConsent("foreign_read", e.slug)
        : hasClassConsent("foreign_read", e.slug))
    );
  }
  return hasSharedReadConsentClasses(
    artifactFilesConsentSlugs(t),
    getToolPermissionContext(t).mode === "plan" || othersReadIsUserOnly(n, e)
      ? "artifactAssetReadHumanConsentSlugs"
      : "artifactAssetReadConsentSlugs",
    e.slug,
  );
}
//@ chunk-vm0jn40f.js:2152-2313 placement
function copySourceConsented(t, e, n, s = "copy") {
  let shareEntry = getShareEntry(e.slug);
  if (s === "copy" && otherOrgCopySource(shareEntry)) return outsideOrgYesStands(t, e.slug);
  let i = ownedByUser(shareEntry);
  return (
    (i &&
      (!filesCowritten(shareEntry) || ownTypeInstance(shareEntry)) &&
      !(n === "files" && filesFromType(shareEntry))) ||
    artifactFilesConsentHeld(t, e, i)
  );
}
//@ chunk-vm0jn40f.js:2313-2354 placement
function attestedReadConsented(t, slug) {
  return needsAttestedConsent(getToolPermissionContext(t).mode, slug);
}
//@ chunk-vm0jn40f.js:2354-2394 placement
/**
 * 判断是否需要证明式读取同意（plan 调用除外）。
 */
function needsAttestedConsent(mode, e) {
  return mode !== "plan" && needsAttestedReadConsent(e);
}
//@ chunk-vm0jn40f.js:2394-2506 placement
function needsAttestedReadConsent(t) {
  let shareEntry = getShareEntry(t);
  return (
    isSomeoneElses(shareEntry) &&
    !outsideOrgRead(shareEntry) &&
    shareEntry?.lastProbeIssuedAt !== undefined &&
    !issuedUnderDepartedAccount(shareEntry.lastProbeIssuedAt) &&
    isAttestedArtifact(t)
  );
}
//@ chunk-vm0jn40f.js:2506-2549 placement
function attestedDataReadConsented(t, slug) {
  return attestedDataReadConsentedInMode(getToolPermissionContext(t).mode, slug);
}
//@ chunk-vm0jn40f.js:2549-2593 placement
function attestedDataReadConsentedInMode(mode, e) {
  return mode !== "plan" && attestedDataReadVouched(e);
}
//@ chunk-vm0jn40f.js:2593-2627 placement
function attestedDataReadVouched(slug) {
  return isOrgSharedEntry(slug) && needsAttestedReadConsent(slug);
}
//@ chunk-vm0jn40f.js:2627-2707 placement
/**
 * 判断共享条目是否为组织可见。
 */
function isOrgSharedEntry(t) {
  let shareEntry = getShareEntry(t);
  return shareEntry !== undefined && shareEntry.probeFailed !== true && shareEntry.mode === "org";
}
//@ chunk-vm0jn40f.js:2707-2885 placement
/**
 * 第一方类型探测失败且已消失
 */
function isGoneFirstPartyTypeProbe(t, slug) {
  let shareEntry = getShareEntry(slug);
  return (
    getToolPermissionContext(t).mode !== "plan" &&
    shareEntry?.probeFailed === true &&
    shareEntry.probeGone === true &&
    shareEntry.lastProbeIssuedAt !== undefined &&
    !issuedUnderDepartedAccount(shareEntry.lastProbeIssuedAt) &&
    getAttestationKind(slug) === "first_party_type"
  );
}
//@ chunk-vm0jn40f.js:2885-3022 placement
function readRulingFor(t, e, n = false) {
  let s = classFactsFor("read", t, e);
  return (
    n
      ? attestedDataReadConsented(e, t.slug)
      : attestedReadConsented(e, t.slug) || isGoneFirstPartyTypeProbe(e, t.slug)
  )
    ? {
        ask: false,
        foreignRead: true,
        attested: true,
      }
    : classifyArtifactConsent(s);
}
//@ chunk-vm0jn40f.js:3022-3199 placement
function copySourceRulingFor(t, e) {
  let shareEntry = getShareEntry(t.slug);
  let s = otherOrgCopySource(shareEntry)
    ? classifyArtifactConsent({
        ...classFactsFor("read", t, e),
        owned: false,
        outsideOrg: true,
      })
    : readRulingFor(t, e);
  return s.ask && s.about === "outside_org"
    ? {
        ...s,
        answeredBy: CLASSIFIER_2,
        informedOnly: true,
      }
    : s;
}
//@ chunk-vm0jn40f.js:3199-3429 placement
function filesConsentRoute(t, e) {
  if (planConsentMustDeny(t) || coworkConsentMustDeny(t)) return () => "none";
  let n = othersArtifactReadIsUserOnly(e) || outsideOrgReadIsUserOnly(e.slug);
  if (!consentAskCanReachUser(t)) return (a) => (n && !a ? "none" : "save");
  let toolPermissionContext = getToolPermissionContext(t);
  let o = toolPermissionContext.mode === "auto";
  let i = toolPermissionContext.shouldAvoidPermissionPrompts === true;
  return (a) => (o && !(n && !a) ? "save" : i ? "none" : "ask");
}
//@ chunk-vm0jn40f.js:3429-4230 placement
/**
 * artifact 读取的同意路径与通知通道判定。
 */
function artifactFetchNoticeLane(t, e, n) {
  if (!(hasAutoReactNoticePending(e.slug) && !isDelegatedObservationContext(t.agentContext))) {
    noteNoticeRead("webfetch", t, e.slug, false);
    return null;
  }
  let o = n();
  let i = artifactViewerUrlFor(e);
  return ({ forcedBy, personOnly }) => {
    let r = forcedBy ?? o;
    noteNoticeRead("webfetch", t, e.slug, true, r !== null);
    let l = `${personOnly?.lead ?? `Claude wants to fetch the artifact at ${i}`} \u2014 prompted by the new-comments notification; its content enters this conversation`;
    if (r === null) {
      let c = noticeAskFloorDeny(t, "Nothing was fetched", l);
      if (c !== null) return c;
    }
    let d =
      r === null
        ? l
        : `${l} \u2014 your ${r.ruleValue.toolName} ask rule covers ${r.ruleValue.toolName !== WEBFETCH && r.ruleValue.ruleContent?.startsWith("url:") ? "this url" : "artifact reads"}`;
    return {
      behavior: "ask",
      message: d,
      decisionReason: {
        type: "safetyCheck",
        reason: d,
        classifierApprovable: r === null && personOnly === undefined,
      },
      ...(r !== null && {
        matchedAskRule: r,
      }),
      suppressAlwaysAllowRule: true,
      localDisplayOnly: true,
    };
  };
}
//@ chunk-vm0jn40f.js:4230-4311 placement
function artifactFetchConsumesNotice(t, e) {
  if (noticeReadDisclosed("webfetch", t, e.slug, false) && !isDelegatedObservationContext(t.agentContext))
    clearAutoReactNoticePending(e.slug);
}
export {
  attestedDataReadConsented,
  coworkConsentMustDeny,
  readRulingFor,
  coworkSurfacelessUnreadableSourceDeny,
  coworkSurfacelessSourceDeny,
  attestedDataReadVouched,
  attestedDataReadConsentedInMode,
  copySourceConsented,
  attestedReadConsented,
  artifactFilesOnForSession,
  filesConsentRoute,
  artifactFilesConsentHeld,
  copySourceRulingFor,
};
