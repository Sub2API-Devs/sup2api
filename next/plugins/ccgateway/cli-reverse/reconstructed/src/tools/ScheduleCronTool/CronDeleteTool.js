/**
 * tools/ScheduleCronTool/CronDeleteTool.ts
 *
 * CronDelete 工具：按 id 取消定时任务
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ScheduleCronTool/CronDeleteTool.ts
 * pieces: chunk-8hwad9m5.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  CRON_DELETE_TOOL_NAME,
  isCronManagementEnabled,
  CRON_DELETE_DESCRIPTION,
  buildCronDeletePrompt,
  isDurableCronEnabled,
} from "./prompt.js";
import { getCronFilePath, listAllCronTasks, removeCronTasks } from "../../utils/cronTasks.js";
import { getTeammateContext } from "../../utils/teammateContext.js";

//@ chunk-8hwad9m5.js:4752-5707 fingerprint (2.1.88 match: CronDeleteTool, 0.868)
/**
 * CronDelete 工具：按 id 取消任务；不存在或属于其他代理时拒绝。
 */
var cronDeleteInputSchema = DoctorLazy(() =>
  zodStrictObject({
    id: stringSchema().describe("Job ID returned by CronCreate."),
  }),
);
var cronDeleteOutputSchema = DoctorLazy(() =>
  objectSchema({
    id: stringSchema(),
  }),
);
var CronDeleteTool = buildTool({
  name: CRON_DELETE_TOOL_NAME,
  searchHint: "cancel a scheduled cron job",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  shouldDefer: true,
  get inputSchema() {
    return cronDeleteInputSchema();
  },
  get outputSchema() {
    return cronDeleteOutputSchema();
  },
  isEnabled() {
    return isCronManagementEnabled();
  },
  toAutoClassifierInput(input) {
    return input.id;
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
      async validateInput(input) {
        let found = (await listAllCronTasks()).find((t) => t.id === input.id);
        if (!found)
          return {
            result: false,
            message: `No scheduled job with id '${input.id}'`,
            errorCode: 1,
          };
        let ctx = getTeammateContext();
        if (ctx && found.agentId !== ctx.agentId)
          return {
            result: false,
            message: `Cannot delete cron job '${input.id}': owned by another agent`,
            errorCode: 2,
          };
        return {
          result: true,
        };
      },
      async call({ id }) {
        await removeCronTasks([id]);
        return {
          data: {
            id,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam(output, toolUseID) {
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: `Cancelled job ${output.id}.`,
    };
  },
  renderToolUseMessage(input) {
    return input.id ?? "";
  },
});
export { CronDeleteTool };
