/**
 * tools/ArtifactTool/artifactAccessClasses.ts
 *
 * 2.1.316 新增：按访问类别生成询问用户的问题（删除、公开修改等）；artifact 询问文案常量等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-m79qv8gp.js (57)
 * attribution: placement 57
 */
import { getShareEntry, probeAnswered } from "../../services/artifacts/shareEntries.js";
import {
  outsideOrgRead,
  isCoworkFramePublishSession,
  otherOrgCopySource,
  isCoworkHostSession,
} from "../../services/artifacts/artifactToolGates.js";
import { isFramePublicReadEnabled } from "../../services/artifacts/frameFlags.js";
import {
  isStrictHumanTurn,
  analyzeTurnTail,
  allUserTurnsSatisfy,
  isHumanTurn,
} from "../../utils/turnOrigin.js";
import { getLiveState } from "../../services/liveReplica/liveReplica.js";
import { getFrameHostOverride } from "../../services/routines/routinesApi.js";
import { isRemoteManagedEnvironment, isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { frameRelayBinds, relayFamily, relayDeclined } from "../../services/artifacts/frameRelay.js";
import { isAccountIngressToken } from "../../services/ccrAgentProxy/agentProxy.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getClaudeAIOAuthTokenOrigin } from "../../utils/auth.js";
import {
  getToolPermissionContext,
  consentMustDeny,
  planConsentMustDeny,
  artifactFilesConsentSlugs,
  consentAskCanReachUser,
} from "../../utils/permissions/toolPermissionContext.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isToolResultMessage } from "../../utils/messageProvenance.js";
import {
  laneNoticeSlug,
  lastOthersCommentReadAt,
  hasOtherRecentCommentRead,
  commentReadFor,
} from "../../services/artifacts/commentReads.js";
import { ARTIFACT_COMMENTS_TOOL_NAME, ARTIFACT_TOOL_NAME } from "./constants.js";
import { toParentArtifactInput } from "../../services/artifacts/artifactToolActions.js";
import {
  classifyArtifactConsent,
  hasSharedReadConsentClasses,
  hasOutsideOrgConsent,
  rememberConsentForAsk,
  consentEpochKey,
  recordNamedOtherOrgs,
  recordAskClassConsent,
  consentClassKey,
  wasOtherOrgNamed,
  rememberOutsideOrgConsent,
  hasClassConsent,
  hasClassPersonConsent,
} from "../../services/artifacts/consentClasses.js";
import { isSandboxEgressDisabled } from "../../services/artifacts/sandboxEgress.js";
import {
  repliesAskAnsweredByOther,
  consentWasHumanEarned,
  consentAskReachedUser,
  CONSENT_ASK_TAG,
  ARTIFACT_ASK_TAG,
  repliesAskAnsweredByHuman,
} from "./permissions/consentStamps.js";
import { isClassifierDecision } from "../BashTool/bashPermissions.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { artifactCardTitle } from "./artifactUrls.js";
import { setBounded, hashOfIfPossible } from "./artifactAskMessages.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-m79qv8gp.js:5235-5384 placement
function shareFacts(slug, n) {
  let shareEntry = getShareEntry(slug);
  return probeAnswered(shareEntry, n.toolUseId)
    ? factsFromEntry(shareEntry)
    : {
        owned: undefined,
        public: undefined,
        outsideOrg: outsideOrgRead(shareEntry) || publicReadFlagOrUndefined(),
        invitedByOtherOrg: shareEntry?.external === true,
      };
}
//@ chunk-m79qv8gp.js:5384-5839 placement
function factsFromEntry(shareEntry) {
  let invitedByOtherOrg = shareEntry?.external === true;
  if (shareEntry === undefined || shareEntry.probeFailed === true)
    return {
      owned: undefined,
      public: undefined,
      outsideOrg: outsideOrgRead(shareEntry) || publicReadFlagOrUndefined(),
      invitedByOtherOrg,
    };
  let t = shareEntry.mode === "unknown" ? undefined : shareEntry.mode === "public";
  let outsideOrg = outsideOrgRead(shareEntry);
  if (shareEntry.role === undefined)
    return {
      owned: t === true ? false : undefined,
      public: t,
      outsideOrg,
      invitedByOtherOrg,
    };
  return {
    owned: shareEntry.role === "unknown" ? undefined : shareEntry.role === "owner",
    public: t,
    outsideOrg,
    invitedByOtherOrg,
    ...((shareEntry.role === "owner" || shareEntry.role === "writer") && {
      canWrite: true,
    }),
  };
}
//@ chunk-m79qv8gp.js:5839-5874 placement
/**
 * 公开读取开关关闭时返回 false，否则 undefined。
 */
function publicReadFlagOrUndefined() {
  return isFramePublicReadEnabled() ? undefined : false;
}
//@ chunk-m79qv8gp.js:5874-6129 placement
function classFactsFor(operation, n, t) {
  let s = shareFacts(n.slug, t);
  return {
    operation,
    artifactId: n.slug,
    owned: s.owned,
    public: s.public,
    outsideOrg: s.outsideOrg,
    invitedByOtherOrg: s.invitedByOtherOrg,
    networkOff: sessionNetworkOff(n),
    turnStartedByHuman: isStrictHumanTurn(t.messages),
    ...(s.canWrite === true && {
      canWrite: true,
    }),
  };
}
//@ chunk-m79qv8gp.js:6129-6187 placement
/**
 * 定时触发允许的原因取值。
 */
var SCHEDULED_TRIGGER_REASONS = new Set(["scheduled", "retry", "catch_up", "manual"]);
//@ chunk-m79qv8gp.js:6187-6316 placement
function isScheduledTriggerFire(e) {
  return (
    e?.kind === "task-notification" &&
    e.subkind === "scheduled-trigger" &&
    e.fireReason !== undefined &&
    SCHEDULED_TRIGGER_REASONS.has(e.fireReason)
  );
}
//@ chunk-m79qv8gp.js:6316-6520 placement
function routineRunNobodyJudges(e) {
  if (classifierJudges(e)) return false;
  if (!isScheduledTriggerFire(analyzeTurnTail(e.messages).decider?.origin)) return false;
  let liveState = getLiveState();
  if (
    !liveState.routineRunTainted &&
    !allUserTurnsSatisfy(e.messages, (t, s) => isHumanTurn(s) || isScheduledTriggerFire(t))
  )
    liveState.routineRunTainted = true;
  return !liveState.routineRunTainted;
}
//@ chunk-m79qv8gp.js:6520-6649 placement
function newArtifactIsPersonsPrivate() {
  if (getFrameHostOverride() !== undefined) return false;
  if (isRemoteManagedEnvironment())
    return frameRelayBinds() && routineRelayCarried() && isAccountIngressToken();
  return (
    !isByocEnvironment() &&
    isCoworkFramePublishSession() &&
    getAPIProvider() === "firstParty" &&
    getClaudeAIOAuthTokenOrigin() === "env"
  );
}
//@ chunk-m79qv8gp.js:6649-6708 placement
/**
 * 直接部署接口对应的中继族（用于判断中继是否承载）。
 */
function directDeployRelayFamily() {
  return relayFamily("POST", "/api/frame/deploy/direct");
}
//@ chunk-m79qv8gp.js:6708-6767 placement
/**
 * 该中继族已服务到的时刻。
 */
function relayServedUntil(e) {
  return getLiveState().frameRelay.servedUntil.get(e) ?? 0;
}
//@ chunk-m79qv8gp.js:6767-6889 placement
function routineRelayCarried() {
  let e = directDeployRelayFamily();
  if (e === null || relayDeclined(e)) return false;
  let routineRelayNotCarried = getLiveState().routineRelayNotCarried;
  return routineRelayNotCarried === null || relayServedUntil(e) > routineRelayNotCarried.servedUntil;
}
//@ chunk-m79qv8gp.js:6889-6972 placement
function noteRoutineRelayNotCarried() {
  let e = directDeployRelayFamily();
  getLiveState().routineRelayNotCarried = {
    servedUntil: e === null ? 0 : relayServedUntil(e),
  };
}
//@ chunk-m79qv8gp.js:6972-7058 placement
function classifierJudges(e) {
  let { mode, modeBeforeRewrite } = getToolPermissionContext(e);
  return (
    isAutoClassifierActive(mode) ||
    (modeBeforeRewrite !== undefined && isAutoClassifierActive(modeBeforeRewrite))
  );
}
//@ chunk-m79qv8gp.js:7058-7490 placement
function commentTurnNobodyJudges(e, slug) {
  if (classifierJudges(e)) return false;
  let { messages } = e;
  let decider = analyzeTurnTail(messages).decider;
  if (
    decider === null ||
    messages[decider.index]?.type !== "user" ||
    decider.origin?.kind !== "task-notification"
  )
    return false;
  let index = decider.index;
  for (; index > 0; index--) {
    let i = messages[index - 1];
    if (
      i == null ||
      i.type === "assistant" ||
      (i.type === "user" && !isToolResultMessage(i) && i.origin?.kind !== "task-notification")
    )
      break;
  }
  let sliced = messages.slice(index);
  return (
    allUserTurnsSatisfy(
      sliced,
      (i, u) =>
        u.type === "user" &&
        i?.kind === "task-notification" &&
        i.subkind === undefined &&
        laneNoticeSlug(u.uuid) === slug,
    ) && hasArtifactCallSinceUserTurn(sliced, slug)
  );
}
//@ chunk-m79qv8gp.js:7490-7883 placement
/**
 * 用户回合后是否已有 artifact 调用。
 */
function hasArtifactCallSinceUserTurn(e, n) {
  let t = e[0] === undefined ? NaN : Date.parse(e[0].timestamp);
  let s = lastOthersCommentReadAt();
  if (s !== undefined && !(Number.isFinite(t) && s < t)) return false;
  if (hasOtherRecentCommentRead(n, t)) return false;
  let o = false;
  for (let d of e) {
    if (d?.type !== "assistant" || !Array.isArray(d.message.content)) continue;
    for (let i of d.message.content)
      if (i.type === "tool_use" && isCommentsAction(i.name, i.input)) {
        let u = commentReadFor(i.id);
        if (u?.ownWordsOnly !== true || u.slug !== n) return false;
        o = true;
      }
  }
  return o;
}
//@ chunk-m79qv8gp.js:7883-8021 placement
function isCommentsAction(name, n) {
  let t =
    name === ARTIFACT_COMMENTS_TOOL_NAME
      ? toParentArtifactInput("comments", n)
      : name === ARTIFACT_TOOL_NAME
        ? n
        : undefined;
  return typeof t === "object" && t !== null && "action" in t && t.action === "comments";
}
//@ chunk-m79qv8gp.js:8021-8032 placement
var PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS = true;
//@ chunk-m79qv8gp.js:8032-8112 placement
function writeKeepsFlagOffAsk(e, n) {
  return (
    (e.ask && e.basis === "unattended") ||
    (PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS && getToolPermissionContext(n).mode === "plan")
  );
}
//@ chunk-m79qv8gp.js:8112-8123 placement
var PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS = true;
//@ chunk-m79qv8gp.js:8123-8170 placement
function readKeepsFlagOffAsk(e) {
  return PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS && getToolPermissionContext(e).mode === "plan";
}
//@ chunk-m79qv8gp.js:8170-8246 placement = isFileReadDenied (1)
function readClassRuling(e, n, t, s, o = () => classifyArtifactConsent(classFactsFor("read", n, e))) {
  return !t && s && !readKeepsFlagOffAsk(e) ? o() : null;
}
//@ chunk-m79qv8gp.js:8246-8279 placement
/**
 * 是否处于 Cowork 发布会话且同意必须拒绝。
 */
function isCoworkPublishDenySession(e) {
  return isCoworkFramePublishSession() && consentMustDeny(e);
}
//@ chunk-m79qv8gp.js:8279-9111 placement
function noticeAskFloorDeny(e, n, t) {
  let s = isCoworkPublishDenySession(e) && !isStrictHumanTurn(e.messages);
  if (!s && !planConsentMustDeny(e)) return null;
  let o = t.endsWith(".") ? t : `${t}.`;
  return {
    behavior: "deny",
    message: `${n}. This needs a yes to: ${o} ${s ? "No one can answer that prompt in this Cowork session, and this turn was not started by the user's own message \u2014 tell the user in chat; do not retry it on this turn." : "No one can answer that prompt from plan mode in this session \u2014 keep planning in the plan file and raise it with the user in chat; do not retry while plan mode is on."}`,
    decisionReason: {
      type: "safetyCheck",
      reason: s
        ? "Artifact call with a new-comments notice pending, on a turn the user's own message did not start, in a Cowork session that has no one to answer its prompt"
        : "Notification-triggered artifact call in plan mode has no one to answer its prompt",
      classifierApprovable: false,
    },
  };
}
//@ chunk-m79qv8gp.js:9111-9610 placement
function othersContentFloorDeny(e, n, t) {
  if (!othersContentHasNoAnswerer(e, t)) return null;
  return {
    behavior: "deny",
    message: `${n}. Reading content of an artifact the user does not own, or whose ownership couldn't be confirmed, needs a person's yes, and no one can answer the prompt in this session \u2014 tell the user in chat instead of retrying.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "Reading content of an artifact that is not confirmed to be the user's own requires a live human consent surface in this session",
      classifierApprovable: false,
    },
  };
}
//@ chunk-m79qv8gp.js:9610-9652 placement
function othersContentHasNoAnswerer(e, n) {
  return consentMustDeny(e) && (isCoworkFramePublishSession() || n);
}
//@ chunk-m79qv8gp.js:9652-9687 placement
function sessionNetworkOff(e) {
  return isSandboxEgressDisabled(e?.env);
}
//@ chunk-m79qv8gp.js:9687-10225 placement
/**
 * artifact 询问文案常量。
 */
var ARTIFACT_ASK_TEXT = "this artifact";
var NOT_ASKED_FIRST_NOTE =
  "no one was asked first \u2014 nothing was returned; retry the same action so the user is asked";
var NO_ANSWERER_NOTE =
  "no one can be asked about it in this session \u2014 nothing was returned; do not retry it here";
var HOOK_ANSWERED_FOR_USER_NOTE =
  "a PermissionRequest hook answered the permission prompt in the user's place; only the user's own approval allows this read \u2014 nothing was returned; do not retry it here, and tell the user their hook answered for them (to approve it themselves they would narrow the hook so it no longer answers this prompt)";
//@ chunk-m79qv8gp.js:10225-10444 placement
function outsideOrgReadAdmitted(e, n, slug, s) {
  if (foreignReadAnsweredByPerson(n, slug)) return true;
  if (
    hasSharedReadConsentClasses(
      artifactFilesConsentSlugs(n),
      s === "page" ? "artifactReadConsentSlugs" : "artifactAssetReadHumanConsentSlugs",
      slug,
    )
  )
    return true;
  if (consentMustDeny(n) || repliesAskAnsweredByOther(n)) return false;
  return (
    consentWasHumanEarned(e, n) ||
    (!isAutoClassifierActive(getToolPermissionContext(n).mode) &&
      !isClassifierDecision(e) &&
      consentAskReachedUser(e, n))
  );
}
//@ chunk-m79qv8gp.js:10444-10575 placement
function approvedByHook(e) {
  let n = e.toolUseId === undefined ? undefined : e.toolDecisions?.get(e.toolUseId);
  return n?.source === "hook" && n.decision !== "reject";
}
//@ chunk-m79qv8gp.js:10575-11326 placement
function outsideOrgUnaskedWords(e, n = false, t) {
  let s = approvedByHook(e);
  let o = n
    ? !consentAskCanReachUser(e) ||
      (consentMustDeny(e) && !isAutoClassifierActive(getToolPermissionContext(e).mode))
    : consentMustDeny(e);
  if (!n)
    return `this turned out to be a public artifact from outside your organization, and ${o ? NO_ANSWERER_NOTE : s ? HOOK_ANSWERED_FOR_USER_NOTE : NOT_ASKED_FIRST_NOTE}`;
  let d = t === undefined ? "nothing was copied" : "nothing was published";
  let i =
    t === undefined
      ? "Retry the same action so that question is asked."
      : t.retryUrl !== undefined
        ? `Retry publishing with url: ${jsonStringify(t.retryUrl)} so that question is asked.`
        : "Retry the same publish so that question is asked.";
  return o
    ? `the source artifact belongs to another organization and nobody can be asked about copying from it in this session, so ${d}. Don't retry it here.`
    : `the source artifact belongs to another organization and nobody was asked whether to copy from another organization's artifact, so ${d}. ${i}`;
}
//@ chunk-m79qv8gp.js:11326-11378 placement
function crossOrgCopyOk(e, n, t) {
  return otherOrgCopySource(getShareEntry(n)) && (t || outsideOrgYesStands(e, n));
}
//@ chunk-m79qv8gp.js:11378-11458 placement
function outsideOrgYesStands(e, n) {
  return (
    hasOutsideOrgConsent(n) ||
    hasSharedReadConsentClasses(artifactFilesConsentSlugs(e), "artifactOutsideOrgConsentSlugs", n)
  );
}
//@ chunk-m79qv8gp.js:11568-11631 placement
var OUTSIDE_ORG_READ_NOTE = "This artifact was created outside your organization.";
//@ chunk-m79qv8gp.js:11631-12023 placement
function readAskSentence(e, title, t) {
  let s = artifactCardTitle(title);
  let o = s ? `"${s}"` : ARTIFACT_ASK_TEXT;
  let d = s ? `"${s}"` : "This artifact";
  let i = `Let Claude read it${t ? ` and ${t}` : ""}?`;
  switch (e) {
    case "someone_else":
      return `${d} was made by someone else. ${i}`;
    case "unknown":
      return `Claude couldn't check who made ${o}. ${i}`;
    case "cowritten":
      return `Other people can edit ${o}. ${i}`;
    case "from_type":
      return `${d} was made from someone else's artifact type. ${i}`;
  }
}
//@ chunk-m79qv8gp.js:12023-12158 placement
function readCoverageSentence(e) {
  return `Approving covers its files${e ? ", and copying them into other artifacts," : ""} for the rest of the conversation.`;
}
//@ chunk-m79qv8gp.js:12158-12316 placement
function askQuestionWithScope(ruling, title, url) {
  let s = artifactAskQuestion(ruling, title, url);
  if (ruling.remember !== "artifact") return s;
  let o = isCoworkHostSession() ? "task" : "conversation";
  return s.replace(/\?$/, ` for the rest of this ${o}?`);
}
//@ chunk-m79qv8gp.js:12316-12435 placement
function isPersonPublicChange(e) {
  return (
    e.class === "public_change" &&
    e.basis !== "unattended" &&
    e.about !== "someone_else" &&
    e.missing !== "public"
  );
}
//@ chunk-m79qv8gp.js:12435-13227 placement
/**
 * 按访问类别生成询问用户的问题（删除、公开修改等）。
 */
function artifactAskQuestion(e, n, t) {
  let s = artifactCardTitle(n);
  let o = s ? `"${s}"` : ARTIFACT_ASK_TEXT;
  let d = s ? `"${s}"` : "This artifact";
  switch (e.class) {
    case "delete":
      return `Permanently delete ${s || t === undefined ? o : t}?`;
    case "public_change":
      if (isPersonPublicChange(e)) return `${d} is public. Allow Claude to change it?`;
      if (e.basis === "unattended") return `Allow Claude to change ${o}?`;
      if (e.about === "someone_else")
        return e.missing === "owned"
          ? `Claude couldn't check who made ${o}. Allow Claude to change it?`
          : `${d} was made by someone else. Allow Claude to change it?`;
      return `Claude couldn't check who can see ${o}. Allow Claude to change it?`;
    case "access_change":
      return `Allow Claude to change who can open or comment on ${o}?`;
    case "standing_job":
      return `Allow Claude to keep replying to comments on ${o}?`;
    case "foreign_read":
      return readAskSentence(e.missing === "owned" ? "unknown" : "someone_else", n);
  }
}
//@ chunk-m79qv8gp.js:13227-13284 placement
/**
 * 组织外读取时返回对应说明。
 */
function outsideOrgNote(ruling) {
  return ruling.about === "outside_org" ? OUTSIDE_ORG_READ_NOTE : undefined;
}
//@ chunk-m79qv8gp.js:13284-13333 placement
function decideByClass(e) {
  return decideByClasses(e.input, e.context, [e]);
}
//@ chunk-m79qv8gp.js:13333-15856 placement
function decideByClasses(e, n, t) {
  if (n.toolUseId !== undefined) {
    getLiveState().askClassPending.delete(n.toolUseId);
    getLiveState().askClassCards.delete(n.toolUseId);
  }
  let s = [];
  for (let r of t)
    if (!r.ruling.ask) {
      if (r.ruling.foreignRead)
        recordUnaskedForeignRead(r.action, r.slug, r.ownerAccountId, r.ruling.attested);
    } else if (
      r.ruling.remember !== "artifact" ||
      !(r.consentHeld ?? rememberConsentForAsk(r.ruling, r.slug, r.userOnly === true)) ||
      r.heldYesDoesNotCover === true
    )
      s.push({
        ...r,
        ruling: r.ruling,
      });
  if (s.length === 0)
    return {
      behavior: "allow",
      updatedInput: {
        ...e,
        [CONSENT_ASK_TAG]: false,
      },
    };
  let o = (r) => r.ruling.answeredBy === "person" || r.userOnly === true;
  s.sort((r, k) => Number(o(k)) - Number(o(r)));
  let any = s.some(o);
  let mapped = s.map((r) => ({
    display: r.display,
    question: askQuestionWithScope(r.ruling, r.display.title, r.display.url),
    note: outsideOrgNote(r.ruling),
    linked:
      r.ruling.class === "foreign_read" || r.ruling.about === "someone_else" || r.ruling.missing === "owned",
    reach: r.note,
  }));
  let joined = mapped
    .flatMap((r) => (r.reach === undefined ? [r.question] : [r.question, r.reach]))
    .join(" ");
  if (
    any
      ? consentMustDeny(n)
      : planConsentMustDeny(n) ||
        (s.some((r) => r.ruling.class === "foreign_read") && isCoworkPublishDenySession(n))
  )
    return {
      behavior: "deny",
      message: `Nothing was done. This needs a yes to: ${mapped.map((r) => r.question).join(" ")} No one can answer in this session.`,
      decisionReason: {
        type: "safetyCheck",
        reason: `Artifact ${s.map((r) => r.ruling.class).join(", ")} ask has no one to answer it`,
        classifierApprovable: false,
      },
    };
  let p = consentAskCanReachUser(n);
  let askedIn = consentEpochKey();
  let mapped_2 = s.map((r) => ({
    class: r.ruling.class,
    remember: r.ruling.remember,
    ...(r.ruling.endpoint && {
      endpoint: true,
    }),
    slug: r.slug,
    url: r.display.url,
    ...(r.display.title !== undefined && {
      title: r.display.title,
    }),
    reachable: p,
    askedIn,
  }));
  recordNamedOtherOrgs(
    n,
    s
      .filter((r) => "about" in r.ruling && r.ruling.about === "outside_org" && !r.ruling.endpoint)
      .map((r) => r.slug),
    p,
  );
  let h = mapped_2.length === 1 ? mapped_2[0] : mapped_2;
  if (n.toolUseId !== undefined) {
    setBounded(getLiveState().askClassPending, n.toolUseId, mapped_2);
    if (any) setBounded(getLiveState().askClassPersonAsked, n.toolUseId, true);
    else getLiveState().askClassPersonAsked.delete(n.toolUseId);
    if (isAutoClassifierActive(getToolPermissionContext(n).mode))
      getLiveState().askClassNoClassifier.delete(n.toolUseId);
    else setBounded(getLiveState().askClassNoClassifier, n.toolUseId, true);
    let r = hashOfIfPossible(h);
    if (r !== undefined) {
      let parts = mapped.flatMap(({ display, question, note, linked, reach }) => [
        question,
        ...(note === undefined ? [] : [note]),
        ...(question.includes(display.url) || (!linked && artifactCardTitle(display.title))
          ? []
          : [display.url]),
        ...(reach === undefined ? [] : [reach]),
      ]);
      setBounded(getLiveState().askClassCards, n.toolUseId, {
        stamp: r,
        parts,
        saysPublic: s.some((y) => isPersonPublicChange(y.ruling)),
        reason: joined,
      });
    }
  }
  return {
    behavior: "ask",
    message: joined,
    updatedInput: {
      ...e,
      [CONSENT_ASK_TAG]: false,
      [ARTIFACT_ASK_TAG]: h,
    },
    ...(s.some((r) => r.ruling.class === "delete" || r.ruling.class === "access_change") && {
      defaultToNo: true,
    }),
    ...(s.some((r) => r.ruling.class === "access_change") && {
      personOnly: true,
    }),
    suppressAlwaysAllowRule: true,
    localDisplayOnly: true,
    decisionReason: {
      type: "safetyCheck",
      reason: joined,
      classifierApprovable: !any,
    },
  };
}
//@ chunk-m79qv8gp.js:15856-16545 placement
function noteApprovedClassAsk(e) {
  if (e.toolUseId === undefined) return;
  let liveState = getLiveState();
  let askClassPending = liveState.askClassPending;
  let s = askClassPending.get(e.toolUseId) ?? [];
  askClassPending.delete(e.toolUseId);
  let o = liveState.askClassPersonAsked.get(e.toolUseId);
  liveState.askClassPersonAsked.delete(e.toolUseId);
  let d = liveState.askClassNoClassifier.get(e.toolUseId);
  liveState.askClassNoClassifier.delete(e.toolUseId);
  let i = repliesAskAnsweredByHuman(e);
  let u =
    !consentMustDeny(e) &&
    !repliesAskAnsweredByOther(e) &&
    (i || o === true || (d === true && !isAutoClassifierActive(getToolPermissionContext(e).mode)));
  if (s[0]?.reachable !== true || s[0].askedIn !== consentEpochKey() || !consentAskCanReachUser(e)) return;
  setBounded(liveState.askClassTaken, e.toolUseId, s);
  if (u) setBounded(liveState.askClassTakenByPerson, e.toolUseId, true);
  if (isDelegatedObservationContext(e.agentContext)) return;
  for (let l of s)
    if (l.remember === "artifact" && (i || !l.endpoint)) {
      recordAskClassConsent(consentClassKey(l), l.slug, u);
      if (!l.endpoint && wasOtherOrgNamed(e, l.slug) && (u || (o !== true && !approvedByHook(e))))
        rememberOutsideOrgConsent(l.slug);
    }
}
//@ chunk-m79qv8gp.js:16545-16582 placement
function classAskStands(e, n, slug) {
  return rememberedClassTaken(e, n, slug);
}
//@ chunk-m79qv8gp.js:16582-16760 placement
function rememberedClassTaken(e, n, t) {
  let s = e.toolUseId === undefined ? undefined : getLiveState().askClassTaken.get(e.toolUseId);
  return (
    s !== undefined &&
    s.some((o) => consentClassKey(o) === n && o.slug === t && o.remember === "artifact") &&
    hasClassConsent(n, t)
  );
}
//@ chunk-m79qv8gp.js:16760-16982 placement
function foreignReadAnsweredByPerson(e, n) {
  let liveState = getLiveState();
  return (
    (e.toolUseId !== undefined &&
      liveState.askClassTakenByPerson.get(e.toolUseId) === true &&
      (liveState.askClassTaken
        .get(e.toolUseId)
        ?.some((o) => consentClassKey(o) === "foreign_read" && o.slug === n) ??
        false)) ||
    repliesAskAnsweredByHuman(e) ||
    hasClassPersonConsent("foreign_read", n)
  );
}
//@ chunk-m79qv8gp.js:16982-17210 placement
function notePersonOnlyReadAskPending(e, slug, url) {
  if (e.toolUseId === undefined) return;
  let liveState = getLiveState();
  setBounded(liveState.askClassPending, e.toolUseId, [
    {
      class: "foreign_read",
      remember: "this_call",
      slug,
      url,
      reachable: consentAskCanReachUser(e),
      askedIn: consentEpochKey(),
    },
  ]);
  setBounded(liveState.askClassPersonAsked, e.toolUseId, true);
}
//@ chunk-m79qv8gp.js:17210-17301 placement
function recordUnaskedRoutineWrite(e, slug) {
  logEvent("tengu_artifact_routine_write_unasked", {
    db_op: fromEnum(e),
    artifact_id: sanitizeMarkName(slug),
  });
}
//@ chunk-m79qv8gp.js:17301-17392 placement
function recordUnaskedCommentWrite(e, slug) {
  logEvent("tengu_artifact_comment_write_unasked", {
    db_op: fromEnum(e),
    artifact_id: sanitizeMarkName(slug),
  });
}
//@ chunk-m79qv8gp.js:17392-17472 placement
function recordUnaskedCommentPublish(slug) {
  logEvent("tengu_artifact_comment_publish_unasked", {
    artifact_id: sanitizeMarkName(slug),
  });
}
//@ chunk-m79qv8gp.js:17472-17524 placement
function noteCommentRepublishedPath(e) {
  getLiveState().commentRepublishedPaths.add(e);
}
//@ chunk-m79qv8gp.js:17524-17576 placement
function noteRoutineRepublishedPath(e) {
  getLiveState().routineRepublishedPaths.add(e);
}
//@ chunk-m79qv8gp.js:17576-17772 placement
function forgetClassAsk(toolUseId) {
  if (toolUseId === undefined) return;
  let liveState = getLiveState();
  liveState.askClassPending.delete(toolUseId);
  liveState.askClassCards.delete(toolUseId);
  liveState.askClassPersonAsked.delete(toolUseId);
  liveState.askClassNoClassifier.delete(toolUseId);
  liveState.askNamedOtherOrg.delete(toolUseId);
}
//@ chunk-m79qv8gp.js:17772-17852 placement
function recordUnaskedRoutineRepublish(slug) {
  logEvent("tengu_artifact_routine_publish_unasked", {
    artifact_id: sanitizeMarkName(slug),
  });
}
//@ chunk-m79qv8gp.js:17852-17908 placement
function quietCapsSwitchOn() {
  return readFlagWithOverride("tengu_proud_honey", {
    safe: false,
  });
}
//@ chunk-m79qv8gp.js:17908-18149 placement
function recordUnaskedQuietCapsPublish(slug, n) {
  let mode = fromEnum(n ?? "absent");
  logEvent("tengu_artifact_quiet_caps_publish_unasked", {
    artifact_id: sanitizeMarkName(slug),
    mode,
  });
  if (n === "owner" || n === "empty") return;
  logFeatureBad("artifact_publish", "quiet_caps_publish_not_owner_only", {
    mode,
  });
  getLiveState().quietCapsCardKept = true;
}
//@ chunk-m79qv8gp.js:18149-18553 placement
function recordUnaskedRoutineFirstPublish(slug, n, t) {
  let mode = fromEnum(n ?? "absent");
  logEvent("tengu_artifact_routine_first_publish_unasked", {
    ...(slug !== undefined && {
      artifact_id: sanitizeMarkName(slug),
    }),
    mode,
    ...(t?.fromType && {
      from_type: true,
    }),
  });
  if (n === "owner" || n === "refused_before_send") return;
  if (n !== "stranded" && n !== "refused_shape" && n !== "unknown_outcome")
    logFeatureBad("artifact_publish", "routine_first_publish_not_owner_only", {
      mode,
      ...(t?.fromType && {
        from_type: true,
      }),
    });
  getLiveState().routineRunTainted = true;
}
//@ chunk-m79qv8gp.js:18553-18708 placement
function recordUnaskedForeignRead(e, slug, t, s) {
  logEvent("tengu_artifact_foreign_read_unasked", {
    action: fromEnum(e),
    artifact_id: sanitizeMarkName(slug),
    ...(t !== undefined && {
      owner_account_id: sanitizeMarkName(t),
    }),
    ...(s && {
      attested: true,
    }),
  });
}
export {
  readClassRuling,
  decideByClass,
  noticeAskFloorDeny,
  othersContentFloorDeny,
  routineRunNobodyJudges,
  commentTurnNobodyJudges,
  classFactsFor,
  writeKeepsFlagOffAsk,
  decideByClasses,
  recordUnaskedRoutineWrite,
  recordUnaskedCommentWrite,
  readKeepsFlagOffAsk,
  recordUnaskedForeignRead,
  factsFromEntry,
  sessionNetworkOff,
  outsideOrgUnaskedWords,
  newArtifactIsPersonsPrivate,
  recordUnaskedRoutineFirstPublish,
  PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS,
  crossOrgCopyOk,
  classAskStands,
  OUTSIDE_ORG_READ_NOTE,
  readAskSentence,
  othersContentHasNoAnswerer,
  readCoverageSentence,
  forgetClassAsk,
  classifierJudges,
  quietCapsSwitchOn,
  shareFacts,
  recordUnaskedRoutineRepublish,
  noteRoutineRepublishedPath,
  recordUnaskedCommentPublish,
  noteCommentRepublishedPath,
  noteApprovedClassAsk,
  outsideOrgReadAdmitted,
  noteRoutineRelayNotCarried,
  recordUnaskedQuietCapsPublish,
  PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS,
  outsideOrgYesStands,
};
