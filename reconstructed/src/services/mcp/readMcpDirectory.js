/**
 * services/mcp/readMcpDirectory.ts
 *
 * 2.1.316 新增：分页读取 MCP 服务器的 resources/directory/read。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gnpzvx0v.js (3)
 * attribution: placement 3
 */
import { IO_MODELCONTEXTPROTOCOL_SKILLS } from "./mcpSkills.js";
import { identityId2 } from "../../types/ids.js";
import { ListResourcesResultSchema } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { getConnectionTimeoutMs } from "./client.js";
import {
  ProtocolError,
  ProtocolErrorCode,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { logMCPDebug } from "../../utils/log.js";

//@ chunk-gnpzvx0v.js:3487-3496 placement
/**
 * 目录读取最多翻页次数（20）。
 */
var MAX_DIRECTORY_PAGES = 20;
//@ chunk-gnpzvx0v.js:3496-3616 placement
/**
 * 判断 MCP 服务器是否在技能扩展中声明支持 directoryRead（v2 副本）。
 */
function serverDeclaresDirectoryRead(capabilities) {
  let extension = capabilities?.extensions?.[IO_MODELCONTEXTPROTOCOL_SKILLS];
  return (
    extension != null &&
    typeof extension === "object" &&
    "directoryRead" in extension &&
    extension.directoryRead === true
  );
}
//@ chunk-gnpzvx0v.js:3616-4273 placement
/**
 * 分页读取 MCP 服务器的 resources/directory/read。
 */
async function readMcpDirectory(connection, uri, signal) {
  if (!serverDeclaresDirectoryRead(connection.capabilities))
    throw Error("readMcpDirectory called on a server without directoryRead capability");
  let entries = [];
  let cursor;
  let pages = 0;
  do {
    let page;
    try {
      page = await identityId2(connection.client).request(
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
          signal,
        },
      );
    } catch (error) {
      if (pages === 0 || !(error instanceof ProtocolError && error.code === ProtocolErrorCode.InvalidParams))
        throw error;
      logMCPDebug(
        connection.name,
        `resources/directory/read ${uri}: page ${pages + 1} returned InvalidParams on cursor; returning ${entries.length} entries from prior pages`,
      );
      return entries;
    }
    entries.push(...page.resources);
    cursor = page.nextCursor;
    pages++;
  } while (cursor && pages < MAX_DIRECTORY_PAGES);
  if (cursor)
    logMCPDebug(
      connection.name,
      `resources/directory/read ${uri}: stopped at ${MAX_DIRECTORY_PAGES} pages with more pending`,
    );
  return entries;
}
export { readMcpDirectory, serverDeclaresDirectoryRead };
