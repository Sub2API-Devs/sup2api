/**
 * components/messageActions.tsx
 *
 * 消息操作：可导航消息判定、复制文本、工具调用/结果提取、消息操作栏与 MessageActionsKeybindings。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messageActions.tsx
 * pieces: chunk-0yw3taqg.js (1), chunk-5xgkngpb.js (14), chunk-8prszgkd.js (1), chunk-aexe35rn.js (1), chunk-hnxhr3bs.js (2), chunk-p762h6ag.js (1), chunk-tdcrpxkn.js (1)
 * attribution: fingerprint 9, placement 7, layout 4, sole-consumer 1
 */
import { HOOK_RESPONSE_POLL_MS } from "../utils/hooks/hookEvents.js";
import { postSwitchSlot } from "../utils/model/modelSwitchHooks.js";
import { withDeadline } from "../utils/sleep.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, array, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { isInterruptedCall } from "../plugins/functionHooks/ui/interactions.js";
import { normalizeCaseForComparison_2 } from "../utils/permissions/filesystem.js";
import { codeModeAccepted } from "../utils/codeMode/accepted.js";
import {
  isCollapsibleToolResult,
  shouldSkipMessage,
  isTextBreaker,
  isPlaceholderAssistantMessage,
  isSignedThinkingMessage,
  memorySaveHooks,
  ARTIFACT_TOOL_NAME,
  isPublishShapedArtifactAction,
} from "../utils/collapseReadSearch.js";
import { collapsedNotificationKind } from "../utils/queuedCommandDisplay.js";
import { findToolByName } from "../Tool.js";
import { getValidHookLabel } from "../utils/collapseHookSummaries.js";
import { AGENT, TASK } from "../tools/AgentTool/constants.js";
import { truncateToLength, collapseWhitespace as collapseWhitespace_2 } from "../utils/stringUtils.js";
import { deviceToolDisplayInfo } from "../utils/toolUseDisplay.js";
import { FILE_EDITING_TOOL_NAMES, countEditLines } from "../tools/AgentTool/agentLaunch.js";
import { countWhere } from "../utils/collections.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useState, useLayoutEffect, useEffect } from "../../vendor/react/cjs/react.production.js";
import { asSafePathKey } from "../services/api/errors.js";
import { isKnownContentBlockType } from "../services/api/requestHeaders.js";
import { logError } from "../utils/log.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { wrapAnsi } from "../ink/wrapAnsi.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aexe35rn.js:6521-6911 fingerprint (2.1.88 match: stripSystemReminders, 0.873)
function stripSystemReminders(text) {
  let rawText = text.trimStart();
  let hasSystemReminder = false;
  while (rawText.startsWith("<system-reminder>")) {
    let end = rawText.indexOf("</system-reminder>");
    if (end < 0) break;
    rawText = rawText.slice(end + 18).trimStart();
    hasSystemReminder = true;
  }
  let match = (hasSystemReminder ? rawText : text).trimEnd();
  while (match.endsWith("</system-reminder>")) {
    let index = match.lastIndexOf(`
`);
    if (!(index < 0 ? match : match.slice(index + 1)).startsWith("<system-reminder>")) break;
    match = (index < 0 ? "" : match.slice(0, index)).trimEnd();
    hasSystemReminder = true;
  }
  if (!hasSystemReminder) return text;
  return match === "" ? text : match;
}
//@ chunk-5xgkngpb.js:3516252-3516802 fingerprint (2.1.88 match: copyTextOf, 0.328)
async function copyTextOf(session, timeoutMs = HOOK_RESPONSE_POLL_MS) {
  let postSwitch = postSwitchSlot.of(session);
  if (postSwitch.inFlight.size > 0 && postSwitch.landedOn?.sessionId === session.id)
    await withDeadline(Promise.all([...postSwitch.inFlight]), timeoutMs);
  let pending = postSwitch.pending;
  postSwitch.pending = [];
  let filtered = pending.filter((state) => state.sessionId === session.id);
  let toModel = postSwitch.landedOn?.sessionId === session.id ? postSwitch.landedOn.toModel : undefined;
  let text = new Set();
  return filtered.filter((entry) => {
    if (entry.toModel !== toModel) return false;
    let tc = jsonStringify([
      entry.contexts,
      entry.messages.map((message) =>
        message.type === "attachment"
          ? [
              message.attachment.type,
              "content" in message.attachment ? message.attachment.content : "",
              "stderr" in message.attachment ? message.attachment.stderr : "",
            ]
          : message.type,
      ),
    ]);
    if (text.has(tc)) return false;
    text.add(tc);
    return true;
  });
}
//@ chunk-5xgkngpb.js:4258292-4258346 fingerprint (2.1.88 match: isApplicable, 0.463)
var isApplicable; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4258292", () => {
  isApplicable = DoctorLazy(() =>
    objectSchema({
      compilerOptions: objectSchema({
        types: array(stringSchema()),
      }),
    }),
  );
});
//@ chunk-5xgkngpb.js:4792839-4793008 fingerprint (2.1.88 match: toolCallOf, 1)
function toolCallOf(msg) {
  if (msg.type === "assistant") {
    let firstBlock = msg.message.content[0];
    return firstBlock?.type === "tool_use" ? firstBlock.name : null;
  }
  if (msg.type === "grouped_tool_use") return msg.toolName;
  return null;
}
//@ chunk-5xgkngpb.js:4796317-4796487 placement
function toolResultText(message, toolUseIds) {
  if (message.type !== "user") return false;
  let matched = false;
  for (let block of message.message.content) {
    if (block.type !== "tool_result") continue;
    if (!toolUseIds.has(block.tool_use_id)) return false;
    matched = true;
  }
  return matched;
}
//@ chunk-5xgkngpb.js:4796487-4796699 layout
function skipVirtualCallRun(messages, start) {
  let index = start;
  let interrupted = false;
  let sawVirtual = false;
  for (; index < messages.length; index++) {
    let message = messages[index];
    if (
      (message.type === "assistant" || message.type === "user") &&
      (message.isVirtual || message.remoteVirtual)
    ) {
      sawVirtual = true;
      interrupted ||= isInterruptedCall(message);
    } else if (sawVirtual || !isToolCallRow(message)) break;
  }
  return {
    end: index,
    interrupted,
  };
}
//@ chunk-5xgkngpb.js:4796699-4796939 layout
function toolNameForResult(message, messages) {
  let firstBlock = message.type === "user" ? message.message.content[0] : undefined;
  if (firstBlock?.type !== "tool_result") return;
  for (let message of messages) {
    let firstContentBlock = message.type === "assistant" ? message.message.content[0] : undefined;
    if (firstContentBlock?.type === "tool_use" && firstContentBlock.id === firstBlock.tool_use_id)
      return firstContentBlock.name;
  }
  return;
}
//@ chunk-5xgkngpb.js:4796939-4797153 layout
function isToolCallRow(message) {
  if (message.type === "assistant") return message.message.content[0]?.type === "tool_use";
  if (message.type !== "user") return false;
  let content = message.message.content;
  return (
    Array.isArray(content) && content.length > 0 && content.every((block) => block?.type === "tool_result")
  );
}
//@ chunk-5xgkngpb.js:4797153-4797406 layout (2.1.88 match: toolCallOf, 1)
function toolCallOf_3(msg) {
  if (msg.type === "assistant") {
    let block = msg.message.content[0];
    if (block?.type === "tool_use") return [block.id];
  }
  if (msg.type === "grouped_tool_use")
    return msg.messages
      .map((message) => {
        let block = message.message.content[0];
        return block.type === "tool_use" ? block.id : "";
      })
      .filter(Boolean);
  return [];
}
//@ chunk-5xgkngpb.js:4797406-4797482 placement
/**
 * 函数 collectToolUseIds（收集消息组的工具调用 id）；位于「消息操作：可导航消息判定、复制文本、工具调用/结果提取、消息操作栏与 MessageActionsKeybindings」模块。
 */
function collectToolUseIds(conversation) {
  let ids = [];
  for (let message of conversation.messages) ids.push(...toolCallOf_3(message));
  return ids;
}
//@ chunk-5xgkngpb.js:4797482-4797534 placement
/**
 * 函数 hasAnyToolUseId（是否有任一 id 在集合内）；位于「消息操作：可导航消息判定、复制文本、工具调用/结果提取、消息操作栏与 MessageActionsKeybindings」模块。
 */
function hasAnyToolUseId(msg, inProgressToolUseIDs) {
  return collectToolUseIds(msg).some((id) => inProgressToolUseIDs.has(id));
}
//@ chunk-5xgkngpb.js:4810905-4813815 placement
/**
 * 把一个折叠的读/搜组的各项计数（搜索、读取、记忆、MCP、Bash、编辑行数、提交、钩子、思考时长等）累加进另一个组，并追加消息。
 */
function mergeCollapsedReadSearch(target, source) {
  target.searchCount += source.searchCount;
  target.readCount += source.readCount;
  target.listCount += source.listCount;
  target.memorySearchCount += source.memorySearchCount;
  target.memoryReadCount += source.memoryReadCount;
  target.memoryWriteCount += source.memoryWriteCount;
  if (source.teamMemorySearchCount)
    target.teamMemorySearchCount = (target.teamMemorySearchCount ?? 0) + source.teamMemorySearchCount;
  if (source.teamMemoryReadCount)
    target.teamMemoryReadCount = (target.teamMemoryReadCount ?? 0) + source.teamMemoryReadCount;
  if (source.teamMemoryWriteCount)
    target.teamMemoryWriteCount = (target.teamMemoryWriteCount ?? 0) + source.teamMemoryWriteCount;
  if (source.accountMemoryReadKeys?.length)
    target.accountMemoryReadKeys = normalizeCaseForComparison_2([
      ...(target.accountMemoryReadKeys ?? []),
      ...source.accountMemoryReadKeys,
    ]);
  if (source.accountMemorySearchCount)
    target.accountMemorySearchCount =
      (target.accountMemorySearchCount ?? 0) + source.accountMemorySearchCount;
  if (source.accountMemoryRecalls?.length)
    target.accountMemoryRecalls = [...(target.accountMemoryRecalls ?? []), ...source.accountMemoryRecalls];
  if (source.scratchpadWriteCount) {
    target.scratchpadWriteCount = (target.scratchpadWriteCount ?? 0) + source.scratchpadWriteCount;
    target.scratchpadLinesAdded = (target.scratchpadLinesAdded ?? 0) + (source.scratchpadLinesAdded ?? 0);
    target.scratchpadLinesRemoved =
      (target.scratchpadLinesRemoved ?? 0) + (source.scratchpadLinesRemoved ?? 0);
  }
  if (source.relevantMemories?.length)
    target.relevantMemories = [...(target.relevantMemories ?? []), ...source.relevantMemories];
  if (source.memorySaves?.length) target.memorySaves = [...(target.memorySaves ?? []), ...source.memorySaves];
  if (source.mcpCallCount) {
    target.mcpCallCount = (target.mcpCallCount ?? 0) + source.mcpCallCount;
    target.mcpCallLabels = normalizeCaseForComparison_2([
      ...(target.mcpCallLabels ?? []),
      ...(source.mcpCallLabels ?? []),
    ]);
  }
  if (source.bashCount) target.bashCount = (target.bashCount ?? 0) + source.bashCount;
  if (source.gitOpBashCount) target.gitOpBashCount = (target.gitOpBashCount ?? 0) + source.gitOpBashCount;
  if (source.otherToolCount) target.otherToolCount = (target.otherToolCount ?? 0) + source.otherToolCount;
  if (source.agentCount) {
    target.agentCount = (target.agentCount ?? 0) + source.agentCount;
    if (source.agentDescriptions)
      target.agentDescriptions = [...(target.agentDescriptions ?? []), ...source.agentDescriptions];
  }
  if (source.frameCount) target.frameCount = (target.frameCount ?? 0) + source.frameCount;
  if (source.editFileCount) target.editFileCount = (target.editFileCount ?? 0) + source.editFileCount;
  if (source.linesAdded) target.linesAdded = (target.linesAdded ?? 0) + source.linesAdded;
  if (source.linesRemoved) target.linesRemoved = (target.linesRemoved ?? 0) + source.linesRemoved;
  if (source.commits?.length) target.commits = [...(target.commits ?? []), ...source.commits];
  if (source.pushes?.length) target.pushes = [...(target.pushes ?? []), ...source.pushes];
  if (source.branches?.length) target.branches = [...(target.branches ?? []), ...source.branches];
  if (source.prs?.length) target.prs = [...(target.prs ?? []), ...source.prs];
  if (source.readFilePaths?.length)
    target.readFilePaths = [...(target.readFilePaths ?? []), ...source.readFilePaths];
  if (source.searchArgs?.length) target.searchArgs = [...(target.searchArgs ?? []), ...source.searchArgs];
  if (source.hookCount) {
    target.hookCount = (target.hookCount ?? 0) + source.hookCount;
    target.hookTotalMs = (target.hookTotalMs ?? 0) + (source.hookTotalMs ?? 0);
    target.hookInfos = [...(target.hookInfos ?? []), ...(source.hookInfos ?? [])];
  }
  target.latestDisplayHint = source.latestDisplayHint ?? target.latestDisplayHint;
  if (source.thoughtForMs) target.thoughtForMs = (target.thoughtForMs ?? 0) + source.thoughtForMs;
  target.latestThinkingSummary = source.latestThinkingSummary ?? target.latestThinkingSummary;
  if (codeModeAccepted() && source.stopShownAfter === true) target.stopShownAfter = true;
  target.messages.push(...source.messages);
}
//@ chunk-5xgkngpb.js:4814144-4818016 placement
function isNavigableMessage(collapsedBase, tools, getTaskStats, isLoading = false, options = {}) {
  if (options.transcriptV2) return collapsedBase;
  let result = [];
  let collapseHead = options.keepAllText !== true;
  let index = 0;
  while (index < collapsedBase.length) {
    let message = collapsedBase[index];
    if (!isCollapsibleToolResult(message)) {
      result.push(message);
      index++;
      continue;
    }
    let headStart = index;
    let agentCount = 0;
    let bashCount = 0;
    let headMessages = [];
    if (collapseHead)
      while (index < collapsedBase.length) {
        let message = collapsedBase[index];
        if (message.type !== "user") break;
        let notificationKind = collapsedNotificationKind(message);
        if (notificationKind === null) break;
        if (notificationKind.kind === "agent") agentCount += notificationKind.count;
        else bashCount += notificationKind.count;
        headMessages.push(message);
        index++;
      }
    if (headMessages.length === 0) {
      result.push(message);
      index++;
    }
    let nextToolIndex = index;
    while (nextToolIndex < collapsedBase.length && !isCollapsibleToolResult(collapsedBase[nextToolIndex]))
      nextToolIndex++;
    let isLiveTail = isLoading && nextToolIndex === collapsedBase.length;
    if (isLiveTail) {
      let lastIndex = nextToolIndex - 1;
      while (lastIndex >= index && shouldSkipMessage(collapsedBase[lastIndex])) lastIndex--;
      let msg = lastIndex >= index ? collapsedBase[lastIndex] : undefined;
      if (
        msg?.type === "assistant" &&
        msg.message.stop_reason !== null &&
        (isTextBreaker(msg) || isPlaceholderAssistantMessage(msg))
      )
        isLiveTail = false;
    }
    let textBreakerIndex = -1;
    if (!isLiveTail) {
      for (let idx = nextToolIndex - 1; idx >= index; idx--)
        if (isTextBreaker(collapsedBase[idx])) {
          textBreakerIndex = idx;
          break;
        }
    }
    let errorRows = new Set();
    if (options.keepAllText === true) {
      let errorToolIds = new Set();
      for (let idx = index; idx < nextToolIndex; idx++) {
        let message = collapsedBase[idx];
        if (message.type !== "user") continue;
        for (let block of message.message.content)
          if (
            typeof block === "object" &&
            block !== null &&
            block.type === "tool_result" &&
            block.is_error === true
          )
            errorToolIds.add(block.tool_use_id);
      }
      for (let idx = index; idx < nextToolIndex; idx++) {
        let msg = collapsedBase[idx];
        if (isTextBreaker(msg)) {
          errorRows.add(idx);
          continue;
        }
        if (msg.type === "assistant") {
          let block = msg.message.content[0];
          if (block?.type === "tool_use" && errorToolIds.has(block.id)) errorRows.add(idx);
          continue;
        }
        if (msg.type !== "user") continue;
        for (let block of msg.message.content)
          if (
            typeof block === "object" &&
            block !== null &&
            block.type === "tool_result" &&
            block.is_error === true &&
            errorToolIds.has(block.tool_use_id)
          ) {
            errorRows.add(idx);
            break;
          }
      }
    }
    let hiddenIndexes = new Set();
    let seenToolNames = new Set();
    for (let idx = nextToolIndex - 1; !isLiveTail && idx >= index; idx--) {
      let message = collapsedBase[idx];
      if (message.type !== "assistant") continue;
      let block = message.message.content[0];
      if (block?.type !== "tool_use" || seenToolNames.has(block.name)) continue;
      seenToolNames.add(block.name);
      if (findToolByName(tools, block.name)?.briefStandalone) {
        hiddenIndexes.add(idx);
        for (let idx_2 = idx + 1; idx_2 < nextToolIndex; idx_2++) {
          let message = collapsedBase[idx_2];
          if (message.type === "assistant") break;
          if (message.type !== "user") continue;
          let resultBlock = message.message.content[0];
          if (resultBlock?.type === "tool_result" && resultBlock.tool_use_id === block.id) {
            hiddenIndexes.add(idx_2);
            break;
          }
        }
      }
    }
    let target = null;
    let groupStart = nextToolIndex;
    if (headMessages.length > 0) {
      target = createCollapsedReadSearchGroup(headMessages[0]);
      target.messages = [...headMessages];
      if (agentCount > 0) target.agentCount = agentCount;
      if (bashCount > 0) target.bashCount = bashCount;
      groupStart = headStart;
    }
    let groups = [];
    let flushGroup = () => {
      if (target) {
        groups.push([groupStart, target]);
        target = null;
        groupStart = nextToolIndex;
      }
    };
    let plainInfoCount = 0;
    for (let idx = index; idx < nextToolIndex; idx++) {
      if (idx === textBreakerIndex || errorRows.has(idx) || hiddenIndexes.has(idx)) {
        if (
          options.keepAllText === true &&
          (errorRows.has(idx) || idx === textBreakerIndex) &&
          isTextBreaker(collapsedBase[idx])
        )
          flushGroup();
        continue;
      }
      let message = collapsedBase[idx];
      if (message.type === "system") {
        if (message.subtype === "informational" && message.level === "info") plainInfoCount++;
        else if (message.subtype === "stop_hook_summary" && getValidHookLabel(message) !== undefined);
        else hiddenIndexes.add(idx);
        continue;
      }
      let source = null;
      if (message.type === "collapsed_read_search") source = message;
      else if (message.type === "grouped_tool_use")
        source = createCollapsedToolGroup(
          message,
          message.toolName,
          message.messages.map((message) => message.message.content[0]?.input),
          tools,
        );
      else if (message.type === "assistant") {
        let block = message.message.content[0];
        if (block?.type === "tool_use")
          source = createCollapsedToolGroup(message, block.name, [block.input], tools);
        else if (isPlaceholderAssistantMessage(message)) plainInfoCount++;
        else if (
          (block?.type === "thinking" || block?.type === "redacted_thinking") &&
          !isSignedThinkingMessage(message)
        )
          plainInfoCount++;
      } else if (message.type === "user") {
        if (target) {
          target.messages.push(message);
          let toolUseResult = message.toolUseResult;
          let stats =
            toolUseResult?.toolStats ??
            (toolUseResult?.status === "async_launched" && toolUseResult.agentId
              ? getTaskStats?.(toolUseResult.agentId)
              : undefined);
          if (stats) {
            target.readCount += stats.readCount;
            target.searchCount += stats.searchCount;
            if (stats.bashCount) target.bashCount = (target.bashCount ?? 0) + stats.bashCount;
            if (stats.editFileCount) target.editFileCount = (target.editFileCount ?? 0) + stats.editFileCount;
            if (stats.linesAdded) target.linesAdded = (target.linesAdded ?? 0) + stats.linesAdded;
            if (stats.linesRemoved) target.linesRemoved = (target.linesRemoved ?? 0) + stats.linesRemoved;
            if (stats.otherToolCount)
              target.otherToolCount = (target.otherToolCount ?? 0) + stats.otherToolCount;
            if (stats.frameCount) target.frameCount = (target.frameCount ?? 0) + stats.frameCount;
          }
        }
      }
      if (message.type === "attachment") plainInfoCount++;
      if (source)
        if (target) mergeCollapsedReadSearch(target, source);
        else {
          target = {
            ...source,
            messages: [...source.messages],
          };
          groupStart = idx;
        }
    }
    if (textBreakerIndex !== -1) hiddenIndexes.add(textBreakerIndex);
    for (let idx of errorRows) hiddenIndexes.add(idx);
    let mapped = [...hiddenIndexes].map((idx) => [idx, collapsedBase[idx]]);
    flushGroup();
    for (let [idx, group] of groups) {
      group.uuid = `brief-${group.uuid}`;
      if (isLiveTail && options.keepAllText !== true && group === groups.at(-1)?.[1])
        group.isLiveBriefTurn = true;
      group.hookCount = undefined;
      group.hookTotalMs = undefined;
      group.hookInfos = undefined;
      mapped.push([idx, group]);
    }
    mapped.sort((left, right) => left[0] - right[0]);
    let briefHiddenCount =
      isLiveTail || options.keepAllText === true
        ? 0
        : nextToolIndex - index + headMessages.length - mapped.length - plainInfoCount;
    for (let [, message] of mapped)
      result.push(
        briefHiddenCount > 0 && message.type === "system" && message.subtype === "turn_duration"
          ? {
              ...message,
              briefHiddenCount,
            }
          : message,
      );
    index = nextToolIndex;
  }
  return result;
}
//@ chunk-5xgkngpb.js:4818016-4818228 placement
function createCollapsedReadSearchGroup(message) {
  return {
    type: "collapsed_read_search",
    searchCount: 0,
    readCount: 0,
    listCount: 0,
    memorySearchCount: 0,
    memoryReadCount: 0,
    memoryWriteCount: 0,
    messages: [message],
    displayMessage: message,
    uuid: message.uuid,
    timestamp: message.timestamp,
  };
}
//@ chunk-5xgkngpb.js:4818228-4819011 placement
/**
 * 为一组同名工具调用创建折叠组并按工具类型计数：Agent/Task 记描述，MCP/记忆保存记服务器名，编辑类累加增删行，Artifact 计帧数，其他计入 otherToolCount。
 */
function createCollapsedToolGroup(message, toolName, inputs, tools) {
  let count = inputs.length;
  let group = createCollapsedReadSearchGroup(message);
  if (toolName === AGENT || toolName === TASK) {
    group.agentCount = count;
    let flattened = inputs.flatMap((input) => {
      let description = input?.description;
      if (typeof description !== "string") return [];
      let descriptionText = truncateToLength(collapseWhitespace_2(description), 300);
      return descriptionText !== "" ? [descriptionText] : [];
    });
    if (flattened.length > 0) group.agentDescriptions = flattened;
    return group;
  }
  let tool = findToolByName(tools, toolName);
  let displayInfo = tool === undefined ? deviceToolDisplayInfo(toolName) : undefined;
  if (tool?.isMcp) {
    group.mcpCallCount = count;
    if (tool.mcpInfo?.serverName) group.mcpCallLabels = [tool.mcpInfo.serverName];
  } else if (displayInfo !== undefined && memorySaveHooks?.isMemorySaveCall(displayInfo)) {
    group.mcpCallCount = count;
    group.mcpCallLabels = [displayInfo.serverName];
  } else if (FILE_EDITING_TOOL_NAMES.has(toolName)) {
    group.editFileCount = count;
    let lineDelta = 0;
    let charDelta = 0;
    for (let input of inputs) {
      let editCount = countEditLines(toolName, input);
      lineDelta += editCount.added;
      charDelta += editCount.removed;
    }
    if (lineDelta > 0) group.linesAdded = lineDelta;
    if (charDelta > 0) group.linesRemoved = charDelta;
  } else if (toolName === ARTIFACT_TOOL_NAME) {
    let frameCount = countWhere(inputs, (input) => isPublishShapedArtifactAction?.(input) === true);
    if (frameCount > 0) group.frameCount = frameCount;
    if (count - frameCount > 0) group.otherToolCount = (group.otherToolCount ?? 0) + (count - frameCount);
  } else group.otherToolCount = count;
  return group;
}
//@ chunk-p762h6ag.js:598-940 fingerprint (2.1.88 match: MessageActionsKeybindings, 0.411)
function MessageActionsKeybindings(handlers, options = {}) {
  let { context = "Global", isActive = true } = options;
  let keybindingContext = useKeybindingContext();
  let [state] = useState(() => ({
    handlers,
  }));
  let joined = Object.keys(handlers).sort().join("|");
  useLayoutEffect(() => {
    state.handlers = handlers;
  });
  useEffect(() => {
    if (!keybindingContext || !isActive) return;
    let mapped = Object.keys(state.handlers).map((key) =>
      keybindingContext.registerHandler({
        action: key,
        context,
        handler: () => state.handlers[key]?.(),
        singleKey: true,
      }),
    );
    return () => {
      for (let handler of mapped) handler();
    };
  }, [context, joined, keybindingContext, isActive, state]);
}
//@ chunk-hnxhr3bs.js:179627-179999 fingerprint (2.1.88 match: NAVIGABLE_TYPES, 0.459)
function NAVIGABLE_TYPES(message) {
  let key;
  switch (message.type) {
    case "user":
    case "assistant":
      return `${message.type}/${messageTypeLabel(message.message.content[0])}`;
    case "system":
      key = `system/${message.subtype}`;
      break;
    case "attachment":
      key = `attachment/${message.attachment.type}`;
      break;
    case "grouped_tool_use":
    case "collapsed_read_search":
    case "work_segment":
    case "speaker_label":
    case "recap_fold":
      key = message.type;
      break;
    default:
      key = String(message.type);
  }
  return asSafePathKey(key);
}
//@ chunk-hnxhr3bs.js:179999-180126 sole-consumer (2.1.88 match: extractErrorTypeFromData, 1)
function messageTypeLabel(data) {
  if (data === undefined) return "?";
  let blockType = typeof data === "object" && data !== null && "type" in data ? data.type : undefined;
  return isKnownContentBlockType(blockType) ? blockType : "unknown";
}
//@ chunk-0yw3taqg.js:477435-477507 fingerprint (2.1.88 match: useMessageActions, 0.346)
function useMessageActions(turnStartClock, arg1, arg2) {
  if (turnStartClock === undefined) return;
  try {
    turnStartClock.enter(arg1, arg2);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-8prszgkd.js:49434-50774 fingerprint (2.1.88 match: MessageActionsBar, 0.515)
function MessageActionsBar(props) {
  let $ = useMemoCache(38);
  let { keyText, contentColumns } = props;
  let header;
  let rows;
  let footer;
  let dimColor;
  let paddingLeft;
  let flexDirection;
  let headerElement;
  let resultElement;
  let children;
  let marginLeft;
  let borderStyle;
  let borderLeft;
  let borderRight;
  let borderTop;
  let borderBottom;
  let borderDimColor;
  if ($[0] !== contentColumns || $[1] !== keyText) {
    resultElement = EARLY_RETURN_SENTINEL;
    K: {
      let wrappedKey = wrapAnsi(`${keyText}:`, Math.max(10, contentColumns - 2), {
        hard: true,
        trim: false,
      });
      let index = wrappedKey.indexOf(`
`);
      if (index === -1) {
        resultElement = jsxProd_default(Text, {
          dimColor: true,
          children: wrappedKey,
        });
        break K;
      }
      footer = Box;
      flexDirection = "column";
      headerElement = jsxProd_default(Text, {
        dimColor: true,
        children: wrappedKey.slice(0, index),
      });
      rows = Box;
      marginLeft = 2;
      borderStyle = "single";
      borderLeft = true;
      borderRight = false;
      borderTop = false;
      borderBottom = false;
      borderDimColor = true;
      paddingLeft = 1;
      header = Text;
      dimColor = true;
      children = wrapAnsi(wrappedKey.slice(index + 1).replace(/\n/g, ""), Math.max(10, contentColumns - 4), {
        hard: true,
        trim: false,
      });
    }
    $[0] = contentColumns;
    $[1] = keyText;
    $[2] = header;
    $[3] = rows;
    $[4] = footer;
    $[5] = dimColor;
    $[6] = paddingLeft;
    $[7] = flexDirection;
    $[8] = headerElement;
    $[9] = resultElement;
    $[10] = children;
    $[11] = marginLeft;
    $[12] = borderStyle;
    $[13] = borderLeft;
    $[14] = borderRight;
    $[15] = borderTop;
    $[16] = borderBottom;
    $[17] = borderDimColor;
  } else {
    header = $[2];
    rows = $[3];
    footer = $[4];
    dimColor = $[5];
    paddingLeft = $[6];
    flexDirection = $[7];
    headerElement = $[8];
    resultElement = $[9];
    children = $[10];
    marginLeft = $[11];
    borderStyle = $[12];
    borderLeft = $[13];
    borderRight = $[14];
    borderTop = $[15];
    borderBottom = $[16];
    borderDimColor = $[17];
  }
  if (resultElement !== EARLY_RETURN_SENTINEL) return resultElement;
  let children_2;
  if ($[18] !== header || $[19] !== dimColor || $[20] !== children) {
    children_2 = jsxProd_default(header, {
      dimColor,
      children,
    });
    $[18] = header;
    $[19] = dimColor;
    $[20] = children;
    $[21] = children_2;
  } else children_2 = $[21];
  let rowsElement;
  if (
    $[22] !== rows ||
    $[23] !== paddingLeft ||
    $[24] !== children_2 ||
    $[25] !== marginLeft ||
    $[26] !== borderStyle ||
    $[27] !== borderLeft ||
    $[28] !== borderRight ||
    $[29] !== borderTop ||
    $[30] !== borderBottom ||
    $[31] !== borderDimColor
  ) {
    rowsElement = jsxProd_default(rows, {
      marginLeft,
      borderStyle,
      borderLeft,
      borderRight,
      borderTop,
      borderBottom,
      borderDimColor,
      paddingLeft,
      children: children_2,
    });
    $[22] = rows;
    $[23] = paddingLeft;
    $[24] = children_2;
    $[25] = marginLeft;
    $[26] = borderStyle;
    $[27] = borderLeft;
    $[28] = borderRight;
    $[29] = borderTop;
    $[30] = borderBottom;
    $[31] = borderDimColor;
    $[32] = rowsElement;
  } else rowsElement = $[32];
  let footerElement;
  if ($[33] !== footer || $[34] !== flexDirection || $[35] !== headerElement || $[36] !== rowsElement) {
    footerElement = jsxProd_default_2(footer, {
      flexDirection,
      children: [headerElement, rowsElement],
    });
    $[33] = footer;
    $[34] = flexDirection;
    $[35] = headerElement;
    $[36] = rowsElement;
    $[37] = footerElement;
  } else footerElement = $[37];
  return footerElement;
}
//@ chunk-tdcrpxkn.js:1107-2074 fingerprint (2.1.88 match: PRIMARY_INPUT, 0.378)
/**
 * 各内置工具的输入路径字段与响应中路径字段的表，供钩子输入路径处理用；同一声明派生 responseMembers 与 responseNested 集合。
 */
var HOOK_TOOL_PATH_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HOOK_RESPONSE_PATH_MEMBERS;
var HOOK_RESPONSE_NESTED_PATHS;
deferInit("chunk-tdcrpxkn.js:1107", () => {
  HOOK_TOOL_PATH_FIELDS = {
    Read: {
      input: "file_path",
      responseNested: [
        ["file", "filePath"],
        ["file", "outputDir"],
      ],
    },
    Write: {
      input: "file_path",
      responseMembers: ["filePath"],
    },
    Edit: {
      input: "file_path",
      responseMembers: ["filePath"],
    },
    MultiEdit: {
      input: "file_path",
      responseMembers: ["filePath"],
    },
    NotebookEdit: {
      input: "notebook_path",
      responseMembers: ["notebook_path"],
    },
    Glob: {
      input: "path",
      responseArrays: ["filenames"],
    },
    Grep: {
      input: "path",
      responseArrays: ["filenames"],
    },
    LSP: {
      input: "filePath",
      responseMembers: ["filePath"],
    },
    Bash: {
      responseMembers: ["rawOutputPath", "persistedOutputPath"],
    },
    Agent: {
      input: "cwd",
      responseMembers: ["worktreePath", "outputFile"],
    },
    Workflow: {
      input: "scriptPath",
      responseMembers: ["scriptPath", "transcriptDir"],
    },
    EnterWorktree: {
      input: "path",
      responseMembers: ["worktreePath"],
    },
    ExitWorktree: {
      responseMembers: ["worktreePath", "originalCwd"],
    },
  };
  HOOK_RESPONSE_PATH_MEMBERS = new Set(
    Object.values(HOOK_TOOL_PATH_FIELDS).flatMap((state) => state.responseMembers ?? []),
  );
  HOOK_RESPONSE_NESTED_PATHS = new Set(
    Object.values(HOOK_TOOL_PATH_FIELDS).flatMap((field) =>
      (field.responseNested ?? []).map(([nestedKey, index]) => `${nestedKey}/${index}`),
    ),
  );
});
export {
  MessageActionsKeybindings,
  collectToolUseIds,
  useMessageActions,
  stripSystemReminders,
  isApplicable,
  toolCallOf,
  toolCallOf_3,
  toolResultText,
  skipVirtualCallRun,
  toolNameForResult,
  isNavigableMessage,
  MessageActionsBar,
  hasAnyToolUseId,
  NAVIGABLE_TYPES,
  copyTextOf,
  HOOK_RESPONSE_PATH_MEMBERS,
  HOOK_RESPONSE_NESTED_PATHS,
  HOOK_TOOL_PATH_FIELDS,
};
