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
  let t = !liveState.autoReact.userDisarmed && isCommentAutoreactOptedIn() && isArtifactsAvailable();
  setAutoReactWakeEnabled(liveState, t);
  return t;
}
//@ chunk-9tgt55am.js:56270-56459 placement
function setAutoReactWakeEnabled(liveState, t) {
  let n = t && !liveState.builtInArtifactHiddenForMcp;
  if (liveState.autoReact.wakeEnabledMemo !== t || liveState.autoReact.enabledMemo !== n) {
    liveState.autoReact.wakeEnabledMemo = t;
    liveState.autoReact.enabledMemo = n;
    emitSummonArmsForActivity(liveState.live);
  }
}
//@ chunk-9tgt55am.js:56459-56592 placement
/**
 * 判断自动回复产生的任务通知是否该丢弃：自动回复未开启，或对应 slug 已被停止。
 */
function shouldDropAutoReactNotice(e) {
  if (e?.kind !== "task-notification" || e.source !== "artifact-auto-react") return false;
  return !isAutoreactArmed() || (e.slug !== undefined && isSlugStoppedAnywhere(e.slug));
}
//@ chunk-9tgt55am.js:56592-56621 placement
/**
 * 导出函数 `hasThreadAgentForSlugPost`：参数 e，返回 hasThreadAgentForSlug(e)。
 */
function hasThreadAgentForSlugPost(e) {
  return hasThreadAgentForSlug(e);
}
//@ chunk-9tgt55am.js:56621-56732 placement
/**
 * 收到 artifact 自动响应的任务通知时，标记该 slug 有待处理的自动响应提示。
 */
function markAutoReactNotice(e) {
  if (e?.kind === "task-notification" && e.source === "artifact-auto-react" && e.slug !== undefined)
    markAutoReactNoticePending(e.slug);
}
//@ chunk-9tgt55am.js:56732-56992 placement
function disarmAutoreact(e) {
  let liveState = getLiveState();
  liveState.autoReact.userDisarmed = true;
  getWatchArtifactNoAutoreact(e?.storageV5);
  stopAllCommentMonitorIntents(e);
  for (let key of [...liveState.wakes.takenFrom.keys()])
    import("./chunk-4te7h8m1.js").then((a) => a.notifyTakenOverSlugStopped(key));
  resetAllLedgerSlugs();
  flushAutoreactLedger({
    flush: true,
    storageV5: e?.storageV5,
  });
  setAutoReactWakeEnabled(liveState, false);
  emitSummonArmsForActivity(liveState.live);
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
function applyPostOutcome(e) {
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
  } = e;
  let b = e.rulesOnlyProbe
    ? {
        rules_only: true,
      }
    : {};
  let N = e.rulesOnlyProbe ? b : undefined;
  if (post.kind === "refused") {
    if (e.heldForPerson === true && post.denial) {
      artifactState.heldReplyDeclined = true;
      logFeatureSad("artifact_comments_autoreact", "held_reply_declined", N);
      if (post.feedback !== undefined) {
        markAutoReactNoticePending(slug);
        notify({
          summary: replyNotPostedNotice(e.artifactName),
          detail:
            `The user declined a drafted reply to a comment thread on artifact ${e.url} and said: "${flattenCommentText(post.feedback)}". Act on that; replies to comments on this artifact will not be drafted for them again this session \u2014 use ${commentsToolReference()} to read and reply if they ask.` +
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
    let S =
      (post.autoModeDeclined || post.unavailableUnderServerArbiter) &&
      e.ownSendWithheld === undefined &&
      !artifactState.autoModeDeclineNoticed &&
      e.editLanded !== true &&
      isAutoReactEnabled() &&
      !isSlugStoppedAnywhere(slug) &&
      scanStamp(slug) === scanGen &&
      (post.autoModeDeclined || isGussetFlagOn());
    let w = S && !post.autoModeDeclined && !e.pageOwnsThreads;
    if (S) {
      artifactState.autoModeDeclineNoticed = true;
      markAutoReactNoticePending(slug);
      let L = describeAutoReplyHeld(
        e.trigger,
        "auto_mode_declined",
        e.url,
        e.artifactName,
        e.ackPosted
          ? {
              note: formatCommentIds([e.ackCommentId]),
            }
          : undefined,
      );
      notify(
        w
          ? {
              ...L,
              handOff: registerSummonHandOff(summon),
            }
          : L,
      );
    }
    if (post.autoModeDeclined) {
      logFeatureSad(
        "artifact_comments_autoreact",
        post.noVerdict ? "reply_auto_mode_no_verdict" : "reply_denied_by_auto_mode",
        {
          notified: S,
          ...b,
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
            notified: S,
            ...b,
          }
        : N,
    );
    if (w) logFeatureOk("artifact_comments_classifier_unavailable_handoff");
    else if (post.classifierUnavailable) {
      let L = S
        ? "notified_page_owns_threads"
        : (post.arbiterWithheld ??
          e.ownSendWithheld ??
          (artifactState.autoModeDeclineNoticed
            ? "already_notified"
            : e.editLanded === true
              ? "edit_landed"
              : !isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== scanGen
                ? "auto_replies_stopped"
                : "flag_off"));
      logFeatureSad("artifact_comments_classifier_unavailable_handoff", `${L}_at_post`);
    }
    emitArtifactSummonStatus(
      summon,
      w
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
    logFeatureSad("artifact_comments_autoreact", "pipeline_no_result", N);
    emitArtifactSummonStatus(summon, {
      status: "declined",
      reason: "blocked",
    });
    return;
  }
  if (post.kind === "not_activated") {
    if (post.pageOwnsThreads) {
      logFeatureSad("artifact_comments_autoreact", "page_owns_threads", N);
      emitArtifactSummonStatus(summon, {
        status: "declined",
        reason: "blocked",
      });
      if (replyWithheldNotice !== undefined)
        if (isAutoReactEnabled() && !isSlugStoppedAnywhere(slug) && scanStamp(slug) === scanGen) {
          markAutoReactNoticePending(slug);
          notify(replyWithheldNotice);
        } else logFeatureSad("artifact_comments_autoreact", "page_owns_threads_notice_suppressed", N);
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
    logFeatureSad("artifact_comments_autoreact", toStandDownReason(post.kind), N);
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
          N,
        );
    return;
  }
  if (post.kind === "unexpected_result_shape") {
    threadState.consecutivePipelineDenials += 1;
    logFeatureBad("artifact_comments_autoreact", "unexpected_result_shape", N);
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
    e.heldForPerson !== true &&
    (!isAutoReactEnabled() || isSlugStoppedAnywhere(slug) || scanStamp(slug) !== scanGen)
  ) {
    logFeatureOk("artifact_comments_autoreact", {
      replied: true,
      post_stop_notice_suppressed: true,
      ...b,
    });
    return;
  }
  markAutoReactNoticePending(slug);
  notify(notice);
  logFeatureOk("artifact_comments_autoreact", {
    replied: true,
    ...b,
  });
}
//@ chunk-9tgt55am.js:61025-61481 placement
async function recheckReplyTarget(e) {
  let artifactUrl = parseArtifactUrl(e.url);
  if (artifactUrl === null) return false;
  if (
    isCommentReadGated(
      e.context,
      {
        slug: e.slug,
        env: artifactUrl.env,
      },
      e.url,
    )
  )
    return false;
  let n = await readArtifactComments(
    {
      slug: e.slug,
      env: artifactUrl.env,
    },
    e.context.abortController.signal,
    e.context.credentials,
    "artifact_autoreact_post_recheck",
  ).catch(() => ({
    err: "recheck_read_threw",
  }));
  if (e.waited) return lastPersonComment(n, e.threadId, e.recheck.scanRowIds) !== null;
  let a = threadAwaitsClaudeById(n, e.threadId);
  return a !== null && !e.recheck.ownReplyIds.has(a.id) && !e.recheck.scanRowIds.has(a.id);
}
//@ chunk-9tgt55am.js:61481-64634 placement
/**
 * 以 Artifact 工具发布评论回复：先复查权限与线程状态，处理被扣留/等待的情况。
 */
async function postThreadReply(e) {
  let { tool, context, url, slug, threadId, text, declareAnswersSummon } = e;
  let { recheck, held } = e;
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
  let N = `autoreact-${threadId}-${getLiveState().autoReact.postSeq++}`;
  let S = {
    type: "tool_use",
    id: N,
    ...commentsToolCall(tool.name, {
      action: "reply",
      url,
      thread_id: threadId,
      text,
    }),
  };
  let w = declareAnswersSummon
    ? rememberSummonAnswer({
        slug,
        threadId,
        expectedToolUseId: N,
      })
    : e.continuesReplyId !== undefined
      ? rememberSummonAnswer({
          slug,
          threadId,
          expectedToolUseId: N,
          continuesReplyId: e.continuesReplyId,
        })
      : null;
  let L = registerPipelineReplyOrigin({
    slug,
    threadId,
    expectedToolUseId: N,
  });
  let P = {
    stoodDown: null,
  };
  let D = false;
  let G = async (...Y) => {
    let z = await (e.canUseTool ?? evaluateAskingNoHost)(...Y);
    D =
      z.behavior === "deny" &&
      z.decisionReason?.type === "classifier" &&
      z.decisionReason.monitorBlocked === true;
    return z;
  };
  let V =
    held !== undefined
      ? async (Y, z, Q, I, j, Z) => {
          let ce = await G(Y, z, Q, I, j, Z);
          let le = () => getLiveState().accountEpoch !== held.admittedEpoch;
          if (le()) P.stoodDown = "account_changed";
          else if (ce.behavior !== "allow") return ce;
          else if (
            recheck !== undefined &&
            (await recheckReplyTarget({
              recheck,
              url,
              slug,
              threadId,
              context: Q,
              waited,
            }))
          )
            P.stoodDown = le() ? "account_changed" : "answered";
          else if (le()) P.stoodDown = "account_changed";
          else return ce;
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
      : G;
  let q = {
    kind: "no_result",
  };
  let threadTranscript = e.threadTranscript;
  try {
    for await (let Y of runToolUse(
      S,
      emptyAutoReactMessage(threadId),
      V,
      threadTranscript.length > 0
        ? {
            ...context,
            messages: [...context.messages, ...(context.sameTurnToolUses ?? []), ...threadTranscript],
            sameTurnToolUses: undefined,
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
      if (found.is_error === true) {
        let toolDenialKind = message.toolDenialKind;
        let Z = toolDenialKind === "automode-unavailable" && !D;
        let ce = Z ? getAutoModeArbiterIssue(context) : undefined;
        q = {
          kind: "refused",
          denial: isDecisiveClassifierOutcome(toolDenialKind),
          autoModeDeclined:
            toolDenialKind === "automode-blocked" || toolDenialKind === "automode-parsing-error",
          noVerdict: toolDenialKind === "automode-parsing-error",
          classifierUnavailable: Z,
          unavailableUnderServerArbiter: Z && ce === undefined,
          arbiterWithheld: ce,
          ...(typeof message.userFeedback === "string" &&
            message.userFeedback !== "" && {
              feedback: message.userFeedback,
            }),
        };
        continue;
      }
      let toolUseResult = message.toolUseResult;
      if (toolUseResult && toolUseResult.replied === true) {
        q = {
          kind: "posted",
          commentId: typeof toolUseResult.comment_id === "string" ? toolUseResult.comment_id : undefined,
          epoch,
        };
        if (q.commentId !== undefined && (await e.composedFromOwnWordsOnly().catch(() => false)))
          markReplyClean(q.commentId);
      } else if (toolUseResult && toolUseResult.replied === false && toolUseResult.summon_answered === true)
        q = {
          kind: "answered_elsewhere",
        };
      else if (toolUseResult && toolUseResult.replied === false && toolUseResult.summon_foreign === true)
        q = {
          kind: "summon_foreign",
        };
      else if (toolUseResult && toolUseResult.replied === false && toolUseResult.already_answered === true)
        q = {
          kind: "answered_post_time",
        };
      else if (toolUseResult && toolUseResult.replied === false)
        q = {
          kind: "not_activated",
          ...(toolUseResult.page_owns_threads === true && {
            pageOwnsThreads: true,
          }),
        };
      else
        q = {
          kind: "unexpected_result_shape",
        };
    }
  } finally {
    if (w !== null) clearSummonAnswer(w);
    clearPipelineReplyOrigin(L);
  }
  if (P.stoodDown === "account_changed")
    return {
      kind: "account_changed",
    };
  if (P.stoodDown === "answered")
    return {
      kind: "answered_post_time",
    };
  if (w !== null && q.kind === "posted" && !w.consumed)
    logFeatureSad(
      "artifact_comments_autoreact",
      w.continuesReplyId !== undefined ? "follow_up_marker_unconsumed" : "summon_declaration_unconsumed",
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
  emptyAutoReactMessage,
  postThreadReply,
  applyPostOutcome,
  hasThreadAgentForSlugPost,
};
