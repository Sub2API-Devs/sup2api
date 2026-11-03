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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { parseScheduleInput } from "../../utils/cron.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { hasValidDates } from "../../commands/insights.js";
import { HintText } from "../../components/design-system/HintText.js";
import { truncate } from "../../utils/format.js";

//@ chunk-vde9a20m.js:818-822 placement
j();
//@ chunk-vde9a20m.js:869-941 placement
function cronPromptFieldHint() {
  return "Sent to Claude on each fire. Slash commands work.";
}
//@ chunk-vde9a20m.js:941-1004 placement
function validateScheduleInput(mo) {
  return mo.trim() === "" ? null : (parseScheduleInput(mo).error ?? null);
}
/**
 * 把输入文本解析成 cron 并返回 "人类可读 · cron"，解析失败返回 undefined。
 */
//@ chunk-vde9a20m.js:1004-1114 fingerprint = renderCreateToolUseMessage (0.616)
function renderCreateToolUseMessage(input) {
  if (input.trim() === "") {
    return;
  }
  let Ee = parseScheduleInput(input);
  return Ee.error ? void 0 : `${Ee.human} \xB7 ${Ee.cron}`;
}
/**
 * CronCreate 结果渲染："Scheduled <id> (人类可读时间表 下次时间)"。
 */
//@ chunk-ah34pb7m.js:35256-35430 fingerprint = renderCreateResultMessage (0.503)
function renderCreateResultMessage(output) {
  return e(MessageResponse, {
    children: r(Text, {
      children: [
        "Scheduled ",
        e(Text, { bold: !0, children: output.id }),
        " ",
        r(Text, {
          dimColor: !0,
          children: ["(", output.humanSchedule, hasValidDates(output.nextFireAt), ")"],
        }),
      ],
    }),
  });
}
//@ chunk-ah34pb7m.js:35430-35529 placement
function renderDeleteResultMessage(output) {
  return e(MessageResponse, {
    children: r(Text, { children: ["Cancelled ", e(Text, { bold: !0, children: output.id })] }),
  });
}
/**
 * 显示定时任务列表。
 */
//@ chunk-ah34pb7m.js:35529-35940 placement
function renderCronList(m) {
  if (m.jobs.length === 0)
    return e(MessageResponse, { children: e(HintText, { children: "No scheduled jobs" }) });
  return e(MessageResponse, {
    children: e(Box, {
      flexDirection: "column",
      children: m.jobs.map((job) =>
        r(
          Text,
          {
            children: [
              e(Text, { bold: !0, children: job.id }),
              " ",
              r(Text, {
                dimColor: !0,
                children: [
                  job.humanSchedule,
                  job.recurring ? " (recurring)" : " (one-shot)",
                  job.durable === !1 ? " [session-only]" : "",
                  hasValidDates(job.nextFireAt),
                  job.prompt ? `: ${truncate(job.prompt, 60, !0)}` : "",
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
/**
 * 取 CronList 输出中的任务数组（缺省为空数组）。
 */
//@ chunk-93kwxas0.js:163163-163196 fingerprint = renderListResultMessage (0.512)
function renderListResultMessage(output) {
  return output.jobs ?? [];
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
