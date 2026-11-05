/**
 * @grpc/grpc-js/build/src/channel.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_channel_credentials } from "./channel-credentials.js";
import { require_internal_channel } from "./internal-channel.js";

//@ chunk-3k21nfa0.js:277418-278508 cjs-fingerprint
var require_channel = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ChannelImplementation = undefined;
  var channel_credentials_1 = require_channel_credentials();
  var internal_channel_1 = require_internal_channel();
  class ChannelImplementation {
    constructor(target, credentials, options) {
      if (typeof target !== "string") throw TypeError("Channel target must be a string");
      if (!(credentials instanceof channel_credentials_1.ChannelCredentials))
        throw TypeError("Channel credentials must be a ChannelCredentials object");
      if (options) {
        if (typeof options !== "object") throw TypeError("Channel options must be an object");
      }
      this.internalChannel = new internal_channel_1.InternalChannel(target, credentials, options);
    }
    close() {
      this.internalChannel.close();
    }
    getTarget() {
      return this.internalChannel.getTarget();
    }
    getConnectivityState(tryToConnect) {
      return this.internalChannel.getConnectivityState(tryToConnect);
    }
    watchConnectivityState(currentState, deadline, callback) {
      this.internalChannel.watchConnectivityState(currentState, deadline, callback);
    }
    getChannelzRef() {
      return this.internalChannel.getChannelzRef();
    }
    createCall(method, deadline, host, parentCall, propagateFlags) {
      if (typeof method !== "string") throw TypeError("Channel#createCall: method must be a string");
      if (!(typeof deadline === "number" || deadline instanceof Date))
        throw TypeError("Channel#createCall: deadline must be a number or Date");
      return this.internalChannel.createCall(method, deadline, host, parentCall, propagateFlags);
    }
  }
  cjsExports.ChannelImplementation = ChannelImplementation;
});
export { require_channel };
