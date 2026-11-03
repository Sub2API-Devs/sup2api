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
import { randomBytes, randomBytes as randomBytes_2 } from "crypto";
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
import { tMn } from "../mcp/normalization.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { gq } from "../../utils/attachments/atMentions.js";

//@ chunk-dz3q485w.js:19887-20046 placement
function isMarkerShapedLine(e) {
  let replaced = e.normalize("NFKC").replace(/[\p{Cf}\p{Mn}]+/gu, "");
  return (
    (LETTER_REGEX.test(replaced) &&
      LEADING_PUNCT_RUN_REGEX.test(replaced) &&
      TRAILING_PUNCT_RUN_REGEX.test(replaced)) ||
    FENCE_MARKER_WORDS_REGEX.test(replaced.replace(/[^\p{L}\p{N}]+/gu, " "))
  );
}
//@ chunk-dz3q485w.js:20046-20140 placement
var Ce = "Tools these sessions used",
  qt = 6,
  Xt = 5,
  Qe = 40,
  wht = new SessionRootSlot(() => ({ current: null, read: null }));
//@ chunk-dz3q485w.js:20140-20190 placement
function Te() {
  return { counts: new Map(), seen: new Set() };
}
/**
 * 统计消息中按 MCP 服务器分组的工具调用次数（按 tool_use id 去重）。
 */
//@ chunk-dz3q485w.js:20190-20619 placement
function countMcpCallsByServer(e, n = Te()) {
  let { counts: counts, seen: seen } = n;
  for (let a of e) {
    if (a === null || typeof a !== "object" || a.type !== "assistant" || a.message == null) continue;
    for (let l of toContentBlocks(a.message.content)) {
      if (l.type !== "tool_use" || typeof l.name !== "string") continue;
      let c = mcpInfoFromString(l.name);
      if (c === null || (c.toolName ?? "") === "") continue;
      if (typeof l.id === "string" && l.id !== "") {
        if (seen.has(l.id)) continue;
        seen.add(l.id);
      }
      counts.set(c.serverName, (counts.get(c.serverName) ?? 0) + 1);
    }
  }
  return counts;
}
//@ chunk-dz3q485w.js:20619-20654 placement
function Ze(e) {
  return isClaudeAiProxyServer(e.config);
}
//@ chunk-dz3q485w.js:20654-20716 placement
function Kt(e) {
  return e.type === "connected" || e.type === "cached";
}
//@ chunk-dz3q485w.js:20716-20766 placement = findCurrentIDE (0.867)
function findCurrentIDE(e) {
  return e === "sse-ide" || e === "ws-ide";
}
//@ chunk-dz3q485w.js:20766-20814 placement
function Vt(e) {
  return factLabel(stripPrefix(e, "claude.ai "), Qe);
}
//@ chunk-dz3q485w.js:20814-20841 placement
var Je = Symbol("ambiguous");
/**
 * 汇总 MCP 工具使用情况：把各服务器调用次数与当前 MCP 客户端匹配，区分 claude.ai 连接器、本机服务器与未匹配服务器（IDE 除外），按调用次数排序，并列出已连接但未使用的 claude.ai 连接器。
 */
//@ chunk-dz3q485w.js:20841-21942 placement
function summarizeToolsUsed(input) {
  let clientsByKey = new Map();
  for (let client of input.clients) {
    let c = getPrefixServerKey(client.name),
      h = clientsByKey.get(c),
      b = !Ze(client) && (tMn(client.name) || client.config.type === "claudeai-proxy");
    clientsByKey.set(c, !b && (h === void 0 || (h !== Je && h.name === client.name)) ? client : Je);
  }
  let servers = [],
    matchedKeys = new Set();
  for (let [l, c] of input.counts) {
    let h = clientsByKey.get(l),
      b = h === Je ? void 0 : h;
    if (b !== void 0 ? findCurrentIDE(b.config.type) : l === "ide") continue;
    if ((matchedKeys.add(l), b !== void 0 && Ze(b)))
      servers.push({ name: Vt(b.name), calls: c, where: "claudeai", transport: null, connectedNow: Kt(b) });
    else if (b !== void 0)
      servers.push({
        name: factLabel(l, Qe),
        calls: c,
        where: "local",
        transport: factLabel(b.config.type ?? "stdio", 16),
        connectedNow: null,
      });
    else
      servers.push({
        name: factLabel(l, Qe),
        calls: c,
        where: "unknown",
        transport: null,
        connectedNow: null,
      });
  }
  servers.sort((l, c) => c.calls - l.calls || l.name.localeCompare(c.name));
  let otherConnectors = input.clients
    .filter((client) => Ze(client) && Kt(client) && !matchedKeys.has(getPrefixServerKey(client.name)))
    .map((l) => Vt(l.name))
    .sort((l, c) => l.localeCompare(c));
  if (
    servers.length === 0 &&
    (otherConnectors.length === 0 || (input.sessionsScanned === 0 && !input.includesCurrentConversation))
  )
    return null;
  return {
    servers: servers,
    otherConnectors: otherConnectors.slice(0, Xt),
    moreConnectors: Math.max(0, otherConnectors.length - Xt),
    sessionsScanned: input.sessionsScanned,
    includesCurrentConversation: input.includesCurrentConversation,
  };
}
/**
 * 只保留已匹配到配置的服务器，去掉未知服务器与其他连接器信息。
 */
//@ chunk-dz3q485w.js:21942-22085 placement
function knownServersOnly(e) {
  let filtered = e.servers.filter((server) => server.where !== "unknown");
  return filtered.length === 0 ? null : { ...e, servers: filtered, otherConnectors: [], moreConnectors: 0 };
}
/**
 * 描述一个 MCP 服务器的位置：claude.ai 连接器（是否连接）、本机服务器或未匹配。
 */
//@ chunk-dz3q485w.js:22085-22466 placement
function serverWhereText(e, n) {
  switch (e.where) {
    case "claudeai":
      return e.connectedNow === !1
        ? "claude.ai connector, not connected when this was written"
        : "claude.ai connector";
    case "local":
      return isLocalMcpServer(e)
        ? `local ${e.transport ?? "stdio"} server, stays on ${n}`
        : `${e.transport} server configured on ${n}, not a claude.ai connector`;
    case "unknown":
      return "not matched to one server configured in this session";
  }
}
//@ chunk-dz3q485w.js:22466-22541 placement = isLocalMcpServer (0.883)
function isLocalMcpServer(config) {
  return (config.transport ?? "stdio") === "stdio" || config.transport === "sdk";
}
//@ chunk-dz3q485w.js:22541-22629 placement
function st(e) {
  return { shown: e.servers.slice(0, qt), more: Math.max(0, e.servers.length - qt) };
}
//@ chunk-dz3q485w.js:22629-22802 placement
function toolsUsedLines(e, n) {
  let { shown: shown, more: more } = st(e),
    mapped = shown.map(
      (l) => `- ${l.name}: ${l.calls} ${plural(l.calls, "call")} (${serverWhereText(l, n)})`,
    );
  if (more > 0) mapped.push(`- +${more} more ${plural(more, "server")}`);
  return mapped;
}
/**
 * 生成工具使用情况的简短短语：claude.ai 连接器与本机服务器名称及数量。
 */
//@ chunk-dz3q485w.js:22802-23162 placement
function toolsUsedPhrase(e, n) {
  let { shown: shown, more: more } = st(e),
    a = (c, h) => {
      let mapped = shown.filter((w) => w.where === c).map((w) => `\u201C${w.name}\u201D`);
      return mapped.length > 0 ? `${mapped.join(", ")} (${h(mapped.length)})` : "";
    },
    filtered = [
      a("claudeai", (c) => plural(c, "claude.ai connector")),
      a("local", () => `configured on ${n}`),
    ].filter((c) => c !== "");
  if (filtered.length === 0) return null;
  return [...filtered, ...(more > 0 ? [`+${more} more`] : [])].join("; ");
}
//@ chunk-dz3q485w.js:23162-23361 placement
function unusedConnectorsLine(e) {
  return e.otherConnectors.length > 0
    ? `Connected on claude.ai but not used in these sessions: ${e.otherConnectors.join(", ")}${e.moreConnectors > 0 ? ` (+${e.moreConnectors} more)` : ""}.`
    : null;
}
//@ chunk-dz3q485w.js:23361-23450 placement
function Zt(e) {
  return e.length <= 1 ? (e[0] ?? "") : `${e.slice(0, -1).join(", ")} and ${e.at(-1)}`;
}
/**
 * 生成发送对话框里的 MCP 使用说明：用到的 claude.ai 连接器与本机服务器（说明本机服务器不会带到项目）。
 */
//@ chunk-dz3q485w.js:23450-24185 placement
function toolsUsedDialogLine(summary, machine) {
  let first = !0,
    label = (j) => {
      let S = first ? ` ${plural(j.calls, "call")}` : "";
      return ((first = !1), `\u201C${j.name}\u201D (${j.calls}${S})`);
    },
    { shown: shown, more: more } = st(summary),
    connectors = shown
      .filter((j) => j.where === "claudeai")
      .map(label)
      .join(", "),
    localServers = shown.filter((j) => j.where === "local"),
    [onlyLocal] = localServers,
    localText =
      onlyLocal !== void 0 && localServers.length === 1
        ? isLocalMcpServer(onlyLocal)
          ? `${label(onlyLocal)} is a local ${onlyLocal.transport ?? "stdio"} server and stays on ${machine}`
          : `${label(onlyLocal)} is ${/^(http|sse|[aeiou])/.test(onlyLocal.transport ?? "") ? "an" : "a"} ${onlyLocal.transport} server configured on ${machine}, not a connector`
        : localServers.length > 1
          ? localServers.every(isLocalMcpServer)
            ? `${Zt(localServers.map(label))} are local servers and stay on ${machine}`
            : `${Zt(localServers.map(label))} are servers configured on ${machine}, not connectors`
          : "";
  if (connectors === "" && localText === "") return null;
  let moreText = more > 0 ? `${more} more not listed` : "";
  return `${[connectors, localText, moreText].filter((j) => j !== "").join("; ")}.`;
}
//@ chunk-dz3q485w.js:24185-24276 placement
var Qo = 3,
  en = 3000,
  tn = 9000,
  es = 600,
  ts = 400,
  rn = 20,
  ns = 200,
  sn = 1500,
  os = 4,
  ss = 30,
  it = 46000,
  rs = 1048576;
//@ chunk-dz3q485w.js:24716-24809 placement
function ln(e) {
  return e
    .replace(
      /\r\n?/g,
      `
`,
    )
    .split(
      `
`,
    )
    .map((n) => isNetworkPath(n).trimEnd()).join(`
`);
}
//@ chunk-dz3q485w.js:24809-24934 placement
function makeQuoteFence(e, n = randomBytes_2(4).toString("hex")) {
  return { begin: `-----BEGIN ${e} ${n} (quoted data)-----`, end: `-----END ${e} ${n}-----` };
}
//@ chunk-dz3q485w.js:24934-25044 placement
function fenceQuotedText(e, n) {
  let joined = n
    .trim()
    .split(
      `
`,
    )
    .map((r) => (isMarkerShapedLine(r) ? defangMarkerLine(r) : r)).join(`
`);
  return `${e.begin}
${joined}
${e.end}`;
}
//@ chunk-dz3q485w.js:25044-25100 placement
var is = "LOCAL HISTORY",
  regExp = new RegExp(`(^|${gq})@`, "gu");
//@ chunk-dz3q485w.js:25100-25148 placement
function Eht(e) {
  return e.replace(regExp, "$1\uFF20");
}
//@ chunk-dz3q485w.js:25148-25229 placement
function _Ns(e) {
  let n = makeQuoteFence(is);
  return { fence: n, text: fenceQuotedText(n, e.replace(regExp, "$1\uFF20")) };
}
//@ chunk-dz3q485w.js:25229-25336 placement
function defangMarkerLine(e) {
  return Array.from(e, (n) => (/[A-Za-z]/.test(n) ? n.toLowerCase() : /[0-9]/.test(n) ? n : "~")).join("");
}
//@ chunk-dz3q485w.js:25336-25346 placement
var ls = 46;
//@ chunk-dz3q485w.js:25346-25436 placement
function coe(e) {
  return truncateToLength(isNetworkPath(e.replace(/\s+/g, " ")).replace(/\s+/g, " ").trim(), ls).trim();
}

export {
  coe,
  wht,
  toolsUsedDialogLine,
  knownServersOnly,
  _Ns,
  Eht,
  rn,
  ns,
  os,
  ss,
  sn,
  rs,
  ln,
  Te,
  summarizeToolsUsed,
  countMcpCallsByServer,
  toolsUsedLines,
  unusedConnectorsLine,
  Ce,
  it,
  en,
  tn,
  Qo,
  es,
  ts,
  isMarkerShapedLine,
  makeQuoteFence,
  fenceQuotedText,
  toolsUsedPhrase,
};
