/**
 * utils/collapseReadSearch.ts
 *
 * 把连续的搜索/读取类工具调用折叠成一行摘要（Searched N, read M, recalled memories…）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/collapseReadSearch.ts
 * pieces: chunk-e6aww6q8.js (56)
 * attribution: placement 11, layout 25, fingerprint 14, file-local 2, callgraph-fingerprint 1, sole-consumer 3
 */
import { isTeamMemoryPath } from "../memdir/teamMemPrompts.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { REMOTE_DEVICES, alnumLower } from "../services/mcp/firstPartyServerIds.js";
import { HEARTHBOT } from "../services/mcp/ccrMetaMcp.js";
import { INJECTED_MCP_SERVER_NAMES } from "../services/analytics/metadata.js";
import {
  isMemoryOrSessionFile,
  isMemoryDirectory,
  isAutoManagedMemoryPattern,
  isShellCommandTargetingMemory,
} from "./memoryFileDetection.js";
import { truncateToLength, collapseWhitespace as collapseWhitespace_2 } from "./stringUtils.js";
import { findToolByName } from "../Tool.js";
import { getFileAndShellTools } from "../tools.js";
import { isExactReplToolName } from "../tools/REPLTool/constants.js";
import { TODO_TOOL_NAMES } from "./model/legacyModelNames.js";
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import { moduleStore } from "../services/mcp/mcpClientCapabilities.js";
import { MCP_CLAUDE_TEST_WRITE } from "../plugins/bundled/claudeTest/constants.js";
import { deviceToolDisplayInfo, remoteMachineRefForDisplay, bashCommentTitle } from "./toolUseDisplay.js";
import { normalizeUuidOrNull } from "./agentId.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_3 } from "./shell/shellToolUtils.js";
import { isUntrustedObject as isUntrustedObject_2 } from "./untrustedValues.js";
import { normalizeServerPath } from "../services/accountMemory/accountMemoryServer.js";
import { countEditLines } from "../tools/AgentTool/agentLaunch.js";
import { toolCallOf_3, toolResultText } from "../components/messageActions.js";
import { hasNarrationThinking } from "./messages/apiNormalization.js";
import { NO_CONTENT_MESSAGE, NO_RESPONSE_REQUESTED } from "../constants/messages.js";
import { detectGitOperation } from "../tools/shared/gitOperationTracking.js";
import { logForDebugging } from "./debug.js";
import { stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { getEffectiveCwd } from "./cwd.js";
import { getDisplayPath } from "./file.js";
import { normalizeHookSummary } from "./collapseHookSummaries.js";
import { stripAnsiPerLine } from "./stripAnsi.js";
import { isHumanOrAutoContinuation, isPeerOrObserver } from "./messageProvenance.js";
import { visibleTeammateMailboxMessages } from "./teammateMailbox.js";
import { appendTeamMemorySummaryParts } from "./teamMemoryOps.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4677066-4677123 placement
/**
 * 判断工具输入路径是否指向团队记忆目录。
 */
function isTeamMemoryPathInput(input) {
  if (input.path && isTeamMemoryPath(input.path)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4677123-4677220 placement
function getFilePathFromToolInput(toolInput, toolInput_2) {
  if (toolInput !== FILE_WRITE_TOOL_NAME && toolInput !== FILE_EDIT_TOOL_NAME) return false;
  let filePath = toolInput_2.file_path ?? toolInput_2.path;
  return filePath !== undefined && isTeamMemoryPath(filePath);
}
//@ chunk-e6aww6q8.js:4679035-4679333 placement = getSessionFileTypeFromInput (0.767)
function getSessionFileTypeFromInput_2(input) {
  if (typeof input !== "object" || input === null) return {};
  let { file_path: filePath, path, pattern, glob, command, query, content } = input;
  return {
    ...(isSafeInputString(filePath) && {
      file_path: filePath,
    }),
    ...(isSafeInputString(path) && {
      path,
    }),
    ...(isSafeInputString(pattern) && {
      pattern,
    }),
    ...(isSafeInputString(glob) && {
      glob,
    }),
    ...(isSafeInputString(command) && {
      command,
    }),
    ...(isSafeInputString(query) && {
      query,
    }),
    ...(typeof content === "string" && {
      content,
    }),
  };
}
//@ chunk-e6aww6q8.js:4679333-4679396 placement
/**
 * 判断字符串输入安全（无 NUL 字符）。
 */
function isSafeInputString(value) {
  return typeof value === "string" && !value.includes("\x00");
}
//@ chunk-e6aww6q8.js:4679396-4679409 layout
/**
 * 记忆保存相关的可选钩子（运行期注入）。
 */
var memorySaveHooks = null;
//@ chunk-e6aww6q8.js:4679409-4679634 layout
/**
 * 由注入钩子判断某内容是否像发布 artifact 的动作。
 */
var ARTIFACT_TOOL_NAME; // deferred: loads other modules while loading; runs once its import cycle is complete
var mapped_5;
var isPublishShapedArtifactAction;
var isPublishShapedArtifact;
deferInit("chunk-e6aww6q8.js:4679409", () => {
  ARTIFACT_TOOL_NAME = require("../tools/ArtifactTool/AMPERSAND_FORMS.lazy.js").ARTIFACT_TOOL_NAME;
  mapped_5 = [REMOTE_DEVICES, HEARTHBOT, "webagent", ...INJECTED_MCP_SERVER_NAMES].map(alnumLower);
  isPublishShapedArtifactAction =
    require("../tools/ArtifactTool/AMPERSAND_FORMS.lazy.js").isPublishShapedArtifactAction;
  isPublishShapedArtifact = () => require("./permissions/filesystem.js").isScratchpadDisplayPath;
});
//@ chunk-e6aww6q8.js:4679634-4679677 layout
/**
 * 取工具输入里的文件路径（file_path 优先，其次 path）。
 */
function inputFilePath(toolInput) {
  return toolInput.file_path ?? toolInput.path;
}
//@ chunk-e6aww6q8.js:4679677-4679819 fingerprint = isMemorySearch (1)
function isMemorySearch(input) {
  if (input.path) {
    if (isMemoryOrSessionFile(input.path) || isMemoryDirectory(input.path)) return true;
  }
  if (input.glob && isAutoManagedMemoryPattern(input.glob)) return true;
  if (input.command && isShellCommandTargetingMemory(input.command)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4679819-4679902 layout
function isArtifactReadOrWrite(toolName, toolInput) {
  if (toolName !== FILE_WRITE_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME) return false;
  let filePath = inputFilePath(toolInput);
  return filePath !== undefined && isMemoryOrSessionFile(filePath);
}
//@ chunk-e6aww6q8.js:4679902-4679988 layout
function isScratchpadReadOrWrite(toolName, toolInput) {
  if (toolName !== FILE_WRITE_TOOL_NAME && toolName !== FILE_EDIT_TOOL_NAME) return false;
  let filePath = inputFilePath(toolInput);
  return filePath !== undefined && isPublishShapedArtifact()(filePath);
}
//@ chunk-e6aww6q8.js:4679988-4680011 layout
/**
 * 记录思考时长的上限（10 分钟）。
 */
var MAX_COLLAPSED_LABEL_CHARS = 300;
var MAX_LOGGED_THOUGHT_MS = 600000;
//@ chunk-e6aww6q8.js:4680011-4680070 layout
function truncateCollapsedLabel(label) {
  return label.length > MAX_COLLAPSED_LABEL_CHARS
    ? truncateToLength(label, MAX_COLLAPSED_LABEL_CHARS - 1) + "\u2026"
    : label;
}
//@ chunk-e6aww6q8.js:4680070-4680104 layout
function formatCollapsedLabel(label) {
  return truncateCollapsedLabel(collapseWhitespace_2(label));
}
//@ chunk-e6aww6q8.js:4680104-4680204 file-local
function commandAsHint(command) {
  let cleaned =
    "$ " +
    command
      .split(
        `
`,
      )
      .map((line) => collapseWhitespace_2(line))
      .filter((part) => part !== "").join(`
`);
  return truncateCollapsedLabel(cleaned);
}
//@ chunk-e6aww6q8.js:4680204-4680250 layout
function findToolByNameWithFallback(tools, name) {
  return findToolByName(tools, name) ?? findToolByName(getFileAndShellTools(), name);
}
//@ chunk-e6aww6q8.js:4680250-4682131 fingerprint = getToolSearchOrReadInfo (0.669)
/**
 * 判断一个工具调用是否属于可折叠的搜索或读取，并返回其描述信息。
 */
function getToolSearchOrReadInfo(toolName, toolInput, tools) {
  if (isExactReplToolName(toolName))
    return {
      isCollapsible: true,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: true,
      isMemoryWrite: false,
      isScratchpadWrite: false,
      isAbsorbedSilently: true,
    };
  let toolInput_2 =
    toolName === FILE_WRITE_TOOL_NAME || toolName === FILE_EDIT_TOOL_NAME
      ? getSessionFileTypeFromInput_2(toolInput)
      : {};
  if (isArtifactReadOrWrite(toolName, toolInput_2))
    return {
      isCollapsible: true,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: false,
      isMemoryWrite: true,
      isScratchpadWrite: false,
      isAbsorbedSilently: false,
    };
  if (isScratchpadReadOrWrite(toolName, toolInput_2))
    return {
      isCollapsible: true,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: false,
      isMemoryWrite: false,
      isScratchpadWrite: true,
      isAbsorbedSilently: false,
    };
  let included = TODO_TOOL_NAMES.includes(toolName);
  if ((isFullscreenEnvEnabled() && toolName === TOOL_SEARCH_TOOL_NAME) || included)
    return {
      isCollapsible: true,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: false,
      isMemoryWrite: false,
      isScratchpadWrite: false,
      isAbsorbedSilently: true,
      popsOutOnError: included,
    };
  let toolName_2 = findToolByNameWithFallback(tools, toolName);
  let displayInfo =
    (toolName_2?.mcpInfo !== undefined && moduleStore.minted(toolName_2.mcpInfo.serverName)) ||
    toolName_2?.uiTableKey === MCP_CLAUDE_TEST_WRITE;
  if (toolName_2?.isMcp && !displayInfo)
    return {
      isCollapsible: true,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: false,
      isMemoryWrite: false,
      isScratchpadWrite: false,
      isAbsorbedSilently: false,
      ...{
        mcpCallLabel: toolName_2.mcpInfo?.serverName,
      },
    };
  let deviceInfo = toolName_2 === undefined ? deviceToolDisplayInfo(toolName) : undefined;
  let serverName =
    deviceInfo && normalizeUuidOrNull(deviceInfo.serverName) !== null ? "MCP" : deviceInfo?.serverName;
  let normalizedServer = alnumLower(serverName ?? "");
  if (
    deviceInfo !== undefined &&
    serverName !== undefined &&
    !mapped_5.some((prefix) => normalizedServer.startsWith(prefix))
  )
    return {
      isCollapsible: true,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: false,
      isMemoryWrite: false,
      isScratchpadWrite: false,
      isAbsorbedSilently: false,
      mcpCallLabel: serverName,
      ...(memorySaveHooks?.isMemorySaveCall(deviceInfo) && {
        memorySave: memorySaveHooks.memorySaveOf(
          deviceInfo.toolName,
          getSessionFileTypeFromInput_2(toolInput),
        ),
      }),
    };
  if (!toolName_2?.isSearchOrReadCommand)
    return {
      isCollapsible: false,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: false,
      isMemoryWrite: false,
      isScratchpadWrite: false,
      isAbsorbedSilently: false,
    };
  if (remoteMachineRefForDisplay(toolName_2, toolInput) !== undefined)
    return {
      isCollapsible: false,
      isSearch: false,
      isRead: false,
      isList: false,
      isREPL: false,
      isMemoryWrite: false,
      isScratchpadWrite: false,
      isAbsorbedSilently: false,
    };
  let result = toolName_2.isSearchOrReadCommand(toolInput ?? {});
  let isList = result.isList ?? false;
  let isCollapsible = result.isSearch || result.isRead || isList;
  let included_2 = SHELL_TOOL_NAMES_3.includes(toolName);
  return {
    isCollapsible: isCollapsible || (isFullscreenEnvEnabled() ? included_2 : false),
    isSearch: result.isSearch,
    isRead: result.isRead,
    isList,
    isREPL: false,
    isMemoryWrite: false,
    isScratchpadWrite: false,
    isAbsorbedSilently: false,
    isBash: isFullscreenEnvEnabled() ? !isCollapsible && included_2 : undefined,
  };
}
//@ chunk-e6aww6q8.js:4682131-4682565 fingerprint = getSearchOrReadFromContent (0.749)
function getSearchOrReadFromContent(content, tools) {
  if (content?.type === "tool_use" && content.name) {
    let info = getToolSearchOrReadInfo(content.name, content.input, tools);
    if (info.isCollapsible || info.isREPL)
      return {
        isSearch: info.isSearch,
        isRead: info.isRead,
        isList: info.isList,
        isREPL: info.isREPL,
        isMemoryWrite: info.isMemoryWrite,
        isScratchpadWrite: info.isScratchpadWrite,
        isAbsorbedSilently: info.isAbsorbedSilently,
        popsOutOnError: info.popsOutOnError,
        mcpCallLabel: info.mcpCallLabel,
        memorySave: info.memorySave,
        accountMemory: info.accountMemory,
        isBash: info.isBash,
      };
  }
  return null;
}
//@ chunk-e6aww6q8.js:4682565-4682576 layout
/**
 * 从输入里取路径的最大数量（20）。
 */
var MAX_INPUT_PATHS = 20;
//@ chunk-e6aww6q8.js:4682576-4683047 layout
/**
 * 安全地从工具输入中取出 path 字段（字符串或字符串数组，只读自有数据属性、限数量），规范化后返回。
 */
function toolInputPaths(input) {
  if (typeof input !== "object" || input === null || isUntrustedObject_2(input)) return [];
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(input, "path");
  if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) return [];
  let paths = ownPropertyDescriptor.value;
  if (typeof paths === "string") return [normalizeServerPath(paths)];
  if (paths === null || typeof paths !== "object" || isUntrustedObject_2(paths) || !Array.isArray(paths))
    return [];
  let count = paths.length;
  if (!Number.isSafeInteger(count)) return [];
  let result = [];
  for (let idx = 0; idx < count && idx < MAX_INPUT_PATHS; idx++) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(paths, idx);
    if (
      ownPropertyDescriptor &&
      "value" in ownPropertyDescriptor &&
      typeof ownPropertyDescriptor.value === "string"
    )
      result.push(normalizeServerPath(ownPropertyDescriptor.value));
  }
  return result;
}
//@ chunk-e6aww6q8.js:4683047-4683067 layout
var weakMap_17; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4683047", () => {
  weakMap_17 = new WeakMap();
});
//@ chunk-e6aww6q8.js:4683067-4683236 layout = toolCallOf (1)
function toolCallOf(msg) {
  if (msg.type === "assistant") {
    let firstBlock = msg.message.content[0];
    return firstBlock?.type === "tool_use" ? firstBlock.name : null;
  }
  if (msg.type === "grouped_tool_use") return msg.toolName;
  return null;
}
//@ chunk-e6aww6q8.js:4683236-4683457 layout
/**
 * 按工具调用缓存折叠信息（工具表不变时复用）。
 */
function getToolCollapseInfoCached(msg, tools) {
  let cached = weakMap_17.get(msg);
  if (cached?.tools === tools) return cached.info;
  let toolName = toolCallOf(msg);
  let tool = toolName === null ? undefined : findToolByNameWithFallback(tools, toolName);
  if (cached && tool === cached.resolvedTool) {
    cached.tools = tools;
    return cached.info;
  }
  let collapsibleToolInfo = getCollapsibleToolInfo(msg, tools);
  weakMap_17.set(msg, {
    tools,
    resolvedTool: tool,
    info: collapsibleToolInfo,
  });
  return collapsibleToolInfo;
}
//@ chunk-e6aww6q8.js:4683457-4685204 callgraph-fingerprint = getCollapsibleToolInfo (0.157)
function getCollapsibleToolInfo(msg, tools) {
  let currentTool = null;
  if (msg.type === "assistant") {
    let content = msg.message.content[0];
    let info = getSearchOrReadFromContent(content, tools);
    if (info && content?.type === "tool_use")
      currentTool = {
        name: content.name,
        input: getSessionFileTypeFromInput_2(content.input),
        ...info,
        memorySave: msg.cloudMemoryToolUseIds?.includes(content.id) ? info.memorySave : undefined,
      };
  } else if (msg.type === "grouped_tool_use") {
    let firstContent = msg.messages[0]?.message.content[0];
    let info = getSearchOrReadFromContent(
      firstContent
        ? {
            type: "tool_use",
            name: msg.toolName,
            input: firstContent.input,
          }
        : undefined,
      tools,
    );
    if (info && firstContent?.type === "tool_use")
      currentTool = {
        name: msg.toolName,
        input: getSessionFileTypeFromInput_2(firstContent.input),
        ...info,
        memorySave: undefined,
      };
  }
  if (!currentTool) return null;
  let { command, query, pattern } = currentTool.input;
  let readPaths = null;
  let entries = [];
  let currentLabel = "";
  let isTeamMemoryWrite = false;
  let pendingCommand = null;
  if (currentTool.isMemoryWrite)
    isTeamMemoryWrite = getFilePathFromToolInput(currentTool.name, currentTool.input);
  else if (currentTool.isScratchpadWrite || currentTool.isAbsorbedSilently);
  else if (currentTool.accountMemory) {
    if (currentTool.accountMemory === "read") {
      let pendingCalls =
        msg.type === "grouped_tool_use"
          ? msg.messages.map((message) => message.message.content[0])
          : msg.type === "assistant"
            ? [msg.message.content[0]]
            : [];
      for (let pendingCall of pendingCalls)
        if (pendingCall?.type === "tool_use") entries.push(...toolInputPaths(pendingCall.input));
    }
  } else if (currentTool.memorySave !== undefined);
  else if (currentTool.mcpCallLabel) currentLabel = query ? formatCollapsedLabel(query) : "";
  else if (isFullscreenEnvEnabled() && currentTool.isBash) {
    if (command) {
      let title = bashCommentTitle(command);
      currentLabel = title !== undefined ? truncateCollapsedLabel(title) : commandAsHint(command);
    }
  } else if (currentTool.isList) currentLabel = command ? commandAsHint(command) : "";
  else if (currentTool.isSearch) {
    pendingCommand = isTeamMemoryPathInput(currentTool.input)
      ? "team_memory"
      : isMemorySearch(currentTool.input)
        ? "memory"
        : "other";
    if (pendingCommand === "other") currentLabel = pattern ? formatCollapsedLabel(pattern) : "";
  } else {
    readPaths = getFilePathsFromReadMessage(msg).map((path) => ({
      path,
      isTeamMem: isTeamMemoryPath(path),
      isAutoManagedMemory: isMemoryOrSessionFile(path),
    }));
    if (readPaths.length === 0) currentLabel = command ? commandAsHint(command) : "";
  }
  let editLines = null;
  if (currentTool.isScratchpadWrite) {
    let added = 0;
    let removed = 0;
    let editCalls =
      msg.type === "grouped_tool_use"
        ? msg.messages.map((message) => message.message.content[0])
        : msg.type === "assistant"
          ? [msg.message.content[0]]
          : [];
    for (let editCall of editCalls) {
      if (editCall?.type !== "tool_use") continue;
      let editLines = countEditLines(currentTool.name, editCall.input);
      added += editLines.added;
      removed += editLines.removed;
    }
    editLines = {
      added,
      removed,
    };
  }
  return {
    ...currentTool,
    toolUseIds: toolCallOf_3(msg),
    toolUseCount: countToolUses(msg),
    readPaths,
    accountMemoryPaths: entries,
    editLines,
    displayHint: currentLabel,
    isTeamMemoryWrite,
    searchTarget: pendingCommand,
  };
}
//@ chunk-e6aww6q8.js:4685204-4685367 file-local
function isTextBreaker(msg) {
  if (msg.type === "assistant") {
    let content = msg.message.content[0];
    if (
      content?.type === "text" &&
      content.text.trim().length > 0 &&
      !isPlaceholderAssistantText(content.text)
    )
      return true;
    if (isSignedThinkingMessage(msg)) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4685367-4685449 layout
/**
 * 判断消息是否为以带签名思考块开头的 assistant 消息。
 */
function isSignedThinkingMessage(message) {
  if (message.type !== "assistant") return false;
  return isSignedThinkingBlock(message.message.content[0]);
}
//@ chunk-e6aww6q8.js:4685449-4685584 layout
function isSignedThinkingBlock(block) {
  if (block === undefined) return false;
  return (
    block.type === "thinking" &&
    typeof block.thinking === "string" &&
    typeof block.signature === "string" &&
    hasNarrationThinking(block)
  );
}
//@ chunk-e6aww6q8.js:4685584-4685629 layout
function isPlaceholderAssistantText(text) {
  return text.trim() === NO_CONTENT_MESSAGE || text === NO_RESPONSE_REQUESTED;
}
//@ chunk-e6aww6q8.js:4685629-4685742 layout
function isPlaceholderAssistantMessage(msg) {
  if (msg.type !== "assistant") return false;
  let content = msg.message.content[0];
  return content?.type === "text" && isPlaceholderAssistantText(content.text);
}
//@ chunk-e6aww6q8.js:4685742-4685844 fingerprint = isPreToolHookSummary (1)
function isPreToolHookSummary(msg) {
  return msg.type === "system" && msg.subtype === "stop_hook_summary" && msg.hookLabel === "PreToolUse";
}
//@ chunk-e6aww6q8.js:4685844-4686054 fingerprint = shouldSkipMessage (1)
/**
 * 折叠搜索/读取组时可跳过的消息：思考块、附件、系统消息。
 */
function shouldSkipMessage(msg) {
  if (msg.type === "assistant") {
    let content = msg.message.content[0];
    if (content?.type === "thinking" || content?.type === "redacted_thinking")
      return !isSignedThinkingMessage(msg);
  }
  if (msg.type === "attachment") return true;
  if (msg.type === "system") return true;
  return false;
}
//@ chunk-e6aww6q8.js:4686054-4686074 sole-consumer
var weakMap_18; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:4686054", () => {
  weakMap_18 = new WeakMap();
});
//@ chunk-e6aww6q8.js:4686074-4686358 sole-consumer
function visibleThinkingOf(message) {
  if (message.type !== "assistant") return;
  let firstBlock = message.message.content[0];
  if (firstBlock?.type !== "thinking" || !firstBlock.thinking) return;
  let thinking = firstBlock.thinking;
  let cached = weakMap_18.get(message);
  if (cached === undefined || cached.thinking !== thinking) {
    cached = {
      thinking,
      blank: thinking.trim() === "",
      summary: undefined,
    };
    weakMap_18.set(message, cached);
  }
  if (cached.blank) return;
  return {
    message,
    memo: cached,
  };
}
//@ chunk-e6aww6q8.js:4686358-4686545 sole-consumer = toolCallOf (1)
function toolCallOf_2(msg) {
  if (msg.type === "assistant") return msg.message.content[0]?.type === "tool_use";
  if (msg.type === "grouped_tool_use") return msg.messages[0]?.message.content[0]?.type === "tool_use";
  return false;
}
//@ chunk-e6aww6q8.js:4687096-4687199 fingerprint = getDisplayMessageFromCollapsed (1)
function getDisplayMessageFromCollapsed(message) {
  let firstMsg = message.displayMessage;
  if (firstMsg.type === "grouped_tool_use") return firstMsg.displayMessage;
  return firstMsg;
}
//@ chunk-e6aww6q8.js:4687199-4687280 fingerprint = countToolUses (1)
function countToolUses(msg) {
  if (msg.type === "grouped_tool_use") return msg.messages.length;
  return 1;
}
//@ chunk-e6aww6q8.js:4687280-4687594 fingerprint = getFilePathsFromReadMessage (1)
function getFilePathsFromReadMessage(msg) {
  let paths = [];
  if (msg.type === "assistant") {
    let content = msg.message.content[0];
    if (content?.type === "tool_use") {
      let { file_path: input } = getSessionFileTypeFromInput_2(content.input);
      if (input) paths.push(input);
    }
  } else if (msg.type === "grouped_tool_use")
    for (let m of msg.messages) {
      let content = m.message.content[0];
      if (content?.type === "tool_use") {
        let { file_path: input } = getSessionFileTypeFromInput_2(content.input);
        if (input) paths.push(input);
      }
    }
  return paths;
}
//@ chunk-e6aww6q8.js:4687594-4688048 fingerprint = scanBashResultForGitOps (1)
function scanBashResultForGitOps(msg, group) {
  if (msg.type !== "user") return;
  let out = msg.toolUseResult;
  if (!out?.stdout && !out?.stderr) return;
  let combined =
    (out.stdout ?? "") +
    `
` +
    (out.stderr ?? "");
  for (let block of msg.message.content) {
    if (block.type !== "tool_result") continue;
    let command = group.bashCommands?.get(block.tool_use_id);
    if (!command) continue;
    let { commit, push, branch, pr } = detectGitOperation(command, combined);
    if (commit) group.commits?.push(commit);
    if (push) group.pushes?.push(push);
    if (branch) group.branches?.push(branch);
    if (pr) group.prs?.push(pr);
    if (commit || push || branch || pr) group.gitOpBashCount = (group.gitOpBashCount ?? 0) + 1;
  }
}
//@ chunk-e6aww6q8.js:4688048-4688611 fingerprint = createEmptyGroup (0.92)
function createEmptyGroup(currentGroup) {
  let group = {
    messages: [],
    searchCount: 0,
    readFilePaths: new Set(),
    readOperationCount: 0,
    listCount: 0,
    toolUseIds: new Set(),
    memorySearchCount: 0,
    memoryReadFilePaths: new Set(),
    memoryWriteCount: 0,
    nonMemSearchArgs: [],
    latestDisplayHint: undefined,
    thoughtForMs: 0,
    latestThinkingSummary: undefined,
    hookTotalMs: 0,
    hookCount: 0,
    hookInfos: [],
  };
  group.teamMemorySearchCount = 0;
  group.teamMemoryReadFilePaths = new Set();
  group.teamMemoryWriteCount = 0;
  group.mcpCallCount = 0;
  group.mcpCallLabels = new Set();
  if (currentGroup) {
    group.bashCount = 0;
    group.bashCommands = new Map();
    group.commits = [];
    group.pushes = [];
    group.branches = [];
    group.prs = [];
    group.gitOpBashCount = 0;
  }
  return group;
}
//@ chunk-e6aww6q8.js:4688611-4690684 fingerprint = createCollapsedGroup (0.849)
function createCollapsedGroup(group, currentGroup) {
  let firstMsg = group.messages[0];
  let totalReadCount = group.readFilePaths.size > 0 ? group.readFilePaths.size : group.readOperationCount;
  let toolMemoryReadCount = group.memoryReadFilePaths.size;
  let memoryReadCount = toolMemoryReadCount + (group.relevantMemories?.length ?? 0);
  let teamMemReadPaths = group.teamMemoryReadFilePaths;
  let nonMemReadFilePaths = [...group.readFilePaths].filter(
    (readFilePath) =>
      !group.memoryReadFilePaths.has(readFilePath) && !(teamMemReadPaths?.has(readFilePath) ?? false),
  );
  let teamMemSearchCount = group.teamMemorySearchCount ?? 0;
  let teamMemReadCount = group.teamMemoryReadFilePaths?.size ?? 0;
  let teamMemWriteCount = group.teamMemoryWriteCount ?? 0;
  let result = {
    type: "collapsed_read_search",
    searchCount: Math.max(0, group.searchCount - group.memorySearchCount - teamMemSearchCount),
    readCount: Math.max(0, totalReadCount - toolMemoryReadCount - teamMemReadCount),
    listCount: group.listCount,
    memorySearchCount: group.memorySearchCount,
    memoryReadCount,
    memoryWriteCount: group.memoryWriteCount,
    readFilePaths: nonMemReadFilePaths,
    searchArgs: group.nonMemSearchArgs,
    latestDisplayHint: group.latestDisplayHint,
    messages: group.messages,
    displayMessage: firstMsg,
    uuid: `collapsed-${firstMsg.uuid}`,
    timestamp: firstMsg.timestamp,
  };
  result.teamMemorySearchCount = teamMemSearchCount;
  result.teamMemoryReadCount = teamMemReadCount;
  result.teamMemoryWriteCount = teamMemWriteCount;
  if ((group.accountMemoryReadKeys?.size ?? 0) > 0)
    result.accountMemoryReadKeys = [...(group.accountMemoryReadKeys ?? [])];
  if ((group.accountMemorySearchCount ?? 0) > 0)
    result.accountMemorySearchCount = group.accountMemorySearchCount;
  if ((group.accountMemoryRecalls?.length ?? 0) > 0) result.accountMemoryRecalls = group.accountMemoryRecalls;
  if ((group.scratchpadWriteCount ?? 0) > 0) {
    result.scratchpadWriteCount = group.scratchpadWriteCount;
    result.scratchpadLinesAdded = group.scratchpadLinesAdded;
    result.scratchpadLinesRemoved = group.scratchpadLinesRemoved;
  }
  if ((group.memorySaves?.size ?? 0) > 0) result.memorySaves = [...(group.memorySaves?.values() ?? [])];
  if ((group.mcpCallCount ?? 0) > 0) {
    result.mcpCallCount = group.mcpCallCount;
    result.mcpCallLabels = [...(group.mcpCallLabels ?? [])];
  }
  if (currentGroup) {
    if ((group.bashCount ?? 0) > 0) {
      result.bashCount = group.bashCount;
      result.gitOpBashCount = group.gitOpBashCount;
    }
    if ((group.commits?.length ?? 0) > 0) result.commits = group.commits;
    if ((group.pushes?.length ?? 0) > 0) result.pushes = group.pushes;
    if ((group.branches?.length ?? 0) > 0) result.branches = group.branches;
    if ((group.prs?.length ?? 0) > 0) result.prs = group.prs;
  }
  if (group.hookCount > 0) {
    result.hookTotalMs = group.hookTotalMs;
    result.hookCount = group.hookCount;
    result.hookInfos = group.hookInfos;
  }
  if (group.relevantMemories && group.relevantMemories.length > 0)
    result.relevantMemories = group.relevantMemories;
  if (group.thoughtForMs > 0) result.thoughtForMs = group.thoughtForMs;
  if (group.latestThinkingSummary !== undefined) result.latestThinkingSummary = group.latestThinkingSummary;
  return result;
}
//@ chunk-e6aww6q8.js:4690684-4690695 layout
/**
 * 折叠结果的空数组常量。
 */
var EMPTY_COLLAPSED_RESULT = [];
//@ chunk-e6aww6q8.js:4690695-4691105 layout
function getMemorySaveEntries(message, group) {
  if (memorySaveHooks === null || message.type !== "user" || !group.memorySaves?.size)
    return EMPTY_COLLAPSED_RESULT;
  let toolUseIds = [];
  for (let block of message.message.content) {
    let memorySave = block.type === "tool_result" ? group.memorySaves.get(block.tool_use_id) : undefined;
    if (block.type !== "tool_result" || memorySave === undefined) continue;
    let sharesToolUseResult = message.sharesToolUseResult === true;
    memorySave.end = sharesToolUseResult
      ? "not_stored"
      : memorySaveHooks.memorySaveEndOf(block, message.toolUseResult);
    if (memorySave.end === "not_stored" && (!sharesToolUseResult || block.is_error === true))
      toolUseIds.push(block.tool_use_id);
  }
  return toolUseIds;
}
//@ chunk-e6aww6q8.js:4691105-4691481 layout
function hasBashEditDiff(message) {
  if (message.type !== "user") return false;
  let toolUseResult = message.toolUseResult;
  if (
    typeof toolUseResult !== "object" ||
    toolUseResult === null ||
    !("bashEditDiff" in toolUseResult) ||
    typeof toolUseResult.bashEditDiff !== "object" ||
    toolUseResult.bashEditDiff === null
  )
    return false;
  let bashEditDiff = toolUseResult.bashEditDiff;
  return !(
    ("skipped" in bashEditDiff && bashEditDiff.skipped) ||
    ("unavailable" in bashEditDiff &&
      bashEditDiff.unavailable &&
      "files" in bashEditDiff &&
      Array.isArray(bashEditDiff.files) &&
      bashEditDiff.files.length === 0 &&
      "moreFiles" in bashEditDiff &&
      bashEditDiff.moreFiles === 0)
  );
}
//@ chunk-e6aww6q8.js:4691481-4691492 layout
/**
 * 合并思考块时允许的索引间隔（32）。
 */
var MAX_INDEX_GAP = 32;
//@ chunk-e6aww6q8.js:4691492-4692234 layout
class IncrementalCollapser {
  #e = [];
  #t = [];
  #n;
  #o = [];
  lastFolded = 0;
  resume(messages, context) {
    let checkpointIndex = -1;
    let cachedInput = this.#n;
    if (
      cachedInput !== undefined &&
      cachedInput.tools === context.tools &&
      cachedInput.replVerbose === context.replVerbose &&
      cachedInput.fullscreenEnv === context.fullscreenEnv &&
      cachedInput.cwd === context.cwd
    ) {
      let cachedMessages = this.#e;
      let min = Math.min(cachedMessages.length, messages.length);
      let commonPrefixLength = 0;
      while (commonPrefixLength < min && cachedMessages[commonPrefixLength] === messages[commonPrefixLength])
        commonPrefixLength++;
      checkpointIndex = this.#o.findLastIndex((checkpoint) => checkpoint.inputIndex <= commonPrefixLength);
    } else this.#n = context;
    this.#o.length = checkpointIndex + 1;
    this.#e = messages;
    let checkpoint = this.#o[checkpointIndex];
    let inputIndex = checkpoint?.inputIndex ?? 0;
    let resultRows = checkpoint === undefined ? [] : this.#t.slice(0, checkpoint.resultLength);
    this.#t = resultRows;
    this.lastFolded = messages.length - inputIndex;
    return {
      start: inputIndex,
      result: resultRows,
      prevTimestamp: checkpoint?.prevTimestamp,
    };
  }
  checkpoint(inputIndex, resultLength, prevTimestamp) {
    let last = this.#o.at(-1);
    if (last === undefined || inputIndex - last.inputIndex >= MAX_INDEX_GAP)
      this.#o.push({
        inputIndex,
        resultLength,
        prevTimestamp,
      });
  }
  reset() {
    this.#e = [];
    this.#t = [];
    this.#n = undefined;
    this.#o = [];
    this.lastFolded = 0;
  }
}
//@ chunk-e6aww6q8.js:4692234-4698662 fingerprint = collapseReadSearchGroups (0.515)
function collapseReadSearchGroups(
  messages,
  tools,
  { transcriptV2 = false, expandRows = false } = {},
  collapser = new IncrementalCollapser(),
) {
  if (transcriptV2) {
    collapser.reset();
    return messages;
  }
  let replVerbose = false;
  if (expandRows) {
    collapser.reset();
    let sourceMessages = messages;
    if (
      !sourceMessages.some(
        (message) => message.type === "attachment" && message.attachment.type === "hook_permission_decision",
      )
    )
      return sourceMessages;
    let output = [];
    let pendingGroup = [];
    let toolUseIds = new Set();
    for (let message of sourceMessages) {
      let collapseInfo = toolCallOf_2(message) ? getToolCollapseInfoCached(message, tools) : null;
      if (collapseInfo) {
        for (let toolUseId of collapseInfo.toolUseIds) toolUseIds.add(toolUseId);
        pendingGroup.push(message);
      } else if (visibleThinkingOf(message) !== undefined && !isSignedThinkingMessage(message))
        pendingGroup.push(message);
      else if (
        pendingGroup.length > 0 &&
        !isUserPromptAttachment(message) &&
        (toolResultText(message, toolUseIds) ||
          shouldSkipMessage(message) ||
          isPlaceholderAssistantMessage(message))
      )
        pendingGroup.push(message);
      else {
        output.push(...dedupeHookPermissionDecisions(pendingGroup), message);
        pendingGroup = [];
        toolUseIds.clear();
      }
    }
    output.push(...dedupeHookPermissionDecisions(pendingGroup));
    return output;
  }
  let currentGroup = isFullscreenEnvEnabled();
  let resumed = collapser.resume(messages, {
    tools,
    replVerbose,
    fullscreenEnv: currentGroup,
    cwd: getEffectiveCwd(),
  });
  let result = resumed.result;
  let group = createEmptyGroup(currentGroup);
  let pendingRows = [];
  let prevTimestamp = resumed.prevTimestamp;
  let group_2;
  let { start, start: start_2 } = resumed;
  function flushGroup() {
    result.push(...dedupeHookPermissionDecisions(pendingRows));
    pendingRows = [];
  }
  function flushGroup_2() {
    if (group.messages.length === 0) return;
    result.push(createCollapsedGroup(group, currentGroup));
    flushGroup();
    group = createEmptyGroup(currentGroup);
  }
  for (let start_3 = resumed.start; start_3 < messages.length; start_3++) {
    let message = messages[start_3];
    start = start_3;
    if (
      group.messages.length === 0 &&
      pendingRows.length === 0 &&
      group_2 === undefined &&
      !isMemoryContextAttachment(messages[start_3 - 1]) &&
      start_3 >= start_2
    )
      collapser.checkpoint(start_3, result.length, prevTimestamp);
    let collapseInfo = toolCallOf_2(message) ? getToolCollapseInfoCached(message, tools) : null;
    let thinking = collapseInfo === null ? visibleThinkingOf(message) : undefined;
    let memorySaves = collapseInfo === null ? getMemorySaveEntries(message, group) : EMPTY_COLLAPSED_RESULT;
    if (collapseInfo) {
      group.latestThinkingSummary = undefined;
      let toolUseCount = collapseInfo.toolUseCount;
      if (collapseInfo.isMemoryWrite) {
        if (collapseInfo.isTeamMemoryWrite)
          group.teamMemoryWriteCount = (group.teamMemoryWriteCount ?? 0) + toolUseCount;
        else group.memoryWriteCount += toolUseCount;
      } else if (collapseInfo.isScratchpadWrite) {
        group.scratchpadWriteCount = (group.scratchpadWriteCount ?? 0) + toolUseCount;
        if (collapseInfo.editLines) {
          group.scratchpadLinesAdded = (group.scratchpadLinesAdded ?? 0) + collapseInfo.editLines.added;
          group.scratchpadLinesRemoved = (group.scratchpadLinesRemoved ?? 0) + collapseInfo.editLines.removed;
        }
        let filePath = inputFilePath(collapseInfo.input);
        let label = filePath ? formatCollapsedLabel(getDisplayPath(filePath)) : "";
        if (label) group.latestDisplayHint = label;
      } else if (collapseInfo.isAbsorbedSilently) {
        if (collapseInfo.popsOutOnError) {
          group.popOutOnErrorIds ??= new Set();
          for (let toolUseId of collapseInfo.toolUseIds) group.popOutOnErrorIds.add(toolUseId);
        }
      } else if (collapseInfo.accountMemory === "read") {
        group.accountMemoryReadKeys ??= new Set();
        for (let memoryPath of collapseInfo.accountMemoryPaths.length > 0
          ? collapseInfo.accountMemoryPaths
          : collapseInfo.toolUseIds)
          group.accountMemoryReadKeys.add(memoryPath);
      } else if (collapseInfo.accountMemory === "search")
        group.accountMemorySearchCount = (group.accountMemorySearchCount ?? 0) + toolUseCount;
      else if (collapseInfo.memorySave !== undefined) {
        group.memorySaves ??= new Map();
        for (let toolUseId of collapseInfo.toolUseIds)
          group.memorySaves.set(toolUseId, {
            ...collapseInfo.memorySave,
            id: toolUseId,
          });
      } else if (collapseInfo.mcpCallLabel) {
        group.mcpCallCount = (group.mcpCallCount ?? 0) + toolUseCount;
        group.mcpCallLabels?.add(collapseInfo.mcpCallLabel);
        if (collapseInfo.displayHint) group.latestDisplayHint = `"${collapseInfo.displayHint}"`;
      } else if (currentGroup && collapseInfo.isBash) {
        group.bashCount = (group.bashCount ?? 0) + toolUseCount;
        let { command } = collapseInfo.input;
        if (command) {
          group.latestDisplayHint = collapseInfo.displayHint;
          for (let toolUseId of collapseInfo.toolUseIds) group.bashCommands?.set(toolUseId, command);
        }
      } else if (collapseInfo.isList) {
        group.listCount += toolUseCount;
        if (collapseInfo.displayHint) group.latestDisplayHint = collapseInfo.displayHint;
      } else if (collapseInfo.isSearch)
        switch (((group.searchCount += toolUseCount), collapseInfo.searchTarget)) {
          case "team_memory":
            group.teamMemorySearchCount = (group.teamMemorySearchCount ?? 0) + toolUseCount;
            break;
          case "memory":
            group.memorySearchCount += toolUseCount;
            break;
          case "other":
          case null:
            if (collapseInfo.displayHint) {
              group.nonMemSearchArgs.push(collapseInfo.displayHint);
              group.latestDisplayHint = `"${collapseInfo.displayHint}"`;
            }
            break;
        }
      else {
        let readPaths = collapseInfo.readPaths ?? [];
        for (let deferred of readPaths) {
          group.readFilePaths.add(deferred.path);
          if (deferred.isTeamMem) group.teamMemoryReadFilePaths?.add(deferred.path);
          else if (deferred.isAutoManagedMemory) group.memoryReadFilePaths.add(deferred.path);
          else {
            let label = formatCollapsedLabel(getDisplayPath(deferred.path));
            if (label) group.latestDisplayHint = label;
          }
        }
        if (readPaths.length === 0) {
          group.readOperationCount += toolUseCount;
          if (collapseInfo.displayHint) group.latestDisplayHint = collapseInfo.displayHint;
        }
      }
      for (let toolUseId of collapseInfo.toolUseIds) group.toolUseIds.add(toolUseId);
      group.messages.push(message);
    } else if (
      toolResultText(message, group.toolUseIds) &&
      (memorySaves.length > 0 ||
        (message.type === "user" &&
          message.message.content.some(
            (entry) =>
              entry.type === "tool_result" &&
              entry.is_error &&
              group.popOutOnErrorIds?.has(entry.tool_use_id),
          )))
    ) {
      let last = group.messages.at(-1);
      let lastToolUseIds = last ? toolCallOf_3(last) : [];
      let currentToolUseIds = new Set(
        message.type === "user"
          ? message.message.content.flatMap((block) =>
              block.type === "tool_result" && (block.is_error || memorySaves.includes(block.tool_use_id))
                ? [block.tool_use_id]
                : [],
            )
          : [],
      );
      if (
        !(
          (group.hookCount > 0 ||
            (group.relevantMemories?.length ?? 0) > 0 ||
            (group.accountMemoryRecalls?.length ?? 0) > 0) &&
          (memorySaves.length === 0 || group.messages.length === 1)
        ) &&
        lastToolUseIds.length > 0 &&
        lastToolUseIds.every((toolUseId) => currentToolUseIds.has(toolUseId))
      ) {
        group.messages.pop();
        for (let msg of lastToolUseIds) {
          group.toolUseIds.delete(msg);
          group.memorySaves?.delete(msg);
        }
        if (group.messages.length > 0) {
          flushGroup_2();
          result.push(last);
        } else {
          result.push(last);
          flushGroup();
          group = createEmptyGroup(currentGroup);
        }
      } else flushGroup_2();
      result.push(message);
    } else if (toolResultText(message, group.toolUseIds) && hasBashEditDiff(message)) {
      let msg = group.messages.at(-1);
      let otherToolUseIds = msg ? toolCallOf_3(msg) : [];
      let otherToolUseIdSet = new Set(
        message.type === "user"
          ? message.message.content.flatMap((block) =>
              block.type === "tool_result" ? [block.tool_use_id] : [],
            )
          : [],
      );
      let counts =
        group.messages.length === 1 &&
        (group.hookCount > 0 ||
          (group.relevantMemories?.length ?? 0) > 0 ||
          (group.accountMemoryRecalls?.length ?? 0) > 0);
      if (
        msg &&
        !counts &&
        otherToolUseIds.length > 0 &&
        otherToolUseIds.every((toolUseId) => otherToolUseIdSet.has(toolUseId))
      ) {
        group.messages.pop();
        let toolInfo = getToolCollapseInfoCached(msg, tools);
        let toolUseCount = toolInfo?.toolUseCount ?? countToolUses(msg);
        if (isFullscreenEnvEnabled() && toolInfo?.isBash)
          group.bashCount = Math.max(0, (group.bashCount ?? 0) - toolUseCount);
        else if (toolInfo?.isList) group.listCount = Math.max(0, group.listCount - toolUseCount);
        else if (toolInfo?.isSearch) group.searchCount = Math.max(0, group.searchCount - toolUseCount);
        else if ((toolInfo?.readPaths?.length ?? 0) === 0)
          group.readOperationCount = Math.max(0, group.readOperationCount - toolUseCount);
        for (let filePath of otherToolUseIds) {
          group.toolUseIds.delete(filePath);
          group.bashCommands?.delete(filePath);
        }
        if (group.messages.length > 0) {
          flushGroup_2();
          result.push(msg);
        } else {
          result.push(msg);
          flushGroup();
          group = createEmptyGroup(currentGroup);
        }
      } else flushGroup_2();
      result.push(message);
    } else if (toolResultText(message, group.toolUseIds)) {
      group.messages.push(message);
      if (currentGroup && group.bashCommands?.size) scanBashResultForGitOps(message, group);
    } else if (group.messages.length > 0 && isPreToolHookSummary(message)) {
      let { hookCount, hookInfos, totalDurationMs } = normalizeHookSummary(message);
      group.hookCount += hookCount;
      group.hookTotalMs +=
        totalDurationMs ?? hookInfos.reduce((sum, hookInfo) => sum + (hookInfo.durationMs ?? 0), 0);
      group.hookInfos.push(...hookInfos);
    } else if (
      group.messages.length > 0 &&
      message.type === "attachment" &&
      message.attachment.type === "relevant_memories"
    ) {
      group.relevantMemories ??= [];
      group.relevantMemories.push(...message.attachment.memories);
    } else if (
      group.messages.length > 0 &&
      message.type === "attachment" &&
      message.attachment.type === "account_memory_recall"
    ) {
      group.accountMemoryReadKeys ??= new Set();
      for (let file of message.attachment.files)
        group.accountMemoryReadKeys.add(normalizeServerPath(file.path));
      group.accountMemoryRecalls ??= [];
      group.accountMemoryRecalls.push({
        paths: message.attachment.files.map((file) => file.path),
        content: message.attachment.content,
      });
    } else if (
      message.type === "attachment" &&
      message.attachment.type === "relevant_memories" &&
      isFollowedByMemoryRecall(messages, start_3)
    )
      group_2 = message.attachment.memories;
    else if (
      group_2 !== undefined &&
      message.type === "attachment" &&
      message.attachment.type === "account_memory_recall"
    ) {
      result.push({
        ...message,
        attachment: {
          ...message.attachment,
          localRecall: group_2,
        },
      });
      group_2 = undefined;
    } else if (
      isMessageBreakPoint(message) ||
      (thinking !== undefined && isSignedThinkingMessage(thinking.message))
    ) {
      flushGroup_2();
      result.push(message);
    } else if (thinking !== undefined) {
      let summary = (thinking.memo.summary ??= collapseWhitespace_2(
        stripAnsiPerLine(thinking.memo.thinking),
      ));
      if (summary) group.latestThinkingSummary = summary;
      if (prevTimestamp !== undefined) {
        let gapMs = Date.parse(message.timestamp) - Date.parse(prevTimestamp);
        if (Number.isFinite(gapMs) && gapMs > 0) group.thoughtForMs += Math.min(gapMs, MAX_LOGGED_THOUGHT_MS);
      }
      group.messages.push(thinking.message);
    } else if (shouldSkipMessage(message) || isPlaceholderAssistantMessage(message)) {
      if (group.messages.length > 0) pendingRows.push(message);
      else result.push(message);
    } else {
      flushGroup_2();
      result.push(message);
    }
    if ("timestamp" in message && typeof message.timestamp === "string") prevTimestamp = message.timestamp;
  }
  start = messages.length;
  flushGroup_2();
  return result;
}
//@ chunk-e6aww6q8.js:4698662-4698895 layout
/**
 * 去重 hook 权限决定附件：同一 decision 与 hookEvent 只保留第一条。
 */
function dedupeHookPermissionDecisions(decisions) {
  let seen = new Set();
  let kept = [];
  for (let decision of decisions) {
    if (decision.type === "attachment" && decision.attachment.type === "hook_permission_decision") {
      let key = `${decision.attachment.decision}:${decision.attachment.hookEvent}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    kept.push(decision);
  }
  return kept;
}
//@ chunk-e6aww6q8.js:4698895-4699177 layout
function isUserPromptAttachment(attachment) {
  if (attachment.type !== "attachment") return false;
  let attachment_2 = attachment.attachment;
  if (attachment_2.type !== "queued_command" || attachment_2.commandMode !== "prompt") return false;
  let origin = attachment_2.origin;
  if (!attachment_2.isMeta && isHumanOrAutoContinuation(origin)) return true;
  if (origin?.kind === "channel") return true;
  if (origin?.kind === "peer") return true;
  if (origin?.kind === "slack-ping") return true;
  return false;
}
//@ chunk-e6aww6q8.js:4699177-4699308 placement = computeStickyPromptText (0.865)
function isTaskNotificationAttachment(msg) {
  return (
    msg.type === "attachment" &&
    msg.attachment.type === "queued_command" &&
    msg.attachment.commandMode === "task-notification"
  );
}
//@ chunk-e6aww6q8.js:4699308-4699460 placement
function isPeerQueuedCommand(message) {
  if (message.type !== "attachment" || message.attachment.type !== "queued_command") return false;
  let origin = message.attachment.origin;
  return isPeerOrObserver(origin) || origin?.kind === "coordinator";
}
//@ chunk-e6aww6q8.js:4699460-4699620 placement
function hasVisibleMailbox(message) {
  return (
    message.type === "attachment" &&
    message.attachment.type === "teammate_mailbox" &&
    Array.isArray(message.attachment.messages) &&
    visibleTeammateMailboxMessages(message.attachment.messages).length > 0
  );
}
//@ chunk-e6aww6q8.js:4699620-4699754 placement
function isMemoryContextAttachment(attachment) {
  return (
    attachment?.type === "attachment" &&
    (attachment.attachment.type === "relevant_memories" ||
      attachment.attachment.type === "cowork_memory_context")
  );
}
//@ chunk-e6aww6q8.js:4699754-4699968 placement
function isFollowedByMemoryRecall(messages, start) {
  for (let idx = start + 1; idx < messages.length; idx++) {
    let message = messages[idx];
    if (message.type !== "attachment") return false;
    if (message.attachment.type === "account_memory_recall") return true;
    if (message.attachment.type !== "cowork_memory_context") return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4699968-4700022 placement
/**
 * 判断该附件是否构成消息断点（用户提示、任务通知、队友排队命令或有可见邮箱）。
 */
function isMessageBreakPoint(message) {
  return (
    isUserPromptAttachment(message) ||
    isTaskNotificationAttachment(message) ||
    isPeerQueuedCommand(message) ||
    hasVisibleMailbox(message)
  );
}
//@ chunk-e6aww6q8.js:4700022-4700121 placement
function isCollapsibleToolResult(message) {
  if (message.type === "user") return message.message.content[0]?.type !== "tool_result";
  return isUserPromptAttachment(message);
}
//@ chunk-e6aww6q8.js:4708167-4709111 fingerprint = getSearchReadSummaryText (0.974)
/**
 * 生成搜索/读取折叠摘要文本（进行时或过去时），包含记忆检索/读取/写入次数。
 */
function getSearchReadSummaryText(searchCount, readCount, isActive, memoryCounts, deferredCount = 0) {
  let parts = [];
  if (memoryCounts) {
    let { memorySearchCount, memoryReadCount, memoryWriteCount } = memoryCounts;
    if (memoryReadCount > 0) {
      let verb = isActive
        ? parts.length === 0
          ? "Recalling"
          : "recalling"
        : parts.length === 0
          ? "Recalled"
          : "recalled";
      parts.push(`${verb} ${memoryReadCount} ${memoryReadCount === 1 ? "memory" : "memories"}`);
    }
    if (memorySearchCount > 0) {
      let verb = isActive
        ? parts.length === 0
          ? "Searching"
          : "searching"
        : parts.length === 0
          ? "Searched"
          : "searched";
      parts.push(`${verb} memories`);
    }
    if (memoryWriteCount > 0) {
      let verb = isActive
        ? parts.length === 0
          ? "Writing"
          : "writing"
        : parts.length === 0
          ? "Wrote"
          : "wrote";
      parts.push(`${verb} ${memoryWriteCount} ${memoryWriteCount === 1 ? "memory" : "memories"}`);
    }
    appendTeamMemorySummaryParts(memoryCounts, isActive, parts);
  }
  if (searchCount > 0) {
    let searchVerb = isActive
      ? parts.length === 0
        ? "Searching for"
        : "searching for"
      : parts.length === 0
        ? "Searched for"
        : "searched for";
    parts.push(`${searchVerb} ${searchCount} ${searchCount === 1 ? "pattern" : "patterns"}`);
  }
  if (readCount > 0) {
    let readVerb = isActive
      ? parts.length === 0
        ? "Reading"
        : "reading"
      : parts.length === 0
        ? "Read"
        : "read";
    parts.push(`${readVerb} ${readCount} ${readCount === 1 ? "file" : "files"}`);
  }
  if (deferredCount > 0) {
    let listVerb = isActive
      ? parts.length === 0
        ? "Listing"
        : "listing"
      : parts.length === 0
        ? "Listed"
        : "listed";
    parts.push(`${listVerb} ${deferredCount} ${deferredCount === 1 ? "directory" : "directories"}`);
  }
  let text = parts.join(", ");
  return isActive ? `${text}\u2026` : text;
}
//@ chunk-e6aww6q8.js:4709111-4709381 fingerprint = summarizeRecentActivities (1)
/**
 * 最近活动摘要：末尾连续的搜索/读取工具调用 ≥2 次时生成“Searched N, read M”类文本，否则取最后一条活动描述。
 */
function summarizeRecentActivities(activities) {
  if (activities.length === 0) return;
  let searchCount = 0;
  let readCount = 0;
  for (let i = activities.length - 1; i >= 0; i--) {
    let activity = activities[i];
    if (activity.isSearch) searchCount++;
    else if (activity.isRead) readCount++;
    else break;
  }
  if (searchCount + readCount >= 2) return getSearchReadSummaryText(searchCount, readCount, true);
  for (let i = activities.length - 1; i >= 0; i--)
    if (activities[i]?.activityDescription) return activities[i].activityDescription;
  return;
}
export {
  isUserPromptAttachment,
  isCollapsibleToolResult,
  shouldSkipMessage,
  isTextBreaker,
  isPlaceholderAssistantMessage,
  isSignedThinkingMessage,
  memorySaveHooks,
  ARTIFACT_TOOL_NAME,
  isPublishShapedArtifactAction,
  IncrementalCollapser,
  isSignedThinkingBlock,
  collapseReadSearchGroups,
  getSearchOrReadFromContent,
  getSearchReadSummaryText,
  getToolSearchOrReadInfo,
  findToolByNameWithFallback,
  summarizeRecentActivities,
  isMessageBreakPoint,
  getDisplayMessageFromCollapsed,
  MAX_LOGGED_THOUGHT_MS,
};
