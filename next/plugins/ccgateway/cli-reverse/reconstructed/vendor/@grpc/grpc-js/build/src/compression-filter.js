/**
 * @grpc/grpc-js/build/src/compression-filter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_compression_algorithms } from "./compression-algorithms.js";
import { require_constants } from "./constants.js";
import { require_filter } from "./filter.js";
import { require_logging } from "./logging.js";

//@ chunk-3k21nfa0.js:186078-190993 cjs-fingerprint
var require_compression_filter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CompressionFilterFactory = cjsExports.CompressionFilter = undefined;
  var zlib = importMetaRequire("zlib");
  var compression_algorithms_1 = require_compression_algorithms();
  var constants_1 = require_constants();
  var filter_1 = require_filter();
  var logging = require_logging();
  var isCompressionAlgorithmKey = (key) =>
    typeof key === "number" && typeof compression_algorithms_1.CompressionAlgorithms[key] === "string";
  class CompressionHandler {
    async writeMessage(message, compress) {
      let messageBuffer = message;
      if (compress) messageBuffer = await this.compressMessage(messageBuffer);
      let output = Buffer.allocUnsafe(messageBuffer.length + 5);
      output.writeUInt8(compress ? 1 : 0, 0);
      output.writeUInt32BE(messageBuffer.length, 1);
      messageBuffer.copy(output, 5);
      return output;
    }
    async readMessage(data) {
      let compressed = data.readUInt8(0) === 1;
      let messageBuffer = data.slice(5);
      if (compressed) messageBuffer = await this.decompressMessage(messageBuffer);
      return messageBuffer;
    }
  }
  class IdentityHandler extends CompressionHandler {
    async compressMessage(message) {
      return message;
    }
    async writeMessage(message, compress) {
      let output = Buffer.allocUnsafe(message.length + 5);
      output.writeUInt8(0, 0);
      output.writeUInt32BE(message.length, 1);
      message.copy(output, 5);
      return output;
    }
    decompressMessage(message) {
      return Promise.reject(Error('Received compressed message but "grpc-encoding" header was identity'));
    }
  }
  class DeflateHandler extends CompressionHandler {
    constructor(maxRecvMessageLength) {
      super();
      this.maxRecvMessageLength = maxRecvMessageLength;
    }
    compressMessage(message) {
      return new Promise((resolve, reject) => {
        zlib.deflate(message, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });
    }
    decompressMessage(message) {
      return new Promise((resolve, reject) => {
        let totalLength = 0;
        let messageParts = [];
        let decompresser = zlib.createInflate();
        decompresser.on("error", (error) => {
          reject({
            code: constants_1.Status.INTERNAL,
            details: "Failed to decompress deflate-encoded message",
          });
        });
        decompresser.on("data", (chunk) => {
          messageParts.push(chunk);
          totalLength += chunk.byteLength;
          if (this.maxRecvMessageLength !== -1 && totalLength > this.maxRecvMessageLength) {
            decompresser.destroy();
            reject({
              code: constants_1.Status.RESOURCE_EXHAUSTED,
              details: `Received message that decompresses to a size larger than ${this.maxRecvMessageLength}`,
            });
          }
        });
        decompresser.on("end", () => {
          resolve(Buffer.concat(messageParts));
        });
        decompresser.write(message);
        decompresser.end();
      });
    }
  }
  class GzipHandler extends CompressionHandler {
    constructor(maxRecvMessageLength) {
      super();
      this.maxRecvMessageLength = maxRecvMessageLength;
    }
    compressMessage(message) {
      return new Promise((resolve, reject) => {
        zlib.gzip(message, (err, output) => {
          if (err) reject(err);
          else resolve(output);
        });
      });
    }
    decompressMessage(message) {
      return new Promise((resolve, reject) => {
        let totalLength = 0;
        let messageParts = [];
        let decompresser = zlib.createGunzip();
        decompresser.on("error", (error) => {
          reject({
            code: constants_1.Status.INTERNAL,
            details: "Failed to decompress gzip-encoded message",
          });
        });
        decompresser.on("data", (chunk) => {
          messageParts.push(chunk);
          totalLength += chunk.byteLength;
          if (this.maxRecvMessageLength !== -1 && totalLength > this.maxRecvMessageLength) {
            decompresser.destroy();
            reject({
              code: constants_1.Status.RESOURCE_EXHAUSTED,
              details: `Received message that decompresses to a size larger than ${this.maxRecvMessageLength}`,
            });
          }
        });
        decompresser.on("end", () => {
          resolve(Buffer.concat(messageParts));
        });
        decompresser.write(message);
        decompresser.end();
      });
    }
  }
  class UnknownHandler extends CompressionHandler {
    constructor(compressionName) {
      super();
      this.compressionName = compressionName;
    }
    compressMessage(message) {
      return Promise.reject(
        Error(`Received message compressed with unsupported compression method ${this.compressionName}`),
      );
    }
    decompressMessage(message) {
      return Promise.reject(Error(`Compression method not supported: ${this.compressionName}`));
    }
  }
  function getCompressionHandler(compressionName, maxReceiveMessageSize) {
    switch (compressionName) {
      case "identity":
        return new IdentityHandler();
      case "deflate":
        return new DeflateHandler(maxReceiveMessageSize);
      case "gzip":
        return new GzipHandler(maxReceiveMessageSize);
      default:
        return new UnknownHandler(compressionName);
    }
  }
  class CompressionFilter extends filter_1.BaseFilter {
    constructor(channelOptions, sharedFilterConfig) {
      var _a;
      var _b;
      var _c;
      super();
      this.sharedFilterConfig = sharedFilterConfig;
      this.sendCompression = new IdentityHandler();
      this.receiveCompression = new IdentityHandler();
      this.currentCompressionAlgorithm = "identity";
      let compressionAlgorithmKey = channelOptions["grpc.default_compression_algorithm"];
      this.maxReceiveMessageLength =
        (_a = channelOptions["grpc.max_receive_message_length"]) !== null && _a !== undefined
          ? _a
          : constants_1.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH;
      this.maxSendMessageLength =
        (_b = channelOptions["grpc.max_send_message_length"]) !== null && _b !== undefined
          ? _b
          : constants_1.DEFAULT_MAX_SEND_MESSAGE_LENGTH;
      if (compressionAlgorithmKey !== undefined)
        if (isCompressionAlgorithmKey(compressionAlgorithmKey)) {
          let clientSelectedEncoding =
            compression_algorithms_1.CompressionAlgorithms[compressionAlgorithmKey];
          let serverSupportedEncodings =
            (_c = sharedFilterConfig.serverSupportedEncodingHeader) === null || _c === undefined
              ? undefined
              : _c.split(",");
          if (!serverSupportedEncodings || serverSupportedEncodings.includes(clientSelectedEncoding)) {
            this.currentCompressionAlgorithm = clientSelectedEncoding;
            this.sendCompression = getCompressionHandler(this.currentCompressionAlgorithm, -1);
          }
        } else
          logging.log(
            constants_1.LogVerbosity.ERROR,
            `Invalid value provided for grpc.default_compression_algorithm option: ${compressionAlgorithmKey}`,
          );
    }
    async sendMetadata(metadata) {
      let headers = await metadata;
      headers.set("grpc-accept-encoding", "identity,deflate,gzip");
      headers.set("accept-encoding", "identity");
      if (this.currentCompressionAlgorithm === "identity") headers.remove("grpc-encoding");
      else headers.set("grpc-encoding", this.currentCompressionAlgorithm);
      return headers;
    }
    receiveMetadata(metadata) {
      let receiveEncoding = metadata.get("grpc-encoding");
      if (receiveEncoding.length > 0) {
        let encoding = receiveEncoding[0];
        if (typeof encoding === "string")
          this.receiveCompression = getCompressionHandler(encoding, this.maxReceiveMessageLength);
      }
      metadata.remove("grpc-encoding");
      let serverSupportedEncodingsHeader = metadata.get("grpc-accept-encoding")[0];
      if (serverSupportedEncodingsHeader) {
        this.sharedFilterConfig.serverSupportedEncodingHeader = serverSupportedEncodingsHeader;
        if (!serverSupportedEncodingsHeader.split(",").includes(this.currentCompressionAlgorithm)) {
          this.sendCompression = new IdentityHandler();
          this.currentCompressionAlgorithm = "identity";
        }
      }
      metadata.remove("grpc-accept-encoding");
      return metadata;
    }
    async sendMessage(message) {
      var _a;
      let resolvedMessage = await message;
      if (this.maxSendMessageLength !== -1 && resolvedMessage.message.length > this.maxSendMessageLength)
        throw {
          code: constants_1.Status.RESOURCE_EXHAUSTED,
          details: `Attempted to send message with a size larger than ${this.maxSendMessageLength}`,
        };
      let compress;
      if (this.sendCompression instanceof IdentityHandler) compress = false;
      else compress = (((_a = resolvedMessage.flags) !== null && _a !== undefined ? _a : 0) & 2) === 0;
      return {
        message: await this.sendCompression.writeMessage(resolvedMessage.message, compress),
        flags: resolvedMessage.flags,
      };
    }
    async receiveMessage(message) {
      return this.receiveCompression.readMessage(await message);
    }
  }
  cjsExports.CompressionFilter = CompressionFilter;
  class CompressionFilterFactory {
    constructor(channel, options) {
      this.options = options;
      this.sharedFilterConfig = {};
    }
    createFilter() {
      return new CompressionFilter(this.options, this.sharedFilterConfig);
    }
  }
  cjsExports.CompressionFilterFactory = CompressionFilterFactory;
});
export { require_compression_filter };
