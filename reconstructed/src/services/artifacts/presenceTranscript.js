/**
 * services/artifacts/presenceTranscript.ts
 *
 * presence 转录条目构造（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aqdf5t3e.js (5)
 * attribution: placement 5
 */
import { isHumanTurn } from "../../utils/turnOrigin.js";
import { parseArtifactUrlAnyCase } from "../../tools/ArtifactTool/constants.js";
import { decodeBase58Uuid } from "../../utils/messages.js";

//@ chunk-aqdf5t3e.js:24386-24667 placement = buildTranscriptEntries (0.777)
function findHumanMessagesContaining(messages, text) {
  let lower = text.toLowerCase();
  let s = [];
  for (let j = 0; j < messages.length; j++) {
    let a = messages[j];
    try {
      let d = !isHumanTurn(a)
        ? null
        : a.type === "user"
          ? joinTextContentOrNull(a.message?.content)
          : a.type === "attachment" && a.attachment.type === "queued_command"
            ? joinTextContentOrNull(a.attachment.prompt)
            : null;
      if (d !== null && mentionsCurrentRepoUrl(d, lower)) s.push(j);
    } catch {}
  }
  return s;
}
//@ chunk-aqdf5t3e.js:24667-25078 placement
/**
 * 识别会话记录里 URL 的正则：http 前缀、裸域名路径、空白与零宽字符、首尾标点、Markdown 链接；以及 artifact-files 标记。
 */
var HTTP_URL_RE = /^https?:\/\//i;
var BARE_HOST_PATH_RE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?\//i;
var WHITESPACE_CLASS = "\\t\\n\\v\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
var WHITESPACE_RE = new RegExp(`[${WHITESPACE_CLASS}]+`);
var ZERO_WIDTH_RE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/;
var LEADING_PUNCT = "(<[{'\"`*_~";
var LEADING_PUNCT_RE = new RegExp(`^[${LEADING_PUNCT}]+`);
var TRAILING_PUNCT_RE = /[.,;:!?)\]}'">`*_~\u200b]+$/;
var MARKDOWN_LINK_RE = new RegExp(
  `(?<=^|[${WHITESPACE_CLASS}])[${LEADING_PUNCT}]*!?\\[[^\\][\\n]*\\]\\(([^\\s()]+)\\)`,
  "g",
);
var ARTIFACT_FILES = "artifact-files";
//@ chunk-aqdf5t3e.js:25078-25199 placement
function mentionsCurrentRepoUrl(e, n) {
  for (let r of e.matchAll(MARKDOWN_LINK_RE)) if (getCurrentRepoHttpsUrl(r[1], n)) return true;
  return e.split(WHITESPACE_RE).some((r) => getCurrentRepoHttpsUrl(r.replace(LEADING_PUNCT_RE, ""), n));
}
//@ chunk-aqdf5t3e.js:25199-25466 placement = getCurrentRepoHttpsUrl (0.803)
function getCurrentRepoHttpsUrl(e, n) {
  let replaced = e.replace(TRAILING_PUNCT_RE, "");
  if (ZERO_WIDTH_RE.test(replaced)) return false;
  if (HTTP_URL_RE.test(replaced) || BARE_HOST_PATH_RE.test(replaced)) {
    let h = HTTP_URL_RE.test(replaced) ? replaced : `https://${replaced}`;
    return parseArtifactUrlAnyCase(h)?.slug === n;
  }
  let parts = replaced.toLowerCase().split(/[/\\]/);
  if (parts.length > 1) return parts.some((h, a) => h === n && parts[a - 1] === ARTIFACT_FILES);
  return parts[0] === n || decodeBase58Uuid(replaced) === n;
}
//@ chunk-aqdf5t3e.js:25466-25720 placement = extractErrorTypeFromData (1)
function joinTextContentOrNull(data) {
  if (typeof data === "string") return data;
  if (!Array.isArray(data)) return null;
  let n = [];
  for (let r of data)
    if (
      typeof r === "object" &&
      r !== null &&
      "type" in r &&
      r.type === "text" &&
      "text" in r &&
      typeof r.text === "string"
    )
      n.push(r.text);
  return n.length > 0
    ? n.join(`
`)
    : null;
}
export { findHumanMessagesContaining };
