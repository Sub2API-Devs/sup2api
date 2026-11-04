/**
 * @grpc/grpc-js/build/src/channel.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { Mr } from "./channel-credentials.js";
import { Io } from "./internal-channel.js";

//@ chunk-pwh5dx3n.js:277418-278508 cjs-fingerprint
var Ra = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ChannelImplementation = undefined;
  var channel_credentials_1 = Mr();
  var internal_channel_1 = Io();
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
export { Ra };
