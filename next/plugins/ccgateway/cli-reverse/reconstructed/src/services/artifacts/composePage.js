/**
 * services/artifacts/composePage.ts
 *
 * 2.1.316 新增：组装发布页面（骨架文档解包、viewport meta、嵌套页修复）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (15)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51jy8ztq.js:70082-70489 placement (2.1.88 match: sanitizeMessageHTML, 0.385)
/**
 * HTML 文档前缀与 meta 常量。旧版名 sanitizeMessageHTML 为错配；疑似归错文件（HTML 预览/发布）。
 */
var HTML_DOCTYPE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HTML_OPEN_TAG;
var HTML_DOC_PREFIX;
var HTML_DOCTYPE_REGEX;
var META_VIEWPORT_COVER;
var META_VIEWPORT;
var META_OR_WBR_TAG_REGEX;
var META_TAG_REGEX;
var HTML_HEAD_SCAN_LIMIT;
var VIEWPORT_CONTENT_PAIR_REGEX;
deferInit("chunk-51jy8ztq.js:70082", () => {
  HTML_DOCTYPE = "<!doctype html>";
  HTML_OPEN_TAG = "<html";
  HTML_DOC_PREFIX = HTML_DOCTYPE + HTML_OPEN_TAG;
  HTML_DOCTYPE_REGEX = new RegExp(`^${HTML_DOCTYPE}`, "i");
  META_VIEWPORT_COVER =
    '<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">';
  META_VIEWPORT = '<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1">';
  META_OR_WBR_TAG_REGEX = /^<(?:meta|wbr)(?=[\t\n\f\r />])/i;
  META_TAG_REGEX = /<meta(?=[\t\n\f\r /])/gi;
  HTML_HEAD_SCAN_LIMIT = 1024;
  VIEWPORT_CONTENT_PAIR_REGEX = /([^\t\n\f\r =,]+)[^=,]*[\t\n\f\r =]*([^\t\n\f\r =,]*)/g;
});
//@ chunk-51jy8ztq.js:70489-70623 placement
/**
 * viewport content 里 viewport-fit=cover。疑似归错文件。
 */
function hasViewportFitCover(content) {
  let fit = "";
  for (let [, key = "", value = ""] of content.matchAll(VIEWPORT_CONTENT_PAIR_REGEX))
    if (key.toLowerCase() === "viewport-fit") fit = value.toLowerCase();
  return fit === "cover";
}
//@ chunk-51jy8ztq.js:70623-71127 placement
function readTagAttributes(text, start, end) {
  let attrs = new Map();
  let limit = end - 1;
  let index = start;
  for (;;) {
    while (index < limit && /[\t\n\f\r /]/.test(text[index])) index++;
    if (index >= limit) return attrs;
    let name = "";
    do {
      name += text[index].toLowerCase();
      index++;
    } while (index < limit && !/[\t\n\f\r /=>]/.test(text[index]));
    while (index < limit && /[\t\n\f\r ]/.test(text[index])) index++;
    let value = "";
    if (index < limit && text[index] === "=") {
      index++;
      while (index < limit && /[\t\n\f\r ]/.test(text[index])) index++;
      let quote = text[index];
      if (index < limit && (quote === '"' || quote === "'")) {
        let index_2 = text.indexOf(quote, index + 1);
        if (index_2 < 0 || index_2 >= limit) return attrs;
        value = text.slice(index + 1, index_2);
        index = index_2 + 1;
      } else {
        let valueStart = index;
        while (index < limit && !/[\t\n\f\r >]/.test(text[index])) index++;
        value = text.slice(valueStart, index);
      }
    }
    if (!attrs.has(name)) attrs.set(name, value);
  }
}
//@ chunk-51jy8ztq.js:71127-71741 placement
function needsViewportMeta(html, defaultResult = true) {
  if (!/<meta[\t\n\f\r />]/i.test(html)) return defaultResult;
  let viewportContent;
  let paddedHtml = html + "<wbr>";
  let lastIndex = 0;
  let tagOutsideComments = findTagOutsideComments(paddedHtml, META_OR_WBR_TAG_REGEX, 0);
  while (tagOutsideComments >= 0 && tagOutsideComments < html.length) {
    let tagNameLength =
      paddedHtml[tagOutsideComments + 1] === "m" || paddedHtml[tagOutsideComments + 1] === "M" ? 5 : 4;
    let tagEnd = skipQuotedAttribute(paddedHtml, tagOutsideComments + tagNameLength);
    if (tagEnd < 0 || tagEnd > html.length) {
      tagOutsideComments = -1;
      break;
    }
    if (tagNameLength === 5) {
      let tagAttributes = readTagAttributes(paddedHtml, tagOutsideComments + tagNameLength, tagEnd);
      if (tagAttributes.get("name")?.toLowerCase() === "viewport")
        viewportContent = tagAttributes.get("content") ?? "";
    }
    lastIndex = tagEnd;
    tagOutsideComments = findTagOutsideComments(paddedHtml, META_OR_WBR_TAG_REGEX, tagEnd);
  }
  if (tagOutsideComments < 0 && !(viewportContent !== undefined && hasViewportFitCover(viewportContent))) {
    META_TAG_REGEX.lastIndex = lastIndex;
    for (let match = META_TAG_REGEX.exec(html); match !== null; match = META_TAG_REGEX.exec(html)) {
      let text = html.slice(match.index, match.index + HTML_HEAD_SCAN_LIMIT);
      let tagEnd = text.includes(">") ? skipQuotedAttribute(text, 5) : -1;
      if (tagEnd < 0) continue;
      let tagAttributes = readTagAttributes(text, 5, tagEnd);
      if (tagAttributes.get("name")?.toLowerCase() === "viewport") {
        viewportContent = tagAttributes.get("content") ?? "";
        if (hasViewportFitCover(viewportContent)) return true;
      }
    }
  }
  return viewportContent === undefined ? defaultResult : hasViewportFitCover(viewportContent);
}
//@ chunk-51jy8ztq.js:71741-71786 placement
var HEAD_BODY_CLOSE = `</head><body>
`;
var BODY_HTML_CLOSE = `
</body></html>`;
//@ chunk-51jy8ztq.js:71786-71913 placement
function composeArtifactPage(html, tag, defaultResult) {
  let langAttr = tag !== undefined && isValidLangTag(tag) ? ` lang="${tag}"` : "";
  let needsViewport = needsViewportMeta(html, defaultResult)
    ? META_VIEWPORT_COVER + BASE_STYLE_HEAD_WITH_SAFE_AREA
    : META_VIEWPORT + BASE_STYLE_HEAD;
  return `${HTML_DOC_PREFIX}${langAttr}><head>${needsViewport}${HEAD_BODY_CLOSE}${html}${BODY_HTML_CLOSE}`;
}
//@ chunk-51jy8ztq.js:71913-71951 placement
function pinnedAttrEquals(text, start, end) {
  return skipQuotedAttribute(text, start) === end;
}
//@ chunk-51jy8ztq.js:71951-72013 placement
function startsWithSkeletonOpen(html) {
  return HTML_DOCTYPE_REGEX.test(html) && html.startsWith(HTML_OPEN_TAG, HTML_DOCTYPE.length);
}
//@ chunk-51jy8ztq.js:72013-73179 placement
function unwrapSkeletonDocument(html) {
  if (!startsWithSkeletonOpen(html)) return null;
  if (!html.startsWith(HTML_DOCTYPE)) html = HTML_DOCTYPE + html.slice(HTML_DOCTYPE.length);
  let match = html.match(/^<!doctype html><html(?=[\t\n\f\r >])([^>]*)><head(?=[\t\n\f\r >])[^>]*>/);
  if (!match) return null;
  let headStart = HTML_DOC_PREFIX.length + match[1].length + 1;
  if (
    !pinnedAttrEquals(html, HTML_DOC_PREFIX.length, headStart) ||
    !pinnedAttrEquals(html, headStart + 5, match[0].length)
  )
    return null;
  let index = html.indexOf("</head><body", match[0].length);
  if (index === -1) return null;
  let match_2 = html
    .slice(match[0].length, index)
    .match(
      /^<meta[\t\n\f\r ]+charset="?utf8"?(?=[\t\n\f\r >"])[^>]*>(<meta[\t\n\f\r ]+name="?viewport"?(?=[\t\n\f\r >"])[^>]*>)<style(?:[\t\n\f\r ][^>]*)?>([\s\S]*)<\/style>$/,
    );
  if (!match_2 || /<\/style/i.test(match_2[2])) return null;
  {
    let cursor = match[0].length;
    for (let tag of ["<meta", "<meta", "<style"]) {
      let tagEnd = html.indexOf(">", cursor + tag.length) + 1;
      if (!html.startsWith(tag, cursor) || !pinnedAttrEquals(html, cursor + tag.length, tagEnd)) return null;
      cursor = tagEnd;
    }
  }
  let bodyStart = index + 12;
  let bodyTagEnd = skipQuotedAttribute(html, bodyStart);
  if (bodyTagEnd < 0) return null;
  let sliced = html.slice(bodyStart, bodyTagEnd - 1);
  if (!/^(?:[\t\n\f\r ][^>]*)?$/.test(sliced)) return null;
  let contentStart = bodyTagEnd;
  if (
    html[contentStart] ===
    `
`
  )
    contentStart++;
  let trimmed = trimTrailingComments(html, contentStart);
  if (!trimmed) return null;
  let bodyEnd = trimmed.bodyEnd;
  if (
    bodyEnd > contentStart &&
    html[bodyEnd - 1] ===
      `
`
  )
    bodyEnd--;
  let lang = match[1].match(/[\t\n\f\r ]lang="([^"]*)"/)?.[1];
  let tagAttributes = readTagAttributes(match_2[1], 5, match_2[1].length);
  return {
    body: html.slice(contentStart, bodyEnd),
    ...(lang !== undefined &&
      isValidLangTag(lang) && {
        lang,
      }),
    cover: hasViewportFitCover(tagAttributes.get("content") ?? ""),
    ...(trimmed.commentsDropped && {
      hoistedCommentsDropped: true,
    }),
  };
}
//@ chunk-51jy8ztq.js:73179-73620 placement
function trimTrailingComments(html, start) {
  let commentsDropped = false;
  let end = html.length;
  let sawHtmlClose = false;
  for (;;) {
    while (
      end > start &&
      `	
\f\r `.includes(html[end - 1])
    )
      end--;
    if (html.endsWith("-->", end)) {
      let index = html.lastIndexOf("<!--", end - 7);
      if (index < start || !isHtmlCommentOnly(html.slice(index, end))) return null;
      commentsDropped = true;
      end = index;
    } else if (!sawHtmlClose && end - start >= 7 && html.endsWith("</html>", end)) {
      sawHtmlClose = true;
      end -= 7;
    } else if (sawHtmlClose && end - start >= 7 && html.endsWith("</body>", end)) {
      let bodyEnd = end - 7;
      if (commentsDropped) {
        let index = html.lastIndexOf("<!--", bodyEnd);
        if (index >= start && html.lastIndexOf("-->", bodyEnd) < index + 4) return null;
      }
      return {
        bodyEnd,
        commentsDropped,
      };
    } else return null;
  }
}
//@ chunk-51jy8ztq.js:73620-73917 placement
function repairNestedPage(html, lang, cover, stripPass, budget) {
  let levels = 0;
  let unsettled = false;
  for (;;) {
    spendStripPass(budget);
    let prefix = matchSkeletonPrefix(html);
    if (prefix !== null) {
      if (levels === MAX_NESTED_SKELETON_LEVELS) throw new StripUnsettledError("levels", budget.spent);
      html = prefix.body;
      lang = prefix.lang ?? lang;
      cover = prefix.cover;
      levels++;
      unsettled = false;
      continue;
    }
    unsettled ||= hasRuntimeSentinelsInHead(html);
    let stripped = stripPass(html);
    if (stripped === html) break;
    html = stripped;
  }
  let outcome = unsettled ? (levels > 0 ? "partial" : "miss") : levels > 0 ? "repaired" : undefined;
  return {
    body: html,
    lang,
    cover,
    outcome,
  };
}
//@ chunk-51jy8ztq.js:73917-73993 placement
function hasRuntimeSentinelsInHead(html) {
  if (!startsWithSkeletonOpen(html)) return false;
  let index = html.indexOf(FRAME_RUNTIME_SENTINELS);
  return index !== -1 && index < FRAME_RUNTIME_HEAD_WINDOW;
}
//@ chunk-51jy8ztq.js:73993-74753 placement
function matchSkeletonPrefix(html) {
  if (!startsWithSkeletonOpen(html)) return null;
  let cursor = HTML_DOC_PREFIX.length;
  let consume = (literal) => {
    if (!html.startsWith(literal, cursor)) return false;
    cursor += literal.length;
    return true;
  };
  let lang;
  if (consume(' lang="')) {
    let index = html.indexOf('"', cursor);
    if (index === -1 || !isValidLangTag(html.slice(cursor, index))) return null;
    lang = html.slice(cursor, index);
    cursor = index + 1;
  }
  if (!consume("><head>" + FRAME_RUNTIME_SENTINELS)) return null;
  let scriptSpanLimit = cursor + FRAME_RUNTIME_MAX_SPAN;
  let scriptCount = 0;
  while (scriptCount < 2 && consume("<script>")) {
    let index = html.indexOf("</script>", cursor);
    if (index === -1 || index > scriptSpanLimit) return null;
    let sliced = html.slice(cursor, index);
    if (sliced === "" || sliced.includes("<!--") || /<\/script/i.test(sliced)) return null;
    cursor = index + 9;
    scriptCount++;
  }
  if (scriptCount === 0 || !consume(FRAME_RUNTIME_END_MARKER)) return null;
  let hasViewportCover = consume(META_VIEWPORT_COVER);
  if (!hasViewportCover && !consume(META_VIEWPORT)) return null;
  if (!consume("<style>")) return null;
  let index = html.indexOf("</style>", cursor);
  if (index === -1 || html.slice(cursor, index).includes("<")) return null;
  cursor = index + 8;
  if (!consume(HEAD_BODY_CLOSE)) return null;
  if (html.length - cursor < BODY_HTML_CLOSE.length || !html.endsWith(BODY_HTML_CLOSE)) return null;
  return {
    body: html.slice(cursor, html.length - BODY_HTML_CLOSE.length),
    lang,
    cover: hasViewportCover,
  };
}
//@ chunk-51jy8ztq.js:74753-74850 placement
function mintRoundTripPublishSignal(slug) {
  let options = Object.freeze({
    slug,
  });
  getLiveState().mintedRoundTripPublishSignals.add(options);
  return options;
}
//@ chunk-51jy8ztq.js:74850-74946 placement
function isMintedRoundTripPublishSignal(roundTrip) {
  return (
    typeof roundTrip === "object" &&
    roundTrip !== null &&
    getLiveState().mintedRoundTripPublishSignals.has(roundTrip)
  );
}
export {
  isMintedRoundTripPublishSignal,
  unwrapSkeletonDocument,
  repairNestedPage,
  hasRuntimeSentinelsInHead,
  composeArtifactPage,
  startsWithSkeletonOpen,
  mintRoundTripPublishSignal,
};
