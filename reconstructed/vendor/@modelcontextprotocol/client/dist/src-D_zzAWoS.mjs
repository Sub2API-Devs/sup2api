/**
 * @modelcontextprotocol/client/dist/src-D_zzAWoS.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-r1g76qsy.js (156)
 * attribution: esm-fingerprint 114, esm-layout 36, layout 6
 */
import {
  aA,
  Ue,
  o,
  E,
  M,
  zg,
  pe,
  A,
  u,
  kt,
  T,
  U,
  Lve,
  Ka,
  La,
  oe,
  Ir,
  _Ii,
  A8e,
} from "../../../zod/v4/classic/schemas.js";
import { t0, t1i } from "../../../../src/services/mcp/schemaParse.js";
import {
  IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION,
  IO_MODELCONTEXTPROTOCOL_CLIENTINFO,
  IHe,
  IO_MODELCONTEXTPROTOCOL_LOGLEVEL,
  IO_MODELCONTEXTPROTOCOL_SERVERINFO,
  Je,
  xt,
  Fe,
  be,
  extend_17,
  Vr,
  extend_46,
  extend_47,
  extend_45,
  extend_75,
  merge_3,
  extend_2,
  extend_3,
  No,
  Ha,
  Fa,
  Ja,
  Io,
  or,
  extend_63,
  extend_64,
  extend_65,
  Ft,
  extend_53,
  extend_54,
  extend_55,
  extend_56,
  extend_69,
  zr,
  extend_9,
  extend_10,
  extend_57,
  Fdn,
  extend_59,
  extend_58,
  extend_62,
  extend_60,
  extend_61,
  ls,
  strict_5,
  js,
  extend_38,
  extend_39,
  extend_41,
  extend_72,
  loose,
  extend_71,
  merge_2,
  qo,
  rt,
  Vt,
  extend_4,
  extend_5,
  extend_6,
  extend_7,
  extend_8,
  Ta,
  de,
  strict_4,
  fZe,
  strict_2,
  strict,
  Ca,
  strict_3,
  et,
  Hr,
  Ur,
  extend_36,
  extend_37,
  extend_20,
  extend_21,
  extend_18,
  extend_19,
  extend_66,
  extend_67,
  extend_73,
  extend_74,
  extend_43,
  extend_44,
  Dr,
  extend_51,
  extend_52,
  ws,
  $s,
  Ms,
  Ee,
  $e,
  Kt,
  extend_13,
  extend_14,
  extend_15,
  extend_11,
  Gr,
  Lo,
  extend_12,
  Ao,
  Rr,
  ss,
  extend_42,
  ds,
  xs,
  Hdn,
  xo,
  extend_23,
  extend_24,
  Mdn,
  tt,
  wr,
  he,
  Nr,
  extend_40,
  extend_25,
  extend_22,
  CBt,
  Vs,
  Ddn,
  extend_34,
  extend_35,
  $r,
  vM,
  at,
  Js,
  extend_68,
  Ts,
  gt,
  Cs,
  ABt,
  Ba,
  Ga,
  Wa,
  Oo,
  extend_49,
  extend_50,
  Ns,
  Ht,
  Jo,
  extend_26,
  Ar,
  extend_30,
  extend_31,
  extend_28,
  extend_29,
  extend_32,
  extend_33,
  extend,
  qa,
  Po,
  nt,
  merge,
  extend_70,
  Ys,
  Dt,
  extend_16,
  Jr,
  Fr,
  ps,
  Es,
  fs,
  extend_48,
  Ps,
  RBt,
  cs,
  Bo,
  extend_27,
  Kr,
  xr,
  strip_2,
  merge_4,
  strip_4,
  strip_3,
  strip_5,
  OBt,
  M_t,
  Br,
  strip_6,
  strip,
  PBt,
  Zs,
  P_t,
} from "../../core/dist/auth-CUe6YdwF.mjs";
import { yl, IO_MODELCONTEXTPROTOCOL_TASKS } from "../../core/dist/schemas-DscsoNZN.mjs";
import { qn } from "../../core/(bundler runtime of a pre-bundled dist file).js";
import { slo } from "../../../zod/v4/locales/fr.js";
import { nut } from "../../../zod/v4/core/json-schema-processors.js";
import { Su } from "../../../content-type/index.js";

//@ chunk-r1g76qsy.js:17821-17862 esm-fingerprint
var rn = Symbol.for("mcp.sdk.errorBrands");
//@ chunk-r1g76qsy.js:17862-18143 esm-fingerprint
function bt(e, t) {
  let r = new Set(),
    s = t;
  while (typeof s === "function") {
    let mcpBrand = s.mcpBrand;
    if (Object.prototype.hasOwnProperty.call(s, "mcpBrand") && typeof mcpBrand === "string") r.add(mcpBrand);
    s = Object.getPrototypeOf(s);
  }
  if (r.size === 0) return;
  Object.defineProperty(e, rn, { value: r, enumerable: !1, configurable: !0 });
}
//@ chunk-r1g76qsy.js:18143-18460 esm-fingerprint
function Ie(e, t) {
  try {
    if (
      typeof t === "object" &&
      t !== null &&
      Object.prototype.hasOwnProperty.call(e, "mcpBrand") &&
      typeof e.mcpBrand === "string" &&
      Object.prototype.hasOwnProperty.call(t, rn)
    ) {
      let r = t[rn];
      if (r && typeof r.has === "function" && r.has(e.mcpBrand)) return !0;
    }
  } catch {}
  return Function.prototype[Symbol.hasInstance].call(e, t);
}
//@ chunk-r1g76qsy.js:18460-21533 esm-fingerprint
var Sue = (function (e) {
    return (
      (e.InvalidRequest = "invalid_request"),
      (e.InvalidClient = "invalid_client"),
      (e.InvalidGrant = "invalid_grant"),
      (e.UnauthorizedClient = "unauthorized_client"),
      (e.UnsupportedGrantType = "unsupported_grant_type"),
      (e.InvalidScope = "invalid_scope"),
      (e.AccessDenied = "access_denied"),
      (e.ServerError = "server_error"),
      (e.TemporarilyUnavailable = "temporarily_unavailable"),
      (e.UnsupportedResponseType = "unsupported_response_type"),
      (e.UnsupportedTokenType = "unsupported_token_type"),
      (e.InvalidToken = "invalid_token"),
      (e.MethodNotAllowed = "method_not_allowed"),
      (e.TooManyRequests = "too_many_requests"),
      (e.InvalidClientMetadata = "invalid_client_metadata"),
      (e.InvalidRedirectUri = "invalid_redirect_uri"),
      (e.InsufficientScope = "insufficient_scope"),
      (e.InvalidTarget = "invalid_target"),
      e
    );
  })({}),
  OAuthError = class e extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.OAuthError" });
    }
    static [Symbol.hasInstance](t) {
      return Ie(this, t);
    }
    static isInstance(t) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return Ie(this, t);
    }
    constructor(t, r, s) {
      super(r);
      ((this.code = t), (this.errorUri = s), (this.name = "OAuthError"), bt(this, new.target));
    }
    toResponseObject() {
      let t = { error: this.code, error_description: this.message };
      if (this.errorUri) t.error_uri = this.errorUri;
      return t;
    }
    static fromResponse(t) {
      return new e(t.error, t.error_description ?? t.error, t.error_uri);
    }
  },
  Ti = (function (e) {
    return (
      (e.NotConnected = "NOT_CONNECTED"),
      (e.AlreadyConnected = "ALREADY_CONNECTED"),
      (e.NotInitialized = "NOT_INITIALIZED"),
      (e.CapabilityNotSupported = "CAPABILITY_NOT_SUPPORTED"),
      (e.RequestTimeout = "REQUEST_TIMEOUT"),
      (e.ConnectionClosed = "CONNECTION_CLOSED"),
      (e.SendFailed = "SEND_FAILED"),
      (e.InvalidResult = "INVALID_RESULT"),
      (e.UnsupportedResultType = "UNSUPPORTED_RESULT_TYPE"),
      (e.InputRequiredRoundsExceeded = "INPUT_REQUIRED_ROUNDS_EXCEEDED"),
      (e.ListPaginationExceeded = "LIST_PAGINATION_EXCEEDED"),
      (e.MethodNotSupportedByProtocolVersion = "METHOD_NOT_SUPPORTED_BY_PROTOCOL_VERSION"),
      (e.EraNegotiationFailed = "ERA_NEGOTIATION_FAILED"),
      (e.ClientHttpNotImplemented = "CLIENT_HTTP_NOT_IMPLEMENTED"),
      (e.ClientHttpAuthentication = "CLIENT_HTTP_AUTHENTICATION"),
      (e.ClientHttpForbidden = "CLIENT_HTTP_FORBIDDEN"),
      (e.ClientHttpUnexpectedContent = "CLIENT_HTTP_UNEXPECTED_CONTENT"),
      (e.ClientHttpFailedToOpenStream = "CLIENT_HTTP_FAILED_TO_OPEN_STREAM"),
      (e.ClientHttpFailedToTerminateSession = "CLIENT_HTTP_FAILED_TO_TERMINATE_SESSION"),
      e
    );
  })({}),
  SdkError = class extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.SdkError" });
    }
    static [Symbol.hasInstance](e) {
      return Ie(this, e);
    }
    static isInstance(e) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return Ie(this, e);
    }
    constructor(e, t, r) {
      super(t);
      ((this.code = e), (this.data = r), (this.name = "SdkError"), bt(this, new.target));
    }
  },
  SdkHttpError = class extends SdkError {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.SdkHttpError" });
    }
    constructor(e, t, r) {
      super(e, t, r);
      this.name = "SdkHttpError";
    }
    get status() {
      return this.data.status;
    }
    get statusText() {
      return this.data.statusText;
    }
  };
//@ chunk-r1g76qsy.js:21533-21620 esm-fingerprint
function Yn(e) {
  let t = typeof e === "string" ? new URL(e) : new URL(e.href);
  return ((t.hash = ""), t);
}
//@ chunk-r1g76qsy.js:21620-21991 esm-fingerprint
function Xn({ requestedResource: requestedResource, configuredResource: configuredResource }) {
  let r =
      typeof requestedResource === "string" ? new URL(requestedResource) : new URL(requestedResource.href),
    s =
      typeof configuredResource === "string" ? new URL(configuredResource) : new URL(configuredResource.href);
  if (r.origin !== s.origin) return !1;
  if (r.pathname.length < s.pathname.length) return !1;
  let a = r.pathname.endsWith("/") ? r.pathname : r.pathname + "/",
    n = s.pathname.endsWith("/") ? s.pathname : s.pathname + "/";
  return a.startsWith(n);
}
//@ chunk-r1g76qsy.js:21991-22019 esm-fingerprint
var Zn = "2026-07-28",
  cn = [Zn];
//@ chunk-r1g76qsy.js:22019-22047 esm-layout
function Be(e) {
  return e >= Zn;
}
//@ chunk-r1g76qsy.js:22047-22091 esm-layout
function ln(e) {
  return e.filter((t) => !Be(t));
}
//@ chunk-r1g76qsy.js:22091-22134 esm-layout
function ro(e) {
  return e.filter((t) => Be(t));
}
//@ chunk-r1g76qsy.js:22134-22392 esm-fingerprint
function Qn(e) {
  let structuredContent = e.structuredContent;
  if (structuredContent === void 0) return e;
  if (!(
    typeof structuredContent !== "object" ||
    structuredContent === null ||
    Array.isArray(structuredContent)
  ))
    return e;
  if (e.content?.some((r) => r.type === "text") ?? !1) return e;
  return { ...e, content: [...(e.content ?? []), { type: "text", text: JSON.stringify(structuredContent) }] };
}
//@ chunk-r1g76qsy.js:22392-22439 esm-fingerprint
var ei = ["task", "inputRequests", "requestState"];
//@ chunk-r1g76qsy.js:22439-22582 esm-fingerprint
function Ac(e) {
  if (
    e === null ||
    typeof e !== "object" ||
    Array.isArray(e) ||
    e.content !== void 0 ||
    ei.some((t) => t in e)
  )
    return e;
  return { ...e, content: [] };
}
//@ chunk-r1g76qsy.js:22582-37310 esm-fingerprint
function Lc() {
  let e = aA(() => Ue([o(), E(), M(), zg(), pe(o(), e), A(e)])),
    t = pe(o(), e),
    r = Ue([o(), E().int()]),
    s = o(),
    a = u({ ttl: E().optional() }),
    n = u({ taskId: o() }),
    i = kt({ progressToken: r.optional(), "io.modelcontextprotocol/related-task": n.optional() }),
    l = u({ _meta: i.optional() }),
    extend = l.extend({ task: a.optional() }),
    d = u({ method: o(), params: l.loose().optional() }),
    m = u({ _meta: i.optional() }),
    _ = u({ method: o(), params: m.loose().optional() }),
    w = kt({ _meta: i.optional() }),
    P = Ue([o(), E().int()]),
    strict = w.strict(),
    extend_2 = m.extend({ requestId: P.optional(), reason: o().optional() }),
    extend_3 = _.extend({ method: T("notifications/cancelled"), params: extend_2 }),
    h = u({
      src: o(),
      mimeType: o().optional(),
      sizes: A(o()).optional(),
      theme: U(["light", "dark"]).optional(),
    }),
    S = u({ icons: A(h).optional() }),
    f = u({ name: o(), title: o().optional() }),
    extend_4 = f.extend({
      ...f.shape,
      ...S.shape,
      version: o(),
      websiteUrl: o().optional(),
      description: o().optional(),
    }),
    C = Lve(u({ applyDefaults: M().optional() }), t),
    b = Ka(
      (we) => {
        if (we && typeof we === "object" && !Array.isArray(we) && Object.keys(we).length === 0)
          return { form: {} };
        return we;
      },
      Lve(u({ form: C.optional(), url: t.optional() }), t.optional()),
    ),
    g = kt({
      list: t.optional(),
      cancel: t.optional(),
      requests: kt({
        sampling: kt({ createMessage: t.optional() }).optional(),
        elicitation: kt({ create: t.optional() }).optional(),
      }).optional(),
    }),
    k = kt({
      list: t.optional(),
      cancel: t.optional(),
      requests: kt({ tools: kt({ call: t.optional() }).optional() }).optional(),
    }),
    V = u({
      experimental: pe(o(), t).optional(),
      sampling: u({ context: t.optional(), tools: t.optional() }).optional(),
      elicitation: b.optional(),
      roots: u({ listChanged: M().optional() }).optional(),
      tasks: g.optional(),
      extensions: pe(o(), t).optional(),
    }),
    extend_5 = l.extend({ protocolVersion: o(), capabilities: V, clientInfo: extend_4 }),
    extend_6 = d.extend({ method: T("initialize"), params: extend_5 }),
    x = u({
      experimental: pe(o(), t).optional(),
      logging: t.optional(),
      completions: t.optional(),
      prompts: u({ listChanged: M().optional() }).optional(),
      resources: u({ subscribe: M().optional(), listChanged: M().optional() }).optional(),
      tools: u({ listChanged: M().optional() }).optional(),
      tasks: k.optional(),
      extensions: pe(o(), t).optional(),
    }),
    extend_7 = w.extend({
      protocolVersion: o(),
      capabilities: x,
      serverInfo: extend_4,
      instructions: o().optional(),
    }),
    extend_8 = _.extend({ method: T("notifications/initialized"), params: m.optional() }),
    extend_9 = d.extend({ method: T("ping"), params: l.optional() }),
    le = u({ progress: E(), total: La(E()), message: La(o()) }),
    ie = u({ ...m.shape, ...le.shape, progressToken: r }),
    extend_10 = _.extend({ method: T("notifications/progress"), params: ie }),
    extend_11 = l.extend({ cursor: s.optional() }),
    extend_12 = d.extend({ params: extend_11.optional() }),
    extend_13 = w.extend({ nextCursor: s.optional() }),
    K = u({ uri: o(), mimeType: La(o()), _meta: pe(o(), oe()).optional() }),
    extend_14 = K.extend({ text: o() }),
    refine = o().refine(
      (we) => {
        try {
          return (atob(we), !0);
        } catch {
          return !1;
        }
      },
      { message: "Invalid Base64 string" },
    ),
    extend_15 = K.extend({ blob: refine }),
    G = U(["user", "assistant"]),
    Y = u({
      audience: A(G).optional(),
      priority: E().min(0).max(1).optional(),
      lastModified: Ue([t0({ offset: !0 }), t0({ offset: !0, precision: -1 })]).optional(),
    }),
    re = u({
      ...f.shape,
      ...S.shape,
      uri: o(),
      description: La(o()),
      mimeType: La(o()),
      size: La(E()),
      annotations: Y.optional(),
      _meta: La(kt({})),
    }),
    Q = u({
      ...f.shape,
      ...S.shape,
      uriTemplate: o(),
      description: La(o()),
      mimeType: La(o()),
      annotations: Y.optional(),
      _meta: La(kt({})),
    }),
    extend_16 = extend_12.extend({ method: T("resources/list") }),
    extend_17 = extend_13.extend({ resources: A(re) }),
    extend_18 = extend_12.extend({ method: T("resources/templates/list") }),
    extend_19 = extend_13.extend({ resourceTemplates: A(Q) }),
    extend_20 = l.extend({ uri: o() }),
    X = extend_20,
    extend_21 = d.extend({ method: T("resources/read"), params: X }),
    extend_22 = w.extend({ contents: A(Ue([extend_14, extend_15])) }),
    extend_23 = _.extend({ method: T("notifications/resources/list_changed"), params: m.optional() }),
    _e = extend_20,
    extend_24 = d.extend({ method: T("resources/subscribe"), params: _e }),
    ge = extend_20,
    extend_25 = d.extend({ method: T("resources/unsubscribe"), params: ge }),
    extend_26 = m.extend({ uri: o() }),
    extend_27 = _.extend({ method: T("notifications/resources/updated"), params: extend_26 }),
    Ve = u({ name: o(), description: La(o()), required: La(M()) }),
    je = u({ ...f.shape, ...S.shape, description: La(o()), arguments: La(A(Ve)), _meta: La(kt({})) }),
    extend_28 = extend_12.extend({ method: T("prompts/list") }),
    extend_29 = extend_13.extend({ prompts: A(je) }),
    extend_30 = l.extend({ name: o(), arguments: pe(o(), o()).optional() }),
    extend_31 = d.extend({ method: T("prompts/get"), params: extend_30 }),
    ct = u({ type: T("text"), text: o(), annotations: Y.optional(), _meta: pe(o(), oe()).optional() }),
    lt = u({
      type: T("image"),
      data: refine,
      mimeType: o(),
      annotations: Y.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    ut = u({
      type: T("audio"),
      data: refine,
      mimeType: o(),
      annotations: Y.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    Bt = u({
      type: T("tool_use"),
      name: o(),
      id: o(),
      input: pe(o(), oe()),
      _meta: pe(o(), oe()).optional(),
    }),
    Xe = u({
      type: T("resource"),
      resource: Ue([extend_14, extend_15]),
      annotations: Y.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    extend_32 = re.extend({ type: T("resource_link") }),
    Ne = Ue([ct, lt, ut, extend_32, Xe]),
    zt = u({ role: G, content: Ne }),
    extend_33 = w.extend({ description: o().optional(), messages: A(zt) }),
    extend_34 = _.extend({ method: T("notifications/prompts/list_changed"), params: m.optional() }),
    Yt = u({
      title: o().optional(),
      readOnlyHint: M().optional(),
      destructiveHint: M().optional(),
      idempotentHint: M().optional(),
      openWorldHint: M().optional(),
    }),
    $t = u({ taskSupport: U(["required", "optional", "forbidden"]).optional() }),
    ht = u({
      ...f.shape,
      ...S.shape,
      description: o().optional(),
      inputSchema: u({
        type: T("object"),
        properties: pe(o(), e).optional(),
        required: A(o()).optional(),
      }).catchall(oe()),
      outputSchema: u({ type: T("object"), properties: pe(o(), e).optional(), required: A(o()).optional() })
        .catchall(oe())
        .optional(),
      annotations: Yt.optional(),
      execution: $t.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    extend_35 = extend_12.extend({ method: T("tools/list") }),
    extend_36 = extend_13.extend({ tools: A(ht) }),
    extend_37 = w.extend({
      content: A(Ne),
      structuredContent: pe(o(), oe()).optional(),
      isError: M().optional(),
    }),
    extend_38 = extend.extend({ name: o(), arguments: pe(o(), oe()).optional() }),
    extend_39 = d.extend({ method: T("tools/call"), params: extend_38 }),
    extend_40 = _.extend({ method: T("notifications/tools/list_changed"), params: m.optional() }),
    Ct = U(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]),
    extend_41 = l.extend({ level: Ct }),
    extend_42 = d.extend({ method: T("logging/setLevel"), params: extend_41 }),
    extend_43 = m.extend({ level: Ct, logger: o().optional(), data: oe() }),
    extend_44 = _.extend({ method: T("notifications/message"), params: extend_43 }),
    rr = u({ name: o().optional() }),
    or = u({
      hints: A(rr).optional(),
      costPriority: E().min(0).max(1).optional(),
      speedPriority: E().min(0).max(1).optional(),
      intelligencePriority: E().min(0).max(1).optional(),
    }),
    sr = u({ mode: U(["auto", "required", "none"]).optional() }),
    co = u({
      type: T("tool_result"),
      toolUseId: o().describe("The unique identifier for the corresponding tool call."),
      content: A(Ne),
      structuredContent: u({}).loose().optional(),
      isError: M().optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    ar = Ir("type", [ct, lt, ut]),
    Ze = Ir("type", [ct, lt, ut, Bt, co]),
    nr = u({ role: G, content: Ue([Ze, A(Ze)]), _meta: pe(o(), oe()).optional() }),
    extend_45 = extend.extend({
      messages: A(nr),
      modelPreferences: or.optional(),
      systemPrompt: o().optional(),
      includeContext: U(["none", "thisServer", "allServers"]).optional(),
      temperature: E().optional(),
      maxTokens: E().int(),
      stopSequences: A(o()).optional(),
      metadata: t.optional(),
      tools: A(ht).optional(),
      toolChoice: sr.optional(),
    }),
    extend_46 = d.extend({ method: T("sampling/createMessage"), params: extend_45 }),
    extend_47 = w.extend({
      model: o(),
      stopReason: La(U(["endTurn", "stopSequence", "maxTokens"]).or(o())),
      role: G,
      content: ar,
    }),
    extend_48 = w.extend({
      model: o(),
      stopReason: La(U(["endTurn", "stopSequence", "maxTokens", "toolUse"]).or(o())),
      role: G,
      content: Ue([Ze, A(Ze)]),
    }),
    dr = u({
      type: T("boolean"),
      title: o().optional(),
      description: o().optional(),
      default: M().optional(),
    }),
    hr = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      minLength: E().optional(),
      maxLength: E().optional(),
      format: U(["email", "uri", "date", "date-time"]).optional(),
      default: o().optional(),
    }),
    mr = u({
      type: U(["number", "integer"]),
      title: o().optional(),
      description: o().optional(),
      minimum: E().optional(),
      maximum: E().optional(),
      default: E().optional(),
    }),
    pr = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      enum: A(o()),
      default: o().optional(),
    }),
    fr = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      oneOf: A(u({ const: o(), title: o() })),
      default: o().optional(),
    }),
    Sr = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      enum: A(o()),
      enumNames: A(o()).optional(),
      default: o().optional(),
    }),
    gr = Ue([pr, fr]),
    mt = u({
      type: T("array"),
      title: o().optional(),
      description: o().optional(),
      minItems: E().optional(),
      maxItems: E().optional(),
      items: u({ type: T("string"), enum: A(o()) }),
      default: A(o()).optional(),
    }),
    pt = u({
      type: T("array"),
      title: o().optional(),
      description: o().optional(),
      minItems: E().optional(),
      maxItems: E().optional(),
      items: u({ anyOf: A(u({ const: o(), title: o() })) }),
      default: A(o()).optional(),
    }),
    lo = Ue([mt, pt]),
    uo = Ue([Sr, gr, lo]),
    ke = Ue([uo, dr, hr, mr]),
    extend_49 = extend.extend({
      mode: T("form").optional(),
      message: o(),
      requestedSchema: u({
        type: T("object"),
        properties: pe(o(), ke),
        required: A(o()).optional(),
      }).catchall(oe()),
    }),
    extend_50 = extend.extend({ mode: T("url"), message: o(), elicitationId: o(), url: o().url() }),
    Ae = Ue([extend_49, extend_50]),
    extend_51 = d.extend({ method: T("elicitation/create"), params: Ae }),
    extend_52 = m.extend({ elicitationId: o() }),
    extend_53 = _.extend({ method: T("notifications/elicitation/complete"), params: extend_52 }),
    extend_54 = w.extend({
      action: U(["accept", "decline", "cancel"]),
      content: Ka((we) => (we === null ? void 0 : we), pe(o(), Ue([o(), E(), M(), A(o())])).optional()),
    }),
    So = u({ type: T("ref/resource"), uri: o() }),
    go = u({ type: T("ref/prompt"), name: o() }),
    extend_55 = l.extend({
      ref: Ue([go, So]),
      argument: u({ name: o(), value: o() }),
      context: u({ arguments: pe(o(), o()).optional() }).optional(),
    }),
    extend_56 = d.extend({ method: T("completion/complete"), params: extend_55 }),
    extend_57 = w.extend({
      completion: kt({ values: A(o()).max(100), total: La(E().int()), hasMore: La(M()) }),
    }),
    vo = u({ uri: o().startsWith("file://"), name: o().optional(), _meta: pe(o(), oe()).optional() }),
    extend_58 = d.extend({ method: T("roots/list"), params: l.optional() }),
    extend_59 = w.extend({ roots: A(vo) }),
    extend_60 = _.extend({ method: T("notifications/roots/list_changed"), params: m.optional() }),
    Ro = kt({ ttl: E().optional(), pollInterval: E().optional() }),
    zo = U(["working", "input_required", "completed", "failed", "cancelled"]),
    Qe = u({
      taskId: o(),
      status: zo,
      ttl: Ue([E(), zg()]),
      createdAt: o(),
      lastUpdatedAt: o(),
      pollInterval: La(E()),
      statusMessage: La(o()),
    }),
    extend_61 = w.extend({ task: Qe }),
    merge = m.merge(Qe),
    extend_62 = _.extend({ method: T("notifications/tasks/status"), params: merge }),
    extend_63 = d.extend({ method: T("tasks/get"), params: l.extend({ taskId: o() }) }),
    merge_2 = w.merge(Qe),
    extend_64 = d.extend({ method: T("tasks/result"), params: l.extend({ taskId: o() }) }),
    loose = w.loose(),
    extend_65 = extend_12.extend({ method: T("tasks/list") }),
    extend_66 = extend_13.extend({ tasks: A(Qe) }),
    extend_67 = d.extend({ method: T("tasks/cancel"), params: l.extend({ taskId: o() }) });
  return {
    JSONValueSchema: e,
    JSONObjectSchema: t,
    ProgressTokenSchema: r,
    CursorSchema: s,
    TaskMetadataSchema: a,
    RelatedTaskMetadataSchema: n,
    RequestMetaSchema: i,
    BaseRequestParamsSchema: l,
    TaskAugmentedRequestParamsSchema: extend,
    RequestSchema: d,
    NotificationsParamsSchema: m,
    NotificationSchema: _,
    ResultSchema: w,
    RequestIdSchema: P,
    EmptyResultSchema: strict,
    CancelledNotificationParamsSchema: extend_2,
    CancelledNotificationSchema: extend_3,
    IconSchema: h,
    IconsSchema: S,
    BaseMetadataSchema: f,
    ImplementationSchema: extend_4,
    ClientTasksCapabilitySchema: g,
    ServerTasksCapabilitySchema: k,
    ClientCapabilitiesSchema: V,
    InitializeRequestParamsSchema: extend_5,
    InitializeRequestSchema: extend_6,
    ServerCapabilitiesSchema: x,
    InitializeResultSchema: extend_7,
    InitializedNotificationSchema: extend_8,
    PingRequestSchema: extend_9,
    ProgressSchema: le,
    ProgressNotificationParamsSchema: ie,
    ProgressNotificationSchema: extend_10,
    PaginatedRequestParamsSchema: extend_11,
    PaginatedRequestSchema: extend_12,
    PaginatedResultSchema: extend_13,
    ResourceContentsSchema: K,
    TextResourceContentsSchema: extend_14,
    BlobResourceContentsSchema: extend_15,
    RoleSchema: G,
    AnnotationsSchema: Y,
    ResourceSchema: re,
    ResourceTemplateSchema: Q,
    ListResourcesRequestSchema: extend_16,
    ListResourcesResultSchema: extend_17,
    ListResourceTemplatesRequestSchema: extend_18,
    ListResourceTemplatesResultSchema: extend_19,
    ResourceRequestParamsSchema: extend_20,
    ReadResourceRequestParamsSchema: X,
    ReadResourceRequestSchema: extend_21,
    ReadResourceResultSchema: extend_22,
    ResourceListChangedNotificationSchema: extend_23,
    SubscribeRequestParamsSchema: _e,
    SubscribeRequestSchema: extend_24,
    UnsubscribeRequestParamsSchema: ge,
    UnsubscribeRequestSchema: extend_25,
    ResourceUpdatedNotificationParamsSchema: extend_26,
    ResourceUpdatedNotificationSchema: extend_27,
    PromptArgumentSchema: Ve,
    PromptSchema: je,
    ListPromptsRequestSchema: extend_28,
    ListPromptsResultSchema: extend_29,
    GetPromptRequestParamsSchema: extend_30,
    GetPromptRequestSchema: extend_31,
    TextContentSchema: ct,
    ImageContentSchema: lt,
    AudioContentSchema: ut,
    ToolUseContentSchema: Bt,
    EmbeddedResourceSchema: Xe,
    ResourceLinkSchema: extend_32,
    ContentBlockSchema: Ne,
    PromptMessageSchema: zt,
    GetPromptResultSchema: extend_33,
    PromptListChangedNotificationSchema: extend_34,
    ToolAnnotationsSchema: Yt,
    ToolExecutionSchema: $t,
    ToolSchema: ht,
    ListToolsRequestSchema: extend_35,
    ListToolsResultSchema: extend_36,
    CallToolResultSchema: extend_37,
    CallToolRequestParamsSchema: extend_38,
    CallToolRequestSchema: extend_39,
    ToolListChangedNotificationSchema: extend_40,
    LoggingLevelSchema: Ct,
    SetLevelRequestParamsSchema: extend_41,
    SetLevelRequestSchema: extend_42,
    LoggingMessageNotificationParamsSchema: extend_43,
    LoggingMessageNotificationSchema: extend_44,
    ModelHintSchema: rr,
    ModelPreferencesSchema: or,
    ToolChoiceSchema: sr,
    ToolResultContentSchema: co,
    SamplingContentSchema: ar,
    SamplingMessageContentBlockSchema: Ze,
    SamplingMessageSchema: nr,
    CreateMessageRequestParamsSchema: extend_45,
    CreateMessageRequestSchema: extend_46,
    CreateMessageResultSchema: extend_47,
    CreateMessageResultWithToolsSchema: extend_48,
    BooleanSchemaSchema: dr,
    StringSchemaSchema: hr,
    NumberSchemaSchema: mr,
    UntitledSingleSelectEnumSchemaSchema: pr,
    TitledSingleSelectEnumSchemaSchema: fr,
    LegacyTitledEnumSchemaSchema: Sr,
    SingleSelectEnumSchemaSchema: gr,
    UntitledMultiSelectEnumSchemaSchema: mt,
    TitledMultiSelectEnumSchemaSchema: pt,
    MultiSelectEnumSchemaSchema: lo,
    EnumSchemaSchema: uo,
    PrimitiveSchemaDefinitionSchema: ke,
    ElicitRequestFormParamsSchema: extend_49,
    ElicitRequestURLParamsSchema: extend_50,
    ElicitRequestParamsSchema: Ae,
    ElicitRequestSchema: extend_51,
    ElicitationCompleteNotificationParamsSchema: extend_52,
    ElicitationCompleteNotificationSchema: extend_53,
    ElicitResultSchema: extend_54,
    ResourceTemplateReferenceSchema: So,
    PromptReferenceSchema: go,
    CompleteRequestParamsSchema: extend_55,
    CompleteRequestSchema: extend_56,
    CompleteResultSchema: extend_57,
    RootSchema: vo,
    ListRootsRequestSchema: extend_58,
    ListRootsResultSchema: extend_59,
    RootsListChangedNotificationSchema: extend_60,
    TaskCreationParamsSchema: Ro,
    TaskStatusSchema: zo,
    TaskSchema: Qe,
    CreateTaskResultSchema: extend_61,
    TaskStatusNotificationParamsSchema: merge,
    TaskStatusNotificationSchema: extend_62,
    GetTaskRequestSchema: extend_63,
    GetTaskResultSchema: merge_2,
    GetTaskPayloadRequestSchema: extend_64,
    GetTaskPayloadResultSchema: loose,
    ListTasksRequestSchema: extend_65,
    ListTasksResultSchema: extend_66,
    CancelTaskRequestSchema: extend_67,
    CancelTaskResultSchema: w.merge(Qe),
    ClientRequestSchema: Ue([
      extend_9,
      extend_6,
      extend_56,
      extend_42,
      extend_31,
      extend_28,
      extend_16,
      extend_18,
      extend_21,
      extend_24,
      extend_25,
      extend_39,
      extend_35,
      extend_63,
      extend_64,
      extend_65,
      extend_67,
    ]),
    ClientNotificationSchema: Ue([extend_3, extend_10, extend_8, extend_60, extend_62]),
    ClientResultSchema: Ue([
      strict,
      extend_47,
      extend_48,
      extend_54,
      extend_59,
      merge_2,
      extend_66,
      extend_61,
    ]),
    ServerRequestSchema: Ue([
      extend_9,
      extend_46,
      extend_51,
      extend_58,
      extend_63,
      extend_64,
      extend_65,
      extend_67,
    ]),
    ServerNotificationSchema: Ue([
      extend_3,
      extend_10,
      extend_44,
      extend_27,
      extend_23,
      extend_40,
      extend_34,
      extend_62,
      extend_53,
    ]),
    ServerResultSchema: Ue([
      strict,
      extend_7,
      extend_57,
      extend_33,
      extend_29,
      extend_17,
      extend_19,
      extend_22,
      extend_37,
      extend_36,
      merge_2,
      extend_66,
      extend_61,
    ]),
    CallToolResultWireSchema: oe()
      .superRefine((we, Ec) => {
        if (typeof we !== "object" || we === null || Array.isArray(we) || we.content !== void 0) return;
        for (let kn of ei)
          if (kn in we) {
            Ec.addIssue({
              code: "custom",
              message: `content is required when the body carries '${kn}' \u2014 another result family cannot default into an empty tools/call success`,
            });
            return;
          }
      })
      .transform(Ac)
      .pipe(extend_37),
  };
}
//@ chunk-r1g76qsy.js:37310-37317 esm-layout
var Uc;
//@ chunk-r1g76qsy.js:37317-37348 esm-layout
function ti() {
  return (Uc ??= Lc());
}
//@ chunk-r1g76qsy.js:37348-37388 esm-layout
function ri(e) {
  return e.type !== "object";
}
//@ chunk-r1g76qsy.js:37388-37530 esm-fingerprint
var Dc = new Set(["const", "enum", "default", "examples"]),
  Vc = new Set(["properties", "patternProperties", "$defs", "definitions", "dependentSchemas"]);
//@ chunk-r1g76qsy.js:37530-38232 esm-fingerprint
function xc(e) {
  let t = typeof e.$schema === "string" ? e.$schema : void 0;
  if (e.$id !== void 0)
    return {
      ...(t !== void 0 && { $schema: t }),
      type: "object",
      properties: { result: e },
      required: ["result"],
    };
  let r = (s, a) => {
    if (Array.isArray(s)) return s.map((i) => r(i, !1));
    if (s === null || typeof s !== "object") return s;
    if (!a && s.$id !== void 0) return s;
    let n = {};
    for (let [i, l] of Object.entries(s))
      if (a) n[i] = r(l, !1);
      else if ((i === "$ref" || i === "$dynamicRef") && typeof l === "string")
        n[i] =
          l === "#" ? "#/properties/result" : l.startsWith("#/") ? `#/properties/result${l.slice(1)}` : l;
      else if (Dc.has(i)) n[i] = l;
      else if (Vc.has(i)) n[i] = r(l, !0);
      else n[i] = r(l, !1);
    return n;
  };
  return {
    ...(t !== void 0 && { $schema: t }),
    type: "object",
    properties: { result: r(e, !1) },
    required: ["result"],
  };
}
//@ chunk-r1g76qsy.js:38232-39449 esm-fingerprint
var oi = {
    ping: null,
    initialize: null,
    "completion/complete": null,
    "logging/setLevel": null,
    "prompts/get": null,
    "prompts/list": null,
    "resources/list": null,
    "resources/templates/list": null,
    "resources/read": null,
    "resources/subscribe": null,
    "resources/unsubscribe": null,
    "tools/call": null,
    "tools/list": null,
    "tasks/get": null,
    "tasks/result": null,
    "tasks/list": null,
    "tasks/cancel": null,
    "sampling/createMessage": null,
    "elicitation/create": null,
    "roots/list": null,
  },
  si = {
    "notifications/cancelled": null,
    "notifications/progress": null,
    "notifications/initialized": null,
    "notifications/roots/list_changed": null,
    "notifications/tasks/status": null,
    "notifications/message": null,
    "notifications/resources/updated": null,
    "notifications/resources/list_changed": null,
    "notifications/tools/list_changed": null,
    "notifications/prompts/list_changed": null,
    "notifications/elicitation/complete": null,
  },
  Fc = {
    ping: null,
    initialize: null,
    "completion/complete": null,
    "logging/setLevel": null,
    "prompts/get": null,
    "prompts/list": null,
    "resources/list": null,
    "resources/templates/list": null,
    "resources/read": null,
    "resources/subscribe": null,
    "resources/unsubscribe": null,
    "tools/call": null,
    "tools/list": null,
    "sampling/createMessage": null,
    "elicitation/create": null,
    "roots/list": null,
  },
  ra;
//@ chunk-r1g76qsy.js:39449-41827 esm-fingerprint
function un() {
  if (ra) return ra;
  let e = ti();
  return (
    (ra = {
      requestSchemas: {
        ping: e.PingRequestSchema,
        initialize: e.InitializeRequestSchema,
        "completion/complete": e.CompleteRequestSchema,
        "logging/setLevel": e.SetLevelRequestSchema,
        "prompts/get": e.GetPromptRequestSchema,
        "prompts/list": e.ListPromptsRequestSchema,
        "resources/list": e.ListResourcesRequestSchema,
        "resources/templates/list": e.ListResourceTemplatesRequestSchema,
        "resources/read": e.ReadResourceRequestSchema,
        "resources/subscribe": e.SubscribeRequestSchema,
        "resources/unsubscribe": e.UnsubscribeRequestSchema,
        "tools/call": e.CallToolRequestSchema,
        "tools/list": e.ListToolsRequestSchema,
        "tasks/get": e.GetTaskRequestSchema,
        "tasks/result": e.GetTaskPayloadRequestSchema,
        "tasks/list": e.ListTasksRequestSchema,
        "tasks/cancel": e.CancelTaskRequestSchema,
        "sampling/createMessage": e.CreateMessageRequestSchema,
        "elicitation/create": e.ElicitRequestSchema,
        "roots/list": e.ListRootsRequestSchema,
      },
      notificationSchemas: {
        "notifications/cancelled": e.CancelledNotificationSchema,
        "notifications/progress": e.ProgressNotificationSchema,
        "notifications/initialized": e.InitializedNotificationSchema,
        "notifications/roots/list_changed": e.RootsListChangedNotificationSchema,
        "notifications/tasks/status": e.TaskStatusNotificationSchema,
        "notifications/message": e.LoggingMessageNotificationSchema,
        "notifications/resources/updated": e.ResourceUpdatedNotificationSchema,
        "notifications/resources/list_changed": e.ResourceListChangedNotificationSchema,
        "notifications/tools/list_changed": e.ToolListChangedNotificationSchema,
        "notifications/prompts/list_changed": e.PromptListChangedNotificationSchema,
        "notifications/elicitation/complete": e.ElicitationCompleteNotificationSchema,
      },
      resultSchemas: {
        ping: e.EmptyResultSchema,
        initialize: e.InitializeResultSchema,
        "completion/complete": e.CompleteResultSchema,
        "logging/setLevel": e.EmptyResultSchema,
        "prompts/get": e.GetPromptResultSchema,
        "prompts/list": e.ListPromptsResultSchema,
        "resources/list": e.ListResourcesResultSchema,
        "resources/templates/list": e.ListResourceTemplatesResultSchema,
        "resources/read": e.ReadResourceResultSchema,
        "resources/subscribe": e.EmptyResultSchema,
        "resources/unsubscribe": e.EmptyResultSchema,
        "tools/call": e.CallToolResultWireSchema,
        "tools/list": e.ListToolsResultSchema,
        "sampling/createMessage": e.CreateMessageResultWithToolsSchema,
        "elicitation/create": e.ElicitResultSchema,
        "roots/list": e.ListRootsResultSchema,
      },
    }),
    ra
  );
}
//@ chunk-r1g76qsy.js:41827-41892 esm-fingerprint
function ai(e) {
  return Object.prototype.hasOwnProperty.call(oi, e);
}
//@ chunk-r1g76qsy.js:41892-41957 esm-fingerprint
function ni(e) {
  return Object.prototype.hasOwnProperty.call(si, e);
}
//@ chunk-r1g76qsy.js:41957-42022 esm-fingerprint
function Hc(e) {
  return Object.prototype.hasOwnProperty.call(Fc, e);
}
//@ chunk-r1g76qsy.js:42022-42079 esm-fingerprint
function Kc(e) {
  return Hc(e) ? un().resultSchemas[e] : void 0;
}
//@ chunk-r1g76qsy.js:42079-42137 esm-fingerprint
function Jc(e) {
  return ai(e) ? un().requestSchemas[e] : void 0;
}
//@ chunk-r1g76qsy.js:42137-42200 esm-fingerprint
function Gc(e) {
  return ni(e) ? un().notificationSchemas[e] : void 0;
}
//@ chunk-r1g76qsy.js:42200-42242 esm-layout
var keys = Object.keys(oi),
  keys_2 = Object.keys(si);
//@ chunk-r1g76qsy.js:42242-42313 esm-fingerprint
function on(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:42313-42486 esm-fingerprint
function oa(e, t) {
  if (e === void 0) return { ok: !1, reason: "not-in-era" };
  let safeParse = e.safeParse(t);
  return safeParse.success
    ? { ok: !0, value: safeParse.data }
    : { ok: !1, reason: "invalid", message: String(safeParse.error) };
}
//@ chunk-r1g76qsy.js:42486-42521 esm-fingerprint
var Dn = { ok: !1, reason: "not-in-era" };
//@ chunk-r1g76qsy.js:42521-42589 esm-layout
function Vn(e) {
  return on(e) && on(e.outputSchema) && ri(e.outputSchema);
}
//@ chunk-r1g76qsy.js:42589-42613 esm-layout
function xn(e) {
  return e;
}
//@ chunk-r1g76qsy.js:42613-43703 esm-fingerprint
var dn = {
  era: "2025-11-25",
  hasRequestMethod: ai,
  hasNotificationMethod: ni,
  validateRequest: (e, t) => oa(Jc(e), t),
  validateResult: (e, t) => oa(Kc(e), t),
  validateNotification: (e, t) => oa(Gc(e), t),
  hasInputRequestMethod: () => !1,
  validateInputRequest: () => Dn,
  validateInputResponse: () => Dn,
  samplingResultVariant: (e, t) => {
    let r = ti();
    return oa(e ? r.CreateMessageResultWithToolsSchema : r.CreateMessageResultSchema, t);
  },
  outboundEnvelope: (e) => {
    return;
  },
  validateEnvelopeMeta: (e) => [],
  projectCallToolResult(e, t) {
    let r = Qn(e),
      structuredContent = r.structuredContent;
    if (structuredContent === void 0) return r;
    let a =
        typeof structuredContent !== "object" ||
        structuredContent === null ||
        Array.isArray(structuredContent),
      n = t !== void 0 && ri(t);
    if (!a && !n) return r;
    return { ...r, structuredContent: { result: structuredContent } };
  },
  decodeResult(e, t) {
    if (on(t) && "resultType" in t) {
      let r = { ...t };
      return (delete r.resultType, { kind: "complete", result: xn(r) });
    }
    return { kind: "complete", result: xn(t) };
  },
  encodeResult(e, t) {
    if (e !== "tools/list") return t;
    let tools = t.tools;
    if (!Array.isArray(tools) || !tools.some((s) => Vn(s))) return t;
    return { ...t, tools: tools.map((s) => (Vn(s) ? { ...s, outputSchema: xc(s.outputSchema) } : s)) };
  },
  encodeErrorCode: (e) => (e === -32002 ? -32602 : e),
  checkInboundEnvelope: (e) => {
    return;
  },
};
//@ chunk-r1g76qsy.js:43703-59401 esm-fingerprint
function Bc() {
  let e = aA(() => Ue([o(), E(), M(), zg(), pe(o(), e), A(e)])),
    t = pe(o(), e),
    r = Ue([o(), E().int()]),
    s = o(),
    a = Ue([o(), E().int()]),
    n = U(["user", "assistant"]),
    i = U(["debug", "info", "notice", "warning", "error", "critical", "alert", "emergency"]),
    refine = o().refine(
      (fe) => {
        try {
          return (atob(fe), !0);
        } catch {
          return !1;
        }
      },
      { message: "Invalid Base64 string" },
    ),
    c = u({ ttl: E().optional() }),
    d = u({ taskId: o() }),
    m = kt({ progressToken: r.optional(), "io.modelcontextprotocol/related-task": d.optional() }),
    _ = u({ _meta: m.optional() }),
    extend = _.extend({ task: c.optional() }),
    P = u({ _meta: m.optional() }),
    y = u({ method: o(), params: P.loose().optional() }),
    v = u({
      src: o(),
      mimeType: o().optional(),
      sizes: A(o()).optional(),
      theme: U(["light", "dark"]).optional(),
    }),
    p = u({ icons: A(v).optional() }),
    h = u({ name: o(), title: o().optional() }),
    extend_2 = h.extend({
      ...h.shape,
      ...p.shape,
      version: o(),
      websiteUrl: o().optional(),
      description: o().optional(),
    }),
    f = Lve(u({ applyDefaults: M().optional() }), t),
    R = Ka(
      (fe) => {
        if (fe && typeof fe === "object" && !Array.isArray(fe) && Object.keys(fe).length === 0)
          return { form: {} };
        return fe;
      },
      Lve(u({ form: f.optional(), url: t.optional() }), t.optional()),
    ),
    C = kt({
      list: t.optional(),
      cancel: t.optional(),
      requests: kt({
        sampling: kt({ createMessage: t.optional() }).optional(),
        elicitation: kt({ create: t.optional() }).optional(),
      }).optional(),
    }),
    b = kt({
      list: t.optional(),
      cancel: t.optional(),
      requests: kt({ tools: kt({ call: t.optional() }).optional() }).optional(),
    }),
    g = u({
      experimental: pe(o(), t).optional(),
      sampling: u({ context: t.optional(), tools: t.optional() }).optional(),
      elicitation: R.optional(),
      roots: u({ listChanged: M().optional() }).optional(),
      tasks: C.optional(),
      extensions: pe(o(), t).optional(),
    }),
    k = u({
      experimental: pe(o(), t).optional(),
      logging: t.optional(),
      completions: t.optional(),
      prompts: u({ listChanged: M().optional() }).optional(),
      resources: u({ subscribe: M().optional(), listChanged: M().optional() }).optional(),
      tools: u({ listChanged: M().optional() }).optional(),
      tasks: b.optional(),
      extensions: pe(o(), t).optional(),
    }),
    V = u({ progress: E(), total: La(E()), message: La(o()) }),
    H = u({ ...P.shape, ...V.shape, progressToken: r }),
    extend_3 = y.extend({ method: T("notifications/progress"), params: H }),
    extend_4 = P.extend({ level: i, logger: o().optional(), data: oe() }),
    extend_5 = y.extend({ method: T("notifications/message"), params: extend_4 }),
    B = u({ uri: o(), mimeType: La(o()), _meta: pe(o(), oe()).optional() }),
    extend_6 = B.extend({ text: o() }),
    extend_7 = B.extend({ blob: refine }),
    ie = u({
      audience: A(n).optional(),
      priority: E().min(0).max(1).optional(),
      lastModified: Ue([t0({ offset: !0 }), t0({ offset: !0, precision: -1 })]).optional(),
    }),
    Se = u({
      ...h.shape,
      ...p.shape,
      uri: o(),
      description: La(o()),
      mimeType: La(o()),
      size: La(E()),
      annotations: ie.optional(),
      _meta: La(kt({})),
    }),
    ae = u({
      ...h.shape,
      ...p.shape,
      uriTemplate: o(),
      description: La(o()),
      mimeType: La(o()),
      annotations: ie.optional(),
      _meta: La(kt({})),
    }),
    extend_8 = y.extend({ method: T("notifications/resources/list_changed"), params: P.optional() }),
    extend_9 = P.extend({ uri: o() }),
    extend_10 = y.extend({ method: T("notifications/resources/updated"), params: extend_9 }),
    z = u({ name: o(), description: La(o()), required: La(M()) }),
    I = u({ ...h.shape, ...p.shape, description: La(o()), arguments: La(A(z)), _meta: La(kt({})) }),
    extend_11 = y.extend({ method: T("notifications/prompts/list_changed"), params: P.optional() }),
    G = u({ type: T("text"), text: o(), annotations: ie.optional(), _meta: pe(o(), oe()).optional() }),
    Y = u({
      type: T("image"),
      data: refine,
      mimeType: o(),
      annotations: ie.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    re = u({
      type: T("audio"),
      data: refine,
      mimeType: o(),
      annotations: ie.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    Q = u({ type: T("tool_use"), name: o(), id: o(), input: pe(o(), oe()), _meta: pe(o(), oe()).optional() }),
    ce = u({
      type: T("resource"),
      resource: Ue([extend_6, extend_7]),
      annotations: ie.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    extend_12 = Se.extend({ type: T("resource_link") }),
    q = Ue([G, Y, re, extend_12, ce]),
    D = u({ role: n, content: q }),
    F = u({
      title: o().optional(),
      readOnlyHint: M().optional(),
      destructiveHint: M().optional(),
      idempotentHint: M().optional(),
      openWorldHint: M().optional(),
    }),
    extend_13 = y.extend({ method: T("notifications/tools/list_changed"), params: P.optional() }),
    Z = u({ name: o().optional() }),
    ee = u({
      hints: A(Z).optional(),
      costPriority: E().min(0).max(1).optional(),
      speedPriority: E().min(0).max(1).optional(),
      intelligencePriority: E().min(0).max(1).optional(),
    }),
    me = u({ mode: U(["auto", "required", "none"]).optional() }),
    _e = u({
      type: T("boolean"),
      title: o().optional(),
      description: o().optional(),
      default: M().optional(),
    }),
    Re = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      minLength: E().optional(),
      maxLength: E().optional(),
      format: U(["email", "uri", "date", "date-time"]).optional(),
      default: o().optional(),
    }),
    ge = u({
      type: U(["number", "integer"]),
      title: o().optional(),
      description: o().optional(),
      minimum: E().optional(),
      maximum: E().optional(),
      default: E().optional(),
    }),
    ue = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      enum: A(o()),
      default: o().optional(),
    }),
    Oe = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      oneOf: A(u({ const: o(), title: o() })),
      default: o().optional(),
    }),
    ye = u({
      type: T("string"),
      title: o().optional(),
      description: o().optional(),
      enum: A(o()),
      enumNames: A(o()).optional(),
      default: o().optional(),
    }),
    Ve = Ue([ue, Oe]),
    je = u({
      type: T("array"),
      title: o().optional(),
      description: o().optional(),
      minItems: E().optional(),
      maxItems: E().optional(),
      items: u({ type: T("string"), enum: A(o()) }),
      default: A(o()).optional(),
    }),
    xe = u({
      type: T("array"),
      title: o().optional(),
      description: o().optional(),
      minItems: E().optional(),
      maxItems: E().optional(),
      items: u({ anyOf: A(u({ const: o(), title: o() })) }),
      default: A(o()).optional(),
    }),
    We = Ue([je, xe]),
    Ye = Ue([ye, Ve, We]),
    it = Ue([Ye, _e, Re, ge]),
    extend_14 = extend.extend({
      mode: T("form").optional(),
      message: o(),
      requestedSchema: u({
        type: T("object"),
        properties: pe(o(), it),
        required: A(o()).optional(),
      }).catchall(oe()),
    }),
    lt = u({ type: T("ref/resource"), uri: o() }),
    ut = u({ type: T("ref/prompt"), name: o() }),
    Bt = u({ uri: o().startsWith("file://"), name: o().optional(), _meta: pe(o(), oe()).optional() }),
    shape = g.shape,
    Wt = u({
      experimental: shape.experimental,
      sampling: shape.sampling,
      elicitation: shape.elicitation,
      roots: shape.roots,
      extensions: shape.extensions,
    }),
    shape_2 = k.shape,
    zt = u({
      experimental: shape_2.experimental,
      logging: shape_2.logging,
      completions: shape_2.completions,
      prompts: shape_2.prompts,
      resources: shape_2.resources,
      tools: shape_2.tools,
      extensions: shape_2.extensions,
    }),
    wt = kt({
      progressToken: r.optional(),
      [IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION]: o(),
      [IO_MODELCONTEXTPROTOCOL_CLIENTINFO]: extend_2.optional(),
      [IHe]: Wt,
      [IO_MODELCONTEXTPROTOCOL_LOGLEVEL]: i.optional(),
    }),
    dt = u({
      ...h.shape,
      ...p.shape,
      description: o().optional(),
      inputSchema: kt({ $schema: o().optional(), type: T("object") }),
      outputSchema: kt({ $schema: o().optional() }).optional(),
      annotations: F.optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    Yt = u({
      type: T("tool_result"),
      toolUseId: o(),
      content: A(q),
      structuredContent: oe().optional(),
      isError: M().optional(),
      _meta: pe(o(), oe()).optional(),
    }),
    $t = Ue([G, Y, re, Q, Yt]),
    ht = u({ role: n, content: Ue([$t, A($t)]), _meta: pe(o(), oe()).optional() }),
    Et = o(),
    Pt = kt({ [IO_MODELCONTEXTPROTOCOL_SERVERINFO]: extend_2.optional().catch(void 0) }),
    optional = Pt.optional();
  function ze(fe) {
    return kt({ _meta: optional, resultType: Et.default("complete"), ...fe });
  }
  let Xt = ze({}),
    io = ze({ nextCursor: s.optional() }),
    Ct = ze({ content: A(q), structuredContent: oe().optional(), isError: M().optional() }),
    Zt = ze({
      ttlMs: E().int().min(0),
      cacheScope: U(["public", "private"]),
      tools: A(dt),
      nextCursor: s.optional(),
    }),
    Qt = ze({
      ttlMs: E().int().min(0),
      cacheScope: U(["public", "private"]),
      prompts: A(I),
      nextCursor: s.optional(),
    }),
    er = ze({ description: o().optional(), messages: A(D) }),
    tr = ze({
      ttlMs: E().int().min(0),
      cacheScope: U(["public", "private"]),
      resources: A(Se),
      nextCursor: s.optional(),
    }),
    rr = ze({
      ttlMs: E().int().min(0),
      cacheScope: U(["public", "private"]),
      resourceTemplates: A(ae),
      nextCursor: s.optional(),
    }),
    or = ze({
      ttlMs: E().int().min(0),
      cacheScope: U(["public", "private"]),
      contents: A(Ue([extend_6, extend_7])),
    }),
    sr = ze({
      completion: u({
        values: A(o()).max(100),
        total: E().int().optional(),
        hasMore: M().optional(),
      }).loose(),
    }),
    co = ze({ ttlMs: E().int().min(0), cacheScope: U(["public", "private"]) }),
    ar = ze({
      ttlMs: E().int().min(0).catch(0),
      cacheScope: U(["public", "private"]).catch("private"),
      supportedVersions: A(o()),
      capabilities: zt,
      instructions: o().optional(),
    }),
    Ze = u({
      messages: A(ht),
      modelPreferences: ee.optional(),
      systemPrompt: o().optional(),
      includeContext: U(["none", "thisServer", "allServers"]).optional(),
      temperature: E().optional(),
      maxTokens: E().int(),
      stopSequences: A(o()).optional(),
      metadata: t.optional(),
      tools: A(dt).optional(),
      toolChoice: me.optional(),
    }),
    nr = u({ method: T("sampling/createMessage"), params: Ze }),
    ir = u({ method: T("roots/list"), params: u({ _meta: pe(o(), oe()).optional() }).optional() }),
    cr = u({ ...ht.shape, model: o(), stopReason: o().optional() }),
    lr = u({ roots: A(Bt) }),
    ur = u({
      action: U(["accept", "decline", "cancel"]),
      content: pe(o(), Ue([o(), E(), M(), A(o())])).optional(),
    }),
    dr = u({ mode: T("url"), message: o(), url: o().url() }),
    hr = Ue([extend_14, dr]),
    mr = u({ method: T("elicitation/create"), params: hr }),
    pr = Ue([nr, ir, mr]),
    fr = Ue([cr, lr, ur]),
    Sr = pe(o(), pr),
    gr = pe(o(), fr),
    mt = ze({ inputRequests: Sr.optional(), requestState: o().optional() }),
    pt = { inputResponses: gr.optional(), requestState: o().optional() },
    lo = u({ _meta: wt, ...pt }),
    uo = kt({ progressToken: r.optional() });
  function ke(fe, St) {
    return u({ method: T(fe), params: u({ _meta: wt, ...St }) });
  }
  function qe(fe, St) {
    return u({ method: T(fe), params: u({ _meta: uo.optional(), ...St }).optional() });
  }
  let _r = { name: o(), arguments: pe(o(), oe()).optional(), ...pt },
    Ae = { cursor: s.optional() },
    ho = ke("tools/call", _r),
    mo = ke("tools/list", Ae),
    po = ke("prompts/list", Ae),
    fo = ke("prompts/get", { name: o(), arguments: pe(o(), o()).optional(), ...pt }),
    So = ke("resources/list", Ae),
    go = ke("resources/templates/list", Ae),
    _o = ke("resources/read", { uri: o(), ...pt }),
    yr = {
      ref: Ue([ut, lt]),
      argument: u({ name: o(), value: o() }),
      context: u({ arguments: pe(o(), o()).optional() }).optional(),
    },
    yo = ke("completion/complete", yr),
    vo = ke("server/discover", {}),
    qt = u({
      toolsListChanged: M().optional(),
      promptsListChanged: M().optional(),
      resourcesListChanged: M().optional(),
      resourceSubscriptions: A(o()).optional(),
    }),
    vr = { notifications: qt },
    bo = ke("subscriptions/listen", vr),
    extend_15 = Pt.extend({ "io.modelcontextprotocol/subscriptionId": a }),
    zo = kt({ _meta: extend_15, resultType: Et.default("complete") }),
    Qe = {
      "tools/call": qe("tools/call", _r),
      "tools/list": qe("tools/list", Ae),
      "prompts/get": qe("prompts/get", { name: o(), arguments: pe(o(), o()).optional() }),
      "prompts/list": qe("prompts/list", Ae),
      "resources/list": qe("resources/list", Ae),
      "resources/templates/list": qe("resources/templates/list", Ae),
      "resources/read": qe("resources/read", { uri: o() }),
      "completion/complete": qe("completion/complete", yr),
      "server/discover": qe("server/discover", {}),
      "subscriptions/listen": qe("subscriptions/listen", vr),
    };
  function Te(fe) {
    return kt({ _meta: optional, ...fe });
  }
  let wo = {
      "tools/call": Te({ content: A(q), structuredContent: oe().optional(), isError: M().optional() }),
      "tools/list": Te({
        ttlMs: E().int().min(0),
        cacheScope: U(["public", "private"]),
        tools: A(dt),
        nextCursor: s.optional(),
      }),
      "prompts/get": Te({ description: o().optional(), messages: A(D) }),
      "prompts/list": Te({
        ttlMs: E().int().min(0),
        cacheScope: U(["public", "private"]),
        prompts: A(I),
        nextCursor: s.optional(),
      }),
      "resources/list": Te({
        ttlMs: E().int().min(0),
        cacheScope: U(["public", "private"]),
        resources: A(Se),
        nextCursor: s.optional(),
      }),
      "resources/templates/list": Te({
        ttlMs: E().int().min(0),
        cacheScope: U(["public", "private"]),
        resourceTemplates: A(ae),
        nextCursor: s.optional(),
      }),
      "resources/read": Te({
        ttlMs: E().int().min(0),
        cacheScope: U(["public", "private"]),
        contents: A(Ue([extend_6, extend_7])),
      }),
      "completion/complete": Te({
        completion: u({
          values: A(o()).max(100),
          total: E().int().optional(),
          hasMore: M().optional(),
        }).loose(),
      }),
      "server/discover": Te({
        ttlMs: E().int().min(0).catch(0),
        cacheScope: U(["public", "private"]).catch("private"),
        supportedVersions: A(o()),
        capabilities: zt,
        instructions: o().optional(),
      }),
      "subscriptions/listen": Te({}),
    },
    ft = kt({ "io.modelcontextprotocol/subscriptionId": a.optional() }),
    It = u({
      method: T("notifications/subscriptions/acknowledged"),
      params: u({ _meta: ft.optional(), notifications: qt }),
    }),
    Ot = u({ _meta: ft.optional(), requestId: a, reason: o().optional() }),
    Nt = u({ method: T("notifications/cancelled"), params: Ot }),
    Ea = {
      "notifications/cancelled": Nt,
      "notifications/progress": extend_3,
      "notifications/message": extend_5,
      "notifications/resources/updated": extend_10,
      "notifications/resources/list_changed": extend_8,
      "notifications/tools/list_changed": extend_13,
      "notifications/prompts/list_changed": extend_11,
      "notifications/subscriptions/acknowledged": It,
    },
    Ce = (fe) => u({ jsonrpc: T("2.0"), id: Ue([o(), E().int()]), result: fe }).strict();
  return {
    JSONValueSchema: e,
    JSONObjectSchema: t,
    ProgressTokenSchema: r,
    CursorSchema: s,
    RequestIdSchema: a,
    RoleSchema: n,
    LoggingLevelSchema: i,
    TaskMetadataSchema: c,
    RelatedTaskMetadataSchema: d,
    RequestMetaSchema: m,
    BaseRequestParamsSchema: _,
    TaskAugmentedRequestParamsSchema: extend,
    NotificationsParamsSchema: P,
    NotificationSchema: y,
    IconSchema: v,
    IconsSchema: p,
    BaseMetadataSchema: h,
    ImplementationSchema: extend_2,
    ClientTasksCapabilitySchema: C,
    ServerTasksCapabilitySchema: b,
    ClientCapabilitiesSchema: g,
    ServerCapabilitiesSchema: k,
    ProgressSchema: V,
    ProgressNotificationParamsSchema: H,
    ProgressNotificationSchema: extend_3,
    LoggingMessageNotificationParamsSchema: extend_4,
    LoggingMessageNotificationSchema: extend_5,
    ResourceContentsSchema: B,
    TextResourceContentsSchema: extend_6,
    BlobResourceContentsSchema: extend_7,
    AnnotationsSchema: ie,
    ResourceSchema: Se,
    ResourceTemplateSchema: ae,
    ResourceListChangedNotificationSchema: extend_8,
    ResourceUpdatedNotificationParamsSchema: extend_9,
    ResourceUpdatedNotificationSchema: extend_10,
    PromptArgumentSchema: z,
    PromptSchema: I,
    PromptListChangedNotificationSchema: extend_11,
    TextContentSchema: G,
    ImageContentSchema: Y,
    AudioContentSchema: re,
    ToolUseContentSchema: Q,
    EmbeddedResourceSchema: ce,
    ResourceLinkSchema: extend_12,
    ContentBlockSchema: q,
    PromptMessageSchema: D,
    ToolAnnotationsSchema: F,
    ToolListChangedNotificationSchema: extend_13,
    ModelHintSchema: Z,
    ModelPreferencesSchema: ee,
    ToolChoiceSchema: me,
    BooleanSchemaSchema: _e,
    StringSchemaSchema: Re,
    NumberSchemaSchema: ge,
    UntitledSingleSelectEnumSchemaSchema: ue,
    TitledSingleSelectEnumSchemaSchema: Oe,
    LegacyTitledEnumSchemaSchema: ye,
    SingleSelectEnumSchemaSchema: Ve,
    UntitledMultiSelectEnumSchemaSchema: je,
    TitledMultiSelectEnumSchemaSchema: xe,
    MultiSelectEnumSchemaSchema: We,
    EnumSchemaSchema: Ye,
    PrimitiveSchemaDefinitionSchema: it,
    ElicitRequestFormParamsSchema: extend_14,
    ResourceTemplateReferenceSchema: lt,
    PromptReferenceSchema: ut,
    RootSchema: Bt,
    ClientCapabilities2026Schema: Wt,
    ServerCapabilities2026Schema: zt,
    RequestMetaEnvelopeSchema: wt,
    ToolSchema: dt,
    ToolResultContentSchema: Yt,
    SamplingMessageContentBlockSchema: $t,
    SamplingMessageSchema: ht,
    ResultTypeSchema: Et,
    ResultMetaSchema: Pt,
    ResultSchema: Xt,
    PaginatedResultSchema: io,
    CallToolResultSchema: Ct,
    ListToolsResultSchema: Zt,
    ListPromptsResultSchema: Qt,
    GetPromptResultSchema: er,
    ListResourcesResultSchema: tr,
    ListResourceTemplatesResultSchema: rr,
    ReadResourceResultSchema: or,
    CompleteResultSchema: sr,
    CacheableResultSchema: co,
    DiscoverResultSchema: ar,
    CreateMessageRequestParamsSchema: Ze,
    CreateMessageRequestSchema: nr,
    ListRootsRequestSchema: ir,
    CreateMessageResultSchema: cr,
    ListRootsResultSchema: lr,
    ElicitResultSchema: ur,
    ElicitRequestURLParamsSchema: dr,
    ElicitRequestParamsSchema: hr,
    ElicitRequestSchema: mr,
    InputRequestSchema: pr,
    InputResponseSchema: fr,
    InputRequestsSchema: Sr,
    InputResponsesSchema: gr,
    InputRequiredResultSchema: mt,
    InputResponseRequestParamsSchema: lo,
    CallToolRequestSchema: ho,
    ListToolsRequestSchema: mo,
    ListPromptsRequestSchema: po,
    GetPromptRequestSchema: fo,
    ListResourcesRequestSchema: So,
    ListResourceTemplatesRequestSchema: go,
    ReadResourceRequestSchema: _o,
    CompleteRequestSchema: yo,
    DiscoverRequestSchema: vo,
    SubscriptionFilterSchema: qt,
    SubscriptionsListenRequestSchema: bo,
    SubscriptionsListenResultMetaSchema: extend_15,
    SubscriptionsListenResultSchema: zo,
    dispatchRequestSchemas: Qe,
    dispatchResultSchemas: wo,
    NotificationMetaSchema: ft,
    SubscriptionsAcknowledgedNotificationSchema: It,
    CancelledNotificationParamsSchema: Ot,
    CancelledNotificationSchema: Nt,
    notificationSchemas2026: Ea,
    JSONRPCResultResponseSchema: Ce(Xt),
    CallToolResultResponseSchema: Ce(Ue([Ct, mt])),
    ListToolsResultResponseSchema: Ce(Zt),
    ListPromptsResultResponseSchema: Ce(Qt),
    GetPromptResultResponseSchema: Ce(Ue([er, mt])),
    ListResourcesResultResponseSchema: Ce(tr),
    ListResourceTemplatesResultResponseSchema: Ce(rr),
    ReadResourceResultResponseSchema: Ce(Ue([or, mt])),
    CompleteResultResponseSchema: Ce(sr),
    DiscoverResultResponseSchema: Ce(ar),
  };
}
//@ chunk-r1g76qsy.js:59401-59408 esm-layout
var Wc;
//@ chunk-r1g76qsy.js:59408-59439 esm-layout
function vt() {
  return (Wc ??= Bc());
}
//@ chunk-r1g76qsy.js:59439-59555 esm-fingerprint
var Yc = [
  "tools/list",
  "prompts/list",
  "resources/list",
  "resources/templates/list",
  "resources/read",
  "server/discover",
];
//@ chunk-r1g76qsy.js:59555-59592 esm-layout
function Xc(e) {
  return Yc.includes(e);
}
//@ chunk-r1g76qsy.js:59592-59654 esm-fingerprint
var hn = Symbol("modelcontextprotocol.resultCacheHintFallback");
//@ chunk-r1g76qsy.js:59654-59682 esm-layout
function Zc(e) {
  return e[hn];
}
//@ chunk-r1g76qsy.js:59682-59755 esm-fingerprint
function ii(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0;
}
//@ chunk-r1g76qsy.js:59755-59805 esm-fingerprint
function ci(e) {
  return e === "public" || e === "private";
}
//@ chunk-r1g76qsy.js:59805-62666 esm-fingerprint
var ma = (function (e) {
    return (
      (e[(e.ParseError = -32700)] = "ParseError"),
      (e[(e.InvalidRequest = -32600)] = "InvalidRequest"),
      (e[(e.MethodNotFound = -32601)] = "MethodNotFound"),
      (e[(e.InvalidParams = -32602)] = "InvalidParams"),
      (e[(e.InternalError = -32603)] = "InternalError"),
      (e[(e.ResourceNotFound = -32002)] = "ResourceNotFound"),
      (e[(e.MissingRequiredClientCapability = -32021)] = "MissingRequiredClientCapability"),
      (e[(e.UnsupportedProtocolVersion = -32022)] = "UnsupportedProtocolVersion"),
      (e[(e.UrlElicitationRequired = -32042)] = "UrlElicitationRequired"),
      e
    );
  })({}),
  ProtocolError = class e extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.ProtocolError" });
    }
    static [Symbol.hasInstance](t) {
      return Ie(this, t);
    }
    static isInstance(t) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return Ie(this, t);
    }
    constructor(t, r, s) {
      super(r);
      ((this.code = t), (this.data = s), (this.name = "ProtocolError"), bt(this, new.target));
    }
    static fromError(t, r, s) {
      if (t === ma.UrlElicitationRequired && s) {
        let a = s;
        if (a.elicitations) return new ui(a.elicitations, r);
      }
      if (t === ma.UnsupportedProtocolVersion && s) {
        let a = s;
        if (Array.isArray(a.supported) && typeof a.requested === "string")
          return new ca({ supported: a.supported, requested: a.requested }, r);
      }
      if (t === ma.InvalidParams || t === ma.ResourceNotFound) {
        let a = s;
        if (typeof a?.uri === "string" && (t === ma.ResourceNotFound || Object.keys(a).length === 1))
          return new li(a.uri, r);
      }
      if (t === ma.MissingRequiredClientCapability && s) {
        let a = s;
        if (
          a.requiredCapabilities !== null &&
          typeof a.requiredCapabilities === "object" &&
          !Array.isArray(a.requiredCapabilities)
        )
          return new di({ requiredCapabilities: a.requiredCapabilities }, r);
      }
      return new e(t, r, s);
    }
  },
  li = class extends ProtocolError {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.ResourceNotFoundError" });
    }
    constructor(e, t = `Resource not found: ${e}`) {
      super(ma.InvalidParams, t, { uri: e });
    }
    get uri() {
      return this.data.uri;
    }
  },
  ui = class extends ProtocolError {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.UrlElicitationRequiredError" });
    }
    constructor(e, t = `URL elicitation${e.length > 1 ? "s" : ""} required`) {
      super(ma.UrlElicitationRequired, t, { elicitations: e });
    }
    get elicitations() {
      return this.data?.elicitations ?? [];
    }
  },
  ca = class extends ProtocolError {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.UnsupportedProtocolVersionError" });
    }
    constructor(e, t = `Unsupported protocol version: ${e.requested}`) {
      super(ma.UnsupportedProtocolVersion, t, e);
    }
    get supported() {
      return this.data.supported;
    }
    get requested() {
      return this.data.requested;
    }
  },
  di = class extends ProtocolError {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.MissingRequiredClientCapabilityError" });
    }
    constructor(
      e,
      t = `Missing required client capabilities: ${Object.keys(e.requiredCapabilities).join(", ")}`,
    ) {
      super(ma.MissingRequiredClientCapability, t, e);
    }
    get requiredCapabilities() {
      return this.data.requiredCapabilities;
    }
  },
  Qc = 0,
  PRIVATE = "private",
  tl = ["tools/call", "prompts/get", "resources/read"];
//@ chunk-r1g76qsy.js:62666-62967 esm-fingerprint
function rl(e, t) {
  let resultType = t.resultType;
  if (resultType === void 0) return { ...t, resultType: "complete" };
  if (resultType === "complete") return t;
  if (tl.includes(e)) return t;
  throw new ProtocolError(
    ma.InternalError,
    `Handler for ${e} returned resultType '${String(resultType)}', but results of ${e} only support 'complete' on protocol revision 2026-07-28`,
  );
}
//@ chunk-r1g76qsy.js:62967-63185 esm-fingerprint
function ol(e, t) {
  let r = Zc(t);
  if (t.resultType !== "complete" || !Xc(e)) return r === void 0 ? t : cl(t);
  let s = t,
    a = ii(s.ttlMs) ? s.ttlMs : nl(r),
    n = ci(s.cacheScope) ? s.cacheScope : il(r),
    i = { ...s, ttlMs: a, cacheScope: n };
  return (delete i[hn], i);
}
//@ chunk-r1g76qsy.js:63185-63256 esm-fingerprint
function sl(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:63256-63431 esm-layout
function al(e, t) {
  if (t === void 0) return e;
  let _meta = e._meta;
  if (_meta === void 0) return { ...e, _meta: { [IO_MODELCONTEXTPROTOCOL_SERVERINFO]: t } };
  if (!sl(_meta)) return e;
  if (_meta[IO_MODELCONTEXTPROTOCOL_SERVERINFO] !== void 0) return e;
  return { ...e, _meta: { ..._meta, [IO_MODELCONTEXTPROTOCOL_SERVERINFO]: t } };
}
//@ chunk-r1g76qsy.js:63431-63488 esm-fingerprint
function nl(e) {
  return e !== void 0 && ii(e.ttlMs) ? e.ttlMs : Qc;
}
//@ chunk-r1g76qsy.js:63488-63555 esm-fingerprint
function il(e) {
  return e !== void 0 && ci(e.cacheScope) ? e.cacheScope : PRIVATE;
}
//@ chunk-r1g76qsy.js:63555-63605 esm-layout
function cl(e) {
  let t = { ...e };
  return (delete t[hn], t);
}
//@ chunk-r1g76qsy.js:63605-63676 esm-fingerprint
var ll = ["elicitation/create", "sampling/createMessage", "roots/list"],
  sa;
//@ chunk-r1g76qsy.js:63676-64150 esm-fingerprint
function hi() {
  if (sa) return sa;
  let e = vt();
  return (
    (sa = {
      request: {
        "elicitation/create": u({ method: T("elicitation/create"), params: e.ElicitRequestParamsSchema }),
        "sampling/createMessage": u({
          method: T("sampling/createMessage"),
          params: e.CreateMessageRequestParamsSchema,
        }),
        "roots/list": u({ method: T("roots/list"), params: kt({}).optional() }),
      },
      response: {
        "elicitation/create": e.ElicitResultSchema,
        "sampling/createMessage": e.CreateMessageResultSchema,
        "roots/list": e.ListRootsResultSchema,
      },
    }),
    sa
  );
}
//@ chunk-r1g76qsy.js:64150-64187 esm-layout
function mi(e) {
  return ll.includes(e);
}
//@ chunk-r1g76qsy.js:64187-64238 esm-fingerprint
function Za(e) {
  return mi(e) ? hi().request[e] : void 0;
}
//@ chunk-r1g76qsy.js:64238-64290 esm-fingerprint
function ul(e) {
  return mi(e) ? hi().response[e] : void 0;
}
//@ chunk-r1g76qsy.js:64290-64836 esm-fingerprint
var mn = {
    "tools/call": null,
    "tools/list": null,
    "prompts/get": null,
    "prompts/list": null,
    "resources/list": null,
    "resources/templates/list": null,
    "resources/read": null,
    "completion/complete": null,
    "server/discover": null,
    "subscriptions/listen": null,
  },
  pi = {
    "notifications/cancelled": null,
    "notifications/progress": null,
    "notifications/message": null,
    "notifications/resources/updated": null,
    "notifications/resources/list_changed": null,
    "notifications/tools/list_changed": null,
    "notifications/prompts/list_changed": null,
    "notifications/subscriptions/acknowledged": null,
  };
//@ chunk-r1g76qsy.js:64836-64901 esm-fingerprint
function fi(e) {
  return Object.prototype.hasOwnProperty.call(mn, e);
}
//@ chunk-r1g76qsy.js:64901-64966 esm-fingerprint
function Si(e) {
  return Object.prototype.hasOwnProperty.call(pi, e);
}
//@ chunk-r1g76qsy.js:64966-65031 esm-fingerprint
function dl(e) {
  return Object.prototype.hasOwnProperty.call(mn, e);
}
//@ chunk-r1g76qsy.js:65031-65097 esm-fingerprint
function hl(e) {
  return fi(e) ? vt().dispatchRequestSchemas[e] : void 0;
}
//@ chunk-r1g76qsy.js:65097-65162 esm-fingerprint
function ml(e) {
  return dl(e) ? vt().dispatchResultSchemas[e] : void 0;
}
//@ chunk-r1g76qsy.js:65162-65229 esm-fingerprint
function pl(e) {
  return Si(e) ? vt().notificationSchemas2026[e] : void 0;
}
//@ chunk-r1g76qsy.js:65229-65271 esm-layout
var keys_3 = Object.keys(mn),
  keys_4 = Object.keys(pi);
//@ chunk-r1g76qsy.js:65271-65342 esm-fingerprint
function Zr(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:65342-65515 esm-fingerprint
function Yr(e, t) {
  if (e === void 0) return { ok: !1, reason: "not-in-era" };
  let safeParse = e.safeParse(t);
  return safeParse.success
    ? { ok: !0, value: safeParse.data }
    : { ok: !1, reason: "invalid", message: String(safeParse.error) };
}
//@ chunk-r1g76qsy.js:65515-65562 esm-fingerprint
var fl = { ok: !1, reason: "not-in-era" },
  Sl = [IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION, IHe];
//@ chunk-r1g76qsy.js:65562-65920 esm-fingerprint
function gl(e, t) {
  let r = t,
    s = !1,
    a = () => {
      if (!s) ((r = { ...r }), (s = !0));
      return r;
    },
    tools = t.tools;
  if (e === "tools/list" && Array.isArray(tools) && tools.some((l) => Zr(l) && "execution" in l))
    a().tools = tools.map((l) => {
      if (!Zr(l) || !("execution" in l)) return l;
      let c = { ...l };
      return (delete c.execution, c);
    });
  let capabilities = t.capabilities;
  if (Zr(capabilities) && "tasks" in capabilities) {
    let l = { ...capabilities };
    (delete l.tasks, (a().capabilities = l));
  }
  return r;
}
//@ chunk-r1g76qsy.js:66033-66355 esm-layout
function vl(e) {
  if (e === null || typeof e !== "object" || Array.isArray(e)) return !1;
  return (
    typeof e.taskId === "string" &&
    e.taskId.length > 0 &&
    yl.has(e.status) &&
    typeof e.createdAt === "string" &&
    typeof e.lastUpdatedAt === "string" &&
    (e.ttlMs === null || typeof e.ttlMs === "number") &&
    (e.pollIntervalMs === void 0 || typeof e.pollIntervalMs === "number")
  );
}
//@ chunk-r1g76qsy.js:66355-69307 esm-fingerprint
var pn = {
    era: "2026-07-28",
    hasRequestMethod: fi,
    hasNotificationMethod: Si,
    hasInputRequestMethod: (e) => Za(e) !== void 0,
    validateRequest: (e, t) => Yr(hl(e), t),
    validateResult: (e, t) => Yr(ml(e), t),
    validateNotification: (e, t) => Yr(pl(e), t),
    validateInputRequest: (e, t) => Yr(Za(e), t),
    validateInputResponse: (e, t) => Yr(ul(e), t),
    samplingResultVariant: () => fl,
    outboundEnvelope(e) {
      return {
        [IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION]: e.protocolVersion,
        [IO_MODELCONTEXTPROTOCOL_CLIENTINFO]: e.clientInfo,
        [IHe]: e.clientCapabilities,
        ...(e.logLevel !== void 0 && { [IO_MODELCONTEXTPROTOCOL_LOGLEVEL]: e.logLevel }),
      };
    },
    validateEnvelopeMeta(e) {
      let t = [];
      for (let s of Sl) if (!(s in e)) t.push({ key: s, problem: "missing" });
      let safeParse = vt().RequestMetaEnvelopeSchema.safeParse(e);
      if (!safeParse.success)
        for (let issue of safeParse.error.issues) {
          let mapped = issue.path.map(String),
            n = mapped.length > 0 ? mapped.join(".") : "_meta";
          if (mapped.length === 1 && t.some((i) => i.key === n && i.problem === "missing")) continue;
          t.push({ key: n, problem: issue.message });
        }
      return t;
    },
    projectCallToolResult: (e) => Qn(e),
    inputRequestSchema: Za,
    decodeResult(e, t, r) {
      if (!Zr(t))
        return {
          kind: "invalid",
          error: new SdkError(Ti.InvalidResult, `Invalid result for ${e}: not an object`, { method: e }),
        };
      let resultType = t.resultType;
      if (resultType === void 0)
        return {
          kind: "invalid",
          error: new SdkError(
            Ti.InvalidResult,
            `Invalid result for ${e}: missing required resultType \u2014 servers implementing protocol revision 2026-07-28 MUST include it (the absent-means-complete bridge applies only to earlier-revision servers)`,
            { method: e, violation: "missing-resultType" },
          ),
        };
      if (typeof resultType !== "string")
        return {
          kind: "invalid",
          error: new SdkError(Ti.InvalidResult, `Invalid result for ${e}: non-string resultType`, {
            method: e,
            resultType: resultType,
          }),
        };
      if (resultType === "input_required") {
        let inputRequests = t.inputRequests,
          c = Zr(inputRequests) ? inputRequests : {},
          requestState = t.requestState;
        if (Object.keys(c).length === 0 && typeof requestState !== "string")
          return {
            kind: "invalid",
            error: new SdkError(
              Ti.InvalidResult,
              `Invalid result for ${e}: input_required carries neither inputRequests nor requestState (every input_required result must include at least one of the two)`,
              { method: e, violation: "input-required-missing-both" },
            ),
          };
        return {
          kind: "input_required",
          inputRequests: c,
          ...(typeof requestState === "string" && { requestState: requestState }),
        };
      }
      if (resultType === "task") return { kind: "task", result: t };
      if (resultType !== "complete")
        return {
          kind: "invalid",
          error: new SdkError(Ti.UnsupportedResultType, `Unsupported result type '${resultType}' for ${e}`, {
            resultType: resultType,
            method: e,
          }),
        };
      let a = bl(),
        n = Object.hasOwn(a, e) ? a[e] : void 0;
      if (n !== void 0 && r !== !0) {
        let safeParse = n.safeParse(t);
        if (!safeParse.success)
          return {
            kind: "invalid",
            error: new SdkError(Ti.InvalidResult, `Invalid result for ${e}: ${safeParse.error}`, {
              method: e,
            }),
          };
      }
      let i = { ...t };
      return (delete i.resultType, { kind: "complete", result: i });
    },
    encodeResult(e, t, r) {
      return al(ol(e, rl(e, gl(e, t))), r);
    },
    encodeErrorCode: (e) => (e === -32002 ? -32602 : e),
    checkInboundEnvelope(e) {
      if (e.envelope === void 0)
        return "Request is missing the required _meta envelope for protocol revision 2026-07-28 (io.modelcontextprotocol/protocolVersion, io.modelcontextprotocol/clientCapabilities)";
      let safeParse = vt().RequestMetaEnvelopeSchema.safeParse(e.envelope);
      if (!safeParse.success)
        return `Invalid _meta envelope for protocol revision 2026-07-28: ${safeParse.error.issues.map((issue) => issue.message).join("; ")}`;
    },
  },
  aa;
//@ chunk-r1g76qsy.js:69307-69753 esm-fingerprint
function bl() {
  if (aa) return aa;
  let e = vt();
  return (
    (aa = {
      "tools/call": e.CallToolResultSchema,
      "tools/list": e.ListToolsResultSchema,
      "prompts/get": e.GetPromptResultSchema,
      "prompts/list": e.ListPromptsResultSchema,
      "resources/list": e.ListResourcesResultSchema,
      "resources/templates/list": e.ListResourceTemplatesResultSchema,
      "resources/read": e.ReadResourceResultSchema,
      "completion/complete": e.CompleteResultSchema,
      "server/discover": e.DiscoverResultSchema,
    }),
    aa
  );
}
//@ chunk-r1g76qsy.js:69753-69773 esm-fingerprint
var la = "2026-07-28";
//@ chunk-r1g76qsy.js:69773-69819 esm-layout
function Ge(e) {
  return e !== void 0 && Be(e) ? pn : dn;
}
//@ chunk-r1g76qsy.js:69819-69921 esm-fingerprint
function Fn(e) {
  if (e.revision !== void 0) return Ge(e.revision).era;
  return e.era === "modern" ? pn.era : dn.era;
}
//@ chunk-r1g76qsy.js:69921-69979 esm-fingerprint
function Qa(e) {
  return gi.some((t) => t.hasRequestMethod(e));
}
//@ chunk-r1g76qsy.js:69979-70042 esm-fingerprint
function en(e) {
  return gi.some((t) => t.hasNotificationMethod(e));
}
//@ chunk-r1g76qsy.js:70042-75375 esm-layout
var gi = [dn, pn],
  Rl = qn({
    AnnotationsSchema: () => Je,
    AudioContentSchema: () => xt,
    BaseMetadataSchema: () => Fe,
    BaseRequestParamsSchema: () => be,
    BlobResourceContentsSchema: () => extend_17,
    BooleanSchemaSchema: () => Vr,
    CallToolRequestParamsSchema: () => extend_46,
    CallToolRequestSchema: () => extend_47,
    CallToolResultSchema: () => extend_45,
    CancelTaskRequestSchema: () => extend_75,
    CancelTaskResultSchema: () => merge_3,
    CancelledNotificationParamsSchema: () => extend_2,
    CancelledNotificationSchema: () => extend_3,
    ClientCapabilitiesSchema: () => No,
    ClientNotificationSchema: () => Ha,
    ClientRequestSchema: () => Fa,
    ClientResultSchema: () => Ja,
    ClientTasksCapabilitySchema: () => Io,
    CompatibilityCallToolResultSchema: () => or,
    CompleteRequestParamsSchema: () => extend_63,
    CompleteRequestSchema: () => extend_64,
    CompleteResultSchema: () => extend_65,
    ContentBlockSchema: () => Ft,
    CreateMessageRequestParamsSchema: () => extend_53,
    CreateMessageRequestSchema: () => extend_54,
    CreateMessageResultSchema: () => extend_55,
    CreateMessageResultWithToolsSchema: () => extend_56,
    CreateTaskResultSchema: () => extend_69,
    CursorSchema: () => zr,
    DiscoverRequestSchema: () => extend_9,
    DiscoverResultSchema: () => extend_10,
    ElicitRequestFormParamsSchema: () => extend_57,
    ElicitRequestParamsSchema: () => Fdn,
    ElicitRequestSchema: () => extend_59,
    ElicitRequestURLParamsSchema: () => extend_58,
    ElicitResultSchema: () => extend_62,
    ElicitationCompleteNotificationParamsSchema: () => extend_60,
    ElicitationCompleteNotificationSchema: () => extend_61,
    EmbeddedResourceSchema: () => ls,
    EmptyResultSchema: () => strict_5,
    EnumSchemaSchema: () => js,
    GetPromptRequestParamsSchema: () => extend_38,
    GetPromptRequestSchema: () => extend_39,
    GetPromptResultSchema: () => extend_41,
    GetTaskPayloadRequestSchema: () => extend_72,
    GetTaskPayloadResultSchema: () => loose,
    GetTaskRequestSchema: () => extend_71,
    GetTaskResultSchema: () => merge_2,
    IconSchema: () => qo,
    IconsSchema: () => rt,
    ImageContentSchema: () => Vt,
    ImplementationSchema: () => extend_4,
    InitializeRequestParamsSchema: () => extend_5,
    InitializeRequestSchema: () => extend_6,
    InitializeResultSchema: () => extend_7,
    InitializedNotificationSchema: () => extend_8,
    JSONArraySchema: () => Ta,
    JSONObjectSchema: () => de,
    JSONRPCErrorResponseSchema: () => strict_4,
    JSONRPCMessageSchema: () => fZe,
    JSONRPCNotificationSchema: () => strict_2,
    JSONRPCRequestSchema: () => strict,
    JSONRPCResponseSchema: () => Ca,
    JSONRPCResultResponseSchema: () => strict_3,
    JSONValueSchema: () => et,
    LegacyTitledEnumSchemaSchema: () => Hr,
    ListChangedOptionsBaseSchema: () => Ur,
    ListPromptsRequestSchema: () => extend_36,
    ListPromptsResultSchema: () => extend_37,
    ListResourceTemplatesRequestSchema: () => extend_20,
    ListResourceTemplatesResultSchema: () => extend_21,
    ListResourcesRequestSchema: () => extend_18,
    ListResourcesResultSchema: () => extend_19,
    ListRootsRequestSchema: () => extend_66,
    ListRootsResultSchema: () => extend_67,
    ListTasksRequestSchema: () => extend_73,
    ListTasksResultSchema: () => extend_74,
    ListToolsRequestSchema: () => extend_43,
    ListToolsResultSchema: () => extend_44,
    LoggingLevelSchema: () => Dr,
    LoggingMessageNotificationParamsSchema: () => extend_51,
    LoggingMessageNotificationSchema: () => extend_52,
    ModelHintSchema: () => ws,
    ModelPreferencesSchema: () => $s,
    MultiSelectEnumSchemaSchema: () => Ms,
    NotificationSchema: () => Ee,
    NotificationsParamsSchema: () => $e,
    NumberSchemaSchema: () => Kt,
    PaginatedRequestParamsSchema: () => extend_13,
    PaginatedRequestSchema: () => extend_14,
    PaginatedResultSchema: () => extend_15,
    PingRequestSchema: () => extend_11,
    PrimitiveSchemaDefinitionSchema: () => Gr,
    ProgressNotificationParamsSchema: () => Lo,
    ProgressNotificationSchema: () => extend_12,
    ProgressSchema: () => Ao,
    ProgressTokenSchema: () => Rr,
    PromptArgumentSchema: () => ss,
    PromptListChangedNotificationSchema: () => extend_42,
    PromptMessageSchema: () => ds,
    PromptReferenceSchema: () => xs,
    PromptSchema: () => Hdn,
    ReadResourceRequestParamsSchema: () => xo,
    ReadResourceRequestSchema: () => extend_23,
    ReadResourceResultSchema: () => extend_24,
    RelatedTaskMetadataSchema: () => Mdn,
    RequestIdSchema: () => tt,
    RequestMetaSchema: () => wr,
    RequestSchema: () => he,
    ResourceContentsSchema: () => Nr,
    ResourceLinkSchema: () => extend_40,
    ResourceListChangedNotificationSchema: () => extend_25,
    ResourceRequestParamsSchema: () => extend_22,
    ResourceSchema: () => CBt,
    ResourceTemplateReferenceSchema: () => Vs,
    ResourceTemplateSchema: () => Ddn,
    ResourceUpdatedNotificationParamsSchema: () => extend_34,
    ResourceUpdatedNotificationSchema: () => extend_35,
    ResultMetaObjectSchema: () => $r,
    ResultSchema: () => vM,
    RoleSchema: () => at,
    RootSchema: () => Js,
    RootsListChangedNotificationSchema: () => extend_68,
    SamplingContentSchema: () => Ts,
    SamplingMessageContentBlockSchema: () => gt,
    SamplingMessageSchema: () => Cs,
    ServerCapabilitiesSchema: () => ABt,
    ServerNotificationSchema: () => Ba,
    ServerRequestSchema: () => Ga,
    ServerResultSchema: () => Wa,
    ServerTasksCapabilitySchema: () => Oo,
    SetLevelRequestParamsSchema: () => extend_49,
    SetLevelRequestSchema: () => extend_50,
    SingleSelectEnumSchemaSchema: () => Ns,
    StringSchemaSchema: () => Ht,
    SubscribeRequestParamsSchema: () => Jo,
    SubscribeRequestSchema: () => extend_26,
    SubscriptionFilterSchema: () => Ar,
    SubscriptionsAcknowledgedNotificationParamsSchema: () => extend_30,
    SubscriptionsAcknowledgedNotificationSchema: () => extend_31,
    SubscriptionsListenRequestParamsSchema: () => extend_28,
    SubscriptionsListenRequestSchema: () => extend_29,
    SubscriptionsListenResultMetaSchema: () => extend_32,
    SubscriptionsListenResultSchema: () => extend_33,
    TaskAugmentedRequestParamsSchema: () => extend,
    TaskCreationParamsSchema: () => qa,
    TaskMetadataSchema: () => Po,
    TaskSchema: () => nt,
    TaskStatusNotificationParamsSchema: () => merge,
    TaskStatusNotificationSchema: () => extend_70,
    TaskStatusSchema: () => Ys,
    TextContentSchema: () => Dt,
    TextResourceContentsSchema: () => extend_16,
    TitledMultiSelectEnumSchemaSchema: () => Jr,
    TitledSingleSelectEnumSchemaSchema: () => Fr,
    ToolAnnotationsSchema: () => ps,
    ToolChoiceSchema: () => Es,
    ToolExecutionSchema: () => fs,
    ToolListChangedNotificationSchema: () => extend_48,
    ToolResultContentSchema: () => Ps,
    ToolSchema: () => RBt,
    ToolUseContentSchema: () => cs,
    UnsubscribeRequestParamsSchema: () => Bo,
    UnsubscribeRequestSchema: () => extend_27,
    UntitledMultiSelectEnumSchemaSchema: () => Kr,
    UntitledSingleSelectEnumSchemaSchema: () => xr,
  });
//@ chunk-r1g76qsy.js:75375-75459 layout
function Rt(e) {
  if (e?.method === void 0 && GAe(e)) return strict_3.parse(e);
  return fZe.parse(e);
}
//@ chunk-r1g76qsy.js:75459-75530 layout
function Me(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:75530-75597 layout
function ua(e) {
  return typeof e === "string" || Number.isSafeInteger(e);
}
//@ chunk-r1g76qsy.js:75597-75683 layout
function da(e, t, r, s, a) {
  for (let key in e) if (key !== t && key !== r && key !== s && key !== a) return !1;
  return !0;
}
//@ chunk-r1g76qsy.js:75683-75956 layout
function _i(e) {
  if (e === void 0) return !0;
  if (!Me(e)) return !1;
  let _meta = e._meta;
  if (_meta === void 0) return !0;
  if (!Me(_meta)) return !1;
  if (_meta.progressToken !== void 0 && !ua(_meta.progressToken)) return !1;
  let r = _meta["io.modelcontextprotocol/related-task"];
  return r === void 0 || (Me(r) && typeof r.taskId === "string");
}
//@ chunk-r1g76qsy.js:75956-76507 layout
var fZ = (e) =>
    Me(e) &&
    e.jsonrpc === "2.0" &&
    ua(e.id) &&
    typeof e.method === "string" &&
    _i(e.params) &&
    da(e, "jsonrpc", "id", "method", "params"),
  VNr = (e) =>
    Me(e) &&
    e.jsonrpc === "2.0" &&
    typeof e.method === "string" &&
    _i(e.params) &&
    da(e, "jsonrpc", "method", "params"),
  GAe = (e) =>
    Me(e) &&
    e.jsonrpc === "2.0" &&
    ua(e.id) &&
    Me(e.result) &&
    (e.result._meta === void 0 || Me(e.result._meta)) &&
    da(e, "jsonrpc", "id", "result"),
  zAe = (e) =>
    Me(e) &&
    e.jsonrpc === "2.0" &&
    (e.id === void 0 || ua(e.id)) &&
    Me(e.error) &&
    Number.isSafeInteger(e.error.code) &&
    typeof e.error.message === "string" &&
    da(e, "jsonrpc", "id", "error");
//@ chunk-r1g76qsy.js:76507-76601 esm-fingerprint
var yi = (e) => typeof e === "object" && e !== null && !Array.isArray(e) && e.resultType === "input_required";
//@ chunk-r1g76qsy.js:76601-76750 esm-layout
var lYn = (e) => Me(e) && e.method === "initialize" && extend_6.safeParse(e).success,
  qNr = (e) => Me(e) && e.method === "notifications/initialized" && extend_8.safeParse(e).success;
//@ chunk-r1g76qsy.js:76750-76876 esm-fingerprint
var MCP_PARAM = "Mcp-Param-",
  X_MCP_HEADER = "x-mcp-header",
  wl = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/,
  $l = new Set(["string", "integer", "boolean", "number"]);
//@ chunk-r1g76qsy.js:76876-78243 esm-fingerprint
function fn(e) {
  let t = [],
    r = new Map(),
    s = (n, i, l) => {
      if (n === null || typeof n !== "object") return;
      let c = n;
      if (X_MCP_HEADER in c) {
        if (!l || i.length === 0)
          return `${na(i)}: x-mcp-header is only permitted on properties statically reachable via a chain of 'properties' keys (not under items, additionalProperties, oneOf/anyOf/allOf/not, if/then/else, or $ref)`;
        let m = c[X_MCP_HEADER];
        if (typeof m !== "string" || m.length === 0)
          return `${na(i)}: x-mcp-header MUST be a non-empty string`;
        if (!wl.test(m))
          return `${na(i)}: x-mcp-header '${m}' is not a valid RFC 9110 token (no spaces, control characters or HTTP delimiters)`;
        let _ = typeof c.type === "string" ? c.type : void 0;
        if (_ === void 0 || !$l.has(_))
          return `${na(i)}: x-mcp-header is only permitted on primitive-typed properties (string, integer, boolean); got ${_ ?? "<none>"}`;
        let lower = m.toLowerCase(),
          P = r.get(lower);
        if (P !== void 0)
          return `x-mcp-header '${m}' is not case-insensitively unique (also declared as '${P}')`;
        (r.set(lower, m), t.push({ path: i, headerName: m, type: _ }));
      }
      let properties = c.properties;
      if (properties !== null && typeof properties === "object")
        for (let [m, _] of Object.entries(properties)) {
          let w = s(_, [...i, m], l);
          if (w !== void 0) return w;
        }
      for (let m of El) {
        let _ = c[m];
        if (_ === void 0) continue;
        let w = Array.isArray(_)
          ? _
          : _ !== null && typeof _ === "object" && Pl.has(m)
            ? Object.values(_)
            : [_];
        for (let P of w) {
          let y = s(P, [...i, `<${m}>`], !1);
          if (y !== void 0) return y;
        }
      }
    },
    a = s(e, [], !0);
  return a === void 0 ? { valid: !0, declarations: t } : { valid: !1, reason: a };
}
//@ chunk-r1g76qsy.js:78243-78552 esm-fingerprint
var El = [
    "items",
    "prefixItems",
    "contains",
    "additionalProperties",
    "unevaluatedProperties",
    "unevaluatedItems",
    "propertyNames",
    "patternProperties",
    "dependentSchemas",
    "oneOf",
    "anyOf",
    "allOf",
    "not",
    "if",
    "then",
    "else",
    "$defs",
    "definitions",
  ],
  Pl = new Set(["patternProperties", "dependentSchemas", "$defs", "definitions"]);
//@ chunk-r1g76qsy.js:78552-78608 esm-fingerprint
function na(e) {
  return e.length === 0 ? "<root>" : e.join(".");
}
//@ chunk-r1g76qsy.js:78608-78635 esm-fingerprint
var vi = "=?base64?",
  bi = "?=";
//@ chunk-r1g76qsy.js:78635-78858 esm-fingerprint
function Tl(e) {
  if (typeof e === "string") return e;
  if (typeof e === "boolean") return e ? "true" : "false";
  if (typeof e === "number") {
    if (!Number.isFinite(e)) return;
    if (Number.isInteger(e) && !Number.isSafeInteger(e)) return;
    return String(e);
  }
}
//@ chunk-r1g76qsy.js:78858-79070 esm-fingerprint
function Cl(e) {
  if (e.length === 0) return !0;
  if (e.startsWith(vi) && e.endsWith(bi)) return !0;
  if (e !== e.trim()) return !0;
  for (let t = 0; t < e.length; t++) {
    let codePoint = e.codePointAt(t);
    if (codePoint === 9 || (codePoint >= 32 && codePoint <= 126)) continue;
    return !0;
  }
  return !1;
}
//@ chunk-r1g76qsy.js:79070-79181 esm-fingerprint
function kl(e) {
  let encode = new TextEncoder().encode(e),
    r = "";
  for (let s of encode) r += String.fromCodePoint(s);
  return btoa(r);
}
//@ chunk-r1g76qsy.js:79181-79232 esm-layout
function ha(e) {
  return Cl(e) ? `${vi}${kl(e)}${bi}` : e;
}
//@ chunk-r1g76qsy.js:79232-79329 esm-layout
function ql(e, t) {
  let r = e;
  for (let s of t) {
    if (r === null || typeof r !== "object") return;
    r = r[s];
  }
  return r;
}
//@ chunk-r1g76qsy.js:79329-79499 esm-fingerprint
function Ri(e, t) {
  let r = {};
  for (let s of e) {
    let a = ql(t, s.path);
    if (a === void 0 || a === null) continue;
    let n = Tl(a);
    if (n === void 0) continue;
    r[`${MCP_PARAM}${s.headerName}`] = ha(n);
  }
  return r;
}
//@ chunk-r1g76qsy.js:79499-84495 esm-fingerprint
var Gt = -32020,
  Mh = [
    {
      rung: "http-method",
      order: 1,
      evaluatedAt: "edge",
      codes: [-32000],
      conformance: [],
      rationale:
        "The modern era is POST-only; GET/DELETE are body-less 2025-era session operations and are method-routed to legacy serving (405 when legacy serving is not configured), before any body is read.",
    },
    {
      rung: "jsonrpc-shape",
      order: 2,
      evaluatedAt: "edge",
      codes: [ma.InvalidRequest],
      conformance: ["server-stateless"],
      rationale:
        "The body must be a JSON-RPC request or notification: posted responses and batch arrays containing a modern or invalid element are rejected before classification (element-wise batch rule); all-legacy arrays stay legacy traffic.",
    },
    {
      rung: "era-classification",
      order: 3,
      evaluatedAt: "edge",
      codes: [Gt, ma.UnsupportedProtocolVersion],
      conformance: ["server-stateless", "http-header-validation", "http-custom-header-server-validation"],
      rationale:
        "Body-primary era classification with the protocol-version header as a cross-check; a header/body disagreement is rejected with -32020 (HeaderMismatch), and an envelope-less request on a modern-only endpoint is answered with the unsupported-protocol-version error naming the supported revisions.",
    },
    {
      rung: "envelope",
      order: 4,
      evaluatedAt: "edge",
      codes: [ma.InvalidParams],
      conformance: ["server-stateless"],
      rationale:
        "A present envelope claim with a malformed envelope \u2014 and a missing envelope on a request whose protocol-version header names a modern revision \u2014 is an invalid-params rejection naming the offending or missing key(s); never a silent fall back to legacy handling. This is the only place an invalid-params rejection maps to HTTP 400.",
    },
    {
      rung: "method-registry",
      order: 5,
      evaluatedAt: "dispatch",
      codes: [ma.MethodNotFound],
      conformance: ["server-stateless"],
      rationale:
        "Method existence outranks parameter validity: a method absent from the negotiated revision\u2019s registry (or with no handler installed) answers method-not-found before params or capabilities are looked at.",
    },
    {
      rung: "request-params",
      order: 6,
      evaluatedAt: "dispatch",
      codes: [ma.InvalidParams],
      conformance: [],
      rationale:
        "Per-method params validation; emitted in-band by the dispatch layer (HTTP 200), never via the ladder status table.",
    },
    {
      rung: "standard-header-validation",
      order: 7,
      evaluatedAt: "pre-dispatch",
      codes: [Gt],
      conformance: ["http-header-validation"],
      rationale:
        "SEP-2243 standard `Mcp-Method` / `Mcp-Name` headers \u2014 presence, sentinel decoding, and `Mcp-Name` \u2194 body cross-check \u2014 are validated by the HTTP entry on a modern-classified request after the supported-revision gate and before dispatch. The classifier\u2019s own header-mismatch cells (protocol-version, `Mcp-Method` mismatch) stay on the edge `era-classification` rung; this rung carries the entry-layer presence/`Mcp-Name` half. Evaluated before the capability gate, the factory call, and the `Mcp-Param-*` rung so a request that fails several rungs is answered by the standard-header rung first. The documented order (after method-registry 5 and request-params 6) is NOT the observed precedence: serveModern evaluates this rung immediately after the supported-revision gate, so a request that also fails a dispatch rung is answered here before the dispatch rungs (5\u20136) are consulted.",
    },
    {
      rung: "client-capabilities",
      order: 8,
      evaluatedAt: "pre-dispatch",
      codes: [ma.MissingRequiredClientCapability],
      conformance: ["server-stateless"],
      rationale:
        "The capability requirement is checked by the HTTP entry, pre-dispatch, against the validated envelope the classifier produced \u2014 pinning the spec-mandated HTTP 400 independently of how dispatch- and handler-produced errors are mapped. The documented order (after method resolution and params validation) is preserved observably only while the requirement table is empty: once a served method gains a requirement entry, a request that is missing the capability and would also fail a dispatch rung is answered by this gate first, so the entry must consult the method registry before the gate if the documented precedence is to stay observable.",
    },
    {
      rung: "param-header-validation",
      order: 9,
      evaluatedAt: "pre-dispatch",
      codes: [Gt],
      conformance: ["http-custom-header-server-validation"],
      rationale:
        "SEP-2243 `Mcp-Param-*` headers are validated against the named tool\u2019s `x-mcp-header` declarations and the body `arguments` after the tool registry is known and before dispatch reaches the handler; a missing/disagreeing/malformed header is rejected 400 / -32020 with the same shape as the standard-header cross-checks. The documented order (after method resolution and params validation) is preserved observably only when the body `arguments` would otherwise validate: the check runs pre-dispatch, so a `tools/call` that fails BOTH this rung and a dispatch-time rung (e.g. order-6 `request-params`, -32602) is answered by this gate first with 400 / -32020, not by the earlier-ordered rung.",
    },
  ],
  jh = {
    [ma.ParseError]: 400,
    [ma.InvalidRequest]: 400,
    [ma.MethodNotFound]: 404,
    [ma.UnsupportedProtocolVersion]: 400,
    [ma.MissingRequiredClientCapability]: 400,
    [Gt]: 400,
  };
//@ chunk-r1g76qsy.js:84495-84528 esm-layout
function pa(e, t) {
  return slo(e, t);
}
//@ chunk-r1g76qsy.js:84528-84596 esm-fingerprint
function Xr(e) {
  return new Set(e.flatMap((t) => Object.keys(t.shape)));
}
//@ chunk-r1g76qsy.js:84596-84770 esm-fingerprint
function sn(e) {
  if (e == null) return !1;
  let t = typeof e;
  if (t !== "object" && t !== "function") return !1;
  if (!("~standard" in e)) return !1;
  return typeof e["~standard"]?.validate === "function";
}
//@ chunk-r1g76qsy.js:84770-84799 esm-layout
var Kn = !1,
  DRAFT_2020_12 = "draft-2020-12";
//@ chunk-r1g76qsy.js:84799-85828 esm-fingerprint
function Il(e, t = "input") {
  let r = e["~standard"],
    s;
  if (r.jsonSchema) s = r.jsonSchema[t]({ target: DRAFT_2020_12 });
  else if (r.vendor === "zod") {
    if (!("_zod" in e))
      throw Error(
        "Schema appears to be from zod 3, which the SDK cannot convert to JSON Schema. Upgrade to zod >=4.2.0, or wrap your JSON Schema with fromJsonSchema().",
      );
    if (!Kn)
      ((Kn = !0),
        console.warn(
          "[mcp-sdk] Your zod version does not implement `~standard.jsonSchema` (added in zod 4.2.0). Falling back to z.toJSONSchema(). Upgrade to zod >=4.2.0 to silence this warning.",
        ));
    s = nut(e, { target: DRAFT_2020_12, io: t });
  } else
    throw Error(
      `Schema library "${r.vendor}" does not implement StandardJSONSchemaV1 (\`~standard.jsonSchema\`). Upgrade to a version that does, or wrap your JSON Schema with fromJsonSchema().`,
    );
  if (t === "output") {
    if (s.type !== void 0) return s;
    return zi(s) ? { type: "object", ...s } : s;
  }
  if (s.type !== void 0 && s.type !== "object")
    throw Error(
      `MCP tool and prompt schemas must describe objects (got type: ${JSON.stringify(s.type)}). Wrap your schema in z.object({...}) or equivalent.`,
    );
  return { type: "object", ...s };
}
//@ chunk-r1g76qsy.js:85828-86111 esm-fingerprint
function zi(e) {
  if ("properties" in e || "patternProperties" in e || "additionalProperties" in e || "required" in e)
    return !0;
  for (let t of ["oneOf", "anyOf", "allOf"]) {
    let r = e[t];
    if (Array.isArray(r) && r.length > 0)
      return r.every((s) => s !== null && typeof s === "object" && (s.type === "object" || zi(s)));
  }
  return !1;
}
//@ chunk-r1g76qsy.js:86111-86250 esm-fingerprint
function Ol(e) {
  if (!e.path?.length) return e.message;
  return `${e.path.map((t) => String(typeof t === "object" ? t.key : t)).join(".")}: ${e.message}`;
}
//@ chunk-r1g76qsy.js:86250-86436 esm-fingerprint
async function tn(e, t) {
  let validate = await e["~standard"].validate(t);
  if (validate.issues && validate.issues.length > 0)
    return { success: !1, error: validate.issues.map((issue) => Ol(issue)).join(", ") };
  return { success: !0, data: validate.value };
}
//@ chunk-r1g76qsy.js:86436-86539 esm-fingerprint
function Nl(e) {
  let t = nut(e, { target: DRAFT_2020_12, io: "input" });
  return typeof t.pattern === "string" ? t.pattern : void 0;
}
//@ chunk-r1g76qsy.js:86539-86565 esm-fingerprint
var Ml = /\\\.\\d\{(\d+)\}/;
//@ chunk-r1g76qsy.js:86565-86736 esm-fingerprint
function jl(e) {
  let match = Ml.exec(e),
    r = [void 0, -1, 0];
  if (match) r.push(Number(match[1]));
  return [!1, !0].flatMap((s) =>
    [!1, !0].flatMap((a) => r.map((n) => t0({ local: s, offset: a, precision: n }))),
  );
}
//@ chunk-r1g76qsy.js:86736-86938 esm-fingerprint
function Al(e, t) {
  let r;
  switch (e) {
    case "email":
      r = [_Ii()];
      break;
    case "uri":
      r = [A8e()];
      break;
    case "date":
      r = [t1i()];
      break;
    case "date-time":
      r = jl(t);
      break;
  }
  return new Set(r.map((s) => Nl(s)).filter((s) => s !== void 0));
}
//@ chunk-r1g76qsy.js:86938-87001 esm-fingerprint
function Ll(e, t, r) {
  if (r !== "zod") return !0;
  return Al(e, t).has(t);
}
//@ chunk-r1g76qsy.js:87001-87072 esm-fingerprint
function eo(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:87072-87289 esm-fingerprint
function Ul(e) {
  try {
    return Il(e, "input");
  } catch (error) {
    let r = error instanceof Error ? error.message : String(error);
    throw new ProtocolError(
      ma.InvalidParams,
      `Elicitation requestedSchema must describe an object with flat primitive properties: ${r}`,
    );
  }
}
//@ chunk-r1g76qsy.js:87289-87387 esm-fingerprint
var Dl = new Set(["$comment", "deprecated", "description", "examples", "readOnly", "title", "writeOnly"]);
//@ chunk-r1g76qsy.js:87387-87439 esm-fingerprint
function Sn(e) {
  return Dl.has(e) || e.startsWith("x-");
}
//@ chunk-r1g76qsy.js:87439-87657 esm-fingerprint
var Vl = new Set(["$schema", ...Object.keys(extend_57.shape.requestedSchema.shape)]),
  Jn = {
    string: Xr([Ht, xr, Fr, Hr]),
    number: Xr([Kt]),
    integer: Xr([Kt]),
    boolean: Xr([Vr]),
    array: Xr([Kr, Jr]),
  },
  xl = new Set(Ht.shape.format.unwrap().options);
//@ chunk-r1g76qsy.js:87657-88062 esm-fingerprint
function Fl(e, t, r, s) {
  if (!eo(e)) return e;
  let a = typeof e.type === "string" && Object.hasOwn(Jn, e.type) ? Jn[e.type] : void 0;
  if (a === void 0) return e;
  let n = {};
  for (let [i, l] of Object.entries(e))
    if (a.has(i) || Sn(i)) n[i] = l;
    else if (i === "pattern" && e.type === "string" && typeof e.format === "string") {
      if (!xl.has(e.format)) n[i] = l;
      else if (typeof l !== "string" || !Ll(e.format, l, r)) s.push(`${t}.${i}`);
    } else s.push(`${t}.${i}`);
  return n;
}
//@ chunk-r1g76qsy.js:88062-88473 esm-fingerprint
function Hl(e, t) {
  let r = {},
    s = [];
  for (let [a, n] of Object.entries(e))
    if (a === "properties" && eo(n))
      r[a] = Object.fromEntries(Object.entries(n).map(([i, l]) => [i, Fl(l, `properties.${i}`, t, s)]));
    else if (Vl.has(a)) r[a] = n;
    else if (!Sn(a)) s.push(a);
  if (s.length > 0)
    throw new ProtocolError(
      ma.InvalidParams,
      `Elicitation requestedSchema contains unsupported JSON Schema constraint(s) after Standard Schema conversion: ${s.join(", ")}`,
    );
  return r;
}
//@ chunk-r1g76qsy.js:88473-88652 esm-fingerprint
function Kl(e, t) {
  if (!eo(e.properties)) return t;
  let mapped = Object.entries(e.properties)
    .filter(([, s]) => !pa(Gr, s).success)
    .map(([s]) => `properties.${s}`);
  return mapped.length > 0 ? mapped.join(", ") : t;
}
//@ chunk-r1g76qsy.js:88652-88941 esm-fingerprint
function nn(e, t, r = "") {
  if (Array.isArray(e) && Array.isArray(t)) return e.flatMap((s, a) => nn(s, t[a], `${r}[${a}]`));
  if (!eo(e) || !eo(t)) return [];
  return Object.entries(e).flatMap(([s, a]) => {
    let n = r ? `${r}.${s}` : s;
    if (!Object.prototype.hasOwnProperty.call(t, s)) return Sn(s) ? [] : [n];
    return nn(a, t[s], n);
  });
}
//@ chunk-r1g76qsy.js:88941-89834 esm-fingerprint
function Jl(e) {
  if (!sn(e.requestedSchema)) return { ...e, mode: "form", requestedSchema: e.requestedSchema };
  let vendor = e.requestedSchema["~standard"].vendor,
    r = Hl(Ul(e.requestedSchema), vendor),
    s = pa(extend_57.shape.requestedSchema, r);
  if (!s.success)
    throw new ProtocolError(
      ma.InvalidParams,
      `Elicitation requestedSchema only supports flat primitive properties (string, number, integer, boolean, and string enums): ${Kl(r, s.error.message)}`,
    );
  let a = nn(r, s.data);
  if (a.length > 0)
    throw new ProtocolError(
      ma.InvalidParams,
      `Elicitation requestedSchema contains unsupported JSON Schema constraint(s) after Standard Schema conversion: ${a.join(", ")}`,
    );
  let filtered = (s.data.required ?? []).filter(
    (i) => !Object.prototype.hasOwnProperty.call(s.data.properties, i),
  );
  if (filtered.length > 0)
    throw new ProtocolError(
      ma.InvalidParams,
      `Elicitation requestedSchema lists required properties that are not defined in properties: ${filtered.join(", ")}`,
    );
  return { ...e, mode: "form", requestedSchema: s.data };
}
//@ chunk-r1g76qsy.js:89834-90306 esm-fingerprint
function Gl(e) {
  let t = e.inputRequests !== void 0 && Object.keys(e.inputRequests).length > 0,
    r = typeof e.requestState === "string";
  if (!t && !r)
    throw TypeError(
      "inputRequired() requires at least one of inputRequests (with at least one entry) or requestState (spec: every InputRequiredResult MUST include at least one of the two)",
    );
  return {
    resultType: "input_required",
    ...(e.inputRequests !== void 0 && { inputRequests: e.inputRequests }),
    ...(e.requestState !== void 0 && { requestState: e.requestState }),
  };
}
//@ chunk-r1g76qsy.js:90306-90645 esm-fingerprint
var merged = Object.assign(Gl, {
  elicit(e) {
    try {
      return { method: "elicitation/create", params: Jl(e) };
    } catch (error) {
      throw error instanceof ProtocolError ? TypeError(error.message, { cause: error }) : error;
    }
  },
  elicitUrl(e) {
    return { method: "elicitation/create", params: { ...e, mode: "url" } };
  },
  createMessage(e) {
    return { method: "sampling/createMessage", params: e };
  },
  listRoots() {
    return { method: "roots/list" };
  },
});
//@ chunk-r1g76qsy.js:90645-90668 esm-layout
var Bl = !0,
  Wl = 10,
  Yl = 250;
//@ chunk-r1g76qsy.js:90668-90749 esm-fingerprint
function wi(e) {
  return { autoFulfill: e?.autoFulfill ?? Bl, maxRounds: e?.maxRounds ?? Wl };
}
//@ chunk-r1g76qsy.js:90749-90907 esm-fingerprint
function Xl(e, t, r) {
  let s = t !== void 0 && Object.keys(t).length > 0;
  if (!s && r === void 0) return e;
  return { ...e, ...(s && { inputResponses: t }), ...(r !== void 0 && { requestState: r }) };
}
//@ chunk-r1g76qsy.js:90907-91029 esm-fingerprint
function Zl(e, t) {
  return `Multi-round-trip request '${e}' still required input after ${t} rounds (inputRequired.maxRounds)`;
}
//@ chunk-r1g76qsy.js:91029-91384 esm-fingerprint
function Ql(e, t) {
  return new Promise((r, s) => {
    if (t?.aborted) {
      s(t.reason instanceof SdkError ? t.reason : new SdkError(Ti.RequestTimeout, String(t.reason)));
      return;
    }
    let a = setTimeout(() => {
        (t?.removeEventListener("abort", n), r());
      }, e),
      n = () => {
        (clearTimeout(a),
          s(t?.reason instanceof SdkError ? t.reason : new SdkError(Ti.RequestTimeout, String(t?.reason))));
      };
    t?.addEventListener("abort", n, { once: !0 });
  });
}
//@ chunk-r1g76qsy.js:91384-91615 esm-fingerprint
function eu(e) {
  let abortController = new AbortController(),
    r = () => abortController.abort(e?.reason);
  if ((e?.addEventListener("abort", r, { once: !0 }), e?.aborted)) abortController.abort(e.reason);
  return {
    signal: abortController.signal,
    abort: (s) => abortController.abort(s),
    dispose: () => e?.removeEventListener("abort", r),
  };
}
//@ chunk-r1g76qsy.js:91615-92780 esm-fingerprint
async function tu(e) {
  let {
      config: config,
      method: method,
      originalParams: originalParams,
      requestOptions: requestOptions,
      hooks: hooks,
      signal: signal,
    } = e,
    l = e.flowStartedAt ?? Date.now(),
    firstPayload = e.firstPayload,
    d = 0;
  while (!0) {
    if (((d += 1), d > config.maxRounds))
      throw new SdkError(Ti.InputRequiredRoundsExceeded, Zl(method, config.maxRounds), {
        rounds: config.maxRounds,
        lastResult: {
          inputRequests: firstPayload.inputRequests,
          ...(firstPayload.requestState !== void 0 && { requestState: firstPayload.requestState }),
        },
      });
    requestOptions.onprogress?.({
      progress: d,
      message: `Fulfilling input required by '${method}' (round ${d})`,
    });
    let entries = Object.entries(firstPayload.inputRequests ?? {}),
      _;
    if (entries.length > 0) {
      let y = eu(signal);
      try {
        let results = await Promise.all(
          entries.map(async ([p, h]) => {
            try {
              return [p, await hooks.dispatchInputRequest(p, h, y.signal)];
            } catch (error) {
              throw (y.abort(error), error);
            }
          }),
        );
        _ = Object.fromEntries(results);
      } finally {
        y.dispose();
      }
    } else await Ql(Yl, signal);
    let w = { ...(requestOptions.timeout !== void 0 && { timeout: requestOptions.timeout }) };
    if (requestOptions.maxTotalTimeout !== void 0) {
      let y = Date.now() - l,
        v = requestOptions.maxTotalTimeout - y;
      if (v <= 0)
        throw new SdkError(Ti.RequestTimeout, "Maximum total timeout exceeded", {
          maxTotalTimeout: requestOptions.maxTotalTimeout,
          totalElapsed: y,
        });
      w.maxTotalTimeout = v;
    }
    let retry = await hooks.retry(Xl(originalParams, _, firstPayload.requestState), w);
    if (yi(retry)) {
      firstPayload = {
        inputRequests: retry.inputRequests ?? {},
        ...(retry.requestState !== void 0 && { requestState: retry.requestState }),
      };
      continue;
    }
    return retry;
  }
}
//@ chunk-r1g76qsy.js:92780-97520 esm-fingerprint
var ru = [
    "AnnotationsSchema",
    "AudioContentSchema",
    "BaseMetadataSchema",
    "BlobResourceContentsSchema",
    "BooleanSchemaSchema",
    "CallToolRequestSchema",
    "CallToolRequestParamsSchema",
    "CallToolResultSchema",
    "CancelledNotificationSchema",
    "CancelledNotificationParamsSchema",
    "CancelTaskRequestSchema",
    "CancelTaskResultSchema",
    "ClientCapabilitiesSchema",
    "ClientNotificationSchema",
    "ClientRequestSchema",
    "ClientResultSchema",
    "CompatibilityCallToolResultSchema",
    "CompleteRequestSchema",
    "CompleteRequestParamsSchema",
    "CompleteResultSchema",
    "ContentBlockSchema",
    "CreateMessageRequestSchema",
    "CreateMessageRequestParamsSchema",
    "CreateMessageResultSchema",
    "CreateMessageResultWithToolsSchema",
    "CreateTaskResultSchema",
    "CursorSchema",
    "DiscoverRequestSchema",
    "DiscoverResultSchema",
    "ElicitationCompleteNotificationSchema",
    "ElicitationCompleteNotificationParamsSchema",
    "ElicitRequestSchema",
    "ElicitRequestFormParamsSchema",
    "ElicitRequestParamsSchema",
    "ElicitRequestURLParamsSchema",
    "ElicitResultSchema",
    "EmbeddedResourceSchema",
    "EmptyResultSchema",
    "EnumSchemaSchema",
    "GetPromptRequestSchema",
    "GetPromptRequestParamsSchema",
    "GetPromptResultSchema",
    "GetTaskPayloadRequestSchema",
    "GetTaskPayloadResultSchema",
    "GetTaskRequestSchema",
    "GetTaskResultSchema",
    "IconSchema",
    "IconsSchema",
    "ImageContentSchema",
    "ImplementationSchema",
    "InitializedNotificationSchema",
    "InitializeRequestSchema",
    "InitializeRequestParamsSchema",
    "InitializeResultSchema",
    "JSONArraySchema",
    "JSONObjectSchema",
    "JSONRPCErrorResponseSchema",
    "JSONRPCMessageSchema",
    "JSONRPCNotificationSchema",
    "JSONRPCRequestSchema",
    "JSONRPCResponseSchema",
    "JSONRPCResultResponseSchema",
    "JSONValueSchema",
    "LegacyTitledEnumSchemaSchema",
    "ListPromptsRequestSchema",
    "ListPromptsResultSchema",
    "ListResourcesRequestSchema",
    "ListResourcesResultSchema",
    "ListResourceTemplatesRequestSchema",
    "ListResourceTemplatesResultSchema",
    "ListRootsRequestSchema",
    "ListRootsResultSchema",
    "ListTasksRequestSchema",
    "ListTasksResultSchema",
    "ListToolsRequestSchema",
    "ListToolsResultSchema",
    "LoggingLevelSchema",
    "LoggingMessageNotificationSchema",
    "LoggingMessageNotificationParamsSchema",
    "ModelHintSchema",
    "ModelPreferencesSchema",
    "MultiSelectEnumSchemaSchema",
    "NotificationSchema",
    "NumberSchemaSchema",
    "PaginatedRequestSchema",
    "PaginatedRequestParamsSchema",
    "PaginatedResultSchema",
    "PingRequestSchema",
    "PrimitiveSchemaDefinitionSchema",
    "ProgressSchema",
    "ProgressNotificationSchema",
    "ProgressNotificationParamsSchema",
    "ProgressTokenSchema",
    "PromptSchema",
    "PromptArgumentSchema",
    "PromptListChangedNotificationSchema",
    "PromptMessageSchema",
    "PromptReferenceSchema",
    "ReadResourceRequestSchema",
    "ReadResourceRequestParamsSchema",
    "ReadResourceResultSchema",
    "RelatedTaskMetadataSchema",
    "RequestSchema",
    "RequestIdSchema",
    "RequestMetaSchema",
    "ResourceSchema",
    "ResourceContentsSchema",
    "ResourceLinkSchema",
    "ResourceListChangedNotificationSchema",
    "ResourceRequestParamsSchema",
    "ResourceTemplateSchema",
    "ResourceTemplateReferenceSchema",
    "ResourceUpdatedNotificationSchema",
    "ResourceUpdatedNotificationParamsSchema",
    "ResultMetaObjectSchema",
    "ResultSchema",
    "RoleSchema",
    "RootSchema",
    "RootsListChangedNotificationSchema",
    "SamplingContentSchema",
    "SamplingMessageSchema",
    "SamplingMessageContentBlockSchema",
    "ServerCapabilitiesSchema",
    "ServerNotificationSchema",
    "ServerRequestSchema",
    "ServerResultSchema",
    "SetLevelRequestSchema",
    "SetLevelRequestParamsSchema",
    "SingleSelectEnumSchemaSchema",
    "StringSchemaSchema",
    "SubscribeRequestSchema",
    "SubscribeRequestParamsSchema",
    "SubscriptionFilterSchema",
    "SubscriptionsAcknowledgedNotificationSchema",
    "SubscriptionsAcknowledgedNotificationParamsSchema",
    "SubscriptionsListenRequestSchema",
    "SubscriptionsListenRequestParamsSchema",
    "SubscriptionsListenResultSchema",
    "SubscriptionsListenResultMetaSchema",
    "TaskAugmentedRequestParamsSchema",
    "TaskCreationParamsSchema",
    "TaskMetadataSchema",
    "TaskSchema",
    "TaskStatusSchema",
    "TaskStatusNotificationSchema",
    "TaskStatusNotificationParamsSchema",
    "TextContentSchema",
    "TextResourceContentsSchema",
    "TitledMultiSelectEnumSchemaSchema",
    "TitledSingleSelectEnumSchemaSchema",
    "ToolSchema",
    "ToolAnnotationsSchema",
    "ToolChoiceSchema",
    "ToolExecutionSchema",
    "ToolListChangedNotificationSchema",
    "ToolResultContentSchema",
    "ToolUseContentSchema",
    "UnsubscribeRequestSchema",
    "UnsubscribeRequestParamsSchema",
    "UntitledMultiSelectEnumSchemaSchema",
    "UntitledSingleSelectEnumSchemaSchema",
  ],
  ou = {
    IdJagTokenExchangeResponseSchema: strip_2,
    OAuthClientInformationFullSchema: merge_4,
    OAuthClientInformationSchema: strip_4,
    OAuthClientMetadataSchema: strip_3,
    OAuthClientRegistrationErrorSchema: strip_5,
    OAuthErrorResponseSchema: OBt,
    OAuthMetadataSchema: M_t,
    OAuthProtectedResourceMetadataSchema: Br,
    OAuthTokenRevocationRequestSchema: strip_6,
    OAuthTokensSchema: strip,
    OpenIdProviderDiscoveryMetadataSchema: PBt,
    OpenIdProviderMetadataSchema: Zs,
  },
  $i = {},
  Ei = {};
//@ chunk-r1g76qsy.js:97520-97599 esm-fingerprint
function Pi(e, t) {
  let sliced = e.slice(0, -6);
  (($i[sliced] = t), (Ei[sliced] = (s) => t.safeParse(s).success));
}
//@ chunk-r1g76qsy.js:97599-97627 esm-layout
for (let e of ru) Pi(e, Rl[e]);
//@ chunk-r1g76qsy.js:97627-97669 esm-layout
for (let [e, t] of Object.entries(ou)) Pi(e, t);
//@ chunk-r1g76qsy.js:97669-97715 esm-layout
var freeze = Object.freeze($i),
  freeze_2 = Object.freeze(Ei);
//@ chunk-r1g76qsy.js:97715-97859 esm-fingerprint
function au(e) {
  switch (e) {
    case "initialize":
    case "notifications/initialized":
      return Ge(void 0);
    case "server/discover":
      return Ge(la);
    default:
      return;
  }
}
//@ chunk-r1g76qsy.js:97859-97927 esm-fingerprint
var oo = 60000,
  nu = [
    IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION,
    IO_MODELCONTEXTPROTOCOL_CLIENTINFO,
    IHe,
    IO_MODELCONTEXTPROTOCOL_LOGLEVEL,
  ],
  iu = ["inputResponses", "requestState"];
//@ chunk-r1g76qsy.js:97927-98471 esm-fingerprint
function Gn(e, t) {
  let params = e.params;
  if (!Qr(params)) return { message: e, lifted: {} };
  let _meta = params._meta,
    a = Qr(_meta) ? nu.filter((c) => c in _meta) : [],
    n = t === "request" ? iu.filter((c) => c in params) : [];
  if (a.length === 0 && n.length === 0) return { message: e, lifted: {} };
  let i = {},
    l = { ...params };
  if (a.length > 0 && Qr(_meta)) {
    let c = {},
      d = { ..._meta };
    for (let m of a) ((c[m] = _meta[m]), delete d[m]);
    if (((i.envelope = c), Object.keys(d).length > 0)) l._meta = d;
    else delete l._meta;
  }
  for (let c of n) {
    if (c === "inputResponses") i.inputResponses = l[c];
    if (c === "requestState") i.requestState = l[c];
    delete l[c];
  }
  return { message: { ...e, params: l }, lifted: i };
}
//@ chunk-r1g76qsy.js:98471-98766 esm-fingerprint
function Bn(e, t) {
  let validateResult = e.validateResult(t, void 0);
  if (!validateResult.ok && validateResult.reason === "not-in-era") return;
  return {
    "~standard": {
      version: 1,
      vendor: "mcp-wire-codec",
      validate(s) {
        let validateResult = e.validateResult(t, s);
        if (validateResult.ok) return { value: validateResult.value };
        return {
          issues: [
            { message: validateResult.reason === "invalid" ? validateResult.message : `not-in-era: ${t}` },
          ],
        };
      },
    },
  };
}
//@ chunk-r1g76qsy.js:98766-98793 esm-layout
function gn(e) {
  return () => e;
}
//@ chunk-r1g76qsy.js:98793-112999 esm-layout
var cu = gn(void 0),
  lu,
  ki = class {
    _transport;
    _requestMessageId = 0;
    _requestHandlers = new Map();
    _requestHandlerAbortControllers = new Map();
    _notificationHandlers = new Map();
    _responseHandlers = new Map();
    _progressHandlers = new Map();
    _timeoutInfo = new Map();
    _pendingDebouncedNotifications = new Set();
    _negotiatedProtocolVersion;
    static {
      lu = (e, t) => {
        e._negotiatedProtocolVersion = t;
      };
    }
    _supportedProtocolVersions;
    onclose;
    onerror;
    fallbackRequestHandler;
    fallbackNotificationHandler;
    constructor(e) {
      ((this._options = e),
        (this._supportedProtocolVersions = e?.supportedProtocolVersions ?? P_t),
        this.setNotificationHandler("notifications/cancelled", (t) => {
          this._oncancel(t);
        }),
        this.setNotificationHandler("notifications/progress", (t) => {
          this._onprogress(t);
        }),
        this.setRequestHandler("ping", (t) => ({})));
    }
    _shouldDropInbound(e) {}
    _outboundMetaEnvelope() {}
    _envelopeOutbound(e) {
      let _outboundMetaEnvelope = this._outboundMetaEnvelope();
      if (_outboundMetaEnvelope === void 0) return e;
      let r = e.params ?? {};
      return { ...e, params: { ...r, _meta: { ..._outboundMetaEnvelope, ...r._meta } } };
    }
    _resolveNonCompleteResult(e, t) {
      return Promise.reject(
        new SdkError(
          Ti.UnsupportedResultType,
          `Unsupported result type '${e.kind}' for ${t.request.method}`,
          { resultType: e.kind, method: t.request.method },
        ),
      );
    }
    _getRequestHandler(e) {
      return this._requestHandlers.get(e);
    }
    async _oncancel(e) {
      if (!e.params.requestId) return;
      this._requestHandlerAbortControllers.get(e.params.requestId)?.abort(e.params.reason);
    }
    _setupTimeout(e, t, r, s, a = !1) {
      this._timeoutInfo.set(e, {
        timeoutId: setTimeout(s, t),
        startTime: Date.now(),
        timeout: t,
        maxTotalTimeout: r,
        resetTimeoutOnProgress: a,
        onTimeout: s,
      });
    }
    _resetTimeout(e) {
      let t = this._timeoutInfo.get(e);
      if (!t) return !1;
      let r = Date.now() - t.startTime;
      if (t.maxTotalTimeout && r >= t.maxTotalTimeout)
        throw (
          this._timeoutInfo.delete(e),
          new SdkError(Ti.RequestTimeout, "Maximum total timeout exceeded", {
            maxTotalTimeout: t.maxTotalTimeout,
            totalElapsed: r,
          })
        );
      return (clearTimeout(t.timeoutId), (t.timeoutId = setTimeout(t.onTimeout, t.timeout)), !0);
    }
    _cleanupTimeout(e) {
      let t = this._timeoutInfo.get(e);
      if (t) (clearTimeout(t.timeoutId), this._timeoutInfo.delete(e));
    }
    async connect(e) {
      this._transport = e;
      let t = this.transport?.onclose;
      this._transport.onclose = () => {
        try {
          t?.();
        } finally {
          this._onclose();
        }
      };
      let r = this.transport?.onerror;
      this._transport.onerror = (a) => {
        (r?.(a), this._onerror(a));
      };
      let s = this._transport?.onmessage;
      ((this._transport.onmessage = (a, n) => {
        if ((s?.(a, n), GAe(a) || zAe(a))) this._onresponse(a);
        else if (fZ(a)) this._onrequest(a, n);
        else if (VNr(a)) this._onnotification(a, n);
        else this._onerror(Error(`Unknown message type: ${JSON.stringify(a)}`));
      }),
        e.setSupportedProtocolVersions?.(this._supportedProtocolVersions),
        await this._transport.start());
    }
    _onclose() {
      let _responseHandlers = this._responseHandlers;
      ((this._responseHandlers = new Map()),
        this._progressHandlers.clear(),
        this._pendingDebouncedNotifications.clear());
      for (let s of this._timeoutInfo.values()) clearTimeout(s.timeoutId);
      this._timeoutInfo.clear();
      let _requestHandlerAbortControllers = this._requestHandlerAbortControllers;
      this._requestHandlerAbortControllers = new Map();
      let r = new SdkError(Ti.ConnectionClosed, "Connection closed");
      this._transport = void 0;
      try {
        this.onclose?.();
      } finally {
        for (let s of _responseHandlers.values()) s(r);
        for (let s of _requestHandlerAbortControllers.values()) s.abort(r);
      }
    }
    _onerror(e) {
      this.onerror?.(e);
    }
    _onnotification(e, t) {
      let { message: message } = Gn(e, "notification"),
        _negotiatedWireCodec = this._negotiatedWireCodec();
      if (t?.classification === void 0 && this._shouldDropInbound(e) === "drop") return;
      if (t?.classification !== void 0) {
        let i = Fn(t.classification);
        if (i !== _negotiatedWireCodec.era) {
          this._onerror(
            Error(
              `Era mismatch on inbound notification '${message.method}': classified as ${i} but this instance serves ${_negotiatedWireCodec.era}`,
            ),
          );
          return;
        }
      }
      if (en(message.method) && !_negotiatedWireCodec.hasNotificationMethod(message.method)) return;
      let a = this._notificationHandlers.get(message.method),
        fallbackNotificationHandler = this.fallbackNotificationHandler;
      if (a === void 0 && fallbackNotificationHandler === void 0) return;
      Promise.resolve()
        .then(() => (a === void 0 ? fallbackNotificationHandler(message) : a(message, _negotiatedWireCodec)))
        .catch((i) => this._onerror(Error(`Uncaught error in notification handler: ${i}`)));
    }
    _onrequest(e, t) {
      let { message: message, lifted: lifted } = Gn(e, "request"),
        _negotiatedWireCodec = this._negotiatedWireCodec();
      if (t?.classification === void 0 && this._shouldDropInbound(e) === "drop") {
        this._onerror(
          Error(`Dropped inbound request '${e.method}': not servable on this connection's protocol era`),
        );
        return;
      }
      let _transport = this._transport,
        i = (v, p, h) => {
          let S = {
            jsonrpc: "2.0",
            id: message.id,
            error: { code: v, message: p, ...(h !== void 0 && { data: h }) },
          };
          _transport?.send(S).catch((f) => this._onerror(Error(`Failed to send an error response: ${f}`)));
        };
      if (t?.classification !== void 0) {
        let v = Fn(t.classification);
        if (v !== _negotiatedWireCodec.era) {
          this._onerror(
            Error(
              `Era mismatch on inbound request '${message.method}': classified as ${v} but this instance serves ${_negotiatedWireCodec.era}`,
            ),
          );
          let p = t.classification.revision ?? v;
          i(ma.UnsupportedProtocolVersion, `Unsupported protocol version: ${p}`, {
            supported: this._supportedProtocolVersions,
            requested: p,
          });
          return;
        }
      }
      if (Qa(message.method) && !_negotiatedWireCodec.hasRequestMethod(message.method)) {
        i(ma.MethodNotFound, "Method not found");
        return;
      }
      let l = this._requestHandlers.get(message.method) ?? this.fallbackRequestHandler;
      if (l === void 0) {
        i(ma.MethodNotFound, "Method not found");
        return;
      }
      let checkInboundEnvelope = _negotiatedWireCodec.checkInboundEnvelope(lifted);
      if (checkInboundEnvelope !== void 0) {
        i(ma.InvalidParams, checkInboundEnvelope);
        return;
      }
      let d = (v, p) =>
          this._notificationViaCodec(this._resolveOutboundCodec(v.method), v, {
            ...p,
            relatedRequestId: message.id,
          }),
        m = (v, p, h) =>
          this._requestWithSchemaViaCodec(this._resolveOutboundCodec(v.method), v, p, {
            ...h,
            relatedRequestId: message.id,
          }),
        abortController = new AbortController();
      this._requestHandlerAbortControllers.set(message.id, abortController);
      let w = lifted.inputResponses === void 0 ? void 0 : uu(lifted.inputResponses),
        P = {
          sessionId: _transport?.sessionId,
          mcpReq: {
            id: message.id,
            method: message.method,
            _meta: message.params?._meta,
            ...(lifted.envelope !== void 0 && { envelope: lifted.envelope }),
            ...(w !== void 0 && { inputResponses: w.accepted }),
            ...(w !== void 0 && w.droppedKeys.length > 0 && { droppedInputResponseKeys: w.droppedKeys }),
            requestState: lifted.requestState === void 0 ? cu : gn(lifted.requestState),
            signal: abortController.signal,
            send: (v, p, h) => {
              let _resolveOutboundCodec = this._resolveOutboundCodec(v.method);
              if ((this._assertOutboundRequestInEra(_resolveOutboundCodec, v.method), sn(p)))
                return m(v, p, h);
              let f = Bn(_resolveOutboundCodec, v.method);
              if (f === void 0)
                throw TypeError(
                  `'${v.method}' is not a spec method; pass a result schema as the second argument to ctx.mcpReq.send().`,
                );
              return m(v, f, p);
            },
            notify: d,
          },
          http: t?.authInfo ? { authInfo: t.authInfo } : void 0,
        },
        context = this.buildContext(P, t);
      Promise.resolve()
        .then(() => l(message, context))
        .then(
          async (v) => {
            if (abortController.signal.aborted) return;
            let p;
            try {
              p = _negotiatedWireCodec.encodeResult(message.method, v, this._outboundServerInfo());
            } catch (error) {
              (this._onerror(Error(`Failed to encode result for ${message.method}: ${error}`)),
                i(ma.InternalError, "Internal error"));
              return;
            }
            let h = { result: p, jsonrpc: "2.0", id: message.id };
            await _transport?.send(h);
          },
          async (v) => {
            if (abortController.signal.aborted) return;
            let p = Number.isSafeInteger(v.code) ? v.code : ma.InternalError,
              h = {
                jsonrpc: "2.0",
                id: message.id,
                error: {
                  code: _negotiatedWireCodec.encodeErrorCode(p),
                  message: v.message ?? "Internal error",
                  ...(v.data !== void 0 && { data: v.data }),
                },
              };
            await _transport?.send(h);
          },
        )
        .catch((v) => this._onerror(Error(`Failed to send response: ${v}`)))
        .finally(() => {
          if (this._requestHandlerAbortControllers.get(message.id) === abortController)
            this._requestHandlerAbortControllers.delete(message.id);
        });
    }
    _onprogress(e) {
      let { progressToken: progressToken, ...r } = e.params,
        s = Number(progressToken),
        a = this._progressHandlers.get(s);
      if (!a) {
        this._onerror(Error(`Received a progress notification for an unknown token: ${JSON.stringify(e)}`));
        return;
      }
      let n = this._responseHandlers.get(s),
        i = this._timeoutInfo.get(s);
      if (i && n && i.resetTimeoutOnProgress)
        try {
          this._resetTimeout(s);
        } catch (error) {
          (this._responseHandlers.delete(s),
            this._progressHandlers.delete(s),
            this._cleanupTimeout(s),
            n(error));
          return;
        }
      a(r);
    }
    _onresponse(e) {
      let t = Number(e.id),
        r = this._responseHandlers.get(t);
      if (r === void 0) {
        this._onerror(Error(`Received a response for an unknown message ID: ${JSON.stringify(e)}`));
        return;
      }
      if (
        (this._responseHandlers.delete(t), this._cleanupTimeout(t), this._progressHandlers.delete(t), GAe(e))
      )
        r(e);
      else r(ProtocolError.fromError(e.error.code, e.error.message, e.error.data));
    }
    get transport() {
      return this._transport;
    }
    async close() {
      await this._transport?.close();
    }
    request(e, t, r) {
      let _resolveOutboundCodec = this._resolveOutboundCodec(e.method);
      if ((this._assertOutboundRequestInEra(_resolveOutboundCodec, e.method), sn(t)))
        return this._requestWithSchemaViaCodec(_resolveOutboundCodec, e, t, r);
      let a = Bn(_resolveOutboundCodec, e.method);
      if (a === void 0)
        throw TypeError(
          `'${e.method}' is not a spec method; pass a result schema as the second argument to request().`,
        );
      return this._requestWithSchemaViaCodec(_resolveOutboundCodec, e, a, t);
    }
    _negotiatedWireCodec() {
      return Ge(this._negotiatedProtocolVersion);
    }
    _wireCodec() {
      return this._negotiatedWireCodec();
    }
    _resolveOutboundCodec(e) {
      if (this._negotiatedProtocolVersion === void 0) {
        let t = au(e);
        if (t) return t;
      }
      return this._negotiatedWireCodec();
    }
    _assertOutboundRequestInEra(e, t) {
      if (t.startsWith("tasks/")) return;
      if (Qa(t) && !e.hasRequestMethod(t))
        throw new SdkError(
          Ti.MethodNotSupportedByProtocolVersion,
          `Method '${t}' is not supported by the negotiated protocol version (wire era ${e.era})`,
          { method: t, era: e.era },
        );
    }
    _requestWithSchema(e, t, r) {
      let _resolveOutboundCodec = this._resolveOutboundCodec(e.method);
      return (
        this._assertOutboundRequestInEra(_resolveOutboundCodec, e.method),
        this._requestWithSchemaViaCodec(_resolveOutboundCodec, e, t, r)
      );
    }
    _requestWithSchemaViaCodec(e, t, r, s) {
      let {
          relatedRequestId: relatedRequestId,
          resumptionToken: resumptionToken,
          onresumptiontoken: onresumptiontoken,
          headers: headers,
        } = s ?? {},
        now = Date.now(),
        d,
        m;
      return new Promise((_, w) => {
        let P = (b) => {
          w(b);
        };
        if (!this._transport) {
          P(Error("Not connected"));
          return;
        }
        if (this._options?.enforceStrictCapabilities === !0)
          try {
            this.assertCapabilityForMethod(t.method);
          } catch (error) {
            P(error);
            return;
          }
        if (s?.signal?.aborted) {
          let reason = s.signal.reason;
          throw reason instanceof SdkError ? reason : new SdkError(Ti.RequestTimeout, String(reason));
        }
        let y = e.era === la && this._transport.hasPerRequestStream === !0 ? new AbortController() : void 0,
          v = this._requestMessageId++;
        m = v;
        let p = { ...t, jsonrpc: "2.0", id: v };
        if (s?.onprogress)
          (this._progressHandlers.set(v, s.onprogress),
            (p.params = { ...t.params, _meta: { ...t.params?._meta, progressToken: v } }));
        let _envelopeOutbound = this._envelopeOutbound(p),
          S = !1,
          f = (b) => {
            if (S) return;
            if ((this._progressHandlers.delete(v), y === void 0))
              this._transport
                ?.send(
                  this._envelopeOutbound({
                    jsonrpc: "2.0",
                    method: "notifications/cancelled",
                    params: { requestId: v, reason: String(b) },
                  }),
                  {
                    relatedRequestId: relatedRequestId,
                    resumptionToken: resumptionToken,
                    onresumptiontoken: onresumptiontoken,
                  },
                )
                .catch((g) => this._onerror(Error(`Failed to send cancellation: ${g}`)));
            else y.abort();
            w(b instanceof SdkError ? b : new SdkError(Ti.RequestTimeout, String(b)));
          };
        (this._responseHandlers.set(v, (b) => {
          if (s?.signal?.aborted) return;
          if (((S = !0), b instanceof Error)) return w(b);
          let g = r?.["~standard"]?.vendor === "mcp-wire-codec",
            k;
          try {
            k = e.decodeResult(t.method, b.result, g);
          } catch (error) {
            return w(error instanceof Error ? error : Error(String(error)));
          }
          if (k.kind === "invalid") return w(k.error);
          if (k.kind === "task") {
            if (
              s?.allowTask === !0 &&
              this._capabilities?.extensions?.[IO_MODELCONTEXTPROTOCOL_TASKS] !== void 0 &&
              vl(k.result)
            )
              return _(k.result);
            return w(
              new SdkError(Ti.UnsupportedResultType, `Unsupported result type 'task' for ${t.method}`, {
                method: t.method,
              }),
            );
          }
          if (k.kind === "input_required") {
            if (s?.allowInputRequired === !0) return _(pu(k));
            let H = {
              codec: e,
              request: t,
              resultSchema: r,
              options: s,
              flowStartedAt: now,
              retry: (N, x) =>
                this._requestWithSchemaViaCodec(
                  e,
                  N === void 0 ? { method: t.method } : { method: t.method, params: N },
                  r,
                  x,
                ),
            };
            return _(this._resolveNonCompleteResult(k, H));
          }
          let V = k.result;
          tn(r, V).then((H) => {
            if (H.success) return _(H.data);
            let N;
            try {
              N = g ? e.decodeResult(t.method, b.result) : void 0;
            } catch (error) {
              return w(error instanceof Error ? error : Error(String(error)));
            }
            w(
              N?.kind === "invalid"
                ? N.error
                : new SdkError(Ti.InvalidResult, `Invalid result for ${t.method}: ${H.error}`),
            );
          }, w);
        }),
          (d = () => f(s?.signal?.reason)),
          s?.signal?.addEventListener("abort", d, { once: !0 }));
        let R = s?.timeout ?? oo,
          C = () => f(new SdkError(Ti.RequestTimeout, "Request timed out", { timeout: R }));
        (this._setupTimeout(v, R, s?.maxTotalTimeout, C, s?.resetTimeoutOnProgress ?? !1),
          this._transport
            .send(_envelopeOutbound, {
              relatedRequestId: relatedRequestId,
              resumptionToken: resumptionToken,
              onresumptiontoken: onresumptiontoken,
              headers: headers,
              requestSignal: y?.signal,
            })
            .catch((b) => {
              (this._progressHandlers.delete(v), w(b));
            }));
      }).finally(() => {
        if (d) s?.signal?.removeEventListener("abort", d);
        if (m !== void 0) (this._responseHandlers.delete(m), this._cleanupTimeout(m));
      });
    }
    async notification(e, t) {
      return this._notificationViaCodec(this._resolveOutboundCodec(e.method), e, t);
    }
    async _notificationViaCodec(e, t, r) {
      if (!this._transport) throw new SdkError(Ti.NotConnected, "Not connected");
      if (en(t.method) && !e.hasNotificationMethod(t.method))
        throw new SdkError(
          Ti.MethodNotSupportedByProtocolVersion,
          `Notification '${t.method}' is not supported by the negotiated protocol version (wire era ${e.era})`,
          { method: t.method, era: e.era },
        );
      this.assertNotificationCapability(t.method);
      let _envelopeOutbound = this._envelopeOutbound({ jsonrpc: "2.0", ...t });
      if (
        (this._options?.debouncedNotificationMethods ?? []).includes(t.method) &&
        !t.params &&
        !r?.relatedRequestId
      ) {
        if (this._pendingDebouncedNotifications.has(t.method)) return;
        (this._pendingDebouncedNotifications.add(t.method),
          Promise.resolve().then(() => {
            if ((this._pendingDebouncedNotifications.delete(t.method), !this._transport)) return;
            this._transport?.send(_envelopeOutbound, r).catch((a) => this._onerror(a));
          }));
        return;
      }
      await this._transport.send(_envelopeOutbound, r);
    }
    setRequestHandler(e, t, r) {
      this.assertRequestHandlerCapability(e);
      let s;
      if (typeof t === "function") {
        if (!Qa(e))
          throw TypeError(
            `'${e}' is not a spec request method; pass schemas as the second argument to setRequestHandler().`,
          );
        s = (a, n) => {
          let _negotiatedWireCodec = this._negotiatedWireCodec(),
            validateRequest = _negotiatedWireCodec.validateRequest(e, a);
          if (!validateRequest.ok && validateRequest.reason === "not-in-era")
            validateRequest = _negotiatedWireCodec.validateInputRequest(e, a);
          if (!validateRequest.ok) {
            if (validateRequest.reason === "not-in-era")
              throw new ProtocolError(ma.InternalError, `No wire schema for ${e} in the resolved era`);
            throw Error(validateRequest.message);
          }
          return Promise.resolve(t(validateRequest.value, n));
        };
      } else if (r)
        s = async (a, n) => {
          let i = await tn(t.params, { ...a.params });
          if (!i.success) throw new ProtocolError(ma.InvalidParams, `Invalid params for ${e}: ${i.error}`);
          return r(i.data, n);
        };
      else throw TypeError("setRequestHandler: handler is required");
      this._requestHandlers.set(e, this._wrapHandler(e, s));
    }
    _wrapHandler(e, t) {
      return t;
    }
    _outboundServerInfo() {}
    removeRequestHandler(e) {
      this._requestHandlers.delete(e);
    }
    assertCanSetRequestHandler(e) {
      if (this._requestHandlers.has(e))
        throw Error(`A request handler for ${e} already exists, which would be overridden`);
    }
    setNotificationHandler(e, t, r) {
      if (typeof t === "function") {
        if (!en(e))
          throw TypeError(
            `'${e}' is not a spec notification method; pass schemas as the second argument to setNotificationHandler().`,
          );
        this._notificationHandlers.set(e, (s, a) => {
          let validateNotification = a.validateNotification(e, s);
          if (!validateNotification.ok) {
            if (validateNotification.reason === "not-in-era")
              throw new ProtocolError(ma.InternalError, `No wire schema for ${e} in the resolved era`);
            throw Error(validateNotification.message);
          }
          return Promise.resolve(t(validateNotification.value));
        });
        return;
      }
      if (!r) throw TypeError("setNotificationHandler: handler is required");
      this._notificationHandlers.set(e, async (s) => {
        let a = await tn(t.params, { ...s.params });
        if (!a.success)
          throw new ProtocolError(ma.InvalidParams, `Invalid params for notification ${e}: ${a.error}`);
        await r(a.data, s);
      });
    }
    removeNotificationHandler(e) {
      this._notificationHandlers.delete(e);
    }
  };
//@ chunk-r1g76qsy.js:112999-113070 esm-fingerprint
function Qr(e) {
  return e !== null && typeof e === "object" && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:113070-113206 esm-layout
function qi(e, t) {
  let r = { ...e };
  for (let key in t) {
    let a = key,
      n = t[a];
    if (n === void 0) continue;
    let i = r[a];
    r[a] = Qr(i) && Qr(n) ? { ...i, ...n } : n;
  }
  return r;
}
//@ chunk-r1g76qsy.js:113206-113277 esm-fingerprint
function ia(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-r1g76qsy.js:113277-113481 esm-fingerprint
function uu(e) {
  let t = {},
    r = [];
  if (!ia(e)) return { accepted: t, droppedKeys: r };
  for (let [s, a] of Object.entries(e)) {
    if (!ia(a) || "method" in a || "result" in a) {
      r.push(s);
      continue;
    }
    t[s] = a;
  }
  return { accepted: t, droppedKeys: r };
}
//@ chunk-r1g76qsy.js:113481-113668 esm-fingerprint
function Wn(e) {
  throw new SdkError(
    Ti.SendFailed,
    `ctx.mcpReq.${e} is not available while fulfilling an embedded input request: the request is fulfilled locally and has no related peer request`,
  );
}
//@ chunk-r1g76qsy.js:113668-113826 esm-fingerprint
function du(e, t, r, s, a) {
  return {
    sessionId: a,
    mcpReq: {
      id: e,
      method: t,
      _meta: r?._meta,
      requestState: gn(void 0),
      signal: s,
      send: () => Wn("send"),
      notify: () => Wn("notify"),
    },
  };
}
//@ chunk-r1g76qsy.js:113826-114738 esm-fingerprint
async function hu(e, t, r, s, a) {
  if (!ia(s) || typeof s.method !== "string")
    throw new SdkError(
      Ti.InvalidResult,
      `Invalid input request '${r}': each inputRequests entry must be an embedded request object with a method`,
      { key: r },
    );
  let method = s.method;
  if (!t.hasInputRequestMethod(method))
    throw new SdkError(
      Ti.InvalidResult,
      `Invalid input request '${r}': '${method}' is not an embedded request the ${t.era} revision defines (expected elicitation/create, sampling/createMessage, or roots/list)`,
      { key: r, method: method },
    );
  let requestHandler = e.getRequestHandler(method);
  if (requestHandler === void 0)
    throw new SdkError(
      Ti.CapabilityNotSupported,
      `Cannot fulfil input request '${r}': no handler is registered for '${method}' on this client. Declare the corresponding capability and register a handler, or handle input_required results manually.`,
      { key: r, method: method },
    );
  let l = ia(s.params) ? s.params : void 0;
  return await requestHandler(
    { jsonrpc: "2.0", id: r, method: method, ...(l !== void 0 && { params: l }) },
    e.buildContext(du(r, method, l, a, e.sessionId)),
  );
}
//@ chunk-r1g76qsy.js:114738-115159 esm-fingerprint
function mu(e, t) {
  return {
    ...(e?.signal !== void 0 && { signal: e.signal }),
    ...(e?.onprogress !== void 0 && { onprogress: e.onprogress }),
    ...(e?.resetTimeoutOnProgress !== void 0 && { resetTimeoutOnProgress: e.resetTimeoutOnProgress }),
    ...(e?.headers !== void 0 && { headers: e.headers }),
    ...(t.timeout !== void 0 && { timeout: t.timeout }),
    ...(t.maxTotalTimeout !== void 0 && { maxTotalTimeout: t.maxTotalTimeout }),
    ...(e?.allowTask === !0 && { allowTask: !0 }),
    allowInputRequired: !0,
  };
}
//@ chunk-r1g76qsy.js:115159-115703 esm-fingerprint
function Ii(e, t, r, s) {
  let { codec: codec, request: request, options: options, flowStartedAt: flowStartedAt } = s,
    c = {
      inputRequests: r.inputRequests,
      ...(r.requestState !== void 0 && { requestState: r.requestState }),
    },
    d = {
      dispatchInputRequest: (m, _, w) => hu(e, codec, m, _, w),
      retry: (m, _) => s.retry(m, mu(options, _)),
    };
  return tu({
    config: t,
    method: request.method,
    originalParams: request.params,
    firstPayload: c,
    flowStartedAt: flowStartedAt,
    signal: options?.signal,
    requestOptions: {
      ...(options?.timeout !== void 0 && { timeout: options.timeout }),
      ...(options?.maxTotalTimeout !== void 0 && { maxTotalTimeout: options.maxTotalTimeout }),
      ...(options?.onprogress !== void 0 && { onprogress: options.onprogress }),
    },
    hooks: d,
  });
}
//@ chunk-r1g76qsy.js:115703-115842 esm-fingerprint
function pu(e) {
  return {
    resultType: "input_required",
    inputRequests: e.inputRequests,
    ...(e.requestState !== void 0 && { requestState: e.requestState }),
  };
}
//@ chunk-r1g76qsy.js:117199-117372 esm-fingerprint
function Oi(e) {
  if (!e) return;
  try {
    return Su.parse(e).type;
  } catch {
    let lower = (e.split(";", 1)[0] ?? "").trim().toLowerCase();
    if (lower === "" || e.slice(lower.length).includes(",")) return;
    return lower;
  }
}
//@ chunk-r1g76qsy.js:117372-117999 esm-layout
var Ni = 10485760,
  iLo = class {
    _buffer;
    _maxBufferSize;
    constructor(e) {
      this._maxBufferSize = e?.maxBufferSize ?? Ni;
    }
    append(e) {
      if ((this._buffer?.length ?? 0) + e.length > this._maxBufferSize)
        throw (this.clear(), Error(`ReadBuffer exceeded maximum size of ${this._maxBufferSize} bytes`));
      this._buffer = this._buffer ? Buffer.concat([this._buffer, e]) : e;
    }
    readMessage() {
      while (this._buffer) {
        let index = this._buffer.indexOf(`
`);
        if (index === -1) return null;
        let replaced = this._buffer.toString("utf8", 0, index).replace(/\r$/, "");
        this._buffer = this._buffer.subarray(index + 1);
        try {
          return YNr(replaced);
        } catch (error) {
          if (error instanceof SyntaxError) continue;
          throw error;
        }
      }
      return null;
    }
    clear() {
      this._buffer = void 0;
    }
  };
//@ chunk-r1g76qsy.js:117999-118040 esm-layout
function YNr(e) {
  return Rt(JSON.parse(e));
}
//@ chunk-r1g76qsy.js:118040-118085 esm-layout
function aLo(e) {
  return (
    JSON.stringify(e) +
    `
`
  );
}
//@ chunk-r1g76qsy.js:118085-118240 esm-fingerprint
function to(e) {
  if (!e) return {};
  if (e instanceof Headers) return Object.fromEntries(e.entries());
  if (Array.isArray(e)) return Object.fromEntries(e);
  return { ...e };
}
//@ chunk-r1g76qsy.js:118240-118380 esm-layout
function MBt(e = fetch, t) {
  if (!t) return e;
  return async (r, s) =>
    e(r, { ...t, ...s, headers: s?.headers ? { ...to(t.headers), ...to(s.headers) } : t.headers });
}

export {
  SdkHttpError,
  Ti,
  ProtocolError,
  SdkError,
  ma,
  fZ,
  zAe,
  lYn,
  qNr,
  MBt,
  GAe,
  OAuthError,
  Ie,
  bt,
  Sue,
  Yn,
  Xn,
  Ge,
  la,
  ca,
  ro,
  Be,
  cn,
  ln,
  freeze_2,
  ki,
  wi,
  Ii,
  qi,
  oo,
  fn,
  Ri,
  Gt,
  pa,
  to,
  Rt,
  ha,
  Oi,
  iLo,
  aLo,
  YNr,
  VNr,
};
