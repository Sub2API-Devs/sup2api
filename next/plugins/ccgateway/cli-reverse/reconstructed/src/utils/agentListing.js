/**
 * utils/agentListing.ts
 *
 * 2.1.316 新增：代理列表
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 11, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isSillyShoreGateOn,
  collectToolsUsedBeforeSummary,
  toolsUsedManifestText,
  systemReminderWithToolsUsed,
} from "./messages/untrustedArtifactContent.js";
import { isVirtualConversationMessage } from "../bootstrap/sessionSlices.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { readableToolName, UNREADABLE_TOOLS_USED_BEFORE_SUMMARY } from "../bootstrap/stateSlices.js";
import { internalAndLegacyNames } from "../services/mcp/serverIdentity.js";
import { isMainAgent, isSubagentContext } from "./agentContext.js";
import { getConversationToolsUsed } from "../bootstrap/state.js";

//@ chunk-5xgkngpb.js:168484-168500 placement
function resetConversationToolsUsed() {}
//@ chunk-5xgkngpb.js:168500-168674 placement
/**
 * 列出可续跑的代理 id：在开关打开时合并代理列表与派生名，排除已停用/已上报的，排序返回。2.1.316 里对应 agentListing 的函数，316 标记 conflict。
 */
function listUnreadableToolsUsed(toolsUsed, messages) {
  if (!isSillyShoreGateOn() || toolsUsed.length === 0) return [];
  let knownTools = new Set(
    collectToolsUsedBeforeSummary(messages.filter((message) => !isVirtualConversationMessage(message))),
  );
  return expandToolAliases(
    normalizeCaseForComparison_2(toolsUsed.filter((toolName) => toolName !== "").map(readableToolName)),
  )
    .filter(
      (readableName) =>
        readableName === UNREADABLE_TOOLS_USED_BEFORE_SUMMARY || !knownTools.has(readableName),
    )
    .sort();
}
//@ chunk-5xgkngpb.js:168674-168729 placement
function expandToolAliases(toolNames) {
  return normalizeCaseForComparison_2(
    toolNames.flatMap((toolName) => [toolName, ...internalAndLegacyNames(toolName)]),
  );
}
//@ chunk-5xgkngpb.js:168729-168821 placement
/**
 * 判断是否主代理或主会话的子代理上下文。
 */
function isMainOrMainSessionContext(agentContext, agentId) {
  if (agentContext === undefined) return agentId === undefined;
  return (
    isMainAgent(agentContext) || (isSubagentContext(agentContext) && agentContext.isMainSession === true)
  );
}
//@ chunk-5xgkngpb.js:168821-168987 placement
/**
 * 生成用于摘要的已用工具列表（必要时并入整个对话中用过的工具）。
 */
function getToolsUsedForSummary(messages, agentContext, agentId) {
  if (!isSillyShoreGateOn()) return expandToolAliases(collectToolsUsedBeforeSummary(messages)).sort();
  let conversationToolsUsed = getConversationToolsUsed();
  let taggedTools = collectToolsUsedBeforeSummary(messages, undefined, (toolName) =>
    conversationToolsUsed.has(toolName),
  );
  if (!isMainOrMainSessionContext(agentContext, agentId)) return expandToolAliases(taggedTools).sort();
  return expandToolAliases(
    normalizeCaseForComparison_2([...conversationToolsUsed.names(), ...taggedTools]),
  ).sort();
}
//@ chunk-5xgkngpb.js:168987-169058 placement
/**
 * 生成摘要用的已用工具标记（闸门关闭时为空）。
 */
function toolsUsedForSummary(messages) {
  if (!isSillyShoreGateOn()) return [];
  let conversationToolsUsed = getConversationToolsUsed();
  return collectToolsUsedBeforeSummary(messages, (toolName) => conversationToolsUsed.has(toolName));
}
//@ chunk-5xgkngpb.js:169058-169143 placement
/**
 * 列出已用过但无法读取的工具（没有则 undefined）。
 */
function unreadableToolsUsed(toolsUsed, messages) {
  if (isSillyShoreGateOn()) getConversationToolsUsed().record(toolsUsed);
  let unreadable = listUnreadableToolsUsed(toolsUsed, messages);
  return unreadable.length === 0 ? undefined : unreadable;
}
//@ chunk-5xgkngpb.js:169143-169267 layout
function unreadableToolsFromEntries(entries, options) {
  if (!isSillyShoreGateOn()) return [];
  let conversationToolsUsed = getConversationToolsUsed();
  conversationToolsUsed.record(entries.flatMap((entry) => entry.pollEvent?.toolsUsed ?? []));
  return listUnreadableToolsUsed(conversationToolsUsed.names(), options);
}
//@ chunk-5xgkngpb.js:169267-169341 placement
/**
 * 把无法读取的工具列表渲染成一行说明。
 */
function unreadableToolsLine(toolsUsed, messages) {
  let unreadable = unreadableToolsUsed(toolsUsed, messages);
  return unreadable === undefined ? undefined : toolsUsedManifestText(unreadable).trimEnd();
}
//@ chunk-5xgkngpb.js:169341-169407 placement
/**
 * 构造摘要用的伴生消息（标记为 meta）。
 */
function summaryCompanionMessage(toolsUsed) {
  return {
    content: systemReminderWithToolsUsed(toolsUsed),
    isMeta: true,
    turnCompanion: true,
  };
}
//@ chunk-5xgkngpb.js:169407-169457 placement
/**
 * 有附加文本时用换行连接，否则原样返回。
 */
function joinWithNewlineIfAny(firstText, secondText) {
  return secondText === undefined
    ? firstText
    : `${firstText}
${secondText}`;
}
//@ chunk-5xgkngpb.js:169457-169575 placement
/**
 * 把偏移数组最后一项加上追加文本的长度。
 */
function adjustLastOffset(promptNoticeLengths, appendText) {
  if (appendText === undefined || promptNoticeLengths === undefined || promptNoticeLengths.length === 0)
    return promptNoticeLengths;
  return promptNoticeLengths.map((offset, index) =>
    index === promptNoticeLengths.length - 1 ? offset + appendText.length + 1 : offset,
  );
}
export {
  unreadableToolsFromEntries,
  unreadableToolsUsed,
  joinWithNewlineIfAny,
  unreadableToolsLine,
  toolsUsedForSummary,
  getToolsUsedForSummary,
  listUnreadableToolsUsed,
  summaryCompanionMessage,
  resetConversationToolsUsed,
  adjustLastOffset,
};
