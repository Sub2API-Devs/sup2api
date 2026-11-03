/**
 * tools/ProposeGoalTool/ProposeGoalTool.ts
 *
 * 2.1.316 新增：ProposeGoal 工具（提议会话目标完成条件）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1rwh0063.js (3), chunk-nwnm868w.js (1)
 * attribution: placement 4
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, M, u } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { truncateWithNotice, gQe } from "../../utils/truncationNotice.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { isGoalClearKeyword, getGoalBlockedReason } from "../../commands/goal/goal.js";
import { wUt } from "../../utils/idHolder.js";
import { GOAL_PROPOSAL_DIALOG } from "../../components/goal/goalProposalDialog.js";
import { logError } from "../../utils/log.js";

//@ chunk-1rwh0063.js:4788-5719 placement
var proposeGoalInputSchema = DoctorLazy(() =>
    zodStrictObject({
      condition: o()
        .min(1)
        .max(Wnr)
        .describe(
          `The completion condition to propose, written so a separate evaluator can verify it from the conversation (e.g. "all tests in test/auth pass (bun test exits 0)"). At most ${Wnr} characters \u2014 the user must be able to read the whole condition in the approval dialog.`,
        ),
      ask_user: M()
        .optional()
        .describe(
          "Whether to ask the user for approval before the goal is set. Defaults to true \u2014 an approval dialog is shown. Set false ONLY when the user's own words in this conversation stated this outcome as what they want; the goal is then set directly, with a visible notice in the transcript, and the user can clear it with /goal clear.",
        ),
    }),
  ),
  T = DoctorLazy(() =>
    u({
      condition: o().describe(
        "The condition shown to the user for approval, or set directly when ask_user was false",
      ),
      askUser: M().describe(
        "Whether the user was asked for approval (true) or the goal was set directly (false)",
      ),
    }),
  );
//@ chunk-1rwh0063.js:5719-5805 placement
function P(e) {
  if (getProposeGoalAvailabilityLogged()) return;
  (setProposeGoalAvailabilityLogged(), logEvent("tengu_goal_proposal_available", { setting: fromEnum(e) }));
}
/**
 * ProposeGoal 工具：向用户提议会话目标完成条件，由独立评审判断是否达成。
 */
//@ chunk-1rwh0063.js:5805-10027 placement
var ProposeGoalTool = buildTool({
  name: PROPOSEGOAL,
  backgrounding: "never",
  maxResultSizeChars: 1000,
  searchHint: "propose a session goal condition for the user to approve with one keypress",
  get inputSchema() {
    return proposeGoalInputSchema();
  },
  get outputSchema() {
    return T();
  },
  shouldDefer: !0,
  isEnabled() {
    if (getIsNonInteractiveSession() || getIsRemoteMode()) return !1;
    if (isBgSession()) return !1;
    if (!isProposeGoalEnabled()) return !1;
    let e = getModelProposedGoalsSettingParsed();
    if (e === "disabled") return !1;
    return (P(e), !0);
  },
  isConcurrencySafe() {
    return !1;
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(e) {
    return `ask_user=${e.ask_user !== !1}: ${e.condition ?? ""}`;
  },
  async description() {
    return Tsi;
  },
  async prompt() {
    return Asi;
  },
  renderToolUseMessage(e) {
    if (!e.condition) return "";
    return `Propose goal: ${truncateWithNotice(gQe(e.condition), 200)}`;
  },
  create(e) {
    return {
      async call({ condition: n, ask_user: y }) {
        if (e.agentId) throw Error("ProposeGoal cannot be used in agent contexts");
        if (getIsNonInteractiveSession() || getIsRemoteMode() || isBgSession())
          throw (
            logFeatureSad("goal_propose", "session_shape"),
            Error("Goal proposals are only available in interactive local sessions.")
          );
        let trimmed = isNetworkPath(gQe(n)).trim();
        if (trimmed === "")
          throw Error(
            "The goal condition is empty once whitespace and invisible characters are removed. Provide a visible condition.",
          );
        if (trimmed.length > Wnr)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `The goal condition exceeds ${Wnr} characters once canonicalized for display (tabs expand to spaces). Shorten the condition \u2014 the user must be able to read all of it in the approval dialog.`,
            "goal condition exceeds the canonicalized-length cap",
          );
        if (isGoalClearKeyword(trimmed))
          throw Error(
            "ProposeGoal only proposes a new goal; it cannot clear one. The user can clear an active goal with /goal clear.",
          );
        let s = getGoalBlockedReason();
        if (s !== null)
          throw (
            logFeatureSad("goal_propose", s.code),
            new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              s.message,
              "goal evaluator blocked",
            )
          );
        if (e.permissions().mode === "plan")
          throw (
            logFeatureSad("goal_propose", "plan_mode"),
            Error(
              "Plan mode is active, so a goal cannot be proposed yet. Keep planning; propose the goal after the plan is approved.",
            )
          );
        let _ = await getModelProposedGoalsSetting(e.storageV5);
        if (_ === "disabled")
          throw (
            logFeatureSad("goal_propose", "setting_disabled"),
            Error(
              "The user has disabled model-proposed goals in their settings. Do not propose goals; the user can set one themselves with /goal.",
            )
          );
        let d = _ === "alwaysAsk" || y !== !1,
          { messageQueue: messageQueue, requestDialog: requestDialog } = e;
        if (requestDialog === void 0)
          throw Error(
            "Goal proposals need an interactive session to render the approval prompt; none is available here.",
          );
        if (e.toolState.get(wUt).id)
          throw Error(
            "A goal proposal is already awaiting the user's decision. Keep working; if it is approved you will receive a kickoff message.",
          );
        if (
          (logEvent("tengu_goal_proposed", {
            promptLength: trimmed.length,
            askUser: d,
            forcedAsk: d && y === !1,
          }),
          logFeatureOk("goal_propose"),
          !d)
        )
          return (
            e.recordQueuedGoalOrigin(trimmed, "proposal_direct"),
            messageQueue.enqueue({
              agentId: mainAgentId(),
              mode: "prompt",
              value: `/goal ${trimmed}`,
              origin: { kind: "task-notification" },
            }),
            { data: { condition: trimmed, askUser: !1 } }
          );
        let i = e.toolState.get(wUt),
          m = randomUUID();
        return (
          (i.id = m),
          requestDialog(GOAL_PROPOSAL_DIALOG, { condition: trimmed }, { place: "under" })
            .then((r) => {
              let h = i.id !== m,
                v = getModelProposedGoalsSettingParsed() === "disabled",
                w = e.permissions().mode === "plan";
              if (
                (logEvent("tengu_goal_proposal_decided", {
                  decision: r.approved
                    ? h
                      ? lit("approved_stale")
                      : v
                        ? lit("approved_disabled")
                        : w
                          ? lit("approved_plan_mode")
                          : lit("approved")
                    : r.explicit === !0
                      ? lit("declined")
                      : lit("unanswered"),
                }),
                !r.approved || h || v || w)
              ) {
                if (r.approved && !h) {
                  if (v) logFeatureSad("goal_propose", "approved_dropped_disabled");
                  else if (w) logFeatureSad("goal_propose", "approved_dropped_plan_mode");
                }
                return;
              }
              (e.recordQueuedGoalOrigin(trimmed, "proposal_approved"),
                messageQueue.enqueue({
                  agentId: mainAgentId(),
                  mode: "prompt",
                  value: `/goal ${trimmed}`,
                  origin: { kind: "auto-continuation" },
                }));
            })
            .catch((r) => {
              logError(r);
            })
            .finally(() => {
              if (i.id === m) i.clear();
            }),
          { data: { condition: trimmed, askUser: !0 } }
        );
      },
    };
  },
  mapToolResultToToolResultBlockParam(e, n) {
    return {
      tool_use_id: n,
      type: "tool_result",
      content:
        e.askUser === !1
          ? "Setting the goal now, without an approval dialog \u2014 the user sees it being set and can clear it with /goal clear. It becomes active at the end of this turn, when you will receive a kickoff message confirming it; until that message arrives, any previously set goal remains in effect. Continue working \u2014 do not wait for the kickoff."
          : "Sent the goal proposal to the user for approval. Continue working \u2014 do not wait for their decision. If they approve, the proposed goal is set and you will receive a kickoff message; until then, no new goal is active \u2014 any previously set goal remains in effect. If they decline you will not be notified \u2014 do not ask about the decision or re-propose the same condition.",
    };
  },
});
//@ chunk-nwnm868w.js:191-1781 placement
var PROPOSEGOAL = "ProposeGoal",
  Wnr = 500,
  Tsi =
    "Propose a session goal condition, with one-keypress user approval; once set, Claude keeps working until a separate evaluator confirms it is met",
  Asi = `Propose a completion condition for this session's work \u2014 a goal that keeps you working until a separate evaluator confirms it is met. Non-blocking: the proposal renders alongside your work, so keep working while it is handled.

ask_user true (the default) asks the user first, with a one-keypress approval dialog. If they decline you will not be notified \u2014 do not ask about the decision and do not re-propose the same or a reworded condition. Set ask_user false \u2014 which sets the goal directly, with no dialog \u2014 ONLY when the user's own words in this conversation stated this outcome as what they want; if you inferred it from their intent or the task's shape \u2014 or are in doubt \u2014 ask. Either path confirms a set goal with a kickoff message; until that message arrives, no new goal is active.

Propose only when the user has asked for an outcome with a verifiable end state ("make the tests pass", "migrate every call site") and the work spans multiple turns. Not for one-off tasks, and never to widen scope: the condition must follow from their request.

The evaluator verifies the condition from the conversation alone \u2014 it cannot run commands or read files \u2014 so state one measurable end state with its check (e.g. "bun test exits 0"), in at most ${500} characters. One goal is active at a time; a newly approved or directly set proposal replaces the current one.`;

export { PROPOSEGOAL };
