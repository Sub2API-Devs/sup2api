/**
 * utils/messages/ultrathinkPaste.ts
 *
 * ultrathink 触发时把粘贴内容并进消息，以及 fork 后缀与长度截断（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPersonTurn } from "./ultrathinkOrigin.js";
import { lastTextBlockText } from "../historyFile.js";
import { PASTED_CONTENT_OPEN_PREFIX } from "../pastedContent.js";
import { ULTRATHINK_KEYWORD } from "../ultraplan/keyword.js";
import { stripSystemReminders } from "../../components/messageActions.js";
import { CIRCLE_MARK_GLYPH } from "../../constants/figures.js";
import { sanitizeSessionTitle, truncateCodePoints } from "../stringUtils.js";
import { MAX_SEED_NAME_CHARS } from "../swarm/teammateIds.js";

//@ chunk-nh1pvp1m.js:130248-130669 placement
/**
 * 判定一条消息是否是带粘贴内容的 ultrathink 触发消息（且内容尚未合并）。
 */
function isUltrathinkPrompt(message) {
  if (
    !("ultrathink_typed" in message) ||
    message.ultrathink_typed !== true ||
    !isPersonTurn(message) ||
    !isEmpty("inline_pastes" in message ? message.inline_pastes : undefined) ||
    !isEmpty("pasted_content" in message ? message.pasted_content : undefined)
  )
    return false;
  let content =
    "message" in message &&
    typeof message.message === "object" &&
    message.message !== null &&
    "content" in message.message
      ? message.message.content
      : undefined;
  let text = typeof content === "string" || Array.isArray(content) ? lastTextBlockText(content) : null;
  return (
    typeof text === "string" &&
    !text.includes(PASTED_CONTENT_OPEN_PREFIX) &&
    ULTRATHINK_KEYWORD(stripSystemReminders(text)).length > 0
  );
}
//@ chunk-nh1pvp1m.js:130669-130731 placement
function isEmpty(value) {
  return value == null || (Array.isArray(value) && value.length === 0);
}
//@ chunk-nh1pvp1m.js:133640-133656 placement
var CIRCLE_PREFIX = ` ${CIRCLE_MARK_GLYPH}`;
//@ chunk-nh1pvp1m.js:133656-133977 placement
/**
 * 会话标题的 fork 后缀处理与长度截断。
 */
function forkTitleFor(title) {
  let replaced = sanitizeSessionTitle(title).replace(/\s+/g, " ");
  if (!replaced) return "";
  let forkCount = 1;
  let base = replaced;
  while (base.endsWith(CIRCLE_PREFIX)) {
    base = base.slice(0, -CIRCLE_PREFIX.length);
    forkCount++;
  }
  if (!base.replaceAll(CIRCLE_MARK_GLYPH, "").trim()) {
    base = replaced;
    forkCount = 1;
  }
  let match = base.match(/^(.*) \(fork(?: (\d{1,15}))?\)$/);
  let existingForkIndex = match ? Number(match[2] ?? 1) : 0;
  let suffix = match || forkCount > 1 ? ` (fork ${existingForkIndex + forkCount})` : " (fork)";
  return `${truncateCodePoints(match?.[1] ?? base, MAX_SEED_NAME_CHARS - suffix.length).trimEnd()}${suffix}`;
}
export { isUltrathinkPrompt, forkTitleFor };
