/**
 * @anthropic-ai/bedrock-sdk/mantle-client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (4), chunk-qhhcfyds.js (3)
 * attribution: esm-fingerprint 5, esm-layout 2
 */
import { rAt, uPe } from "../sdk/client.mjs";
import { f, f_qhhc } from "./internal/utils/env.mjs";
import { pr } from "../sdk/core/error.mjs";
import { $ie } from "../sdk/resources/messages/messages.mjs";
import { g, E } from "./internal/headers.mjs";
import { Cx } from "../sdk/version.mjs";
import { ae, F } from "./core/aws-auth.js";
import { S_2, _ } from "./internal/utils/log.mjs";
import { Nie } from "../sdk/resources/beta/beta.mjs";
import { H_2, g_2 } from "./internal/errors.mjs";

//@ chunk-h87x8cg3.js:15740-16062 esm-fingerprint
var We = function (e, t, r, n) {
    if (r === "a" && !n) throw TypeError("Private accessor was defined without a getter");
    if (typeof t === "function" ? e !== t || !n : !t.has(e))
      throw TypeError("Cannot read private member from an object whose class did not declare it");
    return r === "m" ? n : r === "a" ? n.call(e) : n ? n.value : t.get(e);
  },
  H,
  ie,
  BEDROCK_MANTLE = "bedrock-mantle";
//@ chunk-h87x8cg3.js:16062-17524 esm-fingerprint
class ce extends rAt {
  constructor({
    awsRegion: e,
    baseURL: t,
    apiKey: r,
    awsAccessKey: n = null,
    awsSecretAccessKey: s = null,
    awsSessionToken: o = null,
    awsProfile: i,
    providerChainResolver: a = null,
    skipAuth: d = !1,
    ...l
  } = {}) {
    let u = e ?? f("AWS_REGION") ?? f("AWS_DEFAULT_REGION"),
      p =
        t ??
        f("ANTHROPIC_BEDROCK_MANTLE_BASE_URL") ??
        (u ? `https://bedrock-mantle.${u}.api.aws/anthropic` : void 0);
    if (!p)
      throw new pr(
        "No AWS region or base URL found. Set `awsRegion` in the constructor, the `AWS_REGION` / `AWS_DEFAULT_REGION` environment variable, or provide a `baseURL` / `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` environment variable.",
      );
    let m = r != null;
    if ((n != null) !== (s != null))
      throw new pr(
        "`awsAccessKey` and `awsSecretAccessKey` must be provided together. You provided only one.",
      );
    let y = n != null && s != null,
      I = i != null,
      v;
    if (m) v = r;
    else if (!y && !I) v = f("AWS_BEARER_TOKEN_BEDROCK") ?? void 0;
    super({ apiKey: v ?? null, authToken: null, baseURL: p, ...l });
    (H.add(this),
      (this.messages = new $ie(this)),
      (this.beta = Je(this)),
      (this.skipAuth = !1),
      (this.awsRegion = u),
      (this.awsAccessKey = n),
      (this.awsSecretAccessKey = s),
      (this.awsSessionToken = o),
      (this.awsProfile = i ?? null),
      (this.providerChainResolver = a),
      (this.skipAuth = d),
      (this._useSigV4 = v == null));
  }
  async authHeaders(e) {
    if (this.skipAuth) return;
    if (!this._useSigV4) return g([{ Authorization: `Bearer ${this.apiKey}` }]);
    return;
  }
  validateHeaders() {}
  _shouldResolveDefaultCredentials() {
    return !1;
  }
  getUserAgent() {
    return `AnthropicBedrockMantle/JS ${Cx}`;
  }
  backendMiddleware() {
    return [async (e, t) => t(await We(this, H, "m", ie).call(this, e))];
  }
}
//@ chunk-h87x8cg3.js:17524-18072 esm-fingerprint
((H = new WeakSet()),
  (ie = async function (t) {
    if (this.skipAuth || !this._useSigV4) return t;
    let awsRegion = this.awsRegion;
    if (!awsRegion)
      throw new pr(
        "No AWS region found. Set `awsRegion` in the constructor or the `AWS_REGION` / `AWS_DEFAULT_REGION` environment variable.",
      );
    let n = await ae(t, {
      url: t.url,
      regionName: awsRegion,
      serviceName: BEDROCK_MANTLE,
      awsAccessKey: this.awsAccessKey,
      awsSecretAccessKey: this.awsSecretAccessKey,
      awsSessionToken: this.awsSessionToken,
      awsProfile: this.awsProfile,
      providerChainResolver: this.providerChainResolver,
      logger: S_2(this),
    });
    return { ...t, headers: g([t.headers, n]).values };
  }));
//@ chunk-h87x8cg3.js:18072-18133 esm-layout
function Je(e) {
  let { messages: messages } = new Nie(e);
  return { messages: messages };
}
//@ chunk-qhhcfyds.js:4536-5142 esm-fingerprint
var re = function (e, t, r, n) {
    if (r === "a" && !n) throw TypeError("Private accessor was defined without a getter");
    if (typeof t === "function" ? e !== t || !n : !t.has(e))
      throw TypeError("Cannot read private member from an object whose class did not declare it");
    return r === "m" ? n : r === "a" ? n.call(e) : n ? n.value : t.get(e);
  },
  S,
  L,
  AWS_EXTERNAL_ANTHROPIC = "aws-external-anthropic",
  P = () =>
    new pr(
      "No AWS region or base URL found. Set `awsRegion` in the constructor, the `AWS_REGION` / `AWS_DEFAULT_REGION` environment variable, configure a `region` for your profile in `~/.aws/config`, or provide a `baseURL` / `ANTHROPIC_AWS_BASE_URL` environment variable.",
    );
//@ chunk-qhhcfyds.js:5142-7547 esm-layout
class U extends uPe {
  constructor({
    awsRegion: e,
    baseURL: t,
    apiKey: r,
    awsAccessKey: n = null,
    awsSecretAccessKey: o = null,
    awsSessionToken: i = null,
    awsProfile: s,
    providerChainResolver: a = null,
    workspaceId: R,
    skipAuth: c = !1,
    credentials: x,
    config: B,
    profile: K,
    ...O
  } = {}) {
    let h = e ?? f_qhhc("AWS_REGION") ?? f_qhhc("AWS_DEFAULT_REGION"),
      l = t ?? f_qhhc("ANTHROPIC_AWS_BASE_URL"),
      y;
    if (l) y = l;
    else if (h) y = `https://aws-external-anthropic.${h}.api.aws`;
    else y = void 0;
    let W = r != null;
    if ((n != null) !== (o != null))
      throw new pr(
        "`awsAccessKey` and `awsSecretAccessKey` must be provided together. You provided only one.",
      );
    let G = n != null && o != null,
      V = s != null,
      u;
    if (W) u = r;
    else if (!G && !V) u = f_qhhc("ANTHROPIC_AWS_API_KEY") ?? void 0;
    let m = R ?? f_qhhc("ANTHROPIC_AWS_WORKSPACE_ID");
    if (!m && !c)
      throw new pr(
        "No workspace ID found. Set `workspaceId` in the constructor or the `ANTHROPIC_AWS_WORKSPACE_ID` environment variable.",
      );
    super({
      apiKey: u ?? null,
      authToken: null,
      baseURL: y,
      ...O,
      defaultHeaders: E([O.defaultHeaders, { "anthropic-workspace-id": m }]),
    });
    if ((S.add(this), (this.skipAuth = !1), x != null || B != null || K != null))
      _(this).warn(
        "`credentials`, `config`, and `profile` are not supported by the AWS client and were ignored. Authenticate with `apiKey` or AWS credentials (SigV4) instead.",
      );
    ((this._baseURLIsExplicit = !!l),
      (this.awsRegion = h),
      (this.awsAccessKey = n),
      (this.awsSecretAccessKey = o),
      (this.awsSessionToken = i),
      (this.awsProfile = s ?? null),
      (this.providerChainResolver = a),
      (this.workspaceId = m),
      (this.skipAuth = c),
      (this._useSigV4 = u == null));
    let q = {
      ...this._options,
      apiKey: u ?? null,
      baseURL: l,
      awsRegion: e,
      awsAccessKey: n,
      awsSecretAccessKey: o,
      awsSessionToken: i,
      awsProfile: s,
      providerChainResolver: a,
      workspaceId: m,
      skipAuth: c,
    };
    if (((this._options = q), h || l || c)) this.ready = Promise.resolve();
    else
      ((this.ready = this._resolveRegionFromConfig(s).then((C) => {
        ((this.awsRegion = C), (this.baseURL = `https://aws-external-anthropic.${C}.api.aws`));
      })),
        this.ready.catch(() => {}));
  }
  _shouldResolveDefaultCredentials() {
    return !1;
  }
  withOptions(e) {
    return super.withOptions({ awsRegion: this.awsRegion, ...e });
  }
  _resolveRegionFromConfig(e) {
    return H_2.loadConfig(
      {
        ...g_2.NODE_REGION_CONFIG_OPTIONS,
        default: () => {
          throw P();
        },
      },
      { ...g_2.NODE_REGION_CONFIG_FILE_OPTIONS, ...(e && { profile: e }) },
    )();
  }
  async prepareOptions(e) {
    (await super.prepareOptions(e), await this.ready);
  }
  async authHeaders(e) {
    if (this.skipAuth) return;
    if (!this._useSigV4) return super.authHeaders(e);
    return;
  }
  validateHeaders() {}
  getUserAgent() {
    return `AnthropicAws/JS ${Cx}`;
  }
  backendMiddleware() {
    return [async (e, t) => t(await re(this, S, "m", L).call(this, e))];
  }
}
//@ chunk-qhhcfyds.js:7547-7971 esm-fingerprint
((S = new WeakSet()),
  (L = async function (t) {
    if (this.skipAuth || !this._useSigV4) return t;
    if (!this.awsRegion) throw P();
    let r = await F(t, {
      url: t.url,
      regionName: this.awsRegion,
      serviceName: AWS_EXTERNAL_ANTHROPIC,
      awsAccessKey: this.awsAccessKey,
      awsSecretAccessKey: this.awsSecretAccessKey,
      awsSessionToken: this.awsSessionToken,
      awsProfile: this.awsProfile,
      providerChainResolver: this.providerChainResolver,
      logger: _(this),
    });
    return { ...t, headers: E([t.headers, r]).values };
  }));
