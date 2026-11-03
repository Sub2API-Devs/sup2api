/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/endpoint/EndpointParameters.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-require-graph 1
 */
import { x as x_2 } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-a8ee6x44.js:1925-2573 cjs-require-graph
var de = x_2(function (Re) {
  Object.defineProperty(Re, "__esModule", { value: !0 });
  Re.commonParams = Re.resolveClientEndpointParameters = void 0;
  var Ao = (e) =>
    Object.assign(e, {
      useDualstackEndpoint: e.useDualstackEndpoint ?? !1,
      useFipsEndpoint: e.useFipsEndpoint ?? !1,
      useGlobalEndpoint: e.useGlobalEndpoint ?? !1,
      defaultSigningName: "sts",
    });
  Re.resolveClientEndpointParameters = Ao;
  Re.commonParams = {
    UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
    UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
    Endpoint: { type: "builtInParams", name: "endpoint" },
    Region: { type: "builtInParams", name: "region" },
    UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
  };
});

export { de };
