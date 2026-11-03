/**
 * cli/managedConfigRefusal.ts
 *
 * 2.1.316 新增。托管配置拒绝时退出：stream-json 下作为一回合回复，记 3P 遥测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y43msawm.js (10)
 * attribution: placement 10
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "./handlers/util.js";
import { looseObject, literal, string, unknown, M } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParseRaw } from "../utils/slowOperations.js";
import { originKindForWakeup } from "../utils/promptSource.js";
import { hasNonHumanOrigin } from "../utils/messageProvenance.js";
import { withDeadline, sleep } from "../utils/sleep.js";
import {
  getGatewayAuth,
  getSessionId,
  getEventLogger,
  getIsNonInteractiveSession,
  getLoggerProvider,
} from "../bootstrap/state.js";
import { isDesktopNonClaudecode } from "../utils/entrypointKinds.js";
import {
  isStartupFailureResultRequested,
  startupResultSessionId,
  writeStartupFrames,
  writeStartupFailureResult,
} from "./startupFailureResult.js";
import { hostScheduledRun } from "../utils/sessionShape.js";
import { eagerParseCliFlag, eagerHasCliFlag } from "../utils/cliArgs.js";
import { env } from "../utils/env.js";
import { adoptStdinStream, readStreamJsonStdin } from "./startup/awaitInitialize.js";
import { emitLoadError } from "./print.js";
import { createAssistantMessage } from "../utils/messages.js";
import { logManagedSettingsRefused } from "../services/remoteManagedSettings/managedSettingsTelemetry.js";
import {
  isOtlpLogsConfigured,
  isOtlpLogsConfiguredByPolicy,
  initializeTelemetryForExit,
} from "../entrypoints/init.js";
import { logForDebugging } from "../utils/debug.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { checkHasTrustDialogAccepted } from "../utils/config.js";
import { applySafeConfigEnvironmentVariables } from "../utils/managedEnvApply.js";
import { eventRecordQueue } from "../utils/telemetry/thirdPartyEventRecords.js";
import { printCliError, flushAnalyticsBeforeExit, cliExit, cliError } from "./exit.js";
import { emitManagedConfigReadyAtExit } from "../services/policyLimits/startupGate.js";

//@ chunk-y43msawm.js:959-1154 placement
/**
 * 拒绝消息发送超时与首条用户消息 schema
 */
var REFUSAL_SEND_TIMEOUT_MS = 1000;
var userMessageLineSchema = DoctorLazy(() =>
  looseObject({
    type: literal("user"),
    initiator: string().optional(),
    origin: unknown().optional(),
    isSynthetic: M().optional(),
    is_meta: M().optional(),
    seeded_summon: M().optional(),
    shouldQuery: M().optional(),
  }),
);
//@ chunk-y43msawm.js:1154-1369 placement
/**
 * stdin 行是否为需要应答的用户消息
 */
function isPromptBearingUserLine(e) {
  try {
    let r = userMessageLineSchema().safeParse(jsonParseRaw(e));
    return (
      r.success &&
      originKindForWakeup(r.data.initiator) === undefined &&
      !hasNonHumanOrigin(r.data.origin, r.data.isSynthetic) &&
      !r.data.is_meta &&
      !r.data.seeded_summon &&
      r.data.shouldQuery !== false
    );
  } catch {
    return false;
  }
}
//@ chunk-y43msawm.js:1369-1607 placement = returnValue (0.8)
async function returnValue(e, r) {
  let a = (async () => {
    let s = "";
    for (;;) {
      let { done: d, value: n } = await e.next();
      if (d) return false;
      s += n;
      if (
        !n.includes(`
`)
      )
        continue;
      let lines = s.split(`
`);
      s = lines.pop() ?? "";
      if (lines.some(isPromptBearingUserLine)) return true;
    }
  })().catch(() => false);
  return (await withDeadline(a, r)) ?? false;
}
//@ chunk-y43msawm.js:1607-2255 placement
/**
 * stream-json 下把未启动的拒绝作为一回合发回
 */
async function sendStartupRefusalTurn(message, r = REFUSAL_SEND_TIMEOUT_MS) {
  if (
    getGatewayAuth()?.hostVerdict === undefined ||
    !isDesktopNonClaudecode() ||
    isStartupFailureResultRequested() ||
    hostScheduledRun() ||
    eagerParseCliFlag("--input-format") !== "stream-json" ||
    eagerHasCliFlag("--no-session-persistence") ||
    env.CLAUDE_BRIDGE_REATTACH_SESSION !== undefined ||
    !(await returnValue(adoptStdinStream() ?? readStreamJsonStdin(), r))
  )
    return false;
  let a = startupResultSessionId(getSessionId());
  let s = `Claude Code didn't start. ${message.replace(/\s+/g, " ").replace(/(?:[a-z][a-z\d+.-]*:\/\/|www\.|[\w.+-]+@)[^\s<`]*[^\s<`.,;:)]|[\\`*_[\]<]/gi, (l) => (l.length > 1 ? `\`${l}\`` : l === "<" ? "&lt;" : `\\${l}`))}`;
  let { errors, ...n } = emitLoadError(a, []);
  return writeStartupFrames([
    {
      type: "assistant",
      message: createAssistantMessage({
        content: s,
      }).message,
      parent_tool_use_id: null,
      session_id: a,
      uuid: randomUUID(),
    },
    {
      ...n,
      subtype: "success",
      is_error: false,
      result: s,
      terminal_reason: "turn_setup_failed",
    },
  ]);
}
//@ chunk-y43msawm.js:2255-2266 placement
var REFUSAL_FLUSH_TIMEOUT_MS = 2000;
//@ chunk-y43msawm.js:2266-2405 placement
async function sendManagedSettingsRefusal(e) {
  try {
    logManagedSettingsRefused(e);
    if (isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy()) await flushRefusalTelemetry();
  } catch {
    logForDebugging("[3P telemetry] managed-settings refusal send failed", {
      level: "error",
    });
  }
}
//@ chunk-y43msawm.js:2405-2553 placement
async function sendOrgValidationRefusal(e) {
  if (e.policyUnreadable) await sendManagedSettingsRefusal("policy_invalid");
  else if (e.reason === "provider_not_allowed") await sendManagedSettingsRefusal("provider_not_allowed");
}
//@ chunk-y43msawm.js:2553-2614 placement
function recordManagedSettingsRefusal(e) {
  logManagedSettingsRefused(e);
  if (getEventLogger() === null && (isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy()))
    registerCleanup(flushRefusalTelemetry);
}
//@ chunk-y43msawm.js:2614-2890 placement
/**
 * 导出托管设置拒绝的 3P 遥测
 */
async function flushRefusalTelemetry() {
  try {
    if (getEventLogger() === null) {
      if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) return;
      applySafeConfigEnvironmentVariables();
      await Promise.race([initializeTelemetryForExit(), sleep(REFUSAL_FLUSH_TIMEOUT_MS)]);
    }
    let loggerProvider = getLoggerProvider();
    if (loggerProvider)
      await Promise.race([
        eventRecordQueue.settledWithin(REFUSAL_FLUSH_TIMEOUT_MS / 2).then(() => loggerProvider.forceFlush()),
        sleep(REFUSAL_FLUSH_TIMEOUT_MS),
      ]);
  } catch {
    logForDebugging("[3P telemetry] managed-settings refusal export failed", {
      level: "error",
    });
  }
}
//@ chunk-y43msawm.js:2890-3200 placement
/**
 * 托管配置拒绝时退出：stream-json 下作为一回合回复，记 3P 遥测。
 */
async function exitRefusingManagedConfig({ message, reason, errorType, print, beforeExit }) {
  if (print === undefined) printCliError(message);
  else await print(message);
  if (errorType !== undefined) await sendManagedSettingsRefusal(errorType);
  let n = await sendStartupRefusalTurn(message);
  if (!n)
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message,
      reason,
    });
  await beforeExit?.();
  await emitManagedConfigReadyAtExit();
  await flushAnalyticsBeforeExit();
  return n ? cliExit(0) : cliError(undefined, print === undefined ? "cli_error" : "exit_with_message");
}
export {
  sendManagedSettingsRefusal,
  sendOrgValidationRefusal,
  recordManagedSettingsRefusal,
  exitRefusingManagedConfig,
};
