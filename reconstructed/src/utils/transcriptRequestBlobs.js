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
import { canonicalFingerprint, HashFeeder, feedCanonicalJson } from "../services/api/requestFingerprint.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
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

//@ chunk-e6aww6q8.js:196638-196713 placement
var UNHASHED_REQUEST_KEYS = new Set(["metadata", "stream", "thread", "diagnostics", "safeguards"]);
//@ chunk-e6aww6q8.js:196713-196812 placement
function normalizeContentBlocks(e) {
  return typeof e.content === "string"
    ? {
        ...e,
        content: [
          {
            type: "text",
            text: e.content,
          },
        ],
      }
    : e;
}
//@ chunk-e6aww6q8.js:196812-196847 placement
function requestBodyHash(e) {
  return hashRequestBody(e).hash;
}
//@ chunk-e6aww6q8.js:196847-196987 placement
function hashRequestBody(e) {
  let hash = createHash("sha256");
  let { hasCacheControl } = hashRequestValue([hash], normalizeContentBlocks(e), {
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
function getToolResultDigests(e) {
  let content = e.type === "user" ? e.message?.content : undefined;
  if (!Array.isArray(content)) return [];
  return content
    .filter((r) => r?.type === "tool_result")
    .flatMap((r) =>
      typeof r.tool_use_id === "string" ? [[r.tool_use_id, toolResultDigest(r.content)]] : [],
    );
}
//@ chunk-e6aww6q8.js:197306-198902 placement
/**
 * 计算请求体摘要（逐条消息 sha256），用于转录中的请求重放。
 */
function digestRequestBody(e, n) {
  if (n !== undefined && !Array.isArray(e.messages))
    throw TypeError("requestDigest: a memo needs body.messages to be an array");
  let hash = createHash("sha256");
  let s = "";
  let h = false;
  let y = true;
  let S;
  for (let key of Object.keys(e).sort()) {
    let L = e[key];
    if (UNHASHED_REQUEST_KEYS.has(key) || L === undefined) continue;
    let G = `${y ? "{" : ","}${JSON.stringify(key)}:`;
    y = false;
    if (key !== "messages" || !Array.isArray(L)) {
      if (h) {
        hash.update(G);
        hashRequestValue([hash], L);
      } else s += `${G}${canonicalFingerprint(L)}`;
      continue;
    }
    s += `${G}[`;
    let q = 0;
    let mapped = L.map((Ee, Ae) => {
      let Ie = n?.messages[Ae];
      if (Ie === undefined || !isDeepStrictEqual(Ie.copy, Ee)) return;
      if (q === Ae) q++;
      return Ie;
    });
    let Se = n?.prefixes.filter((prefix) => prefix.count <= q && prefix.head === s) ?? [];
    let last = Se.at(-1);
    hash = last === undefined ? hash.update(s) : last.hash.copy();
    let filtered = Se.filter((Ee) => Ee === last || mapped[Ee.count]?.hasCacheControl === true);
    for (let count = last?.count ?? 0; ; count++) {
      let Ae = mapped[count];
      if (n !== undefined && count !== last?.count && (count === L.length || Ae?.hasCacheControl === true))
        filtered.push({
          head: s,
          count,
          hash: hash.copy(),
        });
      if (count === L.length) break;
      let Ie = normalizeContentBlocks(L[count]);
      if (n === undefined || Ae !== undefined) {
        if (count > 0) hash.update(",");
        hashRequestValue([hash], Ie);
        continue;
      }
      let hash_2 = hash.copy();
      if (count > 0) hash.update(",");
      let hash_3 = createHash("sha256");
      let { hasCacheControl } = hashRequestValue([hash, hash_3], Ie);
      if (hasCacheControl) {
        hash_3 = createHash("sha256");
        hashRequestValue([hash_3], Ie, {
          omitCacheControl: true,
        });
        if (count !== last?.count)
          filtered.push({
            head: s,
            count,
            hash: hash_2,
          });
      }
      mapped[count] = {
        copy: normalizeDeep(L[count]),
        hash: hash_3.digest("hex"),
        hasCacheControl,
      };
    }
    if (n !== undefined) {
      let filtered_2 = mapped.filter((Ae) => Ae !== undefined);
      if (filtered_2.length !== L.length)
        throw Error(
          "requestDigest bug: a message was not hashed, so this request is not recorded for replay",
        );
      S = {
        messages: filtered_2,
        prefixes: filtered,
      };
    }
    hash.update("]");
    h = true;
  }
  hash.update(`${h ? "" : s}${y ? "{}" : "}"}`);
  if (n !== undefined && S !== undefined) {
    n.messages = S.messages;
    n.prefixes = S.prefixes;
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
  has(e) {
    return this.hashes.has(e) || this.recordHashes.has(e);
  }
  successor(e) {
    let n = new RequestBlobStore();
    n.startMidFile();
    n.hasForkContextRef = this.hasForkContextRef;
    if (e) for (let recordHash of this.recordHashes) n.recordHashes.add(recordHash);
    return n;
  }
  noteLine(e) {
    this.hasLines = true;
    if (e.type === "fork-context-ref") {
      this.hasForkContextRef = true;
      return;
    }
    if (e.type === "system" && e.subtype === "compact_boundary") {
      this.hashes.clear();
      this.recordHashes.clear();
      this.run = undefined;
      this.startMidFile();
      return;
    }
    if (e.type === "api-request-shape" || e.type === "api-request-blob") {
      let y = e.type === "api-request-shape" ? e.shapeHash : e.hash;
      if (typeof y === "string") this.recordHashes.add(y);
      return;
    }
    if (e.type !== "user" && e.type !== "assistant") return;
    let message = e.message;
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
    let s =
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
      for (let y of s) {
        if (run.blocks > 0) run.hash.update(",");
        hashRequestValue([run.hash], y, {
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
function continuesBlob(e, role, id) {
  return e.role === role && (role === "user" || (id !== undefined && e.messageId === id));
}
//@ chunk-e6aww6q8.js:200628-200741 placement
function normalizeDeep(e) {
  if (Array.isArray(e)) return e.map(normalizeDeep);
  if (e === null || typeof e !== "object") return e;
  return xr(e, normalizeDeep);
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
function setMarkerTextWriter(e) {
  markerTextWriter = e;
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
function makeToolResultLookup(conversation, n) {
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
        results?.length === 1 && n(toolUseId) === toolResultDigest(results[0])
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
function replayTranscriptRequest(e) {
  try {
    let querySource = e.querySource;
    let r = classifyQuerySource(querySource);
    if (
      querySource === undefined ||
      (r !== "main" && r !== "subagent") ||
      markerTextWriter === undefined ||
      !markerTextWriter.canRecord() ||
      e.storageV5 !== undefined ||
      !isRequestBlobStoreEnabled()
    )
      return;
    let accountMemoryRecallAttachment = buildAccountMemoryRecallAttachment(
      getRootSession().host,
      e.conversation,
    );
    let h = {
      sessionId: getSessionId(),
      agentId: e.agentId,
      storageV5: e.storageV5,
    };
    let y;
    if (accountMemoryRecallAttachment.length > 0) {
      if (markerSnapshotCapturer === undefined) {
        logFeatureSad("transcript_request_replay", "laptop_memory_cutter_unregistered");
        return;
      }
      try {
        let Yt = markerTextWriter;
        y = markerSnapshotCapturer(
          accountMemoryRecallAttachment,
          e.params.messages,
          makeToolResultLookup(e.conversation, (qt) => Yt.storedToolResultDigest(h, qt)),
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
    let messages = y?.messages ?? e.params.messages;
    let requestReplay = streamFallbackWarning().requestReplay;
    let L = Array.isArray(e.params.system)
      ? e.params.system.filter((Yt) => !isBillingHeaderBlock(Yt))
      : e.params.system;
    let G = {
      ...(L !== undefined && {
        system: L,
      }),
      ...(e.params.tools !== undefined && {
        tools: e.params.tools,
      }),
    };
    let hash = createHash("sha256");
    hashRequestValue([hash], G, {
      omitCacheControl: true,
    });
    let Z = hash.digest("hex");
    if (requestReplay.unrecordableShapes.has(Z)) return;
    let Se = [];
    for (let [key, value] of Object.entries(e.readInjectedBody())) {
      if (UNHASHED_REQUEST_KEYS.has(key) || !(key in e.params)) continue;
      if (
        key !== "system" &&
        key !== "tools" &&
        key !== "messages" &&
        canonicalFingerprint(Reflect.get(e.params, key)) === canonicalFingerprint(value)
      ) {
        Se.push(key);
        continue;
      }
      logForDebugging(
        `Request not recorded for replay: it would write CLAUDE_CODE_EXTRA_BODY's "${key}" into the session file`,
      );
      logFeatureSad("transcript_request_replay", "extra_body_unrecordable");
      return;
    }
    let ke = {};
    for (let [key, value] of Object.entries(e.params))
      if (
        key !== "system" &&
        key !== "tools" &&
        key !== "messages" &&
        !UNHASHED_REQUEST_KEYS.has(key) &&
        !Se.includes(key) &&
        value !== undefined
      )
        ke[key] = stripCacheControl(value);
    let we = [];
    let Ee = {
      ...e.params,
      system: L,
      messages,
    };
    for (let Yt of Se) delete Ee[Yt];
    let Ae = requestReplay.hashMemos.get(e.stickyBetas);
    if (Ae === undefined) {
      Ae = {
        messages: [],
        prefixes: [],
      };
      requestReplay.hashMemos.set(e.stickyBetas, Ae);
    }
    let messages_2 = Ae.messages;
    let Me = digestRequestBody(Ee, Ae);
    let mapped = Ae.messages.map((message) => message.hash);
    let floored = Math.floor(Math.random() * messages.length);
    let lt = messages[floored];
    if (
      lt !== undefined &&
      Ae.messages[floored] === messages_2[floored] &&
      requestBodyHash(lt) !== mapped[floored]
    ) {
      requestReplay.hashMemos.delete(e.stickyBetas);
      logFeatureBad("transcript_request_replay", "stale_hash");
      return;
    }
    stripCacheControl_2(L, ["system"], we);
    stripCacheControl_2(e.params.tools, ["tools"], we);
    Ae.messages.forEach(({ hasCacheControl }, qt) => {
      if (hasCacheControl) stripCacheControl_2(messages[qt], ["messages", qt], we);
    });
    let Je = h.agentId ?? h.sessionId;
    let nt = requestReplay.chains.get(Je);
    let pt = nt?.sessionId === h.sessionId ? nt : undefined;
    let Et = 0;
    if (pt !== undefined) {
      let min = Math.min(pt.lastHashes.length, mapped.length);
      while (Et < min && pt.lastHashes[Et] === mapped[Et]) Et++;
    }
    let yt = randomUUID();
    let request = {
      type: "api-request",
      sessionId: h.sessionId,
      ...(h.agentId !== undefined && {
        agentId: h.agentId,
      }),
      id: yt,
      timestamp: new Date().toISOString(),
      version: BUILD_INFO,
      querySource,
      shapeHash: Z,
      params: ke,
      ...(Se.length > 0 && {
        withheld: Se,
      }),
      ...(Et > 0 &&
        pt !== undefined && {
          base: pt.lastId,
        }),
      keep: Et,
      tail: mapped.slice(Et),
      cacheControl: we,
      ...(y === undefined
        ? {
            requestDigest: Me,
          }
        : {
            cut: y.cut,
            cutRequestDigest: Me,
          }),
    };
    let At = {
      target: h,
      shapeHash: Z,
      shape: G,
      blobCandidates: messages.slice(Et).map((message, qt) => ({
        hash: mapped[Et + qt],
        message: stripCacheControl(message),
      })),
      request,
    };
    let chainClears = requestReplay.chainClears;
    markerTextWriter.append(At).then(
      (Yt) => {
        if (Yt === "written") {
          if (requestReplay.chainClears === chainClears && getSessionId() === h.sessionId) {
            requestReplay.chains.delete(Je);
            requestReplay.chains.set(Je, {
              lastId: yt,
              lastHashes: mapped,
              sessionId: h.sessionId,
            });
            if (requestReplay.chains.size > MAX_SECRET_REDACT_CHARS)
              requestReplay.chains.delete(requestReplay.chains.keys().next().value);
          }
          return;
        }
        if (Yt === "shape_too_large") requestReplay.unrecordableShapes.add(Z);
        logFeatureSad("transcript_request_replay", Yt);
      },
      (error) => {
        logError(error);
        logFeatureBad("transcript_request_replay", "write_threw");
      },
    );
    return yt;
  } catch (error) {
    logError(error);
    logFeatureBad("transcript_request_replay", "capture_threw");
    return;
  }
}
//@ chunk-e6aww6q8.js:205756-205981 placement = stripCacheControl (0.795)
function stripCacheControl_2(e, n, r) {
  if (Array.isArray(e)) {
    e.forEach((s, h) => stripCacheControl_2(s, [...n, h], r));
    return;
  }
  if (e === null || typeof e !== "object") return;
  for (let [key, value] of Object.entries(e))
    if (key === "cache_control")
      r.push({
        path: n,
        value,
      });
    else stripCacheControl_2(value, [...n, key], r);
}
//@ chunk-e6aww6q8.js:227298-227341 placement
var API_REQUEST = "api-request";
var API_REQUEST_MARKER = `"type":"${API_REQUEST}`;
//@ chunk-e6aww6q8.js:227341-227449 placement
/**
 * 逐行处理转录文本，丢弃 API 请求记录并替换不可识别的行。
 */
function redactTranscriptLines(e) {
  let n = [];
  for (let line of e.split(`
`)) {
    let s = redactTranscriptLine(line);
    if (s !== undefined) n.push(s);
  }
  return n.join(`
`);
}
//@ chunk-e6aww6q8.js:227449-227793 placement
/**
 * 处理转录文件中的一行：去掉开头的 NUL/BOM；空行原样保留；API 请求类记录直接丢弃；无法识别类型或含敏感标记的行替换为只记字节数的 line-withheld 占位。
 */
function redactTranscriptLine(line) {
  let n = 0;
  while (line.charCodeAt(n) === 0 || line.charCodeAt(n) === 65279) n++;
  let r = n > 0 ? line.slice(n) : line;
  if (r.trim() === "") return line;
  let s;
  try {
    s = jsonParseRaw(r);
  } catch {
    s = undefined;
  }
  let h = isPlainObject_5(s) ? s.type : undefined;
  if (typeof h === "string" && h.startsWith(API_REQUEST)) return;
  if (typeof h !== "string" || line.includes(API_REQUEST_MARKER))
    return jsonStringify({
      type: "line-withheld",
      bytes: Buffer.byteLength(line),
    });
  return line;
}
//@ chunk-1fgvxqz2.js:269-410 placement
/**
 * 把请求体按规范顺序写入哈希器（可忽略 cache_control），返回其中是否出现过 cache_control。
 */
function hashRequestValue(hashes, value, { omitCacheControl: s = false } = {}) {
  let o = new HashFeeder(hashes);
  let i = {
    cacheControl: false,
  };
  feedCanonicalJson(value, o, s, i);
  o.flush();
  return {
    hasCacheControl: i.cacheControl,
  };
}
//@ chunk-1fgvxqz2.js:700-915 placement
/**
 * 递归删除对象中的 cache_control 键和值为 undefined 的键，用于比对或重放请求。
 */
function stripCacheControl(n) {
  if (Array.isArray(n)) return n.map(stripCacheControl);
  if (n !== null && typeof n === "object")
    return Object.fromEntries(
      Object.entries(n)
        .filter(([key, value]) => key !== "cache_control" && value !== undefined)
        .map(([key, value]) => [key, stripCacheControl(value)]),
    );
  return n;
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
