/**
 * services/mcp/directoryRead.ts
 *
 * 2.1.316 新增。MCP 目录读取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fvsx0r1g.js (3)
 * attribution: placement 3
 */
import { IO_MODELCONTEXTPROTOCOL_SKILLS } from "./mcpSkills.js";
import { oa } from "../../types/ids.js";
import {
  ListResourcesResultSchema,
  McpError,
  ErrorCode,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { getConnectionTimeoutMs } from "./client.js";
import { logMCPDebug } from "../../utils/log.js";

//@ chunk-fvsx0r1g.js:3459-3468 placement
var n = 20;
/**
 * 判断 MCP 服务器是否在技能扩展中声明支持 directoryRead。
 */
//@ chunk-fvsx0r1g.js:3468-3588 placement
function serverDeclaresDirectoryRead(r) {
  let e = r?.extensions?.[IO_MODELCONTEXTPROTOCOL_SKILLS];
  return e != null && typeof e === "object" && "directoryRead" in e && e.directoryRead === !0;
}
/**
 * 分页调用 resources/directory/read 读取 MCP 服务器上的目录：第二页起遇 InvalidParams（游标不被接受）就返回已取到的条目，达到页数上限时记日志。
 */
//@ chunk-fvsx0r1g.js:3588-4245 placement
async function readMcpDirectory(connection, uri, signal) {
  if (!serverDeclaresDirectoryRead(connection.capabilities))
    throw Error("readMcpDirectory called on a server without directoryRead capability");
  let entries = [],
    cursor,
    pages = 0;
  do {
    let i;
    try {
      i = await oa(connection.client).request(
        { method: "resources/directory/read", params: { uri: uri, ...(cursor && { cursor: cursor }) } },
        ListResourcesResultSchema,
        { timeout: getConnectionTimeoutMs(), signal: signal },
      );
    } catch (error) {
      if (pages === 0 || !(error instanceof McpError && error.code === ErrorCode.InvalidParams)) throw error;
      return (
        logMCPDebug(
          connection.name,
          `resources/directory/read ${uri}: page ${pages + 1} returned InvalidParams on cursor; returning ${entries.length} entries from prior pages`,
        ),
        entries
      );
    }
    (entries.push(...i.resources), (cursor = i.nextCursor), pages++);
  } while (cursor && pages < n);
  if (cursor)
    logMCPDebug(connection.name, `resources/directory/read ${uri}: stopped at ${n} pages with more pending`);
  return entries;
}
