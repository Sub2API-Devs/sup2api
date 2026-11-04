/**
 * services/claudeGateway/usageMetering.ts
 *
 * 2.1.316 新增：网关用量计量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1ny7cxrt.js (13)
 * attribution: placement 13
 */
import { identity } from "../../utils/identity.js";
import { gatewayLog } from "../gateway/gatewayBanner.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_3, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1ny7cxrt.js:1442912-1442945 placement
/**
 * 找 data: 字段时扣除的前缀长度。
 */
var SSE_EVENT_SEPARATOR_RE = /\r?\n\r?\n/;
var CHARS_PER_OUTPUT_TOKEN = 4;
var DATA_PREFIX_LENGTH = 80;
//@ chunk-1ny7cxrt.js:1442945-1443051 placement (2.1.88 match: getParentCacheSuppressReason, 0.426)
/**
 * SSE 用量解析器的初始状态（usage 0、是否见到、估算输出字符）。旧版名 getParentCacheSuppressReason 为错配，归错文件。
 */
function createSseUsageState() {
  return {
    usage: {
      input_tokens: 0,
      output_tokens: 0,
    },
    seen: false,
    estOutputChars: 0,
    sawOutputTokens: false,
  };
}
//@ chunk-1ny7cxrt.js:1443051-1444450 placement
/**
 * 解析一个 SSE 事件并累加用量（message_start/message_delta 的 usage，content_block_delta 估算输出字符）。
 */
function accumulateSseUsage(stats, eventText) {
  let fieldRange = findFieldRange(eventText, "event:");
  let eventName = fieldRange ? eventText.slice(fieldRange[0], fieldRange[1]).trim() : null;
  if (eventName === "content_block_delta") {
    addOutputCharsFromDelta(stats, eventText);
    return;
  }
  if (eventName !== null && eventName !== "message_start" && eventName !== "message_delta") return;
  if (eventName === null) {
    if (!eventText.includes('"usage"')) {
      if (eventText.includes('"content_block_delta"')) addOutputCharsFromDelta(stats, eventText);
      return;
    }
  }
  let fieldRange_2 = findFieldRange(eventText, "data:");
  if (!fieldRange_2) return;
  let data;
  try {
    data = JSON.parse(eventText.slice(fieldRange_2[0], fieldRange_2[1]).trim());
  } catch {
    return;
  }
  let parsed = SSE_EVENT_SCHEMA().safeParse(data);
  if (!parsed.success) {
    warnUnreadableUsage(parsed.error);
    return;
  }
  if (parsed.data.type === "message_start" && parsed.data.message?.usage) {
    mergeUsage(stats.usage, parsed.data.message.usage);
    stats.seen = true;
    return;
  }
  if (parsed.data.type === "content_block_delta" && parsed.data.delta) {
    let delta = parsed.data.delta;
    stats.estOutputChars +=
      (delta.text?.length ?? 0) + (delta.partial_json?.length ?? 0) + (delta.thinking?.length ?? 0);
    return;
  }
  if (parsed.data.type === "message_delta" && parsed.data.usage) {
    let usage = parsed.data.usage;
    let counts = {
      input_tokens: usage.input_tokens,
      cache_read_input_tokens: usage.cache_read_input_tokens,
      cache_creation_input_tokens: cacheCreationTokens(usage),
    };
    for (let field of ["input_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"]) {
      let value = counts[field];
      if (value != null && value > (stats.usage[field] ?? 0)) stats.usage[field] = value;
    }
    for (let field of ["ephemeral_5m_input_tokens", "ephemeral_1h_input_tokens"]) {
      let value = usage.cache_creation?.[field];
      if (value != null && value > (stats.usage.cache_creation?.[field] ?? 0))
        stats.usage.cache_creation = {
          ...stats.usage.cache_creation,
          [field]: value,
        };
    }
    if (usage.output_tokens !== undefined) {
      stats.usage.output_tokens = usage.output_tokens;
      stats.sawOutputTokens = true;
    }
    if (usage.server_tool_use != null) stats.usage.server_tool_use = usage.server_tool_use;
    stats.seen = true;
  }
}
//@ chunk-1ny7cxrt.js:1444450-1444536 placement
/**
 * 从一段 SSE data 事件里累加估算的输出字符数。
 */
function addOutputCharsFromDelta(stats, chunk) {
  let fieldRange = findFieldRange(chunk, "data:");
  if (fieldRange) stats.estOutputChars += Math.max(0, fieldRange[1] - fieldRange[0] - DATA_PREFIX_LENGTH);
}
//@ chunk-1ny7cxrt.js:1444536-1444742 placement
/**
 * 在 SSE 事件文本中找某字段（event:/data:）值的区间。
 */
function findFieldRange(text, fieldName) {
  let position = 0;
  while (true) {
    if (text.startsWith(fieldName, position)) {
      let valueStart = position + fieldName.length;
      if (text.charCodeAt(valueStart) === 32) valueStart += 1;
      let index = text.indexOf(
        `
`,
        valueStart,
      );
      return [valueStart, index === -1 ? text.length : index];
    }
    let index = text.indexOf(
      `
`,
      position,
    );
    if (index === -1) return null;
    position = index + 1;
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
var unreadableUsageState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1ny7cxrt.js:1444890", () => {
  unreadableUsageState = identity(
    {
      unreadableUsage: false,
    },
    (state) => {
      state.unreadableUsage = false;
    },
  );
});
//@ chunk-1ny7cxrt.js:1444950-1445395 placement
/**
 * 上游用量格式不符时警告一次。
 */
function warnUnreadableUsage(error) {
  if (unreadableUsageState.unreadableUsage) return;
  unreadableUsageState.unreadableUsage = true;
  let issue = error.issues[0];
  let detail = issue ? `${issue.path.join(".")}: ${issue.message}` : "unknown";
  gatewayLog(
    "warn",
    `usage metering: the upstream sent a usage object that does not match the API's shape (${detail}), so that response's spend was metered from its other frames or from the abort-floor estimate and may be under-counted; check the upstream or proxy that produced it. This warning is logged once per process.`,
  );
}
//@ chunk-1ny7cxrt.js:1445395-1445745 placement
/**
 * 解析非流式响应 JSON 的用量。
 */
function parseJsonUsage(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  let result = MESSAGE_RESPONSE_SCHEMA().safeParse(parsed);
  if (!result.success) {
    warnUnreadableUsage(result.error);
    return null;
  }
  if (!result.data.usage) return null;
  let usage = {
    input_tokens: 0,
    output_tokens: 0,
  };
  mergeUsage(usage, result.data.usage);
  usage.output_tokens = result.data.usage.output_tokens ?? 0;
  if (result.data.usage.server_tool_use != null) usage.server_tool_use = result.data.usage.server_tool_use;
  return usage;
}
//@ chunk-1ny7cxrt.js:1445745-1445922 placement
/**
 * 缓存写入 token 数（缺省时由 5m/1h 明细求和）。
 */
function cacheCreationTokens(usage) {
  let cacheCreationInputTokens = usage.cache_creation_input_tokens ?? undefined;
  let ephemeralTotal =
    (usage.cache_creation?.ephemeral_5m_input_tokens ?? 0) +
    (usage.cache_creation?.ephemeral_1h_input_tokens ?? 0);
  return !cacheCreationInputTokens && ephemeralTotal > 0 ? ephemeralTotal : cacheCreationInputTokens;
}
//@ chunk-1ny7cxrt.js:1445922-1446222 placement
/**
 * 把上游 usage 合并进累计用量。
 */
function mergeUsage(target, usage) {
  target.input_tokens = usage.input_tokens ?? target.input_tokens;
  target.cache_read_input_tokens = usage.cache_read_input_tokens ?? undefined;
  target.cache_creation_input_tokens = cacheCreationTokens(usage);
  target.cache_creation = usage.cache_creation ?? undefined;
  if (usage.server_tool_use != null) target.server_tool_use = usage.server_tool_use;
  if (usage.speed !== undefined) target.speed = usage.speed;
}
//@ chunk-1ny7cxrt.js:1446222-1446982 placement
/**
 * 上游用量与 SSE 事件的宽松 schema。
 */
var USAGE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var DELTA_USAGE_SCHEMA;
var SSE_EVENT_SCHEMA;
var MESSAGE_RESPONSE_SCHEMA;
deferInit("chunk-1ny7cxrt.js:1446222", () => {
  USAGE_SCHEMA = DoctorLazy(() =>
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
  DELTA_USAGE_SCHEMA = DoctorLazy(() =>
    USAGE_SCHEMA().extend({
      input_tokens: create_3().nullish(),
    }),
  );
  SSE_EVENT_SCHEMA = DoctorLazy(() =>
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
  MESSAGE_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      usage: USAGE_SCHEMA().optional(),
    }).passthrough(),
  );
});
//@ chunk-1ny7cxrt.js:1446982-1446994 placement
/**
 * 估算输出字数时用的最小值（2000）。
 */
var MIN_ESTIMATE_OUTPUT_CHARS = 2000;
export {
  createSseUsageState,
  SSE_EVENT_SEPARATOR_RE,
  accumulateSseUsage,
  finishSseUsage,
  parseJsonUsage,
  CHARS_PER_OUTPUT_TOKEN,
  MIN_ESTIMATE_OUTPUT_CHARS,
};
