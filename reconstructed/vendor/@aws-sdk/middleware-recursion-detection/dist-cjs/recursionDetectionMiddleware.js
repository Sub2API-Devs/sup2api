/**
 * @aws-sdk/middleware-recursion-detection/dist-cjs/recursionDetectionMiddleware.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-recursion-detection@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Vr } from "../../../@aws/lambda-invoke-store/dist-cjs/invoke-store.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-edce4vxq.js:4337-4991 cjs-fingerprint
var Gr = x(function (qr) {
  Object.defineProperty(qr, "__esModule", { value: !0 });
  qr.recursionDetectionMiddleware = void 0;
  var Fr = Vr(),
    jr = Kg(),
    Tt = "X-Amzn-Trace-Id",
    So = "AWS_LAMBDA_FUNCTION_NAME",
    wo = "_X_AMZN_TRACE_ID",
    xo = () => (e) => async (t) => {
      let { request: request } = t;
      if (!jr.HttpRequest.isInstance(request)) return e(t);
      let s = Object.keys(request.headers ?? {}).find((y) => y.toLowerCase() === Tt.toLowerCase()) ?? Tt;
      if (request.headers.hasOwnProperty(s)) return e(t);
      let o = process.env[So],
        a = process.env[wo],
        f = (await Fr.InvokeStore.getInstanceAsync())?.getXRayTraceId() ?? a,
        m = (y) => typeof y === "string" && y.length > 0;
      if (m(o) && m(f)) request.headers[Tt] = f;
      return e({ ...t, request: request });
    };
  qr.recursionDetectionMiddleware = xo;
});

export { Gr };
