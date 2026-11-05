/**
 * tools/ScheduleCronTool/CronCreateTool.ts
 *
 * CronCreate 工具：创建循环/一次性定时 prompt，可选 durable 持久化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ScheduleCronTool/CronCreateTool.ts
 * pieces: chunk-z8eehvwz.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  booleanSchema,
  objectSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { booleanishSchema } from "../../utils/spellcheck.js";
import {
  DEFAULT_MAX_AGE_DAYS,
  buildDurableParamDescription,
  isDurableCronEnabled,
  NEXT_FIRE_AT_DESCRIPTION,
  CRON_CREATE_TOOL_NAME,
  isKairosCronEnabled,
  buildCronCreateDescription,
  buildCronCreatePrompt,
} from "./prompt.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  getCronFilePath,
  nextCronRunMs,
  listAllCronTasks,
  addCronTask,
  nextFireTimeForTask,
  roundToMinute,
} from "../../utils/cronTasks.js";
import { isUnknownPluginSpawnedAgent, UNKNOWN_PLUGIN_AGENT_NOTE } from "../AgentTool/pluginSpawnNote.js";
import { logForDebugging } from "../../utils/debug.js";
import { parseCronExpression, cronToHuman } from "../../utils/cron.js";
import { getTeammateContext } from "../../utils/teammateContext.js";
import { getCronJitterConfig } from "../../utils/cronJitterConfig.js";
import { setScheduledTasksEnabled } from "../../bootstrap/state.js";
import { formatCronFireTime } from "../../hooks/useScheduledTasks.js";
import { truncate } from "../../utils/format.js";

//@ chunk-z8eehvwz.js:5461-8347 fingerprint (2.1.88 match: CronCreateTool, 0.775)
/**
 * CronCreate 工具（shouldDefer，enablesCodeExecution；isEnabled = isKairosCronEnabled）。输入 cron（5 字段本地时间）、prompt、recurring（默认 true）、durable（仅 tengu_kairos_cron_durable 开启时生效）。权限：auto 模式下 passthrough 交给分类器，否则直接允许。validateInput：特定上下文拒绝、表达式非法、一年内无匹配日期、已有任务 ≥50、队友不能建 durable 任务。call 写入任务（durable 写 .claude/scheduled_tasks.json，否则只在会话内存），按抖动配置算下次触发时间。
 */
var MAX_CRON_JOBS = 50;
var cronCreateInputSchema = DoctorLazy(() =>
  zodStrictObject({
    cron: stringSchema().describe(
      'Standard 5-field cron expression in local time: "M H DoM Mon DoW" (e.g. "*/5 * * * *" = every 5 minutes, "30 14 28 2 *" = Feb 28 at 2:30pm local once).',
    ),
    prompt: stringSchema().describe("The prompt to enqueue at each fire time."),
    recurring: booleanishSchema(booleanSchema().optional()).describe(
      `true (default) = fire on every cron match until deleted or auto-expired after ${DEFAULT_MAX_AGE_DAYS} days. false = fire once at the next match, then auto-delete. Use false for "remind me at X" one-shot requests with pinned minute/hour/dom/month.`,
    ),
    durable: booleanishSchema(booleanSchema().optional()).describe(
      buildDurableParamDescription(isDurableCronEnabled()),
    ),
  }),
);
var cronCreateOutputSchema = DoctorLazy(() =>
  objectSchema({
    id: stringSchema(),
    humanSchedule: stringSchema(),
    recurring: booleanSchema(),
    durable: booleanSchema().optional(),
    nextFireAt: numberSchema().optional().describe(NEXT_FIRE_AT_DESCRIPTION),
  }),
);
var CronCreateTool = buildTool({
  name: CRON_CREATE_TOOL_NAME,
  searchHint: "schedule a recurring or one-shot prompt",
  enablesCodeExecution: true,
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return cronCreateInputSchema();
  },
  get outputSchema() {
    return cronCreateOutputSchema();
  },
  isEnabled() {
    return isKairosCronEnabled();
  },
  toAutoClassifierInput(input) {
    return `${input.cron}: ${input.prompt}`;
  },
  async description() {
    return buildCronCreateDescription(isDurableCronEnabled());
  },
  async prompt() {
    return buildCronCreatePrompt(isDurableCronEnabled());
  },
  getPath() {
    return getCronFilePath();
  },
  create(pluginContext) {
    return {
      async checkPermissions(updatedInput) {
        if (pluginContext.permissions().mode === "auto")
          return {
            behavior: "passthrough",
            message: "Scheduling a cron prompt requires classifier review.",
          };
        return {
          behavior: "allow",
          updatedInput,
        };
      },
      async validateInput(input) {
        let refusalNote = isUnknownPluginSpawnedAgent(pluginContext) ? UNKNOWN_PLUGIN_AGENT_NOTE : undefined;
        if (refusalNote !== undefined) {
          logForDebugging(`CronCreate refused: ${refusalNote}`);
          return {
            result: false,
            message: refusalNote,
            errorCode: 5,
          };
        }
        if (!parseCronExpression(input.cron))
          return {
            result: false,
            message: `Invalid cron expression '${input.cron}'. Expected 5 fields: M H DoM Mon DoW.`,
            errorCode: 1,
          };
        if (nextCronRunMs(input.cron, Date.now()) === null)
          return {
            result: false,
            message: `Cron expression '${input.cron}' does not match any calendar date in the next year.`,
            errorCode: 2,
          };
        if ((await listAllCronTasks()).length >= MAX_CRON_JOBS)
          return {
            result: false,
            message: `Too many scheduled jobs (max ${MAX_CRON_JOBS}). Cancel one first.`,
            errorCode: 3,
          };
        if (input.durable && getTeammateContext())
          return {
            result: false,
            message:
              "durable crons are not supported for teammates (teammates do not persist across sessions)",
            errorCode: 4,
          };
        return {
          result: true,
        };
      },
      async call({ cron, prompt, recurring = true, durable = false }) {
        let effectiveDurable = durable && isDurableCronEnabled();
        let now = Date.now();
        let id = await addCronTask(
          cron,
          prompt,
          recurring,
          effectiveDurable,
          getTeammateContext()?.agentId,
          now,
          pluginContext,
        );
        let nextFireAt = nextFireTimeForTask(
          {
            id,
            cron,
            createdAt: now,
            recurring,
          },
          getCronJitterConfig(),
        );
        setScheduledTasksEnabled(true);
        return {
          data: {
            id,
            humanSchedule: cronToHuman(cron),
            recurring,
            durable: effectiveDurable,
            ...(nextFireAt !== null && {
              nextFireAt,
            }),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    let where = output.durable
      ? "Persisted to .claude/scheduled_tasks.json"
      : "Session-only (not written to disk, dies when Claude exits)";
    let fireSuffix =
      output.nextFireAt === undefined
        ? ""
        : ` Next run: ${formatCronFireTime(roundToMinute(output.nextFireAt))}.`;
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: output.recurring
        ? `Scheduled recurring job ${output.id} (${output.humanSchedule}).${fireSuffix} ${where}. Auto-expires after ${DEFAULT_MAX_AGE_DAYS} days. Use CronDelete to cancel sooner.`
        : `Scheduled one-shot task ${output.id} (${output.humanSchedule}).${fireSuffix} ${where}. It will fire once then auto-delete.`,
    };
  },
  renderToolUseMessage(input) {
    return `${input.cron ?? ""}${input.prompt ? `: ${truncate(input.prompt, 60, true)}` : ""}`;
  },
});
export { CronCreateTool };
