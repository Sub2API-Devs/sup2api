/**
 * @grpc/grpc-js/build/src/resolver-uds.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_resolver } from "./resolver.js";
import { require_call_interface } from "./call-interface.js";

//@ chunk-3k21nfa0.js:354354-354924 cjs-fingerprint
var require_resolver_uds = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.setup = setup;
  var resolver_1 = require_resolver();
  var call_interface_1 = require_call_interface();
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
export { require_resolver_uds };
