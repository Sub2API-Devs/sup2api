/**
 * tools/SendFeedbackTool/SendFeedbackTool.ts
 *
 * 2.1.316 新增：SendFeedback 工具 schema 与实现；SendFeedback 工具说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (7)
 * attribution: placement 7
 */
import { fromNumber, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { AGENT, TASK } from "../AgentTool/constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, U, o, u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  FEEDBACK_TYPES,
  bon,
  Son,
  Ie,
  tryCountFeedbackToolCall,
  Ge,
  createFeedbackDraft,
  saveFeedbackDraft,
  decrementSessionDraftCount,
  noteFeedbackDraft,
  Rt,
  ke,
  Wo,
  MAX_QUEUED_DRAFTS,
  _on,
} from "../../services/feedback/feedbackDrafts.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { R5 } from "../../services/feedbackDrafts.js";
import { logEvent } from "../../services/analytics/index.js";
import { getSessionId, getLastMainRequestId } from "../../bootstrap/state.js";
import { uniq, count } from "../../utils/collections.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { getRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { doesMostRecentAssistantMessageExceed200k } from "../../utils/tokens.js";
import { resolveEffortValue } from "../../utils/effort.js";
import { getCwd } from "../../utils/cwd.js";
import { env } from "../../utils/env.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { enqueueTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-kxyd0g16.js:78544-78566 placement
var SENDFEEDBACK = "SendFeedback";
/**
 * SendFeedback 工具说明。
 */
//@ chunk-kxyd0g16.js:78566-82345 placement
var SEND_FEEDBACK_DESCRIPTION =
    "Queue a draft feedback report about Claude Code (the product OR the model's own behavior in this session) for the user to review and send later. Nothing is sent anywhere by this tool: it writes a local draft the user can review, edit, and explicitly submit (or discard) via /feedback.",
  Xo = `Use this tool to draft feedback about Claude Code when you hit a high-signal moment. That includes both PRODUCT issues and MODEL-BEHAVIOR issues:
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
//@ chunk-kxyd0g16.js:82345-82354 placement
var si = 3;
//@ chunk-kxyd0g16.js:82354-82429 placement
function ii(e) {
  if (e === void 0) return;
  return typeof e === "number" ? String(e) : e;
}
//@ chunk-kxyd0g16.js:82429-82503 placement
function li(e) {
  if (e === void 0) return;
  return typeof e === "number" ? fromNumber(e) : fromEnum(e);
}
//@ chunk-kxyd0g16.js:82503-82670 placement = countToolCallsSince (1)
function countAgentToolUses(e) {
  let toolCallCount = 0;
  for (let message of e) {
    if (message.type !== "assistant") continue;
    for (let s of message.message.content)
      if (s.type === "tool_use" && (s.name === AGENT || s.name === TASK)) toolCallCount++;
  }
  return toolCallCount;
}
/**
 * SendFeedback 工具 schema 与实现。
 */
//@ chunk-kxyd0g16.js:82670-88049 placement
var SendFeedbackInputSchema = DoctorLazy(() =>
    zodStrictObject({
      type: U(FEEDBACK_TYPES).describe("What kind of feedback this is."),
      title: o().min(1).describe("Short, specific one-line summary of the issue."),
      details: o()
        .min(1)
        .describe(
          `Labeled bullets, in order: **What happened:** (observed vs. expected, exact error text if short); **What the user said:** (quoted, or "User didn't comment; observed by the model."); **Repro:** (minimal steps); **Evidence:** (request IDs, timestamps, paths, versions; omit if none); optionally a final **Cause:** only if verified in-session. One to three lines per bullet. No narrative paragraphs, no speculation, no secrets.`,
        ),
      area: o()
        .optional()
        .describe(
          'Optional short tag naming the part of Claude Code this is about (e.g. "hooks config", "/help", "file editing"). Leave blank if unclear.',
        ),
      failure_mode: U(bon)
        .optional()
        .describe(
          "When the report is about MODEL BEHAVIOR (not a product bug), the closest failure mode, or `other` when it is a model-behavior issue that fits no listed value. Omit only when the report is a product/tool bug with no model-behavior component.",
        ),
      task_category: U(Son)
        .optional()
        .describe(
          "What kind of task the session was doing when the issue occurred, or `other` when it is a clear task that fits no listed value. Omit only if genuinely unclear.",
        ),
    }),
  ),
  mi = DoctorLazy(() => u({ success: M(), message: o() })),
  Zo = buildTool({
    name: SENDFEEDBACK,
    backgrounding: "never",
    maxResultSizeChars: 1000,
    searchHint: "draft product or model-behavior feedback report queue",
    async description() {
      let { description: description } = Ie();
      return typeof description === "string" && description !== "" ? description : SEND_FEEDBACK_DESCRIPTION;
    },
    async prompt() {
      let { prompt: prompt } = Ie();
      return typeof prompt === "string" && prompt !== "" ? prompt : Xo;
    },
    get inputSchema() {
      return SendFeedbackInputSchema();
    },
    get outputSchema() {
      return mi();
    },
    isReadOnly() {
      return !1;
    },
    isConcurrencySafe() {
      return !0;
    },
    isEnabled() {
      return R5();
    },
    create(e) {
      return {
        async checkPermissions(r) {
          return { behavior: "allow", updatedInput: r };
        },
        async call(r) {
          if (!R5())
            return { data: { success: !1, message: "SendFeedback is not enabled in this session." } };
          if (!tryCountFeedbackToolCall()) {
            let G = Ge();
            return (
              logEvent("tengu_feedback_draft_call_capped", { cap: fromNumber(G) }),
              {
                data: {
                  success: !1,
                  message: `SendFeedback has reached its limit of ${G} calls per session. Do not call it again this session; drafts already queued are unaffected and the user can review them with /feedback.`,
                },
              }
            );
          }
          let n = getSessionId(),
            { getTranscriptPathForSession: getTranscriptPathForSession } =
              await import("./chunk-hs5khexj.js"),
            f = getLastMainRequestId(),
            messages = e.messages(),
            y = [],
            k = f ? [f] : [];
          for (let G of messages)
            if (G.type === "assistant" && G.requestId) {
              if ((y.push(G.requestId), !G.isApiErrorMessage)) k.push(G.requestId);
            }
          let w = f ? [...y, f] : y,
            S = uniq(w),
            sliced = S.slice(-si),
            size = new Set(
              messages.flatMap((G) =>
                G.type === "assistant" && !G.requestId && !G.isVirtual && G.message.model !== SYNTHETIC_MODEL
                  ? [G.message.id]
                  : [],
              ),
            ).size,
            max = Math.max(S.length, uniq(k).length + size),
            mode = e.permissions().mode,
            B = getRuntimeMainLoopModel({
              permissionMode: mode,
              mainLoopModel: e.model(),
              exceeds200kTokens: mode === "plan" && doesMostRecentAssistantMessageExceed200k(messages),
            }),
            V = resolveEffortValue(B, e.effort(), { turnEffort: e.effortLayerOverride() }),
            thinkingConfig = e.thinkingConfig(),
            P = createFeedbackDraft({
              type: r.type,
              title: r.title,
              details: r.details,
              area: r.area,
              failureMode: r.failure_mode,
              taskCategory: r.task_category,
              trigger: "model_judgment",
              requestIds: sliced,
              sessionId: n,
              cwd: getCwd(),
              model: B,
              cliVersion: {
                ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
                PACKAGE_URL: "@anthropic-ai/claude-code",
                README_URL: "https://code.claude.com/docs/en/overview",
                VERSION: "2.1.316",
                FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
                BUILD_TIME: "2026-10-30T23:28:13Z",
                GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
                HOOKS_WORKER_URL:
                  import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
                DD_SOURCEMAP_GROUP: "default",
              }.VERSION,
              os: `${env.platform} x64`,
              effort: ii(V),
              thinkingType: thinkingConfig.type,
              thinkingBudget: thinkingConfig.type === "enabled" ? thinkingConfig.budgetTokens : void 0,
              messageCount: messages.length,
              assistantTurnCount: max,
              subagentCount: countAgentToolUses(messages),
              transcriptFile: getTranscriptPathForSession(n),
            }),
            L = await saveFeedbackDraft(P, new Date(), e.storageV5);
          if (!L.success)
            return (
              logFeatureBad("feedback_drafts", L.reason),
              {
                data: {
                  success: !1,
                  message:
                    L.reason === "too_large"
                      ? "Draft too large. Shorten the details and try once more."
                      : "Could not write the feedback draft to disk.",
                },
              }
            );
          let W = count(L.evicted, (G) => G.source_session_id === n);
          if (W > 0) decrementSessionDraftCount(W);
          let Q = noteFeedbackDraft({
            draftId: P.draft_id,
            title: P.title,
            type: P.type,
            detailsPreview: (() => {
              let parts = P.details.split(`
`),
                joined = parts.slice(0, Rt).join(`
`),
                he = ke(joined, Wo);
              return he !== joined || parts.slice(Rt).some((ee) => ee.trim() !== "") ? `${he}\u2026` : he;
            })(),
          });
          return (
            logEvent("tengu_feedback_draft_created", {
              type: fromEnum(P.type),
              trigger: fromEnum(P.trigger),
              presentation: fromEnum(Q),
              request_id_count: fromNumber(P.request_ids.length),
              evicted_count: fromNumber(L.evicted.length),
              failure_mode: fromEnumOpt(P.failure_mode),
              task_category: fromEnumOpt(P.task_category),
              effort: li(V),
              thinking_type: fromEnumOpt(P.thinking_type),
              thinking_budget: P.thinking_budget !== void 0 ? fromNumber(P.thinking_budget) : void 0,
              message_count: P.message_count !== void 0 ? fromNumber(P.message_count) : void 0,
              assistant_turn_count:
                P.assistant_turn_count !== void 0 ? fromNumber(P.assistant_turn_count) : void 0,
              subagent_count: P.subagent_count !== void 0 ? fromNumber(P.subagent_count) : void 0,
            }),
            logFeatureOk("feedback_drafts"),
            enqueueTaskNotification({
              type: "system",
              subtype: "feedback_draft_queued",
              draft_id: P.draft_id,
              draft_type: P.type,
              title: P.title,
              details_preview: ke(P.details, 200),
            }),
            {
              data: {
                success: !0,
                message: `Feedback draft queued locally (max ${MAX_QUEUED_DRAFTS} kept). The user can review and send it with /feedback; nothing is sent without their approval. Do not announce this or ask the user about it.`,
              },
            }
          );
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, r) {
      return { type: "tool_result", tool_use_id: r, content: e.message, is_error: !e.success };
    },
    renderToolUseMessage(e) {
      return typeof e.title === "string" ? _on(e.title) : "";
    },
  });

export { Zo };
