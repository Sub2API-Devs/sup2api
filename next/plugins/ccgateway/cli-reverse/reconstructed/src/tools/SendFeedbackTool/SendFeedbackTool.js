/**
 * tools/SendFeedbackTool/SendFeedbackTool.ts
 *
 * 2.1.316 新增：SendFeedback 工具 schema 与实现；SendFeedback 工具说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { fromNumber, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { AGENT, TASK } from "../AgentTool/constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  _enum,
  stringSchema,
  objectSchema,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  FEEDBACK_TYPES,
  FEEDBACK_FAILURE_MODES,
  FEEDBACK_TASK_CATEGORIES,
  feedbackRelayConfig,
  tryCountFeedbackToolCall,
  getMaxToolCallsPerSession,
  createFeedbackDraft,
  saveFeedbackDraft,
  decrementSessionDraftCount,
  noteFeedbackDraft,
  MAX_NOTICE_LINES,
  truncateChars,
  MAX_NOTICE_PROMPT_CHARS,
  MAX_QUEUED_DRAFTS,
  sanitizeTitle,
} from "../../services/feedback/feedbackDrafts.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isFeedbackDraftsEnabled } from "../../services/feedbackDrafts.js";
import { logEvent } from "../../services/analytics/index.js";
import { getSessionId, getLastMainRequestId } from "../../bootstrap/state.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { SYNTHETIC_MODEL } from "../../utils/messages.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { doesMostRecentAssistantMessageExceed200k } from "../../utils/tokens.js";
import { resolveEffortValue } from "../../utils/effort.js";
import { getCwd } from "../../utils/cwd.js";
import { env } from "../../utils/env.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { countWhere } from "../../utils/collections.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:93258-93280 placement
var SENDFEEDBACK = "SendFeedback";
//@ chunk-fmnbrxwy.js:93280-97059 placement
/**
 * SendFeedback 的提示词：哪些时机该起草反馈。
 */
var SEND_FEEDBACK_DESCRIPTION =
  "Queue a draft feedback report about Claude Code (the product OR the model's own behavior in this session) for the user to review and send later. Nothing is sent anywhere by this tool: it writes a local draft the user can review, edit, and explicitly submit (or discard) via /feedback.";
var SEND_FEEDBACK_PROMPT = `Use this tool to draft feedback about Claude Code when you hit a high-signal moment. That includes both PRODUCT issues and MODEL-BEHAVIOR issues:
- a reproducible tool or product failure was just resolved or abandoned
- the user clearly expressed frustration with Claude Code or with how you handled the task
- you hit a missing capability that blocked a reasonable request
- you notice, or the user points out, that your own behavior in this session went wrong, for example: you gave a confident answer then had to retract it; you stopped short and handed work back when you could have finished; you declined or disputed a reasonable request; you spawned more subagents than the task warranted; your tone was off; you asked more clarifying questions than needed; you expanded scope beyond what was asked

The draft is QUEUED LOCALLY. It is never sent without the user's explicit approval, and calling this tool renders no UI and does not interrupt the conversation, so never announce it or ask the user about it mid-task.

Write \`details\` as short labeled bullets in this exact order, one to three lines each, no narrative paragraphs:
- **What happened:** the observed behavior vs. what was expected, with exact error text if short. Facts only.
- **What the user said:** the user's own words that prompted this, quoted. If nothing did, write "User didn't comment; observed by the model." Never paraphrase sentiment into a stronger claim.
- **Repro:** the minimal steps or shape that reproduces it.
- **Evidence:** identifiers a reader can chase, such as request IDs, timestamps, file paths, versions. Omit the bullet if there are none.

Constraints:
- Never fabricate or exaggerate user sentiment; report only what actually happened.
- Everything in the draft must be sourced from the user or the session, never inferred: leave unknown fields blank rather than guess, and add a final **Cause:** bullet only for a root cause you verified in-session.
- Use \`area\` to name the part of Claude Code the feedback is about (a feature, command, or workflow, e.g. "hooks config", "/help", "file editing") when there is a clear one; leave it blank otherwise.
- Use \`failure_mode\` ONLY when the report is about model behavior (how Claude responded), not a product bug. Pick the single closest value, or \`other\` when it is a model-behavior issue that fits no listed value; omit the field only when the report is a product/tool bug with no model-behavior component.
- Use \`task_category\` to name what kind of task the session was doing, or \`other\` when it is a clear task that fits no listed value. Omit only if genuinely unclear.
- Do not include secrets or credentials. Refer to people by role ("a teammate", "the PR reviewer"), never by name, email address, or chat/user ID. This applies inside quoted user words too: replace a name or handle with a bracketed role (e.g. "[a teammate]") and keep the rest verbatim. Do not include customer-facing channel or DM IDs, or excerpts of customer content. Session, request, and run IDs, timestamps, repo/PR numbers, and file paths (written relative to the working directory, or ~-prefixed, not absolute paths under the user's home) remain the right evidence.
- If the issue looks like a security vulnerability: describe the class of problem, never a working exploit or step-by-step extraction path.
- Draft only at the natural moments listed above, and at most one draft per distinct issue; never re-draft the same issue in a session.`;
//@ chunk-fmnbrxwy.js:97059-97068 placement
/**
 * 反馈里附带最近消息的条数（3）。
 */
var MAX_FEEDBACK_SNIPPETS = 3;
//@ chunk-fmnbrxwy.js:97068-97143 placement
/**
 * 把 effort 值转成字符串（数字转字符串，其余原样）。
 */
function serializeEffort(effortValue) {
  if (effortValue === undefined) return;
  return typeof effortValue === "number" ? String(effortValue) : effortValue;
}
//@ chunk-fmnbrxwy.js:97143-97217 placement
/**
 * 把 effort 值转成枚举（数字走 fromNumber）。
 */
function enumerateEffort(effortValue) {
  if (effortValue === undefined) return;
  return typeof effortValue === "number" ? fromNumber(effortValue) : fromEnum(effortValue);
}
//@ chunk-fmnbrxwy.js:97217-97384 placement
function countAgentToolUses(messages) {
  let count = 0;
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    for (let input of message.message.content)
      if (input.type === "tool_use" && (input.name === AGENT || input.name === TASK)) count++;
  }
  return count;
}
//@ chunk-fmnbrxwy.js:97384-102763 placement
/**
 * SendFeedback 的输入 schema（类型、标题、详情等）与输出 schema（success/message），以及工具定义。
 */
var SendFeedbackInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var sendFeedbackOutputSchema;
var SendFeedbackTool;
deferInit("chunk-fmnbrxwy.js:97384", () => {
  SendFeedbackInputSchema = DoctorLazy(() =>
    zodStrictObject({
      type: _enum(FEEDBACK_TYPES).describe("What kind of feedback this is."),
      title: stringSchema().min(1).describe("Short, specific one-line summary of the issue."),
      details: stringSchema()
        .min(1)
        .describe(
          `Labeled bullets, in order: **What happened:** (observed vs. expected, exact error text if short); **What the user said:** (quoted, or "User didn't comment; observed by the model."); **Repro:** (minimal steps); **Evidence:** (request IDs, timestamps, paths, versions; omit if none); optionally a final **Cause:** only if verified in-session. One to three lines per bullet. No narrative paragraphs, no speculation, no secrets.`,
        ),
      area: stringSchema()
        .optional()
        .describe(
          'Optional short tag naming the part of Claude Code this is about (e.g. "hooks config", "/help", "file editing"). Leave blank if unclear.',
        ),
      failure_mode: _enum(FEEDBACK_FAILURE_MODES)
        .optional()
        .describe(
          "When the report is about MODEL BEHAVIOR (not a product bug), the closest failure mode, or `other` when it is a model-behavior issue that fits no listed value. Omit only when the report is a product/tool bug with no model-behavior component.",
        ),
      task_category: _enum(FEEDBACK_TASK_CATEGORIES)
        .optional()
        .describe(
          "What kind of task the session was doing when the issue occurred, or `other` when it is a clear task that fits no listed value. Omit only if genuinely unclear.",
        ),
    }),
  );
  sendFeedbackOutputSchema = DoctorLazy(() =>
    objectSchema({
      success: booleanSchema(),
      message: stringSchema(),
    }),
  );
  SendFeedbackTool = buildTool({
    name: SENDFEEDBACK,
    backgrounding: "never",
    maxResultSizeChars: 1000,
    searchHint: "draft product or model-behavior feedback report queue",
    async description() {
      let { description } = feedbackRelayConfig();
      return typeof description === "string" && description !== "" ? description : SEND_FEEDBACK_DESCRIPTION;
    },
    async prompt() {
      let { prompt } = feedbackRelayConfig();
      return typeof prompt === "string" && prompt !== "" ? prompt : SEND_FEEDBACK_PROMPT;
    },
    get inputSchema() {
      return SendFeedbackInputSchema();
    },
    get outputSchema() {
      return sendFeedbackOutputSchema();
    },
    isReadOnly() {
      return false;
    },
    isConcurrencySafe() {
      return true;
    },
    isEnabled() {
      return isFeedbackDraftsEnabled();
    },
    create(toolContext) {
      return {
        async checkPermissions(updatedInput) {
          return {
            behavior: "allow",
            updatedInput,
          };
        },
        async call(input) {
          if (!isFeedbackDraftsEnabled())
            return {
              data: {
                success: false,
                message: "SendFeedback is not enabled in this session.",
              },
            };
          if (!tryCountFeedbackToolCall()) {
            let maxToolCallsPerSession = getMaxToolCallsPerSession();
            logEvent("tengu_feedback_draft_call_capped", {
              cap: fromNumber(maxToolCallsPerSession),
            });
            return {
              data: {
                success: false,
                message: `SendFeedback has reached its limit of ${maxToolCallsPerSession} calls per session. Do not call it again this session; drafts already queued are unaffected and the user can review them with /feedback.`,
              },
            };
          }
          let sessionId = getSessionId();
          let { getTranscriptPathForSession } = await import("../../utils/sessionStorage.lazy.js");
          let lastMainRequestId = getLastMainRequestId();
          let messages = toolContext.messages();
          let assistantRequestIds = [];
          let mainRequestIds = lastMainRequestId ? [lastMainRequestId] : [];
          for (let message of messages)
            if (message.type === "assistant" && message.requestId) {
              assistantRequestIds.push(message.requestId);
              if (!message.isApiErrorMessage) mainRequestIds.push(message.requestId);
            }
          let requestIdsInOrder = lastMainRequestId
            ? [...assistantRequestIds, lastMainRequestId]
            : assistantRequestIds;
          let uniqueRequestIds = normalizeCaseForComparison_2(requestIdsInOrder);
          let requestIds = uniqueRequestIds.slice(-MAX_FEEDBACK_SNIPPETS);
          let size = new Set(
            messages.flatMap((message) =>
              message.type === "assistant" &&
              !message.requestId &&
              !message.isVirtual &&
              message.message.model !== SYNTHETIC_MODEL
                ? [message.message.id]
                : [],
            ),
          ).size;
          let assistantTurnCount = Math.max(
            uniqueRequestIds.length,
            normalizeCaseForComparison_2(mainRequestIds).length + size,
          );
          let mode = toolContext.permissions().mode;
          let runtimeMainLoopModel = getRuntimeMainLoopModel({
            permissionMode: mode,
            mainLoopModel: toolContext.model(),
            exceeds200kTokens: mode === "plan" && doesMostRecentAssistantMessageExceed200k(messages),
          });
          let effortValue = resolveEffortValue(runtimeMainLoopModel, toolContext.effort(), {
            turnEffort: toolContext.effortLayerOverride(),
          });
          let thinkingConfig = toolContext.thinkingConfig();
          let draft = createFeedbackDraft({
            type: input.type,
            title: input.title,
            details: input.details,
            area: input.area,
            failureMode: input.failure_mode,
            taskCategory: input.task_category,
            trigger: "model_judgment",
            requestIds,
            sessionId,
            cwd: getCwd(),
            model: runtimeMainLoopModel,
            cliVersion: {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.318",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-11-03T18:52:53Z",
              GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
            os: `${env.platform} x64`,
            effort: serializeEffort(effortValue),
            thinkingType: thinkingConfig.type,
            thinkingBudget: thinkingConfig.type === "enabled" ? thinkingConfig.budgetTokens : undefined,
            messageCount: messages.length,
            assistantTurnCount,
            subagentCount: countAgentToolUses(messages),
            transcriptFile: getTranscriptPathForSession(sessionId),
          });
          let saveResult = await saveFeedbackDraft(draft, new Date(), toolContext.storageV5);
          if (!saveResult.success) {
            logFeatureBad("feedback_drafts", saveResult.reason);
            return {
              data: {
                success: false,
                message:
                  saveResult.reason === "too_large"
                    ? "Draft too large. Shorten the details and try once more."
                    : "Could not write the feedback draft to disk.",
              },
            };
          }
          let evictedCount = countWhere(
            saveResult.evicted,
            (evictedDraft) => evictedDraft.source_session_id === sessionId,
          );
          if (evictedCount > 0) decrementSessionDraftCount(evictedCount);
          let presentation = noteFeedbackDraft({
            draftId: draft.draft_id,
            title: draft.title,
            type: draft.type,
            detailsPreview: (() => {
              let lines = draft.details.split(`
`);
              let joined = lines.slice(0, MAX_NOTICE_LINES).join(`
`);
              let noticeExcerpt = truncateChars(joined, MAX_NOTICE_PROMPT_CHARS);
              return noticeExcerpt !== joined ||
                lines.slice(MAX_NOTICE_LINES).some((line) => line.trim() !== "")
                ? `${noticeExcerpt}\u2026`
                : noticeExcerpt;
            })(),
          });
          logEvent("tengu_feedback_draft_created", {
            type: fromEnum(draft.type),
            trigger: fromEnum(draft.trigger),
            presentation: fromEnum(presentation),
            request_id_count: fromNumber(draft.request_ids.length),
            evicted_count: fromNumber(saveResult.evicted.length),
            failure_mode: fromEnumOpt(draft.failure_mode),
            task_category: fromEnumOpt(draft.task_category),
            effort: enumerateEffort(effortValue),
            thinking_type: fromEnumOpt(draft.thinking_type),
            thinking_budget:
              draft.thinking_budget !== undefined ? fromNumber(draft.thinking_budget) : undefined,
            message_count: draft.message_count !== undefined ? fromNumber(draft.message_count) : undefined,
            assistant_turn_count:
              draft.assistant_turn_count !== undefined ? fromNumber(draft.assistant_turn_count) : undefined,
            subagent_count: draft.subagent_count !== undefined ? fromNumber(draft.subagent_count) : undefined,
          });
          logFeatureOk("feedback_drafts");
          enqueueTaskNotification({
            type: "system",
            subtype: "feedback_draft_queued",
            draft_id: draft.draft_id,
            draft_type: draft.type,
            title: draft.title,
            details_preview: truncateChars(draft.details, 200),
          });
          return {
            data: {
              success: true,
              message: `Feedback draft queued locally (max ${MAX_QUEUED_DRAFTS} kept). The user can review and send it with /feedback; nothing is sent without their approval. Do not announce this or ask the user about it.`,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        type: "tool_result",
        tool_use_id: toolUseId,
        content: result.message,
        is_error: !result.success,
      };
    },
    renderToolUseMessage(input) {
      return typeof input.title === "string" ? sanitizeTitle(input.title) : "";
    },
  });
});
export { SendFeedbackTool };
