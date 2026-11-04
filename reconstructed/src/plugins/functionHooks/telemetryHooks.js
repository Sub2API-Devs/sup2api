/**
 * plugins/functionHooks/telemetryHooks.ts
 *
 * 2.1.316 新增：telemetry.log 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { otelLogRecord, emitOrBufferOtelEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { toArrayLike, safeDate } from "./skillPromptHooks.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { makeCoreEvent } from "./coreHandlers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:77514-77532 placement
/**
 * 发送器模块命名空间
 */
var senderModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:77514", () => {
  senderModule = __toESM(require_api(), 1);
});
//@ chunk-e6aww6q8.js:77532-77803 placement
function toOtelLogRecord(record) {
  let { span } = record;
  let hasNoSpan = span === undefined || span === null;
  return otelLogRecord(
    record.event,
    import_mapValues(record.attributes, (attribute) =>
      typeof attribute === "object" ? toArrayLike(attribute) : attribute,
    ),
    safeDate(record.loggedAt),
    hasNoSpan
      ? senderModule.ROOT_CONTEXT
      : senderModule.trace.setSpanContext(senderModule.ROOT_CONTEXT, {
          traceId: span.traceId,
          spanId: span.spanId,
          traceFlags: span.traceFlags,
          isRemote: false,
        }),
  );
}
//@ chunk-e6aww6q8.js:77803-77978 placement
/**
 * telemetry.log 事件定义：核心把 to 为 collector 的条目作为 OTel 日志发出。
 */
var TELEMETRY_LOG_EVENT; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:77803", () => {
  TELEMETRY_LOG_EVENT = {
    site: UI_ENV_SITE_RULES["telemetry.log"],
    core: {
      name: "core",
      isCore: true,
      budgetMs: 0,
      run: async (request, caller) => {
        if (request.to === "collector" && !caller.signal.aborted)
          emitOrBufferOtelEvent(toOtelLogRecord(request), request.event);
        return {
          value: undefined,
        };
      },
    },
  };
});
//@ chunk-e6aww6q8.js:77978-78028 placement
/**
 * telemetry.mark 事件
 */
var TELEMETRY_MARK_EVENT; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:77978", () => {
  TELEMETRY_MARK_EVENT = makeCoreEvent("telemetry.mark", () => ({
    value: undefined,
  }));
});
export { TELEMETRY_LOG_EVENT, TELEMETRY_MARK_EVENT };
