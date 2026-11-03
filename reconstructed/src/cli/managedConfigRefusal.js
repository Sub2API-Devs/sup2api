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
import { kt, T, o, oe, M } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParseRaw } from "../utils/slowOperations.js";
import { Xet } from "../utils/promptSource.js";
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

/**
 * 拒绝消息发送超时与首条用户消息 schema
 */
//@ chunk-y43msawm.js:959-1154 placement
var REFUSAL_SEND_TIMEOUT_MS = 1000,
  S = DoctorLazy(() =>
    kt({
      type: T("user"),
      initiator: o().optional(),
      origin: oe().optional(),
      isSynthetic: M().optional(),
      is_meta: M().optional(),
      seeded_summon: M().optional(),
      shouldQuery: M().optional(),
    }),
  );
/**
 * stdin 行是否为需要应答的用户消息
 */
//@ chunk-y43msawm.js:1154-1369 placement
function isPromptBearingUserLine(e) {
  try {
    let safeParse = S().safeParse(jsonParseRaw(e));
    return (
      safeParse.success &&
      Xet(safeParse.data.initiator) === void 0 &&
      !hasNonHumanOrigin(safeParse.data.origin, safeParse.data.isSynthetic) &&
      !safeParse.data.is_meta &&
      !safeParse.data.seeded_summon &&
      safeParse.data.shouldQuery !== !1
    );
  } catch {
    return !1;
  }
}
//@ chunk-y43msawm.js:1369-1607 placement = returnValue (0.8)
async function returnValue(e, r) {
  let a = (async () => {
    let s = "";
    for (;;) {
      let { done: d, value: n } = await e.next();
      if (d) return !1;
      if (
        ((s += n),
        !n.includes(`
`))
      )
        continue;
      let parts = s.split(`
`);
      if (((s = parts.pop() ?? ""), parts.some(isPromptBearingUserLine))) return !0;
    }
  })().catch(() => !1);
  return (await withDeadline(a, r)) ?? !1;
}
/**
 * stream-json 下把未启动的拒绝作为一回合发回
 */
//@ chunk-y43msawm.js:1607-2255 placement
async function sendStartupRefusalTurn(e, r = REFUSAL_SEND_TIMEOUT_MS) {
  if (
    getGatewayAuth()?.hostVerdict === void 0 ||
    !isDesktopNonClaudecode() ||
    isStartupFailureResultRequested() ||
    hostScheduledRun() ||
    eagerParseCliFlag("--input-format") !== "stream-json" ||
    eagerHasCliFlag("--no-session-persistence") ||
    env.CLAUDE_BRIDGE_REATTACH_SESSION !== void 0 ||
    !(await returnValue(adoptStdinStream() ?? readStreamJsonStdin(), r))
  )
    return !1;
  let a = startupResultSessionId(getSessionId()),
    s = `Claude Code didn't start. ${e.replace(/\s+/g, " ").replace(/(?:[a-z][a-z\d+.-]*:\/\/|www\.|[\w.+-]+@)[^\s<`]*[^\s<`.,;:)]|[\\`*_[\]<]/gi, (l) => (l.length > 1 ? `\`${l}\`` : l === "<" ? "&lt;" : `\\${l}`))}`,
    { errors: errors, ...n } = emitLoadError(a, []);
  return writeStartupFrames([
    {
      type: "assistant",
      message: createAssistantMessage({ content: s }).message,
      parent_tool_use_id: null,
      session_id: a,
      uuid: randomUUID(),
    },
    { ...n, subtype: "success", is_error: !1, result: s, terminal_reason: "turn_setup_failed" },
  ]);
}
//@ chunk-y43msawm.js:2255-2266 placement
var f = 2000;
//@ chunk-y43msawm.js:2266-2405 placement
async function sendManagedSettingsRefusal(e) {
  try {
    if ((logManagedSettingsRefused(e), isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy()))
      await flushRefusalTelemetry();
  } catch {
    logForDebugging("[3P telemetry] managed-settings refusal send failed", { level: "error" });
  }
}
//@ chunk-y43msawm.js:2405-2553 placement
async function sendOrgValidationRefusal(e) {
  if (e.policyUnreadable) await sendManagedSettingsRefusal("policy_invalid");
  else if (e.reason === "provider_not_allowed") await sendManagedSettingsRefusal("provider_not_allowed");
}
//@ chunk-y43msawm.js:2553-2614 placement
function recordManagedSettingsRefusal(e) {
  if (
    (logManagedSettingsRefused(e),
    getEventLogger() === null && (isOtlpLogsConfigured() || isOtlpLogsConfiguredByPolicy()))
  )
    registerCleanup(flushRefusalTelemetry);
}
/**
 * 导出托管设置拒绝的 3P 遥测
 */
//@ chunk-y43msawm.js:2614-2890 placement
async function flushRefusalTelemetry() {
  try {
    if (getEventLogger() === null) {
      if (!checkHasTrustDialogAccepted() && !getIsNonInteractiveSession()) return;
      (applySafeConfigEnvironmentVariables(), await Promise.race([initializeTelemetryForExit(), sleep(f)]));
    }
    let e = getLoggerProvider();
    if (e) await Promise.race([eventRecordQueue.settledWithin(f / 2).then(() => e.forceFlush()), sleep(f)]);
  } catch {
    logForDebugging("[3P telemetry] managed-settings refusal export failed", { level: "error" });
  }
}
/**
 * 托管配置拒绝时退出：stream-json 下作为一回合回复，记 3P 遥测。
 */
//@ chunk-y43msawm.js:2890-3200 placement
async function exitRefusingManagedConfig({
  message: message,
  reason: reason,
  errorType: errorType,
  print: print,
  beforeExit: beforeExit,
}) {
  if (print === void 0) printCliError(message);
  else await print(message);
  if (errorType !== void 0) await sendManagedSettingsRefusal(errorType);
  let n = await sendStartupRefusalTurn(message);
  if (!n) await writeStartupFailureResult({ sessionId: getSessionId(), message: message, reason: reason });
  return (
    await beforeExit?.(),
    await emitManagedConfigReadyAtExit(),
    await flushAnalyticsBeforeExit(),
    n ? cliExit(0) : cliError(void 0, print === void 0 ? "cli_error" : "exit_with_message")
  );
}

export {
  sendManagedSettingsRefusal,
  sendOrgValidationRefusal,
  recordManagedSettingsRefusal,
  exitRefusingManagedConfig,
};
