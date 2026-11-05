/**
 * services/artifacts/presenceTranscript.ts
 *
 * presence 转录条目构造（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tsrpnscb.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isHumanTurn } from "../../utils/turnOrigin.js";
import { parseArtifactUrlAnyCase } from "../../tools/ArtifactTool/constants.js";
import { decodeBase58Uuid } from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tsrpnscb.js:24427-24708 placement (2.1.88 match: buildTranscriptEntries, 0.902)
function findHumanMessagesContaining(messages, text) {
  let repoUrl = text.toLowerCase();
  let lines = [];
  for (let j = 0; j < messages.length; j++) {
    let message = messages[j];
    try {
      let isHuman = !isHumanTurn(message)
        ? null
        : message.type === "user"
          ? joinTextContentOrNull(message.message?.content)
          : message.type === "attachment" && message.attachment.type === "queued_command"
            ? joinTextContentOrNull(message.attachment.prompt)
            : null;
      if (isHuman !== null && mentionsCurrentRepoUrl(isHuman, repoUrl)) lines.push(j);
    } catch {}
  }
  return lines;
}
//@ chunk-tsrpnscb.js:24708-25119 placement
/**
 * 识别会话记录里 URL 的正则：http 前缀、裸域名路径、空白与零宽字符、首尾标点、Markdown 链接；以及 artifact-files 标记。
 */
var HTTP_URL_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BARE_HOST_PATH_RE;
var WHITESPACE_CLASS;
var WHITESPACE_RE;
var ZERO_WIDTH_RE;
var LEADING_PUNCT;
var LEADING_PUNCT_RE;
var TRAILING_PUNCT_RE;
var MARKDOWN_LINK_RE;
var ARTIFACT_FILES;
deferInit("chunk-tsrpnscb.js:24708", () => {
  HTTP_URL_RE = /^https?:\/\//i;
  BARE_HOST_PATH_RE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?\//i;
  WHITESPACE_CLASS = "\\t\\n\\v\\f\\r \\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000";
  WHITESPACE_RE = new RegExp(`[${WHITESPACE_CLASS}]+`);
  ZERO_WIDTH_RE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/;
  LEADING_PUNCT = "(<[{'\"`*_~";
  LEADING_PUNCT_RE = new RegExp(`^[${LEADING_PUNCT}]+`);
  TRAILING_PUNCT_RE = /[.,;:!?)\]}'">`*_~\u200b]+$/;
  MARKDOWN_LINK_RE = new RegExp(
    `(?<=^|[${WHITESPACE_CLASS}])[${LEADING_PUNCT}]*!?\\[[^\\][\\n]*\\]\\(([^\\s()]+)\\)`,
    "g",
  );
  ARTIFACT_FILES = "artifact-files";
});
//@ chunk-tsrpnscb.js:25119-25240 placement
function mentionsCurrentRepoUrl(text, repoUrl) {
  for (let match of text.matchAll(MARKDOWN_LINK_RE))
    if (getCurrentRepoHttpsUrl(match[1], repoUrl)) return true;
  return text
    .split(WHITESPACE_RE)
    .some((url) => getCurrentRepoHttpsUrl(url.replace(LEADING_PUNCT_RE, ""), repoUrl));
}
//@ chunk-tsrpnscb.js:25240-25507 placement (2.1.88 match: getCurrentRepoHttpsUrl, 0.805)
function getCurrentRepoHttpsUrl(url, repoName) {
  let replaced = url.replace(TRAILING_PUNCT_RE, "");
  if (ZERO_WIDTH_RE.test(replaced)) return false;
  if (HTTP_URL_RE.test(replaced) || BARE_HOST_PATH_RE.test(replaced)) {
    let withScheme = HTTP_URL_RE.test(replaced) ? replaced : `https://${replaced}`;
    return parseArtifactUrlAnyCase(withScheme)?.slug === repoName;
  }
  let parts = replaced.toLowerCase().split(/[/\\]/);
  if (parts.length > 1)
    return parts.some((part, partIndex) => part === repoName && parts[partIndex - 1] === ARTIFACT_FILES);
  return parts[0] === repoName || decodeBase58Uuid(replaced) === repoName;
}
//@ chunk-tsrpnscb.js:25507-25761 placement (2.1.88 match: extractErrorTypeFromData, 1)
function joinTextContentOrNull(data) {
  if (typeof data === "string") return data;
  if (!Array.isArray(data)) return null;
  let out = [];
  for (let entry of data)
    if (
      typeof entry === "object" &&
      entry !== null &&
      "type" in entry &&
      entry.type === "text" &&
      "text" in entry &&
      typeof entry.text === "string"
    )
      out.push(entry.text);
  return out.length > 0
    ? out.join(`
`)
    : null;
}
export { findHumanMessagesContaining };
