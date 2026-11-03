/**
 * memdir/memoryIndex.ts
 *
 * 2.1.316 新增：记忆索引的补建与维护
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10), chunk-vp5gef34.js (12)
 * attribution: placement 21, affinity 1
 */
import {
  realpath,
  realpath as realpath_2,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  unlink,
  open,
  open as open_2,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  unlink as unlink_5,
  unlink as unlink_6,
  unlink as unlink_7,
  unlink as unlink_8,
  unlink as unlink_9,
  unlink as unlink_10,
  unlink as unlink_11,
  unlink as unlink_12,
  unlink as unlink_13,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
} from "fs/promises";
import {
  join,
  join as join_2,
  sep,
  sep as sep_2,
  sep as sep_3,
  resolve,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
  randomBytes as randomBytes_6,
  randomBytes as randomBytes_7,
  randomBytes as randomBytes_8,
  randomBytes as randomBytes_9,
  randomBytes as randomBytes_10,
  randomBytes as randomBytes_11,
  randomBytes as randomBytes_12,
  randomBytes as randomBytes_13,
  randomBytes as randomBytes_14,
} from "crypto";
import { memoizeWithLRU, aV, memoizeWithTTLAsync } from "../utils/memoize.js";
import { count, uniq } from "../utils/collections.js";
import {
  C,
  Rn,
  A,
  j,
  De,
  pt,
  ut,
  ft,
  fe_vp5g,
  mt,
  gt,
  ht,
} from "../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { writeFileAtomic, assertPathSafeAsync } from "../utils/atomicPublishWrite.js";
import { $c } from "../utils/platformTargets.js";
import { isENOENT, getErrnoCode, errorMessage } from "../utils/errors.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { formatFileSize } from "../utils/format.js";
import { HQ, x0o } from "../utils/claudemd.js";
import { MAX_ENTRYPOINT_LINES, MAX_ENTRYPOINT_BYTES, pCn, Fae, MEMORY_INDEX_FILENAME } from "./memdir.js";
import { HostScoped } from "../utils/hostScoped.js";
import { truncateAtWord } from "../utils/stringUtils.js";
import { isExcludedMemoryKey, Thn, normalizeKeySegment } from "../services/memoryStore/memoryKeys.js";
import { logForDebugging } from "../utils/debug.js";
import { verifyLinkTarget, AMt, VIi } from "../utils/fsSafety/hardenedRead.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { scanMemoryHeaders } from "./memoryScan.js";
import { createAbortController } from "../utils/abortController.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-vp5gef34.js:1162-3668 placement
var porterStemmer = (e) => e === "a" || e === "e" || e === "i" || e === "o" || e === "u",
  se = (e, t) => {
    let n = e[t];
    if (porterStemmer(n)) return !0;
    if (n !== "y") return !1;
    let o = t;
    while (o > 0 && e[o - 1] === "y") o--;
    let s = o === 0 ? !0 : porterStemmer(e[o - 1]);
    return (t - o) % 2 === 0 ? !s : s;
  },
  G = (e) => {
    let t = 0,
      n = !1;
    for (let o = 0; o < e.length; o++) {
      let s = e[o],
        r = porterStemmer(s) || (s === "y" && o > 0 && !n);
      if (!r && n) t++;
      n = r;
    }
    return t;
  },
  Be = (e) => {
    let t = !1;
    for (let n = 0; n < e.length; n++) {
      let o = e[n];
      if (((t = porterStemmer(o) || (o === "y" && n > 0 && !t)), t)) return !0;
    }
    return !1;
  },
  We = (e) => e.length >= 2 && e.at(-1) === e.at(-2) && !se(e, e.length - 1),
  je = (e) => {
    if (e.length < 3) return !1;
    let at = e.at(-1);
    return (
      !se(e, e.length - 3) &&
      se(e, e.length - 2) &&
      !se(e, e.length - 1) &&
      at !== "w" &&
      at !== "x" &&
      at !== "y"
    );
  },
  Le = (e, t) => {
    for (let [n, o, s] of t) {
      if (!e.endsWith(n)) continue;
      let sliced = e.slice(0, e.length - n.length);
      return G(sliced) > s ? sliced + o : e;
    }
    return e;
  },
  Nt = (e) => {
    if (e.endsWith("sses")) return e.slice(0, -2);
    if (e.endsWith("ies")) return e.slice(0, -2);
    if (e.endsWith("ss")) return e;
    if (e.endsWith("s")) return e.slice(0, -1);
    return e;
  },
  Ct = (e) => {
    if (e.endsWith("eed")) {
      let sliced = e.slice(0, -3);
      return G(sliced) > 0 ? e.slice(0, -1) : e;
    }
    let t = e.endsWith("ed") ? e.slice(0, -2) : e.endsWith("ing") ? e.slice(0, -3) : void 0;
    if (t === void 0 || !Be(t)) return e;
    if (t.endsWith("at") || t.endsWith("bl") || t.endsWith("iz")) return t + "e";
    let at = t.at(-1);
    if (We(t) && at !== "l" && at !== "s" && at !== "z") return t.slice(0, -1);
    if (G(t) === 1 && je(t)) return t + "e";
    return t;
  },
  _t = (e) => (e.endsWith("y") && Be(e.slice(0, -1)) ? e.slice(0, -1) + "i" : e),
  Lt = [
    ["ational", "ate", 0],
    ["tional", "tion", 0],
    ["enci", "ence", 0],
    ["anci", "ance", 0],
    ["izer", "ize", 0],
    ["abli", "able", 0],
    ["bli", "ble", 0],
    ["alli", "al", 0],
    ["entli", "ent", 0],
    ["eli", "e", 0],
    ["ousli", "ous", 0],
    ["ization", "ize", 0],
    ["ation", "ate", 0],
    ["ator", "ate", 0],
    ["alism", "al", 0],
    ["iveness", "ive", 0],
    ["fulness", "ful", 0],
    ["ousness", "ous", 0],
    ["aliti", "al", 0],
    ["iviti", "ive", 0],
    ["biliti", "ble", 0],
    ["logi", "log", 0],
  ],
  Bt = [
    ["icate", "ic", 0],
    ["ative", "", 0],
    ["alize", "al", 0],
    ["iciti", "ic", 0],
    ["ical", "ic", 0],
    ["ful", "", 0],
    ["ness", "", 0],
  ],
  Wt = [
    "al",
    "ance",
    "ence",
    "er",
    "ic",
    "able",
    "ible",
    "ant",
    "ement",
    "ment",
    "ent",
    "ion",
    "ou",
    "ism",
    "ate",
    "iti",
    "ous",
    "ive",
    "ize",
  ],
  jt = (e) => {
    for (let t of Wt) {
      if (!e.endsWith(t)) continue;
      let sliced = e.slice(0, e.length - t.length),
        o = t !== "ion" || sliced.endsWith("s") || sliced.endsWith("t");
      return G(sliced) > 1 && o ? sliced : e;
    }
    return e;
  },
  Ut = (e) => {
    if (!e.endsWith("e")) return e;
    let sliced = e.slice(0, -1),
      n = G(sliced);
    if (n > 1) return sliced;
    if (n === 1 && !je(sliced)) return sliced;
    return e;
  },
  Ht = (e) => (G(e) > 1 && We(e) && e.endsWith("l") ? e.slice(0, -1) : e),
  Gt = (e) => {
    if (e.length <= 2) return e;
    let t = Nt(e);
    return (
      (t = Ct(t)),
      (t = _t(t)),
      (t = Le(t, Lt)),
      (t = Le(t, Bt)),
      (t = jt(t)),
      (t = Ut(t)),
      (t = Ht(t)),
      t
    );
  },
  Ue = memoizeWithLRU(Gt, (e) => e, 50000),
  eo = aV(Ue.cache),
  be = (e) => (e.length <= 2 ? e : Ue(e));
/**
 * 记忆索引分词：NFKD 归一化，支持 CJK 单字切分与英文词干。
 */
//@ chunk-vp5gef34.js:3668-7390 placement
var tokenizeForIndex = /[\p{L}\p{M}\p{N}]+/gu,
  ae = (e) => e >= "A" && e <= "Z",
  Se = (e) => e >= "a" && e <= "z",
  xe = (e) => e >= "0" && e <= "9",
  He = (e) => ae(e) || Se(e),
  $t = (e) => {
    let t = [],
      n = 0;
    for (let o = 1; o < e.length; o++) {
      let s = e[o - 1] ?? "",
        r = e[o] ?? "",
        i = e[o + 1] ?? "",
        a = i === "s" && o + 2 === e.length;
      if (
        ((Se(s) || xe(s)) && ae(r)) ||
        (ae(s) && ae(r) && Se(i) && !a) ||
        (He(s) && xe(r)) ||
        (xe(s) && He(r))
      )
        (t.push(e.slice(n, o)), (n = o));
    }
    return (t.push(e.slice(n)), t);
  },
  de = (e) =>
    e
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
  Ge = (e) => /^[a-z]+$/.test(e),
  Qe = (e) => {
    let t = $t(e);
    return t.length > 1
      ? [{ text: e, compound: !0 }, ...t.map((n) => ({ text: n, compound: !1 }))]
      : [{ text: e, compound: !1 }];
  },
  Z = String.raw`(^|[^\p{L}\p{N}]|[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])`,
  ie = String.raw`(?!(?![\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])[\p{L}\p{N}])`,
  Vt = [
    [new RegExp(Z + String.raw`[cC]\+\+` + ie, "gu"), " cpp "],
    [new RegExp(Z + String.raw`[cC]#` + ie, "gu"), " csharp "],
    [new RegExp(Z + String.raw`[fF]#` + ie, "gu"), " fsharp "],
    [new RegExp(Z + String.raw`\.[nN][eE][tT]` + ie, "gu"), " dotnet "],
  ],
  regExp = new RegExp(Z + String.raw`([vV]?\d+(?:\.\d+)+)`, "gu"),
  Yt = /^(?![\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])[\p{L}\p{N}]/u,
  k = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/,
  Xt =
    /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+|[^\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+/gu,
  Jt = (e) => {
    let t = [...e];
    if (t.length <= 2) return [e];
    let n = [e];
    for (let o = 0; o < t.length - 1; o++) n.push(t[o] + t[o + 1]);
    return n;
  },
  Zt = /[\uFF66-\uFF9F]/,
  $e = /^\p{N}+$/u,
  qt = (e) => {
    let t = [],
      n = !1,
      o = !1;
    for (let s of e) {
      let at = t.at(-1);
      if (at !== void 0 && $e.test(s) && o) {
        (at.push(s), (n = !0));
        continue;
      }
      if (at !== void 0 && n && k.test(s)) {
        (at.push(s), (n = !1), (o = !0));
        continue;
      }
      (t.push([s]), (n = $e.test(s)), (o = k.test(s)));
    }
    return t.map((s) => (s.length === 1 ? s[0] : s.join("")));
  },
  Ve = /^\p{L}$/u,
  en = (e) => {
    let t = [];
    for (let n of e) {
      let at = t.at(-1),
        s = Ve.test(n) && !k.test(n);
      if (at !== void 0) {
        let at_2 = at.at(-1);
        if (s && k.test(at_2)) {
          at.push(n);
          continue;
        }
        if (k.test(n) && Ve.test(at_2) && !k.test(at_2)) {
          at.push(n);
          continue;
        }
      }
      t.push([n]);
    }
    return t.map((n) => (n.length === 1 ? n[0] : n.join("")));
  },
  tn = (e) => {
    let t = [];
    for (let n = 0; n < e.length; n++) {
      let o = e[n];
      if (!k.test(o) || [...o].length !== 1) continue;
      let s = n > 0 ? e[n - 1] : void 0,
        r = n + 1 < e.length ? e[n + 1] : void 0,
        i =
          s !== void 0 && !k.test(s) && [...de(s)].length > 1
            ? s + o
            : r !== void 0 && !k.test(r) && [...de(r)].length > 1
              ? o + r
              : void 0;
      if (i !== void 0) t.push({ text: i, compound: !0 });
    }
    return t;
  },
  ce = (e, t) => {
    let replaced = e.replace(/\[\[([^[\]]*)\]\]/g, " $1 ");
    for (let [r, i] of Vt) replaced = replaced.replace(r, (a, c) => c + i);
    replaced = replaced.replace(regExp, (r, i, a, c, l) => {
      let codePoint = l.codePointAt(c + r.length);
      if (codePoint !== void 0 && Yt.test(String.fromCodePoint(codePoint))) return r;
      return `${i}${a} ${a.replaceAll(".", "")}`;
    });
    let o = replaced.match(tokenizeForIndex) ?? [],
      flattened = o
        .flatMap((r) => {
          let i = Zt.test(r) ? r.normalize("NFKC") : r;
          if (k.test(i)) {
            let c = en(qt(i.match(Xt) ?? [])),
              l = t.compounds ? tn(c) : [],
              flattened = c.flatMap((h) => {
                if (!k.test(h)) {
                  let m = Qe(h);
                  return t.compounds ? m : m.filter((g) => !g.compound);
                }
                let u = Jt(h),
                  p = u.length > 1,
                  mapped = (h.match(/\p{N}{3,}/gu) ?? []).map((m) => ({ text: m, compound: !0 }));
                return [...u.map((m, g) => ({ text: m, compound: p && g === 0 })), ...mapped].filter(
                  (m) => !m.compound || t.compounds,
                );
              });
            return (
              flattened.push(...l),
              [...flattened.filter((h) => h.compound), ...flattened.filter((h) => !h.compound)]
            );
          }
          let a = Qe(i);
          return t.compounds ? a : a.filter((c) => !c.compound);
        })
        .map(({ text: text, compound: compound }) => ({ text: de(text), compound: compound }))
        .filter(({ text: text }) => text.length > 1)
        .flatMap(({ text: text, compound: compound }) => {
          if (compound) {
            let c = t.dualStem && Ge(text) ? be(text) : text;
            return c !== text ? [text, c] : [text];
          }
          if (!Ge(text)) return [text];
          let a = be(text);
          return t.dualStem && a !== text ? [a, text] : [a];
        });
    if (flattened.length > 0 || o.length === 0 || t.singleCharFallback === !1) return flattened;
    return o.map(de);
  },
  W = (e) => ce(e, { dualStem: !1, compounds: !0 }),
  Ie = (e) => ce(e, { dualStem: !1, compounds: !0, singleCharFallback: !1 }),
  Q = (e) => ce(e, { dualStem: !0, compounds: !0 }),
  Ke = (e) => ce(e, { dualStem: !1, compounds: !1 });
//@ chunk-vp5gef34.js:7390-8573 placement
var extractMemoryFields = ["filename", "frontmatter", "headings", "body"],
  nn = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/,
  on = /^[\w-]+:/m,
  sn = /^#{1,6}\s+(.*)$/,
  rn = /^(`{3,}|~{3,})(.*)$/,
  an = (e) => {
    let sliced = e.slice(e.lastIndexOf("/") + 1),
      index = sliced.lastIndexOf(".");
    return index > 0 ? sliced.slice(0, index) : sliced;
  },
  dn = (e) => {
    let t = { headings: [], body: [[]] },
      n;
    for (let o of e) {
      let match = o.match(rn);
      if (match !== null) {
        let a = match[1];
        if (n === void 0) {
          ((n = a), t.body.at(-1).push(o));
          continue;
        }
        if (a[0] === n[0] && a.length >= n.length && match[2].trim() === "") {
          ((n = void 0), t.body.at(-1).push(o));
          continue;
        }
      }
      let i = n !== void 0 ? void 0 : o.match(sn)?.[1];
      if (i === void 0) t.body.at(-1).push(o);
      else (t.headings.push(i), t.body.push([]));
    }
    return t;
  },
  cn = (e) => {
    let filtered = e.map((n) => Ie(n)).filter((n) => n.length > 0);
    if (filtered.length > 0) return filtered.flatMap((n) => [...n, ""]);
    return W(
      e.join(`
`),
    );
  },
  ln = (e) => {
    let filtered = e
      .map((n) =>
        Ie(
          n.join(`
`),
        ),
      )
      .filter((n) => n.length > 0);
    if (filtered.length > 0) return filtered.flatMap((n, o) => (o === 0 ? n : ["", ...n]));
    return W(
      e.map((n) =>
        n.join(`
`),
      ).join(`
`),
    );
  },
  we = (e, t) => {
    let replaced = t.replace(/^\uFEFF/, ""),
      match = replaced.match(nn),
      s = match !== null && on.test(match[1] ?? ""),
      r = s ? (match[1] ?? "") : "",
      i = s ? replaced.slice(match[0].length) : replaced,
      { headings: headings, body: body } = dn(i.split(/\r?\n/));
    return {
      path: e,
      fields: { filename: W(an(e)), frontmatter: W(r), headings: cn(headings), body: ln(body) },
    };
  };
/**
 * 构建记忆文件倒排索引（posting 列表与位置）。
 */
//@ chunk-vp5gef34.js:8573-12080 placement
var buildInvertedIndex = extractMemoryFields.length,
  fromEntries = Object.fromEntries(extractMemoryFields.map((e, t) => [e, t])),
  V = 4294967295,
  Ye = () => Object.fromEntries(extractMemoryFields.map((e) => [e, 0])),
  q = () => ({
    terms: new Map(),
    docs: new Map(),
    pathToId: new Map(),
    unverified: new Set(),
    fieldLengthTotals: Ye(),
    fieldDocCounts: Ye(),
    nextDocId: 0,
  }),
  Fe = (e, t) => {
    if (e.length >= t) return e;
    let uint32Array = new Uint32Array(Math.max(t, e.length * 2));
    return (uint32Array.set(e), uint32Array);
  },
  un = (e) => {
    let t = new Map();
    return (
      extractMemoryFields.forEach((n, o) => {
        e.fields[n].forEach((s, r) => {
          if (s === "") return;
          let i = t.get(s) ?? extractMemoryFields.map(() => []);
          (i[o].push(r), t.set(s, i));
        });
      }),
      t
    );
  },
  Ee = (e, t, n, o) => {
    let s = e.terms.get(t) ?? {
        docIds: new Uint32Array(2),
        offsets: new Uint32Array(2 * buildInvertedIndex + 1),
        positions: new Uint32Array(8),
        size: 0,
      },
      size = s.size,
      i = s.offsets[buildInvertedIndex * size],
      reduced = o.reduce((l, d) => l + d.length, 0);
    if (i + reduced > V) throw Error("position space exhausted");
    if (size > 0 && s.docIds[size - 1] >= n) throw Error("posting docId out of order");
    ((s.docIds = Fe(s.docIds, size + 1)),
      (s.offsets = Fe(s.offsets, buildInvertedIndex * (size + 1) + 1)),
      (s.positions = Fe(s.positions, i + reduced)),
      (s.docIds[size] = n));
    let c = i;
    if (
      (o.forEach((l, d) => {
        ((s.offsets[buildInvertedIndex * size + d] = c), s.positions.set(l, c), (c += l.length));
      }),
      (s.offsets[buildInvertedIndex * (size + 1)] = c),
      (s.size = size + 1),
      size === 0)
    )
      e.terms.set(t, s);
  },
  fn = (e, t) => {
    let n = e.offsets[buildInvertedIndex * t],
      o = e.offsets[buildInvertedIndex * (t + 1)],
      s = e.offsets[buildInvertedIndex * e.size];
    (e.positions.copyWithin(n, o, s), e.docIds.copyWithin(t, t + 1, e.size));
    for (let r = buildInvertedIndex * (t + 1); r <= buildInvertedIndex * e.size; r++)
      e.offsets[r - buildInvertedIndex] = e.offsets[r] - (o - n);
    e.size--;
  },
  ue = (e, t) => {
    let n = 0,
      o = e.size - 1;
    while (n <= o) {
      let s = (n + o) >> 1,
        r = e.docIds[s];
      if (r === t) return s;
      if (r < t) n = s + 1;
      else o = s - 1;
    }
    return -1;
  },
  K = (e) => e.docIds.subarray(0, e.size),
  Xe = (e, t, n) =>
    e.offsets[buildInvertedIndex * t + fromEntries[n] + 1] -
    e.offsets[buildInvertedIndex * t + fromEntries[n]],
  ee = (e, t, n) => {
    let o = e.offsets[buildInvertedIndex * t + fromEntries[n]],
      s = e.offsets[buildInvertedIndex * t + fromEntries[n] + 1];
    return o === s ? void 0 : e.positions.subarray(o, s);
  },
  Je = (e, t) => e.terms.get(t)?.size ?? 0,
  Ze = (e, t) => {
    let n = e.terms.get(t);
    return n?.size === 1 ? n.docIds[0] : void 0;
  },
  qe = (e) => {
    ((e.docIds = e.docIds.slice(0, e.size)),
      (e.offsets = e.offsets.slice(0, buildInvertedIndex * e.size + 1)),
      (e.positions = e.positions.slice(0, e.offsets[buildInvertedIndex * e.size])));
  },
  Pe = (e, t, n) => {
    if (e.nextDocId > V) throw Error("docId space exhausted");
    if (e.pathToId.has(t.path)) N(e, t.path);
    let o = e.nextDocId++;
    for (let [r, i] of un(t)) Ee(e, r, o, i);
    let fromEntries = Object.fromEntries(
      extractMemoryFields.map((r) => [r, count(t.fields[r], (i) => i !== "")]),
    );
    for (let r of extractMemoryFields)
      if (((e.fieldLengthTotals[r] += fromEntries[r]), fromEntries[r] > 0)) e.fieldDocCounts[r]++;
    return (
      e.docs.set(o, {
        path: t.path,
        hash: n.hash,
        size: n.size,
        mtimeMs: n.mtimeMs,
        fieldLengths: fromEntries,
      }),
      e.pathToId.set(t.path, o),
      o
    );
  },
  et = (e, t, n) => {
    for (let o of extractMemoryFields)
      if (((e.fieldLengthTotals[o] -= n.fieldLengths[o]), n.fieldLengths[o] > 0)) e.fieldDocCounts[o]--;
    (e.docs.delete(t), e.pathToId.delete(n.path), e.unverified.delete(t));
  },
  nt = (e, t, n) => {
    for (let [o, s] of e.terms) {
      let r = ue(s, t);
      if (r < 0) continue;
      if ((fn(s, r), s.size === 0)) e.terms.delete(o);
    }
    et(e, t, n);
  },
  N = (e, t) => {
    let n = e.pathToId.get(t),
      o = n === void 0 ? void 0 : e.docs.get(n);
    if (n === void 0 || o === void 0) return !1;
    return (nt(e, n, o), !0);
  },
  pn = (e, t) => {
    let n = 0;
    while (n < e.size && !t.has(e.docIds[n])) n++;
    if (n === e.size) return;
    let o = n,
      s = e.offsets[buildInvertedIndex * n];
    for (; n < e.size; n++) {
      let r = e.docIds[n],
        i = e.offsets[buildInvertedIndex * n],
        a = e.offsets[buildInvertedIndex * (n + 1)];
      if (t.has(r)) continue;
      let c = i - s;
      (e.positions.copyWithin(s, i, a), (e.docIds[o] = r));
      for (let l = 0; l < buildInvertedIndex; l++)
        e.offsets[buildInvertedIndex * o + l] = e.offsets[buildInvertedIndex * n + l] - c;
      ((s += a - i), o++);
    }
    ((e.offsets[buildInvertedIndex * o] = s), (e.size = o));
  },
  mn = 16,
  ot = (e, t) => {
    let n = new Map();
    for (let s of t) {
      let r = e.pathToId.get(s),
        i = r === void 0 ? void 0 : e.docs.get(r);
      if (r !== void 0 && i !== void 0) n.set(r, i);
    }
    if (n.size < mn) {
      for (let [s, r] of n) nt(e, s, r);
      return n.size;
    }
    let o = new Set(n.keys());
    for (let [s, r] of e.terms) if ((pn(r, o), r.size === 0)) e.terms.delete(s);
    for (let [s, r] of n) et(e, s, r);
    return n.size;
  },
  st = (e) => ({
    docCount: e.docs.size,
    avgFieldLength: Object.fromEntries(
      extractMemoryFields.map((t) => [
        t,
        e.fieldDocCounts[t] === 0 ? 0 : e.fieldLengthTotals[t] / e.fieldDocCounts[t],
      ]),
    ),
  });
/**
 * 记忆索引 BM25 检索。
 */
//@ chunk-vp5gef34.js:12080-15423 placement
var bm25Search = {
    k1: 1.2,
    fieldWeights: { filename: 3, frontmatter: 3, headings: 2.5, body: 1 },
    fieldB: { filename: 0.75, frontmatter: 0.75, headings: 0.75, body: 0.75 },
    proximityWeight: 0,
    phraseBoost: 0.5,
  },
  it = (e) => {
    let t = Ke(e);
    if (t.length === 0) return [];
    let n = W(e),
      o = [],
      s = [],
      r = 0;
    for (let i of n) {
      if (r < t.length && i === t[r]) {
        (s.push(i), r++);
        continue;
      }
      if (s.length > 0) (o.push(s), (s = []));
    }
    if (s.length > 0) o.push(s);
    for (; r < t.length; r++) o.push([t[r]]);
    return o;
  },
  Ae = (e) => {
    let n =
      ((e.match(/"/g) ?? []).length & 1) === 0
        ? [...e.matchAll(/"([^"]*)"/g)]
            .flatMap((o) => it(o[1] ?? ""))
            .filter((o) => o.length > 1 && o.every((s) => s.length > 1))
        : [];
    return { terms: uniq(Q(e)), phrases: n, boostPhrases: [] };
  },
  ve = (e, t) => {
    let log = Math.log((e - t + 0.5) / (t + 0.5));
    return log <= 0 ? 0.000001 : log;
  },
  hn = 0.7,
  gn = 16,
  at = (e) => (e < gn ? 0 : hn * ve(e, 1)),
  yn = (e, t, n, o, s) =>
    extractMemoryFields.reduce((r, i) => {
      let a = Xe(e, t, i);
      if (a === 0 || o[i] === 0) return r;
      let c = s.fieldB[i],
        l = 1 - c + (c * n[i]) / o[i];
      return r + (s.fieldWeights[i] * a) / l;
    }, 0),
  rt = (e, t, n) => {
    let mapped = n.map((s) => dt(e, s, t));
    if (mapped.some((s) => s === void 0)) return !1;
    return extractMemoryFields.some((s) => {
      let r = [];
      for (let c of mapped) {
        let l = c === void 0 ? void 0 : ee(c.entry, c.slot, s);
        if (l === void 0) return !1;
        r.push(l);
      }
      let [i, ...a] = r;
      if (i === void 0) return !1;
      return i.some((c) => a.every((l, d) => bn(l, c + d + 1)));
    });
  },
  dt = (e, t, n) => {
    let o = e.terms.get(t),
      s = o === void 0 ? -1 : ue(o, n);
    return o === void 0 || s < 0 ? void 0 : { entry: o, slot: s };
  },
  bn = (e, t) => {
    let n = 0,
      o = e.length - 1;
    while (n <= o) {
      let s = (n + o) >> 1,
        r = e[s];
      if (r === t) return !0;
      if (r < t) n = s + 1;
      else o = s - 1;
    }
    return !1;
  },
  ct = { span: 1 / 0, termCount: 0 },
  xn = (e, t, n) => {
    let filtered = n
      .map((l) => {
        let d = dt(e, l, t);
        return d === void 0 ? void 0 : ee(d.entry, d.slot, "body");
      })
      .filter((l) => l !== void 0);
    if (filtered.length < 2) return ct;
    let sorted = filtered
        .flatMap((l, d) => Array.from(l, (h) => ({ pos: h, termIdx: d })))
        .sort((l, d) => l.pos - d.pos),
      r = new Map(),
      i = [],
      a = 0,
      c = 1 / 0;
    for (let l of sorted) {
      i.push(l);
      let d = r.get(l.termIdx) ?? 0;
      if ((r.set(l.termIdx, d + 1), d === 0)) a++;
      while (a === filtered.length) {
        let h = i.shift();
        if (h === void 0) break;
        c = Math.min(c, l.pos - h.pos + 1);
        let u = r.get(h.termIdx) ?? 0;
        if ((r.set(h.termIdx, u - 1), u === 1)) a--;
      }
    }
    return { span: c, termCount: filtered.length };
  },
  lt = (e, t) => {
    let flattened = e.flatMap((a) => it(a)),
      o = uniq([...e.flatMap((a) => Q(a)), ...t.flatMap((a) => Q(a))]),
      filtered = flattened.filter((a) => a.length > 1),
      r = new Set(),
      filtered_2 = filtered.filter((a) => {
        let joined = a.join(" ");
        if (r.has(joined)) return !1;
        return (r.add(joined), !0);
      });
    return { terms: o, phrases: [], boostPhrases: filtered_2 };
  },
  Te = (e, t, n, o = bm25Search) => {
    let { terms: terms, phrases: phrases, boostPhrases: boostPhrases } = typeof t === "string" ? Ae(t) : t,
      a = st(e);
    if (a.docCount === 0 || terms.length === 0) return [];
    let mapped = terms.map((p) => e.terms.get(p)),
      l = new Map(terms.map((p, f) => [p, ve(a.docCount, mapped[f]?.size ?? 0)])),
      d = new Map(
        boostPhrases
          .flat()
          .filter((p) => !l.has(p))
          .map((p) => [p, ve(a.docCount, e.terms.get(p)?.size ?? 0)]),
      ),
      h = new Set(mapped.flatMap((p) => (p === void 0 ? [] : [...K(p)])));
    for (let p of boostPhrases) {
      let mapped = p.map((I) => e.terms.get(I));
      if (mapped.some((I) => I === void 0)) continue;
      let [m, ...g] = mapped,
        mapped_2 = g.map((I) => new Set(K(I)));
      for (let I of K(m)) if (mapped_2.every((T) => T.has(I))) h.add(I);
    }
    return [...h]
      .filter((p) => phrases.every((f) => rt(e, p, f)))
      .map((p) => {
        let f = e.docs.get(p),
          mapped_2 = mapped.map((v) => (v === void 0 ? -1 : ue(v, p))),
          filtered = terms.filter((v, R) => mapped_2[R] >= 0),
          reduced = terms.reduce((v, R, E) => {
            if (mapped_2[E] < 0) return v;
            let D = yn(mapped[E], mapped_2[E], f.fieldLengths, a.avgFieldLength, o);
            return v + l.get(R) * (D / (o.k1 + D));
          }, 0),
          reduced_2 = boostPhrases.reduce(
            (v, R) =>
              rt(e, p, R) ? v + o.phraseBoost * R.reduce((E, D) => E + (l.get(D) ?? d.get(D) ?? 0), 0) : v,
            0,
          ),
          { span: span, termCount: termCount } = o.proximityWeight > 0 ? xn(e, p, filtered) : ct,
          P = span === 1 / 0 ? 0 : (o.proximityWeight * reduced) / Math.max(1, 1 + span - termCount);
        return { path: f.path, score: reduced + reduced_2 + P, matchedTerms: filtered };
      })
      .filter((p) => p.score > 0)
      .sort((p, f) => f.score - p.score || (p.path < f.path ? -1 : 1))
      .slice(0, n);
  };
/**
 * 记忆 BM25 索引与磁盘同步：An 比较扫描结果找出需重建与需删除的文档；yt 扫描目录、确认失踪文件确实不存在后删除，读入新增/变化的 .md 并更新哈希，返回增删改与跳过的统计。
 */
//@ chunk-vp5gef34.js:19463-21378 affinity
var diffMemoryIndex = (e, t, n = new Set(), o = new Set(), s) => {
    let r = new Set(t.map((d) => d.path)),
      mapped = [...o].map((d) => d + "/"),
      a = (d) => mapped.length > 0 && mapped.some((h) => d.startsWith(h)),
      filtered = [...e.pathToId.keys()].filter((d) => s?.(d) === !0 || (!r.has(d) && !n.has(d) && !a(d))),
      filtered_2 = t.filter((d) => {
        let h = e.pathToId.get(d.path);
        if (h === void 0) return !0;
        let u = e.docs.get(h);
        return u.size !== d.size || u.mtimeMs !== d.mtimeMs;
      });
    return { toIndex: filtered_2, toRemove: filtered, unchangedCount: t.length - filtered_2.length };
  },
  syncMemoryIndex = async (e, t, n = C, o) => {
    let s = {
      added: 0,
      updated: 0,
      removed: 0,
      unchanged: e.docs.size,
      rehashedUnchanged: 0,
      transientSkips: 0,
      scanCompleted: !1,
    };
    if (o?.aborted) return s;
    let r = await Rn(t, n).catch(() => {
      return;
    });
    if (r === void 0) return s;
    if (r.rootMissing && e.docs.size > 0) return s;
    let i = await realpath_2(t).catch((y) => (A(y) === "structural" ? void 0 : j));
    if (i === j) return s;
    let a = diffMemoryIndex(e, r.files, r.skipped, r.skippedSubtrees, (y) => De(y, n)),
      c = [],
      l = [];
    await Promise.all(
      a.toRemove.map(async (y) => {
        if (De(y, n) || r.capDropped.has(y)) c.push(y);
        else if (await pt(t, y, n.maxFileBytes)) l.push(y);
      }),
    );
    let h =
        l.length === 0 ||
        (await realpath_2(t).then(
          () => !0,
          () => !1,
        ))
          ? [...c, ...l]
          : c,
      u = a.toRemove.length - h.length,
      p = ot(e, h),
      f = 0,
      m = 0,
      g = 0,
      S = 0,
      I = 0,
      T = !1;
    for (let y of a.toIndex) {
      if (o?.aborted) {
        T = !0;
        break;
      }
      let P = await ut(join(t, y.path), { withinReal: i, maxBytes: n.maxFileBytes }).catch((X) =>
        ft(X) ? fe_vp5g : A(X) === "structural" ? void 0 : j,
      );
      if (P === j) {
        I++;
        continue;
      }
      if (P === fe_vp5g) {
        if (N(e, y.path)) S++;
        continue;
      }
      if (P === void 0) {
        if (!(await mt(t, y.path))) {
          I++;
          continue;
        }
        if (N(e, y.path)) S++;
        continue;
      }
      if (P.byteLength > n.maxFileBytes) {
        if (N(e, y.path)) S++;
        continue;
      }
      let decode = new TextDecoder().decode(P),
        R = gt(decode),
        E = e.pathToId.get(y.path),
        D = E === void 0 ? void 0 : e.docs.get(E);
      if (D?.hash === R && !e.unverified.has(E)) {
        (e.docs.set(E, { ...D, size: y.size, mtimeMs: y.mtimeMs }), g++);
        continue;
      }
      if ((Pe(e, we(y.path, decode), { hash: R, size: y.size, mtimeMs: y.mtimeMs }), D === void 0)) f++;
      else m++;
    }
    return {
      added: f,
      updated: m,
      removed: p + S,
      unchanged: a.unchangedCount,
      rehashedUnchanged: g,
      transientSkips: I + u + r.skipped.size + r.skippedSubtrees.size,
      scanCompleted: !T,
    };
  };
//@ chunk-vp5gef34.js:21378-21544 placement
var logRecallIndexSad = async (e, t = {}) => {
  let { logFeatureSad: logFeatureSad } = await import("./chunk-53at0fec.js").catch(() => ({
    logFeatureSad: void 0,
  }));
  logFeatureSad?.("memory_recall_select", e, { via_index: !0, ...t });
};
/**
 * 反序列化记忆 BM25 索引并校验倒排数据。
 */
//@ chunk-vp5gef34.js:21662-26032 placement
var deserializeIndex = 10,
  On = (e) => {
    let sorted = [...e.docs.keys()].sort((r, i) => r - i),
      n = new Map(sorted.map((r, i) => [r, i])),
      mapped = sorted.map((r) => {
        let i = e.docs.get(r);
        return [i.path, i.hash, i.size, i.mtimeMs, extractMemoryFields.map((a) => i.fieldLengths[a])];
      }),
      mapped_2 = [...e.terms.entries()].map(([r, i]) => {
        let a = [],
          c = -1;
        return (
          K(i).forEach((l, d) => {
            let h = n.get(l);
            if (h === void 0) throw Error("posting references unknown docId");
            (a.push(c < 0 ? h : h - c), (c = h));
            let mapped = extractMemoryFields.map((p) => ee(i, d, p));
            for (let p of mapped) a.push(p?.length ?? 0);
            for (let p of mapped)
              p?.forEach((f, m) => {
                a.push(m === 0 ? f : f - p[m - 1]);
              });
          }),
          [r, a]
        );
      });
    return { version: deserializeIndex, docs: mapped, terms: mapped_2 };
  },
  ze = (e, t) => {
    let n = e[t];
    if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > V)
      throw Error("malformed posting data");
    return n;
  },
  kn = (e, t, n, o) => {
    let mapped = extractMemoryFields.map(() => 0),
      mapped_2 = extractMemoryFields.map(() => []),
      i = 0,
      a = -1;
    while (i < n.length) {
      let l = ze(n, i++),
        d = a < 0 ? l : a + l;
      if (d >= o) throw Error("posting references unknown docId");
      if (a >= 0 && l === 0) throw Error("repeated posting docId");
      a = d;
      let h = 0;
      if (
        (extractMemoryFields.forEach((u, p) => {
          ((mapped[p] = ze(n, i + p)), (h += mapped[p]));
        }),
        (i += extractMemoryFields.length),
        h === 0 || i + h > n.length)
      )
        throw Error("malformed posting positions");
      (extractMemoryFields.forEach((u, p) => {
        let f = mapped_2[p];
        f.length = 0;
        let m = -1;
        for (let g = 0; g < mapped[p]; g++) {
          let S = ze(n, i++);
          if (((m = m < 0 ? S : m + S), (g > 0 && S === 0) || m > V))
            throw Error("malformed posting positions");
          f.push(m);
        }
      }),
        Ee(e, t, d, mapped_2));
    }
    let c = e.terms.get(t);
    if (c === void 0) throw Error("empty term entry");
    qe(c);
  },
  Nn = (e) => {
    if (e.version !== deserializeIndex) throw Error("unsupported index format version");
    if (!Array.isArray(e.docs) || !Array.isArray(e.terms)) throw Error("malformed index shape");
    let t = q();
    for (let [n, o] of e.docs.entries()) {
      if (!Array.isArray(o) || o.length !== 5) throw Error("malformed doc entry");
      let [s, r, i, a, c] = o;
      if (
        typeof r !== "string" ||
        !Number.isFinite(i) ||
        !Number.isFinite(a) ||
        !Array.isArray(c) ||
        c.length !== extractMemoryFields.length ||
        c.some((d) => !Number.isInteger(d) || d < 0 || d > V)
      )
        throw Error("malformed doc metadata");
      if (
        typeof s !== "string" ||
        s.length === 0 ||
        s.startsWith("/") ||
        (sep_3 === "\\" && (s.includes("\\") || /^[A-Za-z]:/.test(s))) ||
        s.includes("\x00") ||
        s.split("/").some((d) => d === ".." || d === "" || d === ".")
      )
        throw Error("non-contained doc path");
      if (t.pathToId.has(s)) throw Error("duplicate doc entry");
      let fromEntries = Object.fromEntries(extractMemoryFields.map((d, h) => [d, c[h]]));
      (t.docs.set(n, { path: s, hash: r, size: i, mtimeMs: a, fieldLengths: fromEntries }),
        t.pathToId.set(s, n),
        t.unverified.add(n));
      for (let d of extractMemoryFields)
        if (((t.fieldLengthTotals[d] += fromEntries[d]), fromEntries[d] > 0)) t.fieldDocCounts[d]++;
    }
    if (extractMemoryFields.some((n) => !Number.isSafeInteger(t.fieldLengthTotals[n])))
      throw Error("malformed doc metadata");
    t.nextDocId = e.docs.length;
    for (let term of e.terms) {
      if (!Array.isArray(term) || term.length !== 2) throw Error("malformed term entry");
      let [o, s] = term;
      if (typeof o !== "string" || o.length === 0 || !Array.isArray(s) || t.terms.has(o))
        throw Error("malformed term entry");
      kn(t, o, s, e.docs.length);
    }
    return t;
  },
  xt = async (e, t, n = Oe) => {
    let o = jsonStringify(On(e)),
      byteLength = Buffer.byteLength(o);
    if (byteLength > n) {
      logRecallIndexSad("index_persist_skipped_oversized");
      let r = await lstat_3(t).catch(() => {
        return;
      });
      if (r !== void 0 && r.size > n) await unlink(t).catch(() => {});
      return 0;
    }
    return (await writeFileAtomic(t, o, 384), byteLength);
  },
  pe = Symbol("transient-index-read-failure"),
  oe = '{"version"',
  Oe = 67108864,
  ke = Symbol("index-file-oversized"),
  St = async (e) => {
    let t = await open_2(e, $c());
    try {
      let stats = await t.stat();
      if (!stats.isFile()) throw Object.assign(Error("not a regular file"), { code: "ENOTREG" });
      if (stats.size > Oe) {
        let alloc = Buffer.alloc(64),
          { bytesRead: bytesRead } = await t.read(alloc, 0, 64, 0);
        throw Object.assign(Error("index file oversized"), {
          code: ke,
          head: alloc.subarray(0, bytesRead).toString("utf8"),
        });
      }
      let content = await t.readFile({ encoding: "utf8" });
      if (Buffer.byteLength(content) > Oe)
        throw Object.assign(Error("index file oversized"), { code: ke, head: content.slice(0, 64) });
      return content;
    } finally {
      await t.close();
    }
  },
  It = (e) => {
    let t = e;
    if (t.code !== ke) return;
    return (typeof t.head === "string" ? t.head.trim() : "").startsWith(oe);
  },
  wt = async (e) => {
    let t,
      n = await St(e).catch((o) => ((t = It(o)), isENOENT(o) ? void 0 : pe));
    if (n === pe) return { owned: t ?? !1, absent: !1 };
    if (n === void 0) return { owned: !0, absent: !0 };
    try {
      let o = jsonParse(n);
      return { owned: typeof o === "object" && o !== null && typeof o.version === "number", absent: !1 };
    } catch {
      let sliced = n.trim().slice(0, oe.length);
      return { owned: sliced === "" || oe.startsWith(sliced), absent: !1 };
    }
  },
  Ft = async (e) => {
    let t,
      n = await St(e).catch((s) => ((t = It(s)), isENOENT(s) ? void 0 : pe));
    if (n === pe) return { index: void 0, pathOwned: t ?? !1 };
    if (n === void 0) return { index: void 0, pathOwned: !0 };
    let o;
    try {
      o = jsonParse(n);
    } catch {
      let sliced = n.trim().slice(0, oe.length);
      return { index: void 0, pathOwned: sliced === "" || oe.startsWith(sliced) };
    }
    if (typeof o !== "object" || o === null || typeof o.version !== "number")
      return { index: void 0, pathOwned: !1 };
    try {
      return { index: Nn(o), pathOwned: !0 };
    } catch {
      return { index: void 0, pathOwned: !0 };
    }
  };
//@ chunk-vp5gef34.js:26032-27170 placement
var memoryIndexPath = ".bm25-index.json",
  Et = async (e, t = C, n, o = !0) => {
    let s = join_2(e, memoryIndexPath),
      r = o ? await Ft(s) : { index: void 0, pathOwned: !1 },
      i = r.index ?? q(),
      a = await syncMemoryIndex(i, e, t, n),
      c = r.index !== void 0 && !a.scanCompleted;
    return {
      dir: e,
      indexPath: s,
      index: c ? q() : i,
      lastSync: c
        ? {
            added: 0,
            updated: 0,
            removed: 0,
            unchanged: 0,
            rehashedUnchanged: 0,
            transientSkips: 0,
            scanCompleted: !1,
          }
        : a,
      loadedFromDisk: r.index !== void 0,
      persistable: r.pathOwned && !c,
      options: t,
    };
  },
  Pt = async (e) => {
    if (!e.persistable || !e.lastSync.scanCompleted) return 0;
    let t = await wt(e.indexPath);
    if (!t.owned || (e.loadedFromDisk && t.absent)) return 0;
    return xt(e.index, e.indexPath);
  },
  vt = async (e, t, n = 5, o = bm25Search) => {
    let s = new Set(),
      r = (i) => i.filter((a) => !s.has(a.path));
    for (let i = 0; i < 8; i++) {
      let sliced = r(Te(e.index, t, n + s.size, o)).slice(0, n),
        filtered = sliced.filter((l) => {
          let d = e.index.pathToId.get(l.path);
          return d !== void 0 && e.index.unverified.has(d);
        });
      if (filtered.length === 0) return sliced;
      for (let l of filtered) {
        let d = e.index.pathToId.get(l.path);
        if (!(await ht(e.index, e.dir, l.path, e.options)) && d !== void 0 && e.index.unverified.has(d))
          s.add(l.path);
      }
    }
    return r(Te(e.index, t, n + s.size, o))
      .filter((i) => {
        let a = e.index.pathToId.get(i.path);
        return a === void 0 || !e.index.unverified.has(a);
      })
      .slice(0, n);
  };
//@ chunk-vp5gef34.js:27170-29264 placement
var syncMemoryIndex_2 = Symbol("transient-realpath-failure"),
  Bn = (e) => e.added > 0 || e.updated > 0 || e.removed > 0 || e.rehashedUnchanged > 0,
  Wn = (e) => {
    let t = [...e.boostPhrases, ...e.phrases],
      n = new Set(),
      o = [];
    for (let s = t.length - 1; s >= 0; s--) {
      let r = t[s],
        joined = r.join(" ");
      if (!n.has(joined)) (n.add(joined), o.push(r));
    }
    return (o.reverse(), { terms: e.terms, phrases: [], boostPhrases: o });
  },
  jn = 4096,
  Hn = 3072,
  Gn = 1024,
  Rt = (e, t) => {
    if (((e.match(/"/g) ?? []).length & 1) === 0) return e;
    let n = t ? e.lastIndexOf('"') : e.indexOf('"');
    return e.slice(0, n) + " " + e.slice(n + 1);
  },
  At = (e, t) => (t > 0 && t < e.length && (e.charCodeAt(t) & 64512) === 56320 ? t - 1 : t),
  Qn = (e) => {
    if (e.length <= jn) return e;
    let t = At(e, Hn),
      n = At(e, e.length - Gn),
      o = `${Rt(e.slice(0, t), !0)}
${Rt(e.slice(n), !1)}`;
    return ((e.match(/"/g) ?? []).length & 1) === 0 ? o : o.replaceAll('"', " ");
  },
  Dt = 64,
  $n = (e) => e.slice(-8).map((t) => (t.length <= 16 ? t : t.slice(0, 16))),
  Vn = 8,
  Kn = 24,
  Tt = 4,
  Yn = (e, t, n, o, s) => {
    let r = new Set(e),
      i = new Set(),
      a = new Map(),
      c = (u) => {
        let p = t(u);
        if (p === 0) return !1;
        if (p === 1) {
          let f = n(u);
          if (f !== void 0) {
            let m = a.get(f) ?? 0;
            if (m >= Tt) return !1;
            a.set(f, m + 1);
          }
        }
        return !0;
      };
    for (let u of s) if (r.has(u) && c(u)) i.add(u);
    let size = i.size;
    for (let u of o) {
      if (i.size >= size + Vn) break;
      if (r.has(u) && !i.has(u) && c(u)) i.add(u);
    }
    let size_2 = i.size;
    for (let u = o.length - 1; u >= 0 && i.size < size_2 + Kn; u--) {
      let p = o[u];
      if (r.has(p) && !i.has(p) && c(p)) i.add(p);
    }
    let sorted = e
      .filter((u) => !i.has(u))
      .map((u) => {
        let p = t(u);
        if (p === 0) return { t: u, key: Number.MAX_SAFE_INTEGER };
        if (p === 1) {
          let f = n(u);
          if (f !== void 0) {
            let m = a.get(f) ?? 0;
            if ((a.set(f, m + 1), m >= Tt)) return { t: u, key: Number.MAX_SAFE_INTEGER - 1 };
          }
          return { t: u, key: 1 };
        }
        return { t: u, key: p };
      })
      .sort((u, p) => u.key - p.key);
    for (let { t: u } of sorted) {
      if (i.size >= Dt) break;
      i.add(u);
    }
    return e.filter((u) => i.has(u));
  },
  Xn = (e, t, n) => {
    if (
      e.terms.length <= Dt &&
      e.boostPhrases.every((boostPhrase) => boostPhrase.length <= 16) &&
      e.boostPhrases.length <= 8
    )
      return e;
    let o = $n(e.boostPhrases);
    return {
      terms: Yn(
        e.terms,
        (s) => Je(t, s),
        (s) => Ze(t, s),
        n(),
        new Set(o.flat()),
      ),
      phrases: e.phrases,
      boostPhrases: o,
    };
  },
  Jn = (e, t, n) => ({
    ...(e === null
      ? C
      : {
          ...C,
          excludePaths: new Set([...e.excluded].map((o) => o.split(sep).join("/"))),
          excludePrefixes: e.excludedPrefixes.map((excludedPrefixe) => excludedPrefixe.split(sep).join("/")),
        }),
    excludeLog: t,
    isRecallVisible: n,
  }),
  Ce = (e, t) => `${t ? "persist" : "no-persist"}:${e}`;
/**
 * 记忆索引的打开缓存：按目录与存储空间缓存打开的索引（带 TTL），扫描完成后持久化，并支持释放当前缓存项。
 */
//@ chunk-vp5gef34.js:29264-29751 placement
class MemoryIndexCache {
  open = memoizeWithTTLAsync(
    async (e, t, n, o, s) => {
      let startTime = performance.now(),
        i = await Et(e, Jn(t, n, o), void 0, s);
      if (s && i.lastSync.scanCompleted && (!i.loadedFromDisk ? i.index.docs.size > 0 : Bn(i.lastSync)))
        if (i.persistable)
          await Pt(i).catch(() => {
            logRecallIndexSad("index_persist_failed");
          });
        else logRecallIndexSad("index_path_foreign");
      return { store: i, openMs: performance.now() - startTime };
    },
    (e, t, n, o, s) => Ce(e, s),
  );
  isHeld(e, t) {
    return this.open.cache.has(Ce(e, t));
  }
  releaseIfCurrent(e, t, n) {
    let o = Ce(e, t);
    if (this.open.cache.get(o) === n) this.open.cache.delete(o);
  }
}
//@ chunk-vp5gef34.js:29751-32197 placement
var searchMemoryIndex = new SessionRootSlot(() => new MemoryIndexCache()),
  Ot = async (e, t, n, o, s, r) => {
    let open = e.open(t, n, o, s, r),
      a = await open;
    if (
      !a.store.lastSync.scanCompleted ||
      a.store.lastSync.transientSkips > 0 ||
      a.store.index.docs.size === 0
    )
      e.releaseIfCurrent(t, r, open);
    return a;
  },
  Xo = (e, t, n, o) => {
    Ot(searchMemoryIndex.of(e), t, null, n, o, !0)
      .then(({ store: store }) => {
        if (!store.lastSync.scanCompleted)
          logRecallIndexSad("index_prewarm_failed", { prewarm: !0, sweep_incomplete: !0 });
        else if (store.lastSync.transientSkips > 0)
          logRecallIndexSad("index_prewarm_failed", { prewarm: !0, transient_skips: !0 });
      })
      .catch(() => {
        logRecallIndexSad("index_prewarm_failed", { prewarm: !0 });
      });
  },
  Jo = async (e, t, n, o, s = 5, r = null, i, a = !1, c) => {
    let startTime = performance.now(),
      of = searchMemoryIndex.of(e),
      isHeld = of.isHeld(n, a),
      { store: store, openMs: openMs } = await Ot(of, n, r, i, c, a),
      f = performance.now() - startTime,
      m = () => at(store.index.docs.size),
      g = (w, M = [], O = 0) => {
        let B = M[0]?.score ?? 0,
          U = m(),
          ge = count(M, (J) => J.score < U);
        return {
          docCount: store.index.docs.size,
          termCount: store.index.terms.size,
          loadedFromDisk: store.loadedFromDisk,
          sync: w,
          tookMs: performance.now() - startTime,
          storeWasHeld: isHeld,
          openWaitMs: f,
          storeOpenMs: openMs,
          topScore: B,
          relevanceFloor: U,
          hitCount: M.length,
          belowFloorCount: ge,
          suppressedByFloor: M.length > 0 && ge === M.length,
          queryTermCount: O,
        };
      };
    if (o.aborted) return { ranked: [], stats: g(store.lastSync) };
    if (store.loadedFromDisk && !store.lastSync.scanCompleted)
      return { ranked: [], stats: g(store.lastSync) };
    let S = typeof t === "string" ? Qn(t) : "",
      I =
        typeof t === "string"
          ? Xn(Wn(Ae(S)), store.index, () => Q(S))
          : lt(t.exact_terms, t.conceptual_keywords),
      T = await vt(store, I, s + 5),
      y =
        c === void 0
          ? i === void 0
            ? T
            : T.filter((w) => !i(w.path))
          : T.filter((w) => (i === void 0 || !i(w.path)) && c(w.path)),
      P = await realpath(n).catch(() => {
        return;
      }),
      v = resolve(n),
      R = [],
      E = [],
      results = await Promise.all(
        y.map(async (w) => {
          let M = store.index.pathToId.get(w.path),
            O = M === void 0 ? void 0 : store.index.docs.get(M),
            B = resolve(n, w.path),
            U = await realpath(B).catch((ye) => (A(ye) === "structural" ? void 0 : syncMemoryIndex_2));
          if (U === void 0) {
            if (P !== void 0) R.push(w.path);
            return [];
          }
          if (U === syncMemoryIndex_2) return [];
          if (!U.startsWith((P ?? v) + sep)) {
            if (P !== void 0) E.push(w.path);
            return [];
          }
          let J = await lstat(B).catch((ye) => (A(ye) === "structural" ? void 0 : syncMemoryIndex_2));
          if (J === syncMemoryIndex_2) return [];
          if (J === void 0) {
            if (P !== void 0) R.push(w.path);
            return [];
          }
          if (!J.isFile()) {
            if (P !== void 0) E.push(w.path);
            return [];
          }
          return [{ path: B, mtimeMs: O?.mtimeMs ?? 0, score: w.score }];
        }),
      );
    if (R.length > 0 || E.length > 0) {
      let results = await Promise.all(
          R.map(async (O) =>
            (await realpath(resolve(n, O)).then(
              () => !1,
              (B) => A(B) === "structural",
            ))
              ? O
              : void 0,
          ),
        ),
        M = await realpath(n).catch(() => {
          return;
        });
      if (M !== void 0 && M === P) {
        for (let O of E) N(store.index, O);
        for (let O of results) if (O !== void 0) N(store.index, O);
      }
    }
    let flat = results.flat(),
      kt = m();
    return {
      ranked: flat.filter((w) => w.score >= kt).slice(0, s),
      stats: g(store.lastSync, flat, I.terms.length),
    };
  };
//@ chunk-e6aww6q8.js:1311938-1312110 placement
function pickMemorySizeBasis({
  rawSizeBytes: rawSizeBytes,
  surfaceCap: surfaceCap,
  splicedSizeBytes: splicedSizeBytes,
  spliceCap: spliceCap,
  spliceActive: spliceActive,
}) {
  return surfaceCap !== void 0 && (!spliceActive || rawSizeBytes / surfaceCap >= splicedSizeBytes / spliceCap)
    ? { sizeBytes: rawSizeBytes, byteCap: surfaceCap }
    : { sizeBytes: splicedSizeBytes, byteCap: spliceCap };
}
/**
 * 计算记忆文件（字节、行数）中离上限最近的维度，占比低于阈值返回 null，否则给出超限与否及大小/上限/目标的可读描述。
 */
//@ chunk-e6aww6q8.js:1312110-1312600 placement
function memoryLimitPressure(e) {
  let n = [
    {
      frac: e.sizeBytes / e.byteCap,
      dimension: "bytes",
      over: e.sizeBytes > e.byteCap,
      sizeDesc: formatFileSize(e.sizeBytes),
      capDesc: formatFileSize(e.byteCap),
      targetDesc: formatFileSize(Math.floor(e.byteCap * HQ)),
    },
  ];
  if (e.lineCap !== void 0 && e.lineCount !== void 0)
    n.push({
      frac: e.lineCount / e.lineCap,
      dimension: "lines",
      over: e.lineCount > e.lineCap,
      sizeDesc: `${e.lineCount} lines`,
      capDesc: `${e.lineCap}-line`,
      targetDesc: `${Math.floor(e.lineCap * HQ)} lines`,
    });
  let { frac: frac, ...s } = n.reduce((h, y) => (y.frac > h.frac ? y : h));
  return frac < x0o ? null : s;
}
/**
 * 记忆索引超过读取上限时的提示：超出部分每次加载都会被丢弃。
 */
//@ chunk-e6aww6q8.js:1312600-1313208 placement
function checkMemoryIndexReadLimit(e) {
  let n = memoryLimitPressure(e);
  if (n === null) return null;
  return {
    text: `${n.over ? `Error: this write left the ${e.label} at ${e.displayPath} at ${n.sizeDesc}, over its ${n.capDesc} read limit. The write succeeded, but everything past the limit ` + "is silently dropped each time the index is loaded \u2014 entries at the end are already invisible " + "to readers. Rewrite it" : `The ${e.label} at ${e.displayPath} is ${n.sizeDesc}, approaching the ${n.capDesc} read limit. Compact it`} to under ${n.targetDesc} now: keep one line per entry, move detail into topic files, and merge or drop stale entries.`,
    overCap: n.over,
  };
}
//@ chunk-e6aww6q8.js:1313208-1313357 placement
var MAX_INDEX_LINE_CHARS = 150,
  BACKFILL_MAX_LINES = Math.floor(MAX_ENTRYPOINT_LINES * HQ),
  BACKFILL_MAX_BYTES = Math.floor(MAX_ENTRYPOINT_BYTES * HQ),
  UNSAFE_INDEX_NAME_REGEX = /[[\]()\n\r\u2028\u2029]/,
  UNWRITABLE_ERRNOS = new Set(["EROFS", "EACCES", "EPERM"]),
  backfillState = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:1313357-1313614 placement
function memoryIndexLine(e) {
  let joined = e.filename.split(sep_31).join("/");
  if (UNSAFE_INDEX_NAME_REGEX.test(joined) || pCn(joined) !== joined) return null;
  let r = `- [${basename_24(joined, ".md")}](${joined})`,
    trimmed = Fae(e.description ?? "")
      .replace(/\s+/g, " ")
      .trim(),
    h = MAX_INDEX_LINE_CHARS - r.length - 3;
  if (trimmed === "" || h <= 1) return r;
  return `${r} \u2014 ${Fae(truncateAtWord(trimmed, h))}`;
}
//@ chunk-e6aww6q8.js:1313614-1313798 placement
function buildMemoryIndexContent(e) {
  let n = "",
    r = 0,
    s = !1,
    h = 0;
  for (let y of e) {
    let S = memoryIndexLine(y);
    if (S === null) {
      h++;
      continue;
    }
    if (((s ||= r + 1 > BACKFILL_MAX_LINES || n.length + S.length + 1 > BACKFILL_MAX_BYTES), !s))
      ((n += `${S}
`),
        r++);
  }
  return { content: n, skippedCount: h };
}
/**
 * 判断记忆目录是否需要补建索引：已有索引、有候选 .md 文件或子目录，或没有可索引内容。
 */
//@ chunk-e6aww6q8.js:1313798-1314118 placement
async function memoryIndexBackfillState(e) {
  let n = await readdir_19(e, { withFileTypes: !0 });
  if (n.some((s) => s.name === MEMORY_INDEX_FILENAME)) return "exists";
  return n.some((s) => {
    if (isExcludedMemoryKey(s.name)) return !1;
    if (s.isFile()) return s.name.endsWith(".md");
    if (s.isSymbolicLink() || s.isFIFO() || s.isSocket() || s.isBlockDevice() || s.isCharacterDevice())
      return !1;
    return !0;
  })
    ? "candidates"
    : "none";
}
/**
 * 写入记忆索引补建结果：先写临时文件再改名，不可写时就地写。
 */
//@ chunk-e6aww6q8.js:1314118-1315117 placement
async function writeMemoryIndexBackfill(e, n) {
  let r = join_53(
      e,
      `.${MEMORY_INDEX_FILENAME}.backfill-${process.pid}-${randomBytes_6(4).toString("hex")}.tmp`,
    ),
    s = join_53(e, MEMORY_INDEX_FILENAME),
    h;
  try {
    h = await open_12(r, "wx");
  } catch (error) {
    let S = getErrnoCode(error);
    if (S !== void 0 && UNWRITABLE_ERRNOS.has(S)) return "unwritable";
    return (
      logForDebugging(`memory index backfill: temp create failed, creating in place: ${errorMessage(error)}`),
      writeMemoryIndexExclusive(e, n)
    );
  }
  try {
    let y;
    try {
      (await h.writeFile(n, "utf8"), (y = await h.stat({ bigint: !0 }).catch(() => null)));
    } catch (error) {
      let L = getErrnoCode(error);
      if (L !== void 0 && UNWRITABLE_ERRNOS.has(L)) return "unwritable";
      return (
        await h.close().catch(() => {}),
        await unlink_7(r).catch(() => {}),
        logForDebugging(
          `memory index backfill: temp write failed, creating in place: ${errorMessage(error)}`,
        ),
        await writeMemoryIndexExclusive(e, n)
      );
    } finally {
      await h.close().catch(() => {});
    }
    if (y === null) return await writeMemoryIndexExclusive(e, n);
    let S = await verifyLinkTarget(r, { device: y.dev, inode: y.ino }, s);
    if (S.ok) return "written";
    if (S.error.kind === "fs" && AMt(S.error.error, "EEXIST")) return "exists";
    return (
      logForDebugging(
        `memory index backfill: link did not publish (${S.error.kind === "classified" ? formatStorageError(S.error.error) : VIi(S.error)}), creating in place`,
      ),
      await writeMemoryIndexExclusive(e, n)
    );
  } finally {
    await unlink_7(r).catch(() => {});
  }
}
/**
 * 用 wx 独占方式创建记忆索引文件并写入；已存在返回 exists，只读/权限错误返回 unwritable；写入失败时删掉自己刚创建的文件。
 */
//@ chunk-e6aww6q8.js:1315117-1315563 placement
async function writeMemoryIndexExclusive(e, n) {
  let r = join_53(e, MEMORY_INDEX_FILENAME),
    s;
  try {
    (await assertPathSafeAsync(r), (s = await open_12(r, "wx")));
  } catch (error) {
    let S = getErrnoCode(error);
    if (S === "EEXIST") return "exists";
    if (S !== void 0 && UNWRITABLE_ERRNOS.has(S)) return "unwritable";
    throw error;
  }
  let h = await s.stat().catch(() => null);
  try {
    return (await s.writeFile(n, "utf8"), await s.close(), "written");
  } catch (error) {
    await s.close().catch(() => {});
    let S = await lstat_23(r).catch(() => null);
    if (h !== null && S !== null && h.ino === S.ino && h.dev === S.dev) await unlink_7(r).catch(() => {});
    throw error;
  }
}
/**
 * 补建记忆索引：扫描记忆目录中索引缺少的条目并写回，记录遥测。
 */
//@ chunk-e6aww6q8.js:1315563-1316725 placement
async function backfillMemoryIndex(e, n, r) {
  try {
    let s;
    try {
      s = await memoryIndexBackfillState(e);
    } catch (error) {
      return (n(), logForDebugging(`memory index backfill: ${errorMessage(error)}`), !1);
    }
    switch (s) {
      case "exists":
        return (r(), !0);
      case "none":
        return (n(), !1);
      case "candidates":
        break;
    }
    let h;
    try {
      h = await scanMemoryHeaders(e, createAbortController().signal, { regularFilesOnly: !0 });
    } catch (error) {
      return (
        logForDebugging(`memory index backfill: ${errorMessage(error)}`, { level: "warn" }),
        logFeatureSad("memory_index_backfill", "scan_failed"),
        !1
      );
    }
    h = h.filter(
      (L) => !L.filename.split(sep_31).some((G) => G.startsWith(".") || Thn.includes(normalizeKeySegment(G))),
    );
    let { content: content, skippedCount: skippedCount } = buildMemoryIndexContent(h);
    if (content === "") {
      if (h.length > 0)
        (logForDebugging(
          `memory index backfill: nothing linkable among ${h.length} topic files (${skippedCount} skipped)`,
        ),
          logFeatureSad("memory_index_backfill", "nothing_linkable"));
      return !1;
    }
    let w;
    try {
      w = await writeMemoryIndexBackfill(e, content);
    } catch (error) {
      return (
        logForDebugging(`memory index backfill: ${errorMessage(error)}`, { level: "warn" }),
        logFeatureSad("memory_index_backfill", "write_failed"),
        !1
      );
    }
    switch (w) {
      case "written":
        return (
          logEvent("tengu_memdir_index_backfilled", { file_count: h.length, skipped_count: skippedCount }),
          logFeatureOk("memory_index_backfill"),
          !0
        );
      case "exists":
        return !0;
      case "unwritable":
        return (logForDebugging("memory index backfill: memory directory is not writable"), !1);
    }
  } catch (error) {
    return (
      logForDebugging(`memory index backfill: ${errorMessage(error)}`, { level: "warn" }),
      logFeatureSad("memory_index_backfill", "unexpected"),
      !1
    );
  }
}

export {
  backfillState,
  backfillMemoryIndex,
  checkMemoryIndexReadLimit,
  pickMemorySizeBasis,
  memoryLimitPressure,
  N,
  Pe,
  we,
};
