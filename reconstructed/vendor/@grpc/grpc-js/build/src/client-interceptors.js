/**
 * @grpc/grpc-js/build/src/client-interceptors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { ue } from "./metadata.js";
import { vr } from "./call-interface.js";
import { k } from "./constants.js";
import { Qi } from "./error.js";

//@ chunk-pwh5dx3n.js:56650-63395 cjs-fingerprint
var Ca = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.InterceptingCall =
    cjsExports.RequesterBuilder =
    cjsExports.ListenerBuilder =
    cjsExports.InterceptorConfigurationError =
      undefined;
  cjsExports.getInterceptingCall = getInterceptingCall;
  var metadata_1 = ue();
  var call_interface_1 = vr();
  var constants_1 = k();
  var error_1 = Qi();
  class InterceptorConfigurationError extends Error {
    constructor(message) {
      super(message);
      this.name = "InterceptorConfigurationError";
      Error.captureStackTrace(this, InterceptorConfigurationError);
    }
  }
  cjsExports.InterceptorConfigurationError = InterceptorConfigurationError;
  class ListenerBuilder {
    constructor() {
      this.metadata = undefined;
      this.message = undefined;
      this.status = undefined;
    }
    withOnReceiveMetadata(onReceiveMetadata) {
      this.metadata = onReceiveMetadata;
      return this;
    }
    withOnReceiveMessage(onReceiveMessage) {
      this.message = onReceiveMessage;
      return this;
    }
    withOnReceiveStatus(onReceiveStatus) {
      this.status = onReceiveStatus;
      return this;
    }
    build() {
      return {
        onReceiveMetadata: this.metadata,
        onReceiveMessage: this.message,
        onReceiveStatus: this.status,
      };
    }
  }
  cjsExports.ListenerBuilder = ListenerBuilder;
  class RequesterBuilder {
    constructor() {
      this.start = undefined;
      this.message = undefined;
      this.halfClose = undefined;
      this.cancel = undefined;
    }
    withStart(start) {
      this.start = start;
      return this;
    }
    withSendMessage(sendMessage) {
      this.message = sendMessage;
      return this;
    }
    withHalfClose(halfClose) {
      this.halfClose = halfClose;
      return this;
    }
    withCancel(cancel) {
      this.cancel = cancel;
      return this;
    }
    build() {
      return {
        start: this.start,
        sendMessage: this.message,
        halfClose: this.halfClose,
        cancel: this.cancel,
      };
    }
  }
  cjsExports.RequesterBuilder = RequesterBuilder;
  var defaultListener = {
    onReceiveMetadata: (metadata, next) => {
      next(metadata);
    },
    onReceiveMessage: (message, next) => {
      next(message);
    },
    onReceiveStatus: (status, next) => {
      next(status);
    },
  };
  var defaultRequester = {
    start: (metadata, listener, next) => {
      next(metadata, listener);
    },
    sendMessage: (message, next) => {
      next(message);
    },
    halfClose: (next) => {
      next();
    },
    cancel: (next) => {
      next();
    },
  };
  class InterceptingCall {
    constructor(nextCall, requester) {
      var _a;
      var _b;
      var _c;
      var _d;
      this.nextCall = nextCall;
      this.processingMetadata = false;
      this.pendingMessageContext = null;
      this.processingMessage = false;
      this.pendingHalfClose = false;
      if (requester)
        this.requester = {
          start: (_a = requester.start) !== null && _a !== undefined ? _a : defaultRequester.start,
          sendMessage:
            (_b = requester.sendMessage) !== null && _b !== undefined ? _b : defaultRequester.sendMessage,
          halfClose:
            (_c = requester.halfClose) !== null && _c !== undefined ? _c : defaultRequester.halfClose,
          cancel: (_d = requester.cancel) !== null && _d !== undefined ? _d : defaultRequester.cancel,
        };
      else this.requester = defaultRequester;
    }
    cancelWithStatus(status, details) {
      this.requester.cancel(() => {
        this.nextCall.cancelWithStatus(status, details);
      });
    }
    getPeer() {
      return this.nextCall.getPeer();
    }
    processPendingMessage() {
      if (this.pendingMessageContext) {
        this.nextCall.sendMessageWithContext(this.pendingMessageContext, this.pendingMessage);
        this.pendingMessageContext = null;
        this.pendingMessage = null;
      }
    }
    processPendingHalfClose() {
      if (this.pendingHalfClose) this.nextCall.halfClose();
    }
    start(metadata, interceptingListener) {
      var _a;
      var _b;
      var _c;
      var _d;
      var _e;
      var _f;
      let fullInterceptingListener = {
        onReceiveMetadata:
          (_b =
            (_a =
              interceptingListener === null || interceptingListener === undefined
                ? undefined
                : interceptingListener.onReceiveMetadata) === null || _a === undefined
              ? undefined
              : _a.bind(interceptingListener)) !== null && _b !== undefined
            ? _b
            : (metadata) => {},
        onReceiveMessage:
          (_d =
            (_c =
              interceptingListener === null || interceptingListener === undefined
                ? undefined
                : interceptingListener.onReceiveMessage) === null || _c === undefined
              ? undefined
              : _c.bind(interceptingListener)) !== null && _d !== undefined
            ? _d
            : (message) => {},
        onReceiveStatus:
          (_f =
            (_e =
              interceptingListener === null || interceptingListener === undefined
                ? undefined
                : interceptingListener.onReceiveStatus) === null || _e === undefined
              ? undefined
              : _e.bind(interceptingListener)) !== null && _f !== undefined
            ? _f
            : (status) => {},
      };
      this.processingMetadata = true;
      this.requester.start(metadata, fullInterceptingListener, (md, listener) => {
        var _a;
        var _b;
        var _c;
        this.processingMetadata = false;
        let finalInterceptingListener;
        if (call_interface_1.isInterceptingListener(listener)) finalInterceptingListener = listener;
        else {
          let fullListener = {
            onReceiveMetadata:
              (_a = listener.onReceiveMetadata) !== null && _a !== undefined
                ? _a
                : defaultListener.onReceiveMetadata,
            onReceiveMessage:
              (_b = listener.onReceiveMessage) !== null && _b !== undefined
                ? _b
                : defaultListener.onReceiveMessage,
            onReceiveStatus:
              (_c = listener.onReceiveStatus) !== null && _c !== undefined
                ? _c
                : defaultListener.onReceiveStatus,
          };
          finalInterceptingListener = new call_interface_1.InterceptingListenerImpl(
            fullListener,
            fullInterceptingListener,
          );
        }
        this.nextCall.start(md, finalInterceptingListener);
        this.processPendingMessage();
        this.processPendingHalfClose();
      });
    }
    sendMessageWithContext(context, message) {
      this.processingMessage = true;
      this.requester.sendMessage(message, (finalMessage) => {
        this.processingMessage = false;
        if (this.processingMetadata) {
          this.pendingMessageContext = context;
          this.pendingMessage = message;
        } else {
          this.nextCall.sendMessageWithContext(context, finalMessage);
          this.processPendingHalfClose();
        }
      });
    }
    sendMessage(message) {
      this.sendMessageWithContext({}, message);
    }
    startRead() {
      this.nextCall.startRead();
    }
    halfClose() {
      this.requester.halfClose(() => {
        if (this.processingMetadata || this.processingMessage) this.pendingHalfClose = true;
        else this.nextCall.halfClose();
      });
    }
    getAuthContext() {
      return this.nextCall.getAuthContext();
    }
  }
  cjsExports.InterceptingCall = InterceptingCall;
  function getCall(channel, path, options) {
    var _a;
    var _b;
    let deadline = (_a = options.deadline) !== null && _a !== undefined ? _a : 1 / 0;
    let host = options.host;
    let parent = (_b = options.parent) !== null && _b !== undefined ? _b : null;
    let { propagate_flags: propagateFlags, credentials } = options;
    let call = channel.createCall(path, deadline, host, parent, propagateFlags);
    if (credentials) call.setCredentials(credentials);
    return call;
  }
  class BaseInterceptingCall {
    constructor(call, methodDefinition) {
      this.call = call;
      this.methodDefinition = methodDefinition;
    }
    cancelWithStatus(status, details) {
      this.call.cancelWithStatus(status, details);
    }
    getPeer() {
      return this.call.getPeer();
    }
    sendMessageWithContext(context, message) {
      let serialized;
      try {
        serialized = this.methodDefinition.requestSerialize(message);
      } catch (e) {
        this.call.cancelWithStatus(
          constants_1.Status.INTERNAL,
          `Request message serialization failure: ${error_1.getErrorMessage(e)}`,
        );
        return;
      }
      this.call.sendMessageWithContext(context, serialized);
    }
    sendMessage(message) {
      this.sendMessageWithContext({}, message);
    }
    start(metadata, interceptingListener) {
      let readError = null;
      this.call.start(metadata, {
        onReceiveMetadata: (metadata) => {
          var _a;
          if (!(
            (_a =
              interceptingListener === null || interceptingListener === undefined
                ? undefined
                : interceptingListener.onReceiveMetadata) === null || _a === undefined
          ))
            _a.call(interceptingListener, metadata);
        },
        onReceiveMessage: (message) => {
          var _a;
          let deserialized;
          try {
            deserialized = this.methodDefinition.responseDeserialize(message);
          } catch (e) {
            readError = {
              code: constants_1.Status.INTERNAL,
              details: `Response message parsing error: ${error_1.getErrorMessage(e)}`,
              metadata: new metadata_1.Metadata(),
            };
            this.call.cancelWithStatus(readError.code, readError.details);
            return;
          }
          if (!(
            (_a =
              interceptingListener === null || interceptingListener === undefined
                ? undefined
                : interceptingListener.onReceiveMessage) === null || _a === undefined
          ))
            _a.call(interceptingListener, deserialized);
        },
        onReceiveStatus: (status) => {
          var _a;
          var _b;
          if (readError) {
            if (!(
              (_a =
                interceptingListener === null || interceptingListener === undefined
                  ? undefined
                  : interceptingListener.onReceiveStatus) === null || _a === undefined
            ))
              _a.call(interceptingListener, readError);
          } else if (!(
            (_b =
              interceptingListener === null || interceptingListener === undefined
                ? undefined
                : interceptingListener.onReceiveStatus) === null || _b === undefined
          ))
            _b.call(interceptingListener, status);
        },
      });
    }
    startRead() {
      this.call.startRead();
    }
    halfClose() {
      this.call.halfClose();
    }
    getAuthContext() {
      return this.call.getAuthContext();
    }
  }
  class BaseUnaryInterceptingCall extends BaseInterceptingCall {
    constructor(call, methodDefinition) {
      super(call, methodDefinition);
    }
    start(metadata, listener) {
      var _a;
      var _b;
      let receivedMessage = false;
      let wrapperListener = {
        onReceiveMetadata:
          (_b =
            (_a = listener === null || listener === undefined ? undefined : listener.onReceiveMetadata) ===
              null || _a === undefined
              ? undefined
              : _a.bind(listener)) !== null && _b !== undefined
            ? _b
            : (metadata) => {},
        onReceiveMessage: (message) => {
          var _a;
          receivedMessage = true;
          if (!(
            (_a = listener === null || listener === undefined ? undefined : listener.onReceiveMessage) ===
              null || _a === undefined
          ))
            _a.call(listener, message);
        },
        onReceiveStatus: (status) => {
          var _a;
          var _b;
          if (!receivedMessage) {
            if (!(
              (_a = listener === null || listener === undefined ? undefined : listener.onReceiveMessage) ===
                null || _a === undefined
            ))
              _a.call(listener, null);
          }
          if (!(
            (_b = listener === null || listener === undefined ? undefined : listener.onReceiveStatus) ===
              null || _b === undefined
          ))
            _b.call(listener, status);
        },
      };
      super.start(metadata, wrapperListener);
      this.call.startRead();
    }
  }
  class BaseStreamingInterceptingCall extends BaseInterceptingCall {}
  function getBottomInterceptingCall(channel, options, methodDefinition) {
    let call = getCall(channel, methodDefinition.path, options);
    if (methodDefinition.responseStream) return new BaseStreamingInterceptingCall(call, methodDefinition);
    else return new BaseUnaryInterceptingCall(call, methodDefinition);
  }
  function getInterceptingCall(interceptorArgs, methodDefinition, options, channel) {
    if (
      interceptorArgs.clientInterceptors.length > 0 &&
      interceptorArgs.clientInterceptorProviders.length > 0
    )
      throw new InterceptorConfigurationError(
        "Both interceptors and interceptor_providers were passed as options to the client constructor. Only one of these is allowed.",
      );
    if (interceptorArgs.callInterceptors.length > 0 && interceptorArgs.callInterceptorProviders.length > 0)
      throw new InterceptorConfigurationError(
        "Both interceptors and interceptor_providers were passed as call options. Only one of these is allowed.",
      );
    let interceptors = [];
    if (interceptorArgs.callInterceptors.length > 0 || interceptorArgs.callInterceptorProviders.length > 0)
      interceptors = []
        .concat(
          interceptorArgs.callInterceptors,
          interceptorArgs.callInterceptorProviders.map((provider) => provider(methodDefinition)),
        )
        .filter((interceptor) => interceptor);
    else
      interceptors = []
        .concat(
          interceptorArgs.clientInterceptors,
          interceptorArgs.clientInterceptorProviders.map((provider) => provider(methodDefinition)),
        )
        .filter((interceptor) => interceptor);
    let interceptorOptions = Object.assign({}, options, {
      method_definition: methodDefinition,
    });
    return interceptors.reduceRight(
      (nextCall, nextInterceptor) => (currentOptions) => nextInterceptor(currentOptions, nextCall),
      (finalOptions) => getBottomInterceptingCall(channel, finalOptions, methodDefinition),
    )(interceptorOptions);
  }
});
export { Ca };
