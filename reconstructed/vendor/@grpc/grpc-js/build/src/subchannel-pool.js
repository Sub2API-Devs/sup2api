/**
 * @grpc/grpc-js/build/src/subchannel-pool.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { qc } from "./channel-options.js";
import { Pf } from "./subchannel.js";
import { Pe } from "./subchannel-address.js";
import { we } from "./uri-parser.js";
import { pp } from "./transport.js";

//@ chunk-pwh5dx3n.js:236314-237579 cjs-fingerprint
var Ep = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SubchannelPool = undefined;
  cjsExports.getSubchannelPool = getSubchannelPool;
  var channel_options_1 = qc();
  var subchannel_1 = Pf();
  var subchannel_address_1 = Pe();
  var uri_parser_1 = we();
  var transport_1 = pp();
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
export { Ep };
