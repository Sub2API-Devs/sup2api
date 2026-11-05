/**
 * @aws-sdk/credential-provider-node/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @aws-sdk/credential-provider-node@3.936.0..3.972.2
 * pieces: chunk-qrtqtj8x.js (6)
 * attribution: esm-layout 3, esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { require_shared_ini_file_loader } from "../../../@smithy/shared-ini-file-loader/dist-cjs/index.js";
import { ENV_KEY, ENV_SECRET, fromEnv } from "../../credential-provider-env/dist-cjs/index.js";

//@ chunk-qrtqtj8x.js:1021-1047 esm-layout
var propertyProvider_2 = __toESM(require_property_provider());
var sharedIniFileLoader = __toESM(require_shared_ini_file_loader());
//@ chunk-qrtqtj8x.js:1047-1723 esm-layout
var import_property_provider = __toESM(require_property_provider());
var ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
var remoteProvider = async (init) => {
  let { ENV_CMDS_FULL_URI, ENV_CMDS_RELATIVE_URI, fromContainerMetadata, fromInstanceMetadata } =
    await import("../../../@smithy/credential-provider-imds/dist-cjs/ENV_CMDS_FULL_URI.lazy.js");
  if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
    init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromHttp/fromContainerMetadata");
    let { fromHttp } = await import("../../credential-provider-http/dist-cjs/fromHttp/fromHttp.js");
    return import_property_provider.chain(fromHttp(init), fromContainerMetadata(init));
  }
  if (process.env[ENV_IMDS_DISABLED] && process.env[ENV_IMDS_DISABLED] !== "false")
    return async () => {
      throw new import_property_provider.CredentialsProviderError(
        "EC2 Instance Metadata Service access disabled",
        {
          logger: init.logger,
        },
      );
    };
  init.logger?.debug("@aws-sdk/credential-provider-node - remoteProvider::fromInstanceMetadata");
  return fromInstanceMetadata(init);
};
//@ chunk-qrtqtj8x.js:1723-2018 esm-fingerprint
function memoizeChain(providers, treatAsExpired) {
  let chain = internalCreateChain(providers);
  let activeLock;
  let passiveLock;
  let credentials;
  let provider = async (options) => {
    if (options?.forceRefresh) return await chain(options);
    if (credentials?.expiration) {
      if (credentials?.expiration?.getTime() < Date.now()) credentials = undefined;
    }
    if (activeLock) await activeLock;
    else if (!credentials || treatAsExpired?.(credentials))
      if (credentials) {
        if (!passiveLock)
          passiveLock = chain(options).then((c) => {
            credentials = c;
            passiveLock = undefined;
          });
      } else {
        activeLock = chain(options).then((c) => {
          credentials = c;
          activeLock = undefined;
        });
        return provider(options);
      }
    return credentials;
  };
  return provider;
}
//@ chunk-qrtqtj8x.js:2018-2140 esm-fingerprint
var internalCreateChain = (providers) => async (awsIdentityProperties) => {
  let lastProviderError;
  for (let provider of providers)
    try {
      return await provider(awsIdentityProperties);
    } catch (err) {
      lastProviderError = err;
      if (err?.tryNextLink) continue;
      throw err;
    }
  throw lastProviderError;
};
//@ chunk-qrtqtj8x.js:2140-4216 esm-layout
var multipleCredentialSourceWarningEmitted = false;
var defaultProvider = (init = {}) =>
  memoizeChain(
    [
      async () => {
        if (init.profile ?? process.env[sharedIniFileLoader.ENV_PROFILE]) {
          if (process.env[ENV_KEY] && process.env[ENV_SECRET]) {
            if (!multipleCredentialSourceWarningEmitted) {
              (init.logger?.warn && init.logger?.constructor?.name !== "NoOpLogger"
                ? init.logger.warn.bind(init.logger)
                : console.warn)(`@aws-sdk/credential-provider-node - defaultProvider::fromEnv WARNING:
    Multiple credential sources detected: 
    Both AWS_PROFILE and the pair AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY static credentials are set.
    This SDK will proceed with the AWS_PROFILE value.
    
    However, a future version may change this behavior to prefer the ENV static credentials.
    Please ensure that your environment only sets either the AWS_PROFILE or the
    AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY pair.
`);
              multipleCredentialSourceWarningEmitted = true;
            }
          }
          throw new propertyProvider_2.CredentialsProviderError(
            "AWS_PROFILE is set, skipping fromEnv provider.",
            {
              logger: init.logger,
              tryNextLink: true,
            },
          );
        }
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromEnv");
        return fromEnv(init)();
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromSSO");
        let { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoSession } = init;
        if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession)
          throw new propertyProvider_2.CredentialsProviderError(
            "Skipping SSO provider in default chain (inputs do not include SSO fields).",
            {
              logger: init.logger,
            },
          );
        let { fromSSO } = await import("../../credential-provider-sso/dist-cjs/index.js");
        return fromSSO(init)(awsIdentityProperties);
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromIni");
        let { fromIni } = await import("../../credential-provider-ini/dist-cjs/index.js");
        return fromIni(init)(awsIdentityProperties);
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromProcess");
        let { fromProcess } = await import("../../credential-provider-process/dist-cjs/index.js");
        return fromProcess(init)(awsIdentityProperties);
      },
      async (awsIdentityProperties) => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::fromTokenFile");
        let { fromTokenFile } =
          await import("../../credential-provider-web-identity/dist-cjs/fromTokenFile.lazy.js");
        return fromTokenFile(init)(awsIdentityProperties);
      },
      async () => {
        init.logger?.debug("@aws-sdk/credential-provider-node - defaultProvider::remoteProvider");
        return (await remoteProvider(init))();
      },
      async () => {
        throw new propertyProvider_2.CredentialsProviderError(
          "Could not load credentials from any providers",
          {
            tryNextLink: false,
            logger: init.logger,
          },
        );
      },
    ],
    credentialsTreatedAsExpired,
  );
//@ chunk-qrtqtj8x.js:4216-4292 esm-fingerprint
var credentialsTreatedAsExpired = (credentials) =>
  credentials?.expiration !== undefined && credentials.expiration.getTime() - Date.now() < 300000;
export { defaultProvider };
