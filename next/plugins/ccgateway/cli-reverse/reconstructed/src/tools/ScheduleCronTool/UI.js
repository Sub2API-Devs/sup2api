/**
 * tools/ScheduleCronTool/UI.tsx
 *
 * Cron 工具渲染：创建结果、cron 文本的人类可读显示、列表任务提取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ScheduleCronTool/UI.tsx
 * pieces: chunk-93kwxas0.js (1), chunk-ah34pb7m.js (3), chunk-vde9a20m.js (4)
 * attribution: fingerprint 3, placement 5
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { hasValidDates } from "../../commands/insights.js";
import { HintText } from "../../components/design-system/HintText.js";
import { truncate } from "../../utils/format.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { parseScheduleInput } from "../../utils/cron.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-93kwxas0.js:163163-163196 fingerprint = renderListResultMessage (0.512)
/**
 * 取 CronList 输出中的任务数组（缺省为空数组）。
 */
function renderListResultMessage(output) {
  return output.jobs ?? [];
}
//@ chunk-ah34pb7m.js:35256-35430 fingerprint = renderCreateResultMessage (0.503)
/**
 * CronCreate 结果渲染："Scheduled <id> (人类可读时间表 下次时间)"。
 */
function renderCreateResultMessage(output) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      children: [
        "Scheduled ",
        jsxProd_default(Text, {
          bold: true,
          children: output.id,
        }),
        " ",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["(", output.humanSchedule, hasValidDates(output.nextFireAt), ")"],
        }),
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:35430-35529 placement
function renderDeleteResultMessage(output) {
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default_2(Text, {
      children: [
        "Cancelled ",
        jsxProd_default(Text, {
          bold: true,
          children: output.id,
        }),
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:35529-35940 placement
/**
 * 显示定时任务列表。
 */
function renderCronList(result) {
  if (result.jobs.length === 0)
    return jsxProd_default(MessageResponse, {
      children: jsxProd_default(HintText, {
        children: "No scheduled jobs",
      }),
    });
  return jsxProd_default(MessageResponse, {
    children: jsxProd_default(Box, {
      flexDirection: "column",
      children: result.jobs.map((job) =>
        jsxProd_default_2(
          Text,
          {
            children: [
              jsxProd_default(Text, {
                bold: true,
                children: job.id,
              }),
              " ",
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [
                  job.humanSchedule,
                  job.recurring ? " (recurring)" : " (one-shot)",
                  job.durable === false ? " [session-only]" : "",
                  hasValidDates(job.nextFireAt),
                  job.prompt ? `: ${truncate(job.prompt, 60, true)}` : "",
                ],
              }),
            ],
          },
          job.id,
        ),
      ),
    }),
  });
}
//@ chunk-vde9a20m.js:818-822 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vde9a20m.js:818", () => {
  init_react_production();
});
//@ chunk-vde9a20m.js:869-941 placement
function cronPromptFieldHint() {
  return "Sent to Claude on each fire. Slash commands work.";
}
//@ chunk-vde9a20m.js:941-1004 placement
function validateScheduleInput(scheduleText) {
  return scheduleText.trim() === "" ? null : (parseScheduleInput(scheduleText).error ?? null);
}
//@ chunk-vde9a20m.js:1004-1114 fingerprint = renderCreateToolUseMessage (0.616)
/**
 * 把输入文本解析成 cron 并返回 "人类可读 · cron"，解析失败返回 undefined。
 */
function renderCreateToolUseMessage(input) {
  if (input.trim() === "") {
    return;
  }
  let scheduleInput = parseScheduleInput(input);
  return scheduleInput.error ? undefined : `${scheduleInput.human} \xB7 ${scheduleInput.cron}`;
}
export {
  renderListResultMessage,
  renderCreateResultMessage,
  renderDeleteResultMessage,
  renderCronList,
  cronPromptFieldHint,
  validateScheduleInput,
  renderCreateToolUseMessage,
};
