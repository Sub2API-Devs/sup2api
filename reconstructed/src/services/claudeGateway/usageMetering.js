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
import { DATA_PREFIX_LENGTH, CHARS_PER_OUTPUT_TOKEN } from "./spendLimits.js";
import { identity } from "../../utils/identity.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_2 } from "../../../vendor/zod/lib/index.mjs";

//@ chunk-1ny7cxrt.js:1443051-1444450 placement
/**
 * 解析一个 SSE 事件并累加用量（message_start/message_delta 的 usage，content_block_delta 估算输出字符）。
 */
function accumulateSseUsage(sseUsageState, t) {
  let fieldRange = findFieldRange(t, "event:");
  let o = fieldRange ? t.slice(fieldRange[0], fieldRange[1]).trim() : null;
  if (o === "content_block_delta") {
    addOutputCharsFromDelta(sseUsageState, t);
    return;
  }
  if (o !== null && o !== "message_start" && o !== "message_delta") return;
  if (o === null) {
    if (!t.includes('"usage"')) {
      if (t.includes('"content_block_delta"')) addOutputCharsFromDelta(sseUsageState, t);
      return;
    }
  }
  let fieldRange_2 = findFieldRange(t, "data:");
  if (!fieldRange_2) return;
  let s;
  try {
    s = JSON.parse(t.slice(fieldRange_2[0], fieldRange_2[1]).trim());
  } catch {
    return;
  }
  let a = SSE_EVENT_SCHEMA().safeParse(s);
  if (!a.success) {
    warnUnreadableUsage(a.error);
    return;
  }
  if (a.data.type === "message_start" && a.data.message?.usage) {
    mergeUsage(sseUsageState.usage, a.data.message.usage);
    sseUsageState.seen = true;
    return;
  }
  if (a.data.type === "content_block_delta" && a.data.delta) {
    let delta = a.data.delta;
    sseUsageState.estOutputChars +=
      (delta.text?.length ?? 0) + (delta.partial_json?.length ?? 0) + (delta.thinking?.length ?? 0);
    return;
  }
  if (a.data.type === "message_delta" && a.data.usage) {
    let usage = a.data.usage;
    let c = {
      input_tokens: usage.input_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
      cache_creation_input_tokens: cacheCreationTokens(usage),
    };
    for (let u of ["input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"]) {
      let f = c[u];
      if (f != null && f > (sseUsageState.usage[u] ?? 0)) sseUsageState.usage[u] = f;
    }
    for (let u of ["ephemeral_5m_input_tokens", "ephemeral_1h_input_tokens"]) {
      let f = usage.cache_creation?.[u];
      if (f != null && f > (sseUsageState.usage.cache_creation?.[u] ?? 0))
        sseUsageState.usage.cache_creation = {
          ...sseUsageState.usage.cache_creation,
          [u]: f,
        };
    }
    if (usage.output_tokens !== undefined) {
      sseUsageState.usage.output_tokens = usage.output_tokens;
      sseUsageState.sawOutputTokens = true;
    }
    if (usage.server_tool_use != null) sseUsageState.usage.server_tool_use = usage.server_tool_use;
    sseUsageState.seen = true;
  }
}
//@ chunk-1ny7cxrt.js:1444450-1444536 placement
/**
 * 从一段 SSE data 事件里累加估算的输出字符数。
 */
function addOutputCharsFromDelta(e, t) {
  let fieldRange = findFieldRange(t, "data:");
  if (fieldRange) e.estOutputChars += Math.max(0, fieldRange[1] - fieldRange[0] - DATA_PREFIX_LENGTH);
}
//@ chunk-1ny7cxrt.js:1444536-1444742 placement
/**
 * 在 SSE 事件文本中找某字段（event:/data:）值的区间。
 */
function findFieldRange(e, t) {
  let n = 0;
  while (true) {
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
//@ chunk-1ny7cxrt.js:1444742-1444890 placement
/**
 * 结束时若没有 output_tokens 则按字符估算，返回用量或 null。
 */
function finishSseUsage(sseUsageState) {
  if (!sseUsageState.sawOutputTokens && sseUsageState.estOutputChars > 0) {
    sseUsageState.usage.output_tokens = Math.ceil(sseUsageState.estOutputChars / CHARS_PER_OUTPUT_TOKEN);
    sseUsageState.seen = true;
  }
  return sseUsageState.seen ? sseUsageState.usage : null;
}
//@ chunk-1ny7cxrt.js:1444890-1444950 placement
/**
 * 记录“上游用量不可读”的一次性警告状态。
 */
var unreadableUsageState = identity(
  {
    unreadableUsage: false,
  },
  (e) => {
    e.unreadableUsage = false;
  },
);
//@ chunk-1ny7cxrt.js:1444950-1445395 placement
/**
 * 上游用量格式不符时警告一次。
 */
function warnUnreadableUsage(error) {
  if (unreadableUsageState.unreadableUsage) return;
  unreadableUsageState.unreadableUsage = true;
  let t = error.issues[0];
  let n = t ? `${t.path.join(".")}: ${t.message}` : "unknown";
  gatewayLog(
    "warn",
    `usage metering: the upstream sent a usage object that does not match the API's shape (${n}), so that response's spend was metered from its other frames or from the abort-floor estimate and may be under-counted; check the upstream or proxy that produced it. This warning is logged once per process.`,
  );
}
//@ chunk-1ny7cxrt.js:1445395-1445745 placement
/**
 * 解析非流式响应 JSON 的用量。
 */
function parseJsonUsage(e) {
  let t;
  try {
    t = JSON.parse(e);
  } catch {
    return null;
  }
  let n = MESSAGE_RESPONSE_SCHEMA().safeParse(t);
  if (!n.success) {
    warnUnreadableUsage(n.error);
    return null;
  }
  if (!n.data.usage) return null;
  let o = {
    input_tokens: 0,
    output_tokens: 0,
  };
  mergeUsage(o, n.data.usage);
  o.output_tokens = n.data.usage.output_tokens ?? 0;
  if (n.data.usage.server_tool_use != null) o.server_tool_use = n.data.usage.server_tool_use;
  return o;
}
//@ chunk-1ny7cxrt.js:1445745-1445922 placement
/**
 * 缓存写入 token 数（缺省时由 5m/1h 明细求和）。
 */
function cacheCreationTokens(e) {
  let cacheCreationInputTokens = e.cache_creation_input_tokens ?? undefined;
  let n =
    (e.cache_creation?.ephemeral_5m_input_tokens ?? 0) + (e.cache_creation?.ephemeral_1h_input_tokens ?? 0);
  return !cacheCreationInputTokens && n > 0 ? n : cacheCreationInputTokens;
}
//@ chunk-1ny7cxrt.js:1445922-1446222 placement
/**
 * 把上游 usage 合并进累计用量。
 */
function mergeUsage(e, usage) {
  e.input_tokens = usage.input_tokens ?? e.input_tokens;
  e.cache_read_input_tokens = usage.cache_read_input_tokens ?? undefined;
  e.cache_creation_input_tokens = cacheCreationTokens(usage);
  e.cache_creation = usage.cache_creation ?? undefined;
  if (usage.server_tool_use != null) e.server_tool_use = usage.server_tool_use;
  if (usage.speed !== undefined) e.speed = usage.speed;
}
//@ chunk-1ny7cxrt.js:1446222-1446982 placement
/**
 * 上游用量与 SSE 事件的宽松 schema。
 */
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
    server_tool_use: create({
      web_search_requests: create_3().optional(),
    })
      .passthrough()
      .nullish(),
  }).passthrough(),
);
var DELTA_USAGE_SCHEMA = DoctorLazy(() =>
  USAGE_SCHEMA().extend({
    input_tokens: create_3().nullish(),
  }),
);
var SSE_EVENT_SCHEMA = DoctorLazy(() =>
  create({
    type: create_2().optional(),
    usage: DELTA_USAGE_SCHEMA().optional(),
    message: create({
      usage: USAGE_SCHEMA().optional(),
    })
      .passthrough()
      .optional(),
    delta: create({
      text: create_2().optional(),
      partial_json: create_2().optional(),
      thinking: create_2().optional(),
    })
      .passthrough()
      .optional(),
  }).passthrough(),
);
var MESSAGE_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    usage: USAGE_SCHEMA().optional(),
  }).passthrough(),
);
//@ chunk-1ny7cxrt.js:1446982-1446994 placement
/**
 * 估算输出字数时用的最小值（2000）。
 */
var MIN_ESTIMATE_OUTPUT_CHARS = 2000;
export { accumulateSseUsage, finishSseUsage, parseJsonUsage, MIN_ESTIMATE_OUTPUT_CHARS };
