/**
 * @azure/msal-common/lib/index-node-DhUjlPuB.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-common@15.13.1
 * pieces: chunk-mrx6y2r5.js (171)
 * attribution: esm-fingerprint 131, esm-layout 25, layout 15
 */
import { G, Ue } from "../dist/logger/Logger.mjs";

//@ chunk-mrx6y2r5.js:90426-92176 esm-fingerprint
var f = {
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
  },
  b = {
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
var ye = [f.OPENID_SCOPE, f.PROFILE_SCOPE, f.OFFLINE_ACCESS_SCOPE],
  Sa = [...ye, f.EMAIL_SCOPE],
  Y = {
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
var be = { COMMON: "common", ORGANIZATIONS: "organizations", CONSUMERS: "consumers" },
  nr = { ACCESS_TOKEN: "access_token", XMS_CC: "xms_cc" },
  or = {
    LOGIN: "login",
    SELECT_ACCOUNT: "select_account",
    CONSENT: "consent",
    NONE: "none",
    CREATE: "create",
    NO_SESSION: "no_session",
  },
  ri = { PLAIN: "plain", S256: "S256" },
  Xr = {
    CODE: "code",
    IDTOKEN_TOKEN: "id_token token",
    IDTOKEN_TOKEN_REFRESHTOKEN: "id_token token refresh_token",
  };
//@ chunk-mrx6y2r5.js:92910-93571 esm-fingerprint
var mt = { QUERY: "query", FRAGMENT: "fragment", FORM_POST: "form_post" },
  Pe = {
    IMPLICIT_GRANT: "implicit",
    AUTHORIZATION_CODE_GRANT: "authorization_code",
    CLIENT_CREDENTIALS_GRANT: "client_credentials",
    RESOURCE_OWNER_PASSWORD_GRANT: "password",
    REFRESH_TOKEN_GRANT: "refresh_token",
    DEVICE_CODE_GRANT: "device_code",
    JWT_BEARER: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  },
  ir = {
    MSSTS_ACCOUNT_TYPE: "MSSTS",
    ADFS_ACCOUNT_TYPE: "ADFS",
    MSAV1_ACCOUNT_TYPE: "MSA",
    GENERIC_ACCOUNT_TYPE: "Generic",
  },
  pt = { CACHE_KEY_SEPARATOR: "-", CLIENT_INFO_SEPARATOR: "." },
  K = {
    ID_TOKEN: "IdToken",
    ACCESS_TOKEN: "AccessToken",
    ACCESS_TOKEN_WITH_AUTH_SCHEME: "AccessToken_With_AuthScheme",
    REFRESH_TOKEN: "RefreshToken",
  };
//@ chunk-mrx6y2r5.js:93571-94635 esm-fingerprint
var APPMETADATA = "appmetadata",
  CLIENT_INFO = "client_info",
  xt = "1",
  Zr = { CACHE_KEY: "authority-metadata", REFRESH_TIME_SECONDS: 86400 },
  Ce = { CONFIG: "config", CACHE: "cache", NETWORK: "network", HARDCODED_VALUES: "hardcoded_values" },
  de = {
    SCHEMA_VERSION: 5,
    MAX_LAST_HEADER_BYTES: 330,
    MAX_CACHED_ERRORS: 50,
    CACHE_KEY: "server-telemetry",
    CATEGORY_SEPARATOR: "|",
    VALUE_SEPARATOR: ",",
    OVERFLOW_TRUE: "1",
    OVERFLOW_FALSE: "0",
    UNKNOWN_ERROR: "unknown_error",
  },
  L = { BEARER: "Bearer", POP: "pop", SSH: "ssh-cert" },
  ot = {
    DEFAULT_THROTTLE_TIME_SECONDS: 60,
    DEFAULT_MAX_THROTTLE_TIME_SECONDS: 3600,
    THROTTLING_PREFIX: "throttling",
    X_MS_LIB_CAPABILITY_VALUE: "retry-after, h429",
  },
  no = { INVALID_GRANT_ERROR: "invalid_grant", CLIENT_MISMATCH_ERROR: "client_mismatch" },
  oo = { username: "username", password: "password" },
  sr = { FAILED_AUTO_DETECTION: "1", INTERNAL_CACHE: "2", ENVIRONMENT_VARIABLE: "3", IMDS: "4" },
  ni = {
    CONFIGURED_NO_AUTO_DETECTION: "2",
    AUTO_DETECTION_REQUESTED_SUCCESSFUL: "4",
    AUTO_DETECTION_REQUESTED_FAILED: "5",
  },
  j = {
    NOT_APPLICABLE: "0",
    FORCE_REFRESH_OR_CLAIMS: "1",
    NO_CACHED_ACCESS_TOKEN: "2",
    CACHED_ACCESS_TOKEN_EXPIRED: "3",
    PROACTIVELY_REFRESHED: "4",
  };
//@ chunk-mrx6y2r5.js:94635-94690 esm-layout
var en = 300,
  me = { BASE64: "base64", HEX: "hex", UTF8: "utf-8" };
//@ chunk-mrx6y2r5.js:94735-94786 esm-fingerprint
var UNEXPECTED_ERROR = "unexpected_error",
  POST_REQUEST_FAILED = "post_request_failed";
//@ chunk-mrx6y2r5.js:94831-95106 esm-fingerprint
var ii = {
    [UNEXPECTED_ERROR]: "Unexpected error in authentication.",
    [POST_REQUEST_FAILED]:
      "Post request failed from the network, could be a 4xx/5xx or a network unavailability. Please check the exact error code for details.",
  },
  $d = {
    unexpectedError: { code: UNEXPECTED_ERROR, desc: ii[UNEXPECTED_ERROR] },
    postRequestFailed: { code: POST_REQUEST_FAILED, desc: ii[POST_REQUEST_FAILED] },
  };
//@ chunk-mrx6y2r5.js:95106-95384 esm-fingerprint
class AuthError extends Error {
  constructor(e, t, r) {
    let n = t ? `${e}: ${t}` : e;
    super(n);
    (Object.setPrototypeOf(this, AuthError.prototype),
      (this.errorCode = e || f.EMPTY_STRING),
      (this.errorMessage = t || f.EMPTY_STRING),
      (this.subError = r || f.EMPTY_STRING),
      (this.name = "AuthError"));
  }
  setCorrelationId(e) {
    this.correlationId = e;
  }
}
//@ chunk-mrx6y2r5.js:95384-95441 esm-layout
function wa(e, t) {
  return new AuthError(e, t ? `${ii[e]} ${t}` : ii[e]);
}
//@ chunk-mrx6y2r5.js:95486-96737 esm-fingerprint
var CLIENT_INFO_DECODING_ERROR = "client_info_decoding_error",
  CLIENT_INFO_EMPTY_ERROR = "client_info_empty_error",
  TOKEN_PARSING_ERROR = "token_parsing_error",
  NULL_OR_EMPTY_TOKEN = "null_or_empty_token",
  ENDPOINTS_RESOLUTION_ERROR = "endpoints_resolution_error",
  NETWORK_ERROR = "network_error",
  OPENID_CONFIG_ERROR = "openid_config_error",
  HASH_NOT_DESERIALIZED = "hash_not_deserialized",
  INVALID_STATE = "invalid_state",
  STATE_MISMATCH = "state_mismatch",
  STATE_NOT_FOUND = "state_not_found",
  NONCE_MISMATCH = "nonce_mismatch",
  AUTH_TIME_NOT_FOUND = "auth_time_not_found",
  MAX_AGE_TRANSPIRED = "max_age_transpired",
  MULTIPLE_MATCHING_TOKENS = "multiple_matching_tokens",
  MULTIPLE_MATCHING_ACCOUNTS = "multiple_matching_accounts",
  MULTIPLE_MATCHING_APPMETADATA = "multiple_matching_appMetadata",
  REQUEST_CANNOT_BE_MADE = "request_cannot_be_made",
  CANNOT_REMOVE_EMPTY_SCOPE = "cannot_remove_empty_scope",
  CANNOT_APPEND_SCOPESET = "cannot_append_scopeset",
  EMPTY_INPUT_SCOPESET = "empty_input_scopeset",
  DEVICE_CODE_POLLING_CANCELLED = "device_code_polling_cancelled",
  DEVICE_CODE_EXPIRED = "device_code_expired",
  DEVICE_CODE_UNKNOWN_ERROR = "device_code_unknown_error",
  NO_ACCOUNT_IN_SILENT_REQUEST = "no_account_in_silent_request",
  INVALID_CACHE_RECORD = "invalid_cache_record",
  INVALID_CACHE_ENVIRONMENT = "invalid_cache_environment",
  NO_ACCOUNT_FOUND = "no_account_found",
  NO_CRYPTO_OBJECT = "no_crypto_object",
  UNEXPECTED_CREDENTIAL_TYPE = "unexpected_credential_type",
  INVALID_ASSERTION = "invalid_assertion",
  INVALID_CLIENT_CREDENTIAL = "invalid_client_credential",
  TOKEN_REFRESH_REQUIRED = "token_refresh_required",
  USER_TIMEOUT_REACHED = "user_timeout_reached",
  TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT = "token_claims_cnf_required_for_signedjwt",
  di = "authorization_code_missing_from_server_response",
  BINDING_KEY_NOT_REMOVED = "binding_key_not_removed",
  END_SESSION_ENDPOINT_NOT_SUPPORTED = "end_session_endpoint_not_supported",
  KEY_ID_MISSING = "key_id_missing",
  NO_NETWORK_CONNECTIVITY = "no_network_connectivity",
  USER_CANCELED = "user_canceled",
  MISSING_TENANT_ID_ERROR = "missing_tenant_id_error",
  METHOD_NOT_IMPLEMENTED = "method_not_implemented",
  NESTED_APP_AUTH_BRIDGE_DISABLED = "nested_app_auth_bridge_disabled";
//@ chunk-mrx6y2r5.js:96782-101913 esm-fingerprint
var P = {
    [CLIENT_INFO_DECODING_ERROR]: "The client info could not be parsed/decoded correctly",
    [CLIENT_INFO_EMPTY_ERROR]: "The client info was empty",
    [TOKEN_PARSING_ERROR]: "Token cannot be parsed",
    [NULL_OR_EMPTY_TOKEN]: "The token is null or empty",
    [ENDPOINTS_RESOLUTION_ERROR]: "Endpoints cannot be resolved",
    [NETWORK_ERROR]: "Network request failed",
    [OPENID_CONFIG_ERROR]:
      "Could not retrieve endpoints. Check your authority and verify the .well-known/openid-configuration endpoint returns the required endpoints.",
    [HASH_NOT_DESERIALIZED]: "The hash parameters could not be deserialized",
    [INVALID_STATE]: "State was not the expected format",
    [STATE_MISMATCH]: "State mismatch error",
    [STATE_NOT_FOUND]: "State not found",
    [NONCE_MISMATCH]: "Nonce mismatch error",
    [AUTH_TIME_NOT_FOUND]:
      "Max Age was requested and the ID token is missing the auth_time variable. auth_time is an optional claim and is not enabled by default - it must be enabled. See https://aka.ms/msaljs/optional-claims for more information.",
    [MAX_AGE_TRANSPIRED]:
      "Max Age is set to 0, or too much time has elapsed since the last end-user authentication.",
    [MULTIPLE_MATCHING_TOKENS]:
      "The cache contains multiple tokens satisfying the requirements. Call AcquireToken again providing more requirements such as authority or account.",
    [MULTIPLE_MATCHING_ACCOUNTS]:
      "The cache contains multiple accounts satisfying the given parameters. Please pass more info to obtain the correct account",
    [MULTIPLE_MATCHING_APPMETADATA]:
      "The cache contains multiple appMetadata satisfying the given parameters. Please pass more info to obtain the correct appMetadata",
    [REQUEST_CANNOT_BE_MADE]: "Token request cannot be made without authorization code or refresh token.",
    [CANNOT_REMOVE_EMPTY_SCOPE]: "Cannot remove null or empty scope from ScopeSet",
    [CANNOT_APPEND_SCOPESET]: "Cannot append ScopeSet",
    [EMPTY_INPUT_SCOPESET]: "Empty input ScopeSet cannot be processed",
    [DEVICE_CODE_POLLING_CANCELLED]:
      "Caller has cancelled token endpoint polling during device code flow by setting DeviceCodeRequest.cancel = true.",
    [DEVICE_CODE_EXPIRED]: "Device code is expired.",
    [DEVICE_CODE_UNKNOWN_ERROR]: "Device code stopped polling for unknown reasons.",
    [NO_ACCOUNT_IN_SILENT_REQUEST]:
      "Please pass an account object, silent flow is not supported without account information",
    [INVALID_CACHE_RECORD]: "Cache record object was null or undefined.",
    [INVALID_CACHE_ENVIRONMENT]: "Invalid environment when attempting to create cache entry",
    [NO_ACCOUNT_FOUND]: "No account found in cache for given key.",
    [NO_CRYPTO_OBJECT]: "No crypto object detected.",
    [UNEXPECTED_CREDENTIAL_TYPE]: "Unexpected credential type.",
    [INVALID_ASSERTION]:
      "Client assertion must meet requirements described in https://tools.ietf.org/html/rfc7515",
    [INVALID_CLIENT_CREDENTIAL]:
      "Client credential (secret, certificate, or assertion) must not be empty when creating a confidential client. An application should at most have one credential",
    [TOKEN_REFRESH_REQUIRED]:
      "Cannot return token from cache because it must be refreshed. This may be due to one of the following reasons: forceRefresh parameter is set to true, claims have been requested, there is no cached access token or it is expired.",
    [USER_TIMEOUT_REACHED]: "User defined timeout for device code polling reached",
    [TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT]:
      "Cannot generate a POP jwt if the token_claims are not populated",
    [di]: "Server response does not contain an authorization code to proceed",
    [BINDING_KEY_NOT_REMOVED]: "Could not remove the credential's binding key from storage.",
    [END_SESSION_ENDPOINT_NOT_SUPPORTED]: "The provided authority does not support logout",
    [KEY_ID_MISSING]:
      "A keyId value is missing from the requested bound token's cache record and is required to match the token to it's stored binding key.",
    [NO_NETWORK_CONNECTIVITY]: "No network connectivity. Check your internet connection.",
    [USER_CANCELED]: "User cancelled the flow.",
    [MISSING_TENANT_ID_ERROR]:
      "A tenant id - not common, organizations, or consumers - must be specified when using the client_credentials flow.",
    [METHOD_NOT_IMPLEMENTED]: "This method has not been implemented",
    [NESTED_APP_AUTH_BRIDGE_DISABLED]: "The nested app auth bridge is disabled",
  },
  Bd = {
    clientInfoDecodingError: { code: CLIENT_INFO_DECODING_ERROR, desc: P[CLIENT_INFO_DECODING_ERROR] },
    clientInfoEmptyError: { code: CLIENT_INFO_EMPTY_ERROR, desc: P[CLIENT_INFO_EMPTY_ERROR] },
    tokenParsingError: { code: TOKEN_PARSING_ERROR, desc: P[TOKEN_PARSING_ERROR] },
    nullOrEmptyToken: { code: NULL_OR_EMPTY_TOKEN, desc: P[NULL_OR_EMPTY_TOKEN] },
    endpointResolutionError: { code: ENDPOINTS_RESOLUTION_ERROR, desc: P[ENDPOINTS_RESOLUTION_ERROR] },
    networkError: { code: NETWORK_ERROR, desc: P[NETWORK_ERROR] },
    unableToGetOpenidConfigError: { code: OPENID_CONFIG_ERROR, desc: P[OPENID_CONFIG_ERROR] },
    hashNotDeserialized: { code: HASH_NOT_DESERIALIZED, desc: P[HASH_NOT_DESERIALIZED] },
    invalidStateError: { code: INVALID_STATE, desc: P[INVALID_STATE] },
    stateMismatchError: { code: STATE_MISMATCH, desc: P[STATE_MISMATCH] },
    stateNotFoundError: { code: STATE_NOT_FOUND, desc: P[STATE_NOT_FOUND] },
    nonceMismatchError: { code: NONCE_MISMATCH, desc: P[NONCE_MISMATCH] },
    authTimeNotFoundError: { code: AUTH_TIME_NOT_FOUND, desc: P[AUTH_TIME_NOT_FOUND] },
    maxAgeTranspired: { code: MAX_AGE_TRANSPIRED, desc: P[MAX_AGE_TRANSPIRED] },
    multipleMatchingTokens: { code: MULTIPLE_MATCHING_TOKENS, desc: P[MULTIPLE_MATCHING_TOKENS] },
    multipleMatchingAccounts: { code: MULTIPLE_MATCHING_ACCOUNTS, desc: P[MULTIPLE_MATCHING_ACCOUNTS] },
    multipleMatchingAppMetadata: {
      code: MULTIPLE_MATCHING_APPMETADATA,
      desc: P[MULTIPLE_MATCHING_APPMETADATA],
    },
    tokenRequestCannotBeMade: { code: REQUEST_CANNOT_BE_MADE, desc: P[REQUEST_CANNOT_BE_MADE] },
    removeEmptyScopeError: { code: CANNOT_REMOVE_EMPTY_SCOPE, desc: P[CANNOT_REMOVE_EMPTY_SCOPE] },
    appendScopeSetError: { code: CANNOT_APPEND_SCOPESET, desc: P[CANNOT_APPEND_SCOPESET] },
    emptyInputScopeSetError: { code: EMPTY_INPUT_SCOPESET, desc: P[EMPTY_INPUT_SCOPESET] },
    DeviceCodePollingCancelled: {
      code: DEVICE_CODE_POLLING_CANCELLED,
      desc: P[DEVICE_CODE_POLLING_CANCELLED],
    },
    DeviceCodeExpired: { code: DEVICE_CODE_EXPIRED, desc: P[DEVICE_CODE_EXPIRED] },
    DeviceCodeUnknownError: { code: DEVICE_CODE_UNKNOWN_ERROR, desc: P[DEVICE_CODE_UNKNOWN_ERROR] },
    NoAccountInSilentRequest: { code: NO_ACCOUNT_IN_SILENT_REQUEST, desc: P[NO_ACCOUNT_IN_SILENT_REQUEST] },
    invalidCacheRecord: { code: INVALID_CACHE_RECORD, desc: P[INVALID_CACHE_RECORD] },
    invalidCacheEnvironment: { code: INVALID_CACHE_ENVIRONMENT, desc: P[INVALID_CACHE_ENVIRONMENT] },
    noAccountFound: { code: NO_ACCOUNT_FOUND, desc: P[NO_ACCOUNT_FOUND] },
    noCryptoObj: { code: NO_CRYPTO_OBJECT, desc: P[NO_CRYPTO_OBJECT] },
    unexpectedCredentialType: { code: UNEXPECTED_CREDENTIAL_TYPE, desc: P[UNEXPECTED_CREDENTIAL_TYPE] },
    invalidAssertion: { code: INVALID_ASSERTION, desc: P[INVALID_ASSERTION] },
    invalidClientCredential: { code: INVALID_CLIENT_CREDENTIAL, desc: P[INVALID_CLIENT_CREDENTIAL] },
    tokenRefreshRequired: { code: TOKEN_REFRESH_REQUIRED, desc: P[TOKEN_REFRESH_REQUIRED] },
    userTimeoutReached: { code: USER_TIMEOUT_REACHED, desc: P[USER_TIMEOUT_REACHED] },
    tokenClaimsRequired: {
      code: TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT,
      desc: P[TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT],
    },
    noAuthorizationCodeFromServer: { code: di, desc: P[di] },
    bindingKeyNotRemovedError: { code: BINDING_KEY_NOT_REMOVED, desc: P[BINDING_KEY_NOT_REMOVED] },
    logoutNotSupported: {
      code: END_SESSION_ENDPOINT_NOT_SUPPORTED,
      desc: P[END_SESSION_ENDPOINT_NOT_SUPPORTED],
    },
    keyIdMissing: { code: KEY_ID_MISSING, desc: P[KEY_ID_MISSING] },
    noNetworkConnectivity: { code: NO_NETWORK_CONNECTIVITY, desc: P[NO_NETWORK_CONNECTIVITY] },
    userCanceledError: { code: USER_CANCELED, desc: P[USER_CANCELED] },
    missingTenantIdError: { code: MISSING_TENANT_ID_ERROR, desc: P[MISSING_TENANT_ID_ERROR] },
    nestedAppAuthBridgeDisabled: {
      code: NESTED_APP_AUTH_BRIDGE_DISABLED,
      desc: P[NESTED_APP_AUTH_BRIDGE_DISABLED],
    },
  };
//@ chunk-mrx6y2r5.js:101913-102051 esm-fingerprint
class ClientAuthError extends AuthError {
  constructor(e, t) {
    super(e, t ? `${P[e]}: ${t}` : P[e]);
    ((this.name = "ClientAuthError"), Object.setPrototypeOf(this, ClientAuthError.prototype));
  }
}
//@ chunk-mrx6y2r5.js:102051-102086 esm-layout
function g(e, t) {
  return new ClientAuthError(e, t);
}
//@ chunk-mrx6y2r5.js:102131-102469 esm-fingerprint
var Tn = {
  createNewGuid: () => {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  base64Decode: () => {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  base64Encode: () => {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  base64UrlEncode: () => {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  encodeKid: () => {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  async getPublicKeyThumbprint() {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  async removeTokenBindingKey() {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  async clearKeystore() {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  async signJwt() {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
  async hashString() {
    throw g(METHOD_NOT_IMPLEMENTED);
  },
};
//@ chunk-mrx6y2r5.js:104757-104798 esm-fingerprint
var pi = "@azure/msal-common",
  En = "15.13.1";
//@ chunk-mrx6y2r5.js:104843-105098 esm-fingerprint
var Ht = {
  None: "none",
  AzurePublic: "https://login.microsoftonline.com",
  AzurePpe: "https://login.windows-ppe.net",
  AzureChina: "https://login.chinacloudapi.cn",
  AzureGermany: "https://login.microsoftonline.de",
  AzureUsGovernment: "https://login.microsoftonline.us",
};
//@ chunk-mrx6y2r5.js:105143-105815 esm-fingerprint
var REDIRECT_URI_EMPTY = "redirect_uri_empty",
  CLAIMS_REQUEST_PARSING_ERROR = "claims_request_parsing_error",
  AUTHORITY_URI_INSECURE = "authority_uri_insecure",
  URL_PARSE_ERROR = "url_parse_error",
  EMPTY_URL_ERROR = "empty_url_error",
  EMPTY_INPUT_SCOPES_ERROR = "empty_input_scopes_error",
  INVALID_CLAIMS = "invalid_claims",
  TOKEN_REQUEST_EMPTY = "token_request_empty",
  LOGOUT_REQUEST_EMPTY = "logout_request_empty",
  INVALID_CODE_CHALLENGE_METHOD = "invalid_code_challenge_method",
  PKCE_PARAMS_MISSING = "pkce_params_missing",
  INVALID_CLOUD_DISCOVERY_METADATA = "invalid_cloud_discovery_metadata",
  INVALID_AUTHORITY_METADATA = "invalid_authority_metadata",
  UNTRUSTED_AUTHORITY = "untrusted_authority",
  MISSING_SSH_JWK = "missing_ssh_jwk",
  MISSING_SSH_KID = "missing_ssh_kid",
  MISSING_NONCE_AUTHENTICATION_HEADER = "missing_nonce_authentication_header",
  INVALID_AUTHENTICATION_HEADER = "invalid_authentication_header",
  CANNOT_SET_OIDCOPTIONS = "cannot_set_OIDCOptions",
  CANNOT_ALLOW_PLATFORM_BROKER = "cannot_allow_platform_broker",
  AUTHORITY_MISMATCH = "authority_mismatch",
  INVALID_REQUEST_METHOD_FOR_EAR = "invalid_request_method_for_EAR",
  INVALID_AUTHORIZE_POST_BODY_PARAMETERS = "invalid_authorize_post_body_parameters";
//@ chunk-mrx6y2r5.js:105860-109541 esm-fingerprint
var ee = {
    [REDIRECT_URI_EMPTY]: "A redirect URI is required for all calls, and none has been set.",
    [CLAIMS_REQUEST_PARSING_ERROR]: "Could not parse the given claims request object.",
    [AUTHORITY_URI_INSECURE]:
      "Authority URIs must use https.  Please see here for valid authority configuration options: https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-js-initializing-client-applications#configuration-options",
    [URL_PARSE_ERROR]: "URL could not be parsed into appropriate segments.",
    [EMPTY_URL_ERROR]: "URL was empty or null.",
    [EMPTY_INPUT_SCOPES_ERROR]:
      "Scopes cannot be passed as null, undefined or empty array because they are required to obtain an access token.",
    [INVALID_CLAIMS]: "Given claims parameter must be a stringified JSON object.",
    [TOKEN_REQUEST_EMPTY]: "Token request was empty and not found in cache.",
    [LOGOUT_REQUEST_EMPTY]: "The logout request was null or undefined.",
    [INVALID_CODE_CHALLENGE_METHOD]:
      'code_challenge_method passed is invalid. Valid values are "plain" and "S256".',
    [PKCE_PARAMS_MISSING]:
      "Both params: code_challenge and code_challenge_method are to be passed if to be sent in the request",
    [INVALID_CLOUD_DISCOVERY_METADATA]:
      "Invalid cloudDiscoveryMetadata provided. Must be a stringified JSON object containing tenant_discovery_endpoint and metadata fields",
    [INVALID_AUTHORITY_METADATA]:
      "Invalid authorityMetadata provided. Must by a stringified JSON object containing authorization_endpoint, token_endpoint, issuer fields.",
    [UNTRUSTED_AUTHORITY]:
      "The provided authority is not a trusted authority. Please include this authority in the knownAuthorities config parameter.",
    [MISSING_SSH_JWK]:
      "Missing sshJwk in SSH certificate request. A stringified JSON Web Key is required when using the SSH authentication scheme.",
    [MISSING_SSH_KID]:
      "Missing sshKid in SSH certificate request. A string that uniquely identifies the public SSH key is required when using the SSH authentication scheme.",
    [MISSING_NONCE_AUTHENTICATION_HEADER]:
      "Unable to find an authentication header containing server nonce. Either the Authentication-Info or WWW-Authenticate headers must be present in order to obtain a server nonce.",
    [INVALID_AUTHENTICATION_HEADER]: "Invalid authentication header provided",
    [CANNOT_SET_OIDCOPTIONS]:
      "Cannot set OIDCOptions parameter. Please change the protocol mode to OIDC or use a non-Microsoft authority.",
    [CANNOT_ALLOW_PLATFORM_BROKER]:
      "Cannot set allowPlatformBroker parameter to true when not in AAD protocol mode.",
    [AUTHORITY_MISMATCH]:
      "Authority mismatch error. Authority provided in login request or PublicClientApplication config does not match the environment of the provided account. Please use a matching account or make an interactive request to login to this authority.",
    [INVALID_AUTHORIZE_POST_BODY_PARAMETERS]:
      "Invalid authorize post body parameters provided. If you are using authorizePostBodyParameters, the request method must be POST. Please check the request method and parameters.",
    [INVALID_REQUEST_METHOD_FOR_EAR]:
      "Invalid request method for EAR protocol mode. The request method cannot be GET when using EAR protocol mode. Please change the request method to POST.",
  },
  zd = {
    redirectUriNotSet: { code: REDIRECT_URI_EMPTY, desc: ee[REDIRECT_URI_EMPTY] },
    claimsRequestParsingError: { code: CLAIMS_REQUEST_PARSING_ERROR, desc: ee[CLAIMS_REQUEST_PARSING_ERROR] },
    authorityUriInsecure: { code: AUTHORITY_URI_INSECURE, desc: ee[AUTHORITY_URI_INSECURE] },
    urlParseError: { code: URL_PARSE_ERROR, desc: ee[URL_PARSE_ERROR] },
    urlEmptyError: { code: EMPTY_URL_ERROR, desc: ee[EMPTY_URL_ERROR] },
    emptyScopesError: { code: EMPTY_INPUT_SCOPES_ERROR, desc: ee[EMPTY_INPUT_SCOPES_ERROR] },
    invalidClaimsRequest: { code: INVALID_CLAIMS, desc: ee[INVALID_CLAIMS] },
    tokenRequestEmptyError: { code: TOKEN_REQUEST_EMPTY, desc: ee[TOKEN_REQUEST_EMPTY] },
    logoutRequestEmptyError: { code: LOGOUT_REQUEST_EMPTY, desc: ee[LOGOUT_REQUEST_EMPTY] },
    invalidCodeChallengeMethod: {
      code: INVALID_CODE_CHALLENGE_METHOD,
      desc: ee[INVALID_CODE_CHALLENGE_METHOD],
    },
    invalidCodeChallengeParams: { code: PKCE_PARAMS_MISSING, desc: ee[PKCE_PARAMS_MISSING] },
    invalidCloudDiscoveryMetadata: {
      code: INVALID_CLOUD_DISCOVERY_METADATA,
      desc: ee[INVALID_CLOUD_DISCOVERY_METADATA],
    },
    invalidAuthorityMetadata: { code: INVALID_AUTHORITY_METADATA, desc: ee[INVALID_AUTHORITY_METADATA] },
    untrustedAuthority: { code: UNTRUSTED_AUTHORITY, desc: ee[UNTRUSTED_AUTHORITY] },
    missingSshJwk: { code: MISSING_SSH_JWK, desc: ee[MISSING_SSH_JWK] },
    missingSshKid: { code: MISSING_SSH_KID, desc: ee[MISSING_SSH_KID] },
    missingNonceAuthenticationHeader: {
      code: MISSING_NONCE_AUTHENTICATION_HEADER,
      desc: ee[MISSING_NONCE_AUTHENTICATION_HEADER],
    },
    invalidAuthenticationHeader: {
      code: INVALID_AUTHENTICATION_HEADER,
      desc: ee[INVALID_AUTHENTICATION_HEADER],
    },
    cannotSetOIDCOptions: { code: CANNOT_SET_OIDCOPTIONS, desc: ee[CANNOT_SET_OIDCOPTIONS] },
    cannotAllowPlatformBroker: { code: CANNOT_ALLOW_PLATFORM_BROKER, desc: ee[CANNOT_ALLOW_PLATFORM_BROKER] },
    authorityMismatch: { code: AUTHORITY_MISMATCH, desc: ee[AUTHORITY_MISMATCH] },
    invalidAuthorizePostBodyParameters: {
      code: INVALID_AUTHORIZE_POST_BODY_PARAMETERS,
      desc: ee[INVALID_AUTHORIZE_POST_BODY_PARAMETERS],
    },
    invalidRequestMethodForEAR: {
      code: INVALID_REQUEST_METHOD_FOR_EAR,
      desc: ee[INVALID_REQUEST_METHOD_FOR_EAR],
    },
  };
//@ chunk-mrx6y2r5.js:109541-109669 esm-fingerprint
class ClientConfigurationError extends AuthError {
  constructor(e) {
    super(e, ee[e]);
    ((this.name = "ClientConfigurationError"),
      Object.setPrototypeOf(this, ClientConfigurationError.prototype));
  }
}
//@ chunk-mrx6y2r5.js:109669-109700 esm-layout
function V(e) {
  return new ClientConfigurationError(e);
}
//@ chunk-mrx6y2r5.js:109745-110494 esm-fingerprint
class re {
  static isEmptyObj(e) {
    if (e)
      try {
        let parsed = JSON.parse(e);
        return Object.keys(parsed).length === 0;
      } catch (error) {}
    return !0;
  }
  static startsWith(e, t) {
    return e.indexOf(t) === 0;
  }
  static endsWith(e, t) {
    return e.length >= t.length && e.lastIndexOf(t) === e.length - t.length;
  }
  static queryStringToObject(e) {
    let t = {},
      parts = e.split("&"),
      n = (o) => decodeURIComponent(o.replace(/\+/g, " "));
    return (
      parts.forEach((o) => {
        if (o.trim()) {
          let [i, s] = o.split(/=(.+)/g, 2);
          if (i && s) t[n(i)] = n(s);
        }
      }),
      t
    );
  }
  static trimArrayEntries(e) {
    return e.map((t) => t.trim());
  }
  static removeEmptyStringsFromArray(e) {
    return e.filter((t) => !!t);
  }
  static jsonParseHelper(e) {
    try {
      return JSON.parse(e);
    } catch (error) {
      return null;
    }
  }
  static matchPattern(e, t) {
    return new RegExp(e.replace(/\\/g, "\\\\").replace(/\*/g, "[^ ]*").replace(/\?/g, "\\?")).test(t);
  }
}
//@ chunk-mrx6y2r5.js:110539-112178 esm-fingerprint
class oe {
  constructor(e) {
    let t = e ? re.trimArrayEntries([...e]) : [],
      r = t ? re.removeEmptyStringsFromArray(t) : [];
    if (!r || !r.length) throw V(EMPTY_INPUT_SCOPES_ERROR);
    ((this.scopes = new Set()), r.forEach((n) => this.scopes.add(n)));
  }
  static fromString(e) {
    let parts = (e || f.EMPTY_STRING).split(" ");
    return new oe(parts);
  }
  static createSearchScopes(e) {
    let t = e && e.length > 0 ? e : [...ye],
      r = new oe(t);
    if (!r.containsOnlyOIDCScopes()) r.removeOIDCScopes();
    else r.removeScope(f.OFFLINE_ACCESS_SCOPE);
    return r;
  }
  containsScope(e) {
    let parts = this.printScopesLowerCase().split(" "),
      r = new oe(parts);
    return e ? r.scopes.has(e.toLowerCase()) : !1;
  }
  containsScopeSet(e) {
    if (!e || e.scopes.size <= 0) return !1;
    return this.scopes.size >= e.scopes.size && e.asArray().every((t) => this.containsScope(t));
  }
  containsOnlyOIDCScopes() {
    let e = 0;
    return (
      Sa.forEach((t) => {
        if (this.containsScope(t)) e += 1;
      }),
      this.scopes.size === e
    );
  }
  appendScope(e) {
    if (e) this.scopes.add(e.trim());
  }
  appendScopes(e) {
    try {
      e.forEach((t) => this.appendScope(t));
    } catch (error) {
      throw g(CANNOT_APPEND_SCOPESET);
    }
  }
  removeScope(e) {
    if (!e) throw g(CANNOT_REMOVE_EMPTY_SCOPE);
    this.scopes.delete(e.trim());
  }
  removeOIDCScopes() {
    Sa.forEach((e) => {
      this.scopes.delete(e);
    });
  }
  unionScopeSets(e) {
    if (!e) throw g(EMPTY_INPUT_SCOPESET);
    let t = new Set();
    return (
      e.scopes.forEach((scope) => t.add(scope.toLowerCase())),
      this.scopes.forEach((scope) => t.add(scope.toLowerCase())),
      t
    );
  }
  intersectingScopeSets(e) {
    if (!e) throw g(EMPTY_INPUT_SCOPESET);
    if (!e.containsOnlyOIDCScopes()) e.removeOIDCScopes();
    let unionScopeSets = this.unionScopeSets(e),
      scopeCount = e.getScopeCount(),
      scopeCount_2 = this.getScopeCount();
    return unionScopeSets.size < scopeCount_2 + scopeCount;
  }
  getScopeCount() {
    return this.scopes.size;
  }
  asArray() {
    let e = [];
    return (this.scopes.forEach((scope) => e.push(scope)), e);
  }
  printScopes() {
    if (this.scopes) return this.asArray().join(" ");
    return f.EMPTY_STRING;
  }
  printScopesLowerCase() {
    return this.printScopes().toLowerCase();
  }
}
//@ chunk-mrx6y2r5.js:112223-112316 esm-layout
function kn(e, t) {
  if (!e) throw g(CLIENT_INFO_EMPTY_ERROR);
  try {
    let r = t(e);
    return JSON.parse(r);
  } catch (error) {
    throw g(CLIENT_INFO_DECODING_ERROR);
  }
}
//@ chunk-mrx6y2r5.js:112316-112444 esm-fingerprint
function st(e) {
  if (!e) throw g(CLIENT_INFO_DECODING_ERROR);
  let parts = e.split(pt.CLIENT_INFO_SEPARATOR, 2);
  return { uid: parts[0], utid: parts.length < 2 ? f.EMPTY_STRING : parts[1] };
}
//@ chunk-mrx6y2r5.js:112489-112542 esm-layout
function Gd(e, t) {
  return !!e && !!t && e === t.split(".")[1];
}
//@ chunk-mrx6y2r5.js:112542-112842 esm-fingerprint
function po(e, t, r, n) {
  if (n) {
    let {
        oid: oid,
        sub: sub,
        tid: tid,
        name: a,
        tfp: tfp,
        acr: acr,
        preferred_username: preferred_username,
        upn: upn,
        login_hint: login_hint,
      } = n,
      p = tid || tfp || acr || "";
    return {
      tenantId: p,
      localAccountId: oid || sub || "",
      name: a,
      username: preferred_username || upn || "",
      loginHint: login_hint,
      isHomeTenant: Gd(p, e),
    };
  } else return { tenantId: r, localAccountId: t, username: "", isHomeTenant: Gd(r, e) };
}
//@ chunk-mrx6y2r5.js:112842-113057 esm-fingerprint
function wi(e, t, r, n) {
  let o = e;
  if (t) {
    let { isHomeTenant: isHomeTenant, ...s } = t;
    o = { ...e, ...s };
  }
  if (r) {
    let { isHomeTenant: isHomeTenant, ...s } = po(e.homeAccountId, e.localAccountId, e.tenantId, r);
    return ((o = { ...o, ...s, idTokenClaims: r, idToken: n }), o);
  }
  return o;
}
//@ chunk-mrx6y2r5.js:113102-113142 esm-fingerprint
var Ge = { Default: 0, Adfs: 1, Dsts: 2, Ciam: 3 };
//@ chunk-mrx6y2r5.js:113187-113252 esm-fingerprint
function vi(e) {
  if (e) return e.tid || e.tfp || e.acr || null;
  return null;
}
//@ chunk-mrx6y2r5.js:113297-113338 esm-fingerprint
var Ae = { AAD: "AAD", OIDC: "OIDC", EAR: "EAR" };
//@ chunk-mrx6y2r5.js:113383-116143 esm-fingerprint
class fe {
  static getAccountInfo(e) {
    return {
      homeAccountId: e.homeAccountId,
      environment: e.environment,
      tenantId: e.realm,
      username: e.username,
      localAccountId: e.localAccountId,
      loginHint: e.loginHint,
      name: e.name,
      nativeAccountId: e.nativeAccountId,
      authorityType: e.authorityType,
      tenantProfiles: new Map((e.tenantProfiles || []).map((t) => [t.tenantId, t])),
      dataBoundary: e.dataBoundary,
    };
  }
  isSingleTenant() {
    return !this.tenantProfiles;
  }
  static createAccount(e, t, r) {
    let n = new fe();
    if (t.authorityType === Ge.Adfs) n.authorityType = ir.ADFS_ACCOUNT_TYPE;
    else if (t.protocolMode === Ae.OIDC) n.authorityType = ir.GENERIC_ACCOUNT_TYPE;
    else n.authorityType = ir.MSSTS_ACCOUNT_TYPE;
    let o;
    if (e.clientInfo && r) {
      if (((o = kn(e.clientInfo, r)), o.xms_tdbr)) n.dataBoundary = o.xms_tdbr === "EU" ? "EU" : "None";
    }
    ((n.clientInfo = e.clientInfo),
      (n.homeAccountId = e.homeAccountId),
      (n.nativeAccountId = e.nativeAccountId));
    let i = e.environment || (t && t.getPreferredCache());
    if (!i) throw g(INVALID_CACHE_ENVIRONMENT);
    ((n.environment = i),
      (n.realm = o?.utid || vi(e.idTokenClaims) || ""),
      (n.localAccountId = o?.uid || e.idTokenClaims?.oid || e.idTokenClaims?.sub || ""));
    let s = e.idTokenClaims?.preferred_username || e.idTokenClaims?.upn,
      a = e.idTokenClaims?.emails ? e.idTokenClaims.emails[0] : null;
    if (
      ((n.username = s || a || ""),
      (n.loginHint = e.idTokenClaims?.login_hint),
      (n.name = e.idTokenClaims?.name || ""),
      (n.cloudGraphHostName = e.cloudGraphHostName),
      (n.msGraphHost = e.msGraphHost),
      e.tenantProfiles)
    )
      n.tenantProfiles = e.tenantProfiles;
    else {
      let c = po(e.homeAccountId, n.localAccountId, n.realm, e.idTokenClaims);
      n.tenantProfiles = [c];
    }
    return n;
  }
  static createFromAccountInfo(e, t, r) {
    let n = new fe();
    return (
      (n.authorityType = e.authorityType || ir.GENERIC_ACCOUNT_TYPE),
      (n.homeAccountId = e.homeAccountId),
      (n.localAccountId = e.localAccountId),
      (n.nativeAccountId = e.nativeAccountId),
      (n.realm = e.tenantId),
      (n.environment = e.environment),
      (n.username = e.username),
      (n.name = e.name),
      (n.loginHint = e.loginHint),
      (n.cloudGraphHostName = t),
      (n.msGraphHost = r),
      (n.tenantProfiles = Array.from(e.tenantProfiles?.values() || [])),
      (n.dataBoundary = e.dataBoundary),
      n
    );
  }
  static generateHomeAccountId(e, t, r, n, o) {
    if (!(t === Ge.Adfs || t === Ge.Dsts)) {
      if (e)
        try {
          let i = kn(e, n.base64Decode);
          if (i.uid && i.utid) return `${i.uid}.${i.utid}`;
        } catch (error) {}
      r.warning("No client info in response");
    }
    return o?.sub || "";
  }
  static isAccountEntity(e) {
    if (!e) return !1;
    return (
      e.hasOwnProperty("homeAccountId") &&
      e.hasOwnProperty("environment") &&
      e.hasOwnProperty("realm") &&
      e.hasOwnProperty("localAccountId") &&
      e.hasOwnProperty("username") &&
      e.hasOwnProperty("authorityType")
    );
  }
  static accountInfoIsEqual(e, t, r) {
    if (!e || !t) return !1;
    let n = !0;
    if (r) {
      let o = e.idTokenClaims || {},
        i = t.idTokenClaims || {};
      n = o.iat === i.iat && o.nonce === i.nonce;
    }
    return (
      e.homeAccountId === t.homeAccountId &&
      e.localAccountId === t.localAccountId &&
      e.username === t.username &&
      e.tenantId === t.tenantId &&
      e.loginHint === t.loginHint &&
      e.environment === t.environment &&
      e.nativeAccountId === t.nativeAccountId &&
      n
    );
  }
}
//@ chunk-mrx6y2r5.js:116188-116275 esm-layout
function yt(e, t) {
  let r = mg(e);
  try {
    let n = t(r);
    return JSON.parse(n);
  } catch (error) {
    throw g(TOKEN_PARSING_ERROR);
  }
}
//@ chunk-mrx6y2r5.js:116275-116412 esm-fingerprint
function qd(e) {
  if (!e.signin_state) return !1;
  let t = ["kmsi", "dvc_dmjd"];
  return e.signin_state.some((n) => t.includes(n.trim().toLowerCase()));
}
//@ chunk-mrx6y2r5.js:116412-116540 esm-fingerprint
function mg(e) {
  if (!e) throw g(NULL_OR_EMPTY_TOKEN);
  let match = /^([^\.\s]*)\.([^\.\s]+)\.([^\.\s]*)$/.exec(e);
  if (!match || match.length < 4) throw g(TOKEN_PARSING_ERROR);
  return match[2];
}
//@ chunk-mrx6y2r5.js:116540-116601 esm-fingerprint
function ki(e, t) {
  if (t === 0 || Date.now() - 300000 > e + t) throw g(MAX_AGE_TRANSPIRED);
}
//@ chunk-mrx6y2r5.js:116646-116781 esm-fingerprint
function pg(e) {
  if (e.startsWith("#/")) return e.substring(2);
  else if (e.startsWith("#") || e.startsWith("?")) return e.substring(1);
  return e;
}
//@ chunk-mrx6y2r5.js:116781-116995 esm-fingerprint
function ka(e) {
  if (!e || e.indexOf("=") < 0) return null;
  try {
    let t = pg(e),
      fromEntries = Object.fromEntries(new URLSearchParams(t));
    if (
      fromEntries.code ||
      fromEntries.ear_jwe ||
      fromEntries.error ||
      fromEntries.error_description ||
      fromEntries.state
    )
      return fromEntries;
  } catch (error) {
    throw g(HASH_NOT_DESERIALIZED);
  }
  return null;
}
//@ chunk-mrx6y2r5.js:116995-117147 esm-fingerprint
function pe(e, t = !0, r) {
  let n = [];
  return (
    e.forEach((o, i) => {
      if (!t && r && i in r) n.push(`${i}=${o}`);
      else n.push(`${i}=${encodeURIComponent(o)}`);
    }),
    n.join("&")
  );
}
//@ chunk-mrx6y2r5.js:117192-118913 esm-fingerprint
class N {
  get urlString() {
    return this._urlString;
  }
  constructor(e) {
    if (((this._urlString = e), !this._urlString)) throw V(EMPTY_URL_ERROR);
    if (!e.includes("#")) this._urlString = N.canonicalizeUri(e);
  }
  static canonicalizeUri(e) {
    if (e) {
      let lower = e.toLowerCase();
      if (re.endsWith(lower, "?")) lower = lower.slice(0, -1);
      else if (re.endsWith(lower, "?/")) lower = lower.slice(0, -2);
      if (!re.endsWith(lower, "/")) lower += "/";
      return lower;
    }
    return e;
  }
  validateAsUri() {
    let e;
    try {
      e = this.getUrlComponents();
    } catch (error) {
      throw V(URL_PARSE_ERROR);
    }
    if (!e.HostNameAndPort || !e.PathSegments) throw V(URL_PARSE_ERROR);
    if (!e.Protocol || e.Protocol.toLowerCase() !== "https:") throw V(AUTHORITY_URI_INSECURE);
  }
  static appendQueryString(e, t) {
    if (!t) return e;
    return e.indexOf("?") < 0 ? `${e}?${t}` : `${e}&${t}`;
  }
  static removeHashFromUrl(e) {
    return N.canonicalizeUri(e.split("#")[0]);
  }
  replaceTenantPath(e) {
    let urlComponents = this.getUrlComponents(),
      PathSegments = urlComponents.PathSegments;
    if (
      e &&
      PathSegments.length !== 0 &&
      (PathSegments[0] === be.COMMON || PathSegments[0] === be.ORGANIZATIONS)
    )
      PathSegments[0] = e;
    return N.constructAuthorityUriFromObject(urlComponents);
  }
  getUrlComponents() {
    let e = RegExp("^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?"),
      match = this.urlString.match(e);
    if (!match) throw V(URL_PARSE_ERROR);
    let r = { Protocol: match[1], HostNameAndPort: match[4], AbsolutePath: match[5], QueryString: match[7] },
      parts = r.AbsolutePath.split("/");
    if (
      ((parts = parts.filter((o) => o && o.length > 0)),
      (r.PathSegments = parts),
      r.QueryString && r.QueryString.endsWith("/"))
    )
      r.QueryString = r.QueryString.substring(0, r.QueryString.length - 1);
    return r;
  }
  static getDomainFromUrl(e) {
    let t = RegExp("^([^:/?#]+://)?([^/?#]*)"),
      match = e.match(t);
    if (!match) throw V(URL_PARSE_ERROR);
    return match[2];
  }
  static getAbsoluteUrl(e, t) {
    if (e[0] === f.FORWARD_SLASH) {
      let urlComponents = new N(t).getUrlComponents();
      return urlComponents.Protocol + "//" + urlComponents.HostNameAndPort + e;
    }
    return e;
  }
  static constructAuthorityUriFromObject(e) {
    return new N(e.Protocol + "//" + e.HostNameAndPort + "/" + e.PathSegments.join("/"));
  }
  static hashContainsKnownProperties(e) {
    return !!ka(e);
  }
}
//@ chunk-mrx6y2r5.js:118958-121125 esm-fingerprint
var jd = {
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
          aliases: [
            "login.microsoftonline.com",
            "login.windows.net",
            "login.microsoft.com",
            "sts.windows.net",
          ],
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
  },
  { endpointMetadata: endpointMetadata, instanceDiscoveryMetadata: instanceDiscoveryMetadata } = jd,
  Oa = new Set();
//@ chunk-mrx6y2r5.js:121125-121189 esm-fingerprint
instanceDiscoveryMetadata.metadata.forEach((e) => {
  e.aliases.forEach((aliase) => {
    Oa.add(aliase);
  });
});
//@ chunk-mrx6y2r5.js:121189-121420 esm-fingerprint
function Yd(e, t) {
  let r,
    canonicalAuthority = e.canonicalAuthority;
  if (canonicalAuthority) {
    let HostNameAndPort = new N(canonicalAuthority).getUrlComponents().HostNameAndPort;
    r =
      Vd(HostNameAndPort, e.cloudDiscoveryMetadata?.metadata, Ce.CONFIG, t) ||
      Vd(HostNameAndPort, instanceDiscoveryMetadata.metadata, Ce.HARDCODED_VALUES, t) ||
      e.knownAuthorities;
  }
  return r || [];
}
//@ chunk-mrx6y2r5.js:121420-121739 esm-fingerprint
function Vd(e, t, r, n) {
  if ((n?.trace(`getAliasesFromMetadata called with source: ${r}`), e && t)) {
    let o = go(t, e);
    if (o)
      return (
        n?.trace(`getAliasesFromMetadata: found cloud discovery metadata in ${r}, returning aliases`),
        o.aliases
      );
    else n?.trace(`getAliasesFromMetadata: did not find cloud discovery metadata in ${r}`);
  }
  return null;
}
//@ chunk-mrx6y2r5.js:121739-121779 esm-fingerprint
function Wd(e) {
  return go(instanceDiscoveryMetadata.metadata, e);
}
//@ chunk-mrx6y2r5.js:121779-121881 esm-fingerprint
function go(e, t) {
  for (let r = 0; r < e.length; r++) {
    let n = e[r];
    if (n.aliases.includes(t)) return n;
  }
  return null;
}
//@ chunk-mrx6y2r5.js:121926-121981 esm-fingerprint
var CACHE_QUOTA_EXCEEDED = "cache_quota_exceeded",
  CACHE_ERROR_UNKNOWN = "cache_error_unknown";
//@ chunk-mrx6y2r5.js:122026-122134 esm-fingerprint
var xa = {
  [CACHE_QUOTA_EXCEEDED]: "Exceeded cache storage capacity.",
  [CACHE_ERROR_UNKNOWN]: "Unexpected error occurred when using cache storage.",
};
//@ chunk-mrx6y2r5.js:122134-122322 esm-fingerprint
class CacheError extends AuthError {
  constructor(e, t) {
    let r = t || (xa[e] ? xa[e] : xa[CACHE_ERROR_UNKNOWN]);
    super(`${e}: ${r}`);
    (Object.setPrototypeOf(this, CacheError.prototype),
      (this.name = "CacheError"),
      (this.errorCode = e),
      (this.errorMessage = r));
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
class yr {
  constructor(e, t, r, n, o) {
    ((this.clientId = e),
      (this.cryptoImpl = t),
      (this.commonLogger = r.clone(pi, En)),
      (this.staticAuthorityOptions = o),
      (this.performanceClient = n));
  }
  getAllAccounts(e, t) {
    return this.buildTenantProfiles(this.getAccountsFilteredBy(e, t), t, e);
  }
  getAccountInfoFilteredBy(e, t) {
    if (Object.keys(e).length === 0 || Object.values(e).every((n) => !n))
      return (
        this.commonLogger.warning(
          "getAccountInfoFilteredBy: Account filter is empty or invalid, returning null",
        ),
        null
      );
    let allAccounts = this.getAllAccounts(e, t);
    if (allAccounts.length > 1) return allAccounts.sort((o) => (o.idTokenClaims ? -1 : 1))[0];
    else if (allAccounts.length === 1) return allAccounts[0];
    else return null;
  }
  getBaseAccountInfo(e, t) {
    let accountsFilteredBy = this.getAccountsFilteredBy(e, t);
    if (accountsFilteredBy.length > 0) return fe.getAccountInfo(accountsFilteredBy[0]);
    else return null;
  }
  buildTenantProfiles(e, t, r) {
    return e.flatMap((n) => this.getTenantProfilesFromAccountEntity(n, t, r?.tenantId, r));
  }
  getTenantedAccountInfoByFilter(e, t, r, n, o) {
    let i = null,
      s;
    if (o) {
      if (!this.tenantProfileMatchesFilter(r, o)) return null;
    }
    let idToken = this.getIdToken(e, n, t, r.tenantId);
    if (idToken) {
      if (
        ((s = yt(idToken.secret, this.cryptoImpl.base64Decode)),
        !this.idTokenClaimsMatchTenantProfileFilter(s, o))
      )
        return null;
    }
    return ((i = wi(e, r, s, idToken?.secret)), i);
  }
  getTenantProfilesFromAccountEntity(e, t, r, n) {
    let accountInfo = fe.getAccountInfo(e),
      i = accountInfo.tenantProfiles || new Map(),
      tokenKeys = this.getTokenKeys();
    if (r) {
      let c = i.get(r);
      if (c) i = new Map([[r, c]]);
      else return [];
    }
    let a = [];
    return (
      i.forEach((c) => {
        let tenantedAccountInfoByFilter = this.getTenantedAccountInfoByFilter(
          accountInfo,
          tokenKeys,
          c,
          t,
          n,
        );
        if (tenantedAccountInfoByFilter) a.push(tenantedAccountInfoByFilter);
      }),
      a
    );
  }
  tenantProfileMatchesFilter(e, t) {
    if (!!t.localAccountId && !this.matchLocalAccountIdFromTenantProfile(e, t.localAccountId)) return !1;
    if (!!t.name && e.name !== t.name) return !1;
    if (t.isHomeTenant !== void 0 && e.isHomeTenant !== t.isHomeTenant) return !1;
    return !0;
  }
  idTokenClaimsMatchTenantProfileFilter(e, t) {
    if (t) {
      if (!!t.localAccountId && !this.matchLocalAccountIdFromTokenClaims(e, t.localAccountId)) return !1;
      if (!!t.loginHint && !this.matchLoginHintFromTokenClaims(e, t.loginHint)) return !1;
      if (!!t.username && !this.matchUsername(e.preferred_username, t.username)) return !1;
      if (!!t.name && !this.matchName(e, t.name)) return !1;
      if (!!t.sid && !this.matchSid(e, t.sid)) return !1;
    }
    return !0;
  }
  async saveCacheRecord(e, t, r, n) {
    if (!e) throw g(INVALID_CACHE_RECORD);
    try {
      if (e.account) await this.setAccount(e.account, t, r);
      if (!!e.idToken && n?.idToken !== !1) await this.setIdTokenCredential(e.idToken, t, r);
      if (!!e.accessToken && n?.accessToken !== !1) await this.saveAccessToken(e.accessToken, t, r);
      if (!!e.refreshToken && n?.refreshToken !== !1)
        await this.setRefreshTokenCredential(e.refreshToken, t, r);
      if (e.appMetadata) this.setAppMetadata(e.appMetadata, t);
    } catch (error) {
      if ((this.commonLogger?.error("CacheManager.saveCacheRecord: failed"), error instanceof AuthError))
        throw error;
      else throw Qd(error);
    }
  }
  async saveAccessToken(e, t, r) {
    let n = {
        clientId: e.clientId,
        credentialType: e.credentialType,
        environment: e.environment,
        homeAccountId: e.homeAccountId,
        realm: e.realm,
        tokenType: e.tokenType,
        requestedClaimsHash: e.requestedClaimsHash,
      },
      tokenKeys = this.getTokenKeys(),
      fromString = oe.fromString(e.target);
    (tokenKeys.accessToken.forEach((s) => {
      if (!this.accessTokenKeyMatchesFilter(s, n, !1)) return;
      let accessTokenCredential = this.getAccessTokenCredential(s, t);
      if (accessTokenCredential && this.credentialMatchesFilter(accessTokenCredential, n)) {
        if (oe.fromString(accessTokenCredential.target).intersectingScopeSets(fromString))
          this.removeAccessToken(s, t);
      }
    }),
      await this.setAccessTokenCredential(e, t, r));
  }
  getAccountsFilteredBy(e, t) {
    let accountKeys = this.getAccountKeys(),
      n = [];
    return (
      accountKeys.forEach((o) => {
        let account = this.getAccount(o, t);
        if (!account) return;
        if (!!e.homeAccountId && !this.matchHomeAccountId(account, e.homeAccountId)) return;
        if (!!e.username && !this.matchUsername(account.username, e.username)) return;
        if (!!e.environment && !this.matchEnvironment(account, e.environment)) return;
        if (!!e.realm && !this.matchRealm(account, e.realm)) return;
        if (!!e.nativeAccountId && !this.matchNativeAccountId(account, e.nativeAccountId)) return;
        if (!!e.authorityType && !this.matchAuthorityType(account, e.authorityType)) return;
        let s = { localAccountId: e?.localAccountId, name: e?.name },
          a = account.tenantProfiles?.filter((c) => this.tenantProfileMatchesFilter(c, s));
        if (a && a.length === 0) return;
        n.push(account);
      }),
      n
    );
  }
  credentialMatchesFilter(e, t) {
    if (!!t.clientId && !this.matchClientId(e, t.clientId)) return !1;
    if (!!t.userAssertionHash && !this.matchUserAssertionHash(e, t.userAssertionHash)) return !1;
    if (typeof t.homeAccountId === "string" && !this.matchHomeAccountId(e, t.homeAccountId)) return !1;
    if (!!t.environment && !this.matchEnvironment(e, t.environment)) return !1;
    if (!!t.realm && !this.matchRealm(e, t.realm)) return !1;
    if (!!t.credentialType && !this.matchCredentialType(e, t.credentialType)) return !1;
    if (!!t.familyId && !this.matchFamilyId(e, t.familyId)) return !1;
    if (!!t.target && !this.matchTarget(e, t.target)) return !1;
    if (t.requestedClaimsHash || e.requestedClaimsHash) {
      if (e.requestedClaimsHash !== t.requestedClaimsHash) return !1;
    }
    if (e.credentialType === K.ACCESS_TOKEN_WITH_AUTH_SCHEME) {
      if (!!t.tokenType && !this.matchTokenType(e, t.tokenType)) return !1;
      if (t.tokenType === L.SSH) {
        if (t.keyId && !this.matchKeyId(e, t.keyId)) return !1;
      }
    }
    return !0;
  }
  getAppMetadataFilteredBy(e) {
    let keys = this.getKeys(),
      r = {};
    return (
      keys.forEach((n) => {
        if (!this.isAppMetadata(n)) return;
        let appMetadata = this.getAppMetadata(n);
        if (!appMetadata) return;
        if (!!e.environment && !this.matchEnvironment(appMetadata, e.environment)) return;
        if (!!e.clientId && !this.matchClientId(appMetadata, e.clientId)) return;
        r[n] = appMetadata;
      }),
      r
    );
  }
  getAuthorityMetadataByAlias(e) {
    let authorityMetadataKeys = this.getAuthorityMetadataKeys(),
      r = null;
    return (
      authorityMetadataKeys.forEach((n) => {
        if (!this.isAuthorityMetadata(n) || n.indexOf(this.clientId) === -1) return;
        let authorityMetadata = this.getAuthorityMetadata(n);
        if (!authorityMetadata) return;
        if (authorityMetadata.aliases.indexOf(e) === -1) return;
        r = authorityMetadata;
      }),
      r
    );
  }
  removeAllAccounts(e) {
    this.getAllAccounts({}, e).forEach((r) => {
      this.removeAccount(r, e);
    });
  }
  removeAccount(e, t) {
    this.removeAccountContext(e, t);
    let accountKeys = this.getAccountKeys(),
      n = (o) => o.includes(e.homeAccountId) && o.includes(e.environment);
    accountKeys.filter(n).forEach((o) => {
      (this.removeItem(o, t), this.performanceClient.incrementFields({ accountsRemoved: 1 }, t));
    });
  }
  removeAccountContext(e, t) {
    let tokenKeys = this.getTokenKeys(),
      n = (o) => o.includes(e.homeAccountId) && o.includes(e.environment);
    (tokenKeys.idToken.filter(n).forEach((o) => {
      this.removeIdToken(o, t);
    }),
      tokenKeys.accessToken.filter(n).forEach((o) => {
        this.removeAccessToken(o, t);
      }),
      tokenKeys.refreshToken.filter(n).forEach((o) => {
        this.removeRefreshToken(o, t);
      }));
  }
  removeAccessToken(e, t) {
    let accessTokenCredential = this.getAccessTokenCredential(e, t);
    if (
      (this.removeItem(e, t),
      this.performanceClient.incrementFields({ accessTokensRemoved: 1 }, t),
      !accessTokenCredential ||
        accessTokenCredential.credentialType.toLowerCase() !==
          K.ACCESS_TOKEN_WITH_AUTH_SCHEME.toLowerCase() ||
        accessTokenCredential.tokenType !== L.POP)
    )
      return;
    let keyId = accessTokenCredential.keyId;
    if (keyId)
      this.cryptoImpl.removeTokenBindingKey(keyId).catch(() => {
        (this.commonLogger.error(`Failed to remove token binding key ${keyId}`, t),
          this.performanceClient?.incrementFields({ removeTokenBindingKeyFailure: 1 }, t));
      });
  }
  removeAppMetadata(e) {
    return (
      this.getKeys().forEach((r) => {
        if (this.isAppMetadata(r)) this.removeItem(r, e);
      }),
      !0
    );
  }
  getIdToken(e, t, r, n, o) {
    this.commonLogger.trace("CacheManager - getIdToken called");
    let i = {
        homeAccountId: e.homeAccountId,
        environment: e.environment,
        credentialType: K.ID_TOKEN,
        clientId: this.clientId,
        realm: n,
      },
      idTokensByFilter = this.getIdTokensByFilter(i, t, r),
      size = idTokensByFilter.size;
    if (size < 1) return (this.commonLogger.info("CacheManager:getIdToken - No token found"), null);
    else if (size > 1) {
      let c = idTokensByFilter;
      if (!n) {
        let l = new Map();
        idTokensByFilter.forEach((u, m) => {
          if (u.realm === e.tenantId) l.set(m, u);
        });
        let size = l.size;
        if (size < 1)
          return (
            this.commonLogger.info(
              "CacheManager:getIdToken - Multiple ID tokens found for account but none match account entity tenant id, returning first result",
            ),
            idTokensByFilter.values().next().value
          );
        else if (size === 1)
          return (
            this.commonLogger.info(
              "CacheManager:getIdToken - Multiple ID tokens found for account, defaulting to home tenant profile",
            ),
            l.values().next().value
          );
        else c = l;
      }
      if (
        (this.commonLogger.info("CacheManager:getIdToken - Multiple matching ID tokens found, clearing them"),
        c.forEach((l, d) => {
          this.removeIdToken(d, t);
        }),
        o && t)
      )
        o.addFields({ multiMatchedID: idTokensByFilter.size }, t);
      return null;
    }
    return (
      this.commonLogger.info("CacheManager:getIdToken - Returning ID token"),
      idTokensByFilter.values().next().value
    );
  }
  getIdTokensByFilter(e, t, r) {
    let n = (r && r.idToken) || this.getTokenKeys().idToken,
      o = new Map();
    return (
      n.forEach((i) => {
        if (!this.idTokenKeyMatchesFilter(i, { clientId: this.clientId, ...e })) return;
        let idTokenCredential = this.getIdTokenCredential(i, t);
        if (idTokenCredential && this.credentialMatchesFilter(idTokenCredential, e))
          o.set(i, idTokenCredential);
      }),
      o
    );
  }
  idTokenKeyMatchesFilter(e, t) {
    let lower = e.toLowerCase();
    if (t.clientId && lower.indexOf(t.clientId.toLowerCase()) === -1) return !1;
    if (t.homeAccountId && lower.indexOf(t.homeAccountId.toLowerCase()) === -1) return !1;
    return !0;
  }
  removeIdToken(e, t) {
    this.removeItem(e, t);
  }
  removeRefreshToken(e, t) {
    this.removeItem(e, t);
  }
  getAccessToken(e, t, r, n) {
    let correlationId = t.correlationId;
    this.commonLogger.trace("CacheManager - getAccessToken called", correlationId);
    let searchScopes = oe.createSearchScopes(t.scopes),
      s = t.authenticationScheme || L.BEARER,
      a = s && s.toLowerCase() !== L.BEARER.toLowerCase() ? K.ACCESS_TOKEN_WITH_AUTH_SCHEME : K.ACCESS_TOKEN,
      c = {
        homeAccountId: e.homeAccountId,
        environment: e.environment,
        credentialType: a,
        clientId: this.clientId,
        realm: n || e.tenantId,
        target: searchScopes,
        tokenType: s,
        keyId: t.sshKid,
        requestedClaimsHash: t.requestedClaimsHash,
      },
      l = (r && r.accessToken) || this.getTokenKeys().accessToken,
      d = [];
    l.forEach((m) => {
      if (this.accessTokenKeyMatchesFilter(m, c, !0)) {
        let accessTokenCredential = this.getAccessTokenCredential(m, correlationId);
        if (accessTokenCredential && this.credentialMatchesFilter(accessTokenCredential, c))
          d.push(accessTokenCredential);
      }
    });
    let u = d.length;
    if (u < 1)
      return (this.commonLogger.info("CacheManager:getAccessToken - No token found", correlationId), null);
    else if (u > 1)
      return (
        this.commonLogger.info(
          "CacheManager:getAccessToken - Multiple access tokens found, clearing them",
          correlationId,
        ),
        d.forEach((m) => {
          this.removeAccessToken(this.generateCredentialKey(m), correlationId);
        }),
        this.performanceClient.addFields({ multiMatchedAT: d.length }, correlationId),
        null
      );
    return (
      this.commonLogger.info("CacheManager:getAccessToken - Returning access token", correlationId),
      d[0]
    );
  }
  accessTokenKeyMatchesFilter(e, t, r) {
    let lower = e.toLowerCase();
    if (t.clientId && lower.indexOf(t.clientId.toLowerCase()) === -1) return !1;
    if (t.homeAccountId && lower.indexOf(t.homeAccountId.toLowerCase()) === -1) return !1;
    if (t.realm && lower.indexOf(t.realm.toLowerCase()) === -1) return !1;
    if (t.requestedClaimsHash && lower.indexOf(t.requestedClaimsHash.toLowerCase()) === -1) return !1;
    if (t.target) {
      let asArray = t.target.asArray();
      for (let i = 0; i < asArray.length; i++)
        if (r && !lower.includes(asArray[i].toLowerCase())) return !1;
        else if (!r && lower.includes(asArray[i].toLowerCase())) return !0;
    }
    return !0;
  }
  getAccessTokensByFilter(e, t) {
    let tokenKeys = this.getTokenKeys(),
      n = [];
    return (
      tokenKeys.accessToken.forEach((o) => {
        if (!this.accessTokenKeyMatchesFilter(o, e, !0)) return;
        let accessTokenCredential = this.getAccessTokenCredential(o, t);
        if (accessTokenCredential && this.credentialMatchesFilter(accessTokenCredential, e))
          n.push(accessTokenCredential);
      }),
      n
    );
  }
  getRefreshToken(e, t, r, n, o) {
    this.commonLogger.trace("CacheManager - getRefreshToken called");
    let i = t ? xt : void 0,
      s = {
        homeAccountId: e.homeAccountId,
        environment: e.environment,
        credentialType: K.REFRESH_TOKEN,
        clientId: this.clientId,
        familyId: i,
      },
      a = (n && n.refreshToken) || this.getTokenKeys().refreshToken,
      c = [];
    a.forEach((d) => {
      if (this.refreshTokenKeyMatchesFilter(d, s)) {
        let refreshTokenCredential = this.getRefreshTokenCredential(d, r);
        if (refreshTokenCredential && this.credentialMatchesFilter(refreshTokenCredential, s))
          c.push(refreshTokenCredential);
      }
    });
    let l = c.length;
    if (l < 1)
      return (this.commonLogger.info("CacheManager:getRefreshToken - No refresh token found."), null);
    if (l > 1 && o && r) o.addFields({ multiMatchedRT: l }, r);
    return (this.commonLogger.info("CacheManager:getRefreshToken - returning refresh token"), c[0]);
  }
  refreshTokenKeyMatchesFilter(e, t) {
    let lower = e.toLowerCase();
    if (t.familyId && lower.indexOf(t.familyId.toLowerCase()) === -1) return !1;
    if (!t.familyId && t.clientId && lower.indexOf(t.clientId.toLowerCase()) === -1) return !1;
    if (t.homeAccountId && lower.indexOf(t.homeAccountId.toLowerCase()) === -1) return !1;
    return !0;
  }
  readAppMetadataFromCache(e) {
    let t = { environment: e, clientId: this.clientId },
      appMetadataFilteredBy = this.getAppMetadataFilteredBy(t),
      mapped = Object.keys(appMetadataFilteredBy).map((i) => appMetadataFilteredBy[i]),
      o = mapped.length;
    if (o < 1) return null;
    else if (o > 1) throw g(MULTIPLE_MATCHING_APPMETADATA);
    return mapped[0];
  }
  isAppMetadataFOCI(e) {
    let appMetadataFromCache = this.readAppMetadataFromCache(e);
    return !!(appMetadataFromCache && appMetadataFromCache.familyId === xt);
  }
  matchHomeAccountId(e, t) {
    return typeof e.homeAccountId === "string" && t === e.homeAccountId;
  }
  matchLocalAccountIdFromTokenClaims(e, t) {
    let r = e.oid || e.sub;
    return t === r;
  }
  matchLocalAccountIdFromTenantProfile(e, t) {
    return e.localAccountId === t;
  }
  matchName(e, t) {
    return t.toLowerCase() === e.name?.toLowerCase();
  }
  matchUsername(e, t) {
    return !!(e && typeof e === "string" && t?.toLowerCase() === e.toLowerCase());
  }
  matchUserAssertionHash(e, t) {
    return !!(e.userAssertionHash && t === e.userAssertionHash);
  }
  matchEnvironment(e, t) {
    if (this.staticAuthorityOptions) {
      let n = Yd(this.staticAuthorityOptions, this.commonLogger);
      if (n.includes(t) && n.includes(e.environment)) return !0;
    }
    let authorityMetadataByAlias = this.getAuthorityMetadataByAlias(t);
    if (authorityMetadataByAlias && authorityMetadataByAlias.aliases.indexOf(e.environment) > -1) return !0;
    return !1;
  }
  matchCredentialType(e, t) {
    return e.credentialType && t.toLowerCase() === e.credentialType.toLowerCase();
  }
  matchClientId(e, t) {
    return !!(e.clientId && t === e.clientId);
  }
  matchFamilyId(e, t) {
    return !!(e.familyId && t === e.familyId);
  }
  matchRealm(e, t) {
    return e.realm?.toLowerCase() === t.toLowerCase();
  }
  matchNativeAccountId(e, t) {
    return !!(e.nativeAccountId && t === e.nativeAccountId);
  }
  matchLoginHintFromTokenClaims(e, t) {
    if (e.login_hint === t) return !0;
    if (e.preferred_username === t) return !0;
    if (e.upn === t) return !0;
    return !1;
  }
  matchSid(e, t) {
    return e.sid === t;
  }
  matchAuthorityType(e, t) {
    return !!(e.authorityType && t.toLowerCase() === e.authorityType.toLowerCase());
  }
  matchTarget(e, t) {
    if (
      (e.credentialType !== K.ACCESS_TOKEN && e.credentialType !== K.ACCESS_TOKEN_WITH_AUTH_SCHEME) ||
      !e.target
    )
      return !1;
    return oe.fromString(e.target).containsScopeSet(t);
  }
  matchTokenType(e, t) {
    return !!(e.tokenType && e.tokenType === t);
  }
  matchKeyId(e, t) {
    return !!(e.keyId && e.keyId === t);
  }
  isAppMetadata(e) {
    return e.indexOf(APPMETADATA) !== -1;
  }
  isAuthorityMetadata(e) {
    return e.indexOf(Zr.CACHE_KEY) !== -1;
  }
  generateAuthorityMetadataCacheKey(e) {
    return `${Zr.CACHE_KEY}-${this.clientId}-${e}`;
  }
  static toObject(e, t) {
    for (let key in t) e[key] = t[key];
    return e;
  }
}
//@ chunk-mrx6y2r5.js:135844-136615 esm-fingerprint
class Pi extends yr {
  async setAccount() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getAccount() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  async setIdTokenCredential() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getIdTokenCredential() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  async setAccessTokenCredential() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getAccessTokenCredential() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  async setRefreshTokenCredential() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getRefreshTokenCredential() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  setAppMetadata() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getAppMetadata() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  setServerTelemetry() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getServerTelemetry() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  setAuthorityMetadata() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getAuthorityMetadata() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getAuthorityMetadataKeys() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  setThrottlingCache() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getThrottlingCache() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  removeItem() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getKeys() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getAccountKeys() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  getTokenKeys() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  generateCredentialKey() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
  generateAccountKey() {
    throw g(METHOD_NOT_IMPLEMENTED);
  }
}
//@ chunk-mrx6y2r5.js:136660-147470 esm-fingerprint
var h = {
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
  },
  hb = new Map([
    [h.AcquireTokenByCode, "ATByCode"],
    [h.AcquireTokenByRefreshToken, "ATByRT"],
    [h.AcquireTokenSilent, "ATS"],
    [h.AcquireTokenSilentAsync, "ATSAsync"],
    [h.AcquireTokenPopup, "ATPopup"],
    [h.AcquireTokenRedirect, "ATRedirect"],
    [h.CryptoOptsGetPublicKeyThumbprint, "CryptoGetPKThumb"],
    [h.CryptoOptsSignJwt, "CryptoSignJwt"],
    [h.SilentCacheClientAcquireToken, "SltCacheClientAT"],
    [h.SilentIframeClientAcquireToken, "SltIframeClientAT"],
    [h.SilentRefreshClientAcquireToken, "SltRClientAT"],
    [h.SsoSilent, "SsoSlt"],
    [h.StandardInteractionClientGetDiscoveredAuthority, "StdIntClientGetDiscAuth"],
    [h.FetchAccountIdWithNativeBroker, "FetchAccIdWithNtvBroker"],
    [h.NativeInteractionClientAcquireToken, "NtvIntClientAT"],
    [h.BaseClientCreateTokenRequestHeaders, "BaseClientCreateTReqHead"],
    [h.NetworkClientSendPostRequestAsync, "NetClientSendPost"],
    [h.RefreshTokenClientExecutePostToTokenEndpoint, "RTClientExecPost"],
    [h.AuthorizationCodeClientExecutePostToTokenEndpoint, "AuthCodeClientExecPost"],
    [h.BrokerHandhshake, "BrokerHandshake"],
    [h.AcquireTokenByRefreshTokenInBroker, "ATByRTInBroker"],
    [h.AcquireTokenByBroker, "ATByBroker"],
    [h.RefreshTokenClientExecuteTokenRequest, "RTClientExecTReq"],
    [h.RefreshTokenClientAcquireToken, "RTClientAT"],
    [h.RefreshTokenClientAcquireTokenWithCachedRefreshToken, "RTClientATWithCachedRT"],
    [h.RefreshTokenClientAcquireTokenByRefreshToken, "RTClientATByRT"],
    [h.RefreshTokenClientCreateTokenRequestBody, "RTClientCreateTReqBody"],
    [h.AcquireTokenFromCache, "ATFromCache"],
    [h.SilentFlowClientAcquireCachedToken, "SltFlowClientATCached"],
    [h.SilentFlowClientGenerateResultFromCacheRecord, "SltFlowClientGenResFromCache"],
    [h.AcquireTokenBySilentIframe, "ATBySltIframe"],
    [h.InitializeBaseRequest, "InitBaseReq"],
    [h.InitializeSilentRequest, "InitSltReq"],
    [h.InitializeClientApplication, "InitClientApplication"],
    [h.InitializeCache, "InitCache"],
    [h.ImportExistingCache, "importCache"],
    [h.SetUserData, "setUserData"],
    [h.LocalStorageUpdated, "localStorageUpdated"],
    [h.SilentIframeClientTokenHelper, "SIClientTHelper"],
    [h.SilentHandlerInitiateAuthRequest, "SHandlerInitAuthReq"],
    [h.SilentHandlerMonitorIframeForHash, "SltHandlerMonitorIframeForHash"],
    [h.SilentHandlerLoadFrame, "SHandlerLoadFrame"],
    [h.SilentHandlerLoadFrameSync, "SHandlerLoadFrameSync"],
    [h.StandardInteractionClientCreateAuthCodeClient, "StdIntClientCreateAuthCodeClient"],
    [h.StandardInteractionClientGetClientConfiguration, "StdIntClientGetClientConf"],
    [h.StandardInteractionClientInitializeAuthorizationRequest, "StdIntClientInitAuthReq"],
    [h.GetAuthCodeUrl, "GetAuthCodeUrl"],
    [h.HandleCodeResponseFromServer, "HandleCodeResFromServer"],
    [h.HandleCodeResponse, "HandleCodeResp"],
    [h.HandleResponseEar, "HandleRespEar"],
    [h.HandleResponseCode, "HandleRespCode"],
    [h.HandleResponsePlatformBroker, "HandleRespPlatBroker"],
    [h.UpdateTokenEndpointAuthority, "UpdTEndpointAuth"],
    [h.AuthClientAcquireToken, "AuthClientAT"],
    [h.AuthClientExecuteTokenRequest, "AuthClientExecTReq"],
    [h.AuthClientCreateTokenRequestBody, "AuthClientCreateTReqBody"],
    [h.PopTokenGenerateCnf, "PopTGenCnf"],
    [h.PopTokenGenerateKid, "PopTGenKid"],
    [h.HandleServerTokenResponse, "HandleServerTRes"],
    [h.DeserializeResponse, "DeserializeRes"],
    [h.AuthorityFactoryCreateDiscoveredInstance, "AuthFactCreateDiscInst"],
    [h.AuthorityResolveEndpointsAsync, "AuthResolveEndpointsAsync"],
    [h.AuthorityResolveEndpointsFromLocalSources, "AuthResolveEndpointsFromLocal"],
    [h.AuthorityGetCloudDiscoveryMetadataFromNetwork, "AuthGetCDMetaFromNet"],
    [h.AuthorityUpdateCloudDiscoveryMetadata, "AuthUpdCDMeta"],
    [h.AuthorityGetEndpointMetadataFromNetwork, "AuthUpdCDMetaFromNet"],
    [h.AuthorityUpdateEndpointMetadata, "AuthUpdEndpointMeta"],
    [h.AuthorityUpdateMetadataWithRegionalInformation, "AuthUpdMetaWithRegInfo"],
    [h.RegionDiscoveryDetectRegion, "RegDiscDetectReg"],
    [h.RegionDiscoveryGetRegionFromIMDS, "RegDiscGetRegFromIMDS"],
    [h.RegionDiscoveryGetCurrentVersion, "RegDiscGetCurrentVer"],
    [h.AcquireTokenByCodeAsync, "ATByCodeAsync"],
    [h.GetEndpointMetadataFromNetwork, "GetEndpointMetaFromNet"],
    [h.GetCloudDiscoveryMetadataFromNetworkMeasurement, "GetCDMetaFromNet"],
    [h.HandleRedirectPromiseMeasurement, "HandleRedirectPromise"],
    [h.HandleNativeRedirectPromiseMeasurement, "HandleNtvRedirectPromise"],
    [h.UpdateCloudDiscoveryMetadataMeasurement, "UpdateCDMeta"],
    [h.UsernamePasswordClientAcquireToken, "UserPassClientAT"],
    [h.NativeMessageHandlerHandshake, "NtvMsgHandlerHandshake"],
    [h.NativeGenerateAuthResult, "NtvGenAuthRes"],
    [h.RemoveHiddenIframe, "RemoveHiddenIframe"],
    [h.ClearTokensAndKeysWithClaims, "ClearTAndKeysWithClaims"],
    [h.CacheManagerGetRefreshToken, "CacheManagerGetRT"],
    [h.GeneratePkceCodes, "GenPkceCodes"],
    [h.GenerateCodeVerifier, "GenCodeVerifier"],
    [h.GenerateCodeChallengeFromVerifier, "GenCodeChallengeFromVerifier"],
    [h.Sha256Digest, "Sha256Digest"],
    [h.GetRandomValues, "GetRandomValues"],
    [h.GenerateHKDF, "genHKDF"],
    [h.GenerateBaseKey, "genBaseKey"],
    [h.Base64Decode, "b64Decode"],
    [h.UrlEncodeArr, "urlEncArr"],
    [h.Encrypt, "encrypt"],
    [h.Decrypt, "decrypt"],
    [h.GenerateEarKey, "genEarKey"],
    [h.DecryptEarResponse, "decryptEarResp"],
  ]),
  Jd = { NotStarted: 0, InProgress: 1, Completed: 2 };
//@ chunk-mrx6y2r5.js:147515-147606 esm-fingerprint
class Ma {
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
class bn {
  generateId() {
    return "callback-id";
  }
  startMeasurement(e, t) {
    return {
      end: () => null,
      discard: () => {},
      add: () => {},
      increment: () => {},
      event: {
        eventId: this.generateId(),
        status: Jd.InProgress,
        authority: "",
        libraryName: "",
        libraryVersion: "",
        clientId: "",
        name: e,
        startTimeMs: Date.now(),
        correlationId: t || "",
      },
      measurement: new Ma(),
    };
  }
  startPerformanceMeasurement() {
    return new Ma();
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
    return !0;
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
var gg = { tokenRenewalOffsetSeconds: en, preventCorsPreflight: !1 },
  yg = { loggerCallback: () => {}, piiLoggingEnabled: !1, logLevel: G.Info, correlationId: f.EMPTY_STRING },
  Tg = { claimsBasedCachingEnabled: !1 },
  Eg = {
    async sendGetRequestAsync() {
      throw g(METHOD_NOT_IMPLEMENTED);
    },
    async sendPostRequestAsync() {
      throw g(METHOD_NOT_IMPLEMENTED);
    },
  },
  Cg = { sku: f.SKU, version: En, cpu: f.EMPTY_STRING, os: f.EMPTY_STRING },
  Ag = { clientSecret: f.EMPTY_STRING, clientAssertion: void 0 },
  Ig = { azureCloudInstance: Ht.None, tenant: `${f.DEFAULT_COMMON_TENANT}` },
  _g = { application: { appName: "", appVersion: "" } };
//@ chunk-mrx6y2r5.js:148825-149441 esm-fingerprint
function Xd({
  authOptions: authOptions,
  systemOptions: systemOptions,
  loggerOptions: loggerOptions,
  cacheOptions: cacheOptions,
  storageInterface: storageInterface,
  networkInterface: networkInterface,
  cryptoInterface: cryptoInterface,
  clientCredentials: clientCredentials,
  libraryInfo: libraryInfo,
  telemetry: telemetry,
  serverTelemetryManager: serverTelemetryManager,
  persistencePlugin: persistencePlugin,
  serializableCache: serializableCache,
}) {
  let p = { ...yg, ...loggerOptions };
  return {
    authOptions: Sg(authOptions),
    systemOptions: { ...gg, ...systemOptions },
    loggerOptions: p,
    cacheOptions: { ...Tg, ...cacheOptions },
    storageInterface: storageInterface || new Pi(authOptions.clientId, Tn, new Ue(p), new bn()),
    networkInterface: networkInterface || Eg,
    cryptoInterface: cryptoInterface || Tn,
    clientCredentials: clientCredentials || Ag,
    libraryInfo: { ...Cg, ...libraryInfo },
    telemetry: { ..._g, ...telemetry },
    serverTelemetryManager: serverTelemetryManager || null,
    persistencePlugin: persistencePlugin || null,
    serializableCache: serializableCache || null,
  };
}
//@ chunk-mrx6y2r5.js:149441-149585 esm-fingerprint
function Sg(e) {
  return {
    clientCapabilities: [],
    azureCloudOptions: Ig,
    skipAuthorityMetadataCache: !1,
    instanceAware: !1,
    encodeExtraQueryParams: !1,
    ...e,
  };
}
//@ chunk-mrx6y2r5.js:149585-149662 esm-fingerprint
function Oi(e) {
  return e.authOptions.authority.options.protocolMode === Ae.OIDC;
}
//@ chunk-mrx6y2r5.js:149707-149760 esm-fingerprint
var Ie = { HOME_ACCOUNT_ID: "home_account_id", UPN: "UPN" };
//@ chunk-mrx6y2r5.js:149805-149919 esm-fingerprint
var CLIENT_ID = "client_id",
  REDIRECT_URI = "redirect_uri",
  RESPONSE_TYPE = "response_type",
  RESPONSE_MODE = "response_mode",
  GRANT_TYPE = "grant_type",
  CLAIMS = "claims",
  SCOPE = "scope";
//@ chunk-mrx6y2r5.js:149919-149942 esm-fingerprint
var REFRESH_TOKEN = "refresh_token";
//@ chunk-mrx6y2r5.js:149942-149980 esm-fingerprint
var STATE = "state",
  NONCE = "nonce",
  PROMPT = "prompt";
//@ chunk-mrx6y2r5.js:149980-150492 esm-fingerprint
var CODE = "code",
  CODE_CHALLENGE = "code_challenge",
  CODE_CHALLENGE_METHOD = "code_challenge_method",
  CODE_VERIFIER = "code_verifier",
  CLIENT_REQUEST_ID = "client-request-id",
  X_CLIENT_SKU = "x-client-SKU",
  X_CLIENT_VER = "x-client-VER",
  X_CLIENT_OS = "x-client-OS",
  X_CLIENT_CPU = "x-client-CPU",
  X_CLIENT_CURRENT_TELEMETRY = "x-client-current-telemetry",
  X_CLIENT_LAST_TELEMETRY = "x-client-last-telemetry",
  X_MS_LIB_CAPABILITY = "x-ms-lib-capability",
  X_APP_NAME = "x-app-name",
  X_APP_VER = "x-app-ver",
  POST_LOGOUT_REDIRECT_URI = "post_logout_redirect_uri",
  ID_TOKEN_HINT = "id_token_hint",
  DEVICE_CODE = "device_code",
  CLIENT_SECRET = "client_secret",
  CLIENT_ASSERTION = "client_assertion",
  CLIENT_ASSERTION_TYPE = "client_assertion_type",
  TOKEN_TYPE = "token_type",
  REQ_CNF = "req_cnf",
  ASSERTION = "assertion",
  REQUESTED_TOKEN_USE = "requested_token_use",
  ON_BEHALF_OF = "on_behalf_of";
//@ chunk-mrx6y2r5.js:150492-150517 esm-fingerprint
var RETURN_SPA_CODE = "return_spa_code";
//@ chunk-mrx6y2r5.js:150517-150664 esm-fingerprint
var LOGOUT_HINT = "logout_hint",
  SID = "sid",
  LOGIN_HINT = "login_hint",
  DOMAIN_HINT = "domain_hint",
  X_CLIENT_XTRA_SKU = "x-client-xtra-sku",
  BRK_CLIENT_ID = "brk_client_id",
  BRK_REDIRECT_URI = "brk_redirect_uri",
  INSTANCE_AWARE = "instance_aware";
//@ chunk-mrx6y2r5.js:150709-150840 esm-fingerprint
function Pn(e, t, r) {
  if (!t) return;
  let n = e.get(CLIENT_ID);
  if (n && e.has(BRK_CLIENT_ID))
    r?.addFields({ embeddedClientId: n, embeddedRedirectUri: e.get(REDIRECT_URI) }, t);
}
//@ chunk-mrx6y2r5.js:150840-150869 esm-layout
function Du(e, t) {
  e.set(RESPONSE_TYPE, t);
}
//@ chunk-mrx6y2r5.js:150869-150909 esm-fingerprint
function Uu(e, t) {
  e.set(RESPONSE_MODE, t ? t : mt.QUERY);
}
//@ chunk-mrx6y2r5.js:150909-151072 esm-fingerprint
function We(e, t, r = !0, n = ye) {
  if (r && !n.includes("openid") && !t.includes("openid")) n.push("openid");
  let o = r ? [...(t || []), ...n] : t || [],
    i = new oe(o);
  e.set(SCOPE, i.printScopes());
}
//@ chunk-mrx6y2r5.js:151072-151101 esm-layout
function Qe(e, t) {
  e.set(CLIENT_ID, t);
}
//@ chunk-mrx6y2r5.js:151101-151130 esm-layout
function On(e, t) {
  e.set(REDIRECT_URI, t);
}
//@ chunk-mrx6y2r5.js:151130-151159 esm-layout
function Lu(e, t) {
  e.set(POST_LOGOUT_REDIRECT_URI, t);
}
//@ chunk-mrx6y2r5.js:151159-151188 esm-layout
function Hu(e, t) {
  e.set(ID_TOKEN_HINT, t);
}
//@ chunk-mrx6y2r5.js:151188-151217 esm-layout
function Fu(e, t) {
  e.set(DOMAIN_HINT, t);
}
//@ chunk-mrx6y2r5.js:151217-151246 esm-layout
function Eo(e, t) {
  e.set(LOGIN_HINT, t);
}
//@ chunk-mrx6y2r5.js:151246-151294 esm-fingerprint
function $t(e, t) {
  e.set(Y.CCS_HEADER, `UPN:${t}`);
}
//@ chunk-mrx6y2r5.js:151294-151356 esm-fingerprint
function Bt(e, t) {
  e.set(Y.CCS_HEADER, `Oid:${t.uid}@${t.utid}`);
}
//@ chunk-mrx6y2r5.js:151356-151385 esm-layout
function Ba(e, t) {
  e.set(SID, t);
}
//@ chunk-mrx6y2r5.js:151385-151469 esm-fingerprint
function Je(e, t, r) {
  let n = Pg(t, r);
  try {
    JSON.parse(n);
  } catch (error) {
    throw V(INVALID_CLAIMS);
  }
  e.set(CLAIMS, n);
}
//@ chunk-mrx6y2r5.js:151469-151498 esm-layout
function at(e, t) {
  e.set(CLIENT_REQUEST_ID, t);
}
//@ chunk-mrx6y2r5.js:151498-151599 esm-fingerprint
function Et(e, t) {
  if ((e.set(X_CLIENT_SKU, t.sku), e.set(X_CLIENT_VER, t.version), t.os)) e.set(X_CLIENT_OS, t.os);
  if (t.cpu) e.set(X_CLIENT_CPU, t.cpu);
}
//@ chunk-mrx6y2r5.js:151599-151690 esm-fingerprint
function Ct(e, t) {
  if (t?.appName) e.set(X_APP_NAME, t.appName);
  if (t?.appVersion) e.set(X_APP_VER, t.appVersion);
}
//@ chunk-mrx6y2r5.js:151690-151719 layout
function $u(e, t) {
  e.set(PROMPT, t);
}
//@ chunk-mrx6y2r5.js:151719-151753 layout
function xi(e, t) {
  if (t) e.set(STATE, t);
}
//@ chunk-mrx6y2r5.js:151753-151782 layout
function Bu(e, t) {
  e.set(NONCE, t);
}
//@ chunk-mrx6y2r5.js:151782-151850 layout
function wg(e, t, r) {
  if (t && r) (e.set(CODE_CHALLENGE, t), e.set(CODE_CHALLENGE_METHOD, r));
  else throw V(PKCE_PARAMS_MISSING);
}
//@ chunk-mrx6y2r5.js:151850-151879 layout
function zu(e, t) {
  e.set(CODE, t);
}
//@ chunk-mrx6y2r5.js:151879-151908 layout
function vg(e, t) {
  e.set(DEVICE_CODE, t);
}
//@ chunk-mrx6y2r5.js:151908-151937 layout
function Gu(e, t) {
  e.set(REFRESH_TOKEN, t);
}
//@ chunk-mrx6y2r5.js:151937-151966 layout
function qu(e, t) {
  e.set(CODE_VERIFIER, t);
}
//@ chunk-mrx6y2r5.js:151966-151995 layout
function Tr(e, t) {
  e.set(CLIENT_SECRET, t);
}
//@ chunk-mrx6y2r5.js:151995-152029 layout
function Er(e, t) {
  if (t) e.set(CLIENT_ASSERTION, t);
}
//@ chunk-mrx6y2r5.js:152029-152063 layout
function Cr(e, t) {
  if (t) e.set(CLIENT_ASSERTION_TYPE, t);
}
//@ chunk-mrx6y2r5.js:152063-152092 layout
function kg(e, t) {
  e.set(ASSERTION, t);
}
//@ chunk-mrx6y2r5.js:152092-152121 layout
function bg(e, t) {
  e.set(REQUESTED_TOKEN_USE, t);
}
//@ chunk-mrx6y2r5.js:152121-152150 layout
function zt(e, t) {
  e.set(GRANT_TYPE, t);
}
//@ chunk-mrx6y2r5.js:152150-152179 layout
function At(e) {
  e.set(CLIENT_INFO, "1");
}
//@ chunk-mrx6y2r5.js:152179-152225 esm-fingerprint
function Mi(e) {
  if (!e.has(INSTANCE_AWARE)) e.set(INSTANCE_AWARE, "true");
}
//@ chunk-mrx6y2r5.js:152225-152307 esm-fingerprint
function Le(e, t) {
  Object.entries(t).forEach(([r, n]) => {
    if (!e.has(r) && n) e.set(r, n);
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
      throw V(INVALID_CLAIMS);
    }
  if (t && t.length > 0) {
    if (!r.hasOwnProperty(nr.ACCESS_TOKEN)) r[nr.ACCESS_TOKEN] = {};
    r[nr.ACCESS_TOKEN][nr.XMS_CC] = { values: t };
  }
  return JSON.stringify(r);
}
//@ chunk-mrx6y2r5.js:152531-152569 esm-fingerprint
function Og(e, t) {
  e.set(oo.username, t);
}
//@ chunk-mrx6y2r5.js:152569-152607 esm-fingerprint
function Ng(e, t) {
  e.set(oo.password, t);
}
//@ chunk-mrx6y2r5.js:152607-152657 esm-fingerprint
function Di(e, t) {
  if (t) (e.set(TOKEN_TYPE, L.POP), e.set(REQ_CNF, t));
}
//@ chunk-mrx6y2r5.js:152657-152707 esm-fingerprint
function Ui(e, t) {
  if (t) (e.set(TOKEN_TYPE, L.SSH), e.set(REQ_CNF, t));
}
//@ chunk-mrx6y2r5.js:152707-152817 esm-fingerprint
function Gt(e, t) {
  (e.set(X_CLIENT_CURRENT_TELEMETRY, t.generateCurrentRequestHeaderValue()),
    e.set(X_CLIENT_LAST_TELEMETRY, t.generateLastRequestHeaderValue()));
}
//@ chunk-mrx6y2r5.js:152817-152871 esm-fingerprint
function qt(e) {
  e.set(X_MS_LIB_CAPABILITY, ot.X_MS_LIB_CAPABILITY_VALUE);
}
//@ chunk-mrx6y2r5.js:152871-152900 esm-layout
function Ku(e, t) {
  e.set(LOGOUT_HINT, t);
}
//@ chunk-mrx6y2r5.js:152900-152971 esm-fingerprint
function Kt(e, t, r) {
  if (!e.has(BRK_CLIENT_ID)) e.set(BRK_CLIENT_ID, t);
  if (!e.has(BRK_REDIRECT_URI)) e.set(BRK_REDIRECT_URI, r);
}
//@ chunk-mrx6y2r5.js:153016-153175 esm-fingerprint
function Vu(e) {
  return (
    e.hasOwnProperty("authorization_endpoint") &&
    e.hasOwnProperty("token_endpoint") &&
    e.hasOwnProperty("issuer") &&
    e.hasOwnProperty("jwks_uri")
  );
}
//@ chunk-mrx6y2r5.js:153220-153318 esm-fingerprint
function ju(e) {
  return e.hasOwnProperty("tenant_discovery_endpoint") && e.hasOwnProperty("metadata");
}
//@ chunk-mrx6y2r5.js:153363-153450 esm-fingerprint
function Yu(e) {
  return e.hasOwnProperty("error") && e.hasOwnProperty("error_description");
}
//@ chunk-mrx6y2r5.js:153495-154311 esm-fingerprint
var Wu =
    (e, t, r, n, o) =>
    (...i) => {
      r.trace(`Executing function ${t}`);
      let s = n?.startMeasurement(t, o);
      if (o) {
        let a = t + "CallCount";
        n?.incrementFields({ [a]: 1 }, o);
      }
      try {
        let a = e(...i);
        return (s?.end({ success: !0 }), r.trace(`Returning result from ${t}`), a);
      } catch (error) {
        r.trace(`Error occurred in ${t}`);
        try {
          r.trace(JSON.stringify(error));
        } catch (error) {
          r.trace("Unable to print error message.");
        }
        throw (s?.end({ success: !1 }, error), error);
      }
    },
  F =
    (e, t, r, n, o) =>
    (...i) => {
      r.trace(`Executing function ${t}`);
      let s = n?.startMeasurement(t, o);
      if (o) {
        let a = t + "CallCount";
        n?.incrementFields({ [a]: 1 }, o);
      }
      return (
        n?.setPreQueueTime(t, o),
        e(...i)
          .then((a) => (r.trace(`Returning result from ${t}`), s?.end({ success: !0 }), a))
          .catch((a) => {
            r.trace(`Error occurred in ${t}`);
            try {
              r.trace(JSON.stringify(a));
            } catch (error) {
              r.trace("Unable to print error message.");
            }
            throw (s?.end({ success: !1 }, a), a);
          })
      );
    };
//@ chunk-mrx6y2r5.js:154356-156077 esm-fingerprint
class Co {
  constructor(e, t, r, n) {
    ((this.networkInterface = e), (this.logger = t), (this.performanceClient = r), (this.correlationId = n));
  }
  async detectRegion(e, t) {
    this.performanceClient?.addQueueMeasurement(h.RegionDiscoveryDetectRegion, this.correlationId);
    let r = e;
    if (!r) {
      let IMDS_OPTIONS = Co.IMDS_OPTIONS;
      try {
        let o = await F(
          this.getRegionFromIMDS.bind(this),
          h.RegionDiscoveryGetRegionFromIMDS,
          this.logger,
          this.performanceClient,
          this.correlationId,
        )(f.IMDS_VERSION, IMDS_OPTIONS);
        if (o.status === b.SUCCESS) ((r = o.body), (t.region_source = sr.IMDS));
        if (o.status === b.BAD_REQUEST) {
          let i = await F(
            this.getCurrentVersion.bind(this),
            h.RegionDiscoveryGetCurrentVersion,
            this.logger,
            this.performanceClient,
            this.correlationId,
          )(IMDS_OPTIONS);
          if (!i) return ((t.region_source = sr.FAILED_AUTO_DETECTION), null);
          let s = await F(
            this.getRegionFromIMDS.bind(this),
            h.RegionDiscoveryGetRegionFromIMDS,
            this.logger,
            this.performanceClient,
            this.correlationId,
          )(i, IMDS_OPTIONS);
          if (s.status === b.SUCCESS) ((r = s.body), (t.region_source = sr.IMDS));
        }
      } catch (error) {
        return ((t.region_source = sr.FAILED_AUTO_DETECTION), null);
      }
    } else t.region_source = sr.ENVIRONMENT_VARIABLE;
    if (!r) t.region_source = sr.FAILED_AUTO_DETECTION;
    return r || null;
  }
  async getRegionFromIMDS(e, t) {
    return (
      this.performanceClient?.addQueueMeasurement(h.RegionDiscoveryGetRegionFromIMDS, this.correlationId),
      this.networkInterface.sendGetRequestAsync(
        `${f.IMDS_ENDPOINT}?api-version=${e}&format=text`,
        t,
        f.IMDS_TIMEOUT,
      )
    );
  }
  async getCurrentVersion(e) {
    this.performanceClient?.addQueueMeasurement(h.RegionDiscoveryGetCurrentVersion, this.correlationId);
    try {
      let sendGetRequestAsync = await this.networkInterface.sendGetRequestAsync(
        `${f.IMDS_ENDPOINT}?format=json`,
        e,
      );
      if (
        sendGetRequestAsync.status === b.BAD_REQUEST &&
        sendGetRequestAsync.body &&
        sendGetRequestAsync.body["newest-versions"] &&
        sendGetRequestAsync.body["newest-versions"].length > 0
      )
        return sendGetRequestAsync.body["newest-versions"][0];
      return null;
    } catch (error) {
      return null;
    }
  }
}
//@ chunk-mrx6y2r5.js:156077-156121 esm-fingerprint
Co.IMDS_OPTIONS = { headers: { Metadata: "true" } };
//@ chunk-mrx6y2r5.js:156166-156224 esm-fingerprint
function Q() {
  return Math.round(new Date().getTime() / 1000);
}
//@ chunk-mrx6y2r5.js:156224-156292 esm-layout
function Li(e) {
  if (e) return new Date(Number(e) * 1000);
  return new Date();
}
//@ chunk-mrx6y2r5.js:156292-156343 esm-layout
function Vt(e, t) {
  let r = Number(e) || 0;
  return Q() + t > r;
}
//@ chunk-mrx6y2r5.js:156343-156379 esm-layout
function Qu(e) {
  return Number(e) > Q();
}
//@ chunk-mrx6y2r5.js:156379-156444 esm-layout
function xg(e, t) {
  return new Promise((r) => setTimeout(() => r(t), e));
}
//@ chunk-mrx6y2r5.js:156489-156640 esm-fingerprint
function Ju(e, t, r, n, o) {
  return {
    credentialType: K.ID_TOKEN,
    homeAccountId: e,
    environment: t,
    clientId: n,
    secret: r,
    realm: o,
    lastUpdatedAt: Date.now().toString(),
  };
}
//@ chunk-mrx6y2r5.js:156640-157261 esm-fingerprint
function Xu(e, t, r, n, o, i, s, a, c, l, d, u, m, p, y) {
  let T = {
    homeAccountId: e,
    credentialType: K.ACCESS_TOKEN,
    secret: r,
    cachedAt: Q().toString(),
    expiresOn: s.toString(),
    extendedExpiresOn: a.toString(),
    environment: t,
    clientId: n,
    realm: o,
    target: i,
    tokenType: d || L.BEARER,
    lastUpdatedAt: Date.now().toString(),
  };
  if (u) T.userAssertionHash = u;
  if (l) T.refreshOn = l.toString();
  if (p) ((T.requestedClaims = p), (T.requestedClaimsHash = y));
  if (T.tokenType?.toLowerCase() !== L.BEARER.toLowerCase())
    switch (((T.credentialType = K.ACCESS_TOKEN_WITH_AUTH_SCHEME), T.tokenType)) {
      case L.POP:
        let I = yt(r, c);
        if (!I?.cnf?.kid) throw g(TOKEN_CLAIMS_CNF_REQUIRED_FOR_SIGNEDJWT);
        T.keyId = I.cnf.kid;
        break;
      case L.SSH:
        T.keyId = m;
    }
  return T;
}
//@ chunk-mrx6y2r5.js:157261-157497 esm-fingerprint
function Zu(e, t, r, n, o, i, s) {
  let a = {
    credentialType: K.REFRESH_TOKEN,
    homeAccountId: e,
    environment: t,
    clientId: n,
    secret: r,
    lastUpdatedAt: Date.now().toString(),
  };
  if (i) a.userAssertionHash = i;
  if (o) a.familyId = o;
  if (s) a.expiresOn = s.toString();
  return a;
}
//@ chunk-mrx6y2r5.js:157497-157680 esm-fingerprint
function za(e) {
  return (
    e.hasOwnProperty("homeAccountId") &&
    e.hasOwnProperty("environment") &&
    e.hasOwnProperty("credentialType") &&
    e.hasOwnProperty("clientId") &&
    e.hasOwnProperty("secret")
  );
}
//@ chunk-mrx6y2r5.js:157680-157867 esm-fingerprint
function eh(e) {
  if (!e) return !1;
  return (
    za(e) &&
    e.hasOwnProperty("realm") &&
    e.hasOwnProperty("target") &&
    (e.credentialType === K.ACCESS_TOKEN || e.credentialType === K.ACCESS_TOKEN_WITH_AUTH_SCHEME)
  );
}
//@ chunk-mrx6y2r5.js:157867-157968 esm-fingerprint
function th(e) {
  if (!e) return !1;
  return za(e) && e.hasOwnProperty("realm") && e.credentialType === K.ID_TOKEN;
}
//@ chunk-mrx6y2r5.js:157968-158047 esm-fingerprint
function rh(e) {
  if (!e) return !1;
  return za(e) && e.credentialType === K.REFRESH_TOKEN;
}
//@ chunk-mrx6y2r5.js:158047-158216 esm-fingerprint
function Mg(e, t) {
  let r = e.indexOf(de.CACHE_KEY) === 0,
    n = !0;
  if (t)
    n = t.hasOwnProperty("failedRequests") && t.hasOwnProperty("errors") && t.hasOwnProperty("cacheHits");
  return r && n;
}
//@ chunk-mrx6y2r5.js:158216-158346 esm-fingerprint
function Dg(e, t) {
  let r = !1;
  if (e) r = e.indexOf(ot.THROTTLING_PREFIX) === 0;
  let n = !0;
  if (t) n = t.hasOwnProperty("throttleTime");
  return r && n;
}
//@ chunk-mrx6y2r5.js:158346-158444 esm-fingerprint
function Ug({ environment: environment, clientId: clientId }) {
  return [APPMETADATA, environment, clientId].join(pt.CACHE_KEY_SEPARATOR).toLowerCase();
}
//@ chunk-mrx6y2r5.js:158444-158564 esm-fingerprint
function nh(e, t) {
  if (!t) return !1;
  return e.indexOf(APPMETADATA) === 0 && t.hasOwnProperty("clientId") && t.hasOwnProperty("environment");
}
//@ chunk-mrx6y2r5.js:158564-159028 esm-fingerprint
function Lg(e, t) {
  if (!t) return !1;
  return (
    e.indexOf(Zr.CACHE_KEY) === 0 &&
    t.hasOwnProperty("aliases") &&
    t.hasOwnProperty("preferred_cache") &&
    t.hasOwnProperty("preferred_network") &&
    t.hasOwnProperty("canonical_authority") &&
    t.hasOwnProperty("authorization_endpoint") &&
    t.hasOwnProperty("token_endpoint") &&
    t.hasOwnProperty("issuer") &&
    t.hasOwnProperty("aliasesFromNetwork") &&
    t.hasOwnProperty("endpointsFromNetwork") &&
    t.hasOwnProperty("expiresAt") &&
    t.hasOwnProperty("jwks_uri")
  );
}
//@ chunk-mrx6y2r5.js:159028-159077 esm-fingerprint
function Ga() {
  return Q() + Zr.REFRESH_TIME_SECONDS;
}
//@ chunk-mrx6y2r5.js:159077-159291 esm-fingerprint
function Ao(e, t, r) {
  ((e.authorization_endpoint = t.authorization_endpoint),
    (e.token_endpoint = t.token_endpoint),
    (e.end_session_endpoint = t.end_session_endpoint),
    (e.issuer = t.issuer),
    (e.endpointsFromNetwork = r),
    (e.jwks_uri = t.jwks_uri));
}
//@ chunk-mrx6y2r5.js:159291-159429 esm-fingerprint
function Hi(e, t, r) {
  ((e.aliases = t.aliases),
    (e.preferred_cache = t.preferred_cache),
    (e.preferred_network = t.preferred_network),
    (e.aliasesFromNetwork = r));
}
//@ chunk-mrx6y2r5.js:159429-159468 esm-fingerprint
function qa(e) {
  return e.expiresAt <= Q();
}
//@ chunk-mrx6y2r5.js:159513-175430 esm-fingerprint
class ue {
  constructor(e, t, r, n, o, i, s, a) {
    ((this.canonicalAuthority = e),
      this._canonicalAuthority.validateAsUri(),
      (this.networkInterface = t),
      (this.cacheManager = r),
      (this.authorityOptions = n),
      (this.regionDiscoveryMetadata = { region_used: void 0, region_source: void 0, region_outcome: void 0 }),
      (this.logger = o),
      (this.performanceClient = s),
      (this.correlationId = i),
      (this.managedIdentity = a || !1),
      (this.regionDiscovery = new Co(t, this.logger, this.performanceClient, this.correlationId)));
  }
  getAuthorityType(e) {
    if (e.HostNameAndPort.endsWith(f.CIAM_AUTH_URL)) return Ge.Ciam;
    let PathSegments = e.PathSegments;
    if (PathSegments.length)
      switch (PathSegments[0].toLowerCase()) {
        case f.ADFS:
          return Ge.Adfs;
        case f.DSTS:
          return Ge.Dsts;
      }
    return Ge.Default;
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
  set canonicalAuthority(e) {
    ((this._canonicalAuthority = new N(e)),
      this._canonicalAuthority.validateAsUri(),
      (this._canonicalAuthorityUrlComponents = null));
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
    else throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
  get tokenEndpoint() {
    if (this.discoveryComplete()) return this.replacePath(this.metadata.token_endpoint);
    else throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
  get deviceCodeEndpoint() {
    if (this.discoveryComplete())
      return this.replacePath(this.metadata.token_endpoint.replace("/token", "/devicecode"));
    else throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
  get endSessionEndpoint() {
    if (this.discoveryComplete()) {
      if (!this.metadata.end_session_endpoint) throw g(END_SESSION_ENDPOINT_NOT_SUPPORTED);
      return this.replacePath(this.metadata.end_session_endpoint);
    } else throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
  get selfSignedJwtAudience() {
    if (this.discoveryComplete()) return this.replacePath(this.metadata.issuer);
    else throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
  get jwksUri() {
    if (this.discoveryComplete()) return this.replacePath(this.metadata.jwks_uri);
    else throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
  canReplaceTenant(e) {
    return (
      e.PathSegments.length === 1 &&
      !ue.reservedTenantDomains.has(e.PathSegments[0]) &&
      this.getAuthorityType(e) === Ge.Default &&
      this.protocolMode !== Ae.OIDC
    );
  }
  replaceTenant(e) {
    return e.replace(/{tenant}|{tenantid}/g, this.tenant);
  }
  replacePath(e) {
    let t = e,
      urlComponents = new N(this.metadata.canonical_authority).getUrlComponents(),
      PathSegments = urlComponents.PathSegments;
    return (
      this.canonicalAuthorityUrlComponents.PathSegments.forEach((PathSegment, a) => {
        let c = PathSegments[a];
        if (a === 0 && this.canReplaceTenant(urlComponents)) {
          let l = new N(this.metadata.authorization_endpoint).getUrlComponents().PathSegments[0];
          if (c !== l) (this.logger.verbose(`Replacing tenant domain name ${c} with id ${l}`), (c = l));
        }
        if (PathSegment !== c) t = t.replace(`/${c}/`, `/${PathSegment}/`);
      }),
      this.replaceTenant(t)
    );
  }
  get defaultOpenIdConfigurationEndpoint() {
    let hostnameAndPort = this.hostnameAndPort;
    if (
      this.canonicalAuthority.endsWith("v2.0/") ||
      this.authorityType === Ge.Adfs ||
      (this.protocolMode === Ae.OIDC && !this.isAliasOfKnownMicrosoftAuthority(hostnameAndPort))
    )
      return `${this.canonicalAuthority}.well-known/openid-configuration`;
    return `${this.canonicalAuthority}v2.0/.well-known/openid-configuration`;
  }
  discoveryComplete() {
    return !!this.metadata;
  }
  async resolveEndpointsAsync() {
    this.performanceClient?.addQueueMeasurement(h.AuthorityResolveEndpointsAsync, this.correlationId);
    let currentMetadataEntity = this.getCurrentMetadataEntity(),
      t = await F(
        this.updateCloudDiscoveryMetadata.bind(this),
        h.AuthorityUpdateCloudDiscoveryMetadata,
        this.logger,
        this.performanceClient,
        this.correlationId,
      )(currentMetadataEntity);
    this.canonicalAuthority = this.canonicalAuthority.replace(
      this.hostnameAndPort,
      currentMetadataEntity.preferred_network,
    );
    let r = await F(
      this.updateEndpointMetadata.bind(this),
      h.AuthorityUpdateEndpointMetadata,
      this.logger,
      this.performanceClient,
      this.correlationId,
    )(currentMetadataEntity);
    (this.updateCachedMetadata(currentMetadataEntity, t, { source: r }),
      this.performanceClient?.addFields(
        { cloudDiscoverySource: t, authorityEndpointSource: r },
        this.correlationId,
      ));
  }
  getCurrentMetadataEntity() {
    let authorityMetadataByAlias = this.cacheManager.getAuthorityMetadataByAlias(this.hostnameAndPort);
    if (!authorityMetadataByAlias)
      authorityMetadataByAlias = {
        aliases: [],
        preferred_cache: this.hostnameAndPort,
        preferred_network: this.hostnameAndPort,
        canonical_authority: this.canonicalAuthority,
        authorization_endpoint: "",
        token_endpoint: "",
        end_session_endpoint: "",
        issuer: "",
        aliasesFromNetwork: !1,
        endpointsFromNetwork: !1,
        expiresAt: Ga(),
        jwks_uri: "",
      };
    return authorityMetadataByAlias;
  }
  updateCachedMetadata(e, t, r) {
    if (t !== Ce.CACHE && r?.source !== Ce.CACHE)
      ((e.expiresAt = Ga()), (e.canonical_authority = this.canonicalAuthority));
    let generateAuthorityMetadataCacheKey = this.cacheManager.generateAuthorityMetadataCacheKey(
      e.preferred_cache,
    );
    (this.cacheManager.setAuthorityMetadata(generateAuthorityMetadataCacheKey, e), (this.metadata = e));
  }
  async updateEndpointMetadata(e) {
    this.performanceClient?.addQueueMeasurement(h.AuthorityUpdateEndpointMetadata, this.correlationId);
    let updateEndpointMetadataFromLocalSources = this.updateEndpointMetadataFromLocalSources(e);
    if (updateEndpointMetadataFromLocalSources) {
      if (updateEndpointMetadataFromLocalSources.source === Ce.HARDCODED_VALUES) {
        if (this.authorityOptions.azureRegionConfiguration?.azureRegion) {
          if (updateEndpointMetadataFromLocalSources.metadata) {
            let n = await F(
              this.updateMetadataWithRegionalInformation.bind(this),
              h.AuthorityUpdateMetadataWithRegionalInformation,
              this.logger,
              this.performanceClient,
              this.correlationId,
            )(updateEndpointMetadataFromLocalSources.metadata);
            (Ao(e, n, !1), (e.canonical_authority = this.canonicalAuthority));
          }
        }
      }
      return updateEndpointMetadataFromLocalSources.source;
    }
    let r = await F(
      this.getEndpointMetadataFromNetwork.bind(this),
      h.AuthorityGetEndpointMetadataFromNetwork,
      this.logger,
      this.performanceClient,
      this.correlationId,
    )();
    if (r) {
      if (this.authorityOptions.azureRegionConfiguration?.azureRegion)
        r = await F(
          this.updateMetadataWithRegionalInformation.bind(this),
          h.AuthorityUpdateMetadataWithRegionalInformation,
          this.logger,
          this.performanceClient,
          this.correlationId,
        )(r);
      return (Ao(e, r, !0), Ce.NETWORK);
    } else throw g(OPENID_CONFIG_ERROR, this.defaultOpenIdConfigurationEndpoint);
  }
  updateEndpointMetadataFromLocalSources(e) {
    this.logger.verbose("Attempting to get endpoint metadata from authority configuration");
    let endpointMetadataFromConfig = this.getEndpointMetadataFromConfig();
    if (endpointMetadataFromConfig)
      return (
        this.logger.verbose("Found endpoint metadata in authority configuration"),
        Ao(e, endpointMetadataFromConfig, !1),
        { source: Ce.CONFIG }
      );
    if (
      (this.logger.verbose(
        "Did not find endpoint metadata in the config... Attempting to get endpoint metadata from the hardcoded values.",
      ),
      this.authorityOptions.skipAuthorityMetadataCache)
    )
      this.logger.verbose(
        "Skipping hardcoded metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get endpoint metadata from the network metadata cache.",
      );
    else {
      let endpointMetadataFromHardcodedValues = this.getEndpointMetadataFromHardcodedValues();
      if (endpointMetadataFromHardcodedValues)
        return (
          Ao(e, endpointMetadataFromHardcodedValues, !1),
          { source: Ce.HARDCODED_VALUES, metadata: endpointMetadataFromHardcodedValues }
        );
      else
        this.logger.verbose(
          "Did not find endpoint metadata in hardcoded values... Attempting to get endpoint metadata from the network metadata cache.",
        );
    }
    let r = qa(e);
    if (this.isAuthoritySameType(e) && e.endpointsFromNetwork && !r)
      return (this.logger.verbose("Found endpoint metadata in the cache."), { source: Ce.CACHE });
    else if (r) this.logger.verbose("The metadata entity is expired.");
    return null;
  }
  isAuthoritySameType(e) {
    return (
      new N(e.canonical_authority).getUrlComponents().PathSegments.length ===
      this.canonicalAuthorityUrlComponents.PathSegments.length
    );
  }
  getEndpointMetadataFromConfig() {
    if (this.authorityOptions.authorityMetadata)
      try {
        return JSON.parse(this.authorityOptions.authorityMetadata);
      } catch (error) {
        throw V(INVALID_AUTHORITY_METADATA);
      }
    return null;
  }
  async getEndpointMetadataFromNetwork() {
    this.performanceClient?.addQueueMeasurement(
      h.AuthorityGetEndpointMetadataFromNetwork,
      this.correlationId,
    );
    let e = {},
      defaultOpenIdConfigurationEndpoint = this.defaultOpenIdConfigurationEndpoint;
    this.logger.verbose(
      `Authority.getEndpointMetadataFromNetwork: attempting to retrieve OAuth endpoints from ${defaultOpenIdConfigurationEndpoint}`,
    );
    try {
      let sendGetRequestAsync = await this.networkInterface.sendGetRequestAsync(
        defaultOpenIdConfigurationEndpoint,
        e,
      );
      if (Vu(sendGetRequestAsync.body)) return sendGetRequestAsync.body;
      else
        return (
          this.logger.verbose(
            "Authority.getEndpointMetadataFromNetwork: could not parse response as OpenID configuration",
          ),
          null
        );
    } catch (error) {
      return (this.logger.verbose(`Authority.getEndpointMetadataFromNetwork: ${error}`), null);
    }
  }
  getEndpointMetadataFromHardcodedValues() {
    if (this.hostnameAndPort in endpointMetadata) return endpointMetadata[this.hostnameAndPort];
    return null;
  }
  async updateMetadataWithRegionalInformation(e) {
    this.performanceClient?.addQueueMeasurement(
      h.AuthorityUpdateMetadataWithRegionalInformation,
      this.correlationId,
    );
    let t = this.authorityOptions.azureRegionConfiguration?.azureRegion;
    if (t) {
      if (t !== f.AZURE_REGION_AUTO_DISCOVER_FLAG)
        return (
          (this.regionDiscoveryMetadata.region_outcome = ni.CONFIGURED_NO_AUTO_DETECTION),
          (this.regionDiscoveryMetadata.region_used = t),
          ue.replaceWithRegionalInformation(e, t)
        );
      let r = await F(
        this.regionDiscovery.detectRegion.bind(this.regionDiscovery),
        h.RegionDiscoveryDetectRegion,
        this.logger,
        this.performanceClient,
        this.correlationId,
      )(this.authorityOptions.azureRegionConfiguration?.environmentRegion, this.regionDiscoveryMetadata);
      if (r)
        return (
          (this.regionDiscoveryMetadata.region_outcome = ni.AUTO_DETECTION_REQUESTED_SUCCESSFUL),
          (this.regionDiscoveryMetadata.region_used = r),
          ue.replaceWithRegionalInformation(e, r)
        );
      this.regionDiscoveryMetadata.region_outcome = ni.AUTO_DETECTION_REQUESTED_FAILED;
    }
    return e;
  }
  async updateCloudDiscoveryMetadata(e) {
    this.performanceClient?.addQueueMeasurement(h.AuthorityUpdateCloudDiscoveryMetadata, this.correlationId);
    let t = this.updateCloudDiscoveryMetadataFromLocalSources(e);
    if (t) return t;
    let r = await F(
      this.getCloudDiscoveryMetadataFromNetwork.bind(this),
      h.AuthorityGetCloudDiscoveryMetadataFromNetwork,
      this.logger,
      this.performanceClient,
      this.correlationId,
    )();
    if (r) return (Hi(e, r, !0), Ce.NETWORK);
    throw V(UNTRUSTED_AUTHORITY);
  }
  updateCloudDiscoveryMetadataFromLocalSources(e) {
    (this.logger.verbose("Attempting to get cloud discovery metadata  from authority configuration"),
      this.logger.verbosePii(
        `Known Authorities: ${this.authorityOptions.knownAuthorities || f.NOT_APPLICABLE}`,
      ),
      this.logger.verbosePii(
        `Authority Metadata: ${this.authorityOptions.authorityMetadata || f.NOT_APPLICABLE}`,
      ),
      this.logger.verbosePii(`Canonical Authority: ${e.canonical_authority || f.NOT_APPLICABLE}`));
    let cloudDiscoveryMetadataFromConfig = this.getCloudDiscoveryMetadataFromConfig();
    if (cloudDiscoveryMetadataFromConfig)
      return (
        this.logger.verbose("Found cloud discovery metadata in authority configuration"),
        Hi(e, cloudDiscoveryMetadataFromConfig, !1),
        Ce.CONFIG
      );
    if (
      (this.logger.verbose(
        "Did not find cloud discovery metadata in the config... Attempting to get cloud discovery metadata from the hardcoded values.",
      ),
      this.options.skipAuthorityMetadataCache)
    )
      this.logger.verbose(
        "Skipping hardcoded cloud discovery metadata cache since skipAuthorityMetadataCache is set to true. Attempting to get cloud discovery metadata from the network metadata cache.",
      );
    else {
      let n = Wd(this.hostnameAndPort);
      if (n)
        return (
          this.logger.verbose("Found cloud discovery metadata from hardcoded values."),
          Hi(e, n, !1),
          Ce.HARDCODED_VALUES
        );
      this.logger.verbose(
        "Did not find cloud discovery metadata in hardcoded values... Attempting to get cloud discovery metadata from the network metadata cache.",
      );
    }
    let r = qa(e);
    if (this.isAuthoritySameType(e) && e.aliasesFromNetwork && !r)
      return (this.logger.verbose("Found cloud discovery metadata in the cache."), Ce.CACHE);
    else if (r) this.logger.verbose("The metadata entity is expired.");
    return null;
  }
  getCloudDiscoveryMetadataFromConfig() {
    if (this.authorityType === Ge.Ciam)
      return (
        this.logger.verbose(
          "CIAM authorities do not support cloud discovery metadata, generate the aliases from authority host.",
        ),
        ue.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort)
      );
    if (this.authorityOptions.cloudDiscoveryMetadata) {
      this.logger.verbose(
        "The cloud discovery metadata has been provided as a network response, in the config.",
      );
      try {
        this.logger.verbose("Attempting to parse the cloud discovery metadata.");
        let parsed = JSON.parse(this.authorityOptions.cloudDiscoveryMetadata),
          t = go(parsed.metadata, this.hostnameAndPort);
        if ((this.logger.verbose("Parsed the cloud discovery metadata."), t))
          return (
            this.logger.verbose(
              "There is returnable metadata attached to the parsed cloud discovery metadata.",
            ),
            t
          );
        else this.logger.verbose("There is no metadata attached to the parsed cloud discovery metadata.");
      } catch (error) {
        throw (
          this.logger.verbose(
            "Unable to parse the cloud discovery metadata. Throwing Invalid Cloud Discovery Metadata Error.",
          ),
          V(INVALID_CLOUD_DISCOVERY_METADATA)
        );
      }
    }
    if (this.isInKnownAuthorities())
      return (
        this.logger.verbose(
          "The host is included in knownAuthorities. Creating new cloud discovery metadata from the host.",
        ),
        ue.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort)
      );
    return null;
  }
  async getCloudDiscoveryMetadataFromNetwork() {
    this.performanceClient?.addQueueMeasurement(
      h.AuthorityGetCloudDiscoveryMetadataFromNetwork,
      this.correlationId,
    );
    let e = `${f.AAD_INSTANCE_DISCOVERY_ENDPT}${this.canonicalAuthority}oauth2/v2.0/authorize`,
      t = {},
      r = null;
    try {
      let sendGetRequestAsync = await this.networkInterface.sendGetRequestAsync(e, t),
        o,
        i;
      if (ju(sendGetRequestAsync.body))
        ((o = sendGetRequestAsync.body),
          (i = o.metadata),
          this.logger.verbosePii(`tenant_discovery_endpoint is: ${o.tenant_discovery_endpoint}`));
      else if (Yu(sendGetRequestAsync.body)) {
        if (
          (this.logger.warning(
            `A CloudInstanceDiscoveryErrorResponse was returned. The cloud instance discovery network request's status code is: ${sendGetRequestAsync.status}`,
          ),
          (o = sendGetRequestAsync.body),
          o.error === f.INVALID_INSTANCE)
        )
          return (
            this.logger.error("The CloudInstanceDiscoveryErrorResponse error is invalid_instance."),
            null
          );
        (this.logger.warning(`The CloudInstanceDiscoveryErrorResponse error is ${o.error}`),
          this.logger.warning(
            `The CloudInstanceDiscoveryErrorResponse error description is ${o.error_description}`,
          ),
          this.logger.warning(
            "Setting the value of the CloudInstanceDiscoveryMetadata (returned from the network) to []",
          ),
          (i = []));
      } else
        return (
          this.logger.error(
            "AAD did not return a CloudInstanceDiscoveryResponse or CloudInstanceDiscoveryErrorResponse",
          ),
          null
        );
      (this.logger.verbose(
        "Attempting to find a match between the developer's authority and the CloudInstanceDiscoveryMetadata returned from the network request.",
      ),
        (r = go(i, this.hostnameAndPort)));
    } catch (error) {
      if (error instanceof AuthError)
        this.logger
          .error(`There was a network error while attempting to get the cloud discovery instance metadata.
Error: ${error.errorCode}
Error Description: ${error.errorMessage}`);
      else {
        let o = error;
        this.logger
          .error(`A non-MSALJS error was thrown while attempting to get the cloud instance discovery metadata.
Error: ${o.name}
Error Description: ${o.message}`);
      }
      return null;
    }
    if (!r)
      (this.logger.warning(
        "The developer's authority was not found within the CloudInstanceDiscoveryMetadata returned from the network request.",
      ),
        this.logger.verbose("Creating custom Authority for custom domain scenario."),
        (r = ue.createCloudDiscoveryMetadataFromHost(this.hostnameAndPort)));
    return r;
  }
  isInKnownAuthorities() {
    return (
      this.authorityOptions.knownAuthorities.filter(
        (knownAuthority) =>
          knownAuthority && N.getDomainFromUrl(knownAuthority).toLowerCase() === this.hostnameAndPort,
      ).length > 0
    );
  }
  static generateAuthority(e, t) {
    let r;
    if (t && t.azureCloudInstance !== Ht.None) {
      let n = t.tenant ? t.tenant : f.DEFAULT_COMMON_TENANT;
      r = `${t.azureCloudInstance}/${n}/`;
    }
    return r ? r : e;
  }
  static createCloudDiscoveryMetadataFromHost(e) {
    return { preferred_network: e, preferred_cache: e, aliases: [e] };
  }
  getPreferredCache() {
    if (this.managedIdentity) return f.DEFAULT_AUTHORITY_HOST;
    else if (this.discoveryComplete()) return this.metadata.preferred_cache;
    else throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
  isAlias(e) {
    return this.metadata.aliases.indexOf(e) > -1;
  }
  isAliasOfKnownMicrosoftAuthority(e) {
    return Oa.has(e);
  }
  static isPublicCloudAuthority(e) {
    return f.KNOWN_PUBLIC_CLOUDS.indexOf(e) >= 0;
  }
  static buildRegionalAuthorityString(e, t, r) {
    let n = new N(e);
    n.validateAsUri();
    let urlComponents = n.getUrlComponents(),
      i = `${t}.${urlComponents.HostNameAndPort}`;
    if (this.isPublicCloudAuthority(urlComponents.HostNameAndPort))
      i = `${t}.${f.REGIONAL_AUTH_PUBLIC_CLOUD_SUFFIX}`;
    let urlString = N.constructAuthorityUriFromObject({
      ...n.getUrlComponents(),
      HostNameAndPort: i,
    }).urlString;
    if (r) return `${urlString}?${r}`;
    return urlString;
  }
  static replaceWithRegionalInformation(e, t) {
    let r = { ...e };
    if (
      ((r.authorization_endpoint = ue.buildRegionalAuthorityString(r.authorization_endpoint, t)),
      (r.token_endpoint = ue.buildRegionalAuthorityString(r.token_endpoint, t)),
      r.end_session_endpoint)
    )
      r.end_session_endpoint = ue.buildRegionalAuthorityString(r.end_session_endpoint, t);
    return r;
  }
  static transformCIAMAuthority(e) {
    let t = e,
      urlComponents = new N(e).getUrlComponents();
    if (urlComponents.PathSegments.length === 0 && urlComponents.HostNameAndPort.endsWith(f.CIAM_AUTH_URL)) {
      let o = urlComponents.HostNameAndPort.split(".")[0];
      t = `${t}${o}${f.AAD_TENANT_DOMAIN_SUFFIX}`;
    }
    return t;
  }
}
//@ chunk-mrx6y2r5.js:175430-175530 esm-fingerprint
ue.reservedTenantDomains = new Set(["{tenant}", "{tenantid}", be.COMMON, be.CONSUMERS, be.ORGANIZATIONS]);
//@ chunk-mrx6y2r5.js:175530-175710 esm-fingerprint
function ih(e) {
  let n = new N(e).getUrlComponents().PathSegments.slice(-1)[0]?.toLowerCase();
  switch (n) {
    case be.COMMON:
    case be.ORGANIZATIONS:
    case be.CONSUMERS:
      return;
    default:
      return n;
  }
}
//@ chunk-mrx6y2r5.js:175710-175787 esm-fingerprint
function Fi(e) {
  return e.endsWith(f.FORWARD_SLASH) ? e : `${e}${f.FORWARD_SLASH}`;
}
//@ chunk-mrx6y2r5.js:175787-176011 esm-fingerprint
function Ka(e) {
  let cloudDiscoveryMetadata = e.cloudDiscoveryMetadata,
    r = void 0;
  if (cloudDiscoveryMetadata)
    try {
      r = JSON.parse(cloudDiscoveryMetadata);
    } catch (error) {
      throw V(INVALID_CLOUD_DISCOVERY_METADATA);
    }
  return {
    canonicalAuthority: e.authority ? Fi(e.authority) : void 0,
    knownAuthorities: e.knownAuthorities,
    cloudDiscoveryMetadata: r,
  };
}
//@ chunk-mrx6y2r5.js:176056-176338 esm-fingerprint
async function Va(e, t, r, n, o, i, s) {
  s?.addQueueMeasurement(h.AuthorityFactoryCreateDiscoveredInstance, i);
  let transformCIAMAuthority = ue.transformCIAMAuthority(Fi(e)),
    c = new ue(transformCIAMAuthority, t, r, n, o, i, s);
  try {
    return (await F(c.resolveEndpointsAsync.bind(c), h.AuthorityResolveEndpointsAsync, o, s, i)(), c);
  } catch (error) {
    throw g(ENDPOINTS_RESOLUTION_ERROR);
  }
}
//@ chunk-mrx6y2r5.js:176383-176533 esm-fingerprint
class ServerError extends AuthError {
  constructor(e, t, r, n, o) {
    super(e, t, r);
    ((this.name = "ServerError"),
      (this.errorNo = n),
      (this.status = o),
      Object.setPrototypeOf(this, ServerError.prototype));
  }
}
//@ chunk-mrx6y2r5.js:176578-176931 esm-fingerprint
function Nn(e, t, r) {
  return {
    clientId: e,
    authority: t.authority,
    scopes: t.scopes,
    homeAccountIdentifier: r,
    claims: t.claims,
    authenticationScheme: t.authenticationScheme,
    resourceRequestMethod: t.resourceRequestMethod,
    resourceRequestUri: t.resourceRequestUri,
    shrClaims: t.shrClaims,
    sshKid: t.sshKid,
    embeddedClientId: t.embeddedClientId || t.tokenBodyParameters?.clientId,
  };
}
//@ chunk-mrx6y2r5.js:176976-178174 esm-fingerprint
class It {
  static generateThrottlingStorageKey(e) {
    return `${ot.THROTTLING_PREFIX}.${JSON.stringify(e)}`;
  }
  static preProcess(e, t, r) {
    let generateThrottlingStorageKey = It.generateThrottlingStorageKey(t),
      throttlingCache = e.getThrottlingCache(generateThrottlingStorageKey);
    if (throttlingCache) {
      if (throttlingCache.throttleTime < Date.now()) {
        e.removeItem(generateThrottlingStorageKey, r);
        return;
      }
      throw new ServerError(
        throttlingCache.errorCodes?.join(" ") || f.EMPTY_STRING,
        throttlingCache.errorMessage,
        throttlingCache.subError,
      );
    }
  }
  static postProcess(e, t, r, n) {
    if (It.checkResponseStatus(r) || It.checkResponseForRetryAfter(r)) {
      let o = {
        throttleTime: It.calculateThrottleTime(parseInt(r.headers[Y.RETRY_AFTER])),
        error: r.body.error,
        errorCodes: r.body.error_codes,
        errorMessage: r.body.error_description,
        subError: r.body.suberror,
      };
      e.setThrottlingCache(It.generateThrottlingStorageKey(t), o, n);
    }
  }
  static checkResponseStatus(e) {
    return e.status === 429 || (e.status >= 500 && e.status < 600);
  }
  static checkResponseForRetryAfter(e) {
    if (e.headers) return e.headers.hasOwnProperty(Y.RETRY_AFTER) && (e.status < 200 || e.status >= 300);
    return !1;
  }
  static calculateThrottleTime(e) {
    let t = e <= 0 ? 0 : e,
      r = Date.now() / 1000;
    return Math.floor(
      Math.min(r + (t || ot.DEFAULT_THROTTLE_TIME_SECONDS), r + ot.DEFAULT_MAX_THROTTLE_TIME_SECONDS) * 1000,
    );
  }
  static removeThrottle(e, t, r, n) {
    let o = Nn(t, r, n),
      generateThrottlingStorageKey = this.generateThrottlingStorageKey(o);
    e.removeItem(generateThrottlingStorageKey, r.correlationId);
  }
}
//@ chunk-mrx6y2r5.js:178219-178423 esm-fingerprint
class NetworkError extends AuthError {
  constructor(e, t, r) {
    super(e.errorCode, e.errorMessage, e.subError);
    (Object.setPrototypeOf(this, NetworkError.prototype),
      (this.name = "NetworkError"),
      (this.error = e),
      (this.httpStatus = t),
      (this.responseHeaders = r));
  }
}
//@ chunk-mrx6y2r5.js:178468-180896 esm-fingerprint
class Te {
  constructor(e, t) {
    ((this.config = Xd(e)),
      (this.logger = new Ue(this.config.loggerOptions, pi, En)),
      (this.cryptoUtils = this.config.cryptoInterface),
      (this.cacheManager = this.config.storageInterface),
      (this.networkClient = this.config.networkInterface),
      (this.serverTelemetryManager = this.config.serverTelemetryManager),
      (this.authority = this.config.authOptions.authority),
      (this.performanceClient = t));
  }
  createTokenRequestHeaders(e) {
    let t = {};
    if (((t[Y.CONTENT_TYPE] = f.URL_FORM_CONTENT_TYPE), !this.config.systemOptions.preventCorsPreflight && e))
      switch (e.type) {
        case Ie.HOME_ACCOUNT_ID:
          try {
            let r = st(e.credential);
            t[Y.CCS_HEADER] = `Oid:${r.uid}@${r.utid}`;
          } catch (error) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + error);
          }
          break;
        case Ie.UPN:
          t[Y.CCS_HEADER] = `UPN: ${e.credential}`;
          break;
      }
    return t;
  }
  async executePostToTokenEndpoint(e, t, r, n, o, i) {
    if (i) this.performanceClient?.addQueueMeasurement(i, o);
    let sendPostRequest = await this.sendPostRequest(n, e, { body: t, headers: r }, o);
    if (this.config.serverTelemetryManager && sendPostRequest.status < 500 && sendPostRequest.status !== 429)
      this.config.serverTelemetryManager.clearTelemetryCache();
    return sendPostRequest;
  }
  async sendPostRequest(e, t, r, n) {
    It.preProcess(this.cacheManager, e, n);
    let o;
    try {
      o = await F(
        this.networkClient.sendPostRequestAsync.bind(this.networkClient),
        h.NetworkClientSendPostRequestAsync,
        this.logger,
        this.performanceClient,
        n,
      )(t, r);
      let i = o.headers || {};
      this.performanceClient?.addFields(
        {
          refreshTokenSize: o.body.refresh_token?.length || 0,
          httpVerToken: i[Y.X_MS_HTTP_VERSION] || "",
          requestId: i[Y.X_MS_REQUEST_ID] || "",
        },
        n,
      );
    } catch (error) {
      if (error instanceof NetworkError) {
        let responseHeaders = error.responseHeaders;
        if (responseHeaders)
          this.performanceClient?.addFields(
            {
              httpVerToken: responseHeaders[Y.X_MS_HTTP_VERSION] || "",
              requestId: responseHeaders[Y.X_MS_REQUEST_ID] || "",
              contentTypeHeader: responseHeaders[Y.CONTENT_TYPE] || void 0,
              contentLengthHeader: responseHeaders[Y.CONTENT_LENGTH] || void 0,
              httpStatus: error.httpStatus,
            },
            n,
          );
        throw error.error;
      }
      if (error instanceof AuthError) throw error;
      else throw g(NETWORK_ERROR);
    }
    return (It.postProcess(this.cacheManager, e, o, n), o);
  }
  async updateAuthority(e, t) {
    this.performanceClient?.addQueueMeasurement(h.UpdateTokenEndpointAuthority, t);
    let r = `https://${e}/${this.authority.tenant}/`,
      n = await Va(
        r,
        this.networkClient,
        this.cacheManager,
        this.authority.options,
        this.logger,
        t,
        this.performanceClient,
      );
    this.authority = n;
  }
  createTokenQueryParameters(e) {
    let t = new Map();
    if (e.embeddedClientId) Kt(t, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    if (e.tokenQueryParameters) Le(t, e.tokenQueryParameters);
    return (at(t, e.correlationId), Pn(t, e.correlationId, this.performanceClient), pe(t));
  }
}
//@ chunk-mrx6y2r5.js:180941-181128 esm-fingerprint
var NO_TOKENS_FOUND = "no_tokens_found",
  NATIVE_ACCOUNT_UNAVAILABLE = "native_account_unavailable",
  REFRESH_TOKEN_EXPIRED = "refresh_token_expired",
  UX_NOT_ALLOWED = "ux_not_allowed",
  INTERACTION_REQUIRED = "interaction_required",
  CONSENT_REQUIRED = "consent_required",
  LOGIN_REQUIRED = "login_required",
  BAD_TOKEN = "bad_token";
//@ chunk-mrx6y2r5.js:181173-181955 esm-layout
var dh = [INTERACTION_REQUIRED, CONSENT_REQUIRED, LOGIN_REQUIRED, BAD_TOKEN, UX_NOT_ALLOWED],
  Fg = [
    "message_only",
    "additional_action",
    "basic_action",
    "user_password_expired",
    "consent_required",
    "bad_token",
  ],
  Gi = {
    [NO_TOKENS_FOUND]: "No refresh token found in the cache. Please sign-in.",
    [NATIVE_ACCOUNT_UNAVAILABLE]:
      "The requested account is not available in the native broker. It may have been deleted or logged out. Please sign-in again using an interactive API.",
    [REFRESH_TOKEN_EXPIRED]: "Refresh token has expired.",
    [BAD_TOKEN]:
      "Identity provider returned bad_token due to an expired or invalid refresh token. Please invoke an interactive API to resolve.",
    [UX_NOT_ALLOWED]:
      "`canShowUI` flag in Edge was set to false. User interaction required on web page. Please invoke an interactive API to resolve.",
  },
  $g = {
    noTokensFoundError: { code: NO_TOKENS_FOUND, desc: Gi[NO_TOKENS_FOUND] },
    native_account_unavailable: { code: NATIVE_ACCOUNT_UNAVAILABLE, desc: Gi[NATIVE_ACCOUNT_UNAVAILABLE] },
    bad_token: { code: BAD_TOKEN, desc: Gi[BAD_TOKEN] },
  };
//@ chunk-mrx6y2r5.js:181955-182245 esm-fingerprint
class InteractionRequiredAuthError extends AuthError {
  constructor(e, t, r, n, o, i, s, a) {
    super(e, t, r);
    (Object.setPrototypeOf(this, InteractionRequiredAuthError.prototype),
      (this.timestamp = n || f.EMPTY_STRING),
      (this.traceId = o || f.EMPTY_STRING),
      (this.correlationId = i || f.EMPTY_STRING),
      (this.claims = s || f.EMPTY_STRING),
      (this.name = "InteractionRequiredAuthError"),
      (this.errorNo = a));
  }
}
//@ chunk-mrx6y2r5.js:182245-182368 esm-fingerprint
function uh(e, t, r) {
  let n = !!e && dh.indexOf(e) > -1,
    o = !!r && Fg.indexOf(r) > -1,
    i = !!t && dh.some((s) => t.indexOf(s) > -1);
  return n || i || o;
}
//@ chunk-mrx6y2r5.js:182368-182406 esm-layout
function Ya(e) {
  return new InteractionRequiredAuthError(e, Gi[e]);
}
//@ chunk-mrx6y2r5.js:182451-182997 esm-fingerprint
class qi {
  static setRequestState(e, t, r) {
    let generateLibraryState = qi.generateLibraryState(e, r);
    return t ? `${generateLibraryState}${f.RESOURCE_DELIM}${t}` : generateLibraryState;
  }
  static generateLibraryState(e, t) {
    if (!e) throw g(NO_CRYPTO_OBJECT);
    let r = { id: e.createNewGuid() };
    if (t) r.meta = t;
    let json = JSON.stringify(r);
    return e.base64Encode(json);
  }
  static parseRequestState(e, t) {
    if (!e) throw g(NO_CRYPTO_OBJECT);
    if (!t) throw g(INVALID_STATE);
    try {
      let parts = t.split(f.RESOURCE_DELIM),
        n = parts[0],
        o = parts.length > 1 ? parts.slice(1).join(f.RESOURCE_DELIM) : f.EMPTY_STRING,
        base64Decode = e.base64Decode(n),
        parsed = JSON.parse(base64Decode);
      return { userRequestState: o || f.EMPTY_STRING, libraryState: parsed };
    } catch (error) {
      throw g(INVALID_STATE);
    }
  }
}
//@ chunk-mrx6y2r5.js:183042-183059 esm-fingerprint
var Bg = { SW: "sw" };
//@ chunk-mrx6y2r5.js:183059-184065 esm-fingerprint
class Rr {
  constructor(e, t) {
    ((this.cryptoUtils = e), (this.performanceClient = t));
  }
  async generateCnf(e, t) {
    this.performanceClient?.addQueueMeasurement(h.PopTokenGenerateCnf, e.correlationId);
    let r = await F(
        this.generateKid.bind(this),
        h.PopTokenGenerateCnf,
        t,
        this.performanceClient,
        e.correlationId,
      )(e),
      base64UrlEncode = this.cryptoUtils.base64UrlEncode(JSON.stringify(r));
    return { kid: r.kid, reqCnfString: base64UrlEncode };
  }
  async generateKid(e) {
    return (
      this.performanceClient?.addQueueMeasurement(h.PopTokenGenerateKid, e.correlationId),
      { kid: await this.cryptoUtils.getPublicKeyThumbprint(e), xms_ksl: Bg.SW }
    );
  }
  async signPopToken(e, t, r) {
    return this.signPayload(e, t, r);
  }
  async signPayload(e, t, r, n) {
    let {
        resourceRequestMethod: resourceRequestMethod,
        resourceRequestUri: resourceRequestUri,
        shrClaims: shrClaims,
        shrNonce: shrNonce,
        shrOptions: shrOptions,
      } = r,
      d = (resourceRequestUri ? new N(resourceRequestUri) : void 0)?.getUrlComponents();
    return this.cryptoUtils.signJwt(
      {
        at: e,
        ts: Q(),
        m: resourceRequestMethod?.toUpperCase(),
        u: d?.HostNameAndPort,
        nonce: shrNonce || this.cryptoUtils.createNewGuid(),
        p: d?.AbsolutePath,
        q: d?.QueryString ? [[], d.QueryString] : void 0,
        client_claims: shrClaims || void 0,
        ...n,
      },
      t,
      shrOptions,
      r.correlationId,
    );
  }
}
//@ chunk-mrx6y2r5.js:184110-184248 esm-fingerprint
class Xe {
  constructor(e, t) {
    ((this.cache = e), (this.hasChanged = t));
  }
  get cacheHasChanged() {
    return this.hasChanged;
  }
  get tokenCache() {
    return this.cache;
  }
}
//@ chunk-mrx6y2r5.js:184293-189654 esm-fingerprint
class ie {
  constructor(e, t, r, n, o, i, s) {
    ((this.clientId = e),
      (this.cacheStorage = t),
      (this.cryptoObj = r),
      (this.logger = n),
      (this.serializableCache = o),
      (this.persistencePlugin = i),
      (this.performanceClient = s));
  }
  validateTokenResponse(e, t) {
    if (e.error || e.error_description || e.suberror) {
      let r = `Error(s): ${e.error_codes || f.NOT_AVAILABLE} - Timestamp: ${e.timestamp || f.NOT_AVAILABLE} - Description: ${e.error_description || f.NOT_AVAILABLE} - Correlation ID: ${e.correlation_id || f.NOT_AVAILABLE} - Trace ID: ${e.trace_id || f.NOT_AVAILABLE}`,
        n = e.error_codes?.length ? e.error_codes[0] : void 0,
        o = new ServerError(e.error, r, e.suberror, n, e.status);
      if (t && e.status && e.status >= b.SERVER_ERROR_RANGE_START && e.status <= b.SERVER_ERROR_RANGE_END) {
        this.logger
          .warning(`executeTokenRequest:validateTokenResponse - AAD is currently unavailable and the access token is unable to be refreshed.
${o}`);
        return;
      } else if (
        t &&
        e.status &&
        e.status >= b.CLIENT_ERROR_RANGE_START &&
        e.status <= b.CLIENT_ERROR_RANGE_END
      ) {
        this.logger
          .warning(`executeTokenRequest:validateTokenResponse - AAD is currently available but is unable to refresh the access token.
${o}`);
        return;
      }
      if (uh(e.error, e.error_description, e.suberror))
        throw new InteractionRequiredAuthError(
          e.error,
          e.error_description,
          e.suberror,
          e.timestamp || f.EMPTY_STRING,
          e.trace_id || f.EMPTY_STRING,
          e.correlation_id || f.EMPTY_STRING,
          e.claims || f.EMPTY_STRING,
          n,
        );
      throw o;
    }
  }
  async handleServerTokenResponse(e, t, r, n, o, i, s, a, c) {
    this.performanceClient?.addQueueMeasurement(h.HandleServerTokenResponse, e.correlation_id);
    let l;
    if (e.id_token) {
      if (((l = yt(e.id_token || f.EMPTY_STRING, this.cryptoObj.base64Decode)), o && o.nonce)) {
        if (l.nonce !== o.nonce) throw g(NONCE_MISMATCH);
      }
      if (n.maxAge || n.maxAge === 0) {
        let auth_time = l.auth_time;
        if (!auth_time) throw g(AUTH_TIME_NOT_FOUND);
        ki(auth_time, n.maxAge);
      }
    }
    this.homeAccountIdentifier = fe.generateHomeAccountId(
      e.client_info || f.EMPTY_STRING,
      t.authorityType,
      this.logger,
      this.cryptoObj,
      l,
    );
    let d;
    if (!!o && !!o.state) d = qi.parseRequestState(this.cryptoObj, o.state);
    e.key_id = e.key_id || n.sshKid || void 0;
    let generateCacheRecord = this.generateCacheRecord(e, t, r, n, l, i, o),
      m;
    try {
      if (this.persistencePlugin && this.serializableCache)
        (this.logger.verbose("Persistence enabled, calling beforeCacheAccess"),
          (m = new Xe(this.serializableCache, !0)),
          await this.persistencePlugin.beforeCacheAccess(m));
      if (s && !a && generateCacheRecord.account) {
        let generateAccountKey = this.cacheStorage.generateAccountKey(
          fe.getAccountInfo(generateCacheRecord.account),
        );
        if (!this.cacheStorage.getAccount(generateAccountKey, n.correlationId))
          return (
            this.logger.warning(
              "Account used to refresh tokens not in persistence, refreshed tokens will not be stored in the cache",
            ),
            await ie.generateAuthenticationResult(
              this.cryptoObj,
              t,
              generateCacheRecord,
              !1,
              n,
              l,
              d,
              void 0,
              c,
            )
          );
      }
      await this.cacheStorage.saveCacheRecord(
        generateCacheRecord,
        n.correlationId,
        qd(l || {}),
        n.storeInCache,
      );
    } finally {
      if (this.persistencePlugin && this.serializableCache && m)
        (this.logger.verbose("Persistence enabled, calling afterCacheAccess"),
          await this.persistencePlugin.afterCacheAccess(m));
    }
    return ie.generateAuthenticationResult(this.cryptoObj, t, generateCacheRecord, !1, n, l, d, e, c);
  }
  generateCacheRecord(e, t, r, n, o, i, s) {
    let preferredCache = t.getPreferredCache();
    if (!preferredCache) throw g(INVALID_CACHE_ENVIRONMENT);
    let c = vi(o),
      l,
      d;
    if (e.id_token && !!o)
      ((l = Ju(this.homeAccountIdentifier, preferredCache, e.id_token, this.clientId, c || "")),
        (d = hh(
          this.cacheStorage,
          t,
          this.homeAccountIdentifier,
          this.cryptoObj.base64Decode,
          n.correlationId,
          o,
          e.client_info,
          preferredCache,
          c,
          s,
          void 0,
          this.logger,
        )));
    let u = null;
    if (e.access_token) {
      let y = e.scope ? oe.fromString(e.scope) : new oe(n.scopes || []),
        T = (typeof e.expires_in === "string" ? parseInt(e.expires_in, 10) : e.expires_in) || 0,
        I = (typeof e.ext_expires_in === "string" ? parseInt(e.ext_expires_in, 10) : e.ext_expires_in) || 0,
        v = (typeof e.refresh_in === "string" ? parseInt(e.refresh_in, 10) : e.refresh_in) || void 0,
        U = r + T,
        B = U + I,
        X = v && v > 0 ? r + v : void 0;
      u = Xu(
        this.homeAccountIdentifier,
        preferredCache,
        e.access_token,
        this.clientId,
        c || t.tenant || "",
        y.printScopes(),
        U,
        B,
        this.cryptoObj.base64Decode,
        X,
        e.token_type,
        i,
        e.key_id,
        n.claims,
        n.requestedClaimsHash,
      );
    }
    let m = null;
    if (e.refresh_token) {
      let y;
      if (e.refresh_token_expires_in) {
        let T =
          typeof e.refresh_token_expires_in === "string"
            ? parseInt(e.refresh_token_expires_in, 10)
            : e.refresh_token_expires_in;
        y = r + T;
      }
      m = Zu(this.homeAccountIdentifier, preferredCache, e.refresh_token, this.clientId, e.foci, i, y);
    }
    let p = null;
    if (e.foci) p = { clientId: this.clientId, environment: preferredCache, familyId: e.foci };
    return { account: d, idToken: l, accessToken: u, refreshToken: m, appMetadata: p };
  }
  static async generateAuthenticationResult(e, t, r, n, o, i, s, a, c) {
    let EMPTY_STRING = f.EMPTY_STRING,
      d = [],
      u = null,
      m,
      p,
      EMPTY_STRING_2 = f.EMPTY_STRING;
    if (r.accessToken) {
      if (r.accessToken.tokenType === L.POP && !o.popKid) {
        let U = new Rr(e),
          { secret: secret, keyId: keyId } = r.accessToken;
        if (!keyId) throw g(KEY_ID_MISSING);
        EMPTY_STRING = await U.signPopToken(secret, keyId, o);
      } else EMPTY_STRING = r.accessToken.secret;
      if (
        ((d = oe.fromString(r.accessToken.target).asArray()),
        (u = Li(r.accessToken.expiresOn)),
        (m = Li(r.accessToken.extendedExpiresOn)),
        r.accessToken.refreshOn)
      )
        p = Li(r.accessToken.refreshOn);
    }
    if (r.appMetadata) EMPTY_STRING_2 = r.appMetadata.familyId === xt ? xt : "";
    let T = i?.oid || i?.sub || "",
      I = i?.tid || "";
    if (a?.spa_accountid && !!r.account) r.account.nativeAccountId = a?.spa_accountid;
    let v = r.account ? wi(fe.getAccountInfo(r.account), void 0, i, r.idToken?.secret) : null;
    return {
      authority: t.canonicalAuthority,
      uniqueId: T,
      tenantId: I,
      scopes: d,
      account: v,
      idToken: r?.idToken?.secret || "",
      idTokenClaims: i || {},
      accessToken: EMPTY_STRING,
      fromCache: n,
      expiresOn: u,
      extExpiresOn: m,
      refreshOn: p,
      correlationId: o.correlationId,
      requestId: c || f.EMPTY_STRING,
      familyId: EMPTY_STRING_2,
      tokenType: r.accessToken?.tokenType || f.EMPTY_STRING,
      state: s ? s.userRequestState : f.EMPTY_STRING,
      cloudGraphHostName: r.account?.cloudGraphHostName || f.EMPTY_STRING,
      msGraphHost: r.account?.msGraphHost || f.EMPTY_STRING,
      code: a?.spa_code,
      fromNativeBroker: !1,
    };
  }
}
//@ chunk-mrx6y2r5.js:189654-190138 esm-fingerprint
function hh(e, t, r, n, o, i, s, a, c, l, d, u) {
  u?.verbose("setCachedAccount called");
  let found = e.getAccountKeys().find((U) => U.startsWith(r)),
    y = null;
  if (found) y = e.getAccount(found, o);
  let T =
      y ||
      fe.createAccount(
        {
          homeAccountId: r,
          idTokenClaims: i,
          clientInfo: s,
          environment: a,
          cloudGraphHostName: l?.cloud_graph_host_name,
          msGraphHost: l?.msgraph_host,
          nativeAccountId: d,
        },
        t,
        n,
      ),
    I = T.tenantProfiles || [],
    v = c || T.realm;
  if (v && !I.find((U) => U.tenantId === v)) {
    let U = po(r, T.localAccountId, v, i);
    I.push(U);
  }
  return ((T.tenantProfiles = I), T);
}
//@ chunk-mrx6y2r5.js:190183-190284 esm-fingerprint
async function _e(e, t, r) {
  if (typeof e === "string") return e;
  else return e({ clientId: t, tokenEndpoint: r });
}
//@ chunk-mrx6y2r5.js:190329-194992 esm-fingerprint
class Ki extends Te {
  constructor(e, t) {
    super(e, t);
    ((this.includeRedirectUri = !0),
      (this.oidcDefaultScopes = this.config.authOptions.authority.options.OIDCOptions?.defaultScopes));
  }
  async acquireToken(e, t) {
    if ((this.performanceClient?.addQueueMeasurement(h.AuthClientAcquireToken, e.correlationId), !e.code))
      throw g(REQUEST_CANNOT_BE_MADE);
    let r = Q(),
      n = await F(
        this.executeTokenRequest.bind(this),
        h.AuthClientExecuteTokenRequest,
        this.logger,
        this.performanceClient,
        e.correlationId,
      )(this.authority, e),
      o = n.headers?.[Y.X_MS_REQUEST_ID],
      i = new ie(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
        this.performanceClient,
      );
    return (
      i.validateTokenResponse(n.body),
      F(
        i.handleServerTokenResponse.bind(i),
        h.HandleServerTokenResponse,
        this.logger,
        this.performanceClient,
        e.correlationId,
      )(n.body, this.authority, r, e, t, void 0, void 0, void 0, o)
    );
  }
  getLogoutUri(e) {
    if (!e) throw V(LOGOUT_REQUEST_EMPTY);
    let logoutUrlQueryString = this.createLogoutUrlQueryString(e);
    return N.appendQueryString(this.authority.endSessionEndpoint, logoutUrlQueryString);
  }
  async executeTokenRequest(e, t) {
    this.performanceClient?.addQueueMeasurement(h.AuthClientExecuteTokenRequest, t.correlationId);
    let tokenQueryParameters = this.createTokenQueryParameters(t),
      appendQueryString = N.appendQueryString(e.tokenEndpoint, tokenQueryParameters),
      o = await F(
        this.createTokenRequestBody.bind(this),
        h.AuthClientCreateTokenRequestBody,
        this.logger,
        this.performanceClient,
        t.correlationId,
      )(t),
      i = void 0;
    if (t.clientInfo)
      try {
        let c = kn(t.clientInfo, this.cryptoUtils.base64Decode);
        i = { credential: `${c.uid}${pt.CLIENT_INFO_SEPARATOR}${c.utid}`, type: Ie.HOME_ACCOUNT_ID };
      } catch (error) {
        this.logger.verbose("Could not parse client info for CCS Header: " + error);
      }
    let tokenRequestHeaders = this.createTokenRequestHeaders(i || t.ccsCredential),
      a = Nn(this.config.authOptions.clientId, t);
    return F(
      this.executePostToTokenEndpoint.bind(this),
      h.AuthorizationCodeClientExecutePostToTokenEndpoint,
      this.logger,
      this.performanceClient,
      t.correlationId,
    )(
      appendQueryString,
      o,
      tokenRequestHeaders,
      a,
      t.correlationId,
      h.AuthorizationCodeClientExecutePostToTokenEndpoint,
    );
  }
  async createTokenRequestBody(e) {
    this.performanceClient?.addQueueMeasurement(h.AuthClientCreateTokenRequestBody, e.correlationId);
    let t = new Map();
    if (
      (Qe(t, e.embeddedClientId || e.tokenBodyParameters?.[CLIENT_ID] || this.config.authOptions.clientId),
      !this.includeRedirectUri)
    ) {
      if (!e.redirectUri) throw V(REDIRECT_URI_EMPTY);
    } else On(t, e.redirectUri);
    if (
      (We(t, e.scopes, !0, this.oidcDefaultScopes),
      zu(t, e.code),
      Et(t, this.config.libraryInfo),
      Ct(t, this.config.telemetry.application),
      qt(t),
      this.serverTelemetryManager && !Oi(this.config))
    )
      Gt(t, this.serverTelemetryManager);
    if (e.codeVerifier) qu(t, e.codeVerifier);
    if (this.config.clientCredentials.clientSecret) Tr(t, this.config.clientCredentials.clientSecret);
    if (this.config.clientCredentials.clientAssertion) {
      let clientAssertion = this.config.clientCredentials.clientAssertion;
      (Er(t, await _e(clientAssertion.assertion, this.config.authOptions.clientId, e.resourceRequestUri)),
        Cr(t, clientAssertion.assertionType));
    }
    if ((zt(t, Pe.AUTHORIZATION_CODE_GRANT), At(t), e.authenticationScheme === L.POP)) {
      let n = new Rr(this.cryptoUtils, this.performanceClient),
        o;
      if (!e.popKid)
        o = (
          await F(
            n.generateCnf.bind(n),
            h.PopTokenGenerateCnf,
            this.logger,
            this.performanceClient,
            e.correlationId,
          )(e, this.logger)
        ).reqCnfString;
      else o = this.cryptoUtils.encodeKid(e.popKid);
      Di(t, o);
    } else if (e.authenticationScheme === L.SSH)
      if (e.sshJwk) Ui(t, e.sshJwk);
      else throw V(MISSING_SSH_JWK);
    if (
      !re.isEmptyObj(e.claims) ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      Je(t, e.claims, this.config.authOptions.clientCapabilities);
    let r = void 0;
    if (e.clientInfo)
      try {
        let n = kn(e.clientInfo, this.cryptoUtils.base64Decode);
        r = { credential: `${n.uid}${pt.CLIENT_INFO_SEPARATOR}${n.utid}`, type: Ie.HOME_ACCOUNT_ID };
      } catch (error) {
        this.logger.verbose("Could not parse client info for CCS Header: " + error);
      }
    else r = e.ccsCredential;
    if (this.config.systemOptions.preventCorsPreflight && r)
      switch (r.type) {
        case Ie.HOME_ACCOUNT_ID:
          try {
            let n = st(r.credential);
            Bt(t, n);
          } catch (error) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + error);
          }
          break;
        case Ie.UPN:
          $t(t, r.credential);
          break;
      }
    if (e.embeddedClientId) Kt(t, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    if (e.tokenBodyParameters) Le(t, e.tokenBodyParameters);
    if (e.enableSpaAuthorizationCode && (!e.tokenBodyParameters || !e.tokenBodyParameters[RETURN_SPA_CODE]))
      Le(t, { [RETURN_SPA_CODE]: "1" });
    return (Pn(t, e.correlationId, this.performanceClient), pe(t));
  }
  createLogoutUrlQueryString(e) {
    let t = new Map();
    if (e.postLogoutRedirectUri) Lu(t, e.postLogoutRedirectUri);
    if (e.correlationId) at(t, e.correlationId);
    if (e.idTokenHint) Hu(t, e.idTokenHint);
    if (e.state) xi(t, e.state);
    if (e.logoutHint) Ku(t, e.logoutHint);
    if (e.extraQueryParameters) Le(t, e.extraQueryParameters);
    if (this.config.authOptions.instanceAware) Mi(t);
    return pe(t, this.config.authOptions.encodeExtraQueryParams, e.extraQueryParameters);
  }
}
//@ chunk-mrx6y2r5.js:195037-195048 esm-layout
var zg = 300;
//@ chunk-mrx6y2r5.js:195048-200556 esm-fingerprint
class xn extends Te {
  constructor(e, t) {
    super(e, t);
  }
  async acquireToken(e) {
    this.performanceClient?.addQueueMeasurement(h.RefreshTokenClientAcquireToken, e.correlationId);
    let t = Q(),
      r = await F(
        this.executeTokenRequest.bind(this),
        h.RefreshTokenClientExecuteTokenRequest,
        this.logger,
        this.performanceClient,
        e.correlationId,
      )(e, this.authority),
      n = r.headers?.[Y.X_MS_REQUEST_ID],
      o = new ie(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
    return (
      o.validateTokenResponse(r.body),
      F(
        o.handleServerTokenResponse.bind(o),
        h.HandleServerTokenResponse,
        this.logger,
        this.performanceClient,
        e.correlationId,
      )(r.body, this.authority, t, e, void 0, void 0, !0, e.forceCache, n)
    );
  }
  async acquireTokenByRefreshToken(e) {
    if (!e) throw V(TOKEN_REQUEST_EMPTY);
    if (
      (this.performanceClient?.addQueueMeasurement(
        h.RefreshTokenClientAcquireTokenByRefreshToken,
        e.correlationId,
      ),
      !e.account)
    )
      throw g(NO_ACCOUNT_IN_SILENT_REQUEST);
    if (this.cacheManager.isAppMetadataFOCI(e.account.environment))
      try {
        return await F(
          this.acquireTokenWithCachedRefreshToken.bind(this),
          h.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
          this.logger,
          this.performanceClient,
          e.correlationId,
        )(e, !0);
      } catch (error) {
        let n = error instanceof InteractionRequiredAuthError && error.errorCode === NO_TOKENS_FOUND,
          o =
            error instanceof ServerError &&
            error.errorCode === no.INVALID_GRANT_ERROR &&
            error.subError === no.CLIENT_MISMATCH_ERROR;
        if (n || o)
          return F(
            this.acquireTokenWithCachedRefreshToken.bind(this),
            h.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
            this.logger,
            this.performanceClient,
            e.correlationId,
          )(e, !1);
        else throw error;
      }
    return F(
      this.acquireTokenWithCachedRefreshToken.bind(this),
      h.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
      this.logger,
      this.performanceClient,
      e.correlationId,
    )(e, !1);
  }
  async acquireTokenWithCachedRefreshToken(e, t) {
    this.performanceClient?.addQueueMeasurement(
      h.RefreshTokenClientAcquireTokenWithCachedRefreshToken,
      e.correlationId,
    );
    let r = Wu(
      this.cacheManager.getRefreshToken.bind(this.cacheManager),
      h.CacheManagerGetRefreshToken,
      this.logger,
      this.performanceClient,
      e.correlationId,
    )(e.account, t, e.correlationId, void 0, this.performanceClient);
    if (!r) throw Ya(NO_TOKENS_FOUND);
    if (r.expiresOn && Vt(r.expiresOn, e.refreshTokenExpirationOffsetSeconds || zg))
      throw (
        this.performanceClient?.addFields({ rtExpiresOnMs: Number(r.expiresOn) }, e.correlationId),
        Ya(REFRESH_TOKEN_EXPIRED)
      );
    let n = {
      ...e,
      refreshToken: r.secret,
      authenticationScheme: e.authenticationScheme || L.BEARER,
      ccsCredential: { credential: e.account.homeAccountId, type: Ie.HOME_ACCOUNT_ID },
    };
    try {
      return await F(
        this.acquireToken.bind(this),
        h.RefreshTokenClientAcquireToken,
        this.logger,
        this.performanceClient,
        e.correlationId,
      )(n);
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        if (
          (this.performanceClient?.addFields({ rtExpiresOnMs: Number(r.expiresOn) }, e.correlationId),
          error.subError === BAD_TOKEN)
        ) {
          this.logger.verbose("acquireTokenWithRefreshToken: bad refresh token, removing from cache");
          let generateCredentialKey = this.cacheManager.generateCredentialKey(r);
          this.cacheManager.removeRefreshToken(generateCredentialKey, e.correlationId);
        }
      }
      throw error;
    }
  }
  async executeTokenRequest(e, t) {
    this.performanceClient?.addQueueMeasurement(h.RefreshTokenClientExecuteTokenRequest, e.correlationId);
    let tokenQueryParameters = this.createTokenQueryParameters(e),
      appendQueryString = N.appendQueryString(t.tokenEndpoint, tokenQueryParameters),
      o = await F(
        this.createTokenRequestBody.bind(this),
        h.RefreshTokenClientCreateTokenRequestBody,
        this.logger,
        this.performanceClient,
        e.correlationId,
      )(e),
      tokenRequestHeaders = this.createTokenRequestHeaders(e.ccsCredential),
      s = Nn(this.config.authOptions.clientId, e);
    return F(
      this.executePostToTokenEndpoint.bind(this),
      h.RefreshTokenClientExecutePostToTokenEndpoint,
      this.logger,
      this.performanceClient,
      e.correlationId,
    )(
      appendQueryString,
      o,
      tokenRequestHeaders,
      s,
      e.correlationId,
      h.RefreshTokenClientExecutePostToTokenEndpoint,
    );
  }
  async createTokenRequestBody(e) {
    this.performanceClient?.addQueueMeasurement(h.RefreshTokenClientCreateTokenRequestBody, e.correlationId);
    let t = new Map();
    if (
      (Qe(t, e.embeddedClientId || e.tokenBodyParameters?.[CLIENT_ID] || this.config.authOptions.clientId),
      e.redirectUri)
    )
      On(t, e.redirectUri);
    if (
      (We(t, e.scopes, !0, this.config.authOptions.authority.options.OIDCOptions?.defaultScopes),
      zt(t, Pe.REFRESH_TOKEN_GRANT),
      At(t),
      Et(t, this.config.libraryInfo),
      Ct(t, this.config.telemetry.application),
      qt(t),
      this.serverTelemetryManager && !Oi(this.config))
    )
      Gt(t, this.serverTelemetryManager);
    if ((Gu(t, e.refreshToken), this.config.clientCredentials.clientSecret))
      Tr(t, this.config.clientCredentials.clientSecret);
    if (this.config.clientCredentials.clientAssertion) {
      let clientAssertion = this.config.clientCredentials.clientAssertion;
      (Er(t, await _e(clientAssertion.assertion, this.config.authOptions.clientId, e.resourceRequestUri)),
        Cr(t, clientAssertion.assertionType));
    }
    if (e.authenticationScheme === L.POP) {
      let r = new Rr(this.cryptoUtils, this.performanceClient),
        n;
      if (!e.popKid)
        n = (
          await F(
            r.generateCnf.bind(r),
            h.PopTokenGenerateCnf,
            this.logger,
            this.performanceClient,
            e.correlationId,
          )(e, this.logger)
        ).reqCnfString;
      else n = this.cryptoUtils.encodeKid(e.popKid);
      Di(t, n);
    } else if (e.authenticationScheme === L.SSH)
      if (e.sshJwk) Ui(t, e.sshJwk);
      else throw V(MISSING_SSH_JWK);
    if (
      !re.isEmptyObj(e.claims) ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      Je(t, e.claims, this.config.authOptions.clientCapabilities);
    if (this.config.systemOptions.preventCorsPreflight && e.ccsCredential)
      switch (e.ccsCredential.type) {
        case Ie.HOME_ACCOUNT_ID:
          try {
            let r = st(e.ccsCredential.credential);
            Bt(t, r);
          } catch (error) {
            this.logger.verbose("Could not parse home account ID for CCS Header: " + error);
          }
          break;
        case Ie.UPN:
          $t(t, e.ccsCredential.credential);
          break;
      }
    if (e.embeddedClientId) Kt(t, this.config.authOptions.clientId, this.config.authOptions.redirectUri);
    if (e.tokenBodyParameters) Le(t, e.tokenBodyParameters);
    return (Pn(t, e.correlationId, this.performanceClient), pe(t));
  }
}
//@ chunk-mrx6y2r5.js:200601-202702 esm-fingerprint
class Vi extends Te {
  constructor(e, t) {
    super(e, t);
  }
  async acquireCachedToken(e) {
    this.performanceClient?.addQueueMeasurement(h.SilentFlowClientAcquireCachedToken, e.correlationId);
    let NOT_APPLICABLE = j.NOT_APPLICABLE;
    if (e.forceRefresh || (!this.config.cacheOptions.claimsBasedCachingEnabled && !re.isEmptyObj(e.claims)))
      throw (this.setCacheOutcome(j.FORCE_REFRESH_OR_CLAIMS, e.correlationId), g(TOKEN_REFRESH_REQUIRED));
    if (!e.account) throw g(NO_ACCOUNT_IN_SILENT_REQUEST);
    let r = e.account.tenantId || ih(e.authority),
      tokenKeys = this.cacheManager.getTokenKeys(),
      accessToken = this.cacheManager.getAccessToken(e.account, e, tokenKeys, r);
    if (!accessToken)
      throw (this.setCacheOutcome(j.NO_CACHED_ACCESS_TOKEN, e.correlationId), g(TOKEN_REFRESH_REQUIRED));
    else if (
      Qu(accessToken.cachedAt) ||
      Vt(accessToken.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds)
    )
      throw (this.setCacheOutcome(j.CACHED_ACCESS_TOKEN_EXPIRED, e.correlationId), g(TOKEN_REFRESH_REQUIRED));
    else if (accessToken.refreshOn && Vt(accessToken.refreshOn, 0)) NOT_APPLICABLE = j.PROACTIVELY_REFRESHED;
    let i = e.authority || this.authority.getPreferredCache(),
      s = {
        account: this.cacheManager.getAccount(
          this.cacheManager.generateAccountKey(e.account),
          e.correlationId,
        ),
        accessToken: accessToken,
        idToken: this.cacheManager.getIdToken(
          e.account,
          e.correlationId,
          tokenKeys,
          r,
          this.performanceClient,
        ),
        refreshToken: null,
        appMetadata: this.cacheManager.readAppMetadataFromCache(i),
      };
    if ((this.setCacheOutcome(NOT_APPLICABLE, e.correlationId), this.config.serverTelemetryManager))
      this.config.serverTelemetryManager.incrementCacheHits();
    return [
      await F(
        this.generateResultFromCacheRecord.bind(this),
        h.SilentFlowClientGenerateResultFromCacheRecord,
        this.logger,
        this.performanceClient,
        e.correlationId,
      )(s, e),
      NOT_APPLICABLE,
    ];
  }
  setCacheOutcome(e, t) {
    if (
      (this.serverTelemetryManager?.setCacheOutcome(e),
      this.performanceClient?.addFields({ cacheOutcome: e }, t),
      e !== j.NOT_APPLICABLE)
    )
      this.logger.info(`Token refresh is required due to cache outcome: ${e}`);
  }
  async generateResultFromCacheRecord(e, t) {
    this.performanceClient?.addQueueMeasurement(
      h.SilentFlowClientGenerateResultFromCacheRecord,
      t.correlationId,
    );
    let r;
    if (e.idToken) r = yt(e.idToken.secret, this.config.cryptoInterface.base64Decode);
    if (t.maxAge || t.maxAge === 0) {
      let n = r?.auth_time;
      if (!n) throw g(AUTH_TIME_NOT_FOUND);
      ki(n, t.maxAge);
    }
    return ie.generateAuthenticationResult(this.cryptoUtils, this.authority, e, !0, t, r);
  }
}
//@ chunk-mrx6y2r5.js:202747-205278 esm-fingerprint
function Gg(e, t, r, n) {
  let correlationId = t.correlationId,
    i = new Map();
  Qe(i, t.embeddedClientId || t.extraQueryParameters?.[CLIENT_ID] || e.clientId);
  let s = [...(t.scopes || []), ...(t.extraScopesToConsent || [])];
  if (
    (We(i, s, !0, e.authority.options.OIDCOptions?.defaultScopes),
    On(i, t.redirectUri),
    at(i, correlationId),
    Uu(i, t.responseMode),
    At(i),
    t.prompt)
  )
    ($u(i, t.prompt), n?.addFields({ prompt: t.prompt }, correlationId));
  if (t.domainHint) (Fu(i, t.domainHint), n?.addFields({ domainHintFromRequest: !0 }, correlationId));
  if (t.prompt !== or.SELECT_ACCOUNT) {
    if (t.sid && t.prompt === or.NONE)
      (r.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from request"),
        Ba(i, t.sid),
        n?.addFields({ sidFromRequest: !0 }, correlationId));
    else if (t.account) {
      let a = Kg(t.account),
        c = Vg(t.account);
      if (c && t.domainHint)
        (r.warning(
          'AuthorizationCodeClient.createAuthCodeUrlQueryString: "domainHint" param is set, skipping opaque "login_hint" claim. Please consider not passing domainHint',
        ),
          (c = null));
      if (c) {
        (r.verbose("createAuthCodeUrlQueryString: login_hint claim present on account"),
          Eo(i, c),
          n?.addFields({ loginHintFromClaim: !0 }, correlationId));
        try {
          let l = st(t.account.homeAccountId);
          Bt(i, l);
        } catch (error) {
          r.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      } else if (a && t.prompt === or.NONE) {
        (r.verbose("createAuthCodeUrlQueryString: Prompt is none, adding sid from account"),
          Ba(i, a),
          n?.addFields({ sidFromClaim: !0 }, correlationId));
        try {
          let l = st(t.account.homeAccountId);
          Bt(i, l);
        } catch (error) {
          r.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      } else if (t.loginHint)
        (r.verbose("createAuthCodeUrlQueryString: Adding login_hint from request"),
          Eo(i, t.loginHint),
          $t(i, t.loginHint),
          n?.addFields({ loginHintFromRequest: !0 }, correlationId));
      else if (t.account.username) {
        (r.verbose("createAuthCodeUrlQueryString: Adding login_hint from account"),
          Eo(i, t.account.username),
          n?.addFields({ loginHintFromUpn: !0 }, correlationId));
        try {
          let l = st(t.account.homeAccountId);
          Bt(i, l);
        } catch (error) {
          r.verbose("createAuthCodeUrlQueryString: Could not parse home account ID for CCS Header");
        }
      }
    } else if (t.loginHint)
      (r.verbose("createAuthCodeUrlQueryString: No account, adding login_hint from request"),
        Eo(i, t.loginHint),
        $t(i, t.loginHint),
        n?.addFields({ loginHintFromRequest: !0 }, correlationId));
  } else r.verbose("createAuthCodeUrlQueryString: Prompt is select_account, ignoring account hints");
  if (t.nonce) Bu(i, t.nonce);
  if (t.state) xi(i, t.state);
  if (t.claims || (e.clientCapabilities && e.clientCapabilities.length > 0))
    Je(i, t.claims, e.clientCapabilities);
  if (t.embeddedClientId) Kt(i, e.clientId, e.redirectUri);
  if (
    e.instanceAware &&
    (!t.extraQueryParameters || !Object.keys(t.extraQueryParameters).includes(INSTANCE_AWARE))
  )
    Mi(i);
  return i;
}
//@ chunk-mrx6y2r5.js:205278-205369 esm-fingerprint
function qg(e, t, r, n) {
  let o = pe(t, r, n);
  return N.appendQueryString(e.authorizationEndpoint, o);
}
//@ chunk-mrx6y2r5.js:205369-205418 esm-fingerprint
function Kg(e) {
  return e.idTokenClaims?.sid || null;
}
//@ chunk-mrx6y2r5.js:205418-205487 esm-fingerprint
function Vg(e) {
  return e.loginHint || e.idTokenClaims?.login_hint || null;
}
//@ chunk-mrx6y2r5.js:205532-205550 esm-layout
var mh = ",",
  ph = "|";
//@ chunk-mrx6y2r5.js:205550-205905 esm-fingerprint
function jg(e) {
  let {
      skus: skus,
      libraryName: libraryName,
      libraryVersion: libraryVersion,
      extensionName: extensionName,
      extensionVersion: extensionVersion,
    } = e,
    s = new Map([
      [0, [libraryName, libraryVersion]],
      [2, [extensionName, extensionVersion]],
    ]),
    a = [];
  if (skus?.length) {
    if (((a = skus.split(mh)), a.length < 4)) return skus;
  } else a = Array.from({ length: 4 }, () => ph);
  return (
    s.forEach((c, l) => {
      if (c.length === 2 && c[0]?.length && c[1]?.length)
        Yg({ skuArr: a, index: l, skuName: c[0], skuVersion: c[1] });
    }),
    a.join(mh)
  );
}
//@ chunk-mrx6y2r5.js:205905-206009 esm-fingerprint
function Yg(e) {
  let { skuArr: skuArr, index: index, skuName: skuName, skuVersion: skuVersion } = e;
  if (index >= skuArr.length) return;
  skuArr[index] = [skuName, skuVersion].join(ph);
}
//@ chunk-mrx6y2r5.js:206009-209339 esm-fingerprint
class jt {
  constructor(e, t) {
    ((this.cacheOutcome = j.NOT_APPLICABLE),
      (this.cacheManager = t),
      (this.apiId = e.apiId),
      (this.correlationId = e.correlationId),
      (this.wrapperSKU = e.wrapperSKU || f.EMPTY_STRING),
      (this.wrapperVer = e.wrapperVer || f.EMPTY_STRING),
      (this.telemetryCacheKey = de.CACHE_KEY + pt.CACHE_KEY_SEPARATOR + e.clientId));
  }
  generateCurrentRequestHeaderValue() {
    let e = `${this.apiId}${de.VALUE_SEPARATOR}${this.cacheOutcome}`,
      t = [this.wrapperSKU, this.wrapperVer],
      nativeBrokerErrorCode = this.getNativeBrokerErrorCode();
    if (nativeBrokerErrorCode?.length) t.push(`broker_error=${nativeBrokerErrorCode}`);
    let joined = t.join(de.VALUE_SEPARATOR),
      regionDiscoveryFields = this.getRegionDiscoveryFields(),
      joined_2 = [e, regionDiscoveryFields].join(de.VALUE_SEPARATOR);
    return [de.SCHEMA_VERSION, joined_2, joined].join(de.CATEGORY_SEPARATOR);
  }
  generateLastRequestHeaderValue() {
    let lastRequests = this.getLastRequests(),
      maxErrorsToSend = jt.maxErrorsToSend(lastRequests),
      joined = lastRequests.failedRequests.slice(0, 2 * maxErrorsToSend).join(de.VALUE_SEPARATOR),
      joined_2 = lastRequests.errors.slice(0, maxErrorsToSend).join(de.VALUE_SEPARATOR),
      o = lastRequests.errors.length,
      i = maxErrorsToSend < o ? de.OVERFLOW_TRUE : de.OVERFLOW_FALSE,
      joined_3 = [o, i].join(de.VALUE_SEPARATOR);
    return [de.SCHEMA_VERSION, lastRequests.cacheHits, joined, joined_2, joined_3].join(
      de.CATEGORY_SEPARATOR,
    );
  }
  cacheFailedRequest(e) {
    let lastRequests = this.getLastRequests();
    if (lastRequests.errors.length >= de.MAX_CACHED_ERRORS)
      (lastRequests.failedRequests.shift(), lastRequests.failedRequests.shift(), lastRequests.errors.shift());
    if (
      (lastRequests.failedRequests.push(this.apiId, this.correlationId),
      e instanceof Error && !!e && e.toString())
    )
      if (e instanceof AuthError)
        if (e.subError) lastRequests.errors.push(e.subError);
        else if (e.errorCode) lastRequests.errors.push(e.errorCode);
        else lastRequests.errors.push(e.toString());
      else lastRequests.errors.push(e.toString());
    else lastRequests.errors.push(de.UNKNOWN_ERROR);
    this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId);
    return;
  }
  incrementCacheHits() {
    let lastRequests = this.getLastRequests();
    return (
      (lastRequests.cacheHits += 1),
      this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId),
      lastRequests.cacheHits
    );
  }
  getLastRequests() {
    let e = { failedRequests: [], errors: [], cacheHits: 0 };
    return this.cacheManager.getServerTelemetry(this.telemetryCacheKey) || e;
  }
  clearTelemetryCache() {
    let lastRequests = this.getLastRequests(),
      maxErrorsToSend = jt.maxErrorsToSend(lastRequests),
      r = lastRequests.errors.length;
    if (maxErrorsToSend === r) this.cacheManager.removeItem(this.telemetryCacheKey, this.correlationId);
    else {
      let n = {
        failedRequests: lastRequests.failedRequests.slice(maxErrorsToSend * 2),
        errors: lastRequests.errors.slice(maxErrorsToSend),
        cacheHits: 0,
      };
      this.cacheManager.setServerTelemetry(this.telemetryCacheKey, n, this.correlationId);
    }
  }
  static maxErrorsToSend(e) {
    let t,
      r = 0,
      n = 0,
      o = e.errors.length;
    for (t = 0; t < o; t++) {
      let i = e.failedRequests[2 * t] || f.EMPTY_STRING,
        s = e.failedRequests[2 * t + 1] || f.EMPTY_STRING,
        a = e.errors[t] || f.EMPTY_STRING;
      if (((n += i.toString().length + s.toString().length + a.length + 3), n < de.MAX_LAST_HEADER_BYTES))
        r += 1;
      else break;
    }
    return r;
  }
  getRegionDiscoveryFields() {
    let e = [];
    return (
      e.push(this.regionUsed || f.EMPTY_STRING),
      e.push(this.regionSource || f.EMPTY_STRING),
      e.push(this.regionOutcome || f.EMPTY_STRING),
      e.join(",")
    );
  }
  updateRegionDiscoveryMetadata(e) {
    ((this.regionUsed = e.region_used),
      (this.regionSource = e.region_source),
      (this.regionOutcome = e.region_outcome));
  }
  setCacheOutcome(e) {
    this.cacheOutcome = e;
  }
  setNativeBrokerErrorCode(e) {
    let lastRequests = this.getLastRequests();
    ((lastRequests.nativeBrokerErrorCode = e),
      this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId));
  }
  getNativeBrokerErrorCode() {
    return this.getLastRequests().nativeBrokerErrorCode;
  }
  clearNativeBrokerErrorCode() {
    let lastRequests = this.getLastRequests();
    (delete lastRequests.nativeBrokerErrorCode,
      this.cacheManager.setServerTelemetry(this.telemetryCacheKey, lastRequests, this.correlationId));
  }
  static makeExtraSkuString(e) {
    return jg(e);
  }
}

export {
  f,
  fe,
  yr,
  b,
  AuthError,
  me,
  K,
  L,
  bn,
  th,
  eh,
  rh,
  nh,
  Ug,
  Mg,
  Lg,
  Dg,
  Xe,
  g,
  INVALID_ASSERTION,
  Q,
  Te,
  ie,
  N,
  Ie,
  Qe,
  Og,
  Ng,
  We,
  Du,
  Xr,
  zt,
  Pe,
  At,
  Et,
  Ct,
  qt,
  Gt,
  at,
  Tr,
  Er,
  _e,
  Cr,
  re,
  Je,
  $t,
  pe,
  Gg,
  Ae,
  wg,
  Le,
  qg,
  Ka,
  mt,
  Ki,
  xn,
  Vi,
  ClientAuthError,
  TOKEN_REFRESH_REQUIRED,
  ye,
  j,
  STATE_MISMATCH,
  jt,
  ue,
  Va,
  ka,
  DEVICE_CODE_POLLING_CANCELLED,
  USER_TIMEOUT_REACHED,
  DEVICE_CODE_EXPIRED,
  xg,
  wa,
  POST_REQUEST_FAILED,
  DEVICE_CODE_UNKNOWN_ERROR,
  vg,
  X_CLIENT_XTRA_SKU,
  ri,
  ServerError,
  oe,
  Vt,
  en,
  MULTIPLE_MATCHING_TOKENS,
  yt,
  bg,
  ON_BEHALF_OF,
  kg,
  INVALID_CLIENT_CREDENTIAL,
  be,
  MISSING_TENANT_ID_ERROR,
  Y,
  NETWORK_ERROR,
  Tn,
  V,
  EMPTY_URL_ERROR,
  Ht,
};
