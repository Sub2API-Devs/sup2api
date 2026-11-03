/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/STSClient.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1)
 * attribution: cjs-require-graph 1
 */
import { x as x_2 } from "../../../../../../runtime/bun-runtime.js";
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
import { ue } from "../../../../client-sts/dist-cjs/auth/httpAuthSchemeProvider.js";
import { de } from "./endpoint/EndpointParameters.js";
import { At } from "./runtimeConfig.js";
import { bt } from "./runtimeExtensions.js";

//@ chunk-a8ee6x44.js:11130-12668 cjs-require-graph
var le = x_2(function (he) {
  Object.defineProperty(he, "__esModule", { value: !0 });
  he.STSClient = he.__Client = void 0;
  var X = Ome(),
    wt = Mme(),
    qt = Dme(),
    Z = Oae(),
    kt = dR(),
    W = EE(),
    Ot = _D(),
    Ht = Lme(),
    Nt = pK(),
    ee = dG(),
    oe = ff();
  Object.defineProperty(he, "__Client", {
    enumerable: !0,
    get: function () {
      return oe.Client;
    },
  });
  var te = ue(),
    Wt = de(),
    jt = At(),
    Ft = bt();
  class Ut extends oe.Client {
    config;
    constructor(...[e]) {
      let runtimeConfig = jt.getRuntimeConfig(e || {});
      super(runtimeConfig);
      this.initConfig = runtimeConfig;
      let clientEndpointParameters = Wt.resolveClientEndpointParameters(runtimeConfig),
        userAgentConfig = Z.resolveUserAgentConfig(clientEndpointParameters),
        retryConfig = ee.resolveRetryConfig(userAgentConfig),
        regionConfig = kt.resolveRegionConfig(retryConfig),
        hostHeaderConfig = X.resolveHostHeaderConfig(regionConfig),
        endpointConfig = Nt.resolveEndpointConfig(hostHeaderConfig),
        httpAuthSchemeConfig = te.resolveHttpAuthSchemeConfig(endpointConfig),
        runtimeExtensions = Ft.resolveRuntimeExtensions(httpAuthSchemeConfig, e?.extensions || []);
      ((this.config = runtimeExtensions),
        this.middlewareStack.use(Ot.getSchemaSerdePlugin(this.config)),
        this.middlewareStack.use(Z.getUserAgentPlugin(this.config)),
        this.middlewareStack.use(ee.getRetryPlugin(this.config)),
        this.middlewareStack.use(Ht.getContentLengthPlugin(this.config)),
        this.middlewareStack.use(X.getHostHeaderPlugin(this.config)),
        this.middlewareStack.use(wt.getLoggerPlugin(this.config)),
        this.middlewareStack.use(qt.getRecursionDetectionPlugin(this.config)),
        this.middlewareStack.use(
          W.getHttpAuthSchemeEndpointRuleSetPlugin(this.config, {
            httpAuthSchemeParametersProvider: te.defaultSTSHttpAuthSchemeParametersProvider,
            identityProviderConfigProvider: async (q) =>
              new W.DefaultIdentityProviderConfig({ "aws.auth#sigv4": q.credentials }),
          }),
        ),
        this.middlewareStack.use(W.getHttpSigningPlugin(this.config)));
    }
    destroy() {
      super.destroy();
    }
  }
  he.STSClient = Ut;
});

export { le };
