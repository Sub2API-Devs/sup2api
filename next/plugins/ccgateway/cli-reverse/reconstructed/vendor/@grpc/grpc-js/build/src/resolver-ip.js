/**
 * @grpc/grpc-js/build/src/resolver-ip.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../runtime/bun-runtime.js";
import { vr } from "./call-interface.js";
import { k } from "./constants.js";
import { ue } from "./metadata.js";
import { rt } from "./resolver.js";
import { Pe } from "./subchannel-address.js";
import { we } from "./uri-parser.js";
import { K } from "./logging.js";

//@ chunk-pwh5dx3n.js:354924-356504 cjs-fingerprint
var Vm = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.setup = setup;
  var net_1 = Be("net");
  var call_interface_1 = vr();
  var constants_1 = k();
  var metadata_1 = ue();
  var resolver_1 = rt();
  var subchannel_address_1 = Pe();
  var uri_parser_1 = we();
  var logging = K();
  var TRACER_NAME = "ip_resolver";
  function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
  }
  var IPV4_SCHEME = "ipv4";
  var IPV6_SCHEME = "ipv6";
  var DEFAULT_PORT = 443;
  class IpResolver {
    constructor(target, listener, channelOptions) {
      var _a;
      this.listener = listener;
      this.endpoints = [];
      this.error = null;
      this.hasReturnedResult = false;
      trace("Resolver constructed for target " + uri_parser_1.uriToString(target));
      let addresses = [];
      if (!(target.scheme === IPV4_SCHEME || target.scheme === IPV6_SCHEME)) {
        this.error = {
          code: constants_1.Status.UNAVAILABLE,
          details: `Unrecognized scheme ${target.scheme} in IP resolver`,
          metadata: new metadata_1.Metadata(),
        };
        return;
      }
      let pathList = target.path.split(",");
      for (let path of pathList) {
        let hostPort = uri_parser_1.splitHostPort(path);
        if (hostPort === null) {
          this.error = {
            code: constants_1.Status.UNAVAILABLE,
            details: `Failed to parse ${target.scheme} address ${path}`,
            metadata: new metadata_1.Metadata(),
          };
          return;
        }
        if (
          (target.scheme === IPV4_SCHEME && !net_1.isIPv4(hostPort.host)) ||
          (target.scheme === IPV6_SCHEME && !net_1.isIPv6(hostPort.host))
        ) {
          this.error = {
            code: constants_1.Status.UNAVAILABLE,
            details: `Failed to parse ${target.scheme} address ${path}`,
            metadata: new metadata_1.Metadata(),
          };
          return;
        }
        addresses.push({
          host: hostPort.host,
          port: (_a = hostPort.port) !== null && _a !== undefined ? _a : DEFAULT_PORT,
        });
      }
      this.endpoints = addresses.map((address) => ({
        addresses: [address],
      }));
      trace(
        "Parsed " +
          target.scheme +
          " address list " +
          addresses.map(subchannel_address_1.subchannelAddressToString),
      );
    }
    updateResolution() {
      if (!this.hasReturnedResult) {
        this.hasReturnedResult = true;
        process.nextTick(() => {
          if (this.error) this.listener(call_interface_1.statusOrFromError(this.error), {}, null, "");
          else this.listener(call_interface_1.statusOrFromValue(this.endpoints), {}, null, "");
        });
      }
    }
    destroy() {
      this.hasReturnedResult = false;
    }
    static getDefaultAuthority(target) {
      return target.path.split(",")[0];
    }
  }
  function setup() {
    resolver_1.registerResolver(IPV4_SCHEME, IpResolver);
    resolver_1.registerResolver(IPV6_SCHEME, IpResolver);
  }
});
export { Vm };
