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
import {
  createHash,
  createHash as createHash_2,
  createHash as createHash_3,
  createHash as createHash_4,
  createHash as createHash_5,
  createHash as createHash_6,
  createHash as createHash_7,
  createHash as createHash_8,
  createHash as createHash_9,
  createHash as createHash_10,
  createHash as createHash_11,
  createHash as createHash_12,
  createHash as createHash_13,
  createHash as createHash_14,
  createHash as createHash_15,
  createHash as createHash_16,
  createHash as createHash_17,
  createHash as createHash_18,
  createHash as createHash_19,
  createHash as createHash_20,
  createHash as createHash_21,
  createHash as createHash_22,
  createHash as createHash_23,
  createHash as createHash_24,
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
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { Xq, HashFeeder, feedCanonicalJson } from "../services/api/requestFingerprint.js";
import { xr } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { env } from "./env.js";
import { getFeatureValue_SESSION_PINNED } from "../services/analytics/growthbook.js";
import { Ws } from "../services/api/streamFallbackWarning.js";
import { classifyQuerySource } from "../services/api/requestHeaders.js";
import { buildAccountMemoryRecallAttachment } from "../services/accountMemory/memoryContext.js";
import { getRootSession, getSessionId } from "../bootstrap/state.js";
import { logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { logForDebugging } from "./debug.js";
import { isBillingHeaderBlock } from "../services/api/promptCacheBreakDetection.js";
import { BUILD_INFO, Cdo } from "../constants/buildInfo.js";
import { logError } from "./log.js";
import { jsonParseRaw, jsonStringify } from "./slowOperations.js";
import { isPlainObject as isPlainObject_4 } from "./isPlainObject.js";

//@ chunk-e6aww6q8.js:196638-196713 placement
var vue = new Set(["metadata", "stream", "thread", "diagnostics", "safeguards"]);
//@ chunk-e6aww6q8.js:196713-196812 placement
function aRt(e) {
  return typeof e.content === "string" ? { ...e, content: [{ type: "text", text: e.content }] } : e;
}
//@ chunk-e6aww6q8.js:196812-196847 placement
function dRt(e) {
  return hashRequestBody(e).hash;
}
//@ chunk-e6aww6q8.js:196847-196987 placement
function hashRequestBody(e) {
  let n = createHash_2("sha256"),
    { hasCacheControl: hasCacheControl } = hashRequestValue([n], aRt(e), { omitCacheControl: !0 });
  return { hash: n.digest("hex"), hasCacheControl: hasCacheControl };
}
//@ chunk-e6aww6q8.js:196987-197084 placement
function L$e(e) {
  let n = createHash_2("sha256");
  return (hashRequestValue([n], e ?? null, { omitCacheControl: !0 }), n.digest("hex"));
}
/**
 * 取出用户消息中各工具结果的 tool_use_id 与内容摘要。
 */
//@ chunk-e6aww6q8.js:197084-197306 placement
function getToolResultDigests(e) {
  let n = e.type === "user" ? e.message?.content : void 0;
  if (!Array.isArray(n)) return [];
  return n
    .filter((r) => r?.type === "tool_result")
    .flatMap((r) => (typeof r.tool_use_id === "string" ? [[r.tool_use_id, L$e(r.content)]] : []));
}
/**
 * 计算请求体摘要（逐条消息 sha256），用于转录中的请求重放。
 */
//@ chunk-e6aww6q8.js:197306-198902 placement
function digestRequestBody(e, n) {
  if (n !== void 0 && !Array.isArray(e.messages))
    throw TypeError("requestDigest: a memo needs body.messages to be an array");
  let r = createHash_2("sha256"),
    s = "",
    h = !1,
    y = !0,
    S;
  for (let w of Object.keys(e).sort()) {
    let L = e[w];
    if (vue.has(w) || L === void 0) continue;
    let G = `${y ? "{" : ","}${JSON.stringify(w)}:`;
    if (((y = !1), w !== "messages" || !Array.isArray(L))) {
      if (h) (r.update(G), hashRequestValue([r], L));
      else s += `${G}${Xq(L)}`;
      continue;
    }
    s += `${G}[`;
    let q = 0,
      mapped = L.map((Ee, Ae) => {
        let Ie = n?.messages[Ae];
        if (Ie === void 0 || !isDeepStrictEqual_2(Ie.copy, Ee)) return;
        if (q === Ae) q++;
        return Ie;
      }),
      Se = n?.prefixes.filter((Ee) => Ee.count <= q && Ee.head === s) ?? [],
      at = Se.at(-1);
    r = at === void 0 ? r.update(s) : at.hash.copy();
    let filtered = Se.filter((Ee) => Ee === at || mapped[Ee.count]?.hasCacheControl === !0);
    for (let Ee = at?.count ?? 0; ; Ee++) {
      let Ae = mapped[Ee];
      if (n !== void 0 && Ee !== at?.count && (Ee === L.length || Ae?.hasCacheControl === !0))
        filtered.push({ head: s, count: Ee, hash: r.copy() });
      if (Ee === L.length) break;
      let Ie = aRt(L[Ee]);
      if (n === void 0 || Ae !== void 0) {
        if (Ee > 0) r.update(",");
        hashRequestValue([r], Ie);
        continue;
      }
      let copy = r.copy();
      if (Ee > 0) r.update(",");
      let We = createHash_2("sha256"),
        { hasCacheControl: hasCacheControl } = hashRequestValue([r, We], Ie);
      if (hasCacheControl) {
        if (
          ((We = createHash_2("sha256")),
          hashRequestValue([We], Ie, { omitCacheControl: !0 }),
          Ee !== at?.count)
        )
          filtered.push({ head: s, count: Ee, hash: copy });
      }
      mapped[Ee] = { copy: normalizeDeep(L[Ee]), hash: We.digest("hex"), hasCacheControl: hasCacheControl };
    }
    if (n !== void 0) {
      let filtered_2 = mapped.filter((Ae) => Ae !== void 0);
      if (filtered_2.length !== L.length)
        throw Error(
          "requestDigest bug: a message was not hashed, so this request is not recorded for replay",
        );
      S = { messages: filtered_2, prefixes: filtered };
    }
    (r.update("]"), (h = !0));
  }
  if ((r.update(`${h ? "" : s}${y ? "{}" : "}"}`), n !== void 0 && S !== void 0))
    ((n.messages = S.messages), (n.prefixes = S.prefixes));
  return r.digest("hex");
}
/**
 * 转录中请求体块的存储（fork 上下文引用、请求形状、请求块）。
 */
//@ chunk-e6aww6q8.js:198902-200547 placement
class RequestBlobStore {
  hashes = new Set();
  recordHashes = new Set();
  hasForkContextRef = !1;
  priming = !1;
  startMidFile() {
    this.priming = !0;
  }
  run;
  hasLines = !1;
  get size() {
    return this.hashes.size + this.recordHashes.size;
  }
  has(e) {
    return this.hashes.has(e) || this.recordHashes.has(e);
  }
  successor(e) {
    let n = new RequestBlobStore();
    if ((n.startMidFile(), (n.hasForkContextRef = this.hasForkContextRef), e))
      for (let recordHashe of this.recordHashes) n.recordHashes.add(recordHashe);
    return n;
  }
  noteLine(e) {
    if (((this.hasLines = !0), e.type === "fork-context-ref")) {
      this.hasForkContextRef = !0;
      return;
    }
    if (e.type === "system" && e.subtype === "compact_boundary") {
      (this.hashes.clear(), this.recordHashes.clear(), (this.run = void 0), this.startMidFile());
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
      ((this.run = void 0), (this.priming = !1));
      return;
    }
    let r = typeof message.id === "string" ? message.id : void 0;
    if (this.priming !== !1) {
      let priming = this.priming;
      if (
        ((this.priming = { role: message.role, messageId: r }),
        priming === !0 || iRt(priming, message.role, r))
      )
        return;
      this.priming = !1;
    }
    let s =
      typeof message.content === "string"
        ? [{ type: "text", text: message.content }]
        : Array.isArray(message.content)
          ? message.content
          : [message.content];
    if (this.run === void 0 || !iRt(this.run, message.role, r))
      ((this.run = { role: message.role, messageId: r, hash: void 0, blocks: 0 }),
        (this.run.hash = createHash_2("sha256").update('{"content":[')));
    let run = this.run;
    if (run.hash === void 0) return;
    try {
      for (let y of s) {
        if (run.blocks > 0) run.hash.update(",");
        (hashRequestValue([run.hash], y, { omitCacheControl: !0 }), run.blocks++);
      }
    } catch (error) {
      throw ((run.hash = void 0), error);
    }
    this.hashes.add(
      run.hash
        .copy()
        .update(`],"role":${Xq(message.role)}}`)
        .digest("hex"),
    );
  }
}
//@ chunk-e6aww6q8.js:200547-200628 placement
function iRt(e, n, r) {
  return e.role === n && (n === "user" || (r !== void 0 && e.messageId === r));
}
//@ chunk-e6aww6q8.js:200628-200741 placement
function normalizeDeep(e) {
  if (Array.isArray(e)) return e.map(normalizeDeep);
  if (e === null || typeof e !== "object") return e;
  return xr(e, normalizeDeep);
}
/**
 * 判断请求正文旁存功能是否开启（环境变量优先，否则按会话固定开关）。
 */
//@ chunk-e6aww6q8.js:201798-201907 placement
function isRequestBlobStoreEnabled() {
  let CLAUDE_CODE_ELEGANT_MEADOW = env.CLAUDE_CODE_ELEGANT_MEADOW;
  if (CLAUDE_CODE_ELEGANT_MEADOW !== void 0) return CLAUDE_CODE_ELEGANT_MEADOW;
  return getFeatureValue_SESSION_PINNED("tengu_elegant_meadow", !0);
}
//@ chunk-e6aww6q8.js:201907-201932 placement
class Gbt extends Error {}
//@ chunk-e6aww6q8.js:201932-201940 placement
var N$e;
//@ chunk-e6aww6q8.js:201940-201962 placement
function FVs(e) {
  N$e = e;
}
//@ chunk-e6aww6q8.js:201962-201969 placement
var _9;
//@ chunk-e6aww6q8.js:201969-201990 placement
function fRt(e) {
  _9 = e;
}
//@ chunk-e6aww6q8.js:201990-202066 placement
function UVs(e) {
  let requestReplay = Ws().requestReplay;
  (requestReplay.chains.delete(e), requestReplay.chainClears++);
}
//@ chunk-e6aww6q8.js:202066-202138 placement
function b9() {
  let requestReplay = Ws().requestReplay;
  (requestReplay.chains.clear(), requestReplay.chainClears++);
}
/**
 * 构造按 tool_use_id 查找工具结果内容的函数：首次调用时建立索引；只有唯一结果且摘要与预期一致时返回内容，结果带缓存。
 */
//@ chunk-e6aww6q8.js:202138-202516 placement
function makeToolResultLookup(e, n) {
  let resultsById,
    cache = new Map();
  return (toolUseId) => {
    if (!cache.has(toolUseId)) {
      if (resultsById === void 0) {
        resultsById = new Map();
        for (let message of e)
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
        results?.length === 1 && n(toolUseId) === L$e(results[0]) ? { content: results[0] } : void 0,
      );
    }
    return cache.get(toolUseId);
  };
}
/**
 * 从转录重放请求（主线程或子代理），记录无法重放的原因。
 */
//@ chunk-e6aww6q8.js:202516-205756 placement
function replayTranscriptRequest(e) {
  try {
    let querySource = e.querySource,
      r = classifyQuerySource(querySource);
    if (
      querySource === void 0 ||
      (r !== "main" && r !== "subagent") ||
      _9 === void 0 ||
      !_9.canRecord() ||
      e.storageV5 !== void 0 ||
      !isRequestBlobStoreEnabled()
    )
      return;
    let s = buildAccountMemoryRecallAttachment(getRootSession().host, e.conversation),
      h = { sessionId: getSessionId(), agentId: e.agentId, storageV5: e.storageV5 },
      y;
    if (s.length > 0) {
      if (N$e === void 0) {
        logFeatureSad("transcript_request_replay", "laptop_memory_cutter_unregistered");
        return;
      }
      try {
        let Yt = _9;
        y = N$e(
          s,
          e.params.messages,
          makeToolResultLookup(e.conversation, (qt) => Yt.storedToolResultDigest(h, qt)),
        );
      } catch (error) {
        if (!(error instanceof Gbt)) throw error;
        (logForDebugging(error.message, { level: "warn" }),
          logFeatureSad("transcript_request_replay", "cut_refused"));
        return;
      }
    }
    let S = y?.messages ?? e.params.messages,
      requestReplay = Ws().requestReplay,
      L = Array.isArray(e.params.system)
        ? e.params.system.filter((Yt) => !isBillingHeaderBlock(Yt))
        : e.params.system,
      G = { ...(L !== void 0 && { system: L }), ...(e.params.tools !== void 0 && { tools: e.params.tools }) },
      q = createHash_3("sha256");
    hashRequestValue([q], G, { omitCacheControl: !0 });
    let digest = q.digest("hex");
    if (requestReplay.unrecordableShapes.has(digest)) return;
    let Se = [];
    for (let [Yt, qt] of Object.entries(e.readInjectedBody())) {
      if (vue.has(Yt) || !(Yt in e.params)) continue;
      if (
        Yt !== "system" &&
        Yt !== "tools" &&
        Yt !== "messages" &&
        Xq(Reflect.get(e.params, Yt)) === Xq(qt)
      ) {
        Se.push(Yt);
        continue;
      }
      (logForDebugging(
        `Request not recorded for replay: it would write CLAUDE_CODE_EXTRA_BODY's "${Yt}" into the session file`,
      ),
        logFeatureSad("transcript_request_replay", "extra_body_unrecordable"));
      return;
    }
    let ke = {};
    for (let [Yt, qt] of Object.entries(e.params))
      if (
        Yt !== "system" &&
        Yt !== "tools" &&
        Yt !== "messages" &&
        !vue.has(Yt) &&
        !Se.includes(Yt) &&
        qt !== void 0
      )
        ke[Yt] = stripCacheControl_4(qt);
    let we = [],
      Ee = { ...e.params, system: L, messages: S };
    for (let Yt of Se) delete Ee[Yt];
    let Ae = requestReplay.hashMemos.get(e.stickyBetas);
    if (Ae === void 0)
      ((Ae = { messages: [], prefixes: [] }), requestReplay.hashMemos.set(e.stickyBetas, Ae));
    let messages = Ae.messages,
      Me = digestRequestBody(Ee, Ae),
      mapped = Ae.messages.map((message) => message.hash),
      floored = Math.floor(Math.random() * S.length),
      lt = S[floored];
    if (lt !== void 0 && Ae.messages[floored] === messages[floored] && dRt(lt) !== mapped[floored]) {
      (requestReplay.hashMemos.delete(e.stickyBetas),
        logFeatureBad("transcript_request_replay", "stale_hash"));
      return;
    }
    (stripCacheControl_2(L, ["system"], we),
      stripCacheControl_2(e.params.tools, ["tools"], we),
      Ae.messages.forEach(({ hasCacheControl: hasCacheControl }, qt) => {
        if (hasCacheControl) stripCacheControl_2(S[qt], ["messages", qt], we);
      }));
    let Je = h.agentId ?? h.sessionId,
      nt = requestReplay.chains.get(Je),
      pt = nt?.sessionId === h.sessionId ? nt : void 0,
      Et = 0;
    if (pt !== void 0) {
      let min = Math.min(pt.lastHashes.length, mapped.length);
      while (Et < min && pt.lastHashes[Et] === mapped[Et]) Et++;
    }
    let yt = randomUUID_5(),
      gt = {
        type: "api-request",
        sessionId: h.sessionId,
        ...(h.agentId !== void 0 && { agentId: h.agentId }),
        id: yt,
        timestamp: new Date().toISOString(),
        version: BUILD_INFO,
        querySource: querySource,
        shapeHash: digest,
        params: ke,
        ...(Se.length > 0 && { withheld: Se }),
        ...(Et > 0 && pt !== void 0 && { base: pt.lastId }),
        keep: Et,
        tail: mapped.slice(Et),
        cacheControl: we,
        ...(y === void 0 ? { requestDigest: Me } : { cut: y.cut, cutRequestDigest: Me }),
      },
      At = {
        target: h,
        shapeHash: digest,
        shape: G,
        blobCandidates: S.slice(Et).map((Yt, qt) => ({
          hash: mapped[Et + qt],
          message: stripCacheControl_4(Yt),
        })),
        request: gt,
      },
      chainClears = requestReplay.chainClears;
    return (
      _9.append(At).then(
        (Yt) => {
          if (Yt === "written") {
            if (requestReplay.chainClears === chainClears && getSessionId() === h.sessionId) {
              if (
                (requestReplay.chains.delete(Je),
                requestReplay.chains.set(Je, { lastId: yt, lastHashes: mapped, sessionId: h.sessionId }),
                requestReplay.chains.size > Cdo)
              )
                requestReplay.chains.delete(requestReplay.chains.keys().next().value);
            }
            return;
          }
          if (Yt === "shape_too_large") requestReplay.unrecordableShapes.add(digest);
          logFeatureSad("transcript_request_replay", Yt);
        },
        (Yt) => {
          (logError(Yt), logFeatureBad("transcript_request_replay", "write_threw"));
        },
      ),
      yt
    );
  } catch (error) {
    (logError(error), logFeatureBad("transcript_request_replay", "capture_threw"));
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
  for (let [s, h] of Object.entries(e))
    if (s === "cache_control") r.push({ path: n, value: h });
    else stripCacheControl_2(h, [...n, s], r);
}
//@ chunk-e6aww6q8.js:227298-227341 placement
var API_REQUEST = "api-request",
  iuo = `"type":"${API_REQUEST}`;
/**
 * 逐行处理转录文本，丢弃 API 请求记录并替换不可识别的行。
 */
//@ chunk-e6aww6q8.js:227341-227449 placement
function redactTranscriptLines(e) {
  let n = [];
  for (let r of e.split(`
`)) {
    let s = redactTranscriptLine(r);
    if (s !== void 0) n.push(s);
  }
  return n.join(`
`);
}
/**
 * 处理转录文件中的一行：去掉开头的 NUL/BOM；空行原样保留；API 请求类记录直接丢弃；无法识别类型或含敏感标记的行替换为只记字节数的 line-withheld 占位。
 */
//@ chunk-e6aww6q8.js:227449-227793 placement
function redactTranscriptLine(e) {
  let n = 0;
  while (e.charCodeAt(n) === 0 || e.charCodeAt(n) === 65279) n++;
  let r = n > 0 ? e.slice(n) : e;
  if (r.trim() === "") return e;
  let s;
  try {
    s = jsonParseRaw(r);
  } catch {
    s = void 0;
  }
  let h = isPlainObject_4(s) ? s.type : void 0;
  if (typeof h === "string" && h.startsWith(API_REQUEST)) return;
  if (typeof h !== "string" || e.includes(iuo))
    return jsonStringify({ type: "line-withheld", bytes: Buffer.byteLength(e) });
  return e;
}
/**
 * 把请求体按规范顺序写入哈希器（可忽略 cache_control），返回其中是否出现过 cache_control。
 */
//@ chunk-1fgvxqz2.js:269-410 placement
function hashRequestValue(hashes, value, { omitCacheControl: s = !1 } = {}) {
  let o = new HashFeeder(hashes),
    i = { cacheControl: !1 };
  return (feedCanonicalJson(value, o, s, i), o.flush(), { hasCacheControl: i.cacheControl });
}
/**
 * 递归删除对象中的 cache_control 键和值为 undefined 的键，用于比对或重放请求。
 */
//@ chunk-1fgvxqz2.js:700-915 placement
function stripCacheControl(n) {
  if (Array.isArray(n)) return n.map(stripCacheControl);
  if (n !== null && typeof n === "object")
    return Object.fromEntries(
      Object.entries(n)
        .filter(([t, s]) => t !== "cache_control" && s !== void 0)
        .map(([t, s]) => [t, stripCacheControl(s)]),
    );
  return n;
}
const stripCacheControl_4 = stripCacheControl; //@ cross-chunk alias

export {
  UVs,
  RequestBlobStore,
  b9,
  isRequestBlobStoreEnabled,
  stripCacheControl,
  getToolResultDigests,
  fRt,
  FVs,
  Gbt,
  replayTranscriptRequest,
  redactTranscriptLines,
};
