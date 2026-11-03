/**
 * utils/permissions/approvalPayloadSerialization.ts
 *
 * 2.1.316 新增：按预算序列化审批载荷值；为显示相同的标签消歧等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qvp68pt5.js (63)
 * attribution: placement 63
 */
import { stripNonPrintable, wrapLongLines, X1e } from "../truncateGraphemes.js";
import { truncateToLength, getFirstLine } from "../stringUtils.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { truncateToWidth, truncate } from "../format.js";
import { jsonStringify } from "../slowOperations.js";
import { y3e, ple, Yls } from "../deepFreezePlainData.js";

//@ chunk-qvp68pt5.js:429-483 placement
var w = /\p{Default_Ignorable_Code_Point}/u,
  R = /\p{Cf}/u;
//@ chunk-qvp68pt5.js:483-580 placement
function T(n) {
  return (
    (n >= 8204 && n <= 8207) ||
    n === 1564 ||
    (n >= 65024 && n <= 65039) ||
    (n >= 6155 && n <= 6159) ||
    n === 10240
  );
}
//@ chunk-qvp68pt5.js:580-699 placement
function isUnsafeDisplayChar(n, t) {
  return (
    w.test(n) ||
    n === "\u2028" ||
    n === "\u2029" ||
    n === "\u2800" ||
    (t >= 55296 && t <= 57343) ||
    t === 1109742 ||
    R.test(n)
  );
}
/**
 * 是否含需要处理的显示字符。
 */
//@ chunk-qvp68pt5.js:699-776 placement
function hasDisplayUnsafeChar(n) {
  for (let t of n) if (isUnsafeDisplayChar(t, t.codePointAt(0) ?? 0)) return !0;
  return !1;
}
//@ chunk-qvp68pt5.js:776-813 placement
function M(n, t) {
  return isUnsafeDisplayChar(n, t) && !T(t);
}
//@ chunk-qvp68pt5.js:813-901 placement
function b(n, t) {
  let e = "";
  for (let r of n) e += t(r, r.codePointAt(0) ?? 0) ? "\uFFFD" : r;
  return e;
}
//@ chunk-qvp68pt5.js:901-1103 placement
function replaceUnsafeChars(n, t) {
  let list = Array.from(n),
    r = "";
  for (let o = 0; o < list.length; o++) {
    let i = list[o] ?? "";
    r += t(
      i,
      i.codePointAt(0) ?? 0,
      list[o - 1]?.codePointAt(0) ?? Number.NaN,
      list[o + 1]?.codePointAt(0) ?? Number.NaN,
    )
      ? "\uFFFD"
      : i;
  }
  return r;
}
/**
 * 去掉不安全显示字符。
 */
//@ chunk-qvp68pt5.js:1103-1136 placement
function stripUnsafeChars(n) {
  return stripNonPrintable(b(n, M));
}
//@ chunk-qvp68pt5.js:1136-1167 placement
function mat(n) {
  return h(E(n));
}
//@ chunk-qvp68pt5.js:1167-1199 placement
function E(n) {
  return stripNonPrintable(b(n, isUnsafeDisplayChar));
}
/**
 * 显示长度上限与主机名长度上限。
 */
//@ chunk-qvp68pt5.js:1199-1217 placement
var MAX_DISPLAY_UNITS = 2000,
  F = 253;
//@ chunk-qvp68pt5.js:1217-1283 placement
function Nur(n) {
  return F + (n.endsWith(".") && !n.endsWith("..") ? 1 : 0);
}
/**
 * 审批载荷序列化上限。
 */
//@ chunk-qvp68pt5.js:1283-1297 placement
var MAX_PAYLOAD_UNITS = 200000;
//@ chunk-qvp68pt5.js:1297-1335 placement
function D(n, t = MAX_DISPLAY_UNITS) {
  return truncateToLength(n, t) === n;
}
/**
 * 文本是否需要边栏显示（多行或过长）。
 */
//@ chunk-qvp68pt5.js:1335-1383 placement
function needsGutter(n) {
  return (
    n.includes(`
`) || bunStringWidth(n) > 80
  );
}
//@ chunk-qvp68pt5.js:1383-1465 placement
function pAn(n) {
  let t = truncateToLength(n, MAX_DISPLAY_UNITS),
    replaced = t.replace(/\t/g, " ");
  return t === n ? replaced : `${replaced}\u2026`;
}
//@ chunk-qvp68pt5.js:1465-1551 placement
function f(n) {
  return bunStringWidth(n.replace(/[\uFE0E\uFE0F\u180B-\u180F\u2800]/gu, "").trim()) > 0;
}
//@ chunk-qvp68pt5.js:1551-1613 placement
function p(n) {
  return Array.from(n)
    .filter((t) => C(t))
    .join("");
}
//@ chunk-qvp68pt5.js:1613-1686 placement
function C(n) {
  return bunStringWidth(n.replace(/[\uFE0E\uFE0F\u180B-\u180F]/gu, "")) > 0;
}
//@ chunk-qvp68pt5.js:1686-1705 placement
var I = 8,
  O = /\p{M}/u;
//@ chunk-qvp68pt5.js:1705-1745 placement
function Ons(n) {
  return O.test(n) || !C(n);
}
/**
 * 用替换字符标记残缺序列。
 */
//@ chunk-qvp68pt5.js:1745-1953 placement
function markBrokenSequences(n) {
  let t = "",
    e = 0,
    r = !1;
  for (let o of n) {
    if (
      o ===
      `
`
    ) {
      if (r) ((t += "\uFFFD"), (r = !1));
      ((t += o), (e = 0));
      continue;
    }
    if (!Ons(o)) {
      if (r) ((t += "\uFFFD"), (r = !1));
      ((t += o), (e = 0));
      continue;
    }
    if (e < I) {
      ((t += o), e++);
      continue;
    }
    r = !0;
  }
  return r ? `${t}\uFFFD` : t;
}
//@ chunk-qvp68pt5.js:1953-1984 placement
function h(n) {
  return stripNonPrintable(markBrokenSequences(n));
}
//@ chunk-qvp68pt5.js:1984-2120 placement
function trimToVisible(n) {
  let list = Array.from(n),
    e = 0,
    r = list.length;
  while (e < r && !f(list[e] ?? "")) e++;
  while (r > e && !f(list[r - 1] ?? "")) r--;
  return list.slice(e, r).join("");
}
//@ chunk-qvp68pt5.js:2120-2190 placement
function m(n, t) {
  let list = Array.from(trimToVisible(n));
  return t === "end" ? list.at(-1) : list[0];
}
//@ chunk-qvp68pt5.js:2190-2233 placement
function A(n) {
  return m(n, "end") === "\u2026";
}
/**
 * 去掉末尾的省略号（及其后的不可见字符），可连续多个。
 */
//@ chunk-qvp68pt5.js:2233-2403 placement
function stripTrailingEllipsis(n) {
  let list = Array.from(n),
    e = list.length;
  for (;;) {
    let r = e;
    while (r > 0 && !f(list[r - 1] ?? "")) r--;
    if (r > 0 && list[r - 1] === "\u2026") {
      e = r - 1;
      continue;
    }
    break;
  }
  return list.slice(0, e).join("");
}
/**
 * 文本是否干净（无替换字符）。
 */
//@ chunk-qvp68pt5.js:2403-2563 placement
function isCleanText(n) {
  let t = [],
    e = !1;
  for (let r of Array.from(n)) {
    if (
      r !==
        `
` &&
      !f(r)
    ) {
      e = !0;
      continue;
    }
    if (r === "\uFFFD" && e) {
      e = !1;
      continue;
    }
    ((e = !1), t.push(r));
  }
  return f(t.join(""));
}
//@ chunk-qvp68pt5.js:2563-2612 placement
function z(n) {
  return /^[A-Za-z_$][\w$]*$/.test(n);
}
//@ chunk-qvp68pt5.js:2612-2642 placement
function P5e(n) {
  return mat(n);
}
/**
 * 清洗用于显示的文本：变体选择符、零宽连接符、蒙古文变体选择符按上下文保留，其余不安全字符替换为 U+FFFD，再去掉不可打印字符。
 */
//@ chunk-qvp68pt5.js:2642-2832 placement
function sanitizeDisplayText(n) {
  return h(
    stripNonPrintable(
      replaceUnsafeChars(n, (t, e, r, o) => {
        if (e === 65038 || e === 65039) return !(r > 127 || o === 8419);
        if (e === 8204 || e === 8205) return !(r > 127 && o > 127);
        if (e >= 6155 && e <= 6159) return !(r > 127);
        return isUnsafeDisplayChar(t, e);
      }),
    ),
  );
}
/**
 * 是否有可见文本。
 */
//@ chunk-qvp68pt5.js:2832-2955 placement
function hasVisibleText(n) {
  if (n === void 0) return !1;
  let trimmed = mat(n)
    .replace(/\uFFFD/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return trimmed !== "" && bunStringWidth(trimmed) > 0;
}
/**
 * 短标签宽度与截断长度。
 */
//@ chunk-qvp68pt5.js:2955-2973 placement
var SHORT_LABEL_WIDTH = 48,
  HH = 256;
/**
 * 生成短标签。
 */
//@ chunk-qvp68pt5.js:2973-3076 placement
function shortLabel(n) {
  let t = P5e(truncateToLength(n, HH)),
    trimmed = t.replace(/\s+/g, " ").trim();
  return truncateToWidth(quoteIfAmbiguous(trimmed, t, n.length > HH), SHORT_LABEL_WIDTH);
}
/**
 * 值与原文相同且原文无引号、不含特殊字符时原样返回，否则返回 JSON 字符串形式。
 */
//@ chunk-qvp68pt5.js:3076-3176 placement
function quoteIfAmbiguous(n, t, e = !1) {
  let r = m(n, "start") === '"' || m(n, "end") === '"' || A(n);
  return n === t && !r && !e ? n : jsonStringify(t);
}
//@ chunk-qvp68pt5.js:3176-3269 placement
function N(n) {
  let t = P5e(truncateToLength(n, HH)),
    trimmed = t.replace(/\s+/g, " ").trim();
  return quoteIfAmbiguous(trimmed, t, n.length > HH);
}
/**
 * 是否在标签长度内。
 */
//@ chunk-qvp68pt5.js:3269-3305 placement
function fitsLabelLimit(n) {
  return truncateToLength(n, HH) === n;
}
/**
 * 为显示相同的标签消歧。
 */
//@ chunk-qvp68pt5.js:3305-3754 placement
function disambiguateLabels(n, t) {
  let e = new Map(),
    r = (s) => t(s).normalize("NFC");
  for (let s of n) {
    let a = r(s),
      u = e.get(a) ?? new Set();
    (u.add(s), e.set(a, u));
  }
  let o = (s) =>
      jsonStringify(truncateToLength(s, MAX_DISPLAY_UNITS)).replace(
        /[\u007f-\uffff]/g,
        (a) => `\\u${a.charCodeAt(0).toString(16).padStart(4, "0")}`,
      ) + (s.length > MAX_DISPLAY_UNITS ? "\u2026" : ""),
    i = new Map();
  return n.map((s) => {
    let a = r(s);
    if ((e.get(a)?.size ?? 0) <= 1) return t(s);
    let u = o(s),
      l = i.get(u) ?? new Map();
    i.set(u, l);
    let c = l.get(s) ?? l.size + 1;
    return (l.set(s, c), c > 1 ? `${u} (#${c})` : u);
  });
}
/**
 * 生成唯一的显示名。
 */
//@ chunk-qvp68pt5.js:3754-4102 placement
function uniqueDisplayNames(n) {
  let t = new Map();
  for (let i of n) t.set(i, z(i) ? i : jsonStringify(mat(i)));
  let e = new Map();
  for (let i of t.values()) e.set(i, (e.get(i) ?? 0) + 1);
  let r = findNfcCollisions(n),
    o = new Map();
  for (let i of n) {
    let s = t.get(i) ?? "",
      a = (e.get(s) ?? 0) > 1 || r.has(i.normalize("NFC"));
    o.set(
      i,
      a
        ? jsonStringify(i).replace(
            /[\u007f-\uffff]/g,
            (u) => `\\u${u.charCodeAt(0).toString(16).padStart(4, "0")}`,
          )
        : s,
    );
  }
  return o;
}
//@ chunk-qvp68pt5.js:4102-4247 placement = setCwdState (1)
function findNfcCollisions(cwd) {
  let t = new Map(),
    e = new Set();
  for (let r of cwd) {
    let normalized = r.normalize("NFC"),
      i = t.get(normalized);
    if (i !== void 0 && i !== r) e.add(normalized);
    else t.set(normalized, r);
  }
  return e;
}
/**
 * 标签或空串。
 */
//@ chunk-qvp68pt5.js:4247-4315 placement
function labelOrEmpty(n) {
  return typeof n === "string" && $Rt(n) ? "" : String(safeLabel(n));
}
/**
 * 安全的标签文本。
 */
//@ chunk-qvp68pt5.js:4315-4391 placement
function safeLabel(n) {
  let t = typeof n === "string" && !$Rt(n) ? n : y3e;
  return ple(shortLabel(t));
}
//@ chunk-qvp68pt5.js:4391-4439 placement
function $Rt(n) {
  return n === "" || bunStringWidth(truncateToLength(n, HH)) === 0;
}
//@ chunk-qvp68pt5.js:4439-4526 placement
function B(n) {
  return n
    .replace(/_+/g, " ")
    .trim()
    .replace(/\b\w/g, (t) => t.toUpperCase());
}
/**
 * MCP 服务器的显示标签。
 */
//@ chunk-qvp68pt5.js:4526-4848 placement
function mcpServerLabel(n) {
  let t = truncateToLength((n.scope === "claudeai" ? n.displayName : void 0) ?? "", HH),
    e = truncateToLength(n.title ?? "", HH),
    r = sanitizeDisplayText(truncateToLength(n.serverName, HH)),
    o = hasVisibleText(t) ? sanitizeDisplayText(t) : isCleanText(r) ? r : "(unnamed server)",
    i = truncateToLength(n.toolName, HH),
    s = P5e(B(i)),
    a = P5e(i),
    u = hasVisibleText(e)
      ? sanitizeDisplayText(e)
      : isCleanText(s)
        ? s
        : isCleanText(a)
          ? a
          : "(unnamed tool)";
  return ple(truncateToWidth(`${o} \u2014 ${u}`.replace(/\s+/g, " ").trim(), SHORT_LABEL_WIDTH));
}
//@ chunk-qvp68pt5.js:4848-4900 placement
function Uur(n) {
  return ple(labelOr(n, "(unnamed tool)"));
}
/**
 * 标签干净时用它，否则用回退值。
 */
//@ chunk-qvp68pt5.js:4900-4948 placement
function labelOr(n, t) {
  let e = shortLabel(n);
  return isCleanText(e) ? e : t;
}
/**
 * 审批显示字段（文本与是否需边栏）。
 */
//@ chunk-qvp68pt5.js:4948-5080 placement
function displayField(n) {
  if (typeof n !== "string") return { text: ple(""), needsGutter: !1 };
  let t = h(stripUnsafeChars(pAn(n)));
  return { text: ple(t), needsGutter: needsGutter(t) };
}
/**
 * 简单文本的显示形式（不安全时 null）。
 */
//@ chunk-qvp68pt5.js:5080-5230 placement
function plainDisplay(n) {
  if (typeof n !== "string") return null;
  if (!fitsLabelLimit(n) || n.trim() === "" || bunStringWidth(n) === 0) return null;
  if (markBrokenSequences(n) !== n) return null;
  return { display: ple(N(n)) };
}
//@ chunk-qvp68pt5.js:5230-5329 placement
var g = "(value cannot be shown in full \u2014 approval withheld; one-time options only)",
  U = 1e4,
  W = 64;
/**
 * 按预算序列化审批载荷值。
 */
//@ chunk-qvp68pt5.js:5329-7263 placement
function serializePayloadValue(n, t, e = 0) {
  if (typeof n === "string") {
    if (n.length + 2 > t.unitsRemaining) throw Error("payload exceeds the serialization budget");
    let i = jsonStringify(n);
    if (((t.unitsRemaining -= i.length), t.unitsRemaining < 0))
      throw Error("payload exceeds the serialization budget");
    return i;
  }
  if (typeof n === "number") {
    let i = Number.isFinite(n) ? String(n) : "null";
    if (((t.unitsRemaining -= i.length), t.unitsRemaining < 0))
      throw Error("payload exceeds the serialization budget");
    return i;
  }
  if (typeof n === "boolean" || n === null) {
    if (((t.unitsRemaining -= String(n).length), t.unitsRemaining < 0))
      throw Error("payload exceeds the serialization budget");
    return String(n);
  }
  if (typeof n === "bigint") throw Error("bigint payload cannot be serialized");
  if (typeof n !== "object") return;
  if (e >= W) throw Error("payload exceeds the serialization depth wall");
  if (Array.isArray(n)) {
    let i = n.length;
    if (typeof i !== "number" || !Number.isSafeInteger(i) || i < 0)
      throw Error("payload length is not an honest array length");
    if (((t.elementsRemaining -= i), t.elementsRemaining < 0))
      throw Error("payload exceeds the element serialization wall");
    if (((t.unitsRemaining -= 2 + (i > 0 ? i - 1 : 0)), t.unitsRemaining < 0))
      throw Error("payload exceeds the serialization budget");
    let s = [];
    for (let a = 0; a < i; a++) {
      let u = serializePayloadValue(n[a], t, e + 1);
      if (u === void 0) {
        if (((t.unitsRemaining -= 4), t.unitsRemaining < 0))
          throw Error("payload exceeds the serialization budget");
        s.push("null");
      } else s.push(u);
    }
    return `[${s.join(",")}]`;
  }
  let entries = Object.entries(n);
  if (((t.elementsRemaining -= entries.length), t.elementsRemaining < 0))
    throw Error("payload exceeds the element serialization wall");
  if (((t.unitsRemaining -= 2), t.unitsRemaining < 0))
    throw Error("payload exceeds the serialization budget");
  let o = [];
  for (let [i, s] of entries) {
    let a = serializePayloadValue(s, t, e + 1);
    if (a === void 0) continue;
    if (i.length + 2 > t.unitsRemaining) throw Error("payload exceeds the serialization budget");
    let u = jsonStringify(i);
    if (((t.unitsRemaining -= u.length + 1 + (o.length > 0 ? 1 : 0)), t.unitsRemaining < 0))
      throw Error("payload exceeds the serialization budget");
    o.push(`${u}:${a}`);
  }
  return `{${o.join(",")}}`;
}
//@ chunk-qvp68pt5.js:7263-7357 placement
function iZr(n, t = MAX_DISPLAY_UNITS, e = U) {
  try {
    return serializePayloadValue(n, { unitsRemaining: t, elementsRemaining: e });
  } catch {
    return;
  }
}
/**
 * 序列化审批载荷（完整/截断/隐藏）。
 */
//@ chunk-qvp68pt5.js:7357-7801 placement
function serializeApprovalPayload(n, t) {
  let e = typeof n === "string" ? n : iZr(n, t?.maxUnits);
  if (e === void 0) return { kind: "withheld", marker: ple(g) };
  if (!D(e, t?.maxUnits)) return { kind: "withheld", marker: ple(g) };
  let r = t?.softWrap ? wrapLongLines(e) : e,
    replaced = (t?.scrub === "key" ? E(r) : stripUnsafeChars(r)).replace(/\t/g, " "),
    i = t?.softWrap
      ? replaced.replaceAll(
          `
`,
          "",
        )
      : replaced;
  if (X1e.test(i)) return { kind: "withheld", marker: ple(g) };
  if (markBrokenSequences(replaced) !== replaced) return { kind: "withheld", marker: ple(g) };
  return { kind: "full", text: ple(replaced), needsGutter: needsGutter(replaced) };
}
/**
 * 文本是否含可疑字符。
 */
//@ chunk-qvp68pt5.js:7801-7853 placement
function hasSuspiciousText(n) {
  let t = stripUnsafeChars(n);
  return X1e.test(t) || k(t);
}
//@ chunk-qvp68pt5.js:7853-7885 placement
function ubi(n) {
  return k(stripUnsafeChars(n));
}
//@ chunk-qvp68pt5.js:7885-7916 placement
function k(n) {
  return markBrokenSequences(n) !== n;
}
/**
 * 列表类文本的标签。
 */
//@ chunk-qvp68pt5.js:7916-8142 placement
function listLabel(n) {
  let t = P5e(truncateToLength(n, HH)),
    trimmed = t.replace(/\s+/g, " ").trim();
  return quoteIfAmbiguous(
    trimmed,
    t,
    trimmed.includes(",") ||
      trimmed.includes(";") ||
      p(trimmed).includes(" and ") ||
      p(trimmed).startsWith("and ") ||
      p(trimmed).endsWith(" and") ||
      n.length > HH ||
      markBrokenSequences(truncateToLength(n, HH)) !== truncateToLength(n, HH),
  );
}
/**
 * 消歧后的标签列表。
 */
//@ chunk-qvp68pt5.js:8142-8194 placement
function uniqueLabels(n, t = N) {
  return disambiguateLabels(n, t).map((e) => ple(e));
}
/**
 * 把换行替换为替换字符。
 */
//@ chunk-qvp68pt5.js:8194-8258 placement
function replaceLineBreaks(n) {
  return n.replace(/[\n\r\u2028\u2029]/g, "\uFFFD");
}
/**
 * 序列化审批列表。
 */
//@ chunk-qvp68pt5.js:8258-8645 placement
function serializeApprovalList(n, t) {
  let mapped = n.map((l) => serializeApprovalPayload(l, t)),
    r = new Map();
  n.forEach((l, c) => {
    let y = mapped[c];
    if (y.kind === "full" && !r.has(l)) r.set(l, replaceLineBreaks(y.text).replace(/\s+/g, " ").trim());
  });
  let filtered = n.filter((l, c) => mapped[c].kind === "full"),
    i = uniqueLabels(filtered, (l) => r.get(l) ?? ""),
    s = [],
    a = 0,
    u = 0;
  for (let l of mapped)
    if (l.kind === "full") s.push({ text: String(i[a++]), withheld: !1 });
    else ((u += 1), s.push({ text: `${l.marker} (#${u})`, withheld: !0 }));
  return s;
}
/**
 * 显示文本。
 */
//@ chunk-qvp68pt5.js:8645-8717 placement
function displayText(n) {
  if (typeof n !== "string") return Yls("");
  return Yls(stripUnsafeChars(n));
}
/**
 * 把字符串转为审批界面标签：清洗、制表符换空格、首行须干净且无歧义，再截断到 24 字符。
 */
//@ chunk-qvp68pt5.js:8717-8880 placement
function toApprovalLabel(n) {
  if (typeof n !== "string") return null;
  let replaced = sanitizeDisplayText(truncateToLength(n, HH)).replace(/\t/g, " ");
  if (!isCleanText(getFirstLine(replaced))) return null;
  if (A(getFirstLine(replaced))) return null;
  return ple(truncate(replaced, 24, !0));
}
/**
 * 模板标签函数：拼接模板片段与插值（空值视为空串）后做规整。
 */
//@ chunk-qvp68pt5.js:8880-8983 placement
function approvalLabelTemplate(n, ...t) {
  let e = n[0] ?? "";
  for (let r = 0; r < t.length; r++) ((e += t[r] ?? ""), (e += n[r + 1] ?? ""));
  return ple(e);
}

export {
  fitsLabelLimit,
  hasDisplayUnsafeChar,
  listLabel,
  disambiguateLabels,
  uniqueLabels,
  needsGutter,
  displayField,
  markBrokenSequences,
  uniqueDisplayNames,
  stripUnsafeChars,
  hasVisibleText,
  SHORT_LABEL_WIDTH,
  serializeApprovalPayload,
  replaceLineBreaks,
  toApprovalLabel,
  mat,
  P5e,
  isCleanText,
  stripTrailingEllipsis,
  labelOr,
  labelOrEmpty,
  MAX_PAYLOAD_UNITS,
  Nur,
  plainDisplay,
  $Rt,
  safeLabel,
  hasSuspiciousText,
  displayText,
  HH,
  quoteIfAmbiguous,
  approvalLabelTemplate,
  iZr,
  Uur,
  sanitizeDisplayText,
  Ons,
  MAX_DISPLAY_UNITS,
  pAn,
  shortLabel,
  mcpServerLabel,
  serializeApprovalList,
  ubi,
};
