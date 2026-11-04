/**
 * utils/transcriptRequestBlobs.ts
 *
 * 2.1.316 新增：转录请求体块
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1fgvxqz2.js (2), chunk-e6aww6q8.js (24)
 * attribution: placement 26
 */
import { createHash, randomUUID } from "crypto";
import { isDeepStrictEqual } from "util";
import { HashFeeder, feedCanonicalJson, canonicalFingerprint } from "../services/api/requestFingerprint.js";
import { import_mapValues } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { env } from "./env.js";
import { getFeatureValue_SESSION_PINNED } from "../services/analytics/growthbook.js";
import { streamFallbackWarning } from "../services/api/streamFallbackWarning.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { buildAccountMemoryRecallAttachment } from "../services/accountMemory/memoryContext.js";
import { getRootSession, getSessionId } from "../bootstrap/state.js";
import { logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "./debug.js";
import { isBillingHeaderBlock } from "../services/api/promptCacheBreakDetection.js";
import { BUILD_INFO, MAX_SECRET_REDACT_CHARS } from "../constants/buildInfo.js";
import { logError } from "./log.js";
import { jsonParseRaw, jsonStringify } from "./slowOperations.js";
import { isPlainObject as isPlainObject_5 } from "./isPlainObject.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1fgvxqz2.js:269-410 placement
/**
 * 把请求体按规范顺序写入哈希器（可忽略 cache_control），返回其中是否出现过 cache_control。
 */
function hashRequestValue(hashes, value, { omitCacheControl = false } = {}) {
  let feeder = new HashFeeder(hashes);
  let options = {
    cacheControl: false,
  };
  feedCanonicalJson(value, feeder, omitCacheControl, options);
  feeder.flush();
  return {
    hasCacheControl: options.cacheControl,
  };
}
//@ chunk-1fgvxqz2.js:700-915 placement
/**
 * 递归删除对象中的 cache_control 键和值为 undefined 的键，用于比对或重放请求。
 */
function stripCacheControl(value) {
  if (Array.isArray(value)) return value.map(stripCacheControl);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key, value]) => key !== "cache_control" && value !== undefined)
        .map(([key, value]) => [key, stripCacheControl(value)]),
    );
  return value;
}
//@ chunk-e6aww6q8.js:196638-196713 placement
var UNHASHED_REQUEST_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:196638", () => {
  UNHASHED_REQUEST_KEYS = new Set(["metadata", "stream", "thread", "diagnostics", "safeguards"]);
});
//@ chunk-e6aww6q8.js:196713-196812 placement
function normalizeContentBlocks(message) {
  return typeof message.content === "string"
    ? {
        ...message,
        content: [
          {
            type: "text",
            text: message.content,
          },
        ],
      }
    : message;
}
//@ chunk-e6aww6q8.js:196812-196847 placement
function requestBodyHash(body) {
  return hashRequestBody(body).hash;
}
//@ chunk-e6aww6q8.js:196847-196987 placement
function hashRequestBody(body) {
  let hash = createHash("sha256");
  let { hasCacheControl } = hashRequestValue([hash], normalizeContentBlocks(body), {
    omitCacheControl: true,
  });
  return {
    hash: hash.digest("hex"),
    hasCacheControl,
  };
}
//@ chunk-e6aww6q8.js:196987-197084 placement
function toolResultDigest(content) {
  let hash = createHash("sha256");
  hashRequestValue([hash], content ?? null, {
    omitCacheControl: true,
  });
  return hash.digest("hex");
}
//@ chunk-e6aww6q8.js:197084-197306 placement
/**
 * 取出用户消息中各工具结果的 tool_use_id 与内容摘要。
 */
function getToolResultDigests(message) {
  let content = message.type === "user" ? message.message?.content : undefined;
  if (!Array.isArray(content)) return [];
  return content
    .filter((block) => block?.type === "tool_result")
    .flatMap((resultBlock) =>
      typeof resultBlock.tool_use_id === "string"
        ? [[resultBlock.tool_use_id, toolResultDigest(resultBlock.content)]]
        : [],
    );
}
//@ chunk-e6aww6q8.js:197306-198902 placement
/**
 * 计算请求体摘要（逐条消息 sha256），用于转录中的请求重放。
 */
function digestRequestBody(messages, memo) {
  if (memo !== undefined && !Array.isArray(messages.messages))
    throw TypeError("requestDigest: a memo needs body.messages to be an array");
  let hash = createHash("sha256");
  let canonicalPrefix = "";
  let hashIncremental = false;
  let isFirstKey = true;
  let memoUpdate;
  for (let key of Object.keys(messages).sort()) {
    let value = messages[key];
    if (UNHASHED_REQUEST_KEYS.has(key) || value === undefined) continue;
    let keyPrefix = `${isFirstKey ? "{" : ","}${JSON.stringify(key)}:`;
    isFirstKey = false;
    if (key !== "messages" || !Array.isArray(value)) {
      if (hashIncremental) {
        hash.update(keyPrefix);
        hashRequestValue([hash], value);
      } else canonicalPrefix += `${keyPrefix}${canonicalFingerprint(value)}`;
      continue;
    }
    canonicalPrefix += `${keyPrefix}[`;
    let prefixCount = 0;
    let mapped = value.map((message, index) => {
      let memoEntry = memo?.messages[index];
      if (memoEntry === undefined || !isDeepStrictEqual(memoEntry.copy, message)) return;
      if (prefixCount === index) prefixCount++;
      return memoEntry;
    });
    let prefixes =
      memo?.prefixes.filter((prefix) => prefix.count <= prefixCount && prefix.head === canonicalPrefix) ?? [];
    let last = prefixes.at(-1);
    hash = last === undefined ? hash.update(canonicalPrefix) : last.hash.copy();
    let filtered = prefixes.filter(
      (prefix) => prefix === last || mapped[prefix.count]?.hasCacheControl === true,
    );
    for (let count = last?.count ?? 0; ; count++) {
      let memoEntry = mapped[count];
      if (
        memo !== undefined &&
        count !== last?.count &&
        (count === value.length || memoEntry?.hasCacheControl === true)
      )
        filtered.push({
          head: canonicalPrefix,
          count,
          hash: hash.copy(),
        });
      if (count === value.length) break;
      let contentBlock = normalizeContentBlocks(value[count]);
      if (memo === undefined || memoEntry !== undefined) {
        if (count > 0) hash.update(",");
        hashRequestValue([hash], contentBlock);
        continue;
      }
      let hash_2 = hash.copy();
      if (count > 0) hash.update(",");
      let hash_3 = createHash("sha256");
      let { hasCacheControl } = hashRequestValue([hash, hash_3], contentBlock);
      if (hasCacheControl) {
        hash_3 = createHash("sha256");
        hashRequestValue([hash_3], contentBlock, {
          omitCacheControl: true,
        });
        if (count !== last?.count)
          filtered.push({
            head: canonicalPrefix,
            count,
            hash: hash_2,
          });
      }
      mapped[count] = {
        copy: normalizeDeep(value[count]),
        hash: hash_3.digest("hex"),
        hasCacheControl,
      };
    }
    if (memo !== undefined) {
      let filtered_2 = mapped.filter((block) => block !== undefined);
      if (filtered_2.length !== value.length)
        throw Error(
          "requestDigest bug: a message was not hashed, so this request is not recorded for replay",
        );
      memoUpdate = {
        messages: filtered_2,
        prefixes: filtered,
      };
    }
    hash.update("]");
    hashIncremental = true;
  }
  hash.update(`${hashIncremental ? "" : canonicalPrefix}${isFirstKey ? "{}" : "}"}`);
  if (memo !== undefined && memoUpdate !== undefined) {
    memo.messages = memoUpdate.messages;
    memo.prefixes = memoUpdate.prefixes;
  }
  return hash.digest("hex");
}
//@ chunk-e6aww6q8.js:198902-200547 placement
/**
 * 转录中请求体块的存储（fork 上下文引用、请求形状、请求块）。
 */
class RequestBlobStore {
  hashes = new Set();
  recordHashes = new Set();
  hasForkContextRef = false;
  priming = false;
  startMidFile() {
    this.priming = true;
  }
  run;
  hasLines = false;
  get size() {
    return this.hashes.size + this.recordHashes.size;
  }
  has(a) {
    return this.hashes.has(a) || this.recordHashes.has(a);
  }
  successor(b) {
    let c = new RequestBlobStore();
    c.startMidFile();
    c.hasForkContextRef = this.hasForkContextRef;
    if (b) for (let recordHash of this.recordHashes) c.recordHashes.add(recordHash);
    return c;
  }
  noteLine(d) {
    this.hasLines = true;
    if (d.type === "fork-context-ref") {
      this.hasForkContextRef = true;
      return;
    }
    if (d.type === "system" && d.subtype === "compact_boundary") {
      this.hashes.clear();
      this.recordHashes.clear();
      this.run = undefined;
      this.startMidFile();
      return;
    }
    if (d.type === "api-request-shape" || d.type === "api-request-blob") {
      let e = d.type === "api-request-shape" ? d.shapeHash : d.hash;
      if (typeof e === "string") this.recordHashes.add(e);
      return;
    }
    if (d.type !== "user" && d.type !== "assistant") return;
    let message = d.message;
    if (!message || typeof message.role !== "string" || message.content == null) {
      this.run = undefined;
      this.priming = false;
      return;
    }
    let id = typeof message.id === "string" ? message.id : undefined;
    if (this.priming !== false) {
      let priming = this.priming;
      this.priming = {
        role: message.role,
        messageId: id,
      };
      if (priming === true || continuesBlob(priming, message.role, id)) return;
      this.priming = false;
    }
    let contentBlocks =
      typeof message.content === "string"
        ? [
            {
              type: "text",
              text: message.content,
            },
          ]
        : Array.isArray(message.content)
          ? message.content
          : [message.content];
    if (this.run === undefined || !continuesBlob(this.run, message.role, id)) {
      this.run = {
        role: message.role,
        messageId: id,
        hash: undefined,
        blocks: 0,
      };
      this.run.hash = createHash("sha256").update('{"content":[');
    }
    let run = this.run;
    if (run.hash === undefined) return;
    try {
      for (let block of contentBlocks) {
        if (run.blocks > 0) run.hash.update(",");
        hashRequestValue([run.hash], block, {
          omitCacheControl: true,
        });
        run.blocks++;
      }
    } catch (error) {
      run.hash = undefined;
      throw error;
    }
    this.hashes.add(
      run.hash
        .copy()
        .update(`],"role":${canonicalFingerprint(message.role)}}`)
        .digest("hex"),
    );
  }
}
//@ chunk-e6aww6q8.js:200547-200628 placement
function continuesBlob(block, role, id) {
  return block.role === role && (role === "user" || (id !== undefined && block.messageId === id));
}
//@ chunk-e6aww6q8.js:200628-200741 placement
function normalizeDeep(value) {
  if (Array.isArray(value)) return value.map(normalizeDeep);
  if (value === null || typeof value !== "object") return value;
  return import_mapValues(value, normalizeDeep);
}
//@ chunk-e6aww6q8.js:201798-201907 placement
/**
 * 判断请求正文旁存功能是否开启（环境变量优先，否则按会话固定开关）。
 */
function isRequestBlobStoreEnabled() {
  let CLAUDE_CODE_ELEGANT_MEADOW = env.CLAUDE_CODE_ELEGANT_MEADOW;
  if (CLAUDE_CODE_ELEGANT_MEADOW !== undefined) return CLAUDE_CODE_ELEGANT_MEADOW;
  return getFeatureValue_SESSION_PINNED("tengu_elegant_meadow", true);
}
//@ chunk-e6aww6q8.js:201907-201932 placement
/**
 * 重放请求体错位的错误类型。
 */
class ReplayMisalignmentError extends Error {}
//@ chunk-e6aww6q8.js:201932-201940 placement
var markerSnapshotCapturer;
//@ chunk-e6aww6q8.js:201940-201962 placement
/**
 * 设置快照捕获函数。
 */
function setMarkerSnapshotCapturer(withoutLaptopMemoryText) {
  markerSnapshotCapturer = withoutLaptopMemoryText;
}
//@ chunk-e6aww6q8.js:201962-201969 placement
var markerTextWriter;
//@ chunk-e6aww6q8.js:201969-201990 placement
function setMarkerTextWriter(writer) {
  markerTextWriter = writer;
}
//@ chunk-e6aww6q8.js:201990-202066 placement
/**
 * 清掉某任务的请求重放链。
 */
function clearReplayChain(agentIdForCleanup) {
  let requestReplay = streamFallbackWarning().requestReplay;
  requestReplay.chains.delete(agentIdForCleanup);
  requestReplay.chainClears++;
}
//@ chunk-e6aww6q8.js:202066-202138 placement
function clearAllReplayChains() {
  let requestReplay = streamFallbackWarning().requestReplay;
  requestReplay.chains.clear();
  requestReplay.chainClears++;
}
//@ chunk-e6aww6q8.js:202138-202516 placement
/**
 * 构造按 tool_use_id 查找工具结果内容的函数：首次调用时建立索引；只有唯一结果且摘要与预期一致时返回内容，结果带缓存。
 */
function makeToolResultLookup(conversation, digestForToolUse) {
  let resultsById;
  let cache = new Map();
  return (toolUseId) => {
    if (!cache.has(toolUseId)) {
      if (resultsById === undefined) {
        resultsById = new Map();
        for (let message of conversation)
          if (message.type === "user" && Array.isArray(message.message.content)) {
            for (let block of message.message.content)
              if (block.type === "tool_result") {
                let existing = resultsById.get(block.tool_use_id) ?? [];
                resultsById.set(block.tool_use_id, [...existing, block.content]);
              }
          }
      }
      let results = resultsById.get(toolUseId);
      cache.set(
        toolUseId,
        results?.length === 1 && digestForToolUse(toolUseId) === toolResultDigest(results[0])
          ? {
              content: results[0],
            }
          : undefined,
      );
    }
    return cache.get(toolUseId);
  };
}
//@ chunk-e6aww6q8.js:202516-205756 placement
/**
 * 从转录重放请求（主线程或子代理），记录无法重放的原因。
 */
function replayTranscriptRequest(a) {
  try {
    let querySource = a.querySource;
    let queryKind = classifyQuerySource(querySource);
    if (
      querySource === undefined ||
      (queryKind !== "main" && queryKind !== "subagent") ||
      markerTextWriter === undefined ||
      !markerTextWriter.canRecord() ||
      a.storageV5 !== undefined ||
      !isRequestBlobStoreEnabled()
    )
      return;
    let accountMemoryRecallAttachment = buildAccountMemoryRecallAttachment(
      getRootSession().host,
      a.conversation,
    );
    let recordTarget = {
      sessionId: getSessionId(),
      agentId: a.agentId,
      storageV5: a.storageV5,
    };
    let cutResult;
    if (accountMemoryRecallAttachment.length > 0) {
      if (markerSnapshotCapturer === undefined) {
        logFeatureSad("transcript_request_replay", "laptop_memory_cutter_unregistered");
        return;
      }
      try {
        let recordWriter = markerTextWriter;
        cutResult = markerSnapshotCapturer(
          accountMemoryRecallAttachment,
          a.params.messages,
          makeToolResultLookup(a.conversation, (toolUseId) =>
            recordWriter.storedToolResultDigest(recordTarget, toolUseId),
          ),
        );
      } catch (error) {
        if (!(error instanceof ReplayMisalignmentError)) throw error;
        logForDebugging(error.message, {
          level: "warn",
        });
        logFeatureSad("transcript_request_replay", "cut_refused");
        return;
      }
    }
    let messages = cutResult?.messages ?? a.params.messages;
    let requestReplay = streamFallbackWarning().requestReplay;
    let systemBlocks = Array.isArray(a.params.system)
      ? a.params.system.filter((systemBlock) => !isBillingHeaderBlock(systemBlock))
      : a.params.system;
    let shape = {
      ...(systemBlocks !== undefined && {
        system: systemBlocks,
      }),
      ...(a.params.tools !== undefined && {
        tools: a.params.tools,
      }),
    };
    let hash = createHash("sha256");
    hashRequestValue([hash], shape, {
      omitCacheControl: true,
    });
    let shapeHash = hash.digest("hex");
    if (requestReplay.unrecordableShapes.has(shapeHash)) return;
    let passThroughKeys = [];
    for (let [key, value] of Object.entries(a.readInjectedBody())) {
      if (UNHASHED_REQUEST_KEYS.has(key) || !(key in a.params)) continue;
      if (
        key !== "system" &&
        key !== "tools" &&
        key !== "messages" &&
        canonicalFingerprint(Reflect.get(a.params, key)) === canonicalFingerprint(value)
      ) {
        passThroughKeys.push(key);
        continue;
      }
      logForDebugging(
        `Request not recorded for replay: it would write CLAUDE_CODE_EXTRA_BODY's "${key}" into the session file`,
      );
      logFeatureSad("transcript_request_replay", "extra_body_unrecordable");
      return;
    }
    let requestParams = {};
    for (let [key, value] of Object.entries(a.params))
      if (
        key !== "system" &&
        key !== "tools" &&
        key !== "messages" &&
        !UNHASHED_REQUEST_KEYS.has(key) &&
        !passThroughKeys.includes(key) &&
        value !== undefined
      )
        requestParams[key] = stripCacheControl(value);
    let cacheControls = [];
    let requestForDigest = {
      ...a.params,
      system: systemBlocks,
      messages,
    };
    for (let copiedKey of passThroughKeys) delete requestForDigest[copiedKey];
    let memo = requestReplay.hashMemos.get(a.stickyBetas);
    if (memo === undefined) {
      memo = {
        messages: [],
        prefixes: [],
      };
      requestReplay.hashMemos.set(a.stickyBetas, memo);
    }
    let messages_2 = memo.messages;
    let digest = digestRequestBody(requestForDigest, memo);
    let mapped = memo.messages.map((message) => message.hash);
    let floored = Math.floor(Math.random() * messages.length);
    let pivotMessage = messages[floored];
    if (
      pivotMessage !== undefined &&
      memo.messages[floored] === messages_2[floored] &&
      requestBodyHash(pivotMessage) !== mapped[floored]
    ) {
      requestReplay.hashMemos.delete(a.stickyBetas);
      logFeatureBad("transcript_request_replay", "stale_hash");
      return;
    }
    stripCacheControl_2(systemBlocks, ["system"], cacheControls);
    stripCacheControl_2(a.params.tools, ["tools"], cacheControls);
    memo.messages.forEach(({ hasCacheControl }, messageIndex) => {
      if (hasCacheControl)
        stripCacheControl_2(messages[messageIndex], ["messages", messageIndex], cacheControls);
    });
    let chainKey = recordTarget.agentId ?? recordTarget.sessionId;
    let chain = requestReplay.chains.get(chainKey);
    let sameSessionChain = chain?.sessionId === recordTarget.sessionId ? chain : undefined;
    let commonPrefix = 0;
    if (sameSessionChain !== undefined) {
      let min = Math.min(sameSessionChain.lastHashes.length, mapped.length);
      while (commonPrefix < min && sameSessionChain.lastHashes[commonPrefix] === mapped[commonPrefix])
        commonPrefix++;
    }
    let requestId = randomUUID();
    let request = {
      type: "api-request",
      sessionId: recordTarget.sessionId,
      ...(recordTarget.agentId !== undefined && {
        agentId: recordTarget.agentId,
      }),
      id: requestId,
      timestamp: new Date().toISOString(),
      version: BUILD_INFO,
      querySource,
      shapeHash,
      params: requestParams,
      ...(passThroughKeys.length > 0 && {
        withheld: passThroughKeys,
      }),
      ...(commonPrefix > 0 &&
        sameSessionChain !== undefined && {
          base: sameSessionChain.lastId,
        }),
      keep: commonPrefix,
      tail: mapped.slice(commonPrefix),
      cacheControl: cacheControls,
      ...(cutResult === undefined
        ? {
            requestDigest: digest,
          }
        : {
            cut: cutResult.cut,
            cutRequestDigest: digest,
          }),
    };
    let record = {
      target: recordTarget,
      shapeHash,
      shape,
      blobCandidates: messages.slice(commonPrefix).map((message, offset) => ({
        hash: mapped[commonPrefix + offset],
        message: stripCacheControl(message),
      })),
      request,
    };
    let chainClears = requestReplay.chainClears;
    markerTextWriter.append(record).then(
      (status) => {
        if (status === "written") {
          if (requestReplay.chainClears === chainClears && getSessionId() === recordTarget.sessionId) {
            requestReplay.chains.delete(chainKey);
            requestReplay.chains.set(chainKey, {
              lastId: requestId,
              lastHashes: mapped,
              sessionId: recordTarget.sessionId,
            });
            if (requestReplay.chains.size > MAX_SECRET_REDACT_CHARS)
              requestReplay.chains.delete(requestReplay.chains.keys().next().value);
          }
          return;
        }
        if (status === "shape_too_large") requestReplay.unrecordableShapes.add(shapeHash);
        logFeatureSad("transcript_request_replay", status);
      },
      (error) => {
        logError(error);
        logFeatureBad("transcript_request_replay", "write_threw");
      },
    );
    return requestId;
  } catch (error) {
    logError(error);
    logFeatureBad("transcript_request_replay", "capture_threw");
    return;
  }
}
//@ chunk-e6aww6q8.js:205756-205981 placement (2.1.88 match: stripCacheControl, 0.795)
function stripCacheControl_2(a, pathSegments, entries) {
  if (Array.isArray(a)) {
    a.forEach((child, childIndex) => stripCacheControl_2(child, [...pathSegments, childIndex], entries));
    return;
  }
  if (a === null || typeof a !== "object") return;
  for (let [key, value] of Object.entries(a))
    if (key === "cache_control")
      entries.push({
        path: pathSegments,
        value,
      });
    else stripCacheControl_2(value, [...pathSegments, key], entries);
}
//@ chunk-e6aww6q8.js:227298-227341 placement
var API_REQUEST = "api-request";
var API_REQUEST_MARKER = `"type":"${API_REQUEST}`;
//@ chunk-e6aww6q8.js:227341-227449 placement
/**
 * 逐行处理转录文本，丢弃 API 请求记录并替换不可识别的行。
 */
function redactTranscriptLines(text) {
  let lines = [];
  for (let line of text.split(`
`)) {
    let line_2 = redactTranscriptLine(line);
    if (line_2 !== undefined) lines.push(line_2);
  }
  return lines.join(`
`);
}
//@ chunk-e6aww6q8.js:227449-227793 placement
/**
 * 处理转录文件中的一行：去掉开头的 NUL/BOM；空行原样保留；API 请求类记录直接丢弃；无法识别类型或含敏感标记的行替换为只记字节数的 line-withheld 占位。
 */
function redactTranscriptLine(line) {
  let start = 0;
  while (line.charCodeAt(start) === 0 || line.charCodeAt(start) === 65279) start++;
  let strippedLine = start > 0 ? line.slice(start) : line;
  if (strippedLine.trim() === "") return line;
  let parsed;
  try {
    parsed = jsonParseRaw(strippedLine);
  } catch {
    parsed = undefined;
  }
  let lineType = isPlainObject_5(parsed) ? parsed.type : undefined;
  if (typeof lineType === "string" && lineType.startsWith(API_REQUEST)) return;
  if (typeof lineType !== "string" || line.includes(API_REQUEST_MARKER))
    return jsonStringify({
      type: "line-withheld",
      bytes: Buffer.byteLength(line),
    });
  return line;
}
export {
  clearReplayChain,
  RequestBlobStore,
  clearAllReplayChains,
  isRequestBlobStoreEnabled,
  stripCacheControl,
  getToolResultDigests,
  setMarkerTextWriter,
  setMarkerSnapshotCapturer,
  ReplayMisalignmentError,
  replayTranscriptRequest,
  redactTranscriptLines,
};
