/**
 * @grpc/grpc-js/build/src/subchannel-pool.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_channel_options } from "./channel-options.js";
import { require_subchannel } from "./subchannel.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_transport } from "./transport.js";

//@ chunk-3k21nfa0.js:236314-237579 cjs-fingerprint
var require_subchannel_pool = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SubchannelPool = undefined;
  cjsExports.getSubchannelPool = getSubchannelPool;
  var channel_options_1 = require_channel_options();
  var subchannel_1 = require_subchannel();
  var subchannel_address_1 = require_subchannel_address();
  var uri_parser_1 = require_uri_parser();
  var transport_1 = require_transport();
  var REF_CHECK_INTERVAL = 1e4;
  class SubchannelPool {
    constructor() {
      this.pool = Object.create(null);
      this.cleanupTimer = null;
    }
    unrefUnusedSubchannels() {
      let allSubchannelsUnrefed = true;
      for (let channelTarget in this.pool) {
        let refedSubchannels = this.pool[channelTarget].filter((value) => !value.subchannel.unrefIfOneRef());
        if (refedSubchannels.length > 0) allSubchannelsUnrefed = false;
        this.pool[channelTarget] = refedSubchannels;
      }
      if (allSubchannelsUnrefed && this.cleanupTimer !== null) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
      }
    }
    ensureCleanupTask() {
      var _a;
      var _b;
      if (this.cleanupTimer === null) {
        this.cleanupTimer = setInterval(() => {
          this.unrefUnusedSubchannels();
        }, REF_CHECK_INTERVAL);
        if (!((_b = (_a = this.cleanupTimer).unref) === null || _b === undefined)) _b.call(_a);
      }
    }
    getOrCreateSubchannel(channelTargetUri, subchannelTarget, channelArguments, channelCredentials) {
      this.ensureCleanupTask();
      let channelTarget = uri_parser_1.uriToString(channelTargetUri);
      if (channelTarget in this.pool) {
        let subchannelObjArray = this.pool[channelTarget];
        for (let subchannelObj of subchannelObjArray)
          if (
            subchannel_address_1.subchannelAddressEqual(subchannelTarget, subchannelObj.subchannelAddress) &&
            channel_options_1.channelOptionsEqual(channelArguments, subchannelObj.channelArguments) &&
            channelCredentials._equals(subchannelObj.channelCredentials)
          )
            return subchannelObj.subchannel;
      }
      let subchannel = new subchannel_1.Subchannel(
        channelTargetUri,
        subchannelTarget,
        channelArguments,
        channelCredentials,
        new transport_1.Http2SubchannelConnector(channelTargetUri),
      );
      if (!(channelTarget in this.pool)) this.pool[channelTarget] = [];
      this.pool[channelTarget].push({
        subchannelAddress: subchannelTarget,
        channelArguments,
        channelCredentials,
        subchannel,
      });
      subchannel.ref();
      return subchannel;
    }
  }
  cjsExports.SubchannelPool = SubchannelPool;
  var globalSubchannelPool = new SubchannelPool();
  function getSubchannelPool(options) {
    if (options) return globalSubchannelPool;
    else return new SubchannelPool();
  }
});
export { require_subchannel_pool };
