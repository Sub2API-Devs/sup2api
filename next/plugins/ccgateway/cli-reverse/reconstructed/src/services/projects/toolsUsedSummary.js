/**
 * services/projects/toolsUsedSummary.ts
 *
 * 2.1.316 新增：已用工具摘要
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (29)
 * attribution: placement 29
 */
import { randomBytes } from "crypto";
import {
  LETTER_REGEX,
  LEADING_PUNCT_RUN_REGEX,
  TRAILING_PUNCT_RUN_REGEX,
  FENCE_MARKER_WORDS_REGEX,
} from "./disclosure.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { toContentBlocks } from "../../commands/insights.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import { isClaudeAiProxyServer } from "../../components/mcp/MCPListPanel.js";
import { factLabel } from "./contextFile.js";
import { stripPrefix, plural, truncateToLength } from "../../utils/stringUtils.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { isClaudeAiServerName } from "../mcp/normalization.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { WORD_BOUNDARY_PATTERN } from "../../utils/attachments/atMentions.js";

//@ chunk-dz3q485w.js:19887-20046 placement
function isMarkerShapedLine(line) {
  let replaced = line.normalize("NFKC").replace(/[\p{Cf}\p{Mn}]+/gu, "");
  return (
    (LETTER_REGEX.test(replaced) &&
      LEADING_PUNCT_RUN_REGEX.test(replaced) &&
      TRAILING_PUNCT_RUN_REGEX.test(replaced)) ||
    FENCE_MARKER_WORDS_REGEX.test(replaced.replace(/[^\p{L}\p{N}]+/gu, " "))
  );
}
//@ chunk-dz3q485w.js:20046-20140 placement
/**
 * 简报里「本次会话用过的工具」小节标题，以及配套的条数/长度上限与会话级缓存。
 */
var TOOLS_USED_HEADING = "Tools these sessions used";
var MAX_SERVERS_SHOWN = 6;
var MAX_CONNECTORS_SHOWN = 5;
var MAX_SERVER_NAME_CHARS = 40;
var toolsUsedSessionSlot = new SessionRootSlot(() => ({
  current: null,
  read: null,
}));
//@ chunk-dz3q485w.js:20140-20190 placement
/**
 * MCP 调用计数的空累加器（按服务器计数 + 已计 tool_use id 集合）。
 */
function emptyCallCounts() {
  return {
    counts: new Map(),
    seen: new Set(),
  };
}
//@ chunk-dz3q485w.js:20190-20619 placement
/**
 * 统计消息中按 MCP 服务器分组的工具调用次数（按 tool_use id 去重）。
 */
function countMcpCallsByServer(messages, acc = emptyCallCounts()) {
  let { counts, seen } = acc;
  for (let message of messages) {
    if (
      message === null ||
      typeof message !== "object" ||
      message.type !== "assistant" ||
      message.message == null
    )
      continue;
    for (let block of toContentBlocks(message.message.content)) {
      if (block.type !== "tool_use" || typeof block.name !== "string") continue;
      let mcpInfo = mcpInfoFromString(block.name);
      if (mcpInfo === null || (mcpInfo.toolName ?? "") === "") continue;
      if (typeof block.id === "string" && block.id !== "") {
        if (seen.has(block.id)) continue;
        seen.add(block.id);
      }
      counts.set(mcpInfo.serverName, (counts.get(mcpInfo.serverName) ?? 0) + 1);
    }
  }
  return counts;
}
//@ chunk-dz3q485w.js:20619-20654 placement
function isClaudeAiConnectorClient(client) {
  return isClaudeAiProxyServer(client.config);
}
//@ chunk-dz3q485w.js:20654-20716 placement
function isConnectedOrCachedClient(client) {
  return client.type === "connected" || client.type === "cached";
}
//@ chunk-dz3q485w.js:20716-20766 placement (2.1.88 match: findCurrentIDE, 0.867)
function findCurrentIDE(type) {
  return type === "sse-ide" || type === "ws-ide";
}
//@ chunk-dz3q485w.js:20766-20814 placement
function connectorLabel(name) {
  return factLabel(stripPrefix(name, "claude.ai "), MAX_SERVER_NAME_CHARS);
}
//@ chunk-dz3q485w.js:20814-20841 placement
/**
 * 标记「这个服务器名对应多个客户端」，汇总时视为无法匹配。
 */
var AMBIGUOUS_CLIENT = Symbol("ambiguous");
//@ chunk-dz3q485w.js:20841-21942 placement
/**
 * 汇总 MCP 工具使用情况：把各服务器调用次数与当前 MCP 客户端匹配，区分 claude.ai 连接器、本机服务器与未匹配服务器（IDE 除外），按调用次数排序，并列出已连接但未使用的 claude.ai 连接器。
 */
function summarizeToolsUsed(input) {
  let clientsByKey = new Map();
  for (let client of input.clients) {
    let prefixServerKey = getPrefixServerKey(client.name);
    let existing = clientsByKey.get(prefixServerKey);
    let isCloudConnector =
      !isClaudeAiConnectorClient(client) &&
      (isClaudeAiServerName(client.name) || client.config.type === "claudeai-proxy");
    clientsByKey.set(
      prefixServerKey,
      !isCloudConnector &&
        (existing === undefined || (existing !== AMBIGUOUS_CLIENT && existing.name === client.name))
        ? client
        : AMBIGUOUS_CLIENT,
    );
  }
  let servers = [];
  let matchedKeys = new Set();
  for (let [serverKey, calls] of input.counts) {
    let client = clientsByKey.get(serverKey);
    let knownClient = client === AMBIGUOUS_CLIENT ? undefined : client;
    if (knownClient !== undefined ? findCurrentIDE(knownClient.config.type) : serverKey === "ide") continue;
    matchedKeys.add(serverKey);
    if (knownClient !== undefined && isClaudeAiConnectorClient(knownClient))
      servers.push({
        name: connectorLabel(knownClient.name),
        calls,
        where: "claudeai",
        transport: null,
        connectedNow: isConnectedOrCachedClient(knownClient),
      });
    else if (knownClient !== undefined)
      servers.push({
        name: factLabel(serverKey, MAX_SERVER_NAME_CHARS),
        calls,
        where: "local",
        transport: factLabel(knownClient.config.type ?? "stdio", 16),
        connectedNow: null,
      });
    else
      servers.push({
        name: factLabel(serverKey, MAX_SERVER_NAME_CHARS),
        calls,
        where: "unknown",
        transport: null,
        connectedNow: null,
      });
  }
  servers.sort((a, b) => b.calls - a.calls || a.name.localeCompare(b.name));
  let otherConnectors = input.clients
    .filter(
      (client) =>
        isClaudeAiConnectorClient(client) &&
        isConnectedOrCachedClient(client) &&
        !matchedKeys.has(getPrefixServerKey(client.name)),
    )
    .map((client) => connectorLabel(client.name))
    .sort((a, b) => a.localeCompare(b));
  if (
    servers.length === 0 &&
    (otherConnectors.length === 0 || (input.sessionsScanned === 0 && !input.includesCurrentConversation))
  )
    return null;
  return {
    servers,
    otherConnectors: otherConnectors.slice(0, MAX_CONNECTORS_SHOWN),
    moreConnectors: Math.max(0, otherConnectors.length - MAX_CONNECTORS_SHOWN),
    sessionsScanned: input.sessionsScanned,
    includesCurrentConversation: input.includesCurrentConversation,
  };
}
//@ chunk-dz3q485w.js:21942-22085 placement
/**
 * 只保留已匹配到配置的服务器，去掉未知服务器与其他连接器信息。
 */
function knownServersOnly(summary) {
  let filtered = summary.servers.filter((server) => server.where !== "unknown");
  return filtered.length === 0
    ? null
    : {
        ...summary,
        servers: filtered,
        otherConnectors: [],
        moreConnectors: 0,
      };
}
//@ chunk-dz3q485w.js:22085-22466 placement
/**
 * 描述一个 MCP 服务器的位置：claude.ai 连接器（是否连接）、本机服务器或未匹配。
 */
function serverWhereText(config, machineLabel) {
  switch (config.where) {
    case "claudeai":
      return config.connectedNow === false
        ? "claude.ai connector, not connected when this was written"
        : "claude.ai connector";
    case "local":
      return isLocalMcpServer(config)
        ? `local ${config.transport ?? "stdio"} server, stays on ${machineLabel}`
        : `${config.transport} server configured on ${machineLabel}, not a claude.ai connector`;
    case "unknown":
      return "not matched to one server configured in this session";
  }
}
//@ chunk-dz3q485w.js:22466-22541 placement (2.1.88 match: isLocalMcpServer, 0.883)
function isLocalMcpServer(config) {
  return (config.transport ?? "stdio") === "stdio" || config.transport === "sdk";
}
//@ chunk-dz3q485w.js:22541-22629 placement
/**
 * 取前 MAX_SERVERS_SHOWN 个服务器并给出剩余数，用于列表与短语两种输出。
 */
function limitServersShown(summary) {
  return {
    shown: summary.servers.slice(0, MAX_SERVERS_SHOWN),
    more: Math.max(0, summary.servers.length - MAX_SERVERS_SHOWN),
  };
}
//@ chunk-dz3q485w.js:22629-22802 placement
function toolsUsedLines(summary, machineLabel) {
  let { shown, more } = limitServersShown(summary);
  let mapped = shown.map(
    (server) =>
      `- ${server.name}: ${server.calls} ${plural(server.calls, "call")} (${serverWhereText(server, machineLabel)})`,
  );
  if (more > 0) mapped.push(`- +${more} more ${plural(more, "server")}`);
  return mapped;
}
//@ chunk-dz3q485w.js:22802-23162 placement
/**
 * 生成工具使用情况的简短短语：claude.ai 连接器与本机服务器名称及数量。
 */
function toolsUsedPhrase(summary, machineLabel) {
  let { shown, more } = limitServersShown(summary);
  let describeWhere = (where, countLabel) => {
    let mapped = shown
      .filter((server) => server.where === where)
      .map((server) => `\u201C${server.name}\u201D`);
    return mapped.length > 0 ? `${mapped.join(", ")} (${countLabel(mapped.length)})` : "";
  };
  let filtered = [
    describeWhere("claudeai", (count) => plural(count, "claude.ai connector")),
    describeWhere("local", () => `configured on ${machineLabel}`),
  ].filter((part) => part !== "");
  if (filtered.length === 0) return null;
  return [...filtered, ...(more > 0 ? [`+${more} more`] : [])].join("; ");
}
//@ chunk-dz3q485w.js:23162-23361 placement
function unusedConnectorsLine(tools) {
  return tools.otherConnectors.length > 0
    ? `Connected on claude.ai but not used in these sessions: ${tools.otherConnectors.join(", ")}${tools.moreConnectors > 0 ? ` (+${tools.moreConnectors} more)` : ""}.`
    : null;
}
//@ chunk-dz3q485w.js:23361-23450 placement
function joinWithAnd(parts) {
  return parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}
//@ chunk-dz3q485w.js:23450-24185 placement
/**
 * 生成发送对话框里的 MCP 使用说明：用到的 claude.ai 连接器与本机服务器（说明本机服务器不会带到项目）。
 */
function toolsUsedDialogLine(summary, machine) {
  let first = true;
  let label = (onlyLocal) => {
    let callsSuffix = first ? ` ${plural(onlyLocal.calls, "call")}` : "";
    first = false;
    return `\u201C${onlyLocal.name}\u201D (${onlyLocal.calls}${callsSuffix})`;
  };
  let { shown, more } = limitServersShown(summary);
  let connectors = shown
    .filter((server) => server.where === "claudeai")
    .map(label)
    .join(", ");
  let localServers = shown.filter((server) => server.where === "local");
  let [onlyLocal] = localServers;
  let localText =
    onlyLocal !== undefined && localServers.length === 1
      ? isLocalMcpServer(onlyLocal)
        ? `${label(onlyLocal)} is a local ${onlyLocal.transport ?? "stdio"} server and stays on ${machine}`
        : `${label(onlyLocal)} is ${/^(http|sse|[aeiou])/.test(onlyLocal.transport ?? "") ? "an" : "a"} ${onlyLocal.transport} server configured on ${machine}, not a connector`
      : localServers.length > 1
        ? localServers.every(isLocalMcpServer)
          ? `${joinWithAnd(localServers.map(label))} are local servers and stay on ${machine}`
          : `${joinWithAnd(localServers.map(label))} are servers configured on ${machine}, not connectors`
        : "";
  if (connectors === "" && localText === "") return null;
  let moreText = more > 0 ? `${more} more not listed` : "";
  return `${[connectors, localText, moreText].filter((part) => part !== "").join("; ")}.`;
}
//@ chunk-dz3q485w.js:24185-24276 placement
var MAX_SESSIONS_SCANNED = 3;
var SESSION_HEAD_CHARS = 3000;
var SESSION_TAIL_CHARS = 9000;
var USER_TEXT_CHARS_PER_TURN = 600;
var ASSISTANT_TEXT_CHARS_PER_TURN = 400;
var GIT_LOG_COMMIT_COUNT = 20;
var DOC_NAME_CHARS = 200;
var DOC_EXCERPT_CHARS = 1500;
var MAX_DOC_EXCERPTS = 4;
var MAX_DIR_ENTRIES = 30;
var MAX_BRIEF_CHARS = 46000;
var MAX_DOC_FILE_BYTES = 1048576;
//@ chunk-dz3q485w.js:24716-24809 placement
/**
 * 统一换行符，并把每一行按网络路径规范化（去掉行尾空白）。
 */
function normalizeNewlinesAndPaths(text) {
  return text
    .replace(
      /\r\n?/g,
      `
`,
    )
    .split(
      `
`,
    )
    .map((line) => isNetworkPath(line).trimEnd()).join(`
`);
}
//@ chunk-dz3q485w.js:24809-24934 placement
function makeQuoteFence(label, nonce = randomBytes(4).toString("hex")) {
  return {
    begin: `-----BEGIN ${label} ${nonce} (quoted data)-----`,
    end: `-----END ${label} ${nonce}-----`,
  };
}
//@ chunk-dz3q485w.js:24934-25044 placement
function fenceQuotedText(quoteFence, text) {
  let joined = text
    .trim()
    .split(
      `
`,
    )
    .map((line) => (isMarkerShapedLine(line) ? defangMarkerLine(line) : line)).join(`
`);
  return `${quoteFence.begin}
${joined}
${quoteFence.end}`;
}
//@ chunk-dz3q485w.js:25044-25100 placement
var LOCAL_HISTORY_FENCE_LABEL = "LOCAL HISTORY";
var regExp = new RegExp(`(^|${WORD_BOUNDARY_PATTERN})@`, "gu");
//@ chunk-dz3q485w.js:25100-25148 placement
/**
 * 把 @ 提及标记替换成全角＠（复制进引用块前的中和）。
 */
function neutralizeAtMentions(text) {
  return text.replace(regExp, "$1\uFF20");
}
//@ chunk-dz3q485w.js:25148-25229 placement
/**
 * 把本地历史文本 @ 中和后包成带随机码的引用块。
 */
function quoteLocalHistory(text) {
  let quoteFence = makeQuoteFence(LOCAL_HISTORY_FENCE_LABEL);
  return {
    fence: quoteFence,
    text: fenceQuotedText(quoteFence, text.replace(regExp, "$1\uFF20")),
  };
}
//@ chunk-dz3q485w.js:25229-25336 placement
function defangMarkerLine(line) {
  return Array.from(line, (char) =>
    /[A-Za-z]/.test(char) ? char.toLowerCase() : /[0-9]/.test(char) ? char : "~",
  ).join("");
}
//@ chunk-dz3q485w.js:25336-25346 placement
var MAX_SUMMARY_LINE_CHARS = 46;
//@ chunk-dz3q485w.js:25346-25436 placement
/**
 * 生成一行摘要：压空白、按网络路径处理、截断到上限。
 */
function oneLineSummary(projectName) {
  return truncateToLength(
    isNetworkPath(projectName.replace(/\s+/g, " ")).replace(/\s+/g, " ").trim(),
    MAX_SUMMARY_LINE_CHARS,
  ).trim();
}
export {
  oneLineSummary,
  toolsUsedSessionSlot,
  toolsUsedDialogLine,
  knownServersOnly,
  quoteLocalHistory,
  neutralizeAtMentions,
  GIT_LOG_COMMIT_COUNT,
  DOC_NAME_CHARS,
  MAX_DOC_EXCERPTS,
  MAX_DIR_ENTRIES,
  DOC_EXCERPT_CHARS,
  MAX_DOC_FILE_BYTES,
  normalizeNewlinesAndPaths,
  emptyCallCounts,
  summarizeToolsUsed,
  countMcpCallsByServer,
  toolsUsedLines,
  unusedConnectorsLine,
  TOOLS_USED_HEADING,
  MAX_BRIEF_CHARS,
  SESSION_HEAD_CHARS,
  SESSION_TAIL_CHARS,
  MAX_SESSIONS_SCANNED,
  USER_TEXT_CHARS_PER_TURN,
  ASSISTANT_TEXT_CHARS_PER_TURN,
  isMarkerShapedLine,
  makeQuoteFence,
  fenceQuotedText,
  toolsUsedPhrase,
};
