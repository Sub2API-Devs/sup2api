/**
 * @aws-sdk/middleware-host-header/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/middleware-host-header@3.936.0
 * pieces: chunk-3p78mpxm.js (2)
 * attribution: cjs-fingerprint 1, cjs-require-graph 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_protocol_http as require_protocol_http_3 } from "../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-3p78mpxm.js:724-1420 cjs-fingerprint
var require_middleware_host_header = __commonJS(function (cjsExports) {
  var protocolHttp = require_protocol_http_3();
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
//@ chunk-3p78mpxm.js:115054-115651 cjs-require-graph
var require_middleware_host_header_2 = __commonJS(function (cjsExports) {
  var protocolHttp = require_protocol_http_3();
  var CONTENT_LENGTH_HEADER = "content-length";
  function contentLengthMiddleware(bodyLengthChecker) {
    return (next) => async (args) => {
      let request = args.request;
      if (protocolHttp.HttpRequest.isInstance(request)) {
        let { body, headers } = request;
        if (
          body &&
          Object.keys(headers)
            .map((key) => key.toLowerCase())
            .indexOf(CONTENT_LENGTH_HEADER) === -1
        )
          try {
            let existingKey = bodyLengthChecker(body);
            request.headers = {
              ...request.headers,
              [CONTENT_LENGTH_HEADER]: String(existingKey),
            };
          } catch (error) {}
      }
      return next({
        ...args,
        request,
      });
    };
  }
  var contentLengthMiddlewareOptions = {
    step: "build",
    tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
    name: "contentLengthMiddleware",
    override: true,
  };
  var getContentLengthPlugin = (options) => ({
    applyToStack: (clientStack) => {
      clientStack.add(contentLengthMiddleware(options.bodyLengthChecker), contentLengthMiddlewareOptions);
    },
  });
  cjsExports.contentLengthMiddleware = contentLengthMiddleware;
  cjsExports.contentLengthMiddlewareOptions = contentLengthMiddlewareOptions;
  cjsExports.getContentLengthPlugin = getContentLengthPlugin;
});
export { require_middleware_host_header, require_middleware_host_header_2 };
