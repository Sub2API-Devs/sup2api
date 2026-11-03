/**
 * @anthropic-ai/bedrock-sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (5)
 * attribution: esm-fingerprint 5
 */
import { rAt } from "../sdk/client.mjs";
import { f } from "./internal/utils/env.mjs";
import { nAt } from "../sdk/resources/completions.mjs";
import { S_2 } from "./internal/utils/log.mjs";
import { Cx } from "../sdk/version.mjs";
import { R } from "./AWS_restJson1.mjs";
import { A } from "./internal/qs/utils.js";
import { L } from "./internal/utils/path.mjs";
import { U } from "./core/auth.js";
import { g } from "./internal/headers.mjs";
import { G } from "./core/streaming.mjs";
import { $ie } from "../sdk/resources/messages/messages.mjs";
import { Nie } from "../sdk/resources/beta/beta.mjs";

//@ chunk-h87x8cg3.js:10925-11322 esm-fingerprint
var X = function (e, t, r, n) {
    if (r === "a" && !n) throw TypeError("Private accessor was defined without a getter");
    if (typeof t === "function" ? e !== t || !n : !t.has(e))
      throw TypeError("Cannot read private member from an object whose class did not declare it");
    return r === "m" ? n : r === "a" ? n.call(e) : n ? n.value : t.get(e);
  },
  T,
  ee,
  te,
  BEDROCK_2023_05_31 = "bedrock-2023-05-31",
  De = new Set(["/v1/complete", "/v1/messages", "/v1/messages?beta=true"]);
//@ chunk-h87x8cg3.js:11322-12463 esm-fingerprint
class re extends rAt {
  constructor({
    awsRegion: e = f("AWS_REGION") ?? "us-east-1",
    baseURL: t = f("ANTHROPIC_BEDROCK_BASE_URL") ?? `https://bedrock-runtime.${e}.amazonaws.com`,
    apiKey: r = f("AWS_BEARER_TOKEN_BEDROCK"),
    awsSecretKey: n = null,
    awsAccessKey: s = null,
    awsSessionToken: o = null,
    providerChainResolver: i = null,
    ...a
  } = {}) {
    super({ baseURL: t, authToken: r ?? null, apiKey: null, ...a });
    (T.add(this),
      (this.skipAuth = !1),
      (this.messages = Ke(this)),
      (this.completions = new nAt(this)),
      (this.beta = Me(this)));
    let d = s != null,
      l = n != null;
    if (d !== l)
      S_2(this).warn(
        "Warning: Passing only one of `awsAccessKey` or `awsSecretKey` is deprecated. Please provide both keys, or provide neither and rely on the AWS credential provider chain.",
      );
    ((this.awsSecretKey = n),
      (this.awsAccessKey = s),
      (this.awsRegion = e),
      (this.awsSessionToken = o),
      (this.skipAuth = a.skipAuth ?? !1),
      (this.providerChainResolver = i));
  }
  validateHeaders() {}
  _shouldResolveDefaultCredentials() {
    return !1;
  }
  getUserAgent() {
    return `AnthropicBedrock/JS ${Cx}`;
  }
  async authHeaders(e) {
    return this.skipAuth ? void 0 : super.authHeaders(e);
  }
  backendMiddleware() {
    return [
      async (e, t, r) => {
        let n = await t(await X(this, T, "m", ee).call(this, e, r.options));
        return X(this, T, "m", te).call(this, n);
      },
    ];
  }
}
//@ chunk-h87x8cg3.js:12463-13829 esm-fingerprint
((T = new WeakSet()),
  (ee = async function (t, r) {
    let n = new URL(t.url),
      headers = new Headers(t.headers),
      o;
    if (typeof t.body === "string") {
      let a = R(t.body);
      if (A(a)) o = a;
    }
    if (o) {
      if (!o.anthropic_version) o.anthropic_version = BEDROCK_2023_05_31;
      let a = headers.get("anthropic-beta");
      if (a != null && !o.anthropic_beta) o.anthropic_beta = a.split(",").map((d) => d.trim());
    }
    if (r && De.has(r.path) && r.method === "post") {
      let a = r.path.split("?")[0];
      if (n.pathname.endsWith(a)) {
        if (!o) throw Error(`Expected request body to be a JSON object for post ${a}`);
        let model = o.model;
        delete o.model;
        let stream = o.stream;
        delete o.stream;
        let sliced = n.pathname.slice(0, n.pathname.length - a.length);
        ((n.pathname =
          sliced + (stream ? L`/model/${model}/invoke-with-response-stream` : L`/model/${model}/invoke`)),
          n.searchParams.delete("beta"));
      }
    }
    let i = { ...t, url: n.toString(), headers: headers };
    if (o) i.body = JSON.stringify(o);
    if (!this.skipAuth && !this.authToken) {
      let awsRegion = this.awsRegion;
      if (!awsRegion)
        throw Error(
          "Expected `awsRegion` option to be passed to the client or the `AWS_REGION` environment variable to be present",
        );
      let d = await U(i, {
        url: i.url,
        regionName: awsRegion,
        awsAccessKey: this.awsAccessKey,
        awsSecretKey: this.awsSecretKey,
        awsSessionToken: this.awsSessionToken,
        fetchOptions: this.fetchOptions,
        providerChainResolver: this.providerChainResolver,
        logger: S_2(this),
      });
      i.headers = g([i.headers, d]).values;
    }
    return i;
  }),
  (te = function (t) {
    if (t.body && t.headers.get("content-type")?.includes("application/vnd.amazon.eventstream")) return G(t);
    return t;
  }));
//@ chunk-h87x8cg3.js:13829-13908 esm-fingerprint
function Ke(e) {
  let t = new $ie(e);
  return (delete t.batches, delete t.countTokens, t);
}
//@ chunk-h87x8cg3.js:13908-14028 esm-fingerprint
function Me(e) {
  let t = new Nie(e);
  return (delete t.promptCaching, delete t.messages.batches, delete t.messages.countTokens, t);
}
