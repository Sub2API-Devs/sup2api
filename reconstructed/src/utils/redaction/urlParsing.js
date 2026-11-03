/**
 * utils/redaction/urlParsing.ts
 *
 * 2.1.316 新增：收集需要遮盖的 URL 区间；找出文本中的 URL 片段与主机部分等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cgr0tezp.js (24)
 * attribution: placement 24
 */
import { tryParseUrl, decodePercentEscapes } from "../resultError.js";

//@ chunk-cgr0tezp.js:43695-43772 placement
function ot(e, n, r) {
  return { text: e.text.slice(n, r), origin: e.origin.slice(n, r) };
}
/**
 * 解析 URL 协议与是否已改写。
 */
//@ chunk-cgr0tezp.js:43772-44098 placement
function parseUrlScheme(e, { asRewritten: n = !1 } = {}) {
  let trimStart = e.trimStart(),
    match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(trimStart);
  if (match) {
    let s = match[1]?.toLowerCase();
    if (s === "file") return null;
    if (s === "http" || s === "https") {
      let o = tryParseUrl(trimStart);
      return o?.hostname ? { host: o.hostname, path: o.pathname } : null;
    }
    return findHostBoundary(decodePercentRuns(trimStart.slice(match[0].length)), "/");
  }
  return findHostBoundary(n ? decodePercentRuns(trimStart) : trimStart, ":");
}
//@ chunk-cgr0tezp.js:44098-44258 placement
function findBracketAndCut(e, n) {
  let index = e.indexOf("@["),
    i = index === -1 ? 0 : index + 1,
    s = e[i] === "[" ? i : -1,
    o = s === -1 ? -1 : e.indexOf("]", s + 1),
    index_2 = e.indexOf(n, o === -1 ? 0 : o + 1);
  return { open: s, close: o, cut: index_2 };
}
/**
 * 找出 URL 中主机部分的边界。
 */
//@ chunk-cgr0tezp.js:44258-44794 placement
function findHostBoundary(e, n) {
  let { open: open, close: close, cut: cut } = findBracketAndCut(e, n),
    o = open === -1 ? 0 : open,
    index = e.indexOf("/");
  if (n === ":" && (cut === -1 || (index !== -1 && index < e.indexOf(":")))) return null;
  let u = cut === -1 ? "" : e.slice(n === ":" ? cut + 1 : cut);
  if (close !== -1) {
    let sliced = e.slice(close + 1, cut === -1 ? e.length : cut),
      y = e.slice(0, o) + e.slice(o + 1, close),
      h = stripPort(sliced) !== sliced ? y : stripPort(y),
      sliced_2 = h.slice(h.lastIndexOf("@") + 1),
      f = tryParseUrl(`ssh://[${sliced_2}]/`)?.hostname;
    return sliced_2 ? { host: f || sliced_2, path: u } : null;
  }
  let c = cut === -1 ? e : e.slice(0, cut),
    sliced = c.slice(c.lastIndexOf("@") + 1);
  if (sliced.startsWith("[")) return null;
  let d = n === "/" ? sliced.replace(/:\d*$/, "") : sliced;
  return d ? { host: d, path: u } : null;
}
//@ chunk-cgr0tezp.js:44794-45000 placement
function userinfoSpans(e) {
  let { text: text, from: from } = decodePercentWithMap(e),
    { close: close, cut: cut } = findBracketAndCut(text, "/"),
    o = cut === -1 ? text.length : cut,
    a = [],
    u = (c, l) => {
      let index = text.lastIndexOf("@", l - 1);
      if (index >= c) a.push([from(c), from(index)]);
    };
  if (close === -1) u(0, o);
  else (u(0, close), u(close + 1, o));
  return a;
}
/**
 * 解码连续的百分号编码（失败保留）。
 */
//@ chunk-cgr0tezp.js:45000-45124 placement
function decodePercentRuns(e) {
  return e.replace(/(?:%(?!00)[0-9A-Fa-f]{2})+/g, (n) => {
    try {
      return decodeURIComponent(n);
    } catch {
      return decodePercentEscapes(n);
    }
  });
}
/**
 * 百分号解码并保留位置映射。
 */
//@ chunk-cgr0tezp.js:45124-45693 placement
function decodePercentWithMap(e) {
  if (!e.includes("%")) return { text: e, from: (s) => s };
  let n = [],
    r = "",
    i = 0;
  for (let s of e.matchAll(/(?:%(?!00)[0-9A-Fa-f]{2})+/g)) {
    for (let l = i; l < s.index; l++) n.push(l);
    r += e.slice(i, s.index);
    let o, a;
    try {
      ((o = decodeURIComponent(s[0])),
        (a = Array.from(o, (l) => {
          let codePoint = l.codePointAt(0);
          return codePoint < 128 ? 1 : codePoint < 2048 ? 2 : codePoint < 65536 ? 3 : 4;
        })));
    } catch {
      ((o = decodePercentEscapes(s[0])), (a = Array.from(o, () => 1)));
    }
    let index = s.index,
      c = 0;
    for (let l of a) {
      let d = o.codePointAt(c) > 65535 ? 2 : 1;
      for (let g = 0; g < d; g++) n.push(index);
      ((c += d), (index += 3 * l));
    }
    ((r += o), (i = s.index + s[0].length));
  }
  for (let s = i; s <= e.length; s++) n.push(s);
  return { text: r + e.slice(i), from: (s) => n[s] };
}
//@ chunk-cgr0tezp.js:45693-45871 placement
function stripPort(e) {
  let index = e.indexOf(":"),
    sliced = e.slice(index + 1);
  if (index === -1 || !/^[ \t\n\v\f\r]*[+-]?\d+$/.test(sliced)) return e;
  let int = Number.parseInt(sliced.trim(), 10);
  return int >= 0 && int < 65536 ? e.slice(0, index) : e;
}
/**
 * URL 扫描用的正则组。
 */
//@ chunk-cgr0tezp.js:45871-46236 placement
var URL_SCAN_PATTERNS = /\s/g,
  Bi = /[\n\r\u2028\u2029]/g,
  Hi = /(?:@|%40)(?:\[|%5B)/gi,
  Mi = /^(?:\[|%5B)/i,
  Ui = /\]|%5D/gi,
  abs = /(?:^|[^A-Za-z0-9+.-])(?:https?|wss?|ftps?)$/i,
  Bn = /(?:^|[^A-Za-z0-9+.-])(?:ssh|git|git\+ssh|ssh\+git)$/i,
  Wi = /[,;|&]/g,
  Gi = /(?:^|[^A-Za-z0-9+.-])[A-Za-z][A-Za-z0-9+.-]{0,31}$/,
  Ki = /["'`|,;&<>()[\]\\@/?#]|%40|%5B/i,
  zi = /["'`]/,
  Vi = /[;|&\n]/g,
  ji = 64,
  Ji = 2048,
  Zi = /[\s"'`]/g;
//@ chunk-cgr0tezp.js:46236-46468 placement = ghIsDangerousCallback (1)
function findSshUrlUserinfoSpans(e) {
  let n = [],
    r = D(e, Zi),
    i = 0;
  for (let index = e.indexOf("://"); index !== -1;) {
    let o = index + 3;
    if (index >= i && Bn.test(e.slice(Math.max(0, index - 8), index))) {
      i = Math.min(r(o), o + Ji);
      for (let [a, u] of userinfoSpans(e.slice(o, i))) n.push([o + a, o + u]);
    }
    index = e.indexOf("://", o);
  }
  return n;
}
//@ chunk-cgr0tezp.js:46468-46503 placement
function UDi(e) {
  return findUrlSpans(e).spans;
}
/**
 * 找出文本中的 URL 片段与主机部分。
 */
//@ chunk-cgr0tezp.js:46503-47678 placement
function findUrlSpans(e) {
  let n = [],
    r = [],
    i = D(e, URL_SCAN_PATTERNS),
    s = D(e, /\//g),
    o = cachedRegexExec(e, Hi),
    a = D(e, Ui),
    u = D(e, /\//g),
    c = D(e, Vi),
    l = D(e, /[/?#]/g),
    d = D(e, Wi),
    g = D(e, /@/g),
    y = D(e, /%40/gi),
    h = D(e, /\[REDACTED|\*\*\*:\*\*\*/g),
    S = D(e, /[:%]/g),
    f = D(e, /["'`,;|&<>{}()]/g),
    m = lastAtBefore(e, !1),
    b = lastAtBefore(e, !0);
  for (let index = e.indexOf("://"); index !== -1;) {
    let x = index + 3,
      L,
      index_2 = e.indexOf("://", x),
      w = i(x),
      M = g(x),
      F;
    if (abs.test(e.slice(Math.max(0, index - 8), index))) {
      let min = Math.min(l(x), w),
        min_2 = Math.min(d(x), min);
      if (
        ((F = M < min ? Math.max(m(x, min), b(M, min)) : Math.max(m(x, Math.min(s(x), w)), b(x, min_2))),
        F <= x)
      ) {
        let min_3 = Math.min(min, c(x));
        r.push({ start: x, fieldEnd: Math.min(min_2, min_3), lastEncodedAt: b(x, min_3) });
      }
    } else {
      let min = Math.min(s(x), w),
        min_2 = Math.min(w, index_2 === -1 ? e.length : index_2),
        matches = Bn.test(e.slice(Math.max(0, index - 8), index)),
        T = matches ? o(x) : null,
        U = matches ? Mi.exec(e.slice(x, x + 3)) : null,
        R = [
          [U !== null ? x + U[0].length : -1, min_2],
          [T !== null && T.index < min_2 ? T.index + T[0].length : -1, w],
        ];
      for (let [v, j] of R) {
        let G = v === -1 ? w : a(v);
        if (G < j) ((L = Math.max(L ?? G, G)), (min = Math.max(min, Math.min(u(G), w))));
      }
      F = Math.max(m(x, min), b(x, min));
    }
    if (F > x)
      n.push({
        start: x,
        end: F,
        separatorEnd: F + (e[F] === "@" ? 1 : 3),
        loginEnd: M <= F ? M : Math.min(y(x), F),
        bracketClose: L,
      });
    else {
      let O = h(x);
      if (O > x && O < Math.min(w, s(x), f(x)) && S(x) < O)
        n.push({ start: x, end: O, separatorEnd: O, loginEnd: O });
    }
    index = index_2;
  }
  return { spans: n, hostParts: r };
}
/**
 * 收集需要遮盖的 URL 区间。
 */
//@ chunk-cgr0tezp.js:47678-49063 placement
function collectUrlRedactions(e, n) {
  let { spans: spans, hostParts: hostParts } = findUrlSpans(e);
  if (spans.length === 0 && hostParts.length === 0) return [];
  let s = D(e, /[\s"'>}|,;&`)\]]/g),
    o = D(e, /\s/g),
    a = [],
    u = [];
  for (let h of spans)
    (a.push({ start: h.start, end: h.end, loginEnd: h.loginEnd }), u.push({ ...h, userinfo: h }));
  let c = findKeyValueSecrets(e, n);
  for (let h of hostParts) {
    let S = c(h.start)[0];
    if (S && S.keyStart < h.fieldEnd && e.slice(h.start, S.keyStart).includes("%")) {
      let f = h.lastEncodedAt > S.keyStart ? h.lastEncodedAt : S.valueStart;
      (a.push({ start: h.start, end: f, loginEnd: f }),
        u.push(
          f > S.valueStart
            ? {
                start: h.start,
                end: f,
                userinfo: { start: h.start, end: f, separatorEnd: f + 3, loginEnd: f },
              }
            : { start: h.start, end: f },
        ));
    }
  }
  if (u.length === 0) return [];
  a.sort((h, S) => h.start - S.start);
  let l = findKeyValueSecrets(e, n),
    d = 0;
  for (let h = 0, S = l(h); S[0] !== void 0;) {
    let f,
      m = null;
    for (let A of S)
      if (((m = A.valueEnd()), m !== null)) {
        f = A;
        break;
      }
    if (f === void 0 || m === null) {
      ((h = S[0].keyStart + 1), (S = l(h)));
      continue;
    }
    while (d < a.length && a[d].start <= f.keyStart) d++;
    let b = a[d];
    if (b !== void 0 && b.start < m) {
      let A = e[f.valueStart] ?? "",
        L =
          (A === '"' || A === "'") && m - 1 > f.valueStart && e[m - 1] === A
            ? Math.max(m, b.end)
            : o(Math.max(m, b.end, s(b.loginEnd + 1)));
      u.push({ start: f.valueStart, end: L });
    }
    ((h = m), (S = l(h)));
  }
  let g = {
      nextKey: findKeyValueSecrets(e, n),
      plainKeys: findKeyValueSecrets(e, n),
      nextLineEnd: D(e, Bi),
      span: 0,
      lineEnd: -1,
      resumeAt: 0,
      overflowEnd: quoteBoundary(e, () => g.lineEnd),
    },
    y = [];
  for (let h of mergeSpans(u)) {
    let at = y.at(-1);
    y.push(
      at !== void 0 && h.start < at.end
        ? extendUrlSpan(e, { start: y.pop().start, end: Math.max(at.end, h.end) }, g)
        : extendUrlSpan(e, h, g),
    );
  }
  return y.map((h) => (h.userinfo ? h : trimUnbalancedQuote(e, h)));
}
//@ chunk-cgr0tezp.js:49063-49082 placement
var weakMap = new WeakMap();
//@ chunk-cgr0tezp.js:49082-49287 placement
function compileSecretRegexes(e) {
  let n = weakMap.get(e);
  if (!n)
    ((n = {
      word: new RegExp(e.word, "gi"),
      notTail: new RegExp(`(?!${e.tail})[^]`, "gi"),
      separator: new RegExp(e.separator, "iy"),
      value: new RegExp(e.value, "iy"),
    }),
      weakMap.set(e, n));
  return n;
}
/**
 * 按关键词查找键值对形式的秘密。
 */
//@ chunk-cgr0tezp.js:49287-49958 placement
function findKeyValueSecrets(e, n) {
  let mapped = n.map((i) => {
    let { word: word, notTail: notTail, separator: separator, value: u } = compileSecretRegexes(i),
      c = cachedRegexExec(e, word),
      l = D(e, notTail),
      d = -1,
      g = -1,
      y = -1,
      h = null,
      S = (A) => {
        if (A !== y) ((y = A), (u.lastIndex = A), (h = u.test(e) ? u.lastIndex : null));
        return h;
      },
      f = (A) => {
        if (A !== d) ((d = A), (separator.lastIndex = A), (g = separator.test(e) ? separator.lastIndex : -1));
        return g;
      },
      m = -1,
      b = null;
    return (A) => {
      if (m !== -1 && A >= m && (b === null || A <= b.keyStart)) return b;
      ((m = A), (b = null));
      for (let x = c(A); x !== null;) {
        let L = x.index + x[0].length,
          I = f(i.tail ? l(L) : L);
        if (I !== -1) {
          b = { keyStart: x.index, valueStart: I, valueEnd: () => S(I) };
          break;
        }
        x = c(x.index + 1);
      }
      return b;
    };
  });
  return (i) => {
    let s = [];
    for (let o of mapped) {
      let a = o(i);
      if (a && (!s[0] || a.keyStart <= s[0].keyStart))
        s = s[0] && a.keyStart === s[0].keyStart ? [...s, a] : [a];
    }
    return s;
  };
}
/**
 * 扩展 URL 区间（包含 userinfo）。
 */
//@ chunk-cgr0tezp.js:49958-50515 placement
function extendUrlSpan(e, n, r) {
  if (n.userinfo && isEmailLikeSecret(e, n.userinfo, r)) return n;
  let end = n.end;
  r.resumeAt = Math.max(r.resumeAt, n.start);
  for (let nextKey = r.nextKey(r.resumeAt); nextKey[0] !== void 0 && nextKey[0].keyStart < end;) {
    let keyStart = nextKey[0].keyStart;
    if (keyStart > r.lineEnd) {
      let nextLineEnd = r.nextLineEnd(keyStart);
      ((r.span = ji * (nextLineEnd - r.lineEnd)), (r.lineEnd = nextLineEnd));
    }
    let a = null,
      u = nextKey[0];
    for (let l of nextKey)
      if (((a = l.valueEnd()), a !== null)) {
        u = l;
        break;
      }
    let c = a ?? u.valueStart;
    if (((r.span -= c - keyStart), r.span < 0))
      return { start: n.start, end: Math.max(end, r.overflowEnd(n.start)) };
    ((end = Math.max(end, c)), (r.resumeAt = u.valueStart), (nextKey = r.nextKey(r.resumeAt)));
  }
  return end === n.end ? n : { start: n.start, end: end };
}
//@ chunk-cgr0tezp.js:50515-50799 placement
function isEmailLikeSecret(e, n, r) {
  if (
    e[n.end] !== "@" ||
    Ki.test(e.slice(n.start, n.end)) ||
    !Gi.test(e.slice(Math.max(0, n.start - 36), n.start - 3))
  )
    return !1;
  for (
    let plainKeys = r.plainKeys(n.start);
    plainKeys[0] !== void 0 && plainKeys[0].keyStart < n.end;
    plainKeys = r.plainKeys(plainKeys[0].keyStart + 1)
  )
    if (plainKeys.some((s) => s.valueStart === n.end)) return !1;
  return !0;
}
//@ chunk-cgr0tezp.js:50799-50911 placement
function quoteBoundary(e, n) {
  let r = D(e, /["'`]/g),
    i = -1,
    s = e.length;
  return (o) => {
    if (n() !== i) ((i = n()), (s = r(o) < i ? e.length : i));
    return s;
  };
}
//@ chunk-cgr0tezp.js:50911-51066 placement
function trimUnbalancedQuote(e, n) {
  let r = e[n.end - 1];
  if (r === void 0 || !zi.test(r)) return n;
  return (e.slice(n.start, n.end).split(r).length - 1) % 2 === 1 ? { start: n.start, end: n.end - 1 } : n;
}
//@ chunk-cgr0tezp.js:51066-51275 placement
function mergeSpans(e) {
  e.sort((r, i) => r.start - i.start || i.end - r.end);
  let n = [];
  for (let r of e) {
    let at = n.at(-1);
    if (at === void 0 || r.start >= at.end) n.push(r);
    else n[n.length - 1] = { start: at.start, end: Math.max(at.end, r.end) };
  }
  return n;
}
//@ chunk-cgr0tezp.js:51275-51338 placement
function D(e, n) {
  let r = cachedRegexExec(e, n);
  return (i) => r(i)?.index ?? e.length;
}
//@ chunk-cgr0tezp.js:51338-51459 placement
function cachedRegexExec(e, n) {
  let r = -1,
    i = null;
  return (s) => {
    if (r === -1 || s < r || (i !== null && s > i.index)) ((n.lastIndex = s), (i = n.exec(e)), (r = s));
    return i;
  };
}
//@ chunk-cgr0tezp.js:51459-51715 placement
function lastAtBefore(e, n) {
  let r = null;
  return (i, s) => {
    if (r === null) {
      r = new Int32Array(e.length + 1);
      let a = -1;
      for (let u = 0; u <= e.length; u++) {
        if (n) {
          if (u >= 3 && e.startsWith("%40", u - 3)) a = u - 3;
        } else if (u >= 1 && e[u - 1] === "@") a = u - 1;
        r[u] = a;
      }
    }
    let o = r[Math.min(s, e.length)];
    return o >= i ? o : -1;
  };
}

export { collectUrlRedactions, findSshUrlUserinfoSpans, ot, decodePercentRuns, parseUrlScheme, UDi, abs };
