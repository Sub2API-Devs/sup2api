/**
 * @grpc/grpc-js/build/src/resolver-uds.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { rt } from "./resolver.js";
import { vr } from "./call-interface.js";

//@ chunk-pwh5dx3n.js:354354-354924 cjs-fingerprint
var Hm = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.setup = setup;
  var resolver_1 = rt();
  var call_interface_1 = vr();
  class UdsResolver {
    constructor(target, listener, channelOptions) {
      this.listener = listener;
      this.hasReturnedResult = false;
      this.endpoints = [];
      let path;
      if (target.authority === "") path = "/" + target.path;
      else path = target.path;
      this.endpoints = [
        {
          addresses: [
            {
              path,
            },
          ],
        },
      ];
    }
    updateResolution() {
      if (!this.hasReturnedResult) {
        this.hasReturnedResult = true;
        process.nextTick(this.listener, call_interface_1.statusOrFromValue(this.endpoints), {}, null, "");
      }
    }
    destroy() {
      this.hasReturnedResult = false;
    }
    static getDefaultAuthority(target) {
      return "localhost";
    }
  }
  function setup() {
    resolver_1.registerResolver("unix", UdsResolver);
  }
});
export { Hm };
