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
  z5t,
  Hte,
  b3,
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
      classifierApprovable: !1,
    },
  };
}
//@ chunk-vm0jn40f.js:1255-1719 placement
function coworkSurfacelessUnreadableSourceDeny(t, e = "file_path") {
  return {
    behavior: "deny",
    message: `cannot read ${e} (${t}) \u2014 the file could not be examined, and no one can answer the approval card in this Cowork session. Check that the file exists as a plain file inside the connected folders, then retry with that path.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "A local file that could not be examined requires a live human consent surface in a Cowork-frame session",
      classifierApprovable: !1,
    },
  };
}
//@ chunk-vm0jn40f.js:1719-2152 placement
function artifactFilesConsentHeld(t, e, n) {
  if (attestedReadConsented(t, e.slug) || ownFirstPartyTypeInstance(getShareEntry(e.slug), n)) return !0;
  if (!(PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS && getToolPermissionContext(t).mode === "plan")) {
    let o = getShareEntry(e.slug);
    if (outsideOrgRead(o))
      return (
        z5t("foreign_read", e.slug) ||
        Hte(artifactFilesConsentSlugs(t), "artifactAssetReadHumanConsentSlugs", e.slug)
      );
    return (
      n ||
      (isSomeoneElses(o) && sessionNetworkOff(e) === !1) ||
      (othersReadIsUserOnly(n, e) ? z5t("foreign_read", e.slug) : b3("foreign_read", e.slug))
    );
  }
  return Hte(
    artifactFilesConsentSlugs(t),
    getToolPermissionContext(t).mode === "plan" || othersReadIsUserOnly(n, e)
      ? "artifactAssetReadHumanConsentSlugs"
      : "artifactAssetReadConsentSlugs",
    e.slug,
  );
}
//@ chunk-vm0jn40f.js:2152-2313 placement
function copySourceConsented(t, e, n, s = "copy") {
  let o = getShareEntry(e.slug);
  if (s === "copy" && otherOrgCopySource(o)) return outsideOrgYesStands(t, e.slug);
  let i = ownedByUser(o);
  return (
    (i && (!filesCowritten(o) || ownTypeInstance(o)) && !(n === "files" && filesFromType(o))) ||
    artifactFilesConsentHeld(t, e, i)
  );
}
//@ chunk-vm0jn40f.js:2313-2354 placement
function attestedReadConsented(t, e) {
  return g(getToolPermissionContext(t).mode, e);
}
//@ chunk-vm0jn40f.js:2354-2394 placement
function g(t, e) {
  return t !== "plan" && needsAttestedReadConsent(e);
}
//@ chunk-vm0jn40f.js:2394-2506 placement
function needsAttestedReadConsent(t) {
  let e = getShareEntry(t);
  return (
    isSomeoneElses(e) &&
    !outsideOrgRead(e) &&
    e?.lastProbeIssuedAt !== void 0 &&
    !issuedUnderDepartedAccount(e.lastProbeIssuedAt) &&
    isAttestedArtifact(t)
  );
}
//@ chunk-vm0jn40f.js:2506-2549 placement
function attestedDataReadConsented(t, e) {
  return attestedDataReadConsentedInMode(getToolPermissionContext(t).mode, e);
}
//@ chunk-vm0jn40f.js:2549-2593 placement
function attestedDataReadConsentedInMode(t, e) {
  return t !== "plan" && attestedDataReadVouched(e);
}
//@ chunk-vm0jn40f.js:2593-2627 placement
function attestedDataReadVouched(t) {
  return p(t) && needsAttestedReadConsent(t);
}
//@ chunk-vm0jn40f.js:2627-2707 placement
function p(t) {
  let e = getShareEntry(t);
  return e !== void 0 && e.probeFailed !== !0 && e.mode === "org";
}
/**
 * 第一方类型探测失败且已消失
 */
//@ chunk-vm0jn40f.js:2707-2885 placement
function isGoneFirstPartyTypeProbe(t, e) {
  let n = getShareEntry(e);
  return (
    getToolPermissionContext(t).mode !== "plan" &&
    n?.probeFailed === !0 &&
    n.probeGone === !0 &&
    n.lastProbeIssuedAt !== void 0 &&
    !issuedUnderDepartedAccount(n.lastProbeIssuedAt) &&
    getAttestationKind(e) === "first_party_type"
  );
}
//@ chunk-vm0jn40f.js:2885-3022 placement
function readRulingFor(t, e, n = !1) {
  let s = classFactsFor("read", t, e);
  return (
    n
      ? attestedDataReadConsented(e, t.slug)
      : attestedReadConsented(e, t.slug) || isGoneFirstPartyTypeProbe(e, t.slug)
  )
    ? { ask: !1, foreignRead: !0, attested: !0 }
    : classifyArtifactConsent(s);
}
//@ chunk-vm0jn40f.js:3022-3199 placement
function copySourceRulingFor(t, e) {
  let n = getShareEntry(t.slug),
    s = otherOrgCopySource(n)
      ? classifyArtifactConsent({ ...classFactsFor("read", t, e), owned: !1, outsideOrg: !0 })
      : readRulingFor(t, e);
  return s.ask && s.about === "outside_org" ? { ...s, answeredBy: CLASSIFIER_2, informedOnly: !0 } : s;
}
//@ chunk-vm0jn40f.js:3199-3429 placement
function filesConsentRoute(t, e) {
  if (planConsentMustDeny(t) || coworkConsentMustDeny(t)) return () => "none";
  let n = othersArtifactReadIsUserOnly(e) || outsideOrgReadIsUserOnly(e.slug);
  if (!consentAskCanReachUser(t)) return (a) => (n && !a ? "none" : "save");
  let s = getToolPermissionContext(t),
    o = s.mode === "auto",
    i = s.shouldAvoidPermissionPrompts === !0;
  return (a) => (o && !(n && !a) ? "save" : i ? "none" : "ask");
}
/**
 * artifact 读取的同意路径与通知通道判定。
 */
//@ chunk-vm0jn40f.js:3429-4230 placement
function artifactFetchNoticeLane(t, e, n) {
  if (!(hasAutoReactNoticePending(e.slug) && !isDelegatedObservationContext(t.agentContext)))
    return (noteNoticeRead("webfetch", t, e.slug, !1), null);
  let o = n(),
    i = artifactViewerUrlFor(e);
  return ({ forcedBy: forcedBy, personOnly: personOnly }) => {
    let r = forcedBy ?? o;
    noteNoticeRead("webfetch", t, e.slug, !0, r !== null);
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
        classifierApprovable: r === null && personOnly === void 0,
      },
      ...(r !== null && { matchedAskRule: r }),
      suppressAlwaysAllowRule: !0,
      localDisplayOnly: !0,
    };
  };
}
//@ chunk-vm0jn40f.js:4230-4311 placement
function artifactFetchConsumesNotice(t, e) {
  if (noticeReadDisclosed("webfetch", t, e.slug, !1) && !isDelegatedObservationContext(t.agentContext))
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
