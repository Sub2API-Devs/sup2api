/**
 * @aws-sdk/credential-providers/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/credential-providers@3.1153.0..3.1161.0
 * pieces: chunk-thwbpw6e.js (7)
 * attribution: esm-layout 6, esm-fingerprint 1
 */
import { Re } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../../@smithy/property-provider/dist-cjs/index.js";
import { fromEnv } from "../../credential-provider-env/dist-cjs/index.js";
import { fromIni } from "../../credential-provider-ini/dist-cjs/index.js";
import { defaultProvider } from "../../credential-provider-node/dist-cjs/index.js";
import { require_index_native } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_node_config_provider } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { require_core } from "../../../@smithy/core/dist-cjs/index.js";

//@ chunk-thwbpw6e.js:561-1125 esm-layout
var ProviderError = Re(require_property_provider());
var O = (...credentialProviders) => {
  let expireAfter = -1;
  let withOptions = Object.assign(
    async (awsIdentityProperties) => {
      let credentials = await propertyProviderChain(...credentialProviders)(awsIdentityProperties);
      if (!credentials.expiration && expireAfter !== -1)
        credentials.expiration = new Date(Date.now() + expireAfter);
      return credentials;
    },
    {
      expireAfter(milliseconds) {
        if (milliseconds < 300000)
          throw Error(
            "@aws-sdk/credential-providers - createCredentialChain(...).expireAfter(ms) may not be called with a duration lower than five minutes.",
          );
        expireAfter = milliseconds;
        return withOptions;
      },
    },
  );
  return withOptions;
};
var propertyProviderChain =
  (...providers) =>
  async (awsIdentityProperties) => {
    if (providers.length === 0)
      throw new ProviderError.ProviderError("No providers in chain", {
        tryNextLink: false,
      });
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
//@ chunk-thwbpw6e.js:1125-1143 esm-layout
var R = (init) => fromEnv(init);
//@ chunk-thwbpw6e.js:1143-1169 esm-layout
var F = (e = {}) =>
  fromIni({
    ...e,
  });
//@ chunk-thwbpw6e.js:1169-1195 esm-layout
var v = (init = {}) =>
  defaultProvider({
    ...init,
  });
//@ chunk-thwbpw6e.js:1195-1221 esm-layout
var NODE_REGION_CONFIG_FILE_OPTIONS = Re(require_index_native());
var loadConfig = Re(require_node_config_provider());
//@ chunk-thwbpw6e.js:1221-3607 esm-layout
var normalizeProvider = Re(require_core());
var CredentialsProviderError = Re(require_property_provider());
var ASSUME_ROLE_DEFAULT_REGION = "us-east-1";
var fromTemporaryCredentials$1 = (options, credentialDefaultProvider, regionProvider) => {
  let stsClient;
  return async (awsIdentityProperties = {}) => {
    let { callerClientConfig } = awsIdentityProperties;
    let profile = options.clientConfig?.profile ?? callerClientConfig?.profile;
    let logger = options.logger ?? callerClientConfig?.logger;
    logger?.debug("@aws-sdk/credential-providers - fromTemporaryCredentials (STS)");
    let params = {
      ...options.params,
      RoleSessionName: options.params.RoleSessionName ?? "aws-sdk-js-" + Date.now(),
    };
    if (params?.SerialNumber) {
      if (!options.mfaCodeProvider)
        throw new CredentialsProviderError.CredentialsProviderError(
          "Temporary credential requires multi-factor authentication, but no MFA code callback was provided.",
          {
            tryNextLink: false,
            logger,
          },
        );
      params.TokenCode = await options.mfaCodeProvider(params?.SerialNumber);
    }
    let { AssumeRoleCommand, STSClient } = await import("./chunk-nm3tp7ry.js");
    if (!stsClient) {
      let defaultCredentialsOrError =
        typeof credentialDefaultProvider === "function" ? credentialDefaultProvider() : undefined;
      let credentialSources = [
        options.masterCredentials,
        options.clientConfig?.credentials,
        void callerClientConfig?.credentials,
        callerClientConfig?.credentialDefaultProvider?.(),
        defaultCredentialsOrError,
      ];
      let credentialSource = "STS client default credentials";
      if (credentialSources[0]) credentialSource = "options.masterCredentials";
      else if (credentialSources[1]) credentialSource = "options.clientConfig.credentials";
      else if (credentialSources[2]) {
        credentialSource = "caller client's credentials";
        throw Error("fromTemporaryCredentials recursion in callerClientConfig.credentials");
      } else if (credentialSources[3]) credentialSource = "caller client's credentialDefaultProvider";
      else if (credentialSources[4]) credentialSource = "AWS SDK default credentials";
      let regionSources = [
        options.clientConfig?.region,
        callerClientConfig?.region,
        await regionProvider?.({
          profile,
        }),
        ASSUME_ROLE_DEFAULT_REGION,
      ];
      let regionSource = "default partition's default region";
      if (regionSources[0]) regionSource = "options.clientConfig.region";
      else if (regionSources[1]) regionSource = "caller client's region";
      else if (regionSources[2]) regionSource = "file or env region";
      let requestHandlerSources = [
        filterRequestHandler(options.clientConfig?.requestHandler),
        filterRequestHandler(callerClientConfig?.requestHandler),
      ];
      let requestHandlerSource = "STS default requestHandler";
      if (requestHandlerSources[0]) requestHandlerSource = "options.clientConfig.requestHandler";
      else if (requestHandlerSources[1]) requestHandlerSource = "caller client's requestHandler";
      logger?.debug?.(
        `@aws-sdk/credential-providers - fromTemporaryCredentials STS client init with ${regionSource}=${await normalizeProvider.normalizeProvider(coalesce(regionSources))()}, ${credentialSource}, ${requestHandlerSource}.`,
      );
      stsClient = new STSClient({
        userAgentAppId: callerClientConfig?.userAgentAppId,
        ...options.clientConfig,
        credentials: coalesce(credentialSources),
        logger,
        profile,
        region: coalesce(regionSources),
        requestHandler: coalesce(requestHandlerSources),
      });
    }
    if (options.clientPlugins)
      for (let plugin of options.clientPlugins) stsClient.middlewareStack.use(plugin);
    let { Credentials } = await stsClient.send(new AssumeRoleCommand(params));
    if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey)
      throw new CredentialsProviderError.CredentialsProviderError(
        `Invalid response from STS.assumeRole call with role ${params.RoleArn}`,
        {
          logger,
        },
      );
    return {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken,
      expiration: Credentials.Expiration,
      credentialScope: Credentials.CredentialScope,
    };
  };
};
var filterRequestHandler = (requestHandler) =>
  requestHandler?.metadata?.handlerProtocol === "h2" ? undefined : requestHandler;
var coalesce = (args) => {
  for (let item of args) if (item !== undefined) return item;
};
//@ chunk-thwbpw6e.js:3607-3836 esm-fingerprint
var fromTemporaryCredentials = (options) =>
  fromTemporaryCredentials$1(options, v, async ({ profile = process.env.AWS_PROFILE }) =>
    loadConfig.loadConfig(
      {
        environmentVariableSelector: (env) => env.AWS_REGION,
        configFileSelector: (profileData) => profileData.region,
        default: () => {
          return;
        },
      },
      {
        ...NODE_REGION_CONFIG_FILE_OPTIONS.NODE_REGION_CONFIG_FILE_OPTIONS,
        profile,
      },
    )(),
  );
