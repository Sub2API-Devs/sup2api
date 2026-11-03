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
import { realpath, lstat, unlink, open, readdir } from "fs/promises";
import { join, sep, resolve, basename } from "path";
import { randomBytes } from "crypto";
import { memoizeWithLRU, retainCacheKey, memoizeWithTTLAsync } from "../utils/memoize.js";
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
  fe,
  mt,
  gt,
  ht,
} from "../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { writeFileAtomic, assertPathSafeAsync } from "../utils/atomicPublishWrite.js";
import { readOnlyNoFollowFlags } from "../utils/platformTargets.js";
import { isENOENT, getErrnoCode, errorMessage } from "../utils/errors.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { formatFileSize } from "../utils/format.js";
import { MEMORY_SIZE_SOFT_RATIO, MEMORY_SIZE_WARN_RATIO } from "../utils/claudemd.js";
import {
  MAX_ENTRYPOINT_LINES,
  MAX_ENTRYPOINT_BYTES,
  singleLineMemoryText,
  sanitizeMemoryText,
  MEMORY_INDEX_FILENAME,
} from "./memdir.js";
import { HostScoped } from "../utils/hostScoped.js";
import { truncateAtWord } from "../utils/stringUtils.js";
import {
  isExcludedMemoryKey,
  EXCLUDED_TOP_LEVEL_DIRS,
  normalizeKeySegment,
} from "../services/memoryStore/memoryKeys.js";
import { logForDebugging } from "../utils/debug.js";
import {
  verifyLinkTarget,
  isErrnoCode as isErrnoCode_2,
  errorKindLabel,
} from "../utils/fsSafety/hardenedRead.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { scanMemoryHeaders } from "./memoryScan.js";
import { createAbortController } from "../utils/abortController.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-vp5gef34.js:1162-3668 placement
/**
 * Porter 词干化算法：判断辅音/元音序列、CVC 结尾、双辅音，按 1a–5 各步替换后缀，最终给出词干（记忆索引分词用）。
 */
var porterStemmer = (e) => e === "a" || e === "e" || e === "i" || e === "o" || e === "u";
var isConsonantAt = (e, t) => {
  let n = e[t];
  if (porterStemmer(n)) return true;
  if (n !== "y") return false;
  let o = t;
  while (o > 0 && e[o - 1] === "y") o--;
  let s = o === 0 ? true : porterStemmer(e[o - 1]);
  return (t - o) % 2 === 0 ? !s : s;
};
var countConsonantSequences = (e) => {
  let t = 0;
  let n = false;
  for (let i = 0; i < e.length; i++) {
    let s = e[i];
    let r = porterStemmer(s) || (s === "y" && i > 0 && !n);
    if (!r && n) t++;
    n = r;
  }
  return t;
};
var hasVowel = (e) => {
  let t = false;
  for (let i = 0; i < e.length; i++) {
    let o = e[i];
    t = porterStemmer(o) || (o === "y" && i > 0 && !t);
    if (t) return true;
  }
  return false;
};
var endsWithDoubleConsonant = (e) =>
  e.length >= 2 && e.at(-1) === e.at(-2) && !isConsonantAt(e, e.length - 1);
var endsWithCVC = (e) => {
  if (e.length < 3) return false;
  let last = e.at(-1);
  return (
    !isConsonantAt(e, e.length - 3) &&
    isConsonantAt(e, e.length - 2) &&
    !isConsonantAt(e, e.length - 1) &&
    last !== "w" &&
    last !== "x" &&
    last !== "y"
  );
};
var replaceSuffixList = (e, t) => {
  for (let [n, o, s] of t) {
    if (!e.endsWith(n)) continue;
    let sliced = e.slice(0, e.length - n.length);
    return countConsonantSequences(sliced) > s ? sliced + o : e;
  }
  return e;
};
var porterStep1a = (e) => {
  if (e.endsWith("sses")) return e.slice(0, -2);
  if (e.endsWith("ies")) return e.slice(0, -2);
  if (e.endsWith("ss")) return e;
  if (e.endsWith("s")) return e.slice(0, -1);
  return e;
};
var porterStep1b = (e) => {
  if (e.endsWith("eed")) {
    let sliced = e.slice(0, -3);
    return countConsonantSequences(sliced) > 0 ? e.slice(0, -1) : e;
  }
  let t = e.endsWith("ed") ? e.slice(0, -2) : e.endsWith("ing") ? e.slice(0, -3) : undefined;
  if (t === undefined || !hasVowel(t)) return e;
  if (t.endsWith("at") || t.endsWith("bl") || t.endsWith("iz")) return t + "e";
  let last = t.at(-1);
  if (endsWithDoubleConsonant(t) && last !== "l" && last !== "s" && last !== "z") return t.slice(0, -1);
  if (countConsonantSequences(t) === 1 && endsWithCVC(t)) return t + "e";
  return t;
};
var porterStep1c = (e) => (e.endsWith("y") && hasVowel(e.slice(0, -1)) ? e.slice(0, -1) + "i" : e);
var porterStep2 = [
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
];
var porterStep3 = [
  ["icate", "ic", 0],
  ["ative", "", 0],
  ["alize", "al", 0],
  ["iciti", "ic", 0],
  ["ical", "ic", 0],
  ["ful", "", 0],
  ["ness", "", 0],
];
var porterStep4 = [
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
];
var porterStep5 = (e) => {
  for (let t of porterStep4) {
    if (!e.endsWith(t)) continue;
    let sliced = e.slice(0, e.length - t.length);
    let o = t !== "ion" || sliced.endsWith("s") || sliced.endsWith("t");
    return countConsonantSequences(sliced) > 1 && o ? sliced : e;
  }
  return e;
};
var porterStem = (e) => {
  if (!e.endsWith("e")) return e;
  let sliced = e.slice(0, -1);
  let n = countConsonantSequences(sliced);
  if (n > 1) return sliced;
  if (n === 1 && !endsWithCVC(sliced)) return sliced;
  return e;
};
var stemWord = (e) =>
  countConsonantSequences(e) > 1 && endsWithDoubleConsonant(e) && e.endsWith("l") ? e.slice(0, -1) : e;
var measureWord = (e) => {
  if (e.length <= 2) return e;
  let t = porterStep1a(e);
  t = porterStep1b(t);
  t = porterStep1c(t);
  t = replaceSuffixList(t, porterStep2);
  t = replaceSuffixList(t, porterStep3);
  t = porterStep5(t);
  t = porterStem(t);
  t = stemWord(t);
  return t;
};
var isConsonantRun = memoizeWithLRU(measureWord, (e) => e, 50000);
var stemAlias = retainCacheKey(isConsonantRun.cache);
var stemWithOptions = (text) => (text.length <= 2 ? text : isConsonantRun(text));
//@ chunk-vp5gef34.js:3668-7390 placement
/**
 * 记忆索引的分词流程：按 Unicode 字母/数字切分、拆驼峰与数字、技术词改写（c++→cpp 等）、CJK 边界、去所有格与停用词，再按选项做词干化与复合词拆分。
 */
var tokenizeForIndex = /[\p{L}\p{M}\p{N}]+/gu;
var isUpperAscii = (e) => e >= "A" && e <= "Z";
var isLowerAscii = (e) => e >= "a" && e <= "z";
var isDigitAscii = (e) => e >= "0" && e <= "9";
var isAlnumAscii = (e) => isUpperAscii(e) || isLowerAscii(e);
var splitCamelAndDigits = (e) => {
  let t = [];
  let n = 0;
  for (let idx = 1; idx < e.length; idx++) {
    let s = e[idx - 1] ?? "";
    let r = e[idx] ?? "";
    let i = e[idx + 1] ?? "";
    let a = i === "s" && idx + 2 === e.length;
    if (
      ((isLowerAscii(s) || isDigitAscii(s)) && isUpperAscii(r)) ||
      (isUpperAscii(s) && isUpperAscii(r) && isLowerAscii(i) && !a) ||
      (isAlnumAscii(s) && isDigitAscii(r)) ||
      (isDigitAscii(s) && isAlnumAscii(r))
    ) {
      t.push(e.slice(n, idx));
      n = idx;
    }
  }
  t.push(e.slice(n));
  return t;
};
var normalizeForIndex = (e) =>
  e
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
var isLowerWord = (text) => /^[a-z]+$/.test(text);
var tokenizeWithCompounds = (e) => {
  let t = splitCamelAndDigits(e);
  return t.length > 1
    ? [
        {
          text: e,
          compound: true,
        },
        ...t.map((text) => ({
          text,
          compound: false,
        })),
      ]
    : [
        {
          text: e,
          compound: false,
        },
      ];
};
var CJK_BOUNDARY_LEFT = String.raw`(^|[^\p{L}\p{N}]|[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])`;
var CJK_BOUNDARY_RIGHT = String.raw`(?!(?![\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])[\p{L}\p{N}])`;
var TECH_TERM_REWRITES = [
  [new RegExp(CJK_BOUNDARY_LEFT + String.raw`[cC]\+\+` + CJK_BOUNDARY_RIGHT, "gu"), " cpp "],
  [new RegExp(CJK_BOUNDARY_LEFT + String.raw`[cC]#` + CJK_BOUNDARY_RIGHT, "gu"), " csharp "],
  [new RegExp(CJK_BOUNDARY_LEFT + String.raw`[fF]#` + CJK_BOUNDARY_RIGHT, "gu"), " fsharp "],
  [new RegExp(CJK_BOUNDARY_LEFT + String.raw`\.[nN][eE][tT]` + CJK_BOUNDARY_RIGHT, "gu"), " dotnet "],
];
var regExp = new RegExp(CJK_BOUNDARY_LEFT + String.raw`([vV]?\d+(?:\.\d+)+)`, "gu");
var CJK_CHAR_CLASS = /^(?![\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])[\p{L}\p{N}]/u;
var CJK_CHAR_TEST = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;
var trimCjkEdges =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+|[^\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+/gu;
var replaceTechTerms = (e) => {
  let t = [...e];
  if (t.length <= 2) return [e];
  let n = [e];
  for (let i = 0; i < t.length - 1; i++) n.push(t[i] + t[i + 1]);
  return n;
};
var HALFWIDTH_KATAKANA_RE = /[\uFF66-\uFF9F]/;
var DIGITS_ONLY_RE = /^\p{N}+$/u;
var stripPossessive = (e) => {
  let t = [];
  let n = false;
  let o = false;
  for (let s of e) {
    let last = t.at(-1);
    if (last !== undefined && DIGITS_ONLY_RE.test(s) && o) {
      last.push(s);
      n = true;
      continue;
    }
    if (last !== undefined && n && CJK_CHAR_TEST.test(s)) {
      last.push(s);
      n = false;
      o = true;
      continue;
    }
    t.push([s]);
    n = DIGITS_ONLY_RE.test(s);
    o = CJK_CHAR_TEST.test(s);
  }
  return t.map((s) => (s.length === 1 ? s[0] : s.join("")));
};
var SINGLE_LETTER_RE = /^\p{L}$/u;
var dropStopword = (e) => {
  let t = [];
  for (let n of e) {
    let last = t.at(-1);
    let s = SINGLE_LETTER_RE.test(n) && !CJK_CHAR_TEST.test(n);
    if (last !== undefined) {
      let last_2 = last.at(-1);
      if (s && CJK_CHAR_TEST.test(last_2)) {
        last.push(n);
        continue;
      }
      if (CJK_CHAR_TEST.test(n) && SINGLE_LETTER_RE.test(last_2) && !CJK_CHAR_TEST.test(last_2)) {
        last.push(n);
        continue;
      }
    }
    t.push([n]);
  }
  return t.map((n) => (n.length === 1 ? n[0] : n.join("")));
};
var tokenizeWord = (e) => {
  let t = [];
  for (let idx = 0; idx < e.length; idx++) {
    let o = e[idx];
    if (!CJK_CHAR_TEST.test(o) || [...o].length !== 1) continue;
    let s = idx > 0 ? e[idx - 1] : undefined;
    let r = idx + 1 < e.length ? e[idx + 1] : undefined;
    let i =
      s !== undefined && !CJK_CHAR_TEST.test(s) && [...normalizeForIndex(s)].length > 1
        ? s + o
        : r !== undefined && !CJK_CHAR_TEST.test(r) && [...normalizeForIndex(r)].length > 1
          ? o + r
          : undefined;
    if (i !== undefined)
      t.push({
        text: i,
        compound: true,
      });
  }
  return t;
};
var stemTokens = (e, t) => {
  let replaced = e.replace(/\[\[([^[\]]*)\]\]/g, " $1 ");
  for (let [r, i] of TECH_TERM_REWRITES) replaced = replaced.replace(r, (a, c) => c + i);
  replaced = replaced.replace(regExp, (r, i, a, c, l) => {
    let codePoint = l.codePointAt(c + r.length);
    if (codePoint !== undefined && CJK_CHAR_CLASS.test(String.fromCodePoint(codePoint))) return r;
    return `${i}${a} ${a.replaceAll(".", "")}`;
  });
  let o = replaced.match(tokenizeForIndex) ?? [];
  let flattened = o
    .flatMap((r) => {
      let i = HALFWIDTH_KATAKANA_RE.test(r) ? r.normalize("NFKC") : r;
      if (CJK_CHAR_TEST.test(i)) {
        let c = dropStopword(stripPossessive(i.match(trimCjkEdges) ?? []));
        let l = t.compounds ? tokenizeWord(c) : [];
        let flattened = c.flatMap((h) => {
          if (!CJK_CHAR_TEST.test(h)) {
            let m = tokenizeWithCompounds(h);
            return t.compounds ? m : m.filter((g) => !g.compound);
          }
          let u = replaceTechTerms(h);
          let p = u.length > 1;
          let mapped = (h.match(/\p{N}{3,}/gu) ?? []).map((text) => ({
            text,
            compound: true,
          }));
          return [
            ...u.map((text, g) => ({
              text,
              compound: p && g === 0,
            })),
            ...mapped,
          ].filter((m) => !m.compound || t.compounds);
        });
        flattened.push(...l);
        return [...flattened.filter((h) => h.compound), ...flattened.filter((h) => !h.compound)];
      }
      let a = tokenizeWithCompounds(i);
      return t.compounds ? a : a.filter((c) => !c.compound);
    })
    .map(({ text, compound }) => ({
      text: normalizeForIndex(text),
      compound,
    }))
    .filter(({ text }) => text.length > 1)
    .flatMap(({ text, compound }) => {
      if (compound) {
        let c = t.dualStem && isLowerWord(text) ? stemWithOptions(text) : text;
        return c !== text ? [text, c] : [text];
      }
      if (!isLowerWord(text)) return [text];
      let a = stemWithOptions(text);
      return t.dualStem && a !== text ? [a, text] : [a];
    });
  if (flattened.length > 0 || o.length === 0 || t.singleCharFallback === false) return flattened;
  return o.map(normalizeForIndex);
};
var tokenizeForSearch = (e) =>
  stemTokens(e, {
    dualStem: false,
    compounds: true,
  });
var tokenizeStrict = (e) =>
  stemTokens(e, {
    dualStem: false,
    compounds: true,
    singleCharFallback: false,
  });
var tokenizeDualStem = (e) =>
  stemTokens(e, {
    dualStem: true,
    compounds: true,
  });
var tokenizeNoCompounds = (e) =>
  stemTokens(e, {
    dualStem: false,
    compounds: false,
  });
//@ chunk-vp5gef34.js:7390-8573 placement
/**
 * 把记忆文件拆成索引字段：文件名、frontmatter、各级标题、正文（含代码块跳过），并给出各字段文本。
 */
var extractMemoryFields = ["filename", "frontmatter", "headings", "body"];
var FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
var YAML_KEY_LINE_RE = /^[\w-]+:/m;
var MARKDOWN_HEADING_RE = /^#{1,6}\s+(.*)$/;
var FENCE_OPEN_RE = /^(`{3,}|~{3,})(.*)$/;
var basenameWithoutExt = (e) => {
  let sliced = e.slice(e.lastIndexOf("/") + 1);
  let index = sliced.lastIndexOf(".");
  return index > 0 ? sliced.slice(0, index) : sliced;
};
var parseMemoryDocument = (e) => {
  let t = {
    headings: [],
    body: [[]],
  };
  let n;
  for (let o of e) {
    let match = o.match(FENCE_OPEN_RE);
    if (match !== null) {
      let a = match[1];
      if (n === undefined) {
        n = a;
        t.body.at(-1).push(o);
        continue;
      }
      if (a[0] === n[0] && a.length >= n.length && match[2].trim() === "") {
        n = undefined;
        t.body.at(-1).push(o);
        continue;
      }
    }
    let i = n !== undefined ? undefined : o.match(MARKDOWN_HEADING_RE)?.[1];
    if (i === undefined) t.body.at(-1).push(o);
    else {
      t.headings.push(i);
      t.body.push([]);
    }
  }
  return t;
};
var stripFrontmatter = (headings) => {
  let filtered = headings.map((n) => tokenizeStrict(n)).filter((n) => n.length > 0);
  if (filtered.length > 0) return filtered.flatMap((n) => [...n, ""]);
  return tokenizeForSearch(
    headings.join(`
`),
  );
};
var splitHeadingSections = (body) => {
  let filtered = body
    .map((n) =>
      tokenizeStrict(
        n.join(`
`),
      ),
    )
    .filter((n) => n.length > 0);
  if (filtered.length > 0) return filtered.flatMap((n, o) => (o === 0 ? n : ["", ...n]));
  return tokenizeForSearch(
    body.map((n) =>
      n.join(`
`),
    ).join(`
`),
  );
};
var extractMemoryFieldsFromFile = (e, t) => {
  let replaced = t.replace(/^\uFEFF/, "");
  let match = replaced.match(FRONTMATTER_RE);
  let s = match !== null && YAML_KEY_LINE_RE.test(match[1] ?? "");
  let r = s ? (match[1] ?? "") : "";
  let i = s ? replaced.slice(match[0].length) : replaced;
  let { headings, body } = parseMemoryDocument(i.split(/\r?\n/));
  return {
    path: e,
    fields: {
      filename: tokenizeForSearch(basenameWithoutExt(e)),
      frontmatter: tokenizeForSearch(r),
      headings: stripFrontmatter(headings),
      body: splitHeadingSections(body),
    },
  };
};
//@ chunk-vp5gef34.js:8573-12080 placement
/**
 * 记忆 BM25 倒排索引的内存结构操作：术语 → 文档 id 与位置、按字段统计长度、增删改文档、未验证文档标记与按路径查文档。
 */
var buildInvertedIndex = extractMemoryFields.length;
var le = Object.fromEntries(extractMemoryFields.map((extractMemoryField, t) => [extractMemoryField, t]));
var MAX_DOC_ID = 4294967295;
var emptyFieldCounters = () =>
  Object.fromEntries(extractMemoryFields.map((extractMemoryField) => [extractMemoryField, 0]));
var createEmptyIndex = () => ({
  terms: new Map(),
  docs: new Map(),
  pathToId: new Map(),
  unverified: new Set(),
  fieldLengthTotals: emptyFieldCounters(),
  fieldDocCounts: emptyFieldCounters(),
  nextDocId: 0,
});
var growUint32Array = (e, t) => {
  if (e.length >= t) return e;
  let uint32Array = new Uint32Array(Math.max(t, e.length * 2));
  uint32Array.set(e);
  return uint32Array;
};
var indexDocumentFields = (e) => {
  let t = new Map();
  extractMemoryFields.forEach((extractMemoryField, o) => {
    e.fields[extractMemoryField].forEach((s, r) => {
      if (s === "") return;
      let i = t.get(s) ?? extractMemoryFields.map(() => []);
      i[o].push(r);
      t.set(s, i);
    });
  });
  return t;
};
var addDocumentToIndex = (e, t, n, o) => {
  let s = e.terms.get(t) ?? {
    docIds: new Uint32Array(2),
    offsets: new Uint32Array(2 * buildInvertedIndex + 1),
    positions: new Uint32Array(8),
    size: 0,
  };
  let size = s.size;
  let i = s.offsets[buildInvertedIndex * size];
  let reduced = o.reduce((acc, d) => acc + d.length, 0);
  if (i + reduced > MAX_DOC_ID) throw Error("position space exhausted");
  if (size > 0 && s.docIds[size - 1] >= n) throw Error("posting docId out of order");
  s.docIds = growUint32Array(s.docIds, size + 1);
  s.offsets = growUint32Array(s.offsets, buildInvertedIndex * (size + 1) + 1);
  s.positions = growUint32Array(s.positions, i + reduced);
  s.docIds[size] = n;
  let c = i;
  o.forEach((l, d) => {
    s.offsets[buildInvertedIndex * size + d] = c;
    s.positions.set(l, c);
    c += l.length;
  });
  s.offsets[buildInvertedIndex * (size + 1)] = c;
  s.size = size + 1;
  if (size === 0) e.terms.set(t, s);
};
var removeDocumentFromIndex = (e, t) => {
  let n = e.offsets[buildInvertedIndex * t];
  let o = e.offsets[buildInvertedIndex * (t + 1)];
  let s = e.offsets[buildInvertedIndex * e.size];
  e.positions.copyWithin(n, o, s);
  e.docIds.copyWithin(t, t + 1, e.size);
  for (let i = buildInvertedIndex * (t + 1); i <= buildInvertedIndex * e.size; i++)
    e.offsets[i - buildInvertedIndex] = e.offsets[i] - (o - n);
  e.size--;
};
var rebuildFieldsForDoc = (e, t) => {
  let n = 0;
  let o = e.size - 1;
  while (n <= o) {
    let s = (n + o) >> 1;
    let r = e.docIds[s];
    if (r === t) return s;
    if (r < t) n = s + 1;
    else o = s - 1;
  }
  return -1;
};
var docIdsOfTerm = (e) => e.docIds.subarray(0, e.size);
var appendDocId = (e, t, extractMemoryField) =>
  e.offsets[buildInvertedIndex * t + le[extractMemoryField] + 1] -
  e.offsets[buildInvertedIndex * t + le[extractMemoryField]];
var removeDocIdFromTerm = (entry, slot, extractMemoryField) => {
  let o = entry.offsets[buildInvertedIndex * slot + le[extractMemoryField]];
  let s = entry.offsets[buildInvertedIndex * slot + le[extractMemoryField] + 1];
  return o === s ? undefined : entry.positions.subarray(o, s);
};
var termDocCount = (e, t) => e.terms.get(t)?.size ?? 0;
var addPostingPosition = (e, t) => {
  let n = e.terms.get(t);
  return n?.size === 1 ? n.docIds[0] : undefined;
};
var removePosting = (e) => {
  e.docIds = e.docIds.slice(0, e.size);
  e.offsets = e.offsets.slice(0, buildInvertedIndex * e.size + 1);
  e.positions = e.positions.slice(0, e.offsets[buildInvertedIndex * e.size]);
};
var upsertDocument = (e, memoryFieldsFromFile, n) => {
  if (e.nextDocId > MAX_DOC_ID) throw Error("docId space exhausted");
  if (e.pathToId.has(memoryFieldsFromFile.path)) hasDocumentPath(e, memoryFieldsFromFile.path);
  let o = e.nextDocId++;
  for (let [r, i] of indexDocumentFields(memoryFieldsFromFile)) addDocumentToIndex(e, r, o, i);
  let s = Object.fromEntries(
    extractMemoryFields.map((extractMemoryField) => [
      extractMemoryField,
      count(memoryFieldsFromFile.fields[extractMemoryField], (i) => i !== ""),
    ]),
  );
  for (let extractMemoryField of extractMemoryFields) {
    e.fieldLengthTotals[extractMemoryField] += s[extractMemoryField];
    if (s[extractMemoryField] > 0) e.fieldDocCounts[extractMemoryField]++;
  }
  e.docs.set(o, {
    path: memoryFieldsFromFile.path,
    hash: n.hash,
    size: n.size,
    mtimeMs: n.mtimeMs,
    fieldLengths: s,
  });
  e.pathToId.set(memoryFieldsFromFile.path, o);
  return o;
};
var markUnverified = (e, t, n) => {
  for (let extractMemoryField of extractMemoryFields) {
    e.fieldLengthTotals[extractMemoryField] -= n.fieldLengths[extractMemoryField];
    if (n.fieldLengths[extractMemoryField] > 0) e.fieldDocCounts[extractMemoryField]--;
  }
  e.docs.delete(t);
  e.pathToId.delete(n.path);
  e.unverified.delete(t);
};
var isUnverified = (e, t, n) => {
  for (let [o, s] of e.terms) {
    let r = rebuildFieldsForDoc(s, t);
    if (r < 0) continue;
    removeDocumentFromIndex(s, r);
    if (s.size === 0) e.terms.delete(o);
  }
  markUnverified(e, t, n);
};
var hasDocumentPath = (e, t) => {
  let n = e.pathToId.get(t);
  let o = n === undefined ? undefined : e.docs.get(n);
  if (n === undefined || o === undefined) return false;
  isUnverified(e, n, o);
  return true;
};
var documentIdForPath = (e, t) => {
  let n = 0;
  while (n < e.size && !t.has(e.docIds[n])) n++;
  if (n === e.size) return;
  let o = n;
  let s = e.offsets[buildInvertedIndex * n];
  for (; n < e.size; n++) {
    let r = e.docIds[n];
    let i = e.offsets[buildInvertedIndex * n];
    let a = e.offsets[buildInvertedIndex * (n + 1)];
    if (t.has(r)) continue;
    let c = i - s;
    e.positions.copyWithin(s, i, a);
    e.docIds[o] = r;
    for (let idx = 0; idx < buildInvertedIndex; idx++)
      e.offsets[buildInvertedIndex * o + idx] = e.offsets[buildInvertedIndex * n + idx] - c;
    s += a - i;
    o++;
  }
  e.offsets[buildInvertedIndex * o] = s;
  e.size = o;
};
var MAX_TERM_KEY_CHARS = 16;
var dropDocuments = (e, t) => {
  let n = new Map();
  for (let s of t) {
    let r = e.pathToId.get(s);
    let i = r === undefined ? undefined : e.docs.get(r);
    if (r !== undefined && i !== undefined) n.set(r, i);
  }
  if (n.size < MAX_TERM_KEY_CHARS) {
    for (let [s, r] of n) isUnverified(e, s, r);
    return n.size;
  }
  let o = new Set(n.keys());
  for (let [s, r] of e.terms) {
    documentIdForPath(r, o);
    if (r.size === 0) e.terms.delete(s);
  }
  for (let [s, r] of n) markUnverified(e, s, r);
  return n.size;
};
var emptyIndexSnapshot = (e) => ({
  docCount: e.docs.size,
  avgFieldLength: Object.fromEntries(
    extractMemoryFields.map((extractMemoryField) => [
      extractMemoryField,
      e.fieldDocCounts[extractMemoryField] === 0
        ? 0
        : e.fieldLengthTotals[extractMemoryField] / e.fieldDocCounts[extractMemoryField],
    ]),
  ),
});
//@ chunk-vp5gef34.js:12080-15423 placement
/**
 * BM25 打分：按字段权重（文件名/frontmatter 3、标题 2.5、正文 1）与文档长度归一化打分，叠加短语命中与邻近性加成，返回排序后的结果。
 */
var bm25Search = {
  k1: 1.2,
  fieldWeights: {
    filename: 3,
    frontmatter: 3,
    headings: 2.5,
    body: 1,
  },
  fieldB: {
    filename: 0.75,
    frontmatter: 0.75,
    headings: 0.75,
    body: 0.75,
  },
  proximityWeight: 0,
  phraseBoost: 0.5,
};
var parseQueryTerms = (e) => {
  let t = tokenizeNoCompounds(e);
  if (t.length === 0) return [];
  let n = tokenizeForSearch(e);
  let o = [];
  let s = [];
  let r = 0;
  for (let i of n) {
    if (r < t.length && i === t[r]) {
      s.push(i);
      r++;
      continue;
    }
    if (s.length > 0) {
      o.push(s);
      s = [];
    }
  }
  if (s.length > 0) o.push(s);
  for (; r < t.length; r++) o.push([t[r]]);
  return o;
};
var idfForTerm = (e) => {
  let phrases =
    ((e.match(/"/g) ?? []).length & 1) === 0
      ? [...e.matchAll(/"([^"]*)"/g)]
          .flatMap((o) => parseQueryTerms(o[1] ?? ""))
          .filter((o) => o.length > 1 && o.every((s) => s.length > 1))
      : [];
  return {
    terms: uniq(tokenizeDualStem(e)),
    phrases,
    boostPhrases: [],
  };
};
var fieldBoostFactor = (docCount, t) => {
  let n = Math.log((docCount - t + 0.5) / (t + 0.5));
  return n <= 0 ? 0.000001 : n;
};
var BM25_K1 = 0.7;
var MIN_FIELD_LENGTH_FOR_BOOST = 16;
var fieldLengthBoost = (e) => (e < MIN_FIELD_LENGTH_FOR_BOOST ? 0 : BM25_K1 * fieldBoostFactor(e, 1));
var scoreDocument = (e, t, fieldLengths, avgFieldLength, s) =>
  extractMemoryFields.reduce((acc, extractMemoryField) => {
    let a = appendDocId(e, t, extractMemoryField);
    if (a === 0 || avgFieldLength[extractMemoryField] === 0) return acc;
    let c = s.fieldB[extractMemoryField];
    let l = 1 - c + (c * fieldLengths[extractMemoryField]) / avgFieldLength[extractMemoryField];
    return acc + (s.fieldWeights[extractMemoryField] * a) / l;
  }, 0);
var phraseMatchBonus = (e, t, n) => {
  let mapped = n.map((s) => proximityBonus(e, s, t));
  if (mapped.some((s) => s === undefined)) return false;
  return extractMemoryFields.some((extractMemoryField) => {
    let r = [];
    for (let c of mapped) {
      let l = c === undefined ? undefined : removeDocIdFromTerm(c.entry, c.slot, extractMemoryField);
      if (l === undefined) return false;
      r.push(l);
    }
    let [i, ...a] = r;
    if (i === undefined) return false;
    return i.some((c) => a.every((l, d) => collectFieldScores(l, c + d + 1)));
  });
};
var proximityBonus = (e, t, n) => {
  let o = e.terms.get(t);
  let s = o === undefined ? -1 : rebuildFieldsForDoc(o, n);
  return o === undefined || s < 0
    ? undefined
    : {
        entry: o,
        slot: s,
      };
};
var collectFieldScores = (e, t) => {
  let n = 0;
  let o = e.length - 1;
  while (n <= o) {
    let s = (n + o) >> 1;
    let r = e[s];
    if (r === t) return true;
    if (r < t) n = s + 1;
    else o = s - 1;
  }
  return false;
};
var EMPTY_BEST_SPAN = {
  span: 1 / 0,
  termCount: 0,
};
var bestSpanForTerm = (e, t, n) => {
  let filtered = n
    .map((l) => {
      let d = proximityBonus(e, l, t);
      return d === undefined ? undefined : removeDocIdFromTerm(d.entry, d.slot, "body");
    })
    .filter((l) => l !== undefined);
  if (filtered.length < 2) return EMPTY_BEST_SPAN;
  let sorted = filtered
    .flatMap((l, termIdx) =>
      Array.from(l, (pos) => ({
        pos,
        termIdx,
      })),
    )
    .sort((l, d) => l.pos - d.pos);
  let r = new Map();
  let i = [];
  let a = 0;
  let c = 1 / 0;
  for (let l of sorted) {
    i.push(l);
    let d = r.get(l.termIdx) ?? 0;
    r.set(l.termIdx, d + 1);
    if (d === 0) a++;
    while (a === filtered.length) {
      let h = i.shift();
      if (h === undefined) break;
      c = Math.min(c, l.pos - h.pos + 1);
      let u = r.get(h.termIdx) ?? 0;
      r.set(h.termIdx, u - 1);
      if (u === 1) a--;
    }
  }
  return {
    span: c,
    termCount: filtered.length,
  };
};
var mergeSpans = (exactTerms, conceptualKeywords) => {
  let flattened = exactTerms.flatMap((a) => parseQueryTerms(a));
  let terms = uniq([
    ...exactTerms.flatMap((a) => tokenizeDualStem(a)),
    ...conceptualKeywords.flatMap((a) => tokenizeDualStem(a)),
  ]);
  let filtered = flattened.filter((a) => a.length > 1);
  let r = new Set();
  let boostPhrases = filtered.filter((a) => {
    let joined = a.join(" ");
    if (r.has(joined)) return false;
    r.add(joined);
    return true;
  });
  return {
    terms,
    phrases: [],
    boostPhrases,
  };
};
var searchIndex = (index, t, n, o = bm25Search) => {
  let { terms, phrases, boostPhrases } = typeof t === "string" ? idfForTerm(t) : t;
  let a = emptyIndexSnapshot(index);
  if (a.docCount === 0 || terms.length === 0) return [];
  let mapped = terms.map((term) => index.terms.get(term));
  let l = new Map(terms.map((term, f) => [term, fieldBoostFactor(a.docCount, mapped[f]?.size ?? 0)]));
  let d = new Map(
    boostPhrases
      .flat()
      .filter((p) => !l.has(p))
      .map((p) => [p, fieldBoostFactor(a.docCount, index.terms.get(p)?.size ?? 0)]),
  );
  let h = new Set(mapped.flatMap((p) => (p === undefined ? [] : [...docIdsOfTerm(p)])));
  for (let boostPhrase of boostPhrases) {
    let mapped = boostPhrase.map((I) => index.terms.get(I));
    if (mapped.some((I) => I === undefined)) continue;
    let [m, ...g] = mapped;
    let mapped_2 = g.map((I) => new Set(docIdsOfTerm(I)));
    for (let I of docIdsOfTerm(m)) if (mapped_2.every((T) => T.has(I))) h.add(I);
  }
  return [...h]
    .filter((p) => phrases.every((phrase) => phraseMatchBonus(index, p, phrase)))
    .map((p) => {
      let f = index.docs.get(p);
      let mapped_2 = mapped.map((v) => (v === undefined ? -1 : rebuildFieldsForDoc(v, p)));
      let filtered = terms.filter((term, R) => mapped_2[R] >= 0);
      let reduced = terms.reduce((acc, term, E) => {
        if (mapped_2[E] < 0) return acc;
        let D = scoreDocument(mapped[E], mapped_2[E], f.fieldLengths, a.avgFieldLength, o);
        return acc + l.get(term) * (D / (o.k1 + D));
      }, 0);
      let reduced_2 = boostPhrases.reduce(
        (acc, boostPhrase) =>
          phraseMatchBonus(index, p, boostPhrase)
            ? acc + o.phraseBoost * boostPhrase.reduce((acc, D) => acc + (l.get(D) ?? d.get(D) ?? 0), 0)
            : acc,
        0,
      );
      let { span, termCount } = o.proximityWeight > 0 ? bestSpanForTerm(index, p, filtered) : EMPTY_BEST_SPAN;
      let P = span === 1 / 0 ? 0 : (o.proximityWeight * reduced) / Math.max(1, 1 + span - termCount);
      return {
        path: f.path,
        score: reduced + reduced_2 + P,
        matchedTerms: filtered,
      };
    })
    .filter((p) => p.score > 0)
    .sort((p, f) => f.score - p.score || (p.path < f.path ? -1 : 1))
    .slice(0, n);
};
//@ chunk-vp5gef34.js:19463-21378 affinity
/**
 * 记忆 BM25 索引与磁盘同步：An 比较扫描结果找出需重建与需删除的文档；yt 扫描目录、确认失踪文件确实不存在后删除，读入新增/变化的 .md 并更新哈希，返回增删改与跳过的统计。
 */
var diffMemoryIndex = (e, files, skipped = new Set(), skippedSubtrees = new Set(), s) => {
  let r = new Set(files.map((d) => d.path));
  let mapped = [...skippedSubtrees].map((d) => d + "/");
  let a = (d) => mapped.length > 0 && mapped.some((h) => d.startsWith(h));
  let toRemove = [...e.pathToId.keys()].filter(
    (key) => s?.(key) === true || (!r.has(key) && !skipped.has(key) && !a(key)),
  );
  let filtered = files.filter((d) => {
    let h = e.pathToId.get(d.path);
    if (h === undefined) return true;
    let u = e.docs.get(h);
    return u.size !== d.size || u.mtimeMs !== d.mtimeMs;
  });
  return {
    toIndex: filtered,
    toRemove,
    unchangedCount: files.length - filtered.length,
  };
};
var syncMemoryIndex = async (e, t, n = C, o) => {
  let s = {
    added: 0,
    updated: 0,
    removed: 0,
    unchanged: e.docs.size,
    rehashedUnchanged: 0,
    transientSkips: 0,
    scanCompleted: false,
  };
  if (o?.aborted) return s;
  let r = await Rn(t, n).catch(() => {
    return;
  });
  if (r === undefined) return s;
  if (r.rootMissing && e.docs.size > 0) return s;
  let i = await realpath(t).catch((error) => (A(error) === "structural" ? undefined : j));
  if (i === j) return s;
  let a = diffMemoryIndex(e, r.files, r.skipped, r.skippedSubtrees, (y) => De(y, n));
  let c = [];
  let l = [];
  await Promise.all(
    a.toRemove.map(async (y) => {
      if (De(y, n) || r.capDropped.has(y)) c.push(y);
      else if (await pt(t, y, n.maxFileBytes)) l.push(y);
    }),
  );
  let h =
    l.length === 0 ||
    (await realpath(t).then(
      () => true,
      () => false,
    ))
      ? [...c, ...l]
      : c;
  let u = a.toRemove.length - h.length;
  let p = dropDocuments(e, h);
  let f = 0;
  let m = 0;
  let g = 0;
  let S = 0;
  let I = 0;
  let T = false;
  for (let y of a.toIndex) {
    if (o?.aborted) {
      T = true;
      break;
    }
    let P = await ut(join(t, y.path), {
      withinReal: i,
      maxBytes: n.maxFileBytes,
    }).catch((error) => (ft(error) ? fe : A(error) === "structural" ? undefined : j));
    if (P === j) {
      I++;
      continue;
    }
    if (P === fe) {
      if (hasDocumentPath(e, y.path)) S++;
      continue;
    }
    if (P === undefined) {
      if (!(await mt(t, y.path))) {
        I++;
        continue;
      }
      if (hasDocumentPath(e, y.path)) S++;
      continue;
    }
    if (P.byteLength > n.maxFileBytes) {
      if (hasDocumentPath(e, y.path)) S++;
      continue;
    }
    let v = new TextDecoder().decode(P);
    let R = gt(v);
    let E = e.pathToId.get(y.path);
    let D = E === undefined ? undefined : e.docs.get(E);
    if (D?.hash === R && !e.unverified.has(E)) {
      e.docs.set(E, {
        ...D,
        size: y.size,
        mtimeMs: y.mtimeMs,
      });
      g++;
      continue;
    }
    upsertDocument(e, extractMemoryFieldsFromFile(y.path, v), {
      hash: R,
      size: y.size,
      mtimeMs: y.mtimeMs,
    });
    if (D === undefined) f++;
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
  let { logFeatureSad } = await import("./chunk-53at0fec.js").catch(() => ({
    logFeatureSad: undefined,
  }));
  logFeatureSad?.("memory_recall_select", e, {
    via_index: true,
    ...t,
  });
};
//@ chunk-vp5gef34.js:21662-26032 placement
/**
 * BM25 索引文件（.bm25-index.json）的读写：序列化成紧凑数组、解析回内存结构，超过 64 MiB 视为超大并重建。
 */
var deserializeIndex = 10;
var serializeIndex = (e) => {
  let sorted = [...e.docs.keys()].sort((r, i) => r - i);
  let n = new Map(sorted.map((r, i) => [r, i]));
  let docs = sorted.map((r) => {
    let i = e.docs.get(r);
    return [
      i.path,
      i.hash,
      i.size,
      i.mtimeMs,
      extractMemoryFields.map((extractMemoryField) => i.fieldLengths[extractMemoryField]),
    ];
  });
  let terms = [...e.terms.entries()].map(([r, i]) => {
    let a = [];
    let c = -1;
    docIdsOfTerm(i).forEach((l, d) => {
      let h = n.get(l);
      if (h === undefined) throw Error("posting references unknown docId");
      a.push(c < 0 ? h : h - c);
      c = h;
      let mapped = extractMemoryFields.map((extractMemoryField) =>
        removeDocIdFromTerm(i, d, extractMemoryField),
      );
      for (let p of mapped) a.push(p?.length ?? 0);
      for (let p of mapped)
        p?.forEach((f, m) => {
          a.push(m === 0 ? f : f - p[m - 1]);
        });
    });
    return [r, a];
  });
  return {
    version: deserializeIndex,
    docs,
    terms,
  };
};
var toTypedArray = (e, t) => {
  let n = e[t];
  if (typeof n !== "number" || !Number.isInteger(n) || n < 0 || n > MAX_DOC_ID)
    throw Error("malformed posting data");
  return n;
};
var encodePostings = (emptyIndex, t, n, o) => {
  let mapped = extractMemoryFields.map(() => 0);
  let mapped_2 = extractMemoryFields.map(() => []);
  let i = 0;
  let a = -1;
  while (i < n.length) {
    let typedArray = toTypedArray(n, i++);
    let d = a < 0 ? typedArray : a + typedArray;
    if (d >= o) throw Error("posting references unknown docId");
    if (a >= 0 && typedArray === 0) throw Error("repeated posting docId");
    a = d;
    let h = 0;
    extractMemoryFields.forEach((extractMemoryField, p) => {
      mapped[p] = toTypedArray(n, i + p);
      h += mapped[p];
    });
    i += extractMemoryFields.length;
    if (h === 0 || i + h > n.length) throw Error("malformed posting positions");
    extractMemoryFields.forEach((extractMemoryField, p) => {
      let f = mapped_2[p];
      f.length = 0;
      let m = -1;
      for (let idx = 0; idx < mapped[p]; idx++) {
        let typedArray = toTypedArray(n, i++);
        m = m < 0 ? typedArray : m + typedArray;
        if ((idx > 0 && typedArray === 0) || m > MAX_DOC_ID) throw Error("malformed posting positions");
        f.push(m);
      }
    });
    addDocumentToIndex(emptyIndex, t, d, mapped_2);
  }
  let c = emptyIndex.terms.get(t);
  if (c === undefined) throw Error("empty term entry");
  removePosting(c);
};
var decodeIndex = (e) => {
  if (e.version !== deserializeIndex) throw Error("unsupported index format version");
  if (!Array.isArray(e.docs) || !Array.isArray(e.terms)) throw Error("malformed index shape");
  let emptyIndex = createEmptyIndex();
  for (let [n, o] of e.docs.entries()) {
    if (!Array.isArray(o) || o.length !== 5) throw Error("malformed doc entry");
    let [s, r, i, a, c] = o;
    if (
      typeof r !== "string" ||
      !Number.isFinite(i) ||
      !Number.isFinite(a) ||
      !Array.isArray(c) ||
      c.length !== extractMemoryFields.length ||
      c.some((d) => !Number.isInteger(d) || d < 0 || d > MAX_DOC_ID)
    )
      throw Error("malformed doc metadata");
    if (
      typeof s !== "string" ||
      s.length === 0 ||
      s.startsWith("/") ||
      (sep === "\\" && (s.includes("\\") || /^[A-Za-z]:/.test(s))) ||
      s.includes("\x00") ||
      s.split("/").some((d) => d === ".." || d === "" || d === ".")
    )
      throw Error("non-contained doc path");
    if (emptyIndex.pathToId.has(s)) throw Error("duplicate doc entry");
    let l = Object.fromEntries(
      extractMemoryFields.map((extractMemoryField, h) => [extractMemoryField, c[h]]),
    );
    emptyIndex.docs.set(n, {
      path: s,
      hash: r,
      size: i,
      mtimeMs: a,
      fieldLengths: l,
    });
    emptyIndex.pathToId.set(s, n);
    emptyIndex.unverified.add(n);
    for (let extractMemoryField of extractMemoryFields) {
      emptyIndex.fieldLengthTotals[extractMemoryField] += l[extractMemoryField];
      if (l[extractMemoryField] > 0) emptyIndex.fieldDocCounts[extractMemoryField]++;
    }
  }
  if (
    extractMemoryFields.some(
      (extractMemoryField) => !Number.isSafeInteger(emptyIndex.fieldLengthTotals[extractMemoryField]),
    )
  )
    throw Error("malformed doc metadata");
  emptyIndex.nextDocId = e.docs.length;
  for (let term of e.terms) {
    if (!Array.isArray(term) || term.length !== 2) throw Error("malformed term entry");
    let [o, s] = term;
    if (typeof o !== "string" || o.length === 0 || !Array.isArray(s) || emptyIndex.terms.has(o))
      throw Error("malformed term entry");
    encodePostings(emptyIndex, o, s, e.docs.length);
  }
  return emptyIndex;
};
var readIndexFile = async (index, indexPath, n = MAX_INDEX_FILE_BYTES) => {
  let o = jsonStringify(serializeIndex(index));
  let s = Buffer.byteLength(o);
  if (s > n) {
    logRecallIndexSad("index_persist_skipped_oversized");
    let r = await lstat(indexPath).catch(() => {
      return;
    });
    if (r !== undefined && r.size > n) await unlink(indexPath).catch(() => {});
    return 0;
  }
  await writeFileAtomic(indexPath, o, 384);
  return s;
};
var TRANSIENT_READ_FAILURE = Symbol("transient-index-read-failure");
var INDEX_JSON_PREFIX = '{"version"';
var MAX_INDEX_FILE_BYTES = 67108864;
var INDEX_OVERSIZED = Symbol("index-file-oversized");
var readIndexFileRaw = async (e) => {
  let t = await open(e, readOnlyNoFollowFlags());
  try {
    let stats = await t.stat();
    if (!stats.isFile())
      throw Object.assign(Error("not a regular file"), {
        code: "ENOTREG",
      });
    if (stats.size > MAX_INDEX_FILE_BYTES) {
      let s = Buffer.alloc(64);
      let { bytesRead } = await t.read(s, 0, 64, 0);
      throw Object.assign(Error("index file oversized"), {
        code: INDEX_OVERSIZED,
        head: s.subarray(0, bytesRead).toString("utf8"),
      });
    }
    let content = await t.readFile({
      encoding: "utf8",
    });
    if (Buffer.byteLength(content) > MAX_INDEX_FILE_BYTES)
      throw Object.assign(Error("index file oversized"), {
        code: INDEX_OVERSIZED,
        head: content.slice(0, 64),
      });
    return content;
  } finally {
    await t.close();
  }
};
var tryParseIndex = (error) => {
  let t = error;
  if (t.code !== INDEX_OVERSIZED) return;
  return (typeof t.head === "string" ? t.head.trim() : "").startsWith(INDEX_JSON_PREFIX);
};
var loadIndexFromDisk = async (indexPath) => {
  let t;
  let n = await readIndexFileRaw(indexPath).catch((error) => {
    t = tryParseIndex(error);
    return isENOENT(error) ? undefined : TRANSIENT_READ_FAILURE;
  });
  if (n === TRANSIENT_READ_FAILURE)
    return {
      owned: t ?? false,
      absent: false,
    };
  if (n === undefined)
    return {
      owned: true,
      absent: true,
    };
  try {
    let o = jsonParse(n);
    return {
      owned: typeof o === "object" && o !== null && typeof o.version === "number",
      absent: false,
    };
  } catch {
    let sliced = n.trim().slice(0, INDEX_JSON_PREFIX.length);
    return {
      owned: sliced === "" || INDEX_JSON_PREFIX.startsWith(sliced),
      absent: false,
    };
  }
};
var readCachedIndex = async (e) => {
  let t;
  let n = await readIndexFileRaw(e).catch((error) => {
    t = tryParseIndex(error);
    return isENOENT(error) ? undefined : TRANSIENT_READ_FAILURE;
  });
  if (n === TRANSIENT_READ_FAILURE)
    return {
      index: undefined,
      pathOwned: t ?? false,
    };
  if (n === undefined)
    return {
      index: undefined,
      pathOwned: true,
    };
  let o;
  try {
    o = jsonParse(n);
  } catch {
    let sliced = n.trim().slice(0, INDEX_JSON_PREFIX.length);
    return {
      index: undefined,
      pathOwned: sliced === "" || INDEX_JSON_PREFIX.startsWith(sliced),
    };
  }
  if (typeof o !== "object" || o === null || typeof o.version !== "number")
    return {
      index: undefined,
      pathOwned: false,
    };
  try {
    return {
      index: decodeIndex(o),
      pathOwned: true,
    };
  } catch {
    return {
      index: undefined,
      pathOwned: true,
    };
  }
};
//@ chunk-vp5gef34.js:26032-27170 placement
/**
 * 记忆索引的打开/建立入口：读取已有索引并同步目录，扫描未完成时退回空索引。
 */
var memoryIndexPath = ".bm25-index.json";
var openMemoryIndex = async (e, t = C, n, o = true) => {
  let s = join(e, memoryIndexPath);
  let r = o
    ? await readCachedIndex(s)
    : {
        index: undefined,
        pathOwned: false,
      };
  let i = r.index ?? createEmptyIndex();
  let a = await syncMemoryIndex(i, e, t, n);
  let c = r.index !== undefined && !a.scanCompleted;
  return {
    dir: e,
    indexPath: s,
    index: c ? createEmptyIndex() : i,
    lastSync: c
      ? {
          added: 0,
          updated: 0,
          removed: 0,
          unchanged: 0,
          rehashedUnchanged: 0,
          transientSkips: 0,
          scanCompleted: false,
        }
      : a,
    loadedFromDisk: r.index !== undefined,
    persistable: r.pathOwned && !c,
    options: t,
  };
};
var buildMemoryIndex = async (memoryIndex) => {
  if (!memoryIndex.persistable || !memoryIndex.lastSync.scanCompleted) return 0;
  let indexFromDisk = await loadIndexFromDisk(memoryIndex.indexPath);
  if (!indexFromDisk.owned || (memoryIndex.loadedFromDisk && indexFromDisk.absent)) return 0;
  return readIndexFile(memoryIndex.index, memoryIndex.indexPath);
};
var ensureMemoryIndex = async (store, t, n = 5, o = bm25Search) => {
  let s = new Set();
  let r = (i) => i.filter((a) => !s.has(a.path));
  for (let i = 0; i < 8; i++) {
    let sliced = r(searchIndex(store.index, t, n + s.size, o)).slice(0, n);
    let filtered = sliced.filter((l) => {
      let d = store.index.pathToId.get(l.path);
      return d !== undefined && store.index.unverified.has(d);
    });
    if (filtered.length === 0) return sliced;
    for (let l of filtered) {
      let d = store.index.pathToId.get(l.path);
      if (
        !(await ht(store.index, store.dir, l.path, store.options)) &&
        d !== undefined &&
        store.index.unverified.has(d)
      )
        s.add(l.path);
    }
  }
  return r(searchIndex(store.index, t, n + s.size, o))
    .filter((i) => {
      let a = store.index.pathToId.get(i.path);
      return a === undefined || !store.index.unverified.has(a);
    })
    .slice(0, n);
};
//@ chunk-vp5gef34.js:27170-29264 placement
/**
 * 目录到索引的增量同步：比对大小/mtime 找新增与改动、删除已消失文件、抽取短语与加权短语、统计各项计数。
 */
var syncMemoryIndex_2 = Symbol("transient-realpath-failure");
var indexDidChange = (lastSync) =>
  lastSync.added > 0 || lastSync.updated > 0 || lastSync.removed > 0 || lastSync.rehashedUnchanged > 0;
var dedupePhrases = (e) => {
  let t = [...e.boostPhrases, ...e.phrases];
  let n = new Set();
  let o = [];
  for (let idx = t.length - 1; idx >= 0; idx--) {
    let r = t[idx];
    let joined = r.join(" ");
    if (!n.has(joined)) {
      n.add(joined);
      o.push(r);
    }
  }
  o.reverse();
  return {
    terms: e.terms,
    phrases: [],
    boostPhrases: o,
  };
};
var MAX_PHRASE_CHARS = 4096;
var DEFAULT_PHRASE_CHARS = 3072;
var MIN_PHRASE_CHARS = 1024;
var phraseMatches = (e, t) => {
  if (((e.match(/"/g) ?? []).length & 1) === 0) return e;
  let n = t ? e.lastIndexOf('"') : e.indexOf('"');
  return e.slice(0, n) + " " + e.slice(n + 1);
};
var snapSurrogateStart = (e, t) => (t > 0 && t < e.length && (e.charCodeAt(t) & 64512) === 56320 ? t - 1 : t);
var collectPhrases = (e) => {
  if (e.length <= MAX_PHRASE_CHARS) return e;
  let t = snapSurrogateStart(e, DEFAULT_PHRASE_CHARS);
  let n = snapSurrogateStart(e, e.length - MIN_PHRASE_CHARS);
  let o = `${phraseMatches(e.slice(0, t), true)}
${phraseMatches(e.slice(n), false)}`;
  return ((e.match(/"/g) ?? []).length & 1) === 0 ? o : o.replaceAll('"', " ");
};
var MAX_BOOST_PHRASES = 64;
var truncatePhraseTerms = (boostPhrases) =>
  boostPhrases.slice(-8).map((t) => (t.length <= 16 ? t : t.slice(0, 16)));
var MIN_PHRASE_TERMS = 8;
var MAX_PHRASE_TERMS = 24;
var PHRASE_TERM_PADDING = 4;
var syncIndexFromDirectory = (terms, t, n, o, s) => {
  let r = new Set(terms);
  let i = new Set();
  let a = new Map();
  let c = (u) => {
    let p = t(u);
    if (p === 0) return false;
    if (p === 1) {
      let f = n(u);
      if (f !== undefined) {
        let m = a.get(f) ?? 0;
        if (m >= PHRASE_TERM_PADDING) return false;
        a.set(f, m + 1);
      }
    }
    return true;
  };
  for (let u of s) if (r.has(u) && c(u)) i.add(u);
  let size = i.size;
  for (let u of o) {
    if (i.size >= size + MIN_PHRASE_TERMS) break;
    if (r.has(u) && !i.has(u) && c(u)) i.add(u);
  }
  let size_2 = i.size;
  for (let idx = o.length - 1; idx >= 0 && i.size < size_2 + MAX_PHRASE_TERMS; idx--) {
    let p = o[idx];
    if (r.has(p) && !i.has(p) && c(p)) i.add(p);
  }
  let sorted = terms
    .filter((u) => !i.has(u))
    .map((u) => {
      let p = t(u);
      if (p === 0)
        return {
          t: u,
          key: Number.MAX_SAFE_INTEGER,
        };
      if (p === 1) {
        let f = n(u);
        if (f !== undefined) {
          let m = a.get(f) ?? 0;
          a.set(f, m + 1);
          if (m >= PHRASE_TERM_PADDING)
            return {
              t: u,
              key: Number.MAX_SAFE_INTEGER - 1,
            };
        }
        return {
          t: u,
          key: 1,
        };
      }
      return {
        t: u,
        key: p,
      };
    })
    .sort((u, p) => u.key - p.key);
  for (let { t: u } of sorted) {
    if (i.size >= MAX_BOOST_PHRASES) break;
    i.add(u);
  }
  return terms.filter((u) => i.has(u));
};
var indexFileIfChanged = (e, index, n) => {
  if (
    e.terms.length <= MAX_BOOST_PHRASES &&
    e.boostPhrases.every((boostPhrase) => boostPhrase.length <= 16) &&
    e.boostPhrases.length <= 8
  )
    return e;
  let o = truncatePhraseTerms(e.boostPhrases);
  return {
    terms: syncIndexFromDirectory(
      e.terms,
      (s) => termDocCount(index, s),
      (s) => addPostingPosition(index, s),
      n(),
      new Set(o.flat()),
    ),
    phrases: e.phrases,
    boostPhrases: o,
  };
};
var syncResult = (e, excludeLog, isRecallVisible) => ({
  ...(e === null
    ? C
    : {
        ...C,
        excludePaths: new Set([...e.excluded].map((o) => o.split(sep).join("/"))),
        excludePrefixes: e.excludedPrefixes.map((excludedPrefix) => excludedPrefix.split(sep).join("/")),
      }),
  excludeLog,
  isRecallVisible,
});
var indexCacheKey = (e, t) => `${t ? "persist" : "no-persist"}:${e}`;
//@ chunk-vp5gef34.js:29264-29751 placement
/**
 * 记忆索引的打开缓存：按目录与存储空间缓存打开的索引（带 TTL），扫描完成后持久化，并支持释放当前缓存项。
 */
class MemoryIndexCache {
  open = memoizeWithTTLAsync(
    async (e, t, excludeLog, isRecallVisible, s) => {
      let startTime = performance.now();
      let memoryIndex = await openMemoryIndex(e, syncResult(t, excludeLog, isRecallVisible), undefined, s);
      if (
        s &&
        memoryIndex.lastSync.scanCompleted &&
        (!memoryIndex.loadedFromDisk ? memoryIndex.index.docs.size > 0 : indexDidChange(memoryIndex.lastSync))
      )
        if (memoryIndex.persistable)
          await buildMemoryIndex(memoryIndex).catch(() => {
            logRecallIndexSad("index_persist_failed");
          });
        else logRecallIndexSad("index_path_foreign");
      return {
        store: memoryIndex,
        openMs: performance.now() - startTime,
      };
    },
    (e, t, n, o, s) => indexCacheKey(e, s),
  );
  isHeld(e, t) {
    return this.open.cache.has(indexCacheKey(e, t));
  }
  releaseIfCurrent(e, t, n) {
    let o = indexCacheKey(e, t);
    if (this.open.cache.get(o) === n) this.open.cache.delete(o);
  }
}
//@ chunk-vp5gef34.js:29751-32197 placement
/**
 * 按会话根缓存记忆索引：打开、按路径取、释放过期实例；扫描不完整时释放并重建。
 */
var searchMemoryIndex = new SessionRootSlot(() => new MemoryIndexCache());
var withMemoryIndex = async (e, t, n, o, s, r) => {
  let i = e.open(t, n, o, s, r);
  let a = await i;
  if (!a.store.lastSync.scanCompleted || a.store.lastSync.transientSkips > 0 || a.store.index.docs.size === 0)
    e.releaseIfCurrent(t, r, i);
  return a;
};
var memoryIndexFor = (e, t, n, o) => {
  withMemoryIndex(searchMemoryIndex.of(e), t, null, n, o, true)
    .then(({ store }) => {
      if (!store.lastSync.scanCompleted)
        logRecallIndexSad("index_prewarm_failed", {
          prewarm: true,
          sweep_incomplete: true,
        });
      else if (store.lastSync.transientSkips > 0)
        logRecallIndexSad("index_prewarm_failed", {
          prewarm: true,
          transient_skips: true,
        });
    })
    .catch(() => {
      logRecallIndexSad("index_prewarm_failed", {
        prewarm: true,
      });
    });
};
var releaseMemoryIndex = async (e, t, n, o, s = 5, r = null, i, a = false, c) => {
  let startTime = performance.now();
  let d = searchMemoryIndex.of(e);
  let storeWasHeld = d.isHeld(n, a);
  let { store, openMs } = await withMemoryIndex(d, n, r, i, c, a);
  let openWaitMs = performance.now() - startTime;
  let m = () => fieldLengthBoost(store.index.docs.size);
  let g = (sync, M = [], queryTermCount = 0) => {
    let topScore = M[0]?.score ?? 0;
    let U = m();
    let ge = count(M, (J) => J.score < U);
    return {
      docCount: store.index.docs.size,
      termCount: store.index.terms.size,
      loadedFromDisk: store.loadedFromDisk,
      sync,
      tookMs: performance.now() - startTime,
      storeWasHeld,
      openWaitMs,
      storeOpenMs: openMs,
      topScore,
      relevanceFloor: U,
      hitCount: M.length,
      belowFloorCount: ge,
      suppressedByFloor: M.length > 0 && ge === M.length,
      queryTermCount,
    };
  };
  if (o.aborted)
    return {
      ranked: [],
      stats: g(store.lastSync),
    };
  if (store.loadedFromDisk && !store.lastSync.scanCompleted)
    return {
      ranked: [],
      stats: g(store.lastSync),
    };
  let S = typeof t === "string" ? collectPhrases(t) : "";
  let I =
    typeof t === "string"
      ? indexFileIfChanged(dedupePhrases(idfForTerm(S)), store.index, () => tokenizeDualStem(S))
      : mergeSpans(t.exact_terms, t.conceptual_keywords);
  let memoryIndex = await ensureMemoryIndex(store, I, s + 5);
  let y =
    c === undefined
      ? i === undefined
        ? memoryIndex
        : memoryIndex.filter((w) => !i(w.path))
      : memoryIndex.filter((w) => (i === undefined || !i(w.path)) && c(w.path));
  let P = await realpath(n).catch(() => {
    return;
  });
  let v = resolve(n);
  let R = [];
  let E = [];
  let results = await Promise.all(
    y.map(async (w) => {
      let M = store.index.pathToId.get(w.path);
      let O = M === undefined ? undefined : store.index.docs.get(M);
      let B = resolve(n, w.path);
      let U = await realpath(B).catch((error) => (A(error) === "structural" ? undefined : syncMemoryIndex_2));
      if (U === undefined) {
        if (P !== undefined) R.push(w.path);
        return [];
      }
      if (U === syncMemoryIndex_2) return [];
      if (!U.startsWith((P ?? v) + sep)) {
        if (P !== undefined) E.push(w.path);
        return [];
      }
      let J = await lstat(B).catch((error) => (A(error) === "structural" ? undefined : syncMemoryIndex_2));
      if (J === syncMemoryIndex_2) return [];
      if (J === undefined) {
        if (P !== undefined) R.push(w.path);
        return [];
      }
      if (!J.isFile()) {
        if (P !== undefined) E.push(w.path);
        return [];
      }
      return [
        {
          path: B,
          mtimeMs: O?.mtimeMs ?? 0,
          score: w.score,
        },
      ];
    }),
  );
  if (R.length > 0 || E.length > 0) {
    let results = await Promise.all(
      R.map(async (O) =>
        (await realpath(resolve(n, O)).then(
          () => false,
          (error) => A(error) === "structural",
        ))
          ? O
          : undefined,
      ),
    );
    let M = await realpath(n).catch(() => {
      return;
    });
    if (M !== undefined && M === P) {
      for (let O of E) hasDocumentPath(store.index, O);
      for (let O of results) if (O !== undefined) hasDocumentPath(store.index, O);
    }
  }
  let X = results.flat();
  let kt = m();
  return {
    ranked: X.filter((w) => w.score >= kt).slice(0, s),
    stats: g(store.lastSync, X, I.terms.length),
  };
};
//@ chunk-e6aww6q8.js:1311938-1312110 placement
function pickMemorySizeBasis({ rawSizeBytes, surfaceCap, splicedSizeBytes, spliceCap, spliceActive }) {
  return surfaceCap !== undefined &&
    (!spliceActive || rawSizeBytes / surfaceCap >= splicedSizeBytes / spliceCap)
    ? {
        sizeBytes: rawSizeBytes,
        byteCap: surfaceCap,
      }
    : {
        sizeBytes: splicedSizeBytes,
        byteCap: spliceCap,
      };
}
//@ chunk-e6aww6q8.js:1312110-1312600 placement
/**
 * 计算记忆文件（字节、行数）中离上限最近的维度，占比低于阈值返回 null，否则给出超限与否及大小/上限/目标的可读描述。
 */
function memoryLimitPressure(e) {
  let n = [
    {
      frac: e.sizeBytes / e.byteCap,
      dimension: "bytes",
      over: e.sizeBytes > e.byteCap,
      sizeDesc: formatFileSize(e.sizeBytes),
      capDesc: formatFileSize(e.byteCap),
      targetDesc: formatFileSize(Math.floor(e.byteCap * MEMORY_SIZE_SOFT_RATIO)),
    },
  ];
  if (e.lineCap !== undefined && e.lineCount !== undefined)
    n.push({
      frac: e.lineCount / e.lineCap,
      dimension: "lines",
      over: e.lineCount > e.lineCap,
      sizeDesc: `${e.lineCount} lines`,
      capDesc: `${e.lineCap}-line`,
      targetDesc: `${Math.floor(e.lineCap * MEMORY_SIZE_SOFT_RATIO)} lines`,
    });
  let { frac, ...s } = n.reduce((acc, y) => (y.frac > acc.frac ? y : acc));
  return frac < MEMORY_SIZE_WARN_RATIO ? null : s;
}
//@ chunk-e6aww6q8.js:1312600-1313208 placement
/**
 * 记忆索引超过读取上限时的提示：超出部分每次加载都会被丢弃。
 */
function checkMemoryIndexReadLimit(e) {
  let n = memoryLimitPressure(e);
  if (n === null) return null;
  return {
    text: `${n.over ? `Error: this write left the ${e.label} at ${e.displayPath} at ${n.sizeDesc}, over its ${n.capDesc} read limit. The write succeeded, but everything past the limit ` + "is silently dropped each time the index is loaded \u2014 entries at the end are already invisible " + "to readers. Rewrite it" : `The ${e.label} at ${e.displayPath} is ${n.sizeDesc}, approaching the ${n.capDesc} read limit. Compact it`} to under ${n.targetDesc} now: keep one line per entry, move detail into topic files, and merge or drop stale entries.`,
    overCap: n.over,
  };
}
//@ chunk-e6aww6q8.js:1313208-1313357 placement
var MAX_INDEX_LINE_CHARS = 150;
var BACKFILL_MAX_LINES = Math.floor(MAX_ENTRYPOINT_LINES * MEMORY_SIZE_SOFT_RATIO);
var BACKFILL_MAX_BYTES = Math.floor(MAX_ENTRYPOINT_BYTES * MEMORY_SIZE_SOFT_RATIO);
var UNSAFE_INDEX_NAME_REGEX = /[[\]()\n\r\u2028\u2029]/;
var UNWRITABLE_ERRNOS = new Set(["EROFS", "EACCES", "EPERM"]);
var backfillState = new HostScoped(() => new Map());
//@ chunk-e6aww6q8.js:1313357-1313614 placement
function memoryIndexLine(e) {
  let joined = e.filename.split(sep).join("/");
  if (UNSAFE_INDEX_NAME_REGEX.test(joined) || singleLineMemoryText(joined) !== joined) return null;
  let r = `- [${basename(joined, ".md")}](${joined})`;
  let trimmed = sanitizeMemoryText(e.description ?? "")
    .replace(/\s+/g, " ")
    .trim();
  let h = MAX_INDEX_LINE_CHARS - r.length - 3;
  if (trimmed === "" || h <= 1) return r;
  return `${r} \u2014 ${sanitizeMemoryText(truncateAtWord(trimmed, h))}`;
}
//@ chunk-e6aww6q8.js:1313614-1313798 placement
function buildMemoryIndexContent(e) {
  let n = "";
  let r = 0;
  let s = false;
  let h = 0;
  for (let y of e) {
    let S = memoryIndexLine(y);
    if (S === null) {
      h++;
      continue;
    }
    s ||= r + 1 > BACKFILL_MAX_LINES || n.length + S.length + 1 > BACKFILL_MAX_BYTES;
    if (!s) {
      n += `${S}
`;
      r++;
    }
  }
  return {
    content: n,
    skippedCount: h,
  };
}
//@ chunk-e6aww6q8.js:1313798-1314118 placement
/**
 * 判断记忆目录是否需要补建索引：已有索引、有候选 .md 文件或子目录，或没有可索引内容。
 */
async function memoryIndexBackfillState(e) {
  let n = await readdir(e, {
    withFileTypes: true,
  });
  if (n.some((s) => s.name === MEMORY_INDEX_FILENAME)) return "exists";
  return n.some((s) => {
    if (isExcludedMemoryKey(s.name)) return false;
    if (s.isFile()) return s.name.endsWith(".md");
    if (s.isSymbolicLink() || s.isFIFO() || s.isSocket() || s.isBlockDevice() || s.isCharacterDevice())
      return false;
    return true;
  })
    ? "candidates"
    : "none";
}
//@ chunk-e6aww6q8.js:1314118-1315117 placement
/**
 * 写入记忆索引补建结果：先写临时文件再改名，不可写时就地写。
 */
async function writeMemoryIndexBackfill(e, content) {
  let r = join(e, `.${MEMORY_INDEX_FILENAME}.backfill-${process.pid}-${randomBytes(4).toString("hex")}.tmp`);
  let s = join(e, MEMORY_INDEX_FILENAME);
  let h;
  try {
    h = await open(r, "wx");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && UNWRITABLE_ERRNOS.has(errnoCode)) return "unwritable";
    logForDebugging(`memory index backfill: temp create failed, creating in place: ${errorMessage(error)}`);
    return writeMemoryIndexExclusive(e, content);
  }
  try {
    let y;
    try {
      await h.writeFile(content, "utf8");
      y = await h
        .stat({
          bigint: true,
        })
        .catch(() => null);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== undefined && UNWRITABLE_ERRNOS.has(errnoCode)) return "unwritable";
      await h.close().catch(() => {});
      await unlink(r).catch(() => {});
      logForDebugging(`memory index backfill: temp write failed, creating in place: ${errorMessage(error)}`);
      return await writeMemoryIndexExclusive(e, content);
    } finally {
      await h.close().catch(() => {});
    }
    if (y === null) return await writeMemoryIndexExclusive(e, content);
    let S = await verifyLinkTarget(
      r,
      {
        device: y.dev,
        inode: y.ino,
      },
      s,
    );
    if (S.ok) return "written";
    if (S.error.kind === "fs" && isErrnoCode_2(S.error.error, "EEXIST")) return "exists";
    logForDebugging(
      `memory index backfill: link did not publish (${S.error.kind === "classified" ? formatStorageError(S.error.error) : errorKindLabel(S.error)}), creating in place`,
    );
    return await writeMemoryIndexExclusive(e, content);
  } finally {
    await unlink(r).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:1315117-1315563 placement
/**
 * 用 wx 独占方式创建记忆索引文件并写入；已存在返回 exists，只读/权限错误返回 unwritable；写入失败时删掉自己刚创建的文件。
 */
async function writeMemoryIndexExclusive(e, n) {
  let r = join(e, MEMORY_INDEX_FILENAME);
  let s;
  try {
    await assertPathSafeAsync(r);
    s = await open(r, "wx");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EEXIST") return "exists";
    if (errnoCode !== undefined && UNWRITABLE_ERRNOS.has(errnoCode)) return "unwritable";
    throw error;
  }
  let h = await s.stat().catch(() => null);
  try {
    await s.writeFile(n, "utf8");
    await s.close();
    return "written";
  } catch (error) {
    await s.close().catch(() => {});
    let S = await lstat(r).catch(() => null);
    if (h !== null && S !== null && h.ino === S.ino && h.dev === S.dev) await unlink(r).catch(() => {});
    throw error;
  }
}
//@ chunk-e6aww6q8.js:1315563-1316725 placement
/**
 * 补建记忆索引：扫描记忆目录中索引缺少的条目并写回，记录遥测。
 */
async function backfillMemoryIndex(e, n, r) {
  try {
    let s;
    try {
      s = await memoryIndexBackfillState(e);
    } catch (error) {
      n();
      logForDebugging(`memory index backfill: ${errorMessage(error)}`);
      return false;
    }
    switch (s) {
      case "exists":
        r();
        return true;
      case "none":
        n();
        return false;
      case "candidates":
        break;
    }
    let h;
    try {
      h = await scanMemoryHeaders(e, createAbortController().signal, {
        regularFilesOnly: true,
      });
    } catch (error) {
      logForDebugging(`memory index backfill: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("memory_index_backfill", "scan_failed");
      return false;
    }
    h = h.filter(
      (L) =>
        !L.filename
          .split(sep)
          .some((G) => G.startsWith(".") || EXCLUDED_TOP_LEVEL_DIRS.includes(normalizeKeySegment(G))),
    );
    let { content, skippedCount } = buildMemoryIndexContent(h);
    if (content === "") {
      if (h.length > 0) {
        logForDebugging(
          `memory index backfill: nothing linkable among ${h.length} topic files (${skippedCount} skipped)`,
        );
        logFeatureSad("memory_index_backfill", "nothing_linkable");
      }
      return false;
    }
    let w;
    try {
      w = await writeMemoryIndexBackfill(e, content);
    } catch (error) {
      logForDebugging(`memory index backfill: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("memory_index_backfill", "write_failed");
      return false;
    }
    switch (w) {
      case "written":
        logEvent("tengu_memdir_index_backfilled", {
          file_count: h.length,
          skipped_count: skippedCount,
        });
        logFeatureOk("memory_index_backfill");
        return true;
      case "exists":
        return true;
      case "unwritable":
        logForDebugging("memory index backfill: memory directory is not writable");
        return false;
    }
  } catch (error) {
    logForDebugging(`memory index backfill: ${errorMessage(error)}`, {
      level: "warn",
    });
    logFeatureSad("memory_index_backfill", "unexpected");
    return false;
  }
}
export {
  backfillState,
  backfillMemoryIndex,
  checkMemoryIndexReadLimit,
  pickMemorySizeBasis,
  memoryLimitPressure,
  hasDocumentPath,
  upsertDocument,
  extractMemoryFieldsFromFile,
};
