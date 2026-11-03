/**
 * @azure/identity/dist/esm/msal/utils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-fingerprint 10
 */
import { credentialLogger, formatError } from "../util/logging.js";
import { AuthenticationRequiredError, CredentialUnavailableError } from "../../index.js";
import {
  isNodeLike_default_2,
  isNodeLike_default,
} from "../../../../core-rest-pipeline/dist/esm/util/file.js";
import { DefaultAuthorityHost, DefaultAuthority, DefaultTenantId } from "../constants.js";
import { LogLevel } from "../../../../msal-common/dist/logger/Logger.mjs";
import { AbortError } from "../../../../abort-controller/AbortError.js";

//@ chunk-mrx6y2r5.js:286534-286569 esm-fingerprint
var logger_4 = credentialLogger("IdentityUtils");
var LatestAuthenticationRecordVersion = "1.0";
//@ chunk-mrx6y2r5.js:286569-286852 esm-fingerprint
function ensureValidMsalToken(scopes, msalToken, getTokenOptions) {
  let error = (message) => {
    logger_4.getToken.info(message);
    return new AuthenticationRequiredError({
      scopes: Array.isArray(scopes) ? scopes : [scopes],
      getTokenOptions,
      message,
    });
  };
  if (!msalToken) throw error("No response");
  if (!msalToken.expiresOn) throw error('Response had no "expiresOn" property.');
  if (!msalToken.accessToken) throw error('Response had no "accessToken" property.');
}
//@ chunk-mrx6y2r5.js:286852-286995 esm-fingerprint
function getAuthorityHost(options) {
  let authorityHost = options === null || options === undefined ? undefined : options.authorityHost;
  if (!authorityHost && isNodeLike_default_2) authorityHost = process.env.AZURE_AUTHORITY_HOST;
  return authorityHost !== null && authorityHost !== undefined ? authorityHost : DefaultAuthorityHost;
}
//@ chunk-mrx6y2r5.js:286995-287118 esm-fingerprint
function getAuthority(tenantId, host) {
  if (!host) host = DefaultAuthorityHost;
  if (new RegExp(`${tenantId}/?$`).test(host)) return host;
  if (host.endsWith("/")) return host + tenantId;
  else return `${host}/${tenantId}`;
}
//@ chunk-mrx6y2r5.js:287118-287176 esm-fingerprint
function getKnownAuthorities(tenantId, authorityHost, disableInstanceDiscovery) {
  if ((tenantId === "adfs" && authorityHost) || disableInstanceDiscovery) return [authorityHost];
  return [];
}
//@ chunk-mrx6y2r5.js:287176-287486 esm-fingerprint
var Is =
  (credLogger, platform = isNodeLike_default ? "Node" : "Browser") =>
  (level, message, containsPii) => {
    if (containsPii) return;
    switch (level) {
      case LogLevel.Error:
        credLogger.info(`MSAL ${platform} V2 error: ${message}`);
        return;
      case LogLevel.Info:
        credLogger.info(`MSAL ${platform} V2 info message: ${message}`);
        return;
      case LogLevel.Verbose:
        credLogger.info(`MSAL ${platform} V2 verbose message: ${message}`);
        return;
      case LogLevel.Warning:
        credLogger.info(`MSAL ${platform} V2 warning: ${message}`);
        return;
    }
  };
//@ chunk-mrx6y2r5.js:287486-287648 esm-fingerprint
function getMSALLogLevel(logLevel) {
  switch (logLevel) {
    case "error":
      return LogLevel.Error;
    case "info":
      return LogLevel.Info;
    case "verbose":
      return LogLevel.Verbose;
    case "warning":
      return LogLevel.Warning;
    default:
      return LogLevel.Info;
  }
}
//@ chunk-mrx6y2r5.js:287648-288512 esm-fingerprint
function Ur(scopes, error, getTokenOptions) {
  if (error.name === "AuthError" || error.name === "ClientAuthError" || error.name === "BrowserAuthError") {
    let msalError = error;
    switch (msalError.errorCode) {
      case "endpoints_resolution_error":
        logger_4.info(formatError(scopes, error.message));
        return new CredentialUnavailableError(error.message);
      case "device_code_polling_cancelled":
        return new AbortError("The authentication has been aborted by the caller.");
      case "consent_required":
      case "interaction_required":
      case "login_required":
        logger_4.info(formatError(scopes, `Authentication returned errorCode ${msalError.errorCode}`));
        break;
      default:
        logger_4.info(formatError(scopes, `Failed to acquire token: ${error.message}`));
        break;
    }
  }
  if (
    error.name === "ClientConfigurationError" ||
    error.name === "BrowserConfigurationAuthError" ||
    error.name === "AbortError" ||
    error.name === "AuthenticationError"
  )
    return error;
  if (error.name === "NativeAuthError") {
    logger_4.info(
      formatError(
        scopes,
        `Error from the native broker: ${error.message} with status code: ${error.statusCode}`,
      ),
    );
    return error;
  }
  return new AuthenticationRequiredError({
    scopes,
    getTokenOptions,
    message: error.message,
  });
}
//@ chunk-mrx6y2r5.js:288512-288660 esm-fingerprint
function publicToMsal(account) {
  return {
    localAccountId: account.homeAccountId,
    environment: account.authority,
    username: account.username,
    homeAccountId: account.homeAccountId,
    tenantId: account.tenantId,
  };
}
//@ chunk-mrx6y2r5.js:288660-288839 esm-fingerprint
function msalToPublic(clientId, account) {
  var _a;
  return {
    authority: (_a = account.environment) !== null && _a !== undefined ? _a : DefaultAuthority,
    homeAccountId: account.homeAccountId,
    tenantId: account.tenantId || DefaultTenantId,
    username: account.username,
    clientId,
    version: LatestAuthenticationRecordVersion,
  };
}
export {
  getAuthority,
  getAuthorityHost,
  getKnownAuthorities,
  Is,
  getMSALLogLevel,
  publicToMsal,
  Ur,
  ensureValidMsalToken,
  msalToPublic,
};
