/**
 * services/mcp/stdioServer.ts
 *
 * 2.1.316 新增：stdio MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-54tq783x.js (1)
 * attribution: placement 1
 */
import { StdioServerTransport } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/stdio.js";

/**
 * 继承 StdioServerTransport，把字符串数据统一转成 Buffer 再交给原处理器。
 */
//@ chunk-54tq783x.js:228-363 placement
class BufferedStdioServerTransport extends StdioServerTransport {
  constructor(t, e) {
    super(t, e);
    let _ondata = this._ondata;
    this._ondata = (r) => _ondata(typeof r === "string" ? Buffer.from(r, "utf8") : r);
  }
}

export { BufferedStdioServerTransport };
