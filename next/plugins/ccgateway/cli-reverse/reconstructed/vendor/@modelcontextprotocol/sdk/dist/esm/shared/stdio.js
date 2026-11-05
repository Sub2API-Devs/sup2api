/**
 * @modelcontextprotocol/sdk/dist/esm/shared/stdio.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-4bemhbkv.js (3)
 * attribution: esm-fingerprint 1, esm-layout 2
 */
import { JSONRPCMessageSchema } from "../types.js";

//@ chunk-4bemhbkv.js:227-545 esm-fingerprint
class ReadBuffer {
  append(chunk) {
    this._buffer = this._buffer ? Buffer.concat([this._buffer, chunk]) : chunk;
  }
  readMessage() {
    if (!this._buffer) return null;
    let index = this._buffer.indexOf(`
`);
    if (index === -1) return null;
    let line = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
    this._buffer = this._buffer.subarray(index + 1);
    return deserializeMessage(line);
  }
  clear() {
    this._buffer = undefined;
  }
}
//@ chunk-4bemhbkv.js:545-592 esm-layout
function deserializeMessage(line) {
  return JSONRPCMessageSchema.parse(JSON.parse(line));
}
//@ chunk-4bemhbkv.js:592-637 esm-layout
function serializeMessage(message) {
  return (
    JSON.stringify(message) +
    `
`
  );
}
export { ReadBuffer, serializeMessage, deserializeMessage };
