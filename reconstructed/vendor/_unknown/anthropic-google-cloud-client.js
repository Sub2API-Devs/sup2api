/**
 * _unknown/anthropic-google-cloud-client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: _unknown/anthropic-google-cloud-client.js
 * pieces: chunk-e7naa6k8.js (2)
 * attribution: placement 2
 */
import { Anthropic } from "../@anthropic-ai/sdk/client.mjs";
import { VERSION } from "../@anthropic-ai/bedrock-sdk/version.mjs";
import { AnthropicError } from "../@anthropic-ai/sdk/core/error.mjs";
import { readEnv } from "../@anthropic-ai/bedrock-sdk/internal/utils/env.mjs";
import {
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
} from "../@anthropic-ai/bedrock-sdk/internal/decoders/line.mjs";
import { D } from "../@anthropic-ai/bedrock-sdk/internal/utils/values.mjs";
import { buildHeaders } from "../@anthropic-ai/bedrock-sdk/internal/headers.mjs";
import { VERSION as VERSION_2 } from "../@anthropic-ai/sdk/version.mjs";

//@ chunk-e7naa6k8.js:2859-6243 placement
class AnthropicGoogleCloud extends Anthropic {
  _instrumentationScope() {
    return {
      platform: "google-cloud",
      version: VERSION,
    };
  }
  get completions() {
    throw new AnthropicError(
      "The deprecated text Completions API is not available on Claude Platform on Google Cloud",
    );
  }
  set completions(e) {}
  constructor({
    baseURL: e = readEnv("ANTHROPIC_GOOGLE_CLOUD_BASE_URL"),
    project: t = readEnv("ANTHROPIC_GOOGLE_CLOUD_PROJECT") ?? readEnv("GOOGLE_CLOUD_PROJECT"),
    location: o = readEnv("ANTHROPIC_GOOGLE_CLOUD_LOCATION"),
    workspaceId: r = readEnv("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID"),
    bearerTokenProvider: n,
    googleAuth: s,
    authClient: i,
    skipAuth: l = false,
    ...k
  } = {}) {
    if (i && s)
      throw new AnthropicError(
        "The `authClient` and `googleAuth` arguments are mutually exclusive; only one can be passed at a time.",
      );
    if (l && (n || s || i))
      throw new AnthropicError(
        "The `skipAuth` option is mutually exclusive with `bearerTokenProvider`, `googleAuth`, and `authClient`; `skipAuth` disables authentication entirely.",
      );
    for (let x of CREDENTIAL_OPTIONS)
      if (k[x] != null)
        throw new AnthropicError(
          `The \`${x}\` option is not supported by AnthropicGoogleCloud; authentication uses a Google bearer token (\`bearerTokenProvider\`, \`googleAuth\`/\`authClient\`, or Application Default Credentials).`,
        );
    o = o || GLOBAL;
    let w = e;
    let S = false;
    if (!w)
      if (t) {
        if (r) w = N(t, o, r);
      } else if (l) throw new AnthropicError(`No project was given. ${H}`);
      else S = true;
    super({
      baseURL: w ?? null,
      ...k,
      apiKey: null,
      authToken: null,
      ...{
        __auth: {
          provider: null,
          tokenCache: null,
          resolution: null,
          error: null,
          extraHeaders: {},
        },
      },
    });
    c.add(this);
    p.set(this, undefined);
    O.set(this, undefined);
    E.set(this, undefined);
    d.set(this, undefined);
    b.set(this, undefined);
    m.set(this, HTTPS_UNRESOLVED_INVALID);
    this.project = t ?? null;
    this.location = o ?? null;
    this.workspaceId = r;
    this.skipAuth = l;
    a(this, p, n, "f");
    a(this, O, s ?? null, "f");
    a(this, E, i ?? null, "f");
    if (!e) {
      a(this, b, (this.baseURL = w ?? HTTPS_UNRESOLVED_INVALID), "f");
      if (t) a(this, m, G(t, o), "f");
    }
    let A;
    if (!l && !n)
      if (i) a(this, d, Promise.resolve(i), "f");
      else {
        A =
          s ??
          new import_google_auth_library.GoogleAuth({
            scopes: P,
          });
        a(this, d, A.getClient(), "f");
        f(this, d, "f").catch(() => {});
      }
    if (!S) this.ready = Promise.resolve();
    else {
      let x =
        A ??
        s ??
        new import_google_auth_library.GoogleAuth({
          scopes: P,
          ...(i
            ? {
                authClient: i,
              }
            : {}),
        });
      let v = o;
      this.ready = x.getProjectId().then(
        (h) => {
          this.project = h;
          if (f(this, c, "m", g).call(this)) return;
          a(this, m, G(h, v), "f");
          if (r) a(this, b, (this.baseURL = N(h, v, r)), "f");
        },
        (cause) => {
          let j = new AnthropicError(
            `No project was given and it could not be resolved from Google credentials. ${H}`,
          );
          j.cause = cause;
          throw j;
        },
      );
      this.ready.catch(() => {});
    }
  }
  withOptions(e) {
    return super.withOptions({
      project: this.project ?? undefined,
      location: this.location ?? undefined,
      workspaceId: this.workspaceId,
      bearerTokenProvider: f(this, p, "f"),
      googleAuth: f(this, O, "f") ?? undefined,
      authClient: f(this, E, "f") ?? undefined,
      skipAuth: this.skipAuth,
      baseURL: f(this, c, "m", g).call(this) ? this.baseURL : undefined,
      ...e,
    });
  }
  buildURL(url, t, o) {
    if (f(this, c, "m", g).call(this) || D(url)) return super.buildURL(url, t, o);
    if (url.startsWith(Z)) return super.buildURL(f(this, m, "f") + url, t, o);
    if (!this.workspaceId)
      throw new AnthropicError(
        "No workspace ID found. Set `workspaceId` in the constructor or the `ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID` environment variable.",
      );
    return super.buildURL(url, t, o);
  }
  async prepareOptions(e) {
    await super.prepareOptions(e);
    await f(this, c, "m", T).call(this);
  }
  async buildRequest(e, t = {}) {
    await f(this, c, "m", T).call(this);
    return await super.buildRequest(e, t);
  }
  async authHeaders(e) {
    if (this.skipAuth) return;
    let headers = buildHeaders([this._options.defaultHeaders, e.headers]);
    if (headers.values.get("authorization") || headers.nulls.has("authorization")) return;
    let o = await f(this, c, "m", B).call(this);
    return buildHeaders([
      {
        Authorization: `Bearer ${o}`,
      },
    ]);
  }
  validateHeaders() {
    return;
  }
  getUserAgent() {
    return `AnthropicGoogleCloud/JS ${VERSION_2}`;
  }
}
//@ chunk-e7naa6k8.js:6243-6703 placement
p = new WeakMap();
O = new WeakMap();
E = new WeakMap();
d = new WeakMap();
b = new WeakMap();
m = new WeakMap();
c = new WeakSet();
g = function () {
  return this.baseURL !== f(this, b, "f");
};
T = async function () {
  if (!f(this, c, "m", g).call(this)) await this.ready;
};
B = async function () {
  if (f(this, p, "f")) return await f(this, p, "f").call(this);
  let t = await f(this, d, "f");
  let { token } = await t.getAccessToken();
  if (!token)
    throw new AnthropicError("Failed to obtain a Google access token from Application Default Credentials.");
  return token;
};
