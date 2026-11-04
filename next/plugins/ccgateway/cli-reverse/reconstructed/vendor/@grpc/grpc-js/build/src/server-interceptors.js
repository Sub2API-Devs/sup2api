/**
 * @grpc/grpc-js/build/src/server-interceptors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../runtime/bun-runtime.js";
import { ue } from "./metadata.js";
import { k } from "./constants.js";
import { Qi } from "./error.js";
import { Ao } from "./stream-decoder.js";
import { K } from "./logging.js";
import { pn } from "./orca.js";

//@ chunk-pwh5dx3n.js:293534-308145 cjs-fingerprint
var zo = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BaseServerInterceptingCall =
    cjsExports.ServerInterceptingCall =
    cjsExports.ResponderBuilder =
    cjsExports.ServerListenerBuilder =
      undefined;
  cjsExports.isInterceptingServerListener = isInterceptingServerListener;
  cjsExports.getServerInterceptingCall = getServerInterceptingCall;
  var metadata_1 = ue();
  var constants_1 = k();
  var http2 = Be("http2");
  var error_1 = Qi();
  var zlib = Be("zlib");
  var stream_decoder_1 = Ao();
  var logging = K();
  var tls_1 = Be("tls");
  var orca_1 = pn();
  var TRACER_NAME = "server_call";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  class ServerListenerBuilder {
    constructor() {
      this.metadata = undefined;
      this.message = undefined;
      this.halfClose = undefined;
      this.cancel = undefined;
    }
    withOnReceiveMetadata(onReceiveMetadata) {
      this.metadata = onReceiveMetadata;
      return this;
    }
    withOnReceiveMessage(onReceiveMessage) {
      this.message = onReceiveMessage;
      return this;
    }
    withOnReceiveHalfClose(onReceiveHalfClose) {
      this.halfClose = onReceiveHalfClose;
      return this;
    }
    withOnCancel(onCancel) {
      this.cancel = onCancel;
      return this;
    }
    build() {
      return {
        onReceiveMetadata: this.metadata,
        onReceiveMessage: this.message,
        onReceiveHalfClose: this.halfClose,
        onCancel: this.cancel,
      };
    }
  }
  cjsExports.ServerListenerBuilder = ServerListenerBuilder;
  function isInterceptingServerListener(listener) {
    return listener.onReceiveMetadata !== undefined && listener.onReceiveMetadata.length === 1;
  }
  class InterceptingServerListenerImpl {
    constructor(listener, nextListener) {
      this.listener = listener;
      this.nextListener = nextListener;
      this.cancelled = false;
      this.processingMetadata = false;
      this.hasPendingMessage = false;
      this.pendingMessage = null;
      this.processingMessage = false;
      this.hasPendingHalfClose = false;
    }
    processPendingMessage() {
      if (this.hasPendingMessage) {
        this.nextListener.onReceiveMessage(this.pendingMessage);
        this.pendingMessage = null;
        this.hasPendingMessage = false;
      }
    }
    processPendingHalfClose() {
      if (this.hasPendingHalfClose) {
        this.nextListener.onReceiveHalfClose();
        this.hasPendingHalfClose = false;
      }
    }
    onReceiveMetadata(metadata) {
      if (this.cancelled) return;
      this.processingMetadata = true;
      this.listener.onReceiveMetadata(metadata, (interceptedMetadata) => {
        this.processingMetadata = false;
        if (this.cancelled) return;
        this.nextListener.onReceiveMetadata(interceptedMetadata);
        this.processPendingMessage();
        this.processPendingHalfClose();
      });
    }
    onReceiveMessage(message) {
      if (this.cancelled) return;
      this.processingMessage = true;
      this.listener.onReceiveMessage(message, (msg) => {
        this.processingMessage = false;
        if (this.cancelled) return;
        if (this.processingMetadata) {
          this.pendingMessage = msg;
          this.hasPendingMessage = true;
        } else {
          this.nextListener.onReceiveMessage(msg);
          this.processPendingHalfClose();
        }
      });
    }
    onReceiveHalfClose() {
      if (this.cancelled) return;
      this.listener.onReceiveHalfClose(() => {
        if (this.cancelled) return;
        if (this.processingMetadata || this.processingMessage) this.hasPendingHalfClose = true;
        else this.nextListener.onReceiveHalfClose();
      });
    }
    onCancel() {
      this.cancelled = true;
      this.listener.onCancel();
      this.nextListener.onCancel();
    }
  }
  class ResponderBuilder {
    constructor() {
      this.start = undefined;
      this.metadata = undefined;
      this.message = undefined;
      this.status = undefined;
    }
    withStart(start) {
      this.start = start;
      return this;
    }
    withSendMetadata(sendMetadata) {
      this.metadata = sendMetadata;
      return this;
    }
    withSendMessage(sendMessage) {
      this.message = sendMessage;
      return this;
    }
    withSendStatus(sendStatus) {
      this.status = sendStatus;
      return this;
    }
    build() {
      return {
        start: this.start,
        sendMetadata: this.metadata,
        sendMessage: this.message,
        sendStatus: this.status,
      };
    }
  }
  cjsExports.ResponderBuilder = ResponderBuilder;
  var defaultServerListener = {
    onReceiveMetadata: (metadata, next) => {
      next(metadata);
    },
    onReceiveMessage: (message, next) => {
      next(message);
    },
    onReceiveHalfClose: (next) => {
      next();
    },
    onCancel: () => {},
  };
  var defaultResponder = {
    start: (next) => {
      next();
    },
    sendMetadata: (metadata, next) => {
      next(metadata);
    },
    sendMessage: (message, next) => {
      next(message);
    },
    sendStatus: (status, next) => {
      next(status);
    },
  };
  class ServerInterceptingCall {
    constructor(nextCall, responder) {
      var _a;
      var _b;
      var _c;
      var _d;
      this.nextCall = nextCall;
      this.processingMetadata = false;
      this.sentMetadata = false;
      this.processingMessage = false;
      this.pendingMessage = null;
      this.pendingMessageCallback = null;
      this.pendingStatus = null;
      this.responder = {
        start:
          (_a = responder === null || responder === undefined ? undefined : responder.start) !== null &&
          _a !== undefined
            ? _a
            : defaultResponder.start,
        sendMetadata:
          (_b = responder === null || responder === undefined ? undefined : responder.sendMetadata) !==
            null && _b !== undefined
            ? _b
            : defaultResponder.sendMetadata,
        sendMessage:
          (_c = responder === null || responder === undefined ? undefined : responder.sendMessage) !== null &&
          _c !== undefined
            ? _c
            : defaultResponder.sendMessage,
        sendStatus:
          (_d = responder === null || responder === undefined ? undefined : responder.sendStatus) !== null &&
          _d !== undefined
            ? _d
            : defaultResponder.sendStatus,
      };
    }
    processPendingMessage() {
      if (this.pendingMessageCallback) {
        this.nextCall.sendMessage(this.pendingMessage, this.pendingMessageCallback);
        this.pendingMessage = null;
        this.pendingMessageCallback = null;
      }
    }
    processPendingStatus() {
      if (this.pendingStatus) {
        this.nextCall.sendStatus(this.pendingStatus);
        this.pendingStatus = null;
      }
    }
    start(listener) {
      this.responder.start((interceptedListener) => {
        var _a;
        var _b;
        var _c;
        var _d;
        let fullInterceptedListener = {
          onReceiveMetadata:
            (_a =
              interceptedListener === null || interceptedListener === undefined
                ? undefined
                : interceptedListener.onReceiveMetadata) !== null && _a !== undefined
              ? _a
              : defaultServerListener.onReceiveMetadata,
          onReceiveMessage:
            (_b =
              interceptedListener === null || interceptedListener === undefined
                ? undefined
                : interceptedListener.onReceiveMessage) !== null && _b !== undefined
              ? _b
              : defaultServerListener.onReceiveMessage,
          onReceiveHalfClose:
            (_c =
              interceptedListener === null || interceptedListener === undefined
                ? undefined
                : interceptedListener.onReceiveHalfClose) !== null && _c !== undefined
              ? _c
              : defaultServerListener.onReceiveHalfClose,
          onCancel:
            (_d =
              interceptedListener === null || interceptedListener === undefined
                ? undefined
                : interceptedListener.onCancel) !== null && _d !== undefined
              ? _d
              : defaultServerListener.onCancel,
        };
        let finalInterceptingListener = new InterceptingServerListenerImpl(fullInterceptedListener, listener);
        this.nextCall.start(finalInterceptingListener);
      });
    }
    sendMetadata(metadata) {
      this.processingMetadata = true;
      this.sentMetadata = true;
      this.responder.sendMetadata(metadata, (interceptedMetadata) => {
        this.processingMetadata = false;
        this.nextCall.sendMetadata(interceptedMetadata);
        this.processPendingMessage();
        this.processPendingStatus();
      });
    }
    sendMessage(message, callback) {
      this.processingMessage = true;
      if (!this.sentMetadata) this.sendMetadata(new metadata_1.Metadata());
      this.responder.sendMessage(message, (interceptedMessage) => {
        this.processingMessage = false;
        if (this.processingMetadata) {
          this.pendingMessage = interceptedMessage;
          this.pendingMessageCallback = callback;
        } else this.nextCall.sendMessage(interceptedMessage, callback);
      });
    }
    sendStatus(status) {
      this.responder.sendStatus(status, (interceptedStatus) => {
        if (this.processingMetadata || this.processingMessage) this.pendingStatus = interceptedStatus;
        else this.nextCall.sendStatus(interceptedStatus);
      });
    }
    startRead() {
      this.nextCall.startRead();
    }
    getPeer() {
      return this.nextCall.getPeer();
    }
    getDeadline() {
      return this.nextCall.getDeadline();
    }
    getHost() {
      return this.nextCall.getHost();
    }
    getAuthContext() {
      return this.nextCall.getAuthContext();
    }
    getConnectionInfo() {
      return this.nextCall.getConnectionInfo();
    }
    getMetricsRecorder() {
      return this.nextCall.getMetricsRecorder();
    }
  }
  cjsExports.ServerInterceptingCall = ServerInterceptingCall;
  var GRPC_ACCEPT_ENCODING_HEADER = "grpc-accept-encoding";
  var GRPC_ENCODING_HEADER = "grpc-encoding";
  var GRPC_MESSAGE_HEADER = "grpc-message";
  var GRPC_STATUS_HEADER = "grpc-status";
  var GRPC_TIMEOUT_HEADER = "grpc-timeout";
  var DEADLINE_REGEX = /(\d{1,8})\s*([HMSmun])/;
  var deadlineUnitsToMs = {
    H: 3600000,
    M: 60000,
    S: 1000,
    m: 1,
    u: 0.001,
    n: 0.000001,
  };
  var defaultCompressionHeaders = {
    [GRPC_ACCEPT_ENCODING_HEADER]: "identity,deflate,gzip",
    [GRPC_ENCODING_HEADER]: "identity",
  };
  var defaultResponseHeaders = {
    [http2.constants.HTTP2_HEADER_STATUS]: http2.constants.HTTP_STATUS_OK,
    [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: "application/grpc+proto",
  };
  var defaultResponseOptions = {
    waitForTrailers: true,
  };
  class BaseServerInterceptingCall {
    constructor(stream, headers, callEventTracker, handler, options) {
      var _a;
      var _b;
      this.stream = stream;
      this.callEventTracker = callEventTracker;
      this.handler = handler;
      this.listener = null;
      this.deadlineTimer = null;
      this.deadline = 1 / 0;
      this.maxSendMessageSize = constants_1.DEFAULT_MAX_SEND_MESSAGE_LENGTH;
      this.maxReceiveMessageSize = constants_1.DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH;
      this.cancelled = false;
      this.metadataSent = false;
      this.wantTrailers = false;
      this.cancelNotified = false;
      this.incomingEncoding = "identity";
      this.readQueue = [];
      this.isReadPending = false;
      this.receivedHalfClose = false;
      this.streamEnded = false;
      this.metricsRecorder = new orca_1.PerRequestMetricRecorder();
      this.stream.once("close", () => {
        var _a;
        trace(
          "Request to method " +
            ((_a = this.handler) === null || _a === undefined ? undefined : _a.path) +
            " stream closed with rstCode " +
            this.stream.rstCode,
        );
        if (this.callEventTracker && !this.streamEnded) {
          this.streamEnded = true;
          this.callEventTracker.onStreamEnd(false);
          this.callEventTracker.onCallEnd({
            code: constants_1.Status.CANCELLED,
            details: "Stream closed before sending status",
            metadata: null,
          });
        }
        this.notifyOnCancel();
      });
      this.stream.on("data", (data) => {
        this.handleDataFrame(data);
      });
      this.stream.pause();
      this.stream.on("end", () => {
        this.handleEndEvent();
      });
      if ("grpc.max_send_message_length" in options)
        this.maxSendMessageSize = options["grpc.max_send_message_length"];
      if ("grpc.max_receive_message_length" in options)
        this.maxReceiveMessageSize = options["grpc.max_receive_message_length"];
      this.host = (_a = headers[":authority"]) !== null && _a !== undefined ? _a : headers.host;
      this.decoder = new stream_decoder_1.StreamDecoder(this.maxReceiveMessageSize);
      let metadata = metadata_1.Metadata.fromHttp2Headers(headers);
      if (logging.isTracerEnabled(TRACER_NAME))
        trace("Request to " + this.handler.path + " received headers " + JSON.stringify(metadata.toJSON()));
      let timeoutHeader = metadata.get(GRPC_TIMEOUT_HEADER);
      if (timeoutHeader.length > 0) this.handleTimeoutHeader(timeoutHeader[0]);
      let encodingHeader = metadata.get(GRPC_ENCODING_HEADER);
      if (encodingHeader.length > 0) this.incomingEncoding = encodingHeader[0];
      metadata.remove(GRPC_TIMEOUT_HEADER);
      metadata.remove(GRPC_ENCODING_HEADER);
      metadata.remove(GRPC_ACCEPT_ENCODING_HEADER);
      metadata.remove(http2.constants.HTTP2_HEADER_ACCEPT_ENCODING);
      metadata.remove(http2.constants.HTTP2_HEADER_TE);
      metadata.remove(http2.constants.HTTP2_HEADER_CONTENT_TYPE);
      this.metadata = metadata;
      let socket = (_b = stream.session) === null || _b === undefined ? undefined : _b.socket;
      this.connectionInfo = {
        localAddress: socket === null || socket === undefined ? undefined : socket.localAddress,
        localPort: socket === null || socket === undefined ? undefined : socket.localPort,
        remoteAddress: socket === null || socket === undefined ? undefined : socket.remoteAddress,
        remotePort: socket === null || socket === undefined ? undefined : socket.remotePort,
      };
      this.shouldSendMetrics = !!options["grpc.server_call_metric_recording"];
    }
    handleTimeoutHeader(timeoutHeader) {
      let match = timeoutHeader.toString().match(DEADLINE_REGEX);
      if (match === null) {
        let status = {
          code: constants_1.Status.INTERNAL,
          details: `Invalid ${GRPC_TIMEOUT_HEADER} value "${timeoutHeader}"`,
          metadata: null,
        };
        process.nextTick(() => {
          this.sendStatus(status);
        });
        return;
      }
      let timeout = (+match[1] * deadlineUnitsToMs[match[2]]) | 0;
      let now = new Date();
      this.deadline = now.setMilliseconds(now.getMilliseconds() + timeout);
      this.deadlineTimer = setTimeout(() => {
        let status = {
          code: constants_1.Status.DEADLINE_EXCEEDED,
          details: "Deadline exceeded",
          metadata: null,
        };
        this.sendStatus(status);
      }, timeout);
    }
    checkCancelled() {
      if (!this.cancelled && (this.stream.destroyed || this.stream.closed)) {
        this.notifyOnCancel();
        this.cancelled = true;
      }
      return this.cancelled;
    }
    notifyOnCancel() {
      if (this.cancelNotified) return;
      this.cancelNotified = true;
      this.cancelled = true;
      process.nextTick(() => {
        var _a;
        if (!((_a = this.listener) === null || _a === undefined)) _a.onCancel();
      });
      if (this.deadlineTimer) clearTimeout(this.deadlineTimer);
      this.stream.resume();
    }
    maybeSendMetadata() {
      if (!this.metadataSent) this.sendMetadata(new metadata_1.Metadata());
    }
    serializeMessage(value) {
      let messageBuffer = this.handler.serialize(value);
      let byteLength = messageBuffer.byteLength;
      let output = Buffer.allocUnsafe(byteLength + 5);
      output.writeUInt8(0, 0);
      output.writeUInt32BE(byteLength, 1);
      messageBuffer.copy(output, 5);
      return output;
    }
    decompressMessage(message, encoding) {
      let messageContents = message.subarray(5);
      if (encoding === "identity") return messageContents;
      else if (encoding === "deflate" || encoding === "gzip") {
        let decompresser;
        if (encoding === "deflate") decompresser = zlib.createInflate();
        else decompresser = zlib.createGunzip();
        return new Promise((resolve, reject) => {
          let totalLength = 0;
          let messageParts = [];
          decompresser.on("error", (error) => {
            reject({
              code: constants_1.Status.INTERNAL,
              details: "Failed to decompress message",
            });
          });
          decompresser.on("data", (chunk) => {
            messageParts.push(chunk);
            totalLength += chunk.byteLength;
            if (this.maxReceiveMessageSize !== -1 && totalLength > this.maxReceiveMessageSize) {
              decompresser.destroy();
              reject({
                code: constants_1.Status.RESOURCE_EXHAUSTED,
                details: `Received message that decompresses to a size larger than ${this.maxReceiveMessageSize}`,
              });
            }
          });
          decompresser.on("end", () => {
            resolve(Buffer.concat(messageParts));
          });
          decompresser.write(messageContents);
          decompresser.end();
        });
      } else
        return Promise.reject({
          code: constants_1.Status.UNIMPLEMENTED,
          details: `Received message compressed with unsupported encoding "${encoding}"`,
        });
    }
    async decompressAndMaybePush(queueEntry) {
      if (queueEntry.type !== "COMPRESSED") throw Error(`Invalid queue entry type: ${queueEntry.type}`);
      let incomingEncoding =
        queueEntry.compressedMessage.readUInt8(0) === 1 ? this.incomingEncoding : "identity";
      let decompressedMessage;
      try {
        decompressedMessage = await this.decompressMessage(queueEntry.compressedMessage, incomingEncoding);
      } catch (err) {
        this.sendStatus(err);
        return;
      }
      try {
        queueEntry.parsedMessage = this.handler.deserialize(decompressedMessage);
      } catch (err) {
        this.sendStatus({
          code: constants_1.Status.INTERNAL,
          details: `Error deserializing request: ${err.message}`,
        });
        return;
      }
      queueEntry.type = "READABLE";
      this.maybePushNextMessage();
    }
    maybePushNextMessage() {
      if (
        this.listener &&
        this.isReadPending &&
        this.readQueue.length > 0 &&
        this.readQueue[0].type !== "COMPRESSED"
      ) {
        this.isReadPending = false;
        let nextQueueEntry = this.readQueue.shift();
        if (nextQueueEntry.type === "READABLE") this.listener.onReceiveMessage(nextQueueEntry.parsedMessage);
        else this.listener.onReceiveHalfClose();
      }
    }
    handleDataFrame(data) {
      var _a;
      if (this.checkCancelled()) return;
      trace("Request to " + this.handler.path + " received data frame of size " + data.length);
      let rawMessages;
      try {
        rawMessages = this.decoder.write(data);
      } catch (e) {
        this.sendStatus({
          code: constants_1.Status.RESOURCE_EXHAUSTED,
          details: e.message,
        });
        return;
      }
      for (let messageBytes of rawMessages) {
        this.stream.pause();
        let queueEntry = {
          type: "COMPRESSED",
          compressedMessage: messageBytes,
          parsedMessage: null,
        };
        this.readQueue.push(queueEntry);
        this.decompressAndMaybePush(queueEntry);
        if (!((_a = this.callEventTracker) === null || _a === undefined)) _a.addMessageReceived();
      }
    }
    handleEndEvent() {
      this.readQueue.push({
        type: "HALF_CLOSE",
        compressedMessage: null,
        parsedMessage: null,
      });
      this.receivedHalfClose = true;
      this.maybePushNextMessage();
    }
    start(listener) {
      trace("Request to " + this.handler.path + " start called");
      if (this.checkCancelled()) return;
      this.listener = listener;
      listener.onReceiveMetadata(this.metadata);
    }
    sendMetadata(metadata) {
      if (this.checkCancelled()) return;
      if (this.metadataSent) return;
      this.metadataSent = true;
      let custom = metadata ? metadata.toHttp2Headers() : null;
      let headers = Object.assign(
        Object.assign(Object.assign({}, defaultResponseHeaders), defaultCompressionHeaders),
        custom,
      );
      this.stream.respond(headers, defaultResponseOptions);
    }
    sendMessage(message, callback) {
      if (this.checkCancelled()) return;
      let response;
      try {
        response = this.serializeMessage(message);
      } catch (e) {
        this.sendStatus({
          code: constants_1.Status.INTERNAL,
          details: `Error serializing response: ${error_1.getErrorMessage(e)}`,
          metadata: null,
        });
        return;
      }
      if (this.maxSendMessageSize !== -1 && response.length - 5 > this.maxSendMessageSize) {
        this.sendStatus({
          code: constants_1.Status.RESOURCE_EXHAUSTED,
          details: `Sent message larger than max (${response.length} vs. ${this.maxSendMessageSize})`,
          metadata: null,
        });
        return;
      }
      this.maybeSendMetadata();
      trace("Request to " + this.handler.path + " sent data frame of size " + response.length);
      this.stream.write(response, (error) => {
        var _a;
        if (error) {
          this.sendStatus({
            code: constants_1.Status.INTERNAL,
            details: `Error writing message: ${error_1.getErrorMessage(error)}`,
            metadata: null,
          });
          return;
        }
        if (!((_a = this.callEventTracker) === null || _a === undefined)) _a.addMessageSent();
        callback();
      });
    }
    sendStatus(status) {
      var _a;
      var _b;
      var _c;
      if (this.checkCancelled()) return;
      trace(
        "Request to method " +
          ((_a = this.handler) === null || _a === undefined ? undefined : _a.path) +
          " ended with status code: " +
          constants_1.Status[status.code] +
          " details: " +
          status.details,
      );
      let statusMetadata =
        (_c = (_b = status.metadata) === null || _b === undefined ? undefined : _b.clone()) !== null &&
        _c !== undefined
          ? _c
          : new metadata_1.Metadata();
      if (this.shouldSendMetrics)
        statusMetadata.set(orca_1.GRPC_METRICS_HEADER, this.metricsRecorder.serialize());
      if (this.metadataSent) {
        if (!this.wantTrailers) {
          this.wantTrailers = true;
          this.stream.once("wantTrailers", () => {
            if (this.callEventTracker && !this.streamEnded) {
              this.streamEnded = true;
              this.callEventTracker.onStreamEnd(true);
              this.callEventTracker.onCallEnd(status);
            }
            let trailersToSend = Object.assign(
              {
                [GRPC_STATUS_HEADER]: status.code,
                [GRPC_MESSAGE_HEADER]: encodeURI(status.details),
              },
              statusMetadata.toHttp2Headers(),
            );
            this.stream.sendTrailers(trailersToSend);
            this.notifyOnCancel();
          });
          this.stream.end();
        } else this.notifyOnCancel();
      } else {
        if (this.callEventTracker && !this.streamEnded) {
          this.streamEnded = true;
          this.callEventTracker.onStreamEnd(true);
          this.callEventTracker.onCallEnd(status);
        }
        let trailersToSend = Object.assign(
          Object.assign(
            {
              [GRPC_STATUS_HEADER]: status.code,
              [GRPC_MESSAGE_HEADER]: encodeURI(status.details),
            },
            defaultResponseHeaders,
          ),
          statusMetadata.toHttp2Headers(),
        );
        this.stream.respond(trailersToSend, {
          endStream: true,
        });
        this.notifyOnCancel();
      }
    }
    startRead() {
      trace("Request to " + this.handler.path + " startRead called");
      if (this.checkCancelled()) return;
      this.isReadPending = true;
      if (this.readQueue.length === 0) {
        if (!this.receivedHalfClose) this.stream.resume();
      } else this.maybePushNextMessage();
    }
    getPeer() {
      var _a;
      let socket = (_a = this.stream.session) === null || _a === undefined ? undefined : _a.socket;
      if (socket === null || socket === undefined ? undefined : socket.remoteAddress) {
        if (socket.remotePort) return `${socket.remoteAddress}:${socket.remotePort}`;
        else return socket.remoteAddress;
      } else return "unknown";
    }
    getDeadline() {
      return this.deadline;
    }
    getHost() {
      return this.host;
    }
    getAuthContext() {
      var _a;
      if (
        ((_a = this.stream.session) === null || _a === undefined ? undefined : _a.socket) instanceof
        tls_1.TLSSocket
      ) {
        let peerCertificate = this.stream.session.socket.getPeerCertificate();
        return {
          transportSecurityType: "ssl",
          sslPeerCertificate: peerCertificate.raw ? peerCertificate : undefined,
        };
      } else return {};
    }
    getConnectionInfo() {
      return this.connectionInfo;
    }
    getMetricsRecorder() {
      return this.metricsRecorder;
    }
  }
  cjsExports.BaseServerInterceptingCall = BaseServerInterceptingCall;
  function getServerInterceptingCall(interceptors, stream, headers, callEventTracker, handler, options) {
    let methodDefinition = {
      path: handler.path,
      requestStream: handler.type === "clientStream" || handler.type === "bidi",
      responseStream: handler.type === "serverStream" || handler.type === "bidi",
      requestDeserialize: handler.deserialize,
      responseSerialize: handler.serialize,
    };
    let baseCall = new BaseServerInterceptingCall(stream, headers, callEventTracker, handler, options);
    return interceptors.reduce((call, interceptor) => interceptor(methodDefinition, call), baseCall);
  }
});
export { zo };
