/**
 * @aws-sdk/middleware-host-header/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-host-header@3.936.0
 * pieces: chunk-edce4vxq.js (2)
 * attribution: cjs-fingerprint 1, cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-edce4vxq.js:724-1420 cjs-fingerprint
var require_middleware_host_header = x(function (cjsExports) {
  var protocolHttp = require_protocol_http();
  function resolveHostHeaderConfig(input) {
    return input;
  }
  var hostHeaderMiddleware = (options) => (next) => async (args) => {
    if (!protocolHttp.HttpRequest.isInstance(args.request)) return next(args);
    let { request } = args;
    let { handlerProtocol = "" } = options.requestHandler.metadata || {};
    if (handlerProtocol.indexOf("h2") >= 0 && !request.headers[":authority"]) {
      delete request.headers.host;
      request.headers[":authority"] = request.hostname + (request.port ? ":" + request.port : "");
    } else if (!request.headers.host) {
      let host = request.hostname;
      if (request.port != null) host += `:${request.port}`;
      request.headers.host = host;
    }
    return next(args);
  };
  var hostHeaderMiddlewareOptions = {
    name: "hostHeaderMiddleware",
    step: "build",
    priority: "low",
    tags: ["HOST"],
    override: true,
  };
  var getHostHeaderPlugin = (options) => ({
    applyToStack: (clientStack) => {
      clientStack.add(hostHeaderMiddleware(options), hostHeaderMiddlewareOptions);
    },
  });
  cjsExports.getHostHeaderPlugin = getHostHeaderPlugin;
  cjsExports.hostHeaderMiddleware = hostHeaderMiddleware;
  cjsExports.hostHeaderMiddlewareOptions = hostHeaderMiddlewareOptions;
  cjsExports.resolveHostHeaderConfig = resolveHostHeaderConfig;
});
//@ chunk-edce4vxq.js:115054-115651 cjs-require-graph
var require_middleware_host_header_2 = x(function (cjsExports) {
  var protocolHttp = require_protocol_http();
  var Zs = "content-length";
  function en(bodyLengthChecker) {
    return (t) => async (r) => {
      let request = r.request;
      if (protocolHttp.HttpRequest.isInstance(request)) {
        let { body, headers } = request;
        if (
          body &&
          Object.keys(headers)
            .map((key) => key.toLowerCase())
            .indexOf(Zs) === -1
        )
          try {
            let c = bodyLengthChecker(body);
            request.headers = {
              ...request.headers,
              [Zs]: String(c),
            };
          } catch (error) {}
      }
      return t({
        ...r,
        request,
      });
    };
  }
  var tn = {
    step: "build",
    tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
    name: "contentLengthMiddleware",
    override: true,
  };
  var getContentLengthPlugin = (options) => ({
    applyToStack: (clientStack) => {
      clientStack.add(en(options.bodyLengthChecker), tn);
    },
  });
  cjsExports.contentLengthMiddleware = en;
  cjsExports.contentLengthMiddlewareOptions = tn;
  cjsExports.getContentLengthPlugin = getContentLengthPlugin;
});
export { require_middleware_host_header, require_middleware_host_header_2 };
