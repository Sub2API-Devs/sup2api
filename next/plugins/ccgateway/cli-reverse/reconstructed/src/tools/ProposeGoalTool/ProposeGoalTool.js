/**
 * tools/ProposeGoalTool/ProposeGoalTool.ts
 *
 * 2.1.316 新增：ProposeGoal 工具（提议会话目标完成条件）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bktadp8a.js (1), chunk-cnjyw3ht.js (3)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  booleanSchema,
  objectSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  getProposeGoalAvailabilityLogged,
  setProposeGoalAvailabilityLogged,
  getIsNonInteractiveSession,
  getIsRemoteMode,
  mainAgentId,
} from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { isProposeGoalEnabled } from "./constants.js";
import {
  getModelProposedGoalsSettingParsed,
  getModelProposedGoalsSetting,
} from "../../utils/settings/settings.js";
import { truncateWithNotice, collapseLineBreaks } from "../../utils/truncationNotice.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { isGoalClearKeyword, getGoalBlockedReason } from "../../commands/goal/goal.js";
import { IdHolder } from "../../utils/idHolder.js";
import { GOAL_PROPOSAL_DIALOG } from "../../components/goal/goalProposalDialog.js";
import { logError } from "../../utils/log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bktadp8a.js:191-1781 placement
/**
 * 目标完成条件允许的最大字符数（500）。
 */
var PROPOSEGOAL = "ProposeGoal";
var MAX_GOAL_CONDITION_CHARS = 500;
var PROPOSEGOAL_DESCRIPTION =
  "Propose a session goal condition, with one-keypress user approval; once set, Claude keeps working until a separate evaluator confirms it is met";
var PROPOSEGOAL_PROMPT = `Propose a completion condition for this session's work \u2014 a goal that keeps you working until a separate evaluator confirms it is met. Non-blocking: the proposal renders alongside your work, so keep working while it is handled.

ask_user true (the default) asks the user first, with a one-keypress approval dialog. If they decline you will not be notified \u2014 do not ask about the decision and do not re-propose the same or a reworded condition. Set ask_user false \u2014 which sets the goal directly, with no dialog \u2014 ONLY when the user's own words in this conversation stated this outcome as what they want; if you inferred it from their intent or the task's shape \u2014 or are in doubt \u2014 ask. Either path confirms a set goal with a kickoff message; until that message arrives, no new goal is active.

Propose only when the user has asked for an outcome with a verifiable end state ("make the tests pass", "migrate every call site") and the work spans multiple turns. Not for one-off tasks, and never to widen scope: the condition must follow from their request.

The evaluator verifies the condition from the conversation alone \u2014 it cannot run commands or read files \u2014 so state one measurable end state with its check (e.g. "bun test exits 0"), in at most ${500} characters. One goal is active at a time; a newly approved or directly set proposal replaces the current one.`;
//@ chunk-cnjyw3ht.js:4872-5803 placement
/**
 * ProposeGoal 的输出 schema。
 */
var proposeGoalInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var proposeGoalOutputSchema;
deferInit("chunk-cnjyw3ht.js:4872", () => {
  proposeGoalInputSchema = DoctorLazy(() =>
    zodStrictObject({
      condition: stringSchema()
        .min(1)
        .max(MAX_GOAL_CONDITION_CHARS)
        .describe(
          `The completion condition to propose, written so a separate evaluator can verify it from the conversation (e.g. "all tests in test/auth pass (bun test exits 0)"). At most ${MAX_GOAL_CONDITION_CHARS} characters \u2014 the user must be able to read the whole condition in the approval dialog.`,
        ),
      ask_user: booleanSchema()
        .optional()
        .describe(
          "Whether to ask the user for approval before the goal is set. Defaults to true \u2014 an approval dialog is shown. Set false ONLY when the user's own words in this conversation stated this outcome as what they want; the goal is then set directly, with a visible notice in the transcript, and the user can clear it with /goal clear.",
        ),
    }),
  );
  proposeGoalOutputSchema = DoctorLazy(() =>
    objectSchema({
      condition: stringSchema().describe(
        "The condition shown to the user for approval, or set directly when ask_user was false",
      ),
      askUser: booleanSchema().describe(
        "Whether the user was asked for approval (true) or the goal was set directly (false)",
      ),
    }),
  );
});
//@ chunk-cnjyw3ht.js:5803-5889 placement
/**
 * 记录一次“目标提议可用”事件（每进程只记一次）。
 */
function logGoalProposalAvailable(modelProposedGoalsSettingParsed) {
  if (getProposeGoalAvailabilityLogged()) return;
  setProposeGoalAvailabilityLogged();
  logEvent("tengu_goal_proposal_available", {
    setting: fromEnum(modelProposedGoalsSettingParsed),
  });
}
//@ chunk-cnjyw3ht.js:5889-10111 placement
/**
 * ProposeGoal 工具：向用户提议会话目标完成条件，由独立评审判断是否达成。
 */
var ProposeGoalTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-cnjyw3ht.js:5889", () => {
  ProposeGoalTool = buildTool({
    name: PROPOSEGOAL,
    backgrounding: "never",
    maxResultSizeChars: 1000,
    searchHint: "propose a session goal condition for the user to approve with one keypress",
    get inputSchema() {
      return proposeGoalInputSchema();
    },
    get outputSchema() {
      return proposeGoalOutputSchema();
    },
    shouldDefer: true,
    isEnabled() {
      if (getIsNonInteractiveSession() || getIsRemoteMode()) return false;
      if (isBgSession()) return false;
      if (!isProposeGoalEnabled()) return false;
      let modelProposedGoalsSettingParsed = getModelProposedGoalsSettingParsed();
      if (modelProposedGoalsSettingParsed === "disabled") return false;
      logGoalProposalAvailable(modelProposedGoalsSettingParsed);
      return true;
    },
    isConcurrencySafe() {
      return false;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      return `ask_user=${input.ask_user !== false}: ${input.condition ?? ""}`;
    },
    async description() {
      return PROPOSEGOAL_DESCRIPTION;
    },
    async prompt() {
      return PROPOSEGOAL_PROMPT;
    },
    renderToolUseMessage(input) {
      if (!input.condition) return "";
      return `Propose goal: ${truncateWithNotice(collapseLineBreaks(input.condition), 200)}`;
    },
    create(toolContext) {
      return {
        async call({ condition, ask_user: askUser }) {
          if (toolContext.agentId) throw Error("ProposeGoal cannot be used in agent contexts");
          if (getIsNonInteractiveSession() || getIsRemoteMode() || isBgSession()) {
            logFeatureSad("goal_propose", "session_shape");
            throw Error("Goal proposals are only available in interactive local sessions.");
          }
          let trimmed = isNetworkPath(collapseLineBreaks(condition)).trim();
          if (trimmed === "")
            throw Error(
              "The goal condition is empty once whitespace and invisible characters are removed. Provide a visible condition.",
            );
          if (trimmed.length > MAX_GOAL_CONDITION_CHARS)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `The goal condition exceeds ${MAX_GOAL_CONDITION_CHARS} characters once canonicalized for display (tabs expand to spaces). Shorten the condition \u2014 the user must be able to read all of it in the approval dialog.`,
              "goal condition exceeds the canonicalized-length cap",
            );
          if (isGoalClearKeyword(trimmed))
            throw Error(
              "ProposeGoal only proposes a new goal; it cannot clear one. The user can clear an active goal with /goal clear.",
            );
          let goalBlockedReason = getGoalBlockedReason();
          if (goalBlockedReason !== null) {
            logFeatureSad("goal_propose", goalBlockedReason.code);
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              goalBlockedReason.message,
              "goal evaluator blocked",
            );
          }
          if (toolContext.permissions().mode === "plan") {
            logFeatureSad("goal_propose", "plan_mode");
            throw Error(
              "Plan mode is active, so a goal cannot be proposed yet. Keep planning; propose the goal after the plan is approved.",
            );
          }
          let modelProposedGoalsSetting = await getModelProposedGoalsSetting(toolContext.storageV5);
          if (modelProposedGoalsSetting === "disabled") {
            logFeatureSad("goal_propose", "setting_disabled");
            throw Error(
              "The user has disabled model-proposed goals in their settings. Do not propose goals; the user can set one themselves with /goal.",
            );
          }
          let needsAsk = modelProposedGoalsSetting === "alwaysAsk" || askUser !== false;
          let { messageQueue, requestDialog } = toolContext;
          if (requestDialog === undefined)
            throw Error(
              "Goal proposals need an interactive session to render the approval prompt; none is available here.",
            );
          if (toolContext.toolState.get(IdHolder).id)
            throw Error(
              "A goal proposal is already awaiting the user's decision. Keep working; if it is approved you will receive a kickoff message.",
            );
          logEvent("tengu_goal_proposed", {
            promptLength: trimmed.length,
            askUser: needsAsk,
            forcedAsk: needsAsk && askUser === false,
          });
          logFeatureOk("goal_propose");
          if (!needsAsk) {
            toolContext.recordQueuedGoalOrigin(trimmed, "proposal_direct");
            messageQueue.enqueue({
              agentId: mainAgentId(),
              mode: "prompt",
              value: `/goal ${trimmed}`,
              origin: {
                kind: "task-notification",
              },
            });
            return {
              data: {
                condition: trimmed,
                askUser: false,
              },
            };
          }
          let proposalHolder = toolContext.toolState.get(IdHolder);
          let proposalId = randomUUID();
          proposalHolder.id = proposalId;
          requestDialog(
            GOAL_PROPOSAL_DIALOG,
            {
              condition: trimmed,
            },
            {
              place: "under",
            },
          )
            .then((decision) => {
              let isStale = proposalHolder.id !== proposalId;
              let nowDisabled = getModelProposedGoalsSettingParsed() === "disabled";
              let inPlanMode = toolContext.permissions().mode === "plan";
              logEvent("tengu_goal_proposal_decided", {
                decision: decision.approved
                  ? isStale
                    ? lit("approved_stale")
                    : nowDisabled
                      ? lit("approved_disabled")
                      : inPlanMode
                        ? lit("approved_plan_mode")
                        : lit("approved")
                  : decision.explicit === true
                    ? lit("declined")
                    : lit("unanswered"),
              });
              if (!decision.approved || isStale || nowDisabled || inPlanMode) {
                if (decision.approved && !isStale) {
                  if (nowDisabled) logFeatureSad("goal_propose", "approved_dropped_disabled");
                  else if (inPlanMode) logFeatureSad("goal_propose", "approved_dropped_plan_mode");
                }
                return;
              }
              toolContext.recordQueuedGoalOrigin(trimmed, "proposal_approved");
              messageQueue.enqueue({
                agentId: mainAgentId(),
                mode: "prompt",
                value: `/goal ${trimmed}`,
                origin: {
                  kind: "auto-continuation",
                },
              });
            })
            .catch((error) => {
              logError(error);
            })
            .finally(() => {
              if (proposalHolder.id === proposalId) proposalHolder.clear();
            });
          return {
            data: {
              condition: trimmed,
              askUser: true,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content:
          result.askUser === false
            ? "Setting the goal now, without an approval dialog \u2014 the user sees it being set and can clear it with /goal clear. It becomes active at the end of this turn, when you will receive a kickoff message confirming it; until that message arrives, any previously set goal remains in effect. Continue working \u2014 do not wait for the kickoff."
            : "Sent the goal proposal to the user for approval. Continue working \u2014 do not wait for their decision. If they approve, the proposed goal is set and you will receive a kickoff message; until then, no new goal is active \u2014 any previously set goal remains in effect. If they decline you will not be notified \u2014 do not ask about the decision or re-propose the same condition.",
      };
    },
  });
});
export { PROPOSEGOAL, ProposeGoalTool };
