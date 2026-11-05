/**
 * tools/ScheduleCronTool/prompt.ts
 *
 * Cron 工具名、开关（tengu_kairos_cron / tengu_kairos_cron_durable / CLAUDE_CODE_DISABLE_CRON）、description 与 prompt
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ScheduleCronTool/prompt.ts
 * pieces: chunk-7kayq7nc.js (1), chunk-ga95v15r.js (11)
 * attribution: facade-exports 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DEFAULT_CRON_JITTER_CONFIG, hasCronTasksSync } from "../../utils/cronTasks.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_WITH_REFRESH } from "../../services/analytics/growthbook.js";
import { MONITOR } from "../MonitorTool/constants.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:166432-166561 facade-exports (2.1.88 match: CRON_CREATE_TOOL_NAME, 0.4)
/**
 * Cron 三个工具名常量（CronCreate/CronDelete/CronList）与 nextFireAt 字段说明。
 */
var CRON_CREATE_TOOL_NAME = "CronCreate";
var CRON_DELETE_TOOL_NAME = "CronDelete";
var CRON_LIST_TOOL_NAME = "CronList";
var NEXT_FIRE_AT_DESCRIPTION = "Epoch ms of the job's next run, the scheduler's per-job offset included";
//@ chunk-ga95v15r.js:381-428 facade-exports (2.1.88 match: DEFAULT_MAX_AGE_DAYS, 1)
/**
 * Cron 门控缓存刷新间隔（5 分钟）；f$e 为循环任务自动过期天数（来自默认抖动配置 recurringMaxAgeMs）。
 */
var CRON_GATE_REFRESH_MS; // deferred: uses DEFAULT_CRON_JITTER_CONFIG (../../utils/cronTasks.js) of its import cycle while loading; runs once the cycle is complete
var DEFAULT_MAX_AGE_DAYS;
deferInit("chunk-ga95v15r.js:381", () => {
  CRON_GATE_REFRESH_MS = 300000;
  DEFAULT_MAX_AGE_DAYS = DEFAULT_CRON_JITTER_CONFIG.recurringMaxAgeMs / 86400000;
});
//@ chunk-ga95v15r.js:428-506 facade-exports (2.1.88 match: isKairosCronEnabled, 1)
/**
 * Cron 功能总开关：未设置 CLAUDE_CODE_DISABLE_CRON 且 GrowthBook tengu_kairos_cron（默认 true）。
 */
function isKairosCronEnabled() {
  return (
    !env.CLAUDE_CODE_DISABLE_CRON &&
    getFeatureValue_CACHED_WITH_REFRESH("tengu_kairos_cron", true, CRON_GATE_REFRESH_MS)
  );
}
//@ chunk-ga95v15r.js:506-540 facade-exports
function isCronManagementEnabled() {
  return isKairosCronEnabled() || hasCronTasksSync();
}
//@ chunk-ga95v15r.js:540-599 facade-exports (2.1.88 match: isDurableCronEnabled, 1)
/**
 * durable（跨会话持久化）任务开关：GrowthBook tengu_kairos_cron_durable（默认 true）。
 */
function isDurableCronEnabled() {
  return getFeatureValue_CACHED_WITH_REFRESH("tengu_kairos_cron_durable", true, CRON_GATE_REFRESH_MS);
}
//@ chunk-ga95v15r.js:599-970 facade-exports (2.1.88 match: buildCronCreateDescription, 1)
/**
 * CronCreate description，按 durable 是否可用给两版。
 */
function buildCronCreateDescription(durableEnabled) {
  return durableEnabled
    ? "Schedule a prompt to run at a future time \u2014 either recurring on a cron schedule, or once at a specific time. Pass durable: true to persist to .claude/scheduled_tasks.json; otherwise session-only."
    : "Schedule a prompt to run at a future time within this Claude session \u2014 either recurring on a cron schedule, or once at a specific time.";
}
//@ chunk-ga95v15r.js:970-1342 facade-exports
/**
 * durable 参数的说明文本（可用/不可用两版）。
 */
function buildDurableParamDescription(durableAvailable) {
  return durableAvailable
    ? "true = persist to .claude/scheduled_tasks.json and survive restarts. false (default) = in-memory only, dies when this Claude session ends. Use true only when the user asks the task to survive across sessions."
    : "Has no effect \u2014 durable persistence is not available. All jobs are session-only (in-memory, gone when this Claude session ends).";
}
//@ chunk-ga95v15r.js:1342-5066 facade-exports (2.1.88 match: buildCronCreatePrompt, 0.434)
/**
 * CronCreate prompt：一次性与循环任务写法、避开 :00/:30 整点、持久化说明、不用于实时监控（应改用 Monitor 工具）、只在 REPL 空闲时触发、循环任务 N 天自动过期。
 */
function buildCronCreatePrompt(durableEnabled) {
  let { recurringFrac, recurringCapMs, oneShotMaxMs } = DEFAULT_CRON_JITTER_CONFIG;
  return `Schedule a prompt to be enqueued at a future time. Use for both recurring schedules and one-shot reminders.

Uses standard 5-field cron in the user's local timezone: minute hour day-of-month month day-of-week. "0 9 * * *" means 9am local \u2014 no timezone conversion needed.

## One-shot tasks (recurring: false)

For "remind me at X" or "at <time>, do Y" requests \u2014 fire once then auto-delete.
Pin minute/hour/day-of-month/month to specific values:
  "remind me at 2:30pm today to check the deploy" \u2192 cron: "30 14 <today_dom> <today_month> *", recurring: false
  "tomorrow morning, run the smoke test" \u2192 cron: "57 8 <tomorrow_dom> <tomorrow_month> *", recurring: false

## Recurring jobs (recurring: true, the default)

For "every N minutes" / "every hour" / "weekdays at 9am" requests:
  "*/5 * * * *" (every 5 min), "0 * * * *" (hourly), "0 9 * * 1-5" (weekdays at 9am local)

## Avoid the :00 and :30 minute marks when the task allows it

Every user who asks for "9am" gets \`0 9\`, and every user who asks for "hourly" gets \`0 *\` \u2014 which means requests from across the planet land on the API at the same instant. When the user's request is approximate, pick a minute that is NOT 0 or 30:
  "every morning around 9" \u2192 "57 8 * * *" or "3 9 * * *" (not "0 9 * * *")
  "hourly" \u2192 "7 * * * *" (not "0 * * * *")
  "in an hour or so, remind me to..." \u2192 pick whatever minute you land on, don't round

Only use minute 0 or 30 when the user names that exact time and clearly means it ("at 9:00 sharp", "at half past", coordinating with a meeting). When in doubt, nudge a few minutes early or late \u2014 the user will not notice, and the fleet will.

${
  durableEnabled
    ? `## Durability

By default (durable: false) the job lives only in this Claude session \u2014 nothing is written to disk, and the job is gone when Claude exits. Pass durable: true to write to .claude/scheduled_tasks.json so the job survives restarts. Only use durable: true when the user explicitly asks for the task to persist ("keep doing this every day", "set this up permanently"). Most "remind me in 5 minutes" / "check back in an hour" requests should stay session-only.`
    : `## Session-only

Jobs live only in this Claude session \u2014 nothing is written to disk, and the job is gone when Claude exits.`
}

## Not for live watching

${CRON_CREATE_TOOL_NAME} re-runs a prompt at fixed wall-clock intervals. To watch a log file, process, or command output and be notified the moment something changes, use the ${MONITOR} tool instead \u2014 ${MONITOR} streams events as they happen; cron polls on a schedule.

## Runtime behavior

Jobs only fire while the REPL is idle (not mid-query). ${durableEnabled ? "Durable jobs persist to .claude/scheduled_tasks.json and survive session restarts \u2014 on next launch they resume automatically. One-shot durable tasks that were missed while the REPL was closed are surfaced for catch-up. Session-only jobs die with the process. " : ""}The scheduler shifts each job by a fixed per-job offset on top of whatever you pick: by default a recurring job runs up to ${Math.round(recurringFrac * 100)}% of its period late (max ${recurringCapMs / 60000} min), and a one-shot job landing on :00 or :30 runs up to ${oneShotMaxMs / 1000} s early. The result of this tool and of ${CRON_LIST_TOOL_NAME} gives each job's actual next run time: when you tell the user when a job will run, give that time, not the minute in the cron expression. Picking an off-minute is still the bigger lever.

Recurring tasks auto-expire after ${DEFAULT_MAX_AGE_DAYS} days \u2014 they fire one final time, then are deleted. This bounds session lifetime. Tell the user about the ${DEFAULT_MAX_AGE_DAYS}-day limit when scheduling recurring jobs.

Returns a job ID you can pass to ${CRON_DELETE_TOOL_NAME}.`;
}
//@ chunk-ga95v15r.js:5066-5110 facade-exports (2.1.88 match: CRON_DELETE_DESCRIPTION, 1)
/**
 * CronDelete 的 description；_5o 为其 prompt。
 */
var CRON_DELETE_DESCRIPTION = "Cancel a scheduled cron job by ID";
//@ chunk-ga95v15r.js:5110-5398 facade-exports (2.1.88 match: buildCronDeletePrompt, 1)
/**
 * CronDelete 的 prompt（按 durable 是否可用给两版）。
 */
function buildCronDeletePrompt(durableEnabled) {
  return durableEnabled
    ? `Cancel a cron job previously scheduled with ${CRON_CREATE_TOOL_NAME}. Removes it from .claude/scheduled_tasks.json (durable jobs) or the in-memory session store (session-only jobs).`
    : `Cancel a cron job previously scheduled with ${CRON_CREATE_TOOL_NAME}. Removes it from the in-memory session store.`;
}
//@ chunk-ga95v15r.js:5398-5433 facade-exports (2.1.88 match: CRON_LIST_DESCRIPTION, 1)
/**
 * CronList 的 description；S5o 为其 prompt。
 */
var CRON_LIST_DESCRIPTION = "List scheduled cron jobs";
//@ chunk-ga95v15r.js:5433-5620 facade-exports (2.1.88 match: buildCronListPrompt, 1)
/**
 * CronList 的 prompt（按 durable 是否可用给两版）。
 */
function buildCronListPrompt(durableEnabled) {
  return durableEnabled
    ? `List all cron jobs scheduled via ${CRON_CREATE_TOOL_NAME}, both durable (.claude/scheduled_tasks.json) and session-only.`
    : `List all cron jobs scheduled via ${CRON_CREATE_TOOL_NAME} in this session.`;
}
export {
  CRON_CREATE_TOOL_NAME,
  isKairosCronEnabled,
  CRON_DELETE_TOOL_NAME,
  NEXT_FIRE_AT_DESCRIPTION,
  CRON_LIST_TOOL_NAME,
  isCronManagementEnabled,
  CRON_LIST_DESCRIPTION,
  buildCronListPrompt,
  isDurableCronEnabled,
  CRON_DELETE_DESCRIPTION,
  buildCronDeletePrompt,
  DEFAULT_MAX_AGE_DAYS,
  buildDurableParamDescription,
  buildCronCreateDescription,
  buildCronCreatePrompt,
};
