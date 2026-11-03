/**
 * @smithy/middleware-endpoint/dist-cjs/adaptors/getEndpointFromConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/middleware-endpoint@4.3.0..4.3.15
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { wD } from "../../../node-config-provider/dist-cjs/index.js";
import { an } from "./getEndpointUrlConfig.js";

//@ chunk-edce4vxq.js:116280-116495 cjs-fingerprint
var hn = x(function (ln) {
  Object.defineProperty(ln, "__esModule", { value: !0 });
  ln.getEndpointFromConfig = void 0;
  var cn = wD(),
    un = an(),
    uu = async (e) => cn.loadConfig(un.getEndpointUrlConfig(e ?? ""))();
  ln.getEndpointFromConfig = uu;
});

export { hn };
