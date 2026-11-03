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
import { string } from "../../vendor/zod/v4/classic/schemas.js";
import { getEffectiveCwd } from "./cwd.js";
import { getDisplayPath } from "./file.js";
import { normalizeHookSummary } from "./collapseHookSummaries.js";
import { stripAnsiPerLine } from "./stripAnsi.js";
import { isHumanOrAutoContinuation, isPeerOrObserver } from "./messageProvenance.js";
import { visibleTeammateMailboxMessages } from "./teammateMailbox.js";
import { appendTeamMemorySummaryParts } from "./teamMemoryOps.js";

//@ chunk-e6aww6q8.js:4677066-4677123 placement
/**
 * 判断工具输入路径是否指向团队记忆目录。
 */
function isTeamMemoryPathInput(e) {
  if (e.path && isTeamMemoryPath(e.path)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4677123-4677220 placement
function getFilePathFromToolInput(toolInput, toolInput_2) {
  if (toolInput !== FILE_WRITE_TOOL_NAME && toolInput !== FILE_EDIT_TOOL_NAME) return false;
  let filePath = toolInput_2.file_path ?? toolInput_2.path;
  return filePath !== undefined && isTeamMemoryPath(filePath);
}
//@ chunk-e6aww6q8.js:4679035-4679333 placement = getSessionFileTypeFromInput (0.767)
function getSessionFileTypeFromInput_2(e) {
  if (typeof e !== "object" || e === null) return {};
  let { file_path: filePath, path, pattern, glob, command, query, content } = e;
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
function isSafeInputString(e) {
  return typeof e === "string" && !e.includes("\x00");
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
var ARTIFACT_TOOL_NAME = require("./chunk-ecvm5qmk.js").ARTIFACT_TOOL_NAME;
var mapped_5 = [REMOTE_DEVICES, HEARTHBOT, "webagent", ...INJECTED_MCP_SERVER_NAMES].map(alnumLower);
var isPublishShapedArtifactAction = require("./chunk-ecvm5qmk.js").isPublishShapedArtifactAction;
var isPublishShapedArtifact = () => require("./chunk-nrmn01d7.js").isScratchpadDisplayPath;
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
function truncateCollapsedLabel(e) {
  return e.length > MAX_COLLAPSED_LABEL_CHARS
    ? truncateToLength(e, MAX_COLLAPSED_LABEL_CHARS - 1) + "\u2026"
    : e;
}
//@ chunk-e6aww6q8.js:4680070-4680104 layout
function formatCollapsedLabel(e) {
  return truncateCollapsedLabel(collapseWhitespace_2(e));
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
      .filter((r) => r !== "").join(`
`);
  return truncateCollapsedLabel(cleaned);
}
//@ chunk-e6aww6q8.js:4680204-4680250 layout
function findToolByNameWithFallback(tools, n) {
  return findToolByName(tools, n) ?? findToolByName(getFileAndShellTools(), n);
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
  let toolByNameWithFallback = findToolByNameWithFallback(tools, toolName);
  let w =
    (toolByNameWithFallback?.mcpInfo !== undefined &&
      moduleStore.minted(toolByNameWithFallback.mcpInfo.serverName)) ||
    toolByNameWithFallback?.uiTableKey === MCP_CLAUDE_TEST_WRITE;
  if (toolByNameWithFallback?.isMcp && !w)
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
        mcpCallLabel: toolByNameWithFallback.mcpInfo?.serverName,
      },
    };
  let L = toolByNameWithFallback === undefined ? deviceToolDisplayInfo(toolName) : undefined;
  let serverName = L && normalizeUuidOrNull(L.serverName) !== null ? "MCP" : L?.serverName;
  let q = alnumLower(serverName ?? "");
  if (L !== undefined && serverName !== undefined && !mapped_5.some((Ee) => q.startsWith(Ee)))
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
      ...(memorySaveHooks?.isMemorySaveCall(L) && {
        memorySave: memorySaveHooks.memorySaveOf(L.toolName, getSessionFileTypeFromInput_2(toolInput)),
      }),
    };
  if (!toolByNameWithFallback?.isSearchOrReadCommand)
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
  if (remoteMachineRefForDisplay(toolByNameWithFallback, toolInput) !== undefined)
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
  let result = toolByNameWithFallback.isSearchOrReadCommand(toolInput ?? {});
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
function toolInputPaths(e) {
  if (typeof e !== "object" || e === null || isUntrustedObject_2(e)) return [];
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, "path");
  if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) return [];
  let r = ownPropertyDescriptor.value;
  if (typeof r === "string") return [normalizeServerPath(r)];
  if (r === null || typeof r !== "object" || isUntrustedObject_2(r) || !Array.isArray(r)) return [];
  let s = r.length;
  if (!Number.isSafeInteger(s)) return [];
  let h = [];
  for (let idx = 0; idx < s && idx < MAX_INPUT_PATHS; idx++) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, idx);
    if (
      ownPropertyDescriptor &&
      "value" in ownPropertyDescriptor &&
      typeof ownPropertyDescriptor.value === "string"
    )
      h.push(normalizeServerPath(ownPropertyDescriptor.value));
  }
  return h;
}
//@ chunk-e6aww6q8.js:4683047-4683067 layout
var weakMap_17 = new WeakMap();
//@ chunk-e6aww6q8.js:4683067-4683236 layout = toolCallOf (1)
function toolCallOf(msg) {
  if (msg.type === "assistant") {
    let n = msg.message.content[0];
    return n?.type === "tool_use" ? n.name : null;
  }
  if (msg.type === "grouped_tool_use") return msg.toolName;
  return null;
}
//@ chunk-e6aww6q8.js:4683236-4683457 layout
/**
 * 按工具调用缓存折叠信息（工具表不变时复用）。
 */
function getToolCollapseInfoCached(msg, tools) {
  let r = weakMap_17.get(msg);
  if (r?.tools === tools) return r.info;
  let s = toolCallOf(msg);
  let h = s === null ? undefined : findToolByNameWithFallback(tools, s);
  if (r && h === r.resolvedTool) {
    r.tools = tools;
    return r.info;
  }
  let collapsibleToolInfo = getCollapsibleToolInfo(msg, tools);
  weakMap_17.set(msg, {
    tools,
    resolvedTool: h,
    info: collapsibleToolInfo,
  });
  return collapsibleToolInfo;
}
//@ chunk-e6aww6q8.js:4683457-4685204 callgraph-fingerprint = getCollapsibleToolInfo (0.157)
function getCollapsibleToolInfo(msg, tools) {
  let r = null;
  if (msg.type === "assistant") {
    let content = msg.message.content[0];
    let info = getSearchOrReadFromContent(content, tools);
    if (info && content?.type === "tool_use")
      r = {
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
      r = {
        name: msg.toolName,
        input: getSessionFileTypeFromInput_2(firstContent.input),
        ...info,
        memorySave: undefined,
      };
  }
  if (!r) return null;
  let { command, query, pattern } = r.input;
  let S = null;
  let w = [];
  let L = "";
  let isTeamMemoryWrite = false;
  let q = null;
  if (r.isMemoryWrite) isTeamMemoryWrite = getFilePathFromToolInput(r.name, r.input);
  else if (r.isScratchpadWrite || r.isAbsorbedSilently);
  else if (r.accountMemory) {
    if (r.accountMemory === "read") {
      let Se =
        msg.type === "grouped_tool_use"
          ? msg.messages.map((message) => message.message.content[0])
          : msg.type === "assistant"
            ? [msg.message.content[0]]
            : [];
      for (let ke of Se) if (ke?.type === "tool_use") w.push(...toolInputPaths(ke.input));
    }
  } else if (r.memorySave !== undefined);
  else if (r.mcpCallLabel) L = query ? formatCollapsedLabel(query) : "";
  else if (isFullscreenEnvEnabled() && r.isBash) {
    if (command) {
      let Se = bashCommentTitle(command);
      L = Se !== undefined ? truncateCollapsedLabel(Se) : commandAsHint(command);
    }
  } else if (r.isList) L = command ? commandAsHint(command) : "";
  else if (r.isSearch) {
    q = isTeamMemoryPathInput(r.input) ? "team_memory" : isMemorySearch(r.input) ? "memory" : "other";
    if (q === "other") L = pattern ? formatCollapsedLabel(pattern) : "";
  } else {
    S = getFilePathsFromReadMessage(msg).map((Se) => ({
      path: Se,
      isTeamMem: isTeamMemoryPath(Se),
      isAutoManagedMemory: isMemoryOrSessionFile(Se),
    }));
    if (S.length === 0) L = command ? commandAsHint(command) : "";
  }
  let editLines = null;
  if (r.isScratchpadWrite) {
    let added = 0;
    let removed = 0;
    let we =
      msg.type === "grouped_tool_use"
        ? msg.messages.map((message) => message.message.content[0])
        : msg.type === "assistant"
          ? [msg.message.content[0]]
          : [];
    for (let Ee of we) {
      if (Ee?.type !== "tool_use") continue;
      let Ae = countEditLines(r.name, Ee.input);
      added += Ae.added;
      removed += Ae.removed;
    }
    editLines = {
      added,
      removed,
    };
  }
  return {
    ...r,
    toolUseIds: toolCallOf_3(msg),
    toolUseCount: countToolUses(msg),
    readPaths: S,
    accountMemoryPaths: w,
    editLines,
    displayHint: L,
    isTeamMemoryWrite,
    searchTarget: q,
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
function isSignedThinkingMessage(msg) {
  if (msg.type !== "assistant") return false;
  return isSignedThinkingBlock(msg.message.content[0]);
}
//@ chunk-e6aww6q8.js:4685449-4685584 layout
function isSignedThinkingBlock(e) {
  if (e === undefined) return false;
  return (
    e.type === "thinking" &&
    typeof e.thinking === "string" &&
    typeof e.signature === "string" &&
    hasNarrationThinking(e)
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
var weakMap_18 = new WeakMap();
//@ chunk-e6aww6q8.js:4686074-4686358 sole-consumer
function visibleThinkingOf(e) {
  if (e.type !== "assistant") return;
  let n = e.message.content[0];
  if (n?.type !== "thinking" || !n.thinking) return;
  let thinking = n.thinking;
  let s = weakMap_18.get(e);
  if (s === undefined || s.thinking !== thinking) {
    s = {
      thinking,
      blank: thinking.trim() === "",
      summary: undefined,
    };
    weakMap_18.set(e, s);
  }
  if (s.blank) return;
  return {
    message: e,
    memo: s,
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
  for (let h of msg.message.content) {
    if (h.type !== "tool_result") continue;
    let command = group.bashCommands?.get(h.tool_use_id);
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
function getMemorySaveEntries(e, n) {
  if (memorySaveHooks === null || e.type !== "user" || !n.memorySaves?.size) return EMPTY_COLLAPSED_RESULT;
  let r = [];
  for (let s of e.message.content) {
    let h = s.type === "tool_result" ? n.memorySaves.get(s.tool_use_id) : undefined;
    if (s.type !== "tool_result" || h === undefined) continue;
    let y = e.sharesToolUseResult === true;
    h.end = y ? "not_stored" : memorySaveHooks.memorySaveEndOf(s, e.toolUseResult);
    if (h.end === "not_stored" && (!y || s.is_error === true)) r.push(s.tool_use_id);
  }
  return r;
}
//@ chunk-e6aww6q8.js:4691105-4691481 layout
function hasBashEditDiff(e) {
  if (e.type !== "user") return false;
  let toolUseResult = e.toolUseResult;
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
  resume(e, n) {
    let r = -1;
    let s = this.#n;
    if (
      s !== undefined &&
      s.tools === n.tools &&
      s.replVerbose === n.replVerbose &&
      s.fullscreenEnv === n.fullscreenEnv &&
      s.cwd === n.cwd
    ) {
      let w = this.#e;
      let min = Math.min(w.length, e.length);
      let G = 0;
      while (G < min && w[G] === e[G]) G++;
      r = this.#o.findLastIndex((q) => q.inputIndex <= G);
    } else this.#n = n;
    this.#o.length = r + 1;
    this.#e = e;
    let h = this.#o[r];
    let inputIndex = h?.inputIndex ?? 0;
    let S = h === undefined ? [] : this.#t.slice(0, h.resultLength);
    this.#t = S;
    this.lastFolded = e.length - inputIndex;
    return {
      start: inputIndex,
      result: S,
      prevTimestamp: h?.prevTimestamp,
    };
  }
  checkpoint(e, resultLength, prevTimestamp) {
    let last = this.#o.at(-1);
    if (last === undefined || e - last.inputIndex >= MAX_INDEX_GAP)
      this.#o.push({
        inputIndex: e,
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
  { transcriptV2: r = false, expandRows: s = false } = {},
  h = new IncrementalCollapser(),
) {
  if (r) {
    h.reset();
    return messages;
  }
  let replVerbose = false;
  if (s) {
    h.reset();
    let Ie = messages;
    if (!Ie.some((lt) => lt.type === "attachment" && lt.attachment.type === "hook_permission_decision"))
      return Ie;
    let Me = [];
    let We = [];
    let ze = new Set();
    for (let lt of Ie) {
      let Je = toolCallOf_2(lt) ? getToolCollapseInfoCached(lt, tools) : null;
      if (Je) {
        for (let toolUseId of Je.toolUseIds) ze.add(toolUseId);
        We.push(lt);
      } else if (visibleThinkingOf(lt) !== undefined && !isSignedThinkingMessage(lt)) We.push(lt);
      else if (
        We.length > 0 &&
        !isUserPromptAttachment(lt) &&
        (toolResultText(lt, ze) || shouldSkipMessage(lt) || isPlaceholderAssistantMessage(lt))
      )
        We.push(lt);
      else {
        Me.push(...dedupeHookPermissionDecisions(We), lt);
        We = [];
        ze.clear();
      }
    }
    Me.push(...dedupeHookPermissionDecisions(We));
    return Me;
  }
  let currentGroup = isFullscreenEnvEnabled();
  let w = h.resume(messages, {
    tools,
    replVerbose,
    fullscreenEnv: currentGroup,
    cwd: getEffectiveCwd(),
  });
  let L = w.result;
  let group = createEmptyGroup(currentGroup);
  let q = [];
  let prevTimestamp = w.prevTimestamp;
  let Se;
  let { start, start: start_2 } = w;
  function flushGroup() {
    L.push(...dedupeHookPermissionDecisions(q));
    q = [];
  }
  function flushGroup_2() {
    if (group.messages.length === 0) return;
    L.push(createCollapsedGroup(group, currentGroup));
    flushGroup();
    group = createEmptyGroup(currentGroup);
  }
  for (let start_3 = w.start; start_3 < messages.length; start_3++) {
    let msg = messages[start_3];
    start = start_3;
    if (
      group.messages.length === 0 &&
      q.length === 0 &&
      Se === undefined &&
      !isMemoryContextAttachment(messages[start_3 - 1]) &&
      start_3 >= start_2
    )
      h.checkpoint(start_3, L.length, prevTimestamp);
    let We = toolCallOf_2(msg) ? getToolCollapseInfoCached(msg, tools) : null;
    let ze = We === null ? visibleThinkingOf(msg) : undefined;
    let lt = We === null ? getMemorySaveEntries(msg, group) : EMPTY_COLLAPSED_RESULT;
    if (We) {
      group.latestThinkingSummary = undefined;
      let toolUseCount = We.toolUseCount;
      if (We.isMemoryWrite) {
        if (We.isTeamMemoryWrite)
          group.teamMemoryWriteCount = (group.teamMemoryWriteCount ?? 0) + toolUseCount;
        else group.memoryWriteCount += toolUseCount;
      } else if (We.isScratchpadWrite) {
        group.scratchpadWriteCount = (group.scratchpadWriteCount ?? 0) + toolUseCount;
        if (We.editLines) {
          group.scratchpadLinesAdded = (group.scratchpadLinesAdded ?? 0) + We.editLines.added;
          group.scratchpadLinesRemoved = (group.scratchpadLinesRemoved ?? 0) + We.editLines.removed;
        }
        let nt = inputFilePath(We.input);
        let pt = nt ? formatCollapsedLabel(getDisplayPath(nt)) : "";
        if (pt) group.latestDisplayHint = pt;
      } else if (We.isAbsorbedSilently) {
        if (We.popsOutOnError) {
          group.popOutOnErrorIds ??= new Set();
          for (let toolUseId of We.toolUseIds) group.popOutOnErrorIds.add(toolUseId);
        }
      } else if (We.accountMemory === "read") {
        group.accountMemoryReadKeys ??= new Set();
        for (let nt of We.accountMemoryPaths.length > 0 ? We.accountMemoryPaths : We.toolUseIds)
          group.accountMemoryReadKeys.add(nt);
      } else if (We.accountMemory === "search")
        group.accountMemorySearchCount = (group.accountMemorySearchCount ?? 0) + toolUseCount;
      else if (We.memorySave !== undefined) {
        group.memorySaves ??= new Map();
        for (let toolUseId of We.toolUseIds)
          group.memorySaves.set(toolUseId, {
            ...We.memorySave,
            id: toolUseId,
          });
      } else if (We.mcpCallLabel) {
        group.mcpCallCount = (group.mcpCallCount ?? 0) + toolUseCount;
        group.mcpCallLabels?.add(We.mcpCallLabel);
        if (We.displayHint) group.latestDisplayHint = `"${We.displayHint}"`;
      } else if (currentGroup && We.isBash) {
        group.bashCount = (group.bashCount ?? 0) + toolUseCount;
        let { command } = We.input;
        if (command) {
          group.latestDisplayHint = We.displayHint;
          for (let toolUseId of We.toolUseIds) group.bashCommands?.set(toolUseId, command);
        }
      } else if (We.isList) {
        group.listCount += toolUseCount;
        if (We.displayHint) group.latestDisplayHint = We.displayHint;
      } else if (We.isSearch)
        switch (((group.searchCount += toolUseCount), We.searchTarget)) {
          case "team_memory":
            group.teamMemorySearchCount = (group.teamMemorySearchCount ?? 0) + toolUseCount;
            break;
          case "memory":
            group.memorySearchCount += toolUseCount;
            break;
          case "other":
          case null:
            if (We.displayHint) {
              group.nonMemSearchArgs.push(We.displayHint);
              group.latestDisplayHint = `"${We.displayHint}"`;
            }
            break;
        }
      else {
        let readPaths = We.readPaths ?? [];
        for (let deferred of readPaths) {
          group.readFilePaths.add(deferred.path);
          if (deferred.isTeamMem) group.teamMemoryReadFilePaths?.add(deferred.path);
          else if (deferred.isAutoManagedMemory) group.memoryReadFilePaths.add(deferred.path);
          else {
            let Et = formatCollapsedLabel(getDisplayPath(deferred.path));
            if (Et) group.latestDisplayHint = Et;
          }
        }
        if (readPaths.length === 0) {
          group.readOperationCount += toolUseCount;
          if (We.displayHint) group.latestDisplayHint = We.displayHint;
        }
      }
      for (let toolUseId of We.toolUseIds) group.toolUseIds.add(toolUseId);
      group.messages.push(msg);
    } else if (
      toolResultText(msg, group.toolUseIds) &&
      (lt.length > 0 ||
        (msg.type === "user" &&
          msg.message.content.some(
            (Je) => Je.type === "tool_result" && Je.is_error && group.popOutOnErrorIds?.has(Je.tool_use_id),
          )))
    ) {
      let last = group.messages.at(-1);
      let nt = last ? toolCallOf_3(last) : [];
      let pt = new Set(
        msg.type === "user"
          ? msg.message.content.flatMap((gt) =>
              gt.type === "tool_result" && (gt.is_error || lt.includes(gt.tool_use_id))
                ? [gt.tool_use_id]
                : [],
            )
          : [],
      );
      if (
        !(
          (group.hookCount > 0 ||
            (group.relevantMemories?.length ?? 0) > 0 ||
            (group.accountMemoryRecalls?.length ?? 0) > 0) &&
          (lt.length === 0 || group.messages.length === 1)
        ) &&
        nt.length > 0 &&
        nt.every((gt) => pt.has(gt))
      ) {
        group.messages.pop();
        for (let msg of nt) {
          group.toolUseIds.delete(msg);
          group.memorySaves?.delete(msg);
        }
        if (group.messages.length > 0) {
          flushGroup_2();
          L.push(last);
        } else {
          L.push(last);
          flushGroup();
          group = createEmptyGroup(currentGroup);
        }
      } else flushGroup_2();
      L.push(msg);
    } else if (toolResultText(msg, group.toolUseIds) && hasBashEditDiff(msg)) {
      let msg_2 = group.messages.at(-1);
      let nt = msg_2 ? toolCallOf_3(msg_2) : [];
      let pt = new Set(
        msg.type === "user"
          ? msg.message.content.flatMap((yt) => (yt.type === "tool_result" ? [yt.tool_use_id] : []))
          : [],
      );
      let Et =
        group.messages.length === 1 &&
        (group.hookCount > 0 ||
          (group.relevantMemories?.length ?? 0) > 0 ||
          (group.accountMemoryRecalls?.length ?? 0) > 0);
      if (msg_2 && !Et && nt.length > 0 && nt.every((yt) => pt.has(yt))) {
        group.messages.pop();
        let toolInfo = getToolCollapseInfoCached(msg_2, tools);
        let gt = toolInfo?.toolUseCount ?? countToolUses(msg_2);
        if (isFullscreenEnvEnabled() && toolInfo?.isBash)
          group.bashCount = Math.max(0, (group.bashCount ?? 0) - gt);
        else if (toolInfo?.isList) group.listCount = Math.max(0, group.listCount - gt);
        else if (toolInfo?.isSearch) group.searchCount = Math.max(0, group.searchCount - gt);
        else if ((toolInfo?.readPaths?.length ?? 0) === 0)
          group.readOperationCount = Math.max(0, group.readOperationCount - gt);
        for (let filePath of nt) {
          group.toolUseIds.delete(filePath);
          group.bashCommands?.delete(filePath);
        }
        if (group.messages.length > 0) {
          flushGroup_2();
          L.push(msg_2);
        } else {
          L.push(msg_2);
          flushGroup();
          group = createEmptyGroup(currentGroup);
        }
      } else flushGroup_2();
      L.push(msg);
    } else if (toolResultText(msg, group.toolUseIds)) {
      group.messages.push(msg);
      if (currentGroup && group.bashCommands?.size) scanBashResultForGitOps(msg, group);
    } else if (group.messages.length > 0 && isPreToolHookSummary(msg)) {
      let { hookCount, hookInfos, totalDurationMs } = normalizeHookSummary(msg);
      group.hookCount += hookCount;
      group.hookTotalMs += totalDurationMs ?? hookInfos.reduce((sum, yt) => sum + (yt.durationMs ?? 0), 0);
      group.hookInfos.push(...hookInfos);
    } else if (
      group.messages.length > 0 &&
      msg.type === "attachment" &&
      msg.attachment.type === "relevant_memories"
    ) {
      group.relevantMemories ??= [];
      group.relevantMemories.push(...msg.attachment.memories);
    } else if (
      group.messages.length > 0 &&
      msg.type === "attachment" &&
      msg.attachment.type === "account_memory_recall"
    ) {
      group.accountMemoryReadKeys ??= new Set();
      for (let file of msg.attachment.files) group.accountMemoryReadKeys.add(normalizeServerPath(file.path));
      group.accountMemoryRecalls ??= [];
      group.accountMemoryRecalls.push({
        paths: msg.attachment.files.map((file) => file.path),
        content: msg.attachment.content,
      });
    } else if (
      msg.type === "attachment" &&
      msg.attachment.type === "relevant_memories" &&
      isFollowedByMemoryRecall(messages, start_3)
    )
      Se = msg.attachment.memories;
    else if (
      Se !== undefined &&
      msg.type === "attachment" &&
      msg.attachment.type === "account_memory_recall"
    ) {
      L.push({
        ...msg,
        attachment: {
          ...msg.attachment,
          localRecall: Se,
        },
      });
      Se = undefined;
    } else if (isMessageBreakPoint(msg) || (ze !== undefined && isSignedThinkingMessage(ze.message))) {
      flushGroup_2();
      L.push(msg);
    } else if (ze !== undefined) {
      let Je = (ze.memo.summary ??= collapseWhitespace_2(stripAnsiPerLine(ze.memo.thinking)));
      if (Je) group.latestThinkingSummary = Je;
      if (prevTimestamp !== undefined) {
        let nt = Date.parse(msg.timestamp) - Date.parse(prevTimestamp);
        if (Number.isFinite(nt) && nt > 0) group.thoughtForMs += Math.min(nt, MAX_LOGGED_THOUGHT_MS);
      }
      group.messages.push(ze.message);
    } else if (shouldSkipMessage(msg) || isPlaceholderAssistantMessage(msg)) {
      if (group.messages.length > 0) q.push(msg);
      else L.push(msg);
    } else {
      flushGroup_2();
      L.push(msg);
    }
    if ("timestamp" in msg && typeof msg.timestamp === "string") prevTimestamp = msg.timestamp;
  }
  start = messages.length;
  flushGroup_2();
  return L;
}
//@ chunk-e6aww6q8.js:4698662-4698895 layout
/**
 * 去重 hook 权限决定附件：同一 decision 与 hookEvent 只保留第一条。
 */
function dedupeHookPermissionDecisions(e) {
  let n = new Set();
  let r = [];
  for (let s of e) {
    if (s.type === "attachment" && s.attachment.type === "hook_permission_decision") {
      let h = `${s.attachment.decision}:${s.attachment.hookEvent}`;
      if (n.has(h)) continue;
      n.add(h);
    }
    r.push(s);
  }
  return r;
}
//@ chunk-e6aww6q8.js:4698895-4699177 layout
function isUserPromptAttachment(e) {
  if (e.type !== "attachment") return false;
  let attachment = e.attachment;
  if (attachment.type !== "queued_command" || attachment.commandMode !== "prompt") return false;
  let origin = attachment.origin;
  if (!attachment.isMeta && isHumanOrAutoContinuation(origin)) return true;
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
function isPeerQueuedCommand(e) {
  if (e.type !== "attachment" || e.attachment.type !== "queued_command") return false;
  let origin = e.attachment.origin;
  return isPeerOrObserver(origin) || origin?.kind === "coordinator";
}
//@ chunk-e6aww6q8.js:4699460-4699620 placement
function hasVisibleMailbox(e) {
  return (
    e.type === "attachment" &&
    e.attachment.type === "teammate_mailbox" &&
    Array.isArray(e.attachment.messages) &&
    visibleTeammateMailboxMessages(e.attachment.messages).length > 0
  );
}
//@ chunk-e6aww6q8.js:4699620-4699754 placement
function isMemoryContextAttachment(e) {
  return (
    e?.type === "attachment" &&
    (e.attachment.type === "relevant_memories" || e.attachment.type === "cowork_memory_context")
  );
}
//@ chunk-e6aww6q8.js:4699754-4699968 placement
function isFollowedByMemoryRecall(e, start) {
  for (let idx = start + 1; idx < e.length; idx++) {
    let s = e[idx];
    if (s.type !== "attachment") return false;
    if (s.attachment.type === "account_memory_recall") return true;
    if (s.attachment.type !== "cowork_memory_context") return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:4699968-4700022 placement
/**
 * 判断该附件是否构成消息断点（用户提示、任务通知、队友排队命令或有可见邮箱）。
 */
function isMessageBreakPoint(msg) {
  return (
    isUserPromptAttachment(msg) ||
    isTaskNotificationAttachment(msg) ||
    isPeerQueuedCommand(msg) ||
    hasVisibleMailbox(msg)
  );
}
//@ chunk-e6aww6q8.js:4700022-4700121 placement
function isCollapsibleToolResult(e) {
  if (e.type === "user") return e.message.content[0]?.type !== "tool_result";
  return isUserPromptAttachment(e);
}
//@ chunk-e6aww6q8.js:4708167-4709111 fingerprint = getSearchReadSummaryText (0.974)
/**
 * 生成搜索/读取折叠摘要文本（进行时或过去时），包含记忆检索/读取/写入次数。
 */
function getSearchReadSummaryText(searchCount, readCount, isActive, memoryCounts, h = 0) {
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
  if (h > 0) {
    let listVerb = isActive
      ? parts.length === 0
        ? "Listing"
        : "listing"
      : parts.length === 0
        ? "Listed"
        : "listed";
    parts.push(`${listVerb} ${h} ${h === 1 ? "directory" : "directories"}`);
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
