/**
 * cli/managedConfigRefusal.ts
 *
 * 2.1.316 新增。托管配置拒绝时退出：stream-json 下作为一回合回复，记 3P 遥测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3pjeap7v.js (10)
 * attribution: placement 10
 */
import { randomUUID } from "crypto";
import { DoctorLazy } from "./handlers/util.js";
import {
  looseObject,
  literal,
  stringSchema,
  unknown,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3pjeap7v.js:960-1155 placement
/**
 * 拒绝消息发送超时与首条用户消息 schema
 */
var REFUSAL_SEND_TIMEOUT_MS; // deferred: uses DoctorLazy (./handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var userMessageLineSchema;
deferInit("chunk-3pjeap7v.js:960", () => {
  REFUSAL_SEND_TIMEOUT_MS = 1000;
  userMessageLineSchema = DoctorLazy(() =>
    looseObject({
      type: literal("user"),
      initiator: stringSchema().optional(),
      origin: unknown().optional(),
      isSynthetic: booleanSchema().optional(),
      is_meta: booleanSchema().optional(),
      seeded_summon: booleanSchema().optional(),
      shouldQuery: booleanSchema().optional(),
    }),
  );
});
//@ chunk-3pjeap7v.js:1155-1370 placement
/**
 * stdin 行是否为需要应答的用户消息
 */
function isPromptBearingUserLine(line) {
  try {
    let parsed = userMessageLineSchema().safeParse(jsonParseRaw(line));
    return (
      parsed.success &&
      originKindForWakeup(parsed.data.initiator) === undefined &&
      !hasNonHumanOrigin(parsed.data.origin, parsed.data.isSynthetic) &&
      !parsed.data.is_meta &&
      !parsed.data.seeded_summon &&
      parsed.data.shouldQuery !== false
    );
  } catch {
    return false;
  }
}
//@ chunk-3pjeap7v.js:1370-1608 placement (2.1.88 match: returnValue, 0.801)
async function returnValue(stream, timeoutMs) {
  let pending = (async () => {
    let buffer = "";
    for (;;) {
      let { done, value: chunk } = await stream.next();
      if (done) return false;
      buffer += chunk;
      if (
        !chunk.includes(`
`)
      )
        continue;
      let lines = buffer.split(`
`);
      buffer = lines.pop() ?? "";
      if (lines.some(isPromptBearingUserLine)) return true;
    }
  })().catch(() => false);
  return (await withDeadline(pending, timeoutMs)) ?? false;
}
//@ chunk-3pjeap7v.js:1608-2257 placement
/**
 * stream-json 下把未启动的拒绝作为一回合发回
 */
async function sendStartupRefusalTurn(message, lines = REFUSAL_SEND_TIMEOUT_MS) {
  if (
    getGatewayAuth()?.hostVerdict === undefined ||
    !isDesktopNonClaudecode() ||
    isStartupFailureResultRequested() ||
    hostScheduledRun() ||
    eagerParseCliFlag("--input-format") !== "stream-json" ||
    eagerHasCliFlag("--no-session-persistence") ||
    env.CLAUDE_BRIDGE_REATTACH_SESSION !== undefined ||
    !(await returnValue(adoptStdinStream() ?? readStreamJsonStdin(), lines))
  )
    return false;
  let sessionId = startupResultSessionId(getSessionId());
  let text = `Claude Code didn't start. ${message.replace(/\s+/g, " ").replace(/(?:[a-z][a-z\d+.-]*:\/\/|www\.|[\w.+-]+@)[^\s<`]*[^\s<`.,;:)]|[\\`*_[\]<]/gi, (char) => (char.length > 1 ? `\`${char}\`` : char === "<" ? "&lt;" : `\\${char}`))}`;
  let { errors, ...errorList } = emitLoadError(sessionId, []);
  return writeStartupFrames([
    {
      type: "assistant",
      message: createAssistantMessage({
        content: text,
      }).message,
      parent_tool_use_id: null,
      session_id: sessionId,
      uuid: randomUUID(),
    },
    {
      ...errorList,
      subtype: "success",
      is_error: false,
      result: text,
      terminal_reason: "turn_setup_failed",
    },
  ]);
}
//@ chunk-3pjeap7v.js:2257-2268 placement
var REFUSAL_FLUSH_TIMEOUT_MS = 2000;
//@ chunk-3pjeap7v.js:2268-2407 placement
async function sendManagedSettingsRefusal(reason) {
  try {
    logManagedSettingsRefused(reason);
    if (isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy()) await flushRefusalTelemetry();
  } catch {
    logForDebugging("[3P telemetry] managed-settings refusal send failed", {
      level: "error",
    });
  }
}
//@ chunk-3pjeap7v.js:2407-2555 placement
async function sendOrgValidationRefusal(refusal) {
  if (refusal.policyUnreadable) await sendManagedSettingsRefusal("policy_invalid");
  else if (refusal.reason === "provider_not_allowed")
    await sendManagedSettingsRefusal("provider_not_allowed");
}
//@ chunk-3pjeap7v.js:2555-2616 placement
function recordManagedSettingsRefusal(reason) {
  logManagedSettingsRefused(reason);
  if (getEventLogger() === null && (isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy()))
    registerCleanup(flushRefusalTelemetry);
}
//@ chunk-3pjeap7v.js:2616-2892 placement
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
//@ chunk-3pjeap7v.js:2892-3202 placement
/**
 * 托管配置拒绝时退出：stream-json 下作为一回合回复，记 3P 遥测。
 */
async function exitRefusingManagedConfig({ message, reason, errorType, print, beforeExit }) {
  if (print === undefined) printCliError(message);
  else await print(message);
  if (errorType !== undefined) await sendManagedSettingsRefusal(errorType);
  let getResult = await sendStartupRefusalTurn(message);
  if (!getResult)
    await writeStartupFailureResult({
      sessionId: getSessionId(),
      message,
      reason,
    });
  await beforeExit?.();
  await emitManagedConfigReadyAtExit();
  await flushAnalyticsBeforeExit();
  return getResult
    ? cliExit(0)
    : cliError(undefined, print === undefined ? "cli_error" : "exit_with_message");
}
export {
  sendOrgValidationRefusal,
  recordManagedSettingsRefusal,
  sendManagedSettingsRefusal,
  exitRefusingManagedConfig,
};
