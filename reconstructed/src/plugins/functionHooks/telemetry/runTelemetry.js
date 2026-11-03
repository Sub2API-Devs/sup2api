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

//@ chunk-s61vbvea.js:623314-623348 placement
/**
 * 运行失败节流表
 */
var runFailureThrottle = identity_2(new Map(), (e) => e.clear());
//@ chunk-s61vbvea.js:623348-623382 placement
/**
 * 被压制计数
 */
var runFailureSuppressed = identity_2(new Map(), (e) => e.clear());
//@ chunk-s61vbvea.js:623382-623395 placement
/**
 * 60000
 */
var RUN_FAILURE_THROTTLE_MS = 60000;
//@ chunk-s61vbvea.js:623395-623456 placement
/**
 * 取未过期的节流项
 */
function freshThrottleEntry(e, n) {
  return e !== undefined && n - e.openedAt < RUN_FAILURE_THROTTLE_MS ? e : undefined;
}
//@ chunk-s61vbvea.js:623456-623887 placement
/**
 * 钩子运行失败遥测的节流：同一插件同一原因一分钟内只上报一次（记录被压制次数），返回遥测字段或 undefined。
 */
function throttledRunTelemetry({ subject, event, reason }, s) {
  let h = `${subject} ${reason}`;
  let startTime = performance.now();
  let S = runFailureThrottle.get(h) ?? "";
  let w = freshThrottleEntry(runFailureSuppressed.get(S), startTime) !== undefined;
  let R = w ? undefined : loadedModuleArgs(s());
  let x = w ? S : `${R?.pluginStorageId ?? ""} ${reason}`;
  let P = runFailureSuppressed.get(x);
  let j = freshThrottleEntry(P, startTime);
  let G = j !== undefined;
  runFailureSuppressed.set(
    x,
    G
      ? {
          ...j,
          held: j.held + 1,
        }
      : {
          openedAt: startTime,
          held: 0,
        },
  );
  runFailureThrottle.set(h, x);
  return G
    ? undefined
    : {
        hook_event: isHookEvent(event) ? fromEnum(event) : lit("other"),
        is_hosted: isRemoteManagedEnvironment(),
        suppressed: P?.held ?? 0,
        ...(R && {
          plugin_id_hash: classifyPluginOrigin(R).plugin_id_hash,
          tier: fromEnum(R.tier),
        }),
      };
}
//@ chunk-s61vbvea.js:623887-623947 placement
var GE = Object.freeze(["threw", "budget", "shape", "lingered"]);
//@ chunk-s61vbvea.js:623947-623981 placement
/**
 * engine.create 错误表
 */
var engineCreateErrors = identity_2(new Map(), (e) => e.clear());
//@ chunk-s61vbvea.js:623981-624308 placement
/**
 * 上报 plugin_function_hooks_run（含 engine.create 捕获的错误）
 */
function logFunctionHooksRun({ plugin, event, effect, skip }) {
  if (skip?.refusedSubject !== undefined) engineCreateErrors.set(skip.refusedSubject, plugin);
  let y = skip === undefined && effect === FAILED_CLOSED ? "caught" : GE.find((R) => R === skip?.kind);
  if (y === undefined || skip?.isCallRejected === true || event === "engine.create") return;
  let w = throttledRunTelemetry(
    {
      subject: plugin,
      event,
      reason: y,
    },
    () => plugin,
  );
  if (w !== undefined) logFeatureSad("plugin_function_hooks_run", y, w);
}
export { logFunctionHooksRun, throttledRunTelemetry, engineCreateErrors };
