/**
 * @modelcontextprotocol/sdk/dist/esm/shared/stdio.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-kn1bv1kv.js (3)
 * attribution: esm-fingerprint 1, esm-layout 2
 */
import { JSONRPCMessageSchema } from "../types.js";

//@ chunk-kn1bv1kv.js:227-545 esm-fingerprint
class zsn {
  append(e) {
    this._buffer = this._buffer ? Buffer.concat([this._buffer, e]) : e;
  }
  readMessage() {
    if (!this._buffer) return null;
    let index = this._buffer.indexOf(`
`);
    if (index === -1) return null;
    let replaced = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
    return ((this._buffer = this._buffer.subarray(index + 1)), $Ao(replaced));
  }
  clear() {
    this._buffer = void 0;
  }
}
//@ chunk-kn1bv1kv.js:545-592 esm-layout
function $Ao(e) {
  return JSONRPCMessageSchema.parse(JSON.parse(e));
}
//@ chunk-kn1bv1kv.js:592-637 esm-layout
function AGn(e) {
  return (
    JSON.stringify(e) +
    `
`
  );
}

export { zsn, AGn, $Ao };
