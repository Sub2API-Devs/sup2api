/**
 * @azure/core-rest-pipeline/dist/esm/util/userAgentPlatform.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import "process";
import * as processModule_2 from "process";
import * as osModule from "os";
import { ha } from "../policies/redirectPolicy.js";

//@ chunk-mrx6y2r5.js:55135-55166 esm-layout
function ql(redirectOptions = {}) {
  return ha(redirectOptions);
}
//@ chunk-mrx6y2r5.js:55215-55248 esm-fingerprint
function Kl() {
  return "User-Agent";
}
//@ chunk-mrx6y2r5.js:55248-55465 esm-fingerprint
async function setPlatformSpecificData(map) {
  if (processModule_2 && processModule_2.versions) {
    let versions = processModule_2.versions;
    if (versions.bun) map.set("Bun", versions.bun);
    else if (versions.deno) map.set("Deno", versions.deno);
    else if (versions.node) map.set("Node", versions.node);
  }
  map.set("OS", `(${osModule.arch()}-${osModule.type()}-${osModule.release()})`);
}
export { Kl, setPlatformSpecificData, ql };
