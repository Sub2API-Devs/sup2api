/**
 * @aws-sdk/client-bedrock/dist-cjs/runtimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock@3.936.0..3.938.0
 * pieces: chunk-0dmzgg46.js (1)
 * attribution: esm-layout 1
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { ff } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { Ume } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { de } from "./runtimeConfig.shared.js";
import { R, c, Ce, v, Q, pe, T, l, f, Ae, me } from "./index.js";
import { defaultProvider } from "../../credential-provider-node/dist-cjs/index.js";
import { Vur, qur } from "../../token-providers/dist-cjs/index.js";

//@ chunk-0dmzgg46.js:8876-10758 esm-layout
var Me = Re(ff()),
  ge = Re(Ume()),
  Pe = Re(ff()),
  ve = (e) => {
    Pe.emitWarningIfUnsupportedVersion(process.version);
    let defaultsModeConfig = ge.resolveDefaultsModeConfig(e),
      t = () => defaultsModeConfig().then(Me.loadConfigsForDefaultMode),
      r = de(e);
    R.emitWarningIfUnsupportedVersion(process.version);
    let a = { profile: e?.profile, logger: r.logger, signingName: "bedrock" };
    return {
      ...r,
      ...e,
      runtime: "node",
      defaultsMode: defaultsModeConfig,
      authSchemePreference: e?.authSchemePreference ?? c.loadConfig(R.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, a),
      bodyLengthChecker: e?.bodyLengthChecker ?? Ce.calculateBodyLength,
      credentialDefaultProvider: e?.credentialDefaultProvider ?? defaultProvider,
      defaultUserAgentProvider:
        e?.defaultUserAgentProvider ??
        v.createDefaultUserAgentProvider({ serviceId: r.serviceId, clientVersion: Q.version }),
      httpAuthSchemes: e?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (n) => n.getIdentityProvider("aws.auth#sigv4"),
          signer: new R.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#httpBearerAuth",
          identityProvider: (n) =>
            n.getIdentityProvider("smithy.api#httpBearerAuth") ||
            (async (u) => {
              try {
                return await Vur({ signingName: "bedrock" })();
              } catch (error) {
                return await qur(u)(u);
              }
            }),
          signer: new pe.HttpBearerAuthSigner(),
        },
      ],
      maxAttempts: e?.maxAttempts ?? c.loadConfig(T.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, e),
      region:
        e?.region ??
        c.loadConfig(l.NODE_REGION_CONFIG_OPTIONS, { ...l.NODE_REGION_CONFIG_FILE_OPTIONS, ...a }),
      requestHandler: f.NodeHttpHandler.create(e?.requestHandler ?? t),
      retryMode:
        e?.retryMode ??
        c.loadConfig(
          {
            ...T.NODE_RETRY_MODE_CONFIG_OPTIONS,
            default: async () => (await t()).retryMode || Ae.DEFAULT_RETRY_MODE,
          },
          e,
        ),
      sha256: e?.sha256 ?? me.Hash.bind(null, "sha256"),
      streamCollector: e?.streamCollector ?? f.streamCollector,
      useDualstackEndpoint:
        e?.useDualstackEndpoint ?? c.loadConfig(l.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, a),
      useFipsEndpoint: e?.useFipsEndpoint ?? c.loadConfig(l.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, a),
      userAgentAppId: e?.userAgentAppId ?? c.loadConfig(v.NODE_APP_ID_CONFIG_OPTIONS, a),
    };
  };

export { ve };
