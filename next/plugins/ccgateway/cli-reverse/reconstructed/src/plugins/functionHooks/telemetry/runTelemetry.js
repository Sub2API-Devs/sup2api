/**
 * plugins/functionHooks/telemetry/runTelemetry.ts
 *
 * plugin_function_hooks_run 遥测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity } from "../../../utils/identity.js";
import { loadedModuleArgs } from "../../hooksModules/loadedModuleFilters.js";
import { isHookEvent } from "../hookApiSurface.js";
import { fromEnum, lit } from "../../../services/analytics/safeMetadata.js";
import { isRemoteManagedEnvironment } from "../../../utils/remoteEnvironment.js";
import { classifyPluginOrigin } from "../panes.js";
import { FAILED_CLOSED } from "../dispatch/chain.js";
import { logFeatureSad } from "../../../services/analytics/featureTelemetry.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:544837-544871 placement
/**
 * 运行失败节流表
 */
var runFailureThrottle; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:544837", () => {
  runFailureThrottle = identity(new Map(), (map) => map.clear());
});
//@ chunk-7jxyna5q.js:544871-544905 placement
/**
 * 被压制计数
 */
var runFailureSuppressed; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:544871", () => {
  runFailureSuppressed = identity(new Map(), (map) => map.clear());
});
//@ chunk-7jxyna5q.js:544905-544918 placement
/**
 * 60000
 */
var RUN_FAILURE_THROTTLE_MS = 60000;
//@ chunk-7jxyna5q.js:544918-544979 placement
/**
 * 取未过期的节流项
 */
function freshThrottleEntry(entry, now) {
  return entry !== undefined && now - entry.openedAt < RUN_FAILURE_THROTTLE_MS ? entry : undefined;
}
//@ chunk-7jxyna5q.js:544979-545410 placement
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
//@ chunk-7jxyna5q.js:545410-545470 placement
var FAILURE_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:545410", () => {
  FAILURE_KINDS = Object.freeze(["threw", "budget", "shape", "lingered"]);
});
//@ chunk-7jxyna5q.js:545470-545504 placement
/**
 * engine.create 错误表
 */
var engineCreateErrors; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:545470", () => {
  engineCreateErrors = identity(new Map(), (map) => map.clear());
});
//@ chunk-7jxyna5q.js:545504-545831 placement
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
