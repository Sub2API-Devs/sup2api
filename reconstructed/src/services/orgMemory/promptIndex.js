/**
 * services/orgMemory/promptIndex.ts
 *
 * 记忆提示词索引（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (21)
 * attribution: placement 21
 */
import { MemoryStoreClient, Pk } from "./storeApi.js";
import { getOrgMemoryAuthorization } from "./credential.js";
import { count } from "../../utils/collections.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { af } from "../../memdir/memoryStoresPrompt.js";
import { hasMemoryApiOverride } from "../../utils/teleport/api.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { parseMemoryStoresEnv, isValidRelativeSegments } from "./memoryStores.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { Qpe, memorySyncAvailability, ha, isMultiStoreSyncAvailable } from "../memorySync/availability.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getStoreScopeLabel } from "./storeLabels.js";
import { withTimeout } from "../../utils/sleep.js";
import { getEnabledSettingSources } from "../../utils/settings/constants.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";

//@ chunk-82kqcve8.js:74945-75035 placement
function E9r(e, n, r) {
  return new MemoryStoreClient(
    { ...e, mode: n ? "rw" : "ro", mount: r },
    { getAuthorization: getOrgMemoryAuthorization },
  );
}
/**
 * 替换文本块内容；内容变化且带有需剔除的引用时一并去掉这些引用。
 */
//@ chunk-82kqcve8.js:75035-75202 placement
function withCitationsDropped(e, n) {
  if (n === e.text) return e;
  return Array.isArray(e.citations) && e.citations.some(Ra)
    ? { ...e, text: n, citations: e.citations.filter((citation) => !Ra(citation)) }
    : { ...e, text: n };
}
//@ chunk-82kqcve8.js:75202-75272 placement
function Ra(e) {
  return typeof e === "object" && e !== null && "span_start" in e;
}
//@ chunk-82kqcve8.js:75272-75621 placement
var TENGU_SALT_MARSH = "tengu_salt_marsh",
  Pa = ["cc-memory", "cc_memory", "ccmemory", "CC-MEMORY", "CC_MEMORY", "CCMEMORY"],
  Ma = `(?:${Pa.join("|")})`,
  Pm = `(?:${Pa.flatMap((e) => Array.from(e, (n, r) => e.slice(0, r + 1))).join("|")})`,
  Ca = "[^>]{0,1024}",
  regExp = new RegExp(`</?${Ma}(?=[\\s/>])${Ca}>`, "g"),
  regExp_2 = new RegExp(`</?(?:${Ma}(?![^\\s/>])${Ca}|${Pm})$`),
  Aa = /\bfilenames="([^"]*)"/i;
//@ chunk-82kqcve8.js:75621-75660 placement
function Cb(e) {
  return e.replace(regExp, "");
}
/**
 * 统计文本中的记忆引用标签：开闭标签数、标签内字符数、引用的记忆文件数、缺少 filenames 属性的情况与开标签字符数分桶，并返回去掉标签后的文本。
 */
//@ chunk-82kqcve8.js:75660-76406 placement
function measureMemoryTags(e) {
  let n = [...e.matchAll(regExp)],
    filtered = n.filter((w) => !w[0].startsWith("</")),
    reduced = filtered.reduce((w, S) => w + S[0].length, 0),
    mapped = filtered.map((w) => w[0].match(Aa)),
    { taggedContentChars: taggedContentChars } = n.reduce(
      (w, S) => {
        if (!S[0].startsWith("</"))
          return w.openAt === null
            ? { taggedContentChars: w.taggedContentChars, openAt: S.index + S[0].length }
            : w;
        if (w.openAt === null) return w;
        return { taggedContentChars: w.taggedContentChars + (S.index - w.openAt), openAt: null };
      },
      { taggedContentChars: 0, openAt: null },
    );
  return {
    text: e.replace(regExp, ""),
    openTagCount: filtered.length,
    closeTagCount: n.length - filtered.length,
    taggedContentChars: taggedContentChars,
    memoryFileCount: mapped.reduce(
      (w, S) => w + (S === null ? 0 : count((S[1] ?? "").split(","), (R) => R.trim() !== "")),
      0,
    ),
    missingFilenamesAttr: mapped.some((w) => w === null),
    openTagCharsBucket: reduced === 0 ? 0 : 2 ** Math.ceil(Math.log2(reduced)),
  };
}
//@ chunk-82kqcve8.js:76406-76417 placement
var $o = 300;
//@ chunk-82kqcve8.js:76417-76527 placement
function extractCitedSentence(e) {
  let n = e.length > $o,
    trimmed = Cb(truncateToLength(e, $o)).replace(regExp_2, "").trim();
  return { sentence: n ? `${trimmed}\u2026` : trimmed, cut: n };
}
//@ chunk-82kqcve8.js:76527-76537 placement
var Cm = 32;
/**
 * 统计记忆引用标签中的文件解析结果：已解析/未知、读/写、正文注入、浮现与列出的数量。
 */
//@ chunk-82kqcve8.js:76537-76898 placement
function classifyCitedMemories(e, n) {
  let mapped = [...e.matchAll(regExp)]
      .filter((h) => !h[0].startsWith("</"))
      .flatMap((h) => parseTagFilenames(h[0]))
      .slice(0, Cm)
      .map(n),
    s = count(mapped, (h) => h.resolved);
  return {
    resolved: s,
    unknown: mapped.length - s,
    read: count(mapped, (h) => h.read),
    written: count(mapped, (h) => h.written),
    injectedBody: count(mapped, (h) => h.injection === "body"),
    surfaced: count(mapped, (h) => h.injection === "surfaced"),
    listed: count(mapped, (h) => h.injection === "listed"),
  };
}
//@ chunk-82kqcve8.js:76898-77019 placement
function parseTagFilenames(e) {
  let match = e.match(Aa);
  if (match === null) return [];
  return (match[1] ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r !== "");
}
/**
 * 从文本中抽取记忆引用：每对标签内的句子（过长截断）及其文件名，未闭合的标签也取一段并标为不完整。
 */
//@ chunk-82kqcve8.js:77019-77440 placement
function extractMemoryCitations(e) {
  let n = [],
    r = null,
    s = [];
  for (let h of e.matchAll(regExp)) {
    if (!h[0].startsWith("</")) {
      if (r === null) ((r = h.index + h[0].length), (s = parseTagFilenames(h[0])));
      continue;
    }
    if (r === null) continue;
    let { sentence: sentence, cut: cut } = extractCitedSentence(e.slice(r, h.index));
    if (sentence !== "" && sentence !== "\u2026")
      n.push({ sentence: sentence, filenames: s, incomplete: cut });
    r = null;
  }
  if (r !== null) {
    let { sentence: sentence } = extractCitedSentence(e.slice(r, r + $o + 1));
    if (sentence !== "" && sentence !== "\u2026")
      n.push({ sentence: sentence, filenames: s, incomplete: !0 });
  }
  return n;
}
/**
 * 去掉文本与 thinking 块中的记忆标签，无变化时返回原数组。
 */
//@ chunk-82kqcve8.js:77440-77652 placement
function stripMemoryTagsFromBlocks(e) {
  let mapped = e.map((r) => {
    if (r.type === "text") return withCitationsDropped(r, Cb(r.text));
    if (r.type === "thinking") {
      let s = Cb(r.thinking);
      return s === r.thinking ? r : { ...r, thinking: s };
    }
    return r;
  });
  return mapped.every((r, s) => r === e[s]) ? e : mapped;
}
//@ chunk-82kqcve8.js:121911-121992 placement
function Uo() {
  if (!isAutoMemoryEnabled()) return !1;
  if (isEssentialTrafficOnly()) return !1;
  return getSessionIngressAuthToken() !== null || af() || hasMemoryApiOverride();
}
//@ chunk-82kqcve8.js:121992-122013 placement
var Va = 5000,
  lf = 60000;
/**
 * 记忆提示索引缓存：同一 key 复用请求结果；结果条目不足上限时设置重试时间，到期后重新请求。
 */
//@ chunk-82kqcve8.js:122013-122331 placement
class PromptIndexCache {
  current = null;
  entriesFor(e, n, r) {
    let s =
      this.current?.key === e && this.current.retryAtMs !== void 0 && Date.now() >= this.current.retryAtMs;
    if (this.current?.key !== e || s) {
      let h = { key: e, entries: r() };
      ((h.entries = h.entries.then((y) => {
        if (y.length < n) h.retryAtMs = Date.now() + lf;
        return y;
      })),
        (this.current = h));
    }
    return this.current.entries;
  }
}
//@ chunk-82kqcve8.js:122331-122378 placement
var cf = new HostScoped(() => new PromptIndexCache()),
  df = new HostScoped(() => new Map());
//@ chunk-82kqcve8.js:122378-123076 placement
async function readMemoryPromptIndexConfig(e = Va, n = {}) {
  let r;
  try {
    r = parseMemoryStoresEnv();
  } catch (error) {
    return (
      logForDebugging(`memory-prompt-index: parseMemoryStoresEnv failed: ${errorMessage(error)}`, {
        level: "debug",
      }),
      []
    );
  }
  let s = r ?? (n.serveConnectedStores ? [...Qpe()] : null);
  if (s === null) return [];
  let filtered = s.filter((L) => L.promptIndex !== void 0);
  if (filtered.length === 0) return [];
  let y = memorySyncAvailability();
  if (y !== "open")
    return (logFeatureSad("memory_prompt_index", y === "held" ? "policy_pending" : "unavailable"), []);
  let host = getRootSession().host,
    S = r === null,
    R = S ? null : df.of(host),
    O = async () =>
      (await Promise.allSettled(filtered.map((j) => fetchMemoryPromptIndex(j, e, R)))).flatMap((j) =>
        j.status === "fulfilled" && j.value !== null ? [j.value] : [],
      );
  if (!S) return O();
  let joined = [ha() ?? "", ...filtered.map((L) => `${L.path} ${L.mode} ${L.promptIndex}`)].join(`
`);
  return cf.of(host).entriesFor(joined, filtered.length, O);
}
//@ chunk-82kqcve8.js:123076-123752 placement
async function fetchMemoryPromptIndex(e, n, r) {
  let promptIndex = e.promptIndex;
  if (!isValidRelativeSegments(promptIndex))
    return (logFeatureSad("memory_prompt_index", "unsafe_path"), null);
  let h = r === null ? E9r(e, !1, getStoreScopeLabel(e)) : new MemoryStoreClient(e, void 0, r);
  try {
    let y = await withTimeout(h.readByPath(Pk(promptIndex)), n, `promptIndex fetch for ${e.mount}`);
    if (y === null)
      return (
        logForDebugging(`memory-prompt-index[${e.mount}]: ${promptIndex} not found`, { level: "debug" }),
        logFeatureOk("memory_prompt_index"),
        { mount: e.mount, promptIndex: promptIndex, content: "" }
      );
    return (
      logFeatureOk("memory_prompt_index"),
      { mount: e.mount, promptIndex: promptIndex, content: y.content }
    );
  } catch (error) {
    let w = errorMessage(error),
      S = w.includes(`promptIndex fetch for ${e.mount}`) ? "timeout" : "error";
    return (
      logFeatureSad("memory_prompt_index", S),
      logForDebugging(`memory-prompt-index[${e.mount}]: fetch failed (${S}): ${w}`, { level: "debug" }),
      null
    );
  }
}
/**
 * 加载记忆存储的提示索引：存储有索引且多存储同步可用时拉取，失败返回 null。
 */
//@ chunk-82kqcve8.js:123752-123931 placement
async function loadStorePromptIndex(e, n = {}) {
  if (e.promptIndex === void 0 || !isMultiStoreSyncAvailable()) return null;
  let r = await fetchMemoryPromptIndex(e, n.timeoutMs ?? Va, null);
  return r === null ? null : { content: r.content, promptIndex: r.promptIndex };
}
//@ chunk-82kqcve8.js:123963-124030 placement
function Qa(e) {
  return getEnabledSettingSources().some((n) => getSettingsForSource(n)?.permissions?.[e] === !0);
}

export {
  Cb,
  TENGU_SALT_MARSH,
  stripMemoryTagsFromBlocks,
  measureMemoryTags,
  classifyCitedMemories,
  withCitationsDropped,
  extractMemoryCitations,
  Uo,
  Qa,
  readMemoryPromptIndexConfig,
  E9r,
  loadStorePromptIndex,
};
