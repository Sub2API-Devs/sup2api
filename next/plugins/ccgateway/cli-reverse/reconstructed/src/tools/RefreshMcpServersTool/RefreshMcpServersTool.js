/**
 * tools/RefreshMcpServersTool/RefreshMcpServersTool.ts
 *
 * 2.1.316 新增：刷新 MCP 服务器工具 schema。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fmnbrxwy.js (1)
 * attribution: placement 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  array,
  _enum,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { renderToolUseMessage_3 } from "../ListMcpResourcesTool/UI.js";
import { getMcpPrefix, isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { refreshMcpServerTools } from "../../services/mcp/client.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:128824-131997 placement
/**
 * RefreshMcpServers 的输出 schema（每个服务器的刷新状态）。
 */
var RefreshMcpServersSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var refreshMcpServersOutputSchema;
var RefreshMcpServersTool;
deferInit("chunk-fmnbrxwy.js:128824", () => {
  RefreshMcpServersSchema = DoctorLazy(() =>
    objectSchema({
      server: stringSchema()
        .optional()
        .describe("Optional server name: refresh only this server. Omit to refresh all connected servers."),
    }),
  );
  refreshMcpServersOutputSchema = DoctorLazy(() =>
    array(
      objectSchema({
        server: stringSchema().describe("Server name"),
        status: _enum(["refreshed", "error", "not_connected"]).describe(
          "refreshed: tool list re-queried and applied. error: the re-query failed and the previous tool set was kept. not_connected: the server has no live connection to query (this tool never dials).",
        ),
        toolCount: numberSchema().optional().describe("Number of tools now available from this server"),
        added: array(stringSchema()).optional().describe("Tool names this refresh added"),
        removed: array(stringSchema()).optional().describe("Tool names this refresh removed"),
        error: stringSchema().optional().describe("Why the refresh failed or the server was unavailable"),
      }),
    ),
  );
  RefreshMcpServersTool = buildTool({
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      return input.server ?? "";
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
    create(toolContext) {
      return {
        async call(input) {
          let callContext = {
            isolationLatch: toolContext.isolationLatch,
            session: toolContext.session,
            options: {
              mcpClients: toolContext.turnMcpClients,
            },
          };
          let isolationCheck = checkWebIsolation(RefreshMcpServersTool, callContext, input);
          if (isolationCheck.denyMessage)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              isolationCheck.denyMessage,
              "Blocked by the web search / connector isolation policy",
            );
          let { turnMcpClients, tools } = toolContext;
          let { server } = input;
          let { filterToolsByDenyRules } = await import("../../utils/permissions/filterToolsByDenyRules.js");
          let permissions = toolContext.permissions();
          let targetClients = server
            ? findServersByName(turnMcpClients, server)
            : renderToolUseMessage_3(turnMcpClients, REFRESH_MCP_TOOLS_TOOL_NAME, permissions);
          if (server && targetClients.length === 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Server "${server}" not found. Available servers: ${turnMcpClients.map((turnMcpClient) => turnMcpClient.name).join(", ")}`,
              "MCP server not found",
            );
          return {
            data: await Promise.all(
              targetClients.map(async (client) => {
                if (client.type !== "connected")
                  return {
                    server: client.name,
                    status: "not_connected",
                    error: `server connection state is "${client.type}" \u2014 this tool only re-reads tool lists over live connections and never dials`,
                  };
                let mcpPrefix = getMcpPrefix(client.name);
                let previousTools = new Set(
                  tools
                    .filter((tool) => isToolFromMcpServer(tool, client.name, mcpPrefix))
                    .map((tool) => tool.name)
                    .filter((toolName) => typeof toolName === "string"),
                );
                let poolNotUpdated = false;
                let refreshResult = await refreshMcpServerTools(
                  client,
                  (nextTools, prevTools) => {
                    poolNotUpdated = !swapMcpServerTools(nextTools, prevTools, client.config);
                  },
                  toolContext.storageV5,
                );
                if (refreshResult.status === "kept-previous")
                  return {
                    server: client.name,
                    status: "error",
                    error: refreshResult.error ?? "tools/list failed; the previous tool set was kept",
                  };
                if (poolNotUpdated)
                  return {
                    server: client.name,
                    status: "error",
                    error:
                      "refreshed the server, but the live tool pool was not updated \u2014 the server may have been removed or disconnected while the refresh was in flight, or its tools are not managed in this session mode; if it is still configured, the refreshed list applies on the next pool rebuild",
                  };
                let filtered = filterToolsByDenyRules(refreshResult.newTools, permissions)
                  .map((tool) => tool.name)
                  .filter((toolName) => typeof toolName === "string");
                let currentTools = new Set(filtered);
                return {
                  server: client.name,
                  status: "refreshed",
                  toolCount: filtered.length,
                  added: filtered.filter((toolName) => !previousTools.has(toolName)),
                  removed: [...previousTools].filter((toolName) => !currentTools.has(toolName)),
                };
              }),
            ),
          };
        },
      };
    },
    renderToolUseMessage(input) {
      return input.server ? `Refresh MCP tools from server "${input.server}"` : "Refresh all MCP tool lists";
    },
    userFacingName: () => "refreshMcpTools",
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      if (!result || result.length === 0)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: "No MCP servers to refresh.",
        };
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: jsonStringify(result),
      };
    },
  });
});
export { RefreshMcpServersTool };
