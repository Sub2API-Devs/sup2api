/**
 * @aws-sdk/middleware-host-header/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-host-header@3.936.0
 * pieces: chunk-edce4vxq.js (2)
 * attribution: cjs-fingerprint 1, cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Kg } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-edce4vxq.js:724-1420 cjs-fingerprint
var Ome = x(function (oo) {
  var so = Kg();
  function no(e) {
    return e;
  }
  var zr = (e) => (t) => async (r) => {
      if (!so.HttpRequest.isInstance(r.request)) return t(r);
      let { request: request } = r,
        { handlerProtocol: handlerProtocol = "" } = e.requestHandler.metadata || {};
      if (handlerProtocol.indexOf("h2") >= 0 && !request.headers[":authority"])
        (delete request.headers.host,
          (request.headers[":authority"] = request.hostname + (request.port ? ":" + request.port : "")));
      else if (!request.headers.host) {
        let hostname = request.hostname;
        if (request.port != null) hostname += `:${request.port}`;
        request.headers.host = hostname;
      }
      return t(r);
    },
    $r = { name: "hostHeaderMiddleware", step: "build", priority: "low", tags: ["HOST"], override: !0 },
    io = (e) => ({
      applyToStack: (t) => {
        t.add(zr(e), $r);
      },
    });
  oo.getHostHeaderPlugin = io;
  oo.hostHeaderMiddleware = zr;
  oo.hostHeaderMiddlewareOptions = $r;
  oo.resolveHostHeaderConfig = no;
});
//@ chunk-edce4vxq.js:115054-115651 cjs-require-graph
var Lme = x(function (nu) {
  var ru = Kg(),
    Zs = "content-length";
  function en(e) {
    return (t) => async (r) => {
      let request = r.request;
      if (ru.HttpRequest.isInstance(request)) {
        let { body: body, headers: headers } = request;
        if (
          body &&
          Object.keys(headers)
            .map((c) => c.toLowerCase())
            .indexOf(Zs) === -1
        )
          try {
            let c = e(body);
            request.headers = { ...request.headers, [Zs]: String(c) };
          } catch (error) {}
      }
      return t({ ...r, request: request });
    };
  }
  var tn = {
      step: "build",
      tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
      name: "contentLengthMiddleware",
      override: !0,
    },
    su = (e) => ({
      applyToStack: (t) => {
        t.add(en(e.bodyLengthChecker), tn);
      },
    });
  nu.contentLengthMiddleware = en;
  nu.contentLengthMiddlewareOptions = tn;
  nu.getContentLengthPlugin = su;
});

export { Ome, Lme };
