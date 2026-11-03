/**
 * @anthropic-ai/vertex-sdk/client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-xa96axyz.js (2)
 * attribution: esm-fingerprint 2
 */
import { rAt } from "../sdk/client.mjs";
import { l } from "../bedrock-sdk/internal/utils/env.mjs";
import { N, S } from "./client.mjs";
import { _ } from "../bedrock-sdk/internal/errors.mjs";
import { Cx } from "../sdk/version.mjs";

//@ chunk-xa96axyz.js:2219-2594 esm-fingerprint
var j = function (e, t, r, o) {
    if (r === "a" && !o) throw TypeError("Private accessor was defined without a getter");
    if (typeof t === "function" ? e !== t || !o : !t.has(e))
      throw TypeError("Cannot read private member from an object whose class did not declare it");
    return r === "m" ? o : r === "a" ? o.call(e) : o ? o.value : t.get(e);
  },
  h,
  x,
  VERTEX_2023_10_16 = "vertex-2023-10-16",
  T = new Set(["/v1/messages", "/v1/messages?beta=true"]);
//@ chunk-xa96axyz.js:2594-3944 esm-fingerprint
class A extends rAt {
  constructor({
    baseURL: e = l("ANTHROPIC_VERTEX_BASE_URL"),
    region: t = l("CLOUD_ML_REGION") ?? null,
    projectId: r = l("ANTHROPIC_VERTEX_PROJECT_ID") ?? null,
    ...o
  } = {}) {
    if (!t)
      throw Error(
        "No region was given. The client should be instantiated with the `region` option or the `CLOUD_ML_REGION` environment variable should be set.",
      );
    if (!e)
      switch (t) {
        case "global":
          e = "https://aiplatform.googleapis.com/v1";
          break;
        case "us":
          e = "https://aiplatform.us.rep.googleapis.com/v1";
          break;
        case "eu":
          e = "https://aiplatform.eu.rep.googleapis.com/v1";
          break;
        default:
          e = `https://${t}-aiplatform.googleapis.com/v1`;
      }
    super({ baseURL: e, apiKey: null, authToken: null, ...o });
    if (
      (h.add(this),
      (this.messages = N(this)),
      (this.beta = S(this)),
      (this.region = t),
      (this.projectId = r),
      (this.accessToken = o.accessToken ?? null),
      o.authClient && o.googleAuth)
    )
      throw Error("You cannot provide both `authClient` and `googleAuth`. Please provide only one of them.");
    else if (o.authClient) this._authClientPromise = Promise.resolve(o.authClient);
    else
      ((this._auth =
        o.googleAuth ?? new _.GoogleAuth({ scopes: "https://www.googleapis.com/auth/cloud-platform" })),
        (this._authClientPromise = this._auth.getClient()));
  }
  validateHeaders() {}
  _shouldResolveDefaultCredentials() {
    return !1;
  }
  async authHeaders() {
    return;
  }
  getUserAgent() {
    return `AnthropicVertex/JS ${Cx}`;
  }
  backendMiddleware() {
    return [async (e, t, r) => t(await j(this, h, "m", x).call(this, e, r.options))];
  }
}

export { h, x, VERTEX_2023_10_16, T };
