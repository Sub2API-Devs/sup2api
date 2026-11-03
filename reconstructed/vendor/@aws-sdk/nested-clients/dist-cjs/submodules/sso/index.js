/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso/index.js
 *
 * AWS SSO 客户端（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-kejz1rpb.js (18)
 * attribution: placement 3, esm-fingerprint 10, esm-layout 5
 */
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { Rx } from "../../../../core/dist-cjs/index.js";
import { Hme } from "../../../../util-user-agent-node/dist-cjs/index.js";
import { dR } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { Nme, $me } from "../../../../../unresolved-cjs/index.js";
import { dG } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { wD, Ume } from "../../../../../@smithy/node-config-provider/dist-cjs/index.js";
import { E$ } from "../../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { Mae } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { Fme } from "../../../../core/dist-cjs/submodules/protocols/index.js";
import { EE } from "../../../../../@smithy/core/dist-cjs/index.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { P4 } from "../../../../../@smithy/url-parser/dist-cjs/index.js";
import { base64Module } from "../../../../credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../../../../@smithy/util-utf8/dist-cjs/index.js";
import { Iae } from "../../../../util-endpoints/dist-cjs/index.js";
import { YJ } from "../../../../../@smithy/core/dist-cjs/submodules/endpoints/index.browser.js";
import { Z } from "../signin/endpoint/endpointResolver.js";
import {
  N,
  Ee,
  w,
  P,
  ye,
  A,
  xe,
  D,
  Se,
  ve,
  fe,
  ge,
  d,
  L,
} from "../../../../client-sso/dist-cjs/auth/httpAuthSchemeProvider.js";
import { U } from "../../../../client-sso/package.json.js";
import { Dae } from "../../../../region-config-resolver/dist-cjs/index.js";
import { Kg } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";
import { H } from "../../../../client-sso/dist-cjs/index.js";
import { pK } from "../../../../../@smithy/middleware-endpoint/dist-cjs/index.js";
import { _D } from "../../../../../@smithy/core/dist-cjs/submodules/schema/index.js";

//@ chunk-kejz1rpb.js:4847-4957 placement
var g = Re(Rx()),
  R = Re(Hme()),
  c = Re(dR()),
  ie = Re(Nme()),
  y = Re(dG()),
  a = Re(wD()),
  S = Re(E$()),
  ae = Re($me()),
  ce = Re(Mae());
//@ chunk-kejz1rpb.js:4957-5044 placement
var ee = Re(Rx()),
  te = Re(Fme()),
  oe = Re(EE()),
  se = Re(ff()),
  re = Re(P4()),
  _ = Re(base64Module()),
  f = Re(IR());
//@ chunk-kejz1rpb.js:5044-5071 placement
var X = Re(Iae()),
  p = Re(YJ());
//@ chunk-kejz1rpb.js:7616-7669 esm-fingerprint
p.customEndpointFunctions.aws = X.awsEndpointFunctions;
//@ chunk-kejz1rpb.js:7669-8528 esm-fingerprint
var ne = (e) => ({
  apiVersion: "2019-06-10",
  base64Decoder: e?.base64Decoder ?? _.fromBase64,
  base64Encoder: e?.base64Encoder ?? _.toBase64,
  disableHostPrefix: e?.disableHostPrefix ?? !1,
  endpointProvider: e?.endpointProvider ?? Z,
  extensions: e?.extensions ?? [],
  httpAuthSchemeProvider: e?.httpAuthSchemeProvider ?? N,
  httpAuthSchemes: e?.httpAuthSchemes ?? [
    {
      schemeId: "aws.auth#sigv4",
      identityProvider: (t) => t.getIdentityProvider("aws.auth#sigv4"),
      signer: new ee.AwsSdkSigV4Signer(),
    },
    {
      schemeId: "smithy.api#noAuth",
      identityProvider: (t) => t.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
      signer: new oe.NoAuthSigner(),
    },
  ],
  logger: e?.logger ?? new se.NoOpLogger(),
  protocol: e?.protocol ?? new te.AwsRestJsonProtocol({ defaultNamespace: "com.amazonaws.sso" }),
  serviceId: e?.serviceId ?? "SSO",
  urlParser: e?.urlParser ?? re.parseUrl,
  utf8Decoder: e?.utf8Decoder ?? f.fromUtf8,
  utf8Encoder: e?.utf8Encoder ?? f.toUtf8,
});
//@ chunk-kejz1rpb.js:8528-9926 esm-layout
var pe = Re(ff()),
  de = Re(Ume()),
  ue = Re(ff()),
  le = (e) => {
    ue.emitWarningIfUnsupportedVersion(process.version);
    let defaultsModeConfig = de.resolveDefaultsModeConfig(e),
      o = () => defaultsModeConfig().then(pe.loadConfigsForDefaultMode),
      n = ne(e);
    g.emitWarningIfUnsupportedVersion(process.version);
    let s = { profile: e?.profile, logger: n.logger };
    return {
      ...n,
      ...e,
      runtime: "node",
      defaultsMode: defaultsModeConfig,
      authSchemePreference: e?.authSchemePreference ?? a.loadConfig(g.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, s),
      bodyLengthChecker: e?.bodyLengthChecker ?? ae.calculateBodyLength,
      defaultUserAgentProvider:
        e?.defaultUserAgentProvider ??
        R.createDefaultUserAgentProvider({ serviceId: n.serviceId, clientVersion: U.version }),
      maxAttempts: e?.maxAttempts ?? a.loadConfig(y.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, e),
      region:
        e?.region ??
        a.loadConfig(c.NODE_REGION_CONFIG_OPTIONS, { ...c.NODE_REGION_CONFIG_FILE_OPTIONS, ...s }),
      requestHandler: S.NodeHttpHandler.create(e?.requestHandler ?? o),
      retryMode:
        e?.retryMode ??
        a.loadConfig(
          {
            ...y.NODE_RETRY_MODE_CONFIG_OPTIONS,
            default: async () => (await o()).retryMode || ce.DEFAULT_RETRY_MODE,
          },
          e,
        ),
      sha256: e?.sha256 ?? ie.Hash.bind(null, "sha256"),
      streamCollector: e?.streamCollector ?? S.streamCollector,
      useDualstackEndpoint:
        e?.useDualstackEndpoint ?? a.loadConfig(c.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, s),
      useFipsEndpoint: e?.useFipsEndpoint ?? a.loadConfig(c.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, s),
      userAgentAppId: e?.userAgentAppId ?? a.loadConfig(R.NODE_APP_ID_CONFIG_OPTIONS, s),
    };
  };
//@ chunk-kejz1rpb.js:9926-9964 esm-layout
var v = Re(Dae()),
  x = Re(Kg()),
  E = Re(ff());
//@ chunk-kejz1rpb.js:9964-10431 esm-fingerprint
var me = (e) => {
    let {
      httpAuthSchemes: httpAuthSchemes,
      httpAuthSchemeProvider: httpAuthSchemeProvider,
      credentials: credentials,
    } = e;
    return {
      setHttpAuthScheme(s) {
        let index = httpAuthSchemes.findIndex((O) => O.schemeId === s.schemeId);
        if (index === -1) httpAuthSchemes.push(s);
        else httpAuthSchemes.splice(index, 1, s);
      },
      httpAuthSchemes() {
        return httpAuthSchemes;
      },
      setHttpAuthSchemeProvider(s) {
        httpAuthSchemeProvider = s;
      },
      httpAuthSchemeProvider() {
        return httpAuthSchemeProvider;
      },
      setCredentials(s) {
        credentials = s;
      },
      credentials() {
        return credentials;
      },
    };
  },
  he = (e) => ({
    httpAuthSchemes: e.httpAuthSchemes(),
    httpAuthSchemeProvider: e.httpAuthSchemeProvider(),
    credentials: e.credentials(),
  });
//@ chunk-kejz1rpb.js:10431-10769 esm-fingerprint
var _e = (e, t) => {
  let merged = Object.assign(
    v.getAwsRegionExtensionConfiguration(e),
    E.getDefaultExtensionConfiguration(e),
    x.getHttpHandlerExtensionConfiguration(e),
    me(e),
  );
  return (
    t.forEach((n) => n.configure(merged)),
    Object.assign(
      e,
      v.resolveAwsRegionExtensionConfiguration(merged),
      E.resolveDefaultRuntimeConfig(merged),
      x.resolveHttpHandlerRuntimeConfig(merged),
      he(merged),
    )
  );
};
//@ chunk-kejz1rpb.js:10769-11828 esm-fingerprint
class SSOClient extends Ee.Client {
  config;
  constructor(...[e]) {
    let t = le(e || {});
    super(t);
    this.initConfig = t;
    let o = H(t),
      userAgentConfig = w.resolveUserAgentConfig(o),
      retryConfig = P.resolveRetryConfig(userAgentConfig),
      regionConfig = ye.resolveRegionConfig(retryConfig),
      hostHeaderConfig = A.resolveHostHeaderConfig(regionConfig),
      endpointConfig = xe.resolveEndpointConfig(hostHeaderConfig),
      Te = D(endpointConfig),
      be = _e(Te, e?.extensions || []);
    ((this.config = be),
      this.middlewareStack.use(Se.getSchemaSerdePlugin(this.config)),
      this.middlewareStack.use(w.getUserAgentPlugin(this.config)),
      this.middlewareStack.use(P.getRetryPlugin(this.config)),
      this.middlewareStack.use(ve.getContentLengthPlugin(this.config)),
      this.middlewareStack.use(A.getHostHeaderPlugin(this.config)),
      this.middlewareStack.use(fe.getLoggerPlugin(this.config)),
      this.middlewareStack.use(ge.getRecursionDetectionPlugin(this.config)),
      this.middlewareStack.use(
        d.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: L,
          identityProviderConfigProvider: async (Oe) =>
            new d.DefaultIdentityProviderConfig({ "aws.auth#sigv4": Oe.credentials }),
        }),
      ),
      this.middlewareStack.use(d.getHttpSigningPlugin(this.config)));
  }
  destroy() {
    super.destroy();
  }
}
//@ chunk-kejz1rpb.js:11828-11856 esm-layout
var Pe = Re(pK()),
  Ce = Re(ff());
//@ chunk-kejz1rpb.js:11856-11871 esm-layout
var u = Re(_D());
//@ chunk-kejz1rpb.js:11871-11887 esm-layout
var Ae = Re(ff());
//@ chunk-kejz1rpb.js:11887-11988 esm-fingerprint
class i extends Ae.ServiceException {
  constructor(e) {
    super(e);
    Object.setPrototypeOf(this, i.prototype);
  }
}
//@ chunk-kejz1rpb.js:11988-12170 esm-fingerprint
class C extends i {
  name = "InvalidRequestException";
  $fault = "client";
  constructor(e) {
    super({ name: "InvalidRequestException", $fault: "client", ...e });
    Object.setPrototypeOf(this, C.prototype);
  }
}
//@ chunk-kejz1rpb.js:12170-12356 esm-fingerprint
class I extends i {
  name = "ResourceNotFoundException";
  $fault = "client";
  constructor(e) {
    super({ name: "ResourceNotFoundException", $fault: "client", ...e });
    Object.setPrototypeOf(this, I.prototype);
  }
}
//@ chunk-kejz1rpb.js:12356-12540 esm-fingerprint
class T extends i {
  name = "TooManyRequestsException";
  $fault = "client";
  constructor(e) {
    super({ name: "TooManyRequestsException", $fault: "client", ...e });
    Object.setPrototypeOf(this, T.prototype);
  }
}
//@ chunk-kejz1rpb.js:12540-12718 esm-fingerprint
class b extends i {
  name = "UnauthorizedException";
  $fault = "client";
  constructor(e) {
    super({ name: "UnauthorizedException", $fault: "client", ...e });
    Object.setPrototypeOf(this, b.prototype);
  }
}

export { u, C, I, T, b, i, Ce, Pe, p };
