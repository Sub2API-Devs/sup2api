/**
 * services/artifacts/contentTypes.ts
 *
 * 2.1.316 新增：artifact 文件内容类型表与拒绝说明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (30)
 * attribution: placement 30
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { extname } from "path";
import { trimHtmlWhitespace } from "./pageRuntimes.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { plural } from "../../utils/stringUtils.js";
import { detectEncodingFromBom } from "../../utils/fileRead.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-51jy8ztq.js:22424-23143 placement
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
//@ chunk-51jy8ztq.js:23143-23180 placement
function contentTypeForPath(path) {
  return EXTENSION_CONTENT_TYPES[asciiLowerCase(extname(path))];
}
//@ chunk-51jy8ztq.js:23180-23244 placement
function asciiLowerCase(value) {
  return value.replace(/[A-Z]/g, (char) => char.toLowerCase());
}
//@ chunk-51jy8ztq.js:23244-23316 placement
function baseMediaType(contentType) {
  let index = contentType.indexOf(";");
  return asciiLowerCase(trimHtmlWhitespace(index >= 0 ? contentType.slice(0, index) : contentType));
}
//@ chunk-51jy8ztq.js:23316-24033 placement
/**
 * Artifact 可服务的 MIME 类型集合：标记类（html/xhtml/xml/svg）、脚本/WASM、以及文本、图片、字体、音视频清单。
 */
var MARKUP_CONTENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WWW_CONTENT_TYPES;
var SVG_CONTENT_TYPE;
var MARKUP_WITHOUT_SVG_TYPES;
var HTML_CONTENT_TYPES;
var SCRIPT_CONTENT_TYPES;
var SERVABLE_CONTENT_TYPES;
deferInit("chunk-51jy8ztq.js:23316", () => {
  MARKUP_CONTENT_TYPES = new Set([
    "text/html",
    "application/xhtml+xml",
    "application/xml",
    "text/xml",
    "image/svg+xml",
  ]);
  WWW_CONTENT_TYPES = new Set([...MARKUP_CONTENT_TYPES, ...[]]);
  SVG_CONTENT_TYPE = "image/svg+xml";
  MARKUP_WITHOUT_SVG_TYPES = new Set(
    [...WWW_CONTENT_TYPES].filter((testMediaType) => testMediaType !== SVG_CONTENT_TYPE),
  );
  HTML_CONTENT_TYPES = new Set(["text/html", ...[]]);
  SCRIPT_CONTENT_TYPES = new Set(["text/javascript", "application/javascript", "application/wasm"]);
  SERVABLE_CONTENT_TYPES = new Set([
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
});
//@ chunk-51jy8ztq.js:24033-24107 placement
function safeJsonQuote(value) {
  return JSON.stringify(value).replace(/[^\x20-\x7e]|[<>]/gu, toUnicodeEscapes);
}
//@ chunk-51jy8ztq.js:24107-24213 placement
function toUnicodeEscapes(text) {
  return text
    .split("")
    .map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .join("");
}
//@ chunk-51jy8ztq.js:24213-24293 placement
var CONTENT_TYPE_FAMILIES = ["pages", "styles", "scripts", "data", "images", "fonts", "media", "documents"];
//@ chunk-51jy8ztq.js:24293-24669 placement
function contentTypeFamily(contentType) {
  if (contentType === "text/html") return "pages";
  if (contentType === "text/css") return "styles";
  if (
    contentType === "text/javascript" ||
    contentType === "application/javascript" ||
    contentType === "application/wasm"
  )
    return "scripts";
  if (contentType.startsWith("image/")) return "images";
  if (contentType.startsWith("font/")) return "fonts";
  if (contentType.startsWith("audio/") || contentType.startsWith("video/")) return "media";
  if (contentType === "application/pdf") return "documents";
  return "data";
}
//@ chunk-51jy8ztq.js:24669-25537 placement
/**
 * 发布内容的类型说明文案：按族列出扩展名、不支持类型的提示、纯文本与文档归档的处理建议。
 */
var CONTENT_TYPE_FAMILIES_TEXT; // deferred: uses CONTENT_TYPE_FAMILIES of its import cycle while loading; runs once the cycle is complete
var UNSUPPORTED_TYPE_TEXT;
var CONTENT_TYPE_ANNOUNCED_TEXT;
var CONTENT_TYPE_SPELLING_TEXT;
var CONTENT_TYPE_TAKEN_TEXT;
var SERVED_TYPES_TEXT;
var TEXT_PLAIN_GUIDANCE;
var DOCUMENT_ARCHIVE_GUIDANCE;
deferInit("chunk-51jy8ztq.js:24669", () => {
  CONTENT_TYPE_FAMILIES_TEXT = CONTENT_TYPE_FAMILIES.flatMap((family) => {
    let mapped = Object.entries(EXTENSION_CONTENT_TYPES)
      .filter(([, value]) => contentTypeFamily(value) === family)
      .map(([key]) => key);
    return mapped.length > 0 ? [`${family} ${mapped.join(" ")}`] : [];
  }).join("; ");
  UNSUPPORTED_TYPE_TEXT = "Nothing was published because one file is of a type artifacts don't serve: ";
  CONTENT_TYPE_ANNOUNCED_TEXT = " (contentType ";
  CONTENT_TYPE_SPELLING_TEXT = ") \u2014 the served spelling is exactly ";
  CONTENT_TYPE_TAKEN_TEXT = ") \u2014 that extension is already served as ";
  SERVED_TYPES_TEXT = `Served types, by extension (a file named with one of these needs no contentType): ${CONTENT_TYPE_FAMILIES_TEXT}.`;
  TEXT_PLAIN_GUIDANCE =
    'A source, config, log or other text file goes as text/plain (contentType "text/plain", or a .txt name) or rendered into the page.';
  DOCUMENT_ARCHIVE_GUIDANCE =
    "A document or archive (.docx .xlsx .pptx .zip) can't be attached from here yet under any contentType: render what the page needs from it into the page, or link to where it already lives; a data: or blob: download link is not a way around this (the viewer blocks page-initiated downloads).";
});
//@ chunk-51jy8ztq.js:25537-25902 placement
function contentTypeMismatchMessage(kindLabel, path, announced, lowercaseSuggestion) {
  let head = `${UNSUPPORTED_TYPE_TEXT}${kindLabel} ${safeJsonQuote(path)}${CONTENT_TYPE_ANNOUNCED_TEXT}${safeJsonQuote(announced)}`;
  if (lowercaseSuggestion !== undefined)
    return `${head}${CONTENT_TYPE_SPELLING_TEXT}${safeJsonQuote(lowercaseSuggestion)}, lowercase with no parameters. Publish again with that contentType.`;
  let takenContentType = contentTypeForPath(path);
  if (takenContentType !== undefined && contentTypeFamily(takenContentType) !== null)
    return `${head}${CONTENT_TYPE_TAKEN_TEXT}${safeJsonQuote(takenContentType)}. Publish again with no contentType on that file.`;
  return `${head}). ${SERVED_TYPES_TEXT} Publish again with every file as a served type. ${TEXT_PLAIN_GUIDANCE} ${DOCUMENT_ARCHIVE_GUIDANCE}`;
}
//@ chunk-51jy8ztq.js:25902-26421 placement
function unservableFileMessage(field, path) {
  let ext = asciiLowerCase(extname(path));
  let reasonText =
    ext === "" ? "no extension to infer a served type from" : `extension ${safeJsonQuote(ext)} is not served`;
  return field === "files"
    ? `files: ${safeJsonQuote(path)} (no contentType, and ${reasonText}) \u2014 nothing was published. ${SERVED_TYPES_TEXT} Publish again with every file as a served type. ${TEXT_PLAIN_GUIDANCE} ${DOCUMENT_ARCHIVE_GUIDANCE}`
    : `file_path: ${safeJsonQuote(path)} (${reasonText}) \u2014 nothing was published. ${SERVED_TYPES_TEXT} Rename a text or data file to one of these (.txt .json .csv), or make another file the \`file_path\` and list this one under \`files\` with contentType "text/plain". ${DOCUMENT_ARCHIVE_GUIDANCE}`;
}
//@ chunk-51jy8ztq.js:26421-26449 placement
var JSON_STRING_RE = /"(?:[^"\\]|\\.)*"/y;
//@ chunk-51jy8ztq.js:26449-26618 placement
function readJsonStringAt(text, start) {
  JSON_STRING_RE.lastIndex = start;
  let match = JSON_STRING_RE.exec(text);
  if (match === null) return;
  try {
    let parsed = JSON.parse(match[0]);
    return typeof parsed === "string"
      ? {
          raw: parsed,
          end: start + match[0].length,
        }
      : undefined;
  } catch {
    return;
  }
}
//@ chunk-51jy8ztq.js:26618-27675 placement
function parseFileTypeRefusal(message) {
  for (let kindLabel of ["supporting file", "file"]) {
    let prefix = `${UNSUPPORTED_TYPE_TEXT}${kindLabel} `;
    if (!message.startsWith(prefix)) continue;
    let jsonStringAt = readJsonStringAt(message, prefix.length);
    if (jsonStringAt === undefined || !message.startsWith(CONTENT_TYPE_ANNOUNCED_TEXT, jsonStringAt.end))
      return;
    let jsonStringAt_2 = readJsonStringAt(message, jsonStringAt.end + CONTENT_TYPE_ANNOUNCED_TEXT.length);
    if (jsonStringAt_2 === undefined || !/^[\x20-\x7e]{1,127}$/.test(jsonStringAt_2.raw)) return;
    let inferredType = message.startsWith(CONTENT_TYPE_SPELLING_TEXT, jsonStringAt_2.end)
      ? baseMediaType(jsonStringAt_2.raw)
      : undefined;
    if (message !== contentTypeMismatchMessage(kindLabel, jsonStringAt.raw, jsonStringAt_2.raw, inferredType))
      return;
    let quotedPath = safeJsonQuote(jsonStringAt.raw);
    return inferredType !== undefined || message.startsWith(CONTENT_TYPE_TAKEN_TEXT, jsonStringAt_2.end)
      ? `Not published: ${quotedPath} was given a file type label artifacts don't recognize. Claude can fix the label and publish again.`
      : `Not published: ${quotedPath} is a type of file artifacts can't include. Claude can convert it or leave it out and publish again.`;
  }
  for (let fieldName of ["files", "file_path"]) {
    let prefix = `${fieldName}: `;
    if (!message.startsWith(prefix)) continue;
    let jsonStringAt = readJsonStringAt(message, prefix.length);
    if (jsonStringAt === undefined || message !== unservableFileMessage(fieldName, jsonStringAt.raw)) return;
    let quotedPath = safeJsonQuote(jsonStringAt.raw);
    return fieldName === "files"
      ? `Not published: ${quotedPath} is a type of file artifacts can't include. Claude can convert it or leave it out and publish again.`
      : `Not published: ${quotedPath} is a type of file artifacts can't include. Claude can convert or rename it and publish again.`;
  }
  return;
}
//@ chunk-51jy8ztq.js:27675-28553 placement
/**
 * 发布限流的文案与等待秒数（10/120）：给用户与给模型的提示、重发指引与预检拒绝的正则。
 */
var RATE_LIMIT_MIN_WAIT_SECONDS = 10;
var RATE_LIMIT_MAX_WAIT_SECONDS = 120;
var RATE_LIMIT_HEADLINE = "Artifact publishing is rate-limited right now, so nothing was published.";
var RATE_LIMIT_RETRIED_TEXT =
  " Nothing is wrong with the call: a publishing rate limit refused it, and this tool already waited and sent it once more.";
var RATE_LIMIT_RESEND_TEXT = " Send the same call again";
var RATE_LIMIT_URL_FIELD = ' with url: "';
var DOUBLE_QUOTE = '"';
var RATE_LIMIT_WAIT_LEAD = " after about ";
var RATE_LIMIT_WAIT_SUFFIX_BUILDER = (retryAfterMs) =>
  ` seconds \u2014 publishing limits are shared, so the wait can be longer while others publish; change nothing${retryAfterMs ? " else" : ""} about the call to get past this.`;
var RATE_LIMIT_TARGET_TEXT =
  " That artifact was reserved for this publish and nothing has been published to it; targeting it avoids reserving another.";
var RATE_LIMIT_REFUSED_STEP_LEAD = " The refused step was ";
var PREFLIGHT_REFUSAL_RE =
  /^(?:the upload preflight that copying \d{1,4} files? from another artifact needs|staging this publish's \d{1,4} copied files? \((?:"(?:[^"\\\n]|\\.){0,1100}" from artifact [A-Za-z0-9-]{22,36}(?:, (?=")|))+(?:, and \d{1,4} more)?\)); nothing was staged\.$/;
//@ chunk-51jy8ztq.js:28553-28797 placement
function copiedFilesSummary(copied) {
  let mapped = copied
    .slice(0, 3)
    .map((entry) => `${jsonStringify(entry.path)} from artifact ${entry.fromSlug}`);
  let moreText = copied.length > 3 ? `, and ${copied.length - 3} more` : "";
  return `staging this publish's ${copied.length} copied ${plural(copied.length, "file")} (${mapped.join(", ")}${moreText}); nothing was staged`;
}
//@ chunk-51jy8ztq.js:28797-28922 placement
function copyPreflightFailure(failure) {
  return `the upload preflight that copying ${failure} ${plural(failure, "file")} from another artifact needs; nothing was staged`;
}
//@ chunk-51jy8ztq.js:28922-29127 placement
var PUBLISH_RATE_LIMITED_MESSAGE =
  "Not published: artifact publishing is rate-limited right now. Claude can try again shortly.";
var PUBLISHED_URL_RE =
  /^https?:\/\/[A-Za-z0-9.-]{1,100}(?::\d{1,5})?(?:\/[A-Za-z0-9._-]{1,40}){0,4}\/[A-Za-z0-9-]{22,36}$/;
//@ chunk-51jy8ztq.js:29127-29206 placement
function retryAfterSeconds(retryAfterMs) {
  let seconds = Math.ceil((retryAfterMs ?? 0) / 1000);
  return Math.min(Math.max(seconds, RATE_LIMIT_MIN_WAIT_SECONDS), RATE_LIMIT_MAX_WAIT_SECONDS);
}
//@ chunk-51jy8ztq.js:29206-29341 placement
function rateLimitedMessage(retryAfterMs, publishedUrl, refusedStep) {
  let hasUrl = publishedUrl !== undefined;
  return (
    RATE_LIMIT_HEADLINE +
    RATE_LIMIT_RETRIED_TEXT +
    RATE_LIMIT_RESEND_TEXT +
    (hasUrl ? `${RATE_LIMIT_URL_FIELD}${publishedUrl}${DOUBLE_QUOTE}` : "") +
    `${RATE_LIMIT_WAIT_LEAD}${retryAfterMs}${RATE_LIMIT_WAIT_SUFFIX_BUILDER(hasUrl)}` +
    (hasUrl ? RATE_LIMIT_TARGET_TEXT : "") +
    (refusedStep !== undefined ? `${RATE_LIMIT_REFUSED_STEP_LEAD}${refusedStep}.` : "")
  );
}
//@ chunk-51jy8ztq.js:29341-29781 placement
function parseRateLimitedMessage(message) {
  let headline = RATE_LIMIT_HEADLINE + RATE_LIMIT_RETRIED_TEXT + RATE_LIMIT_RESEND_TEXT;
  if (!message.startsWith(headline)) return;
  let cursor = headline.length;
  let url;
  if (message.startsWith(RATE_LIMIT_URL_FIELD, cursor)) {
    let index = message.indexOf(DOUBLE_QUOTE, cursor + RATE_LIMIT_URL_FIELD.length);
    if (index === -1) return;
    url = message.slice(cursor + RATE_LIMIT_URL_FIELD.length, index);
    if (!PUBLISHED_URL_RE.test(url)) return;
    cursor = index + DOUBLE_QUOTE.length;
  }
  if (!message.startsWith(RATE_LIMIT_WAIT_LEAD, cursor)) return;
  let waitSeconds = /^\d{1,3}/.exec(message.slice(cursor + RATE_LIMIT_WAIT_LEAD.length))?.[0];
  if (waitSeconds === undefined) return;
  let index = message.indexOf(RATE_LIMIT_REFUSED_STEP_LEAD, cursor);
  let bodyWithoutStep = index === -1 ? message : message.slice(0, index);
  if (index !== -1 && !PREFLIGHT_REFUSAL_RE.test(message.slice(index + RATE_LIMIT_REFUSED_STEP_LEAD.length)))
    return;
  return bodyWithoutStep === rateLimitedMessage(Number(waitSeconds), url)
    ? PUBLISH_RATE_LIMITED_MESSAGE
    : undefined;
}
//@ chunk-51jy8ztq.js:29781-30245 placement
/**
 * 契约版本过新（服务器尚未全部更新）时的提示文案与匹配正则。
 */
var CONTRACT_ROLLOUT_TEXT =
  "Nothing was published and nothing is wrong with the call: this tool chose that contract because it is the server's newest, and it has not reached every server yet. Send the same call again in about a minute; do not pin an older contract to get past this.";
var CONTRACT_ROLLOUT_TO_USER =
  "Not published: the artifact service is mid-update. Claude can try again in about a minute.";
var CONTRACT_TOO_NEW_RE =
  /^deploy 422: contract ([0-9A-Za-z.+-]{1,32}) is newer than the preferred ([0-9A-Za-z.+-]{1,32})\. /;
//@ chunk-51jy8ztq.js:30245-30336 placement
function contractTooNewText(version, minVersion) {
  return `deploy 422: contract ${version} is newer than the preferred ${minVersion}. ${CONTRACT_ROLLOUT_TEXT}`;
}
//@ chunk-51jy8ztq.js:30336-30423 placement
function parseContractRolloutMessage(message) {
  let match = CONTRACT_TOO_NEW_RE.exec(message);
  if (match === null) return;
  return message === contractTooNewText(match[1], match[2]) ? CONTRACT_ROLLOUT_TO_USER : undefined;
}
//@ chunk-51jy8ztq.js:30460-30534 placement
function encodingFromBom(bytes) {
  return detectEncodingFromBom(bytes.subarray(0, 4)) === "utf16le" ? "utf-16le" : "utf-8";
}
//@ chunk-51jy8ztq.js:30534-30821 placement
function lineColumnAt(text, offset) {
  let sliced = text.slice(0, offset);
  let line = 1;
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
    line++;
  let column = 1;
  for (let char of sliced.slice(
    sliced.lastIndexOf(`
`) + 1,
  ))
    column++;
  let index = 0;
  for (
    let index_2 = text.indexOf("\uFFFD", offset + 1);
    index_2 !== -1;
    index_2 = text.indexOf("\uFFFD", index_2 + 1)
  )
    index++;
  return `line ${line}, column ${column}${index > 0 ? ` (+${index} more)` : ""}`;
}
//@ chunk-51jy8ztq.js:30821-31119 placement (2.1.88 match: getMcpAuthCache, 0.757)
function findUndecodableChar(text, bytes, encoding) {
  let isUtf8 = encoding === "utf-8";
  let byteIndex = isUtf8 ? (bytes[0] === 239 && bytes[1] === 187 && bytes[2] === 191 ? 3 : 0) : 2;
  for (let charIndex = 0; charIndex < text.length;) {
    let codePoint = text.codePointAt(charIndex) ?? 0;
    if (codePoint === 65533) {
      if (
        !(isUtf8
          ? bytes[byteIndex] === 239 && bytes[byteIndex + 1] === 191 && bytes[byteIndex + 2] === 189
          : bytes[byteIndex] === 253 && bytes[byteIndex + 1] === 255)
      )
        return charIndex;
    }
    let charWidth = codePoint > 65535 ? 2 : 1;
    byteIndex += isUtf8
      ? codePoint < 128
        ? 1
        : codePoint < 2048
          ? 2
          : codePoint < 65536
            ? 3
            : 4
      : charWidth * 2;
    charIndex += charWidth;
  }
  return -1;
}
//@ chunk-51jy8ztq.js:31119-31175 placement
function decodeText(bytes) {
  return new TextDecoder(encodingFromBom(bytes)).decode(bytes);
}
//@ chunk-51jy8ztq.js:31175-31510 placement
function decodeTextStrict(bytes) {
  let encoding = encodingFromBom(bytes);
  try {
    let decoded = new TextDecoder(encoding, {
      fatal: true,
    }).decode(bytes);
    let offset = decoded.indexOf("\uFFFD");
    if (offset === -1)
      return {
        text: decoded,
      };
    return {
      problem: {
        kind: "replacement_char",
        encoding,
        where: lineColumnAt(decoded, offset),
      },
    };
  } catch {
    let decoded = new TextDecoder(encoding).decode(bytes);
    let undecodableChar = findUndecodableChar(decoded, bytes, encoding);
    return {
      problem: {
        kind: "undecodable",
        encoding,
        where: lineColumnAt(decoded, undecodableChar === -1 ? decoded.indexOf("\uFFFD") : undecodableChar),
      },
    };
  }
}
export {
  decodeTextStrict,
  safeJsonQuote,
  asciiLowerCase,
  baseMediaType,
  contentTypeForPath,
  MARKUP_WITHOUT_SVG_TYPES,
  decodeText,
  parseFileTypeRefusal,
  parseRateLimitedMessage,
  parseContractRolloutMessage,
  contentTypeMismatchMessage,
  lineColumnAt,
  HTML_CONTENT_TYPES,
  copyPreflightFailure,
  copiedFilesSummary,
  SVG_CONTENT_TYPE,
  SCRIPT_CONTENT_TYPES,
  rateLimitedMessage,
  retryAfterSeconds,
  CONTRACT_ROLLOUT_TEXT,
  unservableFileMessage,
  WWW_CONTENT_TYPES,
  SERVABLE_CONTENT_TYPES,
  MARKUP_CONTENT_TYPES,
};
