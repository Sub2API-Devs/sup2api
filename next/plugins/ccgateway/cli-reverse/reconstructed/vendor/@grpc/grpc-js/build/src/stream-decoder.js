/**
 * @grpc/grpc-js/build/src/stream-decoder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:215072-216944 cjs-fingerprint
var Ao = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.StreamDecoder = undefined;
  var ReadState;
  (function (ReadState) {
    ReadState[(ReadState.NO_DATA = 0)] = "NO_DATA";
    ReadState[(ReadState.READING_SIZE = 1)] = "READING_SIZE";
    ReadState[(ReadState.READING_MESSAGE = 2)] = "READING_MESSAGE";
  })(ReadState || (ReadState = {}));
  class StreamDecoder {
    constructor(maxReadMessageLength) {
      this.maxReadMessageLength = maxReadMessageLength;
      this.readState = ReadState.NO_DATA;
      this.readCompressFlag = Buffer.alloc(1);
      this.readPartialSize = Buffer.alloc(4);
      this.readSizeRemaining = 4;
      this.readMessageSize = 0;
      this.readPartialMessage = [];
      this.readMessageRemaining = 0;
    }
    write(data) {
      let readHead = 0;
      let toRead;
      let result = [];
      while (readHead < data.length)
        switch (this.readState) {
          case ReadState.NO_DATA:
            this.readCompressFlag = data.slice(readHead, readHead + 1);
            readHead += 1;
            this.readState = ReadState.READING_SIZE;
            this.readPartialSize.fill(0);
            this.readSizeRemaining = 4;
            this.readMessageSize = 0;
            this.readMessageRemaining = 0;
            this.readPartialMessage = [];
            break;
          case ReadState.READING_SIZE:
            toRead = Math.min(data.length - readHead, this.readSizeRemaining);
            data.copy(this.readPartialSize, 4 - this.readSizeRemaining, readHead, readHead + toRead);
            this.readSizeRemaining -= toRead;
            readHead += toRead;
            if (this.readSizeRemaining === 0) {
              this.readMessageSize = this.readPartialSize.readUInt32BE(0);
              if (this.maxReadMessageLength !== -1 && this.readMessageSize > this.maxReadMessageLength)
                throw Error(
                  `Received message larger than max (${this.readMessageSize} vs ${this.maxReadMessageLength})`,
                );
              this.readMessageRemaining = this.readMessageSize;
              if (this.readMessageRemaining > 0) this.readState = ReadState.READING_MESSAGE;
              else {
                let message = Buffer.concat([this.readCompressFlag, this.readPartialSize], 5);
                this.readState = ReadState.NO_DATA;
                result.push(message);
              }
            }
            break;
          case ReadState.READING_MESSAGE:
            toRead = Math.min(data.length - readHead, this.readMessageRemaining);
            this.readPartialMessage.push(data.slice(readHead, readHead + toRead));
            this.readMessageRemaining -= toRead;
            readHead += toRead;
            if (this.readMessageRemaining === 0) {
              let framedMessageBuffers = [this.readCompressFlag, this.readPartialSize].concat(
                this.readPartialMessage,
              );
              let framedMessage = Buffer.concat(framedMessageBuffers, this.readMessageSize + 5);
              this.readState = ReadState.NO_DATA;
              result.push(framedMessage);
            }
            break;
          default:
            throw Error("Unexpected read state");
        }
      return result;
    }
  }
  cjsExports.StreamDecoder = StreamDecoder;
});
export { Ao };
