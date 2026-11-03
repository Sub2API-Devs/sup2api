/**
 * tools/ScheduleWakeupTool/ScheduleWakeupTool.ts
 *
 * 2.1.316 新增：ScheduleWakeup 工具 schema（延迟、原因、停止）与实现。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (2)
 * attribution: placement 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, E, o, M, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import {
  g$e,
  Krt,
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

//@ chunk-kxyd0g16.js:33507-33592 placement
class ScheduleWakeupInputError extends Error {
  constructor(e) {
    super(e);
    this.name = "ScheduleWakeupInputError";
  }
}
/**
 * ScheduleWakeup 工具 schema（延迟、原因、停止）与实现。
 */
//@ chunk-kxyd0g16.js:33592-39121 placement
var ScheduleWakeupSchema = DoctorLazy(() =>
    zodStrictObject({
      delaySeconds: coercedNumberSchema(E())
        .optional()
        .describe(
          "Seconds from now to wake up. Clamped to [60, 3600] by the runtime. Required unless `stop` is true.",
        ),
      reason: o()
        .optional()
        .describe(
          "One short sentence explaining the chosen delay. Goes to telemetry and is shown to the user. Be specific. Required unless `stop` is true.",
        ),
      prompt: o()
        .optional()
        .describe(
          `The /loop input to fire on wake-up. Pass the same /loop input verbatim each turn so the next firing re-enters the skill and continues the loop. For autonomous /loop (no user prompt), pass the literal sentinel \`${g$e}\` instead (the dynamic-pacing variant, not the CronCreate-mode \`${Krt}\`). Required unless \`stop\` is true.`,
        ),
      stop: M()
        .optional()
        .describe(
          "Set to true to end the dynamic loop immediately instead of scheduling another wakeup. When true, all other fields are ignored and no further wakeups fire.",
        ),
      noop: M()
        .optional()
        .describe(
          "true = nothing changed (you checked and there is nothing to report). false = something happened worth keeping (edited a file, posted a message, advanced state, surfaced a finding). Consecutive noop:true ticks are collapsed in the user's terminal view and tracked as a streak. Required unless `stop` is true.",
        ),
    }),
  ),
  ps = DoctorLazy(() =>
    u({
      scheduledFor: E().describe("Epoch ms timestamp when the next wakeup will fire"),
      clampedDelaySeconds: E().describe("Actual delay used after clamping to runtime bounds"),
      wasClamped: M().describe("True if the requested delaySeconds was outside [60, 3600]"),
      stopped: M().optional().describe("True when the model ended the loop via `stop: true`"),
      cancelledWakeups: E()
        .optional()
        .describe(
          "How many pending dynamic-loop wakeups stop:true cancelled. 0 means nothing was pending \u2014 a recurring /loop cron is not cancelled by stop:true.",
        ),
    }),
  ),
  ho = buildTool({
    name: SCHEDULE_WAKEUP_TOOL_NAME,
    searchHint: `self-pace the dynamic /loop: pick a delay before the next tick, or stop/end/cancel the dynamic loop with stop:true (a fixed-interval /loop is a recurring cron \u2014 cancel it with ${CRON_DELETE_TOOL_NAME})`,
    backgrounding: "never",
    maxResultSizeChars: 1000,
    async description() {
      return SCHEDULE_WAKEUP_DESCRIPTION;
    },
    async prompt() {
      let e = isOneHourCacheTtl("repl_main_thread", { ignoreOverage: !0 }),
        r = isOneHourCacheTtl("sdk", { ignoreOverage: !0 });
      return scheduleWakeupPrompt(e === r ? e : void 0);
    },
    get inputSchema() {
      return ScheduleWakeupSchema();
    },
    get outputSchema() {
      return ps();
    },
    userFacingName() {
      return "";
    },
    shouldDefer: !1,
    toAutoClassifierInput(e) {
      if (e.stop === !0) return "stop the /loop \u2014 cancel pending wakeups, schedule nothing";
      if (e.delaySeconds == null || e.prompt == null)
        return `malformed ${SCHEDULE_WAKEUP_TOOL_NAME} call missing delaySeconds/prompt \u2014 the tool will reject it`;
      return `wake in ${e.delaySeconds}s: ${e.prompt}`;
    },
    renderToolUseMessage() {
      return null;
    },
    create(e) {
      let { permissions: permissions } = e;
      return {
        async checkPermissions(n) {
          if (permissions().mode === "auto")
            return {
              behavior: "passthrough",
              message: "Scheduling a /loop wakeup requires classifier review.",
            };
          return { behavior: "allow", updatedInput: n };
        },
        async call(n, { toolUseId: s }) {
          let { delaySeconds: delaySeconds, reason: reason, prompt: prompt, stop: stop, noop: noop } = n,
            S = stop !== !0 && isUnknownPluginSpawnedAgent(e) ? UNKNOWN_PLUGIN_AGENT_NOTE : void 0;
          if (S !== void 0)
            throw (logForDebugging(`ScheduleWakeup refused: ${S}`), new ScheduleWakeupInputError(S));
          if (stop === !0)
            return {
              data: {
                scheduledFor: 0,
                clampedDelaySeconds: 0,
                wasClamped: !1,
                stopped: !0,
                cancelledWakeups: endLoopIfIdle(),
              },
            };
          if (delaySeconds === void 0 || reason === void 0)
            throw new ScheduleWakeupInputError(
              "`delaySeconds` and `reason` are required when `stop` is not true.",
            );
          if (prompt === void 0)
            throw new ScheduleWakeupInputError("`prompt` is required when `stop` is not true.");
          if (noop === void 0)
            throw new ScheduleWakeupInputError("`noop` is required when `stop` is not true.");
          let R = scheduleLoopWakeup(delaySeconds, prompt, reason, s, e);
          if (R === null) return { data: { scheduledFor: 0, clampedDelaySeconds: 0, wasClamped: !1 } };
          return {
            data: {
              scheduledFor: R.scheduledFor,
              clampedDelaySeconds: R.clampedDelaySeconds,
              wasClamped: R.wasClamped,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(
      { scheduledFor: e, clampedDelaySeconds: r, wasClamped: n, stopped: s, cancelledWakeups: f },
      h,
    ) {
      let y = isBriefEnabled(),
        k = `Then ${loopOutcomeInstruction({ briefMode: y })} \u2014 and end the turn.`;
      if (s === !0) {
        let B = `If you armed a ${MONITOR} for this loop, ${TASKSTOP} it now. ${k}`;
        if (f === 0)
          return {
            tool_use_id: h,
            type: "tool_result",
            content: `Loop stopped \u2014 any dynamic loop in this session is ended; there was no pending wakeup to cancel. If you are running a fixed-interval /loop (a recurring cron), it is NOT stopped by this call \u2014 cancel it with ${CRON_DELETE_TOOL_NAME}. ${B}`,
          };
        let V =
          f === void 0
            ? "no further wakeups scheduled"
            : `cancelled ${f} pending wakeup(s); no further dynamic-loop wakeups scheduled`;
        return { tool_use_id: h, type: "tool_result", content: `Loop stopped \u2014 ${V}. ${B}` };
      }
      if (e === 0)
        return {
          tool_use_id: h,
          type: "tool_result",
          content: `Wakeup not scheduled. The loop reached its maximum duration \u2014 the loop has ended; do not re-issue. ${k}`,
        };
      let sliced = new Date(e).toTimeString().slice(0, 8),
        max = Math.max(0, Math.round((e - Date.now()) / 1000)),
        R = n ? ` (clamped to ${r}s from your requested value)` : "",
        I = y
          ? `send it now via ${BRIEF_TOOL_NAME} (\`status: 'proactive'\`) \u2014 plain response text is treated as unread in this session`
          : "write it now as ordinary response text",
        j = getMainLoopModel(),
        x = needsFableMitigations(getCanonicalName(j), j)
          ? `When this call is your only tool call, the turn ends when it returns \u2014 there is no post-arm slot for a status update, so ${y ? `send the per-tick update via ${BRIEF_TOOL_NAME} (\`status: 'proactive'\`)` : "write the per-tick update as ordinary response text"} immediately BEFORE calling ${SCHEDULE_WAKEUP_TOOL_NAME}. If you are reading this mid-turn, end the turn now \u2014 the harness re-invokes you when the wakeup fires or a task-notification arrives.`
          : `If you owe the user a status update this tick, ${I}; then end the turn \u2014 the harness re-invokes you when the wakeup fires or a task-notification arrives.`;
      return {
        tool_use_id: h,
        type: "tool_result",
        content: `Next wakeup scheduled for ${sliced} (in ${max}s)${R}. ${x}`,
      };
    },
  });

export { ho };
