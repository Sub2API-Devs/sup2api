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
import { isArtifactsAvailable } from "../artifactAvailability.js";
import { hasThreadAgentForSlug } from "./backgroundAgent.js";
import { markAutoReactNoticePending } from "../shareEntries.js";
import { getWatchArtifactNoAutoreact } from "../../../cli/watchArtifactArgs.js";
import { stopAllCommentMonitorIntents } from "../commentMonitor.js";
import { resetAllLedgerSlugs, flushAutoreactLedger } from "./autoreactLedger.js";
import { createAssistantMessage, createUserMessage } from "../../../utils/messages.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../analytics/featureTelemetry.js";
import { replyNotPostedNotice } from "../../../tools/ArtifactTool/artifactNotices.js";
import { flattenCommentText } from "./commentConsent.js";
import { commentsToolReference, commentsToolCall } from "../artifactToolGates.js";
import { replyThenResolveNote, describeAutoReplyHeld } from "./threadPrompts.js";
import { emitArtifactSummonStatus, registerSummonHandOff } from "../artifactNotices.js";
import { isGussetFlagOn, recordOwnReply, getAutoModeArbiterIssue } from "./threadScanner.js";
import { formatCommentIds, toStandDownReason, isDecisiveClassifierOutcome } from "./autoEdit.js";
import { canAutoReply, bumpUnattendedReply } from "../../artifactComments/autoReplyNotices.js";
import { parseArtifactUrl } from "../../../tools/ArtifactTool/constants.js";
import { readArtifactComments } from "./commentsRead.js";
import { lastPersonComment, threadAwaitsClaudeById } from "./commentMentions.js";
import { rememberSummonAnswer, clearSummonAnswer } from "./autoreactState.js";
import { registerPipelineReplyOrigin, clearPipelineReplyOrigin } from "../autoEditAttribution.js";
import { evaluateAskingNoHost } from "../../../utils/permissions/permissions.js";
import { runToolUse, hasTypeField } from "../../tools/toolExecution.js";
import { markReplyClean } from "./commentState.js";

//@ chunk-9tgt55am.js:56036-56187 placement
/**
 * 自动回复是否开启：没有切到 MCP 时看 isAutoreactArmed；切到 MCP 后强制关闭并广播状态。
 */
function isAutoReactEnabled() {
  let liveState = getLiveState();
  if (!liveState.builtInArtifactHiddenForMcp) return isAutoreactArmed();
  if (liveState.autoReact.enabledMemo !== false) {
    liveState.autoReact.enabledMemo = false;
    emitSummonArmsForActivity(liveState.live);
  }
  return false;
}
//@ chunk-9tgt55am.js:56187-56270 placement
function isAutoreactArmed() {
  let liveState = getLiveState();
  let autoReactArmed =
    !liveState.autoReact.userDisarmed && isCommentAutoreactOptedIn() && isArtifactsAvailable();
  setAutoReactWakeEnabled(liveState, autoReactArmed);
  return autoReactArmed;
}
//@ chunk-9tgt55am.js:56270-56459 placement
function setAutoReactWakeEnabled(liveState, enabled) {
  let wakeEnabled = enabled && !liveState.builtInArtifactHiddenForMcp;
  if (liveState.autoReact.wakeEnabledMemo !== enabled || liveState.autoReact.enabledMemo !== wakeEnabled) {
    liveState.autoReact.wakeEnabledMemo = enabled;
    liveState.autoReact.enabledMemo = wakeEnabled;
    emitSummonArmsForActivity(liveState.live);
  }
}
//@ chunk-9tgt55am.js:56459-56592 placement
/**
 * 判断自动回复产生的任务通知是否该丢弃：自动回复未开启，或对应 slug 已被停止。
 */
function shouldDropAutoReactNotice(noticeId) {
  if (noticeId?.kind !== "task-notification" || noticeId.source !== "artifact-auto-react") return false;
  return !isAutoreactArmed() || (noticeId.slug !== undefined && isSlugStoppedAnywhere(noticeId.slug));
}
//@ chunk-9tgt55am.js:56592-56621 placement
/**
 * 导出函数 `hasThreadAgentForSlugPost`：参数 e，返回 hasThreadAgentForSlug(e)。
 */
function hasThreadAgentForSlugPost(slug) {
  return hasThreadAgentForSlug(slug);
}
//@ chunk-9tgt55am.js:56621-56732 placement
/**
 * 收到 artifact 自动响应的任务通知时，标记该 slug 有待处理的自动响应提示。
 */
function markAutoReactNotice(slug) {
  if (slug?.kind === "task-notification" && slug.source === "artifact-auto-react" && slug.slug !== undefined)
    markAutoReactNoticePending(slug.slug);
}
//@ chunk-9tgt55am.js:56732-56992 placement
function disarmAutoreact(liveState) {
  let liveState_2 = getLiveState();
  liveState_2.autoReact.userDisarmed = true;
  getWatchArtifactNoAutoreact(liveState?.storageV5);
  stopAllCommentMonitorIntents(liveState);
  for (let key of [...liveState_2.wakes.takenFrom.keys()])
    import("../replyYieldHolder.js").then((mod) => mod.notifyTakenOverSlugStopped(key));
  resetAllLedgerSlugs();
  flushAutoreactLedger({
    flush: true,
    storageV5: liveState?.storageV5,
  });
  setAutoReactWakeEnabled(liveState_2, false);
  emitSummonArmsForActivity(liveState_2.live);
}
//@ chunk-9tgt55am.js:56992-57290 placement
/**
 * 为一次合成的工具调用生成（并缓存）助手 tool_use 消息与用户 tool_result 消息对。
 */
function getSyntheticToolMessages(publishTranscript) {
  if (publishTranscript.messages !== undefined) return publishTranscript.messages;
  if (publishTranscript.result === undefined) return [];
  let assistantMessage = createAssistantMessage({
    content: [
      {
        type: "tool_use",
        id: publishTranscript.toolUseId,
        name: publishTranscript.toolName,
        input: publishTranscript.input,
      },
    ],
  });
  let userMessage = createUserMessage({
    content: [publishTranscript.result.block],
    toolUseResult: publishTranscript.result.data,
    sourceToolAssistantUUID: assistantMessage.uuid,
  });
  publishTranscript.messages = [assistantMessage, userMessage];
  return publishTranscript.messages;
}
//@ chunk-9tgt55am.js:57290-57354 placement
function emptyAutoReactMessage(threadId) {
  return {
    message: {
      id: `autoreact-${threadId}`,
      content: [],
    },
  };
}
//@ chunk-9tgt55am.js:57354-61025 placement
/**
 * 根据回复发布结果更新线程/artifact 状态、通知与扣留提示。
 */
function applyPostOutcome(outcome) {
  let {
    post,
    threadState,
    artifactState,
    slug,
    scanGen,
    notify,
    summon,
    notice,
    replyWithheldNotice,
    allowSiblingReset,
  } = outcome;
  let probeTag = outcome.rulesOnlyProbe
    ? {
        rules_only: true,
      }
    : {};
  let rulesOnlyProbe = outcome.rulesOnlyProbe ? probeTag : undefined;
  if (post.kind === "refused") {
    if (outcome.heldForPerson === true && post.denial) {
      artifactState.heldReplyDeclined = true;
      logFeatureSad("artifact_comments_autoreact", "held_reply_declined", rulesOnlyProbe);
      if (post.feedback !== undefined) {
        markAutoReactNoticePending(slug);
        notify({
          summary: replyNotPostedNotice(outcome.artifactName),
          detail:
            `The user declined a drafted reply to a comment thread on artifact ${outcome.url} and said: "${flattenCommentText(post.feedback)}". Act on that; replies to comments on this artifact will not be drafted for them again this session \u2014 use ${commentsToolReference()} to read and reply if they ask.` +
            replyThenResolveNote(),
        });
      }
      emitArtifactSummonStatus(summon, {
        status: "declined",
        reason: "ask_mode",
      });
      return;
    }
    if (post.denial) threadState.consecutivePipelineDenials += 1;
    artifactState.lastReplyDeclinedByAutoMode = post.autoModeDeclined || post.classifierUnavailable;
    let autoReplyAllowed =
      (post.autoModeDeclined || post.unavailableUnderServerArbiter) &&
      outcome.ownSendWithheld === undefined &&
      !artifactState.autoModeDeclineNoticed &&
      outcome.editLanded !== true &&
      isAutoReactEnabled() &&
      !isSlugStoppedAnywhere(slug) &&
      scanStamp(slug) === scanGen &&
      (post.autoModeDeclined || isGussetFlagOn());
    let shouldHoldReply = autoReplyAllowed && !post.autoModeDeclined && !outcome.pageOwnsThreads;
    if (autoReplyAllowed) {
      artifactState.autoModeDeclineNoticed = true;
      markAutoReactNoticePending(slug);
      let heldDescription = describeAutoReplyHeld(
        outcome.trigger,
        "auto_mode_declined",
        outcome.url,
        outcome.artifactName,
        outcome.ackPosted
          ? {
              note: formatCommentIds([outcome.ackCommentId]),
            }
          : undefined,
      );
      notify(
        shouldHoldReply
          ? {
              ...heldDescription,
              handOff: registerSummonHandOff(summon),
            }
          : heldDescription,
      );
    }
    if (post.autoModeDeclined) {
      logFeatureSad(
        "artifact_comments_autoreact",
        post.noVerdict ? "reply_auto_mode_no_verdict" : "reply_denied_by_auto_mode",
        {
          notified: autoReplyAllowed,
          ...probeTag,
        },
      );
      emitArtifactSummonStatus(summon, {
        status: "declined",
        reason: "denied_by_auto_mode",
      });
      return;
    }
    logFeatureSad(
      "artifact_comments_autoreact",
      post.denial ? "content_gate_refused" : "reply_refused",
      post.classifierUnavailable
        ? {
            notified: autoReplyAllowed,
            ...probeTag,
          }
        : rulesOnlyProbe,
    );
    if (shouldHoldReply) logFeatureOk("artifact_comments_classifier_unavailable_handoff");
    else if (post.classifierUnavailable) {
      let heldResult = autoReplyAllowed
        ? "notified_page_owns_threads"
        : (post.arbiterWithheld ??
          outcome.ownSendWithheld ??
          (artifactState.autoModeDeclineNoticed
            ? "already_notified"
            : outcome.editLanded === true
              ? "edit_landed"
              : !isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== scanGen
                ? "auto_replies_stopped"
                : "flag_off"));
      logFeatureSad("artifact_comments_classifier_unavailable_handoff", `${heldResult}_at_post`);
    }
    emitArtifactSummonStatus(
      summon,
      shouldHoldReply
        ? {
            status: "working",
          }
        : post.denial
          ? {
              status: "declined",
              reason: "blocked",
            }
          : {
              status: "failed",
              reason: "post_failed",
            },
    );
    return;
  }
  if (post.kind === "no_result") {
    threadState.consecutivePipelineDenials += 1;
    logFeatureSad("artifact_comments_autoreact", "pipeline_no_result", rulesOnlyProbe);
    emitArtifactSummonStatus(summon, {
      status: "declined",
      reason: "blocked",
    });
    return;
  }
  if (post.kind === "not_activated") {
    if (post.pageOwnsThreads) {
      logFeatureSad("artifact_comments_autoreact", "page_owns_threads", rulesOnlyProbe);
      emitArtifactSummonStatus(summon, {
        status: "declined",
        reason: "blocked",
      });
      if (replyWithheldNotice !== undefined)
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === scanGen) {
          markAutoReactNoticePending(slug);
          notify(replyWithheldNotice);
        } else
          logFeatureSad("artifact_comments_autoreact", "page_owns_threads_notice_suppressed", rulesOnlyProbe);
      return;
    }
    logFeatureSad("artifact_comments_autoreact", "deactivated_mid_turn", rulesOnlyProbe);
    return;
  }
  if (post.kind === "account_changed") {
    logFeatureSad("artifact_comments_autoreact", "held_reply_account_changed", rulesOnlyProbe);
    return;
  }
  if (
    post.kind === "answered_elsewhere" ||
    post.kind === "answered_post_time" ||
    post.kind === "summon_foreign"
  ) {
    logFeatureSad("artifact_comments_autoreact", toStandDownReason(post.kind), rulesOnlyProbe);
    if (replyWithheldNotice !== undefined)
      if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === scanGen) {
        markAutoReactNoticePending(slug);
        notify(replyWithheldNotice);
      } else
        logFeatureSad(
          "artifact_comments_autoreact",
          post.kind === "summon_foreign"
            ? "summon_foreign_notice_suppressed"
            : post.kind === "answered_post_time"
              ? "answered_post_time_notice_suppressed"
              : "answered_elsewhere_notice_suppressed",
          rulesOnlyProbe,
        );
    return;
  }
  if (post.kind === "unexpected_result_shape") {
    threadState.consecutivePipelineDenials += 1;
    logFeatureBad("artifact_comments_autoreact", "unexpected_result_shape", rulesOnlyProbe);
    emitArtifactSummonStatus(summon, {
      status: "declined",
      reason: "blocked",
    });
    return;
  }
  if (allowSiblingReset) {
    for (let thread of artifactState.threads.values()) thread.consecutivePipelineDenials = 0;
    artifactState.pipelineDeniedNoticed = false;
  }
  artifactState.lastReplyDeclinedByAutoMode = false;
  threadState.lastAutoReplyAt = Date.now();
  if (!canAutoReply()) bumpUnattendedReply(slug);
  recordOwnReply(threadState, post);
  if (
    outcome.heldForPerson !== true &&
    (!isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== scanGen)
  ) {
    logFeatureOk("artifact_comments_autoreact", {
      replied: true,
      post_stop_notice_suppressed: true,
      ...probeTag,
    });
    return;
  }
  markAutoReactNoticePending(slug);
  notify(notice);
  logFeatureOk("artifact_comments_autoreact", {
    replied: true,
    ...probeTag,
  });
}
//@ chunk-9tgt55am.js:61025-61481 placement
async function recheckReplyTarget(request) {
  let artifactUrl = parseArtifactUrl(request.url);
  if (artifactUrl === null) return false;
  if (
    isCommentReadGated(
      request.context,
      {
        slug: request.slug,
        env: artifactUrl.env,
      },
      request.url,
    )
  )
    return false;
  let comments = await readArtifactComments(
    {
      slug: request.slug,
      env: artifactUrl.env,
    },
    request.context.abortController.signal,
    request.context.credentials,
    "artifact_autoreact_post_recheck",
  ).catch(() => ({
    err: "recheck_read_threw",
  }));
  if (request.waited)
    return lastPersonComment(comments, request.threadId, request.recheck.scanRowIds) !== null;
  let awaitsClaude = threadAwaitsClaudeById(comments, request.threadId);
  return (
    awaitsClaude !== null &&
    !request.recheck.ownReplyIds.has(awaitsClaude.id) &&
    !request.recheck.scanRowIds.has(awaitsClaude.id)
  );
}
//@ chunk-9tgt55am.js:61481-64634 placement
/**
 * 以 Artifact 工具发布评论回复：先复查权限与线程状态，处理被扣留/等待的情况。
 */
async function postThreadReply(request) {
  let { tool, context, url, slug, threadId, text, declareAnswersSummon } = request;
  let { recheck, held } = request;
  let waited = held !== undefined;
  if (
    recheck !== undefined &&
    (await recheckReplyTarget({
      recheck,
      url,
      slug,
      threadId,
      context,
      waited,
    }))
  )
    return {
      kind: "answered_post_time",
    };
  let epoch = getLiveState().accountEpoch;
  let toolUseId = `autoreact-${threadId}-${getLiveState().autoReact.postSeq++}`;
  let toolUse = {
    type: "tool_use",
    id: toolUseId,
    ...commentsToolCall(tool.name, {
      action: "reply",
      url,
      thread_id: threadId,
      text,
    }),
  };
  let summonAnswer = declareAnswersSummon
    ? rememberSummonAnswer({
        slug,
        threadId,
        expectedToolUseId: toolUseId,
      })
    : request.continuesReplyId !== undefined
      ? rememberSummonAnswer({
          slug,
          threadId,
          expectedToolUseId: toolUseId,
          continuesReplyId: request.continuesReplyId,
        })
      : null;
  let pipelineOrigin = registerPipelineReplyOrigin({
    slug,
    threadId,
    expectedToolUseId: toolUseId,
  });
  let standDownState = {
    stoodDown: null,
  };
  let autoModeUnavailable = false;
  let canUseTool = async (...args) => {
    let decision = await (request.canUseTool ?? evaluateAskingNoHost)(...args);
    autoModeUnavailable =
      decision.behavior === "deny" &&
      decision.decisionReason?.type === "classifier" &&
      decision.decisionReason.monitorBlocked === true;
    return decision;
  };
  let permissionCheck =
    held !== undefined
      ? async (toolName, input, suggestion, context, toolUseId, assistantMessage) => {
          let permission = await canUseTool(
            toolName,
            input,
            suggestion,
            context,
            toolUseId,
            assistantMessage,
          );
          let epochChanged = () => getLiveState().accountEpoch !== held.admittedEpoch;
          if (epochChanged()) standDownState.stoodDown = "account_changed";
          else if (permission.behavior !== "allow") return permission;
          else if (
            recheck !== undefined &&
            (await recheckReplyTarget({
              recheck,
              url,
              slug,
              threadId,
              context: suggestion,
              waited,
            }))
          )
            standDownState.stoodDown = epochChanged() ? "account_changed" : "answered";
          else if (epochChanged()) standDownState.stoodDown = "account_changed";
          else return permission;
          return {
            behavior: "deny",
            message:
              "The thread was answered, or the account changed, while this reply waited for approval; it was not posted.",
            decisionReason: {
              type: "other",
              reason: "stood down while held",
            },
          };
        }
      : canUseTool;
  let toolResult = {
    kind: "no_result",
  };
  let threadTranscript = request.threadTranscript;
  try {
    for await (let event of runToolUse(
      toolUse,
      emptyAutoReactMessage(threadId),
      permissionCheck,
      threadTranscript.length > 0
        ? {
            ...context,
            messages: [...context.messages, ...(context.sameTurnToolUses ?? []), ...threadTranscript],
            sameTurnToolUses: undefined,
          }
        : context,
      () => new Date().toISOString(),
    )) {
      if (hasTypeField(event)) continue;
      let message = event.message;
      if (message?.type !== "user" || !Array.isArray(message.message?.content)) continue;
      let found = message.message.content.find(
        (denial) =>
          typeof denial === "object" &&
          denial !== null &&
          denial.type === "tool_result" &&
          denial.tool_use_id === toolUseId,
      );
      if (!found) continue;
      if (found.is_error === true) {
        let toolDenialKind = message.toolDenialKind;
        let autoModeBlocked = toolDenialKind === "automode-unavailable" && !autoModeUnavailable;
        let arbiterIssue = autoModeBlocked ? getAutoModeArbiterIssue(context) : undefined;
        toolResult = {
          kind: "refused",
          denial: isDecisiveClassifierOutcome(toolDenialKind),
          autoModeDeclined:
            toolDenialKind === "automode-blocked" || toolDenialKind === "automode-parsing-error",
          noVerdict: toolDenialKind === "automode-parsing-error",
          classifierUnavailable: autoModeBlocked,
          unavailableUnderServerArbiter: autoModeBlocked && arbiterIssue === undefined,
          arbiterWithheld: arbiterIssue,
          ...(typeof message.userFeedback === "string" &&
            message.userFeedback !== "" && {
              feedback: message.userFeedback,
            }),
        };
        continue;
      }
      let toolUseResult = message.toolUseResult;
      if (toolUseResult && toolUseResult.replied === true) {
        toolResult = {
          kind: "posted",
          commentId: typeof toolUseResult.comment_id === "string" ? toolUseResult.comment_id : undefined,
          epoch,
        };
        if (
          toolResult.commentId !== undefined &&
          (await request.composedFromOwnWordsOnly().catch(() => false))
        )
          markReplyClean(toolResult.commentId);
      } else if (toolUseResult && toolUseResult.replied === false && toolUseResult.summon_answered === true)
        toolResult = {
          kind: "answered_elsewhere",
        };
      else if (toolUseResult && toolUseResult.replied === false && toolUseResult.summon_foreign === true)
        toolResult = {
          kind: "summon_foreign",
        };
      else if (toolUseResult && toolUseResult.replied === false && toolUseResult.already_answered === true)
        toolResult = {
          kind: "answered_post_time",
        };
      else if (toolUseResult && toolUseResult.replied === false)
        toolResult = {
          kind: "not_activated",
          ...(toolUseResult.page_owns_threads === true && {
            pageOwnsThreads: true,
          }),
        };
      else
        toolResult = {
          kind: "unexpected_result_shape",
        };
    }
  } finally {
    if (summonAnswer !== null) clearSummonAnswer(summonAnswer);
    clearPipelineReplyOrigin(pipelineOrigin);
  }
  if (standDownState.stoodDown === "account_changed")
    return {
      kind: "account_changed",
    };
  if (standDownState.stoodDown === "answered")
    return {
      kind: "answered_post_time",
    };
  if (summonAnswer !== null && toolResult.kind === "posted" && !summonAnswer.consumed)
    logFeatureSad(
      "artifact_comments_autoreact",
      summonAnswer.continuesReplyId !== undefined
        ? "follow_up_marker_unconsumed"
        : "summon_declaration_unconsumed",
    );
  return toolResult;
}
export {
  isAutoreactArmed,
  disarmAutoreact,
  shouldDropAutoReactNotice,
  markAutoReactNotice,
  isAutoReactEnabled,
  getSyntheticToolMessages,
  emptyAutoReactMessage,
  postThreadReply,
  applyPostOutcome,
  hasThreadAgentForSlugPost,
};
