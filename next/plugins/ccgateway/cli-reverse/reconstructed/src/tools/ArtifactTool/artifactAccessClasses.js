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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m79qv8gp.js:5235-5384 placement
function shareFacts(slug, context) {
  let shareEntry = getShareEntry(slug);
  return probeAnswered(shareEntry, context.toolUseId)
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
  let isPublic = shareEntry.mode === "unknown" ? undefined : shareEntry.mode === "public";
  let outsideOrg = outsideOrgRead(shareEntry);
  if (shareEntry.role === undefined)
    return {
      owned: isPublic === true ? false : undefined,
      public: isPublic,
      outsideOrg,
      invitedByOtherOrg,
    };
  return {
    owned: shareEntry.role === "unknown" ? undefined : shareEntry.role === "owner",
    public: isPublic,
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
function classFactsFor(operation, target, context) {
  let facts = shareFacts(target.slug, context);
  return {
    operation,
    artifactId: target.slug,
    owned: facts.owned,
    public: facts.public,
    outsideOrg: facts.outsideOrg,
    invitedByOtherOrg: facts.invitedByOtherOrg,
    networkOff: sessionNetworkOff(target),
    turnStartedByHuman: isStrictHumanTurn(context.messages),
    ...(facts.canWrite === true && {
      canWrite: true,
    }),
  };
}
//@ chunk-m79qv8gp.js:6129-6187 placement
/**
 * 定时触发允许的原因取值。
 */
var SCHEDULED_TRIGGER_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-m79qv8gp.js:6129", () => {
  SCHEDULED_TRIGGER_REASONS = new Set(["scheduled", "retry", "catch_up", "manual"]);
});
//@ chunk-m79qv8gp.js:6187-6316 placement
function isScheduledTriggerFire(origin) {
  return (
    origin?.kind === "task-notification" &&
    origin.subkind === "scheduled-trigger" &&
    origin.fireReason !== undefined &&
    SCHEDULED_TRIGGER_REASONS.has(origin.fireReason)
  );
}
//@ chunk-m79qv8gp.js:6316-6520 placement
function routineRunNobodyJudges(context) {
  if (classifierJudges(context)) return false;
  if (!isScheduledTriggerFire(analyzeTurnTail(context.messages).decider?.origin)) return false;
  let liveState = getLiveState();
  if (
    !liveState.routineRunTainted &&
    !allUserTurnsSatisfy(
      context.messages,
      (origin, message) => isHumanTurn(message) || isScheduledTriggerFire(origin),
    )
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
function relayServedUntil(family) {
  return getLiveState().frameRelay.servedUntil.get(family) ?? 0;
}
//@ chunk-m79qv8gp.js:6767-6889 placement
function routineRelayCarried() {
  let family = directDeployRelayFamily();
  if (family === null || relayDeclined(family)) return false;
  let routineRelayNotCarried = getLiveState().routineRelayNotCarried;
  return routineRelayNotCarried === null || relayServedUntil(family) > routineRelayNotCarried.servedUntil;
}
//@ chunk-m79qv8gp.js:6889-6972 placement
function noteRoutineRelayNotCarried() {
  let family = directDeployRelayFamily();
  getLiveState().routineRelayNotCarried = {
    servedUntil: family === null ? 0 : relayServedUntil(family),
  };
}
//@ chunk-m79qv8gp.js:6972-7058 placement
function classifierJudges(context) {
  let { mode, modeBeforeRewrite } = getToolPermissionContext(context);
  return (
    isAutoClassifierActive(mode) ||
    (modeBeforeRewrite !== undefined && isAutoClassifierActive(modeBeforeRewrite))
  );
}
//@ chunk-m79qv8gp.js:7058-7490 placement
function commentTurnNobodyJudges(context, slug) {
  if (classifierJudges(context)) return false;
  let { messages } = context;
  let decider = analyzeTurnTail(messages).decider;
  if (
    decider === null ||
    messages[decider.index]?.type !== "user" ||
    decider.origin?.kind !== "task-notification"
  )
    return false;
  let index = decider.index;
  for (; index > 0; index--) {
    let message = messages[index - 1];
    if (
      message == null ||
      message.type === "assistant" ||
      (message.type === "user" &&
        !isToolResultMessage(message) &&
        message.origin?.kind !== "task-notification")
    )
      break;
  }
  let messages_2 = messages.slice(index);
  return (
    allUserTurnsSatisfy(
      messages_2,
      (origin, message) =>
        message.type === "user" &&
        origin?.kind === "task-notification" &&
        origin.subkind === undefined &&
        laneNoticeSlug(message.uuid) === slug,
    ) && hasArtifactCallSinceUserTurn(messages_2, slug)
  );
}
//@ chunk-m79qv8gp.js:7490-7883 placement
/**
 * 用户回合后是否已有 artifact 调用。
 */
function hasArtifactCallSinceUserTurn(messages, slug) {
  let firstTimestamp = messages[0] === undefined ? NaN : Date.parse(messages[0].timestamp);
  let lastReadAt = lastOthersCommentReadAt();
  if (lastReadAt !== undefined && !(Number.isFinite(firstTimestamp) && lastReadAt < firstTimestamp))
    return false;
  if (hasOtherRecentCommentRead(slug, firstTimestamp)) return false;
  let found = false;
  for (let message of messages) {
    if (message?.type !== "assistant" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (block.type === "tool_use" && isCommentsAction(block.name, block.input)) {
        let read = commentReadFor(block.id);
        if (read?.ownWordsOnly !== true || read.slug !== slug) return false;
        found = true;
      }
  }
  return found;
}
//@ chunk-m79qv8gp.js:7883-8021 placement
function isCommentsAction(name, input) {
  let artifactInput =
    name === ARTIFACT_COMMENTS_TOOL_NAME
      ? toParentArtifactInput("comments", input)
      : name === ARTIFACT_TOOL_NAME
        ? input
        : undefined;
  return (
    typeof artifactInput === "object" &&
    artifactInput !== null &&
    "action" in artifactInput &&
    artifactInput.action === "comments"
  );
}
//@ chunk-m79qv8gp.js:8021-8032 placement
var PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS = true;
//@ chunk-m79qv8gp.js:8032-8112 placement
function writeKeepsFlagOffAsk(ruling, context) {
  return (
    (ruling.ask && ruling.basis === "unattended") ||
    (PLAN_MODE_KEEPS_FLAG_OFF_WRITE_ASKS && getToolPermissionContext(context).mode === "plan")
  );
}
//@ chunk-m79qv8gp.js:8112-8123 placement
var PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS = true;
//@ chunk-m79qv8gp.js:8123-8170 placement
function readKeepsFlagOffAsk(context) {
  return PLAN_MODE_KEEPS_FLAG_OFF_READ_ASKS && getToolPermissionContext(context).mode === "plan";
}
//@ chunk-m79qv8gp.js:8170-8246 placement (2.1.88 match: isFileReadDenied, 1)
function readClassRuling(
  context,
  target,
  basis,
  allowWhenFlagOff,
  computeRuling = () => classifyArtifactConsent(classFactsFor("read", target, context)),
) {
  return !basis && allowWhenFlagOff && !readKeepsFlagOffAsk(context) ? computeRuling() : null;
}
//@ chunk-m79qv8gp.js:8246-8279 placement
/**
 * 是否处于 Cowork 发布会话且同意必须拒绝。
 */
function isCoworkPublishDenySession(context) {
  return isCoworkFramePublishSession() && consentMustDeny(context);
}
//@ chunk-m79qv8gp.js:8279-9111 placement
function noticeAskFloorDeny(context, outcome, whatNeedsYes) {
  let coworkNoAnswerer = isCoworkPublishDenySession(context) && !isStrictHumanTurn(context.messages);
  if (!coworkNoAnswerer && !planConsentMustDeny(context)) return null;
  let sentence = whatNeedsYes.endsWith(".") ? whatNeedsYes : `${whatNeedsYes}.`;
  return {
    behavior: "deny",
    message: `${outcome}. This needs a yes to: ${sentence} ${coworkNoAnswerer ? "No one can answer that prompt in this Cowork session, and this turn was not started by the user's own message \u2014 tell the user in chat; do not retry it on this turn." : "No one can answer that prompt from plan mode in this session \u2014 keep planning in the plan file and raise it with the user in chat; do not retry while plan mode is on."}`,
    decisionReason: {
      type: "safetyCheck",
      reason: coworkNoAnswerer
        ? "Artifact call with a new-comments notice pending, on a turn the user's own message did not start, in a Cowork session that has no one to answer its prompt"
        : "Notification-triggered artifact call in plan mode has no one to answer its prompt",
      classifierApprovable: false,
    },
  };
}
//@ chunk-m79qv8gp.js:9111-9610 placement
function othersContentFloorDeny(context, outcome, extraNoAnswerer) {
  if (!othersContentHasNoAnswerer(context, extraNoAnswerer)) return null;
  return {
    behavior: "deny",
    message: `${outcome}. Reading content of an artifact the user does not own, or whose ownership couldn't be confirmed, needs a person's yes, and no one can answer the prompt in this session \u2014 tell the user in chat instead of retrying.`,
    decisionReason: {
      type: "safetyCheck",
      reason:
        "Reading content of an artifact that is not confirmed to be the user's own requires a live human consent surface in this session",
      classifierApprovable: false,
    },
  };
}
//@ chunk-m79qv8gp.js:9610-9652 placement
function othersContentHasNoAnswerer(context, extraNoAnswerer) {
  return consentMustDeny(context) && (isCoworkFramePublishSession() || extraNoAnswerer);
}
//@ chunk-m79qv8gp.js:9652-9687 placement
function sessionNetworkOff(context) {
  return isSandboxEgressDisabled(context?.env);
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
function outsideOrgReadAdmitted(ruling, context, slug, surface) {
  if (foreignReadAnsweredByPerson(context, slug)) return true;
  if (
    hasSharedReadConsentClasses(
      artifactFilesConsentSlugs(context),
      surface === "page" ? "artifactReadConsentSlugs" : "artifactAssetReadHumanConsentSlugs",
      slug,
    )
  )
    return true;
  if (consentMustDeny(context) || repliesAskAnsweredByOther(context)) return false;
  return (
    consentWasHumanEarned(ruling, context) ||
    (!isAutoClassifierActive(getToolPermissionContext(context).mode) &&
      !isClassifierDecision(ruling) &&
      consentAskReachedUser(ruling, context))
  );
}
//@ chunk-m79qv8gp.js:10444-10575 placement
function approvedByHook(context) {
  let decision = context.toolUseId === undefined ? undefined : context.toolDecisions?.get(context.toolUseId);
  return decision?.source === "hook" && decision.decision !== "reject";
}
//@ chunk-m79qv8gp.js:10575-11326 placement
function outsideOrgUnaskedWords(ruling, retryable = false, retryInfo) {
  let hookApproved = approvedByHook(ruling);
  let noAnswerer = retryable
    ? !consentAskCanReachUser(ruling) ||
      (consentMustDeny(ruling) && !isAutoClassifierActive(getToolPermissionContext(ruling).mode))
    : consentMustDeny(ruling);
  if (!retryable)
    return `this turned out to be a public artifact from outside your organization, and ${noAnswerer ? NO_ANSWERER_NOTE : hookApproved ? HOOK_ANSWERED_FOR_USER_NOTE : NOT_ASKED_FIRST_NOTE}`;
  let doneNote = retryInfo === undefined ? "nothing was copied" : "nothing was published";
  let retryHint =
    retryInfo === undefined
      ? "Retry the same action so that question is asked."
      : retryInfo.retryUrl !== undefined
        ? `Retry publishing with url: ${jsonStringify(retryInfo.retryUrl)} so that question is asked.`
        : "Retry the same publish so that question is asked.";
  return noAnswerer
    ? `the source artifact belongs to another organization and nobody can be asked about copying from it in this session, so ${doneNote}. Don't retry it here.`
    : `the source artifact belongs to another organization and nobody was asked whether to copy from another organization's artifact, so ${doneNote}. ${retryHint}`;
}
//@ chunk-m79qv8gp.js:11326-11378 placement
function crossOrgCopyOk(ruling, slug, preApproved) {
  return otherOrgCopySource(getShareEntry(slug)) && (preApproved || outsideOrgYesStands(ruling, slug));
}
//@ chunk-m79qv8gp.js:11378-11458 placement
function outsideOrgYesStands(ruling, slug) {
  return (
    hasOutsideOrgConsent(slug) ||
    hasSharedReadConsentClasses(artifactFilesConsentSlugs(ruling), "artifactOutsideOrgConsentSlugs", slug)
  );
}
//@ chunk-m79qv8gp.js:11568-11631 placement
var OUTSIDE_ORG_READ_NOTE = "This artifact was created outside your organization.";
//@ chunk-m79qv8gp.js:11631-12023 placement
function readAskSentence(about, title, extraAction) {
  let cardTitle = artifactCardTitle(title);
  let titleText = cardTitle ? `"${cardTitle}"` : ARTIFACT_ASK_TEXT;
  let subject = cardTitle ? `"${cardTitle}"` : "This artifact";
  let question = `Let Claude read it${extraAction ? ` and ${extraAction}` : ""}?`;
  switch (about) {
    case "someone_else":
      return `${subject} was made by someone else. ${question}`;
    case "unknown":
      return `Claude couldn't check who made ${titleText}. ${question}`;
    case "cowritten":
      return `Other people can edit ${titleText}. ${question}`;
    case "from_type":
      return `${subject} was made from someone else's artifact type. ${question}`;
  }
}
//@ chunk-m79qv8gp.js:12023-12158 placement
function readCoverageSentence(withCopy) {
  return `Approving covers its files${withCopy ? ", and copying them into other artifacts," : ""} for the rest of the conversation.`;
}
//@ chunk-m79qv8gp.js:12158-12316 placement
function askQuestionWithScope(ruling, title, fallbackUrl) {
  let question = artifactAskQuestion(ruling, title, fallbackUrl);
  if (ruling.remember !== "artifact") return question;
  let scopeWord = isCoworkHostSession() ? "task" : "conversation";
  return question.replace(/\?$/, ` for the rest of this ${scopeWord}?`);
}
//@ chunk-m79qv8gp.js:12316-12435 placement
function isPersonPublicChange(ruling) {
  return (
    ruling.class === "public_change" &&
    ruling.basis !== "unattended" &&
    ruling.about !== "someone_else" &&
    ruling.missing !== "public"
  );
}
//@ chunk-m79qv8gp.js:12435-13227 placement
/**
 * 按访问类别生成询问用户的问题（删除、公开修改等）。
 */
function artifactAskQuestion(ruling, title, fallbackUrl) {
  let cardTitle = artifactCardTitle(title);
  let titleText = cardTitle ? `"${cardTitle}"` : ARTIFACT_ASK_TEXT;
  let subject = cardTitle ? `"${cardTitle}"` : "This artifact";
  switch (ruling.class) {
    case "delete":
      return `Permanently delete ${cardTitle || fallbackUrl === undefined ? titleText : fallbackUrl}?`;
    case "public_change":
      if (isPersonPublicChange(ruling)) return `${subject} is public. Allow Claude to change it?`;
      if (ruling.basis === "unattended") return `Allow Claude to change ${titleText}?`;
      if (ruling.about === "someone_else")
        return ruling.missing === "owned"
          ? `Claude couldn't check who made ${titleText}. Allow Claude to change it?`
          : `${subject} was made by someone else. Allow Claude to change it?`;
      return `Claude couldn't check who can see ${titleText}. Allow Claude to change it?`;
    case "access_change":
      return `Allow Claude to change who can open or comment on ${titleText}?`;
    case "standing_job":
      return `Allow Claude to keep replying to comments on ${titleText}?`;
    case "foreign_read":
      return readAskSentence(ruling.missing === "owned" ? "unknown" : "someone_else", title);
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
function decideByClass(entry) {
  return decideByClasses(entry.input, entry.context, [entry]);
}
//@ chunk-m79qv8gp.js:13333-15856 placement
function decideByClasses(input, context, entries) {
  if (context.toolUseId !== undefined) {
    getLiveState().askClassPending.delete(context.toolUseId);
    getLiveState().askClassCards.delete(context.toolUseId);
  }
  let askEntries = [];
  for (let entry of entries)
    if (!entry.ruling.ask) {
      if (entry.ruling.foreignRead)
        recordUnaskedForeignRead(entry.action, entry.slug, entry.ownerAccountId, entry.ruling.attested);
    } else if (
      entry.ruling.remember !== "artifact" ||
      !(entry.consentHeld ?? rememberConsentForAsk(entry.ruling, entry.slug, entry.userOnly === true)) ||
      entry.heldYesDoesNotCover === true
    )
      askEntries.push({
        ...entry,
        ruling: entry.ruling,
      });
  if (askEntries.length === 0)
    return {
      behavior: "allow",
      updatedInput: {
        ...input,
        [CONSENT_ASK_TAG]: false,
      },
    };
  let answeredByPerson = (entry) => entry.ruling.answeredBy === "person" || entry.userOnly === true;
  askEntries.sort((left, right) => Number(answeredByPerson(right)) - Number(answeredByPerson(left)));
  let any = askEntries.some(answeredByPerson);
  let mapped = askEntries.map((entry) => ({
    display: entry.display,
    question: askQuestionWithScope(entry.ruling, entry.display.title, entry.display.url),
    note: outsideOrgNote(entry.ruling),
    linked:
      entry.ruling.class === "foreign_read" ||
      entry.ruling.about === "someone_else" ||
      entry.ruling.missing === "owned",
    reach: entry.note,
  }));
  let joined = mapped
    .flatMap((entry) => (entry.reach === undefined ? [entry.question] : [entry.question, entry.reach]))
    .join(" ");
  if (
    any
      ? consentMustDeny(context)
      : planConsentMustDeny(context) ||
        (askEntries.some((entry) => entry.ruling.class === "foreign_read") &&
          isCoworkPublishDenySession(context))
  )
    return {
      behavior: "deny",
      message: `Nothing was done. This needs a yes to: ${mapped.map((entry) => entry.question).join(" ")} No one can answer in this session.`,
      decisionReason: {
        type: "safetyCheck",
        reason: `Artifact ${askEntries.map((entry) => entry.ruling.class).join(", ")} ask has no one to answer it`,
        classifierApprovable: false,
      },
    };
  let canReachUser = consentAskCanReachUser(context);
  let askedIn = consentEpochKey();
  let mapped_2 = askEntries.map((entry) => ({
    class: entry.ruling.class,
    remember: entry.ruling.remember,
    ...(entry.ruling.endpoint && {
      endpoint: true,
    }),
    slug: entry.slug,
    url: entry.display.url,
    ...(entry.display.title !== undefined && {
      title: entry.display.title,
    }),
    reachable: canReachUser,
    askedIn,
  }));
  recordNamedOtherOrgs(
    context,
    askEntries
      .filter(
        (entry) => "about" in entry.ruling && entry.ruling.about === "outside_org" && !entry.ruling.endpoint,
      )
      .map((entry) => entry.slug),
    canReachUser,
  );
  let cardValue = mapped_2.length === 1 ? mapped_2[0] : mapped_2;
  if (context.toolUseId !== undefined) {
    setBounded(getLiveState().askClassPending, context.toolUseId, mapped_2);
    if (any) setBounded(getLiveState().askClassPersonAsked, context.toolUseId, true);
    else getLiveState().askClassPersonAsked.delete(context.toolUseId);
    if (isAutoClassifierActive(getToolPermissionContext(context).mode))
      getLiveState().askClassNoClassifier.delete(context.toolUseId);
    else setBounded(getLiveState().askClassNoClassifier, context.toolUseId, true);
    let stamp = hashOfIfPossible(cardValue);
    if (stamp !== undefined) {
      let parts = mapped.flatMap(({ display, question, note, linked, reach }) => [
        question,
        ...(note === undefined ? [] : [note]),
        ...(question.includes(display.url) || (!linked && artifactCardTitle(display.title))
          ? []
          : [display.url]),
        ...(reach === undefined ? [] : [reach]),
      ]);
      setBounded(getLiveState().askClassCards, context.toolUseId, {
        stamp,
        parts,
        saysPublic: askEntries.some((entry) => isPersonPublicChange(entry.ruling)),
        reason: joined,
      });
    }
  }
  return {
    behavior: "ask",
    message: joined,
    updatedInput: {
      ...input,
      [CONSENT_ASK_TAG]: false,
      [ARTIFACT_ASK_TAG]: cardValue,
    },
    ...(askEntries.some(
      (entry) => entry.ruling.class === "delete" || entry.ruling.class === "access_change",
    ) && {
      defaultToNo: true,
    }),
    ...(askEntries.some((entry) => entry.ruling.class === "access_change") && {
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
function noteApprovedClassAsk(context) {
  if (context.toolUseId === undefined) return;
  let liveState = getLiveState();
  let askClassPending = liveState.askClassPending;
  let pending = askClassPending.get(context.toolUseId) ?? [];
  askClassPending.delete(context.toolUseId);
  let personAsked = liveState.askClassPersonAsked.get(context.toolUseId);
  liveState.askClassPersonAsked.delete(context.toolUseId);
  let noClassifier = liveState.askClassNoClassifier.get(context.toolUseId);
  liveState.askClassNoClassifier.delete(context.toolUseId);
  let repliesByHuman = repliesAskAnsweredByHuman(context);
  let takenByPerson =
    !consentMustDeny(context) &&
    !repliesAskAnsweredByOther(context) &&
    (repliesByHuman ||
      personAsked === true ||
      (noClassifier === true && !isAutoClassifierActive(getToolPermissionContext(context).mode)));
  if (
    pending[0]?.reachable !== true ||
    pending[0].askedIn !== consentEpochKey() ||
    !consentAskCanReachUser(context)
  )
    return;
  setBounded(liveState.askClassTaken, context.toolUseId, pending);
  if (takenByPerson) setBounded(liveState.askClassTakenByPerson, context.toolUseId, true);
  if (isDelegatedObservationContext(context.agentContext)) return;
  for (let entry of pending)
    if (entry.remember === "artifact" && (repliesByHuman || !entry.endpoint)) {
      recordAskClassConsent(consentClassKey(entry), entry.slug, takenByPerson);
      if (
        !entry.endpoint &&
        wasOtherOrgNamed(context, entry.slug) &&
        (takenByPerson || (personAsked !== true && !approvedByHook(context)))
      )
        rememberOutsideOrgConsent(entry.slug);
    }
}
//@ chunk-m79qv8gp.js:16545-16582 placement
function classAskStands(context, classKey, slug) {
  return rememberedClassTaken(context, classKey, slug);
}
//@ chunk-m79qv8gp.js:16582-16760 placement
function rememberedClassTaken(context, classKey, slug) {
  let taken =
    context.toolUseId === undefined ? undefined : getLiveState().askClassTaken.get(context.toolUseId);
  return (
    taken !== undefined &&
    taken.some(
      (entry) => consentClassKey(entry) === classKey && entry.slug === slug && entry.remember === "artifact",
    ) &&
    hasClassConsent(classKey, slug)
  );
}
//@ chunk-m79qv8gp.js:16760-16982 placement
function foreignReadAnsweredByPerson(context, slug) {
  let liveState = getLiveState();
  return (
    (context.toolUseId !== undefined &&
      liveState.askClassTakenByPerson.get(context.toolUseId) === true &&
      (liveState.askClassTaken
        .get(context.toolUseId)
        ?.some((entry) => consentClassKey(entry) === "foreign_read" && entry.slug === slug) ??
        false)) ||
    repliesAskAnsweredByHuman(context) ||
    hasClassPersonConsent("foreign_read", slug)
  );
}
//@ chunk-m79qv8gp.js:16982-17210 placement
function notePersonOnlyReadAskPending(context, slug, url) {
  if (context.toolUseId === undefined) return;
  let liveState = getLiveState();
  setBounded(liveState.askClassPending, context.toolUseId, [
    {
      class: "foreign_read",
      remember: "this_call",
      slug,
      url,
      reachable: consentAskCanReachUser(context),
      askedIn: consentEpochKey(),
    },
  ]);
  setBounded(liveState.askClassPersonAsked, context.toolUseId, true);
}
//@ chunk-m79qv8gp.js:17210-17301 placement
function recordUnaskedRoutineWrite(action, slug) {
  logEvent("tengu_artifact_routine_write_unasked", {
    db_op: fromEnum(action),
    artifact_id: sanitizeMarkName(slug),
  });
}
//@ chunk-m79qv8gp.js:17301-17392 placement
function recordUnaskedCommentWrite(action, slug) {
  logEvent("tengu_artifact_comment_write_unasked", {
    db_op: fromEnum(action),
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
function noteCommentRepublishedPath(path) {
  getLiveState().commentRepublishedPaths.add(path);
}
//@ chunk-m79qv8gp.js:17524-17576 placement
function noteRoutineRepublishedPath(path) {
  getLiveState().routineRepublishedPaths.add(path);
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
function recordUnaskedQuietCapsPublish(slug, mode) {
  let mode_2 = fromEnum(mode ?? "absent");
  logEvent("tengu_artifact_quiet_caps_publish_unasked", {
    artifact_id: sanitizeMarkName(slug),
    mode: mode_2,
  });
  if (mode === "owner" || mode === "empty") return;
  logFeatureBad("artifact_publish", "quiet_caps_publish_not_owner_only", {
    mode: mode_2,
  });
  getLiveState().quietCapsCardKept = true;
}
//@ chunk-m79qv8gp.js:18149-18553 placement
function recordUnaskedRoutineFirstPublish(slug, mode, details) {
  let mode_2 = fromEnum(mode ?? "absent");
  logEvent("tengu_artifact_routine_first_publish_unasked", {
    ...(slug !== undefined && {
      artifact_id: sanitizeMarkName(slug),
    }),
    mode: mode_2,
    ...(details?.fromType && {
      from_type: true,
    }),
  });
  if (mode === "owner" || mode === "refused_before_send") return;
  if (mode !== "stranded" && mode !== "refused_shape" && mode !== "unknown_outcome")
    logFeatureBad("artifact_publish", "routine_first_publish_not_owner_only", {
      mode: mode_2,
      ...(details?.fromType && {
        from_type: true,
      }),
    });
  getLiveState().routineRunTainted = true;
}
//@ chunk-m79qv8gp.js:18553-18708 placement
function recordUnaskedForeignRead(action, slug, ownerAccountId, attested) {
  logEvent("tengu_artifact_foreign_read_unasked", {
    action: fromEnum(action),
    artifact_id: sanitizeMarkName(slug),
    ...(ownerAccountId !== undefined && {
      owner_account_id: sanitizeMarkName(ownerAccountId),
    }),
    ...(attested && {
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
  notePersonOnlyReadAskPending,
};
