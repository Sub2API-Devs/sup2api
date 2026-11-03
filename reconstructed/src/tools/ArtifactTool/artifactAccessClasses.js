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
import { mn, op } from "../../utils/remoteEnvironment.js";
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
import { fGs, _qn, hasOtherRecentCommentRead, mGs } from "../../services/artifacts/commentReads.js";
import { ARTIFACT_COMMENTS_TOOL_NAME, ARTIFACT_TOOL_NAME } from "./constants.js";
import { toParentArtifactInput } from "../../services/artifacts/artifactToolActions.js";
import {
  classifyArtifactConsent,
  Hte,
  Res,
  rememberConsentForAsk,
  $it,
  recordNamedOtherOrgs,
  recordAskClassConsent,
  iRt,
  wasOtherOrgNamed,
  Iyi,
  b3,
  z5t,
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
import { setBounded, P } from "./artifactAskMessages.js";
import { isDelegatedObservationContext } from "../../utils/agentContext.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-m79qv8gp.js:5235-5384 placement
function shareFacts(e, n) {
  let t = getShareEntry(e);
  return probeAnswered(t, n.toolUseId)
    ? factsFromEntry(t)
    : {
        owned: void 0,
        public: void 0,
        outsideOrg: outsideOrgRead(t) || W(),
        invitedByOtherOrg: t?.external === !0,
      };
}
//@ chunk-m79qv8gp.js:5384-5839 placement
function factsFromEntry(e) {
  let n = e?.external === !0;
  if (e === void 0 || e.probeFailed === !0)
    return { owned: void 0, public: void 0, outsideOrg: outsideOrgRead(e) || W(), invitedByOtherOrg: n };
  let t = e.mode === "unknown" ? void 0 : e.mode === "public",
    s = outsideOrgRead(e);
  if (e.role === void 0)
    return { owned: t === !0 ? !1 : void 0, public: t, outsideOrg: s, invitedByOtherOrg: n };
  return {
    owned: e.role === "unknown" ? void 0 : e.role === "owner",
    public: t,
    outsideOrg: s,
    invitedByOtherOrg: n,
    ...((e.role === "owner" || e.role === "writer") && { canWrite: !0 }),
  };
}
//@ chunk-m79qv8gp.js:5839-5874 placement
function W() {
  return isFramePublicReadEnabled() ? void 0 : !1;
}
//@ chunk-m79qv8gp.js:5874-6129 placement
function classFactsFor(e, n, t) {
  let s = shareFacts(n.slug, t);
  return {
    operation: e,
    artifactId: n.slug,
    owned: s.owned,
    public: s.public,
    outsideOrg: s.outsideOrg,
    invitedByOtherOrg: s.invitedByOtherOrg,
    networkOff: sessionNetworkOff(n),
    turnStartedByHuman: isStrictHumanTurn(t.messages),
    ...(s.canWrite === !0 && { canWrite: !0 }),
  };
}
//@ chunk-m79qv8gp.js:6129-6187 placement
var se = new Set(["scheduled", "retry", "catch_up", "manual"]);
//@ chunk-m79qv8gp.js:6187-6316 placement
function isScheduledTriggerFire(e) {
  return (
    e?.kind === "task-notification" &&
    e.subkind === "scheduled-trigger" &&
    e.fireReason !== void 0 &&
    se.has(e.fireReason)
  );
}
//@ chunk-m79qv8gp.js:6316-6520 placement
function routineRunNobodyJudges(e) {
  if (classifierJudges(e)) return !1;
  if (!isScheduledTriggerFire(analyzeTurnTail(e.messages).decider?.origin)) return !1;
  let n = getLiveState();
  if (
    !n.routineRunTainted &&
    !allUserTurnsSatisfy(e.messages, (t, s) => isHumanTurn(s) || isScheduledTriggerFire(t))
  )
    n.routineRunTainted = !0;
  return !n.routineRunTainted;
}
//@ chunk-m79qv8gp.js:6520-6649 placement
function newArtifactIsPersonsPrivate() {
  if (getFrameHostOverride() !== void 0) return !1;
  if (mn()) return frameRelayBinds() && routineRelayCarried() && isAccountIngressToken();
  return (
    !op() &&
    isCoworkFramePublishSession() &&
    getAPIProvider() === "firstParty" &&
    getClaudeAIOAuthTokenOrigin() === "env"
  );
}
//@ chunk-m79qv8gp.js:6649-6708 placement
function B() {
  return relayFamily("POST", "/api/frame/deploy/direct");
}
//@ chunk-m79qv8gp.js:6708-6767 placement
function q(e) {
  return getLiveState().frameRelay.servedUntil.get(e) ?? 0;
}
//@ chunk-m79qv8gp.js:6767-6889 placement
function routineRelayCarried() {
  let e = B();
  if (e === null || relayDeclined(e)) return !1;
  let routineRelayNotCarried = getLiveState().routineRelayNotCarried;
  return routineRelayNotCarried === null || q(e) > routineRelayNotCarried.servedUntil;
}
//@ chunk-m79qv8gp.js:6889-6972 placement
function noteRoutineRelayNotCarried() {
  let e = B();
  getLiveState().routineRelayNotCarried = { servedUntil: e === null ? 0 : q(e) };
}
//@ chunk-m79qv8gp.js:6972-7058 placement
function classifierJudges(e) {
  let { mode: mode, modeBeforeRewrite: modeBeforeRewrite } = getToolPermissionContext(e);
  return (
    isAutoClassifierActive(mode) ||
    (modeBeforeRewrite !== void 0 && isAutoClassifierActive(modeBeforeRewrite))
  );
}
//@ chunk-m79qv8gp.js:7058-7490 placement
function commentTurnNobodyJudges(e, n) {
  if (classifierJudges(e)) return !1;
  let { messages: messages } = e,
    decider = analyzeTurnTail(messages).decider;
  if (
    decider === null ||
    messages[decider.index]?.type !== "user" ||
    decider.origin?.kind !== "task-notification"
  )
    return !1;
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
        u.type === "user" && i?.kind === "task-notification" && i.subkind === void 0 && fGs(u.uuid) === n,
    ) && hasArtifactCallSinceUserTurn(sliced, n)
  );
}
/**
 * 用户回合后是否已有 artifact 调用。
 */
//@ chunk-m79qv8gp.js:7490-7883 placement
function hasArtifactCallSinceUserTurn(e, n) {
  let t = e[0] === void 0 ? NaN : Date.parse(e[0].timestamp),
    s = _qn();
  if (s !== void 0 && !(Number.isFinite(t) && s < t)) return !1;
  if (hasOtherRecentCommentRead(n, t)) return !1;
  let o = !1;
  for (let d of e) {
    if (d?.type !== "assistant" || !Array.isArray(d.message.content)) continue;
    for (let i of d.message.content)
      if (i.type === "tool_use" && isCommentsAction(i.name, i.input)) {
        let u = mGs(i.id);
        if (u?.ownWordsOnly !== !0 || u.slug !== n) return !1;
        o = !0;
      }
  }
  return o;
}
//@ chunk-m79qv8gp.js:7883-8021 placement
function isCommentsAction(e, n) {
  let t =
    e === ARTIFACT_COMMENTS_TOOL_NAME
      ? toParentArtifactInput("comments", n)
      : e === ARTIFACT_TOOL_NAME
        ? n
        : void 0;
  return typeof t === "object" && t !== null && "action" in t && t.action === "comments";
}
//@ chunk-m79qv8gp.js:8021-8032 placement
var PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS = !0;
//@ chunk-m79qv8gp.js:8032-8112 placement
function writeKeepsFlagOffAsk(e, n) {
  return (
    (e.ask && e.basis === "unattended") ||
    (PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS && getToolPermissionContext(n).mode === "plan")
  );
}
//@ chunk-m79qv8gp.js:8112-8123 placement
var PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS = !0;
//@ chunk-m79qv8gp.js:8123-8170 placement
function readKeepsFlagOffAsk(e) {
  return PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS && getToolPermissionContext(e).mode === "plan";
}
//@ chunk-m79qv8gp.js:8170-8246 placement = isFileReadDenied (1)
function readClassRuling(e, n, t, s, o = () => classifyArtifactConsent(classFactsFor("read", n, e))) {
  return !t && s && !readKeepsFlagOffAsk(e) ? o() : null;
}
//@ chunk-m79qv8gp.js:8246-8279 placement
function K(e) {
  return isCoworkFramePublishSession() && consentMustDeny(e);
}
//@ chunk-m79qv8gp.js:8279-9111 placement
function noticeAskFloorDeny(e, n, t) {
  let s = K(e) && !isStrictHumanTurn(e.messages);
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
      classifierApprovable: !1,
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
      classifierApprovable: !1,
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
/**
 * artifact 询问文案常量。
 */
//@ chunk-m79qv8gp.js:9687-10225 placement
var ARTIFACT_ASK_TEXT = "this artifact",
  de = "no one was asked first \u2014 nothing was returned; retry the same action so the user is asked",
  ue = "no one can be asked about it in this session \u2014 nothing was returned; do not retry it here",
  le =
    "a PermissionRequest hook answered the permission prompt in the user's place; only the user's own approval allows this read \u2014 nothing was returned; do not retry it here, and tell the user their hook answered for them (to approve it themselves they would narrow the hook so it no longer answers this prompt)";
//@ chunk-m79qv8gp.js:10225-10444 placement
function outsideOrgReadAdmitted(e, n, t, s) {
  if (foreignReadAnsweredByPerson(n, t)) return !0;
  if (
    Hte(
      artifactFilesConsentSlugs(n),
      s === "page" ? "artifactReadConsentSlugs" : "artifactAssetReadHumanConsentSlugs",
      t,
    )
  )
    return !0;
  if (consentMustDeny(n) || repliesAskAnsweredByOther(n)) return !1;
  return (
    consentWasHumanEarned(e, n) ||
    (!isAutoClassifierActive(getToolPermissionContext(n).mode) &&
      !isClassifierDecision(e) &&
      consentAskReachedUser(e, n))
  );
}
//@ chunk-m79qv8gp.js:10444-10575 placement
function approvedByHook(e) {
  let n = e.toolUseId === void 0 ? void 0 : e.toolDecisions?.get(e.toolUseId);
  return n?.source === "hook" && n.decision !== "reject";
}
//@ chunk-m79qv8gp.js:10575-11326 placement
function outsideOrgUnaskedWords(e, n = !1, t) {
  let s = approvedByHook(e),
    o = n
      ? !consentAskCanReachUser(e) ||
        (consentMustDeny(e) && !isAutoClassifierActive(getToolPermissionContext(e).mode))
      : consentMustDeny(e);
  if (!n)
    return `this turned out to be a public artifact from outside your organization, and ${o ? ue : s ? le : de}`;
  let d = t === void 0 ? "nothing was copied" : "nothing was published",
    i =
      t === void 0
        ? "Retry the same action so that question is asked."
        : t.retryUrl !== void 0
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
  return Res(n) || Hte(artifactFilesConsentSlugs(e), "artifactOutsideOrgConsentSlugs", n);
}
//@ chunk-m79qv8gp.js:11568-11631 placement
var OUTSIDE_ORG_READ_NOTE = "This artifact was created outside your organization.";
//@ chunk-m79qv8gp.js:11631-12023 placement
function readAskSentence(e, n, t) {
  let s = artifactCardTitle(n),
    o = s ? `"${s}"` : ARTIFACT_ASK_TEXT,
    d = s ? `"${s}"` : "This artifact",
    i = `Let Claude read it${t ? ` and ${t}` : ""}?`;
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
function askQuestionWithScope(e, n, t) {
  let s = artifactAskQuestion(e, n, t);
  if (e.remember !== "artifact") return s;
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
/**
 * 按访问类别生成询问用户的问题（删除、公开修改等）。
 */
//@ chunk-m79qv8gp.js:12435-13227 placement
function artifactAskQuestion(e, n, t) {
  let s = artifactCardTitle(n),
    o = s ? `"${s}"` : ARTIFACT_ASK_TEXT,
    d = s ? `"${s}"` : "This artifact";
  switch (e.class) {
    case "delete":
      return `Permanently delete ${s || t === void 0 ? o : t}?`;
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
function ge(e) {
  return e.about === "outside_org" ? OUTSIDE_ORG_READ_NOTE : void 0;
}
//@ chunk-m79qv8gp.js:13284-13333 placement
function decideByClass(e) {
  return decideByClasses(e.input, e.context, [e]);
}
//@ chunk-m79qv8gp.js:13333-15856 placement
function decideByClasses(e, n, t) {
  if (n.toolUseId !== void 0)
    (getLiveState().askClassPending.delete(n.toolUseId), getLiveState().askClassCards.delete(n.toolUseId));
  let s = [];
  for (let r of t)
    if (!r.ruling.ask) {
      if (r.ruling.foreignRead)
        recordUnaskedForeignRead(r.action, r.slug, r.ownerAccountId, r.ruling.attested);
    } else if (
      r.ruling.remember !== "artifact" ||
      !(r.consentHeld ?? rememberConsentForAsk(r.ruling, r.slug, r.userOnly === !0)) ||
      r.heldYesDoesNotCover === !0
    )
      s.push({ ...r, ruling: r.ruling });
  if (s.length === 0) return { behavior: "allow", updatedInput: { ...e, [CONSENT_ASK_TAG]: !1 } };
  let o = (r) => r.ruling.answeredBy === "person" || r.userOnly === !0;
  s.sort((r, k) => Number(o(k)) - Number(o(r)));
  let any = s.some(o),
    mapped = s.map((r) => ({
      display: r.display,
      question: askQuestionWithScope(r.ruling, r.display.title, r.display.url),
      note: ge(r.ruling),
      linked:
        r.ruling.class === "foreign_read" ||
        r.ruling.about === "someone_else" ||
        r.ruling.missing === "owned",
      reach: r.note,
    })),
    joined = mapped.flatMap((r) => (r.reach === void 0 ? [r.question] : [r.question, r.reach])).join(" ");
  if (
    any
      ? consentMustDeny(n)
      : planConsentMustDeny(n) || (s.some((r) => r.ruling.class === "foreign_read") && K(n))
  )
    return {
      behavior: "deny",
      message: `Nothing was done. This needs a yes to: ${mapped.map((r) => r.question).join(" ")} No one can answer in this session.`,
      decisionReason: {
        type: "safetyCheck",
        reason: `Artifact ${s.map((r) => r.ruling.class).join(", ")} ask has no one to answer it`,
        classifierApprovable: !1,
      },
    };
  let p = consentAskCanReachUser(n),
    g = $it(),
    mapped_2 = s.map((r) => ({
      class: r.ruling.class,
      remember: r.ruling.remember,
      ...(r.ruling.endpoint && { endpoint: !0 }),
      slug: r.slug,
      url: r.display.url,
      ...(r.display.title !== void 0 && { title: r.display.title }),
      reachable: p,
      askedIn: g,
    }));
  recordNamedOtherOrgs(
    n,
    s
      .filter((r) => "about" in r.ruling && r.ruling.about === "outside_org" && !r.ruling.endpoint)
      .map((r) => r.slug),
    p,
  );
  let h = mapped_2.length === 1 ? mapped_2[0] : mapped_2;
  if (n.toolUseId !== void 0) {
    if ((setBounded(getLiveState().askClassPending, n.toolUseId, mapped_2), any))
      setBounded(getLiveState().askClassPersonAsked, n.toolUseId, !0);
    else getLiveState().askClassPersonAsked.delete(n.toolUseId);
    if (isAutoClassifierActive(getToolPermissionContext(n).mode))
      getLiveState().askClassNoClassifier.delete(n.toolUseId);
    else setBounded(getLiveState().askClassNoClassifier, n.toolUseId, !0);
    let r = P(h);
    if (r !== void 0) {
      let flattened = mapped.flatMap(
        ({ display: display, question: question, note: note, linked: linked, reach: reach }) => [
          question,
          ...(note === void 0 ? [] : [note]),
          ...(question.includes(display.url) || (!linked && artifactCardTitle(display.title))
            ? []
            : [display.url]),
          ...(reach === void 0 ? [] : [reach]),
        ],
      );
      setBounded(getLiveState().askClassCards, n.toolUseId, {
        stamp: r,
        parts: flattened,
        saysPublic: s.some((y) => isPersonPublicChange(y.ruling)),
        reason: joined,
      });
    }
  }
  return {
    behavior: "ask",
    message: joined,
    updatedInput: { ...e, [CONSENT_ASK_TAG]: !1, [ARTIFACT_ASK_TAG]: h },
    ...(s.some((r) => r.ruling.class === "delete" || r.ruling.class === "access_change") && {
      defaultToNo: !0,
    }),
    ...(s.some((r) => r.ruling.class === "access_change") && { personOnly: !0 }),
    suppressAlwaysAllowRule: !0,
    localDisplayOnly: !0,
    decisionReason: { type: "safetyCheck", reason: joined, classifierApprovable: !any },
  };
}
//@ chunk-m79qv8gp.js:15856-16545 placement
function noteApprovedClassAsk(e) {
  if (e.toolUseId === void 0) return;
  let n = getLiveState(),
    askClassPending = n.askClassPending,
    s = askClassPending.get(e.toolUseId) ?? [];
  askClassPending.delete(e.toolUseId);
  let o = n.askClassPersonAsked.get(e.toolUseId);
  n.askClassPersonAsked.delete(e.toolUseId);
  let d = n.askClassNoClassifier.get(e.toolUseId);
  n.askClassNoClassifier.delete(e.toolUseId);
  let i = repliesAskAnsweredByHuman(e),
    u =
      !consentMustDeny(e) &&
      !repliesAskAnsweredByOther(e) &&
      (i || o === !0 || (d === !0 && !isAutoClassifierActive(getToolPermissionContext(e).mode)));
  if (s[0]?.reachable !== !0 || s[0].askedIn !== $it() || !consentAskCanReachUser(e)) return;
  if ((setBounded(n.askClassTaken, e.toolUseId, s), u)) setBounded(n.askClassTakenByPerson, e.toolUseId, !0);
  if (isDelegatedObservationContext(e.agentContext)) return;
  for (let l of s)
    if (l.remember === "artifact" && (i || !l.endpoint)) {
      if (
        (recordAskClassConsent(iRt(l), l.slug, u),
        !l.endpoint && wasOtherOrgNamed(e, l.slug) && (u || (o !== !0 && !approvedByHook(e))))
      )
        Iyi(l.slug);
    }
}
//@ chunk-m79qv8gp.js:16545-16582 placement
function classAskStands(e, n, t) {
  return rememberedClassTaken(e, n, t);
}
//@ chunk-m79qv8gp.js:16582-16760 placement
function rememberedClassTaken(e, n, t) {
  let s = e.toolUseId === void 0 ? void 0 : getLiveState().askClassTaken.get(e.toolUseId);
  return s !== void 0 && s.some((o) => iRt(o) === n && o.slug === t && o.remember === "artifact") && b3(n, t);
}
//@ chunk-m79qv8gp.js:16760-16982 placement
function foreignReadAnsweredByPerson(e, n) {
  let t = getLiveState();
  return (
    (e.toolUseId !== void 0 &&
      t.askClassTakenByPerson.get(e.toolUseId) === !0 &&
      (t.askClassTaken.get(e.toolUseId)?.some((o) => iRt(o) === "foreign_read" && o.slug === n) ?? !1)) ||
    repliesAskAnsweredByHuman(e) ||
    z5t("foreign_read", n)
  );
}
//@ chunk-m79qv8gp.js:16982-17210 placement
function notePersonOnlyReadAskPending(e, n, t) {
  if (e.toolUseId === void 0) return;
  let s = getLiveState();
  (setBounded(s.askClassPending, e.toolUseId, [
    {
      class: "foreign_read",
      remember: "this_call",
      slug: n,
      url: t,
      reachable: consentAskCanReachUser(e),
      askedIn: $it(),
    },
  ]),
    setBounded(s.askClassPersonAsked, e.toolUseId, !0));
}
//@ chunk-m79qv8gp.js:17210-17301 placement
function recordUnaskedRoutineWrite(e, n) {
  logEvent("tengu_artifact_routine_write_unasked", { db_op: fromEnum(e), artifact_id: ye(n) });
}
//@ chunk-m79qv8gp.js:17301-17392 placement
function recordUnaskedCommentWrite(e, n) {
  logEvent("tengu_artifact_comment_write_unasked", { db_op: fromEnum(e), artifact_id: ye(n) });
}
//@ chunk-m79qv8gp.js:17392-17472 placement
function recordUnaskedCommentPublish(e) {
  logEvent("tengu_artifact_comment_publish_unasked", { artifact_id: ye(e) });
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
function forgetClassAsk(e) {
  if (e === void 0) return;
  let n = getLiveState();
  (n.askClassPending.delete(e),
    n.askClassCards.delete(e),
    n.askClassPersonAsked.delete(e),
    n.askClassNoClassifier.delete(e),
    n.askNamedOtherOrg.delete(e));
}
//@ chunk-m79qv8gp.js:17772-17852 placement
function recordUnaskedRoutineRepublish(e) {
  logEvent("tengu_artifact_routine_publish_unasked", { artifact_id: ye(e) });
}
//@ chunk-m79qv8gp.js:17852-17908 placement
function quietCapsSwitchOn() {
  return readFlagWithOverride("tengu_proud_honey", { safe: !1 });
}
//@ chunk-m79qv8gp.js:17908-18149 placement
function recordUnaskedQuietCapsPublish(e, n) {
  let t = fromEnum(n ?? "absent");
  if (
    (logEvent("tengu_artifact_quiet_caps_publish_unasked", { artifact_id: ye(e), mode: t }),
    n === "owner" || n === "empty")
  )
    return;
  (logFeatureBad("artifact_publish", "quiet_caps_publish_not_owner_only", { mode: t }),
    (getLiveState().quietCapsCardKept = !0));
}
//@ chunk-m79qv8gp.js:18149-18553 placement
function recordUnaskedRoutineFirstPublish(e, n, t) {
  let s = fromEnum(n ?? "absent");
  if (
    (logEvent("tengu_artifact_routine_first_publish_unasked", {
      ...(e !== void 0 && { artifact_id: ye(e) }),
      mode: s,
      ...(t?.fromType && { from_type: !0 }),
    }),
    n === "owner" || n === "refused_before_send")
  )
    return;
  if (n !== "stranded" && n !== "refused_shape" && n !== "unknown_outcome")
    logFeatureBad("artifact_publish", "routine_first_publish_not_owner_only", {
      mode: s,
      ...(t?.fromType && { from_type: !0 }),
    });
  getLiveState().routineRunTainted = !0;
}
//@ chunk-m79qv8gp.js:18553-18708 placement
function recordUnaskedForeignRead(e, n, t, s) {
  logEvent("tengu_artifact_foreign_read_unasked", {
    action: fromEnum(e),
    artifact_id: ye(n),
    ...(t !== void 0 && { owner_account_id: ye(t) }),
    ...(s && { attested: !0 }),
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
