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
import { SPe } from "../memdir/teamMemPrompts.js";
import { FILE_WRITE_TOOL_NAME } from "../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../tools/FileEditTool/constants.js";
import { REMOTE_DEVICES, $Oe } from "../services/mcp/firstPartyServerIds.js";
import { HEARTHBOT } from "../services/mcp/ccrMetaMcp.js";
import { Zki } from "../services/analytics/metadata.js";
import {
  isMemoryOrSessionFile,
  isMemoryDirectory,
  isAutoManagedMemoryPattern,
  isShellCommandTargetingMemory,
} from "./memoryFileDetection.js";
import { truncateToLength, Dr } from "./stringUtils.js";
import { findToolByName } from "../Tool.js";
import { getFileAndShellTools } from "../tools.js";
import { S4 } from "../tools/REPLTool/constants.js";
import { TODO_TOOL_NAMES } from "./model/legacyModelNames.js";
import { isFullscreenEnvEnabled } from "./fullscreen.js";
import { TOOL_SEARCH_TOOL_NAME } from "../tools/ToolSearchTool/prompt.js";
import { EN } from "../services/mcp/mcpClientCapabilities.js";
import { MCP_CLAUDE_TEST_WRITE } from "../plugins/bundled/claudeTest/constants.js";
import { deviceToolDisplayInfo, hwt, bashCommentTitle } from "./toolUseDisplay.js";
import { Vt } from "./agentId.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_2 } from "./shell/shellToolUtils.js";
import { Pf } from "./untrustedValues.js";
import { ONe } from "../services/accountMemory/accountMemoryServer.js";
import { countEditLines } from "../tools/AgentTool/agentLaunch.js";
import { toolCallOf_3, toolResultText } from "../components/messageActions.js";
import { ltt } from "./messages/apiNormalization.js";
import { NO_CONTENT_MESSAGE, NO_RESPONSE_REQUESTED } from "../constants/messages.js";
import { detectGitOperation } from "../tools/shared/gitOperationTracking.js";
import { logForDebugging } from "./debug.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { mwr } from "./cwd.js";
import { getDisplayPath } from "./file.js";
import { normalizeHookSummary } from "./collapseHookSummaries.js";
import { qa } from "./stripAnsi.js";
import { isHumanOrAutoContinuation, isPeerOrObserver } from "./messageProvenance.js";
import { visibleTeammateMailboxMessages } from "./teammateMailbox.js";
import { appendTeamMemorySummaryParts } from "./teamMemoryOps.js";

//@ chunk-e6aww6q8.js:4677066-4677123 placement
function O2n(e) {
  if (e.path && SPe(e.path)) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4677123-4677220 placement
function getFilePathFromToolInput(e, n) {
  if (e !== FILE_WRITE_TOOL_NAME && e !== FILE_EDIT_TOOL_NAME) return !1;
  let r = n.file_path ?? n.path;
  return r !== void 0 && SPe(r);
}
//@ chunk-e6aww6q8.js:4679035-4679333 placement = getSessionFileTypeFromInput (0.767)
function getSessionFileTypeFromInput_2(e) {
  if (typeof e !== "object" || e === null) return {};
  let {
    file_path: file_path,
    path: path,
    pattern: pattern,
    glob: glob,
    command: command,
    query: query,
    content: content,
  } = e;
  return {
    ...(c5(file_path) && { file_path: file_path }),
    ...(c5(path) && { path: path }),
    ...(c5(pattern) && { pattern: pattern }),
    ...(c5(glob) && { glob: glob }),
    ...(c5(command) && { command: command }),
    ...(c5(query) && { query: query }),
    ...(typeof content === "string" && { content: content }),
  };
}
//@ chunk-e6aww6q8.js:4679333-4679396 placement
function c5(e) {
  return typeof e === "string" && !e.includes("\x00");
}
//@ chunk-e6aww6q8.js:4679396-4679409 layout
var Cie = null;
//@ chunk-e6aww6q8.js:4679409-4679634 layout
var ARTIFACT_TOOL_NAME = require("./chunk-ecvm5qmk.js").ARTIFACT_TOOL_NAME,
  mapped_5 = [REMOTE_DEVICES, HEARTHBOT, "webagent", ...Zki].map($Oe),
  isPublishShapedArtifactAction = require("./chunk-ecvm5qmk.js").isPublishShapedArtifactAction,
  QTs = () => require("./chunk-nrmn01d7.js").isScratchpadDisplayPath;
//@ chunk-e6aww6q8.js:4679634-4679677 layout
function Dpt(e) {
  return e.file_path ?? e.path;
}
//@ chunk-e6aww6q8.js:4679677-4679819 fingerprint = isMemorySearch (1)
function isMemorySearch(toolInput) {
  if (toolInput.path) {
    if (isMemoryOrSessionFile(toolInput.path) || isMemoryDirectory(toolInput.path)) return !0;
  }
  if (toolInput.glob && isAutoManagedMemoryPattern(toolInput.glob)) return !0;
  if (toolInput.command && isShellCommandTargetingMemory(toolInput.command)) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4679819-4679902 layout
function isArtifactReadOrWrite(e, n) {
  if (e !== FILE_WRITE_TOOL_NAME && e !== FILE_EDIT_TOOL_NAME) return !1;
  let r = Dpt(n);
  return r !== void 0 && isMemoryOrSessionFile(r);
}
//@ chunk-e6aww6q8.js:4679902-4679988 layout
function isScratchpadReadOrWrite(e, n) {
  if (e !== FILE_WRITE_TOOL_NAME && e !== FILE_EDIT_TOOL_NAME) return !1;
  let r = Dpt(n);
  return r !== void 0 && QTs()(r);
}
//@ chunk-e6aww6q8.js:4679988-4680011 layout
var MAX_COLLAPSED_LABEL_CHARS = 300,
  jWr = 600000;
//@ chunk-e6aww6q8.js:4680011-4680070 layout
function truncateCollapsedLabel(e) {
  return e.length > MAX_COLLAPSED_LABEL_CHARS
    ? truncateToLength(e, MAX_COLLAPSED_LABEL_CHARS - 1) + "\u2026"
    : e;
}
//@ chunk-e6aww6q8.js:4680070-4680104 layout
function formatCollapsedLabel(e) {
  return truncateCollapsedLabel(Dr(e));
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
      .map((r) => Dr(r))
      .filter((r) => r !== "").join(`
`);
  return truncateCollapsedLabel(cleaned);
}
//@ chunk-e6aww6q8.js:4680204-4680250 layout
function findToolByNameWithFallback(e, n) {
  return findToolByName(e, n) ?? findToolByName(getFileAndShellTools(), n);
}
/**
 * 判断一个工具调用是否属于可折叠的搜索或读取，并返回其描述信息。
 */
//@ chunk-e6aww6q8.js:4680250-4682131 fingerprint = getToolSearchOrReadInfo (0.669)
function getToolSearchOrReadInfo(toolName, toolInput, tools) {
  if (S4(toolName))
    return {
      isCollapsible: !0,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !0,
      isMemoryWrite: !1,
      isScratchpadWrite: !1,
      isAbsorbedSilently: !0,
    };
  let s =
    toolName === FILE_WRITE_TOOL_NAME || toolName === FILE_EDIT_TOOL_NAME
      ? getSessionFileTypeFromInput_2(toolInput)
      : {};
  if (isArtifactReadOrWrite(toolName, s))
    return {
      isCollapsible: !0,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !1,
      isMemoryWrite: !0,
      isScratchpadWrite: !1,
      isAbsorbedSilently: !1,
    };
  if (isScratchpadReadOrWrite(toolName, s))
    return {
      isCollapsible: !0,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !1,
      isMemoryWrite: !1,
      isScratchpadWrite: !0,
      isAbsorbedSilently: !1,
    };
  let included = TODO_TOOL_NAMES.includes(toolName);
  if ((isFullscreenEnvEnabled() && toolName === TOOL_SEARCH_TOOL_NAME) || included)
    return {
      isCollapsible: !0,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !1,
      isMemoryWrite: !1,
      isScratchpadWrite: !1,
      isAbsorbedSilently: !0,
      popsOutOnError: included,
    };
  let y = findToolByNameWithFallback(tools, toolName),
    w = (y?.mcpInfo !== void 0 && EN.minted(y.mcpInfo.serverName)) || y?.uiTableKey === MCP_CLAUDE_TEST_WRITE;
  if (y?.isMcp && !w)
    return {
      isCollapsible: !0,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !1,
      isMemoryWrite: !1,
      isScratchpadWrite: !1,
      isAbsorbedSilently: !1,
      ...{ mcpCallLabel: y.mcpInfo?.serverName },
    };
  let L = y === void 0 ? deviceToolDisplayInfo(toolName) : void 0,
    G = L && Vt(L.serverName) !== null ? "MCP" : L?.serverName,
    q = $Oe(G ?? "");
  if (L !== void 0 && G !== void 0 && !mapped_5.some((Ee) => q.startsWith(Ee)))
    return {
      isCollapsible: !0,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !1,
      isMemoryWrite: !1,
      isScratchpadWrite: !1,
      isAbsorbedSilently: !1,
      mcpCallLabel: G,
      ...(Cie?.isMemorySaveCall(L) && {
        memorySave: Cie.memorySaveOf(L.toolName, getSessionFileTypeFromInput_2(toolInput)),
      }),
    };
  if (!y?.isSearchOrReadCommand)
    return {
      isCollapsible: !1,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !1,
      isMemoryWrite: !1,
      isScratchpadWrite: !1,
      isAbsorbedSilently: !1,
    };
  if (hwt(y, toolInput) !== void 0)
    return {
      isCollapsible: !1,
      isSearch: !1,
      isRead: !1,
      isList: !1,
      isREPL: !1,
      isMemoryWrite: !1,
      isScratchpadWrite: !1,
      isAbsorbedSilently: !1,
    };
  let result = y.isSearchOrReadCommand(toolInput ?? {}),
    Se = result.isList ?? !1,
    ke = result.isSearch || result.isRead || Se,
    included_2 = SHELL_TOOL_NAMES_2.includes(toolName);
  return {
    isCollapsible: ke || (isFullscreenEnvEnabled() ? included_2 : !1),
    isSearch: result.isSearch,
    isRead: result.isRead,
    isList: Se,
    isREPL: !1,
    isMemoryWrite: !1,
    isScratchpadWrite: !1,
    isAbsorbedSilently: !1,
    isBash: isFullscreenEnvEnabled() ? !ke && included_2 : void 0,
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
var ovs = 20;
/**
 * 安全地从工具输入中取出 path 字段（字符串或字符串数组，只读自有数据属性、限数量），规范化后返回。
 */
//@ chunk-e6aww6q8.js:4682576-4683047 layout
function toolInputPaths(e) {
  if (typeof e !== "object" || e === null || Pf(e)) return [];
  let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, "path");
  if (!ownPropertyDescriptor || !("value" in ownPropertyDescriptor)) return [];
  let r = ownPropertyDescriptor.value;
  if (typeof r === "string") return [ONe(r)];
  if (r === null || typeof r !== "object" || Pf(r) || !Array.isArray(r)) return [];
  let s = r.length;
  if (!Number.isSafeInteger(s)) return [];
  let h = [];
  for (let y = 0; y < s && y < ovs; y++) {
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, y);
    if (
      ownPropertyDescriptor &&
      "value" in ownPropertyDescriptor &&
      typeof ownPropertyDescriptor.value === "string"
    )
      h.push(ONe(ownPropertyDescriptor.value));
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
/**
 * 按工具调用缓存折叠信息（工具表不变时复用）。
 */
//@ chunk-e6aww6q8.js:4683236-4683457 layout
function getToolCollapseInfoCached(e, n) {
  let r = weakMap_17.get(e);
  if (r?.tools === n) return r.info;
  let s = toolCallOf(e),
    h = s === null ? void 0 : findToolByNameWithFallback(n, s);
  if (r && h === r.resolvedTool) return ((r.tools = n), r.info);
  let y = getCollapsibleToolInfo(e, n);
  return (weakMap_17.set(e, { tools: n, resolvedTool: h, info: y }), y);
}
//@ chunk-e6aww6q8.js:4683457-4685204 callgraph-fingerprint = getCollapsibleToolInfo (0.157)
function getCollapsibleToolInfo(msg, tools) {
  let r = null;
  if (msg.type === "assistant") {
    let content = msg.message.content[0],
      info = getSearchOrReadFromContent(content, tools);
    if (info && content?.type === "tool_use")
      r = {
        name: content.name,
        input: getSessionFileTypeFromInput_2(content.input),
        ...info,
        memorySave: msg.cloudMemoryToolUseIds?.includes(content.id) ? info.memorySave : void 0,
      };
  } else if (msg.type === "grouped_tool_use") {
    let firstContent = msg.messages[0]?.message.content[0],
      info = getSearchOrReadFromContent(
        firstContent ? { type: "tool_use", name: msg.toolName, input: firstContent.input } : void 0,
        tools,
      );
    if (info && firstContent?.type === "tool_use")
      r = {
        name: msg.toolName,
        input: getSessionFileTypeFromInput_2(firstContent.input),
        ...info,
        memorySave: void 0,
      };
  }
  if (!r) return null;
  let { command: command, query: query, pattern: pattern } = r.input,
    S = null,
    w = [],
    L = "",
    G = !1,
    q = null;
  if (r.isMemoryWrite) G = getFilePathFromToolInput(r.name, r.input);
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
  } else if (r.memorySave !== void 0);
  else if (r.mcpCallLabel) L = query ? formatCollapsedLabel(query) : "";
  else if (isFullscreenEnvEnabled() && r.isBash) {
    if (command) {
      let Se = bashCommentTitle(command);
      L = Se !== void 0 ? truncateCollapsedLabel(Se) : commandAsHint(command);
    }
  } else if (r.isList) L = command ? commandAsHint(command) : "";
  else if (r.isSearch) {
    if (((q = O2n(r.input) ? "team_memory" : isMemorySearch(r.input) ? "memory" : "other"), q === "other"))
      L = pattern ? formatCollapsedLabel(pattern) : "";
  } else if (
    ((S = getFilePathsFromReadMessage(msg).map((Se) => ({
      path: Se,
      isTeamMem: SPe(Se),
      isAutoManagedMemory: isMemoryOrSessionFile(Se),
    }))),
    S.length === 0)
  )
    L = command ? commandAsHint(command) : "";
  let Z = null;
  if (r.isScratchpadWrite) {
    let Se = 0,
      ke = 0,
      we =
        msg.type === "grouped_tool_use"
          ? msg.messages.map((message) => message.message.content[0])
          : msg.type === "assistant"
            ? [msg.message.content[0]]
            : [];
    for (let Ee of we) {
      if (Ee?.type !== "tool_use") continue;
      let Ae = countEditLines(r.name, Ee.input);
      ((Se += Ae.added), (ke += Ae.removed));
    }
    Z = { added: Se, removed: ke };
  }
  return {
    ...r,
    toolUseIds: toolCallOf_3(msg),
    toolUseCount: countToolUses(msg),
    readPaths: S,
    accountMemoryPaths: w,
    editLines: Z,
    displayHint: L,
    isTeamMemoryWrite: G,
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
      return !0;
    if (FWt(msg)) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:4685367-4685449 layout
function FWt(e) {
  if (e.type !== "assistant") return !1;
  return isSignedThinkingBlock(e.message.content[0]);
}
//@ chunk-e6aww6q8.js:4685449-4685584 layout
function isSignedThinkingBlock(e) {
  if (e === void 0) return !1;
  return e.type === "thinking" && typeof e.thinking === "string" && typeof e.signature === "string" && ltt(e);
}
//@ chunk-e6aww6q8.js:4685584-4685629 layout
function isPlaceholderAssistantText(e) {
  return e.trim() === NO_CONTENT_MESSAGE || e === NO_RESPONSE_REQUESTED;
}
//@ chunk-e6aww6q8.js:4685629-4685742 layout
function isPlaceholderAssistantMessage(e) {
  if (e.type !== "assistant") return !1;
  let n = e.message.content[0];
  return n?.type === "text" && isPlaceholderAssistantText(n.text);
}
//@ chunk-e6aww6q8.js:4685742-4685844 fingerprint = isPreToolHookSummary (1)
function isPreToolHookSummary(msg) {
  return msg.type === "system" && msg.subtype === "stop_hook_summary" && msg.hookLabel === "PreToolUse";
}
/**
 * 折叠搜索/读取组时可跳过的消息：思考块、附件、系统消息。
 */
//@ chunk-e6aww6q8.js:4685844-4686054 fingerprint = shouldSkipMessage (1)
function shouldSkipMessage(msg) {
  if (msg.type === "assistant") {
    let content = msg.message.content[0];
    if (content?.type === "thinking" || content?.type === "redacted_thinking") return !FWt(msg);
  }
  if (msg.type === "attachment") return !0;
  if (msg.type === "system") return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4686054-4686074 sole-consumer
var weakMap_18 = new WeakMap();
//@ chunk-e6aww6q8.js:4686074-4686358 sole-consumer
function visibleThinkingOf(e) {
  if (e.type !== "assistant") return;
  let n = e.message.content[0];
  if (n?.type !== "thinking" || !n.thinking) return;
  let thinking = n.thinking,
    s = weakMap_18.get(e);
  if (s === void 0 || s.thinking !== thinking)
    ((s = { thinking: thinking, blank: thinking.trim() === "", summary: void 0 }), weakMap_18.set(e, s));
  if (s.blank) return;
  return { message: e, memo: s };
}
//@ chunk-e6aww6q8.js:4686358-4686545 sole-consumer = toolCallOf (1)
function toolCallOf_2(msg) {
  if (msg.type === "assistant") return msg.message.content[0]?.type === "tool_use";
  if (msg.type === "grouped_tool_use") return msg.messages[0]?.message.content[0]?.type === "tool_use";
  return !1;
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
    let r = msg.message.content[0];
    if (r?.type === "tool_use") {
      let { file_path: file_path } = getSessionFileTypeFromInput_2(r.input);
      if (file_path) paths.push(file_path);
    }
  } else if (msg.type === "grouped_tool_use")
    for (let message of msg.messages) {
      let s = message.message.content[0];
      if (s?.type === "tool_use") {
        let { file_path: file_path } = getSessionFileTypeFromInput_2(s.input);
        if (file_path) paths.push(file_path);
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
    let { commit: commit, push: push, branch: branch, pr: pr } = detectGitOperation(command, combined);
    if (commit) group.commits?.push(commit);
    if (push) group.pushes?.push(push);
    if (branch) group.branches?.push(branch);
    if (pr) group.prs?.push(pr);
    if (commit || push || branch || pr) group.gitOpBashCount = (group.gitOpBashCount ?? 0) + 1;
  }
}
//@ chunk-e6aww6q8.js:4688048-4688611 fingerprint = createEmptyGroup (0.92)
function createEmptyGroup(e) {
  let n = {
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
    latestDisplayHint: void 0,
    thoughtForMs: 0,
    latestThinkingSummary: void 0,
    hookTotalMs: 0,
    hookCount: 0,
    hookInfos: [],
  };
  if (
    ((n.teamMemorySearchCount = 0),
    (n.teamMemoryReadFilePaths = new Set()),
    (n.teamMemoryWriteCount = 0),
    (n.mcpCallCount = 0),
    (n.mcpCallLabels = new Set()),
    e)
  )
    ((n.bashCount = 0),
      (n.bashCommands = new Map()),
      (n.commits = []),
      (n.pushes = []),
      (n.branches = []),
      (n.prs = []),
      (n.gitOpBashCount = 0));
  return n;
}
//@ chunk-e6aww6q8.js:4688611-4690684 fingerprint = createCollapsedGroup (0.849)
function createCollapsedGroup(e, n) {
  let firstMsg = e.messages[0],
    s = e.readFilePaths.size > 0 ? e.readFilePaths.size : e.readOperationCount,
    toolMemoryReadCount = e.memoryReadFilePaths.size,
    memoryReadCount = toolMemoryReadCount + (e.relevantMemories?.length ?? 0),
    teamMemoryReadFilePaths = e.teamMemoryReadFilePaths,
    nonMemReadFilePaths = [...e.readFilePaths].filter(
      (Se) => !e.memoryReadFilePaths.has(Se) && !(teamMemoryReadFilePaths?.has(Se) ?? !1),
    ),
    L = e.teamMemorySearchCount ?? 0,
    G = e.teamMemoryReadFilePaths?.size ?? 0,
    q = e.teamMemoryWriteCount ?? 0,
    Z = {
      type: "collapsed_read_search",
      searchCount: Math.max(0, e.searchCount - e.memorySearchCount - L),
      readCount: Math.max(0, s - toolMemoryReadCount - G),
      listCount: e.listCount,
      memorySearchCount: e.memorySearchCount,
      memoryReadCount: memoryReadCount,
      memoryWriteCount: e.memoryWriteCount,
      readFilePaths: nonMemReadFilePaths,
      searchArgs: e.nonMemSearchArgs,
      latestDisplayHint: e.latestDisplayHint,
      messages: e.messages,
      displayMessage: firstMsg,
      uuid: `collapsed-${firstMsg.uuid}`,
      timestamp: firstMsg.timestamp,
    };
  if (
    ((Z.teamMemorySearchCount = L),
    (Z.teamMemoryReadCount = G),
    (Z.teamMemoryWriteCount = q),
    (e.accountMemoryReadKeys?.size ?? 0) > 0)
  )
    Z.accountMemoryReadKeys = [...(e.accountMemoryReadKeys ?? [])];
  if ((e.accountMemorySearchCount ?? 0) > 0) Z.accountMemorySearchCount = e.accountMemorySearchCount;
  if ((e.accountMemoryRecalls?.length ?? 0) > 0) Z.accountMemoryRecalls = e.accountMemoryRecalls;
  if ((e.scratchpadWriteCount ?? 0) > 0)
    ((Z.scratchpadWriteCount = e.scratchpadWriteCount),
      (Z.scratchpadLinesAdded = e.scratchpadLinesAdded),
      (Z.scratchpadLinesRemoved = e.scratchpadLinesRemoved));
  if ((e.memorySaves?.size ?? 0) > 0) Z.memorySaves = [...(e.memorySaves?.values() ?? [])];
  if ((e.mcpCallCount ?? 0) > 0)
    ((Z.mcpCallCount = e.mcpCallCount), (Z.mcpCallLabels = [...(e.mcpCallLabels ?? [])]));
  if (n) {
    if ((e.bashCount ?? 0) > 0) ((Z.bashCount = e.bashCount), (Z.gitOpBashCount = e.gitOpBashCount));
    if ((e.commits?.length ?? 0) > 0) Z.commits = e.commits;
    if ((e.pushes?.length ?? 0) > 0) Z.pushes = e.pushes;
    if ((e.branches?.length ?? 0) > 0) Z.branches = e.branches;
    if ((e.prs?.length ?? 0) > 0) Z.prs = e.prs;
  }
  if (e.hookCount > 0)
    ((Z.hookTotalMs = e.hookTotalMs), (Z.hookCount = e.hookCount), (Z.hookInfos = e.hookInfos));
  if (e.relevantMemories && e.relevantMemories.length > 0) Z.relevantMemories = e.relevantMemories;
  if (e.thoughtForMs > 0) Z.thoughtForMs = e.thoughtForMs;
  if (e.latestThinkingSummary !== void 0) Z.latestThinkingSummary = e.latestThinkingSummary;
  return Z;
}
//@ chunk-e6aww6q8.js:4690684-4690695 layout
var z2n = [];
//@ chunk-e6aww6q8.js:4690695-4691105 layout
function getMemorySaveEntries(e, n) {
  if (Cie === null || e.type !== "user" || !n.memorySaves?.size) return z2n;
  let r = [];
  for (let s of e.message.content) {
    let h = s.type === "tool_result" ? n.memorySaves.get(s.tool_use_id) : void 0;
    if (s.type !== "tool_result" || h === void 0) continue;
    let y = e.sharesToolUseResult === !0;
    if (
      ((h.end = y ? "not_stored" : Cie.memorySaveEndOf(s, e.toolUseResult)),
      h.end === "not_stored" && (!y || s.is_error === !0))
    )
      r.push(s.tool_use_id);
  }
  return r;
}
//@ chunk-e6aww6q8.js:4691105-4691481 layout
function hasBashEditDiff(e) {
  if (e.type !== "user") return !1;
  let toolUseResult = e.toolUseResult;
  if (
    typeof toolUseResult !== "object" ||
    toolUseResult === null ||
    !("bashEditDiff" in toolUseResult) ||
    typeof toolUseResult.bashEditDiff !== "object" ||
    toolUseResult.bashEditDiff === null
  )
    return !1;
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
var gvs = 32;
//@ chunk-e6aww6q8.js:4691492-4692234 layout
class IncrementalCollapser {
  #e = [];
  #t = [];
  #n;
  #o = [];
  lastFolded = 0;
  resume(e, n) {
    let r = -1,
      s = this.#n;
    if (
      s !== void 0 &&
      s.tools === n.tools &&
      s.replVerbose === n.replVerbose &&
      s.fullscreenEnv === n.fullscreenEnv &&
      s.cwd === n.cwd
    ) {
      let w = this.#e,
        min = Math.min(w.length, e.length),
        G = 0;
      while (G < min && w[G] === e[G]) G++;
      r = this.#o.findLastIndex((q) => q.inputIndex <= G);
    } else this.#n = n;
    ((this.#o.length = r + 1), (this.#e = e));
    let h = this.#o[r],
      y = h?.inputIndex ?? 0,
      S = h === void 0 ? [] : this.#t.slice(0, h.resultLength);
    return (
      (this.#t = S),
      (this.lastFolded = e.length - y),
      { start: y, result: S, prevTimestamp: h?.prevTimestamp }
    );
  }
  checkpoint(e, n, r) {
    let at = this.#o.at(-1);
    if (at === void 0 || e - at.inputIndex >= gvs)
      this.#o.push({ inputIndex: e, resultLength: n, prevTimestamp: r });
  }
  reset() {
    ((this.#e = []), (this.#t = []), (this.#n = void 0), (this.#o = []), (this.lastFolded = 0));
  }
}
//@ chunk-e6aww6q8.js:4692234-4698662 fingerprint = collapseReadSearchGroups (0.515)
function collapseReadSearchGroups(
  e,
  n,
  { transcriptV2: r = !1, expandRows: s = !1 } = {},
  h = new IncrementalCollapser(),
) {
  if (r) return (h.reset(), e);
  let y = !1;
  if (s) {
    h.reset();
    let Ie = e;
    if (!Ie.some((lt) => lt.type === "attachment" && lt.attachment.type === "hook_permission_decision"))
      return Ie;
    let Me = [],
      We = [],
      ze = new Set();
    for (let lt of Ie) {
      let Je = toolCallOf_2(lt) ? getToolCollapseInfoCached(lt, n) : null;
      if (Je) {
        for (let toolUseId of Je.toolUseIds) ze.add(toolUseId);
        We.push(lt);
      } else if (visibleThinkingOf(lt) !== void 0 && !FWt(lt)) We.push(lt);
      else if (
        We.length > 0 &&
        !isUserPromptAttachment(lt) &&
        (toolResultText(lt, ze) || shouldSkipMessage(lt) || isPlaceholderAssistantMessage(lt))
      )
        We.push(lt);
      else (Me.push(...dedupeHookPermissionDecisions(We), lt), (We = []), ze.clear());
    }
    return (Me.push(...dedupeHookPermissionDecisions(We)), Me);
  }
  let currentGroup = isFullscreenEnvEnabled(),
    resume = h.resume(e, { tools: n, replVerbose: y, fullscreenEnv: currentGroup, cwd: mwr() }),
    L = resume.result,
    G = createEmptyGroup(currentGroup),
    q = [],
    prevTimestamp = resume.prevTimestamp,
    Se,
    { start: start, start: start_2 } = resume;
  function flushGroup() {
    (L.push(...dedupeHookPermissionDecisions(q)), (q = []));
  }
  function Ae() {
    if (G.messages.length === 0) return;
    (L.push(createCollapsedGroup(G, currentGroup)), flushGroup(), (G = createEmptyGroup(currentGroup)));
  }
  for (let start_3 = resume.start; start_3 < e.length; start_3++) {
    let Me = e[start_3];
    if (
      ((start = start_3),
      G.messages.length === 0 &&
        q.length === 0 &&
        Se === void 0 &&
        !isMemoryContextAttachment(e[start_3 - 1]) &&
        start_3 >= start_2)
    )
      h.checkpoint(start_3, L.length, prevTimestamp);
    let We = toolCallOf_2(Me) ? getToolCollapseInfoCached(Me, n) : null,
      ze = We === null ? visibleThinkingOf(Me) : void 0,
      lt = We === null ? getMemorySaveEntries(Me, G) : z2n;
    if (We) {
      G.latestThinkingSummary = void 0;
      let toolUseCount = We.toolUseCount;
      if (We.isMemoryWrite)
        if (We.isTeamMemoryWrite) G.teamMemoryWriteCount = (G.teamMemoryWriteCount ?? 0) + toolUseCount;
        else G.memoryWriteCount += toolUseCount;
      else if (We.isScratchpadWrite) {
        if (((G.scratchpadWriteCount = (G.scratchpadWriteCount ?? 0) + toolUseCount), We.editLines))
          ((G.scratchpadLinesAdded = (G.scratchpadLinesAdded ?? 0) + We.editLines.added),
            (G.scratchpadLinesRemoved = (G.scratchpadLinesRemoved ?? 0) + We.editLines.removed));
        let nt = Dpt(We.input),
          pt = nt ? formatCollapsedLabel(getDisplayPath(nt)) : "";
        if (pt) G.latestDisplayHint = pt;
      } else if (We.isAbsorbedSilently) {
        if (We.popsOutOnError) {
          G.popOutOnErrorIds ??= new Set();
          for (let toolUseId of We.toolUseIds) G.popOutOnErrorIds.add(toolUseId);
        }
      } else if (We.accountMemory === "read") {
        G.accountMemoryReadKeys ??= new Set();
        for (let nt of We.accountMemoryPaths.length > 0 ? We.accountMemoryPaths : We.toolUseIds)
          G.accountMemoryReadKeys.add(nt);
      } else if (We.accountMemory === "search")
        G.accountMemorySearchCount = (G.accountMemorySearchCount ?? 0) + toolUseCount;
      else if (We.memorySave !== void 0) {
        G.memorySaves ??= new Map();
        for (let toolUseId of We.toolUseIds)
          G.memorySaves.set(toolUseId, { ...We.memorySave, id: toolUseId });
      } else if (We.mcpCallLabel) {
        if (
          ((G.mcpCallCount = (G.mcpCallCount ?? 0) + toolUseCount),
          G.mcpCallLabels?.add(We.mcpCallLabel),
          We.displayHint)
        )
          G.latestDisplayHint = `"${We.displayHint}"`;
      } else if (currentGroup && We.isBash) {
        G.bashCount = (G.bashCount ?? 0) + toolUseCount;
        let { command: command } = We.input;
        if (command) {
          G.latestDisplayHint = We.displayHint;
          for (let toolUseId of We.toolUseIds) G.bashCommands?.set(toolUseId, command);
        }
      } else if (We.isList) {
        if (((G.listCount += toolUseCount), We.displayHint)) G.latestDisplayHint = We.displayHint;
      } else if (We.isSearch)
        switch (((G.searchCount += toolUseCount), We.searchTarget)) {
          case "team_memory":
            G.teamMemorySearchCount = (G.teamMemorySearchCount ?? 0) + toolUseCount;
            break;
          case "memory":
            G.memorySearchCount += toolUseCount;
            break;
          case "other":
          case null:
            if (We.displayHint)
              (G.nonMemSearchArgs.push(We.displayHint), (G.latestDisplayHint = `"${We.displayHint}"`));
            break;
        }
      else {
        let nt = We.readPaths ?? [];
        for (let deferred of nt)
          if ((G.readFilePaths.add(deferred.path), deferred.isTeamMem))
            G.teamMemoryReadFilePaths?.add(deferred.path);
          else if (deferred.isAutoManagedMemory) G.memoryReadFilePaths.add(deferred.path);
          else {
            let Et = formatCollapsedLabel(getDisplayPath(deferred.path));
            if (Et) G.latestDisplayHint = Et;
          }
        if (nt.length === 0) {
          if (((G.readOperationCount += toolUseCount), We.displayHint)) G.latestDisplayHint = We.displayHint;
        }
      }
      for (let toolUseId of We.toolUseIds) G.toolUseIds.add(toolUseId);
      G.messages.push(Me);
    } else if (
      toolResultText(Me, G.toolUseIds) &&
      (lt.length > 0 ||
        (Me.type === "user" &&
          Me.message.content.some(
            (Je) => Je.type === "tool_result" && Je.is_error && G.popOutOnErrorIds?.has(Je.tool_use_id),
          )))
    ) {
      let at = G.messages.at(-1),
        nt = at ? toolCallOf_3(at) : [],
        pt = new Set(
          Me.type === "user"
            ? Me.message.content.flatMap((gt) =>
                gt.type === "tool_result" && (gt.is_error || lt.includes(gt.tool_use_id))
                  ? [gt.tool_use_id]
                  : [],
              )
            : [],
        );
      if (
        !(
          (G.hookCount > 0 ||
            (G.relevantMemories?.length ?? 0) > 0 ||
            (G.accountMemoryRecalls?.length ?? 0) > 0) &&
          (lt.length === 0 || G.messages.length === 1)
        ) &&
        nt.length > 0 &&
        nt.every((gt) => pt.has(gt))
      ) {
        G.messages.pop();
        for (let msg of nt) (G.toolUseIds.delete(msg), G.memorySaves?.delete(msg));
        if (G.messages.length > 0) (Ae(), L.push(at));
        else (L.push(at), flushGroup(), (G = createEmptyGroup(currentGroup)));
      } else Ae();
      L.push(Me);
    } else if (toolResultText(Me, G.toolUseIds) && hasBashEditDiff(Me)) {
      let at = G.messages.at(-1),
        nt = at ? toolCallOf_3(at) : [],
        pt = new Set(
          Me.type === "user"
            ? Me.message.content.flatMap((yt) => (yt.type === "tool_result" ? [yt.tool_use_id] : []))
            : [],
        ),
        Et =
          G.messages.length === 1 &&
          (G.hookCount > 0 ||
            (G.relevantMemories?.length ?? 0) > 0 ||
            (G.accountMemoryRecalls?.length ?? 0) > 0);
      if (at && !Et && nt.length > 0 && nt.every((yt) => pt.has(yt))) {
        G.messages.pop();
        let toolInfo = getToolCollapseInfoCached(at, n),
          gt = toolInfo?.toolUseCount ?? countToolUses(at);
        if (isFullscreenEnvEnabled() && toolInfo?.isBash) G.bashCount = Math.max(0, (G.bashCount ?? 0) - gt);
        else if (toolInfo?.isList) G.listCount = Math.max(0, G.listCount - gt);
        else if (toolInfo?.isSearch) G.searchCount = Math.max(0, G.searchCount - gt);
        else if ((toolInfo?.readPaths?.length ?? 0) === 0)
          G.readOperationCount = Math.max(0, G.readOperationCount - gt);
        for (let filePath of nt) (G.toolUseIds.delete(filePath), G.bashCommands?.delete(filePath));
        if (G.messages.length > 0) (Ae(), L.push(at));
        else (L.push(at), flushGroup(), (G = createEmptyGroup(currentGroup)));
      } else Ae();
      L.push(Me);
    } else if (toolResultText(Me, G.toolUseIds)) {
      if ((G.messages.push(Me), currentGroup && G.bashCommands?.size)) scanBashResultForGitOps(Me, G);
    } else if (G.messages.length > 0 && isPreToolHookSummary(Me)) {
      let {
        hookCount: hookCount,
        hookInfos: hookInfos,
        totalDurationMs: totalDurationMs,
      } = normalizeHookSummary(Me);
      ((G.hookCount += hookCount),
        (G.hookTotalMs += totalDurationMs ?? hookInfos.reduce((sum, yt) => sum + (yt.durationMs ?? 0), 0)),
        G.hookInfos.push(...hookInfos));
    } else if (
      G.messages.length > 0 &&
      Me.type === "attachment" &&
      Me.attachment.type === "relevant_memories"
    )
      ((G.relevantMemories ??= []), G.relevantMemories.push(...Me.attachment.memories));
    else if (
      G.messages.length > 0 &&
      Me.type === "attachment" &&
      Me.attachment.type === "account_memory_recall"
    ) {
      G.accountMemoryReadKeys ??= new Set();
      for (let file of Me.attachment.files) G.accountMemoryReadKeys.add(ONe(file.path));
      ((G.accountMemoryRecalls ??= []),
        G.accountMemoryRecalls.push({
          paths: Me.attachment.files.map((file) => file.path),
          content: Me.attachment.content,
        }));
    } else if (
      Me.type === "attachment" &&
      Me.attachment.type === "relevant_memories" &&
      isFollowedByMemoryRecall(e, start_3)
    )
      Se = Me.attachment.memories;
    else if (Se !== void 0 && Me.type === "attachment" && Me.attachment.type === "account_memory_recall")
      (L.push({ ...Me, attachment: { ...Me.attachment, localRecall: Se } }), (Se = void 0));
    else if (JBo(Me) || (ze !== void 0 && FWt(ze.message))) (Ae(), L.push(Me));
    else if (ze !== void 0) {
      let Je = (ze.memo.summary ??= Dr(qa(ze.memo.thinking)));
      if (Je) G.latestThinkingSummary = Je;
      if (prevTimestamp !== void 0) {
        let nt = Date.parse(Me.timestamp) - Date.parse(prevTimestamp);
        if (Number.isFinite(nt) && nt > 0) G.thoughtForMs += Math.min(nt, jWr);
      }
      G.messages.push(ze.message);
    } else if (shouldSkipMessage(Me) || isPlaceholderAssistantMessage(Me))
      if (G.messages.length > 0) q.push(Me);
      else L.push(Me);
    else (Ae(), L.push(Me));
    if ("timestamp" in Me && typeof Me.timestamp === "string") prevTimestamp = Me.timestamp;
  }
  return ((start = e.length), Ae(), L);
}
/**
 * 去重 hook 权限决定附件：同一 decision 与 hookEvent 只保留第一条。
 */
//@ chunk-e6aww6q8.js:4698662-4698895 layout
function dedupeHookPermissionDecisions(e) {
  let n = new Set(),
    r = [];
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
  if (e.type !== "attachment") return !1;
  let attachment = e.attachment;
  if (attachment.type !== "queued_command" || attachment.commandMode !== "prompt") return !1;
  let origin = attachment.origin;
  if (!attachment.isMeta && isHumanOrAutoContinuation(origin)) return !0;
  if (origin?.kind === "channel") return !0;
  if (origin?.kind === "peer") return !0;
  if (origin?.kind === "slack-ping") return !0;
  return !1;
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
  if (e.type !== "attachment" || e.attachment.type !== "queued_command") return !1;
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
function isFollowedByMemoryRecall(e, n) {
  for (let r = n + 1; r < e.length; r++) {
    let s = e[r];
    if (s.type !== "attachment") return !1;
    if (s.attachment.type === "account_memory_recall") return !0;
    if (s.attachment.type !== "cowork_memory_context") return !1;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:4699968-4700022 placement
function JBo(e) {
  return (
    isUserPromptAttachment(e) ||
    isTaskNotificationAttachment(e) ||
    isPeerQueuedCommand(e) ||
    hasVisibleMailbox(e)
  );
}
//@ chunk-e6aww6q8.js:4700022-4700121 placement
function isCollapsibleToolResult(e) {
  if (e.type === "user") return e.message.content[0]?.type !== "tool_result";
  return isUserPromptAttachment(e);
}
/**
 * 生成搜索/读取折叠摘要文本（进行时或过去时），包含记忆检索/读取/写入次数。
 */
//@ chunk-e6aww6q8.js:4708167-4709111 fingerprint = getSearchReadSummaryText (0.974)
function getSearchReadSummaryText(searchCount, readCount, isActive, memoryCounts, h = 0) {
  let parts = [];
  if (memoryCounts) {
    let {
      memorySearchCount: memorySearchCount,
      memoryReadCount: memoryReadCount,
      memoryWriteCount: memoryWriteCount,
    } = memoryCounts;
    if (memoryReadCount > 0) {
      let q = isActive
        ? parts.length === 0
          ? "Recalling"
          : "recalling"
        : parts.length === 0
          ? "Recalled"
          : "recalled";
      parts.push(`${q} ${memoryReadCount} ${memoryReadCount === 1 ? "memory" : "memories"}`);
    }
    if (memorySearchCount > 0) {
      let q = isActive
        ? parts.length === 0
          ? "Searching"
          : "searching"
        : parts.length === 0
          ? "Searched"
          : "searched";
      parts.push(`${q} memories`);
    }
    if (memoryWriteCount > 0) {
      let q = isActive
        ? parts.length === 0
          ? "Writing"
          : "writing"
        : parts.length === 0
          ? "Wrote"
          : "wrote";
      parts.push(`${q} ${memoryWriteCount} ${memoryWriteCount === 1 ? "memory" : "memories"}`);
    }
    appendTeamMemorySummaryParts(memoryCounts, isActive, parts);
  }
  if (searchCount > 0) {
    let w = isActive
      ? parts.length === 0
        ? "Searching for"
        : "searching for"
      : parts.length === 0
        ? "Searched for"
        : "searched for";
    parts.push(`${w} ${searchCount} ${searchCount === 1 ? "pattern" : "patterns"}`);
  }
  if (readCount > 0) {
    let w = isActive ? (parts.length === 0 ? "Reading" : "reading") : parts.length === 0 ? "Read" : "read";
    parts.push(`${w} ${readCount} ${readCount === 1 ? "file" : "files"}`);
  }
  if (h > 0) {
    let w = isActive
      ? parts.length === 0
        ? "Listing"
        : "listing"
      : parts.length === 0
        ? "Listed"
        : "listed";
    parts.push(`${w} ${h} ${h === 1 ? "directory" : "directories"}`);
  }
  let text = parts.join(", ");
  return isActive ? `${text}\u2026` : text;
}
/**
 * 最近活动摘要：末尾连续的搜索/读取工具调用 ≥2 次时生成“Searched N, read M”类文本，否则取最后一条活动描述。
 */
//@ chunk-e6aww6q8.js:4709111-4709381 fingerprint = summarizeRecentActivities (1)
function summarizeRecentActivities(activities) {
  if (activities.length === 0) return;
  let searchCount = 0,
    readCount = 0;
  for (let h = activities.length - 1; h >= 0; h--) {
    let activity = activities[h];
    if (activity.isSearch) searchCount++;
    else if (activity.isRead) readCount++;
    else break;
  }
  if (searchCount + readCount >= 2) return getSearchReadSummaryText(searchCount, readCount, !0);
  for (let h = activities.length - 1; h >= 0; h--)
    if (activities[h]?.activityDescription) return activities[h].activityDescription;
  return;
}

export {
  isUserPromptAttachment,
  isCollapsibleToolResult,
  shouldSkipMessage,
  isTextBreaker,
  isPlaceholderAssistantMessage,
  FWt,
  Cie,
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
  JBo,
  getDisplayMessageFromCollapsed,
  jWr,
};
