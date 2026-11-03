/**
 * utils/agentListing.ts
 *
 * 2.1.316 新增：代理列表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import {
  isSillyShoreGateOn,
  tagUntrustedArtifactContent,
  toolsUsedManifestText,
  systemReminderWithToolsUsed,
} from "./messages/untrustedArtifactContent.js";
import { isVirtualConversationMessage } from "../bootstrap/sessionSlices.js";
import { uniq } from "./collections.js";
import { readableToolName, UNREADABLE_TOOLS_USED_BEFORE_SUMMARY } from "../bootstrap/stateSlices.js";
import { isMainAgent, isSubagentContext } from "./agentContext.js";
import { getConversationToolsUsed } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:168410-168581 placement
/**
 * 列出摘要前使用过但不可读的工具名（去掉可信的），开关关闭时为空。
 */
function listUnreadableToolsUsed(e, n) {
  if (!isSillyShoreGateOn() || e.length === 0) return [];
  let r = new Set(tagUntrustedArtifactContent(n.filter((s) => !isVirtualConversationMessage(s))));
  return uniq(e.filter((s) => s !== "").map(readableToolName))
    .filter((s) => s === UNREADABLE_TOOLS_USED_BEFORE_SUMMARY || !r.has(s))
    .sort();
}
//@ chunk-e6aww6q8.js:168581-168673 placement
/**
 * 判断是否主代理或主会话的子代理上下文。
 */
function isMainOrMainSessionContext(e, n) {
  if (e === undefined) return n === undefined;
  return isMainAgent(e) || (isSubagentContext(e) && e.isMainSession === true);
}
//@ chunk-e6aww6q8.js:168673-168813 placement
/**
 * 生成用于摘要的已用工具列表（必要时并入整个对话中用过的工具）。
 */
function getToolsUsedForSummary(messages, agentContext, agentId) {
  if (!isSillyShoreGateOn()) return tagUntrustedArtifactContent(messages);
  let conversationToolsUsed = getConversationToolsUsed();
  let h = tagUntrustedArtifactContent(messages, undefined, (y) => conversationToolsUsed.has(y));
  if (!isMainOrMainSessionContext(agentContext, agentId)) return h;
  return uniq([...conversationToolsUsed.names(), ...h]).sort();
}
//@ chunk-e6aww6q8.js:168813-168884 placement
/**
 * 生成摘要用的已用工具标记（闸门关闭时为空）。
 */
function toolsUsedForSummary(e) {
  if (!isSillyShoreGateOn()) return [];
  let conversationToolsUsed = getConversationToolsUsed();
  return tagUntrustedArtifactContent(e, (r) => conversationToolsUsed.has(r));
}
//@ chunk-e6aww6q8.js:168884-168946 placement
/**
 * 列出已用过但无法读取的工具（没有则 undefined）。
 */
function unreadableToolsUsed(e, n) {
  let r = listUnreadableToolsUsed(e, n);
  return r.length === 0 ? undefined : r;
}
//@ chunk-e6aww6q8.js:168946-169019 placement
/**
 * 把无法读取的工具列表渲染成一行说明。
 */
function unreadableToolsLine(e, messages) {
  let r = unreadableToolsUsed(e, messages);
  return r === undefined ? undefined : toolsUsedManifestText(r).trimEnd();
}
//@ chunk-e6aww6q8.js:169019-169085 placement
/**
 * 构造摘要用的伴生消息（标记为 meta）。
 */
function summaryCompanionMessage(e) {
  return {
    content: systemReminderWithToolsUsed(e),
    isMeta: true,
    turnCompanion: true,
  };
}
//@ chunk-e6aww6q8.js:169085-169135 placement
/**
 * 有附加文本时用换行连接，否则原样返回。
 */
function joinWithNewlineIfAny(e, n) {
  return n === undefined
    ? e
    : `${e}
${n}`;
}
//@ chunk-e6aww6q8.js:169135-169253 placement
/**
 * 把偏移数组最后一项加上追加文本的长度。
 */
function adjustLastOffset(promptNoticeLengths, n) {
  if (n === undefined || promptNoticeLengths === undefined || promptNoticeLengths.length === 0)
    return promptNoticeLengths;
  return promptNoticeLengths.map((r, s) => (s === promptNoticeLengths.length - 1 ? r + n.length + 1 : r));
}
export {
  toolsUsedForSummary,
  unreadableToolsLine,
  unreadableToolsUsed,
  summaryCompanionMessage,
  joinWithNewlineIfAny,
  adjustLastOffset,
  getToolsUsedForSummary,
  listUnreadableToolsUsed,
};
