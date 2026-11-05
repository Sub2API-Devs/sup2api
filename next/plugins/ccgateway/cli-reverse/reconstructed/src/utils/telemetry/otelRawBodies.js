/**
 * utils/telemetry/otelRawBodies.ts
 *
 * 2.1.316 新增：OpenTelemetry 原始请求体
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (21)
 * attribution: placement 18, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolve as resolve_2, join } from "path";
import { randomUUID } from "crypto";
import { mkdir, lstat, open } from "fs/promises";
import { constants } from "fs";
import { isEnvTruthy } from "../envUtils.js";
import { HostScoped } from "../hostScoped.js";
import { isDiskless, getRootSession, getSessionId } from "../../bootstrap/state.js";
import { isENOENT, getErrnoCode, withTelemetryMessage, toError } from "../errors.js";
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
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { logError } from "../log.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2547235-2547394 placement
function parseRawBodiesSetting(setting) {
  if (setting?.startsWith("file:")) {
    let sliced = setting.slice(5);
    return sliced
      ? {
          mode: "file",
          dir: resolve_2(sliced),
        }
      : {
          mode: "disabled",
        };
  }
  return isEnvTruthy(setting)
    ? {
        mode: "inline",
      }
    : {
        mode: "disabled",
      };
}
//@ chunk-5xgkngpb.js:2547394-2547453 placement
class OtelRawBodiesState {
  cached = undefined;
  indexAppendChain = Promise.resolve();
}
//@ chunk-5xgkngpb.js:2547453-2547480 placement
var otelRawBodiesStateByHost; // deferred: uses OtelRawBodiesState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2547453", () => {
  otelRawBodiesStateByHost = new HostScoped(() => new OtelRawBodiesState());
});
//@ chunk-5xgkngpb.js:2547480-2547672 placement
function getRawBodiesConfig() {
  if (isDiskless())
    return {
      mode: "disabled",
    };
  let state = otelRawBodiesStateByHost.of(getRootSession().host);
  let envOtelLogRawApiBodies = process.env.OTEL_LOG_RAW_API_BODIES;
  if (!state.cached || state.cached.raw !== envOtelLogRawApiBodies)
    state.cached = {
      raw: envOtelLogRawApiBodies,
      config: parseRawBodiesSetting(envOtelLogRawApiBodies),
    };
  return state.cached.config;
}
//@ chunk-5xgkngpb.js:2547672-2547718 placement
function isRawBodiesEnabled() {
  return getRawBodiesConfig().mode !== "disabled";
}
//@ chunk-5xgkngpb.js:2547718-2547740 placement
var INDEX_JSONL = "index.jsonl";
//@ chunk-5xgkngpb.js:2547740-2547810 placement
function rawBodyId(id) {
  return id !== undefined && /^[A-Za-z0-9_-]+$/.test(id) ? id : randomUUID();
}
//@ chunk-5xgkngpb.js:2547810-2547856 placement
function rawBodyFileName(requestId, kind) {
  return `${rawBodyId(requestId)}.${kind}.json`;
}
//@ chunk-5xgkngpb.js:2547856-2547959 placement
async function writeWithMkdir(dir, write) {
  try {
    await write();
  } catch (error) {
    if (!isENOENT(error)) throw error;
    await mkdir(dir, {
      recursive: true,
    });
    await write();
  }
}
//@ chunk-5xgkngpb.js:2547959-2547974 placement
var RAW_BODY_MAX_BYTES = 524288;
//@ chunk-5xgkngpb.js:2547974-2548895 placement
async function openOtelRawBodyFile(path, json, mode, retried = false) {
  let handle;
  try {
    let stats = await lstat(path, {
      bigint: true,
    });
    if (!stats.isFile() || stats.nlink > 1n)
      throw Error("OTEL raw body target is not a regular single-link file; not writing");
    handle = {
      dev: stats.dev,
      ino: stats.ino,
    };
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  let linkStats;
  try {
    linkStats = await open(
      path,
      constants.O_WRONLY |
        (handle ? 0 : constants.O_CREAT | constants.O_EXCL) |
        (mode === "append" ? constants.O_APPEND : 0) |
        NOFOLLOW_NONBLOCK_FLAGS |
        RAW_BODY_MAX_BYTES,
    );
  } catch (error) {
    if (!handle && !retried && getErrnoCode(error) === "EEXIST")
      return openOtelRawBodyFile(path, json, mode, true);
    throw error;
  }
  try {
    let currentStats = await lstat(path, {
      bigint: true,
    });
    let stats = await linkStats.stat({
      bigint: true,
    });
    if (
      !stats.isFile() ||
      stats.nlink > 1n ||
      currentStats.isSymbolicLink() ||
      currentStats.dev !== stats.dev ||
      currentStats.ino !== stats.ino ||
      (handle && (stats.dev !== handle.dev || stats.ino !== handle.ino))
    )
      throw Error("OTEL raw body target changed identity around the open; not writing");
    if (mode === "replace") await linkStats.truncate(0);
    let written = undefined;
    let buffer = Buffer.from(json, "utf8");
    let offset = 0;
    while (offset < buffer.length) {
      let { bytesWritten } = await linkStats.write(buffer, offset, buffer.length - offset, written);
      if (bytesWritten === 0) throw Error("OTEL raw body write made no progress");
      offset += bytesWritten;
      if (written !== undefined) written += bytesWritten;
    }
  } finally {
    await linkStats.close();
  }
}
//@ chunk-5xgkngpb.js:2548895-2548993 placement
function writeRawBodyInBackground(dir, dir_2) {
  writeWithMkdir(dir, dir_2).catch((error) =>
    logForDebugging(`OTEL raw body file write failed: ${error}`, {
      level: "error",
    }),
  );
}
//@ chunk-5xgkngpb.js:2548993-2549500 placement
function writeOtelRequestBody(kind, body, requestId, extra, onError) {
  let rawBodiesConfig = getRawBodiesConfig();
  if (rawBodiesConfig.mode === "disabled") return;
  let withheldFields =
    "withheld" in body
      ? {
          body_withheld: body.withheld,
        }
      : undefined;
  let json = jsonStringify(
    "withheld" in body
      ? {
          not_recorded: notRecordedReason(body.withheld),
        }
      : body.value,
  );
  if (rawBodiesConfig.mode === "file") {
    let flow = kind === "api_request_body" ? "request" : "response";
    let filePath = join(rawBodiesConfig.dir, rawBodyFileName(requestId, flow));
    writeRawBodyInBackground(rawBodiesConfig.dir, () => openOtelRawBodyFile(filePath, json, "replace"));
    logOTelEvent(
      kind,
      {
        body_ref: filePath,
        body_length: String(Buffer.byteLength(json)),
        ...withheldFields,
        ...extra,
      },
      onError,
    );
    return;
  }
  let { content, truncated } = truncateContentForTelemetry(json);
  logOTelEvent(
    kind,
    {
      body: content,
      body_length: String(json.length),
      ...(truncated && {
        body_truncated: "true",
      }),
      ...withheldFields,
      ...extra,
    },
    onError,
  );
}
//@ chunk-5xgkngpb.js:2549500-2549667 placement (2.1.88 match: getAssistantMessageContentLength, 0.791)
function redactThinkingBlocks(blocks) {
  return blocks.map((block) => {
    if (block.type === "thinking")
      return {
        ...block,
        thinking: "<REDACTED>",
      };
    if (block.type === "redacted_thinking")
      return {
        ...block,
        data: "<REDACTED>",
      };
    return block;
  });
}
//@ chunk-5xgkngpb.js:2549667-2549805 placement
function redactRequestThinking(request) {
  return {
    ...request,
    messages: request.messages.map((message) =>
      message.role === "assistant" && Array.isArray(message.content)
        ? {
            ...message,
            content: redactThinkingBlocks(message.content),
          }
        : message,
    ),
  };
}
//@ chunk-5xgkngpb.js:2549805-2550067 placement
function logApiRequestBody(request, querySource, redaction, messages = request.messages, onError) {
  if (!isRawBodiesEnabled()) return;
  let id = randomUUID();
  let redactedRequest = redactRequestThinking(request);
  let redactedMessages = redactWithIndex(redaction, querySource, (redact) => ({
    ...redactedRequest,
    ...(redactedRequest.system !== undefined && {
      system: redactMessageFields(redactedRequest.system, redact),
    }),
    messages: collectToolUseIds_2(redactedRequest.messages, redact, messages),
  }));
  writeOtelRequestBody(
    "api_request_body",
    redactedMessages,
    id,
    {
      model: request.model,
      query_source: querySource,
      request_body_id: id,
    },
    onError,
  );
  return id;
}
//@ chunk-5xgkngpb.js:2550067-2550979 placement
function writeOtelResponseBody(newMessages, options) {
  let rawBodiesConfig = getRawBodiesConfig();
  if (rawBodiesConfig.mode === "disabled" || newMessages.length === 0) return;
  let last = newMessages.at(-1);
  let blocks = newMessages.flatMap((message) => message.message.content);
  let blocks_2 = redactThinkingBlocks(blocks);
  let redacted = redactWithIndex(options.accountMemoryKeys, options.querySource, (redact) => ({
    ...last.message,
    content: redactMessageContent(blocks_2, redact),
  }));
  let requestId = options.requestId ?? undefined;
  let requestId_2 = rawBodyId(requestId);
  writeOtelRequestBody(
    "api_response_body",
    redacted,
    requestId_2,
    {
      model: options.model,
      query_source: options.querySource,
      request_id: requestId,
      request_body_id: options.requestBodyId,
      "message.id": last.message.id,
      "message.uuid": last.uuid,
    },
    options.agentContext,
  );
  if (rawBodiesConfig.mode === "file") {
    let record = jsonStringify({
      timestamp: new Date().toISOString(),
      session_id: getSessionId(),
      query_source: options.querySource,
      model: options.model,
      request_id: requestId,
      message_id: last.message.id,
      message_uuid: last.uuid,
      request_file:
        options.requestBodyId !== undefined ? rawBodyFileName(options.requestBodyId, "request") : undefined,
      response_file: rawBodyFileName(requestId_2, "response"),
    });
    let indexPath = join(rawBodiesConfig.dir, INDEX_JSONL);
    let state = otelRawBodiesStateByHost.of(getRootSession().host);
    state.indexAppendChain = state.indexAppendChain.then(() =>
      writeWithMkdir(rawBodiesConfig.dir, () =>
        openOtelRawBodyFile(
          indexPath,
          `${record}
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
//@ chunk-5xgkngpb.js:2550979-2551096 layout
var cyberStopDetailsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2550979", () => {
  cyberStopDetailsSchema = DoctorLazy(() =>
    objectSchema({
      category: literal("cyber"),
      cyber_verification: objectSchema({
        type: stringSchema(),
        tier: unknown().optional(),
        reason: unknown().optional(),
      }),
    }),
  );
});
//@ chunk-5xgkngpb.js:2551096-2551395 layout
function cyberVerificationOf(stopDetails) {
  try {
    let parsed = cyberStopDetailsSchema().safeParse(stopDetails);
    if (!parsed.success) return;
    let { type, tier, reason } = parsed.data.cyber_verification;
    return {
      type,
      ...(typeof tier === "string" && {
        tier,
      }),
      ...(typeof reason === "string" && {
        reason,
      }),
    };
  } catch (error) {
    logError(
      withTelemetryMessage(
        toError(error),
        "reading cyber_verification from a refusal failed; it is left out",
      ),
    );
    return;
  }
}
//@ chunk-5xgkngpb.js:2551395-2551544 layout
function cyberVerificationForRefusal({ scope, category, refusingModel, firstRefusal }) {
  return scope === "session" && category === "cyber" && firstRefusal?.refusingModel === refusingModel
    ? firstRefusal.cyberVerification
    : undefined;
}
//@ chunk-5xgkngpb.js:2551544-2551557 placement
var RATE_LIMIT_PREFLIGHT_MS = 3000;
export {
  logApiRequestBody,
  cyberVerificationOf,
  writeOtelResponseBody,
  RATE_LIMIT_PREFLIGHT_MS,
  cyberVerificationForRefusal,
};
