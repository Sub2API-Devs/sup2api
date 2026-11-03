/**
 * @anthropic-ai/bedrock-sdk/internal/decoders/line.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-e7naa6k8.js (1)
 * attribution: esm-layout 1
 */
import { Re } from "../../../../../runtime/bun-runtime.js";
import { Wur } from "../../../../google-auth-library/build/src/index.js";

//@ chunk-e7naa6k8.js:1734-2859 esm-layout
var L = Re(Wur(), 1),
  a = function (e, t, o, r, n) {
    if (r === "m") throw TypeError("Private method is not writable");
    if (r === "a" && !n) throw TypeError("Private accessor was defined without a setter");
    if (typeof t === "function" ? e !== t || !n : !t.has(e))
      throw TypeError("Cannot write private member to an object whose class did not declare it");
    return (r === "a" ? n.call(e, o) : n ? (n.value = o) : t.set(e, o), o);
  },
  f = function (e, t, o, r) {
    if (o === "a" && !r) throw TypeError("Private accessor was defined without a getter");
    if (typeof t === "function" ? e !== t || !r : !t.has(e))
      throw TypeError("Cannot read private member from an object whose class did not declare it");
    return o === "m" ? r : o === "a" ? r.call(e) : r ? r.value : t.get(e);
  },
  c,
  p,
  O,
  E,
  d,
  b,
  m,
  g,
  T,
  B,
  P = "https://www.googleapis.com/auth/cloud-platform",
  GLOBAL = "global",
  z = (e, t) => `https://claude.googleapis.com/v1/projects/${e}/locations/${t}`,
  N = (e, t, o) => `${z(e, t)}/workspaces/${o}/invoke`,
  G = (e, t) => `${z(e, t)}/claudeOrganization/invoke`,
  Z = "/v1/organizations/",
  HTTPS_UNRESOLVED_INVALID = "https://unresolved.invalid",
  H = "Set `project` or the `ANTHROPIC_GOOGLE_CLOUD_PROJECT` environment variable (or provide `baseURL`).",
  Y = ["apiKey", "authToken", "credentials", "config", "profile"];

export { Y, GLOBAL, N, H, c, p, O, E, d, b, m, HTTPS_UNRESOLVED_INVALID, a, G, L, P, f, g, Z, T, B };
