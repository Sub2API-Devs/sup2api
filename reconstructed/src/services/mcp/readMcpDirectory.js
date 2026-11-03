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
  let e = capabilities?.extensions?.[IO_MODELCONTEXTPROTOCOL_SKILLS];
  return e != null && typeof e === "object" && "directoryRead" in e && e.directoryRead === true;
}
//@ chunk-gnpzvx0v.js:3616-4273 placement
/**
 * 分页读取 MCP 服务器的 resources/directory/read。
 */
async function readMcpDirectory(r, e, signal) {
  if (!serverDeclaresDirectoryRead(r.capabilities))
    throw Error("readMcpDirectory called on a server without directoryRead capability");
  let t = [];
  let o;
  let s = 0;
  do {
    let i;
    try {
      i = await identityId2(r.client).request(
        {
          method: "resources/directory/read",
          params: {
            uri: e,
            ...(o && {
              cursor: o,
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
      if (s === 0 || !(error instanceof ProtocolError && error.code === ProtocolErrorCode.InvalidParams))
        throw error;
      logMCPDebug(
        r.name,
        `resources/directory/read ${e}: page ${s + 1} returned InvalidParams on cursor; returning ${t.length} entries from prior pages`,
      );
      return t;
    }
    t.push(...i.resources);
    o = i.nextCursor;
    s++;
  } while (o && s < MAX_DIRECTORY_PAGES);
  if (o)
    logMCPDebug(
      r.name,
      `resources/directory/read ${e}: stopped at ${MAX_DIRECTORY_PAGES} pages with more pending`,
    );
  return t;
}
