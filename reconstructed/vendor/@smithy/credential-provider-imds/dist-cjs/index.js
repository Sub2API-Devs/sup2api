/**
 * @smithy/credential-provider-imds/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/credential-provider-imds@4.3.0..4.3.9
 * pieces: chunk-7bg2190x.js (32)
 * attribution: esm-fingerprint 10, esm-layout 22
 */
import { request } from "http";
import { Buffer as ae } from "buffer";
import { parse } from "url";
import { Xa, Re } from "../../../../runtime/bun-runtime.js";
import { require_property_provider } from "../../property-provider/dist-cjs/index.js";
import { require_node_config_provider } from "../../node-config-provider/dist-cjs/index.js";
import { require_url_parser } from "../../url-parser/dist-cjs/index.js";

//@ chunk-7bg2190x.js:431-1060 esm-fingerprint
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    let req = request({
      method: "GET",
      ...options,
      hostname: options.hostname?.replace(/^\[(.+)\]$/, "$1"),
    });
    req.on("error", (err) => {
      reject(Object.assign(new A.ProviderError("Unable to connect to instance metadata service"), err));
      req.destroy();
    });
    req.on("timeout", () => {
      reject(new A.ProviderError("TimeoutError from instance metadata service"));
      req.destroy();
    });
    req.on("response", (res) => {
      let { statusCode = 400 } = res;
      if (statusCode < 200 || 300 <= statusCode) {
        reject(
          Object.assign(new A.ProviderError("Error response received from instance metadata service"), {
            statusCode,
          }),
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
//@ chunk-7bg2190x.js:1060-1066 esm-layout
var A;
//@ chunk-7bg2190x.js:1066-1093 esm-layout
var init_credential_provider_imds = Xa(() => {
  A = Re(require_property_provider());
});
//@ chunk-7bg2190x.js:1093-1431 esm-fingerprint
var N = (arg) =>
  Boolean(arg) &&
  typeof arg === "object" &&
  typeof arg.AccessKeyId === "string" &&
  typeof arg.SecretAccessKey === "string" &&
  typeof arg.Token === "string" &&
  typeof arg.Expiration === "string";
var g = (creds) => ({
  accessKeyId: creds.AccessKeyId,
  secretAccessKey: creds.SecretAccessKey,
  sessionToken: creds.Token,
  expiration: new Date(creds.Expiration),
  ...(creds.AccountId && {
    accountId: creds.AccountId,
  }),
});
//@ chunk-7bg2190x.js:1431-1444 esm-layout
var O = () => {};
//@ chunk-7bg2190x.js:1444-1512 esm-fingerprint
var C = ({ maxRetries = 0, timeout = 1000 }) => ({
  maxRetries,
  timeout,
});
//@ chunk-7bg2190x.js:1512-1525 esm-layout
var h = () => {};
//@ chunk-7bg2190x.js:1525-1592 esm-layout
var retry = (e, maxRetries) => {
  let n = e();
  for (let i = 0; i < maxRetries; i++) n = n.catch(e);
  return n;
};
//@ chunk-7bg2190x.js:1592-1605 esm-layout
var D = () => {};
//@ chunk-7bg2190x.js:1634-2878 esm-layout
var T;
var AWS_CONTAINER_CREDENTIALS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI";
var AWS_CONTAINER_CREDENTIALS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI";
var AWS_CONTAINER_AUTHORIZATION_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN";
var Fe = (e = {}) => {
  let { timeout, maxRetries } = C(e);
  return () =>
    retry(async () => {
      let options = await me({
        logger: e.logger,
      });
      let parsed = JSON.parse(await ce(timeout, options));
      if (!N(parsed))
        throw new T.CredentialsProviderError("Invalid response received from instance metadata service.", {
          logger: e.logger,
        });
      return g(parsed);
    }, maxRetries);
};
var ce = async (timeout, options) => {
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
var de = "169.254.170.2";
var le;
var pe;
var me = async ({ logger }) => {
  if (process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI])
    return {
      hostname: de,
      path: process.env[AWS_CONTAINER_CREDENTIALS_RELATIVE_URI],
    };
  if (process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI]) {
    let parsed = parse(process.env[AWS_CONTAINER_CREDENTIALS_FULL_URI]);
    if (!parsed.hostname || !(parsed.hostname in le))
      throw new T.CredentialsProviderError(
        `${parsed.hostname} is not a valid container metadata service hostname`,
        {
          tryNextLink: false,
          logger,
        },
      );
    if (!parsed.protocol || !(parsed.protocol in pe))
      throw new T.CredentialsProviderError(
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
  throw new T.CredentialsProviderError(
    `The container metadata credential provider cannot be used unless the ${AWS_CONTAINER_CREDENTIALS_RELATIVE_URI} or ${AWS_CONTAINER_CREDENTIALS_FULL_URI} environment variable is set`,
    {
      tryNextLink: false,
      logger,
    },
  );
};
//@ chunk-7bg2190x.js:2878-2982 esm-layout
var init_credential_provider_imds_2 = Xa(() => {
  init_credential_provider_imds();
  O();
  h();
  D();
  T = Re(require_property_provider());
  le = {
    localhost: true,
    "127.0.0.1": true,
  };
  pe = {
    "http:": true,
    "https:": true,
  };
});
//@ chunk-7bg2190x.js:2982-2990 esm-layout
var U;
var InstanceMetadataV1FallbackError;
//@ chunk-7bg2190x.js:2990-3205 esm-fingerprint
var init_credential_provider_imds_3 = Xa(() => {
  U = Re(require_property_provider());
  InstanceMetadataV1FallbackError = class InstanceMetadataV1FallbackError extends U.CredentialsProviderError {
    tryNextLink;
    name = "InstanceMetadataV1FallbackError";
    constructor(message, tryNextLink = true) {
      super(message, tryNextLink);
      this.tryNextLink = tryNextLink;
      Object.setPrototypeOf(this, InstanceMetadataV1FallbackError.prototype);
    }
  };
});
//@ chunk-7bg2190x.js:3205-3211 esm-layout
var u;
//@ chunk-7bg2190x.js:3211-3317 esm-fingerprint
var init_credential_provider_imds_4 = Xa(() => {
  (function (Endpoint) {
    Endpoint.IPv4 = "http://169.254.169.254";
    Endpoint.IPv6 = "http://[fd00:ec2::254]";
  })(u || (u = {}));
});
//@ chunk-7bg2190x.js:3317-3323 esm-layout
var K;
//@ chunk-7bg2190x.js:3323-3483 esm-layout
var init_credential_provider_imds_5 = Xa(() => {
  K = {
    environmentVariableSelector: (e) => e.AWS_EC2_METADATA_SERVICE_ENDPOINT,
    configFileSelector: (e) => e.ec2_metadata_service_endpoint,
    default: undefined,
  };
});
//@ chunk-7bg2190x.js:3483-3489 esm-layout
var EndpointMode;
//@ chunk-7bg2190x.js:3489-3559 esm-fingerprint
var init_credential_provider_imds_6 = Xa(() => {
  (function (EndpointMode) {
    EndpointMode.IPv4 = "IPv4";
    EndpointMode.IPv6 = "IPv6";
  })(EndpointMode || (EndpointMode = {}));
});
//@ chunk-7bg2190x.js:3559-3649 esm-fingerprint
var AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE = "AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE";
var EC2_METADATA_SERVICE_ENDPOINT_MODE = "ec2_metadata_service_endpoint_mode";
var ENDPOINT_MODE_CONFIG_OPTIONS;
//@ chunk-7bg2190x.js:3649-3757 esm-fingerprint
var getExtendedInstanceMetadataCredentials = Xa(() => {
  init_credential_provider_imds_6();
  ENDPOINT_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE],
    configFileSelector: (profile) => profile[EC2_METADATA_SERVICE_ENDPOINT_MODE],
    default: EndpointMode.IPv4,
  };
});
//@ chunk-7bg2190x.js:3757-4036 esm-layout
var config;
var Y;
var getInstanceMetadataEndpoint = async () =>
  Y.parseUrl((await getFromEndpointConfig()) || (await getFromEndpointModeConfig()));
var getFromEndpointConfig = async () => config.loadConfig(K)();
var getFromEndpointModeConfig = async () => {
  let endpointMode = await config.loadConfig(ENDPOINT_MODE_CONFIG_OPTIONS)();
  switch (endpointMode) {
    case EndpointMode.IPv4:
      return u.IPv4;
    case EndpointMode.IPv6:
      return u.IPv6;
    default:
      throw Error(`Unsupported endpoint mode: ${endpointMode}. Select from ${Object.values(EndpointMode)}`);
  }
};
//@ chunk-7bg2190x.js:4036-4090 esm-layout
var init_credential_provider_imds_7 = Xa(() => {
  init_credential_provider_imds_4();
  init_credential_provider_imds_5();
  init_credential_provider_imds_6();
  getExtendedInstanceMetadataCredentials();
  config = Re(require_node_config_provider());
  Y = Re(require_url_parser());
});
//@ chunk-7bg2190x.js:4090-4561 esm-fingerprint
var b = (credentials, logger) => {
  let n = 300 + Math.floor(Math.random() * 300);
  let newExpiration = new Date(Date.now() + n * 1000);
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
//@ chunk-7bg2190x.js:4561-4574 esm-layout
var j = () => {};
//@ chunk-7bg2190x.js:4574-4806 esm-fingerprint
var staticStabilityProvider = (instanceMetadataProvider, t = {}) => {
  let logger = t?.logger || console;
  let pastCredentials;
  return async () => {
    let credentials;
    try {
      credentials = await instanceMetadataProvider();
      if (credentials.expiration && credentials.expiration.getTime() < Date.now())
        credentials = b(credentials, logger);
    } catch (e) {
      if (pastCredentials) {
        logger.warn("Credential renew failed: ", e);
        credentials = b(pastCredentials, logger);
      } else throw e;
    }
    pastCredentials = credentials;
    return credentials;
  };
};
//@ chunk-7bg2190x.js:4806-4826 esm-layout
var init_credential_provider_imds_8 = Xa(() => {
  j();
});
//@ chunk-7bg2190x.js:4826-6960 esm-layout
var Q;
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
  let { timeout, maxRetries } = C(init);
  let getCredentials = async (maxRetries, options) => {
    if (disableFetchToken || options.headers?.[X_AWS_EC2_METADATA_TOKEN] == null) {
      let fallbackBlockedFromProfile = false;
      let fallbackBlockedFromProcessEnv = false;
      let configValue = await Q.loadConfig(
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
  if (!N(credentialsResponse))
    throw new config_2.CredentialsProviderError("Invalid response received from instance metadata service.", {
      logger: init.logger,
    });
  return g(credentialsResponse);
};
//@ chunk-7bg2190x.js:6960-7027 esm-layout
var init_credential_provider_imds_9 = Xa(() => {
  init_credential_provider_imds_3();
  init_credential_provider_imds();
  O();
  h();
  D();
  init_credential_provider_imds_7();
  init_credential_provider_imds_8();
  Q = Re(require_node_config_provider());
  config_2 = Re(require_property_provider());
});
//@ chunk-7bg2190x.js:7027-7041 esm-layout
var oe = () => {};
//@ chunk-7bg2190x.js:7041-7084 esm-layout
var init_credential_provider_imds_10 = Xa(() => {
  init_credential_provider_imds();
  init_credential_provider_imds_7();
  init_credential_provider_imds_2();
  init_credential_provider_imds_9();
  h();
  oe();
});
//@ chunk-7bg2190x.js:7084-7089 esm-layout
init_credential_provider_imds_10();
