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
import { Re } from "../../../runtime/bun-runtime.js";
import { Ol } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { otelLogRecord, emitOrBufferOtelEvent } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { b_t, k_t } from "./skillPromptHooks.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { gh } from "./coreHandlers.js";

//@ chunk-e6aww6q8.js:77514-77532 placement
var WX = Re(Ol(), 1);
//@ chunk-e6aww6q8.js:77532-77803 placement
function toOtelLogRecord(e) {
  let { span: span } = e,
    r = span === void 0 || span === null;
  return otelLogRecord(
    e.event,
    xr(e.attributes, (s) => (typeof s === "object" ? b_t(s) : s)),
    k_t(e.loggedAt),
    r
      ? WX.ROOT_CONTEXT
      : WX.trace.setSpanContext(WX.ROOT_CONTEXT, {
          traceId: span.traceId,
          spanId: span.spanId,
          traceFlags: span.traceFlags,
          isRemote: !1,
        }),
  );
}
/**
 * telemetry.log 事件定义：核心把 to 为 collector 的条目作为 OTel 日志发出。
 */
//@ chunk-e6aww6q8.js:77803-77978 placement
var TELEMETRY_LOG_EVENT = {
  site: UI_ENV_SITE_RULES["telemetry.log"],
  core: {
    name: "core",
    isCore: !0,
    budgetMs: 0,
    run: async (e, n) => {
      if (e.to === "collector" && !n.signal.aborted) emitOrBufferOtelEvent(toOtelLogRecord(e), e.event);
      return { value: void 0 };
    },
  },
};
//@ chunk-e6aww6q8.js:77978-78028 placement
var Sde = gh("telemetry.mark", () => ({ value: void 0 }));

export { TELEMETRY_LOG_EVENT, Sde };
