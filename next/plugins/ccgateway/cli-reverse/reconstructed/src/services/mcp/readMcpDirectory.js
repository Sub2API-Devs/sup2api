/**
 * services/mcp/readMcpDirectory.ts
 *
 * MCP SDK v1 代的资源目录分页读取（与 v2 版同职责，按 SDK 代二选一加载）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5c6dj2v2.js (3)
 * attribution: placement 3
 */
import { IO_MODELCONTEXTPROTOCOL_SKILLS } from "./mcpSkills.js";
import { identityId2 } from "../../types/ids.js";
import {
  ListResourcesResultSchema,
  McpError,
  ErrorCode,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { getConnectionTimeoutMs } from "./client.js";
import { logMCPDebug } from "../../utils/log.js";

//@ chunk-5c6dj2v2.js:3767-3776 placement
var MAX_DIRECTORY_DEPTH = 20;
//@ chunk-5c6dj2v2.js:3776-3896 placement
/**
 * MCP server 的能力是否声明了 directoryRead（v1 SDK 版）。
 */
function hasDirectoryRead(server) {
  let directoryRead = server?.extensions?.[IO_MODELCONTEXTPROTOCOL_SKILLS];
  return (
    directoryRead != null &&
    typeof directoryRead === "object" &&
    "directoryRead" in directoryRead &&
    directoryRead.directoryRead === true
  );
}
//@ chunk-5c6dj2v2.js:3896-4553 placement
/**
 * readMcpDirectory（v1 SDK 版）：与 v2 同形，按 cursor 翻页读资源目录并在后续页 InvalidParams 时退回。
 */
async function readMcpDirectory(server, uri, maxDepth) {
  if (!hasDirectoryRead(server.capabilities))
    throw Error("readMcpDirectory called on a server without directoryRead capability");
  let entries = [];
  let cursor;
  let pageCount = 0;
  do {
    let response;
    try {
      response = await identityId2(server.client).request(
        {
          method: "resources/directory/read",
          params: {
            uri,
            ...(cursor && {
              cursor,
            }),
          },
        },
        ListResourcesResultSchema,
        {
          timeout: getConnectionTimeoutMs(),
          signal: maxDepth,
        },
      );
    } catch (error) {
      if (pageCount === 0 || !(error instanceof McpError && error.code === ErrorCode.InvalidParams))
        throw error;
      logMCPDebug(
        server.name,
        `resources/directory/read ${uri}: page ${pageCount + 1} returned InvalidParams on cursor; returning ${entries.length} entries from prior pages`,
      );
      return entries;
    }
    entries.push(...response.resources);
    cursor = response.nextCursor;
    pageCount++;
  } while (cursor && pageCount < MAX_DIRECTORY_DEPTH);
  if (cursor)
    logMCPDebug(
      server.name,
      `resources/directory/read ${uri}: stopped at ${MAX_DIRECTORY_DEPTH} pages with more pending`,
    );
  return entries;
}
export { readMcpDirectory, hasDirectoryRead };
