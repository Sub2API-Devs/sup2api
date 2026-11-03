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
import { oa } from "../../types/ids.js";
import { extend_19 } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { getConnectionTimeoutMs } from "./client.js";
import { ProtocolError, ma } from "../../../vendor/@modelcontextprotocol/client/dist/src-D_zzAWoS.mjs";
import { logMCPDebug } from "../../utils/log.js";

//@ chunk-gnpzvx0v.js:3487-3496 placement
var a = 20;
/**
 * 判断 MCP 服务器是否在技能扩展中声明支持 directoryRead（v2 副本）。
 */
//@ chunk-gnpzvx0v.js:3496-3616 placement
function serverDeclaresDirectoryRead(r) {
  let e = r?.extensions?.[IO_MODELCONTEXTPROTOCOL_SKILLS];
  return e != null && typeof e === "object" && "directoryRead" in e && e.directoryRead === !0;
}
/**
 * 分页读取 MCP 服务器的 resources/directory/read。
 */
//@ chunk-gnpzvx0v.js:3616-4273 placement
async function readMcpDirectory(r, e, c) {
  if (!serverDeclaresDirectoryRead(r.capabilities))
    throw Error("readMcpDirectory called on a server without directoryRead capability");
  let t = [],
    o,
    s = 0;
  do {
    let i;
    try {
      i = await oa(r.client).request(
        { method: "resources/directory/read", params: { uri: e, ...(o && { cursor: o }) } },
        extend_19,
        { timeout: getConnectionTimeoutMs(), signal: c },
      );
    } catch (error) {
      if (s === 0 || !(error instanceof ProtocolError && error.code === ma.InvalidParams)) throw error;
      return (
        logMCPDebug(
          r.name,
          `resources/directory/read ${e}: page ${s + 1} returned InvalidParams on cursor; returning ${t.length} entries from prior pages`,
        ),
        t
      );
    }
    (t.push(...i.resources), (o = i.nextCursor), s++);
  } while (o && s < a);
  if (o) logMCPDebug(r.name, `resources/directory/read ${e}: stopped at ${a} pages with more pending`);
  return t;
}
