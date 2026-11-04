/**
 * @grpc/grpc-js/build/src/client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_call } from "./call.js";
import { require_channel } from "./channel.js";
import { require_connectivity_state } from "./connectivity-state.js";
import { require_constants } from "./constants.js";
import { require_metadata } from "./metadata.js";
import { require_client_interceptors } from "./client-interceptors.js";

//@ chunk-pwh5dx3n.js:63395-69757 cjs-fingerprint
var require_client = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Client = undefined;
  var call_1 = require_call();
  var channel_1 = require_channel();
  var connectivity_state_1 = require_connectivity_state();
  var constants_1 = require_constants();
  var metadata_1 = require_metadata();
  var client_interceptors_1 = require_client_interceptors();
  var CHANNEL_SYMBOL = Symbol();
  var INTERCEPTOR_SYMBOL = Symbol();
  var INTERCEPTOR_PROVIDER_SYMBOL = Symbol();
  var CALL_INVOCATION_TRANSFORMER_SYMBOL = Symbol();
  function isFunction(arg) {
    return typeof arg === "function";
  }
  function getErrorStackString(error) {
    var _a;
    return (
      ((_a = error.stack) === null || _a === undefined
        ? undefined
        : _a
            .split(
              `
`,
            )
            .slice(1).join(`
`)) || "no stack trace available"
    );
  }
  class Client {
    constructor(address, credentials, options = {}) {
      var _a;
      var _b;
      options = Object.assign({}, options);
      this[INTERCEPTOR_SYMBOL] = (_a = options.interceptors) !== null && _a !== undefined ? _a : [];
      delete options.interceptors;
      this[INTERCEPTOR_PROVIDER_SYMBOL] =
        (_b = options.interceptor_providers) !== null && _b !== undefined ? _b : [];
      delete options.interceptor_providers;
      if (this[INTERCEPTOR_SYMBOL].length > 0 && this[INTERCEPTOR_PROVIDER_SYMBOL].length > 0)
        throw Error(
          "Both interceptors and interceptor_providers were passed as options to the client constructor. Only one of these is allowed.",
        );
      this[CALL_INVOCATION_TRANSFORMER_SYMBOL] = options.callInvocationTransformer;
      delete options.callInvocationTransformer;
      if (options.channelOverride) this[CHANNEL_SYMBOL] = options.channelOverride;
      else if (options.channelFactoryOverride) {
        let channelFactoryOverride = options.channelFactoryOverride;
        delete options.channelFactoryOverride;
        this[CHANNEL_SYMBOL] = channelFactoryOverride(address, credentials, options);
      } else this[CHANNEL_SYMBOL] = new channel_1.ChannelImplementation(address, credentials, options);
    }
    close() {
      this[CHANNEL_SYMBOL].close();
    }
    getChannel() {
      return this[CHANNEL_SYMBOL];
    }
    waitForReady(deadline, callback) {
      let checkState = (err) => {
        if (err) {
          callback(Error("Failed to connect before the deadline"));
          return;
        }
        let newState;
        try {
          newState = this[CHANNEL_SYMBOL].getConnectivityState(true);
        } catch (e) {
          callback(Error("The channel has been closed"));
          return;
        }
        if (newState === connectivity_state_1.ConnectivityState.READY) callback();
        else
          try {
            this[CHANNEL_SYMBOL].watchConnectivityState(newState, deadline, checkState);
          } catch (e) {
            callback(Error("The channel has been closed"));
          }
      };
      setImmediate(checkState);
    }
    checkOptionalUnaryResponseArguments(arg1, arg2, arg3) {
      if (isFunction(arg1))
        return {
          metadata: new metadata_1.Metadata(),
          options: {},
          callback: arg1,
        };
      else if (isFunction(arg2)) {
        if (arg1 instanceof metadata_1.Metadata)
          return {
            metadata: arg1,
            options: {},
            callback: arg2,
          };
        else
          return {
            metadata: new metadata_1.Metadata(),
            options: arg1,
            callback: arg2,
          };
      } else {
        if (!(arg1 instanceof metadata_1.Metadata && arg2 instanceof Object && isFunction(arg3)))
          throw Error("Incorrect arguments passed");
        return {
          metadata: arg1,
          options: arg2,
          callback: arg3,
        };
      }
    }
    makeUnaryRequest(method, serialize, deserialize, argument, metadata, options, callback) {
      var _a;
      var _b;
      let checkedArguments = this.checkOptionalUnaryResponseArguments(metadata, options, callback);
      let methodDefinition = {
        path: method,
        requestStream: false,
        responseStream: false,
        requestSerialize: serialize,
        responseDeserialize: deserialize,
      };
      let callProperties = {
        argument,
        metadata: checkedArguments.metadata,
        call: new call_1.ClientUnaryCallImpl(),
        channel: this[CHANNEL_SYMBOL],
        methodDefinition,
        callOptions: checkedArguments.options,
        callback: checkedArguments.callback,
      };
      if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL])
        callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
      let emitter = callProperties.call;
      let interceptorArgs = {
        clientInterceptors: this[INTERCEPTOR_SYMBOL],
        clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
        callInterceptors:
          (_a = callProperties.callOptions.interceptors) !== null && _a !== undefined ? _a : [],
        callInterceptorProviders:
          (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== undefined ? _b : [],
      };
      let call = client_interceptors_1.getInterceptingCall(
        interceptorArgs,
        callProperties.methodDefinition,
        callProperties.callOptions,
        callProperties.channel,
      );
      emitter.call = call;
      let responseMessage = null;
      let receivedStatus = false;
      let callerStackError = Error();
      call.start(callProperties.metadata, {
        onReceiveMetadata: (metadata) => {
          emitter.emit("metadata", metadata);
        },
        onReceiveMessage(message) {
          if (responseMessage !== null)
            call.cancelWithStatus(constants_1.Status.UNIMPLEMENTED, "Too many responses received");
          responseMessage = message;
        },
        onReceiveStatus(status) {
          if (receivedStatus) return;
          receivedStatus = true;
          if (status.code === constants_1.Status.OK) {
            if (responseMessage === null) {
              let callerStack = getErrorStackString(callerStackError);
              callProperties.callback(
                call_1.callErrorFromStatus(
                  {
                    code: constants_1.Status.UNIMPLEMENTED,
                    details: "No message received",
                    metadata: status.metadata,
                  },
                  callerStack,
                ),
              );
            } else callProperties.callback(null, responseMessage);
          } else {
            let callerStack = getErrorStackString(callerStackError);
            callProperties.callback(call_1.callErrorFromStatus(status, callerStack));
          }
          callerStackError = null;
          emitter.emit("status", status);
        },
      });
      call.sendMessage(argument);
      call.halfClose();
      return emitter;
    }
    makeClientStreamRequest(method, serialize, deserialize, metadata, options, callback) {
      var _a;
      var _b;
      let checkedArguments = this.checkOptionalUnaryResponseArguments(metadata, options, callback);
      let methodDefinition = {
        path: method,
        requestStream: true,
        responseStream: false,
        requestSerialize: serialize,
        responseDeserialize: deserialize,
      };
      let callProperties = {
        metadata: checkedArguments.metadata,
        call: new call_1.ClientWritableStreamImpl(serialize),
        channel: this[CHANNEL_SYMBOL],
        methodDefinition,
        callOptions: checkedArguments.options,
        callback: checkedArguments.callback,
      };
      if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL])
        callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
      let emitter = callProperties.call;
      let interceptorArgs = {
        clientInterceptors: this[INTERCEPTOR_SYMBOL],
        clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
        callInterceptors:
          (_a = callProperties.callOptions.interceptors) !== null && _a !== undefined ? _a : [],
        callInterceptorProviders:
          (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== undefined ? _b : [],
      };
      let call = client_interceptors_1.getInterceptingCall(
        interceptorArgs,
        callProperties.methodDefinition,
        callProperties.callOptions,
        callProperties.channel,
      );
      emitter.call = call;
      let responseMessage = null;
      let receivedStatus = false;
      let callerStackError = Error();
      call.start(callProperties.metadata, {
        onReceiveMetadata: (metadata) => {
          emitter.emit("metadata", metadata);
        },
        onReceiveMessage(message) {
          if (responseMessage !== null)
            call.cancelWithStatus(constants_1.Status.UNIMPLEMENTED, "Too many responses received");
          responseMessage = message;
          call.startRead();
        },
        onReceiveStatus(status) {
          if (receivedStatus) return;
          receivedStatus = true;
          if (status.code === constants_1.Status.OK) {
            if (responseMessage === null) {
              let callerStack = getErrorStackString(callerStackError);
              callProperties.callback(
                call_1.callErrorFromStatus(
                  {
                    code: constants_1.Status.UNIMPLEMENTED,
                    details: "No message received",
                    metadata: status.metadata,
                  },
                  callerStack,
                ),
              );
            } else callProperties.callback(null, responseMessage);
          } else {
            let callerStack = getErrorStackString(callerStackError);
            callProperties.callback(call_1.callErrorFromStatus(status, callerStack));
          }
          callerStackError = null;
          emitter.emit("status", status);
        },
      });
      return emitter;
    }
    checkMetadataAndOptions(arg1, arg2) {
      let metadata;
      let options;
      if (arg1 instanceof metadata_1.Metadata) {
        metadata = arg1;
        if (arg2) options = arg2;
        else options = {};
      } else {
        if (arg1) options = arg1;
        else options = {};
        metadata = new metadata_1.Metadata();
      }
      return {
        metadata,
        options,
      };
    }
    makeServerStreamRequest(method, serialize, deserialize, argument, metadata, options) {
      var _a;
      var _b;
      let checkedArguments = this.checkMetadataAndOptions(metadata, options);
      let methodDefinition = {
        path: method,
        requestStream: false,
        responseStream: true,
        requestSerialize: serialize,
        responseDeserialize: deserialize,
      };
      let callProperties = {
        argument,
        metadata: checkedArguments.metadata,
        call: new call_1.ClientReadableStreamImpl(deserialize),
        channel: this[CHANNEL_SYMBOL],
        methodDefinition,
        callOptions: checkedArguments.options,
      };
      if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL])
        callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
      let stream = callProperties.call;
      let interceptorArgs = {
        clientInterceptors: this[INTERCEPTOR_SYMBOL],
        clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
        callInterceptors:
          (_a = callProperties.callOptions.interceptors) !== null && _a !== undefined ? _a : [],
        callInterceptorProviders:
          (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== undefined ? _b : [],
      };
      let call = client_interceptors_1.getInterceptingCall(
        interceptorArgs,
        callProperties.methodDefinition,
        callProperties.callOptions,
        callProperties.channel,
      );
      stream.call = call;
      let receivedStatus = false;
      let callerStackError = Error();
      call.start(callProperties.metadata, {
        onReceiveMetadata(metadata) {
          stream.emit("metadata", metadata);
        },
        onReceiveMessage(message) {
          stream.push(message);
        },
        onReceiveStatus(status) {
          if (receivedStatus) return;
          receivedStatus = true;
          stream.push(null);
          if (status.code !== constants_1.Status.OK) {
            let callerStack = getErrorStackString(callerStackError);
            stream.emit("error", call_1.callErrorFromStatus(status, callerStack));
          }
          callerStackError = null;
          stream.emit("status", status);
        },
      });
      call.sendMessage(argument);
      call.halfClose();
      return stream;
    }
    makeBidiStreamRequest(method, serialize, deserialize, metadata, options) {
      var _a;
      var _b;
      let checkedArguments = this.checkMetadataAndOptions(metadata, options);
      let methodDefinition = {
        path: method,
        requestStream: true,
        responseStream: true,
        requestSerialize: serialize,
        responseDeserialize: deserialize,
      };
      let callProperties = {
        metadata: checkedArguments.metadata,
        call: new call_1.ClientDuplexStreamImpl(serialize, deserialize),
        channel: this[CHANNEL_SYMBOL],
        methodDefinition,
        callOptions: checkedArguments.options,
      };
      if (this[CALL_INVOCATION_TRANSFORMER_SYMBOL])
        callProperties = this[CALL_INVOCATION_TRANSFORMER_SYMBOL](callProperties);
      let stream = callProperties.call;
      let interceptorArgs = {
        clientInterceptors: this[INTERCEPTOR_SYMBOL],
        clientInterceptorProviders: this[INTERCEPTOR_PROVIDER_SYMBOL],
        callInterceptors:
          (_a = callProperties.callOptions.interceptors) !== null && _a !== undefined ? _a : [],
        callInterceptorProviders:
          (_b = callProperties.callOptions.interceptor_providers) !== null && _b !== undefined ? _b : [],
      };
      let call = client_interceptors_1.getInterceptingCall(
        interceptorArgs,
        callProperties.methodDefinition,
        callProperties.callOptions,
        callProperties.channel,
      );
      stream.call = call;
      let receivedStatus = false;
      let callerStackError = Error();
      call.start(callProperties.metadata, {
        onReceiveMetadata(metadata) {
          stream.emit("metadata", metadata);
        },
        onReceiveMessage(message) {
          stream.push(message);
        },
        onReceiveStatus(status) {
          if (receivedStatus) return;
          receivedStatus = true;
          stream.push(null);
          if (status.code !== constants_1.Status.OK) {
            let callerStack = getErrorStackString(callerStackError);
            stream.emit("error", call_1.callErrorFromStatus(status, callerStack));
          }
          callerStackError = null;
          stream.emit("status", status);
        },
      });
      return stream;
    }
  }
  cjsExports.Client = Client;
});
export { require_client };
