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
import {
  objectSchema,
  stringSchema,
  _enum,
  booleanSchema,
  union,
  literal,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { COMMENT_TARGET_KEY } from "../../../services/artifacts/comments/commentConsent.js";
import { derivePublishContextFrom } from "../../../services/artifacts/readObservation.js";
import {
  isConsentUiKind,
  REPLIES_CONSENT_WRITER,
} from "../../../services/artifacts/comments/repliesConsent.js";
import { isHumanTurn_2 } from "../../../utils/messagePredicates.js";
import { isInterruptionOnlyMessage } from "../../../utils/messages.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-v8nq54bj.js:967-1045 placement
/**
 * 比较两个作用域值（字符串直接比，数组逐项比）。
 */
function scopesEqual(left, right) {
  return typeof left === "string" || typeof right === "string" ? left === right : arraysEqual(left, right);
}
//@ chunk-v8nq54bj.js:1045-1054 placement
var MAX_TYPE_CAPABILITY_READS = 64;
//@ chunk-v8nq54bj.js:1054-1128 placement
/**
 * 从输入里解析 artifact URL，非法返回 undefined。
 */
function artifactUrlOf(input) {
  let url = input.url;
  return typeof url === "string" ? (parseArtifactUrl(url) ?? undefined) : undefined;
}
//@ chunk-v8nq54bj.js:1128-1703 placement
/**
 * 预热 artifact 类型能力；本模块记录各类 artifact 同意（读写数据库、资源、外部组织等）。
 */
async function warmTypeCapabilities(slug, context) {
  let typeCapabilityReads = getLiveState().typeCapabilityReads;
  let cached = typeCapabilityReads.get(slug);
  if (cached !== undefined && (!context.toolUseId || cached.toolUseId === context.toolUseId))
    return cached.capabilities;
  let now = Date.now();
  let described = await describeArtifactType(slug, {
    signal: context.abortController.signal,
    credentials: context.credentials,
  });
  let detail = described.err === null ? described.detail : null;
  let capabilities = detail === null || detail.declaration === "malformed" ? null : detail.capabilities;
  let whole =
    capabilities !== null &&
    (detail?.declaration === undefined || Object.keys(detail.declaration).length === capabilities.length);
  if (issuedUnderDepartedAccount(now)) return null;
  if (!typeCapabilityReads.has(slug) && typeCapabilityReads.size >= MAX_TYPE_CAPABILITY_READS) {
    let oldest = typeCapabilityReads.keys().next().value;
    if (oldest !== undefined) typeCapabilityReads.delete(oldest);
  }
  typeCapabilityReads.set(slug, {
    toolUseId: context.toolUseId,
    capabilities,
    whole,
  });
  return capabilities;
}
//@ chunk-v8nq54bj.js:1703-1770 placement
function typeReadWhole(slug) {
  return getLiveState().typeCapabilityReads.get(slug)?.whole === true;
}
//@ chunk-v8nq54bj.js:1770-1862 placement
function typeReadDeclaresRoom(slug) {
  return getLiveState().typeCapabilityReads.get(slug)?.capabilities?.includes("room") === true;
}
//@ chunk-v8nq54bj.js:1862-2010 placement
function stampArtifactWatchConsent(input, context) {
  if (isDelegatedObservationContext(context.agentContext)) return;
  if (consentAskReachedUser(input, context))
    context.setAppState((state) =>
      withCurrentConsentEpoch(state, context, (scoped) =>
        scoped.artifactWatchApproved
          ? scoped
          : {
              ...scoped,
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
function consentAskReachedUser(input, context) {
  return (
    Reflect.get(input, CONSENT_ASK_TAG) === true &&
    consentAskCanReachUser(context) &&
    !consentCheckScopeStale(context)
  );
}
//@ chunk-v8nq54bj.js:2358-2587 placement
function noteConsentCheckScope(context) {
  if (context.toolUseId === undefined) return;
  let liveState = getLiveState();
  let { consentCheckScopes } = liveState;
  consentCheckScopes.delete(context.toolUseId);
  if (consentCheckScopes.size >= MAX_CONSENT_CHECK_SCOPES) {
    let oldest = consentCheckScopes.keys().next().value;
    if (oldest !== undefined) {
      consentCheckScopes.delete(oldest);
      liveState.consentCheckScopesEvicted = true;
    }
  }
  consentCheckScopes.set(context.toolUseId, consentEpochKey());
}
//@ chunk-v8nq54bj.js:2587-2597 placement
var MAX_CONSENT_CHECK_SCOPES = 256;
//@ chunk-v8nq54bj.js:2597-2753 placement
function consentCheckScopeStale(context) {
  if (context.toolUseId === undefined) return false;
  let liveState = getLiveState();
  let scope = liveState.consentCheckScopes.get(context.toolUseId);
  return scope === undefined ? liveState.consentCheckScopesEvicted : scope !== consentEpochKey();
}
//@ chunk-v8nq54bj.js:2753-2799 placement
function firstWatchAskReachesHuman(context) {
  return consentAskCanReachUser(context) && !isAutoClassifierActive(getToolPermissionContext(context).mode);
}
//@ chunk-v8nq54bj.js:2799-2864 placement
function consentWasHumanEarned(input, context) {
  return (
    ((input[PLAN_CONSENT_ASK_TAG] ?? false) && getToolPermissionContext(context).mode === "plan") ||
    consentAskWasUserOnly(input)
  );
}
//@ chunk-v8nq54bj.js:2864-2910 placement
function consentAskWasUserOnly(input) {
  return Reflect.get(input, USER_ONLY_CONSENT_ASK_TAG) === true;
}
//@ chunk-v8nq54bj.js:2910-3107 placement
/**
 * 账号变化时重置同意字段
 */
function withCurrentConsentEpoch(state, context, apply) {
  if (consentCheckScopeStale(context)) return state;
  let { accountEpoch } = getLiveState();
  if ((state.artifactConsentEpoch ?? 0) === accountEpoch) return apply(state);
  return apply({
    ...state,
    ...Object.fromEntries(ALL_CONSENT_KEYS.map((key) => [key, INITIAL_SLICE_STATE[key]])),
    artifactConsentEpoch: accountEpoch,
  });
}
//@ chunk-v8nq54bj.js:3107-3241 placement
function withPlanPublishConsent(state, context, path, slug) {
  return withCurrentConsentEpoch(state, context, (current) => ({
    ...current,
    artifactPlanPublishConsentPaths: {
      ...current.artifactPlanPublishConsentPaths,
      [path]: {
        slug,
      },
    },
  }));
}
//@ chunk-v8nq54bj.js:3241-3421 placement
/**
 * 按需更新同意字段
 */
function stampConsentFields(state, context, fieldNames, slug, normalize = () => true) {
  return withCurrentConsentEpoch(state, context, (current) => {
    if (
      fieldNames.every((fieldName) =>
        consentValueMatches(current[fieldName]?.[slug], normalize(current[fieldName]?.[slug])),
      )
    )
      return current;
    let updated = {
      ...current,
    };
    for (let fieldName of fieldNames)
      updated[fieldName] = {
        ...updated[fieldName],
        [slug]: normalize(current[fieldName]?.[slug]),
      };
    return {
      ...current,
      ...updated,
    };
  });
}
//@ chunk-v8nq54bj.js:3421-3512 placement
/**
 * 比较同意值：真值与 script 特判，其余逐项比较。
 */
function consentValueMatches(existing, next) {
  return existing === undefined ||
    existing === true ||
    existing === "script" ||
    next === true ||
    next === "script"
    ? existing === next
    : scopesEqual(existing, next);
}
//@ chunk-v8nq54bj.js:3512-3603 placement
/**
 * 拼出同意记录的字段名（需要人类同意时再加一项）。
 */
function consentFieldNames(prefix, includeHuman) {
  return includeHuman ? [`${prefix}ConsentSlugs`, `${prefix}HumanConsentSlugs`] : [`${prefix}ConsentSlugs`];
}
//@ chunk-v8nq54bj.js:3603-3740 placement
function stampArtifactDbReadConsent(input, context, slug) {
  if (isDelegatedObservationContext(context.agentContext)) return;
  if (!consentAskReachedUser(input, context) || ownedByUser(getShareEntry(slug))) return;
  context.setAppState((state) =>
    stampConsentFields(
      state,
      context,
      consentFieldNames("artifactDbRead", consentWasHumanEarned(input, context)),
      slug,
    ),
  );
}
//@ chunk-v8nq54bj.js:3740-4025 placement
function stampArtifactDbWriteConsent(input, context) {
  if (isDelegatedObservationContext(context.agentContext) || getLiveState().routineSourceWriteRefused) return;
  if (!consentAskReachedUser(input, context)) return;
  let humanEarned = consentWasHumanEarned(input, context);
  context.setAppState((state) =>
    withCurrentConsentEpoch(state, context, (current) =>
      current.artifactDbWriteApproved && (!humanEarned || current.artifactDbWriteHumanApproved)
        ? current
        : {
            ...current,
            artifactDbWriteApproved: true,
            ...(humanEarned && {
              artifactDbWriteHumanApproved: true,
            }),
          },
    ),
  );
}
//@ chunk-v8nq54bj.js:4025-4087 placement
function filesCowritten(shareEntry) {
  return shareEntry?.cowritten === true || shareEntry?.artifactKind === LIVE_DOC;
}
//@ chunk-v8nq54bj.js:4087-4147 placement
function filesFromType(shareEntry) {
  return shareEntry?.typeLocked === true || shareEntry?.typeLock != null;
}
//@ chunk-v8nq54bj.js:4147-4208 placement
function ownTypeInstance(shareEntry, owned = ownedByUser(shareEntry)) {
  return owned && filesFromType(shareEntry) && shareEntry?.artifactKind !== LIVE_DOC;
}
//@ chunk-v8nq54bj.js:4208-4299 placement
function ownFirstPartyTypeInstance(shareEntry, owned = ownedByUser(shareEntry)) {
  let typeSlug = typeSlugOf(shareEntry);
  return (
    ownTypeInstance(shareEntry, owned) &&
    typeSlug !== undefined &&
    getAttestationKind(typeSlug) === "first_party_type"
  );
}
//@ chunk-v8nq54bj.js:4299-4449 placement
function inheritsFirstPartyTypeDeclaration(shareEntry) {
  return (
    shareEntry !== undefined &&
    shareEntry.typeLock != null &&
    ownFirstPartyTypeInstance(shareEntry) &&
    !entryOutsideOrgContent(shareEntry) &&
    shareEntry.capabilitiesUnknown !== true &&
    shareEntry.capsReadNotFound !== true &&
    storedGrantObserved(shareEntry) &&
    isNonEmptyObject(shareEntry.capabilities)
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
function stampArtifactAssetReadConsent(input, context, slug, copied = false) {
  if (isDelegatedObservationContext(context.agentContext)) return;
  let shareEntry = getShareEntry(slug);
  let targetPin = Reflect.get(input, ASSET_TARGET_PIN_TAG);
  let pinHas = (key) =>
    typeof targetPin === "object" && targetPin !== null && Reflect.get(targetPin, key) === true;
  let classifierApproved =
    pinHas("classifier") || (getToolPermissionContext(context).mode === "auto" && !pinHas("userOnly"));
  if (
    !reachedUserWithoutDeny(input, context) ||
    pinHas("once") ||
    classifierApproved ||
    (ownedByUser(shareEntry) && !filesCowritten(shareEntry) && !filesFromType(shareEntry))
  )
    return;
  let humanEarned = humanEarnedWithoutReply(input, context) || (copied && repliesAskAnsweredByHuman(context));
  let outsideOrgByHuman = copied && !repliesAskAnsweredByOther(context);
  context.setAppState((state) =>
    stampConsentFields(
      state,
      context,
      [
        ...consentFieldNames("artifactAssetRead", humanEarned),
        ...(outsideOrgByHuman ? ["artifactOutsideOrgConsentSlugs"] : []),
      ],
      slug,
    ),
  );
}
//@ chunk-v8nq54bj.js:5117-5261 placement
function stampArtifactOutsideOrgConsent(context, slugs) {
  if (slugs.length === 0 || isDelegatedObservationContext(context.agentContext)) return;
  context.setAppState((state) =>
    slugs.reduce(
      (acc, slug) => stampConsentFields(acc, context, ["artifactOutsideOrgConsentSlugs"], slug),
      state,
    ),
  );
}
//@ chunk-v8nq54bj.js:5261-5446 placement
function stampArtifactSharedReadConsent(input, context, slug) {
  if (isDelegatedObservationContext(context.agentContext)) return;
  if (
    !reachedUserWithoutDeny(input, context) ||
    repliesAskAnsweredByOther(context) ||
    (getToolPermissionContext(context).mode === "auto" &&
      !othersArtifactReadIsUserOnly(artifactUrlOf(input)) &&
      !outsideOrgReadIsUserOnly(slug)) ||
    ownedByUser(getShareEntry(slug))
  )
    return;
  context.setAppState((state) => stampConsentFields(state, context, ["artifactReadConsentSlugs"], slug));
}
//@ chunk-v8nq54bj.js:5446-5609 placement
function stampArtifactAssetUploadConsent(input, context, slug, otherSeq) {
  if (isDelegatedObservationContext(context.agentContext)) return;
  if (!consentAskReachedUser(input, context) || getToolPermissionContext(context).mode === "auto") return;
  settleOtherCommentPending(slug, otherSeq);
  context.setAppState((state) =>
    stampConsentFields(
      state,
      context,
      consentFieldNames("artifactAssetUpload", consentWasHumanEarned(input, context)),
      slug,
    ),
  );
}
//@ chunk-v8nq54bj.js:5609-5671 placement
function roomJoinDecidedByClassifier(input, context) {
  return Reflect.get(input, ROOM_CONSENT_DISCLOSED_TAG) === "auto" && !repliesAskAnsweredByHuman(context);
}
//@ chunk-v8nq54bj.js:5671-5739 placement
function classifierRoomConsentStands(mode, slug) {
  return mode === "auto" && !getLiveState().roomStoppedByUser.has(slug);
}
//@ chunk-v8nq54bj.js:5739-5826 placement
/**
 * 由查询追踪拼出 chainId:depth 键。
 */
function queryKeyOf(context) {
  let queryTracking = context.queryTracking;
  return queryTracking === undefined ? undefined : `${queryTracking.chainId}:${queryTracking.depth}`;
}
//@ chunk-v8nq54bj.js:5826-5926 placement
function noteRoomArmAsk(context, keyedCheckId, entry) {
  let { roomArmAsked } = getLiveState();
  if (entry === undefined) roomArmAsked.delete(keyedCheckId);
  else
    roomArmAsked.set(keyedCheckId, {
      ...entry,
      at: queryKeyOf(context),
    });
}
//@ chunk-v8nq54bj.js:5926-6074 placement
function roomArmAskBookedFor(request, keyedCheckId) {
  for (let [checkId, ask] of getLiveState().roomArmAsked) {
    if (checkId === keyedCheckId) continue;
    if (request.keys.includes(ask.key) || (request.slug !== undefined && ask.slug === request.slug))
      return true;
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
function settleRoomArmAsks(context) {
  let liveState = getLiveState();
  let keyOf = queryKeyOf(context);
  for (let [checkId, ask] of liveState.roomArmAsked) {
    if (checkId === context.toolUseId) continue;
    let toolResultMessage = findToolResultMessage(context.messages, checkId);
    if (toolResultMessage === undefined && ask.at !== undefined && ask.at === keyOf) continue;
    liveState.roomArmAsked.delete(checkId);
    let toolDenialKind = toolResultMessage?.toolDenialKind;
    if (
      toolResultMessage === undefined ||
      toolDenialKind === "user-rejected" ||
      toolDenialKind === "permission-rule"
    ) {
      liveState.roomArmRefusedByUser.add(ask.key);
      liveState.roomArmRefusedByUser.add(NEW_PAGE_ARM_REFUSED_KEY);
      if (ask.slug !== undefined) liveState.roomStoppedByUser.add(ask.slug);
    }
  }
}
//@ chunk-v8nq54bj.js:6539-6739 placement
/**
 * 找含指定 tool_use_id 结果的用户消息
 */
function findToolResultMessage(messages, toolUseId) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (
      message?.type === "user" &&
      Array.isArray(message.message.content) &&
      message.message.content.some((block) => block.type === "tool_result" && block.tool_use_id === toolUseId)
    )
      return message;
  }
  return;
}
//@ chunk-v8nq54bj.js:6739-7121 placement
function stampArtifactRoomJoinConsent(input, context, slug) {
  if (isDelegatedObservationContext(context.agentContext)) return;
  let consentTag = Reflect.get(input, ROOM_CONSENT_DISCLOSED_TAG);
  if ((consentTag !== true && consentTag !== "auto") || consentMustDeny(context)) return;
  let value = roomJoinDecidedByClassifier(input, context) ? "classifier" : true;
  if (value === "classifier" && !classifierRoomConsentStands(getToolPermissionContext(context).mode, slug))
    return;
  context.setAppState((state) =>
    withCurrentConsentEpoch(state, context, (current) =>
      current.artifactRoomJoinConsentSlugs?.[slug] === value ||
      current.artifactRoomJoinConsentSlugs?.[slug] === true
        ? current
        : {
            ...current,
            artifactRoomJoinConsentSlugs: {
              ...current.artifactRoomJoinConsentSlugs,
              [slug]: value,
            },
          },
    ),
  );
}
//@ chunk-v8nq54bj.js:7121-7360 placement
function commentFieldsFrom(input) {
  let threadId = "thread_id" in input && typeof input.thread_id === "string" ? input.thread_id : undefined;
  let replyText = "text" in input && typeof input.text === "string" ? input.text : undefined;
  let cursor = "cursor" in input && typeof input.cursor === "string" ? input.cursor : undefined;
  return {
    threadId,
    replyText,
    cursor,
  };
}
//@ chunk-v8nq54bj.js:7360-7682 placement
function commentThreadConsentFields(artifactUrl, threadId) {
  let tid = threadId !== undefined && ARTIFACT_SLUG_RE.test(threadId) ? threadId : "(invalid)";
  let audience = "viewers of this artifact (share status could not be confirmed)";
  if (artifactUrl !== null) {
    let shareEntry = getShareEntry(artifactUrl.slug);
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
function assetFieldsFrom(input) {
  let readField = (key) => {
    let value = input[key];
    return typeof value === "string" ? value : undefined;
  };
  return {
    assetId: readField("asset_id"),
    outDir: readField("out_dir"),
    after: readField("after"),
  };
}
//@ chunk-v8nq54bj.js:7825-7874 placement
function foldForDecisionSurface(text, max = 1024) {
  return foldedForSurface(
    sanitizeDisplayText(text, {
      max,
    }),
  );
}
//@ chunk-v8nq54bj.js:7874-7923 placement
function quoteForDecisionSurface(text, max = 1024) {
  return `"${spacedFromClosingQuote(foldForDecisionSurface(text, max))}"`;
}
//@ chunk-v8nq54bj.js:7923-7973 placement
function quotePathForDecisionSurface(path) {
  return `"${spacedFromClosingQuote(withEdgeBlanksMarked(foldForDecisionSurface(markedForBracketFold(path))))}"`;
}
//@ chunk-v8nq54bj.js:7973-8137 placement (2.1.88 match: capitalize, 0.796)
function withConsentCoverage(reason, coverage) {
  let replaced = reason.trimEnd().replace(/\.$/, "");
  if (replaced === "") {
    let replaced = coverage.replace(/^[\s;,\u2014-]+/, "");
    return replaced.charAt(0).toUpperCase() + replaced.slice(1);
  }
  return `${replaced}${coverage}`;
}
//@ chunk-v8nq54bj.js:8137-8333 placement
function askStrength(decision) {
  if (decision.behavior !== "ask") return -1;
  let decisionReason = decision.decisionReason;
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
function resolveVerifyTarget(input) {
  return typeof input.url === "string"
    ? parseArtifactUrl(input.url)
    : (getLiveState().verify.lastPublish ?? null);
}
//@ chunk-v8nq54bj.js:8598-8957 placement
/**
 * 发布来源 pin 的校验 schema。
 */
var PUBLISH_TARGET_TAG; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ROUTINE_UNASKED_FIRST_PUBLISH_TAG;
var PUBLISH_SOURCE_PIN_TAG;
var publishSourcePinSchema;
deferInit("chunk-v8nq54bj.js:8598", () => {
  PUBLISH_TARGET_TAG = "__artifactPublishTarget";
  ROUTINE_UNASKED_FIRST_PUBLISH_TAG = "__artifactRoutineUnaskedFirstPublish";
  PUBLISH_SOURCE_PIN_TAG = "__artifactPublishSourcePin";
  publishSourcePinSchema = DoctorLazy(() =>
    objectSchema({
      path: stringSchema(),
      kind: _enum(["file", "absent", "network"]),
      redirected: booleanSchema(),
      sha256: stringSchema().optional(),
      root: objectSchema({
        spelling: stringSchema(),
        base: stringSchema(),
        redirected: booleanSchema().optional(),
      }).optional(),
      copies: stringSchema().optional(),
      minted: stringSchema().optional(),
      type: union([stringSchema(), literal(false)]),
      shim: booleanSchema().optional(),
    }),
  );
});
//@ chunk-v8nq54bj.js:8957-9071 placement
function readPublishSourcePinTag(input) {
  let pin = Reflect.get(input, PUBLISH_SOURCE_PIN_TAG);
  if (pin === undefined) return;
  let parsed = publishSourcePinSchema().safeParse(pin);
  return parsed.success ? parsed.data : null;
}
//@ chunk-v8nq54bj.js:9071-9104 placement
/**
 * 去掉 type 字段的发布来源 pin schema。
 */
var publishSourcePinWithoutTypeSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v8nq54bj.js:9071", () => {
  publishSourcePinWithoutTypeSchema = DoctorLazy(() =>
    publishSourcePinSchema().omit({
      type: true,
    }),
  );
});
//@ chunk-v8nq54bj.js:9104-9330 placement
function unreadPublishSourcePinReason(input) {
  let pin = Reflect.get(input, PUBLISH_SOURCE_PIN_TAG);
  if (pin === undefined) return "source_pin_missing";
  return typeof pin === "object" &&
    pin !== null &&
    Reflect.get(pin, "type") === undefined &&
    publishSourcePinWithoutTypeSchema().safeParse(pin).success
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
function consentPin(action, target) {
  return {
    [CONSENT_PIN_TAG]:
      target === null
        ? null
        : {
            action,
            slug: target.slug,
          },
  };
}
//@ chunk-v8nq54bj.js:9756-9792 placement
/**
 * 记录各类目标 pin 的标记列表。
 */
var TARGET_PIN_TAGS; // deferred: uses PUBLISH_TARGET_TAG of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-v8nq54bj.js:9756", () => {
  TARGET_PIN_TAGS = [
    PUBLISH_TARGET_TAG,
    ASSET_UPLOAD_PIN_TAG,
    ROOM_SEND_TARGET_TAG,
    ASSET_TARGET_PIN_TAG,
    READ_TARGET_PIN_TAG,
    ARTIFACT_DELETE_PIN_TAG,
    CONSENT_PIN_TAG,
    SYNC_TARGET_PIN_TAG,
  ];
});
//@ chunk-v8nq54bj.js:9792-9862 placement
function carriesForeignPin(input, ownTag) {
  return TARGET_PIN_TAGS.some((tag) => tag !== ownTag && Reflect.get(input, tag) !== undefined);
}
//@ chunk-v8nq54bj.js:9862-9924 placement
function carriesAnyDecisionPin(input) {
  return TARGET_PIN_TAGS.some((tag) => Reflect.get(input, tag) !== undefined);
}
//@ chunk-v8nq54bj.js:9924-10060 placement
function consentPinMatches(input, action, slug) {
  let pin = Reflect.get(input, CONSENT_PIN_TAG);
  return (
    typeof pin === "object" &&
    pin !== null &&
    Reflect.get(pin, "action") === action &&
    Reflect.get(pin, "slug") === slug
  );
}
//@ chunk-v8nq54bj.js:10060-10134 placement
function consentTargetChanged(input, action, slug) {
  return (
    carriesForeignPin(input, CONSENT_PIN_TAG) ||
    (Reflect.get(input, CONSENT_PIN_TAG) !== undefined && !consentPinMatches(input, action, slug))
  );
}
//@ chunk-v8nq54bj.js:10134-10349 placement
/**
 * 其余同意与 pin 标记（handlers、实时文档替身、db 读写来源等）与全部标记汇总。
 */
var DB_READ_TARGET_PIN_TAG; // deferred: uses TARGET_PIN_TAGS of its import cycle while loading; runs once the cycle is complete
var DB_WRITE_SOURCE_PIN_TAG;
var HANDLERS_PIN_TAG;
var LIVE_DOC_STAND_IN_TAG;
var ARTIFACT_ASK_TAG;
var CONSENT_MARKER_TAGS;
deferInit("chunk-v8nq54bj.js:10134", () => {
  DB_READ_TARGET_PIN_TAG = "__artifactDbReadTargetPin";
  DB_WRITE_SOURCE_PIN_TAG = "__artifactDbWriteSourcePin";
  HANDLERS_PIN_TAG = "__artifactHandlersPin";
  LIVE_DOC_STAND_IN_TAG = "__artifactLiveDocStandIn";
  ARTIFACT_ASK_TAG = "__artifactAsk";
  CONSENT_MARKER_TAGS = [
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
});
//@ chunk-v8nq54bj.js:10349-10442 placement
function carriesCheckMintedMarker(input) {
  return (
    typeof input === "object" &&
    input !== null &&
    CONSENT_MARKER_TAGS.some((tag) => Reflect.get(input, tag) !== undefined)
  );
}
//@ chunk-v8nq54bj.js:10442-10564 placement
function noteNoticeRead(kind, context, slug, read, askRule = false) {
  if (context.toolUseId !== undefined)
    getLiveState().shareStatus.noticeReadSights[kind].note(
      context.toolUseId,
      slug,
      read && (askRule || consentAskCanReachUser(context)),
    );
}
//@ chunk-v8nq54bj.js:10564-10638 placement
function noticeReadSight(kind, toolUseId, slug) {
  return getLiveState().shareStatus.noticeReadSights[kind].take(toolUseId, slug);
}
//@ chunk-v8nq54bj.js:10638-10716 placement
function noticeReadDisclosed(kind, context, slug, fallback) {
  return context.toolUseId === undefined ? fallback : noticeReadSight(kind, context.toolUseId, slug) === true;
}
//@ chunk-v8nq54bj.js:10716-10811 placement
function planPublishConsentEarned(input, context) {
  if (isDelegatedObservationContext(context.agentContext)) return false;
  return (
    (input[PLAN_CONSENT_ASK_TAG] ?? false) &&
    getToolPermissionContext(context).mode === "plan" &&
    consentAskCanReachUser(context)
  );
}
//@ chunk-v8nq54bj.js:10811-10952 placement
function derivePublishContext(context) {
  return derivePublishContextFrom({
    agentId: context.agentId,
    agentType: context.agentContext?.agentType,
    isNonInteractiveSession: context.options.isNonInteractiveSession,
  });
}
//@ chunk-v8nq54bj.js:10952-11031 placement
function canRearmWatchHere(context) {
  return Boolean(env.CLAUDE_CODE_REMOTE) || isConsentUiKind(derivePublishContext(context).publishContext);
}
//@ chunk-v8nq54bj.js:11031-11178 placement
function repliesAskAnsweredByHuman(context) {
  if (context.toolUseId === undefined) return false;
  let source = context.toolDecisions?.get(context.toolUseId)?.source;
  return source === "user_temporary" || source === "user_permanent";
}
//@ chunk-v8nq54bj.js:11178-11366 placement
function repliesAskAnsweredByOther(context) {
  if (context.toolUseId === undefined) return false;
  let decision = context.toolDecisions?.get(context.toolUseId);
  return (
    decision !== undefined &&
    decision.decision !== "reject" &&
    decision.source !== "user_temporary" &&
    decision.source !== "user_permanent"
  );
}
//@ chunk-v8nq54bj.js:11366-11405 placement
/**
 * 同意询问已到用户且不强制拒绝。
 */
function reachedUserWithoutDeny(input, context) {
  return consentAskReachedUser(input, context) && !consentMustDeny(context);
}
//@ chunk-v8nq54bj.js:11405-11446 placement
/**
 * 人类同意已获得且回复不是由他人代答。
 */
function humanEarnedWithoutReply(input, context) {
  return consentWasHumanEarned(input, context) && !repliesAskAnsweredByOther(context);
}
//@ chunk-v8nq54bj.js:11446-11508 placement
function repliesConsentWriterFor(context) {
  return canRearmWatchHere(context) && !isDelegatedObservationContext(context.agentContext)
    ? REPLIES_CONSENT_WRITER
    : undefined;
}
//@ chunk-v8nq54bj.js:11508-11545 placement
function isNonAbortHumanTurn(message) {
  return isHumanTurn_2(message) && !isInterruptionOnlyMessage(message);
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
