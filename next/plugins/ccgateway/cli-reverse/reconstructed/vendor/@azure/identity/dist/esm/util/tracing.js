/**
 * @azure/identity/dist/esm/util/tracing.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-b5df2wx1.js (1)
 * attribution: esm-fingerprint 1
 */
import { createTracingClient } from "../../../../core-tracing/dist/esm/tracingClient.js";
import { SDK_VERSION } from "../constants.js";

//@ chunk-b5df2wx1.js:82287-82373 esm-fingerprint
var tracingClient = createTracingClient({
  namespace: "Microsoft.AAD",
  packageName: "@azure/identity",
  packageVersion: SDK_VERSION,
});
export { tracingClient };
