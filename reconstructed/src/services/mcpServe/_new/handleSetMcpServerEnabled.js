/**
 * services/mcpServe/_new/handleSetMcpServerEnabled.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (1)
 * attribution: sole-consumer-new 1
 */
import { SetMcpServerEnabledInputSchema } from "../../mcp/utils.js";
import { ee } from "../mcpRelayCalls.js";

/**
 * handleSetMcpServerEnabled：控制协议中 "启用/禁用 MCP 服务器" 请求的处理（校验 {server, enabled, requestId}）。
 */
//@ chunk-wy9dbk5f.js:36875-37139 sole-consumer-new
function handleSetMcpServerEnabled(e, r, n) {
  let safeParse = SetMcpServerEnabledInputSchema().safeParse(e);
  if (!safeParse.success)
    throw Error(
      "Takes a server name, whether it is enabled, and optionally a request id of at most 64 characters",
    );
  let { server: server, enabled: enabled, requestId: requestId } = safeParse.data,
    { setEnabled: setEnabled } = ee.of(n.session);
  return setEnabled(server, enabled, requestId, r, n);
}

export { handleSetMcpServerEnabled };
