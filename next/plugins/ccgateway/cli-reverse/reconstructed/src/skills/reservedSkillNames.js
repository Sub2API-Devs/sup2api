/**
 * skills/reservedSkillNames.ts
 *
 * 2.1.316 新增：保留的技能名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import { MAX_SEGMENT_CELLS, assertCellSegmenter } from "../ink/terminalImages.js";
import { BIDI_CONTROL_RANGES } from "../ink/render-border.js";
import { SYNCED_SKILL_PREFIXES } from "./syncedSkills.js";
import { MAX_FOLDABLE_NAME_LENGTH, foldName as foldName_2 } from "../utils/plugins/syncedItems.js";
import { retainCacheKey } from "../utils/memoize.js";
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { repairUtf16 } from "../utils/stringUtils.js";
import { normalizedSkillToolName } from "../tools/SkillTool/skillToolNames.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:957291-957354 placement
/**
 * 字形簇分词器缓存（不足时扩容、过大时回收缓冲区）。
 */
var MAX_RETAINED_SEGMENT_BUFFER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var graphemeSegmenter;
var int32Array_2;
var int32Array_3;
deferInit("chunk-e6aww6q8.js:957291", () => {
  MAX_RETAINED_SEGMENT_BUFFER = 8192;
  int32Array_2 = new Int32Array(512);
  int32Array_3 = new Int32Array(512);
});
//@ chunk-e6aww6q8.js:957354-957661 placement
/**
 * 把字符串按字形簇切分后逐簇映射为折叠后的形式再拼接（用于比对易混淆字符；缓冲区不足时扩容，过大时回收）。
 */
function foldConfusableGraphemes(text) {
  if (graphemeSegmenter === undefined || graphemeSegmenter.graphemes.length > MAX_SEGMENT_CELLS)
    graphemeSegmenter = assertCellSegmenter(BIDI_CONTROL_RANGES);
  let segmentCount = graphemeSegmenter.segment(text, int32Array_2, int32Array_3, false);
  if (segmentCount < 0) {
    int32Array_2 = new Int32Array(2 * -segmentCount);
    int32Array_3 = new Int32Array(2 * -segmentCount);
    segmentCount = graphemeSegmenter.segment(text, int32Array_2, int32Array_3, false);
  }
  let folded = "";
  for (let idx = 0; idx < segmentCount; idx++) folded += graphemeSegmenter.graphemes[int32Array_2[2 * idx]];
  if (int32Array_2.length > MAX_RETAINED_SEGMENT_BUFFER) {
    int32Array_2 = new Int32Array(512);
    int32Array_3 = new Int32Array(512);
  }
  return folded;
}
//@ chunk-e6aww6q8.js:957661-957852 placement
/**
 * 保留技能命名空间（anthropic-skills）的拒绝原因文案与字符类正则。
 */
var RESERVED_SKILL_NAMESPACE_REASON; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PRINTABLE_ASCII_RE_2;
var CONTROL_OR_LINEBREAK_RE;
deferInit("chunk-e6aww6q8.js:957661", () => {
  RESERVED_SKILL_NAMESPACE_REASON = `uses ${SYNCED_SKILL_PREFIXES.map((prefix) => `"${prefix}"`).join(" or ")}, the names reserved for the skills synced from your claude.ai account`;
  PRINTABLE_ASCII_RE_2 = /^[ -~]*$/;
  CONTROL_OR_LINEBREAK_RE = /[\u001B\u0080-\u009F\n\u000B\f\r\u2028\u2029]/;
});
//@ chunk-e6aww6q8.js:957852-957910 placement
/**
 * 判断名字是否属于或仿冒保留技能命名空间 anthropic-skills（含字形折叠与子序列匹配，带缓存）；与文件状态缓存无关，归属疑似错误。
 */
function getReservedSkillNamespace(name) {
  return (
    reservedNamespaceOf(name) ??
    (PRINTABLE_ASCII_RE_2.test(name) ? undefined : cachedReservedSkillNamespace(name))
  );
}
//@ chunk-e6aww6q8.js:957910-957918 placement
var reservedNamespaceLookupCache;
//@ chunk-e6aww6q8.js:957918-958131 placement (2.1.88 match: FileStateCache, 0.529)
/**
 * 按名字查保留技能命名空间（anthropic-skills）的缓存版：超过折叠长度上限直接匹配，否则走 LRU（8192 条 / 4 MB）。与文件状态缓存无关，名字曾误作 FileStateCache。
 */
function cachedReservedSkillNamespace(name) {
  if (name.length > MAX_FOLDABLE_NAME_LENGTH) return matchReservedSkillNamespace(name);
  let cache = (reservedNamespaceLookupCache ??= retainCacheKey(
    new LRUCache({
      max: 8192,
      maxSize: 4194304,
      sizeCalculation: (key, value) => value.length,
    }),
  ));
  let cached = cache.get(name);
  if (cached !== undefined) return cached || undefined;
  let namespace = matchReservedSkillNamespace(name);
  cache.set(repairUtf16(name), namespace ?? "");
  return namespace;
}
//@ chunk-e6aww6q8.js:958131-958305 placement
function matchReservedSkillNamespace(name) {
  let trimmed = name.trimEnd();
  if (!CONTROL_OR_LINEBREAK_RE.test(trimmed)) return reservedNamespaceOf(foldConfusableGraphemes(trimmed));
  let folded = foldName_2(trimmed);
  return SYNCED_SKILL_PREFIXES.find((prefix) => {
    let cursor = 0;
    for (let char of prefix) {
      cursor = folded.indexOf(char, cursor) + 1;
      if (cursor === 0) return false;
    }
    return true;
  });
}
//@ chunk-e6aww6q8.js:958305-958344 placement
var mapped_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:958305", () => {
  mapped_2 = SYNCED_SKILL_PREFIXES.map((prefix) => [prefix, normalizedSkillToolName(`${prefix}:`)]);
});
//@ chunk-e6aww6q8.js:958344-958553 placement
function reservedNamespaceOf(name) {
  let folded = foldName_2(name);
  for (let [prefix, toolPrefix] of mapped_2) {
    if (folded === prefix || folded.startsWith(`${prefix}:`)) return prefix;
    let prefixLength = toolPrefix.length;
    if (
      normalizedSkillToolName(name.slice(0, prefixLength)).toLowerCase().startsWith(toolPrefix) ||
      (folded !== name && normalizedSkillToolName(folded.slice(0, prefixLength)).startsWith(toolPrefix))
    )
      return prefix;
  }
  return;
}
//@ chunk-e6aww6q8.js:958553-958590 placement
/**
 * 判断技能名是否落在 claude.ai 账号同步技能的保留命名空间里。
 */
function usesReservedSkillNamespace(name) {
  return getReservedSkillNamespace(name) !== undefined;
}
//@ chunk-e6aww6q8.js:958590-958749 placement
/**
 * 返回技能名被拒的原因：使用了为 claude.ai 账号同步技能保留的命名空间，否则返回通用保留原因。
 */
function reservedNameReason(...names) {
  for (let name of names) {
    let reservedSkillNamespace = getReservedSkillNamespace(name);
    if (reservedSkillNamespace !== undefined)
      return `uses "${reservedSkillNamespace}", a name reserved for the skills synced from your claude.ai account`;
  }
  return RESERVED_SKILL_NAMESPACE_REASON;
}
export {
  RESERVED_SKILL_NAMESPACE_REASON,
  reservedNameReason,
  usesReservedSkillNamespace,
  reservedNamespaceOf,
  getReservedSkillNamespace,
};
