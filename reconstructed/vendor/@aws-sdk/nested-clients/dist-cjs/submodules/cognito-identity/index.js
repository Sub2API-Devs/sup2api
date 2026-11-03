/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/cognito-identity/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-heg39xxp.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { Dae } from "../../../../region-config-resolver/dist-cjs/index.js";
import { Kg } from "../../../../../@smithy/protocol-http/dist-cjs/index.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import {
  Le,
  v,
  D,
  Me,
  P,
  Ne,
  Q,
  He,
  Fe,
  We,
  Oe,
  h,
  q,
} from "../../../../client-sts/dist-cjs/auth/httpAuthSchemeProvider.js";
import { Ge } from "../sts/runtimeConfig.js";
import { V } from "../../../../client-sts/dist-cjs/index.js";

//@ chunk-heg39xxp.js:13020-13058 esm-layout
var y = Re(Dae()),
  T = Re(Kg()),
  R = Re(ff());
//@ chunk-heg39xxp.js:13058-13525 esm-fingerprint
var be = (e) => {
    let {
      httpAuthSchemes: httpAuthSchemes,
      httpAuthSchemeProvider: httpAuthSchemeProvider,
      credentials: credentials,
    } = e;
    return {
      setHttpAuthScheme(i) {
        let index = httpAuthSchemes.findIndex((E) => E.schemeId === i.schemeId);
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
  ke = (e) => ({
    httpAuthSchemes: e.httpAuthSchemes(),
    httpAuthSchemeProvider: e.httpAuthSchemeProvider(),
    credentials: e.credentials(),
  });
//@ chunk-heg39xxp.js:13525-13863 esm-fingerprint
var we = (e, t) => {
  let merged = Object.assign(
    y.getAwsRegionExtensionConfiguration(e),
    R.getDefaultExtensionConfiguration(e),
    T.getHttpHandlerExtensionConfiguration(e),
    be(e),
  );
  return (
    t.forEach((d) => d.configure(merged)),
    Object.assign(
      e,
      y.resolveAwsRegionExtensionConfiguration(merged),
      R.resolveDefaultRuntimeConfig(merged),
      T.resolveHttpHandlerRuntimeConfig(merged),
      ke(merged),
    )
  );
};
//@ chunk-heg39xxp.js:13863-14920 esm-fingerprint
class j extends Le.Client {
  config;
  constructor(...[e]) {
    let t = Ge(e || {});
    super(t);
    this.initConfig = t;
    let o = V(t),
      userAgentConfig = v.resolveUserAgentConfig(o),
      retryConfig = D.resolveRetryConfig(userAgentConfig),
      regionConfig = Me.resolveRegionConfig(retryConfig),
      hostHeaderConfig = P.resolveHostHeaderConfig(regionConfig),
      endpointConfig = Ne.resolveEndpointConfig(hostHeaderConfig),
      $e = Q(endpointConfig),
      Je = we($e, e?.extensions || []);
    ((this.config = Je),
      this.middlewareStack.use(He.getSchemaSerdePlugin(this.config)),
      this.middlewareStack.use(v.getUserAgentPlugin(this.config)),
      this.middlewareStack.use(D.getRetryPlugin(this.config)),
      this.middlewareStack.use(Fe.getContentLengthPlugin(this.config)),
      this.middlewareStack.use(P.getHostHeaderPlugin(this.config)),
      this.middlewareStack.use(We.getLoggerPlugin(this.config)),
      this.middlewareStack.use(Oe.getRecursionDetectionPlugin(this.config)),
      this.middlewareStack.use(
        h.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
          httpAuthSchemeParametersProvider: q,
          identityProviderConfigProvider: async (Qe) =>
            new h.DefaultIdentityProviderConfig({ "aws.auth#sigv4": Qe.credentials }),
        }),
      ),
      this.middlewareStack.use(h.getHttpSigningPlugin(this.config)));
  }
  destroy() {
    super.destroy();
  }
}

export { j };
