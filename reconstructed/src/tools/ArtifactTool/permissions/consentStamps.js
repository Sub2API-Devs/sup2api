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
import { consentEpochKey, ALL_CONSENT_KEYS } from "../../../services/artifacts/consentClasses.js";
import { isAutoClassifierActive } from "../../../utils/permissions/autoModeState.js";
import { INITIAL_SLICE_STATE } from "../../../state/artifactReadState.js";
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
import { u, string, _enum, M, union, literal } from "../../../../vendor/zod/v4/classic/schemas.js";
import { COMMENT_TARGET_KEY } from "../../../services/artifacts/comments/commentConsent.js";
import { derivePublishContextFrom } from "../../../services/artifacts/readObservation.js";
import {
  isConsentUiKind,
  REPLIES_CONSENT_WRITER,
} from "../../../services/artifacts/comments/repliesConsent.js";
import { isHumanTurn_2 } from "../../../utils/messagePredicates.js";
import { isInterruptionOnlyMessage } from "../../../utils/messages.js";

//@ chunk-v8nq54bj.js:967-1045 placement
/**
 * 比较两个作用域值（字符串直接比，数组逐项比）。
 */
function scopesEqual(e, t) {
  return typeof e === "string" || typeof t === "string" ? e === t : arraysEqual(e, t);
}
//@ chunk-v8nq54bj.js:1045-1054 placement
var MAX_TYPE_CAPABILITY_READS = 64;
//@ chunk-v8nq54bj.js:1054-1128 placement
/**
 * 从输入里解析 artifact URL，非法返回 undefined。
 */
function artifactUrlOf(e) {
  let url = e.url;
  return typeof url === "string" ? (parseArtifactUrl(url) ?? undefined) : undefined;
}
//@ chunk-v8nq54bj.js:1128-1703 placement
/**
 * 预热 artifact 类型能力；本模块记录各类 artifact 同意（读写数据库、资源、外部组织等）。
 */
async function warmTypeCapabilities(e, t) {
  let typeCapabilityReads = getLiveState().typeCapabilityReads;
  let r = typeCapabilityReads.get(e);
  if (r !== undefined && (!t.toolUseId || r.toolUseId === t.toolUseId)) return r.capabilities;
  let now = Date.now();
  let d = await describeArtifactType(e, {
    signal: t.abortController.signal,
    credentials: t.credentials,
  });
  let detail = d.err === null ? d.detail : null;
  let capabilities = detail === null || detail.declaration === "malformed" ? null : detail.capabilities;
  let whole =
    capabilities !== null &&
    (detail?.declaration === undefined || Object.keys(detail.declaration).length === capabilities.length);
  if (issuedUnderDepartedAccount(now)) return null;
  if (!typeCapabilityReads.has(e) && typeCapabilityReads.size >= MAX_TYPE_CAPABILITY_READS) {
    let m = typeCapabilityReads.keys().next().value;
    if (m !== undefined) typeCapabilityReads.delete(m);
  }
  typeCapabilityReads.set(e, {
    toolUseId: t.toolUseId,
    capabilities,
    whole,
  });
  return capabilities;
}
//@ chunk-v8nq54bj.js:1703-1770 placement
function typeReadWhole(e) {
  return getLiveState().typeCapabilityReads.get(e)?.whole === true;
}
//@ chunk-v8nq54bj.js:1770-1862 placement
function typeReadDeclaresRoom(slug) {
  return getLiveState().typeCapabilityReads.get(slug)?.capabilities?.includes("room") === true;
}
//@ chunk-v8nq54bj.js:1862-2010 placement
function stampArtifactWatchConsent(e, t) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (consentAskReachedUser(e, t))
    t.setAppState((n) =>
      withCurrentConsentEpoch(n, t, (r) =>
        r.artifactWatchApproved
          ? r
          : {
              ...r,
              artifactWatchApproved: true,
            },
      ),
    );
}
//@ chunk-v8nq54bj.js:2010-2295 placement
var READ_OP_COPY = {
  get: {
    pages: false,
    cursor: "",
    none: "",
  },
  list: {
    pages: true,
    cursor: "page with a smaller `query.limit`",
    none: "a smaller read is the only way to see them",
  },
  query: {
    pages: true,
    cursor: "page with a smaller `query.limit`",
    none: "narrow with a `query.where`",
  },
  replayed: {
    pages: false,
    cursor: "",
    none: "",
  },
};
//@ chunk-v8nq54bj.js:2295-2358 placement
function consentAskReachedUser(e, t) {
  return Reflect.get(e, CONSENT_ASK_TAG) === true && consentAskCanReachUser(t) && !consentCheckScopeStale(t);
}
//@ chunk-v8nq54bj.js:2358-2587 placement
function noteConsentCheckScope(e) {
  if (e.toolUseId === undefined) return;
  let liveState = getLiveState();
  let { consentCheckScopes } = liveState;
  consentCheckScopes.delete(e.toolUseId);
  if (consentCheckScopes.size >= MAX_CONSENT_CHECK_SCOPES) {
    let r = consentCheckScopes.keys().next().value;
    if (r !== undefined) {
      consentCheckScopes.delete(r);
      liveState.consentCheckScopesEvicted = true;
    }
  }
  consentCheckScopes.set(e.toolUseId, consentEpochKey());
}
//@ chunk-v8nq54bj.js:2587-2597 placement
var MAX_CONSENT_CHECK_SCOPES = 256;
//@ chunk-v8nq54bj.js:2597-2753 placement
function consentCheckScopeStale(e) {
  if (e.toolUseId === undefined) return false;
  let liveState = getLiveState();
  let n = liveState.consentCheckScopes.get(e.toolUseId);
  return n === undefined ? liveState.consentCheckScopesEvicted : n !== consentEpochKey();
}
//@ chunk-v8nq54bj.js:2753-2799 placement
function firstWatchAskReachesHuman(e) {
  return consentAskCanReachUser(e) && !isAutoClassifierActive(getToolPermissionContext(e).mode);
}
//@ chunk-v8nq54bj.js:2799-2864 placement
function consentWasHumanEarned(e, t) {
  return (
    ((e[PLAN_CONSENT_ASK_TAG] ?? false) && getToolPermissionContext(t).mode === "plan") ||
    consentAskWasUserOnly(e)
  );
}
//@ chunk-v8nq54bj.js:2864-2910 placement
function consentAskWasUserOnly(e) {
  return Reflect.get(e, USER_ONLY_CONSENT_ASK_TAG) === true;
}
//@ chunk-v8nq54bj.js:2910-3107 placement
/**
 * 账号变化时重置同意字段
 */
function withCurrentConsentEpoch(e, t, n) {
  if (consentCheckScopeStale(t)) return e;
  let { accountEpoch } = getLiveState();
  if ((e.artifactConsentEpoch ?? 0) === accountEpoch) return n(e);
  return n({
    ...e,
    ...Object.fromEntries(ALL_CONSENT_KEYS.map((s) => [s, INITIAL_SLICE_STATE[s]])),
    artifactConsentEpoch: accountEpoch,
  });
}
//@ chunk-v8nq54bj.js:3107-3241 placement
function withPlanPublishConsent(e, t, n, slug) {
  return withCurrentConsentEpoch(e, t, (s) => ({
    ...s,
    artifactPlanPublishConsentPaths: {
      ...s.artifactPlanPublishConsentPaths,
      [n]: {
        slug,
      },
    },
  }));
}
//@ chunk-v8nq54bj.js:3241-3421 placement
/**
 * 按需更新同意字段
 */
function stampConsentFields(e, t, n, r, s = () => true) {
  return withCurrentConsentEpoch(e, t, (d) => {
    if (n.every((l) => consentValueMatches(d[l]?.[r], s(d[l]?.[r])))) return d;
    let c = {
      ...d,
    };
    for (let l of n)
      c[l] = {
        ...c[l],
        [r]: s(d[l]?.[r]),
      };
    return {
      ...d,
      ...c,
    };
  });
}
//@ chunk-v8nq54bj.js:3421-3512 placement
/**
 * 比较同意值：真值与 script 特判，其余逐项比较。
 */
function consentValueMatches(e, t) {
  return e === undefined || e === true || e === "script" || t === true || t === "script"
    ? e === t
    : scopesEqual(e, t);
}
//@ chunk-v8nq54bj.js:3512-3603 placement
/**
 * 拼出同意记录的字段名（需要人类同意时再加一项）。
 */
function consentFieldNames(e, t) {
  return t ? [`${e}ConsentSlugs`, `${e}HumanConsentSlugs`] : [`${e}ConsentSlugs`];
}
//@ chunk-v8nq54bj.js:3603-3740 placement
function stampArtifactDbReadConsent(e, t, slug) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (!consentAskReachedUser(e, t) || ownedByUser(getShareEntry(slug))) return;
  t.setAppState((r) =>
    stampConsentFields(r, t, consentFieldNames("artifactDbRead", consentWasHumanEarned(e, t)), slug),
  );
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
        : {
            ...s,
            artifactDbWriteApproved: true,
            ...(n && {
              artifactDbWriteHumanApproved: true,
            }),
          },
    ),
  );
}
//@ chunk-v8nq54bj.js:4025-4087 placement
function filesCowritten(e) {
  return e?.cowritten === true || e?.artifactKind === LIVE_DOC;
}
//@ chunk-v8nq54bj.js:4087-4147 placement
function filesFromType(e) {
  return e?.typeLocked === true || e?.typeLock != null;
}
//@ chunk-v8nq54bj.js:4147-4208 placement
function ownTypeInstance(e, t = ownedByUser(e)) {
  return t && filesFromType(e) && e?.artifactKind !== LIVE_DOC;
}
//@ chunk-v8nq54bj.js:4208-4299 placement
function ownFirstPartyTypeInstance(shareEntry, t = ownedByUser(shareEntry)) {
  let n = typeSlugOf(shareEntry);
  return ownTypeInstance(shareEntry, t) && n !== undefined && getAttestationKind(n) === "first_party_type";
}
//@ chunk-v8nq54bj.js:4299-4449 placement
function inheritsFirstPartyTypeDeclaration(e) {
  return (
    e !== undefined &&
    e.typeLock != null &&
    ownFirstPartyTypeInstance(e) &&
    !entryOutsideOrgContent(e) &&
    e.capabilitiesUnknown !== true &&
    e.capsReadNotFound !== true &&
    storedGrantObserved(e) &&
    isNonEmptyObject(e.capabilities)
  );
}
//@ chunk-v8nq54bj.js:4449-4722 placement
function isInheritedTypeGrantEnabled() {
  let liveState = getLiveState();
  if (liveState.inheritedTypeGrantLatch === null) {
    liveState.inheritedTypeGrantLatch =
      antEnv.CLAUDE_CODE_ARTIFACT_INHERITED_TYPE_GRANT ??
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_swirling_squid", false) === true;
    logEvent("tengu_artifact_inherited_type_grant", {
      on: liveState.inheritedTypeGrantLatch,
    });
  }
  return liveState.inheritedTypeGrantLatch;
}
//@ chunk-v8nq54bj.js:4722-5117 placement
function stampArtifactAssetReadConsent(e, t, slug, r = false) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  let shareEntry = getShareEntry(slug);
  let d = Reflect.get(e, ASSET_TARGET_PIN_TAG);
  let c = (S) => typeof d === "object" && d !== null && Reflect.get(d, S) === true;
  let l = c("classifier") || (getToolPermissionContext(t).mode === "auto" && !c("userOnly"));
  if (
    !reachedUserWithoutDeny(e, t) ||
    c("once") ||
    l ||
    (ownedByUser(shareEntry) && !filesCowritten(shareEntry) && !filesFromType(shareEntry))
  )
    return;
  let _ = humanEarnedWithoutReply(e, t) || (r && repliesAskAnsweredByHuman(t));
  let m = r && !repliesAskAnsweredByOther(t);
  t.setAppState((S) =>
    stampConsentFields(
      S,
      t,
      [...consentFieldNames("artifactAssetRead", _), ...(m ? ["artifactOutsideOrgConsentSlugs"] : [])],
      slug,
    ),
  );
}
//@ chunk-v8nq54bj.js:5117-5261 placement
function stampArtifactOutsideOrgConsent(e, t) {
  if (t.length === 0 || isDelegatedObservationContext(e.agentContext)) return;
  e.setAppState((n) =>
    t.reduce((acc, s) => stampConsentFields(acc, e, ["artifactOutsideOrgConsentSlugs"], s), n),
  );
}
//@ chunk-v8nq54bj.js:5261-5446 placement
function stampArtifactSharedReadConsent(e, t, slug) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (
    !reachedUserWithoutDeny(e, t) ||
    repliesAskAnsweredByOther(t) ||
    (getToolPermissionContext(t).mode === "auto" &&
      !othersArtifactReadIsUserOnly(artifactUrlOf(e)) &&
      !outsideOrgReadIsUserOnly(slug)) ||
    ownedByUser(getShareEntry(slug))
  )
    return;
  t.setAppState((r) => stampConsentFields(r, t, ["artifactReadConsentSlugs"], slug));
}
//@ chunk-v8nq54bj.js:5446-5609 placement
function stampArtifactAssetUploadConsent(e, t, slug, r) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  if (!consentAskReachedUser(e, t) || getToolPermissionContext(t).mode === "auto") return;
  settleOtherCommentPending(slug, r);
  t.setAppState((s) =>
    stampConsentFields(s, t, consentFieldNames("artifactAssetUpload", consentWasHumanEarned(e, t)), slug),
  );
}
//@ chunk-v8nq54bj.js:5609-5671 placement
function roomJoinDecidedByClassifier(e, t) {
  return Reflect.get(e, ROOM_CONSENT_DISCLOSED_TAG) === "auto" && !repliesAskAnsweredByHuman(t);
}
//@ chunk-v8nq54bj.js:5671-5739 placement
function classifierRoomConsentStands(mode, t) {
  return mode === "auto" && !getLiveState().roomStoppedByUser.has(t);
}
//@ chunk-v8nq54bj.js:5739-5826 placement
/**
 * 由查询追踪拼出 chainId:depth 键。
 */
function queryKeyOf(e) {
  let queryTracking = e.queryTracking;
  return queryTracking === undefined ? undefined : `${queryTracking.chainId}:${queryTracking.depth}`;
}
//@ chunk-v8nq54bj.js:5826-5926 placement
function noteRoomArmAsk(context, keyedCheckId, n) {
  let { roomArmAsked } = getLiveState();
  if (n === undefined) roomArmAsked.delete(keyedCheckId);
  else
    roomArmAsked.set(keyedCheckId, {
      ...n,
      at: queryKeyOf(context),
    });
}
//@ chunk-v8nq54bj.js:5926-6074 placement
function roomArmAskBookedFor(e, keyedCheckId) {
  for (let [n, r] of getLiveState().roomArmAsked) {
    if (n === keyedCheckId) continue;
    if (e.keys.includes(r.key) || (e.slug !== undefined && r.slug === e.slug)) return true;
  }
  return false;
}
//@ chunk-v8nq54bj.js:6074-6132 placement
function takeRoomArmAsk(toolUseId) {
  if (toolUseId !== undefined) getLiveState().roomArmAsked.delete(toolUseId);
}
//@ chunk-v8nq54bj.js:6132-6149 placement
var NEW_PAGE_ARM_REFUSED_KEY = "path:*";
//@ chunk-v8nq54bj.js:6149-6539 placement
function settleRoomArmAsks(e) {
  let liveState = getLiveState();
  let keyOf = queryKeyOf(e);
  for (let [r, s] of liveState.roomArmAsked) {
    if (r === e.toolUseId) continue;
    let toolResultMessage = findToolResultMessage(e.messages, r);
    if (toolResultMessage === undefined && s.at !== undefined && s.at === keyOf) continue;
    liveState.roomArmAsked.delete(r);
    let toolDenialKind = toolResultMessage?.toolDenialKind;
    if (
      toolResultMessage === undefined ||
      toolDenialKind === "user-rejected" ||
      toolDenialKind === "permission-rule"
    ) {
      liveState.roomArmRefusedByUser.add(s.key);
      liveState.roomArmRefusedByUser.add(NEW_PAGE_ARM_REFUSED_KEY);
      if (s.slug !== undefined) liveState.roomStoppedByUser.add(s.slug);
    }
  }
}
//@ chunk-v8nq54bj.js:6539-6739 placement
/**
 * 找含指定 tool_use_id 结果的用户消息
 */
function findToolResultMessage(messages, t) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let r = messages[idx];
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
function stampArtifactRoomJoinConsent(e, t, slug) {
  if (isDelegatedObservationContext(t.agentContext)) return;
  let r = Reflect.get(e, ROOM_CONSENT_DISCLOSED_TAG);
  if ((r !== true && r !== "auto") || consentMustDeny(t)) return;
  let s = roomJoinDecidedByClassifier(e, t) ? "classifier" : true;
  if (s === "classifier" && !classifierRoomConsentStands(getToolPermissionContext(t).mode, slug)) return;
  t.setAppState((d) =>
    withCurrentConsentEpoch(d, t, (c) =>
      c.artifactRoomJoinConsentSlugs?.[slug] === s || c.artifactRoomJoinConsentSlugs?.[slug] === true
        ? c
        : {
            ...c,
            artifactRoomJoinConsentSlugs: {
              ...c.artifactRoomJoinConsentSlugs,
              [slug]: s,
            },
          },
    ),
  );
}
//@ chunk-v8nq54bj.js:7121-7360 placement
function commentFieldsFrom(e) {
  let threadId = "thread_id" in e && typeof e.thread_id === "string" ? e.thread_id : undefined;
  let replyText = "text" in e && typeof e.text === "string" ? e.text : undefined;
  let cursor = "cursor" in e && typeof e.cursor === "string" ? e.cursor : undefined;
  return {
    threadId,
    replyText,
    cursor,
  };
}
//@ chunk-v8nq54bj.js:7360-7682 placement
function commentThreadConsentFields(e, threadId) {
  let tid = threadId !== undefined && ARTIFACT_SLUG_RE.test(threadId) ? threadId : "(invalid)";
  let audience = "viewers of this artifact (share status could not be confirmed)";
  if (e !== null) {
    let shareEntry = getShareEntry(e.slug);
    if (shareEntry !== undefined && shareEntry.probeFailed !== true)
      audience =
        shareEntry.mode === "owner"
          ? "viewers of this artifact (not currently shared)"
          : `${entryAudience(shareEntry)} (the artifact is shared)`;
  }
  return {
    tid,
    audience,
  };
}
//@ chunk-v8nq54bj.js:7682-7825 placement
function assetFieldsFrom(e) {
  let t = (n) => {
    let r = e[n];
    return typeof r === "string" ? r : undefined;
  };
  return {
    assetId: t("asset_id"),
    outDir: t("out_dir"),
    after: t("after"),
  };
}
//@ chunk-v8nq54bj.js:7825-7874 placement
function foldForDecisionSurface(e, max = 1024) {
  return foldedForSurface(
    sanitizeDisplayText(e, {
      max,
    }),
  );
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
function withConsentCoverage(reason, t) {
  let replaced = reason.trimEnd().replace(/\.$/, "");
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
var CONSENT_ASK_TAG = "__artifactConsentAskCanReachUser";
var WATCH_ARMS_REPLIES_TAG = "__artifactWatchWouldArmReplies";
var PLAN_CONSENT_ASK_TAG = "__artifactPlanConsentAsk";
var USER_ONLY_CONSENT_ASK_TAG = "__artifactUserOnlyConsentAsk";
var VERIFY_PIN_TAG = "__artifactVerifyTargetPinned";
//@ chunk-v8nq54bj.js:8511-8598 placement
function resolveVerifyTarget(e) {
  return typeof e.url === "string" ? parseArtifactUrl(e.url) : (getLiveState().verify.lastPublish ?? null);
}
//@ chunk-v8nq54bj.js:8598-8957 placement
/**
 * 发布来源 pin 的校验 schema。
 */
var PUBLISH_TARGET_TAG = "__artifactPublishTarget";
var ROUTINE_UNASKED_FIRST_PUBLISH_TAG = "__artifactRoutineUnaskedFirstPublish";
var PUBLISH_SOURCE_PIN_TAG = "__artifactPublishSourcePin";
var publishSourcePinSchema = DoctorLazy(() =>
  u({
    path: string(),
    kind: _enum(["file", "absent", "network"]),
    redirected: M(),
    sha256: string().optional(),
    root: u({
      spelling: string(),
      base: string(),
      redirected: M().optional(),
    }).optional(),
    copies: string().optional(),
    minted: string().optional(),
    type: union([string(), literal(false)]),
    shim: M().optional(),
  }),
);
//@ chunk-v8nq54bj.js:8957-9071 placement
function readPublishSourcePinTag(e) {
  let t = Reflect.get(e, PUBLISH_SOURCE_PIN_TAG);
  if (t === undefined) return;
  let n = publishSourcePinSchema().safeParse(t);
  return n.success ? n.data : null;
}
//@ chunk-v8nq54bj.js:9071-9104 placement
/**
 * 去掉 type 字段的发布来源 pin schema。
 */
var publishSourcePinWithoutTypeSchema = DoctorLazy(() =>
  publishSourcePinSchema().omit({
    type: true,
  }),
);
//@ chunk-v8nq54bj.js:9104-9330 placement
function unreadPublishSourcePinReason(e) {
  let t = Reflect.get(e, PUBLISH_SOURCE_PIN_TAG);
  if (t === undefined) return "source_pin_missing";
  return typeof t === "object" &&
    t !== null &&
    Reflect.get(t, "type") === undefined &&
    publishSourcePinWithoutTypeSchema().safeParse(t).success
    ? "source_pin_stale_build"
    : "source_pin_unreadable";
}
//@ chunk-v8nq54bj.js:9330-9690 placement
/**
 * 各类同意/目标/pin 的隐藏标记名（发布目标、资产、评论、删除、同步等）。
 */
var ROOM_CONSENT_DISCLOSED_TAG = "__artifactRoomJoinDisclosed";
var TYPE_CREATE_PIN_TAG = "__artifactTypeCreatePin";
var ASSET_UPLOAD_PIN_TAG = "__artifactAssetUploadPin";
var ROOM_SEND_TARGET_TAG = "__artifactRoomSendTarget";
var ASSET_TARGET_PIN_TAG = "__artifactAssetTargetPin";
var READ_TARGET_PIN_TAG = "__artifactReadTargetPin";
var ARTIFACT_DELETE_PIN_TAG = "__artifactDeletePin";
var ARTIFACT_DELETE_DISPLAY_TAG = "__artifactDeleteTarget";
var ARTIFACT_DISPLAY_TARGET_TAG = "__artifactDisplayTarget";
var ENDPOINT_BODY_FILE_TAG = "__artifactEndpointBodyFile";
var CONSENT_PIN_TAG = "__artifactConsentPin";
var SYNC_TARGET_PIN_TAG = "__artifactSyncTargetPin";
//@ chunk-v8nq54bj.js:9690-9756 placement
function consentPin(action, t) {
  return {
    [CONSENT_PIN_TAG]:
      t === null
        ? null
        : {
            action,
            slug: t.slug,
          },
  };
}
//@ chunk-v8nq54bj.js:9756-9792 placement
/**
 * 记录各类目标 pin 的标记列表。
 */
var TARGET_PIN_TAGS = [
  PUBLISH_TARGET_TAG,
  ASSET_UPLOAD_PIN_TAG,
  ROOM_SEND_TARGET_TAG,
  ASSET_TARGET_PIN_TAG,
  READ_TARGET_PIN_TAG,
  ARTIFACT_DELETE_PIN_TAG,
  CONSENT_PIN_TAG,
  SYNC_TARGET_PIN_TAG,
];
//@ chunk-v8nq54bj.js:9792-9862 placement
function carriesForeignPin(e, t) {
  return TARGET_PIN_TAGS.some((n) => n !== t && Reflect.get(e, n) !== undefined);
}
//@ chunk-v8nq54bj.js:9862-9924 placement
function carriesAnyDecisionPin(e) {
  return TARGET_PIN_TAGS.some((t) => Reflect.get(e, t) !== undefined);
}
//@ chunk-v8nq54bj.js:9924-10060 placement
function consentPinMatches(e, t, slug) {
  let r = Reflect.get(e, CONSENT_PIN_TAG);
  return (
    typeof r === "object" && r !== null && Reflect.get(r, "action") === t && Reflect.get(r, "slug") === slug
  );
}
//@ chunk-v8nq54bj.js:10060-10134 placement
function consentTargetChanged(e, t, slug) {
  return (
    carriesForeignPin(e, CONSENT_PIN_TAG) ||
    (Reflect.get(e, CONSENT_PIN_TAG) !== undefined && !consentPinMatches(e, t, slug))
  );
}
//@ chunk-v8nq54bj.js:10134-10349 placement
/**
 * 其余同意与 pin 标记（handlers、实时文档替身、db 读写来源等）与全部标记汇总。
 */
var DB_READ_TARGET_PIN_TAG = "__artifactDbReadTargetPin";
var DB_WRITE_SOURCE_PIN_TAG = "__artifactDbWriteSourcePin";
var HANDLERS_PIN_TAG = "__artifactHandlersPin";
var LIVE_DOC_STAND_IN_TAG = "__artifactLiveDocStandIn";
var ARTIFACT_ASK_TAG = "__artifactAsk";
var CONSENT_MARKER_TAGS = [
  CONSENT_ASK_TAG,
  LIVE_DOC_STAND_IN_TAG,
  PLAN_CONSENT_ASK_TAG,
  USER_ONLY_CONSENT_ASK_TAG,
  WATCH_ARMS_REPLIES_TAG,
  ...TARGET_PIN_TAGS,
  ROOM_CONSENT_DISCLOSED_TAG,
  TYPE_CREATE_PIN_TAG,
  VERIFY_PIN_TAG,
  PUBLISH_SOURCE_PIN_TAG,
  DB_READ_TARGET_PIN_TAG,
  DB_WRITE_SOURCE_PIN_TAG,
  HANDLERS_PIN_TAG,
  ARTIFACT_DELETE_DISPLAY_TAG,
  ARTIFACT_DISPLAY_TARGET_TAG,
  ENDPOINT_BODY_FILE_TAG,
  COMMENT_TARGET_KEY,
  ARTIFACT_ASK_TAG,
  ROUTINE_UNASKED_FIRST_PUBLISH_TAG,
];
//@ chunk-v8nq54bj.js:10349-10442 placement
function carriesCheckMintedMarker(e) {
  return (
    typeof e === "object" && e !== null && CONSENT_MARKER_TAGS.some((t) => Reflect.get(e, t) !== undefined)
  );
}
//@ chunk-v8nq54bj.js:10442-10564 placement
function noteNoticeRead(e, t, slug, r, s = false) {
  if (t.toolUseId !== undefined)
    getLiveState().shareStatus.noticeReadSights[e].note(
      t.toolUseId,
      slug,
      r && (s || consentAskCanReachUser(t)),
    );
}
//@ chunk-v8nq54bj.js:10564-10638 placement
function noticeReadSight(e, toolUseId, n) {
  return getLiveState().shareStatus.noticeReadSights[e].take(toolUseId, n);
}
//@ chunk-v8nq54bj.js:10638-10716 placement
function noticeReadDisclosed(e, t, slug, r) {
  return t.toolUseId === undefined ? r : noticeReadSight(e, t.toolUseId, slug) === true;
}
//@ chunk-v8nq54bj.js:10716-10811 placement
function planPublishConsentEarned(e, t) {
  if (isDelegatedObservationContext(t.agentContext)) return false;
  return (
    (e[PLAN_CONSENT_ASK_TAG] ?? false) &&
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
  return Boolean(env.CLAUDE_CODE_REMOTE) || isConsentUiKind(derivePublishContext(e).publishContext);
}
//@ chunk-v8nq54bj.js:11031-11178 placement
function repliesAskAnsweredByHuman(e) {
  if (e.toolUseId === undefined) return false;
  let source = e.toolDecisions?.get(e.toolUseId)?.source;
  return source === "user_temporary" || source === "user_permanent";
}
//@ chunk-v8nq54bj.js:11178-11366 placement
function repliesAskAnsweredByOther(e) {
  if (e.toolUseId === undefined) return false;
  let t = e.toolDecisions?.get(e.toolUseId);
  return (
    t !== undefined &&
    t.decision !== "reject" &&
    t.source !== "user_temporary" &&
    t.source !== "user_permanent"
  );
}
//@ chunk-v8nq54bj.js:11366-11405 placement
/**
 * 同意询问已到用户且不强制拒绝。
 */
function reachedUserWithoutDeny(e, t) {
  return consentAskReachedUser(e, t) && !consentMustDeny(t);
}
//@ chunk-v8nq54bj.js:11405-11446 placement
/**
 * 人类同意已获得且回复不是由他人代答。
 */
function humanEarnedWithoutReply(e, t) {
  return consentWasHumanEarned(e, t) && !repliesAskAnsweredByOther(t);
}
//@ chunk-v8nq54bj.js:11446-11508 placement
function repliesConsentWriterFor(e) {
  return canRearmWatchHere(e) && !isDelegatedObservationContext(e.agentContext)
    ? REPLIES_CONSENT_WRITER
    : undefined;
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
