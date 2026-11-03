/**
 * tools/stubTools/enableStubTools.ts
 *
 * 2.1.316 新增："enable__mcp__…"占位工具：能力（Chrome、远程浏览器/电脑）未加载时提示模型先启用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tkqbtg0j.js (10)
 * attribution: placement 10
 */
import { TOOL_SEARCH_TOOL_NAME } from "../ToolSearchTool/prompt.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { CLAUDE_IN_CHROME_MCP_SERVER_NAME } from "../../utils/claudeInChrome/common.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { looseObject, unknown, u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { getTeleportRelayEnvConfig } from "../../utils/teleport/relayEnv.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isCcsRemoteCowork, isClaudeAiChatOrigin } from "../../utils/entrypointKinds.js";
import { getMcpPrefix } from "../../services/mcp/mcpStringUtils.js";
import {
  getTeleportCacheState,
  revertTeleportCache,
  recordEnableStubCall,
  chromeSwitchNote,
} from "../../services/teleport/relayState.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { isChromeToolName, isBrowserPreviewToolName } from "../../utils/claudeInChrome/chromeToolNames.js";
import { isClaudeInChromeAllowed } from "../../utils/claudeInChrome/setup.js";
import { isChromeServerPolicyDenied } from "../../utils/claudeInChrome/serverPolicy.js";
import { logError } from "../../utils/log.js";

//@ chunk-tkqbtg0j.js:12104-26294 placement
/**
 * “启用 Browser”占位工具的名。
 */
var ENABLE_CHROME_TOOL_NAME = "enable__mcp__claude-in-chrome";
var ENABLE_BROWSER_TOOL_NAME = "enable__mcp__remote-devices__Claude_Browser";
var ENABLE_MCP_REMOTE_DEVICES_COMPUTER = "enable__mcp__remote-devices__computer";
var REQUEST_COMPUTER = "request_computer";
var ENABLE_CHROME_DESCRIPTION =
  "Enable Claude in Chrome, the Claude extension in the Chrome browser on the user's own computer, for this conversation. If you already have tools whose names contain claude-in-chrome__ or Claude_in_Chrome__, use those directly instead of calling this. Otherwise call it once, before any other Claude in Chrome tool, when the user asks you to do something in their browser or on a website that needs their own sign-in, or explicitly asks for Claude in Chrome. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.";
var ENABLE_CHROME_SHARED_DESCRIPTION =
  "Enable Claude in Chrome, the Claude extension in the Chrome browser on the user's own computer, for this conversation. If you already have tools whose names contain claude-in-chrome__ or Claude_in_Chrome__, use those directly instead of calling this. Otherwise call it once, before any other Claude in Chrome tool, when the user asks you to do something in their browser or on a website that needs their own sign-in, when a step in a skill or task the user asked you to carry out needs their browser or such a website, or when the user explicitly asks for Claude in Chrome. If the tools it turns on, or the tools for files on that computer, are missing from your tool list, calling it is how they are added, possibly a turn later. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.";
var ENABLE_BROWSER_DESCRIPTION =
  "Enable the browser built into the Claude desktop app on the user's computer for this conversation. If you already have tools whose names contain Claude_Browser__, use those directly instead of calling this. Otherwise call it once, before any other Claude app browser tool, when the user asks you to do something in the Claude app's own browser or on a website that needs their own sign-in, or explicitly asks for that browser. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.";
var ENABLE_BROWSER_SHARED_DESCRIPTION =
  "Enable the browser built into the Claude desktop app on the user's computer for this conversation. If you already have tools whose names contain Claude_Browser__, use those directly instead of calling this. Otherwise call it once, before any other Claude app browser tool, when the user asks you to do something in the Claude app's own browser or on a website that needs their own sign-in, when a step in a skill or task the user asked you to carry out needs that browser or such a website, or when the user explicitly asks for that browser. If the tools it turns on, or the tools for files on that computer, are missing from your tool list, calling it is how they are added, possibly a turn later. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.";
var ENABLE_TOOL_INPUT_SCHEMA = {
  type: "object",
  properties: {
    task: {
      type: "string",
      description: "Optional: what you are about to do in the browser, in one or two sentences.",
    },
  },
  additionalProperties: false,
};
var ENABLE_CHROME_RESULT = `Any of them that was announced as available through ${TOOL_SEARCH_TOOL_NAME} must be loaded before you call it, unless ${TOOL_SEARCH_TOOL_NAME} has loaded it since`;
var ENABLE_CHROME_RESULT_2 = `${ENABLE_CHROME_RESULT}: load the ones you expect to need in one ${TOOL_SEARCH_TOOL_NAME} call (for example, query "select:<name>[,<name>...]"), and use them once that result has come back, not in the same reply`;
var ENABLE_TOOL_OUTPUT_SCHEMA =
  "If no tool with such a name is in your list or was announced, or you have since been told that they are no longer available, do not call or load one. That applies to those tools only.";
var ENABLE_CHROME_RESULT_3 = `Claude in Chrome needs no enabling: its tools are the ones whose names contain claude-in-chrome or Claude_in_Chrome. ${ENABLE_CHROME_RESULT_2}. ${ENABLE_TOOL_OUTPUT_SCHEMA} If you have no browser tool of any kind, tell the user in one plain sentence that you can't use Claude in Chrome in this chat right now, and continue with what you can do here. You don't know the cause: don't say that Chrome or its extension isn't connected, and suggest no steps or settings for Claude in Chrome.`;
var ENABLE_BROWSER_RESULT = `The Claude desktop app's built-in browser needs no enabling: its tools are the ones whose names contain Claude_Browser. ${ENABLE_CHROME_RESULT_2}. ${ENABLE_TOOL_OUTPUT_SCHEMA} If you have no browser tool of any kind, tell the user that the browser in their Claude desktop app is not available in this chat right now and continue with what you can do here.`;
var ENABLE_COMPUTER_DESCRIPTION =
  "Enable computer use on the user's own computer for this conversation, so you can see its screen and work in its applications (take screenshots, click, type, scroll, open apps). If you already have tools whose names start with mcp__remote-devices__computer_, use those directly instead of calling this. Otherwise call it once, before any other computer-use tool, when the user asks you to do something in an application on their computer, or explicitly asks you to use their computer or their screen. Do not call it for questions you can answer from the conversation or with web search, for work that only needs their web browser, or merely because a request mentions an application.";
var ENABLE_COMPUTER_SHARED_DESCRIPTION =
  "Enable computer use on the user's own computer for this conversation, so you can see its screen and work in its applications (take screenshots, click, type, scroll, open apps). If you already have tools whose names start with mcp__remote-devices__computer_, use those directly instead of calling this. Otherwise call it once, before any other computer-use tool, when the user asks you to do something in an application on their computer, when a step in a skill or task the user asked you to carry out needs an application on their computer, or when the user explicitly asks you to use their computer or their screen. If the tools it turns on, or the tools for files on that computer, are missing from your tool list, calling it is how they are added, possibly a turn later. Do not call it for questions you can answer from the conversation or with web search, for work that only needs their web browser, or merely because a request mentions an application.";
var ENABLE_COMPUTER_INPUT_SCHEMA = {
  type: "object",
  properties: {
    task: {
      type: "string",
      description: "Optional: what you are about to do on the computer, in one or two sentences.",
    },
  },
  additionalProperties: false,
};
var ENABLE_COMPUTER_OUTPUT_SCHEMA = `mcp__${REMOTE_DEVICES}__computer_`;
var ENABLE_COMPUTER_RESULT = `The computer-use tools are the ${ENABLE_COMPUTER_OUTPUT_SCHEMA} tools; there is no separate enable step. ${ENABLE_CHROME_RESULT}: load them all in one ${TOOL_SEARCH_TOOL_NAME} call (query "${ENABLE_COMPUTER_OUTPUT_SCHEMA}", max_results 100), and use them once that result has come back, not in the same reply. Try the user's request with them, asking for access to the applications you need first, the way those tools describe. Don't tell the user their computer is connected until a call to one of them has succeeded; if calls keep not responding, the Claude app on the user's computer isn't answering: it may be closed or the computer asleep. Tell the user that, ask them to open the Claude app on that computer, and carry on with what you can do here. If you have no such tools here, tell the user that computer use isn't available on their computer right now and that the Claude app on that computer may show why in the Computer use section of its Settings, then continue with what you can do here. Don't say a permission was denied unless a result says so.`;
var SWITCHED_OFF_NOTE = `If the request is about files or folders on the user's computer and you have device tools here (loaded or through tool search), such as mcp__${REMOTE_DEVICES}__device_list_dir, use them for that part; if it is and you have none, tell the user that files on their computer can't be reached right now.`;
var ENABLE_REMOTE_DEVICES_DESCRIPTION =
  "Does nothing. This tool cannot connect a computer here. Tools whose names start with mcp__remote-devices__, if you have any, run on the user's computer; use whichever of them fits the task.";
var ENABLE_REMOTE_DEVICES_RESULT = `This call did not connect a computer, and no tool here can. Tools whose names start with mcp__${REMOTE_DEVICES}__, if you have any, run on the user's computer; use whichever of them fits the task, loading it with ${TOOL_SEARCH_TOOL_NAME} first, and waiting for that result, if it was only announced as available there and has not been loaded since. Otherwise carry on with the tools you have here, and if the task needs the user's computer, tell the user so.`;
var ENABLE_TOOL_FAILURE_TEXT = `This chat isn't linked to a computer right now, and no tool here can link one, including ${REQUEST_COMPUTER} and the tools whose names start with enable__. That is a normal state, not an outage or a connection problem, so while you have no tools that run on the user's computer there is no point looking or waiting for them. The link can change during the conversation: if such tools (their names start with mcp__${REMOTE_DEVICES}__ or mcp__${CLAUDE_IN_CHROME_MCP_SERVER_NAME}__) are later in your tool list or announced to you, use them, whatever this result says. When your reply ends, the user may get a card under it about using one of their computers; you can't tell whether they get it. Tell the user it isn't linked in three or four plain sentences, in their language and without tool names, then do the task another way with the tools you have here if you can. For example: "I can't do that from here, because this chat isn't linked to a computer right now. If a card about using your computer appears below, you can go on from there. If none appears and you have the Claude desktop app on a computer, opening this chat there and sending a message can link it. If I still can't use your computer after that, adding a folder from that computer to this chat, in the desktop app, can." Say nothing about what you could do once it is linked or when that might be, and suggest no other steps or settings, with one exception: you can say that a file you made here can be put on their computer once it is linked. If the user's next message is only "Continue" or the name of a computer and you now have tools that run on their computer, go on with what they asked for, with those tools. If the user later says they did any of these and you still have no such tools, say that it still isn't linked, and name again only the steps they have not said they tried. If they say they tried all of them and you still have none, say only that it still isn't linked: no cause, and no step such as restarting or waiting.`;
var SWITCHED_OFF_TEXT = `Claude in Chrome is switched off for this chat, and no tool here can switch it on. Tell the user so in one or two plain sentences, in their language and without tool names. For example: "I can't use Chrome from here, because Claude in Chrome is switched off for this chat. You can switch it on under Connectors in this chat, on the web or in the Claude desktop app, if your organization allows Claude in Chrome." Then, if you have tools whose names contain Claude_Browser, offer to use the browser built into the Claude desktop app instead; otherwise do the task another way with the tools you have here if you can. Say nothing about what you could do once it is on, don't say that Chrome or its extension isn't connected, and suggest no other steps or settings for Claude in Chrome, with one exception: if the user says the switch already shows on, ask them to switch it off and on again there. If the user says they can't switch it on there, say only that you can't tell why from here, and that an organization can block Claude in Chrome for its members: no other cause, and no step. If the user says they switched it on, use Claude in Chrome's tools if you now have any (their names contain claude-in-chrome or Claude_in_Chrome); otherwise say only that you still can't use it here: no cause, and no step such as refreshing or waiting.`;
var SWITCHED_OFF_NOT_LINKED_TEXT = `Claude in Chrome is switched off for this chat, and this chat isn't linked to a computer right now. No tool here can change either, including ${REQUEST_COMPUTER} and the tools whose names start with enable__. Both are normal states, not an outage or a connection problem. While you have none of Claude in Chrome's tools (their names contain ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}__ or Claude_in_Chrome__) there is no point looking or waiting for them. Either state can change during the conversation: if such tools are later in your tool list or announced to you, use them, whatever this result says. Tell the user both in three or four plain sentences, in their language and without tool names, then do the task another way with the tools you have here if you can. For example: "I can't use Chrome from here: Claude in Chrome is switched off for this chat, and the chat isn't linked to a computer right now. You can switch Claude in Chrome on under Connectors in this chat, on the web or in the Claude desktop app, if your organization allows Claude in Chrome. If you have the desktop app on a computer, opening this chat there and sending a message can link it. If I still can't use your computer after that, adding a folder from that computer to this chat, in the desktop app, can." Say nothing about what you could do after that or when that might be, and suggest no other steps or settings for either, with one exception: if the user says the switch already shows on, ask them to switch it off and on again there. If the user says they can't switch it on there, say only that you can't tell why from here, and that an organization can block Claude in Chrome for its members: no other cause, and no step. If the user says they did any of these and you still have none of Claude in Chrome's tools, say that you still can't use it here, with no cause, and name again only the steps they have not said they tried. If they say they tried all of them and you still have none, say only that you still can't use it here: no cause, and no step such as refreshing or waiting.`;
var ORG_REFUSAL_TEXT =
  "This call enables nothing, and no tool here can add Claude in Chrome: this chat has none of its tools right now. Tell the user in one plain sentence, in their language and without tool names, that you can't use Claude in Chrome in this chat right now. Then, if you have tools whose names contain Claude_Browser, offer to use the browser built into the Claude desktop app instead; otherwise do the task another way with the tools you have here if you can. You don't know the cause: don't say that Chrome or its extension isn't connected, and suggest no steps or settings for Claude in Chrome. If you later have its tools (their names contain claude-in-chrome or Claude_in_Chrome), use them.";
//@ chunk-tkqbtg0j.js:26294-26362 placement
/**
 * 启用类占位工具的输入 schema（带可选 task）。
 */
var enableTaskInputSchema = DoctorLazy(() =>
  looseObject({
    task: unknown().optional(),
  }),
);
var enableMessageOutputSchema = DoctorLazy(() =>
  u({
    message: string(),
  }),
);
//@ chunk-tkqbtg0j.js:26362-26554 placement
/**
 * teleport 中继共享时使用共享描述并在结果后附加说明。
 */
function withSharedDescription({ description, sharedDescription, result: s }) {
  if (
    sharedDescription === undefined ||
    getTeleportRelayEnvConfig() === null ||
    getFeatureValue_SESSION_PINNED("tengu_peaceful_leaf", false) !== true
  )
    return {
      description,
      result: s,
    };
  return {
    description: sharedDescription,
    result: `${s} ${SWITCHED_OFF_NOTE}`,
  };
}
//@ chunk-tkqbtg0j.js:26554-27808 placement
function createEnableStubTool({
  name: e,
  label,
  description,
  sharedDescription,
  result: a,
  pickResult,
  inputJSONSchema,
  endsRelayOnCall,
}) {
  let y = {
    description,
    sharedDescription,
    result: a,
  };
  return buildTool({
    name: e,
    backgrounding: "never",
    maxResultSizeChars: 1e4,
    async description() {
      return withSharedDescription(y).description;
    },
    async prompt() {
      return withSharedDescription(y).description;
    },
    get inputSchema() {
      return enableTaskInputSchema();
    },
    inputJSONSchema,
    get outputSchema() {
      return enableMessageOutputSchema();
    },
    userFacingName() {
      return label;
    },
    shouldDefer: true,
    isEnabled() {
      return (
        getTeleportRelayEnvConfig() !== null ||
        (isCcsRemoteCowork() &&
          isClaudeAiChatOrigin() &&
          getFeatureValue_SESSION_PINNED("tengu_merry_tide", false) === true)
      );
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput() {
      return "";
    },
    renderToolUseMessage() {
      return null;
    },
    create(r) {
      return {
        async call(C, { parentMessage }) {
          let S = r.mcpClients();
          let T =
            r.tools.some((tool) => isBrowserOrChromeToolName(tool.name)) ||
            S.some((f) => isBrowserOrChromeToolName(getMcpPrefix(f.name)));
          let g = pickResult?.({
            tools: r.tools,
            clients: S,
            mayBeLinked: T,
            subagent: r.agentId !== undefined,
          });
          if (!T)
            return {
              data: {
                message: g ?? ENABLE_TOOL_FAILURE_TEXT,
              },
            };
          let teleportCacheState = getTeleportCacheState();
          if (endsRelayOnCall && r.agentId === undefined && teleportCacheState.status === "active") {
            if (teleportCacheState.marker.automation_tools !== true)
              revertTeleportCache("device_tool_requested", "main", e);
            else if (recordEnableStubCall(e, parentMessage?.message.id) === "repeat")
              revertTeleportCache("device_tool_request_repeated", "main", e);
          }
          return {
            data: {
              message: withSharedDescription({
                ...y,
                result: g ?? a,
              }).result,
            },
          };
        },
      };
    },
    mapToolResultToToolResultBlockParam(r, toolUseId) {
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: r.message,
      };
    },
  });
}
//@ chunk-tkqbtg0j.js:27808-28374 placement
/**
 * 各能力的启用占位工具（Chrome、浏览器、电脑使用、请求电脑）与列表。
 */
var ENABLE_CHROME_STUB = createEnableStubTool({
  name: ENABLE_CHROME_TOOL_NAME,
  label: "Claude in Chrome",
  description: ENABLE_CHROME_DESCRIPTION,
  sharedDescription: ENABLE_CHROME_SHARED_DESCRIPTION,
  result: ENABLE_CHROME_RESULT_3,
  pickResult(e) {
    let n = chromeStubCase(e);
    logForDiagnosticsNoPII("info", "cli_chrome_enable_stub_call", {
      case: n,
      subagent: e.subagent,
    });
    return CHROME_STUB_RESULTS[n];
  },
  inputJSONSchema: ENABLE_TOOL_INPUT_SCHEMA,
  endsRelayOnCall: true,
});
var ENABLE_BROWSER_STUB = createEnableStubTool({
  name: ENABLE_BROWSER_TOOL_NAME,
  label: "Browser",
  description: ENABLE_BROWSER_DESCRIPTION,
  sharedDescription: ENABLE_BROWSER_SHARED_DESCRIPTION,
  result: ENABLE_BROWSER_RESULT,
  inputJSONSchema: ENABLE_TOOL_INPUT_SCHEMA,
  endsRelayOnCall: true,
});
var ENABLE_COMPUTER_STUB = createEnableStubTool({
  name: ENABLE_MCP_REMOTE_DEVICES_COMPUTER,
  label: "Computer use",
  description: ENABLE_COMPUTER_DESCRIPTION,
  sharedDescription: ENABLE_COMPUTER_SHARED_DESCRIPTION,
  result: ENABLE_COMPUTER_RESULT,
  inputJSONSchema: ENABLE_COMPUTER_INPUT_SCHEMA,
  endsRelayOnCall: true,
});
var REQUEST_COMPUTER_STUB = createEnableStubTool({
  name: REQUEST_COMPUTER,
  label: "Your computer",
  description: ENABLE_REMOTE_DEVICES_DESCRIPTION,
  result: ENABLE_REMOTE_DEVICES_RESULT,
  endsRelayOnCall: false,
});
var ENABLE_STUB_TOOLS = [
  ENABLE_CHROME_STUB,
  ENABLE_BROWSER_STUB,
  ENABLE_COMPUTER_STUB,
  REQUEST_COMPUTER_STUB,
];
var REMOTE_DEVICES_PREFIX = getMcpPrefix(REMOTE_DEVICES);
//@ chunk-tkqbtg0j.js:28374-28419 placement
/**
 * 判断工具名是否属于 remote-devices 前缀或 Chrome 工具。
 */
function isBrowserOrChromeToolName(e) {
  return e.startsWith(REMOTE_DEVICES_PREFIX) || isChromeToolName(e);
}
//@ chunk-tkqbtg0j.js:28419-28455 placement
/**
 * 是 Chrome 工具名且不是 remote-devices 前缀。
 */
function isPlainChromeToolName(e) {
  return isChromeToolName(e) && !isBrowserPreviewToolName(e);
}
//@ chunk-tkqbtg0j.js:28455-28620 placement
/**
 * Chrome 占位工具按原因选择的结果文本。
 */
var CHROME_STUB_RESULTS = {
  has_tools: undefined,
  org_disallows: ORG_REFUSAL_TEXT,
  org_denies_server: ORG_REFUSAL_TEXT,
  switched_off: SWITCHED_OFF_TEXT,
  switched_off_not_linked: SWITCHED_OFF_NOT_LINKED_TEXT,
  not_linked: undefined,
  server_pending: ORG_REFUSAL_TEXT,
  server_failed: ORG_REFUSAL_TEXT,
  no_cause: ORG_REFUSAL_TEXT,
};
//@ chunk-tkqbtg0j.js:28620-29183 placement
/**
 * 判断 Chrome 工具不可用的原因（已有工具、组织禁止、关闭、未连接、服务器挂起/失败等）。
 */
function chromeStubCase({ tools, clients, mayBeLinked }) {
  let filtered = clients.filter((client) => isPlainChromeToolName(getMcpPrefix(client.name)));
  let a = new Set(filtered.map((t) => t.type));
  let mapped = filtered.filter((t) => t.type === "disabled").map((t) => getMcpPrefix(t.name));
  if (
    a.has("connected") ||
    tools.some((tool) => isPlainChromeToolName(tool.name) && !mapped.some((m) => tool.name.startsWith(m)))
  )
    return "has_tools";
  if (tryOrReport(() => !isClaudeInChromeAllowed())) return "org_disallows";
  if (tryOrReport(isChromeServerPolicyDenied)) return "org_denies_server";
  if (filtered.length > 0 ? a.has("disabled") : chromeSwitchNote() === false)
    return mayBeLinked ? "switched_off" : "switched_off_not_linked";
  if (!mayBeLinked) return "not_linked";
  if (a.has("pending")) return "server_pending";
  if (a.has("failed")) return "server_failed";
  return "no_cause";
}
//@ chunk-tkqbtg0j.js:29183-29237 placement
/**
 * 执行回调，抛错时记日志并返回 false。
 */
function tryOrReport(isChromeServerPolicyDenied) {
  try {
    return isChromeServerPolicyDenied();
  } catch (error) {
    logError(error);
    return false;
  }
}
