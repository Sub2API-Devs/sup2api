/**
 * services/orgMemory/promptIndex.ts
 *
 * 记忆提示词索引（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a2q0x549.js (21)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { MemoryStoreClient, normalizePathPrefix } from "./storeApi.js";
import { getOrgMemoryAuthorization } from "./credential.js";
import { countWhere } from "../../utils/collections.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:76113-76203 placement
/**
 * 用给定模式与挂载名创建记忆库客户端。
 */
function makeStoreClient(store, writable, mount) {
  return new MemoryStoreClient(
    {
      ...store,
      mode: writable ? "rw" : "ro",
      mount,
    },
    {
      getAuthorization: getOrgMemoryAuthorization,
    },
  );
}
//@ chunk-a2q0x549.js:76203-76370 placement
/**
 * 替换文本块内容；内容变化且带有需剔除的引用时一并去掉这些引用。
 */
function withCitationsDropped(block, text) {
  if (text === block.text) return block;
  return Array.isArray(block.citations) && block.citations.some(isSpanCitation)
    ? {
        ...block,
        text,
        citations: block.citations.filter((citation) => !isSpanCitation(citation)),
      }
    : {
        ...block,
        text,
      };
}
//@ chunk-a2q0x549.js:76370-76440 placement
/**
 * 判断引用是否带 span_start（可定位的引用）。
 */
function isSpanCitation(citation) {
  return typeof citation === "object" && citation !== null && "span_start" in citation;
}
//@ chunk-a2q0x549.js:76440-76789 placement
/**
 * 提取 filenames 属性的正则。
 */
var TENGU_SALT_MARSH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MEMORY_TAG_VARIANTS;
var MEMORY_TAG_ALTERNATION;
var MEMORY_TAG_PREFIXES;
var TAG_ATTR_CHARS;
var regExp;
var regExp_2;
var FILENAMES_ATTR_RE;
deferInit("chunk-a2q0x549.js:76440", () => {
  TENGU_SALT_MARSH = "tengu_salt_marsh";
  MEMORY_TAG_VARIANTS = ["cc-memory", "cc_memory", "ccmemory", "CC-MEMORY", "CC_MEMORY", "CCMEMORY"];
  MEMORY_TAG_ALTERNATION = `(?:${MEMORY_TAG_VARIANTS.join("|")})`;
  MEMORY_TAG_PREFIXES = `(?:${MEMORY_TAG_VARIANTS.flatMap((variant) => Array.from(variant, (char, charIndex) => variant.slice(0, charIndex + 1))).join("|")})`;
  TAG_ATTR_CHARS = "[^>]{0,1024}";
  regExp = new RegExp(`</?${MEMORY_TAG_ALTERNATION}(?=[\\s/>])${TAG_ATTR_CHARS}>`, "g");
  regExp_2 = new RegExp(
    `</?(?:${MEMORY_TAG_ALTERNATION}(?![^\\s/>])${TAG_ATTR_CHARS}|${MEMORY_TAG_PREFIXES})$`,
  );
  FILENAMES_ATTR_RE = /\bfilenames="([^"]*)"/i;
});
//@ chunk-a2q0x549.js:76789-76828 placement
/**
 * 去掉文本里的记忆引用标签。
 */
function stripMemoryTags(text) {
  return text.replace(regExp, "");
}
//@ chunk-a2q0x549.js:76828-77574 placement
/**
 * 统计文本中的记忆引用标签：开闭标签数、标签内字符数、引用的记忆文件数、缺少 filenames 属性的情况与开标签字符数分桶，并返回去掉标签后的文本。
 */
function measureMemoryTags(source) {
  let tags = [...source.matchAll(regExp)];
  let filtered = tags.filter((tag) => !tag[0].startsWith("</"));
  let reduced = filtered.reduce((acc, tag) => acc + tag[0].length, 0);
  let mapped = filtered.map((tag) => tag[0].match(FILENAMES_ATTR_RE));
  let { taggedContentChars } = tags.reduce(
    (acc, tag) => {
      if (!tag[0].startsWith("</"))
        return acc.openAt === null
          ? {
              taggedContentChars: acc.taggedContentChars,
              openAt: tag.index + tag[0].length,
            }
          : acc;
      if (acc.openAt === null) return acc;
      return {
        taggedContentChars: acc.taggedContentChars + (tag.index - acc.openAt),
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
    closeTagCount: tags.length - filtered.length,
    taggedContentChars,
    memoryFileCount: mapped.reduce(
      (acc, names) =>
        acc + (names === null ? 0 : countWhere((names[1] ?? "").split(","), (name) => name.trim() !== "")),
      0,
    ),
    missingFilenamesAttr: mapped.some((names) => names === null),
    openTagCharsBucket: reduced === 0 ? 0 : 2 ** Math.ceil(Math.log2(reduced)),
  };
}
//@ chunk-a2q0x549.js:77574-77585 placement
/**
 * 扫描标签时截取的最大字符数（300）。
 */
var MAX_SCANNED_TEXT_CHARS = 300;
//@ chunk-a2q0x549.js:77585-77694 placement
function extractCitedSentence(text) {
  let cut = text.length > MAX_SCANNED_TEXT_CHARS;
  let trimmed = stripMemoryTags(truncateToLength(text, MAX_SCANNED_TEXT_CHARS)).replace(regExp_2, "").trim();
  return {
    sentence: cut ? `${trimmed}\u2026` : trimmed,
    cut,
  };
}
//@ chunk-a2q0x549.js:77694-77704 placement
/**
 * 最多统计的引用文件数（32）。
 */
var MAX_CITED_FILES = 32;
//@ chunk-a2q0x549.js:77704-78065 placement
/**
 * 统计记忆引用标签中的文件解析结果：已解析/未知、读/写、正文注入、浮现与列出的数量。
 */
function classifyCitedMemories(source, classifyPath) {
  let mapped = [...source.matchAll(regExp)]
    .filter((tagMatch) => !tagMatch[0].startsWith("</"))
    .flatMap((tagMatch) => parseTagFilenames(tagMatch[0]))
    .slice(0, MAX_CITED_FILES)
    .map(classifyPath);
  let resolvedCount = countWhere(mapped, (citation) => citation.resolved);
  return {
    resolved: resolvedCount,
    unknown: mapped.length - resolvedCount,
    read: countWhere(mapped, (citation) => citation.read),
    written: countWhere(mapped, (citation) => citation.written),
    injectedBody: countWhere(mapped, (citation) => citation.injection === "body"),
    surfaced: countWhere(mapped, (citation) => citation.injection === "surfaced"),
    listed: countWhere(mapped, (citation) => citation.injection === "listed"),
  };
}
//@ chunk-a2q0x549.js:78065-78186 placement
function parseTagFilenames(tagText) {
  let match = tagText.match(FILENAMES_ATTR_RE);
  if (match === null) return [];
  return (match[1] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
}
//@ chunk-a2q0x549.js:78186-78607 placement
/**
 * 从文本中抽取记忆引用：每对标签内的句子（过长截断）及其文件名，未闭合的标签也取一段并标为不完整。
 */
function extractMemoryCitations(text) {
  let citations = [];
  let contentStart = null;
  let filenames = [];
  for (let match of text.matchAll(regExp)) {
    if (!match[0].startsWith("</")) {
      if (contentStart === null) {
        contentStart = match.index + match[0].length;
        filenames = parseTagFilenames(match[0]);
      }
      continue;
    }
    if (contentStart === null) continue;
    let { sentence, cut } = extractCitedSentence(text.slice(contentStart, match.index));
    if (sentence !== "" && sentence !== "\u2026")
      citations.push({
        sentence,
        filenames,
        incomplete: cut,
      });
    contentStart = null;
  }
  if (contentStart !== null) {
    let { sentence } = extractCitedSentence(
      text.slice(contentStart, contentStart + MAX_SCANNED_TEXT_CHARS + 1),
    );
    if (sentence !== "" && sentence !== "\u2026")
      citations.push({
        sentence,
        filenames,
        incomplete: true,
      });
  }
  return citations;
}
//@ chunk-a2q0x549.js:78607-78819 placement
/**
 * 去掉文本与 thinking 块中的记忆标签，无变化时返回原数组。
 */
function stripMemoryTagsFromBlocks(content) {
  let mapped = content.map((block) => {
    if (block.type === "text") return withCitationsDropped(block, stripMemoryTags(block.text));
    if (block.type === "thinking") {
      let stripped = stripMemoryTags(block.thinking);
      return stripped === block.thinking
        ? block
        : {
            ...block,
            thinking: stripped,
          };
    }
    return block;
  });
  return mapped.every((block, index) => block === content[index]) ? content : mapped;
}
//@ chunk-a2q0x549.js:119357-119438 placement
/**
 * 记忆提示索引是否可用。
 */
function isMemoryPromptIndexEligible() {
  if (!isAutoMemoryEnabled()) return false;
  if (isEssentialTrafficOnly()) return false;
  return getSessionIngressAuthToken() !== null || canUseClaudeAiMemory() || hasMemoryApiOverride();
}
//@ chunk-a2q0x549.js:119438-119459 placement
/**
 * 条目不足时的重试间隔（60000 毫秒）。
 */
var DEFAULT_INDEX_TIMEOUT_MS = 5000;
var RETRY_TTL_MS = 60000;
//@ chunk-a2q0x549.js:119459-119777 placement
/**
 * 记忆提示索引缓存：同一 key 复用请求结果；结果条目不足上限时设置重试时间，到期后重新请求。
 */
class PromptIndexCache {
  current = null;
  entriesFor(key, expectedCount, load) {
    let retryDue =
      this.current?.key === key &&
      this.current.retryAtMs !== undefined &&
      Date.now() >= this.current.retryAtMs;
    if (this.current?.key !== key || retryDue) {
      let entry = {
        key,
        entries: load(),
      };
      entry.entries = entry.entries.then((entries) => {
        if (entries.length < expectedCount) entry.retryAtMs = Date.now() + RETRY_TTL_MS;
        return entries;
      });
      this.current = entry;
    }
    return this.current.entries;
  }
}
//@ chunk-a2q0x549.js:119777-119824 placement
/**
 * 按宿主的空索引映射。
 */
var promptIndexCache; // deferred: uses PromptIndexCache of its import cycle while loading; runs once the cycle is complete
var emptyIndexByHost;
deferInit("chunk-a2q0x549.js:119777", () => {
  promptIndexCache = new HostScoped(() => new PromptIndexCache());
  emptyIndexByHost = new HostScoped(() => new Map());
});
//@ chunk-a2q0x549.js:119824-120522 placement
async function readMemoryPromptIndexConfig(timeoutMs = DEFAULT_INDEX_TIMEOUT_MS, options = {}) {
  let stores;
  try {
    stores = parseMemoryStoresEnv();
  } catch (error) {
    logForDebugging(`memory-prompt-index: parseMemoryStoresEnv failed: ${errorMessage(error)}`, {
      level: "debug",
    });
    return [];
  }
  let allStores = stores ?? (options.serveConnectedStores ? [...readableOrgMemoryStores()] : null);
  if (allStores === null) return [];
  let filtered = allStores.filter((store) => store.promptIndex !== undefined);
  if (filtered.length === 0) return [];
  let syncState = memorySyncAvailability();
  if (syncState !== "open") {
    logFeatureSad("memory_prompt_index", syncState === "held" ? "policy_pending" : "unavailable");
    return [];
  }
  let host = getRootSession().host;
  let hasEnvStores = stores === null;
  let cacheByPath = hasEnvStores ? null : emptyIndexByHost.of(host);
  let fetchIndexes = async () =>
    (
      await Promise.allSettled(filtered.map((store) => fetchMemoryPromptIndex(store, timeoutMs, cacheByPath)))
    ).flatMap((settled) => (settled.status === "fulfilled" && settled.value !== null ? [settled.value] : []));
  if (!hasEnvStores) return fetchIndexes();
  let joined = [
    orgMemoryIdentity() ?? "",
    ...filtered.map((store) => `${store.path} ${store.mode} ${store.promptIndex}`),
  ].join(`
`);
  return promptIndexCache.of(host).entriesFor(joined, filtered.length, fetchIndexes);
}
//@ chunk-a2q0x549.js:120522-121198 placement
async function fetchMemoryPromptIndex(config, timeoutMs, knownIds) {
  let promptIndex = config.promptIndex;
  if (!isValidRelativeSegments(promptIndex)) {
    logFeatureSad("memory_prompt_index", "unsafe_path");
    return null;
  }
  let client =
    knownIds === null
      ? makeStoreClient(config, false, getStoreScopeLabel(config))
      : new MemoryStoreClient(config, undefined, knownIds);
  try {
    let entry = await withTimeout(
      client.readByPath(normalizePathPrefix(promptIndex)),
      timeoutMs,
      `promptIndex fetch for ${config.mount}`,
    );
    if (entry === null) {
      logForDebugging(`memory-prompt-index[${config.mount}]: ${promptIndex} not found`, {
        level: "debug",
      });
      logFeatureOk("memory_prompt_index");
      return {
        mount: config.mount,
        promptIndex,
        content: "",
      };
    }
    logFeatureOk("memory_prompt_index");
    return {
      mount: config.mount,
      promptIndex,
      content: entry.content,
    };
  } catch (error) {
    let message = errorMessage(error);
    let reason = message.includes(`promptIndex fetch for ${config.mount}`) ? "timeout" : "error";
    logFeatureSad("memory_prompt_index", reason);
    logForDebugging(`memory-prompt-index[${config.mount}]: fetch failed (${reason}): ${message}`, {
      level: "debug",
    });
    return null;
  }
}
//@ chunk-a2q0x549.js:121198-121377 placement
/**
 * 加载记忆存储的提示索引：存储有索引且多存储同步可用时拉取，失败返回 null。
 */
async function loadStorePromptIndex(config, options = {}) {
  if (config.promptIndex === undefined || !isMultiStoreSyncAvailable()) return null;
  let memoryPromptIndex = await fetchMemoryPromptIndex(
    config,
    options.timeoutMs ?? DEFAULT_INDEX_TIMEOUT_MS,
    null,
  );
  return memoryPromptIndex === null
    ? null
    : {
        content: memoryPromptIndex.content,
        promptIndex: memoryPromptIndex.promptIndex,
      };
}
//@ chunk-a2q0x549.js:121423-121490 placement
/**
 * 是否有已启用的设置来源打开了某权限项。
 */
function isSettingEnabledInSources(setting) {
  return getEnabledSettingSources().some(
    (source) => getSettingsForSource(source)?.permissions?.[setting] === true,
  );
}
export {
  stripMemoryTags,
  TENGU_SALT_MARSH,
  stripMemoryTagsFromBlocks,
  measureMemoryTags,
  classifyCitedMemories,
  withCitationsDropped,
  readMemoryPromptIndexConfig,
  isMemoryPromptIndexEligible,
  isSettingEnabledInSources,
  makeStoreClient,
  extractMemoryCitations,
  loadStorePromptIndex,
};
