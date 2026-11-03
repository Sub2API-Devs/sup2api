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
import { resolve as resolve_2, join } from "path";
import { randomUUID } from "crypto";
import { mkdir, lstat, open } from "fs/promises";
import { constants } from "fs";
import { isEnvTruthy } from "../envUtils.js";
import { HostScoped } from "../hostScoped.js";
import { isDiskless, getRootSession, getSessionId } from "../../bootstrap/state.js";
import { isENOENT, getErrnoCode } from "../errors.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../fsFlags.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";
import { notRecordedReason, redactWithIndex } from "./accountMemoryRedaction.js";
import { logOTelEvent } from "./events.js";
import { truncateContentForTelemetry } from "./sessionTracing.js";
import {
  redactMessageFields,
  collectToolUseIds as collectToolUseIds_2,
  redactMessageContent,
} from "./messageContentAttributes.js";

//@ chunk-e6aww6q8.js:2505576-2505735 placement
function parseRawBodiesSetting(e) {
  if (e?.startsWith("file:")) {
    let sliced = e.slice(5);
    return sliced
      ? {
          mode: "file",
          dir: resolve_2(sliced),
        }
      : {
          mode: "disabled",
        };
  }
  return isEnvTruthy(e)
    ? {
        mode: "inline",
      }
    : {
        mode: "disabled",
      };
}
//@ chunk-e6aww6q8.js:2505735-2505794 placement
class OtelRawBodiesState {
  cached = undefined;
  indexAppendChain = Promise.resolve();
}
//@ chunk-e6aww6q8.js:2505794-2505821 placement
var otelRawBodiesStateByHost = new HostScoped(() => new OtelRawBodiesState());
//@ chunk-e6aww6q8.js:2505821-2506013 placement
function getRawBodiesConfig() {
  if (isDiskless())
    return {
      mode: "disabled",
    };
  let e = otelRawBodiesStateByHost.of(getRootSession().host);
  let envOtelLogRawApiBodies = process.env.OTEL_LOG_RAW_API_BODIES;
  if (!e.cached || e.cached.raw !== envOtelLogRawApiBodies)
    e.cached = {
      raw: envOtelLogRawApiBodies,
      config: parseRawBodiesSetting(envOtelLogRawApiBodies),
    };
  return e.cached.config;
}
//@ chunk-e6aww6q8.js:2506013-2506059 placement
function isRawBodiesEnabled() {
  return getRawBodiesConfig().mode !== "disabled";
}
//@ chunk-e6aww6q8.js:2506059-2506081 placement
var INDEX_JSONL = "index.jsonl";
//@ chunk-e6aww6q8.js:2506081-2506151 placement
function rawBodyId(e) {
  return e !== undefined && /^[A-Za-z0-9_-]+$/.test(e) ? e : randomUUID();
}
//@ chunk-e6aww6q8.js:2506151-2506197 placement
function rawBodyFileName(e, n) {
  return `${rawBodyId(e)}.${n}.json`;
}
//@ chunk-e6aww6q8.js:2506197-2506300 placement
async function writeWithMkdir(e, n) {
  try {
    await n();
  } catch (error) {
    if (!isENOENT(error)) throw error;
    await mkdir(e, {
      recursive: true,
    });
    await n();
  }
}
//@ chunk-e6aww6q8.js:2506300-2506315 placement
var RAW_BODY_MAX_BYTES = 524288;
//@ chunk-e6aww6q8.js:2506315-2507232 placement
async function openOtelRawBodyFile(e, n, r, s = false) {
  let h;
  try {
    let S = await lstat(e, {
      bigint: true,
    });
    if (!S.isFile() || S.nlink > 1n)
      throw Error("OTEL raw body target is not a regular single-link file; not writing");
    h = {
      dev: S.dev,
      ino: S.ino,
    };
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let y;
  try {
    y = await open(
      e,
      constants.O_WRONLY |
        (h ? 0 : constants.O_CREAT | constants.O_EXCL) |
        (r === "append" ? constants.O_APPEND : 0) |
        NOFOLLOW_NONBLOCK_FLAGS |
        RAW_BODY_MAX_BYTES,
    );
  } catch (error) {
    if (!h && !s && getErrnoCode(error) === "EEXIST") return openOtelRawBodyFile(e, n, r, true);
    throw error;
  }
  try {
    let S = await lstat(e, {
      bigint: true,
    });
    let stats = await y.stat({
      bigint: true,
    });
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
    let L = undefined;
    let buffer = Buffer.from(n, "utf8");
    let q = 0;
    while (q < buffer.length) {
      let { bytesWritten } = await y.write(buffer, q, buffer.length - q, L);
      if (bytesWritten === 0) throw Error("OTEL raw body write made no progress");
      q += bytesWritten;
      if (L !== undefined) L += bytesWritten;
    }
  } finally {
    await y.close();
  }
}
//@ chunk-e6aww6q8.js:2507232-2507330 placement
function writeRawBodyInBackground(dir, n) {
  writeWithMkdir(dir, n).catch((error) =>
    logForDebugging(`OTEL raw body file write failed: ${error}`, {
      level: "error",
    }),
  );
}
//@ chunk-e6aww6q8.js:2507330-2507834 placement
function writeOtelRequestBody(e, n, r, s, h) {
  let rawBodiesConfig = getRawBodiesConfig();
  if (rawBodiesConfig.mode === "disabled") return;
  let S =
    "withheld" in n
      ? {
          body_withheld: n.withheld,
        }
      : undefined;
  let w = jsonStringify(
    "withheld" in n
      ? {
          not_recorded: notRecordedReason(n.withheld),
        }
      : n.value,
  );
  if (rawBodiesConfig.mode === "file") {
    let q = e === "api_request_body" ? "request" : "response";
    let Z = join(rawBodiesConfig.dir, rawBodyFileName(r, q));
    writeRawBodyInBackground(rawBodiesConfig.dir, () => openOtelRawBodyFile(Z, w, "replace"));
    logOTelEvent(
      e,
      {
        body_ref: Z,
        body_length: String(Buffer.byteLength(w)),
        ...S,
        ...s,
      },
      h,
    );
    return;
  }
  let { content, truncated } = truncateContentForTelemetry(w);
  logOTelEvent(
    e,
    {
      body: content,
      body_length: String(w.length),
      ...(truncated && {
        body_truncated: "true",
      }),
      ...S,
      ...s,
    },
    h,
  );
}
//@ chunk-e6aww6q8.js:2507834-2508001 placement
function redactThinkingBlocks(e) {
  return e.map((n) => {
    if (n.type === "thinking")
      return {
        ...n,
        thinking: "<REDACTED>",
      };
    if (n.type === "redacted_thinking")
      return {
        ...n,
        data: "<REDACTED>",
      };
    return n;
  });
}
//@ chunk-e6aww6q8.js:2508001-2508139 placement
function redactRequestThinking(e) {
  return {
    ...e,
    messages: e.messages.map((message) =>
      message.role === "assistant" && Array.isArray(message.content)
        ? {
            ...message,
            content: redactThinkingBlocks(message.content),
          }
        : message,
    ),
  };
}
//@ chunk-e6aww6q8.js:2508139-2508401 placement
function logApiRequestBody(e, querySource, r, messages = e.messages, agentContext) {
  if (!isRawBodiesEnabled()) return;
  let y = randomUUID();
  let S = redactRequestThinking(e);
  let w = redactWithIndex(r, querySource, (L) => ({
    ...S,
    ...(S.system !== undefined && {
      system: redactMessageFields(S.system, L),
    }),
    messages: collectToolUseIds_2(S.messages, L, messages),
  }));
  writeOtelRequestBody(
    "api_request_body",
    w,
    y,
    {
      model: e.model,
      query_source: querySource,
      request_body_id: y,
    },
    agentContext,
  );
  return y;
}
//@ chunk-e6aww6q8.js:2508401-2509310 placement
function writeOtelResponseBody(newMessages, n) {
  let rawBodiesConfig = getRawBodiesConfig();
  if (rawBodiesConfig.mode === "disabled" || newMessages.length === 0) return;
  let last = newMessages.at(-1);
  let flattened = newMessages.flatMap((G) => G.message.content);
  let y = redactThinkingBlocks(flattened);
  let S = redactWithIndex(n.accountMemoryKeys, n.querySource, (G) => ({
    ...last.message,
    content: redactMessageContent(y, G),
  }));
  let requestId = n.requestId ?? undefined;
  let L = rawBodyId(requestId);
  writeOtelRequestBody(
    "api_response_body",
    S,
    L,
    {
      model: n.model,
      query_source: n.querySource,
      request_id: requestId,
      request_body_id: n.requestBodyId,
      "message.id": last.message.id,
      "message.uuid": last.uuid,
    },
    n.agentContext,
  );
  if (rawBodiesConfig.mode === "file") {
    let G = jsonStringify({
      timestamp: new Date().toISOString(),
      session_id: getSessionId(),
      query_source: n.querySource,
      model: n.model,
      request_id: requestId,
      message_id: last.message.id,
      message_uuid: last.uuid,
      request_file: n.requestBodyId !== undefined ? rawBodyFileName(n.requestBodyId, "request") : undefined,
      response_file: rawBodyFileName(L, "response"),
    });
    let q = join(rawBodiesConfig.dir, INDEX_JSONL);
    let Z = otelRawBodiesStateByHost.of(getRootSession().host);
    Z.indexAppendChain = Z.indexAppendChain.then(() =>
      writeWithMkdir(rawBodiesConfig.dir, () =>
        openOtelRawBodyFile(
          q,
          `${G}
`,
          "append",
        ),
      ).catch((error) =>
        logForDebugging(`OTEL raw body file write failed: ${error}`, {
          level: "error",
        }),
      ),
    );
  }
}
//@ chunk-e6aww6q8.js:2509310-2509323 placement
var RATE_LIMIT_PREFLIGHT_MS = 3000;
export { logApiRequestBody, writeOtelResponseBody, RATE_LIMIT_PREFLIGHT_MS };
