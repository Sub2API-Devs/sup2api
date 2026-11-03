/**
 * tools/RefreshMcpServersTool/RefreshMcpServersTool.ts
 *
 * 2.1.316 新增：刷新 MCP 服务器工具 schema。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kxyd0g16.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, array, _enum, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import {
  REFRESH_MCP_TOOLS_TOOL_NAME,
  REFRESH_MCP_TOOLS_PROMPT_2,
  REFRESH_MCP_TOOLS_PROMPT,
} from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { getMcpClientsFromAccessor, swapMcpServerTools } from "../../bootstrap/state.js";
import { checkWebIsolation } from "../../services/tools/webToolIsolation.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { findServersByName } from "../../services/mcp/normalization.js";
import { getMcpPrefix, isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { refreshMcpServerTools } from "../../services/mcp/client.js";
import { jsonStringify } from "../../utils/slowOperations.js";

//@ chunk-kxyd0g16.js:114110-117273 placement
/**
 * RefreshMcpServers 的输出 schema（每个服务器的刷新状态）。
 */
var RefreshMcpServersSchema = DoctorLazy(() =>
  u({
    server: string()
      .optional()
      .describe("Optional server name: refresh only this server. Omit to refresh all connected servers."),
  }),
);
var refreshMcpServersOutputSchema = DoctorLazy(() =>
  array(
    u({
      server: string().describe("Server name"),
      status: _enum(["refreshed", "error", "not_connected"]).describe(
        "refreshed: tool list re-queried and applied. error: the re-query failed and the previous tool set was kept. not_connected: the server has no live connection to query (this tool never dials).",
      ),
      toolCount: E().optional().describe("Number of tools now available from this server"),
      added: array(string()).optional().describe("Tool names this refresh added"),
      removed: array(string()).optional().describe("Tool names this refresh removed"),
      error: string().optional().describe("Why the refresh failed or the server was unavailable"),
    }),
  ),
);
var RefreshMcpServersTool = buildTool({
  isConcurrencySafe() {
    return true;
  },
  isReadOnly() {
    return true;
  },
  toAutoClassifierInput(e) {
    return e.server ?? "";
  },
  name: REFRESH_MCP_TOOLS_TOOL_NAME,
  searchHint:
    "refresh or re-sync tool lists from connected MCP servers, recover missing device or server tools",
  backgrounding: "never",
  maxResultSizeChars: 50000,
  async description() {
    return REFRESH_MCP_TOOLS_PROMPT_2();
  },
  async prompt() {
    return REFRESH_MCP_TOOLS_PROMPT;
  },
  get inputSchema() {
    return RefreshMcpServersSchema();
  },
  get outputSchema() {
    return refreshMcpServersOutputSchema();
  },
  isEnabled() {
    let mcpClientsFromAccessor = getMcpClientsFromAccessor();
    return mcpClientsFromAccessor !== undefined && mcpClientsFromAccessor.length > 0;
  },
  create(e) {
    return {
      async call(r) {
        let n = {
          isolationLatch: e.isolationLatch,
          session: e.session,
          options: {
            mcpClients: e.turnMcpClients,
          },
        };
        let s = checkWebIsolation(RefreshMcpServersTool, n, r);
        if (s.denyMessage)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            s.denyMessage,
            "Blocked by the web search / connector isolation policy",
          );
        let { turnMcpClients, tools } = e;
        let { server } = r;
        let k = server ? findServersByName(turnMcpClients, server) : turnMcpClients;
        let { filterToolsByDenyRules } = await import("./chunk-ge8tt02z.js");
        let S = e.permissions();
        if (server && k.length === 0)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `Server "${server}" not found. Available servers: ${turnMcpClients.map((turnMcpClient) => turnMcpClient.name).join(", ")}`,
            "MCP server not found",
          );
        return {
          data: await Promise.all(
            k.map(async (I) => {
              if (I.type !== "connected")
                return {
                  server: I.name,
                  status: "not_connected",
                  error: `server connection state is "${I.type}" \u2014 this tool only re-reads tool lists over live connections and never dials`,
                };
              let mcpPrefix = getMcpPrefix(I.name);
              let x = new Set(
                tools
                  .filter((tool) => isToolFromMcpServer(tool, I.name, mcpPrefix))
                  .map((tool) => tool.name)
                  .filter((W) => typeof W === "string"),
              );
              let B = false;
              let V = await refreshMcpServerTools(
                I,
                (W, Q) => {
                  B = !swapMcpServerTools(W, Q, I.config);
                },
                e.storageV5,
              );
              if (V.status === "kept-previous")
                return {
                  server: I.name,
                  status: "error",
                  error: V.error ?? "tools/list failed; the previous tool set was kept",
                };
              if (B)
                return {
                  server: I.name,
                  status: "error",
                  error:
                    "refreshed the server, but the live tool pool was not updated \u2014 the server may have been removed or disconnected while the refresh was in flight, or its tools are not managed in this session mode; if it is still configured, the refreshed list applies on the next pool rebuild",
                };
              let filtered = filterToolsByDenyRules(V.newTools, S)
                .map((W) => W.name)
                .filter((W) => typeof W === "string");
              let L = new Set(filtered);
              return {
                server: I.name,
                status: "refreshed",
                toolCount: filtered.length,
                added: filtered.filter((W) => !x.has(W)),
                removed: [...x].filter((W) => !L.has(W)),
              };
            }),
          ),
        };
      },
    };
  },
  renderToolUseMessage(e) {
    return e.server ? `Refresh MCP tools from server "${e.server}"` : "Refresh all MCP tool lists";
  },
  userFacingName: () => "refreshMcpTools",
  mapToolResultToToolResultBlockParam(e, toolUseId) {
    if (!e || e.length === 0)
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: "No MCP servers to refresh.",
      };
    return {
      tool_use_id: toolUseId,
      type: "tool_result",
      content: jsonStringify(e),
    };
  },
});
export { RefreshMcpServersTool };
