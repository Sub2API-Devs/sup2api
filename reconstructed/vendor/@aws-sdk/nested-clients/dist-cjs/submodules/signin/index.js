/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (2)
 * attribution: cjs-fingerprint 1, affinity 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ome, Lme } from "../../../../middleware-host-header/dist-cjs/index.js";
import { Mme } from "../../../../middleware-logger/dist-cjs/index.js";
import { Dme } from "../../../../middleware-recursion-detection/dist-cjs/index.js";
import { Oae } from "../../../../middleware-user-agent/dist-cjs/index.js";
import { dR } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { EE } from "../../../../../@smithy/core/dist-cjs/index.js";
import { _D } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";
import { pK } from "../../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { dG } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { U } from "./auth/httpAuthSchemeProvider.js";
import { He } from "./runtimeConfig.js";
import { Dae } from "../../../../region-config-resolver/dist-cjs/index.js";
import { Kg } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-y366fgzk.js:7546-13429 cjs-fingerprint
var Sr = x(function (Q) {
  var Ue = Ome(),
    Ct = Mme(),
    Rt = Dme(),
    Fe = Oae(),
    It = dR(),
    L = EE(),
    P = _D(),
    Ot = Lme(),
    et = pK(),
    Me = dG(),
    _ = ff(),
    je = U(),
    xt = He(),
    Ve = Dae(),
    Le = Kg(),
    Tt = (e) =>
      Object.assign(e, {
        useDualstackEndpoint: e.useDualstackEndpoint ?? !1,
        useFipsEndpoint: e.useFipsEndpoint ?? !1,
        defaultSigningName: "signin",
      }),
    Dt = {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
    },
    qt = (e) => {
      let {
        httpAuthSchemes: httpAuthSchemes,
        httpAuthSchemeProvider: httpAuthSchemeProvider,
        credentials: credentials,
      } = e;
      return {
        setHttpAuthScheme(i) {
          let index = httpAuthSchemes.findIndex((H) => H.schemeId === i.schemeId);
          if (index === -1) httpAuthSchemes.push(i);
          else httpAuthSchemes.splice(index, 1, i);
        },
        httpAuthSchemes() {
          return httpAuthSchemes;
        },
        setHttpAuthSchemeProvider(i) {
          httpAuthSchemeProvider = i;
        },
        httpAuthSchemeProvider() {
          return httpAuthSchemeProvider;
        },
        setCredentials(i) {
          credentials = i;
        },
        credentials() {
          return credentials;
        },
      };
    },
    kt = (e) => ({
      httpAuthSchemes: e.httpAuthSchemes(),
      httpAuthSchemeProvider: e.httpAuthSchemeProvider(),
      credentials: e.credentials(),
    }),
    wt = (e, t) => {
      let merged = Object.assign(
        Ve.getAwsRegionExtensionConfiguration(e),
        _.getDefaultExtensionConfiguration(e),
        Le.getHttpHandlerExtensionConfiguration(e),
        qt(e),
      );
      return (
        t.forEach((d) => d.configure(merged)),
        Object.assign(
          e,
          Ve.resolveAwsRegionExtensionConfiguration(merged),
          _.resolveDefaultRuntimeConfig(merged),
          Le.resolveHttpHandlerRuntimeConfig(merged),
          kt(merged),
        )
      );
    };
  class G extends _.Client {
    config;
    constructor(...[e]) {
      let runtimeConfig = xt.getRuntimeConfig(e || {});
      super(runtimeConfig);
      this.initConfig = runtimeConfig;
      let r = Tt(runtimeConfig),
        userAgentConfig = Fe.resolveUserAgentConfig(r),
        retryConfig = Me.resolveRetryConfig(userAgentConfig),
        regionConfig = It.resolveRegionConfig(retryConfig),
        hostHeaderConfig = Ue.resolveHostHeaderConfig(regionConfig),
        endpointConfig = et.resolveEndpointConfig(hostHeaderConfig),
        httpAuthSchemeConfig = je.resolveHttpAuthSchemeConfig(endpointConfig),
        ct = wt(httpAuthSchemeConfig, e?.extensions || []);
      ((this.config = ct),
        this.middlewareStack.use(P.getSchemaSerdePlugin(this.config)),
        this.middlewareStack.use(Fe.getUserAgentPlugin(this.config)),
        this.middlewareStack.use(Me.getRetryPlugin(this.config)),
        this.middlewareStack.use(Ot.getContentLengthPlugin(this.config)),
        this.middlewareStack.use(Ue.getHostHeaderPlugin(this.config)),
        this.middlewareStack.use(Ct.getLoggerPlugin(this.config)),
        this.middlewareStack.use(Rt.getRecursionDetectionPlugin(this.config)),
        this.middlewareStack.use(
          L.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: je.defaultSigninHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (dt) =>
              new L.DefaultIdentityProviderConfig({ "aws.auth#sigv4": dt.credentials }),
          }),
        ),
        this.middlewareStack.use(L.getHttpSigningPlugin(this.config)));
    }
    destroy() {
      super.destroy();
    }
  }
  var A = class e extends _.ServiceException {
      constructor(t) {
        super(t);
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    tt = class e extends A {
      name = "AccessDeniedException";
      $fault = "client";
      error;
      constructor(t) {
        super({ name: "AccessDeniedException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype), (this.error = t.error));
      }
    },
    rt = class e extends A {
      name = "InternalServerException";
      $fault = "server";
      error;
      constructor(t) {
        super({ name: "InternalServerException", $fault: "server", ...t });
        (Object.setPrototypeOf(this, e.prototype), (this.error = t.error));
      }
    },
    nt = class e extends A {
      name = "TooManyRequestsError";
      $fault = "client";
      error;
      constructor(t) {
        super({ name: "TooManyRequestsError", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype), (this.error = t.error));
      }
    },
    ot = class e extends A {
      name = "ValidationException";
      $fault = "client";
      error;
      constructor(t) {
        super({ name: "ValidationException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype), (this.error = t.error));
      }
    },
    Nt = "AccessDeniedException",
    bt = "AccessToken",
    Ht = "CreateOAuth2Token",
    Ut = "CreateOAuth2TokenRequest",
    Ft = "CreateOAuth2TokenRequestBody",
    Mt = "CreateOAuth2TokenResponseBody",
    jt = "CreateOAuth2TokenResponse",
    Vt = "InternalServerException",
    Lt = "RefreshToken",
    $t = "TooManyRequestsError",
    Gt = "ValidationException",
    $e = "accessKeyId",
    Ge = "accessToken",
    B = "client",
    Be = "clientId",
    ze = "codeVerifier",
    Bt = "code",
    m = "error",
    Ke = "expiresIn",
    Xe = "grantType",
    zt = "http",
    z = "httpError",
    Qe = "idToken",
    c = "jsonName",
    b = "message",
    N = "refreshToken",
    We = "redirectUri",
    Kt = "server",
    Ye = "secretAccessKey",
    Je = "sessionToken",
    st = "smithy.ts.sdk.synthetic.com.amazonaws.signin",
    Xt = "tokenInput",
    Qt = "tokenOutput",
    Ze = "tokenType",
    a = "com.amazonaws.signin",
    it = [0, a, Lt, 8, 0],
    Wt = [-3, a, Nt, { [m]: B }, [m, b], [0, 0]];
  P.TypeRegistry.for(a).registerError(Wt, tt);
  var Yt = [
      3,
      a,
      bt,
      8,
      [$e, Ye, Je],
      [
        [0, { [c]: $e }],
        [0, { [c]: Ye }],
        [0, { [c]: Je }],
      ],
    ],
    Jt = [3, a, Ut, 0, [Xt], [[() => Zt, 16]]],
    Zt = [
      3,
      a,
      Ft,
      0,
      [Be, Xe, Bt, We, ze, N],
      [[0, { [c]: Be }], [0, { [c]: Xe }], 0, [0, { [c]: We }], [0, { [c]: ze }], [() => it, { [c]: N }]],
    ],
    er = [3, a, jt, 0, [Qt], [[() => tr, 16]]],
    tr = [
      3,
      a,
      Mt,
      0,
      [Ge, Ze, Ke, N, Qe],
      [
        [() => Yt, { [c]: Ge }],
        [0, { [c]: Ze }],
        [1, { [c]: Ke }],
        [() => it, { [c]: N }],
        [0, { [c]: Qe }],
      ],
    ],
    rr = [-3, a, Vt, { [m]: Kt, [z]: 500 }, [m, b], [0, 0]];
  P.TypeRegistry.for(a).registerError(rr, rt);
  var nr = [-3, a, $t, { [m]: B, [z]: 429 }, [m, b], [0, 0]];
  P.TypeRegistry.for(a).registerError(nr, nt);
  var or = [-3, a, Gt, { [m]: B, [z]: 400 }, [m, b], [0, 0]];
  P.TypeRegistry.for(a).registerError(or, ot);
  var sr = [-3, st, "SigninServiceException", 0, [], []];
  P.TypeRegistry.for(st).registerError(sr, A);
  var ir = [9, a, Ht, { [zt]: ["POST", "/v1/token", 200] }, () => Jt, () => er];
  class K extends _.Command.classBuilder()
    .ep(Dt)
    .m(function (e, t, r, d) {
      return [et.getEndpointPlugin(r, e.getEndpointParameterInstructions())];
    })
    .s("Signin", "CreateOAuth2Token", {})
    .n("SigninClient", "CreateOAuth2TokenCommand")
    .sc(ir)
    .build() {}
  var ar = { CreateOAuth2TokenCommand: K };
  class X extends G {}
  _.createAggregatedClient(ar, X);
  var ur = {
    AUTHCODE_EXPIRED: "AUTHCODE_EXPIRED",
    INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
    INVALID_REQUEST: "INVALID_REQUEST",
    SERVER_ERROR: "server_error",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    USER_CREDENTIALS_CHANGED: "USER_CREDENTIALS_CHANGED",
  };
  Object.defineProperty(Q, "$Command", {
    enumerable: !0,
    get: function () {
      return _.Command;
    },
  });
  Object.defineProperty(Q, "__Client", {
    enumerable: !0,
    get: function () {
      return _.Client;
    },
  });
  Q.AccessDeniedException = tt;
  Q.CreateOAuth2TokenCommand = K;
  Q.InternalServerException = rt;
  Q.OAuth2ErrorCode = ur;
  Q.Signin = X;
  Q.SigninClient = G;
  Q.SigninServiceException = A;
  Q.TooManyRequestsError = nt;
  Q.ValidationException = ot;
});
//@ chunk-y366fgzk.js:13429-13449 affinity
export default Sr();
