/**
 * @aws-sdk/client-bedrock-runtime/dist-cjs/runtimeConfig.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/client-bedrock-runtime@3.936.0..3.938.0
 * pieces: chunk-3cddmtk7.js (1)
 * attribution: esm-layout 1
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { ff } from "../../../@smithy/core/dist-cjs/submodules/client/index.js";
import { Ume } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { Xe } from "./runtimeConfig.shared.js";
import { y, Ee } from "../../eventstream-handler-node/dist-es/EventSigningStream.js";
import { C, Ke, Te, P, b, Je, Qe } from "../../../_unknown/bedrockRuntimeConfig.js";
import { defaultProvider } from "../../credential-provider-node/dist-cjs/index.js";
import { D, ne, ze, v } from "../../../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { Vur, qur } from "../../token-providers/dist-cjs/index.js";

//@ chunk-3cddmtk7.js:24302-26372 esm-layout
var Ze = Re(ff()),
  Ye = Re(Ume()),
  et = Re(ff()),
  tt = (e) => {
    et.emitWarningIfUnsupportedVersion(process.version);
    let defaultsModeConfig = Ye.resolveDefaultsModeConfig(e),
      o = () => defaultsModeConfig().then(Ze.loadConfigsForDefaultMode),
      r = Xe(e);
    y.emitWarningIfUnsupportedVersion(process.version);
    let n = { profile: e?.profile, logger: r.logger, signingName: "bedrock" };
    return {
      ...r,
      ...e,
      runtime: "node",
      defaultsMode: defaultsModeConfig,
      authSchemePreference: e?.authSchemePreference ?? C.loadConfig(y.NODE_AUTH_SCHEME_PREFERENCE_OPTIONS, n),
      bodyLengthChecker: e?.bodyLengthChecker ?? Ke.calculateBodyLength,
      credentialDefaultProvider: e?.credentialDefaultProvider ?? defaultProvider,
      defaultUserAgentProvider:
        e?.defaultUserAgentProvider ??
        D.createDefaultUserAgentProvider({ serviceId: r.serviceId, clientVersion: Ee.version }),
      eventStreamPayloadHandlerProvider: e?.eventStreamPayloadHandlerProvider ?? ne,
      eventStreamSerdeProvider: e?.eventStreamSerdeProvider ?? Te,
      httpAuthSchemes: e?.httpAuthSchemes ?? [
        {
          schemeId: "aws.auth#sigv4",
          identityProvider: (s) => s.getIdentityProvider("aws.auth#sigv4"),
          signer: new y.AwsSdkSigV4Signer(),
        },
        {
          schemeId: "smithy.api#httpBearerAuth",
          identityProvider: (s) =>
            s.getIdentityProvider("smithy.api#httpBearerAuth") ||
            (async (a) => {
              try {
                return await Vur({ signingName: "bedrock" })();
              } catch (error) {
                return await qur(a)(a);
              }
            }),
          signer: new ze.HttpBearerAuthSigner(),
        },
      ],
      maxAttempts: e?.maxAttempts ?? C.loadConfig(P.NODE_MAX_ATTEMPT_CONFIG_OPTIONS, e),
      region:
        e?.region ??
        C.loadConfig(v.NODE_REGION_CONFIG_OPTIONS, { ...v.NODE_REGION_CONFIG_FILE_OPTIONS, ...n }),
      requestHandler: b.NodeHttp2Handler.create(
        e?.requestHandler ?? (async () => ({ ...(await o()), disableConcurrentStreams: !0 })),
      ),
      retryMode:
        e?.retryMode ??
        C.loadConfig(
          {
            ...P.NODE_RETRY_MODE_CONFIG_OPTIONS,
            default: async () => (await o()).retryMode || Je.DEFAULT_RETRY_MODE,
          },
          e,
        ),
      sha256: e?.sha256 ?? Qe.Hash.bind(null, "sha256"),
      streamCollector: e?.streamCollector ?? b.streamCollector,
      useDualstackEndpoint:
        e?.useDualstackEndpoint ?? C.loadConfig(v.NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS, n),
      useFipsEndpoint: e?.useFipsEndpoint ?? C.loadConfig(v.NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS, n),
      userAgentAppId: e?.userAgentAppId ?? C.loadConfig(D.NODE_APP_ID_CONFIG_OPTIONS, n),
    };
  };

export { tt };
