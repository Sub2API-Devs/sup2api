/**
 * @azure/core-rest-pipeline/dist/esm/util/userAgent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Kl, setPlatformSpecificData } from "./userAgentPlatform.js";
import { SDK_VERSION_2 } from "../constants.js";

//@ chunk-mrx6y2r5.js:55486-55579 esm-layout
function getUserAgentString(telemetryInfo) {
  let parts = [];
  for (let [key, value] of telemetryInfo) {
    let token = value ? `${key}/${value}` : key;
    parts.push(token);
  }
  return parts.join(" ");
}
//@ chunk-mrx6y2r5.js:55579-55605 esm-layout
function Yl() {
  return Kl();
}
//@ chunk-mrx6y2r5.js:55605-55718 esm-fingerprint
async function getUserAgentValue(prefix) {
  let runtimeInfo = new Map();
  runtimeInfo.set("core-rest-pipeline", SDK_VERSION_2);
  await setPlatformSpecificData(runtimeInfo);
  let defaultAgent = getUserAgentString(runtimeInfo);
  return prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
}
export { Yl, getUserAgentValue };
