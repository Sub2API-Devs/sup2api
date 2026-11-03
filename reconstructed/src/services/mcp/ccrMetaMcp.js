/**
 * services/mcp/ccrMetaMcp.ts
 *
 * 2.1.316 新增：CCR 元 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ptag3qm7.js (15)
 * attribution: placement 15
 */
//@ chunk-ptag3qm7.js:191-547 placement
/**
 * CCR 元 MCP 服务器相关常量：服务路径、服务器名、触发器工具名、send_message、仓库管理工具名、显示名、服务器 id 与 id 请求头名。
 */
var CCR_META_MCP_PATH = "/v2/ccr-sessions/-/meta/mcp";
var CLAUDE_CODE_REMOTE = "claude-code-remote";
var TRIGGER_TOOL_NAMES = [
  "list_triggers",
  "create_trigger",
  "update_trigger",
  "delete_trigger",
  "fire_trigger",
  "send_later",
];
var SEND_MESSAGE = "send_message";
var REPO_TOOL_NAMES = ["add_repo", "check_repo_access", "list_repos"];
var REPO_TOOL_NAMES_WITH_ROOT = [...REPO_TOOL_NAMES, "register_repo_root"];
var CLAUDE_CODE_REMOTE_DISPLAY_NAME = "Claude Code Remote";
var BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A = "bf7c680d-5fdc-5ef4-b4a0-abadb619bf0a";
var X_MCP_SERVER_ID = "X-MCP-Server-ID";
//@ chunk-ptag3qm7.js:547-726 placement
/**
 * 生成 CCR 元 MCP 服务器的 http 配置（固定服务器 id、会话 UUID 与版本头，始终加载）。
 */
function ccrMetaMcpServerConfig(url, sessionId) {
  return {
    type: "http",
    url,
    headers: {
      ["X-MCP-Server-ID"]: "bf7c680d-5fdc-5ef4-b4a0-abadb619bf0a",
      "X-Session-UUID": sessionId,
      "anthropic-version": "2023-06-01",
    },
    alwaysLoad: true,
  };
}
//@ chunk-ptag3qm7.js:726-1124 placement
/**
 * hearthbot 开启线程相关工具名的替代映射。
 */
var HEARTHBOT = "hearthbot";
var HEARTH_TOOL_ALIASES = {
  read_thread: "fetch_thread",
  read_project_chat: "fetch_project_timeline",
  read_messages_by_id: "fetch_messages",
  list_threads: "list_thread_sessions",
  list_prs: "list_project_prs",
  edit_message: "update_message",
  request_decision: "ask_decision",
  update_progress_checklist: "update_status",
};
var HEARTH_REPLY_ALIASES = {
  post_message: "reply",
  rename_thread: "set_thread_label",
};
var HEARTH_START_THREAD_ALIASES = {
  start_thread: "start_thread_session",
};
//@ chunk-ptag3qm7.js:1124-1264 placement
function toolNameAliasPairs(e, s) {
  return [
    ...e.map((t) => [t, t]),
    ...Object.entries(s).flatMap(([key, value]) => {
      let found = e.find((a) => a === value);
      return found === undefined ? [] : [[key, found]];
    }),
  ];
}
//@ chunk-ptag3qm7.js:1264-1312 placement
/**
 * 把一组工具名按别名表解析成规范名。
 */
function aliasCanonicalNames(e, s = HEARTH_TOOL_ALIASES) {
  return toolNameAliasPairs(e, s).map(([t]) => t);
}
//@ chunk-ptag3qm7.js:1312-1351 placement = getMcpPrefix (1)
function getMcpPrefix(serverName) {
  return `mcp__${HEARTHBOT}__${serverName}`;
}
//@ chunk-ptag3qm7.js:1351-1403 placement
/**
 * 由规范工具名拼出 mcp__hearthbot__<name>。
 */
function hearthToolName(e, s = HEARTH_TOOL_ALIASES) {
  let [, t] = aliasCanonicalNames([e], s);
  return getMcpPrefix(t ?? e);
}
//@ chunk-ptag3qm7.js:1403-1655 placement
/**
 * （归属疑误：hearthbot）预构造的 mcp__hearthbot__reply/fetch_* 工具名常量。
 */
var HEARTH_REPLY_TOOL = getMcpPrefix("reply");
var HEARTH_REPLY_TOOL_ALT = hearthToolName("reply", HEARTH_REPLY_ALIASES);
var HEARTH_SET_THREAD_LABEL_TOOL = hearthToolName("set_thread_label", HEARTH_REPLY_ALIASES);
var HEARTH_START_THREAD_TOOL = hearthToolName("start_thread_session", HEARTH_START_THREAD_ALIASES);
var HEARTH_FETCH_MESSAGES_TOOL = getMcpPrefix("fetch_messages");
var HEARTH_FETCH_THREAD_TOOL = getMcpPrefix("fetch_thread");
var HEARTH_FETCH_TIMELINE_TOOL = getMcpPrefix("fetch_project_timeline");
var HEARTH_READ_TOOLS = new Set(
  aliasCanonicalNames(["fetch_messages", "fetch_thread", "fetch_project_timeline"]).map(getMcpPrefix),
);
//@ chunk-ptag3qm7.js:1655-1740 placement
/**
 * 服务器的工具列表里是否有任一给定工具名或别名。
 */
function serverHasAnyTool(e, s) {
  return e.some((t) => s.some((_) => t.name === _ || t.aliases?.includes(_)));
}
//@ chunk-ptag3qm7.js:1740-1942 placement
/**
 * hearthbot（Projects 线程）工具名常量：update_status 及别名、开启线程会话的工具名与线程工具别名表（回复、状态、读取）。
 */
var HEARTH_UPDATE_STATUS_TOOL = getMcpPrefix("update_status");
var HEARTH_UPDATE_STATUS_TOOLS = [HEARTH_UPDATE_STATUS_TOOL, hearthToolName("update_status")];
var HEARTH_START_THREAD_TOOLS = [getMcpPrefix("start_thread_session"), HEARTH_START_THREAD_TOOL];
var HEARTH_START_SESSION_TOOLS = [...HEARTH_START_THREAD_TOOLS, getMcpPrefix("start_folder_thread")];
var DEFAULT_HEARTH_TOOLS = {
  reply: HEARTH_REPLY_TOOL,
  postIsAnswer: false,
  status: HEARTH_UPDATE_STATUS_TOOL,
  reads: {
    messages: HEARTH_FETCH_MESSAGES_TOOL,
    thread: HEARTH_FETCH_THREAD_TOOL,
    timeline: HEARTH_FETCH_TIMELINE_TOOL,
  },
};
//@ chunk-ptag3qm7.js:1942-2227 placement
/**
 * 根据当前可用工具决定 hearthbot 回复/状态/读取各用哪个工具名：只有别名版 reply 存在时用它并标记回复即答案，读取类工具优先用实际存在的别名。
 */
function resolveHearthToolNames(tools) {
  let s = DEFAULT_HEARTH_TOOLS;
  let t = (i) => {
    let p = hearthToolName(i.slice(getMcpPrefix("").length));
    return serverHasAnyTool(tools, [p]) && !serverHasAnyTool(tools, [i]) ? p : i;
  };
  let _ =
    serverHasAnyTool(tools, [HEARTH_REPLY_TOOL_ALT]) &&
    !serverHasAnyTool(tools, [HEARTH_REPLY_TOOL, HEARTH_UPDATE_STATUS_TOOL, ...HEARTH_START_SESSION_TOOLS]);
  let { messages, thread, timeline } = s.reads;
  return {
    reply: _ ? HEARTH_REPLY_TOOL_ALT : s.reply,
    postIsAnswer: _,
    status: t(s.status),
    reads: {
      messages: t(messages),
      thread: t(thread),
      timeline: t(timeline),
    },
  };
}
//@ chunk-ptag3qm7.js:2227-2260 placement
/**
 * 工具/服务器名的合法字符与长度正则。
 */
var TOOL_OR_SERVER_NAME_RE = /^[A-Za-z0-9_-]{1,160}$/;
//@ chunk-ptag3qm7.js:2260-2320 placement
/**
 * 生成会话的 hearthbot MCP 地址 /v2/ccr-sessions/<id>/hearthbot/mcp。
 */
function hearthMcpPath(sessionId) {
  return `/v2/ccr-sessions/${sessionId}/hearthbot/mcp`;
}
//@ chunk-ptag3qm7.js:2320-2440 placement
/**
 * 生成 hearthbot MCP 服务器的 http 配置（会话 UUID 与版本头，始终加载）。
 */
function hearthMcpServerConfig(url, sessionId) {
  return {
    type: "http",
    url,
    headers: {
      "X-Session-UUID": sessionId,
      "anthropic-version": "2023-06-01",
    },
    alwaysLoad: true,
  };
}
//@ chunk-ptag3qm7.js:2440-3244 placement
/**
 * hearthbot 服务器的工具名集合，以及其中会修改状态的工具子集。
 */
var HEARTH_TOOL_NAMES = new Set(
  aliasCanonicalNames([
    "reply",
    "update_status",
    "no_reply_needed",
    "switch_model",
    "fetch_thread",
    "fetch_project_timeline",
    "fetch_messages",
    "search_channels",
    "set_thread_label",
    "set_thread_resolved",
    "list_thread_sessions",
    "list_thread_connectors",
    "list_project_members",
    "list_project_artifacts",
    "list_project_prs",
    "list_project_files",
    "read_project_file",
    "react",
    "unreact",
    "update_message",
    "get_channel_session_id",
    "get_project_session_id",
    "read_memory",
    "update_memory",
    "report_issue",
    "set_time_zone",
    "pin_artifact",
    "unpin_artifact",
    "suggest_connectors",
    "post_widget",
    "cookie_sign_in_request",
  ]),
);
var HEARTH_WRITE_TOOL_NAMES = new Set(
  aliasCanonicalNames([
    "update_memory",
    "update_message",
    "set_thread_resolved",
    "switch_model",
    "pin_artifact",
    "unpin_artifact",
    "report_issue",
    "set_time_zone",
    "cookie_sign_in_request",
    "post_widget",
    "suggest_connectors",
  ]),
);
export {
  HEARTH_WRITE_TOOL_NAMES,
  HEARTHBOT,
  CLAUDE_CODE_REMOTE,
  ccrMetaMcpServerConfig,
  REPO_TOOL_NAMES_WITH_ROOT,
  aliasCanonicalNames,
  resolveHearthToolNames,
  SEND_MESSAGE,
  X_MCP_SERVER_ID,
  BF7C680D_5FDC_5EF4_B4A0_ABADB619BF0A,
  CCR_META_MCP_PATH,
  HEARTH_READ_TOOLS,
  TOOL_OR_SERVER_NAME_RE,
  hearthMcpPath,
  HEARTH_TOOL_NAMES,
  CLAUDE_CODE_REMOTE_DISPLAY_NAME,
  serverHasAnyTool,
  hearthMcpServerConfig,
  HEARTH_REPLY_TOOL,
  HEARTH_REPLY_TOOL_ALT,
  HEARTH_UPDATE_STATUS_TOOLS,
  HEARTH_START_THREAD_TOOLS,
  HEARTH_REPLY_ALIASES,
  DEFAULT_HEARTH_TOOLS,
  TRIGGER_TOOL_NAMES,
  REPO_TOOL_NAMES,
};
