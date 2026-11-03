/**
 * tools/ScheduleCronTool/CronDeleteTool.ts
 *
 * CronDelete 工具：按 id 取消定时任务
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ScheduleCronTool/CronDeleteTool.ts
 * pieces: chunk-e1hwptaj.js (1)
 * attribution: fingerprint 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  CRON_DELETE_TOOL_NAME,
  isKairosCronEnabled,
  CRON_DELETE_DESCRIPTION,
  buildCronDeletePrompt,
  isDurableCronEnabled,
} from "./prompt.js";
import { getCronFilePath, listAllCronTasks, removeCronTasks } from "../../utils/cronTasks.js";
import { getTeammateContext } from "../../utils/teammate.js";

/**
 * CronDelete 工具：按 id 取消任务；不存在或属于其他代理时拒绝。
 */
//@ chunk-e1hwptaj.js:4662-5616 fingerprint = CronDeleteTool (0.868)
var cronDeleteInputSchema = DoctorLazy(() =>
    zodStrictObject({ id: o().describe("Job ID returned by CronCreate.") }),
  ),
  cronDeleteOutputSchema = DoctorLazy(() => u({ id: o() })),
  CronDeleteTool = buildTool({
    name: CRON_DELETE_TOOL_NAME,
    searchHint: "cancel a scheduled cron job",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    shouldDefer: !0,
    get inputSchema() {
      return cronDeleteInputSchema();
    },
    get outputSchema() {
      return cronDeleteOutputSchema();
    },
    isEnabled() {
      return isKairosCronEnabled();
    },
    toAutoClassifierInput(e) {
      return e.id;
    },
    async description() {
      return CRON_DELETE_DESCRIPTION;
    },
    async prompt() {
      return buildCronDeletePrompt(isDurableCronEnabled());
    },
    getPath() {
      return getCronFilePath();
    },
    create() {
      return {
        async validateInput(e) {
          let found = (await listAllCronTasks()).find((n) => n.id === e.id);
          if (!found) return { result: !1, message: `No scheduled job with id '${e.id}'`, errorCode: 1 };
          let a = getTeammateContext();
          if (a && found.agentId !== a.agentId)
            return {
              result: !1,
              message: `Cannot delete cron job '${e.id}': owned by another agent`,
              errorCode: 2,
            };
          return { result: !0 };
        },
        async call({ id: e }) {
          return (await removeCronTasks([e]), { data: { id: e } });
        },
      };
    },
    mapToolResultToToolResultBlockParam(e, t) {
      return { tool_use_id: t, type: "tool_result", content: `Cancelled job ${e.id}.` };
    },
    renderToolUseMessage(e) {
      return e.id ?? "";
    },
  });
