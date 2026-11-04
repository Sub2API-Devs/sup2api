/**
 * @grpc/grpc-js/build/src/resolver-ip.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_call_interface } from "./call-interface.js";
import { require_constants } from "./constants.js";
import { require_metadata } from "./metadata.js";
import { require_resolver } from "./resolver.js";
import { require_subchannel_address } from "./subchannel-address.js";
import { require_uri_parser } from "./uri-parser.js";
import { require_logging } from "./logging.js";

//@ chunk-pwh5dx3n.js:354924-356504 cjs-fingerprint
var require_resolver_ip = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.setup = setup;
  var net_1 = importMetaRequire("net");
  var call_interface_1 = require_call_interface();
  var constants_1 = require_constants();
  var metadata_1 = require_metadata();
  var resolver_1 = require_resolver();
  var subchannel_address_1 = require_subchannel_address();
  var uri_parser_1 = require_uri_parser();
  var logging = require_logging();
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
export { require_resolver_ip };
