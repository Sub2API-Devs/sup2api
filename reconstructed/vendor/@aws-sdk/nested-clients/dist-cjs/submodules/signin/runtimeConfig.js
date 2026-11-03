/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/signin/runtimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-y366fgzk.js (1)
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
import { Re } from "./runtimeConfig.shared.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";

//@ chunk-y366fgzk.js:5894-7546 cjs-require-graph
var He = x(function (Ne) {
  Object.defineProperty(Ne, "__esModule", { value: !0 });
  Ne.getRuntimeConfig = void 0;
  var Ie = M5e(),
    __importDefault = Ie.__importDefault(_An()),
    D = Rx(),
    q = Hme(),
    g = dR(),
    Oe = Nme(),
    k = dG(),
    u = wD(),
    w = E$(),
    xe = $me(),
    Te = Mae(),
    De = Re(),
    qe = ff(),
    ke = Ume(),
    we = ff(),
    yt = (e) => {
      we.emitWarningIfUnsupportedVersion(process.version);
      let defaultsModeConfig = ke.resolveDefaultsModeConfig(e),
        r = () => defaultsModeConfig().then(qe.loadConfigsForDefaultMode),
        runtimeConfig = De.getRuntimeConfig(e);
      D.emitWarningIfUnsupportedVersion(process.version);
      let i = { profile: e?.profile, logger: runtimeConfig.logger };
      return {
        ...runtimeConfig,
        ...e,
        runtime: "node",
        defaultsMode: defaultsModeConfig,
        authSchemePreference:
          e?.authSchemePreference ?? u.loadConfig(D.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, i),
        bodyLengthChecker: e?.bodyLengthChecker ?? xe.calculateBodyLength,
        defaultUserAgentProvider:
          e?.defaultUserAgentProvider ??
          q.createDefaultUserAgentProvider({
            serviceId: runtimeConfig.serviceId,
            clientVersion: __importDefault.default.version,
          }),
        maxAttempts: e?.maxAttempts ?? u.loadConfig(k.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, e),
        region:
          e?.region ??
          u.loadConfig(g.NODE_REGION_CONFIG_OPTIONS, { ...g.NODE_REGION_CONFIG_FILE_OPTIONS, ...i }),
        requestHandler: w.NodeHttpHandler.create(e?.requestHandler ?? r),
        retryMode:
          e?.retryMode ??
          u.loadConfig(
            {
              ...k.NODE_RETRY_MODE_CONFIG_OPTIONS,
              default: async () => (await r()).retryMode || Te.DEFAULT_RETRY_MODE,
            },
            e,
          ),
        sha256: e?.sha256 ?? Oe.Hash.bind(null, "sha256"),
        streamCollector: e?.streamCollector ?? w.streamCollector,
        useDualstackEndpoint:
          e?.useDualstackEndpoint ?? u.loadConfig(g.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, i),
        useFipsEndpoint: e?.useFipsEndpoint ?? u.loadConfig(g.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, i),
        userAgentAppId: e?.userAgentAppId ?? u.loadConfig(q.NODE_APP_ID_CONFIG_OPTIONS, i),
      };
    };
  Ne.getRuntimeConfig = yt;
});

export { He };
