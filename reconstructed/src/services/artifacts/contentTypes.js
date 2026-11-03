/**
 * services/artifacts/contentTypes.ts
 *
 * 2.1.316 新增：artifact 文件内容类型表与拒绝说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (30)
 * attribution: placement 30
 */
import { extname } from "path";
import { trimHtmlWhitespace } from "./pageRuntimes.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural } from "../../utils/stringUtils.js";
import { detectEncodingFromBom } from "../../utils/fileRead.js";

//@ chunk-06y4szbn.js:22424-23143 placement
var EXTENSION_CONTENT_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".geojson": "application/json",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/vnd.microsoft.icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".wasm": "application/wasm",
  ...{},
};
//@ chunk-06y4szbn.js:23143-23180 placement
function contentTypeForPath(e) {
  return EXTENSION_CONTENT_TYPES[asciiLowerCase(extname(e))];
}
//@ chunk-06y4szbn.js:23180-23244 placement
function asciiLowerCase(e) {
  return e.replace(/[A-Z]/g, (n) => n.toLowerCase());
}
//@ chunk-06y4szbn.js:23244-23316 placement
function baseMediaType(e) {
  let index = e.indexOf(";");
  return asciiLowerCase(trimHtmlWhitespace(index >= 0 ? e.slice(0, index) : e));
}
//@ chunk-06y4szbn.js:23316-24033 placement
/**
 * Artifact 可服务的 MIME 类型集合：标记类（html/xhtml/xml/svg）、脚本/WASM、以及文本、图片、字体、音视频清单。
 */
var MARKUP_CONTENT_TYPES = new Set([
  "text/html",
  "application/xhtml+xml",
  "application/xml",
  "text/xml",
  "image/svg+xml",
]);
var WWW_CONTENT_TYPES = new Set([...MARKUP_CONTENT_TYPES, ...[]]);
var SVG_CONTENT_TYPE = "image/svg+xml";
var MARKUP_WITHOUT_SVG_TYPES = new Set([...WWW_CONTENT_TYPES].filter((e) => e !== SVG_CONTENT_TYPE));
var HTML_CONTENT_TYPES = new Set(["text/html", ...[]]);
var SCRIPT_CONTENT_TYPES = new Set(["text/javascript", "application/javascript", "application/wasm"]);
var SERVABLE_CONTENT_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "text/css",
  "application/json",
  "application/manifest+json",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
  "font/woff",
  "font/woff2",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/font-woff2",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "video/mp4",
  "video/webm",
  "video/ogg",
]);
//@ chunk-06y4szbn.js:24033-24107 placement
function safeJsonQuote(e) {
  return JSON.stringify(e).replace(/[^\x20-\x7e]|[<>]/gu, toUnicodeEscapes);
}
//@ chunk-06y4szbn.js:24107-24213 placement
function toUnicodeEscapes(e) {
  return e
    .split("")
    .map((n) => `\\u${n.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .join("");
}
//@ chunk-06y4szbn.js:24213-24293 placement
var CONTENT_TYPE_FAMILIES = ["pages", "styles", "scripts", "data", "images", "fonts", "media", "documents"];
//@ chunk-06y4szbn.js:24293-24669 placement
function contentTypeFamily(e) {
  if (e === "text/html") return "pages";
  if (e === "text/css") return "styles";
  if (e === "text/javascript" || e === "application/javascript" || e === "application/wasm") return "scripts";
  if (e.startsWith("image/")) return "images";
  if (e.startsWith("font/")) return "fonts";
  if (e.startsWith("audio/") || e.startsWith("video/")) return "media";
  if (e === "application/pdf") return "documents";
  return "data";
}
//@ chunk-06y4szbn.js:24669-25537 placement
/**
 * 发布内容的类型说明文案：按族列出扩展名、不支持类型的提示、纯文本与文档归档的处理建议。
 */
var CONTENT_TYPE_FAMILIES_TEXT = CONTENT_TYPE_FAMILIES.flatMap((e) => {
  let mapped = Object.entries(EXTENSION_CONTENT_TYPES)
    .filter(([, value]) => contentTypeFamily(value) === e)
    .map(([key]) => key);
  return mapped.length > 0 ? [`${e} ${mapped.join(" ")}`] : [];
}).join("; ");
var UNSUPPORTED_TYPE_TEXT = "Nothing was published because one file is of a type artifacts don't serve: ";
var CONTENT_TYPE_ANNOUNCED_TEXT = " (contentType ";
var CONTENT_TYPE_SPELLING_TEXT = ") \u2014 the served spelling is exactly ";
var CONTENT_TYPE_TAKEN_TEXT = ") \u2014 that extension is already served as ";
var SERVED_TYPES_TEXT = `Served types, by extension (a file named with one of these needs no contentType): ${CONTENT_TYPE_FAMILIES_TEXT}.`;
var TEXT_PLAIN_GUIDANCE =
  'A source, config, log or other text file goes as text/plain (contentType "text/plain", or a .txt name) or rendered into the page.';
var DOCUMENT_ARCHIVE_GUIDANCE =
  "A document or archive (.docx .xlsx .pptx .zip) can't be attached from here yet under any contentType: render what the page needs from it into the page, or link to where it already lives; a data: or blob: download link is not a way around this (the viewer blocks page-initiated downloads).";
//@ chunk-06y4szbn.js:25537-25902 placement
function contentTypeMismatchMessage(e, n, r, s) {
  let h = `${UNSUPPORTED_TYPE_TEXT}${e} ${safeJsonQuote(n)}${CONTENT_TYPE_ANNOUNCED_TEXT}${safeJsonQuote(r)}`;
  if (s !== undefined)
    return `${h}${CONTENT_TYPE_SPELLING_TEXT}${safeJsonQuote(s)}, lowercase with no parameters. Publish again with that contentType.`;
  let b = contentTypeForPath(n);
  if (b !== undefined && contentTypeFamily(b) !== null)
    return `${h}${CONTENT_TYPE_TAKEN_TEXT}${safeJsonQuote(b)}. Publish again with no contentType on that file.`;
  return `${h}). ${SERVED_TYPES_TEXT} Publish again with every file as a served type. ${TEXT_PLAIN_GUIDANCE} ${DOCUMENT_ARCHIVE_GUIDANCE}`;
}
//@ chunk-06y4szbn.js:25902-26421 placement
function unservableFileMessage(e, n) {
  let r = asciiLowerCase(extname(n));
  let s =
    r === "" ? "no extension to infer a served type from" : `extension ${safeJsonQuote(r)} is not served`;
  return e === "files"
    ? `files: ${safeJsonQuote(n)} (no contentType, and ${s}) \u2014 nothing was published. ${SERVED_TYPES_TEXT} Publish again with every file as a served type. ${TEXT_PLAIN_GUIDANCE} ${DOCUMENT_ARCHIVE_GUIDANCE}`
    : `file_path: ${safeJsonQuote(n)} (${s}) \u2014 nothing was published. ${SERVED_TYPES_TEXT} Rename a text or data file to one of these (.txt .json .csv), or make another file the \`file_path\` and list this one under \`files\` with contentType "text/plain". ${DOCUMENT_ARCHIVE_GUIDANCE}`;
}
//@ chunk-06y4szbn.js:26421-26449 placement
var JSON_STRING_RE = /"(?:[^"\\]|\\.)*"/y;
//@ chunk-06y4szbn.js:26449-26618 placement
function readJsonStringAt(e, n) {
  JSON_STRING_RE.lastIndex = n;
  let match = JSON_STRING_RE.exec(e);
  if (match === null) return;
  try {
    let parsed = JSON.parse(match[0]);
    return typeof parsed === "string"
      ? {
          raw: parsed,
          end: n + match[0].length,
        }
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-06y4szbn.js:26618-27675 placement
function parseFileTypeRefusal(e) {
  for (let n of ["supporting file", "file"]) {
    let r = `${UNSUPPORTED_TYPE_TEXT}${n} `;
    if (!e.startsWith(r)) continue;
    let jsonStringAt = readJsonStringAt(e, r.length);
    if (jsonStringAt === undefined || !e.startsWith(CONTENT_TYPE_ANNOUNCED_TEXT, jsonStringAt.end)) return;
    let jsonStringAt_2 = readJsonStringAt(e, jsonStringAt.end + CONTENT_TYPE_ANNOUNCED_TEXT.length);
    if (jsonStringAt_2 === undefined || !/^[\x20-\x7e]{1,127}$/.test(jsonStringAt_2.raw)) return;
    let b = e.startsWith(CONTENT_TYPE_SPELLING_TEXT, jsonStringAt_2.end)
      ? baseMediaType(jsonStringAt_2.raw)
      : undefined;
    if (e !== contentTypeMismatchMessage(n, jsonStringAt.raw, jsonStringAt_2.raw, b)) return;
    let y = safeJsonQuote(jsonStringAt.raw);
    return b !== undefined || e.startsWith(CONTENT_TYPE_TAKEN_TEXT, jsonStringAt_2.end)
      ? `Not published: ${y} was given a file type label artifacts don't recognize. Claude can fix the label and publish again.`
      : `Not published: ${y} is a type of file artifacts can't include. Claude can convert it or leave it out and publish again.`;
  }
  for (let n of ["files", "file_path"]) {
    let r = `${n}: `;
    if (!e.startsWith(r)) continue;
    let jsonStringAt = readJsonStringAt(e, r.length);
    if (jsonStringAt === undefined || e !== unservableFileMessage(n, jsonStringAt.raw)) return;
    let h = safeJsonQuote(jsonStringAt.raw);
    return n === "files"
      ? `Not published: ${h} is a type of file artifacts can't include. Claude can convert it or leave it out and publish again.`
      : `Not published: ${h} is a type of file artifacts can't include. Claude can convert or rename it and publish again.`;
  }
  return;
}
//@ chunk-06y4szbn.js:27675-28553 placement
/**
 * 发布限流的文案与等待秒数（10/120）：给用户与给模型的提示、重发指引与预检拒绝的正则。
 */
var RATE_LIMIT_TEXT = 10;
var RATE_LIMIT_WAIT_SECONDS = 120;
var RATE_LIMIT_HEADLINE = "Artifact publishing is rate-limited right now, so nothing was published.";
var RATE_LIMIT_RETRIED_TEXT =
  " Nothing is wrong with the call: a publishing rate limit refused it, and this tool already waited and sent it once more.";
var RATE_LIMIT_RESEND_TEXT = " Send the same call again";
var RATE_LIMIT_URL_FIELD = ' with url: "';
var DOUBLE_QUOTE = '"';
var RATE_LIMIT_WAIT_LEAD = " after about ";
var CONTENT_TYPE_FAMILIES_BUILDER = (e) =>
  ` seconds \u2014 publishing limits are shared, so the wait can be longer while others publish; change nothing${e ? " else" : ""} about the call to get past this.`;
var RATE_LIMIT_TARGET_TEXT =
  " That artifact was reserved for this publish and nothing has been published to it; targeting it avoids reserving another.";
var RATE_LIMIT_REFUSED_STEP_LEAD = " The refused step was ";
var PREFLIGHT_REFUSAL_RE =
  /^(?:the upload preflight that copying \d{1,4} files? from another artifact needs|staging this publish's \d{1,4} copied files? \((?:"(?:[^"\\\n]|\\.){0,1100}" from artifact [A-Za-z0-9-]{22,36}(?:, (?=")|))+(?:, and \d{1,4} more)?\)); nothing was staged\.$/;
//@ chunk-06y4szbn.js:28553-28797 placement
function copiedFilesSummary(e) {
  let mapped = e.slice(0, 3).map((s) => `${jsonStringify(s.path)} from artifact ${s.fromSlug}`);
  let r = e.length > 3 ? `, and ${e.length - 3} more` : "";
  return `staging this publish's ${e.length} copied ${plural(e.length, "file")} (${mapped.join(", ")}${r}); nothing was staged`;
}
//@ chunk-06y4szbn.js:28797-28922 placement
function copyPreflightFailure(e) {
  return `the upload preflight that copying ${e} ${plural(e, "file")} from another artifact needs; nothing was staged`;
}
//@ chunk-06y4szbn.js:28922-29127 placement
var PUBLISH_RATE_LIMITED_MESSAGE =
  "Not published: artifact publishing is rate-limited right now. Claude can try again shortly.";
var PUBLISHED_URL_RE =
  /^https?:\/\/[A-Za-z0-9.-]{1,100}(?::\d{1,5})?(?:\/[A-Za-z0-9._-]{1,40}){0,4}\/[A-Za-z0-9-]{22,36}$/;
//@ chunk-06y4szbn.js:29127-29206 placement
function retryAfterSeconds(retryAfterMs) {
  let n = Math.ceil((retryAfterMs ?? 0) / 1000);
  return Math.min(Math.max(n, RATE_LIMIT_TEXT), RATE_LIMIT_WAIT_SECONDS);
}
//@ chunk-06y4szbn.js:29206-29341 placement
function rateLimitedMessage(e, n, refusedStep) {
  let s = n !== undefined;
  return (
    RATE_LIMIT_HEADLINE +
    RATE_LIMIT_RETRIED_TEXT +
    RATE_LIMIT_RESEND_TEXT +
    (s ? `${RATE_LIMIT_URL_FIELD}${n}${DOUBLE_QUOTE}` : "") +
    `${RATE_LIMIT_WAIT_LEAD}${e}${CONTENT_TYPE_FAMILIES_BUILDER(s)}` +
    (s ? RATE_LIMIT_TARGET_TEXT : "") +
    (refusedStep !== undefined ? `${RATE_LIMIT_REFUSED_STEP_LEAD}${refusedStep}.` : "")
  );
}
//@ chunk-06y4szbn.js:29341-29781 placement
function parseRateLimitedMessage(e) {
  let n = RATE_LIMIT_HEADLINE + RATE_LIMIT_RETRIED_TEXT + RATE_LIMIT_RESEND_TEXT;
  if (!e.startsWith(n)) return;
  let r = n.length;
  let s;
  if (e.startsWith(RATE_LIMIT_URL_FIELD, r)) {
    let index = e.indexOf(DOUBLE_QUOTE, r + RATE_LIMIT_URL_FIELD.length);
    if (index === -1) return;
    s = e.slice(r + RATE_LIMIT_URL_FIELD.length, index);
    if (!PUBLISHED_URL_RE.test(s)) return;
    r = index + DOUBLE_QUOTE.length;
  }
  if (!e.startsWith(RATE_LIMIT_WAIT_LEAD, r)) return;
  let h = /^\d{1,3}/.exec(e.slice(r + RATE_LIMIT_WAIT_LEAD.length))?.[0];
  if (h === undefined) return;
  let index = e.indexOf(RATE_LIMIT_REFUSED_STEP_LEAD, r);
  let y = index === -1 ? e : e.slice(0, index);
  if (index !== -1 && !PREFLIGHT_REFUSAL_RE.test(e.slice(index + RATE_LIMIT_REFUSED_STEP_LEAD.length)))
    return;
  return y === rateLimitedMessage(Number(h), s) ? PUBLISH_RATE_LIMITED_MESSAGE : undefined;
}
//@ chunk-06y4szbn.js:29781-30245 placement
/**
 * 契约版本过新（服务器尚未全部更新）时的提示文案与匹配正则。
 */
var CONTRACT_ROLLOUT_TEXT =
  "Nothing was published and nothing is wrong with the call: this tool chose that contract because it is the server's newest, and it has not reached every server yet. Send the same call again in about a minute; do not pin an older contract to get past this.";
var CONTRACT_ROLLOUT_TO_USER =
  "Not published: the artifact service is mid-update. Claude can try again in about a minute.";
var CONTRACT_TOO_NEW_RE =
  /^deploy 422: contract ([0-9A-Za-z.+-]{1,32}) is newer than the preferred ([0-9A-Za-z.+-]{1,32})\. /;
//@ chunk-06y4szbn.js:30245-30336 placement
function contractTooNewText(e, n) {
  return `deploy 422: contract ${e} is newer than the preferred ${n}. ${CONTRACT_ROLLOUT_TEXT}`;
}
//@ chunk-06y4szbn.js:30336-30423 placement
function parseContractRolloutMessage(e) {
  let match = CONTRACT_TOO_NEW_RE.exec(e);
  if (match === null) return;
  return e === contractTooNewText(match[1], match[2]) ? CONTRACT_ROLLOUT_TO_USER : undefined;
}
//@ chunk-06y4szbn.js:30460-30534 placement
function encodingFromBom(e) {
  return detectEncodingFromBom(e.subarray(0, 4)) === "utf16le" ? "utf-16le" : "utf-8";
}
//@ chunk-06y4szbn.js:30534-30821 placement
function lineColumnAt(e, n) {
  let sliced = e.slice(0, n);
  let s = 1;
  for (
    let index = sliced.indexOf(`
`);
    index !== -1;
    index = sliced.indexOf(
      `
`,
      index + 1,
    )
  )
    s++;
  let h = 1;
  for (let y of sliced.slice(
    sliced.lastIndexOf(`
`) + 1,
  ))
    h++;
  let b = 0;
  for (let index = e.indexOf("\uFFFD", n + 1); index !== -1; index = e.indexOf("\uFFFD", index + 1)) b++;
  return `line ${s}, column ${h}${b > 0 ? ` (+${b} more)` : ""}`;
}
//@ chunk-06y4szbn.js:30821-31119 placement = getMcpAuthCache (0.756)
function findUndecodableChar(e, n, r) {
  let s = r === "utf-8";
  let h = s ? (n[0] === 239 && n[1] === 187 && n[2] === 191 ? 3 : 0) : 2;
  for (let b = 0; b < e.length;) {
    let y = e.codePointAt(b) ?? 0;
    if (y === 65533) {
      if (!(s ? n[h] === 239 && n[h + 1] === 191 && n[h + 2] === 189 : n[h] === 253 && n[h + 1] === 255))
        return b;
    }
    let x = y > 65535 ? 2 : 1;
    h += s ? (y < 128 ? 1 : y < 2048 ? 2 : y < 65536 ? 3 : 4) : x * 2;
    b += x;
  }
  return -1;
}
//@ chunk-06y4szbn.js:31119-31175 placement
function decodeText(e) {
  return new TextDecoder(encodingFromBom(e)).decode(e);
}
//@ chunk-06y4szbn.js:31175-31510 placement
function decodeTextStrict(e) {
  let n = encodingFromBom(e);
  try {
    let r = new TextDecoder(n, {
      fatal: true,
    }).decode(e);
    let index = r.indexOf("\uFFFD");
    if (index === -1)
      return {
        text: r,
      };
    return {
      problem: {
        kind: "replacement_char",
        encoding: n,
        where: lineColumnAt(r, index),
      },
    };
  } catch {
    let r = new TextDecoder(n).decode(e);
    let undecodableChar = findUndecodableChar(r, e, n);
    return {
      problem: {
        kind: "undecodable",
        encoding: n,
        where: lineColumnAt(r, undecodableChar === -1 ? r.indexOf("\uFFFD") : undecodableChar),
      },
    };
  }
}
export {
  baseMediaType,
  contentTypeMismatchMessage,
  contentTypeForPath,
  lineColumnAt,
  MARKUP_WITHOUT_SVG_TYPES,
  HTML_CONTENT_TYPES,
  copyPreflightFailure,
  copiedFilesSummary,
  SVG_CONTENT_TYPE,
  SCRIPT_CONTENT_TYPES,
  rateLimitedMessage,
  retryAfterSeconds,
  CONTRACT_ROLLOUT_TEXT,
  decodeTextStrict,
  safeJsonQuote,
  unservableFileMessage,
  asciiLowerCase,
  decodeText,
  WWW_CONTENT_TYPES,
  SERVABLE_CONTENT_TYPES,
  MARKUP_CONTENT_TYPES,
  parseFileTypeRefusal,
  parseRateLimitedMessage,
  parseContractRolloutMessage,
};
