/**
 * services/claudeGateway/usageMetering.ts
 *
 * 2.1.316 新增：网关用量计量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (11)
 * attribution: placement 11
 */
import { Hbe, S1 } from "./spendLimits.js";
import { ge } from "../../utils/identity.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_2 } from "../../../vendor/zod/lib/index.mjs";

/**
 * 解析一个 SSE 事件并累加用量（message_start/message_delta 的 usage，content_block_delta 估算输出字符）。
 */
//@ chunk-1ny7cxrt.js:1443051-1444450 placement
function accumulateSseUsage(e, t) {
  let n = findFieldRange(t, "event:"),
    o = n ? t.slice(n[0], n[1]).trim() : null;
  if (o === "content_block_delta") {
    v1(e, t);
    return;
  }
  if (o !== null && o !== "message_start" && o !== "message_delta") return;
  if (o === null) {
    if (!t.includes('"usage"')) {
      if (t.includes('"content_block_delta"')) v1(e, t);
      return;
    }
  }
  let r = findFieldRange(t, "data:");
  if (!r) return;
  let s;
  try {
    s = JSON.parse(t.slice(r[0], r[1]).trim());
  } catch {
    return;
  }
  let safeParse = SSE_EVENT_SCHEMA().safeParse(s);
  if (!safeParse.success) {
    warnUnreadableUsage(safeParse.error);
    return;
  }
  if (safeParse.data.type === "message_start" && safeParse.data.message?.usage) {
    (mergeUsage(e.usage, safeParse.data.message.usage), (e.seen = !0));
    return;
  }
  if (safeParse.data.type === "content_block_delta" && safeParse.data.delta) {
    let delta = safeParse.data.delta;
    e.estOutputChars +=
      (delta.text?.length ?? 0) + (delta.partial_json?.length ?? 0) + (delta.thinking?.length ?? 0);
    return;
  }
  if (safeParse.data.type === "message_delta" && safeParse.data.usage) {
    let usage = safeParse.data.usage,
      c = {
        input_tokens: usage.input_tokens,
        cache_read_input_tokens: usage.cache_read_input_tokens,
        cache_creation_input_tokens: cacheCreationTokens(usage),
      };
    for (let u of ["input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"]) {
      let f = c[u];
      if (f != null && f > (e.usage[u] ?? 0)) e.usage[u] = f;
    }
    for (let u of ["ephemeral_5m_input_tokens", "ephemeral_1h_input_tokens"]) {
      let f = usage.cache_creation?.[u];
      if (f != null && f > (e.usage.cache_creation?.[u] ?? 0))
        e.usage.cache_creation = { ...e.usage.cache_creation, [u]: f };
    }
    if (usage.output_tokens !== void 0)
      ((e.usage.output_tokens = usage.output_tokens), (e.sawOutputTokens = !0));
    if (usage.server_tool_use != null) e.usage.server_tool_use = usage.server_tool_use;
    e.seen = !0;
  }
}
//@ chunk-1ny7cxrt.js:1444450-1444536 placement
function v1(e, t) {
  let n = findFieldRange(t, "data:");
  if (n) e.estOutputChars += Math.max(0, n[1] - n[0] - Hbe);
}
/**
 * 在 SSE 事件文本中找某字段（event:/data:）值的区间。
 */
//@ chunk-1ny7cxrt.js:1444536-1444742 placement
function findFieldRange(e, t) {
  let n = 0;
  while (!0) {
    if (e.startsWith(t, n)) {
      let r = n + t.length;
      if (e.charCodeAt(r) === 32) r += 1;
      let index = e.indexOf(
        `
`,
        r,
      );
      return [r, index === -1 ? e.length : index];
    }
    let index = e.indexOf(
      `
`,
      n,
    );
    if (index === -1) return null;
    n = index + 1;
  }
}
/**
 * 结束时若没有 output_tokens 则按字符估算，返回用量或 null。
 */
//@ chunk-1ny7cxrt.js:1444742-1444890 placement
function finishSseUsage(e) {
  if (!e.sawOutputTokens && e.estOutputChars > 0)
    ((e.usage.output_tokens = Math.ceil(e.estOutputChars / S1)), (e.seen = !0));
  return e.seen ? e.usage : null;
}
//@ chunk-1ny7cxrt.js:1444890-1444950 placement
var w1 = ge({ unreadableUsage: !1 }, (e) => {
  e.unreadableUsage = !1;
});
/**
 * 上游用量格式不符时警告一次。
 */
//@ chunk-1ny7cxrt.js:1444950-1445395 placement
function warnUnreadableUsage(e) {
  if (w1.unreadableUsage) return;
  w1.unreadableUsage = !0;
  let t = e.issues[0],
    n = t ? `${t.path.join(".")}: ${t.message}` : "unknown";
  gatewayLog(
    "warn",
    `usage metering: the upstream sent a usage object that does not match the API's shape (${n}), so that response's spend was metered from its other frames or from the abort-floor estimate and may be under-counted; check the upstream or proxy that produced it. This warning is logged once per process.`,
  );
}
/**
 * 解析非流式响应 JSON 的用量。
 */
//@ chunk-1ny7cxrt.js:1445395-1445745 placement
function parseJsonUsage(e) {
  let t;
  try {
    t = JSON.parse(e);
  } catch {
    return null;
  }
  let safeParse = MESSAGE_RESPONSE_SCHEMA().safeParse(t);
  if (!safeParse.success) return (warnUnreadableUsage(safeParse.error), null);
  if (!safeParse.data.usage) return null;
  let o = { input_tokens: 0, output_tokens: 0 };
  if (
    (mergeUsage(o, safeParse.data.usage),
    (o.output_tokens = safeParse.data.usage.output_tokens ?? 0),
    safeParse.data.usage.server_tool_use != null)
  )
    o.server_tool_use = safeParse.data.usage.server_tool_use;
  return o;
}
/**
 * 缓存写入 token 数（缺省时由 5m/1h 明细求和）。
 */
//@ chunk-1ny7cxrt.js:1445745-1445922 placement
function cacheCreationTokens(e) {
  let t = e.cache_creation_input_tokens ?? void 0,
    n =
      (e.cache_creation?.ephemeral_5m_input_tokens ?? 0) + (e.cache_creation?.ephemeral_1h_input_tokens ?? 0);
  return !t && n > 0 ? n : t;
}
/**
 * 把上游 usage 合并进累计用量。
 */
//@ chunk-1ny7cxrt.js:1445922-1446222 placement
function mergeUsage(e, t) {
  if (
    ((e.input_tokens = t.input_tokens ?? e.input_tokens),
    (e.cache_read_input_tokens = t.cache_read_input_tokens ?? void 0),
    (e.cache_creation_input_tokens = cacheCreationTokens(t)),
    (e.cache_creation = t.cache_creation ?? void 0),
    t.server_tool_use != null)
  )
    e.server_tool_use = t.server_tool_use;
  if (t.speed !== void 0) e.speed = t.speed;
}
/**
 * 上游用量与 SSE 事件的宽松 schema。
 */
//@ chunk-1ny7cxrt.js:1446222-1446982 placement
var USAGE_SCHEMA = DoctorLazy(() =>
    create({
      input_tokens: create_3().optional(),
      output_tokens: create_3().optional(),
      cache_read_input_tokens: create_3().nullish(),
      cache_creation_input_tokens: create_3().nullish(),
      cache_creation: create({
        ephemeral_5m_input_tokens: create_3().optional(),
        ephemeral_1h_input_tokens: create_3().optional(),
      }).nullish(),
      speed: create_2().nullable().optional(),
      server_tool_use: create({ web_search_requests: create_3().optional() }).passthrough().nullish(),
    }).passthrough(),
  ),
  DELTA_USAGE_SCHEMA = DoctorLazy(() => USAGE_SCHEMA().extend({ input_tokens: create_3().nullish() })),
  SSE_EVENT_SCHEMA = DoctorLazy(() =>
    create({
      type: create_2().optional(),
      usage: DELTA_USAGE_SCHEMA().optional(),
      message: create({ usage: USAGE_SCHEMA().optional() }).passthrough().optional(),
      delta: create({
        text: create_2().optional(),
        partial_json: create_2().optional(),
        thinking: create_2().optional(),
      })
        .passthrough()
        .optional(),
    }).passthrough(),
  ),
  MESSAGE_RESPONSE_SCHEMA = DoctorLazy(() => create({ usage: USAGE_SCHEMA().optional() }).passthrough());
//@ chunk-1ny7cxrt.js:1446982-1446994 placement
var A1 = 2000;

export { accumulateSseUsage, finishSseUsage, parseJsonUsage, A1 };
