/**
 * utils/telemetry/otelRawBodies.ts
 *
 * 2.1.316 新增：OpenTelemetry 原始请求体
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import {
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import { isEnvTruthy } from "../envUtils.js";
import { HostScoped } from "../hostScoped.js";
import { isDiskless, getRootSession, getSessionId } from "../../bootstrap/state.js";
import { isENOENT, getErrnoCode } from "../errors.js";
import { ws } from "../fsFlags.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";
import { notRecordedReason, redactWithIndex } from "./accountMemoryRedaction.js";
import { logOTelEvent } from "./events.js";
import { truncateContentForTelemetry } from "./sessionTracing.js";
import { redactMessageFields, collectToolUseIds, redactMessageContent } from "./messageContentAttributes.js";

//@ chunk-e6aww6q8.js:2505576-2505735 placement
function parseRawBodiesSetting(e) {
  if (e?.startsWith("file:")) {
    let sliced = e.slice(5);
    return sliced ? { mode: "file", dir: resolve_32(sliced) } : { mode: "disabled" };
  }
  return isEnvTruthy(e) ? { mode: "inline" } : { mode: "disabled" };
}
//@ chunk-e6aww6q8.js:2505735-2505794 placement
class $dn {
  cached = void 0;
  indexAppendChain = Promise.resolve();
}
//@ chunk-e6aww6q8.js:2505794-2505821 placement
var Hdn = new HostScoped(() => new $dn());
//@ chunk-e6aww6q8.js:2505821-2506013 placement
function getRawBodiesConfig() {
  if (isDiskless()) return { mode: "disabled" };
  let of = Hdn.of(getRootSession().host),
    envOtelLogRawApiBodies = process.env.OTEL_LOG_RAW_API_BODIES;
  if (!of.cached || of.cached.raw !== envOtelLogRawApiBodies)
    of.cached = { raw: envOtelLogRawApiBodies, config: parseRawBodiesSetting(envOtelLogRawApiBodies) };
  return of.cached.config;
}
//@ chunk-e6aww6q8.js:2506013-2506059 placement
function jmr() {
  return getRawBodiesConfig().mode !== "disabled";
}
//@ chunk-e6aww6q8.js:2506059-2506081 placement
var INDEX_JSONL = "index.jsonl";
//@ chunk-e6aww6q8.js:2506081-2506151 placement
function Bdn(e) {
  return e !== void 0 && /^[A-Za-z0-9_-]+$/.test(e) ? e : randomUUID_28();
}
//@ chunk-e6aww6q8.js:2506151-2506197 placement
function V7e(e, n) {
  return `${Bdn(e)}.${n}.json`;
}
//@ chunk-e6aww6q8.js:2506197-2506300 placement
async function writeWithMkdir(e, n) {
  try {
    await n();
  } catch (error) {
    if (!isENOENT(error)) throw error;
    (await mkdir_14(e, { recursive: !0 }), await n());
  }
}
//@ chunk-e6aww6q8.js:2506300-2506315 placement
var zmr = 524288;
//@ chunk-e6aww6q8.js:2506315-2507232 placement
async function openOtelRawBodyFile(e, n, r, s = !1) {
  let h;
  try {
    let S = await lstat_26(e, { bigint: !0 });
    if (!S.isFile() || S.nlink > 1n)
      throw Error("OTEL raw body target is not a regular single-link file; not writing");
    h = { dev: S.dev, ino: S.ino };
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let y;
  try {
    y = await open_16(
      e,
      constants_19.O_WRONLY |
        (h ? 0 : constants_19.O_CREAT | constants_19.O_EXCL) |
        (r === "append" ? constants_19.O_APPEND : 0) |
        ws |
        zmr,
    );
  } catch (error) {
    if (!h && !s && getErrnoCode(error) === "EEXIST") return openOtelRawBodyFile(e, n, r, !0);
    throw error;
  }
  try {
    let S = await lstat_26(e, { bigint: !0 }),
      stats = await y.stat({ bigint: !0 });
    if (
      !stats.isFile() ||
      stats.nlink > 1n ||
      S.isSymbolicLink() ||
      S.dev !== stats.dev ||
      S.ino !== stats.ino ||
      (h && (stats.dev !== h.dev || stats.ino !== h.ino))
    )
      throw Error("OTEL raw body target changed identity around the open; not writing");
    if (r === "replace") await y.truncate(0);
    let L = void 0,
      buffer = Buffer.from(n, "utf8"),
      q = 0;
    while (q < buffer.length) {
      let { bytesWritten: bytesWritten } = await y.write(buffer, q, buffer.length - q, L);
      if (bytesWritten === 0) throw Error("OTEL raw body write made no progress");
      if (((q += bytesWritten), L !== void 0)) L += bytesWritten;
    }
  } finally {
    await y.close();
  }
}
//@ chunk-e6aww6q8.js:2507232-2507330 placement
function qmr(e, n) {
  writeWithMkdir(e, n).catch((r) =>
    logForDebugging(`OTEL raw body file write failed: ${r}`, { level: "error" }),
  );
}
//@ chunk-e6aww6q8.js:2507330-2507834 placement
function writeOtelRequestBody(e, n, r, s, h) {
  let y = getRawBodiesConfig();
  if (y.mode === "disabled") return;
  let S = "withheld" in n ? { body_withheld: n.withheld } : void 0,
    w = jsonStringify("withheld" in n ? { not_recorded: notRecordedReason(n.withheld) } : n.value);
  if (y.mode === "file") {
    let q = e === "api_request_body" ? "request" : "response",
      Z = join_79(y.dir, V7e(r, q));
    (qmr(y.dir, () => openOtelRawBodyFile(Z, w, "replace")),
      logOTelEvent(e, { body_ref: Z, body_length: String(Buffer.byteLength(w)), ...S, ...s }, h));
    return;
  }
  let { content: content, truncated: truncated } = truncateContentForTelemetry(w);
  logOTelEvent(
    e,
    {
      body: content,
      body_length: String(w.length),
      ...(truncated && { body_truncated: "true" }),
      ...S,
      ...s,
    },
    h,
  );
}
//@ chunk-e6aww6q8.js:2507834-2508001 placement
function redactThinkingBlocks(e) {
  return e.map((n) => {
    if (n.type === "thinking") return { ...n, thinking: "<REDACTED>" };
    if (n.type === "redacted_thinking") return { ...n, data: "<REDACTED>" };
    return n;
  });
}
//@ chunk-e6aww6q8.js:2508001-2508139 placement
function redactRequestThinking(e) {
  return {
    ...e,
    messages: e.messages.map((message) =>
      message.role === "assistant" && Array.isArray(message.content)
        ? { ...message, content: redactThinkingBlocks(message.content) }
        : message,
    ),
  };
}
//@ chunk-e6aww6q8.js:2508139-2508401 placement
function logApiRequestBody(e, n, r, s = e.messages, h) {
  if (!jmr()) return;
  let y = randomUUID_28(),
    S = redactRequestThinking(e),
    w = redactWithIndex(r, n, (L) => ({
      ...S,
      ...(S.system !== void 0 && { system: redactMessageFields(S.system, L) }),
      messages: collectToolUseIds(S.messages, L, s),
    }));
  return (
    writeOtelRequestBody(
      "api_request_body",
      w,
      y,
      { model: e.model, query_source: n, request_body_id: y },
      h,
    ),
    y
  );
}
//@ chunk-e6aww6q8.js:2508401-2509310 placement
function writeOtelResponseBody(e, n) {
  let r = getRawBodiesConfig();
  if (r.mode === "disabled" || e.length === 0) return;
  let at = e.at(-1),
    flattened = e.flatMap((G) => G.message.content),
    y = redactThinkingBlocks(flattened),
    S = redactWithIndex(n.accountMemoryKeys, n.querySource, (G) => ({
      ...at.message,
      content: redactMessageContent(y, G),
    })),
    w = n.requestId ?? void 0,
    L = Bdn(w);
  if (
    (writeOtelRequestBody(
      "api_response_body",
      S,
      L,
      {
        model: n.model,
        query_source: n.querySource,
        request_id: w,
        request_body_id: n.requestBodyId,
        "message.id": at.message.id,
        "message.uuid": at.uuid,
      },
      n.agentContext,
    ),
    r.mode === "file")
  ) {
    let G = jsonStringify({
        timestamp: new Date().toISOString(),
        session_id: getSessionId(),
        query_source: n.querySource,
        model: n.model,
        request_id: w,
        message_id: at.message.id,
        message_uuid: at.uuid,
        request_file: n.requestBodyId !== void 0 ? V7e(n.requestBodyId, "request") : void 0,
        response_file: V7e(L, "response"),
      }),
      q = join_79(r.dir, INDEX_JSONL),
      of = Hdn.of(getRootSession().host);
    of.indexAppendChain = of.indexAppendChain.then(() =>
      writeWithMkdir(r.dir, () =>
        openOtelRawBodyFile(
          q,
          `${G}
`,
          "append",
        ),
      ).catch((Se) => logForDebugging(`OTEL raw body file write failed: ${Se}`, { level: "error" })),
    );
  }
}
//@ chunk-e6aww6q8.js:2509310-2509323 placement
var Vmr = 3000;

export { logApiRequestBody, writeOtelResponseBody, Vmr };
