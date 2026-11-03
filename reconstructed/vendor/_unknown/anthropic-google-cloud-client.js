/**
 * _unknown/anthropic-google-cloud-client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: _unknown/anthropic-google-cloud-client.js
 * pieces: chunk-e7naa6k8.js (2)
 * attribution: placement 2
 */
import { uPe } from "../@anthropic-ai/sdk/client.mjs";
import { I } from "../@anthropic-ai/bedrock-sdk/version.mjs";
import { pr } from "../@anthropic-ai/sdk/core/error.mjs";
import { u } from "../@anthropic-ai/bedrock-sdk/internal/utils/env.mjs";
import {
  Y,
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
  L,
  P,
  f,
  g,
  Z,
  T,
  B,
} from "../@anthropic-ai/bedrock-sdk/internal/decoders/line.mjs";
import { D } from "../@anthropic-ai/bedrock-sdk/internal/utils/values.mjs";
import { R } from "../@anthropic-ai/bedrock-sdk/internal/headers.mjs";
import { Cx } from "../@anthropic-ai/sdk/version.mjs";

//@ chunk-e7naa6k8.js:2859-6243 placement
class AnthropicGoogleCloud extends uPe {
  _instrumentationScope() {
    return { platform: "google-cloud", version: I };
  }
  get completions() {
    throw new pr("The deprecated text Completions API is not available on Claude Platform on Google Cloud");
  }
  set completions(e) {}
  constructor({
    baseURL: e = u("ANTHROPIC_GOOGLE_CLOUD_BASE_URL"),
    project: t = u("ANTHROPIC_GOOGLE_CLOUD_PROJECT") ?? u("GOOGLE_CLOUD_PROJECT"),
    location: o = u("ANTHROPIC_GOOGLE_CLOUD_LOCATION"),
    workspaceId: r = u("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID"),
    bearerTokenProvider: n,
    googleAuth: s,
    authClient: i,
    skipAuth: l = !1,
    ...k
  } = {}) {
    if (i && s)
      throw new pr(
        "The `authClient` and `googleAuth` arguments are mutually exclusive; only one can be passed at a time.",
      );
    if (l && (n || s || i))
      throw new pr(
        "The `skipAuth` option is mutually exclusive with `bearerTokenProvider`, `googleAuth`, and `authClient`; `skipAuth` disables authentication entirely.",
      );
    for (let x of Y)
      if (k[x] != null)
        throw new pr(
          `The \`${x}\` option is not supported by AnthropicGoogleCloud; authentication uses a Google bearer token (\`bearerTokenProvider\`, \`googleAuth\`/\`authClient\`, or Application Default Credentials).`,
        );
    o = o || GLOBAL;
    let w = e,
      S = !1;
    if (!w)
      if (t) {
        if (r) w = N(t, o, r);
      } else if (l) throw new pr(`No project was given. ${H}`);
      else S = !0;
    super({
      baseURL: w ?? null,
      ...k,
      apiKey: null,
      authToken: null,
      ...{ __auth: { provider: null, tokenCache: null, resolution: null, error: null, extraHeaders: {} } },
    });
    if (
      (c.add(this),
      p.set(this, void 0),
      O.set(this, void 0),
      E.set(this, void 0),
      d.set(this, void 0),
      b.set(this, void 0),
      m.set(this, HTTPS_UNRESOLVED_INVALID),
      (this.project = t ?? null),
      (this.location = o ?? null),
      (this.workspaceId = r),
      (this.skipAuth = l),
      a(this, p, n, "f"),
      a(this, O, s ?? null, "f"),
      a(this, E, i ?? null, "f"),
      !e)
    ) {
      if ((a(this, b, (this.baseURL = w ?? HTTPS_UNRESOLVED_INVALID), "f"), t)) a(this, m, G(t, o), "f");
    }
    let A;
    if (!l && !n)
      if (i) a(this, d, Promise.resolve(i), "f");
      else
        ((A = s ?? new L.GoogleAuth({ scopes: P })),
          a(this, d, A.getClient(), "f"),
          f(this, d, "f").catch(() => {}));
    if (!S) this.ready = Promise.resolve();
    else {
      let x = A ?? s ?? new L.GoogleAuth({ scopes: P, ...(i ? { authClient: i } : {}) }),
        v = o;
      ((this.ready = x.getProjectId().then(
        (h) => {
          if (((this.project = h), f(this, c, "m", g).call(this))) return;
          if ((a(this, m, G(h, v), "f"), r)) a(this, b, (this.baseURL = N(h, v, r)), "f");
        },
        (h) => {
          let j = new pr(`No project was given and it could not be resolved from Google credentials. ${H}`);
          throw ((j.cause = h), j);
        },
      )),
        this.ready.catch(() => {}));
    }
  }
  withOptions(e) {
    return super.withOptions({
      project: this.project ?? void 0,
      location: this.location ?? void 0,
      workspaceId: this.workspaceId,
      bearerTokenProvider: f(this, p, "f"),
      googleAuth: f(this, O, "f") ?? void 0,
      authClient: f(this, E, "f") ?? void 0,
      skipAuth: this.skipAuth,
      baseURL: f(this, c, "m", g).call(this) ? this.baseURL : void 0,
      ...e,
    });
  }
  buildURL(e, t, o) {
    if (f(this, c, "m", g).call(this) || D(e)) return super.buildURL(e, t, o);
    if (e.startsWith(Z)) return super.buildURL(f(this, m, "f") + e, t, o);
    if (!this.workspaceId)
      throw new pr(
        "No workspace ID found. Set `workspaceId` in the constructor or the `ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID` environment variable.",
      );
    return super.buildURL(e, t, o);
  }
  async prepareOptions(e) {
    (await super.prepareOptions(e), await f(this, c, "m", T).call(this));
  }
  async buildRequest(e, t = {}) {
    return (await f(this, c, "m", T).call(this), await super.buildRequest(e, t));
  }
  async authHeaders(e) {
    if (this.skipAuth) return;
    let t = R([this._options.defaultHeaders, e.headers]);
    if (t.values.get("authorization") || t.nulls.has("authorization")) return;
    let o = await f(this, c, "m", B).call(this);
    return R([{ Authorization: `Bearer ${o}` }]);
  }
  validateHeaders() {
    return;
  }
  getUserAgent() {
    return `AnthropicGoogleCloud/JS ${Cx}`;
  }
}
//@ chunk-e7naa6k8.js:6243-6703 placement
((p = new WeakMap()),
  (O = new WeakMap()),
  (E = new WeakMap()),
  (d = new WeakMap()),
  (b = new WeakMap()),
  (m = new WeakMap()),
  (c = new WeakSet()),
  (g = function () {
    return this.baseURL !== f(this, b, "f");
  }),
  (T = async function () {
    if (!f(this, c, "m", g).call(this)) await this.ready;
  }),
  (B = async function () {
    if (f(this, p, "f")) return await f(this, p, "f").call(this);
    let t = await f(this, d, "f"),
      { token: token } = await t.getAccessToken();
    if (!token) throw new pr("Failed to obtain a Google access token from Application Default Credentials.");
    return token;
  }));
