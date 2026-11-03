/**
 * @aws-sdk/middleware-logger/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/middleware-logger@3.936.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-edce4vxq.js:1420-2273 cjs-fingerprint
var Mme = x(function (fo) {
  var Br = () => (e, t) => async (r) => {
      try {
        let s = await e(r),
          {
            clientName: clientName,
            commandName: commandName,
            logger: logger,
            dynamoDbDocumentClientOptions: dynamoDbDocumentClientOptions = {},
          } = t,
          {
            overrideInputFilterSensitiveLog: overrideInputFilterSensitiveLog,
            overrideOutputFilterSensitiveLog: overrideOutputFilterSensitiveLog,
          } = dynamoDbDocumentClientOptions,
          y = overrideInputFilterSensitiveLog ?? t.inputFilterSensitiveLog,
          N = overrideOutputFilterSensitiveLog ?? t.outputFilterSensitiveLog,
          { $metadata: $metadata, ...T } = s.output;
        return (
          logger?.info?.({
            clientName: clientName,
            commandName: commandName,
            input: y(r.input),
            output: N(T),
            metadata: $metadata,
          }),
          s
        );
      } catch (error) {
        let {
            clientName: clientName,
            commandName: commandName,
            logger: logger,
            dynamoDbDocumentClientOptions: dynamoDbDocumentClientOptions = {},
          } = t,
          { overrideInputFilterSensitiveLog: overrideInputFilterSensitiveLog } =
            dynamoDbDocumentClientOptions,
          m = overrideInputFilterSensitiveLog ?? t.inputFilterSensitiveLog;
        throw (
          logger?.error?.({
            clientName: clientName,
            commandName: commandName,
            input: m(r.input),
            error: error,
            metadata: error.$metadata,
          }),
          error
        );
      }
    },
    Lr = { name: "loggerMiddleware", tags: ["LOGGER"], step: "initialize", override: !0 },
    ho = (e) => ({
      applyToStack: (t) => {
        t.add(Br(), Lr);
      },
    });
  fo.getLoggerPlugin = ho;
  fo.loggerMiddleware = Br;
  fo.loggerMiddlewareOptions = Lr;
});

export { Mme };
