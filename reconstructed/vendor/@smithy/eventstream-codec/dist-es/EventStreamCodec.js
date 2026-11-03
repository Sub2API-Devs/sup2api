/**
 * @smithy/eventstream-codec/dist-es/EventStreamCodec.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/eventstream-codec@4.2.13..4.2.14
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-fingerprint 1
 */
import { z } from "../dist-cjs/index.js";
import { g } from "../../../@aws-crypto/crc32/build/module/index.js";
import { de } from "./splitMessage.js";

//@ chunk-3cddmtk7.js:9036-10073 esm-fingerprint
class E_2 {
  headerMarshaller;
  messageBuffer;
  isEndOfStream;
  constructor(e, t) {
    ((this.headerMarshaller = new z(e, t)), (this.messageBuffer = []), (this.isEndOfStream = !1));
  }
  feed(e) {
    this.messageBuffer.push(this.decode(e));
  }
  endOfStream() {
    this.isEndOfStream = !0;
  }
  getMessage() {
    let e = this.messageBuffer.pop(),
      isEndOfStream = this.isEndOfStream;
    return {
      getMessage() {
        return e;
      },
      isEndOfStream() {
        return isEndOfStream;
      },
    };
  }
  getAvailableMessages() {
    let messageBuffer = this.messageBuffer;
    this.messageBuffer = [];
    let isEndOfStream = this.isEndOfStream;
    return {
      getMessages() {
        return messageBuffer;
      },
      isEndOfStream() {
        return isEndOfStream;
      },
    };
  }
  encode({ headers: e, body: t }) {
    let format = this.headerMarshaller.format(e),
      r = format.byteLength + t.byteLength + 16,
      uint8Array = new Uint8Array(r),
      dataView = new DataView(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength),
      a = new g();
    return (
      dataView.setUint32(0, r, !1),
      dataView.setUint32(4, format.byteLength, !1),
      dataView.setUint32(8, a.update(uint8Array.subarray(0, 8)).digest(), !1),
      uint8Array.set(format, 12),
      uint8Array.set(t, format.byteLength + 12),
      dataView.setUint32(r - 4, a.update(uint8Array.subarray(8, r - 4)).digest(), !1),
      uint8Array
    );
  }
  decode(e) {
    let { headers: headers, body: body } = de(e);
    return { headers: this.headerMarshaller.parse(headers), body: body };
  }
  formatHeaders(e) {
    return this.headerMarshaller.format(e);
  }
}

export { E_2 };
