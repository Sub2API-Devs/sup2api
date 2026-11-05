/**
 * tools/ScheduleWakeupTool/ScheduleWakeupTool.ts
 *
 * 2.1.316 新增：ScheduleWakeup 工具 schema（延迟、原因、停止）与实现。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  numberSchema,
  stringSchema,
  booleanSchema,
  objectSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import {
  AUTONOMOUS_LOOP_DYNAMIC_PROMPT,
  AUTONOMOUS_LOOP_PROMPT,
  SCHEDULE_WAKEUP_TOOL_NAME,
  SCHEDULE_WAKEUP_DESCRIPTION,
  scheduleWakeupPrompt,
  loopOutcomeInstruction,
} from "./prompt.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { CRON_DELETE_TOOL_NAME } from "../ScheduleCronTool/prompt.js";
import { isOneHourCacheTtl } from "../../services/api/claude.js";
import { isUnknownPluginSpawnedAgent, UNKNOWN_PLUGIN_AGENT_NOTE } from "../AgentTool/pluginSpawnNote.js";
import { logForDebugging } from "../../utils/debug.js";
import { endLoopIfIdle, scheduleLoopWakeup } from "../../utils/loop/loopWakeups.js";
import { isBriefEnabled } from "../BriefTool/BriefTool.js";
import { MONITOR } from "../MonitorTool/constants.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { BRIEF_TOOL_NAME } from "../BriefTool/prompt.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { needsFableMitigations } from "../../utils/model/fableMitigations.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:47428-47513 placement
class ScheduleWakeupInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "ScheduleWakeupInputError";
  }
}
//@ chunk-fmnbrxwy.js:47513-52960 placement
/**
 * ScheduleWakeup 工具 schema（延迟、原因、停止）与实现。
 */
var ScheduleWakeupSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var scheduleWakeupInputSchema;
var ScheduleWakeupTool;
deferInit("chunk-fmnbrxwy.js:47513", () => {
  ScheduleWakeupSchema = DoctorLazy(() =>
    zodStrictObject({
      delaySeconds: coercedNumberSchema(numberSchema())
        .optional()
        .describe(
          "Seconds from now to wake up. Clamped to [60, 3600] by the runtime. Required unless `stop` is true.",
        ),
      reason: stringSchema()
        .optional()
        .describe(
          "One short sentence explaining the chosen delay. Goes to telemetry and is shown to the user. Be specific. Required unless `stop` is true.",
        ),
      prompt: stringSchema()
        .optional()
        .describe(
          `The /loop input to fire on wake-up. Pass the same /loop input verbatim each turn so the next firing re-enters the skill and continues the loop. For autonomous /loop (no user prompt), pass the literal sentinel \`${AUTONOMOUS_LOOP_DYNAMIC_PROMPT}\` instead (the dynamic-pacing variant, not the CronCreate-mode \`${AUTONOMOUS_LOOP_PROMPT}\`). Required unless \`stop\` is true.`,
        ),
      stop: booleanSchema()
        .optional()
        .describe(
          "Set to true to end the dynamic loop immediately instead of scheduling another wakeup. When true, all other fields are ignored and no further wakeups fire.",
        ),
      noop: booleanSchema()
        .optional()
        .describe(
          "true = nothing changed (you checked and there is nothing to report). false = something happened worth keeping (edited a file, posted a message, advanced state, surfaced a finding). Consecutive noop:true ticks are collapsed in the user's terminal view and tracked as a streak. Required unless `stop` is true.",
        ),
    }),
  );
  scheduleWakeupInputSchema = DoctorLazy(() =>
    objectSchema({
      scheduledFor: numberSchema().describe("Epoch ms timestamp when the next wakeup will fire"),
      clampedDelaySeconds: numberSchema().describe("Actual delay used after clamping to runtime bounds"),
      wasClamped: booleanSchema().describe("True if the requested delaySeconds was outside [60, 3600]"),
      stopped: booleanSchema().optional().describe("True when the model ended the loop via `stop: true`"),
      cancelledWakeups: numberSchema()
        .optional()
        .describe(
          "How many pending dynamic-loop wakeups stop:true cancelled. 0 means nothing was pending \u2014 a recurring /loop cron is not cancelled by stop:true.",
        ),
    }),
  );
  ScheduleWakeupTool = buildTool({
    name: SCHEDULE_WAKEUP_TOOL_NAME,
    searchHint: `self-pace the dynamic /loop: pick a delay before the next tick, or stop/end/cancel the dynamic loop with stop:true (a fixed-interval /loop is a recurring cron \u2014 cancel it with ${CRON_DELETE_TOOL_NAME})`,
    backgrounding: "never",
    maxResultSizeChars: 1000,
    async description() {
      return SCHEDULE_WAKEUP_DESCRIPTION;
    },
    async prompt() {
      let replOneHour = isOneHourCacheTtl("repl_main_thread", {
        ignoreOverage: true,
      });
      let sdkOneHour = isOneHourCacheTtl("sdk", {
        ignoreOverage: true,
      });
      return scheduleWakeupPrompt(replOneHour === sdkOneHour ? replOneHour : undefined);
    },
    get inputSchema() {
      return ScheduleWakeupSchema();
    },
    get outputSchema() {
      return scheduleWakeupInputSchema();
    },
    userFacingName() {
      return "";
    },
    shouldDefer: false,
    toAutoClassifierInput(input) {
      if (input.stop === true) return "stop the /loop \u2014 cancel pending wakeups, schedule nothing";
      if (input.delaySeconds == null || input.prompt == null)
        return `malformed ${SCHEDULE_WAKEUP_TOOL_NAME} call missing delaySeconds/prompt \u2014 the tool will reject it`;
      return `wake in ${input.delaySeconds}s: ${input.prompt}`;
    },
    renderToolUseMessage() {
      return null;
    },
    create(caller) {
      let { permissions } = caller;
      return {
        async checkPermissions(updatedInput) {
          if (permissions().mode === "auto")
            return {
              behavior: "passthrough",
              message: "Scheduling a /loop wakeup requires classifier review.",
            };
          return {
            behavior: "allow",
            updatedInput,
          };
        },
        async call(input, { toolUseId }) {
          let { delaySeconds, reason, prompt, stop } = input;
          let message =
            stop !== true && isUnknownPluginSpawnedAgent(caller) ? UNKNOWN_PLUGIN_AGENT_NOTE : undefined;
          if (message !== undefined) {
            logForDebugging(`ScheduleWakeup refused: ${message}`);
            throw new ScheduleWakeupInputError(message);
          }
          if (stop === true)
            return {
              data: {
                scheduledFor: 0,
                clampedDelaySeconds: 0,
                wasClamped: false,
                stopped: true,
                cancelledWakeups: endLoopIfIdle(),
              },
            };
          if (delaySeconds === undefined || reason === undefined)
            throw new ScheduleWakeupInputError(
              "`delaySeconds` and `reason` are required when `stop` is not true.",
            );
          if (prompt === undefined)
            throw new ScheduleWakeupInputError("`prompt` is required when `stop` is not true.");
          let scheduleResult = scheduleLoopWakeup(delaySeconds, prompt, reason, toolUseId, caller);
          if (scheduleResult === null)
            return {
              data: {
                scheduledFor: 0,
                clampedDelaySeconds: 0,
                wasClamped: false,
              },
            };
          return {
            data: {
              scheduledFor: scheduleResult.scheduledFor,
              clampedDelaySeconds: scheduleResult.clampedDelaySeconds,
              wasClamped: scheduleResult.wasClamped,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(
      { scheduledFor, clampedDelaySeconds, wasClamped, stopped, cancelledWakeups },
      toolUseId,
    ) {
      let briefMode = isBriefEnabled();
      let endTurnInstruction = `Then ${loopOutcomeInstruction({
        briefMode,
      })} \u2014 and end the turn.`;
      if (stopped === true) {
        let stopInstruction = `If you armed a ${MONITOR} for this loop, ${TASKSTOP} it now. ${endTurnInstruction}`;
        if (cancelledWakeups === 0)
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: `Loop stopped \u2014 any dynamic loop in this session is ended; there was no pending wakeup to cancel. If you are running a fixed-interval /loop (a recurring cron), it is NOT stopped by this call \u2014 cancel it with ${CRON_DELETE_TOOL_NAME}. ${stopInstruction}`,
          };
        let cancelledText =
          cancelledWakeups === undefined
            ? "no further wakeups scheduled"
            : `cancelled ${cancelledWakeups} pending wakeup(s); no further dynamic-loop wakeups scheduled`;
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: `Loop stopped \u2014 ${cancelledText}. ${stopInstruction}`,
        };
      }
      if (scheduledFor === 0)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: `Wakeup not scheduled. The loop reached its maximum duration \u2014 the loop has ended; do not re-issue. ${endTurnInstruction}`,
        };
      let sliced = new Date(scheduledFor).toTimeString().slice(0, 8);
      let max = Math.max(0, Math.round((scheduledFor - Date.now()) / 1000));
      let clampNote = wasClamped ? ` (clamped to ${clampedDelaySeconds}s from your requested value)` : "";
      let updateInstruction = briefMode
        ? `send it now via ${BRIEF_TOOL_NAME} (\`status: 'proactive'\`) \u2014 plain response text is treated as unread in this session`
        : "write it now as ordinary response text";
      let mainLoopModel = getMainLoopModel();
      let nextStepText = needsFableMitigations(getCanonicalName(mainLoopModel), mainLoopModel)
        ? `When this call is your only tool call, the turn ends when it returns \u2014 there is no post-arm slot for a status update, so ${briefMode ? `send the per-tick update via ${BRIEF_TOOL_NAME} (\`status: 'proactive'\`)` : "write the per-tick update as ordinary response text"} immediately BEFORE calling ${SCHEDULE_WAKEUP_TOOL_NAME}. If you are reading this mid-turn, end the turn now \u2014 the harness re-invokes you when the wakeup fires or a task-notification arrives.`
        : `If you owe the user a status update this tick, ${updateInstruction}; then end the turn \u2014 the harness re-invokes you when the wakeup fires or a task-notification arrives.`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: `Next wakeup scheduled for ${sliced} (in ${max}s)${clampNote}. ${nextStepText}`,
      };
    },
  });
});
export { ScheduleWakeupTool };
