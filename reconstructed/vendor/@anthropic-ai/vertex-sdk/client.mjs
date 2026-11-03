/**
 * @anthropic-ai/vertex-sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-xa96axyz.js (3)
 * attribution: esm-fingerprint 3
 */
import { h, x, VERTEX_2023_10_16, T } from "./client.js";
import { ef } from "../sdk/core/error.mjs";
import { g_xa96 } from "../bedrock-sdk/internal/errors.mjs";
import { w, b } from "./internal/utils/values.mjs";
import { E } from "./internal/headers.mjs";
import { $ie } from "../sdk/resources/messages/messages.mjs";
import { Nie } from "../sdk/resources/beta/beta.mjs";

//@ chunk-xa96axyz.js:3944-5755 esm-fingerprint
((h = new WeakSet()),
  (x = async function (t, r) {
    let o, a;
    try {
      ((o = await this._authClientPromise), (a = await o.getRequestHeaders()));
    } catch (error) {
      throw new ef({ message: "Failed to acquire Google OAuth credentials.", cause: g_xa96(error) });
    }
    let i = o.projectId ?? a.get("x-goog-user-project");
    if (!this.projectId && i) this.projectId = i;
    let n = new URL(t.url),
      s;
    if (typeof t.body === "string") {
      let c = w(t.body);
      if (b(c)) s = c;
    }
    if (s && !s.anthropic_version) s.anthropic_version = VERTEX_2023_10_16;
    if (r && T.has(r.path) && r.method === "post") {
      let c = r.path.split("?")[0];
      if (n.pathname.endsWith(c)) {
        if (!this.projectId)
          throw Error(
            "No projectId was given and it could not be resolved from credentials. The client should be instantiated with the `projectId` option or the `ANTHROPIC_VERTEX_PROJECT_ID` environment variable should be set.",
          );
        if (!s) throw Error("Expected request body to be an object for post /v1/messages");
        let model = s.model;
        delete s.model;
        let v = (s.stream ?? !1) ? "streamRawPredict" : "rawPredict",
          sliced = n.pathname.slice(0, n.pathname.length - c.length);
        ((n.pathname = `${sliced}/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/${model}:${v}`),
          n.searchParams.delete("beta"));
      }
    }
    if (
      r &&
      (r.path === "/v1/messages/count_tokens" ||
        (r.path == "/v1/messages/count_tokens?beta=true" && r.method === "post"))
    ) {
      let c = r.path.split("?")[0];
      if (n.pathname.endsWith(c)) {
        if (!this.projectId)
          throw Error(
            "No projectId was given and it could not be resolved from credentials. The client should be instantiated with the `projectId` option or the `ANTHROPIC_VERTEX_PROJECT_ID` environment variable should be set.",
          );
        let sliced = n.pathname.slice(0, n.pathname.length - c.length);
        ((n.pathname = `${sliced}/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/count-tokens:rawPredict`),
          n.searchParams.delete("beta"));
      }
    }
    let m = { ...t, url: n.toString(), headers: E([a, t.headers]).values };
    if (s) m.body = JSON.stringify(s);
    return m;
  }));
//@ chunk-xa96axyz.js:5755-5812 esm-fingerprint
function N(e) {
  let t = new $ie(e);
  return (delete t.batches, t);
}
//@ chunk-xa96axyz.js:5812-5878 esm-fingerprint
function S(e) {
  let t = new Nie(e);
  return (delete t.messages.batches, t);
}

export { N, S };
