/**
 * vscode-jsonrpc/lib/common/messageBuffer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-mvgr3jmb.js:25155-27001 cjs-fingerprint
var require_messageBuffer = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AbstractMessageBuffer = undefined;
  var carriageReturn = 13;
  var LF = 10;
  var CRLF = `\r
`;
  class AbstractMessageBuffer {
    constructor(encoding = "utf-8") {
      this._encoding = encoding;
      this._chunks = [];
      this._totalLength = 0;
    }
    get encoding() {
      return this._encoding;
    }
    append(chunk) {
      let toAppend = typeof chunk === "string" ? this.fromString(chunk, this._encoding) : chunk;
      this._chunks.push(toAppend);
      this._totalLength += toAppend.byteLength;
    }
    tryReadHeaders(lowerCaseKeys = false) {
      if (this._chunks.length === 0) return;
      let state = 0;
      let chunkIndex = 0;
      let offset = 0;
      let chunkBytesRead = 0;
      e: while (chunkIndex < this._chunks.length) {
        let chunk = this._chunks[chunkIndex];
        offset = 0;
        t: while (offset < chunk.length) {
          switch (chunk[offset]) {
            case carriageReturn:
              switch (state) {
                case 0:
                  state = 1;
                  break;
                case 2:
                  state = 3;
                  break;
                default:
                  state = 0;
              }
              break;
            case LF:
              switch (state) {
                case 1:
                  state = 2;
                  break;
                case 3:
                  state = 4;
                  offset++;
                  break e;
                default:
                  state = 0;
              }
              break;
            default:
              state = 0;
          }
          offset++;
        }
        chunkBytesRead += chunk.byteLength;
        chunkIndex++;
      }
      if (state !== 4) return;
      let buffer = this._read(chunkBytesRead + offset);
      let result = new Map();
      let headers = this.toString(buffer, "ascii").split(CRLF);
      if (headers.length < 2) return result;
      for (let i = 0; i < headers.length - 2; i++) {
        let header = headers[i];
        let index = header.indexOf(":");
        if (index === -1)
          throw Error(`Message header must separate key and value using ':'
${header}`);
        let key = header.substr(0, index);
        let value = header.substr(index + 1).trim();
        result.set(lowerCaseKeys ? key.toLowerCase() : key, value);
      }
      return result;
    }
    tryReadBody(length) {
      if (this._totalLength < length) return;
      return this._read(length);
    }
    get numberOfBytes() {
      return this._totalLength;
    }
    _read(byteCount) {
      if (byteCount === 0) return this.emptyBuffer();
      if (byteCount > this._totalLength) throw Error("Cannot read so many bytes!");
      if (this._chunks[0].byteLength === byteCount) {
        let chunk = this._chunks[0];
        this._chunks.shift();
        this._totalLength -= byteCount;
        return this.asNative(chunk);
      }
      if (this._chunks[0].byteLength > byteCount) {
        let chunk = this._chunks[0];
        let result = this.asNative(chunk, byteCount);
        this._chunks[0] = chunk.slice(byteCount);
        this._totalLength -= byteCount;
        return result;
      }
      let result = this.allocNative(byteCount);
      let resultOffset = 0;
      let chunkIndex = 0;
      while (byteCount > 0) {
        let chunk = this._chunks[chunkIndex];
        if (chunk.byteLength > byteCount) {
          let chunkPart = chunk.slice(0, byteCount);
          result.set(chunkPart, resultOffset);
          resultOffset += byteCount;
          this._chunks[chunkIndex] = chunk.slice(byteCount);
          this._totalLength -= byteCount;
          byteCount -= byteCount;
        } else {
          result.set(chunk, resultOffset);
          resultOffset += chunk.byteLength;
          this._chunks.shift();
          this._totalLength -= chunk.byteLength;
          byteCount -= chunk.byteLength;
        }
      }
      return result;
    }
  }
  cjsExports.AbstractMessageBuffer = AbstractMessageBuffer;
});
export { require_messageBuffer };
