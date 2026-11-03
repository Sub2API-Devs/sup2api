/**
 * services/artifacts/comments/postReply.ts
 *
 * 2.1.316 新增：评论回复的发布
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9tgt55am.js (12)
 * attribution: placement 12
 */
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { emitSummonArmsForActivity, isSlugStoppedAnywhere, scanStamp } from "../summonArms.js";
import { isCommentAutoreactOptedIn, isCommentReadGated } from "./autoreactGates.js";
import { Xb } from "../artifactAvailability.js";
import { hasThreadAgentForSlug } from "./backgroundAgent.js";
import { markAutoReactNoticePending } from "../shareEntries.js";
import { getWatchArtifactNoAutoreact } from "../../../cli/watchArtifactArgs.js";
import { stopAllCommentMonitorIntents } from "../commentMonitor.js";
import { resetAllLedgerSlugs, flushAutoreactLedger } from "./autoreactLedger.js";
import { createAssistantMessage, createUserMessage } from "../../../utils/messages.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../analytics/featureTelemetry.js";
import { m6s } from "../../../tools/ArtifactTool/artifactNotices.js";
import { flattenCommentText } from "./commentConsent.js";
import { commentsToolReference, commentsToolCall } from "../artifactToolGates.js";
import { replyThenResolveNote, describeAutoReplyHeld } from "./threadPrompts.js";
import { emitArtifactSummonStatus, registerSummonHandOff } from "../artifactNotices.js";
import { ba, recordOwnReply, getAutoModeArbiterIssue } from "./threadScanner.js";
import { formatCommentIds, toStandDownReason, isDecisiveClassifierOutcome } from "./autoEdit.js";
import { oAe, URo } from "../../artifactComments/autoReplyNotices.js";
import { parseArtifactUrl } from "../../../tools/ArtifactTool/constants.js";
import { readArtifactComments } from "./commentsRead.js";
import { lastPersonComment, threadAwaitsClaudeById } from "./commentMentions.js";
import { zn, clearSummonAnswer } from "./autoreactState.js";
import { registerPipelineReplyOrigin, clearPipelineReplyOrigin } from "../autoEditAttribution.js";
import { evaluateAskingNoHost } from "../../../utils/permissions/permissions.js";
import { runToolUse, hasTypeField } from "../../tools/toolExecution.js";
import { markReplyClean } from "./commentState.js";

/**
 * 自动回复是否开启：没有切到 MCP 时看 isAutoreactArmed；切到 MCP 后强制关闭并广播状态。
 */
//@ chunk-9tgt55am.js:56036-56187 placement
function isAutoReactEnabled() {
  let e = getLiveState();
  if (!e.builtInArtifactHiddenForMcp) return isAutoreactArmed();
  if (e.autoReact.enabledMemo !== !1) ((e.autoReact.enabledMemo = !1), emitSummonArmsForActivity(e.live));
  return !1;
}
//@ chunk-9tgt55am.js:56187-56270 placement
function isAutoreactArmed() {
  let e = getLiveState(),
    t = !e.autoReact.userDisarmed && isCommentAutoreactOptedIn() && Xb();
  return (setAutoReactWakeEnabled(e, t), t);
}
//@ chunk-9tgt55am.js:56270-56459 placement
function setAutoReactWakeEnabled(e, t) {
  let n = t && !e.builtInArtifactHiddenForMcp;
  if (e.autoReact.wakeEnabledMemo !== t || e.autoReact.enabledMemo !== n)
    ((e.autoReact.wakeEnabledMemo = t), (e.autoReact.enabledMemo = n), emitSummonArmsForActivity(e.live));
}
/**
 * 判断自动回复产生的任务通知是否该丢弃：自动回复未开启，或对应 slug 已被停止。
 */
//@ chunk-9tgt55am.js:56459-56592 placement
function shouldDropAutoReactNotice(e) {
  if (e?.kind !== "task-notification" || e.source !== "artifact-auto-react") return !1;
  return !isAutoreactArmed() || (e.slug !== void 0 && isSlugStoppedAnywhere(e.slug));
}
//@ chunk-9tgt55am.js:56592-56621 placement
function cUs(e) {
  return hasThreadAgentForSlug(e);
}
/**
 * 收到 artifact 自动响应的任务通知时，标记该 slug 有待处理的自动响应提示。
 */
//@ chunk-9tgt55am.js:56621-56732 placement
function markAutoReactNotice(e) {
  if (e?.kind === "task-notification" && e.source === "artifact-auto-react" && e.slug !== void 0)
    markAutoReactNoticePending(e.slug);
}
//@ chunk-9tgt55am.js:56732-56992 placement
function disarmAutoreact(e) {
  let t = getLiveState();
  ((t.autoReact.userDisarmed = !0),
    getWatchArtifactNoAutoreact(e?.storageV5),
    stopAllCommentMonitorIntents(e));
  for (let n of [...t.wakes.takenFrom.keys()])
    import("./chunk-4te7h8m1.js").then((a) => a.notifyTakenOverSlugStopped(n));
  (resetAllLedgerSlugs(),
    flushAutoreactLedger({ flush: !0, storageV5: e?.storageV5 }),
    setAutoReactWakeEnabled(t, !1),
    emitSummonArmsForActivity(t.live));
}
/**
 * 为一次合成的工具调用生成（并缓存）助手 tool_use 消息与用户 tool_result 消息对。
 */
//@ chunk-9tgt55am.js:56992-57290 placement
function getSyntheticToolMessages(e) {
  if (e.messages !== void 0) return e.messages;
  if (e.result === void 0) return [];
  let t = createAssistantMessage({
      content: [{ type: "tool_use", id: e.toolUseId, name: e.toolName, input: e.input }],
    }),
    n = createUserMessage({
      content: [e.result.block],
      toolUseResult: e.result.data,
      sourceToolAssistantUUID: t.uuid,
    });
  return ((e.messages = [t, n]), e.messages);
}
//@ chunk-9tgt55am.js:57290-57354 placement
function Ao(e) {
  return { message: { id: `autoreact-${e}`, content: [] } };
}
/**
 * 根据回复发布结果更新线程/artifact 状态、通知与扣留提示。
 */
//@ chunk-9tgt55am.js:57354-61025 placement
function applyPostOutcome(e) {
  let {
      post: post,
      threadState: threadState,
      artifactState: artifactState,
      slug: slug,
      scanGen: scanGen,
      notify: notify,
      summon: summon,
      notice: notice,
      replyWithheldNotice: replyWithheldNotice,
      allowSiblingReset: allowSiblingReset,
    } = e,
    b = e.rulesOnlyProbe ? { rules_only: !0 } : {},
    N = e.rulesOnlyProbe ? b : void 0;
  if (post.kind === "refused") {
    if (e.heldForPerson === !0 && post.denial) {
      if (
        ((artifactState.heldReplyDeclined = !0),
        logFeatureSad("artifact_comments_autoreact", "held_reply_declined", N),
        post.feedback !== void 0)
      )
        (markAutoReactNoticePending(slug),
          notify({
            summary: m6s(e.artifactName),
            detail:
              `The user declined a drafted reply to a comment thread on artifact ${e.url} and said: "${flattenCommentText(post.feedback)}". Act on that; replies to comments on this artifact will not be drafted for them again this session \u2014 use ${commentsToolReference()} to read and reply if they ask.` +
              replyThenResolveNote(),
          }));
      emitArtifactSummonStatus(summon, { status: "declined", reason: "ask_mode" });
      return;
    }
    if (post.denial) threadState.consecutivePipelineDenials += 1;
    artifactState.lastReplyDeclinedByAutoMode = post.autoModeDeclined || post.classifierUnavailable;
    let S =
        (post.autoModeDeclined || post.unavailableUnderServerArbiter) &&
        e.ownSendWithheld === void 0 &&
        !artifactState.autoModeDeclineNoticed &&
        e.editLanded !== !0 &&
        isAutoReactEnabled() &&
        !isSlugStoppedAnywhere(slug) &&
        scanStamp(slug) === scanGen &&
        (post.autoModeDeclined || ba()),
      w = S && !post.autoModeDeclined && !e.pageOwnsThreads;
    if (S) {
      ((artifactState.autoModeDeclineNoticed = !0), markAutoReactNoticePending(slug));
      let L = describeAutoReplyHeld(
        e.trigger,
        "auto_mode_declined",
        e.url,
        e.artifactName,
        e.ackPosted ? { note: formatCommentIds([e.ackCommentId]) } : void 0,
      );
      notify(w ? { ...L, handOff: registerSummonHandOff(summon) } : L);
    }
    if (post.autoModeDeclined) {
      (logFeatureSad(
        "artifact_comments_autoreact",
        post.noVerdict ? "reply_auto_mode_no_verdict" : "reply_denied_by_auto_mode",
        { notified: S, ...b },
      ),
        emitArtifactSummonStatus(summon, { status: "declined", reason: "denied_by_auto_mode" }));
      return;
    }
    if (
      (logFeatureSad(
        "artifact_comments_autoreact",
        post.denial ? "content_gate_refused" : "reply_refused",
        post.classifierUnavailable ? { notified: S, ...b } : N,
      ),
      w)
    )
      logFeatureOk("artifact_comments_classifier_unavailable_handoff");
    else if (post.classifierUnavailable) {
      let L = S
        ? "notified_page_owns_threads"
        : (post.arbiterWithheld ??
          e.ownSendWithheld ??
          (artifactState.autoModeDeclineNoticed
            ? "already_notified"
            : e.editLanded === !0
              ? "edit_landed"
              : !isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== scanGen
                ? "auto_replies_stopped"
                : "flag_off"));
      logFeatureSad("artifact_comments_classifier_unavailable_handoff", `${L}_at_post`);
    }
    emitArtifactSummonStatus(
      summon,
      w
        ? { status: "working" }
        : post.denial
          ? { status: "declined", reason: "blocked" }
          : { status: "failed", reason: "post_failed" },
    );
    return;
  }
  if (post.kind === "no_result") {
    ((threadState.consecutivePipelineDenials += 1),
      logFeatureSad("artifact_comments_autoreact", "pipeline_no_result", N),
      emitArtifactSummonStatus(summon, { status: "declined", reason: "blocked" }));
    return;
  }
  if (post.kind === "not_activated") {
    if (post.pageOwnsThreads) {
      if (
        (logFeatureSad("artifact_comments_autoreact", "page_owns_threads", N),
        emitArtifactSummonStatus(summon, { status: "declined", reason: "blocked" }),
        replyWithheldNotice !== void 0)
      )
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === scanGen)
          (markAutoReactNoticePending(slug), notify(replyWithheldNotice));
        else logFeatureSad("artifact_comments_autoreact", "page_owns_threads_notice_suppressed", N);
      return;
    }
    logFeatureSad("artifact_comments_autoreact", "deactivated_mid_turn", N);
    return;
  }
  if (post.kind === "account_changed") {
    logFeatureSad("artifact_comments_autoreact", "held_reply_account_changed", N);
    return;
  }
  if (
    post.kind === "answered_elsewhere" ||
    post.kind === "answered_post_time" ||
    post.kind === "summon_foreign"
  ) {
    if (
      (logFeatureSad("artifact_comments_autoreact", toStandDownReason(post.kind), N),
      replyWithheldNotice !== void 0)
    )
      if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === scanGen)
        (markAutoReactNoticePending(slug), notify(replyWithheldNotice));
      else
        logFeatureSad(
          "artifact_comments_autoreact",
          post.kind === "summon_foreign"
            ? "summon_foreign_notice_suppressed"
            : post.kind === "answered_post_time"
              ? "answered_post_time_notice_suppressed"
              : "answered_elsewhere_notice_suppressed",
          N,
        );
    return;
  }
  if (post.kind === "unexpected_result_shape") {
    ((threadState.consecutivePipelineDenials += 1),
      logFeatureBad("artifact_comments_autoreact", "unexpected_result_shape", N),
      emitArtifactSummonStatus(summon, { status: "declined", reason: "blocked" }));
    return;
  }
  if (allowSiblingReset) {
    for (let S of artifactState.threads.values()) S.consecutivePipelineDenials = 0;
    artifactState.pipelineDeniedNoticed = !1;
  }
  if (((artifactState.lastReplyDeclinedByAutoMode = !1), (threadState.lastAutoReplyAt = Date.now()), !oAe()))
    URo(slug);
  if (
    (recordOwnReply(threadState, post),
    e.heldForPerson !== !0 &&
      (!isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== scanGen))
  ) {
    logFeatureOk("artifact_comments_autoreact", { replied: !0, post_stop_notice_suppressed: !0, ...b });
    return;
  }
  (markAutoReactNoticePending(slug),
    notify(notice),
    logFeatureOk("artifact_comments_autoreact", { replied: !0, ...b }));
}
//@ chunk-9tgt55am.js:61025-61481 placement
async function recheckReplyTarget(e) {
  let t = parseArtifactUrl(e.url);
  if (t === null) return !1;
  if (isCommentReadGated(e.context, { slug: e.slug, env: t.env }, e.url)) return !1;
  let n = await readArtifactComments(
    { slug: e.slug, env: t.env },
    e.context.abortController.signal,
    e.context.credentials,
    "artifact_autoreact_post_recheck",
  ).catch(() => ({ err: "recheck_read_threw" }));
  if (e.waited) return lastPersonComment(n, e.threadId, e.recheck.scanRowIds) !== null;
  let a = threadAwaitsClaudeById(n, e.threadId);
  return a !== null && !e.recheck.ownReplyIds.has(a.id) && !e.recheck.scanRowIds.has(a.id);
}
/**
 * 以 Artifact 工具发布评论回复：先复查权限与线程状态，处理被扣留/等待的情况。
 */
//@ chunk-9tgt55am.js:61481-64634 placement
async function postThreadReply(e) {
  let {
      tool: tool,
      context: context,
      url: url,
      slug: slug,
      threadId: threadId,
      text: text,
      declareAnswersSummon: declareAnswersSummon,
    } = e,
    { recheck: recheck, held: held } = e,
    R = held !== void 0;
  if (
    recheck !== void 0 &&
    (await recheckReplyTarget({
      recheck: recheck,
      url: url,
      slug: slug,
      threadId: threadId,
      context: context,
      waited: R,
    }))
  )
    return { kind: "answered_post_time" };
  let accountEpoch = getLiveState().accountEpoch,
    N = `autoreact-${threadId}-${getLiveState().autoReact.postSeq++}`,
    S = {
      type: "tool_use",
      id: N,
      ...commentsToolCall(tool.name, { action: "reply", url: url, thread_id: threadId, text: text }),
    },
    w = declareAnswersSummon
      ? zn({ slug: slug, threadId: threadId, expectedToolUseId: N })
      : e.continuesReplyId !== void 0
        ? zn({ slug: slug, threadId: threadId, expectedToolUseId: N, continuesReplyId: e.continuesReplyId })
        : null,
    L = registerPipelineReplyOrigin({ slug: slug, threadId: threadId, expectedToolUseId: N }),
    P = { stoodDown: null },
    D = !1,
    G = async (...Y) => {
      let z = await (e.canUseTool ?? evaluateAskingNoHost)(...Y);
      return (
        (D =
          z.behavior === "deny" &&
          z.decisionReason?.type === "classifier" &&
          z.decisionReason.monitorBlocked === !0),
        z
      );
    },
    V =
      held !== void 0
        ? async (Y, z, Q, I, j, Z) => {
            let ce = await G(Y, z, Q, I, j, Z),
              le = () => getLiveState().accountEpoch !== held.admittedEpoch;
            if (le()) P.stoodDown = "account_changed";
            else if (ce.behavior !== "allow") return ce;
            else if (
              recheck !== void 0 &&
              (await recheckReplyTarget({
                recheck: recheck,
                url: url,
                slug: slug,
                threadId: threadId,
                context: Q,
                waited: R,
              }))
            )
              P.stoodDown = le() ? "account_changed" : "answered";
            else if (le()) P.stoodDown = "account_changed";
            else return ce;
            return {
              behavior: "deny",
              message:
                "The thread was answered, or the account changed, while this reply waited for approval; it was not posted.",
              decisionReason: { type: "other", reason: "stood down while held" },
            };
          }
        : G,
    q = { kind: "no_result" },
    threadTranscript = e.threadTranscript;
  try {
    for await (let Y of runToolUse(
      S,
      Ao(threadId),
      V,
      threadTranscript.length > 0
        ? {
            ...context,
            messages: [...context.messages, ...(context.sameTurnToolUses ?? []), ...threadTranscript],
            sameTurnToolUses: void 0,
          }
        : context,
      () => new Date().toISOString(),
    )) {
      if (hasTypeField(Y)) continue;
      let message = Y.message;
      if (message?.type !== "user" || !Array.isArray(message.message?.content)) continue;
      let found = message.message.content.find(
        (j) => typeof j === "object" && j !== null && j.type === "tool_result" && j.tool_use_id === N,
      );
      if (!found) continue;
      if (found.is_error === !0) {
        let toolDenialKind = message.toolDenialKind,
          Z = toolDenialKind === "automode-unavailable" && !D,
          ce = Z ? getAutoModeArbiterIssue(context) : void 0;
        q = {
          kind: "refused",
          denial: isDecisiveClassifierOutcome(toolDenialKind),
          autoModeDeclined:
            toolDenialKind === "automode-blocked" || toolDenialKind === "automode-parsing-error",
          noVerdict: toolDenialKind === "automode-parsing-error",
          classifierUnavailable: Z,
          unavailableUnderServerArbiter: Z && ce === void 0,
          arbiterWithheld: ce,
          ...(typeof message.userFeedback === "string" &&
            message.userFeedback !== "" && { feedback: message.userFeedback }),
        };
        continue;
      }
      let toolUseResult = message.toolUseResult;
      if (toolUseResult && toolUseResult.replied === !0) {
        if (
          ((q = {
            kind: "posted",
            commentId: typeof toolUseResult.comment_id === "string" ? toolUseResult.comment_id : void 0,
            epoch: accountEpoch,
          }),
          q.commentId !== void 0 && (await e.composedFromOwnWordsOnly().catch(() => !1)))
        )
          markReplyClean(q.commentId);
      } else if (toolUseResult && toolUseResult.replied === !1 && toolUseResult.summon_answered === !0)
        q = { kind: "answered_elsewhere" };
      else if (toolUseResult && toolUseResult.replied === !1 && toolUseResult.summon_foreign === !0)
        q = { kind: "summon_foreign" };
      else if (toolUseResult && toolUseResult.replied === !1 && toolUseResult.already_answered === !0)
        q = { kind: "answered_post_time" };
      else if (toolUseResult && toolUseResult.replied === !1)
        q = { kind: "not_activated", ...(toolUseResult.page_owns_threads === !0 && { pageOwnsThreads: !0 }) };
      else q = { kind: "unexpected_result_shape" };
    }
  } finally {
    if (w !== null) clearSummonAnswer(w);
    clearPipelineReplyOrigin(L);
  }
  if (P.stoodDown === "account_changed") return { kind: "account_changed" };
  if (P.stoodDown === "answered") return { kind: "answered_post_time" };
  if (w !== null && q.kind === "posted" && !w.consumed)
    logFeatureSad(
      "artifact_comments_autoreact",
      w.continuesReplyId !== void 0 ? "follow_up_marker_unconsumed" : "summon_declaration_unconsumed",
    );
  return q;
}

export {
  isAutoreactArmed,
  disarmAutoreact,
  shouldDropAutoReactNotice,
  markAutoReactNotice,
  isAutoReactEnabled,
  getSyntheticToolMessages,
  Ao,
  postThreadReply,
  applyPostOutcome,
  cUs,
};
