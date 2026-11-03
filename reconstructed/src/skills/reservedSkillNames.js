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

//@ chunk-e6aww6q8.js:957291-957354 placement
/**
 * 字形簇分词器缓存（不足时扩容、过大时回收缓冲区）。
 */
var MAX_RETAINED_SEGMENT_BUFFER = 8192;
var graphemeSegmenter;
var int32Array_2 = new Int32Array(512);
var int32Array_3 = new Int32Array(512);
//@ chunk-e6aww6q8.js:957354-957661 placement
/**
 * 把字符串按字形簇切分后逐簇映射为折叠后的形式再拼接（用于比对易混淆字符；缓冲区不足时扩容，过大时回收）。
 */
function foldConfusableGraphemes(e) {
  if (graphemeSegmenter === undefined || graphemeSegmenter.graphemes.length > MAX_SEGMENT_CELLS)
    graphemeSegmenter = assertCellSegmenter(BIDI_CONTROL_RANGES);
  let n = graphemeSegmenter.segment(e, int32Array_2, int32Array_3, false);
  if (n < 0) {
    int32Array_2 = new Int32Array(2 * -n);
    int32Array_3 = new Int32Array(2 * -n);
    n = graphemeSegmenter.segment(e, int32Array_2, int32Array_3, false);
  }
  let r = "";
  for (let idx = 0; idx < n; idx++) r += graphemeSegmenter.graphemes[int32Array_2[2 * idx]];
  if (int32Array_2.length > MAX_RETAINED_SEGMENT_BUFFER) {
    int32Array_2 = new Int32Array(512);
    int32Array_3 = new Int32Array(512);
  }
  return r;
}
//@ chunk-e6aww6q8.js:957661-957852 placement
/**
 * 保留技能命名空间（anthropic-skills）的拒绝原因文案与字符类正则。
 */
var RESERVED_SKILL_NAMESPACE_REASON = `uses ${SYNCED_SKILL_PREFIXES.map((e) => `"${e}"`).join(" or ")}, the names reserved for the skills synced from your claude.ai account`;
var PRINTABLE_ASCII_RE_2 = /^[ -~]*$/;
var CONTROL_OR_LINEBREAK_RE = /[\u001B\u0080-\u009F\n\u000B\f\r\u2028\u2029]/;
//@ chunk-e6aww6q8.js:957852-957910 placement
/**
 * 判断名字是否属于或仿冒保留技能命名空间 anthropic-skills（含字形折叠与子序列匹配，带缓存）；与文件状态缓存无关，归属疑似错误。
 */
function getReservedSkillNamespace(e) {
  return reservedNamespaceOf(e) ?? (PRINTABLE_ASCII_RE_2.test(e) ? undefined : FileStateCache(e));
}
//@ chunk-e6aww6q8.js:957910-957918 placement
var reservedNamespaceLookupCache;
//@ chunk-e6aww6q8.js:957918-958131 placement = FileStateCache (0.529)
function FileStateCache(e) {
  if (e.length > MAX_FOLDABLE_NAME_LENGTH) return matchReservedSkillNamespace(e);
  let n = (reservedNamespaceLookupCache ??= retainCacheKey(
    new LRUCache({
      max: 8192,
      maxSize: 4194304,
      sizeCalculation: (h, y) => y.length,
    }),
  ));
  let r = n.get(e);
  if (r !== undefined) return r || undefined;
  let s = matchReservedSkillNamespace(e);
  n.set(repairUtf16(e), s ?? "");
  return s;
}
//@ chunk-e6aww6q8.js:958131-958305 placement
function matchReservedSkillNamespace(e) {
  let n = e.trimEnd();
  if (!CONTROL_OR_LINEBREAK_RE.test(n)) return reservedNamespaceOf(foldConfusableGraphemes(n));
  let r = foldName_2(n);
  return SYNCED_SKILL_PREFIXES.find((s) => {
    let h = 0;
    for (let y of s) {
      h = r.indexOf(y, h) + 1;
      if (h === 0) return false;
    }
    return true;
  });
}
//@ chunk-e6aww6q8.js:958305-958344 placement
var mapped_2 = SYNCED_SKILL_PREFIXES.map((e) => [e, normalizedSkillToolName(`${e}:`)]);
//@ chunk-e6aww6q8.js:958344-958553 placement
function reservedNamespaceOf(e) {
  let n = foldName_2(e);
  for (let [r, s] of mapped_2) {
    if (n === r || n.startsWith(`${r}:`)) return r;
    let h = s.length;
    if (
      normalizedSkillToolName(e.slice(0, h)).toLowerCase().startsWith(s) ||
      (n !== e && normalizedSkillToolName(n.slice(0, h)).startsWith(s))
    )
      return r;
  }
  return;
}
//@ chunk-e6aww6q8.js:958553-958590 placement
/**
 * 判断技能名是否落在 claude.ai 账号同步技能的保留命名空间里。
 */
function usesReservedSkillNamespace(e) {
  return getReservedSkillNamespace(e) !== undefined;
}
//@ chunk-e6aww6q8.js:958590-958749 placement
/**
 * 返回技能名被拒的原因：使用了为 claude.ai 账号同步技能保留的命名空间，否则返回通用保留原因。
 */
function reservedNameReason(...e) {
  for (let n of e) {
    let reservedSkillNamespace = getReservedSkillNamespace(n);
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
