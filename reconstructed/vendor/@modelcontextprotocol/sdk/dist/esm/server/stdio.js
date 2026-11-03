/**
 * @modelcontextprotocol/sdk/dist/esm/server/stdio.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-nkpwtgej.js (1)
 * attribution: esm-fingerprint 1
 */
import e from "process";
import { zsn, AGn } from "../shared/stdio.js";

//@ chunk-nkpwtgej.js:255-1169 esm-fingerprint
class StdioServerTransport {
  constructor(t = e.stdin, r = e.stdout) {
    ((this._stdin = t),
      (this._stdout = r),
      (this._readBuffer = new zsn()),
      (this._started = !1),
      (this._ondata = (s) => {
        (this._readBuffer.append(s), this.processReadBuffer());
      }),
      (this._onerror = (s) => {
        this.onerror?.(s);
      }));
  }
  async start() {
    if (this._started)
      throw Error(
        "StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.",
      );
    ((this._started = !0), this._stdin.on("data", this._ondata), this._stdin.on("error", this._onerror));
  }
  processReadBuffer() {
    while (!0)
      try {
        let message = this._readBuffer.readMessage();
        if (message === null) break;
        this.onmessage?.(message);
      } catch (error) {
        this.onerror?.(error);
      }
  }
  async close() {
    if (
      (this._stdin.off("data", this._ondata),
      this._stdin.off("error", this._onerror),
      this._stdin.listenerCount("data") === 0)
    )
      this._stdin.pause();
    (this._readBuffer.clear(), this.onclose?.());
  }
  send(t) {
    return new Promise((r) => {
      let s = AGn(t);
      if (this._stdout.write(s)) r();
      else this._stdout.once("drain", r);
    });
  }
}

export { StdioServerTransport };
