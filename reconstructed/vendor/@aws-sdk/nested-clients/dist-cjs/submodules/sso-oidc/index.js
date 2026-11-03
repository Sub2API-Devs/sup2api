/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-ddzww9ex.js (2)
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
import { b } from "./auth/httpAuthSchemeProvider.js";
import { be } from "./runtimeConfig.js";
import { Dae } from "../../../../region-config-resolver/dist-cjs/index.js";
import { Kg } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";

//@ chunk-ddzww9ex.js:7138-16157 cjs-fingerprint
var Yr = x(function (j) {
  var Ue = Ome(),
    xt = Mme(),
    mt = Dme(),
    Ne = Oae(),
    It = dR(),
    H = EE(),
    c = _D(),
    yt = Lme(),
    Ge = pK(),
    He = dG(),
    v = ff(),
    $e = b(),
    Ct = be(),
    Fe = Dae(),
    Me = Kg(),
    Pt = (e) =>
      Object.assign(e, {
        useDualstackEndpoint: e.useDualstackEndpoint ?? !1,
        useFipsEndpoint: e.useFipsEndpoint ?? !1,
        defaultSigningName: "sso-oauth",
      }),
    Ot = {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" },
    },
    At = (e) => {
      let {
        httpAuthSchemes: httpAuthSchemes,
        httpAuthSchemeProvider: httpAuthSchemeProvider,
        credentials: credentials,
      } = e;
      return {
        setHttpAuthScheme(i) {
          let index = httpAuthSchemes.findIndex((k) => k.schemeId === i.schemeId);
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
    Dt = (e) => ({
      httpAuthSchemes: e.httpAuthSchemes(),
      httpAuthSchemeProvider: e.httpAuthSchemeProvider(),
      credentials: e.credentials(),
    }),
    Rt = (e, t) => {
      let merged = Object.assign(
        Fe.getAwsRegionExtensionConfiguration(e),
        v.getDefaultExtensionConfiguration(e),
        Me.getHttpHandlerExtensionConfiguration(e),
        At(e),
      );
      return (
        t.forEach((l) => l.configure(merged)),
        Object.assign(
          e,
          Fe.resolveAwsRegionExtensionConfiguration(merged),
          v.resolveDefaultRuntimeConfig(merged),
          Me.resolveHttpHandlerRuntimeConfig(merged),
          Dt(merged),
        )
      );
    };
  class F extends v.Client {
    config;
    constructor(...[e]) {
      let runtimeConfig = Ct.getRuntimeConfig(e || {});
      super(runtimeConfig);
      this.initConfig = runtimeConfig;
      let n = Pt(runtimeConfig),
        userAgentConfig = Ne.resolveUserAgentConfig(n),
        retryConfig = He.resolveRetryConfig(userAgentConfig),
        regionConfig = It.resolveRegionConfig(retryConfig),
        hostHeaderConfig = Ue.resolveHostHeaderConfig(regionConfig),
        endpointConfig = Ge.resolveEndpointConfig(hostHeaderConfig),
        httpAuthSchemeConfig = $e.resolveHttpAuthSchemeConfig(endpointConfig),
        it = Rt(httpAuthSchemeConfig, e?.extensions || []);
      ((this.config = it),
        this.middlewareStack.use(c.getSchemaSerdePlugin(this.config)),
        this.middlewareStack.use(Ne.getUserAgentPlugin(this.config)),
        this.middlewareStack.use(He.getRetryPlugin(this.config)),
        this.middlewareStack.use(yt.getContentLengthPlugin(this.config)),
        this.middlewareStack.use(Ue.getHostHeaderPlugin(this.config)),
        this.middlewareStack.use(xt.getLoggerPlugin(this.config)),
        this.middlewareStack.use(mt.getRecursionDetectionPlugin(this.config)),
        this.middlewareStack.use(
          H.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: $e.defaultSSOOIDCHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (st) =>
              new H.DefaultIdentityProviderConfig({ "aws.auth#sigv4": st.credentials }),
          }),
        ),
        this.middlewareStack.use(H.getHttpSigningPlugin(this.config)));
    }
    destroy() {
      super.destroy();
    }
  }
  var a = class e extends v.ServiceException {
      constructor(t) {
        super(t);
        Object.setPrototypeOf(this, e.prototype);
      }
    },
    je = class e extends a {
      name = "AccessDeniedException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(t) {
        super({ name: "AccessDeniedException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.reason = t.reason),
          (this.error_description = t.error_description));
      }
    },
    ze = class e extends a {
      name = "AuthorizationPendingException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "AuthorizationPendingException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Ke = class e extends a {
      name = "ExpiredTokenException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "ExpiredTokenException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Le = class e extends a {
      name = "InternalServerException";
      $fault = "server";
      error;
      error_description;
      constructor(t) {
        super({ name: "InternalServerException", $fault: "server", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Ve = class e extends a {
      name = "InvalidClientException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "InvalidClientException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Be = class e extends a {
      name = "InvalidGrantException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "InvalidGrantException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Ye = class e extends a {
      name = "InvalidRequestException";
      $fault = "client";
      error;
      reason;
      error_description;
      constructor(t) {
        super({ name: "InvalidRequestException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.reason = t.reason),
          (this.error_description = t.error_description));
      }
    },
    We = class e extends a {
      name = "InvalidScopeException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "InvalidScopeException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Je = class e extends a {
      name = "SlowDownException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "SlowDownException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Xe = class e extends a {
      name = "UnauthorizedClientException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "UnauthorizedClientException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Qe = class e extends a {
      name = "UnsupportedGrantTypeException";
      $fault = "client";
      error;
      error_description;
      constructor(t) {
        super({ name: "UnsupportedGrantTypeException", $fault: "client", ...t });
        (Object.setPrototypeOf(this, e.prototype),
          (this.error = t.error),
          (this.error_description = t.error_description));
      }
    },
    Tt = "AccessDeniedException",
    wt = "AuthorizationPendingException",
    qt = "AccessToken",
    kt = "ClientSecret",
    bt = "CreateToken",
    Ut = "CreateTokenRequest",
    Nt = "CreateTokenResponse",
    Ht = "CodeVerifier",
    $t = "ExpiredTokenException",
    Ft = "InvalidClientException",
    Mt = "InvalidGrantException",
    Gt = "InvalidRequestException",
    jt = "InternalServerException",
    zt = "InvalidScopeException",
    Kt = "IdToken",
    Lt = "RefreshToken",
    Vt = "SlowDownException",
    Bt = "UnauthorizedClientException",
    Yt = "UnsupportedGrantTypeException",
    Wt = "accessToken",
    E = "client",
    Jt = "clientId",
    Xt = "clientSecret",
    Qt = "codeVerifier",
    Zt = "code",
    er = "deviceCode",
    o = "error",
    tr = "expiresIn",
    h = "error_description",
    rr = "grantType",
    or = "http",
    _ = "httpError",
    nr = "idToken",
    Ze = "reason",
    et = "refreshToken",
    ir = "redirectUri",
    sr = "scope",
    cr = "server",
    tt = "smithy.ts.sdk.synthetic.com.amazonaws.ssooidc",
    ar = "tokenType",
    r = "com.amazonaws.ssooidc",
    pr = [0, r, qt, 8, 0],
    dr = [0, r, kt, 8, 0],
    ur = [0, r, Ht, 8, 0],
    lr = [0, r, Kt, 8, 0],
    rt = [0, r, Lt, 8, 0],
    hr = [-3, r, Tt, { [o]: E, [_]: 400 }, [o, Ze, h], [0, 0, 0]];
  c.TypeRegistry.for(r).registerError(hr, je);
  var _r = [-3, r, wt, { [o]: E, [_]: 400 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(_r, ze);
  var Er = [
      3,
      r,
      Ut,
      0,
      [Jt, Xt, rr, er, Zt, et, sr, ir, Qt],
      [0, [() => dr, 0], 0, 0, 0, [() => rt, 0], 64, 0, [() => ur, 0]],
    ],
    gr = [3, r, Nt, 0, [Wt, ar, tr, et, nr], [[() => pr, 0], 0, 1, [() => rt, 0], [() => lr, 0]]],
    Sr = [-3, r, $t, { [o]: E, [_]: 400 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(Sr, Ke);
  var vr = [-3, r, jt, { [o]: cr, [_]: 500 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(vr, Le);
  var fr = [-3, r, Ft, { [o]: E, [_]: 401 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(fr, Ve);
  var xr = [-3, r, Mt, { [o]: E, [_]: 400 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(xr, Be);
  var mr = [-3, r, Gt, { [o]: E, [_]: 400 }, [o, Ze, h], [0, 0, 0]];
  c.TypeRegistry.for(r).registerError(mr, Ye);
  var Ir = [-3, r, zt, { [o]: E, [_]: 400 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(Ir, We);
  var yr = [-3, r, Vt, { [o]: E, [_]: 400 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(yr, Je);
  var Cr = [-3, r, Bt, { [o]: E, [_]: 400 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(Cr, Xe);
  var Pr = [-3, r, Yt, { [o]: E, [_]: 400 }, [o, h], [0, 0]];
  c.TypeRegistry.for(r).registerError(Pr, Qe);
  var Or = [-3, tt, "SSOOIDCServiceException", 0, [], []];
  c.TypeRegistry.for(tt).registerError(Or, a);
  var Ar = [9, r, bt, { [or]: ["POST", "/token", 200] }, () => Er, () => gr];
  class M extends v.Command.classBuilder()
    .ep(Ot)
    .m(function (e, t, n, l) {
      return [Ge.getEndpointPlugin(n, e.getEndpointParameterInstructions())];
    })
    .s("AWSSSOOIDCService", "CreateToken", {})
    .n("SSOOIDCClient", "CreateTokenCommand")
    .sc(Ar)
    .build() {}
  var Dr = { CreateTokenCommand: M };
  class G extends F {}
  v.createAggregatedClient(Dr, G);
  var Rr = { KMS_ACCESS_DENIED: "KMS_AccessDeniedException" },
    Tr = {
      KMS_DISABLED_KEY: "KMS_DisabledException",
      KMS_INVALID_KEY_USAGE: "KMS_InvalidKeyUsageException",
      KMS_INVALID_STATE: "KMS_InvalidStateException",
      KMS_KEY_NOT_FOUND: "KMS_NotFoundException",
    };
  Object.defineProperty(j, "$Command", {
    enumerable: !0,
    get: function () {
      return v.Command;
    },
  });
  Object.defineProperty(j, "__Client", {
    enumerable: !0,
    get: function () {
      return v.Client;
    },
  });
  j.AccessDeniedException = je;
  j.AccessDeniedExceptionReason = Rr;
  j.AuthorizationPendingException = ze;
  j.CreateTokenCommand = M;
  j.ExpiredTokenException = Ke;
  j.InternalServerException = Le;
  j.InvalidClientException = Ve;
  j.InvalidGrantException = Be;
  j.InvalidRequestException = Ye;
  j.InvalidRequestExceptionReason = Tr;
  j.InvalidScopeException = We;
  j.SSOOIDC = G;
  j.SSOOIDCClient = F;
  j.SSOOIDCServiceException = a;
  j.SlowDownException = Je;
  j.UnauthorizedClientException = Xe;
  j.UnsupportedGrantTypeException = Qe;
});
//@ chunk-ddzww9ex.js:16157-16177 affinity
export default Yr();
