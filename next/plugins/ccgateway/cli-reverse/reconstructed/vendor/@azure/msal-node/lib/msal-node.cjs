/**
 * @azure/msal-node/lib/msal-node.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-b5df2wx1.js (55)
 * attribution: esm-fingerprint 52, esm-layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import http from "http";
import https from "https";
import { default as hy } from "crypto";
import {
  AccountEntity,
  CacheManager,
  HttpStatus,
  AuthError,
  EncodingTypes,
  Constants,
  CredentialType,
  AuthenticationScheme,
  StubPerformanceClient,
  isIdTokenEntity,
  isAccessTokenEntity,
  isRefreshTokenEntity,
  isAppMetadataEntity,
  generateAppMetadataKey,
  isServerTelemetryEntity,
  isAuthorityMetadataEntity,
  isThrottlingEntity,
  TokenCacheContext,
  createClientAuthError,
  invalidAssertion,
  nowSeconds,
  BaseClient,
  ResponseHandler,
  UrlString,
  CcsCredentialType,
  addClientId,
  addUsername,
  addPassword,
  addScopes,
  addResponseType,
  OAuthResponseType,
  addGrantType,
  GrantType,
  addClientInfo,
  addLibraryInfo,
  addApplicationTelemetry,
  addThrottling,
  addServerTelemetry,
  addCorrelationId,
  addClientSecret,
  addClientAssertion,
  getClientAssertion,
  addClientAssertionType,
  StringUtils,
  addClaims,
  addCcsUpn,
  mapToQueryString,
  getStandardAuthorizeRequestParameters,
  ProtocolMode,
  addCodeChallengeParams,
  addExtraQueryParameters,
  getAuthorizeUrl,
  buildStaticAuthorityOptions,
  ResponseModes,
  AuthorizationCodeClient,
  RefreshTokenClient,
  SilentFlowClient,
  ClientAuthError,
  tokenRefreshRequired,
  OIDC_DEFAULT_SCOPES,
  CacheOutcome,
  stateMismatch,
  ServerTelemetryManager,
  Authority,
  createDiscoveredInstance,
  getDeserializedResponse,
  deviceCodePollingCancelled,
  userTimeoutReached,
  deviceCodeExpired,
  delay,
  createAuthError,
  postRequestFailed,
  deviceCodeUnknownError,
  addResponseType_8,
  X_CLIENT_XTRA_SKU,
  CodeChallengeMethodValues,
  ServerError,
  ScopeSet,
  isTokenExpired,
  DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
  multipleMatchingTokens,
  extractTokenClaims,
  addResponseType_12,
  ON_BEHALF_OF,
  addResponseType_11,
  invalidClientCredential,
  AADAuthorityConstants,
  missingTenantIdError,
  HeaderNames_2,
  networkError,
  DEFAULT_CRYPTO_IMPLEMENTATION,
  createClientConfigurationError,
  urlEmptyError,
} from "../../msal-common/lib/index-node-DhUjlPuB.js";
import { GuidGenerator } from "../dist/crypto/GuidGenerator.mjs";
import { Serializer } from "../dist/cache/serializer/Serializer.mjs";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_jsonwebtoken } from "../../../jsonwebtoken/index.js";
import { buildAppConfiguration, buildManagedIdentityConfiguration } from "../dist/config/Configuration.mjs";
import { Logger } from "../../msal-common/dist/logger/Logger.mjs";
import { ImdsRetryPolicy } from "../dist/retry/ImdsRetryPolicy.mjs";
import { AzureArc } from "../dist/client/ManagedIdentitySources/AzureArc.mjs";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-b5df2wx1.js:209425-211734 esm-fingerprint
class Deserializer {
  static deserializeJSONBlob(blob) {
    return !blob ? {} : JSON.parse(blob);
  }
  static deserializeAccounts(accounts) {
    let accountObjects = {};
    if (accounts)
      Object.keys(accounts).map(function (key) {
        let serializedAcc = accounts[key];
        let mappedAcc = {
          homeAccountId: serializedAcc.home_account_id,
          environment: serializedAcc.environment,
          realm: serializedAcc.realm,
          localAccountId: serializedAcc.local_account_id,
          username: serializedAcc.username,
          authorityType: serializedAcc.authority_type,
          name: serializedAcc.name,
          clientInfo: serializedAcc.client_info,
          lastModificationTime: serializedAcc.last_modification_time,
          lastModificationApp: serializedAcc.last_modification_app,
          tenantProfiles: serializedAcc.tenantProfiles?.map((serializedTenantProfile) =>
            JSON.parse(serializedTenantProfile),
          ),
          lastUpdatedAt: Date.now().toString(),
        };
        let account = new AccountEntity();
        CacheManager.toObject(account, mappedAcc);
        accountObjects[key] = account;
      });
    return accountObjects;
  }
  static deserializeIdTokens(idTokens) {
    let idObjects = {};
    if (idTokens)
      Object.keys(idTokens).map(function (key) {
        let serializedIdT = idTokens[key];
        let idToken = {
          homeAccountId: serializedIdT.home_account_id,
          environment: serializedIdT.environment,
          credentialType: serializedIdT.credential_type,
          clientId: serializedIdT.client_id,
          secret: serializedIdT.secret,
          realm: serializedIdT.realm,
          lastUpdatedAt: Date.now().toString(),
        };
        idObjects[key] = idToken;
      });
    return idObjects;
  }
  static deserializeAccessTokens(accessTokens) {
    let atObjects = {};
    if (accessTokens)
      Object.keys(accessTokens).map(function (key) {
        let serializedAT = accessTokens[key];
        let accessToken = {
          homeAccountId: serializedAT.home_account_id,
          environment: serializedAT.environment,
          credentialType: serializedAT.credential_type,
          clientId: serializedAT.client_id,
          secret: serializedAT.secret,
          realm: serializedAT.realm,
          target: serializedAT.target,
          cachedAt: serializedAT.cached_at,
          expiresOn: serializedAT.expires_on,
          extendedExpiresOn: serializedAT.extended_expires_on,
          refreshOn: serializedAT.refresh_on,
          keyId: serializedAT.key_id,
          tokenType: serializedAT.token_type,
          requestedClaims: serializedAT.requestedClaims,
          requestedClaimsHash: serializedAT.requestedClaimsHash,
          userAssertionHash: serializedAT.userAssertionHash,
          lastUpdatedAt: Date.now().toString(),
        };
        atObjects[key] = accessToken;
      });
    return atObjects;
  }
  static deserializeRefreshTokens(refreshTokens) {
    let rtObjects = {};
    if (refreshTokens)
      Object.keys(refreshTokens).map(function (key) {
        let serializedRT = refreshTokens[key];
        let refreshToken = {
          homeAccountId: serializedRT.home_account_id,
          environment: serializedRT.environment,
          credentialType: serializedRT.credential_type,
          clientId: serializedRT.client_id,
          secret: serializedRT.secret,
          familyId: serializedRT.family_id,
          target: serializedRT.target,
          realm: serializedRT.realm,
          lastUpdatedAt: Date.now().toString(),
        };
        rtObjects[key] = refreshToken;
      });
    return rtObjects;
  }
  static deserializeAppMetadata(appMetadata) {
    let appMetadataObjects = {};
    if (appMetadata)
      Object.keys(appMetadata).map(function (key) {
        let serializedAmdt = appMetadata[key];
        appMetadataObjects[key] = {
          clientId: serializedAmdt.client_id,
          environment: serializedAmdt.environment,
          familyId: serializedAmdt.family_id,
        };
      });
    return appMetadataObjects;
  }
  static deserializeAllCache(jsonCache) {
    return {
      accounts: jsonCache.Account ? this.deserializeAccounts(jsonCache.Account) : {},
      idTokens: jsonCache.IdToken ? this.deserializeIdTokens(jsonCache.IdToken) : {},
      accessTokens: jsonCache.AccessToken ? this.deserializeAccessTokens(jsonCache.AccessToken) : {},
      refreshTokens: jsonCache.RefreshToken ? this.deserializeRefreshTokens(jsonCache.RefreshToken) : {},
      appMetadata: jsonCache.AppMetadata ? this.deserializeAppMetadata(jsonCache.AppMetadata) : {},
    };
  }
}
//@ chunk-b5df2wx1.js:211816-213842 esm-fingerprint
var DEFAULT_MANAGED_IDENTITY_ID = "system_assigned_managed_identity";
var MANAGED_IDENTITY_DEFAULT_TENANT = "managed_identity";
var DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY = `https://login.microsoftonline.com/${MANAGED_IDENTITY_DEFAULT_TENANT}/`;
var ManagedIdentityHeaders = {
  AUTHORIZATION_HEADER_NAME: "Authorization",
  METADATA_HEADER_NAME: "Metadata",
  APP_SERVICE_SECRET_HEADER_NAME: "X-IDENTITY-HEADER",
  ML_AND_SF_SECRET_HEADER_NAME: "secret",
};
var ManagedIdentityQueryParameters = {
  API_VERSION: "api-version",
  RESOURCE: "resource",
  SHA256_TOKEN_TO_REFRESH: "token_sha256_to_refresh",
  XMS_CC: "xms_cc",
};
var ManagedIdentityEnvironmentVariableNames = {
  AZURE_POD_IDENTITY_AUTHORITY_HOST: "AZURE_POD_IDENTITY_AUTHORITY_HOST",
  DEFAULT_IDENTITY_CLIENT_ID: "DEFAULT_IDENTITY_CLIENT_ID",
  IDENTITY_ENDPOINT: "IDENTITY_ENDPOINT",
  IDENTITY_HEADER: "IDENTITY_HEADER",
  IDENTITY_SERVER_THUMBPRINT: "IDENTITY_SERVER_THUMBPRINT",
  IMDS_ENDPOINT: "IMDS_ENDPOINT",
  MSI_ENDPOINT: "MSI_ENDPOINT",
  MSI_SECRET: "MSI_SECRET",
};
var ManagedIdentitySourceNames = {
  APP_SERVICE: "AppService",
  AZURE_ARC: "AzureArc",
  CLOUD_SHELL: "CloudShell",
  DEFAULT_TO_IMDS: "DefaultToImds",
  IMDS: "Imds",
  MACHINE_LEARNING: "MachineLearning",
  SERVICE_FABRIC: "ServiceFabric",
};
var ManagedIdentityIdType = {
  SYSTEM_ASSIGNED: "system-assigned",
  USER_ASSIGNED_CLIENT_ID: "user-assigned-client-id",
  USER_ASSIGNED_RESOURCE_ID: "user-assigned-resource-id",
  USER_ASSIGNED_OBJECT_ID: "user-assigned-object-id",
};
var HttpMethod = {
  GET: "get",
  POST: "post",
};
var ProxyStatus = {
  SUCCESS_RANGE_START: HttpStatus.SUCCESS_RANGE_START,
  SUCCESS_RANGE_END: HttpStatus.SUCCESS_RANGE_END,
  SERVER_ERROR: HttpStatus.SERVER_ERROR,
};
var REGION_ENVIRONMENT_VARIABLE = "REGION_NAME";
var MSAL_FORCE_REGION = "MSAL_FORCE_REGION";
var RANDOM_OCTET_SIZE = 32;
var Hash = {
  SHA256: "sha256",
};
var CharSet = {
  CV_CHARSET: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~",
};
var CACHE = {
  KEY_SEPARATOR: "-",
};
var Constants_2 = {
  MSAL_SKU: "msal.js.node",
  JWT_BEARER_ASSERTION_TYPE: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
  AUTHORIZATION_PENDING: "authorization_pending",
  HTTP_PROTOCOL: "http://",
  LOCALHOST: "localhost",
};
var ApiId = {
  acquireTokenSilent: 62,
  acquireTokenByUsernamePassword: 371,
  acquireTokenByDeviceCode: 671,
  acquireTokenByClientCredential: 771,
  acquireTokenByCode: 871,
  acquireTokenByRefreshToken: 872,
};
var JwtConstants = {
  RSA_256: "RS256",
  PSS_256: "PS256",
  X5T_256: "x5t#S256",
  X5T: "x5t",
  X5C: "x5c",
  AUDIENCE: "aud",
  EXPIRATION_TIME: "exp",
  ISSUER: "iss",
  SUBJECT: "sub",
  NOT_BEFORE: "nbf",
  JWT_ID: "jti",
};
var LOOPBACK_SERVER_CONSTANTS = {
  INTERVAL_MS: 100,
  TIMEOUT_MS: 5000,
};
var AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES = 4096;
//@ chunk-b5df2wx1.js:213883-214346 esm-fingerprint
class NetworkUtils {
  static getNetworkResponse(headers, body, statusCode) {
    return {
      headers,
      body,
      status: statusCode,
    };
  }
  static urlToHttpOptions(url) {
    let options = {
      protocol: url.protocol,
      hostname: url.hostname && url.hostname.startsWith("[") ? url.hostname.slice(1, -1) : url.hostname,
      hash: url.hash,
      search: url.search,
      pathname: url.pathname,
      path: `${url.pathname || ""}${url.search || ""}`,
      href: url.href,
    };
    if (url.port !== "") options.port = Number(url.port);
    if (url.username || url.password)
      options.auth = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
    return options;
  }
}
//@ chunk-b5df2wx1.js:214430-214830 esm-fingerprint
class HttpClient {
  constructor(proxyUrl, customAgentOptions) {
    this.proxyUrl = proxyUrl || "";
    this.customAgentOptions = customAgentOptions || {};
  }
  async sendGetRequestAsync(url, options, timeout) {
    if (this.proxyUrl)
      return networkRequestViaProxy(
        url,
        this.proxyUrl,
        HttpMethod.GET,
        options,
        this.customAgentOptions,
        timeout,
      );
    else return networkRequestViaHttps(url, HttpMethod.GET, options, this.customAgentOptions, timeout);
  }
  async sendPostRequestAsync(url, options) {
    if (this.proxyUrl)
      return networkRequestViaProxy(url, this.proxyUrl, HttpMethod.POST, options, this.customAgentOptions);
    else return networkRequestViaHttps(url, HttpMethod.POST, options, this.customAgentOptions);
  }
}
//@ chunk-b5df2wx1.js:214830-217629 esm-fingerprint
var networkRequestViaProxy = (
  destinationUrlString,
  proxyUrlString,
  httpMethod,
  options,
  agentOptions,
  timeout,
) => {
  let destinationUrl = new URL(destinationUrlString);
  let proxyUrl = new URL(proxyUrlString);
  let headers = options?.headers || {};
  let tunnelRequestOptions = {
    host: proxyUrl.hostname,
    port: proxyUrl.port,
    method: "CONNECT",
    path: destinationUrl.hostname,
    headers,
  };
  if (agentOptions && Object.keys(agentOptions).length)
    tunnelRequestOptions.agent = new http.Agent(agentOptions);
  let postRequestStringContent = "";
  if (httpMethod === HttpMethod.POST) {
    let body = options?.body || "";
    postRequestStringContent = `Content-Type: application/x-www-form-urlencoded\r
Content-Length: ${body.length}\r
\r
${body}`;
  } else if (timeout) tunnelRequestOptions.timeout = timeout;
  let outgoingRequestString =
    `${httpMethod.toUpperCase()} ${destinationUrl.href} HTTP/1.1\r
Host: ${destinationUrl.host}\r
Connection: close\r
` +
    postRequestStringContent +
    `\r
`;
  return new Promise((resolve, reject) => {
    let request = http.request(tunnelRequestOptions);
    if (timeout)
      request.on("timeout", () => {
        request.destroy();
        reject(Error("Request time out"));
      });
    request.end();
    request.on("connect", (response, socket) => {
      let proxyStatusCode = response?.statusCode || ProxyStatus.SERVER_ERROR;
      if (
        proxyStatusCode < ProxyStatus.SUCCESS_RANGE_START ||
        proxyStatusCode > ProxyStatus.SUCCESS_RANGE_END
      ) {
        request.destroy();
        socket.destroy();
        reject(
          Error(
            `Error connecting to proxy. Http status code: ${response.statusCode}. Http status message: ${response?.statusMessage || "Unknown"}`,
          ),
        );
      }
      socket.write(outgoingRequestString);
      let data = [];
      socket.on("data", (chunk) => {
        data.push(chunk);
      });
      socket.on("end", () => {
        let dataStringArray = Buffer.concat([...data]).toString().split(`\r
`);
        let httpStatusCode = parseInt(dataStringArray[0].split(" ")[1]);
        let statusMessage = dataStringArray[0].split(" ").slice(2).join(" ");
        let body = dataStringArray[dataStringArray.length - 1];
        let headersArray = dataStringArray.slice(1, dataStringArray.length - 2);
        let entries = new Map();
        headersArray.forEach((header) => {
          let headerKeyValue = header.split(new RegExp(/:\s(.*)/s));
          let headerKey = headerKeyValue[0];
          let headerValue = headerKeyValue[1];
          try {
            let object = JSON.parse(headerValue);
            if (object && typeof object === "object") headerValue = object;
          } catch (e) {}
          entries.set(headerKey, headerValue);
        });
        let parsedHeaders = Object.fromEntries(entries);
        let networkResponse = NetworkUtils.getNetworkResponse(
          parsedHeaders,
          parseBody(httpStatusCode, statusMessage, parsedHeaders, body),
          httpStatusCode,
        );
        if (
          (httpStatusCode < HttpStatus.SUCCESS_RANGE_START ||
            httpStatusCode > HttpStatus.SUCCESS_RANGE_END) &&
          networkResponse.body.error !== Constants_2.AUTHORIZATION_PENDING
        )
          request.destroy();
        resolve(networkResponse);
      });
      socket.on("error", (chunk) => {
        request.destroy();
        socket.destroy();
        reject(Error(chunk.toString()));
      });
    });
    request.on("error", (chunk) => {
      request.destroy();
      reject(Error(chunk.toString()));
    });
  });
};
var networkRequestViaHttps = (urlString, httpMethod, options, agentOptions, timeout) => {
  let isPostRequest = httpMethod === HttpMethod.POST;
  let body = options?.body || "";
  let url = new URL(urlString);
  let headers = options?.headers || {};
  let customOptions = {
    method: httpMethod,
    headers,
    ...NetworkUtils.urlToHttpOptions(url),
  };
  if (agentOptions && Object.keys(agentOptions).length) customOptions.agent = new https.Agent(agentOptions);
  if (isPostRequest)
    customOptions.headers = {
      ...customOptions.headers,
      "Content-Length": body.length,
    };
  else if (timeout) customOptions.timeout = timeout;
  return new Promise((resolve, reject) => {
    let request;
    if (customOptions.protocol === "http:") request = http.request(customOptions);
    else request = https.request(customOptions);
    if (isPostRequest) request.write(body);
    if (timeout)
      request.on("timeout", () => {
        request.destroy();
        reject(Error("Request time out"));
      });
    request.end();
    request.on("response", (response) => {
      let { headers, statusCode, statusMessage } = response;
      let data = [];
      response.on("data", (chunk) => {
        data.push(chunk);
      });
      response.on("end", () => {
        let body = Buffer.concat([...data]).toString();
        let parsedHeaders = headers;
        let networkResponse = NetworkUtils.getNetworkResponse(
          parsedHeaders,
          parseBody(statusCode, statusMessage, parsedHeaders, body),
          statusCode,
        );
        if (
          (statusCode < HttpStatus.SUCCESS_RANGE_START || statusCode > HttpStatus.SUCCESS_RANGE_END) &&
          networkResponse.body.error !== Constants_2.AUTHORIZATION_PENDING
        )
          request.destroy();
        resolve(networkResponse);
      });
    });
    request.on("error", (chunk) => {
      request.destroy();
      reject(Error(chunk.toString()));
    });
  });
};
var parseBody = (statusCode, statusMessage, headers, body) => {
  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (error) {
    let errorType;
    let errorDescriptionHelper;
    if (
      statusCode >= HttpStatus.CLIENT_ERROR_RANGE_START &&
      statusCode <= HttpStatus.CLIENT_ERROR_RANGE_END
    ) {
      errorType = "client_error";
      errorDescriptionHelper = "A client";
    } else if (
      statusCode >= HttpStatus.SERVER_ERROR_RANGE_START &&
      statusCode <= HttpStatus.SERVER_ERROR_RANGE_END
    ) {
      errorType = "server_error";
      errorDescriptionHelper = "A server";
    } else {
      errorType = "unknown_error";
      errorDescriptionHelper = "An unknown";
    }
    parsedBody = {
      error: errorType,
      error_description: `${errorDescriptionHelper} error occured.
Http status code: ${statusCode}
Http status message: ${statusMessage || "Unknown"}
Headers: ${JSON.stringify(headers)}`,
    };
  }
  return parsedBody;
};
//@ chunk-b5df2wx1.js:217670-218358 esm-fingerprint
var invalidFileExtension; // deferred: uses DEFAULT_MANAGED_IDENTITY_ID of its import cycle while loading; runs once the cycle is complete
var invalidFilePath;
var invalidManagedIdentityIdType;
var invalidSecret;
var missingId;
var networkUnavailable;
var platformNotSupported;
var unableToCreateAzureArc;
var unableToCreateCloudShell;
var unableToCreateSource;
var unableToReadSecretFile;
var userAssignedNotAvailableAtRuntime;
var wwwAuthenticateHeaderMissing;
var wwwAuthenticateHeaderUnsupportedFormat;
var MsiEnvironmentVariableUrlMalformedErrorCodes;
deferInit("chunk-b5df2wx1.js:217670", () => {
  invalidFileExtension = "invalid_file_extension";
  invalidFilePath = "invalid_file_path";
  invalidManagedIdentityIdType = "invalid_managed_identity_id_type";
  invalidSecret = "invalid_secret";
  missingId = "missing_client_id";
  networkUnavailable = "network_unavailable";
  platformNotSupported = "platform_not_supported";
  unableToCreateAzureArc = "unable_to_create_azure_arc";
  unableToCreateCloudShell = "unable_to_create_cloud_shell";
  unableToCreateSource = "unable_to_create_source";
  unableToReadSecretFile = "unable_to_read_secret_file";
  userAssignedNotAvailableAtRuntime = "user_assigned_not_available_at_runtime";
  wwwAuthenticateHeaderMissing = "www_authenticate_header_missing";
  wwwAuthenticateHeaderUnsupportedFormat = "www_authenticate_header_unsupported_format";
  MsiEnvironmentVariableUrlMalformedErrorCodes = {
    [ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]:
      "azure_pod_identity_authority_host_url_malformed",
    [ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT]: "identity_endpoint_url_malformed",
    [ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT]: "imds_endpoint_url_malformed",
    [ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT]: "msi_endpoint_url_malformed",
  };
});
//@ chunk-b5df2wx1.js:218399-220037 esm-fingerprint
var ManagedIdentityErrorMessages; // deferred: uses invalidFileExtension of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:218399", () => {
  ManagedIdentityErrorMessages = {
    [invalidFileExtension]: "The file path in the WWW-Authenticate header does not contain a .key file.",
    [invalidFilePath]:
      "The file path in the WWW-Authenticate header is not in a valid Windows or Linux Format.",
    [invalidManagedIdentityIdType]: "More than one ManagedIdentityIdType was provided.",
    [invalidSecret]:
      "The secret in the file on the file path in the WWW-Authenticate header is greater than 4096 bytes.",
    [platformNotSupported]:
      "The platform is not supported by Azure Arc. Azure Arc only supports Windows and Linux.",
    [missingId]: "A ManagedIdentityId id was not provided.",
    [MsiEnvironmentVariableUrlMalformedErrorCodes.AZURE_POD_IDENTITY_AUTHORITY_HOST]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST}' environment variable is malformed.`,
    [MsiEnvironmentVariableUrlMalformedErrorCodes.IDENTITY_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' environment variable is malformed.`,
    [MsiEnvironmentVariableUrlMalformedErrorCodes.IMDS_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.IMDS_ENDPOINT}' environment variable is malformed.`,
    [MsiEnvironmentVariableUrlMalformedErrorCodes.MSI_ENDPOINT]: `The Managed Identity's '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT}' environment variable is malformed.`,
    [networkUnavailable]:
      "Authentication unavailable. The request to the managed identity endpoint timed out.",
    [unableToCreateAzureArc]: "Azure Arc Managed Identities can only be system assigned.",
    [unableToCreateCloudShell]: "Cloud Shell Managed Identities can only be system assigned.",
    [unableToCreateSource]: "Unable to create a Managed Identity source based on environment variables.",
    [unableToReadSecretFile]: "Unable to read the secret file.",
    [userAssignedNotAvailableAtRuntime]:
      "Service Fabric user assigned managed identity ClientId or ResourceId is not configurable at runtime.",
    [wwwAuthenticateHeaderMissing]:
      "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is missing.",
    [wwwAuthenticateHeaderUnsupportedFormat]:
      "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is in an unsupported format.",
  };
});
//@ chunk-b5df2wx1.js:220037-220161 esm-fingerprint
let ManagedIdentityError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:220037", () => {
  ManagedIdentityError = class ManagedIdentityError extends AuthError {
    constructor(errorCode) {
      super(errorCode, ManagedIdentityErrorMessages[errorCode]);
      this.name = "ManagedIdentityError";
      Object.setPrototypeOf(this, ManagedIdentityError.prototype);
    }
  };
});
//@ chunk-b5df2wx1.js:220161-220193 esm-layout
function createManagedIdentityError(errorCode) {
  return new ManagedIdentityError(errorCode);
}
//@ chunk-b5df2wx1.js:220234-220738 esm-fingerprint
class ManagedIdentityId {
  get id() {
    return this._id;
  }
  set id(value) {
    this._id = value;
  }
  get idType() {
    return this._idType;
  }
  set idType(value) {
    this._idType = value;
  }
  constructor(managedIdentityIdParams) {
    let userAssignedClientId = managedIdentityIdParams?.userAssignedClientId;
    let userAssignedResourceId = managedIdentityIdParams?.userAssignedResourceId;
    let userAssignedObjectId = managedIdentityIdParams?.userAssignedObjectId;
    if (userAssignedClientId) {
      if (userAssignedResourceId || userAssignedObjectId)
        throw createManagedIdentityError(invalidManagedIdentityIdType);
      this.id = userAssignedClientId;
      this.idType = ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID;
    } else if (userAssignedResourceId) {
      if (userAssignedClientId || userAssignedObjectId)
        throw createManagedIdentityError(invalidManagedIdentityIdType);
      this.id = userAssignedResourceId;
      this.idType = ManagedIdentityIdType.USER_ASSIGNED_RESOURCE_ID;
    } else if (userAssignedObjectId) {
      if (userAssignedClientId || userAssignedResourceId)
        throw createManagedIdentityError(invalidManagedIdentityIdType);
      this.id = userAssignedObjectId;
      this.idType = ManagedIdentityIdType.USER_ASSIGNED_OBJECT_ID;
    } else {
      this.id = DEFAULT_MANAGED_IDENTITY_ID;
      this.idType = ManagedIdentityIdType.SYSTEM_ASSIGNED;
    }
  }
}
//@ chunk-b5df2wx1.js:220779-222006 esm-fingerprint
var NodeAuthErrorMessage = {
  invalidLoopbackAddressType: {
    code: "invalid_loopback_server_address_type",
    desc: "Loopback server address is not type string. This is unexpected.",
  },
  unableToLoadRedirectUri: {
    code: "unable_to_load_redirectUrl",
    desc: "Loopback server callback was invoked without a url. This is unexpected.",
  },
  noAuthCodeInResponse: {
    code: "no_auth_code_in_response",
    desc: "No auth code found in the server response. Please check your network trace to determine what happened.",
  },
  noLoopbackServerExists: {
    code: "no_loopback_server_exists",
    desc: "No loopback server exists yet.",
  },
  loopbackServerAlreadyExists: {
    code: "loopback_server_already_exists",
    desc: "Loopback server already exists. Cannot create another.",
  },
  loopbackServerTimeout: {
    code: "loopback_server_timeout",
    desc: "Timed out waiting for auth code listener to be registered.",
  },
  stateNotFoundError: {
    code: "state_not_found",
    desc: "State not found. Please verify that the request originated from msal.",
  },
  thumbprintMissing: {
    code: "thumbprint_missing_from_client_certificate",
    desc: "Client certificate does not contain a SHA-1 or SHA-256 thumbprint.",
  },
  redirectUriNotSupported: {
    code: "redirect_uri_not_supported",
    desc: "RedirectUri is not supported in this scenario. Please remove redirectUri from the request.",
  },
};
//@ chunk-b5df2wx1.js:222006-223182 esm-fingerprint
let NodeAuthError; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:222006", () => {
  NodeAuthError = class NodeAuthError extends AuthError {
    constructor(errorCode, errorMessage) {
      super(errorCode, errorMessage);
      this.name = "NodeAuthError";
    }
    static createInvalidLoopbackAddressTypeError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.invalidLoopbackAddressType.code,
        `${NodeAuthErrorMessage.invalidLoopbackAddressType.desc}`,
      );
    }
    static createUnableToLoadRedirectUrlError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.unableToLoadRedirectUri.code,
        `${NodeAuthErrorMessage.unableToLoadRedirectUri.desc}`,
      );
    }
    static createNoAuthCodeInResponseError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.noAuthCodeInResponse.code,
        `${NodeAuthErrorMessage.noAuthCodeInResponse.desc}`,
      );
    }
    static createNoLoopbackServerExistsError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.noLoopbackServerExists.code,
        `${NodeAuthErrorMessage.noLoopbackServerExists.desc}`,
      );
    }
    static createLoopbackServerAlreadyExistsError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.loopbackServerAlreadyExists.code,
        `${NodeAuthErrorMessage.loopbackServerAlreadyExists.desc}`,
      );
    }
    static createLoopbackServerTimeoutError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.loopbackServerTimeout.code,
        `${NodeAuthErrorMessage.loopbackServerTimeout.desc}`,
      );
    }
    static createStateNotFoundError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.stateNotFoundError.code,
        NodeAuthErrorMessage.stateNotFoundError.desc,
      );
    }
    static createThumbprintMissingError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.thumbprintMissing.code,
        NodeAuthErrorMessage.thumbprintMissing.desc,
      );
    }
    static createRedirectUriNotSupportedError() {
      return new NodeAuthError(
        NodeAuthErrorMessage.redirectUriNotSupported.code,
        NodeAuthErrorMessage.redirectUriNotSupported.desc,
      );
    }
  };
});
//@ chunk-b5df2wx1.js:225925-226319 esm-fingerprint
class EncodingUtils {
  static base64Encode(str, encoding) {
    return Buffer.from(str, encoding).toString(EncodingTypes.BASE64);
  }
  static base64EncodeUrl(str, encoding) {
    return EncodingUtils.base64Encode(str, encoding)
      .replace(/=/g, Constants.EMPTY_STRING)
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  static base64Decode(base64Str) {
    return Buffer.from(base64Str, EncodingTypes.BASE64).toString("utf8");
  }
  static base64DecodeUrl(base64Str) {
    let str = base64Str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return EncodingUtils.base64Decode(str);
  }
}
//@ chunk-b5df2wx1.js:226383-226454 esm-fingerprint
class HashUtils {
  sha256(buffer) {
    return hy.createHash(Hash.SHA256).update(buffer).digest();
  }
}
//@ chunk-b5df2wx1.js:226518-227057 esm-fingerprint
class PkceGenerator {
  constructor() {
    this.hashUtils = new HashUtils();
  }
  async generatePkceCodes() {
    let verifier = this.generateCodeVerifier();
    let challenge = this.generateCodeChallengeFromVerifier(verifier);
    return {
      verifier,
      challenge,
    };
  }
  generateCodeVerifier() {
    let charArr = [];
    let maxNumber = 256 - (256 % CharSet.CV_CHARSET.length);
    while (charArr.length <= RANDOM_OCTET_SIZE) {
      let byte = hy.randomBytes(1)[0];
      if (byte >= maxNumber) continue;
      let index = byte % CharSet.CV_CHARSET.length;
      charArr.push(CharSet.CV_CHARSET[index]);
    }
    let verifier = charArr.join(Constants.EMPTY_STRING);
    return EncodingUtils.base64EncodeUrl(verifier);
  }
  generateCodeChallengeFromVerifier(codeVerifier) {
    return EncodingUtils.base64EncodeUrl(
      this.hashUtils.sha256(codeVerifier).toString(EncodingTypes.BASE64),
      EncodingTypes.BASE64,
    );
  }
}
//@ chunk-b5df2wx1.js:227098-227844 esm-fingerprint
class CryptoProvider {
  constructor() {
    this.pkceGenerator = new PkceGenerator();
    this.guidGenerator = new GuidGenerator();
    this.hashUtils = new HashUtils();
  }
  base64UrlEncode() {
    throw Error("Method not implemented.");
  }
  encodeKid() {
    throw Error("Method not implemented.");
  }
  createNewGuid() {
    return this.guidGenerator.generateGuid();
  }
  base64Encode(input) {
    return EncodingUtils.base64Encode(input);
  }
  base64Decode(input) {
    return EncodingUtils.base64Decode(input);
  }
  generatePkceCodes() {
    return this.pkceGenerator.generatePkceCodes();
  }
  getPublicKeyThumbprint() {
    throw Error("Method not implemented.");
  }
  removeTokenBindingKey() {
    throw Error("Method not implemented.");
  }
  clearKeystore() {
    throw Error("Method not implemented.");
  }
  signJwt() {
    throw Error("Method not implemented.");
  }
  async hashString(plainText) {
    return EncodingUtils.base64EncodeUrl(
      this.hashUtils.sha256(plainText).toString(EncodingTypes.BASE64),
      EncodingTypes.BASE64,
    );
  }
}
//@ chunk-b5df2wx1.js:227930-228252 esm-fingerprint
function generateCredentialKey(credential) {
  let familyId =
    (credential.credentialType === CredentialType.REFRESH_TOKEN && credential.familyId) ||
    credential.clientId;
  let familyId_2 =
    credential.tokenType && credential.tokenType.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase()
      ? credential.tokenType.toLowerCase()
      : "";
  return [
    credential.homeAccountId,
    credential.environment,
    credential.credentialType,
    familyId,
    credential.realm || "",
    credential.target || "",
    credential.requestedClaimsHash || "",
    familyId_2,
  ]
    .join(CACHE.KEY_SEPARATOR)
    .toLowerCase();
}
//@ chunk-b5df2wx1.js:228252-228396 esm-fingerprint
function generateAccountKey(account) {
  let homeTenantId = account.homeAccountId.split(".")[1];
  return [account.homeAccountId, account.environment, homeTenantId || account.tenantId || ""]
    .join(CACHE.KEY_SEPARATOR)
    .toLowerCase();
}
//@ chunk-b5df2wx1.js:228437-232340 esm-fingerprint
let NodeStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:228437", () => {
  NodeStorage = class NodeStorage extends CacheManager {
    constructor(logger, clientId, cryptoImpl, staticAuthorityOptions) {
      super(clientId, cryptoImpl, logger, new StubPerformanceClient(), staticAuthorityOptions);
      this.cache = {};
      this.changeEmitters = [];
      this.logger = logger;
    }
    registerChangeEmitter(func) {
      this.changeEmitters.push(func);
    }
    emitChange() {
      this.changeEmitters.forEach((func) => func.call(null));
    }
    cacheToInMemoryCache(cache) {
      let inMemoryCache = {
        accounts: {},
        idTokens: {},
        accessTokens: {},
        refreshTokens: {},
        appMetadata: {},
      };
      for (let key in cache) {
        let value = cache[key];
        if (typeof value !== "object") continue;
        if (value instanceof AccountEntity) inMemoryCache.accounts[key] = value;
        else if (isIdTokenEntity(value)) inMemoryCache.idTokens[key] = value;
        else if (isAccessTokenEntity(value)) inMemoryCache.accessTokens[key] = value;
        else if (isRefreshTokenEntity(value)) inMemoryCache.refreshTokens[key] = value;
        else if (isAppMetadataEntity(key, value)) inMemoryCache.appMetadata[key] = value;
        else continue;
      }
      return inMemoryCache;
    }
    inMemoryCacheToCache(inMemoryCache) {
      let cache = this.getCache();
      cache = {
        ...cache,
        ...inMemoryCache.accounts,
        ...inMemoryCache.idTokens,
        ...inMemoryCache.accessTokens,
        ...inMemoryCache.refreshTokens,
        ...inMemoryCache.appMetadata,
      };
      return cache;
    }
    getInMemoryCache() {
      this.logger.trace("Getting in-memory cache");
      return this.cacheToInMemoryCache(this.getCache());
    }
    setInMemoryCache(inMemoryCache) {
      this.logger.trace("Setting in-memory cache");
      let cache = this.inMemoryCacheToCache(inMemoryCache);
      this.setCache(cache);
      this.emitChange();
    }
    getCache() {
      this.logger.trace("Getting cache key-value store");
      return this.cache;
    }
    setCache(cache) {
      this.logger.trace("Setting cache key value store");
      this.cache = cache;
      this.emitChange();
    }
    getItem(key) {
      this.logger.tracePii(`Item key: ${key}`);
      return this.getCache()[key];
    }
    setItem(key, value) {
      this.logger.tracePii(`Item key: ${key}`);
      let cache = this.getCache();
      cache[key] = value;
      this.setCache(cache);
    }
    generateCredentialKey(credential) {
      return generateCredentialKey(credential);
    }
    generateAccountKey(account) {
      return generateAccountKey(account);
    }
    getAccountKeys() {
      let inMemoryCache = this.getInMemoryCache();
      return Object.keys(inMemoryCache.accounts);
    }
    getTokenKeys() {
      let inMemoryCache = this.getInMemoryCache();
      return {
        idToken: Object.keys(inMemoryCache.idTokens),
        accessToken: Object.keys(inMemoryCache.accessTokens),
        refreshToken: Object.keys(inMemoryCache.refreshTokens),
      };
    }
    getAccount(accountKey) {
      return this.getItem(accountKey) ? Object.assign(new AccountEntity(), this.getItem(accountKey)) : null;
    }
    async setAccount(account) {
      let accountKey = this.generateAccountKey(AccountEntity.getAccountInfo(account));
      this.setItem(accountKey, account);
    }
    getIdTokenCredential(idTokenKey) {
      let idToken = this.getItem(idTokenKey);
      if (isIdTokenEntity(idToken)) return idToken;
      return null;
    }
    async setIdTokenCredential(idToken) {
      let idTokenKey = this.generateCredentialKey(idToken);
      this.setItem(idTokenKey, idToken);
    }
    getAccessTokenCredential(accessTokenKey) {
      let accessToken = this.getItem(accessTokenKey);
      if (isAccessTokenEntity(accessToken)) return accessToken;
      return null;
    }
    async setAccessTokenCredential(accessToken) {
      let accessTokenKey = this.generateCredentialKey(accessToken);
      this.setItem(accessTokenKey, accessToken);
    }
    getRefreshTokenCredential(refreshTokenKey) {
      let refreshToken = this.getItem(refreshTokenKey);
      if (isRefreshTokenEntity(refreshToken)) return refreshToken;
      return null;
    }
    async setRefreshTokenCredential(refreshToken) {
      let refreshTokenKey = this.generateCredentialKey(refreshToken);
      this.setItem(refreshTokenKey, refreshToken);
    }
    getAppMetadata(appMetadataKey) {
      let appMetadata = this.getItem(appMetadataKey);
      if (isAppMetadataEntity(appMetadataKey, appMetadata)) return appMetadata;
      return null;
    }
    setAppMetadata(appMetadata) {
      let appMetadataKey = generateAppMetadataKey(appMetadata);
      this.setItem(appMetadataKey, appMetadata);
    }
    getServerTelemetry(serverTelemetrykey) {
      let serverTelemetryEntity = this.getItem(serverTelemetrykey);
      if (serverTelemetryEntity && isServerTelemetryEntity(serverTelemetrykey, serverTelemetryEntity))
        return serverTelemetryEntity;
      return null;
    }
    setServerTelemetry(serverTelemetryKey, serverTelemetry) {
      this.setItem(serverTelemetryKey, serverTelemetry);
    }
    getAuthorityMetadata(key) {
      let authorityMetadataEntity = this.getItem(key);
      if (authorityMetadataEntity && isAuthorityMetadataEntity(key, authorityMetadataEntity))
        return authorityMetadataEntity;
      return null;
    }
    getAuthorityMetadataKeys() {
      return this.getKeys().filter((key) => this.isAuthorityMetadata(key));
    }
    setAuthorityMetadata(key, metadata) {
      this.setItem(key, metadata);
    }
    getThrottlingCache(throttlingCacheKey) {
      let throttlingCache = this.getItem(throttlingCacheKey);
      if (throttlingCache && isThrottlingEntity(throttlingCacheKey, throttlingCache)) return throttlingCache;
      return null;
    }
    setThrottlingCache(throttlingCacheKey, throttlingCache) {
      this.setItem(throttlingCacheKey, throttlingCache);
    }
    removeItem(key) {
      this.logger.tracePii(`Item key: ${key}`);
      let result = false;
      let cache = this.getCache();
      if (cache[key]) {
        delete cache[key];
        result = true;
      }
      if (result) {
        this.setCache(cache);
        this.emitChange();
      }
      return result;
    }
    removeOutdatedAccount(accountKey) {
      this.removeItem(accountKey);
    }
    containsKey(key) {
      return this.getKeys().includes(key);
    }
    getKeys() {
      this.logger.trace("Retrieving all cache keys");
      let cache = this.getCache();
      return [...Object.keys(cache)];
    }
    clear() {
      this.logger.trace("Clearing cache entries created by MSAL");
      this.getKeys().forEach((key) => {
        this.removeItem(key);
      });
      this.emitChange();
    }
    static generateInMemoryCache(cache) {
      return Deserializer.deserializeAllCache(Deserializer.deserializeJSONBlob(cache));
    }
    static generateJsonCache(inMemoryCache) {
      return Serializer.serializeAllCache(inMemoryCache);
    }
    updateCredentialCacheKey(currentCacheKey, credential) {
      let updatedCacheKey = this.generateCredentialKey(credential);
      if (currentCacheKey !== updatedCacheKey) {
        let cacheItem = this.getItem(currentCacheKey);
        if (cacheItem) {
          this.removeItem(currentCacheKey);
          this.setItem(updatedCacheKey, cacheItem);
          this.logger.verbose(`Updated an outdated ${credential.credentialType} cache key`);
          return updatedCacheKey;
        } else
          this.logger.error(
            `Attempted to update an outdated ${credential.credentialType} cache key but no item matching the outdated key was found in storage`,
          );
      }
      return currentCacheKey;
    }
  };
});
//@ chunk-b5df2wx1.js:232381-232458 esm-fingerprint
var defaultSerializedCache = {
  Account: {},
  IdToken: {},
  AccessToken: {},
  RefreshToken: {},
  AppMetadata: {},
};
//@ chunk-b5df2wx1.js:232458-236220 esm-fingerprint
class TokenCache {
  constructor(storage, logger, cachePlugin) {
    this.cacheHasChanged = false;
    this.storage = storage;
    this.storage.registerChangeEmitter(this.handleChangeEvent.bind(this));
    if (cachePlugin) this.persistence = cachePlugin;
    this.logger = logger;
  }
  hasChanged() {
    return this.cacheHasChanged;
  }
  serialize() {
    this.logger.trace("Serializing in-memory cache");
    let finalState = Serializer.serializeAllCache(this.storage.getInMemoryCache());
    if (this.cacheSnapshot) {
      this.logger.trace("Reading cache snapshot from disk");
      finalState = this.mergeState(JSON.parse(this.cacheSnapshot), finalState);
    } else this.logger.trace("No cache snapshot to merge");
    this.cacheHasChanged = false;
    return JSON.stringify(finalState);
  }
  deserialize(cache) {
    this.logger.trace("Deserializing JSON to in-memory cache");
    this.cacheSnapshot = cache;
    if (this.cacheSnapshot) {
      this.logger.trace("Reading cache snapshot from disk");
      let deserializedCache = Deserializer.deserializeAllCache(
        this.overlayDefaults(JSON.parse(this.cacheSnapshot)),
      );
      this.storage.setInMemoryCache(deserializedCache);
    } else this.logger.trace("No cache snapshot to deserialize");
  }
  getKVStore() {
    return this.storage.getCache();
  }
  getCacheSnapshot() {
    let deserializedPersistentStorage = NodeStorage.generateInMemoryCache(this.cacheSnapshot);
    return this.storage.inMemoryCacheToCache(deserializedPersistentStorage);
  }
  async getAllAccounts(correlationId = new CryptoProvider().createNewGuid()) {
    this.logger.trace("getAllAccounts called");
    let cacheContext;
    try {
      if (this.persistence) {
        cacheContext = new TokenCacheContext(this, false);
        await this.persistence.beforeCacheAccess(cacheContext);
      }
      return this.storage.getAllAccounts({}, correlationId);
    } finally {
      if (this.persistence && cacheContext) await this.persistence.afterCacheAccess(cacheContext);
    }
  }
  async getAccountByHomeId(homeAccountId) {
    let allAccounts = await this.getAllAccounts();
    if (homeAccountId && allAccounts && allAccounts.length)
      return allAccounts.filter((accountObj) => accountObj.homeAccountId === homeAccountId)[0] || null;
    else return null;
  }
  async getAccountByLocalId(localAccountId) {
    let allAccounts = await this.getAllAccounts();
    if (localAccountId && allAccounts && allAccounts.length)
      return allAccounts.filter((accountObj) => accountObj.localAccountId === localAccountId)[0] || null;
    else return null;
  }
  async removeAccount(account, correlationId) {
    this.logger.trace("removeAccount called");
    let cacheContext;
    try {
      if (this.persistence) {
        cacheContext = new TokenCacheContext(this, true);
        await this.persistence.beforeCacheAccess(cacheContext);
      }
      this.storage.removeAccount(account, correlationId || new GuidGenerator().generateGuid());
    } finally {
      if (this.persistence && cacheContext) await this.persistence.afterCacheAccess(cacheContext);
    }
  }
  async overwriteCache() {
    if (!this.persistence) {
      this.logger.info("No persistence layer specified, cache cannot be overwritten");
      return;
    }
    this.logger.info("Overwriting in-memory cache with persistent cache");
    this.storage.clear();
    let cacheContext = new TokenCacheContext(this, false);
    await this.persistence.beforeCacheAccess(cacheContext);
    let cacheSnapshot = this.getCacheSnapshot();
    this.storage.setCache(cacheSnapshot);
    await this.persistence.afterCacheAccess(cacheContext);
  }
  handleChangeEvent() {
    this.cacheHasChanged = true;
  }
  mergeState(oldState, currentState) {
    this.logger.trace("Merging in-memory cache with cache snapshot");
    let stateAfterRemoval = this.mergeRemovals(oldState, currentState);
    return this.mergeUpdates(stateAfterRemoval, currentState);
  }
  mergeUpdates(oldState, newState) {
    Object.keys(newState).forEach((newKey) => {
      let newValue = newState[newKey];
      if (!oldState.hasOwnProperty(newKey)) {
        if (newValue !== null) oldState[newKey] = newValue;
      } else {
        let newValueNotNull = newValue !== null;
        let newValueIsObject = typeof newValue === "object";
        let newValueIsNotArray = !Array.isArray(newValue);
        let oldStateNotUndefinedOrNull = typeof oldState[newKey] !== "undefined" && oldState[newKey] !== null;
        if (newValueNotNull && newValueIsObject && newValueIsNotArray && oldStateNotUndefinedOrNull)
          this.mergeUpdates(oldState[newKey], newValue);
        else oldState[newKey] = newValue;
      }
    });
    return oldState;
  }
  mergeRemovals(oldState, newState) {
    this.logger.trace("Remove updated entries in cache");
    let accounts = oldState.Account
      ? this.mergeRemovalsDict(oldState.Account, newState.Account)
      : oldState.Account;
    let accessTokens = oldState.AccessToken
      ? this.mergeRemovalsDict(oldState.AccessToken, newState.AccessToken)
      : oldState.AccessToken;
    let refreshTokens = oldState.RefreshToken
      ? this.mergeRemovalsDict(oldState.RefreshToken, newState.RefreshToken)
      : oldState.RefreshToken;
    let idTokens = oldState.IdToken
      ? this.mergeRemovalsDict(oldState.IdToken, newState.IdToken)
      : oldState.IdToken;
    let appMetadata = oldState.AppMetadata
      ? this.mergeRemovalsDict(oldState.AppMetadata, newState.AppMetadata)
      : oldState.AppMetadata;
    return {
      ...oldState,
      Account: accounts,
      AccessToken: accessTokens,
      RefreshToken: refreshTokens,
      IdToken: idTokens,
      AppMetadata: appMetadata,
    };
  }
  mergeRemovalsDict(oldState, newState) {
    let finalState = {
      ...oldState,
    };
    Object.keys(oldState).forEach((oldKey) => {
      if (!newState || !newState.hasOwnProperty(oldKey)) delete finalState[oldKey];
    });
    return finalState;
  }
  overlayDefaults(passedInCache) {
    this.logger.trace("Overlaying input cache with the default cache");
    return {
      Account: {
        ...defaultSerializedCache.Account,
        ...passedInCache.Account,
      },
      IdToken: {
        ...defaultSerializedCache.IdToken,
        ...passedInCache.IdToken,
      },
      AccessToken: {
        ...defaultSerializedCache.AccessToken,
        ...passedInCache.AccessToken,
      },
      RefreshToken: {
        ...defaultSerializedCache.RefreshToken,
        ...passedInCache.RefreshToken,
      },
      AppMetadata: {
        ...defaultSerializedCache.AppMetadata,
        ...passedInCache.AppMetadata,
      },
    };
  }
}
//@ chunk-b5df2wx1.js:236220-236238 esm-layout
var jwt; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:236220", () => {
  jwt = __toESM(require_jsonwebtoken(), 1);
});
//@ chunk-b5df2wx1.js:236279-237661 esm-fingerprint
class ClientAssertion {
  static fromAssertion(assertion) {
    let clientAssertion = new ClientAssertion();
    clientAssertion.jwt = assertion;
    return clientAssertion;
  }
  static fromCertificate(thumbprint, privateKey, publicCertificate) {
    let clientAssertion = new ClientAssertion();
    clientAssertion.privateKey = privateKey;
    clientAssertion.thumbprint = thumbprint;
    clientAssertion.useSha256 = false;
    if (publicCertificate) clientAssertion.publicCertificate = this.parseCertificate(publicCertificate);
    return clientAssertion;
  }
  static fromCertificateWithSha256Thumbprint(thumbprint, privateKey, publicCertificate) {
    let clientAssertion = new ClientAssertion();
    clientAssertion.privateKey = privateKey;
    clientAssertion.thumbprint = thumbprint;
    clientAssertion.useSha256 = true;
    if (publicCertificate) clientAssertion.publicCertificate = this.parseCertificate(publicCertificate);
    return clientAssertion;
  }
  getJwt(cryptoProvider, issuer, jwtAudience) {
    if (this.privateKey && this.thumbprint) {
      if (this.jwt && !this.isExpired() && issuer === this.issuer && jwtAudience === this.jwtAudience)
        return this.jwt;
      return this.createJwt(cryptoProvider, issuer, jwtAudience);
    }
    if (this.jwt) return this.jwt;
    throw createClientAuthError(invalidAssertion);
  }
  createJwt(cryptoProvider, issuer, jwtAudience) {
    this.issuer = issuer;
    this.jwtAudience = jwtAudience;
    let issuedAt = nowSeconds();
    this.expirationTime = issuedAt + 600;
    let header = {
      alg: this.useSha256 ? JwtConstants.PSS_256 : JwtConstants.RSA_256,
    };
    let thumbprintHeader = this.useSha256 ? JwtConstants.X5T_256 : JwtConstants.X5T;
    Object.assign(header, {
      [thumbprintHeader]: EncodingUtils.base64EncodeUrl(this.thumbprint, EncodingTypes.HEX),
    });
    if (this.publicCertificate)
      Object.assign(header, {
        [JwtConstants.X5C]: this.publicCertificate,
      });
    let payload = {
      [JwtConstants.AUDIENCE]: this.jwtAudience,
      [JwtConstants.EXPIRATION_TIME]: this.expirationTime,
      [JwtConstants.ISSUER]: this.issuer,
      [JwtConstants.SUBJECT]: this.issuer,
      [JwtConstants.NOT_BEFORE]: issuedAt,
      [JwtConstants.JWT_ID]: cryptoProvider.createNewGuid(),
    };
    this.jwt = jwt.default.sign(payload, this.privateKey, {
      header,
    });
    return this.jwt;
  }
  isExpired() {
    return this.expirationTime < nowSeconds();
  }
  static parseCertificate(publicCertificate) {
    let regexToFindCerts = /-----BEGIN CERTIFICATE-----\r*\n(.+?)\r*\n-----END CERTIFICATE-----/gs;
    let certs = [];
    let matches;
    while ((matches = regexToFindCerts.exec(publicCertificate)) !== null)
      certs.push(matches[1].replace(/\r*\n/g, Constants.EMPTY_STRING));
    return certs;
  }
}
//@ chunk-b5df2wx1.js:237702-237739 esm-fingerprint
var name = "@azure/msal-node";
var version = "3.8.1";
//@ chunk-b5df2wx1.js:237780-239733 esm-fingerprint
let UsernamePasswordClient; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:237780", () => {
  UsernamePasswordClient = class UsernamePasswordClient extends BaseClient {
    constructor(configuration) {
      super(configuration);
    }
    async acquireToken(request) {
      this.logger.info("in acquireToken call in username-password client");
      let reqTimestamp = nowSeconds();
      let response = await this.executeTokenRequest(this.authority, request);
      let responseHandler = new ResponseHandler(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
      responseHandler.validateTokenResponse(response.body);
      return responseHandler.handleServerTokenResponse(response.body, this.authority, reqTimestamp, request);
    }
    async executeTokenRequest(authority, request) {
      let queryParametersString = this.createTokenQueryParameters(request);
      let endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
      let requestBody = await this.createTokenRequestBody(request);
      let headers = this.createTokenRequestHeaders({
        credential: request.username,
        type: CcsCredentialType.UPN,
      });
      let thumbprint = {
        clientId: this.config.authOptions.clientId,
        authority: authority.canonicalAuthority,
        scopes: request.scopes,
        claims: request.claims,
        authenticationScheme: request.authenticationScheme,
        resourceRequestMethod: request.resourceRequestMethod,
        resourceRequestUri: request.resourceRequestUri,
        shrClaims: request.shrClaims,
        sshKid: request.sshKid,
      };
      return this.executePostToTokenEndpoint(
        endpoint,
        requestBody,
        headers,
        thumbprint,
        request.correlationId,
      );
    }
    async createTokenRequestBody(request) {
      let parameters = new Map();
      addClientId(parameters, this.config.authOptions.clientId);
      addUsername(parameters, request.username);
      addPassword(parameters, request.password);
      addScopes(parameters, request.scopes);
      addResponseType(parameters, OAuthResponseType.IDTOKEN_TOKEN);
      addGrantType(parameters, GrantType.RESOURCE_OWNER_PASSWORD_GRANT);
      addClientInfo(parameters);
      addLibraryInfo(parameters, this.config.libraryInfo);
      addApplicationTelemetry(parameters, this.config.telemetry.application);
      addThrottling(parameters);
      if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
      let correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
      addCorrelationId(parameters, correlationId);
      if (this.config.clientCredentials.clientSecret)
        addClientSecret(parameters, this.config.clientCredentials.clientSecret);
      let clientAssertion = this.config.clientCredentials.clientAssertion;
      if (clientAssertion) {
        addClientAssertion(
          parameters,
          await getClientAssertion(
            clientAssertion.assertion,
            this.config.authOptions.clientId,
            request.resourceRequestUri,
          ),
        );
        addClientAssertionType(parameters, clientAssertion.assertionType);
      }
      if (
        !StringUtils.isEmptyObj(request.claims) ||
        (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
      )
        addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
      if (this.config.systemOptions.preventCorsPreflight && request.username)
        addCcsUpn(parameters, request.username);
      return mapToQueryString(parameters);
    }
  };
});
//@ chunk-b5df2wx1.js:239774-240183 esm-fingerprint
function getAuthCodeRequestUrl(config, authority, request, logger) {
  let parameters = getStandardAuthorizeRequestParameters(
    {
      ...config.auth,
      authority,
      redirectUri: request.redirectUri || "",
    },
    request,
    logger,
  );
  addLibraryInfo(parameters, {
    sku: Constants_2.MSAL_SKU,
    version,
    cpu: "x64",
    os: "linux",
  });
  if (config.auth.protocolMode !== ProtocolMode.OIDC)
    addApplicationTelemetry(parameters, config.telemetry.application);
  addResponseType(parameters, OAuthResponseType.CODE);
  if (request.codeChallenge && request.codeChallengeMethod)
    addCodeChallengeParams(parameters, request.codeChallenge, request.codeChallengeMethod);
  addExtraQueryParameters(parameters, request.extraQueryParameters || {});
  return getAuthorizeUrl(
    authority,
    parameters,
    config.auth.encodeExtraQueryParams,
    request.extraQueryParameters,
  );
}
//@ chunk-b5df2wx1.js:240224-247170 esm-fingerprint
class ClientApplication {
  constructor(configuration) {
    this.config = buildAppConfiguration(configuration);
    this.cryptoProvider = new CryptoProvider();
    this.logger = new Logger(this.config.system.loggerOptions, name, version);
    this.storage = new NodeStorage(
      this.logger,
      this.config.auth.clientId,
      this.cryptoProvider,
      buildStaticAuthorityOptions(this.config.auth),
    );
    this.tokenCache = new TokenCache(this.storage, this.logger, this.config.cache.cachePlugin);
  }
  async getAuthCodeUrl(request) {
    this.logger.info("getAuthCodeUrl called", request.correlationId);
    let validRequest = {
      ...request,
      ...(await this.initializeBaseRequest(request)),
      responseMode: request.responseMode || ResponseModes.QUERY,
      authenticationScheme: AuthenticationScheme.BEARER,
      state: request.state || "",
      nonce: request.nonce || "",
    };
    let discoveredAuthority = await this.createAuthority(
      validRequest.authority,
      validRequest.correlationId,
      undefined,
      request.azureCloudOptions,
    );
    return getAuthCodeRequestUrl(this.config, discoveredAuthority, validRequest, this.logger);
  }
  async acquireTokenByCode(request, authCodePayLoad) {
    this.logger.info("acquireTokenByCode called");
    if (request.state && authCodePayLoad) {
      this.logger.info("acquireTokenByCode - validating state");
      this.validateState(request.state, authCodePayLoad.state || "");
      authCodePayLoad = {
        ...authCodePayLoad,
        state: "",
      };
    }
    let validRequest = {
      ...request,
      ...(await this.initializeBaseRequest(request)),
      authenticationScheme: AuthenticationScheme.BEARER,
    };
    let serverTelemetryManager = this.initializeServerTelemetryManager(
      ApiId.acquireTokenByCode,
      validRequest.correlationId,
    );
    try {
      let discoveredAuthority = await this.createAuthority(
        validRequest.authority,
        validRequest.correlationId,
        undefined,
        request.azureCloudOptions,
      );
      let authClientConfig = await this.buildOauthClientConfiguration(
        discoveredAuthority,
        validRequest.correlationId,
        validRequest.redirectUri,
        serverTelemetryManager,
      );
      let authorizationCodeClient = new AuthorizationCodeClient(authClientConfig);
      this.logger.verbose("Auth code client created", validRequest.correlationId);
      return await authorizationCodeClient.acquireToken(validRequest, authCodePayLoad);
    } catch (e) {
      if (e instanceof AuthError) e.setCorrelationId(validRequest.correlationId);
      serverTelemetryManager.cacheFailedRequest(e);
      throw e;
    }
  }
  async acquireTokenByRefreshToken(request) {
    this.logger.info("acquireTokenByRefreshToken called", request.correlationId);
    let validRequest = {
      ...request,
      ...(await this.initializeBaseRequest(request)),
      authenticationScheme: AuthenticationScheme.BEARER,
    };
    let serverTelemetryManager = this.initializeServerTelemetryManager(
      ApiId.acquireTokenByRefreshToken,
      validRequest.correlationId,
    );
    try {
      let discoveredAuthority = await this.createAuthority(
        validRequest.authority,
        validRequest.correlationId,
        undefined,
        request.azureCloudOptions,
      );
      let refreshTokenClientConfig = await this.buildOauthClientConfiguration(
        discoveredAuthority,
        validRequest.correlationId,
        validRequest.redirectUri || "",
        serverTelemetryManager,
      );
      let refreshTokenClient = new RefreshTokenClient(refreshTokenClientConfig);
      this.logger.verbose("Refresh token client created", validRequest.correlationId);
      return await refreshTokenClient.acquireToken(validRequest);
    } catch (e) {
      if (e instanceof AuthError) e.setCorrelationId(validRequest.correlationId);
      serverTelemetryManager.cacheFailedRequest(e);
      throw e;
    }
  }
  async acquireTokenSilent(request) {
    let validRequest = {
      ...request,
      ...(await this.initializeBaseRequest(request)),
      forceRefresh: request.forceRefresh || false,
    };
    let serverTelemetryManager = this.initializeServerTelemetryManager(
      ApiId.acquireTokenSilent,
      validRequest.correlationId,
      validRequest.forceRefresh,
    );
    try {
      let discoveredAuthority = await this.createAuthority(
        validRequest.authority,
        validRequest.correlationId,
        undefined,
        request.azureCloudOptions,
      );
      let clientConfiguration = await this.buildOauthClientConfiguration(
        discoveredAuthority,
        validRequest.correlationId,
        validRequest.redirectUri || "",
        serverTelemetryManager,
      );
      let silentFlowClient = new SilentFlowClient(clientConfiguration);
      this.logger.verbose("Silent flow client created", validRequest.correlationId);
      try {
        await this.tokenCache.overwriteCache();
        return await this.acquireCachedTokenSilent(validRequest, silentFlowClient, clientConfiguration);
      } catch (error) {
        if (error instanceof ClientAuthError && error.errorCode === tokenRefreshRequired)
          return new RefreshTokenClient(clientConfiguration).acquireTokenByRefreshToken(validRequest);
        throw error;
      }
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(validRequest.correlationId);
      serverTelemetryManager.cacheFailedRequest(error);
      throw error;
    }
  }
  async acquireCachedTokenSilent(validRequest, silentFlowClient, clientConfiguration) {
    let [authResponse, cacheOutcome] = await silentFlowClient.acquireCachedToken({
      ...validRequest,
      scopes: validRequest.scopes?.length ? validRequest.scopes : [...OIDC_DEFAULT_SCOPES],
    });
    if (cacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
      this.logger.info(
        "ClientApplication:acquireCachedTokenSilent - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.",
      );
      let refreshTokenClient = new RefreshTokenClient(clientConfiguration);
      try {
        await refreshTokenClient.acquireTokenByRefreshToken(validRequest);
      } catch {}
    }
    return authResponse;
  }
  async acquireTokenByUsernamePassword(request) {
    this.logger.info("acquireTokenByUsernamePassword called", request.correlationId);
    let validRequest = {
      ...request,
      ...(await this.initializeBaseRequest(request)),
    };
    let serverTelemetryManager = this.initializeServerTelemetryManager(
      ApiId.acquireTokenByUsernamePassword,
      validRequest.correlationId,
    );
    try {
      let discoveredAuthority = await this.createAuthority(
        validRequest.authority,
        validRequest.correlationId,
        undefined,
        request.azureCloudOptions,
      );
      let usernamePasswordClientConfig = await this.buildOauthClientConfiguration(
        discoveredAuthority,
        validRequest.correlationId,
        "",
        serverTelemetryManager,
      );
      let usernamePasswordClient = new UsernamePasswordClient(usernamePasswordClientConfig);
      this.logger.verbose("Username password client created", validRequest.correlationId);
      return await usernamePasswordClient.acquireToken(validRequest);
    } catch (e) {
      if (e instanceof AuthError) e.setCorrelationId(validRequest.correlationId);
      serverTelemetryManager.cacheFailedRequest(e);
      throw e;
    }
  }
  getTokenCache() {
    this.logger.info("getTokenCache called");
    return this.tokenCache;
  }
  validateState(state, cachedState) {
    if (!state) throw NodeAuthError.createStateNotFoundError();
    if (state !== cachedState) throw createClientAuthError(stateMismatch);
  }
  getLogger() {
    return this.logger;
  }
  setLogger(logger) {
    this.logger = logger;
  }
  async buildOauthClientConfiguration(
    discoveredAuthority,
    requestCorrelationId,
    redirectUri,
    serverTelemetryManager,
  ) {
    this.logger.verbose("buildOauthClientConfiguration called", requestCorrelationId);
    this.logger.info(
      `Building oauth client configuration with the following authority: ${discoveredAuthority.tokenEndpoint}.`,
      requestCorrelationId,
    );
    serverTelemetryManager?.updateRegionDiscoveryMetadata(discoveredAuthority.regionDiscoveryMetadata);
    return {
      authOptions: {
        clientId: this.config.auth.clientId,
        authority: discoveredAuthority,
        clientCapabilities: this.config.auth.clientCapabilities,
        redirectUri,
      },
      loggerOptions: {
        logLevel: this.config.system.loggerOptions.logLevel,
        loggerCallback: this.config.system.loggerOptions.loggerCallback,
        piiLoggingEnabled: this.config.system.loggerOptions.piiLoggingEnabled,
        correlationId: requestCorrelationId,
      },
      cacheOptions: {
        claimsBasedCachingEnabled: this.config.cache.claimsBasedCachingEnabled,
      },
      cryptoInterface: this.cryptoProvider,
      networkInterface: this.config.system.networkClient,
      storageInterface: this.storage,
      serverTelemetryManager,
      clientCredentials: {
        clientSecret: this.clientSecret,
        clientAssertion: await this.getClientAssertion(discoveredAuthority),
      },
      libraryInfo: {
        sku: Constants_2.MSAL_SKU,
        version,
        cpu: "x64",
        os: "linux",
      },
      telemetry: this.config.telemetry,
      persistencePlugin: this.config.cache.cachePlugin,
      serializableCache: this.tokenCache,
    };
  }
  async getClientAssertion(authority) {
    if (this.developerProvidedClientAssertion)
      this.clientAssertion = ClientAssertion.fromAssertion(
        await getClientAssertion(
          this.developerProvidedClientAssertion,
          this.config.auth.clientId,
          authority.tokenEndpoint,
        ),
      );
    return (
      this.clientAssertion && {
        assertion: this.clientAssertion.getJwt(
          this.cryptoProvider,
          this.config.auth.clientId,
          authority.tokenEndpoint,
        ),
        assertionType: Constants_2.JWT_BEARER_ASSERTION_TYPE,
      }
    );
  }
  async initializeBaseRequest(authRequest) {
    this.logger.verbose("initializeRequestScopes called", authRequest.correlationId);
    if (authRequest.authenticationScheme && authRequest.authenticationScheme === AuthenticationScheme.POP)
      this.logger.verbose(
        "Authentication Scheme 'pop' is not supported yet, setting Authentication Scheme to 'Bearer' for request",
        authRequest.correlationId,
      );
    authRequest.authenticationScheme = AuthenticationScheme.BEARER;
    if (
      this.config.cache.claimsBasedCachingEnabled &&
      authRequest.claims &&
      !StringUtils.isEmptyObj(authRequest.claims)
    )
      authRequest.requestedClaimsHash = await this.cryptoProvider.hashString(authRequest.claims);
    return {
      ...authRequest,
      scopes: [...((authRequest && authRequest.scopes) || []), ...OIDC_DEFAULT_SCOPES],
      correlationId: (authRequest && authRequest.correlationId) || this.cryptoProvider.createNewGuid(),
      authority: authRequest.authority || this.config.auth.authority,
    };
  }
  initializeServerTelemetryManager(apiId, correlationId, forceRefresh) {
    let telemetryPayload = {
      clientId: this.config.auth.clientId,
      correlationId,
      apiId,
      forceRefresh: forceRefresh || false,
    };
    return new ServerTelemetryManager(telemetryPayload, this.storage);
  }
  async createAuthority(authorityString, requestCorrelationId, azureRegionConfiguration, azureCloudOptions) {
    this.logger.verbose("createAuthority called", requestCorrelationId);
    let authorityUrl = Authority.generateAuthority(
      authorityString,
      azureCloudOptions || this.config.auth.azureCloudOptions,
    );
    let authorityOptions = {
      protocolMode: this.config.auth.protocolMode,
      knownAuthorities: this.config.auth.knownAuthorities,
      cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
      authorityMetadata: this.config.auth.authorityMetadata,
      azureRegionConfiguration,
      skipAuthorityMetadataCache: this.config.auth.skipAuthorityMetadataCache,
    };
    return createDiscoveredInstance(
      authorityUrl,
      this.config.system.networkClient,
      this.storage,
      authorityOptions,
      this.logger,
      requestCorrelationId,
    );
  }
  clearCache() {
    this.storage.clear();
  }
}
//@ chunk-b5df2wx1.js:247232-248318 esm-fingerprint
class LoopbackClient {
  async listenForAuthCode(successTemplate, errorTemplate) {
    if (this.server) throw NodeAuthError.createLoopbackServerAlreadyExistsError();
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        let url = req.url;
        if (!url) {
          res.end(errorTemplate || "Error occurred loading redirectUrl");
          reject(NodeAuthError.createUnableToLoadRedirectUrlError());
          return;
        } else if (url === Constants.FORWARD_SLASH) {
          res.end(successTemplate || "Auth code was successfully acquired. You can close this window now.");
          return;
        }
        let redirectUri = this.getRedirectUri();
        let parsedUrl = new URL(url, redirectUri);
        let authCodeResponse = getDeserializedResponse(parsedUrl.search) || {};
        if (authCodeResponse.code) {
          res.writeHead(HttpStatus.REDIRECT, {
            location: redirectUri,
          });
          res.end();
        }
        if (authCodeResponse.error) res.end(errorTemplate || `Error occurred: ${authCodeResponse.error}`);
        resolve(authCodeResponse);
      });
      this.server.listen(0, "127.0.0.1");
    });
  }
  getRedirectUri() {
    if (!this.server || !this.server.listening) throw NodeAuthError.createNoLoopbackServerExistsError();
    let address = this.server.address();
    if (!address || typeof address === "string" || !address.port) {
      this.closeServer();
      throw NodeAuthError.createInvalidLoopbackAddressTypeError();
    }
    let port = address && address.port;
    return `${Constants_2.HTTP_PROTOCOL}${Constants_2.LOCALHOST}:${port}`;
  }
  closeServer() {
    if (this.server) {
      this.server.close();
      if (typeof this.server.closeAllConnections === "function") this.server.closeAllConnections();
      this.server.unref();
      this.server = undefined;
    }
  }
}
//@ chunk-b5df2wx1.js:248359-252180 esm-fingerprint
let DeviceCodeClient; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:248359", () => {
  DeviceCodeClient = class DeviceCodeClient extends BaseClient {
    constructor(configuration) {
      super(configuration);
    }
    async acquireToken(request) {
      let deviceCodeResponse = await this.getDeviceCode(request);
      request.deviceCodeCallback(deviceCodeResponse);
      let reqTimestamp = nowSeconds();
      let response = await this.acquireTokenWithDeviceCode(request, deviceCodeResponse);
      let responseHandler = new ResponseHandler(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
      responseHandler.validateTokenResponse(response);
      return responseHandler.handleServerTokenResponse(response, this.authority, reqTimestamp, request);
    }
    async getDeviceCode(request) {
      let queryParametersString = this.createExtraQueryParameters(request);
      let endpoint = UrlString.appendQueryString(this.authority.deviceCodeEndpoint, queryParametersString);
      let queryString = this.createQueryString(request);
      let headers = this.createTokenRequestHeaders();
      let thumbprint = {
        clientId: this.config.authOptions.clientId,
        authority: request.authority,
        scopes: request.scopes,
        claims: request.claims,
        authenticationScheme: request.authenticationScheme,
        resourceRequestMethod: request.resourceRequestMethod,
        resourceRequestUri: request.resourceRequestUri,
        shrClaims: request.shrClaims,
        sshKid: request.sshKid,
      };
      return this.executePostRequestToDeviceCodeEndpoint(
        endpoint,
        queryString,
        headers,
        thumbprint,
        request.correlationId,
      );
    }
    createExtraQueryParameters(request) {
      let parameters = new Map();
      if (request.extraQueryParameters) addExtraQueryParameters(parameters, request.extraQueryParameters);
      return mapToQueryString(parameters);
    }
    async executePostRequestToDeviceCodeEndpoint(
      deviceCodeEndpoint,
      queryString,
      headers,
      thumbprint,
      correlationId,
    ) {
      let {
        body: {
          user_code: userCode,
          device_code: deviceCode,
          verification_uri: verificationUri,
          expires_in: expiresIn,
          interval,
          message,
        },
      } = await this.sendPostRequest(
        thumbprint,
        deviceCodeEndpoint,
        {
          body: queryString,
          headers,
        },
        correlationId,
      );
      return {
        userCode,
        deviceCode,
        verificationUri,
        expiresIn,
        interval,
        message,
      };
    }
    createQueryString(request) {
      let parameters = new Map();
      addScopes(parameters, request.scopes);
      addClientId(parameters, this.config.authOptions.clientId);
      if (request.extraQueryParameters) addExtraQueryParameters(parameters, request.extraQueryParameters);
      if (
        request.claims ||
        (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
      )
        addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
      return mapToQueryString(parameters);
    }
    continuePolling(deviceCodeExpirationTime, userSpecifiedTimeout, userSpecifiedCancelFlag) {
      if (userSpecifiedCancelFlag) {
        this.logger.error("Token request cancelled by setting DeviceCodeRequest.cancel = true");
        throw createClientAuthError(deviceCodePollingCancelled);
      } else if (
        userSpecifiedTimeout &&
        userSpecifiedTimeout < deviceCodeExpirationTime &&
        nowSeconds() > userSpecifiedTimeout
      ) {
        this.logger.error(
          `User defined timeout for device code polling reached. The timeout was set for ${userSpecifiedTimeout}`,
        );
        throw createClientAuthError(userTimeoutReached);
      } else if (nowSeconds() > deviceCodeExpirationTime) {
        if (userSpecifiedTimeout)
          this.logger.verbose(
            `User specified timeout ignored as the device code has expired before the timeout elapsed. The user specified timeout was set for ${userSpecifiedTimeout}`,
          );
        this.logger.error(
          `Device code expired. Expiration time of device code was ${deviceCodeExpirationTime}`,
        );
        throw createClientAuthError(deviceCodeExpired);
      }
      return true;
    }
    async acquireTokenWithDeviceCode(request, deviceCodeResponse) {
      let queryParametersString = this.createTokenQueryParameters(request);
      let endpoint = UrlString.appendQueryString(this.authority.tokenEndpoint, queryParametersString);
      let requestBody = this.createTokenRequestBody(request, deviceCodeResponse);
      let headers = this.createTokenRequestHeaders();
      let userSpecifiedTimeout = request.timeout ? nowSeconds() + request.timeout : undefined;
      let deviceCodeExpirationTime = nowSeconds() + deviceCodeResponse.expiresIn;
      let pollingIntervalMilli = deviceCodeResponse.interval * 1000;
      while (this.continuePolling(deviceCodeExpirationTime, userSpecifiedTimeout, request.cancel)) {
        let thumbprint = {
          clientId: this.config.authOptions.clientId,
          authority: request.authority,
          scopes: request.scopes,
          claims: request.claims,
          authenticationScheme: request.authenticationScheme,
          resourceRequestMethod: request.resourceRequestMethod,
          resourceRequestUri: request.resourceRequestUri,
          shrClaims: request.shrClaims,
          sshKid: request.sshKid,
        };
        let response = await this.executePostToTokenEndpoint(
          endpoint,
          requestBody,
          headers,
          thumbprint,
          request.correlationId,
        );
        if (response.body && response.body.error) {
          if (response.body.error === Constants.AUTHORIZATION_PENDING) {
            this.logger.info("Authorization pending. Continue polling.");
            await delay(pollingIntervalMilli);
          } else {
            this.logger.info("Unexpected error in polling from the server");
            throw createAuthError(postRequestFailed, response.body.error);
          }
        } else {
          this.logger.verbose("Authorization completed successfully. Polling stopped.");
          return response.body;
        }
      }
      this.logger.error("Polling stopped for unknown reasons.");
      throw createClientAuthError(deviceCodeUnknownError);
    }
    createTokenRequestBody(request, deviceCodeResponse) {
      let parameters = new Map();
      addScopes(parameters, request.scopes);
      addClientId(parameters, this.config.authOptions.clientId);
      addGrantType(parameters, GrantType.DEVICE_CODE_GRANT);
      addResponseType_8(parameters, deviceCodeResponse.deviceCode);
      let correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
      addCorrelationId(parameters, correlationId);
      addClientInfo(parameters);
      addLibraryInfo(parameters, this.config.libraryInfo);
      addApplicationTelemetry(parameters, this.config.telemetry.application);
      addThrottling(parameters);
      if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
      if (
        !StringUtils.isEmptyObj(request.claims) ||
        (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
      )
        addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
      return mapToQueryString(parameters);
    }
  };
});
//@ chunk-b5df2wx1.js:252221-256263 esm-fingerprint
let PublicClientApplication; // deferred: uses ClientApplication of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:252221", () => {
  PublicClientApplication = class PublicClientApplication extends ClientApplication {
    constructor(configuration) {
      super(configuration);
      if (this.config.broker.nativeBrokerPlugin)
        if (this.config.broker.nativeBrokerPlugin.isBrokerAvailable) {
          this.nativeBrokerPlugin = this.config.broker.nativeBrokerPlugin;
          this.nativeBrokerPlugin.setLogger(this.config.system.loggerOptions);
        } else this.logger.warning("NativeBroker implementation was provided but the broker is unavailable.");
      this.skus = ServerTelemetryManager.makeExtraSkuString({
        libraryName: Constants_2.MSAL_SKU,
        libraryVersion: version,
      });
    }
    async acquireTokenByDeviceCode(request) {
      this.logger.info("acquireTokenByDeviceCode called", request.correlationId);
      let validRequest = Object.assign(request, await this.initializeBaseRequest(request));
      let serverTelemetryManager = this.initializeServerTelemetryManager(
        ApiId.acquireTokenByDeviceCode,
        validRequest.correlationId,
      );
      try {
        let discoveredAuthority = await this.createAuthority(
          validRequest.authority,
          validRequest.correlationId,
          undefined,
          request.azureCloudOptions,
        );
        let deviceCodeConfig = await this.buildOauthClientConfiguration(
          discoveredAuthority,
          validRequest.correlationId,
          "",
          serverTelemetryManager,
        );
        let deviceCodeClient = new DeviceCodeClient(deviceCodeConfig);
        this.logger.verbose("Device code client created", validRequest.correlationId);
        return await deviceCodeClient.acquireToken(validRequest);
      } catch (e) {
        if (e instanceof AuthError) e.setCorrelationId(validRequest.correlationId);
        serverTelemetryManager.cacheFailedRequest(e);
        throw e;
      }
    }
    async acquireTokenInteractive(request) {
      let correlationId = request.correlationId || this.cryptoProvider.createNewGuid();
      this.logger.trace("acquireTokenInteractive called", correlationId);
      let {
        openBrowser,
        successTemplate,
        errorTemplate,
        windowHandle,
        loopbackClient: customLoopbackClient,
        ...remainingProperties
      } = request;
      if (this.nativeBrokerPlugin) {
        let brokerRequest = {
          ...remainingProperties,
          clientId: this.config.auth.clientId,
          scopes: request.scopes || OIDC_DEFAULT_SCOPES,
          redirectUri: request.redirectUri || "",
          authority: request.authority || this.config.auth.authority,
          correlationId,
          extraParameters: {
            ...remainingProperties.extraQueryParameters,
            ...remainingProperties.tokenQueryParameters,
            [X_CLIENT_XTRA_SKU]: this.skus,
          },
          accountId: remainingProperties.account?.nativeAccountId,
        };
        return this.nativeBrokerPlugin.acquireTokenInteractive(brokerRequest, windowHandle);
      }
      if (request.redirectUri) {
        if (!this.config.broker.nativeBrokerPlugin) throw NodeAuthError.createRedirectUriNotSupportedError();
        request.redirectUri = "";
      }
      let { verifier, challenge } = await this.cryptoProvider.generatePkceCodes();
      let loopbackClient = customLoopbackClient || new LoopbackClient();
      let authCodeResponse = {};
      let authCodeListenerError = null;
      try {
        let authCodeListener = loopbackClient
          .listenForAuthCode(successTemplate, errorTemplate)
          .then((response) => {
            authCodeResponse = response;
          })
          .catch((e) => {
            authCodeListenerError = e;
          });
        let redirectUri = await this.waitForRedirectUri(loopbackClient);
        let validRequest = {
          ...remainingProperties,
          correlationId,
          scopes: request.scopes || OIDC_DEFAULT_SCOPES,
          redirectUri,
          responseMode: ResponseModes.QUERY,
          codeChallenge: challenge,
          codeChallengeMethod: CodeChallengeMethodValues.S256,
        };
        let authCodeUrl = await this.getAuthCodeUrl(validRequest);
        await openBrowser(authCodeUrl);
        await authCodeListener;
        if (authCodeListenerError) throw authCodeListenerError;
        if (authCodeResponse.error)
          throw new ServerError(
            authCodeResponse.error,
            authCodeResponse.error_description,
            authCodeResponse.suberror,
          );
        else if (!authCodeResponse.code) throw NodeAuthError.createNoAuthCodeInResponseError();
        let clientInfo = authCodeResponse.client_info;
        let tokenRequest = {
          code: authCodeResponse.code,
          codeVerifier: verifier,
          clientInfo: clientInfo || Constants.EMPTY_STRING,
          ...validRequest,
        };
        return await this.acquireTokenByCode(tokenRequest);
      } finally {
        loopbackClient.closeServer();
      }
    }
    async acquireTokenSilent(request) {
      let correlationId = request.correlationId || this.cryptoProvider.createNewGuid();
      this.logger.trace("acquireTokenSilent called", correlationId);
      if (this.nativeBrokerPlugin) {
        let brokerRequest = {
          ...request,
          clientId: this.config.auth.clientId,
          scopes: request.scopes || OIDC_DEFAULT_SCOPES,
          redirectUri: request.redirectUri || "",
          authority: request.authority || this.config.auth.authority,
          correlationId,
          extraParameters: {
            ...request.tokenQueryParameters,
            [X_CLIENT_XTRA_SKU]: this.skus,
          },
          accountId: request.account.nativeAccountId,
          forceRefresh: request.forceRefresh || false,
        };
        return this.nativeBrokerPlugin.acquireTokenSilent(brokerRequest);
      }
      if (request.redirectUri) {
        if (!this.config.broker.nativeBrokerPlugin) throw NodeAuthError.createRedirectUriNotSupportedError();
        request.redirectUri = "";
      }
      return super.acquireTokenSilent(request);
    }
    async signOut(request) {
      if (this.nativeBrokerPlugin && request.account.nativeAccountId) {
        let signoutRequest = {
          clientId: this.config.auth.clientId,
          accountId: request.account.nativeAccountId,
          correlationId: request.correlationId || this.cryptoProvider.createNewGuid(),
        };
        await this.nativeBrokerPlugin.signOut(signoutRequest);
      }
      await this.getTokenCache().removeAccount(request.account, request.correlationId);
    }
    async getAllAccounts() {
      if (this.nativeBrokerPlugin) {
        let correlationId = this.cryptoProvider.createNewGuid();
        return this.nativeBrokerPlugin.getAllAccounts(this.config.auth.clientId, correlationId);
      }
      return this.getTokenCache().getAllAccounts();
    }
    async waitForRedirectUri(loopbackClient) {
      return new Promise((resolve, reject) => {
        let ticks = 0;
        let id = setInterval(() => {
          if (LOOPBACK_SERVER_CONSTANTS.TIMEOUT_MS / LOOPBACK_SERVER_CONSTANTS.INTERVAL_MS < ticks) {
            clearInterval(id);
            reject(NodeAuthError.createLoopbackServerTimeoutError());
            return;
          }
          try {
            let r = loopbackClient.getRedirectUri();
            clearInterval(id);
            resolve(r);
            return;
          } catch (e) {
            if (e instanceof AuthError && e.errorCode === NodeAuthErrorMessage.noLoopbackServerExists.code) {
              ticks++;
              return;
            }
            clearInterval(id);
            reject(e);
            return;
          }
        }, LOOPBACK_SERVER_CONSTANTS.INTERVAL_MS);
      });
    }
  };
});
//@ chunk-b5df2wx1.js:256304-260286 esm-fingerprint
let ClientCredentialClient; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:256304", () => {
  ClientCredentialClient = class ClientCredentialClient extends BaseClient {
    constructor(configuration, appTokenProvider) {
      super(configuration);
      this.appTokenProvider = appTokenProvider;
    }
    async acquireToken(request) {
      if (request.skipCache || request.claims) return this.executeTokenRequest(request, this.authority);
      let [cachedAuthenticationResult, lastCacheOutcome] = await this.getCachedAuthenticationResult(
        request,
        this.config,
        this.cryptoUtils,
        this.authority,
        this.cacheManager,
        this.serverTelemetryManager,
      );
      if (cachedAuthenticationResult) {
        if (lastCacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
          this.logger.info(
            "ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.",
          );
          let refreshAccessToken = true;
          await this.executeTokenRequest(request, this.authority, refreshAccessToken);
        }
        return cachedAuthenticationResult;
      } else return this.executeTokenRequest(request, this.authority);
    }
    async getCachedAuthenticationResult(
      request,
      config,
      cryptoUtils,
      authority,
      cacheManager,
      serverTelemetryManager,
    ) {
      let clientConfiguration = config;
      let managedIdentityConfiguration = config;
      let lastCacheOutcome = CacheOutcome.NOT_APPLICABLE;
      let cacheContext;
      if (clientConfiguration.serializableCache && clientConfiguration.persistencePlugin) {
        cacheContext = new TokenCacheContext(clientConfiguration.serializableCache, false);
        await clientConfiguration.persistencePlugin.beforeCacheAccess(cacheContext);
      }
      let cachedAccessToken = this.readAccessTokenFromCache(
        authority,
        managedIdentityConfiguration.managedIdentityId?.id || clientConfiguration.authOptions.clientId,
        new ScopeSet(request.scopes || []),
        cacheManager,
        request.correlationId,
      );
      if (clientConfiguration.serializableCache && clientConfiguration.persistencePlugin && cacheContext)
        await clientConfiguration.persistencePlugin.afterCacheAccess(cacheContext);
      if (!cachedAccessToken) {
        serverTelemetryManager?.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN);
        return [null, CacheOutcome.NO_CACHED_ACCESS_TOKEN];
      }
      if (
        isTokenExpired(
          cachedAccessToken.expiresOn,
          clientConfiguration.systemOptions?.tokenRenewalOffsetSeconds || DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
        )
      ) {
        serverTelemetryManager?.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED);
        return [null, CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED];
      }
      if (cachedAccessToken.refreshOn && isTokenExpired(cachedAccessToken.refreshOn.toString(), 0)) {
        lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
        serverTelemetryManager?.setCacheOutcome(CacheOutcome.PROACTIVELY_REFRESHED);
      }
      return [
        await ResponseHandler.generateAuthenticationResult(
          cryptoUtils,
          authority,
          {
            account: null,
            idToken: null,
            accessToken: cachedAccessToken,
            refreshToken: null,
            appMetadata: null,
          },
          true,
          request,
        ),
        lastCacheOutcome,
      ];
    }
    readAccessTokenFromCache(authority, id, scopeSet, cacheManager, correlationId) {
      let accessTokenFilter = {
        homeAccountId: Constants.EMPTY_STRING,
        environment: authority.canonicalAuthorityUrlComponents.HostNameAndPort,
        credentialType: CredentialType.ACCESS_TOKEN,
        clientId: id,
        realm: authority.tenant,
        target: ScopeSet.createSearchScopes(scopeSet.asArray()),
      };
      let accessTokens = cacheManager.getAccessTokensByFilter(accessTokenFilter, correlationId);
      if (accessTokens.length < 1) return null;
      else if (accessTokens.length > 1) throw createClientAuthError(multipleMatchingTokens);
      return accessTokens[0];
    }
    async executeTokenRequest(request, authority, authenticationResult) {
      let serverTokenResponse;
      let reqTimestamp;
      if (this.appTokenProvider) {
        this.logger.info("Using appTokenProvider extensibility.");
        let appTokenPropviderParameters = {
          correlationId: request.correlationId,
          tenantId: this.config.authOptions.authority.tenant,
          scopes: request.scopes,
          claims: request.claims,
        };
        reqTimestamp = nowSeconds();
        let appTokenProviderResult = await this.appTokenProvider(appTokenPropviderParameters);
        serverTokenResponse = {
          access_token: appTokenProviderResult.accessToken,
          expires_in: appTokenProviderResult.expiresInSeconds,
          refresh_in: appTokenProviderResult.refreshInSeconds,
          token_type: AuthenticationScheme.BEARER,
        };
      } else {
        let queryParametersString = this.createTokenQueryParameters(request);
        let endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
        let requestBody = await this.createTokenRequestBody(request);
        let headers = this.createTokenRequestHeaders();
        let thumbprint = {
          clientId: this.config.authOptions.clientId,
          authority: request.authority,
          scopes: request.scopes,
          claims: request.claims,
          authenticationScheme: request.authenticationScheme,
          resourceRequestMethod: request.resourceRequestMethod,
          resourceRequestUri: request.resourceRequestUri,
          shrClaims: request.shrClaims,
          sshKid: request.sshKid,
        };
        this.logger.info("Sending token request to endpoint: " + authority.tokenEndpoint);
        reqTimestamp = nowSeconds();
        let response = await this.executePostToTokenEndpoint(
          endpoint,
          requestBody,
          headers,
          thumbprint,
          request.correlationId,
        );
        serverTokenResponse = response.body;
        serverTokenResponse.status = response.status;
      }
      let responseHandler = new ResponseHandler(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
      responseHandler.validateTokenResponse(serverTokenResponse, authenticationResult);
      return await responseHandler.handleServerTokenResponse(
        serverTokenResponse,
        this.authority,
        reqTimestamp,
        request,
      );
    }
    async createTokenRequestBody(request) {
      let parameters = new Map();
      addClientId(parameters, this.config.authOptions.clientId);
      addScopes(parameters, request.scopes, false);
      addGrantType(parameters, GrantType.CLIENT_CREDENTIALS_GRANT);
      addLibraryInfo(parameters, this.config.libraryInfo);
      addApplicationTelemetry(parameters, this.config.telemetry.application);
      addThrottling(parameters);
      if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
      let correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
      addCorrelationId(parameters, correlationId);
      if (this.config.clientCredentials.clientSecret)
        addClientSecret(parameters, this.config.clientCredentials.clientSecret);
      let clientAssertion = request.clientAssertion || this.config.clientCredentials.clientAssertion;
      if (clientAssertion) {
        addClientAssertion(
          parameters,
          await getClientAssertion(
            clientAssertion.assertion,
            this.config.authOptions.clientId,
            request.resourceRequestUri,
          ),
        );
        addClientAssertionType(parameters, clientAssertion.assertionType);
      }
      if (
        !StringUtils.isEmptyObj(request.claims) ||
        (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
      )
        addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
      return mapToQueryString(parameters);
    }
  };
});
//@ chunk-b5df2wx1.js:260327-264439 esm-fingerprint
let OnBehalfOfClient; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b5df2wx1.js:260327", () => {
  OnBehalfOfClient = class OnBehalfOfClient extends BaseClient {
    constructor(configuration) {
      super(configuration);
    }
    async acquireToken(request) {
      this.scopeSet = new ScopeSet(request.scopes || []);
      this.userAssertionHash = await this.cryptoUtils.hashString(request.oboAssertion);
      if (request.skipCache || request.claims)
        return this.executeTokenRequest(request, this.authority, this.userAssertionHash);
      try {
        return await this.getCachedAuthenticationResult(request);
      } catch (e) {
        return await this.executeTokenRequest(request, this.authority, this.userAssertionHash);
      }
    }
    async getCachedAuthenticationResult(request) {
      let cachedAccessToken = this.readAccessTokenFromCacheForOBO(this.config.authOptions.clientId, request);
      if (!cachedAccessToken) {
        this.serverTelemetryManager?.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN);
        this.logger.info(
          "SilentFlowClient:acquireCachedToken - No access token found in cache for the given properties.",
        );
        throw createClientAuthError(tokenRefreshRequired);
      } else if (
        isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)
      ) {
        this.serverTelemetryManager?.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED);
        this.logger.info(
          `OnbehalfofFlow:getCachedAuthenticationResult - Cached access token is expired or will expire within ${this.config.systemOptions.tokenRenewalOffsetSeconds} seconds.`,
        );
        throw createClientAuthError(tokenRefreshRequired);
      }
      let cachedIdToken = this.readIdTokenFromCacheForOBO(
        cachedAccessToken.homeAccountId,
        request.correlationId,
      );
      let idTokenClaims;
      let cachedAccount = null;
      if (cachedIdToken) {
        idTokenClaims = extractTokenClaims(cachedIdToken.secret, EncodingUtils.base64Decode);
        let localAccountId = idTokenClaims.oid || idTokenClaims.sub;
        let accountInfo = {
          homeAccountId: cachedIdToken.homeAccountId,
          environment: cachedIdToken.environment,
          tenantId: cachedIdToken.realm,
          username: Constants.EMPTY_STRING,
          localAccountId: localAccountId || Constants.EMPTY_STRING,
        };
        cachedAccount = this.cacheManager.getAccount(
          this.cacheManager.generateAccountKey(accountInfo),
          request.correlationId,
        );
      }
      if (this.config.serverTelemetryManager) this.config.serverTelemetryManager.incrementCacheHits();
      return ResponseHandler.generateAuthenticationResult(
        this.cryptoUtils,
        this.authority,
        {
          account: cachedAccount,
          accessToken: cachedAccessToken,
          idToken: cachedIdToken,
          refreshToken: null,
          appMetadata: null,
        },
        true,
        request,
        idTokenClaims,
      );
    }
    readIdTokenFromCacheForOBO(atHomeAccountId, correlationId) {
      let idTokenFilter = {
        homeAccountId: atHomeAccountId,
        environment: this.authority.canonicalAuthorityUrlComponents.HostNameAndPort,
        credentialType: CredentialType.ID_TOKEN,
        clientId: this.config.authOptions.clientId,
        realm: this.authority.tenant,
      };
      let idTokenMap = this.cacheManager.getIdTokensByFilter(idTokenFilter, correlationId);
      if (Object.values(idTokenMap).length < 1) return null;
      return Object.values(idTokenMap)[0];
    }
    readAccessTokenFromCacheForOBO(clientId, request) {
      let authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
      let credentialType = {
        credentialType:
          authScheme && authScheme.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase()
            ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME
            : CredentialType.ACCESS_TOKEN,
        clientId,
        target: ScopeSet.createSearchScopes(this.scopeSet.asArray()),
        tokenType: authScheme,
        keyId: request.sshKid,
        requestedClaimsHash: request.requestedClaimsHash,
        userAssertionHash: this.userAssertionHash,
      };
      let accessTokens = this.cacheManager.getAccessTokensByFilter(credentialType, request.correlationId);
      let numAccessTokens = accessTokens.length;
      if (numAccessTokens < 1) return null;
      else if (numAccessTokens > 1) throw createClientAuthError(multipleMatchingTokens);
      return accessTokens[0];
    }
    async executeTokenRequest(request, authority, queryParameters) {
      let queryParametersString = this.createTokenQueryParameters(request);
      let endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
      let requestBody = await this.createTokenRequestBody(request);
      let headers = this.createTokenRequestHeaders();
      let thumbprint = {
        clientId: this.config.authOptions.clientId,
        authority: request.authority,
        scopes: request.scopes,
        claims: request.claims,
        authenticationScheme: request.authenticationScheme,
        resourceRequestMethod: request.resourceRequestMethod,
        resourceRequestUri: request.resourceRequestUri,
        shrClaims: request.shrClaims,
        sshKid: request.sshKid,
      };
      let reqTimestamp = nowSeconds();
      let response = await this.executePostToTokenEndpoint(
        endpoint,
        requestBody,
        headers,
        thumbprint,
        request.correlationId,
      );
      let responseHandler = new ResponseHandler(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
      responseHandler.validateTokenResponse(response.body);
      return await responseHandler.handleServerTokenResponse(
        response.body,
        this.authority,
        reqTimestamp,
        request,
        undefined,
        queryParameters,
      );
    }
    async createTokenRequestBody(request) {
      let parameters = new Map();
      addClientId(parameters, this.config.authOptions.clientId);
      addScopes(parameters, request.scopes);
      addGrantType(parameters, GrantType.JWT_BEARER);
      addClientInfo(parameters);
      addLibraryInfo(parameters, this.config.libraryInfo);
      addApplicationTelemetry(parameters, this.config.telemetry.application);
      addThrottling(parameters);
      if (this.serverTelemetryManager) addServerTelemetry(parameters, this.serverTelemetryManager);
      let correlationId = request.correlationId || this.config.cryptoInterface.createNewGuid();
      addCorrelationId(parameters, correlationId);
      addResponseType_12(parameters, ON_BEHALF_OF);
      addResponseType_11(parameters, request.oboAssertion);
      if (this.config.clientCredentials.clientSecret)
        addClientSecret(parameters, this.config.clientCredentials.clientSecret);
      let clientAssertion = this.config.clientCredentials.clientAssertion;
      if (clientAssertion) {
        addClientAssertion(
          parameters,
          await getClientAssertion(
            clientAssertion.assertion,
            this.config.authOptions.clientId,
            request.resourceRequestUri,
          ),
        );
        addClientAssertionType(parameters, clientAssertion.assertionType);
      }
      if (
        request.claims ||
        (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
      )
        addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
      return mapToQueryString(parameters);
    }
  };
});
//@ chunk-b5df2wx1.js:264480-267166 esm-fingerprint
let ConfidentialClientApplication; // deferred: uses ClientApplication of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:264480", () => {
  ConfidentialClientApplication = class ConfidentialClientApplication extends ClientApplication {
    constructor(configuration) {
      super(configuration);
      let clientSecretNotEmpty = !!this.config.auth.clientSecret;
      let clientAssertionNotEmpty = !!this.config.auth.clientAssertion;
      let certificateNotEmpty =
        (!!this.config.auth.clientCertificate?.thumbprint ||
          !!this.config.auth.clientCertificate?.thumbprintSha256) &&
        !!this.config.auth.clientCertificate?.privateKey;
      if (this.appTokenProvider) return;
      if (
        (clientSecretNotEmpty && clientAssertionNotEmpty) ||
        (clientAssertionNotEmpty && certificateNotEmpty) ||
        (clientSecretNotEmpty && certificateNotEmpty)
      )
        throw createClientAuthError(invalidClientCredential);
      if (this.config.auth.clientSecret) {
        this.clientSecret = this.config.auth.clientSecret;
        return;
      }
      if (this.config.auth.clientAssertion) {
        this.developerProvidedClientAssertion = this.config.auth.clientAssertion;
        return;
      }
      if (!certificateNotEmpty) throw createClientAuthError(invalidClientCredential);
      else
        this.clientAssertion = this.config.auth.clientCertificate.thumbprintSha256
          ? ClientAssertion.fromCertificateWithSha256Thumbprint(
              this.config.auth.clientCertificate.thumbprintSha256,
              this.config.auth.clientCertificate.privateKey,
              this.config.auth.clientCertificate.x5c,
            )
          : ClientAssertion.fromCertificate(
              this.config.auth.clientCertificate.thumbprint,
              this.config.auth.clientCertificate.privateKey,
              this.config.auth.clientCertificate.x5c,
            );
      this.appTokenProvider = undefined;
    }
    SetAppTokenProvider(provider) {
      this.appTokenProvider = provider;
    }
    async acquireTokenByClientCredential(request) {
      this.logger.info("acquireTokenByClientCredential called", request.correlationId);
      let clientAssertion;
      if (request.clientAssertion)
        clientAssertion = {
          assertion: await getClientAssertion(request.clientAssertion, this.config.auth.clientId),
          assertionType: Constants_2.JWT_BEARER_ASSERTION_TYPE,
        };
      let baseRequest = await this.initializeBaseRequest(request);
      let validBaseRequest = {
        ...baseRequest,
        scopes: baseRequest.scopes.filter((scope) => !OIDC_DEFAULT_SCOPES.includes(scope)),
      };
      let validRequest = {
        ...request,
        ...validBaseRequest,
        clientAssertion,
      };
      let firstPathSegment = new UrlString(validRequest.authority).getUrlComponents().PathSegments[0];
      if (Object.values(AADAuthorityConstants).includes(firstPathSegment))
        throw createClientAuthError(missingTenantIdError);
      let ENV_MSAL_FORCE_REGION = process.env[MSAL_FORCE_REGION];
      let region;
      if (validRequest.azureRegion !== "DisableMsalForceRegion")
        if (!validRequest.azureRegion && ENV_MSAL_FORCE_REGION) region = ENV_MSAL_FORCE_REGION;
        else region = validRequest.azureRegion;
      let azureRegionConfiguration = {
        azureRegion: region,
        environmentRegion: process.env[REGION_ENVIRONMENT_VARIABLE],
      };
      let serverTelemetryManager = this.initializeServerTelemetryManager(
        ApiId.acquireTokenByClientCredential,
        validRequest.correlationId,
        validRequest.skipCache,
      );
      try {
        let discoveredAuthority = await this.createAuthority(
          validRequest.authority,
          validRequest.correlationId,
          azureRegionConfiguration,
          request.azureCloudOptions,
        );
        let clientCredentialConfig = await this.buildOauthClientConfiguration(
          discoveredAuthority,
          validRequest.correlationId,
          "",
          serverTelemetryManager,
        );
        let clientCredentialClient = new ClientCredentialClient(
          clientCredentialConfig,
          this.appTokenProvider,
        );
        this.logger.verbose("Client credential client created", validRequest.correlationId);
        return await clientCredentialClient.acquireToken(validRequest);
      } catch (e) {
        if (e instanceof AuthError) e.setCorrelationId(validRequest.correlationId);
        serverTelemetryManager.cacheFailedRequest(e);
        throw e;
      }
    }
    async acquireTokenOnBehalfOf(request) {
      this.logger.info("acquireTokenOnBehalfOf called", request.correlationId);
      let validRequest = {
        ...request,
        ...(await this.initializeBaseRequest(request)),
      };
      try {
        let discoveredAuthority = await this.createAuthority(
          validRequest.authority,
          validRequest.correlationId,
          undefined,
          request.azureCloudOptions,
        );
        let onBehalfOfConfig = await this.buildOauthClientConfiguration(
          discoveredAuthority,
          validRequest.correlationId,
          "",
          undefined,
        );
        let oboClient = new OnBehalfOfClient(onBehalfOfConfig);
        this.logger.verbose("On behalf of client created", validRequest.correlationId);
        return await oboClient.acquireToken(validRequest);
      } catch (e) {
        if (e instanceof AuthError) e.setCorrelationId(validRequest.correlationId);
        throw e;
      }
    }
  };
});
//@ chunk-b5df2wx1.js:267207-267319 esm-fingerprint
function isIso8601(dateString) {
  if (typeof dateString !== "string") return false;
  let date = new Date(dateString);
  return !isNaN(date.getTime()) && date.toISOString() === dateString;
}
//@ chunk-b5df2wx1.js:267360-268107 esm-fingerprint
class HttpClientWithRetries {
  constructor(httpClientNoRetries, retryPolicy, logger) {
    this.httpClientNoRetries = httpClientNoRetries;
    this.retryPolicy = retryPolicy;
    this.logger = logger;
  }
  async sendNetworkRequestAsyncHelper(httpMethod, url, options) {
    if (httpMethod === HttpMethod.GET) return this.httpClientNoRetries.sendGetRequestAsync(url, options);
    else return this.httpClientNoRetries.sendPostRequestAsync(url, options);
  }
  async sendNetworkRequestAsync(httpMethod, url, options) {
    let response = await this.sendNetworkRequestAsyncHelper(httpMethod, url, options);
    if ("isNewRequest" in this.retryPolicy) this.retryPolicy.isNewRequest = true;
    let currentRetry = 0;
    while (
      await this.retryPolicy.pauseForRetry(
        response.status,
        currentRetry,
        this.logger,
        response.headers[HeaderNames_2.RETRY_AFTER],
      )
    ) {
      response = await this.sendNetworkRequestAsyncHelper(httpMethod, url, options);
      currentRetry++;
    }
    return response;
  }
  async sendGetRequestAsync(url, options) {
    return this.sendNetworkRequestAsync(HttpMethod.GET, url, options);
  }
  async sendPostRequestAsync(url, options) {
    return this.sendNetworkRequestAsync(HttpMethod.POST, url, options);
  }
}
//@ chunk-b5df2wx1.js:268148-268375 esm-fingerprint
var ManagedIdentityUserAssignedIdQueryParameterNames = {
  MANAGED_IDENTITY_CLIENT_ID_2017: "clientid",
  MANAGED_IDENTITY_CLIENT_ID: "client_id",
  MANAGED_IDENTITY_OBJECT_ID: "object_id",
  MANAGED_IDENTITY_RESOURCE_ID_IMDS: "msi_res_id",
  MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS: "mi_res_id",
};
//@ chunk-b5df2wx1.js:268375-271062 esm-fingerprint
class BaseManagedIdentitySource {
  constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
    this.logger = logger;
    this.nodeStorage = nodeStorage;
    this.networkClient = networkClient;
    this.cryptoProvider = cryptoProvider;
    this.disableInternalRetries = disableInternalRetries;
  }
  async getServerTokenResponseAsync(response, _networkClient, _networkRequest, _networkRequestOptions) {
    return this.getServerTokenResponse(response);
  }
  getServerTokenResponse(response) {
    let refreshIn;
    let expiresIn;
    if (response.body.expires_on) {
      if (isIso8601(response.body.expires_on))
        response.body.expires_on = new Date(response.body.expires_on).getTime() / 1000;
      expiresIn = response.body.expires_on - nowSeconds();
      if (expiresIn > 7200) refreshIn = expiresIn / 2;
    }
    return {
      status: response.status,
      access_token: response.body.access_token,
      expires_in: expiresIn,
      scope: response.body.resource,
      token_type: response.body.token_type,
      refresh_in: refreshIn,
      correlation_id: response.body.correlation_id || response.body.correlationId,
      error: typeof response.body.error === "string" ? response.body.error : response.body.error?.code,
      error_description:
        response.body.message ||
        (typeof response.body.error === "string"
          ? response.body.error_description
          : response.body.error?.message),
      error_codes: response.body.error_codes,
      timestamp: response.body.timestamp,
      trace_id: response.body.trace_id,
    };
  }
  async acquireTokenWithManagedIdentity(
    managedIdentityRequest,
    managedIdentityId,
    fakeAuthority,
    refreshAccessToken,
  ) {
    let networkRequest = this.createRequest(managedIdentityRequest.resource, managedIdentityId);
    if (managedIdentityRequest.revokedTokenSha256Hash) {
      this.logger.info(
        `[Managed Identity] The following claims are present in the request: ${managedIdentityRequest.claims}`,
      );
      networkRequest.queryParameters[ManagedIdentityQueryParameters.SHA256_TOKEN_TO_REFRESH] =
        managedIdentityRequest.revokedTokenSha256Hash;
    }
    if (managedIdentityRequest.clientCapabilities?.length) {
      let clientCapabilities = managedIdentityRequest.clientCapabilities.toString();
      this.logger.info(
        `[Managed Identity] The following client capabilities are present in the request: ${clientCapabilities}`,
      );
      networkRequest.queryParameters[ManagedIdentityQueryParameters.XMS_CC] = clientCapabilities;
    }
    let headers = networkRequest.headers;
    headers[HeaderNames_2.CONTENT_TYPE] = Constants.URL_FORM_CONTENT_TYPE;
    let networkRequestOptions = {
      headers,
    };
    if (Object.keys(networkRequest.bodyParameters).length)
      networkRequestOptions.body = networkRequest.computeParametersBodyString();
    let networkClientHelper = this.disableInternalRetries
      ? this.networkClient
      : new HttpClientWithRetries(this.networkClient, networkRequest.retryPolicy, this.logger);
    let reqTimestamp = nowSeconds();
    let response;
    try {
      if (networkRequest.httpMethod === HttpMethod.POST)
        response = await networkClientHelper.sendPostRequestAsync(
          networkRequest.computeUri(),
          networkRequestOptions,
        );
      else
        response = await networkClientHelper.sendGetRequestAsync(
          networkRequest.computeUri(),
          networkRequestOptions,
        );
    } catch (error) {
      if (error instanceof AuthError) throw error;
      else throw createClientAuthError(networkError);
    }
    let responseHandler = new ResponseHandler(
      managedIdentityId.id,
      this.nodeStorage,
      this.cryptoProvider,
      this.logger,
      null,
      null,
    );
    let serverTokenResponse = await this.getServerTokenResponseAsync(
      response,
      networkClientHelper,
      networkRequest,
      networkRequestOptions,
    );
    responseHandler.validateTokenResponse(serverTokenResponse, refreshAccessToken);
    return responseHandler.handleServerTokenResponse(
      serverTokenResponse,
      fakeAuthority,
      reqTimestamp,
      managedIdentityRequest,
    );
  }
  getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityIdType, isImds, usesApi2017) {
    switch (managedIdentityIdType) {
      case ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID:
        this.logger.info(
          `[Managed Identity] [API version ${usesApi2017 ? "2017+" : "2019+"}] Adding user assigned client id to the request.`,
        );
        return usesApi2017
          ? ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID_2017
          : ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID;
      case ManagedIdentityIdType.USER_ASSIGNED_RESOURCE_ID:
        this.logger.info("[Managed Identity] Adding user assigned resource id to the request.");
        return isImds
          ? ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_RESOURCE_ID_IMDS
          : ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS;
      case ManagedIdentityIdType.USER_ASSIGNED_OBJECT_ID:
        this.logger.info("[Managed Identity] Adding user assigned object id to the request.");
        return ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_OBJECT_ID;
      default:
        throw createManagedIdentityError(invalidManagedIdentityIdType);
    }
  }
}
//@ chunk-b5df2wx1.js:271062-271287 esm-fingerprint
// deferred: uses BaseManagedIdentitySource of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:271062", () => {
  BaseManagedIdentitySource.getValidatedEnvVariableUrlString = (
    envVariableStringName,
    envVariable,
    sourceName,
    logger,
  ) => {
    try {
      return new UrlString(envVariable).urlString;
    } catch (error) {
      logger.info(
        `[Managed Identity] ${sourceName} managed identity is unavailable because the '${envVariableStringName}' environment variable is malformed.`,
      );
      throw createManagedIdentityError(MsiEnvironmentVariableUrlMalformedErrorCodes[envVariableStringName]);
    }
  };
});
//@ chunk-b5df2wx1.js:271328-271488 esm-fingerprint
class LinearRetryStrategy {
  calculateDelay(retryHeader, minimumDelay) {
    if (!retryHeader) return minimumDelay;
    let millisToSleep = Math.round(parseFloat(retryHeader) * 1000);
    if (isNaN(millisToSleep)) millisToSleep = new Date(retryHeader).valueOf() - new Date().valueOf();
    return Math.max(minimumDelay, millisToSleep);
  }
}
//@ chunk-b5df2wx1.js:271529-271656 esm-layout
var DEFAULT_MANAGED_IDENTITY_MAX_RETRIES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS;
var DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON;
deferInit("chunk-b5df2wx1.js:271529", () => {
  DEFAULT_MANAGED_IDENTITY_MAX_RETRIES = 3;
  DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS = 1000;
  DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON = [
    HttpStatus.NOT_FOUND,
    HttpStatus.REQUEST_TIMEOUT,
    HttpStatus.TOO_MANY_REQUESTS,
    HttpStatus.SERVER_ERROR,
    HttpStatus.SERVICE_UNAVAILABLE,
    HttpStatus.GATEWAY_TIMEOUT,
  ];
});
//@ chunk-b5df2wx1.js:271656-272044 esm-fingerprint
class DefaultManagedIdentityRetryPolicy {
  constructor() {
    this.linearRetryStrategy = new LinearRetryStrategy();
  }
  static get DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS() {
    return DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS;
  }
  async pauseForRetry(httpStatusCode, currentRetry, logger, retryAfterHeader) {
    if (
      DEFAULT_MANAGED_IDENTITY_HTTP_STATUS_CODES_TO_RETRY_ON.includes(httpStatusCode) &&
      currentRetry < DEFAULT_MANAGED_IDENTITY_MAX_RETRIES
    ) {
      let retryAfterDelay = this.linearRetryStrategy.calculateDelay(
        retryAfterHeader,
        DefaultManagedIdentityRetryPolicy.DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS,
      );
      logger.verbose(`Retrying request in ${retryAfterDelay}ms (retry attempt: ${currentRetry + 1})`);
      await new Promise((resolve) => setTimeout(resolve, retryAfterDelay));
      return true;
    }
    return false;
  }
}
//@ chunk-b5df2wx1.js:272085-272488 esm-fingerprint
class ManagedIdentityRequestParameters {
  constructor(httpMethod, endpoint, retryPolicy) {
    this.httpMethod = httpMethod;
    this._baseEndpoint = endpoint;
    this.headers = {};
    this.bodyParameters = {};
    this.queryParameters = {};
    this.retryPolicy = retryPolicy || new DefaultManagedIdentityRetryPolicy();
  }
  computeUri() {
    let parameters = new Map();
    if (this.queryParameters) addExtraQueryParameters(parameters, this.queryParameters);
    let queryParametersString = mapToQueryString(parameters);
    return UrlString.appendQueryString(this._baseEndpoint, queryParametersString);
  }
  computeParametersBodyString() {
    let parameters = new Map();
    if (this.bodyParameters) addExtraQueryParameters(parameters, this.bodyParameters);
    return mapToQueryString(parameters);
  }
}
//@ chunk-b5df2wx1.js:272529-272549 esm-fingerprint
var APP_SERVICE_MSI_API_VERSION = "2019-08-01";
//@ chunk-b5df2wx1.js:272549-273670 esm-fingerprint
let AppService; // deferred: uses BaseManagedIdentitySource of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:272549", () => {
  AppService = class AppService extends BaseManagedIdentitySource {
    constructor(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      identityEndpoint,
      identityHeader,
    ) {
      super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
      this.identityEndpoint = identityEndpoint;
      this.identityHeader = identityHeader;
    }
    static getEnvironmentVariables() {
      let identityEndpoint = process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT];
      let identityHeader = process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER];
      return [identityEndpoint, identityHeader];
    }
    static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
      let [identityEndpoint, identityHeader] = AppService.getEnvironmentVariables();
      if (!identityEndpoint || !identityHeader) {
        logger.info(
          `[Managed Identity] ${ManagedIdentitySourceNames.APP_SERVICE} managed identity is unavailable because one or both of the '${ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER}' and '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' environment variables are not defined.`,
        );
        return null;
      }
      let validatedIdentityEndpoint = AppService.getValidatedEnvVariableUrlString(
        ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT,
        identityEndpoint,
        ManagedIdentitySourceNames.APP_SERVICE,
        logger,
      );
      logger.info(
        `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.APP_SERVICE} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.APP_SERVICE} managed identity.`,
      );
      return new AppService(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        identityEndpoint,
        identityHeader,
      );
    }
    createRequest(resource, managedIdentityId) {
      let request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.identityEndpoint);
      request.headers[ManagedIdentityHeaders.APP_SERVICE_SECRET_HEADER_NAME] = this.identityHeader;
      request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = APP_SERVICE_MSI_API_VERSION;
      request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
      if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED)
        request.queryParameters[
          this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType)
        ] = managedIdentityId.id;
      return request;
    }
  };
});
//@ chunk-b5df2wx1.js:276429-277268 esm-fingerprint
let CloudShell; // deferred: uses BaseManagedIdentitySource of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:276429", () => {
  CloudShell = class CloudShell extends BaseManagedIdentitySource {
    constructor(errorCode, nodeStorage, networkClient, cryptoProvider, disableInternalRetries, msiEndpoint) {
      super(errorCode, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
      this.msiEndpoint = msiEndpoint;
    }
    static getEnvironmentVariables() {
      return [process.env[ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT]];
    }
    static tryCreate(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      managedIdentityId,
    ) {
      let [msiEndpoint] = CloudShell.getEnvironmentVariables();
      if (!msiEndpoint) {
        logger.info(
          `[Managed Identity] ${ManagedIdentitySourceNames.CLOUD_SHELL} managed identity is unavailable because the '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT} environment variable is not defined.`,
        );
        return null;
      }
      let validatedMsiEndpoint = CloudShell.getValidatedEnvVariableUrlString(
        ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT,
        msiEndpoint,
        ManagedIdentitySourceNames.CLOUD_SHELL,
        logger,
      );
      logger.info(
        `[Managed Identity] Environment variable validation passed for ${ManagedIdentitySourceNames.CLOUD_SHELL} managed identity. Endpoint URI: ${validatedMsiEndpoint}. Creating ${ManagedIdentitySourceNames.CLOUD_SHELL} managed identity.`,
      );
      if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED)
        throw createManagedIdentityError(unableToCreateCloudShell);
      return new CloudShell(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        msiEndpoint,
      );
    }
    createRequest(resource) {
      let request = new ManagedIdentityRequestParameters(HttpMethod.POST, this.msiEndpoint);
      request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
      request.bodyParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
      return request;
    }
  };
});
//@ chunk-b5df2wx1.js:277309-277577 esm-fingerprint
class ExponentialRetryStrategy {
  constructor(minExponentialBackoff, maxExponentialBackoff, exponentialDeltaBackoff) {
    this.minExponentialBackoff = minExponentialBackoff;
    this.maxExponentialBackoff = maxExponentialBackoff;
    this.exponentialDeltaBackoff = exponentialDeltaBackoff;
  }
  calculateDelay(currentRetry) {
    if (currentRetry === 0) return this.minExponentialBackoff;
    return Math.min(Math.pow(2, currentRetry - 1) * this.exponentialDeltaBackoff, this.maxExponentialBackoff);
  }
}
//@ chunk-b5df2wx1.js:278614-278704 esm-fingerprint
var IMDS_TOKEN_PATH = "/metadata/identity/oauth2/token";
var DEFAULT_IMDS_ENDPOINT = `http://169.254.169.254${IMDS_TOKEN_PATH}`;
var IMDS_API_VERSION = "2018-02-01";
//@ chunk-b5df2wx1.js:278704-279706 esm-fingerprint
let Imds; // deferred: uses BaseManagedIdentitySource of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:278704", () => {
  Imds = class Imds extends BaseManagedIdentitySource {
    constructor(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      identityEndpoint,
    ) {
      super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
      this.identityEndpoint = identityEndpoint;
    }
    static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
      let validatedIdentityEndpoint;
      if (process.env[ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]) {
        logger.info(
          `[Managed Identity] Environment variable ${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST} for ${ManagedIdentitySourceNames.IMDS} returned endpoint: ${process.env[ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]}`,
        );
        validatedIdentityEndpoint = Imds.getValidatedEnvVariableUrlString(
          ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST,
          `${process.env[ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST]}${IMDS_TOKEN_PATH}`,
          ManagedIdentitySourceNames.IMDS,
          logger,
        );
      } else {
        logger.info(
          `[Managed Identity] Unable to find ${ManagedIdentityEnvironmentVariableNames.AZURE_POD_IDENTITY_AUTHORITY_HOST} environment variable for ${ManagedIdentitySourceNames.IMDS}, using the default endpoint.`,
        );
        validatedIdentityEndpoint = DEFAULT_IMDS_ENDPOINT;
      }
      return new Imds(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        validatedIdentityEndpoint,
      );
    }
    createRequest(resource, managedIdentityId) {
      let request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.identityEndpoint);
      request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
      request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = IMDS_API_VERSION;
      request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
      if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED)
        request.queryParameters[
          this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType, true)
        ] = managedIdentityId.id;
      request.retryPolicy = new ImdsRetryPolicy();
      return request;
    }
  };
});
//@ chunk-b5df2wx1.js:279747-279775 esm-fingerprint
var SERVICE_FABRIC_MSI_API_VERSION = "2019-07-01-preview";
//@ chunk-b5df2wx1.js:279775-281290 esm-fingerprint
let ServiceFabric; // deferred: uses BaseManagedIdentitySource of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:279775", () => {
  ServiceFabric = class ServiceFabric extends BaseManagedIdentitySource {
    constructor(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      identityEndpoint,
      identityHeader,
    ) {
      super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
      this.identityEndpoint = identityEndpoint;
      this.identityHeader = identityHeader;
    }
    static getEnvironmentVariables() {
      let identityEndpoint = process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT];
      let identityHeader = process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER];
      let identityServerThumbprint =
        process.env[ManagedIdentityEnvironmentVariableNames.IDENTITY_SERVER_THUMBPRINT];
      return [identityEndpoint, identityHeader, identityServerThumbprint];
    }
    static tryCreate(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      managedIdentityId,
    ) {
      let [identityEndpoint, identityHeader, identityServerThumbprint] =
        ServiceFabric.getEnvironmentVariables();
      if (!identityEndpoint || !identityHeader || !identityServerThumbprint) {
        logger.info(
          `[Managed Identity] ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity is unavailable because one or all of the '${ManagedIdentityEnvironmentVariableNames.IDENTITY_HEADER}', '${ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT}' or '${ManagedIdentityEnvironmentVariableNames.IDENTITY_SERVER_THUMBPRINT}' environment variables are not defined.`,
        );
        return null;
      }
      let validatedIdentityEndpoint = ServiceFabric.getValidatedEnvVariableUrlString(
        ManagedIdentityEnvironmentVariableNames.IDENTITY_ENDPOINT,
        identityEndpoint,
        ManagedIdentitySourceNames.SERVICE_FABRIC,
        logger,
      );
      logger.info(
        `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity. Endpoint URI: ${validatedIdentityEndpoint}. Creating ${ManagedIdentitySourceNames.SERVICE_FABRIC} managed identity.`,
      );
      if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED)
        logger.warning(
          `[Managed Identity] ${ManagedIdentitySourceNames.SERVICE_FABRIC} user assigned managed identity is configured in the cluster, not during runtime. See also: https://learn.microsoft.com/en-us/azure/service-fabric/configure-existing-cluster-enable-managed-identity-token-service.`,
        );
      return new ServiceFabric(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        identityEndpoint,
        identityHeader,
      );
    }
    createRequest(resource, managedIdentityId) {
      let request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.identityEndpoint);
      request.headers[ManagedIdentityHeaders.ML_AND_SF_SECRET_HEADER_NAME] = this.identityHeader;
      request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = SERVICE_FABRIC_MSI_API_VERSION;
      request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
      if (managedIdentityId.idType !== ManagedIdentityIdType.SYSTEM_ASSIGNED)
        request.queryParameters[
          this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType)
        ] = managedIdentityId.id;
      return request;
    }
  };
});
//@ chunk-b5df2wx1.js:281331-281445 esm-fingerprint
var MACHINE_LEARNING_MSI_API_VERSION; // deferred: uses DEFAULT_MANAGED_IDENTITY_ID of its import cycle while loading; runs once the cycle is complete
var MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR;
deferInit("chunk-b5df2wx1.js:281331", () => {
  MACHINE_LEARNING_MSI_API_VERSION = "2017-09-01";
  MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR = `Only client id is supported for user-assigned managed identity in ${ManagedIdentitySourceNames.MACHINE_LEARNING}.`;
});
//@ chunk-b5df2wx1.js:281445-282744 esm-fingerprint
let MachineLearning; // deferred: uses BaseManagedIdentitySource of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:281445", () => {
  MachineLearning = class MachineLearning extends BaseManagedIdentitySource {
    constructor(
      logger,
      nodeStorage,
      networkClient,
      cryptoProvider,
      disableInternalRetries,
      msiEndpoint,
      secret,
    ) {
      super(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
      this.msiEndpoint = msiEndpoint;
      this.secret = secret;
    }
    static getEnvironmentVariables() {
      let msiEndpoint = process.env[ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT];
      let secret = process.env[ManagedIdentityEnvironmentVariableNames.MSI_SECRET];
      return [msiEndpoint, secret];
    }
    static tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
      let [msiEndpoint, secret] = MachineLearning.getEnvironmentVariables();
      if (!msiEndpoint || !secret) {
        logger.info(
          `[Managed Identity] ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity is unavailable because one or both of the '${ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT}' and '${ManagedIdentityEnvironmentVariableNames.MSI_SECRET}' environment variables are not defined.`,
        );
        return null;
      }
      let validatedMsiEndpoint = MachineLearning.getValidatedEnvVariableUrlString(
        ManagedIdentityEnvironmentVariableNames.MSI_ENDPOINT,
        msiEndpoint,
        ManagedIdentitySourceNames.MACHINE_LEARNING,
        logger,
      );
      logger.info(
        `[Managed Identity] Environment variables validation passed for ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity. Endpoint URI: ${validatedMsiEndpoint}. Creating ${ManagedIdentitySourceNames.MACHINE_LEARNING} managed identity.`,
      );
      return new MachineLearning(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        msiEndpoint,
        secret,
      );
    }
    createRequest(resource, managedIdentityId) {
      let request = new ManagedIdentityRequestParameters(HttpMethod.GET, this.msiEndpoint);
      request.headers[ManagedIdentityHeaders.METADATA_HEADER_NAME] = "true";
      request.headers[ManagedIdentityHeaders.ML_AND_SF_SECRET_HEADER_NAME] = this.secret;
      request.queryParameters[ManagedIdentityQueryParameters.API_VERSION] = MACHINE_LEARNING_MSI_API_VERSION;
      request.queryParameters[ManagedIdentityQueryParameters.RESOURCE] = resource;
      if (managedIdentityId.idType === ManagedIdentityIdType.SYSTEM_ASSIGNED)
        request.queryParameters[
          ManagedIdentityUserAssignedIdQueryParameterNames.MANAGED_IDENTITY_CLIENT_ID_2017
        ] = process.env[ManagedIdentityEnvironmentVariableNames.DEFAULT_IDENTITY_CLIENT_ID];
      else if (managedIdentityId.idType === ManagedIdentityIdType.USER_ASSIGNED_CLIENT_ID)
        request.queryParameters[
          this.getManagedIdentityUserAssignedIdQueryParameterKey(managedIdentityId.idType, false, true)
        ] = managedIdentityId.id;
      else throw Error(MANAGED_IDENTITY_MACHINE_LEARNING_UNSUPPORTED_ID_TYPE_ERROR);
      return request;
    }
  };
});
//@ chunk-b5df2wx1.js:282785-284024 esm-fingerprint
class ManagedIdentityClient {
  constructor(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) {
    this.logger = logger;
    this.nodeStorage = nodeStorage;
    this.networkClient = networkClient;
    this.cryptoProvider = cryptoProvider;
    this.disableInternalRetries = disableInternalRetries;
  }
  async sendManagedIdentityTokenRequest(
    managedIdentityRequest,
    managedIdentityId,
    fakeAuthority,
    refreshAccessToken,
  ) {
    if (!ManagedIdentityClient.identitySource)
      ManagedIdentityClient.identitySource = this.selectManagedIdentitySource(
        this.logger,
        this.nodeStorage,
        this.networkClient,
        this.cryptoProvider,
        this.disableInternalRetries,
        managedIdentityId,
      );
    return ManagedIdentityClient.identitySource.acquireTokenWithManagedIdentity(
      managedIdentityRequest,
      managedIdentityId,
      fakeAuthority,
      refreshAccessToken,
    );
  }
  allEnvironmentVariablesAreDefined(environmentVariables) {
    return Object.values(environmentVariables).every(
      (environmentVariable) => environmentVariable !== undefined,
    );
  }
  getManagedIdentitySource() {
    ManagedIdentityClient.sourceName = this.allEnvironmentVariablesAreDefined(
      ServiceFabric.getEnvironmentVariables(),
    )
      ? ManagedIdentitySourceNames.SERVICE_FABRIC
      : this.allEnvironmentVariablesAreDefined(AppService.getEnvironmentVariables())
        ? ManagedIdentitySourceNames.APP_SERVICE
        : this.allEnvironmentVariablesAreDefined(MachineLearning.getEnvironmentVariables())
          ? ManagedIdentitySourceNames.MACHINE_LEARNING
          : this.allEnvironmentVariablesAreDefined(CloudShell.getEnvironmentVariables())
            ? ManagedIdentitySourceNames.CLOUD_SHELL
            : this.allEnvironmentVariablesAreDefined(AzureArc.getEnvironmentVariables())
              ? ManagedIdentitySourceNames.AZURE_ARC
              : ManagedIdentitySourceNames.DEFAULT_TO_IMDS;
    return ManagedIdentityClient.sourceName;
  }
  selectManagedIdentitySource(
    logger,
    nodeStorage,
    networkClient,
    cryptoProvider,
    disableInternalRetries,
    managedIdentityId,
  ) {
    let source =
      ServiceFabric.tryCreate(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        managedIdentityId,
      ) ||
      AppService.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) ||
      MachineLearning.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries) ||
      CloudShell.tryCreate(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        managedIdentityId,
      ) ||
      AzureArc.tryCreate(
        logger,
        nodeStorage,
        networkClient,
        cryptoProvider,
        disableInternalRetries,
        managedIdentityId,
      ) ||
      Imds.tryCreate(logger, nodeStorage, networkClient, cryptoProvider, disableInternalRetries);
    if (!source) throw createManagedIdentityError(unableToCreateSource);
    return source;
  }
}
//@ chunk-b5df2wx1.js:284065-284091 esm-fingerprint
var SOURCES_THAT_SUPPORT_TOKEN_REVOCATION; // deferred: uses DEFAULT_MANAGED_IDENTITY_ID of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b5df2wx1.js:284065", () => {
  SOURCES_THAT_SUPPORT_TOKEN_REVOCATION = [ManagedIdentitySourceNames.SERVICE_FABRIC];
});
//@ chunk-b5df2wx1.js:284091-286452 esm-fingerprint
class ManagedIdentityApplication {
  constructor(configuration) {
    this.config = buildManagedIdentityConfiguration(configuration || {});
    this.logger = new Logger(this.config.system.loggerOptions, name, version);
    let fakeStatusAuthorityOptions = {
      canonicalAuthority: Constants.DEFAULT_AUTHORITY,
    };
    if (!ManagedIdentityApplication.nodeStorage)
      ManagedIdentityApplication.nodeStorage = new NodeStorage(
        this.logger,
        this.config.managedIdentityId.id,
        DEFAULT_CRYPTO_IMPLEMENTATION,
        fakeStatusAuthorityOptions,
      );
    this.networkClient = this.config.system.networkClient;
    this.cryptoProvider = new CryptoProvider();
    let fakeAuthorityOptions = {
      protocolMode: ProtocolMode.AAD,
      knownAuthorities: [DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY],
      cloudDiscoveryMetadata: "",
      authorityMetadata: "",
    };
    this.fakeAuthority = new Authority(
      DEFAULT_AUTHORITY_FOR_MANAGED_IDENTITY,
      this.networkClient,
      ManagedIdentityApplication.nodeStorage,
      fakeAuthorityOptions,
      this.logger,
      this.cryptoProvider.createNewGuid(),
      undefined,
      true,
    );
    this.fakeClientCredentialClient = new ClientCredentialClient({
      authOptions: {
        clientId: this.config.managedIdentityId.id,
        authority: this.fakeAuthority,
      },
    });
    this.managedIdentityClient = new ManagedIdentityClient(
      this.logger,
      ManagedIdentityApplication.nodeStorage,
      this.networkClient,
      this.cryptoProvider,
      this.config.disableInternalRetries,
    );
    this.hashUtils = new HashUtils();
  }
  async acquireToken(managedIdentityRequestParams) {
    if (!managedIdentityRequestParams.resource) throw createClientConfigurationError(urlEmptyError);
    let managedIdentityRequest = {
      forceRefresh: managedIdentityRequestParams.forceRefresh,
      resource: managedIdentityRequestParams.resource.replace("/.default", ""),
      scopes: [managedIdentityRequestParams.resource.replace("/.default", "")],
      authority: this.fakeAuthority.canonicalAuthority,
      correlationId: this.cryptoProvider.createNewGuid(),
      claims: managedIdentityRequestParams.claims,
      clientCapabilities: this.config.clientCapabilities,
    };
    if (managedIdentityRequest.forceRefresh)
      return this.acquireTokenFromManagedIdentity(
        managedIdentityRequest,
        this.config.managedIdentityId,
        this.fakeAuthority,
      );
    let [cachedAuthenticationResult, lastCacheOutcome] =
      await this.fakeClientCredentialClient.getCachedAuthenticationResult(
        managedIdentityRequest,
        this.config,
        this.cryptoProvider,
        this.fakeAuthority,
        ManagedIdentityApplication.nodeStorage,
      );
    if (managedIdentityRequest.claims) {
      let sourceName = this.managedIdentityClient.getManagedIdentitySource();
      if (cachedAuthenticationResult && SOURCES_THAT_SUPPORT_TOKEN_REVOCATION.includes(sourceName)) {
        let revokedTokenSha256Hash = this.hashUtils
          .sha256(cachedAuthenticationResult.accessToken)
          .toString(EncodingTypes.HEX);
        managedIdentityRequest.revokedTokenSha256Hash = revokedTokenSha256Hash;
      }
      return this.acquireTokenFromManagedIdentity(
        managedIdentityRequest,
        this.config.managedIdentityId,
        this.fakeAuthority,
      );
    }
    if (cachedAuthenticationResult) {
      if (lastCacheOutcome === CacheOutcome.PROACTIVELY_REFRESHED) {
        this.logger.info(
          "ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.",
        );
        let refreshAccessToken = true;
        await this.acquireTokenFromManagedIdentity(
          managedIdentityRequest,
          this.config.managedIdentityId,
          this.fakeAuthority,
          refreshAccessToken,
        );
      }
      return cachedAuthenticationResult;
    } else
      return this.acquireTokenFromManagedIdentity(
        managedIdentityRequest,
        this.config.managedIdentityId,
        this.fakeAuthority,
      );
  }
  async acquireTokenFromManagedIdentity(
    managedIdentityRequest,
    managedIdentityId,
    fakeAuthority,
    refreshAccessToken,
  ) {
    return this.managedIdentityClient.sendManagedIdentityTokenRequest(
      managedIdentityRequest,
      managedIdentityId,
      fakeAuthority,
      refreshAccessToken,
    );
  }
  getManagedIdentitySource() {
    return ManagedIdentityClient.sourceName || this.managedIdentityClient.getManagedIdentitySource();
  }
}

// The import cycle this module closes (4 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/@azure/msal-node/lib/msal-node.cjs");
export {
  HttpClient,
  NodeAuthError,
  ManagedIdentityId,
  BaseManagedIdentitySource,
  ManagedIdentityEnvironmentVariableNames,
  ManagedIdentitySourceNames,
  ManagedIdentityIdType,
  createManagedIdentityError,
  unableToCreateAzureArc,
  ManagedIdentityRequestParameters,
  HttpMethod,
  ManagedIdentityHeaders,
  ManagedIdentityQueryParameters,
  wwwAuthenticateHeaderMissing,
  wwwAuthenticateHeaderUnsupportedFormat,
  platformNotSupported,
  invalidFileExtension,
  invalidFilePath,
  unableToReadSecretFile,
  AZURE_ARC_SECRET_FILE_MAX_SIZE_BYTES,
  invalidSecret,
  ExponentialRetryStrategy,
  PublicClientApplication,
  ConfidentialClientApplication,
  ManagedIdentityApplication,
};
