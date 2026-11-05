/**
 * services/mcp/stdioServer.ts
 *
 * 2.1.316 新增：stdio MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g95fv892.js (1)
 * attribution: placement 1
 */
import { StdioServerTransport } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/stdio.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g95fv892.js:228-363 placement
/**
 * 继承 StdioServerTransport，把字符串数据统一转成 Buffer 再交给原处理器。
 */
let BufferedStdioServerTransport; // deferred: uses StdioServerTransport (../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/stdio.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-g95fv892.js:228", () => {
  BufferedStdioServerTransport = class BufferedStdioServerTransport extends StdioServerTransport {
    constructor(stdio, options) {
      super(stdio, options);
      let _ondata = this._ondata;
      this._ondata = (chunk) => _ondata(typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk);
    }
  };
});
export { BufferedStdioServerTransport };
