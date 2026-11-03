/**
 * skills/bundled/loop.ts
 *
 * 并入旧版已有路径：/loop skill。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/skills/bundled/loop.ts
 * pieces: chunk-gbtb0mjv.js (14)
 * attribution: fingerprint 1, placement 13
 */
import { h$e } from "../../tools/PushNotificationTool/prompt.js";
import { PUSHNOTIFICATION } from "../../tools/PushNotificationTool/constants.js";
import {
  loopOutcomeInstruction,
  SCHEDULE_WAKEUP_TOOL_NAME,
  wakeupPreArmParagraph,
  g$e,
  Krt,
} from "../../tools/ScheduleWakeupTool/prompt.js";
import { isBriefEnabled } from "../../tools/BriefTool/BriefTool.js";
import { env } from "../../utils/env.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_ROUTINES } from "../../tools/RemoteTriggerTool/policy.js";
import { getAllowedChannels } from "../../bootstrap/state.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import {
  CRON_CREATE_TOOL_NAME,
  DEFAULT_MAX_AGE_DAYS,
  CRON_DELETE_TOOL_NAME,
  isKairosCronEnabled,
} from "../../tools/ScheduleCronTool/prompt.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import {
  isMonitorPersistentAllowed,
  monitorMaxTimeoutMs,
  formatMinutes,
} from "../../tools/MonitorTool/prompt.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { BRIEF_TOOL_NAME } from "../../tools/BriefTool/prompt.js";
import { buildPrStewardPrompt } from "../../services/prSteward/prStewardLabels.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { registerBundledSkill } from "../bundledSkills.js";
import { LOOP } from "./bundledSkillNames.js";
import { needsFableMitigations } from "../../utils/model/fableMitigations.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { logEvent } from "../../services/analytics/index.js";
import { resetLoopState } from "../../utils/loop/loopWakeups.js";

//@ chunk-gbtb0mjv.js:5877-5922 fingerprint = DEFAULT_INTERVAL (0.659)
var h = require("./chunk-w6rm7nhv.js"),
  A = "10m";
//@ chunk-gbtb0mjv.js:5922-6150 placement
function loopStopNotificationHint() {
  return h$e()
    ? ` Before you stop, send a one-line outcome via ${PUSHNOTIFICATION} \u2014 the user may be away and waiting to hear it's done. Skip this if you're stopping because the user just told you to; they're already here.`
    : "";
}
//@ chunk-gbtb0mjv.js:6150-6256 placement
function loopOutcomeHint() {
  return ` Then ${loopOutcomeInstruction({ briefMode: isBriefEnabled() })} \u2014 a stopped loop has no next tick to surface it.`;
}
//@ chunk-gbtb0mjv.js:6256-6387 placement
var INTERVAL_SUFFIX_RE = /^\d+[smhd]$/,
  EVERY_INTERVAL_RE =
    /^every\s+(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)\s*$/i;
//@ chunk-gbtb0mjv.js:6387-6552 placement
function normalizeEveryInterval(e) {
  let o = e[1],
    lower = e[2].toLowerCase();
  if (lower.startsWith("s")) return `${o}s`;
  if (lower.startsWith("h")) return `${o}h`;
  if (lower.startsWith("d")) return `${o}d`;
  return `${o}m`;
}
//@ chunk-gbtb0mjv.js:6552-7456 placement
var LOOP_SKILL_PROMPT =
  "| Interval pattern      | Cron expression     | Notes                                    |\n|-----------------------|---------------------|------------------------------------------|\n| `Nm` where N \u2264 59   | `*/N * * * *`     | every N minutes                          |\n| `Nm` where N \u2265 60   | `0 */H * * *`     | round to hours (H = N/60, must divide 24)|\n| `Nh` where N \u2264 23   | `0 */N * * *`     | every N hours                            |\n| `Nd`                | `0 0 */N * *`     | every N days at midnight local           |\n| `Ns`                | treat as `ceil(N/60)m` | cron minimum granularity is 1 minute  |\n\n**If the interval doesn't cleanly divide its unit** (e.g. `7m` \u2192 `*/7 * * * *` gives uneven gaps at :56\u2192:00; `90m` \u2192 1.5h which cron can't express), pick the nearest clean interval and tell the user what you rounded to before scheduling.";
//@ chunk-gbtb0mjv.js:7456-9308 placement
function loopCloudOffer() {
  if (
    !env.CLAUDE_CODE_REMOTE &&
    !isBgSession() &&
    isFirstPartyProvider() &&
    isClaudeAISubscriber() &&
    isPolicyAllowed("allow_remote_sessions") &&
    isPolicyAllowed(ALLOW_ROUTINES) &&
    getAllowedChannels().length === 0
  )
    return `
## Offer cloud first

Before any scheduling step, check whether EITHER is true:
- the parsed interval (rule 1 or 2) is **\u226560 minutes**, or
- regardless of which rule matched, the original input uses daily phrasing ("every morning", "daily", "every day", "each night", "every weekday")

If either is true, call ${ASKUSERQUESTION} first:
- \`question\`: "This loop stops when you close this session. Set it up as a cloud schedule instead so it keeps running?"
- \`header\`: "Schedule"
- \`options\`: \`[{label: "Cloud schedule (recommended)", description: "Runs in Anthropic's cloud even after you close this session"}, {label: "This session only", description: "Runs in this terminal until you exit"}]\`

If they pick **Cloud schedule**: do NOT call ${CRON_CREATE_TOOL_NAME}. Invoke the \`schedule\` skill directly via the ${SKILL} tool with \`args\` set to their original input verbatim (e.g. \`${SKILL}({skill: "schedule", args: "every morning tell me a joke"})\`), then follow that skill's instructions to completion. Do NOT tell the user to run /schedule themselves. **Then stop \u2014 do not continue to any section below** (no ${CRON_CREATE_TOOL_NAME}, no ${SCHEDULE_WAKEUP_TOOL_NAME}, no "execute the prompt now").
If they pick **This session only**:
- If the trigger was a parsed \u226560-minute interval (rule 1 or 2): continue below with that interval.
- If the trigger was daily phrasing only (rule 3, no parsed interval): do NOT call ${CRON_CREATE_TOOL_NAME}. Explain that a daily-cadence loop won't fire before this session closes, so there's nothing useful to schedule locally \u2014 suggest they either pick Cloud schedule, or re-run \`/loop\` with an explicit shorter interval (e.g. \`/loop 1h <prompt>\`) if they want a session loop. Then stop.
If neither trigger condition was met: continue below.
`;
  return "";
}
/**
 * 满足条件（第一方订阅、策略允许远程会话与例程等）时返回云端定时任务的提示行。
 */
//@ chunk-gbtb0mjv.js:9308-9923 placement
function cloudScheduleOfferLine() {
  if (
    !env.CLAUDE_CODE_REMOTE &&
    !isBgSession() &&
    isFirstPartyProvider() &&
    isClaudeAISubscriber() &&
    isPolicyAllowed("allow_remote_sessions") &&
    isPolicyAllowed(ALLOW_ROUTINES)
  ) {
    if (getAllowedChannels().length > 0)
      return ` End the confirmation with this exact line on its own, italicized: ${"`_Runs until you close this session \xB7 For durable cloud-based loops, use /schedule_`"}`;
    return ` Only if you did NOT show the cloud-offer ${ASKUSERQUESTION} above (i.e., neither trigger condition applied), end the confirmation with this exact line on its own, italicized: ${"`_Runs until you close this session \xB7 For durable cloud-based loops, use /schedule_`"}. If the user already answered that question, omit this line.`;
  }
  return "";
}
//@ chunk-gbtb0mjv.js:9923-10031 placement
function monitorArmInstruction() {
  return isMonitorPersistentAllowed()
    ? `arm one now with \`timeout_ms: ${monitorMaxTimeoutMs()}\``
    : "arm one now with `persistent: true`";
}
/**
 * 生成监视器过期后如何重新布置的说明。
 */
//@ chunk-gbtb0mjv.js:10031-10420 placement
function monitorRearmInstruction(e) {
  if (isMonitorPersistentAllowed())
    return `A monitor expires after at most ${formatMinutes(monitorMaxTimeoutMs())} and tells you; on later ${e} call ${TASK_LIST_TOOL_NAME} first and re-arm only if no monitor for it is still running.`;
  return e === "iterations"
    ? `Arm once; on later iterations call ${TASK_LIST_TOOL_NAME} first and skip this step if a monitor is already running.`
    : `Arm once; on later ticks call ${TASK_LIST_TOOL_NAME} first and skip if a monitor is already running.`;
}
/**
 * 生成 loop 技能第 3、4 步的说明：布置前状态、确认与决策段落。
 */
//@ chunk-gbtb0mjv.js:10420-10984 placement
function buildLoopSteps34({ preArmStatus: preArmStatus, confirmBody: confirmBody, decideBody: decideBody }) {
  let s = wakeupPreArmParagraph({ preArmStatus: preArmStatus, briefMode: isBriefEnabled() }),
    r = isBriefEnabled()
      ? `send the same brief update via ${BRIEF_TOOL_NAME}`
      : "write the same brief update as visible text";
  if (preArmStatus)
    return {
      steps34: `3. **Briefly confirm**: ${confirmBody} you're about to pick. ${s}
4. **Then, as the last action of this turn, decide whether the loop continues.** ${decideBody}`,
      rearmUpdate: (n) => `${r}, then ${n}`,
    };
  return {
    steps34: `3. **Decide whether the loop continues.** ${decideBody}
4. **After the wakeup is armed, briefly confirm**: ${confirmBody} you picked. ${s}`,
    rearmUpdate: (n) => `${n}, then ${r}`,
  };
}
/**
 * /loop skill 中自定节奏（动态间隔）的循环提示词。
 */
//@ chunk-gbtb0mjv.js:10984-16070 placement
function dynamicLoopPrompt(e, o) {
  let t = buildPrStewardPrompt({ forCloudSession: Boolean(env.CLAUDE_CODE_REMOTE) }),
    s = t
      ? `
${t}

For this /loop, before any scheduling step and before running the prompt: if the prompt would push to or babysit a PR, check the labels of each PR it covers. For a PR with either PR Steward label, schedule and run nothing until the user picks one of the choices above.
`
      : "",
    { steps34: steps34, rearmUpdate: rearmUpdate } = buildLoopSteps34({
      preArmStatus: o,
      confirmBody: `that you're self-pacing, whether a ${MONITOR} is the primary wake signal, that you ran the task now, and what fallback delay`,
      decideBody: `If the task needs another iteration, call ${SCHEDULE_WAKEUP_TOOL_NAME} with:
   - \`delaySeconds\`: with a ${MONITOR} armed this is the **fallback heartbeat** \u2014 how long to wait if no event fires (lean 1200\u20131800s; idle ticks more frequent than the task needs are pure overhead). Without a ${MONITOR} this is the cadence \u2014 pick based on what you observed. Read the tool's own description for cache-aware delay guidance.
   - \`reason\`: one short sentence on why you picked that delay.
   - \`prompt\`: the full original /loop input verbatim, prefixed with \`/loop \` so the next firing re-enters this skill and continues the loop. For example, if the user typed \`/loop check the deploy\`, pass \`/loop check the deploy\` as the prompt.
   - \`noop\`: \`true\` if this tick changed nothing ("still waiting", "quiet hold"); \`false\` if it did something worth keeping. Consecutive \`noop: true\` ticks collapse in the terminal.
   If it doesn't need another iteration, stop instead (step 6) \u2014 re-arming is a per-turn choice, not a default.`,
    }),
    l = `The user wants you to self-pace. Decide what makes the next iteration worth running \u2014 a passage of time, or an observable event.

1. **Run the parsed prompt now.** If it's a slash command, invoke it via the Skill tool; otherwise act on it directly.
2. **If the next run is gated on an event** (CI finishing, a log line matching, a file changing, a PR comment) and no ${MONITOR} is already running for it: ${monitorArmInstruction()}. Its events arrive as \`<task-notification>\` messages and wake this loop immediately \u2014 you do not wait for the ${SCHEDULE_WAKEUP_TOOL_NAME} deadline. ${monitorRearmInstruction("iterations")}
${steps34}
5. **If you were woken by a \`<task-notification>\`** rather than this prompt: handle the event in the context of the loop task, then make the same decision. If the loop should continue, ${rearmUpdate(`call ${SCHEDULE_WAKEUP_TOOL_NAME} again with the same \`prompt\` and the same 1200\u20131800s \`delaySeconds\` from the schedule step above (the ${MONITOR} remains the wake signal; the new wakeup is only the fallback heartbeat)`)}. If the event means the work is finished, stop (step 6).
6. **To stop the loop** \u2014 the task is complete, further iterations can't make progress, or the user asked you to stop \u2014 call ${SCHEDULE_WAKEUP_TOOL_NAME} with \`stop: true\` (no other fields) and ${TASKSTOP} any ${MONITOR} you armed (use ${TASK_LIST_TOOL_NAME} to find the task ID if it is no longer in context).${loopOutcomeHint()} Stopping is the loop's normal ending \u2014 the user can restart it anytime with /loop.${loopStopNotificationHint()}`;
  return `# /loop \u2014 schedule a recurring or self-paced prompt

Parse the input below into \`[interval] <prompt\u2026>\` and schedule it.

## Parsing (in priority order)

1. **Leading token**: if the first whitespace-delimited token matches \`^\\d+[smhd]$\` (e.g. \`5m\`, \`2h\`), that's the interval; the rest is the prompt.
2. **Trailing "every" clause**: otherwise, if the input ends with \`every <N><unit>\` or \`every <N> <unit-word>\` (e.g. \`every 20m\`, \`every 5 minutes\`, \`every 2 hours\`), extract that as the interval and strip it from the prompt. Only match when what follows "every" is a time expression \u2014 \`check every PR\` has no interval.
3. **No interval**: otherwise, the entire input is the prompt and you'll self-pace dynamically (see "Dynamic mode" below).

If the resulting prompt is empty, show usage \`/loop [interval] <prompt>\` and stop.

Examples:
- \`5m /babysit-prs\` \u2192 interval \`5m\`, prompt \`/babysit-prs\` (rule 1)
- \`check the deploy every 20m\` \u2192 interval \`20m\`, prompt \`check the deploy\` (rule 2)
- \`run tests every 5 minutes\` \u2192 interval \`5m\`, prompt \`run tests\` (rule 2)
- \`check the deploy\` \u2192 no interval \u2192 dynamic mode, prompt \`check the deploy\` (rule 3)
- \`check every PR\` \u2192 no interval \u2192 dynamic mode, prompt \`check every PR\` (rule 3 \u2014 "every" not followed by time)
- \`5m\` \u2192 empty prompt \u2192 show usage
${s}${loopCloudOffer()}
## Fixed-interval mode (rules 1 and 2)

Convert the interval to a cron expression:

${LOOP_SKILL_PROMPT}

Then:
1. Call ${CRON_CREATE_TOOL_NAME} with: \`cron\` (the expression above), \`prompt\` (the parsed prompt verbatim), \`recurring: true\`.
2. Briefly confirm: what's scheduled, the cron expression, the human-readable cadence, that recurring tasks auto-expire after ${DEFAULT_MAX_AGE_DAYS} days, and that the user can cancel sooner with ${CRON_DELETE_TOOL_NAME} (include the job ID).${cloudScheduleOfferLine()}
3. **Then immediately execute the parsed prompt now** \u2014 don't wait for the first cron fire. If it's a slash command, invoke it via the Skill tool; otherwise act on it directly.

## Dynamic mode (rule 3 \u2014 no interval)

${l}

## Input

${e}`;
}
/**
 * /loop skill 中基于文件的循环提示词。
 */
//@ chunk-gbtb0mjv.js:16070-21459 placement
function loopFilePrompt(e, o, t, s) {
  let r = e
      ? `## Loop tasks (from ${e.path})`
      : "## Autonomous-loop instructions (for the immediate execution and every fire)",
    n;
  if (e) n = e.content;
  else (h.logAutonomousLoopActivation(), (n = h.getAutonomousLoopPreamble()));
  let l = e ? "the loop.md tasks" : "the autonomous check";
  if (o) {
    let p = e ? h.LOOP_FILE_DYNAMIC_SENTINEL : g$e,
      _ = e
        ? `# /loop \u2014 loop.md tasks with dynamic pacing

The user invoked \`/loop\` with no prompt and no interval and has a loop-tasks file at \`${e.path}\`. Run those tasks now, then self-pace the next iteration via ${SCHEDULE_WAKEUP_TOOL_NAME} \u2014 no cron.`
        : `# /loop \u2014 autonomous default with dynamic pacing

The user invoked \`/loop\` with no prompt and no interval. Run the autonomous check now, then self-pace the next iteration via ${SCHEDULE_WAKEUP_TOOL_NAME} \u2014 no cron.`,
      E = e
        ? `that you're running tasks from \`${e.path}\` in dynamic-pacing mode, that you ran the first tick now`
        : "that this is the autonomous default in dynamic-pacing mode, that you ran the check now",
      { steps34: steps34, rearmUpdate: rearmUpdate } = buildLoopSteps34({
        preArmStatus: s,
        confirmBody: `${E}, whether a ${MONITOR} is the primary wake signal, and what fallback delay`,
        decideBody: `If the next check is worth running, call ${SCHEDULE_WAKEUP_TOOL_NAME} with:
   - \`delaySeconds\`: with a ${MONITOR} armed this is the fallback heartbeat (lean 1200\u20131800s). Without one, pick based on what you observed this turn \u2014 quiet branch? wait longer. Lots in flight? wait shorter. Read the tool's own description for cache-aware delay guidance.
   - \`reason\`: one short sentence on why you picked that delay.
   - \`prompt\`: the literal string \`${p}\` \u2014 the dynamic-mode sentinel expands at fire time to the full instructions (first fire / first fire post-compact / loop.md edited) or a dynamic-pacing-specific short reminder (subsequent fires). Do not pass the full instructions; that is handled automatically.
   - \`noop\`: \`true\` if this tick changed nothing ("still waiting", "quiet hold"); \`false\` if it did something worth keeping. Consecutive \`noop: true\` ticks collapse in the terminal.
   If it isn't, stop instead (step 6) \u2014 re-arming is a per-turn choice, not a default.`,
      }),
      I = `1. **Run ${l} now**, following the instructions inlined below.
2. **If the next tick is gated on an event** (CI finishing, a PR comment, a log line) and no ${MONITOR} is already running for it: ${monitorArmInstruction()}. Its events wake this loop immediately \u2014 you do not wait for the ${SCHEDULE_WAKEUP_TOOL_NAME} deadline. ${monitorRearmInstruction("ticks")}
${steps34}
5. **If woken by a \`<task-notification>\`** rather than this prompt: handle the event, then make the same decision. If the loop should continue, ${rearmUpdate(`call ${SCHEDULE_WAKEUP_TOOL_NAME} again with \`${p}\` and the same 1200\u20131800s \`delaySeconds\` (the ${MONITOR} remains the wake signal; the new wakeup is only the fallback heartbeat)`)}. If the event means the work is finished, stop (step 6).
6. **To stop the loop** \u2014 the task is complete, further iterations can't make progress, or the user asked you to stop \u2014 call ${SCHEDULE_WAKEUP_TOOL_NAME} with \`stop: true\` (no other fields) and ${TASKSTOP} any ${MONITOR} you armed (use ${TASK_LIST_TOOL_NAME} to find the task ID if it is no longer in context).${loopOutcomeHint()} Stopping is the loop's normal ending \u2014 the user can restart it anytime with /loop.${loopStopNotificationHint()}`;
    return `${_}

## Action

${I}

${r}

${n}`;
  }
  let c = e ? h.LOOP_FILE_SENTINEL : Krt,
    d = e
      ? `# /loop \u2014 schedule loop.md tasks

The user invoked \`/loop\` with no prompt (input was empty or just the interval \`${t}\`) and has a loop-tasks file at \`${e.path}\`. Schedule a recurring cron that runs those tasks each tick, then run the first tick immediately.`
      : `# /loop \u2014 schedule the autonomous default

The user invoked \`/loop\` with no prompt (input was empty or just the interval \`${t}\`). Schedule the autonomous-loop default and then run the first autonomous check immediately.`,
    u = e
      ? "it expands at fire time to the full loop.md contents on first delivery (and whenever loop.md has been edited since last fire), and to a short reminder on subsequent unchanged fires. The long instructions stay in the cached message-prefix."
      : "it expands at fire time to the full autonomous-loop instructions on first delivery, and to a short reminder on subsequent fires (the long instructions stay in the cached message-prefix).",
    O = e
      ? `what's scheduled, the cron expression, the human-readable cadence, that it's running tasks from \`${e.path}\`, that recurring tasks auto-expire after ${DEFAULT_MAX_AGE_DAYS} days, and that the user can cancel sooner with ${CRON_DELETE_TOOL_NAME} (include the job ID).`
      : `what's scheduled, the cron expression, the human-readable cadence, that recurring tasks auto-expire after ${DEFAULT_MAX_AGE_DAYS} days, and that they can cancel sooner with ${CRON_DELETE_TOOL_NAME} (include the job ID). Mention this is the autonomous default and that the autonomous-loop instructions are baked in.`;
  return `${d}

## Action

1. Convert \`${t}\` to a 5-field cron expression. Supported suffixes: \`s\` \u2192 ceil to nearest minute, \`m\` (minutes), \`h\` (hours), \`d\` (days). Examples: \`5m\` \u2192 \`*/5 * * * *\`, \`1h\` \u2192 \`0 * * * *\`, \`1d\` \u2192 \`0 0 * * *\`. If the interval doesn't cleanly divide its unit, round to the nearest clean interval and tell the user what you rounded to.
2. Call ${CRON_CREATE_TOOL_NAME} with:
   - \`cron\`: the expression from step 1
   - \`prompt\`: the literal string \`${c}\` \u2014 ${u}
   - \`recurring\`: \`true\`
3. Briefly confirm: ${O}
4. **Then immediately run ${l} now**, following the instructions inlined below. Don't wait for the first cron fire.

${r}

${n}`;
}
//@ chunk-gbtb0mjv.js:21459-22666 placement
function registerLoopSkill() {
  registerBundledSkill({
    name: LOOP,
    menuDescription: "Repeat a prompt or command on an interval (e.g. /loop 5m /foo)",
    aliases: ["proactive"],
    description:
      "Run a prompt or slash command on a recurring interval (e.g. /loop 5m /foo). Omit the interval to let the model self-pace.",
    whenToUse:
      'When the user wants to set up a recurring task, poll for status, or run something repeatedly on an interval (e.g. "check the deploy every 5 minutes", "keep running /babysit-prs"). Do NOT invoke for one-off tasks.',
    argumentHint: "[interval] [prompt]",
    userInvocable: !0,
    argsMayContainSlashCommands: !0,
    isEnabled: isKairosCronEnabled,
    async getPromptForCommand(e, o) {
      let trimmed = e.trim(),
        s = o.options?.mainLoopModel,
        r = s !== void 0 && needsFableMitigations(getCanonicalName(s), s);
      if (!o.options?.isSkillPreload && !o.options?.modelScheduledOrigin)
        logEvent("tengu_loop_command", {
          has_args: trimmed.length > 0,
          is_interval_only: INTERVAL_SUFFIX_RE.test(trimmed) || EVERY_INTERVAL_RE.test(trimmed),
        });
      let match = trimmed.match(EVERY_INTERVAL_RE),
        l = !trimmed,
        c = INTERVAL_SUFFIX_RE.test(trimmed) || match !== null;
      if (l || c) {
        let d = match ? normalizeEveryInterval(match) : trimmed || A,
          loopFileAsync = await h.readLoopFileAsync(o.storageV5);
        if (l) {
          if (!o.options?.isSkillPreload && !o.options?.modelScheduledOrigin) resetLoopState();
          return [{ type: "text", text: loopFilePrompt(loopFileAsync, !0, d, r) }];
        }
        return [{ type: "text", text: loopFilePrompt(loopFileAsync, !1, d, r) }];
      }
      if (!o.options?.isSkillPreload && !o.options?.modelScheduledOrigin) resetLoopState();
      return [{ type: "text", text: dynamicLoopPrompt(trimmed, r) }];
    },
  });
}
