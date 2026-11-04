/**
 * @grpc/grpc-js/build/src/subchannel-call.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";
import { require_metadata } from "./metadata.js";
import { require_stream_decoder } from "./stream-decoder.js";
import { require_logging } from "./logging.js";

//@ chunk-pwh5dx3n.js:216944-224816 cjs-fingerprint
var require_subchannel_call = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Http2SubchannelCall = undefined;
  var http2 = importMetaRequire("http2");
  var os = importMetaRequire("os");
  var constants_1 = require_constants();
  var metadata_1 = require_metadata();
  var stream_decoder_1 = require_stream_decoder();
  var logging = require_logging();
  var constants_2 = require_constants();
  var TRACER_NAME = "subchannel_call";
  function getSystemErrorName(errno) {
    for (let [name, num] of Object.entries(os.constants.errno)) if (num === errno) return name;
    return "Unknown system error " + errno;
  }
  function mapHttpStatusCode(code) {
    let details = `Received HTTP status code ${code}`;
    let mappedStatusCode;
    switch (code) {
      case 400:
        mappedStatusCode = constants_1.Status.INTERNAL;
        break;
      case 401:
        mappedStatusCode = constants_1.Status.UNAUTHENTICATED;
        break;
      case 403:
        mappedStatusCode = constants_1.Status.PERMISSION_DENIED;
        break;
      case 404:
        mappedStatusCode = constants_1.Status.UNIMPLEMENTED;
        break;
      case 429:
      case 502:
      case 503:
      case 504:
        mappedStatusCode = constants_1.Status.UNAVAILABLE;
        break;
      default:
        mappedStatusCode = constants_1.Status.UNKNOWN;
    }
    return {
      code: mappedStatusCode,
      details,
      metadata: new metadata_1.Metadata(),
    };
  }
  class Http2SubchannelCall {
    constructor(http2Stream, callEventTracker, listener, transport, callId) {
      var _a;
      this.http2Stream = http2Stream;
      this.callEventTracker = callEventTracker;
      this.listener = listener;
      this.transport = transport;
      this.callId = callId;
      this.isReadFilterPending = false;
      this.isPushPending = false;
      this.canPush = false;
      this.readsClosed = false;
      this.statusOutput = false;
      this.unpushedReadMessages = [];
      this.finalStatus = null;
      this.internalError = null;
      this.serverEndedCall = false;
      this.connectionDropped = false;
      let maxReceiveMessageLength =
        (_a = transport.getOptions()["grpc.max_receive_message_length"]) !== null && _a !== undefined
          ? _a
          : constants_1.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH;
      this.decoder = new stream_decoder_1.StreamDecoder(maxReceiveMessageLength);
      http2Stream.on("response", (headers, flags) => {
        let headersString = "";
        for (let header of Object.keys(headers))
          headersString +=
            "\t\t" +
            header +
            ": " +
            headers[header] +
            `
`;
        this.trace(
          `Received server headers:
` + headersString,
        );
        this.httpStatusCode = headers[":status"];
        if (flags & http2.constants.NGHTTP2_FLAG_END_STREAM) this.handleTrailers(headers);
        else {
          let metadata;
          try {
            metadata = metadata_1.Metadata.fromHttp2Headers(headers);
          } catch (error) {
            this.endCall({
              code: constants_1.Status.UNKNOWN,
              details: error.message,
              metadata: new metadata_1.Metadata(),
            });
            return;
          }
          this.listener.onReceiveMetadata(metadata);
        }
      });
      http2Stream.on("trailers", (headers) => {
        this.handleTrailers(headers);
      });
      http2Stream.on("data", (data) => {
        if (this.statusOutput) return;
        this.trace("receive HTTP/2 data frame of length " + data.length);
        let messages;
        try {
          messages = this.decoder.write(data);
        } catch (e) {
          if (this.httpStatusCode !== undefined && this.httpStatusCode !== 200) {
            let mappedStatus = mapHttpStatusCode(this.httpStatusCode);
            this.cancelWithStatus(mappedStatus.code, mappedStatus.details);
          } else this.cancelWithStatus(constants_1.Status.RESOURCE_EXHAUSTED, e.message);
          return;
        }
        for (let message of messages) {
          this.trace("parsed message of length " + message.length);
          this.callEventTracker.addMessageReceived();
          this.tryPush(message);
        }
      });
      http2Stream.on("end", () => {
        this.readsClosed = true;
        this.maybeOutputStatus();
      });
      http2Stream.on("close", () => {
        this.serverEndedCall = true;
        process.nextTick(() => {
          var _a;
          this.trace("HTTP/2 stream closed with code " + http2Stream.rstCode);
          if (
            ((_a = this.finalStatus) === null || _a === undefined ? undefined : _a.code) ===
            constants_1.Status.OK
          )
            return;
          let code;
          let details = "";
          switch (http2Stream.rstCode) {
            case http2.constants.NGHTTP2_NO_ERROR:
              if (this.finalStatus !== null) return;
              if (this.httpStatusCode && this.httpStatusCode !== 200) {
                let mappedStatus = mapHttpStatusCode(this.httpStatusCode);
                code = mappedStatus.code;
                details = mappedStatus.details;
              } else {
                code = constants_1.Status.INTERNAL;
                details = `Received RST_STREAM with code ${http2Stream.rstCode} (Call ended without gRPC status)`;
              }
              break;
            case http2.constants.NGHTTP2_REFUSED_STREAM:
              code = constants_1.Status.UNAVAILABLE;
              details = "Stream refused by server";
              break;
            case http2.constants.NGHTTP2_CANCEL:
              if (this.connectionDropped) {
                code = constants_1.Status.UNAVAILABLE;
                details = "Connection dropped";
              } else {
                code = constants_1.Status.CANCELLED;
                details = "Call cancelled";
              }
              break;
            case http2.constants.NGHTTP2_ENHANCE_YOUR_CALM:
              code = constants_1.Status.RESOURCE_EXHAUSTED;
              details = "Bandwidth exhausted or memory limit exceeded";
              break;
            case http2.constants.NGHTTP2_INADEQUATE_SECURITY:
              code = constants_1.Status.PERMISSION_DENIED;
              details = "Protocol not secure enough";
              break;
            case http2.constants.NGHTTP2_INTERNAL_ERROR:
              code = constants_1.Status.INTERNAL;
              if (this.internalError === null)
                details = `Received RST_STREAM with code ${http2Stream.rstCode} (Internal server error)`;
              else if (this.internalError.code === "ECONNRESET" || this.internalError.code === "ETIMEDOUT") {
                code = constants_1.Status.UNAVAILABLE;
                details = this.internalError.message;
              } else
                details = `Received RST_STREAM with code ${http2Stream.rstCode} triggered by internal client error: ${this.internalError.message}`;
              break;
            default:
              code = constants_1.Status.INTERNAL;
              details = `Received RST_STREAM with code ${http2Stream.rstCode}`;
          }
          this.endCall({
            code,
            details,
            metadata: new metadata_1.Metadata(),
            rstCode: http2Stream.rstCode,
          });
        });
      });
      http2Stream.on("error", (err) => {
        if (err.code !== "ERR_HTTP2_STREAM_ERROR") {
          this.trace(
            "Node error event: message=" +
              err.message +
              " code=" +
              err.code +
              " errno=" +
              getSystemErrorName(err.errno) +
              " syscall=" +
              err.syscall,
          );
          this.internalError = err;
        }
        this.callEventTracker.onStreamEnd(false);
      });
    }
    getDeadlineInfo() {
      return [`remote_addr=${this.getPeer()}`];
    }
    onDisconnect() {
      this.connectionDropped = true;
      setImmediate(() => {
        this.endCall({
          code: constants_1.Status.UNAVAILABLE,
          details: "Connection dropped",
          metadata: new metadata_1.Metadata(),
        });
      });
    }
    outputStatus() {
      if (!this.statusOutput) {
        this.statusOutput = true;
        this.trace(
          "ended with status: code=" + this.finalStatus.code + ' details="' + this.finalStatus.details + '"',
        );
        this.callEventTracker.onCallEnd(this.finalStatus);
        process.nextTick(() => {
          this.listener.onReceiveStatus(this.finalStatus);
        });
        this.http2Stream.resume();
      }
    }
    trace(text) {
      logging.trace(constants_2.LogVerbosity.DEBUG, TRACER_NAME, "[" + this.callId + "] " + text);
    }
    endCall(status) {
      if (this.finalStatus === null || this.finalStatus.code === constants_1.Status.OK) {
        this.finalStatus = status;
        this.maybeOutputStatus();
      }
      this.destroyHttp2Stream();
    }
    maybeOutputStatus() {
      if (this.finalStatus !== null) {
        if (
          this.finalStatus.code !== constants_1.Status.OK ||
          (this.readsClosed &&
            this.unpushedReadMessages.length === 0 &&
            !this.isReadFilterPending &&
            !this.isPushPending)
        )
          this.outputStatus();
      }
    }
    push(message) {
      this.trace(
        "pushing to reader message of length " + (message instanceof Buffer ? message.length : null),
      );
      this.canPush = false;
      this.isPushPending = true;
      process.nextTick(() => {
        this.isPushPending = false;
        if (this.statusOutput) return;
        this.listener.onReceiveMessage(message);
        this.maybeOutputStatus();
      });
    }
    tryPush(messageBytes) {
      if (this.canPush) {
        this.http2Stream.pause();
        this.push(messageBytes);
      } else {
        this.trace("unpushedReadMessages.push message of length " + messageBytes.length);
        this.unpushedReadMessages.push(messageBytes);
      }
    }
    handleTrailers(headers) {
      this.serverEndedCall = true;
      this.callEventTracker.onStreamEnd(true);
      let headersString = "";
      for (let header of Object.keys(headers))
        headersString +=
          "\t\t" +
          header +
          ": " +
          headers[header] +
          `
`;
      this.trace(
        `Received server trailers:
` + headersString,
      );
      let metadata;
      try {
        metadata = metadata_1.Metadata.fromHttp2Headers(headers);
      } catch (e) {
        metadata = new metadata_1.Metadata();
      }
      let metadataMap = metadata.getMap();
      let status;
      if (typeof metadataMap["grpc-status"] === "string") {
        let receivedStatus = Number(metadataMap["grpc-status"]);
        this.trace("received status code " + receivedStatus + " from server");
        metadata.remove("grpc-status");
        let details = "";
        if (typeof metadataMap["grpc-message"] === "string") {
          try {
            details = decodeURI(metadataMap["grpc-message"]);
          } catch (e) {
            details = metadataMap["grpc-message"];
          }
          metadata.remove("grpc-message");
          this.trace('received status details string "' + details + '" from server');
        }
        status = {
          code: receivedStatus,
          details,
          metadata,
        };
      } else if (this.httpStatusCode) {
        status = mapHttpStatusCode(this.httpStatusCode);
        status.metadata = metadata;
      } else
        status = {
          code: constants_1.Status.UNKNOWN,
          details: "No status information received",
          metadata,
        };
      this.endCall(status);
    }
    destroyHttp2Stream() {
      var _a;
      if (this.http2Stream.destroyed) return;
      if (this.serverEndedCall) this.http2Stream.end();
      else {
        let code;
        if (
          ((_a = this.finalStatus) === null || _a === undefined ? undefined : _a.code) ===
          constants_1.Status.OK
        )
          code = http2.constants.NGHTTP2_NO_ERROR;
        else code = http2.constants.NGHTTP2_CANCEL;
        this.trace("close http2 stream with code " + code);
        this.http2Stream.close(code);
      }
    }
    cancelWithStatus(status, details) {
      this.trace("cancelWithStatus code: " + status + ' details: "' + details + '"');
      this.endCall({
        code: status,
        details,
        metadata: new metadata_1.Metadata(),
      });
    }
    getStatus() {
      return this.finalStatus;
    }
    getPeer() {
      return this.transport.getPeerName();
    }
    getCallNumber() {
      return this.callId;
    }
    getAuthContext() {
      return this.transport.getAuthContext();
    }
    startRead() {
      if (this.finalStatus !== null && this.finalStatus.code !== constants_1.Status.OK) {
        this.readsClosed = true;
        this.maybeOutputStatus();
        return;
      }
      this.canPush = true;
      if (this.unpushedReadMessages.length > 0) {
        let nextMessage = this.unpushedReadMessages.shift();
        this.push(nextMessage);
        return;
      }
      this.http2Stream.resume();
    }
    sendMessageWithContext(context, message) {
      this.trace("write() called with message of length " + message.length);
      let cb = (error) => {
        process.nextTick(() => {
          var _a;
          let code = constants_1.Status.UNAVAILABLE;
          if (
            (error === null || error === undefined ? undefined : error.code) === "ERR_STREAM_WRITE_AFTER_END"
          )
            code = constants_1.Status.INTERNAL;
          if (error) this.cancelWithStatus(code, `Write error: ${error.message}`);
          if (!((_a = context.callback) === null || _a === undefined)) _a.call(context);
        });
      };
      this.trace("sending data chunk of length " + message.length);
      this.callEventTracker.addMessageSent();
      try {
        this.http2Stream.write(message, cb);
      } catch (error) {
        this.endCall({
          code: constants_1.Status.UNAVAILABLE,
          details: `Write failed with error ${error.message}`,
          metadata: new metadata_1.Metadata(),
        });
      }
    }
    halfClose() {
      this.trace("end() called");
      this.trace("calling end() on HTTP/2 stream");
      this.http2Stream.end();
    }
  }
  cjsExports.Http2SubchannelCall = Http2SubchannelCall;
});
export { require_subchannel_call };
