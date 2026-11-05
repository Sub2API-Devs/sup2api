/**
 * components/fleet/sessionAttention.ts
 *
 * 2.1.316 新增：Fleet 视图中会话需要关注的原因（等待权限、计划审批、云环境失败等）归类与描述
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (15)
 * attribution: placement 15
 */
import {
  truncateWithEllipsis as truncateWithEllipsis_3,
  MAX_HEADLINE_LENGTH,
} from "../../services/sessionStatus/sessionStateClassifier.js";
import { createSignal } from "../../utils/signal.js";
import { sanitizeDisplayText, replaceControlChars } from "../../utils/resultError.js";
import { toWellFormedString, truncateToLength } from "../../utils/stringUtils.js";
import { getGraphemeSegmenter } from "../../utils/intl.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { terminalOutcome, SEED_DETAIL } from "../../services/daemon/jobState.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { UNIQUENESS_REFINE_2 } from "../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { describeCloudSession } from "../../utils/telemetry/memorySummary.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1799050-1799642 placement
/**
 * 解析 AskUserQuestion 的输入：取问题与选项，生成 “answer: 问题 (选项…)” 摘要。
 */
function summarizePendingQuestions(block) {
  let blockObject = typeof block === "object" && block !== null ? block : undefined;
  let questions = Array.isArray(blockObject?.questions) ? blockObject.questions : [];
  let validQuestions = [];
  let firstQuestionText = "";
  for (let question of questions) {
    let questionEntry = question;
    if (typeof questionEntry?.question !== "string") continue;
    firstQuestionText ||= questionEntry.question;
    let options = Array.isArray(questionEntry.options)
      ? questionEntry.options.flatMap((option) => {
          let optionEntry = option;
          return typeof optionEntry?.label === "string"
            ? [
                {
                  label: optionEntry.label,
                  description: typeof optionEntry.description === "string" ? optionEntry.description : "",
                },
              ]
            : [];
        })
      : [];
    if (options.length > 0)
      validQuestions.push({
        question: questionEntry.question,
        options,
      });
  }
  let joined = validQuestions[0]?.options.map((option) => option.label).join(" \xB7 ");
  return {
    text: firstQuestionText
      ? truncateAttentionText(`answer: ${firstQuestionText}${joined ? ` (${joined})` : ""}`)
      : "answer question",
    questions: validQuestions.length > 0 ? validQuestions : undefined,
  };
}
//@ chunk-5xgkngpb.js:1799642-1799700 placement
/**
 * 函数 truncateAttentionText（压缩空白后按上限截断）。
 */
function truncateAttentionText(text) {
  return truncateWithEllipsis_3(text.replace(/\s+/g, " ").trim(), MAX_HEADLINE_LENGTH);
}
//@ chunk-5xgkngpb.js:1799700-1799768 placement
/**
 * 函数 looksLikeApproveLine（文本是否以 "approve …" 开头）。
 */
function looksLikeApproveLine(needs) {
  return needs !== undefined && /(?:^| \u00B7 )approve /.test(needs);
}
//@ chunk-5xgkngpb.js:1799768-1801262 placement
/**
 * Fleet 中"需要关注"种类（权限、对话框、elicitation、托管设置等）到显示文字的对照表。
 */
var ATTENTION_KIND_LABELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var attentionRegistryStore;
deferInit("chunk-5xgkngpb.js:1799768", () => {
  ATTENTION_KIND_LABELS = [
    "elicitation",
    "sandbox",
    "managed-settings",
    "permission",
    "dialog",
    "elicitation-queued",
    "sandbox-queued",
  ];
  attentionRegistryStore = (() => {
    let signal = createSignal();
    let byKind = {
      sandbox: null,
      "sandbox-queued": null,
      permission: null,
      elicitation: null,
      "elicitation-queued": null,
      "managed-settings": null,
      dialog: null,
    };
    let currentBlock = null;
    let openAsks = new Map();
    let opened = 0;
    let visibleAskId = null;
    function topAskBlock() {
      let best;
      for (let ask of openAsks.values()) {
        if (ask.order === visibleAskId) return ask.block;
        if (
          best === undefined ||
          (ask.onTop ? !best.onTop || ask.opened > best.opened : !best.onTop && ask.order < best.order)
        )
          best = ask;
      }
      return best?.block ?? null;
    }
    let maxHookFailures = 8;
    let maxHookFailureChars = 240;
    let hookFailures = new Map();
    function cleanHookText(text) {
      return truncateWithEllipsis_3(
        text
          .replace(/[^\x20-\x7e]/g, " ")
          .replace(/ {2,}/g, " ")
          .trim(),
        maxHookFailureChars,
      );
    }
    function withHookFailure(block) {
      let hookFailure = block.toolUseID === undefined ? undefined : hookFailures.get(block.toolUseID);
      return hookFailure === undefined
        ? block
        : {
            ...block,
            text: truncateAttentionText(`${cleanHookText(hookFailure)} \xB7 ${block.text}`),
          };
    }
    function publishCurrent() {
      let next = null;
      for (let kind of ATTENTION_KIND_LABELS) {
        let block = byKind[kind];
        if (block) {
          next = withHookFailure(block);
          break;
        }
      }
      if (next?.text === currentBlock?.text) return;
      currentBlock = next;
      signal.emit(next);
    }
    return {
      subscribe: signal.subscribe,
      current() {
        return currentBlock;
      },
      emit(value, kind = "permission") {
        let block =
          value === null
            ? null
            : typeof value === "string"
              ? {
                  text: value,
                }
              : value;
        if (kind === "permission" && block === null) {
          openAsks.clear();
          visibleAskId = null;
        }
        if (byKind[kind]?.text === block?.text) return;
        byKind[kind] = block;
        publishCurrent();
      },
      openAsk(block, opts) {
        opened += 1;
        openAsks.set(block.toolUseID, {
          block,
          ...opts,
          opened,
        });
        byKind.permission = topAskBlock();
        publishCurrent();
      },
      showAsk(toolUseId) {
        if (toolUseId === visibleAskId) return;
        visibleAskId = toolUseId;
        byKind.permission = topAskBlock();
        publishCurrent();
      },
      closeAsk(toolUseId) {
        if (!openAsks.delete(toolUseId)) return;
        byKind.permission = topAskBlock();
        publishCurrent();
      },
      noteHookFailure(toolUseId, failureText) {
        hookFailures.delete(toolUseId);
        hookFailures.set(toolUseId, failureText);
        if (hookFailures.size > maxHookFailures) {
          let toolUseID = byKind.permission?.toolUseID;
          for (let key of hookFailures.keys())
            if (key !== toolUseID) {
              hookFailures.delete(key);
              break;
            }
        }
        publishCurrent();
      },
      clearHookFailure(toolUseId) {
        hookFailures.delete(toolUseId);
      },
    };
  })();
});
//@ chunk-5xgkngpb.js:1801262-1801470 placement (2.1.88 match: truncateStartToWidth, 1)
/**
 * 清理控制字符与零宽字素，按长度上限截断并加省略号。
 */
function sanitizeAttentionText(text) {
  if (typeof text !== "string") return "";
  let clean = sanitizeDisplayText(
    replaceControlChars(toWellFormedString(truncateToLength(text, 4 * MAX_HEADLINE_LENGTH))),
  );
  let truncated = text.length > 4 * MAX_HEADLINE_LENGTH || clean.length > MAX_HEADLINE_LENGTH - 2;
  let out = "";
  for (let { segment } of getGraphemeSegmenter().segment(
    truncated ? truncateToLength(clean, MAX_HEADLINE_LENGTH - 2) : clean,
  ))
    out += bunStringWidth(segment) === 0 ? " " : segment;
  return sanitizeDisplayText(truncated ? `${out} \u2026` : out);
}
//@ chunk-5xgkngpb.js:1801470-1801494 placement
/**
 * 函数 returnFalseAttention（恒 false）。
 */
function returnFalseAttention() {
  return false;
}
//@ chunk-5xgkngpb.js:1801494-1801525 placement
/**
 * 函数 emptyMergedJobs（恒返回空数组）。
 */
async function emptyMergedJobs(options) {
  return [];
}
//@ chunk-5xgkngpb.js:1801525-1801639 placement
/**
 * 云会话列表遍历中途失败，携带已获取的行。
 */
class CloudListPartialError_2 extends Error {
  rows;
  constructor(rows, cause) {
    super("the cloud list walk failed part way", {
      cause,
    });
    this.rows = rows;
  }
}
//@ chunk-5xgkngpb.js:1801639-1801664 placement
/**
 * 类 CloudListPartialError（云会话列表中途失败，携带已取到的行）。
 */
class CloudListPartialError extends Error {}
//@ chunk-5xgkngpb.js:1801664-1803067 placement
/**
 * 为 Fleet 视图描述会话需要用户处理的事项（审批计划、批准工具、阻塞等）。
 */
function describeSessionAttention(session) {
  let { state, tempo, reason } = describeSessionFailure(session);
  let sources = session.config?.sources;
  let repoUrl = sanitizeAttentionText(
    Array.isArray(sources) ? sources.find((source) => source?.type === "git_repository")?.url : undefined,
  );
  let title = sanitizeAttentionText(session.title);
  let postTurnSummary = session.external_metadata?.post_turn_summary;
  let statusDetail =
    sanitizeStatusDetail(postTurnSummary?.status_detail) ||
    sanitizeStatusDetail(session.external_metadata?.task_summary);
  let recentAction =
    terminalOutcome(state) === "success" && postTurnSummary?.reply === undefined
      ? sanitizeStatusDetail(postTurnSummary?.recent_action)
      : "";
  let needsAction = sanitizeStatusDetail(postTurnSummary?.needs_action);
  let outcomes = session.config?.outcomes;
  let gitInfo = Array.isArray(outcomes)
    ? outcomes.find((outcome) => outcome?.type === "git_repository")?.git_info
    : undefined;
  let pendingAction =
    session.worker_status === "requires_action" ? session.external_metadata?.pending_action : undefined;
  let toolLabel =
    [pendingAction?.display_tool_name, pendingAction?.tool_name]
      .map(sanitizeAttentionText)
      .find((candidate) => /^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(candidate)) ?? "a tool";
  let actionDescription = sanitizeAttentionText(pendingAction?.action_description);
  let needs =
    tempo === "blocked"
      ? pendingAction?.tool_name === ASKUSERQUESTION
        ? summarizePendingQuestions(UNIQUENESS_REFINE_2(pendingAction.input)).text
        : pendingAction?.tool_name === EXITPLANMODE
          ? "approve plan"
          : typeof pendingAction?.tool_name === "string" && actionDescription !== ""
            ? truncateAttentionText(
                pendingAction.tool_name.startsWith("dialog:")
                  ? `awaiting input: ${actionDescription}`
                  : `approve ${toolLabel}: ${actionDescription}`,
              )
            : truncateAttentionText(needsAction ? `awaiting input: ${needsAction}` : "awaiting input")
      : undefined;
  return {
    state,
    detail:
      reason ||
      statusDetail ||
      truncateAttentionText(
        [gitInfo?.repo, Array.isArray(gitInfo?.branches) ? gitInfo.branches[0] : undefined]
          .map(sanitizeStatusDetail)
          .filter((part) => part !== "")
          .join(" \xB7 "),
      ) ||
      "no summary yet",
    tempo,
    needs,
    output: recentAction
      ? {
          result: recentAction,
        }
      : null,
    children: null,
    linkScanOffset: 0,
    template: "remote",
    respawnFlags: [],
    name: title || undefined,
    intent: sanitizeAttentionText(session.id),
    sessionId: session.id,
    cwd: repoUrl || "remote",
    originCwd: repoUrl || "remote",
    createdAt: session.created_at,
    updatedAt: session.last_event_at ?? session.created_at,
    firstTerminalAt: null,
    backend: "remote",
  };
}
//@ chunk-5xgkngpb.js:1803067-1803351 placement
/**
 * 把尚未出现在列表里的 remote-pending 会话追加进来；内容不变时返回原数组。
 */
function mergePendingRemoteJobs(previous, incoming) {
  let incomingSessionIds = new Set(incoming.map((job) => sessionIdBody(job.state.sessionId)));
  let filtered = previous.filter(
    (job) =>
      job.id.startsWith("remote-pending-") && !incomingSessionIds.has(sessionIdBody(job.state.sessionId)),
  );
  let merged = [...incoming, ...filtered];
  return previous.length === merged.length &&
    previous.every(
      (job, jobIndex) =>
        job.id === merged[jobIndex].id &&
        job.activity === merged[jobIndex].activity &&
        true &&
        shallowJobStateEqual(job.state, merged[jobIndex].state),
    )
    ? previous
    : merged;
}
//@ chunk-5xgkngpb.js:1803351-1803583 placement
/**
 * 浅比较会话状态（对象值用 Bun.deepEquals）。
 */
function shallowJobStateEqual(state, state_2) {
  let keys = Object.keys(state);
  if (keys.length !== Object.keys(state_2).length) return false;
  return keys.every((key) => {
    let left = state[key];
    let right = state_2[key];
    if (left === right) return true;
    return (
      typeof left === "object" &&
      typeof right === "object" &&
      left !== null &&
      right !== null &&
      Bun.deepEquals(left, right)
    );
  });
}
//@ chunk-5xgkngpb.js:1803583-1803663 placement
function isPausedNeedingAction(session) {
  return session.status === "paused" && session.worker_status === "requires_action";
}
//@ chunk-5xgkngpb.js:1803663-1804884 placement
/**
 * 为 Fleet 视图描述一个会话失败的原因（如云环境启动失败）。
 */
function describeSessionFailure(session) {
  let startupFailure = describeCloudSession(session).startup_failure;
  if (startupFailure !== undefined) {
    let message = session.external_metadata?.last_init_error?.message;
    let isTruncated =
      typeof message === "string" && message.length > 4000 && !startupFailure.endsWith("\u2026");
    return {
      state: "failed",
      tempo: "idle",
      reason:
        sanitizeAttentionText(isTruncated ? `${startupFailure} \u2026` : startupFailure) ||
        "the cloud environment failed to start",
    };
  }
  if (session.worker_status === "requires_action")
    return {
      state: isPausedNeedingAction(session) ? "blocked" : "working",
      tempo: "blocked",
    };
  if (session.worker_status === "idle" || session.status === "paused")
    switch (session.status_bucket) {
      case "blocked":
        return {
          state: "blocked",
          tempo: "blocked",
        };
      case "failed":
        return {
          state: "failed",
          tempo: "idle",
          reason:
            sanitizeStatusDetail(session.external_metadata?.post_turn_summary?.status_detail) ||
            "the last turn failed",
        };
      case "working":
        return {
          state: "working",
          tempo: "active",
        };
      case "completed":
        return {
          state: "done",
          tempo: "idle",
        };
      default:
        return session.worker_status === "idle"
          ? {
              state: "done",
              tempo: "idle",
            }
          : {
              state: "stopped",
              tempo: "idle",
              reason: "paused \xB7 reply to resume",
            };
    }
  if (session.worker_status === "running" && session.connection_status === "disconnected")
    return {
      state: "stopped",
      tempo: "idle",
      reason: "lost contact with the cloud environment",
    };
  if (
    session.worker_status === undefined ||
    session.worker_status === null ||
    session.worker_status === "WORKER_STATUS_UNSPECIFIED"
  )
    return {
      state: "working",
      tempo: "active",
      reason: SEED_DETAIL,
    };
  return {
    state: "working",
    tempo: "active",
  };
}
//@ chunk-5xgkngpb.js:1804884-1804981 placement
function sanitizeStatusDetail(detail) {
  let clean = sanitizeAttentionText(detail);
  return /[\p{L}\p{N}]/u.test(clean) && !clean.startsWith("[ede_diagnostic]") ? clean : "";
}
export {
  attentionRegistryStore,
  sanitizeAttentionText,
  looksLikeApproveLine,
  returnFalseAttention,
  CloudListPartialError_2,
  CloudListPartialError,
  emptyMergedJobs,
  describeSessionAttention,
  mergePendingRemoteJobs,
  truncateAttentionText,
  summarizePendingQuestions,
};
