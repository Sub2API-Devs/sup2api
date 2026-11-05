/**
 * @modelcontextprotocol/sdk/dist/esm/server/stdio.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-3w2d05bg.js (1)
 * attribution: esm-fingerprint 1
 */
import e from "process";
import { ReadBuffer, serializeMessage } from "../shared/stdio.js";

//@ chunk-3w2d05bg.js:255-1169 esm-fingerprint
class StdioServerTransport {
  constructor(_stdin = e.stdin, _stdout = e.stdout) {
    this._stdin = _stdin;
    this._stdout = _stdout;
    this._readBuffer = new ReadBuffer();
    this._started = false;
    this._ondata = (chunk) => {
      this._readBuffer.append(chunk);
      this.processReadBuffer();
    };
    this._onerror = (error) => {
      this.onerror?.(error);
    };
  }
  async start() {
    if (this._started)
      throw Error(
        "StdioServerTransport already started! If using Server class, note that connect() calls start() automatically.",
      );
    this._started = true;
    this._stdin.on("data", this._ondata);
    this._stdin.on("error", this._onerror);
  }
  processReadBuffer() {
    while (true)
      try {
        let message = this._readBuffer.readMessage();
        if (message === null) break;
        this.onmessage?.(message);
      } catch (error) {
        this.onerror?.(error);
      }
  }
  async close() {
    this._stdin.off("data", this._ondata);
    this._stdin.off("error", this._onerror);
    if (this._stdin.listenerCount("data") === 0) this._stdin.pause();
    this._readBuffer.clear();
    this.onclose?.();
  }
  send(message) {
    return new Promise((resolve) => {
      let json = serializeMessage(message);
      if (this._stdout.write(json)) resolve();
      else this._stdout.once("drain", resolve);
    });
  }
}
export { StdioServerTransport };
