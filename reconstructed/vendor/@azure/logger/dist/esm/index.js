/**
 * @azure/logger/dist/esm/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/logger@1.4.0
 * pieces: chunk-mrx6y2r5.js (4)
 * attribution: esm-fingerprint 4
 */
import { il, Do } from "../../../../@typespec/ts-http-runtime/dist/esm/logger/logger.js";

//@ chunk-mrx6y2r5.js:26638-26685 esm-fingerprint
function Uo(e) {
  return il.createClientLogger(e);
}
//@ chunk-mrx6y2r5.js:26685-26766 esm-fingerprint
var Ls = Do({ logLevelEnvVarName: "AZURE_LOG_LEVEL", namespace: "azure" }),
  logger_2 = Ls.logger;
//@ chunk-mrx6y2r5.js:26766-26804 esm-fingerprint
function Lo() {
  return Ls.getLogLevel();
}
//@ chunk-mrx6y2r5.js:26804-26851 esm-fingerprint
function Pt(e) {
  return Ls.createClientLogger(e);
}

export { Pt, Uo, Lo };
