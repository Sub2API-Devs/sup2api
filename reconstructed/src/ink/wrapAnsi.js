/**
 * ink/wrapAnsi.ts
 *
 * 沿用旧版路径：ANSI 文本换行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/wrapAnsi.ts
 * pieces: chunk-tw8fk0yz.js (32)
 * attribution: placement 32
 */
import { C0 } from "./termio/ansi.js";
import { bunStringWidth } from "./stringWidth.js";
import { createTokenizer, tokenizeAll } from "./termio/tokenize.js";
import { Yn } from "../utils/stripAnsi.js";
import { getGraphemeSegmenter } from "../utils/intl.js";

/**
 * 判断一段转义序列是否已结束（按 ESC 后的引导字符与终止字符）。
 */
//@ chunk-tw8fk0yz.js:3673-3990 placement
function isCompleteEscapeSequence(e, n, s) {
  let r = e[s],
    t = s - n;
  if (t === 0) return r === "G";
  if (t === 1) return r === "i" || r === "O" || r === "E";
  let u = e[n + 1];
  if (u === "i") return t > 2 || r === "=";
  let code = e.charCodeAt(s),
    l = code === C0.ESC || code === C0.BEL;
  if (u === "O") return t === 2 ? r === "K" : l;
  let index = e.indexOf(":", n + 3);
  if (index !== -1 && index < s) return !0;
  return (r >= "A" && r <= "Z") || (t > 2 && (r === ":" || l));
}
/**
 * 换行相关常量与正则：制表宽度、制表/换行、ESC/CSI、C1 控制字符、DCS/OSC 等字符串序列。
 */
//@ chunk-tw8fk0yz.js:3990-4137 placement
var DEFAULT_TAB_WIDTH = 8,
  TAB_OR_NEWLINE_RE = /(\t|\n)/,
  ESC_OR_CSI_RE = /[\x1b\x9b]/g,
  C1_STRING_START_RE = /[\x90\x98\x9d-\x9f]/g,
  CONTROL_INTRODUCER_RE = /[\x1b\x90\x98\x9b\x9d-\x9f]/,
  STRING_SEQUENCE_START_RE = /^\x1b[P\]X^_k]/,
  TERMINATED_STRING_SEQUENCE_RE = /^\x1b[P_].*\x07$|\x9c/s;
//@ chunk-tw8fk0yz.js:4137-4215 placement
function Che(e, n = DEFAULT_TAB_WIDTH) {
  return e.includes("\t") || hasExpandableControls([e]) ? expandTabs([e], n).join("") : e;
}
/**
 * 把每段文本中的制表符按列位置展开为空格（跨段累计列位置，跳过转义序列）。
 */
//@ chunk-tw8fk0yz.js:4215-4618 placement
function expandTabs(e, n = DEFAULT_TAB_WIDTH) {
  let s = 0,
    r = "";
  return e.map((t, u) => {
    if (!nje(t) && !t.includes("\t")) {
      let l =
        t.lastIndexOf(`
`) + 1;
      if (l > 0) ((s = 0), (r = ""));
      return ((r += l > 0 ? t.slice(l) : t), t);
    }
    let o = "";
    for (let l of tokenizeForTabs(t, u === e.length - 1)) {
      let d = neutralizeStringSequence(l);
      if (d === void 0) {
        ((o += l.value), (r += l.value));
        continue;
      }
      for (let a of d.split(TAB_OR_NEWLINE_RE))
        if (a === "\t") {
          s += bunStringWidth(r);
          let c = n - (s % n);
          ((o += " ".repeat(c)), (s += c), (r = ""));
        } else if (
          a ===
          `
`
        )
          ((o += a), (s = 0), (r = ""));
        else ((o += a), (r += a));
    }
    return o;
  });
}
//@ chunk-tw8fk0yz.js:4618-4652 placement
function nje(e) {
  return CONTROL_INTRODUCER_RE.test(e);
}
/**
 * 文本中是否有需要中和的控制序列。
 */
//@ chunk-tw8fk0yz.js:4652-4757 placement
function hasExpandableControls(e) {
  return e.some(
    (n, s) =>
      nje(n) &&
      tokenizeForTabs(n, s === e.length - 1).some(
        (r) => (neutralizeStringSequence(r) ?? r.value) !== r.value,
      ),
  );
}
/**
 * 用 termio 分词器切分文本；末段未完结的序列按是否最后一段决定当序列还是文本。
 */
//@ chunk-tw8fk0yz.js:4757-5032 placement
function tokenizeForTabs(e, n) {
  if (!nje(e)) return [{ type: "text", value: e }];
  let s = createTokenizer(),
    feed = s.feed(e);
  for (let [u, o] of feed.entries())
    if (o.type === "sequence" && o.value === "\x1B") feed[u] = { type: "text", value: o.value };
  let buffer = s.buffer();
  if (buffer !== "")
    feed.push({ type: n && !STRING_SEQUENCE_START_RE.test(buffer) ? "sequence" : "text", value: buffer });
  return feed;
}
/**
 * 文本或含换行/不完整的字符串序列中，把 ESC/CSI 换成 CAN 使其失效；普通序列返回 undefined。
 */
//@ chunk-tw8fk0yz.js:5032-5244 placement
function neutralizeStringSequence(e) {
  if (
    e.type === "text" ||
    e.value.includes(`
`) ||
    TERMINATED_STRING_SEQUENCE_RE.test(e.value)
  )
    return ae(e.value.replace(ESC_OR_CSI_RE, "\x18"));
  if (e.value.startsWith("\x1Bk")) return ae(`\x18${e.value.slice(2).replace(/\x9b/g, "\x18")}`);
  return;
}
//@ chunk-tw8fk0yz.js:5244-5289 placement
function ae(e) {
  return e.replace(C1_STRING_START_RE, "\uFFFD");
}
//@ chunk-tw8fk0yz.js:5289-5324 placement
var W8e = (e) => `\\x1b\\[[0-9${e}]*m`;
/**
 * 换行功能的特性读取器与锁存登记（返回旧值）。
 */
//@ chunk-tw8fk0yz.js:5324-5480 placement
class WrapFeatureRegistry {
  reader = null;
  latches = null;
  registerReader(e) {
    let reader = this.reader;
    return ((this.reader = e), reader);
  }
  registerLatches(e) {
    let latches = this.latches;
    return ((this.latches = e), latches);
  }
}
//@ chunk-tw8fk0yz.js:5480-5493 placement
var X = new WrapFeatureRegistry();
//@ chunk-tw8fk0yz.js:5493-5536 placement
function SOi(e) {
  return X.registerReader(e);
}
//@ chunk-tw8fk0yz.js:5536-5580 placement
function wOi(e) {
  return X.registerLatches(e);
}
/**
 * 读 tengu_frolicking_nest 决定是否启用硬换行适配（锁存一次，读取失败默认开启）。
 */
//@ chunk-tw8fk0yz.js:5580-5843 placement
function isWrapFitEnabled() {
  let e, n;
  try {
    let { reader: reader, latches: latches } = X;
    if (!reader || !latches) return !0;
    if (((e = latches()), e.wrapFitEnabled !== void 0)) return e.wrapFitEnabled;
    n = reader("tengu_frolicking_nest", !0);
  } catch {
    return !0;
  }
  if (n.source !== "payload" || !n.defaultHost) return !0;
  return (e.wrapFitEnabled = n.value !== !1);
}
//@ chunk-tw8fk0yz.js:5843-6187 placement
var regExp = new RegExp(W8e(";:"), "g"),
  de = /\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/y,
  regExp_2 = new RegExp(`\\r((?:${W8e(";:")})+)\\n`, "g"),
  V = [22, 22, 23, 23, 24, 25, 27, 28, 29, 39, 49, 54, 55, 75],
  De = /^\x1b\[[34]8;(?:5;\d+|2;\d+;\d+;\d+)m$/,
  ee = 9,
  te = 10,
  be = new Map([
    [1, 0],
    [2, 1],
    [3, 2],
    [20, 3],
    [4, 4],
    [21, 4],
    [5, 5],
    [6, 5],
    [7, 6],
    [8, 7],
    [9, 8],
    [51, 11],
    [52, 11],
    [53, 12],
    [73, 13],
    [74, 13],
  ]);
//@ chunk-tw8fk0yz.js:6187-8076 placement
function wrapAnsi(e, n, s) {
  if (!(n > 0)) return e;
  if (!e.includes("\x1B[")) return wrapAnsiLine(e, n, s);
  let replaced = e.replace(regExp, "");
  if (replaced.length < e.length && replaced.includes("\x1B") && Yn(replaced) !== Yn(e))
    return wrapAnsiLine(
      e.replace(
        regExp_2,
        `$1\r
`,
      ),
      n,
      s,
    );
  let t = wrapAnsiLine(replaced, n, s);
  if (
    t === replaced &&
    !t.includes(`
`)
  )
    return e;
  let match = e.match(regExp);
  if (match === null) return t;
  let parts = e.split(regExp),
    l = [];
  for (let S = 0, D = 0; S < match.length; S++) l.push((D += parts[S].length));
  let d = bys(),
    a = [],
    c = 0,
    i = 0,
    g = "",
    p = "",
    A = !0,
    b = !1,
    f = !0,
    T = 0,
    I = 0,
    x = 0,
    R = -1,
    v = -1,
    M = -1,
    H = [],
    G = [],
    m = [],
    y = [],
    P = [],
    w = [],
    U = [];
  for (;;) {
    let S = scanLeadingControls(replaced, T, y, P),
      D = scanLeadingControls(t, x, H, G),
      L = y[S],
      B = H[D];
    for (let h = 0; h < S; h++) w[h] = -1;
    let N = S - 1,
      _ = 0;
    for (let h = D - 1; h >= -1 && f; h--) {
      let E = h < 0 ? -1 : G[h];
      if (E === 10 || typeof E === "string") {
        m[_++] = h;
        continue;
      }
      let C = N;
      while (C >= 0 && P[C] !== E) C--;
      f = h < 0 || C >= 0;
      for (let q = 0; N > C; N--) {
        let z = P[N],
          F = z === 10 || typeof z === "string" ? q : _;
        while (F < _ && G[m[F]] !== z) F++;
        if (F < _) ((w[N] = m[F]), (q = F + 1));
      }
      if (C >= 0) ((w[C] = h), (N = C - 1));
      _ = 0;
    }
    if (!f) break;
    let K = c,
      W = c - 1;
    for (let h = 0; l[W + 1] <= L;) {
      let E = l[++W];
      while (h < S && (y[h] < E || w[h] < 0)) h++;
      U[W - K] = E <= T ? 0 : h < S ? w[h] : D;
    }
    for (let h = 0; h <= D; h++) {
      let E = H[h],
        C = c <= W && U[c - K] <= h,
        q = h < D && G[h] === 10;
      if (b && (C || (h < D && !q))) {
        if (((b = !1), p !== "")) (a.push(t.slice(I, E), p), (I = E), (A = !0));
      }
      if (C) {
        (a.push(t.slice(I, E)), (I = E));
        while (c <= W && U[c - K] <= h) a.push(match[c++]);
        A = !0;
      }
      if (q) {
        if (i < c) {
          while (i < c) applySgrToState(match[i++], d);
          ((g = ""), (p = ""));
          let z = 0;
          for (let F = 0; F < d.length; F++) {
            if (d[F] === "") continue;
            if (((p += `\x1B[${d[F]}m`), V[F] !== z)) ((z = V[F]), (g = `\x1B[${z}m${g}`));
          }
        }
        if (A && g !== "") (a.push(t.slice(I, E), g), (I = E));
        ((A = !1), (b = !0));
      }
    }
    if (((T = L), (x = B), x >= t.length)) {
      f = T >= replaced.length;
      break;
    }
    if (b) {
      if (((b = !1), p !== "")) (a.push(t.slice(I, x), p), (I = x), (A = !0));
    }
    if (R < x)
      ((R = t.indexOf(
        `
`,
        x,
      )),
        (R = R === -1 ? t.length : R));
    if (v < x) ((v = t.indexOf("\x1B", x)), (v = v === -1 ? t.length : v));
    if (M < T) ((M = replaced.indexOf("\x1B", T)), (M = M === -1 ? replaced.length : M));
    let min = Math.min(R - x, v - x, M - T, c < l.length ? l[c] - T : t.length);
    while (min > 0 && xe(t.charCodeAt(x + min - 1))) min--;
    if (min < 1 || !replaced.startsWith(t.slice(x, x + min), T)) {
      if (((min = 1), t.charCodeAt(x) !== replaced.charCodeAt(T))) {
        f = !1;
        break;
      }
    }
    ((T += min), (x += min));
  }
  if (!f) return wrapAnsiLine(e, n, s);
  return (a.push(t.slice(I)), a.join(""));
}
/**
 * 从位置 n 开始扫描连续的转义序列/控制字符，记录各自位置与代码。
 */
//@ chunk-tw8fk0yz.js:8076-8325 placement
function scanLeadingControls(e, n, s, r) {
  let t = 0,
    u = n;
  for (; ; t++) {
    let code = e.charCodeAt(u);
    de.lastIndex = u;
    let l = code === 27 ? de.exec(e) : null;
    if (l === null && !xe(code)) break;
    ((s[t] = u),
      (r[t] = l !== null ? l[0] : code === 13 ? 10 : code),
      (u += l !== null ? l[0].length : code === 13 && e.charCodeAt(u + 1) === 10 ? 2 : 1));
  }
  return ((s[t] = u), t);
}
//@ chunk-tw8fk0yz.js:8325-8367 placement
function xe(e) {
  return e === 32 || (e >= 9 && e <= 13);
}
//@ chunk-tw8fk0yz.js:8367-8403 placement
function bys() {
  return V.map(() => "");
}
/**
 * 把一个 SGR 序列应用到样式状态数组（前景/背景色、256/真彩色、下划线样式、复位）。
 */
//@ chunk-tw8fk0yz.js:8403-9049 placement
function applySgrToState(e, n) {
  if (!e.endsWith("m")) return;
  if (De.test(e)) {
    n[e.charCodeAt(2) === 51 ? ee : te] = e.slice(2, -1);
    return;
  }
  let s = e.length === 5 ? e.charCodeAt(2) - 48 : 0,
    r = e.charCodeAt(e.length - 2) - 48;
  if ((e.length === 4 || e.length === 5) && s >= 0 && s <= 9 && r >= 0 && r <= 9) {
    applySgrCode(s * 10 + r, n);
    return;
  }
  let parts = e.slice(2, -1).split(";");
  for (let u = 0; u < parts.length; u++) {
    let o = parts[u],
      l = o === "" ? 0 : parseInt(o, 10);
    if (l === 38 || l === 48 || l === 58) {
      let d = parseInt(parts[u + 1] ?? "", 10),
        a = o.includes(":") ? 1 : d === 5 ? 3 : d === 2 ? 5 : 1;
      if (l !== 58 && (a > 1 || o.includes(":"))) {
        if (u + a <= parts.length) n[l === 38 ? ee : te] = parts.slice(u, u + a).join(";");
      }
      u += a - 1;
    } else if (l === 4 && o.includes(":")) n[be.get(4)] = o === "4:0" ? "" : /^4:[1-5]$/.test(o) ? o : "4";
    else applySgrCode(l, n);
  }
}
/**
 * 应用单个 SGR 参数：颜色、属性开关或全部复位。
 */
//@ chunk-tw8fk0yz.js:9049-9250 placement
function applySgrCode(e, n) {
  let s =
    (e >= 30 && e <= 37) || (e >= 90 && e <= 97)
      ? ee
      : (e >= 40 && e <= 47) || (e >= 100 && e <= 107)
        ? te
        : be.get(e);
  if (s !== void 0) n[s] = String(e);
  else if (e === 0) n.fill("");
  else for (let r = 0; r < n.length; r++) if (V[r] === e) n[r] = "";
}
/**
 * 占位字符与正则：用私用区字符替换宽度异常的字素。
 */
//@ chunk-tw8fk0yz.js:9250-9687 placement
var WIDE_PLACEHOLDER_1 = "\uDB80\uDC00",
  WIDE_PLACEHOLDER_2 = "\uD87E\uDE1D",
  ne = /[\u{F0000}\u{2FA1D}]/gu,
  Se = /^\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x00-\x1f\x7f-\x9f]*(?:\x07|\x1b\\))$/,
  regExp_3 = new RegExp(`^(?:${W8e(";:")}$|\\x1b\\]8;)`),
  Y =
    /[^\x00-\u02FF\u0370-\u0482\u048A-\u052F\u2000-\u200B\u2010-\u205F\u2070-\u20CF\u2100-\u2BFF\u2E80-\u3029\u3030-\u3098\u309B-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFF01-\uFF9D\uFFE0-\uFFEE\u{1f000}-\u{1f1e5}\u{1f200}-\u{1f3fa}\u{1f400}-\u{1faff}]/gu;
//@ chunk-tw8fk0yz.js:9687-11425 placement
function wrapAnsiLine(e, n, s, r = !0) {
  if (e.search(Y) === -1) return Bun.wrapAnsi(e, n, s);
  let t = "",
    u = [],
    o = [];
  for (let m of tokenizeAll(e))
    if (m.type === "sequence") (u.push(m.value), o.push(t.length));
    else t += m.value;
  let l = { starts: [], ends: [], handedAs: [], restoredAs: [] },
    d = getGraphemeSegmenter(),
    a = 0,
    c = !1,
    i;
  Y.lastIndex = 0;
  while ((i = Y.exec(t)) !== null) {
    let index = i.index;
    while (index > 0 && !he(t.charCodeAt(index - 1))) index--;
    let index_2 = i.index;
    while (index_2 < t.length && !he(t.charCodeAt(index_2))) index_2++;
    Y.lastIndex = index_2;
    let sliced = t.slice(index, index_2);
    while (a < o.length && o[a] < index) a++;
    let w = a,
      U = !nje(sliced);
    while (w < o.length && o[w] <= index_2) ((U = Se.test(u[w]) && U), w++);
    if (!U && w > a) {
      let S = index;
      for (; a < o.length && o[a] < index_2; a++)
        if (o[a] > S) (markWidthMismatchGraphemes(t, S, o[a], l), (S = o[a]));
      markWidthMismatchGraphemes(t, S, index_2, l);
      continue;
    }
    for (let { segment: segment, index: index_2 } of d.segment(sliced)) {
      if (segment.length === 1) continue;
      let L = index + index_2,
        B = L + segment.length,
        N = placeholderForGrapheme(segment);
      while (a < o.length && o[a] <= L) a++;
      let _ = a;
      while (_ < o.length && o[_] < B) _++;
      if (_ === a) {
        if (N !== "") re(l, L, B, N, segment);
        continue;
      }
      if (N === "" || bunStringWidth(t.slice(L, o[a])) === 0) {
        for (let h = a; h <= _; h++) {
          let E = h === a ? L : o[h - 1],
            C = h === _ ? B : o[h];
          markWidthMismatchGraphemes(t, E, C, l);
        }
        continue;
      }
      let K = N,
        W = "",
        k = L;
      for (let h = a; h < _; h++) {
        let E = u[h];
        if (((W += t.slice(k, o[h])), (k = o[h]), r && regExp_3.test(E))) ((K += E), (c = !0));
        else W += E;
      }
      re(l, L, B, K, W + t.slice(k, B));
    }
  }
  let { starts: starts, ends: ends, handedAs: handedAs, restoredAs: restoredAs } = l;
  if (starts.length === 0) return hardWrapPreservingSequences(Bun.wrapAnsi(e, n, s), e, n, s);
  let f = [],
    T = [],
    I = e.search(ne) !== -1,
    x = 0,
    R = 0;
  for (let m = 0; m <= starts.length; m++) {
    let y = m < starts.length ? starts[m] : t.length;
    for (; R < u.length && o[R] <= y; R++) {
      let sliced = t.slice(x, o[R]);
      (me(T, f, sliced, I), T.push(u[R]), (x = o[R]));
    }
    let sliced = t.slice(x, y);
    if ((me(T, f, sliced, I), m === starts.length)) break;
    (T.push(handedAs[m]), f.push(restoredAs[m]), (x = ends[m]));
    while (R < u.length && o[R] < x) R++;
  }
  let joined = T.join("");
  if (c && joined.split(Te).every((m) => bunStringWidth(m) <= n)) return wrapAnsiLine(e, n, s, !1);
  let wrapAnsi = Bun.wrapAnsi(joined, n, s);
  if (wrapAnsi === joined) return hardWrapPreservingSequences(e, e, n, s);
  let H = 0,
    G = "";
  for (let m of tokenizeAll(wrapAnsi))
    G += m.type === "sequence" ? m.value : m.value.replace(ne, (y) => f[H++] ?? y);
  return hardWrapPreservingSequences(G, e, n, s);
}
/**
 * 硬换行时若有行超宽，按段检查控制序列是否安全，再逐行强制折断。
 */
//@ chunk-tw8fk0yz.js:11425-11849 placement
function hardWrapPreservingSequences(e, n, s, r) {
  if (!r?.hard || s < 1) return e;
  let parts = e.split(`
`);
  if (parts.every((d) => bunStringWidth(d) <= s) || !isWrapFitEnabled()) return e;
  let parts_2 = n.split(Te),
    o = [];
  for (let d of parts_2) {
    let a = !0;
    for (let c of tokenizeAll(d))
      if (c.type === "sequence" ? !Se.test(c.value) : nje(c.value)) {
        a = !1;
        break;
      }
    o.push(a);
  }
  if (!o.includes(!0)) return e;
  if (o.includes(!1))
    return parts_2.map((d) => wrapAnsiLine(d, s, r)).join(`
`);
  let l = [];
  for (let d of parts) {
    if (bunStringWidth(d) <= s) {
      l.push(d);
      continue;
    }
    breakLineByGraphemes(d, s, !1, l);
  }
  return l.join(`
`);
}
/**
 * 按字素宽度把一行强制折成不超过 n 列的多行（转义序列不计宽，超宽字素拆开）。
 */
//@ chunk-tw8fk0yz.js:11849-12250 placement
function breakLineByGraphemes(e, n, s, r) {
  let t = "",
    u = 0,
    o = () => {
      if (!s && bunStringWidth(t) > n) breakLineByGraphemes(t, n, !0, r);
      else r.push(t);
      ((t = ""), (u = 0));
    },
    l = (d, a) => {
      if (u > 0 && a > 0 && u + a > n) o();
      ((t += d), (u += a));
    };
  for (let d of tokenizeAll(e)) {
    if (d.type === "sequence") {
      t += d.value;
      continue;
    }
    for (let { segment: segment } of getGraphemeSegmenter().segment(d.value)) {
      let c = bunStringWidth(segment);
      if (c > n && c > 2)
        for (let i of segment) {
          let g = bunStringWidth(i);
          l(i, s ? Math.max(g, 1) : g);
        }
      else if (s) {
        let i = 0;
        for (let g of segment) i += Math.max(bunStringWidth(g), 1);
        l(segment, i);
      } else l(segment, c);
    }
  }
  o();
}
//@ chunk-tw8fk0yz.js:12250-12287 placement
function he(e) {
  return e === 10 || e === 13;
}
//@ chunk-tw8fk0yz.js:12287-12305 placement
var Te = /\r\n?|\n/;
//@ chunk-tw8fk0yz.js:12305-12400 placement
function re(e, n, s, r, t) {
  (e.starts.push(n), e.ends.push(s), e.handedAs.push(r), e.restoredAs.push(t));
}
/**
 * 找出宽度与码元数不一致的字素并登记替换。
 */
//@ chunk-tw8fk0yz.js:12400-12562 placement
function markWidthMismatchGraphemes(e, n, s, r) {
  let sliced = e.slice(n, s);
  if (sliced.search(Y) === -1) return;
  for (let { segment: segment, index: index } of getGraphemeSegmenter().segment(sliced)) {
    let l = placeholderForGrapheme(segment);
    if (l !== "") re(r, n + index, n + index + segment.length, l, segment);
  }
}
/**
 * 多码点字素按显示宽度选 1 或 2 宽的占位字符。
 */
//@ chunk-tw8fk0yz.js:12562-12674 placement
function placeholderForGrapheme(e) {
  let n = e.codePointAt(0) > 65535 ? 2 : 1;
  if (e.length <= n) return "";
  let s = bunStringWidth(e);
  return s === 1 ? WIDE_PLACEHOLDER_1 : s === 2 ? WIDE_PLACEHOLDER_2 : "";
}
//@ chunk-tw8fk0yz.js:12674-12766 placement
function me(e, n, s, r) {
  if (s === "") return;
  if (r) for (let t of s.match(ne) ?? []) n.push(t);
  e.push(s);
}

export {
  wrapAnsi,
  Che,
  hasExpandableControls,
  expandTabs,
  nje,
  DEFAULT_TAB_WIDTH,
  SOi,
  wOi,
  W8e,
  bys,
  applySgrToState,
  isCompleteEscapeSequence,
};
