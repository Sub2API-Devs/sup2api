/**
 * @azure/msal-common/lib/index-node-DhUjlPuB.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-common@15.13.1
 * pieces: chunk-mrx6y2r5.js (171)
 * attribution: esm-fingerprint 131, esm-layout 25, layout 15
 */
import { LogLevel, Logger } from "../dist/logger/Logger.mjs";

//@ chunk-mrx6y2r5.js:90426-92176 esm-fingerprint
var Constants = {
  LIBRARY_NAME: "MSAL.JS",
  SKU: "msal.js.common",
  DEFAULT_AUTHORITY: "https://login.microsoftonline.com/common/",
  DEFAULT_AUTHORITY_HOST: "login.microsoftonline.com",
  DEFAULT_COMMON_TENANT: "common",
  ADFS: "adfs",
  DSTS: "dstsv2",
  AAD_INSTANCE_DISCOVERY_ENDPT:
    "https://login.microsoftonline.com/common/discovery/instance?api-version=1.1&authorization_endpoint=",
  CIAM_AUTH_URL: ".ciamlogin.com",
  AAD_TENANT_DOMAIN_SUFFIX: ".onmicrosoft.com",
  RESOURCE_DELIM: "|",
  NO_ACCOUNT: "NO_ACCOUNT",
  CLAIMS: "claims",
  CONSUMER_UTID: "9188040d-6c67-4c5b-b112-36a304b66dad",
  OPENID_SCOPE: "openid",
  PROFILE_SCOPE: "profile",
  OFFLINE_ACCESS_SCOPE: "offline_access",
  EMAIL_SCOPE: "email",
  CODE_GRANT_TYPE: "authorization_code",
  RT_GRANT_TYPE: "refresh_token",
  S256_CODE_CHALLENGE_METHOD: "S256",
  URL_FORM_CONTENT_TYPE: "application/x-www-form-urlencoded;charset=utf-8",
  AUTHORIZATION_PENDING: "authorization_pending",
  NOT_DEFINED: "not_defined",
  EMPTY_STRING: "",
  NOT_APPLICABLE: "N/A",
  NOT_AVAILABLE: "Not Available",
  FORWARD_SLASH: "/",
  IMDS_ENDPOINT: "http://169.254.169.254/metadata/instance/compute/location",
  IMDS_VERSION: "2020-06-01",
  IMDS_TIMEOUT: 2000,
  AZURE_REGION_AUTO_DISCOVER_FLAG: "TryAutoDetect",
  REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX: "login.microsoft.com",
  KNOWN_PUBLIC_CLOUDS: [
    "login.microsoftonline.com",
    "login.windows.net",
    "login.microsoft.com",
    "sts.windows.net",
  ],
  SHR_NONCE_VALIDITY: 240,
  INVALID_INSTANCE: "invalid_instance",
};
var HttpStatus = {
  SUCCESS: 200,
  SUCCESS_RANGE_START: 200,
  SUCCESS_RANGE_END: 299,
  REDIRECT: 302,
  CLIENT_ERROR: 400,
  CLIENT_ERROR_RANGE_START: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  REQUEST_TIMEOUT: 408,
  GONE: 410,
  TOO_MANY_REQUESTS: 429,
  CLIENT_ERROR_RANGE_END: 499,
  SERVER_ERROR: 500,
  SERVER_ERROR_RANGE_START: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  SERVER_ERROR_RANGE_END: 599,
  MULTI_SIDED_ERROR: 600,
};
//@ chunk-mrx6y2r5.js:92176-92526 esm-fingerprint
var OIDC_DEFAULT_SCOPES = [Constants.OPENID_SCOPE, Constants.PROFILE_SCOPE, Constants.OFFLINE_ACCESS_SCOPE];
var OIDC_SCOPES = [...OIDC_DEFAULT_SCOPES, Constants.EMAIL_SCOPE];
var HeaderNames = {
  CONTENT_TYPE: "Content-Type",
  CONTENT_LENGTH: "Content-Length",
  RETRY_AFTER: "Retry-After",
  CCS_HEADER: "X-AnchorMailbox",
  WWWAuthenticate: "WWW-Authenticate",
  AuthenticationInfo: "Authentication-Info",
  X_MS_REQUEST_ID: "x-ms-request-id",
  X_MS_HTTP_VERSION: "x-ms-httpver",
};
//@ chunk-mrx6y2r5.js:92526-92910 esm-fingerprint
var AADAuthorityConstants = {
  COMMON: "common",
  ORGANIZATIONS: "organizations",
  CONSUMERS: "consumers",
};
var nr = {
  ACCESS_TOKEN: "access_token",
  XMS_CC: "xms_cc",
};
var PromptValue = {
  LOGIN: "login",
  SELECT_ACCOUNT: "select_account",
  CONSENT: "consent",
  NONE: "none",
  CREATE: "create",
  NO_SESSION: "no_session",
};
var CodeChallengeMethodValues = {
  PLAIN: "plain",
  S256: "S256",
};
var OAuthResponseType = {
  CODE: "code",
  IDTOKEN_TOKEN: "id_token token",
  IDTOKEN_TOKEN_REFRESHTOKEN: "id_token token refresh_token",
};
//@ chunk-mrx6y2r5.js:92910-93571 esm-fingerprint
var mt = {
  QUERY: "query",
  FRAGMENT: "fragment",
  FORM_POST: "form_post",
};
var GrantType = {
  IMPLICIT_GRANT: "implicit",
  AUTHORIZATION_CODE_GRANT: "authorization_code",
  CLIENT_CREDENTIALS_GRANT: "client_credentials",
  RESOURCE_OWNER_PASSWORD_GRANT: "password",
  REFRESH_TOKEN_GRANT: "refresh_token",
  DEVICE_CODE_GRANT: "device_code",
  JWT_BEARER: "urn:ietf:params:oauth:grant-type:jwt-bearer",
};
var CacheAccountType = {
  MSSTS_ACCOUNT_TYPE: "MSSTS",
  ADFS_ACCOUNT_TYPE: "ADFS",
  MSAV1_ACCOUNT_TYPE: "MSA",
  GENERIC_ACCOUNT_TYPE: "Generic",
};
var Separators = {
  CACHE_KEY_SEPARATOR: "-",
  CLIENT_INFO_SEPARATOR: ".",
};
var CredentialType = {
  ID_TOKEN: "IdToken",
  ACCESS_TOKEN: "AccessToken",
  ACCESS_TOKEN_WITH_AUTH_SCHEME: "AccessToken_With_AuthScheme",
  REFRESH_TOKEN: "RefreshToken",
};
//@ chunk-mrx6y2r5.js:93571-94635 esm-fingerprint
var APP_METADATA = "appmetadata";
var CLIENT_INFO = "client_info";
var THE_FAMILY_ID = "1";
var AUTHORITY_METADATA_CONSTANTS = {
  CACHE_KEY: "authority-metadata",
  REFRESH_TIME_SECONDS: 86400,
};
var AuthorityMetadataSource = {
  CONFIG: "config",
  CACHE: "cache",
  NETWORK: "network",
  HARDCODED_VALUES: "hardcoded_values",
};
var SERVER_TELEM_CONSTANTS = {
  SCHEMA_VERSION: 5,
  MAX_LAST_HEADER_BYTES: 330,
  MAX_CACHED_ERRORS: 50,
  CACHE_KEY: "server-telemetry",
  CATEGORY_SEPARATOR: "|",
  VALUE_SEPARATOR: ",",
  OVERFLOW_TRUE: "1",
  OVERFLOW_FALSE: "0",
  UNKNOWN_ERROR: "unknown_error",
};
var AuthenticationScheme = {
  BEARER: "Bearer",
  POP: "pop",
  SSH: "ssh-cert",
};
var ThrottlingConstants = {
  DEFAULT_THROTTLE_TIME_SECONDS: 60,
  DEFAULT_MAX_THROTTLE_TIME_SECONDS: 3600,
  THROTTLING_PREFIX: "throttling",
  X_MS_LIB_CAPABILITY_VALUE: "retry-after, h429",
};
var Errors = {
  INVALID_GRANT_ERROR: "invalid_grant",
  CLIENT_MISMATCH_ERROR: "client_mismatch",
};
var PasswordGrantConstants = {
  username: "username",
  password: "password",
};
var RegionDiscoverySources = {
  FAILED_AUTO_DETECTION: "1",
  INTERNAL_CACHE: "2",
  ENVIRONMENT_VARIABLE: "3",
  IMDS: "4",
};
var RegionDiscoveryOutcomes = {
  CONFIGURED_NO_AUTO_DETECTION: "2",
  AUTO_DETECTION_REQUESTED_SUCCESSFUL: "4",
  AUTO_DETECTION_REQUESTED_FAILED: "5",
};
var CacheOutcome = {
  NOT_APPLICABLE: "0",
  FORCE_REFRESH_OR_CLAIMS: "1",
  NO_CACHED_ACCESS_TOKEN: "2",
  CACHED_ACCESS_TOKEN_EXPIRED: "3",
  PROACTIVELY_REFRESHED: "4",
};
//@ chunk-mrx6y2r5.js:94635-94690 esm-layout
var DEFAULT_TOKEN_RENEWAL_OFFSET_SEC = 300;
var EncodingTypes = {
  BASE64: "base64",
  HEX: "hex",
  UTF8: "utf-8",
};
//@ chunk-mrx6y2r5.js:94735-94786 esm-fingerprint
var unexpectedError = "unexpected_error";
var postRequestFailed = "post_request_failed";
//@ chunk-mrx6y2r5.js:94831-95106 esm-fingerprint
var AuthErrorMessages = {
  [unexpectedError]: "Unexpected error in authentication.",
  [postRequestFailed]:
    "Post request failed from the network, could be a 4xx/5xx or a network unavailability. Please check the exact error code for details.",
};
var AuthErrorMessage = {
  unexpectedError: {
    code: unexpectedError,
    desc: AuthErrorMessages[unexpectedError],
  },
  postRequestFailed: {
    code: postRequestFailed,
    desc: AuthErrorMessages[postRequestFailed],
  },
};
//@ chunk-mrx6y2r5.js:95106-95384 esm-fingerprint
class AuthError extends Error {
  constructor(errorCode, errorMessage, suberror) {
    let errorString = errorMessage ? `${errorCode}: ${errorMessage}` : errorCode;
    super(errorString);
    Object.setPrototypeOf(this, AuthError.prototype);
    this.errorCode = errorCode || Constants.EMPTY_STRING;
    this.errorMessage = errorMessage || Constants.EMPTY_STRING;
    this.subError = suberror || Constants.EMPTY_STRING;
    this.name = "AuthError";
  }
  setCorrelationId(correlationId) {
    this.correlationId = correlationId;
  }
}
//@ chunk-mrx6y2r5.js:95384-95441 esm-layout
function wa(code, additionalMessage) {
  return new AuthError(
    code,
    additionalMessage ? `${AuthErrorMessages[code]} ${additionalMessage}` : AuthErrorMessages[code],
  );
}
//@ chunk-mrx6y2r5.js:95486-96737 esm-fingerprint
var clientInfoDecodingError = "client_info_decoding_error";
var clientInfoEmptyError = "client_info_empty_error";
var TOKEN_PARSING_ERROR = "token_parsing_error";
var nullOrEmptyToken = "null_or_empty_token";
var endpointResolutionError = "endpoints_resolution_error";
var networkError = "network_error";
var openIdConfigError = "openid_config_error";
var HASH_NOT_DESERIALIZED = "hash_not_deserialized";
var invalidState = "invalid_state";
var stateMismatch = "state_mismatch";
var stateNotFound = "state_not_found";
var nonceMismatch = "nonce_mismatch";
var authTimeNotFound = "auth_time_not_found";
var maxAgeTranspired = "max_age_transpired";
var multipleMatchingTokens = "multiple_matching_tokens";
var multipleMatchingAccounts = "multiple_matching_accounts";
var MULTIPLE_MATCHING_APPMETADATA = "multiple_matching_appMetadata";
var requestCannotBeMade = "request_cannot_be_made";
var cannotRemoveEmptyScope = "cannot_remove_empty_scope";
var cannotAppendScopeSet = "cannot_append_scopeset";
var emptyInputScopeSet = "empty_input_scopeset";
var deviceCodePollingCancelled = "device_code_polling_cancelled";
var deviceCodeExpired = "device_code_expired";
var deviceCodeUnknownError = "device_code_unknown_error";
var noAccountInSilentRequest = "no_account_in_silent_request";
var invalidCacheRecord = "invalid_cache_record";
var invalidCacheEnvironment = "invalid_cache_environment";
var noAccountFound = "no_account_found";
var noCryptoObject = "no_crypto_object";
var unexpectedCredentialType = "unexpected_credential_type";
var invalidAssertion = "invalid_assertion";
var invalidClientCredential = "invalid_client_credential";
var tokenRefreshRequired = "token_refresh_required";
var userTimeoutReached = "user_timeout_reached";
var TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT = "token_claims_cnf_required_for_signedjwt";
var authorizationCodeMissingFromServerResponse = "authorization_code_missing_from_server_response";
var bindingKeyNotRemoved = "binding_key_not_removed";
var endSessionEndpointNotSupported = "end_session_endpoint_not_supported";
var keyIdMissing = "key_id_missing";
var noNetworkConnectivity = "no_network_connectivity";
var userCanceled = "user_canceled";
var missingTenantIdError = "missing_tenant_id_error";
var methodNotImplemented = "method_not_implemented";
var nestedAppAuthBridgeDisabled = "nested_app_auth_bridge_disabled";
//@ chunk-mrx6y2r5.js:96782-101913 esm-fingerprint
var ClientAuthErrorMessages = {
  [clientInfoDecodingError]: "The client info could not be parsed/decoded correctly",
  [clientInfoEmptyError]: "The client info was empty",
  [TOKEN_PARSING_ERROR]: "Token cannot be parsed",
  [nullOrEmptyToken]: "The token is null or empty",
  [endpointResolutionError]: "Endpoints cannot be resolved",
  [networkError]: "Network request failed",
  [openIdConfigError]:
    "Could not retrieve endpoints. Check your authority and verify the .well-known/openid-configuration endpoint returns the required endpoints.",
  [HASH_NOT_DESERIALIZED]: "The hash parameters could not be deserialized",
  [invalidState]: "State was not the expected format",
  [stateMismatch]: "State mismatch error",
  [stateNotFound]: "State not found",
  [nonceMismatch]: "Nonce mismatch error",
  [authTimeNotFound]:
    "Max Age was requested and the ID token is missing the auth_time variable. auth_time is an optional claim and is not enabled by default - it must be enabled. See https://aka.ms/msaljs/optional-claims for more information.",
  [maxAgeTranspired]:
    "Max Age is set to 0, or too much time has elapsed since the last end-user authentication.",
  [multipleMatchingTokens]:
    "The cache contains multiple tokens satisfying the requirements. Call AcquireToken again providing more requirements such as authority or account.",
  [multipleMatchingAccounts]:
    "The cache contains multiple accounts satisfying the given parameters. Please pass more info to obtain the correct account",
  [MULTIPLE_MATCHING_APPMETADATA]:
    "The cache contains multiple appMetadata satisfying the given parameters. Please pass more info to obtain the correct appMetadata",
  [requestCannotBeMade]: "Token request cannot be made without authorization code or refresh token.",
  [cannotRemoveEmptyScope]: "Cannot remove null or empty scope from ScopeSet",
  [cannotAppendScopeSet]: "Cannot append ScopeSet",
  [emptyInputScopeSet]: "Empty input ScopeSet cannot be processed",
  [deviceCodePollingCancelled]:
    "Caller has cancelled token endpoint polling during device code flow by setting DeviceCodeRequest.cancel = true.",
  [deviceCodeExpired]: "Device code is expired.",
  [deviceCodeUnknownError]: "Device code stopped polling for unknown reasons.",
  [noAccountInSilentRequest]:
    "Please pass an account object, silent flow is not supported without account information",
  [invalidCacheRecord]: "Cache record object was null or undefined.",
  [invalidCacheEnvironment]: "Invalid environment when attempting to create cache entry",
  [noAccountFound]: "No account found in cache for given key.",
  [noCryptoObject]: "No crypto object detected.",
  [unexpectedCredentialType]: "Unexpected credential type.",
  [invalidAssertion]:
    "Client assertion must meet requirements described in https://tools.ietf.org/html/rfc7515",
  [invalidClientCredential]:
    "Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential",
  [tokenRefreshRequired]:
    "Cannot return token from cache because it must be refreshed. This may be due to one of the following reasons: forceRefresh parameter is set to true, claims have been requested, there is no cached access token or it is expired.",
  [userTimeoutReached]: "User defined timeout for device code polling reached",
  [TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT]:
    "Cannot generate a POP jwt if the token_claims are not populated",
  [authorizationCodeMissingFromServerResponse]:
    "Server response does not contain an authorization code to proceed",
  [bindingKeyNotRemoved]: "Could not remove the credential's binding key from storage.",
  [endSessionEndpointNotSupported]: "The provided authority does not support logout",
  [keyIdMissing]:
    "A keyId value is missing from the requested bound token's cache record and is required to match the token to it's stored binding key.",
  [noNetworkConnectivity]: "No network connectivity. Check your internet connection.",
  [userCanceled]: "User cancelled the flow.",
  [missingTenantIdError]:
    "A tenant id - not common, organizations, or consumers - must be specified when using the client_credentials flow.",
  [methodNotImplemented]: "This method has not been implemented",
  [nestedAppAuthBridgeDisabled]: "The nested app auth bridge is disabled",
};
var ClientAuthErrorMessage = {
  clientInfoDecodingError: {
    code: clientInfoDecodingError,
    desc: ClientAuthErrorMessages[clientInfoDecodingError],
  },
  clientInfoEmptyError: {
    code: clientInfoEmptyError,
    desc: ClientAuthErrorMessages[clientInfoEmptyError],
  },
  tokenParsingError: {
    code: TOKEN_PARSING_ERROR,
    desc: ClientAuthErrorMessages[TOKEN_PARSING_ERROR],
  },
  nullOrEmptyToken: {
    code: nullOrEmptyToken,
    desc: ClientAuthErrorMessages[nullOrEmptyToken],
  },
  endpointResolutionError: {
    code: endpointResolutionError,
    desc: ClientAuthErrorMessages[endpointResolutionError],
  },
  networkError: {
    code: networkError,
    desc: ClientAuthErrorMessages[networkError],
  },
  unableToGetOpenidConfigError: {
    code: openIdConfigError,
    desc: ClientAuthErrorMessages[openIdConfigError],
  },
  hashNotDeserialized: {
    code: HASH_NOT_DESERIALIZED,
    desc: ClientAuthErrorMessages[HASH_NOT_DESERIALIZED],
  },
  invalidStateError: {
    code: invalidState,
    desc: ClientAuthErrorMessages[invalidState],
  },
  stateMismatchError: {
    code: stateMismatch,
    desc: ClientAuthErrorMessages[stateMismatch],
  },
  stateNotFoundError: {
    code: stateNotFound,
    desc: ClientAuthErrorMessages[stateNotFound],
  },
  nonceMismatchError: {
    code: nonceMismatch,
    desc: ClientAuthErrorMessages[nonceMismatch],
  },
  authTimeNotFoundError: {
    code: authTimeNotFound,
    desc: ClientAuthErrorMessages[authTimeNotFound],
  },
  maxAgeTranspired: {
    code: maxAgeTranspired,
    desc: ClientAuthErrorMessages[maxAgeTranspired],
  },
  multipleMatchingTokens: {
    code: multipleMatchingTokens,
    desc: ClientAuthErrorMessages[multipleMatchingTokens],
  },
  multipleMatchingAccounts: {
    code: multipleMatchingAccounts,
    desc: ClientAuthErrorMessages[multipleMatchingAccounts],
  },
  multipleMatchingAppMetadata: {
    code: MULTIPLE_MATCHING_APPMETADATA,
    desc: ClientAuthErrorMessages[MULTIPLE_MATCHING_APPMETADATA],
  },
  tokenRequestCannotBeMade: {
    code: requestCannotBeMade,
    desc: ClientAuthErrorMessages[requestCannotBeMade],
  },
  removeEmptyScopeError: {
    code: cannotRemoveEmptyScope,
    desc: ClientAuthErrorMessages[cannotRemoveEmptyScope],
  },
  appendScopeSetError: {
    code: cannotAppendScopeSet,
    desc: ClientAuthErrorMessages[cannotAppendScopeSet],
  },
  emptyInputScopeSetError: {
    code: emptyInputScopeSet,
    desc: ClientAuthErrorMessages[emptyInputScopeSet],
  },
  DeviceCodePollingCancelled: {
    code: deviceCodePollingCancelled,
    desc: ClientAuthErrorMessages[deviceCodePollingCancelled],
  },
  DeviceCodeExpired: {
    code: deviceCodeExpired,
    desc: ClientAuthErrorMessages[deviceCodeExpired],
  },
  DeviceCodeUnknownError: {
    code: deviceCodeUnknownError,
    desc: ClientAuthErrorMessages[deviceCodeUnknownError],
  },
  NoAccountInSilentRequest: {
    code: noAccountInSilentRequest,
    desc: ClientAuthErrorMessages[noAccountInSilentRequest],
  },
  invalidCacheRecord: {
    code: invalidCacheRecord,
    desc: ClientAuthErrorMessages[invalidCacheRecord],
  },
  invalidCacheEnvironment: {
    code: invalidCacheEnvironment,
    desc: ClientAuthErrorMessages[invalidCacheEnvironment],
  },
  noAccountFound: {
    code: noAccountFound,
    desc: ClientAuthErrorMessages[noAccountFound],
  },
  noCryptoObj: {
    code: noCryptoObject,
    desc: ClientAuthErrorMessages[noCryptoObject],
  },
  unexpectedCredentialType: {
    code: unexpectedCredentialType,
    desc: ClientAuthErrorMessages[unexpectedCredentialType],
  },
  invalidAssertion: {
    code: invalidAssertion,
    desc: ClientAuthErrorMessages[invalidAssertion],
  },
  invalidClientCredential: {
    code: invalidClientCredential,
    desc: ClientAuthErrorMessages[invalidClientCredential],
  },
  tokenRefreshRequired: {
    code: tokenRefreshRequired,
    desc: ClientAuthErrorMessages[tokenRefreshRequired],
  },
  userTimeoutReached: {
    code: userTimeoutReached,
    desc: ClientAuthErrorMessages[userTimeoutReached],
  },
  tokenClaimsRequired: {
    code: TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT,
    desc: ClientAuthErrorMessages[TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT],
  },
  noAuthorizationCodeFromServer: {
    code: authorizationCodeMissingFromServerResponse,
    desc: ClientAuthErrorMessages[authorizationCodeMissingFromServerResponse],
  },
  bindingKeyNotRemovedError: {
    code: bindingKeyNotRemoved,
    desc: ClientAuthErrorMessages[bindingKeyNotRemoved],
  },
  logoutNotSupported: {
    code: endSessionEndpointNotSupported,
    desc: ClientAuthErrorMessages[endSessionEndpointNotSupported],
  },
  keyIdMissing: {
    code: keyIdMissing,
    desc: ClientAuthErrorMessages[keyIdMissing],
  },
  noNetworkConnectivity: {
    code: noNetworkConnectivity,
    desc: ClientAuthErrorMessages[noNetworkConnectivity],
  },
  userCanceledError: {
    code: userCanceled,
    desc: ClientAuthErrorMessages[userCanceled],
  },
  missingTenantIdError: {
    code: missingTenantIdError,
    desc: ClientAuthErrorMessages[missingTenantIdError],
  },
  nestedAppAuthBridgeDisabled: {
    code: nestedAppAuthBridgeDisabled,
    desc: ClientAuthErrorMessages[nestedAppAuthBridgeDisabled],
  },
};
//@ chunk-mrx6y2r5.js:101913-102051 esm-fingerprint
class ClientAuthError extends AuthError {
  constructor(errorCode, additionalMessage) {
    super(
      errorCode,
      additionalMessage
        ? `${ClientAuthErrorMessages[errorCode]}: ${additionalMessage}`
        : ClientAuthErrorMessages[errorCode],
    );
    this.name = "ClientAuthError";
    Object.setPrototypeOf(this, ClientAuthError.prototype);
  }
}
//@ chunk-mrx6y2r5.js:102051-102086 esm-layout
function createClientAuthError(errorCode, additionalMessage) {
  return new ClientAuthError(errorCode, additionalMessage);
}
//@ chunk-mrx6y2r5.js:102131-102469 esm-fingerprint
var DEFAULT_CRYPTO_IMPLEMENTATION = {
  createNewGuid: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  base64Decode: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  base64Encode: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  base64UrlEncode: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  encodeKid: () => {
    throw createClientAuthError(methodNotImplemented);
  },
  async getPublicKeyThumbprint() {
    throw createClientAuthError(methodNotImplemented);
  },
  async removeTokenBindingKey() {
    throw createClientAuthError(methodNotImplemented);
  },
  async clearKeystore() {
    throw createClientAuthError(methodNotImplemented);
  },
  async signJwt() {
    throw createClientAuthError(methodNotImplemented);
  },
  async hashString() {
    throw createClientAuthError(methodNotImplemented);
  },
};
//@ chunk-mrx6y2r5.js:104757-104798 esm-fingerprint
var name_2 = "@azure/msal-common";
var version_2 = "15.13.1";
//@ chunk-mrx6y2r5.js:104843-105098 esm-fingerprint
var AzureCloudInstance = {
  None: "none",
  AzurePublic: "https://login.microsoftonline.com",
  AzurePpe: "https://login.windows-ppe.net",
  AzureChina: "https://login.chinacloudapi.cn",
  AzureGermany: "https://login.microsoftonline.de",
  AzureUsGovernment: "https://login.microsoftonline.us",
};
//@ chunk-mrx6y2r5.js:105143-105815 esm-fingerprint
var redirectUriEmpty = "redirect_uri_empty";
var claimsRequestParsingError = "claims_request_parsing_error";
var authorityUriInsecure = "authority_uri_insecure";
var urlParseError = "url_parse_error";
var urlEmptyError = "empty_url_error";
var emptyInputScopesError = "empty_input_scopes_error";
var invalidClaims = "invalid_claims";
var tokenRequestEmpty = "token_request_empty";
var logoutRequestEmpty = "logout_request_empty";
var invalidCodeChallengeMethod = "invalid_code_challenge_method";
var pkceParamsMissing = "pkce_params_missing";
var invalidCloudDiscoveryMetadata = "invalid_cloud_discovery_metadata";
var invalidAuthorityMetadata = "invalid_authority_metadata";
var untrustedAuthority = "untrusted_authority";
var missingSshJwk = "missing_ssh_jwk";
var missingSshKid = "missing_ssh_kid";
var missingNonceAuthenticationHeader = "missing_nonce_authentication_header";
var invalidAuthenticationHeader = "invalid_authentication_header";
var cannotSetOIDCOptions = "cannot_set_OIDCOptions";
var cannotAllowPlatformBroker = "cannot_allow_platform_broker";
var authorityMismatch = "authority_mismatch";
var invalidRequestMethodForEAR = "invalid_request_method_for_EAR";
var invalidAuthorizePostBodyParameters = "invalid_authorize_post_body_parameters";
//@ chunk-mrx6y2r5.js:105860-109541 esm-fingerprint
var ClientConfigurationErrorMessages = {
  [redirectUriEmpty]: "A redirect URI is required for all calls, and none has been set.",
  [claimsRequestParsingError]: "Could not parse the given claims request object.",
  [authorityUriInsecure]:
    "Authority URIs must use https.  Please see here for valid authority configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options",
  [urlParseError]: "URL could not be parsed into appropriate segments.",
  [urlEmptyError]: "URL was empty or null.",
  [emptyInputScopesError]:
    "Scopes cannot be passed as null, undefined or empty array because they are required to obtain an access token.",
  [invalidClaims]: "Given claims parameter must be a stringified JSON object.",
  [tokenRequestEmpty]: "Token request was empty and not found in cache.",
  [logoutRequestEmpty]: "The logout request was null or undefined.",
  [invalidCodeChallengeMethod]:
    'code_challenge_method passed is invalid. Valid values are "plain" and "S256".',
  [pkceParamsMissing]:
    "Both params: code_challenge and code_challenge_method are to be passed if to be sent in the request",
  [invalidCloudDiscoveryMetadata]:
    "Invalid cloudDiscoveryMetadata provided. Must be a stringified JSON object containing tenant_discovery_endpoint and metadata fields",
  [invalidAuthorityMetadata]:
    "Invalid authorityMetadata provided. Must by a stringified JSON object containing authorization_endpoint, token_endpoint, issuer fields.",
  [untrustedAuthority]:
    "The provided authority is not a trusted authority. Please include this authority in the knownAuthorities config parameter.",
  [missingSshJwk]:
    "Missing sshJwk in SSH certificate request. A stringified JSON Web Key is required when using the SSH authentication scheme.",
  [missingSshKid]:
    "Missing sshKid in SSH certificate request. A string that uniquely identifies the public SSH key is required when using the SSH authentication scheme.",
  [missingNonceAuthenticationHeader]:
    "Unable to find an authentication header containing server nonce. Either the Authentication-Info or WWW-Authenticate headers must be present in order to obtain a server nonce.",
  [invalidAuthenticationHeader]: "Invalid authentication header provided",
  [cannotSetOIDCOptions]:
    "Cannot set OIDCOptions parameter. Please change the protocol mode to OIDC or use a non-Microsoft authority.",
  [cannotAllowPlatformBroker]:
    "Cannot set allowPlatformBroker parameter to true when not in AAD protocol mode.",
  [authorityMismatch]:
    "Authority mismatch error. Authority provided in login request or PublicClientApplication config does not match the environment of the provided account. Please use a matching account or make an interactive request to login to this authority.",
  [invalidAuthorizePostBodyParameters]:
    "Invalid authorize post body parameters provided. If you are using authorizePostBodyParameters, the request method must be POST. Please check the request method and parameters.",
  [invalidRequestMethodForEAR]:
    "Invalid request method for EAR protocol mode. The request method cannot be GET when using EAR protocol mode. Please change the request method to POST.",
};
var ClientConfigurationErrorMessage = {
  redirectUriNotSet: {
    code: redirectUriEmpty,
    desc: ClientConfigurationErrorMessages[redirectUriEmpty],
  },
  claimsRequestParsingError: {
    code: claimsRequestParsingError,
    desc: ClientConfigurationErrorMessages[claimsRequestParsingError],
  },
  authorityUriInsecure: {
    code: authorityUriInsecure,
    desc: ClientConfigurationErrorMessages[authorityUriInsecure],
  },
  urlParseError: {
    code: urlParseError,
    desc: ClientConfigurationErrorMessages[urlParseError],
  },
  urlEmptyError: {
    code: urlEmptyError,
    desc: ClientConfigurationErrorMessages[urlEmptyError],
  },
  emptyScopesError: {
    code: emptyInputScopesError,
    desc: ClientConfigurationErrorMessages[emptyInputScopesError],
  },
  invalidClaimsRequest: {
    code: invalidClaims,
    desc: ClientConfigurationErrorMessages[invalidClaims],
  },
  tokenRequestEmptyError: {
    code: tokenRequestEmpty,
    desc: ClientConfigurationErrorMessages[tokenRequestEmpty],
  },
  logoutRequestEmptyError: {
    code: logoutRequestEmpty,
    desc: ClientConfigurationErrorMessages[logoutRequestEmpty],
  },
  invalidCodeChallengeMethod: {
    code: invalidCodeChallengeMethod,
    desc: ClientConfigurationErrorMessages[invalidCodeChallengeMethod],
  },
  invalidCodeChallengeParams: {
    code: pkceParamsMissing,
    desc: ClientConfigurationErrorMessages[pkceParamsMissing],
  },
  invalidCloudDiscoveryMetadata: {
    code: invalidCloudDiscoveryMetadata,
    desc: ClientConfigurationErrorMessages[invalidCloudDiscoveryMetadata],
  },
  invalidAuthorityMetadata: {
    code: invalidAuthorityMetadata,
    desc: ClientConfigurationErrorMessages[invalidAuthorityMetadata],
  },
  untrustedAuthority: {
    code: untrustedAuthority,
    desc: ClientConfigurationErrorMessages[untrustedAuthority],
  },
  missingSshJwk: {
    code: missingSshJwk,
    desc: ClientConfigurationErrorMessages[missingSshJwk],
  },
  missingSshKid: {
    code: missingSshKid,
    desc: ClientConfigurationErrorMessages[missingSshKid],
  },
  missingNonceAuthenticationHeader: {
    code: missingNonceAuthenticationHeader,
    desc: ClientConfigurationErrorMessages[missingNonceAuthenticationHeader],
  },
  invalidAuthenticationHeader: {
    code: invalidAuthenticationHeader,
    desc: ClientConfigurationErrorMessages[invalidAuthenticationHeader],
  },
  cannotSetOIDCOptions: {
    code: cannotSetOIDCOptions,
    desc: ClientConfigurationErrorMessages[cannotSetOIDCOptions],
  },
  cannotAllowPlatformBroker: {
    code: cannotAllowPlatformBroker,
    desc: ClientConfigurationErrorMessages[cannotAllowPlatformBroker],
  },
  authorityMismatch: {
    code: authorityMismatch,
    desc: ClientConfigurationErrorMessages[authorityMismatch],
  },
  invalidAuthorizePostBodyParameters: {
    code: invalidAuthorizePostBodyParameters,
    desc: ClientConfigurationErrorMessages[invalidAuthorizePostBodyParameters],
  },
  invalidRequestMethodForEAR: {
    code: invalidRequestMethodForEAR,
    desc: ClientConfigurationErrorMessages[invalidRequestMethodForEAR],
  },
};
//@ chunk-mrx6y2r5.js:109541-109669 esm-fingerprint
class ClientConfigurationError extends AuthError {
  constructor(errorCode) {
    super(errorCode, ClientConfigurationErrorMessages[errorCode]);
    this.name = "ClientConfigurationError";
    Object.setPrototypeOf(this, ClientConfigurationError.prototype);
  }
}
//@ chunk-mrx6y2r5.js:109669-109700 esm-layout
function createClientConfigurationError(errorCode) {
  return new ClientConfigurationError(errorCode);
}
//@ chunk-mrx6y2r5.js:109745-110494 esm-fingerprint
class StringUtils {
  static isEmptyObj(strObj) {
    if (strObj)
      try {
        let parsed = JSON.parse(strObj);
        return Object.keys(parsed).length === 0;
      } catch (error) {}
    return true;
  }
  static startsWith(str, search) {
    return str.indexOf(search) === 0;
  }
  static endsWith(str, search) {
    return str.length >= search.length && str.lastIndexOf(search) === str.length - search.length;
  }
  static queryStringToObject(query) {
    let obj = {};
    let params = query.split("&");
    let decode = (s) => decodeURIComponent(s.replace(/\+/g, " "));
    params.forEach((pair) => {
      if (pair.trim()) {
        let [key, value] = pair.split(/=(.+)/g, 2);
        if (key && value) obj[decode(key)] = decode(value);
      }
    });
    return obj;
  }
  static trimArrayEntries(arr) {
    return arr.map((entry) => entry.trim());
  }
  static removeEmptyStringsFromArray(arr) {
    return arr.filter((entry) => !!entry);
  }
  static jsonParseHelper(str) {
    try {
      return JSON.parse(str);
    } catch (e) {
      return null;
    }
  }
  static matchPattern(pattern, input) {
    return new RegExp(pattern.replace(/\\/g, "\\\\").replace(/\*/g, "[^ ]*").replace(/\?/g, "\\?")).test(
      input,
    );
  }
}
//@ chunk-mrx6y2r5.js:110539-112178 esm-fingerprint
class ScopeSet {
  constructor(e) {
    let t = e ? StringUtils.trimArrayEntries([...e]) : [];
    let filteredInput = t ? StringUtils.removeEmptyStringsFromArray(t) : [];
    if (!filteredInput || !filteredInput.length) throw createClientConfigurationError(emptyInputScopesError);
    this.scopes = new Set();
    filteredInput.forEach((scope) => this.scopes.add(scope));
  }
  static fromString(inputScopeString) {
    let parts = (inputScopeString || Constants.EMPTY_STRING).split(" ");
    return new ScopeSet(parts);
  }
  static createSearchScopes(inputScopeString) {
    let scopesToUse =
      inputScopeString && inputScopeString.length > 0 ? inputScopeString : [...OIDC_DEFAULT_SCOPES];
    let scopeSet = new ScopeSet(scopesToUse);
    if (!scopeSet.containsOnlyOIDCScopes()) scopeSet.removeOIDCScopes();
    else scopeSet.removeScope(Constants.OFFLINE_ACCESS_SCOPE);
    return scopeSet;
  }
  containsScope(scope) {
    let lowerCaseScopes = this.printScopesLowerCase().split(" ");
    let lowerCaseScopesSet = new ScopeSet(lowerCaseScopes);
    return scope ? lowerCaseScopesSet.scopes.has(scope.toLowerCase()) : false;
  }
  containsScopeSet(scopeSet) {
    if (!scopeSet || scopeSet.scopes.size <= 0) return false;
    return (
      this.scopes.size >= scopeSet.scopes.size &&
      scopeSet.asArray().every((scope) => this.containsScope(scope))
    );
  }
  containsOnlyOIDCScopes() {
    let defaultScopeCount = 0;
    OIDC_SCOPES.forEach((defaultScope) => {
      if (this.containsScope(defaultScope)) defaultScopeCount += 1;
    });
    return this.scopes.size === defaultScopeCount;
  }
  appendScope(newScope) {
    if (newScope) this.scopes.add(newScope.trim());
  }
  appendScopes(newScopes) {
    try {
      newScopes.forEach((newScope) => this.appendScope(newScope));
    } catch (e) {
      throw createClientAuthError(cannotAppendScopeSet);
    }
  }
  removeScope(scope) {
    if (!scope) throw createClientAuthError(cannotRemoveEmptyScope);
    this.scopes.delete(scope.trim());
  }
  removeOIDCScopes() {
    OIDC_SCOPES.forEach((defaultScope) => {
      this.scopes.delete(defaultScope);
    });
  }
  unionScopeSets(otherScopes) {
    if (!otherScopes) throw createClientAuthError(emptyInputScopeSet);
    let unionScopes = new Set();
    otherScopes.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
    this.scopes.forEach((scope) => unionScopes.add(scope.toLowerCase()));
    return unionScopes;
  }
  intersectingScopeSets(otherScopes) {
    if (!otherScopes) throw createClientAuthError(emptyInputScopeSet);
    if (!otherScopes.containsOnlyOIDCScopes()) otherScopes.removeOIDCScopes();
    let t = this.unionScopeSets(otherScopes);
    let sizeOtherScopes = otherScopes.getScopeCount();
    let sizeThisScopes = this.getScopeCount();
    return t.size < sizeThisScopes + sizeOtherScopes;
  }
  getScopeCount() {
    return this.scopes.size;
  }
  asArray() {
    let array = [];
    this.scopes.forEach((val) => array.push(val));
    return array;
  }
  printScopes() {
    if (this.scopes) return this.asArray().join(" ");
    return Constants.EMPTY_STRING;
  }
  printScopesLowerCase() {
    return this.printScopes().toLowerCase();
  }
}
//@ chunk-mrx6y2r5.js:112223-112316 esm-layout
function buildClientInfo(clientInfo, t) {
  if (!clientInfo) throw createClientAuthError(clientInfoEmptyError);
  try {
    let r = t(clientInfo);
    return JSON.parse(r);
  } catch (error) {
    throw createClientAuthError(clientInfoDecodingError);
  }
}
//@ chunk-mrx6y2r5.js:112316-112444 esm-fingerprint
function buildClientInfoFromHomeAccountId(e) {
  if (!e) throw createClientAuthError(clientInfoDecodingError);
  let clientInfoParts = e.split(Separators.CLIENT_INFO_SEPARATOR, 2);
  return {
    uid: clientInfoParts[0],
    utid: clientInfoParts.length < 2 ? Constants.EMPTY_STRING : clientInfoParts[1],
  };
}
//@ chunk-mrx6y2r5.js:112489-112542 esm-layout
function tenantIdMatchesHomeTenant(tenantId, homeAccountId) {
  return !!tenantId && !!homeAccountId && tenantId === homeAccountId.split(".")[1];
}
//@ chunk-mrx6y2r5.js:112542-112842 esm-fingerprint
function buildTenantProfile(homeAccountId, localAccountId, tenantId, idTokenClaims) {
  if (idTokenClaims) {
    let { oid, sub, tid, name, tfp, acr, preferred_username, upn, login_hint } = idTokenClaims;
    let tenantId = tid || tfp || acr || "";
    return {
      tenantId,
      localAccountId: oid || sub || "",
      name,
      username: preferred_username || upn || "",
      loginHint: login_hint,
      isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
    };
  } else
    return {
      tenantId,
      localAccountId,
      username: "",
      isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
    };
}
//@ chunk-mrx6y2r5.js:112842-113057 esm-fingerprint
function updateAccountTenantProfileData(baseAccountInfo, t, idTokenClaims, idToken) {
  let o = baseAccountInfo;
  if (t) {
    let { isHomeTenant, ...tenantProfileOverride } = t;
    o = {
      ...baseAccountInfo,
      ...tenantProfileOverride,
    };
  }
  if (idTokenClaims) {
    let { isHomeTenant, ...s } = buildTenantProfile(
      baseAccountInfo.homeAccountId,
      baseAccountInfo.localAccountId,
      baseAccountInfo.tenantId,
      idTokenClaims,
    );
    o = {
      ...o,
      ...s,
      idTokenClaims,
      idToken,
    };
    return o;
  }
  return o;
}
//@ chunk-mrx6y2r5.js:113102-113142 esm-fingerprint
var AuthorityType = {
  Default: 0,
  Adfs: 1,
  Dsts: 2,
  Ciam: 3,
};
//@ chunk-mrx6y2r5.js:113187-113252 esm-fingerprint
function getTenantIdFromIdTokenClaims(idTokenClaims) {
  if (idTokenClaims) return idTokenClaims.tid || idTokenClaims.tfp || idTokenClaims.acr || null;
  return null;
}
//@ chunk-mrx6y2r5.js:113297-113338 esm-fingerprint
var ProtocolMode = {
  AAD: "AAD",
  OIDC: "OIDC",
  EAR: "EAR",
};
//@ chunk-mrx6y2r5.js:113383-116143 esm-fingerprint
class AccountEntity {
  static getAccountInfo(accountEntity) {
    return {
      homeAccountId: accountEntity.homeAccountId,
      environment: accountEntity.environment,
      tenantId: accountEntity.realm,
      username: accountEntity.username,
      localAccountId: accountEntity.localAccountId,
      loginHint: accountEntity.loginHint,
      name: accountEntity.name,
      nativeAccountId: accountEntity.nativeAccountId,
      authorityType: accountEntity.authorityType,
      tenantProfiles: new Map(
        (accountEntity.tenantProfiles || []).map((tenantProfile) => [tenantProfile.tenantId, tenantProfile]),
      ),
      dataBoundary: accountEntity.dataBoundary,
    };
  }
  isSingleTenant() {
    return !this.tenantProfiles;
  }
  static createAccount(accountDetails, authority, base64Decode) {
    let account = new AccountEntity();
    if (authority.authorityType === AuthorityType.Adfs)
      account.authorityType = CacheAccountType.ADFS_ACCOUNT_TYPE;
    else if (authority.protocolMode === ProtocolMode.OIDC)
      account.authorityType = CacheAccountType.GENERIC_ACCOUNT_TYPE;
    else account.authorityType = CacheAccountType.MSSTS_ACCOUNT_TYPE;
    let clientInfo;
    if (accountDetails.clientInfo && base64Decode) {
      clientInfo = buildClientInfo(accountDetails.clientInfo, base64Decode);
      if (clientInfo.xms_tdbr) account.dataBoundary = clientInfo.xms_tdbr === "EU" ? "EU" : "None";
    }
    account.clientInfo = accountDetails.clientInfo;
    account.homeAccountId = accountDetails.homeAccountId;
    account.nativeAccountId = accountDetails.nativeAccountId;
    let env = accountDetails.environment || (authority && authority.getPreferredCache());
    if (!env) throw createClientAuthError(invalidCacheEnvironment);
    account.environment = env;
    account.realm = clientInfo?.utid || getTenantIdFromIdTokenClaims(accountDetails.idTokenClaims) || "";
    account.localAccountId =
      clientInfo?.uid || accountDetails.idTokenClaims?.oid || accountDetails.idTokenClaims?.sub || "";
    let preferredUsername =
      accountDetails.idTokenClaims?.preferred_username || accountDetails.idTokenClaims?.upn;
    let email = accountDetails.idTokenClaims?.emails ? accountDetails.idTokenClaims.emails[0] : null;
    account.username = preferredUsername || email || "";
    account.loginHint = accountDetails.idTokenClaims?.login_hint;
    account.name = accountDetails.idTokenClaims?.name || "";
    account.cloudGraphHostName = accountDetails.cloudGraphHostName;
    account.msGraphHost = accountDetails.msGraphHost;
    if (accountDetails.tenantProfiles) account.tenantProfiles = accountDetails.tenantProfiles;
    else {
      let tenantProfile = buildTenantProfile(
        accountDetails.homeAccountId,
        account.localAccountId,
        account.realm,
        accountDetails.idTokenClaims,
      );
      account.tenantProfiles = [tenantProfile];
    }
    return account;
  }
  static createFromAccountInfo(accountInfo, cloudGraphHostName, msGraphHost) {
    let account = new AccountEntity();
    account.authorityType = accountInfo.authorityType || CacheAccountType.GENERIC_ACCOUNT_TYPE;
    account.homeAccountId = accountInfo.homeAccountId;
    account.localAccountId = accountInfo.localAccountId;
    account.nativeAccountId = accountInfo.nativeAccountId;
    account.realm = accountInfo.tenantId;
    account.environment = accountInfo.environment;
    account.username = accountInfo.username;
    account.name = accountInfo.name;
    account.loginHint = accountInfo.loginHint;
    account.cloudGraphHostName = cloudGraphHostName;
    account.msGraphHost = msGraphHost;
    account.tenantProfiles = Array.from(accountInfo.tenantProfiles?.values() || []);
    account.dataBoundary = accountInfo.dataBoundary;
    return account;
  }
  static generateHomeAccountId(serverClientInfo, authType, logger, cryptoObj, idTokenClaims) {
    if (!(authType === AuthorityType.Adfs || authType === AuthorityType.Dsts)) {
      if (serverClientInfo)
        try {
          let clientInfo = buildClientInfo(serverClientInfo, cryptoObj.base64Decode);
          if (clientInfo.uid && clientInfo.utid) return `${clientInfo.uid}.${clientInfo.utid}`;
        } catch (e) {}
      logger.warning("No client info in response");
    }
    return idTokenClaims?.sub || "";
  }
  static isAccountEntity(entity) {
    if (!entity) return false;
    return (
      entity.hasOwnProperty("homeAccountId") &&
      entity.hasOwnProperty("environment") &&
      entity.hasOwnProperty("realm") &&
      entity.hasOwnProperty("localAccountId") &&
      entity.hasOwnProperty("username") &&
      entity.hasOwnProperty("authorityType")
    );
  }
  static accountInfoIsEqual(accountA, accountB, compareClaims) {
    if (!accountA || !accountB) return false;
    let claimsMatch = true;
    if (compareClaims) {
      let accountAClaims = accountA.idTokenClaims || {};
      let accountBClaims = accountB.idTokenClaims || {};
      claimsMatch =
        accountAClaims.iat === accountBClaims.iat && accountAClaims.nonce === accountBClaims.nonce;
    }
    return (
      accountA.homeAccountId === accountB.homeAccountId &&
      accountA.localAccountId === accountB.localAccountId &&
      accountA.username === accountB.username &&
      accountA.tenantId === accountB.tenantId &&
      accountA.loginHint === accountB.loginHint &&
      accountA.environment === accountB.environment &&
      accountA.nativeAccountId === accountB.nativeAccountId &&
      claimsMatch
    );
  }
}
//@ chunk-mrx6y2r5.js:116188-116275 esm-layout
function extractTokenClaims(secret, t) {
  let r = mg(secret);
  try {
    let base64Decoded = t(r);
    return JSON.parse(base64Decoded);
  } catch (error) {
    throw createClientAuthError(TOKEN_PARSING_ERROR);
  }
}
//@ chunk-mrx6y2r5.js:116275-116412 esm-fingerprint
function isKmsi(e) {
  if (!e.signin_state) return false;
  let kmsiClaims = ["kmsi", "dvc_dmjd"];
  return e.signin_state.some((value) => kmsiClaims.includes(value.trim().toLowerCase()));
}
//@ chunk-mrx6y2r5.js:116412-116540 esm-fingerprint
function mg(e) {
  if (!e) throw createClientAuthError(nullOrEmptyToken);
  let match = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/.exec(e);
  if (!match || match.length < 4) throw createClientAuthError(TOKEN_PARSING_ERROR);
  return match[2];
}
//@ chunk-mrx6y2r5.js:116540-116601 esm-fingerprint
function checkMaxAge(authTime, maxAge) {
  if (maxAge === 0 || Date.now() - 300000 > authTime + maxAge) throw createClientAuthError(maxAgeTranspired);
}
//@ chunk-mrx6y2r5.js:116646-116781 esm-fingerprint
function stripLeadingHashOrQuery(responseString) {
  if (responseString.startsWith("#/")) return responseString.substring(2);
  else if (responseString.startsWith("#") || responseString.startsWith("?"))
    return responseString.substring(1);
  return responseString;
}
//@ chunk-mrx6y2r5.js:116781-116995 esm-fingerprint
function getDeserializedResponse(responseString) {
  if (!responseString || responseString.indexOf("=") < 0) return null;
  try {
    let normalizedResponse = stripLeadingHashOrQuery(responseString);
    let deserializedHash = Object.fromEntries(new URLSearchParams(normalizedResponse));
    if (
      deserializedHash.code ||
      deserializedHash.ear_jwe ||
      deserializedHash.error ||
      deserializedHash.error_description ||
      deserializedHash.state
    )
      return deserializedHash;
  } catch (error) {
    throw createClientAuthError(HASH_NOT_DESERIALIZED);
  }
  return null;
}
//@ chunk-mrx6y2r5.js:116995-117147 esm-fingerprint
function mapToQueryString(parameters, encodeExtraParams = true, extraQueryParameters) {
  let queryParameterArray = [];
  parameters.forEach((value, key) => {
    if (!encodeExtraParams && extraQueryParameters && key in extraQueryParameters)
      queryParameterArray.push(`${key}=${value}`);
    else queryParameterArray.push(`${key}=${encodeURIComponent(value)}`);
  });
  return queryParameterArray.join("&");
}
//@ chunk-mrx6y2r5.js:117192-118913 esm-fingerprint
class UrlString {
  get urlString() {
    return this._urlString;
  }
  constructor(url) {
    this._urlString = url;
    if (!this._urlString) throw createClientConfigurationError(urlEmptyError);
    if (!url.includes("#")) this._urlString = UrlString.canonicalizeUri(url);
  }
  static canonicalizeUri(url) {
    if (url) {
      let lowerCaseUrl = url.toLowerCase();
      if (StringUtils.endsWith(lowerCaseUrl, "?")) lowerCaseUrl = lowerCaseUrl.slice(0, -1);
      else if (StringUtils.endsWith(lowerCaseUrl, "?/")) lowerCaseUrl = lowerCaseUrl.slice(0, -2);
      if (!StringUtils.endsWith(lowerCaseUrl, "/")) lowerCaseUrl += "/";
      return lowerCaseUrl;
    }
    return url;
  }
  validateAsUri() {
    let components;
    try {
      components = this.getUrlComponents();
    } catch (e) {
      throw createClientConfigurationError(urlParseError);
    }
    if (!components.HostNameAndPort || !components.PathSegments)
      throw createClientConfigurationError(urlParseError);
    if (!components.Protocol || components.Protocol.toLowerCase() !== "https:")
      throw createClientConfigurationError(authorityUriInsecure);
  }
  static appendQueryString(url, queryString) {
    if (!queryString) return url;
    return url.indexOf("?") < 0 ? `${url}?${queryString}` : `${url}&${queryString}`;
  }
  static removeHashFromUrl(url) {
    return UrlString.canonicalizeUri(url.split("#")[0]);
  }
  replaceTenantPath(tenantId) {
    let urlObject = this.getUrlComponents();
    let pathArray = urlObject.PathSegments;
    if (
      tenantId &&
      pathArray.length !== 0 &&
      (pathArray[0] === AADAuthorityConstants.COMMON || pathArray[0] === AADAuthorityConstants.ORGANIZATIONS)
    )
      pathArray[0] = tenantId;
    return UrlString.constructAuthorityUriFromObject(urlObject);
  }
  getUrlComponents() {
    let regEx = RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?");
    let match = this.urlString.match(regEx);
    if (!match) throw createClientConfigurationError(urlParseError);
    let urlComponents = {
      Protocol: match[1],
      HostNameAndPort: match[4],
      AbsolutePath: match[5],
      QueryString: match[7],
    };
    let pathSegments = urlComponents.AbsolutePath.split("/");
    pathSegments = pathSegments.filter((val) => val && val.length > 0);
    urlComponents.PathSegments = pathSegments;
    if (urlComponents.QueryString && urlComponents.QueryString.endsWith("/"))
      urlComponents.QueryString = urlComponents.QueryString.substring(
        0,
        urlComponents.QueryString.length - 1,
      );
    return urlComponents;
  }
  static getDomainFromUrl(url) {
    let regEx = RegExp("^([^:/?#]+://)?([^/?#]*)");
    let match = url.match(regEx);
    if (!match) throw createClientConfigurationError(urlParseError);
    return match[2];
  }
  static getAbsoluteUrl(relativeUrl, t) {
    if (relativeUrl[0] === Constants.FORWARD_SLASH) {
      let baseComponents = new UrlString(t).getUrlComponents();
      return baseComponents.Protocol + "//" + baseComponents.HostNameAndPort + relativeUrl;
    }
    return relativeUrl;
  }
  static constructAuthorityUriFromObject(urlObject) {
    return new UrlString(
      urlObject.Protocol + "//" + urlObject.HostNameAndPort + "/" + urlObject.PathSegments.join("/"),
    );
  }
  static hashContainsKnownProperties(response) {
    return !!getDeserializedResponse(response);
  }
}
//@ chunk-mrx6y2r5.js:118958-121125 esm-fingerprint
var rawMetdataJSON = {
  endpointMetadata: {
    "login.microsoftonline.com": {
      token_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.microsoftonline.com/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.microsoftonline.com/{tenantid}/v2.0",
      authorization_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.microsoftonline.com/{tenantid}/oauth2/v2.0/logout",
    },
    "login.chinacloudapi.cn": {
      token_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.chinacloudapi.cn/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.partner.microsoftonline.cn/{tenantid}/v2.0",
      authorization_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.chinacloudapi.cn/{tenantid}/oauth2/v2.0/logout",
    },
    "login.microsoftonline.us": {
      token_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/token",
      jwks_uri: "https://login.microsoftonline.us/{tenantid}/discovery/v2.0/keys",
      issuer: "https://login.microsoftonline.us/{tenantid}/v2.0",
      authorization_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/authorize",
      end_session_endpoint: "https://login.microsoftonline.us/{tenantid}/oauth2/v2.0/logout",
    },
  },
  instanceDiscoveryMetadata: {
    metadata: [
      {
        preferred_network: "login.microsoftonline.com",
        preferred_cache: "login.windows.net",
        aliases: ["login.microsoftonline.com", "login.windows.net", "login.microsoft.com", "sts.windows.net"],
      },
      {
        preferred_network: "login.partner.microsoftonline.cn",
        preferred_cache: "login.partner.microsoftonline.cn",
        aliases: ["login.partner.microsoftonline.cn", "login.chinacloudapi.cn"],
      },
      {
        preferred_network: "login.microsoftonline.de",
        preferred_cache: "login.microsoftonline.de",
        aliases: ["login.microsoftonline.de"],
      },
      {
        preferred_network: "login.microsoftonline.us",
        preferred_cache: "login.microsoftonline.us",
        aliases: ["login.microsoftonline.us", "login.usgovcloudapi.net"],
      },
      {
        preferred_network: "login-us.microsoftonline.com",
        preferred_cache: "login-us.microsoftonline.com",
        aliases: ["login-us.microsoftonline.com"],
      },
    ],
  },
};
var { endpointMetadata: EndpointMetadata, instanceDiscoveryMetadata: InstanceDiscoveryMetadata } =
  rawMetdataJSON;
var InstanceDiscoveryMetadataAliases = new Set();
//@ chunk-mrx6y2r5.js:121125-121189 esm-fingerprint
InstanceDiscoveryMetadata.metadata.forEach((metadataEntry) => {
  metadataEntry.aliases.forEach((alias) => {
    InstanceDiscoveryMetadataAliases.add(alias);
  });
});
//@ chunk-mrx6y2r5.js:121189-121420 esm-fingerprint
function getAliasesFromStaticSources(staticAuthorityOptions, logger) {
  let staticAliases;
  let canonicalAuthority = staticAuthorityOptions.canonicalAuthority;
  if (canonicalAuthority) {
    let authorityHost = new UrlString(canonicalAuthority).getUrlComponents().HostNameAndPort;
    staticAliases =
      getAliasesFromMetadata(
        authorityHost,
        staticAuthorityOptions.cloudDiscoveryMetadata?.metadata,
        AuthorityMetadataSource.CONFIG,
        logger,
      ) ||
      getAliasesFromMetadata(
        authorityHost,
        InstanceDiscoveryMetadata.metadata,
        AuthorityMetadataSource.HARDCODED_VALUES,
        logger,
      ) ||
      staticAuthorityOptions.knownAuthorities;
  }
  return staticAliases || [];
}
//@ chunk-mrx6y2r5.js:121420-121739 esm-fingerprint
function getAliasesFromMetadata(authorityHost, cloudDiscoveryMetadata, source, logger) {
  logger?.trace(`getAliasesFromMetadata called with source: ${source}`);
  if (authorityHost && cloudDiscoveryMetadata) {
    let metadata = getCloudDiscoveryMetadataFromNetworkResponse(cloudDiscoveryMetadata, authorityHost);
    if (metadata) {
      logger?.trace(`getAliasesFromMetadata: found cloud discovery metadata in ${source}, returning aliases`);
      return metadata.aliases;
    } else logger?.trace(`getAliasesFromMetadata: did not find cloud discovery metadata in ${source}`);
  }
  return null;
}
//@ chunk-mrx6y2r5.js:121739-121779 esm-fingerprint
function getCloudDiscoveryMetadataFromHardcodedValues(authorityHost) {
  return getCloudDiscoveryMetadataFromNetworkResponse(InstanceDiscoveryMetadata.metadata, authorityHost);
}
//@ chunk-mrx6y2r5.js:121779-121881 esm-fingerprint
function getCloudDiscoveryMetadataFromNetworkResponse(response, authorityHost) {
  for (let i = 0; i < response.length; i++) {
    let metadata = response[i];
    if (metadata.aliases.includes(authorityHost)) return metadata;
  }
  return null;
}
//@ chunk-mrx6y2r5.js:121926-121981 esm-fingerprint
var CACHE_QUOTA_EXCEEDED = "cache_quota_exceeded";
var CACHE_ERROR_UNKNOWN = "cache_error_unknown";
//@ chunk-mrx6y2r5.js:122026-122134 esm-fingerprint
var xa = {
  [CACHE_QUOTA_EXCEEDED]: "Exceeded cache storage capacity.",
  [CACHE_ERROR_UNKNOWN]: "Unexpected error occurred when using cache storage.",
};
//@ chunk-mrx6y2r5.js:122134-122322 esm-fingerprint
class CacheError extends AuthError {
  constructor(errorCode, message) {
    let message_2 = message || (xa[errorCode] ? xa[errorCode] : xa[CACHE_ERROR_UNKNOWN]);
    super(`${errorCode}: ${message_2}`);
    Object.setPrototypeOf(this, CacheError.prototype);
    this.name = "CacheError";
    this.errorCode = errorCode;
    this.errorMessage = message_2;
  }
}
//@ chunk-mrx6y2r5.js:122322-122549 esm-fingerprint
function Qd(e) {
  if (!(e instanceof Error)) return new CacheError(CACHE_ERROR_UNKNOWN);
  if (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.message.includes("exceeded the quota")
  )
    return new CacheError(CACHE_QUOTA_EXCEEDED);
  else return new CacheError(e.name, e.message);
}
//@ chunk-mrx6y2r5.js:122594-135844 esm-fingerprint
class CacheManager {
  constructor(clientId, cryptoImpl, logger, performanceClient, staticAuthorityOptions) {
    this.clientId = clientId;
    this.cryptoImpl = cryptoImpl;
    this.commonLogger = logger.clone(name_2, version_2);
    this.staticAuthorityOptions = staticAuthorityOptions;
    this.performanceClient = performanceClient;
  }
  getAllAccounts(accountFilter, correlationId) {
    return this.buildTenantProfiles(
      this.getAccountsFilteredBy(accountFilter, correlationId),
      correlationId,
      accountFilter,
    );
  }
  getAccountInfoFilteredBy(accountFilter, correlationId) {
    if (Object.keys(accountFilter).length === 0 || Object.values(accountFilter).every((value) => !value)) {
      this.commonLogger.warning(
        "getAccountInfoFilteredBy: Account filter is empty or invalid, returning null",
      );
      return null;
    }
    let allAccounts = this.getAllAccounts(accountFilter, correlationId);
    if (allAccounts.length > 1) return allAccounts.sort((account) => (account.idTokenClaims ? -1 : 1))[0];
    else if (allAccounts.length === 1) return allAccounts[0];
    else return null;
  }
  getBaseAccountInfo(accountFilter, correlationId) {
    let accountEntities = this.getAccountsFilteredBy(accountFilter, correlationId);
    if (accountEntities.length > 0) return AccountEntity.getAccountInfo(accountEntities[0]);
    else return null;
  }
  buildTenantProfiles(cachedAccounts, correlationId, accountFilter) {
    return cachedAccounts.flatMap((accountEntity) =>
      this.getTenantProfilesFromAccountEntity(
        accountEntity,
        correlationId,
        accountFilter?.tenantId,
        accountFilter,
      ),
    );
  }
  getTenantedAccountInfoByFilter(accountInfo, tokenKeys, tenantProfile, correlationId, tenantProfileFilter) {
    let tenantedAccountInfo = null;
    let idTokenClaims;
    if (tenantProfileFilter) {
      if (!this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter)) return null;
    }
    let idToken = this.getIdToken(accountInfo, correlationId, tokenKeys, tenantProfile.tenantId);
    if (idToken) {
      idTokenClaims = extractTokenClaims(idToken.secret, this.cryptoImpl.base64Decode);
      if (!this.idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter)) return null;
    }
    tenantedAccountInfo = updateAccountTenantProfileData(
      accountInfo,
      tenantProfile,
      idTokenClaims,
      idToken?.secret,
    );
    return tenantedAccountInfo;
  }
  getTenantProfilesFromAccountEntity(accountEntity, correlationId, targetTenantId, tenantProfileFilter) {
    let accountInfo = AccountEntity.getAccountInfo(accountEntity);
    let searchTenantProfiles = accountInfo.tenantProfiles || new Map();
    let tokenKeys = this.getTokenKeys();
    if (targetTenantId) {
      let tenantProfile = searchTenantProfiles.get(targetTenantId);
      if (tenantProfile) searchTenantProfiles = new Map([[targetTenantId, tenantProfile]]);
      else return [];
    }
    let matchingTenantProfiles = [];
    searchTenantProfiles.forEach((tenantProfile) => {
      let tenantedAccountInfo = this.getTenantedAccountInfoByFilter(
        accountInfo,
        tokenKeys,
        tenantProfile,
        correlationId,
        tenantProfileFilter,
      );
      if (tenantedAccountInfo) matchingTenantProfiles.push(tenantedAccountInfo);
    });
    return matchingTenantProfiles;
  }
  tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter) {
    if (
      !!tenantProfileFilter.localAccountId &&
      !this.matchLocalAccountIdFromTenantProfile(tenantProfile, tenantProfileFilter.localAccountId)
    )
      return false;
    if (!!tenantProfileFilter.name && tenantProfile.name !== tenantProfileFilter.name) return false;
    if (
      tenantProfileFilter.isHomeTenant !== undefined &&
      tenantProfile.isHomeTenant !== tenantProfileFilter.isHomeTenant
    )
      return false;
    return true;
  }
  idTokenClaimsMatchTenantProfileFilter(idTokenClaims, tenantProfileFilter) {
    if (tenantProfileFilter) {
      if (
        !!tenantProfileFilter.localAccountId &&
        !this.matchLocalAccountIdFromTokenClaims(idTokenClaims, tenantProfileFilter.localAccountId)
      )
        return false;
      if (
        !!tenantProfileFilter.loginHint &&
        !this.matchLoginHintFromTokenClaims(idTokenClaims, tenantProfileFilter.loginHint)
      )
        return false;
      if (
        !!tenantProfileFilter.username &&
        !this.matchUsername(idTokenClaims.preferred_username, tenantProfileFilter.username)
      )
        return false;
      if (!!tenantProfileFilter.name && !this.matchName(idTokenClaims, tenantProfileFilter.name))
        return false;
      if (!!tenantProfileFilter.sid && !this.matchSid(idTokenClaims, tenantProfileFilter.sid)) return false;
    }
    return true;
  }
  async saveCacheRecord(cacheRecord, correlationId, kmsi, storeInCache) {
    if (!cacheRecord) throw createClientAuthError(invalidCacheRecord);
    try {
      if (cacheRecord.account) await this.setAccount(cacheRecord.account, correlationId, kmsi);
      if (!!cacheRecord.idToken && storeInCache?.idToken !== false)
        await this.setIdTokenCredential(cacheRecord.idToken, correlationId, kmsi);
      if (!!cacheRecord.accessToken && storeInCache?.accessToken !== false)
        await this.saveAccessToken(cacheRecord.accessToken, correlationId, kmsi);
      if (!!cacheRecord.refreshToken && storeInCache?.refreshToken !== false)
        await this.setRefreshTokenCredential(cacheRecord.refreshToken, correlationId, kmsi);
      if (cacheRecord.appMetadata) this.setAppMetadata(cacheRecord.appMetadata, correlationId);
    } catch (e) {
      this.commonLogger?.error("CacheManager.saveCacheRecord: failed");
      if (e instanceof AuthError) throw e;
      else throw Qd(e);
    }
  }
  async saveAccessToken(credential, correlationId, kmsi) {
    let accessTokenFilter = {
      clientId: credential.clientId,
      credentialType: credential.credentialType,
      environment: credential.environment,
      homeAccountId: credential.homeAccountId,
      realm: credential.realm,
      tokenType: credential.tokenType,
      requestedClaimsHash: credential.requestedClaimsHash,
    };
    let tokenKeys = this.getTokenKeys();
    let currentScopes = ScopeSet.fromString(credential.target);
    tokenKeys.accessToken.forEach((key) => {
      if (!this.accessTokenKeyMatchesFilter(key, accessTokenFilter, false)) return;
      let tokenEntity = this.getAccessTokenCredential(key, correlationId);
      if (tokenEntity && this.credentialMatchesFilter(tokenEntity, accessTokenFilter)) {
        if (ScopeSet.fromString(tokenEntity.target).intersectingScopeSets(currentScopes))
          this.removeAccessToken(key, correlationId);
      }
    });
    await this.setAccessTokenCredential(credential, correlationId, kmsi);
  }
  getAccountsFilteredBy(accountFilter, correlationId) {
    let allAccountKeys = this.getAccountKeys();
    let matchingAccounts = [];
    allAccountKeys.forEach((cacheKey) => {
      let entity = this.getAccount(cacheKey, correlationId);
      if (!entity) return;
      if (!!accountFilter.homeAccountId && !this.matchHomeAccountId(entity, accountFilter.homeAccountId))
        return;
      if (!!accountFilter.username && !this.matchUsername(entity.username, accountFilter.username)) return;
      if (!!accountFilter.environment && !this.matchEnvironment(entity, accountFilter.environment)) return;
      if (!!accountFilter.realm && !this.matchRealm(entity, accountFilter.realm)) return;
      if (
        !!accountFilter.nativeAccountId &&
        !this.matchNativeAccountId(entity, accountFilter.nativeAccountId)
      )
        return;
      if (!!accountFilter.authorityType && !this.matchAuthorityType(entity, accountFilter.authorityType))
        return;
      let tenantProfileFilter = {
        localAccountId: accountFilter?.localAccountId,
        name: accountFilter?.name,
      };
      let matchingTenantProfiles = entity.tenantProfiles?.filter((tenantProfile) =>
        this.tenantProfileMatchesFilter(tenantProfile, tenantProfileFilter),
      );
      if (matchingTenantProfiles && matchingTenantProfiles.length === 0) return;
      matchingAccounts.push(entity);
    });
    return matchingAccounts;
  }
  credentialMatchesFilter(entity, filter) {
    if (!!filter.clientId && !this.matchClientId(entity, filter.clientId)) return false;
    if (!!filter.userAssertionHash && !this.matchUserAssertionHash(entity, filter.userAssertionHash))
      return false;
    if (typeof filter.homeAccountId === "string" && !this.matchHomeAccountId(entity, filter.homeAccountId))
      return false;
    if (!!filter.environment && !this.matchEnvironment(entity, filter.environment)) return false;
    if (!!filter.realm && !this.matchRealm(entity, filter.realm)) return false;
    if (!!filter.credentialType && !this.matchCredentialType(entity, filter.credentialType)) return false;
    if (!!filter.familyId && !this.matchFamilyId(entity, filter.familyId)) return false;
    if (!!filter.target && !this.matchTarget(entity, filter.target)) return false;
    if (filter.requestedClaimsHash || entity.requestedClaimsHash) {
      if (entity.requestedClaimsHash !== filter.requestedClaimsHash) return false;
    }
    if (entity.credentialType === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME) {
      if (!!filter.tokenType && !this.matchTokenType(entity, filter.tokenType)) return false;
      if (filter.tokenType === AuthenticationScheme.SSH) {
        if (filter.keyId && !this.matchKeyId(entity, filter.keyId)) return false;
      }
    }
    return true;
  }
  getAppMetadataFilteredBy(filter) {
    let allCacheKeys = this.getKeys();
    let matchingAppMetadata = {};
    allCacheKeys.forEach((cacheKey) => {
      if (!this.isAppMetadata(cacheKey)) return;
      let entity = this.getAppMetadata(cacheKey);
      if (!entity) return;
      if (!!filter.environment && !this.matchEnvironment(entity, filter.environment)) return;
      if (!!filter.clientId && !this.matchClientId(entity, filter.clientId)) return;
      matchingAppMetadata[cacheKey] = entity;
    });
    return matchingAppMetadata;
  }
  getAuthorityMetadataByAlias(host) {
    let allCacheKeys = this.getAuthorityMetadataKeys();
    let matchedEntity = null;
    allCacheKeys.forEach((cacheKey) => {
      if (!this.isAuthorityMetadata(cacheKey) || cacheKey.indexOf(this.clientId) === -1) return;
      let entity = this.getAuthorityMetadata(cacheKey);
      if (!entity) return;
      if (entity.aliases.indexOf(host) === -1) return;
      matchedEntity = entity;
    });
    return matchedEntity;
  }
  removeAllAccounts(correlationId) {
    this.getAllAccounts({}, correlationId).forEach((account) => {
      this.removeAccount(account, correlationId);
    });
  }
  removeAccount(account, correlationId) {
    this.removeAccountContext(account, correlationId);
    let accountKeys = this.getAccountKeys();
    let keyFilter = (key) => key.includes(account.homeAccountId) && key.includes(account.environment);
    accountKeys.filter(keyFilter).forEach((key) => {
      this.removeItem(key, correlationId);
      this.performanceClient.incrementFields(
        {
          accountsRemoved: 1,
        },
        correlationId,
      );
    });
  }
  removeAccountContext(account, correlationId) {
    let allTokenKeys = this.getTokenKeys();
    let keyFilter = (key) => key.includes(account.homeAccountId) && key.includes(account.environment);
    allTokenKeys.idToken.filter(keyFilter).forEach((key) => {
      this.removeIdToken(key, correlationId);
    });
    allTokenKeys.accessToken.filter(keyFilter).forEach((key) => {
      this.removeAccessToken(key, correlationId);
    });
    allTokenKeys.refreshToken.filter(keyFilter).forEach((key) => {
      this.removeRefreshToken(key, correlationId);
    });
  }
  removeAccessToken(key, correlationId) {
    let credential = this.getAccessTokenCredential(key, correlationId);
    this.removeItem(key, correlationId);
    this.performanceClient.incrementFields(
      {
        accessTokensRemoved: 1,
      },
      correlationId,
    );
    if (
      !credential ||
      credential.credentialType.toLowerCase() !==
        CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME.toLowerCase() ||
      credential.tokenType !== AuthenticationScheme.POP
    )
      return;
    let kid = credential.keyId;
    if (kid)
      this.cryptoImpl.removeTokenBindingKey(kid).catch(() => {
        this.commonLogger.error(`Failed to remove token binding key ${kid}`, correlationId);
        this.performanceClient?.incrementFields(
          {
            removeTokenBindingKeyFailure: 1,
          },
          correlationId,
        );
      });
  }
  removeAppMetadata(correlationId) {
    this.getKeys().forEach((cacheKey) => {
      if (this.isAppMetadata(cacheKey)) this.removeItem(cacheKey, correlationId);
    });
    return true;
  }
  getIdToken(account, correlationId, tokenKeys, targetRealm, performanceClient) {
    this.commonLogger.trace("CacheManager - getIdToken called");
    let idTokenFilter = {
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      credentialType: CredentialType.ID_TOKEN,
      clientId: this.clientId,
      realm: targetRealm,
    };
    let idTokenMap = this.getIdTokensByFilter(idTokenFilter, correlationId, tokenKeys);
    let numIdTokens = idTokenMap.size;
    if (numIdTokens < 1) {
      this.commonLogger.info("CacheManager:getIdToken - No token found");
      return null;
    } else if (numIdTokens > 1) {
      let tokensToBeRemoved = idTokenMap;
      if (!targetRealm) {
        let l = new Map();
        idTokenMap.forEach((u, key) => {
          if (u.realm === account.tenantId) l.set(key, u);
        });
        let numHomeIdTokens = l.size;
        if (numHomeIdTokens < 1) {
          this.commonLogger.info(
            "CacheManager:getIdToken - Multiple ID tokens found for account but none match account entity tenant id, returning first result",
          );
          return idTokenMap.values().next().value;
        } else if (numHomeIdTokens === 1) {
          this.commonLogger.info(
            "CacheManager:getIdToken - Multiple ID tokens found for account, defaulting to home tenant profile",
          );
          return l.values().next().value;
        } else tokensToBeRemoved = l;
      }
      this.commonLogger.info("CacheManager:getIdToken - Multiple matching ID tokens found, clearing them");
      tokensToBeRemoved.forEach((idToken, key) => {
        this.removeIdToken(key, correlationId);
      });
      if (performanceClient && correlationId)
        performanceClient.addFields(
          {
            multiMatchedID: idTokenMap.size,
          },
          correlationId,
        );
      return null;
    }
    this.commonLogger.info("CacheManager:getIdToken - Returning ID token");
    return idTokenMap.values().next().value;
  }
  getIdTokensByFilter(filter, correlationId, tokenKeys) {
    let idTokenKeys = (tokenKeys && tokenKeys.idToken) || this.getTokenKeys().idToken;
    let idTokens = new Map();
    idTokenKeys.forEach((key) => {
      if (
        !this.idTokenKeyMatchesFilter(key, {
          clientId: this.clientId,
          ...filter,
        })
      )
        return;
      let idToken = this.getIdTokenCredential(key, correlationId);
      if (idToken && this.credentialMatchesFilter(idToken, filter)) idTokens.set(key, idToken);
    });
    return idTokens;
  }
  idTokenKeyMatchesFilter(inputKey, filter) {
    let key = inputKey.toLowerCase();
    if (filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) return false;
    if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) return false;
    return true;
  }
  removeIdToken(key, correlationId) {
    this.removeItem(key, correlationId);
  }
  removeRefreshToken(key, correlationId) {
    this.removeItem(key, correlationId);
  }
  getAccessToken(account, request, tokenKeys, targetRealm) {
    let correlationId = request.correlationId;
    this.commonLogger.trace("CacheManager - getAccessToken called", correlationId);
    let scopes = ScopeSet.createSearchScopes(request.scopes);
    let authScheme = request.authenticationScheme || AuthenticationScheme.BEARER;
    let credentialType =
      authScheme && authScheme.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase()
        ? CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME
        : CredentialType.ACCESS_TOKEN;
    let accessTokenFilter = {
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      credentialType,
      clientId: this.clientId,
      realm: targetRealm || account.tenantId,
      target: scopes,
      tokenType: authScheme,
      keyId: request.sshKid,
      requestedClaimsHash: request.requestedClaimsHash,
    };
    let accessTokenKeys = (tokenKeys && tokenKeys.accessToken) || this.getTokenKeys().accessToken;
    let accessTokens = [];
    accessTokenKeys.forEach((key) => {
      if (this.accessTokenKeyMatchesFilter(key, accessTokenFilter, true)) {
        let accessToken = this.getAccessTokenCredential(key, correlationId);
        if (accessToken && this.credentialMatchesFilter(accessToken, accessTokenFilter))
          accessTokens.push(accessToken);
      }
    });
    let numAccessTokens = accessTokens.length;
    if (numAccessTokens < 1) {
      this.commonLogger.info("CacheManager:getAccessToken - No token found", correlationId);
      return null;
    } else if (numAccessTokens > 1) {
      this.commonLogger.info(
        "CacheManager:getAccessToken - Multiple access tokens found, clearing them",
        correlationId,
      );
      accessTokens.forEach((accessToken) => {
        this.removeAccessToken(this.generateCredentialKey(accessToken), correlationId);
      });
      this.performanceClient.addFields(
        {
          multiMatchedAT: accessTokens.length,
        },
        correlationId,
      );
      return null;
    }
    this.commonLogger.info("CacheManager:getAccessToken - Returning access token", correlationId);
    return accessTokens[0];
  }
  accessTokenKeyMatchesFilter(inputKey, filter, keyMustContainAllScopes) {
    let key = inputKey.toLowerCase();
    if (filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1) return false;
    if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) return false;
    if (filter.realm && key.indexOf(filter.realm.toLowerCase()) === -1) return false;
    if (filter.requestedClaimsHash && key.indexOf(filter.requestedClaimsHash.toLowerCase()) === -1)
      return false;
    if (filter.target) {
      let scopes = filter.target.asArray();
      for (let i = 0; i < scopes.length; i++)
        if (keyMustContainAllScopes && !key.includes(scopes[i].toLowerCase())) return false;
        else if (!keyMustContainAllScopes && key.includes(scopes[i].toLowerCase())) return true;
    }
    return true;
  }
  getAccessTokensByFilter(filter, correlationId) {
    let tokenKeys = this.getTokenKeys();
    let accessTokens = [];
    tokenKeys.accessToken.forEach((key) => {
      if (!this.accessTokenKeyMatchesFilter(key, filter, true)) return;
      let accessToken = this.getAccessTokenCredential(key, correlationId);
      if (accessToken && this.credentialMatchesFilter(accessToken, filter)) accessTokens.push(accessToken);
    });
    return accessTokens;
  }
  getRefreshToken(account, familyRT, correlationId, tokenKeys, performanceClient) {
    this.commonLogger.trace("CacheManager - getRefreshToken called");
    let id = familyRT ? THE_FAMILY_ID : undefined;
    let refreshTokenFilter = {
      homeAccountId: account.homeAccountId,
      environment: account.environment,
      credentialType: CredentialType.REFRESH_TOKEN,
      clientId: this.clientId,
      familyId: id,
    };
    let refreshTokenKeys = (tokenKeys && tokenKeys.refreshToken) || this.getTokenKeys().refreshToken;
    let refreshTokens = [];
    refreshTokenKeys.forEach((key) => {
      if (this.refreshTokenKeyMatchesFilter(key, refreshTokenFilter)) {
        let refreshToken = this.getRefreshTokenCredential(key, correlationId);
        if (refreshToken && this.credentialMatchesFilter(refreshToken, refreshTokenFilter))
          refreshTokens.push(refreshToken);
      }
    });
    let numRefreshTokens = refreshTokens.length;
    if (numRefreshTokens < 1) {
      this.commonLogger.info("CacheManager:getRefreshToken - No refresh token found.");
      return null;
    }
    if (numRefreshTokens > 1 && performanceClient && correlationId)
      performanceClient.addFields(
        {
          multiMatchedRT: numRefreshTokens,
        },
        correlationId,
      );
    this.commonLogger.info("CacheManager:getRefreshToken - returning refresh token");
    return refreshTokens[0];
  }
  refreshTokenKeyMatchesFilter(inputKey, filter) {
    let key = inputKey.toLowerCase();
    if (filter.familyId && key.indexOf(filter.familyId.toLowerCase()) === -1) return false;
    if (!filter.familyId && filter.clientId && key.indexOf(filter.clientId.toLowerCase()) === -1)
      return false;
    if (filter.homeAccountId && key.indexOf(filter.homeAccountId.toLowerCase()) === -1) return false;
    return true;
  }
  readAppMetadataFromCache(environment) {
    let appMetadataFilter = {
      environment,
      clientId: this.clientId,
    };
    let appMetadata = this.getAppMetadataFilteredBy(appMetadataFilter);
    let appMetadataEntries = Object.keys(appMetadata).map((key) => appMetadata[key]);
    let numAppMetadata = appMetadataEntries.length;
    if (numAppMetadata < 1) return null;
    else if (numAppMetadata > 1) throw createClientAuthError(MULTIPLE_MATCHING_APPMETADATA);
    return appMetadataEntries[0];
  }
  isAppMetadataFOCI(environment) {
    let appMetadata = this.readAppMetadataFromCache(environment);
    return !!(appMetadata && appMetadata.familyId === THE_FAMILY_ID);
  }
  matchHomeAccountId(entity, homeAccountId) {
    return typeof entity.homeAccountId === "string" && homeAccountId === entity.homeAccountId;
  }
  matchLocalAccountIdFromTokenClaims(tokenClaims, localAccountId) {
    let idTokenLocalAccountId = tokenClaims.oid || tokenClaims.sub;
    return localAccountId === idTokenLocalAccountId;
  }
  matchLocalAccountIdFromTenantProfile(tenantProfile, localAccountId) {
    return tenantProfile.localAccountId === localAccountId;
  }
  matchName(claims, name) {
    return name.toLowerCase() === claims.name?.toLowerCase();
  }
  matchUsername(cachedUsername, filterUsername) {
    return !!(
      cachedUsername &&
      typeof cachedUsername === "string" &&
      filterUsername?.toLowerCase() === cachedUsername.toLowerCase()
    );
  }
  matchUserAssertionHash(entity, userAssertionHash) {
    return !!(entity.userAssertionHash && userAssertionHash === entity.userAssertionHash);
  }
  matchEnvironment(entity, environment) {
    if (this.staticAuthorityOptions) {
      let staticAliases = getAliasesFromStaticSources(this.staticAuthorityOptions, this.commonLogger);
      if (staticAliases.includes(environment) && staticAliases.includes(entity.environment)) return true;
    }
    let cloudMetadata = this.getAuthorityMetadataByAlias(environment);
    if (cloudMetadata && cloudMetadata.aliases.indexOf(entity.environment) > -1) return true;
    return false;
  }
  matchCredentialType(entity, credentialType) {
    return entity.credentialType && credentialType.toLowerCase() === entity.credentialType.toLowerCase();
  }
  matchClientId(entity, clientId) {
    return !!(entity.clientId && clientId === entity.clientId);
  }
  matchFamilyId(entity, familyId) {
    return !!(entity.familyId && familyId === entity.familyId);
  }
  matchRealm(entity, realm) {
    return entity.realm?.toLowerCase() === realm.toLowerCase();
  }
  matchNativeAccountId(entity, nativeAccountId) {
    return !!(entity.nativeAccountId && nativeAccountId === entity.nativeAccountId);
  }
  matchLoginHintFromTokenClaims(tokenClaims, loginHint) {
    if (tokenClaims.login_hint === loginHint) return true;
    if (tokenClaims.preferred_username === loginHint) return true;
    if (tokenClaims.upn === loginHint) return true;
    return false;
  }
  matchSid(idTokenClaims, sid) {
    return idTokenClaims.sid === sid;
  }
  matchAuthorityType(entity, authorityType) {
    return !!(entity.authorityType && authorityType.toLowerCase() === entity.authorityType.toLowerCase());
  }
  matchTarget(entity, target) {
    if (
      (entity.credentialType !== CredentialType.ACCESS_TOKEN &&
        entity.credentialType !== CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME) ||
      !entity.target
    )
      return false;
    return ScopeSet.fromString(entity.target).containsScopeSet(target);
  }
  matchTokenType(entity, tokenType) {
    return !!(entity.tokenType && entity.tokenType === tokenType);
  }
  matchKeyId(entity, keyId) {
    return !!(entity.keyId && entity.keyId === keyId);
  }
  isAppMetadata(key) {
    return key.indexOf(APP_METADATA) !== -1;
  }
  isAuthorityMetadata(key) {
    return key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) !== -1;
  }
  generateAuthorityMetadataCacheKey(authority) {
    return `${AUTHORITY_METADATA_CONSTANTS.CACHE_KEY}-${this.clientId}-${authority}`;
  }
  static toObject(obj, json) {
    for (let propertyName in json) obj[propertyName] = json[propertyName];
    return obj;
  }
}
//@ chunk-mrx6y2r5.js:135844-136615 esm-fingerprint
class DefaultStorageClass extends CacheManager {
  async setAccount() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAccount() {
    throw createClientAuthError(methodNotImplemented);
  }
  async setIdTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  getIdTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  async setAccessTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAccessTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  async setRefreshTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  getRefreshTokenCredential() {
    throw createClientAuthError(methodNotImplemented);
  }
  setAppMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAppMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  setServerTelemetry() {
    throw createClientAuthError(methodNotImplemented);
  }
  getServerTelemetry() {
    throw createClientAuthError(methodNotImplemented);
  }
  setAuthorityMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAuthorityMetadata() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAuthorityMetadataKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  setThrottlingCache() {
    throw createClientAuthError(methodNotImplemented);
  }
  getThrottlingCache() {
    throw createClientAuthError(methodNotImplemented);
  }
  removeItem() {
    throw createClientAuthError(methodNotImplemented);
  }
  getKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  getAccountKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  getTokenKeys() {
    throw createClientAuthError(methodNotImplemented);
  }
  generateCredentialKey() {
    throw createClientAuthError(methodNotImplemented);
  }
  generateAccountKey() {
    throw createClientAuthError(methodNotImplemented);
  }
}
//@ chunk-mrx6y2r5.js:136660-147470 esm-fingerprint
var PerformanceEvents = {
  AcquireTokenByCode: "acquireTokenByCode",
  AcquireTokenByRefreshToken: "acquireTokenByRefreshToken",
  AcquireTokenSilent: "acquireTokenSilent",
  AcquireTokenSilentAsync: "acquireTokenSilentAsync",
  AcquireTokenPopup: "acquireTokenPopup",
  AcquireTokenPreRedirect: "acquireTokenPreRedirect",
  AcquireTokenRedirect: "acquireTokenRedirect",
  CryptoOptsGetPublicKeyThumbprint: "cryptoOptsGetPublicKeyThumbprint",
  CryptoOptsSignJwt: "cryptoOptsSignJwt",
  SilentCacheClientAcquireToken: "silentCacheClientAcquireToken",
  SilentIframeClientAcquireToken: "silentIframeClientAcquireToken",
  AwaitConcurrentIframe: "awaitConcurrentIframe",
  SilentRefreshClientAcquireToken: "silentRefreshClientAcquireToken",
  SsoSilent: "ssoSilent",
  StandardInteractionClientGetDiscoveredAuthority: "standardInteractionClientGetDiscoveredAuthority",
  FetchAccountIdWithNativeBroker: "fetchAccountIdWithNativeBroker",
  NativeInteractionClientAcquireToken: "nativeInteractionClientAcquireToken",
  BaseClientCreateTokenRequestHeaders: "baseClientCreateTokenRequestHeaders",
  NetworkClientSendPostRequestAsync: "networkClientSendPostRequestAsync",
  RefreshTokenClientExecutePostToTokenEndpoint: "refreshTokenClientExecutePostToTokenEndpoint",
  AuthorizationCodeClientExecutePostToTokenEndpoint: "authorizationCodeClientExecutePostToTokenEndpoint",
  BrokerHandhshake: "brokerHandshake",
  AcquireTokenByRefreshTokenInBroker: "acquireTokenByRefreshTokenInBroker",
  AcquireTokenByBroker: "acquireTokenByBroker",
  RefreshTokenClientExecuteTokenRequest: "refreshTokenClientExecuteTokenRequest",
  RefreshTokenClientAcquireToken: "refreshTokenClientAcquireToken",
  RefreshTokenClientAcquireTokenWithCachedRefreshToken:
    "refreshTokenClientAcquireTokenWithCachedRefreshToken",
  RefreshTokenClientAcquireTokenByRefreshToken: "refreshTokenClientAcquireTokenByRefreshToken",
  RefreshTokenClientCreateTokenRequestBody: "refreshTokenClientCreateTokenRequestBody",
  AcquireTokenFromCache: "acquireTokenFromCache",
  SilentFlowClientAcquireCachedToken: "silentFlowClientAcquireCachedToken",
  SilentFlowClientGenerateResultFromCacheRecord: "silentFlowClientGenerateResultFromCacheRecord",
  AcquireTokenBySilentIframe: "acquireTokenBySilentIframe",
  InitializeBaseRequest: "initializeBaseRequest",
  InitializeSilentRequest: "initializeSilentRequest",
  InitializeClientApplication: "initializeClientApplication",
  InitializeCache: "initializeCache",
  SilentIframeClientTokenHelper: "silentIframeClientTokenHelper",
  SilentHandlerInitiateAuthRequest: "silentHandlerInitiateAuthRequest",
  SilentHandlerMonitorIframeForHash: "silentHandlerMonitorIframeForHash",
  SilentHandlerLoadFrame: "silentHandlerLoadFrame",
  SilentHandlerLoadFrameSync: "silentHandlerLoadFrameSync",
  StandardInteractionClientCreateAuthCodeClient: "standardInteractionClientCreateAuthCodeClient",
  StandardInteractionClientGetClientConfiguration: "standardInteractionClientGetClientConfiguration",
  StandardInteractionClientInitializeAuthorizationRequest:
    "standardInteractionClientInitializeAuthorizationRequest",
  GetAuthCodeUrl: "getAuthCodeUrl",
  GetStandardParams: "getStandardParams",
  HandleCodeResponseFromServer: "handleCodeResponseFromServer",
  HandleCodeResponse: "handleCodeResponse",
  HandleResponseEar: "handleResponseEar",
  HandleResponsePlatformBroker: "handleResponsePlatformBroker",
  HandleResponseCode: "handleResponseCode",
  UpdateTokenEndpointAuthority: "updateTokenEndpointAuthority",
  AuthClientAcquireToken: "authClientAcquireToken",
  AuthClientExecuteTokenRequest: "authClientExecuteTokenRequest",
  AuthClientCreateTokenRequestBody: "authClientCreateTokenRequestBody",
  PopTokenGenerateCnf: "popTokenGenerateCnf",
  PopTokenGenerateKid: "popTokenGenerateKid",
  HandleServerTokenResponse: "handleServerTokenResponse",
  DeserializeResponse: "deserializeResponse",
  AuthorityFactoryCreateDiscoveredInstance: "authorityFactoryCreateDiscoveredInstance",
  AuthorityResolveEndpointsAsync: "authorityResolveEndpointsAsync",
  AuthorityResolveEndpointsFromLocalSources: "authorityResolveEndpointsFromLocalSources",
  AuthorityGetCloudDiscoveryMetadataFromNetwork: "authorityGetCloudDiscoveryMetadataFromNetwork",
  AuthorityUpdateCloudDiscoveryMetadata: "authorityUpdateCloudDiscoveryMetadata",
  AuthorityGetEndpointMetadataFromNetwork: "authorityGetEndpointMetadataFromNetwork",
  AuthorityUpdateEndpointMetadata: "authorityUpdateEndpointMetadata",
  AuthorityUpdateMetadataWithRegionalInformation: "authorityUpdateMetadataWithRegionalInformation",
  RegionDiscoveryDetectRegion: "regionDiscoveryDetectRegion",
  RegionDiscoveryGetRegionFromIMDS: "regionDiscoveryGetRegionFromIMDS",
  RegionDiscoveryGetCurrentVersion: "regionDiscoveryGetCurrentVersion",
  AcquireTokenByCodeAsync: "acquireTokenByCodeAsync",
  GetEndpointMetadataFromNetwork: "getEndpointMetadataFromNetwork",
  GetCloudDiscoveryMetadataFromNetworkMeasurement: "getCloudDiscoveryMetadataFromNetworkMeasurement",
  HandleRedirectPromiseMeasurement: "handleRedirectPromise",
  HandleNativeRedirectPromiseMeasurement: "handleNativeRedirectPromise",
  UpdateCloudDiscoveryMetadataMeasurement: "updateCloudDiscoveryMetadataMeasurement",
  UsernamePasswordClientAcquireToken: "usernamePasswordClientAcquireToken",
  NativeMessageHandlerHandshake: "nativeMessageHandlerHandshake",
  NativeGenerateAuthResult: "nativeGenerateAuthResult",
  RemoveHiddenIframe: "removeHiddenIframe",
  ClearTokensAndKeysWithClaims: "clearTokensAndKeysWithClaims",
  CacheManagerGetRefreshToken: "cacheManagerGetRefreshToken",
  ImportExistingCache: "importExistingCache",
  SetUserData: "setUserData",
  LocalStorageUpdated: "localStorageUpdated",
  GeneratePkceCodes: "generatePkceCodes",
  GenerateCodeVerifier: "generateCodeVerifier",
  GenerateCodeChallengeFromVerifier: "generateCodeChallengeFromVerifier",
  Sha256Digest: "sha256Digest",
  GetRandomValues: "getRandomValues",
  GenerateHKDF: "generateHKDF",
  GenerateBaseKey: "generateBaseKey",
  Base64Decode: "base64Decode",
  UrlEncodeArr: "urlEncodeArr",
  Encrypt: "encrypt",
  Decrypt: "decrypt",
  GenerateEarKey: "generateEarKey",
  DecryptEarResponse: "decryptEarResponse",
};
var PerformanceEventAbbreviations = new Map([
  [PerformanceEvents.AcquireTokenByCode, "ATByCode"],
  [PerformanceEvents.AcquireTokenByRefreshToken, "ATByRT"],
  [PerformanceEvents.AcquireTokenSilent, "ATS"],
  [PerformanceEvents.AcquireTokenSilentAsync, "ATSAsync"],
  [PerformanceEvents.AcquireTokenPopup, "ATPopup"],
  [PerformanceEvents.AcquireTokenRedirect, "ATRedirect"],
  [PerformanceEvents.CryptoOptsGetPublicKeyThumbprint, "CryptoGetPKThumb"],
  [PerformanceEvents.CryptoOptsSignJwt, "CryptoSignJwt"],
  [PerformanceEvents.SilentCacheClientAcquireToken, "SltCacheClientAT"],
  [PerformanceEvents.SilentIframeClientAcquireToken, "SltIframeClientAT"],
  [PerformanceEvents.SilentRefreshClientAcquireToken, "SltRClientAT"],
  [PerformanceEvents.SsoSilent, "SsoSlt"],
  [PerformanceEvents.StandardInteractionClientGetDiscoveredAuthority, "StdIntClientGetDiscAuth"],
  [PerformanceEvents.FetchAccountIdWithNativeBroker, "FetchAccIdWithNtvBroker"],
  [PerformanceEvents.NativeInteractionClientAcquireToken, "NtvIntClientAT"],
  [PerformanceEvents.BaseClientCreateTokenRequestHeaders, "BaseClientCreateTReqHead"],
  [PerformanceEvents.NetworkClientSendPostRequestAsync, "NetClientSendPost"],
  [PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint, "RTClientExecPost"],
  [PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint, "AuthCodeClientExecPost"],
  [PerformanceEvents.BrokerHandhshake, "BrokerHandshake"],
  [PerformanceEvents.AcquireTokenByRefreshTokenInBroker, "ATByRTInBroker"],
  [PerformanceEvents.AcquireTokenByBroker, "ATByBroker"],
  [PerformanceEvents.RefreshTokenClientExecuteTokenRequest, "RTClientExecTReq"],
  [PerformanceEvents.RefreshTokenClientAcquireToken, "RTClientAT"],
  [PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken, "RTClientATWithCachedRT"],
  [PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken, "RTClientATByRT"],
  [PerformanceEvents.RefreshTokenClientCreateTokenRequestBody, "RTClientCreateTReqBody"],
  [PerformanceEvents.AcquireTokenFromCache, "ATFromCache"],
  [PerformanceEvents.SilentFlowClientAcquireCachedToken, "SltFlowClientATCached"],
  [PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord, "SltFlowClientGenResFromCache"],
  [PerformanceEvents.AcquireTokenBySilentIframe, "ATBySltIframe"],
  [PerformanceEvents.InitializeBaseRequest, "InitBaseReq"],
  [PerformanceEvents.InitializeSilentRequest, "InitSltReq"],
  [PerformanceEvents.InitializeClientApplication, "InitClientApplication"],
  [PerformanceEvents.InitializeCache, "InitCache"],
  [PerformanceEvents.ImportExistingCache, "importCache"],
  [PerformanceEvents.SetUserData, "setUserData"],
  [PerformanceEvents.LocalStorageUpdated, "localStorageUpdated"],
  [PerformanceEvents.SilentIframeClientTokenHelper, "SIClientTHelper"],
  [PerformanceEvents.SilentHandlerInitiateAuthRequest, "SHandlerInitAuthReq"],
  [PerformanceEvents.SilentHandlerMonitorIframeForHash, "SltHandlerMonitorIframeForHash"],
  [PerformanceEvents.SilentHandlerLoadFrame, "SHandlerLoadFrame"],
  [PerformanceEvents.SilentHandlerLoadFrameSync, "SHandlerLoadFrameSync"],
  [PerformanceEvents.StandardInteractionClientCreateAuthCodeClient, "StdIntClientCreateAuthCodeClient"],
  [PerformanceEvents.StandardInteractionClientGetClientConfiguration, "StdIntClientGetClientConf"],
  [PerformanceEvents.StandardInteractionClientInitializeAuthorizationRequest, "StdIntClientInitAuthReq"],
  [PerformanceEvents.GetAuthCodeUrl, "GetAuthCodeUrl"],
  [PerformanceEvents.HandleCodeResponseFromServer, "HandleCodeResFromServer"],
  [PerformanceEvents.HandleCodeResponse, "HandleCodeResp"],
  [PerformanceEvents.HandleResponseEar, "HandleRespEar"],
  [PerformanceEvents.HandleResponseCode, "HandleRespCode"],
  [PerformanceEvents.HandleResponsePlatformBroker, "HandleRespPlatBroker"],
  [PerformanceEvents.UpdateTokenEndpointAuthority, "UpdTEndpointAuth"],
  [PerformanceEvents.AuthClientAcquireToken, "AuthClientAT"],
  [PerformanceEvents.AuthClientExecuteTokenRequest, "AuthClientExecTReq"],
  [PerformanceEvents.AuthClientCreateTokenRequestBody, "AuthClientCreateTReqBody"],
  [PerformanceEvents.PopTokenGenerateCnf, "PopTGenCnf"],
  [PerformanceEvents.PopTokenGenerateKid, "PopTGenKid"],
  [PerformanceEvents.HandleServerTokenResponse, "HandleServerTRes"],
  [PerformanceEvents.DeserializeResponse, "DeserializeRes"],
  [PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance, "AuthFactCreateDiscInst"],
  [PerformanceEvents.AuthorityResolveEndpointsAsync, "AuthResolveEndpointsAsync"],
  [PerformanceEvents.AuthorityResolveEndpointsFromLocalSources, "AuthResolveEndpointsFromLocal"],
  [PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork, "AuthGetCDMetaFromNet"],
  [PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata, "AuthUpdCDMeta"],
  [PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork, "AuthUpdCDMetaFromNet"],
  [PerformanceEvents.AuthorityUpdateEndpointMetadata, "AuthUpdEndpointMeta"],
  [PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation, "AuthUpdMetaWithRegInfo"],
  [PerformanceEvents.RegionDiscoveryDetectRegion, "RegDiscDetectReg"],
  [PerformanceEvents.RegionDiscoveryGetRegionFromIMDS, "RegDiscGetRegFromIMDS"],
  [PerformanceEvents.RegionDiscoveryGetCurrentVersion, "RegDiscGetCurrentVer"],
  [PerformanceEvents.AcquireTokenByCodeAsync, "ATByCodeAsync"],
  [PerformanceEvents.GetEndpointMetadataFromNetwork, "GetEndpointMetaFromNet"],
  [PerformanceEvents.GetCloudDiscoveryMetadataFromNetworkMeasurement, "GetCDMetaFromNet"],
  [PerformanceEvents.HandleRedirectPromiseMeasurement, "HandleRedirectPromise"],
  [PerformanceEvents.HandleNativeRedirectPromiseMeasurement, "HandleNtvRedirectPromise"],
  [PerformanceEvents.UpdateCloudDiscoveryMetadataMeasurement, "UpdateCDMeta"],
  [PerformanceEvents.UsernamePasswordClientAcquireToken, "UserPassClientAT"],
  [PerformanceEvents.NativeMessageHandlerHandshake, "NtvMsgHandlerHandshake"],
  [PerformanceEvents.NativeGenerateAuthResult, "NtvGenAuthRes"],
  [PerformanceEvents.RemoveHiddenIframe, "RemoveHiddenIframe"],
  [PerformanceEvents.ClearTokensAndKeysWithClaims, "ClearTAndKeysWithClaims"],
  [PerformanceEvents.CacheManagerGetRefreshToken, "CacheManagerGetRT"],
  [PerformanceEvents.GeneratePkceCodes, "GenPkceCodes"],
  [PerformanceEvents.GenerateCodeVerifier, "GenCodeVerifier"],
  [PerformanceEvents.GenerateCodeChallengeFromVerifier, "GenCodeChallengeFromVerifier"],
  [PerformanceEvents.Sha256Digest, "Sha256Digest"],
  [PerformanceEvents.GetRandomValues, "GetRandomValues"],
  [PerformanceEvents.GenerateHKDF, "genHKDF"],
  [PerformanceEvents.GenerateBaseKey, "genBaseKey"],
  [PerformanceEvents.Base64Decode, "b64Decode"],
  [PerformanceEvents.UrlEncodeArr, "urlEncArr"],
  [PerformanceEvents.Encrypt, "encrypt"],
  [PerformanceEvents.Decrypt, "decrypt"],
  [PerformanceEvents.GenerateEarKey, "genEarKey"],
  [PerformanceEvents.DecryptEarResponse, "decryptEarResp"],
]);
var PerformanceEventStatus = {
  NotStarted: 0,
  InProgress: 1,
  Completed: 2,
};
//@ chunk-mrx6y2r5.js:147515-147606 esm-fingerprint
class StubPerformanceMeasurement {
  startMeasurement() {
    return;
  }
  endMeasurement() {
    return;
  }
  flushMeasurement() {
    return null;
  }
}
//@ chunk-mrx6y2r5.js:147606-148274 esm-fingerprint
class StubPerformanceClient {
  generateId() {
    return "callback-id";
  }
  startMeasurement(measureName, correlationId) {
    return {
      end: () => null,
      discard: () => {},
      add: () => {},
      increment: () => {},
      event: {
        eventId: this.generateId(),
        status: PerformanceEventStatus.InProgress,
        authority: "",
        libraryName: "",
        libraryVersion: "",
        clientId: "",
        name: measureName,
        startTimeMs: Date.now(),
        correlationId: correlationId || "",
      },
      measurement: new StubPerformanceMeasurement(),
    };
  }
  startPerformanceMeasurement() {
    return new StubPerformanceMeasurement();
  }
  calculateQueuedTime() {
    return 0;
  }
  addQueueMeasurement() {
    return;
  }
  setPreQueueTime() {
    return;
  }
  endMeasurement() {
    return null;
  }
  discardMeasurements() {
    return;
  }
  removePerformanceCallback() {
    return true;
  }
  addPerformanceCallback() {
    return "";
  }
  emitEvents() {
    return;
  }
  addFields() {
    return;
  }
  incrementFields() {
    return;
  }
  cacheEventByCorrelationId() {
    return;
  }
}
//@ chunk-mrx6y2r5.js:148319-148825 esm-fingerprint
var DEFAULT_SYSTEM_OPTIONS_2 = {
  tokenRenewalOffsetSeconds: DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
  preventCorsPreflight: false,
};
var yg = {
  loggerCallback: () => {},
  piiLoggingEnabled: false,
  logLevel: LogLevel.Info,
  correlationId: Constants.EMPTY_STRING,
};
var DEFAULT_CACHE_OPTIONS_2 = {
  claimsBasedCachingEnabled: false,
};
var DEFAULT_NETWORK_IMPLEMENTATION = {
  async sendGetRequestAsync() {
    throw createClientAuthError(methodNotImplemented);
  },
  async sendPostRequestAsync() {
    throw createClientAuthError(methodNotImplemented);
  },
};
var DEFAULT_LIBRARY_INFO = {
  sku: Constants.SKU,
  version: version_2,
  cpu: Constants.EMPTY_STRING,
  os: Constants.EMPTY_STRING,
};
var DEFAULT_CLIENT_CREDENTIALS = {
  clientSecret: Constants.EMPTY_STRING,
  clientAssertion: undefined,
};
var DEFAULT_AZURE_CLOUD_OPTIONS = {
  azureCloudInstance: AzureCloudInstance.None,
  tenant: `${Constants.DEFAULT_COMMON_TENANT}`,
};
var DEFAULT_TELEMETRY_OPTIONS_2 = {
  application: {
    appName: "",
    appVersion: "",
  },
};
//@ chunk-mrx6y2r5.js:148825-149441 esm-fingerprint
function buildClientConfiguration({
  authOptions: userAuthOptions,
  systemOptions: userSystemOptions,
  loggerOptions: userLoggerOption,
  cacheOptions: userCacheOptions,
  storageInterface: storageImplementation,
  networkInterface: networkImplementation,
  cryptoInterface: cryptoImplementation,
  clientCredentials,
  libraryInfo,
  telemetry,
  serverTelemetryManager,
  persistencePlugin,
  serializableCache,
}) {
  let loggerOptions = {
    ...yg,
    ...userLoggerOption,
  };
  return {
    authOptions: buildAuthOptions(userAuthOptions),
    systemOptions: {
      ...DEFAULT_SYSTEM_OPTIONS_2,
      ...userSystemOptions,
    },
    loggerOptions,
    cacheOptions: {
      ...DEFAULT_CACHE_OPTIONS_2,
      ...userCacheOptions,
    },
    storageInterface:
      storageImplementation ||
      new DefaultStorageClass(
        userAuthOptions.clientId,
        DEFAULT_CRYPTO_IMPLEMENTATION,
        new Logger(loggerOptions),
        new StubPerformanceClient(),
      ),
    networkInterface: networkImplementation || DEFAULT_NETWORK_IMPLEMENTATION,
    cryptoInterface: cryptoImplementation || DEFAULT_CRYPTO_IMPLEMENTATION,
    clientCredentials: clientCredentials || DEFAULT_CLIENT_CREDENTIALS,
    libraryInfo: {
      ...DEFAULT_LIBRARY_INFO,
      ...libraryInfo,
    },
    telemetry: {
      ...DEFAULT_TELEMETRY_OPTIONS_2,
      ...telemetry,
    },
    serverTelemetryManager: serverTelemetryManager || null,
    persistencePlugin: persistencePlugin || null,
    serializableCache: serializableCache || null,
  };
}
//@ chunk-mrx6y2r5.js:149441-149585 esm-fingerprint
function buildAuthOptions(userAuthOptions) {
  return {
    clientCapabilities: [],
    azureCloudOptions: DEFAULT_AZURE_CLOUD_OPTIONS,
    skipAuthorityMetadataCache: false,
    instanceAware: false,
    encodeExtraQueryParams: false,
    ...userAuthOptions,
  };
}
//@ chunk-mrx6y2r5.js:149585-149662 esm-fingerprint
function isOidcProtocolMode(config) {
  return config.authOptions.authority.options.protocolMode === ProtocolMode.OIDC;
}
//@ chunk-mrx6y2r5.js:149707-149760 esm-fingerprint
var CcsCredentialType = {
  HOME_ACCOUNT_ID: "home_account_id",
  UPN: "UPN",
};
//@ chunk-mrx6y2r5.js:149805-149919 esm-fingerprint
var CLIENT_ID = "client_id";
var REDIRECT_URI = "redirect_uri";
var RESPONSE_TYPE = "response_type";
var RESPONSE_MODE = "response_mode";
var GRANT_TYPE = "grant_type";
var CLAIMS = "claims";
var SCOPE = "scope";
//@ chunk-mrx6y2r5.js:149919-149942 esm-fingerprint
var REFRESH_TOKEN = "refresh_token";
//@ chunk-mrx6y2r5.js:149942-149980 esm-fingerprint
var STATE = "state";
var NONCE = "nonce";
var PROMPT = "prompt";
//@ chunk-mrx6y2r5.js:149980-150492 esm-fingerprint
var CODE = "code";
var CODE_CHALLENGE = "code_challenge";
var CODE_CHALLENGE_METHOD = "code_challenge_method";
var CODE_VERIFIER = "code_verifier";
var CLIENT_REQUEST_ID = "client-request-id";
var X_CLIENT_SKU = "x-client-SKU";
var X_CLIENT_VER = "x-client-VER";
var X_CLIENT_OS = "x-client-OS";
var X_CLIENT_CPU = "x-client-CPU";
var X_CLIENT_CURRENT_TELEMETRY = "x-client-current-telemetry";
var X_CLIENT_LAST_TELEMETRY = "x-client-last-telemetry";
var X_MS_LIB_CAPABILITY = "x-ms-lib-capability";
var X_APP_NAME = "x-app-name";
var X_APP_VER = "x-app-ver";
var POST_LOGOUT_REDIRECT_URI = "post_logout_redirect_uri";
var ID_TOKEN_HINT = "id_token_hint";
var DEVICE_CODE = "device_code";
var CLIENT_SECRET = "client_secret";
var CLIENT_ASSERTION = "client_assertion";
var CLIENT_ASSERTION_TYPE = "client_assertion_type";
var TOKEN_TYPE = "token_type";
var REQ_CNF = "req_cnf";
var ASSERTION = "assertion";
var REQUESTED_TOKEN_USE = "requested_token_use";
var ON_BEHALF_OF = "on_behalf_of";
//@ chunk-mrx6y2r5.js:150492-150517 esm-fingerprint
var RETURN_SPA_CODE = "return_spa_code";
//@ chunk-mrx6y2r5.js:150517-150664 esm-fingerprint
var LOGOUT_HINT = "logout_hint";
var SID = "sid";
var LOGIN_HINT = "login_hint";
var DOMAIN_HINT = "domain_hint";
var X_CLIENT_XTRA_SKU = "x-client-xtra-sku";
var BRK_CLIENT_ID = "brk_client_id";
var BRK_REDIRECT_URI = "brk_redirect_uri";
var INSTANCE_AWARE = "instance_aware";
//@ chunk-mrx6y2r5.js:150709-150840 esm-fingerprint
function instrumentBrokerParams(parameters, correlationId, performanceClient) {
  if (!correlationId) return;
  let n = parameters.get(CLIENT_ID);
  if (n && parameters.has(BRK_CLIENT_ID))
    performanceClient?.addFields(
      {
        embeddedClientId: n,
        embeddedRedirectUri: parameters.get(REDIRECT_URI),
      },
      correlationId,
    );
}
//@ chunk-mrx6y2r5.js:150840-150869 esm-layout
function Du(parameters, t) {
  parameters.set(RESPONSE_TYPE, t);
}
//@ chunk-mrx6y2r5.js:150869-150909 esm-fingerprint
function Uu(parameters, responseMode) {
  parameters.set(RESPONSE_MODE, responseMode ? responseMode : mt.QUERY);
}
//@ chunk-mrx6y2r5.js:150909-151072 esm-fingerprint
function addScopes(parameters, scopes, r = true, n = OIDC_DEFAULT_SCOPES) {
  if (r && !n.includes("openid") && !scopes.includes("openid")) n.push("openid");
  let requestScopes = r ? [...(scopes || []), ...n] : scopes || [];
  let scopeSet = new ScopeSet(requestScopes);
  parameters.set(SCOPE, scopeSet.printScopes());
}
//@ chunk-mrx6y2r5.js:151072-151101 esm-layout
function addClientId(parameters, clientId) {
  parameters.set(CLIENT_ID, clientId);
}
//@ chunk-mrx6y2r5.js:151101-151130 esm-layout
function addRedirectUri(parameters, redirectUri) {
  parameters.set(REDIRECT_URI, redirectUri);
}
//@ chunk-mrx6y2r5.js:151130-151159 esm-layout
function Lu(parameters, postLogoutRedirectUri) {
  parameters.set(POST_LOGOUT_REDIRECT_URI, postLogoutRedirectUri);
}
//@ chunk-mrx6y2r5.js:151159-151188 esm-layout
function Hu(parameters, idTokenHint) {
  parameters.set(ID_TOKEN_HINT, idTokenHint);
}
//@ chunk-mrx6y2r5.js:151188-151217 esm-layout
function Fu(parameters, domainHint) {
  parameters.set(DOMAIN_HINT, domainHint);
}
//@ chunk-mrx6y2r5.js:151217-151246 esm-layout
function addLoginHint(parameters, t) {
  parameters.set(LOGIN_HINT, t);
}
//@ chunk-mrx6y2r5.js:151246-151294 esm-fingerprint
function addCcsUpn(parameters, t) {
  parameters.set(HeaderNames.CCS_HEADER, `UPN:${t}`);
}
//@ chunk-mrx6y2r5.js:151294-151356 esm-fingerprint
function addCcsOid(parameters, clientInfo) {
  parameters.set(HeaderNames.CCS_HEADER, `Oid:${clientInfo.uid}@${clientInfo.utid}`);
}
//@ chunk-mrx6y2r5.js:151356-151385 esm-layout
function addSid(parameters, t) {
  parameters.set(SID, t);
}
//@ chunk-mrx6y2r5.js:151385-151469 esm-fingerprint
function addClaims(parameters, claims, clientCapabilities) {
  let n = Pg(claims, clientCapabilities);
  try {
    JSON.parse(n);
  } catch (error) {
    throw createClientConfigurationError(invalidClaims);
  }
  parameters.set(CLAIMS, n);
}
//@ chunk-mrx6y2r5.js:151469-151498 esm-layout
function addCorrelationId(parameters, correlationId) {
  parameters.set(CLIENT_REQUEST_ID, correlationId);
}
//@ chunk-mrx6y2r5.js:151498-151599 esm-fingerprint
function addLibraryInfo(parameters, libraryInfo) {
  parameters.set(X_CLIENT_SKU, libraryInfo.sku);
  parameters.set(X_CLIENT_VER, libraryInfo.version);
  if (libraryInfo.os) parameters.set(X_CLIENT_OS, libraryInfo.os);
  if (libraryInfo.cpu) parameters.set(X_CLIENT_CPU, libraryInfo.cpu);
}
//@ chunk-mrx6y2r5.js:151599-151690 esm-fingerprint
function addApplicationTelemetry(parameters, appTelemetry) {
  if (appTelemetry?.appName) parameters.set(X_APP_NAME, appTelemetry.appName);
  if (appTelemetry?.appVersion) parameters.set(X_APP_VER, appTelemetry.appVersion);
}
//@ chunk-mrx6y2r5.js:151690-151719 layout
function $u(parameters, prompt) {
  parameters.set(PROMPT, prompt);
}
//@ chunk-mrx6y2r5.js:151719-151753 layout
function addState(parameters, state) {
  if (state) parameters.set(STATE, state);
}
//@ chunk-mrx6y2r5.js:151753-151782 layout
function Bu(parameters, nonce) {
  parameters.set(NONCE, nonce);
}
//@ chunk-mrx6y2r5.js:151782-151850 layout
function wg(parameters, codeChallenge, codeChallengeMethod) {
  if (codeChallenge && codeChallengeMethod) {
    parameters.set(CODE_CHALLENGE, codeChallenge);
    parameters.set(CODE_CHALLENGE_METHOD, codeChallengeMethod);
  } else throw createClientConfigurationError(pkceParamsMissing);
}
//@ chunk-mrx6y2r5.js:151850-151879 layout
function zu(parameters, code) {
  parameters.set(CODE, code);
}
//@ chunk-mrx6y2r5.js:151879-151908 layout
function vg(parameters, deviceCode) {
  parameters.set(DEVICE_CODE, deviceCode);
}
//@ chunk-mrx6y2r5.js:151908-151937 layout
function Gu(parameters, refreshToken) {
  parameters.set(REFRESH_TOKEN, refreshToken);
}
//@ chunk-mrx6y2r5.js:151937-151966 layout
function qu(parameters, codeVerifier) {
  parameters.set(CODE_VERIFIER, codeVerifier);
}
//@ chunk-mrx6y2r5.js:151966-151995 layout
function addClientSecret(parameters, clientSecret) {
  parameters.set(CLIENT_SECRET, clientSecret);
}
//@ chunk-mrx6y2r5.js:151995-152029 layout
function addClientAssertion(parameters, clientAssertion) {
  if (clientAssertion) parameters.set(CLIENT_ASSERTION, clientAssertion);
}
//@ chunk-mrx6y2r5.js:152029-152063 layout
function addClientAssertionType(parameters, assertionType) {
  if (assertionType) parameters.set(CLIENT_ASSERTION_TYPE, assertionType);
}
//@ chunk-mrx6y2r5.js:152063-152092 layout
function kg(parameters, oboAssertion) {
  parameters.set(ASSERTION, oboAssertion);
}
//@ chunk-mrx6y2r5.js:152092-152121 layout
function bg(parameters, t) {
  parameters.set(REQUESTED_TOKEN_USE, t);
}
//@ chunk-mrx6y2r5.js:152121-152150 layout
function addGrantType(parameters, t) {
  parameters.set(GRANT_TYPE, t);
}
//@ chunk-mrx6y2r5.js:152150-152179 layout
function addClientInfo(parameters) {
  parameters.set(CLIENT_INFO, "1");
}
//@ chunk-mrx6y2r5.js:152179-152225 esm-fingerprint
function addInstanceAware(parameters) {
  if (!parameters.has(INSTANCE_AWARE)) parameters.set(INSTANCE_AWARE, "true");
}
//@ chunk-mrx6y2r5.js:152225-152307 esm-fingerprint
function addExtraQueryParameters(parameters, t) {
  Object.entries(t).forEach(([key, value]) => {
    if (!parameters.has(key) && value) parameters.set(key, value);
  });
}
//@ chunk-mrx6y2r5.js:152307-152531 esm-fingerprint
function Pg(e, t) {
  let r;
  if (!e) r = {};
  else
    try {
      r = JSON.parse(e);
    } catch (error) {
      throw createClientConfigurationError(invalidClaims);
    }
  if (t && t.length > 0) {
    if (!r.hasOwnProperty(nr.ACCESS_TOKEN)) r[nr.ACCESS_TOKEN] = {};
    r[nr.ACCESS_TOKEN][nr.XMS_CC] = {
      values: t,
    };
  }
  return JSON.stringify(r);
}
//@ chunk-mrx6y2r5.js:152531-152569 esm-fingerprint
function Og(parameters, username) {
  parameters.set(PasswordGrantConstants.username, username);
}
//@ chunk-mrx6y2r5.js:152569-152607 esm-fingerprint
function Ng(parameters, password) {
  parameters.set(PasswordGrantConstants.password, password);
}
//@ chunk-mrx6y2r5.js:152607-152657 esm-fingerprint
function addPopToken(parameters, reqCnfData) {
  if (reqCnfData) {
    parameters.set(TOKEN_TYPE, AuthenticationScheme.POP);
    parameters.set(REQ_CNF, reqCnfData);
  }
}
//@ chunk-mrx6y2r5.js:152657-152707 esm-fingerprint
function addSshJwk(parameters, sshJwk) {
  if (sshJwk) {
    parameters.set(TOKEN_TYPE, AuthenticationScheme.SSH);
    parameters.set(REQ_CNF, sshJwk);
  }
}
//@ chunk-mrx6y2r5.js:152707-152817 esm-fingerprint
function addServerTelemetry(parameters, serverTelemetryManager) {
  parameters.set(X_CLIENT_CURRENT_TELEMETRY, serverTelemetryManager.generateCurrentRequestHeaderValue());
  parameters.set(X_CLIENT_LAST_TELEMETRY, serverTelemetryManager.generateLastRequestHeaderValue());
}
//@ chunk-mrx6y2r5.js:152817-152871 esm-fingerprint
function addThrottling(parameters) {
  parameters.set(X_MS_LIB_CAPABILITY, ThrottlingConstants.X_MS_LIB_CAPABILITY_VALUE);
}
//@ chunk-mrx6y2r5.js:152871-152900 esm-layout
function Ku(parameters, logoutHint) {
  parameters.set(LOGOUT_HINT, logoutHint);
}
//@ chunk-mrx6y2r5.js:152900-152971 esm-fingerprint
function addBrokerParameters(parameters, clientId, redirectUri) {
  if (!parameters.has(BRK_CLIENT_ID)) parameters.set(BRK_CLIENT_ID, clientId);
  if (!parameters.has(BRK_REDIRECT_URI)) parameters.set(BRK_REDIRECT_URI, redirectUri);
}
//@ chunk-mrx6y2r5.js:153016-153175 esm-fingerprint
function isOpenIdConfigResponse(body) {
  return (
    body.hasOwnProperty("authorization_endpoint") &&
    body.hasOwnProperty("token_endpoint") &&
    body.hasOwnProperty("issuer") &&
    body.hasOwnProperty("jwks_uri")
  );
}
//@ chunk-mrx6y2r5.js:153220-153318 esm-fingerprint
function isCloudInstanceDiscoveryResponse(body) {
  return body.hasOwnProperty("tenant_discovery_endpoint") && body.hasOwnProperty("metadata");
}
//@ chunk-mrx6y2r5.js:153363-153450 esm-fingerprint
function isCloudInstanceDiscoveryErrorResponse(body) {
  return body.hasOwnProperty("error") && body.hasOwnProperty("error_description");
}
//@ chunk-mrx6y2r5.js:153495-154311 esm-fingerprint
var invoke =
  (callback, eventName, logger, telemetryClient, correlationId) =>
  (...args) => {
    logger.trace(`Executing function ${eventName}`);
    let inProgressEvent = telemetryClient?.startMeasurement(eventName, correlationId);
    if (correlationId) {
      let eventCount = eventName + "CallCount";
      telemetryClient?.incrementFields(
        {
          [eventCount]: 1,
        },
        correlationId,
      );
    }
    try {
      let result = callback(...args);
      inProgressEvent?.end({
        success: true,
      });
      logger.trace(`Returning result from ${eventName}`);
      return result;
    } catch (e) {
      logger.trace(`Error occurred in ${eventName}`);
      try {
        logger.trace(JSON.stringify(e));
      } catch (e) {
        logger.trace("Unable to print error message.");
      }
      inProgressEvent?.end(
        {
          success: false,
        },
        e,
      );
      throw e;
    }
  };
var invokeAsync =
  (callback, eventName, logger, telemetryClient, correlationId) =>
  (...args) => {
    logger.trace(`Executing function ${eventName}`);
    let inProgressEvent = telemetryClient?.startMeasurement(eventName, correlationId);
    if (correlationId) {
      let eventCount = eventName + "CallCount";
      telemetryClient?.incrementFields(
        {
          [eventCount]: 1,
        },
        correlationId,
      );
    }
    telemetryClient?.setPreQueueTime(eventName, correlationId);
    return callback(...args)
      .then((response) => {
        logger.trace(`Returning result from ${eventName}`);
        inProgressEvent?.end({
          success: true,
        });
        return response;
      })
      .catch((e) => {
        logger.trace(`Error occurred in ${eventName}`);
        try {
          logger.trace(JSON.stringify(e));
        } catch (e) {
          logger.trace("Unable to print error message.");
        }
        inProgressEvent?.end(
          {
            success: false,
          },
          e,
        );
        throw e;
      });
  };
//@ chunk-mrx6y2r5.js:154356-156077 esm-fingerprint
class RegionDiscovery {
  constructor(networkInterface, logger, performanceClient, correlationId) {
    this.networkInterface = networkInterface;
    this.logger = logger;
    this.performanceClient = performanceClient;
    this.correlationId = correlationId;
  }
  async detectRegion(environmentRegion, regionDiscoveryMetadata) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RegionDiscoveryDetectRegion,
      this.correlationId,
    );
    let autodetectedRegionName = environmentRegion;
    if (!autodetectedRegionName) {
      let options = RegionDiscovery.IMDS_OPTIONS;
      try {
        let localIMDSVersionResponse = await invokeAsync(
          this.getRegionFromIMDS.bind(this),
          PerformanceEvents.RegionDiscoveryGetRegionFromIMDS,
          this.logger,
          this.performanceClient,
          this.correlationId,
        )(Constants.IMDS_VERSION, options);
        if (localIMDSVersionResponse.status === HttpStatus.SUCCESS) {
          autodetectedRegionName = localIMDSVersionResponse.body;
          regionDiscoveryMetadata.region_source = RegionDiscoverySources.IMDS;
        }
        if (localIMDSVersionResponse.status === HttpStatus.BAD_REQUEST) {
          let currentIMDSVersion = await invokeAsync(
            this.getCurrentVersion.bind(this),
            PerformanceEvents.RegionDiscoveryGetCurrentVersion,
            this.logger,
            this.performanceClient,
            this.correlationId,
          )(options);
          if (!currentIMDSVersion) {
            regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
            return null;
          }
          let currentIMDSVersionResponse = await invokeAsync(
            this.getRegionFromIMDS.bind(this),
            PerformanceEvents.RegionDiscoveryGetRegionFromIMDS,
            this.logger,
            this.performanceClient,
            this.correlationId,
          )(currentIMDSVersion, options);
          if (currentIMDSVersionResponse.status === HttpStatus.SUCCESS) {
            autodetectedRegionName = currentIMDSVersionResponse.body;
            regionDiscoveryMetadata.region_source = RegionDiscoverySources.IMDS;
          }
        }
      } catch (e) {
        regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
        return null;
      }
    } else regionDiscoveryMetadata.region_source = RegionDiscoverySources.ENVIRONMENT_VARIABLE;
    if (!autodetectedRegionName)
      regionDiscoveryMetadata.region_source = RegionDiscoverySources.FAILED_AUTO_DETECTION;
    return autodetectedRegionName || null;
  }
  async getRegionFromIMDS(version, options) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RegionDiscoveryGetRegionFromIMDS,
      this.correlationId,
    );
    return this.networkInterface.sendGetRequestAsync(
      `${Constants.IMDS_ENDPOINT}?api-version=${version}&format=text`,
      options,
      Constants.IMDS_TIMEOUT,
    );
  }
  async getCurrentVersion(options) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RegionDiscoveryGetCurrentVersion,
      this.correlationId,
    );
    try {
      let response = await this.networkInterface.sendGetRequestAsync(
        `${Constants.IMDS_ENDPOINT}?format=json`,
        options,
      );
      if (
        response.status === HttpStatus.BAD_REQUEST &&
        response.body &&
        response.body["newest-versions"] &&
        response.body["newest-versions"].length > 0
      )
        return response.body["newest-versions"][0];
      return null;
    } catch (e) {
      return null;
    }
  }
}
//@ chunk-mrx6y2r5.js:156077-156121 esm-fingerprint
RegionDiscovery.IMDS_OPTIONS = {
  headers: {
    Metadata: "true",
  },
};
//@ chunk-mrx6y2r5.js:156166-156224 esm-fingerprint
function nowSeconds() {
  return Math.round(new Date().getTime() / 1000);
}
//@ chunk-mrx6y2r5.js:156224-156292 esm-layout
function toDateFromSeconds(seconds) {
  if (seconds) return new Date(Number(seconds) * 1000);
  return new Date();
}
//@ chunk-mrx6y2r5.js:156292-156343 esm-layout
function isTokenExpired(expiresOn, offset) {
  let expirationSec = Number(expiresOn) || 0;
  return nowSeconds() + offset > expirationSec;
}
//@ chunk-mrx6y2r5.js:156343-156379 esm-layout
function Qu(cachedAt) {
  return Number(cachedAt) > nowSeconds();
}
//@ chunk-mrx6y2r5.js:156379-156444 esm-layout
function xg(pollingIntervalMilli, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), pollingIntervalMilli));
}
//@ chunk-mrx6y2r5.js:156489-156640 esm-fingerprint
function createIdTokenEntity(homeAccountId, environment, idToken, clientId, tenantId) {
  return {
    credentialType: CredentialType.ID_TOKEN,
    homeAccountId,
    environment,
    clientId,
    secret: idToken,
    realm: tenantId,
    lastUpdatedAt: Date.now().toString(),
  };
}
//@ chunk-mrx6y2r5.js:156640-157261 esm-fingerprint
function createAccessTokenEntity(
  homeAccountId,
  environment,
  accessToken,
  clientId,
  tenantId,
  scopes,
  expiresOn,
  extExpiresOn,
  base64Decode,
  refreshOn,
  tokenType,
  userAssertionHash,
  keyId,
  requestedClaims,
  requestedClaimsHash,
) {
  let atEntity = {
    homeAccountId,
    credentialType: CredentialType.ACCESS_TOKEN,
    secret: accessToken,
    cachedAt: nowSeconds().toString(),
    expiresOn: expiresOn.toString(),
    extendedExpiresOn: extExpiresOn.toString(),
    environment,
    clientId,
    realm: tenantId,
    target: scopes,
    tokenType: tokenType || AuthenticationScheme.BEARER,
    lastUpdatedAt: Date.now().toString(),
  };
  if (userAssertionHash) atEntity.userAssertionHash = userAssertionHash;
  if (refreshOn) atEntity.refreshOn = refreshOn.toString();
  if (requestedClaims) {
    atEntity.requestedClaims = requestedClaims;
    atEntity.requestedClaimsHash = requestedClaimsHash;
  }
  if (atEntity.tokenType?.toLowerCase() !== AuthenticationScheme.BEARER.toLowerCase())
    switch (((atEntity.credentialType = CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME), atEntity.tokenType)) {
      case AuthenticationScheme.POP:
        let tokenClaims = extractTokenClaims(accessToken, base64Decode);
        if (!tokenClaims?.cnf?.kid) throw createClientAuthError(TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT);
        atEntity.keyId = tokenClaims.cnf.kid;
        break;
      case AuthenticationScheme.SSH:
        atEntity.keyId = keyId;
    }
  return atEntity;
}
//@ chunk-mrx6y2r5.js:157261-157497 esm-fingerprint
function createRefreshTokenEntity(
  homeAccountId,
  environment,
  refreshToken,
  clientId,
  familyId,
  userAssertionHash,
  expiresOn,
) {
  let rtEntity = {
    credentialType: CredentialType.REFRESH_TOKEN,
    homeAccountId,
    environment,
    clientId,
    secret: refreshToken,
    lastUpdatedAt: Date.now().toString(),
  };
  if (userAssertionHash) rtEntity.userAssertionHash = userAssertionHash;
  if (familyId) rtEntity.familyId = familyId;
  if (expiresOn) rtEntity.expiresOn = expiresOn.toString();
  return rtEntity;
}
//@ chunk-mrx6y2r5.js:157497-157680 esm-fingerprint
function isCredentialEntity(entity) {
  return (
    entity.hasOwnProperty("homeAccountId") &&
    entity.hasOwnProperty("environment") &&
    entity.hasOwnProperty("credentialType") &&
    entity.hasOwnProperty("clientId") &&
    entity.hasOwnProperty("secret")
  );
}
//@ chunk-mrx6y2r5.js:157680-157867 esm-fingerprint
function isAccessTokenEntity(entity) {
  if (!entity) return false;
  return (
    isCredentialEntity(entity) &&
    entity.hasOwnProperty("realm") &&
    entity.hasOwnProperty("target") &&
    (entity.credentialType === CredentialType.ACCESS_TOKEN ||
      entity.credentialType === CredentialType.ACCESS_TOKEN_WITH_AUTH_SCHEME)
  );
}
//@ chunk-mrx6y2r5.js:157867-157968 esm-fingerprint
function isIdTokenEntity(entity) {
  if (!entity) return false;
  return (
    isCredentialEntity(entity) &&
    entity.hasOwnProperty("realm") &&
    entity.credentialType === CredentialType.ID_TOKEN
  );
}
//@ chunk-mrx6y2r5.js:157968-158047 esm-fingerprint
function isRefreshTokenEntity(entity) {
  if (!entity) return false;
  return isCredentialEntity(entity) && entity.credentialType === CredentialType.REFRESH_TOKEN;
}
//@ chunk-mrx6y2r5.js:158047-158216 esm-fingerprint
function isServerTelemetryEntity(key, entity) {
  let validateKey = key.indexOf(SERVER_TELEM_CONSTANTS.CACHE_KEY) === 0;
  let validateEntity = true;
  if (entity)
    validateEntity =
      entity.hasOwnProperty("failedRequests") &&
      entity.hasOwnProperty("errors") &&
      entity.hasOwnProperty("cacheHits");
  return validateKey && validateEntity;
}
//@ chunk-mrx6y2r5.js:158216-158346 esm-fingerprint
function isThrottlingEntity(key, entity) {
  let validateKey = false;
  if (key) validateKey = key.indexOf(ThrottlingConstants.THROTTLING_PREFIX) === 0;
  let validateEntity = true;
  if (entity) validateEntity = entity.hasOwnProperty("throttleTime");
  return validateKey && validateEntity;
}
//@ chunk-mrx6y2r5.js:158346-158444 esm-fingerprint
function generateAppMetadataKey({ environment, clientId }) {
  return [APP_METADATA, environment, clientId].join(Separators.CACHE_KEY_SEPARATOR).toLowerCase();
}
//@ chunk-mrx6y2r5.js:158444-158564 esm-fingerprint
function isAppMetadataEntity(key, entity) {
  if (!entity) return false;
  return (
    key.indexOf(APP_METADATA) === 0 &&
    entity.hasOwnProperty("clientId") &&
    entity.hasOwnProperty("environment")
  );
}
//@ chunk-mrx6y2r5.js:158564-159028 esm-fingerprint
function isAuthorityMetadataEntity(key, entity) {
  if (!entity) return false;
  return (
    key.indexOf(AUTHORITY_METADATA_CONSTANTS.CACHE_KEY) === 0 &&
    entity.hasOwnProperty("aliases") &&
    entity.hasOwnProperty("preferred_cache") &&
    entity.hasOwnProperty("preferred_network") &&
    entity.hasOwnProperty("canonical_authority") &&
    entity.hasOwnProperty("authorization_endpoint") &&
    entity.hasOwnProperty("token_endpoint") &&
    entity.hasOwnProperty("issuer") &&
    entity.hasOwnProperty("aliasesFromNetwork") &&
    entity.hasOwnProperty("endpointsFromNetwork") &&
    entity.hasOwnProperty("expiresAt") &&
    entity.hasOwnProperty("jwks_uri")
  );
}
//@ chunk-mrx6y2r5.js:159028-159077 esm-fingerprint
function generateAuthorityMetadataExpiresAt() {
  return nowSeconds() + AUTHORITY_METADATA_CONSTANTS.REFRESH_TIME_SECONDS;
}
//@ chunk-mrx6y2r5.js:159077-159291 esm-fingerprint
function updateAuthorityEndpointMetadata(authorityMetadata, updatedValues, fromNetwork) {
  authorityMetadata.authorization_endpoint = updatedValues.authorization_endpoint;
  authorityMetadata.token_endpoint = updatedValues.token_endpoint;
  authorityMetadata.end_session_endpoint = updatedValues.end_session_endpoint;
  authorityMetadata.issuer = updatedValues.issuer;
  authorityMetadata.endpointsFromNetwork = fromNetwork;
  authorityMetadata.jwks_uri = updatedValues.jwks_uri;
}
//@ chunk-mrx6y2r5.js:159291-159429 esm-fingerprint
function updateCloudDiscoveryMetadata(authorityMetadata, updatedValues, fromNetwork) {
  authorityMetadata.aliases = updatedValues.aliases;
  authorityMetadata.preferred_cache = updatedValues.preferred_cache;
  authorityMetadata.preferred_network = updatedValues.preferred_network;
  authorityMetadata.aliasesFromNetwork = fromNetwork;
}
//@ chunk-mrx6y2r5.js:159429-159468 esm-fingerprint
function isAuthorityMetadataExpired(metadata) {
  return metadata.expiresAt <= nowSeconds();
}
//@ chunk-mrx6y2r5.js:159513-175430 esm-fingerprint
class Authority {
  constructor(
    authority,
    networkInterface,
    cacheManager,
    authorityOptions,
    logger,
    correlationId,
    performanceClient,
    managedIdentity,
  ) {
    this.canonicalAuthority = authority;
    this._canonicalAuthority.validateAsUri();
    this.networkInterface = networkInterface;
    this.cacheManager = cacheManager;
    this.authorityOptions = authorityOptions;
    this.regionDiscoveryMetadata = {
      region_used: undefined,
      region_source: undefined,
      region_outcome: undefined,
    };
    this.logger = logger;
    this.performanceClient = performanceClient;
    this.correlationId = correlationId;
    this.managedIdentity = managedIdentity || false;
    this.regionDiscovery = new RegionDiscovery(
      networkInterface,
      this.logger,
      this.performanceClient,
      this.correlationId,
    );
  }
  getAuthorityType(authorityUri) {
    if (authorityUri.HostNameAndPort.endsWith(Constants.CIAM_AUTH_URL)) return AuthorityType.Ciam;
    let pathSegments = authorityUri.PathSegments;
    if (pathSegments.length)
      switch (pathSegments[0].toLowerCase()) {
        case Constants.ADFS:
          return AuthorityType.Adfs;
        case Constants.DSTS:
          return AuthorityType.Dsts;
      }
    return AuthorityType.Default;
  }
  get authorityType() {
    return this.getAuthorityType(this.canonicalAuthorityUrlComponents);
  }
  get protocolMode() {
    return this.authorityOptions.protocolMode;
  }
  get options() {
    return this.authorityOptions;
  }
  get canonicalAuthority() {
    return this._canonicalAuthority.urlString;
  }
  set canonicalAuthority(url) {
    this._canonicalAuthority = new UrlString(url);
    this._canonicalAuthority.validateAsUri();
    this._canonicalAuthorityUrlComponents = null;
  }
  get canonicalAuthorityUrlComponents() {
    if (!this._canonicalAuthorityUrlComponents)
      this._canonicalAuthorityUrlComponents = this._canonicalAuthority.getUrlComponents();
    return this._canonicalAuthorityUrlComponents;
  }
  get hostnameAndPort() {
    return this.canonicalAuthorityUrlComponents.HostNameAndPort.toLowerCase();
  }
  get tenant() {
    return this.canonicalAuthorityUrlComponents.PathSegments[0];
  }
  get authorizationEndpoint() {
    if (this.discoveryComplete()) return this.replacePath(this.metadata.authorization_endpoint);
    else throw createClientAuthError(endpointResolutionError);
  }
  get tokenEndpoint() {
    if (this.discoveryComplete()) return this.replacePath(this.metadata.token_endpoint);
    else throw createClientAuthError(endpointResolutionError);
  }
  get deviceCodeEndpoint() {
    if (this.discoveryComplete())
      return this.replacePath(this.metadata.token_endpoint.replace("/token", "/devicecode"));
    else throw createClientAuthError(endpointResolutionError);
  }
  get endSessionEndpoint() {
    if (this.discoveryComplete()) {
      if (!this.metadata.end_session_endpoint) throw createClientAuthError(endSessionEndpointNotSupported);
      return this.replacePath(this.metadata.end_session_endpoint);
    } else throw createClientAuthError(endpointResolutionError);
  }
  get selfSignedJwtAudience() {
    if (this.discoveryComplete()) return this.replacePath(this.metadata.issuer);
    else throw createClientAuthError(endpointResolutionError);
  }
  get jwksUri() {
    if (this.discoveryComplete()) return this.replacePath(this.metadata.jwks_uri);
    else throw createClientAuthError(endpointResolutionError);
  }
  canReplaceTenant(authorityUri) {
    return (
      authorityUri.PathSegments.length === 1 &&
      !Authority.reservedTenantDomains.has(authorityUri.PathSegments[0]) &&
      this.getAuthorityType(authorityUri) === AuthorityType.Default &&
      this.protocolMode !== ProtocolMode.OIDC
    );
  }
  replaceTenant(urlString) {
    return urlString.replace(/{tenant}|{tenantid}/g, this.tenant);
  }
  replacePath(urlString) {
    let endpoint = urlString;
    let cachedAuthorityUrlComponents = new UrlString(this.metadata.canonical_authority).getUrlComponents();
    let cachedAuthorityParts = cachedAuthorityUrlComponents.PathSegments;
    this.canonicalAuthorityUrlComponents.PathSegments.forEach((currentPart, index) => {
      let cachedPart = cachedAuthorityParts[index];
      if (index === 0 && this.canReplaceTenant(cachedAuthorityUrlComponents)) {
        let tenantId = new UrlString(this.metadata.authorization_endpoint).getUrlComponents().PathSegments[0];
        if (cachedPart !== tenantId) {
          this.logger.verbose(`Replacing tenant domain name ${cachedPart} with id ${tenantId}`);
          cachedPart = tenantId;
        }
      }
      if (currentPart !== cachedPart) endpoint = endpoint.replace(`/${cachedPart}/`, `/${currentPart}/`);
    });
    return this.replaceTenant(endpoint);
  }
  get defaultOpenIdConfigurationEndpoint() {
    let canonicalAuthorityHost = this.hostnameAndPort;
    if (
      this.canonicalAuthority.endsWith("v2.0/") ||
      this.authorityType === AuthorityType.Adfs ||
      (this.protocolMode === ProtocolMode.OIDC &&
        !this.isAliasOfKnownMicrosoftAuthority(canonicalAuthorityHost))
    )
      return `${this.canonicalAuthority}.well-known/openid-configuration`;
    return `${this.canonicalAuthority}v2.0/.well-known/openid-configuration`;
  }
  discoveryComplete() {
    return !!this.metadata;
  }
  async resolveEndpointsAsync() {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthorityResolveEndpointsAsync,
      this.correlationId,
    );
    let metadataEntity = this.getCurrentMetadataEntity();
    let cloudDiscoverySource = await invokeAsync(
      this.updateCloudDiscoveryMetadata.bind(this),
      PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata,
      this.logger,
      this.performanceClient,
      this.correlationId,
    )(metadataEntity);
    this.canonicalAuthority = this.canonicalAuthority.replace(
      this.hostnameAndPort,
      metadataEntity.preferred_network,
    );
    let endpointSource = await invokeAsync(
      this.updateEndpointMetadata.bind(this),
      PerformanceEvents.AuthorityUpdateEndpointMetadata,
      this.logger,
      this.performanceClient,
      this.correlationId,
    )(metadataEntity);
    this.updateCachedMetadata(metadataEntity, cloudDiscoverySource, {
      source: endpointSource,
    });
    this.performanceClient?.addFields(
      {
        cloudDiscoverySource,
        authorityEndpointSource: endpointSource,
      },
      this.correlationId,
    );
  }
  getCurrentMetadataEntity() {
    let metadataEntity = this.cacheManager.getAuthorityMetadataByAlias(this.hostnameAndPort);
    if (!metadataEntity)
      metadataEntity = {
        aliases: [],
        preferred_cache: this.hostnameAndPort,
        preferred_network: this.hostnameAndPort,
        canonical_authority: this.canonicalAuthority,
        authorization_endpoint: "",
        token_endpoint: "",
        end_session_endpoint: "",
        issuer: "",
        aliasesFromNetwork: false,
        endpointsFromNetwork: false,
        expiresAt: generateAuthorityMetadataExpiresAt(),
        jwks_uri: "",
      };
    return metadataEntity;
  }
  updateCachedMetadata(metadataEntity, cloudDiscoverySource, endpointMetadataResult) {
    if (
      cloudDiscoverySource !== AuthorityMetadataSource.CACHE &&
      endpointMetadataResult?.source !== AuthorityMetadataSource.CACHE
    ) {
      metadataEntity.expiresAt = generateAuthorityMetadataExpiresAt();
      metadataEntity.canonical_authority = this.canonicalAuthority;
    }
    let cacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(metadataEntity.preferred_cache);
    this.cacheManager.setAuthorityMetadata(cacheKey, metadataEntity);
    this.metadata = metadataEntity;
  }
  async updateEndpointMetadata(metadataEntity) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthorityUpdateEndpointMetadata,
      this.correlationId,
    );
    let localMetadata = this.updateEndpointMetadataFromLocalSources(metadataEntity);
    if (localMetadata) {
      if (localMetadata.source === AuthorityMetadataSource.HARDCODED_VALUES) {
        if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
          if (localMetadata.metadata) {
            let hardcodedMetadata = await invokeAsync(
              this.updateMetadataWithRegionalInformation.bind(this),
              PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
              this.logger,
              this.performanceClient,
              this.correlationId,
            )(localMetadata.metadata);
            updateAuthorityEndpointMetadata(metadataEntity, hardcodedMetadata, false);
            metadataEntity.canonical_authority = this.canonicalAuthority;
          }
        }
      }
      return localMetadata.source;
    }
    let metadata = await invokeAsync(
      this.getEndpointMetadataFromNetwork.bind(this),
      PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork,
      this.logger,
      this.performanceClient,
      this.correlationId,
    )();
    if (metadata) {
      if (this.authorityOptions.azureRegionConfiguration?.azureRegion)
        metadata = await invokeAsync(
          this.updateMetadataWithRegionalInformation.bind(this),
          PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
          this.logger,
          this.performanceClient,
          this.correlationId,
        )(metadata);
      updateAuthorityEndpointMetadata(metadataEntity, metadata, true);
      return AuthorityMetadataSource.NETWORK;
    } else throw createClientAuthError(openIdConfigError, this.defaultOpenIdConfigurationEndpoint);
  }
  updateEndpointMetadataFromLocalSources(metadataEntity) {
    this.logger.verbose("Attempting to get endpoint metadata from authority configuration");
    let configMetadata = this.getEndpointMetadataFromConfig();
    if (configMetadata) {
      this.logger.verbose("Found endpoint metadata in authority configuration");
      updateAuthorityEndpointMetadata(metadataEntity, configMetadata, false);
      return {
        source: AuthorityMetadataSource.CONFIG,
      };
    }
    this.logger.verbose(
      "Did not find endpoint metadata in the config... Attempting to get endpoint metadata from the hardcoded values.",
    );
    if (this.authorityOptions.skipAuthorityMetadataCache)
      this.logger.verbose(
        "Skipping hardcoded metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get endpoint metadata from the network metadata cache.",
      );
    else {
      let hardcodedMetadata = this.getEndpointMetadataFromHardcodedValues();
      if (hardcodedMetadata) {
        updateAuthorityEndpointMetadata(metadataEntity, hardcodedMetadata, false);
        return {
          source: AuthorityMetadataSource.HARDCODED_VALUES,
          metadata: hardcodedMetadata,
        };
      } else
        this.logger.verbose(
          "Did not find endpoint metadata in hardcoded values... Attempting to get endpoint metadata from the network metadata cache.",
        );
    }
    let metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
    if (
      this.isAuthoritySameType(metadataEntity) &&
      metadataEntity.endpointsFromNetwork &&
      !metadataEntityExpired
    ) {
      this.logger.verbose("Found endpoint metadata in the cache.");
      return {
        source: AuthorityMetadataSource.CACHE,
      };
    } else if (metadataEntityExpired) this.logger.verbose("The metadata entity is expired.");
    return null;
  }
  isAuthoritySameType(metadataEntity) {
    return (
      new UrlString(metadataEntity.canonical_authority).getUrlComponents().PathSegments.length ===
      this.canonicalAuthorityUrlComponents.PathSegments.length
    );
  }
  getEndpointMetadataFromConfig() {
    if (this.authorityOptions.authorityMetadata)
      try {
        return JSON.parse(this.authorityOptions.authorityMetadata);
      } catch (error) {
        throw createClientConfigurationError(invalidAuthorityMetadata);
      }
    return null;
  }
  async getEndpointMetadataFromNetwork() {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthorityGetEndpointMetadataFromNetwork,
      this.correlationId,
    );
    let e = {};
    let openIdConfigurationEndpoint = this.defaultOpenIdConfigurationEndpoint;
    this.logger.verbose(
      `Authority.getEndpointMetadataFromNetwork: attempting to retrieve OAuth endpoints from ${openIdConfigurationEndpoint}`,
    );
    try {
      let response = await this.networkInterface.sendGetRequestAsync(openIdConfigurationEndpoint, e);
      if (isOpenIdConfigResponse(response.body)) return response.body;
      else {
        this.logger.verbose(
          "Authority.getEndpointMetadataFromNetwork: could not parse response as OpenID configuration",
        );
        return null;
      }
    } catch (e) {
      this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: ${e}`);
      return null;
    }
  }
  getEndpointMetadataFromHardcodedValues() {
    if (this.hostnameAndPort in EndpointMetadata) return EndpointMetadata[this.hostnameAndPort];
    return null;
  }
  async updateMetadataWithRegionalInformation(metadata) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthorityUpdateMetadataWithRegionalInformation,
      this.correlationId,
    );
    let userConfiguredAzureRegion = this.authorityOptions.azureRegionConfiguration?.azureRegion;
    if (userConfiguredAzureRegion) {
      if (userConfiguredAzureRegion !== Constants.AZURE_REGION_AUTO_DISCOVER_FLAG) {
        this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.CONFIGURED_NO_AUTO_DETECTION;
        this.regionDiscoveryMetadata.region_used = userConfiguredAzureRegion;
        return Authority.replaceWithRegionalInformation(metadata, userConfiguredAzureRegion);
      }
      let autodetectedRegionName = await invokeAsync(
        this.regionDiscovery.detectRegion.bind(this.regionDiscovery),
        PerformanceEvents.RegionDiscoveryDetectRegion,
        this.logger,
        this.performanceClient,
        this.correlationId,
      )(this.authorityOptions.azureRegionConfiguration?.environmentRegion, this.regionDiscoveryMetadata);
      if (autodetectedRegionName) {
        this.regionDiscoveryMetadata.region_outcome =
          RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_SUCCESSFUL;
        this.regionDiscoveryMetadata.region_used = autodetectedRegionName;
        return Authority.replaceWithRegionalInformation(metadata, autodetectedRegionName);
      }
      this.regionDiscoveryMetadata.region_outcome = RegionDiscoveryOutcomes.AUTO_DETECTION_REQUESTED_FAILED;
    }
    return metadata;
  }
  async updateCloudDiscoveryMetadata(metadataEntity) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthorityUpdateCloudDiscoveryMetadata,
      this.correlationId,
    );
    let localMetadataSource = this.updateCloudDiscoveryMetadataFromLocalSources(metadataEntity);
    if (localMetadataSource) return localMetadataSource;
    let metadata = await invokeAsync(
      this.getCloudDiscoveryMetadataFromNetwork.bind(this),
      PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork,
      this.logger,
      this.performanceClient,
      this.correlationId,
    )();
    if (metadata) {
      updateCloudDiscoveryMetadata(metadataEntity, metadata, true);
      return AuthorityMetadataSource.NETWORK;
    }
    throw createClientConfigurationError(untrustedAuthority);
  }
  updateCloudDiscoveryMetadataFromLocalSources(metadataEntity) {
    this.logger.verbose("Attempting to get cloud discovery metadata  from authority configuration");
    this.logger.verbosePii(
      `Known Authorities: ${this.authorityOptions.knownAuthorities || Constants.NOT_APPLICABLE}`,
    );
    this.logger.verbosePii(
      `Authority Metadata: ${this.authorityOptions.authorityMetadata || Constants.NOT_APPLICABLE}`,
    );
    this.logger.verbosePii(
      `Canonical Authority: ${metadataEntity.canonical_authority || Constants.NOT_APPLICABLE}`,
    );
    let metadata = this.getCloudDiscoveryMetadataFromConfig();
    if (metadata) {
      this.logger.verbose("Found cloud discovery metadata in authority configuration");
      updateCloudDiscoveryMetadata(metadataEntity, metadata, false);
      return AuthorityMetadataSource.CONFIG;
    }
    this.logger.verbose(
      "Did not find cloud discovery metadata in the config... Attempting to get cloud discovery metadata from the hardcoded values.",
    );
    if (this.options.skipAuthorityMetadataCache)
      this.logger.verbose(
        "Skipping hardcoded cloud discovery metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get cloud discovery metadata from the network metadata cache.",
      );
    else {
      let hardcodedMetadata = getCloudDiscoveryMetadataFromHardcodedValues(this.hostnameAndPort);
      if (hardcodedMetadata) {
        this.logger.verbose("Found cloud discovery metadata from hardcoded values.");
        updateCloudDiscoveryMetadata(metadataEntity, hardcodedMetadata, false);
        return AuthorityMetadataSource.HARDCODED_VALUES;
      }
      this.logger.verbose(
        "Did not find cloud discovery metadata in hardcoded values... Attempting to get cloud discovery metadata from the network metadata cache.",
      );
    }
    let metadataEntityExpired = isAuthorityMetadataExpired(metadataEntity);
    if (
      this.isAuthoritySameType(metadataEntity) &&
      metadataEntity.aliasesFromNetwork &&
      !metadataEntityExpired
    ) {
      this.logger.verbose("Found cloud discovery metadata in the cache.");
      return AuthorityMetadataSource.CACHE;
    } else if (metadataEntityExpired) this.logger.verbose("The metadata entity is expired.");
    return null;
  }
  getCloudDiscoveryMetadataFromConfig() {
    if (this.authorityType === AuthorityType.Ciam) {
      this.logger.verbose(
        "CIAM authorities do not support cloud discovery metadata, generate the aliases from authority host.",
      );
      return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
    }
    if (this.authorityOptions.cloudDiscoveryMetadata) {
      this.logger.verbose(
        "The cloud discovery metadata has been provided as a network response, in the config.",
      );
      try {
        this.logger.verbose("Attempting to parse the cloud discovery metadata.");
        let parsedResponse = JSON.parse(this.authorityOptions.cloudDiscoveryMetadata);
        let metadata = getCloudDiscoveryMetadataFromNetworkResponse(
          parsedResponse.metadata,
          this.hostnameAndPort,
        );
        this.logger.verbose("Parsed the cloud discovery metadata.");
        if (metadata) {
          this.logger.verbose(
            "There is returnable metadata attached to the parsed cloud discovery metadata.",
          );
          return metadata;
        } else this.logger.verbose("There is no metadata attached to the parsed cloud discovery metadata.");
      } catch (error) {
        this.logger.verbose(
          "Unable to parse the cloud discovery metadata. Throwing Invalid Cloud Discovery Metadata Error.",
        );
        throw createClientConfigurationError(invalidCloudDiscoveryMetadata);
      }
    }
    if (this.isInKnownAuthorities()) {
      this.logger.verbose(
        "The host is included in knownAuthorities. Creating new cloud discovery metadata from the host.",
      );
      return Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
    }
    return null;
  }
  async getCloudDiscoveryMetadataFromNetwork() {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthorityGetCloudDiscoveryMetadataFromNetwork,
      this.correlationId,
    );
    let instanceDiscoveryEndpoint = `${Constants.AAD_INSTANCE_DISCOVERY_ENDPT}${this.canonicalAuthority}oauth2/v2.0/authorize`;
    let options = {};
    let match = null;
    try {
      let response = await this.networkInterface.sendGetRequestAsync(instanceDiscoveryEndpoint, options);
      let typedResponseBody;
      let metadata;
      if (isCloudInstanceDiscoveryResponse(response.body)) {
        typedResponseBody = response.body;
        metadata = typedResponseBody.metadata;
        this.logger.verbosePii(
          `tenant_discovery_endpoint is: ${typedResponseBody.tenant_discovery_endpoint}`,
        );
      } else if (isCloudInstanceDiscoveryErrorResponse(response.body)) {
        this.logger.warning(
          `A CloudInstanceDiscoveryErrorResponse was returned. The cloud instance discovery network request's status code is: ${response.status}`,
        );
        typedResponseBody = response.body;
        if (typedResponseBody.error === Constants.INVALID_INSTANCE) {
          this.logger.error("The CloudInstanceDiscoveryErrorResponse error is invalid_instance.");
          return null;
        }
        this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error is ${typedResponseBody.error}`);
        this.logger.warning(
          `The CloudInstanceDiscoveryErrorResponse error description is ${typedResponseBody.error_description}`,
        );
        this.logger.warning(
          "Setting the value of the CloudInstanceDiscoveryMetadata (returned from the network) to []",
        );
        metadata = [];
      } else {
        this.logger.error(
          "AAD did not return a CloudInstanceDiscoveryResponse or CloudInstanceDiscoveryErrorResponse",
        );
        return null;
      }
      this.logger.verbose(
        "Attempting to find a match between the developer's authority and the CloudInstanceDiscoveryMetadata returned from the network request.",
      );
      match = getCloudDiscoveryMetadataFromNetworkResponse(metadata, this.hostnameAndPort);
    } catch (error) {
      if (error instanceof AuthError)
        this.logger
          .error(`There was a network error while attempting to get the cloud discovery instance metadata.
Error: ${error.errorCode}
Error Description: ${error.errorMessage}`);
      else {
        let typedError = error;
        this.logger
          .error(`A non-MSALJS error was thrown while attempting to get the cloud instance discovery metadata.
Error: ${typedError.name}
Error Description: ${typedError.message}`);
      }
      return null;
    }
    if (!match) {
      this.logger.warning(
        "The developer's authority was not found within the CloudInstanceDiscoveryMetadata returned from the network request.",
      );
      this.logger.verbose("Creating custom Authority for custom domain scenario.");
      match = Authority.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort);
    }
    return match;
  }
  isInKnownAuthorities() {
    return (
      this.authorityOptions.knownAuthorities.filter(
        (authority) =>
          authority && UrlString.getDomainFromUrl(authority).toLowerCase() === this.hostnameAndPort,
      ).length > 0
    );
  }
  static generateAuthority(authorityString, azureCloudOptions) {
    let authorityAzureCloudInstance;
    if (azureCloudOptions && azureCloudOptions.azureCloudInstance !== AzureCloudInstance.None) {
      let tenant = azureCloudOptions.tenant ? azureCloudOptions.tenant : Constants.DEFAULT_COMMON_TENANT;
      authorityAzureCloudInstance = `${azureCloudOptions.azureCloudInstance}/${tenant}/`;
    }
    return authorityAzureCloudInstance ? authorityAzureCloudInstance : authorityString;
  }
  static createCloudDiscoveryMetadataFromHost(host) {
    return {
      preferred_network: host,
      preferred_cache: host,
      aliases: [host],
    };
  }
  getPreferredCache() {
    if (this.managedIdentity) return Constants.DEFAULT_AUTHORITY_HOST;
    else if (this.discoveryComplete()) return this.metadata.preferred_cache;
    else throw createClientAuthError(endpointResolutionError);
  }
  isAlias(host) {
    return this.metadata.aliases.indexOf(host) > -1;
  }
  isAliasOfKnownMicrosoftAuthority(host) {
    return InstanceDiscoveryMetadataAliases.has(host);
  }
  static isPublicCloudAuthority(host) {
    return Constants.KNOWN_PUBLIC_CLOUDS.indexOf(host) >= 0;
  }
  static buildRegionalAuthorityString(host, region, queryString) {
    let authorityUrlInstance = new UrlString(host);
    authorityUrlInstance.validateAsUri();
    let authorityUrlParts = authorityUrlInstance.getUrlComponents();
    let hostNameAndPort = `${region}.${authorityUrlParts.HostNameAndPort}`;
    if (this.isPublicCloudAuthority(authorityUrlParts.HostNameAndPort))
      hostNameAndPort = `${region}.${Constants.REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX}`;
    let url = UrlString.constructAuthorityUriFromObject({
      ...authorityUrlInstance.getUrlComponents(),
      HostNameAndPort: hostNameAndPort,
    }).urlString;
    if (queryString) return `${url}?${queryString}`;
    return url;
  }
  static replaceWithRegionalInformation(metadata, azureRegion) {
    let regionalMetadata = {
      ...metadata,
    };
    regionalMetadata.authorization_endpoint = Authority.buildRegionalAuthorityString(
      regionalMetadata.authorization_endpoint,
      azureRegion,
    );
    regionalMetadata.token_endpoint = Authority.buildRegionalAuthorityString(
      regionalMetadata.token_endpoint,
      azureRegion,
    );
    if (regionalMetadata.end_session_endpoint)
      regionalMetadata.end_session_endpoint = Authority.buildRegionalAuthorityString(
        regionalMetadata.end_session_endpoint,
        azureRegion,
      );
    return regionalMetadata;
  }
  static transformCIAMAuthority(authority) {
    let ciamAuthority = authority;
    let authorityUrlComponents = new UrlString(authority).getUrlComponents();
    if (
      authorityUrlComponents.PathSegments.length === 0 &&
      authorityUrlComponents.HostNameAndPort.endsWith(Constants.CIAM_AUTH_URL)
    ) {
      let tenantIdOrDomain = authorityUrlComponents.HostNameAndPort.split(".")[0];
      ciamAuthority = `${ciamAuthority}${tenantIdOrDomain}${Constants.AAD_TENANT_DOMAIN_SUFFIX}`;
    }
    return ciamAuthority;
  }
}
//@ chunk-mrx6y2r5.js:175430-175530 esm-fingerprint
Authority.reservedTenantDomains = new Set([
  "{tenant}",
  "{tenantid}",
  AADAuthorityConstants.COMMON,
  AADAuthorityConstants.CONSUMERS,
  AADAuthorityConstants.ORGANIZATIONS,
]);
//@ chunk-mrx6y2r5.js:175530-175710 esm-fingerprint
function getTenantFromAuthorityString(authority) {
  let tenantId = new UrlString(authority).getUrlComponents().PathSegments.slice(-1)[0]?.toLowerCase();
  switch (tenantId) {
    case AADAuthorityConstants.COMMON:
    case AADAuthorityConstants.ORGANIZATIONS:
    case AADAuthorityConstants.CONSUMERS:
      return;
    default:
      return tenantId;
  }
}
//@ chunk-mrx6y2r5.js:175710-175787 esm-fingerprint
function formatAuthorityUri(authorityUri) {
  return authorityUri.endsWith(Constants.FORWARD_SLASH)
    ? authorityUri
    : `${authorityUri}${Constants.FORWARD_SLASH}`;
}
//@ chunk-mrx6y2r5.js:175787-176011 esm-fingerprint
function buildStaticAuthorityOptions(authOptions) {
  let rawCloudDiscoveryMetadata = authOptions.cloudDiscoveryMetadata;
  let cloudDiscoveryMetadata = undefined;
  if (rawCloudDiscoveryMetadata)
    try {
      cloudDiscoveryMetadata = JSON.parse(rawCloudDiscoveryMetadata);
    } catch (e) {
      throw createClientConfigurationError(invalidCloudDiscoveryMetadata);
    }
  return {
    canonicalAuthority: authOptions.authority ? formatAuthorityUri(authOptions.authority) : undefined,
    knownAuthorities: authOptions.knownAuthorities,
    cloudDiscoveryMetadata,
  };
}
//@ chunk-mrx6y2r5.js:176056-176338 esm-fingerprint
async function createDiscoveredInstance(
  authorityUri,
  networkClient,
  cacheManager,
  authorityOptions,
  logger,
  correlationId,
  performanceClient,
) {
  performanceClient?.addQueueMeasurement(
    PerformanceEvents.AuthorityFactoryCreateDiscoveredInstance,
    correlationId,
  );
  let authorityUriFinal = Authority.transformCIAMAuthority(formatAuthorityUri(authorityUri));
  let acquireTokenAuthority = new Authority(
    authorityUriFinal,
    networkClient,
    cacheManager,
    authorityOptions,
    logger,
    correlationId,
    performanceClient,
  );
  try {
    await invokeAsync(
      acquireTokenAuthority.resolveEndpointsAsync.bind(acquireTokenAuthority),
      PerformanceEvents.AuthorityResolveEndpointsAsync,
      logger,
      performanceClient,
      correlationId,
    )();
    return acquireTokenAuthority;
  } catch (e) {
    throw createClientAuthError(endpointResolutionError);
  }
}
//@ chunk-mrx6y2r5.js:176383-176533 esm-fingerprint
class ServerError extends AuthError {
  constructor(errorCode, errorMessage, subError, errorNo, status) {
    super(errorCode, errorMessage, subError);
    this.name = "ServerError";
    this.errorNo = errorNo;
    this.status = status;
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}
//@ chunk-mrx6y2r5.js:176578-176931 esm-fingerprint
function getRequestThumbprint(clientId, request, homeAccountId) {
  return {
    clientId,
    authority: request.authority,
    scopes: request.scopes,
    homeAccountIdentifier: homeAccountId,
    claims: request.claims,
    authenticationScheme: request.authenticationScheme,
    resourceRequestMethod: request.resourceRequestMethod,
    resourceRequestUri: request.resourceRequestUri,
    shrClaims: request.shrClaims,
    sshKid: request.sshKid,
    embeddedClientId: request.embeddedClientId || request.tokenBodyParameters?.clientId,
  };
}
//@ chunk-mrx6y2r5.js:176976-178174 esm-fingerprint
class ThrottlingUtils {
  static generateThrottlingStorageKey(thumbprint) {
    return `${ThrottlingConstants.THROTTLING_PREFIX}.${JSON.stringify(thumbprint)}`;
  }
  static preProcess(cacheManager, thumbprint, correlationId) {
    let key = ThrottlingUtils.generateThrottlingStorageKey(thumbprint);
    let value = cacheManager.getThrottlingCache(key);
    if (value) {
      if (value.throttleTime < Date.now()) {
        cacheManager.removeItem(key, correlationId);
        return;
      }
      throw new ServerError(
        value.errorCodes?.join(" ") || Constants.EMPTY_STRING,
        value.errorMessage,
        value.subError,
      );
    }
  }
  static postProcess(cacheManager, thumbprint, response, correlationId) {
    if (
      ThrottlingUtils.checkResponseStatus(response) ||
      ThrottlingUtils.checkResponseForRetryAfter(response)
    ) {
      let thumbprintValue = {
        throttleTime: ThrottlingUtils.calculateThrottleTime(
          parseInt(response.headers[HeaderNames.RETRY_AFTER]),
        ),
        error: response.body.error,
        errorCodes: response.body.error_codes,
        errorMessage: response.body.error_description,
        subError: response.body.suberror,
      };
      cacheManager.setThrottlingCache(
        ThrottlingUtils.generateThrottlingStorageKey(thumbprint),
        thumbprintValue,
        correlationId,
      );
    }
  }
  static checkResponseStatus(response) {
    return response.status === 429 || (response.status >= 500 && response.status < 600);
  }
  static checkResponseForRetryAfter(response) {
    if (response.headers)
      return (
        response.headers.hasOwnProperty(HeaderNames.RETRY_AFTER) &&
        (response.status < 200 || response.status >= 300)
      );
    return false;
  }
  static calculateThrottleTime(throttleTime) {
    let time = throttleTime <= 0 ? 0 : throttleTime;
    let currentSeconds = Date.now() / 1000;
    return Math.floor(
      Math.min(
        currentSeconds + (time || ThrottlingConstants.DEFAULT_THROTTLE_TIME_SECONDS),
        currentSeconds + ThrottlingConstants.DEFAULT_MAX_THROTTLE_TIME_SECONDS,
      ) * 1000,
    );
  }
  static removeThrottle(cacheManager, clientId, request, homeAccountIdentifier) {
    let thumbprint = getRequestThumbprint(clientId, request, homeAccountIdentifier);
    let key = this.generateThrottlingStorageKey(thumbprint);
    cacheManager.removeItem(key, request.correlationId);
  }
}
//@ chunk-mrx6y2r5.js:178219-178423 esm-fingerprint
class NetworkError extends AuthError {
  constructor(error, httpStatus, responseHeaders) {
    super(error.errorCode, error.errorMessage, error.subError);
    Object.setPrototypeOf(this, NetworkError.prototype);
    this.name = "NetworkError";
    this.error = error;
    this.httpStatus = httpStatus;
    this.responseHeaders = responseHeaders;
  }
}
//@ chunk-mrx6y2r5.js:178468-180896 esm-fingerprint
class BaseClient {
  constructor(configuration, performanceClient) {
    this.config = buildClientConfiguration(configuration);
    this.logger = new Logger(this.config.loggerOptions, name_2, version_2);
    this.cryptoUtils = this.config.cryptoInterface;
    this.cacheManager = this.config.storageInterface;
    this.networkClient = this.config.networkInterface;
    this.serverTelemetryManager = this.config.serverTelemetryManager;
    this.authority = this.config.authOptions.authority;
    this.performanceClient = performanceClient;
  }
  createTokenRequestHeaders(ccsCred) {
    let headers = {};
    headers[HeaderNames.CONTENT_TYPE] = Constants.URL_FORM_CONTENT_TYPE;
    if (!this.config.systemOptions.preventCorsPreflight && ccsCred)
      switch (ccsCred.type) {
        case CcsCredentialType.HOME_ACCOUNT_ID:
          try {
            let clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
            headers[HeaderNames.CCS_HEADER] = `Oid:${clientInfo.uid}@${clientInfo.utid}`;
          } catch (e) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + e);
          }
          break;
        case CcsCredentialType.UPN:
          headers[HeaderNames.CCS_HEADER] = `UPN: ${ccsCred.credential}`;
          break;
      }
    return headers;
  }
  async executePostToTokenEndpoint(
    tokenEndpoint,
    queryString,
    headers,
    thumbprint,
    correlationId,
    queuedEvent,
  ) {
    if (queuedEvent) this.performanceClient?.addQueueMeasurement(queuedEvent, correlationId);
    let response = await this.sendPostRequest(
      thumbprint,
      tokenEndpoint,
      {
        body: queryString,
        headers,
      },
      correlationId,
    );
    if (this.config.serverTelemetryManager && response.status < 500 && response.status !== 429)
      this.config.serverTelemetryManager.clearTelemetryCache();
    return response;
  }
  async sendPostRequest(thumbprint, tokenEndpoint, options, correlationId) {
    ThrottlingUtils.preProcess(this.cacheManager, thumbprint, correlationId);
    let response;
    try {
      response = await invokeAsync(
        this.networkClient.sendPostRequestAsync.bind(this.networkClient),
        PerformanceEvents.NetworkClientSendPostRequestAsync,
        this.logger,
        this.performanceClient,
        correlationId,
      )(tokenEndpoint, options);
      let responseHeaders = response.headers || {};
      this.performanceClient?.addFields(
        {
          refreshTokenSize: response.body.refresh_token?.length || 0,
          httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
          requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] || "",
        },
        correlationId,
      );
    } catch (e) {
      if (e instanceof NetworkError) {
        let responseHeaders = e.responseHeaders;
        if (responseHeaders)
          this.performanceClient?.addFields(
            {
              httpVerToken: responseHeaders[HeaderNames.X_MS_HTTP_VERSION] || "",
              requestId: responseHeaders[HeaderNames.X_MS_REQUEST_ID] || "",
              contentTypeHeader: responseHeaders[HeaderNames.CONTENT_TYPE] || undefined,
              contentLengthHeader: responseHeaders[HeaderNames.CONTENT_LENGTH] || undefined,
              httpStatus: e.httpStatus,
            },
            correlationId,
          );
        throw e.error;
      }
      if (e instanceof AuthError) throw e;
      else throw createClientAuthError(networkError);
    }
    ThrottlingUtils.postProcess(this.cacheManager, thumbprint, response, correlationId);
    return response;
  }
  async updateAuthority(cloudInstanceHostname, correlationId) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.UpdateTokenEndpointAuthority,
      correlationId,
    );
    let cloudInstanceAuthorityUri = `https://${cloudInstanceHostname}/${this.authority.tenant}/`;
    let cloudInstanceAuthority = await createDiscoveredInstance(
      cloudInstanceAuthorityUri,
      this.networkClient,
      this.cacheManager,
      this.authority.options,
      this.logger,
      correlationId,
      this.performanceClient,
    );
    this.authority = cloudInstanceAuthority;
  }
  createTokenQueryParameters(request) {
    let parameters = new Map();
    if (request.embeddedClientId)
      addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    if (request.tokenQueryParameters) addExtraQueryParameters(parameters, request.tokenQueryParameters);
    addCorrelationId(parameters, request.correlationId);
    instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
    return mapToQueryString(parameters);
  }
}
//@ chunk-mrx6y2r5.js:180941-181128 esm-fingerprint
var noTokensFound = "no_tokens_found";
var nativeAccountUnavailable = "native_account_unavailable";
var refreshTokenExpired = "refresh_token_expired";
var uxNotAllowed = "ux_not_allowed";
var interactionRequired = "interaction_required";
var consentRequired = "consent_required";
var loginRequired = "login_required";
var badToken = "bad_token";
//@ chunk-mrx6y2r5.js:181173-181955 esm-layout
var InteractionRequiredServerErrorMessage = [
  interactionRequired,
  consentRequired,
  loginRequired,
  badToken,
  uxNotAllowed,
];
var InteractionRequiredAuthSubErrorMessage = [
  "message_only",
  "additional_action",
  "basic_action",
  "user_password_expired",
  "consent_required",
  "bad_token",
];
var InteractionRequiredAuthErrorMessages = {
  [noTokensFound]: "No refresh token found in the cache. Please sign-in.",
  [nativeAccountUnavailable]:
    "The requested account is not available in the native broker. It may have been deleted or logged out. Please sign-in again using an interactive API.",
  [refreshTokenExpired]: "Refresh token has expired.",
  [badToken]:
    "Identity provider returned bad_token due to an expired or invalid refresh token. Please invoke an interactive API to resolve.",
  [uxNotAllowed]:
    "`canShowUI` flag in Edge was set to false. User interaction required on web page. Please invoke an interactive API to resolve.",
};
var InteractionRequiredAuthErrorMessage = {
  noTokensFoundError: {
    code: noTokensFound,
    desc: InteractionRequiredAuthErrorMessages[noTokensFound],
  },
  native_account_unavailable: {
    code: nativeAccountUnavailable,
    desc: InteractionRequiredAuthErrorMessages[nativeAccountUnavailable],
  },
  bad_token: {
    code: badToken,
    desc: InteractionRequiredAuthErrorMessages[badToken],
  },
};
//@ chunk-mrx6y2r5.js:181955-182245 esm-fingerprint
class InteractionRequiredAuthError extends AuthError {
  constructor(errorCode, errorMessage, subError, timestamp, traceId, correlationId, claims, errorNo) {
    super(errorCode, errorMessage, subError);
    Object.setPrototypeOf(this, InteractionRequiredAuthError.prototype);
    this.timestamp = timestamp || Constants.EMPTY_STRING;
    this.traceId = traceId || Constants.EMPTY_STRING;
    this.correlationId = correlationId || Constants.EMPTY_STRING;
    this.claims = claims || Constants.EMPTY_STRING;
    this.name = "InteractionRequiredAuthError";
    this.errorNo = errorNo;
  }
}
//@ chunk-mrx6y2r5.js:182245-182368 esm-fingerprint
function isInteractionRequiredError(errorCode, errorString, subError) {
  let isInteractionRequiredErrorCode =
    !!errorCode && InteractionRequiredServerErrorMessage.indexOf(errorCode) > -1;
  let isInteractionRequiredSubError =
    !!subError && InteractionRequiredAuthSubErrorMessage.indexOf(subError) > -1;
  let isInteractionRequiredErrorDesc =
    !!errorString &&
    InteractionRequiredServerErrorMessage.some((irErrorCode) => errorString.indexOf(irErrorCode) > -1);
  return isInteractionRequiredErrorCode || isInteractionRequiredErrorDesc || isInteractionRequiredSubError;
}
//@ chunk-mrx6y2r5.js:182368-182406 esm-layout
function createInteractionRequiredAuthError(errorCode) {
  return new InteractionRequiredAuthError(errorCode, InteractionRequiredAuthErrorMessages[errorCode]);
}
//@ chunk-mrx6y2r5.js:182451-182997 esm-fingerprint
class ProtocolUtils {
  static setRequestState(cryptoObj, userState, meta) {
    let libraryState = ProtocolUtils.generateLibraryState(cryptoObj, meta);
    return userState ? `${libraryState}${Constants.RESOURCE_DELIM}${userState}` : libraryState;
  }
  static generateLibraryState(cryptoObj, meta) {
    if (!cryptoObj) throw createClientAuthError(noCryptoObject);
    let stateObj = {
      id: cryptoObj.createNewGuid(),
    };
    if (meta) stateObj.meta = meta;
    let stateString = JSON.stringify(stateObj);
    return cryptoObj.base64Encode(stateString);
  }
  static parseRequestState(cryptoObj, state) {
    if (!cryptoObj) throw createClientAuthError(noCryptoObject);
    if (!state) throw createClientAuthError(invalidState);
    try {
      let splitState = state.split(Constants.RESOURCE_DELIM);
      let libraryState = splitState[0];
      let userState =
        splitState.length > 1 ? splitState.slice(1).join(Constants.RESOURCE_DELIM) : Constants.EMPTY_STRING;
      let libraryStateString = cryptoObj.base64Decode(libraryState);
      let libraryStateObj = JSON.parse(libraryStateString);
      return {
        userRequestState: userState || Constants.EMPTY_STRING,
        libraryState: libraryStateObj,
      };
    } catch (e) {
      throw createClientAuthError(invalidState);
    }
  }
}
//@ chunk-mrx6y2r5.js:183042-183059 esm-fingerprint
var KeyLocation = {
  SW: "sw",
};
//@ chunk-mrx6y2r5.js:183059-184065 esm-fingerprint
class PopTokenGenerator {
  constructor(cryptoUtils, performanceClient) {
    this.cryptoUtils = cryptoUtils;
    this.performanceClient = performanceClient;
  }
  async generateCnf(request, logger) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateCnf, request.correlationId);
    let reqCnf = await invokeAsync(
      this.generateKid.bind(this),
      PerformanceEvents.PopTokenGenerateCnf,
      logger,
      this.performanceClient,
      request.correlationId,
    )(request);
    let reqCnfString = this.cryptoUtils.base64UrlEncode(JSON.stringify(reqCnf));
    return {
      kid: reqCnf.kid,
      reqCnfString,
    };
  }
  async generateKid(request) {
    this.performanceClient?.addQueueMeasurement(PerformanceEvents.PopTokenGenerateKid, request.correlationId);
    return {
      kid: await this.cryptoUtils.getPublicKeyThumbprint(request),
      xms_ksl: KeyLocation.SW,
    };
  }
  async signPopToken(accessToken, keyId, request) {
    return this.signPayload(accessToken, keyId, request);
  }
  async signPayload(payload, keyId, request, claims) {
    let { resourceRequestMethod, resourceRequestUri, shrClaims, shrNonce, shrOptions } = request;
    let resourceUrlComponents = (
      resourceRequestUri ? new UrlString(resourceRequestUri) : undefined
    )?.getUrlComponents();
    return this.cryptoUtils.signJwt(
      {
        at: payload,
        ts: nowSeconds(),
        m: resourceRequestMethod?.toUpperCase(),
        u: resourceUrlComponents?.HostNameAndPort,
        nonce: shrNonce || this.cryptoUtils.createNewGuid(),
        p: resourceUrlComponents?.AbsolutePath,
        q: resourceUrlComponents?.QueryString ? [[], resourceUrlComponents.QueryString] : undefined,
        client_claims: shrClaims || undefined,
        ...claims,
      },
      keyId,
      shrOptions,
      request.correlationId,
    );
  }
}
//@ chunk-mrx6y2r5.js:184110-184248 esm-fingerprint
class TokenCacheContext {
  constructor(tokenCache, hasChanged) {
    this.cache = tokenCache;
    this.hasChanged = hasChanged;
  }
  get cacheHasChanged() {
    return this.hasChanged;
  }
  get tokenCache() {
    return this.cache;
  }
}
//@ chunk-mrx6y2r5.js:184293-189654 esm-fingerprint
class ResponseHandler {
  constructor(
    clientId,
    cacheStorage,
    cryptoObj,
    logger,
    serializableCache,
    persistencePlugin,
    performanceClient,
  ) {
    this.clientId = clientId;
    this.cacheStorage = cacheStorage;
    this.cryptoObj = cryptoObj;
    this.logger = logger;
    this.serializableCache = serializableCache;
    this.persistencePlugin = persistencePlugin;
    this.performanceClient = performanceClient;
  }
  validateTokenResponse(serverResponse, refreshAccessToken) {
    if (serverResponse.error || serverResponse.error_description || serverResponse.suberror) {
      let errString = `Error(s): ${serverResponse.error_codes || Constants.NOT_AVAILABLE} - Timestamp: ${serverResponse.timestamp || Constants.NOT_AVAILABLE} - Description: ${serverResponse.error_description || Constants.NOT_AVAILABLE} - Correlation ID: ${serverResponse.correlation_id || Constants.NOT_AVAILABLE} - Trace ID: ${serverResponse.trace_id || Constants.NOT_AVAILABLE}`;
      let serverErrorNo = serverResponse.error_codes?.length ? serverResponse.error_codes[0] : undefined;
      let serverError = new ServerError(
        serverResponse.error,
        errString,
        serverResponse.suberror,
        serverErrorNo,
        serverResponse.status,
      );
      if (
        refreshAccessToken &&
        serverResponse.status &&
        serverResponse.status >= HttpStatus.SERVER_ERROR_RANGE_START &&
        serverResponse.status <= HttpStatus.SERVER_ERROR_RANGE_END
      ) {
        this.logger
          .warning(`executeTokenRequest:validateTokenResponse - AAD is currently unavailable and the access token is unable to be refreshed.
${serverError}`);
        return;
      } else if (
        refreshAccessToken &&
        serverResponse.status &&
        serverResponse.status >= HttpStatus.CLIENT_ERROR_RANGE_START &&
        serverResponse.status <= HttpStatus.CLIENT_ERROR_RANGE_END
      ) {
        this.logger
          .warning(`executeTokenRequest:validateTokenResponse - AAD is currently available but is unable to refresh the access token.
${serverError}`);
        return;
      }
      if (
        isInteractionRequiredError(
          serverResponse.error,
          serverResponse.error_description,
          serverResponse.suberror,
        )
      )
        throw new InteractionRequiredAuthError(
          serverResponse.error,
          serverResponse.error_description,
          serverResponse.suberror,
          serverResponse.timestamp || Constants.EMPTY_STRING,
          serverResponse.trace_id || Constants.EMPTY_STRING,
          serverResponse.correlation_id || Constants.EMPTY_STRING,
          serverResponse.claims || Constants.EMPTY_STRING,
          serverErrorNo,
        );
      throw serverError;
    }
  }
  async handleServerTokenResponse(
    serverTokenResponse,
    authority,
    reqTimestamp,
    request,
    authCodePayload,
    userAssertionHash,
    handlingRefreshTokenResponse,
    forceCacheRefreshTokenResponse,
    serverRequestId,
  ) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.HandleServerTokenResponse,
      serverTokenResponse.correlation_id,
    );
    let idTokenClaims;
    if (serverTokenResponse.id_token) {
      idTokenClaims = extractTokenClaims(
        serverTokenResponse.id_token || Constants.EMPTY_STRING,
        this.cryptoObj.base64Decode,
      );
      if (authCodePayload && authCodePayload.nonce) {
        if (idTokenClaims.nonce !== authCodePayload.nonce) throw createClientAuthError(nonceMismatch);
      }
      if (request.maxAge || request.maxAge === 0) {
        let authTime = idTokenClaims.auth_time;
        if (!authTime) throw createClientAuthError(authTimeNotFound);
        checkMaxAge(authTime, request.maxAge);
      }
    }
    this.homeAccountIdentifier = AccountEntity.generateHomeAccountId(
      serverTokenResponse.client_info || Constants.EMPTY_STRING,
      authority.authorityType,
      this.logger,
      this.cryptoObj,
      idTokenClaims,
    );
    let requestStateObj;
    if (!!authCodePayload && !!authCodePayload.state)
      requestStateObj = ProtocolUtils.parseRequestState(this.cryptoObj, authCodePayload.state);
    serverTokenResponse.key_id = serverTokenResponse.key_id || request.sshKid || undefined;
    let cacheRecord = this.generateCacheRecord(
      serverTokenResponse,
      authority,
      reqTimestamp,
      request,
      idTokenClaims,
      userAssertionHash,
      authCodePayload,
    );
    let cacheContext;
    try {
      if (this.persistencePlugin && this.serializableCache) {
        this.logger.verbose("Persistence enabled, calling beforeCacheAccess");
        cacheContext = new TokenCacheContext(this.serializableCache, true);
        await this.persistencePlugin.beforeCacheAccess(cacheContext);
      }
      if (handlingRefreshTokenResponse && !forceCacheRefreshTokenResponse && cacheRecord.account) {
        let key = this.cacheStorage.generateAccountKey(AccountEntity.getAccountInfo(cacheRecord.account));
        if (!this.cacheStorage.getAccount(key, request.correlationId)) {
          this.logger.warning(
            "Account used to refresh tokens not in persistence, refreshed tokens will not be stored in the cache",
          );
          return await ResponseHandler.generateAuthenticationResult(
            this.cryptoObj,
            authority,
            cacheRecord,
            false,
            request,
            idTokenClaims,
            requestStateObj,
            undefined,
            serverRequestId,
          );
        }
      }
      await this.cacheStorage.saveCacheRecord(
        cacheRecord,
        request.correlationId,
        isKmsi(idTokenClaims || {}),
        request.storeInCache,
      );
    } finally {
      if (this.persistencePlugin && this.serializableCache && cacheContext) {
        this.logger.verbose("Persistence enabled, calling afterCacheAccess");
        await this.persistencePlugin.afterCacheAccess(cacheContext);
      }
    }
    return ResponseHandler.generateAuthenticationResult(
      this.cryptoObj,
      authority,
      cacheRecord,
      false,
      request,
      idTokenClaims,
      requestStateObj,
      serverTokenResponse,
      serverRequestId,
    );
  }
  generateCacheRecord(
    serverTokenResponse,
    authority,
    reqTimestamp,
    request,
    idTokenClaims,
    userAssertionHash,
    authCodePayload,
  ) {
    let env = authority.getPreferredCache();
    if (!env) throw createClientAuthError(invalidCacheEnvironment);
    let claimsTenantId = getTenantIdFromIdTokenClaims(idTokenClaims);
    let cachedIdToken;
    let cachedAccount;
    if (serverTokenResponse.id_token && !!idTokenClaims) {
      cachedIdToken = createIdTokenEntity(
        this.homeAccountIdentifier,
        env,
        serverTokenResponse.id_token,
        this.clientId,
        claimsTenantId || "",
      );
      cachedAccount = buildAccountToCache(
        this.cacheStorage,
        authority,
        this.homeAccountIdentifier,
        this.cryptoObj.base64Decode,
        request.correlationId,
        idTokenClaims,
        serverTokenResponse.client_info,
        env,
        claimsTenantId,
        authCodePayload,
        undefined,
        this.logger,
      );
    }
    let cachedAccessToken = null;
    if (serverTokenResponse.access_token) {
      let responseScopes = serverTokenResponse.scope
        ? ScopeSet.fromString(serverTokenResponse.scope)
        : new ScopeSet(request.scopes || []);
      let expiresIn =
        (typeof serverTokenResponse.expires_in === "string"
          ? parseInt(serverTokenResponse.expires_in, 10)
          : serverTokenResponse.expires_in) || 0;
      let extExpiresIn =
        (typeof serverTokenResponse.ext_expires_in === "string"
          ? parseInt(serverTokenResponse.ext_expires_in, 10)
          : serverTokenResponse.ext_expires_in) || 0;
      let refreshIn =
        (typeof serverTokenResponse.refresh_in === "string"
          ? parseInt(serverTokenResponse.refresh_in, 10)
          : serverTokenResponse.refresh_in) || undefined;
      let tokenExpirationSeconds = reqTimestamp + expiresIn;
      let extendedTokenExpirationSeconds = tokenExpirationSeconds + extExpiresIn;
      let refreshOnSeconds = refreshIn && refreshIn > 0 ? reqTimestamp + refreshIn : undefined;
      cachedAccessToken = createAccessTokenEntity(
        this.homeAccountIdentifier,
        env,
        serverTokenResponse.access_token,
        this.clientId,
        claimsTenantId || authority.tenant || "",
        responseScopes.printScopes(),
        tokenExpirationSeconds,
        extendedTokenExpirationSeconds,
        this.cryptoObj.base64Decode,
        refreshOnSeconds,
        serverTokenResponse.token_type,
        userAssertionHash,
        serverTokenResponse.key_id,
        request.claims,
        request.requestedClaimsHash,
      );
    }
    let cachedRefreshToken = null;
    if (serverTokenResponse.refresh_token) {
      let rtExpiresOn;
      if (serverTokenResponse.refresh_token_expires_in) {
        let rtExpiresIn =
          typeof serverTokenResponse.refresh_token_expires_in === "string"
            ? parseInt(serverTokenResponse.refresh_token_expires_in, 10)
            : serverTokenResponse.refresh_token_expires_in;
        rtExpiresOn = reqTimestamp + rtExpiresIn;
      }
      cachedRefreshToken = createRefreshTokenEntity(
        this.homeAccountIdentifier,
        env,
        serverTokenResponse.refresh_token,
        this.clientId,
        serverTokenResponse.foci,
        userAssertionHash,
        rtExpiresOn,
      );
    }
    let cachedAppMetadata = null;
    if (serverTokenResponse.foci)
      cachedAppMetadata = {
        clientId: this.clientId,
        environment: env,
        familyId: serverTokenResponse.foci,
      };
    return {
      account: cachedAccount,
      idToken: cachedIdToken,
      accessToken: cachedAccessToken,
      refreshToken: cachedRefreshToken,
      appMetadata: cachedAppMetadata,
    };
  }
  static async generateAuthenticationResult(
    cryptoObj,
    authority,
    cacheRecord,
    fromTokenCache,
    request,
    idTokenClaims,
    requestState,
    serverTokenResponse,
    requestId,
  ) {
    let accessToken = Constants.EMPTY_STRING;
    let responseScopes = [];
    let expiresOn = null;
    let extExpiresOn;
    let refreshOn;
    let familyId = Constants.EMPTY_STRING;
    if (cacheRecord.accessToken) {
      if (cacheRecord.accessToken.tokenType === AuthenticationScheme.POP && !request.popKid) {
        let popTokenGenerator = new PopTokenGenerator(cryptoObj);
        let { secret, keyId } = cacheRecord.accessToken;
        if (!keyId) throw createClientAuthError(keyIdMissing);
        accessToken = await popTokenGenerator.signPopToken(secret, keyId, request);
      } else accessToken = cacheRecord.accessToken.secret;
      responseScopes = ScopeSet.fromString(cacheRecord.accessToken.target).asArray();
      expiresOn = toDateFromSeconds(cacheRecord.accessToken.expiresOn);
      extExpiresOn = toDateFromSeconds(cacheRecord.accessToken.extendedExpiresOn);
      if (cacheRecord.accessToken.refreshOn) refreshOn = toDateFromSeconds(cacheRecord.accessToken.refreshOn);
    }
    if (cacheRecord.appMetadata)
      familyId = cacheRecord.appMetadata.familyId === THE_FAMILY_ID ? THE_FAMILY_ID : "";
    let uid = idTokenClaims?.oid || idTokenClaims?.sub || "";
    let tid = idTokenClaims?.tid || "";
    if (serverTokenResponse?.spa_accountid && !!cacheRecord.account)
      cacheRecord.account.nativeAccountId = serverTokenResponse?.spa_accountid;
    let accountInfo = cacheRecord.account
      ? updateAccountTenantProfileData(
          AccountEntity.getAccountInfo(cacheRecord.account),
          undefined,
          idTokenClaims,
          cacheRecord.idToken?.secret,
        )
      : null;
    return {
      authority: authority.canonicalAuthority,
      uniqueId: uid,
      tenantId: tid,
      scopes: responseScopes,
      account: accountInfo,
      idToken: cacheRecord?.idToken?.secret || "",
      idTokenClaims: idTokenClaims || {},
      accessToken,
      fromCache: fromTokenCache,
      expiresOn,
      extExpiresOn,
      refreshOn,
      correlationId: request.correlationId,
      requestId: requestId || Constants.EMPTY_STRING,
      familyId,
      tokenType: cacheRecord.accessToken?.tokenType || Constants.EMPTY_STRING,
      state: requestState ? requestState.userRequestState : Constants.EMPTY_STRING,
      cloudGraphHostName: cacheRecord.account?.cloudGraphHostName || Constants.EMPTY_STRING,
      msGraphHost: cacheRecord.account?.msGraphHost || Constants.EMPTY_STRING,
      code: serverTokenResponse?.spa_code,
      fromNativeBroker: false,
    };
  }
}
//@ chunk-mrx6y2r5.js:189654-190138 esm-fingerprint
function buildAccountToCache(
  cacheStorage,
  authority,
  homeAccountId,
  base64Decode,
  correlationId,
  idTokenClaims,
  clientInfo,
  environment,
  claimsTenantId,
  authCodePayload,
  nativeAccountId,
  logger,
) {
  logger?.verbose("setCachedAccount called");
  let baseAccountKey = cacheStorage
    .getAccountKeys()
    .find((accountKey) => accountKey.startsWith(homeAccountId));
  let cachedAccount = null;
  if (baseAccountKey) cachedAccount = cacheStorage.getAccount(baseAccountKey, correlationId);
  let baseAccount =
    cachedAccount ||
    AccountEntity.createAccount(
      {
        homeAccountId,
        idTokenClaims,
        clientInfo,
        environment,
        cloudGraphHostName: authCodePayload?.cloud_graph_host_name,
        msGraphHost: authCodePayload?.msgraph_host,
        nativeAccountId,
      },
      authority,
      base64Decode,
    );
  let tenantProfiles = baseAccount.tenantProfiles || [];
  let tenantId = claimsTenantId || baseAccount.realm;
  if (tenantId && !tenantProfiles.find((tenantProfile) => tenantProfile.tenantId === tenantId)) {
    let newTenantProfile = buildTenantProfile(
      homeAccountId,
      baseAccount.localAccountId,
      tenantId,
      idTokenClaims,
    );
    tenantProfiles.push(newTenantProfile);
  }
  baseAccount.tenantProfiles = tenantProfiles;
  return baseAccount;
}
//@ chunk-mrx6y2r5.js:190183-190284 esm-fingerprint
async function getClientAssertion(clientAssertion, clientId, tokenEndpoint) {
  if (typeof clientAssertion === "string") return clientAssertion;
  else
    return clientAssertion({
      clientId,
      tokenEndpoint,
    });
}
//@ chunk-mrx6y2r5.js:190329-194992 esm-fingerprint
class AuthorizationCodeClient extends BaseClient {
  constructor(configuration, performanceClient) {
    super(configuration, performanceClient);
    this.includeRedirectUri = true;
    this.oidcDefaultScopes = this.config.authOptions.authority.options.OIDCOptions?.defaultScopes;
  }
  async acquireToken(request, authCodePayload) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthClientAcquireToken,
      request.correlationId,
    );
    if (!request.code) throw createClientAuthError(requestCannotBeMade);
    let reqTimestamp = nowSeconds();
    let response = await invokeAsync(
      this.executeTokenRequest.bind(this),
      PerformanceEvents.AuthClientExecuteTokenRequest,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(this.authority, request);
    let requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
    let responseHandler = new ResponseHandler(
      this.config.authOptions.clientId,
      this.cacheManager,
      this.cryptoUtils,
      this.logger,
      this.config.serializableCache,
      this.config.persistencePlugin,
      this.performanceClient,
    );
    responseHandler.validateTokenResponse(response.body);
    return invokeAsync(
      responseHandler.handleServerTokenResponse.bind(responseHandler),
      PerformanceEvents.HandleServerTokenResponse,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(
      response.body,
      this.authority,
      reqTimestamp,
      request,
      authCodePayload,
      undefined,
      undefined,
      undefined,
      requestId,
    );
  }
  getLogoutUri(logoutRequest) {
    if (!logoutRequest) throw createClientConfigurationError(logoutRequestEmpty);
    let queryString = this.createLogoutUrlQueryString(logoutRequest);
    return UrlString.appendQueryString(this.authority.endSessionEndpoint, queryString);
  }
  async executeTokenRequest(authority, request) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthClientExecuteTokenRequest,
      request.correlationId,
    );
    let queryParametersString = this.createTokenQueryParameters(request);
    let endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
    let requestBody = await invokeAsync(
      this.createTokenRequestBody.bind(this),
      PerformanceEvents.AuthClientCreateTokenRequestBody,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(request);
    let ccsCredential = undefined;
    if (request.clientInfo)
      try {
        let clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
        ccsCredential = {
          credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
          type: CcsCredentialType.HOME_ACCOUNT_ID,
        };
      } catch (e) {
        this.logger.verbose("Could not parse client info for CCS Header: " + e);
      }
    let headers = this.createTokenRequestHeaders(ccsCredential || request.ccsCredential);
    let thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
    return invokeAsync(
      this.executePostToTokenEndpoint.bind(this),
      PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(
      endpoint,
      requestBody,
      headers,
      thumbprint,
      request.correlationId,
      PerformanceEvents.AuthorizationCodeClientExecutePostToTokenEndpoint,
    );
  }
  async createTokenRequestBody(request) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.AuthClientCreateTokenRequestBody,
      request.correlationId,
    );
    let parameters = new Map();
    addClientId(
      parameters,
      request.embeddedClientId ||
        request.tokenBodyParameters?.[CLIENT_ID] ||
        this.config.authOptions.clientId,
    );
    if (!this.includeRedirectUri) {
      if (!request.redirectUri) throw createClientConfigurationError(redirectUriEmpty);
    } else addRedirectUri(parameters, request.redirectUri);
    addScopes(parameters, request.scopes, true, this.oidcDefaultScopes);
    zu(parameters, request.code);
    addLibraryInfo(parameters, this.config.libraryInfo);
    addApplicationTelemetry(parameters, this.config.telemetry.application);
    addThrottling(parameters);
    if (this.serverTelemetryManager && !isOidcProtocolMode(this.config))
      addServerTelemetry(parameters, this.serverTelemetryManager);
    if (request.codeVerifier) qu(parameters, request.codeVerifier);
    if (this.config.clientCredentials.clientSecret)
      addClientSecret(parameters, this.config.clientCredentials.clientSecret);
    if (this.config.clientCredentials.clientAssertion) {
      let clientAssertion = this.config.clientCredentials.clientAssertion;
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
    addGrantType(parameters, GrantType.AUTHORIZATION_CODE_GRANT);
    addClientInfo(parameters);
    if (request.authenticationScheme === AuthenticationScheme.POP) {
      let popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
      let reqCnfData;
      if (!request.popKid)
        reqCnfData = (
          await invokeAsync(
            popTokenGenerator.generateCnf.bind(popTokenGenerator),
            PerformanceEvents.PopTokenGenerateCnf,
            this.logger,
            this.performanceClient,
            request.correlationId,
          )(request, this.logger)
        ).reqCnfString;
      else reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
      addPopToken(parameters, reqCnfData);
    } else if (request.authenticationScheme === AuthenticationScheme.SSH)
      if (request.sshJwk) addSshJwk(parameters, request.sshJwk);
      else throw createClientConfigurationError(missingSshJwk);
    if (
      !StringUtils.isEmptyObj(request.claims) ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
    let ccsCred = undefined;
    if (request.clientInfo)
      try {
        let clientInfo = buildClientInfo(request.clientInfo, this.cryptoUtils.base64Decode);
        ccsCred = {
          credential: `${clientInfo.uid}${Separators.CLIENT_INFO_SEPARATOR}${clientInfo.utid}`,
          type: CcsCredentialType.HOME_ACCOUNT_ID,
        };
      } catch (e) {
        this.logger.verbose("Could not parse client info for CCS Header: " + e);
      }
    else ccsCred = request.ccsCredential;
    if (this.config.systemOptions.preventCorsPreflight && ccsCred)
      switch (ccsCred.type) {
        case CcsCredentialType.HOME_ACCOUNT_ID:
          try {
            let clientInfo = buildClientInfoFromHomeAccountId(ccsCred.credential);
            addCcsOid(parameters, clientInfo);
          } catch (e) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + e);
          }
          break;
        case CcsCredentialType.UPN:
          addCcsUpn(parameters, ccsCred.credential);
          break;
      }
    if (request.embeddedClientId)
      addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    if (request.tokenBodyParameters) addExtraQueryParameters(parameters, request.tokenBodyParameters);
    if (
      request.enableSpaAuthorizationCode &&
      (!request.tokenBodyParameters || !request.tokenBodyParameters[RETURN_SPA_CODE])
    )
      addExtraQueryParameters(parameters, {
        [RETURN_SPA_CODE]: "1",
      });
    instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
    return mapToQueryString(parameters);
  }
  createLogoutUrlQueryString(request) {
    let parameters = new Map();
    if (request.postLogoutRedirectUri) Lu(parameters, request.postLogoutRedirectUri);
    if (request.correlationId) addCorrelationId(parameters, request.correlationId);
    if (request.idTokenHint) Hu(parameters, request.idTokenHint);
    if (request.state) addState(parameters, request.state);
    if (request.logoutHint) Ku(parameters, request.logoutHint);
    if (request.extraQueryParameters) addExtraQueryParameters(parameters, request.extraQueryParameters);
    if (this.config.authOptions.instanceAware) addInstanceAware(parameters);
    return mapToQueryString(
      parameters,
      this.config.authOptions.encodeExtraQueryParams,
      request.extraQueryParameters,
    );
  }
}
//@ chunk-mrx6y2r5.js:195037-195048 esm-layout
var DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS = 300;
//@ chunk-mrx6y2r5.js:195048-200556 esm-fingerprint
class RefreshTokenClient extends BaseClient {
  constructor(configuration, performanceClient) {
    super(configuration, performanceClient);
  }
  async acquireToken(request) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RefreshTokenClientAcquireToken,
      request.correlationId,
    );
    let reqTimestamp = nowSeconds();
    let response = await invokeAsync(
      this.executeTokenRequest.bind(this),
      PerformanceEvents.RefreshTokenClientExecuteTokenRequest,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(request, this.authority);
    let requestId = response.headers?.[HeaderNames.X_MS_REQUEST_ID];
    let responseHandler = new ResponseHandler(
      this.config.authOptions.clientId,
      this.cacheManager,
      this.cryptoUtils,
      this.logger,
      this.config.serializableCache,
      this.config.persistencePlugin,
    );
    responseHandler.validateTokenResponse(response.body);
    return invokeAsync(
      responseHandler.handleServerTokenResponse.bind(responseHandler),
      PerformanceEvents.HandleServerTokenResponse,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(
      response.body,
      this.authority,
      reqTimestamp,
      request,
      undefined,
      undefined,
      true,
      request.forceCache,
      requestId,
    );
  }
  async acquireTokenByRefreshToken(request) {
    if (!request) throw createClientConfigurationError(tokenRequestEmpty);
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RefreshTokenClientAcquireTokenByRefreshToken,
      request.correlationId,
    );
    if (!request.account) throw createClientAuthError(noAccountInSilentRequest);
    if (this.cacheManager.isAppMetadataFOCI(request.account.environment))
      try {
        return await invokeAsync(
          this.acquireTokenWithCachedRefreshToken.bind(this),
          PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
          this.logger,
          this.performanceClient,
          request.correlationId,
        )(request, true);
      } catch (e) {
        let noFamilyRTInCache = e instanceof InteractionRequiredAuthError && e.errorCode === noTokensFound;
        let clientMismatchErrorWithFamilyRT =
          e instanceof ServerError &&
          e.errorCode === Errors.INVALID_GRANT_ERROR &&
          e.subError === Errors.CLIENT_MISMATCH_ERROR;
        if (noFamilyRTInCache || clientMismatchErrorWithFamilyRT)
          return invokeAsync(
            this.acquireTokenWithCachedRefreshToken.bind(this),
            PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
            this.logger,
            this.performanceClient,
            request.correlationId,
          )(request, false);
        else throw e;
      }
    return invokeAsync(
      this.acquireTokenWithCachedRefreshToken.bind(this),
      PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(request, false);
  }
  async acquireTokenWithCachedRefreshToken(request, foci) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
      request.correlationId,
    );
    let refreshToken = invoke(
      this.cacheManager.getRefreshToken.bind(this.cacheManager),
      PerformanceEvents.CacheManagerGetRefreshToken,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(request.account, foci, request.correlationId, undefined, this.performanceClient);
    if (!refreshToken) throw createInteractionRequiredAuthError(noTokensFound);
    if (
      refreshToken.expiresOn &&
      isTokenExpired(
        refreshToken.expiresOn,
        request.refreshTokenExpirationOffsetSeconds || DEFAULT_REFRESH_TOKEN_EXPIRATION_OFFSET_SECONDS,
      )
    ) {
      this.performanceClient?.addFields(
        {
          rtExpiresOnMs: Number(refreshToken.expiresOn),
        },
        request.correlationId,
      );
      throw createInteractionRequiredAuthError(refreshTokenExpired);
    }
    let refreshTokenRequest = {
      ...request,
      refreshToken: refreshToken.secret,
      authenticationScheme: request.authenticationScheme || AuthenticationScheme.BEARER,
      ccsCredential: {
        credential: request.account.homeAccountId,
        type: CcsCredentialType.HOME_ACCOUNT_ID,
      },
    };
    try {
      return await invokeAsync(
        this.acquireToken.bind(this),
        PerformanceEvents.RefreshTokenClientAcquireToken,
        this.logger,
        this.performanceClient,
        request.correlationId,
      )(refreshTokenRequest);
    } catch (e) {
      if (e instanceof InteractionRequiredAuthError) {
        this.performanceClient?.addFields(
          {
            rtExpiresOnMs: Number(refreshToken.expiresOn),
          },
          request.correlationId,
        );
        if (e.subError === badToken) {
          this.logger.verbose("acquireTokenWithRefreshToken: bad refresh token, removing from cache");
          let badRefreshTokenKey = this.cacheManager.generateCredentialKey(refreshToken);
          this.cacheManager.removeRefreshToken(badRefreshTokenKey, request.correlationId);
        }
      }
      throw e;
    }
  }
  async executeTokenRequest(request, authority) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RefreshTokenClientExecuteTokenRequest,
      request.correlationId,
    );
    let queryParametersString = this.createTokenQueryParameters(request);
    let endpoint = UrlString.appendQueryString(authority.tokenEndpoint, queryParametersString);
    let requestBody = await invokeAsync(
      this.createTokenRequestBody.bind(this),
      PerformanceEvents.RefreshTokenClientCreateTokenRequestBody,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(request);
    let headers = this.createTokenRequestHeaders(request.ccsCredential);
    let thumbprint = getRequestThumbprint(this.config.authOptions.clientId, request);
    return invokeAsync(
      this.executePostToTokenEndpoint.bind(this),
      PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint,
      this.logger,
      this.performanceClient,
      request.correlationId,
    )(
      endpoint,
      requestBody,
      headers,
      thumbprint,
      request.correlationId,
      PerformanceEvents.RefreshTokenClientExecutePostToTokenEndpoint,
    );
  }
  async createTokenRequestBody(request) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.RefreshTokenClientCreateTokenRequestBody,
      request.correlationId,
    );
    let parameters = new Map();
    addClientId(
      parameters,
      request.embeddedClientId ||
        request.tokenBodyParameters?.[CLIENT_ID] ||
        this.config.authOptions.clientId,
    );
    if (request.redirectUri) addRedirectUri(parameters, request.redirectUri);
    addScopes(
      parameters,
      request.scopes,
      true,
      this.config.authOptions.authority.options.OIDCOptions?.defaultScopes,
    );
    addGrantType(parameters, GrantType.REFRESH_TOKEN_GRANT);
    addClientInfo(parameters);
    addLibraryInfo(parameters, this.config.libraryInfo);
    addApplicationTelemetry(parameters, this.config.telemetry.application);
    addThrottling(parameters);
    if (this.serverTelemetryManager && !isOidcProtocolMode(this.config))
      addServerTelemetry(parameters, this.serverTelemetryManager);
    Gu(parameters, request.refreshToken);
    if (this.config.clientCredentials.clientSecret)
      addClientSecret(parameters, this.config.clientCredentials.clientSecret);
    if (this.config.clientCredentials.clientAssertion) {
      let clientAssertion = this.config.clientCredentials.clientAssertion;
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
    if (request.authenticationScheme === AuthenticationScheme.POP) {
      let popTokenGenerator = new PopTokenGenerator(this.cryptoUtils, this.performanceClient);
      let reqCnfData;
      if (!request.popKid)
        reqCnfData = (
          await invokeAsync(
            popTokenGenerator.generateCnf.bind(popTokenGenerator),
            PerformanceEvents.PopTokenGenerateCnf,
            this.logger,
            this.performanceClient,
            request.correlationId,
          )(request, this.logger)
        ).reqCnfString;
      else reqCnfData = this.cryptoUtils.encodeKid(request.popKid);
      addPopToken(parameters, reqCnfData);
    } else if (request.authenticationScheme === AuthenticationScheme.SSH)
      if (request.sshJwk) addSshJwk(parameters, request.sshJwk);
      else throw createClientConfigurationError(missingSshJwk);
    if (
      !StringUtils.isEmptyObj(request.claims) ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      addClaims(parameters, request.claims, this.config.authOptions.clientCapabilities);
    if (this.config.systemOptions.preventCorsPreflight && request.ccsCredential)
      switch (request.ccsCredential.type) {
        case CcsCredentialType.HOME_ACCOUNT_ID:
          try {
            let clientInfo = buildClientInfoFromHomeAccountId(request.ccsCredential.credential);
            addCcsOid(parameters, clientInfo);
          } catch (e) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + e);
          }
          break;
        case CcsCredentialType.UPN:
          addCcsUpn(parameters, request.ccsCredential.credential);
          break;
      }
    if (request.embeddedClientId)
      addBrokerParameters(parameters, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    if (request.tokenBodyParameters) addExtraQueryParameters(parameters, request.tokenBodyParameters);
    instrumentBrokerParams(parameters, request.correlationId, this.performanceClient);
    return mapToQueryString(parameters);
  }
}
//@ chunk-mrx6y2r5.js:200601-202702 esm-fingerprint
class SilentFlowClient extends BaseClient {
  constructor(configuration, performanceClient) {
    super(configuration, performanceClient);
  }
  async acquireCachedToken(request) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.SilentFlowClientAcquireCachedToken,
      request.correlationId,
    );
    let lastCacheOutcome = CacheOutcome.NOT_APPLICABLE;
    if (
      request.forceRefresh ||
      (!this.config.cacheOptions.claimsBasedCachingEnabled && !StringUtils.isEmptyObj(request.claims))
    ) {
      this.setCacheOutcome(CacheOutcome.FORCE_REFRESH_OR_CLAIMS, request.correlationId);
      throw createClientAuthError(tokenRefreshRequired);
    }
    if (!request.account) throw createClientAuthError(noAccountInSilentRequest);
    let requestTenantId = request.account.tenantId || getTenantFromAuthorityString(request.authority);
    let tokenKeys = this.cacheManager.getTokenKeys();
    let cachedAccessToken = this.cacheManager.getAccessToken(
      request.account,
      request,
      tokenKeys,
      requestTenantId,
    );
    if (!cachedAccessToken) {
      this.setCacheOutcome(CacheOutcome.NO_CACHED_ACCESS_TOKEN, request.correlationId);
      throw createClientAuthError(tokenRefreshRequired);
    } else if (
      Qu(cachedAccessToken.cachedAt) ||
      isTokenExpired(cachedAccessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)
    ) {
      this.setCacheOutcome(CacheOutcome.CACHED_ACCESS_TOKEN_EXPIRED, request.correlationId);
      throw createClientAuthError(tokenRefreshRequired);
    } else if (cachedAccessToken.refreshOn && isTokenExpired(cachedAccessToken.refreshOn, 0))
      lastCacheOutcome = CacheOutcome.PROACTIVELY_REFRESHED;
    let environment = request.authority || this.authority.getPreferredCache();
    let cacheRecord = {
      account: this.cacheManager.getAccount(
        this.cacheManager.generateAccountKey(request.account),
        request.correlationId,
      ),
      accessToken: cachedAccessToken,
      idToken: this.cacheManager.getIdToken(
        request.account,
        request.correlationId,
        tokenKeys,
        requestTenantId,
        this.performanceClient,
      ),
      refreshToken: null,
      appMetadata: this.cacheManager.readAppMetadataFromCache(environment),
    };
    this.setCacheOutcome(lastCacheOutcome, request.correlationId);
    if (this.config.serverTelemetryManager) this.config.serverTelemetryManager.incrementCacheHits();
    return [
      await invokeAsync(
        this.generateResultFromCacheRecord.bind(this),
        PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord,
        this.logger,
        this.performanceClient,
        request.correlationId,
      )(cacheRecord, request),
      lastCacheOutcome,
    ];
  }
  setCacheOutcome(cacheOutcome, correlationId) {
    this.serverTelemetryManager?.setCacheOutcome(cacheOutcome);
    this.performanceClient?.addFields(
      {
        cacheOutcome,
      },
      correlationId,
    );
    if (cacheOutcome !== CacheOutcome.NOT_APPLICABLE)
      this.logger.info(`Token refresh is required due to cache outcome: ${cacheOutcome}`);
  }
  async generateResultFromCacheRecord(cacheRecord, request) {
    this.performanceClient?.addQueueMeasurement(
      PerformanceEvents.SilentFlowClientGenerateResultFromCacheRecord,
      request.correlationId,
    );
    let idTokenClaims;
    if (cacheRecord.idToken)
      idTokenClaims = extractTokenClaims(
        cacheRecord.idToken.secret,
        this.config.cryptoInterface.base64Decode,
      );
    if (request.maxAge || request.maxAge === 0) {
      let authTime = idTokenClaims?.auth_time;
      if (!authTime) throw createClientAuthError(authTimeNotFound);
      checkMaxAge(authTime, request.maxAge);
    }
    return ResponseHandler.generateAuthenticationResult(
      this.cryptoUtils,
      this.authority,
      cacheRecord,
      true,
      request,
      idTokenClaims,
    );
  }
}
//@ chunk-mrx6y2r5.js:202747-205278 esm-fingerprint
function getStandardAuthorizeRequestParameters(authOptions, request, logger, performanceClient) {
  let correlationId = request.correlationId;
  let parameters = new Map();
  addClientId(
    parameters,
    request.embeddedClientId || request.extraQueryParameters?.[CLIENT_ID] || authOptions.clientId,
  );
  let requestScopes = [...(request.scopes || []), ...(request.extraScopesToConsent || [])];
  addScopes(parameters, requestScopes, true, authOptions.authority.options.OIDCOptions?.defaultScopes);
  addRedirectUri(parameters, request.redirectUri);
  addCorrelationId(parameters, correlationId);
  Uu(parameters, request.responseMode);
  addClientInfo(parameters);
  if (request.prompt) {
    $u(parameters, request.prompt);
    performanceClient?.addFields(
      {
        prompt: request.prompt,
      },
      correlationId,
    );
  }
  if (request.domainHint) {
    Fu(parameters, request.domainHint);
    performanceClient?.addFields(
      {
        domainHintFromRequest: true,
      },
      correlationId,
    );
  }
  if (request.prompt !== PromptValue.SELECT_ACCOUNT) {
    if (request.sid && request.prompt === PromptValue.NONE) {
      logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from request");
      addSid(parameters, request.sid);
      performanceClient?.addFields(
        {
          sidFromRequest: true,
        },
        correlationId,
      );
    } else if (request.account) {
      let accountSid = Kg(request.account);
      let accountLoginHintClaim = extractLoginHint(request.account);
      if (accountLoginHintClaim && request.domainHint) {
        logger.warning(
          'AuthorizationCodeClient.createAuthCodeUrlQueryString: "domainHint" param is set, skipping opaque "login_hint" claim. Please consider not passing domainHint',
        );
        accountLoginHintClaim = null;
      }
      if (accountLoginHintClaim) {
        logger.verbose("createAuthCodeUrlQueryString: login_hint claim present on account");
        addLoginHint(parameters, accountLoginHintClaim);
        performanceClient?.addFields(
          {
            loginHintFromClaim: true,
          },
          correlationId,
        );
        try {
          let clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
          addCcsOid(parameters, clientInfo);
        } catch (e) {
          logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      } else if (accountSid && request.prompt === PromptValue.NONE) {
        logger.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from account");
        addSid(parameters, accountSid);
        performanceClient?.addFields(
          {
            sidFromClaim: true,
          },
          correlationId,
        );
        try {
          let clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
          addCcsOid(parameters, clientInfo);
        } catch (e) {
          logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      } else if (request.loginHint) {
        logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from request");
        addLoginHint(parameters, request.loginHint);
        addCcsUpn(parameters, request.loginHint);
        performanceClient?.addFields(
          {
            loginHintFromRequest: true,
          },
          correlationId,
        );
      } else if (request.account.username) {
        logger.verbose("createAuthCodeUrlQueryString: Adding login_hint from account");
        addLoginHint(parameters, request.account.username);
        performanceClient?.addFields(
          {
            loginHintFromUpn: true,
          },
          correlationId,
        );
        try {
          let clientInfo = buildClientInfoFromHomeAccountId(request.account.homeAccountId);
          addCcsOid(parameters, clientInfo);
        } catch (e) {
          logger.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      }
    } else if (request.loginHint) {
      logger.verbose("createAuthCodeUrlQueryString: No account, adding login_hint from request");
      addLoginHint(parameters, request.loginHint);
      addCcsUpn(parameters, request.loginHint);
      performanceClient?.addFields(
        {
          loginHintFromRequest: true,
        },
        correlationId,
      );
    }
  } else logger.verbose("createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints");
  if (request.nonce) Bu(parameters, request.nonce);
  if (request.state) addState(parameters, request.state);
  if (request.claims || (authOptions.clientCapabilities && authOptions.clientCapabilities.length > 0))
    addClaims(parameters, request.claims, authOptions.clientCapabilities);
  if (request.embeddedClientId)
    addBrokerParameters(parameters, authOptions.clientId, authOptions.redirectUri);
  if (
    authOptions.instanceAware &&
    (!request.extraQueryParameters || !Object.keys(request.extraQueryParameters).includes(INSTANCE_AWARE))
  )
    addInstanceAware(parameters);
  return parameters;
}
//@ chunk-mrx6y2r5.js:205278-205369 esm-fingerprint
function getAuthorizeUrl(authority, requestParameters, encodeParams, extraQueryParameters) {
  let queryString = mapToQueryString(requestParameters, encodeParams, extraQueryParameters);
  return UrlString.appendQueryString(authority.authorizationEndpoint, queryString);
}
//@ chunk-mrx6y2r5.js:205369-205418 esm-fingerprint
function Kg(account) {
  return account.idTokenClaims?.sid || null;
}
//@ chunk-mrx6y2r5.js:205418-205487 esm-fingerprint
function extractLoginHint(account) {
  return account.loginHint || account.idTokenClaims?.login_hint || null;
}
//@ chunk-mrx6y2r5.js:205532-205550 esm-layout
var skuGroupSeparator = ",";
var skuValueSeparator = "|";
//@ chunk-mrx6y2r5.js:205550-205905 esm-fingerprint
function makeExtraSkuString(params) {
  let { skus, libraryName, libraryVersion, extensionName, extensionVersion } = params;
  let skuMap = new Map([
    [0, [libraryName, libraryVersion]],
    [2, [extensionName, extensionVersion]],
  ]);
  let skuArr = [];
  if (skus?.length) {
    skuArr = skus.split(skuGroupSeparator);
    if (skuArr.length < 4) return skus;
  } else
    skuArr = Array.from(
      {
        length: 4,
      },
      () => skuValueSeparator,
    );
  skuMap.forEach((value, key) => {
    if (value.length === 2 && value[0]?.length && value[1]?.length)
      setSku({
        skuArr,
        index: key,
        skuName: value[0],
        skuVersion: value[1],
      });
  });
  return skuArr.join(skuGroupSeparator);
}
//@ chunk-mrx6y2r5.js:205905-206009 esm-fingerprint
function setSku(params) {
  let { skuArr, index, skuName, skuVersion } = params;
  if (index >= skuArr.length) return;
  skuArr[index] = [skuName, skuVersion].join(skuValueSeparator);
}
//@ chunk-mrx6y2r5.js:206009-209339 esm-fingerprint
class ServerTelemetryManager {
  constructor(telemetryRequest, cacheManager) {
    this.cacheOutcome = CacheOutcome.NOT_APPLICABLE;
    this.cacheManager = cacheManager;
    this.apiId = telemetryRequest.apiId;
    this.correlationId = telemetryRequest.correlationId;
    this.wrapperSKU = telemetryRequest.wrapperSKU || Constants.EMPTY_STRING;
    this.wrapperVer = telemetryRequest.wrapperVer || Constants.EMPTY_STRING;
    this.telemetryCacheKey =
      SERVER_TELEM_CONSTANTS.CACHE_KEY + Separators.CACHE_KEY_SEPARATOR + telemetryRequest.clientId;
  }
  generateCurrentRequestHeaderValue() {
    let request = `${this.apiId}${SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR}${this.cacheOutcome}`;
    let platformFieldsArr = [this.wrapperSKU, this.wrapperVer];
    let nativeBrokerErrorCode = this.getNativeBrokerErrorCode();
    if (nativeBrokerErrorCode?.length) platformFieldsArr.push(`broker_error=${nativeBrokerErrorCode}`);
    let platformFields = platformFieldsArr.join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    let regionDiscoveryFields = this.getRegionDiscoveryFields();
    let requestWithRegionDiscoveryFields = [request, regionDiscoveryFields].join(
      SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR,
    );
    return [SERVER_TELEM_CONSTANTS.SCHEMA_VERSION, requestWithRegionDiscoveryFields, platformFields].join(
      SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR,
    );
  }
  generateLastRequestHeaderValue() {
    let lastRequests = this.getLastRequests();
    let maxErrors = ServerTelemetryManager.maxErrorsToSend(lastRequests);
    let failedRequests = lastRequests.failedRequests
      .slice(0, 2 * maxErrors)
      .join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    let errors = lastRequests.errors.slice(0, maxErrors).join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    let errorCount = lastRequests.errors.length;
    let overflow =
      maxErrors < errorCount ? SERVER_TELEM_CONSTANTS.OVERFLOW_TRUE : SERVER_TELEM_CONSTANTS.OVERFLOW_FALSE;
    let platformFields = [errorCount, overflow].join(SERVER_TELEM_CONSTANTS.VALUE_SEPARATOR);
    return [
      SERVER_TELEM_CONSTANTS.SCHEMA_VERSION,
      lastRequests.cacheHits,
      failedRequests,
      errors,
      platformFields,
    ].join(SERVER_TELEM_CONSTANTS.CATEGORY_SEPARATOR);
  }
  cacheFailedRequest(error) {
    let lastRequests = this.getLastRequests();
    if (lastRequests.errors.length >= SERVER_TELEM_CONSTANTS.MAX_CACHED_ERRORS) {
      lastRequests.failedRequests.shift();
      lastRequests.failedRequests.shift();
      lastRequests.errors.shift();
    }
    lastRequests.failedRequests.push(this.apiId, this.correlationId);
    if (error instanceof Error && !!error && error.toString()) {
      if (error instanceof AuthError) {
        if (error.subError) lastRequests.errors.push(error.subError);
        else if (error.errorCode) lastRequests.errors.push(error.errorCode);
        else lastRequests.errors.push(error.toString());
      } else lastRequests.errors.push(error.toString());
    } else lastRequests.errors.push(SERVER_TELEM_CONSTANTS.UNKNOWN_ERROR);
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
    return;
  }
  incrementCacheHits() {
    let lastRequests = this.getLastRequests();
    lastRequests.cacheHits += 1;
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
    return lastRequests.cacheHits;
  }
  getLastRequests() {
    let initialValue = {
      failedRequests: [],
      errors: [],
      cacheHits: 0,
    };
    return this.cacheManager.getServerTelemetry(this.telemetryCacheKey) || initialValue;
  }
  clearTelemetryCache() {
    let lastRequests = this.getLastRequests();
    let numErrorsFlushed = ServerTelemetryManager.maxErrorsToSend(lastRequests);
    let errorCount = lastRequests.errors.length;
    if (numErrorsFlushed === errorCount)
      this.cacheManager.removeItem(this.telemetryCacheKey, this.correlationId);
    else {
      let serverTelemEntity = {
        failedRequests: lastRequests.failedRequests.slice(numErrorsFlushed * 2),
        errors: lastRequests.errors.slice(numErrorsFlushed),
        cacheHits: 0,
      };
      this.cacheManager.setServerTelemetry(this.telemetryCacheKey, serverTelemEntity, this.correlationId);
    }
  }
  static maxErrorsToSend(serverTelemetryEntity) {
    let i_2;
    let maxErrors = 0;
    let dataSize = 0;
    let errorCount = serverTelemetryEntity.errors.length;
    for (i_2 = 0; i_2 < errorCount; i_2++) {
      let apiId = serverTelemetryEntity.failedRequests[2 * i_2] || Constants.EMPTY_STRING;
      let correlationId = serverTelemetryEntity.failedRequests[2 * i_2 + 1] || Constants.EMPTY_STRING;
      let errorCode = serverTelemetryEntity.errors[i_2] || Constants.EMPTY_STRING;
      dataSize += apiId.toString().length + correlationId.toString().length + errorCode.length + 3;
      if (dataSize < SERVER_TELEM_CONSTANTS.MAX_LAST_HEADER_BYTES) maxErrors += 1;
      else break;
    }
    return maxErrors;
  }
  getRegionDiscoveryFields() {
    let regionDiscoveryFields = [];
    regionDiscoveryFields.push(this.regionUsed || Constants.EMPTY_STRING);
    regionDiscoveryFields.push(this.regionSource || Constants.EMPTY_STRING);
    regionDiscoveryFields.push(this.regionOutcome || Constants.EMPTY_STRING);
    return regionDiscoveryFields.join(",");
  }
  updateRegionDiscoveryMetadata(regionDiscoveryMetadata) {
    this.regionUsed = regionDiscoveryMetadata.region_used;
    this.regionSource = regionDiscoveryMetadata.region_source;
    this.regionOutcome = regionDiscoveryMetadata.region_outcome;
  }
  setCacheOutcome(cacheOutcome) {
    this.cacheOutcome = cacheOutcome;
  }
  setNativeBrokerErrorCode(errorCode) {
    let lastRequests = this.getLastRequests();
    lastRequests.nativeBrokerErrorCode = errorCode;
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
  }
  getNativeBrokerErrorCode() {
    return this.getLastRequests().nativeBrokerErrorCode;
  }
  clearNativeBrokerErrorCode() {
    let lastRequests = this.getLastRequests();
    delete lastRequests.nativeBrokerErrorCode;
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
  }
  static makeExtraSkuString(params) {
    return makeExtraSkuString(params);
  }
}
export {
  Constants,
  AccountEntity,
  CacheManager,
  HttpStatus,
  AuthError,
  EncodingTypes,
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
  Og,
  Ng,
  addScopes,
  Du,
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
  wg,
  addExtraQueryParameters,
  getAuthorizeUrl,
  buildStaticAuthorityOptions,
  mt,
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
  xg,
  wa,
  postRequestFailed,
  deviceCodeUnknownError,
  vg,
  X_CLIENT_XTRA_SKU,
  CodeChallengeMethodValues,
  ServerError,
  ScopeSet,
  isTokenExpired,
  DEFAULT_TOKEN_RENEWAL_OFFSET_SEC,
  multipleMatchingTokens,
  extractTokenClaims,
  bg,
  ON_BEHALF_OF,
  kg,
  invalidClientCredential,
  AADAuthorityConstants,
  missingTenantIdError,
  HeaderNames,
  networkError,
  DEFAULT_CRYPTO_IMPLEMENTATION,
  createClientConfigurationError,
  urlEmptyError,
  AzureCloudInstance,
};
