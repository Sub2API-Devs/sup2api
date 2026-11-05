/**
 * @smithy/middleware-serde/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/middleware-serde@4.2.6..4.2.12
 * pieces: chunk-vhcq2g1g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_protocol_http } from "../../protocol-http/dist-cjs/index.js";

//@ chunk-vhcq2g1g.js:339-2070 cjs-fingerprint
var require_middleware_serde = __commonJS(function (cjsExports) {
  var protocolHttp = require_protocol_http();
  var deserializerMiddleware = (options, deserializer) => (next, context) => async (args) => {
    let { response } = await next(args);
    try {
      let parsed = await deserializer(response, options);
      return {
        response,
        output: parsed,
      };
    } catch (error) {
      Object.defineProperty(error, "$response", {
        value: response,
        enumerable: false,
        writable: false,
        configurable: false,
      });
      if (!("$metadata" in error)) {
        try {
          error.message += `
  Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.`;
        } catch (e) {
          if (!context.logger || context.logger?.constructor?.name === "NoOpLogger")
            console.warn(
              "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
            );
          else
            context.logger?.warn?.(
              "Deserialization error: to see the raw response, inspect the hidden field {error}.$response on this object.",
            );
        }
        if (typeof error.$responseBodyText !== "undefined") {
          if (error.$response) error.$response.body = error.$responseBodyText;
        }
        try {
          if (protocolHttp.HttpResponse.isInstance(response)) {
            let { headers = {} } = response;
            let headerEntries = Object.entries(headers);
            error.$metadata = {
              httpStatusCode: response.statusCode,
              requestId: findHeader(/^x-[\w-]+-request-?id$/, headerEntries),
              extendedRequestId: findHeader(/^x-[\w-]+-id-2$/, headerEntries),
              cfId: findHeader(/^x-[\w-]+-cf-id$/, headerEntries),
            };
          }
        } catch (e) {}
      }
      throw error;
    }
  };
  var findHeader = (pattern, headers) =>
    (headers.find(([k]) => k.match(pattern)) || [undefined, undefined])[1];
  var serializerMiddleware = (options, serializer) => (next, context) => async (args) => {
    let endpointConfig = options;
    let endpoint =
      context.endpointV2?.url && endpointConfig.urlParser
        ? async () => endpointConfig.urlParser(context.endpointV2.url)
        : endpointConfig.endpoint;
    if (!endpoint) throw Error("No valid endpoint provider available.");
    let request = await serializer(args.input, {
      ...options,
      endpoint,
    });
    return next({
      ...args,
      request,
    });
  };
  var deserializerMiddlewareOption = {
    name: "deserializerMiddleware",
    step: "deserialize",
    tags: ["DESERIALIZER"],
    override: true,
  };
  var serializerMiddlewareOption = {
    name: "serializerMiddleware",
    step: "serialize",
    tags: ["SERIALIZER"],
    override: true,
  };
  function getSerdePlugin(config, serializer, deserializer) {
    return {
      applyToStack: (commandStack) => {
        commandStack.add(deserializerMiddleware(config, deserializer), deserializerMiddlewareOption);
        commandStack.add(serializerMiddleware(config, serializer), serializerMiddlewareOption);
      },
    };
  }
  cjsExports.deserializerMiddleware = deserializerMiddleware;
  cjsExports.deserializerMiddlewareOption = deserializerMiddlewareOption;
  cjsExports.getSerdePlugin = getSerdePlugin;
  cjsExports.serializerMiddleware = serializerMiddleware;
  cjsExports.serializerMiddlewareOption = serializerMiddlewareOption;
});
export { require_middleware_serde };
