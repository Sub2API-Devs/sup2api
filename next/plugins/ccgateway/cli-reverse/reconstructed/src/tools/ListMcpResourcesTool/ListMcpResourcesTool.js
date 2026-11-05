/**
 * tools/ListMcpResourcesTool/ListMcpResourcesTool.ts
 *
 * ListMcpResources 工具：列出已连接 MCP 服务器的资源（过滤 MCP Apps UI 资源）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ListMcpResourcesTool/ListMcpResourcesTool.ts
 * pieces: chunk-zmp9ej5f.js (4)
 * attribution: fingerprint 2, layout 2
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { LISTMCPRESOURCESTOOL, LIST_MCP_RESOURCES_DESCRIPTION, LIST_MCP_RESOURCES_PROMPT } from "./prompt.js";
import { hasWithheldResources } from "../../services/mcp/withheldResources.js";
import { findServersByName } from "../../services/mcp/normalization.js";
import { renderToolUseMessage_3 } from "./UI.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-zmp9ej5f.js:1190-1551 fingerprint (2.1.88 match: outputSchema, 0.862)
/**
 * ListMcpResources 输入 schema（server 可选）与输出 schema（uri/name/mimeType/description/server 数组）。
 */
var listMcpResourcesInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var listMcpResourcesOutputSchema;
deferInit("chunk-zmp9ej5f.js:1190", () => {
  listMcpResourcesInputSchema = DoctorLazy(() =>
    objectSchema({
      server: stringSchema().optional().describe("Optional server name to filter resources by"),
    }),
  );
  listMcpResourcesOutputSchema = DoctorLazy(() =>
    array(
      objectSchema({
        uri: stringSchema().describe("Resource URI"),
        name: stringSchema().describe("Resource name"),
        mimeType: stringSchema().optional().describe("MIME type of the resource"),
        description: stringSchema().optional().describe("Resource description"),
        server: stringSchema().describe("Server that provides this resource"),
      }),
    ),
  );
});
//@ chunk-zmp9ej5f.js:1551-1854 layout
function sanitizeResourceListForCreation(resources) {
  let { hasMcpInboundDoor } = require("../../services/mcp/mcpInboundDoor.js");
  if (!Array.isArray(resources) || !hasMcpInboundDoor()) return resources;
  return resources.filter(isPlainObject).map(({ uri, name, mimeType, description, server }) => ({
    uri: stringOr("", uri),
    name: stringOr("", name),
    ...(typeof mimeType === "string" && {
      mimeType,
    }),
    ...(typeof description === "string" && {
      description,
    }),
    server: stringOr("", server),
  }));
}
//@ chunk-zmp9ej5f.js:1854-1901 layout
function stringOr(fallback, value) {
  return typeof value === "string" ? value : fallback;
}
//@ chunk-zmp9ej5f.js:1901-3869 fingerprint (2.1.88 match: ListMcpResourcesTool, 0.511)
/**
 * ListMcpResources 工具（别名 ListMcpResources，shouldDefer，只读可并发，backgrounding never）。可选 server 过滤；对每个有 resources 能力的已连接服务器 ensureConnectedClient 后拉 resources/list（claude.ai 代理/特定 HTTP 服务器出现发现错误时重连重试一次），过滤掉 MCP Apps UI 资源（ui://、text/html;profile=mcp-app）；结果为空时提示"服务器可能仍提供工具"。
 */
var ListMcpResourcesTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zmp9ej5f.js:1901", () => {
  ListMcpResourcesTool = buildTool({
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    toAutoClassifierInput(input) {
      return input.server ?? "";
    },
    shouldDefer: true,
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
    create(toolContext) {
      return {
        async call(input, { signal }) {
          let entries = toolContext.turnMcpClients.filter(
            (turnMcpClient) => !hasWithheldResources(turnMcpClient, toolContext.agentId),
          );
          let { server: targetServer } = input;
          let clientsToProcess = targetServer
            ? findServersByName(entries, targetServer)
            : renderToolUseMessage_3(entries, LISTMCPRESOURCESTOOL, toolContext.permissions());
          if (targetServer && clientsToProcess.length === 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `Server "${targetServer}" not found. Available servers: ${entries.map((server) => server.name).join(", ")}`,
              "MCP server not found",
            );
          let results = await Promise.all(
            clientsToProcess.map(async (client) => {
              if (!isConnectedOrCached(client) || !client.capabilities?.resources) return [];
              let mcpModule = require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
              let ensureClient = () =>
                mcpModule.ensureConnectedClient(client, {
                  signal,
                  context: "MCP resource listing",
                });
              try {
                let connectedClient = await ensureClient();
                if (hasWithheldResources(connectedClient, toolContext.agentId)) return [];
                let resources = await raceWithAbortSignal(
                  mcpModule.fetchResourcesForClient(connectedClient),
                  signal,
                  () => new AbortError(),
                );
                if (
                  (client.config.type === "claudeai-proxy" ||
                    (client.config.type === "http" && isSameOriginAsCcr(client.config.url))) &&
                  mcpModule.getDiscoveryFetchError(resources) !== undefined
                ) {
                  let reconnectedClient = await ensureClient();
                  if (reconnectedClient !== connectedClient)
                    resources = await raceWithAbortSignal(
                      mcpModule.fetchResourcesForClient(reconnectedClient),
                      signal,
                      () => new AbortError(),
                    );
                }
                let filtered = resources.filter((resource) => !isMcpAppResource(resource));
                if (filtered.length < resources.length)
                  logForDebugging(
                    `MCP server "${client.name}": ${resources.length - filtered.length} MCP Apps UI resource(s) left out of ${LISTMCPRESOURCESTOOL}'s list for the model (a ui:// URI, or text/html with profile=mcp-app); ${READMCPRESOURCETOOL} can still read them by URI`,
                  );
                return filtered;
              } catch (error) {
                if (!isAbortError(error)) logMCPError(client.name, errorMessage(error));
                return [];
              }
            }),
          );
          if (signal.aborted) throw new AbortError();
          return {
            data: results.flat(),
          };
        },
      };
    },
    renderToolUseMessage(input) {
      return input.server ? `List MCP resources from server "${input.server}"` : "List all MCP resources";
    },
    userFacingName: () => "listMcpResources",
    stripForCreation: sanitizeResourceListForCreation,
    mapToolResultToToolResultBlockParam(content, toolUseID) {
      if (!content || content.length === 0)
        return {
          tool_use_id: toolUseID,
          type: "tool_result",
          content: "No resources found. MCP servers may still provide tools even if they have no resources.",
        };
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: jsonStringify(content),
      };
    },
  });
});
export { ListMcpResourcesTool };
