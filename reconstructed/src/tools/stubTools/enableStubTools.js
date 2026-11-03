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
import { kt, oe, u, o } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { isChromeToolName, E5t } from "../../utils/claudeInChrome/chromeToolNames.js";
import { isClaudeInChromeAllowed } from "../../utils/claudeInChrome/setup.js";
import { isChromeServerPolicyDenied } from "../../utils/claudeInChrome/serverPolicy.js";
import { logError } from "../../utils/log.js";

/**
 * "enable__mcp__…"占位工具：在 Claude in Chrome、远程设备浏览器/电脑等能力尚未加载时，提示模型先启用对应 MCP 工具。
 */
//@ chunk-tkqbtg0j.js:12104-26294 placement
var ENABLE_CHROME_TOOL_NAME = "enable__mcp__claude-in-chrome",
  U = "enable__mcp__remote-devices__Claude_Browser",
  ENABLE_MCP_REMOTE_DEVICES_COMPUTER = "enable__mcp__remote-devices__computer",
  REQUEST_COMPUTER = "request_computer",
  I =
    "Enable Claude in Chrome, the Claude extension in the Chrome browser on the user's own computer, for this conversation. If you already have tools whose names contain claude-in-chrome__ or Claude_in_Chrome__, use those directly instead of calling this. Otherwise call it once, before any other Claude in Chrome tool, when the user asks you to do something in their browser or on a website that needs their own sign-in, or explicitly asks for Claude in Chrome. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.",
  k =
    "Enable Claude in Chrome, the Claude extension in the Chrome browser on the user's own computer, for this conversation. If you already have tools whose names contain claude-in-chrome__ or Claude_in_Chrome__, use those directly instead of calling this. Otherwise call it once, before any other Claude in Chrome tool, when the user asks you to do something in their browser or on a website that needs their own sign-in, when a step in a skill or task the user asked you to carry out needs their browser or such a website, or when the user explicitly asks for Claude in Chrome. If the tools it turns on, or the tools for files on that computer, are missing from your tool list, calling it is how they are added, possibly a turn later. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.",
  N =
    "Enable the browser built into the Claude desktop app on the user's computer for this conversation. If you already have tools whose names contain Claude_Browser__, use those directly instead of calling this. Otherwise call it once, before any other Claude app browser tool, when the user asks you to do something in the Claude app's own browser or on a website that needs their own sign-in, or explicitly asks for that browser. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.",
  L =
    "Enable the browser built into the Claude desktop app on the user's computer for this conversation. If you already have tools whose names contain Claude_Browser__, use those directly instead of calling this. Otherwise call it once, before any other Claude app browser tool, when the user asks you to do something in the Claude app's own browser or on a website that needs their own sign-in, when a step in a skill or task the user asked you to carry out needs that browser or such a website, or when the user explicitly asks for that browser. If the tools it turns on, or the tools for files on that computer, are missing from your tool list, calling it is how they are added, possibly a turn later. Do not call it for questions you can answer from the conversation or with web search, or merely because a request mentions a website.",
  E = {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Optional: what you are about to do in the browser, in one or two sentences.",
      },
    },
    additionalProperties: !1,
  },
  v = `Any of them that was announced as available through ${TOOL_SEARCH_TOOL_NAME} must be loaded before you call it, unless ${TOOL_SEARCH_TOOL_NAME} has loaded it since`,
  A = `${v}: load the ones you expect to need in one ${TOOL_SEARCH_TOOL_NAME} call (for example, query "select:<name>[,<name>...]"), and use them once that result has come back, not in the same reply`,
  M =
    "If no tool with such a name is in your list or was announced, or you have since been told that they are no longer available, do not call or load one. That applies to those tools only.",
  D = `Claude in Chrome needs no enabling: its tools are the ones whose names contain claude-in-chrome or Claude_in_Chrome. ${A}. ${M} If you have no browser tool of any kind, tell the user in one plain sentence that you can't use Claude in Chrome in this chat right now, and continue with what you can do here. You don't know the cause: don't say that Chrome or its extension isn't connected, and suggest no steps or settings for Claude in Chrome.`,
  x = `The Claude desktop app's built-in browser needs no enabling: its tools are the ones whose names contain Claude_Browser. ${A}. ${M} If you have no browser tool of any kind, tell the user that the browser in their Claude desktop app is not available in this chat right now and continue with what you can do here.`,
  P =
    "Enable computer use on the user's own computer for this conversation, so you can see its screen and work in its applications (take screenshots, click, type, scroll, open apps). If you already have tools whose names start with mcp__remote-devices__computer_, use those directly instead of calling this. Otherwise call it once, before any other computer-use tool, when the user asks you to do something in an application on their computer, or explicitly asks you to use their computer or their screen. Do not call it for questions you can answer from the conversation or with web search, for work that only needs their web browser, or merely because a request mentions an application.",
  H =
    "Enable computer use on the user's own computer for this conversation, so you can see its screen and work in its applications (take screenshots, click, type, scroll, open apps). If you already have tools whose names start with mcp__remote-devices__computer_, use those directly instead of calling this. Otherwise call it once, before any other computer-use tool, when the user asks you to do something in an application on their computer, when a step in a skill or task the user asked you to carry out needs an application on their computer, or when the user explicitly asks you to use their computer or their screen. If the tools it turns on, or the tools for files on that computer, are missing from your tool list, calling it is how they are added, possibly a turn later. Do not call it for questions you can answer from the conversation or with web search, for work that only needs their web browser, or merely because a request mentions an application.",
  q = {
    type: "object",
    properties: {
      task: {
        type: "string",
        description: "Optional: what you are about to do on the computer, in one or two sentences.",
      },
    },
    additionalProperties: !1,
  },
  O = `mcp__${REMOTE_DEVICES}__computer_`,
  W = `The computer-use tools are the ${O} tools; there is no separate enable step. ${v}: load them all in one ${TOOL_SEARCH_TOOL_NAME} call (query "${O}", max_results 100), and use them once that result has come back, not in the same reply. Try the user's request with them, asking for access to the applications you need first, the way those tools describe. Don't tell the user their computer is connected until a call to one of them has succeeded; if calls keep not responding, the Claude app on the user's computer isn't answering: it may be closed or the computer asleep. Tell the user that, ask them to open the Claude app on that computer, and carry on with what you can do here. If you have no such tools here, tell the user that computer use isn't available on their computer right now and that the Claude app on that computer may show why in the Computer use section of its Settings, then continue with what you can do here. Don't say a permission was denied unless a result says so.`,
  F = `If the request is about files or folders on the user's computer and you have device tools here (loaded or through tool search), such as mcp__${REMOTE_DEVICES}__device_list_dir, use them for that part; if it is and you have none, tell the user that files on their computer can't be reached right now.`,
  z =
    "Does nothing. This tool cannot connect a computer here. Tools whose names start with mcp__remote-devices__, if you have any, run on the user's computer; use whichever of them fits the task.",
  J = `This call did not connect a computer, and no tool here can. Tools whose names start with mcp__${REMOTE_DEVICES}__, if you have any, run on the user's computer; use whichever of them fits the task, loading it with ${TOOL_SEARCH_TOOL_NAME} first, and waiting for that result, if it was only announced as available there and has not been loaded since. Otherwise carry on with the tools you have here, and if the task needs the user's computer, tell the user so.`,
  j = `This chat isn't linked to a computer right now, and no tool here can link one, including ${REQUEST_COMPUTER} and the tools whose names start with enable__. That is a normal state, not an outage or a connection problem, so while you have no tools that run on the user's computer there is no point looking or waiting for them. The link can change during the conversation: if such tools (their names start with mcp__${REMOTE_DEVICES}__ or mcp__${CLAUDE_IN_CHROME_MCP_SERVER_NAME}__) are later in your tool list or announced to you, use them, whatever this result says. When your reply ends, the user may get a card under it about using one of their computers; you can't tell whether they get it. Tell the user it isn't linked in three or four plain sentences, in their language and without tool names, then do the task another way with the tools you have here if you can. For example: "I can't do that from here, because this chat isn't linked to a computer right now. If a card about using your computer appears below, you can go on from there. If none appears and you have the Claude desktop app on a computer, opening this chat there and sending a message can link it. If I still can't use your computer after that, adding a folder from that computer to this chat, in the desktop app, can." Say nothing about what you could do once it is linked or when that might be, and suggest no other steps or settings, with one exception: you can say that a file you made here can be put on their computer once it is linked. If the user's next message is only "Continue" or the name of a computer and you now have tools that run on their computer, go on with what they asked for, with those tools. If the user later says they did any of these and you still have no such tools, say that it still isn't linked, and name again only the steps they have not said they tried. If they say they tried all of them and you still have none, say only that it still isn't linked: no cause, and no step such as restarting or waiting.`,
  Q = `Claude in Chrome is switched off for this chat, and no tool here can switch it on. Tell the user so in one or two plain sentences, in their language and without tool names. For example: "I can't use Chrome from here, because Claude in Chrome is switched off for this chat. You can switch it on under Connectors in this chat, on the web or in the Claude desktop app, if your organization allows Claude in Chrome." Then, if you have tools whose names contain Claude_Browser, offer to use the browser built into the Claude desktop app instead; otherwise do the task another way with the tools you have here if you can. Say nothing about what you could do once it is on, don't say that Chrome or its extension isn't connected, and suggest no other steps or settings for Claude in Chrome, with one exception: if the user says the switch already shows on, ask them to switch it off and on again there. If the user says they can't switch it on there, say only that you can't tell why from here, and that an organization can block Claude in Chrome for its members: no other cause, and no step. If the user says they switched it on, use Claude in Chrome's tools if you now have any (their names contain claude-in-chrome or Claude_in_Chrome); otherwise say only that you still can't use it here: no cause, and no step such as refreshing or waiting.`,
  Y = `Claude in Chrome is switched off for this chat, and this chat isn't linked to a computer right now. No tool here can change either, including ${REQUEST_COMPUTER} and the tools whose names start with enable__. Both are normal states, not an outage or a connection problem. While you have none of Claude in Chrome's tools (their names contain ${CLAUDE_IN_CHROME_MCP_SERVER_NAME}__ or Claude_in_Chrome__) there is no point looking or waiting for them. Either state can change during the conversation: if such tools are later in your tool list or announced to you, use them, whatever this result says. Tell the user both in three or four plain sentences, in their language and without tool names, then do the task another way with the tools you have here if you can. For example: "I can't use Chrome from here: Claude in Chrome is switched off for this chat, and the chat isn't linked to a computer right now. You can switch Claude in Chrome on under Connectors in this chat, on the web or in the Claude desktop app, if your organization allows Claude in Chrome. If you have the desktop app on a computer, opening this chat there and sending a message can link it. If I still can't use your computer after that, adding a folder from that computer to this chat, in the desktop app, can." Say nothing about what you could do after that or when that might be, and suggest no other steps or settings for either, with one exception: if the user says the switch already shows on, ask them to switch it off and on again there. If the user says they can't switch it on there, say only that you can't tell why from here, and that an organization can block Claude in Chrome for its members: no other cause, and no step. If the user says they did any of these and you still have none of Claude in Chrome's tools, say that you still can't use it here, with no cause, and name again only the steps they have not said they tried. If they say they tried all of them and you still have none, say only that you still can't use it here: no cause, and no step such as refreshing or waiting.`,
  i =
    "This call enables nothing, and no tool here can add Claude in Chrome: this chat has none of its tools right now. Tell the user in one plain sentence, in their language and without tool names, that you can't use Claude in Chrome in this chat right now. Then, if you have tools whose names contain Claude_Browser, offer to use the browser built into the Claude desktop app instead; otherwise do the task another way with the tools you have here if you can. You don't know the cause: don't say that Chrome or its extension isn't connected, and suggest no steps or settings for Claude in Chrome. If you later have its tools (their names contain claude-in-chrome or Claude_in_Chrome), use them.";
//@ chunk-tkqbtg0j.js:26294-26362 placement
var ee = DoctorLazy(() => kt({ task: oe().optional() })),
  te = DoctorLazy(() => u({ message: o() }));
/**
 * teleport 中继共享时使用共享描述并在结果后附加说明。
 */
//@ chunk-tkqbtg0j.js:26362-26554 placement
function withSharedDescription({
  description: description,
  sharedDescription: sharedDescription,
  result: s,
}) {
  if (
    sharedDescription === void 0 ||
    getTeleportRelayEnvConfig() === null ||
    getFeatureValue_SESSION_PINNED("tengu_peaceful_leaf", !1) !== !0
  )
    return { description: description, result: s };
  return { description: sharedDescription, result: `${s} ${F}` };
}
//@ chunk-tkqbtg0j.js:26554-27808 placement
function createEnableStubTool({
  name: e,
  label: label,
  description: description,
  sharedDescription: sharedDescription,
  result: a,
  pickResult: pickResult,
  inputJSONSchema: inputJSONSchema,
  endsRelayOnCall: endsRelayOnCall,
}) {
  let y = { description: description, sharedDescription: sharedDescription, result: a };
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
      return ee();
    },
    inputJSONSchema: inputJSONSchema,
    get outputSchema() {
      return te();
    },
    userFacingName() {
      return label;
    },
    shouldDefer: !0,
    isEnabled() {
      return (
        getTeleportRelayEnvConfig() !== null ||
        (isCcsRemoteCowork() &&
          isClaudeAiChatOrigin() &&
          getFeatureValue_SESSION_PINNED("tengu_merry_tide", !1) === !0)
      );
    },
    isConcurrencySafe() {
      return !0;
    },
    isReadOnly() {
      return !0;
    },
    toAutoClassifierInput() {
      return "";
    },
    renderToolUseMessage() {
      return null;
    },
    create(r) {
      return {
        async call(C, { parentMessage: Z }) {
          let mcpClients = r.mcpClients(),
            T = r.tools.some((tool) => K(tool.name)) || mcpClients.some((f) => K(getMcpPrefix(f.name))),
            g = pickResult?.({
              tools: r.tools,
              clients: mcpClients,
              mayBeLinked: T,
              subagent: r.agentId !== void 0,
            });
          if (!T) return { data: { message: g ?? j } };
          let b = getTeleportCacheState();
          if (endsRelayOnCall && r.agentId === void 0 && b.status === "active") {
            if (b.marker.automation_tools !== !0) revertTeleportCache("device_tool_requested", "main", e);
            else if (recordEnableStubCall(e, Z?.message.id) === "repeat")
              revertTeleportCache("device_tool_request_repeated", "main", e);
          }
          return { data: { message: withSharedDescription({ ...y, result: g ?? a }).result } };
        },
      };
    },
    mapToolResultToToolResultBlockParam(r, C) {
      return { tool_use_id: C, type: "tool_result", content: r.message };
    },
  });
}
/**
 * 各能力的启用占位工具（Chrome、浏览器、电脑使用、请求电脑）与列表。
 */
//@ chunk-tkqbtg0j.js:27808-28374 placement
var ENABLE_CHROME_STUB = createEnableStubTool({
    name: ENABLE_CHROME_TOOL_NAME,
    label: "Claude in Chrome",
    description: I,
    sharedDescription: k,
    result: D,
    pickResult(e) {
      let n = chromeStubCase(e);
      return (
        logForDiagnosticsNoPII("info", "cli_chrome_enable_stub_call", { case: n, subagent: e.subagent }),
        CHROME_STUB_RESULTS[n]
      );
    },
    inputJSONSchema: E,
    endsRelayOnCall: !0,
  }),
  ENABLE_BROWSER_STUB = createEnableStubTool({
    name: U,
    label: "Browser",
    description: N,
    sharedDescription: L,
    result: x,
    inputJSONSchema: E,
    endsRelayOnCall: !0,
  }),
  ENABLE_COMPUTER_STUB = createEnableStubTool({
    name: ENABLE_MCP_REMOTE_DEVICES_COMPUTER,
    label: "Computer use",
    description: P,
    sharedDescription: H,
    result: W,
    inputJSONSchema: q,
    endsRelayOnCall: !0,
  }),
  REQUEST_COMPUTER_STUB = createEnableStubTool({
    name: REQUEST_COMPUTER,
    label: "Your computer",
    description: z,
    result: J,
    endsRelayOnCall: !1,
  }),
  ENABLE_STUB_TOOLS = [ENABLE_CHROME_STUB, ENABLE_BROWSER_STUB, ENABLE_COMPUTER_STUB, REQUEST_COMPUTER_STUB],
  REMOTE_DEVICES_PREFIX = getMcpPrefix(REMOTE_DEVICES);
//@ chunk-tkqbtg0j.js:28374-28419 placement
function K(e) {
  return e.startsWith(REMOTE_DEVICES_PREFIX) || isChromeToolName(e);
}
//@ chunk-tkqbtg0j.js:28419-28455 placement
function X(e) {
  return isChromeToolName(e) && !E5t(e);
}
/**
 * Chrome 占位工具按原因选择的结果文本。
 */
//@ chunk-tkqbtg0j.js:28455-28620 placement
var CHROME_STUB_RESULTS = {
  has_tools: void 0,
  org_disallows: i,
  org_denies_server: i,
  switched_off: Q,
  switched_off_not_linked: Y,
  not_linked: void 0,
  server_pending: i,
  server_failed: i,
  no_cause: i,
};
/**
 * 判断 Chrome 工具不可用的原因（已有工具、组织禁止、关闭、未连接、服务器挂起/失败等）。
 */
//@ chunk-tkqbtg0j.js:28620-29183 placement
function chromeStubCase({ tools: tools, clients: clients, mayBeLinked: mayBeLinked }) {
  let filtered = clients.filter((t) => X(getMcpPrefix(t.name))),
    a = new Set(filtered.map((t) => t.type)),
    mapped = filtered.filter((t) => t.type === "disabled").map((t) => getMcpPrefix(t.name));
  if (a.has("connected") || tools.some((t) => X(t.name) && !mapped.some((m) => t.name.startsWith(m))))
    return "has_tools";
  if (G(() => !isClaudeInChromeAllowed())) return "org_disallows";
  if (G(isChromeServerPolicyDenied)) return "org_denies_server";
  if (filtered.length > 0 ? a.has("disabled") : chromeSwitchNote() === !1)
    return mayBeLinked ? "switched_off" : "switched_off_not_linked";
  if (!mayBeLinked) return "not_linked";
  if (a.has("pending")) return "server_pending";
  if (a.has("failed")) return "server_failed";
  return "no_cause";
}
//@ chunk-tkqbtg0j.js:29183-29237 placement
function G(e) {
  try {
    return e();
  } catch (error) {
    return (logError(error), !1);
  }
}
