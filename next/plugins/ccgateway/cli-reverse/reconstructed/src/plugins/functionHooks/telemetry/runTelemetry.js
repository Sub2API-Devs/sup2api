/**
 * plugins/functionHooks/telemetry/runTelemetry.ts
 *
 * plugin_function_hooks_run 遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import { identity as identity_2 } from "../../../utils/identity.js";
import { loadedModuleArgs } from "../../hooksModules/loadedModuleFilters.js";
import { isHookEvent } from "../hookApiSurface.js";
import { fromEnum, lit } from "../../../services/analytics/safeMetadata.js";
import { isRemoteManagedEnvironment } from "../../../utils/remoteEnvironment.js";
import { classifyPluginOrigin } from "../panes.js";
import { FAILED_CLOSED } from "../dispatch/chain.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:623314-623348 placement
/**
 * 运行失败节流表
 */
var runFailureThrottle; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:623314", () => {
  runFailureThrottle = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-s61vbvea.js:623348-623382 placement
/**
 * 被压制计数
 */
var runFailureSuppressed; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:623348", () => {
  runFailureSuppressed = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-s61vbvea.js:623382-623395 placement
/**
 * 60000
 */
var RUN_FAILURE_THROTTLE_MS = 60000;
//@ chunk-s61vbvea.js:623395-623456 placement
/**
 * 取未过期的节流项
 */
function freshThrottleEntry(entry, now) {
  return entry !== undefined && now - entry.openedAt < RUN_FAILURE_THROTTLE_MS ? entry : undefined;
}
//@ chunk-s61vbvea.js:623456-623887 placement
/**
 * 钩子运行失败遥测的节流：同一插件同一原因一分钟内只上报一次（记录被压制次数），返回遥测字段或 undefined。
 */
function throttledRunTelemetry({ subject, event, reason }, originOf) {
  let subjectKey = `${subject} ${reason}`;
  let startTime = performance.now();
  let suppressionKey = runFailureThrottle.get(subjectKey) ?? "";
  let isSuppressionFresh =
    freshThrottleEntry(runFailureSuppressed.get(suppressionKey), startTime) !== undefined;
  let moduleInfo = isSuppressionFresh ? undefined : loadedModuleArgs(originOf());
  let nextKey = isSuppressionFresh ? suppressionKey : `${moduleInfo?.pluginStorageId ?? ""} ${reason}`;
  let suppressed = runFailureSuppressed.get(nextKey);
  let freshEntry = freshThrottleEntry(suppressed, startTime);
  let isSuppressed = freshEntry !== undefined;
  runFailureSuppressed.set(
    nextKey,
    isSuppressed
      ? {
          ...freshEntry,
          held: freshEntry.held + 1,
        }
      : {
          openedAt: startTime,
          held: 0,
        },
  );
  runFailureThrottle.set(subjectKey, nextKey);
  return isSuppressed
    ? undefined
    : {
        hook_event: isHookEvent(event) ? fromEnum(event) : lit("other"),
        is_hosted: isRemoteManagedEnvironment(),
        suppressed: suppressed?.held ?? 0,
        ...(moduleInfo && {
          plugin_id_hash: classifyPluginOrigin(moduleInfo).plugin_id_hash,
          tier: fromEnum(moduleInfo.tier),
        }),
      };
}
//@ chunk-s61vbvea.js:623887-623947 placement
var FAILURE_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:623887", () => {
  FAILURE_KINDS = Object.freeze(["threw", "budget", "shape", "lingered"]);
});
//@ chunk-s61vbvea.js:623947-623981 placement
/**
 * engine.create 错误表
 */
var engineCreateErrors; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:623947", () => {
  engineCreateErrors = identity_2(new Map(), (map) => map.clear());
});
//@ chunk-s61vbvea.js:623981-624308 placement
/**
 * 上报 plugin_function_hooks_run（含 engine.create 捕获的错误）
 */
function logFunctionHooksRun({ plugin, event, effect, skip }) {
  if (skip?.refusedSubject !== undefined) engineCreateErrors.set(skip.refusedSubject, plugin);
  let reason =
    skip === undefined && effect === FAILED_CLOSED
      ? "caught"
      : FAILURE_KINDS.find((kind) => kind === skip?.kind);
  if (reason === undefined || skip?.isCallRejected === true || event === "engine.create") return;
  let fields = throttledRunTelemetry(
    {
      subject: plugin,
      event,
      reason,
    },
    () => plugin,
  );
  if (fields !== undefined) logFeatureSad("plugin_function_hooks_run", reason, fields);
}
export { logFunctionHooksRun, throttledRunTelemetry, engineCreateErrors };
