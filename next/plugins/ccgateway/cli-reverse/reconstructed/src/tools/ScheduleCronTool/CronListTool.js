/**
 * tools/ScheduleCronTool/CronListTool.ts
 *
 * CronList 工具：列出定时任务与下次触发时间
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ScheduleCronTool/CronListTool.ts
 * pieces: chunk-60t4wkqf.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  objectSchema,
  array,
  stringSchema,
  booleanSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import {
  NEXT_FIRE_AT_DESCRIPTION,
  CRON_LIST_TOOL_NAME,
  isCronManagementEnabled,
  CRON_LIST_DESCRIPTION,
  buildCronListPrompt,
  isDurableCronEnabled,
  isKairosCronEnabled,
  CRON_DELETE_TOOL_NAME,
} from "./prompt.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { listAllCronTasks, nextFireTimeForTask, roundToMinute } from "../../utils/cronTasks.js";
import { getTeammateContext } from "../../utils/teammateContext.js";
import { getCronJitterConfig } from "../../utils/cronJitterConfig.js";
import { cronToHuman } from "../../utils/cron.js";
import { formatCronFireTime } from "../../hooks/useScheduledTasks.js";
import { truncate } from "../../utils/format.js";

//@ chunk-60t4wkqf.js:4881-6259 fingerprint (2.1.88 match: CronListTool, 0.796)
/**
 * CronList 工具（只读可并发）：列出任务（代理上下文中只列本代理的），附人类可读时间表与下次触发时间。
 */
var cronListInputSchema = DoctorLazy(() => zodStrictObject({}));
var cronListOutputSchema = DoctorLazy(() =>
  objectSchema({
    jobs: array(
      objectSchema({
        id: stringSchema(),
        cron: stringSchema(),
        humanSchedule: stringSchema(),
        prompt: stringSchema(),
        recurring: booleanSchema().optional(),
        durable: booleanSchema().optional(),
        nextFireAt: numberSchema().optional().describe(NEXT_FIRE_AT_DESCRIPTION),
      }),
    ),
  }),
);
var CronListTool = buildTool({
  name: CRON_LIST_TOOL_NAME,
  searchHint: "list active cron jobs",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return cronListInputSchema();
  },
  get outputSchema() {
    return cronListOutputSchema();
  },
  isEnabled() {
    return isCronManagementEnabled();
  },
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  async description() {
    return CRON_LIST_DESCRIPTION;
  },
  async prompt() {
    return buildCronListPrompt(isDurableCronEnabled());
  },
  create() {
    return {
      async call() {
        let allTasks = await listAllCronTasks();
        let ctx = getTeammateContext();
        let tasks = ctx ? allTasks.filter((t) => t.agentId === ctx.agentId) : allTasks;
        let jitterConfig = getCronJitterConfig();
        let now = Date.now();
        let kairosCronEnabled = isKairosCronEnabled();
        return {
          data: {
            jobs: tasks.map((t) => {
              let nextFireAt = kairosCronEnabled
                ? (t.nextFireAt ?? nextFireTimeForTask(t, jitterConfig))
                : null;
              return {
                id: t.id,
                cron: t.cron,
                humanSchedule: cronToHuman(t.cron),
                prompt: t.prompt,
                ...(t.recurring && {
                  recurring: true,
                }),
                ...(t.durable === false && {
                  durable: false,
                }),
                ...(nextFireAt !== null && {
                  nextFireAt: Math.max(nextFireAt, now),
                }),
              };
            }),
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content:
        output.jobs.length > 0
          ? (isKairosCronEnabled()
              ? ""
              : `Scheduled tasks are turned off in this session, so these jobs will not run here. ${CRON_DELETE_TOOL_NAME} can remove them.
`) +
            output.jobs.map(
              (j) =>
                `${j.id} \u2014 ${j.humanSchedule}${j.recurring ? " (recurring)" : " (one-shot)"}${j.durable === false ? " [session-only]" : ""}${j.nextFireAt === undefined ? "" : `, next run ${formatCronFireTime(roundToMinute(j.nextFireAt))}`}: ${truncate(j.prompt, 80, true)}`,
            ).join(`
`)
          : "No scheduled jobs.",
    };
  },
  renderToolUseMessage() {
    return "";
  },
});
export { CronListTool };
