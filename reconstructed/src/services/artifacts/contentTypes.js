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
import { extname, extname as extname_2 } from "path";
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
  return EXTENSION_CONTENT_TYPES[asciiLowerCase(extname_2(e))];
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
var MARKUP_CONTENT_TYPES = new Set([
    "text/html",
    "application/xhtml+xml",
    "application/xml",
    "text/xml",
    "image/svg+xml",
  ]),
  I0o = new Set([...MARKUP_CONTENT_TYPES, ...[]]),
  kn = "image/svg+xml",
  U5n = new Set([...I0o].filter((e) => e !== kn)),
  Yi = new Set(["text/html", ...[]]),
  B5n = new Set(["text/javascript", "application/javascript", "application/wasm"]),
  O0o = new Set([
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
var To = ["pages", "styles", "scripts", "data", "images", "fonts", "media", "documents"];
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
var CONTENT_TYPE_FAMILIES_TEXT = To.flatMap((e) => {
    let mapped = Object.entries(EXTENSION_CONTENT_TYPES)
      .filter(([, r]) => contentTypeFamily(r) === e)
      .map(([r]) => r);
    return mapped.length > 0 ? [`${e} ${mapped.join(" ")}`] : [];
  }).join("; "),
  qi = "Nothing was published because one file is of a type artifacts don't serve: ",
  ar = " (contentType ",
  Xi = ") \u2014 the served spelling is exactly ",
  Ki = ") \u2014 that extension is already served as ",
  or = `Served types, by extension (a file named with one of these needs no contentType): ${CONTENT_TYPE_FAMILIES_TEXT}.`,
  Ji =
    'A source, config, log or other text file goes as text/plain (contentType "text/plain", or a .txt name) or rendered into the page.',
  lr =
    "A document or archive (.docx .xlsx .pptx .zip) can't be attached from here yet under any contentType: render what the page needs from it into the page, or link to where it already lives; a data: or blob: download link is not a way around this (the viewer blocks page-initiated downloads).";
//@ chunk-06y4szbn.js:25537-25902 placement
function contentTypeMismatchMessage(e, n, r, s) {
  let h = `${qi}${e} ${safeJsonQuote(n)}${ar}${safeJsonQuote(r)}`;
  if (s !== void 0)
    return `${h}${Xi}${safeJsonQuote(s)}, lowercase with no parameters. Publish again with that contentType.`;
  let b = contentTypeForPath(n);
  if (b !== void 0 && contentTypeFamily(b) !== null)
    return `${h}${Ki}${safeJsonQuote(b)}. Publish again with no contentType on that file.`;
  return `${h}). ${or} Publish again with every file as a served type. ${Ji} ${lr}`;
}
//@ chunk-06y4szbn.js:25902-26421 placement
function unservableFileMessage(e, n) {
  let r = asciiLowerCase(extname_2(n)),
    s = r === "" ? "no extension to infer a served type from" : `extension ${safeJsonQuote(r)} is not served`;
  return e === "files"
    ? `files: ${safeJsonQuote(n)} (no contentType, and ${s}) \u2014 nothing was published. ${or} Publish again with every file as a served type. ${Ji} ${lr}`
    : `file_path: ${safeJsonQuote(n)} (${s}) \u2014 nothing was published. ${or} Rename a text or data file to one of these (.txt .json .csv), or make another file the \`file_path\` and list this one under \`files\` with contentType "text/plain". ${lr}`;
}
//@ chunk-06y4szbn.js:26421-26449 placement
var zi = /"(?:[^"\\]|\\.)*"/y;
//@ chunk-06y4szbn.js:26449-26618 placement
function readJsonStringAt(e, n) {
  zi.lastIndex = n;
  let match = zi.exec(e);
  if (match === null) return;
  try {
    let parsed = JSON.parse(match[0]);
    return typeof parsed === "string" ? { raw: parsed, end: n + match[0].length } : void 0;
  } catch {
    return;
  }
}
//@ chunk-06y4szbn.js:26618-27675 placement
function parseFileTypeRefusal(e) {
  for (let n of ["supporting file", "file"]) {
    let r = `${qi}${n} `;
    if (!e.startsWith(r)) continue;
    let s = readJsonStringAt(e, r.length);
    if (s === void 0 || !e.startsWith(ar, s.end)) return;
    let h = readJsonStringAt(e, s.end + ar.length);
    if (h === void 0 || !/^[\x20-\x7e]{1,127}$/.test(h.raw)) return;
    let b = e.startsWith(Xi, h.end) ? baseMediaType(h.raw) : void 0;
    if (e !== contentTypeMismatchMessage(n, s.raw, h.raw, b)) return;
    let y = safeJsonQuote(s.raw);
    return b !== void 0 || e.startsWith(Ki, h.end)
      ? `Not published: ${y} was given a file type label artifacts don't recognize. Claude can fix the label and publish again.`
      : `Not published: ${y} is a type of file artifacts can't include. Claude can convert it or leave it out and publish again.`;
  }
  for (let n of ["files", "file_path"]) {
    let r = `${n}: `;
    if (!e.startsWith(r)) continue;
    let s = readJsonStringAt(e, r.length);
    if (s === void 0 || e !== unservableFileMessage(n, s.raw)) return;
    let h = safeJsonQuote(s.raw);
    return n === "files"
      ? `Not published: ${h} is a type of file artifacts can't include. Claude can convert it or leave it out and publish again.`
      : `Not published: ${h} is a type of file artifacts can't include. Claude can convert or rename it and publish again.`;
  }
  return;
}
//@ chunk-06y4szbn.js:27675-28553 placement
var RATE_LIMIT_TEXT = 10,
  $o = 120,
  Zi = "Artifact publishing is rate-limited right now, so nothing was published.",
  Qi =
    " Nothing is wrong with the call: a publishing rate limit refused it, and this tool already waited and sent it once more.",
  es = " Send the same call again",
  Cn = ' with url: "',
  ur = '"',
  pr = " after about ",
  Oo = (e) =>
    ` seconds \u2014 publishing limits are shared, so the wait can be longer while others publish; change nothing${e ? " else" : ""} about the call to get past this.`,
  Po =
    " That artifact was reserved for this publish and nothing has been published to it; targeting it avoids reserving another.",
  hr = " The refused step was ",
  No =
    /^(?:the upload preflight that copying \d{1,4} files? from another artifact needs|staging this publish's \d{1,4} copied files? \((?:"(?:[^"\\\n]|\\.){0,1100}" from artifact [A-Za-z0-9-]{22,36}(?:, (?=")|))+(?:, and \d{1,4} more)?\)); nothing was staged\.$/;
//@ chunk-06y4szbn.js:28553-28797 placement
function copiedFilesSummary(e) {
  let mapped = e.slice(0, 3).map((s) => `${jsonStringify(s.path)} from artifact ${s.fromSlug}`),
    r = e.length > 3 ? `, and ${e.length - 3} more` : "";
  return `staging this publish's ${e.length} copied ${plural(e.length, "file")} (${mapped.join(", ")}${r}); nothing was staged`;
}
//@ chunk-06y4szbn.js:28797-28922 placement
function copyPreflightFailure(e) {
  return `the upload preflight that copying ${e} ${plural(e, "file")} from another artifact needs; nothing was staged`;
}
//@ chunk-06y4szbn.js:28922-29127 placement
var PUBLISH_RATE_LIMITED_MESSAGE =
    "Not published: artifact publishing is rate-limited right now. Claude can try again shortly.",
  PUBLISHED_URL_RE =
    /^https?:\/\/[A-Za-z0-9.-]{1,100}(?::\d{1,5})?(?:\/[A-Za-z0-9._-]{1,40}){0,4}\/[A-Za-z0-9-]{22,36}$/;
//@ chunk-06y4szbn.js:29127-29206 placement
function retryAfterSeconds(e) {
  let ceil = Math.ceil((e ?? 0) / 1000);
  return Math.min(Math.max(ceil, RATE_LIMIT_TEXT), $o);
}
//@ chunk-06y4szbn.js:29206-29341 placement
function rateLimitedMessage(e, n, r) {
  let s = n !== void 0;
  return (
    Zi +
    Qi +
    es +
    (s ? `${Cn}${n}${ur}` : "") +
    `${pr}${e}${Oo(s)}` +
    (s ? Po : "") +
    (r !== void 0 ? `${hr}${r}.` : "")
  );
}
//@ chunk-06y4szbn.js:29341-29781 placement
function parseRateLimitedMessage(e) {
  let n = Zi + Qi + es;
  if (!e.startsWith(n)) return;
  let r = n.length,
    s;
  if (e.startsWith(Cn, r)) {
    let index = e.indexOf(ur, r + Cn.length);
    if (index === -1) return;
    if (((s = e.slice(r + Cn.length, index)), !PUBLISHED_URL_RE.test(s))) return;
    r = index + ur.length;
  }
  if (!e.startsWith(pr, r)) return;
  let h = /^\d{1,3}/.exec(e.slice(r + pr.length))?.[0];
  if (h === void 0) return;
  let index = e.indexOf(hr, r),
    y = index === -1 ? e : e.slice(0, index);
  if (index !== -1 && !No.test(e.slice(index + hr.length))) return;
  return y === rateLimitedMessage(Number(h), s) ? PUBLISH_RATE_LIMITED_MESSAGE : void 0;
}
//@ chunk-06y4szbn.js:29781-30245 placement
var CONTRACT_ROLLOUT_TEXT =
    "Nothing was published and nothing is wrong with the call: this tool chose that contract because it is the server's newest, and it has not reached every server yet. Send the same call again in about a minute; do not pin an older contract to get past this.",
  Io = "Not published: the artifact service is mid-update. Claude can try again in about a minute.",
  Lo = /^deploy 422: contract ([0-9A-Za-z.+-]{1,32}) is newer than the preferred ([0-9A-Za-z.+-]{1,32})\. /;
//@ chunk-06y4szbn.js:30245-30336 placement
function Do(e, n) {
  return `deploy 422: contract ${e} is newer than the preferred ${n}. ${CONTRACT_ROLLOUT_TEXT}`;
}
//@ chunk-06y4szbn.js:30336-30423 placement
function parseContractRolloutMessage(e) {
  let match = Lo.exec(e);
  if (match === null) return;
  return e === Do(match[1], match[2]) ? Io : void 0;
}
//@ chunk-06y4szbn.js:30460-30534 placement
function is(e) {
  return detectEncodingFromBom(e.subarray(0, 4)) === "utf16le" ? "utf-16le" : "utf-8";
}
//@ chunk-06y4szbn.js:30534-30821 placement
function lineColumnAt(e, n) {
  let sliced = e.slice(0, n),
    s = 1;
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
  let s = r === "utf-8",
    h = s ? (n[0] === 239 && n[1] === 187 && n[2] === 191 ? 3 : 0) : 2;
  for (let b = 0; b < e.length;) {
    let y = e.codePointAt(b) ?? 0;
    if (y === 65533) {
      if (!(s ? n[h] === 239 && n[h + 1] === 191 && n[h + 2] === 189 : n[h] === 253 && n[h + 1] === 255))
        return b;
    }
    let x = y > 65535 ? 2 : 1;
    ((h += s ? (y < 128 ? 1 : y < 2048 ? 2 : y < 65536 ? 3 : 4) : x * 2), (b += x));
  }
  return -1;
}
//@ chunk-06y4szbn.js:31119-31175 placement
function decodeText(e) {
  return new TextDecoder(is(e)).decode(e);
}
//@ chunk-06y4szbn.js:31175-31510 placement
function decodeTextStrict(e) {
  let n = is(e);
  try {
    let decode = new TextDecoder(n, { fatal: !0 }).decode(e),
      index = decode.indexOf("\uFFFD");
    if (index === -1) return { text: decode };
    return { problem: { kind: "replacement_char", encoding: n, where: lineColumnAt(decode, index) } };
  } catch {
    let decode = new TextDecoder(n).decode(e),
      s = findUndecodableChar(decode, e, n);
    return {
      problem: {
        kind: "undecodable",
        encoding: n,
        where: lineColumnAt(decode, s === -1 ? decode.indexOf("\uFFFD") : s),
      },
    };
  }
}

export {
  baseMediaType,
  contentTypeMismatchMessage,
  contentTypeForPath,
  lineColumnAt,
  U5n,
  Yi,
  copyPreflightFailure,
  copiedFilesSummary,
  kn,
  B5n,
  rateLimitedMessage,
  retryAfterSeconds,
  CONTRACT_ROLLOUT_TEXT,
  decodeTextStrict,
  safeJsonQuote,
  unservableFileMessage,
  asciiLowerCase,
  decodeText,
  I0o,
  O0o,
  MARKUP_CONTENT_TYPES,
  parseFileTypeRefusal,
  parseRateLimitedMessage,
  parseContractRolloutMessage,
};
