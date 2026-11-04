/**
 * @azure/logger/dist/esm/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/logger@1.4.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-fingerprint 4
 */
import {
  context,
  createLoggerContext,
} from "../../../../@typespec/ts-http-runtime/dist/esm/logger/logger.js";

//@ chunk-mrx6y2r5.js:26638-26685 esm-fingerprint
function createClientLogger(namespace) {
  return context.createClientLogger(namespace);
}
//@ chunk-mrx6y2r5.js:26685-26766 esm-fingerprint
var context_2 = createLoggerContext({
  logLevelEnvVarName: "AZURE_LOG_LEVEL",
  namespace: "azure",
});
var AzureLogger = context_2.logger;
//@ chunk-mrx6y2r5.js:26766-26804 esm-fingerprint
function getLogLevel() {
  return context_2.getLogLevel();
}
//@ chunk-mrx6y2r5.js:26804-26851 esm-fingerprint
function createClientLogger_2(namespace) {
  return context_2.createClientLogger(namespace);
}
export { createClientLogger_2, createClientLogger, getLogLevel };
