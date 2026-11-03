/**
 * tools/ListMcpResourcesTool/ListMcpResourcesTool.ts
 *
 * ListMcpResources 工具：列出已连接 MCP 服务器的资源（过滤 MCP Apps UI 资源）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ListMcpResourcesTool/ListMcpResourcesTool.ts
 * pieces: chunk-9ycd12hk.js (4)
 * attribution: fingerprint 2, layout 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { LISTMCPRESOURCESTOOL, LIST_MCP_RESOURCES_DESCRIPTION, LIST_MCP_RESOURCES_PROMPT } from "./prompt.js";
import { Lfn } from "../../services/mcp/withheldResources.js";
import { findServersByName } from "../../services/mcp/normalization.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  AbortError,
  isAbortError,
  errorMessage,
} from "../../utils/errors.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { isSameOriginAsCcr } from "../../services/mcp/ccrMcpUrls.js";
import { isMcpAppResource } from "../../services/mcp/toolNameLimits.js";
import { logForDebugging } from "../../utils/debug.js";
import { READMCPRESOURCETOOL } from "../ReadMcpResourceTool/prompt.js";
import { logMCPError } from "../../utils/log.js";
import { jsonStringify } from "../../utils/slowOperations.js";

/**
 * ListMcpResources 输入 schema（server 可选）与输出 schema（uri/name/mimeType/description/server 数组）。
 */
//@ chunk-9ycd12hk.js:1114-1475 fingerprint = outputSchema (0.862)
var listMcpResourcesInputSchema = DoctorLazy(() =>
    u({ server: o().optional().describe("Optional server name to filter resources by") }),
  ),
  listMcpResourcesOutputSchema = DoctorLazy(() =>
    A(
      u({
        uri: o().describe("Resource URI"),
        name: o().describe("Resource name"),
        mimeType: o().optional().describe("MIME type of the resource"),
        description: o().optional().describe("Resource description"),
        server: o().describe("Server that provides this resource"),
      }),
    ),
  );
//@ chunk-9ycd12hk.js:1475-1778 layout
function sanitizeResourceListForCreation(e) {
  let { hasMcpInboundDoor: hasMcpInboundDoor } = require("./chunk-dtcp5kc6.js");
  if (!Array.isArray(e) || !hasMcpInboundDoor()) return e;
  return e
    .filter(isPlainObject)
    .map(({ uri: uri, name: n, mimeType: mimeType, description: description, server: server }) => ({
      uri: stringOr("", uri),
      name: stringOr("", n),
      ...(typeof mimeType === "string" && { mimeType: mimeType }),
      ...(typeof description === "string" && { description: description }),
      server: stringOr("", server),
    }));
}
//@ chunk-9ycd12hk.js:1778-1825 layout
function stringOr(e, s) {
  return typeof s === "string" ? s : e;
}
/**
 * ListMcpResources 工具（别名 ListMcpResources，shouldDefer，只读可并发，backgrounding never）。可选 server 过滤；对每个有 resources 能力的已连接服务器 ensureConnectedClient 后拉 resources/list（claude.ai 代理/特定 HTTP 服务器出现发现错误时重连重试一次），过滤掉 MCP Apps UI 资源（ui://、text/html;profile=mcp-app）；结果为空时提示"服务器可能仍提供工具"。
 */
//@ chunk-9ycd12hk.js:1825-3769 fingerprint = ListMcpResourcesTool (0.516)
var ListMcpResourcesTool = buildTool({
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  toAutoClassifierInput(e) {
    return e.server ?? "";
  },
  shouldDefer: !0,
  name: LISTMCPRESOURCESTOOL,
  aliases: ["ListMcpResources"],
  searchHint: "list resources from connected MCP servers",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return LIST_MCP_RESOURCES_DESCRIPTION;
  },
  async prompt() {
    return LIST_MCP_RESOURCES_PROMPT;
  },
  get inputSchema() {
    return listMcpResourcesInputSchema();
  },
  get outputSchema() {
    return listMcpResourcesOutputSchema();
  },
  create(e) {
    return {
      async call(s, { signal: l }) {
        let filtered = e.turnMcpClients.filter((turnMcpClient) => !Lfn(turnMcpClient, e.agentId)),
          { server: server } = s,
          f = server ? findServersByName(filtered, server) : filtered;
        if (server && f.length === 0)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Server "${server}" not found. Available servers: ${filtered.map((i) => i.name).join(", ")}`,
            "MCP server not found",
          );
        let results = await Promise.all(
          f.map(async (i) => {
            if (!isConnectedOrCached(i) || !i.capabilities?.resources) return [];
            let mcpClientModule = require("./chunk-asne9cp8.js").mcpClientModule(),
              y = () =>
                mcpClientModule.ensureConnectedClient(i, { signal: l, context: "MCP resource listing" });
            try {
              let c = await y();
              if (Lfn(c, e.agentId)) return [];
              let R = await raceWithAbortSignal(
                mcpClientModule.fetchResourcesForClient(c),
                l,
                () => new AbortError(),
              );
              if (
                (i.config.type === "claudeai-proxy" ||
                  (i.config.type === "http" && isSameOriginAsCcr(i.config.url))) &&
                mcpClientModule.getDiscoveryFetchError(R) !== void 0
              ) {
                let S = await y();
                if (S !== c)
                  R = await raceWithAbortSignal(
                    mcpClientModule.fetchResourcesForClient(S),
                    l,
                    () => new AbortError(),
                  );
              }
              let filtered = R.filter((S) => !isMcpAppResource(S));
              if (filtered.length < R.length)
                logForDebugging(
                  `MCP server "${i.name}": ${R.length - filtered.length} MCP Apps UI resource(s) left out of ${LISTMCPRESOURCESTOOL}'s list for the model (a ui:// URI, or text/html with profile=mcp-app); ${READMCPRESOURCETOOL} can still read them by URI`,
                );
              return filtered;
            } catch (error) {
              if (!isAbortError(error)) logMCPError(i.name, errorMessage(error));
              return [];
            }
          }),
        );
        if (l.aborted) throw new AbortError();
        return { data: results.flat() };
      },
    };
  },
  renderToolUseMessage(e) {
    return e.server ? `List MCP resources from server "${e.server}"` : "List all MCP resources";
  },
  userFacingName: () => "listMcpResources",
  stripForCreation: sanitizeResourceListForCreation,
  mapToolResultToToolResultBlockParam(e, s) {
    if (!e || e.length === 0)
      return {
        tool_use_id: s,
        type: "tool_result",
        content: "No resources found. MCP servers may still provide tools even if they have no resources.",
      };
    return { tool_use_id: s, type: "tool_result", content: jsonStringify(e) };
  },
});

export { ListMcpResourcesTool };
