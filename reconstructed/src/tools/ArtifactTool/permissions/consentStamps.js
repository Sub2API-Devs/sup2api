/**
 * tools/ArtifactTool/permissions/consentStamps.ts
 *
 * 2.1.316 新增。预热 artifact 类型能力；本模块记录各类 artifact 同意（读写数据库、资源、外部组织等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v8nq54bj.js (77)
 * attribution: placement 77
 */
import { arraysEqual } from "../../../utils/collections.js";
import { parseArtifactUrl, ARTIFACT_SLUG_RE } from "../constants.js";
import { getLiveState } from "../../../services/liveReplica/liveReplica.js";
import { describeArtifactType } from "../../../services/artifacts/artifactTypes.js";
import {
  issuedUnderDepartedAccount,
  ownedByUser,
  getShareEntry,
  typeSlugOf,
  entryOutsideOrgContent,
  storedGrantObserved,
  settleOtherCommentPending,
  entryAudience,
} from "../../../services/artifacts/shareEntries.js";
import { isDelegatedObservationContext } from "../../../utils/agentContext.js";
import {
  consentAskCanReachUser,
  getToolPermissionContext,
  consentMustDeny,
} from "../../../utils/permissions/toolPermissionContext.js";
import { $it, ALL_CONSENT_KEYS } from "../../../services/artifacts/consentClasses.js";
import { isAutoClassifierActive } from "../../../utils/permissions/autoModeState.js";
import { Sqn } from "../../../state/artifactReadState.js";
import { LIVE_DOC } from "../../../services/artifacts/textSanitize.js";
import { getAttestationKind } from "../../../services/artifacts/attestation.js";
import { isNonEmptyObject, sanitizeDisplayText } from "../../../services/artifacts/capabilityDeclaration.js";
import { antEnv, env } from "../../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { logEvent } from "../../../services/analytics/index.js";
import {
  othersArtifactReadIsUserOnly,
  outsideOrgReadIsUserOnly,
} from "../../../services/artifacts/artifactToolGates.js";
import {
  foldedForSurface,
  spacedFromClosingQuote,
  withEdgeBlanksMarked,
  markedForBracketFold,
} from "../artifactUrls.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, o, U, M, Ue, T } from "../../../../vendor/zod/v4/classic/schemas.js";
import { COMMENT_TARGET_KEY } from "../../../services/artifacts/comments/commentConsent.js";
import { derivePublishContextFrom } from "../../../services/artifacts/readObservation.js";
import { B9, cGs } from "../../../services/artifacts/comments/repliesConsent.js";
import { isHumanTurn_2 } from "../../../utils/messagePredicates.js";
import { isInterruptionOnlyMessage } from "../../../utils/messages.js";

//@ chunk-v8nq54bj.js:967-1045 placement
function b(e, t) {
  return typeof e === "string" || typeof t === "string" ? e === t : arraysEqual(e, t);
}
//@ chunk-v8nq54bj.js:1045-1054 placement
var E = 64;
//@ chunk-v8nq54bj.js:1054-1128 placement
function I(e) {
  let url = e.url;
  return typeof url === "string" ? (parseArtifactUrl(url) ?? void 0) : void 0;
}
/**
 * 预热 artifact 类型能力；本模块记录各类 artifact 同意（读写数据库、资源、外部组织等）。
 */
//@ chunk-v8nq54bj.js:1128-1703 placement
async function warmTypeCapabilities(e, t) {
  let typeCapabilityReads = getLiveState().typeCapabilityReads,
    r = typeCapabilityReads.get(e);
  if (r !== void 0 && (!t.toolUseId || r.toolUseId === t.toolUseId)) return r.capabilities;
  let now = Date.now(),
    d = await describeArtifactType(e, { signal: t.abortController.signal, credentials: t.credentials }),
    c = d.err === null ? d.detail : null,
    l = c === null || c.declaration === "malformed" ? null : c.capabilities,
    _ = l !== null && (c?.declaration === void 0 || Object.keys(c.declaration).length === l.length);
  if (issuedUnderDepartedAccount(now)) return null;
  if (!typeCapabilityReads.has(e) && typeCapabilityReads.size >= E) {
    let m = typeCapabilityReads.keys().next().value;
    if (m !== void 0) typeCapabilityReads.delete(m);
  }
  return (typeCapabilityReads.set(e, { toolUseId: t.toolUseId, capabilities: l, whole: _ }), l);
}
//@ chunk-v8nq54bj.js:1703-1770 placement
function typeReadWhole(e) {
  return getLiveState().typeCapabilityReads.get(e)?.whole === !0;
}
//@ chunk-v8nq54bj.js:1770-1862 placement
function typeReadDeclaresRoom(e) {
  return getLiveState().typeCapabilityReads.get(e)?.capabilities?.includes("room") === !0;
}
//@ chunk-v8nq54bj.js:1862-2010 placement
function stampArtifactWatchConsent(e, t) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (consentAskReachedUser(e, t))
    t.setAppState((n) =>
      withCurrentConsentEpoch(n, t, (r) =>
        r.artifactWatchApproved ? r : { ...r, artifactWatchApproved: !0 },
      ),
    );
}
//@ chunk-v8nq54bj.js:2010-2295 placement
var READ_OP_COPY = {
  get: { pages: !1, cursor: "", none: "" },
  list: {
    pages: !0,
    cursor: "page with a smaller `query.limit`",
    none: "a smaller read is the only way to see them",
  },
  query: { pages: !0, cursor: "page with a smaller `query.limit`", none: "narrow with a `query.where`" },
  replayed: { pages: !1, cursor: "", none: "" },
};
//@ chunk-v8nq54bj.js:2295-2358 placement
function consentAskReachedUser(e, t) {
  return Reflect.get(e, CONSENT_ASK_TAG) === !0 && consentAskCanReachUser(t) && !consentCheckScopeStale(t);
}
//@ chunk-v8nq54bj.js:2358-2587 placement
function noteConsentCheckScope(e) {
  if (e.toolUseId === void 0) return;
  let t = getLiveState(),
    { consentCheckScopes: consentCheckScopes } = t;
  if ((consentCheckScopes.delete(e.toolUseId), consentCheckScopes.size >= k)) {
    let r = consentCheckScopes.keys().next().value;
    if (r !== void 0) (consentCheckScopes.delete(r), (t.consentCheckScopesEvicted = !0));
  }
  consentCheckScopes.set(e.toolUseId, $it());
}
//@ chunk-v8nq54bj.js:2587-2597 placement
var k = 256;
//@ chunk-v8nq54bj.js:2597-2753 placement
function consentCheckScopeStale(e) {
  if (e.toolUseId === void 0) return !1;
  let t = getLiveState(),
    n = t.consentCheckScopes.get(e.toolUseId);
  return n === void 0 ? t.consentCheckScopesEvicted : n !== $it();
}
//@ chunk-v8nq54bj.js:2753-2799 placement
function firstWatchAskReachesHuman(e) {
  return consentAskCanReachUser(e) && !isAutoClassifierActive(getToolPermissionContext(e).mode);
}
//@ chunk-v8nq54bj.js:2799-2864 placement
function consentWasHumanEarned(e, t) {
  return (
    ((e[PLAN_CONSENT_ASK_TAG] ?? !1) && getToolPermissionContext(t).mode === "plan") ||
    consentAskWasUserOnly(e)
  );
}
//@ chunk-v8nq54bj.js:2864-2910 placement
function consentAskWasUserOnly(e) {
  return Reflect.get(e, USER_ONLY_CONSENT_ASK_TAG) === !0;
}
/**
 * 账号变化时重置同意字段
 */
//@ chunk-v8nq54bj.js:2910-3107 placement
function withCurrentConsentEpoch(e, t, n) {
  if (consentCheckScopeStale(t)) return e;
  let { accountEpoch: accountEpoch } = getLiveState();
  if ((e.artifactConsentEpoch ?? 0) === accountEpoch) return n(e);
  return n({
    ...e,
    ...Object.fromEntries(ALL_CONSENT_KEYS.map((s) => [s, Sqn[s]])),
    artifactConsentEpoch: accountEpoch,
  });
}
//@ chunk-v8nq54bj.js:3107-3241 placement
function withPlanPublishConsent(e, t, n, r) {
  return withCurrentConsentEpoch(e, t, (s) => ({
    ...s,
    artifactPlanPublishConsentPaths: { ...s.artifactPlanPublishConsentPaths, [n]: { slug: r } },
  }));
}
/**
 * 按需更新同意字段
 */
//@ chunk-v8nq54bj.js:3241-3421 placement
function stampConsentFields(e, t, n, r, s = () => !0) {
  return withCurrentConsentEpoch(e, t, (d) => {
    if (n.every((l) => x(d[l]?.[r], s(d[l]?.[r])))) return d;
    let c = { ...d };
    for (let l of n) c[l] = { ...c[l], [r]: s(d[l]?.[r]) };
    return { ...d, ...c };
  });
}
//@ chunk-v8nq54bj.js:3421-3512 placement
function x(e, t) {
  return e === void 0 || e === !0 || e === "script" || t === !0 || t === "script" ? e === t : b(e, t);
}
//@ chunk-v8nq54bj.js:3512-3603 placement
function A(e, t) {
  return t ? [`${e}ConsentSlugs`, `${e}HumanConsentSlugs`] : [`${e}ConsentSlugs`];
}
//@ chunk-v8nq54bj.js:3603-3740 placement
function stampArtifactDbReadConsent(e, t, n) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (!consentAskReachedUser(e, t) || ownedByUser(getShareEntry(n))) return;
  t.setAppState((r) => stampConsentFields(r, t, A("artifactDbRead", consentWasHumanEarned(e, t)), n));
}
//@ chunk-v8nq54bj.js:3740-4025 placement
function stampArtifactDbWriteConsent(e, t) {
  if (isDelegatedObservationContext(t.agentContext) || getLiveState().routineSourceWriteRefused) return;
  if (!consentAskReachedUser(e, t)) return;
  let n = consentWasHumanEarned(e, t);
  t.setAppState((r) =>
    withCurrentConsentEpoch(r, t, (s) =>
      s.artifactDbWriteApproved && (!n || s.artifactDbWriteHumanApproved)
        ? s
        : { ...s, artifactDbWriteApproved: !0, ...(n && { artifactDbWriteHumanApproved: !0 }) },
    ),
  );
}
//@ chunk-v8nq54bj.js:4025-4087 placement
function filesCowritten(e) {
  return e?.cowritten === !0 || e?.artifactKind === LIVE_DOC;
}
//@ chunk-v8nq54bj.js:4087-4147 placement
function filesFromType(e) {
  return e?.typeLocked === !0 || e?.typeLock != null;
}
//@ chunk-v8nq54bj.js:4147-4208 placement
function ownTypeInstance(e, t = ownedByUser(e)) {
  return t && filesFromType(e) && e?.artifactKind !== LIVE_DOC;
}
//@ chunk-v8nq54bj.js:4208-4299 placement
function ownFirstPartyTypeInstance(e, t = ownedByUser(e)) {
  let n = typeSlugOf(e);
  return ownTypeInstance(e, t) && n !== void 0 && getAttestationKind(n) === "first_party_type";
}
//@ chunk-v8nq54bj.js:4299-4449 placement
function inheritsFirstPartyTypeDeclaration(e) {
  return (
    e !== void 0 &&
    e.typeLock != null &&
    ownFirstPartyTypeInstance(e) &&
    !entryOutsideOrgContent(e) &&
    e.capabilitiesUnknown !== !0 &&
    e.capsReadNotFound !== !0 &&
    storedGrantObserved(e) &&
    isNonEmptyObject(e.capabilities)
  );
}
//@ chunk-v8nq54bj.js:4449-4722 placement
function isInheritedTypeGrantEnabled() {
  let e = getLiveState();
  if (e.inheritedTypeGrantLatch === null)
    ((e.inheritedTypeGrantLatch =
      antEnv.CLAUDE_CODE_ARTIFACT_INHERITED_TYPE_GRANT ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_swirling_squid", !1) === !0),
      logEvent("tengu_artifact_inherited_type_grant", { on: e.inheritedTypeGrantLatch }));
  return e.inheritedTypeGrantLatch;
}
//@ chunk-v8nq54bj.js:4722-5117 placement
function stampArtifactAssetReadConsent(e, t, n, r = !1) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  let s = getShareEntry(n),
    d = Reflect.get(e, ASSET_TARGET_PIN_TAG),
    c = (S) => typeof d === "object" && d !== null && Reflect.get(d, S) === !0,
    l = c("classifier") || (getToolPermissionContext(t).mode === "auto" && !c("userOnly"));
  if (!P(e, t) || c("once") || l || (ownedByUser(s) && !filesCowritten(s) && !filesFromType(s))) return;
  let _ = j(e, t) || (r && repliesAskAnsweredByHuman(t)),
    m = r && !repliesAskAnsweredByOther(t);
  t.setAppState((S) =>
    stampConsentFields(
      S,
      t,
      [...A("artifactAssetRead", _), ...(m ? ["artifactOutsideOrgConsentSlugs"] : [])],
      n,
    ),
  );
}
//@ chunk-v8nq54bj.js:5117-5261 placement
function stampArtifactOutsideOrgConsent(e, t) {
  if (t.length === 0 || isDelegatedObservationContext(e.agentContext)) return;
  e.setAppState((n) =>
    t.reduce((r, s) => stampConsentFields(r, e, ["artifactOutsideOrgConsentSlugs"], s), n),
  );
}
//@ chunk-v8nq54bj.js:5261-5446 placement
function stampArtifactSharedReadConsent(e, t, n) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (
    !P(e, t) ||
    repliesAskAnsweredByOther(t) ||
    (getToolPermissionContext(t).mode === "auto" &&
      !othersArtifactReadIsUserOnly(I(e)) &&
      !outsideOrgReadIsUserOnly(n)) ||
    ownedByUser(getShareEntry(n))
  )
    return;
  t.setAppState((r) => stampConsentFields(r, t, ["artifactReadConsentSlugs"], n));
}
//@ chunk-v8nq54bj.js:5446-5609 placement
function stampArtifactAssetUploadConsent(e, t, n, r) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (!consentAskReachedUser(e, t) || getToolPermissionContext(t).mode === "auto") return;
  (settleOtherCommentPending(n, r),
    t.setAppState((s) => stampConsentFields(s, t, A("artifactAssetUpload", consentWasHumanEarned(e, t)), n)));
}
//@ chunk-v8nq54bj.js:5609-5671 placement
function roomJoinDecidedByClassifier(e, t) {
  return Reflect.get(e, ROOM_CONSENT_DISCLOSED_TAG) === "auto" && !repliesAskAnsweredByHuman(t);
}
//@ chunk-v8nq54bj.js:5671-5739 placement
function classifierRoomConsentStands(e, t) {
  return e === "auto" && !getLiveState().roomStoppedByUser.has(t);
}
//@ chunk-v8nq54bj.js:5739-5826 placement
function R(e) {
  let queryTracking = e.queryTracking;
  return queryTracking === void 0 ? void 0 : `${queryTracking.chainId}:${queryTracking.depth}`;
}
//@ chunk-v8nq54bj.js:5826-5926 placement
function noteRoomArmAsk(e, t, n) {
  let { roomArmAsked: roomArmAsked } = getLiveState();
  if (n === void 0) roomArmAsked.delete(t);
  else roomArmAsked.set(t, { ...n, at: R(e) });
}
//@ chunk-v8nq54bj.js:5926-6074 placement
function roomArmAskBookedFor(e, t) {
  for (let [n, r] of getLiveState().roomArmAsked) {
    if (n === t) continue;
    if (e.keys.includes(r.key) || (e.slug !== void 0 && r.slug === e.slug)) return !0;
  }
  return !1;
}
//@ chunk-v8nq54bj.js:6074-6132 placement
function takeRoomArmAsk(e) {
  if (e !== void 0) getLiveState().roomArmAsked.delete(e);
}
//@ chunk-v8nq54bj.js:6132-6149 placement
var NEW_PAGE_ARM_REFUSED_KEY = "path:*";
//@ chunk-v8nq54bj.js:6149-6539 placement
function settleRoomArmAsks(e) {
  let t = getLiveState(),
    n = R(e);
  for (let [r, s] of t.roomArmAsked) {
    if (r === e.toolUseId) continue;
    let d = findToolResultMessage(e.messages, r);
    if (d === void 0 && s.at !== void 0 && s.at === n) continue;
    t.roomArmAsked.delete(r);
    let c = d?.toolDenialKind;
    if (d === void 0 || c === "user-rejected" || c === "permission-rule") {
      if (
        (t.roomArmRefusedByUser.add(s.key),
        t.roomArmRefusedByUser.add(NEW_PAGE_ARM_REFUSED_KEY),
        s.slug !== void 0)
      )
        t.roomStoppedByUser.add(s.slug);
    }
  }
}
/**
 * 找含指定 tool_use_id 结果的用户消息
 */
//@ chunk-v8nq54bj.js:6539-6739 placement
function findToolResultMessage(e, t) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (
      r?.type === "user" &&
      Array.isArray(r.message.content) &&
      r.message.content.some((s) => s.type === "tool_result" && s.tool_use_id === t)
    )
      return r;
  }
  return;
}
//@ chunk-v8nq54bj.js:6739-7121 placement
function stampArtifactRoomJoinConsent(e, t, n) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  let r = Reflect.get(e, ROOM_CONSENT_DISCLOSED_TAG);
  if ((r !== !0 && r !== "auto") || consentMustDeny(t)) return;
  let s = roomJoinDecidedByClassifier(e, t) ? "classifier" : !0;
  if (s === "classifier" && !classifierRoomConsentStands(getToolPermissionContext(t).mode, n)) return;
  t.setAppState((d) =>
    withCurrentConsentEpoch(d, t, (c) =>
      c.artifactRoomJoinConsentSlugs?.[n] === s || c.artifactRoomJoinConsentSlugs?.[n] === !0
        ? c
        : { ...c, artifactRoomJoinConsentSlugs: { ...c.artifactRoomJoinConsentSlugs, [n]: s } },
    ),
  );
}
//@ chunk-v8nq54bj.js:7121-7360 placement
function commentFieldsFrom(e) {
  let t = "thread_id" in e && typeof e.thread_id === "string" ? e.thread_id : void 0,
    n = "text" in e && typeof e.text === "string" ? e.text : void 0,
    r = "cursor" in e && typeof e.cursor === "string" ? e.cursor : void 0;
  return { threadId: t, replyText: n, cursor: r };
}
//@ chunk-v8nq54bj.js:7360-7682 placement
function commentThreadConsentFields(e, t) {
  let n = t !== void 0 && ARTIFACT_SLUG_RE.test(t) ? t : "(invalid)",
    r = "viewers of this artifact (share status could not be confirmed)";
  if (e !== null) {
    let s = getShareEntry(e.slug);
    if (s !== void 0 && s.probeFailed !== !0)
      r =
        s.mode === "owner"
          ? "viewers of this artifact (not currently shared)"
          : `${entryAudience(s)} (the artifact is shared)`;
  }
  return { tid: n, audience: r };
}
//@ chunk-v8nq54bj.js:7682-7825 placement
function assetFieldsFrom(e) {
  let t = (n) => {
    let r = e[n];
    return typeof r === "string" ? r : void 0;
  };
  return { assetId: t("asset_id"), outDir: t("out_dir"), after: t("after") };
}
//@ chunk-v8nq54bj.js:7825-7874 placement
function foldForDecisionSurface(e, t = 1024) {
  return foldedForSurface(sanitizeDisplayText(e, { max: t }));
}
//@ chunk-v8nq54bj.js:7874-7923 placement
function quoteForDecisionSurface(e, t = 1024) {
  return `"${spacedFromClosingQuote(foldForDecisionSurface(e, t))}"`;
}
//@ chunk-v8nq54bj.js:7923-7973 placement
function quotePathForDecisionSurface(e) {
  return `"${spacedFromClosingQuote(withEdgeBlanksMarked(foldForDecisionSurface(markedForBracketFold(e))))}"`;
}
//@ chunk-v8nq54bj.js:7973-8137 placement = capitalize (0.796)
function withConsentCoverage(e, t) {
  let replaced = e.trimEnd().replace(/\.$/, "");
  if (replaced === "") {
    let replaced = t.replace(/^[\s;,\u2014-]+/, "");
    return replaced.charAt(0).toUpperCase() + replaced.slice(1);
  }
  return `${replaced}${t}`;
}
//@ chunk-v8nq54bj.js:8137-8333 placement
function askStrength(e) {
  if (e.behavior !== "ask") return -1;
  let decisionReason = e.decisionReason;
  switch (decisionReason?.type) {
    case "rule":
      return 4;
    case "safetyCheck":
      return decisionReason.classifierApprovable ? 1 : 3;
    case "mode":
      return 2;
    default:
      return 0;
  }
}
//@ chunk-v8nq54bj.js:8333-8511 placement
var CONSENT_ASK_TAG = "__artifactConsentAskCanReachUser",
  WATCH_ARMS_REPLIES_TAG = "__artifactWatchWouldArmReplies",
  PLAN_CONSENT_ASK_TAG = "__artifactPlanConsentAsk",
  USER_ONLY_CONSENT_ASK_TAG = "__artifactUserOnlyConsentAsk",
  VERIFY_PIN_TAG = "__artifactVerifyTargetPinned";
//@ chunk-v8nq54bj.js:8511-8598 placement
function resolveVerifyTarget(e) {
  return typeof e.url === "string" ? parseArtifactUrl(e.url) : (getLiveState().verify.lastPublish ?? null);
}
//@ chunk-v8nq54bj.js:8598-8957 placement
var PUBLISH_TARGET_TAG = "__artifactPublishTarget",
  ROUTINE_UNASKED_FIRST_PUBLISH_TAG = "__artifactRoutineUnaskedFirstPublish",
  PUBLISH_SOURCE_PIN_TAG = "__artifactPublishSourcePin",
  h = DoctorLazy(() =>
    u({
      path: o(),
      kind: U(["file", "absent", "network"]),
      redirected: M(),
      sha256: o().optional(),
      root: u({ spelling: o(), base: o(), redirected: M().optional() }).optional(),
      copies: o().optional(),
      minted: o().optional(),
      type: Ue([o(), T(!1)]),
      shim: M().optional(),
    }),
  );
//@ chunk-v8nq54bj.js:8957-9071 placement
function readPublishSourcePinTag(e) {
  let t = Reflect.get(e, PUBLISH_SOURCE_PIN_TAG);
  if (t === void 0) return;
  let safeParse = h().safeParse(t);
  return safeParse.success ? safeParse.data : null;
}
//@ chunk-v8nq54bj.js:9071-9104 placement
var N = DoctorLazy(() => h().omit({ type: !0 }));
//@ chunk-v8nq54bj.js:9104-9330 placement
function unreadPublishSourcePinReason(e) {
  let t = Reflect.get(e, PUBLISH_SOURCE_PIN_TAG);
  if (t === void 0) return "source_pin_missing";
  return typeof t === "object" && t !== null && Reflect.get(t, "type") === void 0 && N().safeParse(t).success
    ? "source_pin_stale_build"
    : "source_pin_unreadable";
}
//@ chunk-v8nq54bj.js:9330-9690 placement
var ROOM_CONSENT_DISCLOSED_TAG = "__artifactRoomJoinDisclosed",
  TYPE_CREATE_PIN_TAG = "__artifactTypeCreatePin",
  ASSET_UPLOAD_PIN_TAG = "__artifactAssetUploadPin",
  ROOM_SEND_TARGET_TAG = "__artifactRoomSendTarget",
  ASSET_TARGET_PIN_TAG = "__artifactAssetTargetPin",
  READ_TARGET_PIN_TAG = "__artifactReadTargetPin",
  ARTIFACT_DELETE_PIN_TAG = "__artifactDeletePin",
  ARTIFACT_DELETE_DISPLAY_TAG = "__artifactDeleteTarget",
  ARTIFACT_DISPLAY_TARGET_TAG = "__artifactDisplayTarget",
  w = "__artifactEndpointBodyFile",
  f = "__artifactConsentPin",
  SYNC_TARGET_PIN_TAG = "__artifactSyncTargetPin";
//@ chunk-v8nq54bj.js:9690-9756 placement
function consentPin(e, t) {
  return { [f]: t === null ? null : { action: e, slug: t.slug } };
}
//@ chunk-v8nq54bj.js:9756-9792 placement
var y = [
  PUBLISH_TARGET_TAG,
  ASSET_UPLOAD_PIN_TAG,
  ROOM_SEND_TARGET_TAG,
  ASSET_TARGET_PIN_TAG,
  READ_TARGET_PIN_TAG,
  ARTIFACT_DELETE_PIN_TAG,
  f,
  SYNC_TARGET_PIN_TAG,
];
//@ chunk-v8nq54bj.js:9792-9862 placement
function carriesForeignPin(e, t) {
  return y.some((n) => n !== t && Reflect.get(e, n) !== void 0);
}
//@ chunk-v8nq54bj.js:9862-9924 placement
function carriesAnyDecisionPin(e) {
  return y.some((t) => Reflect.get(e, t) !== void 0);
}
//@ chunk-v8nq54bj.js:9924-10060 placement
function consentPinMatches(e, t, n) {
  let r = Reflect.get(e, f);
  return (
    typeof r === "object" && r !== null && Reflect.get(r, "action") === t && Reflect.get(r, "slug") === n
  );
}
//@ chunk-v8nq54bj.js:10060-10134 placement
function consentTargetChanged(e, t, n) {
  return carriesForeignPin(e, f) || (Reflect.get(e, f) !== void 0 && !consentPinMatches(e, t, n));
}
//@ chunk-v8nq54bj.js:10134-10349 placement
var DB_READ_TARGET_PIN_TAG = "__artifactDbReadTargetPin",
  DB_WRITE_SOURCE_PIN_TAG = "__artifactDbWriteSourcePin",
  O = "__artifactHandlersPin",
  G = "__artifactLiveDocStandIn",
  ARTIFACT_ASK_TAG = "__artifactAsk",
  L = [
    CONSENT_ASK_TAG,
    G,
    PLAN_CONSENT_ASK_TAG,
    USER_ONLY_CONSENT_ASK_TAG,
    WATCH_ARMS_REPLIES_TAG,
    ...y,
    ROOM_CONSENT_DISCLOSED_TAG,
    TYPE_CREATE_PIN_TAG,
    VERIFY_PIN_TAG,
    PUBLISH_SOURCE_PIN_TAG,
    DB_READ_TARGET_PIN_TAG,
    DB_WRITE_SOURCE_PIN_TAG,
    O,
    ARTIFACT_DELETE_DISPLAY_TAG,
    ARTIFACT_DISPLAY_TARGET_TAG,
    w,
    COMMENT_TARGET_KEY,
    ARTIFACT_ASK_TAG,
    ROUTINE_UNASKED_FIRST_PUBLISH_TAG,
  ];
//@ chunk-v8nq54bj.js:10349-10442 placement
function carriesCheckMintedMarker(e) {
  return typeof e === "object" && e !== null && L.some((t) => Reflect.get(e, t) !== void 0);
}
//@ chunk-v8nq54bj.js:10442-10564 placement
function noteNoticeRead(e, t, n, r, s = !1) {
  if (t.toolUseId !== void 0)
    getLiveState().shareStatus.noticeReadSights[e].note(
      t.toolUseId,
      n,
      r && (s || consentAskCanReachUser(t)),
    );
}
//@ chunk-v8nq54bj.js:10564-10638 placement
function noticeReadSight(e, t, n) {
  return getLiveState().shareStatus.noticeReadSights[e].take(t, n);
}
//@ chunk-v8nq54bj.js:10638-10716 placement
function noticeReadDisclosed(e, t, n, r) {
  return t.toolUseId === void 0 ? r : noticeReadSight(e, t.toolUseId, n) === !0;
}
//@ chunk-v8nq54bj.js:10716-10811 placement
function planPublishConsentEarned(e, t) {
  if (isDelegatedObservationContext(t.agentContext)) return !1;
  return (
    (e[PLAN_CONSENT_ASK_TAG] ?? !1) &&
    getToolPermissionContext(t).mode === "plan" &&
    consentAskCanReachUser(t)
  );
}
//@ chunk-v8nq54bj.js:10811-10952 placement
function derivePublishContext(e) {
  return derivePublishContextFrom({
    agentId: e.agentId,
    agentType: e.agentContext?.agentType,
    isNonInteractiveSession: e.options.isNonInteractiveSession,
  });
}
//@ chunk-v8nq54bj.js:10952-11031 placement
function canRearmWatchHere(e) {
  return Boolean(env.CLAUDE_CODE_REMOTE) || B9(derivePublishContext(e).publishContext);
}
//@ chunk-v8nq54bj.js:11031-11178 placement
function repliesAskAnsweredByHuman(e) {
  if (e.toolUseId === void 0) return !1;
  let t = e.toolDecisions?.get(e.toolUseId)?.source;
  return t === "user_temporary" || t === "user_permanent";
}
//@ chunk-v8nq54bj.js:11178-11366 placement
function repliesAskAnsweredByOther(e) {
  if (e.toolUseId === void 0) return !1;
  let t = e.toolDecisions?.get(e.toolUseId);
  return (
    t !== void 0 && t.decision !== "reject" && t.source !== "user_temporary" && t.source !== "user_permanent"
  );
}
//@ chunk-v8nq54bj.js:11366-11405 placement
function P(e, t) {
  return consentAskReachedUser(e, t) && !consentMustDeny(t);
}
//@ chunk-v8nq54bj.js:11405-11446 placement
function j(e, t) {
  return consentWasHumanEarned(e, t) && !repliesAskAnsweredByOther(t);
}
//@ chunk-v8nq54bj.js:11446-11508 placement
function repliesConsentWriterFor(e) {
  return canRearmWatchHere(e) && !isDelegatedObservationContext(e.agentContext) ? cGs : void 0;
}
//@ chunk-v8nq54bj.js:11508-11545 placement
function isNonAbortHumanTurn(e) {
  return isHumanTurn_2(e) && !isInterruptionOnlyMessage(e);
}

export {
  ownTypeInstance,
  consentTargetChanged,
  DB_WRITE_SOURCE_PIN_TAG,
  consentPinMatches,
  stampArtifactDbWriteConsent,
  quoteForDecisionSurface,
  stampArtifactDbReadConsent,
  DB_READ_TARGET_PIN_TAG,
  askStrength,
  noteNoticeRead,
  CONSENT_ASK_TAG,
  PLAN_CONSENT_ASK_TAG,
  consentPin,
  ARTIFACT_DISPLAY_TARGET_TAG,
  USER_ONLY_CONSENT_ASK_TAG,
  withConsentCoverage,
  quotePathForDecisionSurface,
  noticeReadDisclosed,
  READ_OP_COPY,
  isInheritedTypeGrantEnabled,
  ASSET_TARGET_PIN_TAG,
  noticeReadSight,
  commentFieldsFrom,
  commentThreadConsentFields,
  carriesAnyDecisionPin,
  filesCowritten,
  carriesForeignPin,
  stampArtifactAssetUploadConsent,
  stampArtifactAssetReadConsent,
  derivePublishContext,
  foldForDecisionSurface,
  ROOM_SEND_TARGET_TAG,
  repliesAskAnsweredByOther,
  canRearmWatchHere,
  repliesConsentWriterFor,
  WATCH_ARMS_REPLIES_TAG,
  firstWatchAskReachesHuman,
  consentAskReachedUser,
  repliesAskAnsweredByHuman,
  stampArtifactWatchConsent,
  ASSET_UPLOAD_PIN_TAG,
  resolveVerifyTarget,
  warmTypeCapabilities,
  typeReadWhole,
  typeReadDeclaresRoom,
  NEW_PAGE_ARM_REFUSED_KEY,
  roomArmAskBookedFor,
  noteRoomArmAsk,
  classifierRoomConsentStands,
  ROOM_CONSENT_DISCLOSED_TAG,
  ARTIFACT_DELETE_PIN_TAG,
  carriesCheckMintedMarker,
  noteConsentCheckScope,
  VERIFY_PIN_TAG,
  READ_TARGET_PIN_TAG,
  filesFromType,
  ownFirstPartyTypeInstance,
  assetFieldsFrom,
  ARTIFACT_DELETE_DISPLAY_TAG,
  ROUTINE_UNASKED_FIRST_PUBLISH_TAG,
  PUBLISH_TARGET_TAG,
  TYPE_CREATE_PIN_TAG,
  settleRoomArmAsks,
  PUBLISH_SOURCE_PIN_TAG,
  inheritsFirstPartyTypeDeclaration,
  takeRoomArmAsk,
  consentCheckScopeStale,
  SYNC_TARGET_PIN_TAG,
  isNonAbortHumanTurn,
  stampArtifactSharedReadConsent,
  consentAskWasUserOnly,
  readPublishSourcePinTag,
  unreadPublishSourcePinReason,
  stampArtifactOutsideOrgConsent,
  planPublishConsentEarned,
  withPlanPublishConsent,
  roomJoinDecidedByClassifier,
  stampArtifactRoomJoinConsent,
  ARTIFACT_ASK_TAG,
  consentWasHumanEarned,
};
