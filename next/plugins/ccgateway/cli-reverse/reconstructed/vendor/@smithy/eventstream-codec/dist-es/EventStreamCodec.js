/**
 * @smithy/eventstream-codec/dist-es/EventStreamCodec.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/eventstream-codec@4.2.13..4.2.14
 * pieces: chunk-ayc8mk37.js (1)
 * attribution: esm-fingerprint 1
 */
import { HeaderMarshaller } from "../dist-cjs/index.js";
import { Crc32 } from "../../../@aws-crypto/crc32/build/module/index.js";
import { splitMessage } from "./splitMessage.js";

//@ chunk-ayc8mk37.js:9036-10073 esm-fingerprint
class EventStreamCodec {
  headerMarshaller;
  messageBuffer;
  isEndOfStream;
  constructor(toUtf8, fromUtf8) {
    this.headerMarshaller = new HeaderMarshaller(toUtf8, fromUtf8);
    this.messageBuffer = [];
    this.isEndOfStream = false;
  }
  feed(message) {
    this.messageBuffer.push(this.decode(message));
  }
  endOfStream() {
    this.isEndOfStream = true;
  }
  getMessage() {
    let message = this.messageBuffer.pop();
    let isEndOfStream = this.isEndOfStream;
    return {
      getMessage() {
        return message;
      },
      isEndOfStream() {
        return isEndOfStream;
      },
    };
  }
  getAvailableMessages() {
    let messages = this.messageBuffer;
    this.messageBuffer = [];
    let isEndOfStream = this.isEndOfStream;
    return {
      getMessages() {
        return messages;
      },
      isEndOfStream() {
        return isEndOfStream;
      },
    };
  }
  encode({ headers: rawHeaders, body }) {
    let headers = this.headerMarshaller.format(rawHeaders);
    let length = headers.byteLength + body.byteLength + 16;
    let out = new Uint8Array(length);
    let view = new DataView(out.buffer, out.byteOffset, out.byteLength);
    let checksum = new Crc32();
    view.setUint32(0, length, false);
    view.setUint32(4, headers.byteLength, false);
    view.setUint32(8, checksum.update(out.subarray(0, 8)).digest(), false);
    out.set(headers, 12);
    out.set(body, headers.byteLength + 12);
    view.setUint32(length - 4, checksum.update(out.subarray(8, length - 4)).digest(), false);
    return out;
  }
  decode(message) {
    let { headers, body } = splitMessage(message);
    return {
      headers: this.headerMarshaller.parse(headers),
      body,
    };
  }
  formatHeaders(rawHeaders) {
    return this.headerMarshaller.format(rawHeaders);
  }
}
export { EventStreamCodec };
