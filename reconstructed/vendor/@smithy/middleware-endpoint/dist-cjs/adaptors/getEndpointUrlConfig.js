/**
 * @smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointUrlConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/middleware-endpoint@4.3.0..4.3.15
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { hU } from "../../../shared-ini-file-loader/dist-cjs/index.js";

//@ chunk-edce4vxq.js:115651-116280 cjs-fingerprint
var an = x(function (nn) {
  Object.defineProperty(nn, "__esModule", { value: !0 });
  nn.getEndpointUrlConfig = void 0;
  var ot = hU(),
    rn = "AWS_ENDPOINT_URL",
    sn = "endpoint_url",
    cu = (e) => ({
      environmentVariableSelector: (t) => {
        let mapped = e.split(" ").map((a) => a.toUpperCase()),
          s = t[[rn, ...mapped].join("_")];
        if (s) return s;
        let o = t[rn];
        if (o) return o;
        return;
      },
      configFileSelector: (t, r) => {
        if (r && t.services) {
          let o = r[["services", t.services].join(ot.CONFIG_PREFIX_SEPARATOR)];
          if (o) {
            let mapped = e.split(" ").map((d) => d.toLowerCase()),
              c = o[[mapped.join("_"), sn].join(ot.CONFIG_PREFIX_SEPARATOR)];
            if (c) return c;
          }
        }
        let s = t[sn];
        if (s) return s;
        return;
      },
      default: void 0,
    });
  nn.getEndpointUrlConfig = cu;
});

export { an };
