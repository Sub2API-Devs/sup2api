/**
 * @smithy/credential-provider-imds/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/credential-provider-imds@4.3.0..4.3.9
 * pieces: chunk-s21g8j63.js (32)
 * attribution: esm-fingerprint 10, esm-layout 22
 */
import { request } from "http";
import { Buffer as ae } from "buffer";
import { parse } from "url";
import { __esm, __toESM } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../property-provider/dist-cjs/index.js";
import { require_node_config_provider } from "../../node-config-provider/dist-cjs/index.js";
import { require_url_parser } from "../../url-parser/dist-cjs/index.js";

//@ chunk-s21g8j63.js:431-1060 esm-fingerprint
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    let req = request({
      method: "GET",
      ...options,
      hostname: options.hostname?.replace(/^\[(.+)\]$/, "$1"),
    });
    req.on("error", (err) => {
      reject(
        Object.assign(
          new propertyProviderModule.ProviderError("Unable to connect to instance metadata service"),
          err,
        ),
      );
      req.destroy();
    });
    req.on("timeout", () => {
      reject(new propertyProviderModule.ProviderError("TimeoutError from instance metadata service"));
      req.destroy();
    });
    req.on("response", (res) => {
      let { statusCode = 400 } = res;
      if (statusCode < 200 || 300 <= statusCode) {
        reject(
          Object.assign(
            new propertyProviderModule.ProviderError(
              "Error response received from instance metadata service",
            ),
            {
              statusCode,
            },
          ),
        );
        req.destroy();
      }
      let chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        resolve(ae.concat(chunks));
        req.destroy();
      });
    });
    req.end();
  });
}
//@ chunk-s21g8j63.js:1060-1066 esm-layout
var propertyProviderModule;
//@ chunk-s21g8j63.js:1066-1093 esm-layout
var init_credential_provider_imds = __esm(() => {
  propertyProviderModule = __toESM(require_property_provider());
});
//@ chunk-s21g8j63.js:1093-1431 esm-fingerprint
var isImdsCredentials = (arg) =>
  Boolean(arg) &&
  typeof arg === "object" &&
  typeof arg.AccessKeyId === "string" &&
  typeof arg.SecretAccessKey === "string" &&
  typeof arg.Token === "string" &&
  typeof arg.Expiration === "string";
var fromImdsCredentials = (creds) => ({
  accessKeyId: creds.AccessKeyId,
  secretAccessKey: creds.SecretAccessKey,
  sessionToken: creds.Token,
  expiration: new Date(creds.Expiration),
  ...(creds.AccountId && {
    accountId: creds.AccountId,
  }),
});
//@ chunk-s21g8j63.js:1431-1444 esm-layout
var noopStub1 = () => {};
//@ chunk-s21g8j63.js:1444-1512 esm-fingerprint
var providerConfigFromInit = ({ maxRetries = 0, timeout = 1000 }) => ({
  maxRetries,
  timeout,
});
//@ chunk-s21g8j63.js:1512-1525 esm-layout
var noopStub2 = () => {};
//@ chunk-s21g8j63.js:1525-1592 esm-layout
var retry = (toRetry, maxRetries) => {
  let promise = toRetry();
  for (let i = 0; i < maxRetries; i++) promise = promise.catch(toRetry);
  return promise;
};
//@ chunk-s21g8j63.js:1592-1605 esm-layout
var noopStub3 = () => {};
//@ chunk-s21g8j63.js:1634-2878 esm-layout
var propertyProviderModule2;
var AWS_CONTAINER_CREDENTIALS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI";
var AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI";
var AWS_CONTAINER_AUTHORIZATION_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN";
var fromContainerMetadata = (init = {}) => {
  let { timeout, maxRetries } = providerConfigFromInit(init);
  return () =>
    retry(async () => {
      let options = await getCmdsUri({
        logger: init.logger,
      });
      let parsed = JSON.parse(await requestFromEcsImds(timeout, options));
      if (!isImdsCredentials(parsed))
        throw new propertyProviderModule2.CredentialsProviderError(
          "Invalid response received from instance metadata service.",
          {
            logger: init.logger,
          },
        );
      return fromImdsCredentials(parsed);
    }, maxRetries);
};
var requestFromEcsImds = async (timeout, options) => {
  if (process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN])
    options.headers = {
      ...options.headers,
      Authorization: process.env[AWS_CONTAINER_AUTHORIZATION_TOKEN],
    };
  return (
    await httpRequest({
      ...options,
      timeout,
    })
  ).toString();
};
var CMDS_IP = "169.254.170.2";
var GREENGRASS_HOSTS;
var GREENGRASS_PROTOCOLS;
var getCmdsUri = async ({ logger }) => {
  if (process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI])
    return {
      hostname: CMDS_IP,
      path: process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI],
    };
  if (process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI]) {
    let parsed = parse(process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI]);
    if (!parsed.hostname || !(parsed.hostname in GREENGRASS_HOSTS))
      throw new propertyProviderModule2.CredentialsProviderError(
        `${parsed.hostname} is not a valid container metadata service hostname`,
        {
          tryNextLink: false,
          logger,
        },
      );
    if (!parsed.protocol || !(parsed.protocol in GREENGRASS_PROTOCOLS))
      throw new propertyProviderModule2.CredentialsProviderError(
        `${parsed.protocol} is not a valid container metadata service protocol`,
        {
          tryNextLink: false,
          logger,
        },
      );
    return {
      ...parsed,
      port: parsed.port ? parseInt(parsed.port, 10) : undefined,
    };
  }
  throw new propertyProviderModule2.CredentialsProviderError(
    `The container metadata credential provider cannot be used unless the ${AWS_CONTAINER_CREDENTIALS_RELATIVE_URI} or ${AWS_CONTAINER_CREDENTIALS_FULL_URI} environment variable is set`,
    {
      tryNextLink: false,
      logger,
    },
  );
};
//@ chunk-s21g8j63.js:2878-2982 esm-layout
var init_credential_provider_imds_2 = __esm(() => {
  init_credential_provider_imds();
  noopStub1();
  noopStub2();
  noopStub3();
  propertyProviderModule2 = __toESM(require_property_provider());
  GREENGRASS_HOSTS = {
    localhost: true,
    "127.0.0.1": true,
  };
  GREENGRASS_PROTOCOLS = {
    "http:": true,
    "https:": true,
  };
});
//@ chunk-s21g8j63.js:2982-2990 esm-layout
var propertyProviderModule3;
var InstanceMetadataV1FallbackError;
//@ chunk-s21g8j63.js:2990-3205 esm-fingerprint
var init_credential_provider_imds_3 = __esm(() => {
  propertyProviderModule3 = __toESM(require_property_provider());
  InstanceMetadataV1FallbackError = class InstanceMetadataV1FallbackError extends (
    propertyProviderModule3.CredentialsProviderError
  ) {
    tryNextLink;
    name = "InstanceMetadataV1FallbackError";
    constructor(message, tryNextLink = true) {
      super(message, tryNextLink);
      this.tryNextLink = tryNextLink;
      Object.setPrototypeOf(this, InstanceMetadataV1FallbackError.prototype);
    }
  };
});
//@ chunk-s21g8j63.js:3205-3211 esm-layout
var Endpoint;
//@ chunk-s21g8j63.js:3211-3317 esm-fingerprint
var init_credential_provider_imds_4 = __esm(() => {
  (function (Endpoint) {
    Endpoint.IPv4 = "http://169.254.169.254";
    Endpoint.IPv6 = "http://[fd00:ec2::254]";
  })(Endpoint || (Endpoint = {}));
});
//@ chunk-s21g8j63.js:3317-3323 esm-layout
var ENDPOINT_CONFIG_OPTIONS;
//@ chunk-s21g8j63.js:3323-3483 esm-layout
var init_credential_provider_imds_5 = __esm(() => {
  ENDPOINT_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env.AWS_EC2_METADATA_SERVICE_ENDPOINT,
    configFileSelector: (profile) => profile.ec2_metadata_service_endpoint,
    default: undefined,
  };
});
//@ chunk-s21g8j63.js:3483-3489 esm-layout
var EndpointMode;
//@ chunk-s21g8j63.js:3489-3559 esm-fingerprint
var init_credential_provider_imds_6 = __esm(() => {
  (function (EndpointMode) {
    EndpointMode.IPv4 = "IPv4";
    EndpointMode.IPv6 = "IPv6";
  })(EndpointMode || (EndpointMode = {}));
});
//@ chunk-s21g8j63.js:3559-3649 esm-fingerprint
var AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE = "AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE";
var EC2_METADATA_SERVICE_ENDPOINT_MODE = "ec2_metadata_service_endpoint_mode";
var ENDPOINT_MODE_CONFIG_OPTIONS;
//@ chunk-s21g8j63.js:3649-3757 esm-fingerprint
var getExtendedInstanceMetadataCredentials = __esm(() => {
  init_credential_provider_imds_6();
  ENDPOINT_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE],
    configFileSelector: (profile) => profile[EC2_METADATA_SERVICE_ENDPOINT_MODE],
    default: EndpointMode.IPv4,
  };
});
//@ chunk-s21g8j63.js:3757-4036 esm-layout
var config;
var urlParserModule;
var getInstanceMetadataEndpoint = async () =>
  urlParserModule.parseUrl((await getFromEndpointConfig()) || (await getFromEndpointModeConfig()));
var getFromEndpointConfig = async () => config.loadConfig(ENDPOINT_CONFIG_OPTIONS)();
var getFromEndpointModeConfig = async () => {
  let endpointMode = await config.loadConfig(ENDPOINT_MODE_CONFIG_OPTIONS)();
  switch (endpointMode) {
    case EndpointMode.IPv4:
      return Endpoint.IPv4;
    case EndpointMode.IPv6:
      return Endpoint.IPv6;
    default:
      throw Error(`Unsupported endpoint mode: ${endpointMode}. Select from ${Object.values(EndpointMode)}`);
  }
};
//@ chunk-s21g8j63.js:4036-4090 esm-layout
var init_credential_provider_imds_7 = __esm(() => {
  init_credential_provider_imds_4();
  init_credential_provider_imds_5();
  init_credential_provider_imds_6();
  getExtendedInstanceMetadataCredentials();
  config = __toESM(require_node_config_provider());
  urlParserModule = __toESM(require_url_parser());
});
//@ chunk-s21g8j63.js:4090-4561 esm-fingerprint
var extendInstanceMetadataCredentials = (credentials, logger) => {
  let refreshInterval = 300 + Math.floor(Math.random() * 300);
  let newExpiration = new Date(Date.now() + refreshInterval * 1000);
  logger.warn(`Attempting credential expiration extension due to a credential service availability issue. A refresh of these credentials will be attempted after ${new Date(newExpiration)}.
For more information, please visit: https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html`);
  let originalExpiration = credentials.originalExpiration ?? credentials.expiration;
  return {
    ...credentials,
    ...(originalExpiration
      ? {
          originalExpiration,
        }
      : {}),
    expiration: newExpiration,
  };
};
//@ chunk-s21g8j63.js:4561-4574 esm-layout
var noopStub4 = () => {};
//@ chunk-s21g8j63.js:4574-4806 esm-fingerprint
var staticStabilityProvider = (instanceMetadataProvider, options = {}) => {
  let logger = options?.logger || console;
  let pastCredentials;
  return async () => {
    let credentials;
    try {
      credentials = await instanceMetadataProvider();
      if (credentials.expiration && credentials.expiration.getTime() < Date.now())
        credentials = extendInstanceMetadataCredentials(credentials, logger);
    } catch (e) {
      if (pastCredentials) {
        logger.warn("Credential renew failed: ", e);
        credentials = extendInstanceMetadataCredentials(pastCredentials, logger);
      } else throw e;
    }
    pastCredentials = credentials;
    return credentials;
  };
};
//@ chunk-s21g8j63.js:4806-4826 esm-layout
var init_credential_provider_imds_8 = __esm(() => {
  noopStub4();
});
//@ chunk-s21g8j63.js:4826-6960 esm-layout
var configModule;
var config_2;
var IMDS_PATH = "/latest/meta-data/iam/security-credentials/";
var IMDS_TOKEN_PATH = "/latest/api/token";
var AWS_EC2_METADATA_V1_DISABLED = "AWS_EC2_METADATA_V1_DISABLED";
var PROFILE_AWS_EC2_METADATA_V1_DISABLED = "ec2_metadata_v1_disabled";
var X_AWS_EC2_METADATA_TOKEN = "x-aws-ec2-metadata-token";
var fromInstanceMetadata = (init = {}) =>
  staticStabilityProvider(getInstanceMetadataProvider(init), {
    logger: init.logger,
  });
var getInstanceMetadataProvider = (init = {}) => {
  let disableFetchToken = false;
  let { logger, profile } = init;
  let { timeout, maxRetries } = providerConfigFromInit(init);
  let getCredentials = async (maxRetries, options) => {
    if (disableFetchToken || options.headers?.[X_AWS_EC2_METADATA_TOKEN] == null) {
      let fallbackBlockedFromProfile = false;
      let fallbackBlockedFromProcessEnv = false;
      let configValue = await configModule.loadConfig(
        {
          environmentVariableSelector: (env) => {
            let envValue = env[AWS_EC2_METADATA_V1_DISABLED];
            fallbackBlockedFromProcessEnv = !!envValue && envValue !== "false";
            if (envValue === undefined)
              throw new config_2.CredentialsProviderError(
                `${AWS_EC2_METADATA_V1_DISABLED} not set in env, checking config file next.`,
                {
                  logger: init.logger,
                },
              );
            return fallbackBlockedFromProcessEnv;
          },
          configFileSelector: (profile) => {
            let profileValue = profile[PROFILE_AWS_EC2_METADATA_V1_DISABLED];
            fallbackBlockedFromProfile = !!profileValue && profileValue !== "false";
            return fallbackBlockedFromProfile;
          },
          default: false,
        },
        {
          profile,
        },
      )();
      if (init.ec2MetadataV1Disabled || configValue) {
        let causes = [];
        if (init.ec2MetadataV1Disabled)
          causes.push("credential provider initialization (runtime option ec2MetadataV1Disabled)");
        if (fallbackBlockedFromProfile)
          causes.push(`config file profile (${PROFILE_AWS_EC2_METADATA_V1_DISABLED})`);
        if (fallbackBlockedFromProcessEnv)
          causes.push(`process environment variable (${AWS_EC2_METADATA_V1_DISABLED})`);
        throw new InstanceMetadataV1FallbackError(
          `AWS EC2 Metadata v1 fallback has been blocked by AWS SDK configuration in the following: [${causes.join(", ")}].`,
        );
      }
    }
    let imdsProfile = (
      await retry(async () => {
        let profile;
        try {
          profile = await getProfile(options);
        } catch (err) {
          if (err.statusCode === 401) disableFetchToken = false;
          throw err;
        }
        return profile;
      }, maxRetries)
    ).trim();
    return retry(async () => {
      let creds;
      try {
        creds = await getCredentialsFromProfile(imdsProfile, options, init);
      } catch (err) {
        if (err.statusCode === 401) disableFetchToken = false;
        throw err;
      }
      return creds;
    }, maxRetries);
  };
  return async () => {
    let endpoint = await getInstanceMetadataEndpoint();
    if (disableFetchToken) {
      logger?.debug("AWS SDK Instance Metadata", "using v1 fallback (no token fetch)");
      return getCredentials(maxRetries, {
        ...endpoint,
        timeout,
      });
    } else {
      let token;
      try {
        token = (
          await getMetadataToken({
            ...endpoint,
            timeout,
          })
        ).toString();
      } catch (error) {
        if (error?.statusCode === 400)
          throw Object.assign(error, {
            message: "EC2 Metadata token request returned error",
          });
        else if (error.message === "TimeoutError" || [403, 404, 405].includes(error.statusCode))
          disableFetchToken = true;
        logger?.debug("AWS SDK Instance Metadata", "using v1 fallback (initial)");
        return getCredentials(maxRetries, {
          ...endpoint,
          timeout,
        });
      }
      return getCredentials(maxRetries, {
        ...endpoint,
        headers: {
          [X_AWS_EC2_METADATA_TOKEN]: token,
        },
        timeout,
      });
    }
  };
};
var getMetadataToken = async (options) =>
  httpRequest({
    ...options,
    path: IMDS_TOKEN_PATH,
    method: "PUT",
    headers: {
      "x-aws-ec2-metadata-token-ttl-seconds": "21600",
    },
  });
var getProfile = async (options) =>
  (
    await httpRequest({
      ...options,
      path: IMDS_PATH,
    })
  ).toString();
var getCredentialsFromProfile = async (profile, options, init) => {
  let credentialsResponse = JSON.parse(
    (
      await httpRequest({
        ...options,
        path: IMDS_PATH + profile,
      })
    ).toString(),
  );
  if (!isImdsCredentials(credentialsResponse))
    throw new config_2.CredentialsProviderError("Invalid response received from instance metadata service.", {
      logger: init.logger,
    });
  return fromImdsCredentials(credentialsResponse);
};
//@ chunk-s21g8j63.js:6960-7027 esm-layout
var init_credential_provider_imds_9 = __esm(() => {
  init_credential_provider_imds_3();
  init_credential_provider_imds();
  noopStub1();
  noopStub2();
  noopStub3();
  init_credential_provider_imds_7();
  init_credential_provider_imds_8();
  configModule = __toESM(require_node_config_provider());
  config_2 = __toESM(require_property_provider());
});
//@ chunk-s21g8j63.js:7027-7041 esm-layout
var noopStub5 = () => {};
//@ chunk-s21g8j63.js:7041-7084 esm-layout
var init_credential_provider_imds_10 = __esm(() => {
  init_credential_provider_imds();
  init_credential_provider_imds_7();
  init_credential_provider_imds_2();
  init_credential_provider_imds_9();
  noopStub2();
  noopStub5();
});
//@ chunk-s21g8j63.js:7084-7089 esm-layout
init_credential_provider_imds_10();
export {
  AWS_CONTAINER_CREDENTIALS_FULL_URI,
  AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
  fromContainerMetadata,
  fromInstanceMetadata,
  getInstanceMetadataEndpoint,
  httpRequest,
};
