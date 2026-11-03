/**
 * utils/proactivity.ts
 *
 * 2.1.316 新增：主动性设置提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, M } from "../../vendor/zod/v4/classic/schemas.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../tools/EnterPlanModeTool/constants.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { CRON_CREATE_TOOL_NAME } from "../tools/ScheduleCronTool/prompt.js";
import { LOOP, SCHEDULE } from "../skills/bundled/bundledSkillNames.js";
import { sSe } from "./proactivityMode.js";
import { isProactivityActive, toolMatchesName } from "../Tool.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getRootSession } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:86189-86281 placement
var U_t = DoctorLazy(() =>
  u({ askUserQuestion: M(), enterPlanMode: M(), scheduleWakeup: M(), cronCreate: M() }),
);
//@ chunk-e6aww6q8.js:86281-86330 placement
function q1(e) {
  return U_t().safeParse(e).success;
}
//@ chunk-e6aww6q8.js:86330-86401 placement
function j_t(e, n) {
  return U_t()
    .keyof()
    .options.every((option) => e[option] === n[option]);
}
/**
 * 撤销之前公告的主动性设置的提示（恢复按基础指令处理提问、提交、推送与 PR）。
 */
//@ chunk-e6aww6q8.js:86401-86609 placement
function proactivityWithdrawnNotice() {
  return "The proactivity setting announced earlier in this conversation no longer applies. Follow your base instructions about asking the user questions, committing, pushing, and pull requests.";
}
//@ chunk-e6aww6q8.js:86609-86649 placement
function W_t() {
  return "## Proactivity: ";
}
//@ chunk-e6aww6q8.js:86649-86756 placement
function proactivityLevelLabel(e) {
  switch (e) {
    case "ask":
      return "low";
    case "default":
      return "medium";
    case "proactive":
      return "high";
  }
}
//@ chunk-e6aww6q8.js:86756-86820 placement
function G_t(e) {
  return e.startsWith(W_t()) || e.startsWith(proactivityWithdrawnNotice());
}
/**
 * 生成主动性设置段：按用户设定决定先给计划还是直接执行。
 */
//@ chunk-e6aww6q8.js:86820-91286 placement
function buildProactivitySection(e, n) {
  let r = `${W_t()}${proactivityLevelLabel(e)}

The user has set how much initiative they want you to take in this session. This supersedes any earlier proactivity setting. It does not override plan mode, the current permission mode, or the rules about destructive and hard-to-reverse actions.`;
  switch (e) {
    case "ask":
      return `${r}

- Confirm before changing anything, including file edits: ${n.enterPlanMode ? `enter plan mode with ${ENTER_PLAN_MODE_TOOL_NAME} and get the plan agreed` : "lay out your plan and get it agreed"} before implementing, and${n.askUserQuestion ? ` use ${ASKUSERQUESTION}` : " ask"} whenever intent, scope, or approach has more than one reasonable reading. File edits prompt the user for approval in this mode; don't route around that (no shell redirection or scripts to write files).
- Skip both for a request that is small and unambiguous, or that turns out to need no changes \u2014 just do it, or say so.
- Never run \`git commit\`, push to a remote, or create or update a pull request unless the user explicitly confirms it in this conversation. Finishing a task is not confirmation.
- When a task is done, report back and stop; suggest next steps rather than starting them.`;
    case "default":
      return `${r}

- ${n.askUserQuestion ? `Use ${ASKUSERQUESTION}` : "Ask the user"} only when you genuinely cannot proceed without an answer \u2014 a decision that is the user's to make and that you cannot resolve from the request, the code, or sensible defaults. Otherwise make the reasonable call, state it, and continue.
- Make the edits and run the checks the task needs without stopping to ask. Do not create git commits, push to a remote, or create or update pull requests unless the user explicitly asks or confirms.`;
    case "proactive": {
      let s = [];
      if (n.scheduleWakeup) s.push(`a check-in with ${SCHEDULE_WAKEUP_TOOL_NAME}`);
      if (n.cronCreate) s.push(`a recurring ${CRON_CREATE_TOOL_NAME} job (the /${LOOP} skill)`);
      let h = `a routine via the /${SCHEDULE} skill when it is available and the follow-up should outlive this session`,
        y = ` Instead of stopping to wait on something slow (CI, a deploy, a long-running job, a reviewer), schedule ${s.length > 0 ? `${s.join(" or ")} \u2014 or ${h} \u2014` : `${h},`} and pick the work back up when it fires.`;
      return `${r}

- Do not stop to ask questions${n.askUserQuestion ? ` (including via ${ASKUSERQUESTION})` : ""} about anything that can be undone. When something is unclear, choose the most reasonable reading, state your assumption in one line, and keep going; the user will redirect you if needed. Editing code, choosing an approach, pushing, and landing a PR once it is approved can all be reverted, so proceed. Ask first only before a one-way door: a step that cannot be reversed, such as deleting customer data. Keep that bar high.
- Commit, push, and create or update pull requests without asking whenever that is the natural next step of the task. This overrides the general instructions to only commit, push, or open a pull request when the user explicitly asks. Still review what you are staging, keep secrets out of commits, and never force-push or rewrite shared history unprompted.
- When a task finishes, put yourself in the user's shoes: what would they ask for next once they saw this result? Do it before being asked \u2014 run the tests and fix what fails, fix lint and type errors, update affected docs, tie off loose ends you created, and pick up the follow-up work the task exposed (an adjacent bug, a missing test, the same fix needed elsewhere). Leave anything that would change what the user asked for to them.${y}
- Work whose outcome arrives later stays yours until the outcome is in. When you add an A/B test or product experiment, landing the code is the start: schedule a check-in for a day after it starts taking traffic, using whichever of those will still fire then and a prompt a fresh session could act on (if none will, tell the user what to check and when). At each check-in, verify that exposures and metric events are logging correctly and the split matches the configured allocation, fix what is broken, ramp, restart, or extend the test as the data calls for, and schedule the next check-in. Where a step is blocked or needs access you lack, hand the user the exact change to make. Once the test has run its planned length and the result is statistically significant or clearly will not be, show the user the numbers and the arm you propose to ship; shipping it is their call.
- Keep the user informed with brief statements of what you did and what you are doing next, rather than requests for permission.`;
    }
  }
}
//@ chunk-e6aww6q8.js:949642-949904 placement
function latestProactivityAttachment(e) {
  for (let n = e.length - 1; n >= 0; n--) {
    let r = e[n];
    if (r?.type !== "attachment" || r.attachment.type !== "proactivity") continue;
    let attachment = r.attachment;
    if (attachment.status === "withdrawn") return null;
    if (sSe(attachment.level) && q1(attachment.tools))
      return { level: attachment.level, tools: attachment.tools };
  }
  return null;
}
/**
 * 生成主动性设置附件：功能关闭且之前通告过时发 withdrawn；否则当等级或可用工具（AskUserQuestion/EnterPlanMode/ScheduleWakeup/CronCreate）变化时发新的 active 附件。
 */
//@ chunk-e6aww6q8.js:949904-950328 placement
async function proactivityAttachments(e, n) {
  {
    let r = latestProactivityAttachment(e);
    if (!isProactivityActive()) return r === null ? [] : [{ type: "proactivity", status: "withdrawn" }];
    let tools = n.options.tools,
      h = {
        askUserQuestion: tools.some((S) => toolMatchesName(S, ASKUSERQUESTION)),
        enterPlanMode: tools.some((S) => toolMatchesName(S, ENTER_PLAN_MODE_TOOL_NAME)),
        scheduleWakeup: tools.some((S) => toolMatchesName(S, SCHEDULE_WAKEUP_TOOL_NAME)),
        cronCreate: tools.some((S) => toolMatchesName(S, CRON_CREATE_TOOL_NAME)),
      },
      proactivityLevel = n.getProactivityLevel();
    if (r !== null && r.level === proactivityLevel && j_t(r.tools, h)) return [];
    return [{ type: "proactivity", status: "active", level: proactivityLevel, tools: h }];
  }
  return [];
}
//@ chunk-e6aww6q8.js:950328-950389 placement
var DUt = new SessionRootSlot(() => ({ read: !1, brought: {}, skillOverrides: {} }));
//@ chunk-e6aww6q8.js:950389-950436 placement
function oGe() {
  return DUt.peek(getRootSession())?.read === !1;
}
//@ chunk-e6aww6q8.js:950436-950488 placement
function rGe() {
  return DUt.peek(getRootSession())?.skillOverrides;
}

export { G_t, proactivityWithdrawnNotice, q1, buildProactivitySection, proactivityAttachments, rGe, oGe };
