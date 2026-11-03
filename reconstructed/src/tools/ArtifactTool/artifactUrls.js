/**
 * tools/ArtifactTool/artifactUrls.ts
 *
 * 2.1.316 新增：解析 HTML 中的 artifact-thumbnail 链接（亮/暗色）；字符脚本分类正则等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yxnffbzs.js (87)
 * attribution: placement 87
 */
import { getClaudeAiOrigin } from "../../constants/product.js";
import {
  artifactViewerPath,
  encodeUuidBase58,
  parseArtifactUrl,
  VIEWER_PREFIX_RE,
  ARTIFACT_ID_PATTERN,
  R,
} from "./constants.js";
import {
  normalizeFullWidthSpace,
  urlPatternToRegex,
  truncateToLength,
  truncateCodePoints,
} from "../../utils/stringUtils.js";
import {
  COWRITTEN_ARTIFACT_HTML,
  ARTIFACT_FILE_CONTENT,
  ARTIFACT_CONTENT_AUTHORED_BY_OTHERS,
  ARTIFACT_ORIGIN_NOTES,
  ARTIFACT_STORED_DECLARATION,
  ARTIFACT_TYPE_INSTRUCTIONS,
  RESERVED_XML_TAGS,
  CHANNEL,
} from "../../constants/xml.js";
import {
  UK,
  bXt,
  confusableTagScrubPattern,
  YIt,
  LEAD_HEX_ID,
  LEAD_SPAN,
  LEAD_OPEN_END,
  buildLeadMarkerPattern,
  buildChannelTagMatcher,
  buildAntmlTagPattern,
  SXt,
} from "../../utils/confusables.js";
import { logForDebugging } from "../../utils/debug.js";
import { uniq, count } from "../../utils/collections.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import {
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
  I,
} from "../../utils/messages.js";
import { withConfusables, BRACKET_CONFUSABLES, BOX_DRAWING_RANGES } from "../../utils/sanitization.js";

//@ chunk-yxnffbzs.js:26471-26520 placement
function artifactViewerUrlFor(e) {
  return `${getClaudeAiOrigin(e.env)}${artifactViewerPath(e.slug)}`;
}
//@ chunk-yxnffbzs.js:26520-26567 placement
function ownedField(e) {
  return e === void 0 ? {} : { owned: e };
}
//@ chunk-yxnffbzs.js:26567-26623 placement
function writtenPage(e, n) {
  return { written: { url: artifactViewerUrlFor(e) }, ...ownedField(n) };
}
//@ chunk-yxnffbzs.js:26623-26743 placement
function artifactViewerUrlSpellings(e) {
  let n = getClaudeAiOrigin(e.env),
    r = encodeUuidBase58(e.slug);
  return [`${n}/code/artifact/${e.slug}`, ...(r !== null ? [`${n}/artifact/${r}`] : [])];
}
//@ chunk-yxnffbzs.js:26743-26840 placement
function classifierArtifactTargetFor(e, n) {
  let { target: target, other: other } = classifierArtifactTargetParts(e, n);
  return other === void 0 ? target : `${target} [same artifact: ${other}]`;
}
//@ chunk-yxnffbzs.js:26840-27095 placement
function classifierArtifactTargetParts(e, n) {
  let r = typeof e === "string" ? parseArtifactUrl(e) : null;
  if (r === null) return { target: n };
  let o = getClaudeAiOrigin(r.env),
    s = encodeUuidBase58(r.slug),
    a = `${o}/code/artifact/${r.slug}`;
  if (s === null) return { target: a };
  let u = `${o}/artifact/${s}`;
  return r.shortId ? { target: u, other: a } : { target: a, other: u };
}
//@ chunk-yxnffbzs.js:27095-27184 placement
function sameArtifactMark(e) {
  return e.other === void 0 ? "" : ` [same artifact: ${e.target} is ${e.other}]`;
}
//@ chunk-yxnffbzs.js:27184-27288 placement
function artifactContentOriginUrlFor(e) {
  return `https://${e.slug}.frame.${e.env === "staging" ? "staging." : ""}claudeusercontent.com`;
}
//@ chunk-yxnffbzs.js:27288-27359 placement
function canonicalArtifactTargetFor(e, n) {
  let r = typeof e === "string" ? parseArtifactUrl(e) : null;
  return r ? artifactViewerUrlFor(r) : n;
}
//@ chunk-yxnffbzs.js:27359-27464 placement
function isCanonicalArtifactViewerUrl(e) {
  let match = e.match(new RegExp(`^https://claude\\.ai${VIEWER_PREFIX_RE}(${ARTIFACT_ID_PATTERN})/?$`));
  return R(match?.[1]) !== null;
}
//@ chunk-yxnffbzs.js:27464-27953 placement
var TITLE_SCAN_CHARS = 8192,
  TITLE_SCAN_BYTES = TITLE_SCAN_CHARS * 4,
  TITLE_MAX_RUNES = 280,
  VERSION_LABEL_MAX = 60,
  Ue = /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
  h = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: "\xA0",
    ndash: "\u2013",
    mdash: "\u2014",
    minus: "\u2212",
    hellip: "\u2026",
    lsquo: "\u2018",
    rsquo: "\u2019",
    sbquo: "\u201A",
    ldquo: "\u201C",
    rdquo: "\u201D",
    bdquo: "\u201E",
    lsaquo: "\u2039",
    rsaquo: "\u203A",
    laquo: "\xAB",
    raquo: "\xBB",
    middot: "\xB7",
    bull: "\u2022",
    dagger: "\u2020",
    Dagger: "\u2021",
    prime: "\u2032",
    Prime: "\u2033",
    trade: "\u2122",
    copy: "\xA9",
    reg: "\xAE",
    deg: "\xB0",
    times: "\xD7",
  };
//@ chunk-yxnffbzs.js:27953-28014 placement
function oe(e) {
  return e.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
}
//@ chunk-yxnffbzs.js:28014-28102 placement
function w(e) {
  let n = oe(e.slice(0, TITLE_SCAN_CHARS)),
    search = n.search(/<svg/i);
  return search === -1 ? n : n.slice(0, search);
}
//@ chunk-yxnffbzs.js:28102-28416 placement
function decodeHtmlEntities(e) {
  return e.replace(Ue, (n, r) => {
    if (r.startsWith("#")) {
      let s = r[1] === "x" || r[1] === "X" ? parseInt(r.slice(2), 16) : parseInt(r.slice(1), 10);
      return s <= 1114111 && (s < 55296 || s > 57343) ? String.fromCodePoint(s) : n;
    }
    if (Object.hasOwn(h, r)) return h[r] ?? n;
    let lower = r.toLowerCase();
    if (Object.hasOwn(h, lower)) return h[lower] ?? n;
    return n;
  });
}
/**
 * 解析 artifact 缩略图 link 标签的正则。
 */
//@ chunk-yxnffbzs.js:28416-28787 placement
var THUMBNAIL_LINK_PATTERNS = /<link\b[^>]*>/gi,
  $e = 2048,
  ie = /<link\b[^>]{0,2048}\bartifact-thumbnail\b/gi,
  regExp_5 = new RegExp(ie.source, "i"),
  Me = /([^\s"'<>\/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g,
  ARTIFACT_THUMBNAIL = "artifact-thumbnail",
  Ge = /^\(\s*prefers-color-scheme\s*:\s*dark\s*\)$/i,
  Be = /^(?:all|\(\s*prefers-color-scheme\s*:\s*light\s*\))$/i,
  z = /<(script|style)\b[^>]{0,2048}>[\s\S]*?(?:<\/\1\s*>|$)/gi;
/**
 * 解析 HTML 中的 artifact-thumbnail 链接（亮/暗色）。
 */
//@ chunk-yxnffbzs.js:28787-29272 placement
function parseThumbnailLinks(e) {
  let n = [];
  for (let r of e.match(THUMBNAIL_LINK_PATTERNS) ?? []) {
    if (r.length > $e) {
      if (regExp_5.test(r)) n.push({ dark: !1, oversize: !0 });
      continue;
    }
    let o, s, a;
    for (let d of r.matchAll(Me)) {
      let lower = d[1].toLowerCase(),
        f = d[2] ?? d[3] ?? d[4] ?? "";
      if (lower === "rel") o ??= f;
      else if (lower === "href") s ??= f;
      else if (lower === "media") a ??= f;
    }
    if (!(o ?? "").toLowerCase().split(/\s+/).includes(ARTIFACT_THUMBNAIL)) continue;
    let trimmed = decodeHtmlEntities(a ?? "").trim(),
      matches = Ge.test(trimmed),
      l = trimmed === "" || Be.test(trimmed);
    n.push({
      ...(s !== void 0 && { href: decodeHtmlEntities(s).trim() }),
      dark: matches,
      ...(!matches && !l && { badMedia: trimmed }),
    });
  }
  return n;
}
//@ chunk-yxnffbzs.js:29272-29614 placement
function extractThumbnailLinks(e) {
  let n = { pastWindow: !1 },
    replaced = w(e).replace(z, "");
  for (let { href: href, dark: dark, badMedia: badMedia, oversize: oversize } of parseThumbnailLinks(
    replaced,
  ))
    if (oversize) n.oversizeTag = !0;
    else if (href === void 0) n.missingHref = !0;
    else if (badMedia !== void 0) n.badMedia ??= badMedia;
    else if (dark) n.dark ??= href;
    else n.light ??= href;
  let o = (s) => s.match(ie)?.length ?? 0;
  return ((n.pastWindow = e.includes(ARTIFACT_THUMBNAIL) && o(oe(e).replace(z, "")) > o(replaced)), n);
}
//@ chunk-yxnffbzs.js:29614-29707 placement
var FAVICON_MARKUP_RE = /[<>&"']/,
  Ye = [
    ["'", "'"],
    ['"', '"'],
    ["\u2018", "\u2019"],
    ["\u201C", "\u201D"],
    ["`", "`"],
  ];
//@ chunk-yxnffbzs.js:29707-29931 placement
function sanitizeFavicon(e) {
  let n = e;
  for (let r = 0; r < 4; r++) {
    let trimmed = n.trim();
    for (let [s, a] of Ye)
      if (trimmed.length > s.length + a.length - 1 && trimmed.startsWith(s) && trimmed.endsWith(a)) {
        trimmed = trimmed.slice(s.length, trimmed.length - a.length);
        break;
      }
    if (((trimmed = decodeHtmlEntities(trimmed)), trimmed === n)) break;
    n = trimmed;
  }
  return n;
}
/**
 * 标题字符检查用的 emoji 正则。
 */
//@ chunk-yxnffbzs.js:29931-30334 placement
var EMOJI_PATTERNS = String.raw`\p{Extended_Pictographic}[\ufe0e\ufe0f]?\p{Emoji_Modifier}?`,
  Ke = String.raw`\u{1f3f4}\u{e0067}\u{e0062}(?:\u{e0065}\u{e006e}\u{e0067}|\u{e0073}\u{e0063}\u{e0074}|\u{e0077}\u{e006c}\u{e0073})\u{e007f}`,
  ze = String.raw`(?:[#*0-9]\ufe0f?\u20e3|\p{Regional_Indicator}{2}|${Ke}|${EMOJI_PATTERNS}(?:\u200d${EMOJI_PATTERNS}){0,3})`,
  regExp_6 = new RegExp(`^${ze}{1,4}$`, "u"),
  Ve = /\p{Regional_Indicator}{2}.*\p{Regional_Indicator}/u;
//@ chunk-yxnffbzs.js:30334-30446 placement
function vetForeignFavicon(e) {
  if (typeof e !== "string" || e.length > 32) return;
  let n = sanitizeFavicon(e);
  return regExp_6.test(n) && !Ve.test(n) ? n : void 0;
}
//@ chunk-yxnffbzs.js:30446-30564 placement
function extractHtmlTitle(e) {
  let r = w(e).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (r === void 0) return null;
  return sanitizeArtifactTitle(decodeHtmlEntities(r));
}
//@ chunk-yxnffbzs.js:30564-30791 placement
function sanitizeArtifactTitle(e) {
  let trimmed = Array.from(e, (s) => {
    let a = s.codePointAt(0) ?? 0;
    return a <= 31 || (a >= 127 && a <= 159) ? " " : s;
  })
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  if (trimmed === "") return null;
  let list = Array.from(trimmed);
  return list.length > TITLE_MAX_RUNES ? list.slice(0, TITLE_MAX_RUNES).join("") : trimmed;
}
//@ chunk-yxnffbzs.js:30791-31262 placement
var QUOTE_HOMOGLYPHS =
    /[\u201C\u201D\u201E\u201F\u2E42\uFF02\u02F5\u02F6\u2033\u2034\u2036\u2037\u02BA\u02DD\u02EE\u05F4\u3003\u301D-\u301F\u275D\u275E\u2760\u{1F676}-\u{1F678}]/gu,
  SINGLE_QUOTE_RUNS =
    /['\u0060\u00B4\u02B9\u02BB\u02BC\u02BD\u02BE\u02BF\u02C8\u02CA\u02CB\u0374\u0384\u055A\u05F3\u07F4\u07F5\u1FBD\u1FBF\u1FEF\u1FFD\u1FFE\u2018\u2019\u201A\u201B\u2032\u2035\u275B\u275C\u275F\uA78B\uA78C\uFF07\uFF40]{2,}/g,
  INVISIBLE_BLANKS = /[\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]/gu;
//@ chunk-yxnffbzs.js:31262-31483 placement
function isDecisionSurfaceControl(e) {
  return (
    e <= 31 ||
    (e >= 127 && e <= 159) ||
    e === 173 ||
    e === 1564 ||
    (e >= 8203 && e <= 8207) ||
    e === 8232 ||
    e === 8233 ||
    (e >= 8234 && e <= 8238) ||
    (e >= 8288 && e <= 8297) ||
    (e >= 65024 && e <= 65039) ||
    e === 65279 ||
    (e >= 65529 && e <= 65531) ||
    e === 94180 ||
    (e >= 917504 && e <= 917999)
  );
}
//@ chunk-yxnffbzs.js:31483-31570 placement
var INVISIBLE_BLANK_CODE_POINT =
  /^[\p{Default_Ignorable_Code_Point}\u2800\u{1D159}\u{13441}\u{13442}\uFFFC]$/u;
//@ chunk-yxnffbzs.js:31570-31611 placement
function je(e) {
  return e === 8204 || e === 8205;
}
//@ chunk-yxnffbzs.js:31611-31674 placement
function ae(e) {
  return (e >= 65024 && e <= 65039) || (e >= 917760 && e <= 917999);
}
//@ chunk-yxnffbzs.js:31674-31710 placement
function isJoinerOrEmojiSelector(e) {
  return je(e) || ae(e);
}
//@ chunk-yxnffbzs.js:31710-31791 placement
function isResultLineControl(e) {
  return (
    !isJoinerOrEmojiSelector(e) &&
    (isDecisionSurfaceControl(e) || (e > 127 && INVISIBLE_BLANK_CODE_POINT.test(String.fromCodePoint(e))))
  );
}
/**
 * 字符脚本分类正则。
 */
//@ chunk-yxnffbzs.js:31791-32228 placement
var SCRIPT_PATTERNS = /^[\p{Extended_Pictographic}\p{Emoji_Modifier}]$/u,
  Je = 8,
  V = /^[#*0-9]$/,
  Ze = /^\p{Script=Han}$/u,
  Qe =
    /^[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Mongolian}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Sinhala}\p{Script=Myanmar}\p{Script=Tibetan}\p{Script=Khmer}]$/u,
  et = /^[\n\r\t\v\f\u0085\u2028\u2029]$/;
//@ chunk-yxnffbzs.js:32228-32403 placement
function rideStateAfter(e) {
  if ((e.codePointAt(0) ?? 0) < 128) return V.test(e) ? "keycap" : "plain";
  return SCRIPT_PATTERNS.test(e)
    ? "pictograph"
    : V.test(e)
      ? "keycap"
      : Ze.test(e)
        ? "han"
        : Qe.test(e)
          ? "joining"
          : "plain";
}
//@ chunk-yxnffbzs.js:32403-32667 placement
function selectorOrJoinerRides(e, n) {
  if (ae(e)) {
    let o = e <= 65039 ? n === "pictograph" || n === "han" || (n === "keycap" && e === 65039) : n === "han";
    return { rides: o, after: o && n === "pictograph" ? "selector" : "none" };
  }
  return {
    rides: e === 8205 ? n === "pictograph" || n === "selector" || n === "joining" : n === "joining",
    after: "none",
  };
}
//@ chunk-yxnffbzs.js:32667-33129 placement
function sweepResultLine(e, n, { joiners: r } = { joiners: !0 }) {
  let o = normalizeFullWidthSpace(e),
    s = [],
    a = 0,
    u = !1,
    c = 0,
    l = "none";
  for (let d of o) {
    if (++a > 16 * n || s.length >= n + 1) {
      u = !0;
      break;
    }
    let _ = d.codePointAt(0) ?? 0;
    if (!r && isJoinerOrEmojiSelector(_)) l = "none";
    else if (isJoinerOrEmojiSelector(_)) {
      let f = selectorOrJoinerRides(_, l);
      if (f.rides && c < Je) (s.push(d), c++, (l = f.after));
      else l = "none";
    } else if (et.test(d)) {
      if (s.length > 0 && s.at(-1) !== " ") s.push(" ");
      l = "none";
    } else if (!isResultLineControl(_)) (s.push(d), (l = rideStateAfter(d)));
    else l = "none";
  }
  if (s.length > n) u = !0;
  return { kept: scrubArtifactEnvelopeTags(s.slice(0, u ? n - 1 : n).join("")), cut: u };
}
//@ chunk-yxnffbzs.js:33129-33227 placement
function revealPageInvisibles(e) {
  let n = "",
    r = "none";
  for (let o of normalizeFullWidthSpace(e)) {
    let s = displayCharFor(o, r);
    ((n += s.shown), (r = s.after));
  }
  return n;
}
//@ chunk-yxnffbzs.js:33227-33472 placement
function displayCharFor(e, n) {
  let r = e.codePointAt(0) ?? 0;
  if (isJoinerOrEmojiSelector(r)) {
    let o = selectorOrJoinerRides(r, n);
    return { shown: o.rides ? e : "\uFFFD", after: o.after };
  }
  if (r === 10 || r === 13 || r === 9) return { shown: e, after: "none" };
  if (isResultLineControl(r)) return { shown: "\uFFFD", after: "none" };
  return { shown: e, after: rideStateAfter(e) };
}
//@ chunk-yxnffbzs.js:33472-33540 placement
function sweepResultLineField(e, n) {
  let { kept: kept, cut: cut } = sweepResultLine(e, n);
  return cut ? `${kept}\u2026` : kept;
}
//@ chunk-yxnffbzs.js:33540-33560 placement
var nt = 1024,
  rt = 2048;
//@ chunk-yxnffbzs.js:33560-33623 placement
function safePublishPath(e) {
  return typeof e === "string" ? sweepResultLineField(e, nt) : "(unknown)";
}
//@ chunk-yxnffbzs.js:33623-33687 placement
function safePublishUrl(e) {
  return typeof e === "string" ? sweepResultLineField(e, rt) : "(unknown)";
}
//@ chunk-yxnffbzs.js:33687-33698 placement
var ot = 512;
//@ chunk-yxnffbzs.js:33698-33749 placement
function markDisplayTokens(e) {
  return e.replace(regExp_9, (n) => `${n}\\`);
}
//@ chunk-yxnffbzs.js:33749-33786 placement
function refusalEcho(e) {
  return markDisplayTokens(sweepResultLineField(e, ot));
}
//@ chunk-yxnffbzs.js:33786-33867 placement
function sweepResultLineText(e, n) {
  let { kept: kept, cut: cut } = sweepResultLine(e, n, { joiners: !1 });
  return cut ? `${kept}\u2026` : kept;
}
//@ chunk-yxnffbzs.js:33867-33887 placement
var MAX_REFUSAL_CHARS = 500,
  MAX_SIZE_CLAUSE_CHARS = 600;
//@ chunk-yxnffbzs.js:33887-33996 placement
function isPublishShapedArtifactAction(e) {
  let n = e?.action;
  return n === void 0 || n === "publish" || n === "live-edit" || n === "sync" || n === "version";
}
//@ chunk-yxnffbzs.js:33996-34022 placement
var DEFAULT_LIST_LIMIT = 25,
  LIST_LIMIT_MAX = 200,
  TYPE_LIST_LIMIT_MAX = 50;
//@ chunk-yxnffbzs.js:34022-34092 placement
function listScopeFrom(e) {
  let scope = e.scope;
  return scope === "shared" || scope === "all" ? scope : "mine";
}
//@ chunk-yxnffbzs.js:34092-34221 placement
var ARTIFACT_PAGE_ENVELOPE_TAGS = [
    COWRITTEN_ARTIFACT_HTML,
    ARTIFACT_FILE_CONTENT,
    ARTIFACT_CONTENT_AUTHORED_BY_OTHERS,
    ARTIFACT_ORIGIN_NOTES,
    ARTIFACT_STORED_DECLARATION,
    ARTIFACT_TYPE_INSTRUCTIONS,
  ],
  j = ARTIFACT_PAGE_ENVELOPE_TAGS,
  it = ["tool_use_error", "sandbox_violations"],
  q = ["result", "name", "output", "error", "system"];
//@ chunk-yxnffbzs.js:34221-34479 placement
function confusableTagPatterns() {
  let { open: open, close: close, slash: slash } = UK,
    o = `[${open}][^${bXt}${open}${close}]*[${slash}]`,
    s = `(?<=[${bXt}$])[${open}][A-Za-z]`,
    a = confusableTagScrubPattern(q),
    u = confusableTagScrubPattern(q, ({ close: close }) => `[\\r\\n${YIt}]*[${close}]`);
  return [new RegExp(`(?=${o})${a.source}`, a.flags), new RegExp(`(?!${s})${u.source}`, u.flags)];
}
//@ chunk-yxnffbzs.js:34479-35524 placement
function artifactLeadTokens() {
  return [
    ["artifact", LEAD_HEX_ID],
    ["artifact", LEAD_SPAN, "owned", "by", "you"],
    ["artifact", LEAD_SPAN, "raw", "html", "follows"],
    ["artifact", LEAD_SPAN, "summary", "below"],
    ["artifact", LEAD_SPAN, "shared", "with", "you"],
    ["artifact", LEAD_SPAN, "published", "from", "your"],
    ["artifact", LEAD_SPAN, "live", "version"],
    ["artifact", LEAD_SPAN, "published", "by", "a", "writer"],
    ["this", "version", "has", LEAD_SPAN, "published", "files"],
    ["stored", "for", "the", "live", "version"],
    ["origin", "of", "this", "version"],
    ["created", "from", "the", "artifact", "type"],
    ["end", "of", "live", "content", LEAD_OPEN_END],
    ["end", "of", "live", "changes", LEAD_OPEN_END],
    ["an", "unchanged", "line", LEAD_OPEN_END],
    ["this", "artifact", LEAD_SPAN, "ships", "an", "instructions", "file"],
    ["could", "not", "check", "whether", "this", "artifact"],
    ["design", "system", "not", "attached"],
    ["design", "systems", "not", "listed"],
    ["design", "systems", "left", "out"],
    ["published", "types", "titled"],
    ["artifact", "types", "not", "listed"],
    ["type", "reference", "pages", "not", "attached"],
    ["a", "quickstart", "in", "this", "conversation"],
    ["the", "design", "guidance", "that", "came", "with"],
    ["how", "to", "build", "and", "iterate", "on"],
  ];
}
//@ chunk-yxnffbzs.js:35524-35776 placement
class ScrubPatternCache {
  #e;
  #t;
  #n;
  get lead() {
    return ((this.#e ??= buildLeadMarkerPattern(artifactLeadTokens())), this.#e);
  }
  get page() {
    return ((this.#t ??= [confusableTagScrubPattern(j), this.lead]), this.#t);
  }
  get envelopes() {
    return (
      (this.#n ??= [
        confusableTagScrubPattern(
          uniq([...j, "transcript", ...RESERVED_XML_TAGS.filter((e) => e !== CHANNEL), ...it]),
        ),
        ...confusableTagPatterns(),
        buildChannelTagMatcher(),
        buildAntmlTagPattern(),
        this.lead,
      ]),
      this.#n
    );
  }
}
//@ chunk-yxnffbzs.js:35776-35802 placement
var artifactTagPatterns = new HostScoped(() => new ScrubPatternCache());
//@ chunk-yxnffbzs.js:35802-35840 placement
function ce() {
  return artifactTagPatterns.of(getRootSession().host);
}
//@ chunk-yxnffbzs.js:35840-35872 placement
function artifactLeadScrubPattern() {
  return ce().lead;
}
//@ chunk-yxnffbzs.js:35872-35895 placement
var D = [
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
];
//@ chunk-yxnffbzs.js:35895-35945 placement
function containsInterruptLiteral(e) {
  return D.some((n) => e.includes(n));
}
//@ chunk-yxnffbzs.js:35945-36215 placement
var regExp_8 = new RegExp(
    D.map((e) => `${urlPatternToRegex(e.slice(0, 1))}(?=${urlPatternToRegex(e.slice(1))})`).join("|"),
    "g",
  ),
  regExp_9 = new RegExp(
    [
      "<(?=\\/?(?:tool_use_error|sandbox_violations|error)\\b)",
      "InputValidationError(?!\\\\)",
      ...D.map((e) => `${urlPatternToRegex(e.slice(0, 1))}(?=${urlPatternToRegex(e.slice(1, -1))})`),
    ].join("|"),
    "gi",
  );
//@ chunk-yxnffbzs.js:36215-36266 placement
function markInterruptLiterals(e) {
  return e.replace(regExp_8, (n) => `${n}\\`);
}
//@ chunk-yxnffbzs.js:36266-36403 placement
function scrubArtifactEnvelopeTags(e, n = "all") {
  let r = ce(),
    o = e;
  for (let s of n === "page" ? r.page : r.envelopes) o = o.replace(s, (a) => `${a}\\`);
  return n === "page" ? o : markInterruptLiterals(o);
}
//@ chunk-yxnffbzs.js:36403-36485 placement
function scrubbedHead(e, n, r = "all") {
  let o = scrubArtifactEnvelopeTags(truncateToLength(e, n), r);
  return o.length > n ? scrubArtifactEnvelopeTags(truncateToLength(e, n - 1), r) : o;
}
//@ chunk-yxnffbzs.js:36485-36628 placement
function scrubServerLine(e, n) {
  return scrubArtifactEnvelopeTags(
    truncateCodePoints(
      Array.from(truncateToLength(e, n * 4), (r) =>
        isDecisionSurfaceControl(r.codePointAt(0) ?? 0) ? " " : r,
      )
        .join("")
        .replace(INVISIBLE_BLANKS, " ")
        .replace(/\s+/g, " ")
        .trim(),
      n,
    ),
  );
}
//@ chunk-yxnffbzs.js:36628-36639 placement
var ARTIFACT_CARD_TITLE_MAX = 80;
//@ chunk-yxnffbzs.js:36639-36795 placement = ghIsDangerousCallback (1)
function sweptArtifactTitle(e) {
  return spacedFromClosingQuote(
    characterReferencesAsBrackets(
      sweepProvenanceMarker(
        (sweepAskCopy(sanitizeArtifactTitle(e ?? "") ?? "") ?? "")
          .replace(DECISION_SURFACE_BRACKETS_RE, " ")
          .replace(dt, "://"),
      ),
    )
      .replace(ANGLE_BRACKET_RUN_RE, " ")
      .replace(SCHEME_SEPARATOR_RE, DEFANGED_SCHEME_SEPARATOR)
      .replace(/\s+/g, " ")
      .trim(),
  );
}
//@ chunk-yxnffbzs.js:36795-36908 placement
function artifactCardTitle(e) {
  let n = sweptArtifactTitle(e),
    r = truncateToLength(n, ARTIFACT_CARD_TITLE_MAX);
  if (r === n) return n;
  return `${r.endsWith(":\u2215") ? r.slice(0, -1) : r}\u2026`;
}
//@ chunk-yxnffbzs.js:36908-37003 placement
function P(e) {
  return Array.from(e, (n) => (isDecisionSurfaceControl(n.codePointAt(0) ?? 0) ? " " : n))
    .join("")
    .replace(INVISIBLE_BLANKS, " ");
}
//@ chunk-yxnffbzs.js:37003-37226 placement
function withDroppedBlanksMarked(e) {
  if (P(e).trim() === "") return e;
  let n = "";
  for (let r of e) {
    let o =
      isDecisionSurfaceControl(r.codePointAt(0) ?? 0) ||
      INVISIBLE_BLANK_CODE_POINT.test(r) ||
      (r !== " " && /\s/.test(r));
    n += o ? "?" : r;
  }
  return n
    .replace(/"/g, "'")
    .replace(QUOTE_HOMOGLYPHS, "'")
    .replace(SINGLE_QUOTE_RUNS, "'?")
    .replace(_t, "?");
}
//@ chunk-yxnffbzs.js:37226-37286 placement
function withEdgeBlanksMarked(e) {
  return e.replace(/^ (?=\S)|(?<=\S) $/g, "?");
}
//@ chunk-yxnffbzs.js:37286-37362 placement
function foldedForSurface(e) {
  return characterReferencesAsBrackets(
    sweepProvenanceMarker(sweepAskCopy(e) ?? "").replace(DECISION_SURFACE_BRACKETS_RE, " "),
  ).replace(ANGLE_BRACKET_RUN_RE, "?");
}
//@ chunk-yxnffbzs.js:37362-37413 placement
function markedForBracketFold(e) {
  return withSchemeMarked(withDroppedBlanksMarked(e)).replace(DECISION_SURFACE_BRACKETS_RE, "?");
}
//@ chunk-yxnffbzs.js:37413-37457 placement
function withSchemeMarked(e) {
  return e.replace(SCHEME_SEPARATOR_RE, ":?/");
}
//@ chunk-yxnffbzs.js:37457-37502 placement
function spacedFromClosingQuote(e) {
  return e.replace(/\\$/, "\\ ");
}
//@ chunk-yxnffbzs.js:37502-37612 placement
function sweepAskCopy(e) {
  return (
    P(e)
      .replace(/"/g, "'")
      .replace(QUOTE_HOMOGLYPHS, "'")
      .replace(SINGLE_QUOTE_RUNS, "'")
      .replace(/\s+/g, " ")
      .trim() || null
  );
}
//@ chunk-yxnffbzs.js:37612-39763 placement
var ARROW_SHAFT_SYMBOLS = String.raw`\u002b\u003d\u005e\u007c\u007e\u00a2-\u00a5\u00a8\u00ac\u00af\u00b1\u00b4\u00b8\u00d7\u00f7\u02c2-\u02c5\u02d2-\u02df\u02e5-\u02eb\u02ed\u02ef-\u02ff\u0375\u0384\u0385\u03f6\u058f\u0606-\u0608\u060b\u07fe\u07ff\u0888\u09f2\u09f3\u09fb\u0af1\u0bf9\u0e3f\u17db\u1fbd\u1fbf-\u1fc1\u1fcd-\u1fcf\u1fdd-\u1fdf\u1fed-\u1fef\u1ffd\u1ffe\u2044\u2052\u207a-\u207c\u208a-\u208c\u20a0-\u20c1\u2118\u2140-\u2144\u214b\u2190-\u2194\u219a\u219b\u21a0\u21a3\u21a6\u21ae\u21ce\u21cf\u21d2\u21d4\u21f4-\u22ff\u2320\u2321\u237c\u239b-\u23b3\u23dc-\u23e1\u25b7\u25c1\u25f8-\u25ff\u266f\u27c0-\u27c4\u27c7-\u27e5\u27f0-\u27ff\u2900-\u2982\u2999-\u29d7\u29dc-\u29fb\u29fe-\u2aff\u2b30-\u2b44\u2b47-\u2b4c\u309b\u309c\ua700-\ua716\ua720\ua721\ua789\ua78a\ua838\uab5b\uab6a\uab6b\ufb29\ufbb2-\ufbc2\ufdfc\ufe62\ufe64-\ufe66\ufe69\uff04\uff0b\uff1c-\uff1e\uff3e\uff40\uff5c\uff5e\uffe0-\uffe3\uffe5\uffe6\uffe9-\uffec\u{10d8e}\u{10d8f}\u{11fdd}-\u{11fe0}\u{1cef0}\u{1d6c1}\u{1d6db}\u{1d6fb}\u{1d715}\u{1d735}\u{1d74f}\u{1d76f}\u{1d789}\u{1d7a9}\u{1d7c3}\u{1e2ff}\u{1ecb0}\u{1eef0}\u{1eef1}\u{1f3fb}-\u{1f3ff}\u{1f8d0}-\u{1f8d8}`,
  J = `[\\p{So}${ARROW_SHAFT_SYMBOLS}\\p{Pd}\\p{Pc}\\p{Mn}\\p{Me}${SXt}\\u02c9\\u02cd\\u2017\\u2053\\u203e\\ufe49-\\ufe4c\\u0640\\u07fa\\u1173\\u1428\\u180a\\u2e0f\\u2f00\\u3127\\u3161\\u3192\\u31d0\\u4e00\\ua4ff\\ua7f7\\ua8fb\\uffda]`,
  regExp_10 = new RegExp(`(?<!${J})${J}+>`, "gu"),
  regExp_11 = new RegExp(
    String.raw`(?!>)[\u00bb\u02c2-\u02c5\u02ef-\u02ff\u1405\u1406\u1409\u1433\u1434\u1450\u1451\u15d2\u2023\u203a\u204d\u20d0-\u20ef\u2044\u2190-\u21ff\u2215\u226b\u227b\u227d\u227f\u2283\u22b1\u22b3\u22d7\u22d9\u2571\u2572\u2303-\u2304\u232a\u2344\u2348\u23e9-\u23ef\u23f5\u25b6-\u25bb\u261b\u261e\u276d\u276f\u2771\u2794-\u27bf\u27e9\u27eb\u27f0-\u27ff\u2900-\u297f\u29a8-\u29af\u2992\u2994\u29c1\u29d0\u29f5\u29f8\u29fd\u2a20\u2a7a\u2aa2\u2aa7\u2aa9\u2aab\u2aad\u2ab0\u2ab2\u2ab4\u2ab6\u2ab8\u2aba\u2abc\u2af8\u2b00-\u2bff\u3009\u300b\ue000-\uf8ff\ufe65\ufe68\uff0f\uff1e\uff3c\uffe9-\uffec\u{1f449}\u{1f599}\u{1f59b}\u{1f59d}\u{1f782}\u{1f800}-\u{1f8ff}\u{1faf1}\u{1fbc1}-\u{1fbc3}\u{1fbb0}-\u{1fbb8}\u{f0000}-\u{ffffd}\u{100000}-\u{10fffd}${withConfusables(">")}]`,
    "gu",
  );
//@ chunk-yxnffbzs.js:39763-39820 placement
function sweepProvenanceMarker(e) {
  return e.replace(regExp_11, "?").replace(regExp_10, "?");
}
//@ chunk-yxnffbzs.js:39820-40324 placement
var SCHEME_SEPARATOR_RE = /[:\uFE13\uFE55\uFF1A][/\uFF0F][/\uFF0F]/gu,
  DEFANGED_SCHEME_SEPARATOR = ":\u2215\u2215",
  dt = /:\u2215\u2215/g,
  ANGLE_OPENERS_OFF_THE_LIST = "\xAB\u140A\u22B2\u25C0-\u25C5",
  ANGLE_CLOSERS_OFF_THE_LIST = "\xBB\u1405\u2023\u204D\u22B3\u25B6-\u25BB",
  ANGLE_BRACKET_RUN_RE = new RegExp(
    `[${withConfusables("<")}${ANGLE_OPENERS_OFF_THE_LIST}${withConfusables(">")}${ANGLE_CLOSERS_OFF_THE_LIST}]+`,
    "gu",
  ),
  _t = /^\s+(?=\S)|(?<=\S)\s+$|(?<=\S)\s{2,}(?=\S)/g,
  AMPERSAND_FORMS = `&${I}\\u214B\\u{1F674}\\u{1F675}`,
  regExp_12 = new RegExp(
    `[${AMPERSAND_FORMS}](?=([#\\uFE5F\\uFF03\\p{L}\\p{N}\\p{M}]*)([;\\u037E\\uFE14\\uFE54\\uFF1B]?))`,
    "gu",
  ),
  pt = /^(?:#\p{N}|#x|lt|gt|amp|quot|laquo|raquo|shy|nbsp|acute|uml|macr)/u;
//@ chunk-yxnffbzs.js:40324-40437 placement
function characterReferencesAsBrackets(e) {
  return e.replace(regExp_12, (n, r, o) =>
    r !== "" && (o !== "" || pt.test(r.normalize("NFKC").toLowerCase())) ? "<" : n,
  );
}
/**
 * 标题中需剥离的括号/标点正则。
 */
//@ chunk-yxnffbzs.js:40437-40749 placement
var TITLE_STRIP_PATTERNS = new RegExp(
    `[<>${[...BRACKET_CONFUSABLES.keys()].join("")}${ANGLE_OPENERS_OFF_THE_LIST}${ANGLE_CLOSERS_OFF_THE_LIST}]+`,
    "gu",
  ),
  Z = `(?![(){}])[\\p{Ps}\\p{Pe}${BOX_DRAWING_RANGES}]`,
  DECISION_SURFACE_BRACKETS_RE = new RegExp(`(?<!\\s)\\s*${Z}(?:\\s|${Z})*`, "gu"),
  le =
    /[:\u02D0\u02D1\u05C3\u2D42\u2D53\u2D57\uA4FD\uA789\u{10781}\u{10782}]|(?![\p{L}\p{N}\p{Zs}])[^\x00-\x7F]/gu,
  MODEL_TEXT_PUNCT_CODE_POINT = new RegExp(`^(?:${le.source})$`, "u");
//@ chunk-yxnffbzs.js:40749-40832 placement
function sweepMarkerLookalikes(e) {
  return foldClassifierCodePhrases(
    e.replace(DECISION_SURFACE_BRACKETS_RE, " ").replace(le, " ").replace(/ {2,}/g, " "),
  );
}
//@ chunk-yxnffbzs.js:40832-41039 placement
var CLASSIFIER_CODE_PHRASES = [
    ["sources", "under"],
    ["stored", "connector", "grant"],
    ["published", "by", "this", "session"],
    ["created", "by", "this", "session"],
  ],
  mapped = CLASSIFIER_CODE_PHRASES.map((e) => [new RegExp(e.join("[^\\p{L}\\p{N}]+"), "giu"), e.join("-")]);
//@ chunk-yxnffbzs.js:41039-41100 placement
function foldClassifierCodePhrases(e) {
  return mapped.reduce((n, [r, o]) => n.replace(r, o), e);
}
//@ chunk-yxnffbzs.js:41100-41723 placement
var SESSION_PUBLISHED_CLASSIFIER_MARK = " [artifact published by this session]",
  SESSION_CREATED_CLASSIFIER_MARK = " [artifact created by this session]",
  OWN_TYPE_INSTANCE_CLASSIFIER_MARK =
    " [ownership: yours, made from an Artifact type \u2014 the files the type put in it were written by the type's publisher]",
  INHERITED_TYPE_DECLARATION_CLASSIFIER_MARK =
    " [capabilities: declared by the Anthropic-published type this Artifact was made from; this publish cannot change them]",
  SCREENED_NAME_CLASSIFIER_MARK =
    " [destination is a file name Claude Code screens: git, hook, tool and agent settings]",
  CHAIN_REPUBLISH_ALLOW_REASON =
    "Automatic edit of an Artifact this session watches, requested by a writer's comment on it; the server re-checks the writer, the thread's edit grant, single-file, size and rate limits";
//@ chunk-yxnffbzs.js:41723-41860 placement
function sweptAskPath(e) {
  if (P(e).replace(DECISION_SURFACE_BRACKETS_RE, " ").trim() === "") return "";
  return spacedFromClosingQuote(
    withEdgeBlanksMarked(
      sweptPagePath(e).trimEnd().replace(DECISION_SURFACE_BRACKETS_RE, "?").replace(/ {2,}/g, " "),
    ).trim(),
  );
}
//@ chunk-yxnffbzs.js:41860-41961 placement
function sweptPagePath(e) {
  return spacedFromClosingQuote(
    characterReferencesAsBrackets(
      sweepProvenanceMarker(sweepAskCopy(withSchemeMarked(withDroppedBlanksMarked(e))) ?? ""),
    )
      .replace(TITLE_STRIP_PATTERNS, "?")
      .replace(/ {2,}/g, " ")
      .trim(),
  );
}
//@ chunk-yxnffbzs.js:41961-42158 placement
var META_DESCRIPTION_RE = /<meta[^>]+name=["']description["'][^>]+content=(["'])((?:(?!\1).)*)\1/is,
  TITLE_TAG_RE = /<title[^>]*>([\s\S]*?)<\/title>/i,
  H1_TAG_RE = /<h1[^>]*>([\s\S]*?)<\/h1>/i,
  GENERIC_TITLES = new Set(["", "index", "untitled", "document"]);
//@ chunk-yxnffbzs.js:42158-42452 placement
function deriveDescription(e, n) {
  let r = w(e),
    o = (_) => sanitizeArtifactTitle(decodeHtmlEntities(_ ?? "")) ?? "",
    s = o(r.match(META_DESCRIPTION_RE)?.[2]);
  if (s.length >= 10) return s;
  let a = (_) => o(r.match(_)?.[1]?.replace(/<[^>]+>/g, "")),
    u = a(TITLE_TAG_RE),
    c = a(H1_TAG_RE),
    lower = u.toLowerCase();
  if (GENERIC_TITLES.has(lower) || lower === n) u = "";
  let lower_2 = c.toLowerCase();
  if (lower_2 === u.toLowerCase() || GENERIC_TITLES.has(lower_2) || lower_2 === n) return u;
  return c;
}
//@ chunk-yxnffbzs.js:42452-42560 placement
function splitWatchRows(e) {
  let n = count(e, (r) => "rail" in r && r.rail === "live_stopped");
  return { watching: e.length - n, stopped: n };
}

export {
  sweepResultLineText,
  QUOTE_HOMOGLYPHS,
  SINGLE_QUOTE_RUNS,
  scrubArtifactEnvelopeTags,
  scrubServerLine,
  LIST_LIMIT_MAX,
  vetForeignFavicon,
  artifactViewerUrlFor,
  containsInterruptLiteral,
  isDecisionSurfaceControl,
  INVISIBLE_BLANK_CODE_POINT,
  ARTIFACT_PAGE_ENVELOPE_TAGS,
  refusalEcho,
  sweepResultLineField,
  canonicalArtifactTargetFor,
  sweepResultLine,
  ANGLE_OPENERS_OFF_THE_LIST,
  ANGLE_CLOSERS_OFF_THE_LIST,
  AMPERSAND_FORMS,
  sweepAskCopy,
  MAX_SIZE_CLAUSE_CHARS,
  sweptPagePath,
  foldClassifierCodePhrases,
  withEdgeBlanksMarked,
  foldedForSurface,
  markedForBracketFold,
  spacedFromClosingQuote,
  DECISION_SURFACE_BRACKETS_RE,
  writtenPage,
  classifierArtifactTargetFor,
  artifactViewerUrlSpellings,
  extractThumbnailLinks,
  TITLE_SCAN_CHARS,
  sweptAskPath,
  artifactContentOriginUrlFor,
  safePublishPath,
  ownedField,
  sweepProvenanceMarker,
  SESSION_CREATED_CLASSIFIER_MARK,
  SESSION_PUBLISHED_CLASSIFIER_MARK,
  TYPE_LIST_LIMIT_MAX,
  DEFAULT_LIST_LIMIT,
  listScopeFrom,
  safePublishUrl,
  artifactCardTitle,
  extractHtmlTitle,
  withSchemeMarked,
  sweepMarkerLookalikes,
  splitWatchRows,
  SCREENED_NAME_CLASSIFIER_MARK,
  sweptArtifactTitle,
  TITLE_SCAN_BYTES,
  sanitizeArtifactTitle,
  CHAIN_REPUBLISH_ALLOW_REASON,
  OWN_TYPE_INSTANCE_CLASSIFIER_MARK,
  classifierArtifactTargetParts,
  sameArtifactMark,
  INHERITED_TYPE_DECLARATION_CLASSIFIER_MARK,
  sanitizeFavicon,
  FAVICON_MARKUP_RE,
  VERSION_LABEL_MAX,
  decodeHtmlEntities,
  deriveDescription,
  MODEL_TEXT_PUNCT_CODE_POINT,
  isJoinerOrEmojiSelector,
  selectorOrJoinerRides,
  rideStateAfter,
  INVISIBLE_BLANKS,
  characterReferencesAsBrackets,
  ANGLE_BRACKET_RUN_RE,
  SCHEME_SEPARATOR_RE,
  DEFANGED_SCHEME_SEPARATOR,
  artifactLeadTokens,
  isPublishShapedArtifactAction,
  scrubbedHead,
  TITLE_MAX_RUNES,
  markDisplayTokens,
  artifactLeadScrubPattern,
  revealPageInvisibles,
  isCanonicalArtifactViewerUrl,
};
