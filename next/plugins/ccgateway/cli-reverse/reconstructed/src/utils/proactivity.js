/**
 * utils/proactivity.ts
 *
 * 2.1.316 新增：主动性设置提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, booleanSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../tools/EnterPlanModeTool/constants.js";
import { ASKUSERQUESTION } from "../tools/AskUserQuestionTool/prompt.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../tools/ScheduleWakeupTool/prompt.js";
import { CRON_CREATE_TOOL_NAME } from "../tools/ScheduleCronTool/prompt.js";
import { LOOP, SCHEDULE } from "../skills/bundled/bundledSkillNames.js";
import { isProactivityMode } from "./proactivityMode.js";
import { isProactivityActive, matchesToolName } from "../Tool.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:88994-89086 placement
var proactivitySettingsSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:88994", () => {
  proactivitySettingsSchema = DoctorLazy(() =>
    objectSchema({
      askUserQuestion: booleanSchema(),
      enterPlanMode: booleanSchema(),
      scheduleWakeup: booleanSchema(),
      cronCreate: booleanSchema(),
    }),
  );
});
//@ chunk-5xgkngpb.js:89086-89135 placement
/**
 * isProactivitySettingsValid：主动性设置可解析。
 */
function isProactivitySettingsValid(tools) {
  return proactivitySettingsSchema().safeParse(tools).success;
}
//@ chunk-5xgkngpb.js:89135-89206 placement
function isSameProactivitySettings(tools, otherTools) {
  return proactivitySettingsSchema()
    .keyof()
    .options.every((option) => tools[option] === otherTools[option]);
}
//@ chunk-5xgkngpb.js:89206-89414 placement
/**
 * 撤销之前公告的主动性设置的提示（恢复按基础指令处理提问、提交、推送与 PR）。
 */
function proactivityWithdrawnNotice() {
  return "The proactivity setting announced earlier in this conversation no longer applies. Follow your base instructions about asking the user questions, committing, pushing, and pull requests.";
}
//@ chunk-5xgkngpb.js:89414-89454 placement
function PROACTIVITY_SECTION_HEADER() {
  return "## Proactivity: ";
}
//@ chunk-5xgkngpb.js:89454-89561 placement
function proactivityLevelLabel(level) {
  switch (level) {
    case "ask":
      return "low";
    case "default":
      return "medium";
    case "proactive":
      return "high";
  }
}
//@ chunk-5xgkngpb.js:89561-89625 placement
/**
 * isProactivityBlockText：文本属于主动性段落。
 */
function isProactivityBlockText(text) {
  return text.startsWith(PROACTIVITY_SECTION_HEADER()) || text.startsWith(proactivityWithdrawnNotice());
}
//@ chunk-5xgkngpb.js:89625-94091 placement
/**
 * 生成主动性设置段：按用户设定决定先给计划还是直接执行。
 */
function buildProactivitySection(level, tools) {
  let header = `${PROACTIVITY_SECTION_HEADER()}${proactivityLevelLabel(level)}

The user has set how much initiative they want you to take in this session. This supersedes any earlier proactivity setting. It does not override plan mode, the current permission mode, or the rules about destructive and hard-to-reverse actions.`;
  switch (level) {
    case "ask":
      return `${header}

- Confirm before changing anything, including file edits: ${tools.enterPlanMode ? `enter plan mode with ${ENTER_PLAN_MODE_TOOL_NAME} and get the plan agreed` : "lay out your plan and get it agreed"} before implementing, and${tools.askUserQuestion ? ` use ${ASKUSERQUESTION}` : " ask"} whenever intent, scope, or approach has more than one reasonable reading. File edits prompt the user for approval in this mode; don't route around that (no shell redirection or scripts to write files).
- Skip both for a request that is small and unambiguous, or that turns out to need no changes \u2014 just do it, or say so.
- Never run \`git commit\`, push to a remote, or create or update a pull request unless the user explicitly confirms it in this conversation. Finishing a task is not confirmation.
- When a task is done, report back and stop; suggest next steps rather than starting them.`;
    case "default":
      return `${header}

- ${tools.askUserQuestion ? `Use ${ASKUSERQUESTION}` : "Ask the user"} only when you genuinely cannot proceed without an answer \u2014 a decision that is the user's to make and that you cannot resolve from the request, the code, or sensible defaults. Otherwise make the reasonable call, state it, and continue.
- Make the edits and run the checks the task needs without stopping to ask. Do not create git commits, push to a remote, or create or update pull requests unless the user explicitly asks or confirms.`;
    case "proactive": {
      let options = [];
      if (tools.scheduleWakeup) options.push(`a check-in with ${SCHEDULE_WAKEUP_TOOL_NAME}`);
      if (tools.cronCreate) options.push(`a recurring ${CRON_CREATE_TOOL_NAME} job (the /${LOOP} skill)`);
      let routineOption = `a routine via the /${SCHEDULE} skill when it is available and the follow-up should outlive this session`;
      let scheduleNote = ` Instead of stopping to wait on something slow (CI, a deploy, a long-running job, a reviewer), schedule ${options.length > 0 ? `${options.join(" or ")} \u2014 or ${routineOption} \u2014` : `${routineOption},`} and pick the work back up when it fires.`;
      return `${header}

- Do not stop to ask questions${tools.askUserQuestion ? ` (including via ${ASKUSERQUESTION})` : ""} about anything that can be undone. When something is unclear, choose the most reasonable reading, state your assumption in one line, and keep going; the user will redirect you if needed. Editing code, choosing an approach, pushing, and landing a PR once it is approved can all be reverted, so proceed. Ask first only before a one-way door: a step that cannot be reversed, such as deleting customer data. Keep that bar high.
- Commit, push, and create or update pull requests without asking whenever that is the natural next step of the task. This overrides the general instructions to only commit, push, or open a pull request when the user explicitly asks. Still review what you are staging, keep secrets out of commits, and never force-push or rewrite shared history unprompted.
- When a task finishes, put yourself in the user's shoes: what would they ask for next once they saw this result? Do it before being asked \u2014 run the tests and fix what fails, fix lint and type errors, update affected docs, tie off loose ends you created, and pick up the follow-up work the task exposed (an adjacent bug, a missing test, the same fix needed elsewhere). Leave anything that would change what the user asked for to them.${scheduleNote}
- Work whose outcome arrives later stays yours until the outcome is in. When you add an A/B test or product experiment, landing the code is the start: schedule a check-in for a day after it starts taking traffic, using whichever of those will still fire then and a prompt a fresh session could act on (if none will, tell the user what to check and when). At each check-in, verify that exposures and metric events are logging correctly and the split matches the configured allocation, fix what is broken, ramp, restart, or extend the test as the data calls for, and schedule the next check-in. Where a step is blocked or needs access you lack, hand the user the exact change to make. Once the test has run its planned length and the result is statistically significant or clearly will not be, show the user the numbers and the arm you propose to ship; shipping it is their call.
- Keep the user informed with brief statements of what you did and what you are doing next, rather than requests for permission.`;
    }
  }
}
//@ chunk-5xgkngpb.js:961424-961686 placement
function latestProactivityAttachment(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message?.type !== "attachment" || message.attachment.type !== "proactivity") continue;
    let attachment = message.attachment;
    if (attachment.status === "withdrawn") return null;
    if (isProactivityMode(attachment.level) && isProactivitySettingsValid(attachment.tools))
      return {
        level: attachment.level,
        tools: attachment.tools,
      };
  }
  return null;
}
//@ chunk-5xgkngpb.js:961686-962110 placement
/**
 * 生成主动性设置附件：功能关闭且之前通告过时发 withdrawn；否则当等级或可用工具（AskUserQuestion/EnterPlanMode/ScheduleWakeup/CronCreate）变化时发新的 active 附件。
 */
async function proactivityAttachments(messages, options) {
  {
    let current = latestProactivityAttachment(messages);
    if (!isProactivityActive())
      return current === null
        ? []
        : [
            {
              type: "proactivity",
              status: "withdrawn",
            },
          ];
    let tools = options.options.tools;
    let toolAvailability = {
      askUserQuestion: tools.some((tool) => matchesToolName(tool, ASKUSERQUESTION)),
      enterPlanMode: tools.some((tool) => matchesToolName(tool, ENTER_PLAN_MODE_TOOL_NAME)),
      scheduleWakeup: tools.some((tool) => matchesToolName(tool, SCHEDULE_WAKEUP_TOOL_NAME)),
      cronCreate: tools.some((tool) => matchesToolName(tool, CRON_CREATE_TOOL_NAME)),
    };
    let proactivityLevel = options.getProactivityLevel();
    if (
      current !== null &&
      current.level === proactivityLevel &&
      isSameProactivitySettings(current.tools, toolAvailability)
    )
      return [];
    return [
      {
        type: "proactivity",
        status: "active",
        level: proactivityLevel,
        tools: toolAvailability,
      },
    ];
  }
  return [];
}
//@ chunk-5xgkngpb.js:962110-962171 placement
var skillOverridesState; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:962110", () => {
  skillOverridesState = new SessionRootSlot(() => ({
    read: false,
    brought: {},
    skillOverrides: {},
  }));
});
//@ chunk-5xgkngpb.js:962171-962218 placement
/**
 * isSkillOverridesUnread：技能覆盖尚未读取。
 */
function isSkillOverridesUnread() {
  return skillOverridesState.peek(getRootSession())?.read === false;
}
//@ chunk-5xgkngpb.js:962218-962270 placement
/**
 * skillOverrides：技能覆盖表。
 */
function skillOverrides() {
  return skillOverridesState.peek(getRootSession())?.skillOverrides;
}
export {
  isProactivityBlockText,
  proactivityWithdrawnNotice,
  isProactivitySettingsValid,
  buildProactivitySection,
  proactivityAttachments,
  skillOverrides,
  isSkillOverridesUnread,
};
