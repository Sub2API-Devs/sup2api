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
import { MemoryStoreClient, normalizePathPrefix } from "./storeApi.js";
import { getOrgMemoryAuthorization } from "./credential.js";
import { count } from "../../utils/collections.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { canUseClaudeAiMemory } from "../../memdir/memoryStoresPrompt.js";
import { hasMemoryApiOverride } from "../../utils/teleport/api.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { parseMemoryStoresEnv, isValidRelativeSegments } from "./memoryStores.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import {
  readableOrgMemoryStores,
  memorySyncAvailability,
  orgMemoryIdentity,
  isMultiStoreSyncAvailable,
} from "../memorySync/availability.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getStoreScopeLabel } from "./storeLabels.js";
import { withTimeout } from "../../utils/sleep.js";
import { getEnabledSettingSources } from "../../utils/settings/constants.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";

//@ chunk-82kqcve8.js:74945-75035 placement
/**
 * 用给定模式与挂载名创建记忆库客户端。
 */
function makeStoreClient(e, n, mount) {
  return new MemoryStoreClient(
    {
      ...e,
      mode: n ? "rw" : "ro",
      mount,
    },
    {
      getAuthorization: getOrgMemoryAuthorization,
    },
  );
}
//@ chunk-82kqcve8.js:75035-75202 placement
/**
 * 替换文本块内容；内容变化且带有需剔除的引用时一并去掉这些引用。
 */
function withCitationsDropped(e, n) {
  if (n === e.text) return e;
  return Array.isArray(e.citations) && e.citations.some(isSpanCitation)
    ? {
        ...e,
        text: n,
        citations: e.citations.filter((citation) => !isSpanCitation(citation)),
      }
    : {
        ...e,
        text: n,
      };
}
//@ chunk-82kqcve8.js:75202-75272 placement
/**
 * 判断引用是否带 span_start（可定位的引用）。
 */
function isSpanCitation(citation) {
  return typeof citation === "object" && citation !== null && "span_start" in citation;
}
//@ chunk-82kqcve8.js:75272-75621 placement
/**
 * 提取 filenames 属性的正则。
 */
var TENGU_SALT_MARSH = "tengu_salt_marsh";
var MEMORY_TAG_VARIANTS = ["cc-memory", "cc_memory", "ccmemory", "CC-MEMORY", "CC_MEMORY", "CCMEMORY"];
var MEMORY_TAG_ALTERNATION = `(?:${MEMORY_TAG_VARIANTS.join("|")})`;
var MEMORY_TAG_PREFIXES = `(?:${MEMORY_TAG_VARIANTS.flatMap((e) => Array.from(e, (n, r) => e.slice(0, r + 1))).join("|")})`;
var TAG_ATTR_CHARS = "[^>]{0,1024}";
var regExp = new RegExp(`</?${MEMORY_TAG_ALTERNATION}(?=[\\s/>])${TAG_ATTR_CHARS}>`, "g");
var regExp_2 = new RegExp(
  `</?(?:${MEMORY_TAG_ALTERNATION}(?![^\\s/>])${TAG_ATTR_CHARS}|${MEMORY_TAG_PREFIXES})$`,
);
var FILENAMES_ATTR_RE = /\bfilenames="([^"]*)"/i;
//@ chunk-82kqcve8.js:75621-75660 placement
/**
 * 去掉文本里的记忆引用标签。
 */
function stripMemoryTags(e) {
  return e.replace(regExp, "");
}
//@ chunk-82kqcve8.js:75660-76406 placement
/**
 * 统计文本中的记忆引用标签：开闭标签数、标签内字符数、引用的记忆文件数、缺少 filenames 属性的情况与开标签字符数分桶，并返回去掉标签后的文本。
 */
function measureMemoryTags(source) {
  let n = [...source.matchAll(regExp)];
  let filtered = n.filter((w) => !w[0].startsWith("</"));
  let reduced = filtered.reduce((acc, S) => acc + S[0].length, 0);
  let mapped = filtered.map((w) => w[0].match(FILENAMES_ATTR_RE));
  let { taggedContentChars } = n.reduce(
    (acc, S) => {
      if (!S[0].startsWith("</"))
        return acc.openAt === null
          ? {
              taggedContentChars: acc.taggedContentChars,
              openAt: S.index + S[0].length,
            }
          : acc;
      if (acc.openAt === null) return acc;
      return {
        taggedContentChars: acc.taggedContentChars + (S.index - acc.openAt),
        openAt: null,
      };
    },
    {
      taggedContentChars: 0,
      openAt: null,
    },
  );
  return {
    text: source.replace(regExp, ""),
    openTagCount: filtered.length,
    closeTagCount: n.length - filtered.length,
    taggedContentChars,
    memoryFileCount: mapped.reduce(
      (acc, S) => acc + (S === null ? 0 : count((S[1] ?? "").split(","), (R) => R.trim() !== "")),
      0,
    ),
    missingFilenamesAttr: mapped.some((w) => w === null),
    openTagCharsBucket: reduced === 0 ? 0 : 2 ** Math.ceil(Math.log2(reduced)),
  };
}
//@ chunk-82kqcve8.js:76406-76417 placement
/**
 * 扫描标签时截取的最大字符数（300）。
 */
var MAX_SCANNED_TEXT_CHARS = 300;
//@ chunk-82kqcve8.js:76417-76527 placement
function extractCitedSentence(e) {
  let n = e.length > MAX_SCANNED_TEXT_CHARS;
  let trimmed = stripMemoryTags(truncateToLength(e, MAX_SCANNED_TEXT_CHARS)).replace(regExp_2, "").trim();
  return {
    sentence: n ? `${trimmed}\u2026` : trimmed,
    cut: n,
  };
}
//@ chunk-82kqcve8.js:76527-76537 placement
/**
 * 最多统计的引用文件数（32）。
 */
var MAX_CITED_FILES = 32;
//@ chunk-82kqcve8.js:76537-76898 placement
/**
 * 统计记忆引用标签中的文件解析结果：已解析/未知、读/写、正文注入、浮现与列出的数量。
 */
function classifyCitedMemories(source, n) {
  let mapped = [...source.matchAll(regExp)]
    .filter((h) => !h[0].startsWith("</"))
    .flatMap((h) => parseTagFilenames(h[0]))
    .slice(0, MAX_CITED_FILES)
    .map(n);
  let s = count(mapped, (h) => h.resolved);
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
  let match = e.match(FILENAMES_ATTR_RE);
  if (match === null) return [];
  return (match[1] ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter((r) => r !== "");
}
//@ chunk-82kqcve8.js:77019-77440 placement
/**
 * 从文本中抽取记忆引用：每对标签内的句子（过长截断）及其文件名，未闭合的标签也取一段并标为不完整。
 */
function extractMemoryCitations(text) {
  let n = [];
  let r = null;
  let filenames = [];
  for (let h of text.matchAll(regExp)) {
    if (!h[0].startsWith("</")) {
      if (r === null) {
        r = h.index + h[0].length;
        filenames = parseTagFilenames(h[0]);
      }
      continue;
    }
    if (r === null) continue;
    let { sentence, cut } = extractCitedSentence(text.slice(r, h.index));
    if (sentence !== "" && sentence !== "\u2026")
      n.push({
        sentence,
        filenames,
        incomplete: cut,
      });
    r = null;
  }
  if (r !== null) {
    let { sentence } = extractCitedSentence(text.slice(r, r + MAX_SCANNED_TEXT_CHARS + 1));
    if (sentence !== "" && sentence !== "\u2026")
      n.push({
        sentence,
        filenames,
        incomplete: true,
      });
  }
  return n;
}
//@ chunk-82kqcve8.js:77440-77652 placement
/**
 * 去掉文本与 thinking 块中的记忆标签，无变化时返回原数组。
 */
function stripMemoryTagsFromBlocks(content) {
  let mapped = content.map((r) => {
    if (r.type === "text") return withCitationsDropped(r, stripMemoryTags(r.text));
    if (r.type === "thinking") {
      let s = stripMemoryTags(r.thinking);
      return s === r.thinking
        ? r
        : {
            ...r,
            thinking: s,
          };
    }
    return r;
  });
  return mapped.every((r, s) => r === content[s]) ? content : mapped;
}
//@ chunk-82kqcve8.js:121911-121992 placement
/**
 * 记忆提示索引是否可用。
 */
function isMemoryPromptIndexEligible() {
  if (!isAutoMemoryEnabled()) return false;
  if (isEssentialTrafficOnly()) return false;
  return getSessionIngressAuthToken() !== null || canUseClaudeAiMemory() || hasMemoryApiOverride();
}
//@ chunk-82kqcve8.js:121992-122013 placement
/**
 * 条目不足时的重试间隔（60000 毫秒）。
 */
var DEFAULT_INDEX_TIMEOUT_MS = 5000;
var RETRY_TTL_MS = 60000;
//@ chunk-82kqcve8.js:122013-122331 placement
/**
 * 记忆提示索引缓存：同一 key 复用请求结果；结果条目不足上限时设置重试时间，到期后重新请求。
 */
class PromptIndexCache {
  current = null;
  entriesFor(e, n, r) {
    let s =
      this.current?.key === e && this.current.retryAtMs !== undefined && Date.now() >= this.current.retryAtMs;
    if (this.current?.key !== e || s) {
      let h = {
        key: e,
        entries: r(),
      };
      h.entries = h.entries.then((y) => {
        if (y.length < n) h.retryAtMs = Date.now() + RETRY_TTL_MS;
        return y;
      });
      this.current = h;
    }
    return this.current.entries;
  }
}
//@ chunk-82kqcve8.js:122331-122378 placement
/**
 * 按宿主的空索引映射。
 */
var promptIndexCache = new HostScoped(() => new PromptIndexCache());
var emptyIndexByHost = new HostScoped(() => new Map());
//@ chunk-82kqcve8.js:122378-123076 placement
async function readMemoryPromptIndexConfig(e = DEFAULT_INDEX_TIMEOUT_MS, n = {}) {
  let r;
  try {
    r = parseMemoryStoresEnv();
  } catch (error) {
    logForDebugging(`memory-prompt-index: parseMemoryStoresEnv failed: ${errorMessage(error)}`, {
      level: "debug",
    });
    return [];
  }
  let s = r ?? (n.serveConnectedStores ? [...readableOrgMemoryStores()] : null);
  if (s === null) return [];
  let filtered = s.filter((L) => L.promptIndex !== undefined);
  if (filtered.length === 0) return [];
  let y = memorySyncAvailability();
  if (y !== "open") {
    logFeatureSad("memory_prompt_index", y === "held" ? "policy_pending" : "unavailable");
    return [];
  }
  let host = getRootSession().host;
  let S = r === null;
  let R = S ? null : emptyIndexByHost.of(host);
  let O = async () =>
    (await Promise.allSettled(filtered.map((j) => fetchMemoryPromptIndex(j, e, R)))).flatMap((j) =>
      j.status === "fulfilled" && j.value !== null ? [j.value] : [],
    );
  if (!S) return O();
  let joined = [orgMemoryIdentity() ?? "", ...filtered.map((L) => `${L.path} ${L.mode} ${L.promptIndex}`)]
    .join(`
`);
  return promptIndexCache.of(host).entriesFor(joined, filtered.length, O);
}
//@ chunk-82kqcve8.js:123076-123752 placement
async function fetchMemoryPromptIndex(e, n, knownIds) {
  let promptIndex = e.promptIndex;
  if (!isValidRelativeSegments(promptIndex)) {
    logFeatureSad("memory_prompt_index", "unsafe_path");
    return null;
  }
  let h =
    knownIds === null
      ? makeStoreClient(e, false, getStoreScopeLabel(e))
      : new MemoryStoreClient(e, undefined, knownIds);
  try {
    let y = await withTimeout(
      h.readByPath(normalizePathPrefix(promptIndex)),
      n,
      `promptIndex fetch for ${e.mount}`,
    );
    if (y === null) {
      logForDebugging(`memory-prompt-index[${e.mount}]: ${promptIndex} not found`, {
        level: "debug",
      });
      logFeatureOk("memory_prompt_index");
      return {
        mount: e.mount,
        promptIndex,
        content: "",
      };
    }
    logFeatureOk("memory_prompt_index");
    return {
      mount: e.mount,
      promptIndex,
      content: y.content,
    };
  } catch (error) {
    let w = errorMessage(error);
    let S = w.includes(`promptIndex fetch for ${e.mount}`) ? "timeout" : "error";
    logFeatureSad("memory_prompt_index", S);
    logForDebugging(`memory-prompt-index[${e.mount}]: fetch failed (${S}): ${w}`, {
      level: "debug",
    });
    return null;
  }
}
//@ chunk-82kqcve8.js:123752-123931 placement
/**
 * 加载记忆存储的提示索引：存储有索引且多存储同步可用时拉取，失败返回 null。
 */
async function loadStorePromptIndex(store, n = {}) {
  if (store.promptIndex === undefined || !isMultiStoreSyncAvailable()) return null;
  let memoryPromptIndex = await fetchMemoryPromptIndex(store, n.timeoutMs ?? DEFAULT_INDEX_TIMEOUT_MS, null);
  return memoryPromptIndex === null
    ? null
    : {
        content: memoryPromptIndex.content,
        promptIndex: memoryPromptIndex.promptIndex,
      };
}
//@ chunk-82kqcve8.js:123963-124030 placement
/**
 * 是否有已启用的设置来源打开了某权限项。
 */
function isSettingEnabledInSources(e) {
  return getEnabledSettingSources().some((n) => getSettingsForSource(n)?.permissions?.[e] === true);
}
export {
  stripMemoryTags,
  TENGU_SALT_MARSH,
  stripMemoryTagsFromBlocks,
  measureMemoryTags,
  classifyCitedMemories,
  withCitationsDropped,
  extractMemoryCitations,
  isMemoryPromptIndexEligible,
  isSettingEnabledInSources,
  readMemoryPromptIndexConfig,
  makeStoreClient,
  loadStorePromptIndex,
};
