/**
 * services/api/gzipRequestBody.ts
 *
 * 2.1.316 新增：API 请求体 gzip 压缩：按大小与开关决定是否压缩并设置头。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g8sg6xj8.js (63), chunk-vn3g7zt8.js (20)
 * attribution: placement 76, layout 6, affinity 1
 */
import { deflateRawSync, inflateRawSync, deflateRaw, inflateRaw, constants, gunzip } from "zlib";
import { promisify } from "util";
import { MAX_REQUEST_BYTES } from "../../utils/mediaLimits.js";
import { getErrnoCode, sanitizeErrnoForTelemetry, findInCauseChain } from "../../utils/errors.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getUsableProxyUrl, shouldBypassProxy } from "../../utils/proxy.js";
import { getMTLSConfig } from "../../utils/mtls.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../utils/managedEnvApply.js";
import { isRemoteManagedEnvironment } from "../../utils/remoteEnvironment.js";
import { streamFallbackWarning } from "./streamFallbackWarning.js";
import { isFirstPartyAnthropicHost } from "../../utils/model/providers.js";
import { alwaysTrue, jsonParse } from "../../utils/slowOperations.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema, numberSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { ANT_KEY_PFX } from "../teamMemorySync/secretScanner.js";
import { appendWatermark, swapWatermark } from "../analytics/eventSerialization.js";
import { requestMethodAndUrl } from "../../utils/testNetworkGuard.js";
import { systemClock } from "../../utils/sleep.js";
import { CLIENT_REQUEST_ID_HEADER } from "./client.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logError } from "../../utils/log.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { getRootSession } from "../../bootstrap/state.js";
import { modelApiFetch, isAbortedWithoutStreamError } from "./clientHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g8sg6xj8.js:1079-1267 placement
/**
 * gzip 分块请求体的常量：块 128 KB、字典 32 KB、最多保留 4 块、缓存上限 32、空闲丢弃 210 s、CTC BLOCK 头 256 字节、正文切分标记与系统块尾部间隙 1024。
 */
var GZIP_BLOCK_BYTES = 131072;
var GZIP_DICTIONARY_BYTES = 32768;
var MAX_REUSE_BODY_BYTES = 4 * GZIP_BLOCK_BYTES;
var DICT_ID_BITS = 32;
var MIN_BLOCK_CONCURRENCY = 2;
var DEFAULT_BLOCK_BUDGET = MAX_REQUEST_BYTES;
var BLOCK_IDLE_DROP_MS = 210000;
var BLOCK_OVERHEAD_BYTES = 256;
var BODY_SPLIT_MARKERS = {
  messages: '"messages":[',
  system: '],"system":',
  endOfSystemBlock: '"},{',
  metadata: ',"metadata":{"user_id":"',
};
var MAX_SYSTEM_TAIL_GAP = 1024;
var SYSTEM_TAIL_GAP_BYTES = 4096;
//@ chunk-g8sg6xj8.js:1267-1475 placement
function createBlockCache(maxStoredBytes = DEFAULT_BLOCK_BUDGET) {
  return {
    blocks: new Map(),
    storedBytes: 0,
    maxStoredBytes,
    evictedForSpaceCount: 0,
    generation: 0,
    keptBody: undefined,
    keptSubagentBodies: new Map(),
    cancelIdleDrop: undefined,
    pooledCompression: Promise.resolve(),
  };
}
//@ chunk-g8sg6xj8.js:1475-1631 placement
/**
 * 清空 gzip 块缓存：取消空闲清理、清空块与保留的请求体、递增世代。
 */
function clearGzipBlockStore(blockStore) {
  blockStore.cancelIdleDrop?.();
  blockStore.cancelIdleDrop = undefined;
  blockStore.blocks.clear();
  blockStore.storedBytes = 0;
  blockStore.keptBody = undefined;
  blockStore.keptSubagentBodies.clear();
  blockStore.generation++;
}
//@ chunk-g8sg6xj8.js:1631-1806 layout
function findKeptBody(blockStore, body) {
  if (blockStore.keptBody?.memory.buffer === body.buffer) return blockStore.keptBody;
  for (let { keptBody } of blockStore.keptSubagentBodies.values())
    if (keptBody?.memory.buffer === body.buffer) return keptBody;
  return;
}
//@ chunk-g8sg6xj8.js:1806-2222 layout
function planBlockStore({ body, level, store, clock, cutNearToolsEnd = false }) {
  let blocks = splitBodyBlocks(body, cutNearToolsEnd);
  let { keys, carriedDigestCount } = digestBlocks(
    body,
    blocks,
    level,
    body.byteOffset === 0 ? findKeptBody(store, body) : undefined,
  );
  let lastUsedAt = clock.monotonicNow();
  let reusedBlockCount = 0;
  let reusedBytes = 0;
  let reused = blocks.map((block, index) => {
    let cachedBlock = takeCachedBlock(store, keys[index], lastUsedAt);
    if (cachedBlock !== undefined) {
      reusedBlockCount++;
      reusedBytes += block.end - block.start;
    }
    return cachedBlock;
  });
  if (store.blocks.size > 0) scheduleIdleDrop(store, clock);
  return {
    body,
    level,
    blocks,
    keys,
    reused,
    reusedBlockCount,
    reusedBytes,
    carriedDigestCount,
    generation: store.generation,
  };
}
//@ chunk-g8sg6xj8.js:2222-2302 placement
/**
 * 导出函数 `needsBodyAssembly`：参数 { keys: keys, reused: reused }，返回 keys.some((n, r) => n !== void 0 && reused[r] === void 0)。
 */
function needsBodyAssembly({ keys, reused }) {
  return keys.some((key, index) => key !== undefined && reused[index] === undefined);
}
//@ chunk-g8sg6xj8.js:2302-2542 placement
/**
 * 组装完整的 gzip 请求体：gzip 头、各压缩块与包含 CRC32 和长度的尾部。
 */
async function assembleGzipBody(plan, store, clock, opts) {
  let compressed = await gzipRequestBody(plan, store, clock, opts);
  let buffer = Buffer.from([31, 139, 8, 0, 0, 0, 0, 0, 0, 255]);
  let trailer = Buffer.alloc(10);
  trailer[0] = 3;
  trailer.writeUInt32LE(Bun.hash.crc32(plan.body), 2);
  trailer.writeUInt32LE(plan.body.length % 4294967296, 6);
  return Buffer.concat([buffer, ...compressed, trailer]);
}
//@ chunk-g8sg6xj8.js:2542-2675 placement
class GzipBlockCheckError extends Error {
  fault;
  constructor(fault, options) {
    super("Request body gzip: a newly compressed block failed its check", options);
    this.fault = fault;
  }
}
//@ chunk-g8sg6xj8.js:2675-2756 placement
/**
 * 导出函数 `zlibErrorCode`：参数 e，返回 t === "Z_DATA_ERROR" || t === "Z_BUF_ERROR" ? t : void 0。
 */
function zlibErrorCode(error) {
  let errnoCode = getErrnoCode(error);
  return errnoCode === "Z_DATA_ERROR" || errnoCode === "Z_BUF_ERROR" ? errnoCode : undefined;
}
//@ chunk-g8sg6xj8.js:2756-3836 placement
/**
 * 压缩请求体并校验每个压缩块
 */
async function gzipRequestBody(plan, store, clock, { signal, stopIf, inBackground = false } = {}) {
  let { body, level, blocks, keys, reused, generation } = plan;
  let compressed;
  if (!inBackground && body.length - plan.reusedBytes <= MAX_REUSE_BODY_BYTES)
    compressed = blocks.map((block, index) => {
      let cached = reused[index];
      if (cached !== undefined) return cached;
      let chunk = body.subarray(block.start, block.end);
      let deflateOptions = syncFlushOptions(body, block, level);
      let deflated = deflateRawSync(chunk, deflateOptions);
      try {
        verifyInflatedBlock(chunk, deflated, inflateRawSync(deflated, deflateOptions));
      } catch (error) {
        throw toGzipCheckError(error);
      }
      return deflated;
    });
  else {
    let job = (inBackground ? Promise.resolve() : store.pooledCompression).then(() => {
      signal?.throwIfAborted();
      let lastUsedAt = clock.monotonicNow();
      return pMap(
        blocks,
        async (block, index) => {
          if (stopIf?.()) throw Error("Request body gzip: compression stopped");
          if (reused[index] !== undefined) return reused[index];
          let cached =
            store.generation === generation ? takeCachedBlock(store, keys[index], lastUsedAt) : undefined;
          if (cached !== undefined) {
            plan.reusedBlockCount++;
            plan.reusedBytes += block.end - block.start;
            return cached;
          }
          let chunk = body.subarray(block.start, block.end);
          let deflateOptions = syncFlushOptions(body, block, level);
          let deflated = await deflateChunkAsync(chunk, deflateOptions);
          try {
            verifyInflatedBlock(chunk, deflated, await inflateChunkAsync(deflated, deflateOptions));
          } catch (error) {
            throw toGzipCheckError(error);
          }
          return deflated;
        },
        {
          concurrency: inBackground ? MIN_BLOCK_CONCURRENCY : DICT_ID_BITS,
          signal,
        },
      );
    });
    if (!inBackground)
      store.pooledCompression = job.then(
        () => {},
        () => {},
      );
    compressed = await job;
  }
  if (store.generation !== generation) return compressed;
  let startedAt = clock.monotonicNow();
  compressed.forEach((chunk, index) => {
    let key = keys[index];
    if (key !== undefined && !store.blocks.has(key)) {
      let exactBuffer = chunk.buffer.byteLength === chunk.length;
      storeBlock(store, key, exactBuffer ? chunk : Buffer.copyBytesFrom(chunk), startedAt);
    }
  });
  evictGzipBlocks(store, startedAt);
  scheduleIdleDrop(store, clock);
  return compressed;
}
//@ chunk-g8sg6xj8.js:3836-4241 placement
function splitBodyBlocks(body, cutNearToolsEnd) {
  let index = body.indexOf(BODY_SPLIT_MARKERS.messages);
  let index_2 = body.lastIndexOf(BODY_SPLIT_MARKERS.system);
  let systemBlockEnd = index_2 === -1 ? -1 : body.indexOf(BODY_SPLIT_MARKERS.endOfSystemBlock, index_2);
  let systemEnd =
    systemBlockEnd !== -1 && systemBlockEnd - index_2 <= MAX_SYSTEM_TAIL_GAP ? systemBlockEnd + 2 : -1;
  let toolsCutRaw =
    cutNearToolsEnd && index !== -1 && index < index_2 && systemEnd !== -1
      ? body.lastIndexOf(BODY_SPLIT_MARKERS.metadata) - SYSTEM_TAIL_GAP_BYTES
      : -1;
  let toolsCut = toolsCutRaw > systemEnd ? toolsCutRaw : -1;
  let boundaries = [index, index_2, systemEnd, toolsCut, body.length];
  let blocks = [];
  let cursor = 0;
  for (let boundary of boundaries) {
    if (boundary <= cursor) continue;
    for (let start = cursor; start < boundary; start += GZIP_BLOCK_BYTES)
      blocks.push({
        start,
        end: Math.min(start + GZIP_BLOCK_BYTES, boundary),
        dictionaryStart: Math.max(start - GZIP_DICTIONARY_BYTES, cursor),
        endsAtToolsCut: boundary === toolsCut && start + GZIP_BLOCK_BYTES >= boundary,
      });
    cursor = boundary;
  }
  return blocks;
}
//@ chunk-g8sg6xj8.js:4241-4825 layout
function digestBlocks(body, blocks, level, previous) {
  let carriedDigestCount = 0;
  let mapped = blocks.map((block) => {
    if (block.end - block.start !== GZIP_BLOCK_BYTES && !block.endsAtToolsCut) return;
    let previousBlockDigest = previous?.blockDigests.get(block.start);
    if (
      previous !== undefined &&
      previousBlockDigest?.end === block.end &&
      block.end <= previous.digestedBytes
    ) {
      carriedDigestCount++;
      return previousBlockDigest.digest;
    }
    return Bun.SHA256.hash(body.subarray(block.start, block.end), "base64");
  });
  if (previous !== undefined) {
    previous.blockDigests = new Map(
      blocks.flatMap((block, index) => {
        let digest = mapped[index];
        return digest === undefined || block.end - block.start !== GZIP_BLOCK_BYTES
          ? []
          : [
              [
                block.start,
                {
                  end: block.end,
                  digest,
                },
              ],
            ];
      }),
    );
    previous.digestedBytes = previous.length;
  }
  return {
    carriedDigestCount,
    keys: blocks.map((block, index) => {
      let digest = mapped[index];
      let previousDigest = block.dictionaryStart < block.start ? mapped[index - 1] : "none";
      return digest === undefined || previousDigest === undefined
        ? undefined
        : `${level}:${previousDigest}:${digest}`;
    }),
  };
}
//@ chunk-g8sg6xj8.js:4825-4860 placement
function deflateChunkAsync(chunk, options) {
  return promisify(deflateRaw)(chunk, options);
}
//@ chunk-g8sg6xj8.js:4860-4895 placement
function inflateChunkAsync(chunk, options) {
  return promisify(inflateRaw)(chunk, options);
}
//@ chunk-g8sg6xj8.js:4895-5050 placement
function syncFlushOptions(body, block, level) {
  return {
    level,
    finishFlush: constants.Z_SYNC_FLUSH,
    chunkSize: GZIP_BLOCK_BYTES,
    ...(block.dictionaryStart < block.start && {
      dictionary: body.subarray(block.dictionaryStart, block.start),
    }),
  };
}
//@ chunk-g8sg6xj8.js:5050-5118 placement
function toGzipCheckError(error) {
  let fault = zlibErrorCode(error);
  return fault === undefined
    ? error
    : new GzipBlockCheckError(fault, {
        cause: error,
      });
}
//@ chunk-g8sg6xj8.js:5118-5131 placement
var Z_SYNC_FLUSH_MARKER = 65535;
//@ chunk-g8sg6xj8.js:5131-5286 placement
function verifyInflatedBlock(chunk, deflated, inflated) {
  if (!inflated.equals(chunk)) throw new GzipBlockCheckError("inflates_to_other_bytes");
  if (deflated.length < 4 || deflated.readUInt32BE(deflated.length - 4) !== Z_SYNC_FLUSH_MARKER)
    throw new GzipBlockCheckError("no_flush_marker");
}
//@ chunk-g8sg6xj8.js:5286-5471 placement
function takeCachedBlock(store, key, lastUsedAt) {
  let entry = key === undefined ? undefined : store.blocks.get(key);
  if (key === undefined || entry === undefined) return;
  store.blocks.delete(key);
  store.blocks.set(key, {
    compressed: entry.compressed,
    lastUsedAt,
  });
  return entry.compressed;
}
//@ chunk-g8sg6xj8.js:5471-5564 placement
function storeBlock(store, key, compressed, lastUsedAt) {
  let entry = {
    compressed,
    lastUsedAt,
  };
  store.blocks.set(key, entry);
  store.storedBytes += blockStoredSize(entry);
}
//@ chunk-g8sg6xj8.js:5564-5744 placement
function evictGzipBlocks(store, now) {
  for (let [key, entry] of store.blocks) {
    let overCapacity = store.storedBytes > store.maxStoredBytes;
    if (!overCapacity && now - entry.lastUsedAt < BLOCK_IDLE_DROP_MS) return;
    store.blocks.delete(key);
    store.storedBytes -= blockStoredSize(entry);
    if (overCapacity) store.evictedForSpaceCount++;
  }
}
//@ chunk-g8sg6xj8.js:5744-5891 placement
/**
 * 安排空闲一段时间后清空 gzip 块缓存（弱引用，不阻止退出）。
 */
function scheduleIdleDrop(store, clock) {
  let weakRef = new WeakRef(store);
  store.cancelIdleDrop?.();
  store.cancelIdleDrop = clock.setTimeout(
    () => {
      let liveStore = weakRef.deref();
      if (liveStore !== undefined) clearGzipBlockStore(liveStore);
    },
    BLOCK_IDLE_DROP_MS,
    {
      unref: true,
    },
  );
}
//@ chunk-g8sg6xj8.js:5891-5935 placement
function blockStoredSize(entry) {
  return BLOCK_OVERHEAD_BYTES + entry.compressed.length;
}
//@ chunk-g8sg6xj8.js:5935-5967 placement
function newWeakMap() {
  return new WeakMap();
}
//@ chunk-g8sg6xj8.js:9345-9438 placement
/**
 * 请求体 gzip 的两个开关（gentle_hammock / golden_popcorn）与尺寸/时窗常量：最小 4096 字符（ccr_worker 1024）、块遥测保留 7 天、序列化尾部 8192。
 */
var TENGU_GENTLE_HAMMOCK = "tengu_gentle_hammock";
var TENGU_GOLDEN_POPCORN = "tengu_golden_popcorn";
var MIN_BODY_CHARS = 4096;
var MIN_BODY_CHARS_CCR = 1024;
var BLOCK_TELEMETRY_TTL_MS = 604800000;
var MAX_SERIALISED_TAIL = 8192;
//@ chunk-g8sg6xj8.js:9438-9554 placement
/**
 * 读取 gzip 压缩等级覆盖值（环境变量或开关，1–9 有效）。
 */
function gzipLevelOverride() {
  let level =
    env.CLAUDE_CODE_GZIP_REQUEST_BODY_LEVEL ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GOLDEN_POPCORN, 0);
  return Number.isInteger(level) && level >= 1 && level <= 9 ? level : undefined;
}
//@ chunk-g8sg6xj8.js:9554-9665 placement
function gzipEnvSwitch(rollout) {
  return rollout === "ccr_worker"
    ? env.CLAUDE_CODE_GZIP_CCR_REQUEST_BODIES
    : env.CLAUDE_CODE_GZIP_REQUEST_BODIES;
}
//@ chunk-g8sg6xj8.js:9665-9710 placement
function minBodyCharsFor(rollout) {
  return rollout === "ccr_worker" ? MIN_BODY_CHARS_CCR : MIN_BODY_CHARS;
}
//@ chunk-g8sg6xj8.js:9710-10033 placement
/**
 * 判断当前传输方式是否会阻碍请求体 gzip：Unix socket、代理、mTLS 或自定义 CA。
 */
function gzipBlockingTransport(url) {
  if (env.ANTHROPIC_UNIX_SOCKET) return "unix_socket";
  if (getUsableProxyUrl() !== undefined && !shouldBypassProxy(url)) return "proxy";
  let mtlsConfig = getMTLSConfig();
  if (mtlsConfig?.cert !== undefined || mtlsConfig?.key !== undefined) return "mtls";
  if (env.NODE_EXTRA_CA_CERTS) {
    let latchedPreSettingsEnvSnapshot = getLatchedPreSettingsEnvSnapshot();
    if (!(
      isRemoteManagedEnvironment() ||
      (env.CLAUDE_CODE_ENTRYPOINT === "local-agent" &&
        (latchedPreSettingsEnvSnapshot === undefined ||
          latchedPreSettingsEnvSnapshot.NODE_EXTRA_CA_CERTS !== undefined))
    ))
      return "custom_ca";
  }
  return;
}
//@ chunk-g8sg6xj8.js:10033-10128 placement
/**
 * 导出函数 `isSerialisedBody`：参数 e，返回 Buffer.isBuffer(e) && Ws().gzipRequestBody.serialisedBodies.has(e.buffer)。
 */
function isSerialisedBody(body) {
  return Buffer.isBuffer(body) && streamFallbackWarning().gzipRequestBody.serialisedBodies.has(body.buffer);
}
//@ chunk-g8sg6xj8.js:10128-10228 placement
function serialisedBodyInfo(body) {
  return Buffer.isBuffer(body)
    ? streamFallbackWarning().gzipRequestBody.serialisedBodies.get(body.buffer)
    : undefined;
}
//@ chunk-g8sg6xj8.js:10228-10351 placement
/**
 * 生成请求体复用遥测字段：复用的字符数与是否与 SDK 序列化结果核对过。
 */
function reuseTelemetry(body) {
  let record = serialisedBodyInfo(body);
  return record === undefined
    ? {}
    : {
        requestBodyReusedChars: record.keptChars,
        requestBodyComparedWithSdk: record.checked,
      };
}
//@ chunk-g8sg6xj8.js:10351-10416 affinity
/**
 * 导出函数 `bodyCharCount`：参数 e，返回 typeof e === "string" ? e.length : x(e)?.chars。
 */
function bodyCharCount(body) {
  return typeof body === "string" ? body.length : serialisedBodyInfo(body)?.chars;
}
//@ chunk-g8sg6xj8.js:10481-10534 placement
/**
 * 导出函数 `wouldGzipForHost`：参数 e, n, r，返回 isFirstPartyAnthropicHost(e) && decideGzip(e, 1 / 0, n, r).gzip。
 */
function wouldGzipForHost(url, storage, rollout) {
  return isFirstPartyAnthropicHost(url) && decideGzip(url, 1 / 0, storage, rollout).gzip;
}
//@ chunk-g8sg6xj8.js:10534-11163 placement
/**
 * 判定请求体是否 gzip：env 关闭、非 Bun、非字符串、太小时不压；env 强开时只看本进程是否被拒过；unix socket/代理/mTLS/自定义 CA 时不压；ccr_worker 需开关；已锁存关闭时不压。返回 {gzip, reason, bodyChars}。
 */
function decideGzip(url, bodyChars, storage, rollout) {
  let envSwitch = gzipEnvSwitch(rollout);
  if (envSwitch === false)
    return {
      gzip: false,
      reason: "env_off",
      bodyChars,
    };
  if (!alwaysTrue())
    return {
      gzip: false,
      reason: "not_bun_runtime",
      bodyChars,
    };
  if (bodyChars === undefined)
    return {
      gzip: false,
      reason: "non_string_body",
      bodyChars,
    };
  if (bodyChars < minBodyCharsFor(rollout))
    return {
      gzip: false,
      reason: "below_min_size",
      bodyChars,
    };
  if (envSwitch === true)
    return streamFallbackWarning().gzipRequestBody.rejectedThisProcess
      ? {
          gzip: false,
          reason: "latched_off",
          bodyChars,
        }
      : {
          gzip: true,
          bodyChars,
        };
  let blockingReason = gzipBlockingTransport(url);
  if (blockingReason !== undefined)
    return {
      gzip: false,
      reason: blockingReason,
      bodyChars,
    };
  if (rollout === "ccr_worker" && !getFeatureValue_CACHED_MAY_BE_STALE(TENGU_GENTLE_HAMMOCK, false))
    return {
      gzip: false,
      reason: "flag_off",
      bodyChars,
    };
  if (isGzipLatchedOff(storage))
    return {
      gzip: false,
      reason: "latched_off",
      bodyChars,
    };
  return {
    gzip: true,
    bodyChars,
  };
}
//@ chunk-g8sg6xj8.js:11163-11511 placement
/**
 * gzip 请求体相关的结构与常量：API 错误结构、闩锁记录、拒绝原因、表示服务端无法解析 JSON 的消息与正则。
 */
var API_ERROR_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var LATCH_SCHEMA;
var PROXY_ERROR_SCHEMA;
var INVALID_JSON_MESSAGES;
var BAD_JSON_PATTERN;
deferInit("chunk-g8sg6xj8.js:11163", () => {
  API_ERROR_SCHEMA = DoctorLazy(() =>
    objectSchema({
      type: literal("error"),
      error: objectSchema({
        type: stringSchema(),
        message: stringSchema(),
      }),
    }),
  );
  LATCH_SCHEMA = DoctorLazy(() =>
    objectSchema({
      latchedAt: numberSchema().finite(),
      status: numberSchema(),
    }),
  );
  PROXY_ERROR_SCHEMA = DoctorLazy(() =>
    objectSchema({
      error: stringSchema(),
      reason: stringSchema(),
    }),
  );
  INVALID_JSON_MESSAGES = [
    "The request body is not valid JSON",
    "Failed to parse request: could not parse request body as JSON",
  ];
  BAD_JSON_PATTERN = /^bad json: (?:invalid character |unexpected EOF$|unexpected end of JSON input$|EOF$)/;
});
//@ chunk-g8sg6xj8.js:11511-11605 placement
function responseFacts(response) {
  return {
    status: response.status,
    header: (name) => response.headers.get(name) ?? undefined,
    bodyText: () => readBodyPrefix(response),
  };
}
//@ chunk-g8sg6xj8.js:11605-11704 placement
function isAnthropicRejection(facts) {
  return (facts.header("request-id")?.startsWith("req_") ?? false) || facts.header("cf-ray") !== undefined;
}
//@ chunk-g8sg6xj8.js:11704-11982 placement
async function readBodyPrefix(response) {
  let reader = response.clone().body?.getReader();
  if (!reader) return "";
  let textDecoder = new TextDecoder();
  let text = "";
  let remaining = MAX_SERIALISED_TAIL;
  try {
    while (remaining > 0) {
      let { done, value } = await reader.read();
      if (done) break;
      let chunk = value.subarray(0, remaining);
      remaining -= chunk.byteLength;
      text += textDecoder.decode(chunk, {
        stream: true,
      });
    }
  } catch {
  } finally {
    reader.cancel().catch(() => {});
  }
  return text;
}
//@ chunk-g8sg6xj8.js:11982-12234 placement
function isInvalidJsonRejection(bodyText) {
  let parsed;
  try {
    parsed = jsonParse(bodyText);
  } catch {
    return BAD_JSON_PATTERN.test(bodyText.trimEnd());
  }
  let apiParsed = API_ERROR_SCHEMA().safeParse(parsed);
  if (apiParsed.success)
    return INVALID_JSON_MESSAGES.some((prefix) => apiParsed.data.error.message.startsWith(prefix));
  let proxyParsed = PROXY_ERROR_SCHEMA().safeParse(parsed);
  return (
    proxyParsed.success &&
    proxyParsed.data.reason === "bad_json" &&
    BAD_JSON_PATTERN.test(proxyParsed.data.error)
  );
}
//@ chunk-g8sg6xj8.js:12234-12443 placement
async function classifyGzipRejection(facts) {
  if (facts.status !== 400 && facts.status !== 403 && facts.status !== 415) return null;
  if (!isAnthropicRejection(facts)) return "non_anthropic_rejection";
  if (facts.status === 400 && isInvalidJsonRejection(await facts.bodyText())) return "invalid_json_at_origin";
  return null;
}
//@ chunk-g8sg6xj8.js:12443-12500 placement
/**
 * 导出函数 `classifyRejectionOf`：参数 e，返回 null; return classifyGzipRejection(q(e))。
 */
async function classifyRejectionOf(response) {
  if (response.ok) return null;
  return classifyGzipRejection(responseFacts(response));
}
//@ chunk-g8sg6xj8.js:12500-12649 placement
async function classifyResend(facts) {
  if ((await classifyGzipRejection(facts)) !== null) return "same_rejection";
  return facts.header("request-id")?.startsWith("req_") ? "api_response" : "not_api_response";
}
//@ chunk-g8sg6xj8.js:12649-12815 placement
function readPersistedLatch() {
  let raw;
  try {
    raw = getGlobalConfig().gzipRequestBodiesLatchedOff;
  } catch {
    return "unavailable";
  }
  if (raw === undefined) return;
  let parsed = LATCH_SCHEMA().safeParse(raw);
  return parsed.success ? parsed.data : "malformed";
}
//@ chunk-g8sg6xj8.js:12815-13019 placement
function clearPersistedLatch(latchedAt, storage) {
  saveGlobalConfig((current) => {
    let parsed = LATCH_SCHEMA().safeParse(current.gzipRequestBodiesLatchedOff);
    return (
      parsed.success ? parsed.data.latchedAt === latchedAt : current.gzipRequestBodiesLatchedOff !== undefined
    )
      ? {
          ...current,
          gzipRequestBodiesLatchedOff: undefined,
        }
      : current;
  }, storage);
}
//@ chunk-g8sg6xj8.js:13019-13604 placement
/**
 * 检查 gzip 是否已锁存关闭：本进程已关则是；否则读一次全局配置里的持久锁存，未过期则生效，格式错误或过期则清除并记事件。
 */
function isGzipLatchedOff(storage) {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  if (gzipRequestBody.latchedOff) return true;
  if (gzipRequestBody.persistedLatchChecked) return false;
  let persistedLatch = readPersistedLatch();
  if (persistedLatch === "unavailable") return false;
  gzipRequestBody.persistedLatchChecked = true;
  if (persistedLatch === undefined) return false;
  if (persistedLatch === "malformed") {
    clearPersistedLatch(undefined, storage);
    logEvent("tengu_gzip_request_body_latch_cleared", {
      reason: fromEnum("malformed"),
    });
    return false;
  }
  let ageMs = Date.now() - persistedLatch.latchedAt;
  if (ageMs >= 0 && ageMs < BLOCK_TELEMETRY_TTL_MS) {
    gzipRequestBody.latchedOff = true;
    gzipRequestBody.persistedLatchInEffect = true;
    return true;
  }
  clearPersistedLatch(persistedLatch.latchedAt, storage);
  logEvent("tengu_gzip_request_body_latch_cleared", {
    reason: ageMs < 0 ? fromEnum("malformed") : fromEnum("expired"),
    latchedStatus: persistedLatch.status,
    latchedAgeHours: Math.max(0, Math.round(ageMs / 3600000)),
  });
  return false;
}
//@ chunk-g8sg6xj8.js:13604-13712 placement
function latchOffThisProcess() {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  gzipRequestBody.latchedOff = true;
  gzipRequestBody.rejectedThisProcess = true;
  gzipRequestBody.persistedLatchChecked = true;
}
//@ chunk-g8sg6xj8.js:13712-14011 placement
function latchGzipOff({ persist, status, storageV5, rollout = "api" }) {
  latchOffThisProcess();
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  if (persist && !gzipRequestBody.persistedLatchInEffect && gzipEnvSwitch(rollout) !== true) {
    gzipRequestBody.persistedLatchInEffect = true;
    saveGlobalConfig(
      (current) => ({
        ...current,
        gzipRequestBodiesLatchedOff: {
          latchedAt: Date.now(),
          status,
        },
      }),
      storageV5,
    );
  }
  return gzipRequestBody.persistedLatchInEffect ? "persisted" : "process";
}
//@ chunk-g8sg6xj8.js:14011-14556 placement
/**
 * 按投放范围（api、ccr_worker、frame_publish）记录 gzip 请求体特性结果：回退记一次负面，成功每进程只记一次。
 */
function logGzipFeature(rollout, outcome) {
  switch (rollout) {
    case "api":
      if (outcome === "fell_back") logFeatureSad("api_gzip_request_body", "fell_back");
      else if (streamFallbackWarning().once("gzip_request_body_ok")) logFeatureOk("api_gzip_request_body");
      return;
    case "ccr_worker":
      if (outcome === "fell_back") logFeatureSad("ccr_worker_gzip_request_body", "fell_back");
      else if (streamFallbackWarning().once("ccr_worker_gzip_request_body_ok"))
        logFeatureOk("ccr_worker_gzip_request_body");
      return;
    case "frame_publish":
      if (outcome === "fell_back") logFeatureSad("artifact_publish_gzip_request_body", "fell_back");
      else if (streamFallbackWarning().once("artifact_publish_gzip_request_body_ok"))
        logFeatureOk("artifact_publish_gzip_request_body");
      return;
  }
}
//@ chunk-g8sg6xj8.js:14556-14591 placement
/**
 * 导出函数 `logGzipSent`：参数 e = "api"。
 */
function logGzipSent(rollout = "api") {
  logGzipFeature(rollout, "sent");
}
//@ chunk-g8sg6xj8.js:14591-14831 placement
function logCcrSkipReason(rollout, skip) {
  if (rollout !== "ccr_worker") return;
  let ccrWorkerSkipReasonsLogged = streamFallbackWarning().gzipRequestBody.ccrWorkerSkipReasonsLogged;
  if (ccrWorkerSkipReasonsLogged.has(skip.reason)) return;
  ccrWorkerSkipReasonsLogged.add(skip.reason);
  logEvent("tengu_gzip_request_body_skipped", {
    rollout: fromEnum(rollout),
    reason: fromEnum(skip.reason),
    requestBodyChars: skip.bodyChars,
  });
}
//@ chunk-g8sg6xj8.js:14831-15312 placement
/**
 * 记录 gzip 请求体被拒后回退为未压缩重发的情况：调试日志与 tengu_gzip_request_body_fallback 遥测（拒绝类别、状态码、重发结果、是否闩锁关闭）。
 */
function logGzipFallback({
  rejection,
  status,
  viaCloudflare,
  retryOutcome,
  retryStatus,
  latched,
  bodyChars,
  rollout = "api",
}) {
  logGzipFeature(rollout, "fell_back");
  logForDebugging(
    `[API REQUEST] gzip request body rejected (rollout=${rollout} status=${status} kind=${rejection}); re-sent uncompressed \u2192 ${retryOutcome}${retryStatus !== undefined ? ` status=${retryStatus}` : ""}; gzip latched off: ${latched}`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_gzip_request_body_fallback", {
    rollout: fromEnum(rollout),
    rejection: fromEnum(rejection),
    status,
    viaCloudflare,
    retryOutcome: fromEnum(retryOutcome),
    retryStatus,
    latched: fromEnum(latched),
    requestBodyChars: bodyChars,
  });
}
//@ chunk-g8sg6xj8.js:15312-15898 placement
/**
 * gzip 请求被拒后以未压缩方式重发：记录拒绝原因与重发结果，必要时持久锁存关闭（非 Anthropic 拒绝且重发成功），返回重发响应。
 */
async function resendUncompressed({
  rejection,
  first,
  resend,
  facts,
  aborted,
  bodyChars,
  storageV5,
  rollout,
}) {
  let base = {
    rejection,
    status: first.status,
    viaCloudflare: first.header("cf-ray") !== undefined,
    bodyChars,
    rollout,
  };
  let retried;
  try {
    retried = await resend();
  } catch (error) {
    logGzipFallback({
      ...base,
      retryOutcome: aborted() ? "aborted" : "network_error",
      retryStatus: undefined,
      latched: latchGzipOff({
        persist: false,
        status: first.status,
        storageV5,
        rollout,
      }),
    });
    throw error;
  }
  let retryFacts = facts(retried);
  let outcome = await classifyResend(retryFacts);
  let latched = latchGzipOff({
    persist:
      rollout !== "ccr_worker" && rejection === "non_anthropic_rejection" && outcome === "api_response",
    status: first.status,
    storageV5,
    rollout,
  });
  logGzipFallback({
    ...base,
    retryOutcome: outcome,
    retryStatus: retryFacts.status,
    latched,
  });
  return retried;
}
//@ chunk-g8sg6xj8.js:15898-16515 placement
/**
 * 检查 gzip 请求的响应是否为拒绝：是则锁存关闭、取消原响应、更新遥测，并以原始请求体重发。
 */
async function retryRejectedGzipRequest({
  res,
  dispatch,
  finalInit,
  identityBody,
  clientRequestId,
  storageV5,
  rollout = "api",
}) {
  let rejection = await classifyRejectionOf(res);
  if (rejection === null) return res;
  latchOffThisProcess();
  res.body?.cancel().catch(() => {});
  let { compress, ...rest } = finalInit;
  let nextInit = {
    ...rest,
    body: identityBody,
  };
  if (clientRequestId !== undefined) {
    let priorTelemetry =
      streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId.get(clientRequestId);
    recordGzipBlockTelemetry(clientRequestId, {
      requestBodyEncoding: "identity",
      requestBodyChars: bodyCharCount(identityBody) ?? identityBody.length,
      gzipFallbackStatus: res.status,
      ...(priorTelemetry !== undefined &&
        "gzipBlocks" in priorTelemetry && {
          gzipBlocks: priorTelemetry.gzipBlocks,
        }),
      ...reuseTelemetry(identityBody),
    });
  }
  return resendUncompressed({
    rejection,
    first: responseFacts(res),
    resend: () => dispatch(nextInit),
    facts: responseFacts,
    aborted: () => finalInit.signal?.aborted === true,
    bodyChars: bodyCharCount(identityBody) ?? identityBody.length,
    storageV5,
    rollout,
  });
}
//@ chunk-g8sg6xj8.js:16515-16758 placement
/**
 * Artifact 帧发布时检查 gzip 是否被拒，被拒则以未压缩身份重发并处理闩锁，否则原样返回响应。
 */
async function handleFrameGzipRejection({
  answer,
  facts,
  resendIdentity,
  aborted,
  bodyChars,
  storageV5,
  rollout,
}) {
  let firstFacts = facts(answer);
  let rejection = await classifyGzipRejection(firstFacts);
  if (rejection === null) return answer;
  latchOffThisProcess();
  return resendUncompressed({
    rejection,
    first: firstFacts,
    resend: resendIdentity,
    facts,
    aborted,
    bodyChars,
    storageV5,
    rollout,
  });
}
//@ chunk-g8sg6xj8.js:16758-17044 placement
/**
 * 生成带 gzip 压缩的 fetch 包装：符合条件时压缩请求体并加水印，被拒时自动回退重发。
 */
function createGzipFetchWrapper(rollout, storage) {
  return async (wasOlder, init, dispatch) => {
    let decision = ANT_KEY_PFX(wasOlder, init.body, storage, rollout);
    if (!decision?.gzip) {
      if (decision !== undefined) logCcrSkipReason(rollout, decision);
      return dispatch(init);
    }
    logGzipSent(rollout);
    let gzipInit = {
      ...init,
      compress: "gzip",
      body: appendWatermark(init.body),
    };
    let res = await dispatch(gzipInit);
    return retryRejectedGzipRequest({
      res,
      dispatch,
      finalInit: gzipInit,
      identityBody: init.body,
      clientRequestId: undefined,
      storageV5: storage,
      rollout,
    });
  };
}
//@ chunk-g8sg6xj8.js:17044-17119 placement
/**
 * 导出函数 `recordGzipBlockTelemetry`：参数 e, n。
 */
function recordGzipBlockTelemetry(clientRequestId, telemetry) {
  streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId.set(clientRequestId, telemetry);
}
//@ chunk-g8sg6xj8.js:17119-17365 placement
/**
 * 请求体按块 gzip 被拒时，把该请求的遥测记录标记为 rejected。
 */
function markGzipBlocksRejected(clientRequestId, blocks) {
  if (clientRequestId === null) return;
  let telemetryByClientRequestId = streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId;
  let telemetry = telemetryByClientRequestId.get(clientRequestId);
  if (telemetry?.requestBodyEncoding !== "gzip") return;
  telemetryByClientRequestId.set(clientRequestId, {
    ...telemetry,
    gzipBlocks:
      telemetry.gzipBlocks?.outcome === "as_blocks"
        ? {
            ...telemetry.gzipBlocks,
            outcome: "rejected",
          }
        : blocks,
  });
}
//@ chunk-g8sg6xj8.js:17365-17441 placement
/**
 * 导出函数 `takeDispatchAtGzip`：参数 e, n。
 */
function takeDispatchAtGzip(clientRequestId, at) {
  streamFallbackWarning().gzipRequestBody.dispatchAtByClientRequestId.set(clientRequestId, at);
}
//@ chunk-g8sg6xj8.js:17441-17565 placement
/**
 * 取出并删除某个客户端请求 id 记录的分派时间。
 */
function takeDispatchAt(clientRequestId) {
  if (clientRequestId === undefined) return;
  let dispatchAtByClientRequestId = streamFallbackWarning().gzipRequestBody.dispatchAtByClientRequestId;
  let at = dispatchAtByClientRequestId.get(clientRequestId);
  dispatchAtByClientRequestId.delete(clientRequestId);
  return at;
}
//@ chunk-g8sg6xj8.js:17565-17688 placement
/**
 * 取出并删除某个客户端请求 id 的 gzip 遥测记录。
 */
function takeGzipTelemetry(clientRequestId) {
  if (clientRequestId === undefined) return;
  let telemetryByClientRequestId = streamFallbackWarning().gzipRequestBody.telemetryByClientRequestId;
  let telemetry = telemetryByClientRequestId.get(clientRequestId);
  telemetryByClientRequestId.delete(clientRequestId);
  return telemetry;
}
//@ chunk-g8sg6xj8.js:17688-19087 placement
/**
 * 把 gzip 请求体遥测（编码、字符数、级别、准备耗时、块复用、跳过原因、回退状态等）展开为日志字段。
 */
function gzipTelemetryFields(telemetry) {
  if (telemetry === undefined) return {};
  return {
    requestBodyEncoding: fromEnum(telemetry.requestBodyEncoding),
    requestBodyChars: telemetry.requestBodyChars,
    ...(telemetry.requestBodyEncoding === "gzip" &&
      telemetry.requestBodyGzipLevel !== undefined && {
        requestBodyGzipLevel: telemetry.requestBodyGzipLevel,
      }),
    ...("requestPrepareMs" in telemetry &&
      telemetry.requestPrepareMs !== undefined && {
        requestPrepareMs: telemetry.requestPrepareMs,
      }),
    ...("requestBodyReusedChars" in telemetry &&
      telemetry.requestBodyReusedChars !== undefined && {
        requestBodyReusedChars: telemetry.requestBodyReusedChars,
      }),
    ...("requestBodyComparedWithSdk" in telemetry &&
      telemetry.requestBodyComparedWithSdk !== undefined && {
        requestBodyComparedWithSdk: telemetry.requestBodyComparedWithSdk,
      }),
    ...("gzipBlocks" in telemetry &&
      telemetry.gzipBlocks !== undefined && {
        requestBodyGzipBlocksMode: telemetry.gzipBlocks.mode,
        requestBodyGzipBlocksOutcome: fromEnum(telemetry.gzipBlocks.outcome),
        ...(telemetry.gzipBlocks.planned !== undefined && {
          requestBodyGzipBlockCount: telemetry.gzipBlocks.planned.blockCount,
          requestBodyGzipReusedBlockCount: telemetry.gzipBlocks.planned.reusedBlockCount,
          requestBodyGzipReusedBytes: telemetry.gzipBlocks.planned.reusedBytes,
          requestBodyGzipBlocksMs: telemetry.gzipBlocks.planned.spentMs,
          ...(telemetry.gzipBlocks.planned.gzippedBytes !== undefined && {
            requestBodyGzippedBytes: telemetry.gzipBlocks.planned.gzippedBytes,
          }),
          requestBodyGzipStoredBytes: telemetry.gzipBlocks.planned.storedBytes,
          requestBodyGzipEvictedBlockCount: telemetry.gzipBlocks.planned.evictedForSpaceCount,
        }),
      }),
    ...("gzipSkipReason" in telemetry && {
      gzipSkipReason: fromEnum(telemetry.gzipSkipReason),
    }),
    ...("gzipFallbackStatus" in telemetry && {
      gzipFallback: true,
      gzipFallbackStatus: telemetry.gzipFallbackStatus,
    }),
  };
}
//@ chunk-g8sg6xj8.js:19087-19096 placement
// deferred: uses swapWatermark (../analytics/eventSerialization.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g8sg6xj8.js:19087", () => {
  swapWatermark(ANT_KEY_PFX);
});
//@ chunk-vn3g7zt8.js:244606-244844 placement
/**
 * 按块计算 gzip 请求体各块摘要并复用上次摘要（carriedDigestCount），用于块缓存键。
 */
var TENGU_BUZZING_PIKE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var blockDigestKeys;
var MIN_CHARS_FOR_REUSE_CHECK;
var LARGE_BODY_MARKERS;
var MARKER_SEARCH_TAIL_CHARS;
var DEFAULT_GZIP_LEVEL;
var BLOCK_CONCURRENCY;
var NO_GZIP_QUERY_SOURCES;
var REUSE_MISMATCH_SAMPLE_RATE;
deferInit("chunk-vn3g7zt8.js:244606", () => {
  TENGU_BUZZING_PIKE = "tengu_buzzing_pike";
  blockDigestKeys = "tengu_starry_crescent";
  MIN_CHARS_FOR_REUSE_CHECK = 524288;
  LARGE_BODY_MARKERS = ['"thread":{"type":"create"}', '"thread":{"type":"continue",', '"speed":"fast"'];
  MARKER_SEARCH_TAIL_CHARS = 4096;
  DEFAULT_GZIP_LEVEL = 6;
  BLOCK_CONCURRENCY = 1000;
  NO_GZIP_QUERY_SOURCES = new Set(["extract_memories", "prompt_suggestion", "compact"]);
  REUSE_MISMATCH_SAMPLE_RATE = 0.1;
});
//@ chunk-vn3g7zt8.js:244844-245092 placement
function gzipTelemetryExtras(info) {
  return {
    ...(info.cutNearToolsEndFlagOn && {
      cut_near_tools_end_flag_on: true,
    }),
    incremental_request_body: info.incrementalRequestBody === true,
    ...(info.keptForSubagent && {
      kept_for_subagent: true,
    }),
    ...(info.carriedDigests !== undefined && {
      carried_digests: info.carriedDigests,
    }),
  };
}
//@ chunk-vn3g7zt8.js:245092-245185 placement
function getGzipRequestBodyBlocksMode() {
  let decision =
    env.CLAUDE_CODE_GZIP_REQUEST_BODY_BLOCKS ?? getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BUZZING_PIKE, 0);
  return decision === 1 || decision === 2 ? decision : 0;
}
//@ chunk-vn3g7zt8.js:245185-245220 layout
function isBlockDigestKeysOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(blockDigestKeys, false) === true;
}
//@ chunk-vn3g7zt8.js:245220-245323 placement
function isMessagesEndpoint(url) {
  try {
    return new URL(requestMethodAndUrl(url, undefined).url).pathname.endsWith("/v1/messages");
  } catch {
    return false;
  }
}
//@ chunk-vn3g7zt8.js:245323-245512 placement
function shouldGzipRequestBody(body) {
  let body_2 = body?.body;
  return (
    gzipLevelOf(body?.compress) !== undefined &&
    (typeof body_2 === "string" || isSerialisedBody(body_2)) &&
    (bodyCharCount(body_2) ?? 0) >= MIN_CHARS_FOR_REUSE_CHECK &&
    !LARGE_BODY_MARKERS.some((marker) =>
      body_2.includes(
        marker,
        Math.max(0, body_2.length - MARKER_SEARCH_TAIL_CHARS * (typeof body_2 === "string" ? 1 : 3)),
      ),
    )
  );
}
//@ chunk-vn3g7zt8.js:245512-247457 placement
/**
 * 请求体 gzip 分块压缩：按会话开关决定整体/分块/关闭，构建增量块存储并在响应后自检。
 */
async function prepareGzipRequestBody(init, clock = systemClock) {
  let level = gzipLevelOf(init?.compress);
  if (
    init === undefined ||
    level === undefined ||
    !(typeof init.body === "string" || isSerialisedBody(init.body)) ||
    !shouldGzipRequestBody(init)
  )
    return {
      init,
    };
  let body = init.body;
  let gzipRequestBody = streamFallbackWarning();
  let gzipRequestBody_2 = gzipRequestBody.gzipRequestBody;
  let blockStore = gzipRequestBody_2.blockStore;
  let keptBody = typeof body === "string" ? undefined : findKeptBody(blockStore, body);
  let clock_2 =
    typeof body === "string"
      ? {}
      : {
          incrementalRequestBody: true,
          ...(keptBody !== undefined &&
            keptBody !== blockStore.keptBody && {
              keptForSubagent: true,
            }),
        };
  let telemetry = clock_2;
  let headers = new Headers(init.headers);
  let clientRequestId = headers.get(CLIENT_REQUEST_ID_HEADER);
  let gzipRequestBodyBlocksMode = getGzipRequestBodyBlocksMode();
  if (gzipRequestBodyBlocksMode === 0 || gzipRequestBody_2.blocksSwitchedOff) {
    markGzipBlocksRejected(clientRequestId, {
      mode: gzipRequestBodyBlocksMode,
      outcome: gzipRequestBodyBlocksMode === 0 ? "off" : "switched_off",
    });
    return {
      init,
    };
  }
  let previousTelemetry =
    clientRequestId === null ? undefined : gzipRequestBody_2.telemetryByClientRequestId.get(clientRequestId);
  let shouldReportAfterResponse = !(
    previousTelemetry?.requestBodyEncoding === "gzip" &&
    previousTelemetry.querySource !== undefined &&
    NO_GZIP_QUERY_SOURCES.has(previousTelemetry.querySource)
  );
  if (gzipRequestBodyBlocksMode === 1 && blockStore.blocks.size === 0) {
    markGzipBlocksRejected(clientRequestId, {
      mode: gzipRequestBodyBlocksMode,
      outcome: "by_runtime",
    });
    return {
      init,
      ...(shouldReportAfterResponse && {
        afterResponse: onGzipBlocksBuilt(gzipRequestBody_2, clock, body, level, clock_2),
      }),
    };
  }
  let rejectSwitchedOff = () => {
    markGzipBlocksRejected(clientRequestId, {
      mode: gzipRequestBodyBlocksMode,
      outcome: "switched_off",
    });
    return {
      init,
    };
  };
  let startTime = performance.now();
  try {
    let cutNearToolsEndFlagOn = isBlockDigestKeysOn();
    if (cutNearToolsEndFlagOn)
      telemetry = {
        ...telemetry,
        cutNearToolsEndFlagOn: true,
      };
    let blockPlan = planBlockStore({
      body: typeof body === "string" ? Buffer.from(body) : body,
      level,
      store: blockStore,
      clock,
      cutNearToolsEnd: cutNearToolsEndFlagOn,
    });
    if (clock_2.incrementalRequestBody)
      telemetry = {
        ...telemetry,
        carriedDigests: blockPlan.carriedDigestCount,
      };
    let reuseSavesSpace = blockPlan.reusedBytes * 2 < blockPlan.body.length;
    let gzippedBody =
      gzipRequestBodyBlocksMode === 1 && reuseSavesSpace
        ? undefined
        : await assembleGzipBody(blockPlan, blockStore, clock, {
            signal: init.signal ?? undefined,
            stopIf: () => gzipRequestBody_2.blocksSwitchedOff !== false,
          });
    if (gzipRequestBody_2.blocksSwitchedOff) return rejectSwitchedOff();
    markGzipBlocksRejected(clientRequestId, {
      mode: gzipRequestBodyBlocksMode,
      outcome: gzippedBody === undefined ? "by_runtime" : "as_blocks",
      planned: {
        blockCount: blockPlan.blocks.length,
        reusedBlockCount: blockPlan.reusedBlockCount,
        reusedBytes: blockPlan.reusedBytes,
        spentMs: Math.round(performance.now() - startTime),
        gzippedBytes: gzippedBody?.length,
        storedBytes: blockStore.storedBytes,
        evictedForSpaceCount: blockStore.evictedForSpaceCount,
      },
    });
    if (gzippedBody === undefined)
      return {
        init,
        ...(shouldReportAfterResponse &&
          needsBodyAssembly(blockPlan) && {
            afterResponse: onGzipBlocksBuilt(gzipRequestBody_2, clock, body, level, clock_2),
          }),
      };
    if (gzipRequestBody.once("gzip_request_body_blocks_ok")) logFeatureOk("api_gzip_request_body_blocks");
    headers.set("Content-Encoding", "gzip");
    let { compress, ...initWithoutCompress } = init;
    return {
      init: {
        ...initWithoutCompress,
        headers,
        body: gzippedBody,
      },
      afterResponse: scheduleGzipSelfCheck(gzipRequestBody_2, clock, gzippedBody, telemetry),
    };
  } catch (error) {
    if (init.signal?.aborted)
      return {
        init,
      };
    if (gzipRequestBody_2.blocksSwitchedOff && !(error instanceof GzipBlockCheckError))
      return rejectSwitchedOff();
    reportGzipBlockFailure(error, gzipRequestBody_2, "failed", telemetry);
    markGzipBlocksRejected(clientRequestId, {
      mode: gzipRequestBodyBlocksMode,
      outcome: "failed",
    });
    return {
      init,
    };
  }
}
//@ chunk-vn3g7zt8.js:247457-247991 placement
async function handleGzipRejectedResponse(response, resend) {
  let gzipRequestBody = streamFallbackWarning().gzipRequestBody;
  let blocks = gzipRequestBody.blockGzippedResponses.get(response);
  if (blocks === undefined) return response;
  let rejection = await classifyRejectionOf(response);
  if (rejection === null) return response;
  switchOffGzipBlocks(
    gzipRequestBody,
    "for_the_session",
    `rejected (status=${response.status} kind=${rejection})`,
  );
  response.body?.cancel().catch(() => {});
  let replacement;
  try {
    replacement = await resend();
    return replacement;
  } finally {
    logFeatureSad("api_gzip_request_body_blocks", "rejected", {
      status: response.status,
      rejection: fromEnum(rejection),
      ...(replacement !== undefined && {
        resendStatus: replacement.status,
      }),
      ...blocks,
    });
    logForDiagnosticsNoPII("warn", "api_gzip_request_body_blocks_rejected", {
      status: response.status,
      rejection,
      ...(replacement !== undefined && {
        resend_status: replacement.status,
      }),
      ...gzipTelemetryExtras(blocks),
    });
  }
}
//@ chunk-vn3g7zt8.js:247991-248186 placement
function switchOffGzipBlocks(body, blocksSwitchedOff, blocks) {
  if (body.blocksSwitchedOff !== "for_the_session") body.blocksSwitchedOff = blocksSwitchedOff;
  clearGzipBlockStore(body.blockStore);
  logForDebugging(`[API REQUEST] gzip in blocks switched off (${body.blocksSwitchedOff}): ${blocks}`, {
    level: "warn",
  });
}
//@ chunk-vn3g7zt8.js:248186-248617 placement
function reportGzipBlockFailure(error, status, capability, blocks) {
  logError(error);
  if (error instanceof GzipBlockCheckError) {
    switchOffGzipBlocks(status, "for_the_session", `a new block failed its check (${error.fault})`);
    logFeatureSad("api_gzip_request_body_blocks", "piece_check_failed", {
      fault: fromEnum(error.fault),
      ...blocks,
    });
    logForDiagnosticsNoPII("warn", "api_gzip_request_body_blocks_piece_check_failed", {
      fault: error.fault,
      ...gzipTelemetryExtras(blocks),
    });
  } else {
    switchOffGzipBlocks(status, "until_next_conversation", "compression threw");
    logFeatureSad(
      "api_gzip_request_body_blocks",
      capability,
      ...(blocks.incrementalRequestBody || blocks.cutNearToolsEndFlagOn ? [blocks] : []),
    );
  }
}
//@ chunk-vn3g7zt8.js:248617-249280 placement
function onGzipBlocksBuilt(status, store, body, level, clock) {
  let blockStore = status.blockStore;
  let { generation } = blockStore;
  return (onBlocks) => {
    if (!onBlocks?.ok || status.blocksBuildGeneration === generation) return;
    let result =
      typeof body !== "string" && findKeptBody(blockStore, body) !== undefined ? Buffer.from(body) : body;
    status.blocksBuildGeneration = generation;
    store.setTimeout(
      async () => {
        let cutNearToolsEnd = false;
        try {
          if (
            !status.blocksSwitchedOff &&
            getGzipRequestBodyBlocksMode() !== 0 &&
            blockStore.generation === generation
          ) {
            cutNearToolsEnd = isBlockDigestKeysOn();
            await gzipRequestBody(
              planBlockStore({
                body: typeof result === "string" ? Buffer.from(result) : result,
                level,
                store: blockStore,
                clock: store,
                cutNearToolsEnd,
              }),
              blockStore,
              store,
              {
                inBackground: true,
                stopIf: () => status.blocksSwitchedOff !== false,
              },
            );
          }
        } catch (error) {
          if (!status.blocksSwitchedOff || error instanceof GzipBlockCheckError)
            reportGzipBlockFailure(error, status, "build_failed", {
              ...clock,
              ...(cutNearToolsEnd && {
                cutNearToolsEndFlagOn: true,
              }),
            });
        } finally {
          if (status.blocksBuildGeneration === generation) status.blocksBuildGeneration = undefined;
        }
      },
      BLOCK_CONCURRENCY,
      {
        unref: true,
      },
    );
  };
}
//@ chunk-vn3g7zt8.js:249280-249865 placement
function scheduleGzipSelfCheck(gzipRequestBody, store, blocks, extras) {
  return (onChecked) => {
    if (onChecked !== undefined) gzipRequestBody.blockGzippedResponses.set(onChecked, extras);
    if (!isTransientFailure(onChecked) && true && Math.random() >= REUSE_MISMATCH_SAMPLE_RATE) return;
    store.setTimeout(
      () =>
        promisify(gunzip)(blocks, {
          chunkSize: 1048576,
        }).catch((error) => {
          let errno = sanitizeErrnoForTelemetry(error);
          let telemetry = {
            ...(errno !== undefined && {
              code: errno,
            }),
            ...extras,
          };
          let isZlibError = zlibErrorCode(error) !== undefined;
          switchOffGzipBlocks(
            gzipRequestBody,
            isZlibError ? "for_the_session" : "until_next_conversation",
            `the check of a sent body ended in ${getErrnoCode(error) ?? "an error"}`,
          );
          if (isZlibError) {
            logFeatureBad("api_gzip_request_body_blocks", "self_check_wrong_bytes", telemetry);
            logForDiagnosticsNoPII("error", "api_gzip_request_body_blocks_self_check_wrong_bytes", {
              code: errno,
              ...gzipTelemetryExtras(extras),
            });
          } else logFeatureSad("api_gzip_request_body_blocks", "self_check_could_not_run", telemetry);
        }),
      BLOCK_CONCURRENCY,
      {
        unref: true,
      },
    );
  };
}
//@ chunk-vn3g7zt8.js:249865-249959 placement
function isTransientFailure(status) {
  return (
    status === undefined ||
    (status.status >= 400 && status.status < 500 && status.status !== 401 && status.status !== 429)
  );
}
//@ chunk-vn3g7zt8.js:249959-250075 placement
function gzipLevelOf(compress) {
  if (compress === "gzip") return DEFAULT_GZIP_LEVEL;
  return typeof compress === "object" && compress !== null && compress.encoding === "gzip"
    ? (compress.level ?? DEFAULT_GZIP_LEVEL)
    : undefined;
}
//@ chunk-vn3g7zt8.js:250075-250148 placement
var routeFinalAnswerState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var X_CLAUDE_CODE_ROUTE_FINAL_ANSWER;
deferInit("chunk-vn3g7zt8.js:250075", () => {
  routeFinalAnswerState = new HostScoped(() => ({
    route: undefined,
  }));
  X_CLAUDE_CODE_ROUTE_FINAL_ANSWER = "x-claude-code-route-final-answer";
});
//@ chunk-vn3g7zt8.js:250148-250219 placement
function isRoutedFinalAnswerError(error) {
  return (
    error instanceof APIError &&
    error.headers?.has(X_CLAUDE_CODE_ROUTE_FINAL_ANSWER) === true &&
    hasFinalAnswerRoute()
  );
}
//@ chunk-vn3g7zt8.js:250219-250441 layout
class RouteTurnError extends Error {
  status;
  retryAfter;
  name = "RouteTurnedAwayError";
  code = "RouteTurnedAway";
  constructor(status, retryAfter, cause) {
    super("the request was turned away before any work was done on it", {
      cause,
    });
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
//@ chunk-vn3g7zt8.js:250441-250522 layout
function findRouteTurnError(error) {
  let inCauseChain = findInCauseChain(error, (cause) => cause instanceof RouteTurnError);
  return inCauseChain instanceof RouteTurnError ? inCauseChain : undefined;
}
//@ chunk-vn3g7zt8.js:250522-250575 placement
function hasFinalAnswerRoute() {
  return routeFinalAnswerState.of(getRootSession().host).route !== undefined;
}
//@ chunk-vn3g7zt8.js:250575-250857 placement
/**
 * API 客户端 fetch 包装：优先走注入的 route，再按需对请求体做 gzip 分块压缩。
 */
async function fetchWithRequestBodyCompression(input, init) {
  let routed = routeFinalAnswerState.of(getRootSession().host).route?.(input, init, modelApiFetch);
  if (routed !== undefined) return routed;
  if (!shouldGzipRequestBody(init) || !isMessagesEndpoint(input)) return modelApiFetch(input, init);
  let { init: init_2, afterResponse } = await prepareGzipRequestBody(init).catch((error) => {
    logError(error);
    return {
      init,
    };
  });
  let response;
  try {
    response = await modelApiFetch(input, init_2);
    return response;
  } finally {
    if (response !== undefined || !isAbortedWithoutStreamError(init?.signal))
      try {
        afterResponse?.(response);
      } catch (error) {
        logError(error);
      }
  }
}
export {
  getGzipRequestBodyBlocksMode,
  findRouteTurnError,
  takeDispatchAtGzip,
  wouldGzipForHost,
  createGzipFetchWrapper,
  decideGzip,
  bodyCharCount,
  newWeakMap,
  createBlockCache,
  clearGzipBlockStore,
  gzipTelemetryFields,
  takeGzipTelemetry,
  isRoutedFinalAnswerError,
  fetchWithRequestBodyCompression,
  hasFinalAnswerRoute,
  scheduleIdleDrop,
  findKeptBody,
  isMessagesEndpoint,
  isSerialisedBody,
  takeDispatchAt,
  gzipLevelOverride,
  logGzipSent,
  reuseTelemetry,
  recordGzipBlockTelemetry,
  handleGzipRejectedResponse,
  retryRejectedGzipRequest,
  handleFrameGzipRejection,
};
