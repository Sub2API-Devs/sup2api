/**
 * services/artifacts/composePage.ts
 *
 * 2.1.316 新增：组装发布页面（骨架文档解包、viewport meta、嵌套页修复）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (15)
 * attribution: placement 15
 */
import {
  findTagOutsideComments,
  isValidLangTag,
  fl,
  ul,
  spendStripPass,
  Xs,
  StripUnsettledError,
  FRAME_RUNTIME_HEAD_WINDOW,
  FRAME_RUNTIME_MAX_SPAN,
} from "./pagePreparation.js";
import { skipQuotedAttribute, FRAME_RUNTIME_SENTINELS, Dt } from "./pageRuntimes.js";
import { isHtmlCommentOnly } from "./capabilityRoster.js";
import { getLiveState } from "../liveReplica/liveReplica.js";

/**
 * HTML 文档前缀与 meta 常量。旧版名 sanitizeMessageHTML 为错配；疑似归错文件（HTML 预览/发布）。
 */
//@ chunk-06y4szbn.js:67830-68237 placement = sanitizeMessageHTML (0.385)
var HTML_DOCTYPE = "<!doctype html>",
  HTML_OPEN_TAG = "<html",
  HTML_DOC_PREFIX = HTML_DOCTYPE + HTML_OPEN_TAG,
  HTML_DOCTYPE_REGEX = new RegExp(`^${HTML_DOCTYPE}`, "i"),
  META_VIEWPORT_COVER =
    '<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">',
  META_VIEWPORT = '<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1">',
  META_OR_WBR_TAG_REGEX = /^<(?:meta|wbr)(?=[\t\n\f\r />])/i,
  META_TAG_REGEX = /<meta(?=[\t\n\f\r /])/gi,
  HTML_HEAD_SCAN_LIMIT = 1024,
  VIEWPORT_CONTENT_PAIR_REGEX = /([^\t\n\f\r =,]+)[^=,]*[\t\n\f\r =]*([^\t\n\f\r =,]*)/g;
/**
 * viewport content 里 viewport-fit=cover。疑似归错文件。
 */
//@ chunk-06y4szbn.js:68237-68371 placement
function hasViewportFitCover(e) {
  let n = "";
  for (let [, r = "", s = ""] of e.matchAll(VIEWPORT_CONTENT_PAIR_REGEX))
    if (r.toLowerCase() === "viewport-fit") n = s.toLowerCase();
  return n === "cover";
}
//@ chunk-06y4szbn.js:68371-68875 placement
function readTagAttributes(e, n, r) {
  let s = new Map(),
    h = r - 1,
    b = n;
  for (;;) {
    while (b < h && /[\t\n\f\r /]/.test(e[b])) b++;
    if (b >= h) return s;
    let y = "";
    do ((y += e[b].toLowerCase()), b++);
    while (b < h && !/[\t\n\f\r /=>]/.test(e[b]));
    while (b < h && /[\t\n\f\r ]/.test(e[b])) b++;
    let x = "";
    if (b < h && e[b] === "=") {
      b++;
      while (b < h && /[\t\n\f\r ]/.test(e[b])) b++;
      let w = e[b];
      if (b < h && (w === '"' || w === "'")) {
        let index = e.indexOf(w, b + 1);
        if (index < 0 || index >= h) return s;
        ((x = e.slice(b + 1, index)), (b = index + 1));
      } else {
        let R = b;
        while (b < h && !/[\t\n\f\r >]/.test(e[b])) b++;
        x = e.slice(R, b);
      }
    }
    if (!s.has(y)) s.set(y, x);
  }
}
//@ chunk-06y4szbn.js:68875-69489 placement
function needsViewportMeta(e, n = !0) {
  if (!/<meta[\t\n\f\r />]/i.test(e)) return n;
  let r,
    s = e + "<wbr>",
    h = 0,
    b = findTagOutsideComments(s, META_OR_WBR_TAG_REGEX, 0);
  while (b >= 0 && b < e.length) {
    let y = s[b + 1] === "m" || s[b + 1] === "M" ? 5 : 4,
      x = skipQuotedAttribute(s, b + y);
    if (x < 0 || x > e.length) {
      b = -1;
      break;
    }
    if (y === 5) {
      let w = readTagAttributes(s, b + y, x);
      if (w.get("name")?.toLowerCase() === "viewport") r = w.get("content") ?? "";
    }
    ((h = x), (b = findTagOutsideComments(s, META_OR_WBR_TAG_REGEX, x)));
  }
  if (b < 0 && !(r !== void 0 && hasViewportFitCover(r))) {
    META_TAG_REGEX.lastIndex = h;
    for (let match = META_TAG_REGEX.exec(e); match !== null; match = META_TAG_REGEX.exec(e)) {
      let sliced = e.slice(match.index, match.index + HTML_HEAD_SCAN_LIMIT),
        w = sliced.includes(">") ? skipQuotedAttribute(sliced, 5) : -1;
      if (w < 0) continue;
      let R = readTagAttributes(sliced, 5, w);
      if (R.get("name")?.toLowerCase() === "viewport") {
        if (((r = R.get("content") ?? ""), hasViewportFitCover(r))) return !0;
      }
    }
  }
  return r === void 0 ? n : hasViewportFitCover(r);
}
//@ chunk-06y4szbn.js:69489-69534 placement
var da = `</head><body>
`,
  Ln = `
</body></html>`;
//@ chunk-06y4szbn.js:69534-69661 placement
function composeArtifactPage(e, n, r) {
  let s = n !== void 0 && isValidLangTag(n) ? ` lang="${n}"` : "",
    h = needsViewportMeta(e, r) ? META_VIEWPORT_COVER + fl : META_VIEWPORT + ul;
  return `${HTML_DOC_PREFIX}${s}><head>${h}${da}${e}${Ln}`;
}
//@ chunk-06y4szbn.js:69661-69699 placement
function Er(e, n, r) {
  return skipQuotedAttribute(e, n) === r;
}
//@ chunk-06y4szbn.js:69699-69761 placement
function startsWithSkeletonOpen(e) {
  return HTML_DOCTYPE_REGEX.test(e) && e.startsWith(HTML_OPEN_TAG, HTML_DOCTYPE.length);
}
//@ chunk-06y4szbn.js:69761-70927 placement
function unwrapSkeletonDocument(e) {
  if (!startsWithSkeletonOpen(e)) return null;
  if (!e.startsWith(HTML_DOCTYPE)) e = HTML_DOCTYPE + e.slice(HTML_DOCTYPE.length);
  let match = e.match(/^<!doctype html><html(?=[\t\n\f\r >])([^>]*)><head(?=[\t\n\f\r >])[^>]*>/);
  if (!match) return null;
  let r = HTML_DOC_PREFIX.length + match[1].length + 1;
  if (!Er(e, HTML_DOC_PREFIX.length, r) || !Er(e, r + 5, match[0].length)) return null;
  let index = e.indexOf("</head><body", match[0].length);
  if (index === -1) return null;
  let match_2 = e
    .slice(match[0].length, index)
    .match(
      /^<meta[\t\n\f\r ]+charset="?utf8"?(?=[\t\n\f\r >"])[^>]*>(<meta[\t\n\f\r ]+name="?viewport"?(?=[\t\n\f\r >"])[^>]*>)<style(?:[\t\n\f\r ][^>]*)?>([\s\S]*)<\/style>$/,
    );
  if (!match_2 || /<\/style/i.test(match_2[2])) return null;
  {
    let q = match[0].length;
    for (let W of ["<meta", "<meta", "<style"]) {
      let G = e.indexOf(">", q + W.length) + 1;
      if (!e.startsWith(W, q) || !Er(e, q + W.length, G)) return null;
      q = G;
    }
  }
  let y = index + 12,
    x = skipQuotedAttribute(e, y);
  if (x < 0) return null;
  let sliced = e.slice(y, x - 1);
  if (!/^(?:[\t\n\f\r ][^>]*)?$/.test(sliced)) return null;
  let R = x;
  if (
    e[R] ===
    `
`
  )
    R++;
  let C = trimTrailingComments(e, R);
  if (!C) return null;
  let bodyEnd = C.bodyEnd;
  if (
    bodyEnd > R &&
    e[bodyEnd - 1] ===
      `
`
  )
    bodyEnd--;
  let V = match[1].match(/[\t\n\f\r ]lang="([^"]*)"/)?.[1],
    L = readTagAttributes(match_2[1], 5, match_2[1].length);
  return {
    body: e.slice(R, bodyEnd),
    ...(V !== void 0 && isValidLangTag(V) && { lang: V }),
    cover: hasViewportFitCover(L.get("content") ?? ""),
    ...(C.commentsDropped && { hoistedCommentsDropped: !0 }),
  };
}
//@ chunk-06y4szbn.js:70927-71368 placement
function trimTrailingComments(e, n) {
  let r = !1,
    s = e.length,
    h = !1;
  for (;;) {
    while (
      s > n &&
      `	
\f\r `.includes(e[s - 1])
    )
      s--;
    if (e.endsWith("-->", s)) {
      let index = e.lastIndexOf("<!--", s - 7);
      if (index < n || !isHtmlCommentOnly(e.slice(index, s))) return null;
      ((r = !0), (s = index));
    } else if (!h && s - n >= 7 && e.endsWith("</html>", s)) ((h = !0), (s -= 7));
    else if (h && s - n >= 7 && e.endsWith("</body>", s)) {
      let b = s - 7;
      if (r) {
        let index = e.lastIndexOf("<!--", b);
        if (index >= n && e.lastIndexOf("-->", b) < index + 4) return null;
      }
      return { bodyEnd: b, commentsDropped: r };
    } else return null;
  }
}
//@ chunk-06y4szbn.js:71368-71665 placement
function repairNestedPage(e, n, r, s, h) {
  let b = 0,
    y = !1;
  for (;;) {
    spendStripPass(h);
    let w = matchSkeletonPrefix(e);
    if (w !== null) {
      if (b === Xs) throw new StripUnsettledError("levels", h.spent);
      ((e = w.body), (n = w.lang ?? n), (r = w.cover), b++, (y = !1));
      continue;
    }
    y ||= fa(e);
    let R = s(e);
    if (R === e) break;
    e = R;
  }
  let x = y ? (b > 0 ? "partial" : "miss") : b > 0 ? "repaired" : void 0;
  return { body: e, lang: n, cover: r, outcome: x };
}
//@ chunk-06y4szbn.js:71665-71741 placement
function fa(e) {
  if (!startsWithSkeletonOpen(e)) return !1;
  let index = e.indexOf(FRAME_RUNTIME_SENTINELS);
  return index !== -1 && index < FRAME_RUNTIME_HEAD_WINDOW;
}
//@ chunk-06y4szbn.js:71741-72501 placement
function matchSkeletonPrefix(e) {
  if (!startsWithSkeletonOpen(e)) return null;
  let n = HTML_DOC_PREFIX.length,
    r = (w) => {
      if (!e.startsWith(w, n)) return !1;
      return ((n += w.length), !0);
    },
    s;
  if (r(' lang="')) {
    let index = e.indexOf('"', n);
    if (index === -1 || !isValidLangTag(e.slice(n, index))) return null;
    ((s = e.slice(n, index)), (n = index + 1));
  }
  if (!r("><head>" + FRAME_RUNTIME_SENTINELS)) return null;
  let h = n + FRAME_RUNTIME_MAX_SPAN,
    b = 0;
  while (b < 2 && r("<script>")) {
    let index = e.indexOf("</script>", n);
    if (index === -1 || index > h) return null;
    let sliced = e.slice(n, index);
    if (sliced === "" || sliced.includes("<!--") || /<\/script/i.test(sliced)) return null;
    ((n = index + 9), b++);
  }
  if (b === 0 || !r(Dt)) return null;
  let y = r(META_VIEWPORT_COVER);
  if (!y && !r(META_VIEWPORT)) return null;
  if (!r("<style>")) return null;
  let index = e.indexOf("</style>", n);
  if (index === -1 || e.slice(n, index).includes("<")) return null;
  if (((n = index + 8), !r(da))) return null;
  if (e.length - n < Ln.length || !e.endsWith(Ln)) return null;
  return { body: e.slice(n, e.length - Ln.length), lang: s, cover: y };
}
//@ chunk-06y4szbn.js:72501-72598 placement
function mintRoundTripPublishSignal(e) {
  let freeze = Object.freeze({ slug: e });
  return (getLiveState().mintedRoundTripPublishSignals.add(freeze), freeze);
}
//@ chunk-06y4szbn.js:72598-72694 placement
function isMintedRoundTripPublishSignal(e) {
  return typeof e === "object" && e !== null && getLiveState().mintedRoundTripPublishSignals.has(e);
}

export {
  unwrapSkeletonDocument,
  repairNestedPage,
  fa,
  composeArtifactPage,
  isMintedRoundTripPublishSignal,
  startsWithSkeletonOpen,
  mintRoundTripPublishSignal,
};
