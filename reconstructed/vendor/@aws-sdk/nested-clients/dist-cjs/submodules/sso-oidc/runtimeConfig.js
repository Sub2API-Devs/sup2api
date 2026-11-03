/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sso-oidc/runtimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-ddzww9ex.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { M5e } from "../../../../../tslib/tslib.js";
import { _An } from "../../../package.json.js";
import { Rx } from "../../../../core/dist-cjs/index.js";
import { Hme } from "../../../../util-user-agent-node/dist-cjs/index.js";
import { dR } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { Nme, $me } from "../../../../../unresolved-cjs/index.js";
import { dG } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { wD, Ume } from "../../../../../@smithy/node-config-provider/dist-cjs/index.js";
import { E$ } from "../../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { Mae } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { ye } from "../../../../client-sso/dist-cjs/runtimeConfig.shared.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";

//@ chunk-ddzww9ex.js:5486-7138 cjs-require-graph
var be = x(function (qe) {
  Object.defineProperty(qe, "__esModule", { value: !0 });
  qe.getRuntimeConfig = void 0;
  var Ce = M5e(),
    __importDefault = Ce.__importDefault(_An()),
    R = Rx(),
    T = Hme(),
    S = dR(),
    Pe = Nme(),
    w = dG(),
    s = wD(),
    q = E$(),
    Oe = $me(),
    Ae = Mae(),
    De = ye(),
    Re = ff(),
    Te = Ume(),
    we = ff(),
    ft = (e) => {
      we.emitWarningIfUnsupportedVersion(process.version);
      let defaultsModeConfig = Te.resolveDefaultsModeConfig(e),
        n = () => defaultsModeConfig().then(Re.loadConfigsForDefaultMode),
        runtimeConfig = De.getRuntimeConfig(e);
      R.emitWarningIfUnsupportedVersion(process.version);
      let i = { profile: e?.profile, logger: runtimeConfig.logger };
      return {
        ...runtimeConfig,
        ...e,
        runtime: "node",
        defaultsMode: defaultsModeConfig,
        authSchemePreference:
          e?.authSchemePreference ?? s.loadConfig(R.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, i),
        bodyLengthChecker: e?.bodyLengthChecker ?? Oe.calculateBodyLength,
        defaultUserAgentProvider:
          e?.defaultUserAgentProvider ??
          T.createDefaultUserAgentProvider({
            serviceId: runtimeConfig.serviceId,
            clientVersion: __importDefault.default.version,
          }),
        maxAttempts: e?.maxAttempts ?? s.loadConfig(w.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, e),
        region:
          e?.region ??
          s.loadConfig(S.NODE_REGION_CONFIG_OPTIONS, { ...S.NODE_REGION_CONFIG_FILE_OPTIONS, ...i }),
        requestHandler: q.NodeHttpHandler.create(e?.requestHandler ?? n),
        retryMode:
          e?.retryMode ??
          s.loadConfig(
            {
              ...w.NODE_RETRY_MODE_CONFIG_OPTIONS,
              default: async () => (await n()).retryMode || Ae.DEFAULT_RETRY_MODE,
            },
            e,
          ),
        sha256: e?.sha256 ?? Pe.Hash.bind(null, "sha256"),
        streamCollector: e?.streamCollector ?? q.streamCollector,
        useDualstackEndpoint:
          e?.useDualstackEndpoint ?? s.loadConfig(S.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, i),
        useFipsEndpoint: e?.useFipsEndpoint ?? s.loadConfig(S.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, i),
        userAgentAppId: e?.userAgentAppId ?? s.loadConfig(T.NODE_APP_ID_CONFIG_OPTIONS, i),
      };
    };
  qe.getRuntimeConfig = ft;
});

export { be };
