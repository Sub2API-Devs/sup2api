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
  BASE_STYLE_HEAD_WITH_SAFE_AREA,
  BASE_STYLE_HEAD,
  spendStripPass,
  MAX_NESTED_SKELETON_LEVELS,
  StripUnsettledError,
  FRAME_RUNTIME_HEAD_WINDOW,
  FRAME_RUNTIME_MAX_SPAN,
} from "./pagePreparation.js";
import { skipQuotedAttribute, FRAME_RUNTIME_SENTINELS, FRAME_RUNTIME_END_MARKER } from "./pageRuntimes.js";
import { isHtmlCommentOnly } from "./capabilityRoster.js";
import { getLiveState } from "../liveReplica/liveReplica.js";

//@ chunk-06y4szbn.js:67830-68237 placement = sanitizeMessageHTML (0.385)
/**
 * HTML 文档前缀与 meta 常量。旧版名 sanitizeMessageHTML 为错配；疑似归错文件（HTML 预览/发布）。
 */
var HTML_DOCTYPE = "<!doctype html>";
var HTML_OPEN_TAG = "<html";
var HTML_DOC_PREFIX = HTML_DOCTYPE + HTML_OPEN_TAG;
var HTML_DOCTYPE_REGEX = new RegExp(`^${HTML_DOCTYPE}`, "i");
var META_VIEWPORT_COVER =
  '<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">';
var META_VIEWPORT = '<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1">';
var META_OR_WBR_TAG_REGEX = /^<(?:meta|wbr)(?=[\t\n\f\r />])/i;
var META_TAG_REGEX = /<meta(?=[\t\n\f\r /])/gi;
var HTML_HEAD_SCAN_LIMIT = 1024;
var VIEWPORT_CONTENT_PAIR_REGEX = /([^\t\n\f\r =,]+)[^=,]*[\t\n\f\r =]*([^\t\n\f\r =,]*)/g;
//@ chunk-06y4szbn.js:68237-68371 placement
/**
 * viewport content 里 viewport-fit=cover。疑似归错文件。
 */
function hasViewportFitCover(e) {
  let n = "";
  for (let [, r = "", s = ""] of e.matchAll(VIEWPORT_CONTENT_PAIR_REGEX))
    if (r.toLowerCase() === "viewport-fit") n = s.toLowerCase();
  return n === "cover";
}
//@ chunk-06y4szbn.js:68371-68875 placement
function readTagAttributes(e, n, r) {
  let s = new Map();
  let h = r - 1;
  let b = n;
  for (;;) {
    while (b < h && /[\t\n\f\r /]/.test(e[b])) b++;
    if (b >= h) return s;
    let y = "";
    do {
      y += e[b].toLowerCase();
      b++;
    } while (b < h && !/[\t\n\f\r /=>]/.test(e[b]));
    while (b < h && /[\t\n\f\r ]/.test(e[b])) b++;
    let x = "";
    if (b < h && e[b] === "=") {
      b++;
      while (b < h && /[\t\n\f\r ]/.test(e[b])) b++;
      let w = e[b];
      if (b < h && (w === '"' || w === "'")) {
        let index = e.indexOf(w, b + 1);
        if (index < 0 || index >= h) return s;
        x = e.slice(b + 1, index);
        b = index + 1;
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
function needsViewportMeta(e, n = true) {
  if (!/<meta[\t\n\f\r />]/i.test(e)) return n;
  let r;
  let s = e + "<wbr>";
  let lastIndex = 0;
  let tagOutsideComments = findTagOutsideComments(s, META_OR_WBR_TAG_REGEX, 0);
  while (tagOutsideComments >= 0 && tagOutsideComments < e.length) {
    let y = s[tagOutsideComments + 1] === "m" || s[tagOutsideComments + 1] === "M" ? 5 : 4;
    let x = skipQuotedAttribute(s, tagOutsideComments + y);
    if (x < 0 || x > e.length) {
      tagOutsideComments = -1;
      break;
    }
    if (y === 5) {
      let tagAttributes = readTagAttributes(s, tagOutsideComments + y, x);
      if (tagAttributes.get("name")?.toLowerCase() === "viewport") r = tagAttributes.get("content") ?? "";
    }
    lastIndex = x;
    tagOutsideComments = findTagOutsideComments(s, META_OR_WBR_TAG_REGEX, x);
  }
  if (tagOutsideComments < 0 && !(r !== undefined && hasViewportFitCover(r))) {
    META_TAG_REGEX.lastIndex = lastIndex;
    for (let match = META_TAG_REGEX.exec(e); match !== null; match = META_TAG_REGEX.exec(e)) {
      let sliced = e.slice(match.index, match.index + HTML_HEAD_SCAN_LIMIT);
      let w = sliced.includes(">") ? skipQuotedAttribute(sliced, 5) : -1;
      if (w < 0) continue;
      let tagAttributes = readTagAttributes(sliced, 5, w);
      if (tagAttributes.get("name")?.toLowerCase() === "viewport") {
        r = tagAttributes.get("content") ?? "";
        if (hasViewportFitCover(r)) return true;
      }
    }
  }
  return r === undefined ? n : hasViewportFitCover(r);
}
//@ chunk-06y4szbn.js:69489-69534 placement
var HEAD_BODY_CLOSE = `</head><body>
`;
var BODY_HTML_CLOSE = `
</body></html>`;
//@ chunk-06y4szbn.js:69534-69661 placement
function composeArtifactPage(body, roundTripLang, roundTripCover) {
  let s = roundTripLang !== undefined && isValidLangTag(roundTripLang) ? ` lang="${roundTripLang}"` : "";
  let h = needsViewportMeta(body, roundTripCover)
    ? META_VIEWPORT_COVER + BASE_STYLE_HEAD_WITH_SAFE_AREA
    : META_VIEWPORT + BASE_STYLE_HEAD;
  return `${HTML_DOC_PREFIX}${s}><head>${h}${HEAD_BODY_CLOSE}${body}${BODY_HTML_CLOSE}`;
}
//@ chunk-06y4szbn.js:69661-69699 placement
function pinnedAttrEquals(e, n, r) {
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
  if (!pinnedAttrEquals(e, HTML_DOC_PREFIX.length, r) || !pinnedAttrEquals(e, r + 5, match[0].length))
    return null;
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
      if (!e.startsWith(W, q) || !pinnedAttrEquals(e, q + W.length, G)) return null;
      q = G;
    }
  }
  let y = index + 12;
  let x = skipQuotedAttribute(e, y);
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
  let V = match[1].match(/[\t\n\f\r ]lang="([^"]*)"/)?.[1];
  let tagAttributes = readTagAttributes(match_2[1], 5, match_2[1].length);
  return {
    body: e.slice(R, bodyEnd),
    ...(V !== undefined &&
      isValidLangTag(V) && {
        lang: V,
      }),
    cover: hasViewportFitCover(tagAttributes.get("content") ?? ""),
    ...(C.commentsDropped && {
      hoistedCommentsDropped: true,
    }),
  };
}
//@ chunk-06y4szbn.js:70927-71368 placement
function trimTrailingComments(e, n) {
  let r = false;
  let s = e.length;
  let h = false;
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
      r = true;
      s = index;
    } else if (!h && s - n >= 7 && e.endsWith("</html>", s)) {
      h = true;
      s -= 7;
    } else if (h && s - n >= 7 && e.endsWith("</body>", s)) {
      let b = s - 7;
      if (r) {
        let index = e.lastIndexOf("<!--", b);
        if (index >= n && e.lastIndexOf("-->", b) < index + 4) return null;
      }
      return {
        bodyEnd: b,
        commentsDropped: r,
      };
    } else return null;
  }
}
//@ chunk-06y4szbn.js:71368-71665 placement
function repairNestedPage(body, lang, cover, s, stripBudget) {
  let b = 0;
  let y = false;
  for (;;) {
    spendStripPass(stripBudget);
    let w = matchSkeletonPrefix(body);
    if (w !== null) {
      if (b === MAX_NESTED_SKELETON_LEVELS) throw new StripUnsettledError("levels", stripBudget.spent);
      body = w.body;
      lang = w.lang ?? lang;
      cover = w.cover;
      b++;
      y = false;
      continue;
    }
    y ||= hasRuntimeSentinelsInHead(body);
    let R = s(body);
    if (R === body) break;
    body = R;
  }
  let outcome = y ? (b > 0 ? "partial" : "miss") : b > 0 ? "repaired" : undefined;
  return {
    body,
    lang,
    cover,
    outcome,
  };
}
//@ chunk-06y4szbn.js:71665-71741 placement
function hasRuntimeSentinelsInHead(e) {
  if (!startsWithSkeletonOpen(e)) return false;
  let index = e.indexOf(FRAME_RUNTIME_SENTINELS);
  return index !== -1 && index < FRAME_RUNTIME_HEAD_WINDOW;
}
//@ chunk-06y4szbn.js:71741-72501 placement
function matchSkeletonPrefix(e) {
  if (!startsWithSkeletonOpen(e)) return null;
  let n = HTML_DOC_PREFIX.length;
  let r = (w) => {
    if (!e.startsWith(w, n)) return false;
    n += w.length;
    return true;
  };
  let lang;
  if (r(' lang="')) {
    let index = e.indexOf('"', n);
    if (index === -1 || !isValidLangTag(e.slice(n, index))) return null;
    lang = e.slice(n, index);
    n = index + 1;
  }
  if (!r("><head>" + FRAME_RUNTIME_SENTINELS)) return null;
  let h = n + FRAME_RUNTIME_MAX_SPAN;
  let b = 0;
  while (b < 2 && r("<script>")) {
    let index = e.indexOf("</script>", n);
    if (index === -1 || index > h) return null;
    let sliced = e.slice(n, index);
    if (sliced === "" || sliced.includes("<!--") || /<\/script/i.test(sliced)) return null;
    n = index + 9;
    b++;
  }
  if (b === 0 || !r(FRAME_RUNTIME_END_MARKER)) return null;
  let y = r(META_VIEWPORT_COVER);
  if (!y && !r(META_VIEWPORT)) return null;
  if (!r("<style>")) return null;
  let index = e.indexOf("</style>", n);
  if (index === -1 || e.slice(n, index).includes("<")) return null;
  n = index + 8;
  if (!r(HEAD_BODY_CLOSE)) return null;
  if (e.length - n < BODY_HTML_CLOSE.length || !e.endsWith(BODY_HTML_CLOSE)) return null;
  return {
    body: e.slice(n, e.length - BODY_HTML_CLOSE.length),
    lang,
    cover: y,
  };
}
//@ chunk-06y4szbn.js:72501-72598 placement
function mintRoundTripPublishSignal(slug) {
  let n = Object.freeze({
    slug,
  });
  getLiveState().mintedRoundTripPublishSignals.add(n);
  return n;
}
//@ chunk-06y4szbn.js:72598-72694 placement
function isMintedRoundTripPublishSignal(roundTrip) {
  return (
    typeof roundTrip === "object" &&
    roundTrip !== null &&
    getLiveState().mintedRoundTripPublishSignals.has(roundTrip)
  );
}
export {
  unwrapSkeletonDocument,
  repairNestedPage,
  hasRuntimeSentinelsInHead,
  composeArtifactPage,
  isMintedRoundTripPublishSignal,
  startsWithSkeletonOpen,
  mintRoundTripPublishSignal,
};
