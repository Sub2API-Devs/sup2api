/**
 * @anthropic-ai/bedrock-sdk/internal/decoders/line.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-e7naa6k8.js (1)
 * attribution: esm-layout 1
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { require_google_auth_library } from "../../../../google-auth-library/build/src/index.js";

//@ chunk-e7naa6k8.js:1734-2859 esm-layout
var import_google_auth_library = Re(require_google_auth_library(), 1);
var a = function (e, state, value, kind, f) {
  if (kind === "m") throw TypeError("Private method is not writable");
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? e !== state || !f : !state.has(e))
    throw TypeError("Cannot write private member to an object whose class did not declare it");
  if (kind === "a") f.call(e, value);
  else if (f) f.value = value;
  else state.set(e, value);
  return value;
};
var f = function (receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var c;
var p;
var O;
var E;
var d;
var b;
var m;
var g;
var T;
var B;
var P = "https://www.googleapis.com/auth/cloud-platform";
var GLOBAL = "global";
var z = (e, t) => `https://claude.googleapis.com/v1/projects/${e}/locations/${t}`;
var N = (e, t, o) => `${z(e, t)}/workspaces/${o}/invoke`;
var G = (e, t) => `${z(e, t)}/claudeOrganization/invoke`;
var Z = "/v1/organizations/";
var HTTPS_UNRESOLVED_INVALID = "https://unresolved.invalid";
var H = "Set `project` or the `ANTHROPIC_GOOGLE_CLOUD_PROJECT` environment variable (or provide `baseURL`).";
var CREDENTIAL_OPTIONS = ["apiKey", "authToken", "credentials", "config", "profile"];
export {
  CREDENTIAL_OPTIONS,
  GLOBAL,
  N,
  H,
  c,
  p,
  O,
  E,
  d,
  b,
  m,
  HTTPS_UNRESOLVED_INVALID,
  a,
  G,
  import_google_auth_library,
  P,
  f,
  g,
  Z,
  T,
  B,
};
