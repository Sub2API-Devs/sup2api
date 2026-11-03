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
import { a2t, assertCellSegmenter } from "../ink/terminalImages.js";
import { BIDI_CONTROL_RANGES } from "../ink/render-border.js";
import { SYNCED_SKILL_PREFIXES } from "./syncedSkills.js";
import { Cdr, foldName as foldName_2 } from "../utils/plugins/syncedItems.js";
import { aV } from "../utils/memoize.js";
import { Dc } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { repairUtf16 } from "../utils/stringUtils.js";
import { t5e } from "../tools/SkillTool/skillToolNames.js";

//@ chunk-e6aww6q8.js:957291-957354 placement
var MAX_RETAINED_SEGMENT_BUFFER = 8192,
  Lz,
  int32Array_2 = new Int32Array(512),
  int32Array_3 = new Int32Array(512);
/**
 * 把字符串按字形簇切分后逐簇映射为折叠后的形式再拼接（用于比对易混淆字符；缓冲区不足时扩容，过大时回收）。
 */
//@ chunk-e6aww6q8.js:957354-957661 placement
function foldConfusableGraphemes(e) {
  if (Lz === void 0 || Lz.graphemes.length > a2t) Lz = assertCellSegmenter(BIDI_CONTROL_RANGES);
  let segment = Lz.segment(e, int32Array_2, int32Array_3, !1);
  if (segment < 0)
    ((int32Array_2 = new Int32Array(2 * -segment)),
      (int32Array_3 = new Int32Array(2 * -segment)),
      (segment = Lz.segment(e, int32Array_2, int32Array_3, !1)));
  let r = "";
  for (let s = 0; s < segment; s++) r += Lz.graphemes[int32Array_2[2 * s]];
  if (int32Array_2.length > MAX_RETAINED_SEGMENT_BUFFER)
    ((int32Array_2 = new Int32Array(512)), (int32Array_3 = new Int32Array(512)));
  return r;
}
/**
 * 保留技能命名空间（anthropic-skills）的拒绝原因文案与字符类正则。
 */
//@ chunk-e6aww6q8.js:957661-957852 placement
var RESERVED_SKILL_NAMESPACE_REASON = `uses ${SYNCED_SKILL_PREFIXES.map((e) => `"${e}"`).join(" or ")}, the names reserved for the skills synced from your claude.ai account`,
  PRINTABLE_ASCII_RE = /^[ -~]*$/,
  CONTROL_OR_LINEBREAK_RE = /[\u001B\u0080-\u009F\n\u000B\f\r\u2028\u2029]/;
/**
 * 判断名字是否属于或仿冒保留技能命名空间 anthropic-skills（含字形折叠与子序列匹配，带缓存）；与文件状态缓存无关，归属疑似错误。
 */
//@ chunk-e6aww6q8.js:957852-957910 placement
function getReservedSkillNamespace(e) {
  return reservedNamespaceOf(e) ?? (PRINTABLE_ASCII_RE.test(e) ? void 0 : FileStateCache(e));
}
//@ chunk-e6aww6q8.js:957910-957918 placement
var reservedNamespaceLookupCache;
//@ chunk-e6aww6q8.js:957918-958131 placement = FileStateCache (0.529)
function FileStateCache(e) {
  if (e.length > Cdr) return matchReservedSkillNamespace(e);
  let n = (reservedNamespaceLookupCache ??= aV(
      new Dc({ max: 8192, maxSize: 4194304, sizeCalculation: (h, y) => y.length }),
    )),
    r = n.get(e);
  if (r !== void 0) return r || void 0;
  let s = matchReservedSkillNamespace(e);
  return (n.set(repairUtf16(e), s ?? ""), s);
}
//@ chunk-e6aww6q8.js:958131-958305 placement
function matchReservedSkillNamespace(e) {
  let trimEnd = e.trimEnd();
  if (!CONTROL_OR_LINEBREAK_RE.test(trimEnd)) return reservedNamespaceOf(foldConfusableGraphemes(trimEnd));
  let r = foldName_2(trimEnd);
  return SYNCED_SKILL_PREFIXES.find((s) => {
    let h = 0;
    for (let y of s) if (((h = r.indexOf(y, h) + 1), h === 0)) return !1;
    return !0;
  });
}
//@ chunk-e6aww6q8.js:958305-958344 placement
var mapped_2 = SYNCED_SKILL_PREFIXES.map((e) => [e, t5e(`${e}:`)]);
//@ chunk-e6aww6q8.js:958344-958553 placement
function reservedNamespaceOf(e) {
  let n = foldName_2(e);
  for (let [r, s] of mapped_2) {
    if (n === r || n.startsWith(`${r}:`)) return r;
    let h = s.length;
    if (t5e(e.slice(0, h)).toLowerCase().startsWith(s) || (n !== e && t5e(n.slice(0, h)).startsWith(s)))
      return r;
  }
  return;
}
//@ chunk-e6aww6q8.js:958553-958590 placement
function vZ(e) {
  return getReservedSkillNamespace(e) !== void 0;
}
/**
 * 返回技能名被拒的原因：使用了为 claude.ai 账号同步技能保留的命名空间，否则返回通用保留原因。
 */
//@ chunk-e6aww6q8.js:958590-958749 placement
function reservedNameReason(...e) {
  for (let n of e) {
    let r = getReservedSkillNamespace(n);
    if (r !== void 0) return `uses "${r}", a name reserved for the skills synced from your claude.ai account`;
  }
  return RESERVED_SKILL_NAMESPACE_REASON;
}

export {
  RESERVED_SKILL_NAMESPACE_REASON,
  reservedNameReason,
  vZ,
  reservedNamespaceOf,
  getReservedSkillNamespace,
};
