/**
 * @aws-sdk/middleware-logger/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-logger@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-edce4vxq.js:1420-2273 cjs-fingerprint
var require_middleware_logger = __commonJS(function (cjsExports) {
  var loggerMiddleware = () => (next, context) => async (args) => {
    try {
      let response = await next(args);
      let { clientName, commandName, logger, dynamoDbDocumentClientOptions = {} } = context;
      let { overrideInputFilterSensitiveLog, overrideOutputFilterSensitiveLog } =
        dynamoDbDocumentClientOptions;
      let inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
      let outputFilterSensitiveLog = overrideOutputFilterSensitiveLog ?? context.outputFilterSensitiveLog;
      let { $metadata, ...outputWithoutMetadata } = response.output;
      logger?.info?.({
        clientName,
        commandName,
        input: inputFilterSensitiveLog(args.input),
        output: outputFilterSensitiveLog(outputWithoutMetadata),
        metadata: $metadata,
      });
      return response;
    } catch (error) {
      let { clientName, commandName, logger, dynamoDbDocumentClientOptions = {} } = context;
      let { overrideInputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
      let inputFilterSensitiveLog = overrideInputFilterSensitiveLog ?? context.inputFilterSensitiveLog;
      logger?.error?.({
        clientName,
        commandName,
        input: inputFilterSensitiveLog(args.input),
        error,
        metadata: error.$metadata,
      });
      throw error;
    }
  };
  var loggerMiddlewareOptions = {
    name: "loggerMiddleware",
    tags: ["LOGGER"],
    step: "initialize",
    override: true,
  };
  var getLoggerPlugin = (options) => ({
    applyToStack: (clientStack) => {
      clientStack.add(loggerMiddleware(), loggerMiddlewareOptions);
    },
  });
  cjsExports.getLoggerPlugin = getLoggerPlugin;
  cjsExports.loggerMiddleware = loggerMiddleware;
  cjsExports.loggerMiddlewareOptions = loggerMiddlewareOptions;
});
export { require_middleware_logger };
