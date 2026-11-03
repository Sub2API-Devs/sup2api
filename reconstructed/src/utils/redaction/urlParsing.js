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
/**
 * sliceSpan：按区间切出文本与来源。
 */
function sliceSpan(e, n, r) {
  return {
    text: e.text.slice(n, r),
    origin: e.origin.slice(n, r),
  };
}
//@ chunk-cgr0tezp.js:43772-44098 placement
/**
 * 解析 URL 协议与是否已改写。
 */
function parseUrlScheme(e, { asRewritten: n = false } = {}) {
  let r = e.trimStart();
  let match = /^([A-Za-z][A-Za-z0-9+.-]*):\/\//.exec(r);
  if (match) {
    let lower = match[1]?.toLowerCase();
    if (lower === "file") return null;
    if (lower === "http" || lower === "https") {
      let o = tryParseUrl(r);
      return o?.hostname
        ? {
            host: o.hostname,
            path: o.pathname,
          }
        : null;
    }
    return findHostBoundary(decodePercentRuns(r.slice(match[0].length)), "/");
  }
  return findHostBoundary(n ? decodePercentRuns(r) : r, ":");
}
//@ chunk-cgr0tezp.js:44098-44258 placement
function findBracketAndCut(e, n) {
  let index = e.indexOf("@[");
  let i = index === -1 ? 0 : index + 1;
  let s = e[i] === "[" ? i : -1;
  let o = s === -1 ? -1 : e.indexOf("]", s + 1);
  let cut = e.indexOf(n, o === -1 ? 0 : o + 1);
  return {
    open: s,
    close: o,
    cut,
  };
}
//@ chunk-cgr0tezp.js:44258-44794 placement
/**
 * 找出 URL 中主机部分的边界。
 */
function findHostBoundary(e, n) {
  let { open, close, cut } = findBracketAndCut(e, n);
  let o = open === -1 ? 0 : open;
  let index = e.indexOf("/");
  if (n === ":" && (cut === -1 || (index !== -1 && index < e.indexOf(":")))) return null;
  let path = cut === -1 ? "" : e.slice(n === ":" ? cut + 1 : cut);
  if (close !== -1) {
    let sliced = e.slice(close + 1, cut === -1 ? e.length : cut);
    let y = e.slice(0, o) + e.slice(o + 1, close);
    let h = stripPort(sliced) !== sliced ? y : stripPort(y);
    let sliced_2 = h.slice(h.lastIndexOf("@") + 1);
    let hostname = tryParseUrl(`ssh://[${sliced_2}]/`)?.hostname;
    return sliced_2
      ? {
          host: hostname || sliced_2,
          path,
        }
      : null;
  }
  let c = cut === -1 ? e : e.slice(0, cut);
  let sliced = c.slice(c.lastIndexOf("@") + 1);
  if (sliced.startsWith("[")) return null;
  let d = n === "/" ? sliced.replace(/:\d*$/, "") : sliced;
  return d
    ? {
        host: d,
        path,
      }
    : null;
}
//@ chunk-cgr0tezp.js:44794-45000 placement
function userinfoSpans(e) {
  let { text, from } = decodePercentWithMap(e);
  let { close, cut } = findBracketAndCut(text, "/");
  let o = cut === -1 ? text.length : cut;
  let a = [];
  let u = (c, l) => {
    let index = text.lastIndexOf("@", l - 1);
    if (index >= c) a.push([from(c), from(index)]);
  };
  if (close === -1) u(0, o);
  else {
    u(0, close);
    u(close + 1, o);
  }
  return a;
}
//@ chunk-cgr0tezp.js:45000-45124 placement
/**
 * 解码连续的百分号编码（失败保留）。
 */
function decodePercentRuns(e) {
  return e.replace(/(?:%(?!00)[0-9A-Fa-f]{2})+/g, (n) => {
    try {
      return decodeURIComponent(n);
    } catch {
      return decodePercentEscapes(n);
    }
  });
}
//@ chunk-cgr0tezp.js:45124-45693 placement
/**
 * 百分号解码并保留位置映射。
 */
function decodePercentWithMap(e) {
  if (!e.includes("%"))
    return {
      text: e,
      from: (s) => s,
    };
  let n = [];
  let r = "";
  let i = 0;
  for (let s of e.matchAll(/(?:%(?!00)[0-9A-Fa-f]{2})+/g)) {
    for (let l = i; l < s.index; l++) n.push(l);
    r += e.slice(i, s.index);
    let o;
    let a;
    try {
      o = decodeURIComponent(s[0]);
      a = Array.from(o, (l) => {
        let codePoint = l.codePointAt(0);
        return codePoint < 128 ? 1 : codePoint < 2048 ? 2 : codePoint < 65536 ? 3 : 4;
      });
    } catch {
      o = decodePercentEscapes(s[0]);
      a = Array.from(o, () => 1);
    }
    let index = s.index;
    let c = 0;
    for (let l of a) {
      let d = o.codePointAt(c) > 65535 ? 2 : 1;
      for (let j = 0; j < d; j++) n.push(index);
      c += d;
      index += 3 * l;
    }
    r += o;
    i = s.index + s[0].length;
  }
  for (let s = i; s <= e.length; s++) n.push(s);
  return {
    text: r + e.slice(i),
    from: (s) => n[s],
  };
}
//@ chunk-cgr0tezp.js:45693-45871 placement
function stripPort(e) {
  let index = e.indexOf(":");
  let sliced = e.slice(index + 1);
  if (index === -1 || !/^[ \t\n\v\f\r]*[+-]?\d+$/.test(sliced)) return e;
  let i = Number.parseInt(sliced.trim(), 10);
  return i >= 0 && i < 65536 ? e.slice(0, index) : e;
}
//@ chunk-cgr0tezp.js:45871-46236 placement
/**
 * URL 扫描用的正则组。
 */
var URL_SCAN_PATTERNS = /\s/g;
var URL_WHITESPACE_RE = /[\n\r\u2028\u2029]/g;
var URL_LINEBREAK_RE = /(?:@|%40)(?:\[|%5B)/gi;
var ENCODED_AT_BRACKET_RE = /^(?:\[|%5B)/i;
var ENCODED_BRACKET_START_RE = /\]|%5D/gi;
var ENCODED_BRACKET_END_RE = /(?:^|[^A-Za-z0-9+.-])(?:https?|wss?|ftps?)$/i;
var URL_SCHEME_TAIL_RE = /(?:^|[^A-Za-z0-9+.-])(?:ssh|git|git\+ssh|ssh\+git)$/i;
var SSH_SCHEME_TAIL_RE = /[,;|&]/g;
var URL_DELIMITER_RE = /(?:^|[^A-Za-z0-9+.-])[A-Za-z][A-Za-z0-9+.-]{0,31}$/;
var SCHEME_TOKEN_RE = /["'`|,;&<>()[\]\\@/?#]|%40|%5B/i;
var USERINFO_STOP_RE = /["'`]/;
var QUOTE_SINGLE_RE = /[;|&\n]/g;
var URL_TERMINATORS_RE = 64;
var MAX_SSH_USERINFO_SCAN = 2048;
var MAX_URL_SCAN_LENGTH = /[\s"'`]/g;
//@ chunk-cgr0tezp.js:46236-46468 placement = ghIsDangerousCallback (1)
function findSshUrlUserinfoSpans(e) {
  let n = [];
  let r = nextMatchIndex(e, MAX_URL_SCAN_LENGTH);
  let i = 0;
  for (let index = e.indexOf("://"); index !== -1;) {
    let o = index + 3;
    if (index >= i && URL_SCHEME_TAIL_RE.test(e.slice(Math.max(0, index - 8), index))) {
      i = Math.min(r(o), o + MAX_SSH_USERINFO_SCAN);
      for (let [a, u] of userinfoSpans(e.slice(o, i))) n.push([o + a, o + u]);
    }
    index = e.indexOf("://", o);
  }
  return n;
}
//@ chunk-cgr0tezp.js:46468-46503 placement
/**
 * urlSpans：文本中的 URL 片段。
 */
function urlSpans(e) {
  return findUrlSpans(e).spans;
}
//@ chunk-cgr0tezp.js:46503-47678 placement
/**
 * 找出文本中的 URL 片段与主机部分。
 */
function findUrlSpans(e) {
  let n = [];
  let r = [];
  let i = nextMatchIndex(e, URL_SCAN_PATTERNS);
  let s = nextMatchIndex(e, /\//g);
  let o = cachedRegexExec(e, URL_LINEBREAK_RE);
  let a = nextMatchIndex(e, ENCODED_BRACKET_START_RE);
  let u = nextMatchIndex(e, /\//g);
  let c = nextMatchIndex(e, QUOTE_SINGLE_RE);
  let l = nextMatchIndex(e, /[/?#]/g);
  let d = nextMatchIndex(e, SSH_SCHEME_TAIL_RE);
  let g = nextMatchIndex(e, /@/g);
  let y = nextMatchIndex(e, /%40/gi);
  let h = nextMatchIndex(e, /\[REDACTED|\*\*\*:\*\*\*/g);
  let S = nextMatchIndex(e, /[:%]/g);
  let f = nextMatchIndex(e, /["'`,;|&<>{}()]/g);
  let m = lastAtBefore(e, false);
  let b = lastAtBefore(e, true);
  for (let index = e.indexOf("://"); index !== -1;) {
    let x = index + 3;
    let L;
    let index_2 = e.indexOf("://", x);
    let w = i(x);
    let M = g(x);
    let F;
    if (ENCODED_BRACKET_END_RE.test(e.slice(Math.max(0, index - 8), index))) {
      let min = Math.min(l(x), w);
      let min_2 = Math.min(d(x), min);
      F = M < min ? Math.max(m(x, min), b(M, min)) : Math.max(m(x, Math.min(s(x), w)), b(x, min_2));
      if (F <= x) {
        let min_3 = Math.min(min, c(x));
        r.push({
          start: x,
          fieldEnd: Math.min(min_2, min_3),
          lastEncodedAt: b(x, min_3),
        });
      }
    } else {
      let min = Math.min(s(x), w);
      let min_2 = Math.min(w, index_2 === -1 ? e.length : index_2);
      let matches = URL_SCHEME_TAIL_RE.test(e.slice(Math.max(0, index - 8), index));
      let T = matches ? o(x) : null;
      let U = matches ? ENCODED_AT_BRACKET_RE.exec(e.slice(x, x + 3)) : null;
      let R = [
        [U !== null ? x + U[0].length : -1, min_2],
        [T !== null && T.index < min_2 ? T.index + T[0].length : -1, w],
      ];
      for (let [v, j] of R) {
        let G = v === -1 ? w : a(v);
        if (G < j) {
          L = Math.max(L ?? G, G);
          min = Math.max(min, Math.min(u(G), w));
        }
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
        n.push({
          start: x,
          end: O,
          separatorEnd: O,
          loginEnd: O,
        });
    }
    index = index_2;
  }
  return {
    spans: n,
    hostParts: r,
  };
}
//@ chunk-cgr0tezp.js:47678-49063 placement
/**
 * 收集需要遮盖的 URL 区间。
 */
function collectUrlRedactions(e, n) {
  let { spans, hostParts } = findUrlSpans(e);
  if (spans.length === 0 && hostParts.length === 0) return [];
  let s = nextMatchIndex(e, /[\s"'>}|,;&`)\]]/g);
  let o = nextMatchIndex(e, /\s/g);
  let a = [];
  let u = [];
  for (let span of spans) {
    a.push({
      start: span.start,
      end: span.end,
      loginEnd: span.loginEnd,
    });
    u.push({
      ...span,
      userinfo: span,
    });
  }
  let keyValueSecrets = findKeyValueSecrets(e, n);
  for (let hostPart of hostParts) {
    let S = keyValueSecrets(hostPart.start)[0];
    if (S && S.keyStart < hostPart.fieldEnd && e.slice(hostPart.start, S.keyStart).includes("%")) {
      let f = hostPart.lastEncodedAt > S.keyStart ? hostPart.lastEncodedAt : S.valueStart;
      a.push({
        start: hostPart.start,
        end: f,
        loginEnd: f,
      });
      u.push(
        f > S.valueStart
          ? {
              start: hostPart.start,
              end: f,
              userinfo: {
                start: hostPart.start,
                end: f,
                separatorEnd: f + 3,
                loginEnd: f,
              },
            }
          : {
              start: hostPart.start,
              end: f,
            },
      );
    }
  }
  if (u.length === 0) return [];
  a.sort((h, S) => h.start - S.start);
  let keyValueSecrets_2 = findKeyValueSecrets(e, n);
  let d = 0;
  for (let h = 0, S = keyValueSecrets_2(h); S[0] !== undefined;) {
    let f;
    let m = null;
    for (let A of S) {
      m = A.valueEnd();
      if (m !== null) {
        f = A;
        break;
      }
    }
    if (f === undefined || m === null) {
      h = S[0].keyStart + 1;
      S = keyValueSecrets_2(h);
      continue;
    }
    while (d < a.length && a[d].start <= f.keyStart) d++;
    let b = a[d];
    if (b !== undefined && b.start < m) {
      let A = e[f.valueStart] ?? "";
      let end =
        (A === '"' || A === "'") && m - 1 > f.valueStart && e[m - 1] === A
          ? Math.max(m, b.end)
          : o(Math.max(m, b.end, s(b.loginEnd + 1)));
      u.push({
        start: f.valueStart,
        end,
      });
    }
    h = m;
    S = keyValueSecrets_2(h);
  }
  let g = {
    nextKey: findKeyValueSecrets(e, n),
    plainKeys: findKeyValueSecrets(e, n),
    nextLineEnd: nextMatchIndex(e, URL_WHITESPACE_RE),
    span: 0,
    lineEnd: -1,
    resumeAt: 0,
    overflowEnd: quoteBoundary(e, () => g.lineEnd),
  };
  let y = [];
  for (let h of mergeSpans(u)) {
    let last = y.at(-1);
    y.push(
      last !== undefined && h.start < last.end
        ? extendUrlSpan(
            e,
            {
              start: y.pop().start,
              end: Math.max(last.end, h.end),
            },
            g,
          )
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
  if (!n) {
    n = {
      word: new RegExp(e.word, "gi"),
      notTail: new RegExp(`(?!${e.tail})[^]`, "gi"),
      separator: new RegExp(e.separator, "iy"),
      value: new RegExp(e.value, "iy"),
    };
    weakMap.set(e, n);
  }
  return n;
}
//@ chunk-cgr0tezp.js:49287-49958 placement
/**
 * 按关键词查找键值对形式的秘密。
 */
function findKeyValueSecrets(e, n) {
  let mapped = n.map((i) => {
    let { word, notTail, separator, value: u } = compileSecretRegexes(i);
    let c = cachedRegexExec(e, word);
    let l = nextMatchIndex(e, notTail);
    let d = -1;
    let g = -1;
    let y = -1;
    let h = null;
    let S = (A) => {
      if (A !== y) {
        y = A;
        u.lastIndex = A;
        h = u.test(e) ? u.lastIndex : null;
      }
      return h;
    };
    let f = (A) => {
      if (A !== d) {
        d = A;
        separator.lastIndex = A;
        g = separator.test(e) ? separator.lastIndex : -1;
      }
      return g;
    };
    let m = -1;
    let b = null;
    return (A) => {
      if (m !== -1 && A >= m && (b === null || A <= b.keyStart)) return b;
      m = A;
      b = null;
      for (let x = c(A); x !== null;) {
        let L = x.index + x[0].length;
        let I = f(i.tail ? l(L) : L);
        if (I !== -1) {
          b = {
            keyStart: x.index,
            valueStart: I,
            valueEnd: () => S(I),
          };
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
//@ chunk-cgr0tezp.js:49958-50515 placement
/**
 * 扩展 URL 区间（包含 userinfo）。
 */
function extendUrlSpan(e, n, r) {
  if (n.userinfo && isEmailLikeSecret(e, n.userinfo, r)) return n;
  let end = n.end;
  r.resumeAt = Math.max(r.resumeAt, n.start);
  for (let s = r.nextKey(r.resumeAt); s[0] !== undefined && s[0].keyStart < end;) {
    let keyStart = s[0].keyStart;
    if (keyStart > r.lineEnd) {
      let l = r.nextLineEnd(keyStart);
      r.span = URL_TERMINATORS_RE * (l - r.lineEnd);
      r.lineEnd = l;
    }
    let a = null;
    let u = s[0];
    for (let l of s) {
      a = l.valueEnd();
      if (a !== null) {
        u = l;
        break;
      }
    }
    let c = a ?? u.valueStart;
    r.span -= c - keyStart;
    if (r.span < 0)
      return {
        start: n.start,
        end: Math.max(end, r.overflowEnd(n.start)),
      };
    end = Math.max(end, c);
    r.resumeAt = u.valueStart;
    s = r.nextKey(r.resumeAt);
  }
  return end === n.end
    ? n
    : {
        start: n.start,
        end,
      };
}
//@ chunk-cgr0tezp.js:50515-50799 placement
function isEmailLikeSecret(e, userinfo, r) {
  if (
    e[userinfo.end] !== "@" ||
    SCHEME_TOKEN_RE.test(e.slice(userinfo.start, userinfo.end)) ||
    !URL_DELIMITER_RE.test(e.slice(Math.max(0, userinfo.start - 36), userinfo.start - 3))
  )
    return false;
  for (
    let i = r.plainKeys(userinfo.start);
    i[0] !== undefined && i[0].keyStart < userinfo.end;
    i = r.plainKeys(i[0].keyStart + 1)
  )
    if (i.some((s) => s.valueStart === userinfo.end)) return false;
  return true;
}
//@ chunk-cgr0tezp.js:50799-50911 placement
function quoteBoundary(e, n) {
  let r = nextMatchIndex(e, /["'`]/g);
  let i = -1;
  let s = e.length;
  return (o) => {
    if (n() !== i) {
      i = n();
      s = r(o) < i ? e.length : i;
    }
    return s;
  };
}
//@ chunk-cgr0tezp.js:50911-51066 placement
function trimUnbalancedQuote(e, n) {
  let r = e[n.end - 1];
  if (r === undefined || !USERINFO_STOP_RE.test(r)) return n;
  return (e.slice(n.start, n.end).split(r).length - 1) % 2 === 1
    ? {
        start: n.start,
        end: n.end - 1,
      }
    : n;
}
//@ chunk-cgr0tezp.js:51066-51275 placement
function mergeSpans(e) {
  e.sort((r, i) => r.start - i.start || i.end - r.end);
  let n = [];
  for (let r of e) {
    let last = n.at(-1);
    if (last === undefined || r.start >= last.end) n.push(r);
    else
      n[n.length - 1] = {
        start: last.start,
        end: Math.max(last.end, r.end),
      };
  }
  return n;
}
//@ chunk-cgr0tezp.js:51275-51338 placement
function nextMatchIndex(e, n) {
  let r = cachedRegexExec(e, n);
  return (i) => r(i)?.index ?? e.length;
}
//@ chunk-cgr0tezp.js:51338-51459 placement
function cachedRegexExec(e, n) {
  let r = -1;
  let i = null;
  return (s) => {
    if (r === -1 || s < r || (i !== null && s > i.index)) {
      n.lastIndex = s;
      i = n.exec(e);
      r = s;
    }
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
      for (let j = 0; j <= e.length; j++) {
        if (n) {
          if (j >= 3 && e.startsWith("%40", j - 3)) a = j - 3;
        } else if (j >= 1 && e[j - 1] === "@") a = j - 1;
        r[j] = a;
      }
    }
    let o = r[Math.min(s, e.length)];
    return o >= i ? o : -1;
  };
}
export {
  collectUrlRedactions,
  findSshUrlUserinfoSpans,
  sliceSpan,
  decodePercentRuns,
  parseUrlScheme,
  urlSpans,
  ENCODED_BRACKET_END_RE,
};
