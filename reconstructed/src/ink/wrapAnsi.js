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
import { stripAnsi } from "../utils/stripAnsi.js";
import { getGraphemeSegmenter } from "../utils/intl.js";

//@ chunk-tw8fk0yz.js:3673-3990 placement
/**
 * 判断一段转义序列是否已结束（按 ESC 后的引导字符与终止字符）。
 */
function isCompleteEscapeSequence(e, n, s) {
  let r = e[s];
  let t = s - n;
  if (t === 0) return r === "G";
  if (t === 1) return r === "i" || r === "O" || r === "E";
  let u = e[n + 1];
  if (u === "i") return t > 2 || r === "=";
  let code = e.charCodeAt(s);
  let l = code === C0.ESC || code === C0.BEL;
  if (u === "O") return t === 2 ? r === "K" : l;
  let index = e.indexOf(":", n + 3);
  if (index !== -1 && index < s) return true;
  return (r >= "A" && r <= "Z") || (t > 2 && (r === ":" || l));
}
//@ chunk-tw8fk0yz.js:3990-4137 placement
/**
 * 换行相关常量与正则：制表宽度、制表/换行、ESC/CSI、C1 控制字符、DCS/OSC 等字符串序列。
 */
var DEFAULT_TAB_WIDTH = 8;
var TAB_OR_NEWLINE_RE = /(\t|\n)/;
var ESC_OR_CSI_RE = /[\x1b\x9b]/g;
var C1_STRING_START_RE = /[\x90\x98\x9d-\x9f]/g;
var CONTROL_INTRODUCER_RE = /[\x1b\x90\x98\x9b\x9d-\x9f]/;
var STRING_SEQUENCE_START_RE = /^\x1b[P\]X^_k]/;
var TERMINATED_STRING_SEQUENCE_RE = /^\x1b[P_].*\x07$|\x9c/s;
//@ chunk-tw8fk0yz.js:4137-4215 placement
/**
 * 若文本含制表符或可展开控制字符，按列位置展开为空格（跳过转义序列）。
 */
function expandTabsInText(e, n = DEFAULT_TAB_WIDTH) {
  return e.includes("\t") || hasExpandableControls([e]) ? expandTabs([e], n).join("") : e;
}
//@ chunk-tw8fk0yz.js:4215-4618 placement
/**
 * 把每段文本中的制表符按列位置展开为空格（跨段累计列位置，跳过转义序列）。
 */
function expandTabs(e, n = DEFAULT_TAB_WIDTH) {
  let s = 0;
  let r = "";
  return e.map((t, u) => {
    if (!hasControlSequences(t) && !t.includes("\t")) {
      let l =
        t.lastIndexOf(`
`) + 1;
      if (l > 0) {
        s = 0;
        r = "";
      }
      r += l > 0 ? t.slice(l) : t;
      return t;
    }
    let o = "";
    for (let l of tokenizeForTabs(t, u === e.length - 1)) {
      let d = neutralizeStringSequence(l);
      if (d === undefined) {
        o += l.value;
        r += l.value;
        continue;
      }
      for (let a of d.split(TAB_OR_NEWLINE_RE))
        if (a === "\t") {
          s += bunStringWidth(r);
          let c = n - (s % n);
          o += " ".repeat(c);
          s += c;
          r = "";
        } else if (
          a ===
          `
`
        ) {
          o += a;
          s = 0;
          r = "";
        } else {
          o += a;
          r += a;
        }
    }
    return o;
  });
}
//@ chunk-tw8fk0yz.js:4618-4652 placement
/**
 * 判断文本是否含需要中和的 ESC/C1 控制序列。
 */
function hasControlSequences(e) {
  return CONTROL_INTRODUCER_RE.test(e);
}
//@ chunk-tw8fk0yz.js:4652-4757 placement
/**
 * 文本中是否有需要中和的控制序列。
 */
function hasExpandableControls(e) {
  return e.some(
    (n, s) =>
      hasControlSequences(n) &&
      tokenizeForTabs(n, s === e.length - 1).some(
        (r) => (neutralizeStringSequence(r) ?? r.value) !== r.value,
      ),
  );
}
//@ chunk-tw8fk0yz.js:4757-5032 placement
/**
 * 用 termio 分词器切分文本；末段未完结的序列按是否最后一段决定当序列还是文本。
 */
function tokenizeForTabs(e, n) {
  if (!hasControlSequences(e))
    return [
      {
        type: "text",
        value: e,
      },
    ];
  let tokenizer = createTokenizer();
  let r = tokenizer.feed(e);
  for (let [u, o] of r.entries())
    if (o.type === "sequence" && o.value === "\x1B")
      r[u] = {
        type: "text",
        value: o.value,
      };
  let t = tokenizer.buffer();
  if (t !== "")
    r.push({
      type: n && !STRING_SEQUENCE_START_RE.test(t) ? "sequence" : "text",
      value: t,
    });
  return r;
}
//@ chunk-tw8fk0yz.js:5032-5244 placement
/**
 * 文本或含换行/不完整的字符串序列中，把 ESC/CSI 换成 CAN 使其失效；普通序列返回 undefined。
 */
function neutralizeStringSequence(e) {
  if (
    e.type === "text" ||
    e.value.includes(`
`) ||
    TERMINATED_STRING_SEQUENCE_RE.test(e.value)
  )
    return neutralizeC1Starts(e.value.replace(ESC_OR_CSI_RE, "\x18"));
  if (e.value.startsWith("\x1Bk"))
    return neutralizeC1Starts(`\x18${e.value.slice(2).replace(/\x9b/g, "\x18")}`);
  return;
}
//@ chunk-tw8fk0yz.js:5244-5289 placement
/**
 * 把 C1 字符串起始符替换为替换字符
 */
function neutralizeC1Starts(e) {
  return e.replace(C1_STRING_START_RE, "\uFFFD");
}
//@ chunk-tw8fk0yz.js:5289-5324 placement
/**
 * 按给定的附加参数字符生成 `\x1b[...m` 的 SGR 正则片段。
 */
var sgrPatternSource = (e) => `\\x1b\\[[0-9${e}]*m`;
//@ chunk-tw8fk0yz.js:5324-5480 placement
/**
 * 换行功能的特性读取器与锁存登记（返回旧值）。
 */
class WrapFeatureRegistry {
  reader = null;
  latches = null;
  registerReader(reader) {
    let reader_2 = this.reader;
    this.reader = reader;
    return reader_2;
  }
  registerLatches(latches) {
    let latches_2 = this.latches;
    this.latches = latches;
    return latches_2;
  }
}
//@ chunk-tw8fk0yz.js:5480-5493 placement
/**
 * 换行特性读取器与锁存登记表
 */
var wrapFeatureRegistry = new WrapFeatureRegistry();
//@ chunk-tw8fk0yz.js:5493-5536 placement
/**
 * 登记换行用的特性读取器（供 wrapAnsi 判断是否可换行）。
 */
function registerWrapFeatureReader(e) {
  return wrapFeatureRegistry.registerReader(e);
}
//@ chunk-tw8fk0yz.js:5536-5580 placement
/**
 * 登记换行用的锁存读取（一次性取值后缓存）。
 */
function registerWrapFeatureLatches(getSessionFeatureValues) {
  return wrapFeatureRegistry.registerLatches(getSessionFeatureValues);
}
//@ chunk-tw8fk0yz.js:5580-5843 placement
/**
 * 读 tengu_frolicking_nest 决定是否启用硬换行适配（锁存一次，读取失败默认开启）。
 */
function isWrapFitEnabled() {
  let e;
  let n;
  try {
    let { reader, latches } = wrapFeatureRegistry;
    if (!reader || !latches) return true;
    e = latches();
    if (e.wrapFitEnabled !== undefined) return e.wrapFitEnabled;
    n = reader("tengu_frolicking_nest", true);
  } catch {
    return true;
  }
  if (n.source !== "payload" || !n.defaultHost) return true;
  return (e.wrapFitEnabled = n.value !== false);
}
//@ chunk-tw8fk0yz.js:5843-6187 placement
/**
 * 换行实现用的一批正则与常量：SGR、超链接 OSC、复位码、颜色码、前景/背景槽位，以及 SGR 编号到槽位的映射。
 */
var regExp = new RegExp(sgrPatternSource(";:"), "g");
var HYPERLINK_OSC_RE = /\x1b\]8;[^\x07\x1b]*(?:\x07|\x1b\\)/y;
var regExp_2 = new RegExp(`\\r((?:${sgrPatternSource(";:")})+)\\n`, "g");
var SGR_RESET_CODES = [22, 22, 23, 23, 24, 25, 27, 28, 29, 39, 49, 54, 55, 75];
var SGR_COLOR_RE = /^\x1b\[[34]8;(?:5;\d+|2;\d+;\d+;\d+)m$/;
var FG_COLOR_SLOT = 9;
var BG_COLOR_SLOT = 10;
var SGR_SLOT_MAP = new Map([
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
  if (replaced.length < e.length && replaced.includes("\x1B") && stripAnsi(replaced) !== stripAnsi(e))
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
  let parts = e.split(regExp);
  let l = [];
  for (let k = 0, D = 0; k < match.length; k++) l.push((D += parts[k].length));
  let d = emptySgrState();
  let a = [];
  let c = 0;
  let i = 0;
  let g = "";
  let p = "";
  let A = true;
  let b = false;
  let f = true;
  let T = 0;
  let I = 0;
  let x = 0;
  let R = -1;
  let v = -1;
  let M = -1;
  let H = [];
  let G = [];
  let m = [];
  let y = [];
  let P = [];
  let w = [];
  let U = [];
  for (;;) {
    let S = scanLeadingControls(replaced, T, y, P);
    let D = scanLeadingControls(t, x, H, G);
    let L = y[S];
    let B = H[D];
    for (let idx = 0; idx < S; idx++) w[idx] = -1;
    let N = S - 1;
    let _ = 0;
    for (let idx = D - 1; idx >= -1 && f; idx--) {
      let E = idx < 0 ? -1 : G[idx];
      if (E === 10 || typeof E === "string") {
        m[_++] = idx;
        continue;
      }
      let C = N;
      while (C >= 0 && P[C] !== E) C--;
      f = idx < 0 || C >= 0;
      for (let q = 0; N > C; N--) {
        let z = P[N];
        let F = z === 10 || typeof z === "string" ? q : _;
        while (F < _ && G[m[F]] !== z) F++;
        if (F < _) {
          w[N] = m[F];
          q = F + 1;
        }
      }
      if (C >= 0) {
        w[C] = idx;
        N = C - 1;
      }
      _ = 0;
    }
    if (!f) break;
    let K = c;
    let W = c - 1;
    for (let h = 0; l[W + 1] <= L;) {
      let E = l[++W];
      while (h < S && (y[h] < E || w[h] < 0)) h++;
      U[W - K] = E <= T ? 0 : h < S ? w[h] : D;
    }
    for (let idx = 0; idx <= D; idx++) {
      let E = H[idx];
      let C = c <= W && U[c - K] <= idx;
      let q = idx < D && G[idx] === 10;
      if (b && (C || (idx < D && !q))) {
        b = false;
        if (p !== "") {
          a.push(t.slice(I, E), p);
          I = E;
          A = true;
        }
      }
      if (C) {
        a.push(t.slice(I, E));
        I = E;
        while (c <= W && U[c - K] <= idx) a.push(match[c++]);
        A = true;
      }
      if (q) {
        if (i < c) {
          while (i < c) applySgrToState(match[i++], d);
          g = "";
          p = "";
          let z = 0;
          for (let idx = 0; idx < d.length; idx++) {
            if (d[idx] === "") continue;
            p += `\x1B[${d[idx]}m`;
            if (SGR_RESET_CODES[idx] !== z) {
              z = SGR_RESET_CODES[idx];
              g = `\x1B[${z}m${g}`;
            }
          }
        }
        if (A && g !== "") {
          a.push(t.slice(I, E), g);
          I = E;
        }
        A = false;
        b = true;
      }
    }
    T = L;
    x = B;
    if (x >= t.length) {
      f = T >= replaced.length;
      break;
    }
    if (b) {
      b = false;
      if (p !== "") {
        a.push(t.slice(I, x), p);
        I = x;
        A = true;
      }
    }
    if (R < x) {
      R = t.indexOf(
        `
`,
        x,
      );
      R = R === -1 ? t.length : R;
    }
    if (v < x) {
      v = t.indexOf("\x1B", x);
      v = v === -1 ? t.length : v;
    }
    if (M < T) {
      M = replaced.indexOf("\x1B", T);
      M = M === -1 ? replaced.length : M;
    }
    let min = Math.min(R - x, v - x, M - T, c < l.length ? l[c] - T : t.length);
    while (min > 0 && isWrapSpaceCode(t.charCodeAt(x + min - 1))) min--;
    if (min < 1 || !replaced.startsWith(t.slice(x, x + min), T)) {
      min = 1;
      if (t.charCodeAt(x) !== replaced.charCodeAt(T)) {
        f = false;
        break;
      }
    }
    T += min;
    x += min;
  }
  if (!f) return wrapAnsiLine(e, n, s);
  a.push(t.slice(I));
  return a.join("");
}
//@ chunk-tw8fk0yz.js:8076-8325 placement
/**
 * 从位置 n 开始扫描连续的转义序列/控制字符，记录各自位置与代码。
 */
function scanLeadingControls(e, n, s, r) {
  let t = 0;
  let u = n;
  for (; ; t++) {
    let code = e.charCodeAt(u);
    HYPERLINK_OSC_RE.lastIndex = u;
    let l = code === 27 ? HYPERLINK_OSC_RE.exec(e) : null;
    if (l === null && !isWrapSpaceCode(code)) break;
    s[t] = u;
    r[t] = l !== null ? l[0] : code === 13 ? 10 : code;
    u += l !== null ? l[0].length : code === 13 && e.charCodeAt(u + 1) === 10 ? 2 : 1;
  }
  s[t] = u;
  return t;
}
//@ chunk-tw8fk0yz.js:8325-8367 placement
/**
 * 空格或 9–13
 */
function isWrapSpaceCode(e) {
  return e === 32 || (e >= 9 && e <= 13);
}
//@ chunk-tw8fk0yz.js:8367-8403 placement
/**
 * 生成一张空的 SGR 状态槽位数组（前景/背景/下划线等）。
 */
function emptySgrState() {
  return SGR_RESET_CODES.map(() => "");
}
//@ chunk-tw8fk0yz.js:8403-9049 placement
/**
 * 把一个 SGR 序列应用到样式状态数组（前景/背景色、256/真彩色、下划线样式、复位）。
 */
function applySgrToState(e, n) {
  if (!e.endsWith("m")) return;
  if (SGR_COLOR_RE.test(e)) {
    n[e.charCodeAt(2) === 51 ? FG_COLOR_SLOT : BG_COLOR_SLOT] = e.slice(2, -1);
    return;
  }
  let s = e.length === 5 ? e.charCodeAt(2) - 48 : 0;
  let r = e.charCodeAt(e.length - 2) - 48;
  if ((e.length === 4 || e.length === 5) && s >= 0 && s <= 9 && r >= 0 && r <= 9) {
    applySgrCode(s * 10 + r, n);
    return;
  }
  let parts = e.slice(2, -1).split(";");
  for (let i = 0; i < parts.length; i++) {
    let o = parts[i];
    let l = o === "" ? 0 : parseInt(o, 10);
    if (l === 38 || l === 48 || l === 58) {
      let d = parseInt(parts[i + 1] ?? "", 10);
      let a = o.includes(":") ? 1 : d === 5 ? 3 : d === 2 ? 5 : 1;
      if (l !== 58 && (a > 1 || o.includes(":"))) {
        if (i + a <= parts.length)
          n[l === 38 ? FG_COLOR_SLOT : BG_COLOR_SLOT] = parts.slice(i, i + a).join(";");
      }
      i += a - 1;
    } else if (l === 4 && o.includes(":"))
      n[SGR_SLOT_MAP.get(4)] = o === "4:0" ? "" : /^4:[1-5]$/.test(o) ? o : "4";
    else applySgrCode(l, n);
  }
}
//@ chunk-tw8fk0yz.js:9049-9250 placement
/**
 * 应用单个 SGR 参数：颜色、属性开关或全部复位。
 */
function applySgrCode(e, n) {
  let s =
    (e >= 30 && e <= 37) || (e >= 90 && e <= 97)
      ? FG_COLOR_SLOT
      : (e >= 40 && e <= 47) || (e >= 100 && e <= 107)
        ? BG_COLOR_SLOT
        : SGR_SLOT_MAP.get(e);
  if (s !== undefined) n[s] = String(e);
  else if (e === 0) n.fill("");
  else for (let i = 0; i < n.length; i++) if (SGR_RESET_CODES[i] === e) n[i] = "";
}
//@ chunk-tw8fk0yz.js:9250-9687 placement
/**
 * 换行时的宽字符处理：两个私有区占位符、匹配占位符的正则、完整转义序列判定，以及“窄字符”判定的字符类。
 */
var WIDE_PLACEHOLDER_1 = "\uDB80\uDC00";
var WIDE_PLACEHOLDER_2 = "\uD87E\uDE1D";
var WIDE_CHAR_PLACEHOLDERS_RE = /[\u{F0000}\u{2FA1D}]/gu;
var COMPLETE_ESCAPE_SEQUENCE_RE = /^\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x00-\x1f\x7f-\x9f]*(?:\x07|\x1b\\))$/;
var regExp_3 = new RegExp(`^(?:${sgrPatternSource(";:")}$|\\x1b\\]8;)`);
var NON_WIDE_SAFE_CHARS_RE =
  /[^\x00-\u02FF\u0370-\u0482\u048A-\u052F\u2000-\u200B\u2010-\u205F\u2070-\u20CF\u2100-\u2BFF\u2E80-\u3029\u3030-\u3098\u309B-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFF01-\uFF9D\uFFE0-\uFFEE\u{1f000}-\u{1f1e5}\u{1f200}-\u{1f3fa}\u{1f400}-\u{1faff}]/gu;
//@ chunk-tw8fk0yz.js:9687-11425 placement
function wrapAnsiLine(e, n, s, r = true) {
  if (e.search(NON_WIDE_SAFE_CHARS_RE) === -1) return Bun.wrapAnsi(e, n, s);
  let t = "";
  let u = [];
  let o = [];
  for (let m of tokenizeAll(e))
    if (m.type === "sequence") {
      u.push(m.value);
      o.push(t.length);
    } else t += m.value;
  let l = {
    starts: [],
    ends: [],
    handedAs: [],
    restoredAs: [],
  };
  let graphemeSegmenter = getGraphemeSegmenter();
  let a = 0;
  let c = false;
  let i;
  NON_WIDE_SAFE_CHARS_RE.lastIndex = 0;
  while ((i = NON_WIDE_SAFE_CHARS_RE.exec(t)) !== null) {
    let index = i.index;
    while (index > 0 && !isLineBreakCode(t.charCodeAt(index - 1))) index--;
    let index_2 = i.index;
    while (index_2 < t.length && !isLineBreakCode(t.charCodeAt(index_2))) index_2++;
    NON_WIDE_SAFE_CHARS_RE.lastIndex = index_2;
    let sliced = t.slice(index, index_2);
    while (a < o.length && o[a] < index) a++;
    let w = a;
    let U = !hasControlSequences(sliced);
    while (w < o.length && o[w] <= index_2) {
      U = COMPLETE_ESCAPE_SEQUENCE_RE.test(u[w]) && U;
      w++;
    }
    if (!U && w > a) {
      let S = index;
      for (; a < o.length && o[a] < index_2; a++)
        if (o[a] > S) {
          markWidthMismatchGraphemes(t, S, o[a], l);
          S = o[a];
        }
      markWidthMismatchGraphemes(t, S, index_2, l);
      continue;
    }
    for (let { segment, index: index_2 } of graphemeSegmenter.segment(sliced)) {
      if (segment.length === 1) continue;
      let L = index + index_2;
      let B = L + segment.length;
      let N = placeholderForGrapheme(segment);
      while (a < o.length && o[a] <= L) a++;
      let _ = a;
      while (_ < o.length && o[_] < B) _++;
      if (_ === a) {
        if (N !== "") recordGraphemeSwap(l, L, B, N, segment);
        continue;
      }
      if (N === "" || bunStringWidth(t.slice(L, o[a])) === 0) {
        for (let h = a; h <= _; h++) {
          let E = h === a ? L : o[h - 1];
          let C = h === _ ? B : o[h];
          markWidthMismatchGraphemes(t, E, C, l);
        }
        continue;
      }
      let K = N;
      let W = "";
      let k = L;
      for (let h = a; h < _; h++) {
        let E = u[h];
        W += t.slice(k, o[h]);
        k = o[h];
        if (r && regExp_3.test(E)) {
          K += E;
          c = true;
        } else W += E;
      }
      recordGraphemeSwap(l, L, B, K, W + t.slice(k, B));
    }
  }
  let { starts, ends, handedAs, restoredAs } = l;
  if (starts.length === 0) return hardWrapPreservingSequences(Bun.wrapAnsi(e, n, s), e, n, s);
  let f = [];
  let T = [];
  let I = e.search(WIDE_CHAR_PLACEHOLDERS_RE) !== -1;
  let x = 0;
  let R = 0;
  for (let k = 0; k <= starts.length; k++) {
    let y = k < starts.length ? starts[k] : t.length;
    for (; R < u.length && o[R] <= y; R++) {
      let sliced = t.slice(x, o[R]);
      pushSegment(T, f, sliced, I);
      T.push(u[R]);
      x = o[R];
    }
    let sliced = t.slice(x, y);
    pushSegment(T, f, sliced, I);
    if (k === starts.length) break;
    T.push(handedAs[k]);
    f.push(restoredAs[k]);
    x = ends[k];
    while (R < u.length && o[R] < x) R++;
  }
  let joined = T.join("");
  if (c && joined.split(LINE_BREAK_RE).every((m) => bunStringWidth(m) <= n))
    return wrapAnsiLine(e, n, s, false);
  let M = Bun.wrapAnsi(joined, n, s);
  if (M === joined) return hardWrapPreservingSequences(e, e, n, s);
  let H = 0;
  let G = "";
  for (let m of tokenizeAll(M))
    G += m.type === "sequence" ? m.value : m.value.replace(WIDE_CHAR_PLACEHOLDERS_RE, (y) => f[H++] ?? y);
  return hardWrapPreservingSequences(G, e, n, s);
}
//@ chunk-tw8fk0yz.js:11425-11849 placement
/**
 * 硬换行时若有行超宽，按段检查控制序列是否安全，再逐行强制折断。
 */
function hardWrapPreservingSequences(e, n, s, r) {
  if (!r?.hard || s < 1) return e;
  let lines = e.split(`
`);
  if (lines.every((line) => bunStringWidth(line) <= s) || !isWrapFitEnabled()) return e;
  let parts = n.split(LINE_BREAK_RE);
  let o = [];
  for (let d of parts) {
    let a = true;
    for (let c of tokenizeAll(d))
      if (c.type === "sequence" ? !COMPLETE_ESCAPE_SEQUENCE_RE.test(c.value) : hasControlSequences(c.value)) {
        a = false;
        break;
      }
    o.push(a);
  }
  if (!o.includes(true)) return e;
  if (o.includes(false))
    return parts.map((d) => wrapAnsiLine(d, s, r)).join(`
`);
  let l = [];
  for (let line of lines) {
    if (bunStringWidth(line) <= s) {
      l.push(line);
      continue;
    }
    breakLineByGraphemes(line, s, false, l);
  }
  return l.join(`
`);
}
//@ chunk-tw8fk0yz.js:11849-12250 placement
/**
 * 按字素宽度把一行强制折成不超过 n 列的多行（转义序列不计宽，超宽字素拆开）。
 */
function breakLineByGraphemes(e, n, s, r) {
  let t = "";
  let u = 0;
  let o = () => {
    if (!s && bunStringWidth(t) > n) breakLineByGraphemes(t, n, true, r);
    else r.push(t);
    t = "";
    u = 0;
  };
  let l = (segment, a) => {
    if (u > 0 && a > 0 && u + a > n) o();
    t += segment;
    u += a;
  };
  for (let d of tokenizeAll(e)) {
    if (d.type === "sequence") {
      t += d.value;
      continue;
    }
    for (let { segment } of getGraphemeSegmenter().segment(d.value)) {
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
/**
 * 10 或 13
 */
function isLineBreakCode(e) {
  return e === 10 || e === 13;
}
//@ chunk-tw8fk0yz.js:12287-12305 placement
/**
 * \r\n?|\n
 */
var LINE_BREAK_RE = /\r\n?|\n/;
//@ chunk-tw8fk0yz.js:12305-12400 placement
/**
 * 登记一次字素替换
 */
function recordGraphemeSwap(e, n, s, r, segment) {
  e.starts.push(n);
  e.ends.push(s);
  e.handedAs.push(r);
  e.restoredAs.push(segment);
}
//@ chunk-tw8fk0yz.js:12400-12562 placement
/**
 * 找出宽度与码元数不一致的字素并登记替换。
 */
function markWidthMismatchGraphemes(e, n, s, r) {
  let sliced = e.slice(n, s);
  if (sliced.search(NON_WIDE_SAFE_CHARS_RE) === -1) return;
  for (let { segment, index } of getGraphemeSegmenter().segment(sliced)) {
    let l = placeholderForGrapheme(segment);
    if (l !== "") recordGraphemeSwap(r, n + index, n + index + segment.length, l, segment);
  }
}
//@ chunk-tw8fk0yz.js:12562-12674 placement
/**
 * 多码点字素按显示宽度选 1 或 2 宽的占位字符。
 */
function placeholderForGrapheme(segment) {
  let n = segment.codePointAt(0) > 65535 ? 2 : 1;
  if (segment.length <= n) return "";
  let s = bunStringWidth(segment);
  return s === 1 ? WIDE_PLACEHOLDER_1 : s === 2 ? WIDE_PLACEHOLDER_2 : "";
}
//@ chunk-tw8fk0yz.js:12674-12766 placement
/**
 * 收集一段文本并登记其中的宽字符
 */
function pushSegment(e, n, s, r) {
  if (s === "") return;
  if (r) for (let t of s.match(WIDE_CHAR_PLACEHOLDERS_RE) ?? []) n.push(t);
  e.push(s);
}
export {
  wrapAnsi,
  expandTabsInText,
  hasExpandableControls,
  expandTabs,
  hasControlSequences,
  DEFAULT_TAB_WIDTH,
  registerWrapFeatureReader,
  registerWrapFeatureLatches,
  sgrPatternSource,
  emptySgrState,
  applySgrToState,
  isCompleteEscapeSequence,
};
