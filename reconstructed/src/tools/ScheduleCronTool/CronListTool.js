/**
 * tools/ScheduleCronTool/CronListTool.ts
 *
 * CronList 工具：列出定时任务与下次触发时间
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ScheduleCronTool/CronListTool.ts
 * pieces: chunk-8985aafb.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, u, A, o, M, E } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  NEXT_FIRE_AT_DESCRIPTION,
  CRON_LIST_TOOL_NAME,
  isKairosCronEnabled,
  CRON_LIST_DESCRIPTION,
  buildCronListPrompt,
  isDurableCronEnabled,
} from "./prompt.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { listAllCronTasks, nextFireTimeForTask, roundToMinute } from "../../utils/cronTasks.js";
import { getTeammateContext } from "../../utils/teammate.js";
import { getCronJitterConfig } from "../../utils/cronJitterConfig.js";
import { cronToHuman } from "../../utils/cron.js";
import { formatCronFireTime } from "../../hooks/useScheduledTasks.js";
import { truncate } from "../../utils/format.js";

/**
 * CronList 工具（只读可并发）：列出任务（代理上下文中只列本代理的），附人类可读时间表与下次触发时间。
 */
//@ chunk-8985aafb.js:4785-6031 fingerprint = CronListTool (0.865)
var cronListInputSchema = DoctorLazy(() => zodStrictObject({})),
  cronListOutputSchema = DoctorLazy(() =>
    u({
      jobs: A(
        u({
          id: o(),
          cron: o(),
          humanSchedule: o(),
          prompt: o(),
          recurring: M().optional(),
          durable: M().optional(),
          nextFireAt: E().optional().describe(NEXT_FIRE_AT_DESCRIPTION),
        }),
      ),
    }),
  ),
  CronListTool = buildTool({
    name: CRON_LIST_TOOL_NAME,
    searchHint: "list active cron jobs",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return cronListInputSchema();
    },
    get outputSchema() {
      return cronListOutputSchema();
    },
    isEnabled() {
      return isKairosCronEnabled();
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
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
          let r = await listAllCronTasks(),
            n = getTeammateContext(),
            t = n ? r.filter((e) => e.agentId === n.agentId) : r,
            i = getCronJitterConfig(),
            now = Date.now();
          return {
            data: {
              jobs: t.map((e) => {
                let a = e.nextFireAt ?? nextFireTimeForTask(e, i);
                return {
                  id: e.id,
                  cron: e.cron,
                  humanSchedule: cronToHuman(e.cron),
                  prompt: e.prompt,
                  ...(e.recurring && { recurring: !0 }),
                  ...(e.durable === !1 && { durable: !1 }),
                  ...(a !== null && { nextFireAt: Math.max(a, now) }),
                };
              }),
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(r, n) {
      return {
        tool_use_id: n,
        type: "tool_result",
        content:
          r.jobs.length > 0
            ? r.jobs.map(
                (job) =>
                  `${job.id} \u2014 ${job.humanSchedule}${job.recurring ? " (recurring)" : " (one-shot)"}${job.durable === !1 ? " [session-only]" : ""}${job.nextFireAt === void 0 ? "" : `, next run ${formatCronFireTime(roundToMinute(job.nextFireAt))}`}: ${truncate(job.prompt, 80, !0)}`,
              ).join(`
`)
            : "No scheduled jobs.",
      };
    },
    renderToolUseMessage() {
      return "";
    },
  });
