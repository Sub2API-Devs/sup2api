/**
 * @aws-sdk/nested-clients/dist-cjs/submodules/sts/runtimeConfig.js
 *
 * AWS STS 运行时配置（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/nested-clients@3.936.0
 * pieces: chunk-a8ee6x44.js (1), chunk-heg39xxp.js (3)
 * attribution: cjs-fingerprint 1, placement 2, esm-layout 1
 */
import { Re, x as x_2 } from "../../../../../../runtime/bun-runtime.js";
import { Rx } from "../../../../core/dist-cjs/index.js";
import { Hme } from "../../../../util-user-agent-node/dist-cjs/index.js";
import { dR } from "../../../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { EE } from "../../../../../@smithy/core/dist-cjs/index.js";
import { Nme, $me } from "../../../../../unresolved-cjs/index.js";
import { dG } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.js";
import { wD, Ume } from "../../../../../@smithy/node-config-provider/dist-cjs/index.js";
import { E$ } from "../../../../../@smithy/node-http-handler/dist-cjs/index.js";
import { Mae } from "../../../../../@smithy/core/dist-cjs/submodules/retry/index.browser.js";
import { ff } from "../../../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { fe, pt } from "./runtimeConfig.shared.js";
import { defaultProvider } from "../../../../credential-provider-node/dist-cjs/index.js";
import { Y } from "../../../../client-sts/package.json.js";
import { M5e } from "../../../../../tslib/tslib.js";
import { _An } from "../../../package.json.js";

//@ chunk-heg39xxp.js:5178-5193 placement
var _ = Re(Rx());
//@ chunk-heg39xxp.js:5193-5304 placement
var A = Re(Hme()),
  u = Re(dR()),
  Se = Re(EE()),
  ye = Re(Nme()),
  f = Re(dG()),
  l = Re(wD()),
  S = Re(E$()),
  Te = Re($me()),
  Pe = Re(Mae());
//@ chunk-heg39xxp.js:11221-13020 esm-layout
var ve = Re(ff()),
  De = Re(Ume()),
  Ce = Re(ff()),
  Ge = (e) => {
    Ce.emitWarningIfUnsupportedVersion(process.version);
    let defaultsModeConfig = De.resolveDefaultsModeConfig(e),
      o = () => defaultsModeConfig().then(ve.loadConfigsForDefaultMode),
      d = fe(e);
    _.emitWarningIfUnsupportedVersion(process.version);
    let i = { profile: e?.profile, logger: d.logger };
    return {
      ...d,
      ...e,
      runtime: "node",
      defaultsMode: defaultsModeConfig,
      authSchemePreference: e?.authSchemePreference ?? l.loadConfig(_.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, i),
      bodyLengthChecker: e?.bodyLengthChecker ?? Te.calculateBodyLength,
      credentialDefaultProvider: e?.credentialDefaultProvider ?? defaultProvider,
      defaultUserAgentProvider:
        e?.defaultUserAgentProvider ??
        A.createDefaultUserAgentProvider({ serviceId: d.serviceId, clientVersion: Y.version }),
      httpAuthSchemes: e?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (p) =>
            p.getIdentityProvider("aws.auth#sigv4") ||
            (async (E) => await defaultProvider(E?.__config || {})()),
          signer: new _.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#noAuth",
          identityProvider: (p) => p.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
          signer: new Se.NoAuthSigner(),
        },
      ],
      maxAttempts: e?.maxAttempts ?? l.loadConfig(f.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, e),
      region:
        e?.region ??
        l.loadConfig(u.NODE_REGION_CONFIG_OPTIONS, { ...u.NODE_REGION_CONFIG_FILE_OPTIONS, ...i }),
      requestHandler: S.NodeHttpHandler.create(e?.requestHandler ?? o),
      retryMode:
        e?.retryMode ??
        l.loadConfig(
          {
            ...f.NODE_RETRY_MODE_CONFIG_OPTIONS,
            default: async () => (await o()).retryMode || Pe.DEFAULT_RETRY_MODE,
          },
          e,
        ),
      sha256: e?.sha256 ?? ye.Hash.bind(null, "sha256"),
      streamCollector: e?.streamCollector ?? S.streamCollector,
      useDualstackEndpoint:
        e?.useDualstackEndpoint ?? l.loadConfig(u.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, i),
      useFipsEndpoint: e?.useFipsEndpoint ?? l.loadConfig(u.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, i),
      userAgentAppId: e?.userAgentAppId ?? l.loadConfig(A.NODE_APP_ID_CONFIG_OPTIONS, i),
    };
  };
//@ chunk-a8ee6x44.js:7841-9866 cjs-fingerprint
var At = x_2(function (yt) {
  Object.defineProperty(yt, "__esModule", { value: !0 });
  yt.getRuntimeConfig = void 0;
  var gt = M5e(),
    __importDefault = gt.__importDefault(_An()),
    N = Rx(),
    G = Hme(),
    v = dR(),
    mt = EE(),
    ht = Nme(),
    z = dG(),
    h = wD(),
    V = E$(),
    _t = $me(),
    ft = Mae(),
    St = pt(),
    Pt = ff(),
    Et = Ume(),
    vt = ff(),
    wo = (e) => {
      vt.emitWarningIfUnsupportedVersion(process.version);
      let defaultsModeConfig = Et.resolveDefaultsModeConfig(e),
        n = () => defaultsModeConfig().then(Pt.loadConfigsForDefaultMode),
        runtimeConfig = St.getRuntimeConfig(e);
      N.emitWarningIfUnsupportedVersion(process.version);
      let r = { profile: e?.profile, logger: runtimeConfig.logger };
      return {
        ...runtimeConfig,
        ...e,
        runtime: "node",
        defaultsMode: defaultsModeConfig,
        authSchemePreference:
          e?.authSchemePreference ?? h.loadConfig(N.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, r),
        bodyLengthChecker: e?.bodyLengthChecker ?? _t.calculateBodyLength,
        defaultUserAgentProvider:
          e?.defaultUserAgentProvider ??
          G.createDefaultUserAgentProvider({
            serviceId: runtimeConfig.serviceId,
            clientVersion: __importDefault.default.version,
          }),
        httpAuthSchemes: e?.httpAuthSchemes ?? [
          {
            schemeId: "aws.auth#sigv4",
            identityProvider: (g) =>
              g.getIdentityProvider("aws.auth#sigv4") ||
              (async (l) => await e.credentialDefaultProvider(l?.__config || {})()),
            signer: new N.AwsSdkSigV4Signer(),
          },
          {
            schemeId: "smithy.api#noAuth",
            identityProvider: (g) => g.getIdentityProvider("smithy.api#noAuth") || (async () => ({})),
            signer: new mt.NoAuthSigner(),
          },
        ],
        maxAttempts: e?.maxAttempts ?? h.loadConfig(z.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, e),
        region:
          e?.region ??
          h.loadConfig(v.NODE_REGION_CONFIG_OPTIONS, { ...v.NODE_REGION_CONFIG_FILE_OPTIONS, ...r }),
        requestHandler: V.NodeHttpHandler.create(e?.requestHandler ?? n),
        retryMode:
          e?.retryMode ??
          h.loadConfig(
            {
              ...z.NODE_RETRY_MODE_CONFIG_OPTIONS,
              default: async () => (await n()).retryMode || ft.DEFAULT_RETRY_MODE,
            },
            e,
          ),
        sha256: e?.sha256 ?? ht.Hash.bind(null, "sha256"),
        streamCollector: e?.streamCollector ?? V.streamCollector,
        useDualstackEndpoint:
          e?.useDualstackEndpoint ?? h.loadConfig(v.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, r),
        useFipsEndpoint: e?.useFipsEndpoint ?? h.loadConfig(v.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, r),
        userAgentAppId: e?.userAgentAppId ?? h.loadConfig(G.NODE_APP_ID_CONFIG_OPTIONS, r),
      };
    };
  yt.getRuntimeConfig = wo;
});

export { At, Ge };
